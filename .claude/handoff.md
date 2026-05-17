---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-17-brand-walkdown-close
session_date: 2026-05-17
recommended_model: sonnet
last_verified: 2026-05-17
update_triggers:
  - "/handoff run"
companion_docs:
  - .claude/state.md
  - .claude/next-session-prompt.md
  - .claude/parking.md
  - .claude/decisions.md
  - .claude/plan.md
---

# Session Handoff — 2026-05-17 (Brand walkdown close + WP alignment architecture surfaced)

## Headline

**13 commits to `main` (HEAD `8a4d6224`).** Brand walkdown closed honestly — major converter improvements + 3 new dynamic blocks + peer-parity expansion shipped, but pixel-diff goal NOT achieved because the root cause was just identified at session close: **WP template content-area mismatch**. Hero-clone-poc proves the architecture fix works (PAGE template + alignfull). Next session is dedicated to **P-WP-ALIGNMENT-WIDTH-SYSTEM** — parked in detail with reading list.

## Completed This Session

1. **Universal core-block CSS lift** shipped (`99b344d7` + `a0592001`). `_lift_core_block_style()` emits CSS declarations into WP core-block `style.{color, typography, spacing, border, dimensions}` schema for atomic_image / atomic_heading / atomic_paragraph / atomic_text_fallback. SGS-class guard prevents tag-blast-radius.

2. **Path B — sgs/media + sgs/text dynamic blocks** (`ae701a53`). 36 + 79 attrs respectively. Converter swaps atomic_image → sgs/media and atomic_paragraph → sgs/text when source has SGS-BEM class. Server-rendered so style.* attrs land in HTML.

3. **sgs/quote new block** (`8af7b6b9`). Option A from blockquote+footer design discussion. 92 attrs. Server-renders `<blockquote>` + body paragraphs + `<footer>` attribution slot with full SGS-flat styling.

4. **sgs/heading peer-parity expansion** (`744ec4b5`) — 48 → 144 attrs. Wrapper-level spacing/border/background/hover/variantStyle/customWidth/inheritStyle + per-slot fontStyle/textDecoration/margin × 3 viewports. Sonnet subagent-driven.

5. **sgs/text peer-parity** (`744ec4b5`) — 52 → 79 attrs. Background, border, box-shadow, hover state, variantStyle, customWidth, per-viewport letter-spacing, inheritStyle.

6. **4-rater /qc panel** dispatched on session changes (Sonnet universality + Haiku DB/back-compat + Sonnet optimality + Sonnet adversarial). Average 78/100. 7 ship-blocker fixes applied in `8af7b6b9`.

7. **11 parked findings closed via 3 parallel subagents** (commits `62e8e23d` + `aefefe76` + `59ee4490`):
   - Multi-class BEM primary disambig + !important strip + voter assert UX + pixel-diff dynamic wait
   - Heading defaults normalised for serif + borderStyle 9-value enum parity + transition attrs + content-derived stable UIDs + wpautop audit
   - 6 dynamic blocks' `<tag<?php echo` malformed-tag templates fixed + FR1+grid double-lift regression test

8. **WP alignment architecture identified at session close.** Hero-clone-poc inspection revealed: PAGE template (no `.entry-content` width constraint) + `alignfull` class on hero = perfect clone. POST template (`.entry-content { max-width: 800px }`) + no alignfull = brand capped at 800 vs mockup's 1000. P-WP-ALIGNMENT-WIDTH-SYSTEM parked with full architecture + reading list + phases A-F for next session.

## Current State

