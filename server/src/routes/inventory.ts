import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  adjustInventoryStockSchema,
} from '../lib/schemas';
import { inventoryService } from '../services/inventory.service';

export const inventoryRoutes = Router();

// GET /api/inventory — list all inventory items
inventoryRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await inventoryService.findAll();
    res.json(items);
  }),
);

// GET /api/inventory/:id — get single inventory item
inventoryRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await inventoryService.findById(req.params.id);
    res.json(item);
  }),
);

// POST /api/inventory — create a new inventory item
inventoryRoutes.post(
  '/',
  validate(createInventoryItemSchema),
  asyncHandler(async (req, res) => {
    const item = await inventoryService.create(req.body);
    res.status(201).json(item);
  }),
);

// PATCH /api/inventory/:id — update an inventory item
inventoryRoutes.patch(
  '/:id',
  validate(updateInventoryItemSchema),
  asyncHandler(async (req, res) => {
    const item = await inventoryService.update(req.params.id, req.body);
    res.json(item);
  }),
);

// DELETE /api/inventory/:id — delete an inventory item
inventoryRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await inventoryService.remove(req.params.id);
    res.status(204).end();
  }),
);

// POST /api/inventory/:id/adjust — adjust stock level by delta
inventoryRoutes.post(
  '/:id/adjust',
  validate(adjustInventoryStockSchema),
  asyncHandler(async (req, res) => {
    const item = await inventoryService.adjustStock(req.params.id, req.body.delta);
    res.json(item);
  }),
);
