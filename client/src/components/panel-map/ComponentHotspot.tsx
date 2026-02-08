import { type RefObject } from 'react';
import { type MapComponent } from '@/hooks/use-component-map-data';
import { ComponentTooltip } from './ComponentTooltip';
import { EditableHotspot } from './EditableHotspot';

const STATUS_HOVER_COLORS: Record<string, { border: string; bg: string }> = {
  NOT_ONBOARDED: { border: 'rgba(156,163,175,0.5)', bg: 'rgba(156,163,175,0.1)' },
  PLANNED:       { border: 'rgba(148,163,184,0.5)', bg: 'rgba(148,163,184,0.1)' },
  IN_PROGRESS:   { border: 'rgba(251,191,36,0.5)',  bg: 'rgba(251,191,36,0.1)' },
  COMPLETE:      { border: 'rgba(34,197,94,0.5)',   bg: 'rgba(34,197,94,0.1)' },
  HAS_ISSUES:    { border: 'rgba(239,68,68,0.5)',   bg: 'rgba(239,68,68,0.1)' },
};

const DEFAULT_HOVER = { border: 'rgba(96,165,250,0.5)', bg: 'rgba(96,165,250,0.1)' };

interface ComponentHotspotProps {
  component: MapComponent;
  onClick: (id: string) => void;
  configureMode?: boolean;
  containerRef?: RefObject<HTMLDivElement | null>;
}

export function ComponentHotspot({ component, onClick, configureMode, containerRef }: ComponentHotspotProps) {
  if (configureMode && containerRef) {
    return <EditableHotspot component={component} containerRef={containerRef} />;
  }

  const showAbove = component.mapY > 15;
  const colors = STATUS_HOVER_COLORS[component.buildStatus] ?? DEFAULT_HOVER;

  return (
    <div
      data-component-id={component.id}
      className="group absolute cursor-pointer pointer-events-auto border border-transparent rounded-[2px] transition-colors duration-100"
      style={{
        left: `${component.mapX}%`,
        top: `${component.mapY}%`,
        width: `${component.mapWidth}%`,
        height: `${component.mapHeight}%`,
        zIndex: Math.round(100 - component.mapY),
        '--hover-border': colors.border,
        '--hover-bg': colors.bg,
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.backgroundColor = colors.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      onClick={() => onClick(component.id)}
    >
      {/* Tooltip */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 ${
          showAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        }`}
      >
        <ComponentTooltip component={component} />
      </div>
    </div>
  );
}
