import { useState } from 'react';
import { Download, Cpu, Radio, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

import { useBoards } from '@/hooks/use-boards';
import {
  useMobiFlightPreview,
  exportMobiFlightConfig,
  useAutoAssignLvars,
} from '@/hooks/use-mobiflight';

// Device type badge styling
const DEVICE_TYPE_COLORS: Record<string, string> = {
  Button: 'bg-blue-500 text-white',
  Output: 'bg-green-500 text-white',
  LedModule: 'bg-amber-500 text-white',
  Stepper: 'bg-purple-500 text-white',
};

export default function MobiFlightPage() {
  const { data: boards = [], isLoading: boardsLoading } = useBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
  } = useMobiFlightPreview(selectedBoardId);
  const autoAssign = useAutoAssignLvars();

  const handleExport = async () => {
    if (!selectedBoardId || !preview) return;
    setExporting(true);
    try {
      await exportMobiFlightConfig(selectedBoardId, preview.boardName);
      toast.success(`Exported ${preview.boardName}.mfmc`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleAutoAssign = () => {
    if (!selectedBoardId) return;
    autoAssign.mutate(selectedBoardId, {
      onSuccess: (result) => {
        const msg = [
          result.assigned.length > 0 && `${result.assigned.length} assigned`,
          result.skipped.length > 0 && `${result.skipped.length} skipped`,
          result.failed.length > 0 && `${result.failed.length} failed`,
        ]
          .filter(Boolean)
          .join(', ');
        toast.success(`Auto-assign complete: ${msg}`);
      },
      onError: (err) => {
        toast.error(`Auto-assign failed: ${err.message}`);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MobiFlight Export</h1>
          <p className="text-sm text-muted-foreground">
            Preview and export MobiFlight Connector configurations per board
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoAssign}
            disabled={!selectedBoardId || autoAssign.isPending}
          >
            <Wand2 className="size-4" />
            {autoAssign.isPending ? 'Assigning...' : 'Auto-Assign LVARs'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedBoardId || !preview || preview.deviceCount === 0 || exporting}
          >
            <Download className="size-4" />
            {exporting ? 'Exporting...' : 'Export .mfmc'}
          </Button>
        </div>
      </div>

      {/* Board Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Board</label>
        {boardsLoading ? (
          <Skeleton className="h-9 w-[260px]" />
        ) : (
          <Select
            value={selectedBoardId ?? ''}
            onValueChange={(val) => setSelectedBoardId(val || null)}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select a board..." />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      {!selectedBoardId ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Radio className="mx-auto size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">Select a board</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Choose a board above to preview its MobiFlight device configuration.
          </p>
        </div>
      ) : previewLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="rounded-lg border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : previewError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center">
          <h3 className="font-semibold text-destructive mb-1">Failed to load preview</h3>
          <p className="text-sm text-muted-foreground">
            Could not fetch MobiFlight configuration for this board.
          </p>
        </div>
      ) : preview && preview.deviceCount === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Cpu className="mx-auto size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">No devices configured</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This board has no pin assignments with MobiFlight mappings.
            Assign components and configure variables in the Pin Manager first.
          </p>
        </div>
      ) : preview ? (
        <>
          {/* Device count summary */}
          <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm font-medium">
              {preview.boardName}
            </span>
            <Badge variant="secondary">
              {preview.deviceCount} device{preview.deviceCount !== 1 ? 's' : ''}
            </Badge>
            {/* Device type breakdown */}
            {(() => {
              const counts: Record<string, number> = {};
              preview.devices.forEach((d) => {
                counts[d.deviceType] = (counts[d.deviceType] || 0) + 1;
              });
              return Object.entries(counts).map(([type, count]) => (
                <Badge key={type} className={DEVICE_TYPE_COLORS[type] ?? 'bg-gray-400 text-white'}>
                  {count} {type}
                </Badge>
              ));
            })()}
          </div>

          {/* Device Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pin</TableHead>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Variable</TableHead>
                  <TableHead>Event Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.devices.map((device, idx) => (
                  <TableRow key={`${device.pinNumber}-${idx}`}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {device.pinNumber}
                        {device.deviceType === 'Stepper' && device.pairedPin && (
                          <span className="text-muted-foreground ml-1">
                            ({device.pairedPin})
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={DEVICE_TYPE_COLORS[device.deviceType] ?? 'bg-gray-400 text-white'}
                      >
                        {device.deviceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {device.name}
                    </TableCell>
                    <TableCell>
                      {device.variableName ? (
                        <span className="font-mono text-xs">
                          {device.variableName}
                          {device.variableType && (
                            <span className="text-muted-foreground ml-1">
                              ({device.variableType})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.eventType ?? (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  );
}
