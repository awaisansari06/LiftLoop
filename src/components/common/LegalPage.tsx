import { Link } from "@/lib/navigation";
import { ArrowLeft } from "lucide-react";

import Logo from "./Logo";
import { Container } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/scroll-reveal";

export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { t: string; body: string }[];
}) {
  return (
    <div className="min-h-dvh bg-white/40">
      <nav className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <Container size="6xl" className="flex items-center gap-3 py-4">
          <Link to="/" className="grid size-9 place-items-center rounded-xl bg-muted text-foreground hover:bg-muted2">
            <ArrowLeft className="size-5" />
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
              Lift<span className="text-accent">Loop</span>
            </span>
          </Link>
        </Container>
      </nav>
      <Container size="4xl" className="py-12 sm:py-16">
        <Reveal>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last updated: {updated}</p>
        </Reveal>
        <RevealGroup className="mt-10 space-y-8" stagger={0.06}>
          {sections.map((s) => (
            <RevealItem key={s.t} as="section">
              <h2 className="font-display text-lg font-bold text-foreground">{s.t}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>
    </div>
  );
}

export default LegalPage;
