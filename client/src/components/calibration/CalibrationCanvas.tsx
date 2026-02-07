import { useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type MapComponent } from '@/hooks/use-component-map-data';
import { api } from '@/lib/api';
import { usePercentCoords } from '@/lib/use-percent-coords';

interface DragRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface CalibrationCanvasProps {
  mappedComponents: MapComponent[] | undefined;
  selectedComponentId: string | null;
  onMapped: () => void;
}

export function CalibrationCanvas({ mappedComponents, selectedComponentId, onMapped }: CalibrationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const queryClient = useQueryClient();

  const patchMutation = useMutation({
    mutationFn: (data: { id: string; mapX: number; mapY: number; mapWidth: number; mapHeight: number }) =>
      api.patch(`/component-instances/${data.id}`, {
        mapX: data.mapX,
        mapY: data.mapY,
        mapWidth: data.mapWidth,
        mapHeight: data.mapHeight,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-instances'] });
      queryClient.invalidateQueries({ queryKey: ['component-instances', 'map-data'] });
      toast.success('Component mapped');
      onMapped();
    },
    onError: (err: Error) => {
      toast.error(`Failed to map: ${err.message}`);
    },
  });

  const toPercent = usePercentCoords(containerRef);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!selectedComponentId) return;
    e.preventDefault();
    const pos = toPercent(e.clientX, e.clientY);
    setDragRect({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  }, [selectedComponentId, toPercent]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRect) return;
    const pos = toPercent(e.clientX, e.clientY);
    setDragRect((prev) => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
  }, [dragRect, toPercent]);

  const handleMouseUp = useCallback(() => {
    if (!dragRect || !selectedComponentId) {
      setDragRect(null);
      return;
    }

    const x = Math.min(dragRect.startX, dragRect.currentX);
    const y = Math.min(dragRect.startY, dragRect.currentY);
    const w = Math.abs(dragRect.currentX - dragRect.startX);
    const h = Math.abs(dragRect.currentY - dragRect.startY);

    setDragRect(null);

    // Ignore tiny drags (accidental clicks)
    if (w < 0.5 || h < 0.5) return;

    patchMutation.mutate({
      id: selectedComponentId,
      mapX: Math.round(x * 100) / 100,
      mapY: Math.round(y * 100) / 100,
      mapWidth: Math.round(w * 100) / 100,
      mapHeight: Math.round(h * 100) / 100,
    });
  }, [dragRect, selectedComponentId, patchMutation]);

  // Compute drag rectangle style
  const dragStyle = dragRect
    ? {
        left: `${Math.min(dragRect.startX, dragRect.currentX)}%`,
        top: `${Math.min(dragRect.startY, dragRect.currentY)}%`,
        width: `${Math.abs(dragRect.currentX - dragRect.startX)}%`,
        height: `${Math.abs(dragRect.currentY - dragRect.startY)}%`,
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg border border-slate-700 bg-slate-900 overflow-hidden ${
        selectedComponentId ? 'cursor-crosshair' : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setDragRect(null)}
    >
      <img
        src="/overhead-panel.png"
        alt="BAe 146 Overhead Panel"
        className="block w-full h-auto select-none"
        draggable={false}
      />

      {/* Already-mapped components */}
      <div className="absolute inset-0 pointer-events-none">
        {mappedComponents?.map((c) => (
          <div
            key={c.id}
            className={`absolute rounded-[2px] border text-[8px] leading-none flex items-center justify-center overflow-hidden ${
              c.id === selectedComponentId
                ? 'border-blue-400 bg-blue-400/20 text-blue-200'
                : 'border-green-500/40 bg-green-500/10 text-green-300/70'
            }`}
            style={{
              left: `${c.mapX}%`,
              top: `${c.mapY}%`,
              width: `${c.mapWidth}%`,
              height: `${c.mapHeight}%`,
            }}
          >
            <span className="truncate px-0.5">{c.name}</span>
          </div>
        ))}
      </div>

      {/* Drag rectangle */}
      {dragStyle && (
        <div
          className="absolute border-2 border-dashed border-blue-400 bg-blue-400/10 pointer-events-none"
          style={dragStyle}
        />
      )}

      {/* Instruction overlay when no component selected */}
      {!selectedComponentId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <p className="text-sm text-slate-300 bg-slate-800/90 px-4 py-2 rounded-md">
            Select a component from the sidebar, then draw a rectangle on the panel
          </p>
        </div>
      )}
    </div>
  );
}
