import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AircraftProfile } from '@panelforge/shared';

export function useAircraftProfile(
  msn: string | null,
  registration: string | null,
) {
  const regParam = registration ? `?reg=${encodeURIComponent(registration)}` : '';
  return useQuery<AircraftProfile>({
    queryKey: ['aircraft', msn, registration],
    queryFn: () => api.get(`/aircraft/${msn}${regParam}`),
    enabled: !!msn,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useAircraftProfiles() {
  return useQuery<AircraftProfile[]>({
    queryKey: ['aircraft'],
    queryFn: () => api.get('/aircraft'),
  });
}
