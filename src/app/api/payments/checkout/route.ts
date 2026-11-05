import {razorpayCredentials,razorpayRequest} from '@/lib/server/razorpay';
import {simulationEnabled} from '@/lib/server/simulation';
import { stripeTestClient, paymentDatabase, paymentUser } from '@/lib/server/payments';
export async function POST(request: Request) {
  const user = await paymentUser(request);
  if(!user) return Response.json({error:'Sign in before booking.'},{status:401});
  let body;
  try {body=await request.json();}catch{return Response.json({error:'Invalid request.'},{status:400});}
  const {rideId,seats,requestId}=body;
  if(typeof rideId!=='string'||!/^[0-9a-f-]{36}$/i.test(rideId)||!Number.isInteger(seats)||seats<1||seats>8||typeof requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(requestId)) return Response.json({error:'Choose a valid ride and seat count.'},{status:400});
  if(simulationEnabled()) return Response.json({url:'/payments/simulate?'+new URLSearchParams({ride_id:rideId,seats:String(seats),request_id:requestId}).toString()});
  try {
    const db=paymentDatabase();
    const {data:ride,error}=await db.from('rides').select('id,driver_id,status,departure_time,seats_available,price_per_seat').eq('id',rideId).single();
    if(error||!ride||ride.status!=='active'||new Date(ride.departure_time)<=new Date()||ride.driver_id===user.id||ride.seats_available<seats) return Response.json({error:'This ride is unavailable.'},{status:409});
    const amount=Math.round(Number(ride.price_per_seat)*100);
    if(!Number.isSafeInteger(amount)||amount<=0) return Response.json({error:'Test card checkout requires a positive ride fare.'},{status:400});
    if(process.env.PAYMENT_MODE==='razorpay') {
      const {id:key}=razorpayCredentials();
      // Refuse to take payment until the database confirmation function is installed.
      const {error:ready}=await db.rpc('fulfill_razorpay_test_booking',{p_ride:rideId,p_rider:user.id,p_seats:0,p_amount:0,p_payment:'',p_order:''});
      if(ready?.code!=='22023') throw new Error('Configure the Razorpay database setup before starting checkout.');
      const order=await razorpayRequest('orders',{amount:amount*seats,currency:'INR',receipt:requestId,notes:{integration:'liftloop-razorpay-test-v1',ride_id:rideId,rider_id:user.id,seats:String(seats)}});
      return Response.json({provider:'razorpay',key,orderId:order.id,amount:order.amount,currency:order.currency});
    }
    const stripe=stripeTestClient();
    const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
    const session=await stripe.checkout.sessions.create({
      mode:'payment',allowed_payment_method_types:['card'],client_reference_id:user.id,
      metadata:{integration:'liftloop-test-v1',ride_id:rideId,seats:String(seats)},
      line_items:[{price_data:{currency:'inr',unit_amount:amount,product_data:{name:'LiftLoop ride — test payment'}},quantity:seats}],
      success_url:`${origin}/payments/result?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin}/rides/${rideId}?checkout=cancelled`,expires_at:Math.floor(Date.now()/1000)+1800,
    },{idempotencyKey:`checkout-${user.id}-${requestId}`});
    return Response.json({url:session.url});
  }catch(error){return Response.json({error:error instanceof Error && /Configure/.test(error.message)?error.message:'Could not start test checkout. Check the server configuration and test payment credentials.'},{status:503});}
}