- **Branch:** main at `8a4d6224`
- **Tests:** WP block validation on shakeout: valid. FR1+grid double-lift regression test PASSES.
- **Live:** sandybrown post 65 rendering full Mama's homepage with all 13-commit improvements applied. Image URLs uploaded, post content patched, OPcache reset.
- **Uncommitted:** None except docs regen (this commit).
- **Pixel-diff (vs raw mockup file://):** 58.0% / 47.7% / 56.3% across 1440/768/375 — dominated by template-mismatch parent-width gap, not converter quality.

## Pixel-diff Goal vs Reality

| Viewport | Session start | Final | Goal | Root cause of residual |
|----------|---------------|-------|------|------------------------|
| 1440 | 31.2% | 58.0% | ≤1% | Post template `.entry-content { max-width: 800px }` vs mockup 1000px |
| 768 | 13.0% | 47.7% | ≤1% | Same parent-width gap |
| 375 | 36.6% | 56.3% | ≤1% | Same |

Goal not achieved. The final regression at 1440 is because the lift improvements MOVED the SGS section width from "fill parent" alignment to declared `max-width: 1000px` (rendered as 800 due to .entry-content constraint), making it NARROWER than the mockup's full-viewport hero. **The architectural fix (P-WP-ALIGNMENT-WIDTH-SYSTEM) addresses the parent-constraint root cause.**

## Known Issues / Blockers

- **P-WP-ALIGNMENT-WIDTH-SYSTEM** is the #1 priority. All other Phase 9 work is downstream of this.
- 9 lower-priority parking entries open (P-CORE-STYLE-MAP-DB-MIGRATION, P-COVERAGE-METRIC-CORE-STYLE, P-PARENT-QUALIFIED-TAG-LIFT, etc.)
- Hero-clone-poc proved-out PAGE template + alignfull as the working pattern — read it first next session

## Next Priorities (in order)

1. **Discovery: read hero-clone-poc + theme.json + hero block.json + sgs/container current schema** (~30 min) — anchor implementation in WP-native conventions
2. **Per-client contentSize/wideSize lift** to `theme/sgs-theme/styles/{client}.json` from mockup CSS section widths (~1.5 hrs)
3. **sgs/container widthMode attr** (default/wide/full/custom × per-viewport) with WP-native `alignfull`/`alignwide` class emission (~1 hr)
4. **Converter wiring** — when lifted max-width matches contentSize/wideSize, emit widthMode preset instead of inline custom (~30 min)
5. **Re-measure brand pixel-diff** with fix applied — expect ≤5% on at least one viewport (~30 min)
6. **Multi-rater /qc panel** + commit + push (~20 min)

## Files Modified This Session

| Path | What |
|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | Universal core-block lift + 6 sub-fixes |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | Trace bindings |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Trace-wiring + max-width lift wiring |
| `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` | RETIRED_BLOCK_REMAP guard + voter assert UX |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/test_root_supports_double_lift.py` | NEW regression test |
| `plugins/sgs-blocks/src/blocks/media/*` | NEW dynamic block (7 files) |
| `plugins/sgs-blocks/src/blocks/text/*` | NEW dynamic block + parity expansion |
| `plugins/sgs-blocks/src/blocks/quote/*` | NEW dynamic block (7 files) |
| `plugins/sgs-blocks/src/blocks/heading/*` | Peer-parity expansion (48 → 144 attrs) + function_exists guards |
| `plugins/sgs-blocks/src/blocks/container/render.php` | max-width lift + style.dimensions.maxWidth |
| `plugins/sgs-blocks/src/blocks/{certification-bar,counter,divider,notice-banner,process-steps,trust-bar}/render.php` | Wrapper-attr leading-space fix |
| `plugins/sgs-blocks/includes/render-helpers.php` | `sgs_shadow_value()` added |
| `scripts/pixel-diff.py` | Lazy-load scroll + dynamic wait_for_function |
| `.claude/parking.md` | 12+ new entries opened, 11 closed |
| `.claude/state.md` + `.claude/handoff.md` + `.claude/next-session-prompt.md` | Regenerated |
| `~/.claude/projects/.../memory/feedback_qc_panel_must_assert_file_existence.md` | New behavioural rule |

## Notes for Next Session

- **The hero-clone-poc URL** = https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/. This is the ground truth for what "perfect clone" looks like architecturally.
- **Hero block has `supports.align: ["full"]`** likely — verify in block.json. That's what lets it emit `alignfull` class. sgs/container doesn't have this declared yet.
- **WP `alignfull` mechanism** = the WP block theme system applies negative margins to `.alignfull` so it escapes `.entry-content`'s max-width. This is the standard WP escape hatch.
- **Per-viewport widthMode** = Bean's directive. Use the same Mobile/Tablet/Desktop suffix convention as the rest of SGS attrs.
- **Customiser exposure** = Bean has done this on other websites. Probably via theme support for `customise-themejson` or by adding Customiser controls that write to `wp_global_styles`.
- **Don't repeat the "wrapper-context noise" framing** — that was wrong. The mismatch is fixable via WP-native alignment system.

## Next Session Prompt

See `.claude/next-session-prompt.md` for the full kick-off with reading list + 7 tasks.
