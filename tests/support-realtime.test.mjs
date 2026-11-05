import test from 'node:test';
import assert from 'node:assert/strict';
import {RealtimeClient} from '@supabase/realtime-js';
import {realtimeTopic} from '../src/lib/realtime-topic.ts';
const filter={event:'INSERT',schema:'public',table:'support_messages'};
test('SDK reproduces the old shared-name Support crash',()=>{
 const client=new RealtimeClient('wss://example.invalid/realtime/v1',{params:{apikey:'test'}});
 const overview=client.channel('admin-support');
 overview.on('postgres_changes',filter,()=>{});
 overview.state='joined';
 assert.throws(()=>client.channel('admin-support').on('postgres_changes',filter,()=>{}),/cannot add/);
});
test('Support can mount and remount while previous subscriptions are still joined',()=>{
 const client=new RealtimeClient('wss://example.invalid/realtime/v1',{params:{apikey:'test'}});
 const overview=client.channel(realtimeTopic('overview-admin-support'));
 overview.on('postgres_changes',filter,()=>{});overview.state='joined';
 const first=client.channel(realtimeTopic('admin-support-inbox'));
 first.on('postgres_changes',filter,()=>{});first.state='joined';
 const reopened=client.channel(realtimeTopic('admin-support-inbox'));
 assert.doesNotThrow(()=>reopened.on('postgres_changes',filter,()=>{}));
 assert.notEqual(first,reopened);assert.notEqual(first,overview);
});
