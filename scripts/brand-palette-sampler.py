#!/usr/bin/env python3
# Brand palette sampler — extracts dominant colours from brand source images via
# k-means clustering and compares them against a mockup CSS variable palette to
# verify whether the mockup brief faithfully reproduces the brand's actual colours.
#
# Requirements: pillow, scikit-learn, numpy. Optional: colormath (for CIE Delta-E).
#   pip install pillow scikit-learn numpy colormath
#
# Usage:
#   python scripts/brand-palette-sampler.py \
#     --client mamas-munches \
#     --brand-dir sites/mamas-munches/research/brand \
#     --mockup-css sites/mamas-munches/mockups/homepage/index.html \
#     --output sites/mamas-munches/research/brand-palette.json
#
# UK English. No emoji.

import argparse
import datetime
import glob
import json
import os
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

try:
    from colormath.color_objects import sRGBColor, LabColor
    from colormath.color_conversions import convert_color
    from colormath.color_diff import delta_e_cie2000
    # Patch numpy.asscalar removal in newer numpy versions used by colormath
    if not hasattr(np, "asscalar"):
        np.asscalar = lambda a: a.item()
    HAVE_COLORMATH = True
except Exception:
    HAVE_COLORMATH = False


def hex_to_rgb(h: str):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def rgb_to_hex(rgb):
    return "#{:02X}{:02X}{:02X}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def delta(rgb1, rgb2):
    """Perceptual delta. CIE Delta-E 2000 if colormath present, else scaled Euclidean."""
    if HAVE_COLORMATH:
        c1 = convert_color(sRGBColor(rgb1[0] / 255, rgb1[1] / 255, rgb1[2] / 255), LabColor)
        c2 = convert_color(sRGBColor(rgb2[0] / 255, rgb2[1] / 255, rgb2[2] / 255), LabColor)
        return float(delta_e_cie2000(c1, c2))
    # Euclidean RGB scaled to roughly approximate Delta-E magnitude (max ~441 -> ~100)
    d = ((rgb1[0] - rgb2[0]) ** 2 + (rgb1[1] - rgb2[1]) ** 2 + (rgb1[2] - rgb2[2]) ** 2) ** 0.5
    return d * (100.0 / 441.0)


def verdict_for(d: float) -> str:
    if d < 5:
        return "PASS"
    if d <= 15:
        return "WARN"
    return "FAIL"


def cluster_image(path: Path, k: int = 8):
    """Return list of (rgb_tuple, pct) for non-white, non-black, >=2% clusters."""
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    # Drop transparent pixels (logos are typically on transparent bg)
    if arr.shape[2] == 4:
        mask = arr[:, :, 3] > 32
        pixels = arr[mask][:, :3]
    else:
        pixels = arr.reshape(-1, 3)
    if pixels.shape[0] < 100:
        return []
    # Downsample for speed
    if pixels.shape[0] > 50000:
        idx = np.random.RandomState(42).choice(pixels.shape[0], 50000, replace=False)
        pixels = pixels[idx]
    km = KMeans(n_clusters=min(k, len(pixels)), n_init=4, random_state=42).fit(pixels)
    labels = km.labels_
    centres = km.cluster_centers_
    total = len(labels)
    out = []
    for i, c in enumerate(centres):
        pct = (labels == i).sum() / total * 100
        r, g, b = int(c[0]), int(c[1]), int(c[2])
        # Filter near-white, near-black, low share
        if r > 240 and g > 240 and b > 240:
            continue
        if r < 20 and g < 20 and b < 20:
            continue
        if pct < 2.0:
            continue
        out.append(((r, g, b), pct))
    out.sort(key=lambda x: -x[1])
    return out


def parse_mockup_palette(css_path: Path):
    """Extract --var: #hex; pairs from a CSS or HTML file."""
    text = css_path.read_text(encoding="utf-8", errors="ignore")
    pat = re.compile(r"(--[a-zA-Z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,6})\s*;")
    pairs = {}
    for name, hex_v in pat.findall(text):
        # Normalise short hex
        h = hex_v.lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        pairs[name] = "#" + h.upper()
    return pairs


