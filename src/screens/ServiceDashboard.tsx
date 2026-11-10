import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "@/lib/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Bell,
  Car,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Star,
  TriangleAlert,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { format } from "date-fns";

import { useAuthStore } from "@/hooks/useStore";
import {
  getRides,
  getVerification,
  deleteRide,
  getDriverBookingRequests,
  updateBooking,
  updateRide,
  getUserStats,
  type UserStats,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { calculateRoute, getUserLocation } from "@/lib/maps";
import type { Ride, DriverVerification, Booking } from "@/types";
import SOSModal from "@/components/common/SOSModal";
import { MapView, type MapMarker } from "@/components/maps";
import { SmoothInput } from "@/components/ui/smooth-input";
import {
  Badge,
  Button,
  Container,
  PageShell,
  Panel,
  buttonVariants,
  type BadgeTone,
} from "@/components/ui/primitives";
import { Sparkbars, toneTile } from "@/components/ui/dashboard";
import { Reveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";
import DataFolder from "@/components/ui/data-folder";
import { PopButton } from "@/components/ui/pop-button";
import { realtimeTopic } from "@/lib/realtime-topic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

type ChatMessage = { id?: string; message: string; sender_type: "user" | "admin"; attachment_url?: string | null };

export default function ServiceDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [rides, setRides] = useState<Ride[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [verification, setVerification] = useState<DriverVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const [bookingRequests, setBookingRequests] = useState<Booking[]>([]);
  const [deletingRide, setDeletingRide] = useState<string | null>(null);
  const [processingBooking, setProcessingBooking] = useState<string | null>(null);
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState<[number, number][]>([]);
  const [activeMarkers, setActiveMarkers] = useState<MapMarker[]>([]);
  const [dashboardError,setDashboardError]=useState('');
  const [chatError,setChatError]=useState('');
  const dashboardRequest=useRef(0);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    const request=++dashboardRequest.current;
    try {
      const [ridesData, verif, bookings, userStats] = await Promise.all([
        getRides({ driver_id: user.id, from_date: "1970-01-01T00:00:00Z" }),
        getVerification(user.id),
        getDriverBookingRequests(user.id),
        getUserStats(user.id),
      ]);
      if(request!==dashboardRequest.current)return;
      const myRides = ridesData.filter((r) => r.driver_id === user.id&&(r.status==='active'||r.status==='in_progress'));
      setRides(myRides);
      setStats(userStats);
      setVerification(verif);
      setBookingRequests(bookings);
      setDashboardError('');
      if(!myRides.length){setActiveRoute([]);setActiveMarkers([]);}

      if (myRides.length > 0) {
        const firstRide = myRides.find(r=>r.status==='in_progress')||myRides[0];
        if (firstRide.from_location && firstRide.to_location) {
          try {
            const routeInfo = await calculateRoute(firstRide.from_location, firstRide.to_location);
            if(request!==dashboardRequest.current)return;
            if (routeInfo.geometry) setActiveRoute(routeInfo.geometry);
            setActiveMarkers([
              { id: "start", position: [firstRide.from_location.lat, firstRide.from_location.lng], type: "pickup", popup: "Start" },
              { id: "end", position: [firstRide.to_location.lat, firstRide.to_location.lng], type: "drop", popup: "End" },
            ]);
          } catch (e) {
            console.warn("Failed to load map route", e);
          }
        }
      }
    } catch (e) {
      if(request===dashboardRequest.current)setDashboardError('Could not refresh your dashboard. Check your connection and retry.');
    } finally {
      if(request===dashboardRequest.current)setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
    const timer=setInterval(()=>void loadDashboard(),15000);
    return()=>{clearInterval(timer);dashboardRequest.current++;};
  }, [loadDashboard]);

  // Realtime: auto-refresh on booking requests & verification status changes
  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel(realtimeTopic('service-bookings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => loadDashboard())
      .subscribe();
    const ch2 = supabase.channel(realtimeTopic('service-verif'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_verification', filter: `user_id=eq.${user.id}` }, () => loadDashboard())
      .subscribe();
    const ch3=supabase.channel(realtimeTopic('service-rides'))
      .on('postgres_changes',{event:'*',schema:'public',table:'rides',filter:`driver_id=eq.${user.id}`},()=>void loadDashboard()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [user, loadDashboard]);

  useEffect(() => {
    if (!user || !chatOpen) return;
    const loadChat = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setChatMessages(data as ChatMessage[]);
    };
    loadChat();
    const channel = supabase
      .channel(realtimeTopic("support-service"))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${user.id}` },
        (payload) => setChatMessages((prev) => [...prev, payload.new as ChatMessage]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatOpen]);

  const isVerified = verification?.verification_status === "verified";
  const isPending = verification?.verification_status === "pending";

  const handleDeleteRide = async (rideId: string) => {
    if (!window.confirm("Delete this ride? All bookings will be cancelled.")) return;
    setDeletingRide(rideId);
    try {
      await deleteRide(rideId);
      setRides((prev) => prev.filter((r) => r.id !== rideId));
      setBookingRequests((prev) => prev.filter((b) => b.ride_id !== rideId));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not cancel ride. Please retry.");
    } finally {
      setDeletingRide(null);
    }
  };

  const handleBookingAction = async (bookingId: string, action: "confirmed" | "cancelled") => {
    setProcessingBooking(bookingId);
    try {
      await updateBooking(bookingId, { status: action });
      setBookingRequests((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: action } : b)));
    } catch (e) {
      window.alert(e instanceof Error?e.message:'Could not update this booking. Please retry.');
    } finally {
      setProcessingBooking(null);
    }
  };

  const triggerSOS = async () => {
    setSosLoading(true);
    try {
      let location: { lat: number; lng: number } | null = null;
      try {
        const coords = await getUserLocation();
        location = { lat: coords[0], lng: coords[1] };
      } catch (e) {
        console.warn("Geolocation failed in SOS", e);
      }
      const {error} = await supabase.from("sos_alerts").insert({ user_id: user?.id, ride_id: rides[0]?.id || null, location, message:"Emergency SOS triggered", status:"active" });
      if(error) throw error;
      window.alert("Alert recorded for LiftLoop administrators. SMS and emergency-service dispatch are not configured.");
      setSosActive(true);
      setTimeout(() => setSosActive(false), 5000);
    } catch {
      alert("SOS failed. Call 112 directly.");
    }
    setSosLoading(false);
  };

  const sendChatMessage = async () => {
    if (!user || sendingChat) return;
    if (!chatMsg.trim() && !chatFile) return;
    setSendingChat(true);setChatError('');
    try {
      let attachment_url: string | undefined;
      if (chatFile) {
        const ext = chatFile.name.split(".").pop() || "bin";
        const path = `support/${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("attachments")
          .upload(path, chatFile, { contentType: chatFile.type });
        if(upErr)throw upErr;
        attachment_url = supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl;
      }
      const {error}=await supabase.from("support_messages").insert({
        user_id: user.id,
        message: chatMsg.trim() || (chatFile ? `📎 ${chatFile.name}` : ""),
        sender_type: "user",
        attachment_url,
      });
      if(error)throw error;
      setChatMsg("");
      setChatFile(null);
    } catch {
      setChatError('Message could not be sent. Your message is still here; please retry.');
    } finally {
      setSendingChat(false);
    }
  };

  const scrollToId = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const pendingCount = bookingRequests.filter((b) => b.status === "pending").length;
  const rideAddr = (r?: Ride) => (r?.to_location && typeof r.to_location === "object" ? r.to_location.address : undefined);

  // Data collections shown as folders (real records only — never stock images).
  const collections = [
    {
      key: "rides",
      title: "My Rides",
      tone: "navy" as const,
      icon: <Car />,
      count: rides.length,
      countLabel: "active",
      items: rides.slice(0, 3).map((r) => ({
        title: rideAddr(r) ? `→ ${rideAddr(r)}` : "Active ride",
        sub: `₹${r.price_per_seat ?? 0} · ${r.seats_available ?? 0} seats`,
      })),
      emptyLabel: "No active rides",
      onClick: () => scrollToId("active-rides"),
    },
    {
      key: "requests",
      title: "Booking Requests",
      tone: "clay" as const,
      icon: <Bell />,
      count: pendingCount,
      countLabel: "pending",
      items: bookingRequests.slice(0, 3).map((b) => {
        const rider = (b as unknown as { rider?: { full_name?: string } }).rider;
        return { title: rider?.full_name || "Rider", sub: `${b.status} · ₹${b.total_price ?? 0}` };
      }),
      emptyLabel: "No booking requests",
      onClick: () => scrollToId("booking-requests"),
    },
    {
      key: "verification",
      title: "Verification",
      tone: "gold" as const,
      icon: <ShieldCheck />,
      count: verification ? 1 : 0,
      countLabel: "on file",
      items: verification
        ? [{ title: `Status: ${verification.verification_status}`, sub: verification.vehicle_number || verification.license_number || undefined }]
        : [],
      emptyLabel: "Not submitted yet",
      onClick: () => navigate("/verification"),
    },
  ];

  const statCards: { label: string; value: string; tone: BadgeTone; icon: React.ReactNode }[] = [
    { label: "Active rides", value: String(rides.length), tone: "success", icon: <Car className="size-5" /> },
    { label: "Status", value: isVerified ? "Verified" : isPending ? "Pending" : "Unverified", tone: isVerified ? "success" : "warning", icon: <ShieldCheck className="size-5" /> },
    { label: "Earnings", value: "₹0", tone: "info", icon: <Wallet className="size-5" /> },
    { label: "Rating", value: stats?.ratings_count ? stats.avg_rating.toFixed(1) : "—", tone: "warning", icon: <Star className="size-5" /> },
  ];

  const earnings = Array.from({length:7}, (_,i) => {
    const day = format(new Date(Date.now() - (6-i)*86400000), "yyyy-MM-dd");
    return bookingRequests.filter(b => b.status === "completed" && b.payment_status === "paid" && format(new Date(b.created_at), "yyyy-MM-dd") === day).reduce((sum,b) => sum + Number(b.total_price || 0),0);
  });

  if (!user) return null;

  return (
    <PageShell>
      <Container size="full">
        {dashboardError&&<p role="alert" className="mb-3 text-sm text-danger">{dashboardError} <button className="underline" onClick={()=>void loadDashboard()}>Retry</button></p>}
        {/* hero */}
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy to-navy-light p-7 text-white sm:p-9">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-success/15 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  <span className="size-1.5 rounded-full bg-success" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                    Service portal · LiftLoop
                  </span>
                </div>
                <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {user?.full_name?.split(" ")[0] || "there"}
                  <span className="text-accent">.</span>
                </h1>
                <p className="mt-2 text-sm text-white/60">Manage your rides. Help your campus commute.</p>
              </div>
              <button
                type="button"
                onClick={triggerSOS}
                disabled={sosLoading}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition-transform hover:scale-105 active:scale-95",
                  sosActive ? "bg-danger text-white" : "border-2 border-danger/50 bg-danger/15 text-danger",
                )}
              >
                <TriangleAlert className="size-4" /> {sosLoading ? "Sending…" : sosActive ? "SOS sent!" : "SOS"}
              </button>
            </div>
          </div>
        </Reveal>

        {/* verification banner */}
        {!isVerified && (
          <Reveal>
            <Panel
              className={cn(
                "mt-6 flex flex-wrap items-center gap-4 border-l-4",
                isPending ? "border-l-warning bg-warning-soft/40" : "border-l-danger bg-danger-soft/40",
              )}
            >
              <span className={toneTile(isPending ? "warning" : "danger", "size-11 [&>svg]:size-5")} aria-hidden>
                <ShieldCheck />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-foreground">
                  {isPending ? "Verification pending" : "Verification required"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isPending ? "Your documents are under review." : "Submit your documents to start offering rides."}
                </p>
              </div>
              {!isPending && (
                <Link to="/verification" className={buttonVariants({ variant: "danger", size: "sm" })}>
                  Verify now
                </Link>
              )}
            </Panel>
          </Reveal>
        )}

        {/* primary action */}
        <div className="mt-6">
          <PopButton
            variant="accent"
            size="lg"
            className="w-full justify-center sm:w-auto"
            onClick={() => navigate("/rides/create")}
          >
            <Plus className="size-5" /> Create a ride
          </PopButton>
        </div>

        {/* data collections (folders open their records; hover reveals real data) */}
        <div className="mt-6 mb-2 grid gap-5 grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <DataFolder
              key={c.key}
              title={c.title}
              tone={c.tone}
              icon={c.icon}
              count={c.count}
              countLabel={c.countLabel}
              items={c.items}
              emptyLabel={c.emptyLabel}
              onClick={c.onClick}
            />
          ))}
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((s) => (
            <Panel key={s.label} className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1.5 truncate font-mono text-2xl font-bold text-foreground">{s.value}</p>
              </div>
              <span className={toneTile(s.tone, "size-11")} aria-hidden>
                {s.icon}
              </span>
            </Panel>
          ))}
        </div>

        {/* earnings */}
        <Reveal>
          <Panel className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground">Your earnings · last 7 days</h3>
              <span className="text-xs text-muted-foreground">completed bookings</span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">Actual paid, completed booking totals</p>
            <Sparkbars
              values={earnings}
              labels={Array.from({ length: 7 }, (_, i) => format(new Date(Date.now() - (6 - i) * 86400000), "EEE"))}
              format={(n) => `₹${Math.round(n)}`}
            />
          </Panel>
        </Reveal>

        {/* active rides */}
        <div id="active-rides" className="mt-8 scroll-mt-24">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Car className="size-6 text-accent" /> My active rides
          </h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-muted" />
              ))}
            </div>
          ) : rides.length === 0 ? (
            <Panel className="flex flex-col items-center py-14 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
                <Car className="size-7" />
              </span>
              <p className="mt-5 font-display text-lg font-bold text-foreground">No active rides</p>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                {isVerified ? "Create your first ride from your campus route." : "Complete verification to start offering rides."}
              </p>
            </Panel>
          ) : (
            <div className="flex flex-col gap-5">
              {activeMarkers.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  <MapView
                    markers={activeMarkers}
                    route={activeRoute.length > 0 ? activeRoute : undefined}
                    center={activeMarkers[0].position}
                    zoom={13}
                    height="320px"
                  />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {rides.map((ride) => (
                  <Panel key={ride.id} hover>
                    <div className="mb-3 flex items-center justify-between">
                      <Badge tone="success">{ride.status}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" /> {format(new Date(ride.departure_time), "MMM d · h:mm a")}
                      </span>
                    </div>
                    <Link to={`/rides/${ride.id}`} className="block">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-1.5">
                          <span className="size-2.5 rounded-full bg-success" />
                          <span className="h-5 w-0.5 bg-border" />
                          <span className="size-2.5 rounded-full bg-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{ride.from_location?.address || "Start"}</p>
                          <p className="mt-2.5 truncate text-sm font-medium text-foreground">{ride.to_location?.address || "End"}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="size-4" /> {ride.seats_available} seat{ride.seats_available !== 1 ? "s" : ""}
                      </span>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="font-mono text-lg font-bold text-foreground">₹{ride.price_per_seat}</span>
                        <Button size="sm" onClick={()=>navigate(`/tracking/${ride.id}`)}>{ride.status==='active'?'Prepare pickups':'Manage stops'}</Button>
                        <Link to={`/tracking/${ride.id}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
                          <MapPin className="size-3.5" /> Track
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteRide(ride.id)}
                          disabled={deletingRide === ride.id}
                          aria-label="Delete ride"
                          className="grid size-9 place-items-center rounded-full border border-danger/40 bg-danger-soft text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* booking requests */}
        {bookingRequests.length > 0 && (
          <div id="booking-requests" className="mt-8 scroll-mt-24">
            <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold text-foreground">
              <Bell className="size-6 text-accent" /> Booking requests
              <Badge tone="warning">{bookingRequests.filter((b) => b.status === "pending").length} pending</Badge>
            </h2>
            <div className="flex flex-col gap-3">
              {bookingRequests.map((b) => {
                const rider = (b as unknown as { rider?: { full_name?: string; phone?: string; email?: string; profile_photo?: string } }).rider;
                const ride = (b as unknown as { ride?: Ride }).ride;
                const tone: BadgeTone = b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "warning";
                return (
                  <Panel key={b.id} className={cn("border-l-4", tone === "success" ? "border-l-success" : tone === "danger" ? "border-l-danger" : "border-l-warning")}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-strong font-display font-bold text-white">
                          {rider?.profile_photo ? (
                            <img src={rider.profile_photo} alt="" className="size-full object-cover" />
                          ) : (
                            (rider?.full_name || "R")[0]
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{rider?.full_name || "Rider"}</p>
                          <p className="truncate text-xs text-muted-foreground">{rider?.phone || rider?.email || ""}</p>
                        </div>
                      </div>
                      <Badge tone={tone}>{b.status}</Badge>
                    </div>
                    <p className="mb-3 truncate text-sm text-muted-foreground">
                      {ride?.from_location?.address || "Pickup"} → {ride?.to_location?.address || "Drop"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        <span className="font-mono text-base font-bold text-foreground">₹{b.total_price}</span> · {b.seats_booked} seat
                        {b.seats_booked !== 1 ? "s" : ""}
                      </span>
                      <Link to={`/chat/${b.ride_id}`} className={buttonVariants({variant:"secondary",size:"sm"})}>Message passengers</Link>
                    {b.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="primary" onClick={() => handleBookingAction(b.id, "confirmed")} disabled={processingBooking === b.id} icon={<Check className="size-3.5" />}>
                            Accept
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleBookingAction(b.id, "cancelled")} disabled={processingBooking === b.id} icon={<X className="size-3.5" />}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          </div>
        )}

        {/* safety + support */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Panel className="border-danger/30 bg-danger-soft/30">
            <div className="mb-2 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-danger text-white">
                <TriangleAlert className="size-5" />
              </span>
              <h3 className="font-display font-bold text-foreground">Emergency SOS</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Instantly alert university security and your emergency contacts.
            </p>
            <Button variant="danger" className="w-full" onClick={() => setIsSOSOpen(true)}>
              Open safety assistant
            </Button>
          </Panel>
          <Panel className="border-info/30 bg-info-soft/30">
            <div className="mb-2 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-info text-white">
                <MessageCircle className="size-5" />
              </span>
              <h3 className="font-display font-bold text-foreground">Customer support</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">Chat with our team for any issue or query.</p>
            <Button variant="accent" onClick={() => setChatOpen(true)}>
              Open chat
            </Button>
          </Panel>
        </div>
      </Container>

      {/* chat FAB */}
      {!chatOpen && (
        <motion.button
          initial={reduce ? undefined : { scale: 0 }}
          animate={reduce ? undefined : { scale: 1 }}
          onClick={() => setChatOpen(true)}
          aria-label="Open support chat"
          className="fixed bottom-6 right-6 z-50 grid size-14 place-items-center rounded-full bg-gradient-to-br from-navy to-navy-light text-white shadow-xl"
        >
          <MessageCircle className="size-6" />
        </motion.button>
      )}

      {/* chat drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex h-[min(480px,calc(100vh-120px))] w-[min(360px,calc(100vw-48px))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl backdrop-blur-lg"
          >
            <div className="flex items-center justify-between bg-gradient-to-br from-navy to-navy-light px-5 py-4 text-white">
              <span className="flex items-center gap-2 font-semibold">
                <MessageCircle className="size-4" /> Support chat
              </span>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat" className="text-white/70 hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
              {chatMessages.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <MessageCircle className="mx-auto mb-2 size-8 opacity-50" />
                  No messages yet. Say hello!
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={m.id ?? i} className={cn("flex", m.sender_type === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                      m.sender_type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {m.attachment_url && (
                      /\.(png|jpg|jpeg|gif|webp)$/i.test(m.attachment_url) ? (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer">
                          <img src={m.attachment_url} alt="attachment" className="mb-1.5 max-h-40 rounded-lg object-cover" />
                        </a>
                      ) : (
                        <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-black/15 px-2 py-1 text-xs underline">
                          <Paperclip className="size-3" /> Open attachment
                        </a>
                      )
                    )}
                    {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                  </div>
                </div>
              ))}
            </div>
            {chatFile && (
              <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-3 py-2">
                {/^image\//.test(chatFile.type) ? (
                  <img src={URL.createObjectURL(chatFile)} alt="preview" className="size-10 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-lg bg-muted"><Paperclip className="size-4" /></span>
                )}
                <span className="truncate text-xs text-muted-foreground">{chatFile.name}</span>
                <button type="button" onClick={() => setChatFile(null)} aria-label="Remove attachment" className="ml-auto text-muted-foreground hover:text-danger">
                  <X className="size-4" />
                </button>
              </div>
            )}
            {chatError&&<p role="alert" className="px-3 text-sm text-danger">{chatError}</p>}
            <div className="flex items-center gap-2 border-t border-border p-3">
              <input
                ref={chatFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) setChatFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                aria-label="Attach file"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-accent-soft hover:text-accent-strong"
              >
                <Paperclip className="size-4" />
              </button>
              <SmoothInput
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChatMessage();
                }}
                placeholder="Type a message or attach a file…"
                wrapperClassName="flex-1 py-2.5"
                aria-label="Support message"
              />
              <Button
                size="sm"
                onClick={sendChatMessage}
                disabled={sendingChat || (!chatMsg.trim() && !chatFile)}
                loading={sendingChat}
                aria-label="Send message"
                className="!px-3"
              >
                {!sendingChat && <Send className="size-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
    </PageShell>
  );
}
