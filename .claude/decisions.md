# small-giants-wp — Architectural Decisions Log

<!-- ACTIVE — last 50 decisions (compressed format). Older or non-load-bearing → memory/decisions-archive.md. Deleted entries listed in git log only. -->

Append-only. Most-recent first.

---

## 2026-06-01 — Hero composite fix-shape: qc-council rejects H2, chooses H-conv (D125-D127)

**D125 — Wave-2/A-1 VERIFIED on live canary (run 223313, committed `0f52a3ba` before this session). 6/7 sections structurally green; hero the one RED.** Fresh build+deploy+re-clone confirmed: brand 2-col, featured/ingredients/gift/social headings+content render, per-device attrs lifted, trust-bar block-routed (renders 4 badges — but via the hybrid block's DEFAULT `items`, which coincidentally match Mama's, NOT the converter's content). Two findings open: hero double-`.sgs-hero__content` + both split-images showing; trust-bar hybrid (renders defaults not cloned content). Pixel 64.60→63.49 (informational, FR-22-18).

**D126 — Hero fix is CONVERTER-side (H-conv), NOT a block thin-shell (H2). qc-council 3-rater gate (compliance/pipeline-impact/universality) REJECTED H2.** Root cause (R-22-11, code-level): the walker emits the hero interior as two generic `sgs/container` columns (§FR-22-4.1); render.php ALSO wraps `$content` in `.sgs-hero__content` + renders its own scalar media column → double-wrapper + classless `sgs/media` children the art-direction CSS can't target. **render.php is ALREADY correct** for a bare-content + scalar-media model (its 169-attr image pipeline + the `--mobile/--desktop` art-direction `@media` CSS at render.php:760-788 already work). **H2 (thin-shell render.php + images→sgs/media children + universal className-preservation) was REJECTED** by all 3 raters: (a) retires the hero's rich image pipeline + the render.php-authored art-direction onto sgs/media which can't replicate it → violates Bean "preserve full functionality"; (b) blast radius = 7 sections + 5 block files + deprecated.js migration + invalidates the pixel-diff baseline (className-preservation touches every BEM-resolved block). **H-conv chosen** (route content→bare `$content` InnerBlocks, images→scalar `splitImage`/`splitImageMobile`): render.php/edit.js/block.json UNCHANGED, blast radius = 1 section, preserves all functionality, and is the universal Phase-2 mechanism for all 4 `wraps_block` composites (hero/cta-section/modal/quote) + the wider FR-22-6 roster (R-22-9). Captured as **Spec 22 §FR-22-19** (DESIGN; build pending). FR-22-2 tension (image-object→child) reconciled by classifying `splitImage`/`splitImageMobile` as a scalar `image-pipeline` role (one DB row → `equivalent_block_for` returns NULL → FR-22-2.4 scalar lift). **OPEN GAP** (Raters A+B): no DB column yet maps a composite's media-column BEM element → its scalar attr target; the build MUST add this DB-first (never a per-block slug conditional, R-22-1). Sensitive walker work → focused build next session per STOP #19, NOT rammed at this context-heavy session tail. Council artefact: `.claude/scratch/2026-06-01-hero-fix-shape-qc-brief.md`. Lesson reinforced: the qc gate caught H2 before it shipped + lost functionality (`feedback_qc_council_cross_family_triangulation_finds_bugs`).

**D127 — Trust-bar is dual-mode, not a naive InnerBlocks migration. Captured as Spec 24 §FR-24-10.** The renamed `sgs/trust-bar` renders on the canary via its DEFAULT `items` (coincidental match) — the real issue is it ignores the converter's emitted badge InnerBlocks (run 223313 ground truth: `sgs/trust-bar > sgs/container.__inner > 4× sgs/container.__badge > sgs/icon + sgs/text`). A naive FR-22-6 migration to `echo $content` would gut the curated icon-picker repeater + 3 badge variants (violates "client experience primary"). Resolution: dual-mode (Typed curated repeater OR Bound `echo $content`) per a Source-toggle mode attr — same pattern as the product-card (Spec 24 FR-24-2). R-22-14 clean (mode attr, not `empty($content)` fallback). Bean chose the full dual-mode path 2026-06-01 (accepted it continues past the hero into a focused session). Badge children use existing primitives (no new atomic block). All 18 attrs + 3 variants preserved.

---

## 2026-05-31 (pm) — Wrapper mechanism perfected: recursive fold + Wave-1/Wave-2/A-1 (D119-D124)

**D119 — Recursive fold (FR-22-4.1) IMPLEMENTED** (branch `feat/fr22-4-1-universal-wrapper`, `ce07728d`). The earlier "Phase-1 shortcut" (own-container-for-all) over-nested + broke brand's 2-col grid (+44pp). Root-caused via trace+live-DOM across 3 iterations → the canonical fold: (1) a slug-None sgs-wrapper that is the SOLE element child of an emitted container FOLDS its layout onto the container's native attrs (no extra div); (2) multiple element children = structural items → each own container/block; (3) **wrapper-div leak fix** — `_emit_section_container` emits InnerBlocks DIRECTLY (matching `sgs/container` save.js `<InnerBlocks.Content/>`); the static `<div class=wp-block-sgs-container>` placeholder was leaking into the dynamic block's `$content` as an extra nesting level, breaking grid-on-section; (4) **leaf-with-element-children guard** — a node resolving to a leaf block but with sgs-classed children is a mis-resolution → treat as a wrapper container (closes the D115 blind spot; fixes the bad badge→sgs/label routing structurally). Verified live DOM: brand 2-col side-by-side.

**D120 — Wave 1 shipped + live-DOM verified** (`94c6ee75`/`7b8f3046`/`797bb45d`; 6/7 sections green). A) responsive grid templates → native attrs (trust-bar 4-col). B) `blocks.replaces` populated in 5 block.json (heading←core/heading, text←core/paragraph, media←core/image, quote←core/quote, divider←core/separator) + sgs-update-v2 Stage-1 persistence → atomic `<h2>`→`sgs/heading` (dynamic) → all section headings render. D) info-box FR-22-6 (echo $content) → card content renders. Orchestrated via parallel subagents + /qc-council (cross-family) pre-commit gate.

**D121 — A-1 universal responsive per-device lift** (`d9c11ed7`). Root cause (/systematic-debugging): `_lift_root_supports_to_style` computed `bp_decls` (@media rules) then DISCARDED it — the `breakpoint_suffix_rules` + `property_suffixes` machinery had NO caller in the universal walker. Responsive CSS survived only as deployed @media variation CSS (renders but NOT editable as block attrs). Fix: wire padding/margin/gap/columns @media → `{Tablet,Mobile}` native attrs (DB-driven, R-22-1). Slot-level responsive typography (font-size/colour) deferred to Phase 2 (needs slot-prefix integration). NOT yet re-cloned/verified on live DOM.

**D122 — `sgs/hero` FR-22-6 migration** (`1e214d49`). Content (label/headline/subHeadline/CTAs) → InnerBlocks via `echo $content`; the 2-col content|media shell + all styling/layout/responsive attrs stay scalar. Resolves the hero double-render (converter-fed InnerBlocks were duplicated by the scalar template). deprecated.js v6 + migrate(). R-22-14 clean.

**D123 — `sgs/trust-badges` → `sgs/trust-bar` rename** (`6d9fabfb`, Bean-directed). Comprehensive: block dir, block.json, BEM classes, build/, tests, fingerprints, recogniser, docs; deprecated.js v3 alias. `/sgs-update` persisted. NEXT: the renamed block is a HYBRID (reads scalar `items`) → needs its own FR-22-6 migration before the `.sgs-trust-bar` section block-override renders. No BEM collision (block root == section class).

**D124 — Spec corrections + FR-22-18 (structural-parity acceptance).** (a) CORRECTED: `sgs/container` DOES support per-grid-item customisation — instance-wide `gridItem*` defaults (→ `--sgs-gi-*` custom props) + per-child overrides win via specificity (`edit.js:577`). My earlier "uniform only / capability gap" claim was wrong (retracted after reading block.json + edit.js — lesson: read block source before asserting capability). (b) FR-22-18: for layout/wrapper/logic commits the acceptance metric is rendered-DOM structural parity (container presence + type + grid-template + child count/type/order + absorbed-attr confirmation), NOT pixel-diff. Pixel-diff is informational-only this phase (may run + be shared, never used as decision evidence). Amends R-22-4's scope. (c) Atomic→sgs redirect confirmed: Spec 22 §14 maps atomic tags to dynamic sgs equivalents via `blocks.replaces` (was dead/NULL; now populated per D120-B).

---

## 2026-05-31 — FR-22-4.1 Universal wrapper/container resolution (D118)

**D118 — §FR-22-4.1 "Universal wrapper/container resolution" added to Spec 22 as the canonical single rule for every sgs-classed wrapper the walker meets below a section root (Bean-directed 2026-05-31). Supersedes the patchwork: `walk_passthrough` drop-and-bubble for sgs-classed nodes, the depth-2 `_is_layout_bearing_wrapper` gate, and `_absorb_transparent_wrappers` (D52). Closes the FR-22-4 refinement mandate from D109.**

Four-step precedence (§FR-22-4.1):

1. **Block match wins** — BEM class resolves to a registered block → emit that block; it owns its CSS.
2. **Direct descendant + no block match → FOLD into parent container** — 1-child or non-layout shell: CSS folds as inner-CSS layer. Grid/flex direct child: container absorbs layout (`gridTemplateColumns`, `gap`, …); each resulting direct-item's positioning CSS folds as grid-item attrs on the container.
3. **Exception to #2 — direct descendant whose class matches a block → emit as that block** (it IS the grid item; handles its own CSS).
4. **Non-direct-descendant (nested below a folded wrapper) → its own sgs/container** (NEVER dropped); its descendants then recurse through #1–#3.

**What this supersedes:** the three patchwork mechanisms were each partial/overlapping implementations of the same principle — merge transparent direct-child shells, preserve genuine nested structures. §FR-22-4.1 unifies them into one coherent rule. `walk_passthrough`'s drop-and-bubble applied to non-sgs nodes only (FR-22-11) — its sgs-classed analogue is now §FR-22-4.1. The depth-2 `_is_layout_bearing_wrapper` gate (D117 G2) was the empirical discovery that led to this formalisation. `_absorb_transparent_wrappers` (D52 merge-side pre-pass) is folded in as rule #2's 1-child case.

**FR-22-11 scope clarification:** FR-22-11 governs nodes with NO sgs- classes (transparent non-SGS wrappers) — unchanged. §FR-22-4.1 governs nodes WITH sgs- classes that do not resolve to a registered block.

**Propagated to:** Spec 22 §FR-22-3 deferred-trigger note, §FR-22-11, §FR-22-17; Spec 00 §3.2; cloning-pipeline-flow.md Universal-path topology section; cloning-pipeline-stages.md Stage 4 annotation; TRUTH-SPEC.md trust-bar + featured-product worked examples; parking.md P-XS-3-TRIGGER-REFINEMENT + P-UNIFY-CONTAINER-ABSORPTION + P-CONVERTER-CONTENT-ROUTING-FIX + P-FR226-FIDELITY-AND-MERGE.

R-22 compliance: R-22-3 (remains FR-22-4 refinement, NOT a 4th walker branch), R-22-9 (universal — same rule for every wrapper, no per-class special-casing), R-22-11 (live-DOM verification gate), R-22-13 (Bean sign-off co-authoritative).

---

## 2026-05-31 (pm) — Converter content-routing: pipeline now RENDERS content + layout (D117)

**D117 — FR-22-2 leaf content-routing (G1) + FR-23-6 depth-2 grid-wrapper preservation (G2) shipped on `feat/fr22-6-content-render` (commit 1fcb0742). Mama's page 144 now renders its content AND side-by-side card layout — verified on the LIVE DOM, not pixel-diff.** Sequence: D116's container migrations were necessary-but-insufficient (content stayed empty). Root cause = the universal walker never ran FR-22-2 content-routing for leaf blocks.

- **G1 (leaf content-routing):** `walk()` lifts a leaf block's rich text into its content attr via `_atomic_attrs_for` + suppresses child recursion for leaves. ALSO fixed a latent bug: `_atomic_attrs_for`'s graceful fallback checked `info.get("type")` but `block_attrs()` returns the type under `attr_type` → the fallback NEVER fired (only explicit slug handlers worked). Result (live DOM): featured-product 0→510 chars, social-proof →621, trust-bar →98; all 7 content sections render. 4 regression tests (`tests/test_g1_leaf_lift.py`).
- **G2 (FR-23-6 depth-2 grid-wrapper preservation):** designed via a **3-rater council** (pipeline-forensics + code-path-tracer + live-CSS — all converged) reading the full Spec 20/21 log set + code. `_is_layout_bearing_wrapper` Trigger A preserves a slug-None wrapper as a neutral className-only `sgs/container` when **depth≥2 AND display:grid/flex AND ≥2 children resolve to real block slugs**. The depth gate (trace-confirmed: depth-1 `__inner`/`__content` wrappers over-fire + double-nest; depth-2 grid wrappers are the genuine layout rows) is the missing signal FR-23-6 always specified ("fire through `__inner` passthrough, targets at depth-2"). Result (live DOM + screenshot): featured-product + gift cards SIDE-BY-SIDE; header/trust-bar/brand back to 1 container (**duplicate nesting fixed**); brand −11.1; mean −0.66pp net win. Two earlier attempts (leaf-misresolution guard → hero regress; grid/flex-any-depth → over-fire) reverted per STOP #19 before this landed.
- **Methodology lesson (false-pixel-diff, BOTH directions):** an EMPTY section scores a false WIN on cropped pixel-diff (matches background); a REFLOWED-to-correct section (cards side-by-side) scores a false LOSS (differs from the stacked baseline crop). Pixel-diff mis-scores exactly the structural changes that matter. Live-DOM `textLen` + element-layout checks (Playwright) are the authoritative gate. Captured: memory `empty-section-false-pixel-diff-win`.
- **Status:** WIP on branch (renders correctly, NOT yet pixel-acceptance — images dry-run, `sgs/info-box` hybrid, exact styling). Merges to main when fidelity reaches the acceptance threshold. block_composition role corrections shipped via idempotent `seed-composition-roles.py` (testimonial+slider leaf→content-block, label→leaf).
- **Bean directives (parked):** (1) unify `_absorb_transparent_wrappers` (D52 merge-side) + the walker preservation into ONE structural container rule for all containers; (2) duplicate-nesting now fixed empirically by the depth gate.

