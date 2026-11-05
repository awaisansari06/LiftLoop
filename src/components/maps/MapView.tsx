import { useEffect, useState, useCallback, useRef } from 'react';
import { PiCrosshairBold, PiSpinnerBold, PiWarningBold, PiMapPinBold } from 'react-icons/pi';
import { getUserLocation, saveLastLocation } from '../../lib/maps';
import T, { FONT } from '../../lib/theme';

/* ── Types ── */
export interface MapMarker {
  id: string;
  position: [number, number]; // [lat, lng]
  type: 'current' | 'pickup' | 'drop' | 'vehicle';
  vehicleType?: 'bike' | 'car';
  popup?: string;
  draggable?: boolean;
  onDragEnd?: (latlng: { lat: number; lng: number }) => void;
}

export interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  route?: [number, number][];
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  height?: string;
  fullscreen?: boolean;
  showLocateButton?: boolean;
  className?: string;
}

const MAPPLS_REST_KEY = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;

/* ── Design tokens ── */
// Theme imported from shared file

/* ── Global map instance for eLoc resolution ── */
let globalMapInstance: any = null;
export function getMapInstance(): any { return globalMapInstance; }
export function setMapInstance(map: any) { globalMapInstance = map; }

/* ── Shared SDK loader: retry a transient network failure once ── */
let sdkPromise: Promise<void> | null = null;
export function loadMapplsSDK(): Promise<void> {
  if ((window as any).mappls?.Map) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  const key = MAPPLS_REST_KEY;
  if (!key) return Promise.reject(new Error('NEXT_PUBLIC_MAPPLS_API_KEY is missing. Add it to .env.local and restart the app.'));
  const attempt = () => new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    let poll: number | undefined;
    const finish = (message?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      script.onload = script.onerror = null;
      if (message) { script.remove(); reject(new Error(message)); }
      else resolve();
    };
    const timer = window.setTimeout(() => finish('Mappls did not finish loading. Check your connection and Web Maps allocation, then retry.'), 25000);
    script.src = 'https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=' + encodeURIComponent(key) + '&layer=vector';
    script.async = true;
    script.onload = () => {
      // Some SDK responses initialize their dependencies after the script load event.
      const ready = () => { if ((window as any).mappls?.Map) finish(); };
      ready();
      if (!settled) poll = window.setInterval(ready, 100);
    };
    script.onerror = () => finish('Mappls could not be reached. Check your connection, static key and Web Maps allocation, then retry.');
    document.head.appendChild(script);
  });
  sdkPromise = attempt().catch(() => {
    if ((window as any).mappls?.Map) return;
    return attempt();
  }).catch(error => { sdkPromise = null; throw error; });
  return sdkPromise;
}

/* ── Marker icon helpers ── */
function getMarkerHTML(type: MapMarker['type'], vehicleType?: string): string {
  switch (type) {
    case 'current':
      return `<div style="width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 12px rgba(27,43,75,0.5)"></div>`;
    case 'pickup':
      return `<div style="width:28px;height:28px;border-radius:8px;background:#14B8A6;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(20,184,166,0.35)">A</div>`;
    case 'drop':
      return `<div style="width:28px;height:28px;border-radius:8px;background:#F43F5E;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(244,63,94,0.35)">B</div>`;
    case 'vehicle':
      return `<div style="width:36px;height:36px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.15);font-size:20px">${vehicleType === 'bike' ? '🏍️' : '🚗'}</div>`;
    default:
      return `<div style="width:12px;height:12px;border-radius:50%;background:${T.navy};border:2px solid white;box-shadow:0 2px 8px rgba(27,43,75,0.3)"></div>`;
  }
}

/* ── Unique ID counter ── */
let mapIdCounter = 0;

