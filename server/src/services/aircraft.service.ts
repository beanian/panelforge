import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { config } from '../config';
import { lookupByMsn } from '../data/bae146-production';
import { planeloggerService } from './planelogger.service';
import type {
  AircraftProfile,
  AircraftPhoto,
  RegistrationHistoryEntry,
} from '@panelforge/shared';

const CACHE_TTL_MS = config.aircraftCacheTtlHours * 60 * 60 * 1000;

export const aircraftService = {
  /**
   * Get aircraft profile by MSN.
   *
   * Resolution chain for operator history & registrations:
   * 1. Check DB cache (if valid TTL and has registrationHistory)
   * 2. Check static BAe 146 production lookup table
   * 3. Try PlaneLogger by MSN (works for Avro RJ70/85/100 via construction list)
   * 4. Try PlaneLogger by registration hint (works for all if user provided one)
   *
   * Photos are fetched from Planespotters.net across all known registrations.
   */
  async getByMsn(
    msn: string,
    registration: string | null,
    forceRefresh = false,
  ): Promise<AircraftProfile> {
    let cleanMsn = msn.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    // BAe 146 MSNs always start with E — normalize if user entered just digits
    if (/^\d+$/.test(cleanMsn)) {
      cleanMsn = 'E' + cleanMsn;
    }
    if (!cleanMsn) {
      throw new AppError(400, 'Invalid MSN');
    }

    // Static fallback data
    const productionEntry = lookupByMsn(cleanMsn);

    // Check cache
    const existing = await prisma.aircraftCache.findUnique({
      where: { msn: cleanMsn },
    });

    if (!forceRefresh && existing) {
      const age = Date.now() - existing.fetchedAt.getTime();
      if (age < CACHE_TTL_MS) {
        return toProfile(existing, productionEntry);
      }
    }

    const regHint =
      registration?.toUpperCase().replace(/[^A-Z0-9-]/g, '') || null;

    // Resolve operator history and registrations
    const resolved = await resolveAircraft(
      cleanMsn,
      regHint,
      productionEntry,
      existing,
    );

    // Fetch photos from Planespotters across all known registrations
    const errors: string[] = [];
    let photos: AircraftPhoto[] = [];

    if (resolved.allRegistrations.length > 0) {
      try {
        photos = await fetchAllPhotos(resolved.allRegistrations);
      } catch (e) {
        errors.push(`planespotters: ${e}`);
      }
    } else {
      errors.push('no registrations available for photo lookup');
    }

    // Upsert cache
    const cacheData = {
      msn: cleanMsn,
      currentRegistration: resolved.currentRegistration,
      icaoHex: null,
      icaoTypeCode: null,
      manufacturer: null,
      registeredOwners: null,
      operatorFlagCode: null,
      typeName: resolved.typeName,
      airlineName: resolved.operator,
      builtDate: null,
      imageUrl: null,
      registrationHistory: resolved.history as any,
      photos: photos as any,
      fetchedAt: new Date(),
      fetchErrors: errors.length > 0 ? errors.join('; ') : null,
    };

    const record = await prisma.aircraftCache.upsert({
      where: { msn: cleanMsn },
      update: cacheData,
      create: cacheData,
    });

    return toProfile(record, productionEntry);
  },

  async listCached(): Promise<AircraftProfile[]> {
    const records = await prisma.aircraftCache.findMany({
      orderBy: { msn: 'asc' },
    });
    return records.map((r) => toProfile(r, lookupByMsn(r.msn)));
  },
};

// --- Aircraft resolution ---

interface ResolvedAircraft {
  currentRegistration: string | null;
  typeName: string | null;
  operator: string | null;
  status: string | null;
  history: RegistrationHistoryEntry[];
  allRegistrations: string[];
}

import type { Bae146Entry } from '../data/bae146-production';

