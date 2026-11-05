'use client';
import { useEffect } from 'react';
import { useLocation } from '@/lib/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/hooks/useStore';
import { useRealtimeNotifications } from '@/hooks/useRealtime';
import { ToastContainer } from '@/components/common';
import {Toaster} from 'react-hot-toast';
import Header from '@/components/common/Header';
import { CommandPalette, MobileBottomNav, CommandHint } from '@/components/common/GlobalUI';
import LiveAnnouncements from '@/components/common/LiveAnnouncements';
import { ScrollProgress } from '@/components/common/Interactive3D';

import AppBackground from '@/components/ui/app-background';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { KineticTextLoader } from '@/components/ui/kinetic-loader';


import { cleanupPastRides } from '@/lib/api';
import {RideLocationSharing} from './RideLocationSharing';
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}


export default function AppShell({children}: {children: React.ReactNode}) {
  const { user, initialize } = useAuthStore();
  const location = useLocation();

  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => { cleanupPastRides().catch(() => {}); }, []);

  useRealtimeNotifications(user?.id);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', fontFamily: 'var(--font-sans)' }}>
      {/* app-wide animated grid backdrop — behind every route */}
      <AppBackground />
      <ScrollProgress />
      
      {user && <LiveAnnouncements />}
      {user && <Header />}
      <CommandPalette />
      <CommandHint />
      
      <MobileBottomNav />
      <ToastContainer />
      <Toaster />
      <RideLocationSharing><ErrorBoundary resetKey={location.pathname}>
      <AnimatePresence mode="wait">
        <AnimatedPage key={location.pathname}>{children}</AnimatedPage>
      </AnimatePresence>
      </ErrorBoundary></RideLocationSharing>
    </div>
  );
}
