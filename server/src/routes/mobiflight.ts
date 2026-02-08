import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import { upsertMappingSchema } from '../lib/schemas';
import { mobiFlightService } from '../services/mobiflight.service';

export const mobiFlightRoutes = Router();

// GET /api/mobiflight/preview/:boardId — preview MobiFlight device mappings for a board
mobiFlightRoutes.get(
  '/preview/:boardId',
  asyncHandler(async (req, res) => {
    const result = await mobiFlightService.preview(req.params.boardId);
    res.json(result);
  }),
);

// GET /api/mobiflight/export/:boardId — export .mfmc-compatible JSON for a board
mobiFlightRoutes.get(
  '/export/:boardId',
  asyncHandler(async (req, res) => {
    const result = await mobiFlightService.export(req.params.boardId);
    res.json(result);
  }),
);

// PUT /api/mobiflight/mapping/:pinAssignmentId — upsert a mapping
mobiFlightRoutes.put(
  '/mapping/:pinAssignmentId',
  validate(upsertMappingSchema),
  asyncHandler(async (req, res) => {
    const mapping = await mobiFlightService.upsertMapping(
      req.params.pinAssignmentId,
      req.body,
    );
    res.json(mapping);
  }),
);

// DELETE /api/mobiflight/mapping/:pinAssignmentId — delete a mapping
mobiFlightRoutes.delete(
  '/mapping/:pinAssignmentId',
  asyncHandler(async (req, res) => {
    await mobiFlightService.deleteMapping(req.params.pinAssignmentId);
    res.status(204).end();
  }),
);

// POST /api/mobiflight/auto-assign/:boardId — auto-assign LVARs for all pins on a board
mobiFlightRoutes.post(
  '/auto-assign/:boardId',
  asyncHandler(async (req, res) => {
    const result = await mobiFlightService.autoAssign(req.params.boardId);
    res.json(result);
  }),
);
