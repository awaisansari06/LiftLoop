import { stripeTestClient, fulfillTestCheckout } from '@/lib/server/payments';
export async function POST(request: Request) {
 const signature=request.headers.get('stripe-signature');const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!signature||!secret)return Response.json({error:'Webhook signature configuration required.'},{status:400});
 const stripe=stripeTestClient();let event;
 try{event=stripe.webhooks.constructEvent(await request.text(),signature,secret);}catch{return Response.json({error:'Invalid signature.'},{status:400});}
 if(event.livemode)return Response.json({error:'Live events disabled.'},{status:400});
 if(event.type==='checkout.session.completed'){
 try{await fulfillTestCheckout(stripe,event.data.object);}catch{return Response.json({error:'Confirmation unavailable. Retry event.'},{status:500});}}
 return Response.json({received:true});
}
