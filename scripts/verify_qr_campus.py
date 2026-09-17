#!/usr/bin/env python3
"""Verify generated campus QR sets: counts, decoded payloads, PDF pages, ZIP entries."""
import os
import zipfile
import cv2

DL = "/home/z/my-project/download"
det = cv2.QRCodeDetector()

EXPECT = {
    "qr-slot-alam-sutera": {"prefix": "AS", "rows": {"A": 20, "B": 20}, "pdf_pages": 5, "zip_n": 40},
    "qr-slot-bekasi": {"prefix": "BKS", "rows": {"A": 25, "B": 25}, "pdf_pages": 7, "zip_n": 50},
}

fails = 0
def check(name, cond, detail=""):
    global fails
    print(("  ok  " if cond else "FAIL  ") + name + (f" — {detail}" if detail else ""))
    if not cond:
        fails += 1

for folder, exp in EXPECT.items():
    d = os.path.join(DL, folder)
    print(f"— {folder} —")
    pngs = sorted(os.listdir(os.path.join(d, "PNG")))
    check("PNG count", len(pngs) == exp["zip_n"], str(len(pngs)))
    check("first/last naming", pngs[0] == "QR-A-01.png" and pngs[-1] == f"QR-B-{exp['rows']['B']:02d}.png", f"{pngs[0]}…{pngs[-1]}")

    # decode spot checks: first, middle maintenance bay (A-07), last
    spots = ["QR-A-01.png", "QR-A-07.png", f"QR-B-{exp['rows']['B']:02d}.png"]
    for s in spots:
        img = cv2.imread(os.path.join(d, "PNG", s))
        val, _, _ = det.detectAndDecode(img)
        want = f"{exp['prefix']}-{s[3:-4]}"
        check(f"decode {s} == {want}", val == want, val)

    pdf = [f for f in os.listdir(d) if f.endswith(".pdf")]
    check("one PDF", len(pdf) == 1, pdf[0] if pdf else "none")
    if pdf:
        import subprocess
        out = subprocess.run(["pdfinfo", os.path.join(d, pdf[0])], capture_output=True, text=True).stdout
        pages = next((l.split(":")[1].strip() for l in out.splitlines() if l.startswith("Pages")), "?")
        check("PDF pages", int(pages) == exp["pdf_pages"], f"{pages} hlm")

    zf = [f for f in os.listdir(d) if f.endswith(".zip")]
    if zf:
        with zipfile.ZipFile(os.path.join(d, zf[0])) as z:
            names = z.namelist()
        check("ZIP entries", len(names) == exp["zip_n"], str(len(names)))
        check("ZIP integrity", zipfile.ZipFile(os.path.join(d, zf[0])).testzip() is None)

print(f"\n{'ALL PASS' if fails == 0 else f'{fails} FAILED'}")
raise SystemExit(0 if fails == 0 else 1)
