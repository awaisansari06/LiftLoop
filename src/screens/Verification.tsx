import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Navigate } from "@/lib/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bike,
  Bus,
  Camera,
  Car,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Palette,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { useAuthStore } from "@/hooks/useStore";
import { submitVerification, getVerification } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { DriverVerification } from "@/types";
import { Field } from "@/components/ui/smooth-input";
import {
  Badge,
  Button,
  Container,
  Eyebrow,
  PageShell,
  Panel,
  Spinner,
  type BadgeTone,
} from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

/* ── Constants ─────────────────────────────────────────────── */
const VEHICLES = [
  { key: "car", label: "Car", icon: <Car className="size-6" />, seats: "2–4 seats" },
  { key: "bike", label: "Bike", icon: <Bike className="size-6" />, seats: "1 pillion" },
  { key: "auto", label: "Auto", icon: <Bus className="size-6" />, seats: "2–3 seats" },
];

const COLORS = [
  { key: "white", label: "White", hex: "#F5F5F5" },
  { key: "black", label: "Black", hex: "#18392F" },
  { key: "silver", label: "Silver", hex: "#C0C0C0" },
  { key: "red", label: "Red", hex: "#D35D5D" },
  { key: "blue", label: "Blue", hex: "#3D6AA6" },
  { key: "grey", label: "Grey", hex: "#647268" },
  { key: "other", label: "Other", hex: "linear-gradient(135deg,#B8E568,#3D6AA6)" },
];

const STATUS_META: Record<string, { tone: BadgeTone; label: string; icon: React.ReactNode; color: string }> = {
  pending: { tone: "warning", label: "Under review", icon: <Clock className="size-5" />, color: "text-warning" },
  verified: { tone: "success", label: "Verified", icon: <CheckCircle2 className="size-5" />, color: "text-success" },
  rejected: { tone: "danger", label: "Rejected", icon: <XCircle className="size-5" />, color: "text-danger" },
};

const STEPS = [
  { n: 0, label: "Licence", icon: <FileText className="size-4" /> },
  { n: 1, label: "Vehicle", icon: <Car className="size-4" /> },
  { n: 2, label: "Documents", icon: <Camera className="size-4" /> },
  { n: 3, label: "Review", icon: <CheckCircle2 className="size-4" /> },
];

/* ── AI verification result shape (matches the verify-document edge
      function's response envelope) ──────────────────────────────── */
export interface AiVerifyResult {
  doc_type: string;
  status: "verified" | "needs_review" | "rejected";
  confidence: number;
  extracted: {
    name?: string | null;
    date_of_birth?: string | null;
    number?: string | null;
    address?: string | null;
    issue_date?: string | null;
    expiry_date?: string | null;
    vehicle_type?: string | null;
    vehicle_number?: string | null;
  };
  face_match: { match: boolean; confidence: number } | null;
  authenticity_signals: {
    has_govt_hologram?: boolean;
    font_consistent?: boolean;
    tampering_detected?: boolean;
    photo_glare?: "none" | "minor" | "severe";
  };
  issues: string[];
  verified_at: string;
}

