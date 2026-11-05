import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedStops,etaText,cancellationPolicy,distanceKm} from '../src/lib/journey.ts';
import {validPushEndpoint} from '../src/lib/push-endpoint.ts';
import {isCurrentJourneyAlert} from '../src/lib/journey-alert.ts';
const passenger=(id,status='waiting',order=1)=>({booking_id:id,status,pickup_order:order,dropoff_order:order,pickup:{lat:28,lng:77},dropoff:{lat:29,lng:78}});
test('stop order collects passengers before individual drop-offs, excluding terminal stops',()=>{
 const stops=orderedStops([passenger('b','waiting',2),passenger('a','onboard'),passenger('c','no_show'),passenger('d','cancelled'),passenger('e','dropped_off')]);
 assert.deepEqual(stops.map(s=>`${s.kind}:${s.bookingId}`),['pickup:b','dropoff:a','dropoff:b']);
});
test('personal ETA expires rather than displaying an old estimate',()=>{
 const now=Date.now();const p={...passenger('a'),eta_at:new Date(now+180000).toISOString(),eta_updated_at:new Date(now).toISOString()};
 assert.equal(etaText(p,now),'About 3 min to pickup');assert.equal(etaText({...p,status:'onboard'},now),'About 3 min to drop-off');assert.match(etaText(p,now+100000),/updated ETA/);
});
test('refund messaging follows departure, lifecycle and provider eligibility',()=>{
 const now=Date.now();const booking={status:'confirmed',payment_status:'paid',payment_provider:'razorpay_test',total_price:120};const ride={status:'active',departure_time:new Date(now+60000).toISOString()};
 assert.equal(cancellationPolicy(booking,ride,now).refund,120);assert.equal(cancellationPolicy(booking,ride,now).allowed,true);
 assert.equal(cancellationPolicy(booking,{...ride,status:'in_progress'},now).allowed,false);
 assert.equal(cancellationPolicy(booking,ride,now+61000).allowed,false);
 assert.equal(cancellationPolicy({...booking,payment_provider:'stripe_test'},ride,now).allowed,false);
 assert.equal(distanceKm({lat:28,lng:77},{lat:28,lng:77}),0);
});
test('push endpoints cannot target local services or lookalike domains',()=>{
 for(const url of ['https://fcm.googleapis.com/send/test','https://updates.push.services.mozilla.com/wpush/v2/test','https://web.push.apple.com/test','https://db5.notify.windows.com/test'])assert.equal(validPushEndpoint(url),true);
 for(const url of ['http://fcm.googleapis.com/test','https://fcm.googleapis.com.evil.example/test','https://127.0.0.1/test','https://localhost/test','https://fcm.googleapis.com:9999/test','https://user:pass@fcm.googleapis.com/test','not a URL'])assert.equal(validPushEndpoint(url),false);
});
test('retried push alerts cannot announce an arrival after boarding or after expiring',()=>{
 const now=Date.now(),created=new Date(now).toISOString();
 assert.equal(isCurrentJourneyAlert('Your driver has arrived','arrived',created,now),true);
 assert.equal(isCurrentJourneyAlert('Your driver has arrived','onboard',created,now),false);
 assert.equal(isCurrentJourneyAlert('Your driver is on the way','no_show',created,now),false);
 assert.equal(isCurrentJourneyAlert('Your driver is nearby','approaching',created,now+300001),false);
 assert.equal(isCurrentJourneyAlert('Passenger ready',undefined,created,now),true);
});
