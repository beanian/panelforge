import { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, Cable, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { usePanelSections } from '@/hooks/use-panel-sections';
import { useWiringDiagram } from '@/hooks/use-wiring-diagram';
import { WiringDiagram } from '@/components/wiring-diagram/WiringDiagram';

// ─── Wiring status legend items ─────────────────────────────────────

const LEGEND_ITEMS = [
  { status: 'UNASSIGNED', label: 'Unassigned', color: '#6b7280', dashed: true },
  { status: 'PLANNED', label: 'Planned', color: '#64748b', dashed: true },
  { status: 'WIRED', label: 'Wired', color: '#f59e0b', dashed: false },
  { status: 'TESTED', label: 'Tested', color: '#3b82f6', dashed: false },
  { status: 'COMPLETE', label: 'Complete', color: '#22c55e', dashed: false },
];

const RAIL_LEGEND = [
  { rail: 'FIVE_V', label: '5V', color: '#22c55e' },
  { rail: 'NINE_V', label: '9V', color: '#3b82f6' },
  { rail: 'TWENTY_SEVEN_V', label: '27V', color: '#f59e0b' },
];

// ─── Pan / Zoom container ───────────────────────────────────────────

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.15;

function PanZoomContainer({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // left click only
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: translate.x,
        ty: translate.y,
      };
    },
    [translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setTranslate({
        x: panStart.current.tx + dx,
        y: panStart.current.ty + dy,
      });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Also handle mouse leaving container
  useEffect(() => {
    const handleGlobalUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev - ZOOM_STEP));
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  return (
    <div className="relative flex-1 min-h-0">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border bg-background/80 backdrop-blur-sm p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          className="h-7 w-7 p-0"
          title="Zoom in"
        >
          <ZoomIn className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          className="h-7 w-7 p-0"
          title="Zoom out"
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetView}
          className="h-7 w-7 p-0"
          title="Reset view"
        >
          <Maximize className="size-4" />
        </Button>
      </div>

      {/* Pan/zoom area */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Legend Component ────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-6 px-1">
      {/* Wiring status legend */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Wiring Status:
        </span>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <svg width="24" height="10" className="shrink-0">
              <line
                x1={0}
                y1={5}
                x2={24}
                y2={5}
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.dashed ? '4 3' : undefined}
              />
            </svg>
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
      {/* Power rail legend */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Power Rails:
        </span>
        {RAIL_LEGEND.map((item) => (
          <div key={item.rail} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{
                backgroundColor: item.color,
                borderColor: item.color,
                opacity: 0.6,
              }}
            />
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex-1 min-h-0 rounded-lg border border-slate-700 bg-slate-900 p-8 space-y-6">
      {/* Column header skeletons */}
      <div className="flex justify-between px-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-8 px-4">
          <Skeleton className="h-12 w-52 rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty States ───────────────────────────────────────────────────

function EmptySelectState() {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900/50">
      <div className="text-center space-y-3">
        <Cable className="mx-auto size-12 text-muted-foreground/40" />
        <div>
          <h3 className="font-semibold text-slate-300">Select a Panel Section</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a section from the dropdown above to view its wiring diagram.
          </p>
        </div>
      </div>
    </div>
  );
}

function NoDataState() {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900/50">
      <div className="text-center space-y-3">
        <Cable className="mx-auto size-10 text-muted-foreground/40" />
        <div>
          <h3 className="font-semibold text-slate-300">No Wiring Data</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This section has no components or pin assignments yet.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────

export default function WiringDiagramPage() {
  const [sectionId, setSectionId] = useState<string | null>(null);

  const { data: sections, isLoading: sectionsLoading } = usePanelSections();
  const { data: wiringData, isLoading: wiringLoading, error: wiringError } = useWiringDiagram(sectionId);

  const hasComponents = wiringData && wiringData.components.length > 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Page header & section selector */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wiring Diagram</h1>
          <p className="text-sm text-muted-foreground">
            Signal path visualization from components through Arduino pins, MOSFET channels, and power rails.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground">Section:</span>
          <Select
            value={sectionId ?? undefined}
            onValueChange={(val) => setSectionId(val)}
            disabled={sectionsLoading}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={sectionsLoading ? 'Loading...' : 'Select a section'} />
            </SelectTrigger>
            <SelectContent>
              {sections?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {wiringError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          Failed to load wiring diagram: {wiringError.message}
        </div>
      )}

      {/* Diagram area */}
      {!sectionId && <EmptySelectState />}

      {sectionId && wiringLoading && <LoadingSkeleton />}

      {sectionId && !wiringLoading && !wiringError && !hasComponents && <NoDataState />}

      {sectionId && !wiringLoading && !wiringError && hasComponents && wiringData && (
        <PanZoomContainer>
          <WiringDiagram data={wiringData} />
        </PanZoomContainer>
      )}

      {/* Legend */}
      <Legend />
    </div>
  );
}
