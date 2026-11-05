from pathlib import Path
p=Path('src/lib/server/razorpay.ts');s=p.read_text().replace("  if(error) throw new Error('Payment received in test mode. Booking confirmation needs attention; do not pay again. Retry confirmation with the same payment.');", """  if(error) {
    if(error.code==='P0001') {
      const refund=await razorpayRequest('payments/'+paymentId+'/refund',{amount:payment.amount},{'X-Refund-Idempotency':'liftloop-unavailable-'+paymentId});
      return {status:refund.status==='processed'?'refunded':'refund_pending'};
    }
    throw new Error('Payment received in test mode. Booking confirmation needs attention; do not pay again. Retry confirmation with the same payment.');
  }""");p.write_text(s)
