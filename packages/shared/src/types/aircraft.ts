export interface AircraftPhoto {
  id: string;
  thumbnailUrl: string;
  largeUrl: string;
  link: string;
  photographer: string;
}

export interface RegistrationHistoryEntry {
  registration: string;
  operator: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface AircraftProfile {
  msn: string;
  currentRegistration: string | null;

  // Basic info (hexdb + AirLabs + AeroDataBox)
  icaoHex: string | null;
  icaoTypeCode: string | null;
  typeName: string | null;
  manufacturer: string | null;
  builtDate: string | null;
  registeredOwners: string | null;
  airlineName: string | null;
  operatorFlagCode: string | null;

  // Photos (Planespotters)
  photos: AircraftPhoto[];

  // Image from AeroDataBox
  imageUrl: string | null;

  // Operator history (AeroDataBox)
  registrationHistory: RegistrationHistoryEntry[];

  // Cache metadata
  fetchedAt: string;
  fetchErrors: string | null;

  // Which data sources contributed
  sources: {
    hexdb: boolean;
    planespotters: boolean;
    aerodatabox: boolean;
  };
}
