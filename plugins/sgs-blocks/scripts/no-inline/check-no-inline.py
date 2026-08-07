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
import re
import sys
from html.parser import HTMLParser
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

# The canary pages verified zero-inline at D346 (both client homepages) PLUS the two
# seeded gate-canary pages added 2026-07-30.
#
# WHY THE SEEDED PAGES ARE LOAD-BEARING (P-NO-INLINE-GATE-COVERAGE-GAPS item 1):
# with the two homepages alone this gate reported
#   "PASS - 0 inline styles across 0 sgs block type(s)"
# i.e. it found NO sgs blocks to inspect and passed vacuously. A gate that cannot
# see a violation cannot fail, and this one had been reading green on that basis.
# The seeded pages carry one instance of each var-driven feature (per-item stagger
# and fill, SVG background opacity, shape dividers, post-grid card vars, countdown
# colours, gallery aspect, form progress, review breakdown, plan ribbon, badge fg),
# so the gate has real subjects.
#
# UPDATED 2026-08-07: pages 2064 + 2071 were DELETED on Bean's instruction
# (enforcement moves to Spec 35 scripts). They are replaced here by page 2164,
# /spec32-guard-capture-canary/, which renders 10 sgs blocks with real text.
# THE HAZARD IS UNCHANGED AND IS THE POINT OF THIS COMMENT: if a listed page
# 404s or is emptied, this gate sees zero blocks and passes VACUOUSLY. It does
# not distinguish 'clean' from 'saw nothing'. Either re-seed, or make the gate
# fail when a canary URL yields zero sgs blocks - do not simply drop the URL.
CANARY_URLS = [
    "https://palestine-lives.org/",                                            # Indus (page 13 front)
    "https://sandybrown-nightingale-600381.hostingersite.com/",                # Mama's (staging canary)
    "https://sandybrown-nightingale-600381.hostingersite.com/spec32-guard-capture-canary/",  # seeded 2026-08-07, page 2164
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


def scan_html_deep(html: str) -> dict[str, dict]:
    """DEEP (nesting-aware) variant of :func:`scan_html` — opt-in via ``--deep``.

    WHY THIS EXISTS. :func:`scan_html` inspects ONLY element opening-tags that
    themselves carry a ``wp-block-sgs-*`` class, i.e. the block ROOT. FR-32-1
    requires ZERO ``style=`` on the block's *rendered elements* — plural — so a
    per-instance ``--var`` written onto a BEM SUB-element (``.sgs-gallery__item``,
    ``.sgs-card-grid__item``) is invisible to the root-only scan. Measured
    2026-07-30: 7 blocks / 8 sites were emitting exactly that, and the gate had
    reported PASS throughout.

    WHY IT IS NOT A NAIVE "ANY DESCENDANT" SCAN. Attributing every styled
    descendant to its nearest SGS ancestor produces FALSE POSITIVES: a CORE
    block nested inside an SGS block (``core/heading`` inside
    ``sgs/site-footer-row``) carries WP core's OWN inline serialisation of its
    native supports, which FR-32-1 does not govern. Measured on the
    palestine-lives canary: a naive scan flagged 4 such core-block elements;
    the core-aware rule below flags 0. So the ownership rule is: attribute an
    element to the nearest enclosing block root of ANY kind, and flag ONLY when
    that root is an SGS one — a core root SHADOWS its SGS ancestor.

    STATUS: opt-in (``--deep``) rather than default, deliberately. The live
    canaries are the DEPLOYED pages; source fixes only show up here after a
    deploy. Flipping this default-on before that deploy would fail the build on
    already-fixed code and block a co-active track. Promote it to the default
    once a deploy has proven it green (the same "prove the break lands, then
    arm" sequencing the rest of this gate uses).
    """
    void = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr",
    }
    any_block = re.compile(r"wp-block-([a-z0-9-]+)")
    sgs_block = re.compile(r"wp-block-sgs-([a-z0-9-]+)")
    per_block: dict[str, dict] = {}

    class _Scanner(HTMLParser):
        def __init__(self) -> None:
            super().__init__(convert_charrefs=True)
            self.stack: list[tuple[str, str | None]] = []

        def handle_starttag(self, tag, attrs):  # noqa: D102
            attr = dict(attrs)
            cls = attr.get("class") or ""
            sgs_hit = sgs_block.search(cls)
            if sgs_hit:
                owner: str | None = sgs_hit.group(1)
                # COVERAGE (2026-08-07): record every SGS block root we SEE,
                # even when it carries no style attribute. Without this,
                # per_block held only blocks WITH inline styles, so a clean run
                # printed "0 sgs block type(s)" — byte-identical to the vacuous
                # -pass signature this file's own header warns about, making a
                # CLEAN scan indistinguishable from a BLIND one. Zero-count rows
                # never create violations (run_live only reports non-zero counts),
                # they just make the coverage number truthful.
                per_block.setdefault(owner, {"style_var": 0, "style_empty": 0})
            elif any_block.search(cls):
                owner = None  # a CORE block root shadows any SGS ancestor
            else:
                owner = self.stack[-1][1] if self.stack else None

            style = attr.get("style")
            if owner and style is not None:
                row = per_block.setdefault(
                    owner, {"style_var": 0, "style_empty": 0}
                )
                if style.strip() == "":
                    row["style_empty"] += 1
                elif "--" in style:
                    row["style_var"] += 1

            if tag not in void:
                self.stack.append((tag, owner))

        def handle_startendtag(self, tag, attrs):  # noqa: D102
            self.handle_starttag(tag, attrs)

        def handle_endtag(self, tag):  # noqa: D102
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i][0] == tag:
                    del self.stack[i:]
                    return

    _Scanner().feed(html)
    return per_block


