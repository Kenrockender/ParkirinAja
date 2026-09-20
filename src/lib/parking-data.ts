/**
 * Parkir Binus — domain types, tariffs, business logic, bilingual strings & mock seed.
 * Ported from the original PRD v1.0 logic (parking.ts) and adapted for the live preview.
 */

// ───────────────────────────── Types ─────────────────────────────

export type SlotStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
export type ResStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "EXPIRED";
export type ResType = "ADVANCE" | "WALK_IN";
export type TxnType = "TOP_UP" | "SERVICE_FEE" | "OVERTIME" | "REFUND";

export interface Slot {
  id: string;
  slotNumber: string;
  rowLabel: "A" | "B";
  colIndex: number;
  status: "ACTIVE" | "MAINTENANCE";
}

export interface Reservation {
  id: string;
  code: string;
  type: ResType;
  /** Demand tier the service fee was priced at (dynamic pricing). */
  demandTier?: DemandTier;
  slotId: string;
  slotNumber: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: ResStatus;
  serviceFee: number;
  /** Late fine — the ONLY exit charge (Rp5.000 per STARTED hour, rounded up, uncapped). */
  overtimeFee: number;
  refundAmount: number;
  vehiclePlate: string;
  vehicleName: string;
  driverName: string;
  createdAt: number; // epoch ms
  checkedInAt?: number;
  checkedOutAt?: number;
}

export interface Vehicle {
  id: string;
  nickname: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  /** Car body type — MPV/SUV/Crossover/Sedan/Hatchback/Pick-up/Van. */
  bodyType?: string | null;
}

export interface Txn {
  id: string;
  type: TxnType;
  amount: number; // positive
  createdAt: number;
  note: string;
}

// ─────────────────────────── Notifications ───────────────────────────

export type NotifKind =
  | "welcome"
  | "booking"
  | "session_start"
  | "session_end_soon"
  | "overtime"
  | "extended"
  | "receipt"
  | "refund"
  | "promo";

/**
 * Structured notification — title/body are rendered per-language at display
 * time (params + kind → i18n template), so the EN/ID toggle stays correct.
 */
export interface Notif {
  id: string;
  /** Dedupe key for auto-events (e.g. "end:<resId>") — pushes with an existing key are ignored. */
  key?: string;
  kind: NotifKind;
  params: Record<string, string | number>;
  createdAt: number;
  read: boolean;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  theme: "coffee" | "carwash" | "event";
  ctaText: string;
  accent: string;
}

// ───────────────────────── Audit trail (v23) ─────────────────────────

export type AuditSeverity = "info" | "warning";

export type AuditAction =
  | "SIGN_IN"
  | "SIGN_OUT"
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "REFUND_ISSUED"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "WALK_IN_STARTED"
  | "FORCE_CHECKOUT"
  | "SESSION_EXTENDED"
  | "MANUAL_CHECKIN"
  | "TOP_UP"
  | "SLOT_MAINTENANCE"
  | "SLOT_REACTIVATED"
  | "CAMPUS_SWITCHED"
  | "PROMO_BROADCAST"
  | "PROFILE_UPDATE";

/** Append-only audit entry — actor, role, fake IP, severity, target & detail. */
export interface AuditEntry {
  id: string;
  /** Browser-session id shared by every entry of one page load. */
  sessionId: string;
  at: number;
  actor: string;
  role: "USER" | "OPERATOR" | "SYSTEM";
  action: AuditAction;
  severity: AuditSeverity;
  target?: string;
  detail?: string;
  ip: string;
}

// ───────────────────── Live gate stream (v23) ─────────────────────

export type LiveEventKind = "in" | "out";

/** One simulated gate event — guests NEVER touch reservations/txns/ledger. */
export interface LiveEvent {
  id: string;
  at: number;
  kind: LiveEventKind;
  plate: string;
  vehicle: string;
  slotNumber: string;
  guestId: string;
}

/** A guest car currently parked by the live simulator (overlay only). */
export interface LiveGuest {
  id: string;
  plate: string;
  vehicle: string;
  name: string;
  slotId: string;
  slotNumber: string;
  since: number;
}

export type LiveConnStatus = "offline" | "connecting" | "live";

// ─────────────────────────── Tariffs ────────────────────────────

/**
 * NO PARKING FEE — users pay only the dynamic service fee + late fines.
 * Walk-in = tier base price + flat surcharge (all walk-ins = base + 10K).
 */
export const TARIFF = {
  advanceFee: 20000,
  walkInFee: 30000,
  walkInSurcharge: 10000,
  overtimeFeePerHour: 5000,
  refundFullBeforeH: 24,
  refundPartialPct: 50,
  openHour: 6,
  closeHour: 22,
  fullRefundWindowMs: 10 * 60 * 1000,
} as const;

export const LOCATION = {
  name: "Gedung Parkir Anggrek",
  campus: "BINUS @ Kemanggisan",
  address: "Jl. K.H. Syahdan No.9, Kemanggisan, Palmerah",
  operatingHours: "06:00 – 22:00",
} as const;

// ─────────────────────────── Campuses ───────────────────────────

export type CampusId = "anggrek" | "alamsutera" | "bekasi";

export interface Campus {
  id: CampusId;
  /** Campus brand name, e.g. "BINUS @ Kemanggisan" */
  name: string;
  /** Landmark building shown alongside the campus name (Anggrek keeps its identity). */
  building: string | null;
  city: string;
  /** false → selectable, but the parking layout is still being prepared (Coming Soon). */
  available: boolean;
  /** Parking location label for map/ticket headers. */
  location: string;
  /** Site-plan rendering style: "building" (walls, pillars, lift/WC) or "openlot" (paint-line bays). */
  layout: "building" | "openlot";
}

export const CAMPUSES: Campus[] = [
  { id: "anggrek", name: "BINUS @ Kemanggisan", building: "The Anggrek", city: "Jakarta Barat", available: true, location: "Gedung Parkir Anggrek", layout: "building" },
  { id: "alamsutera", name: "BINUS @ Alam Sutera", building: null, city: "Tangerang", available: true, location: "BINUS @ Alam Sutera · Area Parkir", layout: "openlot" },
  { id: "bekasi", name: "BINUS @ Bekasi", building: null, city: "Kota Bekasi", available: true, location: "BINUS @ Bekasi · Area Parkir", layout: "openlot" },
];

export function campusById(id: CampusId): Campus {
  return CAMPUSES.find((c) => c.id === id) ?? CAMPUSES[0];
}

/** One-line label for headers & chips: "BINUS @ Kemanggisan · The Anggrek" */
export function campusLabel(c: Campus): string {
  return c.building ? `${c.name} · ${c.building}` : c.name;
}

/** QR payload prefix per campus — keeps physical slot codes unique across campuses. */
export function campusCodePrefix(id: CampusId): string {
  return id === "anggrek" ? "PB" : id === "alamsutera" ? "AS" : "BKS";
}

/** Which campus a slotId belongs to ("slot-A-3" → anggrek, "as-A-3" → alamsutera, "bk-B-7" → bekasi). */
export function campusForSlot(slotId: string): CampusId {
  if (slotId.startsWith("as-")) return "alamsutera";
  if (slotId.startsWith("bk-")) return "bekasi";
  return "anggrek";
}

// ─────────────────────── Dynamic pricing ───────────────────────
//
// The demand tier is derived from real-time occupancy — the share of active
// (non-maintenance) slots that are occupied or reserved right now:
//   < 40%  → LOW    (Reserve 15K  / Walk-in 25K)
//   40–75% → NORMAL (Reserve 20K  / Walk-in 30K — the classic tariff)
//   > 75%  → HIGH   (Reserve 30K  / Walk-in 35K)
// Overtime stays flat Rp5.000/hour for every tier.

export type DemandTier = "LOW" | "NORMAL" | "HIGH";

export interface DemandInfo {
  tier: DemandTier;
  pct: number;
  occupied: number;
  reserved: number;
  active: number;
}

/**
 * Price ladder per demand tier (NORMAL mirrors the classic TARIFF).
 * Walk-in ladder prices ALREADY include the flat 10K surcharge:
 * LOW 15+10=25K · NORMAL 20+10=30K · HIGH 30+10=40K.
 */
export const DEMAND_TIERS: Record<DemandTier, { advanceFee: number; walkInFee: number }> = {
  LOW: { advanceFee: 15000, walkInFee: 25000 },
  NORMAL: { advanceFee: TARIFF.advanceFee, walkInFee: TARIFF.walkInFee },
  HIGH: { advanceFee: 30000, walkInFee: 40000 },
};

/** Walk-in price for a tier = reserve price + flat surcharge (structural check). */
export function walkInPriceFor(tier: DemandTier): number {
  return DEMAND_TIERS[tier].advanceFee + TARIFF.walkInSurcharge;
}

/** Occupancy thresholds separating the tiers (percentage points). */
export const TIER_THRESHOLDS = { normal: 40, high: 75 } as const;

export function demandTierFor(occupancyPct: number): DemandTier {
  if (occupancyPct > TIER_THRESHOLDS.high) return "HIGH";
  if (occupancyPct >= TIER_THRESHOLDS.normal) return "NORMAL";
  return "LOW";
}

/** Live demand snapshot for a slot list, measured over the "now" window. */
export function demandNow(slots: Slot[], reservations: Reservation[], nowMs?: number): DemandInfo {
  const now = nowMs ?? Date.now();
  const d = new Date(now);
  const win: TimeWindow = {
    date: dateStr(d),
    startTime: timeStr(new Date(now - 60_000)),
    endTime: timeStr(new Date(now + 60_000)),
  };
  let active = 0;
  let occupied = 0;
  let reserved = 0;
  for (const s of slots) {
    if (s.status === "MAINTENANCE") continue;
    active++;
    const st = slotStatusForWindow(s, reservations, win);
    if (st === "OCCUPIED") occupied++;
    else if (st === "RESERVED") reserved++;
  }
  const pct = active === 0 ? 0 : Math.round(((occupied + reserved) / active) * 100);
  return { tier: demandTierFor(pct), pct, occupied, reserved, active };
}

// ───────────────────────── Time helpers ─────────────────────────

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function timeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface TimeWindow {
  date: string;
  startTime: string;
  endTime: string;
}

