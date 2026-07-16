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

---

SECOND BATCH (same day, same council run — 6 further VALIDATED proposals, qc-council
empirical-gated). FIX-1..6 above touch Spec 17 only; FIX-7..13 below touch Spec 17 AND
its sister Spec 18 (the Customiser-pattern reference spec, never swept when Spec 17 was
retracted). The gate P4 companion to this batch (competitor-citation false-positive in
`_NEGATIVE_CONTEXT`) is applied DIRECTLY to `lint-spec-drift.py`, not here — it's a tool
fix, not a spec fix.

  FIX-7/8 (Spec 18, P1) — a casing typo: the real classes are `Sgs_Floating_UI_Renderer`
        / `Sgs_Floating_UI_Customiser` (capital UI, verified against
        `class-sgs-floating-ui-renderer.php:23` / `class-sgs-floating-ui-customiser.php:27`)
        but L69/L141 write `Sgs_Floating_Ui_Renderer` / `Sgs_Floating_Ui_Customiser`
        (lower-case ui). The spec's own "## 6. Files" table already uses correct casing,
        proving it's a typo, not a second real class.

  FIX-9 (Spec 17, P2) — the §Customiser Migration section already carries a RETRACTED
        note (added by an earlier council pass) and its heading is struck, but the two
        bullets underneath (`Sgs_Header_Customiser`, `Sgs_Footer_Customiser`) were left
        LIVE — the retraction didn't propagate down to bullet level. Strike those two
        bullets to match. The THIRD bullet (`Sgs_Site_Info_Customiser`) is untouched —
        that class is real and must stay live.

  FIX-10/11 (Spec 18, P3) — Spec 18 makes the IDENTICAL fictional claim Spec 17 just
        retracted ("shipped `Sgs_Header_Customiser` + `Sgs_Footer_Customiser` +
        `Sgs_Site_Info_Customiser`" at L26, repeated in the L188 table) but was never
        swept — it's a sister spec, not the one the original council pass was scoped
        to. Sweep it the same way: retraction note + struck dead names, `Site_Info`
        and `Floating_UI_Customiser` (both real) stay live.

  FIX-12 (Spec 17, P5) — L635 is one compound sentence mixing a TRUE claim (the hook's
        regex correctly matches only literal `header`/`footer`/`nav`, so those three
        stay FORBIDDEN) with a FALSE one (it calls `src/blocks/mobile-nav/` "unaffected"
        — that directory was DELETED at D336, 2026-07-14, the day before this line was
        apparently last touched). Split into two source lines (the lint reads raw
        lines, not wrapped paragraphs): the true half keeps its citations negative-
        context-safe via the word FORBIDDEN; the mobile-nav half is corrected and
        marked DELETED, not silenced.

  FIX-13 (Spec 17, P6) — the sibling acceptance-criterion bullet at L639 lists
        `src/blocks/mobile-nav/` among directories the hook "allows" — nothing to
        fixture-test, that directory doesn't exist. Remove it from the list; the
        equivalent live fixture already targets `src/blocks/adaptive-nav/`, which is
        already in the same bullet.

Run:  python 2026-07-16-fix-spec-drift.py [--dry-run]
Then: python ../lints/lint-spec-drift.py --check
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SPECS_DIR = Path(__file__).resolve().parents[4] / ".claude" / "specs"
SPEC = SPECS_DIR / "17-HEADER-FOOTER-ARCHITECTURE.md"
SPEC_18 = SPECS_DIR / "18-SGS-FLOATING-UI.md"

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


# ---------------------------------------------------------------- FIX-7/8 (Spec 18, P1)
OLD_18_UI_RENDERER = "`Sgs_Floating_Ui_Renderer` attaches to `wp_footer` (priority 20). When both elements are"
NEW_18_UI_RENDERER = "`Sgs_Floating_UI_Renderer` attaches to `wp_footer` (priority 20). When both elements are"

OLD_18_UI_CUSTOMISER = "a full reload. The registered `Sgs_Floating_Ui_Customiser` settings call"
NEW_18_UI_CUSTOMISER = "a full reload. The registered `Sgs_Floating_UI_Customiser` settings call"

# ---------------------------------------------------------------- FIX-9 (Spec 17, P2)
OLD_17_CUST_BULLETS = (
    '- `Sgs_Header_Customiser` → Customiser section "SGS Header" with `postMessage` '
    'live preview for colours/typography/spacing\n'
    '- `Sgs_Footer_Customiser` → Customiser section "SGS Footer" with `postMessage` '
    'live preview\n'
    '- `Sgs_Site_Info_Customiser` → Customiser section "SGS Site Info" — for simple '
    'fields, `postMessage`; for rules engines (regex-backed conditions), `refresh` '
    'transport (live preview impractical)'
)
NEW_17_CUST_BULLETS = (
    '- ~~`Sgs_Header_Customiser` → Customiser section "SGS Header" with `postMessage` '
    'live preview for colours/typography/spacing`~~\n'
    '- ~~`Sgs_Footer_Customiser` → Customiser section "SGS Footer" with `postMessage` '
    'live preview`~~\n'
    '- `Sgs_Site_Info_Customiser` → Customiser section "SGS Site Info" — for simple '
    'fields, `postMessage`; for rules engines (regex-backed conditions), `refresh` '
    'transport (live preview impractical)'
)

# ---------------------------------------------------------------- FIX-10 (Spec 18, P3 — L26)
OLD_18_L26 = (
    '> **Session B 2026-05-22 update — Customiser pattern from §8b replicated by 3 '
    'sibling sections.** Phase 5b (commit `60220b13` + paint-fix `0ef032fe`) shipped '
    '`Sgs_Header_Customiser` + `Sgs_Footer_Customiser` + `Sgs_Site_Info_Customiser` as '
    'direct structural clones of `Sgs_Floating_UI_Customiser`. The pattern documented '
    'in §8b is now the canonical SGS Customiser shape (confirmed by 3 successful '
    'replications). Notable empirical learning: paint targets must be '
    '`header.wp-block-template-part` / `footer.wp-block-template-part` (NOT '
    '`.wp-site-header` / `.wp-site-footer` — those classes are not emitted by SGS '
    'theme template parts); CSS custom properties belong on `:root` so they\'re '
    'cascade-available regardless of which wrapper exists. View Transitions wiring '
    '(Decision 27 in the staging doc) shipped in the same commit — uses '
    '`function_exists(\'wp_enqueue_view_transitions_admin_css\')` check + inline '
    '`@view-transition{navigation:auto;}` fallback. Post WP 7.0 upgrade (also Session '
    'B), the native function exists; fallback is dead code on sandybrown but kept for '
    'any client site still on WP 6.x.'
)
NEW_18_L26 = (
    '> **⛔ RETRACTED 2026-07-16 (adversarial-council) — sister-spec sweep of Spec '
    '17\'s identical retraction.** `Sgs_Header_Customiser` and `Sgs_Footer_Customiser` '
    'NEVER SHIPPED — `grep -rl "class Sgs_Header_Customiser"` over `plugins/` + '
    '`theme/` returns nothing; Spec 17 §Customiser Migration already retracted the '
    'identical claim (commit `87dd869d`, "retire plugin-side Customiser path") and '
    'this sister spec was never swept. Only `Sgs_Site_Info_Customiser` and '
    '`Sgs_Floating_UI_Customiser` are real — verified 2026-07-16 by grep + the '
    '`lint-spec-drift.py` PHP-CLASS gate. The struck names below are retained for '
    'audit only; the rest of the note (paint targets, View Transitions wiring) is '
    'unaffected and stands.\n'
    '>\n'
    '> **Session B 2026-05-22 update — Customiser pattern from §8b replicated by 3 '
    'sibling sections.** Phase 5b (commit `60220b13` + paint-fix `0ef032fe`) shipped '
    '~~`Sgs_Header_Customiser` + `Sgs_Footer_Customiser`~~ (RETRACTED — never existed) '
    '+ `Sgs_Site_Info_Customiser` as direct structural clones of '
    '`Sgs_Floating_UI_Customiser`. The pattern documented in §8b is now the canonical '
    'SGS Customiser shape (confirmed by 3 successful replications). Notable empirical '
    'learning: paint targets must be `header.wp-block-template-part` / '
    '`footer.wp-block-template-part` (NOT `.wp-site-header` / `.wp-site-footer` — '
    'those classes are not emitted by SGS theme template parts); CSS custom '
    'properties belong on `:root` so they\'re cascade-available regardless of which '
    'wrapper exists. View Transitions wiring (Decision 27 in the staging doc) shipped '
    'in the same commit — uses '
    '`function_exists(\'wp_enqueue_view_transitions_admin_css\')` check + inline '
    '`@view-transition{navigation:auto;}` fallback. Post WP 7.0 upgrade (also Session '
    'B), the native function exists; fallback is dead code on sandybrown but kept for '
    'any client site still on WP 6.x.'
)

# ---------------------------------------------------------------- FIX-11 (Spec 18, P3 — L188)
OLD_18_L188 = (
    '| Spec 17 §Customiser migration | `Sgs_Header_Customiser`, `Sgs_Footer_Customiser`, '
    '`Sgs_Site_Info_Customiser` | `postMessage` transport, `wp_options` backing, '
    'capability gate, sanitiser pattern |'
)
NEW_18_L188 = (
    '| Spec 17 §Customiser migration | ~~`Sgs_Header_Customiser`, '
    '`Sgs_Footer_Customiser`~~ (RETRACTED 2026-07-16 — never existed) + '
    '`Sgs_Site_Info_Customiser` | `postMessage` transport, `wp_options` backing, '
    'capability gate, sanitiser pattern |'
)

# ---------------------------------------------------------------- FIX-12 (Spec 17, P5 — L635)
OLD_17_L635 = (
    "**Verified against live code 2026-07-13:** `no-header-footer-block.py`'s regex is "
    "`plugins[\\\\/]sgs-blocks[\\\\/]src[\\\\/]blocks[\\\\/](header|footer|nav)([\\\\/]|$)` — it "
    "matches only the EXACT path segments `header`, `footer`, `nav` immediately after "
    "`blocks/`. Directory names `site-header`, `site-footer`, and `adaptive-nav` do "
    "**not** match this pattern (the regex requires the literal string "
    "`header`/`footer`/`nav` to begin right after `blocks/`, not merely be a substring "
    "of the segment) — so the hook already permits "
    "`src/blocks/{site-header,site-footer,adaptive-nav}/` without modification, and "
    "continues to correctly block a literal `src/blocks/header/`, `src/blocks/footer/`, "
    "or `src/blocks/nav/`. This is a **no-op-by-construction** finding, not a change to "
    "make — flagged here so a future session doesn't spend effort \"updating\" a hook "
    "that already does the right thing. The existing `src/blocks/mobile-nav/` "
    "directory (used by FR-S9-5) is unaffected for the same reason."
)
NEW_17_L635 = (
    "**Verified against live code 2026-07-13:** `no-header-footer-block.py`'s regex is "
    "`plugins[\\\\/]sgs-blocks[\\\\/]src[\\\\/]blocks[\\\\/](header|footer|nav)([\\\\/]|$)` — it "
    "matches only the EXACT path segments `header`, `footer`, `nav` immediately after "
    "`blocks/`. Directory names `site-header`, `site-footer`, and `adaptive-nav` do "
    "**not** match this pattern (the regex requires the literal string "
    "`header`/`footer`/`nav` to begin right after `blocks/`, not merely be a substring "
    "of the segment) — so the hook already permits "
    "`src/blocks/{site-header,site-footer,adaptive-nav}/` without modification, and "
    "continues to correctly treat a literal `src/blocks/header/`, `src/blocks/footer/`, "
    "or `src/blocks/nav/` as FORBIDDEN. This is a **no-op-by-construction** finding, "
    "not a change to make — flagged here so a future session doesn't spend effort "
    "\"updating\" a hook that already does the right thing.\n"
    "**`src/blocks/mobile-nav/` was DELETED at D336/Task 1 (2026-07-14)** — the drawer "
    "this FR referenced is now owned by `sgs/adaptive-nav`; the citation above (and "
    "the acceptance criteria below) predate the deletion and are historical, not a "
    "directory that exists today."
)

# ---------------------------------------------------------------- FIX-13 (Spec 17, P6 — L639)
OLD_17_L639 = (
    "- `no-header-footer-block.py` allows `Write`/`Edit` on `src/blocks/site-header/`, "
    "`src/blocks/site-footer/`, `src/blocks/adaptive-nav/`, `src/blocks/mobile-nav/` "
    "(already true; add a fixture test asserting it stays true)"
)
NEW_17_L639 = (
    "- `no-header-footer-block.py` allows `Write`/`Edit` on `src/blocks/site-header/`, "
    "`src/blocks/site-footer/`, `src/blocks/adaptive-nav/` (already true; add a "
    "fixture test asserting it stays true). `src/blocks/mobile-nav/` was DELETED at "
    "D336/Task 1 (2026-07-14) — removed from this list; the equivalent fixture "
    "already targets `src/blocks/adaptive-nav/`, which owns the drawer FR-S9-5 "
    "describes."
)


def apply_fix(text: str, name: str, old: str, new: str, applied: list, skipped: list) -> str:
    """Replace `old` with `new`, asserting the anchor exists (or is already applied).

    Idempotency is decided by whether the FULL `new` text is already present — not by
    "old absent" (a struck ~~old~~ fix's `old` is a literal SUBSTRING of its own
    already-applied output, so "old not in text" is always False post-apply and would
    double-strike on a second run — caught 2026-07-16 on FIX-6), and not by a 60-char
    prefix marker either (a fix that only changes its TAIL — e.g. FIX-9/12/13, which
    keep the opening sentence verbatim and add/alter a trailing clause — shares that
    prefix with the un-applied `old` text too, so a prefix-only marker false-skips
    before the fix ever runs. Caught 2026-07-16 on FIX-12/13 the same session.). Full-
    string containment is unambiguous for both failure modes.
    """
    if new in text:
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


def process_spec_17(text: str, applied: list, skipped: list) -> str:
    text = apply_fix(text, "FIX-1 87->78 + FR-S9-6 half-built", OLD_87, NEW_78, applied, skipped)
    text = apply_fix(text, "FIX-2 Customiser fiction retracted", OLD_CUST, NEW_CUST, applied, skipped)
    text = apply_fix(text, "FIX-3a FR-S9-5 re-homed to adaptive-nav", OLD_S95_TITLE, NEW_S95_TITLE, applied, skipped)
    text = apply_fix(text, "FIX-3b FR-S9-4 'opens mobile-nav'", OLD_S94_OPENS, NEW_S94_OPENS, applied, skipped)
    text = apply_fix(text, "FIX-5 strike the fictional Customiser BODY (FIX-2 left it live)",
                     OLD_CUST_BODY, NEW_CUST_BODY, applied, skipped)
    text = apply_fix(text, "FIX-6 retract the §Customiser-Migration section list",
                     OLD_CUST_MIGR, NEW_CUST_MIGR, applied, skipped)
    text = replace_s8_body(text, applied, skipped)
    text = apply_fix(text, "FIX-9 strike the two dead Customiser bullets (Site Info bullet untouched)",
                     OLD_17_CUST_BULLETS, NEW_17_CUST_BULLETS, applied, skipped)
    text = apply_fix(text, "FIX-12 split L635: header/footer/nav FORBIDDEN vs mobile-nav DELETED",
                     OLD_17_L635, NEW_17_L635, applied, skipped)
    text = apply_fix(text, "FIX-13 drop mobile-nav from the L639 acceptance-criteria allow-list",
                     OLD_17_L639, NEW_17_L639, applied, skipped)
    return text


def process_spec_18(text: str, applied: list, skipped: list) -> str:
    text = apply_fix(text, "FIX-7 Sgs_Floating_Ui_Renderer -> Sgs_Floating_UI_Renderer (L69 casing)",
                     OLD_18_UI_RENDERER, NEW_18_UI_RENDERER, applied, skipped)
    text = apply_fix(text, "FIX-8 Sgs_Floating_Ui_Customiser -> Sgs_Floating_UI_Customiser (L141 casing)",
                     OLD_18_UI_CUSTOMISER, NEW_18_UI_CUSTOMISER, applied, skipped)
    text = apply_fix(text, "FIX-10 sister-spec sweep: retract + strike dead names (L26)",
                     OLD_18_L26, NEW_18_L26, applied, skipped)
    text = apply_fix(text, "FIX-11 sister-spec sweep: strike dead names in the pattern table (L188)",
                     OLD_18_L188, NEW_18_L188, applied, skipped)
    return text


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    for spec_path, processor in ((SPEC, process_spec_17), (SPEC_18, process_spec_18)):
        if not spec_path.exists():
            print(f"ERROR: spec not found at {spec_path}", file=sys.stderr)
            return 2

    total_applied: list = []
    total_skipped: list = []
    writes: list = []

    for spec_path, processor in ((SPEC, process_spec_17), (SPEC_18, process_spec_18)):
        original = spec_path.read_text(encoding="utf-8")
        applied: list = []
        skipped: list = []
        text = processor(original, applied, skipped)

        print(f"=== {spec_path.name} ===")
        print("APPLIED:")
        for a in applied:
            print(f"  + {a}")
        if skipped:
            print("SKIPPED (idempotent):")
            for s in skipped:
                print(f"  = {s}")

        before, after = len(original.splitlines()), len(text.splitlines())
        print(f"lines: {before} -> {after} ({after - before:+d})")
        if spec_path is SPEC:
            print(f"remaining 'mobile-nav' mentions: {len(re.findall('mobile-nav', text))} "
                  f"(was {len(re.findall('mobile-nav', original))}) — residual mentions are "
                  f"historical/BUILT-notes + the re-homing note itself, which are correct to keep")
        print()

        total_applied.extend(applied)
        total_skipped.extend(skipped)
        if text != original:
            writes.append((spec_path, text))

    print(f"TOTAL: {len(total_applied)} applied, {len(total_skipped)} skipped (idempotent)")

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return 0
    for spec_path, text in writes:
        spec_path.write_text(text, encoding="utf-8")
        print(f"WROTE {spec_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
