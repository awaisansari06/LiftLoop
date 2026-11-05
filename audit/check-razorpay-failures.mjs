process.loadEnvFile('.env.local');
const key=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
if(!key?.startsWith('rzp_test_')||!secret)throw new Error('Test credentials missing');
const response=await fetch('https://api.razorpay.com/v1/payments?count=8',{headers:{Authorization:'Basic '+Buffer.from(key+':'+secret).toString('base64')},signal:AbortSignal.timeout(20000)});
const body=await response.json();
console.log(JSON.stringify({authenticationStatus:response.status,error:body.error?{code:body.error.code,description:body.error.description}:null,payments:(body.items||[]).map(p=>({id:p.id,order:p.order_id,status:p.status,method:p.method,error_code:p.error_code,error_description:p.error_description,error_source:p.error_source,error_step:p.error_step,error_reason:p.error_reason,created_at:p.created_at}))},null,2));
