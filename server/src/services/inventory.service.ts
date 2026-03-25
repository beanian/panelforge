import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

// Infrastructure items the system always needs — these are auto-created if missing
const REQUIRED_INFRASTRUCTURE: { name: string; category: string }[] = [
  { name: 'Arduino Mega 2560', category: 'board' },
  { name: 'Arduino Nano', category: 'board' },
  { name: '8-Channel MOSFET Board', category: 'mosfet' },
];

export const inventoryService = {
  /** Ensure all required infrastructure items exist in the database */
  async ensureInfrastructureItems() {
    const existing = await prisma.inventoryItem.findMany();
    for (const req of REQUIRED_INFRASTRUCTURE) {
      const reqLower = req.name.toLowerCase();

      // Find existing item by exact name or partial match in the correct category
      const exactMatch = existing.find((item) => item.name === req.name);
      const categoryMatch = existing.find((item) => {
        if (item.name === req.name) return false;
        const itemLower = item.name.toLowerCase();
        return item.category === req.category &&
          (reqLower.includes(itemLower) || itemLower.includes(reqLower));
      });

      if (exactMatch) {
        // Fix category if it's wrong (e.g. "general" → "board")
        if (exactMatch.category !== req.category) {
          await prisma.inventoryItem.update({
            where: { id: exactMatch.id },
            data: { category: req.category },
          });
        }
      } else if (!categoryMatch) {
        await prisma.inventoryItem.create({
          data: { name: req.name, category: req.category, quantityOnHand: 0 },
        });
      }
    }
  },

  async findAll() {
    await this.ensureInfrastructureItems();
    return prisma.inventoryItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  },

  async findById(id: string) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new AppError(404, 'Inventory item not found');
    return item;
  },

  async create(data: {
    name: string;
    category?: string;
    quantityOnHand?: number;
    unitCost?: number | null;
    supplierUrl?: string | null;
    notes?: string | null;
  }) {
    return prisma.inventoryItem.create({ data });
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      quantityOnHand: number;
      unitCost: number | null;
      supplierUrl: string | null;
      notes: string | null;
    }>,
  ) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new AppError(404, 'Inventory item not found');
    return prisma.inventoryItem.update({ where: { id }, data });
  },

  async remove(id: string) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new AppError(404, 'Inventory item not found');
    const itemLower = item.name.toLowerCase();
    const isInfrastructure = REQUIRED_INFRASTRUCTURE.some((r) => {
      const reqLower = r.name.toLowerCase();
      return item.name === r.name || (item.category === r.category &&
        (reqLower.includes(itemLower) || itemLower.includes(reqLower)));
    });
    if (isInfrastructure) {
      throw new AppError(400, `Cannot delete "${item.name}" — it is a required infrastructure item`);
    }
    return prisma.inventoryItem.delete({ where: { id } });
  },

  async adjustStock(id: string, delta: number) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new AppError(404, 'Inventory item not found');
    const newQty = item.quantityOnHand + delta;
    if (newQty < 0) throw new AppError(400, 'Stock cannot go below zero');
    return prisma.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: newQty },
    });
  },
};
