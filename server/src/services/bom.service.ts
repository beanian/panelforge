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

// Maps component type names to the inventory items they consume (per component)
const HARDWARE_REQUIREMENTS: Record<string, { inventoryItem: string; quantityPerComponent: number }[]> = {
  'Gauge': [
    { inventoryItem: 'X27 Stepper Motor', quantityPerComponent: 1 },
  ],
};

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

    // Load inventory
    const inventory = await prisma.inventoryItem.findMany();
    const inventoryByName: Record<string, { quantityOnHand: number; unitCost: number | null }> = {};
    for (const item of inventory) {
      inventoryByName[item.name] = { quantityOnHand: item.quantityOnHand, unitCost: item.unitCost };
    }

    const lineItems: BomLineItem[] = [];
    const warnings: string[] = [];

    // --- 1. Component-specific hardware (e.g., X27 steppers for gauges) ---
    const typeGroups: Record<
      string,
      {
        typeName: string;
        count: number;
        pinCount: number;
        affinity: string | null;
        mosfetPinsPerComponent: number;
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
        };
      }
      typeGroups[ct.id].count++;
    }

    for (const group of Object.values(typeGroups)) {
      const reqs = HARDWARE_REQUIREMENTS[group.typeName] ?? [];
      for (const req of reqs) {
        const totalNeeded = group.count * req.quantityPerComponent;
        const stock = inventoryByName[req.inventoryItem] ?? { quantityOnHand: 0, unitCost: null };
        const toOrder = Math.max(0, totalNeeded - stock.quantityOnHand);
        lineItems.push({
          inventoryItemName: req.inventoryItem,
          category: 'component',
          quantityRequired: totalNeeded,
          quantityInstalled: 0,
          quantityInStock: stock.quantityOnHand,
          quantityToOrder: toOrder,
          unitCost: stock.unitCost,
          totalCost: stock.unitCost != null ? toOrder * stock.unitCost : null,
          reasoning: `${group.count} x ${group.typeName} @ ${req.quantityPerComponent} each`,
        });
      }
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

      const stock = inventoryByName[boardType] ?? { quantityOnHand: 0, unitCost: null };
      const toOrder = Math.max(0, newBoardsNeeded - stock.quantityOnHand);

      lineItems.push({
        inventoryItemName: boardType,
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

      const stock = inventoryByName['8-Channel MOSFET Board'] ?? { quantityOnHand: 0, unitCost: null };
      const toOrder = Math.max(0, newMosfetBoardsNeeded - stock.quantityOnHand);

      lineItems.push({
        inventoryItemName: '8-Channel MOSFET Board',
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
