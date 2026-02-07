import { Router } from 'express';
import { boardRoutes } from './boards';
import { panelSectionRoutes } from './panel-sections';
import { componentTypeRoutes } from './component-types';
import { componentInstanceRoutes } from './component-instances';
import { pinAssignmentRoutes } from './pin-assignments';
import { mosfetBoardRoutes } from './mosfet-boards';
import { buildProgressRoutes } from './build-progress';
import { powerBudgetRoutes } from './power-budget';
import { mobiFlightRoutes } from './mobiflight';
import { bomRoutes } from './bom';
import { wiringDiagramRoutes } from './wiring-diagram';

export const routes = Router();

routes.use('/boards', boardRoutes);
routes.use('/panel-sections', panelSectionRoutes);
routes.use('/component-types', componentTypeRoutes);
routes.use('/component-instances', componentInstanceRoutes);
routes.use('/pin-assignments', pinAssignmentRoutes);
routes.use('/mosfet-boards', mosfetBoardRoutes);
routes.use('/build-progress', buildProgressRoutes);
routes.use('/power-budget', powerBudgetRoutes);
routes.use('/mobiflight', mobiFlightRoutes);
routes.use('/bom', bomRoutes);
routes.use('/wiring-diagram', wiringDiagramRoutes);
