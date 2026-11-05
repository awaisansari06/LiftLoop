"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const JCB_UST: [number, number] = [28.3762, 77.3149];

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#B8E568;border:3px solid white;box-shadow:0 0 0 5px rgba(200,149,108,0.25),0 6px 14px rgba(27,43,75,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const meIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3E8E5F;border:3px solid white;box-shadow:0 0 0 6px rgba(62,142,95,0.22),0 6px 14px rgba(27,43,75,0.35);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FlyTo({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(target, zoom, { duration: 1.6, easeLinearity: 0.25 });
  }, [target, zoom, map]);
  return null;
}

/** Light, editorial live map. Sized entirely by the parent (built to run
 *  full-bleed under the hero headline). */
export function LiveMap({ className }: { className?: string }) {
  const [center, setCenter] = useState<[number, number]>(JCB_UST);
  const [zoom, setZoom] = useState(15);
  const [status, setStatus] = useState<"idle" | "asking" | "live" | "denied">("idle");

  const requestLive = () => {
    if (!("geolocation" in navigator)) return setStatus("denied");
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setZoom(16);
        setStatus("live");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const label = status === "live" ? "You" : "JC Bose UST";
  const sub =
    status === "live"
      ? "Live location"
      : status === "denied"
        ? "Location off — campus view"
        : "Campus view";

  return (
    <div className={cn("relative overflow-hidden bg-[#ECE6DC]", className)}>
      {/* stylized light-map placeholder — shown until (or if) tiles load, so the
          strip always reads as a clean editorial map rather than a blank band */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(#ECE6DC,#ECE6DC), repeating-linear-gradient(0deg,transparent 0 78px,#DDD5C6 78px 80px), repeating-linear-gradient(90deg,transparent 0 118px,#DDD5C6 118px 120px)",
          backgroundBlendMode: "normal",
        }}
      />
      <MapContainer
        center={center as [number, number]}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging={true}
        doubleClickZoom={true}
        zoomControl={true}
        attributionControl={false}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          crossOrigin="anonymous"
        />
        <Marker position={center as [number, number]} icon={status === "live" ? meIcon : pickupIcon} />
        <FlyTo target={center} zoom={zoom} />
      </MapContainer>

      {/* soft top/bottom fades so the map reads as an editorial strip */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />

      {/* location chip */}
      <div className="absolute left-4 top-6 flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-2.5 shadow-md backdrop-blur sm:left-8">
        <span
          className={cn("size-2.5 rounded-full", status === "live" ? "bg-success" : "bg-accent")}
        />
        <div>
          <div className="font-sans text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {sub}
          </div>
          <div className="font-display text-sm font-bold leading-tight text-foreground">{label}</div>
        </div>
      </div>

      {status !== "live" && (
        <button
          onClick={requestLive}
          aria-label="Use my live location"
          className="absolute bottom-6 right-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2.5 text-sm font-semibold text-foreground shadow-md backdrop-blur transition-colors hover:border-accent sm:right-8"
        >
          <Crosshair className="size-4 text-accent" />
          {status === "asking" ? "Locating…" : "Use my location"}
        </button>
      )}

      <div className="absolute bottom-6 left-4 hidden items-center gap-2 rounded-full bg-navy/85 px-3.5 py-2 font-mono text-[11px] uppercase tracking-widest text-white/85 backdrop-blur sm:left-8 md:inline-flex">
        <MapPin className="size-3.5 text-accent" /> JC Bose UST · Faridabad
      </div>
    </div>
  );
}

export default LiveMap;
