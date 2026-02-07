import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink, Plane, Ruler } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { api } from '@/lib/api';

// --- Status label mapping ---

const STATUS_LABELS: Record<string, string> = {
  NOT_ONBOARDED: 'Not Onboarded',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  HAS_ISSUES: 'Has Issues',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  NOT_ONBOARDED: 'bg-gray-300 text-gray-800',
  PLANNED: 'bg-slate-400 text-white',
  IN_PROGRESS: 'bg-amber-400 text-white',
  COMPLETE: 'bg-green-500 text-white',
  HAS_ISSUES: 'bg-red-500 text-white',
};

interface PanelSectionFull {
  id: string;
  name: string;
  slug: string;
  widthMm: number | null;
  heightMm: number | null;
  dzusSizes: string | null;
  dimensionNotes: string | null;
  buildStatus: string;
  sourceMsn: string | null;
  aircraftVariant: string | null;
  registration: string | null;
  lineageNotes: string | null;
  lineageUrls: string[];
  sortOrder: number;
}

function usePanelSectionsFull() {
  return useQuery<PanelSectionFull[]>({
    queryKey: ['panel-sections-full'],
    queryFn: () => api.get('/panel-sections'),
  });
}

// --- Dimension card ---

function DimensionCard({ section }: { section: PanelSectionFull }) {
  const hasDimensions = section.widthMm != null || section.heightMm != null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{section.name}</CardTitle>
          <Badge className={`text-xs ${STATUS_BADGE_CLASSES[section.buildStatus] ?? 'bg-gray-300 text-gray-800'}`}>
            {STATUS_LABELS[section.buildStatus] ?? section.buildStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasDimensions ? (
          <div className="flex items-center gap-2 text-sm">
            <Ruler className="size-4 text-muted-foreground shrink-0" />
            <span className="font-mono tabular-nums">
              {section.widthMm ?? '?'} x {section.heightMm ?? '?'} mm
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No dimensions recorded</p>
        )}

        {section.dzusSizes && (
          <div className="text-sm">
            <span className="text-muted-foreground">DZUS: </span>
            <span className="font-medium">{section.dzusSizes}</span>
          </div>
        )}

        {section.dimensionNotes && (
          <p className="text-sm text-muted-foreground">{section.dimensionNotes}</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Lineage card ---

function LineageCard({ section }: { section: PanelSectionFull }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{section.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {section.sourceMsn && (
          <div className="text-sm">
            <span className="text-muted-foreground">Source MSN: </span>
            <span className="font-mono font-medium">{section.sourceMsn}</span>
          </div>
        )}

        {section.aircraftVariant && (
          <div className="text-sm">
            <span className="text-muted-foreground">Variant: </span>
            <span className="font-medium">{section.aircraftVariant}</span>
          </div>
        )}

        {section.registration && (
          <div className="text-sm">
            <span className="text-muted-foreground">Registration: </span>
            <span className="font-mono font-medium">{section.registration}</span>
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
  const { data: sections, isLoading, error } = usePanelSectionsFull();

  // Sort by sortOrder
  const sorted = [...(sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  // Filter sections with at least one lineage field populated
  const lineageSections = sorted.filter(
    (s) =>
      s.sourceMsn ||
      s.aircraftVariant ||
      s.registration ||
      s.lineageNotes ||
      (s.lineageUrls && s.lineageUrls.length > 0),
  );

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
                <DimensionCard key={section.id} section={section} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Aircraft Lineage */}
        <TabsContent value="lineage">
          {isLoading ? (
            <LoadingSkeleton />
          ) : lineageSections.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <Plane className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No lineage data</h3>
              <p className="text-sm text-muted-foreground">
                Panel sections with lineage information (source MSN, variant, registration) will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lineageSections.map((section) => (
                <LineageCard key={section.id} section={section} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