export function overlaps(a: TimeWindow, b: TimeWindow): boolean {
  if (a.date !== b.date) return false;
  const aS = toMinutes(a.startTime);
  const aE = toMinutes(a.endTime);
  const bS = toMinutes(b.startTime);
  const bE = toMinutes(b.endTime);
  return aS < bE && bS < aE;
}

export function validateWindow(w: TimeWindow): { ok: boolean; error?: string } {
  const s = toMinutes(w.startTime);
  const e = toMinutes(w.endTime);
  if (!w.date || !w.startTime || !w.endTime) return { ok: false, error: "incomplete" };
  if (e <= s) return { ok: false, error: "end_before_start" };
  if (s < TARIFF.openHour * 60) return { ok: false, error: "before_open" };
  if (e > TARIFF.closeHour * 60) return { ok: false, error: "after_close" };
  if ((e - s) / 60 > 12) return { ok: false, error: "too_long" };
  return { ok: true };
}

/** Display status of a slot for a given viewing window */
export function slotStatusForWindow(
  slot: Slot,
  reservations: Reservation[],
  window: TimeWindow
): SlotStatus {
  if (slot.status === "MAINTENANCE") return "MAINTENANCE";
  const wStart = new Date(`${window.date}T${window.startTime}:00`).getTime();
  const wEnd = new Date(`${window.date}T${window.endTime}:00`).getTime();
  const now = Date.now();
  for (const r of reservations) {
    if (r.slotId !== slot.id) continue;
    if (r.status === "CHECKED_IN") {
      // A parked car physically occupies its slot until it checks out —
      // even when it has overstayed its booked window (overdue case).
      const rStart = r.checkedInAt ?? new Date(`${r.date}T${r.startTime}:00`).getTime();
      const rEnd = Math.max(new Date(`${r.date}T${r.endTime}:00`).getTime(), now);
      if (wStart <= rEnd && wEnd >= rStart) return "OCCUPIED";
      continue;
    }
    if (r.status === "CONFIRMED" && overlaps({ date: r.date, startTime: r.startTime, endTime: r.endTime }, window)) {
      return "RESERVED";
    }
  }
  return "AVAILABLE";
}

/** Refund policy: 100% within 10 min of creation, 50% otherwise, 0% no-show */
export function refundAmount(
  serviceFee: number,
  startMs: number,
  cancelledAt: number,
  createdAt: number
): number {
  if (cancelledAt - createdAt <= TARIFF.fullRefundWindowMs) return serviceFee;
  void startMs;
  return Math.floor((serviceFee * TARIFF.refundPartialPct) / 100);
}

/**
 * Late fine — the ONLY exit charge: Rp5.000 per STARTED hour past the
 * booked window, rounded UP, uncapped (20 min → 5K, 61 min → 10K, 10 h → 50K).
 */
export function overtimeFee(minutesLate: number): number {
  if (minutesLate <= 0) return 0;
  return Math.ceil(minutesLate / 60) * TARIFF.overtimeFeePerHour;
}

export function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

/** Privacy: mask a plate for customer-facing live views — "B 2741 AKL" → "B 2••• ••L". */
export function maskPlate(plate: string): string {
  const chars = plate.split("");
  let seen = 0;
  const alnum = plate.replace(/[^a-zA-Z0-9]/g, "");
  const keepHead = 2;
  const keepTail = 2;
  return chars
    .map((c) => {
      if (!/[a-zA-Z0-9]/.test(c)) return c;
      seen++;
      const fromEnd = alnum.length - seen;
      return seen <= keepHead || fromEnd < keepTail ? c : "•";
    })
    .join("");
}

export function resCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 3; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return `PB-${s}${String(Math.floor(1000 + Math.random() * 9000))}`;
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ───────────────── Car brands & body types (v25) ─────────────────

/** 25 popular car brands in Indonesia (incl. EV marques) — cars only, bukan motor. */
export const CAR_BRANDS: string[] = [
  "Toyota",
  "Daihatsu",
  "Honda",
  "Mitsubishi",
  "Suzuki",
  "Nissan",
  "Hyundai",
  "Kia",
  "Mazda",
  "Wuling",
  "MG",
  "BYD",
  "Chery",
  "Volkswagen",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Lexus",
  "Isuzu",
  "Ford",
  "Chevrolet",
  "DFSK",
  "Peugeot",
  "VinFast",
  "Volvo",
];

export const CAR_BODY_TYPES: string[] = ["MPV", "SUV", "Crossover", "Sedan", "Hatchback", "Pick-up", "Van"];

// ─────────────────── Payment channels (v26) ───────────────────

export interface VaBank {
  id: string;
  name: string;
  short: string;
  /** Real Indonesian VA issuer prefix. */
  prefix: string;
  color: string;
}

/** 8 Indonesian banks with their real VA issuer prefixes. */
export const VA_BANKS: VaBank[] = [
  { id: "bca", name: "Bank BCA", short: "BCA", prefix: "8808", color: "#0d5bb5" },
  { id: "mandiri", name: "Bank Mandiri", short: "Mandiri", prefix: "89508", color: "#123e7c" },
  { id: "bni", name: "Bank BNI", short: "BNI", prefix: "9889", color: "#f28f2a" },
  { id: "bri", name: "Bank BRI", short: "BRI", prefix: "8881", color: "#1a5fa8" },
  { id: "cimb", name: "CIMB Niaga", short: "CIMB", prefix: "8027", color: "#b91c3c" },
  { id: "danamon", name: "Bank Danamon", short: "Danamon", prefix: "8717", color: "#00497f" },
  { id: "permata", name: "Bank Permata", short: "Permata", prefix: "8528", color: "#2f7d4f" },
  { id: "bsi", name: "Bank Syariah Indonesia", short: "BSI", prefix: "7109", color: "#1e7d6f" },
];

/**
 * 16-digit Virtual Account number: issuer prefix + amount tail + random digits,
 * padded/sliced to exactly 16. `rnd` injectable for deterministic tests.
 */
export function vaNumberFor(prefix: string, amount: number, rnd: () => number = Math.random): string {
  const tail = String(Math.floor(amount) % 10000).padStart(4, "0");
  const randLen = Math.max(0, 16 - prefix.length - 4);
  let rand = "";
  for (let i = 0; i < randLen; i++) rand += String(Math.floor(rnd() * 10));
  return (prefix + tail + rand).slice(0, 16).padEnd(16, "0");
}

/** "8808123456789012" → "8808 1234 5678 9012" (4-4-4-4). */
export function groupVa(va: string): string {
  return va.replace(/\D/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

/** "4242424242424242" → "4242 4242 4242 4242". */
export function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ");
}

/** Real Luhn checksum validation. */
export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** Expiry "MM/YY" — valid format and not in the past (current month still OK). */
export function expiryValid(mmYy: string, now: Date = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(mmYy.trim());
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  const end = new Date(yy, mm, 1).getTime(); // first day of the NEXT month
  return end > now.getTime();
}

/** Card brand guess from the first digits. */
export function cardBrand(number: string): "Visa" | "Mastercard" | "JCB" | null {
  const d = number.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^35/.test(d)) return "JCB";
  return null;
}

/** QRIS payload string — merchant + NMID + amount + timestamp (simulated EMV-lite). */
export function qrisPayload(amount: number, at: Date = new Date()): string {
  return [
    "00020101021126",
    "PARKIR BINUS KEMANGGISAN",
    `NMID:ID1020090001234`,
    `AMOUNT:${Math.floor(amount)}`,
    `TS:${at.toISOString()}`,
    "6304",
  ].join("|");
}

// ─────────────────────────── i18n ───────────────────────────────

export type Lang = "id" | "en";

