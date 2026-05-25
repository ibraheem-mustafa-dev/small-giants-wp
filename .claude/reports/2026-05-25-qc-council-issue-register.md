---
doc_type: reference
title: QC-council issue register — 2026-05-25 session (3 rounds, 4 raters, head-of-council synthesis)
generated: 2026-05-25
session_id: cba5a298-4e16-4342-904c-96e48e45a297
project: small-giants-wp
purpose: |
  Comprehensive register of every issue surfaced by the 3-round QC council on
  the cloning pipeline (cv2 converter + walker + CSS router). Each issue paired
  with: source rater, claim, code/artefact evidence, triangulation outcome,
  proposed solutions, and current verdict.
status: pending Bean sign-off on investigation order
goal: |
  Pipeline produces WP sites from HTML drafts at ≤1% pixel-diff per section AND
  whole page across 375/768/1440 viewports, irrespective of content variations.
---

# QC-council issue register — 2026-05-25

## Reading guide

- **Severity** is the highest-confidence rating across the 3 rounds.
- **Status enum:** `CONFIRMED` (evidence-grounded, real defect) · `DISPROVED` (claim falsified by evidence) · `LATENT` (real but not actively biting) · `CONTESTED` (raters disagree, needs empirical settle) · `STRUCTURAL-GAP` (architectural primitive missing) · `OBSERVABILITY` (silent failure mode) · `SPEC-GAP` (documented vs implemented mismatch) · `DB-FIRST-VIOLATION` (hardcoded data that should live in DB) · `DECISION` (architectural choice required)
- **Bean's last-message correction overrides any "seed parent_block" or "register retired blocks" proposed solution.** The architectural primitive is Spec 16 §15 line 990 (every composite block emits OPEN with InnerBlocks children mirroring mockup parent-child shape; empty-array fallback walks direct child div descendants). All proposed solutions that violate this primitive are flagged.
- **Captured corrections (blub.db rows 285, 286, 287)** — read full spec before fix-shape; check sgs-db block capability before evaluating; per-property cascade hoist not binary uniformity gate.

---

## Section A — CONFIRMED defects (real, evidence-grounded)

### A1 — `composite_element` flatten path coexists with universal-nesting primitive
- **Source:** R2 (round 1, Grade D) → R2-B (round 2, downgraded to C) → R3-C + R3-D (round 3, refuted as primary defect)
- **Domain:** composite_element / architectural primitive
- **Severity (reconciled):** C (was D)
- **Status:** CONTESTED — α/β decision required
- **Claim:** `convert.py:4096` calls `lift_subtree_into_block_attrs` which flattens descendants into the parent block's scalar attrs, violating Spec 16 §15 ("composite blocks emit OPEN with InnerBlocks children, NOT flat-attrs lifted from descendants").
- **Code evidence:** convert.py:4096-4117 — `lift_subtree_into_block_attrs(node, target_slug)` call; convert.py:4114 — also calls `_lift_inner_blocks(node, target_slug)` (partial-recursion via DB-parent_block graph).
- **Artefact evidence:** R3-D — the flatten path **NEVER FIRED on a single section in this run** (trace.jsonl review). Branch correctly emits structurally-correct InnerBlocks when DB parent_block rows exist; soft-fails with diagnostic when they don't.
- **Render-side evidence:** R3-C — sgs/quote render.php docblock says `$content` is "unused — leaf block"; reads `$attributes['body']` (array) + `$attributes['attribution']`. sgs/label reads ONLY `$attributes['text']`. Wholesale recursive replacement would BLANK these blocks. β migration cost: ~90 LOC of render.php changes + deprecated.js across sgs/quote + sgs/label.
- **Proposed solutions:**
  - **R2 (round 1, REJECTED):** Wholesale replace with recursive walk mirroring `css_driven_container` pattern (~15 LOC). Rejected because flatten path is load-bearing for sgs/quote + sgs/label render.php.
  - **R2-B:** Additive fallback (~5 LOC) — only fire recursive emit when `lift_subtree_into_block_attrs` returns empty.
  - **Bean's last message (the correct universal-nesting fallback):** When the walker would emit a composite block but `_lift_inner_blocks` returns empty (parent_block has no DB rows OR the array attr ends up empty), walk direct child div descendants of the BEM block-root and emit each as a nested block carrying its `className`. No DB seeding; no spec amendment to legitimise flatten paths.
- **Open question:** α (legitimise flatten in spec) vs β (deprecate flatten, implement universal-nesting fallback). Bean implicitly chose β.

---

### A2 — `_lift_inner_blocks` only fires when `blocks.parent_block` DB has matching rows
- **Source:** R3-A (round 3, artefact-grounded)
- **Domain:** structural-gap / walker
- **Severity:** HIGH — this is THE structural gap Bean's universal-nesting fallback addresses
- **Status:** STRUCTURAL-GAP
- **Claim:** `convert.py:1428-1440` returns empty + traces `inner_blocks_no_children` when `blocks.parent_block` has no rows pointing at this slug. For arbitrary mockup nesting that doesn't match the DB parent-block graph, NOTHING emits as nested blocks.
- **Code evidence:** convert.py:1428-1440 — early return + trace.
- **Artefact evidence:** R3-A counted **11 soft-fail traces in one run** with the literal walker-emitted message: *"No rows in blocks.parent_block for this slug (source=sgs). Seed blocks.parent_block to enable InnerBlocks emission."* Breakdown:
  - sgs/label ×4 in trust-bar
  - sgs/quote ×1 in brand
  - sgs/button ×1 in brand
  - sgs/info-box ×2 in gift-section
  - sgs/announcement-bar ×1 in gift-section
  - sgs/testimonial-related ×1 in social-proof
- **Proposed solutions:**
  - **REJECTED (head-of-council Tier 1, what Bean called "cheating"):** Seed `blocks.parent_block` rows for these 5 slugs. Works around the architectural gap; doesn't close it.
  - **Bean's last message (correct):** Structural fallback in walker — when `_lift_inner_blocks` returns empty, walk direct child div descendants of the BEM block-root and emit each as a nested block.
- **Where the fallback lives:** the right insertion point is `_lift_inner_blocks` itself (returns the walked-direct-children when parent_block query is empty) OR at the callsites in `composite_element` / `essence_match_variation` / FR1-fast-path AFTER `_lift_inner_blocks` returns empty. Bean to confirm shape.

---

### A3 — `atomic_button` silently drops all mockup CSS
- **Source:** R3 (round 1, MEDIUM) → R2-A (round 2, HIGH) → R3-C (round 3, HIGH confirmed)
- **Domain:** atomic_* branch / silent-bug
- **Severity:** HIGH (silent regression on every clone that uses buttons)
- **Status:** CONFIRMED
- **Claim:** `convert.py:4290-4294` (atomic_button branch) has NO CSS-lifting calls. No `_lift_root_supports_to_style`, no `_collect_css_for_classes`. Every mockup button's custom styling silently dropped.
- **Code evidence:** convert.py:4290-4294 — only `lift_attrs_for_block` call; missing the two lift helpers present in sibling atomic_* branches.
- **Proposed solution:** Add `_lift_root_supports_to_style(node, 'sgs/button', css_rules, attrs)` + `_collect_css_for_classes` variation_buf push after line 4293. ~2 LOC. Unambiguous fix.
- **Open question:** None — bundle into next tight commit.

---

