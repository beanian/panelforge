import { useRef, useState, useCallback, type RefObject } from 'react';
import { Plus, Copy, Trash2, Settings2, Activity } from 'lucide-react';
import { type MapComponent } from '@/hooks/use-component-map-data';
import { usePercentCoords } from '@/lib/use-percent-coords';
import { ComponentHotspot } from './ComponentHotspot';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuCheckboxItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';

// ─── Status color mapping for the legend ─────────────────────────────
const STATUS_FILLS: Record<string, string> = {
  NOT_ONBOARDED: '#d1d5db',
  PLANNED: '#94a3b8',
  IN_PROGRESS: '#fbbf24',
  COMPLETE: '#22c55e',
  HAS_ISSUES: '#ef4444',
};

const STATUS_STROKES: Record<string, string> = {
  NOT_ONBOARDED: '#9ca3af',
  PLANNED: '#64748b',
  IN_PROGRESS: '#f59e0b',
  COMPLETE: '#16a34a',
  HAS_ISSUES: '#dc2626',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_ONBOARDED: 'Not Onboarded',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  HAS_ISSUES: 'Has Issues',
};

const QUICK_STATUSES = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'HAS_ISSUES', label: 'Has Issues' },
];

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

// ─── Drag rectangle types ────────────────────────────────────────────
interface DragRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface BoundingBox {
  mapX: number;
  mapY: number;
  mapWidth: number;
  mapHeight: number;
}

