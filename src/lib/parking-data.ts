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
export type TxnType =
  | "TOP_UP"
  | "SERVICE_FEE"
  | "PARKING_FEE"
  | "OVERTIME"
  | "REFUND";

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
  slotId: string;
  slotNumber: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: ResStatus;
  serviceFee: number;
  parkingFee: number;
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
}

export interface Txn {
  id: string;
  type: TxnType;
  amount: number; // positive
  createdAt: number;
  note: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  theme: "coffee" | "carwash" | "event";
  ctaText: string;
  accent: string;
}

// ─────────────────────────── Tariffs ────────────────────────────

export const TARIFF = {
  advanceFee: 20000,
  walkInFee: 30000,
  overtimeFeePerHour: 5000,
  parkFirstHours: 2,
  parkFirstHoursFee: 20000,
  parkAddHourFee: 5000,
  parkMaxFee: 50000,
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
  for (const r of reservations) {
    if (r.slotId !== slot.id) continue;
    if (!["CONFIRMED", "CHECKED_IN"].includes(r.status)) continue;
    if (overlaps({ date: r.date, startTime: r.startTime, endTime: r.endTime }, window)) {
      return r.status === "CHECKED_IN" ? "OCCUPIED" : "RESERVED";
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

/** Parking fee by minutes parked */
export function parkingFee(minutes: number): number {
  const hours = Math.max(1, Math.ceil(minutes / 60));
  if (hours <= TARIFF.parkFirstHours) return TARIFF.parkFirstHoursFee;
  const fee =
    TARIFF.parkFirstHoursFee + (hours - TARIFF.parkFirstHours) * TARIFF.parkAddHourFee;
  return Math.min(fee, TARIFF.parkMaxFee);
}

export function overtimeFee(minutesLate: number): number {
  if (minutesLate <= 0) return 0;
  return Math.ceil(minutesLate / 60) * TARIFF.overtimeFeePerHour;
}

export function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
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

// ─────────────────────────── i18n ───────────────────────────────

export type Lang = "id" | "en";

const dict = {
  id: {
    appName: "Parkir Binus",
    tagline: "Slot parkir kampus — pasti ada tempat",
    heroTitle: "Parkir tanpa drama.",
    heroSub: "Reservasi slot favoritmu di Gedung Parkir Anggrek, scan QR untuk masuk & keluar. Selesai.",
    signIn: "Masuk dengan Google",
    signInNote: "Email @binus.ac.id otomatis terdeteksi sebagai mahasiswa BINUS",
    demoAccounts: "Pilih akun demo",
    student: "Mahasiswa BINUS",
    general: "Pengguna umum",
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
    // map
    parkingMap: "Peta Parkir",
    floorLabel: "LANTAI 1 — GEDUNG PARKIR ANGGREK",
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
    scanAtSlot: "Scan QR permanen di slot parkir saat tiba & saat pergi",
    checkIn: "Check-in di sini",
    scanExit: "Scan untuk keluar",
    cancelBooking: "Batalkan booking",
    cancelConfirmTitle: "Batalkan booking ini?",
    cancelConfirmDesc: "Kamu akan menerima refund sesuai kebijakan.",
    refundYouGet: "Refund kamu",
    sessionActive: "Sesi parkir aktif",
    sessionDone: "Sesi selesai",
    overtimeNote: "Lembur Rp5.000/jam jika keluar lebih lambat",
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
    tParkingFee: "Biaya parkir",
    tOvertime: "Biaya lembur",
    tRefund: "Refund pembatalan",
    // profile
    profileTitle: "Profil",
    binusian: "BINUSIAN",
    myVehicles: "Kendaraanku",
    addVehicle: "Tambah kendaraan",
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
    simulateScan: "Simulasi scan",
    orEnterCode: "atau ketik kode slot",
    codePlaceholder: "mis. A-07",
    scanGo: "Scan",
    scanPick: "Pilih slot di bawah untuk simulasi",
    checkinOk: "Check-in berhasil — selamat parkir",
    checkoutOk: "Berhasil keluar — sampai jumpa",
    walkinOk: "Sesi walk-in dimulai",
    scanDenied: "Scan ditolak",
    badCode: "Kode tidak dikenali",
    slotBusy: "Slot sedang terisi",
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
    signIn: "Sign in with Google",
    signInNote: "@binus.ac.id emails are auto-detected as BINUS students",
    demoAccounts: "Pick a demo account",
    student: "BINUS student",
    general: "General user",
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
    parkingMap: "Parking Map",
    floorLabel: "LEVEL 1 — ANGGREK PARKING BUILDING",
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
    scanAtSlot: "Scan the permanent QR at the slot when you arrive & leave",
    checkIn: "Check in here",
    scanExit: "Scan to exit",
    cancelBooking: "Cancel booking",
    cancelConfirmTitle: "Cancel this booking?",
    cancelConfirmDesc: "You'll receive a refund per policy.",
    refundYouGet: "Your refund",
    sessionActive: "Active session",
    sessionDone: "Session complete",
    overtimeNote: "Rp5,000/h overtime if you leave later",
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
    tParkingFee: "Parking fee",
    tOvertime: "Overtime fee",
    tRefund: "Cancellation refund",
    profileTitle: "Profile",
    binusian: "BINUSIAN",
    myVehicles: "My vehicles",
    addVehicle: "Add vehicle",
    preferences: "Preferences",
    language: "Language",
    appearance: "Appearance",
    darkMode: "Dark mode",
    signOut: "Sign out",
    memberSince: "Member since",
    totalSessions: "Total sessions",
    scannerTitle: "Scan Slot QR",
    scannerHint: "Point the camera at the permanent QR mounted on each slot",
    simulateScan: "Simulate scan",
    orEnterCode: "or type a slot code",
    codePlaceholder: "e.g. A-07",
    scanGo: "Scan",
    scanPick: "Pick a slot below to simulate",
    checkinOk: "Checked in — happy parking",
    checkoutOk: "Checked out — see you soon",
    walkinOk: "Walk-in session started",
    scanDenied: "Scan rejected",
    badCode: "Unknown code",
    slotBusy: "Slot is occupied",
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