### A4 — Brand `sgs/quote` `block_markup` has NO `body[]` array (empty content)
- **Source:** R3-C (round 3, empirical) + Bean confirmed sgs/quote emission in current clone
- **Domain:** empirical-defect / converter bug
- **Severity:** HIGH (directly explains brand's pixel-diff regression)
- **Status:** PARTIALLY CONFIRMED — block-type confirmed; body[]-emptiness needs re-verification on latest run
- **What's confirmed:**
  - **Brand currently emits `sgs/quote`** (Bean USER #12 entry 667, verbatim: *"blockquote tag was patched yesterday - its a divclass with inner blocks. If you're using the /index.html version then it will be there"*; reconfirmed 2026-05-25: *"Brand section is currently using sgs/quote btw in the latest clone attempt, that was answered in the last session too"*). Post-D54 quote canonical migration shipped 2026-05-24 (commit e3cd1a04). Brand BEM was renamed: `<blockquote class="sgs-brand__body">` → `<div class="sgs-brand__quote">` + `<footer>` → `<p class="sgs-brand__attribution">`.
  - **R3-C's empirical claim:** Brand `block_markup` had `bodyColour`, `bodyFontSize`, etc. (styling attrs) but `body[]` array (actual content) missing.
- **What needs re-verification (not "investigation"; specific cite):** Read current `pipeline-state/<latest-run>/extract.json` for brand boundary. Cite the actual `body[]` field — empty `[]`, missing entirely, or now populated post-D70/D71?
- **Why this matters for the universal mechanism:** sgs/quote's body[] extraction goes through `_lift_inner_block_attrs` for the quote block. Per Q4 cheat inventory, that function has per-block branches for sgs/button + sgs/info-box but falls through to `lift_subtree_into_block_attrs` for sgs/quote. Empty body[] = `lift_subtree_into_block_attrs` not finding the body content. Either:
  - (a) The slot_synonyms / canonical_slot mapping for `__quote` → `body` array attr isn't wired correctly
  - (b) The BEM rename moved the body content to a structural shape `lift_subtree` doesn't recognise
- **Proposed solution:** Read the extract.json + trace.jsonl for brand to identify which path the body content went down. Once empirically pinned, fix is either a `slot_synonyms` row OR an extension of universal extraction to handle `<p>` children of `__quote` wrappers as body[] items.

---

### A5 — D1 sidecar `attr_path` key collisions (15 concrete cases observed)
- **Source:** R1 (round 1, HIGH) → R2-B (round 2, DEFER as net-zero-benefit) → R3-A (round 3, LATENT)
- **Domain:** CSS router / latent-bug
- **Severity:** LATENT — real collisions in sidecar but not actively consumed
- **Status:** LATENT
- **Claim:** css_router.py:497 `attr_path = f"{block_slug}.{css_prop}"` doesn't encode BEM element. `.sgs-hero__title { color: blue }` and `.sgs-hero__sub { color: red }` both write to `sgs/hero.color`; second silently overwrites first.
- **Code evidence:** css_router.py:497 — verbatim key construction.
- **Artefact evidence:** R3-A — 15 concrete D1 attr_path collisions in `css-d1-assignments.json`: sgs/hero.font-size has 58px (h1) overwritten by 18px (sub); sgs/hero.height has 340px (mobile) overwritten by 100% (desktop).
- **Why latent not active:** R2-B's analysis + R3-A confirmed — extract.json shows cv2's main extractor uses NAMED attrs (`headlineFontSizeDesktop`, `subHeadlineFontSize`) NOT the D1 key directly. F3 (section_key carries selector) + F5 (entry dict carries `css_prop`) provide what R1 wanted. The sidecar is overwritten but cv2 doesn't read the colliding key.
- **Proposed solutions:**
  - **R1 (round 1):** Change `attr_path` to `f"{block_slug}.{bem_element}.{css_prop}"` extracted via `db.parse_sgs_bem`. ~30 LOC across css_router + cv2 reader.
  - **R2-B:** DEFER — no active bug; non-zero migration risk.
- **Verdict:** Defer until a real consumer of D1 attr_path emerges OR until comma-selector split (A6) requires touching this code anyway.

---

### A6 — Comma-selector split missing — multi-selector rules route once instead of per-comma-part
- **Source:** R1 (round 1)
- **Domain:** CSS router
- **Severity:** MEDIUM
- **Status:** CONFIRMED
- **Claim:** `_parse_qualified_rules` output: one routing pass per rule, not per comma-part. Rules like `.sgs-card, .sgs-tile { padding: 16px }` route only to the first selector's destination.
- **Proposed solution (R1):** Split output: one routing pass per comma-part. ~10 LOC.
- **Open question:** Couple this with A5 (D1 key encoding) since both touch the routing layer.

---

### A7 — `essence_match_variation` "double-attribution" — TRACED then DISPROVED
- **Source:** R2 (round 1, HIGH) → R2-A (round 2, TRACED + confirmed) → R3-C (round 3, DISPROVED at render layer)
- **Domain:** essence_match_variation
- **Severity:** DISPROVED at runtime (LATENT data shape)
- **Status:** DISPROVED — theoretical defect, not visible
- **Claim:** `convert.py:4052` `essence_match_variation` branch lifts CTA `<a>` elements into scalar attrs (`ctaPrimaryText`/`ctaPrimaryUrl`/etc.) on the parent AND emits the same elements as `<!-- wp:sgs/button -->` InnerBlocks via `_lift_inner_blocks`. Both paths execute for the same DOM elements.
- **Code evidence:** R2-A trace: convert.py:4052 → lift_subtree_into_block_attrs(node, 'sgs/hero') lifts CTAs to scalar attrs; convert.py:4060 → _lift_inner_blocks(node, 'sgs/hero') emits SAME elements as InnerBlocks.
- **Render-side disprove (R3-C):** hero render.php line 611-613 EXPLICITLY COMMENTS:
  > *"CTA buttons are now rendered via sgs/multi-button + sgs/button InnerBlocks. $content is passed by WordPress and contains the rendered InnerBlocks output. Legacy ctaPrimary* / ctaSecondary* attributes are handled by deprecated.js migration."*
  Line 771: `$content_html .= '<div class="sgs-hero__ctas">' . $content . '</div>';`
- **Verdict:** Render reads ONLY `$content` for CTAs. Scalar attrs are inert legacy data only used by deprecated.js in the editor. Live page renders ONE set of CTAs.
- **Proposed solution:** No fix needed at render layer. If you want clean data: add a guard in essence_match_variation to skip scalar CTA lift when `_lift_inner_blocks` will emit them anyway (~10 LOC). Cosmetic only; defer.

---

## Section B — DB-FIRST VIOLATIONS (hardcoded data that should live in DB)

### B1 — `enum_vals = ['standard', 'trial', 'gift']` hardcoded
- **Source:** R2 (round 1)
- **Severity:** MEDIUM
- **Status:** DB-FIRST-VIOLATION
- **Claim:** convert.py:3422 has the comment "for now, hard-code the known values" — explicit TODO.
- **Proposed solution:** Move to `block_attributes.enum_values` DB column (lookup at runtime). ~5 LOC + verify the enum_values column is populated for variantStyle on sgs/product-card. Per blub.db row 260 (DB-first no hardcoded dicts).

### B2 — `VARIANT_MODIFIERS` hero-specific dict
- **Source:** R2 (round 1)
- **Severity:** MEDIUM
- **Status:** DB-FIRST-VIOLATION
- **Claim:** convert.py:3592 — hero-specific modifier dict. Hardcoded per-block logic.
- **Proposed solution:** Move to `modifier_suffixes` DB rows scoped per-block (or `variations` table). ~10 LOC + DB seed.

### B3 — `variant = 'pill-wrap' if canonical == 'badge'` hardcode
- **Source:** R3 (round 1)
- **Severity:** LOW
- **Status:** DB-FIRST-VIOLATION
- **Claim:** convert.py:4311 — per-canonical-slot variant hardcode. Only one remaining per-name conditional in atomic branches.
- **Proposed solution:** Add `default_variant` column to `slot_synonyms`; populate; query at line 4311. ~5 LOC + DB schema migration.

### B4 — `_ABSORB_GAP_PROPS` + `_ABSORB_POSITIONING_PROPS` module-level frozensets
- **Source:** R4 (round 1)
- **Severity:** LOW
- **Status:** DB-FIRST-VIOLATION
- **Claim:** convert.py:3815-3823 — frozensets of CSS properties hardcoded.
- **Proposed solution:** Seed `property_suffixes` rows with `is_absorb_gap` / `is_absorb_positioning` flags; query at module load. ~10 LOC + DB seed.

### B5 — `_infer_role` queries DB then hardcodes string-matching
- **Source:** R1 (round 1)
- **Severity:** MEDIUM
- **Status:** DB-FIRST-VIOLATION
- **Claim:** css_router.py:567-588 — function does DB lookup then falls through to hardcoded string-matching (even the function comments confirm).
- **Proposed solution:** Read `kind` column from `property_suffixes` row directly. ~5 LOC.

### B6 — SGS-swap target slugs hardcoded as string literals in atomic branches
- **Source:** R3 (round 1)
- **Severity:** LOW
- **Status:** DB-FIRST-VIOLATION
- **Claim:** convert.py atomic_paragraph + atomic_heading + atomic_image hardcode the SGS swap target (`sgs/text`, `sgs/heading`, `sgs/media`) as string literals. Should be DB-driven.
- **Proposed solution:** Couple with consolidation (E1). `ATOMIC_SWAP_MAP` table or `blocks.core_block_replaces` column.

### B7 — Per-block branches in `_lift_inner_block_attrs`
- **Source:** R2 (round 1)
- **Severity:** MEDIUM
- **Status:** DB-FIRST-VIOLATION
- **Claim:** convert.py:1557-1582 — sgs/info-box-specific logic (mediaType/mediaImage/mediaEmoji/heading/description). Hardcoded per-block branches in what should be universal.
- **Proposed solution:** Driven by slot_synonyms + block_attributes data; couple with universal-nesting fallback (A2) — once that lands, the per-block branches may be dead code.

---

## Section C — OBSERVABILITY gaps

### C1 — Bare `except Exception: pass` blocks swallow lift failures silently
- **Source:** R3 (round 1, LOW) → R2-B (round 2, confirmed with `# noqa: BLE001` annotations — DELIBERATE not oversight)
- **Severity:** LOW (but recurring failure mode)
- **Status:** OBSERVABILITY
- **Claim:** convert.py:4230 + 4238 — two bare-except blocks in atomic_heading branch. Annotated `# noqa: BLE001` so linter approved them.
- **Proposed solution:** Replace with `_trace(category='lift_failure', boundary_id=..., reason=str(e))` calls. ~4 LOC. Failures become observable in `errors.log` sidecar.

### C2 — Post-absorb CSS attribution implicit (class-name matching only)
- **Source:** R4 (round 1) → R2-B (round 2, REJECTED — claims it's correctly scoped, not a defect)
- **Severity:** LOW
- **Status:** CONTESTED
- **Claim:** R4 — no explicit re-attribution trace after `_absorb_transparent_wrappers` unwraps a child; CSS that was targeting the absorbed wrapper class now relies on the appended class name being matched downstream.
- **Counter (R2-B):** `child.unwrap()` + class-append makes absorbed classes visible to every downstream consumer without separate attribution step. NOT a defect.
- **Proposed solution if pursued:** Add a `_trace(category='absorb', absorbed_classes=[...], surviving_root_classes=[...])` event. ~5 LOC observability-only.

---

## Section D — SPEC GAPS (Spec 16 contradictions / undocumented branches)

### D1 — `sgs_bem_wrapper` walker branch undocumented + contradicts FR3 + FR4
- **Source:** R3 (round 1, LOW) → R2-B (round 2, confirmed undocumented) → R2-A (round 2, confirmed with verbatim spec text) → R2-C (round 2, FR contradiction surfaced)
- **Severity:** SPEC-GAP
- **Status:** CONFIRMED
- **Claim:** sgs_bem_wrapper branch exists in convert.py walker but has no §FR coverage in Spec 16.
- **Spec contradictions surfaced by R2-C:**
  - §FR3 says: *"DO NOT emit sgs/container at this depth"* — sgs_bem_wrapper does exactly this
  - §FR4 says: *"sgs/container is emitted ONLY at top level"* — factually wrong; THREE places emit it (`top_level_container` + `css_driven_container` + `sgs_bem_wrapper`)
  - §15 line 990 mandates: *"composite blocks emit OPEN with InnerBlocks children mirroring mockup parent-child shape — NOT flat-attrs lifted from descendants"* — `composite_element` + `essence_match_variation` + `sgs_bem_wrapper` violate this
- **Proposed solutions:**
  - **(α)** Amend Spec 16 to legitimise existing branches as named §FR3.1 / §FR4 exceptions. Cheaper. Codifies current code.
  - **(β)** Hold §15 line 990 binding; progressively deprecate the flatten paths. More disruptive but aligns with Bean's last message.
- **Verdict pending:** the α/β decision is the canonical architectural choice this session needs to make (see Section G).

### D2 — `composite_element` architecture not documented as separate from FR1
- **Source:** R2 (round 1)
- **Severity:** SPEC-GAP
- **Status:** CONFIRMED
- **Claim:** composite_element is a walker branch separate from FR1 fast-path. No FR coverage.
- **Proposed solution:** Document in §15 alongside α/β resolution.

---

## Section E — Consolidation opportunities (refactor)

### E1 — Triple/quadruple atomic-branch duplication
- **Source:** R3 (round 1, ~55 LOC) → R2-A (round 2, measured ~34 LOC actual, not 55) → R2-B (round 2, DON'T consolidate)
- **Severity:** LOW (cosmetic + maintenance, not functional)
- **Status:** CONTESTED
- **Claim:** atomic_paragraph + atomic_heading + atomic_image + atomic_text_fallback repeat the same "has-sgs-class → swap to dynamic SGS variant → lift → emit" pattern.
- **Measurement:**
  - R3 (round 1): ~55 LOC duplicate
  - R2-A (round 2): ~34 LOC actual (R3 inflated by ~20). 14 lines literally identical between atomic_paragraph + atomic_text_fallback.
- **Counter (R2-B):** DON'T consolidate. Silent divergences would regress all 4 branches:
  - atomic_heading has bare-excepts the others don't (C1 above)
  - atomic_heading has `headlineId` AND `anchor` dual-lift
  - atomic_image has `isdigit` width/height guards
  - A shared helper would either accidentally propagate these to other branches or strip them from heading
- **Proposed solutions:**
  - **R3 (rejected):** Full `ATOMIC_SWAP_MAP` consolidation (~34 LOC saved).
  - **R3 + R2-A (proceed with caution):** Extract just `_emit_sgs_text_block` helper for the atomic_paragraph + atomic_text_fallback 14-line duplicate (with anchor scoping verified). ~22 LOC consolidated. Per R2-A: 14 literally-identical lines.
- **Bean's earlier comment:** "the walker's 12+ branches looked like it includes some hardcoded/specialised cheat branches that don't need to exist which were probably built to try to solve a specific block or element". The atomic_* branches MIGHT survive if Spec §FR2 mandates them as atomic-tag emission — but the per-block-slug specialisations within them shouldn't.

---

### E2 — `composite_element` removal after universal-nesting fallback lands
- **Source:** R2 (round 1, rec 5) → reconciled with A1 + A2
- **Severity:** ARCHITECTURAL
- **Status:** DECISION
- **Claim:** Once universal-nesting fallback (A2) lands, `composite_element` may be dead code — `css_driven_container` would absorb these nodes naturally.
- **Counter (R3-C):** sgs/quote + sgs/label render.php depend on the scalar-attr extraction path. Removing composite_element wholesale requires render.php migration (~90 LOC across 2-3 blocks).
- **Verdict:** Coupled to α/β decision (Section G). If β: deprecate composite_element gradually. If α: keep it as a documented exception.

---

### E3 — Empty-body D2 safety net at css_router.py:553-558
- **Source:** R1 (round 1)
- **Severity:** LOW
- **Status:** LATENT (dead code)
- **Proposed solution:** Remove the empty-body D2 emission guard if no consumer hits it.

### E4 — Dead `startswith` guards at css_router.py:242 + 243-244
- **Source:** R1 (round 1)
- **Severity:** LOW
- **Status:** LATENT (dead code)
- **Proposed solution:** Remove. Trivial cleanup.

---

## Section F — STRUCTURAL primitives (the universal mechanisms)

### F1 — Universal-nesting fallback (Bean's empty-array fix)
- **Source:** Bean's last message (2026-05-25 entry 1566) + Spec 16 §15 line 990
- **Severity:** STRUCTURAL-GAP (this is THE primitive)
- **Status:** STRUCTURAL-GAP — not implemented
- **Goal:** Pipeline produces consistent per-section + whole-page ≤1% pixel-diff irrespective of mockup content variations.
- **The primitive (verbatim from Spec 16 §15 line 990):** *"Every composite block emits OPEN with InnerBlocks children mirroring the mockup's parent-child shape — NOT flat-attrs lifted from descendants. Every BEM-class div in the mockup becomes its own emitted block, carrying its mockup className."*
- **Bean's actionable fix:** When the walker would emit a composite block but the InnerBlocks data ends up empty (because `_lift_inner_blocks` returns empty when `blocks.parent_block` has no rows OR when the items[] array attr is empty), walk the direct child div descendants of the BEM block-root and emit each as a nested block carrying its `className`.
- **Insertion candidates:**
  - **(i)** Inside `_lift_inner_blocks` (convert.py:1428-1440) — return walked-direct-children when DB query returns nothing. ONE site; cleanest.
  - **(ii)** At each callsite (`composite_element`, `essence_match_variation`, FR1-fast-path) AFTER `_lift_inner_blocks` returns empty. Multi-site.
  - **(iii)** As a new outer helper that wraps `_lift_inner_blocks` and routes via fallback when empty.
- **Bean to confirm:** which insertion shape; (i) feels right (single source of truth).
- **Closes:** A2 + half of A1 (the composite_element flatten becomes redundant for the empty-emit case).

---

### F2 — Cascade-fold (per-property default + override) at N-wrapper depth
- **Source:** Bean's brain-dump (entry 1306 onwards) + R4 (round 1, hard-gate finding) + blub.db row 287 (cascade-fold-default-plus-override-not-uniform-gate)
- **Severity:** STRUCTURAL-GAP (the wider applicability of the universal mechanism)
- **Status:** STRUCTURAL-GAP — not implemented
- **The primitive:** For each CSS property across N sibling wrappers, hoist the most-common value to the parent's "per-direct-child default" attr; leave divergent values as overrides on the specific child wrapper blocks. Wrapper blocks always exist (preserve className for CSS targeting); their attrs carry only the divergence; parent carries defaults. No content-uniformity check. No all-or-nothing gate. The cascade lives at the CSS layer at runtime — walker just preserves className per emitted block.
- **Hard gate to remove:** convert.py:3886 — `if len(direct_children) != 1: return []`. Blocks N-wrapper cascade hoist.
- **Insertion shape:** Extend `_absorb_transparent_wrappers` with a sibling function `_hoist_n_wrapper_cascade(section_root, direct_children, css_rules)` that runs when N≥2 direct children share the same BEM-element class.
- **Edge cases (from Bean + my synthesis):**
  - **Pseudo-class rules** (`:first-child`, `:nth-child(odd)`, `:hover`) — inherently per-position. Walker handles as separate CSS rules attached to parent (CSS targets via position; doesn't need per-child override attr).
  - **Modifier-class CSS** (`__col--featured { border: 2px }`) — walker detects override clearly. Modifier becomes override attr on specific child block.
  - **"Default" detection threshold** — majority (≥50%)? ≥N-1? Bean to choose.
  - **Property dependencies** — some properties only make sense paired (e.g. `flex-direction: column` + `align-items: flex-start`). Hoist as atomic unit if co-occurring.
- **Closes:** R4-1 (hard gate) + R1-4 (no cascade-fold in route_css) + the wider goal of universal-applicable mechanism Bean asked for in entry 1306.

---

### F3 — Existing `_absorb_transparent_wrappers` precedent (1-child case, already shipped)
- **Source:** Bean (entry 1306, confirming the precedent)
- **Status:** SHIPPED (2026-05-24, D49 commit e3cd1a04)
- **Architecture:** When a section root has exactly ONE direct-child wrapper carrying a BEM-element class (e.g. `__inner`, `__container`), absorb that wrapper into the section root. F1 (single-child fallback) + F2 (N-child cascade fold) are the same primitive at two depths — extension, not novel mechanism.

---

## Section G — ARCHITECTURAL DECISIONS

### G1 — α vs β (the canonical choice this session needs to make)
- **Source:** R2-C (round 2) + R3-C (round 3) + Bean's last message
- **Status:** PENDING SIGN-OFF
- **α — Legitimise existing branches:** Amend Spec 16 to carve out `composite_element`, `sgs_bem_wrapper`, `essence_match_variation` as named §FR3.1 / §FR4 exceptions. Cost: doc changes only. Risk: codifies internal contradictions as intentional; future drafts could grow more flatten-side branches.
- **β — Universal-nesting binding:** Hold §15 line 990 as binding. Implement F1 (universal-nesting fallback). Progressively deprecate flatten paths starting with the cases that don't have render.php dependencies. Cost: F1 implementation (~30-50 LOC) + later render.php migrations for sgs/quote + sgs/label (~90 LOC). Risk: requires careful sequencing.
- **R3-C strongly favoured α** (cost argument + "all sections currently failing at 37-98% mismatch — no green to protect — pipeline is in recovery state").
- **Bean's last message implicitly chose β** by giving the empty-array structural fallback as the right fix instead of accepting the seed-rows surface fix.
- **Recommendation:** β — but staged. Phase 1: ship F1 universal-nesting fallback (walker only, no render.php changes; works for all blocks except sgs/quote + sgs/label which keep their existing flatten path because their render.php depends on it). Phase 2+: migrate sgs/quote then sgs/label render.php one at a time to OPEN-InnerBlocks shape; deprecate flatten path in a third commit per block.

### G2 — Cascade-fold majority threshold (50% / ≥N-1 / unanimous)
- **Source:** Bean's brain-dump
- **Status:** PENDING SIGN-OFF (raised in my prior synthesis)
- **Options:**
  - **50% majority** — hoist value shared by ≥half of siblings to parent default
  - **≥N-1** — hoist only if exactly one sibling diverges
  - **Unanimous** — hoist only if all siblings agree (= my original "uniformity gate" which Bean explicitly rejected)
- **Recommendation:** 50% majority. Robust to "3-of-4 columns share styling, 1 has featured border" pattern. Bean to confirm.

### G3 — Hardcoded "specialised cheat" branches Bean flagged
- **Source:** Bean's entry 1306 — "atomic text standalone and atomic paragraph/heading/image/button. These seem potentially unnecessary hardcoded cheats."
- **Triangulation (R3 round 1):**
  - **Spec-mandated (keep):** atomic_paragraph, atomic_heading, atomic_image, atomic_button — all map to Spec 16 §FR2 atomic-tag emission contract. NOT cheats.
  - **Spec-mandated (keep):** pass_through, top_level_container, fallback — §FR3 + §FR4.
  - **Suspect:** atomic_text_standalone, atomic_text_fallback — partial-duplicate of atomic_paragraph; consolidation opportunity (E1).
- **Verdict:** R3 mostly cleared Bean's suspicion BUT the per-block-slug specialisations WITHIN those branches (e.g. the `'pill-wrap' if canonical=='badge'` at convert.py:4311; the per-block branches in `_lift_inner_block_attrs` at 1557-1582) are the actual cheats. Address via B3 + B7.

### G4 — Block registration vs universal-nesting for retired section-level slugs
- **Source:** R3-A (round 3) — 8 section-level voter slugs fall through to sgs/container at confidence 0.0 because Stage 2 rejects them as `deferred-no-match`
- **Slugs flagged as "missing":** `sgs/trust-bar`, `sgs/featured-product`, `sgs/brand`, `sgs/ingredients-section`, `sgs/gift-section`, `sgs/social-proof`, `sgs/header`, `sgs/footer`
- **Critical context:**
  - `sgs/trust-bar` was **DELIBERATELY RETIRED** (commit 668ca50a, D72, 2026-05-25) in favour of universal-nesting.
  - `sgs/heritage-strip` was retired earlier (parking P-PHASE8-1).
  - `sgs/header` + `sgs/footer` are template-part architecture, not page-content blocks (parking P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER — being parked per Bean's clarification this session).
  - The remaining slugs (featured-product, brand, ingredients-section, gift-section, social-proof) — are these meant to be registered composite blocks OR section-level patterns OR universal-nested sgs/container compositions?
- **Decision:** Per Bean's "universally applicable mechanisms" instruction + the universal-nesting primitive — most should remain unregistered. Stage 2 fall-through to `sgs/container` is the correct path. The diagnostic is misleading.
- **Investigation needed:** Per-slug, classify: which existed at one point and got retired? Which were never built? Which should remain as section-level patterns (in `patterns` table) vs full composite blocks?

---

## Section H — INVESTIGATION ORDER (proposed sequence toward the 1% pixel-diff goal)

Goal: per-section + whole-page ≤1% pixel-diff across 375/768/1440, irrespective of content.

### Sequence 1 — Ground in empirical state (before any code)
1. **Read latest pipeline-state extract.json for brand boundary** — confirm A4 (empty body[] in sgs/quote).
2. **Read latest pipeline-state trace.jsonl** — confirm A2 (11 `inner_blocks_no_children` soft-fail traces). Verify which slugs still hit this post-D70/D71.
3. **Cross-check G4 slug list** against current `blocks` DB rows (`SELECT slug, status FROM blocks WHERE slug LIKE 'sgs/%'`) — confirm which are retired vs missing vs never-built.
4. **Read `_absorb_transparent_wrappers` end-to-end** + `_lift_inner_blocks` + `composite_element` + `essence_match_variation` + FR1 fast-path. Establish exact insertion points for F1 + F2.

### Sequence 2 — Architectural decision (Bean sign-off)
5. **G1 α/β** — confirm β (universal-nesting binding, staged migration).
6. **F1 insertion shape** — confirm (i) inside `_lift_inner_blocks`, (ii) at each callsite, or (iii) outer-helper wrapper.
7. **G2 majority threshold** — confirm 50% / ≥N-1 / unanimous for cascade-fold.

### Sequence 3 — Ship the structural primitives (one tight commit)
8. **F1 universal-nesting fallback** — walker fallback when InnerBlocks empty.
9. **A3 atomic_button CSS lift** (~2 LOC bundle).
10. **C1 bare-except → _trace** (~4 LOC bundle).
11. **E3 + E4 dead-code cleanup** (trivial).
12. **Run /sgs-clone on Mama's homepage** + Stage 11 measure. Record per-section pixel-diff at 3 viewports.

### Sequence 4 — Fix A4 brand body[] extraction
13. Per the empirical finding from R3-C, investigate why brand sgs/quote emits empty body[]. Likely in `_lift_inner_block_attrs` for sgs/quote OR upstream BEM-rename interaction.

### Sequence 5 — F2 cascade-fold N-wrapper hoist (separate commit)
14. Extend `_absorb_transparent_wrappers` with `_hoist_n_wrapper_cascade`. Replace hard gate at 3886. Per-property cascade per G2 threshold.
15. Re-measure pixel-diff. Brand, trust-bar, gift-section, ingredients-section all expected to drop.

### Sequence 6 — DB-first cleanups (one focused commit)
16. B1 + B2 + B3 + B4 + B5 + B7 — hardcoded dicts → DB. ~50-60 LOC + DB seeds.

### Sequence 7 — Spec amendments (doc-only commit)
17. D1 — document sgs_bem_wrapper as §FR3.1 named exception. Document composite_element as §15.x with deprecation note pointing at F1 universal-nesting fallback.
18. D2 — document the two-path absorb architecture (1-child + N-child).

### Sequence 8 — Render.php migrations (per-block, separate commits each)
19. sgs/quote — migrate render.php from `$attributes['body'][]` to `$content` (InnerBlocks). Add deprecated.js migration.
20. sgs/label — same shape.
21. After migrations: drop composite_element flatten path; rely on universal-nesting fallback.

### Sequence 9 — Latent / cosmetic
22. A5 D1 attr_path BEM-element encoding (defer until comma-selector A6 touches the same code).
23. A6 comma-selector split.
24. A7 essence_match scalar-attr guard (cosmetic).
25. E1 atomic_paragraph + atomic_text_fallback emit_text_node helper (~22 LOC, with anchor-scoping verified).

---

## Section I — RULES-OF-ENGAGEMENT (binding for this whole pipeline programme)

Captured this session via blub.db:
- **Row 285:** Read full spec before proposing architectural fix-shape. State the architectural primitive in plain English BEFORE proposing. If the fix doesn't directly invoke the primitive, it's a surface fix — STOP.
- **Row 286:** Before evaluating whether a proposed approach fits an existing block capability, run `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block <slug>` to enumerate actual attrs / supports / capabilities + grep render.php for emitted DOM shape.
- **Row 287:** Cascade-fold default + override, NOT binary uniformity gate. Per-property hoist; wrapper blocks always exist; cascade lives at CSS layer at runtime.

Pre-existing:
- **Row 254:** Read `leftover-buckets.json` + pipeline-state artefacts BEFORE conjecturing.
- **Row 255:** Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit.
- **Row 256:** Per-section cropped pixel-diff via `--selector .sgs-{section}` at 3 viewports.
- **Row 269:** Universal extraction primitive; walker code stays universal; data layer drives recognition.
- **Row 272:** Schema enumeration via `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any "missing column/table" claim.
- **Row 276:** Council fix-shape proposals are HYPOTHESES not specs. Write predicted numeric outcome + run smallest pipeline slice between waves.

---

## Section R — CONSOLIDATED FINAL PLAN (post-Bean corrections 2026-05-25; ready for /qc-council)

### R1 — `blocks.replaces` audit findings (Bean's correction on ATOMIC_TAG_MAP)

18 SGS blocks explicitly declare what core block they replace:

| HTML tag | Core target | **SGS replacement** | Current ATOMIC_TAG_MAP says |
|---|---|---|---|
| `<h1>`–`<h6>` | core/heading | **sgs/heading** ✓ | core/heading ✗ (cheat) |
| `<p>` | core/paragraph | **sgs/text** ✓ | core/paragraph ✗ (cheat) |
| `<img>` | core/image | **sgs/media** ✓ | core/image ✗ (cheat) |
| `<hr>` | core/separator | **sgs/divider** ✓ | sgs/divider ✓ |
| `<blockquote>` | core/quote | **sgs/quote** ✓ | (missing — bare-tag not in map) |
| `<a class*="sgs-button">` | core/button | **sgs/button** ✓ | (handled via class-routing, not tag-map) |
| `<button>` | core/button | **sgs/button** ✓ | (missing) |
| `<ul>` / `<ol>` | core/list | **sgs/icon-list** ✓ | (missing) |
| `<table>` | core/table | (no SGS replacement) | (missing) — keep core/table |
| `<figure>` / `<figcaption>` | (none direct) | (consider) | (missing) |

**Implication:** the current ATOMIC_TAG_MAP at convert.py:698 is a cheat — it routes to core blocks when SGS replacements exist. The DB-driven version should query `SELECT slug FROM blocks WHERE replaces=? AND source='sgs'` for the actual SGS slug.

**Universal walker logic (corrected):**
```python
def tag_to_block(html_tag):
    core_target = {'h1':'core/heading','h2':'core/heading',...,'p':'core/paragraph','img':'core/image',...}.get(html_tag)
    if not core_target: return None
    sgs_replacement = db.execute(
        "SELECT slug FROM blocks WHERE replaces=? AND source='sgs' LIMIT 1",
        (core_target,)
    ).fetchone()
    return sgs_replacement[0] if sgs_replacement else core_target
```

This makes the `replaces` column the universal source of truth. ATOMIC_TAG_MAP becomes a tag→core-target mapping (small, ~10 entries) that the walker then maps to the SGS slug via DB query.

### R2 — Nesting audit (Bean's correction on `parent_block`)

**`blocks.parent_block` is FORCED parentage** (dependency-routing — like `sgs/button` MUST be wrapped in `sgs/multi-button`). Only 7 SGS blocks have rows here. This is NOT the right table for "which blocks can be nested inside which".

**What's missing:** an ALLOWED-NESTING DB structure showing which blocks CAN nest (non-forced). Examples Bean cited:
- `sgs/icon-list` has items, each item has icon + text → can nest sgs/icon + sgs/text (non-forced)
- `sgs/info-box` (capability `icon-text`) → can nest sgs/icon + sgs/heading + sgs/text
- `sgs/card-grid` (capability `grid-layout`) → can nest sgs/info-box children
- `sgs/process-steps` (capabilities `icon-text` + `process-display` + `steps`) → each step is icon + heading + description

**Current data sources that PARTIALLY signal nesting potential:**
- `block_capabilities` (85 rows): capabilities like `icon-text`, `grid-layout`, `carousel`, `tabbed-content` — describe what KIND of nesting is possible but not which specific child slugs are compatible.
- `block_attributes`: composite blocks have attrs like `items[]`, `tiles[]`, `entries[]` — these signal "this block has N children" but don't say which slug each child should be.
- `patterns.block_composition` (Q18b — unpopulated): the JSON column designed to hold composition data but never seeded.

**Audit needed (PHASE 0 prerequisite for Phase 1B universal walker):**
- Per SGS block, document: (a) which child slugs are semantically compatible (non-forced); (b) which slot/attr in the block carries them; (c) what BEM element class signals each child in mockups.
- Materialise as a new DB table OR new column on `block_attributes` (e.g. `child_block_slug` for array-typed attrs).
- Walker reads this to make routing decisions — when it sees `<div class="sgs-icon-list__item">` inside `sgs/icon-list`, it knows the children of `__item` should be sgs/icon + sgs/text per the audit data.

**Estimated audit effort:** ~2-3 hours. 50+ blocks need walking through. Block-by-block, with `block.json` + `render.php` + `block_capabilities` rows as input. Output: new DB seed file `seed-block-allowed-children.py`.

### R3 — Consolidated Phase 0 + Phase 1 (incorporating existing phase-1 plan's valid points + Bean's corrections)

#### Phase 0 — Pre-start (cheats whose work is independent of F1/F2 architectural changes)
- **0A — Stale doc claim verification** (per existing Step 1.2): Spec 17 §6.4, goals.md "73→69 blocks", architecture-staging Decision 12 footnote.
- **0B — Allowed-nesting audit** (NEW per Bean's R2 directive): block-by-block audit of nesting relationships → new DB table OR new column. Seed script + tests.
- **0C — Hooks completion + role='content' sync** (per existing Step 1.9): close the 2,049-hook gap OR document as intentional; re-run /sgs-update Stage 1 for role='content' DB sync.
- **0D — 9 NULL-canonical array attrs** (per existing Phase 1 follow-on F2): the 8 alias additions + 1 design decision (form-field-file.allowedTypes).
- **0E — Independent cheat cleanup** (cheats with no F1/F2 entanglement):
  - Q6 `_CORE_BLOCK_STYLE_MAP` → DB migration
  - Q7 `_STR_PASSTHROUGH_ALLOWED` → generalise via block_attributes.attr_type
  - Q8 `_STYLE_KEY_TO_ROLE` + `_STYLE_SUBKEY_ROLE_OVERRIDE` → property_suffixes.role
  - Q9 `_infer_role` string-matching → read kind from DB
  - Q10 `enum_vals = ["standard","trial","gift"]` → block_attributes.enum_values
  - Q11 `variant = 'pill-wrap' if canonical == 'badge'` → slot_synonyms.default_variant
  - Q12 `_BREAKPOINT_SUFFIXES` → confirm DB migration complete + delete old constant
  - Q1+Q2 hero per-slug guard + VARIANT_MODIFIERS → seed slot_synonyms split-image rows + modifier_suffixes per-block + delete guard
  - Q16 heritage-strip block_slug guard → pure-dead-code delete
  - Q17 `RETIRED_BLOCK_REMAP` → module-load assertion against `block_exists()` + invert priority
  - **Q13 DEFER** per Bean (CSS-spec frozenset; no sibling problem yet).

**Phase 0 acceptance gate:** ALL body sections on Stage 11 stay within ±2pp of current baseline (mean 63.2%). DB queries return same values as the hardcodes were returning. NO architectural change yet — just cleaner data layer.

#### Phase 1 — Universal-nesting + extraction completeness (architectural backbone)
Merged from existing phase-1 plan (Steps 1.5, 1.6, 1.8) + register's F1+F2 + Bean's corrections:

- **1A — Reading discipline + Hidden-Decisions peer review** (existing Step 1.1 + 1.4): every implementer reads Spec 16 §FR1+§FR4+§15 + Phase 0 outputs + the worked example (R5 below). Dispatch 2 cold raters pre-implementation per existing Step 1.4.
- **1B — Universal walker (F1) + extended ATOMIC_TAG_MAP DB-driven**:
  - Insert F1 fallback at `_lift_inner_blocks:1430`. When DB query empty, walk direct child elements (divs AND semantic tags via FR2) → call back into `walk()`.
  - Replace ATOMIC_TAG_MAP with DB-driven lookup via `blocks.replaces` (R1). Extend tag coverage: `<a>`, `<button>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>`, `<figure>`, `<figcaption>`, `<table>`.
  - **Cheats removed at start of 1B**: Q14 ATOMIC_TAG_MAP migration; Q15 per-target-block emit chain migration.
- **1C — Universal child-block extraction (replace per-block branches)** (per Bean's P3 + Q4):
  - **Cheats removed at start of 1C**: Q4 `_lift_inner_block_attrs` per-block branches for sgs/button + sgs/info-box — generalise via slot_synonyms + the Phase 0 allowed-nesting data (R2 / 0B).
- **1D — Universal array-attr extraction (replace ARRAY_LIFT_PATTERNS)**:
  - **Cheats removed at start of 1D**: Q3 ARRAY_LIFT_PATTERNS dict. Add `slot_synonyms.array_extraction_recipe` JSON column OR new `array_lift_recipes` table. Include `count_stars` special extractor as a recipe kind (per existing F1 follow-on in phase-1 plan).
- **1E — Visual + structural slot extraction (per existing Step 1.7 G3 framing + Bean's P18 direct-owner-attribution)**:
  - Stage 3 + walker recurse into each emitted child block's class → look up `property_suffixes` → lift visual CSS into typed attrs on the CHILD block (NOT the parent).
  - Closes the residual 33 failures from G3 reframe.
- **1F — G1 OPEN-block emission for FR1-matched composite blocks** (per existing Step 1.6): hero CTAs render via InnerBlocks; pattern extends to every composite block (not hero-only) per `P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES`.
- **1G — G5 per-block DOM-shape fixes** (per existing Step 1.8): brand-strip blockquote preservation, testimonial-slider 3-col grid, plus any blocks Stage 11 surfaces. Parallelisable across blocks (different files; per existing KJC 1C).
- **1H — sgs/quote render.php migration to OPEN-InnerBlocks (β-path)**: dual-shape render.php + deprecated.js editor migration. sgs/label STAYS self-closing (leaf block per Bean's correction).
- **1I — Populate `patterns.block_composition` from F1 + 0B discoveries** (Q18b): walker's discovered shapes + audit data write to the unpopulated JSON column. Walker can short-circuit recursive walks for sections matching known patterns (fast-path).
- **1J — Pattern fast-path extension (per existing KJC 1B)**: Stage 2 consults `patterns.slug` for FR1 branch (b) — sections matching `sgs/featured-product` etc. emit `<!-- wp:pattern -->` directly. Registered composite block precedence rule applies.
- **1K — Delete dead code (Q19, Q20)**: composite_element flatten path + essence_match double-attribution — after F1 confirms they never fire, delete completely (not deactivate).
- **1L — Combined /qc-council verification + Phase 1 close** (existing Step 1.10 + 1.11): multi-rater verification on full Phase 1 diff; /handoff; update living docs.

**Phase 1 acceptance gate (per Bean's directive — track ALL body sections):**
- ALL 7 body sections × 3 viewports = 21 cells measured
- NO section regresses > 5pp
- ≥5 of 7 sections drop ≥10pp
- Mean drops from current **63.2%** to <30%
- G1 verified by Playwright on sandybrown (hero CTAs in DOM)
- G3 verified by trace.jsonl (failure-count reduction from ~33 visual/canonical to <10)
- G5 verified by per-block visual diff
- Walker universal verified by `leftover-buckets.unrecognised_section == 0` for body sections

### R4 — Pre-empt decisions (carried from existing Phase 1 plan)
1. FR1 pattern-match conflicts with composite-block-match on same slug → composite block wins.
2. Walker pre-pass changes attr counts but Stage 11 regresses → walker is structural primitive; debug downstream gap, don't revert.
3. Two per-block G5 fixes touching same file → sequentialise.
4. Agent attempts commit despite Binding A → revert + capture as structural enforcement gap.
5. Step 1B walker breaks current FR1 fast-path (hero conf 1.0) → STOP, do not commit.
6. G5 per-block fixes blow universal-extraction discipline → G5 touches render.php only, walker stays universal per blub.db row 269.

### R5 — Canonical worked example (brand `sgs/quote`)

**Mockup HTML** (verified from sites/mamas-munches/mockups/homepage/index.html):
```html
<div class="sgs-brand__quote">
  <p>She was struggling with breastfeeding...</p>
  <p>They helped her. I was so grateful.</p>
  <p>Now I make them for breastfeeding mums...</p>
  <p class="sgs-brand__attribution">— Zainab, Founder of Mama's Munches</p>
</div>
```

**DB state (sgs-db.py verified):**
- `sgs/quote` has `body` (type=array, default=[]) + `attribution` (type=string)
- `slot_synonyms`: canonical=quote → standalone_block=sgs/quote (aliases: blockquote, pullquote, quote, quoteBody, quoteText)
- `blocks.parent_block` returns empty for sgs/quote → `_lift_inner_blocks` returns []

**Current emit (empirically verified from extract.json):**
```
<!-- wp:sgs/quote {"className":"sgs-brand__quote",
                   "attribution":"— Zainab...",
                   "bodyColour":"text-muted", "bodyFontSize":17, ...} /-->
```
Self-closing. NO body[]. Live page renders attribution only — no body text.

**Post-F1 emit (expected):**
```
<!-- wp:sgs/quote {className:"sgs-brand__quote",
                   attribution:"— Zainab...",
                   bodyColour, bodyFontSize, ...} -->
  <!-- wp:sgs/text -->
  <p>She was struggling with breastfeeding...</p>
  <!-- /wp:sgs/text -->
  <!-- wp:sgs/text -->
  <p>They helped her. I was so grateful.</p>
  <!-- /wp:sgs/text -->
  <!-- wp:sgs/text -->
  <p>Now I make them for breastfeeding mums...</p>
  <!-- /wp:sgs/text -->
<!-- /wp:sgs/quote -->
```

Each `<p>` walked by F1 fallback → `walk()` recognises bare `<p>` via FR2 + DB-driven ATOMIC_TAG_MAP (R1) → routes to **sgs/text** (replaces core/paragraph). The 4th `<p>` with `__attribution` class extracts via existing path to attribution scalar attr on the parent (NOT a nested block).

**Render.php migration (1H — β-path):**
```php
if (!empty($content)) {
    echo $content;
} else if (!empty($attributes['body'])) {
    foreach ($attributes['body'] as $para) {
        echo '<p>' . esc_html($para) . '</p>';
    }
}
```

---



Per Bean's 2026-05-25 correction: *"There are more cheats in there that break the rules though. I think the last session points called several out"*. Hero cheats were the OLDEST examples (from "ages ago") — the broader pattern of hardcoded shortcuts spans both `convert.py` and `css_router.py`. Each cheat is paired with: file:line evidence (grep-verified 2026-05-25 against current main), council source (which rater surfaced it), the rule it violates, and the universal-mechanism replacement path.

**Rules being broken (cited per project CLAUDE.md + captured learnings):**
- **DB-first rule** (blub.db row 260): Before adding hardcoded lookup dicts, check `sgs-framework.db`. Refactor to `db_lookup.py`.
- **Universal extraction primitive** (blub.db row 269): Walker code stays universal; data layer drives recognition.
- **No per-block legacy** (blub.db row, mistake 2026-05-21): Don't port per-block legacy logic; fix the universal path.
- **All div classes are blocks** (P15): every BEM-class div must emit as its own block; per-block special-case extraction breaks the universal walk.
- **Direct-owner attribution** (P18): CSS rules attribute to their direct owner; hardcoded per-block lift paths bypass this.

### Q1 — Hero per-slug guard (historical example; oldest cheat)
- **file:line:** convert.py:3557-3585 `if block_slug == "sgs/hero":` block
- **What it does:** Hardcoded extraction logic for hero's 4 split-image class patterns (`__split-image--desktop`, `__image`, `__split-image--mobile`, `__image--mobile`) mapped to `splitImage` / `splitImageMobile` attrs.
- **Rule broken:** Per-block legacy + DB-first.
- **Council source:** K9 (P-PHASE8-3 parking entry, my Section K reference).
- **Replacement path:** Seed `slot_synonyms` rows mapping `__split-image--desktop` / `__split-image--mobile` / `__image--mobile` to attr names. Universal walker reads `slot_synonyms` for the mapping. Cheat block deletes.
- **Status (per Bean 2026-05-25):** "from ages ago" — historical. Replacement is roadmap, not blocking.

### Q2 — Hero VARIANT_MODIFIERS dict (inline within Q1)
- **file:line:** convert.py:3591-3608 — dict `{"sgs-hero--split": "split", "sgs-hero--standard": "standard", "sgs-hero--video": "video", "sgs-hero--svg-animated": "svg-animated"}` inline inside the hero branch.
- **What it does:** Maps hero's modifier classes to `variantStyle` attr values.
- **Rule broken:** DB-first.
- **Council source:** B2 (R2 round 1) — VARIANT_MODIFIERS hero-specific dict.
- **Replacement path:** Add `modifier_suffixes` rows scoped per-block-slug (currently 19 rows; need per-block-scoped entries). Generalisable to ALL blocks with variantStyle / variant-class modifiers.

### Q3 — `ARRAY_LIFT_PATTERNS` hardcoded extraction recipes
- **file:line:** convert.py:1008-1030 — module-level `ARRAY_LIFT_PATTERNS: dict[str, dict]` with `testimonials` + `badges` keys.
- **What it does:** Hardcodes per-array-attr extraction recipes (child_tag + child_class_contains + per-field extractor + selector). Includes special extractor `count_stars` for rating values.
- **Rule broken:** Per-block legacy + DB-first.
- **Council source:** Parking P-ARRAY-LIFT-PATTERNS-FULL-MIGRATION (Phase 1 follow-on F1) — flagged for migration to universal 1e-B path but blocked because `count_stars` + multi-selector fallback aren't in the universal extractor yet.
- **Replacement path:** New `slot_synonyms.array_extraction_recipe` JSON column OR new sibling table `array_lift_recipes` with selector + per-field extractor mapping + special-extractor kinds. Universal walker reads recipe from DB.
- **Severity:** HIGH — actively used; cannot be deleted without breaking testimonial-slider + any future badge-shaped array attrs.

### Q4 — `_lift_inner_block_attrs` per-block branches (sgs/button + sgs/info-box hardcoded)
- **file:line:** convert.py:1532 `if slug == "sgs/button":` + convert.py:1550 `elif slug == "sgs/info-box":` + convert.py:1581 `else: lift_subtree_into_block_attrs(...)` fallback.
- **What it does:** Per-block extraction logic — sgs/button extracts label + url + inheritStyle from BEM modifier (--primary/--secondary/--ghost/--outline); sgs/info-box extracts mediaType + mediaImage/mediaEmoji + heading + description via CSS-selector heuristics.
- **Rule broken:** Per-block legacy + universal extraction primitive.
- **Council source:** B7 (R2 round 1) — per-block branches in `_lift_inner_block_attrs`.
- **Replacement path:** Migrate sgs/button extraction to universal — `slot_synonyms` rows for label/url + `modifier_suffixes` rows for ghost/outline. Migrate sgs/info-box extraction the same way — `slot_synonyms` rows for icon/heading/description with the existing `_detect_media_type` helper invoked universally.

### Q5 — `_ABSORB_GAP_PROPS` + `_ABSORB_POSITIONING_PROPS` module-level frozensets
- **file:line:** convert.py:3814-3823 — two `frozenset` constants.
- **What it does:** Defines which CSS properties trigger absorption gap-detection (`_ABSORB_GAP_PROPS`) vs positioning-property exclusion (`_ABSORB_POSITIONING_PROPS`).
- **Rule broken:** DB-first.
- **Council source:** B4 (R4 round 1).
- **Replacement path:** Seed `property_suffixes` rows with `is_absorb_gap` / `is_absorb_positioning` boolean columns. Query at module load instead of hardcoding.

### Q6 — `_CORE_BLOCK_STYLE_MAP` 26-entry hardcoded dict
- **file:line:** convert.py:1787 — module-level `_CORE_BLOCK_STYLE_MAP: dict[str, tuple]`.
- **What it does:** Maps CSS properties to WP core-block `style.*` paths (`color → ["color","text"]`, `font-size → ["typography","fontSize"]`, etc.).
- **Rule broken:** DB-first (this is data, not logic).
- **Council source:** K13 (parking P-CORE-STYLE-MAP-DB-MIGRATION, captured 2026-05-19).
- **Replacement path:** Either (a) add `core_block_style_path` JSON column to `property_suffixes` OR (b) new sibling table `core_block_style_paths` (css_property, style_path JSON, kind, image_only).

### Q7 — `_STR_PASSTHROUGH_ALLOWED` per-attr-name allowlist
- **file:line:** convert.py:1826 — `_STR_PASSTHROUGH_ALLOWED: dict[str, set[str]]`.
- **What it does:** Per-attribute-name allowlist for str-passthrough values. Hardcoded.
- **Rule broken:** DB-first.
- **Council source:** Not explicitly council-flagged but matches the pattern. Surfacing here for completeness.
- **Replacement path:** Either expand `block_attributes` schema with allowed-passthrough values OR generalise based on `block_attributes.attr_type` ("string" attrs accept any string).

### Q8 — `_STYLE_KEY_TO_ROLE` + `_STYLE_SUBKEY_ROLE_OVERRIDE` hardcoded role maps
- **file:line:** convert.py:2041-2057 — two module-level dicts.
- **What it does:** Maps WP style-dict keys to roles (color/spacing/typography/font_size/shadow/family). Per-key-and-subkey hardcoded.
- **Rule broken:** DB-first.
- **Council source:** Not explicitly flagged but matches B5 (`_infer_role`) pattern.
- **Replacement path:** Read from `property_suffixes.role` column based on the style key.

### Q9 — `_infer_role` string-matching fallback in css_router
- **file:line:** css_router.py:567-588 — function does DB lookup then HARDCODES string-matching on css_prop for color/typography/spacing/visual.
- **What it does:** Even when DB lookup matches, the role inference uses hardcoded `if any(t in css_prop for t in ("color", "colour", "background"))` chains instead of reading the kind from the DB row.
- **Rule broken:** DB-first.
- **Council source:** R1.3 (R1 round 1) — even the function comments confirm it.
- **Replacement path:** Read `kind` column from `property_suffixes` row directly. ~5 LOC fix.

### Q10 — `enum_vals = ["standard", "trial", "gift"]` hardcoded
- **file:line:** convert.py:3422 — has comment "for now, hard-code the known values".
- **What it does:** variantStyle enum for product-card (TODO comment confirms).
- **Rule broken:** DB-first.
- **Council source:** B1 (R2 round 1) + P-S16-3 parking entry.
- **Replacement path:** Lookup `block_attributes.enum_values` for variantStyle on sgs/product-card.

### Q11 — `variant = 'pill-wrap' if canonical == 'badge'` per-canonical-slot hardcode
- **file:line:** convert.py:4311.
- **What it does:** Default variant for badge canonical = 'pill-wrap'. Per-canonical-slot conditional.
- **Rule broken:** DB-first.
- **Council source:** B3 (R3 round 1).
- **Replacement path:** Add `default_variant` column to `slot_synonyms`; populate; query at line 4311.

### Q12 — `_BREAKPOINT_SUFFIXES` non-standard breakpoint silent-drop
- **file:line (per parking P-PHASE8-7):** Used to be a module-level list constant. Now wrapped by `_breakpoint_suffixes()` function (convert.py:1618 comment confirms "DB-verified replacement for the old _BREAKPOINT_SUFFIXES list constant"). Partially migrated.
- **What it does:** Covered 5 industry-standard breakpoints; non-standard breakpoints (e.g. `min-width: 900px`) silently ignored.
- **Rule broken:** Per-block legacy + DB-first.
- **Council source:** Parking P-PHASE8-7.
- **Replacement path:** Read breakpoints from theme.json `settings.layout` OR a new `breakpoints` config table. Surface non-standard breakpoints as gap candidates.

### Q13 — `_FULL_BLEED_WIDTH_VALUES` frozenset
- **file:line:** convert.py:446 — `frozenset({"none", "100%", "100vw", "auto"})`.
- **What it does:** Hardcoded set of values that signal "full-bleed width".
- **Rule broken:** DB-first (minor).
- **Council source:** Not flagged. Surfacing for completeness.
- **Replacement path:** Defer (low priority — values are CSS spec, not project data).

### Q14 — `ATOMIC_TAG_MAP` core-block target mapping
- **file:line:** convert.py:698 — `ATOMIC_TAG_MAP: dict[str, str]`.
- **What it does:** Maps HTML tags to core block slugs (h1-h6 → core/heading, p → core/paragraph, img → core/image, etc.).
- **Rule broken:** Per-block legacy + DB-first. SGS-swap targets (`sgs/text`, `sgs/heading`, `sgs/media`) also hardcoded as string literals in atomic branches.
- **Council source:** R3 round 1 — atomic-branch SGS-swap targets hardcoded as string literals (Section B6).
- **Replacement path:** Move tag→core-block mapping to DB. Add `blocks.core_block_replaces` column for SGS swaps. Required by P15 (all div classes are blocks; the tag→block mapping should be a recognition table, not hardcoded).
- **Note:** R2-B advised AGAINST full ATOMIC_SWAP_MAP consolidation due to silent divergences (E1 in register). The DB-migration of ATOMIC_TAG_MAP itself is a smaller, safer move.

### Q15 — Per-tag conditional emission in atomic_button + atomic_paragraph etc.
- **file:line:** convert.py:910-944 (visible from grep) — `if block_slug == "core/heading": ... elif block_slug == "core/image": ... elif block_slug == "sgs/button":` chain inside an emit function.
- **What it does:** Per-target-block emission logic. Same structural pattern as Q4.
- **Rule broken:** Per-block legacy.
- **Council source:** Section E1 (R3 atomic-branch duplication — though E1 framed it as consolidation; the deeper problem is the per-target-block hardcoded chain).
- **Replacement path:** Move per-tag emit rules to DB (similar to Q14). Function becomes a dispatch lookup instead of a conditional chain.

### Q16 — Hyperspecific `block_slug == "sgs/hero" / "sgs/heritage-strip"` guards in lift_subtree
- **file:line per parking K9 (P-PHASE8-3):** convert.py:1016 (sgs/hero), convert.py:1048 (sgs/heritage-strip).
- **Note:** sgs/heritage-strip is RETIRED — the guard is dead code (per parking entry).
- **What it does:** Per-slug branches inside the universal `lift_subtree_into_block_attrs`. Bypasses universal extraction for these slugs.
- **Rule broken:** Per-block legacy + universal extraction primitive.
- **Council source:** K9 (parking P-PHASE8-3).
- **Replacement path:** New DB-backed `block_image_slots` table (subagent 5's 2026-05-15 design). Drop guards.

### Q17 — `RETIRED_BLOCK_REMAP` future-block-registration vulnerability
- **Council source:** K19 (parking P-PHASE9-6).
- **What it does:** `{"heritage-strip": "brand"}` silently locks pattern routing even if `sgs/brand` is later registered as a real block.
- **Rule broken:** Robustness (not exactly a cheat but a future-conflict trap).
- **Replacement path:** Module-load assertion or invert priority (check `block_exists()` first).

### Q18 — `INNER_BLOCK_PATTERNS` — RETIRED ✓ (verified 2026-05-25)
- **Status:** RETIRED. Empirical grep on current convert.py returned 0 hits for `INNER_BLOCK_PATTERNS`. Spec 16 §18 retirement is complete in code. Replacement is `_lift_inner_blocks` (convert.py:1350) consulting `blocks.parent_block` + `slot_synonyms.standalone_block` DB rows.
- **What replaced it (current code at convert.py:1390-1403):**
  ```python
  def _db_children(slug: str) -> list[str]:
      """Return slugs of blocks whose parent_block = slug (source=sgs)."""
      _c = _sqlite3.connect(str(_SGS_DB))
      rows = _c.execute(
          "SELECT slug FROM blocks WHERE parent_block = ? AND source = 'sgs'",
          (slug,)
      ).fetchall()
      return [r[0] for r in rows]
  ```
- **The gap that remains (this is what F1 fixes):** When `_db_children(parent_slug)` returns empty (line 1430), `_lift_inner_blocks` returns `[]` after a soft-fail trace. The callsite (composite_element / essence_match_variation / standalone-block branch) emits the parent block self-closing. That's what causes brand `sgs/quote` to emit as `/-->` with no `body[]` array (verified A4 empirically). F1 inserts the universal-walk fallback at line 1430-1440.

### Q18b — `patterns.block_composition` + `patterns.fingerprint` columns unpopulated
- **Status:** OPEN (learning 280 — separate from Q18 INNER_BLOCK_PATTERNS retirement which is complete)
- **Claim:** Both columns exist in `sgs-framework.patterns` AND `uimax.patterns`. Only `blocks_used` (flat CSV per pattern) is filled across 44 patterns.
- **Future use:** Once F1 lands, populate `patterns.block_composition` from source block.json files + the universal-nesting fallback's discovered shapes. Walker can then read from this DB column for FAST-PATH pattern-shape lookups.
- **Replacement path:** Tier 4 DB-first cleanup. Couples with E2 (composite_element retirement after universal-nesting lands).

### Q19 — `composite_element` flatten path (architectural cheat, not data cheat)
- **file:line:** convert.py:4096-4117.
- **What it does:** Calls `lift_subtree_into_block_attrs` which flattens descendants into parent block's scalar attrs. Violates Spec 16 §15 (every composite block emits OPEN with InnerBlocks children).
- **Rule broken:** Universal extraction primitive (architectural-level).
- **Council source:** A1 (R2 round 1, downgraded by R2-B+R3-C+R3-D).
- **Status:** R3-D — the flatten path NEVER FIRED in the run. Existing branch correctly emits InnerBlocks when DB parent_block has rows; soft-fails diagnostic when not. Not a hot path.
- **Replacement path:** F1 universal-nesting fallback. When `_lift_inner_blocks` returns empty, walk direct child divs structurally (per Bean's P7). The flatten path becomes truly dead code after F1 lands.

### Q20 — `essence_match_variation` double-attribution (latent cheat, not visible)
- **file:line:** convert.py:4052.
- **What it does:** Both lift_subtree_into_block_attrs AND _lift_inner_blocks fire on the same elements; data appears twice in extract.json.
- **Rule broken:** Direct-owner attribution (theoretical).
- **Council source:** A7 (R2 → R2-A traced → R3-C disproved at render layer).
- **Status:** DISPROVED at runtime. Hero render.php line 611-613 + 771 uses ONLY `$content` for CTAs. Scalar attrs are deprecated.js editor-only.
- **Replacement path:** Cosmetic guard (~10 LOC) when scalar CTA attrs already lifted. Defer.

### Cheat-inventory summary table

| # | Cheat | file:line | Rule broken | Council source | Severity |
|---|---|---|---|---|---|
| Q1 | Hero per-slug guard (split-image) | convert.py:3557-3585 | Per-block legacy | K9 / "ages ago" | LOW (working but ugly) |
| Q2 | Hero VARIANT_MODIFIERS dict | convert.py:3591-3608 | DB-first | B2 | LOW (inline in Q1) |
| Q3 | ARRAY_LIFT_PATTERNS recipes | convert.py:1008-1030 | Per-block legacy + DB-first | F1 follow-on | **HIGH** (actively used) |
| Q4 | _lift_inner_block_attrs per-block | convert.py:1532+1550 | Per-block legacy | B7 | **HIGH** (button + info-box) |
| Q5 | _ABSORB_GAP_PROPS frozensets | convert.py:3814-3823 | DB-first | B4 | MEDIUM |
| Q6 | _CORE_BLOCK_STYLE_MAP | convert.py:1787 | DB-first | K13 | MEDIUM |
| Q7 | _STR_PASSTHROUGH_ALLOWED | convert.py:1826 | DB-first | not flagged | LOW |
| Q8 | _STYLE_KEY_TO_ROLE + _STYLE_SUBKEY_ROLE_OVERRIDE | convert.py:2041-2057 | DB-first | not flagged | MEDIUM |
| Q9 | _infer_role string-matching | css_router.py:567-588 | DB-first | R1.3 / B5 | MEDIUM |
| Q10 | enum_vals product-card hardcode | convert.py:3422 | DB-first | B1 | LOW |
| Q11 | variant pill-wrap badge hardcode | convert.py:4311 | DB-first | B3 | LOW |
| Q12 | _BREAKPOINT_SUFFIXES non-standard drop | convert.py:1618 (partial) | DB-first | P-PHASE8-7 | LOW |
| Q13 | _FULL_BLEED_WIDTH_VALUES | convert.py:446 | DB-first (minor) | not flagged | LOW |
| Q14 | ATOMIC_TAG_MAP + SGS-swap literals | convert.py:698 + atomic branches | Per-block legacy + DB-first | B6 / E1 | MEDIUM |
| Q15 | Per-target-block emit chain | convert.py:910-944 | Per-block legacy | E1 | MEDIUM |
| Q16 | block_slug guards in lift_subtree | convert.py:1016+1048 | Per-block legacy | K9 | LOW (heritage-strip dead) |
| Q17 | RETIRED_BLOCK_REMAP vulnerability | not flagged in current code | Robustness | K19 | LOW |
| Q18 | INNER_BLOCK_PATTERNS retirement status | unclear (needs verification) | DB-first | L1+L2 | NEEDS VERIFY |
| Q19 | composite_element flatten path | convert.py:4096-4117 | Universal extraction primitive | A1 | LOW (never fires) |
| Q20 | essence_match double-attribution | convert.py:4052 | Direct-owner attribution | A7 | DISPROVED |

**Total: 20 distinct cheats identified.** Sections B + E + L + K of the register already covered most as DB-first violations / consolidation opportunities — Section Q consolidates them into a single inventory with file:line evidence + universal-mechanism replacement path.

**Critical observation:** The HIGH-severity cheats are Q3 (ARRAY_LIFT_PATTERNS) and Q4 (_lift_inner_block_attrs per-block). These actively carry production behaviour. F1 alone doesn't replace them — they need targeted DB migrations alongside F1.

**Cheat removal sequencing — REVISED per Bean 2026-05-25 (single phase covers ALL cheats):**

Bean directive: *"Lets also deal with every cheat, piece of hardcoded thing in there in the same phase. If it's easy or dead code then it should be easier."*

Single PHASE C+1 (cheat-removal architectural cleanup) covers all 20 cheats in one focused commit cycle:
- **Trivial deletions first** (lowest risk, fastest):  Q13 (FULL_BLEED_WIDTH_VALUES — defer in place; minor), Q16 (heritage-strip guard — pure dead code per parking), Q17 (RETIRED_BLOCK_REMAP guard — small assertion), Q19 (composite_element flatten path — never fires per R3-D; survives as soft fallback until callsites re-route), Q20 (essence_match scalar-attr guard — cosmetic).
- **Data-driven migrations** (DB seed + script swap; mechanical):  Q5 (_ABSORB_GAP_PROPS → property_suffixes flags), Q6 (_CORE_BLOCK_STYLE_MAP → DB), Q8 (_STYLE_KEY_TO_ROLE → DB), Q9 (_infer_role string-matching → read kind from DB), Q10 (enum_vals → block_attributes.enum_values), Q11 (badge→pill-wrap → slot_synonyms.default_variant), Q12 (_BREAKPOINT_SUFFIXES → DB), Q14 (ATOMIC_TAG_MAP → DB), Q15 (per-target-block emit chain → DB dispatch).
- **Hot-path migrations** (require care; carry production behaviour):  Q1+Q2 (hero per-slug guard + VARIANT_MODIFIERS — DB-backed split-image + per-block variant rows; HISTORICAL, low priority per Bean), Q3 (ARRAY_LIFT_PATTERNS → DB extraction recipes), Q4 (_lift_inner_block_attrs per-block branches — generalise sgs/button + sgs/info-box via slot_synonyms data), Q7 (_STR_PASSTHROUGH_ALLOWED → block_attributes.attr_type generalisation), Q18b (populate patterns.block_composition).

**Acceptance gate per commit (track ALL body sections, not just hero):**
Bean directive: *"It's not just the hero section that has the cheats, should also track other sections being affected by the removal and fix."*

Per Stage 11 pixel-diff on canary page 144 (sandybrown), record per-section deltas at 375/768/1440 BEFORE and AFTER each commit:

| Section | Pre-F1 baseline (2026-05-25 10:12) |
|---|---|
| hero (FR1-matched) | 86.5 / 64.1 / 69.6 |
| trust-bar | 37.0 / 24.6 / 33.1 |
| featured-product | 70.4 / 58.7 / 81.9 |
| brand | 73.8 / 59.4 / 50.0 |
| ingredients-section | 53.2 / 41.4 / 53.9 |
| gift-section | 55.2 / 44.8 / 47.5 |
| social-proof | 75.2 / 80.1 / 60.2 |
| **mean** | **63.2%** |

Gate: NO body section regresses by >5pp; ≥3 sections drop by ≥5pp; mean drops by ≥2pp. If any of these fail, the commit is held — the universal mechanism hasn't absorbed what the removed cheat was carrying; back-fill DB data or extend universal path; re-test.

---

## Section P — Bean's design principles + binding constraints (load-bearing)

These are extracted from Bean's verbatim messages across the prior session and this one. They are NOT council findings — they are operator-set constraints that shape every architectural decision in this register. Every proposed solution must satisfy these.

### P1 — Universally-applicable mechanisms (NO per-block hyperfocus)
- **Verbatim source (entry 1306):** *"Most important point is not to hyperfocus only on the trustbar, we're working on universally applicable mechanisms so this works in all circumstances when I have you create websites drafts in the future."*
- **Binding effect:** Every fix proposed in this register must be evaluated against "does this work for every future client mockup, or just for Mama's?" Per-block specialisations (per-slug guards in lift_subtree, per-block branches in `_lift_inner_block_attrs`, hardcoded SGS-swap target slugs) all fail this test.
- **Maps to:** F1 (universal-nesting fallback), F2 (cascade-fold), B7 (per-block branches removal), G3 (hardcoded "cheat" branches), K9 (per-slug guards), K1 (G1+G3+G5 = one wiring gap, not three).

### P2 — Empirical-check before architectural conclusion
- **Verbatim source (entry 1306 B.2):** *"Please check on what the current setup is for the quote block section in our current clone of the draft to see whether it's a quote block currently or a group of text blocks. Just want to be aware before we do this so we can deal with it later appropriately and know if there actually was a change or not."*
- **Binding effect:** Bean asked for an empirical state-check BEFORE proceeding with proposed architectural changes. I didn't complete this in the prior session — that's part of why my Tier 1 went off-rails. Phase A step 1 of the investigation order is this check.
- **Maps to:** Phase A step 1 (read latest extract.json for brand sgs/quote). A4 confirmed-defect cannot be fixed without this check.

### P3 — Hardcoded "specialised cheat branches" suspicion
- **Verbatim source (entry 1306 C):** *"The walkers 12+ branches looked like it includes some hardcoded/specialised cheat branches that don't need to exist which were probably built to try to solve a specific block or element e.g. atomic text standalone and atomic paragraph/heading/image/button. These seems potentially unnecessary hardcoded cheats that should be reviewed."*
- **Binding effect:** Bean flagged the atomic_* family AND the per-block specialisations within them as suspect. R3 round 1 partially cleared the spec-mandated atomic-tag branches (FR2) but the per-block-slug specialisations WITHIN them (B3 badge→pill-wrap; B7 _lift_inner_block_attrs branches; K9 per-slug guards) are the actual cheats. Bean's intuition was correct on those.
- **Maps to:** B3, B6, B7, G3, K9, E1 (consolidation).

### P4 — Multi-model council methodology requirements
Bean explicitly designed the council methodology across three messages:
- **Entry 1409:** *"I expected that the qc-council would be reviewing overlapping sections so we could get multiple opinions or at least a second round to see if there was any gaps or disagreements that could be found now"* — **OVERLAPPING rater scopes required.**
- **Entry 1444:** *"there were a lot more points than 7 from what I can remember. And, if these agents can actually reference the code they found issues in it will make the fact checking faster and easier"* — **Citation requirements baked in (file:line + verbatim snippet); enumerate ALL distinct claims, don't cherry-pick.**
- **Entry 1501:** *"use spec 21 (pipeline artefacts) to provide the agents with the names and locations of all of the artefacts ... They can come up with new issues/findings that they can then look to the code to find proof for, they should also look to prove and disprove each claim, especially the points where there's disagreement or it's cautioned to touch the function ... you are the head of the council, don't just report their findings, assess all the arguments and evidence, then give your final decision and explain it in a way i can understand"* — **Round 3 artefact-grounded; raters prove + disprove; head-of-council independent verdict in plain English.**
- **Binding effect:** Every future council on this codebase follows this shape. Captured in Section J (methodology lessons).

### P5 — Content uniformity is IRRELEVANT; styling commonality drives cascade-fold
- **Verbatim source (cascade-fold exchange):** *"I don't really understand why having different content in columns of a footer would make them any different. Like I'm not even talking about changing the per column CSS, they could all have the exact same background colour, padding, margins etc which is what I think of when we talk about defaults- the styling. I don't see why having a logo block, then a sgs/text block in one column and then a header block, nav or list block, then another header block and another list block under that in the other column makes the styles inherited by each and set as a group default different."*
- **Also:** *"I know the trust bar has a uniform div-class/block set in each grid items but even in that, each grid item will have a unique icon and text body set in it anyway so nothing really folds in that overly simple way."*
- **Binding effect:** My early framing imposed a false "content uniformity" gate on cascade-fold. Bean explicitly rejected it. Cascade-fold operates at the STYLING layer only. Each grid item / column always carries unique content; folding still happens.
- **Maps to:** F2 (cascade-fold rule statement), G2 (threshold decision), blub.db row 287 (cascade-fold-default-plus-override-not-uniform-gate).

### P6 — Per-property cascade hoist (default + override), NOT binary uniformity gate
- **Verbatim source (brain-dump):** *"Just thinking to make this more robust - we could potentially set up the default wrapped styling even if not all are uniform and just have the unique styling rules that contradict the default sit in the child block which would overrule or sit on top and cover the default one?"*
- **Binding effect:** This is THE design contribution that makes F2 robust. Per-property analysis: most-common value lifts to parent default; divergent values stay as overrides on the specific child that contradicts. Wrapper blocks always exist (preserve className); their attrs carry only the divergence; parent carries defaults. Cascade lives at CSS layer at runtime.
- **Maps to:** F2 (cascade-fold), G2 (threshold decision), L12-L14 (modifier-class / pseudo-class / property-dependency edge cases).

### P7 — Empty-array fallback walks direct child div descendants (the universal-nesting primitive in actionable form)
- **Verbatim source (entry 1566):** *"if it's an empty array, it could just check all of the direct div block descendants and insert them into the array."*
- **Binding effect:** This is THE structural fix that closes the architectural gap. Per Spec 16 §15 line 990 in actionable form: when the walker would emit a composite block but the InnerBlocks data ends up empty (`_lift_inner_blocks` returns empty OR items[] array empty), walk direct child div descendants of the BEM block-root and emit each as a nested block carrying its `className`. NO DB seeding. NO retired-block re-registration. NO new synonyms.
- **Maps to:** F1 (universal-nesting fallback) — the single highest-leverage change in this register.

### P8 — Never reference retired blocks or unused slots in recommendations
- **Verbatim source (entry 1566):** *"the first seeding recommendation includes a block that doesn't exist anymore and then either way, the fact that you've replaced that with a container and put label in there When label isn't even used in that section anymore, like, that whole tier needs to just be removed."*
- **Binding effect:** Two negative constraints:
  - (a) Any recommendation that names a retired block (sgs/trust-bar, sgs/heritage-strip, etc.) is a STOP signal.
  - (b) Any recommendation that proposes a slot the section doesn't use (label in trust-bar after BEM rename) is a STOP signal.
- **Maps to:** Section J6 (dictionary-definition-of-cheating failure mode); G4 (retired-slug classification); B3 (badge→pill-wrap removal); Tier 1.4 of round 1 (now removed).

### P9 — The goal: ≤1% pixel-diff per section × 3 viewports (whole-page deferred along with header/footer)
- **Verbatim source (corrected by Bean 2026-05-25 post-register):** *"Full page is not a condition because I'm still building the tool and it needs to be able to prove itself before I can try to tackle a whole page, also as I mentioned, the whole page wouldn't work because the cloning for headers and footers is parked. We've already achieved an under 1% perfect clone of the hero section so it's totally possible and that dom wrapper stuff is BS, HTML, CSS and JS work the exact same way even if it's based in PHP and with different coding conventions etc. It does cleanly translate over."*
- **Binding effect:** The acceptance gate during the current build phase is:
  - ≤1% pixel-diff PER SECTION
  - Across 375/768/1440 viewports
  - Irrespective of mockup content variations
  - From Claude-generated HTML drafts in Bean's theme
- **Whole-page acceptance is PARKED** alongside header/footer cloning. It re-opens after (a) body pipeline consistently passes per-section ≤1% × 3 viewports, AND (b) header/footer cloner ships.
- **Empirical proof point that the gate is achievable:** Hero section already clones at ≤1% across all 3 viewports. The architecture works. Every other body section's gap is converter-quality (lift/walker/CSS-extraction bugs) — NOT structural impossibility.
- **K17 / "measurement-context noise floor" framing was wrong** — see Section L9 + N5 revision. HTML/CSS/JS translates cleanly across rendering contexts; ~30% diff on brand isn't a structural floor, it's a bug to fix.

### P10 — Evidence-based deduction, not probabilistic guessing
- **Verbatim source (footer/cascade-fold exchange):** *"I'm not asking you to agree with me, Im asking you to consider all of the real variables involved and drive a conclusion from those facts."*
- **Earlier captured rule (blub.db row 285):** *"State the architectural primitive in plain English BEFORE proposing the fix. If the fix doesn't directly invoke the primitive, it's a surface fix — STOP."*
- **Binding effect:** Every conclusion in this register must cite the variables (file:line, artefact:path, captured-learning row) it derives from. Probabilistic framings ("probably", "maybe", "I think") must be replaced with evidence citations OR explicit "not yet investigated" markers.
- **Maps to:** Section J methodology lessons; A1-A7 + B1-B7 + C1-C2 + D1-D2 etc. all carry evidence citations.

### P11 — Operator context (non-coder business owner with ADHD; relies on Claude as expert)
- **Verbatim source (this session):** *"I have ADHD and am not a developer so I'm relying on you as the expert."*
- **Binding effect:** Every recommendation must:
  - Lead with plain English (ADHD Rule 17 — Problem → Effect → Solution).
  - Show full map + ranked menu + reasoning (ADHD Rule 1) at every decision point.
  - First action under 5 min, zero dependencies (ADHD Rule 2).
  - Closure-over-cheerfulness on corrections (ADHD Rule 6).
  - Engineering deduction is MY job (ADHD Rule 2 from rules folder, blub.db row 285); Bean picks from options, doesn't invent alternatives.
- **Maps to:** Phase B (Bean sign-off ranked options); Section H/M investigation order with small first actions; every "Open question" formatted as menu + recommendation; the plain-English summary at the top of each register section.

### P12 — Common-understanding gates before complex moves
- **Verbatim source (cascade-fold exchange):** *"I'm very happy we have this common understanding now."* (Said immediately before proceeding to next design move.)
- **Binding effect:** Bean explicitly waits for common-understanding sign-off before authorising architectural moves. The 8 open questions at the bottom of this register are the gate; until they're answered, no code commit.
- **Maps to:** Phase B (Bean sign-off on architectural decisions) — REQUIRED before Phase C.

### P13 — sgs/multi-button is the canonical precedent for group-defaults + per-item-override
- **Verbatim source (cascade-fold exchange + captured as blub.db row 286):** *"Applied to trust-bar: sgs/container { className: 'sgs-trust-bar', layout: 'grid', columns:4, ..., childAlignItems: 'center', childGap: '10px', childDisplay: 'flex' ← per-item defaults hoisted from __badge } <sgs/container className='sgs-trust-bar__badge'> ← block still exists (the grid cell), no styling attrs ..."*
- **Binding effect:** F2 cascade-fold implementation must mirror sgs/multi-button's existing pattern (14 attrs on parent set group-wide defaults; inner sgs/button children rendered via $content; each child overrides via own attrs). Don't invent novel attr surfaces — extend sgs/container with childX defaults the same way.
- **Maps to:** F2 implementation, G2 cascade-fold threshold + edge cases, blub.db row 286.

### P14 — Universal mechanisms must compose across header / body / footer (cloning pipeline must handle all three)
- **Verbatim source (cascade-fold + footer exchange):** Bean applied the cascade-fold rule to BOTH the trust-bar (body section) AND the footer (template-part). He explicitly treated them as instances of the same universal mechanism.
- **Binding effect (current session):** Header + footer are PARKED per Bean's clarification — body pipeline first. But the universal mechanism (F1 + F2) is designed to work the same way when header/footer cloning re-opens. Same primitive must compose into header/footer cloner when that work re-opens.
- **Original parking instruction (USER #8, entry 560, verbatim):** *"Header and footer are separate job. Ignore for now"*
- **Maps to:** F1/F2 design must NOT be body-only.

### P15 — "All div classes are blocks but just some are nested inside others" (THE structural primitive in operator language)
- **Verbatim source (USER #14, entry 703):** *"a. I disagree. It's not just a selector, its also an icon block. And text is also the regular sgs text block (or whatever its real name is). b. All div classes are blocks but just some are nested inside others. c. Wrong as explained above."*
- **Binding effect:** This is THE structural primitive in Bean's own words — every BEM-class `<div>` in a mockup emits as a block; nesting in the mockup determines nesting in the WP output. This is Spec 16 §15 line 990 in operator language.
- **Implication for F1:** When the walker would emit a composite block and InnerBlocks data ends up empty, every direct-child `<div>` in the mockup becomes its own emitted block — because every div IS a block.
- **Implication for "atomic_* are cheats" framing (P3):** The atomic_paragraph/heading/image/button branches are spec-mandated (FR2 atomic-tag emission) but the per-block-slug specialisations within them violate P15.
- **Maps to:** F1 (universal-nesting fallback), L1 (recognition-side vs emit-side conflation collapses here — the emit-side IS the recognition-side at structural level).

### P16 — Per-section ≤1% × 3 viewports → auto-save as pattern (closure gate AND pattern-emergence mechanism)
- **Verbatim source (USER #20, entry 900):** *"if the section hits the 1% pixel diff target for all 3 device types then it is saved as a pattern for future use"*
- **Clarified (USER #24, entry 1171):** *"ignore my comments on the page being published or saved based on the diff test. That was a mistake, I just meant that it passes and is eligible to be used on a live site after that point. Nothing needs changing there."* — i.e. the "publishing" framing was wrong; the **pattern-save behaviour stays**.
- **Binding effect:** The +REGISTER pixel-diff gate (already shipped commit `e3cd1a04` per handoff Stage 11 pattern INSERT) realises this rule. Sections that hit ≤1% × 3 viewports auto-register as patterns. Patterns accumulate as the pipeline matures.
- **Implication for F1+F2 verification:** When F1 lands and a body section drops to ≤1% × 3 viewports, the existing +REGISTER gate writes a pattern for it. The pipeline's success becomes self-documenting via the patterns library.
- **Maps to:** Existing +REGISTER gate at `register_patterns.py` (already wired; Stage 11 ≤ 1% × 375/768/1440 INSERTs pattern row).

### P17 — Pipeline must achieve ≤1% deterministically; allowed manual work = block functionality + pipeline scripts only
- **Verbatim source (USER #22, entry 962):** *"But remember, you can't manually build anything aside from in the block functionality if it needs to be extended or in the pipeline scripts. The pipeline has to achieve the 1%pixel diffs based on its Deterministic universal script. Need to get rid of trust bar block and run /sgs-update"*
- **Binding effect (HARD RULE):**
  - **ALLOWED:** (a) Extending block functionality (block.json attrs, render.php logic); (b) Editing pipeline scripts (convert.py, css_router.py, orchestrator, etc.).
  - **DISALLOWED:** Hand-authoring patterns. Hand-fixing per-section markup. Per-client overrides. Any artefact that exists at the cv2 output level rather than the script level.
- **Implication for retired blocks (P8 + G4):** Trust-bar was retired BECAUSE Bean chose Option 2 (universal cloning pipeline) over Option 1 (specialised trust-bar block). The retirement was the application of P17 — Option 1 would have been bespoke per-block functionality; Option 2 is pipeline-script work.
- **Maps to:** F1 + F2 + B1-B7 + L2 (patterns.block_composition population by pipeline, not by hand).

### P18 — Universal flat-scanning preserves hierarchy/nesting + accurately assigns CSS rules and content to direct owner
- **Verbatim source (USER #25, entry 1186):** *"Regarding the flat scanning, Im not just focusing on the trustbar, Im talking about it working across the whole draft so that it works universally and there's no chance of cheating our way to functionality. And, the second part of that solution to flat scanning is preserving hierarchy/nesting levels as well as accurately assigning the CSS rules and content to its direct owner."*
- **Binding effect (HARD RULE — two parts):**
  - **(a) Hierarchy preservation** — emitted block tree mirrors mockup DOM nesting depth and order. NOT flattened.
  - **(b) Direct-owner CSS/content attribution** — CSS rules targeting `.parent .child` attribute to the child block; rules targeting the parent attribute to the parent block; never hoisted up or pushed down except via the explicit cascade-fold hoist (F2).
- **Implication for F1:** The empty-array fallback's direct-child walk must recurse into each child via the universal walker — not naively emit `sgs/container` per child.
- **Implication for K17 ("measurement-context noise floor"):** The 30%+ brand diff is a direct-owner-attribution failure (per L1 — wrapper-class CSS not landing on the right emitted block) NOT a structural rendering-context floor.
- **Maps to:** F1 (universal-nesting fallback), F2 (cascade-fold), L4 (className preservation via additionalClasses), N1+N2 (F1 over-fire / malformed-block risks).

### P19 — Cascade-fold extends to TWO levels (section + direct-child AND grid-item + grid-item-children)
- **Verbatim source (USER #26/28, entry 1197/1202):** *"There's the full class trust bar which is a container with the full grid and slider functionality and then each trust badge which represents each grid slot in that container having 1 icon and text block in each. Can each individual badge container CSS get folded into the per grid item CSS rules? I feel like it should have that level of customisation too. That way the general rule of merging the CSS from the class section and the direct child div classes underneath stays consistent here and we only need 1 container block"*
- **Binding effect:** F2 cascade-fold doesn't just operate at section→direct-children depth. It operates at every depth where N sibling wrappers share structural shape. Trust-bar has TWO levels (section + grid; grid-item + icon+text). Both levels run cascade-fold.
- **Maps to:** F2 implementation must recurse the cascade-fold rule per nesting depth.

### P20 — One fix at a time with /verify-loop discipline
- **Verbatim source (USER #10, entry 582):** *"Lets do A, B and C one at a time using /verify-loop to make sure each fix works optimally before moving on"*
- **Binding effect:** Multi-fix commits are dangerous because failed predictions in one fix mask the validity of another. /verify-loop with predicted numeric outcome (per blub.db row 276) before each fix.
- **Maps to:** Phase C/D/E in investigation order — separate commits per structural change, each /qc-council + /verify-loop gated.

### P21 — /systematic-debugging methodology for pipeline issues
- **Verbatim source (USER #4, entry 295):** *"figure out a solution that universally fixes the CSS extraction and passing over using /systematic-debugging and whatever other skills and commands that would help"*
- **Binding effect:** Root-cause investigation BEFORE fix proposals (4-phase methodology: Root Cause → Pattern Analysis → Hypothesis → Implementation).
- **Maps to:** Phase A empirical grounding (no fix proposals until root cause established for A4 brand, K6 ingredients regression, etc.).

### P22 — sgs/multi-button is canonical precedent (HARD evidence from operator)
- **Verbatim source (USER #29, entry 1213, point 4):** *"we have a custom container for buttons called sgs/multi-button which also should be able to set defaults for everything inside the buttons it owns on top of external things like gaps or margins and padding but you can always click each individual button to override it."*
- **Verbatim source (USER #29, point 7):** *"that sort of 'override' just sounds like having the option to set up per grid item level options while having a group default set of rules that applies to all of them aside from whichever specific attribute/attributes you've changed in each grid item"*
- **Binding effect:** F2 cascade-fold implementation must mirror sgs/multi-button's existing pattern — 14 parent attrs set group defaults; inner blocks override via own attrs.
- **Maps to:** F2 design (already in P13 — adding the multi-button-precedent verbatim source here for completeness).

### P23 — Common-precedent extension before novel mechanism (always check what's already implemented)
- **Verbatim source (USER #29, entry 1213, point 2):** *"We already have this implemented for class sections with only 1 direct child div class or something similar - please look into how we have set that up before recommending anything new as this is more so an extension of that functionality rather than anything new."*
- **Binding effect:** Before proposing F2, I must read `_absorb_transparent_wrappers` end-to-end (Phase A step 4) to understand the existing 1-child precedent. F2 is the N≥2 extension; same primitive.
- **Maps to:** Phase A step 4; also captured in blub.db row 286 (check sgs-db block capability before evaluating).

### P24 — Read all relevant spec + pipeline + implementation BEFORE proposing
- **Verbatim source (USER #32, entry 1267):** *"Please read the spec doc and pipeline docs on the css extraction rules and then try to find how it is implemented in the pipeline flow scripts. Then suggest based on the current setup how you'd implement all of these proposed updates"*
- **Verbatim source (USER #14, entry 703):** *"Please read through the full spec on Deterministic converter v2, cloning pipeline flow, cloning pipeline stages and dev setup docs and then re-read the strategic plan doc and phase 1 plan doc again"*
- **Binding effect:** Spec + pipeline + implementation reads BEFORE proposing changes. Captured in blub.db row 285.
- **Maps to:** Phase A step 4; ongoing discipline for every commit.

### P26 — Don't agree, disagree, or propose without evidence. Find it first.
- **Verbatim source (Bean 2026-05-25):** *"you shouldn't just directly agree or disagree or propose something with me. Find the evidence and return with an answer based on that."*
- **Binding effect (HARD RULE, sharpens P10):**
  - Banned phrases: "I agree", "I think", "recommendation: X", "(i) is cleaner because…", "this sounds right" — when not backed by file:line citations, artefact paths, or quoted prior decisions.
  - When Bean proposes something or asks a yes/no, my job is to find the evidence (in code, artefacts, captured learnings, prior session messages, DB rows) and return with the answer the evidence supports — not reason from principles.
  - For F1 insertion shape (Q2): read `_lift_inner_blocks` + composite_element + essence_match_variation + FR1 fast-path end-to-end in convert.py. THE CODE STRUCTURE tells me which insertion shape works. Phase A step 4 work, not Phase B sign-off.
- **Maps to:** Q2 reframed (see Open Questions revision). All "Recommendation: X" calls in the register need re-grounding in evidence before sign-off.

### P27 — The hero cheats are the architectural roadmap (intelligent scripting + DB tables replace each cheat)
- **Verbatim source (Bean 2026-05-25):** *"the converter can work if we replace those [hardcoded conversions] with intelligent scripting and db tables with all the data they may need."*
- **Binding effect:** Every hardcoded cheat in convert.py is a roadmap item — what universal-mechanism + DB data needs to exist to remove it.
  - **L15 cheat 1 (split-image guard):** needs `slot_synonyms` rows mapping `__split-image--desktop` / `__split-image--mobile` / `__image--mobile` to `splitImage` / `splitImageMobile` attrs.
  - **L15 cheat 2 (hero VARIANT_MODIFIERS):** needs `modifier_suffixes` rows scoped per-block for hero's variants — generalisable to all blocks with variantStyle attr.
  - **L15 cheat 3 (ARRAY_LIFT_PATTERNS):** needs DB structure for "array attr extraction recipes" with selector + field-extractor mapping; includes special extractors like `count_stars`.
  - **B1/B2/B3/B4/B7/K9 etc.** — every DB-first violation in Section B is also a cheat-removal opportunity.
- **Implication for Phase C/D/E scope:** F1 ship is necessary but not sufficient. The full path to P9 (universal ≤1%) requires F1 + every cheat-replacement migration. Each migration's pre/post hero-regression test is the proof-point.
- **Verbatim source (USER #23, entry 1152):** *"the patterns being saved should be a final step in the pipeline after the pixel diff step. Where the page is approved and published if it hits the 1% goal and each section is saved as a pattern in the theme if they individually hit the 1% goal"*
- **Clarified (USER #24, entry 1171):** *"ignore my comments on the page being published or saved based on the diff test. That was a mistake, I just meant that it passes and is eligible to be used on a live site after that point. Nothing needs changing there."*
- **Binding effect:** Section-passes-1% → pattern auto-saved. This is the +REGISTER gate already shipped (commit e3cd1a04 register_patterns.py). Pages don't auto-publish; sections auto-promote to patterns.
- **Maps to:** P16 (already captured the +REGISTER gate).

---

## Section J — METHODOLOGY lessons captured during the council (process gaps)

### J1 — Round 1 dispatch error: non-overlapping rater scopes
- **Source:** Bean (round 1 → round 2 redirect)
- **Severity:** PROCESS — affects every future council
- **Claim:** Each reviewer was given a non-overlapping component slice. Result: 4 independent reads with ZERO triangulation. Defects R2 round 1 graded as "D wholesale rewrite" were downgraded to C once a second pragmatic-engineer rater (R2-B) had the same scope.
- **Fix:** Every council MUST give 2-3 raters the same component for verdict convergence. Persona diversity (purist + pragmatic + spec-checker + risk-auditor) provides triangulation when model diversity isn't available.

### J2 — Round 2 dispatch error: static-code-only, no empirical grounding
- **Source:** Bean (round 2 → round 3 redirect)
- **Severity:** PROCESS — pairs with blub.db row 254 (read leftover-buckets first)
- **Claim:** Round 2 had citations but raters only read code, not artefacts. Round 3 added artefact-grounded evidence (Spec 21 → pipeline-state/<run>/) and immediately surfaced things round 2 couldn't see: flatten path never fires (R3-D); 11 soft-fail traces emitting fix instructions (R3-A); brand `body[]` empty (R3-C); render.php $content uses for hero CTAs disproving the "double-attribution" claim (R3-C).
- **Fix:** Every council on a pipeline issue MUST include artefact reads (extract.json, trace.jsonl, leftover-buckets.json, stage-N.json, css-d1-assignments.json) per Spec 21. Code-only councils miss runtime behaviour.

### J3 — Fact-check gap: 16 of 21 reviewer issues verified
- **Source:** Bean (during round 2)
- **Severity:** PROCESS — affects head-of-council synthesis discipline
- **Claim:** Head of council (me) reported "7 issues" in initial synthesis. Real count across the 4 raters = 21 distinct issues (R1=6, R2=6, R3=5, R4=4). I cherry-picked the most consequential for fact-check and skipped 5+ unverified items.
- **Unverified items at end of round 2:** essence_match double-attribution (settled by R2-A trace + R3-C disprove); atomic-branch duplication magnitude (settled by R2-A 34-LOC measurement); sgs_bem_wrapper undocumented (settled by R2-B + R2-A spec quotes); bare except at 4230 + 4238 (settled by R2-B `# noqa: BLE001` finding).
- **Fix:** Head-of-council must enumerate ALL issues across raters with a verification matrix BEFORE synthesis. Cherry-picking by perceived importance leaves verified bugs unreported.

### J4 — Council fix-shape proposals are HYPOTHESES not specs
- **Source:** blub.db row 276 (council-predictions-need-empirical-validation)
- **Severity:** BINDING RULE for future councils
- **Claim:** Multi-rater councils produce two kinds of output: diagnostic claims (reliable — raters triangulate evidence) and fix-shape proposals (NOT reliable — raters infer control flow + frequently miss layered handoffs, fast paths, framework conventions).
- **Live evidence (2026-05-25):** R1's D1 attr_path fix proposal — F3+F5 already mitigated; net-zero benefit. R2's "wholesale recursive replace" — sgs/quote + sgs/label render.php depend on flatten. R3's ATOMIC_SWAP_MAP consolidation — silent divergences would regress 4 branches.
- **Rule:** Before dispatching subagents to implement any council-proposed fix shape, write the predicted outcome in numeric terms and run the smallest pipeline slice that produces that number. If prediction holds without the fix, diagnosis is wrong; re-investigate. For multi-wave plans, the gate goes between each wave.

### J5 — Plain-English handoff requirement for non-coder operator
- **Source:** Bean entry 1501 ("you are the head of the council, don't just report their findings, assess all the arguments and evidence, then give your final decision and explain it in a way i can understand")
- **Severity:** PROCESS
- **Rule:** Head-of-council MUST: (a) independent assessment, not synthesis-only; (b) plain-English summary alongside technical detail (ADHD Rule 17 — Problem → Effect → Solution); (c) explicit α/β-style architectural decisions surfaced as decisions, not buried in technical recommendations.

### J6 — "Dictionary definition of cheating" failure mode
- **Source:** Bean's entry 1566 + captured as blub.db row 285
- **Severity:** BINDING RULE
- **Pattern:** Head-of-council recommendations that:
  (a) Reference blocks/slots that no longer exist (named sgs/trust-bar after D72 retired it; named sgs/label slot in trust-bar after Bean said label isn't used there);
  (b) Propose data patches (DB seeds) that silence diagnostic messages without invoking the architectural primitive (Spec 16 §15);
  (c) Don't directly invoke the primitive in plain English BEFORE proposing the fix — surface fix territory.
- **Trigger phrases on my output that should stop me:** "seed parent_block for [slugs]", "register [retired-slug] as a block", "add [retired-slot-name] synonym".

---

## Section K — ADJACENT PARKING ENTRIES (body-pipeline scope; header/footer parked per Bean)

These parking entries bear directly on the universal-nesting + cascade-fold programme. Cross-referenced for completeness.

### K1 — `P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP` — G1+G3+G5 = one architectural primitive missing
- **Status:** OPEN
- **Restatement:** Three previously-separate gaps (G1 hero self-closing CTAs; G3 Stage 3 text-only slot resolver; G5 per-block DOM mismatches) dissolve simultaneously when universal-nesting primitive (F1) lands. The SGS-framework.db has all the mapping data needed (property_suffixes 117, slot_synonyms 89, block_attributes 2246, modifier_suffixes 19); cv2's walker doesn't query all of it consistently. Wave 2 = one wiring change, NOT three per-block fixes.
- **Mapping to this register:** F1 closes G1; A2 + F1 close G3 (visual slots resolve when every BEM-class div emits as its own block); G3+F1 closes G5 (emitted DOM nesting matches mockup by construction).

### K2 — `P-G3-STAGE-3-VISUAL-SLOT-MAPPING` — visual/structural slots return empty
- **Status:** OPEN (Phase 3 + Phase 6 infrastructure shipped but live-page-144 verification pending)
- **Claim:** Stage 3 slot_list only extracts text-content slots. Visual/structural slots (backgroundImage, overlayColour, minHeight, ctaPrimaryColour, alignment, gridTemplateColumns) return "no value extracted" even when mockup CSS has values.
- **Pixel-diff side closed by D70** (inline-CSS deploy). Failure-count side reframed by D71 (440/473 failures are legitimate `value_empty` for features absent from mockups; remaining ~33 split across ~7 visual-only slots blocked by `_slot_attr_prefix` returning None + ~26 attrs with no canonical_slot in DB).
- **Mapping to this register:** The universal-nesting primitive (F1) makes most of this moot — every BEM-class div emits as its own block; the CSS that targets each class lifts into that block's attrs via existing `property_suffixes` route.

### K3 — `P-WALKER-PREPASS-REGRESSION-TRIAGE` — commit `124e1d06` Bean decision required
- **Status:** OPEN — Bean decision needed pre-Step 1.7 closure (recently re-framed to D70/D71)
- **Pixel-diff regressions:** featured-product +53.2pp at 375 + 34.7pp at 768; ingredients-section +23.6 to +33.8pp all viewports — vs improvements in brand (-6 to -28.7pp) and gift-section (-12 to -31.9pp).
- **Root cause:** The pre-pass guard correctly prevented `composite_element` from claiming BEM-element wrappers as `sgs/text` — but structurally correct output (individual blocks) renders further from mockup visually because per-block CSS hasn't been lifted yet.
- **Mapping:** Closes when F1 + A4 (brand body[]) + F2 cascade-fold land together. Net direction is right; visible regression is expected mid-transition.

### K4 — `P-ARRAY-LIFT-PATTERNS-FULL-MIGRATION` — count_stars + multi-selector special features
- **Status:** OPEN (Phase 1 follow-on F1 from prior plan)
- **Claim:** `ARRAY_LIFT_PATTERNS` hardcoded dict at convert.py:1008-1031 — provides `count_stars` rating extractor + multi-selector fallback chains that universal 1e-B path doesn't yet replicate.
- **Mapping:** Couple with B7 (per-block branches in `_lift_inner_block_attrs`). Both are per-block hardcoded data that should move to DB columns.

### K5 — `P-FR1-VARIATION-BUF-CONSISTENCY` — 2 sibling callsites still missing variation_buf
- **Status:** PARTIAL (FR1 block-root branch fixed 2026-05-22 commit `8ceb8787`)
- **Open:** essence-match tier at convert.py:3926 lifts then returns at 3936-3937 without `variation_buf.append`; composite-element-to-standalone-block at convert.py:3970 lifts then returns at 3990-3991 without `variation_buf.append`.
- **Mapping:** Pair with F1 implementation since both sites are the empty-array fallback insertion candidates.

### K6 — `P-INGREDIENTS-1440-REGRESSION-AFTER-INLINE-CSS` (NEW post-D70)
- **Status:** OPEN
- **Empirical:** Stage 11 ingredients-section at 1440px regressed from 31.5% → 53.9% (+22.4pp) post-D70 inline-CSS deploy. Same section dropped −22pp at 375 and −20pp at 768 (net win at smaller viewports).
- **Hypotheses:** (A) Desktop rule in `variation-d0-d2.css` overrides framework defaults at 1440 with partial cascade conflict. (B) Screenshot-timing — page wasn't fully painted when Playwright captured. (C) Desktop-specific rule doesn't match live DOM shape exactly.
- **Mapping:** Investigate as part of Sequence 1 (empirical grounding). Re-run /sgs-clone to rule out timing first.

### K7 — `P-PHASE8-14` — section-collapses-into-leaf-block guard
- **Status:** OPEN
- **Claim:** A section whose class accidentally matches a leaf-level block name (e.g. `<section class="sgs-product-card">` rather than `<section class="sgs-products"><div class="sgs-product-card">…</div></section>`). Stage 2 matches at confidence 1.0; FR1 fast path fires; `lift_subtree_into_block_attrs` collapses entire multi-component section into a single leaf block. No bucket captures this — silent collapse.
- **Mapping:** Universal-nesting primitive F1 closes this naturally — when the matched block is leaf-shape (no InnerBlocks supports), the walker shouldn't emit it for a section root with N children. Add `is_leaf` check during Stage 2 confidence boost OR during walker entry.

### K8 — `P-PHASE8-2` — per-block render.php audits (responsive variant attrs not honoured)
- **Status:** OPEN
- **Claim:** Converter correctly lifts `headlineFontSizeTablet` etc.; but many block render.php files don't emit matching `@media (min-width:768px) { .sgs-Xxx__headline { font-size: N } }` rules. Audit ~6-8 blocks (hero, product-card, info-box, testimonial-slider, feature-grid, card-grid, cta-section).
- **Mapping:** Couple with G1-β migration. As each render.php gets migrated to OPEN-InnerBlocks, audit its responsive variant CSS at the same time.

### K9 — `P-PHASE8-3` — hyperspecific block_slug guards in lift_subtree
- **Status:** OPEN
- **Claim:** Pre-existing technical debt: `if block_slug == "sgs/hero":` at convert.py:1016 and `if block_slug == "sgs/heritage-strip":` at convert.py:1048. Should be DB-driven `block_image_slots` table (subagent 5's 2026-05-15 design).
- **Note:** sgs/heritage-strip is retired — the guard is dead code. Drop it as part of the universal-nesting cleanup.

### K10 — `P-PHASE8-4` — `convert_page.py:198` hardcodes `extracted_attributes: {}`
- **Status:** OPEN
- **Claim:** `convert_section()` in `__init__.py` was fixed to populate extracted_attributes via brace-depth extraction; the parallel `convert_page.py` function still has the hardcoded empty dict. If orchestrator routes through convert_page.py instead of convert_section, Stage 9 sees empty extracted_attributes.
- **Mapping:** Investigate during Sequence 1 step 4 (read absorb + lift_inner + composite_element + essence_match end-to-end).

### K11 — `P-PHASE8-5` — pack-size pills not rendering on featured-product cards
- **Status:** OPEN
- **Claim:** Lift code correctly emits `packSizes` array in WP block markup for Zookies card. Render.php has `if ( ! $is_trial && ! empty( $pack_sizes ) )` gate. Pills don't render visibly on deployed page. Audit `$is_trial` computation.
- **Mapping:** Direct contributor to featured-product pixel-diff. Investigate alongside Sequence 4.

### K12 — `P-PHASE8-7` — `_BREAKPOINT_SUFFIXES` non-standard breakpoint silent-drop
- **Status:** OPEN
- **Claim:** Styling-lifter's `_BREAKPOINT_SUFFIXES` table covers 5 industry-standard breakpoints. Non-standard breakpoints (`min-width: 900px`, `min-width: 576px`) silently ignored — responsive attr family doesn't lift.
- **Mapping:** Move breakpoints to DB (theme.json settings.layout) per DB-first rule.

### K13 — `P-CORE-STYLE-MAP-DB-MIGRATION` — `_CORE_BLOCK_STYLE_MAP` hardcoded
- **Status:** OPEN
- **Claim:** 26-entry module-level dict mapping CSS properties to WP core-block `style.*` paths. Data not logic. Should live in DB.
- **Proposed:** Either add `core_block_style_path` column to `property_suffixes` (JSON-encoded) OR new sibling table `core_block_style_paths`.

### K14 — `P-PARENT-QUALIFIED-TAG-LIFT` — SGS-class guard rejects valid parent-qualified selectors
- **Status:** OPEN
- **Claim:** `_lift_core_block_style` SGS-class guard rejects lift on any node without an `sgs-` class. Correctly blocks tag-blast-radius bug (`p { color: #333 }` corrupting every paragraph) but ALSO rejects parent-qualified tag selectors (`.sgs-brand__body p { font-size }` — inner `<p>` has no SGS class but matching selector IS class-qualified via ancestor).
- **Evidence:** -1 attr per non-canary section vs subagent's permissive run.
- **Proposed:** Modify `_collect_css_decls_for_element` to return matched selectors alongside decls; filter to those whose matched selector has at least one `.sgs-*` class anywhere in the selector chain.

### K15 — `P-TAG-SELECTOR-LIFT` — pure tag selectors not picked up
- **Status:** OPEN
- **Claim:** `_collect_css_decls_for_element` matches by class + parent-qualified class selectors. Pure tag selectors (`blockquote p`, `blockquote footer`, `h1, h2, h3 { font-family }`, `img { max-width }`) aren't picked up.
- **Brand impact:** 3 tag-only rules affect brand subtree visibility (blockquote, blockquote p, blockquote footer).
- **Proposed:** Second pass that queries CSS rules for tag-name + ancestor-chain (limit chain to 3 levels).

### K16 — `P-COVERAGE-METRIC-CORE-STYLE` — coverage matcher blind to nested style.*
- **Status:** OPEN
- **Claim:** `scripts/pixel-diff.py compute_attribute_coverage` does suffix-anchored match on SGS-flat-attr keys. Universal-lift helper emits nested `style.color.text`, `style.typography.fontSize`, `image.style.scale` — coverage matcher doesn't recognise these paths.
- **Evidence:** Post-lift extract has +4 new nested style objects; coverage% reads 18.75% unchanged.
- **Proposed:** Add a second matcher that walks nested `*.style` dicts.

### K17 — `P-MEASUREMENT-CONTEXT-PARITY` — wrapper-context diff (NOT a structural noise floor — corrected 2026-05-25)
- **Status:** OPEN — RE-FRAMED post Bean's correction
- **Original framing (now retracted):** Brand `.sgs-brand` crop dimensions at 1440 viewport differ between post 66 (mockup baseline) 780×791 and post 65 (SGS converter output) 1000×705. Initial conclusion: ~30% diff is an irreducible "wrapper-context noise floor"; can't close without rendering both sides in identical contexts.
- **Bean's correction (verbatim 2026-05-25):** *"that dom wrapper stuff is BS, HTML, CSS and JS work the exact same way even if it's based in PHP and with different coding conventions etc. It does cleanly translate over."*
- **Empirical disproof of the "noise floor" claim:** Hero section already clones at ≤1% across all 3 viewports (per Bean: *"We've already achieved an under 1% perfect clone of the hero section so it's totally possible"*). If a structural noise floor existed, hero couldn't either. Therefore: the 30%+ brand diff is converter-quality, NOT measurement-context-structural.
- **Re-framed claim:** Brand's high pixel-diff is a SUM of direct-owner-attribution failures (P18) — wrapper-class CSS not landing on the right emitted block + empty `body[]` array (A4 confirmed defect) + possibly other lift/walker bugs. None of these are "wrapper context" — all are concrete converter bugs.
- **Proposed solution:** Investigate as converter-quality bugs post-F1. Specifically: read brand `extract.json` for ALL CSS rules in the mockup-source CSS that target `.sgs-brand`, `.sgs-brand__quote`, `.sgs-brand__attribution`, `.sgs-brand__inner`, etc.; map each rule to its target block in the converter output; identify rules that landed nowhere (no block carries the className). Each unattributed rule = a concrete bug to fix.
- **Removed prerequisite status:** K17 is NOT a hard prerequisite for F1 ship. Investigate post-F1 if brand still measures high.

### K18 — `P-PHASE9-5` — empty-DB defensive assertion
- **Status:** OPEN
- **Claim:** `db_lookup.css_property_suffixes()` returns `[]` silently if `property_suffixes` table empty or DB file missing. Lifter then extracts zero CSS-driven attrs with no error raised.
- **Proposed:** `assert len(rows) > 0` at module load; or fail-fast with RuntimeError naming canonical DB path + `/sgs-update` recovery command.

### K19 — `P-PHASE9-6` — `RETIRED_BLOCK_REMAP` future-block-registration guard
- **Status:** OPEN
- **Claim:** `RETIRED_BLOCK_REMAP = {"heritage-strip": "brand"}` silently locks pattern routing even if `sgs/brand` is later registered as a real block.
- **Proposed:** Module-load assertion that no `RETIRED_BLOCK_REMAP` value collides with a currently-registered block slug; or invert priority: check `block_exists()` first, only remap when block is actually gone.

---

## Section L — AUXILIARY architectural notes (from captured learnings + prior synthesis)

### L1 — Recognition-side vs emit-side composition (blub.db row 279)
- **Distinction:** Spec 16 §15 was conflating two "composition" concepts:
  - **Recognition-side (input):** `sgs-framework.patterns.blocks_used` (44 rows populated) + `uimax.patterns.equivalent_implementations` (14 rows) — used by recogniser to identify "this mockup section matches this known pattern".
  - **Emit-side (output):** `INNER_BLOCK_PATTERNS` hardcoded dict in convert.py (one entry: `sgs/feature-grid → sgs/info-box`) plus the universal-nesting fallback (F1) — when hero shipped self-closing, it was because there's no entry here. This is the live runtime source.
- **Implication for F1 implementation:** The fallback walks direct child div descendants — that's the recognition-and-emit unified primitive. Bean's fix collapses the two-concept conflation: the emit-side IS the recognition-side at structural level.

### L2 — `patterns.block_composition` + `patterns.fingerprint` columns exist but unpopulated (blub.db row 280)
- **Status:** Both columns exist in `sgs-framework.patterns` AND `uimax.patterns`. Only `blocks_used` (flat CSV per pattern) is filled across 44 patterns.
- **Future use:** Once F1 lands, populate `patterns.block_composition` from source `block.json` files + the existing `INNER_BLOCK_PATTERNS` dict + the universal-nesting fallback's discovered shapes. Then `convert.py` reads from there instead of the hardcoded dict.
- **Mapping:** Tier 4 DB-first cleanup. Couples with E2 (composite_element retirement).

### L3 — `INNER_BLOCK_PATTERNS` is retired by §18 of Spec 16 (already)
- **Status:** Spec already documents the retirement. `_lift_inner_blocks(node, parent_slug)` consults `blocks.parent_block` + `slot_synonyms.standalone_block`. The dict is dead infrastructure waiting for cleanup.
- **Mapping:** Delete after F1 lands.

### L4 — Preserve mockup className via `additionalClasses` (blub.db row 278)
- **Source:** Spec 16 §15 names this as "Change 4" — preserving mockup modifier classes on emitted blocks.
- **Structural complement to F1:** Making CSS visible (Change 1: append `variation_buf` per FR1 emit) is useless if rendered DOM doesn't carry selectors the CSS targets. F1 fallback MUST preserve each direct-child div's className on its emitted block via `additionalClasses` / `className` attr.
- **Mapping:** F1 implementation requirement.

### L5 — Cloning preserves intentional bespoke detail (rule from blub.db)
- **Source:** `feedback_cloning_preserves_intentional_bespoke_detail.md`
- **Rule:** Non-token CSS values become NEW tokens in client style variation, not snapped to nearest. theme.json stays lean; variation absorbs differences.
- **Mapping:** Influences F2 cascade-fold threshold (G2) — when 1-of-4 columns has a bespoke value, the right behaviour is "leave it as override, lift to per-instance attr — don't quantise to nearest sibling's value".

### L6 — Atomic-branch LOC precise measurement (R2-A round 2)
- **atomic_paragraph (4174-4198):** 22 lines SGS-class-swap + 3 lines no-SGS fallback
- **atomic_heading (4200-4253):** 42 lines SGS-class-swap (longer; schema query, 2 try/excepts) + 12 lines no-SGS fallback
- **atomic_image (4255-4288):** 26 lines SGS-class-swap + 8 lines no-SGS fallback
- **atomic_button (4290-4294):** 5 lines total (no SGS-class check, no CSS lifting — A3 above)
- **atomic_text_fallback (4322-4346):** 22 lines SGS-class-swap + 3 lines no-SGS fallback
- **Literally-identical LOC** between atomic_paragraph and atomic_text_fallback (R2-A confirmed): 14 lines identical:
  - `sgs_classes = [c for c in (classes or []) if c.startswith("sgs-")]`
  - `style_dict, extra_top = _lift_core_block_style(node, classes, css_rules, "core/paragraph")`
  - `flat = _flatten_wp_style_to_sgs_flat(style_dict, extra_top, "sgs/text")`
  - …(11 more)
- **Mapping:** E1 consolidation candidate. Helper extraction (`_emit_sgs_text_block`) is safe per R2-A; full `ATOMIC_SWAP_MAP` is NOT safe per R2-B (silent divergences).

### L7 — `essence_match_variation` tier-gate caveat (P-P2III)
- **Source:** Parking entry P-P2III-ESSENCE-MATCH-TIER-GATE
- **Claim:** Tier only fires when `target == "sgs/container"`. Theoretical edge case: existing-but-stub block at slug X with sibling concept Y wouldn't trigger variation tier.
- **Mapping:** Low-priority. Defer until first real-world variation-detection run.

### L8 — D70 inline-CSS deploy created a new visible-regression class
- **Source:** P-DUPLICATE-HEADER-EXPOSED-BY-INLINE-CSS-FIX (already parked per Bean)
- **Note (for completeness):** Mockup's `<header class="sgs-header">` block in cv2 output now renders visually for the first time — appears BELOW framework's `<header>` template part. Header section pixel-diff at 375px jumped 25.4% → 84.8%. Resolution: Phase 2 specialised header/footer cloner (already planned).
- **Excluded from this register's investigation order** because Bean clarified header/footer parked until body pipeline hits ≤1% across 3 viewports.

### L9 — Pixel-diff empirical baseline (current)
- **Pre-D70 mean (2026-05-24 baseline):** 70.5% → 73.9% (post 5-change second pass)
- **Post-D70 mean (2026-05-25 inline-CSS deploy):** 74.1% → 68.4%
- **Body section deltas at 375 / 768 / 1440 (post-D70):**
  - featured-product: substantial drop
  - ingredients: −22pp at 375, −20pp at 768, +22.4pp at 1440 (K6 regression)
  - brand: substantial drop
  - gift-section: −39pp at 1440
  - social-proof: −40pp at 1440
- **Header (parked):** 25.4% → 84.8% at 375 (K8 — duplicate header newly visible)
- **Canary page:** 144 (`/rc-fix-verification-mamas-munches/`) on sandybrown-nightingale-600381.hostingersite.com
- **EMPIRICAL ACHIEVABILITY (CORRECTED 2026-05-25):** Hero clones at ≤1% × 3 viewports but VIA HARDCODED CHEATS in convert.py (per-slug guard at 3557; hero `VARIANT_MODIFIERS` at 3591-3608; `ARRAY_LIFT_PATTERNS` at 1008-1030). The clean clone does NOT prove the universal architecture works yet. What it proves: ≤1% IS achievable for any section once the right script logic + DB data exist. The universal mechanism must reach the same destination via intelligent scripting + DB tables, not per-block special-case code. See L15 for the corrected reference framing.

### L15 — Hero section: ≤1% achieved via HARDCODED CHEATS, not universal architecture (corrected 2026-05-25)
- **Status:** ≤1% pixel-diff × 3 viewports — achieved, BUT with hero-specific hardcoded logic in `convert.py`. The universal architecture is NOT proven by hero's current clean clone.
- **Bean's correction (verbatim 2026-05-25):** *"The current pipeline doesn't clone the hero at the perfect quality because I noticed it had introduced parts into the script to hard-code convertions but that means that the converter can work if we replace those with intelligent scripting and db tables with all the data they may need."*
- **Hero cheats verified by grep on convert.py (current main, 2026-05-25):**

| Cheat | file:line | Cited evidence |
|---|---|---|
| `if block_slug == "sgs/hero":` per-slug guard for split-image | convert.py:3557-3585 | 4 hardcoded class patterns: `sgs-hero__split-image--desktop`, `sgs-hero__image`, `sgs-hero__split-image--mobile`, `sgs-hero__image--mobile`. Lines 3563-3579. |
| Hero-specific `VARIANT_MODIFIERS` dict | convert.py:3591-3608 | `{"sgs-hero--split": "split", "sgs-hero--standard": "standard", "sgs-hero--video": "video", "sgs-hero--svg-animated": "svg-animated"}`. Inline-defined inside the hero-only branch. |
| `ARRAY_LIFT_PATTERNS` hardcoded dict (top-level) | convert.py:1008-1030 | Pattern-keys `testimonials` + `badges` with hardcoded selectors + `count_stars` special extractor. Per-pattern hardcoded routing. |
| Comments confirming hero is the architectural example | convert.py:153-155, 1316, 1362, 1364, 1449 | "P1.A nice-to-have #4 — hero-0 limitation", "sgs/multi-button → parent_block = 'sgs/hero'" — hero is the only fully-worked example in the comments. |

- **Implication:** If we deleted the hero cheats AND `ARRAY_LIFT_PATTERNS` today, hero would NOT currently clone at ≤1%. The universal mechanism doesn't yet carry the load hero requires — special-case logic does.
- **What the cheats reveal about the universal mechanism's gaps:**
  - **Split-image handling (3557-3585):** the mockup uses 4 different class shapes for "desktop split image" vs "mobile split image". Universal mechanism needs to know which BEM elements map to which attrs (`splitImage` vs `splitImageMobile`). This is `slot_synonyms` data that hasn't been seeded for these cases.
  - **VARIANT_MODIFIERS (3591-3608):** modifier classes `--split / --standard / --video / --svg-animated` route to the `variantStyle` attr. This is `modifier_suffixes` data scoped per-block that hasn't been seeded.
  - **ARRAY_LIFT_PATTERNS (1008-1030):** testimonials + badges array attrs need per-field extractor logic including `count_stars` (rating extraction). This needs DB schema for "array attr extraction recipes" — `slot_synonyms.array_extraction_recipe` or new table.
- **The real acceptance test (revised F1 acceptance):**
  1. Ship F1 (universal-nesting fallback)
  2. Strip the hero cheats one at a time + back-fill the underlying DB data they were carrying (slot_synonyms split-image rows; modifier_suffixes hero variant rows; array-extraction-recipe DB structure)
  3. Re-measure hero — MUST stay at ≤1% × 3 viewports without the cheats
  4. Re-measure other body sections — should benefit from the same intelligent scripting + DB data
  - This is a much stronger acceptance gate than "compare to hero's current numbers".
- **What this proves about the goal:** P9 (≤1% per section × 3 viewports irrespective of content) is achievable — Bean's evidence: "the converter can work if we replace those with intelligent scripting and db tables". But it's currently UNPROVEN — hero looks clean due to cheats. The work isn't just F1; it's F1 + cheat removal + DB backfill, with hero as the regression-test reference all the way through.

### L10 — Atomic branch consolidation INVENTORY (R3 + R2-A reconciled)
| Branch | LOC SGS-swap | LOC no-SGS fallback | Notes |
|---|---|---|---|
| atomic_paragraph | 22 | 3 | 14 lines identical to atomic_text_fallback |
| atomic_heading | 42 | 12 | UNIQUE: bare-except blocks (C1), `headlineId` AND `anchor` dual-lift |
| atomic_image | 26 | 8 | UNIQUE: `isdigit` width/height guards |
| atomic_button | 5 | — | NO CSS lifting (A3 bug); minimal branch |
| atomic_text_fallback | 22 | 3 | 14 lines identical to atomic_paragraph |
**Total LOC:** ~117 SGS-swap + 26 fallback. **Safe consolidation:** atomic_paragraph + atomic_text_fallback only (E1 — `_emit_sgs_text_block` helper, ~22 LOC saved). Leave heading + image + button untouched.

### L11 — Slot-synonym expansion candidates (P-PHASE8-9)
- **Currently in slot_synonyms.standalone_block:** badge → sgs/label (Bean flagged for removal in Tier 1.4 round 1)
- **Candidates for `→ sgs/info-box`:** tile, panel, feature, module, item
- **Decision deferred:** Wait until F1 universal-nesting lands. If F1 handles arbitrary BEM-element divs correctly, these slot-synonym rows may become unnecessary (every BEM-class div emits as its own block via universal walk, not via canonical→standalone lookup).

### L12 — Modifier-class CSS detection (`__col--featured` pattern)
- **Source:** My synthesis during the cascade-fold exchange + Bean's edge case
- **Rule:** When mockup explicitly authors a modifier class on a wrapper (`__col--featured { border: 2px solid }`), the walker detects the override clearly. That modifier becomes an override attr on the specific child block while siblings without the modifier inherit parent defaults.
- **Implementation note for F2:** During cascade-fold, scan each direct-child wrapper's class list for `--modifier` segments. Modifier-bearing children get their CSS rule(s) as override attrs even if other siblings would have agreed on a default.

### L13 — Pseudo-class CSS rules during cascade-fold (`:first-child`, `:nth-child(odd)`, `:hover`)
- **Source:** Edge case from cascade-fold design discussion
- **Rule:** Pseudo-class rules are inherently per-position or per-state. NOT subject to cascade-fold default+override at the block-attr level. They stay as CSS rules attached to the parent (CSS targets specific children via position/state at runtime). No per-child override attr needed; the cascade lives at the CSS layer.
- **Implementation note for F2:** Skip pseudo-class rules during the per-property hoist analysis. They get routed via the existing CSS router (Destinations 0/1/2).

### L14 — Property dependencies during cascade-fold (e.g. `flex-direction` + `align-items`)
- **Source:** Edge case from cascade-fold design discussion
- **Rule:** Some CSS properties only make sense paired. If `flex-direction: column` hoists to parent default but `align-items: flex-start` doesn't (because one child has `align-items: center`), the cascade can produce unexpected combinations.
- **Implementation note for F2:** Define small co-occurrence sets (`flex-direction` + `align-items`; `grid-template-columns` + `grid-auto-flow`; `position` + offset properties). Hoist as atomic units when co-occurring in a sibling group.

---

## Section M — UPDATED INVESTIGATION ORDER (expanded with Sections J-L)

Goal restatement: per-section + whole-page ≤1% pixel-diff across 375/768/1440, irrespective of content. Body pipeline only this phase (header/footer parked).

### Phase A — Empirical grounding (no code; ~30-60 min)
1. **Read latest pipeline-state `extract.json`** for brand boundary — brand IS emitting `sgs/quote` (Bean confirmed); the open question is whether `body[]` is still empty post-D70/D71. Cite the actual field state.
2. **Read latest pipeline-state `trace.jsonl`** — count current `inner_blocks_no_children` traces per slug. Compare to R3-A's 11 count.
3. **Run `python sgs-db.py sql "SELECT slug, status, type FROM blocks WHERE slug IN ('sgs/trust-bar', 'sgs/featured-product', 'sgs/brand', 'sgs/ingredients-section', 'sgs/gift-section', 'sgs/social-proof', 'sgs/heritage-strip', 'sgs/quote', 'sgs/label')"`** — per-slug classification for G4.
4. **Read `_absorb_transparent_wrappers` + `_lift_inner_blocks` + `composite_element` + `essence_match_variation` + FR1 fast-path end-to-end** (per blub.db row 285). State the universal-nesting primitive in plain English BEFORE proposing F1 insertion shape.
5. **Read `convert_page.py:198`** — confirm K10 (`extracted_attributes: {}` hardcode still present).
6. **Re-run `/sgs-clone` on Mama's homepage** with `--debug-trace` to refresh artefacts. Capture Stage 11 pixel-diff per-section per-viewport baseline.
7. **Investigate K6 ingredients +22.4pp 1440 regression** — diff `pipeline-state/<latest>/pixel-diff/section.sgs-ingredients-1440x900/` against mockup. Hypothesis A/B/C from K6.

### Phase B — Bean sign-off on architectural decisions (~5-10 min)
8. **G1 α/β** — confirm β (staged migration).
9. **F1 insertion shape** — confirm (i) inside `_lift_inner_blocks` / (ii) at each callsite / (iii) outer-helper wrapper.
10. **G2 cascade-fold threshold** — confirm 50% majority / ≥N-1 / unanimous.
11. **G4 retired-slug strategy** — confirm "trust universal-nesting fallback to handle all; no per-slug audit gating".
12. **L4 className preservation** — confirm emitted nested blocks carry mockup className via `additionalClasses` / `className`.

### Phase C — Ship F1 universal-nesting fallback (one tight commit, /qc-council gated, ~50-80 LOC)
13. **F1 walker fallback** — when `_lift_inner_blocks` returns empty (DB query returns nothing OR items array empty), walk direct child div descendants of the BEM block-root; emit each as nested block carrying className.
14. **A3 atomic_button CSS lift** (~2 LOC) — bundle.
15. **C1 bare-except → _trace** (~4 LOC) — bundle.
16. **E3 + E4 dead-code cleanup** (trivial) — bundle.
17. **K19 RETIRED_BLOCK_REMAP guard** — drop the heritage-strip remap or invert priority (~5 LOC) — bundle.
18. **Pre-commit /qc-council** (binding row 255) — multi-rater verification on F1 shape + bundled changes. Predicted outcome: 5+ of 8 brand/featured-product/ingredients/gift-section/social-proof sections drop measurably; trust-bar drops most; no regression in FR1-confidence-1.0 sections (hero stays at conf 1.0).
19. **Ship commit + measure** — Stage 11 per-section + 3 viewports. Cite empirical numbers.

### Phase D — A4 brand sgs/quote body[] extraction fix (separate commit)
20. **Trace why brand sgs/quote emits empty body[]** — likely in `_lift_inner_block_attrs` for sgs/quote OR upstream BEM-rename interaction.
21. **Fix + /qc-council + ship + measure.**

### Phase E — F2 N-wrapper cascade-fold (separate commit, ~80-100 LOC)
22. **Read `_absorb_transparent_wrappers` insertion point** at convert.py:3886 (hard gate).
23. **Implement `_hoist_n_wrapper_cascade(section_root, direct_children, css_rules)`** — per-property cascade hoist per G2 threshold; L12 modifier-class override detection; L13 pseudo-class skip; L14 property-dependency atomic hoisting.
24. **Replace hard gate at 3886** with conditional branch (1-child → existing path; N≥2 → new function).
25. **Pre-commit /qc-council + ship + measure.**

### Phase F — DB-first cleanups (one focused commit, ~50-60 LOC + DB seeds)
26. B1 — enum_vals → block_attributes.enum_values lookup.
27. B2 — VARIANT_MODIFIERS → modifier_suffixes per-block.
28. B3 — badge→pill-wrap → slot_synonyms.default_variant column.
29. B4 — _ABSORB_GAP_PROPS → property_suffixes flags.
30. B5 — _infer_role → read kind from property_suffixes row.
31. B7 — per-block _lift_inner_block_attrs branches (may already be dead after F1).
32. K13 — _CORE_BLOCK_STYLE_MAP → DB.
33. K12 — `_BREAKPOINT_SUFFIXES` → DB.
34. K9 — drop `if block_slug == "sgs/hero"` + `"sgs/heritage-strip"` guards in lift_subtree (heritage-strip is retired; sgs/hero handled by F1).

### Phase G — Coverage metric extensions (separate session if needed)
35. K16 — coverage matcher walks nested style.* dicts.
36. K14 — parent-qualified tag selectors accepted by SGS-class guard.
37. K15 — pure tag selectors with ancestor-chain context.

### Phase H — Spec amendments (doc-only commit)
38. D1 — document sgs_bem_wrapper as §FR3.1 named exception (or deprecate per β).
39. D2 — document composite_element + the two-path absorb architecture (1-child + N-child) in §15.
40. L1 — document recognition-side vs emit-side composition distinction.
41. L2 — populate `patterns.block_composition` + `patterns.fingerprint` columns.

### Phase I — Render.php migrations (per-block, separate commits each, β path)
42. **sgs/quote** — migrate render.php from `$attributes['body'][]` to `$content` (InnerBlocks). Add deprecated.js migration. Drop composite_element flatten path for sgs/quote.
43. **sgs/label** — same shape.
44. **sgs/info-box** — partial migration (button slot already uses $content; heading/description/media stay as scalar attrs per R3-C "safe IF rewrite preserves scalar attrs").
45. **After migrations:** consider full composite_element retirement per E2.

### Phase J — Latent / cosmetic / consolidation
46. A5 D1 attr_path BEM-element encoding (when comma-selector A6 forces touching same code).
47. A6 comma-selector split.
48. A7 essence_match scalar-attr guard (cosmetic).
49. E1 emit_text_node helper for atomic_paragraph + atomic_text_fallback only (~22 LOC, anchor scoping verified).
50. K17 measurement-context parity — standalone-page renderer OR identical-wrapper mode for fair pixel-diff baselining.

### Phase K — Future-proofing / robustness
51. K1-K2 — confirm F1 closes G1+G3+G5 wiring gap holistically.
52. K7 — section-collapses-into-leaf-block guard.
53. K8 — responsive variant render.php audits (per-block).
54. K11 — pack-size pills render.php investigation.
55. K18 — empty-DB defensive assertion.
56. K6 — ingredients 1440 regression root-cause (separately or as part of F2 ship measure).

---

## Section N — RISK REGISTER (what could go wrong)

### N1 — F1 over-fires on FR1-matched composite sections that don't need fallback
- **Risk:** When a section FR1-matches a registered composite block (e.g. sgs/hero) AND DB parent_block rows exist, the fallback shouldn't fire. If the empty-array check is too liberal, hero CTAs could double-emit.
- **Mitigation:** Guard the fallback with `if not _lift_inner_blocks_returned_nonempty AND not _scalar_lifted_anything`. Test on hero specifically — hero CTAs already work via DB parent_block; fallback should be no-op.

### N2 — F1 emits malformed blocks when direct child divs aren't valid block roots
- **Risk:** Some mockup div descendants are styling wrappers (e.g. `<div class="row">`, `<div class="inner-wrap">`) that shouldn't emit as their own blocks.
- **Mitigation:** The walker already runs recursively per existing branches. The fallback's direct-child walk should call back into the universal walker (FR2 atomic-tag emit; FR3 pass-through wrapper; cascade-fold parent-default hoist) — not naively emit `sgs/container` per direct child.

### N3 — F2 cascade-fold property-dependency edge cases drop intentional bespoke detail (per L5)
- **Risk:** Aggressive hoisting could quantise a column with bespoke spacing to match its siblings.
- **Mitigation:** Per L5, when value diverges from sibling-majority by more than `delta_threshold` (TBD per property type), keep on child as override — don't snap.

### N4 — sgs/quote + sgs/label render.php migration breaks already-published pages
- **Risk:** β path requires render.php changes. Existing pages relying on scalar attrs would render blank during migration window.
- **Mitigation:** Deprecated.js editor-side migration runs on every block edit; reads scalar attrs, writes InnerBlocks shape. Live pages render correctly because deprecated.js fixes the editor save; until then, render.php reads BOTH shapes (scalar attrs as fallback when $content is empty).

### N5 — DROPPED post Bean's 2026-05-25 correction
- **Original risk (now retracted):** "Measurement contamination (K17) hides F1's real impact."
- **Why dropped:** Bean's empirical disproof — hero already at ≤1% × 3 viewports proves no inherent measurement-context floor. If brand stays at 30% post-F1, the cause is converter-quality bugs (CSS not attributed to direct owner per P18; empty `body[]` per A4; etc.), not measurement context. K17 stays in the register as a re-framed converter-quality investigation (see K17 revision), not as a prerequisite risk.
- **Mitigation:** Compare to hero as the empirical reference (L15). Every per-section gap measured post-F1 traces to a specific concrete bug, not a noise floor.

### N6 — Council fix-shape regression per J4
- **Risk:** Treating any rec in this register as an accepted spec without empirical validation between waves.
- **Mitigation:** Per blub.db row 276 — write predicted numeric outcome before each commit; run smallest pipeline slice that produces that number; if prediction holds without fix, re-investigate.

---

## Section O — TOTAL ISSUE INVENTORY (summary count)

| Section | Issue count | Domain |
|---|---|---|
| A | 7 | Confirmed defects (1 contested, 1 disproved, 1 latent) |
| B | 7 | DB-first violations |
| C | 2 | Observability gaps |
| D | 2 | Spec gaps |
| E | 4 | Consolidation opportunities |
| F | 3 | Structural primitives (universal mechanisms) |
| G | 4 | Architectural decisions |
| J | 6 | Methodology lessons (process) |
| K | 19 | Adjacent body-pipeline parking entries |
| L | 14 | Auxiliary architectural notes |
| N | 6 | Risk register |
| P | 14 | Bean's design principles + binding constraints |
| **Total distinct items** | **~88** | (excluding section headers + section O) |

Coverage: 88 items spanning council findings (Sections A-G), process lessons (J), adjacent body-pipeline parking (K), auxiliary architectural notes (L), risk register (N), and **Bean's design principles + binding constraints (P)** that gate every proposed solution.

---

## Open questions — RECONCILED with prior-session answers

Most of my 10 Qs from the previous draft were already answered in the prior session (entries 75–1566) or in Bean's 2026-05-25 corrections. Citations below.

### ANSWERED — Q1 G1 α/β → β confirmed
- **Evidence:** Bean's choice of Option 2 over Option 1 for trust-bar (USER #21, entry 944: just *"2"*) — Option 2 was "build like the rest of the sections via cloning pipeline" = universal-nesting; Option 1 was specialised block. This was β-shaped at the decision point.
- **P17 (USER #22):** *"The pipeline has to achieve the 1%pixel diffs based on its Deterministic universal script"* — universal/deterministic = β.
- **P15 (USER #14):** *"All div classes are blocks but just some are nested inside others"* — β in operator language.
- **P7 (USER #37):** empty-array walks direct child div descendants — β fallback verbatim.
- **VERDICT:** β confirmed. No further sign-off needed; this is now treated as a binding decision.

### ANSWERED — Q3 G2 cascade-fold threshold → 50% provisionally accepted; refined per P6 to "per-property"
- **Evidence (USER #33, entry 1306):** Bean's *"A yes"* approved my Option A which included the 50% threshold framing.
- **Refinement from P5+P6:** Threshold isn't binary — it's per-property. For each CSS property: if a value is shared by majority of siblings → hoist as parent default; divergent siblings carry their value as override on the specific child.
- **VERDICT:** 50% majority per-property accepted. Edge cases (L12 modifier-class override + L13 pseudo-class skip + L14 property-dependency atomic hoist) are implementation details I'll surface inline rather than gate on now.

### ANSWERED — Q4 className preservation → confirmed
- **Evidence:** Bean's *"I'm very happy we have this common understanding now"* (USER #30, entry 1236) after the cascade-fold exchange in which I stated *"Each wrapper still emits as a sgs/container block carrying className + its unique inner content"* and *"Wrapper blocks always exist (preserve className for CSS targeting)"*.
- **VERDICT:** Confirmed. F1+F2 implementations carry mockup className via `additionalClasses` / `className`.

### ANSWERED — Q5 acceptance criterion → per-section ≤1% × 3 viewports ONLY (whole-page parked with header/footer)
- **Evidence:** Bean 2026-05-25 verbatim: *"Full page is not a condition because I'm still building the tool and it needs to be able to prove itself before I can try to tackle a whole page, also as I mentioned, the whole page wouldn't work because the cloning for headers and footers is parked."*
- **VERDICT:** P9 corrected. Gate = per-section ≤1% × 3 viewports during build phase. Whole-page acceptance re-opens after header/footer cloner ships AND body pipeline consistently passes per-section gate.

### ANSWERED — Q6 retired-slug strategy → trust universal-nesting fallback uniformly
- **Evidence:** P1 *"universally-applicable mechanisms"* + P15 *"all div classes are blocks"* + P7 walk-direct-children fallback — all imply uniform handling, NOT per-slug audit.
- **Side-benefit:** Hero already proves the architecture works (L15) when DB-graph + lift align; F1 extends that structurally to non-hero sections. No per-slug classification needed.
- **VERDICT:** No per-slug audit. F1 handles all unregistered section slugs uniformly. The Stage 2 fall-through to `sgs/container` at confidence 0.0 is the CORRECT path — the diagnostic message "seed parent_block" is misleading and should be ignored.

### ANSWERED — Q7 K17 sequencing → DROPPED as a prerequisite (re-framed as concrete bugs to investigate post-F1)
- **Evidence:** Bean 2026-05-25 verbatim: *"that dom wrapper stuff is BS, HTML, CSS and JS work the exact same way even if it's based in PHP and with different coding conventions etc. It does cleanly translate over."*
- **Empirical disproof of "noise floor" claim:** Hero at ≤1% × 3 viewports.
- **VERDICT:** K17 re-framed as converter-quality bugs (P18 direct-owner-attribution failure). Investigate post-F1 if brand stays high. NOT a prerequisite for F1 ship.

### ANSWERED — Q8 Phase A empirical grounding → proceed now (implicit yes)
- **Evidence:** Bean's standard mode (entry 75 "Do option A but also read the relevant spec docs"; entry 1267 "Please read the spec doc and pipeline docs on the css extraction rules and then try to find how it is implemented in the pipeline flow scripts") — read-before-propose is Bean's default expectation.
- **VERDICT:** Proceed with Phase A.

### ANSWERED — Q9 render.php migration shape → staged β with dual-shape during transition
- **Evidence:** P17 (block-functionality extension allowed) + P22 (sgs/multi-button precedent with InnerBlocks via $content + scalar attrs as deprecated.js fallback) — exact same pattern.
- **VERDICT:** Migrate sgs/quote then sgs/label one block at a time. Each: (a) edit render.php to read InnerBlocks via $content as primary, scalar attrs as fallback; (b) ship deprecated.js editor migration; (c) drop scalar attrs after transition window. Per Phase I in investigation order.

### REMAINING OPEN — Q2 F1 insertion shape: WITHDRAWN; needs Phase A code read (per P26)
**Withdrew (i) recommendation 2026-05-25.** Per Bean's P26 ("Don't agree, disagree, or propose without evidence. Find it first."), proposing (i) on architectural reasoning alone violates the discipline.

**What changes:** I need to read convert.py end-to-end for:
- `_lift_inner_blocks` (signature, callers, return shape, existing trace points)
- `composite_element` branch (current empty-array behaviour, what it does after `_lift_inner_blocks` returns)
- `essence_match_variation` branch (same)
- FR1 fast-path block-root branch (same)
- The hero cheats (lines 3557-3608) — to understand which behaviours they're emulating that the universal mechanism needs to replicate
- `ARRAY_LIFT_PATTERNS` extraction (lines 1008-1030) — same

Then return with an evidence-grounded answer: "given that `_lift_inner_blocks` at line X has Y callers each of which Z, the right insertion point is [shape] because [code evidence]". Phase A step 4 work.

**Status:** Pending Phase A read. Not a Bean sign-off question — a Claude do-the-work question.

### ANSWERED — Q10 Section P + J correctness check
- **Evidence:** Bean's 2026-05-25 message expanded Section P from 14 to 25 principles (P1-P25) and corrected P9 + K17 + N5 framings. Sections P and J reflect Bean's actual design contributions.
- **VERDICT:** Section P + J ratified by Bean's corrective feedback loop.
