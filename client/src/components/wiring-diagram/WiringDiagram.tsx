import { useState, useCallback, useMemo } from 'react';
import { type WiringDiagramData, type WiringPin } from '@/hooks/use-wiring-diagram';
import { POWER_RAIL_LABELS } from '@/lib/constants';

// ─── SVG Layout Constants ───────────────────────────────────────────
const SVG_WIDTH = 1200;
const COL_COMPONENT_X = 40;
const COL_PIN_X = 340;
const COL_MOSFET_X = 620;
const COL_POWER_X = 880;

const COMPONENT_W = 220;
const COMPONENT_H = 48;
const PIN_W = 200;
const PIN_H = 36;
const MOSFET_W = 160;
const MOSFET_H = 36;
const POWER_BAR_W = 100;
const POWER_BAR_H = 36;

const ROW_GAP = 12;
const COMPONENT_GAP = 20;
const PAD_TOP = 60;
const PAD_BOTTOM = 40;

// ─── Color Maps ─────────────────────────────────────────────────────

// Wiring status -> stroke color (hex for SVG)
const WIRING_STATUS_COLORS: Record<string, string> = {
  UNASSIGNED: '#6b7280', // gray-500
  PLANNED: '#64748b',    // slate-500
  WIRED: '#f59e0b',      // amber-500
  TESTED: '#3b82f6',     // blue-500
  COMPLETE: '#22c55e',   // green-500
};

const WIRING_STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: 'Unassigned',
  PLANNED: 'Planned',
  WIRED: 'Wired',
  TESTED: 'Tested',
  COMPLETE: 'Complete',
};

// Dashed statuses (not yet physically wired)
const DASHED_STATUSES = new Set(['UNASSIGNED', 'PLANNED']);

// Power rail -> fill color (hex for SVG)
const RAIL_FILLS: Record<string, string> = {
  FIVE_V: '#22c55e',        // green-500
  NINE_V: '#3b82f6',        // blue-500
  TWENTY_SEVEN_V: '#f59e0b', // amber-500
};

const RAIL_STROKES: Record<string, string> = {
  FIVE_V: '#16a34a',        // green-600
  NINE_V: '#2563eb',        // blue-600
  TWENTY_SEVEN_V: '#d97706', // amber-600
};

// Pin mode badge colors
const PIN_MODE_COLORS: Record<string, string> = {
  INPUT: '#60a5fa',   // blue-400
  OUTPUT: '#f97316',  // orange-500
  PWM: '#a78bfa',     // violet-400
};

// ─── Types ──────────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Connection {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  dashed: boolean;
  pinAssignmentId: string;
  componentId: string;
}

interface PinTooltipData {
  pinNumber: string;
  boardName: string;
  pinMode: string;
  pinType: string;
  powerRail: string;
  wiringStatus: string;
  componentName: string;
  mosfetChannel: { boardName: string; channelNumber: number } | null;
}

// ─── Layout Computation ─────────────────────────────────────────────

