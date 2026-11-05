import {useEffect,useState} from 'react';
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
