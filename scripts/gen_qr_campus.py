#!/usr/bin/env python3
"""
Parkir Binus — QR slot parkir multi-kampus (open lot: Alam Sutera & Bekasi).

Parameterized version of gen_qr_slots.py (Anggrek). Per campus it generates:
  1. Individual card PNGs  (print-friendly, ~95 x 66 mm @ 300 DPI)
  2. One print-ready A4 PDF (8 cards per page, 2 x 4 grid, dashed cut guides)
  3. One ZIP bundling all PNGs
  4. A README describing the set

Payload per slot: "<PREFIX>-<slotNumber>"  (e.g. AS-A-07 / BKS-B-21) — parseable
by the app's scanner (store.scanSlot strips the PB|AS|BKS prefix).

Run: python3 scripts/gen_qr_campus.py alamsutera bekasi
"""
import os
import sys
import zipfile

import qrcode
from qrcode.constants import ERROR_CORRECT_M
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas

# ─────────────────────────────── campus config ───────────────────────────────
CAMPUSES = {
    "anggrek": {
        "prefix": "PB",
        "rows": {"A": 18, "B": 14},
        "location": "Gedung Parkir Anggrek · Lantai 1",
        "folder": "qr-slot",
    },
    "alamsutera": {
        "prefix": "AS",
        "rows": {"A": 20, "B": 20},
        "location": "BINUS @ Alam Sutera · Area Parkir",
        "folder": "qr-slot-alam-sutera",
    },
    "bekasi": {
        "prefix": "BKS",
        "rows": {"A": 25, "B": 25},
        "location": "BINUS @ Bekasi · Area Parkir",
        "folder": "qr-slot-bekasi",
    },
}

DL_ROOT = "/home/z/my-project/download"

NAVY = (7, 11, 22)          # #070B16
BINUS_BLUE = (30, 58, 138)  # #1E3A8A
YELLOW = (255, 214, 10)     # #FFD60A
SLATE = (51, 65, 85)        # #334155
SLATE_LIGHT = (100, 116, 139)
CUT_LINE = (148, 163, 184)
WHITE = (255, 255, 255)

W, H = 1140, 800  # card px ≈ 95 x 66.4 mm @ 300 DPI
QR_TARGET = 567   # target QR block width/height in px

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
def make_qr(data: str, target: int) -> Image.Image:
    """QR at level M sized to ~target px per side (module count varies by payload)."""
    probe = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=1, border=0)
    probe.add_data(data)
    probe.make(fit=True)
    modules = probe.modules_count
    box = max(1, round(target / modules))
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=box, border=0)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color=NAVY, back_color=WHITE)
    return img.convert("RGB")


def dashed_rect(d: ImageDraw.ImageDraw, box, dash=28, gap=16, width=3, color=CUT_LINE):
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
    x, y = pos
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + tracking
    return x


def fit_font(d: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int, min_size=16):
    size = start_size
    while size > min_size:
        f = font(size)
        if d.textlength(text, font=f) <= max_width:
            return f
        size -= 2
    return font(min_size)


