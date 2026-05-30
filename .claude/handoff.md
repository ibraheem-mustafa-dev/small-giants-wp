# Session Handoff — 2026-05-31 (XS-3 reconciliation + FR-22-6 fractal root cause + Spec 24)

## Completed This Session
1. **XS-3 reconciled + merged (D114, main eeac99a1).** Proved the "two competing XS-3" framing wrong via git: branch `eced119b` was a strict SUPERSET of main's XS-3 (`merge-base == 0a212e3c`), not a rival. Clean head-to-head on page 144 (OPcache reset between): main 58.39% vs branch 58.98% (+0.59pp). featured-product "+19.7pp@768" = vertical-anchor crop artefact between two equally-empty renders. Bean approved merge.
2. **Root cause of empty featured-product + social-proof FOUND + verified (D115).** Pixel-diff showed a FALSE −30.9pp "win"; live DOM (Playwright, R-22-11) showed `textLen=0` — both sections render EMPTY. Investigation (opus subagent): the walker never runs the FR-22-2 content-routing layer. `sgs-product-card__body` mis-resolves to the `sgs/text` LEAF (the `slots` table lists `body/intro/description` as `text`-slot aliases) → leaf swallows its children. Leaf text emitted as inner markup, not into the scalar `text` attr → renders empty. Fix is CONVERTER-side (G1-G4), NOT a 61-block migration. **XS-3 must be EXTENDED** (its guard only fires on slug=None; misses leaf-misresolution — that's why container routing "should have" caught this but didn't). Pills → `sgs/button`, not `sgs/label` (eyebrow).
3. **Container migrations done (WIP, branch c9c6544d).** product-card + testimonial + testimonial-slider migrated to FR-22-6 InnerBlocks (echo $content, useInnerBlocksProps, deprecated.js migrate(), templateLock:false preserves Bean's add-any-number flexibility). Correct + build clean, but render empty until the converter fix lands. Committed `--no-verify` (gate's own sanctioned path for render-logic that can't yet pass visual diff) on the branch — NOT main.
4. **Spec 24 + product CPT (D116).** Research (research-buddies + library-docs): presentational-vs-query is a false fork; ONE dual-mode card on custom CPT + Query Loop + Block Bindings; NOT WooCommerce. `specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` + `sgs_product` CPT + 2-product seed built (committed; not deployed).

## Current State
- **main** clean at `eeac99a1` (XS-3/Spec 23 merge). Pushed.
- **feat/fr22-6-content-render** at `c9c6544d` (all this session's code work: container migrations + Spec 24 + product CPT + seed). Pushed. WIP — completes + merges next session after the converter fix + passing visual diff + /qc-council.
- Canary page 144 currently shows the branch deploy (containers echo $content but content empty pending converter fix). Mean ~58.5%.
- Untracked `.claude/sgs-framework.db` — do NOT commit.

## Known Issues / Blockers
- **featured-product + social-proof render EMPTY** — converter content-routing fix is the blocker. See `plans/2026-05-31-converter-content-routing-fix.md` (G1-G4) + D115.
- **Visual-diff gate** blocks committing the 3 migrated blocks to main until they render (correct — they're WIP on the branch).
- **Product CPT not deployed/seeded** — `wp eval-file` content-guard hook blocks the seed; use `wp post create`/Playwright. P-PRODUCT-CPT-DEPLOY-SEED.

## Next Priorities (in order)
1. **Converter content-routing fix (G1-G4)** — `plans/2026-05-31-converter-content-routing-fix.md`. HIGHEST. Renders both sections; extends XS-3; merges the branch to main.
2. Deploy + seed the 2 product entries (P-PRODUCT-CPT-DEPLOY-SEED) + decide CPT per-site opt-in.
3. Spec 24 Phase A proper: dual-mode card binding (after Typed mode renders).

## Files / Artefacts
| Path | What |
|---|---|
| `plans/2026-05-31-converter-content-routing-fix.md` | THE next-session plan (G1-G4 + XS-3 extension) |
| `specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` | Query-driven cards vision (draft) |
| branch `feat/fr22-6-content-render` c9c6544d | container migrations + Spec 24 + CPT + seed |
| `decisions.md` D114-D116 | this session's decisions |
| memory `empty-section-false-pixel-diff-win` | the false-pixel-diff lesson |

## Notes for Next Session
- The investigation report (full diagnosis) is in this session's transcript + distilled into D115 + the phase plan. The fix is surgical converter work — do NOT spin up parallel block-migration subagents (wrong problem).
- VERIFY live DOM textLen, not pixel-diff %, on empty-prone sections (captured lesson).
- A full `/handoff` docscore pass was deferred for session length — run it next session if doc drift is suspected.

## Next Session Prompt
See `.claude/next-session-prompt.md` — 2026-06-01 addendum prepended (new priority + new STOP entries #20-23 + new lessons); full prior structural defences (19-entry STOP catalogue, 7-question ritual, tiered reading) PRESERVED below it per D101.
