import { useEffect } from "react";
import { useNavigate, Link } from "@/lib/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, CarFront, Check, UserRound } from "lucide-react";

import Logo from "@/components/common/Logo";
import { Container, Eyebrow, type BadgeTone } from "@/components/ui/primitives";
import { PopButton } from "@/components/ui/pop-button";
import { RevealGroup, RevealItem } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

type Role = {
  key: "student" | "driver" | "admin";
  title: string;
  tag: string;
  desc: string;
  perks: string[];
  tone: BadgeTone;
  icon: React.ReactNode;
};

const ROLES: Role[] = [
  {
    key: "student",
    title: "User",
    tag: "Take rides across campus",
    desc: "Find safe, affordable rides with verified members heading your way.",
    perks: ["Search & book rides", "Live tracking + SOS", "Split fares fairly"],
    tone: "info",
    icon: <UserRound />,
  },
  {
    key: "driver",
    title: "Service",
    tag: "Offer rides & share seats",
    desc: "Offer seats on trips you're already making. Cover fuel, meet peers.",
    perks: ["Post rides in seconds", "Verified ride requests", "Fair, capped fares"],
    tone: "accent",
    icon: <CarFront />,
  },
  {
    key: "admin",
    title: "Admin",
    tag: "University operator access",
    desc: "Manage verifications, SOS alerts and community reports.",
    perks: ["Member verification", "SOS command center", "Community reports"],
    tone: "success",
    icon: <Building2 />,
  },
];

const TILE: Record<BadgeTone, string> = {
  neutral: "bg-muted text-foreground",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export default function RolePortal() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <Container size="7xl" className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
              Lift<span className="text-accent">Loop</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Container>
      </header>

      <Container size="7xl" className="py-16 sm:py-24">
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 16 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <Eyebrow className="mb-4">Choose your portal</Eyebrow>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            How will you use <span className="text-accent">LiftLoop?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Each portal is built for what you do. Pick one — you can switch later.
          </p>
        </motion.div>

        <RevealGroup className="mt-14 grid gap-5 md:grid-cols-3" stagger={0.1}>
          {ROLES.map((role) => (
            <RevealItem key={role.key}>
              <motion.div
                whileHover={reduce ? undefined : { y: -6 }}
                className="group flex h-full w-full flex-col rounded-3xl border border-border bg-card p-7 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:border-accent/50 hover:shadow-xl"
              >
                <motion.span
                  aria-hidden
                  animate={reduce ? undefined : { y: [0, -5, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                  className={cn(
                    "inline-grid size-14 place-items-center rounded-2xl [&>svg]:size-7",
                    TILE[role.tone],
                  )}
                >
                  {role.icon}
                </motion.span>
                <span className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {role.tag}
                </span>
                <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{role.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.desc}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {role.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-foreground">
                      <Check className="size-4 shrink-0 text-success" />
                      {p}
                    </li>
                  ))}
                </ul>
                <PopButton
                  variant="primary"
                  size="lg"
                  className="mt-7 w-full"
                  onClick={() => navigate(`/login?role=${role.key}`)}
                >
                  Continue as {role.title}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </PopButton>
              </motion.div>
            </RevealItem>
          ))}
        </RevealGroup>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Not sure which one?{" "}
          <Link to="/login?role=student" className="font-semibold text-accent hover:underline">
            Start as a User
          </Link>{" "}
          — you can offer rides later.
        </p>
      </Container>
    </div>
  );
}
