import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getAnnouncements, type Announcement } from '../../lib/api';
import { AnnouncementBar } from './Interactive3D';
import { supabase } from '../../lib/supabase';

const STORAGE_KEY = 'rm.dismissed_announcements.v1';

function loadDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveDismissed(ids: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch { /* noop */ }
}

/**
 * LiveAnnouncements — pulls the newest active announcement the user hasn't
 * dismissed and renders it as a sticky top bar. Subscribes to realtime so
 * new announcements appear instantly.
 */
export default function LiveAnnouncements() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  const load = async () => setRows(await getAnnouncements());

  useEffect(() => {
    load();
    const ch = supabase.channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const active = rows.find(r => !dismissed.has(r.id));
  const dismiss = (id: string) => {
    const next = new Set(dismissed); next.add(id);
    setDismissed(next); saveDismissed(next);
  };

  return (
    <AnimatePresence>
      {active && (
        <AnnouncementBar
          key={active.id}
          title={active.title}
          body={active.body}
          severity={active.severity}
          onDismiss={() => dismiss(active.id)}
        />
      )}
    </AnimatePresence>
  );
}
