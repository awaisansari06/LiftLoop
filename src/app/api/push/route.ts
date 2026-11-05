import {paymentDatabase,paymentUser} from '@/lib/server/payments';
import {pushConfigured} from '@/lib/server/journey-push';
import {validPushEndpoint} from '@/lib/push-endpoint';
export async function GET() {return Response.json({configured:pushConfigured(),publicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||null});}
export async function POST(request:Request) {
  const user=await paymentUser(request);
  if(!user)return Response.json({error:'Sign in again.'},{status:401});
  if(!pushConfigured())return Response.json({error:'Push notifications are not configured on this server.'},{status:503});
  let sub;try{sub=await request.json();}catch{return Response.json({error:'Invalid subscription'},{status:400});}
  if(!sub||typeof sub.endpoint!=='string'||sub.endpoint.length>4096||!validPushEndpoint(sub.endpoint)||!/^[-_A-Za-z0-9]{80,100}$/.test(sub.keys?.p256dh||'')||!/^[-_A-Za-z0-9]{20,30}$/.test(sub.keys?.auth||''))return Response.json({error:'Invalid push subscription.'},{status:400});
  const db=paymentDatabase();
  // Do not allow one signed-in account to overwrite another account's device.
  const {data:existing,error:readError}=await db.from('push_subscriptions').select('user_id').eq('endpoint',sub.endpoint).maybeSingle();
  if(readError)return Response.json({error:'Notification setup is unavailable.'},{status:503});
  if(existing&&existing.user_id!==user.id)return Response.json({error:'This browser is subscribed to another account. Disable alerts there first.'},{status:409});
  const {error}=await db.from('push_subscriptions').upsert({user_id:user.id,endpoint:sub.endpoint,p256dh:sub.keys.p256dh,auth:sub.keys.auth},{onConflict:'endpoint'});
  return error?Response.json({error:'Could not save notification preferences.'},{status:503}):Response.json({ok:true});
}
export async function DELETE(request:Request) {
  const user=await paymentUser(request);if(!user)return Response.json({error:'Sign in again.'},{status:401});
  let body;try{body=await request.json();}catch{return Response.json({error:'Invalid request'},{status:400});}
  if(!body||typeof body.endpoint!=='string')return Response.json({error:'Invalid subscription.'},{status:400});
  const {error}=await paymentDatabase().from('push_subscriptions').delete().eq('user_id',user.id).eq('endpoint',body.endpoint);
  return error?Response.json({error:'Could not disable notifications.'},{status:503}):Response.json({ok:true});
}
