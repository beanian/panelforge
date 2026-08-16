import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useBoards } from '@/hooks/use-boards';
import { useMosfetBoards } from '@/hooks/use-mosfet-boards';
import {
  usePinAssignments,
  useCreatePinAssignment,
  useUpdatePinAssignment,
  useDeletePinAssignment,
} from '@/hooks/use-pin-assignments';
import {
  BOARD_CONFIGS,
  MEGA_2560,
  BUILD_STATUS_COLORS,
  POWER_RAIL_COLORS,
  POWER_RAIL_LABELS,
} from '@/lib/constants';

const POWER_RAIL_OPTIONS = ['NONE', 'FIVE_V', 'NINE_V', 'TWENTY_SEVEN_V'];

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
    pinPowerRails: string[];
    pinMosfetRequired: boolean[];
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

              <Separator className="bg-slate-700" />
              <PinAssignmentsEditor
                componentId={component.id}
                pinAssignments={component.pinAssignments}
                defaultPowerRail={
                  component.componentType.pinPowerRails?.[0] ??
                  component.powerRail ??
                  'NONE'
                }
                defaultPinMode={component.componentType.defaultPinMode}
                pinMosfetRequired={component.componentType.pinMosfetRequired ?? []}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// --- Editable pin assignments section ---

function PinAssignmentsEditor({
  componentId,
  pinAssignments,
  defaultPowerRail,
  defaultPinMode,
  pinMosfetRequired,
}: {
  componentId: string;
  pinAssignments: PinAssignment[];
  defaultPowerRail: string;
  defaultPinMode: string;
  pinMosfetRequired: boolean[];
}) {
  const [adding, setAdding] = useState(false);
  const deletePin = useDeletePinAssignment();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
          Pin Assignments ({pinAssignments.length})
        </p>
        {!adding && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px] border-slate-600 bg-slate-800/40 hover:bg-slate-700"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3 mr-1" />
            Add Pin
          </Button>
        )}
      </div>

      {pinAssignments.length > 0 ? (
        <div className="flex flex-col gap-1">
          {pinAssignments.map((pa) => (
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
              {pa.mosfetChannel && (
                <span className="text-[9px] text-amber-400/80 whitespace-nowrap">
                  {pa.mosfetChannel.mosfetBoard.name} CH{pa.mosfetChannel.channelNumber}
                </span>
              )}
              {pa.mobiFlightMapping && (
                <span className="text-[9px] text-slate-500 truncate max-w-[100px]">
                  {pa.mobiFlightMapping.variableName}
                </span>
              )}
              <button
                type="button"
                disabled={deletePin.isPending}
                onClick={() => {
                  deletePin.mutate(pa.id, {
                    onSuccess: () => toast.success(`Removed pin ${pa.pinNumber}`),
                    onError: (err) =>
                      toast.error(`Failed to remove pin: ${(err as Error).message}`),
                  });
                }}
                className="ml-auto inline-flex items-center justify-center size-5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                title={`Remove pin ${pa.pinNumber}`}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !adding && (
          <p className="text-[11px] text-slate-500">
            No pins wired yet. Click "Add Pin" to assign this component to a board.
          </p>
        )
      )}

      {adding && (
        <AddPinForm
          componentId={componentId}
          defaultPowerRail={defaultPowerRail}
          defaultPinMode={defaultPinMode}
          mosfetRequired={pinMosfetRequired[pinAssignments.length] ?? false}
          onDone={() => setAdding(false)}
        />
      )}
    </div>
  );
}

// --- Add pin form ---

