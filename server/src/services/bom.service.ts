import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface BomLineItem {
  inventoryItemName: string;
  category: string;
  quantityRequired: number;
  quantityInstalled: number;
  quantityInStock: number;
  quantityToOrder: number;
  unitCost: number | null;
  totalCost: number | null;
  reasoning: string;
}

interface BomCalculateResult {
  sectionId: string | null;
  sectionName: string | null;
  lineItems: BomLineItem[];
  totalEstimatedCost: number | null;
  warnings: string[];
}

// Board capacity (usable pins, excluding reserved D0/D1)
const BOARD_CAPACITY: Record<string, { digitalUsable: number; analogUsable: number }> = {
  'Arduino Mega 2560': { digitalUsable: 52, analogUsable: 16 },
  'Arduino Nano': { digitalUsable: 12, analogUsable: 8 },
};

export const bomService = {
  async calculate(sectionId?: string): Promise<BomCalculateResult> {
    // Load component instances (for section or all)
    const where = sectionId ? { panelSectionId: sectionId } : {};
    const section = sectionId
      ? await prisma.panelSection.findUnique({ where: { id: sectionId } })
      : null;

    if (sectionId && !section) {
      throw new AppError(404, 'Panel section not found');
    }

    const instances = await prisma.componentInstance.findMany({
      where,
      include: {
        componentType: true,
        pinAssignments: { select: { id: true, boardId: true } },
      },
    });

    // Load existing boards with pin usage
    const boards = await prisma.board.findMany({
      include: {
        pinAssignments: { select: { pinNumber: true, pinType: true } },
      },
    });

    // Load MOSFET boards with channel usage
    const mosfetBoards = await prisma.mosfetBoard.findMany({
      include: {
        channels: { include: { pinAssignment: { select: { id: true } } } },
      },
    });

    // Load inventory — build lookups by name and by category
    const inventory = await prisma.inventoryItem.findMany();
    const inventoryByName: Record<string, { name: string; quantityOnHand: number; unitCost: number | null }> = {};
    const inventoryByCategory: Record<string, { name: string; quantityOnHand: number; unitCost: number | null }[]> = {};
    for (const item of inventory) {
      inventoryByName[item.name] = { name: item.name, quantityOnHand: item.quantityOnHand, unitCost: item.unitCost };
      if (!inventoryByCategory[item.category]) inventoryByCategory[item.category] = [];
      inventoryByCategory[item.category].push({ name: item.name, quantityOnHand: item.quantityOnHand, unitCost: item.unitCost });
    }

    // Find inventory item by exact name first, then by category with partial name match
    function findInventoryItem(name: string, category: string) {
      const defaultStock = { name, quantityOnHand: 0, unitCost: null as number | null };
      // Exact match
      if (inventoryByName[name]) return inventoryByName[name];
      // Category match — find item whose name is contained in the search name or vice versa (case-insensitive)
      const candidates = inventoryByCategory[category] ?? [];
      const nameLower = name.toLowerCase();
      const match = candidates.find((item) => {
        const itemLower = item.name.toLowerCase();
        return nameLower.includes(itemLower) || itemLower.includes(nameLower);
      });
      return match ?? defaultStock;
    }

    const lineItems: BomLineItem[] = [];
    const warnings: string[] = [];

    // --- 1. Component-specific hardware (types with requiresHardware) ---
    const typeGroups: Record<
      string,
      {
        typeName: string;
        count: number;
        pinCount: number;
        affinity: string | null;
        mosfetPinsPerComponent: number;
        requiresHardware: boolean;
      }
    > = {};
    for (const inst of instances) {
      const ct = inst.componentType;
      if (!typeGroups[ct.id]) {
        const mosfetPins = ((ct.pinMosfetRequired as boolean[]) ?? []).filter(Boolean).length;
        typeGroups[ct.id] = {
          typeName: ct.name,
          count: 0,
          pinCount: ct.defaultPinCount,
          affinity: (ct as any).boardTypeAffinity ?? null,
          mosfetPinsPerComponent: mosfetPins,
          requiresHardware: ct.requiresHardware,
        };
      }
      typeGroups[ct.id].count++;
    }

    for (const group of Object.values(typeGroups)) {
      if (!group.requiresHardware) continue;
      const totalNeeded = group.count;
      const stock = findInventoryItem(group.typeName, 'component');
      const toOrder = Math.max(0, totalNeeded - stock.quantityOnHand);
      lineItems.push({
        inventoryItemName: stock.name,
        category: 'component',
        quantityRequired: totalNeeded,
        quantityInstalled: 0,
        quantityInStock: stock.quantityOnHand,
        quantityToOrder: toOrder,
        unitCost: stock.unitCost,
        totalCost: stock.unitCost != null ? toOrder * stock.unitCost : null,
        reasoning: `${group.count} x ${group.typeName}`,
      });
    }

    // --- 2. Arduino boards needed ---
    // Group pin requirements by board type affinity
    const pinsByBoardType: Record<string, { totalPinsNeeded: number; totalPinsAssigned: number }> = {};

    for (const inst of instances) {
      const ct = inst.componentType;
      const affinity = (ct as any).boardTypeAffinity ?? 'Arduino Mega 2560';
      if (!pinsByBoardType[affinity]) {
        pinsByBoardType[affinity] = { totalPinsNeeded: 0, totalPinsAssigned: 0 };
      }
      pinsByBoardType[affinity].totalPinsNeeded += ct.defaultPinCount;
      pinsByBoardType[affinity].totalPinsAssigned += inst.pinAssignments.length;
    }

    for (const [boardType, pinReq] of Object.entries(pinsByBoardType)) {
      const capacity = BOARD_CAPACITY[boardType] ?? BOARD_CAPACITY['Arduino Mega 2560'];
      const totalUsablePerBoard = capacity.digitalUsable + capacity.analogUsable;

      // Count installed boards of this type and their free pins
      const installedBoards = boards.filter((b) => b.boardType === boardType);
      const installedCount = installedBoards.length;
      const totalFreePins = installedBoards.reduce((sum, b) => {
        const usedPins = b.pinAssignments.length;
        const totalPins = b.digitalPinCount + b.analogPinCount;
        return sum + Math.max(0, totalPins - usedPins - 2); // -2 for reserved D0/D1
      }, 0);

      const unassignedPins = pinReq.totalPinsNeeded - pinReq.totalPinsAssigned;
      const pinsNeedingBoards = Math.max(0, unassignedPins - totalFreePins);
      const newBoardsNeeded = pinsNeedingBoards > 0 ? Math.ceil(pinsNeedingBoards / totalUsablePerBoard) : 0;
      const totalBoardsNeeded = installedCount + newBoardsNeeded;

      const stock = findInventoryItem(boardType, 'board');
      const toOrder = Math.max(0, newBoardsNeeded - stock.quantityOnHand);

      lineItems.push({
        inventoryItemName: stock.name,
        category: 'board',
        quantityRequired: totalBoardsNeeded,
        quantityInstalled: installedCount,
        quantityInStock: stock.quantityOnHand,
        quantityToOrder: toOrder,
        unitCost: stock.unitCost,
        totalCost: stock.unitCost != null ? toOrder * stock.unitCost : null,
        reasoning: `${pinReq.totalPinsNeeded} pins needed (${pinReq.totalPinsAssigned} assigned, ${totalFreePins} free on ${installedCount} installed board${installedCount !== 1 ? 's' : ''})`,
      });
    }

    // --- 3. MOSFET boards needed ---
    let totalMosfetChannelsNeeded = 0;
    for (const group of Object.values(typeGroups)) {
      totalMosfetChannelsNeeded += group.count * group.mosfetPinsPerComponent;
    }

    if (totalMosfetChannelsNeeded > 0) {
      const installedMosfetBoards = mosfetBoards.length;
      const totalMosfetChannels = mosfetBoards.reduce((sum, mb) => sum + mb.channels.length, 0);
      const usedMosfetChannels = mosfetBoards.reduce(
        (sum, mb) => sum + mb.channels.filter((ch) => ch.pinAssignment !== null).length,
        0,
      );
      const freeMosfetChannels = totalMosfetChannels - usedMosfetChannels;
      const additionalChannelsNeeded = Math.max(
        0,
        totalMosfetChannelsNeeded - usedMosfetChannels - freeMosfetChannels,
      );
      const newMosfetBoardsNeeded = additionalChannelsNeeded > 0 ? Math.ceil(additionalChannelsNeeded / 8) : 0;

      const stock = findInventoryItem('MOSFET', 'mosfet');
      const toOrder = Math.max(0, newMosfetBoardsNeeded - stock.quantityOnHand);

      lineItems.push({
        inventoryItemName: stock.name,
        category: 'mosfet',
        quantityRequired: installedMosfetBoards + newMosfetBoardsNeeded,
        quantityInstalled: installedMosfetBoards,
        quantityInStock: stock.quantityOnHand,
        quantityToOrder: toOrder,
        unitCost: stock.unitCost,
        totalCost: stock.unitCost != null ? toOrder * stock.unitCost : null,
        reasoning: `${totalMosfetChannelsNeeded} channels needed (${usedMosfetChannels} used, ${freeMosfetChannels} free across ${installedMosfetBoards} board${installedMosfetBoards !== 1 ? 's' : ''})`,
      });
    }

    // --- Warnings ---
    const unassignedComponents = instances.filter((i) => i.pinAssignments.length === 0);
    if (unassignedComponents.length > 0) {
      warnings.push(
        `${unassignedComponents.length} component${unassignedComponents.length !== 1 ? 's have' : ' has'} no pin assignments yet`,
      );
    }

    const totalEstimatedCost = lineItems.reduce((sum, item) => {
      if (item.totalCost != null) return sum + item.totalCost;
      return sum;
    }, 0);

    return {
      sectionId: sectionId ?? null,
      sectionName: section?.name ?? null,
      lineItems,
      totalEstimatedCost: totalEstimatedCost > 0 ? totalEstimatedCost : null,
      warnings,
    };
  },
};
