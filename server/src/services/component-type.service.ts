import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const componentTypeService = {
  async findAll() {
    return prisma.componentType.findMany({
      include: {
        _count: { select: { componentInstances: true } },
      },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string) {
    const type = await prisma.componentType.findUnique({
      where: { id },
      include: {
        _count: { select: { componentInstances: true } },
      },
    });

    if (!type) {
      throw new AppError(404, 'Component type not found');
    }

    return type;
  },

  async create(data: {
    name: string;
    description?: string;
    defaultPinCount: number;
    pinTypesRequired: ('DIGITAL' | 'ANALOG')[];
    defaultPowerRail?: string;
    defaultPinMode?: string;
    pwmRequired?: boolean;
    mobiFlightTemplate?: unknown;
    notes?: string;
  }) {
    return prisma.componentType.create({ data: data as any });
  },

  async update(id: string, data: Record<string, unknown>) {
    const type = await prisma.componentType.findUnique({ where: { id } });
    if (!type) {
      throw new AppError(404, 'Component type not found');
    }

    return prisma.componentType.update({ where: { id }, data: data as any });
  },

  async remove(id: string) {
    const type = await prisma.componentType.findUnique({
      where: { id },
      include: { _count: { select: { componentInstances: true } } },
    });

    if (!type) {
      throw new AppError(404, 'Component type not found');
    }

    if (type._count.componentInstances > 0) {
      throw new AppError(
        409,
        `Cannot delete component type "${type.name}" because it is used by ${type._count.componentInstances} instance(s). Remove them first.`,
      );
    }

    return prisma.componentType.delete({ where: { id } });
  },
};
