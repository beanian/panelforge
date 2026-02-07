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
import { Button } from '@/components/ui/button';

export default function PanelMapPage() {
  const queryClient = useQueryClient();
  const { data: components, isLoading, error } = useComponentMapData();

  // Flyout state
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [componentFlyoutOpen, setComponentFlyoutOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [sectionFlyoutOpen, setSectionFlyoutOpen] = useState(false);

  // Feature state
  const [configureMode, setConfigureMode] = useState(false);
  const [drawingBox, setDrawingBox] = useState(false);
  const [drawnBox, setDrawnBox] = useState<BoundingBox | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);

  // Zoom + Pan
  const { scale, translateX, translateY, containerProps: panZoomContainerProps, style: panZoomStyle, setContainerRef, resetView } = usePanZoom();
  const outerContainerRef = useRef<HTMLDivElement>(null);

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
    setCopySourceId(null);
  }, []);

  const handleDrawComplete = useCallback(
    async (box: BoundingBox) => {
      setDrawingBox(false);

      if (copySourceId) {
        // Copy flow: PATCH coords onto the copy and open flyout
        try {
          await api.patch(`/component-instances/${copySourceId}`, {
            mapX: box.mapX,
            mapY: box.mapY,
            mapWidth: box.mapWidth,
            mapHeight: box.mapHeight,
          });
          queryClient.invalidateQueries({ queryKey: ['component-instances', 'map-data'] });
          queryClient.invalidateQueries({ queryKey: ['component-instances'] });
          toast.success('Component copied');
          setSelectedComponentId(copySourceId);
          setComponentFlyoutOpen(true);
        } catch (err: any) {
          toast.error(`Failed to place copy: ${err.message}`);
        }
        setCopySourceId(null);
        return;
      }

      // Normal add flow: open wizard
      setDrawnBox(box);
      setWizardOpen(true);
    },
    [copySourceId, queryClient],
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
        const copy = await api.post<any>('/component-instances', {
          name: `${source.name} (copy)`,
          componentTypeId: source.componentType.id,
          panelSectionId: source.panelSection.id,
          powerRail: source.powerRail ?? undefined,
        });
        setCopySourceId(copy.id);
        setDrawingBox(true);
        toast.info('Draw a bounding box for the copy');
      } catch (err: any) {
        toast.error(`Failed to copy: ${err.message}`);
      }
    },
    [],
  );

  // ─── Escape key ──────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (drawingBox) {
          setDrawingBox(false);
          setCopySourceId(null);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overhead Panel</h1>
        <p className="text-sm text-muted-foreground">
          Right-click to add, copy, or configure components. Ctrl+scroll to zoom, middle-click to pan.
        </p>
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
            {copySourceId
              ? 'Draw a bounding box for the copied component. Click and drag.'
              : 'Draw a bounding box for the new component. Click and drag.'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDrawingBox(false);
              setCopySourceId(null);
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
        onAddComponent={handleAddComponent}
        onCopyComponent={handleCopyComponent}
        onDeleteComponent={handleDeleteComponent}
        onQuickStatus={handleQuickStatus}
        onToggleConfigureMode={handleToggleConfigureMode}
        onDrawComplete={handleDrawComplete}
        panZoomStyle={panZoomStyle}
        panZoomContainerProps={panZoomContainerProps}
        scale={scale}
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
            if (!open) setDrawnBox(null);
          }}
          boundingBox={drawnBox}
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
