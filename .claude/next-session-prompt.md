---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-06-02-merge-prep-image-sideload-phase2-fidelity
generated: 2026-06-01
primary_goal: "FR-22-19 composite scalar-media (hero + testimonial-slider), trust-bar FR-24-10 dual-mode, and cta-section FR-22-6 are SHIPPED + LIVE-DOM VERIFIED on branch feat/fr22-4-1-universal-wrapper (NOT merged; decisions D130-D132). Next: (1) real image sideload (media-map — biggest remaining pixel-diff lever; hero/product images are dry-run 404s); (2) merge-prep (split d6358f32 per-block per R-22-5 + Bean visual sign-off → merge to main); (3) isEligible on hero/info-box deprecations; (4) Phase-2 scalar-attr extraction (fidelity); (5) product-card + sgs/option-picker build (pending Bean's 6 design decisions)."
---

# Next Session — Merge-prep + image-sideload + Phase-2 fidelity (FR-22-19/24-10/FR-22-6 SHIPPED + live-verified)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — then read the full list below ⚠
> Invoke `/autopilot` first. Then read the MANDATORY READING LIST **end-to-end, not grep-skim**, before any work. The 2026-06-01 sessions SHIPPED + **LIVE-DOM VERIFIED** the FR-22-19 composite scalar-media engine (hero + testimonial-slider), the trust-bar FR-24-10 dual-mode, and the cta-section FR-22-6 migration — all on branch `feat/fr22-4-1-universal-wrapper`, **NOT merged**. A 3-rater qc-council confirmed the code is rule-clean. Do NOT re-derive any of it. Quote the STOP catalogue + pre-flight ritual back to yourself before acting.

## Branch + state
- **Branch:** `feat/fr22-4-1-universal-wrapper` (6 commits ahead; **NOT merged** to main). main clean.
- **Canary page 144 reflects the SHIPPED + LIVE-DOM-VERIFIED state** (run `mamas-munches-144-2026-06-01-035323`).

