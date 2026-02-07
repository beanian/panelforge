import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
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
