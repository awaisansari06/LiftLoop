import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CLIENT_ID = Deno.env.get('MAPPLS_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('MAPPLS_CLIENT_SECRET') || '';
const REST_KEY = Deno.env.get('MAPPLS_REST_KEY') || '';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.token;
  const res = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
  });
  if (!res.ok) throw new Error('Token fetch failed: ' + await res.text());
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 86400) * 1000 };
  return data.access_token;
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json',
};

// Resolve an eLoc to lat/lng using Mappls Place Detail API (exact), then text search fallback
async function resolveELoc(eLoc: string, placeName: string, placeAddress: string): Promise<{ lat: number; lng: number } | null> {
  const token = await getToken();

  // Step 1: Use Mappls Place Detail API — this is the CORRECT way to resolve an eLoc
  // The eLoc IS the place_id in Mappls system. This returns exact coordinates.
  try {
    const detailRes = await fetch(
      `https://atlas.mappls.com/api/places/detail/json?place_id=${encodeURIComponent(eLoc)}`,
      { headers: { 'Authorization': `bearer ${token}` } }
    );
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      console.log('Place detail response for eLoc', eLoc, ':', JSON.stringify(detailData)?.substring(0, 300));
      
      // The API returns latitude/longitude directly
      const lat = parseFloat(detailData.latitude || detailData.lat || '0');
      const lng = parseFloat(detailData.longitude || detailData.lng || '0');
      if (lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98) {
        console.log(`✅ eLoc ${eLoc} resolved via Place Detail: ${lat}, ${lng}`);
        return { lat, lng };
      }
    }
  } catch (e) {
    console.warn('Place Detail API failed:', e);
  }

  // Step 2: Use Mappls Text Search with the place name for coordinate lookup
  const searchQuery = placeName || placeAddress || eLoc;
  try {
    const searchRes = await fetch(
      `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(searchQuery)}&region=IND`,
      { headers: { 'Authorization': `bearer ${token}` } }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const suggestions = searchData.suggestedLocations || [];
      // Find exact match by eLoc or first result
      const match = suggestions.find((s: any) => s.eLoc === eLoc) || suggestions[0];
      if (match) {
        const lat = parseFloat(match.latitude || '0');
        const lng = parseFloat(match.longitude || '0');
        if (lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98) {
          console.log(`✅ eLoc ${eLoc} resolved via text search: ${lat}, ${lng}`);
          return { lat, lng };
        }
      }
    }
  } catch (e) {
    console.warn('Text search fallback failed:', e);
  }

  // Step 3: Nominatim as last resort
  const queries: string[] = [];
  if (placeName) queries.push(placeName);
  if (placeAddress) queries.push(placeAddress);

  for (const q of queries) {
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&format=json&limit=1`,
        { headers: { 'User-Agent': 'LiftLoop/1.0', 'Accept-Language': 'en' } }
      );
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (nomData.length > 0) {
          const lat = parseFloat(nomData[0].lat);
          const lng = parseFloat(nomData[0].lon);
          if (lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98) {
            return { lat, lng };
          }
        }
      }
    } catch (e) {
      console.warn('Nominatim query failed for:', q, e);
    }
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || '';
    const location = url.searchParams.get('location') || '28.3670,77.3240';
    const action = url.searchParams.get('action') || 'autosuggest';
    const [lat, lng] = location.split(',');

    // REVERSE GEOCODE
    if (action === 'reverse') {
      const revUrl = `https://apis.mappls.com/advancedmaps/v1/${REST_KEY}/rev_geocode?lat=${lat}&lng=${lng}`;
      const res = await fetch(revUrl);
      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify({ results: data.results || [] }), { headers: CORS });
      }
      return new Response(JSON.stringify({ results: [{ formatted_address: `${lat}, ${lng}` }] }), { headers: CORS });
    }

    // RESOLVE eLoc to coordinates
    if (action === 'resolve') {
      const eLoc = url.searchParams.get('eloc') || '';
      const placeName = url.searchParams.get('name') || '';
      const placeAddress = url.searchParams.get('address') || '';
      
      if (!eLoc) {
        return new Response(JSON.stringify({ error: 'Missing eloc parameter' }), { status: 400, headers: CORS });
      }

      const coords = await resolveELoc(eLoc, placeName, placeAddress);
      if (coords) {
        return new Response(JSON.stringify({ latitude: coords.lat, longitude: coords.lng, resolved: true }), { headers: CORS });
      }
      return new Response(JSON.stringify({ latitude: 0, longitude: 0, resolved: false }), { headers: CORS });
    }

    // AUTOSUGGEST - Try Mappls Autosuggest first (best for type-ahead), then Text Search
    const token = await getToken();
    
    let locs: any[] = [];

    // Try Autosuggest API first (designed for type-ahead, returns coordinates directly)
    try {
      const autoUrl = `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}&location=${location}&region=IND`;
      const autoRes = await fetch(autoUrl, {
        headers: { 'Authorization': `bearer ${token}`, 'Accept': 'application/json' },
      });
      if (autoRes.ok) {
        const autoData = await autoRes.json();
        locs = autoData.suggestedLocations || [];
      }
    } catch (e) {
      console.warn('Autosuggest failed:', e);
    }

    // Process and enrich results — resolve any 0,0 coordinates via Place Detail
    const results = [];
    for (const item of locs.slice(0, 8)) {
      let itemLat = parseFloat(item.latitude || '0');
      let itemLng = parseFloat(item.longitude || '0');
      
      // If coordinates are 0,0 but we have an eLoc, resolve via Place Detail API
      if ((itemLat === 0 || itemLng === 0) && item.eLoc) {
        try {
          const detailRes = await fetch(
            `https://atlas.mappls.com/api/places/detail/json?place_id=${encodeURIComponent(item.eLoc)}`,
            { headers: { 'Authorization': `bearer ${token}` } }
          );
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const dLat = parseFloat(detailData.latitude || detailData.lat || '0');
            const dLng = parseFloat(detailData.longitude || detailData.lng || '0');
            if (dLat >= 6 && dLat <= 38 && dLng >= 67 && dLng <= 98) {
              itemLat = dLat;
              itemLng = dLng;
              console.log(`✅ Inline resolved eLoc ${item.eLoc}: ${dLat}, ${dLng}`);
            }
          }
        } catch (e) {
          console.warn(`Inline eLoc resolve failed for ${item.eLoc}:`, e);
        }
      }
      
      results.push({
        placeName: item.placeName || 'Unknown',
        placeAddress: item.placeAddress || '',
        latitude: String(itemLat),
        longitude: String(itemLng),
        city: item.city || '',
        state: item.state || '',
        eLoc: item.eLoc || '',
        type: item.type || '',
        distance: item.distance || 0,
      });
    }
    
    return new Response(JSON.stringify({ suggestedLocations: results }), { headers: CORS });

  } catch (error) {
    return new Response(JSON.stringify({ suggestedLocations: [], error: String(error) }), {
      status: 200, headers: CORS,
    });
  }
});
