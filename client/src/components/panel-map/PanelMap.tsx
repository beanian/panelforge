import { type PanelSectionSummary } from '@/hooks/use-panel-section-summary';

// ─── SVG Color mapping from build status to fill colors ─────────────
const STATUS_FILLS: Record<string, string> = {
  NOT_ONBOARDED: '#d1d5db', // gray-300
  PLANNED: '#94a3b8', // slate-400
  IN_PROGRESS: '#fbbf24', // amber-400
  COMPLETE: '#22c55e', // green-500
  HAS_ISSUES: '#ef4444', // red-500
};

const STATUS_STROKES: Record<string, string> = {
  NOT_ONBOARDED: '#9ca3af', // gray-400
  PLANNED: '#64748b', // slate-500
  IN_PROGRESS: '#f59e0b', // amber-500
  COMPLETE: '#16a34a', // green-600
  HAS_ISSUES: '#dc2626', // red-600
};

const STATUS_LABELS: Record<string, string> = {
  NOT_ONBOARDED: 'Not Onboarded',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  HAS_ISSUES: 'Has Issues',
};

// ─── Layout constants ───────────────────────────────────────────────
// Scale: 1mm = 1 SVG unit. We'll add padding around the edges.
const PAD = 30;
const GAP = 10;

// The overhead panel layout is arranged in a grid-like fashion.
// We define explicit x,y positions for each section slug based on
// the actual BAe 146 overhead panel arrangement.
//
// Layout (from pilot's perspective looking up):
//   Top row: Lights & Belts (wide, centered)
//   Row 2 left to right: Air Supply | Ice Protect | Engines & Ice | Lights & AC | Misc & Hydraulic | Electric
//   Row 3 (shorter sections below row 2): Fuel | APU | Engine Fire Detect | (Lights & AC cont.) | (Misc & Hyd cont.) | Fan
//   Bottom area: Pressurisation

