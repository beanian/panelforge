/**
 * PlaneLogger.com scraper for BAe 146 / Avro RJ registration history.
 *
 * PlaneLogger exposes server-side-fetchable HTML pages with structured
 * registration history tables. The Avro RJ construction lists (RJ70, RJ85,
 * RJ100) have inline data mapping MSN → registration. The older BAe 146
 * lists are JS-rendered and can't be scraped this way, so those need a
 * registration hint.
 *
 * This service is a supplement to the static lookup table — it's used
 * when a user adds a new MSN that isn't already in the table.
 */

import type { RegistrationHistoryEntry } from '@panelforge/shared';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BASE = 'https://www.planelogger.com';

// --- Construction list index (MSN → PlaneLogger registration URL) ---

interface ConstructionListEntry {
  msn: string;
  registration: string;
  plUrl: string; // e.g. /Aircraft/Registration/5A-FLA/424454
}

let constructionListIndex: Map<string, ConstructionListEntry> | null = null;

/**
 * Build an in-memory index of MSN → registration from PlaneLogger's
 * Avro RJ construction list pages (RJ70, RJ85, RJ100). These three
 * models have inline HTML data. The older BAe 146 models are JS-rendered
 * and not included.
 *
 * Cached after first build — only makes 3 HTTP requests total.
 */
async function getConstructionListIndex(): Promise<
  Map<string, ConstructionListEntry>
> {
  if (constructionListIndex) return constructionListIndex;

  const index = new Map<string, ConstructionListEntry>();
  const models = ['RJ70', 'RJ85', 'RJ100'];

  const results = await Promise.allSettled(
    models.map(async (model) => {
      const res = await fetch(
        `${BASE}/Aircraft/ConstructionList/${encodeURIComponent(model)}`,
        { headers: { 'User-Agent': USER_AGENT } },
      );
      if (!res.ok) return [];
      const html = await res.text();
      return parseConstructionList(html);
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const entry of result.value) {
        index.set(entry.msn.toUpperCase(), entry);
      }
    }
  }

  constructionListIndex = index;
  return index;
}

/**
 * Parse a PlaneLogger construction list page to extract MSN → registration mappings.
 *
 * Actual HTML row structure:
 *   <td><a href="/Aircraft/Registration/5A-FLA/424454">E3232</a></td>
 *   <td></td>
 *   <td>RJ100</td>
 *   <td><a href="/Aircraft/Registration/5A-FLA/424454">5A-FLA</a></td>
 *   <td>Air Libya</td>
 *   <td>Scrapped</td>
 */
function parseConstructionList(html: string): ConstructionListEntry[] {
  const entries: ConstructionListEntry[] = [];

  // Match MSN link followed by any number of <td> elements, then registration link
  const pattern =
    /<td><a href="(\/Aircraft\/Registration\/[^"]+)">(E\d+)<\/a><\/td>[\s\S]*?<td><a href="\/Aircraft\/Registration\/[^"]*">([A-Z0-9-]+)<\/a><\/td>/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    entries.push({
      msn: match[2],
      registration: match[3],
      plUrl: match[1],
    });
  }
  return entries;
}

// --- Registration page scraper ---

export interface PlaneLoggerResult {
  registration: string;
  type: string | null;
  serial: string | null;
  operatorHistory: RegistrationHistoryEntry[];
  allRegistrations: string[];
  status: string | null;
}

/**
 * Fetch a PlaneLogger aircraft registration page and parse the full
 * operator history table.
 */
