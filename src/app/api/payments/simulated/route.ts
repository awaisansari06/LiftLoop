import {simulationEnabled,simulationDatabase} from '@/lib/server/simulation';
import {paymentUser} from '@/lib/server/payments';
export async function POST(request:Request){
 if(!simulationEnabled())return Response.json({error:'Local development simulation is disabled.'},{status:403});
 if(!await paymentUser(request))return Response.json({error:'Sign in first.'},{status:401});
 let body;try{body=await request.json()}catch{return Response.json({error:'Invalid request.'},{status:400})}
 if(!/^[0-9a-f-]{36}$/i.test(body.rideId||'')||!/^[0-9a-f-]{36}$/i.test(body.requestId||'')||!Number.isInteger(body.seats)||body.seats<1||body.seats>8)return Response.json({error:'Invalid booking.'},{status:400});
 const {data,error}=await simulationDatabase(request).rpc('create_simulated_booking',{p_ride:body.rideId,p_seats:body.seats,p_request:body.requestId});
 if(error)return Response.json({error:error.code==='P0001'?error.message:'Simulated booking could not be confirmed.'},{status:409});
 return Response.json({status:'confirmed',bookingId:data,simulated:true});
}