function computeLayout(data: WiringDiagramData) {
  const componentNodes: (LayoutNode & { name: string; typeName: string })[] = [];
  const pinNodes: (LayoutNode & { pin: WiringPin; componentId: string; componentName: string })[] = [];
  const mosfetNodes: (LayoutNode & { boardName: string; channelNumber: number; pinAssignmentId: string })[] = [];
  const powerNodes: (LayoutNode & { rail: string })[] = [];
  const connections: Connection[] = [];

  // Track unique power rail rows and MOSFET nodes to avoid duplicates
  const mosfetMap = new Map<string, LayoutNode & { boardName: string; channelNumber: number; pinAssignmentId: string }>();
  const powerMap = new Map<string, LayoutNode & { rail: string }>();

  let currentY = PAD_TOP;

  for (const comp of data.components) {
    const compStartY = currentY;
    const pinCount = comp.pins.length;

    // Component node spans all its pins vertically
    const compHeight = Math.max(
      COMPONENT_H,
      pinCount * (PIN_H + ROW_GAP) - ROW_GAP
    );

    const compNode = {
      id: comp.id,
      x: COL_COMPONENT_X,
      y: compStartY,
      w: COMPONENT_W,
      h: compHeight,
      name: comp.name,
      typeName: comp.typeName,
    };
    componentNodes.push(compNode);

    // Layout each pin
    let pinY = compStartY + (compHeight - (pinCount * (PIN_H + ROW_GAP) - ROW_GAP)) / 2;

    for (const pin of comp.pins) {
      const pinNodeId = pin.pinAssignmentId;
      const pinNode = {
        id: pinNodeId,
        x: COL_PIN_X,
        y: pinY,
        w: PIN_W,
        h: PIN_H,
        pin,
        componentId: comp.id,
        componentName: comp.name,
      };
      pinNodes.push(pinNode);

      // Connection: Component -> Pin
      const statusColor = WIRING_STATUS_COLORS[pin.wiringStatus] ?? WIRING_STATUS_COLORS.UNASSIGNED;
      const isDashed = DASHED_STATUSES.has(pin.wiringStatus);

      connections.push({
        fromId: comp.id,
        toId: pinNodeId,
        fromX: COL_COMPONENT_X + COMPONENT_W,
        fromY: compStartY + compHeight / 2,
        toX: COL_PIN_X,
        toY: pinY + PIN_H / 2,
        color: statusColor,
        dashed: isDashed,
        pinAssignmentId: pin.pinAssignmentId,
        componentId: comp.id,
      });

      // MOSFET channel node
      if (pin.mosfetChannel) {
        const mosfetKey = `${pin.mosfetChannel.boardName}-${pin.mosfetChannel.channelNumber}`;
        let mosfetNode = mosfetMap.get(mosfetKey);
        if (!mosfetNode) {
          mosfetNode = {
            id: `mosfet-${mosfetKey}`,
            x: COL_MOSFET_X,
            y: pinY,
            w: MOSFET_W,
            h: MOSFET_H,
            boardName: pin.mosfetChannel.boardName,
            channelNumber: pin.mosfetChannel.channelNumber,
            pinAssignmentId: pin.pinAssignmentId,
          };
          mosfetMap.set(mosfetKey, mosfetNode);
          mosfetNodes.push(mosfetNode);
        }

        // Connection: Pin -> MOSFET
        connections.push({
          fromId: pinNodeId,
          toId: mosfetNode.id,
          fromX: COL_PIN_X + PIN_W,
          fromY: pinY + PIN_H / 2,
          toX: COL_MOSFET_X,
          toY: mosfetNode.y + MOSFET_H / 2,
          color: statusColor,
          dashed: isDashed,
          pinAssignmentId: pin.pinAssignmentId,
          componentId: comp.id,
        });

        // Power rail connection from MOSFET
        if (pin.powerRail && pin.powerRail !== 'NONE') {
          let powerNode = powerMap.get(pin.powerRail);
          if (!powerNode) {
            powerNode = {
              id: `power-${pin.powerRail}`,
              x: COL_POWER_X,
              y: 0, // Will be repositioned later
              w: POWER_BAR_W,
              h: 0, // Will grow
              rail: pin.powerRail,
            };
            powerMap.set(pin.powerRail, powerNode);
            powerNodes.push(powerNode);
          }

          connections.push({
            fromId: mosfetNode.id,
            toId: powerNode.id,
            fromX: COL_MOSFET_X + MOSFET_W,
            fromY: mosfetNode.y + MOSFET_H / 2,
            toX: COL_POWER_X,
            toY: 0, // Will be updated
            color: statusColor,
            dashed: isDashed,
            pinAssignmentId: pin.pinAssignmentId,
            componentId: comp.id,
          });
        }
      } else if (pin.powerRail && pin.powerRail !== 'NONE') {
        // Direct pin -> power rail (no MOSFET)
        let powerNode = powerMap.get(pin.powerRail);
        if (!powerNode) {
          powerNode = {
            id: `power-${pin.powerRail}`,
            x: COL_POWER_X,
            y: 0,
            w: POWER_BAR_W,
            h: 0,
            rail: pin.powerRail,
          };
          powerMap.set(pin.powerRail, powerNode);
          powerNodes.push(powerNode);
        }

        connections.push({
          fromId: pinNodeId,
          toId: powerNode.id,
          fromX: COL_PIN_X + PIN_W,
          fromY: pinY + PIN_H / 2,
          toX: COL_POWER_X,
          toY: 0, // Will be updated
          color: statusColor,
          dashed: isDashed,
          pinAssignmentId: pin.pinAssignmentId,
          componentId: comp.id,
        });
      }

      pinY += PIN_H + ROW_GAP;
    }

    currentY += compHeight + COMPONENT_GAP;
  }

  const totalHeight = currentY + PAD_BOTTOM;

  // Position power rail bars: they should span the full height as vertical bars
  for (const pn of powerNodes) {
    pn.y = PAD_TOP;
    pn.h = totalHeight - PAD_TOP - PAD_BOTTOM;
  }

  // Space power rails evenly in the power column area
  const powerRailOrder = ['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V'];
  const activeRails = powerRailOrder.filter((r) => powerMap.has(r));
  if (activeRails.length > 0) {
    const railSpacing = Math.min(POWER_BAR_W + 20, (SVG_WIDTH - COL_POWER_X - 40) / activeRails.length);
    activeRails.forEach((rail, i) => {
      const pn = powerMap.get(rail)!;
      pn.x = COL_POWER_X + i * railSpacing;
      pn.w = Math.min(POWER_BAR_W, railSpacing - 10);
    });
  }

  // Fix power rail connection endpoints
  for (const conn of connections) {
    if (conn.toId.startsWith('power-')) {
      const pn = powerMap.get(conn.toId.replace('power-', ''));
      if (pn) {
        conn.toX = pn.x;
        conn.toY = conn.fromY; // Connect at the same vertical level
      }
    }
  }

  return {
    componentNodes,
    pinNodes,
    mosfetNodes,
    powerNodes,
    connections,
    totalHeight,
    powerMap,
  };
}

