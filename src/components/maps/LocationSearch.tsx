import { useState, useEffect, useRef, useCallback } from 'react';
import { PiMapPinBold, PiNavigationArrowBold, PiClockBold, PiXBold, PiSpinnerBold, PiMagnifyingGlassBold } from 'react-icons/pi';
import {
  getUserLocation,
  reverseGeocode,
  getRecentSearches,
  addRecentSearch,
} from '../../lib/maps';
import type { GeoSearchResult } from '../../lib/maps';
import T, { FONT } from '../../lib/theme';

/* ── Location Search — Nominatim (with proximity bias) + Photon in parallel ── */

// Haversine distance in km for ranking results by proximity to the user
function distKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/* Nominatim with a viewbox biased around the user (~50 km box) */
async function searchNominatim(query: string, userLat: number, userLng: number, signal?: AbortSignal): Promise<GeoSearchResult[]> {
  try {
    const dLat = 0.5, dLng = 0.5; // ≈ 55 km each side
    const viewbox = `${userLng - dLng},${userLat + dLat},${userLng + dLng},${userLat - dLat}`;
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      countrycodes: 'in',
      limit: '10',
      addressdetails: '1',
      viewbox,
      bounded: '0',
      dedupe: '1',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      signal, headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((f: any) => {
      const lat = parseFloat(f.lat), lng = parseFloat(f.lon);
      if (!isFinite(lat) || !isFinite(lng) || lat < 6 || lat > 38 || lng < 67 || lng > 98) return null;
      const addr = f.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
      const name = f.name || (f.display_name?.split(',')[0]) || query;
      return {
        name,
        coordinates: [lat, lng] as [number, number],
        address: f.display_name || '',
        city, country: 'India',
      } as GeoSearchResult;
    }).filter(Boolean) as GeoSearchResult[];
  } catch { return []; }
}

/* Photon (Komoot) — much better for street names + POIs, biased to lat/lon */
async function searchPhoton(query: string, userLat: number, userLng: number, signal?: AbortSignal): Promise<GeoSearchResult[]> {
  try {
    const params = new URLSearchParams({
      q: query, lat: String(userLat), lon: String(userLng), limit: '10', lang: 'en',
    });
    const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    const feats = data?.features || [];
    return feats.map((f: any) => {
      const [lng, lat] = f.geometry?.coordinates || [null, null];
      if (!isFinite(lat) || !isFinite(lng) || lat < 6 || lat > 38 || lng < 67 || lng > 98) return null;
      const p = f.properties || {};
      if (p.countrycode && p.countrycode !== 'IN') return null;
      const name = p.name || p.street || query;
      const cityBits = [p.district, p.city || p.locality, p.state].filter(Boolean).join(', ');
      const line = [p.street && `${p.street}${p.housenumber ? ' ' + p.housenumber : ''}`, cityBits].filter(Boolean).join(' · ');
      return {
        name,
        coordinates: [lat, lng] as [number, number],
        address: line || cityBits,
        city: p.city || p.locality || p.district || '',
        country: 'India',
      } as GeoSearchResult;
    }).filter(Boolean) as GeoSearchResult[];
  } catch { return []; }
}

/* Merge, dedupe by name+coords, sort by distance to user */
function mergeAndRank(results: GeoSearchResult[][], user: [number, number]): GeoSearchResult[] {
  const seen = new Map<string, GeoSearchResult>();
  for (const list of results) {
    for (const r of list) {
      const key = `${r.name.toLowerCase()}|${r.coordinates[0].toFixed(3)}|${r.coordinates[1].toFixed(3)}`;
      if (!seen.has(key)) seen.set(key, r);
    }
  }
  return Array.from(seen.values())
    .map(r => ({ ...r, __d: distKm(user, r.coordinates) } as any))
    .sort((a: any, b: any) => a.__d - b.__d)
    .slice(0, 10)
    .map(({ __d, ...r }: any) => r);
}

async function searchPlaces(query: string, userLat?: number, userLng?: number): Promise<GeoSearchResult[]> {
  const uLat = userLat ?? 28.3762;
  const uLng = userLng ?? 77.3149;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 7000);
  try {
    const [nomi, photon] = await Promise.all([
      searchNominatim(query, uLat, uLng, controller.signal),
      searchPhoton(query, uLat, uLng, controller.signal),
    ]);
    return mergeAndRank([photon, nomi], [uLat, uLng]);
  } finally { clearTimeout(t); }
}

