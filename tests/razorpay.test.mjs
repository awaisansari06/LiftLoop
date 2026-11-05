import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {razorpayCredentials,validRazorpaySignature} from '../src/lib/server/razorpay.ts';
test('Razorpay requires test credentials and verifies exact signed payment',()=>{
 const oldId=process.env.RAZORPAY_KEY_ID,oldSecret=process.env.RAZORPAY_KEY_SECRET;
 try{
 process.env.RAZORPAY_KEY_ID='rzp_live_example';process.env.RAZORPAY_KEY_SECRET='test-only';assert.throws(()=>razorpayCredentials(),/Live payments are disabled/);
 process.env.RAZORPAY_KEY_ID='rzp_test_example';
 const signature=createHmac('sha256','test-only').update('order_abc|pay_abc').digest('hex');
 assert.equal(validRazorpaySignature('order_abc','pay_abc',signature),true);
 assert.equal(validRazorpaySignature('order_other','pay_abc',signature),false);
 assert.equal(validRazorpaySignature('order_abc','pay_abc','invalid'),false);
 }finally{if(oldId===undefined)delete process.env.RAZORPAY_KEY_ID;else process.env.RAZORPAY_KEY_ID=oldId;if(oldSecret===undefined)delete process.env.RAZORPAY_KEY_SECRET;else process.env.RAZORPAY_KEY_SECRET=oldSecret;}
});
import {confirmRazorpay} from '../src/lib/server/razorpay.ts';
test('only a matching captured Razorpay payment can reach booking confirmation',async()=>{
 const originalFetch=globalThis.fetch,previousId=process.env.RAZORPAY_KEY_ID,previousSecret=process.env.RAZORPAY_KEY_SECRET;
 process.env.RAZORPAY_KEY_ID='rzp_test_example';process.env.RAZORPAY_KEY_SECRET='test-only';
 let owner='rider',paymentStatus='authorized',calls=0;
 globalThis.fetch=async(url)=>{calls++;return Response.json(String(url).includes('/orders/')?{amount:1000,currency:'INR',notes:{integration:'liftloop-razorpay-test-v1',rider_id:owner,ride_id:'trip',seats:'1'}}:{order_id:'order_abc',amount:1000,currency:'INR',status:paymentStatus,amount_refunded:0});};
 try{
 assert.deepEqual(await confirmRazorpay('order_abc','pay_abc','rider'),{status:'pending'});assert.equal(calls,2);
 owner='another-rider';await assert.rejects(confirmRazorpay('order_abc','pay_abc','rider'),/does not match/);
 owner='rider';paymentStatus='refunded';assert.deepEqual(await confirmRazorpay('order_abc','pay_abc','rider'),{status:'refunded'});
 }finally{globalThis.fetch=originalFetch;if(previousId===undefined)delete process.env.RAZORPAY_KEY_ID;else process.env.RAZORPAY_KEY_ID=previousId;if(previousSecret===undefined)delete process.env.RAZORPAY_KEY_SECRET;else process.env.RAZORPAY_KEY_SECRET=previousSecret;}
});