const dict = {
  id: {
    appName: "Parkir Binus",
    tagline: "Slot parkir kampus — pasti ada tempat",
    heroTitle: "Parkir tanpa drama.",
    heroSub: "Reservasi slot favoritmu di Gedung Parkir Anggrek, scan QR untuk masuk & keluar. Selesai.",
    signIn: "Masuk dengan Microsoft",
    msSignIn: "Masuk dengan Microsoft",
    msOrDemo: "atau pilih akun demo",
    msModalTitle: "Masuk",
    msModalFor: "untuk melanjutkan ke Parkir Binus",
    msModalSub: "Gunakan akun Microsoft kampus (@binus.ac.id)",
    msContinue: "Lanjutkan",
    msWorking: "Memverifikasi akun…",
    msDemoNote: "Demo — SSO Microsoft disimulasikan",
    msVerified: "BINUSIAN terverifikasi",
    signInNote: "Akun Microsoft @binus.ac.id terdeteksi sebagai BINUSIAN · email lain = non-BINUSIAN",
    demoAccounts: "Pilih akun demo",
    student: "Mahasiswa BINUS",
    general: "Pengguna umum",
    nonBinusian: "NON-BINUSIAN",
    binusianOnly: "Khusus BINUSIAN",
    guestBookingNote: "Booking jadwal hanya untuk BINUSIAN. Non-BINUSIAN tetap bisa parkir — scan QR di slot untuk sesi walk-in.",
    maxActiveToast: "Batas tercapai — maksimal 2 kendaraan sedang parkir",
    activeSessions: "sedang parkir",
    footerNote: "Preview UI — data simulasi",
    // nav
    navHome: "Beranda",
    navHistory: "Riwayat",
    navWallet: "Dompet",
    navProfile: "Profil",
    // home
    goodMorning: "Selamat pagi",
    goodAfternoon: "Selamat siang",
    goodEvening: "Selamat malam",
    liveNow: "LIVE",
    availabilityNow: "Ketersediaan sekarang",
    slotsFree: "slot kosong",
    of: "dari",
    level: "Kepadatan",
    low: "Sepi",
    medium: "Sedang",
    high: "Padat",
    findSlot: "Cari Slot",
    scanQr: "Scan QR",
    viewForTime: "Lihat ketersediaan untuk",
    date: "Tanggal",
    startTime: "Mulai",
    endTime: "Selesai",
    today: "Hari ini",
    advance: "Advance",
    walkIn: "Walk-in",
    fullMap: "Peta lengkap",
    openMap: "Buka peta lengkap",
    heatmap: "Heatmap permintaan",
    heatmapSub: "Rata-rata okupansi 4 minggu terakhir",
    busiest: "Tersibuk",
    quietest: "Paling sepi",
    tapSlotHint: "Ketuk slot hijau untuk booking",
    // availability search
    searchSlots: "Cari Slot",
    searchResults: "Hasil ketersediaan",
    slotsFound: "slot kosong",
    noSlotsFound: "Semua slot penuh di jadwal ini",
    noSlotsFoundSub: "Coba tanggal atau jam yang lain",
    tapChipToBook: "Ketuk nomor slot untuk booking",
    windowLabel: "Jendela waktu",
    // map
    parkingMap: "Peta Parkir",
    floorLabel: "LANTAI 1 — GEDUNG PARKIR ANGGREK",
    floorLabelOpen: "LANTAI 1 — AREA PARKIR",
    slotWord: "slot",
    available: "Kosong",
    reserved: "Terbooking",
    occupied: "Terisi",
    maintenance: "Perawatan",
    entranceLabel: "MASUK",
    exitLabel: "KELUAR",
    rampLabel: "RAMP B2",
    liftLabel: "LIFT",
    wcLabel: "WC",
    legend: "Legenda",
    mapNote: "Mobil masuk lewat kanan-atas → pilih slot · Scan QR di slot untuk check-in & keluar",
    mapNoteOpen: "Mobil masuk lewat gerbang kiri → pilih slot · Keluar lewat gerbang kanan",
    scrollHint: "Geser untuk melihat semua slot",
    // booking
    bookSlot: "Booking Slot",
    bookType: "Tipe booking",
    chooseVehicle: "Pilih kendaraan",
    summary: "Ringkasan",
    serviceFee: "Biaya layanan",
    walletBalance: "Saldo dompet",
    balanceAfter: "Saldo setelahnya",
    payAndBook: "Bayar & Booking",
    insufficient: "Saldo tidak cukup — top up dulu di Dompet",
    bookSuccess: "Booking berhasil",
    window: "Jendela waktu",
    vehicle: "Kendaraan",
    plate: "Plat",
    // ticket
    parkingPass: "PARKING PASS",
    passTitle: "Pass parkir digital",
    showPass: "Tunjukkan pass ini ke petugas saat masuk & keluar area parkir",
    checkIn: "Check-in di sini",
    scanExit: "Scan untuk keluar",
    checkOutBtn: "Selesaikan & Keluar",
    checkoutConfirmTitle: "Selesaikan sesi parkir?",
    checkoutConfirmDesc: "Tidak ada biaya parkir — hanya denda keterlambatan (jika telat) yang ditagih dari saldo dompetmu.",
    onTimeFree: "Masih sesuai jadwal — tanpa biaya tambahan",
    estOvertime: "Estimasi denda telat",
    totalDue: "Total ditagih",
    cancelBooking: "Batalkan booking",
    cancelConfirmTitle: "Batalkan booking ini?",
    cancelConfirmDesc: "Kamu akan menerima refund sesuai kebijakan.",
    refundYouGet: "Refund kamu",
    sessionActive: "Sesi parkir aktif",
    sessionDone: "Sesi selesai",
    overtimeNote: "Denda telat Rp5.000/jam jika keluar lewat jadwal",
    // history
    historyTitle: "Riwayat",
    filterAll: "Semua",
    filterUpcoming: "Mendatang",
    filterActive: "Aktif",
    filterDone: "Selesai",
    fullRefundEnds: "Refund 100% berakhir dalam",
    emptyHistory: "Belum ada reservasi",
    emptyHistorySub: "Booking pertamamu akan muncul di sini",
    // statuses
    stConfirmed: "Terkonfirmasi",
    stCheckedIn: "Sedang parkir",
    stCompleted: "Selesai",
    stCancelled: "Dibatalkan",
    stNoShow: "No-show",
    stExpired: "Kedaluwarsa",
    // wallet
    walletTitle: "Dompet",
    topUp: "Top up",
    balanceLabel: "Saldo tersedia",
    transactions: "Transaksi",
    todayLabel: "Hari ini",
    earlierLabel: "Sebelumnya",
    emptyTxn: "Belum ada transaksi",
    topUpSuccess: "Top up berhasil",
    // txns
    tTopUp: "Top up dompet",
    tServiceFee: "Biaya layanan parkir",
    tOvertime: "Denda telat",
    tRefund: "Refund pembatalan",
    // profile
    profileTitle: "Profil",
    binusian: "BINUSIAN",
    myVehicles: "Kendaraanku",
    addVehicle: "Tambah kendaraan",
    addVehicleTitle: "Tambah Kendaraan",
    addVehicleSub: "Kendaraan memudahkan petugas mengenali mobil & motormu",
    editVehicle: "Edit kendaraan",
    editVehicleTitle: "Edit Kendaraan",
    editVehicleSub: "Perbarui detail kendaraanmu",
    fNickname: "Nama panggilan",
    fNicknamePh: "mis. Motor Kampus",
    fPlate: "Plat nomor",
    fPlatePh: "B 1234 XYZ",
    fPlateHint: "Format plat Indonesia, mis. B 1234 XYZ",
    fBrand: "Merek",
    fBrandPh: "mis. Honda",
    fModel: "Model",
    fModelPh: "mis. Vario 160",
    fColor: "Warna",
    fColorPh: "mis. Hitam",
    vehicleSaved: "Kendaraan ditambahkan",
    vehicleUpdated: "Kendaraan diperbarui",
    vehicleRemoved: "Kendaraan dihapus",
    removeVehicle: "Hapus kendaraan",
    removeConfirm: "Hapus kendaraan ini?",
    plateRequired: "Plat nomor wajib diisi",
    nicknameRequired: "Nama panggilan wajib diisi",
    save: "Simpan",
    remove: "Hapus",
    preferences: "Preferensi",
    language: "Bahasa",
    appearance: "Tampilan",
    darkMode: "Mode gelap",
    signOut: "Keluar",
    memberSince: "Anggota sejak",
    totalSessions: "Total sesi",
    // scanner
    scannerTitle: "Scan QR Slot",
    scannerHint: "Arahkan kamera ke QR permanen yang terpasang di tiap slot",
    orEnterCode: "atau ketik kode slot",
    codePlaceholder: "mis. A-07",
    scanGo: "Scan",
    scanPick: "Pilih slot di bawah untuk simulasi",
    walkinOk: "Sesi walk-in dimulai",
    scanDenied: "Scan ditolak",
    badCode: "Kode tidak dikenali",
    slotBusy: "Slot sedang terisi",
    checkinOk: "Check-in berhasil — selamat parkir",
    checkoutOk: "Berhasil keluar — sampai jumpa",
    // operator
    operatorBadge: "OPERATOR",
    operatorGreeting: "Shift kamu aktif",
    liveMonitor: "Monitor slot — live",
    inBuilding: "Sedang di dalam",
    reservedNow: "Terbooking",
    inMaintenance: "Perawatan",
    activeSessionsTitle: "Sesi parkir aktif",
    noActiveSessions: "Tidak ada kendaraan yang sedang parkir",
    sinceLabel: "sejak",
    revenueToday: "Pendapatan hari ini",
    txnsToday: "Transaksi hari ini",
    slotDetail: "Detail slot",
    slotEmptyState: "Slot kosong",
    occupantLabel: "Penghuni",
    vehicleLabel: "Kendaraan",
    markMaintenance: "Tandai perawatan",
    backToService: "Kembalikan aktif",
    maintenanceDone: "Slot masuk perawatan",
    reactivated: "Slot kembali aktif",
    signInOperator: "Masuk sebagai Operator",
    operatorName: "Andi Wijaya",
    operatorShift: "Petugas Parkir Anggrek · Shift Pagi",
    reservedBy: "Dibooking",
    // operator command center
    opTabMonitor: "Monitor",
    opTabQr: "QR Slot",
    opTabHistory: "Riwayat",
    opSearchPh: "Cari plat, nama, slot, atau kode…",
    opSearchResults: "Hasil pencarian",
    opSearchNone: "Tidak ada yang cocok",
    occupancyTitle: "Okupansi Live",
    occupancyFilled: "terisi",
    shiftStatsTitle: "Statistik Shift",
    shiftCheckins: "Masuk",
    shiftCheckouts: "Keluar",
    shiftAvgStay: "Rata-rata",
    revenueHourTitle: "Pendapatan per Jam",
    revenueHourSub: "Hari ini · layanan & denda",
    peakChip: "Puncak",
    busyTitle: "Jam Sibuk",
    busySub: "Check-in · 7 hari terakhir",
    feedTitle: "Aktivitas Live",
    feedEmpty: "Belum ada aktivitas",
    evCheckin: "check-in",
    evCheckout: "check-out",
    evBooking: "reservasi baru",
    evTopup: "top-up saldo",
    upcomingTitle: "Reservasi Hari Ini",
    upcomingEmpty: "Tidak ada reservasi hari ini",
    btnManualIn: "Check-in",
    btnExtend: "+1 Jam",
    btnForce: "Akhiri",
    extendOk: "Window parkir diperpanjang 1 jam",
    extendFail: "Tidak bisa memperpanjang — slot sudah dipesan atau sudah jam tutup",
    forceOk: "Sesi diakhiri — biaya dicatat",
    manualInOk: "Check-in manual berhasil",
    recapTitle: "Ringkasan Hari Ini",
    recapVehicles: "Kendaraan dilayani",
    recapPeak: "Okupansi puncak",
    recapLongest: "Parkir terlama",
    completedTodayTitle: "Sesi Selesai Hari Ini",
    completedEmpty: "Belum ada sesi selesai",
    txnLogTitle: "Log Transaksi",
    // slot QR (operator)
    qrSlotsTitle: "QR Slot Parkir",
    qrSlotsSub: "{n} QR unik — satu untuk tiap slot, dipasang permanen",
    qrPrintAll: "Cetak Semua",
    qrPrintHint: "A4 · {p} halaman · 8 kartu per halaman",
    qrDownload: "Unduh PNG",
    qrCardHint: "Scan untuk check-in & keluar",
    qrCodeLabel: "Kode slot",
    qrLocation: "Gedung Parkir Anggrek · Lantai 1",
    qrPrintBrand: "Tempel QR ini di tiap slot parkir",
    qrSaved: "QR diunduh",
    // extend session (customer ticket)
    extendBtn: "Perpanjang +1 Jam",
    extendHint: "Jendela +1 jam — bebas denda jika keluar sebelum jadwal baru",
    // notification center
    notifTitle: "Notifikasi",
    notifEmpty: "Belum ada notifikasi",
    notifEmptySub: "Update sesi parkir, struk, dan promo akan muncul di sini",
    notifMarkAll: "Tandai dibaca",
    notifClearAll: "Hapus semua",
    notifUnreadAria: "Notifikasi belum dibaca",
    notifJustNow: "baru saja",
    notifMinAgo: "{m} mnt lalu",
    notifHourAgo: "{h} jam lalu",
    notifDayAgo: "{d} hari lalu",
    notifKWelcomeTitle: "Selamat datang di Parkir Binus",
    notifKWelcomeBody: "Update sesi parkir, struk, dan promo akan muncul di sini.",
    notifKBookingTitle: "Booking dikonfirmasi",
    notifKBookingBody: "Slot {slot} ({code}) — jangan lupa check-in di lokasi.",
    notifKSessionStartTitle: "Sesi parkir dimulai",
    notifKSessionStartBody: "Slot {slot} aktif hingga {end}. Selamat parkir!",
    notifKSessionEndSoonTitle: "Sesi segera berakhir",
    notifKSessionEndSoonBody: "Slot {slot} berakhir dalam {minutes} menit — perpanjang atau keluar tepat waktu.",
    notifKOvertimeTitle: "Lembur berjalan",
    notifKOvertimeBody: "Sesi {slot} melewati jadwal — Rp5.000/jam ditagih saat keluar.",
    notifKExtendedTitle: "Sesi diperpanjang",
    notifKExtendedBody: "Slot {slot} kini berlaku hingga {end}.",
    notifKReceiptTitle: "Sesi selesai",
    notifKReceiptBody: "Slot {slot} selesai — total {total}. Rincian tersimpan di Riwayat.",
    notifKRefundTitle: "Refund diterima",
    notifKRefundBody: "{amount} dikembalikan untuk {code}.",
    notifKPromoTitle: "Promo kampus",
    notifKPromoBody: "Kopi Rp15.000 di Fusion Cafe — tunjukkan pass parkirmu.",
    // operator csv export
    csvExport: "Ekspor CSV",
    csvExportTitle: "Laporan Operasional",
    csvExported: "Laporan CSV diunduh",
    // campus picker
    campusCurrent: "Kampus aktif",
    campusPick: "Pilih Kampus",
    campusPickSub: "Pilih lokasi kampus untuk melihat parkir",
    campusPickNote: "Kampus Coming Soon bisa dipilih — layout parkir menyusul",
    campusActive: "Aktif",
    campusSoon: "Coming Soon",
    campusSoonNote: "Layout & jumlah slot parkir sedang disiapkan",
    campusSoonHeroSub:
      "Sistem reservasi parkir untuk kampus ini sedang disiapkan. Sementara itu, pilih kampus lain yang sudah aktif.",
    campusSeeOthers: "Lihat Kampus Lain",
    campusSwitched: "Kampus aktif diganti",
    scanSoonNote:
      "Scan slot tersedia setelah layout parkir kampus ini siap. Kembali ke Beranda untuk memilih kampus lain.",
    // dynamic pricing
    dynTitle: "Harga Dinamis",
    dynLow: "Low demand",
    dynNormal: "Normal",
    dynHigh: "High demand",
    dynReserve: "Reserve",
    dynWalkin: "Walk-in",
    dynOvertime: "Overtime",
    dynOccupiedPct: "parkir terisi",
    dynAutoNote: "tier otomatis dari okupansi real-time",
    dynNextLow: "Naik ke Normal di 40%",
    dynNextNormal: "Naik ke High di atas 75%",
    dynNextHigh: "Turun ke Normal di 75%",
    dynBannerLow: "Harga lebih hemat — parkir sedang sepi",
    dynBannerNormal: "Harga standar — okupansi normal",
    dynBannerHigh: "Harga lebih tinggi — parkir hampir penuh",
    dynPriceNote: "Harga menyesuaikan permintaan secara real-time",
    dynWalkinNow: "Tarif walk-in saat ini",
    // operator tabs (v23–v24)
    opTabHarga: "Harga",
    opTabAnalytics: "Analitik",
    opTabFinance: "Keuangan",
    opTabAudit: "Audit",
    opTabSystem: "Sistem",
    viaTicket: "via tiket",
    viaScan: "via scan",
    opGuests: "tamu",
    // live gate stream (v23)
    liveTitle: "Live Gate Stream",
    liveSub: "Simulasi WebSocket gerbang · tamu tidak pernah menyentuh data nyata",
    liveToggle: "Sambungkan",
    liveDisconnect: "Putuskan",
    liveConnecting: "Menghubungkan…",
    liveOffline: "OFFLINE",
    liveTransport: "Transport",
    liveTransportVal: "wss://gate.parkir.binus.ac.id/stream",
    liveUptime: "Uptime",
    liveEvents: "Event",
    liveLatency: "Latensi rata-rata",
    liveReconnects: "Reconnect",
    liveStreamTitle: "Aliran event gerbang",
    liveGuestLegend: "TAMU",
    liveMapNote: "Cincin kuning = tamu live",
    liveTickerIn: "masuk",
    liveTickerOut: "keluar",
    liveNote: "Tamu live hanya overlay — tidak mengubah reservasi, transaksi, atau jurnal.",
    // finance (v23)
    finKpiRevenue: "Pendapatan bersih",
    finKpiSessions: "Sesi berbayar",
    finKpiArpu: "ARPU",
    finKpiFineRatio: "Rasio denda",
    finJournalTitle: "Jurnal Ganda (Double-Entry)",
    finJournalSub: "Setiap transaksi = Debit & Kredit yang seimbang",
    finDr: "Debit",
    finCr: "Kredit",
    finTrialTitle: "Neraca Saldo",
    finTrialBalanced: "SEIMBANG",
    finEquation: "Persamaan akuntansi: Kas − Utang = Laba",
    finWaterfallTitle: "Air Terjun Laba",
    finWaterfallSub: "Layanan → Denda → Refund → Laba",
    finWfService: "Layanan",
    finWfFine: "Denda",
    finWfRefund: "Refund",
    finWfProfit: "Laba",
    finBepTitle: "Titik Impas (BEP)",
    finBepFixed: "Biaya tetap / bulan",
    finBepVar: "Biaya variabel / sesi",
    finBepCm: "Margin kontribusi",
    finBepSessions: "sesi / bulan",
    finBepRunrate: "Run-rate saat ini",
    finBepSafety: "Margin aman",
    finBepNever: "CM ≤ 0 — tidak pernah impas",
    // invoice & PPN (v24)
    invTitle: "Faktur & PPN 11%",
    invRecapInvoices: "Faktur",
    invRecapDpp: "Total DPP",
    invRecapPpn: "PPN Keluaran",
    invRecapMonth: "Bulan ini",
    invNumber: "No. Faktur",
    invBillTo: "Ditagihkan kepada",
    invItem: "Item",
    invItemVal: "Biaya layanan parkir",
    invPaid: "LUNAS",
    invDpp: "DPP",
    invPpn: "PPN 11%",
    invTotal: "Total",
    invMethodNote: "DPP = Total ÷ 1,11 · PPN = Total − DPP · Jurnal tetap kotor (gross)",
    // cashflow (v24)
    cfTitle: "Proyeksi Arus Kas · 14 Hari",
    cfKpiTotal: "Proyeksi 14 hari",
    cfKpiAvg: "Rata-rata / hari",
    cfKpiDelta: "Δ vs 14 hari lalu",
    cfActual: "Aktual",
    cfForecast: "Proyeksi",
    cfBand: "Rentang 90%",
    cfMethod: "Profil mingguan + EWMA (α=0,3) · pita ±1,645σ residu",
    // audit (v23)
    auditSessionTitle: "Sesi Aktif",
    auditSessionId: "ID Sesi",
    auditActor: "Aktor",
    auditIp: "Alamat IP",
    auditSso: "SSO Microsoft",
    auditAppendNote: "Log bersifat append-only — entri tidak dapat diubah atau dihapus.",
    auditLogTitle: "Log Audit",
    auditFilterAll: "Semua",
    auditFilterOps: "Aksi operator",
    auditFilterWarn: "Peringatan",
    auditEmpty: "Belum ada entri",
    auditTarget: "Target",
    aSignIn: "Masuk akun",
    aSignOut: "Keluar akun",
    aBookingCreated: "Booking dibuat",
    aBookingCancelled: "Booking dibatalkan",
    aRefundIssued: "Refund diterbitkan",
    aCheckIn: "Check-in",
    aCheckOut: "Check-out",
    aWalkInStarted: "Sesi walk-in dimulai",
    aForceCheckout: "Paksa akhiri sesi",
    aSessionExtended: "Sesi diperpanjang",
    aManualCheckin: "Check-in manual",
    aTopUp: "Top up dompet",
    aSlotMaintenance: "Slot masuk perawatan",
    aSlotReactivated: "Slot kembali aktif",
    aCampusSwitched: "Kampus diganti",
    aPromoBroadcast: "Broadcast promo",
    aProfileUpdate: "Perbarui profil",
    // API docs (v24)
    apiTitle: "Dokumentasi API",
    apiSub: "8 endpoint REST · respons GET dibangun live dari state aplikasi",
    apiBaseUrl: "Base URL",
    apiBaseUrlVal: "https://api.parkir.binus.ac.id/v1",
    apiAuth: "Autentikasi",
    apiAuthVal: "X-API-Key + Bearer token",
    apiRate: "Batas laju",
    apiRateVal: "60 req/menit",
    apiErrors: "Kode error",
    apiErrorsVal: "400 · 401 · 403 · 404 · 429",
    apiPlayground: "Playground interaktif",
    apiRun: "Jalankan",
    apiRunning: "Menjalankan…",
    apiCurl: "Pratinjau cURL",
    apiSimNote: "Endpoint tulis (POST) bersifat simulasi — state aplikasi tidak pernah berubah.",
    apiStatus: "Status",
    apiLatency: "Latensi",
    epSlots: "Status semua slot kampus aktif",
    epAvailability: "Ketersediaan & harga dinamis",
    epPostRes: "Buat reservasi (simulasi)",
    epGetRes: "Daftar reservasi",
    epFinance: "Ringkasan keuangan + neraca saldo",
    epJournal: "Jurnal ganda",
    epLive: "Event live terbaru",
    epHealth: "Health check sistem",
    // architecture & ERD & stack (v24)
    archTitle: "Arsitektur Sistem",
    archClients: "Klien",
    archClientsVal: "PWA Pelanggan · Konsol Operator · Kamera ANPR",
    archEdge: "Edge & Real-time",
    archEdgeVal: "Edge Gateway · WebSocket Hub (WSS · 3,4 dtk)",
    archApp: "Aplikasi Next.js 16",
    archAppVal: "App Router · Store Zustand · Modul Domain",
    archData: "Data",
    archDataVal: "Store In-Memory · Prisma (siap DB) · Ekspor CSV",
    erdTitle: "Diagram ER · 8 Entitas",
    erdNote: "LIVE_EVENT hanya tampilan — tidak pernah menulis ke entitas lain.",
    erdCardinality: "1 : n",
    stackTitle: "Tech Stack",
    chgTitle: "Changelog",
    chgV18: "Dataset analitik 30-hari deterministik + forecast Holt-Winters",
    chgV19: "Konsol ANPR + broadcast promo operator",
    chgV20: "Tembok & gerbang pada peta gedung",
    chgV21: "Ramp L2 pada denah",
    chgV22: "Model harga baru: tanpa biaya parkir — hanya biaya layanan dinamis + denda telat",
    chgV23: "Live gate stream · jejak audit append-only · jurnal ganda + neraca saldo + BEP",
    chgV24: "Dokumentasi API + playground · ERD & arsitektur · faktur PPN 11% · proyeksi arus kas",
    chgV25: "Dropdown merek mobil (25 merek) · ramp L2 seamless · top up nominal bebas · tiket ivory · edit profil",
    chgV26: "Top up VA / Kartu / QRIS · notifikasi H-30 menit + perpanjang cepat · ganti foto profil",
    // ANPR (v19)
    anprTitle: "Konsol ANPR",
    anprSub: "Simulasi pipeline kamera → OCR plat → keputusan gerbang",
    anprPlate: "Plat terbaca",
    anprConfidence: "Keyakinan",
    anprDecision: "Keputusan",
    anprAllow: "BUKA GERBANG",
    anprDeny: "TOLAK",
    anprLog: "Log pengenalan",
    anprScan: "Simulasikan mobil lewat",
    // promo broadcast (v19)
    promoTitle: "Broadcast Promo",
    promoSub: "Kirim promo kampus ke semua pengguna aktif",
    promoSend: "Kirim promo",
    promoSent: "Promo dikirim ke semua pengguna",
    // analytics (v18/v22)
    anaKpiSessions: "Sesi / 30 hari",
    anaKpiRevenue: "Pendapatan / 30 hari",
    anaKpiOccupancy: "Okupansi rata-rata",
    anaKpiMape: "MAPE model",
    anaHeatmapTitle: "Heatmap Okupansi",
    anaHeatmapSub: "30 hari · 07:00–21:00",
    anaForecastTitle: "Forecast Okupansi · 48 Jam",
    anaForecastSub: "Holt-Winters aditif · musiman harian",
    anaModelCard: "Model Card",
    anaMcMethod: "Metode",
    anaMcMethodVal: "Holt-Winters aditif (level + tren + musiman 24 jam)",
    anaMcFeatures: "Fitur",
    anaMcFeaturesVal: "Okupansi per jam · hari dalam minggu · profil mingguan",
    anaMcMape: "MAPE (in-sample)",
    anaMcLimit: "Limitasi",
    anaMcLimitText: "Data sintetis deterministik; belum divalidasi pada data riil; akurasi menurun di horizon >48 jam.",
    anaAnomalyTitle: "Anomali Okupansi · Z-Score",
    anaAnomalyEmpty: "Tidak ada anomali terdeteksi",
    anaRevenueTitle: "Pendapatan Harian",
    anaRevenueSub: "Layanan & denda · 30 hari",
    anaWhatIfTitle: "Simulator What-If Tarif",
    anaWhatIfSub: "Geser harga per tier → lihat dampak pendapatan 30 hari",
    anaWhatIfLow: "Harga Reserve LOW",
    anaWhatIfNormal: "Harga Reserve NORMAL",
    anaWhatIfHigh: "Harga Reserve HIGH",
    anaWhatIfBase: "Aktual 30 hari",
    anaWhatIfSim: "Simulasi",
    anaCsv: "Unduh CSV",
    anaHour: "Jam",
    // brand & body picker (v25)
    brandSearchPh: "Cari merek… mis. Honda",
    brandOther: "Lainnya (tulis sendiri)",
    brandOtherPh: "Tulis merek kendaraanmu",
    brandRequired: "Pilih merek kendaraan",
    fBodyType: "Tipe bodi",
    // wallet custom top-up (v25)
    topUpCustom: "Nominal lain",
    topUpCustomPh: "mis. 75.000",
    topUpMinErr: "Minimal top up Rp10.000",
    topUpMaxErr: "Maksimal top up Rp10.000.000",
    // edit profile (v25)
    editProfile: "Edit Profil",
    editProfileTitle: "Edit Data Diri",
    epName: "Nama lengkap",
    epEmail: "Email",
    epPhone: "No. HP",
    epNim: "NIM",
    epNameReq: "Nama wajib diisi",
    epEmailReq: "Email wajib diisi",
    epEmailInvalid: "Format email tidak valid",
    epPhoneInvalid: "Format no. HP tidak valid",
    epNimInvalid: "NIM harus 8–10 digit",
    profileSaved: "Profil diperbarui",
    // payments (v26)
    payDialogTitle: "Pilih Metode Top Up",
    payDialogSub: "Simulasi gateway pembayaran — Virtual Account, Kartu, atau QRIS",
    payVa: "Virtual Account",
    payVaSub: "8 bank · BCA, Mandiri, BNI, BRI, dll.",
    payCard: "Kartu Kredit / Debit",
    payCardSub: "Visa · Mastercard · JCB",
    payQris: "QRIS",
    payQrisSub: "GoPay · OVO · DANA · ShopeePay · m-banking",
    payVaPickBank: "Pilih bank penerbit",
    payVaNumber: "Nomor Virtual Account",
    payVaHowTo: "Buka m-banking → Transfer → Virtual Account → masukkan nomor di samping",
    payVaExpires: "Berlaku hingga",
    payCopy: "Salin",
    payCopied: "Nomor VA disalin",
    payVaCheck: "Saya sudah bayar",
    payCardNumber: "Nomor kartu",
    payCardName: "Nama di kartu",
    payCardExpiry: "MM/YY",
    payCardCvv: "CVV",
    payCardInvalid: "Nomor kartu tidak valid",
    payCardNameErr: "Nama minimal 3 karakter",
    payCardExpErr: "Tanggal kedaluwarsa tidak valid",
    payCardCvvErr: "CVV harus 3 digit",
    payQrisTitle: "Scan dengan aplikasi apa pun",
    payQrisMerchant: "PARKIR BINUS KEMANGGISAN",
    payProcessing: "Memproses pembayaran…",
    payDone: "Top up berhasil",
    // ending soon (v26)
    endSoonTitle: "Waktu parkir hampir habis",
    endSoonBody: "Slot {slot} berakhir dalam {minutes} menit — perpanjang sekarang agar bebas denda.",
    endSoonToast: "Sesi {slot} berakhir dalam {minutes} menit",
    // avatar (v26)
    avatarChange: "Ganti foto profil",
    avatarRemove: "Hapus foto",
    avatarTooBig: "Ukuran maksimal 2 MB",
    avatarBadType: "Gunakan PNG, JPG, atau WebP",
    // misc
    cancel: "Batal",
    back: "Kembali",
    close: "Tutup",
    error: "Terjadi kesalahan",
  },
  en: {
    appName: "Parkir Binus",
    tagline: "Campus parking — a spot, guaranteed",
    heroTitle: "Parking, minus the drama.",
    heroSub: "Reserve your favorite slot at Anggrek Parking Building, scan the QR to enter & exit. Done.",
    signIn: "Sign in with Microsoft",
    msSignIn: "Sign in with Microsoft",
    msOrDemo: "or pick a demo account",
    msModalTitle: "Sign in",
    msModalFor: "to continue to Parkir Binus",
    msModalSub: "Use your campus Microsoft account (@binus.ac.id)",
    msContinue: "Continue",
    msWorking: "Verifying account…",
    msDemoNote: "Demo — Microsoft SSO simulated",
    msVerified: "Verified BINUSIAN",
    signInNote: "@binus.ac.id Microsoft accounts are detected as BINUSIAN · other emails = non-BINUSIAN",
    demoAccounts: "Pick a demo account",
    student: "BINUS student",
    general: "General user",
    nonBinusian: "NON-BINUSIAN",
    binusianOnly: "BINUSIAN only",
    guestBookingNote: "Scheduled booking is BINUSIAN-only. Guests can still park — scan the on-site slot QR for a walk-in session.",
    maxActiveToast: "Limit reached — max 2 vehicles parked at once",
    activeSessions: "parked now",
    footerNote: "UI preview — simulated data",
    navHome: "Home",
    navHistory: "History",
    navWallet: "Wallet",
    navProfile: "Profile",
    goodMorning: "Good morning",
    goodAfternoon: "Good afternoon",
    goodEvening: "Good evening",
    liveNow: "LIVE",
    availabilityNow: "Availability now",
    slotsFree: "slots free",
    of: "of",
    level: "Crowd",
    low: "Quiet",
    medium: "Moderate",
    high: "Packed",
    findSlot: "Find a slot",
    scanQr: "Scan QR",
    viewForTime: "View availability for",
    date: "Date",
    startTime: "Start",
    endTime: "End",
    today: "Today",
    advance: "Advance",
    walkIn: "Walk-in",
    fullMap: "Full map",
    openMap: "Open full map",
    heatmap: "Demand heatmap",
    heatmapSub: "Average occupancy, last 4 weeks",
    busiest: "Busiest",
    quietest: "Quietest",
    tapSlotHint: "Tap a green slot to book",
    // availability search
    searchSlots: "Find a slot",
    searchResults: "Availability results",
    slotsFound: "slots free",
    noSlotsFound: "All slots are full for this schedule",
    noSlotsFoundSub: "Try another date or time",
    tapChipToBook: "Tap a slot number to book",
    windowLabel: "Time window",
    parkingMap: "Parking Map",
    floorLabel: "LEVEL 1 — ANGGREK PARKING BUILDING",
    floorLabelOpen: "LEVEL 1 — PARKING AREA",
    slotWord: "slots",
    available: "Free",
    reserved: "Booked",
    occupied: "Occupied",
    maintenance: "Maintenance",
    entranceLabel: "ENTER",
    exitLabel: "EXIT",
    rampLabel: "RAMP B2",
    liftLabel: "LIFT",
    wcLabel: "WC",
    legend: "Legend",
    mapNote: "Cars enter top-right → pick a slot · Scan the slot QR to check in & out",
    mapNoteOpen: "Cars enter through the left gate → pick a bay · Exit through the right gate",
    scrollHint: "Swipe to see all slots",
    bookSlot: "Book Slot",
    bookType: "Booking type",
    chooseVehicle: "Choose vehicle",
    summary: "Summary",
    serviceFee: "Service fee",
    walletBalance: "Wallet balance",
    balanceAfter: "Balance after",
    payAndBook: "Pay & Book",
    insufficient: "Insufficient balance — top up in Wallet first",
    bookSuccess: "Booking confirmed",
    window: "Time window",
    vehicle: "Vehicle",
    plate: "Plate",
    parkingPass: "PARKING PASS",
    passTitle: "Digital parking pass",
    showPass: "Show this pass to the officer when entering & leaving",
    checkIn: "Check in here",
    scanExit: "Scan to exit",
    checkOutBtn: "Finish & Exit",
    checkoutConfirmTitle: "End parking session?",
    checkoutConfirmDesc: "No parking fee — only a late fine (if any) is charged from your wallet.",
    onTimeFree: "Still on schedule — no extra charge",
    estOvertime: "Estimated late fine",
    totalDue: "Total charged",
    cancelBooking: "Cancel booking",
    cancelConfirmTitle: "Cancel this booking?",
    cancelConfirmDesc: "You'll receive a refund per policy.",
    refundYouGet: "Your refund",
    sessionActive: "Active session",
    sessionDone: "Session complete",
    overtimeNote: "Rp5,000/h late fine if you leave past your window",
    historyTitle: "History",
    filterAll: "All",
    filterUpcoming: "Upcoming",
    filterActive: "Active",
    filterDone: "Done",
    fullRefundEnds: "100% refund ends in",
    emptyHistory: "No reservations yet",
    emptyHistorySub: "Your first booking will show up here",
    stConfirmed: "Confirmed",
    stCheckedIn: "Parked",
    stCompleted: "Completed",
    stCancelled: "Cancelled",
    stNoShow: "No-show",
    stExpired: "Expired",
    walletTitle: "Wallet",
    topUp: "Top up",
    balanceLabel: "Available balance",
    transactions: "Transactions",
    todayLabel: "Today",
    earlierLabel: "Earlier",
    emptyTxn: "No transactions yet",
    topUpSuccess: "Top up successful",
    tTopUp: "Wallet top-up",
    tServiceFee: "Parking service fee",
    tOvertime: "Late fine",
    tRefund: "Cancellation refund",
    profileTitle: "Profile",
    binusian: "BINUSIAN",
    myVehicles: "My vehicles",
    addVehicle: "Add vehicle",
    addVehicleTitle: "Add Vehicle",
    addVehicleSub: "Vehicles help staff recognize your car & motorbike",
    editVehicle: "Edit vehicle",
    editVehicleTitle: "Edit Vehicle",
    editVehicleSub: "Update your vehicle details",
    fNickname: "Nickname",
    fNicknamePh: "e.g. Campus Bike",
    fPlate: "License plate",
    fPlatePh: "B 1234 XYZ",
    fPlateHint: "Indonesian plate format, e.g. B 1234 XYZ",
    fBrand: "Brand",
    fBrandPh: "e.g. Honda",
    fModel: "Model",
    fModelPh: "e.g. Vario 160",
    fColor: "Color",
    fColorPh: "e.g. Black",
    vehicleSaved: "Vehicle added",
    vehicleUpdated: "Vehicle updated",
    vehicleRemoved: "Vehicle removed",
    removeVehicle: "Remove vehicle",
    removeConfirm: "Remove this vehicle?",
    plateRequired: "License plate is required",
    nicknameRequired: "Nickname is required",
    save: "Save",
    remove: "Remove",
    preferences: "Preferences",
    language: "Language",
    appearance: "Appearance",
    darkMode: "Dark mode",
    signOut: "Sign out",
    memberSince: "Member since",
    totalSessions: "Total sessions",
    // scanner
    scannerTitle: "Scan Slot QR",
    scannerHint: "Point the camera at the permanent QR mounted on each slot",
    orEnterCode: "or type a slot code",
    codePlaceholder: "e.g. A-07",
    scanGo: "Scan",
    scanPick: "Pick a slot below to simulate",
    walkinOk: "Walk-in session started",
    scanDenied: "Scan rejected",
    badCode: "Unknown code",
    slotBusy: "Slot is occupied",
    checkinOk: "Checked in — happy parking",
    checkoutOk: "Checked out — see you soon",
    operatorBadge: "OPERATOR",
    operatorGreeting: "Your shift is active",
    liveMonitor: "Slot monitor — live",
    inBuilding: "Currently in",
    reservedNow: "Booked",
    inMaintenance: "Maintenance",
    activeSessionsTitle: "Active parking sessions",
    noActiveSessions: "No vehicles currently parked",
    sinceLabel: "since",
    revenueToday: "Revenue today",
    txnsToday: "Transactions today",
    slotDetail: "Slot detail",
    slotEmptyState: "Slot is free",
    occupantLabel: "Occupant",
    vehicleLabel: "Vehicle",
    markMaintenance: "Mark as maintenance",
    backToService: "Back in service",
    maintenanceDone: "Slot put into maintenance",
    reactivated: "Slot is back in service",
    signInOperator: "Sign in as Operator",
    operatorName: "Andi Wijaya",
    operatorShift: "Anggrek Parking Officer · Morning Shift",
    reservedBy: "Booked",
    // operator command center
    opTabMonitor: "Monitor",
    opTabQr: "Slot QR",
    opTabHistory: "History",
    opSearchPh: "Search plate, name, slot, or code…",
    opSearchResults: "Search results",
    opSearchNone: "No matches",
    occupancyTitle: "Live Occupancy",
    occupancyFilled: "filled",
    shiftStatsTitle: "Shift Statistics",
    shiftCheckins: "Check-ins",
    shiftCheckouts: "Check-outs",
    shiftAvgStay: "Avg stay",
    revenueHourTitle: "Revenue by Hour",
    revenueHourSub: "Today · service & fines",
    peakChip: "Peak",
    busyTitle: "Peak Hours",
    busySub: "Check-ins · last 7 days",
    feedTitle: "Live Activity",
    feedEmpty: "No activity yet",
    evCheckin: "checked in",
    evCheckout: "checked out",
    evBooking: "new booking",
    evTopup: "wallet top-up",
    upcomingTitle: "Today's Reservations",
    upcomingEmpty: "No reservations today",
    btnManualIn: "Check in",
    btnExtend: "+1 Hour",
    btnForce: "End",
    extendOk: "Parking window extended by 1 hour",
    extendFail: "Cannot extend — slot is booked or past closing time",
    forceOk: "Session ended — fees recorded",
    manualInOk: "Manual check-in successful",
    recapTitle: "Today's Recap",
    recapVehicles: "Vehicles served",
    recapPeak: "Peak occupancy",
    recapLongest: "Longest stay",
    completedTodayTitle: "Completed Today",
    completedEmpty: "No completed sessions yet",
    txnLogTitle: "Transaction Log",
    // slot QR (operator)
    qrSlotsTitle: "Slot QR Codes",
    qrSlotsSub: "{n} unique QRs — one per slot, mounted permanently",
    qrPrintAll: "Print All",
    qrPrintHint: "A4 · {p} pages · 8 cards per page",
    qrDownload: "Download PNG",
    qrCardHint: "Scan to check in & check out",
    qrCodeLabel: "Slot code",
    qrLocation: "Anggrek Parking Building · Level 1",
    qrPrintBrand: "Mount this QR on each parking slot",
    qrSaved: "QR downloaded",
    // extend session (customer ticket)
    extendBtn: "Extend +1 Hour",
    extendHint: "Window +1 hour — fine-free if you leave before the new time",
    // notification center
    notifTitle: "Notifications",
    notifEmpty: "No notifications yet",
    notifEmptySub: "Session updates, receipts and promos will appear here",
    notifMarkAll: "Mark all read",
    notifClearAll: "Clear all",
    notifUnreadAria: "Unread notifications",
    notifJustNow: "just now",
    notifMinAgo: "{m}m ago",
    notifHourAgo: "{h}h ago",
    notifDayAgo: "{d}d ago",
    notifKWelcomeTitle: "Welcome to Parkir Binus",
    notifKWelcomeBody: "Parking session updates, receipts and promos will appear here.",
    notifKBookingTitle: "Booking confirmed",
    notifKBookingBody: "Slot {slot} ({code}) — don't forget to check in on site.",
    notifKSessionStartTitle: "Parking started",
    notifKSessionStartBody: "Slot {slot} is yours until {end}. Happy parking!",
    notifKSessionEndSoonTitle: "Session ending soon",
    notifKSessionEndSoonBody: "Slot {slot} ends in {minutes} minutes — extend or leave on time.",
    notifKOvertimeTitle: "Overtime running",
    notifKOvertimeBody: "Slot {slot} is past its window — Rp5,000/hour charged at checkout.",
    notifKExtendedTitle: "Session extended",
    notifKExtendedBody: "Slot {slot} now runs until {end}.",
    notifKReceiptTitle: "Session complete",
    notifKReceiptBody: "Slot {slot} finished — total {total}. Details saved in History.",
    notifKRefundTitle: "Refund received",
    notifKRefundBody: "{amount} refunded for {code}.",
    notifKPromoTitle: "Campus promo",
    notifKPromoBody: "Rp15,000 coffee at Fusion Cafe — show your parking pass.",
    // operator csv export
    csvExport: "Export CSV",
    csvExportTitle: "Operations Report",
    csvExported: "CSV report downloaded",
    // campus picker
    campusCurrent: "Active campus",
    campusPick: "Select Campus",
    campusPickSub: "Pick a campus location to view parking",
    campusPickNote: "Coming Soon campuses are selectable — parking layout to follow",
    campusActive: "Active",
    campusSoon: "Coming Soon",
    campusSoonNote: "Parking layout & slot count are being prepared",
    campusSoonHeroSub:
      "The parking reservation system for this campus is being prepared. Meanwhile, pick another campus that's already active.",
    campusSeeOthers: "See Other Campuses",
    campusSwitched: "Active campus switched",
    scanSoonNote:
      "Slot scanning unlocks once this campus parking layout is ready. Head back to Home to pick another campus.",
    // dynamic pricing
    dynTitle: "Dynamic Pricing",
    dynLow: "Low demand",
    dynNormal: "Normal",
    dynHigh: "High demand",
    dynReserve: "Reserve",
    dynWalkin: "Walk-in",
    dynOvertime: "Overtime",
    dynOccupiedPct: "parking filled",
    dynAutoNote: "tier follows real-time occupancy",
    dynNextLow: "Up to Normal at 40%",
    dynNextNormal: "Up to High above 75%",
    dynNextHigh: "Down to Normal at 75%",
    dynBannerLow: "Cheaper rate — parking is quiet",
    dynBannerNormal: "Standard rate — normal occupancy",
    dynBannerHigh: "Higher rate — parking nearly full",
    dynPriceNote: "Prices adjust to demand in real time",
    dynWalkinNow: "Current walk-in rate",
    // operator tabs (v23–v24)
    opTabHarga: "Pricing",
    opTabAnalytics: "Analytics",
    opTabFinance: "Finance",
    opTabAudit: "Audit",
    opTabSystem: "System",
    viaTicket: "via ticket",
    viaScan: "via scan",
    opGuests: "guests",
    // live gate stream (v23)
    liveTitle: "Live Gate Stream",
    liveSub: "Simulated gate WebSocket · guests never touch real data",
    liveToggle: "Connect",
    liveDisconnect: "Disconnect",
    liveConnecting: "Connecting…",
    liveOffline: "OFFLINE",
    liveTransport: "Transport",
    liveTransportVal: "wss://gate.parkir.binus.ac.id/stream",
    liveUptime: "Uptime",
    liveEvents: "Events",
    liveLatency: "Avg latency",
    liveReconnects: "Reconnects",
    liveStreamTitle: "Gate event stream",
    liveGuestLegend: "GUEST",
    liveMapNote: "Yellow ring = live guest",
    liveTickerIn: "entered",
    liveTickerOut: "left",
    liveNote: "Live guests are overlay-only — they never change reservations, transactions, or the journal.",
    // finance (v23)
    finKpiRevenue: "Net revenue",
    finKpiSessions: "Paid sessions",
    finKpiArpu: "ARPU",
    finKpiFineRatio: "Fine ratio",
    finJournalTitle: "Double-Entry Journal",
    finJournalSub: "Every transaction = a balanced Debit & Credit",
    finDr: "Debit",
    finCr: "Credit",
    finTrialTitle: "Trial Balance",
    finTrialBalanced: "BALANCED",
    finEquation: "Accounting equation: Cash − Liability = Profit",
    finWaterfallTitle: "Profit Waterfall",
    finWaterfallSub: "Service → Fines → Refund → Profit",
    finWfService: "Service",
    finWfFine: "Fines",
    finWfRefund: "Refund",
    finWfProfit: "Profit",
    finBepTitle: "Break-Even Point",
    finBepFixed: "Fixed cost / month",
    finBepVar: "Variable cost / session",
    finBepCm: "Contribution margin",
    finBepSessions: "sessions / month",
    finBepRunrate: "Current run-rate",
    finBepSafety: "Safety margin",
    finBepNever: "CM ≤ 0 — never breaks even",
    // invoice & PPN (v24)
    invTitle: "Invoices & 11% VAT",
    invRecapInvoices: "Invoices",
    invRecapDpp: "Total DPP",
    invRecapPpn: "Output VAT",
    invRecapMonth: "This month",
    invNumber: "Invoice no.",
    invBillTo: "Bill to",
    invItem: "Item",
    invItemVal: "Parking service fee",
    invPaid: "PAID",
    invDpp: "DPP",
    invPpn: "VAT 11%",
    invTotal: "Total",
    invMethodNote: "DPP = Total ÷ 1.11 · VAT = Total − DPP · The journal stays gross",
    // cashflow (v24)
    cfTitle: "Cash Flow Projection · 14 Days",
    cfKpiTotal: "14-day projection",
    cfKpiAvg: "Daily average",
    cfKpiDelta: "Δ vs last 14 days",
    cfActual: "Actual",
    cfForecast: "Forecast",
    cfBand: "90% band",
    cfMethod: "Weekly profile + EWMA (α=0.3) · band ±1.645σ of residuals",
    // audit (v23)
    auditSessionTitle: "Active Session",
    auditSessionId: "Session ID",
    auditActor: "Actor",
    auditIp: "IP address",
    auditSso: "Microsoft SSO",
    auditAppendNote: "The log is append-only — entries cannot be edited or deleted.",
    auditLogTitle: "Audit Log",
    auditFilterAll: "All",
    auditFilterOps: "Operator actions",
    auditFilterWarn: "Warnings",
    auditEmpty: "No entries yet",
    auditTarget: "Target",
    aSignIn: "Signed in",
    aSignOut: "Signed out",
    aBookingCreated: "Booking created",
    aBookingCancelled: "Booking cancelled",
    aRefundIssued: "Refund issued",
    aCheckIn: "Check-in",
    aCheckOut: "Check-out",
    aWalkInStarted: "Walk-in started",
    aForceCheckout: "Force check-out",
    aSessionExtended: "Session extended",
    aManualCheckin: "Manual check-in",
    aTopUp: "Wallet top-up",
    aSlotMaintenance: "Slot put into maintenance",
    aSlotReactivated: "Slot back in service",
    aCampusSwitched: "Campus switched",
    aPromoBroadcast: "Promo broadcast",
    aProfileUpdate: "Profile updated",
    // API docs (v24)
    apiTitle: "API Documentation",
    apiSub: "8 REST endpoints · GET responses are built live from app state",
    apiBaseUrl: "Base URL",
    apiBaseUrlVal: "https://api.parkir.binus.ac.id/v1",
    apiAuth: "Authentication",
    apiAuthVal: "X-API-Key + Bearer token",
    apiRate: "Rate limit",
    apiRateVal: "60 req/min",
    apiErrors: "Error codes",
    apiErrorsVal: "400 · 401 · 403 · 404 · 429",
    apiPlayground: "Interactive playground",
    apiRun: "Run",
    apiRunning: "Running…",
    apiCurl: "cURL preview",
    apiSimNote: "Write endpoints (POST) are simulated — app state is never mutated.",
    apiStatus: "Status",
    apiLatency: "Latency",
    epSlots: "Live status of every slot on the active campus",
    epAvailability: "Availability & dynamic pricing",
    epPostRes: "Create a reservation (simulated)",
    epGetRes: "List reservations",
    epFinance: "Finance summary + trial balance",
    epJournal: "Double-entry journal",
    epLive: "Recent live events",
    epHealth: "System health check",
    // architecture & ERD & stack (v24)
    archTitle: "System Architecture",
    archClients: "Clients",
    archClientsVal: "Customer PWA · Operator Console · ANPR Camera",
    archEdge: "Edge & Real-time",
    archEdgeVal: "Edge Gateway · WebSocket Hub (WSS · 3.4s)",
    archApp: "Next.js 16 App",
    archAppVal: "App Router · Zustand Store · Domain Modules",
    archData: "Data",
    archDataVal: "In-memory Store · Prisma (DB-ready) · CSV export",
    erdTitle: "ER Diagram · 8 Entities",
    erdNote: "LIVE_EVENT is display-only — it never writes to other entities.",
    erdCardinality: "1 : n",
    stackTitle: "Tech Stack",
    chgTitle: "Changelog",
    chgV18: "Deterministic 30-day analytics dataset + Holt-Winters forecast",
    chgV19: "ANPR console + operator promo broadcast",
    chgV20: "Walls & gates on the building map",
    chgV21: "L2 ramp on the site plan",
    chgV22: "New pricing model: no parking fee — dynamic service fee + late fines only",
    chgV23: "Live gate stream · append-only audit trail · double-entry journal + trial balance + BEP",
    chgV24: "API docs + playground · ERD & architecture · 11% VAT invoices · cash-flow projection",
    chgV25: "Car-brand dropdown (25 brands) · seamless L2 ramp · custom top-up · ivory ticket · profile editing",
    chgV26: "VA / Card / QRIS top-up · 30-min ending-soon alert + quick extend · profile photo",
    // ANPR (v19)
    anprTitle: "ANPR Console",
    anprSub: "Simulated camera → plate OCR → gate decision pipeline",
    anprPlate: "Read plate",
    anprConfidence: "Confidence",
    anprDecision: "Decision",
    anprAllow: "OPEN GATE",
    anprDeny: "DENY",
    anprLog: "Recognition log",
    anprScan: "Simulate a car passing",
    // promo broadcast (v19)
    promoTitle: "Promo Broadcast",
    promoSub: "Send a campus promo to every active user",
    promoSend: "Send promo",
    promoSent: "Promo sent to all users",
    // analytics (v18/v22)
    anaKpiSessions: "Sessions / 30 days",
    anaKpiRevenue: "Revenue / 30 days",
    anaKpiOccupancy: "Avg occupancy",
    anaKpiMape: "Model MAPE",
    anaHeatmapTitle: "Occupancy Heatmap",
    anaHeatmapSub: "30 days · 07:00–21:00",
    anaForecastTitle: "Occupancy Forecast · 48 Hours",
    anaForecastSub: "Holt-Winters additive · daily seasonality",
    anaModelCard: "Model Card",
    anaMcMethod: "Method",
    anaMcMethodVal: "Holt-Winters additive (level + trend + 24h seasonality)",
    anaMcFeatures: "Features",
    anaMcFeaturesVal: "Hourly occupancy · day of week · weekly profile",
    anaMcMape: "MAPE (in-sample)",
    anaMcLimit: "Limitations",
    anaMcLimitText: "Deterministic synthetic data; not validated on real data; accuracy degrades beyond a 48h horizon.",
    anaAnomalyTitle: "Occupancy Anomalies · Z-Score",
    anaAnomalyEmpty: "No anomalies detected",
    anaRevenueTitle: "Daily Revenue",
    anaRevenueSub: "Service & fines · 30 days",
    anaWhatIfTitle: "Tariff What-If Simulator",
    anaWhatIfSub: "Drag tier prices → see the 30-day revenue impact",
    anaWhatIfLow: "LOW Reserve price",
    anaWhatIfNormal: "NORMAL Reserve price",
    anaWhatIfHigh: "HIGH Reserve price",
    anaWhatIfBase: "30-day actual",
    anaWhatIfSim: "Simulated",
    anaCsv: "Download CSV",
    anaHour: "Hour",
    // brand & body picker (v25)
    brandSearchPh: "Search brand… e.g. Honda",
    brandOther: "Other (type your own)",
    brandOtherPh: "Type your vehicle brand",
    brandRequired: "Pick a vehicle brand",
    fBodyType: "Body type",
    // wallet custom top-up (v25)
    topUpCustom: "Custom amount",
    topUpCustomPh: "e.g. 75,000",
    topUpMinErr: "Minimum top-up Rp10,000",
    topUpMaxErr: "Maximum top-up Rp10,000,000",
    // edit profile (v25)
    editProfile: "Edit Profile",
    editProfileTitle: "Edit Personal Data",
    epName: "Full name",
    epEmail: "Email",
    epPhone: "Phone",
    epNim: "Student ID (NIM)",
    epNameReq: "Name is required",
    epEmailReq: "Email is required",
    epEmailInvalid: "Invalid email format",
    epPhoneInvalid: "Invalid phone number format",
    epNimInvalid: "NIM must be 8–10 digits",
    profileSaved: "Profile updated",
    // payments (v26)
    payDialogTitle: "Choose Top-Up Method",
    payDialogSub: "Simulated payment gateway — Virtual Account, Card, or QRIS",
    payVa: "Virtual Account",
    payVaSub: "8 banks · BCA, Mandiri, BNI, BRI, etc.",
    payCard: "Credit / Debit Card",
    payCardSub: "Visa · Mastercard · JCB",
    payQris: "QRIS",
    payQrisSub: "GoPay · OVO · DANA · ShopeePay · m-banking",
    payVaPickBank: "Choose the issuing bank",
    payVaNumber: "Virtual Account number",
    payVaHowTo: "Open mobile banking → Transfer → Virtual Account → enter the number shown",
    payVaExpires: "Valid until",
    payCopy: "Copy",
    payCopied: "VA number copied",
    payVaCheck: "I've paid",
    payCardNumber: "Card number",
    payCardName: "Name on card",
    payCardExpiry: "MM/YY",
    payCardCvv: "CVV",
    payCardInvalid: "Invalid card number",
    payCardNameErr: "Name must be at least 3 characters",
    payCardExpErr: "Invalid expiry date",
    payCardCvvErr: "CVV must be 3 digits",
    payQrisTitle: "Scan with any app",
    payQrisMerchant: "PARKIR BINUS KEMANGGISAN",
    payProcessing: "Processing payment…",
    payDone: "Top-up successful",
    // ending soon (v26)
    endSoonTitle: "Parking time is running out",
    endSoonBody: "Slot {slot} ends in {minutes} minutes — extend now to stay fine-free.",
    endSoonToast: "Session {slot} ends in {minutes} minutes",
    // avatar (v26)
    avatarChange: "Change profile photo",
    avatarRemove: "Remove photo",
    avatarTooBig: "Maximum size is 2 MB",
    avatarBadType: "Use PNG, JPG, or WebP",
    cancel: "Cancel",
    back: "Back",
    close: "Close",
    error: "Something went wrong",
  },
} as const;

