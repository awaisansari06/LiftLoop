import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "@/lib/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  IndianRupee,
  Loader2,
  Navigation,
  RotateCcw,
} from "lucide-react";

import { MapView, type MapMarker } from "@/components/maps";
import { useAuthStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";
import { createRide } from "@/lib/api";
import { calculateRoute, reverseGeocode, formatDistance, formatDuration, getUserLocation, type RouteInfo } from "@/lib/maps";
import { LocationField, type LocationValue } from "@/components/ui/location-field";
import { Field } from "@/components/ui/smooth-input";
import { Button, Container, PageShell, Panel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const STEPS = ["Route", "Schedule", "Details", "Confirm"];

type Point = { name: string; coords: [number, number] };

export default function CreateRide() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [autoLocating, setAutoLocating] = useState(false);

  const [from, setFrom] = useState<Point | null>(null);
  const [to, setTo] = useState<Point | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(30);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAutoLocating(true);
      try {
        const coords = await getUserLocation();
        if (cancelled) return;
        const address = await reverseGeocode(coords[0], coords[1]);
        if (cancelled) return;
        setFrom({ name: address, coords });
      } catch {
        /* denied */
      } finally {
        if (!cancelled) setAutoLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const calcRoute = useCallback(async (start: [number, number], end: [number, number]) => {
    setLoadingRoute(true);
    try {
      setRoute(await calculateRoute(start, end));
    } catch {
      setRoute({ distance: 0, duration: 0, geometry: [start, end] });
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  const handleFromSelect = useCallback(
    async (loc: LocationValue) => {
      if (!loc.name.trim()) { setFrom(null); setRoute(null); return; }
      setFrom({ name: loc.name, coords: loc.coordinates });
      if (to) await calcRoute(loc.coordinates, to.coords);
    },
    [to, calcRoute],
  );

  const handleToSelect = useCallback(
    async (loc: LocationValue) => {
      if (!loc.name.trim()) { setTo(null); setRoute(null); return; }
      setTo({ name: loc.name, coords: loc.coordinates });
      if (from) await calcRoute(from.coords, loc.coordinates);
    },
    [from, calcRoute],
  );

  const handleMapClick = useCallback(
    async (latlng: { lat: number; lng: number }) => {
      const coords: [number, number] = [latlng.lat, latlng.lng];
      const address = await reverseGeocode(latlng.lat, latlng.lng).catch(() => `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      if (!from) setFrom({ name: address, coords });
      else if (!to) {
        setTo({ name: address, coords });
        await calcRoute(from.coords, coords);
      }
    },
    [from, to, calcRoute],
  );

  const handleDrag = useCallback(
    (which: "from" | "to") => async (latlng: { lat: number; lng: number }) => {
      const coords: [number, number] = [latlng.lat, latlng.lng];
      const address = await reverseGeocode(latlng.lat, latlng.lng).catch(() => `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      if (which === "from") {
        setFrom({ name: address, coords });
        if (to) await calcRoute(coords, to.coords);
      } else {
        setTo({ name: address, coords });
        if (from) await calcRoute(from.coords, coords);
      }
    },
    [from, to, calcRoute],
  );

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (from) m.push({ id: "from", position: from.coords, type: "pickup", popup: `Pickup: ${from.name}`, draggable: true, onDragEnd: handleDrag("from") });
    if (to) m.push({ id: "to", position: to.coords, type: "drop", popup: `Drop: ${to.name}`, draggable: true, onDragEnd: handleDrag("to") });
    return m;
  }, [from, to, handleDrag]);

  const handleSubmit = async () => {
    if (!user || !from || !to || !date || !time) return;
    setSubmitting(true);
    try {
      if (new Date(`${date}T${time}:00`).getTime() <= Date.now()) throw new Error("Choose a future departure time.");
      if (user.user_type === "student") {
        if (!window.confirm("Enable offering rides on your account? You can still book rides as a passenger.")) return;
        const {data: profile,error} = await supabase.from("users").update({user_type:"both"}).eq("id",user.id).select().single();
        if(error) throw error;
        useAuthStore.getState().setUser(profile);
      }
      await createRide({
        driver_id: user.id,
        from_location: { lat: from.coords[0], lng: from.coords[1], address: from.name },
        to_location: { lat: to.coords[0], lng: to.coords[1], address: to.name },
        departure_time: new Date(`${date}T${time}:00`).toISOString(),
        seats_available: seats,
        price_per_seat: price,
        route_polyline: route ? JSON.stringify(route.geometry) : undefined,
      });
      navigate("/service");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to create ride. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = step === 0 ? !!(from?.name.trim() && to?.name.trim() && from.coords.every(Number.isFinite) && to.coords.every(Number.isFinite)) : step === 1 ? !!(date && time) : step === 2 ? seats > 0 && price > 0 : true;

  return (
    <PageShell>
      <Container size="6xl">
        <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
          <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
            <Car className="size-5" />
          </span>
          Create a ride
        </h1>
        <p className="mt-1 text-muted-foreground">Offer a ride to your campus community.</p>

        {/* stepper */}
        <div className="my-7 flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors",
                  i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-2 h-0.5 flex-1 rounded", i < step ? "bg-success" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            {/* Step 0: route */}
            {step === 0 && (
              <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
                <Panel>
                  <h2 className="mb-4 font-display font-bold text-foreground">Select route</h2>
                  {autoLocating && (
                    <p className="mb-3 flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">
                      <Loader2 className="size-4 animate-spin" /> Detecting your location via GPS…
                    </p>
                  )}
                  <div className="space-y-3">
                    <LocationField label="Pickup point" tone="pickup" value={from?.name || ""} onSelect={handleFromSelect} placeholder="Search or tap the map…" />
                    <LocationField label="Drop point" tone="drop" value={to?.name || ""} onSelect={handleToSelect} placeholder="Search or tap the map…" />
                  </div>

                  {route && route.distance > 0 && (
                    <div className="mt-4 flex items-center gap-6 rounded-2xl border border-accent/30 bg-accent-soft/40 px-4 py-3.5">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Distance</p>
                        <p className="font-mono text-lg font-bold text-foreground">{formatDistance(route.distance)}</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Est. time</p>
                        <p className="font-mono text-lg font-bold text-foreground">{formatDuration(+route.duration)}</p>
                      </div>
                    </div>
                  )}
                  {loadingRoute && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Calculating route…
                    </p>
                  )}
                  {(from || to) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFrom(null);
                        setTo(null);
                        setRoute(null);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3.5" /> Clear
                    </button>
                  )}
                  {!from && !to && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Navigation className="size-3.5" /> Tip: tap the map to set points.
                    </p>
                  )}
                </Panel>
                <Panel inset="none" className="overflow-hidden">
                  <MapView markers={markers} route={route?.geometry} onMapClick={handleMapClick} height="440px" zoom={14} center={from?.coords} />
                </Panel>
              </div>
            )}

            {/* Step 1: schedule */}
            {step === 1 && (
              <Panel inset="lg" className="mx-auto max-w-xl">
                <div className="mb-6 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
                    <Calendar className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Schedule your ride</h2>
                    <p className="text-sm text-muted-foreground">Choose departure date and time.</p>
                  </div>
                </div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</label>
                <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                  {[...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    const sel = date === dateStr;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setDate(dateStr)}
                        className={cn(
                          "flex shrink-0 flex-col items-center rounded-2xl border px-4 py-2.5",
                          sel ? "border-accent bg-accent text-navy" : "border-border bg-card text-foreground",
                        )}
                      >
                        <span className="text-[10px] font-semibold uppercase opacity-70">
                          {i === 0 ? "Today" : i === 1 ? "Tmrw" : d.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="font-mono text-lg font-bold">{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</label>
                <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {["08:00", "10:00", "12:00", "14:00", "17:00", "19:00"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTime(t)}
                      className={cn(
                        "rounded-xl border py-2.5 font-mono text-sm font-bold",
                        time === t ? "border-accent bg-accent text-navy" : "border-border bg-card text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-muted2 py-3.5 pl-11 pr-4 font-mono text-foreground outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <AnimatePresence>
                  {date && time && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-6 flex items-center justify-between rounded-2xl bg-gradient-to-br from-navy to-navy-light px-5 py-4 text-white"
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-success">Departure confirmed</p>
                        <p className="font-display font-bold">
                          {(() => {
                            try {
                              const d = new Date(`${date}T${time}`);
                              return (
                                d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }) +
                                " · " +
                                d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                              );
                            } catch {
                              return `${date} at ${time}`;
                            }
                          })()}
                        </p>
                      </div>
                      <span className="grid size-9 place-items-center rounded-full bg-success text-white">
                        <Check className="size-5" />
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Panel>
            )}

            {/* Step 2: details */}
            {step === 2 && (
              <Panel inset="lg" className="mx-auto max-w-md space-y-5">
                <h2 className="font-display font-bold text-foreground">Ride details</h2>
                <div>
                  <label className="mb-2.5 block text-sm font-semibold text-foreground">Seats available</label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeats(s)}
                        className={cn(
                          "rounded-2xl border-2 py-4 font-mono text-lg font-bold",
                          seats === s ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Field
                  label="Price per seat (₹)"
                  type="text"
                  inputMode="numeric"
                  value={String(price)}
                  onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  icon={<IndianRupee className="size-4" />}
                  helper="A fair, distance-based price. No surge."
                />
              </Panel>
            )}

            {/* Step 3: confirm */}
            {step === 3 && (
              <div className="mx-auto grid max-w-3xl gap-4 lg:grid-cols-2">
                <Panel>
                  <h2 className="mb-4 font-display font-bold text-foreground">Confirm ride</h2>
                  <dl className="space-y-3 rounded-2xl bg-muted/50 p-4 text-sm">
                    {[
                      { l: "From", v: from?.name },
                      { l: "To", v: to?.name },
                      ...(route && route.distance > 0 ? [{ l: "Distance", v: formatDistance(route.distance) }] : []),
                      { l: "When", v: `${date} at ${time}` },
                      { l: "Seats", v: String(seats) },
                      { l: "Price/seat", v: `₹${price}` },
                    ].map((r) => (
                      <div key={r.l} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{r.l}</dt>
                        <dd className="truncate text-right font-medium text-foreground">{r.v}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-3">
                      <dt className="font-semibold text-foreground">Total earnings</dt>
                      <dd className="font-mono text-lg font-bold text-success">₹{price * seats}</dd>
                    </div>
                  </dl>
                </Panel>
                <Panel inset="none" className="overflow-hidden">
                  <MapView markers={markers} route={route?.geometry} height="300px" showLocateButton={false} />
                </Panel>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* nav */}
        <div className="mx-auto mt-7 flex max-w-3xl justify-between">
          <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} icon={<ChevronLeft className="size-4" />}>
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} icon={!submitting ? <CheckCircle2 className="size-4" /> : undefined}>
              Create ride
            </Button>
          )}
        </div>
      </Container>
    </PageShell>
  );
}
