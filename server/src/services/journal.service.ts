import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

interface JournalFilters {
  panelSectionId?: string;
  componentInstanceId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const journalService = {
  async findAll(filters: JournalFilters = {}) {
    const where: Prisma.JournalEntryWhereInput = {};

    if (filters.panelSectionId) {
      where.panelSectionId = filters.panelSectionId;
    }
    if (filters.componentInstanceId) {
      where.componentInstanceId = filters.componentInstanceId;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    return prisma.journalEntry.findMany({
      where,
      include: {
        panelSection: { select: { id: true, name: true } },
        componentInstance: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        panelSection: { select: { id: true, name: true } },
        componentInstance: { select: { id: true, name: true } },
      },
    });

    if (!entry) {
      throw new AppError(404, 'Journal entry not found');
    }

    return entry;
  },

  async create(data: {
    title: string;
    body: string;
    panelSectionId?: string;
    componentInstanceId?: string;
  }) {
    // Validate referenced panel section exists if provided
    if (data.panelSectionId) {
      const section = await prisma.panelSection.findUnique({
        where: { id: data.panelSectionId },
      });
      if (!section) {
        throw new AppError(400, 'Panel section not found');
      }
    }

    // Validate referenced component instance exists if provided
    if (data.componentInstanceId) {
      const instance = await prisma.componentInstance.findUnique({
        where: { id: data.componentInstanceId },
      });
      if (!instance) {
        throw new AppError(400, 'Component instance not found');
      }
    }

    return prisma.journalEntry.create({
      data,
      include: {
        panelSection: { select: { id: true, name: true } },
        componentInstance: { select: { id: true, name: true } },
      },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      body?: string;
      panelSectionId?: string;
      componentInstanceId?: string;
    },
  ) {
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new AppError(404, 'Journal entry not found');
    }

    // Validate referenced panel section exists if being updated
    if (data.panelSectionId) {
      const section = await prisma.panelSection.findUnique({
        where: { id: data.panelSectionId },
      });
      if (!section) {
        throw new AppError(400, 'Panel section not found');
      }
    }

    // Validate referenced component instance exists if being updated
    if (data.componentInstanceId) {
      const instance = await prisma.componentInstance.findUnique({
        where: { id: data.componentInstanceId },
      });
      if (!instance) {
        throw new AppError(400, 'Component instance not found');
      }
    }

    return prisma.journalEntry.update({
      where: { id },
      data,
      include: {
        panelSection: { select: { id: true, name: true } },
        componentInstance: { select: { id: true, name: true } },
      },
    });
  },

  async remove(id: string) {
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new AppError(404, 'Journal entry not found');
    }

    return prisma.journalEntry.delete({ where: { id } });
  },
};
