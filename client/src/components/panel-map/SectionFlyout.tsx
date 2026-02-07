import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePanelSection,
  type ComponentInstanceDetail,
} from '@/hooks/use-panel-sections';
import {
  BUILD_STATUS_COLORS,
  POWER_RAIL_COLORS,
  POWER_RAIL_LABELS,
} from '@/lib/constants';
import { AddComponentForm } from './AddComponentForm';

const BUILD_STATUS_LABELS: Record<string, string> = {
  NOT_ONBOARDED: 'Not Onboarded',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  HAS_ISSUES: 'Has Issues',
};

// ─── Component Row ──────────────────────────────────────────────────
function ComponentRow({ instance }: { instance: ComponentInstanceDetail }) {
  const [expanded, setExpanded] = useState(false);
  const statusKey = instance.buildStatus;
  const pinCount = instance.pinAssignments.length;

  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/50">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-700/30 transition-colors duration-150"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-slate-200 truncate">
            {instance.name}
          </span>
          <span className="text-xs text-slate-400">
            {instance.componentType.name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            className={`${BUILD_STATUS_COLORS[statusKey] ?? 'bg-gray-400'} text-white border-transparent text-[10px] px-1.5 py-0`}
          >
            {BUILD_STATUS_LABELS[statusKey] ?? statusKey}
          </Badge>
          <span className="text-xs text-slate-500">
            {pinCount} {pinCount === 1 ? 'pin' : 'pins'}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-700/50">
          {instance.componentType.description && (
            <p className="text-xs text-slate-400 mb-2">
              {instance.componentType.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {instance.componentType.defaultPinMode}
            </Badge>
            {instance.powerRail && instance.powerRail !== 'NONE' && (
              <Badge
                className={`${POWER_RAIL_COLORS[instance.powerRail] ?? 'bg-gray-400'} text-white border-transparent text-[10px] px-1.5 py-0`}
              >
                {POWER_RAIL_LABELS[instance.powerRail] ?? instance.powerRail}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {instance.componentType.defaultPinCount} default{' '}
              {instance.componentType.defaultPinCount === 1 ? 'pin' : 'pins'}
            </Badge>
          </div>
          {instance.notes && (
            <p className="text-xs text-slate-500 mt-2 italic">{instance.notes}</p>
          )}
          {instance.pinAssignments.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Pin Assignments
              </p>
              <div className="flex flex-col gap-1">
                {instance.pinAssignments.map((pa) => (
                  <div
                    key={pa.id}
                    className="flex items-center gap-2 rounded bg-slate-700/60 px-2 py-1 text-[11px] text-slate-300"
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────
function FlyoutSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-md" />
        <Skeleton className="h-16 rounded-md" />
        <Skeleton className="h-16 rounded-md" />
        <Skeleton className="h-16 rounded-md" />
      </div>
      <Skeleton className="h-4 w-24 mt-2" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-md" />
      ))}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-slate-200">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Main SectionFlyout Component ───────────────────────────────────
interface SectionFlyoutProps {
  sectionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SectionFlyout({ sectionId, open, onOpenChange }: SectionFlyoutProps) {
  const { data: section, isLoading, error } = usePanelSection(sectionId);
  const [addFormOpen, setAddFormOpen] = useState(false);

  const statusKey = section?.buildStatus ?? 'NOT_ONBOARDED';
  const dimensions =
    section?.widthMm && section?.heightMm
      ? `${section.widthMm} x ${section.heightMm} mm`
      : 'Unknown';

  // Aggregate power breakdown
  const powerEntries = section?.powerBreakdown
    ? Object.entries(section.powerBreakdown).filter(([, count]) => count > 0)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto bg-slate-900 border-slate-700">
        {isLoading && <FlyoutSkeleton />}

        {error && (
          <div className="p-4">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Failed to load section: {error.message}
            </div>
          </div>
        )}

        {section && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-slate-100">{section.name}</SheetTitle>
                <Badge
                  className={`${BUILD_STATUS_COLORS[statusKey] ?? 'bg-gray-400'} text-white border-transparent`}
                >
                  {BUILD_STATUS_LABELS[statusKey] ?? statusKey}
                </Badge>
              </div>
              <SheetDescription className="text-slate-400">
                {dimensions}
                {section.dzusSizes && ` \u00b7 DZUS ${section.dzusSizes}`}
                {section.sourceMsn && ` \u00b7 MSN ${section.sourceMsn}`}
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-4 flex flex-col gap-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Components"
                  value={section.componentInstances.length}
                />
                <StatCard
                  label="Pin Usage"
                  value={section.pinCount}
                  sub={`${section.pinCount} assigned`}
                />
              </div>

              {/* Power breakdown */}
              {powerEntries.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                    Power Rails
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {powerEntries.map(([rail, count]) => (
                      <Badge
                        key={rail}
                        className={`${POWER_RAIL_COLORS[rail] ?? 'bg-gray-400'} text-white border-transparent`}
                      >
                        {POWER_RAIL_LABELS[rail] ?? rail}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="bg-slate-700" />

              {/* Component list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-300">
                    Components ({section.componentInstances.length})
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAddFormOpen(true)}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>

                {section.componentInstances.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">
                    No components in this section yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {section.componentInstances.map((ci) => (
                      <ComponentRow key={ci.id} instance={ci} />
                    ))}
                  </div>
                )}
              </div>

              {/* Lineage info */}
              {(section.lineageNotes || section.dimensionNotes) && (
                <>
                  <Separator className="bg-slate-700" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Notes
                    </p>
                    {section.dimensionNotes && (
                      <p className="text-xs text-slate-400">{section.dimensionNotes}</p>
                    )}
                    {section.lineageNotes && (
                      <p className="text-xs text-slate-400 mt-1">
                        {section.lineageNotes}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {section && (
          <AddComponentForm
            open={addFormOpen}
            onOpenChange={setAddFormOpen}
            panelSectionId={section.id}
            sectionName={section.name}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
