import { Router } from 'express';
import { boardRoutes } from './boards';
import { panelSectionRoutes } from './panel-sections';
import { componentTypeRoutes } from './component-types';
import { componentInstanceRoutes } from './component-instances';
import { pinAssignmentRoutes } from './pin-assignments';
import { mosfetBoardRoutes } from './mosfet-boards';

export const routes = Router();

routes.use('/boards', boardRoutes);
routes.use('/panel-sections', panelSectionRoutes);
routes.use('/component-types', componentTypeRoutes);
routes.use('/component-instances', componentInstanceRoutes);
routes.use('/pin-assignments', pinAssignmentRoutes);
routes.use('/mosfet-boards', mosfetBoardRoutes);