export type DictKey = keyof (typeof dict)["id"];

export function tr(lang: Lang, key: DictKey): string {
  return dict[lang][key] ?? dict.id[key] ?? String(key);
}

// ─────────────────────────── Mock seed ─────────────────────────

export const ROW_A = 18;
export const ROW_B_LEFT = 8;
export const ROW_B_RIGHT = 6;

/** Building deck geometry — shared width constants for the site plan & tests. */
export const DECK = {
  slotW: 52,
  slotWCompact: 44,
  gap: 6,
  pillarW: 6,
  liftWC: 46,
  entranceW: 84,
  exitW: 64,
} as const;

/**
 * L2 ramp block (v25) — ONE seamless child replacing the old wall·ramp·wall
 * triple. The flanking walls are INTEGRATED as 8px edge strips inside the same
 * box, so no dark slit can appear between tembok A / tembok B and the ramp.
 */
export const L2RAMP_WALL_W = 8;
export const L2RAMP_GAP = 6;
export const L2RAMP_BODY_W = { compact: 68, full: 84 } as const;
export const L2RAMP_BLOCK_W = {
  compact: L2RAMP_BODY_W.compact + 2 * L2RAMP_WALL_W + 2 * L2RAMP_GAP, // 68+28 = 96
  full: L2RAMP_BODY_W.full + 2 * L2RAMP_WALL_W + 2 * L2RAMP_GAP, // 84+28 = 112
} as const;

