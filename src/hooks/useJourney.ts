import {useCallback,useEffect,useRef,useState} from 'react';
import {getJourney,journeyAction} from '@/lib/journey-api';
import {supabase} from '@/lib/supabase';
import type {JourneySnapshot} from '@/lib/journey';

export function useJourney(rideId:string|undefined) {
  const [snapshot,setSnapshot]=useState<JourneySnapshot|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const running=useRef(false);
  const refresh=useCallback(async()=>{if(!rideId)return;try{setSnapshot(await getJourney(rideId));setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load passengers.');}},[rideId]);
  useEffect(()=>{
    setSnapshot(null);if(!rideId)return;void refresh();
    const timer=setInterval(()=>void refresh(),5000);
    const channel=supabase.channel(`passengers:${rideId}`).on('postgres_changes',{event:'*',schema:'public',table:'passenger_journeys',filter:`ride_id=eq.${rideId}`},()=>void refresh()).subscribe();
    return()=>{clearInterval(timer);void supabase.removeChannel(channel);};
  },[rideId,refresh]);
  const act=async(action:string,booking?:string,payload:Record<string,unknown>={})=>{
    if(!rideId||running.current)return false;
    running.current=true;setBusy(true);setError('');
    try{await journeyAction(rideId,action,booking,payload);await refresh();return true;}
    catch(e){setError(e instanceof Error?e.message:'Could not update the journey.');return false;}
    finally{running.current=false;setBusy(false);}
  };
  return {snapshot,error,busy,refresh,act};
}