/* ── Main Component ── */
export default function MapView({
  center,
  zoom = 13,
  markers = [],
  route,
  onMapClick,
  height = '500px',
  fullscreen = false,
  showLocateButton = true,
  className = '',
}: MapViewProps) {
  const [mapContainerId] = useState(() => `mappls-map-${++mapIdCounter}`);
  const mapInstanceRef = useRef<any>(null);
  const mapClickRef = useRef(onMapClick);
  useEffect(() => { mapClickRef.current = onMapClick; }, [onMapClick]);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [userCenter, setUserCenter] = useState<[number, number]>(center || [28.3670, 77.3240]);
  const [locationResolved, setLocationResolved] = useState(!!center);

  useEffect(() => {
    if (center) { setUserCenter(center); setLocationResolved(true); return; }
    getUserLocation().then(loc => { setUserCenter(loc); setLocationResolved(true); })
      .catch(() => setLocationResolved(true));
  }, [center]);

  // Re-center map when user location resolves
  useEffect(() => {
    if (mapInstanceRef.current && mapReady && locationResolved) {
      try {
        mapInstanceRef.current.setCenter({ lat: userCenter[0], lng: userCenter[1] });
        mapInstanceRef.current.setZoom(zoom || 14);
      } catch (e) { console.warn('Re-center error:', e); }
    }
  }, [userCenter, mapReady, locationResolved]);

  // Initialize map
  useEffect(() => {
    let mounted = true;
    let initialized = false;

    async function initMap() {
      try {
        await loadMapplsSDK();
        if (!mounted) return;

        // Wait for DOM to be ready
        await new Promise(r => setTimeout(r, 100));
        const el = document.getElementById(mapContainerId);
        if (!el || !mounted) return;

        const mappls = (window as any).mappls;
        if (!mappls?.Map) throw new Error('Mappls SDK not available');

        const mapInstance = new mappls.Map(mapContainerId, {
          center: { lat: userCenter[0], lng: userCenter[1] },
          zoom: zoom || 14,
          zoomControl: true,
          location: true,
          search: false,
          clickableIcons: false, // Prevents native POI popups from swallowing clicks
        });

        const onLoad = () => {
          if (!mounted || initialized) return;
          initialized = true;
          mapInstanceRef.current = mapInstance;
          setMapInstance(mapInstance); // Store globally for eLoc resolution
          setMapReady(true);
          setLoading(false);

          // Try to restrict to India bounds (if supported)
          try { mapInstance.setMaxBounds?.([[67.0, 6.0], [97.5, 37.5]]); } catch {} // Mapbox format: [lng, lat]
          try { mapInstance.setMinZoom?.(5); } catch {}

          {
            try {
              mapInstance.addListener('click', (e: any) => {
                const ll = e?.lngLat || e?.latlng;
                if (ll) mapClickRef.current?.({ lat: ll.lat, lng: ll.lng });
              });
            } catch {}
          }
        };

        // Bind load event with fallback
        try {
          mapInstance.addListener('load', onLoad);
        } catch {
          setTimeout(onLoad, 3000);
        }

        // Safety timeout — if load event never fires
        setTimeout(() => {
          if (mounted && !mapReady && mapInstance) {
            onLoad();
          }
        }, 8000);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load map. Please check your connection and retry.');
        setLoading(false);
      }
    }

    initMap();

    return () => {
      mounted = false;
      try { popupRef.current?.remove?.(); } catch {}
      popupRef.current = null;
      markersRef.current.forEach(m => { try { m.remove?.(); } catch {} });
      markersRef.current = [];
      if (polylineRef.current) { try { polylineRef.current.remove?.(); } catch {} }
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove?.(); } catch {}
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, [retryAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update center
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    try { mapInstanceRef.current.setCenter?.({ lat: userCenter[0], lng: userCenter[1] }); } catch {}
  }, [userCenter, mapReady]);

  // Update markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const mappls = (window as any).mappls;

    try { popupRef.current?.remove?.(); } catch {}
    popupRef.current = null;
    markersRef.current.forEach(m => { try { m.remove?.(); m.setMap?.(null); } catch {} });
    markersRef.current = [];

    markers.forEach(marker => {
      try {
        const htmlContent = getMarkerHTML(marker.type, marker.vehicleType);
        
        let mWidth = 28, mHeight = 28;
        if (marker.type === 'current') { mWidth = 18; mHeight = 18; }
        else if (marker.type === 'vehicle') { mWidth = 36; mHeight = 36; }
        
        const mapMarker = new mappls.Marker({
          map: mapInstanceRef.current,
          position: { lat: marker.position[0], lng: marker.position[1] },
          html: htmlContent,
          width: mWidth,
          height: mHeight,
          draggable: marker.draggable || false,
        });

        if (marker.popup) {
          mapMarker.addListener?.('click', () => {
            try {
              popupRef.current?.remove?.();
              // Mappls requires both map and position when constructing a popup.
              const position = mapMarker.getPosition?.() || { lat: marker.position[0], lng: marker.position[1] };
              const text = String(marker.popup).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]!);
              popupRef.current = new mappls.InfoWindow({
                map: mapInstanceRef.current,
                position,
                content: `<div style="padding:8px 14px;font-family:system-ui,sans-serif;font-size:13px;font-weight:500;color:#0F172A;max-width:200px">${text}</div>`,
              });
            } catch (e) { console.warn('Popup error:', e); }
          });
        }

        if (marker.draggable && marker.onDragEnd) {
          try {
            mapMarker.addListener?.('dragend', () => {
              const pos = mapMarker.getPosition?.();
              if (pos) marker.onDragEnd?.({ lat: pos.lat, lng: pos.lng });
            });
          } catch {}
        }

        markersRef.current.push(mapMarker);
      } catch (err) {
        console.warn('Marker error:', err);
      }
    });

    // Fit bounds to show all markers
    if (markers.length >= 2) {
      try {
        const lats = markers.map(m => m.position[0]);
        const lngs = markers.map(m => m.position[1]);
        const sw = { lat: Math.min(...lats) - 0.01, lng: Math.min(...lngs) - 0.01 };
        const ne = { lat: Math.max(...lats) + 0.01, lng: Math.max(...lngs) + 0.01 };
        mapInstanceRef.current.fitBounds([[sw.lng, sw.lat], [ne.lng, ne.lat]], { padding: 80, maxZoom: 16 });
      } catch (e) { /* fitBounds not available */ }
    } else if (markers.length === 1) {
      try {
        if (mapInstanceRef.current.setCenter) {
          // Mapbox GL JS (underlying Mappls) strictly requires [longitude, latitude] array,
          // OR a {lat, lng} object. Passing [lat, lng] throws the map to Siberia, causing a grey screen!
          mapInstanceRef.current.setCenter({ lat: markers[0].position[0], lng: markers[0].position[1] });
          mapInstanceRef.current.setZoom(15);
        }
      } catch {}
    }
  }, [markers, mapReady]);

  // Update route polyline
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const mappls = (window as any).mappls;

    if (polylineRef.current) { try { polylineRef.current.remove?.(); polylineRef.current.setMap?.(null); } catch {} }
    polylineRef.current = null;

    if (route && route.length >= 2) {
      try {
        const path = route.map(p => ({ lat: p[0], lng: p[1] }));
        polylineRef.current = new mappls.Polyline({
          map: mapInstanceRef.current,
          path,
          strokeColor: T.blue,
          strokeWeight: 5,
          strokeOpacity: 0.85,
          fitbounds: true,
          fitboundOptions: { padding: 80, maxZoom: 16 },
        });
      } catch (e) {
        // Fallback: draw as basic line using L.polyline if available
        try {
          const path = route.map(p => [p[0], p[1]]);
          polylineRef.current = (window as any).L?.polyline?.(path, {
            color: T.navy, weight: 5, opacity: 0.85,
          })?.addTo?.(mapInstanceRef.current);
        } catch {}
      }
    }
  }, [route, mapReady]);

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      const loc = await getUserLocation();
      saveLastLocation(loc);
      setUserCenter(loc);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.setCenter?.({ lat: loc[0], lng: loc[1] });
          mapInstanceRef.current.setZoom?.(15);
        } catch {}
      }
    } catch {}
    finally { setLocating(false); }
  }, []);

  /* ── Error state ── */
  if (error) {
    return (
      <div className={className}
        style={{ height, display:'flex', alignItems:'center', justifyContent:'center',
          background:T.bg, borderRadius: fullscreen ? 0 : 20, border:`1px solid ${T.border}` }}>
        <div style={{ textAlign:'center', padding:24 }}>
          <PiWarningBold size={32} style={{ color: T.red, marginBottom: 8 }} />
          <p style={{ fontSize:14, color:T.muted, fontWeight:500 }}>{error}</p>
          <button onClick={() => { setError(null); setLoading(true); setRetryAttempt(value => value + 1); }}
            style={{ marginTop:12, padding:'10px 24px', borderRadius:12, border:'none',
              background:`linear-gradient(135deg,${T.blue},${T.green})`, color:'white', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}
      style={{ height, position:'relative', borderRadius: fullscreen ? 0 : 20, overflow:'hidden', border: `1px solid ${T.border}` }}>
      {loading && (
        <div style={{ position:'absolute', inset:0, zIndex:10, background:T.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <div style={{ position:'relative', width:64, height:64 }}>
              <div style={{ position:'absolute', inset:0, background:T.navyLight, borderRadius:'50%', animation:'pulse 1.5s infinite', opacity:0.5 }} />
              <div style={{ position:'absolute', inset:16, background:T.navy, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:T.shadow2, zIndex:2 }}>
                <PiMapPinBold size={20} color="white" />
              </div>
            </div>
            <p style={{ fontSize:14, color:T.navy, fontWeight:700, fontFamily:FONT.heading, letterSpacing:0.5 }}>Loading Map Engine</p>
          </div>
        </div>
      )}

      <div id={mapContainerId} style={{ width:'100%', height:'100%' }}/>

      {showLocateButton && mapReady && (
        <button onClick={handleLocate} title="Center on my location"
          style={{ position:'absolute', bottom:20, right:20, zIndex:20,
            width:42, height:42, borderRadius:12,
            background:'rgba(253,251,247,0.95)', backdropFilter:'blur(8px)',
            border:`1px solid ${T.border}`, boxShadow:'0 4px 16px rgba(0,0,0,0.08)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            color:T.navy, transition:'all 0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.background = T.blue50; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(253,251,247,0.95)'; }}>
          {locating ? (
            <div style={{ animation:'spin-slow 0.7s linear infinite', display:'flex' }}>
              <PiSpinnerBold size={18}/>
            </div>
          ) : (
            <PiCrosshairBold size={20}/>
          )}
        </button>
      )}
    </div>
  );
}
