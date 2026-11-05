import {timingSafeEqual} from 'node:crypto';
import {dispatchJourneyPush} from '@/lib/server/journey-push';
export async function POST(request:Request) {
  const expected=process.env.JOURNEY_DISPATCH_SECRET;
  const actual=request.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
  const supplied=Buffer.from(actual),secret=Buffer.from(expected||'');
  if(!expected||supplied.length!==secret.length||!timingSafeEqual(supplied,secret))return Response.json({error:'Unauthorized'},{status:401});
  try{return Response.json(await dispatchJourneyPush());}catch{return Response.json({error:'Dispatch temporarily unavailable'},{status:503});}
}
