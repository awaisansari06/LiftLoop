import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "@/lib/navigation";
import {
  CalendarCheck,
  Car,
  CornerDownLeft,
  Home,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { useAuthStore } from "../../hooks/useStore";
import { dashboardPath } from "../../lib/roles";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/primitives";

/* ── Command palette (Cmd/Ctrl + K) ─────────────────────── */
type Action = {
  id: string;
  title: string;
  hint: string;
  keywords: string;
  icon: ReactNode;
  run: () => void;
  section: string;
  tone: BadgeTone;
};

const TILE: Record<BadgeTone, string> = {
  neutral: "bg-muted text-foreground",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const actions: Action[] = useMemo(() => {
    if (!user) return [];
    const list: Action[] = [
      { id: "home", title: "Go to dashboard", hint: "Home", keywords: "home dashboard", icon: <Home className="size-4" />, run: () => navigate(dashboardPath(user.user_type)), section: "Navigate", tone: "info" },
      { id: "find", title: "Find a ride", hint: "Search available rides", keywords: "find search ride", icon: <Search className="size-4" />, run: () => navigate("/rides/search"), section: "Rides", tone: "accent" },
      { id: "book", title: "My bookings", hint: "View your booked rides", keywords: "bookings my rides trips", icon: <CalendarCheck className="size-4" />, run: () => navigate("/bookings"), section: "Rides", tone: "success" },
      { id: "profile", title: "Profile settings", hint: "Edit your profile", keywords: "profile account settings", icon: <User className="size-4" />, run: () => navigate("/profile"), section: "Account", tone: "info" },
      { id: "logout", title: "Sign out", hint: "End your session", keywords: "logout sign out exit", icon: <LogOut className="size-4" />, run: async () => { try { await logout(); } catch (e) { console.error(e); } navigate("/", { replace: true }); }, section: "Account", tone: "danger" },
    ];
    if (user.user_type === "driver" || user.user_type === "both") {
      list.push(
        { id: "create", title: "Create ride", hint: "Offer a new ride", keywords: "create new ride offer", icon: <Plus className="size-4" />, run: () => navigate("/rides/create"), section: "Service", tone: "success" },
        { id: "verify", title: "Verification", hint: "Submit your documents", keywords: "verification documents licence", icon: <ShieldCheck className="size-4" />, run: () => navigate("/verification"), section: "Service", tone: "accent" },
      );
    }
    if (user.user_type === "admin") {
      list.push({ id: "admin", title: "Admin console", hint: "Manage the platform", keywords: "admin panel console", icon: <ShieldCheck className="size-4" />, run: () => navigate("/admin"), section: "Admin", tone: "danger" });
    }
    return list;
  }, [user, navigate, logout]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return actions;
    return actions.filter((a) => a.title.toLowerCase().includes(term) || a.hint.toLowerCase().includes(term) || a.keywords.toLowerCase().includes(term));
  }, [actions, q]);

  useEffect(() => setCursor(0), [q]);

  const runIdx = (i: number) => {
    const item = filtered[i];
    if (!item) return;
    setOpen(false);
    setTimeout(() => item.run(), 40);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runIdx(cursor);
    }
  };

  if (!user) return null;

  const grouped: Record<string, Action[]> = {};
  filtered.forEach((a) => {
    (grouped[a.section] ||= []).push(a);
  });
  let flatIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[10000] flex items-start justify-center bg-navy/40 px-5 pt-[10vh] backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="size-5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search actions, pages, features…"
                aria-label="Command search"
                className="flex-1 bg-transparent text-foreground caret-accent outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">⌘K</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">No matches for “{q}”</p>
              ) : (
                Object.entries(grouped).map(([section, items]) => (
                  <div key={section} className="mb-1.5">
                    <div className="px-3 pb-1.5 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{section}</div>
                    {items.map((a) => {
                      flatIdx += 1;
                      const active = flatIdx === cursor;
                      const idx = flatIdx;
                      return (
                        <button
                          key={a.id}
                          onMouseEnter={() => setCursor(idx)}
                          onClick={() => runIdx(idx)}
                          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", active ? "bg-accent-soft" : "hover:bg-muted")}
                        >
                          <span className={cn("grid size-8 place-items-center rounded-lg [&>svg]:size-4", TILE[a.tone])}>{a.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{a.hint}</p>
                          </div>
                          {active && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <CornerDownLeft className="size-3" /> Enter
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[10px] text-muted-foreground">
              <span>↑ ↓ navigate · ↵ select · esc close</span>
              <span>LiftLoop</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Mobile bottom nav (≤768px) ─────────────────────────── */
export function MobileBottomNav() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!user || !isMobile) return null;

  const navItems =
    user.user_type === "admin"
      ? [
          { path: "/admin", label: "Home", icon: <Home className="size-5" /> },
          { path: "/profile", label: "Me", icon: <User className="size-5" /> },
        ]
      : user.user_type === "driver"
        ? [
            { path: "/service", label: "Home", icon: <Home className="size-5" /> },
            { path: "/rides/create", label: "Create", icon: <Plus className="size-5" /> },
            { path: "/service", label: "Rides", icon: <Car className="size-5" /> },
            { path: "/profile", label: "Me", icon: <User className="size-5" /> },
          ]
        : [
            { path: "/user", label: "Home", icon: <Home className="size-5" /> },
            { path: "/rides/search", label: "Search", icon: <Search className="size-5" /> },
            { path: "/bookings", label: "Trips", icon: <CalendarCheck className="size-5" /> },
            { path: "/profile", label: "Me", icon: <User className="size-5" /> },
          ];

  const isActive = (p: string) => location.pathname === p;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1 border-t border-border bg-background/90 px-3 backdrop-blur-lg md:hidden"
      style={{ paddingTop: 10, paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      {navItems.map((item, i) => {
        const active = isActive(item.path);
        return (
          <button
            key={i}
            type="button"
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
              active ? "text-accent-strong" : "text-muted-foreground",
            )}
          >
            <span className={cn("grid size-9 place-items-center rounded-xl", active && "bg-accent-soft")}>{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── ⌘K hint pill (desktop) ─────────────────────────────── */
export function CommandHint() {
  const { user } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("cmdk_dismissed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  if (!user || isMobile || dismissed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5 }}
      className="fixed bottom-6 right-6 z-[35] inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-md backdrop-blur"
    >
      Press
      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">⌘K</kbd>
      to search
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem("cmdk_dismissed", "1");
          } catch {
            /* ignore */
          }
        }}
        aria-label="Dismiss hint"
        className="ml-1 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}
