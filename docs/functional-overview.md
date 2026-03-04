# PanelForge — Functional Overview

PanelForge is a build management tool for assembling a real BAe 146 aircraft overhead control panel into a flight simulator peripheral. It tracks 12 physical panel sections sourced from scrapped aircraft, manages hundreds of switches, gauges and annunciators, handles electrical routing across Arduino Mega boards and MOSFET driver boards, and exports configuration files for MobiFlight Connector to bridge the hardware to Microsoft Flight Simulator.

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Panel Section** | A physical area of the overhead panel (e.g. "Fuel", "Electric", "APU"). Each section has real-world dimensions, DZUS fastener sizes, and may be sourced from a specific aircraft identified by MSN. |
| **Component Type** | A reusable definition for a class of hardware — toggle switches, annunciator LEDs, stepper gauges, potentiometers, rotary encoders, illuminated pushbuttons. Defines pin count, pin types, power rails, and current draw. |
| **Component Instance** | A specific component placed on a panel section. Positioned on the interactive map and tracked through a build lifecycle (Not Onboarded → Planned → In Progress → Complete). |
| **Pin Assignment** | A mapping from a component instance to a physical pin on an Arduino Mega board. Carries pin type (digital/analog), mode (input/output/PWM), power rail, and wiring status. |
| **Board** | An Arduino Mega 2560 microcontroller with 54 digital and 16 analog pins. Multiple boards can be used; pins are allocated across them. |
| **MOSFET Board** | An 8-channel PWM driver board for high-voltage outputs (27V annunciators). Each channel links to a pin assignment. |
| **MobiFlight Mapping** | Links a pin assignment to a flight simulator variable (LVAR, SIMVAR, or HVAR) with an event type, enabling the physical hardware to drive sim state. |

## Features

### Panel Map

The home page is an interactive 2D SVG canvas showing the overhead panel layout. Components are rendered as positioned blocks with status-coloured indicators. Users can:

- Click components to view details in a flyout panel
- Right-click for context actions (add, copy, delete, configure)
- Draw bounding boxes to place new components
- Pan and zoom with mouse wheel and middle-click drag
- Toggle section overlay boundaries
- Change component build status inline

### Component Library

A card grid of all component type definitions. Each card shows pin count, power rail requirements, PWM needs, and how many instances are placed. Component types can be created, edited, and deleted (deletion blocked if instances exist).

### Pin Manager

The primary wiring workspace. Tabbed by board, it shows:

- Capacity bars for digital, analog, and PWM pin utilisation
- A filterable table of every pin assignment (search, section, power rail, assigned/unassigned)
- Bulk selection for batch status or notes updates
- Per-pin LVAR picker for MobiFlight variable assignment
- MOSFET board summary with channel usage

Boards and MOSFET boards can be created, renamed, and deleted from this page.

### Power Budget

Electrical load analysis across the entire build. Features:

- PSU configuration editor (wattage capacity, converter efficiency)
- Scenario selector: worst-case (all on), hot-weather (cooling active), idle (standby only), or custom toggle per section
- Headline card: total PSU demand with colour-coded utilisation bar
- Per-rail breakdown (5V, 9V, 27V): current draw, power, PSU demand, section-level detail
- Infrastructure overhead estimates (board and MOSFET board quiescent draw)
- MOSFET board channel grids showing which channels are in use

### BOM Generator

A wizard that calculates bill-of-materials for a selected panel section:

1. Select a section
2. Review allocation: pins needed, boards to use, MOSFET channels required, power rail breakdown, per-component allocation with warnings
3. Apply: creates pin assignments in a single database transaction

Already-allocated components are shown separately and skipped.

### Wiring Diagram

A signal-path visualisation for a selected panel section. Shows the flow from components through pins to boards to power rails, with lines colour-coded by wiring status (unassigned, planned, wired, tested, complete) and power rail (5V, 9V, 27V).

### MobiFlight Export

Generates device configuration for MobiFlight Connector software:

- Board selector with device preview table (pin, type, name, variable, event type)
- Device types auto-detected: Button (input), Output (digital out), LedModule (PWM), Stepper (paired gauge DIR+STEP pins)
- Auto-assign LVARs button that fuzzy-matches component names to a built-in BAe 146 variable library
- Export downloads a `.mfmc` JSON file importable by MobiFlight Connector

### Build Journal

A chronological log of build notes. Entries have a title, markdown body, and optional links to a panel section or component instance. Filterable by section, date range, and free-text search.

### Reference

Two tabs:

**Panel Dimensions** — Editable cards for each section showing width, height, DZUS fastener sizes, dimension notes, and ownership/build status badges. All fields are click-to-edit.

**Aircraft Lineage** — Each panel section can record the MSN (manufacturer serial number) of the aircraft it was sourced from. The lineage cards allow editing the MSN, variant, registration, notes, and reference URLs. Clicking "View Aircraft Details" shows aircraft type and operator from a static lookup table, plus photos fetched from Planespotters.net across all known historical registrations for the airframe (proxied through the server to bypass CDN hotlink protection).

External links to Planespotters, Airfleets, and RZJets are auto-generated.

### Section Calibration

A tool for mapping panel section boundaries onto the SVG panel image. Users select a section, draw its bounding box on the canvas, and save the SVG coordinates. These coordinates drive the section overlay on the Panel Map.

### Data Import/Export

Full database JSON export and import, useful for backup and environment migration.

## Data Flow

```
Component Types (library)
        │
        ▼
Component Instances (placed on panel sections)
        │
        ▼
Pin Assignments (allocated to boards)
        │
        ├──► MOSFET Channels (for 27V outputs)
        │
        └──► MobiFlight Mappings (sim variables)
                │
                ▼
        .mfmc Export (MobiFlight Connector)
```

## Build Lifecycle

Each component instance progresses through:

```
NOT_ONBOARDED → PLANNED → IN_PROGRESS → COMPLETE
                                     └─► HAS_ISSUES
```

Pin wiring status tracks independently:

```
UNASSIGNED → PLANNED → WIRED → TESTED → COMPLETE
```

Status changes on a component can cascade to its pin assignments (e.g. marking a component complete sets all its pins to complete).
