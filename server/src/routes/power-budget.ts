import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { powerBudgetService } from '../services/power-budget.service';
import { updatePsuConfigSchema } from '../../../packages/shared/src/validators';

export const powerBudgetRoutes = Router();

// GET /api/power-budget — enriched power budget data
powerBudgetRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const budget = await powerBudgetService.getPowerBudget();
    res.json(budget);
  }),
);

// GET /api/power-budget/psu — get PSU config
powerBudgetRoutes.get(
  '/psu',
  asyncHandler(async (_req, res) => {
    const config = await powerBudgetService.getPsuConfig();
    res.json(config);
  }),
);

// PATCH /api/power-budget/psu — update PSU config
powerBudgetRoutes.patch(
  '/psu',
  asyncHandler(async (req, res) => {
    const data = updatePsuConfigSchema.parse(req.body);
    const config = await powerBudgetService.updatePsuConfig(data);
    res.json(config);
  }),
);
