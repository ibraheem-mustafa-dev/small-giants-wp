#!/usr/bin/env python3
"""
check_no_mirror.py — R-22-15 anti-mirror gate for the cloning converter.

ENFORCED GATE STATUS
====================
DEFAULT MODE  : --report  (informational, exits 0 always)
ENFORCE MODE  : --enforce (exits non-zero on any (a)/(b) violation)

The converter currently cheats — every run will fire violations today.
Run with --report during the fix pipeline. Switch to --enforce once the
converter no longer emits draft-class containers or sourceMode='bound'.

WIRING NOTE (for pipeline-stage-gate.py)
=========================================
Wire into pipeline-stage-gate.py as a pre-commit gate AFTER the converter
fix is confirmed clean. Look for the comment "# R-22-15 WIRE POINT" in
pipeline-stage-gate.py to add the call:

    subprocess.run([sys.executable, CHECK_NO_MIRROR, run_dir, '--enforce'],
                   check=True)

Do NOT activate --enforce until 'python check_no_mirror.py <run_dir> --report'
returns zero violations on two consecutive clean runs.

WHAT THIS CHECKS (R-22-15, Bean-directed 2026-06-06)
=====================================================
(a) DRAFT-CLASS CONTAINER — any emitted block whose className carries a BEM
    ELEMENT class matching /sgs-[a-z0-9-]+__[a-z0-9-]+/ (with optional --modifier
    suffix). E.g. sgs-hero__ctas, sgs-trust-bar__badge, sgs-product-card__body.
    These mean the converter mirrored a draft wrapper instead of converting it.
    NOTE: a block's OWN root class (sgs-trust-bar on the trust-bar block) is fine —
    only ELEMENT classes (containing __) on ANY block are flagged.

(b) BOUND SOURCEMODE — any emitted block with sourceMode='bound'.
    EXCEPTION: wc-product / sgs-cpt blocks are legitimate live-data modes. Do NOT
    flag those. Only the converter echo-$content passthrough is the cheat.

(c) D2-STRANDED LAYOUT CSS (soft WARNING, best-effort) — layout properties
    (grid-template-columns, display, gap, etc.) appearing in variation-d0-d2.css
    under a .sgs- selector that maps to a block that HAS a native attribute
    destination. This is best-effort because the attribute→CSS mapping is not fully
    catalogued. Reported as WARNINGs only; never counted as hard violations.

EXIT CODES (--enforce mode)
===========================
0 — no (a)/(b) violations found (WARNINGs do not affect exit code)
1 — one or more (a)/(b) violations found
2 — usage error (missing files, unreadable artefacts)

EXIT CODES (--report mode, default)
====================================
Always 0. Violations printed for information only.

USAGE
=====
    # Report mode (default) — safe to run any time, never blocks
    python check_no_mirror.py [<run_dir>]
    python check_no_mirror.py [<run_dir>] --report

    # Enforce mode — blocks on violation; wire into commit gate once clean
    python check_no_mirror.py [<run_dir>] --enforce

    # <run_dir> defaults to the most-recent directory under pipeline-state/

UK English in all output.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
REPO_ROOT = HERE.parent.parent.parent.parent  # plugins/sgs-blocks/scripts/orchestrator → repo root
PIPELINE_STATE_DIR = REPO_ROOT / "pipeline-state"

# ---------------------------------------------------------------------------
# Layout CSS properties that belong in native block attributes (D1), NOT D2.
# Presence in D2 under a .sgs- selector is a soft WARNING.
# ---------------------------------------------------------------------------
D1_LAYOUT_PROPS = frozenset([
    "grid-template-columns",
    "grid-template-rows",
    "gap",
    "column-gap",
    "row-gap",
    "display",
    "max-width",
    "min-height",
    "flex-direction",
    "align-items",
    "justify-content",
    "flex-wrap",
    "grid-column",
    "grid-row",
])

# Legitimate sourceMode values — NOT the converter cheat
LEGIT_SOURCE_MODES = frozenset(["wc-product", "sgs-cpt", "typed"])

# ---------------------------------------------------------------------------
# BEM element class pattern
# Matches: sgs-<block>__<element>  or  sgs-<block>__<element>--<modifier>
# (anything with __ is an element class regardless of modifier suffix)
# ---------------------------------------------------------------------------
BEM_ELEMENT_RE = re.compile(r"^sgs-[a-z0-9-]+__[a-z0-9-]+(?:--[a-z0-9-]+)?$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def latest_run_dir(state_dir: Path) -> Path | None:
    """Return the most-recently-modified pipeline-state sub-directory."""
    candidates = [
        d for d in state_dir.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda d: d.stat().st_mtime)


def parse_block_markup(markup: str) -> list[tuple[str, dict]]:
    """Return list of (block_slug, attrs_dict) for every opening block comment."""
    # Match <!-- wp:slug {...} --> or <!-- wp:slug {} --> or <!-- wp:slug -->
    block_open_re = re.compile(
        r"<!--\s*wp:([\w/:-]+)\s*(\{.*?\})?\s*/?-->",
        re.DOTALL,
    )
    results: list[tuple[str, dict]] = []
    for m in block_open_re.finditer(markup):
        slug = m.group(1)
        attrs_raw = m.group(2) or "{}"
        try:
            attrs = json.loads(attrs_raw)
        except json.JSONDecodeError:
            attrs = {}
        results.append((slug, attrs))
    return results


def load_block_markup(run_dir: Path) -> tuple[str, str]:
    """Return (markup_string, source_filename). Prefer extract.patched.json."""
    for fname in ("extract.patched.json", "extract.json"):
        p = run_dir / fname
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            markup = data.get("block_markup", "")
            if markup:
                return markup, fname
    return "", ""


def check_a_draft_class_containers(blocks: list[tuple[str, dict]]) -> list[dict]:
    """
    Rule (a): flag any block whose className carries a BEM element class.
    Returns list of violation dicts.
    """
    violations: list[dict] = []
    for slug, attrs in blocks:
        cn = attrs.get("className", "") or ""
        for cls in cn.split():
            if BEM_ELEMENT_RE.match(cls):
                violations.append({
                    "rule": "(a) draft-class container",
                    "block": slug,
                    "className": cn,
                    "violating_class": cls,
                    "detail": (
                        f"wp:{slug} carries BEM element class '{cls}' — "
                        f"this is a mirrored draft wrapper, not a converted block."
                    ),
                })
                break  # one violation per block occurrence is enough
    return violations


def check_b_bound_source_mode(blocks: list[tuple[str, dict]]) -> list[dict]:
    """
    Rule (b): flag any block with sourceMode='bound' that is NOT a legit live-data mode.
    Returns list of violation dicts.
    """
    violations: list[dict] = []
    for slug, attrs in blocks:
        sm = attrs.get("sourceMode")
        if sm is None:
            continue
        if sm in LEGIT_SOURCE_MODES:
            continue
        if sm == "bound":
            violations.append({
                "rule": "(b) bound sourceMode",
                "block": slug,
                "sourceMode": sm,
                "className": attrs.get("className", ""),
                "detail": (
                    f"wp:{slug} has sourceMode='bound' — "
                    f"this is the echo-$content converter cheat, not a native conversion."
                ),
            })
    return violations


def check_c_d2_stranded_layout(run_dir: Path) -> list[dict]:
    """
    Rule (c): best-effort detection of layout CSS stranded in D2.
    Only flags .sgs- selectors (not .container or utility classes).
    Returns list of warning dicts (never hard violations).
    """
    warnings: list[dict] = []
    css_path = run_dir / "variation-d0-d2.css"
    if not css_path.exists():
        return warnings

    css = css_path.read_text(encoding="utf-8")

    # Locate D2 section (everything after the D2 comment marker)
    d2_marker = css.find("D2 —")
    if d2_marker == -1:
        d2_marker = css.find("D2 -")
    d2_css = css[d2_marker:] if d2_marker >= 0 else css

    # Parse CSS rules: selector { declarations }
    # Handles simple (non-nested) rules; @media blocks are partially handled
    rule_re = re.compile(r"([.#][\w\s,.:>#~\[\]=*-]+?)\{([^{}]+)\}")
    seen: set[tuple[str, str]] = set()

    for m in rule_re.finditer(d2_css):
        selector = m.group(1).strip()
        body = m.group(2)

        # Only flag selectors that mention a .sgs- class (BEM-scoped)
        if ".sgs-" not in selector:
            continue

        for prop in D1_LAYOUT_PROPS:
            if re.search(rf"\b{re.escape(prop)}\s*:", body):
                key = (selector, prop)
                if key in seen:
                    continue
                seen.add(key)
                # Extract the specific declaration
                decl_m = re.search(rf"{re.escape(prop)}\s*:[^;]+", body)
                decl = decl_m.group().strip() if decl_m else prop
                warnings.append({
                    "rule": "(c) D2-stranded layout CSS",
                    "selector": selector,
                    "property": prop,
                    "declaration": decl[:120],
                    "detail": (
                        f"Layout property '{prop}' is stranded in D2 CSS "
                        f"under selector '{selector.strip()[:80]}' — "
                        f"should be lifted to a native block attribute (D1)."
                    ),
                })

    return warnings


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def _hr(char: str = "─", width: int = 72) -> str:
    return char * width


def print_report(
    run_dir: Path,
    markup_source: str,
    violations_a: list[dict],
    violations_b: list[dict],
    warnings_c: list[dict],
    enforce: bool,
) -> None:
    total_hard = len(violations_a) + len(violations_b)
    status_label = "FAIL" if total_hard else "PASS"
    mode_label = "--enforce" if enforce else "--report (informational)"

    print(_hr("═"))
    print(f"  R-22-15 Anti-Mirror Gate — {status_label}")
    print(f"  Run dir : {run_dir.name}")
    print(f"  Mode    : {mode_label}")
    print(f"  Source  : {markup_source or '(not found)'}")
    print(_hr("═"))

    # --- Rule (a) ---
    print(f"\nRule (a) Draft-class containers : {len(violations_a)} violation(s)")
    if violations_a:
        print(_hr())
        # De-duplicate by violating_class for summary
        by_class: dict[str, list[str]] = {}
        for v in violations_a:
            by_class.setdefault(v["violating_class"], []).append(v["block"])
        for cls, slugs in by_class.items():
            unique_slugs = sorted(set(slugs))
            count = len(slugs)
            print(f"  [{count}×] class='{cls}'  blocks={unique_slugs}")
        print(_hr())
        print("  Full list:")
        for i, v in enumerate(violations_a, 1):
            print(f"  {i:3}. {v['detail']}")

    # --- Rule (b) ---
    print(f"\nRule (b) Bound sourceMode       : {len(violations_b)} violation(s)")
    if violations_b:
        print(_hr())
        for i, v in enumerate(violations_b, 1):
            print(f"  {i:3}. {v['detail']}")

    # --- Rule (c) ---
    print(f"\nRule (c) D2-stranded layout CSS : {len(warnings_c)} warning(s) [soft, informational]")
    if warnings_c:
        print(_hr())
        # Summarise by property
        by_prop: dict[str, int] = {}
        for w in warnings_c:
            by_prop[w["property"]] = by_prop.get(w["property"], 0) + 1
        for prop, cnt in sorted(by_prop.items(), key=lambda x: -x[1]):
            print(f"  {cnt:3}× {prop}")
        print(_hr())
        print("  Sample (first 10):")
        for w in warnings_c[:10]:
            print(f"       [{w['property']}] {w['selector'].strip()[:70]}")
            print(f"              → {w['declaration'][:90]}")

    # --- Summary ---
    print()
    print(_hr("─"))
    print(f"  SUMMARY: {total_hard} hard violation(s)  |  {len(warnings_c)} warning(s)")
    print(f"  Hard violations = rule (a) + (b).  Warnings (c) never block.")
    if not total_hard:
        print("  RESULT: PASS — no mirror-cheat violations detected.")
    else:
        if enforce:
            print("  RESULT: FAIL — violations found. Fix the converter before committing.")
        else:
            print("  RESULT: FAIL (report mode — exits 0, informational only).")
            print("  Run with --enforce once the converter is clean to hard-gate commits.")
    print(_hr("─"))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="R-22-15 anti-mirror gate: detect when the converter cheated.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "run_dir",
        nargs="?",
        default=None,
        help="Path to a pipeline-state/<run> directory. "
             "Defaults to the most recent run.",
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--report",
        action="store_true",
        default=True,
        help="Informational mode (default): print violations, always exit 0.",
    )
    mode_group.add_argument(
        "--enforce",
        action="store_true",
        default=False,
        help="Enforce mode: exit non-zero on any (a)/(b) violation. "
             "Wire this into pipeline-stage-gate.py once the converter is clean.",
    )
    args = parser.parse_args(argv)

    enforce = args.enforce

    # Resolve run_dir
    if args.run_dir:
        run_dir = Path(args.run_dir)
        if not run_dir.is_dir():
            print(f"ERROR: run_dir not found: {run_dir}", file=sys.stderr)
            return 2
    else:
        run_dir = latest_run_dir(PIPELINE_STATE_DIR)
        if run_dir is None:
            print(
                f"ERROR: no pipeline-state runs found under {PIPELINE_STATE_DIR}",
                file=sys.stderr,
            )
            return 2

    # Load markup
    markup, markup_source = load_block_markup(run_dir)
    if not markup:
        print(
            f"ERROR: no block markup found in {run_dir} "
            f"(checked extract.patched.json + extract.json)",
            file=sys.stderr,
        )
        return 2

    # Parse blocks
    blocks = parse_block_markup(markup)

    # Run checks
    violations_a = check_a_draft_class_containers(blocks)
    violations_b = check_b_bound_source_mode(blocks)
    warnings_c = check_c_d2_stranded_layout(run_dir)

    # Print report
    print_report(
        run_dir=run_dir,
        markup_source=markup_source,
        violations_a=violations_a,
        violations_b=violations_b,
        warnings_c=warnings_c,
        enforce=enforce,
    )

    total_hard = len(violations_a) + len(violations_b)

    if enforce and total_hard:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
