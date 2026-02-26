import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { aircraftService } from '../services/aircraft.service';

export const aircraftRoutes = Router();

// GET /api/aircraft — list all cached aircraft profiles
aircraftRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const profiles = await aircraftService.listCached();
    res.json(profiles);
  }),
);

// GET /api/aircraft/:msn — get aircraft profile by MSN
// Query params:
//   reg — current registration (used for external API lookups)
//   refresh — set to "true" to force re-fetch from external APIs
aircraftRoutes.get(
  '/:msn',
  asyncHandler(async (req, res) => {
    const forceRefresh = req.query.refresh === 'true';
    const reg = req.query.reg
      ? String(req.query.reg)
      : null;
    const profile = await aircraftService.getByMsn(
      req.params.msn,
      reg,
      forceRefresh,
    );
    res.json(profile);
  }),
);
