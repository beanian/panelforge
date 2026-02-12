import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Zap,
  CircuitBoard,
  Pencil,
  ChevronDown,
  Cpu,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  usePowerBudget,
  useUpdatePsuConfig,
  type MosfetBoardData,
  type MosfetChannel,
  type PsuConfig,
} from '@/hooks/use-power-budget';
import {
  calculateRailCurrentMa,
  calculatePsuDemandWatts,
  getUtilizationLevel,
  SCENARIOS,
  RAIL_VOLTAGES,
  type ScenarioName,
  type Scenario,
  type PowerComponent,
  type UtilizationLevel,
} from '@/lib/power-calc';

// ─── Utilization Colors ──────────────────────────────────

const UTILIZATION_COLORS: Record<UtilizationLevel, { bar: string; text: string; badge: string; glow: string }> = {
  green: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    glow: 'shadow-[0_0_20px_oklch(0.72_0.17_162/0.15)]',
  },
  amber: {
    bar: 'bg-amber-500',
    text: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    glow: 'shadow-[0_0_20px_oklch(0.78_0.16_75/0.15)]',
  },
  red: {
    bar: 'bg-red-500',
    text: 'text-red-400',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    glow: 'shadow-[0_0_20px_oklch(0.63_0.22_25/0.2)]',
  },
};

const RAIL_ACCENT: Record<string, { dot: string; bar: string; border: string }> = {
  FIVE_V: { dot: 'bg-emerald-400', bar: 'bg-emerald-500', border: 'border-emerald-500/30' },
  NINE_V: { dot: 'bg-blue-400', bar: 'bg-blue-500', border: 'border-blue-500/30' },
  TWENTY_SEVEN_V: { dot: 'bg-amber-400', bar: 'bg-amber-500', border: 'border-amber-500/30' },
};

const RAIL_LABELS: Record<string, string> = {
  FIVE_V: '5V',
  NINE_V: '9V',
  TWENTY_SEVEN_V: '28V',
};

const customScenario: Scenario = {
  name: 'custom',
  label: 'Custom',
  activationRules: { default: 0 },
};

// ─── PSU Config Bar ──────────────────────────────────────

function PsuConfigBar({ config, onEdit }: { config: PsuConfig; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-muted/20 px-5 py-3">
      <Settings2 className="size-4 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{config.name}</span>
        <span className="text-muted-foreground">&middot;</span>
        <span className="tabular-nums font-mono text-xs">{config.capacityWatts}W</span>
        <span className="text-muted-foreground">&middot;</span>
        <span className="tabular-nums font-mono text-xs">{Math.round(config.converterEfficiency * 100)}% efficiency</span>
      </div>
      <Button variant="ghost" size="icon-xs" className="ml-auto" onClick={onEdit}>
        <Pencil className="size-3" />
      </Button>
    </div>
  );
}

// ─── PSU Config Dialog ───────────────────────────────────

