import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useBuildProgress,
  useUpdateComponentStatus,
  type BuildProgressSection,
} from '@/hooks/use-build-progress';
import { usePanelSection } from '@/hooks/use-panel-sections';
import { BUILD_STATUS_COLORS } from '@/lib/constants';

// --- Status label config ---

const STATUS_LABELS: Record<string, string> = {
  NOT_ONBOARDED: 'Not Onboarded',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  HAS_ISSUES: 'Has Issues',
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  NOT_ONBOARDED: 'bg-gray-300 text-gray-800',
  PLANNED: 'bg-slate-400 text-white',
  IN_PROGRESS: 'bg-amber-400 text-white',
  COMPLETE: 'bg-green-500 text-white',
  HAS_ISSUES: 'bg-red-500 text-white',
};

const EDITABLE_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETE', 'HAS_ISSUES'] as const;

// --- Overall progress ring ---

function ProgressRing({ percentage }: { percentage: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted/40"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-green-500 transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{percentage}%</span>
        <span className="text-xs text-muted-foreground">complete</span>
      </div>
    </div>
  );
}

// --- Horizontal progress bar ---

function ProgressBar({ percentage, className }: { percentage: number; className?: string }) {
  const barColor =
    percentage === 100
      ? 'bg-green-500'
      : percentage > 50
        ? 'bg-amber-400'
        : 'bg-slate-400';

  return (
    <div className={`h-2 bg-muted rounded-full overflow-hidden ${className ?? ''}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// --- Status dot + count ---

function StatusPill({
  label,
  count,
  colorClass,
}: {
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-full ${colorClass}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums">{count}</span>
    </div>
  );
}

// --- Expandable section card ---

function SectionCard({ section }: { section: BuildProgressSection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{section.sectionName}</CardTitle>
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
            {section.percentage}%
          </span>
        </div>
        <ProgressBar percentage={section.percentage} className="mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status pipeline */}
        <div className="flex flex-wrap gap-3">
          <StatusPill label="Planned" count={section.planned} colorClass={BUILD_STATUS_COLORS.PLANNED} />
          <StatusPill label="In Progress" count={section.inProgress} colorClass={BUILD_STATUS_COLORS.IN_PROGRESS} />
          <StatusPill label="Complete" count={section.complete} colorClass={BUILD_STATUS_COLORS.COMPLETE} />
          {section.hasIssues > 0 && (
            <StatusPill label="Issues" count={section.hasIssues} colorClass={BUILD_STATUS_COLORS.HAS_ISSUES} />
          )}
        </div>

        {/* Issues warning */}
        {section.hasIssues > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle className="size-3.5" />
            <span>{section.hasIssues} component{section.hasIssues > 1 ? 's' : ''} with issues</span>
          </div>
        )}

        {/* Pin stats */}
        <div className="text-sm text-muted-foreground">
          {section.pinStats.wired}/{section.pinStats.total} pins wired
        </div>

        {/* Expand toggle */}
        {section.total > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline transition-colors"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            {expanded ? 'Hide' : 'Show'} {section.total} component{section.total > 1 ? 's' : ''}
          </button>
        )}

        {/* Expanded components list */}
        {expanded && (
          <ExpandedComponents sectionId={section.sectionId} />
        )}
      </CardContent>
    </Card>
  );
}

// --- Expanded components (lazy-loaded) ---

function ExpandedComponents({ sectionId }: { sectionId: string }) {
  const { data: section, isLoading } = usePanelSection(sectionId);
  const updateStatus = useUpdateComponentStatus();

  if (isLoading) {
    return (
      <div className="space-y-2 pt-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (!section?.componentInstances?.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No components in this section.
      </p>
    );
  }

  function handleStatusChange(componentId: string, newStatus: string) {
    updateStatus.mutate(
      { id: componentId, status: newStatus },
      {
        onSuccess: () => toast.success('Component status updated'),
        onError: (err) => toast.error(`Failed to update status: ${err.message}`),
      },
    );
  }

  return (
    <div className="space-y-1 pt-1">
      {section.componentInstances.map((ci) => (
        <div
          key={ci.id}
          className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Badge className={`text-xs shrink-0 ${STATUS_BADGE_COLORS[ci.buildStatus] ?? 'bg-gray-300 text-gray-800'}`}>
              {STATUS_LABELS[ci.buildStatus] ?? ci.buildStatus}
            </Badge>
            <span className="text-sm truncate">{ci.name}</span>
            <span className="text-xs text-muted-foreground truncate">
              ({ci.componentType.name})
            </span>
          </div>
          <Select
            value={ci.buildStatus}
            onValueChange={(val) => handleStatusChange(ci.id, val)}
          >
            <SelectTrigger size="sm" className="w-[140px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITABLE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  <span className="flex items-center gap-2">
                    <span className={`inline-block size-2 rounded-full ${BUILD_STATUS_COLORS[status]}`} />
                    {STATUS_LABELS[status]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-8">
        <Skeleton className="size-[140px] rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// --- Main page ---

export default function BuildProgressPage() {
  const { data, isLoading, error } = useBuildProgress();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Failed to load build progress: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Build Progress</h1>
          <p className="text-sm text-muted-foreground">
            Track component and wiring progress across all panel sections.
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const { overall, sections } = data;
  const allComplete = overall.percentage === 100 && overall.total > 0;
  const totalIssues = sections.reduce((acc, s) => acc + s.hasIssues, 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Build Progress</h1>
        <p className="text-sm text-muted-foreground">
          Track component and wiring progress across all panel sections.
        </p>
      </div>

      {/* Overall progress header */}
      <div className="flex items-center gap-8 rounded-xl border bg-muted/30 px-6 py-5">
        <ProgressRing percentage={overall.percentage} />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Overall Build Progress</h2>
            {allComplete && (
              <CheckCircle2 className="size-5 text-green-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{overall.completed}</span>
            {' '}of{' '}
            <span className="font-semibold text-foreground tabular-nums">{overall.total}</span>
            {' '}components complete
          </p>
          {totalIssues > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangle className="size-3.5" />
              <span>{totalIssues} component{totalIssues > 1 ? 's' : ''} with issues across all sections</span>
            </div>
          )}
        </div>
      </div>

      {/* Per-section cards */}
      {sections.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="font-semibold mb-1">No sections found</h3>
          <p className="text-sm text-muted-foreground">
            Panel sections with components will appear here once created.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sections.map((section) => (
            <SectionCard key={section.sectionId} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
