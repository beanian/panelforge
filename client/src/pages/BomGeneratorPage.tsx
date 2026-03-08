import { useState } from 'react';
import { Package, AlertTriangle, Plus, Minus, ShoppingCart, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

import { usePanelSections } from '@/hooks/use-panel-sections';
import {
  useInventory,
  useAdjustInventoryStock,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from '@/hooks/use-inventory';
import { useBomCalculate } from '@/hooks/use-bom';

function formatCurrency(value: number | null): string {
  if (value == null) return '--';
  return `£${value.toFixed(2)}`;
}

function InlineCostEdit({ itemId, currentCost }: { itemId: string; currentCost: number | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentCost?.toString() ?? '');
  const updateItem = useUpdateInventoryItem();

  function handleSave() {
    const parsed = value.trim() ? parseFloat(value) : null;
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error('Invalid cost');
      return;
    }
    updateItem.mutate(
      { id: itemId, unitCost: parsed },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => toast.error(`Failed to update cost: ${err.message}`),
      }
    );
  }

  if (editing) {
    return (
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-7 w-20 text-sm tabular-nums text-right"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => {
        setValue(currentCost?.toString() ?? '');
        setEditing(true);
      }}
      className="text-sm tabular-nums hover:underline hover:text-foreground text-muted-foreground cursor-pointer"
      title="Click to edit"
    >
      {formatCurrency(currentCost)}
    </button>
  );
}

export default function BomGeneratorPage() {
  // Inventory state
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory();
  const adjustStock = useAdjustInventoryStock();
  const deleteItem = useDeleteInventoryItem();

  // BOM state
  const { data: sections = [], isLoading: sectionsLoading } = usePanelSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // For the BOM query: null means "don't fetch", '' means "all sections", otherwise a section ID
  const bomQueryParam = selectedSectionId === 'all' ? '' : selectedSectionId;
  const { data: bomResult, isLoading: bomLoading } = useBomCalculate(
    selectedSectionId != null ? (bomQueryParam ?? null) : null
  );

  // Inventory handlers
  function handleAdjust(id: string, delta: number) {
    adjustStock.mutate(
      { id, delta },
      { onError: (err) => toast.error(`Stock adjust failed: ${err.message}`) }
    );
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" from inventory?`)) return;
    deleteItem.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${name}"`),
      onError: (err) => toast.error(`Delete failed: ${err.message}`),
    });
  }

  // BOM derived data
  const itemsToOrder = bomResult?.lineItems.filter((li) => li.quantityToOrder > 0) ?? [];
  const totalItemsToOrder = itemsToOrder.reduce((sum, li) => sum + li.quantityToOrder, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">BOM Generator</h1>
        <p className="text-sm text-muted-foreground">
          Track stock on hand and calculate what you need to order for each panel section
        </p>
      </div>

      {/* Section A: Inventory / Stock on Hand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Stock on Hand
          </CardTitle>
          <CardDescription>
            Update quantities as you receive parts. These are subtracted from the BOM calculation below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventoryLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Package className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No inventory items</h3>
              <p className="text-sm text-muted-foreground">
                Run the database seed to create the default inventory items.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">On Hand</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() => handleAdjust(item.id, -1)}
                            disabled={item.quantityOnHand <= 0}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="tabular-nums text-sm font-medium w-8 text-center">
                            {item.quantityOnHand}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() => handleAdjust(item.id, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <InlineCostEdit itemId={item.id} currentCost={item.unitCost} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item.id, item.name)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: BOM Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5" />
            BOM Calculator
          </CardTitle>
          <CardDescription>
            Calculate materials needed for a panel section or the entire project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Section selector */}
          <div className="flex items-end gap-3">
            {sectionsLoading ? (
              <Skeleton className="h-9 w-[280px]" />
            ) : (
              <div className="space-y-1.5">
                <Label>Panel Section</Label>
                <Select
                  value={selectedSectionId ?? ''}
                  onValueChange={(val) => setSelectedSectionId(val || null)}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select a section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections (whole project)</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                        <span className="text-muted-foreground ml-1">
                          ({section.componentCount} components)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Loading state */}
          {bomLoading && selectedSectionId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" />
              Calculating BOM...
            </div>
          )}

          {/* Warnings */}
          {bomResult && bomResult.warnings.length > 0 && (
            <div className="space-y-2">
              {bomResult.warnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
                >
                  <AlertTriangle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-200">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {/* Summary cards */}
          {bomResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Line Items</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {bomResult.lineItems.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className={totalItemsToOrder > 0 ? 'border-amber-500/50' : ''}>
                <CardHeader className="pb-2">
                  <CardDescription>Items to Order</CardDescription>
                  <CardTitle className="text-2xl tabular-nums flex items-center gap-2">
                    {totalItemsToOrder}
                    {totalItemsToOrder > 0 && (
                      <AlertTriangle className="size-5 text-amber-500" />
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Estimated Cost</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {formatCurrency(bomResult.totalEstimatedCost)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* BOM Results Table */}
          {bomResult && bomResult.lineItems.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Required</TableHead>
                    <TableHead className="text-center">Installed</TableHead>
                    <TableHead className="text-center">In Stock</TableHead>
                    <TableHead className="text-center">To Order</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomResult.lineItems.map((item, i) => {
                    const needsOrdering = item.quantityToOrder > 0;
                    return (
                      <TableRow
                        key={i}
                        className={needsOrdering ? 'bg-amber-500/10 border-amber-500/30' : ''}
                      >
                        <TableCell className="font-medium text-sm">
                          {item.inventoryItemName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm">
                          {item.quantityRequired}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm">
                          {item.quantityInstalled}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm">
                          {item.quantityInStock}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm">
                          {needsOrdering ? (
                            <span className="font-semibold text-amber-400">
                              {item.quantityToOrder}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatCurrency(item.totalCost)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={item.reasoning}>
                          {item.reasoning}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Empty state when section selected but no items */}
          {bomResult && bomResult.lineItems.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <ShoppingCart className="mx-auto size-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-1">No BOM items</h3>
              <p className="text-sm text-muted-foreground">
                {bomResult.sectionName
                  ? `No materials needed for ${bomResult.sectionName}.`
                  : 'No materials needed for this project.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
