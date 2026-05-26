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

    # Suffix-match discipline (Sonnet adversarial QC finding 2026-05-17): the
    # original ``suf_l in k`` substring match was too permissive — suffix
    # "size" matched fontsize AND iconsize AND imagesize, so a font-size CSS
    # rule could count as covered just because the section had iconSize set.
    # Suffix-anchored match: an SGS attr key matches an expected suffix iff
    # the key ends with the suffix, optionally followed by ONE recognised
    # breakpoint/state suffix. This eliminates the cross-suffix contamination
    # while still covering responsive + state variants (the universal Unit-
    # suffix lift shipped 2026-05-17 produces e.g. headlineFontSizeDesktop,
    # cardPaddingMobile etc.).
    _BREAKPOINT_TAILS = ("mobile", "tablet", "desktop",
                         "hover", "focus", "active", "disabled")

    def _key_matches_suffix(key_lower: str, suf_lower: str) -> bool:
        if key_lower.endswith(suf_lower):
            return True
        for tail in _BREAKPOINT_TAILS:
            if key_lower.endswith(suf_lower + tail):
                return True
        return False

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
                if any(_key_matches_suffix(k, suf_l) for k in attr_keys_lower):
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


def _detect_chrome_height(page) -> tuple[int, int, int]:
    """Measure WP chrome (admin bar + template-part header) at top of page.

    Phase 0.3 measurement-methodology hardening (Spec 22 FR-22-7 + R-22-13).
    Returns (chrome_height_px, adminbar_height, template_part_header_height).

    Detection logic:
      - `#wpadminbar`: visible only to logged-in users with admin capability;
        always rendered above-the-fold when present.
      - First `header.wp-block-template-part` or `.sgs-header.wp-block-template-part`:
        the framework header template part rendered ABOVE the body content on
        SGS-clone pages. This is distinct from a cv2-emitted body-content
        `<header class="sgs-header">` (without `wp-block-template-part`) which
        IS part of the body comparison surface and must NOT be cropped.
      - Multiple template-part headers: prefer one with `data-area="header"`;
        otherwise first match.

    All measurements via `getBoundingClientRect().bottom` to capture the full
    visible extent (including any padding/border/box-shadow that bleeds into
    the screenshot). Graceful on missing elements — returns 0 for absent.
    """
    js = """
    () => {
      const out = { adminbar: 0, template_part_header: 0 };
      const ab = document.querySelector('#wpadminbar');
      if (ab) {
        const r = ab.getBoundingClientRect();
        if (r && r.bottom > 0) out.adminbar = Math.ceil(r.bottom);
      }
      // Prefer data-area="header" if present, else first matching template-part.
      let tph = document.querySelector(
        'header.wp-block-template-part[data-area="header"], ' +
        '.sgs-header.wp-block-template-part[data-area="header"]'
      );
      if (!tph) {
        tph = document.querySelector(
          'header.wp-block-template-part, ' +
          '.sgs-header.wp-block-template-part'
        );
      }
      if (tph) {
        const r = tph.getBoundingClientRect();
        if (r && r.bottom > 0) out.template_part_header = Math.ceil(r.bottom);
      }
      return out;
    }
    """
    try:
        result = page.evaluate(js)
    except Exception:  # noqa: BLE001
        return (0, 0, 0)
    ab = int(result.get("adminbar") or 0)
    tph = int(result.get("template_part_header") or 0)
    # template_part_header.bottom already includes adminbar offset if both
    # present (it's a viewport-relative measurement). Use max() to avoid
    # double-counting; fall back to sum only if tph < ab (rare misordering).
    if tph > 0 and tph >= ab:
        chrome_height = tph
    else:
        chrome_height = ab + tph
    return (chrome_height, ab, tph)


