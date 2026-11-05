import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useNavigate } from "@/lib/navigation";

import { useAuthStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/primitives";

export default function PendingAdmin() {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  }

  return (
    <div className="grid min-h-dvh place-items-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-9 text-center shadow-md backdrop-blur-lg"
      >
        <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-warning-soft text-warning">
          <ShieldAlert className="size-9" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-foreground">Admin approval pending</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Your account is waiting for approval from an existing administrator. You'll be notified once your
          admin privileges are granted.
        </p>
        <Button variant="secondary" className="mt-8 w-full" onClick={handleLogout} icon={<ArrowLeft className="size-4" />}>
          Return to login
        </Button>
      </motion.div>
    </div>
  );
}