/** Alam Sutera open lot: 20 + 20 bays, no pillars/walls — paint-line divisions. */
export const AS_ROW_A = 20;
export const AS_ROW_B = 20;

/** Bekasi open lot: 25 + 25 bays, same paint-line style as Alam Sutera. */
export const BK_ROW_A = 25;
export const BK_ROW_B = 25;

export function buildBekasiSlots(): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < BK_ROW_A; i++) {
    slots.push({
      id: `bk-A-${i + 1}`,
      slotNumber: `A-${String(i + 1).padStart(2, "0")}`,
      rowLabel: "A",
      colIndex: i,
      status: i === 6 ? "MAINTENANCE" : "ACTIVE", // A-07
    });
  }
  for (let i = 0; i < BK_ROW_B; i++) {
    slots.push({
      id: `bk-B-${i + 1}`,
      slotNumber: `B-${String(i + 1).padStart(2, "0")}`,
      rowLabel: "B",
      colIndex: i,
      status: i === 14 ? "MAINTENANCE" : "ACTIVE", // B-15
    });
  }
  return slots;
}

export function buildAlamSuteraSlots(): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < AS_ROW_A; i++) {
    slots.push({
      id: `as-A-${i + 1}`,
      slotNumber: `A-${String(i + 1).padStart(2, "0")}`,
      rowLabel: "A",
      colIndex: i,
      status: i === 6 ? "MAINTENANCE" : "ACTIVE", // A-07
    });
  }
  for (let i = 0; i < AS_ROW_B; i++) {
    slots.push({
      id: `as-B-${i + 1}`,
      slotNumber: `B-${String(i + 1).padStart(2, "0")}`,
      rowLabel: "B",
      colIndex: i,
      status: i === 14 ? "MAINTENANCE" : "ACTIVE", // B-15
    });
  }
  return slots;
}

