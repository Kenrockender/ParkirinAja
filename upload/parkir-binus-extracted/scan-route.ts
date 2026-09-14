import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  ACTIVE_STATUSES,
  nowInstant,
  nowWib,
  overtimeFee as calcOvertime,
  parkingFee as calcParkingFee,
  wibDate,
  wibDateStr,
  wibTimeStr,
} from "@/lib/parking";

/**
 * POST /api/reservations/scan  { code }
 * Model BARU (seperti charger mobil listrik): HP PENGGUNA yang scan QR PERMANEN
 * yang terpasang di tiap slot parkir. QR tidak pernah berubah & reusable.
 * Kode yang dikenal: nomor slot ("A-01"), kode pendek ("PB-A01"), atau URL
 * ("https://parkir.binus.ac.id/slot/A-01").
 *
 * Alur:
 *  1. Ada reservasi CHECKED_IN milik user di slot itu  → CHECK-OUT (settle biaya)
 *  2. Ada reservasi CONFIRMED milik user hari ini       → CHECK-IN (mulai sesi)
 *  3. Tidak ada reservasi & slot bebas                  → WALK-IN instan (sesi langsung
 *     dimulai, jendela default 2 jam — bisa lembur bila keluar lebih lambat)
 */
function parseSlotCode(raw: string): string | null {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return null;
  // URL style: https://parkir.binus.ac.id/slot/A-01
  const urlMatch = s.match(/\/SLOT\/([A-D]-\d{1,2})$/);
  if (urlMatch) return urlMatch[1];
  // PB-A01 / PB-A-01
  const pbMatch = s.match(/^PB-([A-D])-?(\d{1,2})$/);
  if (pbMatch) return `${pbMatch[1]}-${pbMatch[2].padStart(2, "0")}`;
  // plain A-01 / A01 / a-1
  const plain = s.match(/^([A-D])-?(\d{1,2})$/);
  if (plain) return `${plain[1]}-${plain[2].padStart(2, "0")}`;
  return null;
}

