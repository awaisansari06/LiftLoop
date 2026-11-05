import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/lib/navigation";
import { motion } from "framer-motion";
import { ArrowUpDown, Bookmark, BookmarkCheck, Car, Clock, Crosshair, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

import { MapView, type MapMarker } from "@/components/maps";
import { getRides, saveRoute } from "@/lib/api";
import {
  calculateRoute,
  reverseGeocode,
  getUserLocation,
  getDistance,
  formatDistance,
  formatDuration,
} from "@/lib/maps";
import type { Ride } from "@/types";
import { useAuthStore } from "@/hooks/useStore";
import { LocationField, type LocationValue } from "@/components/ui/location-field";
import { Badge, Button, Eyebrow, Panel, buttonVariants } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const ROUTE_COLORS = ["#173F35", "#3E8E5F", "#C6463F", "#C77D2E", "#B8E568", "#285D4B"];

interface RideWithRoute extends Ride {
  routeCoords?: [number, number][];
}

export default function RideSearch() {
  const { user } = useAuthStore();
  const initialSearch = useSearchParams();
  const [rides, setRides] = useState<RideWithRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);
  const [fromName, setFromName] = useState(initialSearch.get("from") || "");
  const [toName, setToName] = useState(initialSearch.get("to") || "");
  const [dateFilter, setDateFilter] = useState("");
  const [highlightedRide, setHighlightedRide] = useState<string | null>(null);
  const [searchRoute, setSearchRoute] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [activeInput, setActiveInput] = useState<"from" | "to">("from");

  useEffect(() => {
    async function calcUserRoute() {
      if (fromCoords && toCoords) {
        try {
          const route = await calculateRoute(
            { lat: fromCoords[0], lng: fromCoords[1] },
            { lat: toCoords[0], lng: toCoords[1] },
          );
          setSearchRoute(route.geometry || null);
          const km = typeof route.distance === "number" ? route.distance : getDistance(fromCoords, toCoords);
          const mins = typeof route.duration === "number" ? route.duration : Math.max(1, Math.round(km * 2.4));
          setRouteInfo({ distanceKm: km, durationMin: mins });
        } catch {
          setSearchRoute(null);
          const km = getDistance(fromCoords, toCoords);
          setRouteInfo(null);
        }
      } else {
        setSearchRoute(null);
        setRouteInfo(null);
      }
    }
    calcUserRoute();
  }, [fromCoords, toCoords]);

  useEffect(() => {
    loadRides();
    const refresh = window.setInterval(() => { void loadRides(); }, 30000);
    (async () => {
      if (!fromCoords && !fromName) {
        try {
          const [lat, lng] = await getUserLocation();
          setFromCoords([lat, lng]);
          try {
            setFromName((await reverseGeocode(lat, lng)) || "Current location");
          } catch {
            setFromName("Current location");
          }
          setActiveInput("to");
        } catch {
          /* denied */
        }
      }
    })();
    return () => window.clearInterval(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = async (latlng: { lat: number; lng: number }) => {
    const coords: [number, number] = [latlng.lat, latlng.lng];
    let address: string;
    try {
      address = await reverseGeocode(latlng.lat, latlng.lng);
    } catch {
      address = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
    }
    if (activeInput === "from") {
      setFromCoords(coords);
      setFromName(address);
      setActiveInput("to");
    } else {
      setToCoords(coords);
      setToName(address);
      setActiveInput("from");
    }
  };

  async function loadRides() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getRides({ status: "active" });
      const withRoutes = await Promise.all(
        data.slice(0, 6).map(async (ride) => {
          if (ride.from_location && ride.to_location) {
            try {
              const route = await calculateRoute(ride.from_location, ride.to_location);
              return { ...ride, routeCoords: route.geometry };
            } catch {
              return ride;
            }
          }
          return ride;
        }),
      );
      setRides([...withRoutes, ...data.slice(6)]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load rides. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  // LiftLoop is a POOLING network, not a cab app: nothing is shown until the
  // rider searches a real pickup/destination, and only rides whose driver posted
  // the same corridor (both endpoints near the searched route) appear.
  const hasSearch = useMemo(
    () =>
      Boolean(
        (fromCoords && (fromCoords[0] !== 0 || fromCoords[1] !== 0)) ||
          fromName.trim() ||
          (toCoords && (toCoords[0] !== 0 || toCoords[1] !== 0)) ||
          toName.trim(),
      ),
    [fromCoords, toCoords, fromName, toName],
  );

  const CORRIDOR_KM = 3; // tight radius — same corridor, not "anywhere within 10 km"

  const filtered = useMemo(() => {
    if (!hasSearch) return []; // no rider has to see anything until they search a route
    return rides.filter((r) => {
      if (dateFilter && format(new Date(r.departure_time), "yyyy-MM-dd") !== dateFilter) return false;
      let matchFrom = true;
      let matchTo = true;
      if (fromCoords && (fromCoords[0] !== 0 || fromCoords[1] !== 0) && r.from_location) {
        matchFrom = getDistance(fromCoords, [r.from_location.lat, r.from_location.lng]) <= CORRIDOR_KM;
      } else if (fromName.trim()) {
        matchFrom = (r.from_location?.address || "").toLowerCase().includes(fromName.trim().toLowerCase());
      }
      if (toCoords && (toCoords[0] !== 0 || toCoords[1] !== 0) && r.to_location) {
        matchTo = getDistance(toCoords, [r.to_location.lat, r.to_location.lng]) <= CORRIDOR_KM;
      } else if (toName.trim()) {
        matchTo = (r.to_location?.address || "").toLowerCase().includes(toName.trim().toLowerCase());
      }
      if (fromCoords && toCoords && r.from_location && r.to_location) {
        const requested = [toCoords[0] - fromCoords[0], toCoords[1] - fromCoords[1]];
        const offered = [r.to_location.lat - r.from_location.lat, r.to_location.lng - r.from_location.lng];
        if (requested[0] * offered[0] + requested[1] * offered[1] <= 0) return false;
      }
      return matchFrom && matchTo;
    });
  }, [rides, fromCoords, toCoords, fromName, toName, dateFilter, hasSearch]);

  const markers = useMemo<MapMarker[]>(() => {
    const m: MapMarker[] = [];
    if (highlightedRide) {
      const ride = filtered.find((r) => r.id === highlightedRide);
      if (ride?.from_location)
        m.push({ id: `${ride.id}-from`, position: [ride.from_location.lat, ride.from_location.lng], type: "pickup", popup: `${ride.driver?.full_name || "Driver"} — Pickup` });
      if (ride?.to_location)
        m.push({ id: `${ride.id}-to`, position: [ride.to_location.lat, ride.to_location.lng], type: "drop", popup: `${ride.driver?.full_name || "Driver"} — Drop` });
    } else {
      if (fromCoords) m.push({ id: "user-from", position: fromCoords, type: "pickup", popup: "Search pickup" });
      if (toCoords) m.push({ id: "user-to", position: toCoords, type: "drop", popup: "Search drop" });
    }
    return m;
  }, [filtered, fromCoords, toCoords, highlightedRide]);

  const allRoutes = useMemo(
    () =>
      filtered
        .filter((r) => r.routeCoords && r.routeCoords.length > 0)
        .map((r, idx) => ({ id: r.id, coords: r.routeCoords!, color: ROUTE_COLORS[idx % ROUTE_COLORS.length], highlighted: highlightedRide === r.id })),
    [filtered, highlightedRide],
  );

  const primaryRoute = useMemo(() => {
    if (highlightedRide) {
      const found = allRoutes.find((r) => r.id === highlightedRide);
      if (found) return found.coords;
    }
    if (searchRoute) return searchRoute;
    return undefined;
  }, [allRoutes, highlightedRide, searchRoute]);

  const hasFilters = fromName || toName || dateFilter;
  const swap = () => {
    const fc = fromCoords,
      fn = fromName;
    setFromCoords(toCoords);
    setFromName(toName);
    setToCoords(fc);
    setToName(fn);
  };

  return (
    <main
      className="flex flex-col bg-white/40 md:flex-row md:overflow-hidden"
      style={{ minHeight: user ? "calc(100dvh - 64px)" : "100dvh", height: user ? "calc(100dvh - 64px)" : undefined }}
    >
      {/* sidebar */}
      <aside className="w-full shrink-0 space-y-5 overflow-y-auto border-border p-5 md:w-[440px] md:border-r">
        <div>
          <Eyebrow className="mb-2">User · LiftLoop</Eyebrow>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Find a <span className="text-accent">ride</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Search live rides headed your way.</p>
        </div>

        <div className="space-y-2.5">
          <div
            onFocus={() => setActiveInput("from")}
            className={cn("rounded-2xl", activeInput === "from" && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
          >
            <LocationField
              placeholder="From where? (or tap the map)"
              tone="pickup"
              value={fromName}
              onSelect={(l: LocationValue) => {
                setFromCoords(l.coordinates[0] || l.coordinates[1] ? l.coordinates : null);
                setFromName(l.name);
                setActiveInput("to");
              }}
            />
          </div>
          <div
            onFocus={() => setActiveInput("to")}
            className={cn("rounded-2xl", activeInput === "to" && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
          >
            <LocationField
              placeholder="To where? (or tap the map)"
              tone="drop"
              value={toName}
              onSelect={(l: LocationValue) => {
                setToCoords(l.coordinates[0] || l.coordinates[1] ? l.coordinates : null);
                setToName(l.name);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(fromCoords || toCoords) && (
              <button
                type="button"
                onClick={swap}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowUpDown className="size-3.5" /> Swap
              </button>
            )}
            <SaveRouteButton fromCoords={fromCoords} toCoords={toCoords} fromName={fromName} toName={toName} />
          </div>
        </div>

        {routeInfo && (
          <Panel inset="sm" className="flex items-center gap-3 border-accent/30 bg-accent-soft/40">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-navy">
              <Crosshair className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shortest route</p>
              <p className="font-mono text-sm font-bold text-foreground">
                {formatDistance(routeInfo.distanceKm)} · {formatDuration(routeInfo.durationMin)}
              </p>
            </div>
            <Badge tone="success">Live</Badge>
          </Panel>
        )}

        {/* date pills */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select date</label>
            {loadError && <button type="button" onClick={() => void loadRides()} className="text-danger">{loadError} Retry</button>}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setFromName("");
                  setToName("");
                  setDateFilter("");
                  setFromCoords(null);
                  setToCoords(null);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger"
              >
                <X className="size-3" /> Clear
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className={cn(
                "shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold",
                !dateFilter ? "border-accent bg-accent text-navy" : "border-border bg-card text-foreground",
              )}
            >
              Any
            </button>
            {[...Array(7)].map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const dateStr = format(d, "yyyy-MM-dd");
              const sel = dateFilter === dateStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setDateFilter(dateStr)}
                  className={cn(
                    "flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 text-center",
                    sel ? "border-accent bg-accent text-navy" : "border-border bg-card text-foreground",
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {i === 0 ? "Today" : i === 1 ? "Tmrw" : d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="font-mono text-base font-bold">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {loading
            ? "Searching…"
            : !hasSearch
              ? "Search your route to see pooled rides"
              : `${filtered.length} ride${filtered.length !== 1 ? "s" : ""} on your corridor`}
        </p>

        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted" />)
          ) : !hasSearch ? (
            <Panel className="flex flex-col items-center py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
                <Crosshair className="size-6" />
              </span>
              <p className="mt-4 font-display font-bold text-foreground">Where are you headed?</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Enter your pickup and destination. We only show rides a verified member has already
                posted along your corridor — no cabs, no strangers.
              </p>
            </Panel>
          ) : filtered.length === 0 ? (
            <Panel className="flex flex-col items-center py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
                <Car className="size-6" />
              </span>
              <p className="mt-4 font-display font-bold text-foreground">No one's posted this corridor yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Nobody has offered this exact route yet. Try a nearby gate, another time, or offer the
                ride yourself.
              </p>
            </Panel>
          ) : (
            filtered.map((ride, i) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onMouseEnter={() => setHighlightedRide(ride.id)}
                onMouseLeave={() => setHighlightedRide(null)}
              >
                <Link to={`/rides/${ride.id}`}>
                  <Panel hover className={cn(highlightedRide === ride.id && "border-accent ring-1 ring-accent/40")}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-strong font-display text-sm font-bold text-white">
                        {(ride.driver?.full_name || "D")[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{ride.driver?.full_name || "Driver"}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" /> {format(new Date(ride.departure_time), "EEE, MMM d · h:mm a")}
                        </p>
                      </div>
                      <Badge tone="success">{ride.status}</Badge>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <span className="size-2 rounded-full bg-success" />
                        <span className="h-4 w-0.5 bg-border" />
                        <span className="size-2 rounded-full bg-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{ride.from_location?.address || "Start"}</p>
                        <p className="mt-2 truncate text-xs font-medium text-foreground">{ride.to_location?.address || "End"}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="size-3.5" /> {ride.seats_available} seat{ride.seats_available !== 1 ? "s" : ""}
                      </span>
                      <span className="font-mono text-base font-bold text-foreground">
                        ₹{ride.price_per_seat}
                        <span className="text-xs font-normal text-muted-foreground">/seat</span>
                      </span>
                    </div>
                  </Panel>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </aside>

      {/* map */}
      <div className="relative h-[55vh] w-full md:h-auto md:flex-1">
        <MapView markers={markers} route={primaryRoute} onMapClick={handleMapClick} height="100%" fullscreen />
      </div>
    </main>
  );
}

function SaveRouteButton({
  fromCoords,
  toCoords,
  fromName,
  toName,
}: {
  fromCoords: [number, number] | null;
  toCoords: [number, number] | null;
  fromName: string;
  toName: string;
}) {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const ready = user && fromCoords && toCoords && fromName && toName;
  if (!ready) return null;
  const doSave = async () => {
    if (!user || !fromCoords || !toCoords) return;
    setSaving(true);
    try {
      await saveRoute(
        user.id,
        { lat: fromCoords[0], lng: fromCoords[1], address: fromName },
        { lat: toCoords[0], lng: toCoords[1], address: toName },
        undefined,
      );
      setSaved(true);
      toast.success("Route saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };
  return (
    <button
      type="button"
      disabled={saving || saved}
      onClick={doSave}
      className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "border-accent/50 text-accent-strong")}
    >
      {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
      {saved ? "Saved" : saving ? "Saving…" : "Save route"}
    </button>
  );
}
