import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { config } from '../config';
import { lookupByMsn } from '../data/bae146-production';
import type {
  AircraftProfile,
  AircraftPhoto,
  RegistrationHistoryEntry,
} from '@panelforge/shared';

const CACHE_TTL_MS = config.aircraftCacheTtlHours * 60 * 60 * 1000;

export const aircraftService = {
  /**
   * Get aircraft profile by MSN (the stable identity of an aircraft).
   *
   * Registration resolution chain:
   * 1. Use provided registration hint (if any)
   * 2. Check local BAe 146 production lookup table
   * 3. Check cached registration from a previous fetch
   * 4. Try AirLabs API to resolve MSN → registration
   * 5. Use the registration to query Planespotters, hexdb, AeroDataBox
   * 6. Cache everything under the MSN key
   */
  async getByMsn(
    msn: string,
    registration: string | null,
    forceRefresh = false,
  ): Promise<AircraftProfile> {
    const cleanMsn = msn.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!cleanMsn) {
      throw new AppError(400, 'Invalid MSN');
    }

    // Check cache
    if (!forceRefresh) {
      const cached = await prisma.aircraftCache.findUnique({
        where: { msn: cleanMsn },
      });
      if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
        return toProfile(cached);
      }
    }

    // Start with the provided registration
    let reg = registration?.toUpperCase().replace(/[^A-Z0-9-]/g, '') || null;

    // Check the local BAe 146 production lookup table
    const productionEntry = lookupByMsn(cleanMsn);
    if (!reg && productionEntry) {
      reg = productionEntry.registration;
    }

    // If no registration yet, check if we have one cached from a previous fetch
    if (!reg) {
      const existing = await prisma.aircraftCache.findUnique({
        where: { msn: cleanMsn },
        select: { currentRegistration: true },
      });
      if (existing?.currentRegistration) {
        reg = existing.currentRegistration;
      }
    }

    // If still no registration, try to resolve MSN → registration via AirLabs
    let airlabsData: AirlabsResult | null = null;
    if (!reg && config.airlabsApiKey) {
      airlabsData = await fetchAirlabs(cleanMsn);
      if (airlabsData?.regNumber) {
        reg = airlabsData.regNumber;
      }
    }

    // Collect error messages for diagnostics
    const errors: string[] = [];

    // Build list of all known registrations to try for photos
    const allRegs = productionEntry?.allRegistrations ?? (reg ? [reg] : []);
    // Ensure the current reg is included even if not in the production table
    if (reg && !allRegs.includes(reg)) {
      allRegs.unshift(reg);
    }

    // Fetch from registration-based APIs in parallel (only if we have a reg)
    const [hexdbResult, photosResult, aeroResult] = reg
      ? await Promise.allSettled([
          fetchHexdb(reg),
          fetchAllPhotos(allRegs),
          config.aerodataboxApiKey
            ? fetchAerodatabox(reg)
            : Promise.resolve(null),
        ])
      : [
          { status: 'fulfilled' as const, value: null },
          { status: 'fulfilled' as const, value: [] as AircraftPhoto[] },
          { status: 'fulfilled' as const, value: null },
        ];

    let hexdb =
      hexdbResult.status === 'fulfilled' ? hexdbResult.value : null;
    const photos =
      photosResult.status === 'fulfilled' ? photosResult.value : [];
    const aero =
      aeroResult.status === 'fulfilled' ? aeroResult.value : null;

    if (hexdbResult.status === 'rejected')
      errors.push(`hexdb: ${hexdbResult.reason}`);
    if (photosResult.status === 'rejected')
      errors.push(`planespotters: ${photosResult.reason}`);
    if (aeroResult.status === 'rejected')
      errors.push(`aerodatabox: ${aeroResult.reason}`);
    if (!reg) errors.push('no registration available for API lookups');

    // Detect registration re-use: if hexdb returns a different aircraft type
    // than what the production table says, the registration has been recycled
    if (hexdb && productionEntry && hexdb.icaoTypeCode) {
      const expectedTypes = ['B461', 'B462', 'B463', 'RJ1H', 'RJ85', 'RJ70'];
      if (!expectedTypes.includes(hexdb.icaoTypeCode)) {
        errors.push(
          `hexdb: registration ${reg} now assigned to ${hexdb.icaoTypeCode}, not a BAe 146/Avro RJ`,
        );
        hexdb = null;
      }
    }

    // Merge data — prefer live API data, fall back to AirLabs, then production table
    const manufacturer =
      hexdb?.manufacturer ?? airlabsData?.manufacturer ?? null;
    const typeName =
      aero?.typeName ?? airlabsData?.model ?? productionEntry?.type ?? null;
    const airlineName =
      aero?.airlineName ??
      airlabsData?.airlineName ??
      productionEntry?.operator ??
      null;
    const builtDate = aero?.builtDate ?? airlabsData?.built ?? null;

    // Upsert cache keyed by MSN
    const cacheData = {
      msn: cleanMsn,
      currentRegistration: reg,
      icaoHex: hexdb?.icaoHex ?? airlabsData?.hex ?? null,
      icaoTypeCode: hexdb?.icaoTypeCode ?? null,
      manufacturer,
      registeredOwners: hexdb?.registeredOwners ?? null,
      operatorFlagCode: hexdb?.operatorFlagCode ?? null,
      typeName,
      airlineName,
      builtDate,
      imageUrl: aero?.imageUrl ?? null,
      registrationHistory: (aero?.registrationHistory as any) ?? [],
      photos: (photos as any) ?? [],
      fetchedAt: new Date(),
      fetchErrors: errors.length > 0 ? errors.join('; ') : null,
    };

    const record = await prisma.aircraftCache.upsert({
      where: { msn: cleanMsn },
      update: cacheData,
      create: cacheData,
    });

    return toProfile(record);
  },

  async listCached(): Promise<AircraftProfile[]> {
    const records = await prisma.aircraftCache.findMany({
      orderBy: { msn: 'asc' },
    });
    return records.map(toProfile);
  },
};