async function resolveAircraft(
  msn: string,
  regHint: string | null,
  productionEntry: Bae146Entry | null,
  existing: any,
): Promise<ResolvedAircraft> {
  // 1. Check static table (most reliable for known aircraft)
  if (productionEntry) {
    return {
      currentRegistration: regHint || productionEntry.registration,
      typeName: productionEntry.type,
      operator: productionEntry.operator,
      status: productionEntry.status,
      history: productionEntry.operatorHistory,
      allRegistrations: productionEntry.allRegistrations,
    };
  }

  // 2. Check if DB cache already has operator history (from a previous PlaneLogger fetch)
  const dbHistory = parseHistory(existing?.registrationHistory);
  if (dbHistory.length > 0) {
    const allRegs = [...new Set(dbHistory.map((h) => h.registration))];
    const lastEntry = dbHistory[dbHistory.length - 1];
    return {
      currentRegistration:
        regHint || lastEntry.registration || existing?.currentRegistration,
      typeName: existing?.typeName ?? null,
      operator: lastEntry.operator || existing?.airlineName || null,
      status: null,
      history: dbHistory,
      allRegistrations: allRegs,
    };
  }

  // 3. Try PlaneLogger by MSN (works for Avro RJ70/85/100)
  try {
    const plResult = await planeloggerService.lookupByMsn(msn);
    if (plResult) {
      const lastEntry =
        plResult.operatorHistory[plResult.operatorHistory.length - 1];
      return {
        currentRegistration: regHint || plResult.registration,
        typeName: plResult.type,
        operator: lastEntry?.operator || null,
        status: plResult.status,
        history: plResult.operatorHistory,
        allRegistrations: plResult.allRegistrations,
      };
    }
  } catch {
    // PlaneLogger unavailable — continue with fallbacks
  }

  // 4. Try PlaneLogger by registration hint
  const reg = regHint || existing?.currentRegistration;
  if (reg) {
    try {
      const plResult = await planeloggerService.lookupByRegistration(reg);
      if (plResult) {
        const lastEntry =
          plResult.operatorHistory[plResult.operatorHistory.length - 1];
        return {
          currentRegistration: regHint || plResult.registration,
          typeName: plResult.type,
          operator: lastEntry?.operator || null,
          status: plResult.status,
          history: plResult.operatorHistory,
          allRegistrations: plResult.allRegistrations,
        };
      }
    } catch {
      // PlaneLogger unavailable — continue with minimal data
    }
  }

  // 5. Minimal fallback — just the registration hint
  return {
    currentRegistration: reg || null,
    typeName: null,
    operator: null,
    status: null,
    history: [],
    allRegistrations: reg ? [reg] : [],
  };
}

// --- Helpers ---

function parseHistory(json: any): RegistrationHistoryEntry[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (e: any) =>
      e && typeof e.registration === 'string' && typeof e.operator === 'string',
  );
}

// --- Planespotters photo fetchers ---

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

/** Keywords in Planespotters photo URLs that identify BAe 146 / Avro RJ family */
const BAE146_LINK_PATTERNS = ['146', 'avro', 'rj85', 'rj100', 'rj70'];

function isBae146Photo(link: string): boolean {
  const lower = link.toLowerCase();
  return BAE146_LINK_PATTERNS.some((p) => lower.includes(p));
}

async function fetchPlanespotters(reg: string): Promise<AircraftPhoto[]> {
  const res = await fetch(
    `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`,
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.photos || [])
    .filter((p: any) => isBae146Photo(p.link || ''))
    .slice(0, 10)
    .map((p: any) => ({
      id: String(p.id),
      thumbnailUrl: p.thumbnail_large?.src || p.thumbnail?.src || '',
      largeUrl: p.thumbnail_large?.src || '',
      link: p.link || '',
      photographer: p.photographer || 'Unknown',
    }));
}

// --- Mapper ---

function toProfile(
  record: any,
  productionEntry: Bae146Entry | null,
): AircraftProfile {
  const dbHistory = parseHistory(record.registrationHistory);
  const registrationHistory: RegistrationHistoryEntry[] =
    productionEntry?.operatorHistory ??
    (dbHistory.length > 0 ? dbHistory : []);

  return {
    msn: record.msn,
    currentRegistration: record.currentRegistration,
    typeName: productionEntry?.type ?? record.typeName,
    operator: productionEntry?.operator ?? record.airlineName,
    status: productionEntry?.status ?? null,
    photos: (record.photos as AircraftPhoto[]) || [],
    registrationHistory,
    fetchedAt:
      record.fetchedAt instanceof Date
        ? record.fetchedAt.toISOString()
        : String(record.fetchedAt),
    fetchErrors: record.fetchErrors,
  };
}
