import {supabase} from './supabase';
import type {JourneySnapshot} from './journey';
export async function getJourney(trip:string):Promise<JourneySnapshot> {
  const {data,error}=await supabase.rpc('journey_snapshot',{trip});
  if(error)throw new Error(error.code==='PGRST202'?'Passenger journey setup is not installed on the database yet.':error.message);
  if(!data||!Array.isArray(data.passengers))throw new Error(data?.error||'Could not load passenger details. Please retry.');
  return data;
}
export async function journeyAction(trip:string,action:string,booking?:string,payload:Record<string,unknown>={}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Sign in again.');
  const response=await fetch('/api/journey',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({trip,action,booking,payload})});
  let data;
  try{data=await response.json();}catch{throw new Error('Journey service is unavailable. Check your connection and retry.');}
  if(!response.ok)throw new Error(data.error||'Could not update your journey.');
  return data;
}
