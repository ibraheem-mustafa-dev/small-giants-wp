---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-14
session: D328 — FR-S9-6 closed (box/width/link-font-size → object model) + footer fidelity bug fixed + Spec 17 §S9 coverage audit
---

# Session Handoff — 2026-07-14 (D328)

## Completed This Session
1. **Task 1 — migrated live pattern instances flat→object (fixed a real fidelity bug).** The 3 blocks are file-based FSE patterns (`framework-footer-default.php`, `framework-header-default.php`, `parts/header.html`), NOT DB template parts. Their flat stored values (`gap:"48px"`, `gridTemplateColumns:"2fr 1fr 1fr"`, bottom `gap:"8px"`) were being coerced to block.json defaults by WP `prepare_attributes_for_render` — rendering the footer columns as equal thirds (not the draft's `2fr 1fr 1fr`) + the bottom gap as 48px (not 8px). Converted to object shape → both fixed live. Theme 1.5.12→1.5.13.
2. **Task 2 — box/width/link-font-size → object model on all 3 blocks (qc-council-gated).** padding/margin/maxWidth/contentWidth + adaptive-nav linkFontSize. Wrapper Change 1 (contentWidth token transform + maxWidth sanitiser in the object-emit, `$object_model`-gated). Removed `supports.spacing` + dead flat orphans from 3 block.json; new shared `ResponsiveBoxControls` editor; nav link font-size emitted block-owned. Footer bottom row `style.spacing`→object desktop tier (rater-B R2). Theme 1.5.13→1.5.14.
3. **`/qc-council` (2 cross-model raters) pre-build** — VALIDATED with 3 fixes baked in: R1 (drop `supports.spacing` else double-emit), R2 (footer bottom row also has `margin.top`), + confirmed the wrapper transforms don't regress the 50+ flag-off blocks.
4. **Live-verified everything** (sandybrown, full cache clear OPcache+LiteSpeed+CDN, 1440/375): footer bottom padding 24 + margin 32 + inner gap 8 inherit to mobile; columns 2fr 1fr 1fr→1fr; nav gap 28 + link 15; no overflow; 0 console errors. Build gates green; `/sgs-update --stage 1` re-registered 6 attr rows.
5. **Task 4 — Spec 17 §S9 coverage audit** (`.claude/reports/2026-07-14-spec17-s9-coverage-audit.md`): read-only FR-by-FR audit — 8/11 DONE, 3 open (FR-S9-8/9/10).
6. **Docs** — decisions.md D328, 3 visual-diff reports, state.md, this handoff.

## Current State
- **Branch:** `main` at `0fe3a5fe` (audit commit; Tasks 1+2 at `3ea21bdf`), both pushed.
- **Tests:** 34/34 responsive-engine unit tests pass; `npm run build` green (dead-control 0, control-ux PASS, conformance unchanged).
- **Build:** passes. **Deployed + live:** sandybrown carries all D328 changes, live-verified.
- **Uncommitted changes:** pre-existing session-start dirt only (lucide-icons.php build-regen, package-lock.json, reports/phase4-*.txt, root .db files) — NOT this session's.

## Known Issues / Blockers
- None block the next session. Pre-existing (out of FR-S9-6 scope, flagged in the audit): the shared `SGS_Container_Wrapper` has NO `style.border` emission (grep=0), so these blocks' `__experimentalBorder`-SkipSerialization borders (e.g. the footer bottom-bar 1px divider) never render. A universal wrapper-border-emit is a block-quality follow-up.

## Next Priorities (in order — BEAN'S DIRECTIVE: finish §S9 → confirm ALL Spec 17 covered → THEN Spec 33 Part 2)
1. **BUILD the 3 open §S9 FRs** so Spec 17 §S9 is totally covered (the hard gate): **FR-S9-8** per-device content adaptation (per-tier visibility, `showLabel`/`iconOnly` with `mailto:`/`tel:`, move-to-drawer, Indus reference pattern); **FR-S9-9** transparent-at-rest→solid-on-scroll no-code inspector toggle (extend `class-sgs-header-behaviours.php`, do NOT rebuild); **FR-S9-10** wire the existing FR-S4 Site Info store into the header (already in footer) + confirm global-style-token defaults. Each = its own `/strategic-plan` + `/phase-planner` + live-verify.
2. **Present the FR-S9-1..11 coverage audit for Bean's "totally covered" sign-off** once FR-S9-8/9/10 land.
3. **THEN start Spec 33 PART 2** — the header/footer CLONE pipeline (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER` = Spec 17 P5 / FR-S9-11 step 3). HARD gate: do NOT start until §S9 is confirmed totally covered.
4. **Optional block-quality follow-up:** universal `style.border` emission in `SGS_Container_Wrapper`.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` | object-emit: contentWidth token transform + maxWidth sanitiser |
| `plugins/sgs-blocks/src/blocks/{site-header-row,site-footer-row,adaptive-nav}/{block.json,edit.js}` | drop supports.spacing + flat orphans; object box/width attrs; ResponsiveBoxControls |
| `plugins/sgs-blocks/src/blocks/adaptive-nav/render.php` | link font-size block-owned emit (object) |
| `plugins/sgs-blocks/src/components/ResponsiveBoxControls.js` (NEW) + `index.js` | shared FR-S9-6 spacing/width panel |
| `theme/sgs-theme/patterns/framework-{footer,header}-default.php`, `parts/header.html` | instances flat→object; footer bottom row style.spacing→object; version 1.5.14 |
| `.claude/decisions.md`, `.claude/state.md`, `.claude/reports/2026-07-14-spec17-s9-coverage-audit.md`, `reports/visual-diff/*` | D328 record + audit + 3 reports |

## Notes for Next Session
- **File-based FSE, not DB template parts:** header/footer content lives in the pattern PHP + `parts/*.html` (byte-identical duplicates per FR-S1-2). "Re-save" = edit the pattern markup, not a Site-Editor DB override.
- **Object-typed attrs coerce flat values to defaults:** WP `prepare_attributes_for_render` rejects a flat string against an `object` schema and substitutes the block.json default. Any pattern/emit MUST use the object shape or the authored value is silently lost.
- **Wrapper reads `style.spacing` unconditionally (L938):** a block on the object model MUST drop `supports.spacing` AND migrate any `style.spacing` in its instances to the object, else double-emit + the WP Dimensions panel stays visible.
- **contentWidth object needs the token-resolver transform** in the object-emit (else `max-width:normal`); maxWidth needs the length sanitiser. Both are `$object_model`-gated.
- **uid changes on shape/value change are EXPECTED** (content-driven hash), not ksort churn (STOP-NO-KSORT is about identical content → identical uid).

## Next Session Prompt

See `.claude/next-session-prompt.md` (canonical) — it carries the full MANDATORY READING GATE, the anti-pattern STOP catalogue, the pre-flight self-attestation ritual, and the per-FR orchestration plan for FR-S9-8/9/10.
