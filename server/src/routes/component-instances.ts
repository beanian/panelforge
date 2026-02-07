import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import {
  createComponentInstanceSchema,
  updateComponentInstanceSchema,
} from '../lib/schemas';
import { componentInstanceService } from '../services/component-instance.service';

export const componentInstanceRoutes = Router();

// GET /api/component-instances — list with optional filters
componentInstanceRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = {
      panelSectionId: req.query.panelSectionId as string | undefined,
      componentTypeId: req.query.componentTypeId as string | undefined,
      buildStatus: req.query.buildStatus as string | undefined,
      mapped: req.query.mapped as string | undefined,
    };
    const instances = await componentInstanceService.findAll(filters);
    res.json(instances);
  }),
);

// GET /api/component-instances/map-data — lightweight data for panel map overlay
componentInstanceRoutes.get(
  '/map-data',
  asyncHandler(async (_req, res) => {
    const data = await componentInstanceService.findMapData();
    res.json(data);
  }),
);

// GET /api/component-instances/:id — get with full details
componentInstanceRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const instance = await componentInstanceService.findById(req.params.id);
    res.json(instance);
  }),
);

// POST /api/component-instances — create a new instance
componentInstanceRoutes.post(
  '/',
  validate(createComponentInstanceSchema),
  asyncHandler(async (req, res) => {
    const instance = await componentInstanceService.create(req.body);
    res.status(201).json(instance);
  }),
);

// PATCH /api/component-instances/:id — update instance
componentInstanceRoutes.patch(
  '/:id',
  validate(updateComponentInstanceSchema),
  asyncHandler(async (req, res) => {
    const instance = await componentInstanceService.update(req.params.id, req.body);
    res.json(instance);
  }),
);

// DELETE /api/component-instances/:id — delete instance (cascades pin assignments)
componentInstanceRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await componentInstanceService.remove(req.params.id);
    res.status(204).end();
  }),
);
