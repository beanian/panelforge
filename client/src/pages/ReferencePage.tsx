import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plane,
  Plus,
  RefreshCw,
  Ruler,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { api } from '@/lib/api';
import { useAircraftProfile } from '@/hooks/use-aircraft';

// --- Derived status from component count ---

function derivedStatus(componentCount: number): { label: string; classes: string } {
  if (componentCount > 0) {
    return { label: 'In Progress', classes: 'bg-amber-400 text-white' };
  }
  return { label: 'Not Onboarded', classes: 'bg-gray-300 text-gray-800' };
}

// --- Types ---

interface PanelSectionFull {
  id: string;
  name: string;
  slug: string;
  widthMm: number | null;
  heightMm: number | null;
  dzusSizes: string | null;
  dimensionNotes: string | null;
  owned: boolean;
  buildStatus: string;
  sourceMsn: string | null;
  aircraftVariant: string | null;
  registration: string | null;
  lineageNotes: string | null;
  lineageUrls: string[];
  sortOrder: number;
  componentCount: number;
}

function usePanelSectionsFull() {
  return useQuery<PanelSectionFull[]>({
    queryKey: ['panel-sections'],
    queryFn: () => api.get('/panel-sections'),
  });
}

// --- Inline editable field ---

function EditableField({
  value,
  onSave,
  type = 'text',
  placeholder,
  suffix,
  className = '',
}: {
  value: string | number | null;
  onSave: (val: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  suffix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(value != null ? String(value) : '');
    setEditing(true);
  }

  function save() {
    setEditing(false);
    const trimmed = draft.trim();
    const currentStr = value != null ? String(value) : '';
    if (trimmed !== currentStr) {
      onSave(trimmed);
    }
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={save}
          className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-sm font-mono w-20 focus:outline-none focus:border-blue-500"
          placeholder={placeholder}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`font-mono tabular-nums hover:bg-slate-800 rounded px-1 -mx-1 transition-colors cursor-text ${className}`}
      title="Click to edit"
    >
      {value != null ? value : <span className="text-muted-foreground italic">{placeholder ?? '—'}</span>}
    </button>
  );
}

// --- Dimension card ---

