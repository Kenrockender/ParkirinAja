#!/usr/bin/env python3
"""Crop the bottom nav region from v7 screenshots for focused VLM review."""
from PIL import Image
import sys

src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src)
w, h = img.size
# bottom ~260px contains the navbar + some content above it
crop = img.crop((0, max(0, h - 280), w, h))
crop = crop.resize((w * 2, crop.height * 2), Image.LANCZOS)  # 2x upscale for clarity
crop.save(dst)
print(f"saved {dst} ({crop.width}x{crop.height})")
