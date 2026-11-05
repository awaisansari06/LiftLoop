'use client';
import {useCallback,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
export default function PaymentResult(){
 const params=useSearchParams();const sessionId=params.get('session_id');
 const [status,setStatus]=useState('Checking your test payment…');const [busy,setBusy]=useState(false);const [confirmed,setConfirmed]=useState(false);
 const verify=useCallback(async()=>{setBusy(true);try{
 if(!sessionId)throw new Error('No checkout session was provided.');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Sign in with the account you used for checkout, then retry confirmation.');
 const response=await fetch('/api/payments/confirm',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({sessionId})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Confirmation unavailable.');
 setConfirmed(result.status==='confirmed');setStatus(result.status==='confirmed'?'Test payment verified. Your ride is booked.':result.status==='refunded'?'This ride became unavailable. Your test payment has been refunded.':'Payment is not complete yet. Retry confirmation after completing checkout.');
 }catch(error){setStatus(error instanceof Error?error.message:'Could not verify payment. Retry confirmation; do not pay again.');}finally{setBusy(false)}},[sessionId]);
 useEffect(()=>{void verify()},[verify]);
 return <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-5 px-6"><span className="text-sm font-semibold text-accent-strong">STRIPE TEST CHECKOUT</span><h1 className="font-display text-3xl font-bold">{confirmed?'You’re booked':'Payment confirmation'}</h1><p role="status">{status}</p>{!confirmed&&<button disabled={busy} onClick={verify} className="rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-50">{busy?'Checking…':'Retry confirmation'}</button>}<Link href="/bookings" className="font-semibold underline">My bookings</Link><Link href="/rides/search" className="underline">Find another ride</Link></main>;
}
