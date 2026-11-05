import {createClient} from '@supabase/supabase-js';
import {paymentUser} from '@/lib/server/payments';
import {dispatchJourneyPush} from '@/lib/server/journey-push';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request) {
  if(!await paymentUser(request)) return Response.json({error:'Sign in again.'},{status:401});
  let body;
  try {body=await request.json();} catch {return Response.json({error:'Invalid request.'},{status:400});}
  if(!body||typeof body!=='object'||!uuid.test(body.trip||'')||typeof body.action!=='string'||(body.booking&&!uuid.test(body.booking))) return Response.json({error:'Invalid ride or booking.'},{status:400});
  const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false},global:{headers:{Authorization:request.headers.get('authorization')!}}});
  const {data,error}=await client.rpc('journey_action',{trip:body.trip,action:body.action,booking:body.booking||null,payload:body.payload||{}});
  if(error||data?.error) return Response.json({error:error?.message||data.error},{status:409});
  // The durable outbox survives delivery failure; the retry endpoint drains it later.
  const delivery=await dispatchJourneyPush(body.trip).catch(()=>({configured:true,pending:true}));
  return Response.json({ok:true,delivery});
}
