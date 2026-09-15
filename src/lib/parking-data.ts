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
    passTitle: "Pass parkir digital",
    showPass: "Tunjukkan pass ini ke petugas saat masuk & keluar area parkir",
    checkIn: "Check-in di sini",
    scanExit: "Scan untuk keluar",
    checkOutBtn: "Keluar & Bayar Parkir",
    checkoutConfirmTitle: "Selesaikan sesi parkir?",
    checkoutConfirmDesc: "Biaya parkir & lembur akan ditagih dari saldo dompetmu.",
    estParking: "Estimasi biaya parkir",
    estOvertime: "Estimasi lembur",
    totalDue: "Total ditagih",
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
    revenueHourSub: "Hari ini · layanan, parkir & lembur",
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
    extendFail: "Sudah jam tutup — tidak bisa diperpanjang",
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
    qrSlotsSub: "32 QR unik — satu untuk tiap slot, dipasang permanen",
    qrPrintAll: "Cetak Semua",
    qrPrintHint: "A4 · 4 halaman · 8 kartu per halaman",
    qrDownload: "Unduh PNG",
    qrCardHint: "Scan untuk check-in & keluar",
    qrCodeLabel: "Kode slot",
    qrLocation: "Gedung Parkir Anggrek · Lantai 1",
    qrPrintBrand: "Tempel QR ini di tiap slot parkir",
    qrSaved: "QR diunduh",
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
    passTitle: "Digital parking pass",
    showPass: "Show this pass to the officer when entering & leaving",
    checkIn: "Check in here",
    scanExit: "Scan to exit",
    checkOutBtn: "Check Out & Pay",
    checkoutConfirmTitle: "End parking session?",
    checkoutConfirmDesc: "Parking & overtime fees will be charged from your wallet.",
    estParking: "Estimated parking fee",
    estOvertime: "Estimated overtime",
    totalDue: "Total charged",
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
    revenueHourSub: "Today · service, parking & overtime",
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
    extendFail: "At closing time — cannot extend",
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
    qrSlotsSub: "32 unique QRs — one per slot, mounted permanently",
    qrPrintAll: "Print All",
    qrPrintHint: "A4 · 4 pages · 8 cards per page",
    qrDownload: "Download PNG",
    qrCardHint: "Scan to check in & check out",
    qrCodeLabel: "Slot code",
    qrLocation: "Anggrek Parking Building · Level 1",
    qrPrintBrand: "Mount this QR on each parking slot",
    qrSaved: "QR downloaded",
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
