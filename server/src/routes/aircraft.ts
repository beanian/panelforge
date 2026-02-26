import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { AppError } from '../lib/errors';
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

// GET /api/aircraft/photo-proxy — proxy external photo URLs to avoid hotlink blocking
aircraftRoutes.get(
  '/photo-proxy',
  asyncHandler(async (req, res) => {
    const url = String(req.query.url || '');
    if (!url || !url.startsWith('https://t.plnspttrs.net/')) {
      throw new AppError(400, 'Invalid photo URL');
    }

    const upstream = await fetch(url);
    if (!upstream.ok) {
      throw new AppError(upstream.status, 'Failed to fetch photo');
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
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
