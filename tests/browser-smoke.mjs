// Run against a production server: npm run start -- --port 3107
// All account, trip, location and checkout traffic uses local fixtures.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import puppeteer from 'puppeteer';

const origin=process.env.SMOKE_ORIGIN||'http://127.0.0.1:3107';
const url=readFileSync('.env.local','utf8').match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
assert.ok(url,'Local Supabase URL is needed to match the built client');
const host=new URL(url).hostname;
const driver='00000000-0000-4000-8000-000000000001';
const rider='00000000-0000-4000-8000-000000000002';
const trip='00000000-0000-4000-8000-000000000003';
const bookingId='00000000-0000-4000-8000-000000000004';
const now=new Date().toISOString();
const profile={id:driver,email:'driver@example.test',full_name:'Test Driver',user_type:'both',profile_complete:80};
const ride={id:trip,driver_id:driver,from_location:{lat:28.37,lng:77.32,address:'Campus gate'},to_location:{lat:28.4,lng:77.35,address:'Library'},departure_time:new Date(Date.now()+3600000).toISOString(),seats_available:2,price_per_seat:100,status:'active',created_at:now,driver:profile};
const passenger={booking_id:bookingId,ride_id:trip,rider_id:rider,driver_id:driver,passenger_name:'Test Rider',pickup:ride.from_location,dropoff:ride.to_location,landmark:'Main gate',pickup_order:1,dropoff_order:1,status:'waiting',ready_at:null,arrived_at:null,boarded_at:null,dropped_off_at:null,eta_at:null,eta_updated_at:null,seats:1};
const booking={id:bookingId,ride_id:trip,rider_id:rider,seats_booked:1,total_price:100,status:'confirmed',payment_status:'paid',payment_provider:'simulated',created_at:now,ride,journey:passenger,rider:{full_name:'Test Rider'}};
const snapshot={passengers:[passenger],pin:null,vehicle:{vehicle_number:'TEST',vehicle_model:'Car',vehicle_color:'White'},delay_until:null,driver:profile};
let account=profile;
const executablePath=process.env.SMOKE_CHROME||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(path=>existsSync(path));
const browser=await puppeteer.launch({headless:true,executablePath,args:[`--host-resolver-rules=MAP ${host} ~NOTFOUND`]});
try {
 const page=await browser.newPage();
 const errors=[],requests=[],logs=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')logs.push(message.text());});
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const target=new URL(request.url());
  const respond=data=>request.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':request.headers()['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,prefer,accept'},body:JSON.stringify(data)});
  if(target.hostname===host){
   requests.push(target.pathname);
   const table=target.pathname.split('/').at(-1);
   let result=[];
   if(table==='users')result=account;
   if(table==='rides')result=request.headers().accept?.includes('object')?ride:[ride];
   if(table==='bookings')result=[booking];
   if(table==='driver_verification')result={verification_status:'verified',vehicle_number:'TEST'};
   if(table==='journey_snapshot')result=snapshot;
   if(table==='user_stats')result={total_bookings:1,total_rides_offered:1,total_spent:100,total_earned:0,avg_rating:5,ratings_count:1};
   if(table==='live_locations')result=ride.status==='in_progress'?{ride_id:trip,driver_id:driver,location:ride.from_location,updated_at:new Date().toISOString()}:null;
   return respond(result).catch(()=>{});
  }
  if(target.origin===origin&&target.pathname==='/api/journey'){
   const body=JSON.parse(request.postData());
   if(body.action==='start')ride.status='in_progress';
   if(body.action==='ready')passenger.ready_at=new Date().toISOString();
   return respond({ok:true}).catch(()=>{});
  }
  if(target.origin===origin&&target.pathname.startsWith('/api/routes/'))return request.respond({status:503,contentType:'application/json',body:'{"error":"Simulated route outage"}'}).catch(()=>{});
  if(target.origin!==origin&&!['data:','blob:'].includes(target.protocol))return request.abort().catch(()=>{});
  return request.continue().catch(()=>{});
 });
 const seedSession=profile=>page.evaluateOnNewDocument(({host,profile})=>{
  const part=value=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=`${part({alg:'HS256',typ:'JWT'})}.${part({sub:profile.id,role:'authenticated',exp})}.test`;
  localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`,JSON.stringify({access_token:token,refresh_token:'test',token_type:'bearer',expires_at:exp,expires_in:3600,user:profile}));
 },{host,profile});
 await seedSession(account);
 const clickButton=async text=>{
  const buttons=await page.$$('button');
  for(const button of buttons)if(await button.evaluate((el,text)=>el.innerText===text,text)){await button.click();return;}
  throw new Error(`Button not found: ${text}`);
 };
 const check=async(path,expected)=>{
  await page.goto(`${origin}${path}`,{waitUntil:'networkidle0',timeout:30000});
  try{await page.waitForFunction(text=>document.body.innerText.includes(text),{timeout:15000},expected);}
  catch(error){console.error('Browser diagnostics:',JSON.stringify({path,url:page.url(),errors,requests,logs,storage:await page.evaluate(()=>Object.keys(localStorage)),body:(await page.$eval('body',el=>el.innerText)).slice(0,400)}));throw error;}
  assert.doesNotMatch(await page.$eval('body',el=>el.innerText),/Something hiccuped|Application error/);
  assert.deepEqual(errors,[],`${path} must not throw in the browser`);
  console.log(`PASS ${path}`);
 };
 await check('/service','Manage your rides');
 await check(`/tracking/${trip}`,'Leave to collect passengers');
 await clickButton('Leave to collect passengers');
 await page.waitForFunction(()=>document.body.innerText.includes('I’ve arrived at pickup'),{timeout:15000});
 await page.waitForFunction(()=>document.body.innerText.includes('Sharing ride location')||document.body.innerText.includes('GPS:'),{timeout:15000});
 assert.deepEqual(errors,[],'Starting pickup must not crash when background tracking mounts');
 console.log('PASS pickup start with simultaneous background tracking');
 await check('/service','Manage your rides');
 await check(`/tracking/${trip}`,'I’ve arrived at pickup');
 await check(`/chat/${trip}`,'Ride chat');
 await check('/bookings','My bookings');
 await check('/user','Good');
 await check('/profile','My profile');
 await check('/rides/create','Create a ride');
 account={...profile,id:rider,full_name:'Test Rider',user_type:'student'};snapshot.pin='1234';
 await seedSession(account);
 await check('/bookings','My bookings');
 await check(`/tracking/${trip}`,'Your journey');
 await page.waitForFunction(()=>document.body.innerText.includes('1234'));
 assert.equal(await page.$eval('body',el=>el.innerText.includes('I’ve arrived at pickup')),false);
 await clickButton('I’m at the pickup');
 await page.waitForFunction(()=>document.body.innerText.includes('Driver knows you’re ready'));
 assert.deepEqual(errors,[]);
 console.log('PASS rider pickup PIN and ready confirmation');
 console.log('Production browser smoke checks passed with simulated data.');
} finally {await browser.close();}
