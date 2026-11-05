import { useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CalendarCheck, CheckCircle2, Clock, Navigation, Search, X } from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/useStore";
import { getBookings, updateBooking } from "@/lib/api";
import type { Booking, Ride } from "@/types";
import { Badge, Button, Container, PageShell, Panel, buttonVariants, type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, { tone: BadgeTone; label: string }> = {
  confirmed: { tone: "success", label: "Confirmed" },
  pending: { tone: "warning", label: "Pending" },
  completed: { tone: "info", label: "Completed" },
  cancelled: { tone: "danger", label: "Cancelled" },
};

export default function Bookings() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setBookings(await getBookings(user.id));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleCancel = async (id: string) => {
    const selected = bookings.find(b => b.id === id);
    if (selected?.payment_status === 'paid' && !['simulated','razorpay_test'].includes(selected.payment_provider || '')) { alert('This payment provider requires manual refund support.'); return; }
    setCancellingId(id);
    try {
      if (selected?.payment_provider === 'razorpay_test') {
        const {data:{session}}=await supabase.auth.getSession();
        if(!session)throw new Error('Sign in again.');
        const response=await fetch('/api/payments/razorpay/cancel',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({bookingId:id})});
        const result=await response.json();if(!response.ok)throw new Error(result.error);
        if(result.status!=='refunded')throw new Error('Refund is pending. Retry cancellation later to reconcile it.');
      } else if (selected?.payment_provider === 'simulated') {
        const {data:{session}}=await supabase.auth.getSession();
        if(!session)throw new Error('Sign in again.');
        const response=await fetch('/api/payments/simulated/cancel',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({bookingId:id})});
        const result=await response.json();if(!response.ok)throw new Error(result.error);
      } else await updateBooking(id, { status: "cancelled" });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    if (tab === "upcoming") return b.status === "pending" || b.status === "confirmed";
    if (tab === "completed") return b.status === "completed";
    return b.status === "cancelled";
  });

  const counts = {
    upcoming: bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const tabs = [
    { key: "upcoming" as const, label: "Upcoming", count: counts.upcoming },
    { key: "completed" as const, label: "Completed", count: counts.completed },
    { key: "cancelled" as const, label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <PageShell>
      <Container size="5xl" className="max-w-3xl">
        <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
          <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
            <CalendarCheck className="size-5" />
          </span>
          My bookings
        </h1>
        <p className="mt-1 text-muted-foreground">Track and manage your ride bookings.</p>

        {/* tabs */}
        <div className="mt-6 flex gap-1 rounded-2xl border border-border bg-card p-1 backdrop-blur-md">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  tab === t.key ? "bg-white/20 text-current" : "bg-muted text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-muted" />
                ))}
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <Panel className="flex flex-col items-center py-14 text-center">
                  <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
                    <CalendarCheck className="size-7" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-foreground">No {tab} bookings</h3>
                  <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                    {tab === "upcoming" ? "Start by finding a ride to book!" : `Your ${tab} bookings will appear here.`}
                  </p>
                  {tab === "upcoming" && (
                    <Link to="/rides/search" className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6")}>
                      <Search className="size-4" /> Find a ride <ArrowRight className="size-4" />
                    </Link>
                  )}
                </Panel>
              </motion.div>
            ) : (
              <motion.div key="list" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filtered.map((b, i) => {
                  const sc = STATUS_TONE[b.status] || STATUS_TONE.pending;
                  const ride = (b as unknown as { ride?: Ride }).ride;
                  return (
                    <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Panel hover>
                        <div className="mb-3 flex items-center justify-between">
                          <Badge tone={sc.tone}>{sc.label}</Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" /> {format(new Date(b.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center gap-1 pt-1">
                              <span className="size-2 rounded-full bg-success" />
                              <span className="h-4 w-0.5 bg-border" />
                              <span className="size-2 rounded-full bg-danger" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-foreground">{ride?.from_location?.address || "Pickup location"}</p>
                              <p className="mt-2 truncate text-sm text-foreground">{ride?.to_location?.address || "Drop location"}</p>
                            </div>
                          </div>
                          <div className="ml-auto shrink-0 text-right">
                            <p className="font-mono text-xl font-bold text-foreground">₹{b.total_price}</p>
                            <p className="text-xs font-semibold text-accent-strong">{b.payment_provider === 'simulated' ? 'Simulated · no money charged' : b.payment_provider === 'razorpay_test' ? 'Razorpay test payment' : 'Stripe test payment'}</p>
                            <p className="text-xs text-muted-foreground">
                              {b.seats_booked} seat{b.seats_booked !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <div className="mt-4 flex gap-2.5 border-t border-border pt-4">
                            {b.status === "confirmed" && (
                              <Link to={`/tracking/${b.ride_id}`} className={cn(buttonVariants({ variant: "primary", size: "sm" }), "flex-1")}>
                                <Navigation className="size-3.5" /> Track live
                              </Link>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancel(b.id)}
                              loading={cancellingId === b.id}
                              className="border-danger/40 text-danger"
                              icon={cancellingId !== b.id ? <X className="size-3.5" /> : undefined}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {b.status === "completed" && (
                          <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-success">
                            <CheckCircle2 className="size-3.5" /> Trip completed
                          </p>
                        )}
                      </Panel>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </PageShell>
  );
}

