import {supabase} from './supabase';
// Persist stable references; resolve private objects only for the current authorized session.
export async function resolveStoredFiles<T>(value:T):Promise<T> {
  if(Array.isArray(value)) return await Promise.all(value.map(resolveStoredFiles)) as T;
  if(value && typeof value==='object') {
    return Object.fromEntries(await Promise.all(Object.entries(value).map(async([key,item])=>[key,await resolveStoredFiles(item)]))) as T;
  }
  const prefix=process.env.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/';
  if(typeof value!=='string'||!value.startsWith(prefix)) return value;
  const reference=value.slice(prefix.length).replace(/^(public|sign)\//,'').split('?')[0];
  const slash=reference.indexOf('/');
  const bucket=reference.slice(0,slash),path=decodeURIComponent(reference.slice(slash+1));
  if(!['profile-photos','driver-documents','attachments'].includes(bucket))return value;
  const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,3600);
  return (error ? null : data.signedUrl) as T;
}
