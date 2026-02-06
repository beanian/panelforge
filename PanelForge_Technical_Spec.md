# PanelForge

## BAe 146 Overhead Panel Build Manager — Technical Specification

**Version:** 1.0
**Date:** February 2026
**Status:** LOCKED

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Data Model Overview](#3-data-model-overview)
4. [Feature Specifications (F1–F11)](#4-feature-specifications)
5. [Panel Sections Reference](#5-panel-sections-reference)
6. [Hardware Reference](#6-hardware-reference)
7. [Non-Functional Requirements](#7-non-functional-requirements)

---

## 1. Project Overview

PanelForge is a self-hosted web application for planning, building, and documenting the BAe 146 overhead panel cockpit simulator build. The application serves as the single source of truth for all hardware assignments, wiring, power budgets, and simulator integration configuration.

The app is desktop-optimised and designed for use during the planning and design phase. All data persists in a cloud-hosted PostgreSQL database, accessible from any device with a browser.

### Project Scope

The overhead panel comprises 12 panel sections sourced from multiple BAe 146/RJ-series airframes, driven by multiple Arduino Mega 2560 boards communicating with MSFS 2020/2024 via MobiFlight Connector. The application manages the full lifecycle from component planning through wiring, testing, and simulator integration.

### Key Principles

- **Single source of truth:** PanelForge manages all pin assignments, power budgets, and MobiFlight configuration
- **Smart hardware optimisation:** the app allocates pins to existing boards before recommending new purchases
- **Visual-first interface:** the interactive overhead panel SVG is the primary navigation and status view
- **Persistent cloud storage:** PostgreSQL database accessible from any location

---

## 2. Technology Stack

| Attribute | Detail |
|-----------|--------|
| Frontend | React (desktop-optimised) |
| Backend | Node.js / Express |
| Database | PostgreSQL |
| Deployment | Self-hosted (Railway, Render, or VPS) |
| Target Sim | MSFS 2020/2024 |
| Middleware | MobiFlight Connector |
| Arduino Board | Arduino Mega 2560 (54 digital + 16 analog pins) |
| Panel Diagram | SVG-based interactive illustration |

---

## 3. Data Model Overview

All features share a unified relational data model. The core entities and their relationships are described below.

### Core Entities

- **Board:** An Arduino Mega 2560 with a name (e.g. Alpha, Bravo), 54 digital pins (0–53), and 16 analog pins (A0–A15). Tracks allocated vs free pins.
- **Panel Section:** A physical section of the overhead panel (e.g. Fuel, Electric, Air Supply). Has dimensions, DZUS sizes, lineage data, and onboarding status.
- **Component Type:** A reusable template from the component library (e.g. Gauge, Annunciator, Switch). Defines default pin count, power requirement, and MobiFlight config template.
- **Component Instance:** A specific component assigned to a panel section (e.g. Fuel Feed 1 Gauge). References a component type and has a build status.
- **Pin Assignment:** Links a board pin to a component instance. Includes pin mode (INPUT/OUTPUT/PWM), power rail, and MobiFlight variable mapping.
- **MOSFET Board:** A MOSFET driver board with a set number of channels. Tracks which channels are assigned to which 27/28V outputs.
- **MobiFlight Mapping:** The sim variable (LVAR/SimVar/HVar), event type, and configuration parameters for a pin assignment.
- **Journal Entry:** A timestamped build log entry, optionally tagged to a panel section or component.

### Key Relationships

- A Board has many Pin Assignments
- A Panel Section has many Component Instances
- A Component Instance has one or more Pin Assignments
- A Component Instance references one Component Type
- A Pin Assignment optionally has one MobiFlight Mapping
- A MOSFET Board has many channels, each optionally assigned to a Pin Assignment

---

## 4. Feature Specifications

### F1 — Interactive Overhead Panel Map (Home)

The primary interface and landing page. A clean SVG illustration of the BAe 146 overhead panel with clickable, hoverable hotspot regions for each of the 12 panel sections.

| Attribute | Detail |
|-----------|--------|
| Priority | Core — Landing Page |
| Visual States | Not onboarded (greyed/dimmed, dashed outline), Onboarded not started (neutral), In progress (amber, shows %), Complete (green), Has issues (red badge) |
| Hover — Section | Section name, build status, component count, pin usage summary, power breakdown (5V/9V/27V counts) |
| Hover — Component | Component name, pin assignment(s), power voltage, board name, wiring status, mapped MSFS LVAR/SimVar |
| Click — Section | Opens detail flyout panel on the right side |
| Flyout Content | Section summary (component count, pin usage, build progress, power draw), scrollable component list with status indicators |
| Click — Component | Drills from flyout into full component detail view showing all pin assignments, board, MOSFET channel, MobiFlight mapping, wiring status, notes |
| Navigation | Back button returns to flyout; close flyout returns to map |
| SVG Requirements | Scalable, dynamically coloured/animated via CSS, crisp at any zoom level |

---

### F2 — Pin-Out Browser & Manager

A searchable, filterable table of every Arduino pin across all boards. The primary data management interface for pin assignments.

| Attribute | Detail |
|-----------|--------|
| Priority | 1 (Highest) |
| Columns | Board, Pin, Panel Section, Description, Component, Power Rail, Pin Mode (INPUT/OUTPUT/PWM), Wiring Status, MobiFlight Variable, Notes |
| Filters | Board, Panel Section, Power Rail, Wiring Status, Assigned/Unassigned |
| Search | Free-text across description, component name, notes, LVAR name |
| Board Management | Add new boards (named, e.g. Bravo, Charlie), each with Mega 2560 pin layout |
| Bulk Operations | Multi-select pins for bulk panel assignment or status update |
| Pin Availability | Visual indicator per board showing allocated vs free pins (digital and analog separately) |
| Inline Editing | Click-to-edit on description, notes, and MobiFlight mapping fields |

---

### F3 — Power Budget Tracker

Aggregates and visualises power requirements across all components, broken down by voltage rail and panel section.

| Attribute | Detail |
|-----------|--------|
| Priority | 2 |
| Voltage Rails | 5V, 9V, 27/28V |
| Per Rail View | Total connections, breakdown by panel section, PSU capacity setting, utilisation bar with warning threshold |
| MOSFET Tracking | Each MOSFET board as an entity with channel count, assigned channels listed with component + pin, available channels count |
| Breakout Boards | Track breakout board allocation per rail (e.g. 2x 27V breakouts, 1x 5V, 5x 9V for Fuel section) |
| Warnings | Flag when a rail approaches or exceeds defined PSU capacity |
| Data Source | Derived automatically from pin assignments and component types |

---

### F4 — Wiring / Signal Flow Diagram

Visual diagram view showing components as blocks with connection lines, providing a clear picture of the signal path from component to Arduino to MOSFET to power rail.

| Attribute | Detail |
|-----------|--------|
| Priority | 3 |
| Style | Visual diagram with boxes and connection lines (SVG or Canvas) |
| Grouping | Stepper motors as triads (DIR + STEP + Zero), annunciator banks as grouped arrays (upper/lower), switch + indicator combos linked |
| Signal Path | Component block → wire line → Arduino pin → MOSFET channel (if applicable) → power rail |
| Interactivity | Pan/zoom, click components to highlight signal path, hover for details |
| Scope | Per-panel-section view (select which section to display) |

---

### F5 — Component Library

A reusable catalog of component types with standard specifications. Used to define panel sections and auto-calculate requirements.

| Attribute | Detail |
|-----------|--------|
| Priority | 4 |
| Seeded Types | Gauge (2-pin, 9V stepper), Annunciator (1-pin, 28V LED), Switch (1–2 pin, unpowered), Pushbutton (1–2 pin), Pot (2–8 pin) |
| Per Type Fields | Type name, default pin count, pin types required (digital/analog/PWM), default power rail, MobiFlight config template, description |
| Custom Types | User can create new component types |
| Usage | When adding a component to a panel, select from library and it pre-fills pin count, power, and MobiFlight template |
| Data Source | Seeded from existing Fuel Section and Electric section spreadsheet data |

---

### F6 — Build Progress Checklist

Per-panel-section component-level tracking with status progression, tied to pin-out data for consistency.

| Attribute | Detail |
|-----------|--------|
| Priority | 5 |
| Status Flow | Planned → Wired → Tested → Complete |
| Per Section | Component list with individual status, progress bar, count summary (e.g. 34/53 pins wired) |
| Roll-up | Overall project completion percentage displayed on dashboard/panel map |
| Data Sync | Updating component status reflects in pin status and panel map colours |

---

### F7 — Panel Dimensions Reference

Quick-reference cards for physical panel measurements, always accessible from any view.

| Attribute | Detail |
|-----------|--------|
| Priority | 6 |
| Per Panel | Width (mm), Height (mm), DZUS fastener sizes, rail notes |
| Panels | Air Supply, Fuel, Ice Protect, APU, Engines & Ice, Lights & AC, Engine Fire Detect, Misc & Hydraulic, Electric, Lights & Belts, Fan, Pressurisation |
| Access | Dedicated tab/view, also visible in panel map flyout |

---

### F8 — Aircraft Lineage Tracker

Records the provenance of each panel section, documenting which airframe it was sourced from.

| Attribute | Detail |
|-----------|--------|
| Priority | 7 |
| Per Section | Source MSN, aircraft variant (146-100, 146-300, RJ85, RJ100), registration, reference links/URLs |
| Known Lineage | Fuel: E3232, Lights & AC: E3232, Electric: E3232, Misc/Hydraulic: E3137, Engines: E2233, Air Supply: E3232, Seats & Belts: E1144 |
| Display | Accessible from panel map flyout and as a dedicated reference view |

---

### F9 — MobiFlight Config Export

Generates MobiFlight Connector configuration files directly from pin assignment and sim variable mapping data. PanelForge becomes the single source of truth; MobiFlight configuration is a derived output.

| Attribute | Detail |
|-----------|--------|
| Priority | High — Key differentiating feature |
| Target Sim | MSFS 2020/2024 |
| Variable Types | MSFS SimVars, LVARs (L:), HVARs (H:) |
| Input Configs | Switches, pushbuttons, encoders → mapped to sim events or LVAR writes |
| Output Configs | Annunciator LEDs driven by sim variable conditions (e.g. illuminate when L:BAe146_FUEL_L_FEED_LO == 1) |
| Stepper Configs | DIR/STEP/Zero pin triads mapped to gauge sim values with min/max calibration parameters |
| LED/PWM Outputs | Backlighting and indicator brightness control |
| Device Definitions | Each Arduino board exported as a MobiFlight device with matching name and pin layout |
| Export Format | .mfmc file (MobiFlight JSON config) for direct import into MobiFlight Connector |
| Per-Pin Mapping | Each pin assignment includes: MSFS variable name, event type (input action / output condition), config parameters |

---

### F10 — Build Journal

A timestamped log for documenting the build process, decisions, problems encountered, and solutions found.

| Attribute | Detail |
|-----------|--------|
| Priority | 8 |
| Entry Fields | Timestamp (auto), title, free-text body, optional panel section tag, optional component tag |
| Display | Chronological feed, filterable by panel section or component |
| Purpose | Build diary alongside technical data; record decisions and troubleshooting for future reference |

---

### F11 — Panel Onboarding & BOM Generator

When onboarding a new panel section, PanelForge calculates all hardware requirements and generates a bill of materials. It intelligently uses existing available resources before recommending new purchases.

| Attribute | Detail |
|-----------|--------|
| Priority | High — Key workflow feature |
| Trigger | User adds a new panel section and defines its components from the library |
| Step 1: Pin Demand | Totals all pins needed based on component list (e.g. 4 gauges × 2 pins + 8 annunciators × 1 pin = 16 pins) |
| Step 2: Board Check | Scans all onboarded Arduino Megas for free pins, accounting for pin type (digital vs analog, PWM capability) |
| Step 3: MOSFET Check | Any 27/28V outputs need MOSFET channels; checks existing MOSFET boards for available channels |
| Step 4: Power Rails | Calculates breakout board connections needed per rail; checks existing breakout capacity |
| Step 5: Auto-Assign | Allocates pins to best available slots on existing boards, packing efficiently before overflow |
| Step 6: BOM Output | Generates order list for shortfall: e.g. 1× Arduino Mega, 1× 16-ch MOSFET board, 1× 9V breakout |
| Optimisation | Never blindly adds hardware; if Alpha has 12 free digital pins and only 8 are needed, it uses those first |
| Output | BOM summary with quantities, plus proposed pin assignments (user can review and override) |

---

## 5. Panel Sections Reference

The 12 panel sections that make up the BAe 146 overhead panel, with their physical dimensions and DZUS fastener requirements.

| Panel | Width (mm) | Height (mm) | DZUS | Notes |
|-------|-----------|------------|------|-------|
| Air Supply | 145 | 370 | 342/275 | |
| Fuel | 145 | 370 | 342/275 | |
| Ice Protect | 145 | 190 | 342/342 | |
| APU | 145 | 125 | 342/342 | |
| Engines & Ice | 145 | 245 | — | Uses 370 rail |
| Lights & AC | 215 | 325 | 275/275 | |
| Engine Fire Detect | 145 | 85 | 95/95 | |
| Misc & Hydraulic | 215 | 325 | 275/275 | |
| Electric | 145 | 370 | 342/342 | |
| Lights & Belts | 435 | 95 | — | |
| Fan | 145 | 85 | 95/95 | |
| Pressurisation | 145 | 180 | — | Uses 370 rail |

---

## 6. Hardware Reference

### Arduino Mega 2560

| Attribute | Detail |
|-----------|--------|
| Digital Pins | 54 (pins 0–53), of which 15 provide PWM output |
| Analog Pins | 16 (A0–A15) |
| Board Naming | Sequential Greek alphabet: Alpha, Bravo, Charlie, etc. |
| Communication | USB serial to PC running MobiFlight Connector |
| Initial Board | Alpha (partially allocated per existing spreadsheet data) |

### Power Rails

| Attribute | Detail |
|-----------|--------|
| 5V Rail | Microswitches (auto-zero buttons), ground call light, glare shield dimmer, backlighting |
| 9V Rail | Stepper motor drivers (DIR/STEP pairs for gauges) |
| 27/28V Rail | Annunciator LEDs (driven via MOSFET boards), call lights |

### MOSFET Boards

Required for switching 27/28V annunciator outputs from 5V Arduino logic. Each board provides a set number of channels. The Fuel section alone requires 2× MOSFET boards based on current component count.

### Known Breakout Requirements (Fuel Section)

| Attribute | Detail |
|-----------|--------|
| 27V Breakouts | 2 |
| 5V Breakouts | 1 |
| 9V Breakouts | 5 |
| Total Pins | 53 |

### Known Pin Count (Electric Section)

62 pins required.

---

## 7. Non-Functional Requirements

### Performance

- SVG panel map renders and responds to hover/click within 100ms
- Pin-out table handles 500+ rows with responsive filtering
- BOM generation completes within 2 seconds

### Persistence

- All data stored in PostgreSQL, cloud-hosted for access from any location
- Data export/backup available as JSON download
- No data loss on browser refresh or session timeout

### Usability

- Desktop-optimised layout (minimum 1280px viewport)
- Keyboard shortcuts for common operations in pin-out table
- Consistent navigation: panel map always accessible, breadcrumb trail for drill-down views

### Extensibility

- Board definitions support future Arduino types beyond Mega 2560
- Component library is user-extensible
- MobiFlight export format is configurable for future middleware changes

---

*END OF SPECIFICATION*
