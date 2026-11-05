"use client";

/**
 * LocationField — token-driven location autocomplete built on SmoothInput.
 * Reuses lib/maps geocoding (searchLocations / reverseGeocode / getUserLocation).
 * Replaces the legacy dark-styled maps/LocationSearch on light surfaces.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Loader2, MapPin, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { searchLocations, reverseGeocode, getUserLocation, type GeoSearchResult } from "@/lib/maps";
import { SmoothInput } from "@/components/ui/smooth-input";
import { cn } from "@/lib/utils";

export type LocationValue = { name: string; coordinates: [number, number]; address: string };

export function LocationField({
  label,
  placeholder = "Search a place…",
  value,
  onSelect,
  tone = "pickup",
  disabled,
  className,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onSelect: (loc: LocationValue) => void;
  tone?: "pickup" | "drop";
  disabled?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => setQuery(value), [value]);

  // debounce search
  useEffect(() => {
    if (!query || query.length < 3 || query === value) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchLocations(query);
        setResults(r.slice(0, 6));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, value]);

  // outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (r: GeoSearchResult) => {
    onSelect({ name: r.name, coordinates: r.coordinates, address: r.address });
    setQuery(r.name);
    setOpen(false);
  };

  const useCurrent = async () => {
    setLocating(true);
    try {
      const coords = await getUserLocation();
      let address = "Current location";
      try {
        address = await reverseGeocode(coords[0], coords[1]);
      } catch {
        /* keep default */
      }
      onSelect({ name: address, coordinates: coords, address });
      setQuery(address);
      setOpen(false);
    } catch {
      /* denied */
    } finally {
      setLocating(false);
    }
  };

  const dot = tone === "pickup" ? "bg-success" : "bg-accent";

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-4 z-10 flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <span className={cn("size-2 rounded-full", dot)} />
        </span>
        <SmoothInput
          id={id}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          className="pl-12 pr-9"
          aria-label={label || placeholder}
        />
        <span className="absolute right-3 z-10 flex items-center">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-accent" />
          ) : query ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => {
                setQuery("");
                setResults([]);
                onSelect({ name: "", coordinates: [0, 0], address: "" });
              }}
              className="text-muted-foreground hover:text-danger"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-lg"
          >
            <button
              type="button"
              onClick={useCurrent}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-strong">
                {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {locating ? "Getting location…" : "Use current location"}
                </p>
                <p className="text-xs text-muted-foreground">Auto-detect via GPS</p>
              </div>
            </button>
            {results.length === 0 && !loading ? (
              <p className="px-4 py-4 text-center text-sm text-muted-foreground">
                {query.length < 3 ? "Keep typing…" : "No matches — try a nearby landmark."}
              </p>
            ) : (
              results.map((r, i) => (
                <button
                  key={`${r.name}-${i}`}
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.address}</p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LocationField;