// ─── Main PanelMap Component ────────────────────────────────────────
interface PanelMapProps {
  components: MapComponent[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onSelectComponent: (id: string) => void;
  configureMode: boolean;
  drawingBox: boolean;
  onAddComponent: () => void;
  onCopyComponent: (sourceId: string) => void;
  onDeleteComponent: (id: string) => void;
  onQuickStatus: (id: string, status: string) => void;
  onToggleConfigureMode: () => void;
  onDrawComplete: (box: BoundingBox) => void;
  // Zoom + pan
  panZoomStyle?: React.CSSProperties;
  panZoomContainerProps?: Record<string, any>;
  scale?: number;
  outerContainerRef?: React.RefObject<HTMLDivElement | null>;
  setZoomContainerRef?: (el: HTMLElement | null) => void;
}

export function PanelMap({
  components,
  isLoading,
  error,
  onSelectComponent,
  configureMode,
  drawingBox,
  onAddComponent,
  onCopyComponent,
  onDeleteComponent,
  onQuickStatus,
  onToggleConfigureMode,
  onDrawComplete,
  panZoomStyle,
  panZoomContainerProps,
  scale = 1,
  outerContainerRef,
  setZoomContainerRef,
}: PanelMapProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const [rightClickComponentId, setRightClickComponentId] = useState<string | null>(null);
  const rightClickIdRef = useRef<string | null>(null);

  const toPercent = usePercentCoords(innerRef);

  // ─── Drawing mode handlers ──────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!drawingBox) return;
      if (e.button !== 0) return; // left click only
      e.preventDefault();
      e.stopPropagation();
      const pos = toPercent(e.clientX, e.clientY);
      setDragRect({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
    },
    [drawingBox, toPercent],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRect) return;
      const pos = toPercent(e.clientX, e.clientY);
      setDragRect((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null));
    },
    [dragRect, toPercent],
  );

  const handleMouseUp = useCallback(() => {
    if (!dragRect) return;

    const x = Math.min(dragRect.startX, dragRect.currentX);
    const y = Math.min(dragRect.startY, dragRect.currentY);
    const w = Math.abs(dragRect.currentX - dragRect.startX);
    const h = Math.abs(dragRect.currentY - dragRect.startY);

    setDragRect(null);

    if (w < 0.5 || h < 0.5) return;

    onDrawComplete({
      mapX: Math.round(x * 100) / 100,
      mapY: Math.round(y * 100) / 100,
      mapWidth: Math.round(w * 100) / 100,
      mapHeight: Math.round(h * 100) / 100,
    });
  }, [dragRect, onDrawComplete]);

  // Drag rectangle style
  const dragStyle = dragRect
    ? {
        left: `${Math.min(dragRect.startX, dragRect.currentX)}%`,
        top: `${Math.min(dragRect.startY, dragRect.currentY)}%`,
        width: `${Math.abs(dragRect.currentX - dragRect.startX)}%`,
        height: `${Math.abs(dragRect.currentY - dragRect.startY)}%`,
      }
    : undefined;

  // ─── Context menu: detect which component was right-clicked ──────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (drawingBox) {
        e.preventDefault();
        return;
      }
      // Check if we right-clicked on a hotspot by looking at the target's data attribute
      const hotspotEl = (e.target as HTMLElement).closest('[data-component-id]');
      const id = hotspotEl ? (hotspotEl as HTMLElement).dataset.componentId ?? null : null;
      rightClickIdRef.current = id;
      setRightClickComponentId(id);
    },
    [drawingBox],
  );

  const clickedComponent = components?.find((c) => c.id === rightClickComponentId);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load panel map: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ContextMenu>
        <ContextMenuTrigger disabled={drawingBox} asChild>
          <div
            ref={(el) => {
              // Wire up both the outer ref and the zoom container ref
              if (outerContainerRef) (outerContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              setZoomContainerRef?.(el);
            }}
            className="relative w-full max-h-[calc(100vh-14rem)] rounded-lg border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center"
            onContextMenu={handleContextMenu}
            {...panZoomContainerProps}
          >
            {/* Inner container for zoom/pan transforms */}
            <div
              ref={innerRef}
              className={`relative origin-top-left w-fit ${drawingBox ? 'cursor-crosshair' : ''}`}
              style={panZoomStyle}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setDragRect(null)}
            >
              {/* Background PNG */}
              <img
                src="/overhead-panel.png"
                alt="BAe 146 Overhead Panel"
                className="block max-w-full max-h-[calc(100vh-14rem)] w-auto h-auto"
                draggable={false}
              />

              {/* Hotspot overlay container */}
              <div className="absolute inset-0">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-sm text-slate-400 animate-pulse">Loading components...</div>
                  </div>
                ) : (
                  components?.map((c) => (
                    <ComponentHotspot
                      key={c.id}
                      component={c}
                      onClick={onSelectComponent}
                      configureMode={configureMode}
                      containerRef={innerRef}
                    />
                  ))
                )}
              </div>

              {/* Drag rectangle */}
              {dragStyle && (
                <div
                  className="absolute border-2 border-dashed border-blue-400 bg-blue-400/10 pointer-events-none z-20"
                  style={dragStyle}
                />
              )}
            </div>

            {/* Zoom indicator */}
            {scale > 1 && (
              <div className="absolute top-2 right-2 z-30 rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300 font-mono backdrop-blur-sm">
                {scale.toFixed(1)}x
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52">
          {clickedComponent ? (
            <>
              {/* Quick Status submenu */}
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Activity className="size-4" />
                  Quick Status
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {QUICK_STATUSES.map((s) => (
                    <ContextMenuItem
                      key={s.value}
                      onClick={() => onQuickStatus(clickedComponent.id, s.value)}
                    >
                      {clickedComponent.buildStatus === s.value && (
                        <span className="mr-1">&#x2713;</span>
                      )}
                      {s.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>

              <ContextMenuItem onClick={() => onCopyComponent(clickedComponent.id)}>
                <Copy className="size-4" />
                Copy Component
              </ContextMenuItem>

              <ContextMenuItem
                variant="destructive"
                onClick={() => onDeleteComponent(clickedComponent.id)}
              >
                <Trash2 className="size-4" />
                Delete Component
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={onAddComponent}>
                <Plus className="size-4" />
                Add New Component
              </ContextMenuItem>

              <ContextMenuSeparator />

              <ContextMenuCheckboxItem
                checked={configureMode}
                onCheckedChange={onToggleConfigureMode}
              >
                <Settings2 className="size-4" />
                Configure Bounding Boxes
              </ContextMenuCheckboxItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Legend />
    </div>
  );
}