function PsuConfigDialog({
  open,
  onOpenChange,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PsuConfig;
}) {
  const updatePsu = useUpdatePsuConfig();
  const [name, setName] = useState(config.name);
  const [capacity, setCapacity] = useState(String(config.capacityWatts));
  const [efficiency, setEfficiency] = useState(String(Math.round(config.converterEfficiency * 100)));
  const [notes, setNotes] = useState(config.notes ?? '');

  function handleSave() {
    const effNum = parseFloat(efficiency);
    const capNum = parseFloat(capacity);
    if (isNaN(capNum) || capNum <= 0) { toast.error('Capacity must be positive'); return; }
    if (isNaN(effNum) || effNum < 50 || effNum > 100) { toast.error('Efficiency must be 50-100%'); return; }

    updatePsu.mutate(
      {
        name: name.trim() || 'Main PSU',
        capacityWatts: capNum,
        converterEfficiency: effNum / 100,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('PSU config updated');
          onOpenChange(false);
        },
        onError: () => toast.error('Failed to update PSU config'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PSU Configuration</DialogTitle>
          <DialogDescription>Set your power supply capacity and converter efficiency.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="psu-name">Name</Label>
            <Input id="psu-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="psu-capacity">Capacity (W)</Label>
              <Input id="psu-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="psu-efficiency">Efficiency (%)</Label>
              <Input id="psu-efficiency" type="number" min={50} max={100} value={efficiency} onChange={(e) => setEfficiency(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="psu-notes">Notes</Label>
            <Input id="psu-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updatePsu.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Scenario Selector ───────────────────────────────────

function ScenarioSelector({
  active,
  onChange,
}: {
  active: ScenarioName;
  onChange: (s: ScenarioName) => void;
}) {
  const all: { name: ScenarioName; label: string }[] = [
    ...SCENARIOS.map((s) => ({ name: s.name, label: s.label })),
    { name: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((s) => (
        <button
          key={s.name}
          onClick={() => onChange(s.name)}
          className={`
            px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${active === s.name
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
            }
          `}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── Custom Section Toggles ──────────────────────────────

function SectionToggles({
  sections,
  toggles,
  onToggle,
}: {
  sections: { id: string; name: string }[];
  toggles: Record<string, boolean>;
  onToggle: (sectionId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {sections.map((s) => {
        const on = toggles[s.id] ?? false;
        return (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`
              px-2.5 py-1 rounded text-[11px] font-medium border transition-all
              ${on
                ? 'bg-primary/10 border-primary/40 text-foreground'
                : 'bg-transparent border-border/50 text-muted-foreground hover:border-border'
              }
            `}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Headline Card ───────────────────────────────────────

function HeadlineCard({
  demandWatts,
  capacityWatts,
  level,
}: {
  demandWatts: number;
  capacityWatts: number;
  level: UtilizationLevel;
}) {
  const pct = capacityWatts > 0 ? Math.min((demandWatts / capacityWatts) * 100, 100) : 100;
  const colors = UTILIZATION_COLORS[level];

  return (
    <Card className={`${colors.glow} transition-shadow duration-500`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <Zap className={`size-5 ${colors.text} shrink-0 -translate-y-0.5`} />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total PSU Demand</p>
              <p className="text-3xl font-bold tabular-nums font-mono tracking-tight">
                {demandWatts.toFixed(1)}
                <span className="text-lg text-muted-foreground font-normal ml-1">W</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className={`${colors.badge} border font-mono text-xs`}>
              {pct.toFixed(0)}%
            </Badge>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums font-mono">
              of {capacityWatts}W
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Rail Card ───────────────────────────────────────────

function RailCard({
  rail,
  currentMa,
  watts,
  psuDrawWatts,
  voltage: _voltage,
  components,
  scenario,
  customToggles,
}: {
  rail: string;
  currentMa: number;
  watts: number;
  psuDrawWatts: number;
  voltage: number;
  components: PowerComponent[];
  scenario: Scenario;
  customToggles?: Record<string, boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const accent = RAIL_ACCENT[rail] ?? { dot: 'bg-gray-400', bar: 'bg-gray-400', border: 'border-gray-500/30' };
  const label = RAIL_LABELS[rail] ?? rail;

  // Group components by section for drill-down
  const bySection = useMemo(() => {
    const map: Record<string, { sectionName: string; count: number; currentMa: number }> = {};
    for (const comp of components) {
      if (comp.powerRail !== rail || comp.typicalCurrentMa === 0) continue;

      // Apply activation
      let activation = 1;
      if (scenario.name === 'custom' && customToggles) {
        activation = customToggles[comp.panelSectionId] ? 1 : 0;
      } else if (scenario.activationRules.byTypeName && comp.componentTypeName in scenario.activationRules.byTypeName) {
        activation = scenario.activationRules.byTypeName[comp.componentTypeName];
      } else if (scenario.activationRules.byRail && rail in scenario.activationRules.byRail) {
        activation = scenario.activationRules.byRail[rail];
      } else {
        activation = scenario.activationRules.default;
      }

      if (activation === 0) continue;

      if (!map[comp.panelSectionId]) {
        map[comp.panelSectionId] = { sectionName: comp.panelSectionName, count: 0, currentMa: 0 };
      }
      map[comp.panelSectionId].count += 1;
      map[comp.panelSectionId].currentMa += comp.typicalCurrentMa * activation;
    }
    return Object.values(map).sort((a, b) => b.currentMa - a.currentMa);
  }, [components, rail, scenario, customToggles]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`size-3 rounded-full ${accent.dot}`} />
            <CardTitle className="text-base">{label} Rail</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</p>
            <p className="text-sm font-mono font-semibold tabular-nums">
              {currentMa >= 1000 ? `${(currentMa / 1000).toFixed(2)}A` : `${currentMa.toFixed(0)}mA`}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rail Power</p>
            <p className="text-sm font-mono font-semibold tabular-nums">{watts.toFixed(1)}W</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">PSU Draw</p>
            <p className="text-sm font-mono font-semibold tabular-nums">{psuDrawWatts.toFixed(1)}W</p>
          </div>
        </div>

        {/* Section drill-down */}
        {bySection.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <ChevronDown className={`size-3 transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`} />
            <span>By section ({bySection.length})</span>
          </button>
        )}

        {expanded && bySection.length > 0 && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {bySection.map((s) => (
              <div
                key={s.sectionName}
                className="flex items-center justify-between text-xs rounded bg-muted/30 px-2.5 py-1.5"
              >
                <span className="truncate">{s.sectionName}</span>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-muted-foreground">{s.count} comp</span>
                  <span className="font-mono font-semibold tabular-nums">{s.currentMa.toFixed(0)}mA</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentMa === 0 && (
          <p className="text-xs text-muted-foreground">No draw in this scenario.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Infrastructure Card ─────────────────────────────────

function InfrastructureCard({
  boardCount,
  mosfetBoardCount,
  estimatedCurrentMa,
  efficiency,
}: {
  boardCount: number;
  mosfetBoardCount: number;
  estimatedCurrentMa: number;
  efficiency: number;
}) {
  const watts = (estimatedCurrentMa * 5) / 1000;
  const psuWatts = watts / efficiency;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <Cpu className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Infrastructure</CardTitle>
        </div>
        <CardDescription>Fixed overhead on 5V rail</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{boardCount} Arduino{boardCount !== 1 ? 's' : ''}</span>
            <span className="text-muted-foreground mx-1.5">+</span>
            <span className="text-muted-foreground">{mosfetBoardCount} MOSFET board{mosfetBoardCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="ml-auto text-right font-mono text-xs tabular-nums">
            <span className="font-semibold">{estimatedCurrentMa}mA</span>
            <span className="text-muted-foreground ml-2">{psuWatts.toFixed(1)}W at PSU</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── MOSFET Channel Cell ─────────────────────────────────

function ChannelCell({ channel }: { channel: MosfetChannel }) {
  const isUsed = channel.pinAssignment !== null;
  const bgColor = isUsed
    ? 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700'
    : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
  const textColor = isUsed
    ? 'text-amber-800 dark:text-amber-300'
    : 'text-green-700 dark:text-green-400';

  const cellContent = (
    <div className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition-colors ${bgColor}`}>
      <span className={`text-xs font-bold tabular-nums ${textColor}`}>CH {channel.channelNumber}</span>
      {isUsed && (
        <span className="text-[10px] text-muted-foreground truncate max-w-full">
          {channel.pinAssignment!.pinNumber}
        </span>
      )}
    </div>
  );

  if (!isUsed) return cellContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <div><span className="font-semibold">Pin:</span> {channel.pinAssignment!.pinNumber}</div>
          {channel.pinAssignment!.componentName && (
            <div><span className="font-semibold">Component:</span> {channel.pinAssignment!.componentName}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── MOSFET Board Card ───────────────────────────────────

function MosfetBoardCard({ board }: { board: MosfetBoardData }) {
  const usagePct = board.channelCount > 0 ? Math.round((board.usedChannels / board.channelCount) * 100) : 0;
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
          {board.freeChannels} channel{board.freeChannels !== 1 ? 's' : ''} free &middot; {usagePct}% utilization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
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

// ─── Loading Skeleton ────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-10 w-80 rounded-lg" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function PowerBudgetPage() {
  const { data, isLoading, error } = usePowerBudget();
  const [activeScenario, setActiveScenario] = useState<ScenarioName>('worst-case');
  const [customToggles, setCustomToggles] = useState<Record<string, boolean>>({});
  const [psuDialogOpen, setPsuDialogOpen] = useState(false);

  // Resolve the active scenario object
  const scenario = useMemo<Scenario>(() => {
    if (activeScenario === 'custom') return customScenario;
    return SCENARIOS.find((s) => s.name === activeScenario) ?? SCENARIOS[0];
  }, [activeScenario]);

  // Compute power calculations
  const calc = useMemo(() => {
    if (!data) return null;

    const railCurrents = calculateRailCurrentMa(
      data.components,
      scenario,
      activeScenario === 'custom' ? customToggles : undefined,
    );
    const psuDemand = calculatePsuDemandWatts(
      railCurrents,
      data.psuConfig.converterEfficiency,
      data.infrastructure.estimatedBoardCurrentMa,
    );
    const level = getUtilizationLevel(psuDemand.totalWatts, data.psuConfig.capacityWatts);

    return { railCurrents, psuDemand, level };
  }, [data, scenario, activeScenario, customToggles]);

  // Extract unique sections from components for custom toggles
  const sections = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const c of data.components) {
      if (!map.has(c.panelSectionId)) {
        map.set(c.panelSectionId, c.panelSectionName);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  function handleToggleSection(sectionId: string) {
    setCustomToggles((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load power budget: {error.message}</p>
      </div>
    );
  }

  if (isLoading || !data || !calc) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Power Budget</h1>
          <p className="text-sm text-muted-foreground">Electrical load analysis and PSU capacity planning.</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  const rails = ['FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V'];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Power Budget</h1>
        <p className="text-sm text-muted-foreground">Electrical load analysis and PSU capacity planning.</p>
      </div>

      {/* PSU Config bar */}
      <PsuConfigBar config={data.psuConfig} onEdit={() => setPsuDialogOpen(true)} />

      {/* PSU Edit Dialog */}
      <PsuConfigDialog
        open={psuDialogOpen}
        onOpenChange={setPsuDialogOpen}
        config={data.psuConfig}
      />

      {/* Scenario selector */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Scenario</p>
        <ScenarioSelector active={activeScenario} onChange={setActiveScenario} />
        {activeScenario === 'custom' && (
          <SectionToggles
            sections={sections}
            toggles={customToggles}
            onToggle={handleToggleSection}
          />
        )}
      </div>

      {/* Headline PSU demand */}
      <HeadlineCard
        demandWatts={calc.psuDemand.totalWatts}
        capacityWatts={data.psuConfig.capacityWatts}
        level={calc.level}
      />

      {/* Per-rail cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rails.map((rail) => {
          const detail = calc.psuDemand.perRail[rail];
          return (
            <RailCard
              key={rail}
              rail={rail}
              currentMa={detail?.currentMa ?? 0}
              watts={detail?.watts ?? 0}
              psuDrawWatts={detail?.psuDrawWatts ?? 0}
              voltage={RAIL_VOLTAGES[rail] ?? 0}
              components={data.components}
              scenario={scenario}
              customToggles={activeScenario === 'custom' ? customToggles : undefined}
            />
          );
        })}
      </div>

      {/* Infrastructure */}
      <InfrastructureCard
        boardCount={data.infrastructure.boardCount}
        mosfetBoardCount={data.infrastructure.mosfetBoardCount}
        estimatedCurrentMa={data.infrastructure.estimatedBoardCurrentMa}
        efficiency={data.psuConfig.converterEfficiency}
      />

      {/* MOSFET Boards */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">MOSFET Boards</h2>
          <p className="text-sm text-muted-foreground">Channel allocation across MOSFET driver boards.</p>
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