// ─── Bezier Path Builder ────────────────────────────────────────────

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

// ─── Sub-components ─────────────────────────────────────────────────

function ComponentBox({
  node,
  isHighlighted,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  node: { id: string; x: number; y: number; w: number; h: number; name: string; typeName: string };
  isHighlighted: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const glowActive = isHighlighted || isSelected;

  return (
    <g
      className="cursor-pointer"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Glow effect */}
      {glowActive && (
        <rect
          x={node.x - 3}
          y={node.y - 3}
          width={node.w + 6}
          height={node.h + 6}
          rx={10}
          ry={10}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={2}
          opacity={0.6}
          filter="url(#glow)"
        />
      )}
      {/* Main box */}
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={8}
        ry={8}
        fill={glowActive ? '#1e3a5f' : '#1e293b'}
        stroke={glowActive ? '#60a5fa' : '#475569'}
        strokeWidth={glowActive ? 2 : 1.5}
      />
      {/* Component name */}
      <text
        x={node.x + 12}
        y={node.y + node.h / 2 - 6}
        fill="#e2e8f0"
        fontSize={13}
        fontWeight={600}
        className="pointer-events-none select-none"
      >
        {node.name}
      </text>
      {/* Type label */}
      <text
        x={node.x + 12}
        y={node.y + node.h / 2 + 10}
        fill="#94a3b8"
        fontSize={10}
        className="pointer-events-none select-none"
      >
        {node.typeName}
      </text>
    </g>
  );
}

