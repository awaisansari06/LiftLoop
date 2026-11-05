import {resolveStoredFiles} from '../lib/storage';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Notification } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  selectedRole: 'student' | 'driver' | 'admin' | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedRole: (role: 'student' | 'driver' | 'admin') => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  selectedRole: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setSelectedRole: (role) => set({ selectedRole: role }),

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ user: await resolveStoredFiles(profile), loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch {
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    // A shared browser must stop receiving this account's pickup alerts at logout.
    if(typeof navigator!=='undefined'&&'serviceWorker' in navigator) {
      try {
        const registration=await navigator.serviceWorker.getRegistration('/');
        const subscription=await registration?.pushManager.getSubscription();
        if(subscription) {
          const {data:{session}}=await supabase.auth.getSession();
          if(session)await fetch('/api/push',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({endpoint:subscription.endpoint}),signal:AbortSignal.timeout(5000)}).catch(()=>{});
          await subscription.unsubscribe();
        }
      }catch{/* Sign-out must still work when push is unavailable. */}
    }
    await supabase.auth.signOut();
    set({ user: null, selectedRole: null });
  },
}));

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => state.notifications.some(n=>n.id===notification.id)?state:{
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read?0:1),
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - (state.notifications.some(n=>n.id===id&&!n.read)?1:0)),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
