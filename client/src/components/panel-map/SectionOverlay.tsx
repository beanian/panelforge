import { type PanelSectionSummary } from '@/hooks/use-panel-section-summary';

const STATUS_STYLES: Record<string, { fill: string; border: string }> = {
  NOT_ONBOARDED: { fill: 'bg-gray-400/[0.06]', border: 'border-gray-400/20' },
  PLANNED: { fill: 'bg-slate-400/[0.06]', border: 'border-slate-400/20' },
  IN_PROGRESS: { fill: 'bg-amber-400/[0.06]', border: 'border-amber-400/20' },
  COMPLETE: { fill: 'bg-green-400/[0.06]', border: 'border-green-400/20' },
  HAS_ISSUES: { fill: 'bg-red-400/[0.08]', border: 'border-red-400/25' },
};

const PROGRESS_COLORS: Record<string, string> = {
  NOT_ONBOARDED: 'bg-gray-400/40',
  PLANNED: 'bg-slate-400/40',
  IN_PROGRESS: 'bg-amber-400/50',
  COMPLETE: 'bg-green-500/60',
  HAS_ISSUES: 'bg-red-400/50',
};

interface SectionOverlayProps {
  section: PanelSectionSummary;
  onZoomToSection?: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function SectionOverlay({ section, onZoomToSection }: SectionOverlayProps) {
  const isEmpty = section.componentCount === 0;
  const style = isEmpty
    ? { fill: 'bg-gray-900/40', border: 'border-gray-600/30' }
    : (STATUS_STYLES[section.buildStatus] ?? STATUS_STYLES.NOT_ONBOARDED);
  const progressColor = PROGRESS_COLORS[section.buildStatus] ?? PROGRESS_COLORS.NOT_ONBOARDED;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (section.svgX != null && section.svgY != null && section.svgWidth != null && section.svgHeight != null) {
      onZoomToSection?.({ x: section.svgX, y: section.svgY, width: section.svgWidth, height: section.svgHeight });
    }
  }

  return (
    <div
      className={`absolute border border-dashed rounded-[2px] pointer-events-none transition-all duration-150 ${style.fill} ${style.border}`}
      style={{
        left: `${section.svgX}%`,
        top: `${section.svgY}%`,
        width: `${section.svgWidth}%`,
        height: `${section.svgHeight}%`,
      }}
    >
      {/* Section name label — clickable, sits above component hotspots */}
      <span
        className={`absolute top-0.5 left-0.5 text-[9px] leading-none backdrop-blur-sm px-1 py-0.5 rounded transition-colors whitespace-nowrap pointer-events-auto cursor-zoom-in ${
          isEmpty
            ? 'bg-slate-800/40 text-slate-500/60 hover:text-slate-400'
            : 'bg-slate-800/60 text-slate-300/70 hover:text-slate-200'
        }`}
        onClick={handleClick}
      >
        {section.name}
      </span>

      {/* Progress bar along bottom edge */}
      {section.buildProgress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px]">
          <div
            className={`h-full ${progressColor} rounded-b-[2px]`}
            style={{ width: `${section.buildProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
