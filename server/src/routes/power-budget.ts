import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { powerBudgetService } from '../services/power-budget.service';

export const powerBudgetRoutes = Router();

// GET /api/power-budget — power rail usage and MOSFET board channels
powerBudgetRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const budget = await powerBudgetService.getPowerBudget();
    res.json(budget);
  }),
);
