import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import { createPanelSectionSchema, updatePanelSectionSchema } from '../lib/schemas';
import { panelSectionService } from '../services/panel-section.service';

export const panelSectionRoutes = Router();

// GET /api/panel-sections — list all sections with component counts and build status
panelSectionRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const sections = await panelSectionService.findAll();
    res.json(sections);
  }),
);

// GET /api/panel-sections/summary — aggregated data for all sections
panelSectionRoutes.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const summary = await panelSectionService.getSummary();
    res.json(summary);
  }),
);

// POST /api/panel-sections — create a new section
panelSectionRoutes.post(
  '/',
  validate(createPanelSectionSchema),
  asyncHandler(async (req, res) => {
    const section = await panelSectionService.create(req.body);
    res.status(201).json(section);
  }),
);

// GET /api/panel-sections/:id — get section with full details
panelSectionRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const section = await panelSectionService.findById(req.params.id);
    res.json(section);
  }),
);

// PATCH /api/panel-sections/:id — update section
panelSectionRoutes.patch(
  '/:id',
  validate(updatePanelSectionSchema),
  asyncHandler(async (req, res) => {
    const section = await panelSectionService.update(req.params.id, req.body);
    res.json(section);
  }),
);

// DELETE /api/panel-sections/:id — delete an empty section
panelSectionRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await panelSectionService.delete(req.params.id);
    res.status(204).end();
  }),
);
