#!/usr/bin/env python3
"""Single-instance invariant register — four named prohibitions, one shared mechanism.

WHY THIS EXISTS
---------------
`.claude/reports/2026-08-21-unenforced-prohibition-register.md` lists four rules that
each live only as a comment on ONE specific block, guarding ONE specific silent-failure
mode already measured live on this project. None of the four shares enough machinery with
the others (or with `check-ksort-before-hash.py` / `check-tier-object-cast.py`, which ARE
genuinely repo-wide scans) to justify forcing them into a shared abstraction — but all
four share the SAME shape: read one named source file, extract one named code fragment by
anchoring on its surrounding literal text, assert one property about that fragment. That
shared shape is what this file factors, as sub-checks A-D, matching the house pattern in
`check-fx-list-drift.py`'s I1-I7 invariants.

  A. mega-panel   — transitions restricted to `transform`/`opacity`, never `box-shadow`/
                     `filter` (measured frame-drop cause; comment at style.css:101).
  B. site-header  — the Transparent-behaviour SCROLLED-state background rule MUST carry
                     `!important` (root-caused incident P-TRANSPARENT-HEADER-SCROLLED-BG-
                     NOT-FLIPPING; comment at render.php:252-266).
  C. product-card — the value-ladder "Best value"/"Most popular" badge must carry NO
                     `data-wp-bind--hidden` / `data-wp-text` (would wipe the static SSR
                     text on hydration; comment at render.php:1122-1127).
  D. testimonial-slider — the scoped-style uid must never collide with the WP `anchor`
                     id (comment at render.php:107-111).

ANCHORING, NOT LINE NUMBERS
----------------------------
Every extraction anchors on literal surrounding text (a class name, a variable name, a
comment string) rather than a line number, so a reflow that keeps the code's MEANING
intact doesn't break the gate. If an anchor goes missing, the sub-check reports that
explicitly (`ANCHOR NOT FOUND — update this gate`) rather than silently passing — the
vacuous-parse trap `check-fx-list-drift.py`'s own docstring warns about.

GATE SHAPE
----------
- Default (no flag): observational report, exit 0.
- --check:     exit 1 on any violation OR any missing anchor (both are gate failures).
- --self-test: for EACH sub-check, corrupts a temp copy, asserts RED, restores, asserts
  GREEN. Reports which sub-check(s) passed their negative control.

Run: python plugins/sgs-blocks/scripts/check-single-instance-invariants.py --check
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
BLOCKS_DIR = PLUGIN_ROOT / "src" / "blocks"

MEGA_PANEL_STYLE = BLOCKS_DIR / "mega-panel" / "style.css"
SITE_HEADER_RENDER = BLOCKS_DIR / "site-header" / "render.php"
PRODUCT_CARD_RENDER = BLOCKS_DIR / "product-card" / "render.php"
TESTIMONIAL_SLIDER_RENDER = BLOCKS_DIR / "testimonial-slider" / "render.php"

TRANSITION_PROPERTY_ALLOWLIST = frozenset({"transform", "opacity", "none"})


# ---------------------------------------------------------------------------
# A. mega-panel — transition property allowlist
# ---------------------------------------------------------------------------

def _split_top_level_commas(value: str) -> list[str]:
    """Split a CSS value on commas that are NOT inside parens (e.g. cubic-bezier(...))."""
    parts, depth, current = [], 0, []
    for ch in value:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    parts.append("".join(current))
    return parts


def check_mega_panel_transitions(css_text: str | None = None) -> list[str]:
    if css_text is None:
        if not MEGA_PANEL_STYLE.exists():
            return [f"A. mega-panel — ANCHOR NOT FOUND — {MEGA_PANEL_STYLE} does not exist"]
        css_text = MEGA_PANEL_STYLE.read_text(encoding="utf-8")

    violations: list[str] = []
    for m in re.finditer(r"transition\s*:\s*([^;]+);", css_text, re.DOTALL):
        value = m.group(1)
        for segment in _split_top_level_commas(value):
            segment = segment.strip()
            if not segment:
                continue
            # NOTE: deliberately NOT `str.rstrip("!important")` — rstrip treats its
            # argument as a CHARACTER SET, not a substring, so it would strip any
            # trailing run of t/r/a/n/s/f/o/r/m/i/p/! chars and mangle "transform"
            # itself. re.sub anchors on the literal substring instead.
            prop = re.sub(r"!important$", "", segment.split()[0].strip()).strip()
            if prop.lower() not in TRANSITION_PROPERTY_ALLOWLIST:
                snippet = m.group(0).strip().replace("\n", " ")[:80]
                violations.append(
                    f"A. mega-panel — transition property '{prop}' is outside the "
                    f"transform/opacity/none allowlist: {snippet}"
                )
    return violations


# ---------------------------------------------------------------------------
# B. site-header — scrolled-background !important pin
# ---------------------------------------------------------------------------

_SH_INVERTED_ANCHOR = "'background:transparent !important;'"
_SH_SCROLLED_ANCHOR_PREFIX = "$sh_scrolled_decls .= 'background:' . ( '' !== $sh_scrolled_bg"


def check_site_header_important(php_text: str | None = None) -> list[str]:
    if php_text is None:
        if not SITE_HEADER_RENDER.exists():
            return [f"B. site-header — ANCHOR NOT FOUND — {SITE_HEADER_RENDER} does not exist"]
        php_text = SITE_HEADER_RENDER.read_text(encoding="utf-8")

    violations: list[str] = []

    # Sub-anchor 1: the inverted (solid-first) pair's literal transparent rule.
    if "'background:transparent !important;'" in php_text:
        pass
    elif "background:transparent" in php_text:
        violations.append(
            "B. site-header — the inverted-pair scrolled rule's "
            "'background:transparent' literal is missing '!important' "
            "(root-cause: P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING)"
        )
    else:
        violations.append(
            "B. site-header — ANCHOR NOT FOUND — the inverted-pair "
            "'background:transparent' literal was not found; update this gate"
        )

    # Sub-anchor 2: the else-branch scrolled-background concatenation.
    idx = php_text.find(_SH_SCROLLED_ANCHOR_PREFIX)
    if idx == -1:
        violations.append(
            "B. site-header — ANCHOR NOT FOUND — the "
            "'$sh_scrolled_decls .= ...background...' anchor was not found; "
            "update this gate"
        )
    else:
        # The statement runs until the next top-level `;` after the anchor.
        end = php_text.find(";", idx)
        statement = php_text[idx : end + 1] if end != -1 else php_text[idx : idx + 300]
        if "!important" not in statement:
            violations.append(
                "B. site-header — the scrolled-state background statement is missing "
                "'!important' (root-cause: P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING): "
                + statement.strip().replace("\n", " ")[:120]
            )

    return violations


# ---------------------------------------------------------------------------
# C. product-card — value-ladder badge must carry no data-wp-* directives
# ---------------------------------------------------------------------------

# Anchors on the SPAN's own class attribute, not the bare CSS-class-name string —
# 'product-card__best-value-badge' alone also appears earlier in the file inside a
# CSS selector string ($sgs_card_typo_css), and matching that occurrence first would
# silently inspect the wrong element. This literal is unique to the span markup.
_PC_BADGE_MARKER = 'class="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge"'
_PC_FORBIDDEN_DIRECTIVES = ("data-wp-bind--hidden", "data-wp-text")


def check_product_card_badge(php_text: str | None = None) -> list[str]:
    if php_text is None:
        if not PRODUCT_CARD_RENDER.exists():
            return [f"C. product-card — ANCHOR NOT FOUND — {PRODUCT_CARD_RENDER} does not exist"]
        php_text = PRODUCT_CARD_RENDER.read_text(encoding="utf-8")

    marker_idx = php_text.find(_PC_BADGE_MARKER)
    if marker_idx == -1:
        return [
            "C. product-card — ANCHOR NOT FOUND — "
            f"'{_PC_BADGE_MARKER}' was not found; update this gate"
        ]

    span_start = php_text.rfind("<span", 0, marker_idx)
    span_end = php_text.find("</span>", marker_idx)
    if span_start == -1 or span_end == -1:
        return [
            "C. product-card — ANCHOR NOT FOUND — could not locate the enclosing "
            "<span>...</span> around the value-ladder badge marker; update this gate"
        ]

    span_block = php_text[span_start : span_end + len("</span>")]
    violations: list[str] = []
    for directive in _PC_FORBIDDEN_DIRECTIVES:
        if directive in span_block:
            violations.append(
                f"C. product-card — the value-ladder badge span carries forbidden "
                f"directive '{directive}' — this wipes the static SSR text on "
                f"hydration (memory: wp-interactivity-directives-wipe-ssr-when-"
                f"bound-to-js-getters)"
            )
    return violations


# ---------------------------------------------------------------------------
# D. testimonial-slider — scoped uid must never collide with the anchor id
# ---------------------------------------------------------------------------

_TS_UID_PREFIX = "'sgs-testimonial-slider-'"


def check_testimonial_slider_uid(php_text: str | None = None) -> list[str]:
    if php_text is None:
        if not TESTIMONIAL_SLIDER_RENDER.exists():
            return [
                "D. testimonial-slider — ANCHOR NOT FOUND — "
                f"{TESTIMONIAL_SLIDER_RENDER} does not exist"
            ]
        php_text = TESTIMONIAL_SLIDER_RENDER.read_text(encoding="utf-8")

    m = re.search(r"^\s*\$uid\s*=.*?;", php_text, re.MULTILINE)
    if not m:
        return [
            "D. testimonial-slider — ANCHOR NOT FOUND — no '$uid = ...;' "
            "assignment found; update this gate"
        ]
    statement = m.group(0)

    violations: list[str] = []
    if _TS_UID_PREFIX not in statement:
        violations.append(
            "D. testimonial-slider — '$uid' is no longer built from the literal "
            f"prefix {_TS_UID_PREFIX} — a uid derived straight from the anchor "
            "value (or any other unprefixed source) can collide with the WP "
            f"`anchor` id: {statement.strip()}"
        )
    if "md5(" not in statement:
        violations.append(
            "D. testimonial-slider — '$uid' is no longer content-addressed via "
            f"md5(): {statement.strip()}"
        )
    return violations


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

SUB_CHECKS = (
    ("A", check_mega_panel_transitions),
    ("B", check_site_header_important),
    ("C", check_product_card_badge),
    ("D", check_testimonial_slider_uid),
)


def run_scan() -> list[str]:
    violations: list[str] = []
    for _, fn in SUB_CHECKS:
        violations.extend(fn())
    return violations


def _self_test_a() -> bool:
    original = MEGA_PANEL_STYLE.read_text(encoding="utf-8")
    if check_mega_panel_transitions(original):
        print("[single-instance-invariants A --self-test] FAIL — clean tree already flags.")
        return False
    corrupted = original.replace(
        "transition: transform 0.2s ease;",
        "transition: transform 0.2s ease, box-shadow 0.2s ease;",
        1,
    )
    if corrupted == original:
        print("[single-instance-invariants A --self-test] FAIL — anchor not found for corruption.")
        return False
    corrupted_violations = check_mega_panel_transitions(corrupted)
    if not corrupted_violations:
        print("[single-instance-invariants A --self-test] FAIL — injected box-shadow transition not reported.")
        return False
    print("[single-instance-invariants A --self-test] positive control reported — " + corrupted_violations[0])
    if check_mega_panel_transitions(original):
        print("[single-instance-invariants A --self-test] FAIL — restored text still flags.")
        return False
    print("[single-instance-invariants A --self-test] PASS")
    return True


def _self_test_b() -> bool:
    original = SITE_HEADER_RENDER.read_text(encoding="utf-8")
    if check_site_header_important(original):
        print("[single-instance-invariants B --self-test] FAIL — clean tree already flags.")
        return False
    corrupted = original.replace(
        "'background:transparent !important;'",
        "'background:transparent;'",
        1,
    )
    if corrupted == original:
        print("[single-instance-invariants B --self-test] FAIL — anchor not found for corruption.")
        return False
    corrupted_violations = check_site_header_important(corrupted)
    if not corrupted_violations:
        print("[single-instance-invariants B --self-test] FAIL — dropped !important not reported.")
        return False
    print("[single-instance-invariants B --self-test] positive control reported — " + corrupted_violations[0])
    if check_site_header_important(original):
        print("[single-instance-invariants B --self-test] FAIL — restored text still flags.")
        return False
    print("[single-instance-invariants B --self-test] PASS")
    return True


def _self_test_c() -> bool:
    original = PRODUCT_CARD_RENDER.read_text(encoding="utf-8")
    if check_product_card_badge(original):
        print("[single-instance-invariants C --self-test] FAIL — clean tree already flags.")
        return False
    anchor = 'class="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge"'
    if anchor not in original:
        print("[single-instance-invariants C --self-test] FAIL — anchor not found for corruption.")
        return False
    corrupted = original.replace(
        anchor,
        anchor + '\n\t\t\t\t\t\t\tdata-wp-text="context.badgeText"',
        1,
    )
    corrupted_violations = check_product_card_badge(corrupted)
    if not corrupted_violations:
        print("[single-instance-invariants C --self-test] FAIL — injected data-wp-text not reported.")
        return False
    print("[single-instance-invariants C --self-test] positive control reported — " + corrupted_violations[0])
    if check_product_card_badge(original):
        print("[single-instance-invariants C --self-test] FAIL — restored text still flags.")
        return False
    print("[single-instance-invariants C --self-test] PASS")
    return True


def _self_test_d() -> bool:
    original = TESTIMONIAL_SLIDER_RENDER.read_text(encoding="utf-8")
    if check_testimonial_slider_uid(original):
        print("[single-instance-invariants D --self-test] FAIL — clean tree already flags.")
        return False
    m = re.search(r"^\s*\$uid\s*=.*?;", original, re.MULTILINE)
    if not m:
        print("[single-instance-invariants D --self-test] FAIL — anchor not found for corruption.")
        return False
    corrupted = original.replace(
        m.group(0),
        "$uid      = $block->parsed_block['attrs']['anchor'] ?? '';",
        1,
    )
    corrupted_violations = check_testimonial_slider_uid(corrupted)
    if not corrupted_violations:
        print("[single-instance-invariants D --self-test] FAIL — anchor-derived uid not reported.")
        return False
    print("[single-instance-invariants D --self-test] positive control reported — " + corrupted_violations[0])
    if check_testimonial_slider_uid(original):
        print("[single-instance-invariants D --self-test] FAIL — restored text still flags.")
        return False
    print("[single-instance-invariants D --self-test] PASS")
    return True


def self_test() -> bool:
    results = [
        _self_test_a(),
        _self_test_b(),
        _self_test_c(),
        _self_test_d(),
    ]
    ok = all(results)
    if ok:
        print("[single-instance-invariants --self-test] PASS — all 4 sub-checks go red for their own defect and green again on restore.")
    else:
        print("[single-instance-invariants --self-test] FAIL — see above.")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description="Single-instance invariant register (A-D).")
    parser.add_argument("--check", action="store_true", help="exit 1 on any violation")
    parser.add_argument("--self-test", action="store_true", help="prove each sub-check can fail")
    args = parser.parse_args()

    if args.self_test:
        return 0 if self_test() else 1

    violations = run_scan()
    if violations:
        print(f"[single-instance-invariants] {len(violations)} violation(s):")
        for v in violations:
            print("  " + v)
    else:
        print("[single-instance-invariants] 0 violations across sub-checks A-D.")

    if args.check:
        return 1 if violations else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
