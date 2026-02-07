import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { exportService } from '../services/export.service';

export const exportRoutes = Router();
export const importRoutes = Router();

// GET /api/export/json — full database dump as JSON
exportRoutes.get(
  '/json',
  asyncHandler(async (_req, res) => {
    const data = await exportService.exportAll();
    res.json(data);
  }),
);

// POST /api/import/json — import full JSON dump (replaces all data)
importRoutes.post(
  '/json',
  asyncHandler(async (req, res) => {
    const result = await exportService.importAll(req.body);
    res.json(result);
  }),
);
