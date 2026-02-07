import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, X, Filter, Cpu } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { InlineEdit } from '@/components/pin-manager/InlineEdit';

import { useBoards, useCreateBoard, type Board } from '@/hooks/use-boards';
import {
  usePinAssignments,
  useUpdatePinAssignment,
  useBulkUpdatePinAssignments,
  type PinAssignment,
} from '@/hooks/use-pin-assignments';
import { usePanelSections } from '@/hooks/use-panel-sections';
import { useDebounce } from '@/hooks/use-debounce';

import { POWER_RAIL_COLORS, POWER_RAIL_LABELS } from '@/lib/constants';

// --- Wiring status config ---

const WIRING_STATUS_OPTIONS = [
  'UNASSIGNED',
  'PLANNED',
  'WIRED',
  'TESTED',
  'COMPLETE',
] as const;

const WIRING_STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: 'Unassigned',
  PLANNED: 'Planned',
  WIRED: 'Wired',
  TESTED: 'Tested',
  COMPLETE: 'Complete',
};

const WIRING_STATUS_COLORS: Record<string, string> = {
  UNASSIGNED: 'bg-gray-400 text-white',
  PLANNED: 'bg-slate-500 text-white',
  WIRED: 'bg-blue-500 text-white',
  TESTED: 'bg-amber-500 text-white',
  COMPLETE: 'bg-green-500 text-white',
};

const POWER_RAIL_BADGE_COLORS: Record<string, string> = {
  FIVE_V: 'bg-green-500 text-white',
  NINE_V: 'bg-blue-500 text-white',
  TWENTY_SEVEN_V: 'bg-amber-500 text-white',
  NONE: 'bg-gray-400 text-white',
};

// --- Capacity bar ---

function CapacityBar({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const barColor = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm tabular-nums whitespace-nowrap">
        {used}/{total}
      </span>
    </div>
  );
}

// --- Add Board Dialog ---

function AddBoardDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createBoard = useCreateBoard();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createBoard.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success(`Board "${name.trim()}" created`);
          setName('');
          setOpen(false);
        },
        onError: (err) => {
          toast.error(`Failed to create board: ${err.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus />
          Add Board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Arduino Mega Board</DialogTitle>
            <DialogDescription>
              Create a new Arduino Mega 2560 board entry. Pins will be
              automatically configured with 54 digital and 16 analog pins.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Mega #1 — Overhead Left"'
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || createBoard.isPending}
            >
              {createBoard.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Main page ---

export default function PinManagerPage() {
  // Board selection
  const { data: boards = [], isLoading: boardsLoading } = useBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();

  // Resolve selected board (default to first)
  const selectedBoard: Board | undefined = useMemo(() => {
    if (selectedBoardId) return boards.find((b) => b.id === selectedBoardId);
    return boards[0];
  }, [boards, selectedBoardId]);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [panelSectionFilter, setPanelSectionFilter] = useState<string>('');
  const [powerRailFilter, setPowerRailFilter] = useState<string>('');
  const [wiringStatusFilter, setWiringStatusFilter] = useState<string>('');
  const [assignedFilter, setAssignedFilter] = useState<string>('');

  const hasFilters =
    debouncedSearch ||
    (panelSectionFilter && panelSectionFilter !== 'all') ||
    (powerRailFilter && powerRailFilter !== 'all') ||
    (wiringStatusFilter && wiringStatusFilter !== 'all') ||
    (assignedFilter && assignedFilter !== 'all');

  const clearFilters = () => {
    setSearchInput('');
    setPanelSectionFilter('');
    setPowerRailFilter('');
    setWiringStatusFilter('');
    setAssignedFilter('');
  };

  // Data queries
  const { data: panelSections = [] } = usePanelSections();
  const { data: pins = [], isLoading: pinsLoading } = usePinAssignments({
    boardId: selectedBoard?.id,
    panelSectionId: panelSectionFilter && panelSectionFilter !== 'all' ? panelSectionFilter : undefined,
    powerRail: powerRailFilter && powerRailFilter !== 'all' ? powerRailFilter : undefined,
    wiringStatus: wiringStatusFilter && wiringStatusFilter !== 'all' ? wiringStatusFilter : undefined,
    assigned: assignedFilter && assignedFilter !== 'all' ? assignedFilter : undefined,
    search: debouncedSearch || undefined,
  });

  // Mutations
  const updatePin = useUpdatePinAssignment();
  const bulkUpdate = useBulkUpdatePinAssignments();

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = pins.length > 0 && selectedIds.size === pins.length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pins.map((p) => p.id)));
    }
  }, [allSelected, pins]);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  // Inline edit handler
  const handleInlineSave = useCallback(
    (pinId: string, field: string, value: string) => {
      updatePin.mutate(
        { id: pinId, [field]: value },
        {
          onSuccess: () => toast.success('Updated'),
          onError: (err) => toast.error(`Save failed: ${err.message}`),
        }
      );
    },
    [updatePin]
  );

  // Bulk status update
  const handleBulkStatus = useCallback(
    (status: string) => {
      const ids = Array.from(selectedIds);
      bulkUpdate.mutate(
        { ids, data: { wiringStatus: status } },
        {
          onSuccess: () => {
            toast.success(`Updated ${ids.length} pin(s) to ${WIRING_STATUS_LABELS[status]}`);
            setSelectedIds(new Set());
          },
          onError: (err) => toast.error(`Bulk update failed: ${err.message}`),
        }
      );
    },
    [selectedIds, bulkUpdate]
  );

  // Pin availability for selected board
  const availability = selectedBoard?.pinAvailability;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pin-Out Manager</h1>
          <p className="text-sm text-muted-foreground">
            Manage Arduino Mega pin assignments across boards
          </p>
        </div>
        <AddBoardDialog />
      </div>

      {/* Board Tabs */}
      {boardsLoading ? (
        <div className="h-10 bg-muted animate-pulse rounded-lg" />
      ) : boards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Cpu className="mx-auto size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">No boards yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first Arduino Mega board to start managing pin assignments.
          </p>
          <AddBoardDialog />
        </div>
      ) : (
        <>
          <Tabs
            value={selectedBoard?.id ?? ''}
            onValueChange={(val) => {
              setSelectedBoardId(val);
              setSelectedIds(new Set());
            }}
          >
            <TabsList>
              {boards.map((board) => {
                const avail = board.pinAvailability;
                const totalPins = board.digitalPinCount + board.analogPinCount;
                const usedPins =
                  (avail?.digitalUsed ?? 0) + (avail?.analogUsed ?? 0);
                return (
                  <TabsTrigger key={board.id} value={board.id}>
                    {board.name}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {usedPins}/{totalPins}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Capacity Bars */}
          {availability && selectedBoard && (
            <div className="flex items-center gap-6 rounded-lg border bg-muted/30 px-4 py-3">
              <CapacityBar
                label="Digital"
                used={availability.digitalUsed}
                total={selectedBoard.digitalPinCount}
              />
              <CapacityBar
                label="Analog"
                used={availability.analogUsed}
                total={selectedBoard.analogPinCount}
              />
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">PWM</span>
                <Badge variant="outline">{availability.pwmFree} available</Badge>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search pins..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-8 w-[200px]"
              />
            </div>

            <Select
              value={panelSectionFilter}
              onValueChange={setPanelSectionFilter}
            >
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue placeholder="Panel Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {panelSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={powerRailFilter}
              onValueChange={setPowerRailFilter}
            >
              <SelectTrigger size="sm" className="w-[130px]">
                <SelectValue placeholder="Power Rail" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rails</SelectItem>
                {Object.entries(POWER_RAIL_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={wiringStatusFilter}
              onValueChange={setWiringStatusFilter}
            >
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="Wiring Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {WIRING_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {WIRING_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pins</SelectItem>
                <SelectItem value="true">Assigned</SelectItem>
                <SelectItem value="false">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="size-3.5" />
                Clear Filters
              </Button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              <Filter className="inline size-3.5 mr-1" />
              {pins.length} pin{pins.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border bg-accent/50 px-4 py-2">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Update Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {WIRING_STATUS_OPTIONS.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleBulkStatus(status)}
                    >
                      {WIRING_STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="ghost"
                onClick={deselectAll}
                className="text-muted-foreground"
              >
                Deselect All
              </Button>
            </div>
          )}

          {/* Pin Table */}
          {pinsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-muted animate-pulse rounded"
                />
              ))}
            </div>
          ) : pins.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Cpu className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No pin assignments</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {hasFilters
                  ? 'No pins match the current filters. Try adjusting or clearing filters.'
                  : 'This board has no pin assignments yet. Pin assignments are created when components are added to panel sections.'}
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="size-4 rounded border-muted-foreground/30 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Board</TableHead>
                    <TableHead>Pin</TableHead>
                    <TableHead>Panel Section</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Power Rail</TableHead>
                    <TableHead>Pin Mode</TableHead>
                    <TableHead>Wiring Status</TableHead>
                    <TableHead>MobiFlight Var</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pins.map((pin) => (
                    <PinRow
                      key={pin.id}
                      pin={pin}
                      selected={selectedIds.has(pin.id)}
                      onToggle={toggleSelect}
                      onSave={handleInlineSave}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Pin table row (extracted for performance) ---

function PinRow({
  pin,
  selected,
  onToggle,
  onSave,
}: {
  pin: PinAssignment;
  selected: boolean;
  onToggle: (id: string) => void;
  onSave: (id: string, field: string, value: string) => void;
}) {
  return (
    <TableRow data-state={selected ? 'selected' : undefined}>
      <TableCell>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(pin.id)}
          className="size-4 rounded border-muted-foreground/30 cursor-pointer"
        />
      </TableCell>
      <TableCell className="text-sm">{pin.board.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {pin.pinNumber}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        {pin.componentInstance?.panelSection?.name ?? (
          <span className="text-muted-foreground">--</span>
        )}
      </TableCell>
      <TableCell>
        <InlineEdit
          value={pin.description ?? ''}
          onSave={(val) => onSave(pin.id, 'description', val)}
        />
      </TableCell>
      <TableCell className="text-sm">
        {pin.componentInstance ? (
          <span>
            {pin.componentInstance.name}
            <span className="text-muted-foreground ml-1 text-xs">
              ({pin.componentInstance.componentType.name})
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">--</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          className={`text-xs ${POWER_RAIL_BADGE_COLORS[pin.powerRail] ?? 'bg-gray-400 text-white'}`}
        >
          {POWER_RAIL_LABELS[pin.powerRail] ?? pin.powerRail}
        </Badge>
      </TableCell>
      <TableCell className="text-sm font-mono">{pin.pinMode}</TableCell>
      <TableCell>
        <Badge
          className={`text-xs ${WIRING_STATUS_COLORS[pin.wiringStatus] ?? 'bg-gray-400 text-white'}`}
        >
          {WIRING_STATUS_LABELS[pin.wiringStatus] ?? pin.wiringStatus}
        </Badge>
      </TableCell>
      <TableCell>
        <InlineEdit
          value={pin.mobiFlightMapping?.variableName ?? ''}
          onSave={(val) => onSave(pin.id, 'mobiFlightVariable', val)}
          className="font-mono text-xs"
        />
      </TableCell>
      <TableCell>
        <InlineEdit
          value={pin.notes ?? ''}
          onSave={(val) => onSave(pin.id, 'notes', val)}
        />
      </TableCell>
    </TableRow>
  );
}
