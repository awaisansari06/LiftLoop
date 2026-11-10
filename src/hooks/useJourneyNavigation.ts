import {useEffect,useMemo,useRef,useState} from 'react';
import {useJourney} from './useJourney';
import {useRealtimeLocation} from './useRealtime';
import {calculateRoute} from '@/lib/maps';
import {journeyAction} from '@/lib/journey-api';
import {distanceKm,orderedStops} from '@/lib/journey';
import type {GeoLocation} from '@/types';

// Mounted for the driver's entire session, so navigation between pages doesn't stop ETAs.
export function useJourneyNavigation(rideId:string|undefined) {
  const {snapshot,refresh}=useJourney(rideId);
  const location=useRealtimeLocation(rideId||'');
  const [clock,setClock]=useState(Date.now());
  const [route,setRoute]=useState<[number,number][]>([]),[routeMinutes,setRouteMinutes]=useState<number|null>(null),[routeError,setRouteError]=useState('');
  const key=JSON.stringify(snapshot?.passengers.map(p=>[p.booking_id,p.status,p.pickup,p.dropoff,p.pickup_order,p.dropoff_order]));
  const stops=useMemo(()=>orderedStops(snapshot?.passengers||[]),[key]);
  const next=stops[0],tick=Math.floor(clock/30000);
  const fresh=!!location&&clock-Date.parse(location.updatedAt)<45000;
  const nearbyAttempt=useRef('');
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),5000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    let cancelled=false;
    setRoute([]);setRouteMinutes(null);setRouteError('');
    if(!rideId||!location||!fresh||!stops.length)return;
    void (async()=>{
      try {
        let from:GeoLocation={lat:location.lat,lng:location.lng};let elapsed=Math.max(0,(Date.parse(snapshot?.delay_until||'')-Date.now())/60000)||0;
        const estimates:{bookingId:string;minutes:number}[]=[];
        for(let index=0;index<stops.length;index++) {
          const stop=stops[index];const leg=await calculateRoute(from,stop.location);if(cancelled)return;
          elapsed+=leg.duration;
          if(index===0){setRoute(leg.geometry);setRouteMinutes(elapsed);setRouteError('');}
          if(stop.kind==='pickup'||stop.passenger.status==='onboard')estimates.push({bookingId:stop.bookingId,minutes:Math.ceil(elapsed)});
          if(stop.kind==='pickup')elapsed+=2;
          from=stop.location;
        }
        if(!cancelled)await journeyAction(rideId,'eta',undefined,{estimates});
      }catch{if(!cancelled){setRouteMinutes(null);setRouteError('Route ETA unavailable. Saved stops are still visible.');}}
    })();
    return()=>{cancelled=true;};
  },[rideId,key,tick,fresh,snapshot?.delay_until]);
  useEffect(()=>{
    if(!rideId||!fresh||!location||!next||next.kind!=='pickup'||next.passenger.status!=='waiting'||distanceKm(location,next.location)>0.5)return;
    if(nearbyAttempt.current===next.bookingId)return;nearbyAttempt.current=next.bookingId;
    void journeyAction(rideId,'nearby',next.bookingId).then(()=>refresh()).catch(()=>{nearbyAttempt.current='';});
  },[rideId,fresh,location?.updatedAt,next?.bookingId,next?.passenger.status]);
  return {route,routeMinutes,routeError};
}
