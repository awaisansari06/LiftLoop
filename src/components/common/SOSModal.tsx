import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert, X } from "lucide-react";

import { useAuthStore } from "../../hooks/useStore";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const QUICK_CHATS = ["My car broke down.", "I am feeling unsafe.", "Driver is taking wrong route.", "Medical emergency."];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rideId?: string;
}

export default function SOSModal({ isOpen, onClose, rideId }: Props) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "LiftLoop Safety Assistant. If this is an emergency, press the SOS button immediately." },
  ]);
  const [loadingSOS, setLoadingSOS] = useState(false);

  if (!isOpen) return null;

  const handleQuickChat = (text: string) => {
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "ai", text: "This chat is local guidance only. Press SOS to record an alert for LiftLoop administrators. No emergency services are dispatched." }]);
    }, 1000);
  };

  const triggerEmergencySOS = async () => {
    setLoadingSOS(true);
    try {
      let locationText = "Location unavailable";
      let lat: number | null = null;
      let lng: number | null = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          locationText = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        } catch {
          /* location denied */
        }
      }
      const {error} = await supabase.from("sos_alerts").insert({
        user_id: user?.id,
        ride_id: rideId || null,
        location: lat && lng ? { lat, lng } : null,
        message: "Emergency SOS triggered",
        status: "active",
      });
      if(error) throw error;
      setMessages((prev) => [...prev, { sender: "ai", text: "Alert recorded in the LiftLoop admin inbox. SMS and emergency-service dispatch are not configured. Contact emergency services directly if you need immediate help." }]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "SOS failed. Call 112 directly.");
    } finally {
      setLoadingSOS(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-navy/55 p-5 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-danger/20 bg-danger-soft px-5 py-4">
            <div className="flex items-center gap-2.5 text-danger">
              <TriangleAlert className="size-6" />
              <h3 className="font-display text-lg font-bold">Safety assistant</h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-danger hover:opacity-70">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/40 p-5">
            {messages.map((m, i) => (
              <div key={i} className={cn("max-w-[85%]", m.sender === "user" ? "self-end" : "self-start")}>
                <div
                  className={cn(
                    "px-3.5 py-2.5 text-sm leading-relaxed",
                    m.sender === "user"
                      ? "rounded-[16px_16px_4px_16px] bg-primary text-primary-foreground"
                      : "rounded-[16px_16px_16px_4px] border border-border bg-card text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-card p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {QUICK_CHATS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickChat(c)}
                  className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent"
                >
                  {c}
                </button>
              ))}
            </div>
            <Button variant="danger" className="w-full" onClick={triggerEmergencySOS} loading={loadingSOS} icon={!loadingSOS ? <TriangleAlert className="size-5" /> : undefined}>
              {loadingSOS ? "Sending SOS…" : "Trigger emergency SOS"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
