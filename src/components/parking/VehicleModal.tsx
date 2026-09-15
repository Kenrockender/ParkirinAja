"use client";
/** VehicleModal — add-vehicle dialog with plate validation. */
import React from "react";
import { motion } from "framer-motion";
import { Car, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParkir } from "@/lib/store";
import { tr } from "@/lib/parking-data";

export function VehicleModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const lang = useParkir((s) => s.lang);
  const addVehicle = useParkir((s) => s.addVehicle);
  const toast = useParkir((s) => s.toast);
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);

  const [nickname, setNickname] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [model, setModel] = React.useState("");
  const [color, setColor] = React.useState("");
  const [errors, setErrors] = React.useState<{ nickname?: boolean; plate?: boolean }>({});

  React.useEffect(() => {
    if (open) {
      setNickname("");
      setPlate("");
      setBrand("");
      setModel("");
      setColor("");
      setErrors({});
    }
  }, [open]);

  function handleSave() {
    const nick = nickname.trim();
    const p = plate.trim().toUpperCase().replace(/\s+/g, " ");
    const next: typeof errors = {};
    if (!nick) next.nickname = true;
    if (!p) next.plate = true;
    setErrors(next);
    if (!nick || !p) return;

    addVehicle({
      nickname: nick,
      licensePlate: p,
      brand: brand.trim() || null,
      model: model.trim() || null,
      color: color.trim() || null,
    });
    toast(t("vehicleSaved"), "success");
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
            <Car className="h-5.5 w-5.5 text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
            {t("addVehicleTitle")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-snug text-muted-foreground">
            {t("addVehicleSub")}
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

          {/* brand + model */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {t("fBrand")}
              </p>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={t("fBrandPh")}
                className={inputCls()}
              />
            </div>
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
          </div>

          {/* color */}
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
