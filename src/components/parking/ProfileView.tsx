"use client";
/** ProfileView — identity, garage (add/remove vehicles), preferences. */
import React from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Car,
  Languages,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { useParkir } from "@/lib/store";
import { rupiah, tr, type Vehicle } from "@/lib/parking-data";
import { VehicleModal } from "./VehicleModal";
import { cn } from "@/lib/utils";

export function ProfileView() {
  const lang = useParkir((s) => s.lang);
  const setLang = useParkir((s) => s.setLang);
  const user = useParkir((s) => s.user);
  const vehicles = useParkir((s) => s.vehicles);
  const walletBalance = useParkir((s) => s.walletBalance);
  const reservations = useParkir((s) => s.reservations);
  const signOut = useParkir((s) => s.signOut);
  const removeVehicle = useParkir((s) => s.removeVehicle);
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
  React.useEffect(() => setMounted(true), []);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sessions = reservations.filter(
    (r) =>
      ["COMPLETED", "CHECKED_IN"].includes(r.status) && r.driverName === user.name
  ).length;

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
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-binus-blue to-binus-bright font-display text-xl font-bold text-white">
              {initials}
            </div>
            <span
              className={cn(
                "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card",
                user.isBinusian ? "bg-primary" : "bg-muted"
              )}
            >
              {user.isBinusian ? (
                <BadgeCheck className="h-3.5 w-3.5 text-primary-foreground" />
              ) : (
                <UserRound className="h-3 w-3 text-muted-foreground" />
              )}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold leading-tight">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
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
            <p className="tnum font-display text-lg font-bold">{rupiah(walletBalance)}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("walletTitle")}
            </p>
          </div>
        </div>
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
    </div>
  );
}
