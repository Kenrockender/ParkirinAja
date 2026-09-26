"use client";
/**
 * Parkir Binus preview store - client-side simulation of the full product loop:
 * auth → browse availability → book → check-in (scan) → check-out (scan or ticket) → fines/refund.
 *
 * v22: NO parking fee - check-out charges only the late fine (denda keterlambatan).
 * v23: every action is instrumented into an append-only audit trail; a live gate
 *      stream simulator runs guests that NEVER touch reservations/txns/ledger.
 * v26: top-up records the payment channel; avatar upload; profile editing.
 */
import { create } from "zustand";
import {
  buildAlamSuteraSlots,
  buildBekasiSlots,
  buildSlots,
  dateStr,
  demandNow,
  DEMAND_TIERS,
  overlaps,
  overtimeFee,
  refundAmount,
  resCode,
  rupiah,
  slotStatusForWindow,
  TARIFF,
  timeStr,
  toMinutes,
  fromMinutes,
  uid,
  type AuditAction,
  type AuditEntry,
  type CampusId,
  type Lang,
  type LiveConnStatus,
  type LiveEvent,
  type LiveGuest,
  type Notif,
  type Reservation,
  type ResStatus,
  type ResType,
  type Slot,
  type TimeWindow,
  type Txn,
  type TxnType,
  type Vehicle,
} from "./parking-data";

const HOUR = 3600_000;
const MIN = 60_000;
const DAY = 24 * HOUR;

/** Max concurrent CHECKED_IN sessions per user ("sedang parkir"). */
const MAX_ACTIVE_PARKING = 2;

/** Browser-session id - shared by every audit entry of one page load. */
export const SESSION_ID = `sess-${uid().slice(0, 10)}`;

/** Audit log cap (append-only, last 250 kept). */
const AUDIT_CAP = 250;

export interface User {
  name: string;
  email: string;
  isBinusian: boolean;
  memberSince: string;
  role: "USER" | "OPERATOR";
  phone?: string;
  nim?: string;
  /** data-URL of the uploaded profile photo (null → initials fallback). */
  avatar?: string | null;
}

interface Toast {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

/** Push a notification (dedupe by key - auto-events reuse keys like "end:<resId>"). */
type PushNotif = (n: Pick<Notif, "kind" | "params"> & { key?: string; createdAt?: number; read?: boolean }) => void;

interface ParkirState {
  lang: Lang;
  signedIn: boolean;
  user: User;
  vehicles: Vehicle[];
  /** Slots of the active campus (mirrors slotsByCampus[campusId]). */
  slots: Slot[];
  /** Per-campus slot worlds - Anggrek building lot & open lots. */
  slotsByCampus: Record<CampusId, Slot[]>;
  reservations: Reservation[];
  transactions: Txn[];
  walletBalance: number;
  toasts: Toast[];
  /** Customer notification center (structured - rendered per-language at display time). */
  notifications: Notif[];
  viewWindow: TimeWindow;
  /** Active campus. */
  campusId: CampusId;

  // ── audit trail (v23) ──
  auditLog: AuditEntry[];

  // ── live gate stream (v23) ──
  liveOn: boolean;
  liveStatus: LiveConnStatus;
  liveEvents: LiveEvent[];
  liveGuests: LiveGuest[];
  liveLatency: number;
  liveReconnects: number;
  liveUptimeStart: number;

  selectCampus: (id: CampusId) => void;
  setLang: (l: Lang) => void;
  setViewWindow: (w: TimeWindow) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;

  pushNotif: PushNotif;
  markNotifsRead: () => void;
  clearNotifs: () => void;

  /** Push notification permission - true when user granted and SW is registered. */
  pushEnabled: boolean;
  setPushEnabled: (v: boolean) => void;

  signIn: (kind: "student" | "general" | "operator" | "microsoft") => void;
  signOut: () => void;

  /** v25/v26 - edit personal data + profile photo. */
  updateProfile: (patch: { name: string; email: string; phone?: string; nim?: string }) => void;
  setAvatar: (dataUrl: string | null) => void;

  addVehicle: (v: { nickname: string; licensePlate: string; brand: string | null; model: string | null; color: string | null; bodyType?: string | null }) => void;
  updateVehicle: (id: string, v: { nickname: string; licensePlate: string; brand: string | null; model: string | null; color: string | null; bodyType?: string | null }) => void;
  removeVehicle: (id: string) => void;

  /** Operator: toggle a slot between ACTIVE and MAINTENANCE */
  setSlotStatus: (slotId: string, status: Slot["status"]) => void;

  /** Operator: broadcast a campus promo to users. */
  broadcastPromo: () => void;

  book: (args: {
    slotId: string;
    slotNumber: string;
    type: ResType;
    date: string;
    startTime: string;
    endTime: string;
    vehiclePlate: string;
    vehicleName: string;
  }) => Reservation | null;

  cancelReservation: (id: string) => void;
  /** CONFIRMED → CHECKED_IN. Returns false when blocked (already 2 active sessions). */
  checkIn: (id: string) => boolean;

  /** End an active session - v22: charges ONLY the late fine. `via` feeds the audit trail. */
  checkOut: (id: string, via?: "ticket" | "scan") =>
    | { ok: true; overtimeFee: number }
    | { ok: false; reason: "not_found" | "insufficient" };

  /** Scan a slot QR → walk-in start, check-in, or check-out depending on state */
  scanSlot: (slotNumber: string) =>
    | { ok: true; kind: "walkin" | "checkin" | "checkout"; reservation?: Reservation }
    | { ok: false; reason: "unknown" | "busy" | "maintenance" | "no_reservation" | "insufficient" | "max_active" };

  /** Operator: end any active session on the spot - fine recorded as on-site payment */
  forceCheckOut: (id: string) =>
    | { ok: true; overtimeFee: number }
    | { ok: false; reason: "not_found" };

  /** Extend a session/booking window by N hours (capped at closing time) */
  extendSession: (id: string, hours: number) => boolean;

  /** Operator: manual check-in for a confirmed reservation (bypasses customer limits) */
  manualCheckIn: (id: string) => boolean;

  /** v26: top up - `note` records the payment channel (VA BCA / Kartu •••• 4242 / QRIS). */
  topUp: (amount: number, note?: string) => void;

