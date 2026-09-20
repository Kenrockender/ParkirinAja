"use client";
/**
 * ProfileView — identity (with v26 avatar upload), garage, preferences.
 * v25: full profile editing (name/email/phone/NIM with validation).
 */
import React from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Camera,
  Car,
  Languages,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import { useParkir } from "@/lib/store";
import { rupiah, tr, type Vehicle } from "@/lib/parking-data";
import { VehicleModal } from "./VehicleModal";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d[\d\s-]{7,14}$/;
const NIM_RE = /^\d{8,10}$/;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ProfileView() {
  const lang = useParkir((s) => s.lang);
  const setLang = useParkir((s) => s.setLang);
  const user = useParkir((s) => s.user);
  const vehicles = useParkir((s) => s.vehicles);
  const walletBalance = useParkir((s) => s.walletBalance);
  const reservations = useParkir((s) => s.reservations);
  const signOut = useParkir((s) => s.signOut);
  const removeVehicle = useParkir((s) => s.removeVehicle);
  const setAvatar = useParkir((s) => s.setAvatar);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  /** null vehicle → add mode; vehicle object → edit mode */
  const [vehicleModal, setVehicleModal] = React.useState<{
    open: boolean;
    vehicle?: Vehicle;
  }>({ open: false });
  const [confirmRemove, setConfirmRemove] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => setMounted(true), []);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const own = reservations.filter((r) => r.driverName === user.name);
  const sessions = own.filter((r) => ["COMPLETED", "CHECKED_IN"].includes(r.status)).length;
  // v22 — personal spend = service fees + late fines of own sessions
  const spend = own
    .filter((r) => r.status === "COMPLETED")
    .reduce((a, r) => a + r.serviceFee + r.overtimeFee, 0);

  function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast(t("avatarBadType"), "error");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast(t("avatarTooBig"), "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(String(reader.result));
      toast(t("profileSaved"), "success");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold tracking-tight">{t("profileTitle")}</h2>

      {/* identity card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass glow-soft relative overflow-hidden rounded-3xl p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-binus-bright/15 blur-3xl"
        />
        {/* edit pill (v25) */}
        <button
          onClick={() => setEditOpen(true)}
          data-edit-profile-btn
          aria-label={t("editProfile")}
          className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/20 active:scale-95"
        >
          <Pencil className="h-3 w-3" />
          {t("editProfile")}
        </button>

        <div className="relative flex items-center gap-4">
          {/* avatar (v26) — click to upload a photo */}
          <div className="relative shrink-0">
            <button
              onClick={() => fileRef.current?.click()}
              data-avatar-btn
              aria-label={t("avatarChange")}
              className="group relative block h-16 w-16 overflow-hidden rounded-2xl"
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  data-avatar-img
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-binus-blue to-binus-bright font-display text-xl font-bold text-white">
                  {initials}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
            </button>
            {/* persistent camera badge */}
            <span
              className={cn(
                "pointer-events-none absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card",
                user.isBinusian ? "bg-primary" : "bg-muted"
              )}
            >
              {user.isBinusian ? (
                <BadgeCheck className="h-3.5 w-3.5 text-primary-foreground" />
              ) : (
                <UserRound className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
            {/* remove photo — only when a custom photo exists */}
            {user.avatar && (
              <button
                onClick={() => {
                  setAvatar(null);
                  toast(t("avatarRemove"), "info");
                }}
                data-avatar-remove
                aria-label={t("avatarRemove")}
                className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-red-500 text-white transition hover:bg-red-400 active:scale-90"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onAvatarFile}
              className="hidden"
              aria-hidden
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold leading-tight">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            {(user.nim || user.phone) && (
              <p className="tnum mt-0.5 truncate text-[11px] text-muted-foreground/80">
                {[user.nim, user.phone].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.isBinusian ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black tracking-wider text-primary">
                  {t("binusian")}
                </span>
              ) : (
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-black tracking-wider text-muted-foreground">
                  {t("nonBinusian")}
                </span>
              )}
              <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                {t("memberSince")} {user.memberSince}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-dashed border-border pt-4 text-center">
          <div>
            <p className="tnum font-display text-lg font-bold">{sessions}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("totalSessions")}
            </p>
          </div>
          <div className="border-x border-border/60">
            <p className="tnum font-display text-lg font-bold">{vehicles.length}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("myVehicles")}
            </p>
          </div>
          <div>
            <p className="tnum font-display text-lg font-bold text-gradient-gold">{rupiah(spend)}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {lang === "id" ? "Total belanja" : "Total spend"}
            </p>
          </div>
        </div>
        <p className="tnum mt-2 text-center text-[10px] text-muted-foreground/70">
          {t("walletTitle")}: {rupiah(walletBalance)}
        </p>
      </motion.section>

      {/* vehicles */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold tracking-tight">{t("myVehicles")}</h3>
          <button
            onClick={() => setVehicleModal({ open: true })}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/20 active:scale-95"
          >
            <Plus className="h-3 w-3" /> {t("addVehicle")}
          </button>
        </div>
        <div className="space-y-2">
          {vehicles.map((v) => (
            <div key={v.id} className="glass flex items-center gap-3 rounded-2xl p-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Car className="h-4.5 w-4.5 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">{v.nickname}</p>
                <p className="text-[11px] text-muted-foreground">
                  {v.brand} {v.model} · {v.color}
                  {v.bodyType ? ` · ${v.bodyType}` : ""}
                </p>
              </div>
              <span className="shrink-0 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                <span className="block bg-[#1e3a8a] px-1 pt-0.5 text-center text-[5px] font-bold leading-[7px] text-white">
                  BINUS
                </span>
                <span className="tnum block px-1.5 pb-0.5 text-center text-[11px] font-black leading-4 text-[#0b1226]">
                  {v.licensePlate}
                </span>
              </span>
              <button
                onClick={() => setVehicleModal({ open: true, vehicle: v })}
                aria-label={t("editVehicle")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground/50 transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary active:scale-90"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirmRemove(confirmRemove === v.id ? null : v.id)}
                aria-label={t("removeVehicle")}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition active:scale-90",
                  confirmRemove === v.id
                    ? "border-red-400/40 bg-red-400/15 text-red-400"
                    : "border-transparent text-muted-foreground/50 hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-400"
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {confirmRemove && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 rounded-2xl border border-red-400/25 bg-red-400/[0.06] p-3"
            >
              <Trash2 className="h-4 w-4 shrink-0 text-red-400" />
              <p className="flex-1 text-xs font-semibold">{t("removeConfirm")}</p>
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-full border border-border px-3 py-1 text-[11px] font-bold text-muted-foreground transition hover:bg-white/[0.04]"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  removeVehicle(confirmRemove);
                  setConfirmRemove(null);
                  toast(t("vehicleRemoved"), "info");
                }}
                className="rounded-full bg-red-400 px-3 py-1 text-[11px] font-bold text-red-950 transition hover:bg-red-300 active:scale-95"
              >
                {t("remove")}
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* preferences */}
      <section className="space-y-2">
        <h3 className="font-display text-sm font-bold tracking-tight">{t("preferences")}</h3>
        <div className="glass overflow-hidden rounded-2xl">
          {/* language */}
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
            <Languages className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-[13px] font-semibold">{t("language")}</span>
            <div className="flex rounded-full border border-border bg-white/[0.03] p-0.5">
              {(["id", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition-all",
                    lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {/* theme */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            {mounted && theme === "dark" ? (
              <Moon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
            ) : (
              <Sun className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 text-[13px] font-semibold">{t("darkMode")}</span>
            <Switch
              checked={mounted ? theme === "dark" : true}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
              aria-label={t("darkMode")}
            />
          </div>
        </div>
      </section>

      {/* sign out */}
      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-400/[0.06] py-3.5 text-sm font-bold text-red-400 transition hover:bg-red-400/10"
      >
        <LogOut className="h-4 w-4" />
        {t("signOut")}
      </button>

      <p className="pb-2 text-center text-[10px] text-muted-foreground/60">
        {t("appName")} · {t("footerNote")}
      </p>

      <VehicleModal
        open={vehicleModal.open}
        onOpenChange={(v) => setVehicleModal((m) => ({ ...m, open: v }))}
        vehicle={vehicleModal.vehicle ?? null}
      />

      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

// ───────────────────── EditProfileModal (v25) ─────────────────────

function EditProfileModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const lang = useParkir((s) => s.lang);
  const user = useParkir((s) => s.user);
  const updateProfile = useParkir((s) => s.updateProfile);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nim, setNim] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? "");
      setNim(user.nim ?? "");
      setErrors({});
    }
  }, [open, user]);

  function save() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("epNameReq");
    if (!email.trim()) errs.email = t("epEmailReq");
    else if (!EMAIL_RE.test(email.trim())) errs.email = t("epEmailInvalid");
    if (phone.trim() && !PHONE_RE.test(phone.trim())) errs.phone = t("epPhoneInvalid");
    if (nim.trim() && !NIM_RE.test(nim.trim())) errs.nim = t("epNimInvalid");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      nim: nim.trim() || undefined,
    });
    toast(t("profileSaved"), "success");
    onOpenChange(false);
  }

  const inputCls = (bad?: string) =>
    `h-11 w-full rounded-xl border bg-white/[0.04] px-3.5 text-[13px] font-medium placeholder:text-muted-foreground/50 focus:outline-none transition ${
      bad ? "border-red-400/60 focus:border-red-400" : "border-border focus:border-primary/50"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
        <DialogHeader className="space-y-1.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <Pencil className="h-5.5 w-5.5 text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
            {t("editProfileTitle")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {t("profileTitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t("epName")} <span className="text-red-400">*</span>
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-ep-name
              className={inputCls(errors.name)}
            />
            {errors.name && <p className="mt-1 text-[10px] font-semibold text-red-400">{errors.name}</p>}
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t("epEmail")} <span className="text-red-400">*</span>
            </p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              data-ep-email
              className={inputCls(errors.email)}
            />
            {errors.email && <p className="mt-1 text-[10px] font-semibold text-red-400">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("epPhone")}
              </p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="+62 812 …"
                data-ep-phone
                className={`tnum ${inputCls(errors.phone)}`}
              />
              {errors.phone && <p className="mt-1 text-[10px] font-semibold text-red-400">{errors.phone}</p>}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("epNim")}
              </p>
              <input
                value={nim}
                onChange={(e) => setNim(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="2540…"
                data-ep-nim
                className={`tnum ${inputCls(errors.nim)}`}
              />
              {errors.nim && <p className="mt-1 text-[10px] font-semibold text-red-400">{errors.nim}</p>}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-white/[0.03] text-sm font-bold text-muted-foreground transition hover:bg-white/[0.06] active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
            {t("cancel")}
          </button>
          <button
            onClick={save}
            data-ep-save
            className="glow-primary flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition active:scale-[0.98]"
          >
            {t("save")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
