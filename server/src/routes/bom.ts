import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { AppError } from '../lib/errors';
import { bomService } from '../services/bom.service';

export const bomRoutes = Router();

// POST /api/bom/calculate — calculate BOM allocations for a panel section
bomRoutes.post(
  '/calculate',
  asyncHandler(async (req, res) => {
    const { sectionId } = req.body;

    if (!sectionId || typeof sectionId !== 'string') {
      throw new AppError(400, 'sectionId is required and must be a string');
    }

    const result = await bomService.calculate(sectionId);
    res.json(result);
  }),
);

// POST /api/bom/apply — apply calculated BOM allocations to create pin assignments
bomRoutes.post(
  '/apply',
  asyncHandler(async (req, res) => {
    const bomResult = req.body;

    if (!bomResult?.sectionId || !Array.isArray(bomResult?.components)) {
      throw new AppError(400, 'Request body must be a valid BOM calculation result with sectionId and components');
    }

    const result = await bomService.apply(bomResult);
    res.status(201).json(result);
  }),
);
