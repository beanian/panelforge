import { useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type PanelSectionSummary } from '@/hooks/use-panel-section-summary';
import { api } from '@/lib/api';
import { usePercentCoords } from '@/lib/use-percent-coords';
import { usePanZoom } from '@/lib/use-pan-zoom';

interface DragRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface SectionCalibrationCanvasProps {
  sections: PanelSectionSummary[] | undefined;
  selectedSectionId: string | null;
}

export function SectionCalibrationCanvas({ sections, selectedSectionId }: SectionCalibrationCanvasProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  const queryClient = useQueryClient();

  const { scale, containerProps: panZoomContainerProps, style: panZoomStyle, setContainerRef, resetView } = usePanZoom();

  const patchMutation = useMutation({
    mutationFn: (data: { id: string; svgX: number; svgY: number; svgWidth: number; svgHeight: number }) =>
      api.patch(`/panel-sections/${data.id}`, {
        svgX: data.svgX,
        svgY: data.svgY,
        svgWidth: data.svgWidth,
        svgHeight: data.svgHeight,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
      queryClient.invalidateQueries({ queryKey: ['panel-sections', 'summary'] });
      toast.success('Section calibrated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to calibrate: ${err.message}`);
    },
  });

  const toPercent = usePercentCoords(innerRef);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!selectedSectionId) return;
    // Don't start drawing on middle-click (panning) or when space is held
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = toPercent(e.clientX, e.clientY);
    setDragRect({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  }, [selectedSectionId, toPercent]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRect) return;
    const pos = toPercent(e.clientX, e.clientY);
    setDragRect((prev) => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
  }, [dragRect, toPercent]);

  const handleMouseUp = useCallback(() => {
    if (!dragRect || !selectedSectionId) {
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
      id: selectedSectionId,
      svgX: Math.round(x * 100) / 100,
      svgY: Math.round(y * 100) / 100,
      svgWidth: Math.round(w * 100) / 100,
      svgHeight: Math.round(h * 100) / 100,
    });
  }, [dragRect, selectedSectionId, patchMutation]);

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
    <div className="relative">
      {/* Outer container: captures wheel events for zoom, pointer events for pan */}
      <div
        ref={setContainerRef}
        className={`relative rounded-lg border border-slate-700 bg-slate-900 overflow-hidden ${
          selectedSectionId ? 'cursor-crosshair' : ''
        }`}
        {...panZoomContainerProps}
      >
        {/* Inner container: scaled and translated */}
        <div ref={innerRef} style={panZoomStyle}>
          <div
            className="relative"
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

            {/* Already-calibrated sections */}
            <div className="absolute inset-0 pointer-events-none">
              {sections?.filter((s) => s.svgX != null).map((s) => (
                <div
                  key={s.id}
                  className={`absolute rounded-[2px] border ${
                    s.id === selectedSectionId
                      ? 'border-blue-400 bg-blue-400/20'
                      : 'border-emerald-500/40 bg-emerald-500/10'
                  }`}
                  style={{
                    left: `${s.svgX}%`,
                    top: `${s.svgY}%`,
                    width: `${s.svgWidth}%`,
                    height: `${s.svgHeight}%`,
                  }}
                >
                  <span
                    className={`text-[9px] leading-none px-0.5 py-px ${
                      s.id === selectedSectionId ? 'text-blue-200' : 'text-emerald-300/70'
                    }`}
                  >
                    {s.name}
                  </span>
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

            {/* Instruction overlay when no section selected */}
            {!selectedSectionId && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <p className="text-sm text-slate-300 bg-slate-800/90 px-4 py-2 rounded-md">
                  Select a section from the sidebar, then draw a rectangle on the panel
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            className="text-[10px] px-2 py-1 rounded bg-slate-800/90 text-slate-300 border border-slate-600 hover:bg-slate-700"
            onClick={resetView}
          >
            {Math.round(scale * 100)}% — double-click to reset
          </button>
        </div>
      )}
    </div>
  );
}
