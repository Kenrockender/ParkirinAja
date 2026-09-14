import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** GET /api/ads — active ads for customers (between start & end) */
export async function GET() {
  try {
    const now = new Date();
    const ads = await db.advertisement.findMany({
      where: { status: "ACTIVE", startAt: { lte: now }, endAt: { gte: now } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ads });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

/** GET variant for admin list: /api/ads?scope=all */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const b = await req.json();
    const title = String(b.title || "").trim();
    if (!title) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const ad = await db.advertisement.create({
      data: {
        title,
        description: b.description ? String(b.description).trim() : null,
        imageTheme: ["coffee", "carwash", "event", "image"].includes(b.imageTheme) ? b.imageTheme : "coffee",
        imageUrl: b.imageUrl ? String(b.imageUrl).trim() : null,
        ctaText: b.ctaText ? String(b.ctaText).trim() : "Kunjungi",
        destinationUrl: b.destinationUrl ? String(b.destinationUrl).trim() : null,
        startAt: new Date(),
        endAt: new Date(Date.now() + 30 * 86400000),
        status: "ACTIVE",
      },
    });
    return NextResponse.json({ ad });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

/** PATCH /api/ads  { id, status? , title?...} — admin toggle/update */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const b = await req.json();
    const ad = await db.advertisement.findUnique({ where: { id: String(b.id || "") } });
    if (!ad) return NextResponse.json({ error: "notFound" }, { status: 404 });
    const updated = await db.advertisement.update({
      where: { id: ad.id },
      data: {
        status: b.status ? (b.status === "ACTIVE" ? "ACTIVE" : "INACTIVE") : ad.status,
        title: b.title !== undefined ? String(b.title).trim() : ad.title,
        description: b.description !== undefined ? String(b.description).trim() : ad.description,
        ctaText: b.ctaText !== undefined ? String(b.ctaText).trim() : ad.ctaText,
      },
    });
    return NextResponse.json({ ad: updated });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

/** DELETE /api/ads?id=... — admin */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const id = req.nextUrl.searchParams.get("id") || "";
    await db.advertisement.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
