import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "@/lib/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, FlaskConical, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

import { useAuthStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";
import { getSiteOrigin } from "@/lib/auth";
import { dashboardPath } from "@/lib/roles";
import type { User } from "@/types";
import Logo from "@/components/common/Logo";
import { SmoothInput } from "@/components/ui/smooth-input";
import { Button, type BadgeTone } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Role = "student" | "driver" | "admin";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

const ROLE_META: Record<
  Role,
  { label: string; tone: BadgeTone; title: string; sub: string; dot: string; badges: string[] }
> = {
  student: {
    label: "User",
    tone: "info",
    title: "Sign in to ride",
    sub: "Find verified people heading your way, split fares, and track every trip live from campus.",
    dot: "bg-info",
    badges: ["Google account sign-in", "Live ride tracking + SOS", "Split fares at the pump"],
  },
  driver: {
    label: "Service",
    tone: "accent",
    title: "Sign in to offer rides",
    sub: "Offer seats on trips you're already making. Cover fuel, meet peers, get paid instantly.",
    dot: "bg-accent",
    badges: ["Vehicle & licence verification", "Post rides in under a minute", "Fair, capped payouts"],
  },
  admin: {
    label: "Admin",
    tone: "danger",
    title: "Sign in as admin",
    sub: "University console — verification, SOS command centre, and community reports.",
    dot: "bg-danger",
    badges: ["Verify member documents", "Respond to live SOS alerts", "Community & audit logs"],
  },
};

const TAB_ACTIVE: Record<Role, string> = {
  student: "border-info text-info",
  driver: "border-accent text-accent-strong",
  admin: "border-danger text-danger",
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") as Role) || "student";
  const [role, setRole] = useState<Role>(
    ["student", "driver", "admin"].includes(initialRole) ? initialRole : "student",
  );
  useEffect(() => {
    const r = searchParams.get("role") as Role;
    if (r && ["student", "driver", "admin"].includes(r)) setRole(r);
  }, [searchParams]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpHash, setOtpHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"choose" | "otp">("choose");
  const { setSelectedRole, setUser } = useAuthStore();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Mock profiles are only available during local development.
  const demoEnabled = process.env.NODE_ENV === 'development';

  function loginAsDemo(type: "student" | "driver" | "admin") {
    if (!demoEnabled) return;
    const meta = {
      student: { name: "Test User", email: "test.user@example.com" },
      driver: { name: "Test Service", email: "test.service@example.com" },
      admin: { name: "Test Admin", email: "test.admin@example.com" },
    }[type];
    const mock: User = {
      id: `demo-${type}`,
      email: meta.email,
      full_name: meta.name,
      phone: "+91 99999 99999",
      user_type: type,
      profile_complete: 100,
      profile_photo: null,
      created_at: new Date().toISOString(),
      emergency_contact_phone: null,
      admin_approved: true,
    };
    setSelectedRole(type);
    setUser(mock);
    navigate(dashboardPath(type), { replace: true });
  }

  async function handleGoogle() {
    setLoading(true);
    setSelectedRole(role);
    localStorage.setItem("selectedRole", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getSiteOrigin()}/auth/callback` },
    });
    if (error) {
      alert(error.message);
      setLoading(false);
    }
  }

  const meta = ROLE_META[role];
  const tabs: Role[] = ["student", "driver", "admin"];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left — brand / role panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy to-navy-light p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 size-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col items-start">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" /> Back to home
            </Link>

            <div className="mt-9 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
                LiftLoop · {meta.label} Portal
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.h1
              key={role}
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mt-6 font-display text-4xl font-extrabold leading-[1.1] tracking-tight"
            >
              {meta.title}
            </motion.h1>
          </AnimatePresence>
          <p className="mt-4 max-w-sm leading-relaxed text-white/65">{meta.sub}</p>

          <ul className="mt-9 flex flex-col gap-3">
            {meta.badges.map((b, i) => (
              <motion.li
                key={b}
                initial={reduce ? undefined : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="inline-flex w-fit items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80"
              >
                {i === 0 ? (
                  <ShieldCheck className="size-4 text-accent" />
                ) : i === 1 ? (
                  <MapPin className="size-4 text-accent" />
                ) : (
                  <Check className="size-4 text-accent" />
                )}
                {b}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right — login card (translucent so the app-wide grid shows around it) */}
      <div className="flex items-center justify-center bg-white/25 p-6 sm:p-10">
        <div className="w-full max-w-lg">
          {/* mobile-only header */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <Logo size={30} />
              <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
                Lift<span className="text-accent">Loop</span>
              </span>
            </Link>
            <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              Back
            </Link>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-8 shadow-lg backdrop-blur-lg sm:p-10">
            <div className="hidden lg:block">
              <Logo size={48} />
            </div>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {meta.label} sign in
            </h2>
            <p className="mt-1.5 text-base text-muted-foreground">
              Share rides with the LiftLoop community
            </p>

            {/* role tabs */}
            <div className="mt-6 flex border-b border-border">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRole(t)}
                  className={cn(
                    "flex-1 border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors",
                    role === t
                      ? TAB_ACTIVE[t]
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ROLE_META[t].label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={reduce ? undefined : { opacity: 0, x: step === "otp" ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: step === "otp" ? -16 : 16 }}
                transition={{ duration: 0.25 }}
                className="pt-6"
              >
                {(
                  <>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full text-base"
                      onClick={handleGoogle}
                      loading={loading}
                      icon={!loading ? <GoogleIcon className="size-5" /> : undefined}
                    >
                      Continue with Google
                    </Button>

                    <p className="mt-5 text-sm text-muted-foreground">Sign in with your Google account.</p>
                  </>
                )}

                <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <Mail className="size-3.5" /> Google account sign-in
                </p>
                <div className="mt-3 flex justify-center gap-5 text-xs text-muted-foreground">
                  <Link to="/terms" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                  <Link to="/privacy" className="hover:text-foreground">
                    Privacy Policy
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {demoEnabled && (
            <div className="mt-5 rounded-3xl border border-dashed border-accent/50 bg-accent-soft/40 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <FlaskConical className="size-4 text-accent-strong" /> Test login (demo preview)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tour the dashboards with a sample account — no real data, nothing saved.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "student", label: "User" },
                    { key: "driver", label: "Service" },
                    { key: "admin", label: "Admin" },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => loginAsDemo(d.key)}
                    className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md active:translate-y-0"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