---

## 2026-05-31 — XS-3 reconciliation + FR-22-6 fractal root cause + Spec 24 (D114-D116)

**D114 — XS-3 reconciled: Spec 23 branch merged to main (eeac99a1).** The "two competing XS-3" framing was wrong — `git merge-base main eced119b == 0a212e3c`, so the branch was a strict SUPERSET of main's XS-3, not a rival. Clean head-to-head on page 144 (same baseline, OPcache reset between): main XS-3 alone 58.39% vs branch (XS-3+B2/B3+A1) 58.98% (+0.59pp). The featured-product 768 "+19.7pp" was a vertical-anchor crop artefact between two equally-EMPTY renders. Bean approved merge to keep Spec 23 momentum; marginal cost is hybrid-content noise, not layout. (Supersedes the never-written "D114" referenced in eced119b's commit message.)

**D115 — FR-22-6 hybrid problem is FRACTAL; root cause = walker never runs FR-22-2.** featured-product + social-proof render EMPTY on the live page (verified: live DOM textLen=0, NOT the pixel-diff which showed a FALSE −30.9pp win — empty section = shorter crop = more matching background; see memory `empty-section-false-pixel-diff-win`). Container blocks (product-card/testimonial/testimonial-slider) were migrated to echo $content (WIP commit c9c6544d on `feat/fr22-6-content-render`) — necessary but NOT sufficient. Investigation (opus subagent, read-only) found the real defect: the walker (`convert.py`) resolves nodes + recurses but **never calls `equivalent_block_for()`/`array_item_slot_for()`/`lift_behavioural_attrs()`** (the FR-22-2 content-routing layer). Three symptoms: (1) `sgs-product-card__body` mis-resolves to the `sgs/text` LEAF because the `slots` table lists `body/intro/description` as `text`-slot aliases — the walker then nests heading/price/pills inside the leaf, which ignores its children → swallowed; (2) leaf text emitted as inner markup, not into the scalar `text` attr → `sgs/text`/`sgs/label` render empty; (3) array items (packSizes) never emitted. **Fix is CONVERTER-side (1-2 files, G1-G4), NOT a 61-block migration** — leaf blocks STAY leaves (R-22-14). **XS-3 must be EXTENDED, not closed**: its guard only fires on slug=None, so it never catches a wrapper that mis-resolves to a leaf (this is why "recent work should have fixed container routing" didn't — the blind spot is leaf-misresolution). Pills must route to `sgs/button` (interactive), NOT `sgs/label` (eyebrow). Phase plan: `plans/2026-05-31-converter-content-routing-fix.md`. Deferred to a focused next session per STOP #19 (sensitive sequential converter work, not iterated inline at session tail).

**D116 — Spec 24 (Query-Driven Content Cards) drafted + product CPT Phase A foundation built.** Research (research-buddies + library-docs, blub.db): presentational-vs-query is a FALSE fork — build ONE dual-mode card (typed OR CPT-bound) on a custom CPT + core Query Loop + Block Bindings API. **Custom CPT, NOT WooCommerce** (maintenance tax unjustified for marketing sites), NOT both. Same engine generalises to testimonials/team/case-studies = highest-leverage framework primitive. `sgs_product` CPT + 2-product seed built (committed; not yet deployed). Spec `specs/24-QUERY-DRIVEN-CONTENT-CARDS.md`. Card dual-mode binding gated on the converter fix (FR-24-9).

---

## 2026-05-30 — XS-2 / XS-3 / XS-4 / XS-5 / XS-6 / D6-inheritance / D5-methodology session-close batch (D107-D113)

Session aggregate: mean pixel-diff 58.6% → 56.40% (-2.20pp) across the canary trajectory below. One walker fix shipped then reverted (D108 / D109) because of regression on featured-product (+13.07pp) and social-proof (+10.40pp). Schema and tooling work landed cleanly; walker consumption of the new shape signals is deferred to the next session with a refined trigger.

| Step | Commit | Mean pixel-diff |
|---|---|---|
| Session start (post-D93-D100 baseline) | — | 58.6% |
| Post-XS-1 (CSS sentinel fix) | 80cfc9ad | 56.85% |
| Post-XS-8/9/10 (slot-list filter + comment skip + rich-text core) | 6087594f | 56.37% |
| Post-XS-9.1+9.2 + mojibake + featured variant | b3feb9a2 + deploy | 56.47% |
| Post-D1+XS-2+XS-5 | e2c8597e | 56.39% |
| Post-XS-3 walker (REVERTED) | f173b351 | 57.71% (+1.32pp regression) |
| After revert | c76aa107 | ~56.39% |
| Post-XS-4 backfill | 04fa0f2b | 56.40% |
| Post-D6 inheritance script | 062c69d1 | n/a (no walker change) |
| **Final aggregate** | | **-2.20pp** |

**D107 — XS-2 voter literal-slug-match short-circuit retired; `blocks.tier` column + `is_section_root` flag (commit e2c8597e, ships with XS-5).** `per-section-convention-voter.py:295-305` previously returned `f"sgs/{slug_root}"` at confidence 1.0 for every `sgs-`-prefixed BEM class before consulting the DB. That short-circuit emitted phantom slugs no `block.json` registered, forcing Stage 2 fallback to `sgs/container` at confidence 0.0 across 9 of 9 boundaries on the Mama's canary. Fix shipped three coordinated changes:

1. `block.json` schema extension. Section-root blocks declare `supports.sgs.is_section_root: true`. Operator-set, not algorithm-derived (Bean rejected algorithmic detection as false-positive prone on hero). Current roster: `sgs/hero`, `sgs/cta-section`.
2. `blocks.tier` column added. `/sgs-update` Stage 1 reads `supports.sgs.is_section_root` per block.json and writes `tier='class-section'`.
3. Voter refactor at lines 295-305. For section-root BEM classes the voter queries `SELECT slug FROM blocks WHERE tier='class-section' AND slug=?` and returns the hit at confidence 0.95; for inner-div classes it excludes class-section rows. Literal-slug-match retained only as last resort, gated on a registered `block.json`.

R-22 compliance: R-22-1 (tier lives in DB), R-22-9 (universal mechanism), R-22-11 (Stage 11 pixel-diff gates the commit). Sibling parking entry P-XS-2-TIER-CRITERIA-DECISION closed.

**D108 — XS-3 / XS-6 unified `block_composition` table; walker consumption SHIPPED then REVERTED (commit f173b351 → c76aa107).** Bean's D6-expanded scope folded XS-3 (per-wrapper slot rows) and XS-6 (separate shape signals) into a single `block_composition` table. Schema: `block_slug PRIMARY KEY, wraps_block TEXT, composition_role TEXT CHECK IN ('section-root','wrapper-shell','content-block','leaf'), has_inner_blocks INTEGER, accepts_allowed_blocks TEXT`. 188 rows seeded by /sgs-update extension. Walker queries the table at Stage 5 to disambiguate multi-candidate BEM resolutions by shape before applying the FR-22-15 capability tiebreaker. Generic slot names (`products`, `cards`) never hardcode-route — routing is shape-driven (R-22-1, R-22-9).

**D109 — XS-3 walker code REVERTED (commit c76aa107) due to regression; refined trigger queued for next session.** The shipped walker condition produced +13.07pp on `sgs-featured-product` and +10.40pp on `sgs-social-proof` — aggregate +1.32pp. Root cause analysis deferred to next session. The `block_composition` DB table (188 rows) PERSISTS — schema and data are valid and reusable. Only the walker code that consumed `composition_role` was reverted. Sibling parking entry P-XS-3-TRIGGER-REFINEMENT records the next-session task: define a narrower trigger condition that excludes the two regressors.

Spec 22 implication: the new FR-22-16 / FR-22-15.1 sub-FRs documented in this session's edit-list are **DEFERRED** — they describe the intended walker consumption, not the live walker. The shape-signal data layer ships; the walker consumes it only when the refined trigger lands.

**D110 — XS-4 `assign-canonical.py` ported to post-D99 slots+roles schema; batch backfill ran cleanly (commit 04fa0f2b + follow-ups 52408c7e).** Old script queried the dropped `slot_synonyms` table; 9 references migrated to `slots WHERE scope='element'` + `roles` table. Dry-run + apply ran without errors. Coverage on `block_attributes.canonical_slot` rose from 52/2074 (2.5%) to 659/2074 (31.8%) at initial backfill, then to 692/2074 (33.4%) after XS-4 follow-ups (camelCase regex + slot vocab + Tier B2 compound selectors); `role` from 110/2074 (5.3%) to 676/2074 (32.6%) initial, then to 689/2074 (33.2%) post-follow-ups. ~1382 rows remain NULL — gap candidates for future enrichment. Predicted vs actual delta: predicted 80–90% coverage; actual 33.4% because slots.aliases lookup is conservative and most attrs lack canonical-vocabulary aliases. The expansion is real; the high-end estimate was inflated.

**D111 — XS-5 wrong/dead section-scope rows in `slots` deleted; testimonial + testimonial-slider re-inserted at element scope (commit e2c8597e, shipped with XS-2).** Twelve rows retired: 8 wrong-tier (`ingredients-section`, `ingredients`, `gift-section`, `social-proof`, `testimonial` section-scope, `testimonial-slider` section-scope, `brand-story`, `featured-product`) + 4 chrome-dead (`header`, `footer`, `site-header`, `site-footer`). Keepers at section scope (4): `core/group`, `hero`, `cta`, `cta-section`. Re-inserts at element scope (2): `testimonial → sgs/testimonial`, `testimonial-slider → sgs/testimonial-slider`; plus `inner` passthrough element row added. Resulting counts: 92 element + 4 section = 96 total. Featured-product takes no slot row — walker reaches `<section class="sgs-featured-product">`, no slots match, the post-D107 voter returns gap-candidate, Stage 2 FR-22-4 falls through to `sgs/container`. Rationale: section-root aliases that route to content-block primitives collapse sibling structure (Fix 2 +21.53pp regression cause, captured 2026-05-27).

**D112 — `sync-container-wrapping-blocks.py` inheritance script SHIPPED (commit 062c69d1).** 468 LOC. Populates `block_composition.wraps_block` for 4 blocks (`sgs/hero`, `sgs/cta-section`, `sgs/modal`, `sgs/quote`). Flags 174 attrs missing from wrapping blocks plus 14 naming-drift dedups across diff Markdown files in `pipeline-state/section-root-sync/`. Operator review path; never auto-edits block.json. Closes the D107 sibling parking entry P-SECTION-ROOT-INHERITANCE-SCRIPT.

**D113 — Methodology rule captured: per-row measurement gating on multi-row DB changes.** STOP catalogue entry #12 + pre-flight ritual question Q6 added to `next-session-prompt.md` (commit 32c70774). Reinforces blub.db 287 `feedback_row_by_row_measurement_gate_per_db_change.md`: any DB change touching more than one row ships ONE row at a time with /sgs-clone Stage 11 between each. XS-4 was the live counterexample — batched 600+ rows produced uninterpretable aggregate delta; future XS-4-shaped work splits per-block.

**Also shipped this session (commit a23ff53f, no D-number):** `plugins/sgs-blocks/scripts/build-deploy.py` — single-command build + deploy + OPcache reset replaces the multi-step manual sequence in dev-setup.md.

Status: D107, D110, D111, D112, D113 active. D108 / D109 — schema active, walker code reverted, refined-trigger work parked at P-XS-3-TRIGGER-REFINEMENT.

---

## 2026-05-30 — XS-1 / XS-8 / XS-9 / XS-10 mechanical cv2 fixes; XS-11 retracted as subagent false positive (D102-D106)

**D102 — XS-1 CSS serialiser sentinel leak (`'@media ... :: .selector'` → proper @media nesting).** `_parse_css()` at convert.py:352 flattens nested @media rules into dict keys with `' :: '` internal sentinel. `collect_css_for_classes` at line 417 emitted these keys verbatim into inline `<style>` blocks, producing invalid CSS browsers refused. Fix: detect sentinel + reconstruct `@media (...) { .selector { ... } }`. Empirical: 57.96% → 56.85% mean (-1.11pp), 19 → 0 sentinel leaks in extract.json, sgs-featured-product -9.00pp (the only large win because most sections target wrappers that don't render — XS-3 gating). Commit `80cfc9ad`.

**D103 — XS-8 leftover-bucket noise filter (Stage 9 extraction_failed).** `route_extraction_failed()` enumerated every Stage 3 declared slot as "extraction_failed" when not filled, producing ~69 noise entries per section (sgs/container's 69 default-bearing attrs) drowning real defects. Fix: skip emission when both `attribute_role == 'auto-derived'` AND `default not in {None, '', []}`. Empirical: leftover-bucket extraction_failed 723 → 387 (-336 entries, -46%), 0pp pixel-diff (observability only). Commit `6087594f`.

**D104 — XS-9 rich-text preservation in core/* atomic-tag swaps + XSS hardening.** `_atomic_attrs_for` used `node.get_text(strip=True)` collapsing inline tags (`<br>`, `<strong>`, `<a>`). New `_rich_text_content` helper preserves bounded inline-tag allowlist for core/heading / core/paragraph / core/quote / core/button. **SGS atomic emissions (sgs/heading, sgs/text, sgs/button, sgs/quote) retain get_text behaviour pending render.php audit** — parked at P-SGS-ATOMIC-RICH-TEXT-AUDIT. XSS hardening: HTML-escape text nodes, scheme-allowlist `<a href>` ({http, https, mailto, tel, relative}), attribute-escape href value, drop all other attrs. Empirical: 0pp impact on Mama's canary because hero H1 routes via sgs/heading (excluded by conservative scope), not core/heading. Architecturally correct + benefits future core/* mockups. Commit `fec91c5d`.

**D105 — XS-10 walker skips bs4 Comment before NavigableString check.** HTML comments (`<!-- Main product -->`) leaked as bare text because `Comment` is subclass of `NavigableString`; the walker's Exception 0 matched Comment via NavigableString branch and emitted `str(node).strip()` (the comment's inner text). Fix: explicit Comment check returning None placed BEFORE NavigableString branch. Empirical: sgs-featured-product -5.47pp (the only section with HTML comments in mockup). Commit `943e52b2`.

**D106 — XS-11 RETRACTED: subagent false positive on emoji mojibake.** Gift-section subagent in 2026-05-30 diagnostic register claimed `🏥` → `🏥` mojibake in extract.json. Byte-level verification proved otherwise: raw bytes `\xf0\x9f\x8f\xa5` = correct UTF-8 encoding of U+1F3E5. The subagent saw mojibake-shaped text in its tool output because its rendering environment misinterpreted UTF-8 as cp1252; the file itself is correctly encoded. sgs-clone-orchestrator.py + convert.py file reads already use `encoding="utf-8"` explicitly. New captured lesson: `feedback_subagent_evidence_must_be_byte_verified_for_encoding.md` — any encoding-related defect claim from a subagent must be byte-verified via `open(p, 'rb').read()` + `.hex()` before treating as a real bug. R-22-11 extension: "verify rendered output, not internal metrics" extends to "verify the bytes, not the rendering of the bytes."

**Empirical lesson from XS-1 + XS-8 + XS-9 + XS-10 measurement cycle:** subagent fix-shape predictions (range -15 to -30pp aggregate) overshot real impact by ~10× (actual aggregate -1.59pp from 57.96% to 56.37%). Per blub.db 276 council-predictions-need-empirical-validation: fix-shapes are HYPOTHESES, not specs; predicted impact must be empirically measured. Going forward: each fix-cycle records pre/post + predicted vs actual ratio for calibration accumulation. After 5-7 calibration points the ratio will inform future predictions.

**Per-section pixel-diff noise floor observed:** sgs-social-proof showed +2.04pp delta from XS-8/9/10 measurement run even though block_markup is byte-identical pre/post. Confirms inherent per-section pixel-diff variability of ~±2pp from font rendering / screenshot timing / browser state. Future fix-cycles must interpret per-section deltas with this noise floor when isolating impact.

---

## 2026-05-29 — slot_synonyms + legacy_role_lookup unified into `slots`; new `roles` table; html_tag_to_core_block INSERT OR REPLACE; property_suffixes.kind_override (D99)

**D99 — slot_synonyms + legacy_role_lookup unified into new `slots` table; new `roles` table replaces slot_synonyms.role_classification; html_tag_to_core_block seed switched to INSERT OR REPLACE; property_suffixes.kind_override column replaces _KIND_BY_SUFFIX hardcoded dict.**

Four DB-driven cleanups in one atomic migration (`2026-05-29-d99-db-unification.py`). All honour R-22-1 (DB-first, no hardcoded dicts).

**Fix 1 — `slots` table (105 rows, replaces slot_synonyms 89 + legacy_role_lookup 16).** PK is `(slot_name, scope)` composite — required because the same name can exist at both scopes (`header` is element-scope identity slot in slot_synonyms AND section-scope class in legacy_role_lookup). `scope='element'` rows = former slot_synonyms; `scope='section'` rows = former legacy_role_lookup. `html_semantic_tag` column NOT migrated (was only 27/89 populated; `atomic_tag_map()` never consulted it; `html_tag_for_slot()` now returns None). Consumer updates: `db_lookup._slot_synonyms()` → `SELECT slot_name, aliases FROM slots WHERE scope='element'`; `_slot_to_standalone_block()` → same table; `_slot_alias_to_standalone()` → same; `legacy_role_lookup_for()` / `_load_legacy_role_cache()` → `SELECT slot_name, standalone_block FROM slots WHERE scope='section'`; `sgs-update-v2.py` Stage 5 → `SELECT rowid, slot_name FROM slots WHERE scope='element'` + `UPDATE slots SET standalone_block=? WHERE rowid=? AND scope='element'`. Old tables `slot_synonyms` and `legacy_role_lookup` DROPPED after count verification (element=89, section=16). Both DBs (`.claude` + `.agents`) migrated.

**Fix 2 — `roles` table (20 rows, replaces slot_synonyms.role_classification).** This closes the link-href bug: `_content_bearing_roles()` was querying `SELECT DISTINCT role FROM slot_synonyms WHERE role_classification='content-bearing'`, which returned only 4 roles because no slot_synonyms row had `role='link-href'` — the migration that seeded the column only UPDATEd existing rows. The `roles` table is seeded from `_ROLE_CLASSIFICATION_MAP` (20 entries defined by role name, not derived from slot rows) via `INSERT OR REPLACE`. After D99, `_content_bearing_roles()` returns 5 roles (adding link-href) and `equivalent_block_for('sgs/media', 'videoUrl')` correctly returns `'sgs/media'` (was None). `_styling_behaviour_roles()` returns 15. Schema: `(role_name TEXT PK, classification TEXT CHECK('content-bearing'|'styling-behaviour'|'unclassified'))`. `_migrate_roles_table()` runs at module load; INSERT OR REPLACE ensures seed-dict updates propagate (not OR IGNORE).

**Fix 3 — html_tag_to_core_block seed: INSERT OR IGNORE → INSERT OR REPLACE.** db_lookup.py line change only. Prevents seed-dict/DB divergence when `_HTML_TAG_TO_CORE_BLOCK_SEED` entries are updated — DB picks up changes on next module load without manual row edits.

**Fix 4 — property_suffixes.kind_override column (17 rows seeded).** `_KIND_BY_SUFFIX` dict (17 entries: LineHeight, LetterSpacing, FontFamily … Alignment) was a hardcoded Python lookup. Now seeded into `property_suffixes.kind_override` via idempotent `_migrate_property_suffixes_kind_override()` at module load. `_kind_for()` queries `kind_override` column first (R-22-1 DB-first); falls through to role-based inference for uncovered suffixes. `UPDATE WHERE kind_override IS NULL` preserves manual overrides. `_KIND_BY_SUFFIX` dict retained in code as seed source.

Migration script: `plugins/sgs-blocks/scripts/migrations/2026-05-29-d99-db-unification.py` (idempotent, applies to both DBs, verifies counts before DROPs, uses explicit `BEGIN`/`COMMIT` to wrap DDL in one transaction).
Status: active

---

## 2026-05-29 — Stage 10 v3 deletes retired blocks from blocks table + phpunit intelephense stub (D100)

**D100 — Stage 10 v3 deletes retired blocks from blocks table + phpunit added to intelephense.stubs.** (1) `_prune_orphans_on_conn` in `sgs-update-v2.py` gains a new category (d): sgs/* slugs present in the `blocks` table but absent from `src/blocks/<basename>/block.json` are retired blocks that should not persist. Aggressive mode (default) DELETEs the blocks row; conservative mode marks `is_stale=1` (new column on blocks table, added via `_ensure_blocks_is_stale_column` helper — idempotent ALTER TABLE). Non-sgs/* slugs (core/*, etc.) are intentionally skipped — different lifecycle managed by Stage 2. Result dict gains `orphan_blocks_deleted` key. Cleaned 4 known ghost rows on live run: sgs/back-to-top, sgs/data-display, sgs/icon-block, sgs/reading-progress (plus 2 orphan capabilities that were child rows). Idempotent — second run reports 0. (2) `"phpunit"` added to `intelephense.stubs` array in `.vscode/settings.json` between "Phar" and "posix" — fixes "Undefined type 'PHPUnit\\Framework\\TestCase'" P1009 warnings on PHPUnit test files (e.g. BlockDeprecationsTest.php); clears on next VS Code intelephense rescan.
Status: active

---

## 2026-05-29 — sgs/container ship-blockers + quality-blockers landed (D98)

**D98 — 5 capability extensions shipped to sgs/container: SB-1 (grid item defaults + providesContext), SB-2 (editor grid preview uses gridTemplateColumns string), QB-1 (gridTemplateRows/gridAutoRows/justifyItems/alignContent), QB-2 (gridTemplateColumns string inspector control), QB-3 (templateMode / allowedBlocks guidance).** New attrs added to block.json (13 total): `gridItemPadding`, `gridItemBackground`, `gridItemBorderRadius`, `gridItemBorder`, `gridItemShadow`, `gridItemTextColour` (SB-1); `gridTemplateRows`, `gridTemplateRowsTablet`, `gridTemplateRowsMobile`, `gridAutoRows`, `justifyItems`, `alignContent` (QB-1); `templateMode` (QB-3). `providesContext` block added for all 6 `sgs/gridItem*` keys (SB-1). render.php emits `--sgs-gi-*` CSS custom properties when any grid item default is set; emits `grid-template-rows`, `grid-auto-rows`, `justify-items`, `align-content` inline; responsive gridTemplateRows/Columns tablet+mobile overrides via scoped `<style>` block (same uid pattern as existing gap/widthMode responsiveness). edit.js: SB-2 editor preview reads `gridTemplateColumns` string attr instead of hardcoded `repeat(N,1fr)`; new "Advanced grid layout" collapsible section in Layout panel (QB-2 column template + QB-1 row template + gridAutoRows + justifyItems + alignContent responsive controls); new "Grid item defaults" PanelBody (SB-1 — only visible when layout=grid); new "Template mode" PanelBody (QB-3). style.css: `.sgs-container--grid > .sgs-container` rule consumes all `var(--sgs-gi-*)` defaults with no fallback (CSS custom properties fall through transparently when unset). deprecated.js: v3 entry covers all pre-D98 blocks — migrate() backfills 13 new attrs with block.json defaults; export order now `[v3, v2, v1, v0]`. Build: webpack compiled successfully, 0 WPCS errors.
Status: active

---

## 2026-05-29 — sgs/certification-bar retired; merged into sgs/trust-bar

**D95 — sgs/certification-bar retired; all capability merged into sgs/trust-bar as badgeStyle variants (Bean approved, Item 11). Block subsequently renamed from sgs/trust-badges → sgs/trust-bar 2026-05-31 (matches mockup section class `.sgs-trust-bar`).** Both blocks were "horizontal strips of trust signals with labels". Different visual treatments unified under one block via a `badgeStyle` enum: `icon-circle` (existing default), `text-only` (cert-bar pill shape), `image-badge` (cert-bar logo/cert shape). New attrs added to trust-bar: `badgeStyle`, `title`, `titleColour`, `titleFontSize`, `labelColour`, `labelFontSize`, `badgeSize` (all carried from cert-bar); plus new auto-scroll capability: `autoScroll` (boolean), `autoScrollSpeed` (slow/medium/fast), `autoScrollPauseOnHover` (boolean). Version bumped 0.1.0 → 0.2.0. render.php branches on `badgeStyle` with three fully-separate render paths. view.js (new ES module, `viewScriptModule`) activates conditional overflow-detecting marquee scroll (same clone+measure pattern as sgs/brand-strip) only when items genuinely overflow the container — no animation wasted on short lists. `prefers-reduced-motion` honoured. Cross-block migration: `deprecated.js` v3 handles rename alias sgs/trust-badges → sgs/trust-bar (identity pass); v2 entry with `isEligible({ name }) => name === 'sgs/certification-bar'` + `migrate()` mapping all 8 cert-bar attrs to trust-bar equivalents (badgeStyle text-only/image-only/image-and-text → text-only/image-badge/image-badge). Source: `src/blocks/trust-bar/` (was trust-badges). Source deleted: `src/blocks/certification-bar/` + `build/blocks/certification-bar/`. DB: `sgs/certification-bar` rows deleted from `blocks` (1), `block_attributes` (8), `block_supports` (8), `block_capabilities` (3) in both sgs-framework.db copies. Tests: `BlockDeprecationsTest.php` cert-bar entry removed; `blocks.spec.ts` EXPECTED_BLOCKS updated. `/sgs-update` required post-deploy to populate new trust-bar attrs in DB.
Status: active

---

## 2026-05-29 — sgs/media extended to image + video

**D97 — sgs/media extended from image-only to unified image/video block (Bean original intent).** Block was named "media" from the start but only shipped the image side; `block_attributes` had a ghost `sgs/media.videoUrl` row (canonical_slot=media, role=link-href) left over from earlier design intent. Extension adds 12 new attrs: `mediaType` (enum: image|video, default image), `videoUrl`, `videoSource` (enum: external|internal), `videoId`, `videoMimeType`, `videoPoster`, `videoPosterId`, `videoAutoplay`, `videoLoop`, `videoMuted` (default true — browser autoplay requirement), `videoControls` (default true), `videoPlaysInline` (default true — prevents iOS fullscreen), `videoLazyLoad` (default true). Version bumped 1.0.0 → 1.1.0. render.php branches on `mediaType` (auto-detected from populated attrs when absent for backwards-compat): image path preserves 100% of existing naked-mode / figure / link / srcset logic; video path routes to `<iframe>` for YouTube/Vimeo (regex detect + watch→embed URL conversion, youtube-nocookie.com domain, query params from playback attrs) or native `<video>/<source>` for direct MP4/WebM/internal WP library files (MIME auto-detect from URL extension). All shared styling attrs (objectFit, objectPosition, aspectRatio, maxWidth, maxHeight, borderRadius, opacity, responsive order) applied uniformly to both media element types via a single `$media_styles` array. edit.js adds Media Type ButtonGroup toggle at inspector top; Image tab keeps existing MediaPlaceholder/MediaUpload flow; Video tab adds source toggle, URL TextControl, MediaUpload for internal video + poster, playback ToggleControls. style.css extended with `.sgs-media__video` rules mirroring `.sgs-media__img` + iframe aspect-ratio fallback (16/9). deprecated.js v1 covers the pre-1.1.0 image-only schema with a migrate() that backfills mediaType:'image' + all video attrs with defaults so existing posts load cleanly. index.js wired with deprecated array. Build confirmed clean. Note for main session: `/sgs-update --stage 1` needs to run to populate the 12 new video attrs in block_attributes and resolve the ghost `videoUrl` row.
Status: active

---

## 2026-05-29 — Stage 10 prune-mode default → aggressive + attr-level orphan detection

**D94 — Two changes to `sgs-update-v2.py` Stage 10 (`prune_orphans`).**

**Change 1 — `--prune-mode` default flipped to `aggressive`.** Previously `mark-stale` (set `is_stale=1`) was the default; now `aggressive` (DELETE) is the default. Reasoning: `block.json` is the source of truth; a support that is no longer declared in `block.json` would be re-INSERTed by Stage 1 if the block returns, so marking it stale rather than deleting it just creates permanent clutter. Conservative mode is now opt-in via `--prune-mode conservative`. Legacy CLI alias `mark-stale` maps to `conservative` internally. Result: the 26 pre-existing `is_stale=1` rows (from 4 retired blocks — `sgs/back-to-top`, `sgs/data-display`, `sgs/icon-block`, `sgs/reading-progress` — all with `block.json` absent from disk) were deleted on first aggressive run. Post-run `SELECT COUNT(*) FROM block_supports WHERE is_stale=1` = 0.

**Change 2 — Attr-level orphan detection added to Stage 10.** Previously Stage 10 only caught block-level orphans (block_slug absent from `blocks` table). It missed the case where the block exists in `blocks` but a specific `attr_name` was removed from `block.json` (Stage 1 only INSERTs/UPDATEs attrs, never removes them). Fix: `_prune_orphans_on_conn` now builds a `live_attrs` map (`slug → frozenset[attr_names]`) from the current block.json scan and walks all SGS `block_attributes` rows whose `block_slug` is in the `blocks` table. Rows where `attr_name` is absent from `live_attrs[block_slug]` are deleted. Also handles the edge case where a block is in the `blocks` table but has no `block.json` on disk (all its attrs are ghost rows). `block_attributes` has no `is_stale` column, so conservative mode is a no-op here (a warning is printed but rows are still deleted — no alternative). New result-dict key: `orphan_attributes_deleted_attr_level` (distinct from `orphan_attributes_deleted` which is block-level). Live run deleted 205 ghost attr rows. Idempotency confirmed (all counters 0 on second run).

**Stale-supports detection scope fix (discovered during implementation):** The stale-supports check was previously gated on `b_slug in live_supports`, which silently skipped blocks that are in the `blocks` table but have no `block.json` on disk. These blocks' supports were perpetually is_stale=1 but never deleted. Fix: check `b_slug not in live_supports` as an additional match condition (all their supports are stale). Same fix applied to attr-level orphan detection for the same edge case.

Status: active

---

## 2026-05-29 — block_capabilities wired into pipeline; capability-aware BEM tiebreaking

**D96 — block_capabilities first-class pipeline integration: capabilities_for() + blocks_with_capability() helpers + capability-aware tiebreaking in resolve_slug_from_bem (FR-22-15).** Three changes land together. (1) `populate-db.py:CAPABILITY_RULES` seed propagation bug fixed: `INSERT OR IGNORE` replaced with `INSERT OR REPLACE` + a pre-pass `DELETE` of rows whose capability tag is no longer present in `CAPABILITY_RULES` — previously, any edit to `CAPABILITY_RULES` had no effect after first populate (rows already in DB were silently preserved by IGNORE). (2) Two new DB-driven helpers in `db_lookup.py`: `capabilities_for(block_slug) → frozenset[str]` (LRU-cached, maxsize=256) and `blocks_with_capability(capability) → frozenset[str]` (LRU-cached, maxsize=64). Both query `block_capabilities` table directly; R-22-1 compliant (zero hardcoded routing dicts). Private `_capability_rank(block_slug) → int` helper ranks blocks by semantic specificity using `_CAPABILITY_PRIORITY` list (convention-ordering, not a routing dict — precedent: `_BREAKPOINT_RULES`). (3) `_resolve_slug_from_bem_tuple` Path 1 multi-candidate tiebreaker upgraded from alphabetical-first to `(_capability_rank, slug)` sort (FR-22-15, Spec 22 §3). Concrete example: `sgs-testimonial-slider sgs-container` on a social-proof section root now resolves to `sgs/testimonial-slider` (rank 11, `carousel` tag) over `sgs/container` (rank 16, `grid-layout` tag) — previously alphabetical gave `sgs/container`. Test case in FR-22-15 §PASS test. Files touched: `db_lookup.py` (helpers + tiebreaker), `populate-db.py` (seed fix), `specs/22-*.md` (FR-22-15 + data-layer table row updated). No commit per dispatch constraints.
Status: active

---

## 2026-05-28 — sgs/svg-background retired; capability merged into sgs/container

**D93 — sgs/svg-background retired; SVG background capability merged into sgs/container (Bean approved).** `sgs/svg-background` was a standalone block wrapping InnerBlocks with an SVG animation layer. Its entire feature set (SVG paste field, background/foreground position, 3 animation types × 3 speeds, opacity, min-height, text-shadow) is now a capability of `sgs/container`'s existing background system, alongside image/video/parallax/ken-burns. New attrs use `bgSvg*` namespace: `bgSvgContent`, `bgSvgPosition`, `bgSvgAnimation`, `bgSvgAnimationSpeed`, `bgSvgOpacity`, `bgSvgMinHeight`, `bgSvgTextShadow`. Editor: new "SVG" tab added to the Background PanelBody in `container/edit.js`. Render: `sgs-container__svg-bg` div emitted by `container/render.php` before or after `$content` based on `bgSvgPosition`. CSS: animation keyframes + layer z-index rules added to `container/style.css` (renamed from `sgs-svg-background--*` → `sgs-container--svg-*`). Migration: `deprecated.js` v2 entry in container handles cross-block migration of existing `sgs/svg-background` posts — `isEligible()` matches the retired block name; `migrate()` maps old attrs → `bgSvg*`. Source deleted: `src/blocks/svg-background/` + `build/blocks/svg-background/`. DB: `sgs/svg-background` rows deleted from all 4 tables in both sgs-framework.db copies. Rationale: eliminates a redundant block (every svg-background use-case is a container with a special background); reduces block menu noise; aligns with SGS principle of universal mechanisms over per-block special cases (R-22-9).
Status: active

---

## 2026-05-27 — Spec 22 Phase 1.5 close + Phase 2 reorder + R-22-14 binding rule

**D90 — Phase 1.5 CLOSED with just Fix 1 shipped (walker FR-22-3 #3 ordering, commit `5731dc36`).** Mean pixel-diff 81.55% → 58.6% aggregate (−22.9pp); 17 of 18 non-hero body cells improved substantially (trust-bar −72pp, social-proof −53pp, brand −33pp, gift-section −33pp). 0/21 body cells PASS ≤5% gate but that's not the close criterion — the close criterion was diagnostic-value-complete + clear-path-to-pixel-target-identified. Both met. Phase 1.5's empirical role was to surface structural prerequisites: walker collapses `__content`/`__media` BEM wrappers + 61 SGS blocks have hybrid render.php that ignores `$content`. These surfaced via (a) Fix 2 DB-row attempt (rolled back +2.34pp regression) and (b) Fix 4 hero render.php attempt (BLOCKED at /qc-council). Bean directive: stop trying to hit ≤5% in Phase 1.5; close it; reorder Phase 2 ahead. Phase 1.5 plan file `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` to be archived to `plans/archive/`.
Status: active

**D91 — Phase reorder: Phase 2 = hybrid block migration BEFORE pixel-diff target; Phase 2.5 = bridge to ≤1% (was original Phase 1.5 stretch).** Original Spec 22 §7 sequencing put Phase 1.5 noise-floor work between Phase 1 and Phase 2. New sequencing: Phase 1 (architectural rewrite) → Phase 1.5 (Fix 1 walker ordering, CLOSED) → Phase 2 (61-block hybrid render.php migration via FR-22-6) → Phase 2.5 (≤1% pixel-diff noise floor). Reasoning: walker can't preserve `__content`/`__media` wrappers correctly until Fix 2b DB rows land (Stream A of Phase 2 plan), AND hero's 88/63/58% can't drop without render.php migration. Both are Phase 2 work. ≤1% bridge is downstream of structural fixes per `feedback_operator-promotion-is-end-of-line-cleanup` discipline. New Phase 2 plan at `.claude/plans/2026-05-28-phase-2-hybrid-block-migration.md`; current active scope = Stream A only (DB-quality pre-pass + corrected Fix 2b via seed-slot-synonyms.py + /sgs-update downstream + re-baseline measurement). Streams B/C/D deferred until Stream A measurement closes.
Status: active

**D92 — R-22-14 binding rule added 2026-05-27: FR-22-6 migrations never carry server-side legacy fallback hacks (Bean P1 locked).** Captured after Fix 4 hero render.php migration hit /qc-council BLOCK with Rater B demanding `if (empty($content) && !empty($headline)) { ...legacy scalar render... }` fallback. Bean reframed: "is this an sgs-only issue?" → YES (FR-22-6 hybrid problem is exclusively SGS framework debt; core/Gutenberg blocks use WP-native InnerBlocks.Content save or modern render-callback patterns; zero core blocks on Phase 0.4 roster) → "then just fix the whole roster, no legacy fallbacks". The fallback hack would add ~10-20 lines × 61 blocks = 600-1200 lines of dead-but-load-bearing scalar guard code permanently in the codebase — violates R-22-9 (universal mechanism) at the operational layer. Correct path: batch-migrate full 61-block roster via Phase 2 parallel /subagent-driven-development per FR-22-6.1 + ship WP-CLI batch existing-post migration script that walks every post on every production site + forces deprecated.js v(N+1) migration via headless block-parser. If WP-CLI script isn't ready, DELAY the deploy — never ship the per-block fallback hack. Captured lesson `feedback_fr22_6_hybrid_problem_is_sgs_only_no_legacy_fallback_hacks.md`. R-22-14 now in Spec 22 §6 binding rules list.
Status: active

---

## 2026-05-27 — Spec 22 Phase 1.3 array-attr backfill (corrected scope) + drift fix

**D89 — Spec 22 §FR-22-2.5 "Phase 0.1 backfill priority list" drift caught + corrected.** The original list of 4 priority attrs (product-card.packSizes, social-proof.testimonials, certification-bar.badges, info-box.items) was a spec-drafting drift — only 1 of 4 entries grep-verifies against the current codebase. `sgs/social-proof` block doesn't exist; `info-box.items` attr doesn't exist (real array attr is `elementOrder`, a slot-name config list — not item objects); `certification-bar.badges` attr name was wrong (real attr is `items`, already populated). Phase 0 was closed claiming this gate was met — it wasn't, because the spec was wrong about WHICH attrs needed backfilling. Caught 2026-05-27 by main-thread grep-verification before Phase 1.3 implementer dispatch (would have wasted Sonnet tokens producing empty work). Pattern: `feedback_grep_verify_handoff_diagnostic_premises.md` (2026-05-25) — every load-bearing claim in a spec or next-session-prompt must grep-verify against the actual codebase before driving action. Corrected priority list ships in Phase 1.3a: product-card.packSizes → button; gallery.mediaItems → media (image-object); form-field-address.fields → options (content); form-field-tiles.tiles → options (content). Plus 3 config arrays explicitly flagged role=`layout` to make positive-allowlist gate behaviour explicit: form-field-file.allowedTypes, info-box.elementOrder, table-of-contents.headingLevels. Spec 22 §FR-22-2.5 priority-list paragraph rewritten in same commit. New helper `db_lookup.array_item_slot_for(block_slug, attr_name)` lands alongside (17/17 unit tests PASS). Triple-NULL baseline recaptured 1090 → 1101 to account for 11 new sgs/heading attrs added by /sgs-update on 2026-05-27 (legitimate drift, not regression).

**D93 — sgs/team-member.socialLinks: flat array → InnerBlocks composition.** (Renumbered from prior-session draft D90 → D93 on 2026-05-27 because new this-session decisions D90/D91/D92 took the next available slots; previous D90 captured pre-Fix-1.) Bean directive 2026-05-27 after research-check confirmed WP Core `core/social-link` + Kadence `iconlist` both converge on `{url, icon-discriminator, label}` per-item shape. sgs/team-member's flat `socialLinks` array attribute is replaced by an InnerBlocks slot defaulting to one `sgs/social-icons` child block. Same atomic-blocks-+-composition direction as the sgs/heading γ-rebuild (commit 35fdab62). Eliminates rendering-surface duplication between team-member and social-icons. deprecated.js migrates old `socialLinks: [...]` posts → new InnerBlocks template with sgs/social-icons populated from old data. sgs/social-icons.icons per-item shape extended `{platform, url}` → `{platform, url, label}` — adds explicit aria-label override (closes WCAG 2.2 SC 4.1.2 — Level A). Platform enum preserved (matches WP Core's `service` enum pattern; client UX wins over open-shape extensibility per CLAUDE.md "client experience is primary"). Phase 1.3b ships via /subagent-driven-development (parallel to 1.3a DB work).

---

## 2026-05-27 — Spec 22 Phase 0.1 /qc-council findings + role-exclusion fix + Tier C deletion + pixel-diff measurement methodology

**D85 — Role-exclusion positive-allowlist closes FR-22-2.2 NULL-role hole.** /qc-council Task 2 Rater A's adversarial 5th unit test caught a real bug: `equivalent_block_for('sgs/cta-section', 'textTransform')` returned 'sgs/text' when it should return None. Root cause: `db_lookup.py:839` was `if role and role in _ROLE_EXCLUSION_ALLOWLIST: return None` — short-circuits on falsy role. DB audit confirmed 171 rows have content-bearing `canonical_slot` + `role IS NULL`; 3 confirmed misroutes (`sgs/cta-section.textTransform`, `sgs/hero.textTransform`, `sgs/info-box.textTransform` all canonical_slot='text'). This is the exact FR-22-2.2 "typography looks like heading" trap the spec was designed to prevent — the role-exclusion gate had a hole. Fix: positive-allowlist (`if role not in _CONTENT_BEARING_ROLES: return None`) — content routes via block-equivalence ONLY when role is explicitly in the content-bearing set; role-NULL defaults to scalar (styling-safe). Five unit tests now PASS including the adversarial case. Side-effect: the 4 already-applied Tier B rows (sgs/icon.iconSource/iconName/linkTarget + sgs/timeline.entries) have correct canonical_slot but role=NULL → walker won't activate them until role-detection backfill lands (P-SGS-UPDATE-ROLE-DETECTION-IMPROVE, dispatched Wave A 2026-05-27). The DB state is correct + preparatory; walker activation is deliberate-gated on role enrichment.

**D86 — Tier C deleted from equivalent_block_for(); Spec 22 amended to 2-tier system.** Bean directive 2026-05-27 after /qc-council Task 2 Rater B verdict (DELETE-NOW). Tier C in `db_lookup.py:761-796` + `:859-865` was 40+ LoC of untested code with 0 inputs in current DB state. Risks Rater B flagged: bit-rot, future maintainer "fixing" the dormant warning without understanding why it was dormant, hardcoded frozenset violating R-22-1. Counter-view (preserves spec symmetry) overruled: Tier C will re-add with empirical evidence when P-SGS-UPDATE-ROLE-DETECTION-IMPROVE generates real Tier C inputs. Re-add carries DB-derived role classification + unit tests against real data. Spec 22 §FR-22-2.1 amended from 3-tier to 2-tier (Tier A direct join + Tier B BEM-element). §FR-22-2.3 (Tier C uses existing slot_synonyms) marked obsolete. §10 F-PE-5 + §15 F-AP-2 / F-SC-11 marked RESOLVED via deletion. Wave A Sonnet 2 executes the deletion + spec amendment.

**D87 — pixel-diff.py architectural divergence from Spec 22 §7 Commit 0.3 wording.** Spec wording said "detect chrome at top of SGS screenshot, crop before comparison". /qc-council Task 5 Rater B confirmed the empirical falsification: cropping made the score WORSE (57% > 54.5% pre-fix baseline). The actual mitigation that shipped: `visibility:hidden` on detected `position:sticky;top:0` template-part header BEFORE `el.screenshot()`, NOT post-screenshot crop. Mechanism: sticky chrome re-anchors to viewport-top during `el.scroll_into_view_if_needed()` and paints over the captured element. The cream-coloured chrome band on the saved PNG is `tph_bottom − target_viewport_offset` (66px at 1440) NOT the full chrome height (247px). Post-screenshot crop-by-chrome-height over-cropped by the difference. Empirical result: hero-clone-poc 1440 went 54.5% → 10.3% (−44.2pp); Mama's hero 1440 IMPROVED 69.6% → 60.8% (−8.8pp; honest new baseline since chrome was contaminating prior measurement). Rater B verdict: DIVERGENCE JUSTIFIED — UPDATE SPEC. Spec 22 §7 Commit 0.3 wording amended in this commit. The R-22-7 binding rule (council fix-shapes are hypotheses) was honoured: the spec-literal approach was tried, measured, falsified, then revised.

**D88 — pixel-diff.py brand-375 +2.4pp is REAL methodology shift, NOT flake.** /qc-council Task 5 Rater A correction. Three byte-identical-PNG re-runs (`md5(sgs.png)` matched across `mamas-brand-375-no-wait-fonts`, `mamas-brand-375-rerun`, `mamas-section_sgs-brand-375x812`) confirmed determinism. The +2.4pp delta from 53.225% → 55.619% is a measurement-method-driven change (visibility:hidden of 83px sticky chrome on brand-375 alters layout-rearrangement bleed into the cropped region). Parking entry P-G4-MEASUREMENT-DECONTAMINATION transition wording updated accordingly: "+2.4pp on brand-375 is methodology shift, not flake". Implication: every chrome-affected Mama's cell is partially stale on the 2026-05-26 mean 63.0% baseline. Wave B re-captures the full Mama's baseline with new pixel-diff.py.

---

## 2026-05-27 — Spec 22 Phase 0.1 scope correction

**D84 — Phase 0.1 scope corrected from "backfill 1,214 NULL canonical_slot rows" to "backfill ≤72 Tier B derived_selector candidates."** Empirical DB audit 2026-05-27 (verified by parallel queries against `sgs-framework.db`): of 1,214 rows with `canonical_slot IS NULL`, 1,142 (94%) are triple-NULL (canonical_slot + derived_selector + role all NULL) and are **correctly NULL by design** — behavioural / sizing / styling / enum / identity attrs catalogued in `block_attributes` (the table catalogues every block × every attr; `canonical_slot` is sparsely populated by intent, not gap). 72 rows (6%) have `derived_selector` set and are the actual Tier B backfill candidates. 0 rows have `role` set without `derived_selector` (Tier C dormant — wired for future-proofing per Spec 22 §FR-22-2.1 but has no inputs to act on today). Sample triple-NULL rows confirm the pattern: `back-to-top.position`, `reading-progress.wpm`, `icon.size` — content-NULL by design, not by gap.

Phase 0.1 script guardrail added: `assign-canonical.py` MUST refuse to operate on any row where `derived_selector IS NULL` (structural input filter; not optional). This makes the F-RA-1 "mis-tag behavioural attr as block-equivalent" failure mode **impossible by input shape**, not by regression test. F-RA-1 mitigation downgraded from "golden corpus regression test" to "structural guardrail + dry-run JSON diff + Bean inline review" — risk surface reduced from 1,214 rows to ≤72 reviewable rows (one screen of JSON). Golden corpus (`.claude/specs/22-golden-corpus.json`) and F-RA-9 mitigation both DROPPED — the dry-run diff IS the review surface; a hand-authored corpus would test a category-error premise.

Spec 22 §FR-22-2.1 empirical-state framing rewritten in same commit. §10 F-RA-1 row downgraded. §11 success criteria adds "≤72-row Tier B diff reviewed + applied; 1,142 triple-NULL rows verified unchanged" bullet. §7 Commit 0.1 rewritten. Phase 1 plan Phase 0.1 row rewritten (estimate 3h → 1.5h). Next-session-prompt Task 1 DROPPED, Task 2 rescoped.

Lesson captured at `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_grep_verify_handoff_diagnostic_premises.md` continues to apply — the next-session-prompt + Spec 22 empirical-state section both carried a category-error framing (treating sparse-by-design as gap) until DB audit pressure-tested it. Sibling rule: R-22-8 (schema enumeration before "missing X" claim) — when an empirical-state count is load-bearing for a downstream action (script extension, Sonnet brief, council finding mitigation), the count itself is subject to the same gate as the action.

---

## 2026-05-26 — Spec 22 ratification + Spec 16 retirement

**D83 — Spec 22 acceptance gate softened to ≤5% Phase 1 + ≤1% Phase 1.5 stretch.** Bean directive 2026-05-26 after empirical validation surfaced: ZERO sections have ever hit ≤1% across 128 pipeline runs (best-ever absolute: trust-bar 24.6% at 768 viewport). D72 trust-bar retirement delivered −50.4pp / −27pp / −66.9pp relative wins but landed at 33.1/24.6/37.0% absolute — directional proof, not absolute. Hero-clone-poc page 29 (`/hero-clone-poc/`) is the visual-parity proof-of-concept: content matches mockup visually but pixel-diff reports 54.5% due to a 60px chrome-bleed alignment artefact in `scripts/pixel-diff.py`. Phase 1.5 stretch goal addresses the measurement methodology to bridge the residual ~4pp. R-22-13 makes Bean visual sign-off co-authoritative with the script number.

**D82 — Spec 22 walker rewrite is cold replacement, no feature-flag dual-run.** Phase 1 splits into 5 commits per R-22-5 (1.1 pre-rewrite snapshot; 1.2 atomic-tag-map migration; 1.3 ARRAY_LIFT_PATTERNS retirement + array-of-objects resolution; 1.4 universal walker — THE core; 1.5 measurement + halt/proceed decision). Pre-rewrite DB snapshot to `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` enables true rollback per F-RA-2.

**D81 — Hybrid block render.php migration is empirically scoped (Phase 0.4 audit).** Bean directive: spec doesn't hand-curate "container-shaped composite" lists. The classification dissolved; replaced by FR-22-6 `equivalent_block_for() returns non-NULL for ≥1 attr after role-exclusion`. **Audit shipped 2026-05-27 (commit `de300eb2`): actual roster = 61 hybrid blocks across 77 SGS audited.** Earlier "8-15" figure was a guess at high-content-composite count only; the canonical FR-22-6 criterion captures wider truth. Phase 2 prioritises by hybrid_attr_count descending (hero=11 first; single-attr blocks last). Per-block migrations parallel-session-eligible per FR-22-6.1 (no shared-file edits — render-helpers.php additions sequenced through main session).

**D80 — `wp-blocks.py` becomes unified data CLI over sgs-framework.db + selected uimax tables (Spec 22 FR-22-8).** Existing dual-DB connection (line 41) extended with 6 new subcommands (~150 LoC): `equivalent-block`, `recognition-log --write`, `naming-convention`, `gap-candidate --write`, `animation`, `component-library-match`. Performance threshold committed: ≤2ms cache-warm, ≤20ms cold per call. Subprocess for ad-hoc use; library import for walker-critical path. Per Bean correction 2026-05-26: not "greenfield" — extension of existing CLI.

**D79 — Spec 22 (Universal Block-Equivalent Extraction) lands.** Replaces Spec 16's layered architecture with a single universal walker (FR-22-3, exactly 3 permitted exceptions). BEM-only recognition (FR-22-1). Block-equivalent attrs become child blocks (FR-22-2). Role-exclusion rule (FR-22-2.2) shrinks hybrid scope. Array-of-objects resolution (FR-22-2.5). Cross-DB invariants (FR-22-8.1). 4-rater /gap-analysis council 2026-05-26 produced 48 findings: 33 valid + addressed in v0.3/v0.4; 10 partial-recalibrated; 5 dropped as category errors. Council findings table at Spec 22 §15. /docscore Grade A 100%. Status flips draft → active after Commit 0.0 cross-doc sync (this commit).

**D78 — Spec 16 (Deterministic Slot-Aware Converter) retires in full.** Archived at `.claude/specs/archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md` with retirement header. The layered FR1 fast path / FR4 normal route / lift_subtree_into_block_attrs / F1 fallback / 9-branch walk() / ARRAY_LIFT_PATTERNS / hardcoded ATOMIC_TAG_MAP architecture is dissolved. Rules R5 (CSS-drives-emission), FR6 (four-destination CSS router), FR7 (visual-QA verification) migrate into Spec 22. The "double-render" bug measured 2026-05-26 (sgs/product-card emitting 3.7× expected markup post-F1) is structurally eliminated by Spec 22's single-path architecture.

---

## 2026-05-25 — qc-council session → consolidated recovery plan + binding rules

**D75 — `/qc-council` 4-rater council validated the consolidated cloning-pipeline recovery plan (Section R of `.claude/reports/2026-05-25-qc-council-issue-register.md`).** Verdict: CONDITIONAL APPROVE pending F1 spike on brand alone before full Phase 1 dispatch. Raters surfaced: (a) F1 needs smallest-slice baseline measurement before Phase 1 dispatch (R4 — ghost-of-2026-05-21-Wave-1 risk); (b) acceptance gate corrected per Bean to per-section ≤30% × 3 viewports for Phase 1, then ≤1% in Phase 1.5; (c) F2 cascade-fold must ship same-wave as F1 (R4 — ghost-of-2026-05-24 regression); (d) ~17 commits per Phase 1 with /qc-council gate between high-leverage commits (per blub.db row 288 captured this session); (e) 1G G5 per-block fixes made CONDITIONAL not pre-committed (R1 — Spec 16 §15 line 982 says G5 dissolves if walker is universal); (f) 0B allowed-nesting AUTO-DERIVED from block_attributes + slot_synonyms + block_capabilities not hand-curated; (g) 1D `count_stars` replaced via universal COUNT-children-by-slug not "special extractor kind". Gaps R3 raised (state-based CSS, modifier CSS, multi-class selectors, G4) all confirmed COVERED by existing DB schema (modifier_suffixes state-kind rows + property_suffixes hover suffixes + naming_conventions SGS-BEM regex) OR resolved (G4 per Spec 16 §14.4). Plan = `.claude/plans/2026-05-25-phase-1-universal-extraction.md` (Section R promoted to canonical phase plan).

**D74 — Phase 1 scope = consolidated qc-council recovery plan (universal-extraction backbone).** Phase 1 ≠ a single step; it's the full architectural solution to every gap the qc-council surfaced (F1 universal-nesting + extended DB-driven ATOMIC_TAG_MAP + universal child-block extraction + universal array-attr extraction + G3 visual slot extraction + G1 OPEN-block for FR1 composites + conditional G5 per-block + sgs/quote render.php β-migration + patterns.block_composition population + pattern fast-path + cheat removal). Phase 2 (header/footer cloner) is parked because it depends on a working body pipeline. Acceptance: per-section ≤30% × 3 viewports for all 7 body sections. Subsequent Phase 1.5 closes per-section to ≤1%, after which Phase 2 opens. Old phase-1 plan archived at `.claude/plans/archive/2026-05-24-phase-1-structural-recovery-superseded-by-phase-1-universal-extraction.md`.

**D73 — Phases never ship as single commits (binding rule).** Captured as blub.db row 288 / `feedback_phases_never_ship_as_single_commits.md`. Every major task in any Phase commits separately with: (a) `/qc-council` or `/qc-inline` pre-commit gate; (b) living-docs updates per trigger table; (c) `/sgs-clone --debug-trace` + Stage 11 measurement comparing pre/post; (d) commit message citing predicted vs actual delta. Per-task skill bindings: `/subagent-driven-development` + `/delegate` + `/verify-loop` + `/capture-lesson`. Sibling rules: blub.db row 255 (multi-model /qc per converter commit) + row 276 (council fix-shapes are hypotheses) + P20 (one fix at a time). Anti-pattern of record: 2026-05-24 second-pass session (5 changes shipped as one wave, regressed pixel-diff 70.5% → 73.9%, regression unattributable).

---

## 2026-05-25 — sgs/trust-bar block retired; universal-nesting takes over

**D72 — sgs/trust-bar block retired in favour of universal-nesting via canonical primitives.** Block source files deleted (`src/blocks/trust-bar/`, `build/blocks/trust-bar/`). DB rows deleted across 9 tables (69 rows in sgs-framework.db, 1 in uimax.component_libraries). Hardcoded special-case removed from `confidence-matrix.py` COMPOSITE_PRIORITY, `seed-legacy-role-lookup.py` ENTRIES (2 rows), `lingua_franca.py` slot_map, `generate-markup-examples.py` composites set, `BlockDeprecationsTest.php` AFFECTED_BLOCKS, `blocks.spec.ts` block list + markup test fixture, `test_ensure_root_section_class.py` self-closing test (switched to sgs/notice-banner). Block was a duplicate concept: counter use-cases now use sgs/counter (canonical single-counter block); badge use-cases now emit via universal-nesting (sgs/container > sgs/label children, with the converter resolving `__badge` BEM elements to sgs/label via `slot_synonyms.standalone_block`). Mama's homepage Stage 11 results post-retirement (run `mamas-munches-homepage-2026-05-25-101222`): trust-bar pixel-diff 375 87.4% → 37.0% (-50.4pp); 768 51.6% → 24.6% (-27.0pp); 1440 100.0% → 33.1% (-66.9pp). Mean page diff 68.4% → 63.2%. Remaining trust-bar gap is styling-shape (sgs/label badge render vs mockup span+svg shape) — block-level extensions territory, not block-level special-cases. critical-fix-verification flagged `no_canonical_block_mutation` as false-positive from uncommitted source deletions; cleared at commit.

---

## 2026-05-25 — Step 1.7 G3 reframing (architectural correction after D70)

**D71 — Step 1.7 G3 reframed: pixel-diff side closed by D70; failure-count side empirically misframed; universal-nesting (§15) is the canonical closure path.** Multiple earlier prescriptions in Spec 16 §14.3, §15 row 977, Phase 1 plan Step 1.7, and `.claude/next-session-prompt.md` (all from same-day patches earlier on 2026-05-25) pointed Step 1.7 at file paths that didn't exist (`slot_list.py`) then at `convert.py:_slot_attr_prefix` extension. A Sonnet implementer ran the prefix fix end-to-end and demonstrated empirically it addresses only 7 of the 473 `extraction_failed` events — 440 of which are legitimate `value_empty` for features genuinely absent from mockups (hover states, bgVideo, transitionDuration). The original `<30` failure-count gate is unachievable without semantically falsifying absent features. The operational symptom G3 was meant to close (pixel-diff regression on body sections) was closed independently by D70 (Stage 10 inline-CSS deploy). All four docs re-framed in this commit. Lesson captured at `feedback_read_full_spec_before_proposing_architectural_fix_shape.md` (blub.db row `capture-f9063d258798`). Sub-rule: when patching specs to correct file-path drift, fix paths ONLY — do not bundle unverified fix-shape prescriptions into the same patch (that converts drift correction into drift introduction). Step 1.8 (universal-nesting / G1 extension to non-hero composites) absorbs the residual failure-count work.

---

## 2026-05-25 — Stage 10 inline-CSS deploy (closes 4-section pixel-diff regression)

**D70 — Stage 10 (`upload_and_patch.py`) now deploys `variation-d0-d2.css` as an inline `<style>` block prepended to the page's `post_content` (wrapped in `wp:html` so Gutenberg preserves it across edits).** Closes the architectural gap where the 4-destination CSS router (Spec 16 §FR6) wrote correctly-scoped D0/D2 rules to `pipeline-state/<run>/variation-d0-d2.css` but Phase 5a's snapshot-only deploy never moved them off-disk. Result on Mama's homepage: Stage 11 mean 74.1% → 68.4% (-5.7pp), with localised body-section drops of -15 to -41pp (gift-section -39pp at desktop, social-proof -40pp at desktop, ingredients -22pp at mobile). Header at 375px regressed +59pp due to pre-existing duplicate-header issue (mockup header now visible alongside framework header part) — separately tracked at parking entry `P-DUPLICATE-HEADER-EXPOSED-BY-INLINE-CSS-FIX`, resolves at Phase 2 (header+footer cloner). Rules already scoped via `.page-id-N` prefix in router output → no cross-page leak. Spec 16 §FR6 D2 description updated. Pipeline-stages doc updated. ~20-line addition at `upload_and_patch.py` after block_markup image-URL patching, before extract.patched.json write.

---

## 2026-05-25 — Doc-op programme: adoption surface + hook + council remediation

**D66 — PostToolUse hook `docscore-on-doc-edit.py` shipped.** Auto-runs `docscore.py` on every Write/Edit to in-scope `.claude/`/`specs/`/`plans/` markdown. Silent on pass; advisory to stderr when score < 90% Grade A-. Registered in `~/.claude/settings.json` under the existing `Write|Edit` PostToolUse matcher. Out-of-scope dirs (memory/, scratch/, reports/, .git/) skipped at the hook level for parity with docscore's own scope rule. Means future doc edits get scored automatically without operator-remembered docscore invocation.

**D67 — Adoption-surface updates across global + project + working-area.** Phase 13 standards now propagated to every surface that drives behaviour:
- `~/.claude/CLAUDE.md` (global) — added `## Doc-op standards (2026-05-24)` 12-line section listing all 17 canonical doc-types + 6 rules
- `~/.claude/commands/handoff.md` — added `Gate 4.6 — Docscore on changed in-scope docs` between Gate 4.5 and Gate 4.8 + parking.md shape check in Gate 4.5
- `~/.claude/skills/autopilot/SKILL.md` — added `docs/doc-op/docscore/template/frontmatter` row to Domain Classification + strategic/phase-plan preload rule in Stage 0
- `<project-root>/CLAUDE.md` — added `## Doc-op standards (Phase 13 close, 2026-05-25)` 11-line section pointing at D57-D65 + 4 per-session rules
- `~/.agents/skills/subagent-prompt/SKILL.md` — fixed stale "11 doc types" → "17 doc types"
- `.claude/CLAUDE.md` (working area) — updated D57-D60 reference to D57-D65

**D68 — /qc-council triangulated 3 high-confidence template fixes (applied):**
- T1 (over-engineering): 4-layer Verification was mandatory on every step. Now conditional — `Happy:` + `Outcome:` always; `Edge:` + `Fail:` + `Integration:` only on `Marker: QA` steps OR steps where `Files:` touches live infra (SSH/DB/REST/deploy). "N/A" acceptable elsewhere. Drops phase-plan writing overhead ~40% on simple plans.
- T2 (functional bug): templates declared `required_sections: []` empty while prose said certain sections were mandatory. Mandatory sections now in YAML: strategic-plan `[Out of scope, Phase overview]`, phase-plan `[Pre-conditions, Parking lot]`. Docscore checks now machine-enforce.
- H1 (ADHD Rule 3 alignment): strategic-plan frontmatter gains `motivation:` field — re-entry after 7+ days surfaces "why this matters".

5 active plan docs updated with the new mandatory sections (Out of scope + Phase overview on strategic; Pre-conditions + Parking lot on each phase) — all 5 still 100% Grade A.

## 2026-05-25 — Doc-op programme: strategic-plan + phase-plan templates (merged from skill spec + research)

**D65 — `strategic-plan` and `phase-plan` doc-type templates created** in `~/.agents/skills/shared-references/doc-templates/`. Built by merging OUR skills' learned output specs (`strategic-plan` plan-template + `phase-planner` 14-field step block) with research-distilled rules (PMI / SAFe / Shape Up / OKR / Stage-gate / DevOps runbook / Ansible / Claude Code best practices).

**Strategic-plan template** keeps OUR sophistication (Work Units with Files/Depends/Blocks/Estimate/Risk/checkbox Steps/VERIFY, GATE blocks with Pass/Fail/Decision, Effort Summary + Session Plan tables, Hidden Decisions pass, per-phase handoffs) AND adds RESEARCH anti-pattern fixes (mandatory `timebox` frontmatter field per Shape Up, mandatory `## Out of scope` section per Shape Up + Stage-gate, ROAM risk-status enum per SAFe, dependency owner column per SAFe, phase overview table ≤13 rows per PMI, problem statement ≤200 words).

**Phase-plan template** keeps OUR sophistication (Plan-Level Label `[PLAN: opus|sonnet|blub]`, USP / Aggregate cost in phase header, 4-layer Verification block — Happy/Edge/Fail/Integration, Marker enum — SESSION-START/HANDOFF/QA, Cold-Entry + Prompt fields for subagent dispatch, Tooling Index table) AND adds RESEARCH additions (mandatory `## Pre-conditions` checklist BEFORE start, per-step `Pre-condition:` + `Rollback:` fields completing the PAVR shape, mandatory `## Parking lot` section even if empty, no-shared-file-parallel HARD GATE via Files-field cross-check, cold-prompt-readiness rule for parallel-dispatched steps).

**Verification:** 5/5 project plan docs score 100% Grade A against the new templates. Total 15/15 in-scope docs now passing at 100% A (CLAUDE / parking / mistakes / decisions / dev-setup / cloning-pipeline-stages / spec 17 / spec 21 / 2 archived plans / 5 active plans).

Full research: `~/.openclaw/workspace/memory/research/2026-05-24-strategic-plan-and-phase-plan-best-practice.md` (11 cited sources). Skill output specs (`strategic-plan/references/plan-template.md`, `phase-planner/SKILL.md` Step Format) remain as-is for now — next session can update them to emit the new mandatory sections automatically.

## 2026-05-24 — Doc-op programme: docscore.py technical-debt close-out

**D64 — 10 SonarLint warnings on docscore.py closed (cognitive complexity + dead-code).** Per Bean's "nothing parked" rule: refactor extracted 11 helper functions (`_coerce_fm_scalar`, `_find_fm_end`, `_detect_doc_type_from_path`, `_warn_doc_type_constraint`, `_score_folder_json`, `_score_folder_human_subprojects`, `_score_folder_human_flat`, `_resolve_walk_root`, `_build_doc_context`, `_registry_missing_paths`, `_group_by_subproject`, `_score_paths_human`). `parse_frontmatter` cc 25→≤15; `detect_doc_type` cc 16→≤15; `score_folder` cc 49→≤15. Removed 5 Unicode-box-drawing section dividers SonarLint flagged as commented-out code. Removed unused `current_key` variable. Behaviour preservation gate verified: 10/10 in-scope docs still 100% Grade A; adversarial back-door test still rejects. Lives in `~/.agents/skills/shared-references/docscore.py` (1168 → 1185 lines = +17 net for the helpers).

## 2026-05-24 — Doc-op programme: doc-type back-door close + skill alignment

**D62 — doc_type self-declaration back-door closed in `docscore.py`.** Per qc-council Rater B finding (2026-05-24): any file could declare `doc_type: spec` in frontmatter and bypass spec-only checks. Fix: spec/archived-plan/dev-setup templates gain `filename_glob` + `required_dir` + `required_grandparent_dir` fields. `detect_doc_type` validates these constraints before honouring a declared doc_type; mismatches emit stderr warning + fall through. `reference` catch-all has no constraints (any doc can claim it). Adversarial tests pass: `doc_type: spec` on non-numbered or wrong-dir files rejected. Off-tree commit in `~/.agents/skills/shared-references/docscore.py` + 3 template files.

**D63 — Doc-touching skills aligned to Phase 13 standards.** Audit (Sonnet subagent 2026-05-24) of every doc-producing skill/command found 4 minor + 3 major drifts from the new templates. All 7 fixed in `~/.claude/skills/` + `~/.agents/skills/`:
- `docscore` command: doc-type list updated 11 → 15 (added archived-plan, dev-setup, reference, spec)
- `spec-writer` output-templates: status enum 6 → 8 values (added superseded, retired)
- `spec-writer` CLAUDE.md template: rewritten to reference Karpathy R1-R7 rules (≤80 lines, ≤5 IMPORTANT markers, verb-first, no inferable knowledge, hooks over repeated rules)
- `phase-planner`: `doc_type: plan` → `doc_type: archived-plan` for completed phases
- `project-init`: Phase 0 scaffold expanded 13 → 14 items (added `dev-setup.md`)
- `strategic-plan` plan-template: added YAML frontmatter stub with status enum
- `project-consolidate`: scaffold count 13 → 14; added Phase 13 doc-type addendum (archived-plan / dev-setup / reference + scope rule excluding memory/scratch/reports)

`capture-lesson` + `handoff` command + `gap-analysis` + `qc-council` already aligned (shipped earlier this session). 8 doc-touching skills/commands verified in-sync.

## 2026-05-24 — Doc-op programme: Phase 13 full /docscore rule integration

**D60 — Phase 13 expanded: U5 + X1 + X5 checks added to docscore.py + 5 doc-type templates rewritten to Phase 6c canonical shape.** Built on D59 by recovering U1-U8 / X1-X5 rule spec from `2774a269` (dropped by `3488b537`'s prompt update). Lives in `~/.agents/skills/shared-references/`. Template gains `meta: dict` field; `check_heading_hierarchy` honours per-template `require_h1: false`; 3 new checks: `check_no_dead_links` (U5), `check_registry_resolves` (X1), `check_memory_md_size` (X5). Verified: parking=100% A, next-session-prompt=100% A, decisions=79% B-, handoff=68% C, mistakes=69% C. Commit `3488b537` + this session.
Status: active

---

## 2026-05-24 — Doc-op programme: parking restructure + spec relocation + retention policy

**D57 — Parking.md formatting v2 (Phase 6c).** 6 stable taxonomy buckets replace date-ordered sections; every entry carries `**Status:**` field (OPEN/PARTIAL/BLOCKED/DEFERRED); slug-uniqueness gate added to `/handoff`. 103 active entries (was 135). Commits `52e34171` + `ed05757f` + session close.
Status: active

**D58 — Spec relocation (Phase 9C').** `.claude/specs/` = project-scoped framework specs only; cross-cutting specs → `~/.claude/specs/`. Comparator reports → `reports/`. Strategy/staging docs → `plans/strategy/` or `plans/archive/`. 33 → 19 specs. Commits `ed05757f` + `e8958433`.
Status: active

**D59 — Per-doc-type retention TTL on `.claude/memory/` (Phase 7 F4).** `next-session-prompt-*.md` → 30-day TTL; `handoff-*.md` → 60-day TTL; everything else permanent. Encoded in `docs-registry.yaml`. Commit `c23d8948`.
Status: active

---

## 2026-05-24 — Source-DB retirement: blocks.db + hooks.db deleted (architecture-staging Phase 1 close-out)

**D56 — Standalone source DBs deleted; data migrated into sgs-framework.db with `source` column.** `blocks.db` (459 KB) + `hooks.db` (24 MB) + 623 MB caches deleted. Back-filled 122 variations + 331 markup_examples + 187 hooks. Read paths ported: `wp-blocks.py`, `wp-docs.py`, `sgs-update-v2.py` Mode A/Stage 3. Mode A now graceful no-op when cache absent. ~647 MB disk recovered. New lessons: `feedback_data_migration_needs_read_path_port.md` + `feedback_shipped_claims_need_grep_verify.md`. Commit this session.
Status: active

---

## 2026-05-24 — `block_compositions` table merged into `patterns.block_composition`

**D55 — Pattern composition data moved from standalone `block_compositions` table → `patterns.block_composition` JSON column; standalone table dropped.** 35 of 37 rows ported (2 orphans dropped). Writers ported: `pattern-register.py` + `seed-block-compositions.py`. Composition data remains write-only at /sgs-clone runtime; parent-child relations still read from `blocks.parent_block` + `slot_synonyms.standalone_block`. Commit this session.
Status: active

---

## 2026-05-24 — BEM-is-canonical walker + Stage 4 wiring

**D48 — BEM element name IS canonical signal for block recognition; HTML tag is rendering shape only.** Tag-based routing (`canonical_for_html_tag`) reverted — created second canonical path conflicting with BEM-as-canonical. Correct fix: data-layer (move "quote" alias in slot_synonyms); zero walker code changes. Commit `124e1d06` area.
Status: active

**D49 — Walker code stays universal; data-layer drives recognition.** Zero per-tag/per-block/per-section hardcoding in walker composite_element + section_inner_absorb branches. All recognition from slot_synonyms.aliases + standalone_block + block_attributes. Adding new block recognition = DB rows, not walker edits. Commit this session.
Status: active

**D50 — `/sgs-update` Stage 1 tail invokes `assign-canonical.py`.** Script was never wired into `sgs-update-v2.py` despite Spec 16 §12.6 Stage 4 declaring it. Fix: `stage_1_sgs_codebase_scan()` calls `assign-canonical.py` as subprocess after scan. Future runs auto-populate `canonical_slot` for new array attrs. Commit this session.
Status: active

**D51 — `assign-canonical.py` array-attr fallback: singularise + Tier B registered-block reverse-lookup.** Plural collection attrs (`testimonials`, `logos`, etc.) missed slot_synonyms. Fix: singularise (ies→y, ses→s, trailing s) → Tier A alias lookup → Tier B `sgs/<singular>` registered-block reverse-lookup. No hardcoded attr-name list. Commit this session.
Status: active

**D52 — Transparent-wrapper absorb at section root (one-section-one-container).** Walker pre-pass `_absorb_transparent_wrappers()` runs before `walk()` for top-level sections. Absorbs single direct-child wrapper when it has no block-spacing or positioning CSS AND isn't a registered SGS composite block. 4 single-wrapper Mama's sections → ONE outer sgs/container. FR1-matched sections correctly skipped. Commit this session.
Status: active

**D53 — Brand mockup BEM renamed for Spec 00 consistency.** `<blockquote class="sgs-brand__body">` → `<div class="sgs-brand__quote">`; `<footer>` → `<p class="sgs-brand__attribution">`. Tag choice doesn't affect block emit; BEM element makes draft a clean Spec 00 reference. Commit this session.
Status: active

**D54 — ARRAY_LIFT_PATTERNS hardcoded dict deletion DEFERRED.** Universal BEM-child array lifter (1e-B) now resolves via canonical_slot but doesn't yet replicate: (a) `count_stars` extractor for ratings, (b) multi-selector fallback chains. Full removal parked as P-ARRAY-LIFT-PATTERNS-FULL-MIGRATION. (no commit — planning-only)
Status: active

---

## 2026-05-24 — Step 1.6 wp-sgs-developer audit

**D46 — Walker pre-pass addresses Stage 4 emit shape, not Stage 2 match.json confidence.** `_walker_pre_pass` (commit `124e1d06`) changes WHAT Stage 4 emits but NOT Stage 2 confidence — confidence_matrix.py runs before Stage 4 independently. Phase 1 plan gate (condition c: match.json confidence < 0.5 → 0 sections) cannot be met by a Stage 4 fix alone. Resolution parked as P-MATCH-JSON-GATE-REDEFINITION.
Status: active

**D47 — Structural improvement + visual regression coexist when CSS lift is pending.** A structurally correct emit can INCREASE pixel-diff relative to a structurally wrong emit if per-block CSS hasn't been lifted yet. This is NOT a reason to revert structural fixes — it is a reason to sequence CSS lift as step+1 in the same session. Never commit structural fix without CSS lift following immediately. Commit `124e1d06`.
Status: active

---

## 2026-05-23 — Diagnostic + fix session (Q1A / Q1B / Q3 / Stage 10 / Stage 11)

**D41 — `core/group` → `sgs/container` as Stage 2 confidence-matrix fallback.** `core/group` has no SGS-BEM attributes; commit `d8ae4a2a` changes fallback to `sgs/container` (universal SGS layout primitive). `legacy_role_lookup` gains one row (18 total). Aligns with D3 (2026-05-20).
Status: active

**D42 — Hand-authored patterns deleted; deterministic-only rule enforced.** `brand.php` + `ingredients-section.php` deleted (commit `c1aa4cc5`). Pattern count: 53 (was 55). Hand-authored patterns bypass the converter and allow a second source of truth — forbidden.
Status: active

**D43 — Stage 0.7 CSS dump relocated from `theme/sgs-theme/styles/<client>.css` to `pipeline-state/<run>/variation-d0-d2.css`.** Conflating pipeline intermediates with deploy artefacts was architectural debt. Post Phase 5a, `styles/` directory contains only framework-level CSS. Status: in progress / commit pending from 2026-05-23.
Status: active

**D44 — Stage 10 silent-failure fix: named exit codes 4/5/6.** commit `700ff211` adds exit 4 (phantom page), exit 5 (id-mismatch), exit 6 (no-id-in-body). Silent Stage 10 failures would cause Stage 11 to diff against stale content.
Status: active

**D45 — Stage 11 added: per-section pixel-diff against actual deployed page.** Commit `1331f23a`. Stage 8 = pre-deploy autonomy gate (locally-rendered HTML); Stage 11 = post-deploy verification (live WP render). Together they close the full loop. Output: `pipeline-state/<run>/stage-11-pixel-diff.json`.
Status: active

---

## 2026-05-22 — Architecture programme close-out (Phase 4 + Phase 7 + parking sweep)

**D37 — Source 2 counter gates on extraction-count, not insert-count.** `s2_extracted > 0` is canonical Mode B Source 2 health signal (insert-count stays zero on dry-run). Commits `9f1e2194` + `99081252`.
Status: active

**D38 — Source 4 calibration threshold tightened (100 → 30).** Live test: page returns 91 rows with simple HTTP fetch — below old threshold. `playwright-fetch.js` created for JS-render step.
Status: active

**D39 — GitHub PAT format: classic `ghp_*` required for Mode B.** Fine-grained tokens returned 401 on Source 5 (GitHub API). Classic PAT with `public_repo` scope succeeds. PAT stored in `~/.openclaw/.env` as `GITHUB_PERSONAL_ACCESS_TOKEN`.
Status: active

**D40 — Council predictions are hypotheses; empirical gate mandatory before treating as specs.** Wave 1 G2+G4 fixes produced zero pixel-diff movement despite correct implementation — fix-shape proposals targeted wrong code paths. Rule: any council output proposing a fix shape requires empirical-validation step before subagent dispatch. blub.db row 276.
Status: active

---

## 2026-05-22 — Phase 1.5 inserted + Phase 2 parser strategy change

**D32(arch-staging) — Phase 1.5 inserted: block variations + styles.** 67 of 69 SGS blocks had zero inserter-discoverable variations. Phase 1.5 authors 12 composite blocks × 2-4 variations × 2-3 styles each via PHP sibling files in `includes/variations/`. Plan: `.claude/plans/phase-1.5-variations-styles-default-styles.md`. (no commit — planning-only)
Status: active

**D33(arch-staging) — Phase 2 parser strategy: runtime enumeration, not source parsing.** Static PHP source parsing crashed twice. Replacement: `wp eval` against live WP block type + styles registry (`WP_Block_Type_Registry` + `WP_Block_Styles_Registry`). Canonical going forward — any future variation/style indexing reads runtime state.
Status: active

---

## 2026-05-21 — Architecture session (31-decision holistic redesign)

**D27 — DB consolidation: three databases merged into sgs-framework.db with `source` column.** wp-blockmarkup-mcp blocks.db + wp-devdocs-mcp hooks.db + sgs-framework.db → one DB. `docs` table extended with `doc_type='cli-command'`; `indexed_files` added for incremental `/sgs-update`. Shipped 2026-05-24 (was Phase 1 target). See `.claude/plans/2026-05-21-architecture-staging.md` §3 D1,2,11.
Status: active (shipped)

**D28 — Style-variation system killed; per-site theme.json adopted.** 9 client variation JSONs replaced with per-client `sites/<client>/theme-snapshot.json`. Three PHP files deleted; new `push-theme-snapshot.py` CLI deploys snapshots. Commit `43a93df9`. See staging doc §3 D14′,16′,17′,18,19.
Status: active (shipped)

**D29 — INNER_BLOCK_PATTERNS dict retired; DB-backed lookup.** Hardcoded two-entry dict replaced by `blocks.parent_block` + `slot_synonyms.standalone_block` DB lookups. Adjacent-slot grouping added. Phase 0 data seeding: commit `aec54882`. See staging doc §3 D3,4,5,6,12,24.
Status: active

**D30 — Button presets migrated to native WP 7.0 theme.json.** WP 7.0 natively generates 100% of `--wp--custom--button-presets--*` props from `theme.json`. `class-button-presets-admin.php` deleted; `wp_options[sgs_button_presets]` absent on sandybrown. Commit `60220b13`.
Status: active (shipped)

**D31 — Structural QC enforcement hook wired.** PostToolUse hook at `.claude/hooks/qc-on-converter-edit.py`. Fires when Write/Edit targets `converter_v2/convert.py` or `sgs-clone-orchestrator.py`. Commit in staging doc §11 D31.
Status: active

**D34 — Lucide icons refactored to WP 7.0 Icons REST controller (Phase 6).** Consumers get unified REST endpoint instead of bespoke resolution code. CAUTION: `wp_register_icon_collection` does NOT exist on WP 7.0 despite `WP_REST_Icons_Controller` existing — research correct entry point before implementing. See staging doc §11 D28.
Status: active (pending)

**D35 — Customiser migration of header/footer/site-info admin with View Transitions (Phase 5b).** New PHP classes `Sgs_Header_Customiser` + `Sgs_Footer_Customiser` + `Sgs_Site_Info_Customiser`. Pattern follows `Sgs_Floating_UI_Customiser`. Commit `60220b13`. See staging doc §3 D21,27.
Status: active (partially shipped — see D22/D23 Session B)

**D36 — WP 7.0 alignment audit for 10 wp-* skills (Phase 7).** Checks: deprecated API refs, missing WP 7.0 APIs, stale code examples across `wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`. See staging doc §11 D29.
Status: active (pending)

---

## 2026-05-21 — QC trio + skill cleanup + Wave 2 reshape

**D21(skill) — `/qc-council` created as empirical-validation gate before subagent dispatch.** 8-stage protocol: DETECT → LOAD GROUND TRUTH → SEED PERSONAS → DISPATCH → DEBATE → EMPIRICAL VALIDATION (HARD GATE, blub.db row 276) → EXPERIMENT DESIGN → IMPLEMENTATION → REPORT. Skillscore 92% A-. (no commit — skill file)
Status: active

**D25 — `/gap-analysis` Step 7.75 delegates to `/qc-council`.** Primary path replaces ~80 lines of duplicate 3-rater panel logic. `qc_review` JSON schema preserved for backwards compatibility. (no commit — skill file)
Status: active

**D26 — Wave 2 reshape: G1+G3+G5 are ONE wiring gap, not three problems.** `/wp-blocks dump` confirmed all mapping data exists in sgs-framework.db. G1+G3+G5 symptoms all from same gap: cv2 doesn't walk all classes + assign CSS ownership + record parent-child relations using existing DB tables. FR1 fast-path "fix" = one-line consistency add; not hero-special. (no commit — diagnosis)
Status: active

---

## 2026-05-20 — Phase 1 Spec 16 §FR6 rewrite + Phase 2 future capabilities

**D1(2026-05-20) — Path A: site-wide variation activation (NOT per-page meta override).** Stage 10 activates variation via `set_theme_mod('active_theme_style', $slug)` site-wide. Per-page override (Path B) rejected — each client gets own WP install in production; multi-client-on-one-install is not a real scenario. Commits `8ceb8787` + read-back confirmation + exit-3 failure surface.
Status: superseded-by-D28 (style-variation system killed 2026-05-21)

**D2(2026-05-20) — Token-snap requires strict exact-match.** Nearest-match snap caused visible regressions. Per Bean's binding: "if value matches global default, use token; if not, insert literal." ΔE2000 ≤ 1.0 for colour; ≤ 1px for spacing/font-size. Commit `8a996194`.
Status: active

**D3(2026-05-20) — Spec 16 §FR6 four-destination CSS router replaces verbatim Stage 0.7 dump.** `css_router.py` routes every CSS rule to D0 (global) / D1 (typed-attr-lift) / D2 (wrapper-CSS scoped) / D3 (gap-candidate). Every rule routes to exactly one destination — no silent drops. Commits `05fb38a4` + `44ba373b` + `dce5a496`.
Status: active

**D4(2026-05-20) — Header/footer/nav structural defence-in-depth (two layers).** Tool layer: PostToolUse hook `no-header-footer-block.py` blocks Write/Edit on `src/blocks/(header|footer|nav)/` (commit `8838b6fb`). Source layer: `_is_chrome_section()` in Stage 9b detects chrome at 4 boundary signals (commit `3a70587c`).
Status: active

**D5(2026-05-20) — Attribute-gap promotion is end-of-line cleanup, NOT primary pixel-diff path.** 3-rater council confirmed promotion closes last 5-10%; dominant 50-85% gap is structural (G1-G5). Ship G1-G5 + F5 FIRST. See `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md`.
Status: active

**D6(2026-05-20) — Block-variation system uses native WP `register_block_variation()`.** Confidence 0.70-0.90 against existing block + attribute differences → emit `wp:sgs/<block> {variantStyle:'featured'}`. PHP loader at `includes/variations/class-sgs-block-variations.php` auto-discovers `sgs-*.php` files. Commit `36ef9552`.
Status: active

---

## 2026-05-19 — cv2 RCs + deploy consolidation + Stage 10 + skill rename

**D1(2026-05-19) — `/deploy` → `/wp-sgs-deploy` rename + `/deploy-check` absorbed as Phase 1.** Three deploy concepts conflated. New canonical homes: `/wp-sgs-deploy` (framework + checklist), `/sgs-clone --deploy-target page:<id>` (per-page). `--skip-check` flag for trusted micro-patches.
Status: active

**D2(2026-05-19) — Stage 10 wired: per-page deploy in cloning pipeline.** `upload_and_patch.py` wired as Stage 10 with `--deploy-target page:<id>` / `post:<id>`. Fires after Stage 9c; soft-fails. Commit referenced in skill.
Status: active

**D3(2026-05-19) — All 10 static SGS blocks converted to dynamic.** Mixing static + dynamic caused "invalid block" errors in cv2 (self-closes only valid for dynamic). `_STILL_STATIC_SGS_BLOCKS = frozenset()`. Deprecated.js shims for backward compat. Commit batch 1 + 2 this session.
Status: active

**D4(2026-05-19) — Container block is canonical advanced-background wrapper.** Hero block.json dual-cascade anti-pattern removed. Container extended with 4 background modes (Image, Video, Animation incl. parallax + ken-burns, Overlay incl. gradient). 15 new attrs. Hero defaults removed.
Status: active

---

## 2026-05-19 — Spec 17 Header/Footer Architecture (Waves 1+2+2.5+3) — summary

**D(spec17) — CPT REST gating: `sgs_header` + `sgs_footer` CPTs require `edit_theme_options` for REST access.** Anonymous REST calls return 401. File: `includes/class-sgs-block-cpts.php`. Variation picker uses resolver-only `_resolve_global_styles_post_id()` path (single direct DB lookup, cached). Two-layer ReDoS guard on rules engines: 256-char input cap + static blocklist of catastrophic-backtracking constructs.
Status: active

---

## 2026-05-18 — P-WP-ALIGNMENT-WIDTH-SYSTEM shipped

**D(width-system) — cv2 pipeline targets WP PAGES not POSTS; `widthMode` infrastructure built.** Posts use `single.html` (max-width 800px); pages use `page.html` (no constraint). 14.3-point pixel-diff drop from this single change. New `widthMode` enum (default/wide/full/custom × per-viewport) on sgs/container; converter maps mockup max-width → semantic widthMode or literal. Commits `c7f42003` + `86172812`.
Status: active

---

## 2026-05-17 — Universal recognition + conversion session close

**D(a-2026-05-17) — `parse_css` regex was the single biggest recognition hole.** Old regex matched 0 of 13 `@media` blocks (whitespace between rules). Replaced with brace-balanced scanner. 13/13 media blocks captured; hero `headlineFontSizeDesktop` now 58 (was 34). Commit `20ef1d66`.
Status: active

**D(b-2026-05-17) — DB-first lookups, no hardcoded dicts.** `_CSS_PROP_TO_SUFFIX` (21 rows) replaced by `db.css_property_suffixes()` reading `property_suffixes` table (117 rows). `_BREAKPOINT_SUFFIXES` replaced by `db.breakpoint_suffix_rules()`. blub.db row 260 + Rule 11 HARD-GATE in `/sgs-clone`. Commit `168fd2ca`.
Status: active

**D(c-2026-05-17) — Walker preserves SGS-BEM grouping wrappers.** Non-top-level `sgs/container` with `bem.element` set AND inner blocks → preserve as nested `sgs/container` with className. Pass-through still fires for unnamed wrappers. Commit `df3a6cbf`.
Status: active

**D(function-exists) — `function_exists()` guards universal on all render.php top-level helpers.** "Cannot redeclare" fatals recurred. Every top-level function in any render.php MUST be wrapped in `if ( ! function_exists() ) { ... }`. Applied to all helpers.
Status: active

---

## 2026-05-16 — Spec 16 Phase 8 session: accuracy + universality

**D(phase8-b) — Slot→standalone-block routing is DB-driven, not code-driven.** `slot_synonyms.standalone_block` column added; hardcoded `SLOT_TO_STANDALONE_BLOCK` dict removed. Migration: `migrations/2026-05-16-slot-synonyms-standalone-block.py`.
Status: active

**D(phase8-h) — WP `file:` render wrapper discards return values (CRITICAL).** `_wp_block_render_callback_from_file()` wraps file in its OWN `ob_start()` + `ob_get_clean()`. File's return value is thrown away. render.php MUST echo directly via `printf()` / interleaved `<?php ?>` HTML — never `return ob_get_clean()`.
Status: active

---

## 2026-05-14 — Spec 16 decisions (core architecture)

**D(spec16-2) — "CSS drives emission, never drop" (R5 re-architected).** 3-destination routing: (1) typed-attribute lift, (2) markup wrapper with className, (3) attribute_gap_candidates row. Every CSS rule MUST hit one destination. Converter self-extending via Spec 15 §4.2 table.
Status: active

**D(spec16-3) — sgs/container is MANDATORY at section-level, AVAILABLE elsewhere.** Auto-emission only at top-level section boundary. Nested wrappers pass through UNLESS CSS rules target them (then emit per Destination 2).
Status: active

**D(spec16-9) — Parallax scroll NOT applicable to logo / icon / header blocks.** Parallax-on-logo breaks visual anchor; parallax-on-header breaks sticky/transparent behaviour + causes jank. `supports.sgs.parallax` is opt-in but MUST NOT be wired for `sgs/responsive-logo`, `sgs/icon`, or the header behaviour wrapper. Permanent.
Status: active

---

## 2026-05-14 — Phase 6 v2 Step 5: Rosetta Stone chokepoint + IP-defence framing removed

**D(step5) — Rosetta Stone chokepoint propagated; IP-defence framing removed at root.** `_insert_uimax_pattern` + `sgs-update-uimax-sync.py` route through `uimax_write.validate_and_write`. `LICENSING_BANNED_SUBSTRINGS` + `find_licensing_violations()` removed entirely — UI patterns aren't copyrightable; the gate was theatre. 3 regression-guard tests added to prevent re-introduction. 109/109 tests pass. Commits this session.
Status: active

---

## 2026-05-13 — Spec 15 Phase 5 + Phase 6 Step 0: +REGISTER wired

**D(phase5g) — Phase 5 partial closure accepted; canvas pipeline structural defect closed.** 6 of 9 blocks routed to unregistered blocks (WordPress silently drops them). Fix path chosen: hard gate in confidence-matrix (reject `registered=False`); bucket-c-classifier + atomic-block-scaffold for new-block scaffolding. +REGISTER wired via `register_patterns.py` — idempotent, writes PHP pattern file + sgs-framework.db row + uimax row per composed section. Live E2E proved pipeline functional end-to-end. Commit `d0d30579`.
Status: active

---

## 2026-05-12 — Spec 15 Phase 4.5: cloning preserves intentional bespoke detail

**D(phase45) — `/sgs-clone` token lint defaults to ADDITIVE mode.** Non-token CSS values → `NewTokenCandidate` rows written to client style variation JSON (NOT snapped to nearest token). Base `theme.json` stays lean; client variation absorbs bespoke differences. Bean's framing: "small differences are all intentional." Commits `8599faf3`, `55a6d73e`, `3c2c07b7`, `a9b9b1c3`.
Status: active

---

## 2026-05-11 — Deterministic SGS-BEM voter; Trustpilot; third-party widget split

**D(voter) — Deterministic SGS-BEM voter over probabilistic AI matcher.** Stage 1 voter does literal slug match on `.sgs-<block>` → `sgs/<block>` at confidence 1.0. AI in matching step removed. Cheaper, faster, deterministic. Probabilistic matching only for live scrapes. Commit `7ac627cf`.
Status: active

**D(trustpilot) — `sgs/trustpilot-reviews` as first-party block; Browserless auth via `?token=` query string.** Official WP plugin paywalls display widgets on free plan. Browserless `/content` rejects Bearer — auth is `?token=<key>` query string. Failure surface: settings page activity log only. Commits `c6bd4980` + `06df2807`.
Status: active

**D(widget-split) — Locked brand identity + theme-inherited typography split for embedded third-party widgets.** Platform logo / brand colour for stars / verified badge = locked. Font-family + colour + base font-size = inherit from host theme. Border + hover = `var(--wp--preset--color--primary, <brand-fallback>)`.
Status: active

---

## 2026-05-10 — SGS-BEM canonical naming + cross-platform deferral

**D(spec13) — SGS-prefixed BEM is canonical for all Bean-controlled drafts (Spec 13 locked).** `.sgs-<block>__<element>--<modifier>`. Hard pre-flight gate on production runs; `--draft-mode` = soft warning; `--legacy` bypasses for pre-rule mockups. Live scrapes use lingua-franca-conversion. blub.db row 236. Canonical: `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (absorbed Specs 12+13+14).
Status: active

**D(cross-platform-defer) — Cross-platform emit pathways (P-CP-1/2/3) deferred until M9 production-stable + ≥3 successful clones banked.** Rosetta Stone infrastructure structurally ready. Cost = engineering pass per platform target — non-trivial. M9 ships first; cross-platform emit downstream of unreliable clone is wasted work.
Status: active

