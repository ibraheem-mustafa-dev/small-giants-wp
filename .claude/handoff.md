---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-19-path-b-sgs-media-sgs-text
session_date: 2026-05-19
recommended_model: sonnet
last_verified: 2026-05-19
---

# Session Handoff — 2026-05-19 (Phase 9 walkdown + Path B universal lift)

## Headline

**5 commits to `main` (HEAD `ae701a53`).** Universal core-block CSS lift shipped (commit 99b344d7 + fixes), discovered it was visually inert because core/* are static-render, then **shipped Path B** — built two new dynamic SGS blocks (`sgs/media`, `sgs/text`) in parallel worktrees and swapped the converter atomic branches to emit them. Brand pixel diff moved from baseline 31/13/37% to **28/11/29%** at desktop/tablet/mobile. NOT the 1% goal, but real measured movement with verified server-rendered inline styles in the live HTML.

## Completed This Session

1. **Discovered + fixed `--debug-trace` wiring bug** (`8444d4e4`). Pre-work commit 8b69bc0a's UnboundLocalError silently disabled per-section trace. Fix: `global _trace_mod` in `stage_4_5_6_7_8_extract`.
2. **Shipped universal core-block CSS lift** (`99b344d7` + `a0592001`). New `_lift_core_block_style()` in convert.py + 26-entry mapping + 4-rater /qc panel + 3 NEEDS_FIX shipped.
3. **P-PHASE9-6 RETIRED_BLOCK_REMAP guard** — import-time collision check against sgs-wp-engine DB blocks table.
4. **Discovered static-block frontend-invisibility** — core/heading + core/image + core/paragraph save.js HTML is frozen in post_content; JSON style attrs are ignored at render time. Lift code was structurally correct but visually inert.
5. **Path B: built sgs/media + sgs/text in parallel** (`ae701a53`). Two new dynamic blocks. sgs/media (36 attrs) — content image with server-side inline style. sgs/text (44 attrs) — full typography/spacing flat schema with per-viewport @media blocks. Both registered via plugin auto-discovery. `function_exists()` guards on render.php helpers to prevent fatal redeclaration.
6. **Wired converter swap** — atomic_image → sgs/media, atomic_paragraph + atomic_text_fallback → sgs/text when source has SGS-BEM class. New `_flatten_wp_style_to_sgs_flat()` helper bridges WP nested → SGS flat schemas. textColour double-encoding fix normalises `var:preset|color|slug` and `var(--wp--preset--color--X)` to bare slug before re-wrap.
7. **Deployed sgs-blocks to sandybrown** — npm build + tar deploy + OPcache reset. Updated post 65 via REST. Verified rendered HTML contains inline styles: `<img style="object-fit:cover;max-height:380px;border-radius:16px">` and `<p style="color:var(--wp--preset--color--text-muted);font-size:16px;line-height:1.75em;...">`.
8. **Captured behavioural rule** `feedback_qc_panel_must_assert_file_existence` — when QC artefact is a file, raters MUST assert file exists with non-zero bytes + schema check.

## Current State

- **Branch:** main at `ae701a53`
- **Live:** post 65 at sandybrown rendering sgs/media + sgs/text with inline styles applied
- **Tests:** WP block validation locally reports "Unknown block: sgs/text" (DB not refreshed via `/sgs-update`); on deployed sandybrown rendering succeeds.
- **Uncommitted:** None except this handoff regen.
- **Pixel diff (brand at 3 viewports):** 28.3% / 10.6% / 28.8% — improved from 31.2% / 12.2% / 36.6% pre-Path-B

## Pixel Diff vs Session Goal

| Viewport | Session start | Pre-Path-B | **End of session** | Goal |
|----------|---------------|------------|--------------------|------|
| 1440     | 31.2%         | 31.2%      | **28.3%**          | ≤1%  |
| 768      | 13.0%         | 12.2%      | **10.6%**          | ≤1%  |
| 375      | 36.6%         | 36.6%      | **28.8%**          | ≤1%  |

**Goal NOT achieved.** Real movement (3-8pp drops), but the 1% target requires more work.

## Known Issues / Blockers

- **Broken image URL** — converter emits `imageUrl: "../../research/photography/wp-media-library/Halimahs.jpeg"` which sandybrown renders as `src="http://../../research/..."`. Image fails to load. Likely the biggest remaining pixel-diff contributor on every viewport. Fix: media-sideload non-dry-run, or URL rewrite step.
- **Headline still core/heading** — sgs/heading has wrapper-div mismatch (`<div class="wp-block-sgs-heading"><h2>` vs naked `<h2>`), would change DOM structure unrelated to lift. Path A (inline style on saved HTML) is the safe alternative.
- **Tag-only blockquote selectors** — `.sgs-brand__body p` rule still skipped by SGS-class guard. Parked as P-PARENT-QUALIFIED-TAG-LIFT.
- **Local `wp-blocks validate` reports invalid** — DB doesn't know about sgs/media + sgs/text yet. Run `/sgs-update` to refresh.

## Next Priorities (in order)

1. **Media sideload non-dry-run** (~30 min) — upload mockup images to WP Media Library, replace relative URLs in extract.json. Almost certainly the biggest pixel-diff win remaining.
2. **`/sgs-update`** to refresh sgs-framework.db with the two new blocks. Local `wp-blocks validate` will pass after.
3. **Path A for atomic_heading** (~20 min) — emit `<h2 style="font-size:28px;color:...;margin-bottom:20px">` inline on the saved HTML so the headline styles apply. Avoids the sgs/heading wrapper-div mismatch.
4. **Parent-qualified tag-selector smarter guard** (P-PARENT-QUALIFIED-TAG-LIFT, ~45 min) — allow lift when matched selector has an SGS-class ancestor.
5. **Re-measure brand at 3 viewports** — expect ≤5% on at least one viewport. Then hero walkdown opens.

## Files Modified

| File | What changed |
|---|---|
| `plugins/sgs-blocks/src/blocks/media/*` | NEW dynamic block (7 files) |
| `plugins/sgs-blocks/src/blocks/text/*` | NEW dynamic block (7 files) |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | Added `_lift_core_block_style`, `_flatten_wp_style_to_sgs_flat`, `_split_value_unit`. Swapped atomic_image / atomic_paragraph / atomic_text_fallback to emit sgs/media + sgs/text. textColour double-encoding fix. |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | `global _trace_mod` |
| `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` | RETIRED_BLOCK_REMAP collision guard |
| `.claude/parking.md` | 5+ new entries (this + previous session) |
| `.claude/decisions.md` | 4 new decisions from this session |
| `.claude/mistakes.md` | 1 new lesson (QC must assert file artefacts) |
| `~/.claude/projects/.../memory/feedback_qc_panel_must_assert_file_existence.md` | new behavioural rule |

## Notes for Next Session

- The sandybrown post 65 baseline matters — both posts 65 and 66 need their content kept in sync with the mockup for pixel-diff to be meaningful. Post 66 (mockup baseline) hasn't been refreshed this session.
- Image URL is THE biggest visible defect. The mockup's relative path needs to be either (a) uploaded to WP Media Library and replaced with the WP URL, or (b) absolute-pathed to the mockup hosting. Without this fix, no amount of styling can close pixel diff because the image area is white-empty.
- sgs/heading wrapper-div is a structural choice — the existing block adds a `<div class="wp-block-sgs-heading">` around the `<h2>`. For atomic-heading swap to be safe, would need a config that drops the wrapper for single-headline use cases. Or just use Path A.
- The 4-rater /qc panel must include "assert file artefact exists" step per the new captured rule. This session caught the static-block-invisibility bug only because I curl-fetched the rendered HTML and grepped for the style attrs.

## Next Session Prompt

See `.claude/next-session-prompt.md`.