def _wait_for_fonts(page, timeout_ms: int = 8000) -> None:
    """Block until `document.fonts.ready` resolves or timeout.

    Phase 0.3 measurement-methodology hardening. Font-load timing is one of
    the residual ~4pp noise sources identified for Phase 1.5: unstyled text
    captured before font swap inflates pixel-diff. Wrapped in timeout because
    `document.fonts.ready` hangs forever on broken font URLs.
    """
    import time
    started = time.monotonic()
    try:
        page.evaluate(
            "() => Promise.race(["
            "  document.fonts.ready,"
            "  new Promise(r => setTimeout(r, " + str(timeout_ms) + "))"
            "])"
        )
        elapsed_ms = int((time.monotonic() - started) * 1000)
        if elapsed_ms >= timeout_ms - 50:
            log(f"WAIT-FONTS timed out after {timeout_ms}ms — capturing anyway")
        else:
            log(f"WAIT-FONTS document.fonts.ready resolved in {elapsed_ms}ms")
    except Exception as e:  # noqa: BLE001
        log(f"WAIT-FONTS evaluation failed ({e}) — capturing anyway")


def capture(
    url: str,
    viewport: tuple[int, int],
    out_path: Path,
    selector: str | None = None,
    is_sgs: bool = False,
    wait_fonts: bool = False,
    keep_chrome: bool = False,
) -> int:
    """Capture a screenshot. If selector is given, crop to that element's
    bounding box; otherwise full-page capture.

    Per-selector cropping is the established SGS pattern (mirrors
    scripts/screenshot-diff-helper.js --selector) — eliminates the structural
    DOM-wrapper differences between converter-rendered output and mockup-as-
    raw-HTML that inflate full-page diffs.

    When `is_sgs=True` AND full-page mode (no selector OR selector fallback),
    detect WP chrome at the top (admin bar + framework template-part header)
    and crop it from the saved PNG. Phase 0.3 hardening (Spec 22 R-22-13);
    closes the 60px chrome-bleed measurement artefact on hero-clone-poc.

    When `wait_fonts=True`, blocks on `document.fonts.ready` (up to 8s) before
    screenshot. Closes Phase 1.5 font-swap-timing noise source.

    Returns the chrome_height_px applied (0 in selector-success mode where
    `element.screenshot()` already crops to the target element's bounding box,
    or when not is_sgs, or when no chrome detected).
    """
    w, h = viewport
    chrome_height_applied = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": w, "height": h},
            device_scale_factor=1,
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(800)
        if wait_fonts:
            _wait_for_fonts(page)
        if selector:
            el = page.locator(selector).first
            try:
                el.wait_for(state="visible", timeout=5000)
                # Phase 0.3 measurement-methodology hardening (Spec 22 R-22-13).
                # The hero-clone-poc 60px chrome-bleed lives here: sticky/fixed
                # WP chrome (admin bar, sticky template-part header) re-anchors
                # to viewport-top during `el.screenshot()` scrolling and paints
                # OVER the top rows of the captured element. Identified via
                # post-scroll DOM inspection: `position:sticky;top:0` template-
                # part header with bb.bottom=246 overlapping `.sgs-hero` viewport
                # bb.top=180 → 66px cream band on the captured hero PNG.
                # Mitigation: hide sticky/fixed chrome (visibility:hidden, not
                # display:none — preserves layout, only blocks paint) before
                # `el.screenshot()`. Restore handled by browser close so no
                # explicit cleanup needed. Mockup side never has chrome so the
                # hide is is_sgs-gated.
                ch, ab, tph = (0, 0, 0)
                if is_sgs and not keep_chrome:
                    ch, ab, tph = _detect_chrome_height(page)
                    log(
                        f"CHROME-DETECT sgs pre-scroll chrome_height_px={ch} "
                        f"(adminbar={ab}px, template_part_header={tph}px)"
                    )
                elif is_sgs and keep_chrome:
                    log(
                        "CHROME-KEEP --keep-chrome flag set; skipping chrome "
                        "detection + hide (debug observability mode per "
                        "P-PIXEL-DIFF-KEEP-CHROME-FLAG)"
                    )
                # Scroll the target element into view so any lazy-loaded images
                # within it actually fetch + decode. Without this, sections far
                # below the initial viewport screenshot with empty `<img>` slots
                # because `loading="lazy"` keeps them deferred. Captured
                # 2026-05-17 during brand walkdown.
                # Hide sticky/fixed WP chrome BEFORE scroll + screenshot.
                # Only on SGS side (mockup is a static HTML file with no WP chrome).
                # visibility:hidden preserves layout (no shift), only blocks paint.
                hidden_chrome_count = 0
                if is_sgs and not keep_chrome:
                    hidden_chrome_count = page.evaluate(
                        """() => {
                            const targets = [
                                '#wpadminbar',
                                'header.wp-block-template-part',
                                '.sgs-header.wp-block-template-part'
                            ];
                            let n = 0;
                            for (const sel of targets) {
                                document.querySelectorAll(sel).forEach(el => {
                                    const cs = getComputedStyle(el);
                                    if (cs.position === 'sticky' || cs.position === 'fixed') {
                                        el.style.visibility = 'hidden';
                                        n++;
                                    } else {
                                        // Even non-sticky chrome is irrelevant for
                                        // an element screenshot below it, but hide
                                        // anyway so any margin-collapsing doesn't
                                        // shift the captured element vertically.
                                        // Skip if the element is sgs/body content
                                        // (no wp-block-template-part class but
                                        // matches '.sgs-header' selector — that's
                                        // a cv2-emitted body header).
                                        if (el.matches('.sgs-header') &&
                                            !el.matches('.wp-block-template-part')) {
                                            return;
                                        }
                                        el.style.visibility = 'hidden';
                                        n++;
                                    }
                                });
                            }
                            return n;
                        }"""
                    )
                    if hidden_chrome_count > 0:
                        log(
                            f"CHROME-HIDE sgs hid {hidden_chrome_count} sticky/fixed "
                            f"chrome elements before element.screenshot()"
                        )
                el.scroll_into_view_if_needed()
                # P-PIXEL-DIFF-LAZY-LOAD-DYNAMIC-WAIT (closed 2026-05-17):
                # Replace the arbitrary 1200 ms fixed wait with a dynamic poll
                # that waits until every lazy-loaded image in the target element
                # reports complete + has a real naturalWidth (i.e. fully decoded).
                # Falls back to a 1500 ms timeout if wait_for_function raises
                # (e.g. Playwright timeout on very slow network) rather than
                # crashing the entire pixel-diff run.
                try:
                    page.wait_for_function(
                        "() => Array.from(document.querySelectorAll("
                        "'img[loading=\"lazy\"]')).every("
                        "img => img.complete && img.naturalWidth > 0)",
                        timeout=8000,
                    )
                except Exception:  # noqa: BLE001
                    # Dynamic wait timed out or raised — fall back to a fixed
                    # delay that is still more conservative than the old 1200 ms.
                    page.wait_for_timeout(1500)
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except Exception:  # noqa: BLE001
                    pass
                el.screenshot(path=str(out_path))
                browser.close()
                # Sticky chrome was hidden pre-screenshot (CHROME-HIDE branch
                # above) so element.screenshot() captures clean content.
                # Return the pre-scroll chrome height for telemetry so diff.json
                # records what would have bled in without the mitigation.
                return ch if (is_sgs and hidden_chrome_count > 0) else 0
            except Exception:  # noqa: BLE001
                log(f"WARN: selector {selector!r} not found on {url} — falling back to full page")
        # Full-page path (no selector OR selector fallback). For SGS captures,
        # measure + crop chrome BEFORE writing the PNG that downstream diff
        # consumes. --keep-chrome short-circuits this for debug observability.
        if is_sgs and not keep_chrome:
            chrome_height, ab, tph = _detect_chrome_height(page)
            chrome_height_applied = chrome_height
            log(
                f"CHROME-DETECT sgs_screenshot chrome_height_px={chrome_height} "
                f"(adminbar={ab}px, template_part_header={tph}px)"
            )
        elif is_sgs and keep_chrome:
            log(
                "CHROME-KEEP full-page: --keep-chrome flag set; skipping "
                "chrome detection + post-screenshot crop"
            )
        page.screenshot(path=str(out_path), full_page=True)
        browser.close()
    # Crop chrome off the saved PNG. Done AFTER browser close to keep the
    # Playwright session lean and reuse PIL (already an import dependency).
    if chrome_height_applied > 0:
        try:
            img = Image.open(str(out_path))
            iw, ih = img.size
            if chrome_height_applied >= ih:
                log(
                    f"CHROME-CROP skipped: detected height {chrome_height_applied}px "
                    f">= image height {ih}px — leaving uncropped"
                )
                return 0
            cropped = img.crop((0, chrome_height_applied, iw, ih))
            cropped.save(str(out_path))
            log(
                f"CHROME-CROP sgs_screenshot cropped by {chrome_height_applied}px "
                f"(adminbar+template_part_header)"
            )
        except Exception as e:  # noqa: BLE001
            log(f"WARN: chrome-crop failed ({e}) — leaving uncropped")
            return 0
    return chrome_height_applied


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
    ap.add_argument(
        "--wait-fonts",
        action="store_true",
        default=False,
        help="Wait for `document.fonts.ready` (up to 8s) before capturing each "
             "screenshot. Phase 0.3 measurement-methodology hardening — closes "
             "font-swap-timing noise on the pixel-diff result. Default OFF for "
             "backward compatibility; recommend ON for CI / Phase 1 runs.",
    )
    ap.add_argument(
        "--keep-chrome",
        action="store_true",
        default=False,
        help="Debug observability override: skip the SGS-side chrome detection "
             "+ visibility:hidden mitigation (and the full-page post-screenshot "
             "chrome crop). Use when you need to SEE chrome rendering (e.g. "
             "verifying admin bar renders correctly). Default OFF (production "
             "measurement runs apply chrome-hide for clean comparison). Per "
             "P-PIXEL-DIFF-KEEP-CHROME-FLAG / /qc-council Task 5 Rater B 2026-05-27.",
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
    mockup_chrome_height = 0
    sgs_chrome_height = 0
    try:
        mockup_chrome_height = capture(
            args.mockup, (w, h), mockup_png, args.selector,
            is_sgs=False, wait_fonts=args.wait_fonts,
            keep_chrome=args.keep_chrome,
        )
    except Exception as e:  # noqa: BLE001
        log(f"ERROR: mockup capture failed: {e}")
        return 3
    log(f"CAPTURE sgs @ {w}x{h}: {args.sgs}")
    try:
        sgs_chrome_height = capture(
            args.sgs, (w, h), sgs_png, args.selector,
            is_sgs=True, wait_fonts=args.wait_fonts,
            keep_chrome=args.keep_chrome,
        )
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
    # Defensive guard (Phase 0.3 R-22-13): if chrome-crop was applied to SGS
    # but the resulting SGS image is now SHORTER than the mockup by >100px on
    # full-page (selector=None) mode, the mockup may inadvertently carry
    # chrome itself (e.g. file paths swapped). Surface a warning rather than
    # silently producing a misaligned diff.
    if args.selector is None and sgs_chrome_height > 0:
        if mockup.height - sgs.height > 100:
            log(
                f"WARN: post-crop sgs ({sgs.width}x{sgs.height}) is >100px shorter "
                f"than mockup ({mockup.width}x{mockup.height}). Mockup file may "
                f"include chrome; verify --mockup target is a clean mockup."
            )
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
        "sgs_chrome_height_px": sgs_chrome_height,
        "wait_fonts": bool(args.wait_fonts),
        "keep_chrome": bool(args.keep_chrome),
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