const includeR = {
  slot: { select: { slotNumber: true, rowLabel: true } },
  location: { select: { name: true } },
} as const;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { code } = await req.json();
    const slotNumber = parseSlotCode(code);
    if (!slotNumber) return NextResponse.json({ result: "DENIED", reason: "bad_code" });

    const slot = await db.parkingSlot.findFirst({
      where: { slotNumber },
      include: { location: true },
    });
    if (!slot || !slot.active) return NextResponse.json({ result: "DENIED", reason: "not_found" });
    if (slot.status === "MAINTENANCE") return NextResponse.json({ result: "DENIED", reason: "slot_maintenance" });

    const loc = slot.location;
    const now = nowInstant();
    const todayStr = wibDateStr();

    // ===== 1. CHECK-OUT: sesi aktif user di slot ini =====
    const active = await db.reservation.findFirst({
      where: { userId: user.id, slotId: slot.id, status: "CHECKED_IN" },
      include: includeR,
    });
    if (active) {
      const start = wibDate(active.date, active.startTime);
      const end = wibDate(active.date, active.endTime);
      const entry = active.actualEntryTime ?? start;
      const parkedMinutes = Math.max(0, Math.round((now.getTime() - entry.getTime()) / 60000));
      const lateMinutes = Math.max(0, Math.round((now.getTime() - end.getTime()) / 60000));
      const parkFee = calcParkingFee(parkedMinutes, loc);
      const overFee = calcOvertime(lateMinutes, loc);
      const due = parkFee + overFee;

      const result = await db.$transaction(async (tx) => {
        const fresh = await tx.user.findUnique({ where: { id: user.id } });
        if (!fresh) throw new Error("user_gone");
        if (fresh.walletBalance < due) throw new Error("insufficient");
        const balanceAfter = fresh.walletBalance - due;
        await tx.user.update({ where: { id: user.id }, data: { walletBalance: balanceAfter } });
        const updated = await tx.reservation.update({
          where: { id: active.id },
          data: {
            status: "COMPLETED",
            actualExitTime: now,
            parkingFee: parkFee,
            overtimeFee: overFee,
            totalAmount: active.serviceFee + parkFee + overFee - active.refundAmount,
            updatedAt: now,
          },
          include: includeR,
        });
        if (parkFee > 0) {
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              type: "PAYMENT",
              amount: -parkFee,
              balanceBefore: fresh.walletBalance,
              balanceAfter: fresh.walletBalance - parkFee,
              referenceType: "RESERVATION",
              referenceId: active.id,
              description: `Parkir ${slot.slotNumber} — ${active.code}`,
            },
          });
        }
        if (overFee > 0) {
          await tx.walletTransaction.create({
            data: {
              userId: user.id,
              type: "OVERTIME",
              amount: -overFee,
              balanceBefore: fresh.walletBalance - parkFee,
              balanceAfter,
              referenceType: "RESERVATION",
              referenceId: active.id,
              description: `Denda lembur ${slot.slotNumber} — ${active.code}`,
            },
          });
        }
        return { reservation: updated, balanceAfter, parkFee, overFee };
      });
      return NextResponse.json({
        result: "CHECKOUT",
        reservation: result.reservation,
        walletBalance: result.balanceAfter,
        parkingFee: result.parkFee,
        overtimeFee: result.overFee,
      });
    }

    // ===== 2. CHECK-IN: reservasi CONFIRMED milik user di slot ini =====
    const confirmed = await db.reservation.findFirst({
      where: { userId: user.id, slotId: slot.id, status: "CONFIRMED" },
      include: includeR,
    });
    if (confirmed) {
      if (confirmed.date !== todayStr) {
        return NextResponse.json({ result: "DENIED", reason: "not_today", detail: confirmed.date });
      }
      const start = wibDate(confirmed.date, confirmed.startTime);
      const end = wibDate(confirmed.date, confirmed.endTime);
      if (now < new Date(start.getTime() - 30 * 60000) || now > end) {
        return NextResponse.json({ result: "DENIED", reason: "outside_window" });
      }
      const updated = await db.reservation.update({
        where: { id: confirmed.id },
        data: { status: "CHECKED_IN", qrUsed: true, actualEntryTime: now, updatedAt: now },
        include: includeR,
      });
      return NextResponse.json({ result: "CHECKIN", reservation: updated });
    }

    // ===== 3. WALK-IN instan: slot dibutuhkan bebas & user tanpa reservasi aktif =====
    // slot sedang dipakai orang lain?
    const busyNow = await db.reservation.findFirst({
      where: {
        slotId: slot.id,
        status: { in: ACTIVE_STATUSES },
        OR: [{ date: todayStr }, { status: "CHECKED_IN" }],
      },
    });
    if (busyNow) return NextResponse.json({ result: "DENIED", reason: "slot_busy" });

    // user punya reservasi lain yang aktif? arahkan ke slotnya dulu
    const userActive = await db.reservation.findFirst({
      where: { userId: user.id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
      include: includeR,
    });
    if (userActive) {
      return NextResponse.json({ result: "DENIED", reason: "active_reservation", detail: userActive.slot.slotNumber });
    }

    // jendela default: sekarang → +2 jam (max sampai jam tutup)
    const startWib = nowWib();
    const wibHour = startWib.getHours();
    const closeH = loc.closeHour;
    if (wibHour >= closeH) return NextResponse.json({ result: "DENIED", reason: "closed" });
    const openMin = wibHour * 60 + startWib.getMinutes();
    const endMin = Math.min(openMin + 120, closeH * 60);
    const startTime = wibTimeStr(startWib);
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    if (openMin < loc.openHour * 60) return NextResponse.json({ result: "DENIED", reason: "closed" });

    const serviceFee = loc.walkInFee;
    const vehicle = await db.vehicle.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });

    try {
      const created = await db.$transaction(async (tx) => {
        const fresh = await tx.user.findUnique({ where: { id: user.id } });
        if (!fresh) throw new Error("user_gone");
        if (fresh.walletBalance < serviceFee) throw new Error("insufficient");
        const balanceAfter = fresh.walletBalance - serviceFee;
        await tx.user.update({ where: { id: user.id }, data: { walletBalance: balanceAfter } });

        const dateKey = todayStr.replace(/-/g, "");
        const countToday = await tx.reservation.count({ where: { date: todayStr } });
        const code = `RES-${dateKey}-${String(countToday + 1).padStart(4, "0")}`;

        const reservation = await tx.reservation.create({
          data: {
            code,
            userId: user.id,
            locationId: loc.id,
            slotId: slot.id,
            vehicleId: vehicle?.id ?? null,
            type: "WALK_IN",
            date: todayStr,
            startTime,
            endTime,
            driverName: user.name,
            driverPhone: user.phone,
            vehiclePlate: vehicle?.licensePlate ?? "WALK-IN",
            vehicleLabel: vehicle ? [vehicle.brand, vehicle.model].filter(Boolean).join(" ") : null,
            serviceFee,
            parkingFee: 0,
            overtimeFee: 0,
            totalAmount: serviceFee,
            status: "CHECKED_IN",
            qrCode: `PB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
            qrUsed: true,
            actualEntryTime: now,
          },
          include: includeR,
        });

        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            type: "PAYMENT",
            amount: -serviceFee,
            balanceBefore: fresh.walletBalance,
            balanceAfter,
            referenceType: "RESERVATION",
            referenceId: reservation.id,
            description: `Walk-in via scan QR ${slot.slotNumber} — ${code}`,
          },
        });
        return { reservation, balanceAfter };
      });
      return NextResponse.json({
        result: "WALKIN",
        reservation: created.reservation,
        walletBalance: created.balanceAfter,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "server";
      if (msg === "insufficient") return NextResponse.json({ result: "DENIED", reason: "insufficient" });
      if (msg === "user_gone") return NextResponse.json({ result: "DENIED", reason: "not_found" });
      throw e;
    }
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
