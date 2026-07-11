---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-11
session: D304+D305 — scoped-selector gate + 3 D228 hardcoded-default fixes (button wrap, hero gap, heading text-wrap) + Task-2 reframe
---

# Session Handoff — 2026-07-11 (D304+D305)

## Completed This Session

1. **Task 1 — scoped-selector match bug-class: audit CLEAN + live gate shipped (D304, `6f52fb91`).** The multi-button bug-class (a scoped rule `.uid.block` whose class the element never carries → silent no-op) is NOT present: live DOM audit of the real homepage clone (page 8, 94 scope classes) + a 54-block roster page (~61) = **0 dead**. Gate `scripts/audit-scoped-selector-live.js` (plant-tested; wired into `build-deploy.py --audit-scoped-page 8`; npm `check:scoped-selector`). A first STATIC analyser gave 26 false positives → dropped (Bean's call; STOP-21).
2. **Task 2 — REFRAMED (Bean) + parking consolidated (`a042df37`).** The per-element typography ancestor-walk is superseded by a **draft→theme-token extractor** as the opening step of the header/footer setup pipeline (blocks inherit the correct base BY CONSTRUCTION). Merged 3 entries into `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE`.
3. **Button wrap fix (`fc05fe70`).** Hero buttons stacked at ~800px because multi-button defaulted `flex-wrap:wrap` (draft = `nowrap`). Default → `nowrap`. LANDED: row at 768–860, column at 767.
4. **Hero gap fix (`b8789ae7`).** Hero H1 column was 5px too narrow — hero/style.css hardcoded a 16px `.sgs-hero--split` gap the draft lacks. Removed → columns 400/400, content flush = draft.
5. **Heading text-wrap fidelity — Option 1 (D305, `272df589`).** Hero H1 wrapped "Made for" not the draft's "Made for the" — root cause `text-wrap:balance` on all headings (theme `core-blocks-critical.css`) vs the draft's greedy `wrap`. New `sgs/heading.textWrap` attr; render emits it at `.uid.wp-block-sgs-heading` (0,2,0, beats theme `h1..h6`); converter `assembly.py` step 3a3 sets it to the draft's effective wrap on cloned headings (DB-gated, FR-31-5.1); authored headings keep balance. Verified live; DB seeded via `/sgs-update --stage 1`.

**Unifying theme:** fixes 3, 4, 5 are the SAME D228 pattern — a framework default overriding the draft's faithfully-absent value. Bean's discrepancy list (Next Priorities) says the hardcoded-default purge is incomplete.

## Current State
- **Branch:** `main` at `272df589` — all 5 commits pushed.
- **Tests:** converter suite **440 pass, 1 skip**. **Build:** green (all prebuild gates). **Deploy:** sandybrown plugin deployed; page 1356 carries verification test blocks.
- **Uncommitted changes:** handoff docs only (this commit).

## Known Issues / Blockers
- **Page 8 hero H1 still renders `balance` live** — its headings were cloned BEFORE D305; a re-clone lands the greedy wrap. This is next-session Task 0.
- None block the next session.

## Next Priorities (in order)
1. **Re-clone page 8** — lands D305 text-wrap live + refreshes the baseline for the discrepancy investigations below.
2. **Root-cause the recurring BLACK BORDER** (featured/trial product cards, gift cards, announcement bar, info boxes, testimonial cards, trustpilot bar) — one universal cause: border-colour not transferred → defaults black. Biggest bang (≈7 sections).
3. **Card equal-height** (product + gift cards) — Bean: routed to sgs/container instead of card-grid, or card-grid items not `stretch`.
4. **The rest of Bean's discrepancy register** — buttons, option-picker, label highlight, ingredients, brand spacing, trustpilot height — grouped by root cause in `P-PAGE8-DISCREPANCY-REGISTER`.
5. **Inline-styles architecture** (Spec 32) — Bean: CSS still emitted into HTML via assorted `<style>`/style-id/section-style/div-style tags, not the DevTools styles panel like the draft; reads as a cheat.

## Files Modified
| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/audit-scoped-selector-live.js` (NEW) | live scoped-selector gate + plant-test + manifest push |
| `plugins/sgs-blocks/scripts/build-deploy.py` | post-deploy scoped-selector audit step |
| `plugins/sgs-blocks/scripts/scoped-selector-audit-manifest.json` (NEW) | 54-block roster manifest |
| `plugins/sgs-blocks/src/blocks/multi-button/{render.php,block.json}` | flex-wrap default `wrap`→`nowrap` |
| `plugins/sgs-blocks/src/blocks/hero/style.css` | removed hardcoded `.sgs-hero--split` 16px gap |
| `plugins/sgs-blocks/src/blocks/heading/{render.php,block.json}` | `textWrap` attr + scoped emission |
| `plugins/sgs-blocks/scripts/converter/services/assembly.py` | step 3a3 — cloned headings get draft's effective text-wrap |
| `.claude/{decisions.md,parking.md,memory/parking-archive.md}`, `reports/visual-diff/{multi-button,hero,heading}-2026-07-11.md` | records + LANDED reports |

## Notes for Next Session
- **The DB seed is not in git** — `sgs/heading.textWrap` was seeded to `~/.claude/skills/sgs-wp-engine/sgs-framework.db` via `/sgs-update --stage 1`. On a fresh clone, re-run stage 1 (block.json is the source of truth).
- **Cache clears matter** — a plugin CSS/render change needs `build-deploy.py` + OPcache reset AND `hosting_clearWebsiteCacheV1` (the CDN edge-caches the versioned CSS; a stale live measure misled me for ~20 min this session).
- **The static-analyser lesson** — for "does this class/style land?" questions, use the live DOM (the audit script / Playwright computed-style), never static PHP parsing (26 false positives this session; STOP-21).
- **Bean's discrepancies are NOT to be fixed piecemeal** — root-cause each (borders, heights, buttons are likely 3 universal causes, not 15 fixes), universal + Spec-31-aligned, no cheats.

## Next Session Prompt
See `.claude/next-session-prompt.md` — the page-8 fidelity discrepancy investigation programme.
