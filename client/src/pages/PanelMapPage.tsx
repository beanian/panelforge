import { useState } from 'react';
import { usePanelSectionSummary } from '@/hooks/use-panel-section-summary';
import { PanelMap } from '@/components/panel-map/PanelMap';
import { SectionFlyout } from '@/components/panel-map/SectionFlyout';

export default function PanelMapPage() {
  const { data: sections, isLoading, error } = usePanelSectionSummary();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  function handleSelectSection(id: string) {
    setSelectedSectionId(id);
    setFlyoutOpen(true);
  }

  function handleFlyoutChange(open: boolean) {
    setFlyoutOpen(open);
    if (!open) {
      // Clear after close animation finishes
      setTimeout(() => setSelectedSectionId(null), 300);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overhead Panel</h1>
        <p className="text-sm text-muted-foreground">
          Click a section to view components and build status.
        </p>
      </div>

      <PanelMap
        sections={sections}
        isLoading={isLoading}
        error={error}
        onSelectSection={handleSelectSection}
      />

      <SectionFlyout
        sectionId={selectedSectionId}
        open={flyoutOpen}
        onOpenChange={handleFlyoutChange}
      />
    </div>
  );
}
