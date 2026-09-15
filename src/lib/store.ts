"use client";
/**
 * Parkir Binus preview store — client-side simulation of the full product loop:
 * auth → browse availability → book → check-in (scan) → check-out (scan or ticket) → fees/refund.
 */
import { create } from "zustand";
import {
  buildSlots,
  dateStr,
  overtimeFee,
  parkingFee,
  refundAmount,
  resCode,
  TARIFF,
  timeStr,
  toMinutes,
  fromMinutes,
  uid,
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

interface ParkirState {
  lang: Lang;
  signedIn: boolean;
  user: User;
  vehicles: Vehicle[];
  slots: Slot[];
  reservations: Reservation[];
  transactions: Txn[];
  walletBalance: number;
  toasts: Toast[];
  viewWindow: TimeWindow;

  setLang: (l: Lang) => void;
  setViewWindow: (w: TimeWindow) => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;

  signIn: (kind: "student" | "general" | "operator") => void;
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
  checkIn: (id: string) => void;

  /** End an active session — charges parking + overtime fees from wallet */
  checkOut: (id: string) =>
    | { ok: true; parkingFee: number; overtimeFee: number }
    | { ok: false; reason: "not_found" | "insufficient" };

  /** Scan a slot QR → walk-in start, check-in, or check-out depending on state */
  scanSlot: (slotNumber: string) =>
    | { ok: true; kind: "walkin" | "checkin" | "checkout"; reservation?: Reservation }
    | { ok: false; reason: "unknown" | "busy" | "maintenance" | "no_reservation" | "insufficient" };

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
  slots: buildSlots(),
  reservations: [],
  transactions: [],
  walletBalance: 0,
  toasts: [],
  viewWindow: defaultWindow(),

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

  signIn: (kind) => {
    const now = Date.now();
    if (kind === "operator") {
      set({
        signedIn: true,
        user: {
          name: "Andi Wijaya",
          email: "operator.anggrek@binus.ac.id",
          isBinusian: true,
          memberSince: "Feb 2024",
          role: "OPERATOR",
        },
        reservations: seedReservations(now),
        transactions: seedTxns(now),
        walletBalance: 230000,
      });
      return;
    }
    set({
      signedIn: true,
      user:
        kind === "student"
          ? {
              name: "Rizky Pratama",
              email: "rizky.pratama@binus.ac.id",
              isBinusian: true,
              memberSince: "Sep 2024",
              role: "USER",
            }
          : {
              name: "Dimas Saputra",
              email: "dimas.saputra@gmail.com",
              isBinusian: false,
              memberSince: "Jan 2026",
              role: "USER",
            },
      reservations: seedReservations(now),
      transactions: seedTxns(now),
      walletBalance: 230000,
    });
  },

  signOut: () => set({ signedIn: false, reservations: [], transactions: [], walletBalance: 0 }),

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
    set((s) => ({
      slots: s.slots.map((sl) => (sl.id === slotId ? { ...sl, status } : sl)),
    })),

  book: ({ slotId, slotNumber, type, date, startTime, endTime, vehiclePlate, vehicleName }) => {
    const { walletBalance, lang } = get();
    const fee = type === "ADVANCE" ? TARIFF.advanceFee : TARIFF.walkInFee;
    if (walletBalance < fee) {
      return null;
    }
    const now = Date.now();
    const res: Reservation = {
      id: uid(),
      code: resCode(),
      type,
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
    void lang;
  },

  checkIn: (id) => {
    const now = Date.now();
    set((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === id && r.status === "CONFIRMED"
          ? { ...r, status: "CHECKED_IN" as ResStatus, checkedInAt: now }
          : r
      ),
    }));
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
    return { ok: true as const, parkingFee: pFee, overtimeFee: oFee };
  },

  scanSlot: (slotNumberRaw) => {
    const now = Date.now();
    const { slots, reservations, walletBalance } = get();
    const code = slotNumberRaw.trim().toUpperCase().replace(/^PB-?/, "");
    const slot = slots.find(
      (s) => s.slotNumber === code || s.slotNumber === code.replace("-", "") || `slot-${code.replace("-", "-")}` === s.id
    );
    if (!slot) return { ok: false as const, reason: "unknown" as const };
    if (slot.status === "MAINTENANCE") return { ok: false as const, reason: "maintenance" as const };

    // Own active session on this slot → checkout (reuse checkOut for identical fee logic)
    const active = reservations.find(
      (r) => r.slotId === slot.id && r.status === "CHECKED_IN"
    );
    if (active) {
      const out = get().checkOut(active.id);
      return out.ok
        ? { ok: true as const, kind: "checkout" as const, reservation: active }
        : { ok: false as const, reason: "insufficient" as const };
    }

    // Own confirmed reservation on this slot → check in
    const confirmed = reservations.find(
      (r) => r.slotId === slot.id && r.status === "CONFIRMED"
    );
    if (confirmed) {
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

    // Free slot → walk-in session, charged at walk-in rate
    if (walletBalance < TARIFF.walkInFee)
      return { ok: false as const, reason: "insufficient" as const };

    const nowD = new Date(now);
    const res: Reservation = {
      id: uid(),
      code: resCode(),
      type: "WALK_IN",
      slotId: slot.id,
      slotNumber: slot.slotNumber,
      date: dateStr(nowD),
      startTime: timeStr(nowD),
      endTime: addH(timeStr(nowD), 2),
      status: "CHECKED_IN",
      serviceFee: TARIFF.walkInFee,
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
      walletBalance: s.walletBalance - TARIFF.walkInFee,
      transactions: [
        { id: uid(), type: "SERVICE_FEE", amount: TARIFF.walkInFee, createdAt: now, note: res.code },
        ...s.transactions,
      ],
    }));
    return { ok: true as const, kind: "walkin" as const, reservation: res };
  },

  topUp: (amount) => {
    const now = Date.now();
    set((s) => ({
      walletBalance: s.walletBalance + amount,
      transactions: [{ id: uid(), type: "TOP_UP", amount, createdAt: now, note: "" }, ...s.transactions],
    }));
  },
}));
