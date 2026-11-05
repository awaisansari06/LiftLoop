import { createHmac, timingSafeEqual } from 'node:crypto';
import { paymentDatabase } from './payments.ts';
export function razorpayCredentials() {
  const id=process.env.RAZORPAY_KEY_ID, secret=process.env.RAZORPAY_KEY_SECRET;
  if(!id?.startsWith('rzp_test_') || !secret) throw new Error('Configure RAZORPAY_KEY_ID (rzp_test_) and RAZORPAY_KEY_SECRET. Live payments are disabled.');
  return {id,secret};
}
export async function razorpayRequest(path:string, body?:Record<string,unknown>, extraHeaders:Record<string,string>={}) {
  const {id,secret}=razorpayCredentials();
  const response=await fetch('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/json',...extraHeaders},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error('Razorpay test request failed. Check test credentials and payment capture settings.');
  return response.json();
}
export function validRazorpaySignature(orderId:string,paymentId:string,signature:string) {
  const {secret}=razorpayCredentials();
  if(!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',secret).update(orderId+'|'+paymentId).digest());
}
export async function confirmRazorpay(orderId:string,paymentId:string,userId:string) {
  const [order,payment]=await Promise.all([razorpayRequest('orders/'+orderId),razorpayRequest('payments/'+paymentId)]);
  if(order.notes?.integration!=='liftloop-razorpay-test-v1'||order.notes?.rider_id!==userId||payment.order_id!==orderId||order.currency!=='INR'||payment.currency!=='INR'||payment.amount!==order.amount||!Number.isSafeInteger(order.amount)||order.amount<=0) throw new Error('Payment does not match your booking.');
  if(payment.status==='refunded'||payment.amount_refunded>0) return {status:'refunded'};
  if(payment.status!=='captured') return {status:'pending'};
  const {data,error}=await paymentDatabase().rpc('fulfill_razorpay_test_booking',{p_ride:order.notes.ride_id,p_rider:userId,p_seats:Number(order.notes.seats),p_amount:order.amount,p_payment:paymentId,p_order:orderId});
  if(error) {
    if(error.code==='P0001') {
      const refund=await razorpayRequest('payments/'+paymentId+'/refund',{amount:payment.amount},{'X-Refund-Idempotency':'liftloop-unavailable-'+paymentId});
      return {status:refund.status==='processed'?'refunded':'refund_pending'};
    }
    throw new Error('Payment received in test mode. Booking confirmation needs attention; do not pay again. Retry confirmation with the same payment.');
  }
  return {status:'confirmed',bookingId:data};
}
