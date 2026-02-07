import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { wiringService } from '../services/wiring.service';

export const wiringDiagramRoutes = Router();

// GET /api/wiring-diagram/:sectionId — get wiring diagram data for a panel section
wiringDiagramRoutes.get(
  '/:sectionId',
  asyncHandler(async (req, res) => {
    const result = await wiringService.getDiagram(req.params.sectionId);
    res.json(result);
  }),
);
