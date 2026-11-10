import {useEffect,useMemo,useState} from 'react';
import {useParams,useNavigate} from '@/lib/navigation';
import {ArrowLeft,MessageCircle,Phone,TriangleAlert} from 'lucide-react';
import {MapView,type MapMarker} from '@/components/maps';
import {useAuthStore} from '@/hooks/useStore';
import {useRealtimeLocation} from '@/hooks/useRealtime';
import {useDriverTracking} from '@/components/RideLocationSharing';
import {useJourney} from '@/hooks/useJourney';
import {getRideById,createSOSAlert,getBookings} from '@/lib/api';
import {formatDuration} from '@/lib/maps';
import {etaText,journeyLabels,orderedStops,type PassengerJourney} from '@/lib/journey';
import {trackingStatus} from '@/lib/tracking-status';
import type {Booking,GeoLocation,Ride} from '@/types';
import {Badge,Button,Spinner} from '@/components/ui/primitives';
import {LocationField} from '@/components/ui/location-field';
import {TripSummary} from '@/components/TripSummary';

function PickupEditor({passenger,save,busy}:{passenger:PassengerJourney;save:(pickup:GeoLocation,dropoff:GeoLocation,landmark:string)=>Promise<boolean>;busy:boolean}) {
  const [pickup,setPickup]=useState(passenger.pickup),[dropoff,setDropoff]=useState(passenger.dropoff),[landmark,setLandmark]=useState(passenger.landmark),[saved,setSaved]=useState(false);
  return <details className="mt-3 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">Edit my pickup, drop-off & landmark</summary>
    <p className="my-2 text-xs text-muted-foreground">Choose meeting points along the advertised route. Your driver can review these before leaving.</p>
    <LocationField label="Your pickup" value={pickup.address||''} onSelect={loc=>{setPickup({lat:loc.coordinates[0],lng:loc.coordinates[1],address:loc.name});setSaved(false);}}/>
    <LocationField label="Your drop-off" tone="drop" value={dropoff.address||''} onSelect={loc=>{setDropoff({lat:loc.coordinates[0],lng:loc.coordinates[1],address:loc.name});setSaved(false);}}/>
    <label className="my-2 block text-sm">Pickup landmark<input maxLength={200} value={landmark} onChange={e=>{setLandmark(e.target.value);setSaved(false);}} placeholder="Main gate, opposite the pharmacy" className="mt-1 w-full rounded-lg border border-border bg-card p-2"/></label>
    <Button size="sm" loading={busy} onClick={async()=>{if(await save(pickup,dropoff,landmark))setSaved(true);}}>Save meeting points</Button>
    {saved&&<p role="status" className="mt-2 text-sm text-success">Saved. Your driver has been notified.</p>}
  </details>;
}

