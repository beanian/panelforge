# PanelForge Implementation Plan

## Overview
Build PanelForge from scratch as a monorepo (npm workspaces) with 4 incremental phases. Each phase produces a usable increment.

**Stack**: React + shadcn/ui + Tailwind | Node.js + Express | PostgreSQL + Prisma | TypeScript throughout

---

## Agent Team Structure (3 Agents)

| Agent | Scope | Tasks |
|-------|-------|-------|
| **Infrastructure** | Project scaffolding, Prisma schema, seed data, shared types | #1, #2, #3, #4 |
| **Backend** | Express app, all API routes, services, business logic | #5, #6, #7, #8, #9 |
| **Frontend** | React app, all UI components, pages, hooks | #10, #11, #12, #13, #14, #15, #16, #17, #18 |

### Parallelism Windows
- **Sequential first**: Infrastructure agent (#1-#4) must complete before Backend and Frontend start
- **Phase 1 parallel**: Backend (#5-#6) and Frontend (#10-#13) run in parallel
- **Phase 2 parallel**: Backend (#7) and Frontend (#14-#15) run in parallel
- **Phase 3 parallel**: Backend (#8) and Frontend (#16-#17) run in parallel
- **Phase 4 parallel**: Backend (#9) and Frontend (#18) run in parallel

---

## Monorepo Structure

```
panelforge/
  package.json              # npm workspaces root
  tsconfig.base.json
  docker-compose.yml        # PostgreSQL for local dev
  .env / .env.example
  .gitignore

  packages/shared/          # Shared TypeScript types + Zod validators
    src/types/              # Board, PanelSection, ComponentType, etc.
    src/validators/         # Zod schemas for API payloads

  client/                   # Vite + React + shadcn/ui
    src/
      components/ui/        # shadcn components
      components/layout/    # AppShell, Sidebar, Breadcrumb
      components/pin-manager/
      components/component-library/
      components/panel-map/
      components/power-budget/
      components/build-progress/
      components/wiring-diagram/
      components/mobiflight/
      components/bom/
      components/journal/
      components/reference/
      pages/                # One page per feature
      hooks/                # Data fetching hooks (TanStack Query)
      lib/                  # api.ts, utils.ts, constants.ts
      assets/               # overhead-panel.svg

  server/                   # Express + Prisma
    prisma/
      schema.prisma         # Full schema (all entities, all phases)
      seed.ts               # Panel sections, component types, board Alpha
    src/
      routes/               # One file per entity
      services/             # Business logic layer
      middleware/            # Error handler, validation, CORS
      lib/                  # Prisma singleton, error classes
```

---

## Database Schema (designed upfront for all phases)

**Core models**: Board, PanelSection, ComponentType, ComponentInstance, PinAssignment, MosfetBoard, MosfetChannel, MobiFlightMapping, JournalEntry

**Key design decisions**:
- `pinNumber` stored as string ("D2", "A0") with `@@unique([boardId, pinNumber])` constraint
- `pwmPins` on Board as int array for allocation logic
- MosfetChannel as separate model (1:1 with PinAssignment) since MOSFET boards are physical entities
- `configParams` on MobiFlightMapping as JSON (varies per event type)
- Lineage + dimensions stored directly on PanelSection (1:1 relationship)
- SVG positioning fields on PanelSection for interactive map overlay

---

## Phase 1: Foundation + Vertical Slice (F2 + F5)

**Goal**: Project scaffolding, full database, core API, working Pin Manager + Component Library

### Steps:
1. **Scaffold project** - npm workspaces, Docker Compose (PostgreSQL), Vite client, Express server, Prisma init
2. **Create full Prisma schema** - All models/enums for all phases (avoids painful migrations later)
3. **Seed data** - 12 panel sections with dimensions/lineage, 8 component types (Gauge, Annunciator, Switch, etc.), board Alpha, 2 MOSFET boards
4. **Server API** - CRUD routes for: boards, panel-sections, component-types, component-instances, pin-assignments, mosfet-boards
5. **Shared types** - TypeScript interfaces mirroring Prisma models + Zod validators
6. **Client shell** - React Router, AppShell layout, Sidebar nav, API client, TanStack Query setup
7. **F5: Component Library page** - Card grid of component types, create/edit dialog
8. **F2: Pin-Out Manager page** - Virtualized table (500+ rows), filters (board/section/rail/status), free-text search, inline editing, bulk operations, board capacity bars, add board dialog

### Key dependencies:
- `@tanstack/react-query` for data fetching/caching
- `@tanstack/react-virtual` for table virtualization
- `tsx` for server dev (fast TS runner)

### Verify:
- Docker up, both dev servers running, seed data loaded
- Full CRUD on boards, component types, instances, pin assignments
- Pin table filters, search, inline edit, bulk ops all working

---

## Phase 2: Core Features (F1 + F6 + F3)

**Goal**: Interactive panel map, build progress tracking, power budget monitoring

### Steps:
1. **Create SVG panel illustration** - Built as React JSX (not static SVG file) for full interactivity. 12 section regions positioned by dimensions from spec. Blueprint/schematic aesthetic.
2. **F1: Panel Map (Home page)** - Clickable sections with status-based coloring (gray=not onboarded, amber=in progress, green=complete, red badge=issues). Hover tooltips (name, status, component count, pin usage, power breakdown). Click opens right-side flyout (shadcn Sheet). Flyout shows section summary + scrollable component list. Click component drills into detail view.
3. **F6: Build Progress** - Dashboard with overall % + per-section cards. Status pipeline per component (Planned -> Wired -> Tested -> Complete). Status changes cascade to pin wiring statuses server-side.
4. **F3: Power Budget** - Per-rail cards (5V/9V/27V) with utilization bars + warning thresholds. MOSFET board channel usage grids. Breakout board tracking. All derived from pin assignment data.

### New API endpoints:
- `GET /api/panel-sections/summary` - aggregated counts per section
- `GET /api/build-progress` - per-section status rollup
- `PATCH /api/component-instances/:id/status` - status progression with pin cascade
- `GET /api/power-budget` - per-rail aggregation

### Verify:
- SVG map renders with correct section positioning and status colors
- Hover/click/flyout/drill-down navigation flow works
- Build progress dashboard reflects real data
- Status changes cascade to pin assignments
- Power budget shows accurate per-rail breakdowns

---

## Phase 3: Advanced Features (F9 + F11 + F4)

**Goal**: MobiFlight export, smart BOM generation, wiring diagram

### Steps:
1. **F9: MobiFlight Export** - Generate .mfmc JSON files per board. Maps pins to MobiFlight device types (Button, Output, Stepper, etc.). Groups stepper triads (DIR+STEP+Zero). Preview panel + download button. Export single board or ZIP of all. **Note**: User has sample .mfmc files available -- reverse-engineer the exact format from those before implementing.
2. **F11: BOM Generator** - 6-step onboarding wizard: select section -> define components from library -> review pin demand -> board allocation (best-fit, existing boards first) -> MOSFET/breakout check -> BOM output + apply. Pin allocation algorithm packs efficiently before recommending new hardware.
3. **F4: Wiring Diagram** - Per-section SVG diagram. Column layout: Components -> Arduino Pins -> MOSFET Channels -> Power Rails. Connection lines between them. Pan/zoom. Click to highlight signal path. Groups steppers as triads, annunciators as arrays.

### New API endpoints:
- `GET /api/mobiflight/preview/:boardId` + `GET /api/mobiflight/export/:boardId`
- `POST /api/bom/calculate` + `POST /api/bom/apply`
- `GET /api/wiring-diagram/:sectionId`

### Verify:
- .mfmc export produces valid JSON importable by MobiFlight Connector
- BOM wizard correctly scans free pins, allocates efficiently, generates accurate shortfall list
- BOM generation < 2 seconds
- Wiring diagram renders correct signal paths per section

---

## Phase 4: Reference + Polish (F7 + F8 + F10 + Polish)

**Goal**: Reference views, journal, data seeding, polish

### Steps:
1. **F10: Build Journal** - Chronological feed, create/edit entries, optional section/component tags, filter by section/component/date
2. **F7 + F8: Reference page** - Tabbed view: Panel Dimensions cards + Aircraft Lineage cards. Data already on PanelSection model from seed.
3. **JSON Export/Backup** - `GET /api/export/json` full database dump, `POST /api/import/json` restore
4. **Comprehensive seed data** - Fuel section (53 pins) + Electric section (62 pins) from user's spreadsheet data
5. **Polish** - Keyboard shortcuts for pin table (Ctrl+F, Tab, Enter, arrows), breadcrumb nav, loading skeletons, error toasts, empty states

### Verify:
- Journal CRUD + filtering works
- Reference views show correct dimension/lineage data
- JSON export/import round-trips cleanly
- Keyboard shortcuts work in pin table
- All navigation paths work end-to-end

---

## Critical Files

| File | Why it matters |
|------|---------------|
| `server/prisma/schema.prisma` | Entire data model - must be right from the start |
| `client/src/components/pin-manager/PinTable.tsx` | Most complex UI component - virtualized table with inline editing |
| `server/src/services/bom.service.ts` | Smart pin allocation algorithm (the key differentiator) |
| `client/src/components/panel-map/PanelMap.tsx` | Home page SVG - primary navigation surface |
| `server/src/services/mobiflight.service.ts` | .mfmc generation - the sim integration point |