function AddPinForm({
  componentId,
  defaultPowerRail,
  defaultPinMode,
  mosfetRequired,
  onDone,
}: {
  componentId: string;
  defaultPowerRail: string;
  defaultPinMode: string;
  mosfetRequired: boolean;
  onDone: () => void;
}) {
  const { data: boards } = useBoards();
  const { data: mosfetBoards } = useMosfetBoards();
  const [boardId, setBoardId] = useState('');
  const [pinNumber, setPinNumber] = useState('');
  const [requiresPwm, setRequiresPwm] = useState(defaultPinMode === 'PWM');
  const [powerRail, setPowerRail] = useState(defaultPowerRail);
  const [description, setDescription] = useState('');
  const [mosfetBoardId, setMosfetBoardId] = useState('');
  const [mosfetChannelId, setMosfetChannelId] = useState('');

  const createPin = useCreatePinAssignment();
  const updatePin = useUpdatePinAssignment();

  // Pins already used on the selected board
  const { data: usedPins } = usePinAssignments(boardId ? { boardId } : {});

  const selectedBoard = boards?.find((b) => b.id === boardId);
  const boardConfig = useMemo(() => {
    if (!selectedBoard) return MEGA_2560;
    return BOARD_CONFIGS[selectedBoard.boardType] ?? MEGA_2560;
  }, [selectedBoard]);

  const usedPinNumbers = useMemo(
    () => new Set((usedPins ?? []).map((p) => p.pinNumber)),
    [usedPins],
  );
  const pwmPinSet = useMemo(() => new Set(boardConfig.pwmPins), [boardConfig]);

  const options = useMemo(() => {
    const digital = boardConfig.digitalPins.filter(
      (p) => !boardConfig.reservedPins.includes(p) && !usedPinNumbers.has(p),
    );
    const analog = boardConfig.analogPins.filter((p) => !usedPinNumbers.has(p));
    const pool = requiresPwm ? digital.filter((p) => pwmPinSet.has(p)) : [...digital, ...analog];
    return pool;
  }, [boardConfig, usedPinNumbers, pwmPinSet, requiresPwm]);

  // Clear a chosen pin that's no longer valid (e.g. after toggling PWM)
  const pinStillValid = pinNumber && options.includes(pinNumber);

  function handlePwmToggle() {
    setRequiresPwm((prev) => {
      const next = !prev;
      if (next && pinNumber && !pwmPinSet.has(pinNumber)) setPinNumber('');
      return next;
    });
  }

  async function handleCreate() {
    if (!boardId || !pinNumber) return;
    let created: { id: string };
    try {
      created = (await createPin.mutateAsync({
        boardId,
        pinNumber,
        pinType: pinNumber.startsWith('A') ? 'ANALOG' : 'DIGITAL',
        pinMode: requiresPwm ? 'PWM' : defaultPinMode || 'INPUT',
        componentInstanceId: componentId,
        powerRail,
        description: description.trim() || null,
      })) as { id: string };
    } catch (err) {
      toast.error(`Failed to assign pin: ${(err as Error).message}`);
      return;
    }

    if (mosfetChannelId) {
      try {
        await updatePin.mutateAsync({ id: created.id, mosfetChannelId });
        toast.success(`Assigned pin ${pinNumber} with MOSFET channel`);
      } catch (err) {
        toast.error(
          `Pin ${pinNumber} assigned, but MOSFET channel failed: ${(err as Error).message}`,
        );
      }
    } else {
      toast.success(`Assigned pin ${pinNumber}`);
    }
    onDone();
  }

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-md border border-slate-700 bg-slate-800/40 p-3">
      <div>
        <Label className="text-[11px] text-slate-400">Board</Label>
        <Select
          value={boardId || undefined}
          onValueChange={(v) => {
            setBoardId(v);
            setPinNumber('');
          }}
        >
          <SelectTrigger className="mt-1 h-8 text-xs">
            <SelectValue placeholder="Select board..." />
          </SelectTrigger>
          <SelectContent>
            {boards?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} ({b.pinAvailability.digitalFree}D / {b.pinAvailability.analogFree}A free)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {boardId && (
        <>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-slate-400">Pin</Label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresPwm}
                  onChange={handlePwmToggle}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-blue-500"
                />
                <Wand2 className="size-3" />
                PWM
              </label>
            </div>
            <Select
              value={pinStillValid ? pinNumber : undefined}
              onValueChange={setPinNumber}
            >
              <SelectTrigger className="mt-1 h-8 text-xs font-mono">
                <SelectValue placeholder="Select pin..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p} value={p} className="font-mono">
                    {p}
                    {pwmPinSet.has(p) && (
                      <span className="text-amber-400 ml-1 text-[10px]">PWM</span>
                    )}
                  </SelectItem>
                ))}
                {options.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-slate-500">
                    No pins available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] text-slate-400">Power Rail</Label>
            <Select value={powerRail} onValueChange={setPowerRail}>
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POWER_RAIL_OPTIONS.map((rail) => (
                  <SelectItem key={rail} value={rail}>
                    {POWER_RAIL_LABELS[rail] ?? rail}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] text-slate-400">
              MOSFET Channel {mosfetRequired ? '(required for this component)' : '(optional)'}
            </Label>
            <Select
              value={mosfetBoardId || undefined}
              onValueChange={(v) => {
                setMosfetBoardId(v === 'NONE' ? '' : v);
                setMosfetChannelId('');
              }}
            >
              <SelectTrigger className="mt-1 h-8 text-xs">
                <SelectValue placeholder="Select MOSFET board..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {mosfetBoards?.map((mb) => (
                  <SelectItem key={mb.id} value={mb.id}>
                    {mb.name} ({mb.freeChannels} free)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mosfetBoardId && (
              <Select
                value={mosfetChannelId || undefined}
                onValueChange={setMosfetChannelId}
              >
                <SelectTrigger className="mt-1.5 h-8 text-xs">
                  <SelectValue placeholder="Select channel..." />
                </SelectTrigger>
                <SelectContent>
                  {mosfetBoards
                    ?.find((mb) => mb.id === mosfetBoardId)
                    ?.channels.filter((ch) => !ch.pinAssignment)
                    .map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        Channel {ch.channelNumber}
                      </SelectItem>
                    ))}
                  {mosfetBoards
                    ?.find((mb) => mb.id === mosfetBoardId)
                    ?.channels.filter((ch) => !ch.pinAssignment).length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-slate-500">
                      No free channels
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="text-[11px] text-slate-400">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lamp output"
              className="mt-1 h-8 text-xs"
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onDone}
          disabled={createPin.isPending || updatePin.isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleCreate}
          disabled={
            !boardId ||
            !pinNumber ||
            (!!mosfetBoardId && !mosfetChannelId) ||
            createPin.isPending ||
            updatePin.isPending
          }
        >
          {createPin.isPending || updatePin.isPending ? 'Assigning...' : 'Assign Pin'}
        </Button>
      </div>
    </div>
  );
}
