#!/usr/bin/env python3
"""
No-inline detector — the worklist generator for the framework-wide inline-zero
rollout (Spec 32 FR-32-4 as amended 2026-07-18 / D345; plan
`.claude/plans/2026-07-17-phase-inline-zero-rollout.md`).

Classifies every `sgs/*` block by HOW it emits per-instance CSS, so the rollout
can split the roster into mechanical (CASE 1/2) vs judgment (CASE 3 / bespoke).

TWO signal sources, per /qc-council correction C3 (block.json is
necessary-but-not-sufficient; the live render is authoritative):

  * STATIC  — parse each block's render.php + block.json + style.css for the
              emit-shape signatures + per-feature skip-serialisation state +
              the GOTCHA-F `[style*="--"]` presence-selector hazard.
  * LIVE    — fetch canary page(s), map every inline `style="--…"` / `style=""`
              occurrence to the owning `wp-block-sgs-<block>` element. This is
              the AUTHORITATIVE "does it actually still inline" signal, but only
              for blocks that render on the scanned page(s); blocks absent from
              every scanned page fall back to the static signal (flagged
              `live_seen: false`).

Output: `no-inline-worklist.json` — one row per block.

Positive controls (must be classified `done`, NOT appear as work):
  brand-strip, quote  — the reference zero-inline implementations.

Usage:
  python detect.py                      # static only
  python detect.py --live URL [URL...]  # static + live (authoritative)
  python detect.py --live-default       # static + the built-in canary URL set
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

# --- Paths ------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
BLOCKS_DIR = SCRIPT_DIR.parent.parent / "src" / "blocks"
OUT_FILE = SCRIPT_DIR / "no-inline-worklist.json"

# Blocks proven zero-inline — the reference implementations (D345 controls).
POSITIVE_CONTROLS = {"brand-strip", "quote"}

# Default canary URLs (the live, authoritative signal).
DEFAULT_LIVE_URLS = [
    "https://palestine-lives.org/",
]

# WP styling supports that auto-inline via get_block_wrapper_attributes()
# unless __experimentalSkipSerialization is set (per-feature).
STYLING_SUPPORTS = ["color", "spacing", "__experimentalBorder", "typography", "shadow"]

# The var-emit shape variable names the /qc-council found (5+ shapes).
VAR_EMIT_SHAPES = [
    "css_vars",
    "inline_styles",
    "styles",
    "sgs_wrapper_styles",
    "wrapper_styles",
    "css",
]


# --- Static analysis --------------------------------------------------------
def strip_style_tag_bodies(php: str) -> str:
    """Remove the contents of `<style>…</style>` so a scoped-rule `style="…"`
    substring inside emitted CSS is not mistaken for an inline attribute."""
    return re.sub(r"<style>.*?</style>", "<style></style>", php, flags=re.DOTALL)


def analyse_block_json(bj_path: Path) -> dict:
    """Per-feature skip-serialisation state + declared styling supports."""
    result = {
        "supports_present": [],
        "skip_serialization": {},   # feature -> True/False (present features only)
        "all_present_skipped": None,
        "parse_error": None,
    }
    try:
        data = json.loads(bj_path.read_text(encoding="utf-8"))
    except Exception as exc:  # malformed block.json -> log + skip, never crash
        result["parse_error"] = str(exc)
        return result

    supports = data.get("supports", {}) or {}
    present = []
    for feat in STYLING_SUPPORTS:
        if feat not in supports:
            continue
        node = supports[feat]
        present.append(feat)
        skip = False
        if isinstance(node, dict):
            raw = node.get("__experimentalSkipSerialization", False)
            # WP accepts `true` (all) OR an array of sub-features to skip.
            if raw is True:
                skip = True
            elif isinstance(raw, list) and raw:
                skip = True  # partial skip — flagged for per-feature judgment
        result["skip_serialization"][feat] = skip
    result["supports_present"] = present
    if present:
        result["all_present_skipped"] = all(result["skip_serialization"].values())
    else:
        result["all_present_skipped"] = True  # no styling supports -> nothing to skip
    return result


def analyse_render_php(rp_path: Path) -> dict:
    """Emit-shape signatures from render.php."""
    result = {
        "render_php": True,
        "passes_style_key": False,
        "emits_literal_style_attr": False,
        "uses_container_wrapper": False,
        "has_scoped_style_tag": False,
        "var_emit_shapes": [],
    }
    php = rp_path.read_text(encoding="utf-8", errors="replace")

    # Scoped <style> emission present?
    result["has_scoped_style_tag"] = "<style>" in php

    php_no_style = strip_style_tag_bodies(php)

    # get_block_wrapper_attributes( array( ... 'style' => ... ) ) — multiline.
    for m in re.finditer(r"get_block_wrapper_attributes\s*\(", php_no_style):
        # scan a bounded window for a 'style' => key before the matching depth-0 close
        window = php_no_style[m.end(): m.end() + 600]
        if re.search(r"['\"]style['\"]\s*=>", window):
            result["passes_style_key"] = True
            break

    # A literal style=" attribute printed into HTML (outside <style> bodies).
    if re.search(r'style=\\?"', php_no_style):
        result["emits_literal_style_attr"] = True

    # Shared wrapper (root built by SGS_Container_Wrapper — no direct style key).
    if re.search(r"SGS_Container_Wrapper|sgs_container_wrapper", php):
        result["uses_container_wrapper"] = True

    # Which var-emit shape names are in use.
    shapes = []
    for name in VAR_EMIT_SHAPES:
        if re.search(r"\$" + re.escape(name) + r"\b", php):
            shapes.append(name)
    result["var_emit_shapes"] = shapes
    return result


def analyse_style_css(css_path: Path) -> dict:
    """GOTCHA F — presence-selectors that silently break when a var moves scoped."""
    result = {"presence_selectors": []}
    if not css_path.exists():
        return result
    css = css_path.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r'\[style\*=(["\'])(--[^"\']*)\1\]', css):
        result["presence_selectors"].append(m.group(2))
    return result


# --- Live analysis ----------------------------------------------------------
def fetch(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "sgs-no-inline-detector"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


TAG_RE = re.compile(r"<[a-zA-Z][^>]*>")
BLOCK_CLASS_RE = re.compile(r"wp-block-sgs-([a-z0-9-]+)")
INLINE_VAR_RE = re.compile(r'style="\s*--[^"]*"')
INLINE_EMPTY_RE = re.compile(r'style=""')


def analyse_live(urls: list[str]) -> dict:
    """Map inline style occurrences to the owning wp-block-sgs-<block> per tag.

    Returns {block_slug: {"style_var": n, "style_empty": n}} plus the set of
    block slugs that were seen on any page at all (live_seen)."""
    per_block: dict[str, dict] = {}
    seen: set[str] = set()
    for url in urls:
        try:
            html = fetch(url)
        except Exception as exc:
            print(f"  [live] WARN: could not fetch {url}: {exc}", file=sys.stderr)
            continue
        for tag in TAG_RE.finditer(html):
            t = tag.group(0)
            cls = BLOCK_CLASS_RE.search(t)
            if not cls:
                continue
            slug = cls.group(1)
            seen.add(slug)
            row = per_block.setdefault(slug, {"style_var": 0, "style_empty": 0})
            if INLINE_VAR_RE.search(t):
                row["style_var"] += 1
            elif INLINE_EMPTY_RE.search(t):
                row["style_empty"] += 1
    return {"per_block": per_block, "seen": seen}


# --- Classification ---------------------------------------------------------
def classify(block: dict) -> tuple[str, str]:
    """Return (case, klass). case in {done,1,2,3,mixed,none}; klass in
    {done,mechanical,judgment,skip-header-footer}."""
    slug = block["block"]
    if slug in POSITIVE_CONTROLS:
        return "done", "done"

    live = block.get("live") or {}
    live_var = live.get("style_var", 0)
    live_empty = live.get("style_empty", 0)
    live_seen = block.get("live_seen", False)

    st = block["static"]
    bj = block["block_json"]

    # Header/footer family — co-session territory + fidelity-excluded.
    hf = ("header" in slug or "footer" in slug or slug in {"adaptive-nav", "nav-menu", "responsive-logo", "social-icons"})

    # LIVE is authoritative where the block was seen.
    if live_seen:
        if live_var and live_empty:
            case = "mixed"
        elif live_var:
            case = "1"
        elif live_empty:
            case = "2"
        else:
            case = "done"  # rendered live and carried NO inline style
    else:
        # Static fallback for blocks absent from every scanned page.
        emits = st["passes_style_key"] or st["emits_literal_style_attr"]
        not_all_skipped = bj["all_present_skipped"] is False
        if emits or not_all_skipped:
            case = "3"  # unproven emit — needs live confirmation / judgment
        else:
            case = "done"

    if case == "done":
        return case, "done"
    if hf:
        return case, "skip-header-footer"

    # mechanical = pure empty style OR standard $css_vars->scoped shape with
    # all supports already skip-serialised; everything else = judgment.
    all_skipped = bj["all_present_skipped"] is not False
    standard_shape = "css_vars" in st["var_emit_shapes"] and not st["emits_literal_style_attr"]
    has_presence_sel = bool(st["presence_selectors"])

    if case == "2" and all_skipped:
        return case, "mechanical"
    if case == "1" and all_skipped and standard_shape and not has_presence_sel:
        return case, "mechanical"
    return case, "judgment"


# --- Main -------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="No-inline detector / worklist generator")
    ap.add_argument("--live", nargs="*", metavar="URL", help="canary URLs for the live scan")
    ap.add_argument("--live-default", action="store_true", help="use the built-in canary URL set")
    args = ap.parse_args()

    if not BLOCKS_DIR.is_dir():
        print(f"ERROR: blocks dir not found: {BLOCKS_DIR}", file=sys.stderr)
        return 2

    live_urls = []
    if args.live_default:
        live_urls = list(DEFAULT_LIVE_URLS)
    if args.live:
        live_urls = list(args.live)

    live_data = {"per_block": {}, "seen": set()}
    if live_urls:
        print(f"[live] scanning {len(live_urls)} page(s): {', '.join(live_urls)}")
        live_data = analyse_live(live_urls)
        print(f"[live] saw {len(live_data['seen'])} distinct sgs block types")

    rows = []
    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        if not block_dir.is_dir():
            continue
        slug = block_dir.name
        rp = block_dir / "render.php"
        bj = block_dir / "block.json"

        static = {"render_php": False, "passes_style_key": False,
                  "emits_literal_style_attr": False, "uses_container_wrapper": False,
                  "has_scoped_style_tag": False, "var_emit_shapes": [], "presence_selectors": []}
        if rp.exists():
            static.update(analyse_render_php(rp))
        static.update(analyse_style_css(block_dir / "style.css"))

        block_json = analyse_block_json(bj) if bj.exists() else {
            "supports_present": [], "skip_serialization": {}, "all_present_skipped": True,
            "parse_error": "block.json missing"}

        live_row = live_data["per_block"].get(slug)
        row = {
            "block": slug,
            "static": static,
            "block_json": block_json,
            "live": live_row,
            "live_seen": slug in live_data["seen"],
        }
        case, klass = classify(row)
        row["case"] = case
        row["class"] = klass
        rows.append(row)

    # Ordering: work first (mechanical, judgment), then skip, then done.
    order = {"mechanical": 0, "judgment": 1, "skip-header-footer": 2, "done": 3}
    rows.sort(key=lambda r: (order.get(r["class"], 9), r["block"]))

    OUT_FILE.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    # Summary.
    from collections import Counter
    by_class = Counter(r["class"] for r in rows)
    by_case = Counter(r["case"] for r in rows)
    print(f"\nWrote {OUT_FILE} — {len(rows)} blocks")
    print("  by class:", dict(by_class))
    print("  by case: ", dict(by_case))
    work = [r["block"] for r in rows if r["class"] in ("mechanical", "judgment")]
    print(f"  WORK ({len(work)}):", ", ".join(work) or "(none)")
    hf = [r["block"] for r in rows if r["class"] == "skip-header-footer"]
    if hf:
        print(f"  SKIP header/footer ({len(hf)}):", ", ".join(hf))
    # Positive-control assertion.
    bad = [r["block"] for r in rows if r["block"] in POSITIVE_CONTROLS and r["class"] != "done"]
    if bad:
        print(f"  ERROR: positive control(s) not 'done': {bad}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
