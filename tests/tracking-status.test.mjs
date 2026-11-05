import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingStatus} from '../src/lib/tracking-status.ts';
const now=Date.parse('2026-11-05T12:00:00Z');
test('login alone does not claim live GPS on an unstarted trip',()=>{
 assert.deepEqual(trackingStatus('active',new Date(now).toISOString(),now),{label:'Ride not started',live:false});
});
test('live location expires and missing GPS is not labelled offline',()=>{
 assert.equal(trackingStatus('in_progress',new Date(now-10000).toISOString(),now).live,true);
 assert.deepEqual(trackingStatus('in_progress',new Date(now-60000).toISOString(),now),{label:'GPS update delayed',live:false});
 assert.deepEqual(trackingStatus('in_progress',undefined,now),{label:'Waiting for GPS',live:false});
 assert.equal(trackingStatus('in_progress','invalid',now).live,false);
});
test('finished or cancelled trip cannot remain live because of a recent position',()=>{
 for(const status of ['completed','cancelled'])assert.equal(trackingStatus(status,new Date(now).toISOString(),now).live,false);
});
