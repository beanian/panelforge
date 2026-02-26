/**
 * BAe 146 / Avro RJ production lookup table.
 *
 * Maps MSN (manufacturer serial number) to known registration(s) and basic
 * metadata. The BAe 146/Avro RJ is a closed production run (~394 airframes),
 * so this table can be populated incrementally as panels are sourced.
 *
 * Sources: PlaneLogger, JetPhotos, ABPic, Planespotters.net
 */

export interface Bae146Entry {
  msn: string;
  /** Most recent (or last-known) registration */
  registration: string;
  /** All known registrations, most recent first */
  allRegistrations: string[];
  type: string;
  /** Last known operator */
  operator: string | null;
  status: 'active' | 'stored' | 'scrapped' | 'unknown';
}

/**
 * Known BAe 146 / Avro RJ airframes relevant to PanelForge.
 * Add entries here as new panels are sourced from additional aircraft.
 */
export const bae146Production: Bae146Entry[] = [
  {
    msn: 'E3232',
    registration: '5A-FLA',
    allRegistrations: ['5A-FLA', 'G-CEIH', 'TC-THA'],
    type: 'Avro RJ100',
    operator: 'Air Libya',
    status: 'scrapped',
  },
  {
    msn: 'E2233',
    registration: 'OY-RCE',
    allRegistrations: ['OY-RCE'],
    type: 'Avro RJ85',
    operator: 'Atlantic Airways',
    status: 'unknown',
  },
  {
    msn: 'E3137',
    registration: 'ZK-NZH',
    allRegistrations: ['ZK-NZH'],
    type: 'BAe 146-300',
    operator: 'Mount Cook Airline',
    status: 'scrapped',
  },
  {
    msn: 'E1144',
    registration: 'G-OFOM',
    allRegistrations: ['G-OFOM'],
    type: 'BAe 146-100',
    operator: null,
    status: 'unknown',
  },
];

/** Index by MSN for O(1) lookup */
const byMsn = new Map(bae146Production.map((e) => [e.msn, e]));

/** Look up an airframe by MSN. Returns null if not in the table. */
export function lookupByMsn(msn: string): Bae146Entry | null {
  return byMsn.get(msn.toUpperCase()) ?? null;
}
