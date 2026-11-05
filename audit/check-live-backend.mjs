import {createClient} from '@supabase/supabase-js';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const server=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db=createClient(url,server,{auth:{persistSession:false}});
const anon=createClient(url,pub,{auth:{persistSession:false}});
const tables=['users','rides','bookings','reviews','notifications','driver_verification','live_locations','sos_alerts','messages','banned_users','admin_logs','saved_routes','announcements','ride_reports','support_messages'];
const result={checkedAt:new Date().toISOString(),tables:[],buckets:[],rpc:[],edge:[],env:{}};
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_MAPPLS_API_KEY','ORS_API_KEY','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','SUPABASE_SECRET_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'])result.env[name]=Boolean(process.env[name]);
result.mode=process.env.PAYMENT_MODE;
result.tables=await Promise.all(tables.map(async table=>{const {count,error}=await db.from(table).select('id',{count:'exact'}).limit(0);const publicResult=await anon.from(table).select('id',{count:'exact'}).limit(0);return {table,serverError:error?.code||null,count,anonymousError:publicResult.error?.code||null,anonymousCount:publicResult.count};}));
const {data:buckets,error:bucketError}=await db.storage.listBuckets();result.buckets=buckets?.map(b=>({name:b.name,public:b.public}))||[];result.bucketError=bucketError?.message||null;
for(const [name,args] of [['user_stats',{target:'00000000-0000-0000-0000-000000000000'}],['admin_analytics',{}]]){const r=await anon.rpc(name,args);result.rpc.push({name,error:r.error?.code||null});}
for(const name of ['mappls-route','mappls-proxy','send-sos','send-otp','verify-document']){try{const r=await fetch(url+'/functions/v1/'+name,{headers:{apikey:pub,Authorization:'Bearer '+pub},signal:AbortSignal.timeout(15000)});result.edge.push({name,status:r.status});}catch{result.edge.push({name,status:'network failure'});}}
const {data:profiles}=await db.from('users').select('email,user_type');result.accountRoles=(profiles||[]).reduce((counts,row)=>(counts[row.user_type]=(counts[row.user_type]||0)+1,counts),{});result.nonCampusAccounts=(profiles||[]).filter(row=>!row.email.endsWith('@jcboseust.ac.in')).length;
writeFileSync('audit/live-backend-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
