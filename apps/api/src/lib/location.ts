const EARTH_RADIUS_KM = 6371;
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory reverse-geocode cache keyed by truncated coords (±0.001°, ~100m grid)
const cityCache = new Map<string, { value: string | null; expires: number }>();

/**
 * Shifts coordinates randomly within [0.8km, 1.5km] using a random bearing.
 * Ensures raw stored coordinates are never sent directly to clients.
 */
export function fuzzCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  const MIN_KM   = 0.8;
  const MAX_KM   = 1.5;
  const distance = MIN_KM + Math.random() * (MAX_KM - MIN_KM);
  const bearing  = Math.random() * 2 * Math.PI;

  const latRad  = (lat * Math.PI) / 180;
  const lngRad  = (lng * Math.PI) / 180;
  const angDist = distance / EARTH_RADIUS_KM;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angDist) +
    Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearing)
  );
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearing)  * Math.sin(angDist) * Math.cos(latRad),
    Math.cos(angDist) - Math.sin(latRad)   * Math.sin(newLatRad)
  );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}

/**
 * Reverse-geocodes coordinates to a human-readable city/region string.
 * Results are cached in memory with a 24h TTL to avoid hitting Nominatim too often.
 * Returns null if the lookup fails or yields no usable name.
 */
export async function getCity(lat: number, lng: number): Promise<string | null> {
  // Cache key at ~110m precision (0.001° ≈ 111m)
  const key    = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = cityCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AceMate/1.0 (tennis social platform; contact@acemate.app)' },
    });
    if (!res.ok) return null;

    const data = await res.json() as {
      address?: {
        city?:         string;
        town?:         string;
        village?:      string;
        municipality?: string;
        county?:       string;
        state?:        string;
      };
    };

    const city   = data.address?.city ?? data.address?.town ?? data.address?.village ??
                   data.address?.municipality ?? data.address?.county ?? null;
    const region = data.address?.state ?? null;
    const parts  = [city, region].filter(Boolean);
    const value  = parts.length ? parts.join(', ') : null;

    cityCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
    return value;
  } catch {
    return null;
  }
}
