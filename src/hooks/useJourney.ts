import {useCallback,useEffect,useRef,useState} from 'react';
import {getJourney,journeyAction} from '@/lib/journey-api';
import {supabase} from '@/lib/supabase';
import type {JourneySnapshot} from '@/lib/journey';
import {realtimeTopic} from '@/lib/realtime-topic';

export function useJourney(rideId:string|undefined) {
  const [snapshot,setSnapshot]=useState<{rideId:string;data:JourneySnapshot}|null>(null);
  const [loadError,setLoadError]=useState('');
  const [actionError,setActionError]=useState('');
  const [busy,setBusy]=useState(false);
  const running=useRef<object|null>(null);
  const lifecycle=useRef<object|null>(null);
  const requests=useRef(0),applied=useRef(0);
  const refresh=useCallback(async()=>{
    const owner=lifecycle.current;
    if(!rideId||!owner)return;
    const request=++requests.current;
    const current=()=>lifecycle.current===owner&&request>=applied.current;
    try {
      const data=await getJourney(rideId);
      if(current()){applied.current=request;setSnapshot({rideId,data});setLoadError('');}
    }catch(e){if(current()){applied.current=request;setLoadError(e instanceof Error?e.message:'Could not load passengers.');}}
  },[rideId]);
  useEffect(()=>{
    lifecycle.current={};running.current=null;setBusy(false);setSnapshot(null);setLoadError('');setActionError('');
    if(!rideId)return;
    void refresh();
    const timer=setInterval(()=>void refresh(),5000);
    const channel=supabase.channel(realtimeTopic(`passengers:${rideId}`)).on('postgres_changes',{event:'*',schema:'public',table:'passenger_journeys',filter:`ride_id=eq.${rideId}`},()=>void refresh()).subscribe();
    return()=>{lifecycle.current=null;running.current=null;clearInterval(timer);void supabase.removeChannel(channel);};
  },[rideId,refresh]);
  const act=async(action:string,booking?:string,payload:Record<string,unknown>={})=>{
    if(!rideId||!lifecycle.current||running.current)return false;
    const owner=lifecycle.current,operation={};
    running.current=operation;setBusy(true);setActionError('');
    try{
      await journeyAction(rideId,action,booking,payload);
      if(lifecycle.current!==owner)return false;
      applied.current=++requests.current;
      await refresh();return true;
    }
    catch(e){if(lifecycle.current===owner)setActionError(e instanceof Error?e.message:'Could not update the journey.');return false;}
    finally{if(running.current===operation){running.current=null;setBusy(false);}}
  };
  return {snapshot:snapshot&&snapshot.rideId===rideId?snapshot.data:null,error:actionError||loadError,busy,refresh,act};
}
