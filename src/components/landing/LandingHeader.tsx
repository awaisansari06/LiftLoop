"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/navigation";

import Logo from "@/components/common/Logo";
import { PopButton } from "@/components/ui/pop-button";
import { TextRoll } from "@/components/ui/text-roll";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#safety", label: "Safety" },
  { href: "#compare", label: "Why LiftLoop" },
];

export function LandingHeader() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-lg"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            Lift<span className="text-accent">Loop</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <TextRoll className="text-sm">{n.label}</TextRoll>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <PopButton
            variant="primary"
            size="sm"
            onClick={() => navigate("/portal")}
            className="hidden sm:inline-flex"
          >
            Sign in <ArrowRight className="size-3.5" />
          </PopButton>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-full border border-border text-foreground md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-background/95 backdrop-blur-lg md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-semibold text-foreground hover:bg-muted"
                >
                  {n.label}
                </a>
              ))}
              <PopButton
                variant="primary"
                size="md"
                onClick={() => {
                  setOpen(false);
                  navigate("/portal");
                }}
                className="mt-1 w-full"
              >
                <Smartphone className="size-4" /> Sign in
              </PopButton>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export default LandingHeader;
