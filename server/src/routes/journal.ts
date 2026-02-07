import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { validate } from '../lib/validation';
import { createJournalEntrySchema, updateJournalEntrySchema } from '../lib/schemas';
import { journalService } from '../services/journal.service';

export const journalRoutes = Router();

// GET /api/journal — list entries with optional filters
journalRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = {
      panelSectionId: req.query.panelSectionId as string | undefined,
      componentInstanceId: req.query.componentInstanceId as string | undefined,
      search: req.query.search as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    };
    const entries = await journalService.findAll(filters);
    res.json(entries);
  }),
);

// GET /api/journal/:id — get single entry with relations
journalRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const entry = await journalService.findById(req.params.id);
    res.json(entry);
  }),
);

// POST /api/journal — create a new journal entry
journalRoutes.post(
  '/',
  validate(createJournalEntrySchema),
  asyncHandler(async (req, res) => {
    const entry = await journalService.create(req.body);
    res.status(201).json(entry);
  }),
);

// PATCH /api/journal/:id — update journal entry
journalRoutes.patch(
  '/:id',
  validate(updateJournalEntrySchema),
  asyncHandler(async (req, res) => {
    const entry = await journalService.update(req.params.id, req.body);
    res.json(entry);
  }),
);

// DELETE /api/journal/:id — delete journal entry
journalRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await journalService.remove(req.params.id);
    res.status(204).end();
  }),
);
