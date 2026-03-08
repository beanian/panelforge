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
    for (const item of REQUIRED_INFRASTRUCTURE) {
      await prisma.inventoryItem.upsert({
        where: { name: item.name },
        update: {},
        create: { name: item.name, category: item.category, quantityOnHand: 0 },
      });
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
    const isInfrastructure = REQUIRED_INFRASTRUCTURE.some((r) => r.name === item.name);
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