interface LayoutEntry {
  slug: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function computeLayout(): { entries: LayoutEntry[]; viewBox: string } {
  // All dimensions in mm, positions computed manually to match overhead panel shape.
  // The panel is roughly: leftmost column, center-left, center, center-wide sections, right column.

  const col0x = PAD; // Air Supply / Fuel column
  const col1x = col0x + 145 + GAP; // Ice Protect / APU column
  const col2x = col1x + 145 + GAP; // Engines & Ice / Engine Fire Detect column
  const col3x = col2x + 145 + GAP; // Lights & AC
  const col4x = col3x + 215 + GAP; // Misc & Hydraulic
  const col5x = col4x + 215 + GAP; // Electric / Fan / Pressurisation column

  const row0y = PAD; // Lights & Belts top row
  const row1y = row0y + 95 + GAP; // Main row start

  const entries: LayoutEntry[] = [
    // Lights & Belts spans across the center (cols 1-2 area, wide)
    { slug: 'lights-belts', x: col1x, y: row0y, w: 435, h: 95 },

    // Left column: Air Supply (top), Fuel (bottom)
    { slug: 'air-supply', x: col0x, y: row1y, w: 145, h: 370 },
    { slug: 'fuel', x: col0x, y: row1y + 370 + GAP, w: 145, h: 370 },

    // Center-left column: Ice Protect (top), APU (bottom)
    { slug: 'ice-protect', x: col1x, y: row1y, w: 145, h: 190 },
    { slug: 'apu', x: col1x, y: row1y + 190 + GAP, w: 145, h: 125 },

    // Center column: Engines & Ice (top), Engine Fire Detect (bottom of that)
    { slug: 'engines-ice', x: col2x, y: row1y, w: 145, h: 245 },
    { slug: 'engine-fire-detect', x: col2x, y: row1y + 245 + GAP, w: 145, h: 85 },

    // Center-wide: Lights & AC
    { slug: 'lights-ac', x: col3x, y: row1y, w: 215, h: 325 },

    // Right-center-wide: Misc & Hydraulic
    { slug: 'misc-hydraulic', x: col4x, y: row1y, w: 215, h: 325 },

    // Right column: Electric (tall)
    { slug: 'electric', x: col5x, y: row1y, w: 145, h: 370 },

    // Bottom-right area: Fan, Pressurisation
    { slug: 'fan', x: col5x, y: row1y + 370 + GAP, w: 145, h: 85 },
    { slug: 'pressurisation', x: col5x, y: row1y + 370 + GAP + 85 + GAP, w: 145, h: 180 },
  ];

  // Compute viewBox to fit all sections
  let maxX = 0;
  let maxY = 0;
  for (const e of entries) {
    const right = e.x + e.w;
    const bottom = e.y + e.h;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  const vbWidth = maxX + PAD;
  const vbHeight = maxY + PAD;

  return { entries, viewBox: `0 0 ${vbWidth} ${vbHeight}` };
}

const { entries: LAYOUT, viewBox: VIEW_BOX } = computeLayout();

// ─── Section Rectangle Component ────────────────────────────────────
function SectionRect({
  entry,
  section,
  onSelect,
}: {
  entry: LayoutEntry;
  section: PanelSectionSummary | undefined;
  onSelect: (id: string) => void;
}) {
  const { x, y, w, h } = entry;
  const status = section?.buildStatus ?? 'NOT_ONBOARDED';
  const fill = STATUS_FILLS[status] ?? STATUS_FILLS.NOT_ONBOARDED;
  const stroke = STATUS_STROKES[status] ?? STATUS_STROKES.NOT_ONBOARDED;
  const name = section?.name ?? entry.slug;
  const componentCount = section?.componentCount ?? 0;
  const buildProgress = section?.buildProgress ?? 0;

  // Determine text sizing based on rectangle dimensions
  const nameSize = w < 160 && h < 100 ? 10 : 12;
  const badgeSize = 9;
  const barHeight = 4;

  return (
    <g
      className="cursor-pointer group"
      onClick={() => section && onSelect(section.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && section) onSelect(section.id);
      }}
    >
      {/* Hover glow effect */}
      <rect
        x={x - 2}
        y={y - 2}
        width={w + 4}
        height={h + 4}
        rx={8}
        ry={8}
        fill="none"
        stroke="#60a5fa"
        strokeWidth={2}
        opacity={0}
        className="transition-opacity duration-200 group-hover:opacity-60 group-focus:opacity-60"
      />

      {/* Main rectangle */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        ry={6}
        fill={fill}
        fillOpacity={0.15}
        stroke={stroke}
        strokeWidth={1.5}
        className="transition-all duration-200 group-hover:fill-opacity-25"
      />

      {/* Section name */}
      <text
        x={x + w / 2}
        y={y + h / 2 - (componentCount > 0 ? 6 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#e2e8f0"
        fontSize={nameSize}
        fontWeight={600}
        className="pointer-events-none select-none"
      >
        {name}
      </text>

      {/* Component count badge */}
      {componentCount > 0 && (
        <>
          <rect
            x={x + w - 28}
            y={y + 6}
            width={22}
            height={16}
            rx={8}
            fill={fill}
            fillOpacity={0.35}
          />
          <text
            x={x + w - 17}
            y={y + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#e2e8f0"
            fontSize={badgeSize}
            fontWeight={600}
            className="pointer-events-none select-none"
          >
            {componentCount}
          </text>
        </>
      )}

      {/* Build progress bar at bottom */}
      {componentCount > 0 && (
        <>
          <rect
            x={x + 6}
            y={y + h - barHeight - 6}
            width={w - 12}
            height={barHeight}
            rx={2}
            fill="#1e293b"
            fillOpacity={0.5}
          />
          <rect
            x={x + 6}
            y={y + h - barHeight - 6}
            width={Math.max(0, (w - 12) * (buildProgress / 100))}
            height={barHeight}
            rx={2}
            fill={fill}
            fillOpacity={0.7}
          />
        </>
      )}

      {/* Status label below name */}
      {componentCount > 0 && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#94a3b8"
          fontSize={8}
          className="pointer-events-none select-none"
        >
          {buildProgress}% complete
        </text>
      )}
    </g>
  );
}

// ─── Skeleton Section (loading state) ───────────────────────────────
function SkeletonRect({ entry }: { entry: LayoutEntry }) {
  const { x, y, w, h } = entry;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={6}
      ry={6}
      fill="#334155"
      fillOpacity={0.4}
      stroke="#475569"
      strokeWidth={1}
      className="animate-pulse"
    />
  );
}

// ─── Legend Component ────────────────────────────────────────────────
function Legend() {
  const statuses = ['NOT_ONBOARDED', 'PLANNED', 'IN_PROGRESS', 'COMPLETE', 'HAS_ISSUES'];
  return (
    <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
      {statuses.map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm border"
            style={{
              backgroundColor: STATUS_FILLS[status],
              borderColor: STATUS_STROKES[status],
              opacity: 0.6,
            }}
          />
          <span className="text-xs text-slate-400">{STATUS_LABELS[status]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main PanelMap Component ────────────────────────────────────────
interface PanelMapProps {
  sections: PanelSectionSummary[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onSelectSection: (id: string) => void;
}

export function PanelMap({ sections, isLoading, error, onSelectSection }: PanelMapProps) {
  // Build a map from slug to section data for quick lookup
  const sectionsBySlug = new Map<string, PanelSectionSummary>();
  if (sections) {
    for (const s of sections) {
      sectionsBySlug.set(s.slug, s);
    }
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load panel sections: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="w-full rounded-lg border border-slate-700 bg-slate-900 p-4 overflow-hidden">
        <svg
          viewBox={VIEW_BOX}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background grid pattern for blueprint feel */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="#1e293b"
                strokeWidth={0.5}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Title */}
          <text
            x={PAD}
            y={PAD - 10}
            fill="#475569"
            fontSize={11}
            fontWeight={500}
            className="select-none"
          >
            BAe 146 OVERHEAD PANEL
          </text>

          {isLoading
            ? LAYOUT.map((entry) => <SkeletonRect key={entry.slug} entry={entry} />)
            : LAYOUT.map((entry) => (
                <SectionRect
                  key={entry.slug}
                  entry={entry}
                  section={sectionsBySlug.get(entry.slug)}
                  onSelect={onSelectSection}
                />
              ))}
        </svg>
      </div>
      <Legend />
    </div>
  );
}
