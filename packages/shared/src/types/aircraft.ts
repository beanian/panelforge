export interface AircraftPhoto {
  id: string;
  thumbnailUrl: string;
  largeUrl: string;
  link: string;
  photographer: string;
}

export interface RegistrationHistoryEntry {
  registration: string;
  operator: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface AircraftProfile {
  msn: string;
  currentRegistration: string | null;
  typeName: string | null;
  operator: string | null;
  status: string | null;
  photos: AircraftPhoto[];
  registrationHistory: RegistrationHistoryEntry[];
  fetchedAt: string;
  fetchErrors: string | null;
}
