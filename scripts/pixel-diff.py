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


# ============================================================================
# Attribute-coverage computation (Phase 9 pre-work Step 3)
# ============================================================================
# Pairs with expected_rules.py to give a split metric:
#   - pixel-diff%          — visible rendered delta (existing diff)
#   - attribute-coverage%  — what fraction of expected CSS rules got at
#     least one declaration lifted onto an SGS attribute. Pure converter
#     score, isolated from block + theme rendering.
# A section with attribute-coverage 100% + pixel-diff 5% routes the residual
# work to block/theme, not converter. A section with coverage <95% routes the
# residual to converter.


def _load_property_suffixes_map() -> dict[str, set[str]]:
    """Return {css_property: {SGS_attr_suffix, ...}} via db_lookup.

    Falls back to an empty map if db_lookup can't be imported (zero-coverage
    output rather than a hard error — pixel-diff still completes).
    """
    try:
        repo_root = Path(__file__).resolve().parent.parent
        cv2_dir = repo_root / "plugins" / "sgs-blocks" / "scripts"
        if str(cv2_dir) not in sys.path:
            sys.path.insert(0, str(cv2_dir))
        from orchestrator.converter_v2 import db_lookup as db  # type: ignore[no-redef]
        # db.css_property_suffixes() returns list[tuple[css_prop, suffix, role]]
        out: dict[str, set[str]] = {}
        for row in db.css_property_suffixes():
            css_prop, suffix = row[0], row[1]
            out.setdefault(css_prop.lower(), set()).add(suffix)
        return out
    except Exception:  # noqa: BLE001
        return {}


def compute_attribute_coverage(expected_rules_path: Path,
                               extracted_attrs_path: Path) -> dict:
    """Compute attribute-coverage% for one section.

    Algorithm:
      1. Load expected-rules baseline (JSONL).
      2. For each rule, collect the set of CSS property names from its decls.
      3. A rule is COVERED iff there exists ≥1 CSS property in the rule whose
         SGS suffix (via property_suffixes) appears as a substring of ANY key
         in extracted_attributes.
      4. coverage% = covered_rules / total_rules × 100.

    Returns {coverage_percent, total_rules, covered_rules, uncovered_rules}.
    """
    if not expected_rules_path.exists() or not extracted_attrs_path.exists():
        return {
            "coverage_percent": None,
            "total_rules": 0,
            "covered_rules": 0,
            "uncovered_rules": [],
            "note": "expected-rules or extracted-attrs path missing",
        }

    rules: list[dict] = []
    with open(expected_rules_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rules.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    extracted_obj = json.loads(extracted_attrs_path.read_text(encoding="utf-8"))
    if isinstance(extracted_obj, dict) and "extracted_attributes" in extracted_obj:
        # per_section_results entry shape
        extracted_obj = extracted_obj["extracted_attributes"]
    attr_keys = list(extracted_obj.keys()) if isinstance(extracted_obj, dict) else []
    attr_keys_lower = [k.lower() for k in attr_keys]

    prop_map = _load_property_suffixes_map()

    covered = 0
    uncovered: list[str] = []
    for rule in rules:
        decls = rule.get("declarations") or {}
        props = [p.lower() for p in decls.keys()]
        rule_covered = False
        for prop in props:
            suffixes = prop_map.get(prop, set())
            for suf in suffixes:
                suf_l = suf.lower()
                if any(suf_l in k for k in attr_keys_lower):
                    rule_covered = True
                    break
            if rule_covered:
                break
        if rule_covered:
            covered += 1
        else:
            uncovered.append(rule.get("selector", "<unknown>"))

    total = len(rules)
    pct = (covered / total) * 100 if total else None
    return {
        "coverage_percent": round(pct, 2) if pct is not None else None,
        "total_rules": total,
        "covered_rules": covered,
        "uncovered_rules": uncovered[:50],  # cap to keep diff.json readable
    }


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
    ap.add_argument(
        "--expected-rules",
        default=None,
        type=Path,
        help="Path to expected-rules-<boundary>.jsonl from Step 2 baseline. "
             "When paired with --extracted-attrs, diff.json adds attribute-"
             "coverage%% (pure converter score).",
    )
    ap.add_argument(
        "--extracted-attrs",
        default=None,
        type=Path,
        help="Path to per-section extracted_attributes JSON. Accepts either a "
             "flat {attr: value} dict OR a per_section_results entry "
             "({extracted_attributes: {...}, ...}).",
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

    # Phase 9 split-metric: attribute-coverage% sits alongside the pixel-diff%.
    # Coverage 100% + diff >5% → block/theme work, not converter. Coverage <95%
    # → converter work. See v3 plan branching rule in next-session-prompt.md.
    if args.expected_rules and args.extracted_attrs:
        coverage = compute_attribute_coverage(args.expected_rules, args.extracted_attrs)
        summary["attribute_coverage"] = coverage
        cov_pct = coverage.get("coverage_percent")
        if cov_pct is not None:
            log(f"COVERAGE {cov_pct:.2f}% "
                f"({coverage['covered_rules']}/{coverage['total_rules']} expected rules)")
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
