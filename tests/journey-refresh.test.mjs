import test from 'node:test';
import assert from 'node:assert/strict';
import {hookHarness,deferred,settle} from './helpers/hook-harness.mjs';
import {realtimeTopic} from '../src/lib/realtime-topic.ts';

function journeyHarness(){
 const reads=[],actions=[],channels=[];
 const supabase={channel(topic){const channel={topic,on(){return this;},subscribe(){return this;}};channels.push(channel);return channel;},removeChannel(){}};
 const hook=hookHarness('src/hooks/useJourney.ts',{
  '@/lib/supabase':{supabase},'@/lib/realtime-topic':{realtimeTopic},
  '@/lib/journey-api':{getJourney(trip){const request=deferred();reads.push({trip,...request});return request.promise;},journeyAction(){const request=deferred();actions.push(request);return request.promise;}},
 });
 return {hook,reads,actions,channels};
}

test('background journey stays idle before a driver has an active trip',()=>{
 const {hook,reads,channels}=journeyHarness();
 const state=hook.render('useJourney',undefined);
 assert.equal(state.snapshot,null);assert.equal(state.busy,false);
 assert.equal(reads.length,0);assert.equal(channels.length,0);
 hook.unmount();
});

test('journey ignores late responses from a previous trip and older polls',async()=>{
 const {hook,reads}=journeyHarness();
 hook.render('useJourney','first');
 hook.render('useJourney','second');
 reads[1].resolve({passengers:['second']});await settle();
 reads[0].resolve({passengers:['first']});await settle();
 assert.equal(hook.render('useJourney','second').snapshot.passengers[0],'second');
 hook.poll();hook.poll();
 reads[3].resolve({passengers:['newer']});await settle();
 reads[2].reject(new Error('Old network failure'));await settle();
 const state=hook.render('useJourney','second');
 assert.equal(state.snapshot.passengers[0],'newer');assert.equal(state.error,'');
 hook.unmount();
});

test('PIN failure survives background refresh and duplicate clicks send only one action',async()=>{
 const {hook,reads,actions}=journeyHarness();
 let state=hook.render('useJourney','trip');
 reads[0].resolve({passengers:[]});await settle();
 const first=state.act('board','booking',{pin:'bad'});
 assert.equal(await state.act('board','booking',{pin:'bad'}),false);
 assert.equal(actions.length,1);
 actions[0].reject(new Error('Incorrect pickup PIN'));
 assert.equal(await first,false);
 hook.poll();reads[1].resolve({passengers:[]});await settle();
 state=hook.render('useJourney','trip');
 assert.equal(state.error,'Incorrect pickup PIN');assert.equal(state.busy,false);
 hook.unmount();
});

test('finishing an old action cannot update or unlock the next trip',async()=>{
 const {hook,reads,actions}=journeyHarness();
 const first=hook.render('useJourney','first').act('start');
 hook.render('useJourney','second');
 const second=hook.render('useJourney','second').act('start');
 actions[0].resolve({ok:true});assert.equal(await first,false);
 assert.equal(hook.render('useJourney','second').busy,true);
 actions[1].resolve({ok:true});await settle();
 reads.at(-1).resolve({passengers:[]});assert.equal(await second,true);
 assert.equal(hook.render('useJourney','second').busy,false);
 hook.unmount();
});

test('live GPS clears removed records and ignores a pending read after deletion',async()=>{
 const reads=[],channels=[];
 const supabase={
  from(){return {select(){return this;},eq(){return this;},maybeSingle(){const request=deferred();reads.push(request);return request.promise;}};},
  channel(){const ch={on(_event,_filter,callback){this.receive=callback;return this;},subscribe(){return this;}};channels.push(ch);return ch;},removeChannel(){},
 };
 const hook=hookHarness('src/hooks/useRealtime.ts',{'../lib/supabase':{supabase},'../lib/realtime-topic':{realtimeTopic},'./useStore':{},'react-hot-toast':{}});
 const row={location:{lat:28,lng:77},updated_at:new Date().toISOString()};
 hook.render('useRealtimeLocation','trip');reads[0].resolve({data:row});await settle();
 assert.equal(hook.render('useRealtimeLocation','trip').lat,28);
 hook.poll();channels[0].receive({eventType:'DELETE'});
 reads[1].resolve({data:row});await settle();
 assert.equal(hook.render('useRealtimeLocation','trip'),null);
 channels[0].receive({eventType:'INSERT',new:row});
 hook.poll();reads[2].resolve({data:null});await settle();
 assert.equal(hook.render('useRealtimeLocation','trip'),null);
 hook.unmount();
});