def main():
    p = argparse.ArgumentParser(description="Brand palette sampler — compare brand source images to mockup CSS palette.")
    p.add_argument("--client", required=True)
    p.add_argument("--brand-dir", required=True)
    p.add_argument("--mockup-css", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()

    brand_dir = Path(args.brand_dir)
    images = []
    for ext in ("png", "webp", "jpg", "jpeg", "PNG", "WEBP", "JPG", "JPEG"):
        images.extend(sorted(glob.glob(str(brand_dir / f"*.{ext}"))))
    images = sorted(set(images))
    if not images:
        print(f"No brand images found in {brand_dir}", file=sys.stderr)
        sys.exit(1)

    mockup_palette = parse_mockup_palette(Path(args.mockup_css))
    if not mockup_palette:
        print(f"No CSS variables found in {args.mockup_css}", file=sys.stderr)
        sys.exit(1)

    # Cluster every image and aggregate
    all_clusters = []
    for img_path in images:
        for rgb, pct in cluster_image(Path(img_path)):
            all_clusters.append({"rgb": list(rgb), "hex": rgb_to_hex(rgb), "pct": round(pct, 2), "image": os.path.basename(img_path)})

    # For each brand cluster, find closest mockup variable
    comparisons = []
    for c in all_clusters:
        best_var, best_hex, best_d = None, None, 9999
        for var_name, var_hex in mockup_palette.items():
            d = delta(c["rgb"], hex_to_rgb(var_hex))
            if d < best_d:
                best_d = d
                best_var = var_name
                best_hex = var_hex
        c["closest_mockup_var"] = best_var
        c["closest_mockup_hex"] = best_hex
        c["delta"] = round(best_d, 2)
        c["verdict"] = verdict_for(best_d)
        comparisons.append({
            "image": c["image"],
            "brand_hex": c["hex"],
            "brand_pct": c["pct"],
            "mockup_var": best_var,
            "mockup_hex": best_hex,
            "delta": c["delta"],
            "verdict": c["verdict"],
        })

    # Overall verdict = worst delta across non-trivial clusters (>=5% pct)
    significant = [c for c in all_clusters if c["pct"] >= 5.0] or all_clusters
    worst = max(significant, key=lambda x: x["delta"]) if significant else None
    overall = worst["verdict"] if worst else "UNKNOWN"

    summary_bits = []
    if overall == "PASS":
        summary_bits.append(f"Brand source colours match the mockup brief closely. Worst delta {worst['delta']} on {worst['closest_mockup_var']}.")
    elif overall == "WARN":
        summary_bits.append(f"Brand source colours are close but not exact. Worst delta {worst['delta']} between brand {worst['hex']} and mockup {worst['closest_mockup_hex']} ({worst['closest_mockup_var']}).")
    else:
        summary_bits.append(f"Brand source colours diverge from the mockup brief. Worst delta {worst['delta']} between brand {worst['hex']} and mockup {worst['closest_mockup_hex']} ({worst['closest_mockup_var']}).")
    if not HAVE_COLORMATH:
        summary_bits.append("Note: colormath not installed; using scaled Euclidean RGB (less perceptually accurate than CIE Delta-E 2000).")

    payload = {
        "client": args.client,
        "sampled_at": datetime.datetime.utcnow().isoformat() + "Z",
        "delta_metric": "CIE Delta-E 2000" if HAVE_COLORMATH else "scaled Euclidean RGB",
        "images": [os.path.basename(i) for i in images],
        "brand_clusters": all_clusters,
        "mockup_palette": mockup_palette,
        "comparisons": comparisons,
        "overall_verdict": overall,
        "summary": " ".join(summary_bits),
    }

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(payload, indent=2), encoding="utf-8")

    # Markdown report to stdout
    print(f"## Brand palette validation -- {args.client}\n")
    print(f"Delta metric: {payload['delta_metric']}\n")
    print(f"Images sampled ({len(images)}):")
    for img in payload["images"]:
        print(f"- {img}")
    print()
    print("### Brand source clusters (top 8)\n")
    print("| Image | Hex | RGB | % | Closest mockup var | Mockup hex | Delta | Verdict |")
    print("|---|---|---|---|---|---|---|---|")
    for c in sorted(all_clusters, key=lambda x: -x["pct"])[:8]:
        rgb_s = f"{c['rgb'][0]},{c['rgb'][1]},{c['rgb'][2]}"
        print(f"| {c['image']} | {c['hex']} | {rgb_s} | {c['pct']}% | {c['closest_mockup_var']} | {c['closest_mockup_hex']} | {c['delta']} | {c['verdict']} |")
    print()
    print("### Mockup palette\n")
    for k, v in mockup_palette.items():
        print(f"- {k}: {v}")
    print()
    print("### Verdict\n")
    print(f"**OVERALL: {overall}**\n")
    print(payload["summary"])


if __name__ == "__main__":
    main()
