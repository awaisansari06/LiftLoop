import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Car,
  Clock,
  History,
  Leaf,
  MapPin,
  Navigation,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { useAuthStore } from "@/hooks/useStore";
import {
  getRides,
  getBookings,
  getUserStats,
  getSavedRoutes,
  deleteSavedRoute,
  type SavedRoute,
  type UserStats,
} from "@/lib/api";
import { updateProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Ride, Booking } from "@/types";
import SOSModal from "@/components/common/SOSModal";
import LiveMap from "@/components/landing/LiveMap";
import { Field } from "@/components/ui/smooth-input";
import {
  Badge,
  Button,
  Container,
  Eyebrow,
  Panel,
  PageShell,
  type BadgeTone,
} from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";
import DataFolder from "@/components/ui/data-folder";
import { PopButton } from "@/components/ui/pop-button";
import { Sparkbars } from "@/components/ui/dashboard";

const TILE: Record<BadgeTone, string> = {
  neutral: "bg-muted text-foreground",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [n, setN] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    let frame: number;
    const dur = 700;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setN(Math.round(t * value));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  return (
    <>
      {prefix}
      {n}
    </>
  );
}

/** Compact SVG score ring. */
function ScoreRing({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className="size-24 -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--rm-muted)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--rm-accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
      <text
        x="50"
        y="50"
        transform="rotate(90 50 50)"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-mono"
        style={{ fontSize: 22, fontWeight: 700 }}
      >
        {value}
      </text>
    </svg>
  );
}



function RideCard({ ride }: { ride: Ride }) {
  const navigate = useNavigate();
  const from = typeof ride.from_location === "object" ? ride.from_location.address : ride.from_location;
  const to = typeof ride.to_location === "object" ? ride.to_location.address : ride.to_location;
  const driver = (ride as unknown as { driver?: { full_name?: string } }).driver;
  return (
    <Panel
      hover
      as="button"
      className="w-full cursor-pointer text-left"
      onClick={() => navigate(`/rides/${ride.id}`)}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-strong font-display font-bold text-white">
          {driver?.full_name?.[0]?.toUpperCase() || "D"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{driver?.full_name || "Driver"}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(ride.departure_time), "MMM d · h:mm a")}
          </p>
        </div>
        <Badge tone="success">{ride.seats_available} seats</Badge>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1.5">
          <span className="size-2.5 rounded-full bg-success" />
          <span className="h-6 w-0.5 bg-border" />
          <span className="size-2.5 rounded-full bg-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{from || "Pickup"}</p>
          <p className="mt-3 truncate text-sm font-medium text-foreground">{to || "Drop"}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-2xl font-bold text-foreground">₹{ride.price_per_seat}</span>
        <span className="text-sm text-muted-foreground">per seat</span>
      </div>
    </Panel>
  );
}

