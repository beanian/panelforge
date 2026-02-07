import { useState, useCallback, useRef, type RefObject } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type MapComponent } from '@/hooks/use-component-map-data';
import { api } from '@/lib/api';

const STATUS_BORDER_COLORS: Record<string, string> = {
  NOT_ONBOARDED: 'border-gray-400',
  PLANNED: 'border-slate-400',
  IN_PROGRESS: 'border-amber-400',
  COMPLETE: 'border-green-500',
  HAS_ISSUES: 'border-red-500',
};

type HandleDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSORS: Record<HandleDirection, string> = {
  nw: 'cursor-nw-resize',
  n: 'cursor-n-resize',
  ne: 'cursor-ne-resize',
  e: 'cursor-e-resize',
  se: 'cursor-se-resize',
  s: 'cursor-s-resize',
  sw: 'cursor-sw-resize',
  w: 'cursor-w-resize',
};

const HANDLE_POSITIONS: Record<HandleDirection, string> = {
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
  e: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
  w: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
};

const MIN_SIZE = 0.5;

interface EditableHotspotProps {
  component: MapComponent;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function EditableHotspot({ component, containerRef }: EditableHotspotProps) {
  const queryClient = useQueryClient();
  const [localBox, setLocalBox] = useState({
    x: component.mapX,
    y: component.mapY,
    w: component.mapWidth,
    h: component.mapHeight,
  });
  const draggingRef = useRef<{
    type: 'move' | HandleDirection;
    startClientX: number;
    startClientY: number;
    startBox: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const patchMutation = useMutation({
    mutationFn: (data: { mapX: number; mapY: number; mapWidth: number; mapHeight: number }) =>
      api.patch(`/component-instances/${component.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-instances', 'map-data'] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update position: ${err.message}`);
      // Revert to server state
      setLocalBox({ x: component.mapX, y: component.mapY, w: component.mapWidth, h: component.mapHeight });
    },
  });

  const toPercentDelta = useCallback(
    (dx: number, dy: number) => {
      if (!containerRef.current) return { dx: 0, dy: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        dx: (dx / rect.width) * 100,
        dy: (dy / rect.height) * 100,
      };
    },
    [containerRef],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, type: 'move' | HandleDirection) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      draggingRef.current = {
        type,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startBox: { ...localBox },
      };
    },
    [localBox],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const { type, startClientX, startClientY, startBox } = draggingRef.current;
      const delta = toPercentDelta(e.clientX - startClientX, e.clientY - startClientY);

      if (type === 'move') {
        setLocalBox({
          x: Math.max(0, Math.min(100 - startBox.w, startBox.x + delta.dx)),
          y: Math.max(0, Math.min(100 - startBox.h, startBox.y + delta.dy)),
          w: startBox.w,
          h: startBox.h,
        });
        return;
      }

      // Resize logic per handle direction
      let { x, y, w, h } = startBox;

      if (type.includes('w')) {
        const newX = Math.max(0, x + delta.dx);
        const maxDx = w - MIN_SIZE;
        w = w - Math.min(delta.dx, maxDx);
        x = Math.min(newX, x + maxDx);
      }
      if (type.includes('e')) {
        w = Math.max(MIN_SIZE, w + delta.dx);
      }
      if (type.includes('n')) {
        const newY = Math.max(0, y + delta.dy);
        const maxDy = h - MIN_SIZE;
        h = h - Math.min(delta.dy, maxDy);
        y = Math.min(newY, y + maxDy);
      }
      if (type.includes('s')) {
        h = Math.max(MIN_SIZE, h + delta.dy);
      }

      // Clamp to 100%
      if (x + w > 100) w = 100 - x;
      if (y + h > 100) h = 100 - y;

      setLocalBox({ x, y, w, h });
    },
    [toPercentDelta],
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = null;
    patchMutation.mutate({
      mapX: Math.round(localBox.x * 100) / 100,
      mapY: Math.round(localBox.y * 100) / 100,
      mapWidth: Math.round(localBox.w * 100) / 100,
      mapHeight: Math.round(localBox.h * 100) / 100,
    });
  }, [localBox, patchMutation]);

  const borderClass = STATUS_BORDER_COLORS[component.buildStatus] ?? 'border-gray-400';

  return (
    <div
      data-component-id={component.id}
      className={`absolute pointer-events-auto border-2 ${borderClass} rounded-[2px] cursor-move select-none`}
      style={{
        left: `${localBox.x}%`,
        top: `${localBox.y}%`,
        width: `${localBox.w}%`,
        height: `${localBox.h}%`,
        zIndex: Math.round(100 - localBox.y),
      }}
      onPointerDown={(e) => handlePointerDown(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Name label */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <span className="text-[7px] text-white/80 truncate px-0.5 leading-none drop-shadow-sm">
          {component.name}
        </span>
      </div>

      {/* Resize handles */}
      {(Object.keys(HANDLE_POSITIONS) as HandleDirection[]).map((dir) => (
        <div
          key={dir}
          className={`absolute z-10 w-2 h-2 rounded-full bg-white border border-blue-500 ${HANDLE_POSITIONS[dir]} ${HANDLE_CURSORS[dir]}`}
          onPointerDown={(e) => handlePointerDown(e, dir)}
        />
      ))}
    </div>
  );
}
