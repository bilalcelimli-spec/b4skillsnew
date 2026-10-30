"""Make the app's logo asset from public/b4skillslogo.png without changing the logo itself.

The source sits on an opaque white canvas. Only the white area *outside* the badge (connected to
the image border) becomes transparent; the cream letters inside the badge are enclosed by it and
are untouched. Edge pixels get "white to alpha" so the badge's anti-aliased rim stays smooth on dark
backgrounds. Output is cropped to the badge and resized for the app bundle.

Usage: python3 scripts/prepare-logo.py ../../public/b4skillslogo.png src/assets/b4skills-logo.png
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
rgb = Image.open(src).convert("RGB")
a = np.asarray(rgb).astype(np.float32)

# Near-white pixels, then the part of them connected to the border = the canvas.
distance = (255 - a).max(axis=2)  # 0 = pure white
# .copy(): an image sharing numpy memory is read-only and floodfill would silently do nothing.
near_white = Image.fromarray(np.where(distance < 40, 255, 0).astype(np.uint8)).copy()
w, h = near_white.size
for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
    if near_white.getpixel(seed) == 255:
        ImageDraw.floodfill(near_white, seed, 128)
canvas = np.asarray(near_white) == 128

# Widen by a few pixels to cover the anti-aliased rim, then convert white to alpha there.
rim = np.asarray(Image.fromarray((canvas * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
alpha_rim = np.clip(distance / 255.0 * 1.15, 0, 1)
alpha = np.where(rim, alpha_rim, 1.0)
alpha[canvas & (distance < 12)] = 0.0

safe = np.maximum(alpha, 1e-3)[..., None]
colour = np.where(rim[..., None], np.clip((a - (1 - alpha[..., None]) * 255) / safe, 0, 255), a)

out = np.dstack([colour, alpha * 255]).astype(np.uint8)
img = Image.fromarray(out, "RGBA")

ys, xs = np.where(alpha > 0.02)
pad = 6
box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(w, xs.max() + pad + 1), min(h, ys.max() + pad + 1))
img = img.crop(box)
target_w = 1200
img = img.resize((target_w, round(img.height * target_w / img.width)), Image.LANCZOS)
img.save(dst, optimize=True)
print(f"{dst}: {img.width}x{img.height}, cropped from {box}")