export default function UserDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergency_contact_phone || "");
  const [savingContact, setSavingContact] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [saved, setSaved] = useState<SavedRoute[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    getUserStats(user.id).then(setStats).catch(() => {});
    getSavedRoutes(user.id).then(setSaved).catch(() => {});
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [r, b] = await Promise.all([
        getRides({ status: "active" }),
        getBookings(user.id),
      ]);
      const now = new Date();
      setRides(r.filter((ride: Ride) => new Date(ride.departure_time) > now).slice(0, 6));
      setAllBookings(b);
      setBookings(
        b
          .filter((booking: Booking) => {
            const ride = (booking as unknown as { ride?: Ride }).ride;
            return ['pending','confirmed'].includes(booking.status)&&booking.journey?.status!=='no_show'&&(!ride||ride.status==='in_progress'||new Date(ride.departure_time)>now);
          })
          .slice(0, 3),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime: auto-refresh when bookings or notifications change
  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel('user-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `rider_id=eq.${user.id}` }, () => loadData())
      .subscribe();
    const ch2 = supabase.channel('user-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user, loadData]);

  const hour = time.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const rideCount = stats?.total_bookings || bookings.length;
  const spent = stats?.total_spent || 0;
  const safetyScore = user?.profile_complete || 0;
  const TRENDING = Object.values(rides.reduce<Record<string, {from: string; to: string; count: number}>>((acc, ride) => {
    const from = ride.from_location.address || "Pickup"; const to = ride.to_location.address || "Destination"; const key = JSON.stringify([from, to]);
    acc[key] ??= {from, to, count: 0}; acc[key].count++; return acc;
  }, {})).sort((a,b) => b.count-a.count).slice(0,4);

  const statCards: {
    label: string;
    value?: number;
    custom?: string;
    prefix?: string;
    suffix?: string;
    tone: BadgeTone;
    icon: ReactNode;
  }[] = [
    { label: "Rides taken", value: rideCount, tone: "info", icon: <Car className="size-5" /> },
    { label: "Money saved", value: rideCount * 45, prefix: "₹", tone: "success", icon: <TrendingUp className="size-5" /> },
    { label: "CO₂ saved", value: rideCount * 2, suffix: "kg", tone: "success", icon: <Leaf className="size-5" /> },
    { label: "Rating", custom: (user as unknown as { rating?: number })?.rating?.toFixed(1) || "—", tone: "warning", icon: <Star className="size-5" /> },
  ];

  const rideAddr = (r?: Ride, which: "from" | "to" = "to") => {
    if (!r) return undefined;
    const loc = which === "to" ? r.to_location : r.from_location;
    return typeof loc === "object" ? loc?.address : (loc as unknown as string);
  };

  const historyBookings = allBookings.filter((b) => {
    const ride = (b as unknown as { ride?: Ride }).ride;
    return b.status === "completed" || b.status==='cancelled' || b.journey?.status==='no_show';
  });

  // Data collections shown as folders (real records only — never stock images).
  const collections = [
    {
      key: "bookings",
      title: "My Bookings",
      tone: "clay" as const,
      icon: <Calendar />,
      count: bookings.length,
      countLabel: "upcoming",
      to: "/bookings",
      items: bookings.slice(0, 3).map((b) => {
        const ride = (b as unknown as { ride?: Ride }).ride;
        return { title: rideAddr(ride, "to") ? `→ ${rideAddr(ride, "to")}` : "Booked ride", sub: `${b.status} · ₹${b.total_price ?? 0}` };
      }),
      emptyLabel: "No upcoming bookings",
    },
    {
      key: "history",
      title: "Ride History",
      tone: "navy" as const,
      icon: <History />,
      count: historyBookings.length,
      countLabel: "completed",
      to: "/bookings",
      items: historyBookings.slice(0, 3).map((b) => {
        const ride = (b as unknown as { ride?: Ride }).ride;
        return { title: rideAddr(ride, "to") ? `→ ${rideAddr(ride, "to")}` : "Past ride", sub: `₹${b.total_price ?? 0}` };
      }),
      emptyLabel: "No completed rides yet",
    },
    {
      key: "saved",
      title: "Saved Routes",
      tone: "gold" as const,
      icon: <Bookmark />,
      count: saved.length,
      countLabel: "saved",
      to: "/rides/search",
      items: saved.slice(0, 3).map((r) => ({
        title: r.label || r.from_location.address || "Route",
        sub: r.to_location.address ? `→ ${r.to_location.address}` : undefined,
      })),
      emptyLabel: "Bookmark a route to save it",
    },
  ];

  const savingsSeries = Array.from({ length: 7 }, (_, i) => {
    const day = format(new Date(time.getFullYear(), time.getMonth(), time.getDate() - 6 + i), "yyyy-MM-dd");
    return allBookings.filter(b => b.payment_status === "paid" && format(new Date(b.created_at), "yyyy-MM-dd") === day).reduce((sum,b) => sum + Number(b.total_price || 0), 0);
  });
  const savingsLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(time);
    d.setDate(d.getDate() - (6 - i));
    return format(d, "EEE");
  });

  const handleSaveEmergency = async () => {
    if (!emergencyPhone || !user) return;
    setSavingContact(true);
    try {
      await updateProfile(user.id, { emergency_contact_phone: emergencyPhone });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingContact(false);
    }
  };

  const activity = [
    ...bookings.slice(0, 4).map((b) => ({
      icon: <Car className="size-4" />,
      label: `Booked ride · ${b.seats_booked} seat${b.seats_booked !== 1 ? "s" : ""}`,
      sub: `₹${b.total_price} · ${b.status}`,
      at: new Date(b.created_at || Date.now()),
      tone: (b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "accent") as BadgeTone,
    })),
    ...rides.slice(0, 3).map((r) => ({
      icon: <Navigation className="size-4" />,
      label: `New ride: ${(r as unknown as { driver?: { full_name?: string } }).driver?.full_name?.split(" ")[0] || "driver"}`,
      sub: `${r.seats_available} seats · ₹${r.price_per_seat}`,
      at: new Date(r.departure_time),
      tone: "info" as BadgeTone,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  if (!user) return null;

  return (
    <PageShell>
      <Container size="full">
        {/* greeting hero */}
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-light p-7 text-white sm:p-9">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent/15 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  <span className="size-1.5 rounded-full bg-accent" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                    User portal · LiftLoop
                  </span>
                </div>
                <p className="mt-4 text-sm text-white/60">{greeting},</p>
                <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {user?.full_name?.split(" ")[0] || "there"}
                  <span className="text-accent">.</span>
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/60">
                  <Clock className="size-4" /> {format(time, "h:mm a")} · your campus commute, simplified
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSOSOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-danger px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <TriangleAlert className="size-4" /> SOS
              </button>
            </div>
          </div>
        </Reveal>

        {/* stats */}
        <RevealGroup className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((s) => (
            <RevealItem key={s.label}>
              <Panel className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="mt-1.5 font-mono text-2xl font-bold text-foreground sm:text-3xl">
                    {s.custom ?? <CountUp value={s.value as number} prefix={s.prefix} />}
                    {s.suffix && <span className="ml-0.5 text-sm text-muted-foreground">{s.suffix}</span>}
                  </p>
                </div>
                <span className={cn("grid size-11 place-items-center rounded-2xl", TILE[s.tone])} aria-hidden>
                  {s.icon}
                </span>
              </Panel>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* primary actions */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PopButton
            variant="primary"
            size="lg"
            className="w-full justify-center"
            onClick={() => navigate("/rides/search")}
          >
            <Search className="size-5" /> Find a ride
          </PopButton>
          <PopButton
            variant="accent"
            size="lg"
            className="w-full justify-center"
            onClick={() => navigate("/rides/create")}
          >
            <Plus className="size-5" /> Offer a ride
          </PopButton>
        </div>

        {/* data collections (folders open their pages; hover reveals real records) */}
        <RevealGroup className="mt-6 mb-2 grid gap-5 grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <RevealItem key={c.key} className="w-full">
              <DataFolder
                title={c.title}
                tone={c.tone}
                icon={c.icon}
                count={c.count}
                countLabel={c.countLabel}
                items={c.items}
                emptyLabel={c.emptyLabel}
                onClick={() => navigate(c.to)}
              />
            </RevealItem>
          ))}
        </RevealGroup>

        {/* snapshot + saved routes */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <Panel className="flex items-center gap-5">
              <ScoreRing value={safetyScore} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile completeness</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rideCount === 0
                    ? "Book your first ride — your score grows with every safe trip."
                    : "Keep sharing — your score climbs with every completed ride."}
                </p>
              </div>
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel className="h-full">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display font-bold text-foreground">
                  <Bookmark className="size-4 text-accent" /> Saved routes
                </h3>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Tap to search</span>
              </div>
              {saved.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No saved routes yet — bookmark one from the search page.
                </p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {saved.map((r) => (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        navigate(
                          `/rides/search?from=${encodeURIComponent(r.from_location.address || "")}&to=${encodeURIComponent(r.to_location.address || "")}`,
                        )
                      }
                      className="min-w-[220px] cursor-pointer rounded-2xl border border-border bg-muted/50 p-4 transition-transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {r.label || "Route"}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-foreground">{r.from_location.address}</p>
                          <p className="truncate text-sm text-muted-foreground">→ {r.to_location.address}</p>
                        </div>
                        <button
                          type="button"
                          aria-label="Delete saved route"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedRoute(r.id);
                            setSaved((s) => s.filter((x) => x.id !== r.id));
                          }}
                          className="text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </Reveal>
        </div>

        {/* insights */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Reveal>
            <Panel>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">Your savings · last 7 days</h3>
                <span className="text-xs text-muted-foreground">paid bookings</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">Actual paid booking totals</p>
              <Sparkbars values={savingsSeries} labels={savingsLabels} format={(n) => `₹${Math.round(n)}`} />
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel>
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-foreground">
                <Zap className="size-4 text-accent" /> Currently offered routes
              </h3>
              <ul className="flex flex-col gap-2">
                {TRENDING.map((t) => (
                  <li key={t.from}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/rides/search?from=${encodeURIComponent(t.from)}&to=${encodeURIComponent(t.to)}`)
                      }
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MapPin className="size-4 text-muted-foreground" />
                        {t.from} → {t.to}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{t.count}×</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </Reveal>
        </div>

        {/* map + activity */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Reveal>
            <Panel inset="none" className="overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <h3 className="flex items-center gap-2 font-display font-bold text-foreground">
                  <MapPin className="size-4 text-accent" /> Live campus map
                </h3>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Your area</span>
              </div>
              <LiveMap className="h-72 w-full border-t border-border" />
            </Panel>
          </Reveal>
          <Reveal delay={0.05}>
            <Panel>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display font-bold text-foreground">
                  <Clock className="size-4 text-accent" /> Recent activity
                </h3>
                <Badge tone="success">Live</Badge>
              </div>
              {activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Your activity appears here once you book or search a ride.
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {activity.map((it, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                      <span className={cn("grid size-8 place-items-center rounded-lg", TILE[it.tone])}>{it.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{it.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{it.sub}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(it.at, { addSuffix: true }).replace("about ", "")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </Reveal>
        </div>

        {/* available rides */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">Available rides</h2>
          <Link to="/rides/search" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-muted" />
              ))}
            </div>
          ) : rides.length === 0 ? (
            <Panel className="flex flex-col items-center py-14 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
                <Car className="size-7" />
              </span>
              <p className="mt-5 font-display text-lg font-bold text-foreground">No upcoming rides yet</p>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Check back soon, or search for rides departing today from campus.
              </p>
              <Button className="mt-6" onClick={() => navigate("/rides/search")} icon={<Search className="size-4" />}>
                Search rides
              </Button>
            </Panel>
          ) : (
            <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rides.map((ride) => (
                <RevealItem key={ride.id}>
                  <RideCard ride={ride} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>

        {/* emergency contact */}
        <Reveal>
          <Panel className="mt-8 border-danger/30 bg-danger-soft/40">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-danger text-white">
                <TriangleAlert className="size-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-foreground">Emergency contact</h3>
                <p className="text-sm text-muted-foreground">
                  Your live location is shared with this number during SOS.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Field
                  type="tel"
                  aria-label="Emergency contact phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveEmergency} loading={savingContact} className="sm:mt-0">
                Save
              </Button>
            </div>
          </Panel>
        </Reveal>

      </Container>

      <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
    </PageShell>
  );
}

