#!/usr/bin/env python3
"""
Parkir Binus — 32 QR slot parkir (A-01..A-18, B-01..B-14).

Generates:
  1. 32 individual card PNGs  (print-friendly, ~95 x 66 mm @ 300 DPI)
  2. 1 print-ready A4 PDF     (4 pages, 8 cards per page, 2 x 4 grid)
  3. 1 ZIP bundling all PNGs

Payload per slot: "PB-<slotNumber>"  (e.g. PB-A-07) — already parseable by
the app's scanner (store.scanSlot strips the "PB-" prefix).
"""
import os
import zipfile

import qrcode
from qrcode.constants import ERROR_CORRECT_M
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas

# ─────────────────────────────── config ───────────────────────────────
OUT_DIR = "/home/z/my-project/download/qr-slot"
PNG_DIR = os.path.join(OUT_DIR, "PNG")
PDF_PATH = os.path.join(OUT_DIR, "ParkirBinus-QR-Slot-A4-Print.pdf")
ZIP_PATH = os.path.join(OUT_DIR, "ParkirBinus-QR-Slot-PNG.zip")

NAVY = (7, 11, 22)         # #070B16
BINUS_BLUE = (30, 58, 138) # #1E3A8A
YELLOW = (255, 214, 10)    # #FFD60A
SLATE = (51, 65, 85)       # #334155
SLATE_LIGHT = (100, 116, 139)  # #64748B
CUT_LINE = (148, 163, 184)     # #94A3B8
WHITE = (255, 255, 255)

W, H = 1140, 800  # card px ≈ 95 x 66.4 mm @ 300 DPI

SLOTS = [f"A-{i:02d}" for i in range(1, 19)] + [f"B-{i:02d}" for i in range(1, 15)]
assert len(SLOTS) == 32

# Fonts — prefer Carlito (modern humanist), fall back to DejaVu Sans
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/english/Carlito-Bold.ttf",
    "/usr/share/fonts/truetype/english/Carlito-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


# ─────────────────────────────── helpers ───────────────────────────────
def make_qr(data: str, box_size: int) -> Image.Image:
    """QR version 1 (21 modules) — payload 'PB-A-07' always fits at level M."""
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=box_size, border=0)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color=NAVY, back_color=WHITE)
    return img.convert("RGB")


def dashed_rect(d: ImageDraw.ImageDraw, box, dash=28, gap=16, width=3, color=CUT_LINE):
    """Dashed rectangle — cut guide for printing."""
    x0, y0, x1, y1 = box
    x = x0
    while x < x1:
        d.line([(x, y0), (min(x + dash, x1), y0)], fill=color, width=width)
        d.line([(x, y1), (min(x + dash, x1), y1)], fill=color, width=width)
        x += dash + gap
    y = y0
    while y < y1:
        d.line([(x0, y), (x0, min(y + dash, y1))], fill=color, width=width)
        d.line([(x1, y), (x1, min(y + dash, y1))], fill=color, width=width)
        y += dash + gap


def tracked_text(d: ImageDraw.ImageDraw, pos, text: str, f, fill, tracking=8):
    """Draw text with letter-spacing; returns end x."""
    x, y = pos
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking
    return x


def fit_font(d: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int, min_size=16):
    """Largest font size (<= start_size) whose rendered width fits max_width."""
    size = start_size
    while size > min_size:
        f = font(size)
        if d.textlength(text, font=f) <= max_width:
            return f
        size -= 2
    return font(min_size)


# ─────────────────────────────── card render ───────────────────────────────
def render_card(slot: str) -> Image.Image:
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    # cut guide
    dashed_rect(d, (10, 10, W - 10, H - 10))

    # QR block (box_size 27 -> 21 modules = 567 px)
    qr = make_qr(f"PB-{slot}", 27)
    qx, qy = 46, (H - qr.height) // 2
    img.paste(qr, (qx, qy))

    # right text column
    tx = qx + qr.width + 46
    tw = W - tx - 44  # column width ≈ 440 px

    # brand
    tracked_text(d, (tx, 118), "PARKIR BINUS", font(34), BINUS_BLUE, tracking=9)

    # slot number — big
    d.text((tx - 4, 168), slot, font=font(160), fill=NAVY)

    # code
    d.text((tx, 388), f"Kode: PB-{slot}", font=font(44), fill=SLATE)

    # location
    loc = fit_font(d, "Gedung Parkir Anggrek · Lantai 1", tw, 34)
    d.text((tx, 452), "Gedung Parkir Anggrek · Lantai 1", font=loc, fill=SLATE_LIGHT)

    # yellow badge
    badge_text = "SCAN UNTUK CHECK-IN & KELUAR"
    bf = fit_font(d, badge_text, tw - 56, 28)
    bw = d.textlength(badge_text, font=bf) + 52
    bh = 66
    by = 556
    d.rounded_rectangle([tx, by, tx + bw, by + bh], radius=14, fill=YELLOW)
    d.text((tx + 26, by + (bh - bf.size) // 2 - 2), badge_text, font=bf, fill=NAVY)

    return img


# ─────────────────────────────── PDF layout ───────────────────────────────
def build_pdf(png_paths, out_path):
    c = pdf_canvas.Canvas(out_path, pagesize=A4)
    pw, ph = A4
    margin = 8 * mm
    gap = 4 * mm
    cw = (pw - 2 * margin - gap) / 2          # card width  ≈ 95 mm
    ch = cw * H / W                            # keep aspect ≈ 66.7 mm

    per_page = 8
    pages = (len(png_paths) + per_page - 1) // per_page
    page = 0
    for i, p in enumerate(png_paths):
        col = (i % per_page) % 2
        row = (i % per_page) // 2
        x = margin + col * (cw + gap)
        y = ph - margin - ch - row * (ch + gap)
        c.drawImage(p, x, y, cw, ch)
        # footer + page break after every 8 cards (or the last card)
        if (i + 1) % per_page == 0 or i == len(png_paths) - 1:
            page += 1
            c.setFont("Helvetica", 7)
            c.setFillColorRGB(0.42, 0.47, 0.55)
            c.drawCentredString(
                pw / 2,
                margin / 2 + 1,
                f"Parkir Binus — QR Slot Parkir · Gedung Parkir Anggrek · Lantai 1 "
                f"· PB-A-01 … PB-B-14 · halaman {page}/{pages}",
            )
            c.showPage()
    c.save()
    return pages


# ─────────────────────────────── main ───────────────────────────────
def main():
    os.makedirs(PNG_DIR, exist_ok=True)

    png_paths = []
    for slot in SLOTS:
        card = render_card(slot)
        path = os.path.join(PNG_DIR, f"QR-{slot}.png")
        card.save(path, "PNG", dpi=(300, 300))
        png_paths.append(path)
        print(f"  ✓ QR-{slot}.png")

    pages = build_pdf(png_paths, PDF_PATH)
    print(f"  ✓ {os.path.basename(PDF_PATH)} ({pages} halaman A4)")

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        for p in png_paths:
            z.write(p, arcname=os.path.basename(p))
    print(f"  ✓ {os.path.basename(ZIP_PATH)} ({len(png_paths)} PNG)")

    print(f"\nSelesai → {OUT_DIR}")


if __name__ == "__main__":
    main()
