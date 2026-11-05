export type { GeoLocation } from '../types';
import type { GeoLocation } from '../types';

const MAPPLS_KEY = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;

// Default location: Delhi NCR area
const DEFAULT_LOCATION: [number, number] = [28.6139, 77.2090];
const LAST_LOCATION_KEY = 'liftloop_last_location';
const ROUTE_CACHE_KEY = 'liftloop_route_cache';

// ============= TYPES =============

export interface RouteInfo {
  distance: number; // km
  duration: number; // minutes
  geometry: [number, number][];
  instructions?: RouteInstruction[];
}

export interface RouteInstruction {
  type: number;
  instruction: string;
  distance: number;
  duration: number;
}

export interface RouteResult {
  distance: number;
  duration: number;
  coordinates: [number, number][];
  instructions: Array<{
    text: string;
    distance: number;
    duration: number;
  }>;
}

export interface GeoSearchResult {
  name: string;
  coordinates: [number, number]; // [lat, lng]
  address: string;
  city?: string;
  country?: string;
  eLoc?: string; // MapmyIndia location code
}

// ============= ROUTE CACHE =============

interface CacheEntry {
  result: RouteInfo;
  timestamp: number;
}

function getCacheKey(start: [number, number], end: [number, number]): string {
  return `${start[0].toFixed(4)},${start[1].toFixed(4)}-${end[0].toFixed(4)},${end[1].toFixed(4)}`;
}

function getCachedRoute(key: string): RouteInfo | null {
  try {
    const cache = JSON.parse(localStorage.getItem(ROUTE_CACHE_KEY) || '{}');
    const entry: CacheEntry = cache[key];
    if (entry && Date.now() - entry.timestamp < 30 * 60 * 1000) { // 30 min TTL
      return entry.result;
    }
  } catch {}
  return null;
}

function setCachedRoute(key: string, result: RouteInfo): void {
  try {
    const cache = JSON.parse(localStorage.getItem(ROUTE_CACHE_KEY) || '{}');
    // Keep only last 20 entries
    const keys = Object.keys(cache);
    if (keys.length > 20) {
      delete cache[keys[0]];
    }
    cache[key] = { result, timestamp: Date.now() };
    localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ============= ROUTE CALCULATION (Mappls primary, ORS fallback) =============

export async function calculateRoute(
  start: GeoLocation | [number, number],
  end: GeoLocation | [number, number],
  profile: 'driving-car' | 'cycling-regular' = 'driving-car'
): Promise<RouteInfo> {
  const startCoords: [number, number] = Array.isArray(start) ? start : [start.lat, start.lng];
  const endCoords: [number, number] = Array.isArray(end) ? end : [end.lat, end.lng];

  // Check cache first
  const cacheKey = `${profile}:${getCacheKey(startCoords, endCoords)}`;
  const cached = getCachedRoute(cacheKey);
  if (cached) return cached;

  // ORS is the configured routing backend; Mappls supplies the map display.
  const result = await calculateRouteORS(startCoords, endCoords, profile);
  setCachedRoute(cacheKey, result);
  return result;
}

async function calculateRouteORS(
  startCoords: [number, number],
  endCoords: [number, number],
  profile: string
): Promise<RouteInfo> {
  const response = await fetch(
    `/api/routes/ors?profile=${encodeURIComponent(profile)}&start=${startCoords[1]},${startCoords[0]}&end=${endCoords[1]},${endCoords[0]}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(`Route calculation failed: ${response.status}`);
  }

  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('No route found');

  const props = feature.properties.summary;
  const segments = feature.properties.segments || [];
  const instructions: RouteInstruction[] = [];
  for (const segment of segments) {
    for (const step of segment.steps || []) {
      instructions.push({
        type: step.type,
        instruction: step.instruction,
        distance: +(step.distance / 1000).toFixed(2),
        duration: +(step.duration / 60).toFixed(1),
      });
    }
  }

  return {
    distance: +(props.distance / 1000).toFixed(1),
    duration: +(props.duration / 60).toFixed(0),
    geometry: feature.geometry.coordinates.map(
      (c: number[]) => [c[1], c[0]] as [number, number]
    ),
    instructions,
  };
}

/**
 * Calculate route and return in the RouteResult format
 */
export async function getRoute(
  start: [number, number],
  end: [number, number],
  profile: 'driving-car' | 'cycling-regular' = 'driving-car'
): Promise<RouteResult> {
  const info = await calculateRoute(start, end, profile);
  return {
    distance: info.distance,
    duration: info.duration,
    coordinates: info.geometry,
    instructions: (info.instructions || []).map((i) => ({
      text: i.instruction,
      distance: i.distance,
      duration: i.duration,
    })),
  };
}

// ============= GEOCODING (Mappls primary, ORS fallback) =============

export async function geocodeSearch(query: string): Promise<GeoLocation[]> {
  const response = await fetch(
    `/api/routes/ors/geocode?text=${encodeURIComponent(query)}&boundary.country=IN&size=5`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Geocode search failed');

  const data = await response.json();
  return data.features.map(
    (f: { geometry: { coordinates: number[] }; properties: { label: string } }) => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      address: f.properties.label,
    })
  );
}

export async function searchLocations(query: string): Promise<GeoSearchResult[]> {
  // 1. Nominatim primary (better precision for POIs and areas)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'LiftLoop/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return data.map((f: any) => ({
          name: f.name || f.display_name.split(',')[0],
          coordinates: [parseFloat(f.lat), parseFloat(f.lon)] as [number, number],
          address: f.display_name,
          city: f.address?.city || f.address?.town || f.address?.county || '',
          country: 'India',
        }));
      }
    }
  } catch {}

  // 2. Fallback to ORS
  const response = await fetch(
    `/api/routes/ors/geocode?text=${encodeURIComponent(query)}&boundary.country=IN&size=5`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Location search failed');

  const data = await response.json();
  return (data.features || []).map(
    (f: {
      geometry: { coordinates: number[] };
      properties: { name?: string; label?: string; locality?: string; county?: string; region?: string; country?: string };
    }) => ({
      name: f.properties.name || f.properties.label || 'Unknown',
      coordinates: [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number],
      address: f.properties.label || '',
      city: f.properties.locality || f.properties.county || f.properties.region || '',
      country: f.properties.country || 'India',
    })
  );
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // 1. Nominatim primary (better street-level precision, use zoom=18)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'LiftLoop/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.display_name) {
        const addr = data.address || {};
        const parts = [
          addr.house_number || '',
          addr.road || addr.amenity || addr.building || '',
          addr.neighbourhood || addr.suburb || addr.quarter || '',
          addr.city || addr.town || addr.village || addr.county || '',
        ].filter(Boolean);
        if (parts.length >= 2) return parts.slice(0, 3).join(', ');
        return data.display_name.split(',').slice(0, 3).join(',').trim();
      }
    }
  } catch {}

  // 2. Mappls REST key reverse geocode (best Indian addresses — sectors, roads, pins)
  try {
    const response = await fetch(
      `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/rev_geocode?lat=${lat}&lng=${lng}`,
      { headers: { Accept: 'application/json' } }
    );
    if (response.ok) {
      const data = await response.json();
      const r = data.results?.[0];
      if (r) {
        const parts = [
          r.houseNumber || '',
          r.street && r.street !== 'Unnamed Road' ? r.street : '',
          r.subSubLocality || r.subLocality || r.locality || '',
          r.city || r.district || '',
        ].filter(Boolean);
        if (parts.length >= 2) return parts.slice(0, 3).join(', ');
        if (r.formatted_address) return r.formatted_address.split('(')[0].trim();
      }
    }
  } catch {}

  // 3. ORS fallback
  try {
    const response = await fetch(
      `/api/routes/ors/geocode?action=reverse&lat=${lat}&lng=${lng}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await response.json();
    return data.features[0]?.properties?.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// ============= GEOLOCATION HELPERS =============

export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,  // Always get fresh position, no cache
    });
  });
}

