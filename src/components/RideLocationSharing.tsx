'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {useAuthStore} from '@/hooks/useStore';
import {useLocationTracking} from '@/hooks/useLocationTracking';
import {supabase} from '@/lib/supabase';
import {useJourneyNavigation} from '@/hooks/useJourneyNavigation';
const TrackingContext=createContext<{rideId:string|undefined;error:string|null;route:[number,number][];routeMinutes:number|null;routeError:string}>({rideId:undefined,error:null,route:[],routeMinutes:null,routeError:''});
export const useDriverTracking=()=>useContext(TrackingContext);
export function RideLocationSharing({children}:{children:React.ReactNode}) {
  const {user}=useAuthStore();const [rideId,setRideId]=useState<string>();
  useEffect(()=>{
    let cancelled=false;setRideId(undefined);if(!user)return;
    const refresh=async()=>{const {data,error}=await supabase.from('rides').select('id').eq('driver_id',user.id).eq('status','in_progress').limit(1);if(!cancelled&&!error)setRideId(data?.[0]?.id);};
    void refresh();const timer=setInterval(()=>void refresh(),5000);
    const channel=supabase.channel(`driving:${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'rides',filter:`driver_id=eq.${user.id}`},()=>void refresh()).subscribe();
    return()=>{cancelled=true;clearInterval(timer);void supabase.removeChannel(channel);};
  },[user?.id]);
  const tracking=useLocationTracking(rideId,user?.id,!!rideId);
  const navigation=useJourneyNavigation(rideId);
  useEffect(()=>{
    if(!rideId||!('wakeLock' in navigator))return;
    let lock:WakeLockSentinel|undefined;let cancelled=false;
    const acquire=async()=>{if(document.visibilityState==='visible')try{const next=await navigator.wakeLock.request('screen');if(cancelled)await next.release();else lock=next;}catch{/* Browser may deny wake locks in low power mode. */}};
    void acquire();document.addEventListener('visibilitychange',acquire);
    return()=>{cancelled=true;document.removeEventListener('visibilitychange',acquire);void lock?.release();};
  },[rideId]);
  return <TrackingContext.Provider value={{rideId,error:tracking.error,...navigation}}>{rideId&&<a href={`/tracking/${rideId}`} className="fixed bottom-20 left-3 z-[1500] max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">{tracking.error?`GPS: ${tracking.error}`:'Sharing ride location · Keep LiftLoop open'} · Open trip</a>}{children}</TrackingContext.Provider>;
}
