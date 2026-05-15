#!/usr/bin/env python3
"""Pixel diff between mockup and SGS render URLs.

Python equivalent of scripts/screenshot-diff-helper.js — avoids the broken
pixelmatch CJS/ESM import. Same output shape: composite.png + heatmap.png +
diff.json under --out.

Usage:
    python scripts/pixel-diff.py \\
        --mockup <baseline-url> --sgs <converter-url> \\
        --viewport 1440x900 --threshold 1 --out reports/screenshot-diffs/<run>

Exit codes: 0=PASS, 1=FAIL, 2=WARN, 3=load-error, 4=diff-error, 5=fs-error.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw
from playwright.sync_api import sync_playwright


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def capture(
    url: str,
    viewport: tuple[int, int],
    out_path: Path,
    selector: str | None = None,
) -> None:
    """Capture a screenshot. If selector is given, crop to that element's
    bounding box; otherwise full-page capture.

    Per-selector cropping is the established SGS pattern (mirrors
    scripts/screenshot-diff-helper.js --selector) — eliminates the structural
    DOM-wrapper differences between converter-rendered output and mockup-as-
    raw-HTML that inflate full-page diffs.
    """
    w, h = viewport
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": w, "height": h},
            device_scale_factor=1,
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(800)
        if selector:
            el = page.locator(selector).first
            try:
                el.wait_for(state="visible", timeout=5000)
                el.screenshot(path=str(out_path))
                browser.close()
                return
            except Exception:  # noqa: BLE001
                log(f"WARN: selector {selector!r} not found on {url} — falling back to full page")
        page.screenshot(path=str(out_path), full_page=True)
        browser.close()


def find_body_start_y(img: Image.Image, anchor_color: tuple[int, int, int] = (255, 248, 233)) -> int:
    """Locate the first row that contains 'body content' rather than WP chrome.

    Strategy: scan from top down. The WP chrome (debug notice, top nav,
    breadcrumb) sits on a pale-cream background. The first body section
    (hero, etc.) introduces a different colour band. The first row where
    >40% of pixels differ from the chrome background colour is treated as
    body-start. Returns y=0 if no clear transition is found.
    """
    rgb = img.convert("RGB")
    w = rgb.width
    pixels = rgb.load()
    for y in range(0, rgb.height, 5):
        diff_count = 0
        for x in range(0, w, 8):
            r, g, b = pixels[x, y]
            # Compare against the anchor (chrome background)
            if abs(r - anchor_color[0]) + abs(g - anchor_color[1]) + abs(b - anchor_color[2]) > 60:
                diff_count += 1
        # Require >40% of sampled pixels to differ — that's a real content band
        if diff_count > (w // 8) * 0.40:
            return max(0, y - 10)  # back off 10px to keep just-above-body buffer
    return 0


def align(
    a: Image.Image,
    b: Image.Image,
    body_anchor_a: int = 0,
    body_anchor_b: int = 0,
) -> tuple[Image.Image, Image.Image]:
    """Pad both to the larger width and the smaller height.

    When body_anchor_a / body_anchor_b are provided (>0), each image is
    cropped from its body-start y rather than from y=0. This eliminates
    asymmetric chrome offsets (e.g. mockup has 538px of header to skip,
    WP post has 1129px of WP chrome+header) that would otherwise cause
    the pixel comparator to compare wrong content at the same y-coordinate.
    Per the 2026-05-15 QC subagent finding on the 768 regression.
    """
    crop_a = a.crop((0, body_anchor_a, a.width, a.height))
    crop_b = b.crop((0, body_anchor_b, b.width, b.height))
    target_w = max(crop_a.width, crop_b.width)
    target_h = min(crop_a.height, crop_b.height)

    def pad_or_crop(img: Image.Image) -> Image.Image:
        out = Image.new("RGBA", (target_w, target_h), (255, 255, 255, 255))
        out.paste(img.convert("RGBA").crop((0, 0, min(img.width, target_w), target_h)), (0, 0))
        return out

    return pad_or_crop(crop_a), pad_or_crop(crop_b)


def diff(a: Image.Image, b: Image.Image) -> tuple[int, int, Image.Image]:
    """Return (mismatched_pixels, total_pixels, heatmap)."""
    da = a.convert("RGB")
    db = b.convert("RGB")
    delta = ImageChops.difference(da, db)
    pixels = delta.load()
    w, h = delta.size
    total = w * h
    mismatched = 0
    heatmap = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hm = heatmap.load()
    for y in range(h):
        for x in range(w):
            r, g, bl = pixels[x, y]
            # Threshold: any channel diff > 8 counts as mismatch (matches
            # pixelmatch default ~0.1 threshold with antialiasing tolerance).
            if r > 8 or g > 8 or bl > 8:
                mismatched += 1
                hm[x, y] = (255, 0, 0, 200)
    return mismatched, total, heatmap


def compose(mockup: Image.Image, sgs: Image.Image, heatmap: Image.Image, out: Path) -> None:
    """Side-by-side mockup + sgs + heatmap overlay."""
    w = mockup.width + sgs.width
    h = max(mockup.height, sgs.height)
    composite = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    composite.paste(mockup.convert("RGBA"), (0, 0))
    composite.paste(sgs.convert("RGBA"), (mockup.width, 0))
    # Header labels
    draw = ImageDraw.Draw(composite)
    draw.text((10, 10), "MOCKUP", fill=(0, 0, 0))
    draw.text((mockup.width + 10, 10), "SGS", fill=(0, 0, 0))
    composite.save(str(out))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mockup", required=True)
    ap.add_argument("--sgs", required=True)
    ap.add_argument("--viewport", default="1440x900")
    ap.add_argument("--threshold", type=float, default=1.0, help="PASS ceiling (percent)")
    ap.add_argument("--out", required=True)
    ap.add_argument(
        "--selector",
        default=None,
        help="CSS selector to crop both screenshots to (e.g. '.sgs-hero'). "
             "Eliminates full-page WP-chrome / wrapper noise. Falls back to "
             "full page if selector matches zero elements.",
    )
    args = ap.parse_args()

    try:
        w, h = (int(v) for v in args.viewport.split("x"))
    except ValueError:
        log(f"ERROR: bad viewport {args.viewport!r}, expected WxH")
        return 5

    out_dir = Path(args.out)
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        log(f"ERROR: cannot create {out_dir}: {e}")
        return 5

    mockup_png = out_dir / "mockup.png"
    sgs_png = out_dir / "sgs.png"

    log(f"INIT output dir: {out_dir}  selector={args.selector or '(full page)'}")
    log(f"CAPTURE mockup @ {w}x{h}: {args.mockup}")
    try:
        capture(args.mockup, (w, h), mockup_png, args.selector)
    except Exception as e:  # noqa: BLE001
        log(f"ERROR: mockup capture failed: {e}")
        return 3
    log(f"CAPTURE sgs @ {w}x{h}: {args.sgs}")
    try:
        capture(args.sgs, (w, h), sgs_png, args.selector)
    except Exception as e:  # noqa: BLE001
        log(f"ERROR: sgs capture failed: {e}")
        return 3

    try:
        mockup = Image.open(str(mockup_png))
        sgs = Image.open(str(sgs_png))
    except Exception as e:  # noqa: BLE001
        log(f"ERROR: PNG decode failed: {e}")
        return 4

    log(f"DECODE mockup {mockup.width}x{mockup.height}, sgs {sgs.width}x{sgs.height}")
    body_a = find_body_start_y(mockup)
    body_b = find_body_start_y(sgs)
    log(f"BODY-ANCHOR mockup_y={body_a}  sgs_y={body_b}")
    a, b = align(mockup, sgs, body_a, body_b)
    log(f"ALIGN to {a.width}x{a.height}")

    try:
        mismatched, total, heatmap = diff(a, b)
    except Exception as e:  # noqa: BLE001
        log(f"ERROR: diff failed: {e}")
        return 4
    pct = (mismatched / total) * 100 if total else 0.0
    log(f"DIFF mismatched={mismatched}/{total} ({pct:.3f}%)")

    heatmap.save(str(out_dir / "heatmap.png"))
    compose(a, b, heatmap, out_dir / "composite.png")

    summary = {
        "mockup_url": args.mockup,
        "sgs_url": args.sgs,
        "viewport": args.viewport,
        "mockup_dimensions": [mockup.width, mockup.height],
        "sgs_dimensions": [sgs.width, sgs.height],
        "aligned_dimensions": [a.width, a.height],
        "mismatched_pixels": mismatched,
        "total_pixels": total,
        "mismatch_percent": round(pct, 4),
        "threshold_percent": args.threshold,
        "verdict": (
            "PASS" if pct <= args.threshold
            else "WARN" if pct <= args.threshold * 5
            else "FAIL"
        ),
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }
    (out_dir / "diff.json").write_text(json.dumps(summary, indent=2))
    log(f"VERDICT {summary['verdict']} ({pct:.3f}% vs threshold {args.threshold}%)")
    log(f"OUTPUT {out_dir}/")

    if summary["verdict"] == "PASS":
        return 0
    if summary["verdict"] == "WARN":
        return 2
    return 1


if __name__ == "__main__":
    sys.exit(main())
