// Read-only checks: no users, bookings, payments or database objects are changed.
import {createClient} from '@supabase/supabase-js';
import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const report={checkedAt:new Date().toISOString(),environment:{},tables:[],buckets:[],functions:[]};
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_MAPPLS_API_KEY','ORS_API_KEY','SUPABASE_SECRET_KEY','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','NEXT_PUBLIC_VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT','JOURNEY_DISPATCH_SECRET'])report.environment[name]=Boolean(process.env[name]);
report.environment.publicSupabaseKey=Boolean(publicKey);
report.paymentMode=process.env.PAYMENT_MODE||'stripe';
report.siteUrlUsesLocalhost=/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_SITE_URL||'');
if(!url||!publicKey||!secret){console.log(JSON.stringify(report,null,2));process.exitCode=1;}
else {
 const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}};
 const db=createClient(url,secret,options),anon=createClient(url,publicKey,options);
 const tables=['users','rides','bookings','reviews','notifications','driver_verification','live_locations','sos_alerts','messages','banned_users','admin_logs','saved_routes','announcements','ride_reports','support_messages','passenger_journeys','push_subscriptions','journey_push_outbox'];
 report.tables=await Promise.all(tables.map(async table=>{
  const key=table==='passenger_journeys'?'booking_id':'id';
  const [server,anonymous]=await Promise.all([db.from(table).select(key).limit(0),anon.from(table).select(key,{count:'exact'}).limit(0)]);
  return {table,serverError:server.error?.code||server.error?.message||null,anonymousError:anonymous.error?.code||anonymous.error?.message||null,anonymousVisibleRows:anonymous.count};
 }));
 const {data:buckets,error}=await db.storage.listBuckets();
 report.buckets=(buckets||[]).map(({name,public:isPublic,file_size_limit,allowed_mime_types})=>({name,public:isPublic,file_size_limit,allowed_mime_types}));
 report.bucketError=error?.message||null;
 // Inspect the schema description with the server credential; never print credentials or rows.
 try {
  const response=await options.global.fetch(url+'/rest/v1/',{headers:{apikey:secret,Authorization:'Bearer '+secret,Accept:'application/openapi+json'}});
  const schema=await response.json();
  report.schemaStatus=response.status;
  report.functions=['journey_snapshot','journey_action','claim_journey_push','fulfill_razorpay_test_booking','finalize_test_refund'].map(name=>({name,exposedToServerRole:Boolean(schema.paths?.['/rpc/'+name])}));
 }catch{report.schemaStatus='unreachable';}
 console.log(JSON.stringify(report,null,2));
 if(report.tables.some(t=>t.serverError)||report.bucketError||report.schemaStatus!==200)process.exitCode=1;
}
