import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@/lib/navigation";
import { EffectCards, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-cards";
import "swiper/css/pagination";
import useEmblaCarousel from "embla-carousel-react";
import EmblaAutoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import {
  ArrowRight,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  IndianRupee,
  MapPin,
  MessageCircle,
  Navigation,
  Play,
  Route,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";

import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { Field } from "@/components/ui/smooth-input";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/scroll-reveal";
import { VideoReveal } from "@/components/ui/video-reveal";
import { TextRoll } from "@/components/ui/text-roll";
import { Marquee } from "@/components/ui/marquee";
import { CrowdCanvas } from "@/components/ui/crowd-canvas";
import { RidePoster } from "@/components/ui/ride-illustrations";
import { type RideSlide } from "@/components/ui/ride-carousel";
import { PopButton } from "@/components/ui/pop-button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { MorphText } from "@/components/ui/morph-text";
import { AnimatedFooter } from "@/components/ui/animated-footer";
import { SocialFlipButton } from "@/components/ui/social-flip-button";
import {
  Badge,
  Button,
  Container,
  Eyebrow,
  Panel,
  SectionHeading,
} from "@/components/ui/primitives";
import { CursorGlow } from "@/components/ui/cursor";
import LiveMap from "@/components/landing/LiveMap";
import IntroFilm from "@/components/landing/IntroFilm";
import LandingHeader from "@/components/landing/LandingHeader";
import Logo from "@/components/common/Logo";
import { cn } from "@/lib/utils";

/* ── 3D tilt-to-cursor wrapper (used by the steps timeline) ── */
function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Hover-expand row of colored posters (Skiper HoverExpand: smooth
      collapse/open morphism — the active card grows, the rest shrink). Fills
      the page edge-to-edge. Used for both the ride types and the corridors. ── */
function HoverExpandRides({ slides, tall }: { slides: RideSlide[]; tall?: boolean }) {
  const [active, setActive] = useState(0);
  return (
    <>
      {/* Desktop Horizontal Accordion */}
      <div
        className={cn(
          "mx-auto hidden w-full max-w-none gap-3.5 px-10 lg:flex lg:flex-row",
          tall ? "lg:h-[24rem] xl:h-[30rem]" : "lg:h-[22rem] xl:h-[27rem]"
        )}
        onMouseLeave={() => setActive(-1)}
      >
        {slides.map((s, i) => {
          const isActive = active === i;
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn(
                "group relative min-w-0 min-h-0 cursor-pointer overflow-hidden rounded-[1.75rem] outline-none transition-[flex-grow,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isActive ? "flex-[3.2] shadow-2xl ring-1 ring-black/5" : "flex-1 shadow-md",
              )}
            >
              <RidePoster
                tone={s.tone}
                kind={s.kind}
                eyebrow={s.eyebrow}
                title={s.title}
                caption={isActive ? s.caption : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Mobile — Skiper 48 Carousel_002 style: Swiper cards effect. Deck of
          cards fanned behind the active one, pager dots underneath. The
          .Carousal_002 class name + 50px padding-bottom + clickable
          pagination follow the pasted reference verbatim. Mobile only —
          desktop keeps the HoverExpand accordion above. */}
      <div
        className="flex w-full items-center justify-center overflow-visible py-4 lg:hidden"
        data-lenis-prevent
      >
        <Swiper
          effect="cards"
          grabCursor
          loop
          spaceBetween={40}
          pagination={{ clickable: true }}
          modules={[EffectCards, Pagination]}
          className={cn("Carousal_002", tall ? "h-[400px] w-[280px]" : "h-[380px] w-[260px]")}
        >
          {slides.map((s, i) => (
            <SwiperSlide key={i} className="overflow-hidden rounded-3xl">
              <RidePoster
                tone={s.tone}
                kind={s.kind}
                eyebrow={s.eyebrow}
                title={s.title}
                caption={s.caption}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </>
  );
}

/* ── Hero route search (SmoothInput showcase) ── */
function HeroSearch() {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate("/rides");
      }}
      className="flex w-full max-w-2xl flex-col gap-2.5 rounded-3xl border border-border bg-card p-2.5 text-left shadow-md backdrop-blur-md sm:flex-row sm:items-center"
    >
      <div className="sm:flex-1">
        <Field
          aria-label="Pickup point"
          placeholder="From your gate…"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          icon={<Navigation className="size-4" />}
          wrapperClassName="border-transparent bg-muted2"
        />
      </div>
      <div className="sm:flex-1">
        <Field
          aria-label="Destination"
          placeholder="Where to?"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          icon={<MapPin className="size-4" />}
          wrapperClassName="border-transparent bg-muted2"
        />
      </div>
      <Button type="submit" size="lg" variant="accent" className="shrink-0" icon={<Route className="size-4" />}>
        Find rides
      </Button>
    </form>
  );
}

/* How pooling works — four steps */
const STEPS = [
  { n: "01", icon: <GraduationCap className="size-5" />, title: "Sign in with Google", body: "Sign in with your Google account. One-time check — no paperwork." },
  { n: "02", icon: <Route className="size-5" />, title: "Match on your corridor", body: "We surface only rides already travelling your route, in your direction." },
  { n: "03", icon: <Wallet className="size-5" />, title: "Agree the fare", body: "A fair, distance-capped price. Counter-offer if you like — no surge, ever." },
  { n: "04", icon: <Navigation className="size-5" />, title: "Track, chat, arrive", body: "Live GPS the whole way, in-app chat, one-tap SOS. Split at the pump." },
];

/* Ride types — varied colored posters for the carousel */
const RIDE_SLIDES: RideSlide[] = [
  { tone: "navy", kind: "car", eyebrow: "4 seats", title: "Car pool", caption: "Split a full car four ways on the long campus run." },
  { tone: "clay", kind: "scooter", eyebrow: "1 pillion", title: "Scooter pool", caption: "Nip through the Mathura Road jam on two wheels." },
  { tone: "sage", kind: "bike", eyebrow: "1 pillion", title: "Bike pool", caption: "A quick lift to the gate — fuel split fairly." },
  { tone: "sky", kind: "suv", eyebrow: "6 seats", title: "Society run", caption: "Recurring rides for the same colony, same schedule." },
  { tone: "plum", kind: "car", eyebrow: "Weekends", title: "One-off trip", caption: "Heading home for the break? Fill the empty seats." },
  { tone: "gold", kind: "suv", eyebrow: "Staff", title: "Faculty pool", caption: "Same department, same hours — ride in together." },
];

const MARQUEE = [
  "GOOGLE ACCOUNT SIGN-IN",
  "SPLIT THE FUEL",
  "NO SURGE, EVER",
  "LIVE-TRACKED TRIPS",
  "ONE-TAP SOS",
  "CORRIDOR MATCHING",
  "STUDENTS & STAFF ONLY",
];

const STATS = [
  { num: 100, prefix: "", suffix: "%", label: "Drivers verified", note: "Licence + college ID" },
  { num: 100, prefix: "", suffix: "%", label: "Rides tracked", note: "Live GPS + SOS" },
  { num: 0, prefix: "₹", suffix: "", label: "Surge & commission", note: "Split real fuel only" },
  { num: 1, prefix: "", suffix: "", label: "Community", note: "Share the journey" },
];

/* Trust pillars — hover-expand cards (collapse/open morphism). The verified
   card carries the stats and opens widest by default. */
type TrustCard = {
  tone: string;
  icon: ReactNode;
  title: string;
  body: string;
  stats?: typeof STATS;
};
const TRUST_CARDS: TrustCard[] = [
  { tone: "navy", icon: <ShieldCheck className="size-6" />, title: "Every face is verified", body: "Every driver goes through a two-step check: a valid driving licence and a university-issued college ID verified by campus administration. Riders sign in with their Google account. Your safety starts before you even book a ride.", stats: STATS },
  { tone: "sky", icon: <Navigation className="size-6" />, title: "Live GPS on every ride", body: "From the moment you leave to the moment you arrive, your entire trip is tracked on a live map. Auto-share your ETA with emergency contacts, and both rider and driver can see the route in real time. If the car goes off-route, you'll know instantly." },
  { tone: "clay", icon: <Zap className="size-6" />, title: "One-tap SOS", body: "Press the SOS button and your live location, ride details, and an emergency alert are instantly sent to campus security and your emergency contacts. It's always accessible — one tap, no menus, no delays. Available on every active ride." },
  { tone: "sage", icon: <MessageCircle className="size-6" />, title: "Chat & video support", body: "Coordinate your pickup point, share landmarks, or reach live admin support — all inside the app without revealing your personal phone number. Messages are tied to the ride and monitored for safety, with admin moderation if needed." },
  { tone: "plum", icon: <Clock className="size-6" />, title: "Fair, capped fares", body: "Fares are calculated on real fuel cost split between riders — no surge pricing, no platform commission, no hidden fees. A fair price band gives drivers and riders room to agree, while university-set caps prevent overcharging." },
];

const TRUST_BG: Record<string, string> = {
  navy: "bg-gradient-to-br from-navy to-navy-light text-white",
  sky: "bg-[#2C4A7C] text-white",
  clay: "bg-[#C8956C] text-[#2A1A0E]",
  sage: "bg-[#3E6E5A] text-white",
  plum: "bg-[#5B4B6E] text-white",
};

/* ── Trust hover-expand row (Skiper HoverExpand morphism) ── */
function TrustExpand() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  // Trust-cards mobile carousel. loop:true + stopOnInteraction so the user's
  // swipe cleanly takes over the autoplay; align:"start" keeps the active
  // card pinned to the left so neighbours are previewed in order.
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", containScroll: "trimSnaps", skipSnaps: false },
    [EmblaAutoplay({ delay: 3800, stopOnInteraction: true, stopOnMouseEnter: true })],
  );
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", () => {
      setCurrent(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi]);

  return (
    <>
      {/* Desktop Horizontal Accordion */}
      <div
        className="mx-auto hidden w-full max-w-none gap-3.5 px-10 lg:flex lg:h-[28rem] lg:flex-row"
        onMouseLeave={() => setActive(0)}
      >
        {TRUST_CARDS.map((c, i) => {
          const isActive = active === i;
          return (
            <div
              key={c.title}
              role="button"
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn(
                "group relative min-w-0 min-h-0 cursor-pointer overflow-hidden rounded-[1.75rem] p-7 outline-none transition-[flex-grow,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isActive ? "flex-[4] shadow-2xl" : "flex-1 shadow-md",
                TRUST_BG[c.tone],
              )}
            >
              <div className="block">
                <motion.span
                  aria-hidden
                  animate={reduce ? undefined : { y: isActive ? [0, -5, 0] : 0 }}
                  transition={{ duration: 3.4, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
                  className="inline-grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur [&>svg]:size-6"
                >
                  {c.icon}
                </motion.span>
              </div>

              {/* collapsed (desktop only): title runs vertically as a spine label */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-7 flex justify-center transition-opacity duration-300",
                  !isActive ? "opacity-100" : "opacity-0",
                )}
              >
                <span
                  className="font-display text-3xl font-bold leading-none tracking-tight opacity-90"
                  style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
                >
                  {c.title}
                </span>
              </div>

              {/* expanded: full copy + stats — shown when active */}
              <div
                className={cn(
                  "transition-all duration-300 overflow-hidden",
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 hidden",
                )}
              >
                <h3 className="font-display text-2xl font-bold leading-tight mt-5">{c.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed opacity-85">{c.body}</p>
                {c.stats && (
                  <div className="mt-7 grid max-w-md grid-cols-2 gap-5">
                    {c.stats.map((s) => (
                      <div key={s.label}>
                        <div className="font-mono text-xl font-semibold text-accent sm:text-2xl lg:text-3xl">
                          <AnimatedNumber value={s.num} prefix={s.prefix} suffix={s.suffix} />
                        </div>
                        <div className="mt-0.5 text-xs font-semibold lg:text-sm">{s.label}</div>
                        <div className="text-[10px] opacity-60 lg:text-xs">{s.note}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile — Skiper 54 style: Embla carousel where the active card
          opens up (clipPath inset → 0) and the others pinch in horizontally.
          Prev/Next controls + clickable pagination dots underneath, so the
          user can advance deterministically. Mobile only — desktop uses the
          HoverExpand row above. */}
      <div className="relative lg:hidden">
        <div className="overflow-hidden w-full" ref={emblaRef} data-lenis-prevent>
          <div className="flex w-full items-stretch gap-4 px-6">
            {TRUST_CARDS.map((c, i) => {
              const isActive = current === i;
              return (
                <div
                  key={c.title}
                  className="relative min-w-0 flex-[0_0_82%] sm:flex-[0_0_62%]"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      clipPath: isActive
                        ? "inset(0 0 0 0 round 1.75rem)"
                        : "inset(10% 0 10% 0 round 1.75rem)",
                      opacity: isActive ? 1 : 0.75,
                    }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "flex h-[30rem] flex-col overflow-hidden rounded-[1.75rem] p-6 shadow-md transition-[box-shadow]",
                      isActive && "shadow-2xl",
                      TRUST_BG[c.tone],
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="inline-grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur [&>svg]:size-6">
                        {c.icon}
                      </span>
                    </div>
                    <h3 className="mt-6 font-display text-3xl font-bold leading-tight">{c.title}</h3>
                    <p className="mt-4 max-w-md text-base leading-relaxed opacity-85">{c.body}</p>
                    {c.stats && (
                      <div className="mt-auto grid grid-cols-2 gap-4 pt-4">
                        {c.stats.map((s) => (
                          <div key={s.label}>
                            <div className="font-mono text-2xl font-semibold text-accent">
                              <AnimatedNumber value={s.num} prefix={s.prefix} suffix={s.suffix} />
                            </div>
                            <div className="mt-1 text-sm font-semibold">{s.label}</div>
                            <div className="text-[11px] opacity-60">{s.note}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prev / Next */}
        <div className="mt-4 flex items-center justify-between px-6">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous card"
            className="grid size-10 place-items-center rounded-full bg-navy/10 text-navy transition-colors hover:bg-navy hover:text-white"
          >
            <ChevronLeft className="size-5" />
          </button>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-2">
            {TRUST_CARDS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to card ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-2 cursor-pointer rounded-full transition-all",
                  current === i ? "w-6 bg-navy" : "w-2 bg-navy/25",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next card"
            className="grid size-10 place-items-center rounded-full bg-navy/10 text-navy transition-colors hover:bg-navy hover:text-white"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </>
  );
}

const COMPARE: [string, boolean, boolean][] = [
  ["Verified students & staff only", true, false],
  ["Corridor + direction matching", true, false],
  ["Split fuel — no surge, no commission", true, false],
  ["Live tracking + one-tap SOS", true, false],
  ["In-ride chat & video support", true, false],
  ["Fare bargaining within a fair band", true, false],
];

function MobileHeroCarousel() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 20 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.9 }}
      className="relative mx-auto mt-14 grid w-full max-w-md grid-cols-2 gap-3 lg:hidden px-4"
    >
      <div className="h-[220px]">
        <RidePoster tone="clay" kind="scooter" eyebrow="2 wheels" title="Scooter pool" />
      </div>
      <div className="h-[220px]">
        <RidePoster tone="navy" kind="car" eyebrow="4 seats" title="Car pool" />
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [showIntro, setShowIntro] = useState(() => {
    try {
      // Explicit opt-in to re-play from a link, e.g. the user hitting "watch
      // intro" or sharing /?intro=1.
      const force = new URLSearchParams(window.location.search).get("intro");
      if (force === "0") return false;
      if (force === "1") return true;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
      // localStorage (not sessionStorage) so the film never auto-replays on
      // reload / login / new tab / logout — it plays once on the device, then
      // stays dismissed until the user clears site data or opens /?intro=1.
      if (localStorage.getItem("rm_intro_seen") === "1") return false;
      // Mark it the MOMENT we decide to show it, so navigating back to "/"
      // never replays the film — it plays only on the true first visit.
      localStorage.setItem("rm_intro_seen", "1");
      return true;
    } catch {
      return false;
    }
  });
  const endIntro = () => setShowIntro(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <>
      {/* The animated grid backdrop is now mounted app-wide in App.tsx
          (<AppBackground />) so it lives behind every route, not just here. */}
      <SmoothScroll>
        {showIntro && <IntroFilm onDone={endIntro} />}

        <LandingHeader />

        <main className="relative z-0 overflow-x-hidden text-foreground">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden pt-24 sm:pt-28">
          <CursorGlow size={420} color="var(--rm-accent)" splitColorRight="#2C4A7C" />

          {/* flanking posters (lg+) */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden lg:block">
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 30 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute left-[2.5vw] top-[46%] w-[14vw] max-w-[200px] -translate-y-1/2 -rotate-6"
            >
              <div className="h-[290px]">
                <RidePoster tone="clay" kind="scooter" eyebrow="2 wheels" title="Scooter pool" />
              </div>
            </motion.div>
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 30 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="absolute right-[2.5vw] top-[46%] w-[14vw] max-w-[200px] -translate-y-1/2 rotate-6"
            >
              <div className="h-[290px]">
                <RidePoster tone="navy" kind="car" eyebrow="4 seats" title="Car pool" />
              </div>
            </motion.div>
          </div>

          <Container size="6xl" className="relative z-10 flex flex-col items-center pb-12 text-center">
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 shadow-sm"
            >
              <ShieldCheck className="size-3.5 text-accent" />
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                LiftLoop · Share the journey
              </span>
            </motion.div>

            <h1 className="mt-6 font-display text-[clamp(1.9rem,9vw,7rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.03em] text-foreground">
              <TextRoll as="span" center animateOnView className="block">
                Share the ride.
              </TextRoll>
              <TextRoll as="span" center animateOnView className="mt-1 block text-accent">
                Skip the wait.
              </TextRoll>
            </h1>

            <motion.p
              initial={reduce ? undefined : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              The carpool network built for students and staff —
              verified faces, live-tracked trips, fares split at the pump.
              <span className="font-semibold text-foreground"> No surge. No strangers.</span>
            </motion.p>

            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-3"
            >
              <PopButton size="lg" onClick={() => navigate("/portal")}>
                <Car className="size-4" /> Find a ride
              </PopButton>
              <PopButton size="lg" variant="secondary" onClick={() => navigate("/portal")}>
                Offer a ride <ArrowRight className="size-4" />
              </PopButton>
            </motion.div>

            <motion.p
              initial={reduce ? undefined : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.6 }}
              className="mt-5 text-base font-medium text-muted-foreground"
            >
              The pool built for{" "}
              <MorphText words={["students", "staff", "faculty", "you"]} textClassName="font-extrabold" />.
            </motion.p>

            <motion.div
              initial={reduce ? undefined : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
            >
              {[
                { icon: <ShieldCheck className="size-4 text-success" />, t: "Verified campus ID" },
                { icon: <Navigation className="size-4 text-accent" />, t: "Live GPS + SOS" },
                { icon: <IndianRupee className="size-4 text-info" />, t: "No surge, no commission" },
              ].map((c, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  {c.icon}
                  {c.t}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: 16 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="mt-8 w-full max-w-2xl"
            >
              <HeroSearch />
            </motion.div>

            <MobileHeroCarousel />
          </Container>

          <div className="mt-4 w-full border-y border-border bg-navy py-3.5">
            <Marquee
              speed={34}
              items={MARQUEE.map((m) => (
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                  {m}
                </span>
              ))}
            />
          </div>
        </section>

        {/* ── LIVE MAP — full-bleed campus band ── */}
        <section className="relative w-full">
          <LiveMap className="h-[52vh] min-h-[380px] w-full border-b border-border" />
        </section>

        {/* ── THE DAILY WAIT — heading + crowd in ONE compact panel ── */}
        <section className="relative w-full overflow-hidden">
          <div className="relative w-full pb-[18rem] pt-16 sm:pb-[20rem] sm:pt-24 lg:pb-[24rem]">
            <CrowdCanvas className="absolute inset-0" />
            {/* top fade so the heading reads over the crowd */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/95 via-white/50 to-transparent" />
            <div className="relative z-10 px-6 text-center">
              <Eyebrow>The daily wait</Eyebrow>
              <Reveal>
                <h2 className="mx-auto mt-3 max-w-4xl font-display text-[clamp(1.75rem,5vw,3.5rem)] font-extrabold leading-[1.03] tracking-tight text-foreground">
                  Everyone&apos;s on the same road.
                  <span className="text-accent"> Why ride it alone?</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
                  Hundreds leave the same colonies for the same gate every morning. Pool the trip and
                  the road clears — for you and the whole campus.
                </p>
              </Reveal>
              <Reveal delay={0.16}>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <PopButton onClick={() => navigate("/portal")}>Start pooling</PopButton>
                  <VideoReveal src="/launch.mp4" poster="/launch-poster.jpg">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-[15px] font-semibold text-foreground transition-colors hover:border-accent">
                      <Play className="size-4 fill-current" /> Meet LiftLoop
                    </span>
                  </VideoReveal>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── A POOL FOR EVERY TRIP — full-bleed colored carousel (moved up) ── */}
        <section className="overflow-hidden py-20 sm:py-24">
          <Container size="7xl">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="However you travel"
                title="A pool for every kind of trip."
                description="Car, scooter, bike or the weekend society run — hover a card on desktop, swipe on mobile."
                className="mb-12"
              />
            </Reveal>
          </Container>
          <Reveal>
            <HoverExpandRides slides={RIDE_SLIDES} />
          </Reveal>
        </section>

        {/* ── TRUST — rebuilt: big navy statement + animated colored pillars ── */}
        <section id="safety" className="py-20 sm:py-28">
          <Container size="7xl">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="Safety by design"
                title="Trust is the whole point."
                description="A university-governed network where every safeguard is on by default — not an upsell."
                className="mb-12"
              />
            </Reveal>
          </Container>

          <Reveal>
            <TrustExpand />
          </Reveal>
        </section>

        {/* ── COMPARISON ── */}
        <section id="compare" className="py-20 sm:py-28">
          <Container size="5xl">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="Why LiftLoop"
                title="Not a cab app with a student sticker."
                className="mb-12"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Panel inset="none" className="overflow-hidden">
                <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center bg-navy px-5 py-4 text-white sm:grid-cols-[2fr_1fr_1fr] sm:px-8">
                  <span className="font-display text-sm font-bold uppercase tracking-wide text-accent">
                    LiftLoop vs. cab apps
                  </span>
                  <span className="text-center font-display text-sm font-bold">LiftLoop</span>
                  <span className="text-center text-sm font-semibold text-white/60">Cab apps</span>
                </div>
                {COMPARE.map((row, i) => (
                  <motion.div
                    key={i}
                    initial={reduce ? undefined : { opacity: 0, x: -18 }}
                    whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "group grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center px-5 py-4 transition-colors hover:bg-accent-soft/50 sm:grid-cols-[2fr_1fr_1fr] sm:px-8",
                      i % 2 === 1 && "bg-muted/50",
                    )}
                  >
                    <span className="pr-3 text-sm font-medium text-foreground">{row[0]}</span>
                    <span className="flex justify-center">
                      <motion.span
                        initial={reduce ? undefined : { scale: 0, rotate: -30 }}
                        whileInView={reduce ? undefined : { scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 320, damping: 16, delay: i * 0.07 + 0.15 }}
                        className="grid size-7 place-items-center rounded-full bg-success-soft text-success"
                      >
                        <Check className="size-4" strokeWidth={3} />
                      </motion.span>
                    </span>
                    <span className="flex justify-center text-muted-foreground">
                      {row[2] ? <Check className="size-5 text-success" /> : <span className="text-lg">—</span>}
                    </span>
                  </motion.div>
                ))}
              </Panel>
            </Reveal>
          </Container>
        </section>

        {/* ── HOW IT WORKS — 3D tilt steps, connected (moved near the bottom) ── */}
        <section id="how" className="py-20 sm:py-28">
          <Container size="wide">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="4 steps · 60 seconds"
                title="Your first ride is minutes away."
                description="Move your cursor over a step — no app-store detour, just verify and go."
                className="mb-14"
              />
            </Reveal>
            <div className="relative">
              {/* connecting line (lg) */}
              <div
                aria-hidden
                className="absolute left-0 right-0 top-[46px] hidden h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent lg:block"
              />
              <RevealGroup className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((s) => (
                  <RevealItem key={s.n}>
                    <TiltCard className="group h-full [transform-style:preserve-3d]">
                      <div className="relative h-full overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl">
                        {/* giant watermark number */}
                        <span className="pointer-events-none absolute -right-3 -top-6 select-none font-display text-[7rem] font-extrabold leading-none text-muted/60 transition-colors duration-300 group-hover:text-accent-soft">
                          {s.n}
                        </span>
                        {/* hover gradient wash */}
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 opacity-0 transition-opacity duration-300 group-hover:from-accent/5 group-hover:to-transparent group-hover:opacity-100" />
                        <motion.span
                          aria-hidden
                          animate={reduce ? undefined : { y: [0, -5, 0] }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                          className="relative grid size-13 place-items-center rounded-2xl bg-navy text-white shadow-md transition-colors group-hover:bg-accent group-hover:text-navy [&>svg]:size-6"
                        >
                          {s.icon}
                        </motion.span>
                        <h3 className="relative mt-6 font-display text-lg font-bold text-foreground">{s.title}</h3>
                        <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                      </div>
                    </TiltCard>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </Container>
        </section>

        {/* ── SEE IT IN MOTION — branded thumbnail, product launch film ── */}
        <section className="py-16 sm:py-20">
          <Container size="6xl">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="See it in motion"
                title="Your campus. Your LiftLoop."
                className="mb-10"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <VideoReveal src="/launch.mp4" poster="/launch-poster.jpg" className="group block" hint={false}>
                <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-navy to-navy-light shadow-lg">
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-navy shadow-xl transition-transform group-hover:scale-110">
                        <Play className="size-6 fill-current" />
                      </span>
                      <p className="mt-4 font-display text-xl font-bold text-white">
                        Lift<span className="text-accent">Loop</span> — the film
                      </p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-white/50">
                        Your campus, carpooled
                      </p>
                    </div>
                  </div>
                </div>
              </VideoReveal>
            </Reveal>
          </Container>
        </section>

        {/* ── CLOSING CTA ── (same bg-navy as footer, no bottom padding so
             it blends straight into the footer below — reads as one block) */}
        <section className="relative overflow-hidden bg-navy pt-20 pb-14 text-center text-white sm:pt-24 sm:pb-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <RevealGroup className="relative z-10">
              <RevealItem>
                <h2 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                  Your ride is <span className="text-accent">waiting.</span>
                </h2>
              </RevealItem>
              <RevealItem>
                <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
                  Sign in to your LiftLoop account and start sharing rides across campus in minutes.
                </p>
              </RevealItem>
              <RevealItem>
                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <PopButton variant="accent" size="lg" onClick={() => navigate("/portal")}>
                    Choose your portal <ArrowRight className="size-4" />
                  </PopButton>
                  <PopButton variant="secondary" size="lg" onClick={() => navigate("/rides")}>
                    Browse rides
                  </PopButton>
                </div>
              </RevealItem>
            </RevealGroup>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <AnimatedFooter>
          <div className="flex items-center gap-2.5">
            <Logo size={32} light />
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Lift<span className="text-accent">Loop</span>
            </span>
            <span className="ml-3 text-sm text-white/55">© {year} · LiftLoop</span>
          </div>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <SocialFlipButton />
            <nav className="flex gap-6 text-sm text-white/70">
              <Link to="/privacy" className="transition-colors hover:text-accent">
                Privacy
              </Link>
              <Link to="/terms" className="transition-colors hover:text-accent">
                Terms
              </Link>
              <a href="/portal" className="transition-colors hover:text-accent">
                Contact
              </a>
            </nav>
          </div>
        </AnimatedFooter>
        </main>
      </SmoothScroll>
    </>
  );
}
