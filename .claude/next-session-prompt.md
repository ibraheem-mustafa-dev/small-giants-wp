---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-06-01-hero-h-conv-build-plus-trust-bar-dual-mode
generated: 2026-06-01
primary_goal: "Build the hero composite fix via Spec 22 §FR-22-19 (H-conv: converter routes the hero's content-column children → bare $content InnerBlocks; the __media images → scalar splitImage/splitImageMobile) — CLOSING THE OPEN GAP first (a DB-first mapping of a composite's media-column BEM element → its scalar attr target; never a per-block slug conditional). render.php/edit.js/block.json stay UNCHANGED. Then build the trust-bar dual-mode (Spec 24 §FR-24-10: Typed curated repeater OR Bound echo $content via a Source-toggle mode attr). All measured from RENDERED HTML (FR-22-18 structural parity + live-DOM gate), NOT pixel-diff."
---

# Next Session — Build hero §FR-22-19 (H-conv) + trust-bar §FR-24-10 dual-mode

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — then read the full list below ⚠
> Invoke `/autopilot` first. Then read the MANDATORY READING LIST **end-to-end, not grep-skim**, before any work. The 2026-06-01 session did the full read + full code-level root-cause + a 3-rater qc-council, which REJECTED the obvious "block thin-shell" fix (it would have retired the hero's rich image pipeline + art-direction → violated "preserve full functionality") and locked H-conv instead. Do NOT re-derive H2. Quote the STOP catalogue + pre-flight ritual back to yourself before acting.

## Branch + state
- **Branch:** `feat/fr22-4-1-universal-wrapper` (NOT merged to main). main clean.
- Canary page 144 reflects the run-223313 build. **Hero §FR-22-19 is now BUILT + EMIT-PROVEN (2026-06-01 session 2) — live-DOM confirmation is the only remaining gate.**

## ⚡ HERO §FR-22-19 — BUILT + EMIT-PROVEN; RESUME HERE (do this FIRST)
**Code written + reviewed + DB-verified + emit-proven.** What's done:
- `db_lookup.py`: `scalar-media` role added to `_ROLE_CLASSIFICATION_MAP`; new `scalar_media_attr_for(slug, bem_element)`.
- `convert.py`: `_lift_scalar_media_from_img()` + `_route_composite_interior()` + the `is_class_section_block` gate at the children-recursion block (~line 2038). R-22-3 compliant (no 4th branch).
- **DB UPDATED (direct sqlite3, survives /sgs-update):** `sgs/hero.splitImage` + `splitImageMobile` → `(canonical_slot='media', role='scalar-media')`. Verified: `equivalent_block_for('sgs/hero','splitImage')` → None; `scalar_media_attr_for('sgs/hero','split-image')` → splitImage; `is_class_section_block('sgs/hero')` → True.
- **EMIT PROOF (ran the walker on the hero mockup section):** hero now emits `sgs/hero {splitImage:{IMG_…webp}, splitImageMobile:{aesthetic-pic.jpeg}}` + bare content InnerBlocks (label/heading/text + `__ctas` container) — **double `.sgs-hero__content` GONE, both imgs lifted to scalar with correct mobile/desktop disambiguation.** Exactly the §FR-22-19 predicted structure.

**REMAINING for the hero (the live-DOM gate + commit):**
1. `/sgs-clone --converter-v2 --debug-trace --spec-22-acceptance --deploy-target page:144` (canary).
2. **Live-DOM gate (Playwright, R-22-11):** `section.sgs-hero` has exactly **1** `.sgs-hero__content`, exactly **2** imgs (`--mobile` + `--desktop`, one hidden per breakpoint), `h1` present, 2 `.sgs-button`, `.sgs-hero__content` innerText > 50; AND **no other section's extract.json markup changed** (only sgs/hero is `is_class_section_block` on this page, so blast radius = hero only).
3. `/qc-council` on the convert.py + db_lookup.py diff (R-22-12 / blub.db 255) — the converter change has NOT been council-reviewed yet.
4. Commit (code + DB note) once live-DOM + qc-council pass. Roll back fast on any regression (STOP #19).

**RESOLVED 2026-06-01 (Bean caught it) — gate broadened + fold refined:** the gate is now **`db.has_scalar_media_attrs(slug)`** (NOT `is_class_section_block`). `testimonial-slider` is a composite (content-block, not section-root) — the old gate missed it. New gate covers hero + testimonial-slider, excludes cta-section/info-box/product-card (no scalar-media attr → router never fires → **cta-section latent risk resolved**, no behaviour change). The content-column path was refined to **fold only slug-None transparent wrappers**, and **emit slug-resolved children as their block** (so `article.sgs-testimonial` → `sgs/testimonial`, not folded). `sgs/testimonial-slider.sideImage` DB row updated (role=scalar-media, slot=media). **Emit-verified both sections:** hero lifts images + folds content; social-proof's 3 testimonials emit as `sgs/testimonial` blocks (unchanged from before — no regression). Still pending: the live-DOM gate + /qc-council (as above).

## MANDATORY READING LIST (read FULLY before any work — Bean directive)
1. This file.
2. `.claude/handoff.md` (2026-06-01).
3. `.claude/state.md` — current_phase + db_state + blockers.
4. Root `CLAUDE.md` — "Root-cause methodology (MANDATORY)" + the 14 binding rules (R-22-1..14).
5. `git log --oneline -12` + read the recent commit messages (each carries root-cause + verification).
6. `.claude/decisions.md` newest entries — **D125-D127 (this session: Wave-2 verified; hero H-conv chosen over H2; trust-bar dual-mode)**, then D119-D124 (fold + Wave-1/2/A-1), D117/D118.
7. **`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — esp. NEW §FR-22-19 (the hero H-conv fix-shape + build sequence + OPEN GAP), plus §0, §FR-22-2/2.2/2.4 (image-pipeline role reconciliation), §FR-22-3 (3-exceptions, no 4th branch), §FR-22-4/4.1, §FR-22-16 (class-section voter), §FR-22-17 (block_composition), §6 (R-22-1..14).**
8. **`.claude/scratch/2026-06-01-hero-fix-shape-qc-brief.md` — the council brief (H-conv vs H2, ground truth, the 3 raters' questions). The build executes §FR-22-19, this is the reasoning behind it.**
9. **`.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — NEW §FR-24-10 (trust-bar dual-mode) + FR-24-1/2/3/9 (product-card dual-mode, same pattern).**
10. `.claude/parking.md` — P-HERO-DOUBLE-WRAPPER-AND-SPLIT-IMAGE (now §FR-22-19), P-TRUST-BAR-HYBRID-MIGRATION (now §FR-24-10 dual-mode), P-PRODUCT-CARD-FULL-DUAL-MODE, P-A1-PHASE2-SLOT-RESPONSIVE-TYPOGRAPHY.
11. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — debug-artefact map (read BEFORE conjecturing).
12. `.claude/cloning-pipeline-flow.md` + `-stages.md`.
13. `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` — §2 (hero), §3 (trust-bar).
14. Wireframe: `wireframe-wave1-full.jpeg` (hero = RED; the structural-parity measurement artefact).
15. Hero block (read FULLY before touching): `plugins/sgs-blocks/src/blocks/hero/{render.php,edit.js,block.json}` — note render.php:760-788 (the WORKING `--mobile/--desktop` art-direction `@media` CSS — this is why H-conv keeps render.php untouched).
16. The walker: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — `walk()` ~1693-1872, `_atomic_attrs_for` ~1563-1664, `is_class_section_block` path.

## What shipped 2026-06-01 (docs only — no code; council prevented a wrong build)
- **Full read + code-level root-cause** of the hero double-wrapper + split-image, AND the trust-bar hybrid.
- **3-rater qc-council** (compliance / pipeline-impact / universality) on the hero fix-shape. Verdict: **REJECT H2** (block thin-shell — retires the 169-attr image pipeline + the render.php art-direction onto sgs/media which can't replicate it; blast radius 7 sections + 5 block files). **CHOOSE H-conv** (converter routes content→bare $content, images→scalar splitImage/splitImageMobile; render.php unchanged; 1-section blast radius; universal across the 4 `wraps_block` composites).
- **Spec 22 §FR-22-19** (hero H-conv design + build sequence + OPEN GAP) + **Spec 24 §FR-24-10** (trust-bar dual-mode) + decisions D125-D127 + parking updates.

## NEXT SESSION — priority order
1. **Build hero §FR-22-19 (H-conv).** READ §FR-22-19 end-to-end first. Steps (each a separate commit, R-22-5; FR-22-18 structural-parity gate + live-DOM check):
   1. **DB:** add `image-pipeline` role to the `roles` table; reclassify `sgs/hero.splitImage` + `splitImageMobile` to it; verify `equivalent_block_for('sgs/hero','splitImage')` returns NULL. (DB writes via direct `sqlite3`, NOT `sgs-db.py sql` — STOP #11. Row-by-row, STOP #7/#15.)
   2. **CLOSE THE OPEN GAP (DB-first):** add the mapping from a class-section composite's media-column BEM element (`__media`/`__split-image`) → its scalar attr target (`splitImage`/`splitImageMobile`) + the `--mobile`→mobile / `--desktop`→desktop disambiguation. Candidate: a `block_composition` column or a `slots` convention row. **NEVER a hardcoded `if slug=='sgs/hero'` (R-22-1 / STOP #16).**
   3. **convert.py:** composite slot-router inside the `is_class_section_block` path (DB-driven; NOT a 4th walker branch — it's FR-22-2 content-routing applied to composite interiors, R-22-3). Use `/qc-council` per converter commit (blub.db 255).
   4. **Verify (R-22-11 / FR-22-18):** `/sgs-clone --debug-trace --converter-v2 --spec-22-acceptance --deploy-target page:144` → live-DOM gate via Playwright: `section.sgs-hero` has exactly 1 `.sgs-hero__content`, exactly 2 imgs (`--mobile` + `--desktop`), `h1` present, 2 `.sgs-button`, content innerText > 50; AND no other section's extract.json markup changed. Roll back fast (STOP #19) on any failure.
   5. Bean visual sign-off (R-22-13).
2. **Build trust-bar §FR-24-10 dual-mode** — Typed curated repeater (preserve all 18 attrs + 3 variants) OR Bound `echo $content` via a Source-toggle mode attr. R-22-14 clean (mode attr, not `empty($content)` fallback). deprecated.js keeps v2/v3 + a mode-default entry. Build per its FR; verify both modes (editor smoke + clone render).
3. **product-card full dual-mode** (Spec 24 + atomic pill block + variation-sets logic — see P-PRODUCT-CARD-FULL-DUAL-MODE brain-dump). Spec the variation-sets requirement FIRST.
4. **A-1 Phase 2** — slot-level responsive typography lift.
5. **Generalise §FR-22-19** to cta-section/modal/quote (each own commit, after the hero proves the mechanism).
6. **Minors** (parking): A-1 `>1024` breakpoint edge; 3+ breakpoint trace; clean up stray git-tracked `src/blocks/trust-badges/` deletions on next commit.

## RESOLVED misunderstandings (do NOT repeat)
- **The hero fix is CONVERTER-side (H-conv), NOT a render.php thin-shell (H2).** render.php is ALREADY correct (its 169-attr image pipeline + the `--mobile/--desktop` art-direction `@media` CSS at render.php:760-788 already work). H2 was REJECTED by qc-council (retires that pipeline + violates "preserve full functionality"). Do NOT re-derive H2.
- **The hero's `splitImage`/`splitImageMobile` are scalar `image-pipeline` slots, not InnerBlocks slots** — reclassifying their role so `equivalent_block_for` returns NULL is the FR-22-2.2 gate working as designed, NOT a per-block bypass.
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
