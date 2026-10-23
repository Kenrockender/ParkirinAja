"use client";
/**
 * EV verification - an EV Charger slot may only be used by a vehicle an
 * operator has verified as electric.
 *
 *  Customer: Profil → Kendaraanku → "Ajukan verifikasi EV" → upload STNK
 *            (Bahan Bakar: LISTRIK) + photo of the charging port → PENDING.
 *  Operator: tab "EV" → review the documents against a checklist → approve
 *            (all checks ticked) or reject with a reason the customer sees.
 */
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Camera,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  ImagePlus,
  ShieldCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useParkir } from "@/lib/store";
import {
  EV_CONNECTORS,
  evRequestFor,
  isKnownEvModel,
  type EvDoc,
  type EvRequest,
  type EvStatus,
  type Vehicle,
} from "@/lib/parking-data";
import { cn } from "@/lib/utils";

const DOC_MAX_BYTES = 5 * 1024 * 1024;
const DOC_TYPES = ["image/png", "image/jpeg", "image/webp"];

function useL() {
  const lang = useParkir((s) => s.lang);
  return (id: string, en: string) => (lang === "id" ? id : en);
}

function fmtWhen(ms: number, lang: "id" | "en"): string {
  return new Date(ms).toLocaleString(lang === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ───────────────────────── customer: status chip ─────────────────────────

/** Status row under a vehicle card - also the entry point to submit/resubmit. */
export function EvStatusRow({ vehicle, onSubmit }: { vehicle: Vehicle; onSubmit: () => void }) {
  const L = useL();
  const req = useParkir((s) => evRequestFor(vehicle.id, s.evRequests));

  if (!req) {
    return (
      <button
        onClick={onSubmit}
        className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[11px] font-bold text-green-700 transition hover:bg-green-500/20 active:scale-95 dark:text-green-300"
      >
        <Zap className="h-3 w-3" />
        {L("Mobil listrik? Ajukan verifikasi EV", "Electric car? Submit EV verification")}
      </button>
    );
  }
  if (req.status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
        <Clock3 className="h-3 w-3" />
        {L("EV menunggu persetujuan operator", "EV awaiting operator approval")}
      </span>
    );
  }
  if (req.status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[11px] font-bold text-green-700 dark:text-green-300">
        <BadgeCheck className="h-3 w-3" />
        {L("EV terverifikasi · bisa pakai slot EV", "Verified EV · can use EV slots")}
      </span>
    );
  }
  return (
    <div className="space-y-1.5">
      <p className="flex items-start gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {L("Pengajuan EV ditolak", "EV request rejected")}: {req.reason ?? "-"}
        </span>
      </p>
      <button
        onClick={onSubmit}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/20 active:scale-95"
      >
        <Zap className="h-3 w-3" />
        {L("Ajukan ulang", "Resubmit")}
      </button>
    </div>
  );
}

// ───────────────────────── customer: submit modal ─────────────────────────

