import { type RefObject } from 'react';
import { type MapComponent } from '@/hooks/use-component-map-data';
import { ComponentTooltip } from './ComponentTooltip';
import { EditableHotspot } from './EditableHotspot';

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

  return (
    <div
      data-component-id={component.id}
      className="group absolute cursor-pointer border border-transparent rounded-[2px] hover:border-blue-400/50 hover:bg-blue-400/10 transition-colors duration-100"
      style={{
        left: `${component.mapX}%`,
        top: `${component.mapY}%`,
        width: `${component.mapWidth}%`,
        height: `${component.mapHeight}%`,
      }}
      onClick={() => onClick(component.id)}
    >
      {/* Tooltip */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-100 ${
          showAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        }`}
      >
        <ComponentTooltip component={component} />
      </div>
    </div>
  );
}