def run_live(urls: list[str], deep: bool = False) -> int:
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
        per_block = scan_html_deep(html) if deep else scan_html(html)
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

    # ---- DEEP scanner (--deep) -------------------------------------------
    # Four proofs: it CATCHES what the root-only scan structurally cannot,
    # the root-only scan genuinely MISSES it (so --deep is load-bearing, not
    # decorative), a nested CORE block is NOT false-flagged, and clean markup
    # stays clean.
    sub_element = (
        '<div class="wp-block-sgs-gallery sgs-gallery">'
        '<figure class="sgs-gallery__item" style="--sgs-item-index:2">z</figure>'
        "</div>"
    )
    hit = scan_html_deep(sub_element)
    if hit.get("gallery", {}).get("style_var", 0) != 1:
        print("  X selftest[deep]: sub-element style=\"--\" NOT detected"); ok = False
    else:
        print("  ok[deep]: sub-element style=\"--var\" detected on sgs/gallery")

    # Negative control for the ROOT-ONLY scan: it must MISS the same input.
    # If this ever starts passing, --deep has become redundant — say so loudly
    # rather than keeping a flag that no longer buys anything.
    shallow = scan_html(sub_element)
    if shallow.get("gallery", {}).get("style_var", 0) != 0:
        print("  X selftest[deep]: root-only scan unexpectedly caught the sub-element "
              "— --deep may now be redundant; re-check before trusting this flag"); ok = False
    else:
        print("  ok[deep]: root-only scan MISSES it (proves --deep is load-bearing)")

    # A CORE block nested in an SGS block owns its own inline styling — WP core
    # serialises native supports inline and FR-32-1 does not govern it. Measured
    # live: a naive nearest-SGS-ancestor rule false-flagged 4 of these.
    nested_core = (
        '<div class="wp-block-sgs-site-footer-row sgs-site-footer-row">'
        '<h2 class="wp-block-heading" style="margin-bottom:var(--wp--preset--spacing--20)">t</h2>'
        "</div>"
    )
    hit = scan_html_deep(nested_core)
    if any(c["style_var"] or c["style_empty"] for c in hit.values()):
        print(f"  X selftest[deep]: nested CORE block false-flagged: {hit}"); ok = False
    else:
        print("  ok[deep]: nested core/heading NOT flagged (core root shadows SGS ancestor)")

    hit = scan_html_deep(clean)
    if any(c["style_var"] or c["style_empty"] for c in hit.values()):
        print(f"  X selftest[deep]: clean markup false-flagged: {hit}"); ok = False
    else:
        print("  ok[deep]: clean markup NOT flagged")

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
    ap.add_argument(
        "--no-deep",
        action="store_true",
        help=(
            "DISABLE the nesting-aware scan (root-only, the pre-2026-07-30 "
            "behaviour). The deep scan is the DEFAULT: FR-32-1 governs every "
            "rendered element, not just the block root, and the root-only scan "
            "structurally cannot see a per-instance --var on a BEM sub-element. "
            "Only pass this to reproduce a historical root-only result."
        ),
    )
    ap.add_argument(
        "--deep",
        action="store_true",
        help="No-op, retained for compatibility — the deep scan is now the default.",
    )
    args = ap.parse_args()

    if args.selftest:
        return run_selftest()

    urls = args.live if args.live else list(CANARY_URLS)
    # PROMOTED TO DEFAULT 2026-07-30. The three preconditions scan_html_deep()'s
    # docstring set for arming it are met: (1) the FR-32 source fixes are DEPLOYED,
    # so the live canaries carry the fixed markup; (2) this scan is GREEN against
    # that fresh deploy; (3) `--selftest` proves it can still FAIL — it detects an
    # injected sub-element violation that the root-only scan demonstrably MISSES.
    # That third point is the load-bearing one: a gate that has never failed is not
    # known to work.
    return run_live(urls, deep=not args.no_deep)


if __name__ == "__main__":
    raise SystemExit(main())
