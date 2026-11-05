import type { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const reverse = params.get('action') === 'reverse';
  const text = params.get('text')?.trim();
  const latText = params.get('lat');
  const lngText = params.get('lng');
  const lat = Number(latText), lng = Number(lngText);
  if (reverse ? (!latText || !lngText || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) : (!text || text.length>200)) return Response.json({error:'Invalid location query.'},{status:400});
  const key=process.env.ORS_API_KEY;
  if(!key) return Response.json({error:'Set ORS_API_KEY in .env.local and restart the server.'},{status:503});
  const url=new URL('https://api.openrouteservice.org/geocode/'+(reverse?'reverse':'search'));
  url.searchParams.set('api_key',key);
  url.searchParams.set('size',reverse?'1':'5');
  if(reverse){url.searchParams.set('point.lat',String(lat));url.searchParams.set('point.lon',String(lng));}
  else{url.searchParams.set('text',text!);url.searchParams.set('boundary.country','IN');}
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store'});
    if(!response.ok)return Response.json({error:'Geocoding provider rejected the request.'},{status:response.status});
    return Response.json(await response.json(),{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Geocoding provider unavailable.'},{status:502});}
}
