import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { lvarReferenceService } from '../services/lvar-reference.service';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export const lvarReferenceRoutes = Router();

// GET /api/lvars?q=fuel_pump&section=overhead_fuel — search LVARs
lvarReferenceRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = (req.query.q as string) ?? '';
    const section = req.query.section as string | undefined;
    if (!query) {
      res.json([]);
      return;
    }
    const results = lvarReferenceService.searchLvars(query, section);
    res.json(results);
  }),
);

// GET /api/lvars/sections — list all sections with counts
lvarReferenceRoutes.get(
  '/sections',
  asyncHandler(async (_req, res) => {
    const sections = lvarReferenceService.getSections();
    res.json(sections);
  }),
);

// GET /api/lvars/sections/:code — get LVARs for a section
lvarReferenceRoutes.get(
  '/sections/:code',
  asyncHandler(async (req, res) => {
    const entries = lvarReferenceService.getLvarsBySection(req.params.code);
    res.json(entries);
  }),
);

// GET /api/lvars/suggest/:pinAssignmentId — auto-suggest best LVAR matches for a pin
lvarReferenceRoutes.get(
  '/suggest/:pinAssignmentId',
  asyncHandler(async (req, res) => {
    const pin = await prisma.pinAssignment.findUnique({
      where: { id: req.params.pinAssignmentId },
      include: {
        componentInstance: {
          include: { panelSection: true },
        },
      },
    });

    if (!pin) {
      throw new AppError(404, 'Pin assignment not found');
    }

    if (!pin.componentInstance) {
      res.json([]);
      return;
    }

    const componentName = pin.componentInstance.name;
    const sectionSlug = pin.componentInstance.panelSection?.slug ?? null;

    const suggestions = lvarReferenceService.suggestForPin(componentName, sectionSlug);
    res.json(suggestions);
  }),
);
