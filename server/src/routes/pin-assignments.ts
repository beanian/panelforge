import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import {
  createPinAssignmentSchema,
  updatePinAssignmentSchema,
  bulkUpdatePinAssignmentSchema,
  pinAssignmentFiltersSchema,
} from '../lib/schemas';
import { pinAssignmentService } from '../services/pin-assignment.service';

export const pinAssignmentRoutes = Router();

// GET /api/pin-assignments — list with filters
pinAssignmentRoutes.get(
  '/',
  validate(pinAssignmentFiltersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const pins = await pinAssignmentService.findAll(req.query as any);
    res.json(pins);
  }),
);

// PATCH /api/pin-assignments/bulk — bulk update (MUST be before /:id)
pinAssignmentRoutes.patch(
  '/bulk',
  validate(bulkUpdatePinAssignmentSchema),
  asyncHandler(async (req, res) => {
    const { ids, data } = req.body;
    const pins = await pinAssignmentService.bulkUpdate(ids, data);
    res.json(pins);
  }),
);

// GET /api/pin-assignments/:id — get with full details
pinAssignmentRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const pin = await pinAssignmentService.findById(req.params.id);
    res.json(pin);
  }),
);

// POST /api/pin-assignments — create a new pin assignment
pinAssignmentRoutes.post(
  '/',
  validate(createPinAssignmentSchema),
  asyncHandler(async (req, res) => {
    const pin = await pinAssignmentService.create(req.body);
    res.status(201).json(pin);
  }),
);

// PATCH /api/pin-assignments/:id — update pin assignment
pinAssignmentRoutes.patch(
  '/:id',
  validate(updatePinAssignmentSchema),
  asyncHandler(async (req, res) => {
    const pin = await pinAssignmentService.update(req.params.id, req.body);
    res.json(pin);
  }),
);

// DELETE /api/pin-assignments/:id — delete pin assignment
pinAssignmentRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await pinAssignmentService.remove(req.params.id);
    res.status(204).end();
  }),
);
