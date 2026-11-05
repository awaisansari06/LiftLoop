import {simulationEnabled,simulationDatabase} from '@/lib/server/simulation';
import {paymentUser} from '@/lib/server/payments';
import {paymentDatabase} from '@/lib/server/payments';
import {dispatchJourneyPush} from '@/lib/server/journey-push';
export async function POST(request:Request){
 if(!simulationEnabled())return Response.json({error:'Simulation disabled.'},{status:403});
 if(!await paymentUser(request))return Response.json({error:'Sign in first.'},{status:401});
 let body;try{body=await request.json()}catch{return Response.json({error:'Invalid request.'},{status:400})}
 if(!/^[0-9a-f-]{36}$/i.test(body.bookingId||''))return Response.json({error:'Invalid booking.'},{status:400});
 const {error}=await simulationDatabase(request).rpc('cancel_simulated_booking',{p_booking:body.bookingId});
 if(error)return Response.json({error:'Could not cancel this simulated booking.'},{status:409});
 const {data:booking}=await paymentDatabase().from('bookings').select('ride_id').eq('id',body.bookingId).single();
 if(booking)await dispatchJourneyPush(booking.ride_id).catch(()=>{});
 return Response.json({status:'cancelled',simulated:true});
}