function PinBox({
  node,
  isHighlighted,
  tooltipData,
  onMouseEnter,
  onMouseLeave,
}: {
  node: { id: string; x: number; y: number; w: number; h: number; pin: WiringPin };
  isHighlighted: boolean;
  tooltipData: PinTooltipData | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { pin } = node;
  const modeColor = PIN_MODE_COLORS[pin.pinMode] ?? '#94a3b8';

  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={6}
        ry={6}
        fill={isHighlighted ? '#1e3a5f' : '#0f172a'}
        stroke={isHighlighted ? '#60a5fa' : '#334155'}
        strokeWidth={isHighlighted ? 1.5 : 1}
      />
      {/* Board name */}
      <text
        x={node.x + 10}
        y={node.y + node.h / 2 + 1}
        fill="#cbd5e1"
        fontSize={11}
        fontWeight={500}
        className="pointer-events-none select-none"
      >
        {pin.boardName}
      </text>
      {/* Pin number */}
      <text
        x={node.x + node.w / 2 + 20}
        y={node.y + node.h / 2 + 1}
        fill="#e2e8f0"
        fontSize={12}
        fontWeight={700}
        fontFamily="monospace"
        className="pointer-events-none select-none"
      >
        {pin.pinNumber}
      </text>
      {/* Pin mode badge */}
      <rect
        x={node.x + node.w - 52}
        y={node.y + (node.h - 18) / 2}
        width={42}
        height={18}
        rx={9}
        fill={modeColor}
        fillOpacity={0.2}
      />
      <text
        x={node.x + node.w - 31}
        y={node.y + node.h / 2 + 1}
        textAnchor="middle"
        fill={modeColor}
        fontSize={9}
        fontWeight={600}
        className="pointer-events-none select-none"
      >
        {pin.pinMode}
      </text>
      {/* Native tooltip via <title> for pin details */}
      {tooltipData && (
        <title>
          {`${tooltipData.componentName}\n${tooltipData.boardName} ${tooltipData.pinNumber}\nMode: ${tooltipData.pinMode} (${tooltipData.pinType})\nPower: ${POWER_RAIL_LABELS[tooltipData.powerRail] ?? tooltipData.powerRail}\nStatus: ${WIRING_STATUS_LABELS[tooltipData.wiringStatus] ?? tooltipData.wiringStatus}${tooltipData.mosfetChannel ? `\nMOSFET: ${tooltipData.mosfetChannel.boardName} CH${tooltipData.mosfetChannel.channelNumber}` : ''}`}
        </title>
      )}
    </g>
  );
}

function MosfetBox({
  node,
  isHighlighted,
}: {
  node: { id: string; x: number; y: number; w: number; h: number; boardName: string; channelNumber: number };
  isHighlighted: boolean;
}) {
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={6}
        ry={6}
        fill={isHighlighted ? '#312e1c' : '#1a1a2e'}
        stroke={isHighlighted ? '#f59e0b' : '#334155'}
        strokeWidth={isHighlighted ? 1.5 : 1}
      />
      <text
        x={node.x + 10}
        y={node.y + node.h / 2 + 1}
        fill="#cbd5e1"
        fontSize={10}
        className="pointer-events-none select-none"
      >
        {node.boardName}
      </text>
      <text
        x={node.x + node.w - 10}
        y={node.y + node.h / 2 + 1}
        textAnchor="end"
        fill="#fbbf24"
        fontSize={12}
        fontWeight={700}
        fontFamily="monospace"
        className="pointer-events-none select-none"
      >
        CH{node.channelNumber}
      </text>
    </g>
  );
}

