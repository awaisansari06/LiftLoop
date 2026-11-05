import webpush from 'web-push';
import {paymentDatabase} from './payments';
import {isCurrentJourneyAlert} from '../journey-alert';

export function pushConfigured() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
export async function dispatchJourneyPush(trip?:string) {
  if (!pushConfigured()) return {configured:false,sent:0};
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!);
  const db=paymentDatabase();
  const {data:events,error}=await db.rpc('claim_journey_push',{trip:trip||null});
  if(error) throw new Error('Could not load passenger notification queue');
  let sent=0;
  for(const event of events||[]) {
    const {data:passenger,error:passengerError}=await db.from('passenger_journeys').select('status').eq('ride_id',event.ride_id).eq('rider_id',event.user_id).order('pickup_order',{ascending:false}).limit(1).maybeSingle();
    if(passengerError)continue;
    if(!isCurrentJourneyAlert(event.title,passenger?.status,event.created_at)) {
      await db.from('journey_push_outbox').update({sent_at:new Date().toISOString()}).eq('id',event.id);continue;
    }
    const {data:subscriptions,error:readError}=await db.from('push_subscriptions').select('*').eq('user_id',event.user_id);
    if(readError) continue;
    let failed=false;
    await Promise.all((subscriptions||[]).map(async subscription=>{
      try {
        await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:event.title,body:event.message,url:`/tracking/${event.ride_id}`,tag:event.id}),{TTL:300,timeout:5000});
      } catch(error) {
        const status=(error as {statusCode?:number}).statusCode;
        if(status===404||status===410) await db.from('push_subscriptions').delete().eq('id',subscription.id);
        else failed=true;
      }
    }));
    if(!failed) { await db.from('journey_push_outbox').update({sent_at:new Date().toISOString()}).eq('id',event.id); sent++; }
  }
  return {configured:true,sent};
}
