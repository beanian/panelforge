import { AlertTriangle, Zap, CircuitBoard } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  usePowerBudget,
  type PowerRailData,
  type MosfetBoardData,
  type MosfetChannel,
} from '@/hooks/use-power-budget';
import { POWER_RAIL_COLORS, POWER_RAIL_LABELS } from '@/lib/constants';

// --- Constants ---

const RAIL_MAX_CONNECTIONS = 50; // Sensible max for utilization bar
const UTILIZATION_WARNING_THRESHOLD = 0.8;

// Text-colored variants for rail bar fills
const RAIL_BAR_COLORS: Record<string, string> = {
  FIVE_V: 'bg-green-500',
  NINE_V: 'bg-blue-500',
  TWENTY_SEVEN_V: 'bg-amber-500',
};

// --- Rail utilization bar ---

function RailBar({ rail, total }: { rail: string; total: number }) {
  const pct = Math.min(Math.round((total / RAIL_MAX_CONNECTIONS) * 100), 100);
  const barColor = RAIL_BAR_COLORS[rail] ?? 'bg-gray-400';

  return (
    <div className="h-3 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// --- Power rail card ---

function PowerRailCard({ rail }: { rail: PowerRailData }) {
  const utilization = rail.totalConnections / RAIL_MAX_CONNECTIONS;
  const isWarning = utilization >= UTILIZATION_WARNING_THRESHOLD;
  const railColor = POWER_RAIL_COLORS[rail.rail] ?? 'bg-gray-400';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className={`inline-block size-4 rounded-full ${railColor}`} />
            <CardTitle className="text-lg">{rail.label} Rail</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isWarning && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="size-3 mr-1" />
                High Load
              </Badge>
            )}
            <span className="text-lg font-bold tabular-nums">
              {rail.totalConnections}
            </span>
            <span className="text-sm text-muted-foreground">connections</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Utilization bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Utilization</span>
            <span>{Math.round(utilization * 100)}% of {RAIL_MAX_CONNECTIONS} max</span>
          </div>
          <RailBar rail={rail.rail} total={rail.totalConnections} />
        </div>

        {/* Section breakdown */}
        {rail.bySection.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              By Section
            </p>
            {rail.bySection
              .sort((a, b) => b.count - a.count)
              .map((s) => (
                <div
                  key={s.sectionId}
                  className="flex items-center justify-between text-sm rounded-md bg-muted/30 px-3 py-1.5"
                >
                  <span className="truncate">{s.sectionName}</span>
                  <span className="font-semibold tabular-nums shrink-0 ml-3">{s.count}</span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No connections on this rail.</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- MOSFET channel cell ---

function ChannelCell({ channel }: { channel: MosfetChannel }) {
  const isUsed = channel.pinAssignment !== null;
  const bgColor = isUsed
    ? 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
    : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
  const textColor = isUsed
    ? 'text-amber-800 dark:text-amber-300'
    : 'text-green-700 dark:text-green-400';

  const cellContent = (
    <div
      className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition-colors ${bgColor}`}
    >
      <span className={`text-xs font-bold tabular-nums ${textColor}`}>
        CH {channel.channelNumber}
      </span>
      {isUsed && (
        <span className="text-[10px] text-muted-foreground truncate max-w-full">
          {channel.pinAssignment!.pinNumber}
        </span>
      )}
    </div>
  );

  if (!isUsed) {
    return cellContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <div>
            <span className="font-semibold">Pin:</span> {channel.pinAssignment!.pinNumber}
          </div>
          {channel.pinAssignment!.componentName && (
            <div>
              <span className="font-semibold">Component:</span> {channel.pinAssignment!.componentName}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// --- MOSFET board card ---

function MosfetBoardCard({ board }: { board: MosfetBoardData }) {
  const usagePct = board.channelCount > 0
    ? Math.round((board.usedChannels / board.channelCount) * 100)
    : 0;

  // Build a grid: aim for 4 columns
  const gridCols = Math.min(board.channelCount, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CircuitBoard className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">{board.name}</CardTitle>
          </div>
          <Badge variant={board.freeChannels === 0 ? 'destructive' : 'secondary'} className="text-xs">
            {board.usedChannels}/{board.channelCount} used
          </Badge>
        </div>
        <CardDescription>
          {board.freeChannels} channel{board.freeChannels !== 1 ? 's' : ''} free
          {' '}&middot;{' '}
          {usagePct}% utilization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            }}
          >
            {board.channels.map((ch) => (
              <ChannelCell key={ch.channelNumber} channel={ch} />
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// --- Main page ---

export default function PowerBudgetPage() {
  const { data, isLoading, error } = usePowerBudget();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Failed to load power budget: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Power Budget</h1>
          <p className="text-sm text-muted-foreground">
            Power rail usage and MOSFET board channel allocation.
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // Filter out the "NONE" rail
  const activeRails = data.rails.filter((r) => r.rail !== 'NONE');
  const totalConnections = activeRails.reduce((acc, r) => acc + r.totalConnections, 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Power Budget</h1>
        <p className="text-sm text-muted-foreground">
          Power rail usage and MOSFET board channel allocation.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-xl border bg-muted/30 px-6 py-4">
        <Zap className="size-6 text-amber-500 shrink-0" />
        <div>
          <p className="text-sm text-muted-foreground">Total Active Power Connections</p>
          <p className="text-2xl font-bold tabular-nums">{totalConnections}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {activeRails.map((r) => (
            <div key={r.rail} className="flex items-center gap-2">
              <span className={`inline-block size-3 rounded-full ${POWER_RAIL_COLORS[r.rail]}`} />
              <span className="text-sm font-medium">{POWER_RAIL_LABELS[r.rail] ?? r.rail}</span>
              <span className="text-sm font-bold tabular-nums">{r.totalConnections}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Power rail cards */}
      {activeRails.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Zap className="mx-auto size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">No power connections</h3>
          <p className="text-sm text-muted-foreground">
            Power rail data will appear here once pin assignments have power rails configured.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeRails.map((rail) => (
            <PowerRailCard key={rail.rail} rail={rail} />
          ))}
        </div>
      )}

      {/* MOSFET Boards section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">MOSFET Boards</h2>
          <p className="text-sm text-muted-foreground">
            Channel allocation across MOSFET driver boards.
          </p>
        </div>

        {data.mosfetBoards.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <CircuitBoard className="mx-auto size-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold mb-1">No MOSFET boards</h3>
            <p className="text-sm text-muted-foreground">
              MOSFET board data will appear here once boards are configured.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.mosfetBoards.map((board) => (
              <MosfetBoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
