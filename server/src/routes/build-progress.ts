import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { AppError } from '../lib/errors';
import { buildProgressService } from '../services/build-progress.service';

export const buildProgressRoutes = Router();

const VALID_BUILD_STATUSES = ['NOT_ONBOARDED', 'PLANNED', 'IN_PROGRESS', 'COMPLETE', 'HAS_ISSUES'];

// GET /api/build-progress — overall and per-section build progress
buildProgressRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const progress = await buildProgressService.getProgress();
    res.json(progress);
  }),
);

// PATCH /api/build-progress/component/:id/status — update component build status with cascading wiring
buildProgressRoutes.patch(
  '/component/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!status || !VALID_BUILD_STATUSES.includes(status)) {
      throw new AppError(
        400,
        `Invalid status. Must be one of: ${VALID_BUILD_STATUSES.join(', ')}`,
      );
    }

    const updated = await buildProgressService.updateComponentStatus(req.params.id, status);
    res.json(updated);
  }),
);
