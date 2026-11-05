import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, Mail, Phone, Save, ShieldCheck, User } from "lucide-react";

import { useAuthStore } from "@/hooks/useStore";
import { updateProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { roleLabel } from "@/lib/roles";
import { Field } from "@/components/ui/smooth-input";
import { Button, Container, PageShell, Panel } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/scroll-reveal";

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [emergencyContact, setEmergencyContact] = useState(user?.emergency_contact_phone || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let pct = 20;
      if (fullName.trim()) pct += 20;
      if (phone.trim()) pct += 20;
      if (emergencyContact.trim()) pct += 20;
      if (user.profile_photo) pct += 20;
      const updated = await updateProfile(user.id, {
        full_name: fullName,
        phone,
        emergency_contact_phone: emergencyContact,
        profile_complete: pct,
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to update", e);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const updated = await updateProfile(user.id, { profile_photo: publicUrl });
      setUser(updated);
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;
  const completion = user.profile_complete || 0;

  return (
    <PageShell>
      <Container size="5xl" className="max-w-2xl">
        <h1 className="mb-6 flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
          <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
            <User className="size-5" />
          </span>
          My profile
        </h1>

        <Reveal>
          <Panel inset="lg">
            {/* avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <span className="grid size-24 place-items-center overflow-hidden rounded-3xl bg-muted text-navy ring-4 ring-card">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt={user.full_name || ""} className="size-full object-cover" />
                  ) : (
                    <User className="size-10" />
                  )}
                </span>
                <label className="absolute -bottom-1 -right-1 grid size-9 cursor-pointer place-items-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-foreground">{user.full_name || "User"}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" /> {user.email}
              </p>
            </div>

            {/* form */}
            <div className="mt-7 space-y-4">
              <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} icon={<User className="size-4" />} />
              <Field label="Email" value={user.email} disabled icon={<Mail className="size-4" />} />
              <Field
                label="Phone number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                icon={<Phone className="size-4" />}
              />
              <Field
                label="Emergency contact (for SOS)"
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                icon={<ShieldCheck className="size-4" />}
              />
            </div>

            <Button
              className="mt-6 w-full"
              variant={saved ? "accent" : "primary"}
              onClick={handleSave}
              loading={saving}
              icon={!saving ? saved ? <ShieldCheck className="size-4" /> : <Save className="size-4" /> : undefined}
            >
              {saved ? "Saved!" : "Save changes"}
            </Button>

            {/* completion */}
            <div className="mt-6">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile completion</span>
                <span className="font-mono font-semibold text-accent-strong">{completion}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completion}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-accent"
                />
              </div>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.1}>
          <Panel className="mt-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">University verified · {roleLabel(user.user_type)}</p>
              <p className="text-xs text-muted-foreground">Your account is verified via your JC Bose UST email.</p>
            </div>
          </Panel>
        </Reveal>
      </Container>
    </PageShell>
  );
}
