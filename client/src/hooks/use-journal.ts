import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  panelSectionId: string | null;
  panelSection: { id: string; name: string } | null;
  componentInstanceId: string | null;
  componentInstance: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalFilters {
  search?: string;
  panelSectionId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateJournalEntryInput {
  title: string;
  body: string;
  panelSectionId?: string | null;
  componentInstanceId?: string | null;
}

export interface UpdateJournalEntryInput {
  id: string;
  title?: string;
  body?: string;
  panelSectionId?: string | null;
  componentInstanceId?: string | null;
}

function buildQueryString(filters?: JournalFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.panelSectionId) params.set('panelSectionId', filters.panelSectionId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useJournal(filters?: JournalFilters) {
  return useQuery<JournalEntry[]>({
    queryKey: ['journal', filters],
    queryFn: () => api.get(`/journal${buildQueryString(filters)}`),
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) =>
      api.post<JournalEntry>('/journal', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateJournalEntryInput) =>
      api.patch<JournalEntry>(`/journal/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/journal/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
    },
  });
}
