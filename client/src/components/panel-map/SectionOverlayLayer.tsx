import { usePanelSectionSummary } from '@/hooks/use-panel-section-summary';
import { SectionOverlay } from './SectionOverlay';

interface SectionOverlayLayerProps {
  visible: boolean;
  onZoomToSection?: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function SectionOverlayLayer({ visible, onZoomToSection }: SectionOverlayLayerProps) {
  const { data: sections } = usePanelSectionSummary();

  if (!visible) return null;

  const calibrated = sections?.filter((s) => s.svgX != null);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {calibrated?.map((section) => (
        <SectionOverlay
          key={section.id}
          section={section}
          onZoomToSection={onZoomToSection}
        />
      ))}
    </div>
  );
}