async function fetchRegistrationPage(
  registrationOrUrl: string,
): Promise<PlaneLoggerResult | null> {
  // If it's a full PlaneLogger URL path, use it; otherwise search by registration
  const url = registrationOrUrl.startsWith('/')
    ? `${BASE}${registrationOrUrl}`
    : `${BASE}/Aircraft/Registration/${encodeURIComponent(registrationOrUrl)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
  });
  if (!res.ok) return null;

  const html = await res.text();
  return parseRegistrationPage(html);
}

/**
 * Parse a PlaneLogger registration page HTML to extract operator history.
 *
 * Expected table structure:
 * <table class="RegistrationList">
 *   <tr>
 *     <td>...</td>
 *     <td><a href="...">TC-THA</a></td>
 *     <td><a href="...">Turkish Airlines</a></td>
 *     <td>22.07.93</td>
 *     <td>Left Fleet</td>
 *   </tr>
 * </table>
 */
function parseRegistrationPage(html: string): PlaneLoggerResult | null {
  // Extract serial/MSN
  const serialMatch = html.match(
    /<td[^>]*id="serial"[^>]*>0?([A-Z0-9]+)<\/td>/i,
  );
  const serial = serialMatch?.[1] ?? null;

  // Extract model/type
  const modelMatch = html.match(
    /<a href="\/Aircraft\/ConstructionList\/[^"]*"[^>]*id="modelLink"[^>]*>([^<]+)<\/a>/i,
  );
  const type = modelMatch?.[1] ?? null;

  // Extract the registration history table
  const tableMatch = html.match(
    /<!-- Registration History -->[\s\S]*?<table[^>]*class="RegistrationList"[^>]*>([\s\S]*?)<\/table>/i,
  );
  if (!tableMatch) return null;

  const tableHtml = tableMatch[1];

  // Parse each row — skip header row
  const rowPattern =
    /<tr[^>]*>\s*<td>[\s\S]*?<\/td>\s*<td><a[^>]*>([A-Z0-9-]+)<\/a><\/td>\s*<td><a[^>]*>([^<]+)<\/a><\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g;

  const history: RegistrationHistoryEntry[] = [];
  const allRegs = new Set<string>();
  let lastStatus: string | null = null;

  let rowMatch;
  while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
    const reg = rowMatch[1].trim();
    const operator = rowMatch[2].trim();
    const delivered = rowMatch[3].trim() || null;
    const status = rowMatch[4].trim() || null;

    allRegs.add(reg);
    lastStatus = status;

    history.push({
      registration: reg,
      operator,
      dateFrom: delivered,
      dateTo: null, // PlaneLogger shows delivery date, not departure date
    });
  }

  // Fill in dateTo from the next entry's dateFrom
  for (let i = 0; i < history.length - 1; i++) {
    history[i].dateTo = history[i + 1].dateFrom;
  }

  if (history.length === 0) return null;

  // Determine the current registration (last in the list)
  const currentReg = history[history.length - 1].registration;

  // Normalize status
  let normalizedStatus: string | null = null;
  if (lastStatus) {
    const lower = lastStatus.toLowerCase();
    if (lower.includes('scrap')) normalizedStatus = 'scrapped';
    else if (lower.includes('store')) normalizedStatus = 'stored';
    else if (lower.includes('active') || lower === 'in fleet')
      normalizedStatus = 'active';
    else if (lower.includes('left')) normalizedStatus = 'unknown';
  }

  return {
    registration: currentReg,
    type,
    serial,
    operatorHistory: history,
    allRegistrations: [...allRegs],
    status: normalizedStatus,
  };
}

// --- Public API ---

export const planeloggerService = {
  /**
   * Look up an aircraft by MSN. Tries:
   * 1. The RJ construction list index (MSN → registration → full page)
   * 2. Returns null if not found (caller can try by registration instead)
   */
  async lookupByMsn(msn: string): Promise<PlaneLoggerResult | null> {
    const cleanMsn = msn.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const index = await getConstructionListIndex();
    const entry = index.get(cleanMsn);
    if (!entry) return null;

    // Fetch the full registration page
    return fetchRegistrationPage(entry.plUrl);
  },

  /**
   * Look up an aircraft by registration. Fetches the PlaneLogger page
   * and parses the full operator history.
   */
  async lookupByRegistration(
    registration: string,
  ): Promise<PlaneLoggerResult | null> {
    return fetchRegistrationPage(registration);
  },
};
