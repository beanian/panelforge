import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const inventoryService = {
  async findAll() {
    return prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
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
