import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BomLineItem {
  inventoryItemName: string;
  category: string;
  quantityRequired: number;
  quantityInstalled: number;
  quantityInStock: number;
  quantityToOrder: number;
  unitCost: number | null;
  totalCost: number | null;
  reasoning: string;
}

export interface BomCalculateResult {
  sectionId: string | null;
  sectionName: string | null;
  lineItems: BomLineItem[];
  totalEstimatedCost: number | null;
  warnings: string[];
}

export function useBomCalculate(sectionId: string | null) {
  return useQuery<BomCalculateResult>({
    queryKey: ['bom', sectionId],
    queryFn: () => {
      const params = sectionId ? `?sectionId=${sectionId}` : '';
      return api.get(`/bom/calculate${params}`);
    },
    enabled: sectionId !== null,
  });
}