export function EvVerifyModal({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: Vehicle | null;
}) {
  const L = useL();
  const submit = useParkir((s) => s.submitEvRequest);
  const toast = useParkir((s) => s.toast);
  const [stnk, setStnk] = React.useState<EvDoc | null>(null);
  const [photo, setPhoto] = React.useState<EvDoc | null>(null);
  const [connector, setConnector] = React.useState(EV_CONNECTORS[0]);
  const [agree, setAgree] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStnk(null);
      setPhoto(null);
      setConnector(EV_CONNECTORS[0]);
      setAgree(false);
    }
  }, [open]);

  if (!vehicle) return null;
  const knownEv = isKnownEvModel(vehicle.brand, vehicle.model);
  const ready = !!stnk && !!photo && agree;

  function handleSubmit() {
    if (!vehicle || !stnk || !photo || !agree) return;
    const ok = submit({ vehicleId: vehicle.id, connector, stnk, photo });
    if (ok) {
      toast(L("Pengajuan EV terkirim. Operator akan memeriksanya.", "EV request sent. An operator will review it."), "success");
      onOpenChange(false);
    } else {
      toast(L("Kendaraan ini sudah diajukan.", "This vehicle was already submitted."), "error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-safe dialog-safe-h w-[calc(100%-2rem)] max-w-[400px] overflow-y-auto rounded-3xl border-border bg-card p-5">
        <DialogHeader className="space-y-1.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/15">
            <Zap className="h-5.5 w-5.5 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-center font-display text-lg font-bold tracking-tight">
            {L("Verifikasi Kendaraan EV", "EV Vehicle Verification")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-snug text-muted-foreground">
            {L(
              "Slot EV Charger hanya untuk mobil listrik. Kirim bukti, lalu operator akan menyetujuinya.",
              "EV Charger slots are for electric cars only. Send proof and an operator will approve it."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* vehicle */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{vehicle.nickname}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {vehicle.brand} {vehicle.model}
            </p>
          </div>
          <span className="tnum shrink-0 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-black text-[#0b1226]">
            {vehicle.licensePlate}
          </span>
        </div>
        {!knownEv && (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {L(
              "Model ini tidak ada di daftar mobil listrik kami. Kamu tetap bisa mengajukan, tapi operator akan memeriksa lebih teliti.",
              "This model isn't on our EV list. You can still submit, but the operator will check more closely."
            )}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <DocPicker
            icon={FileText}
            title={L("1. Foto STNK", "1. Photo of STNK")}
            hint={L(
              "Pastikan baris \"Bahan Bakar\" terbaca LISTRIK dan nomor plat terlihat jelas.",
              "Make sure the \"Bahan Bakar\" (fuel) row reads LISTRIK and the plate number is clear."
            )}
            value={stnk}
            onChange={setStnk}
          />
          <DocPicker
            icon={Camera}
            title={L("2. Foto port pengisian daya", "2. Photo of the charging port")}
            hint={L(
              "Buka tutup port charger, foto dari samping mobil dengan plat nomor ikut terlihat.",
              "Open the charging port cover and shoot from the side with the plate visible."
            )}
            value={photo}
            onChange={setPhoto}
          />

          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {L("3. Jenis konektor", "3. Connector type")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EV_CONNECTORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setConnector(c)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11px] font-bold transition active:scale-95",
                    connector === c
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3 text-[11px] leading-snug text-muted-foreground">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
            />
            {L(
              "Data yang saya kirim benar. Mobil non-listrik yang parkir di slot EV bisa didenda dan diblokir dari slot EV.",
              "The data I send is true. Non-electric cars parked in EV slots may be fined and banned from EV slots."
            )}
          </label>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border text-sm font-bold text-muted-foreground transition hover:bg-accent/50 active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
            {L("Batal", "Cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!ready}
            className={cn(
              "flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-2xl text-sm font-bold transition active:scale-[0.98]",
              ready ? "bg-primary text-primary-foreground" : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            <Check className="h-4 w-4" />
            {L("Kirim pengajuan", "Submit request")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocPicker({
  icon: Icon,
  title,
  hint,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  value: EvDoc | null;
  onChange: (d: EvDoc | null) => void;
}) {
  const L = useL();
  const toast = useParkir((s) => s.toast);
  const ref = React.useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!DOC_TYPES.includes(f.type)) {
      toast(L("Format harus PNG, JPG, atau WEBP", "Format must be PNG, JPG or WEBP"), "error");
      return;
    }
    if (f.size > DOC_MAX_BYTES) {
      toast(L("Ukuran foto maksimal 5 MB", "Photo must be 5 MB or less"), "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ name: f.name, dataUrl: String(reader.result) });
    reader.readAsDataURL(f);
  }

  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title} <span className="text-red-500">*</span>
      </p>
      <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      <input ref={ref} type="file" accept={DOC_TYPES.join(",")} className="hidden" onChange={onFile} />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/[0.06] p-2">
          <img src={value.dataUrl} alt={title} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold">{value.name}</p>
          <button
            onClick={() => ref.current?.click()}
            className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
          >
            {L("Ganti", "Change")}
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-[12px] font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Icon className="h-4 w-4" />
          <ImagePlus className="h-4 w-4" />
          {L("Pilih / ambil foto", "Choose / take photo")}
        </button>
      )}
    </div>
  );
}

// ───────────────────────── operator: review queue ─────────────────────────

const REJECT_REASONS: { id: string; en: string }[] = [
  { id: "STNK tidak menunjukkan bahan bakar LISTRIK", en: "STNK does not show LISTRIK as fuel" },
  { id: "Foto buram / tidak terbaca", en: "Photo is blurry / unreadable" },
  { id: "Plat di STNK tidak sama dengan plat terdaftar", en: "STNK plate doesn't match the registered plate" },
  { id: "Port pengisian daya tidak terlihat", en: "Charging port is not visible" },
];

export function EvVerifyView() {
  const L = useL();
  const lang = useParkir((s) => s.lang);
  const requests = useParkir((s) => s.evRequests);
  const [filter, setFilter] = React.useState<EvStatus>("PENDING");
  const [preview, setPreview] = React.useState<{ src: string; title: string } | null>(null);

  const list = React.useMemo(
    () =>
      requests
        .filter((r) => r.status === filter)
        .sort((a, b) => (filter === "PENDING" ? a.submittedAt - b.submittedAt : (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0))),
    [requests, filter]
  );
  const count = (st: EvStatus) => requests.filter((r) => r.status === st).length;

  const filters: { k: EvStatus; label: string }[] = [
    { k: "PENDING", label: L("Menunggu", "Pending") },
    { k: "APPROVED", label: L("Disetujui", "Approved") },
    { k: "REJECTED", label: L("Ditolak", "Rejected") },
  ];

  return (
    <div className="space-y-3">
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
          <h3 className="font-display text-sm font-bold tracking-tight">{L("Verifikasi Kendaraan EV", "EV Vehicle Verification")}</h3>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {L(
            "Cocokkan STNK dan foto dengan data kendaraan. Setujui hanya jika semua poin cek terpenuhi. Pelanggan baru bisa memesan slot EV setelah disetujui.",
            "Match the STNK and photo against the vehicle data. Approve only when every check passes. Customers can book EV slots only after approval."
          )}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-border p-1">
          {filters.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition",
                filter === f.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className={cn("tnum rounded-full px-1.5 text-[10px]", filter === f.k ? "bg-white/20" : "bg-muted")}>
                {count(f.k)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && (
        <p className="glass rounded-3xl p-6 text-center text-xs text-muted-foreground">
          {filter === "PENDING" ? L("Tidak ada pengajuan yang menunggu.", "No pending requests.") : L("Belum ada data.", "Nothing here yet.")}
        </p>
      )}

      <AnimatePresence initial={false}>
        {list.map((r) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            <EvRequestCard req={r} lang={lang} onPreview={(src, title) => setPreview({ src, title })} />
          </motion.div>
        ))}
      </AnimatePresence>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="dialog-safe dialog-safe-h w-[calc(100%-2rem)] max-w-[640px] overflow-y-auto rounded-3xl border-border bg-card p-3">
          <DialogHeader>
            <DialogTitle className="px-1 text-sm font-bold">{preview?.title}</DialogTitle>
            <DialogDescription className="sr-only">{preview?.title}</DialogDescription>
          </DialogHeader>
          {preview && (
            <img src={preview.src} alt={preview.title} className="w-full rounded-2xl object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EvRequestCard({
  req,
  lang,
  onPreview,
}: {
  req: EvRequest;
  lang: "id" | "en";
  onPreview: (src: string, title: string) => void;
}) {
  const L = useL();
  const review = useParkir((s) => s.reviewEvRequest);
  const toast = useParkir((s) => s.toast);
  const [checks, setChecks] = React.useState([false, false, false]);
  const [rejecting, setRejecting] = React.useState(false);
  const [reasonIdx, setReasonIdx] = React.useState<number | null>(null);
  const [reasonText, setReasonText] = React.useState("");

  const [brand, ...rest] = req.vehicleName.split(" ");
  const knownEv = isKnownEvModel(brand ?? null, rest.join(" ") || null);
  const pending = req.status === "PENDING";
  const allChecked = checks.every(Boolean);

  const checkItems = [
    L("STNK: Bahan Bakar tertulis LISTRIK", "STNK: fuel reads LISTRIK"),
    L(`Plat di STNK & foto sama dengan ${req.plate}`, `Plate on STNK & photo matches ${req.plate}`),
    L("Foto menunjukkan port pengisian daya", "Photo shows the charging port"),
  ];

  function approve() {
    if (!allChecked) {
      toast(L("Centang semua poin cek dulu", "Tick every check first"), "info");
      return;
    }
    review(req.id, "APPROVED");
    toast(L(`${req.plate} disetujui sebagai EV`, `${req.plate} approved as EV`), "success");
  }

  function reject() {
    const preset = reasonIdx !== null ? REJECT_REASONS[reasonIdx][lang] : "";
    const reason = [preset, reasonText.trim()].filter(Boolean).join(". ");
    if (!reason) {
      toast(L("Pilih atau tulis alasan penolakan", "Pick or write a rejection reason"), "info");
      return;
    }
    review(req.id, "REJECTED", reason);
    toast(L(`Pengajuan ${req.plate} ditolak`, `${req.plate} rejected`), "info");
  }

  return (
    <div className="glass space-y-3 rounded-3xl p-4">
      {/* header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{req.ownerName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{req.ownerEmail}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {req.vehicleName} · {req.connector} · {fmtWhen(req.submittedAt, lang)}
          </p>
        </div>
        <span className="tnum shrink-0 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[12px] font-black text-[#0b1226]">
          {req.plate}
        </span>
      </div>

      <p
        className={cn(
          "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold",
          knownEv
            ? "bg-green-500/10 text-green-700 dark:text-green-300"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        )}
      >
        {knownEv ? <BadgeCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
        {knownEv
          ? L("Model terdaftar sebagai mobil listrik", "Model is a known electric car")
          : L("Model TIDAK dikenal sebagai mobil listrik - periksa teliti", "Model is NOT a known EV - check carefully")}
      </p>

      {/* documents */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { doc: req.stnk, title: L("STNK", "STNK") },
          { doc: req.photo, title: L("Port pengisian", "Charging port") },
        ].map(({ doc, title }) => (
          <button
            key={title}
            onClick={() => onPreview(doc.dataUrl, `${title} · ${req.plate}`)}
            className="group overflow-hidden rounded-2xl border border-border text-left transition hover:border-primary/40"
          >
            <img src={doc.dataUrl} alt={title} className="aspect-[16/10] w-full object-cover" />
            <p className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground group-hover:text-primary">
              {title} · {L("ketuk untuk perbesar", "tap to enlarge")}
            </p>
          </button>
        ))}
      </div>

      {pending ? (
        <>
          {/* checklist */}
          <div className="space-y-1.5">
            {checkItems.map((label, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3 py-2 text-[12px] font-medium">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                />
                {label}
              </label>
            ))}
          </div>

          {rejecting && (
            <div className="space-y-2 rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-600 dark:text-red-400">
                {L("Alasan penolakan (dikirim ke pelanggan)", "Rejection reason (sent to customer)")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {REJECT_REASONS.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setReasonIdx(reasonIdx === i ? null : i)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                      reasonIdx === i
                        ? "border-red-500/60 bg-red-500/15 text-red-700 dark:text-red-300"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r[lang]}
                  </button>
                ))}
              </div>
              <input
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={L("Catatan tambahan (opsional)", "Extra note (optional)")}
                className="h-11 w-full rounded-xl border border-border bg-transparent px-3 text-base focus:border-primary/50 focus:outline-none sm:h-10 sm:text-[12px]"
              />
            </div>
          )}

          <div className="flex gap-2">
            {rejecting ? (
              <>
                <button
                  onClick={() => setRejecting(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-border text-xs font-bold text-muted-foreground"
                >
                  {L("Batal", "Cancel")}
                </button>
                <button
                  onClick={reject}
                  className="flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-2xl bg-red-500 text-xs font-bold text-white active:scale-[0.98]"
                >
                  <XCircle className="h-4 w-4" />
                  {L("Kirim penolakan", "Send rejection")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setRejecting(true)}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-red-500/40 text-xs font-bold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                >
                  <XCircle className="h-4 w-4" />
                  {L("Tolak", "Reject")}
                </button>
                <button
                  onClick={approve}
                  aria-disabled={!allChecked || undefined}
                  className={cn(
                    "flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-2xl text-xs font-bold transition active:scale-[0.98]",
                    allChecked ? "bg-green-600 text-white" : "cursor-not-allowed bg-muted text-muted-foreground"
                  )}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {L("Setujui sebagai EV", "Approve as EV")}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-[11px] font-semibold",
            req.status === "APPROVED"
              ? "bg-green-500/10 text-green-700 dark:text-green-300"
              : "bg-red-500/10 text-red-700 dark:text-red-300"
          )}
        >
          {req.status === "APPROVED" ? L("Disetujui", "Approved") : L("Ditolak", "Rejected")} {L("oleh", "by")}{" "}
          {req.reviewer ?? "-"}
          {req.reviewedAt ? ` · ${fmtWhen(req.reviewedAt, lang)}` : ""}
          {req.reason ? ` · ${req.reason}` : ""}
        </p>
      )}
    </div>
  );
}