function DimensionCard({
  section,
  onPatch,
}: {
  section: PanelSectionFull;
  onPatch: (id: string, data: Record<string, unknown>) => void;
}) {
  const status = derivedStatus(section.componentCount);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{section.name}</CardTitle>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPatch(section.id, { owned: !section.owned })}
              title={section.owned ? 'Mark as not owned' : 'Mark as owned'}
            >
              <Badge className={`text-xs cursor-pointer transition-colors ${section.owned ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30'}`}>
                {section.owned ? 'Owned' : 'Not owned'}
              </Badge>
            </button>
            <Badge className={`text-xs ${status.classes}`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Dimensions row */}
        <div className="flex items-center gap-2 text-sm">
          <Ruler className="size-4 text-muted-foreground shrink-0" />
          <EditableField
            value={section.widthMm}
            type="number"
            placeholder="width"
            onSave={(v) => onPatch(section.id, { widthMm: v ? parseFloat(v) : null })}
          />
          <span className="text-muted-foreground">x</span>
          <EditableField
            value={section.heightMm}
            type="number"
            placeholder="height"
            onSave={(v) => onPatch(section.id, { heightMm: v ? parseFloat(v) : null })}
          />
          <span className="text-xs text-muted-foreground">mm</span>
        </div>

        {/* DZUS */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">DZUS:</span>
          <EditableField
            value={section.dzusSizes}
            placeholder="e.g. 6-32"
            onSave={(v) => onPatch(section.id, { dzusSizes: v || null })}
          />
        </div>

        {/* Notes */}
        <div className="text-sm">
          <span className="text-muted-foreground">Notes: </span>
          <EditableField
            value={section.dimensionNotes}
            placeholder="click to add notes"
            onSave={(v) => onPatch(section.id, { dimensionNotes: v || null })}
            className="font-sans"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Aircraft detail panel (fetches and displays rich lineage data) ---

function AircraftDetailPanel({
  msn,
  registration,
}: {
  msn: string;
  registration: string | null;
}) {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, error } = useAircraftProfile(msn, registration);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-3 border-t border-border/50 mt-3">
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-32 shrink-0 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-3 border-t border-border/50 mt-3">
        <p className="text-sm text-destructive">Failed to load aircraft data: {error.message}</p>
      </div>
    );
  }

  if (!profile) return null;

  const hasAnyData =
    profile.photos.length > 0 ||
    profile.typeName ||
    profile.operator ||
    profile.registrationHistory.length > 0;

  if (!hasAnyData) {
    return (
      <div className="pt-3 border-t border-border/50 mt-3">
        <p className="text-sm text-muted-foreground italic">
          No data found for MSN {msn}.
          {!registration && ' Add a known registration above and try again — older BAe 146 MSNs need at least one registration to look up the full history.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-3 border-t border-border/50 mt-3">
      {/* Photo gallery */}
      {profile.photos.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Photos
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {profile.photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 group"
              >
                <img
                  src={`/api/aircraft/photo-proxy?url=${encodeURIComponent(photo.thumbnailUrl)}`}
                  alt={`Photo by ${photo.photographer}`}
                  className="h-20 w-32 object-cover rounded border border-border/50 group-hover:border-primary transition-colors"
                  loading="lazy"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate w-32">
                  {photo.photographer}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Aircraft info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <span className="text-muted-foreground">MSN</span>
        <span className="font-mono font-medium">{msn}</span>
        {profile.currentRegistration && (
          <>
            <span className="text-muted-foreground">Registration</span>
            <span className="font-mono font-medium">{profile.currentRegistration}</span>
          </>
        )}
        {profile.typeName && (
          <>
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{profile.typeName}</span>
          </>
        )}
        {profile.operator && (
          <>
            <span className="text-muted-foreground">Last Operator</span>
            <span className="font-medium">{profile.operator}</span>
          </>
        )}
        {profile.status && (
          <>
            <span className="text-muted-foreground">Status</span>
            <Badge className={`text-xs w-fit ${profile.status === 'scrapped' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : profile.status === 'stored' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : profile.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
              {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
            </Badge>
          </>
        )}
      </div>

      {/* Operator timeline */}
      {profile.registrationHistory.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Operator History
          </h4>
          <div className="space-y-1">
            {profile.registrationHistory.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                  {entry.registration}
                </span>
                <span className="truncate">{entry.operator}</span>
                <span className="text-muted-foreground text-xs shrink-0">
                  {entry.dateFrom || '?'} &ndash; {entry.dateTo || 'present'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External links */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          External References
        </h4>
        <div className="flex flex-wrap gap-2">
          {(profile.currentRegistration || registration) && (
            <a
              href={`https://www.planespotters.net/search?q=${profile.currentRegistration || registration}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              Planespotters
            </a>
          )}
          {(profile.currentRegistration || registration) && (
            <a
              href={`https://www.airfleets.net/recherche/search.php?rech=${profile.currentRegistration || registration}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3" />
              Airfleets
            </a>
          )}
          <a
            href={`https://rzjets.net/aircraft/?q=${msn}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            RZJets
          </a>
        </div>
      </div>

      {/* Cache info + refresh */}
      <div className="flex items-center justify-end text-xs text-muted-foreground gap-2">
        <span>Fetched {new Date(profile.fetchedAt).toLocaleDateString()}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5"
          onClick={() => {
            const regParam = registration ? `&reg=${encodeURIComponent(registration)}` : '';
            queryClient.invalidateQueries({ queryKey: ['aircraft', msn] });
            api.get(`/aircraft/${msn}?refresh=true${regParam}`).then(() => {
              queryClient.invalidateQueries({ queryKey: ['aircraft', msn] });
            });
          }}
          title="Refresh photos"
        >
          <RefreshCw className="size-3" />
        </Button>
      </div>

      {profile.fetchErrors && (
        <p className="text-xs text-amber-400/80">
          Partial fetch: {profile.fetchErrors}
        </p>
      )}
    </div>
  );
}

// --- Lineage card ---

function LineageCard({
  section,
  onPatch,
}: {
  section: PanelSectionFull;
  onPatch: (id: string, data: Record<string, unknown>) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [editingMsn, setEditingMsn] = useState(false);
  const [msnDraft, setMsnDraft] = useState('');
  const msnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMsn) {
      msnInputRef.current?.focus();
      msnInputRef.current?.select();
    }
  }, [editingMsn]);

  function startEditMsn() {
    setMsnDraft(section.sourceMsn ?? '');
    setEditingMsn(true);
  }

  function saveMsn() {
    setEditingMsn(false);
    const trimmed = msnDraft.trim().toUpperCase();
    if (trimmed !== (section.sourceMsn ?? '')) {
      onPatch(section.id, { sourceMsn: trimmed || null });
    }
  }

  const hasLineage =
    section.sourceMsn ||
    section.aircraftVariant ||
    section.registration ||
    section.lineageNotes ||
    (section.lineageUrls && section.lineageUrls.length > 0);

  const status = derivedStatus(section.componentCount);

  return (
    <Card className={!hasLineage ? 'opacity-60' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{section.name}</CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge className={`text-xs ${section.owned ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
              {section.owned ? 'Owned' : 'Not owned'}
            </Badge>
            <Badge className={`text-xs ${status.classes}`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Source MSN — always shown, editable */}
        <div className="text-sm">
          <span className="text-muted-foreground">Source MSN: </span>
          {editingMsn ? (
            <span className="inline-flex items-center gap-1">
              <input
                ref={msnInputRef}
                type="text"
                value={msnDraft}
                onChange={(e) => setMsnDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveMsn();
                  if (e.key === 'Escape') setEditingMsn(false);
                }}
                onBlur={saveMsn}
                className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-sm font-mono w-24 focus:outline-none focus:border-blue-500"
                placeholder="e.g. E3232"
              />
            </span>
          ) : section.sourceMsn ? (
            <button
              type="button"
              onClick={startEditMsn}
              className="font-mono font-medium tabular-nums hover:bg-slate-800 rounded px-1 -mx-1 transition-colors cursor-text"
              title="Click to edit"
            >
              {section.sourceMsn}
            </button>
          ) : (
            <button
              type="button"
              onClick={startEditMsn}
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="size-3" />
              <span className="text-xs">Add MSN</span>
            </button>
          )}
        </div>

        {section.aircraftVariant && (
          <div className="text-sm">
            <span className="text-muted-foreground">Variant: </span>
            <span className="font-medium">{section.aircraftVariant}</span>
          </div>
        )}

        {/* Registration — editable, shown when MSN is set */}
        {section.sourceMsn && (
          <div className="text-sm">
            <span className="text-muted-foreground">Registration: </span>
            <EditableField
              value={section.registration}
              placeholder="e.g. G-SSSH"
              onSave={(v) => onPatch(section.id, { registration: v.toUpperCase() || null })}
              className="font-mono"
            />
          </div>
        )}

        {section.lineageNotes && (
          <p className="text-sm text-muted-foreground">{section.lineageNotes}</p>
        )}

        {section.lineageUrls.length > 0 && (
          <div className="space-y-1 pt-1">
            {section.lineageUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="size-3.5 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        )}

        {/* Aircraft details toggle */}
        {section.sourceMsn && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Plane className="size-3.5 mr-1.5" />
            {showDetails ? 'Hide' : 'View'} Aircraft Details
            {showDetails ? (
              <ChevronUp className="size-3.5 ml-1.5" />
            ) : (
              <ChevronDown className="size-3.5 ml-1.5" />
            )}
          </Button>
        )}

        {showDetails && section.sourceMsn && (
          <AircraftDetailPanel
            msn={section.sourceMsn}
            registration={section.registration}
          />
        )}
      </CardContent>
    </Card>
  );
}

// --- Loading skeleton ---

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// --- Main page ---

export default function ReferencePage() {
  const queryClient = useQueryClient();
  const { data: sections, isLoading, error } = usePanelSectionsFull();

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/panel-sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const handlePatch = useCallback(
    (id: string, data: Record<string, unknown>) => {
      patchMutation.mutate({ id, data });
    },
    [patchMutation],
  );

  // Sort by sortOrder
  const sorted = [...(sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  // Sections with lineage data first, then the rest
  const lineageSorted = [...sorted].sort((a, b) => {
    const aHas = a.sourceMsn || a.aircraftVariant || a.registration || a.lineageNotes || (a.lineageUrls?.length > 0);
    const bHas = b.sourceMsn || b.aircraftVariant || b.registration || b.lineageNotes || (b.lineageUrls?.length > 0);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reference</h1>
          <p className="text-sm text-muted-foreground">
            Panel dimensions, aircraft lineage, and technical reference data.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Failed to load reference data: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reference</h1>
        <p className="text-sm text-muted-foreground">
          Panel dimensions, aircraft lineage, and technical reference data.
        </p>
      </div>

      <Tabs defaultValue="dimensions">
        <TabsList>
          <TabsTrigger value="dimensions">
            <Ruler className="size-4" />
            Panel Dimensions
          </TabsTrigger>
          <TabsTrigger value="lineage">
            <Plane className="size-4" />
            Aircraft Lineage
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Panel Dimensions */}
        <TabsContent value="dimensions">
          {isLoading ? (
            <LoadingSkeleton />
          ) : sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Ruler className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No panel sections</h3>
              <p className="text-sm text-muted-foreground">
                Panel sections will appear here once created.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.map((section) => (
                <DimensionCard key={section.id} section={section} onPatch={handlePatch} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Aircraft Lineage */}
        <TabsContent value="lineage">
          {isLoading ? (
            <LoadingSkeleton />
          ) : sorted.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Plane className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No panel sections</h3>
              <p className="text-sm text-muted-foreground">
                Panel sections will appear here once created.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lineageSorted.map((section) => (
                <LineageCard key={section.id} section={section} onPatch={handlePatch} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
