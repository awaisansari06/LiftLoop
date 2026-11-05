import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "@/lib/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Car,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { useAuthStore, useNotificationStore } from "../../hooks/useStore";
import Logo from "./Logo";
import NotificationPanel from './NotificationPanel';
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/primitives";
import { roleLabel } from "@/lib/roles";

const ROLE_TONE: Record<string, BadgeTone> = {
  admin: "danger",
  driver: "success",
  both: "accent",
  student: "info",
  pending_admin: "warning",
};

const TONE_BADGE: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export default function Header() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.profile_photo]);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
    navigate("/", { replace: true });
  };

  if (!user) return null;

  const navItems =
    user.user_type === "admin"
      ? [
          { label: "Dashboard", path: "/admin", icon: <Home className="size-[18px]" /> },
          { label: "Verification", path: "/verification", icon: <ShieldCheck className="size-[18px]" /> },
          { label: "Rides", path: "/rides/search", icon: <Search className="size-[18px]" /> },
        ]
      : user.user_type === "driver"
        ? [
            { label: "Dashboard", path: "/service", icon: <Home className="size-[18px]" /> },
            { label: "Create ride", path: "/rides/create", icon: <Plus className="size-[18px]" /> },
            { label: "My rides", path: "/service", icon: <Car className="size-[18px]" /> },
          ]
        : [
            { label: "Dashboard", path: "/user", icon: <Home className="size-[18px]" /> },
            { label: "Find ride", path: "/rides/search", icon: <Search className="size-[18px]" /> },
            { label: "My bookings", path: "/bookings", icon: <Car className="size-[18px]" /> },
          ];

  const isActive = (path: string) => location.pathname === path;
  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const tone = ROLE_TONE[user.user_type ?? "student"] ?? "info";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="h-0.5 bg-gradient-to-r from-accent via-primary to-accent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
              Lift<span className="text-accent">Loop</span>
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item, i) => (
              <Link
                key={`${item.path}-${i}`}
                to={item.path}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* right */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Notifications"
                onClick={()=>setNotificationsOpen(open=>!open)}
              className="relative grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Account menu"
                className="flex items-center gap-1.5 rounded-2xl p-1 pr-2 transition-colors hover:bg-muted"
              >
                {user.profile_photo && !avatarBroken ? (
                  <img
                    src={user.profile_photo}
                    alt={user.full_name || "Profile"}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarBroken(true)}
                    className="size-9 rounded-full object-cover ring-2 ring-accent/40"
                  />
                ) : (
                  <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-strong font-display text-sm font-bold text-white ring-2 ring-accent/30">
                    {initials}
                  </span>
                )}
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
              {notificationsOpen&&<NotificationPanel onClose={()=>setNotificationsOpen(false)}/>}

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg"
                    >
                      <div className="border-b border-border bg-muted/60 p-4">
                        <p className="truncate font-semibold text-foreground">{user.full_name || "User"}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        <span
                          className={cn(
                            "mt-2 inline-block rounded-lg px-2 py-0.5 text-xs font-semibold",
                            TONE_BADGE[tone],
                          )}
                        >
                          {roleLabel(user.user_type)}
                        </span>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          <User className="size-4" /> My profile
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-danger transition-colors hover:bg-danger-soft"
                        >
                          <LogOut className="size-4" /> Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted md:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pb-3 md:hidden"
            >
              {navItems.map((item, i) => (
                <Link
                  key={`${item.path}-m-${i}`}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
