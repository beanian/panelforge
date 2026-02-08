import { readFileSync } from 'fs';
import { join } from 'path';

export interface LvarEntry {
  name: string;
  sectionCode: string;
  sectionLabel: string;
}

interface LvarSection {
  label: string;
  description: string;
  lvars: string[];
}

interface LvarFile {
  _metadata: {
    total_lvars: number;
    sections: Record<string, number>;
  };
  [sectionCode: string]: LvarSection | any;
}

// Section code → panel section slug mapping
const SECTION_TO_SLUG: Record<string, string> = {
  overhead_fuel: 'fuel',
  overhead_electrical: 'electric',
  overhead_apu: 'apu',
  overhead_ice_protection: 'ice-protect',
  overhead_pressurisation: 'pressurisation',
  overhead_lights: 'lights-ac',
  overhead_fire_handles: 'engine-fire-detect',
  overhead_hydraulics: 'misc-hydraulic',
  overhead_centre_lower: 'lights-belts',
  overhead_engines: 'engines-ice',
};

// Reverse mapping: slug → section codes
const SLUG_TO_SECTIONS: Record<string, string[]> = {};
for (const [sectionCode, slug] of Object.entries(SECTION_TO_SLUG)) {
  if (!SLUG_TO_SECTIONS[slug]) SLUG_TO_SECTIONS[slug] = [];
  SLUG_TO_SECTIONS[slug].push(sectionCode);
}

// In-memory store
let allEntries: LvarEntry[] = [];
let sectionMap: Map<string, { label: string; entries: LvarEntry[] }> = new Map();

function loadData() {
  if (allEntries.length > 0) return;

  const filePath = join(__dirname, '..', '..', '..', 'samples', 'bae146_ovhd_lvars.json');
  const raw: LvarFile = JSON.parse(readFileSync(filePath, 'utf-8'));

  for (const [key, value] of Object.entries(raw)) {
    if (key === '_metadata') continue;
    const section = value as LvarSection;
    const entries: LvarEntry[] = section.lvars.map((name) => ({
      name,
      sectionCode: key,
      sectionLabel: section.label,
    }));
    sectionMap.set(key, { label: section.label, entries });
    allEntries.push(...entries);
  }
}

export const lvarReferenceService = {
  searchLvars(query: string, sectionCode?: string): LvarEntry[] {
    loadData();
    const q = query.toLowerCase();
    let pool = allEntries;
    if (sectionCode) {
      pool = sectionMap.get(sectionCode)?.entries ?? [];
    }
    return pool.filter((e) => e.name.toLowerCase().includes(q));
  },

  getLvarsBySection(sectionCode: string): LvarEntry[] {
    loadData();
    return sectionMap.get(sectionCode)?.entries ?? [];
  },

  getSections(): { code: string; label: string; count: number }[] {
    loadData();
    return Array.from(sectionMap.entries()).map(([code, { label, entries }]) => ({
      code,
      label,
      count: entries.length,
    }));
  },

  /**
   * Suggest LVARs for a pin based on component name and panel section slug.
   * Returns ranked matches.
   */
  suggestForPin(componentName: string, sectionSlug: string | null): LvarEntry[] {
    loadData();

    // Determine which LVAR sections to search
    const sectionCodes = sectionSlug ? (SLUG_TO_SECTIONS[sectionSlug] ?? []) : [];

    // Build search pool — prefer section-scoped, fall back to all
    let pool: LvarEntry[] = [];
    if (sectionCodes.length > 0) {
      for (const code of sectionCodes) {
        pool.push(...(sectionMap.get(code)?.entries ?? []));
      }
    }
    if (pool.length === 0) {
      pool = allEntries;
    }

    // Tokenize component name into search fragments
    // e.g. "L Fuel Pump" → ["l", "fuel", "pump"]
    const tokens = componentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (tokens.length === 0) return pool.slice(0, 10);

    // Score each LVAR by how many tokens match
    const scored = pool.map((entry) => {
      const lowerName = entry.name.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (lowerName.includes(token)) score++;
      }
      return { entry, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((s) => s.entry);
  },

  /** Get section codes for a panel section slug */
  getSectionCodesForSlug(slug: string): string[] {
    return SLUG_TO_SECTIONS[slug] ?? [];
  },

  /** Get all entries (for batch operations) */
  getAllEntries(): LvarEntry[] {
    loadData();
    return allEntries;
  },
};
