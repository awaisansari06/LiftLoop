import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export function stripeTestClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) throw new Error('Configure a Stripe test secret key (sk_test_) in STRIPE_SECRET_KEY. Live payments are disabled.');
  return new Stripe(key);
}
export function paymentDatabase() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Configure the server-only SUPABASE_SECRET_KEY to enable verified test bookings.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function paymentUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!token) return null;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error} = await client.auth.getUser(token);
  return error ? null : data.user;
}
export async function fulfillTestCheckout(stripe: Stripe, session: Stripe.Checkout.Session) {
  if (session.livemode || session.metadata?.integration !== 'liftloop-test-v1') throw new Error('Invalid test checkout.');
  if (session.payment_status !== 'paid') return {status:'pending'};
  const paymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!paymentId || session.currency !== 'inr' || !session.amount_total) throw new Error('Invalid payment details.');
  const intent = await stripe.paymentIntents.retrieve(paymentId, {expand:['latest_charge']});
  if (intent.livemode || intent.status !== 'succeeded' || intent.amount_received !== session.amount_total || intent.currency !== 'inr') throw new Error('Payment verification failed.');
  if (intent.latest_charge && typeof intent.latest_charge !== 'string' && intent.latest_charge.refunded) return {status:'refunded'};
  const {data,error} = await paymentDatabase().rpc('fulfill_stripe_test_booking', {
    p_ride:session.metadata.ride_id,p_rider:session.client_reference_id,p_seats:Number(session.metadata.seats),
    p_amount:session.amount_total,p_payment:paymentId,p_session:session.id,
  });
  if(error) {
    if(error.code !== 'P0001') throw new Error('Booking confirmation is temporarily unavailable. Retry confirmation; do not pay again.');
    await stripe.refunds.create({payment_intent:paymentId},{idempotencyKey:`unavailable-${session.id}`});
    return {status:'refunded'};
  }
  return {status:'confirmed',bookingId:data};
}
