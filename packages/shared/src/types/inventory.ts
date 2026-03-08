export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantityOnHand: number;
  unitCost: number | null;
  supplierUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
