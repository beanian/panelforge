import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  BUILD_STATUS_COLORS,
  POWER_RAIL_COLORS,
  POWER_RAIL_LABELS,
} from '@/lib/constants';

const BUILD_STATUS_LABELS: Record<string, string> = {
  NOT_ONBOARDED: 'Not Onboarded',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  HAS_ISSUES: 'Has Issues',
};

interface PinAssignment {
  id: string;
  pinNumber: string;
  pinType: string;
  pinMode: string;
  powerRail: string;
  wiringStatus: string;
  board: { id: string; name: string };
  mosfetChannel: { channelNumber: number; mosfetBoard: { name: string } } | null;
  mobiFlightMapping: { variableName: string; variableType: string } | null;
}

interface ComponentDetail {
  id: string;
  name: string;
  buildStatus: string;
  powerRail: string | null;
  notes: string | null;
  sortOrder: number;
  componentType: {
    id: string;
    name: string;
    description: string | null;
    defaultPinCount: number;
    defaultPowerRail: string;
    defaultPinMode: string;
  };
  panelSection: {
    id: string;
    name: string;
  };
  pinAssignments: PinAssignment[];
}

function FlyoutSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-md" />
        <Skeleton className="h-16 rounded-md" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-md" />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-slate-200">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

interface ComponentFlyoutProps {
  componentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewSection?: (sectionId: string) => void;
}

export function ComponentFlyout({ componentId, open, onOpenChange, onViewSection }: ComponentFlyoutProps) {
  const { data: component, isLoading, error } = useQuery<ComponentDetail>({
    queryKey: ['component-instances', componentId],
    queryFn: () => api.get(`/component-instances/${componentId}`),
    enabled: !!componentId,
  });

  const statusKey = component?.buildStatus ?? 'NOT_ONBOARDED';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto bg-slate-900 border-slate-700">
        {isLoading && <FlyoutSkeleton />}

        {error && (
          <div className="p-4">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Failed to load component: {(error as Error).message}
            </div>
          </div>
        )}

        {component && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-slate-100">{component.name}</SheetTitle>
                <Badge
                  className={`${BUILD_STATUS_COLORS[statusKey] ?? 'bg-gray-400'} text-white border-transparent`}
                >
                  {BUILD_STATUS_LABELS[statusKey] ?? statusKey}
                </Badge>
              </div>
              <SheetDescription className="text-slate-400">
                {component.componentType.name}
                {' \u00b7 '}
                <button
                  type="button"
                  className="underline hover:text-slate-200 transition-colors"
                  onClick={() => onViewSection?.(component.panelSection.id)}
                >
                  {component.panelSection.name}
                </button>
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Pin Count"
                  value={component.pinAssignments.length}
                  sub={`${component.componentType.defaultPinCount} default`}
                />
                <StatCard
                  label="Power Rail"
                  value={
                    component.powerRail && component.powerRail !== 'NONE'
                      ? POWER_RAIL_LABELS[component.powerRail] ?? component.powerRail
                      : 'None'
                  }
                />
              </div>

              {component.componentType.description && (
                <p className="text-xs text-slate-400">{component.componentType.description}</p>
              )}

              {component.notes && (
                <p className="text-xs text-slate-500 italic">{component.notes}</p>
              )}

              {component.pinAssignments.length > 0 && (
                <>
                  <Separator className="bg-slate-700" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                      Pin Assignments
                    </p>
                    <div className="flex flex-col gap-1">
                      {component.pinAssignments.map((pa) => (
                        <div
                          key={pa.id}
                          className="flex items-center gap-2 rounded bg-slate-700/60 px-2 py-1.5 text-[11px] text-slate-300"
                        >
                          <span className="font-mono font-medium text-slate-200">
                            {pa.pinNumber}
                          </span>
                          <span className="text-slate-500">{pa.board.name}</span>
                          <span className="text-slate-500">{pa.pinMode}</span>
                          {pa.powerRail !== 'NONE' && (
                            <Badge
                              className={`${POWER_RAIL_COLORS[pa.powerRail] ?? 'bg-gray-400'} text-white border-transparent text-[9px] px-1 py-0`}
                            >
                              {POWER_RAIL_LABELS[pa.powerRail] ?? pa.powerRail}
                            </Badge>
                          )}
                          {pa.mobiFlightMapping && (
                            <span className="text-[9px] text-slate-500 ml-auto truncate max-w-[120px]">
                              {pa.mobiFlightMapping.variableName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
