import { useEffect, useRef, useState } from 'react';
import T, { FONT } from '../../lib/theme';
import { PiMapPinBold } from 'react-icons/pi';

interface MapplsMapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapClick?: (location: { lat: number; lng: number }) => void;
  markers?: Array<{
    position: { lat: number; lng: number };
    type: 'pickup' | 'drop' | 'current';
    label?: string;
  }>;
  height?: string;
}

// Theme imported from shared file

let mapplsScriptLoaded = false;
let mapplsScriptLoading = false;
let mapplsLoadCallbacks: (() => void)[] = [];

function loadMapplsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).mappls && mapplsScriptLoaded) {
      resolve();
      return;
    }

    if (mapplsScriptLoading) {
      mapplsLoadCallbacks.push(() => resolve());
      return;
    }

    mapplsScriptLoading = true;

    // Set global callback
    (window as any).initMapplsMap = () => {
      mapplsScriptLoaded = true;
      mapplsScriptLoading = false;
      resolve();
      mapplsLoadCallbacks.forEach(cb => cb());
      mapplsLoadCallbacks = [];
    };

    const script = document.createElement('script');
    script.src = `https://apis.mappls.com/advancedmaps/api/${apiKey}/map_sdk?v=3.0&callback=initMapplsMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapplsScriptLoading = false;
      console.error('❌ Mappls script failed to load');
      reject(new Error('Script load failed'));
    };
    document.head.appendChild(script);

    const pluginScript = document.createElement('script');
    pluginScript.src = `https://apis.mappls.com/advancedmaps/api/${apiKey}/map_sdk_plugins?v=3.0`;
    pluginScript.async = true;
    pluginScript.defer = true;
    document.head.appendChild(pluginScript);

    // Timeout fallback — poll for window.mappls
    setTimeout(() => {
      if (!mapplsScriptLoaded && (window as any).mappls) {
        mapplsScriptLoaded = true;
        resolve();
      }
    }, 5000);
  });
}

let mapIdCounter = 0;

export default function MapplsMapView({
  center = { lat: 28.6139, lng: 77.2090 },
  zoom = 12,
  onMapClick,
  markers = [],
  height = '500px',
}: MapplsMapViewProps) {
  const [containerId] = useState(() => `mappls-container-${++mapIdCounter}`);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const apiKey = process.env.NEXT_PUBLIC_MAPPLS_API_KEY;

    if (!apiKey) {
      setError('NEXT_PUBLIC_MAPPLS_API_KEY missing in .env');
      return;
    }

    loadMapplsScript(apiKey)
      .then(() => {
        if (!mounted) return;
        const el = document.getElementById(containerId);
        if (!el) return;

        const mappls = (window as any).mappls;
        if (!mappls?.Map) {
          setError('Mappls SDK loaded but Map constructor not found');
          return;
        }

        try {
          const map = new mappls.Map(containerId, {
            center: { lat: center.lat, lng: center.lng },
            zoom,
            zoomControl: true,
            location: true,
            search: false,
          });

          const onReady = () => {
            if (!mounted) return;
            mapRef.current = map;
            setLoaded(true);

            if (onMapClick) {
              try {
                map.addListener('click', (e: any) => {
                  const ll = e?.lngLat || e?.latlng;
                  if (ll) onMapClick({ lat: ll.lat, lng: ll.lng });
                });
              } catch {}
            }
          };

          try { map.addListener('load', onReady); } catch { /* fallback */ }
          // Safety fallback
          setTimeout(() => { if (mounted && !loaded) onReady(); }, 4000);
        } catch {
          setError('Failed to initialize map');
        }
      })
      .catch(err => {
        if (mounted) setError(err.message);
      });

    return () => {
      mounted = false;
      markersRef.current.forEach(m => { try { m.remove?.(); } catch {} });
      if (mapRef.current) { try { mapRef.current.remove?.(); } catch {} }
      mapRef.current = null;
    };
  }, []); // eslint-disable-line

  // Update markers and draw route
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    const mappls = (window as any).mappls;

    markersRef.current.forEach(m => { try { m.remove?.(); } catch {} });
    markersRef.current = [];
    
    // Also remove old polylines if any
    if ((mapRef.current as any).currentPolyline) {
      try { (mapRef.current as any).currentPolyline.remove(); } catch {}
    }

    markers.forEach(marker => {
      try {
        const el = document.createElement('div');
        const isPickup = marker.type === 'pickup';
        const isCurrent = marker.type === 'current';
        el.innerHTML = isCurrent
          ? `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 10px rgba(27,43,75,0.5)"></div>`
          : `<div style="width:28px;height:28px;border-radius:8px;background:${isPickup ? T.green : '#F43F5E'};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2)">${isPickup ? 'A' : 'B'}</div>`;

        const m = new mappls.Marker({
          map: mapRef.current,
          position: { lat: marker.position.lat, lng: marker.position.lng },
          element: el,
        });
        markersRef.current.push(m);
      } catch {}
    });

    // Draw route if we have exactly pickup and drop
    const pickup = markers.find(m => m.type === 'pickup');
    const drop = markers.find(m => m.type === 'drop');
    
    if (pickup && drop) {
      const p = pickup.position;
      const d = drop.position;
      fetch(`https://router.project-osrm.org/route/v1/driving/${p.lng},${p.lat};${d.lng},${d.lat}?geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates;
            const path = coords.map((c: any[]) => ({ lat: c[1], lng: c[0] }));
            
            try {
              const polyline = new mappls.Polyline({
                map: mapRef.current,
                paths: path, // mappls polyline expects paths or path
                strokeColor: T.blue,
                strokeOpacity: 0.8,
                strokeWeight: 5,
                fitbounds: true
              });
              (mapRef.current as any).currentPolyline = polyline;
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [markers, loaded]);

  if (error) {
    return (
      <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', background:T.redLight,
        borderRadius:20, border:'1px solid #FECDD3' }}>
        <div style={{ textAlign:'center', padding:24 }}>
          <p style={{ color:'#DC2626', fontWeight:600, fontSize:15, marginBottom:8 }}>Map Loading Error</p>
          <p style={{ color:'#EF4444', fontSize:13, marginBottom:16 }}>{error}</p>
          <button onClick={() => { mapplsScriptLoaded = false; mapplsScriptLoading = false; window.location.reload(); }}
            style={{ padding:'10px 24px', borderRadius:12, border:'none', background:'#DC2626', color:'white',
              fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'relative', borderRadius:20, overflow:'hidden', border:`1px solid ${T.border}` }}>
      <div id={containerId} style={{ width:'100%', height, minHeight: height }} />
      {!loaded && (
        <div style={{ position:'absolute', inset:0, background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
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
    </div>
  );
}
