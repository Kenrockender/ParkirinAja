"use client";
/**
 * VehicleModal - add/edit vehicle dialog (v25 rewrite).
 * BrandPicker: searchable list of 25 popular Indonesian car brands with
 * startsWith-then-substring filtering + "Lainnya (tulis sendiri)" free-text
 * mode. Cars only - body-type chips (MPV/SUV/Crossover/Sedan/Hatchback/Pick-up/Van).
 */
import React from "react";
import { motion } from "framer-motion";
import { Car, Check, ChevronDown, Pencil, Plus, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParkir } from "@/lib/store";
import { CAR_BODY_TYPES, CAR_BRANDS, tr, type Vehicle } from "@/lib/parking-data";
import { cn } from "@/lib/utils";

export function VehicleModal({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** when provided → edit mode, otherwise add mode */
  vehicle?: Vehicle | null;
}) {
  const lang = useParkir((s) => s.lang);
  const addVehicle = useParkir((s) => s.addVehicle);
  const updateVehicle = useParkir((s) => s.updateVehicle);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const editing = !!vehicle;

  const [nickname, setNickname] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [model, setModel] = React.useState("");
  const [color, setColor] = React.useState("");
  const [bodyType, setBodyType] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{ nickname?: boolean; plate?: boolean; brand?: boolean }>({});

  React.useEffect(() => {
    if (open) {
      setNickname(vehicle?.nickname ?? "");
      setPlate(vehicle?.licensePlate ?? "");
      const known = vehicle?.brand ? CAR_BRANDS.includes(vehicle.brand) : false;
      setBrand(vehicle?.brand ?? "");
      setModel(vehicle?.model ?? "");
      setColor(vehicle?.color ?? "");
      setBodyType(vehicle?.bodyType ?? null);
      setErrors({});
    }
  }, [open, vehicle]);

  function handleSave() {
    const nick = nickname.trim();
    const p = plate.trim().toUpperCase().replace(/\s+/g, " ");
    const next: typeof errors = {};
    if (!nick) next.nickname = true;
    if (!p) next.plate = true;
    if (!brand.trim()) next.brand = true;
    setErrors(next);
    if (!nick || !p || !brand.trim()) return;

    const payload = {
      nickname: nick,
      licensePlate: p,
      brand: brand.trim(),
      model: model.trim() || null,
      color: color.trim() || null,
      bodyType: bodyType ?? null,
    };
    if (editing && vehicle) {
      updateVehicle(vehicle.id, payload);
      toast(t("vehicleUpdated"), "success");
    } else {
      addVehicle(payload);
      toast(t("vehicleSaved"), "success");
    }
    onOpenChange(false);
  }

  const inputCls = (bad?: boolean) =>
    `h-11 w-full rounded-xl border bg-white/[0.04] px-3.5 text-[13px] font-medium placeholder:text-muted-foreground/50 focus:outline-none transition ${
      bad
        ? "border-red-400/60 focus:border-red-400"
        : "border-border focus:border-primary/50"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-3xl border-border bg-card/95 p-5 backdrop-blur-xl">
        <DialogHeader className="space-y-1.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            {editing ? (
              <Pencil className="h-5.5 w-5.5 text-primary" />
            ) : (
              <Plus className="h-5.5 w-5.5 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
            {editing ? t("editVehicleTitle") : t("addVehicleTitle")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-snug text-muted-foreground">
            {editing ? t("editVehicleSub") : t("addVehicleSub")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {/* nickname */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t("fNickname")} <span className="text-red-400">*</span>
            </p>
            <input
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errors.nickname) setErrors({ ...errors, nickname: false });
              }}
              placeholder={t("fNicknamePh")}
              className={inputCls(errors.nickname)}
            />
            {errors.nickname && (
              <p className="mt-1 text-[10px] font-semibold text-red-400">{t("nicknameRequired")}</p>
            )}
          </div>

          {/* plate */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t("fPlate")} <span className="text-red-400">*</span>
            </p>
            <input
              value={plate}
              onChange={(e) => {
                setPlate(e.target.value.toUpperCase());
                if (errors.plate) setErrors({ ...errors, plate: false });
              }}
              placeholder={t("fPlatePh")}
              className={`tnum tracking-wider ${inputCls(errors.plate)}`}
            />
            {errors.plate ? (
              <p className="mt-1 text-[10px] font-semibold text-red-400">{t("plateRequired")}</p>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground/70">{t("fPlateHint")}</p>
            )}
          </div>

          {/* brand - searchable dropdown (v25) */}
          <BrandPicker
            value={brand}
            onChange={(b) => {
              setBrand(b);
              if (errors.brand) setErrors({ ...errors, brand: false });
            }}
            error={errors.brand}
          />

          {/* model + color */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("fModel")}
              </p>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t("fModelPh")}
                className={inputCls()}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("fColor")}
              </p>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder={t("fColorPh")}
                className={inputCls()}
              />
            </div>
          </div>

          {/* body type chips */}
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t("fBodyType")}
            </p>
            <div className="flex flex-wrap gap-1.5" data-body-types>
              {CAR_BODY_TYPES.map((bt) => (
                <button
                  key={bt}
                  onClick={() => setBodyType(bodyType === bt ? null : bt)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-95",
                    bodyType === bt
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-white/[0.03] text-sm font-bold text-muted-foreground transition hover:bg-white/[0.06] active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
            {t("cancel")}
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            data-vehicle-save
            className="glow-primary flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
          >
            <Check className="h-4 w-4" />
            {t("save")}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────── BrandPicker (v25) ─────────────────────

function BrandPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (brand: string) => void;
  error?: boolean;
}) {
  const lang = useParkir((s) => s.lang);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const isKnown = CAR_BRANDS.includes(value);
  const isOther = !!value && !isKnown;

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (!q) return CAR_BRANDS;
    // startsWith first, then substring - typing "H" surfaces Honda instantly
    const starts = CAR_BRANDS.filter((b) => b.toLowerCase().startsWith(q));
    const contains = CAR_BRANDS.filter((b) => !starts.includes(b) && b.toLowerCase().includes(q));
    return [...starts, ...contains];
  }, [q]);

  return (
    <div ref={wrapRef} className="relative" data-brand-picker>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t("fBrand")} <span className="text-red-400">*</span>
      </p>
      {/* closed state - looks like a select */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-brand-toggle
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border bg-white/[0.04] px-3.5 text-left text-[13px] font-medium transition focus:outline-none",
          error ? "border-red-400/60" : "border-border focus:border-primary/50"
        )}
      >
        <Car className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <span className={cn("min-w-0 flex-1 truncate", value ? "" : "text-muted-foreground/50")}>
          {value || t("fBrandPh")}
        </span>
        {isOther && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
            {lang === "id" ? "Lainnya" : "Other"}
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground/60 transition", open && "rotate-180")} />
      </button>
      {error && <p className="mt-1 text-[10px] font-semibold text-red-400">{t("brandRequired")}</p>}

      {/* open state - searchable list + Other free-text */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-xl backdrop-blur-xl"
          data-brand-list
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("brandSearchPh")}
              data-brand-search
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
          </div>
          <div className="max-h-[224px] overflow-y-auto slim-scroll py-1">
            {matches.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  onChange(b);
                  setOpen(false);
                }}
                data-brand-option={b}
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] font-semibold transition",
                  value === b ? "bg-primary/15 text-primary" : "text-foreground hover:bg-accent/60"
                )}
              >
                {b}
                {value === b && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
            {matches.length === 0 && (
              <p className="px-3.5 py-2.5 text-[11px] text-muted-foreground">
                {lang === "id" ? "Merek tidak ditemukan" : "No brand found"}
              </p>
            )}
            {/* Other - free text */}
            <div className="border-t border-border/60 p-2.5" data-brand-other>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("brandOther")}
              </p>
              <input
                value={isOther ? value : query}
                onChange={(e) => onChange(e.target.value)}
                placeholder={t("brandOtherPh")}
                data-brand-other-input
                className="h-10 w-full rounded-xl border border-border bg-white/[0.04] px-3 text-[13px] font-medium placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
