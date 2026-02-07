import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import { createMosfetBoardSchema, updateMosfetBoardSchema } from '../lib/schemas';
import { mosfetService } from '../services/mosfet.service';

export const mosfetBoardRoutes = Router();

// GET /api/mosfet-boards — list all with channel usage
mosfetBoardRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const boards = await mosfetService.findAll();
    res.json(boards);
  }),
);

// GET /api/mosfet-boards/:id — get with channels
mosfetBoardRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const board = await mosfetService.findById(req.params.id);
    res.json(board);
  }),
);

// POST /api/mosfet-boards — create (also creates channels)
mosfetBoardRoutes.post(
  '/',
  validate(createMosfetBoardSchema),
  asyncHandler(async (req, res) => {
    const board = await mosfetService.create(req.body);
    res.status(201).json(board);
  }),
);

// PATCH /api/mosfet-boards/:id — update name/notes
mosfetBoardRoutes.patch(
  '/:id',
  validate(updateMosfetBoardSchema),
  asyncHandler(async (req, res) => {
    const board = await mosfetService.update(req.params.id, req.body);
    res.json(board);
  }),
);
