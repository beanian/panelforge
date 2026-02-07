import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, BookOpen, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  useJournal,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  type JournalEntry,
  type JournalFilters,
} from '@/hooks/use-journal';
import { usePanelSections } from '@/hooks/use-panel-sections';
import { useDebounce } from '@/hooks/use-debounce';

// --- Relative time helper ---

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
}

// --- Constants ---

const EMPTY_SECTION = '__none__';

// --- Entry form state ---

interface EntryFormState {
  title: string;
  body: string;
  panelSectionId: string;
  componentInstanceId: string;
}

const INITIAL_FORM: EntryFormState = {
  title: '',
  body: '',
  panelSectionId: '',
  componentInstanceId: '',
};

// --- Journal entry card ---

function JournalEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyLines = entry.body.split('\n');
  const isLong = bodyLines.length > 3 || entry.body.length > 300;
  const displayBody = expanded ? entry.body : entry.body.slice(0, 300);

  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight">{entry.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatRelativeTime(entry.createdAt)}
              {entry.updatedAt !== entry.createdAt && ' (edited)'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(entry)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(entry)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {displayBody}
          {!expanded && isLong && '...'}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Tags */}
        {(entry.panelSection || entry.componentInstance) && (
          <div className="flex flex-wrap gap-1.5">
            {entry.panelSection && (
              <Badge variant="secondary" className="text-xs">
                {entry.panelSection.name}
              </Badge>
            )}
            {entry.componentInstance && (
              <Badge variant="outline" className="text-xs">
                {entry.componentInstance.name}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Delete confirmation dialog ---

function DeleteConfirmDialog({
  entry,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  entry: JournalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete journal entry</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{entry?.title}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-14 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// --- Main page ---

export default function JournalPage() {
  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState<EntryFormState>(INITIAL_FORM);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Build filters
  const filters: JournalFilters = useMemo(() => {
    const f: JournalFilters = {};
    if (debouncedSearch) f.search = debouncedSearch;
    if (sectionFilter) f.panelSectionId = sectionFilter;
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    return f;
  }, [debouncedSearch, sectionFilter, dateFrom, dateTo]);

  // Queries & mutations
  const { data: entries, isLoading, error } = useJournal(filters);
  const { data: sections = [] } = usePanelSections();
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  // --- Handlers ---

  function openCreateDialog() {
    setEditingEntry(null);
    setForm(INITIAL_FORM);
    setFormOpen(true);
  }

  function openEditDialog(entry: JournalEntry) {
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      body: entry.body,
      panelSectionId: entry.panelSectionId ?? '',
      componentInstanceId: entry.componentInstanceId ?? '',
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.title.trim() || !form.body.trim()) return;

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      panelSectionId: form.panelSectionId || null,
      componentInstanceId: form.componentInstanceId || null,
    };

    if (editingEntry) {
      updateEntry.mutate(
        { id: editingEntry.id, ...payload },
        {
          onSuccess: () => {
            toast.success('Journal entry updated');
            setFormOpen(false);
          },
          onError: (err) => toast.error(`Failed to update: ${err.message}`),
        },
      );
    } else {
      createEntry.mutate(payload, {
        onSuccess: () => {
          toast.success('Journal entry created');
          setFormOpen(false);
        },
        onError: (err) => toast.error(`Failed to create: ${err.message}`),
      });
    }
  }

  function openDeleteDialog(entry: JournalEntry) {
    setDeleteTarget(entry);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteEntry.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Journal entry deleted');
        setDeleteOpen(false);
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(`Failed to delete: ${err.message}`),
    });
  }

  const isSaving = createEntry.isPending || updateEntry.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Build Journal</h1>
          <p className="text-sm text-muted-foreground">
            Log progress, notes, and decisions throughout the build.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          New Entry
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={sectionFilter || EMPTY_SECTION}
          onValueChange={(val) => setSectionFilter(val === EMPTY_SECTION ? '' : val)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_SECTION}>All sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Failed to load journal: {error.message}
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <LoadingSkeleton />}

      {/* Entry feed */}
      {!isLoading && !error && entries && (
        <>
          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <BookOpen className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No journal entries</h3>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch || sectionFilter || dateFrom || dateTo
                  ? 'No entries match your filters. Try adjusting your search criteria.'
                  : 'Start documenting your build by creating your first journal entry.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}</DialogTitle>
            <DialogDescription>
              {editingEntry
                ? 'Update the details of this journal entry.'
                : 'Record a note, decision, or progress update.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entry-title">Title</Label>
              <Input
                id="entry-title"
                placeholder="Entry title..."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-body">Body</Label>
              <Textarea
                id="entry-body"
                placeholder="Write your notes here..."
                rows={5}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Panel Section (optional)</Label>
                <Select
                  value={form.panelSectionId || EMPTY_SECTION}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      panelSectionId: val === EMPTY_SECTION ? '' : val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SECTION}>None</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Component (optional)</Label>
                <Input
                  placeholder="Component ID..."
                  value={form.componentInstanceId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, componentInstanceId: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !form.title.trim() || !form.body.trim()}
            >
              {isSaving
                ? editingEntry
                  ? 'Saving...'
                  : 'Creating...'
                : editingEntry
                  ? 'Save Changes'
                  : 'Create Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        entry={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isDeleting={deleteEntry.isPending}
      />
    </div>
  );
}