// --- AirLabs (MSN → registration resolver) ---

interface AirlabsResult {
  regNumber: string | null;
  hex: string | null;
  manufacturer: string | null;
  model: string | null;
  airlineName: string | null;
  built: string | null;
}

async function fetchAirlabs(msn: string): Promise<AirlabsResult | null> {
  try {
    const res = await fetch(
      `https://airlabs.co/api/v9/fleets?api_key=${encodeURIComponent(config.airlabsApiKey)}&msn=${encodeURIComponent(msn)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const aircraft = data.response?.[0];
    if (!aircraft) return null;

    return {
      regNumber: aircraft.reg_number || null,
      hex: aircraft.hex || null,
      manufacturer: aircraft.manufacturer || null,
      model: aircraft.model || null,
      airlineName: aircraft.airline_iata || aircraft.airline_icao || null,
      built: aircraft.built ? String(aircraft.built) : null,
    };
  } catch {
    return null;
  }
}

// --- External API fetchers (registration-based) ---

async function fetchHexdb(reg: string) {
  const hexRes = await fetch(
    `https://hexdb.io/reg-hex?reg=${encodeURIComponent(reg)}`,
  );
  if (!hexRes.ok) return null;
  const hex = (await hexRes.text()).trim();
  if (!hex || hex.length < 4) return null;

  const detailRes = await fetch(`https://hexdb.io/api/v1/aircraft/${hex}`);
  if (!detailRes.ok) return null;
  const data = await detailRes.json();

  return {
    icaoHex: (data.ModeS as string) || hex,
    icaoTypeCode: (data.ICAOTypeCode as string) || null,
    manufacturer: (data.Manufacturer as string) || null,
    registeredOwners: (data.RegisteredOwners as string) || null,
    operatorFlagCode: (data.OperatorFlagCode as string) || null,
  };
}

/**
 * Fetch photos across all known registrations for an airframe.
 * Deduplicates by photo ID and caps at 10 total.
 */
async function fetchAllPhotos(regs: string[]): Promise<AircraftPhoto[]> {
  if (regs.length === 0) return [];
  const results = await Promise.allSettled(regs.map(fetchPlanespotters));
  const seen = new Set<string>();
  const photos: AircraftPhoto[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const photo of result.value) {
        if (!seen.has(photo.id)) {
          seen.add(photo.id);
          photos.push(photo);
        }
      }
    }
  }
  return photos.slice(0, 10);
}

async function fetchPlanespotters(reg: string): Promise<AircraftPhoto[]> {
  const res = await fetch(
    `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`,
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.photos || []).slice(0, 10).map((p: any) => ({
    id: String(p.id),
    thumbnailUrl: p.thumbnail_large?.src || p.thumbnail?.src || '',
    largeUrl: p.thumbnail_large?.src || '',
    link: p.link || '',
    photographer: p.photographer || 'Unknown',
  }));
}

async function fetchAerodatabox(reg: string) {
  const res = await fetch(
    `https://aerodatabox.p.rapidapi.com/aircrafts/reg/${encodeURIComponent(reg)}?withRegistrations=true&withImage=true`,
    {
      headers: {
        'X-RapidAPI-Key': config.aerodataboxApiKey,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();

  const history: RegistrationHistoryEntry[] = (
    data.registrations || []
  ).map((r: any) => ({
    registration: r.reg || r.registration || '',
    operator: r.owner || r.operator || null,
    dateFrom: r.dateFrom || r.registrationDate || null,
    dateTo: r.dateTo || null,
  }));

  return {
    typeName: (data.typeName as string) || null,
    airlineName: (data.airlineName as string) || null,
    builtDate:
      (data.rolloutDate as string) || (data.firstFlightDate as string) || null,
    imageUrl: (data.image?.url as string) || null,
    registrationHistory: history,
  };
}

// --- Mapper ---

function toProfile(record: any): AircraftProfile {
  return {
    msn: record.msn,
    currentRegistration: record.currentRegistration,
    icaoHex: record.icaoHex,
    icaoTypeCode: record.icaoTypeCode,
    typeName: record.typeName,
    manufacturer: record.manufacturer,
    builtDate: record.builtDate,
    registeredOwners: record.registeredOwners,
    airlineName: record.airlineName,
    operatorFlagCode: record.operatorFlagCode,
    photos: (record.photos as AircraftPhoto[]) || [],
    imageUrl: record.imageUrl,
    registrationHistory:
      (record.registrationHistory as RegistrationHistoryEntry[]) || [],
    fetchedAt:
      record.fetchedAt instanceof Date
        ? record.fetchedAt.toISOString()
        : String(record.fetchedAt),
    fetchErrors: record.fetchErrors,
    sources: {
      hexdb: !!record.icaoHex,
      planespotters:
        Array.isArray(record.photos) && record.photos.length > 0,
      aerodatabox: !!record.typeName || !!record.airlineName,
    },
  };
}
