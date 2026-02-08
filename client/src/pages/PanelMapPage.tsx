import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useComponentMapData } from '@/hooks/use-component-map-data';
import { PanelMap, type BoundingBox } from '@/components/panel-map/PanelMap';
import { ComponentFlyout } from '@/components/panel-map/ComponentFlyout';
import { SectionFlyout } from '@/components/panel-map/SectionFlyout';
import { AddComponentWizard } from '@/components/panel-map/AddComponentWizard';
import { usePanZoom } from '@/lib/use-pan-zoom';
import { api } from '@/lib/api';
import { usePanelSectionSummary } from '@/hooks/use-panel-section-summary';
import { Button } from '@/components/ui/button';

export default function PanelMapPage() {
  const queryClient = useQueryClient();
  const { data: components, isLoading, error } = useComponentMapData();
  const { data: sectionSummaries } = usePanelSectionSummary();

  // Flyout state
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [componentFlyoutOpen, setComponentFlyoutOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [sectionFlyoutOpen, setSectionFlyoutOpen] = useState(false);

  // Feature state
  const [showSectionOverlays, setShowSectionOverlays] = useState(true);
  const [configureMode, setConfigureMode] = useState(false);
  const [drawingBox, setDrawingBox] = useState(false);
  const [drawnBox, setDrawnBox] = useState<BoundingBox | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [copySource, setCopySource] = useState<{
    name: string;
    componentTypeId: string;
    panelSectionId: string;
    powerRail: string;
    mapWidth: number;
    mapHeight: number;
  } | null>(null);
  const [defaultSectionId, setDefaultSectionId] = useState<string | null>(null);

  // Zoom + Pan
  const { scale, translateX, translateY, containerProps: panZoomContainerProps, style: panZoomStyle, setContainerRef, resetView, zoomToRect } = usePanZoom();
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const zoomedRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // ─── Mutations ──────────────────────────────────────
  const quickStatusMutation = useMutation({
    mutationFn: ({ id, buildStatus }: { id: string; buildStatus: string }) =>
      api.patch(`/component-instances/${id}`, { buildStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-instances', 'map-data'] });
      queryClient.invalidateQueries({ queryKey: ['component-instances'] });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/component-instances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-instances', 'map-data'] });
      queryClient.invalidateQueries({ queryKey: ['component-instances'] });
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
    },
  });

  // ─── Handlers ──────────────────────────────────────
  function handleSelectComponent(id: string) {
    if (configureMode || drawingBox) return;
    setSelectedComponentId(id);
    setComponentFlyoutOpen(true);
  }

  function handleComponentFlyoutChange(open: boolean) {
    setComponentFlyoutOpen(open);
    if (!open) {
      setTimeout(() => setSelectedComponentId(null), 300);
    }
  }

  function handleViewSection(sectionId: string) {
    setComponentFlyoutOpen(false);
    setSelectedSectionId(sectionId);
    setSectionFlyoutOpen(true);
  }

  function handleSectionFlyoutChange(open: boolean) {
    setSectionFlyoutOpen(open);
    if (!open) {
      setTimeout(() => setSelectedSectionId(null), 300);
    }
  }

  const handleAddComponent = useCallback(() => {
    setDrawingBox(true);
    setCopySource(null);
  }, []);

  const handleDrawComplete = useCallback(
    (box: BoundingBox) => {
      setDrawingBox(false);
      setDrawnBox(box);
      setWizardOpen(true);

      // Auto-detect section from box center (fallback for non-copy adds)
      const centerX = box.mapX + box.mapWidth / 2;
      const centerY = box.mapY + box.mapHeight / 2;
      const matched = sectionSummaries?.find(
        (s) =>
          s.svgX != null &&
          s.svgY != null &&
          s.svgWidth != null &&
          s.svgHeight != null &&
          centerX >= s.svgX &&
          centerX <= s.svgX + s.svgWidth &&
          centerY >= s.svgY &&
          centerY <= s.svgY + s.svgHeight,
      );
      setDefaultSectionId(matched?.id ?? null);
    },
    [sectionSummaries],
  );

  const handleWizardCreated = useCallback((id: string) => {
    setSelectedComponentId(id);
    setComponentFlyoutOpen(true);
  }, []);

  const handleToggleConfigureMode = useCallback(() => {
    setConfigureMode((prev) => !prev);
  }, []);

  const handleQuickStatus = useCallback(
    (id: string, status: string) => {
      quickStatusMutation.mutate(
        { id, buildStatus: status },
        {
          onSuccess: () => toast.success('Status updated'),
          onError: (err: Error) => toast.error(`Failed: ${err.message}`),
        },
      );
    },
    [quickStatusMutation],
  );

  const handleDeleteComponent = useCallback(
    (id: string) => {
      if (!window.confirm('Delete this component? This cannot be undone.')) return;
      deleteComponentMutation.mutate(id, {
        onSuccess: () => toast.success('Component deleted'),
        onError: (err: Error) => toast.error(`Failed: ${err.message}`),
      });
    },
    [deleteComponentMutation],
  );

  const handleCopyComponent = useCallback(
    async (sourceId: string) => {
      try {
        const source = await api.get<any>(`/component-instances/${sourceId}`);
        setCopySource({
          name: `${source.name} (copy)`,
          componentTypeId: source.componentType.id,
          panelSectionId: source.panelSection.id,
          powerRail: source.powerRail ?? 'NONE',
          mapWidth: source.mapWidth ?? 3,
          mapHeight: source.mapHeight ?? 3,
        });
        setDrawingBox(true);
        toast.info('Click to place the copied component');
      } catch (err: any) {
        toast.error(`Failed to copy: ${err.message}`);
      }
    },
    [],
  );

  const handleZoomToSection = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      if (!innerRef.current) return;
      const prev = zoomedRectRef.current;
      if (prev && prev.x === rect.x && prev.y === rect.y && prev.width === rect.width && prev.height === rect.height) {
        resetView();
        zoomedRectRef.current = null;
      } else {
        zoomToRect(rect, innerRef.current);
        zoomedRectRef.current = rect;
      }
    },
    [zoomToRect, resetView],
  );

  // ─── Escape key ──────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (drawingBox) {
          setDrawingBox(false);
          setCopySource(null);
        } else if (configureMode) {
          setConfigureMode(false);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawingBox, configureMode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overhead Panel</h1>
          <p className="text-sm text-muted-foreground">
            Right-click to add, copy, or configure components. Ctrl+scroll to zoom, middle-click to pan.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSectionOverlays((prev) => !prev)}
        >
          {showSectionOverlays ? 'Hide Sections' : 'Show Sections'}
        </Button>
      </div>

      {/* Mode banners */}
      {configureMode && (
        <div className="flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
          <span>Configure mode — drag boxes to move, use handles to resize. Press Esc to exit.</span>
          <Button size="sm" variant="outline" onClick={() => setConfigureMode(false)}>
            Done
          </Button>
        </div>
      )}

      {drawingBox && (
        <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          <span>
            {copySource
              ? 'Click to place the copied component.'
              : 'Draw a bounding box for the new component. Click and drag.'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDrawingBox(false);
              setCopySource(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <PanelMap
        components={components}
        isLoading={isLoading}
        error={error}
        onSelectComponent={handleSelectComponent}
        configureMode={configureMode}
        drawingBox={drawingBox}
        placementSize={copySource ? { width: copySource.mapWidth, height: copySource.mapHeight } : undefined}
        onAddComponent={handleAddComponent}
        onCopyComponent={handleCopyComponent}
        onDeleteComponent={handleDeleteComponent}
        onQuickStatus={handleQuickStatus}
        onToggleConfigureMode={handleToggleConfigureMode}
        onDrawComplete={handleDrawComplete}
        showSectionOverlays={showSectionOverlays}
        onSectionClick={handleViewSection}
        onZoomToSection={handleZoomToSection}
        panZoomStyle={panZoomStyle}
        panZoomContainerProps={panZoomContainerProps}
        scale={scale}
        innerRef={innerRef}
        outerContainerRef={outerContainerRef}
        setZoomContainerRef={setContainerRef}
      />

      {scale > 1 && (
        <div className="flex justify-end mt-1">
          <Button size="sm" variant="outline" onClick={resetView}>
            Reset View
          </Button>
        </div>
      )}

      {/* Add Component Wizard */}
      {drawnBox && (
        <AddComponentWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) {
              setDrawnBox(null);
              setDefaultSectionId(null);
              setCopySource(null);
            }
          }}
          boundingBox={drawnBox}
          defaultPanelSectionId={defaultSectionId ?? undefined}
          defaults={copySource ? {
            name: copySource.name,
            componentTypeId: copySource.componentTypeId,
            panelSectionId: copySource.panelSectionId,
            powerRail: copySource.powerRail,
          } : undefined}
          onCreated={handleWizardCreated}
        />
      )}

      <ComponentFlyout
        componentId={selectedComponentId}
        open={componentFlyoutOpen}
        onOpenChange={handleComponentFlyoutChange}
        onViewSection={handleViewSection}
      />

      <SectionFlyout
        sectionId={selectedSectionId}
        open={sectionFlyoutOpen}
        onOpenChange={handleSectionFlyoutChange}
      />
    </div>
  );
}
