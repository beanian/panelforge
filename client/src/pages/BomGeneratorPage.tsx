import { useState } from 'react';
import { Package, AlertTriangle, Plus, Minus, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { usePanelSections } from '@/hooks/use-panel-sections';
import {
  useInventory,
  useAdjustInventoryStock,
  useCreateInventoryItem,
  useDeleteInventoryItem,
} from '@/hooks/use-inventory';
import { useBomCalculate } from '@/hooks/use-bom';

function formatCurrency(value: number | null): string {
  if (value == null) return '--';
  return `£${value.toFixed(2)}`;
}

export default function BomGeneratorPage() {
  // Inventory state
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory();
  const adjustStock = useAdjustInventoryStock();
  const createItem = useCreateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemQty, setNewItemQty] = useState('0');
  const [newItemCost, setNewItemCost] = useState('');

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

  function handleAddItem() {
    if (!newItemName.trim()) return;
    createItem.mutate(
      {
        name: newItemName.trim(),
        category: newItemCategory.trim() || undefined,
        quantityOnHand: parseInt(newItemQty, 10) || 0,
        unitCost: newItemCost ? parseFloat(newItemCost) : null,
      },
      {
        onSuccess: () => {
          toast.success(`Added "${newItemName.trim()}" to inventory`);
          setAddDialogOpen(false);
          setNewItemName('');
          setNewItemCategory('');
          setNewItemQty('0');
          setNewItemCost('');
        },
        onError: (err) => toast.error(`Failed to add item: ${err.message}`),
      }
    );
  }

  function handleDeleteItem(id: string, name: string) {
    deleteItem.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${name}"`),
      onError: (err) => toast.error(`Failed to delete: ${err.message}`),
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
          Manage inventory and calculate bills of materials for panel sections
        </p>
      </div>

      {/* Section A: Inventory / Stock on Hand */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5" />
                Inventory
              </CardTitle>
              <CardDescription>Stock on hand for components and materials</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="size-4 mr-1.5" />
              Add Item
            </Button>
          </div>
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
                Add items to track your stock on hand.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">On Hand</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.name}</TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">--</span>
                        )}
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
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(item.unitCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                        >
                          <Trash2 className="size-3.5" />
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

      {/* Add Inventory Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to track in your inventory.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="inv-name">Name</Label>
              <Input
                id="inv-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. M3 x 8mm bolt"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="inv-category">Category</Label>
              <Input
                id="inv-category"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                placeholder="e.g. Fasteners"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="inv-qty">Initial Quantity</Label>
                <Input
                  id="inv-qty"
                  type="number"
                  min="0"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="inv-cost">Unit Cost</Label>
                <Input
                  id="inv-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!newItemName.trim() || createItem.isPending}>
              {createItem.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
