import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotificationStore } from './useStore';
import type { Notification, Message } from '../types';
import toast from 'react-hot-toast';
import { realtimeTopic } from '../lib/realtime-topic';

export function useRealtimeNotifications(userId: string | undefined) {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    useNotificationStore.getState().setNotifications([]);
    if (!userId) return;
    let cancelled=false;
    const refresh=()=>{void supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(50).then(({data,error}) => {if(!cancelled&&!error&&data)useNotificationStore.getState().setNotifications(data);});};
    refresh();
    const timer=setInterval(refresh,15000);
    const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
    document.addEventListener('visibilitychange',onVisible);

    const channel = supabase
      .channel(realtimeTopic(`user:${userId}:notifications`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addNotification(payload.new as Notification);
          const notification=payload.new as Notification;
          if(notification.type?.startsWith('journey:'))toast(notification.title,{id:notification.id,duration:6000});
        }
      )
      .subscribe();

    return () => {
      cancelled=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);
}

export function useRealtimeLocation(rideId: string) {
  const [location, setLocation] = useState<{rideId:string;lat:number;lng:number;speed:number;updatedAt:string}|null>(null);
  useEffect(() => {
    let cancelled=false;
    setLocation(null);
    if(!rideId)return;
    const receive=(row:any)=>{
      if(cancelled)return;
      if(!row){setLocation(null);return;}
      if(!row.location || !Number.isFinite(row.location.lat) || !Number.isFinite(row.location.lng))return;
      const next={rideId,lat:row.location.lat,lng:row.location.lng,speed:row.speed||0,updatedAt:row.updated_at};
      setLocation(previous=>previous && Date.parse(previous.updatedAt)>Date.parse(next.updatedAt)?previous:next);
    };
    let requests=0,applied=0;
    const refresh=async()=>{const request=++requests;const {data,error}=await supabase.from('live_locations').select('*').eq('ride_id',rideId).maybeSingle();if(!error&&request>=applied){applied=request;receive(data);}};
    const channel=supabase.channel(realtimeTopic(`ride:${rideId}:location`)).on('postgres_changes',{event:'*',schema:'public',table:'live_locations',filter:`ride_id=eq.${rideId}`},payload=>{applied=++requests;receive(payload.eventType==='DELETE'?null:payload.new);}).subscribe();
    void refresh();
    const timer=window.setInterval(()=>{void refresh();},5000);
    return ()=>{cancelled=true;window.clearInterval(timer);void supabase.removeChannel(channel);};
  },[rideId]);
  return location?.rideId===rideId?location:null;
}

export function useRealtimeMessages(rideId: string) {
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  useEffect(() => {
    setLastMessage(null);
    if (!rideId) return;

    const channel = supabase
      .channel(realtimeTopic(`ride:${rideId}:messages`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          setLastMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  return lastMessage;
}
