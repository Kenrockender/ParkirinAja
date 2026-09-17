"use client";
/**
 * Parkir Binus preview store — client-side simulation of the full product loop:
 * auth → browse availability → book → check-in (scan) → check-out (scan or ticket) → fees/refund.
 */
import { create } from "zustand";
import {
  buildAlamSuteraSlots,
  buildBekasiSlots,
  buildSlots,
  type Notif,
  dateStr,
  demandNow,
  DEMAND_TIERS,
  overlaps,
  overtimeFee,
  parkingFee,
  refundAmount,
  resCode,
  rupiah,
  TARIFF,
  timeStr,
  toMinutes,
  fromMinutes,
  uid,
  type CampusId,
  type Lang,
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

export interface User {
  name: string;
  email: string;
  isBinusian: boolean;
  memberSince: string;
  role: "USER" | "OPERATOR";
}

interface Toast {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

/** Push a notification (dedupe by key — auto-events reuse keys like "end:<resId>"). */
type PushNotif = (n: Pick<Notif, "kind" | "params"> & { key?: string; createdAt?: number; read?: boolean }) => void;

interface ParkirState {
  lang: Lang;
  signedIn: boolean;
  user: User;
  vehicles: Vehicle[];
  /** Slots of the active campus (mirrors slotsByCampus[campusId]). */
  slots: Slot[];
  /** Per-campus slot worlds — Anggrek building lot & Alam Sutera open lot. */
  slotsByCampus: Record<CampusId, Slot[]>;
  reservations: Reservation[];
  transactions: Txn[];
  walletBalance: number;
  toasts: Toast[];
  /** Customer notification center (structured — rendered per-language at display time). */
  notifications: Notif[];
  viewWindow: TimeWindow;
  /** Active campus — Coming Soon campuses are selectable but gated in the UI. */
  campusId: CampusId;

  selectCampus: (id: CampusId) => void;
  setLang: (l: Lang) => void;
  setViewWindow: (w: TimeWindow) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;

  pushNotif: PushNotif;
  markNotifsRead: () => void;
  clearNotifs: () => void;

  signIn: (kind: "student" | "general" | "operator" | "microsoft") => void;
  signOut: () => void;

  addVehicle: (v: { nickname: string; licensePlate: string; brand: string | null; model: string | null; color: string | null }) => void;
  updateVehicle: (id: string, v: { nickname: string; licensePlate: string; brand: string | null; model: string | null; color: string | null }) => void;
  removeVehicle: (id: string) => void;

  /** Operator: toggle a slot between ACTIVE and MAINTENANCE */
  setSlotStatus: (slotId: string, status: Slot["status"]) => void;

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

  /** End an active session — charges parking + overtime fees from wallet */
  checkOut: (id: string) =>
    | { ok: true; parkingFee: number; overtimeFee: number }
    | { ok: false; reason: "not_found" | "insufficient" };

  /** Scan a slot QR → walk-in start, check-in, or check-out depending on state */
  scanSlot: (slotNumber: string) =>
    | { ok: true; kind: "walkin" | "checkin" | "checkout"; reservation?: Reservation }
    | { ok: false; reason: "unknown" | "busy" | "maintenance" | "no_reservation" | "insufficient" | "max_active" };

  /** Operator: end any active session on the spot — fees recorded as on-site payment */
  forceCheckOut: (id: string) =>
    | { ok: true; parkingFee: number; overtimeFee: number }
    | { ok: false; reason: "not_found" };

  /** Operator: extend a session/booking window by N hours (capped at closing time) */
  extendSession: (id: string, hours: number) => boolean;

  /** Operator: manual check-in for a confirmed reservation (bypasses customer limits) */
  manualCheckIn: (id: string) => boolean;

  topUp: (amount: number) => void;
}

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
    parkingFee: 0,
    overtimeFee: 0,
    refundAmount: 0,
    vehiclePlate: "B 2143 RWZ",
    vehicleName: "Honda Vario 160",
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
    // Completed yesterday with parking + overtime
    mk({
      slotId: "slot-B-2",
      slotNumber: "B-02",
      date: yesterday,
      startTime: "08:00",
      endTime: "10:00",
      status: "COMPLETED",
      createdAt: now - 2 * DAY,
      checkedInAt: now - DAY - 4 * HOUR,
      checkedOutAt: now - DAY - 90 * MIN,
      parkingFee: TARIFF.parkFirstHoursFee,
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
    { id: uid(), type: "TOP_UP", amount: 100000, createdAt: now - 9 * DAY, note: "" },
    { id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: now - 8 * DAY, note: "PB-KLM8241" },
    { id: uid(), type: "REFUND", amount: TARIFF.advanceFee / 2, createdAt: now - 7 * DAY, note: "PB-KLM8241" },
    { id: uid(), type: "TOP_UP", amount: 150000, createdAt: now - 3 * DAY, note: "" },
    { id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: now - 2 * DAY, note: "PB-QRT3310" },
    { id: uid(), type: "PARKING_FEE", amount: TARIFF.parkFirstHoursFee, createdAt: now - 90 * MIN, note: "PB-QRT3310" },
    { id: uid(), type: "OVERTIME", amount: TARIFF.overtimeFeePerHour, createdAt: now - 88 * MIN, note: "PB-QRT3310" },
    { id: uid(), type: "SERVICE_FEE", amount: TARIFF.advanceFee, createdAt: now - 4 * MIN, note: "PB-JHD5527" },
  ];
}

// ─────────────────── Operator console demo world ───────────────────

/** Deterministic PRNG — module level so the seeded world stays stable per session. */
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

/** Drivers that "fill" the parking building while the operator is on shift. */
const OP_PEOPLE: { name: string; plate: string; vehicle: string }[] = [
  { name: "Alya Ramadhani", plate: "B 2741 AKL", vehicle: "Honda Beat" },
  { name: "Bagus Prasetyo", plate: "B 1877 TRK", vehicle: "Yamaha NMAX" },
  { name: "Citra Dewi", plate: "B 5512 MNH", vehicle: "Toyota Calya" },
  { name: "Daffa Hakim", plate: "B 1680 PQW", vehicle: "Honda Vario 125" },
  { name: "Elang Satria", plate: "B 8625 JKT", vehicle: "Suzuki Ertiga" },
  { name: "Farah Nabila", plate: "B 3908 KLM", vehicle: "Honda Scoopy" },
  { name: "Gilang Ramadhan", plate: "B 6634 BVN", vehicle: "Toyota Avanza" },
  { name: "Hana Salsabila", plate: "B 4419 QWE", vehicle: "Yamaha Mio" },
  { name: "Iqbal Maulana", plate: "B 7230 RTY", vehicle: "Honda CB150" },
  { name: "Jihan Aprilia", plate: "B 9023 UIO", vehicle: "Honda Brio" },
  { name: "Kevin Wijaya", plate: "B 1123 PAS", vehicle: "Yamaha Lexi" },
  { name: "Luna Maharani", plate: "B 7856 GHD", vehicle: "Daihatsu Ayla" },
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
 * Alam Sutera live world — other parkers only, so the open lot opens at a
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
    serviceFee: TARIFF.walkInFee,
    parkingFee: 0,
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
    txns.push({ id: uid(), type: "SERVICE_FEE", amount: TARIFF.walkInFee, createdAt: inAt, note: r.code });
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
 * Bekasi live world — other parkers only, so the open lot opens at a
 * believable ~42% occupancy (20 of 48 active bays) → NORMAL demand tier:
 * 17 walk-in sessions active now + 3 advance holds overlapping now.
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
    serviceFee: TARIFF.walkInFee,
    parkingFee: 0,
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
    txns.push({ id: uid(), type: "SERVICE_FEE", amount: TARIFF.walkInFee, createdAt: inAt, note: r.code });
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
    serviceFee: TARIFF.walkInFee,
    parkingFee: 0,
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
    addTxn("SERVICE_FEE", TARIFF.walkInFee, inAt, r.code);
  }

  // ── 7 completed visits earlier today (one with overtime) ──
  const done: { off: number; dur: number; planned: number; p: number; slot: string; advance: boolean }[] = [
    { off: 390, dur: 95, planned: 2, p: 2, slot: "B-02", advance: false },
    { off: 330, dur: 55, planned: 2, p: 4, slot: "A-06", advance: true },
    { off: 300, dur: 185, planned: 2, p: 7, slot: "B-08", advance: false }, // overtime
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
      serviceFee: d.advance ? TARIFF.advanceFee : TARIFF.walkInFee,
      date: today,
      startTime: timeStr(inD),
      endTime: addH(timeStr(inD), d.planned),
      status: "COMPLETED",
      driverName: person.name,
      vehiclePlate: person.plate,
      vehicleName: person.vehicle,
      parkingFee: parkingFee(d.dur),
      overtimeFee: overtimeFee(lateMin),
      createdAt: d.advance ? Math.max(t0, inAt - 40 * MIN) : inAt,
      checkedInAt: inAt,
      checkedOutAt: outAt,
    });
    res.push(r);
    addTxn("SERVICE_FEE", r.serviceFee, r.createdAt, r.code);
    addTxn("PARKING_FEE", r.parkingFee, outAt, r.code);
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
  for (const tp of tops) addTxn("TOP_UP", tp.amount, Math.max(t0, now - tp.off * MIN), "");

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
          parkingFee: parkingFee(durMin),
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

export const useParkir = create<ParkirState>((set, get) => ({
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
      nickname: "Vario Harian",
      licensePlate: "B 2143 RWZ",
      brand: "Honda",
      model: "Vario 160",
      color: "Hitam",
    },
    {
      id: "veh-2",
      nickname: "Avanza Keluarga",
      licensePlate: "B 8712 KLM",
      brand: "Toyota",
      model: "Avanza",
      color: "Putih",
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

  selectCampus: (id) =>
    set((s) => ({ campusId: id, slots: s.slotsByCampus[id] ?? [] })),
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

  signIn: (kind) => {
    const now = Date.now();
    if (kind === "operator") {
      const world = seedOperatorWorld(now);
      const asWorld = seedAlamSuteraWorld(now);
      const bkWorld = seedBekasiWorld(now);
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
      });
      return;
    }
    const profiles: Record<"student" | "general" | "microsoft", Omit<User, "role">> = {
      student: {
        name: "Rizky Pratama",
        email: "rizky.pratama@binus.ac.id",
        isBinusian: true,
        memberSince: "Sep 2024",
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
              total: rupiah(completedOwn.parkingFee + completedOwn.overtimeFee + completedOwn.serviceFee),
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
    });
  },

  signOut: () =>
    set({ signedIn: false, reservations: [], transactions: [], walletBalance: 0, notifications: [] }),

  addVehicle: (v) =>
    set((s) => ({
      vehicles: [...s.vehicles, { id: uid(), ...v }],
    })),

  updateVehicle: (id, v) =>
    set((s) => ({
      vehicles: s.vehicles.map((veh) => (veh.id === id ? { ...veh, ...v } : veh)),
    })),

  removeVehicle: (id) => set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),

  setSlotStatus: (slotId, status) =>
    set((s) => {
      const next = s.slots.map((sl) => (sl.id === slotId ? { ...sl, status } : sl));
      return {
        slots: next,
        slotsByCampus: { ...s.slotsByCampus, [s.campusId]: next },
      };
    }),

  book: ({ slotId, slotNumber, type, date, startTime, endTime, vehiclePlate, vehicleName }) => {
    const { walletBalance, lang } = get();
    // Dynamic pricing — the service fee follows the live demand tier.
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
      parkingFee: 0,
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
    void lang;
    return res;
  },

  cancelReservation: (id) => {
    const now = Date.now();
    const { reservations, lang } = get();
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
    if (refund > 0) get().pushNotif({ kind: "refund", params: { amount: rupiah(refund), code: target.code } });
    void lang;
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
    return true;
  },

  checkOut: (id) => {
    const now = Date.now();
    const { reservations, walletBalance } = get();
    const active = reservations.find((r) => r.id === id && r.status === "CHECKED_IN");
    if (!active) return { ok: false as const, reason: "not_found" as const };

    const inAt = active.checkedInAt ?? now;
    const minutes = Math.max(1, Math.round((now - inAt) / MIN));
    const pFee = parkingFee(minutes);
    const plannedEnd = new Date(`${active.date}T${active.endTime}:00`).getTime();
    const lateMin = Math.max(0, Math.round((now - plannedEnd) / MIN));
    const oFee = overtimeFee(lateMin);
    const total = pFee + oFee;
    if (walletBalance < total) return { ok: false as const, reason: "insufficient" as const };

    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === active.id
          ? {
              ...r,
              status: "COMPLETED" as ResStatus,
              checkedOutAt: now,
              parkingFee: pFee,
              overtimeFee: oFee,
            }
          : r
      ),
      walletBalance: s.walletBalance - total,
      transactions: [
        ...(oFee
          ? [{ id: uid(), type: "OVERTIME" as TxnType, amount: oFee, createdAt: now, note: active.code }]
          : []),
        { id: uid(), type: "PARKING_FEE" as TxnType, amount: pFee, createdAt: now, note: active.code },
        ...s.transactions,
      ],
    }));
    get().pushNotif({
      kind: "receipt",
      params: { slot: active.slotNumber, total: rupiah(pFee + oFee) },
    });
    return { ok: true as const, parkingFee: pFee, overtimeFee: oFee };
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
      const out = get().checkOut(active.id);
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
      parkingFee: 0,
      overtimeFee: 0,
      refundAmount: 0,
      vehiclePlate: get().vehicles[0]?.licensePlate ?? "B 2143 RWZ",
      vehicleName: get().vehicles[0]?.model ?? "Honda Vario 160",
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
    return { ok: true as const, kind: "walkin" as const, reservation: res };
  },

  forceCheckOut: (id) => {
    const now = Date.now();
    const active = get().reservations.find((r) => r.id === id && r.status === "CHECKED_IN");
    if (!active) return { ok: false as const, reason: "not_found" as const };

    const inAt = active.checkedInAt ?? now;
    const minutes = Math.max(1, Math.round((now - inAt) / MIN));
    const pFee = parkingFee(minutes);
    const plannedEnd = new Date(`${active.date}T${active.endTime}:00`).getTime();
    const lateMin = Math.max(0, Math.round((now - plannedEnd) / MIN));
    const oFee = overtimeFee(lateMin);

    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === id
          ? { ...r, status: "COMPLETED" as ResStatus, checkedOutAt: now, parkingFee: pFee, overtimeFee: oFee }
          : r
      ),
      transactions: [
        ...(oFee
          ? [{ id: uid(), type: "OVERTIME" as TxnType, amount: oFee, createdAt: now, note: active.code }]
          : []),
        { id: uid(), type: "PARKING_FEE" as TxnType, amount: pFee, createdAt: now, note: active.code },
        ...s.transactions,
      ],
    }));
    return { ok: true as const, parkingFee: pFee, overtimeFee: oFee };
  },

  extendSession: (id, hours) => {
    const target = get().reservations.find(
      (r) => r.id === id && ["CHECKED_IN", "CONFIRMED"].includes(r.status)
    );
    if (!target) return false;
    const endMin = toMinutes(target.endTime);
    const next = Math.min(endMin + hours * 60, TARIFF.closeHour * 60);
    if (next <= endMin) return false;
    // Conflict guard — don't extend into another reservation's window on the same slot.
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
    return true;
  },

  topUp: (amount) => {
    const now = Date.now();
    set((s) => ({
      walletBalance: s.walletBalance + amount,
      transactions: [{ id: uid(), type: "TOP_UP", amount, createdAt: now, note: "" }, ...s.transactions],
    }));
  },
}));
