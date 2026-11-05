import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentFailureMessage} from '../src/lib/razorpay-checkout.ts';
test('checkout surfaces the provider failure instead of masking authentication errors',()=>{
 const message=paymentFailureMessage({error:{description:'Authentication failed',code:'BAD_REQUEST_ERROR',reason:'authentication_failed'}});
 assert.match(message,/Authentication failed/);
 assert.match(message,/BAD_REQUEST_ERROR/);
 assert.match(message,/booking was not confirmed/);
});
test('checkout failure remains useful when provider fields are absent',()=>{
 assert.match(paymentFailureMessage({}),/did not provide a failure description/);
});
