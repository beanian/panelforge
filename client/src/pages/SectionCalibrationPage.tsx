import { useState } from 'react';
import { usePanelSectionSummary } from '@/hooks/use-panel-section-summary';
import { SectionPicker } from '@/components/calibration/SectionPicker';
import { SectionCalibrationCanvas } from '@/components/calibration/SectionCalibrationCanvas';

export default function SectionCalibrationPage() {
  const { data: sections } = usePanelSectionSummary();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calibrate Sections</h1>
        <p className="text-sm text-muted-foreground">
          Select a section, then click and drag on the panel image to define its boundary.
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar: section picker */}
        <div className="w-72 shrink-0 border border-slate-700 rounded-lg bg-slate-900 overflow-hidden flex flex-col">
          <SectionPicker
            sections={sections}
            selectedId={selectedSectionId}
            onSelect={setSelectedSectionId}
          />
        </div>

        {/* Main: calibration canvas */}
        <div className="flex-1 overflow-hidden">
          <SectionCalibrationCanvas
            sections={sections}
            selectedSectionId={selectedSectionId}
          />
        </div>
      </div>
    </div>
  );
}
