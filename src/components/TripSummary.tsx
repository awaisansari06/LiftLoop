import {useEffect,useState} from 'react';
import type {Booking} from '@/types';
import type {PassengerJourney} from '@/lib/journey';
import {supabase} from '@/lib/supabase';
import {createReview,reportRide} from '@/lib/api';
import {useAuthStore} from '@/hooks/useStore';
import {Button} from '@/components/ui/primitives';

export function TripSummary({booking,passenger}:{booking:Booking;passenger?:PassengerJourney}) {
  const {user}=useAuthStore();
  const [rating,setRating]=useState(5),[comment,setComment]=useState(''),[reason,setReason]=useState('');
  const [reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{let cancelled=false;if(user)void supabase.from('reviews').select('id').eq('ride_id',booking.ride_id).eq('reviewer_id',user.id).eq('reviewee_id',booking.ride?.driver_id||'').then(({data})=>{if(!cancelled)setReviewed(!!data?.length);});return()=>{cancelled=true;};},[booking.ride_id,booking.ride?.driver_id,user]);
  const save=async(kind:'review'|'report')=>{
    if(!user||!booking.ride||busy)return;setBusy(true);setMessage('');
    try{
      if(kind==='review'){await createReview({ride_id:booking.ride_id,reviewer_id:user.id,reviewee_id:booking.ride.driver_id,rating,comment:comment.trim()});setReviewed(true);setMessage('Thank you. Your rating has been saved.');}
      else{if(reason.trim().length<5)throw new Error('Please describe the problem in at least 5 characters.');await reportRide({ride_id:booking.ride_id,reporter_id:user.id,reported_user_id:booking.ride.driver_id,reason:reason.trim()});setReason('');setMessage('Your report has been sent to support.');}
    }catch(e){setMessage(e instanceof Error?e.message:'Could not save. Please retry.');}finally{setBusy(false);}
  };
  const receipt=()=>{
    const lines=['LiftLoop trip receipt',`Booking: ${booking.id}`,`Departure: ${new Date(booking.ride!.departure_time).toLocaleString()}`,`Pickup: ${passenger?.pickup.address||booking.ride?.from_location.address||''}`,`Drop-off: ${passenger?.dropoff.address||booking.ride?.to_location.address||''}`,`Boarded: ${passenger?.boarded_at?new Date(passenger.boarded_at).toLocaleString():'Not recorded'}`,`Dropped off: ${passenger?.dropped_off_at?new Date(passenger.dropped_off_at).toLocaleString():'Not recorded'}`,`Seats: ${booking.seats_booked}`,`Amount: INR ${booking.total_price}`,`Payment: ${booking.payment_status}`,`Provider: ${booking.payment_provider||'stripe_test'}`,'TEST PAYMENT — not a tax invoice; no real money charged.'];
    const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`LiftLoop-${booking.id}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <details className="mt-3 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">Trip summary, receipt & help</summary>
    <p className="mt-3 text-sm">Payment: {booking.payment_status} · ₹{booking.total_price} · {booking.seats_booked} seat(s)</p>
    {passenger?.boarded_at&&<p className="text-sm">Picked up: {new Date(passenger.boarded_at).toLocaleString()}</p>}
    {passenger?.dropped_off_at&&<p className="text-sm">Dropped off: {new Date(passenger.dropped_off_at).toLocaleString()}</p>}
    {passenger?.status==='no_show'&&<p className="text-sm">Pickup missed. Contact support about any refund; none has been issued automatically.</p>}
    {booking.ride&&<Button size="sm" variant="secondary" onClick={receipt} className="mt-2">Download receipt</Button>}
    {booking.status==='completed'&&<div className="mt-4">{reviewed?<p className="text-sm">Your rating is saved.</p>:<><label className="block text-sm">Rate your driver <select aria-label="Driver rating" value={rating} onChange={e=>setRating(Number(e.target.value))} className="ml-2 rounded border border-border bg-card p-2">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} star{n===1?'':'s'}</option>)}</select></label><textarea aria-label="Review comment" value={comment} onChange={e=>setComment(e.target.value)} maxLength={1000} placeholder="How was your ride? (optional)" className="mt-2 w-full rounded-lg border border-border bg-card p-2"/><Button size="sm" loading={busy} onClick={()=>save('review')}>Save rating</Button></>}</div>}
    <label className="mt-4 block text-sm">Report a trip problem<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000} placeholder="Tell support what happened" className="mt-1 w-full rounded-lg border border-border bg-card p-2"/></label>
    <Button size="sm" variant="secondary" loading={busy} onClick={()=>save('report')}>Send report</Button>
    {message&&<p role="status" className="mt-2 text-sm">{message}</p>}
  </details>;
}
