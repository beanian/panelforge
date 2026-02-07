import { usePanelSectionSummary } from '@/hooks/use-panel-section-summary';
import { SectionOverlay } from './SectionOverlay';

interface SectionOverlayLayerProps {
  visible: boolean;
  onSectionClick?: (id: string) => void;
}

export function SectionOverlayLayer({ visible, onSectionClick }: SectionOverlayLayerProps) {
  const { data: sections } = usePanelSectionSummary();

  if (!visible) return null;

  const calibrated = sections?.filter((s) => s.svgX != null);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {calibrated?.map((section) => (
        <SectionOverlay
          key={section.id}
          section={section}
          onClick={onSectionClick}
        />
      ))}
    </div>
  );
}
