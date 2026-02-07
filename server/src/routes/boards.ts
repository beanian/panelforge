import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import { createBoardSchema, updateBoardSchema } from '../lib/schemas';
import { boardService } from '../services/board.service';

export const boardRoutes = Router();

// GET /api/boards — list all boards with pin availability
boardRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const boards = await boardService.findAll();
    res.json(boards);
  }),
);

// GET /api/boards/:id — get board with all pin assignments
boardRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const board = await boardService.findById(req.params.id);
    res.json(board);
  }),
);

// POST /api/boards — create a new board
boardRoutes.post(
  '/',
  validate(createBoardSchema),
  asyncHandler(async (req, res) => {
    const board = await boardService.create(req.body);
    res.status(201).json(board);
  }),
);

// PATCH /api/boards/:id — update board
boardRoutes.patch(
  '/:id',
  validate(updateBoardSchema),
  asyncHandler(async (req, res) => {
    const board = await boardService.update(req.params.id, req.body);
    res.json(board);
  }),
);

// DELETE /api/boards/:id — delete board (only if no pin assignments)
boardRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await boardService.remove(req.params.id);
    res.status(204).end();
  }),
);
