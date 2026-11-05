import { stripeTestClient, paymentUser, fulfillTestCheckout } from '@/lib/server/payments';
export async function POST(request: Request) {
 const user=await paymentUser(request);
 if(!user)return Response.json({error:'Sign in to confirm this booking.'},{status:401});
 let body;try{body=await request.json();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 if(typeof body.sessionId!=='string'||!/^cs_test_[a-zA-Z0-9]+$/.test(body.sessionId))return Response.json({error:'Invalid test session.'},{status:400});
 try{const stripe=stripeTestClient();const session=await stripe.checkout.sessions.retrieve(body.sessionId);
 if(session.client_reference_id!==user.id)return Response.json({error:'This checkout belongs to another account.'},{status:403});
 return Response.json(await fulfillTestCheckout(stripe,session));
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Confirmation failed.'},{status:503});}
}