export async function getUserLocation(): Promise<[number, number]> {
  try {
    const position = await getCurrentLocation();
    const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
    saveLastLocation(loc);
    return loc;
  } catch {
    throw new Error('Location access failed. Select your pickup on the map or search for it.');
  }
}

export function saveLastLocation(location: [number, number]): void {
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
  } catch {}
}

export function getLastLocation(): [number, number] {
  try {
    const stored = localStorage.getItem(LAST_LOCATION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 2) {
        return parsed as [number, number];
      }
    }
  } catch {}
  return DEFAULT_LOCATION;
}

// ============= DISTANCE UTILS =============

export function getDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371;
  const dLat = toRad(point2[0] - point1[0]);
  const dLng = toRad(point2[1] - point1[1]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1[0])) * Math.cos(toRad(point2[0])) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const remainder = m % 60;
  return remainder > 0 ? `${h}h ${remainder}m` : `${h}h`;
}

// ============= RECENT SEARCHES =============

const RECENT_SEARCHES_KEY = 'liftloop_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export interface RecentSearch {
  name: string;
  coordinates: [number, number];
  timestamp: number;
  eLoc?: string;
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Filter out poisoned [0,0] searches from previous buggy versions
      return parsed.filter((s: RecentSearch) => s.coordinates && (s.coordinates[0] !== 0 || s.coordinates[1] !== 0));
    }
  } catch {}
  return [];
}

export function addRecentSearch(search: Omit<RecentSearch, 'timestamp'>): void {
  // Don't save invalid locations
  if (!search.coordinates || (search.coordinates[0] === 0 && search.coordinates[1] === 0)) return;
  
  try {
    const recent = getRecentSearches()
      .filter((s) => s.name !== search.name)
      .slice(0, MAX_RECENT_SEARCHES - 1);
    recent.unshift({ ...search, timestamp: Date.now() });
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
  } catch {}
}

// ============= CLIENT-SIDE ELOC RESOLUTION =============
export async function resolveELocClientSide(eLoc: string, name: string): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 2000); // 2 second timeout to prevent hanging

    try {
      const mappls = (window as any).mappls;
      if (!mappls || !mappls.search) {
        clearTimeout(timeout);
        resolve(null);
        return;
      }
      mappls.search({ keyword: name, query: name, region: 'IND' }, (data: any) => {
        if (data && data.length > 0) {
          clearTimeout(timeout);
          const res = data.find((item: any) => item.eLoc === eLoc) || data[0];
          const lat = parseFloat(res.latitude || res.lat || '0');
          const lng = parseFloat(res.longitude || res.lng || '0');
          if (lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98) {
            resolve([lat, lng]);
            return;
          }
        }
        
        // Fallback: If mappls.search fails, try mappls.pinMarker with a dummy map or just try another text strategy
        clearTimeout(timeout);
        resolve(null);
      });
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

