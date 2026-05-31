# Session Handoff — 2026-05-31 (converter now RENDERS content + side-by-side layout)

## Completed This Session
1. **XS-3 reconciled + merged to main (D114, `eeac99a1`).** Branch was a strict superset of main's XS-3 (not a rival). Clean head-to-head: main 58.39% vs branch 58.98%. Bean approved merge.
2. **Root cause of empty sections found + verified (D115).** Pixel-diff showed false wins; live DOM (textLen=0) proved sections rendered EMPTY. Cause = walker never ran FR-22-2 content-routing for leaves.
3. **G1 — leaf content-routing shipped (branch `1fcb0742`, D117).** `walk()` lifts leaf text into the content attr; fixed a latent `attr_type` fallback bug (the graceful fallback never fired). All 7 content sections now render (featured-product 0→510, social-proof →621, trust-bar →98). 4 regression tests.
4. **G2 — FR-23-6 depth-2 grid-wrapper preservation shipped (D117).** Designed via a 3-rater council (forensics + code-path + live-CSS, all converged) over the Spec 20/21 log set + code. `_is_layout_bearing_wrapper` Trigger A = depth≥2 AND display:grid/flex AND ≥2 children resolve to real blocks. featured-product + gift cards now SIDE-BY-SIDE; duplicate nesting fixed (header/trust-bar/brand = 1 container); brand −11.1; mean −0.66pp. Live-DOM + screenshot verified.
5. **Spec 24 (query-driven cards) + sgs_product CPT (D116).** On main. CPT + 2-product seed built (not deployed).

## Current State
- **main** `796780a8`+ (XS-3 merge + Spec 24 + CPT + docs incl. D117). Clean.
- **feat/fr22-6-content-render** `1fcb0742` (container migrations + G1 + G2 converter fix). **WIP — renders correctly but NOT pixel-acceptance** (images dry-run, info-box hybrid, styling). Pushed.
- Converter tests 16/16 pass. Canary page 144 shows correct content + side-by-side layout.

## Known Issues / Blockers (→ next session)
- **Branch not pixel-acceptance-passing** → P-FR226-FIDELITY-AND-MERGE. Biggest levers: (a) real image sideload (Stage 4i dry-run = no product images), (b) `sgs/info-box` FR-22-6 hybrid migration (gift card content sparse), (c) exact styling. Then generate visual-diff reports + merge branch→main.
- **Bean directive** P-UNIFY-CONTAINER-ABSORPTION: unify `_absorb_transparent_wrappers` (merge) + walker preservation into ONE structural container rule.
- Cosmetic: branch has an intermediate commit `47f29155` (pre-depth-gate G1); will squash on merge.

## Next Priorities (in order)
1. **Image sideload** (real WP media IDs, not dry-run) — likely the biggest remaining pixel-diff lever (P-FR226).
2. **Migrate sgs/info-box** FR-22-6 hybrid (gift-section content) — same pattern as product-card.
3. Reach pixel-acceptance → visual-diff reports → **merge branch→main**.
4. Deploy + seed the sgs_product CPT (P-PRODUCT-CPT-DEPLOY-SEED).
5. P-UNIFY-CONTAINER-ABSORPTION refactor (when next in the walker).

## Key Artefacts
| Path | What |
|---|---|
| branch `1fcb0742` | G1+G2 converter fix (THE render+layout win) |
| `decisions.md` D117 | full converter-fix decision + council + methodology lesson |
| `seed-composition-roles.py` | idempotent block_composition role corrections |
| memory `empty-section-false-pixel-diff-win` | the false-pixel-diff (both directions) lesson |
| `plans/2026-05-31-converter-content-routing-fix.md` | the phase plan (G1-G4) |

## Notes for Next Session
- **VERIFY LIVE DOM, not pixel-diff** — pixel-diff mis-scores empty (false win) AND reflowed-correct (false loss) sections. Use Playwright `textLen` + element-layout checks as the gate.
- The FR-23-6 fix is council-designed + trace-confirmed; don't re-litigate it. The depth-2 gate is the load-bearing signal.
- A full `/handoff` docscore pass was deferred (very long session) — run next session if drift suspected.

## Next Session Prompt
See `.claude/next-session-prompt.md` — 2026-06-01 addendum updated; prior structural defences (STOP catalogue, ritual, tiered reading) preserved per D101.
