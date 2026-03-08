import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { bomService } from '../services/bom.service';

export const bomRoutes = Router();

// GET /api/bom/calculate?sectionId=xxx (sectionId optional — omit for whole project)
bomRoutes.get(
  '/calculate',
  asyncHandler(async (req, res) => {
    const sectionId = typeof req.query.sectionId === 'string' ? req.query.sectionId : undefined;
    const result = await bomService.calculate(sectionId);
    res.json(result);
  }),
);