# ─────────────────────────────── card render ───────────────────────────────
def render_card(payload: str, slot: str, location: str, prefix: str) -> Image.Image:
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    dashed_rect(d, (10, 10, W - 10, H - 10))

    qr = make_qr(payload, QR_TARGET)
    qx, qy = 46, (H - qr.height) // 2
    img.paste(qr, (qx, qy))

    tx = qx + qr.width + 46
    tw = W - tx - 44

    tracked_text(d, (tx, 118), "PARKIR BINUS", font(34), BINUS_BLUE, tracking=9)
    d.text((tx - 4, 168), slot, font=font(160), fill=NAVY)
    d.text((tx, 388), f"Kode: {payload}", font=font(44), fill=SLATE)

    loc_f = fit_font(d, location, tw, 34)
    d.text((tx, 452), location, font=loc_f, fill=SLATE_LIGHT)

    badge_text = "SCAN UNTUK CHECK-IN & KELUAR"
    bf = fit_font(d, badge_text, tw - 56, 28)
    bw = d.textlength(badge_text, font=bf) + 52
    bh = 66
    by = 556
    d.rounded_rectangle([tx, by, tx + bw, by + bh], radius=14, fill=YELLOW)
    d.text((tx + 26, by + (bh - bf.size) // 2 - 2), badge_text, font=bf, fill=NAVY)

    return img


# ─────────────────────────────── PDF layout ───────────────────────────────
def build_pdf(png_paths, out_path, location, code_range):
    c = pdf_canvas.Canvas(out_path, pagesize=A4)
    pw, ph = A4
    margin = 8 * mm
    gap = 4 * mm
    cw = (pw - 2 * margin - gap) / 2
    ch = cw * H / W

    per_page = 8
    pages = (len(png_paths) + per_page - 1) // per_page
    page = 0
    for i, p in enumerate(png_paths):
        col = (i % per_page) % 2
        row = (i % per_page) // 2
        x = margin + col * (cw + gap)
        y = ph - margin - ch - row * (ch + gap)
        c.drawImage(p, x, y, cw, ch)
        if (i + 1) % per_page == 0 or i == len(png_paths) - 1:
            page += 1
            c.setFont("Helvetica", 7)
            c.setFillColorRGB(0.42, 0.47, 0.55)
            c.drawCentredString(
                pw / 2,
                margin / 2 + 1,
                f"Parkir Binus — QR Slot Parkir · {location} · {code_range} · halaman {page}/{pages}",
            )
            c.showPage()
    c.save()
    return pages


README_TMPL = """# QR Slot Parkir — Parkir Binus ({campus_name}, {n} QR)

Satu QR unik untuk setiap slot parkir di {location}:
Baris A (A-01 … A-{a}) dan Baris B (B-01 … B-{b}) — total **{n} QR**.

## Isi folder

| File | Keterangan |
|------|------------|
| `ParkirBinus-QR-{slug}-A4-Print.pdf` | Siap cetak — A4, {pages} halaman, 8 kartu per halaman (grid 2×4), garis potong putus-putus |
| `PNG/QR-A-01.png` … `QR-B-{b}.png` | {n} kartu PNG individual (±95×66 mm @ 300 DPI) — cetak satuan / laminate |
| `ParkirBinus-QR-{slug}-PNG.zip` | Semua {n} PNG dalam satu arsip |

## Format kode

Setiap QR berisi payload `{prefix}-<nomor slot>` (contoh: `{prefix}-A-07`).
Payload ini langsung dikenali scanner di aplikasi (walk-in / check-in / check-out)
dan juga bisa diketik manual di kolom "ketik kode slot".

## Cara pakai

1. Cetak PDF (pilih *Actual size* / 100%, jangan *Fit to page*).
2. Potong tiap kartu mengikuti garis putus-putus.
3. Tempel/laminate di tiap slot sesuai nomornya — A-01 di slot A-01, dst.

Operator juga bisa mencetak/mengunduh QR langsung dari aplikasi:
**Masuk sebagai Operator → ganti kampus ke {campus_name} → seksi "QR Slot Parkir" → Cetak Semua / Unduh PNG.**
"""

CAMPUS_NAMES = {
    "alamsutera": "BINUS @ Alam Sutera",
    "bekasi": "BINUS @ Bekasi",
    "anggrek": "Gedung Parkir Anggrek",
}


# ─────────────────────────────── main ───────────────────────────────
def generate(campus_key: str):
    cfg = CAMPUSES[campus_key]
    prefix, rows, location = cfg["prefix"], cfg["rows"], cfg["location"]
    out_dir = os.path.join(DL_ROOT, cfg["folder"])
    png_dir = os.path.join(out_dir, "PNG")
    os.makedirs(png_dir, exist_ok=True)

    slots = [f"A-{i:02d}" for i in range(1, rows["A"] + 1)] + [
        f"B-{i:02d}" for i in range(1, rows["B"] + 1)
    ]

    png_paths = []
    for slot in slots:
        payload = f"{prefix}-{slot}"
        card = render_card(payload, slot, location, prefix)
        path = os.path.join(png_dir, f"QR-{slot}.png")
        card.save(path, "PNG", dpi=(300, 300))
        png_paths.append(path)

    n = len(slots)
    campus_name = CAMPUS_NAMES[campus_key]
    slug = {"AS": "Slot-AlamSutera", "BKS": "Slot-Bekasi", "PB": "Slot"}[prefix]
    pdf_path = os.path.join(out_dir, f"ParkirBinus-QR-{slug}-A4-Print.pdf")
    zip_path = os.path.join(out_dir, f"ParkirBinus-QR-{slug}-PNG.zip")
    code_range = f"{prefix}-A-01 … {prefix}-B-{rows['B']:02d}"

    pages = build_pdf(png_paths, pdf_path, location, code_range)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in png_paths:
            z.write(p, arcname=os.path.basename(p))

    readme = README_TMPL.format(
        campus_name=campus_name,
        n=n,
        location=location,
        a=rows["A"],
        b=rows["B"],
        pages=pages,
        slug=slug,
        prefix=prefix,
    )
    with open(os.path.join(out_dir, "README.md"), "w") as f:
        f.write(readme)

    print(f"✓ {campus_name}: {n} PNG · PDF {pages} hlm · ZIP → {out_dir}")
    return out_dir


if __name__ == "__main__":
    targets = sys.argv[1:] or ["alamsutera", "bekasi"]
    for k in targets:
        generate(k)
