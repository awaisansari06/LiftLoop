import {paymentDatabase,paymentUser} from '@/lib/server/payments';
import {razorpayRequest} from '@/lib/server/razorpay';
export async function POST(request:Request) {
 const user=await paymentUser(request);
 if(!user)return Response.json({error:'Sign in first'},{status:401});
 if(process.env.PAYMENT_MODE!=='razorpay')return Response.json({error:'Test payments disabled'},{status:403});
 try {
  const {bookingId}=await request.json();
  if(typeof bookingId!=='string'||!/^[0-9a-f-]{36}$/i.test(bookingId))return Response.json({error:'Invalid booking'},{status:400});
  const db=paymentDatabase();
  const {data:booking,error}=await db.from('bookings').select('*').eq('id',bookingId).single();
  if(error||!booking||booking.rider_id!==user.id||booking.payment_provider!=='razorpay_test')return Response.json({error:'Booking not found'},{status:404});
  if(booking.status==='cancelled'&&booking.payment_status==='refunded')return Response.json({status:'refunded'});
  if(!['pending','confirmed'].includes(booking.status)||!/^pay_[a-zA-Z0-9]+$/.test(booking.payment_id))return Response.json({error:'Booking cannot be cancelled'},{status:409});
  const {data:ride}=await db.from('rides').select('status,departure_time').eq('id',booking.ride_id).single();
  if(!ride||ride.status!=='active'||new Date(ride.departure_time)<=new Date())return Response.json({error:'Refund cancellation requires a future ride that has not started'},{status:409});
  // Readiness check before the irreversible provider operation.
  const {error:ready}=await db.rpc('finalize_test_refund',{booking:'00000000-0000-0000-0000-000000000000'});
  if(ready?.code!=='P0001')return Response.json({error:'Configure refund database setup first'},{status:503});
  const payment=await razorpayRequest('payments/'+booking.payment_id);
  if(payment.currency!=='INR'||payment.amount!==Math.round(Number(booking.total_price)*100))throw new Error('Payment amount mismatch');
  if(payment.status!=='refunded') {
   if(payment.status!=='captured')throw new Error('Payment not captured');
   const refund=await razorpayRequest('payments/'+booking.payment_id+'/refund',{amount:payment.amount},{'X-Refund-Idempotency':'liftloop-cancel-'+booking.id});
   if(refund.status!=='processed')return Response.json({status:'refund_pending'});
  }
  const {error:finalizeError}=await db.rpc('finalize_test_refund',{booking:booking.id});
  if(finalizeError)throw new Error('Refund processed. Retry cancellation to update your booking; do not pay again.');
  return Response.json({status:'refunded'});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Refund could not complete. Retry safely.'},{status:409});}
}
