import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import { createComponentTypeSchema, updateComponentTypeSchema } from '../lib/schemas';
import { componentTypeService } from '../services/component-type.service';

export const componentTypeRoutes = Router();

// GET /api/component-types — list all types with usage counts
componentTypeRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const types = await componentTypeService.findAll();
    res.json(types);
  }),
);

// GET /api/component-types/:id — get type with usage count
componentTypeRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const type = await componentTypeService.findById(req.params.id);
    res.json(type);
  }),
);

// POST /api/component-types — create a new type
componentTypeRoutes.post(
  '/',
  validate(createComponentTypeSchema),
  asyncHandler(async (req, res) => {
    const type = await componentTypeService.create(req.body);
    res.status(201).json(type);
  }),
);

// PATCH /api/component-types/:id — update type
componentTypeRoutes.patch(
  '/:id',
  validate(updateComponentTypeSchema),
  asyncHandler(async (req, res) => {
    const type = await componentTypeService.update(req.params.id, req.body);
    res.json(type);
  }),
);

// DELETE /api/component-types/:id — delete type (only if no instances reference it)
componentTypeRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await componentTypeService.remove(req.params.id);
    res.status(204).end();
  }),
);
