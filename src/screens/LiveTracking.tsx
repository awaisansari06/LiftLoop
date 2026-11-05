import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "@/lib/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, MessageCircle, Navigation, Phone, ShieldCheck, TriangleAlert } from "lucide-react";

import { MapView, type MapMarker } from "@/components/maps";
import { useAuthStore } from "@/hooks/useStore";
import { useRealtimeLocation } from "@/hooks/useRealtime";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { getRideById, createSOSAlert, updateRide } from "@/lib/api";
import { calculateRoute, formatDuration, formatDistance } from "@/lib/maps";
import type { Ride } from "@/types";
import { Badge, Button, Spinner } from "@/components/ui/primitives";
import {supabase} from "@/lib/supabase";
import {trackingStatus} from "@/lib/tracking-status";
import { cn } from "@/lib/utils";

export default function LiveTracking() {
  const { rideId } = useParams<{ rideId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [sosing, setSosing] = useState(false);
  const [eta, setEta] = useState<{ distance: number; duration: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const realtimeLocation = useRealtimeLocation(rideId || "");
  const isDriver = ride?.driver_id === user?.id;
  const gps=useLocationTracking(rideId,user?.id,isDriver && ride?.status==='in_progress');
  const [changing,setChanging]=useState(false);
  const [clock,setClock]=useState(Date.now());
  const tracking=trackingStatus(ride?.status,realtimeLocation?.updatedAt,clock);
  const changeStatus=async()=>{
    if(!ride || changing)return;
    if(ride.status==='in_progress'&&!window.confirm('Finish the ride and complete its confirmed bookings?'))return;
    setChanging(true);
    try{setRide(await updateRide(ride.id,{status:ride.status==='active'?'in_progress':'completed'}));}
    catch(error){window.alert(error instanceof Error?error.message:'Could not update ride');}
    finally{setChanging(false);}
  };
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),5000);return()=>window.clearInterval(timer);},[]);

  useEffect(()=>{
    let cancelled=false;
    if(!rideId)return;
    const load=async()=>{try{const trip=await getRideById(rideId);if(!cancelled)setRide(trip);}finally{if(!cancelled)setLoading(false);}};
    const channel=supabase.channel(`tracking-status:${rideId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rides',filter:`id=eq.${rideId}`},()=>{void load();}).subscribe();
    void load();
    const timer=window.setInterval(()=>{void load();},5000);
    return()=>{cancelled=true;window.clearInterval(timer);void supabase.removeChannel(channel);};
  },[rideId]);

  const fromLat = ride?.from_location?.lat || 28.6139;
  const fromLng = ride?.from_location?.lng || 77.209;
  const toLat = ride?.to_location?.lat || 28.63;
  const toLng = ride?.to_location?.lng || 77.22;
  const driverLat = realtimeLocation?.lat ?? fromLat;
  const driverLng = realtimeLocation?.lng ?? fromLng;

  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!ride) return;
    clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(async () => {
      try {
        const result = await calculateRoute([driverLat, driverLng], [toLat, toLng]);
        setRouteCoords(result.geometry);
        setEta({ distance: result.distance, duration: +result.duration });
      } catch {
        setRouteCoords([
          [driverLat, driverLng],
          [toLat, toLng],
        ]);
      }
    }, 2000);
    return () => clearTimeout(routeTimerRef.current);
  }, [driverLat, driverLng, toLat, toLng, ride]);

  const markers = useMemo<MapMarker[]>(
    () => [
      { id: "driver", position: [driverLat, driverLng], type: "vehicle", vehicleType: "car", popup: `${ride?.driver?.full_name || "Driver"} — ${realtimeLocation ? "Live" : "Last known"}` },
      { id: "pickup", position: [fromLat, fromLng], type: "pickup", popup: `Pickup: ${ride?.from_location?.address || "Start"}` },
      { id: "drop", position: [toLat, toLng], type: "drop", popup: `Drop: ${ride?.to_location?.address || "Destination"}` },
    ],
    [driverLat, driverLng, fromLat, fromLng, toLat, toLng, ride, realtimeLocation],
  );

  const handleSOS = async () => {
    if (!user || !rideId) return;
    setSosing(true);
    try {
      await createSOSAlert({ user_id: user.id, ride_id: rideId, location: { lat: driverLat, lng: driverLng }, message: "Emergency SOS" });
    } catch {
      /* ignore */
    } finally {
      setSosing(false);
    }
  };

  if (loading)
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-7" />
          <p className="text-sm text-muted-foreground">Loading ride…</p>
        </div>
      </div>
    );

  if(!ride)return <div className="p-6">Ride unavailable or access denied. <button onClick={()=>navigate('/bookings')}>Back to bookings</button></div>;

  return (
    <div className="flex h-dvh flex-col bg-white/30 backdrop-blur-sm">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", tracking.live ? "bg-success" : "bg-muted-foreground")} />
          <Badge tone={tracking.live ? "success" : "neutral"}>{tracking.label}</Badge>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/chat/${rideId}`)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          <MessageCircle className="size-3.5" /> Chat
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="text-sm">
          <p className="font-semibold">{isDriver?'Meet passengers at the pickup point':'Meet your driver at the pickup point'}</p>
          <p className="text-muted-foreground">{ride.from_location.address || 'Pickup marked A'} · Use Chat to coordinate. {isDriver?'Keep this page open and allow GPS after starting.':'The driver starts and finishes the ride.'}</p>
          {gps.error && isDriver && <p role="alert" className="text-danger">{gps.error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${fromLat},${fromLng}`} target="_blank" rel="noreferrer" className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Directions to pickup</a>
          {isDriver && ['active','in_progress'].includes(ride.status) && <Button onClick={changeStatus} loading={changing}>{ride.status==='active'?'Start ride':'Finish ride'}</Button>}
        </div>
      </div>
      {/* map */}
      <div className="relative min-h-0 flex-[7]">
        <AnimatePresence>
          {eta && tracking.live && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card/95 px-4 py-2 text-sm shadow-md backdrop-blur"
            >
              <span className="size-1.5 rounded-full bg-success" />
              <Clock className="size-3.5 text-navy" />
              <span className="font-semibold text-foreground">To destination: {formatDuration(eta.duration)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatDistance(eta.distance)}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <MapView center={[driverLat, driverLng]} zoom={14} markers={markers} route={routeCoords} height="100%" fullscreen showLocateButton={false} />
      </div>

      {/* driver panel */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-[3] overflow-y-auto border-t border-border bg-card backdrop-blur-md"
      >
        <div className="mx-auto max-w-2xl p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted font-display font-bold text-navy">
              {ride?.driver?.profile_photo ? (
                <img src={ride.driver.profile_photo} alt="" className="size-full object-cover" />
              ) : (
                (ride?.driver?.full_name || "D")[0]
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display font-bold text-foreground">{ride?.driver?.full_name || "Driver"}</h3>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Navigation className="size-3" /> Heading to your destination
              </p>
            </div>
            <Badge tone={tracking.live ? "success" : "warning"}>{tracking.label}</Badge>
          </div>

          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-4">
            <div className="flex flex-col items-center gap-1">
              <span className="size-2 rounded-full bg-success" />
              <span className="h-4 w-0.5 bg-border" />
              <span className="size-2 rounded-full bg-danger" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pickup</p>
                <p className="truncate text-sm font-medium text-foreground">{ride?.from_location?.address || "Start"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Drop</p>
                <p className="truncate text-sm font-medium text-foreground">{ride?.to_location?.address || "Destination"}</p>
              </div>
            </div>
            {eta && (
              <div className="shrink-0 text-right">
                <p className="font-mono text-lg font-bold text-navy">{formatDuration(eta.duration)}</p>
                <p className="text-xs text-muted-foreground">{formatDistance(eta.distance)}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {ride?.driver?.phone && !isDriver && <a href={`tel:${ride.driver.phone}`}>
              <Button variant="secondary" className="w-full" icon={<Phone className="size-4" />}>
                Call
              </Button>
            </a>}
            <Button variant="secondary" onClick={() => navigate(`/chat/${rideId}`)} icon={<MessageCircle className="size-4" />}>
              Message
            </Button>
            <Button variant="danger" onClick={handleSOS} loading={sosing} icon={!sosing ? <TriangleAlert className="size-4" /> : undefined}>
              SOS
            </Button>
          </div>

          {realtimeLocation && realtimeLocation.speed > 0 && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Speed: {Math.round(realtimeLocation.speed * 3.6)} km/h
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