export function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < ROW_A; i++) {
    slots.push({
      id: `slot-A-${i + 1}`,
      slotNumber: `A-${String(i + 1).padStart(2, "0")}`,
      rowLabel: "A",
      colIndex: i,
      status: i === 13 ? "MAINTENANCE" : "ACTIVE",
    });
  }
  for (let i = 0; i < ROW_B_LEFT + ROW_B_RIGHT; i++) {
    slots.push({
      id: `slot-B-${i + 1}`,
      slotNumber: `B-${String(i + 1).padStart(2, "0")}`,
      rowLabel: "B",
      colIndex: i,
      status: i === 10 ? "MAINTENANCE" : "ACTIVE",
    });
  }
  return slots;
}

/** Deterministic heatmap: 7 days × 07:00–21:00 */
export function buildHeatmap(): number[][] {
  // rows: Mon..Sun, cols: 07..21 (15 hours)
  const days = [0, 1, 2, 3, 4, 5, 6];
  return days.map((d) =>
    Array.from({ length: 15 }, (_, h) => {
      const hour = h + 7;
      let v = 0.12;
      if (d < 5) {
        if (hour >= 7 && hour <= 10) v = 0.55 + (hour === 8 || hour === 9 ? 0.35 : 0);
        if (hour >= 11 && hour <= 13) v = 0.45;
        if (hour >= 16 && hour <= 18) v = 0.6 + (hour === 17 ? 0.3 : 0);
        if (hour >= 19) v = 0.25;
      } else {
        v = hour <= 10 ? 0.15 : hour <= 15 ? 0.22 : 0.12;
      }
      const jitter = ((d * 31 + h * 17) % 13) / 130;
      return Math.min(1, Math.max(0.05, v + jitter - 0.05));
    })
  );
}

export const ADS: Ad[] = [
  {
    id: "ad-1",
    title: "Kopi Rp15.000",
    description: "Fusion Cafe — show your parking pass",
    theme: "coffee",
    ctaText: "Claim",
    accent: "amber",
  },
  {
    id: "ad-2",
    title: "Free car wash",
    description: "Every 5th parking session this month",
    theme: "carwash",
    ctaText: "Detail",
    accent: "sky",
  },
  {
    id: "ad-3",
    title: "Campus fest 2026",
    description: "Gedung Anggrek hall — free entry w/ student ID",
    theme: "event",
    ctaText: "See",
    accent: "violet",
  },
];

export const DAY_LABELS: Record<Lang, string[]> = {
  id: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
