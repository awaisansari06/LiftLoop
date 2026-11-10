import test from 'node:test';
import assert from 'node:assert/strict';
import {hookHarness} from './helpers/hook-harness.mjs';

test('navigation callback stays stable so login effects do not restart on every render',()=>{
 const calls=[];
 const router={push:to=>calls.push(['push',to]),replace:to=>calls.push(['replace',to]),back:()=>calls.push(['back']),forward:()=>calls.push(['forward'])};
 const hook=hookHarness('src/lib/navigation.tsx',{'next/navigation':{useRouter:()=>router},'next/link':{},'react/jsx-runtime':{}});
 const navigate=hook.render('useNavigate');
 assert.equal(hook.render('useNavigate'),navigate);
 navigate('/service');navigate('/login',{replace:true});navigate(-1);navigate(1);
 assert.deepEqual(calls,[['push','/service'],['replace','/login'],['back'],['forward']]);
});

test('journey API reports invalid snapshots and non-JSON outages as recoverable errors',async()=>{
 let data=null;
 const supabase={rpc:async()=>({data}),auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}};
 const api=hookHarness('src/lib/journey-api.ts',{'./supabase':{supabase}},{fetch:async()=>({ok:false,json:async()=>{throw new SyntaxError('Unexpected token <');}})});
 await assert.rejects(api.render('getJourney','trip'),/Could not load passenger details/);
 data={error:'Access denied'};
 await assert.rejects(api.render('getJourney','trip'),/Access denied/);
 data={passengers:[],pin:null};
 assert.equal(await api.render('getJourney','trip'),data);
 await assert.rejects(api.render('journeyAction','trip','start'),/Journey service is unavailable/);
});

test('a ride query failure is not mistaken for a deleted ride or empty driver bookings',async()=>{
 let error=null,data=null;
 const query={select(){return this;},eq(){return this;},maybeSingle:async()=>({data,error}),then(resolve){return Promise.resolve({data,error}).then(resolve);}};
 const api=hookHarness('src/lib/api.ts',{'./supabase':{supabase:{from:()=>query}},'./storage':{resolveStoredFiles:async value=>value},'./journey-api':{}});
 assert.equal(await api.render('getRideById','trip'),null);
 error=new Error('Connection interrupted');
 await assert.rejects(api.render('getRideById','trip'),/Connection interrupted/);
 await assert.rejects(api.render('getDriverBookingRequests','driver'),/Connection interrupted/);
});
