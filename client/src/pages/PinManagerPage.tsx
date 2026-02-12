import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Plus, X, Filter, Cpu, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import { LvarPicker } from '@/components/LvarPicker';

import { useBoards, useCreateBoard, useUpdateBoard, useDeleteBoard, type Board } from '@/hooks/use-boards';
import { useMosfetBoards, useCreateMosfetBoard, useUpdateMosfetBoard, useDeleteMosfetBoard } from '@/hooks/use-mosfet-boards';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  usePinAssignments,
  useUpdatePinAssignment,
  type PinAssignment,
} from '@/hooks/use-pin-assignments';
import { useDeleteComponentInstance } from '@/hooks/use-component-instances';
import { usePanelSections } from '@/hooks/use-panel-sections';
import { useDebounce } from '@/hooks/use-debounce';

import { POWER_RAIL_LABELS } from '@/lib/constants';

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

// --- Add MOSFET Board Dialog ---

function AddMosfetBoardDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createMosfetBoard = useCreateMosfetBoard();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMosfetBoard.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success(`MOSFET board "${name.trim()}" created`);
          setName('');
          setOpen(false);
        },
        onError: (err) => {
          toast.error(`Failed to create MOSFET board: ${err.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus />
          Add MOSFET Board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add MOSFET Board</DialogTitle>
            <DialogDescription>
              Create a new 8-channel MOSFET driver board.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="mosfet-name">Board Name</Label>
            <Input
              id="mosfet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "MOSFET Alpha"'
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || createMosfetBoard.isPending}
            >
              {createMosfetBoard.isPending ? 'Creating...' : 'Create MOSFET Board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Rename Board Dialog ---

function RenameBoardDialog({
  open,
  onOpenChange,
  currentName,
  onRename,
  isPending,
  boardType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onRename: (name: string) => void;
  isPending: boolean;
  boardType: string;
}) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onRename(name.trim());
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename {boardType}</DialogTitle>
            <DialogDescription>
              Enter a new name for this board.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-input">Board Name</Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || name.trim() === currentName || isPending}>
              {isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Delete Board Confirm ---

function DeleteBoardConfirm({
  open,
  onOpenChange,
  boardName,
  onDelete,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardName: string;
  onDelete: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{boardName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The board and all its unassigned pins/channels will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Board Actions Menu ---

function BoardActionsMenu({
  boardId,
  boardName,
  boardType,
  onUpdate,
  onDelete,
  updatePending,
  deletePending,
}: {
  boardId: string;
  boardName: string;
  boardType: string;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string, onDone: () => void) => void;
  updatePending: boolean;
  deletePending: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex items-center justify-center size-6 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="size-3.5 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameBoardDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentName={boardName}
        onRename={(name) => {
          onUpdate(boardId, name);
          setRenameOpen(false);
        }}
        isPending={updatePending}
        boardType={boardType}
      />

      <DeleteBoardConfirm
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        boardName={boardName}
        onDelete={() => {
          onDelete(boardId, () => setDeleteOpen(false));
        }}
        isPending={deletePending}
      />
    </>
  );
}

// --- Main page ---

export default function PinManagerPage() {
  // Board selection
  const { data: boards = [], isLoading: boardsLoading } = useBoards();
  const { data: mosfetBoards = [] } = useMosfetBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();

  // Board mutations
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();
  const updateMosfetBoard = useUpdateMosfetBoard();
  const deleteMosfetBoard = useDeleteMosfetBoard();

  const handleUpdateBoard = useCallback(
    (id: string, name: string) => {
      updateBoard.mutate(
        { id, name },
        {
          onSuccess: () => toast.success('Board renamed'),
          onError: (err) => toast.error(`Rename failed: ${err.message}`),
        }
      );
    },
    [updateBoard]
  );

  const handleDeleteBoard = useCallback(
    (id: string, onDone?: () => void) => {
      deleteBoard.mutate(id, {
        onSuccess: () => {
          toast.success('Board deleted');
          if (selectedBoardId === id) setSelectedBoardId(undefined);
          onDone?.();
        },
        onError: (err) => toast.error(`Delete failed: ${err.message}`),
      });
    },
    [deleteBoard, selectedBoardId]
  );

  const handleUpdateMosfetBoard = useCallback(
    (id: string, name: string) => {
      updateMosfetBoard.mutate(
        { id, name },
        {
          onSuccess: () => toast.success('MOSFET board renamed'),
          onError: (err) => toast.error(`Rename failed: ${err.message}`),
        }
      );
    },
    [updateMosfetBoard]
  );

  const handleDeleteMosfetBoard = useCallback(
    (id: string, onDone?: () => void) => {
      deleteMosfetBoard.mutate(id, {
        onSuccess: () => {
          toast.success('MOSFET board deleted');
          onDone?.();
        },
        onError: (err) => toast.error(`Delete failed: ${err.message}`),
      });
    },
    [deleteMosfetBoard]
  );

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
  const [assignedFilter, setAssignedFilter] = useState<string>('');

  const hasFilters =
    debouncedSearch ||
    (panelSectionFilter && panelSectionFilter !== 'all') ||
    (powerRailFilter && powerRailFilter !== 'all') ||
    (assignedFilter && assignedFilter !== 'all');

  const clearFilters = () => {
    setSearchInput('');
    setPanelSectionFilter('');
    setPowerRailFilter('');
    setAssignedFilter('');
  };

  // Data queries
  const { data: panelSections = [] } = usePanelSections();
  const { data: pins = [], isLoading: pinsLoading } = usePinAssignments({
    boardId: selectedBoard?.id,
    panelSectionId: panelSectionFilter && panelSectionFilter !== 'all' ? panelSectionFilter : undefined,
    powerRail: powerRailFilter && powerRailFilter !== 'all' ? powerRailFilter : undefined,
    assigned: assignedFilter && assignedFilter !== 'all' ? assignedFilter : undefined,
    search: debouncedSearch || undefined,
  });

  // Mutations
  const updatePin = useUpdatePinAssignment();
  const deleteComponent = useDeleteComponentInstance();

  // Delete component confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    componentId: string;
    componentName: string;
    pinCount: number;
  } | null>(null);

  const handleDeleteComponent = useCallback(() => {
    if (!deleteTarget) return;
    deleteComponent.mutate(deleteTarget.componentId, {
      onSuccess: () => {
        toast.success(`Deleted "${deleteTarget.componentName}" and its pin assignments`);
        setDeleteTarget(null);
        setSelectedIds(new Set());
      },
      onError: (err) => {
        toast.error(`Delete failed: ${err.message}`);
      },
    });
  }, [deleteTarget, deleteComponent]);

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

  // Request delete for a component (from a pin row)
  const handleRequestDeleteComponent = useCallback(
    (componentId: string, componentName: string) => {
      const pinCount = pins.filter(
        (p) => p.componentInstance?.id === componentId
      ).length;
      setDeleteTarget({ componentId, componentName, pinCount });
    },
    [pins]
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
        <div className="flex gap-2">
          <AddMosfetBoardDialog />
          <AddBoardDialog />
        </div>
      </div>

      {/* MOSFET Board Summary */}
      {mosfetBoards.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">MOSFET Boards:</span>
          {mosfetBoards.map((mb) => (
            <div
              key={mb.id}
              className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5"
            >
              <span className="text-sm font-medium">{mb.name}</span>
              <span className="text-xs text-muted-foreground">
                {mb.usedChannels}/{mb.channelCount} used
              </span>
              <BoardActionsMenu
                boardId={mb.id}
                boardName={mb.name}
                boardType="MOSFET Board"
                onUpdate={handleUpdateMosfetBoard}
                onDelete={handleDeleteMosfetBoard}
                updatePending={updateMosfetBoard.isPending}
                deletePending={deleteMosfetBoard.isPending}
              />
            </div>
          ))}
        </div>
      )}

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
                  <TabsTrigger key={board.id} value={board.id} className="gap-1.5">
                    {board.name}
                    <span className="text-xs text-muted-foreground">
                      {usedPins}/{totalPins}
                    </span>
                    <BoardActionsMenu
                      boardId={board.id}
                      boardName={board.name}
                      boardType="Arduino Board"
                      onUpdate={handleUpdateBoard}
                      onDelete={handleDeleteBoard}
                      updatePending={updateBoard.isPending}
                      deletePending={deleteBoard.isPending}
                    />
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
                    <TableHead>MobiFlight Var</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
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
                      onDeleteComponent={handleRequestDeleteComponent}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Delete component confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.componentName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this component and remove{' '}
              {deleteTarget?.pinCount === 1
                ? 'its pin assignment'
                : `all ${deleteTarget?.pinCount} of its pin assignments`}{' '}
              from this board. It will also be removed from the panel map if placed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComponent}
              disabled={deleteComponent.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteComponent.isPending ? 'Deleting...' : 'Delete Component'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Pin table row (extracted for performance) ---

function PinRow({
  pin,
  selected,
  onToggle,
  onSave,
  onDeleteComponent,
}: {
  pin: PinAssignment;
  selected: boolean;
  onToggle: (id: string) => void;
  onSave: (id: string, field: string, value: string) => void;
  onDeleteComponent: (componentId: string, componentName: string) => void;
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
      <TableCell className="text-sm">
        {pin.description || <span className="text-muted-foreground">--</span>}
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
        <LvarPicker
          pinAssignmentId={pin.id}
          currentMapping={pin.mobiFlightMapping}
          componentName={pin.componentInstance?.name}
          sectionSlug={pin.componentInstance?.panelSection?.slug}
        />
      </TableCell>
      <TableCell>
        <InlineEdit
          value={pin.notes ?? ''}
          onSave={(val) => onSave(pin.id, 'notes', val)}
        />
      </TableCell>
      <TableCell>
        {pin.componentInstance && (
          <button
            onClick={() =>
              onDeleteComponent(
                pin.componentInstance!.id,
                pin.componentInstance!.name
              )
            }
            className="inline-flex items-center justify-center size-7 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title={`Delete component "${pin.componentInstance.name}"`}
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </TableCell>
    </TableRow>
  );
}