## ✅ SESSION-2 SHIPPED + LIVE-DOM VERIFIED (decisions D130-D132) — DO NOT re-derive
Commits: `83a55820` + `5859c42d` (hero scalar-media + gate fix) · `d6358f32` (cta-section FR-22-6 + trust-bar dual-mode + converter sourceMode) · `b83cd312` (hero `$is_split` media fix + spec role-name).
- **Hero (§FR-22-19 scalar-media):** double-wrapper FIXED (live: 1 `.sgs-hero__content`, was 2) + media column + 2 art-directed `.sgs-hero__split-image` (mobile/desktop) render live. Gate = **`has_scalar_media_attrs`** (covers hero + testimonial-slider; excludes cta/info-box/product-card). The content-column path folds slug-None wrappers but emits slug-resolved children as their block (FR-22-4.1 #2/#3). render.php `$is_split` fires on present split media.
- **Trust-bar (§FR-24-10 dual-mode):** Bound mode renders the 4 cloned badges live (`sourceMode:bound`); pixel −5.2 to −6.7pp (strongest measured win). Typed (curated repeater) preserved.
- **cta-section (FR-22-6):** full migration (render echoes $content; edit.js heading+text+buttons template; deprecated v5 + `isEligible`). Editor-verified (not on Mama's homepage).
- **Converter:** sets `sourceMode='bound'` on any block declaring a `sourceMode` attr when it emits cloned InnerBlocks (DB-driven, no slug literal).
- **3-rater qc-council:** all new code PASS R-22-1/2/3/9/14 + FR-22-2.2. Findings catalogued in decisions **D132**.

## REMAINING (priority order — NOT done):
1. **Real image sideload (media-map)** — hero/product/brand images are dry-run URLs (404 live). The single biggest remaining pixel-diff lever. Wire Stage-4i real WP media IDs (not dry-run) → re-clone → the hero/product images render.
2. **Merge-prep → main:** split `d6358f32` into per-block commits (R-22-5); Bean visual sign-off (R-22-13); then merge `feat/fr22-4-1-universal-wrapper` → main.
3. **`isEligible` on hero/info-box deprecations** (latent — their scalar→InnerBlocks `migrate()` may never fire for existing posts; copy the pattern from cta-section `deprecated.js` v5).
4. **Phase-2 scalar-attr extraction** (476 leftover `extraction_failed` = styling/layout attrs: columns/gap/sizing/typography — not blocking structure; fidelity refinement).
5. **Investigate:** featured-product 375 +11.1pp (likely reflow noise — renders 553 chars live); `stage-4j` charmap-stdout bug (add `sys.stdout.reconfigure(encoding='utf-8')`; the markup itself is UTF-8-clean); pre-existing `_atomic_attrs_for` per-slug conditionals (R-22-1 carry-over, NOT introduced this session); critical-fix-verification stale baseline (deleted trust-badges dir — benign).
6. **product-card + `sgs/option-picker` build** — design done (`.claude/reports/2026-06-01-product-card-option-picker-design.md` + Spec 24 §FR-24-11..17 stub); needs **Bean's 6 decisions** (in the report) before Phase A.

## MANDATORY READING LIST (read FULLY before any work — Bean directive)
1. This file.
2. `.claude/handoff.md` (2026-06-01).
3. `.claude/state.md` — current_phase + db_state + blockers.
4. Root `CLAUDE.md` — "Root-cause methodology (MANDATORY)" + the 14 binding rules (R-22-1..14).
5. `git log --oneline -12` + read the recent commit messages (each carries root-cause + verification).
6. `.claude/decisions.md` newest entries — **D130-D132 (SHIPPED + live-DOM verified + 3-rater qc-council), D128-D129 (scalar-media engine built + product-card/picker design), D125-D127 (H-conv chosen over H2 + trust-bar dual-mode)**, then D119-D124 (fold + Wave-1/2/A-1), D117/D118.
7. **`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — esp. §FR-22-19 (the scalar-media engine — SHIPPED + live-verified), plus §0, §FR-22-2/2.2/2.4 (`scalar-media` role reconciliation), §FR-22-3 (3-exceptions, no 4th branch), §FR-22-4/4.1, §FR-22-16 (class-section voter), §FR-22-17 (block_composition), §6 (R-22-1..14).**
8. **`.claude/scratch/2026-06-01-hero-fix-shape-qc-brief.md` — the council brief (H-conv vs H2, ground truth, the 3 raters' questions). The build executes §FR-22-19, this is the reasoning behind it.**
9. **`.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — NEW §FR-24-10 (trust-bar dual-mode) + FR-24-1/2/3/9 (product-card dual-mode, same pattern).**
10. `.claude/parking.md` — P-HERO-DOUBLE-WRAPPER-AND-SPLIT-IMAGE (now §FR-22-19), P-TRUST-BAR-HYBRID-MIGRATION (now §FR-24-10 dual-mode), P-PRODUCT-CARD-FULL-DUAL-MODE, P-A1-PHASE2-SLOT-RESPONSIVE-TYPOGRAPHY.
11. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — debug-artefact map (read BEFORE conjecturing).
12. `.claude/cloning-pipeline-flow.md` + `-stages.md`.
13. `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` — §2 (hero), §3 (trust-bar).
14. Wireframe: `wireframe-wave1-full.jpeg` (hero = RED; the structural-parity measurement artefact).
15. Hero block (read FULLY before touching): `plugins/sgs-blocks/src/blocks/hero/{render.php,edit.js,block.json}` — note render.php:760-788 (the WORKING `--mobile/--desktop` art-direction `@media` CSS — this is why H-conv keeps render.php untouched).
16. The walker: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — `walk()` ~1693-1872, `_atomic_attrs_for` ~1563-1664, `is_class_section_block` path.

## What shipped 2026-06-01 (design → build → LIVE-DOM verify; full record in decisions D125-D132)
- **Design:** 3-rater qc-council REJECTED H2 (thin-shell — would retire the hero's 169-attr image pipeline) + locked **H-conv**. The DB audit closed the "open gap" with EXISTING columns — a new **`scalar-media`** role + `scalar_media_attr_for` slot lookup; NO new column.
- **Built + shipped (commits 83a55820/5859c42d/d6358f32/b83cd312):** §FR-22-19 scalar-media engine (hero + testimonial-slider; gate **`has_scalar_media_attrs`**); trust-bar §FR-24-10 dual-mode; cta-section FR-22-6; converter `sourceMode='bound'`.
- **Live-DOM verified** (run `mamas-munches-144-2026-06-01-035323`): hero 1 `.sgs-hero__content` + media column + 2 art-directed split-images; trust-bar Bound 4 badges (−5.2..−6.7pp); 3 `sgs/testimonial` intact; no regressions.
- Product-card + `sgs/option-picker` DESIGNED (report + Spec 24 §FR-24-11..17 stub, pending Bean's 6 decisions).

## NEXT SESSION — priority order (the §FR-22-19/24-10/FR-22-6 BUILD IS DONE + verified)
**See the `## REMAINING (priority order — NOT done)` block near the TOP of this file** — the actual remaining work: (1) real image sideload (media-map — biggest pixel-diff lever); (2) merge-prep (split `d6358f32` per-block R-22-5 + Bean visual sign-off → merge to main); (3) `isEligible` on hero/info-box deprecations; (4) Phase-2 scalar-attr extraction (fidelity); (5) generalise §FR-22-19 to cta-section/modal/quote; (6) product-card + `sgs/option-picker` build (pending Bean's 6 decisions in the design report); (7) A-1 Phase 2 slot typography; minors (clean up stray git-tracked `src/blocks/trust-badges/` deletions at merge-prep).

## RESOLVED misunderstandings (do NOT repeat)
- **The hero fix is CONVERTER-side (H-conv), NOT a render.php thin-shell (H2).** render.php is ALREADY correct (its 169-attr image pipeline + the `--mobile/--desktop` art-direction `@media` CSS at render.php:760-788 already work). H2 was REJECTED by qc-council (retires that pipeline + violates "preserve full functionality"). Do NOT re-derive H2.
- **The hero's `splitImage`/`splitImageMobile` (+ testimonial-slider.sideImage) are `scalar-media`-role slots, not InnerBlocks slots** — the role (styling-behaviour class) makes `equivalent_block_for` return NULL (the FR-22-2.2 gate working as designed, NOT a per-block bypass). The role is named `scalar-media` everywhere (`image-pipeline` was a retired draft name).
- **`sgs/container` DOES support per-grid-item customisation** (D124) — `gridItem*` defaults (→ `--sgs-gi-*`) + per-child overrides via specificity (`edit.js:577`).
- **Atomic tags redirect to sgs equivalents via `blocks.replaces`** (Spec 22 §14), populated D120-B.
- **Recognition is BEM, not HTML tag** (R-22-2). Only non-content transparent WRAPPER divs dissolve (CSS folds up per §FR-22-4.1).
- **FR-22-18:** layout/wrapper/logic acceptance = rendered-DOM structural parity + live-DOM, NOT pixel-diff (informational-only this phase).
- **trust-bar "renders fine" is a coincidence** — it shows its DEFAULT `items`, which happen to match Mama's; it ignores the converter's badge InnerBlocks. The dual-mode build (§FR-24-10) makes it render the cloned content while keeping the curated editor.

## Anti-pattern STOP catalogue — carried forward + extended per D101 (if you find yourself doing X, STOP)

| # | If you find yourself | STOP — because |
|---|---|---|
| 1 | Grep-skimming Spec 22 instead of reading sections end-to-end | Cornerstone §FR-22-2/2.1/2.2/2.5 defines `equivalent_block_for()`. READ FULLY. |
| 2 | Referencing `slot_synonyms`/`legacy_role_lookup` as live tables | DROPPED D99. Live = `slots` (composite PK `(slot_name,scope)`, 92 element + 4 section) + `roles` (20). |
| 3 | Referencing `slot_synonyms.role_classification` column | Retired D99 → `roles` table (`classification='content-bearing'`). |
| 4 | Treating `.claude/` + `.agents/` sgs-framework.db as two DBs | Same physical file (NTFS junction). Real two DBs = sgs-framework.db + ui-ux-pro-max.db. |
| 5 | Building a bespoke SGS block per mockup section | R-22-9 violation. ~67 reusable primitives; section variation via slots + FR-22-4 default. |
| 6 | Adding `if(empty($content)&&!empty($legacy_attr)){scalar render}` to a migrated render.php | R-22-14 violation. Backwards-compat = roster migration + WP-CLI batch, never per-block fallback. |
| 7 | Batching multiple DB row changes then measuring once | Row-by-row gate: ship one + measure between each. |
| 8 | Routing a section-root BEM class to a content-block primitive | Section roots → sgs/container (or FR-22-4 default). |
| 9 | Proposing a fix-shape without reading the relevant Spec section + flow + stages end-to-end | State the architectural primitive in plain English FIRST. |
| 10 | Acting on a doc/handoff claim without grep-verifying against the codebase | 60s find/grep/ls BEFORE acting. |
| 11 | Using `sgs-db.py sql` for INSERT/UPDATE/DELETE | Wrapper is read-only (silently no-ops). Use direct `sqlite3` for writes. |
| 12 | Shipping a fix without tracing the EXACT emission path of the canary instance | Trace which slug RECEIVES the affected attr now, not which COULD. |
| 13 | Treating the literal-slug-match voter path as live | Retired D107. Voter queries `blocks.tier='class-section'` (declared via `supports.sgs.is_section_root`). |
| 14 | Re-enabling the reverted XS-3 walker condition | Resolved by FR-22-4.1 fold. Don't re-derive the old predicate. |
| 15 | Batching `block_composition`/DB-row changes then measuring once | Ship one row at a time with measurement between. |
| 16 | Hardcoding `__products`/`__cards`/`__media`/generic BEM slot → specific block slug in Python | R-22-1 violation. Route via DB; fall through to sgs/container default. |
| 17 | Treating "code reverted" as "all related updates deferred" when applying docs | Distinguish: (a) code reverted, (b) DB rows persisted, (c) shipped tasks unaffected. Map blast radius first. |
| 18 | Accepting a subagent threshold/result without sanity-checking vs architectural intuition | If count is wildly off the expected roster, the threshold is wrong — fix before accepting. |
| 19 | Iterating inline on a failing fix under context pressure when measurement shows regression | Roll back fast; re-tune across a session boundary with evidence baked in. |
| 20 | Trusting a per-section pixel-diff WIN without checking live-DOM textLen | An EMPTY section scores a FALSE win (empty=shorter crop=more matching bg). Verify `el.innerText.trim().length` + element counts (R-22-11). |
| 21 | Assuming the walker runs FR-22-2 content-routing automatically | Confirm leaf content-routing + the fold actually fire; verify emitted markup. |
| 22 | Treating a renamed/migrated block as "done" without verifying its render mode | trust-bar (renamed) reads scalar `items` — a HYBRID. It renders its DEFAULTS, not cloned content (coincidental Mama's match). §FR-24-10 dual-mode. |
| 23 | Routing pack-size/option pills to `sgs/label` (or `sgs/button`) | Pills are an exclusive interactive picker → a FUTURE dedicated atomic pill block (Bean), NOT label/button. |
| 24 | Trusting a per-section pixel-diff change (either direction) over live DOM | Pixel-diff mis-scores structural change BOTH ways. FR-22-18: structural parity from rendered HTML is the gate; pixel-diff informational-only this phase. |
| 25 | Shipping a self-labelled "Phase 1" / "simpler-than-spec" shortcut | Implement the spec's ACTUAL mechanism. Inventing simpler-than-spec = re-read the spec. |
| 26 | Asserting what ANY block can/can't do from a partial attr dump | READ block.json + edit.js + render.php + `/wp-blocks` before asserting capability. |
| 27 | Giving up after one shortcut fails; not using the toolkit | For EVERY gap: root-cause from trace+live-DOM, find why same-class peers PASSED, ONE unified systemic fix. Use the full toolkit every step. |
| 28 | Using pixel-diff during structural work | Measure from RENDERED HTML for layout/wrapper/logic. Pixel-diff informational-only (FR-22-18). |
| 29 | Over-checkpointing (burning Bean's context with questions) | If evidence is clear, DECIDE + execute. Only ask when a decision genuinely changes direction AND can't be resolved from code/spec/evidence. |
| 30 | Proposing a block become a "thin shell" without reading its render.php's FULL pipeline | NEW 2026-06-01. The hero render.php ALREADY had a working 169-attr image pipeline + `--mobile/--desktop` art-direction `@media` CSS (lines 760-788). The H2 thin-shell would have retired all of it onto sgs/media (can't replicate) → "preserve full functionality" violation. qc-council caught it. Read the FULL render.php before deciding the fix LAYER. |
| 31 | Deciding the fix is block-side because "the block looks wrong" | NEW 2026-06-01. When a render.php "already works" for one input model, the fix may be CONVERTER-side. The hero double-wrapper was a CONVERTER emit-shape bug, not a render.php bug — render.php was already correct for bare-content + scalar-media. Verify which layer emits the wrong shape (read the converter's actual output AND the render.php's expected input). |
| 32 | Ramming a sensitive/high-blast-radius walker change at a context-heavy session tail | NEW 2026-06-01. Composite slot-routing / className-preservation touch many sections. Design + `/qc-council` validate the fix-shape + focused build with the design baked in — do NOT half-build under context pressure (extends STOP #19). |

## Mistake analysis — what to keep doing (2026-06-01 session did these RIGHT)
| Did right | Why it mattered | Keep doing |
|---|---|---|
| Read the FULL hero render.php before choosing the fix layer | Revealed the art-direction already works → flipped H2→H-conv | STOP #30/#31: read the block's full render.php before declaring a thin-shell fix |
| Ran the qc-council BEFORE building | Caught that H2 retires the image pipeline (functionality loss) | blub.db 255 / R-22-12: multi-rater gate on every converter/block fix-shape |
| Captured the council verdict into the spec instead of ramming the build | Sensitive walker work + heavy context = STOP #19 territory | STOP #32: design + focused build for sensitive walker changes |
| Surfaced the genuine block-vs-fold / dual-mode design forks to Bean | They're his architecture calls (ADHD Rule 9) + overlap his atomic-block strategy | Negotiated-decision menu for genuine forks; decide-and-execute for evidence-resolvable ones |

## Pre-flight self-attestation ritual (answer ALL inline before any fix-shape or dispatch)
1. Architectural primitive in plain English (Spec 22 §0)?
2. Which R-22-N binding rule(s) govern this? (esp. R-22-1 DB-first, R-22-3 no-4th-branch, R-22-9 universal, R-22-14 no-fallback)
3. Did I READ the block's block.json + edit.js + render.php (FULL pipeline) + `/wp-blocks` before asserting its capability or proposing a thin-shell? (STOP #26/#30)
4. Is this the spec's ACTUAL mechanism (§FR-22-19 for hero, §FR-24-10 for trust-bar), or a shortcut? (STOP #25)
5. Which LAYER emits the wrong shape — converter or block? Did I read BOTH the converter's actual output AND the render.php's expected input? (STOP #31)
6. Root cause from trace + live DOM — why did same-class peers PASS? (STOP #27)
7. Unified systemic + DB-driven fix (helps all same-class cases, no per-block slug conditional), not a cheat? (STOP #16)
8. Measuring from rendered HTML + live-DOM gate, not pixel-diff? (STOP #28)
9. Is this a sensitive/high-blast-radius walker change at a context-heavy tail → design + qc-council + focused build? (STOP #32)
10. Genuinely Bean's decision, or resolvable from evidence + execute? (STOP #29)

## Tooling
`/autopilot` (first) · `/sgs-wp-engine` · `/wordpress-router` · `/sgs-clone` · `/wp-blocks` · `/sgs-db` (read) + direct `sqlite3` (writes) · `/systematic-debugging` · `/qc-council` (per converter/block commit — MANDATORY) · `/verify-loop` · `/dispatching-parallel-agents` + `/subagent-driven-development` · `/delegate` · Playwright MCP (live-DOM gate) · `build-deploy.py --target sandybrown --blocks-only --allow-dirty` · `sgs-update-v2.py` · `/handoff`.
SGS visual-diff commit gate fires on block changes; for non-visual/logic/meta it sanctions `--no-verify` (structural phase; pixel reports informational only).
