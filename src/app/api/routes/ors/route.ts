import type { NextRequest } from 'next/server';

// Keep the shared ORS credential on the server; never return it to the browser.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const profile = params.get('profile') || 'driving-car';
  const parsePoint = (value: string | null) => {
    if (!value || !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value)) return null;
    const [lng, lat] = value.split(',').map(Number);
    return Math.abs(lng) <= 180 && Math.abs(lat) <= 90 ? [lng, lat] : null;
  };
  const start = parsePoint(params.get('start'));
  const end = parsePoint(params.get('end'));
  if (!start || !end || !['driving-car', 'cycling-regular'].includes(profile)) {
    return Response.json({ error: 'Valid start, end and routing profile are required.' }, { status: 400 });
  }
  const key = process.env.ORS_API_KEY;
  if (!key) return Response.json({ error: 'Route service is not configured. Set ORS_API_KEY in .env.local and restart the server.' }, { status: 503 });
  const url = new URL(`https://api.openrouteservice.org/v2/directions/${profile}`);
  url.searchParams.set('start', start.join(','));
  url.searchParams.set('end', end.join(','));
  try {
    const response = await fetch(url, { headers: { Authorization: key, Accept: 'application/geo+json' }, signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!response.ok) return Response.json({ error: 'Route provider rejected the request. Check key validity, quota and route coverage.' }, { status: response.status });
    return Response.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Route service is unavailable. Please try again.' }, { status: 502 });
  }
}
