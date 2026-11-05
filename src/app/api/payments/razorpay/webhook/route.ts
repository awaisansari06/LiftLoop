import {createHmac,timingSafeEqual} from 'node:crypto';
import {confirmRazorpay,razorpayRequest} from '@/lib/server/razorpay';
export async function POST(request:Request) {
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  if(process.env.PAYMENT_MODE!=='razorpay'||!secret) return Response.json({error:'Webhook not configured'},{status:503});
  const raw=await request.text(),signature=request.headers.get('x-razorpay-signature') || '';
  if(!/^[a-f0-9]{64}$/i.test(signature)||!timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',secret).update(raw).digest())) return Response.json({error:'Invalid signature'},{status:400});
  try {
    const event=JSON.parse(raw);
    if(event.event!=='payment.captured') return Response.json({received:true});
    const payment=event.payload?.payment?.entity;
    if(!/^pay_[a-zA-Z0-9]+$/.test(payment?.id)||!/^order_[a-zA-Z0-9]+$/.test(payment?.order_id)) return Response.json({error:'Invalid event'},{status:400});
    const order=await razorpayRequest('orders/'+payment.order_id);
    if(order.notes?.integration!=='liftloop-razorpay-test-v1') return Response.json({received:true});
    // Fulfillment is idempotent on provider payment ID in the database.
    await confirmRazorpay(order.id,payment.id,order.notes.rider_id);
    return Response.json({received:true});
  } catch {return Response.json({error:'Retry reconciliation'},{status:503});}
}
