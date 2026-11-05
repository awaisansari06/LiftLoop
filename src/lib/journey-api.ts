import {supabase} from './supabase';
import type {JourneySnapshot} from './journey';
export async function getJourney(trip:string):Promise<JourneySnapshot> {
  const {data,error}=await supabase.rpc('journey_snapshot',{trip});
  if(error)throw new Error(error.code==='PGRST202'?'Passenger journey setup is not installed on the database yet.':error.message);
  return data;
}
export async function journeyAction(trip:string,action:string,booking?:string,payload:Record<string,unknown>={}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Sign in again.');
  const response=await fetch('/api/journey',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({trip,action,booking,payload})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Could not update your journey.');
  return data;
}
