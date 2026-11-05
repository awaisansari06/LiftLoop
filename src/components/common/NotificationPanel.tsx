'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useAuthStore,useNotificationStore} from '@/hooks/useStore';
import {supabase} from '@/lib/supabase';
import {markNotificationRead,markAllNotificationsRead} from '@/lib/api';
import {useNavigate} from '@/lib/navigation';
import {Button} from '@/components/ui/primitives';

export default function NotificationPanel({onClose}:{onClose:()=>void}) {
  const {user}=useAuthStore();
  const {notifications,markRead,markAllRead}=useNotificationStore();
  const navigate=useNavigate();
  const [message,setMessage]=useState('');
  const [configured,setConfigured]=useState(false);
  const [enabled,setEnabled]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[onClose]);
  useEffect(()=>{let cancelled=false;void fetch('/api/push').then(r=>r.json()).then(data=>{if(!cancelled)setConfigured(data.configured);}).catch(()=>{});
    if('serviceWorker' in navigator)void navigator.serviceWorker.getRegistration('/').then(async registration=>{const sub=await registration?.pushManager.getSubscription();if(!cancelled)setEnabled(!!sub);});
    return()=>{cancelled=true;};},[]);
  const toggle=async()=>{
    setBusy(true);setMessage('');
    try {
      if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('This browser does not support push alerts. On iPhone, add LiftLoop to your Home Screen first.');
      const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in again.');
      const headers={'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`};
      const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
      await navigator.serviceWorker.ready;
      const existing=await registration.pushManager.getSubscription();
      if(enabled&&existing) {
        const result=await fetch('/api/push',{method:'DELETE',headers,body:JSON.stringify({endpoint:existing.endpoint})});
        if(!result.ok)throw new Error((await result.json()).error);
        await existing.unsubscribe();setEnabled(false);setMessage('Push alerts disabled on this browser.');return;
      }
      if(await Notification.requestPermission()!=='granted')throw new Error('Notifications are blocked. Allow them in your browser settings to receive pickup alerts.');
      const config=await fetch('/api/push').then(r=>r.json());if(!config.publicKey)throw new Error('Push notifications need server setup.');
      const base64=config.publicKey.replace(/-/g,'+').replace(/_/g,'/');
      const key=Uint8Array.from(atob(base64+'='.repeat((4-base64.length%4)%4)),c=>c.charCodeAt(0));
      const subscription=existing||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      const response=await fetch('/api/push',{method:'POST',headers,body:JSON.stringify(subscription)});
      if(!response.ok){if(!existing)await subscription.unsubscribe();throw new Error((await response.json()).error);}
      setEnabled(true);setMessage('Pickup alerts enabled, including when LiftLoop is closed.');
    }catch(error){setMessage(error instanceof Error?error.message:'Could not update alerts.');}finally{setBusy(false);}
  };
  return createPortal(<div className="fixed inset-0 z-[2000] bg-black/25" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="Notifications" className="absolute right-3 top-20 max-h-[75dvh] w-[min(24rem,calc(100vw-1.5rem))] overflow-auto rounded-2xl border border-border bg-card p-4 shadow-xl" onClick={e=>e.stopPropagation()}>
    <div className="mb-3 flex justify-between"><h2 className="font-bold">Notifications</h2><button onClick={onClose} aria-label="Close notifications">Close</button></div>
    <p className="mb-2 text-xs text-muted-foreground">Receive driver arrival and pickup updates on this device.</p>
    <Button size="sm" variant="secondary" loading={busy} onClick={toggle} disabled={!configured&&!enabled}>{enabled?'Disable push alerts':configured?'Enable push alerts':'Push alerts need server setup'}</Button>
    {message&&<p role="status" className="mt-2 text-sm">{message}</p>}
    <button className="my-3 block text-xs underline" onClick={async()=>{try{if(user){await markAllNotificationsRead(user.id);markAllRead();}}catch{setMessage('Could not mark alerts read.');}}}>Mark all read</button>
    {!notifications.length&&<p className="py-4 text-sm text-muted-foreground">Your ride updates will appear here.</p>}
    {notifications.map(n=><button key={n.id} className={`mb-2 block w-full rounded-xl border border-border p-3 text-left ${n.read?'opacity-65':'bg-muted'}`} onClick={async()=>{try{await markNotificationRead(n.id);markRead(n.id);if(n.type?.startsWith('journey:')){navigate(`/tracking/${n.type.slice(8)}`);onClose();}}catch{setMessage('Could not open this alert.');}}}><strong className="text-sm">{n.title}</strong><p className="text-xs">{n.message}</p><time className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</time></button>)}
  </section></div>,document.body);
}
