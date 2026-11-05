import {paymentUser} from '@/lib/server/payments';
import {confirmRazorpay,validRazorpaySignature} from '@/lib/server/razorpay';
export async function POST(request:Request) {
 if(process.env.PAYMENT_MODE!=='razorpay') return Response.json({error:'Razorpay checkout is disabled.'},{status:403});
 const user=await paymentUser(request);if(!user)return Response.json({error:'Sign in before confirming payment.'},{status:401});
 let body;try{body=await request.json();}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const {razorpay_order_id:order,razorpay_payment_id:payment,razorpay_signature:signature}=body;
 if(typeof order!=='string'||!/^order_[a-zA-Z0-9]+$/.test(order)||typeof payment!=='string'||!/^pay_[a-zA-Z0-9]+$/.test(payment)||typeof signature!=='string')return Response.json({error:'Invalid payment details.'},{status:400});
 try{if(!validRazorpaySignature(order,payment,signature))return Response.json({error:'Payment signature verification failed.'},{status:400});return Response.json(await confirmRazorpay(order,payment,user.id));}
 catch(error){return Response.json({error:error instanceof Error?error.message:'Payment confirmation failed.'},{status:409});}
}
