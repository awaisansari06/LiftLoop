// Run against a local production server; does not submit authenticated actions.
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3100';
const cases=[['/',200],['/login?demo=1',200],['/rides/search',200],['/bookings',200],['/verification',200],['/admin',200],['/privacy',200],['/terms',200],['/manifest.json',200],['/icon-192.png',200],['/icon-512.png',200],['/sw.js',200],['/api/push',200],['/api/routes/ors?start=invalid&end=77,28',400],['/api/routes/ors/geocode?action=reverse&lat=999&lng=77',400],['/api/payments/checkout',401,'POST'],['/api/payments/razorpay/verify',401,'POST'],['/api/payments/razorpay/cancel',401,'POST'],['/api/payments/razorpay/webhook',503,'POST'],['/api/payments/simulated',403,'POST'],['/api/push/dispatch',401,'POST'],['/api/journey',401,'POST']];
let failures=0;
for(const [path,expected,method='GET'] of cases){
 try {
  const response=await fetch(base+path,{method,signal:AbortSignal.timeout(15000)});
  await response.arrayBuffer();
  const pass=response.status===expected;
  if(!pass)failures++;
  console.log(JSON.stringify({path,expected,status:response.status,pass}));
 }catch(error){failures++;console.log(JSON.stringify({path,pass:false,error:error.message}));}
}
process.exitCode=failures?1:0;
