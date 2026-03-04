/**
 * BAe 146 / Avro RJ production lookup table.
 *
 * Maps MSN (manufacturer serial number) to known registration(s) and basic
 * metadata. The BAe 146/Avro RJ is a closed production run (~394 airframes),
 * so this table can be populated incrementally as panels are sourced.
 *
 * External aviation APIs (hexdb, AirLabs, AeroDataBox) don't reliably cover
 * retired fleets, so this static table is the primary data source for aircraft
 * info. Only Planespotters.net is used for live photo lookups.
 *
 * Sources: PlaneLogger, Aussie Airliners, Danish Aircraft Register, ABPic
 */

export interface OperatorHistoryEntry {
  registration: string;
  operator: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface Bae146Entry {
  msn: string;
  /** Most recent (or last-known) registration */
  registration: string;
  /** All known registrations, most recent first — used for photo searches */
  allRegistrations: string[];
  type: string;
  /** Last known operator */
  operator: string | null;
  status: 'active' | 'stored' | 'scrapped' | 'unknown';
  /** Chronological operator history */
  operatorHistory: OperatorHistoryEntry[];
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
    operatorHistory: [
      { registration: 'TC-THA', operator: 'Turkish Airlines', dateFrom: 'Jul 1993', dateTo: 'Feb 2007' },
      { registration: 'G-CEIH', operator: 'Trident Jet Leasing', dateFrom: 'Feb 2007', dateTo: 'Apr 2013' },
      { registration: '5A-FLA', operator: 'Air Libya', dateFrom: 'Apr 2013', dateTo: 'Aug 2017' },
    ],
  },
  {
    msn: 'E2233',
    registration: 'CC-AJS',
    allRegistrations: ['CC-AJS', 'OY-RCE', 'HB-IXH'],
    type: 'Avro RJ85',
    operator: 'Aerovias DAP',
    status: 'unknown',
    operatorHistory: [
      { registration: 'HB-IXH', operator: 'Crossair', dateFrom: 'Jun 1993', dateTo: 'Mar 2002' },
      { registration: 'HB-IXH', operator: 'Swiss International Air Lines', dateFrom: 'Mar 2002', dateTo: 'Nov 2005' },
      { registration: 'HB-IXH', operator: 'Swiss European Air Lines', dateFrom: 'Nov 2005', dateTo: 'Nov 2007' },
      { registration: 'OY-RCE', operator: 'Atlantic Airways', dateFrom: 'Dec 2007', dateTo: 'May 2013' },
      { registration: 'CC-AJS', operator: 'Aerovias DAP', dateFrom: 'Jun 2013', dateTo: null },
    ],
  },
  {
    msn: 'E3137',
    registration: 'ZK-NZH',
    allRegistrations: ['ZK-NZH'],
    type: 'BAe 146-300',
    operator: 'Mount Cook Airline',
    status: 'scrapped',
    operatorHistory: [
      { registration: 'ZK-NZH', operator: 'Ansett New Zealand', dateFrom: 'Dec 1989', dateTo: 'Aug 2000' },
      { registration: 'ZK-NZH', operator: 'Qantas New Zealand', dateFrom: 'Sep 2000', dateTo: 'Apr 2001' },
      { registration: 'ZK-NZH', operator: 'Mount Cook Airline', dateFrom: 'Jun 2001', dateTo: 'Jan 2002' },
      { registration: 'ZK-NZH', operator: 'Ansett Australia (administrators)', dateFrom: 'Jan 2002', dateTo: 'Aug 2006' },
    ],
  },
  {
    msn: 'E1144',
    registration: 'G-OFOM',
    allRegistrations: ['G-OFOM', 'N3206T', 'PK-DTA', 'G-BSLP'],
    type: 'BAe 146-100',
    operator: 'Formula One Management',
    status: 'stored',
    operatorHistory: [
      { registration: 'G-BSLP', operator: 'British Aerospace', dateFrom: 'Jun 1990', dateTo: 'Jun 1990' },
      { registration: 'PK-DTA', operator: 'National Air Charter', dateFrom: 'Jun 1990', dateTo: 'Jan 1992' },
      { registration: 'N3206T', operator: 'Macro Data USA', dateFrom: 'Jan 1992', dateTo: 'May 1997' },
      { registration: 'N3206T', operator: 'Global Far East', dateFrom: 'May 1997', dateTo: 'Jul 1997' },
      { registration: 'N3206T', operator: 'Executive Airline Corp', dateFrom: 'Jul 1997', dateTo: 'Feb 2000' },
      { registration: 'N3206T', operator: 'Motor Racing Developments', dateFrom: 'Feb 2000', dateTo: 'Mar 2000' },
      { registration: 'G-OFOM', operator: 'Formula One Management', dateFrom: 'Mar 2000', dateTo: null },
    ],
  },
];

/** Index by MSN for O(1) lookup */
const byMsn = new Map(bae146Production.map((e) => [e.msn, e]));

/** Look up an airframe by MSN. Returns null if not in the table. */
export function lookupByMsn(msn: string): Bae146Entry | null {
  return byMsn.get(msn.toUpperCase()) ?? null;
}
