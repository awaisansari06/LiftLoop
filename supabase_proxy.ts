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

// ============= NOMINATIM GEOCODER (RELIABLE FOR INDIAN ADDRESSES) =============
// This is our PRIMARY coordinate resolver since Mappls Place Detail API is blocked (401).
// Nominatim can't find exact POIs but CAN find sectors/localities which is good enough
// for ride distance filtering (10km radius).

async function nominatimGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&limit=1`,
      { headers: { 'User-Agent': 'LiftLoop/1.0', 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98) {
          return { lat, lng };
        }
      }
    }
  } catch (e) {
    console.warn('Nominatim geocode failed for:', query, e);
  }
  return null;
}

// ============= GEMINI AI GEOCODER (PREMIUM FALLBACK) =============
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

async function geminiGeocode(placeName: string, placeAddress: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = placeAddress ? `${placeName}, ${placeAddress}` : placeName;
    const prompt = `What are the GPS coordinates of "${query}" in India? Return ONLY JSON: {"lat":number,"lng":number}. No other text.`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 100 },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const lat = parseFloat(parsed.lat);
    const lng = parseFloat(parsed.lng);
    if (lat >= 6 && lat <= 38 && lng >= 67 && lng <= 98) {
      console.log(`✅ Gemini resolved: "${query}" → ${lat}, ${lng}`);
      return { lat, lng };
    }
  } catch (e) {
    console.warn('Gemini geocode failed:', e);
  }
  return null;
}

// Resolve coordinates: Nominatim (fast, free) → Gemini AI (accurate, premium)
async function resolveAddressToCoords(
  placeName: string,
  placeAddress: string,
  city?: string,
  state?: string
): Promise<{ lat: number; lng: number } | null> {
  // Strategy 1: Full address via Nominatim
  if (placeAddress) {
    const result = await nominatimGeocode(placeAddress);
    if (result) { console.log(`✅ Nominatim full address: "${placeAddress}"`); return result; }
  }
  // Strategy 2: Name + City via Nominatim
  if (placeName && city) {
    const result = await nominatimGeocode(`${placeName} ${city}`);
    if (result) { console.log(`✅ Nominatim name+city: "${placeName} ${city}"`); return result; }
  }
  // Strategy 3: Address fragments via Nominatim
  if (placeAddress) {
    const parts = placeAddress.split(',').map(p => p.trim());
    for (let i = 1; i < Math.min(parts.length - 1, 4); i++) {
      const fragment = parts.slice(i).join(', ');
      const result = await nominatimGeocode(fragment);
      if (result) { console.log(`✅ Nominatim fragment: "${fragment}"`); return result; }
    }
  }
  // Strategy 4: City only via Nominatim
  if (city) {
    const q = state ? `${city}, ${state}` : city;
    const result = await nominatimGeocode(q);
    if (result) { console.log(`⚠️ Nominatim city: "${q}"`); return result; }
  }
  // Strategy 5: Gemini AI (handles obscure POIs)
  if (placeName) {
    const result = await geminiGeocode(placeName, placeAddress);
    if (result) return result;
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
      
      if (!eLoc && !placeName && !placeAddress) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: CORS });
      }

      const coords = await resolveAddressToCoords(placeName, placeAddress);
      if (coords) {
        return new Response(JSON.stringify({ latitude: coords.lat, longitude: coords.lng, resolved: true }), { headers: CORS });
      }
      return new Response(JSON.stringify({ latitude: 0, longitude: 0, resolved: false }), { headers: CORS });
    }

    // AUTOSUGGEST - Use Mappls search API then resolve coordinates via Nominatim
    const token = await getToken();
    
    let locs: any[] = [];

    // Get search results from Mappls (returns eLoc + address, but NO lat/lng)
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
      console.warn('Mappls search failed:', e);
    }

    // Process results: resolve coordinates via Nominatim for top 5 results
    // (Nominatim has a rate limit, so we do them sequentially with a small delay)
    const results = [];
    for (const item of locs.slice(0, 8)) {
      let itemLat = 0;
      let itemLng = 0;
      
      // Only resolve coordinates for the first 5 results (to stay under Nominatim rate limits)
      if (results.length < 5) {
        const coords = await resolveAddressToCoords(
          item.placeName || '',
          item.placeAddress || '',
          item.city || '',
          item.state || ''
        );
        if (coords) {
          itemLat = coords.lat;
          itemLng = coords.lng;
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
