#!/usr/bin/env python3
"""Anti-regression GATE for the framework-wide inline-zero win (Spec 32 FR-32-1 /
FR-32-4 as amended D345; rollout completed D346, 2026-07-18).

WHAT IT GUARDS
--------------
Every `sgs/*` block must render with NO inline `style` attribute — neither a
custom-property VALUE (`style="--sgs-…:…"`) nor an empty `style=""`. The rollout
that achieved this (D346) can silently erode if a future block edit re-inlines a
value, so this gate fails the build the moment an inline style reappears on a
canary page.

WHY THIS GATE IS LIVE-DRIVEN, NOT STATIC
----------------------------------------
The inline `--var` / empty `style=""` defect is produced at WordPress RENDER
time (`get_block_wrapper_attributes()` + supports serialisation), not written
literally into source. A static source scan cannot separate a real violation
from correct code: the literal shapes `style="--"` / `style=""` appear inside
PHP doc-comments and inside strings that BUILD scoped `<style>` rules — even in
`brand-strip`, the proven zero-inline reference block. A static gate keyed on
those shapes false-flags the reference implementation (verified 2026-07-18).
The authoritative signal is the rendered DOM. This mirrors the sibling static
detector `detect.py` (worklist generator); this file is its enforcing gate.

The complementary `audit-inline-styling.js --check` gate is NOT redundant with
this one: it is a static scan that catches inline REAL CSS PROPERTY declarations
(`color:…`) and deliberately PERMITS `--var` values (the pre-D345 contract).
This gate catches the post-D345 defect class it permits — inline `--var` values
and empty `style=""` — by reading the rendered DOM. Two different signals, two
different defect classes.

DEGRADE-SAFE (build never breaks on a network blip)
---------------------------------------------------
  * canary reachable + inline style found  -> FAIL (exit 1), names the block(s)
  * canary reachable + clean               -> PASS (exit 0)
  * canary UNREACHABLE (all URLs)          -> WARN + PASS (exit 0) — a network
                                              outage must not break the build;
                                              only a *detected* regression fails
  * some URLs reachable, some not          -> gate on the reachable ones

The `sgsCustomCss` residual (Spec 31 FR-31-5.2) is a scoped `<style>` RULE, not
an inline attribute, so it is structurally invisible to this gate (the scanner
only inspects element opening-tags carrying a `wp-block-sgs-*` class) and never
false-positives.

COVERAGE LIMIT (logged, never silent)
-------------------------------------
A live gate can only verify blocks that actually RENDER on a scanned page.
Blocks absent from every canary page are reported as unverified — not silently
passed. Add more canary URLs to widen coverage.

Usage
-----
  python check-no-inline.py                     # scan the built-in canary set
  python check-no-inline.py --live-default      # explicit alias of the above
  python check-no-inline.py --live URL [URL...] # scan explicit URL(s)
  python check-no-inline.py --selftest          # deterministic detector proof
                                                # (no network) — inject/remove
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Reuse the detector's validated regexes + fetch so the gate and the worklist
# agree on exactly what "an inline style on an sgs block" means.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import detect  # noqa: E402

# UTF-8 output so the em-dashes in gate messages don't mojibake in the Windows
# build console (per ~/.claude/rules/windows-python.md).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# The canary pages verified zero-inline at D346 (both live client homepages).
CANARY_URLS = [
    "https://palestine-lives.org/",                             # Indus (page 13 front)
    "https://sandybrown-nightingale-600381.hostingersite.com/", # Mama's (staging canary)
]


def scan_html(html: str) -> dict[str, dict]:
    """Map every inline `style="--…"` / `style=""` occurrence to its owning
    `wp-block-sgs-<block>` element. Only element opening-tags carrying a
    `wp-block-sgs-*` class are inspected, so scoped `<style>` rules and the
    `sgsCustomCss` residual are structurally excluded. Returns
    {block_slug: {"style_var": n, "style_empty": n}}."""
    per_block: dict[str, dict] = {}
    for tag in detect.TAG_RE.finditer(html):
        t = tag.group(0)
        cls = detect.BLOCK_CLASS_RE.search(t)
        if not cls:
            continue
        slug = cls.group(1)
        row = per_block.setdefault(slug, {"style_var": 0, "style_empty": 0})
        if detect.INLINE_VAR_RE.search(t):
            row["style_var"] += 1
        elif detect.INLINE_EMPTY_RE.search(t):
            row["style_empty"] += 1
    return per_block


def run_live(urls: list[str]) -> int:
    """Fetch each URL, scan, and gate. Degrade-safe: unreachable != fail."""
    reachable = 0
    violations: list[str] = []
    seen_blocks: set[str] = set()

    for url in urls:
        try:
            html = detect.fetch(url)
        except Exception as exc:  # network blip / site down -> warn, do not fail
            print(f"  [check-no-inline] WARN: could not fetch {url}: {exc}")
            continue
        reachable += 1
        per_block = scan_html(html)
        for slug, counts in per_block.items():
            seen_blocks.add(slug)
            if counts["style_var"]:
                violations.append(
                    f'sgs/{slug}  style="--…"  x{counts["style_var"]}  ({url})'
                )
            if counts["style_empty"]:
                violations.append(
                    f'sgs/{slug}  empty style=""  x{counts["style_empty"]}  ({url})'
                )

    if reachable == 0:
        # Every canary unreachable — a network problem, not a code regression.
        print(
            "[check-no-inline] WARN: no canary URL reachable — inline-zero NOT "
            "verified this build (degrade-safe PASS). Re-run when the canary is up."
        )
        return 0

    if violations:
        print(
            f"\n[check-no-inline] FAIL — {len(violations)} inline-style "
            f"regression(s) on {reachable} canary page(s):"
        )
        for v in violations:
            print(f"  X  {v}")
        print(
            "\nEvery sgs/* block must render ZERO inline style attributes "
            "(Spec 32 FR-32-1/FR-32-4, D345/D346). Route the per-instance value\n"
            "to a scoped `.{uid}.{block}{ --var:… }` rule via the SGS CSS "
            "collector (FR-32-11) — never an inline style= attribute.\n"
            "Diagnose with: python scripts/no-inline/detect.py --live-default"
        )
        return 1

    print(
        f"[check-no-inline] PASS — 0 inline styles across {len(seen_blocks)} "
        f"sgs block type(s) on {reachable} canary page(s)."
    )
    if seen_blocks:
        print(f"  verified blocks: {', '.join(sorted(seen_blocks))}")
    print(
        "  NOTE (coverage): blocks absent from the canary page(s) are NOT "
        "verified by this run — widen CANARY_URLS to cover more blocks."
    )
    return 0


def run_selftest() -> int:
    """Deterministic, network-free proof the detector fires on an injected inline
    style and clears when removed — the acceptance test for this gate."""
    inject = (
        '<div class="wp-block-sgs-button sgs-button" style="--sgs-button-background:#111">x</div>'
    )
    inject_empty = '<p class="wp-block-sgs-text" style="">y</p>'
    clean = (
        '<div class="wp-block-sgs-button sgs-button">x</div>'
        '<style>.sgs-abc.wp-block-sgs-quote{--sgs-quote-colour:#111}</style>'
        '<p class="wp-block-sgs-text">y</p>'
    )

    ok = True

    hit = scan_html(inject)
    if hit.get("button", {}).get("style_var", 0) != 1:
        print("  X selftest: injected style=\"--\" NOT detected"); ok = False
    else:
        print("  ok: injected style=\"--var\" detected on sgs/button")

    hit = scan_html(inject_empty)
    if hit.get("text", {}).get("style_empty", 0) != 1:
        print("  X selftest: injected empty style=\"\" NOT detected"); ok = False
    else:
        print("  ok: injected empty style=\"\" detected on sgs/text")

    hit = scan_html(clean)
    dirty = any(c["style_var"] or c["style_empty"] for c in hit.values())
    if dirty:
        print(f"  X selftest: clean markup (incl. scoped <style> + sgsCustomCss) false-flagged: {hit}"); ok = False
    else:
        print("  ok: clean markup + scoped <style> rule NOT flagged (sgsCustomCss safe)")

    if ok:
        print("\n[check-no-inline --selftest] PASS — detector fires on inject, clears on remove.")
        return 0
    print("\n[check-no-inline --selftest] FAIL")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Inline-zero anti-regression gate (Spec 32).")
    ap.add_argument("--live", nargs="*", metavar="URL", help="explicit canary URL(s)")
    ap.add_argument("--live-default", action="store_true", help="use the built-in canary set (default)")
    ap.add_argument("--selftest", action="store_true", help="network-free detector proof")
    args = ap.parse_args()

    if args.selftest:
        return run_selftest()

    urls = args.live if args.live else list(CANARY_URLS)
    return run_live(urls)


if __name__ == "__main__":
    raise SystemExit(main())
