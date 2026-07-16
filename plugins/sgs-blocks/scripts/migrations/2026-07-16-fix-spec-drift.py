"""One-shot: repair the Spec 17 drift a 7-persona adversarial council found (2026-07-16).

Every edit below is anchored on EXACT source text and ASSERTS the anchor is present —
a missed anchor raises, it never silently no-ops (the silent-no-op is precisely the
failure class this whole exercise is about). Idempotent: re-running detects already-
applied edits and skips them.

Findings repaired (convergence count = how many of 7 personas independently flagged it):

  FIX-1 (4/7 — the strongest convergence in the run) — the D339 "⛔ CORRECTED" note,
        written *because* the previous line was "false in fact and actively harmful",
        is ITSELF wrong: it says "87 of 95 attrs are FLAT" while its own cited
        breakdown sums to 78 (0+0+5+6+6=17 object; 95-17=78). Verified against the 5
        live block.json files. Worse, FR-S9-6 is HALF-BUILT — 17 attrs already carry
        the {desktop,tablet,mobile} object model and the emitter `sgs_emit_responsive_css`
        exists and is cited BY NAME in site-header-row/render.php:160 — so the line
        steers the next session into building a THIRD parallel responsive mechanism.

  FIX-2 (2/7) — Spec 17's opening paragraph claims 4 Customiser/Renderer classes
        "shipped" at commit 60220b13. `grep -rl "class Sgs_Header_Customiser"` over
        plugins/ + theme/ returns NOTHING. All four are fiction; commit 87dd869d
        ("retire plugin-side Customiser path") removed them and nobody swept the doc.
        It is the FIRST prose a fresh agent reads.

  FIX-3 (3/7) — FR-S9-5's title + FR-S9-4/S9-8's references describe `sgs/mobile-nav`
        as live. It was DELETED at D336 (`src/blocks/mobile-nav/` absent; the drawer
        was absorbed into `sgs/adaptive-nav`). The GOV.UK-grade a11y contract — the
        single most valuable prose in Spec 17 and the stated differentiator — is
        currently orphaned onto a deleted block. It is RE-HOMED, never dropped.

  FIX-4 (3/7) — §S8 presents FR-S8-1/S8-2 as live buildable spec for 445 lines before
        its own retirement notice at line 1057. The retraction is moved to the point
        of the claim.

Run:  python 2026-07-16-fix-spec-drift.py [--dry-run]
Then: python ../lints/lint-spec-drift.py --spec 17-HEADER
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SPEC = Path(__file__).resolve().parents[4] / ".claude" / "specs" / "17-HEADER-FOOTER-ARCHITECTURE.md"

# ---------------------------------------------------------------- FIX-1
OLD_87 = '**87 of 95 attrs across the 5 §S9 blocks are FLAT** (site-header 0/26 object, site-footer 0/22, site-header-row 5/10, site-footer-row 6/11, adaptive-nav 6/26)'
NEW_78 = (
    '**78 of 95 attrs across the 5 §S9 blocks are FLAT; 17 already carry the object '
    'tier model** (site-header 0/26 object, site-footer 0/22, site-header-row 5/10, '
    'site-footer-row 6/11, adaptive-nav 6/26 — 0+0+5+6+6 = 17 object, 95-17 = 78 flat). '
    '**⚠ ARITHMETIC CORRECTED 2026-07-16 (adversarial-council, 4/7 personas '
    'independently): this note previously read "87 of 95", contradicting its own cited '
    'breakdown. The breakdown was right; the headline was wrong.** '
    '**FR-S9-6 is therefore HALF-BUILT, not unbuilt:** the `{desktop,tablet,mobile}` '
    'object model + the shared emitter `sgs_emit_responsive_css` '
    '(`includes/helpers-responsive.php`) + the shared breakpoint source are LIVE on '
    'those 17 attrs across `site-header-row`/`site-footer-row`/`adaptive-nav` — '
    '`src/blocks/site-header-row/render.php:160` cites the FR by name. Remaining scope '
    '= the 78 flat attrs on `site-header`/`site-footer` + the editor device switcher '
    '(genuinely unbuilt). **Extend the 17 tiered attrs IN PLACE; the sibling-attr rule '
    'in the Guardrail applies ONLY to attrs not already tiered.** Do not build a third '
    'mechanism alongside the two that exist'
)

# ---------------------------------------------------------------- FIX-2
OLD_CUST = '> 1. **Customiser sibling surfaces shipped (Phase 5b, commit `60220b13` + paint-fix `0ef032fe`, Decisions 22+23).**'
NEW_CUST = (
    '> 1. **⛔ RETRACTED 2026-07-16 (adversarial-council) — THIS CLAIM IS FICTION. '
    'DO NOT BUILD ON IT.** This item claimed `Sgs_Header_Customiser`, '
    '`Sgs_Footer_Customiser`, `Sgs_Header_Renderer` and `Sgs_Footer_Renderer` shipped '
    'at commit `60220b13`. **None of those four classes exist anywhere in `plugins/` or '
    '`theme/`** (verified 2026-07-16 by grep + the `lint-spec-drift.py` PHP-CLASS gate; '
    'commit `87dd869d` "retire plugin-side Customiser path" removed them and this '
    'paragraph was never swept). Only `Sgs_Site_Info_Customiser` and '
    '`Sgs_Floating_UI_Customiser` are real. There is NO header/footer Customiser '
    'styling surface. Header/footer behaviour lives on `sgs/site-header` block attrs '
    '(FR-S9-9, D330). This was the FIRST prose in the spec, so a fresh agent read it '
    'first and believed it. Original text retained below, struck, for audit only:\n'
    '>\n'
    '> ~~Customiser sibling surfaces shipped (Phase 5b, commit `60220b13` + paint-fix '
    '`0ef032fe`, Decisions 22+23).~~'
)

# ---------------------------------------------------------------- FIX-3
OLD_S95_TITLE = '### FR-S9-5 — `sgs/mobile-nav` off-canvas drawer rework: P0 unclickable-drawer bug fix (SHIPPED) + GOV.UK-grade a11y contract'
NEW_S95_TITLE = (
    '### FR-S9-5 — the off-canvas drawer a11y contract (now owned by `sgs/adaptive-nav`)\n'
    '\n'
    '> **⛔ RE-HOMED 2026-07-16 (adversarial-council, 3/7 personas independently).** '
    'This FR was written against **`sgs/mobile-nav`, which was DELETED at D336** '
    '(`src/blocks/mobile-nav/` does not exist; the drawer was absorbed into '
    '`sgs/adaptive-nav`, which owns its own burger toggle + drawer). Every requirement '
    'below now binds **`sgs/adaptive-nav`\'s built-in drawer** — read every '
    '`sgs/mobile-nav` in this FR as that. The a11y contract itself is UNCHANGED and '
    'carried forward verbatim: it is the most valuable prose in this spec and the '
    'stated differentiator (commercial builders under-document this), so it is re-homed, '
    'never dropped. The regression baseline stands: the `elementFromPoint` sweep, '
    '18/18 Indus + 10/10 Mama\'s (measured 2026-07-14). **A stale `build/blocks/mobile-nav/` '
    'may still register the deleted block on deployed servers — see the GHOST-BUILD '
    'finding in `lint-spec-drift.py`; that is a build-hygiene bug, not evidence the '
    'block is live.** Superseded title, for audit: ~~"`sgs/mobile-nav` off-canvas drawer '
    'rework: P0 unclickable-drawer bug fix (SHIPPED) + GOV.UK-grade a11y contract"~~.'
)

OLD_S94_OPENS = '- Opens `sgs/mobile-nav` (FR-S9-5) at the collapsed tier; passes through the a11y contract (focus trap, ESC, `aria-expanded`) end to end'
NEW_S94_OPENS = '- Opens its OWN built-in drawer at the collapsed tier (the drawer absorbed from the deleted `sgs/mobile-nav` at D336 — FR-S9-5 holds the a11y contract); passes through that contract (focus trap, ESC, `aria-expanded`) end to end'

# ---------------------------------------------------------------- FIX-4
S8_TOMBSTONE = (
    '## §S8 — Two-Axis Style Variations (⛔ RETIRED 2026-05-21 — DEAD SPEC, DO NOT BUILD)\n'
    '\n'
    '> **RETIRED.** The WP style-variation system this section specified was DELETED '
    '(Decision 18/19; see `.claude/plans/2026-05-21-architecture-staging.md` §6.4). '
    'Per-client branding now lives at `sites/<client>/theme-snapshot.json`, generated by '
    'the **Spec 33** extractor and deployed via `push-theme-snapshot.py`. There are no '
    '`styles/colours/` or `styles/typography/` directories.\n'
    '>\n'
    '> **Retraction moved here 2026-07-16 (adversarial-council, 3/7 personas).** The '
    'full FR-S8-1/FR-S8-2 bodies previously sat HERE — complete with Behaviour, '
    'Acceptance criteria, "44/44 tests PASSED", and no retirement marker — while the '
    'only retraction sat **445 lines below**, after an entire additional spec section. '
    'A reader top-down, or one who grepped `§S8` and stopped at the first hit, would '
    'have treated ~55 lines of deleted architecture as buildable. A retraction must sit '
    'at the point of the claim. The original bodies are recoverable from git history '
    '(this file, pre-2026-07-16).\n'
)


# ---------------------------------------------------------------- FIX-5
# FIX-2 struck only the FIRST SENTENCE of the fictional paragraph; the fictional
# DETAIL (the four class names, the paint targets) still read as LIVE prose on the
# next line. Caught by the lint-spec-drift PHP-CLASS gate re-run + an independent
# verification agent — i.e. the gate caught a defect in the fix for the defect.
OLD_CUST_BODY = '> ~~Customiser sibling surfaces shipped (Phase 5b, commit `60220b13` + paint-fix `0ef032fe`, Decisions 22+23).~~ Three new Customiser sections register at'
NEW_CUST_BODY = (
    '> ~~Customiser sibling surfaces shipped (Phase 5b, commit `60220b13` + paint-fix '
    '`0ef032fe`, Decisions 22+23).~~ **[The remainder of this item is RETRACTED FICTION '
    '— retained struck, for audit only. `Sgs_Header_Customiser` / `Sgs_Footer_Customiser` '
    '/ `Sgs_Header_Renderer` / `Sgs_Footer_Renderer` DO NOT EXIST.]** ~~Three new '
    'Customiser sections register at'
)

# ---------------------------------------------------------------- FIX-6
OLD_CUST_MIGR = '**Three new Customiser sections:**'
NEW_CUST_MIGR = (
    '**⛔ RETRACTED 2026-07-16 (adversarial-council) — TWO OF THE THREE SECTIONS BELOW '
    'DO NOT EXIST.** Verified by grep + the `lint-spec-drift.py` PHP-CLASS gate: '
    '`Sgs_Header_Customiser` and `Sgs_Footer_Customiser` exist NOWHERE in `plugins/` or '
    '`theme/` (removed by commit `87dd869d`, "retire plugin-side Customiser path"). Only '
    '`Sgs_Site_Info_Customiser` is real. Header/footer BEHAVIOUR lives on `sgs/site-header` '
    'block attrs (FR-S9-9, D330), NOT a Customiser. Do not build against this list; it is '
    'retained struck for audit.\n'
    '\n'
    '~~**Three new Customiser sections:**~~'
)


def apply_fix(text: str, name: str, old: str, new: str, applied: list, skipped: list) -> str:
    """Replace `old` with `new`, asserting the anchor exists (or is already applied)."""
    if new.split("\n")[0][:60] in text and old not in text:
        skipped.append(f"{name} (already applied)")
        return text
    if old not in text:
        raise AssertionError(
            f"{name}: ANCHOR NOT FOUND — refusing to silently no-op.\n"
            f"  Expected to find: {old[:110]!r}\n"
            f"  The spec changed underneath this script. Re-read it and re-anchor."
        )
    applied.append(name)
    return text.replace(old, new, 1)


def replace_s8_body(text: str, applied: list, skipped: list) -> str:
    if "⛔ RETIRED 2026-05-21 — DEAD SPEC" in text:
        skipped.append("FIX-4 §S8 tombstone (already applied)")
        return text
    lines = text.splitlines(keepends=True)
    start = next((i for i, l in enumerate(lines) if l.startswith("## §S8 — Two-Axis Style Variations")), None)
    if start is None:
        raise AssertionError("FIX-4: §S8 body heading not found — refusing to no-op.")
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), None)
    if end is None:
        raise AssertionError("FIX-4: could not find the end of the §S8 body.")
    removed = end - start
    applied.append(f"FIX-4 §S8 body -> tombstone ({removed} lines of dead spec removed)")
    return "".join(lines[:start]) + S8_TOMBSTONE + "\n" + "".join(lines[end:])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SPEC.exists():
        print(f"ERROR: spec not found at {SPEC}", file=sys.stderr)
        return 2
    original = SPEC.read_text(encoding="utf-8")
    text = original
    applied: list = []
    skipped: list = []

    text = apply_fix(text, "FIX-1 87->78 + FR-S9-6 half-built", OLD_87, NEW_78, applied, skipped)
    text = apply_fix(text, "FIX-2 Customiser fiction retracted", OLD_CUST, NEW_CUST, applied, skipped)
    text = apply_fix(text, "FIX-3a FR-S9-5 re-homed to adaptive-nav", OLD_S95_TITLE, NEW_S95_TITLE, applied, skipped)
    text = apply_fix(text, "FIX-3b FR-S9-4 'opens mobile-nav'", OLD_S94_OPENS, NEW_S94_OPENS, applied, skipped)
    text = apply_fix(text, "FIX-5 strike the fictional Customiser BODY (FIX-2 left it live)",
                     OLD_CUST_BODY, NEW_CUST_BODY, applied, skipped)
    text = apply_fix(text, "FIX-6 retract the §Customiser-Migration section list",
                     OLD_CUST_MIGR, NEW_CUST_MIGR, applied, skipped)
    text = replace_s8_body(text, applied, skipped)

    print("APPLIED:")
    for a in applied:
        print(f"  + {a}")
    if skipped:
        print("SKIPPED (idempotent):")
        for s in skipped:
            print(f"  = {s}")

    before, after = len(original.splitlines()), len(text.splitlines())
    print(f"\nlines: {before} -> {after} ({after - before:+d})")
    print(f"remaining 'mobile-nav' mentions: {len(re.findall('mobile-nav', text))} "
          f"(was {len(re.findall('mobile-nav', original))}) — residual mentions are "
          f"historical/BUILT-notes + the re-homing note itself, which are correct to keep")

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return 0
    SPEC.write_text(text, encoding="utf-8")
    print(f"\nWROTE {SPEC}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