export default function LiveTracking() {
  const {rideId}=useParams<{rideId:string}>();const navigate=useNavigate();const {user}=useAuthStore();
  const [ride,setRide]=useState<Ride|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const [clock,setClock]=useState(Date.now()),[pin,setPin]=useState(''),[delay,setDelay]=useState(5),[sosing,setSosing]=useState(false),[sosMessage,setSosMessage]=useState('');
  const [booking,setBooking]=useState<Booking>();
  const {snapshot,error,busy,refresh,act}=useJourney(rideId);
  const rawLocation=useRealtimeLocation(rideId||'');const gps=useDriverTracking();const isDriver=ride?.driver_id===user?.id;
  const mine=snapshot?.passengers.filter(p=>p.rider_id===user?.id)||[];
  const own=mine.find(p=>['waiting','approaching','arrived'].includes(p.status))||mine.find(p=>p.status==='onboard')||mine[0];
  const location=own&&['dropped_off','no_show','cancelled'].includes(own.status)?null:rawLocation;
  const stopKey=JSON.stringify(snapshot?.passengers.map(p=>[p.booking_id,p.status,p.pickup,p.dropoff,p.pickup_order,p.dropoff_order]));
  const stops=useMemo(()=>orderedStops(snapshot?.passengers||[]),[stopKey]);const next=stops[0];
  const tracking=own?.status==='no_show'?{label:'Pickup missed',live:false}:trackingStatus(own?.status==='dropped_off'?'completed':ride?.status,location?.updatedAt,clock);
  const terminal=own&&['dropped_off','no_show','cancelled'].includes(own.status);
  const point=isDriver?next?.location:own?(own.status==='onboard'?own.dropoff:own.pickup):ride?.from_location;
  const position:GeoLocation|undefined=location?{lat:location.lat,lng:location.lng}:undefined;
  const {route,routeMinutes,routeError}=gps.rideId===rideId?gps:{route:[],routeMinutes:null,routeError:''};
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    let cancelled=false;setRide(null);setLoading(true);setLoadError('');if(!rideId)return;
    const load=async()=>{try{const r=await getRideById(rideId);if(!cancelled){setRide(r);setLoadError(r?'':'Ride unavailable or access denied.');}}catch{if(!cancelled)setLoadError('Could not load this ride. Check your connection.');}finally{if(!cancelled)setLoading(false);}};
    void load();const timer=setInterval(()=>void load(),5000);
    return()=>{cancelled=true;clearInterval(timer);};
  },[rideId]);
  useEffect(()=>{if(!user||isDriver||!rideId)return;let cancelled=false;void getBookings(user.id).then(all=>{if(!cancelled)setBooking(all.find(b=>b.ride_id===rideId&&(!own||b.id===own.booking_id)));}).catch(()=>{});return()=>{cancelled=true;};},[user?.id,rideId,isDriver,own?.status,own?.booking_id]);
  useEffect(()=>setPin(''),[next?.bookingId]);
  const markers=useMemo<MapMarker[]>(()=>{
    const result:MapMarker[]=[];
    if(location)result.push({id:'driver',position:[location.lat,location.lng],type:'vehicle',vehicleType:'car',popup:tracking.live?'Driver · live GPS':'Driver · last known location'});
    for(const p of snapshot?.passengers||[]) {
      if(!['cancelled','no_show','dropped_off','onboard'].includes(p.status))result.push({id:`pickup:${p.booking_id}`,position:[p.pickup.lat,p.pickup.lng],type:'pickup',popup:`Pickup ${p.pickup_order}: ${p.pickup.address||p.passenger_name}`});
      if(!['cancelled','no_show','dropped_off'].includes(p.status))result.push({id:`drop:${p.booking_id}`,position:[p.dropoff.lat,p.dropoff.lng],type:'drop',popup:`Drop-off ${p.dropoff_order}: ${p.dropoff.address||p.passenger_name}`});
    }
    return result;
  },[location?.updatedAt,stopKey,tracking.live]);
  const perform=async(action:string,id?:string,payload:Record<string,unknown>={})=>{
    if(await act(action,id,payload)){
      try{const updated=await getRideById(rideId!);if(updated)setRide(updated);setLoadError('');}
      catch{setLoadError('Your change was saved. Could not refresh the ride; retrying automatically.');}
    }
  };
  const sos=async()=>{
    if(!user||!rideId||sosing)return;setSosing(true);setSosMessage('');
    try {
      let current:GeoLocation|null=null;
      try{current=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),reject,{timeout:7000,maximumAge:10000}));}catch{/* Send without coordinates when device GPS is unavailable. */}
      await createSOSAlert({user_id:user.id,ride_id:rideId,location:current,message:current?'Emergency SOS':'Emergency SOS — current device location unavailable'});
      setSosMessage('SOS sent to the support team. If you are in immediate danger, call local emergency services.');
    }catch{setSosMessage('SOS could not be sent. Check your connection or call local emergency services now.');}finally{setSosing(false);}
  };
  if(loading)return <div className="grid min-h-[70dvh] place-items-center"><Spinner/></div>;
  if(!ride)return <div className="p-6" role="alert">{loadError}<Button onClick={()=>navigate('/bookings')}>Back to bookings</Button></div>;
  const waitingMinutes=next?.passenger.arrived_at?Math.max(0,Math.floor((clock-Date.parse(next.passenger.arrived_at))/60000)):0;
  return <main className="mx-auto max-w-6xl p-3 pb-32 md:p-6 md:pb-28">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button className="inline-flex items-center gap-1 text-sm" onClick={()=>navigate(-1)}><ArrowLeft className="size-4"/> Back</button><h1 className="font-display text-xl font-bold">{isDriver?'Manage your journey':'Your journey'}</h1><Badge tone={tracking.live?'success':'neutral'}>{tracking.label}</Badge></div>
    {(error||loadError)&&<div role="alert" className="mb-3 rounded-xl border border-danger/40 bg-card p-3 text-sm text-danger">{error||loadError}<button onClick={()=>void refresh()} className="ml-2 underline">Retry</button></div>}
    <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <MapView center={position?[position.lat,position.lng]:point?[point.lat,point.lng]:[ride.from_location.lat,ride.from_location.lng]} markers={markers} route={isDriver?route:[]} zoom={14} height="420px" showLocateButton={false}/>
        <div className="space-y-2 p-4">
          <p className="text-sm">{location?`GPS updated ${Math.max(0,Math.floor((clock-Date.parse(location.updatedAt))/1000))} seconds ago`:'Waiting for the driver’s first GPS update. No driver position is shown yet.'}</p>
          {isDriver&&gps.error&&<p role="alert" className="text-sm text-danger">{gps.error}</p>}
          {isDriver&&<p className="text-xs text-muted-foreground">Location sharing continues across LiftLoop pages. Keep the app open while driving; browsers may pause GPS when the screen is locked.</p>}
          {routeError&&<p role="status" className="text-sm">{routeError}</p>}
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={()=>navigate(`/chat/${rideId}`)} icon={<MessageCircle className="size-4"/>}>Ride chat</Button>
          {!isDriver&&(snapshot?.driver?.phone||ride.driver?.phone)&&<a className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm" href={`tel:${snapshot?.driver?.phone||ride.driver?.phone}`}><Phone className="size-4"/>Call driver</a>}
          {isDriver&&next?.passenger.phone&&<a className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm" href={`tel:${next.passenger.phone}`}><Phone className="size-4"/>Call next passenger</a>}
          <Button size="sm" variant="danger" loading={sosing} onClick={sos} icon={<TriangleAlert className="size-4"/>}>SOS</Button></div>
          {sosMessage&&<p role="status" className="text-sm">{sosMessage}</p>}
        </div>
      </section>
      <section className="space-y-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold">{isDriver?'Next stop':snapshot?.driver?.full_name||ride.driver?.full_name||'Your driver'}</h2>
          {!isDriver&&<p className="mt-1 text-sm">{snapshot?.vehicle?[snapshot.vehicle.vehicle_color,snapshot.vehicle.vehicle_model,snapshot.vehicle.vehicle_number].filter(Boolean).join(' · '):'Vehicle details have not been provided.'}</p>}
          {isDriver?next?<><p className="mt-2 text-lg font-semibold">{next.kind==='pickup'?'Pick up':'Drop off'} {next.passenger.passenger_name}</p><p className="text-sm">{next.location.address}</p>{next.kind==='pickup'&&<p className="mt-1 text-sm">{next.passenger.landmark||'No landmark added'} · {next.passenger.seats} seat(s){next.passenger.ready_at?' · Passenger is ready':''}</p>}{tracking.live&&routeMinutes!==null&&<p className="mt-2 font-semibold">About {formatDuration(routeMinutes)} to this stop</p>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${next.location.lat},${next.location.lng}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline">Navigate to this stop</a>
          </>:<p className="mt-2 text-sm">{ride.status==='completed'?'Journey finished.':'All passenger stops are resolved.'}</p>:own?<><p className="mt-3 font-semibold">{journeyLabels[own.status]}</p>{!terminal&&<p className="text-sm">{ride.status==='active'?'Waiting for your driver to leave.':tracking.live?etaText(own,clock):'ETA unavailable until GPS updates resume.'}</p>}<p className="mt-2 text-sm">Pickup: {own.pickup.address}</p><p className="text-sm">{own.landmark}</p><p className="mt-1 text-sm">Drop-off: {own.dropoff.address}</p></>:<p className="mt-2 text-sm">Loading your passenger details…</p>}
          {snapshot?.delay_until&&Date.parse(snapshot.delay_until)>clock&&<p role="status" className="mt-2 text-sm text-warning">Driver delay: about {Math.ceil((Date.parse(snapshot.delay_until)-clock)/60000)} minutes remaining.</p>}
        </div>
        {isDriver&&snapshot&&<div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          {ride.status==='active'&&<><p className="text-sm">Review passenger meeting points and stop order before leaving.</p><Button loading={busy} disabled={!next} onClick={()=>perform('start')}>Leave to collect passengers</Button></>}
          {ride.status==='in_progress'&&next&&<>
            {next.kind==='pickup'&&next.passenger.status!=='arrived'&&<Button loading={busy} onClick={()=>perform('arrive',next.bookingId)}>I’ve arrived at pickup</Button>}
            {next.kind==='pickup'&&next.passenger.status==='arrived'&&<><p className="text-sm">Waiting {waitingMinutes} min · Confirm the passenger and vehicle before boarding.</p><label className="block text-sm">Passenger’s pickup PIN<input inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} className="mt-1 w-full rounded-lg border border-border bg-card p-2"/></label><Button loading={busy} disabled={pin.length!==4} onClick={()=>perform('board',next.bookingId,{pin})}>Confirm pickup</Button><Button variant="secondary" loading={busy} disabled={waitingMinutes<5} onClick={()=>{if(window.confirm('Mark this passenger as a missed pickup? No automatic refund will be issued.'))void perform('no_show',next.bookingId);}}>Passenger not here {waitingMinutes<5?`(wait ${5-waitingMinutes} min)`:''}</Button></>}
            {next.kind==='dropoff'&&<Button loading={busy} onClick={()=>{if(window.confirm(`Confirm ${next.passenger.passenger_name} has safely left the vehicle at their drop-off?`))void perform('dropoff',next.bookingId);}}>Confirm drop-off</Button>}
          </>}
          {ride.status==='in_progress'&&!next&&<Button loading={busy} onClick={()=>perform('finish')}>Finish overall ride</Button>}
          {['active','in_progress'].includes(ride.status)&&<div className="border-t border-border pt-3"><label className="text-sm">Delay update <select aria-label="Driver delay" value={delay} onChange={e=>setDelay(Number(e.target.value))} className="rounded border border-border bg-card p-2">{[0,5,10,15,30,60].map(n=><option key={n} value={n}>{n===0?'Moving again':`${n} min`}</option>)}</select></label><Button className="mt-2" size="sm" variant="secondary" loading={busy} onClick={()=>perform('delay',undefined,{minutes:delay})}>Notify affected passengers</Button></div>}
        </div>}
        {!isDriver&&own&&!terminal&&<div className="rounded-2xl border border-border bg-card p-4">
          {own.status!=='onboard'&&<><p className="text-sm">Share this PIN only when you are boarding the correct vehicle.</p><p className="my-2 font-mono text-3xl font-bold tracking-[0.3em]">{snapshot?.pin||'••••'}</p><Button size="sm" disabled={!!own.ready_at} loading={busy} onClick={()=>perform('ready',own.booking_id)}>{own.ready_at?'Driver knows you’re ready':'I’m at the pickup'}</Button></>}
          {ride.status==='active'&&<PickupEditor key={own.booking_id} passenger={own} busy={busy} save={(pickup,dropoff,landmark)=>act('locations',own.booking_id,{pickup,dropoff,landmark})}/>}
        </div>}
        {booking&&terminal&&<TripSummary booking={booking} passenger={own}/>}
      </section>
    </div>
    {isDriver&&snapshot&&<section className="mt-5 rounded-2xl border border-border bg-card p-4"><h2 className="mb-3 font-bold">Passenger stops · pickups first, then drop-offs</h2><p className="mb-3 text-xs text-muted-foreground">Set the pickup and drop-off order before leaving. Completed and missed stops stay in the trip history below.</p>
      {(['pickup','dropoff'] as const).map(kind=>{const list=[...snapshot.passengers].filter(p=>!['cancelled','no_show','dropped_off'].includes(p.status)).sort((a,b)=>kind==='pickup'?a.pickup_order-b.pickup_order:a.dropoff_order-b.dropoff_order);return <div key={kind} className="mb-3"><h3 className="font-semibold">{kind==='pickup'?'Pickups':'Drop-offs'}</h3>{list.map((p,index)=><div key={p.booking_id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3"><div><p className="text-sm font-semibold">{index+1}. {p.passenger_name} · {journeyLabels[p.status]}</p><p className="text-xs">{(kind==='pickup'?p.pickup:p.dropoff).address}{kind==='pickup'&&p.landmark?` · ${p.landmark}`:''}</p></div>{ride.status==='active'&&index>0&&<Button size="sm" variant="secondary" disabled={busy} onClick={()=>perform('reorder',p.booking_id,{other:list[index-1].booking_id,kind})}>Move earlier</Button>}</div>)}</div>;})}
      {snapshot.passengers.filter(p=>['dropped_off','no_show','cancelled'].includes(p.status)).map(p=><p key={p.booking_id} className="mt-2 text-sm">{p.passenger_name}: {journeyLabels[p.status]}{p.dropped_off_at?` · ${new Date(p.dropped_off_at).toLocaleTimeString()}`:''}</p>)}
    </section>}
  </main>;
}
