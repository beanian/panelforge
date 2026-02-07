import { useState } from 'react';
import { useComponentMapData } from '@/hooks/use-component-map-data';
import { ComponentPicker } from '@/components/calibration/ComponentPicker';
import { CalibrationCanvas } from '@/components/calibration/CalibrationCanvas';

export default function CalibrationToolPage() {
  const { data: mappedComponents } = useComponentMapData();
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calibrate Map</h1>
        <p className="text-sm text-muted-foreground">
          Select a component, then click and drag on the panel image to define its hotspot region.
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar: component picker */}
        <div className="w-72 shrink-0 border border-slate-700 rounded-lg bg-slate-900 overflow-hidden flex flex-col">
          <ComponentPicker
            selectedId={selectedComponentId}
            onSelect={setSelectedComponentId}
          />
        </div>

        {/* Main: calibration canvas */}
        <div className="flex-1 overflow-auto">
          <CalibrationCanvas
            mappedComponents={mappedComponents}
            selectedComponentId={selectedComponentId}
            onMapped={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
