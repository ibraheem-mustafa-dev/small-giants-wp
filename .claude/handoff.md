---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-13
session: D320-D322 — Spec 33 Part 1 COMPLETE (all 13 FRs): freshness gate + Pass B advisory + dark-theme + namespace + component-CSS migration
---

# Session Handoff — 2026-07-13 (D320/D321/D322)

## Completed This Session
1. **Spec 33 Part 1 is COMPLETE — all 13 FRs shipped + live-verified.** The draft global-styles extractor's follow-up set (FR-33-5/6/12/13 + the component-CSS migration) is done. Spec 33 → v1.1.0 COMPLETE. Three commits, all on `main`, pushed.
2. **FR-33-12 fail-closed freshness gate (D320, `03d98c97`).** `/sgs-clone` now HALTs unless the canonical `theme-snapshot.json` carries an `_sgsExtractor.draft_css_sha256` matching the current draft. New `scripts/shared_utils.py` = single-source `extract_css`/`css_sha256` (no hash drift). A `feature-dev` code review caught a blocker in the first design (freshness tied to the generated file, not the file the converter reads) — fixed by embedding the key IN the canonical snapshot.
3. **FR-33-5 Pass B advisory + FR-33-6 dark-theme (D321, `f8e8ab1e`).** `derive.py` derives a palette for token-less drafts (usage-context role, not frequency; `advisory:true`, never auto-live; `push-theme-snapshot --include-advisory` gates it). `extract._theme_background` picks the widest content-containing ancestor (dark discarded only on a positive preview-shell signal; `measure.js` now records marker DOM paths — a qc-council forensics rater caught the original had no path data).
4. **FR-33-13 namespace + component-CSS migration + button hover-transform (D322, `3e03e810`).** Snapshot reserves `settings.custom.header`/`.footer` (+ reconciliation note: Spec 17 uses Customiser/JS-var, so Part 2 decides). The transitional `styles.css` (2273→117 chars) migrated: dead rules (is-style buttons/hero-cta/page-hacks) dropped, focus-visible → theme `utilities.css`, product-card client vars kept. Button now consumes the open-bag `hover-transform` token.
5. **Deployed + LIVE-VERIFIED clean on sandybrown page 8** — focus-visible `solid` from `utilities.css?ver=1.5.8`; `--sgs-op-sel-text`=#3A2E26; buttons rest `rgb(230,138,149)`/hover `rgb(65,50,43)` unchanged; hover-transform inert `none`; 0 console errors; visual intact 1440+375. LiteSpeed v7.8.1 confirmed active (dev-setup.md corrected).
6. **Process caught two real errors pre-ship:** the code review (freshness gate wrong file) + the council spec-lawyer (dropping hover-transform violated FR-33-4 open-bag → reversed to the render-side fix).

## Current State
- **Branch:** `main` at `3e03e810` (pushed; D320 `03d98c97` → D321 `f8e8ab1e` → D322 `3e03e810`).
- **Tests:** extractor 26/26 pass (8 new this session); converter/orchestrator suites green; frozen hex-helper golden (FR-33-10) intact; determinism byte-identical. (60 pre-existing failures in `test_two_axis_style_variations.py` are missing style-variation data files, unrelated.)
- **Build:** plugin built + deployed; theme deployed. `build/` is gitignored (source-only commits).
- **Uncommitted changes:** only pre-existing session-start dirty files (HTML_Insert.html, reports/inline-styling-audit, lucide-icons.php, package-lock.json, phase4-*.txt, *.db, rr.json) — NOT touched this session.
- **Live:** sandybrown page 8 driven by the reduced snapshot + migrated theme CSS; caches cleared (OPcache + LiteSpeed + CDN).

## Known Issues / Blockers
- None block the next session. The FR-33-12 gate is live — any `/sgs-clone` run now requires a fresh extractor snapshot for the client (or `--skip-freshness-gate` for extract-only/diagnostic runs).

## Next Priorities (in order)
1. **Roll out the extractor to the other 5 client snapshots** (indus-foods, helping-doctors, + 3) — each behind its OWN reclone + per-client visual/computed-parity (FR-33-11 Mama's-only rule; do NOT snapshot-push without a reclone — that was the D318/D319 pink regression).
2. **Part 2 — header/footer clone (Spec 17).** The header/footer SETUP pipeline's second half: clone the draft header/footer into SGS template parts. Decide the FR-33-13 tokenise-vs-Customiser question first (Part 1 reserved `settings.custom.header`/`.footer`; Spec 17's built model uses the Customiser + JS-measured height).
3. **Optional block-quality:** wire a client draft with a button hover-transform to prove the D322 hover-transform capability end-to-end (Mama's is colour-invert, so it's currently inert-but-verified).

## Files Modified
| File | What changed |
|---|---|
| plugins/sgs-blocks/scripts/shared_utils.py | NEW — single-source extract_css + css_sha256/draft_css_sha256 |
| plugins/sgs-blocks/scripts/theme-extractor/{extract.py, derive.py, measure.js} | freshness embed + Pass B + dark-theme + namespace reserve; derive.py NEW |
| plugins/sgs-blocks/scripts/theme-extractor/tests/test_extractor.py | +8 tests (FR-33-5/6 + advisory strip) |
| plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py | `_freshness_gate` + `--skip-freshness-gate` |
| plugins/sgs-blocks/scripts/push-theme-snapshot.py | `strip_advisory` + `--include-advisory` |
| scripts/qc-correctness-regression.py | passes `--skip-freshness-gate` |
| plugins/sgs-blocks/src/blocks/button/{style.css, block.json} | hover-transform consumption; version 1.5.0→1.5.1 |
| theme/sgs-theme/assets/css/utilities.css + style.css | focus-visible migrated in; Version 1.5.7→1.5.8 |
| sites/mamas-munches/theme-snapshot.json | styles.css reduced to rule 9; header/footer reserved; _sgsExtractor |
| reports/visual-diff/button-2026-07-13.md | NEW — button visual-diff (PASS) |
| .claude/{decisions.md, parking.md, dev-setup.md, specs/33-*.md} | D320/321/322; parking re-point; LiteSpeed fix; spec → v1.1.0 |

## Notes for Next Session
- **The FR-33-12 gate reads the EMBEDDED `_sgsExtractor` key in `theme-snapshot.json`**, not a sibling file — so the freshness proof is tied to the exact file the converter loads. Regenerating a client snapshot additively (`extract.py --merge-onto <snapshot> --out <snapshot>`) keeps the hash if the draft CSS is unchanged.
- **Pass B (derive.py) only fires when Pass A is empty** (token-less draft) — Mama's is token-rich so it never fires. Advisory tokens are `advisory:true` + stripped by push unless `--include-advisory`.
- **The component-CSS migration was mostly dropping DEAD cruft** (live-DOM-confirmed: is-style buttons 0 matches, .sgs-hero__ctas 0 refs, page-29/144 404). Only focus-visible (→theme) + product-card vars (kept) were load-bearing.
- **LiteSpeed IS active on sandybrown (v7.8.1)** — always `wp litespeed-purge all` after a CSS deploy (dev-setup.md was stale, now corrected).

## Next Session Prompt
See `.claude/next-session-prompt.md` (other-5-client rollout + Part 2 orchestration + carried-forward STOP catalogue + reading gate).
