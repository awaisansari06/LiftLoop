import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotificationStore } from './useStore';
import type { Notification, Message } from '../types';

export function useRealtimeNotifications(userId: string | undefined) {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    useNotificationStore.getState().setNotifications([]);
    if (!userId) return;
    void supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).then(({data,error}) => {if(!error && data)useNotificationStore.getState().setNotifications(data);});

    const channel = supabase
      .channel(`user:${userId}:notifications`)
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, addNotification]);
}

export function useRealtimeLocation(rideId: string) {
  const [location, setLocation] = useState<{lat:number;lng:number;speed:number;updatedAt:string}|null>(null);
  useEffect(() => {
    let cancelled=false;
    setLocation(null);
    if(!rideId)return;
    const receive=(row:any)=>{
      if(cancelled || !row?.location || !Number.isFinite(row.location.lat) || !Number.isFinite(row.location.lng))return;
      const next={lat:row.location.lat,lng:row.location.lng,speed:row.speed||0,updatedAt:row.updated_at};
      setLocation(previous=>previous && Date.parse(previous.updatedAt)>Date.parse(next.updatedAt)?previous:next);
    };
    const refresh=async()=>{const {data,error}=await supabase.from('live_locations').select('*').eq('ride_id',rideId).maybeSingle();if(!error)receive(data);};
    const channel=supabase.channel(`ride:${rideId}:location`).on('postgres_changes',{event:'*',schema:'public',table:'live_locations',filter:`ride_id=eq.${rideId}`},payload=>receive(payload.new)).subscribe();
    void refresh();
    const timer=window.setInterval(()=>{void refresh();},5000);
    return ()=>{cancelled=true;window.clearInterval(timer);void supabase.removeChannel(channel);};
  },[rideId]);
  return location;
}

export function useRealtimeMessages(rideId: string) {
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`ride:${rideId}:messages`)
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
