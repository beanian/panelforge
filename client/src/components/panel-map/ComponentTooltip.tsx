import { type MapComponent } from '@/hooks/use-component-map-data';

const BUILD_STATUS_LABELS: Record<string, string> = {
  NOT_ONBOARDED: 'Not Onboarded',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  HAS_ISSUES: 'Has Issues',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  NOT_ONBOARDED: 'bg-gray-400',
  PLANNED: 'bg-slate-400',
  IN_PROGRESS: 'bg-amber-400',
  COMPLETE: 'bg-green-500',
  HAS_ISSUES: 'bg-red-500',
};

const POWER_RAIL_LABELS: Record<string, string> = {
  FIVE_V: '5V',
  NINE_V: '9V',
  TWENTY_SEVEN_V: '27V',
};

interface ComponentTooltipProps {
  component: MapComponent;
}

export function ComponentTooltip({ component }: ComponentTooltipProps) {
  const pinCount = component._count.pinAssignments;
  const railLabel = component.powerRail ? POWER_RAIL_LABELS[component.powerRail] : null;

  return (
    <div className="pointer-events-none rounded-md border border-slate-600 bg-slate-800/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm min-w-[160px]">
      <p className="text-xs font-medium text-slate-100 leading-tight">
        {component.name}
      </p>
      <p className="text-[10px] text-slate-400 mt-0.5">
        {component.componentType.name} &middot; {component.panelSection.name}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[component.buildStatus] ?? 'bg-gray-400'}`} />
          <span className="text-[10px] text-slate-300">
            {BUILD_STATUS_LABELS[component.buildStatus] ?? component.buildStatus}
          </span>
        </span>
        {railLabel && (
          <span className="text-[10px] text-slate-400">{railLabel}</span>
        )}
        <span className="text-[10px] text-slate-500">
          {pinCount} {pinCount === 1 ? 'pin' : 'pins'}
        </span>
      </div>
    </div>
  );
}