/** Read a File as base64 (no data: prefix). */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/* ── File upload helper ────────────────────────────────────── */
async function uploadDoc(userId: string, file: File, slug: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${slug}.${ext}`;
  const { error } = await supabase.storage
    .from("driver-documents")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("driver-documents").getPublicUrl(path);
  return data.publicUrl;
}

/* ── DocUpload component ───────────────────────────────────── */
function DocUpload({
  label,
  hint,
  file,
  existingUrl,
  onFile,
  onClear,
  accept = "image/*",
  icon,
}: {
  label: string;
  hint?: string;
  file: File | null;
  existingUrl?: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
  accept?: string;
  icon?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : existingUrl || null;

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}

      {preview ? (
        <div className="group relative overflow-hidden rounded-2xl border border-accent/40 bg-accent-soft/20">
          <img
            src={preview}
            alt={label}
            className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid size-10 place-items-center rounded-xl bg-white/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-white"
            >
              <Camera className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClear}
              className="grid size-10 place-items-center rounded-xl bg-white/90 text-danger shadow-md backdrop-blur transition-colors hover:bg-white"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-lg bg-success/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Check className="size-3" />
            {file ? "New file" : "Uploaded"}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-10 text-center transition-colors hover:border-accent hover:bg-accent-soft/20"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Upload className="size-5" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            Click or drag to upload
          </span>
          <span className="text-xs text-muted-foreground/70">
            JPG, PNG or PDF · Max 10 MB
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export default function Verification() {
  const { user } = useAuthStore();
  const reduce = useReducedMotion();
  const [verification, setVerification] = useState<DriverVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  // If admin visits this page, redirect to admin panel's verify tab
  if (user?.user_type === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Form fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("white");

  // Files
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  // AI OCR result from the verify-document edge function (Gemini 2.0 Flash).
  const [aiResult, setAiResult] = useState<AiVerifyResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const v = await getVerification(user.id);
        if (v) {
          setVerification(v);
          setLicenseNumber(v.license_number || "");
          setCollegeId(v.college_id || "");
          setVehicleType(v.vehicle_type || "car");
          setVehicleNumber(v.vehicle_number || "");
          setVehicleModel(v.vehicle_model || "");
          setVehicleColor(v.vehicle_color || "white");
          // If already submitted, jump to review
          if (v.verification_status === "pending" || v.verification_status === "verified") {
            setStep(3);
          }
        }
      } catch (e) {
        console.error("Failed to load verification:", e);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !licenseNumber) return;
    setSubmitting(true);
    try {
      // Upload files in parallel
      const uploads = await Promise.all([
        licenseFile ? uploadDoc(user.id, licenseFile, "license") : null,
        vehicleFile ? uploadDoc(user.id, vehicleFile, "vehicle") : null,
        idCardFile ? uploadDoc(user.id, idCardFile, "id-card") : null,
      ]);

      const v = await submitVerification({
        user_id: user.id,
        license_number: licenseNumber,
        college_id: collegeId || undefined,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber,
        vehicle_model: vehicleModel || undefined,
        vehicle_color: vehicleColor || undefined,
        license_photo: uploads[0] || verification?.license_photo || undefined,
        vehicle_photo: uploads[1] || verification?.vehicle_photo || undefined,
        id_card_photo: uploads[2] || verification?.id_card_photo || undefined,
      });

      // Documents remain pending until an administrator reviews them.
      setVerification(v);
      setStep(3);
    } catch (e) {
      console.error("Submission failed", e);
      alert("Submission failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = (s: number) => {
    if (s === 0) return licenseNumber.length >= 5;
    if (s === 1) return vehicleNumber.length >= 4;
    if (s === 2) return licenseFile || verification?.license_photo;
    return true;
  };

  const nextStep = () => {
    if (step < 3 && canAdvance(step)) setStep(step + 1);
  };
  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  if (loading)
    return (
      <PageShell className="grid place-items-center">
        <Spinner className="size-8" />
      </PageShell>
    );

  const isVerified = verification?.verification_status === "verified";
  const isRejected = verification?.verification_status === "rejected";
  const isPending = verification?.verification_status === "pending";
  const statusMeta = verification ? STATUS_META[verification.verification_status] : null;

  return (
    <PageShell>
      <Container size="5xl" className="max-w-2xl">
        {/* Header */}
        <Reveal>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow className="mb-2">Service · LiftLoop</Eyebrow>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Driver <span className="text-accent">verification</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                Submit your documents to start offering rides to the campus community.
              </p>
            </div>
            {statusMeta && (
              <Badge tone={statusMeta.tone} icon={statusMeta.icon} className="shrink-0 mt-1">
                {statusMeta.label}
              </Badge>
            )}
          </div>
        </Reveal>

        {/* Rejection banner */}
        {isRejected && verification?.rejection_reason && (
          <Reveal delay={0.05}>
            <Panel className="mt-5 flex items-start gap-3 border-danger/30 bg-danger-soft/30">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
                <AlertTriangle className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-danger">Verification rejected</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {verification.rejection_reason}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setStep(0)}
                  icon={<ArrowLeft className="size-3.5" />}
                >
                  Re-submit documents
                </Button>
              </div>
            </Panel>
          </Reveal>
        )}

        {/* Verified success */}
        {isVerified && (
          <Reveal delay={0.05}>
            <Panel className="mt-5 border-success/30 bg-success-soft/30">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
                  <CheckCircle2 className="size-6" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">You're verified!</p>
                  <p className="text-sm text-muted-foreground">
                    You can now create and offer rides to the campus community.
                  </p>
                </div>
              </div>

              {/* Document summary */}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Licence", val: verification.license_number, img: verification.license_photo },
                  { label: "Vehicle", val: `${verification.vehicle_type?.toUpperCase()} · ${verification.vehicle_number}`, img: verification.vehicle_photo },
                  { label: "College ID", val: verification.college_id || "—", img: verification.id_card_photo },
                ].map((d) => (
                  <div key={d.label} className="overflow-hidden rounded-xl border border-border">
                    {d.img ? (
                      <img src={d.img} alt={d.label} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="grid h-24 place-items-center bg-muted text-muted-foreground">
                        <ImageIcon className="size-6" />
                      </div>
                    )}
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-muted-foreground">{d.label}</p>
                      <p className="truncate text-sm font-medium text-foreground">{d.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>
        )}

        {/* Pending status */}
        {isPending && step === 3 && (
          <Reveal delay={0.05}>
            {/* AI OCR result (Gemini) — shown as soon as the model responds */}
            <AiVerifyResultCard loading={aiLoading} result={aiResult} />

            <Panel className="mt-5 border-warning/30 bg-warning-soft/30">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-warning-soft text-warning">
                  <Clock className="size-6" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Documents under review</p>
                  <p className="text-sm text-muted-foreground">
                    An admin will review your submission shortly. You'll be notified once verified.
                  </p>
                </div>
              </div>

              {/* Submitted docs summary */}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Licence", val: verification?.license_number, img: verification?.license_photo },
                  { label: "Vehicle", val: `${verification?.vehicle_type?.toUpperCase() || "—"} · ${verification?.vehicle_number || "—"}`, img: verification?.vehicle_photo },
                  { label: "College ID", val: verification?.college_id || "—", img: verification?.id_card_photo },
                ].map((d) => (
                  <div key={d.label} className="overflow-hidden rounded-xl border border-border">
                    {d.img ? (
                      <img src={d.img} alt={d.label} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="grid h-24 place-items-center bg-muted text-muted-foreground">
                        <ImageIcon className="size-6" />
                      </div>
                    )}
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-muted-foreground">{d.label}</p>
                      <p className="truncate text-sm font-medium text-foreground">{d.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setStep(0)}
                icon={<ArrowLeft className="size-3.5" />}
              >
                Edit documents
              </Button>
            </Panel>
          </Reveal>
        )}

        {/* ── WIZARD (only when filling / re-submitting) ── */}
        {step < 3 && (
          <Reveal delay={0.1}>
            {/* Step indicator */}
            <div className="mt-6 flex items-center gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => {
                    // Allow going back to any previous step, forward only if valid
                    if (i <= step || (i === step + 1 && canAdvance(step))) setStep(i);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors",
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-success-soft text-success"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {i < step ? (
                    <Check className="size-3.5" />
                  ) : (
                    s.icon
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Step content */}
            <Panel inset="lg" className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={reduce ? undefined : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  {/* STEP 0: Licence details */}
                  {step === 0 && (
                    <>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">Licence details</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Enter your driving licence number and college ID for verification.
                        </p>
                      </div>

                      <Field
                        label="Driving licence number *"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                        placeholder="HR-XXXXXXXXXX"
                        icon={<FileText className="size-4" />}
                        required
                      />

                      <Field
                        label="College / University ID"
                        value={collegeId}
                        onChange={(e) => setCollegeId(e.target.value)}
                        placeholder="2024/CSE/001"
                        icon={<GraduationCap className="size-4" />}
                      />
                    </>
                  )}

                  {/* STEP 1: Vehicle details */}
                  {step === 1 && (
                    <>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">Vehicle details</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tell us about the vehicle you'll use for rides.
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-foreground">Vehicle type</label>
                        <div className="grid grid-cols-3 gap-3">
                          {VEHICLES.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => setVehicleType(v.key)}
                              className={cn(
                                "flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-center transition-all",
                                vehicleType === v.key
                                  ? "border-accent bg-accent-soft text-accent-strong shadow-sm"
                                  : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground",
                              )}
                            >
                              {v.icon}
                              <span className="text-sm font-semibold">{v.label}</span>
                              <span className="text-[11px] text-muted-foreground">{v.seats}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <Field
                        label="Vehicle number *"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="HR-XX-XX-XXXX"
                        icon={<Car className="size-4" />}
                        required
                      />

                      <Field
                        label="Vehicle model"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="e.g. Honda Activa 6G"
                        icon={<Car className="size-4" />}
                      />

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-foreground">
                          <Palette className="mr-1.5 inline size-4" />
                          Vehicle color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {COLORS.map((c) => (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => setVehicleColor(c.key)}
                              className={cn(
                                "flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all",
                                vehicleColor === c.key
                                  ? "border-accent bg-accent-soft text-accent-strong"
                                  : "border-border text-muted-foreground hover:border-accent/40",
                              )}
                            >
                              <span
                                className="size-4 rounded-full border border-border"
                                style={{ background: c.hex }}
                              />
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* STEP 2: Document uploads */}
                  {step === 2 && (
                    <>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">Upload documents</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Clear photos of your licence, vehicle, and college ID help us verify you faster.
                        </p>
                      </div>

                      <DocUpload
                        label="Driving licence photo *"
                        hint="Front side of your driving licence showing name, number, and validity."
                        file={licenseFile}
                        existingUrl={verification?.license_photo}
                        onFile={setLicenseFile}
                        onClear={() => setLicenseFile(null)}
                        icon={<FileText className="size-4" />}
                      />

                      <DocUpload
                        label="Vehicle photo"
                        hint="Clear photo showing the full vehicle with number plate visible."
                        file={vehicleFile}
                        existingUrl={verification?.vehicle_photo}
                        onFile={setVehicleFile}
                        onClear={() => setVehicleFile(null)}
                        icon={<Car className="size-4" />}
                      />

                      <DocUpload
                        label="College / University ID"
                        hint="Your student or staff ID card."
                        file={idCardFile}
                        existingUrl={verification?.id_card_photo}
                        onFile={setIdCardFile}
                        onClear={() => setIdCardFile(null)}
                        icon={<GraduationCap className="size-4" />}
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  onClick={prevStep}
                  disabled={step === 0}
                  icon={<ArrowLeft className="size-4" />}
                >
                  Back
                </Button>

                {step < 2 ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canAdvance(step)}
                    icon={<ArrowRight className="size-4" />}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    onClick={handleSubmit}
                    loading={submitting}
                    disabled={!canAdvance(step)}
                    icon={!submitting ? <ShieldCheck className="size-4" /> : undefined}
                  >
                    {submitting ? "Uploading…" : verification ? "Re-submit" : "Submit for verification"}
                  </Button>
                )}
              </div>
            </Panel>
          </Reveal>
        )}

        {/* Timeline */}
        <Reveal delay={0.15}>
          <div className="mt-8">
            <Eyebrow className="mb-4">Verification process</Eyebrow>
            <div className="space-y-0">
              {[
                {
                  done: !!verification,
                  active: !verification,
                  label: "Submit documents",
                  desc: "Licence, vehicle details, and college ID",
                },
                {
                  done: isPending || isVerified,
                  active: !!verification && !isPending && !isVerified && !isRejected,
                  label: "Admin review",
                  desc: "A university admin will verify your documents",
                },
                {
                  done: isVerified,
                  active: isPending,
                  label: "Start offering rides",
                  desc: "Create rides and earn by sharing your commute",
                },
              ].map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors",
                        t.done
                          ? "border-success bg-success text-white"
                          : t.active
                            ? "border-accent bg-accent-soft text-accent-strong"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {t.done ? <Check className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </span>
                    {i < 2 && (
                      <span
                        className={cn(
                          "my-0.5 h-8 w-0.5 rounded-full",
                          t.done ? "bg-success" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={cn("text-sm font-semibold", t.done ? "text-success" : "text-foreground")}>
                      {t.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </PageShell>
  );
}

/* ── AI verification result card ───────────────────────────── */
function AiVerifyResultCard({ loading, result }: { loading: boolean; result: AiVerifyResult | null }) {
  if (loading) {
    return (
      <Panel className="mt-5 border-info/30 bg-info-soft/30">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-info text-white">
            <Loader2 className="size-5 animate-spin" />
          </span>
          <div>
            <p className="font-semibold text-foreground">AI is reading your licence…</p>
            <p className="text-sm text-muted-foreground">
              Gemini 2.0 Flash is extracting fields and checking for tampering. This usually takes 2–4 seconds.
            </p>
          </div>
        </div>
      </Panel>
    );
  }
  if (!result) return null;

  const tone: BadgeTone =
    result.status === "verified" ? "success" : result.status === "rejected" ? "danger" : "warning";
  const pct = Math.round(result.confidence * 100);
  const ex = result.extracted || {};
  const sig = result.authenticity_signals || {};
  const field = (label: string, val?: string | null) =>
    val
      ? (
        <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <span className="truncate text-right font-mono text-sm font-semibold text-foreground">{val}</span>
        </div>
      )
      : null;

  return (
    <Panel className="mt-5 border-accent/40 bg-accent-soft/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-white">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="flex items-center gap-2 font-semibold text-foreground">
              AI pre-check <Badge tone={tone}>{result.status.replace("_", " ")}</Badge>
            </p>
            <p className="text-sm text-muted-foreground">
              Gemini 2.0 Flash extracted the following from your licence.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-extrabold text-foreground">{pct}%</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">confidence</p>
        </div>
      </div>

      {/* extracted fields */}
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        {field("Name", ex.name)}
        {field("DOB", ex.date_of_birth)}
        {field("Licence #", ex.number)}
        {field("Issued", ex.issue_date)}
        {field("Expires", ex.expiry_date)}
        {field("Vehicle class", ex.vehicle_type)}
        {field("Vehicle #", ex.vehicle_number)}
        {field("Address", ex.address)}
      </div>

      {/* authenticity signals */}
      {(sig.has_govt_hologram !== undefined || sig.tampering_detected !== undefined) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone={sig.has_govt_hologram ? "success" : "neutral"}>
            {sig.has_govt_hologram ? "✓ Hologram" : "No hologram"}
          </Badge>
          <Badge tone={sig.font_consistent ? "success" : "warning"}>
            {sig.font_consistent ? "✓ Fonts consistent" : "Font inconsistency"}
          </Badge>
          <Badge tone={sig.tampering_detected ? "danger" : "success"}>
            {sig.tampering_detected ? "⚠ Tampering" : "✓ No tampering"}
          </Badge>
          {sig.photo_glare && sig.photo_glare !== "none" && (
            <Badge tone="warning">Glare: {sig.photo_glare}</Badge>
          )}
        </div>
      )}

      {/* issues */}
      {result.issues.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl border border-warning/40 bg-warning-soft/50 p-3 text-sm text-foreground">
          {result.issues.slice(0, 5).map((iss, i) => (
            <li key={i} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>{iss}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