async function resolveELocCoords(_eLoc: string, name: string, address: string): Promise<[number, number] | null> {
  const q = (address || name || '').trim();
  if (!q) return null;
  try {
    const r = await searchNominatim(q, 28.3762, 77.3149);
    if (r.length > 0) return r[0].coordinates;
  } catch {}
  return null;
}

/* ── Design tokens ── */
// Theme imported from shared file

export interface LocationSearchProps {
  placeholder?: string;
  onLocationSelect: (location: { name: string; coordinates: [number, number]; eLoc?: string }) => void;
  value?: string;
  icon?: 'pickup' | 'drop' | 'default';
  label?: string;
  disabled?: boolean;
}

export default function LocationSearch({
  placeholder = 'Search location...',
  onLocationSelect,
  value = '',
  icon = 'default',
  label,
  disabled = false,
}: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locatingCurrent, setLocatingCurrent] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUserLocation().then(c => setUserCoords(c)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setShowDropdown(value.length > 0 || focused);
      return;
    }
    setShowDropdown(true);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchPlaces(value, userCoords?.[0], userCoords?.[1]);
        setResults(data);
      } catch (err) {
        console.error('Location search failed:', err);
        setResults([]);
      } finally { setLoading(false); }
    }, 300);
  }, [focused, userCoords]);

  const handleSelectResult = async (result: GeoSearchResult) => {
    setQuery(result.name);
    setShowDropdown(false);
    setResults([]);
    setFocused(false);
    
    let finalCoords = result.coordinates;

    // If coordinates are 0,0, resolve via our multi-strategy resolver
    if (finalCoords[0] === 0 && finalCoords[1] === 0) {
      setLoading(true);
      
      const resolved = await resolveELocCoords(result.eLoc || '', result.name, result.address || '');
      if (resolved) {
        finalCoords = resolved;
      }
      
      setLoading(false);
    }
    
    // If still 0,0, proceed anyway — RideSearch will fallback to text-based filtering
    if (finalCoords[0] === 0 && finalCoords[1] === 0) {
    }

    addRecentSearch({ name: result.name, coordinates: finalCoords, eLoc: result.eLoc });
    onLocationSelect({ name: result.name, coordinates: finalCoords, eLoc: result.eLoc });
  };

  const handleUseCurrentLocation = async () => {
    setLocatingCurrent(true);
    try {
      const coords = await getUserLocation();
      setUserCoords(coords);
      const address = await reverseGeocode(coords[0], coords[1]);
      setQuery(address);
      setShowDropdown(false);
      addRecentSearch({ name: address, coordinates: coords });
      onLocationSelect({ name: address, coordinates: coords });
    } catch { console.error('Failed to get current location'); }
    finally { setLocatingCurrent(false); }
  };

  const handleClear = () => {
    setQuery(''); setResults([]); setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setFocused(true);
    if (query.length >= 2 && results.length > 0) setShowDropdown(true);
    else if (query.length === 0) setShowDropdown(true);
  };

  const dotColor = icon === 'pickup' ? T.green : icon === 'drop' ? T.red : T.blue;
  const recentSearches = getRecentSearches();

  return (
    <div style={{ position:'relative', width:'100%' }} ref={containerRef}>
      {label && (
        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:8, letterSpacing:1, textTransform:'uppercase' }}>{label}</label>
      )}
      <div style={{ position:'relative' }}>
        {/* Dot / Icon */}
        <div style={{
          position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', zIndex:2,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {icon === 'default' ? (
            <PiMapPinBold size={16} color={focused ? T.gold : 'rgba(255,255,255,0.55)'}/>
          ) : (
            <div style={{ width:10, height:10, borderRadius:'50%', background:dotColor, boxShadow:`0 0 8px ${dotColor}, 0 0 0 3px ${dotColor}22`, transition:'all 0.3s' }}/>
          )}
        </div>

        {/* Input */}
        <input ref={inputRef} type="text" value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleFocus} placeholder={placeholder} disabled={disabled}
          aria-label={label || placeholder}
          style={{
            width:'100%', padding:'14px 42px 14px 38px', borderRadius:14,
            border:`1.5px solid ${focused ? T.gold : 'rgba(255,255,255,0.12)'}`,
            background: 'rgba(0,0,0,0.28)',
            color:'white', fontSize:14, outline:'none', fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: focused ? `0 0 0 3px ${T.gold}22, 0 4px 16px rgba(0,0,0,0.35)` : '0 1px 3px rgba(0,0,0,0.2)',
            opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'text',
          }}/>

        {/* Right side */}
        <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center' }}>
          {loading ? (
            <div style={{ animation:'spin-slow 0.8s linear infinite', color:T.gold, display:'flex' }}><PiSpinnerBold size={16}/></div>
          ) : query.length > 0 ? (
            <button onClick={handleClear} aria-label="Clear" style={{
              padding:4, borderRadius:8, border:'none', background:'transparent', cursor:'pointer',
              color:'rgba(255,255,255,0.55)', transition:'all 0.2s', display:'flex',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background=`${T.red}22`;e.currentTarget.style.color=T.red;}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,0.55)';}}>
              <PiXBold size={14}/>
            </button>
          ) : (
            <PiMagnifyingGlassBold size={14} color="rgba(255,255,255,0.4)"/>
          )}
        </div>
      </div>

      {/* ── Dropdown (dark glass) ── */}
      {showDropdown && !disabled && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:60,
          background:'linear-gradient(180deg, rgba(21,34,64,0.98), rgba(10,17,40,0.98))',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:16,
          boxShadow:'0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          maxHeight:360, overflowY:'auto', overflowX:'hidden',
          animation:'slideDown 0.2s ease',
        }}>
          {/* Current location */}
          <button onClick={handleUseCurrentLocation} disabled={locatingCurrent} style={{
            width:'100%', textAlign:'left', padding:'14px 16px', border:'none',
            background:'linear-gradient(90deg, rgba(200,149,108,0.12), transparent)',
            cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:14, fontWeight:600,
            color:'white', borderBottom:'1px solid rgba(255,255,255,0.06)', transition:'background 0.2s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(200,149,108,0.2)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(90deg, rgba(200,149,108,0.12), transparent)';}}>
            <div style={{
              width:34, height:34, borderRadius:10, flexShrink:0,
              background:`linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color:'white',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:`0 6px 14px ${T.gold}55`,
            }}>
              {locatingCurrent
                ? <div style={{ animation:'spin-slow 0.8s linear infinite', display:'flex' }}><PiSpinnerBold size={16}/></div>
                : <PiNavigationArrowBold size={16}/>}
            </div>
            <div>
              <span style={{ fontWeight:700, fontSize:13, color:'white' }}>{locatingCurrent ? 'Getting location…' : 'Use current location'}</span>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:2 }}>Auto-detect via GPS</p>
            </div>
          </button>

          {/* Loading */}
          {loading && (
            <div style={{ padding:'18px 16px', textAlign:'center', color:'rgba(255,255,255,0.6)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <div style={{ animation:'spin-slow 0.8s linear infinite', display:'flex' }}><PiSpinnerBold size={14}/></div>
              Searching nearby places…
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && results.map((result, idx) => (
            <button key={`r-${idx}`} onClick={() => handleSelectResult(result)} style={{
              width:'100%', textAlign:'left', padding:'12px 16px', border:'none', background:'transparent',
              cursor:'pointer', display:'flex', alignItems:'flex-start', gap:10, fontSize:13, color:'white',
              transition:'background 0.15s', borderBottom: idx < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
              <div style={{
                width:30, height:30, borderRadius:9, flexShrink:0, marginTop:1,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <PiMapPinBold size={14} color={T.gold}/>
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <p style={{ fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13 }}>{result.name}</p>
                {(result.city || result.address) && (
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>
                    {result.city || result.address}
                  </p>
                )}
              </div>
            </button>
          ))}

          {/* No results */}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'rgba(255,255,255,0.55)', fontSize:13 }}>
              <PiMagnifyingGlassBold size={24} style={{ marginBottom:8, opacity:0.4, display:'inline-block' }}/>
              <p style={{ fontWeight:600, color:'white' }}>No places found for "{query}"</p>
              <p style={{ fontSize:11, marginTop:4 }}>Try a more specific name or a nearby landmark.</p>
            </div>
          )}

          {/* Recent searches */}
          {!loading && query.length === 0 && recentSearches.length > 0 && (
            <>
              <div style={{
                padding:'10px 16px', fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.5)',
                textTransform:'uppercase', letterSpacing:1.5, background:'rgba(255,255,255,0.03)',
                borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)',
              }}>
                Recent
              </div>
              {recentSearches.map((search, idx) => (
                <button key={`rec-${idx}`}
                  onClick={() => handleSelectResult({ name: search.name, coordinates: search.coordinates, address: search.name, eLoc: search.eLoc })}
                  style={{
                    width:'100%', textAlign:'left', padding:'10px 16px', border:'none', background:'transparent',
                    cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'rgba(255,255,255,0.75)',
                    transition:'background 0.15s',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';}}>
                  <PiClockBold size={14} color="rgba(255,255,255,0.4)"/>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{search.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
