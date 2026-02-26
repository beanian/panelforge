import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Aircraft lineage APIs
  airlabsApiKey: process.env.AIRLABS_API_KEY || '',
  aerodataboxApiKey: process.env.AERODATABOX_API_KEY || '',
  aircraftCacheTtlHours: parseInt(process.env.AIRCRAFT_CACHE_TTL_HOURS || '168', 10),
};
