from pathlib import Path
p=Path('src/hooks/useLocationTracking.ts');p.write_text('''import {useEffect,useState} from 'react';
import {updateLiveLocation} from '../lib/api';

export function useLocationTracking(rideId:string|undefined,driverId:string|undefined,enabled:boolean) {
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  setError(null);
  if(!enabled||!rideId||!driverId)return;
  if(!navigator.geolocation){setError('This browser does not support GPS.');return;}
  let cancelled=false,busy=false,lastSent=0;
  const fail=(failure:GeolocationPositionError)=>{
   if(cancelled)return;
   setError(failure.code===1?'Location permission denied. Allow location for this site, then reload.':failure.code===2?'GPS is unavailable. Check device location settings.':'GPS timed out. Keep this page open; retrying.');
  };
  const send=async(position:GeolocationPosition)=>{
   if(cancelled||busy||Date.now()-lastSent<5000)return;
   busy=true;
   try{
    await updateLiveLocation(rideId,driverId,{lat:position.coords.latitude,lng:position.coords.longitude},position.coords.speed);
    lastSent=Date.now();if(!cancelled)setError(null);
   }catch(failure){if(!cancelled)setError(failure instanceof Error?failure.message:'Could not share GPS. Check your connection.');}
   finally{busy=false;}
  };
  const options={enableHighAccuracy:true,maximumAge:10000,timeout:10000};
  const watch=navigator.geolocation.watchPosition(send,fail,options);
  // Refresh fixes for stationary drivers as well as moving drivers.
  const timer=window.setInterval(()=>navigator.geolocation.getCurrentPosition(send,fail,options),15000);
  return ()=>{cancelled=true;navigator.geolocation.clearWatch(watch);window.clearInterval(timer);};
 },[rideId,driverId,enabled]);
 return {error};
}
''',encoding='utf-8')
p=Path('src/screens/LiveTracking.tsx');s=p.read_text(encoding='utf-8').replace('getRideById, createSOSAlert','getRideById, createSOSAlert, updateRide');s=s.replace('import { cn }','import {supabase} from "@/lib/supabase";\nimport {trackingStatus} from "@/lib/tracking-status";\nimport { cn }');s=s.replace('  useLocationTracking(rideId, user?.id, isDriver && ride?.status === "in_progress");','''  const gps=useLocationTracking(rideId,user?.id,isDriver && ride?.status==='in_progress');
  const [changing,setChanging]=useState(false);
  const [clock,setClock]=useState(Date.now());
  const tracking=trackingStatus(ride?.status,realtimeLocation?.updatedAt,clock);
  const changeStatus=async()=>{
    if(!ride || changing)return;
    if(ride.status==='in_progress'&&!window.confirm('Finish the ride and complete its confirmed bookings?'))return;
    setChanging(true);
    try{setRide(await updateRide(ride.id,{status:ride.status==='active'?'in_progress':'completed'}));}
    catch(error){window.alert(error instanceof Error?error.message:'Could not update ride');}
    finally{setChanging(false);}
  };
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),5000);return()=>window.clearInterval(timer);},[]);''');a=s.index('  useEffect(() => {\n    async function load()');b=s.index('\n  const fromLat',a);s=s[:a]+'''  useEffect(()=>{
    let cancelled=false;
    if(!rideId)return;
    const load=async()=>{try{const trip=await getRideById(rideId);if(!cancelled)setRide(trip);}finally{if(!cancelled)setLoading(false);}};
    const channel=supabase.channel(`tracking-status:${rideId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rides',filter:`id=eq.${rideId}`},()=>{void load();}).subscribe();
    void load();
    const timer=window.setInterval(()=>{void load();},5000);
    return()=>{cancelled=true;window.clearInterval(timer);void supabase.removeChannel(channel);};
  },[rideId]);
'''+s[b:];s=s.replace('realtimeLocation?.lat || fromLat','realtimeLocation?.lat ?? fromLat').replace('realtimeLocation?.lng || fromLng','realtimeLocation?.lng ?? fromLng');s=s.replace('    return (\n      <div className="grid min-h-dvh', '    return (\n      <div className="grid min-h-dvh',1);needle='  return (\n    <div className="flex h-dvh';s=s.replace(needle,'''  if(!ride)return <div className="p-6">Ride unavailable or access denied. <button onClick={()=>navigate('/bookings')}>Back to bookings</button></div>;

'''+needle);s=s.replace('realtimeLocation ? "bg-success" : "bg-muted-foreground"','tracking.live ? "bg-success" : "bg-muted-foreground"').replace('<Badge tone={realtimeLocation ? "success" : "neutral"}>{realtimeLocation ? "Live tracking" : "Waiting for driver"}</Badge>','<Badge tone={tracking.live ? "success" : "neutral"}>{tracking.label}</Badge>');s=s.replace('      {/* map */}', '''      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="text-sm">
          <p className="font-semibold">{isDriver?'Meet passengers at the pickup point':'Meet your driver at the pickup point'}</p>
          <p className="text-muted-foreground">{ride.from_location.address || 'Pickup marked A'} · Use Chat to coordinate. {isDriver?'Keep this page open and allow GPS after starting.':'The driver starts and finishes the ride.'}</p>
          {gps.error && isDriver && <p role="alert" className="text-danger">{gps.error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${fromLat},${fromLng}`} target="_blank" rel="noreferrer" className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Directions to pickup</a>
          {isDriver && ['active','in_progress'].includes(ride.status) && <Button onClick={changeStatus} loading={changing}>{ride.status==='active'?'Start ride':'Finish ride'}</Button>}
        </div>
      </div>
      {/* map */}''');s=s.replace('eta && realtimeLocation &&','eta && tracking.live &&').replace('Driver is {formatDuration(eta.duration)} away','To destination: {formatDuration(eta.duration)}');s=s.replace('<Badge tone={realtimeLocation ? "success" : "warning"}>{realtimeLocation ? "Online" : "Offline"}</Badge>','<Badge tone={tracking.live ? "success" : "warning"}>{tracking.label}</Badge>');s=s.replace('<a href={`tel:${ride?.driver?.phone || ""}`}>','{ride?.driver?.phone && !isDriver && <a href={`tel:${ride.driver.phone}`}>').replace('            </a>\n            <Button variant="secondary"','            </a>}\n            <Button variant="secondary"');s=s.replace('className="grid grid-cols-3 gap-2.5"','className="flex flex-wrap gap-2.5"');p.write_text(s,encoding='utf-8')