function PowerRailBar({
  node,
  isHighlighted,
}: {
  node: { id: string; x: number; y: number; w: number; h: number; rail: string };
  isHighlighted: boolean;
}) {
  const fill = RAIL_FILLS[node.rail] ?? '#6b7280';
  const stroke = RAIL_STROKES[node.rail] ?? '#4b5563';
  const label = POWER_RAIL_LABELS[node.rail] ?? node.rail;

  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={6}
        ry={6}
        fill={fill}
        fillOpacity={isHighlighted ? 0.35 : 0.15}
        stroke={stroke}
        strokeWidth={isHighlighted ? 2 : 1}
      />
      {/* Rail label at the top */}
      <text
        x={node.x + node.w / 2}
        y={node.y - 8}
        textAnchor="middle"
        fill={fill}
        fontSize={12}
        fontWeight={700}
        className="pointer-events-none select-none"
      >
        {label}
      </text>
      {/* Vertical center line */}
      <line
        x1={node.x + node.w / 2}
        y1={node.y + 20}
        x2={node.x + node.w / 2}
        y2={node.y + node.h - 10}
        stroke={fill}
        strokeWidth={2}
        strokeOpacity={isHighlighted ? 0.6 : 0.3}
      />
    </g>
  );
}

function ConnectionLine({
  conn,
  isHighlighted,
}: {
  conn: Connection;
  isHighlighted: boolean;
}) {
  const d = bezierPath(conn.fromX, conn.fromY, conn.toX, conn.toY);

  return (
    <g>
      {/* Glow layer for highlighted connections */}
      {isHighlighted && (
        <path
          d={d}
          fill="none"
          stroke={conn.color}
          strokeWidth={6}
          strokeOpacity={0.25}
          strokeLinecap="round"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={conn.color}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        strokeOpacity={isHighlighted ? 1 : 0.6}
        strokeDasharray={conn.dashed ? '6 4' : undefined}
        strokeLinecap="round"
      />
    </g>
  );
}

// ─── Column Headers ─────────────────────────────────────────────────

function ColumnHeaders() {
  const headers = [
    { x: COL_COMPONENT_X + COMPONENT_W / 2, label: 'COMPONENTS' },
    { x: COL_PIN_X + PIN_W / 2, label: 'ARDUINO PINS' },
    { x: COL_MOSFET_X + MOSFET_W / 2, label: 'MOSFET CHANNELS' },
    { x: COL_POWER_X + POWER_BAR_W / 2, label: 'POWER RAILS' },
  ];

  return (
    <g>
      {headers.map((h) => (
        <text
          key={h.label}
          x={h.x}
          y={30}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
          fontWeight={600}
          letterSpacing={1.5}
          className="pointer-events-none select-none"
        >
          {h.label}
        </text>
      ))}
      {/* Header divider line */}
      <line
        x1={20}
        y1={42}
        x2={SVG_WIDTH - 20}
        y2={42}
        stroke="#334155"
        strokeWidth={0.5}
      />
    </g>
  );
}

// ─── Main WiringDiagram Component ───────────────────────────────────

interface WiringDiagramProps {
  data: WiringDiagramData;
}

export function WiringDiagram({ data }: WiringDiagramProps) {
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const layout = useMemo(() => computeLayout(data), [data]);

  const activeComponentId = selectedComponentId ?? hoveredComponentId;

  // Build set of highlighted pin assignment IDs for the active component
  const highlightedPinIds = useMemo(() => {
    if (!activeComponentId) return new Set<string>();
    const ids = new Set<string>();
    for (const conn of layout.connections) {
      if (conn.componentId === activeComponentId) {
        ids.add(conn.pinAssignmentId);
      }
    }
    return ids;
  }, [activeComponentId, layout.connections]);

  // Build set of highlighted node IDs
  const highlightedNodeIds = useMemo(() => {
    if (!activeComponentId) return new Set<string>();
    const ids = new Set<string>();
    ids.add(activeComponentId);
    for (const conn of layout.connections) {
      if (conn.componentId === activeComponentId) {
        ids.add(conn.fromId);
        ids.add(conn.toId);
      }
    }
    return ids;
  }, [activeComponentId, layout.connections]);

  const handleComponentEnter = useCallback((id: string) => {
    setHoveredComponentId(id);
  }, []);

  const handleComponentLeave = useCallback(() => {
    setHoveredComponentId(null);
  }, []);

  const handleComponentClick = useCallback((id: string) => {
    setSelectedComponentId((prev) => (prev === id ? null : id));
  }, []);

  // Build tooltip data map for pins
  const pinTooltipMap = useMemo(() => {
    const map = new Map<string, PinTooltipData>();
    for (const pn of layout.pinNodes) {
      map.set(pn.id, {
        pinNumber: pn.pin.pinNumber,
        boardName: pn.pin.boardName,
        pinMode: pn.pin.pinMode,
        pinType: pn.pin.pinType,
        powerRail: pn.pin.powerRail,
        wiringStatus: pn.pin.wiringStatus,
        componentName: pn.componentName,
        mosfetChannel: pn.pin.mosfetChannel,
      });
    }
    return map;
  }, [layout.pinNodes]);

  const viewBox = `0 0 ${SVG_WIDTH} ${layout.totalHeight}`;

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Definitions */}
      <defs>
        {/* Grid pattern for blueprint feel */}
        <pattern id="wiring-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#1e293b"
            strokeWidth={0.5}
          />
        </pattern>
        {/* Glow filter for highlights */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="100%" height="100%" fill="#0f172a" />
      <rect width="100%" height="100%" fill="url(#wiring-grid)" />

      {/* Column headers */}
      <ColumnHeaders />

      {/* Connection lines (drawn first, behind nodes) */}
      <g>
        {/* Non-highlighted connections first */}
        {layout.connections
          .filter((conn) => !highlightedPinIds.has(conn.pinAssignmentId))
          .map((conn, i) => (
            <ConnectionLine
              key={`conn-dim-${i}`}
              conn={conn}
              isHighlighted={false}
            />
          ))}
        {/* Highlighted connections on top */}
        {layout.connections
          .filter((conn) => highlightedPinIds.has(conn.pinAssignmentId))
          .map((conn, i) => (
            <ConnectionLine
              key={`conn-lit-${i}`}
              conn={conn}
              isHighlighted={true}
            />
          ))}
      </g>

      {/* Power rail bars */}
      <g>
        {layout.powerNodes.map((node) => (
          <PowerRailBar
            key={node.id}
            node={node}
            isHighlighted={highlightedNodeIds.has(node.id)}
          />
        ))}
      </g>

      {/* MOSFET channel boxes */}
      <g>
        {layout.mosfetNodes.map((node) => (
          <MosfetBox
            key={node.id}
            node={node}
            isHighlighted={highlightedNodeIds.has(node.id)}
          />
        ))}
      </g>

      {/* Pin boxes */}
      <g>
        {layout.pinNodes.map((node) => (
          <PinBox
            key={node.id}
            node={node}
            isHighlighted={highlightedNodeIds.has(node.id)}
            tooltipData={pinTooltipMap.get(node.id) ?? null}
            onMouseEnter={() => handleComponentEnter(node.componentId)}
            onMouseLeave={handleComponentLeave}
          />
        ))}
      </g>

      {/* Component boxes */}
      <g>
        {layout.componentNodes.map((node) => (
          <ComponentBox
            key={node.id}
            node={node}
            isHighlighted={hoveredComponentId === node.id}
            isSelected={selectedComponentId === node.id}
            onMouseEnter={() => handleComponentEnter(node.id)}
            onMouseLeave={handleComponentLeave}
            onClick={() => handleComponentClick(node.id)}
          />
        ))}
      </g>

      {/* Title */}
      <text
        x={20}
        y={18}
        fill="#475569"
        fontSize={11}
        fontWeight={500}
        className="pointer-events-none select-none"
      >
        {data.sectionName.toUpperCase()} — WIRING DIAGRAM
      </text>
    </svg>
  );
}