  /** v23: toggle the simulated gate WebSocket stream. */
  liveToggle: () => void;
  /** v23: one simulated gate tick (interval-driven). */
  liveStep: () => void;
}

// ───────────────────────── audit helpers ─────────────────────────

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

/** Deterministic fake IP per actor+role - 10.20.x.x operator, 114.10.x.x user, 127.0.0.1 system. */
function fakeIp(role: AuditEntry["role"], actor: string): string {
  if (role === "SYSTEM") return "127.0.0.1";
  const h = hashStr(`${actor}|${role}`);
  if (role === "OPERATOR") return `10.20.${(h % 200) + 1}.${((h >> 8) % 250) + 1}`;
  return `114.10.${(h % 200) + 1}.${((h >> 8) % 250) + 1}`;
}

// ─────────────────────── seed worlds ───────────────────────

/** Seed a believable world relative to "now" */
function seedReservations(now: number): Reservation[] {
  const nowD = new Date(now);
  const today = dateStr(nowD);
  const yesterday = dateStr(new Date(now - DAY));
  const lastWeek = dateStr(new Date(now - 6 * DAY));
  const tomorrow = dateStr(new Date(now + DAY));
  const t = timeStr(nowD);

  const mk = (r: Partial<Reservation> & Pick<Reservation, "slotId" | "slotNumber" | "date" | "startTime" | "endTime" | "status">): Reservation => ({
    id: uid(),
    code: resCode(),
    type: "ADVANCE",
    demandTier: "NORMAL",
    serviceFee: TARIFF.advanceFee,
    overtimeFee: 0,
    refundAmount: 0,
    vehiclePlate: "B 2143 RWZ",
    vehicleName: "Honda HR-V",
    driverName: "Rizky Pratama",
    createdAt: now - 2 * HOUR,
    ...r,
  });

  return [
    // Active session right now (checked in ~50 min ago, window 2h)
    mk({
      slotId: "slot-A-3",
      slotNumber: "A-03",
      date: today,
      startTime: t,
      endTime: addH(t, 2),
      status: "CHECKED_IN",
      checkedInAt: now - 50 * MIN,
    }),
    // Just booked 4 minutes ago → triggers the 100% refund countdown
    mk({
      slotId: "slot-B-5",
      slotNumber: "B-05",
      date: tomorrow,
      startTime: "09:00",
      endTime: "11:00",
      status: "CONFIRMED",
      createdAt: now - 4 * MIN,
    }),
    // Upcoming next week
    mk({
      slotId: "slot-A-9",
      slotNumber: "A-09",
      date: dateStr(new Date(now + 4 * DAY)),
      startTime: "13:00",
      endTime: "15:00",
      status: "CONFIRMED",
      createdAt: now - 3 * DAY,
      vehiclePlate: "B 2143 RWZ",
    }),
    // Completed yesterday with a late fine (20 min past the window)
    mk({
      slotId: "slot-B-2",
      slotNumber: "B-02",
      date: yesterday,
      startTime: "08:00",
      endTime: "10:00",
      status: "COMPLETED",
      createdAt: now - 2 * DAY,
      checkedInAt: now - DAY - 4 * HOUR,
      checkedOutAt: now - DAY - 100 * MIN,
      overtimeFee: TARIFF.overtimeFeePerHour,
    }),
    // Cancelled last week (50% refund received)
    mk({
      slotId: "slot-A-15",
      slotNumber: "A-15",
      date: lastWeek,
      startTime: "10:00",
      endTime: "12:00",
      status: "CANCELLED",
      createdAt: now - 8 * DAY,
      refundAmount: TARIFF.advanceFee / 2,
    }),
    // No-show last month
    mk({
      slotId: "slot-B-11",
      slotNumber: "B-11",
      date: dateStr(new Date(now - 20 * DAY)),
      startTime: "14:00",
      endTime: "16:00",
      status: "NO_SHOW",
      createdAt: now - 24 * DAY,
    }),
  ];
}

function addH(t: string, h: number): string {
  const [hh, mm] = t.split(":").map(Number);
  const total = Math.min(22 * 60, hh * 60 + mm + h * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Default viewing window: today now → +2h, clamped to operating hours */
function defaultWindow(): TimeWindow {
  const d = new Date();
  const start = toMinutes(timeStr(d));
  const end = start + 120;
  if (end > 22 * 60) {
    // too late today → tomorrow morning 08:00–10:00
    const t = new Date(d.getTime() + 24 * 3600_000);
    return { date: dateStr(t), startTime: "08:00", endTime: "10:00" };
  }
  return { date: dateStr(d), startTime: fromMinutes(start), endTime: fromMinutes(end) };
}

function seedTxns(now: number): Txn[] {
  return [
    { id: uid(), type: "TOP_UP", amount: 100000, createdAt: now - 9 * DAY, note: "VA BCA" },
    { id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: now - 8 * DAY, note: "PB-KLM8241" },
    { id: uid(), type: "REFUND", amount: TARIFF.advanceFee / 2, createdAt: now - 7 * DAY, note: "PB-KLM8241" },
    { id: uid(), type: "TOP_UP", amount: 150000, createdAt: now - 3 * DAY, note: "QRIS" },
    { id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: now - 2 * DAY, note: "PB-QRT3310" },
    { id: uid(), type: "OVERTIME", amount: TARIFF.overtimeFeePerHour, createdAt: now - 88 * MIN, note: "PB-QRT3310" },
    { id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: now - 4 * MIN, note: "PB-JHD5527" },
  ];
}

// ─────────────────── Operator console demo world ───────────────────

/** Deterministic PRNG - module level so the seeded world stays stable per session. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Drivers that "fill" the parking building while the operator is on shift - CARS only (v25). */
const OP_PEOPLE: { name: string; plate: string; vehicle: string }[] = [
  { name: "Alya Ramadhani", plate: "B 2741 AKL", vehicle: "Honda Brio" },
  { name: "Bagus Prasetyo", plate: "B 1877 TRK", vehicle: "Toyota Innova Zenix" },
  { name: "Citra Dewi", plate: "B 5512 MNH", vehicle: "Toyota Calya" },
  { name: "Daffa Hakim", plate: "B 1680 PQW", vehicle: "Honda HR-V" },
  { name: "Elang Satria", plate: "B 8625 JKT", vehicle: "Suzuki Ertiga" },
  { name: "Farah Nabila", plate: "B 3908 KLM", vehicle: "Daihatsu Rocky" },
  { name: "Gilang Ramadhan", plate: "B 6634 BVN", vehicle: "Toyota Avanza" },
  { name: "Hana Salsabila", plate: "B 4419 QWE", vehicle: "Suzuki Baleno" },
  { name: "Iqbal Maulana", plate: "B 7230 RTY", vehicle: "Mitsubishi Xpander" },
  { name: "Jihan Aprilia", plate: "B 9023 UIO", vehicle: "Honda Brio" },
  { name: "Kevin Wijaya", plate: "B 1123 PAS", vehicle: "Nissan Livina" },
  { name: "Luna Maharani", plate: "B 7856 GHD", vehicle: "Daihatsu Ayla" },
];

/** v23 - guest car pool for the live gate simulator (never touches real state). */
const LIVE_PEOPLE: { name: string; plate: string; vehicle: string }[] = [
  { name: "Raka Aditya", plate: "B 2914 KJD", vehicle: "Toyota Raize" },
  { name: "Sinta Maharani", plate: "B 1892 PLM", vehicle: "Honda Civic" },
  { name: "Toni Saputra", plate: "B 3355 QWE", vehicle: "Mitsubishi Pajero Sport" },
  { name: "Vina Anggraini", plate: "B 7412 ASD", vehicle: "Hyundai Stargazer" },
  { name: "Wahyu Nugroho", plate: "B 5567 ZXV", vehicle: "Toyota Yaris" },
  { name: "Xenia Putri", plate: "B 8890 BNM", vehicle: "Kia Sonet" },
  { name: "Yoga Pratama", plate: "B 2233 CFG", vehicle: "Wuling Almaz" },
  { name: "Zahra Amelia", plate: "B 6678 HJK", vehicle: "Honda BR-V" },
  { name: "Dimas Prakoso", plate: "B 9103 LOP", vehicle: "Volkswagen Tiguan" },
  { name: "Nadia Rahma", plate: "B 4821 MKO", vehicle: "MG ZS" },
];

/** slotNumber → {slotId, slotNumber} pair matching buildSlots() id format. */
function opSlot(slotNumber: string): { slotId: string; slotNumber: string } {
  const [row, num] = slotNumber.split("-");
  return { slotId: `slot-${row}-${Number(num)}`, slotNumber };
}

/** slotNumber → {slotId, slotNumber} pair matching buildAlamSuteraSlots() id format. */
function asSlot(slotNumber: string): { slotId: string; slotNumber: string } {
  const [row, num] = slotNumber.split("-");
  return { slotId: `as-${row}-${Number(num)}`, slotNumber };
}

/** slotNumber → {slotId, slotNumber} pair matching buildBekasiSlots() id format. */
function bkSlot(slotNumber: string): { slotId: string; slotNumber: string } {
  const [row, num] = slotNumber.split("-");
  return { slotId: `bk-${row}-${Number(num)}`, slotNumber };
}

/**
 * Alam Sutera live world - other parkers only, so the open lot opens at a
 * believable ~42% occupancy (16 of 38 active bays) → NORMAL demand tier:
 * 13 walk-in sessions active now + 3 advance holds overlapping now.
 */
function seedAlamSuteraWorld(now: number): { reservations: Reservation[]; transactions: Txn[] } {
  const nowD = new Date(now);
  const today = dateStr(nowD);
  const res: Reservation[] = [];
  const txns: Txn[] = [];

  const mk = (
    r: Partial<Reservation> &
      Pick<Reservation, "slotId" | "slotNumber" | "startTime" | "endTime" | "status" | "driverName" | "vehiclePlate" | "vehicleName">
  ): Reservation => ({
    id: uid(),
    code: resCode(),
    type: "WALK_IN",
    demandTier: "NORMAL",
    serviceFee: DEMAND_TIERS.NORMAL.walkInFee,
    overtimeFee: 0,
    refundAmount: 0,
    date: today,
    createdAt: now,
    ...r,
  });

  const actives: { off: number; hrs: number; p: number; slot: string }[] = [
    { off: 176, hrs: 3, p: 0, slot: "A-02" },
    { off: 154, hrs: 2, p: 1, slot: "A-05" },
    { off: 132, hrs: 3, p: 2, slot: "A-09" },
    { off: 121, hrs: 2, p: 3, slot: "A-11" },
    { off: 103, hrs: 3, p: 4, slot: "A-14" },
    { off: 88, hrs: 2, p: 5, slot: "A-18" },
    { off: 74, hrs: 3, p: 6, slot: "B-02" },
    { off: 61, hrs: 2, p: 7, slot: "B-06" },
    { off: 47, hrs: 3, p: 8, slot: "B-09" },
    { off: 35, hrs: 2, p: 9, slot: "B-12" },
    { off: 22, hrs: 3, p: 10, slot: "B-17" },
    { off: 12, hrs: 2, p: 11, slot: "B-19" },
    { off: 5, hrs: 2, p: 4, slot: "B-20" },
  ];
  for (const a of actives) {
    const inAt = now - a.off * MIN;
    const inD = new Date(inAt);
    const person = OP_PEOPLE[a.p];
    const r = mk({
      ...asSlot(a.slot),
      startTime: timeStr(inD),
      endTime: addH(timeStr(inD), a.hrs),
      status: "CHECKED_IN",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      createdAt: inAt,
      checkedInAt: inAt,
    });
    res.push(r);
    txns.push({ id: uid(), type: "SERVICE_FEE", amount: DEMAND_TIERS.NORMAL.walkInFee, createdAt: inAt, note: r.code });
  }

  const holds: { off: number; hrs: number; p: number; slot: string }[] = [
    { off: 40, hrs: 2, p: 2, slot: "A-12" },
    { off: 25, hrs: 3, p: 7, slot: "B-04" },
    { off: 15, hrs: 2, p: 9, slot: "B-10" },
  ];
  for (const h of holds) {
    const startAt = now - h.off * MIN;
    const startD = new Date(startAt);
    const person = OP_PEOPLE[h.p];
    const r = mk({
      ...asSlot(h.slot),
      type: "ADVANCE",
      serviceFee: TARIFF.advanceFee,
      startTime: timeStr(startD),
      endTime: addH(timeStr(startD), h.hrs),
      status: "CONFIRMED",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      createdAt: startAt - 10 * MIN,
    });
    res.push(r);
    txns.push({ id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: startAt - 10 * MIN, note: r.code });
  }

  return { reservations: res, transactions: txns };
}

/**
 * Bekasi live world - other parkers only, so the open lot opens at a
 * believable ~42% occupancy (20 of 48 active bays) → NORMAL demand tier.
 */
function seedBekasiWorld(now: number): { reservations: Reservation[]; transactions: Txn[] } {
  const nowD = new Date(now);
  const today = dateStr(nowD);
  const res: Reservation[] = [];
  const txns: Txn[] = [];

  const mk = (
    r: Partial<Reservation> &
      Pick<Reservation, "slotId" | "slotNumber" | "startTime" | "endTime" | "status" | "driverName" | "vehiclePlate" | "vehicleName">
  ): Reservation => ({
    id: uid(),
    code: resCode(),
    type: "WALK_IN",
    demandTier: "NORMAL",
    serviceFee: DEMAND_TIERS.NORMAL.walkInFee,
    overtimeFee: 0,
    refundAmount: 0,
    date: today,
    createdAt: now,
    ...r,
  });

  const actives: { off: number; hrs: number; p: number; slot: string }[] = [
    { off: 189, hrs: 3, p: 0, slot: "A-02" },
    { off: 172, hrs: 2, p: 1, slot: "A-04" },
    { off: 155, hrs: 3, p: 2, slot: "A-09" },
    { off: 138, hrs: 2, p: 3, slot: "A-11" },
    { off: 121, hrs: 3, p: 4, slot: "A-14" },
    { off: 104, hrs: 2, p: 5, slot: "A-18" },
    { off: 87, hrs: 3, p: 6, slot: "A-21" },
    { off: 70, hrs: 2, p: 7, slot: "A-24" },
    { off: 168, hrs: 3, p: 8, slot: "B-02" },
    { off: 151, hrs: 2, p: 9, slot: "B-05" },
    { off: 134, hrs: 3, p: 10, slot: "B-08" },
    { off: 117, hrs: 2, p: 11, slot: "B-11" },
    { off: 99, hrs: 3, p: 0, slot: "B-17" },
    { off: 82, hrs: 2, p: 1, slot: "B-19" },
    { off: 64, hrs: 3, p: 2, slot: "B-22" },
    { off: 41, hrs: 2, p: 3, slot: "B-24" },
    { off: 18, hrs: 2, p: 4, slot: "B-25" },
  ];
  for (const a of actives) {
    const inAt = now - a.off * MIN;
    const inD = new Date(inAt);
    const person = OP_PEOPLE[a.p];
    const r = mk({
      ...bkSlot(a.slot),
      startTime: timeStr(inD),
      endTime: addH(timeStr(inD), a.hrs),
      status: "CHECKED_IN",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      createdAt: inAt,
      checkedInAt: inAt,
    });
    res.push(r);
    txns.push({ id: uid(), type: "SERVICE_FEE", amount: DEMAND_TIERS.NORMAL.walkInFee, createdAt: inAt, note: r.code });
  }

  const holds: { off: number; hrs: number; p: number; slot: string }[] = [
    { off: 44, hrs: 2, p: 5, slot: "A-12" },
    { off: 27, hrs: 3, p: 7, slot: "B-06" },
    { off: 13, hrs: 2, p: 9, slot: "B-20" },
  ];
  for (const h of holds) {
    const startAt = now - h.off * MIN;
    const startD = new Date(startAt);
    const person = OP_PEOPLE[h.p];
    const r = mk({
      ...bkSlot(h.slot),
      type: "ADVANCE",
      serviceFee: TARIFF.advanceFee,
      startTime: timeStr(startD),
      endTime: addH(timeStr(startD), h.hrs),
      status: "CONFIRMED",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      createdAt: startAt - 10 * MIN,
    });
    res.push(r);
    txns.push({ id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: startAt - 10 * MIN, note: r.code });
  }

  return { reservations: res, transactions: txns };
}

/** Weighted check-in hours for the 7-day peak-hours histogram (campus rhythm). */
const OP_HIST_HOURS = [7, 8, 8, 9, 9, 9, 10, 11, 12, 12, 13, 13, 14, 15, 16, 16, 17, 17, 18];
const OP_HIST_SLOTS = ["A-03", "A-04", "A-08", "A-11", "A-16", "A-18", "B-04", "B-07", "B-10", "B-14"];

/**
 * Rich operator world: live sessions, today's completed visits, upcoming bookings,
 * a week of historical check-ins (feeds the peak-hours chart) and hourly revenue.
 */
function seedOperatorWorld(now: number): { reservations: Reservation[]; transactions: Txn[] } {
  const rnd = mulberry32(20260916);
  const nowD = new Date(now);
  const today = dateStr(nowD);
  const dayOpen = new Date(`${today}T06:00:00`).getTime();
  let t0 = Math.max(dayOpen, now - 6 * HOUR); // earliest believable event today
  if (t0 > now - 10 * MIN) t0 = now - 10 * MIN; // late-night / early-morning safety clamp

  const res: Reservation[] = [];
  const txns: Txn[] = [];
  const addTxn = (type: TxnType, amount: number, at: number, code: string) =>
    txns.push({ id: uid(), type, amount, createdAt: at, note: code });

  const mk = (
    r: Partial<Reservation> &
      Pick<Reservation, "slotId" | "slotNumber" | "date" | "startTime" | "endTime" | "status" | "driverName" | "vehiclePlate" | "vehicleName">
  ): Reservation => ({
    id: uid(),
    code: resCode(),
    type: "WALK_IN",
    demandTier: "NORMAL",
    serviceFee: DEMAND_TIERS.NORMAL.walkInFee,
    overtimeFee: 0,
    refundAmount: 0,
    createdAt: now,
    ...r,
  });

  // ── 9 active sessions (one overdue) ──
  const actives: { off: number; hrs: number; p: number; slot: string }[] = [
    { off: 295, hrs: 2, p: 0, slot: "B-03" }, // overdue ~1h55m
    { off: 233, hrs: 3, p: 1, slot: "A-05" },
    { off: 172, hrs: 2, p: 3, slot: "A-09" },
    { off: 138, hrs: 3, p: 5, slot: "B-06" },
    { off: 95, hrs: 2, p: 6, slot: "A-12" },
    { off: 71, hrs: 2, p: 8, slot: "B-09" },
    { off: 47, hrs: 3, p: 9, slot: "A-17" },
    { off: 26, hrs: 2, p: 10, slot: "B-13" },
    { off: 9, hrs: 2, p: 11, slot: "A-01" },
  ];
  for (const a of actives) {
    const inAt = Math.max(t0, now - a.off * MIN);
    const inD = new Date(inAt);
    const person = OP_PEOPLE[a.p];
    const r = mk({
      ...opSlot(a.slot),
      date: today,
      startTime: timeStr(inD),
      endTime: addH(timeStr(inD), a.hrs),
      status: "CHECKED_IN",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      createdAt: inAt,
      checkedInAt: inAt,
    });
    res.push(r);
    addTxn("SERVICE_FEE", r.serviceFee, inAt, r.code);
  }

  // ── 7 completed visits earlier today (one with a late fine) ──
  const done: { off: number; dur: number; planned: number; p: number; slot: string; advance: boolean }[] = [
    { off: 390, dur: 95, planned: 2, p: 2, slot: "B-02", advance: false },
    { off: 330, dur: 55, planned: 2, p: 4, slot: "A-06", advance: true },
    { off: 300, dur: 185, planned: 2, p: 7, slot: "B-08", advance: false }, // late
    { off: 268, dur: 140, planned: 3, p: 1, slot: "A-10", advance: false },
    { off: 205, dur: 45, planned: 1, p: 5, slot: "B-05", advance: false },
    { off: 115, dur: 70, planned: 2, p: 10, slot: "A-13", advance: true },
    { off: 62, dur: 35, planned: 1, p: 3, slot: "B-12", advance: false },
  ];
  for (const d of done) {
    const inAt = Math.max(t0, now - d.off * MIN);
    const outAt = inAt + d.dur * MIN;
    const inD = new Date(inAt);
    const person = OP_PEOPLE[d.p];
    const lateMin = Math.max(0, d.dur - d.planned * 60);
    const r = mk({
      ...opSlot(d.slot),
      type: d.advance ? "ADVANCE" : "WALK_IN",
      serviceFee: d.advance ? TARIFF.advanceFee : DEMAND_TIERS.NORMAL.walkInFee,
      date: today,
      startTime: timeStr(inD),
      endTime: addH(timeStr(inD), d.planned),
      status: "COMPLETED",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      overtimeFee: overtimeFee(lateMin),
      createdAt: d.advance ? Math.max(t0, inAt - 40 * MIN) : inAt,
      checkedInAt: inAt,
      checkedOutAt: outAt,
    });
    res.push(r);
    addTxn("SERVICE_FEE", r.serviceFee, r.createdAt, r.code);
    if (r.overtimeFee > 0) addTxn("OVERTIME", r.overtimeFee, outAt, r.code);
  }

  // ── today's bookings: 1 in-window (late check-in) + 2 upcoming ──
  const upcoming: { startOff: number; hrs: number; p: number; slot: string; createdOff: number }[] = [
    { startOff: -20, hrs: 2, p: 4, slot: "A-07", createdOff: 190 },
    { startOff: 55, hrs: 2, p: 6, slot: "B-01", createdOff: 120 },
    { startOff: 180, hrs: 2, p: 11, slot: "A-15", createdOff: 65 },
  ];
  for (const u of upcoming) {
    let startAt = now + u.startOff * MIN;
    let date = today;
    // snap bookings into operating hours (early-morning / late-night demos)
    const h = new Date(startAt).getHours();
    if (h >= 20 || h < 6) {
      const tm = new Date(startAt + DAY);
      date = dateStr(tm);
      startAt = new Date(`${date}T09:00:00`).getTime();
    }
    const person = OP_PEOPLE[u.p];
    const r = mk({
      ...opSlot(u.slot),
      type: "ADVANCE",
      serviceFee: TARIFF.advanceFee,
      date,
      startTime: timeStr(new Date(startAt)),
      endTime: addH(timeStr(new Date(startAt)), u.hrs),
      status: "CONFIRMED",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      createdAt: Math.max(t0, now - u.createdOff * MIN),
    });
    res.push(r);
    addTxn("SERVICE_FEE", TARIFF.advanceFee, r.createdAt, r.code);
  }

  // ── a few wallet top-ups today (activity feed flavour) ──
  const tops: { off: number; amount: number }[] = [
    { off: 35, amount: 100000 },
    { off: 130, amount: 50000 },
    { off: 260, amount: 150000 },
  ];
  for (const tp of tops) addTxn("TOP_UP", tp.amount, Math.max(t0, now - tp.off * MIN), "QRIS");

  // ── 7 days × 8 historical check-ins → peak-hours chart ──
  for (let d = 1; d <= 7; d++) {
    for (let k = 0; k < 8; k++) {
      const ds = dateStr(new Date(now - d * DAY));
      const hour = OP_HIST_HOURS[Math.floor(rnd() * OP_HIST_HOURS.length)];
      const minute = Math.floor(rnd() * 55);
      const inAt = new Date(`${ds}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).getTime();
      const closeAt = new Date(`${ds}T22:00:00`).getTime();
      const outAt = Math.min(inAt + (35 + Math.floor(rnd() * 230)) * MIN, closeAt);
      const durMin = Math.max(15, Math.round((outAt - inAt) / MIN));
      const person = OP_PEOPLE[Math.floor(rnd() * OP_PEOPLE.length)];
      const slot = OP_HIST_SLOTS[Math.floor(rnd() * OP_HIST_SLOTS.length)];
      const late = Math.max(0, durMin - 150);
      res.push(
        mk({
          ...opSlot(slot),
          date: ds,
          startTime: timeStr(new Date(inAt)),
          endTime: timeStr(new Date(outAt)),
          status: "COMPLETED",
          driverName: person.name,
          vehiclePlate: person.plate,
          vehicleName: person.vehicle,
          overtimeFee: overtimeFee(late),
          createdAt: inAt,
          checkedInAt: inAt,
          checkedOutAt: outAt,
        })
      );
    }
  }

  txns.sort((a, b) => b.createdAt - a.createdAt);
  return { reservations: res, transactions: txns };
}

/** v23 - derive a believable audit history from the seeded worlds. */
function seedAuditLog(
  worlds: { reservations: Reservation[]; transactions: Txn[] }[],
  slotsByCampus: Record<CampusId, Slot[]>,
  operatorName: string
): AuditEntry[] {
  const out: AuditEntry[] = [];
  const mkEntry = (
    at: number,
    actor: string,
    role: AuditEntry["role"],
    action: AuditAction,
    severity: AuditEntry["severity"],
    target?: string,
    detail?: string
  ): AuditEntry => ({
    id: uid(),
    sessionId: SESSION_ID,
    at,
    actor,
    role,
    action,
    severity,
    target,
    detail,
    ip: fakeIp(role, actor),
  });

  for (const w of worlds) {
    for (const r of w.reservations) {
      out.push(mkEntry(r.createdAt, r.driverName, "USER", "BOOKING_CREATED", "info", r.slotNumber, r.code));
      if (r.checkedInAt) out.push(mkEntry(r.checkedInAt, r.driverName, "USER", r.type === "WALK_IN" ? "WALK_IN_STARTED" : "CHECK_IN", "info", r.slotNumber, `via scan · ${r.code}`));
      if (r.checkedOutAt) out.push(mkEntry(r.checkedOutAt, r.driverName, "USER", "CHECK_OUT", "info", r.slotNumber, r.code));
    }
    for (const tx of w.transactions) {
      if (tx.type === "TOP_UP") {
        const actor = OP_PEOPLE[hashStr(tx.id) % OP_PEOPLE.length].name;
        out.push(mkEntry(tx.createdAt, actor, "USER", "TOP_UP", "info", undefined, rupiah(tx.amount)));
      }
    }
  }

  // maintenance slots → warnings by the operator
  const op = operatorName;
  for (const list of Object.values(slotsByCampus)) {
    for (const s of list) {
      if (s.status === "MAINTENANCE") {
        out.push(mkEntry(Date.now() - 5 * HOUR, op, "OPERATOR", "SLOT_MAINTENANCE", "warning", s.slotNumber));
      }
    }
  }

  // one SYSTEM entry
  out.push(mkEntry(Date.now() - 3 * HOUR, "Sistem Parkir", "SYSTEM", "PROMO_BROADCAST", "info", "promo", "128 penerima"));

  out.sort((a, b) => a.at - b.at);
  return out.slice(-AUDIT_CAP);
}

// ───────────────────────── live engine ─────────────────────────

let liveTimer: ReturnType<typeof setInterval> | null = null;
let liveTickN = 0;

export const useParkir = create<ParkirState>((set, get) => {
  /** Append-only audit - capped, never rewrites history. */
  const audit = (
    action: AuditAction,
    opts: {
      actor?: string;
      role?: AuditEntry["role"];
      severity?: AuditEntry["severity"];
      target?: string;
      detail?: string;
      at?: number;
    } = {}
  ) => {
    const s = get();
    const actor = opts.actor ?? s.user.name;
    const role = opts.role ?? s.user.role;
    const entry: AuditEntry = {
      id: uid(),
      sessionId: SESSION_ID,
      at: opts.at ?? Date.now(),
      actor,
      role,
      action,
      severity: opts.severity ?? "info",
      target: opts.target,
      detail: opts.detail,
      ip: fakeIp(role, actor),
    };
    set({ auditLog: [...s.auditLog, entry].slice(-AUDIT_CAP) });
  };

  return {
    lang: "id",
    signedIn: false,
    user: {
      name: "Rizky Pratama",
      email: "rizky.pratama@binus.ac.id",
      isBinusian: true,
      memberSince: "Sep 2024",
      role: "USER" as const,
    },
    vehicles: [
      {
        id: "veh-1",
        nickname: "HRV Harian",
        licensePlate: "B 2143 RWZ",
        brand: "Honda",
        model: "HR-V",
        color: "Hitam",
        bodyType: "SUV",
      },
      {
        id: "veh-2",
        nickname: "Avanza Keluarga",
        licensePlate: "B 8712 KLM",
        brand: "Toyota",
        model: "Avanza",
        color: "Putih",
        bodyType: "MPV",
      },
    ],
    slotsByCampus: {
      anggrek: buildSlots(),
      alamsutera: buildAlamSuteraSlots(),
      bekasi: buildBekasiSlots(),
    },
    slots: buildSlots(),
    reservations: [],
    transactions: [],
    walletBalance: 0,
    toasts: [],
    notifications: [],
    viewWindow: defaultWindow(),
    campusId: "anggrek",
    auditLog: [],
    liveOn: false,
    pushEnabled: false,
    liveStatus: "offline",
    liveEvents: [],
    liveGuests: [],
    liveLatency: 0,
    liveReconnects: 0,
    liveUptimeStart: 0,

    selectCampus: (id) => {
      set((s) => ({ campusId: id, slots: s.slotsByCampus[id] ?? [] }));
      audit("CAMPUS_SWITCHED", { target: id });
    },
    setLang: (l) => set({ lang: l }),
    setViewWindow: (w) => set({ viewWindow: w }),

    toast: (message, tone = "info") => {
      const id = uid();
      set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 3800);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    pushNotif: (n) =>
      set((s) => {
        if (n.key && s.notifications.some((x) => x.key === n.key)) return s;
        return {
          notifications: [
            {
              id: uid(),
              key: n.key,
              kind: n.kind,
              params: n.params,
              createdAt: n.createdAt ?? Date.now(),
              read: n.read ?? false,
            },
            ...s.notifications,
          ],
        };
      }),

    markNotifsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

    clearNotifs: () => set({ notifications: [] }),

    setPushEnabled: (v) => set({ pushEnabled: v }),

    signIn: (kind) => {
      const now = Date.now();
      if (kind === "operator") {
        const world = seedOperatorWorld(now);
        const asWorld = seedAlamSuteraWorld(now);
        const bkWorld = seedBekasiWorld(now);
        const slotsByCampus = get().slotsByCampus;
        set({
          signedIn: true,
          user: {
            name: "Andi Wijaya",
            email: "operator.anggrek@binus.ac.id",
            isBinusian: true,
            memberSince: "Feb 2024",
            role: "OPERATOR",
          },
          reservations: [...world.reservations, ...asWorld.reservations, ...bkWorld.reservations],
          transactions: [...world.transactions, ...asWorld.transactions, ...bkWorld.transactions],
          walletBalance: 230000,
          auditLog: seedAuditLog([world, asWorld, bkWorld], slotsByCampus, "Andi Wijaya"),
        });
        audit("SIGN_IN", { actor: "Andi Wijaya", role: "OPERATOR", detail: "SSO Microsoft · shift pagi" });
        return;
      }
      const profiles: Record<"student" | "general" | "microsoft", Omit<User, "role">> = {
        student: {
          name: "Rizky Pratama",
          email: "rizky.pratama@binus.ac.id",
          isBinusian: true,
          memberSince: "Sep 2024",
          phone: "+62 812 3456 7890",
          nim: "2540123456",
        },
        microsoft: {
          name: "Alya Ramadhani",
          email: "alya.ramadhani@binus.ac.id",
          isBinusian: true,
          memberSince: "Feb 2025",
        },
        general: {
          name: "Dimas Saputra",
          email: "dimas.saputra@gmail.com",
          isBinusian: false,
          memberSince: "Jan 2026",
        },
      };
      const mine = [
        ...seedReservations(now),
        ...seedAlamSuteraWorld(now).reservations,
        ...seedBekasiWorld(now).reservations,
      ];
      // Believable notification inbox, derived from the seeded world.
      const me = profiles[kind].name;
      const activeOwn = mine.find((r) => r.driverName === me && r.status === "CHECKED_IN");
      const upcomingOwn = mine.find((r) => r.driverName === me && r.status === "CONFIRMED" && r.date >= dateStr(new Date(now)));
      const completedOwn = [...mine]
        .filter((r) => r.driverName === me && r.status === "COMPLETED" && r.checkedOutAt)
        .sort((a, b) => (b.checkedOutAt ?? 0) - (a.checkedOutAt ?? 0))[0];
      const seedNotifs: Notif[] = [
        ...(activeOwn
          ? [{
              id: uid(), key: `seed-start:${activeOwn.id}`, kind: "session_start" as const,
              params: { slot: activeOwn.slotNumber, end: activeOwn.endTime },
              createdAt: activeOwn.checkedInAt ?? now, read: true,
            }]
          : []),
        ...(upcomingOwn
          ? [{
              id: uid(), key: `seed-book:${upcomingOwn.id}`, kind: "booking" as const,
              params: { slot: upcomingOwn.slotNumber, code: upcomingOwn.code },
              createdAt: upcomingOwn.createdAt, read: true,
            }]
          : []),
        ...(completedOwn
          ? [{
              id: uid(), kind: "receipt" as const,
              params: {
                slot: completedOwn.slotNumber,
                total: rupiah(completedOwn.serviceFee + completedOwn.overtimeFee),
              },
              createdAt: completedOwn.checkedOutAt ?? now - DAY, read: true,
            }]
          : []),
        {
          id: uid(), key: "seed-promo", kind: "promo" as const,
          params: {}, createdAt: now - 3 * HOUR, read: false,
        },
        {
          id: uid(), key: "seed-welcome", kind: "welcome" as const,
          params: {}, createdAt: now - 26 * HOUR, read: true,
        },
      ];
      set({
        signedIn: true,
        user: { ...profiles[kind], role: "USER" },
        reservations: mine,
        transactions: seedTxns(now),
        walletBalance: 230000,
        notifications: seedNotifs,
        auditLog: [],
      });
      audit("SIGN_IN", { detail: kind === "microsoft" ? "SSO Microsoft" : "akun demo" });
    },

    signOut: () => {
      audit("SIGN_OUT");
      if (liveTimer) {
        clearInterval(liveTimer);
        liveTimer = null;
      }
      liveTickN = 0;
      set({
        signedIn: false,
        reservations: [],
        transactions: [],
        walletBalance: 0,
        notifications: [],
        liveOn: false,
        liveStatus: "offline",
        liveEvents: [],
        liveGuests: [],
        liveLatency: 0,
        liveReconnects: 0,
        liveUptimeStart: 0,
      });
    },

    updateProfile: (patch) => {
      set((s) => ({
        user: {
          ...s.user,
          name: patch.name,
          email: patch.email,
          phone: patch.phone || undefined,
          nim: patch.nim || undefined,
        },
      }));
      audit("PROFILE_UPDATE", { detail: `${patch.name} <${patch.email}>` });
    },

    setAvatar: (dataUrl) => {
      set((s) => ({ user: { ...s.user, avatar: dataUrl } }));
      audit("PROFILE_UPDATE", { detail: dataUrl ? "foto profil diubah" : "foto profil dihapus" });
    },

    addVehicle: (v) =>
      set((s) => ({
        vehicles: [...s.vehicles, { id: uid(), ...v }],
      })),

    updateVehicle: (id, v) =>
      set((s) => ({
        vehicles: s.vehicles.map((veh) => (veh.id === id ? { ...veh, ...v } : veh)),
      })),

    removeVehicle: (id) => set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),

    setSlotStatus: (slotId, status) => {
      const s = get();
      const slot = s.slots.find((x) => x.id === slotId);
      const next = s.slots.map((sl) => (sl.id === slotId ? { ...sl, status } : sl));
      set({
        slots: next,
        slotsByCampus: { ...s.slotsByCampus, [s.campusId]: next },
      });
      audit(status === "MAINTENANCE" ? "SLOT_MAINTENANCE" : "SLOT_REACTIVATED", {
        severity: status === "MAINTENANCE" ? "warning" : "info",
        target: slot?.slotNumber ?? slotId,
      });
    },

    broadcastPromo: () => {
      get().pushNotif({ key: `promo:${Date.now()}`, kind: "promo", params: {} });
      audit("PROMO_BROADCAST", { detail: "promo kampus dikirim ke semua pengguna aktif" });
    },

    book: ({ slotId, slotNumber, type, date, startTime, endTime, vehiclePlate, vehicleName }) => {
      const { walletBalance } = get();
      // Dynamic pricing - the service fee follows the live demand tier.
      const demand = demandNow(get().slots, get().reservations);
      const fee = type === "ADVANCE" ? DEMAND_TIERS[demand.tier].advanceFee : DEMAND_TIERS[demand.tier].walkInFee;
      if (walletBalance < fee) {
        return null;
      }
      const now = Date.now();
      const res: Reservation = {
        id: uid(),
        code: resCode(),
        type,
        demandTier: demand.tier,
        slotId,
        slotNumber,
        date,
        startTime,
        endTime,
        status: "CONFIRMED",
        serviceFee: fee,
        overtimeFee: 0,
        refundAmount: 0,
        vehiclePlate,
        vehicleName,
        driverName: get().user.name,
        createdAt: now,
      };
      const txn: Txn = {
        id: uid(),
        type: "SERVICE_FEE",
        amount: fee,
        createdAt: now,
        note: res.code,
      };
      set((s) => ({
        reservations: [res, ...s.reservations],
        transactions: [txn, ...s.transactions],
        walletBalance: s.walletBalance - fee,
      }));
      get().pushNotif({ kind: "booking", params: { slot: slotNumber, code: res.code } });
      audit("BOOKING_CREATED", { target: slotNumber, detail: `${res.code} · ${rupiah(fee)}` });
      return res;
    },

    cancelReservation: (id) => {
      const now = Date.now();
      const { reservations } = get();
      const target = reservations.find((r) => r.id === id);
      if (!target || target.status !== "CONFIRMED") return;
      const startMs = new Date(`${target.date}T${target.startTime}:00`).getTime();
      const refund = refundAmount(target.serviceFee, startMs, now, target.createdAt);
      set((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "CANCELLED" as ResStatus, refundAmount: refund } : r
        ),
        walletBalance: s.walletBalance + refund,
        transactions: [
          { id: uid(), type: "REFUND", amount: refund, createdAt: now, note: target.code },
          ...s.transactions,
        ],
      }));
      audit("BOOKING_CANCELLED", { target: target.slotNumber, detail: target.code });
      if (refund > 0) {
        get().pushNotif({ kind: "refund", params: { amount: rupiah(refund), code: target.code } });
        audit("REFUND_ISSUED", { target: target.slotNumber, detail: `${rupiah(refund)} · ${target.code}` });
      }
    },

    checkIn: (id) => {
      const now = Date.now();
      const { reservations } = get();
      const target = reservations.find((r) => r.id === id && r.status === "CONFIRMED");
      if (!target) return false;
      const me = get().user.name;
      const activeNow = reservations.filter((r) => r.status === "CHECKED_IN" && r.driverName === me).length;
      if (activeNow >= MAX_ACTIVE_PARKING) return false;
      set((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "CHECKED_IN" as ResStatus, checkedInAt: now } : r
        ),
      }));
      get().pushNotif({ kind: "session_start", params: { slot: target.slotNumber, end: target.endTime } });
      audit("CHECK_IN", { target: target.slotNumber, detail: `${target.code} · via tiket` });
      return true;
    },

    checkOut: (id, via = "ticket") => {
      const now = Date.now();
      const { reservations, walletBalance } = get();
      const active = reservations.find((r) => r.id === id && r.status === "CHECKED_IN");
      if (!active) return { ok: false as const, reason: "not_found" as const };

      // v22 - NO parking fee. Only the late fine (per STARTED hour past the
      // booked window, rounded up, uncapped). On-time exit = zero charge.
      const plannedEnd = new Date(`${active.date}T${active.endTime}:00`).getTime();
      const lateMin = Math.max(0, Math.round((now - plannedEnd) / MIN));
      const oFee = overtimeFee(lateMin);
      if (oFee > 0 && walletBalance < oFee) return { ok: false as const, reason: "insufficient" as const };

      set((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === active.id
            ? {
                ...r,
                status: "COMPLETED" as ResStatus,
                checkedOutAt: now,
                overtimeFee: oFee,
              }
            : r
        ),
        walletBalance: s.walletBalance - oFee,
        transactions: [
          ...(oFee
            ? [{ id: uid(), type: "OVERTIME" as TxnType, amount: oFee, createdAt: now, note: active.code }]
            : []),
          ...s.transactions,
        ],
      }));
      get().pushNotif({
        kind: "receipt",
        params: { slot: active.slotNumber, total: rupiah(oFee) },
      });
      audit("CHECK_OUT", { target: active.slotNumber, detail: `${active.code} · via ${via} · ${rupiah(oFee)}` });
      return { ok: true as const, overtimeFee: oFee };
    },

    scanSlot: (slotNumberRaw) => {
      const now = Date.now();
      const { slots, reservations, walletBalance } = get();
      const code = slotNumberRaw.trim().toUpperCase().replace(/^(PB|AS|BKS)-?/, "");
      const slot = slots.find(
        (s) => s.slotNumber === code || s.slotNumber === code.replace("-", "") || `slot-${code.replace("-", "-")}` === s.id
      );
      if (!slot) return { ok: false as const, reason: "unknown" as const };
      if (slot.status === "MAINTENANCE") return { ok: false as const, reason: "maintenance" as const };

      const me = get().user.name;
      const activeNow = reservations.filter((r) => r.status === "CHECKED_IN" && r.driverName === me).length;

      // Own active session on this slot → checkout (reuse checkOut for identical fee logic)
      const active = reservations.find(
        (r) => r.slotId === slot.id && r.status === "CHECKED_IN" && r.driverName === me
      );
      if (active) {
        const out = get().checkOut(active.id, "scan");
        return out.ok
          ? { ok: true as const, kind: "checkout" as const, reservation: active }
          : { ok: false as const, reason: "insufficient" as const };
      }

      // Own confirmed reservation on this slot → check in
      const confirmed = reservations.find(
        (r) => r.slotId === slot.id && r.status === "CONFIRMED" && r.driverName === me
      );
      if (confirmed) {
        if (activeNow >= MAX_ACTIVE_PARKING)
          return { ok: false as const, reason: "max_active" as const };
        set((s) => ({
          reservations: s.reservations.map((r) =>
            r.id === confirmed.id ? { ...r, status: "CHECKED_IN" as ResStatus, checkedInAt: now } : r
          ),
        }));
        audit("CHECK_IN", { target: slot.slotNumber, detail: `${confirmed.code} · via scan` });
        return { ok: true as const, kind: "checkin" as const, reservation: confirmed };
      }

      // Any other active/confirmed overlapping right now → busy
      const busy = reservations.find(
        (r) =>
          r.slotId === slot.id &&
          ["CONFIRMED", "CHECKED_IN"].includes(r.status) &&
          r.date === dateStr(new Date(now))
      );
      if (busy) return { ok: false as const, reason: "busy" as const };

      // Free slot → walk-in session, charged at the live dynamic walk-in rate
      if (activeNow >= MAX_ACTIVE_PARKING)
        return { ok: false as const, reason: "max_active" as const };
      const demand = demandNow(slots, reservations);
      const walkInFee = DEMAND_TIERS[demand.tier].walkInFee;
      if (walletBalance < walkInFee)
        return { ok: false as const, reason: "insufficient" as const };

      const nowD = new Date(now);
      const res: Reservation = {
        id: uid(),
        code: resCode(),
        type: "WALK_IN",
        demandTier: demand.tier,
        slotId: slot.id,
        slotNumber: slot.slotNumber,
        date: dateStr(nowD),
        startTime: timeStr(nowD),
        endTime: addH(timeStr(nowD), 2),
        status: "CHECKED_IN",
        serviceFee: walkInFee,
        overtimeFee: 0,
        refundAmount: 0,
        vehiclePlate: get().vehicles[0]?.licensePlate ?? "B 2143 RWZ",
        vehicleName: get().vehicles[0]?.model ?? "Honda HR-V",
        driverName: get().user.name,
        createdAt: now,
        checkedInAt: now,
      };
      set((s) => ({
        reservations: [res, ...s.reservations],
        walletBalance: s.walletBalance - walkInFee,
        transactions: [
          { id: uid(), type: "SERVICE_FEE", amount: walkInFee, createdAt: now, note: res.code },
          ...s.transactions,
        ],
      }));
      get().pushNotif({ kind: "session_start", params: { slot: slot.slotNumber, end: res.endTime } });
      audit("WALK_IN_STARTED", { target: slot.slotNumber, detail: `${res.code} · ${rupiah(walkInFee)}` });
      return { ok: true as const, kind: "walkin" as const, reservation: res };
    },

    forceCheckOut: (id) => {
      const now = Date.now();
      const active = get().reservations.find((r) => r.id === id && r.status === "CHECKED_IN");
      if (!active) return { ok: false as const, reason: "not_found" as const };

      // v22 - only the late fine is recorded.
      const plannedEnd = new Date(`${active.date}T${active.endTime}:00`).getTime();
      const lateMin = Math.max(0, Math.round((now - plannedEnd) / MIN));
      const oFee = overtimeFee(lateMin);

      set((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === id
            ? { ...r, status: "COMPLETED" as ResStatus, checkedOutAt: now, overtimeFee: oFee }
            : r
        ),
        transactions: [
          ...(oFee
            ? [{ id: uid(), type: "OVERTIME" as TxnType, amount: oFee, createdAt: now, note: active.code }]
            : []),
          ...s.transactions,
        ],
      }));
      audit("FORCE_CHECKOUT", {
        severity: "warning",
        target: active.slotNumber,
        detail: `${active.code} · ${active.driverName} · ${rupiah(oFee)}`,
      });
      return { ok: true as const, overtimeFee: oFee };
    },

    extendSession: (id, hours) => {
      const target = get().reservations.find(
        (r) => r.id === id && ["CHECKED_IN", "CONFIRMED"].includes(r.status)
      );
      if (!target) return false;
      const endMin = toMinutes(target.endTime);
      const next = Math.min(endMin + hours * 60, TARIFF.closeHour * 60);
      if (next <= endMin) return false;
      // Conflict guard - don't extend into another reservation's window on the same slot.
      const nextWin: TimeWindow = { date: target.date, startTime: target.endTime, endTime: fromMinutes(next) };
      const clash = get().reservations.some(
        (r) =>
          r.id !== id &&
          r.slotId === target.slotId &&
          (r.status === "CONFIRMED" || r.status === "CHECKED_IN") &&
          overlaps(
            { date: r.date, startTime: r.startTime, endTime: r.endTime },
            nextWin
          )
      );
      if (clash) return false;
      set((s) => ({
        reservations: s.reservations.map((r) => (r.id === id ? { ...r, endTime: fromMinutes(next) } : r)),
      }));
      get().pushNotif({
        kind: "extended",
        params: { slot: target.slotNumber, end: fromMinutes(next) },
      });
      audit("SESSION_EXTENDED", { target: target.slotNumber, detail: `${target.code} → ${fromMinutes(next)}` });
      return true;
    },

    manualCheckIn: (id) => {
      const target = get().reservations.find((r) => r.id === id && r.status === "CONFIRMED");
      if (!target) return false;
      const now = Date.now();
      set((s) => ({
        reservations: s.reservations.map((r) =>
          r.id === id ? { ...r, status: "CHECKED_IN" as ResStatus, checkedInAt: now } : r
        ),
      }));
      audit("MANUAL_CHECKIN", { severity: "warning", target: target.slotNumber, detail: target.code });
      return true;
    },

    topUp: (amount, note) => {
      const now = Date.now();
      set((s) => ({
        walletBalance: s.walletBalance + amount,
        transactions: [{ id: uid(), type: "TOP_UP", amount, createdAt: now, note: note ?? "" }, ...s.transactions],
      }));
      audit("TOP_UP", { detail: `${rupiah(amount)}${note ? ` · ${note}` : ""}` });
    },

    // ── live gate stream (v23) - guests NEVER touch reservations/txns/ledger ──
    liveToggle: () => {
      const on = !get().liveOn;
      if (on) {
        set({
          liveOn: true,
          liveStatus: "connecting",
          liveEvents: [],
          liveGuests: [],
          liveLatency: 0,
          liveReconnects: 0,
          liveUptimeStart: Date.now(),
        });
        setTimeout(() => {
          if (get().liveOn) set({ liveStatus: "live" });
        }, 900);
        if (liveTimer) clearInterval(liveTimer);
        liveTimer = setInterval(() => get().liveStep(), 3400);
      } else {
        if (liveTimer) {
          clearInterval(liveTimer);
          liveTimer = null;
        }
        liveTickN = 0;
        set({ liveOn: false, liveStatus: "offline", liveEvents: [], liveGuests: [] });
      }
    },

    liveStep: () => {
      const s = get();
      if (!s.liveOn || s.liveStatus !== "live") return;
      liveTickN++;

      // reconnect every 11th tick (1.3s connecting blip)
      if (liveTickN % 11 === 0) {
        set({ liveStatus: "connecting" });
        setTimeout(() => {
          if (get().liveOn) set({ liveStatus: "live", liveReconnects: get().liveReconnects + 1 });
        }, 1300);
        return;
      }

      const latency = 8 + Math.floor(Math.random() * 34); // 8–41 ms
      const now = Date.now();

      // occupancy-weighted direction: busy lot → more exits than entries
      const win: TimeWindow = {
        date: dateStr(new Date(now)),
        startTime: timeStr(new Date(now - 60_000)),
        endTime: timeStr(new Date(now + 60_000)),
      };
      let active = 0;
      let taken = 0;
      for (const sl of s.slots) {
        if (sl.status === "MAINTENANCE") continue;
        active++;
        const st = slotStatusForWindow(sl, s.reservations, win);
        if (st !== "AVAILABLE") taken++;
      }
      const occPct = active ? (taken / active) * 100 : 0;
      const pOut = occPct > 70 ? 0.68 : 0.42;
      const wantOut = s.liveGuests.length > 0 && Math.random() < pOut;

      let events = s.liveEvents;
      let guests = s.liveGuests;

      if (wantOut) {
        const idx = Math.floor(Math.random() * guests.length);
        const g = guests[idx];
        guests = guests.filter((x) => x.id !== g.id);
        events = [
          { id: uid(), at: now, kind: "out" as const, plate: g.plate, vehicle: g.vehicle, slotNumber: g.slotNumber, guestId: g.id },
          ...events,
        ];
      } else {
        // pick a slot that is FREE right now and not taken by another guest
        const free = s.slots.filter(
          (sl) =>
            sl.status === "ACTIVE" &&
            slotStatusForWindow(sl, s.reservations, win) === "AVAILABLE" &&
            !guests.some((g) => g.slotId === sl.id)
        );
        if (free.length > 0) {
          const pool = LIVE_PEOPLE.filter((p) => !guests.some((g) => g.plate === p.plate));
          if (pool.length > 0) {
            const person = pool[Math.floor(Math.random() * pool.length)];
            const slot = free[Math.floor(Math.random() * free.length)];
            const guest: LiveGuest = {
              id: uid(),
              plate: person.plate,
              vehicle: person.vehicle,
              name: person.name,
              slotId: slot.id,
              slotNumber: slot.slotNumber,
              since: now,
            };
            guests = [...guests, guest];
            events = [
              { id: uid(), at: now, kind: "in" as const, plate: person.plate, vehicle: person.vehicle, slotNumber: slot.slotNumber, guestId: guest.id },
              ...events,
            ];
          }
        }
      }

      set({ liveEvents: events.slice(0, 40), liveGuests: guests, liveLatency: latency });
    },
  };
});

// ── e2e hook - expose the store on window for Playwright ──
if (typeof window !== "undefined") {
  (window as unknown as { __parkir?: unknown }).__parkir = {
    getState: useParkir.getState,
    setState: useParkir.setState,
    api: useParkir.getState(),
    SESSION_ID,
  };
}
