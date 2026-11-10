import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {RealtimeClient} from '@supabase/realtime-js';
import {realtimeTopic} from '../src/lib/realtime-topic.ts';

const trip='00000000-0000-4000-8000-000000000001';
const subscriptions=[
 {scope:`passengers:${trip}`,table:'passenger_journeys'},
 {scope:`ride:${trip}:location`,table:'live_locations'},
];

for(const {scope,table} of subscriptions) {
 test(`${table}: reproduce the collision when pickup starts with the trip page open`,()=>{
  const client=new RealtimeClient('wss://example.invalid/realtime/v1',{params:{apikey:'test'}});
  const page=client.channel(scope).on('postgres_changes',{event:'*',schema:'public',table,filter:`ride_id=eq.${trip}`},()=>{});
  page.state='joined';
  assert.throws(()=>client.channel(scope).on('postgres_changes',{event:'*',schema:'public',table},()=>{}),/cannot add/);
 });

 test(`${table}: page, background tracking and reopened page own independent subscriptions`,async()=>{
  const client=new RealtimeClient('wss://example.invalid/realtime/v1',{params:{apikey:'test'}});
  const filter={event:'*',schema:'public',table,filter:`ride_id=eq.${trip}`};
  const page=client.channel(realtimeTopic(scope)).on('postgres_changes',filter,()=>{});
  page.state='joined';
  const background=client.channel(realtimeTopic(scope)).on('postgres_changes',filter,()=>{});
  background.state='joined';
  const reopened=client.channel(realtimeTopic(scope)).on('postgres_changes',filter,()=>{});
  assert.equal(new Set([page,background,reopened]).size,3);
  assert.equal(background.bindings.postgres_changes[0].filter.filter,filter.filter);
  // Removing the page's subscription must leave background tracking intact.
  await client.removeChannel(page);
  assert.ok(client.getChannels().includes(background));
  assert.ok(client.getChannels().includes(reopened));
 });
}

test('both journey hooks allocate a topic for each effect instance',()=>{
 for(const file of ['src/hooks/useJourney.ts','src/hooks/useRealtime.ts']) {
  const source=readFileSync(file,'utf8');
  assert.match(source,/supabase\s*\.channel\(realtimeTopic\(/);
  assert.doesNotMatch(source,/\.channel\(`(?:passengers:|ride:)/);
 }
});

test('every app realtime channel has its own topic to support concurrent mounts',()=>{
 let count=0;
 for(const file of readdirSync('src',{recursive:true}).filter(file=>/\.tsx?$/.test(file))) {
  const source=ts.createSourceFile(file,readFileSync(`src/${file}`,'utf8'),ts.ScriptTarget.Latest,true);
  const visit=node=>{
   if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='channel') {
    const topic=node.arguments[0];count++;
    assert.ok(topic&&ts.isCallExpression(topic)&&topic.expression.getText(source)==='realtimeTopic',`${file}: channel must allocate a topic per effect`);
   }
   ts.forEachChild(node,visit);
  };
  visit(source);
 }
 assert.ok(count>=15);
});
