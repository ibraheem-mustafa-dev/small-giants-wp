---
doc_type: spec
spec_id: 22
spec_version: 1.0
project: small-giants-wp
title: SGS Cloning Pipeline (Universal Block-Equivalent Extraction)
status: active
status_note: |
  RATIFIED 2026-05-26 v1.0 — status flipped from draft → active per §16 gate.
  All 4 ratification boxes ticked: Commit 0.0 cross-doc sync landed (31 files);
  Bean sign-off received; /docscore A 100% on 22 of 22 scored docs (2 custom
  doc_types unscored — plan.md `master-plan`, cloning-pipeline-flow.md
  `visual-reference`); council findings table §15 all addressed/dropped/recalibrated.
  Spec 16 retired + archived. Phase 1 plan at
  `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`.
  Phase 1 acceptance gate softened to ≤5% per-section × 3 viewports; Phase 1.5
  stretch goal ≤1%. Spec 16 retires in full. Status-flip to active is gated
  on Commit 0.0 (cross-doc sync) completing AND Bean ratification.
session_date: 2026-05-26
authors: Bean + Claude (Opus 4.7)
supersedes: 16-DETERMINISTIC-CONVERTER-V2.md
companion_specs:
  - 00-naming-conventions.md (BEM canonical signal — Spec 00 §3.1 is foundational)
  - 02-SGS-BLOCKS.md (block library; render.php migration template)
  - 20-STRUCTURED-PIPELINE-LOG-SURFACING.md (Stage 9c logging)
  - 21-PIPELINE-STATE-ARTEFACTS.md (artefact catalogue; updated by Commit 1.4)
acceptance_criterion: |
  Phase 1 (this spec's primary delivery): per-section pixel-diff ≤5% across 3 viewports
  (375 / 768 / 1440) for every body section, measured via Stage 11. Bean visual sign-off
  is co-authoritative — script measurement + visual cropped-pair are BOTH consulted.
  Phase 1.5 (stretch goal, follow-on): bridge the residual ~4pp to ≤1% per section via
  noise-floor diagnosis (vertical-anchor fix on pixel-diff.py, chrome cropping, font-load
  timing, theme.json-token vs inline-value cascade resolution).
gap_analysis_council:
  v0.2_review_date: 2026-05-26
  raters: Architectural Purist, Spec Checker, Pragmatic Engineer, Risk Auditor
  findings_total: 48
  findings_addressed_in_v0_3: 33 valid + 10 partial-recalibrated
  findings_dropped: 5 (category errors — functions-don't-exist critiques against a build-spec)
---

# Spec 22 — SGS Cloning Pipeline (Universal Block-Equivalent Extraction)

> **2026-05-30 D107/D108/D109/D110/D111 update** — Voter tier-driven recognition + block_composition data layer landed; XS-3 walker consumption code reverted (deferred).
> - **D107** — `blocks.tier` column added (TEXT CHECK in 'block','class-section','pattern'; DEFAULT 'block'). Sourced from `supports.sgs.is_section_root: true` flag in block.json; populated by /sgs-update Stage 1. 2 rows currently 'class-section': sgs/hero + sgs/cta-section. Voter (`per-section-convention-voter.py:295-305`) rewritten — literal-slug-match short-circuit REMOVED; voter now queries `blocks.tier='class-section'` via `is_class_section_block(slug)` helper in `db_lookup`. Section-root sgs- classes return at confidence 1.0; all other sgs- classes return gap-candidate (Stage 2 FR-22-4 default → sgs/container). See new §FR-22-16.
> - **D108** — `block_composition` table CREATED. PK `block_slug`. Columns: `wraps_block` (TEXT), `composition_role` (CHECK in 'section-root'|'wrapper-shell'|'content-block'|'leaf'), `has_inner_blocks` (INT), `accepts_allowed_blocks` (TEXT JSON). 188 rows populated (one per registered block). Initial composition_role distribution: 2 section-root, 1 wrapper-shell, 165 content-block, 20 leaf. 15 blocks have has_inner_blocks=1. `wraps_block='sgs/container'` for 4 blocks: sgs/hero, sgs/cta-section, sgs/modal, sgs/quote. **Walker consumption code DEFERRED** (see D109 / §FR-22-17).
> - **D109** — XS-3 walker consumption code (commit f173b351) REVERTED at commit c76aa107. Regression: +13.07pp on featured-product + +10.40pp on social-proof. Refined trigger queued at parking entry **P-XS-3-TRIGGER-REFINEMENT**. Per R-22-3, the refined trigger MUST land as an FR-22-4 container-default refinement, NOT a 4th walker exception.
> - **D110** — `assign-canonical.py` D99 port: all `slot_synonyms` references migrated to `slots WHERE scope='element'` + `roles` table. Batch backfill executed. `block_attributes.canonical_slot` coverage 52/2074 (2.5%) → **659/2074 (31.8%)**. `block_attributes.role` coverage 110/2074 (5.3%) → **676/2074 (32.6%)**.
> - **D111** — `slots` at scope='section': 16 → **4 rows** (12 wrong/dead rows DELETED). Remaining: core/group, hero, cta, cta-section. `slots` at scope='element': 89 → **91 rows** (testimonial + testimonial-slider re-inserted; `inner` passthrough slot added with standalone_block=NULL — walker consumption reverted but slot row persists for future re-wiring).
>
> **2026-05-29 D99 architectural cleanup** — DATA LAYER CHANGES. Throughout this document, prior references to `slot_synonyms` (table) describe the PRE-D99 architecture. POST-D99 the table is RETIRED — its element-scope rows live in `slots WHERE scope='element'` (composite PK on `(slot_name, scope)`); `legacy_role_lookup` similarly retired into `slots WHERE scope='section'`. `slot_synonyms.role_classification` column retired into new `roles` table (per-role catalogue, seeded by `_migrate_roles_table()` via INSERT OR REPLACE from `_ROLE_CLASSIFICATION_MAP` Python dict — fixes link-href content-bearing gap). Walker function `_slot_synonyms()` retained as name but queries `slots WHERE scope='element'` internally. Read `slot_synonyms` references below as describing the LOGICAL concept (per-slot routing data); the PHYSICAL home is `slots` table. See §4 data layer for the current table inventory; see decisions.md D99 + this document's §FR-22-2.2 amendment + Spec 22 §4 data-layer rows for full migration detail.

## 0. Purpose

Replace the layered Spec 16 architecture with a single universal extraction path inside the cloning pipeline. Every BEM-class div in any mockup becomes its own emitted WP block, nested where the mockup nests it, with CSS attributed to its direct owner. The DB has all the metadata needed; the converter just consults it consistently.

**Plain English statement of the architecture:** read each div's BEM class, look up which SGS block it equates to in the database, emit that block, recurse into its children. Three precisely-enumerated exceptions are permitted (atomic-tag swap, top-level chrome skip, top-level container wrap — see FR-22-3). No others. Same code for sgs/hero, sgs/product-card, sgs/quote, sgs/text, sgs/media, every BEM-class div in any mockup.

This spec covers the whole pipeline — Stage 4 (the converter) is the main rewrite; every other stage is documented for the impact (preserved / adjusted / dissolved) Spec 22 has on it. There is no follow-up "orchestrator spec" — Spec 22 is comprehensive.

## 1. Why Spec 16 retires

Spec 16 layered multiple recognition / consumption paths over time (FR1 + FR2 + FR3 + FR4 + lift_subtree + F1 + 9 walk() branches + ARRAY_LIFT_PATTERNS + ATOMIC_TAG_MAP). The 2026-05-26 diagnostic chain (commit `c9b058a7` and prior) proved that:

1. **The DB already holds the complete mapping** — `slot_synonyms.standalone_block` documents every BEM-canonical-slot to block relationship. `block_attributes.canonical_slot` is the converter-side hook (currently 54.1% NULL across all 2,246 rows; `/sgs-update assign-canonical.py` extension is the backfill mechanism per FR-22-2.1).
2. **`lift_subtree_into_block_attrs` and F1 are the same goal, executed twice, incompletely.** Path A consumes descendants into scalar attrs; F1 walks the same descendants into InnerBlocks. They double-render when a block has overlapping content attrs (sgs/product-card post-F1: 8569 chars vs pre-F1 2303 chars — 3.7× explosion measured 2026-05-26).
3. **The "container-shaped composite block" classification was abandoned** in Spec 16 (parking entry `P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES` deferred because no DB column cleanly identified the class). Spec 22 reframes honestly: the classification IS reintroduced as "hybrid block" (FR-22-6) but the criterion is now DB-derivable via `equivalent_block_for()` returning non-NULL for ≥1 attr. The renaming is acknowledged, not denied (per council finding F-AP-3).
4. **D72 (sgs/trust-bar retirement) is the proof-of-concept** for the universal-nesting direction — replacing the hardcoded composite with universal-nesting via `slot_synonyms.standalone_block` dropped trust-bar pixel-diff −50.4pp / −27pp / −66.9pp at three viewports (absolute best-ever: 37.0 / 24.6 / 33.1% — NOT ≤1%; the proof is directional, not absolute).
5. **The hero-clone-poc page (page 29, /hero-clone-poc/) is the visual proof-of-concept** for ≤5% achievability. Hero content matches mockup visually (Bean's eye + cropped-pair comparison artefact); pixel-diff reports 54.5% due to a 60px vertical body-anchor offset between the SGS chrome environment and the standalone mockup file — a measurement artefact, not visual divergence. Phase 1.5 fixes the measurement methodology.

Spec 16 retires in full. The architectural rules R5 (CSS-drives-emission), FR6 four-destination CSS router, and FR7 visual-QA verification migrate into this spec. Everything else in Spec 16 (FR1 fast path, lift_subtree, ARRAY_LIFT_PATTERNS, hardcoded ATOMIC_TAG_MAP, the 9-branch walk(), the FR1-vs-normal-route distinction) is deleted.

## 2. The architecture (functional contract, not pseudocode)

The universal walker is one function called per DOM Tag. Its **input/output contract** is:

| Input | Output |
|---|---|
| A DOM Tag node, the css_rules buffer, recursion depth, `is_top_level` flag | A single WP block markup string, OR `None` if the node was pass-through (its children's emit was bubbled up to the parent's InnerBlocks list) |

**The walker's behaviour is fully determined by the node's class list + the DB.** No conditional based on block slug. No "if this then that" per block type. Per-block behaviour comes from DB rows (block_attributes, slot_synonyms, block_supports), not from code branches.

The walker has **exactly three permitted exceptions** to the universal path (per FR-22-3 — no others may be added without a spec amendment):

1. **Atomic-tag swap** — when the node has zero SGS classes AND its tag is in the DB-driven atomic-tag map, emit the mapped block directly (`<p>` to core/paragraph or sgs/text per the DB's resolution algorithm).
2. **Chrome skip at top level** — when `is_top_level=True` AND the node tag is in `SKIP_TOP_LEVEL_TAGS` (header / footer / nav), return `None` with a chrome-skip trace event.
3. **Top-level container wrap** — when `is_top_level=True` AND the resolved block slug is not already `sgs/container`, wrap the emit in `sgs/container` (per architecture decision #4).

These three exceptions are exhaustive and bounded. Spec 22 ratification commits to "the walker has exactly 3 named exceptions; addition of a 4th requires a spec amendment with empirical justification." The implementation pseudocode lives in §13 (Appendix A) — moved out of the FR body per F-SC-8.

## 3. Functional requirements

### FR-22-1 — BEM is the only recognition signal

Walker reads `class` attribute, parses each class via `db.parse_sgs_bem()`, resolves block slug via:

| Input class shape | Lookup | Result |
|---|---|---|
| `sgs-<block>` (block root) | direct slug formation: `sgs/<block>` | sgs/<block> emit |
| `sgs-<block>__<element>` | `slot_synonyms.aliases` contains `<element>` to `standalone_block` | the resolved standalone block emit |
| `sgs-<block>__<element>--<modifier>` | as above + modifier goes onto emitted block as `variantStyle` or className modifier | as above + variant attribution |
| Non-`sgs-` class on a child div | walked through (pass-through; see FR-22-11); class preserved on the nearest emitted ancestor block | structural transparent wrapper |
| **Multiple SGS block-root classes on one node** | Resolved via `_pick_primary_sgs_block(sgs_classes)` tiebreaker (existing function in convert.py). The first SGS block-root class wins; subsequent SGS block-root classes are preserved as additional className entries on the emitted block. | Single block emit + className list |

HTML tag is **rendering-shape only** (per Spec 00 §3.1), never used for recognition. `<div class="sgs-X__quote">` and `<blockquote class="sgs-X__quote">` resolve identically to sgs/quote.

**No hardcoded class-to-block dicts.** The walker queries `slot_synonyms` + `block_attributes` + `blocks` at runtime via the unified `wp-blocks.py` CLI (FR-22-8). Per binding rule blub.db row 260 (db-first-no-hardcoded-dicts).

**PASS test:** for every emitted block in extract.json, the block slug is derivable from the source node's SGS classes via the DB tables named above. No emitted block has a slug that required a Python conditional referencing the slug name.
**FAIL test:** any block whose emit path includes a Python `if slug == 'sgs/X'` or `elif slug == 'sgs/Y'` block-slug-typed conditional.

### FR-22-2 — Block-equivalent attrs become child blocks; only behavioural attrs become scalar

Every `block_attributes` row's "equivalent_block" status is derived at query time via `db_lookup.equivalent_block_for(block_slug, attr_name)`. The function returns a slug (e.g. `sgs/text`) when the attr's slot is block-equivalent, OR `None` when the attr is genuinely scalar (behaviour/enum/identity/metadata).

| Returned equivalent_block | Walker behaviour |
|---|---|
| **NOT NULL** | Skip the attr (do NOT lift content into it). The descendant matching this attr's `canonical_slot` is emitted as an InnerBlock of the resolved equivalent_block type. |
| **NULL** | Lift the value into the scalar attr per the existing role/derived_selector logic. |

**PASS test:** for every product-card emission in extract.json post-Spec-22, `image`/`description`/`productName`/`packSizes` slots are emitted as child InnerBlocks (sgs/media, sgs/text, sgs/heading, sgs/button) — NOT as scalar attrs on the parent product-card block. `variantStyle` and `trialTag` remain as scalar attrs.
**FAIL test:** any extract.json entry where `description` appears both as a parent attr AND as a child sgs/text block (the double-render).

#### FR-22-2.1 — Two-tier derivation for `equivalent_block_for()` (implementation reference)

The derivation function lives in `converter_v2/db_lookup.py`. Two tiers, in order:

1. **Tier A — Direct join.** `block_attributes.canonical_slot` IS NOT NULL → join `slot_synonyms` → return `standalone_block`.
2. **Tier B — BEM-element from derived_selector.** When canonical_slot is NULL but `derived_selector` is set (e.g. `.sgs-product-card__image`), extract the BEM element (`image`), match against `slot_synonyms.aliases` (JSON-decoded), return the matching `standalone_block`.

**Tier C deleted 2026-05-27** per D85 / qc-council Rater B verdict (Bean directive). Re-introduction is gated on parking entry `P-SGS-UPDATE-ROLE-DETECTION-IMPROVE` generating real Tier C inputs — at which point the path will be re-added with empirical evidence backing it. See §15 F-AP-2 / F-SC-11 / F-PE-5 (all RESOLVED via deletion).

**Empirical DB state (2026-05-30 update per D110):** canonical_slot coverage rose from 52/2074 (2.5%) to **659/2074 (31.8%)** via the D99-ported `assign-canonical.py` batch backfill; `role` coverage rose from 110/2074 (5.3%) to **676/2074 (32.6%)**. The pre-D110 figures below describe the historical state at Phase 0.1 close; ratios held (Tier A active for the populated rows, Tier B candidates for the rest, behavioural rows correctly NULL by design).

**Empirical DB state (2026-05-27, scope-corrected — supersedes earlier "1,214 NULL rows to backfill" framing):** of 2,246 block_attributes rows:
- 1,032 (46%) have `canonical_slot` populated → Tier A active.
- 72 (3%) have `canonical_slot` NULL but `derived_selector` set → Tier B candidates (the actual backfill scope).
- 1,142 (51%) are triple-NULL (canonical_slot + derived_selector + role all NULL). These are **correctly NULL by design** — behavioural / sizing / styling / enum / identity attrs (e.g. `back-to-top.position`, `reading-progress.wpm`, `icon.size`). The `block_attributes` table catalogues every block × every attr; `canonical_slot` is sparsely populated by intent, NOT a sign of missing data. They are **NOT backfill targets**. Forcing canonical_slot onto them would mass-corrupt the FR-22-2.2 role-exclusion guarantee.

(Previously a third bucket — rows with canonical_slot NULL + derived_selector NULL + role set — would have been Tier C derivation candidates. Empirically 0 rows in the current DB; Tier C deleted 2026-05-27 per D85. Re-introduction gated on `P-SGS-UPDATE-ROLE-DETECTION-IMPROVE`.)

`/sgs-update assign-canonical.py` extension under Spec 22 Phase 0.1 is scope-locked to the ≤72 Tier B candidates. Script guardrail per D84: MUST refuse to operate on any row where `derived_selector IS NULL`. Long-term Tier B usage drives toward zero as canonical_slot is populated via the dry-run-then-review cycle.

#### FR-22-2.2 — Role-exclusion rule (the "typography looks like heading" trap)

Not every attr whose `canonical_slot` joins to a `standalone_block` is content-bearing. `sgs/hero` has 134 attrs that join via canonical_slot to a standalone_block — but most are typography/spacing/colour attrs on the `heading` canonical slot (e.g. `headlineFontSizeDesktop` has canonical_slot=`heading` because it styles the heading, NOT because the operator should drop a sgs/heading block there).

The role-exclusion rule: `equivalent_block_for()` returns the slug ONLY when the attr's role is classified `content-bearing` on `slot_synonyms.role_classification` (DB-driven positive allowlist; D85 2026-05-27 — see §4 data layer):

Content-bearing roles (return slug): text-content, image-object, content, link-href, identity.

Styling/behaviour roles (return NULL even if canonical_slot joins): typography, color, colour-gradient, colour-text, spacing-token, number-css-px, number-css-percent, layout, motion, visual, behaviour, boolean-visibility, select-from-enum, enum-class-probe, query-descriptor.

Per R-22-1 the classification is NOT a hardcoded Python frozenset — it lives in the `roles` table (DB-driven via idempotent `INSERT OR REPLACE` migration from `_ROLE_CLASSIFICATION_MAP` seed dict in `db_lookup.py`). `slot_synonyms.role_classification` column **retired 2026-05-29 D99** — the column was incapable of seeding `link-href` because no `slot_synonyms` row had `role='link-href'`, causing `_content_bearing_roles()` to return 4 instead of 5. The `roles` table (20 rows) fixes this: classification is defined by role name directly, not derived from slot-row role values.

This shrinks the "hybrid block" set from the raw block count down to a true-content-bearing set. **Phase 0.4 audit (2026-05-27 commit `de300eb2`) surfaced the actual count: 61 hybrid blocks across 77 SGS audited (1,740 attrs scanned). Earlier "8-15" estimate was a guess at high-content-composite count only; the canonical FR-22-6 criterion (≥1 content-bearing attr after role-exclusion) captures the wider truth.** Roster at `.claude/reports/2026-05-27-hybrid-block-roster.md`. Phase 2 prioritises by hybrid_attr_count descending.

**PASS test:** `equivalent_block_for('sgs/hero', 'headlineFontSizeDesktop')` returns NULL (typography role, not content).
**FAIL test:** `equivalent_block_for('sgs/product-card', 'description')` returns NULL (should return sgs/text — text-content role).

#### FR-22-2.3 — (RETIRED 2026-05-27, D85) — Tier C role-to-block derivation

**Status:** RETIRED. Earlier drafts proposed a third derivation tier (role-to-dominant-block via `slot_synonyms.role + standalone_block` query) for use when both `canonical_slot` and `derived_selector` were NULL on a `block_attributes` row. Empirically there are 0 such rows in the current DB; the path was dormant on ship. Per qc-council Rater B (2026-05-27) and Bean directive, Tier C is deleted from the codebase rather than shipped dormant — R-22-7 (council fix-shapes are hypotheses, not specs) applied to the original proposal: there were no empirical inputs to validate the dominance heuristic against. Re-introduction is gated on `P-SGS-UPDATE-ROLE-DETECTION-IMPROVE` generating real Tier C inputs, at which point a fresh spec amendment will re-add the path with measurement evidence.

Adding a new role-to-block relationship is achieved by adding rows to `slot_synonyms` and populating `canonical_slot` on the relevant `block_attributes` rows (Tier A) or `derived_selector` (Tier B). No new DB table required.

#### FR-22-2.4 — Unresolved attr handling

When all three derivation tiers return NULL AND the attr is in the content-bearing role set, the walker:
1. Emits the parent block WITHOUT the slot's content as either child block or scalar attr.
2. Logs to `pipeline-state/<run>/unresolved_equivalent_block.log` with: `(block_slug, attr_name, derived_selector, role, source_node_class)`.
3. Operator fix path: add canonical_slot to DB via `/sgs-update assign-canonical.py` (existing mechanism) OR add fingerprint row to `tools/recogniser/data/fingerprints.json` (existing mechanism).

This log is registered in Spec 21 artefact catalogue (cross-doc impact list §8 — Spec 21 update is Commit 1.4).

#### FR-22-2.5 — Array-of-objects resolution (replaces ARRAY_LIFT_PATTERNS)

For array-typed attrs (e.g. `packSizes`, `testimonials`, `badges` — block_attributes.attr_type = 'array'), the walker treats EACH item as a separate slot. The resolution path:

1. If the parent block's attr has `canonical_slot` populated → that's the array slot's content type (e.g. `packSizes` canonical_slot=`button` → each item is a sgs/button).
2. Walker finds the sibling-class container in the DOM (the `<div class="...__pill-group">` in product-card's case) and emits one child block per item-child within it.
3. Per-item attrs (label, state) lift via the same role-aware mechanism as scalar attrs.
4. If array attr has NULL canonical_slot, walker queries the children's BEM signature for the slot (the children's `__element` BEM segment → resolve via slot_synonyms.aliases → standalone_block).

**Phase 1.3a backfill priority list (corrected 2026-05-27 — drift fix per D89):** the original priority list (product-card.packSizes, social-proof.testimonials, certification-bar.badges, info-box.items) was a Spec-22-drafting drift — 3 of 4 entries didn't grep against the codebase (no `sgs/social-proof` block exists; `info-box.items` attr doesn't exist (real array is `elementOrder`, a slot-name config list); `certification-bar.badges` attr name was wrong (real attr is `items`, already populated)). The CORRECTED priority list, verified against `block_attributes` 2026-05-27, is the 4 sgs/* array attrs with NULL canonical_slot that genuinely carry content:

1. `sgs/product-card.packSizes` → canonical_slot = `button` (per FR-22-2.5 §1 example)
2. `sgs/gallery.mediaItems` → canonical_slot = `media`, role = `image-object` (mirrors sgs/gallery.images)
3. `sgs/form-field-address.fields` → canonical_slot = `options`, role = `content` (matches form-field-checkbox/radio/select pattern)
4. `sgs/form-field-tiles.tiles` → canonical_slot = `options`, role = `content` (same form-field-options pattern)

Plus 3 config-only arrays explicitly flagged role=`layout` (styling-behaviour) so the positive-allowlist gate correctly skips them: `sgs/form-field-file.allowedTypes`, `sgs/info-box.elementOrder`, `sgs/table-of-contents.headingLevels`. These stay canonical_slot NULL by design (config, not content).

`sgs/team-member.socialLinks` was on an earlier draft of this list. The Phase 1.3b refactor (2026-05-27) converts it from a flat array attr → InnerBlocks slot defaulting to one `sgs/social-icons` child block. The attribute is removed; no canonical_slot backfill needed.

All four backfills + three config flags ship in Phase 1.3a alongside the new `db_lookup.array_item_slot_for()` helper that the walker (Commit 1.4) consumes.

### FR-22-3 — Walker is a single universal path with exactly 3 permitted exceptions

The walker is one recursive function. Its branching surface is exactly 3 conditionals:

1. `if not sgs_classes and node.name in atomic_tag_map`: atomic-tag swap.
2. `if is_top_level and node.name in SKIP_TOP_LEVEL_TAGS`: chrome-skip at top level.
3. `if is_top_level and resolved_slug != 'sgs/container'`: top-level container wrap (architecture decision #4).

**No other conditionals.** All other behavioural divergence comes from DB row variation, not code variation. Implementation pseudocode is in §13 (Appendix A).

**PASS test:** count of `if|elif` branches in convert.py walker function that reference a block-slug literal must be 0. Count of `is_top_level` / `node.name in (atomic_tag_map|SKIP_TOP_LEVEL_TAGS)` branches must be exactly 3.
**FAIL test:** any 4th branch added to the walker without a spec amendment.

**2026-05-30 deferred-trigger note (D109).** The XS-3 walker consumption code (layout-bearing wrapper detection + `__inner` passthrough emit) was attempted at commit `f173b351` and REVERTED at `c76aa107` after measuring +13.07pp regression on featured-product + +10.40pp on social-proof. A refined trigger is queued at parking entry **P-XS-3-TRIGGER-REFINEMENT** and is now resolved by **§FR-22-4.1** (Bean-directed 2026-05-31), which codifies the universal rule for every wrapper the walker meets below a section root. Per R-22-3, the refined trigger lands as a refinement to FR-22-4 container-default behaviour (see §FR-22-4.1), NOT as a 4th conditional branch in the walker. The data layer that supports the future re-wire — the `block_composition` table (188 rows, see §FR-22-17) and the `inner` slot row in `slots WHERE scope='element'` — is shipped and stable; only the consumption code is deferred.

### FR-22-4 — Section base is always sgs/container

Top-level section nodes are unconditionally wrapped in `sgs/container` per architecture decision #4. This is permitted exception #3 in FR-22-3.

**PASS test:** every section entry in extract.json has `sgs/container` as its outermost block.
**FAIL test:** any section root emits a non-container block at the top level.

**Tier-driven routing path (D107, 2026-05-30).** The per-section-convention voter now consults `blocks.tier` before the FR-22-4 container-default fires. Section-root sgs- classes registered with `blocks.tier='class-section'` (currently sgs/hero + sgs/cta-section) return from the voter at confidence 1.0 and emit their declared block directly — the FR-22-3 permitted exception #3 still wraps the emit in `sgs/container` per architecture decision #4. All OTHER sgs- prefixed section root classes return a gap-candidate from the voter and fall through to the FR-22-4 default (Stage 2 container emit). See §FR-22-16 for the voter behaviour spec.

### FR-22-4.1 — Universal wrapper/container resolution (Bean-directed, 2026-05-31; the FR-22-4 refinement D109 mandates; closes P-XS-3-TRIGGER-REFINEMENT)

The single rule for EVERY DOM wrapper the walker meets below a section. **No wrapper is EVER silently dropped.** This SUPERSEDES the three patchwork mechanisms it grew out of — `walk_passthrough`'s drop-and-bubble for `sgs-`-classed wrappers, the depth-2 `_is_layout_bearing_wrapper` gate, and the single-wrapper `_absorb_transparent_wrappers` (D52) — folding all three into one coherent mechanism.

Resolution at each node, in precedence order:

1. **Block match wins (FR-22-1, unchanged).** If the node's BEM class resolves to a registered block (`resolve_slug_from_bem` non-NULL) → emit that block; it renders its own CSS. (e.g. `sgs-product-card` → `sgs/product-card`; `sgs-feature-grid` → `sgs/feature-grid`.)

2. **A DIRECT descendant of a container FOLDS into that container.** Every direct child of an emitted container that is itself a slug-None wrapper folds its CSS up onto the container — it does NOT become its own block/container and is NOT dropped:
   - **1 direct descendant** (or a non-layout shell — e.g. a `__inner` with only `max-width`/padding) → its CSS folds as a single inner-CSS layer on the container.
   - **grid / flex / stack direct descendant** → the container ABSORBS the layout: the wrapper's `display:grid|flex` + `grid-template-columns` + `gap` lift onto the container's native grid attributes (`gridTemplateColumns`, `gap`, …), and **each of the container's resulting direct-descendant items folds its own positioning CSS as that item's grid-item CSS** (`gridItem*` attrs — item 1, 2, 3…). The container handles the grid-item CSS. (e.g. `trust-bar` `__inner` is a 4-col grid → folds into the section container, which becomes the 4-col grid with the 4 badges as grid items.)

3. **Exception to #2 — a direct descendant whose class matches a block becomes that block.** It is NOT folded; it is emitted as its block and IS the grid item, handling its own CSS. (e.g. the 2 `sgs-product-card` direct descendants of `.sgs-products` → `sgs/product-card` blocks.)

4. **A wrapper that is NOT a direct descendant (nested below a folded wrapper) → its own block-or-container.** Match a block (→ that block); else → a neutral className-only `sgs/container` (NEVER dropped). Then ITS direct descendants resolve by #2/#3 recursively. (e.g. `.sgs-products` is NOT a direct descendant of `.sgs-featured-product` — it sits under `__inner` — so it becomes its own `sgs/container` carrying the grid; its product-card children become blocks per #3.)

5. **Content-leaf exception (2026-06-03) — a slug-None sgs-classed node with NO block-resolvable element children (only text / inline content) is a CONTENT LEAF, not a wrapper.** It MUST emit a *content block* carrying its text — NEVER a `sgs/container` (whose `save()=<InnerBlocks.Content/>` rejects raw text → editor "Block validation failed: Expected end of content, instead saw Chars" / "unexpected/invalid content"). Target block, in precedence order, all **text-content-gated**: (a) a BEM-element hyphen-segment that resolves to a text-capable block, tail-first so the most specific segment wins (`featured-product__price-note` → segment `price` → `sgs/text`; `…__trustpilot-text` → `text` → `sgs/text`); (b) the FR-22-3 atomic-tag-swap on the node's OWN tag if text-capable (`<p>`→`sgs/text`, `<a>`→`core/button`, `<h*>`→`sgs/heading`, `<blockquote>`→`sgs/quote`); (c) `sgs/text` default (a bare-text leaf IS a paragraph — the correct block, not a catch-all: genuinely-typed elements resolve upstream via `resolve_slug_from_bem`, e.g. `__card-tag`→`sgs/label`). **"Text-capable"** = the target block has a primary `text`/`content` *string* attr, so a literal-text leaf never routes to a block that can't hold it (`…__trustpilot-stars`/`-logo` therefore route to `sgs/text`, NOT `sgs/star-rating`/`sgs/responsive-logo`, whose payload is a rating / image). The node's `className` is preserved on the emitted block and its scoped CSS collected, so styling survives. This is the MIRROR of the leaf-misresolution guard in `walk()` (which catches a leaf-RESOLVED node that HAS sgs-classed element children → treat as container); this catches a container-bound node that has NO element children → treat as leaf. Universal (R-22-9), DB-driven (R-22-1), reuses the FR-22-3 atomic machinery (not a 4th walker branch — it is the FR-22-4 container-default refinement, R-22-3).

**Worked example — featured-product** (`section.sgs-featured-product > div.__inner > div.sgs-products(grid) > 2× div.sgs-product-card`):
- `sgs-featured-product` → `sgs/container` (section base, FR-22-4) [padding + background].
- `__inner` (direct descendant, `max-width` only) → FOLDS into the section container (#2: single inner-CSS layer = max-width).
- `sgs-products` (NOT a direct descendant of the section) → its own `sgs/container` (#4), grid CSS lifted onto its native grid attrs (`5fr 3fr`).
- 2× `sgs-product-card` (direct descendants of `sgs-products`, match a block) → `sgs/product-card` blocks (#3), each the grid item.

**Worked example — trust-bar** (`section.sgs-trust-bar > div.__inner(grid 4-col) > 4× badge`):
- `sgs-trust-bar` → `sgs/container` (section base).
- `__inner` (DIRECT descendant, grid) → FOLDS into the section container (#2 grid case): the section container becomes the 4-col grid; the 4 badges become its grid items with per-item CSS.

**PASS tests:** (a) no `sgs-`-classed wrapper is absent from the emitted markup (never dropped); (b) `.sgs-products` emits as its own `sgs/container` with `gridTemplateColumns` set, holding 2 `sgs/product-card` blocks side-by-side; (c) `trust-bar`'s 4 badges are grid items of the section container (one container, not two); (d) live-DOM verified per R-22-11, not pixel-diff alone (pixel-diff mis-scores reflowed sections — see memory `empty-section-false-pixel-diff-win`); (e) **no `sgs/container` is emitted holding raw text** — every text-only sgs-classed leaf emits a content block (sgs/text / label / heading) with its text + className, self-closing; scan the editor's `core/block-editor` store for `isValid===false` on `sgs/container` and assert 0.
**FAIL tests:** any wrapper dropped (className absent from output); a direct-descendant transparent shell emitted as a second nested container (duplicate nesting); a non-direct layout wrapper folded up past its parent; **a text-only sgs-classed node emitted as a `sgs/container` wrapping raw text** (editor "Expected end of content, instead saw Chars"); a literal-text leaf routed to a non-text-capable block (sgs/media / star-rating / responsive-logo / icon).

**Constraints:** R-22-3 (only `sgs/container` as the container primitive; this is the FR-22-4 refinement, not a 4th walker branch), R-22-4 (per-section pixel-diff gates each commit), R-22-9 (universal — same rule for every wrapper, no per-class special-casing), R-22-11 (live-DOM verification), R-22-13 (Bean visual sign-off).

### FR-22-5 — CSS routes to direct-owner per FR6 four-destination policy (preserved from Spec 16)

Spec 16's FR6 four-destination CSS router (D0 / D1 / D2 / D3) is preserved:

- **D0** — Global tokens → `theme.json` / variation overlay
- **D1** — Typed-attr lift → block attribute (when CSS property matches `property_suffixes` for an attr of the emitted block)
- **D2** — Scoped variation CSS → `pipeline-state/<run>/variation-d0-d2.css`, deployed inline at Stage 10
- **D3** — `attribute_gap_candidates` (the operator-promotion queue) — **uimax table only** (see FR-22-8.1 for the sgs-framework.db legacy table handling)

The D1 routing change from Spec 16: when a CSS rule targets `.sgs-X__Y`, D1 routing calls `equivalent_block_for(parent_X, Y)`. If non-NULL, the rule attributes to the CHILD block, not the parent's `Y` attr. This is the SAME function call as FR-22-2 — single authoritative implementation in `converter_v2/db_lookup.py`.

**PASS test:** `css-d1-assignments.json` contains zero entries where a CSS rule targeting `.sgs-X__Y` is attributed to the parent block's `Y` attr when `equivalent_block_for(parent, Y)` returns non-NULL.
**FAIL test:** any D1 assignment violates the child-attribution rule.

### FR-22-6 — Hybrid block render.php migration

A "hybrid block" is any block where `equivalent_block_for()` returns non-NULL for ≥1 attr (after FR-22-2.2 role-exclusion). The classification is empirically determined by the Phase 0.4 audit query — NOT hand-curated. **Phase 0.4 audit shipped 2026-05-27 (commit `de300eb2`): 61 hybrid blocks identified across 77 SGS audited (mean 3.08 attrs/block; median 2). Phase 2 prioritises by hybrid_attr_count descending (top: sgs/hero=11, sgs/media=8, sgs/icon-list=7, sgs/cta-section=6, sgs/form-field-number=6).**

Per FR-22-6 the render.php migration pattern (proven by sgs/product-card's CTA migration at commit `a757ff1c` — line 32 deprecates ctaText/ctaUrl, line 99 emits InnerBlocks content):

1. Mark legacy attrs deprecated in block.json (or remove them) — content attrs that now flow via InnerBlocks.
2. Remove the attr-driven rendering branch from render.php for the deprecated attrs.
3. Emit InnerBlocks content at the slot location.
4. Add deprecated.js entry covering the previous shape.
5. Test in editor — confirm no "this block contains unexpected content" warnings.

Phase 2 commits these migrations sequentially per binding rule R-22-5 (phases never ship as single commits). Some hybrid blocks (e.g. sgs/hero with 170+ attrs, sgs/cta-section, sgs/mobile-nav) need their own per-block design pass before render.php edit — Phase 2 commits each one separately.

**PASS test:** for every block in the FR-22-2 hybrid roster, render.php emits InnerBlocks content for block-equivalent slots; deprecated.js entry exists; editor shows no "unexpected content" warning.
**FAIL test:** any roster block still renders via deprecated attr-driven branch.

#### FR-22-6.1 — Parallel-session coordination protocol (per F-RA-5)

When per-block migrations dispatch to parallel agents, the dispatch prompt enforces:

- **No shared-file edits.** Each agent's diff must be confined to `plugins/sgs-blocks/src/blocks/<slug>/` — agents MAY NOT edit `includes/render-helpers.php`, `includes/lucide-icons.php`, or any other shared include.
- **If a shared helper is required**, the agent halts and returns "needs shared helper: <helper_name>" — main session adds the helper sequentially as a separate commit BEFORE dispatching the next parallel wave.
- **No `git add` / `git commit` authority** — agents return uncommitted artefacts; main session reviews, runs `/qc-inline`, builds, deploys, measures, commits.
- **Phase 3 cleanup is BLOCKED until all Phase 2 parallel agents have closed.** Coordination via main-session TodoWrite task tracking.

### FR-22-7 — Acceptance: per-section ≤5% pixel-diff × 3 viewports (Phase 1) + visual sign-off

**Phase 1 acceptance gate (this spec's primary delivery):**

- Per-section pixel-diff **≤5%** across 3 viewports (375 / 768 / 1440) for every body section, measured via Stage 11 (`scripts/pixel-diff.py --selector .sgs-{section}`).
- Bean visual sign-off is co-authoritative — script measurement + visual cropped-pair (`pipeline-state/<run>/pixel-diff/<sel>-<vp>/{mockup,sgs}.png`) are BOTH consulted.
- Mean / aggregate metrics retained for trend reporting but NOT the closure gate (per blub.db row 256: mean averaging hides hidden failures).
- Hero clone POC visual evidence (page 29 `/hero-clone-poc/`) is the canonical reference for "visual match achievable" — even where script reports 50%+ due to alignment artefacts.

**Phase 1.5 stretch goal (follow-on spec or amendment):**

Bridge the residual ~4pp from ≤5% to ≤1% via:
- Vertical body-anchor fix on `scripts/pixel-diff.py` (the 60px chrome-bleed identified in hero-clone-poc measurement).
- Chrome cropping to exclude WP admin bar + template-part header from screenshot.
- Font-load timing — wait for `document.fonts.ready` before screenshot.
- Theme.json-token vs inline-value cascade resolution measurement.

**Body sections explicitly enumerated** (per F-SC-2):

| # | Section selector | Phase 1 target |
|---|---|---|
| 1 | section.sgs-hero | ≤5% × 3 viewports |
| 2 | section.sgs-trust-bar | ≤5% × 3 viewports |
| 3 | section.sgs-featured-product | ≤5% × 3 viewports |
| 4 | section.sgs-brand | ≤5% × 3 viewports |
| 5 | section.sgs-ingredients-section | ≤5% × 3 viewports |
| 6 | section.sgs-gift-section | ≤5% × 3 viewports |
| 7 | section.sgs-social-proof | ≤5% × 3 viewports |

`header.sgs-header` and `footer.sgs-footer` are explicitly OUT-OF-SCOPE for Spec 22 (Phase 2 sibling spec — header/footer cloner, parked until body sections close).

**Closure metric is RGB pixel-diff** from `scripts/pixel-diff.py` (NOT the attribute-coverage split-metric documented in cloning-pipeline-flow.md). The attribute-coverage metric is a diagnostic surface, not the acceptance gate.

**Pre-flight Phase 0.4 measurement** establishes the baseline. Acceptance is empirical against that baseline.

**PASS test:** `stage-11-pixel-diff.json` shows every body section ≤5% at 375/768/1440; Bean signs off on visual cropped-pair artefacts.
**FAIL test:** any body section > 5% at any viewport AND Bean visual review rejects.

### FR-22-8 — Unified data interface via wp-blocks.py CLI

`wp-blocks.py` extends its existing dual-DB connection (current code at `~/.claude/hooks/wp-blocks.py` line 41 already opens both `sgs-framework.db` and `ui-ux-pro-max.db`) to expose the unified subcommands the converter needs:

| New subcommand | Returns |
|---|---|
| `wp-blocks equivalent-block <slug> <attr>` | Block slug if attr is block-equivalent, else `null`. Calls `db_lookup.equivalent_block_for()`. |
| `wp-blocks recognition-log --write` | Writes a recognition outcome row to uimax `recognition_log`. |
| `wp-blocks naming-convention <regex>` | Returns the matching canonical row from uimax `naming_conventions` (filtered `is_canonical_for_sgs_drafts=1` per FR-22-9). |
| `wp-blocks gap-candidate --write` | Writes a D3 candidate row to uimax `attribute_gap_candidates`. |
| `wp-blocks animation <slug> <attr>` | Returns uimax `animations` row with sgs_block + sgs_attribute_name mapping. |
| `wp-blocks component-library-match <query>` | Returns matching uimax `component_libraries` row for cross-platform mockup recognition. |

The existing subcommands (`search`, `schema`, `attrs`, `markup`, `validate`, `match`, `tokens`, `gaps`, `impact`, `weaknesses`, `health`, `dump`) are preserved. Estimated extension cost: ~150 LoC (the dual-DB connection already exists; only new query surfaces + subcommand wiring are net-new).

The converter calls `wp-blocks.py` via subprocess for ad-hoc CLI use; for performance-critical walker queries (called per node per attr), the converter imports the underlying `converter_v2/db_lookup.py` functions directly. **Performance threshold (committed):** equivalent-block lookup ≤2ms cache-warm, ≤20ms cold per call. If subprocess latency exceeds this, the converter MUST use the imported library path.

Per binding rule blub.db row 260 (db-first-no-hardcoded-dicts).

**PASS test:** grep for direct sqlite3.connect to sgs-framework.db or ui-ux-pro-max.db in convert.py / sgs-clone-orchestrator.py returns zero hits; all DB access goes through `converter_v2/db_lookup.py`.
**FAIL test:** any pipeline stage opening a direct sqlite3.connect to either DB outside `converter_v2/db_lookup.py`.

#### FR-22-8.1 — Cross-DB invariants

Both `sgs-framework.db` and `ui-ux-pro-max.db` (uimax) contain tables with similar names but different roles. Authoritative resolution:

| Logical entity | sgs-framework.db | uimax | Authoritative source under Spec 22 |
|---|---|---|---|
| `patterns` | 44 rows (framework + client patterns) | 14 rows (cross-platform pattern fingerprints) | **sgs-framework.db** for emit decisions. uimax is read-only cross-check (mismatches log to `unresolved_pattern_fingerprint.log`; do NOT block emit). |
| `attribute_gap_candidates` | 1,480 rows (legacy — Spec 16 era) | 91 rows (Spec 22 era, with confidence + provenance) | **uimax** for new writes. sgs-framework.db table is **read-only legacy** — NO new writes from Spec 22 onwards. Commit 0.0 marks it `is_stale=1` in schema_metadata. Migration of 1,480 legacy rows is out-of-scope for Spec 22 (parked: P-LEGACY-GAP-CANDIDATES-MIGRATION). |
| `design_tokens` | 184 rows (SGS authoritative) | 5,164 rows (multi-system cross-reference catalogue) | **sgs-framework.db** for SGS theme work. uimax design_tokens is read-only cross-reference. |

When `wp-blocks.py` is asked for an entity that exists in both DBs, it returns the authoritative source's row and (when an `--include-cross-check` flag is set) the uimax counterpart for comparison. Mismatches are logged to `pipeline-state/<run>/cross-db-conflicts.log` (registered in Spec 21 — Commit 1.4 update).

### FR-22-9 — Selected uimax tables as recognition oracle

Only the SGS-WP-relevant subset of uimax tables routes through `wp-blocks.py` per FR-22-8:

| uimax table | Spec 22 role |
|---|---|
| `naming_conventions` (16 rows) | Mockup convention detection. Stage 0.1 BEM lint already uses this; Spec 22 makes it canonical — only `is_canonical_for_sgs_drafts=1` rows route to the universal path. Other conventions route through `lingua_franca` conversion at write time. |
| `attribute_gap_candidates` (91 rows) | D3 destination output queue (with confidence + provenance). Per FR-22-8.1 this is the authoritative target for new D3 writes. |
| `recognition_log` (75,315 rows) | Empirical learning. Every walker emit logs an outcome with section + slot + decision + result. Mined by future automation passes. |
| `animations` (63 rows) | Per-animation `sgs_block` + `sgs_attribute_name` columns — drives Stage 4's animation extension recognition. |
| `component_libraries` (338 rows) | Cross-platform Rosetta Stone (Bootstrap / shadcn / Radix / Tailwind / etc.). Used when recogniser identifies foreign-stack mockup — looks up equivalent SGS block via component_libraries → naming_conventions join. |
| `patterns` (14 rows) | Cross-check fingerprints against sgs-framework.db `patterns` (44 rows) per FR-22-8.1 invariants. |

Tables explicitly NOT used by Spec 22: all `stack_*` except `stack_sgs_wordpress` (currently empty but reserved), chart/icon/font catalogues, products/styles/typography/gov_patterns/ui_reasoning/ux_guidelines.

All Spec 22 queries are read-only against uimax tables EXCEPT:
- `attribute_gap_candidates` (W) — D3 routing writes new candidates
- `recognition_log` (W) — walker logs every recognition outcome

### FR-22-10 — Stage coverage map (renamed per F-SC-14)

This is documentation, not an FR. Full stage coverage tables live in §5 (Survives/Retires/Migrates/Enriches). The whole-pipeline impact: Stage 4 (Slot extraction in `convert.py`) is the rewrite. All other stages preserved or minor-tweaked.

### FR-22-11 — Pass-through wrapper behaviour for NON-sgs- nodes (per F-SC-15)

> **Scope clarification (FR-22-4.1, 2026-05-31):** FR-22-11 governs nodes with **no `sgs-` classes** — transparent non-SGS wrappers. For nodes that carry an `sgs-` class but do not resolve to a registered block (layout wrappers, fold candidates), the rule is §FR-22-4.1 (Universal wrapper/container resolution), which supersedes the old `walk_passthrough` drop-and-bubble, `_absorb_transparent_wrappers` (D52), and depth-2 `_is_layout_bearing_wrapper` gate for sgs-classed nodes. FR-22-11 continues to apply to non-sgs-classed wrappers only.

A pass-through node is a DOM Tag with no `sgs-` classes (and not handled by the atomic-tag swap exception of FR-22-3). The walker:

1. Does NOT emit a block for the pass-through node itself.
2. Recurses into the node's children; each child's emit bubbles to the pass-through node's parent's InnerBlocks list.
3. The pass-through node's classes are preserved on the nearest emitted ancestor block as additional `className` entries (so styling targeting the wrapper class survives).
4. Pass-through depth is unlimited (a non-SGS wrapper containing another non-SGS wrapper containing an SGS block — both wrappers' classes preserved on the SGS block).

**PASS test:** `extract.json` contains zero block entries whose `block_slug` is derived from a non-`sgs-` source class. Wrapper classes appear in the `className` field of the descendant SGS block.
**FAIL test:** any non-SGS class appears as the `block_slug` target in extract.json.

### FR-22-12 — Stage 2 confidence-matrix preservation

Stage 2 (the confidence matrix) continues to produce `stage-2.json` / `match.json` for every section boundary, even when Spec 22's universal walker emits via unambiguous BEM signal. The Stage 2 artefact is preserved for downstream diagnostics (per Spec 21 mandatory diagnostic sequence). The walker MAY bypass Stage 2's `top_pick` selection when BEM resolves unambiguously, but Stage 2 still runs and writes its artefact.

**PASS test:** `stage-2.json` always contains an entry for every section boundary in extract.json, regardless of which path the walker took.
**FAIL test:** any section boundary present in extract.json missing from stage-2.json.

### FR-22-15 — Capability-aware tiebreaking in multi-candidate BEM resolution (D96 2026-05-29)

When `resolve_slug_from_bem` Path 1 yields two or more bare-block candidates (i.e. a single DOM node carries two or more `sgs-*` BEM classes both mapping to registered slugs), the tiebreaker uses **capability rank** derived from `block_capabilities` rather than alphabetical slug order.

**Architectural primitive:** every `block_capabilities` row carries a semantic tag (e.g. `carousel`, `icon-text`, `grid-layout`). The `_CAPABILITY_PRIORITY` list in `db_lookup.py` orders these tags from most-specific structural role (top) to most generic primitive (bottom). A block's capability rank is the minimum index of any of its capability tags in that list. Alphabetical slug order is the final tiebreaker when two blocks share the same rank.

**Why this matters:** when a mockup author writes `class="sgs-testimonial-slider sgs-container"` on a social-proof section root, both `sgs/testimonial-slider` and `sgs/container` are registered slugs. Alphabetical would have chosen `sgs/container` (comes first). Capability rank chooses `sgs/testimonial-slider` (`carousel` tag, rank 11) over `sgs/container` (`grid-layout` tag, rank 16) — correctly preserving the section's semantic identity.

**Implementation:** `db_lookup._capability_rank(block_slug)` + `capabilities_for(block_slug)` + `blocks_with_capability(capability)`. All three are DB-driven (R-22-1). `_CAPABILITY_PRIORITY` in `db_lookup.py` is a convention-ordering list (not a routing dict) — equivalent to `_BREAKPOINT_RULES` precedent.

**Seed propagation fix (D96):** `populate-db.py:CAPABILITY_RULES` previously used `INSERT OR IGNORE`, meaning edits to `CAPABILITY_RULES` never propagated to an already-populated DB. Fixed to `INSERT OR REPLACE` with a pre-pass `DELETE` of rows whose capability tag is no longer in `CAPABILITY_RULES`. Re-running `populate-db.py` now fully synchronises the DB with the seed.

**PASS test:** `resolve_slug_from_bem(['sgs-testimonial-slider', 'sgs-container'])` → `'sgs/testimonial-slider'` (capability rank wins over alphabetical).
**FAIL test:** same call returning `'sgs/container'` (alphabetical-first bug re-introduced).

### FR-22-16 — Voter tier-driven recognition (D107, 2026-05-30)

The per-section-convention voter (`scripts/per-section-convention-voter.py:295-305`) recognises a section-root sgs- class as a block-equivalent emission ONLY when the block is operator-declared as a section-root in the framework. Recognition signal is the `blocks.tier` column.

**Pre-condition.** `blocks.tier` is populated by `/sgs-update` Stage 1, which reads the `supports.sgs.is_section_root: true` flag in each block's `block.json`. Operators set this flag deliberately on blocks designed to BE a section root (sgs/hero, sgs/cta-section currently). All other blocks default to `tier='block'`. A future tier value `'pattern'` is reserved for pattern-emit blocks; no rows currently carry it.

**Voter behaviour.**

1. Voter receives a candidate sgs- class extracted from the section root node.
2. Voter formulates the candidate block slug (e.g. `sgs-hero` → `sgs/hero`).
3. Voter calls `db_lookup.is_class_section_block(slug)`. The helper queries `SELECT 1 FROM blocks WHERE slug = ? AND tier = 'class-section' LIMIT 1`.
4. If the helper returns True, voter returns `(slug, confidence=1.0, source='class-section-block-equivalent')`.
5. If the helper returns False AND the class is sgs- prefixed, voter returns `('', 0.0, 'gap-candidate-class-section')`. Stage 2 routes the candidate through the FR-22-4 container-default path.

**What this REMOVES.** The pre-D107 voter contained a literal-slug-match short-circuit that returned confidence 1.0 for ANY sgs- prefixed candidate whose slug matched a registered block — regardless of whether the block was designed as a section root. This produced false-positive section emits when content-block primitives (sgs/text, sgs/heading, sgs/media) appeared in section-root class chains. The short-circuit is REMOVED; tier='class-section' is the new positive signal.

**PASS test.** `voter.recognise('sgs-hero')` → `('sgs/hero', 1.0, 'class-section-block-equivalent')`. `voter.recognise('sgs-ingredients-section')` → `('', 0.0, 'gap-candidate-class-section')` (sgs/ingredients-section is not a registered block; even if it were, tier would default to 'block', not 'class-section').
**FAIL test.** Any sgs- prefixed candidate returning confidence 1.0 from the voter without `blocks.tier = 'class-section'` on the resolved slug.

Per R-22-1 there is no Python `_CLASS_SECTION_SLUGS` frozenset. The signal is in the DB column; operators control it by editing `block.json`.

### FR-22-17 — block_composition shape signals (D108 data layer; walker consumption DEFERRED per D109)

The `block_composition` table records the deterministic shape of each registered block — what it wraps, whether it carries InnerBlocks, what child blocks it accepts. This is structural metadata, NOT recognition data. The walker (in a future commit, see deferred-trigger note below) will consult `block_composition` to refine its container-default behaviour without adding a 4th conditional branch.

**Schema.**

| Column | Type | Notes |
|---|---|---|
| `block_slug` | TEXT PK | One row per registered block (188 rows currently). |
| `wraps_block` | TEXT | Slug of the block this one wraps as its outer rendered container, or NULL. Populated for 4 blocks: sgs/hero, sgs/cta-section, sgs/modal, sgs/quote (all wrap `sgs/container`). |
| `composition_role` | TEXT CHECK | One of `section-root` (2 rows), `wrapper-shell` (1 row), `content-block` (165 rows), `leaf` (20 rows). |
| `has_inner_blocks` | INT | 1 if the block declares an InnerBlocks slot (15 blocks currently); 0 otherwise. |
| `accepts_allowed_blocks` | TEXT (JSON) | JSON array of slug strings the block's `allowedBlocks` whitelist accepts; NULL if no whitelist. |

**Population algorithm (deterministic, run by `/sgs-update`).** Per registered block:

1. `composition_role` derives from a 4-step cascade: (a) `tier='class-section'` → `section-root`; (b) `wraps_block IS NOT NULL` AND `has_inner_blocks=1` AND no content-bearing attrs → `wrapper-shell`; (c) `has_inner_blocks=1` OR ≥1 content-bearing attr per FR-22-2.2 → `content-block`; (d) otherwise → `leaf`.
2. `wraps_block` is read from save.js / render.php — first detected `<InnerBlocks>` / `<?php echo $content` parent tag that resolves to a registered block.
3. `has_inner_blocks` is True iff save.js contains `<InnerBlocks` OR render.php emits `$content` directly without wrapping.
4. `accepts_allowed_blocks` is read from save.js / block.json `allowedBlocks` arrays.

Populated 2026-05-30 by `/sgs-update` Stage 1 extension. 188 rows. Refresh on every `/sgs-update` run.

**DEFERRED walker consumption — RESOLVED by FR-22-4.1 (2026-05-31).** The original XS-3 plan (commit `f173b351`) wired the walker to consult `block_composition.wraps_block` + `composition_role='wrapper-shell'` to recognise layout-bearing non-section wrappers and emit `__inner` slot passthroughs. Empirical Stage 11 measurement showed +13.07pp regression on featured-product and +10.40pp on social-proof. Code reverted at `c76aa107`. The DATA is shipped and stable. The refined trigger (parking entry **P-XS-3-TRIGGER-REFINEMENT**) is now formalised by **§FR-22-4.1** — the single coherent wrapper-resolution rule that covers direct-descendant folding, grid/flex absorption, block-match exceptions, and non-direct-descendant own-container emission. Implementations consuming `block_composition` for wrapper resolution MUST follow §FR-22-4.1 precedence order rather than re-deriving the rule. Per R-22-3, this remains a refinement to FR-22-4 (container default) — NOT a 4th walker exception.

**Cross-references.**
- D108 = data layer ship (this FR's pre-condition).
- D109 = walker consumption revert decision + the +13.07pp / +10.40pp regression evidence.
- P-XS-3-TRIGGER-REFINEMENT = parking entry tracking the refined trigger work.

**PASS test (data layer).** `SELECT COUNT(*) FROM block_composition` returns 188. `SELECT COUNT(*) FROM block_composition WHERE wraps_block='sgs/container'` returns 4 (sgs/hero, sgs/cta-section, sgs/modal, sgs/quote). `SELECT COUNT(*) FROM block_composition WHERE composition_role='section-root'` returns 2.
**FAIL test.** Walker consults `block_composition.wraps_block` to emit `__inner` passthrough before P-XS-3-TRIGGER-REFINEMENT closes — re-introduces the reverted regression.

### FR-22-18 — Structural-parity acceptance for layout/wrapper/logic work (Bean-directed, 2026-05-31; amends R-22-4 scope)

For wrapper/container/layout/content-routing commits, the acceptance metric is **rendered-DOM structural parity** measured directly from the live page (R-22-11), NOT pixel-diff. The canonical artefact is the body-nesting **wireframe** — draft tree vs rendered-clone tree, full body. Per section it verifies:

- **Container presence + nesting level** — a container exists everywhere expected, at the correct depth (Req 1).
- **Container type + template** — correct grid/flex/stacked + grid-template (e.g. `gridTemplateColumns` 1fr 5fr) + per-device responsive variants on the block's NATIVE attrs (Req 2 Goal A). Per A-1 (D121): responsive `@media` padding/margin/gap/columns/grid lift onto `{Tablet,Mobile}` attrs.
- **Absorbed CSS + native attrs confirmed** — every absorbed CSS property routes to D0/D1/D2/D3 (FR-22-5), never silently dropped; grid-item CSS → container `gridItem*` defaults + per-child overrides (Req 2 Goal B/D). **NB `sgs/container` HAS per-grid-item support: instance-wide `gridItem*` defaults (→ `--sgs-gi-*` custom props inherited by direct child containers) + per-child overrides win via specificity** (`container/edit.js`). (Corrects an earlier mistaken "uniform only" claim — D124.)
- **Child blocks/elements** — correct number, type, content, order, hierarchy (Req 2 Goal C / Req 3 Goal C).
- **Block-override** — a registered block with a built-in wrapper replaces `sgs/container` (Req 3): section-root override via `blocks.tier='class-section'` (voter, FR-22-16); child-block override via BEM resolution (FR-22-1); array content via FR-22-2.5. The block still folds its own child divs.

**Pixel-diff is informational-only during this phase** — it MAY run + be shared, but MUST NOT gate or guide a layout/structural commit (layout/CSS changes produce false pixel readings; rendered-HTML structure is the truth). R-22-4's pixel-diff gate is scoped to VISUAL-FIDELITY commits (colour/image/spacing/exact-styling) — the final phase, after structure is correct.

**Recognition is BEM, not HTML tag** (R-22-2): atomic non-BEM CONTENT tags emit via the FR-22-3 atomic-tag-swap to their DYNAMIC sgs equivalents (via `blocks.replaces`, §14 — `<h2>`→sgs/heading, `<p>`→sgs/text, `<img>`→sgs/media), so nothing with content is skipped; only non-content transparent WRAPPER divs dissolve (CSS folded up per FR-22-4.1).

**PASS test:** the section's rendered-DOM tree matches the draft tree for container presence/type/template/child-order; Bean visual sign-off co-authoritative (R-22-13).
**FAIL test:** any expected container missing/mis-typed/mis-nested, any absorbed CSS dropped (not in D0-D3), or a pixel-diff number used to justify a layout commit.

### FR-22-19 — Class-section composite interior slot-routing (Bean-directed, 2026-06-01; status DESIGN — build pending)

A **class-section composite** is a registered block with `tier='class-section'` AND `block_composition.wraps_block='sgs/container'` — i.e. its render.php provides a fixed shell (named column divs like `.sgs-X__content` / `.sgs-X__media`) and consumes `$content` for one column while rendering the other column(s) from **scalar attrs with a rich own pipeline** (art-direction, srcset, object-fit, bleed, border, responsive show/hide CSS authored in render.php). Current roster: `sgs/hero`, `sgs/cta-section`, `sgs/modal`, `sgs/quote`.

**The problem.** When the walker resolves such a block, §FR-22-4.1 emits each of its mockup direct-descendant wrapper columns as a generic `sgs/container` (the `__content` container + the `__media` container with child `sgs/media`). The block's render.php then ALSO wraps `$content` in its own `.sgs-X__content` shell and renders its own scalar media column — producing a **double `.sgs-X__content`** and a media column the converter filled with classless `sgs/media` children that the block's art-direction CSS cannot target. Verified on Mama's hero canary 2026-05-31/06-01 (R-22-11). render.php is correct; the converter emits the wrong interior shape for these blocks.

**The mechanism (FR-22-19).** When the walker resolves a class-section composite, it routes the node's children per the block's declared slots rather than emitting generic containers:
- **Content-column children** (the mockup column whose BEM element maps to the block's InnerBlocks content-slot) → emitted as **bare InnerBlocks into `$content`** (no `__content` container — render.php provides it).
- **Scalar-pipeline column source nodes** (e.g. the `__media` column's `<img>` with `--mobile/--desktop` modifiers) → **lifted to the block's declared scalar attrs** (`splitImage` desktop / `splitImageMobile` mobile for hero), so render.php's existing rich pipeline + art-direction renders them. NO block-file change (render.php / edit.js / block.json all already correct for this model).

This is **FR-22-2 content-routing applied to class-section composites** — the same `equivalent_block_for()` decision (attr-vs-child) the walker already runs for leaves (G1, D117), extended to composite interiors. It is NOT a 4th walker branch (R-22-3): it fires inside the existing resolved-block emit path, gated by `db.is_class_section_block(slug)` (FR-22-16, already wired) + `block_composition` shape data. Per R-22-1 the routing is DB-driven, not a per-block Python dict.

**FR-22-2 reconciliation.** A composite's scalar-pipeline image slot (`splitImage`, `splitImageMobile`, `sideImage`) is classified with the **`scalar-media` role** (styling-behaviour class) in the `roles` table, so `equivalent_block_for(slug, attr)` returns NULL for it → the FR-22-2.4 unresolved-attr path lifts it to scalar instead of emitting a `sgs/media` child. (The role is named `scalar-media` everywhere in the implementation; earlier drafts called it `image-pipeline` — that name is retired.) This is the FR-22-2.2 positive-allowlist gate working as designed (styling/behaviour roles return NULL), NOT a per-block bypass. One DB row per slot, no code branch.

**RESOLVED mechanism (2026-06-01, DB-audit-verified, Bean-approved) — no new column needed.** The DB audit found the routing is expressible with the EXISTING columns + one new role + a data correction:
1. **New `roles` row `scalar-media`** (classification `styling-behaviour`). The FR-22-2.2 positive-allowlist gate then makes `equivalent_block_for()` return NULL for any attr carrying it → the walker does NOT emit a child block; the value is lifted to the scalar attr instead. (This is the role-column marker — NOT `attr_type`, which must keep the data type `object`/`string` so the lift knows how to write the value.)
2. **Reclassify + re-point** the affected attrs via a **direct DB UPDATE** (corrected 2026-06-01 per the code map — `canonical_slot`/`role` are NOT block.json-driven; block.json Stage-1 indexing only reads attr_name/type/default. The role seed lives in `db_lookup._ROLE_CLASSIFICATION_MAP`; the per-attr `canonical_slot`/`role` are set by `assign-canonical.py` heuristics OR an operator UPDATE). The UPDATE **survives `/sgs-update`** because `assign-canonical.py` only acts on rows where `canonical_slot IS NULL` — once set, the row is frozen. Changes: role `image-object`→`scalar-media`; and FIX the mis-pointed `canonical_slot` — `sgs/hero.splitImage`/`splitImageMobile` currently carry a stale `canonical_slot='split'` (a layout slot, aliases grid/row/group — a pre-Tier-0-fix backfill artefact); correct to `media`, the slot the mockup `__split-image` element actually resolves to (its aliases already include split-image/--mobile/--desktop). `sgs/testimonial-slider.sideImage` → `(media, scalar-media)`.
3. **Walker preference rule** (`_route_composite_interior`, gated by **`db.has_scalar_media_attrs(slug)`** — corrected 2026-06-01 from `is_class_section_block`, which was too narrow: `sgs/testimonial-slider` is a composite but a content-block, not a section-root. Gating on "has ≥1 scalar-media attr" is precise — it covers every composite that renders interior media itself AND naturally excludes blocks with no scalar-media attr (cta-section/info-box/product-card stay on the generic path, so the earlier cta-section over-fire risk is resolved). R-22-3-compliant: fires inside the resolved-block emit path, not a 4th branch). For each interior direct-child: (a) child resolves (via `scalar_media_attr_for`) to a `scalar-media` slot → lift the `<img>`(s) into the scalar attr (`--mobile`/`--desktop` BEM modifier → base vs `+Mobile` sibling via `modifier_suffixes`), emit no child markup; (b) child resolves to a registered block (e.g. `article.sgs-testimonial` → `sgs/testimonial`, a repeated content ITEM) → emit it AS that block (NOT folded — §FR-22-4.1 rule #3); (c) child is a slug-None transparent content WRAPPER (e.g. the hero's `sgs-hero__content`) → fold it: walk its children into bare `$content` InnerBlocks (§FR-22-4.1 rule #2). R-22-1 clean (DB-driven, no per-block slug conditional). **Verified 2026-06-01 (emit-level, both sections):** hero lifts splitImage/splitImageMobile + folds content; social-proof's 3 testimonial articles emit as `sgs/testimonial` blocks unchanged.

**Roster — exactly which attrs carry `scalar-media` (DB-audit-verified 2026-06-01, all 17 composites + every object/text content attr checked):** only **3 attribute tags across 2 blocks** — `sgs/hero.splitImage`, `sgs/hero.splitImageMobile`, `sgs/testimonial-slider.sideImage`. These are the only **foreground media a composite renders itself with a bespoke scalar pipeline** a child block can't replicate.

**Three-way discriminator (which fix each content attr gets) — the universality boundary:**
- **`scalar-media` (this rule):** foreground DOM element + bespoke scalar render → hero.splitImage/splitImageMobile, testimonial-slider.sideImage.
- **FR-22-6 InnerBlocks migration (Phase 2 roster, SEPARATE commits):** foreground element rendered as PLAIN content a standard child replicates → e.g. `sgs/cta-section.headline`/`body`. Make the block `echo $content`; do NOT scalar-pin.
- **Already handled (no change):** background layers — `backgroundImage`/`backgroundVideo`/`bgVideo`/`svgContent` (the hero's `standard`/`video`/`svg-animated` variants; cta-section + container backgrounds) are CSS-routed by the D1 router to their scalar attr with NO DOM child; and already-FR-22-6-migrated blocks (`info-box.image`).

**Hero-variant note (Bean asked):** the hero has 4 variants `[standard, split, video, svg-animated]`. Only **`split`** needs `scalar-media` — its image is foreground content (a real `<img class="sgs-hero__split-image…">`). `standard`/`video`/`svg-animated` media are **backgrounds** authored as CSS → handled by the D1 router → no DOM child → no fix needed. (render.php outputs the standard background as an `<img>` for LCP, but the mockup INPUT is CSS, so it doesn't change the routing.)

**Universality (R-22-9).** The mechanism is the canonical Phase-2 path for every hybrid composite whose render.php wraps `$content` AND renders named scalar slots — all 4 `wraps_block` composites + the wider FR-22-6 roster. Not hero-only. cta-section verified to share the shape (`__content` + `__bg-media` + `__buttons` + scalar `backgroundMedia`/`stats`/`ribbon`); each ships as its own commit per R-22-5 after its `block_composition` row + render.php wrapping behaviour is verified.

**Rejected alternative (H2).** "Walker preserves BEM classes on every resolved block + hero render.php becomes a thin shell + images become `sgs/media` children." Rejected by the qc-council: (a) retires the hero's 169-attr image pipeline + the render.php-authored art-direction `@media` CSS onto `sgs/media` (which cannot replicate it) → violates "preserve full functionality"; (b) blast radius = all 7 sections + 5 block files + a deprecated.js migration + invalidates the pixel-diff baseline. The className-preservation sub-idea is separable and may later extend FR-22-11 step 3 to resolved blocks DB-first, but is not bundled here.

**Build sequence — SHIPPED 2026-06-01 (commits 83a55820 + 5859c42d).** (1) DB: added `scalar-media` role to `_ROLE_CLASSIFICATION_MAP` + reclassified `sgs/hero.splitImage`/`splitImageMobile` + `sgs/testimonial-slider.sideImage` to `(canonical_slot='media', role='scalar-media')` (direct UPDATE; survives /sgs-update); verified `equivalent_block_for` returns NULL. (2) `scalar_media_attr_for(slug, bem_element)` resolves the slot mapping via `block_attributes.role='scalar-media'` + `slots` aliases — no new column needed (the OPEN GAP closed with existing columns). (3) convert.py: `_route_composite_interior` gated by **`has_scalar_media_attrs(slug)`** (corrected from the original `is_class_section_block` — too narrow; testimonial-slider is a composite content-block, not a section-root). Content-column path folds slug-None wrappers but emits slug-resolved children as their block (FR-22-4.1 #2/#3). (4) Live-DOM verified (page 144): hero = exactly 1 `.sgs-hero__content` (double-wrapper fixed), h1 + 2 buttons + content; social-proof's 3 `sgs/testimonial` emit unchanged. **Residual:** the hero media column needs `$is_split` to fire on present split media (hero render.php fix 2026-06-01) + real image sideload (media-map — separate lever) for the images to render. (5) Bean visual sign-off pending.

**PASS test:** hero live DOM matches the FR-22-19 predicted shape (1 `.sgs-hero__content`, 2 art-directed imgs, content InnerBlocks) with zero change to the other 6 sections' emitted markup.
**FAIL test:** double `.sgs-hero__content`; ≠2 hero imgs; any non-hero section's markup changes; a hardcoded per-block slug conditional in the router.

### FR-22-20 — Universal variant detection (Bean-directed 2026-06-01; supersedes the hero `$is_split` band-aid; PARTIALLY SHIPPED — hero Commits 1–5/6 built + live-DOM verified 2026-06-01 per D134; Commit 6 modifier-class→enum path redesign-pending per D135; generalisation to the other 32 variant blocks still pending)

**Problem.** A block with multiple layout variants renders the correct variant ONLY when its variant-selector attr is set. **33 SGS blocks carry a variant-selector enum attr** (`hero.variant` [standard/split/video/svg-animated], `product-card.variantStyle` [standard/trial/gift/featured], `gallery.layout`, `mobile-nav.variant`, `trustpilot.variant`, `divider.variant`, `announcement-bar.variant`, …). The cloning converter populates a variant's CONTENT (e.g. the hero's split images) but does NOT set the variant attr → the block renders its DEFAULT variant. Gating render on data-presence (the 2026-06-01 hero `$is_split` fix) is a per-block **CHEAT**: it doesn't generalise, and it mis-fires on stale data (a block authored as `standard` that also carries `splitImage` from a prior edit would be mis-detected). The variant MUST be chosen from **what the draft pulled THIS run**, universally, with **zero variant-awareness required of the HTML draft** (drafts stay free-form — the framework infers the variant; per Bean, drafts must not be limited to current design capacity).

**Mechanism (DB-driven, universal — R-22-1/R-22-9):**
1. **Declaration.** Each variant block declares, in `block.json` `supports.sgs.variants` (operator-controlled), a map `variant_value → [attr/slot names that variant uses]`. The variant-selector attr name (`variant`/`variantStyle`/`layout`/`badgeStyle`/…) is recorded on a new **`blocks.variant_attr`** column so the converter doesn't guess it. (Most of the scaffolding already exists: the 33 variant-selector enum attrs in `block_attributes` + the `variations` table, 206 rows/33 blocks. The new piece is the per-variant DISCRIMINATING-slot map.)
2. **`/sgs-update` populates a new `variant_slots` table** `(block_slug, variant_value, unique_slot)` — storing only each variant's **DISCRIMINATING** slots (set-difference: attrs used by that variant but NOT by its sibling variants; shared attrs like `minHeight` excluded). Derived from the `supports.sgs.variants` declaration. E.g. `hero/split → splitImage, splitImageMobile, splitColumnRatio, splitGap`; `hero/standard → backgroundImage`; `hero/video → backgroundVideo, bgVideo`; `hero/svg-animated → svgContent`.
3. **Converter variant-detector.** When the walker resolves a block whose `blocks.variant_attr` is non-NULL: from the slots **extracted from the draft THIS run** (the extract — NOT the block's stored attrs, which closes the stale-data hole), count how many of each variant's `variant_slots` were populated; pick the variant with the **HIGHEST count** (the insurance tie-break for the rare mixed-fingerprint draft — in practice a draft carries one variant's slots); set the block's variant attr to that value. No per-block conditional — the detector reads `variant_slots` for the resolved slug.

**Effect.** The converter sets the correct variant attr from the draft's fingerprint → render.php's ORIGINAL variant-gating (e.g. `$is_split = 'split' === $variant`) is correct → **the 2026-06-01 hero `$is_split` band-aid is REVERTED** (no data-presence guessing, no stale-data ambiguity). Generalises to all 33 variant blocks with zero per-block code.

**R-22 compliance.** R-22-1 (DB-driven — the variant→slots map lives in block.json → `variant_slots` table; no Python dict, no slug literal). R-22-9 (one mechanism, every variant block). R-22-3 (the detector is an emit-path enrichment gated by `blocks.variant_attr IS NOT NULL`, NOT a 4th walker branch). R-22-18 (verify via rendered DOM — the live block carries the draft-matching variant).

**Build sequence (R-22-5; each its own commit, FR-22-18 gate).** (1) DB: add `blocks.variant_attr` column + `variant_slots` table. (2) Declare `supports.sgs.variants` in the variant blocks' block.json (hero first; then product-card/gallery/…). (3) `/sgs-update` Stage-1 populates `variant_slots` (set-difference). (4) converter variant-detector + **REVERT the hero `$is_split` band-aid** (hero render.php line ~224 back to `'split' === $variant`). (5) re-clone canary + live-DOM verify the hero carries `variant='split'` + renders via the original gate. (6) generalise to the other 32 variant blocks incrementally.

**PASS test:** a cloned hero whose draft has `.sgs-hero__split-image` emits `sgs/hero{variant:'split'}` (set by the detector, not hardcoded); render.php renders the media via the original `$is_split` gate; the band-aid is gone.
**FAIL test:** any per-block variant conditional in the converter; variant chosen from the block's STORED attrs rather than the draft's extracted slots; the `$is_split` data-presence band-aid still present.

## 4. The data layer

### sgs-framework.db — the framework brain (29 tables, ~17k+ rows)

| Table | Rows | Spec 22 role |
|---|---|---|
| `blocks` | 194 (68 sgs-built) | Block roster. **D107 2026-05-30 — `tier` column added.** TEXT CHECK in ('block','class-section','pattern'), DEFAULT 'block'. 2 rows currently 'class-section' (sgs/hero, sgs/cta-section); all others default 'block'. Populated by `/sgs-update` Stage 1 from `supports.sgs.is_section_root: true` flag in block.json. Consumed by `db_lookup.is_class_section_block()` per FR-22-16. |
| `block_composition` | 188 | **D108 2026-05-30 — NEW table.** PK `block_slug`. Columns: `wraps_block` TEXT, `composition_role` TEXT CHECK in ('section-root','wrapper-shell','content-block','leaf'), `has_inner_blocks` INT, `accepts_allowed_blocks` TEXT JSON. Distribution: 2 section-root + 1 wrapper-shell + 165 content-block + 20 leaf. 15 rows has_inner_blocks=1; 4 rows wraps_block='sgs/container' (sgs/hero, sgs/cta-section, sgs/modal, sgs/quote). Populated by `/sgs-update` Stage 1. Walker consumption DEFERRED per D109 / FR-22-17 / parking P-XS-3-TRIGGER-REFINEMENT. |
| `block_attributes` | 2,074 (post-D100 cleanup) | Central for FR-22-2. Walker reads `canonical_slot` + `derived_selector` + `role` to resolve equivalent_block at query time. **D110 2026-05-30 backfill (with XS-4 follow-ups):** `canonical_slot` coverage 52 → 692 rows (2.5% → 33.4%); `role` coverage 110 → 689 rows (5.3% → 33.2%) via D99-ported `assign-canonical.py`. |
| `block_supports` | 1,160 (post-D100 cleanup) | Block-level supports |
| `block_capabilities` | 88 | Capability declarations. FR-22-15: queried by `capabilities_for()` / `blocks_with_capability()` / `_capability_rank()` in `db_lookup.py` for capability-aware tiebreaking in multi-candidate BEM resolution. Seed propagation fixed 2026-05-29 (D96): `populate-db.py` now uses `INSERT OR REPLACE` + pre-pass DELETE so edits to `CAPABILITY_RULES` propagate on every re-run. |
| `block_selectors` | 72 | Block-slug → element → selector mapping |
| `block_styles` | 63 | Block style variations |
| `block_changes` | 2,719 | Audit log |
| `slots` | 96 (92 element + 4 section, per D111 2026-05-30) | **D99 2026-05-29 — unified slot→block mapping.** D111 2026-05-30: section-scope rows pruned 16 → 4 (12 wrong/dead rows DELETED; remaining: core/group, hero, cta, cta-section). Element-scope rows 89 → 92 (testimonial + testimonial-slider re-inserted; `inner` passthrough slot added with `standalone_block=NULL` — walker consumption reverted per D109 but slot row persists for future re-wiring under P-XS-3-TRIGGER-REFINEMENT). Replaces `slot_synonyms` (89 element-scope rows) + `legacy_role_lookup` (16 section-scope rows). PK: `(slot_name, scope)` — composite because the same name can exist at both scopes (e.g. `header` is an element-scope identity slot AND a section-scope class). `scope='element'` rows are the former `slot_synonyms` data; `scope='section'` rows are the former `legacy_role_lookup` data. `html_semantic_tag` column NOT migrated (was low-value: only 27/89 populated; not consulted by `atomic_tag_map()` per §14). |
| `roles` | 20 | **D99 2026-05-29 — role-name → classification catalogue.** Replaces `slot_synonyms.role_classification` column. Seeded from `_ROLE_CLASSIFICATION_MAP` via `INSERT OR REPLACE`. Fixes link-href bug (old column never seeded link-href because no slot row had `role='link-href'`). 5 content-bearing + 15 styling-behaviour. |
| ~~`slot_synonyms`~~ | ~~89~~ | **RETIRED D99 2026-05-29.** Data migrated to `slots WHERE scope='element'`. |
| `property_suffixes` | 117 | CSS property → block-attribute suffix (D1 routing). **D99: `kind_override` column added.** 17 rows seeded from `_KIND_BY_SUFFIX` dict (was a hardcoded Python lookup dict; now DB column queried first in `_kind_for()`). |
| `modifier_suffixes` | 19 | BEM modifier kinds |
| ~~`legacy_role_lookup`~~ | ~~16~~ | **RETIRED D99 2026-05-29.** Data migrated to `slots WHERE scope='section'`. |
| `design_tokens` | 184 | Token catalogue (theme.json source) |
| `style_variations` | 8 | Per-client variation metadata |
| `theme_parts` | 22 | Header/footer/template-part roster |
| `patterns` | 44 | Pattern catalogue with `block_composition` JSON. Authoritative per FR-22-8.1. |
| `pattern_coverage` | 108 | Industry-pattern coverage matrix |
| `variations` | 206 | Block variations |
| `markup_examples` | 399 | Per-block reference markup |
| `attribute_gap_candidates` | 1,480 | Legacy promotion queue. **Read-only under Spec 22 per FR-22-8.1.** No new writes; migration parked. |
| `animation_tokens` | 7 | Animation token catalogue |
| `components` | 9 | Shared editor components |
| `hooks` | 5,421 | Filter / action hooks |
| `gotchas` | 12 | Known gotchas |
| `docs` | 1,255 | In-codebase doc index |
| `indexed_files` | 87 | File-mtime index for /sgs-update |
| `deploy_steps` | 9 | Deploy step catalogue |
| `plugins` | 3 | Plugin roster |
| `pipeline_corrections` | 4 | Pipeline correction log |
| `schema_metadata` | 4 | DB schema versioning |

### uimax — SGS-WP-relevant tables only (6 of 49)

Per FR-22-9. Other 43 uimax tables are out-of-scope for this spec.

| Table | Rows | Spec 22 role |
|---|---|---|
| `naming_conventions` | 16 | FR-22-9 — mockup convention detection. `is_canonical_for_sgs_drafts=1` filter. |
| `attribute_gap_candidates` | 91 | FR-22-9 — D3 destination output (authoritative per FR-22-8.1). |
| `recognition_log` | 75,315 | FR-22-9 — walker emit outcomes logged for future learning. |
| `animations` | 63 | Per-animation `sgs_block` + `sgs_attribute_name` mappings. |
| `component_libraries` | 338 | Cross-platform Rosetta Stone. |
| `patterns` | 14 | Cross-check fingerprints against sgs-framework.db patterns. |

## 5. What survives, retires, migrates, enriches

### Survives

- Spec 00 (BEM naming convention) — Spec 22 IS Spec 00's runtime implementation
- Spec 20 (structured log surfacing) — Stage 9c continues unchanged
- Spec 21 (pipeline-state artefacts) — artefact catalogue updated (new logs registered) Commit 1.4
- Stages 0 / 0.1 / 0.5 / 0.7 / 1 / 2 / 3 / 4.5 / 5 / 6 / 7 / 7b / 8 / 9 / 9b / 9c / 10 / 11 / +REG — pipeline shape unchanged
- FR6 four-destination CSS router (D0 / D1 / D2 / D3) — preserved with FR-22-5 D1 enrichment
- FR7 visual-QA verification (per-section pixel-diff) — preserved with FR-22-7 ≤5%/≤1% gate
- `converter_v2/db_lookup.py` — extended (new `equivalent_block_for()`, etc.)
- `sgs/container` as universal layout primitive — architecture decision #4 preserved
- DB-first principle (binding rule blub.db row 260) — promoted to FR-22-1 / FR-22-8
- Stage 2 `match.json` artefact production (FR-22-12)

### Retires (moved to archive folder for bulk-delete later)

Retired scripts move to `plugins/sgs-blocks/scripts/orchestrator/_retired/` so they're out of the canonical path but available for reference. Bulk-deleted at Spec 22 close once everything's confirmed working.

| Surface | What goes | Archive location |
|---|---|---|
| Spec 16 (was `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`; now `.claude/specs/archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md`) | Entire spec retired 2026-05-26 (commit d9bd1c00) | `.claude/specs/archive/` |
| `lift_subtree_into_block_attrs` (convert.py:3387) | Function deleted | inline removal |
| 9-branch walk() | Collapsed to 3-exception FR-22-3 path | inline removal |
| FR1 fast path / "normal route" distinction | Dissolved | inline removal |
| `ARRAY_LIFT_PATTERNS` dict (convert.py:1008-1031) | Replaced by FR-22-2.5 array-of-objects resolution | inline removal |
| Hardcoded `ATOMIC_TAG_MAP` | Replaced by DB-driven atomic_tag_map (see FR-22-3 + Phase 0.0.2) | inline removal |
| `essence_match_detector.py` | Tier removed | `plugins/sgs-blocks/scripts/orchestrator/_retired/` |
| Per-block hardcoded branches at convert.py:1532/1550 | Deleted | inline removal |
| `_lift_inner_blocks` (convert.py:1350) + F1 fallback | Both merged into universal walker | inline removal |
| Pre-rewrite `convert.py` | Saved for diff reference | `_retired/convert_pre_spec22.py` |

### Migrates

| Surface | What changes |
|---|---|
| `wp-blocks.py` | Extended (~150 LoC) per FR-22-8 — 6 new subcommands |
| `/sgs-update assign-canonical.py` | Extended (Phase 0.1) with **Tier B BEM-element derivation only**. Scope-corrected per D84 (2026-05-27): real backfill scope is ≤72 Tier B candidates, not 1,214. Structural guardrail refuses `derived_selector IS NULL` input. Dry-run diff reviewed by Bean before any write. Golden corpus dropped (1,142 triple-NULL rows are correctly NULL by design). |
| Hybrid block render.php (8-15 blocks per FR-22-2 audit) | Per FR-22-6 + FR-22-6.1 — emit InnerBlocks content for block-equivalent slots; deprecated.js shim; parallel-session-eligible. |
| Stage 9 leftover-bucket classifier | New `unresolved_equivalent_block` bucket; `extraction_failed` count drops |
| trace.jsonl event taxonomy | Per-branch event types drop (`fr1_matched` / `essence_matched` / `composite_to_standalone`); universal `walker_emit` gains bem-resolution path field |
| `converter_v2/db_lookup.py` | New functions: `equivalent_block_for()` (2-tier; Tier C deleted D85 2026-05-27), `atomic_tag_map()`, `resolve_slug_from_bem()`, `lift_behavioural_attrs()`, `emit_sgs_container_wrapping()` + LRU cache + `_migrate_role_classification()` idempotent migration at module load + `_content_bearing_roles()` / `_styling_behaviour_roles()` DB-driven helpers replacing the prior hardcoded `_CONTENT_BEARING_ROLES` / `_ROLE_EXCLUSION_ALLOWLIST` frozensets. |

### Enriches

- `block_attributes.canonical_slot` — `/sgs-update assign-canonical.py` extended for Tier B backfill only (≤72 candidate rows per D84 scope correction; 1,142 triple-NULL rows are correctly NULL behavioural attrs and stay NULL by design)
- `slot_synonyms` — new rows added for gaps surfaced during the universal sweep. New column `role_classification` added by D85 (2026-05-27) idempotent migration in `db_lookup._migrate_role_classification()`; populated from `_ROLE_CLASSIFICATION_MAP` seed (one-time at module load). Tier C derivation no longer required (FR-22-2.3 retired); the column powers the FR-22-2.2 positive-allowlist gate.
- uimax `recognition_log` — every walker emit logs an outcome (no schema change; writes increase)

## 6. Architectural rules (binding for every Spec 22 commit)

1. **R-22-1 — DB-first, no hardcoded dicts** (blub.db 260). All lookups via DB tables; the only "permitted" dict-like constant is `SKIP_TOP_LEVEL_TAGS` (3 entries: header/footer/nav — bounded HTML semantic tags, not block-specific). Role classification (replacing the original Tier C row-derivation concept) now lives in the `slot_synonyms.role_classification` column (DB-migrated 2026-05-27 per D85/D86) — Python frozensets retired.
2. **R-22-2 — BEM is the only recognition signal** (Spec 00 §3.1). HTML tag is rendering-shape only, except in the bounded atomic-tag-swap permitted exception.
3. **R-22-3 — Three permitted walker exceptions, no others** (FR-22-3). Adding a 4th branch requires spec amendment with empirical justification. **D109 2026-05-30 amplification:** the deferred XS-3 refined trigger queued at parking entry **P-XS-3-TRIGGER-REFINEMENT** MUST land as a refinement to FR-22-4 (container-default behaviour) or as enrichment of one of the three existing exceptions — NEVER as a 4th conditional. The `block_composition` table (FR-22-17) supplies the data signals; the consumption code shape is constrained by this rule.
4. **R-22-4 — Pixel-diff measurement gates every commit** (blub.db 256). `/sgs-clone --debug-trace` Stage 11 per-section pixel-diff captured pre/post. Commit message cites predicted vs actual delta.
5. **R-22-5 — Phases never ship as single commits** (blub.db 288). Phase 1 walker rewrite is split into ≥3 commits (Phase 1.1, 1.2, 1.3, 1.4, 1.5) per §7.
6. **R-22-6 — Output-only inference is a trap** (2026-05-26 feedback). Verify mockup HTML AND extract.json AND live DOM at each milestone.
7. **R-22-7 — Council fix-shapes are hypotheses, not specs** (blub.db 276). Multi-rater proposals require empirical pre/post measurement before subagent dispatch.
8. **R-22-8 — Schema enumeration before "missing X" claim** (blub.db 272). Query `sgs-framework.db` directly via `/sgs-db` before claiming any column / table / row gap.
9. **R-22-9 — Universal mechanisms, no per-block hyperfocus** (Bean P1, locked 2026-05-25).
10. **R-22-10 — Read full spec before proposing fix-shape** (blub.db 285).
11. **R-22-11 — Verify rendered output, not internal metrics** (blub.db 194). Live Playwright DOM check is canonical; extract.json is corroborating evidence.
12. **R-22-12 — QC gates are structural, not prompt** (blub.db 281). `/qc-council` pre-commit gate enforced via `pipeline-stage-gate.py` hook.
13. **R-22-13 — Bean visual sign-off is co-authoritative with pixel-diff** (per FR-22-7 + measurement-vs-eye rule `~/.claude/rules/measurement-vs-eye.md`). Script numbers + Bean's eye + visual cropped-pair artefacts together close a section. Numbers alone don't close; eye alone doesn't close.
14. **R-22-14 — FR-22-6 migrations never carry server-side legacy fallback hacks** (Bean P1, locked 2026-05-27). The "render.php reads scalar attrs and builds inner HTML, ignoring `$content`" problem is exclusively SGS-framework debt; core/Gutenberg blocks never had it. NEVER add `if (empty($content) && !empty($legacy_attr)) { ...legacy scalar render... }` to a migrated render.php. The temptation appears when migrating a single block (e.g. Fix 4 hero attempt 2026-05-27) where unedited production posts would otherwise render blank between deploy and editor-open. The correct response is: (a) batch-migrate the full 61-block roster via Phase 2 parallel /subagent-driven-development per FR-22-6.1, (b) ship a WP-CLI batch existing-post migration script that walks every post on every production site + forces deprecated.js v(N+1) migration via headless block-parser, (c) delay the deploy if (b) isn't ready — never add the per-block fallback hack which would be ~10-20 lines × 61 blocks = 600-1200 lines of dead-but-load-bearing scalar guard code permanently in the codebase. The fallback hack violates R-22-9 (universal mechanism, no per-block hyperfocus) at the operational layer. Captured after Fix 4 hit /qc-council BLOCK with Rater B demanding the fallback; Bean reframed the problem as SGS-exclusive + correctly chose roster migration + WP-CLI sweep over per-block hacks. Sibling lesson: `feedback_fr22_6_hybrid_problem_is_sgs_only_no_legacy_fallback_hacks.md`. Operationalised in `.claude/plans/2026-05-28-phase-2-hybrid-block-migration.md`.

## 7. Implementation phases

### Phase 0 — Foundation (DB + tooling + cross-doc sync)

**Commit 0.0 — Cross-doc sync (gate for Spec 22 status flip).** This MUST land BEFORE Spec 22 status flips from `draft` to `active`. Updates: `architecture.md` decision #14 rewrite, `cloning-pipeline-flow.md` two-route topology retirement, `cloning-pipeline-stages.md` Stage 4 rewrite, `Spec 00 §3.1` link target update (currently points to retired Spec 16 §12.3), `Spec 16` move to archive, `docs-registry.yaml` Spec 22 add, parking entries close (P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP, P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES, P-FR1-VARIATION-BUF-CONSISTENCY, P-MATCH-JSON-GATE-REDEFINITION, P-G3-STAGE-3-VISUAL-SLOT-MAPPING, P-G5-PER-BLOCK-DOM-SHAPE-FIXES). Per F-AP-6 / F-SC-4 / F-SC-5 / F-SC-7. No code change.

**Commit 0.1 — DB enrichment (scope-corrected per D84 2026-05-27).** Extend `/sgs-update assign-canonical.py` with **Tier B BEM-element derivation only**. Structural guardrail by construction: script refuses to operate on any row where `derived_selector IS NULL` — makes the F-RA-1 "mis-tag behavioural attr" failure mode impossible by input shape. `--dry-run` mode emits a JSON diff (block_slug, attr_name, proposed canonical_slot, derivation source). Expected yield ≤72 Tier B candidate updates (DB audit 2026-05-27 confirmed). Bean inline-reviews the diff BEFORE any DB write — 20-50 rows fits one screen. **Tier C ships dormant** — 0 candidates in current DB state (the path is wired for future-proofing per FR-22-2.1 but has no inputs to act on today). **Golden corpus DROPPED** — 1,142 of 1,214 "NULL canonical_slot" rows are correctly-NULL behavioural attrs (size, position, enum toggles, identity), NOT backfill targets; the dry-run diff IS the review surface. Pre-rewrite DB snapshot at `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` (captured 2026-05-26, SHA256 `d08806295db262a35db0b7a25948d35d86e782f74847fe87c1ded824e00017bc`). No new DB tables.

**Commit 0.2 — wp-blocks.py extension.** Add 6 new subcommands per FR-22-8 (~150 LoC). Adversarial test corpus per F-RA-3: positive cases (block-equivalent attrs return correct slug) + negative cases (behavioural attrs return null) + edge cases (hyphen-compound BEM elements).

**Commit 0.3 — Phase 0 measurement-methodology hardening.** Patch `scripts/pixel-diff.py` to fix the 60px vertical-anchor offset identified in hero-clone-poc validation: detect sticky/fixed WP chrome (admin bar + framework template-part header) on the SGS page and apply `visibility:hidden` BEFORE `el.screenshot()` so the chrome's `position:sticky;top:0` re-anchoring during scroll-into-view does not paint over the captured element. **Post-screenshot crop-by-detected-height was tried and rejected (D87 2026-05-27, /qc-council Task 5 Rater B): empirically over-crops by `chrome_height − target_viewport_offset` (the bleed on `el.screenshot()` is `tph_bottom − target_top` ≈ 66px at 1440, NOT the full 247px chrome height; cropping by the full height produced 57% > 54.5% baseline).** Retain post-screenshot crop ONLY for full-page captures where no target offset exists. Add `--wait-fonts` flag to wait for `document.fonts.ready` (default OFF; `/sgs-clone` orchestrator passes ON automatically for Spec-22-gated runs per P-SGS-CLONE-WAIT-FONTS-ORCHESTRATION). Add `--keep-chrome` debug-override flag (skip chrome detection + hide; for observability use cases). Empirical result: hero-clone-poc 1440 went 54.5% → 10.3% (−44.2pp); Mama's hero 1440 IMPROVED 69.6% → 60.8% (−8.8pp; honest new baseline since chrome was contaminating prior measurement). Without this work the Phase 1 ≤5% gate is measured against a script with known noise; with it the gate has empirical foundation.

**Commit 0.4 — Hybrid-block audit.** Query `equivalent_block_for()` against every block × every attr. Filter via FR-22-2.2 role-exclusion. Produce roster at `.claude/reports/2026-05-27-hybrid-block-roster.md`. **Actual count 2026-05-27: 61 hybrid blocks across 77 SGS blocks audited (1,740 block_attributes rows).** Mean hybrid_attr_count = 3.08; median = 2. Top blocks: sgs/hero (11), sgs/media (8), sgs/icon-list (7), sgs/cta-section (6), sgs/form-field-number (6). The earlier "8-15 estimate" was a guess at the count of "true high-content composites"; the canonical roster criterion (any block with ≥1 content-bearing attr per FR-22-6) is wider — 61 is the empirical result and IS the Phase 2 scope. Phase 2 dispatchers prioritise by hybrid_attr_count descending (hero first, single-attr blocks last).

### Phase 1 — Walker rewrite (split per R-22-5)

**Commit 1.1 — Pre-rewrite snapshot.** Archive current `convert.py` to `_retired/convert_pre_spec22.py`. No behavioural change. Living-docs update noting pending rewrite.

**Commit 1.2 — Atomic-tag map migration.** Replace hardcoded `ATOMIC_TAG_MAP` (convert.py:698-704) with DB-driven `db.atomic_tag_map()` call. Resolution algorithm: query `slot_synonyms.html_semantic_tag → standalone_block` AND `blocks.replaces` reverse-walk. Documented algorithm in Appendix B (§14). Stage 11 measurement: predicted no change (current ATOMIC_TAG_MAP works; this is structural cleanup).

**Commit 1.3 — ARRAY_LIFT_PATTERNS retirement + array-of-objects resolution.** Implement FR-22-2.5. Delete `ARRAY_LIFT_PATTERNS` dict. Stage 11 measurement: predicted social-proof + featured-product show modest improvement.

**Commit 1.4 — Universal walker (the core rewrite).** Delete `lift_subtree_into_block_attrs`, `_lift_inner_blocks`, F1 fallback, 9-branch walk(). Implement single-path walker per FR-22-3 + Appendix A. New `equivalent_block_for()` in db_lookup.py. Stage 11 measurement: predicted brand / product-card / social-proof drop substantially toward ≤5%. Halt + re-investigate any section regressing >2pp from baseline.

**Commit 1.5 — Phase 1 measurement + halt/proceed decision.** Full-page `/sgs-clone --auto-section --debug-trace`. Every body section measured. If all 7 sections × 3 viewports ≤5%, Phase 1 closes; proceed to Phase 2. If any section > 5%, halt + diagnose (Phase 1.5 territory if structural, or per-block fix if isolated).

### Phase 2 — Hybrid block render.php migration (parallel-session-eligible per FR-22-6.1)

Per FR-22-6 + FR-22-6.1. One commit per block in the Phase 0.4 audit roster. Sonnet agents dispatched in parallel where independent; main session sequentially handles any shared-helper additions.

**Commit 2.1 — Roster from Phase 0.4 audit.** Each block in roster gets its own commit per FR-22-6 procedure.
**Commit 2.N — Continues until roster empty.** Cross-client validation (Indus Foods homepage) AFTER Mama's roster closes — surfaces additional hybrid blocks per FR-22-9. New synonyms added as DB rows, not per-client code branches.

### Phase 3 — Legacy cleanup (sequential AFTER Phase 2 closes per FR-22-6.1)

**Commit 3.1 — Subprocess-call cleanup.** Delete legacy converter-helper subprocess calls across `sgs-clone-orchestrator.py` + `wp-pre-merge-gate.py`. All now call unified `wp-blocks.py` per FR-22-8.

**Commit 3.2 — Move `essence_match_detector.py`** to `_retired/`.

**Commit 3.3 — Bulk-delete `_retired/` folder** once Phase 4 acceptance closes (reversible via git history).

### Phase 4 — Acceptance gate

**Commit 4.1 — Mama's full-page acceptance.** `/sgs-clone --auto-section`. Every body section measured. Phase 4 closes when every body section ≤5% × 3 viewports per FR-22-7 AND Bean visual sign-off accepted.

**Commit 4.2 — Cross-client validation.** Same acceptance gate on Indus Foods homepage AND helping-doctors if available. Any new slot_synonyms / naming_conventions rows added are checked against Mama's pipeline run to verify no Mama's regression.

**Commit 4.3 — Phase 4 close `/qc-council` Stage 5 + `/handoff`.** Cross-doc updates per §8.

### Phase 5 — decisions.md + mistakes.md pruning

**Commit 5.1 — decisions.md walk.** Each D-entry referencing retired Spec 16 surfaces either:
- **Pruned** if entirely about retired surface + no longer load-bearing — delete (git history preserved).
- **Modernised** if underlying decision still relevant — rewrite pointing at Spec 22 equivalent FR.

**Commit 5.2 — mistakes.md walk.** Same treatment.

### Phase 1.5 — Bridge ≤5% to ≤1% (follow-on stretch, parked here for visibility)

After Phase 4 closes at ≤5%, Phase 1.5 diagnoses the residual ~4pp of pixel-diff noise:
- pixel-diff.py vertical-anchor fix (the 60px chrome offset from hero-clone-poc).
- Chrome cropping for live-page screenshots.
- Font-load timing (wait for document.fonts.ready).
- Theme.json-token vs inline-value cascade rendering precision.
- Image-dimension rounding noise.

Phase 1.5 work is empirically scoped after Phase 1 measurements arrive. May be its own amendment to this spec or a sibling spec.

## 8. Cross-doc impact list

| Doc | Change shape | When |
|---|---|---|
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | Move to archive/ with retirement header | Commit 0.0 |
| `.claude/architecture.md` | Decision #14 rewrites to reference Spec 22 FR-22-3. New decision documenting Spec 16 retirement. | Commit 0.0 |
| `.claude/decisions.md` | NEW D-numbers: D78 Spec 16 retirement, D79 Spec 22 lands, D80 wp-blocks.py unified CLI, D81 hybrid block migration, D82 walker rewrite, D83 acceptance gate ≤5% with ≤1% Phase 1.5 stretch | Commits 0.0, 0.2, 1.4, 2.N, 4.3 |
| `.claude/mistakes.md` | Pruning pass per Phase 5.2 | Commit 5.2 |
| `.claude/cloning-pipeline-flow.md` | Two-route topology section retires; Stage 4 description rewrites | Commit 0.0 |
| `.claude/cloning-pipeline-stages.md` | Stage 4 annotated block rewrites; scripts inventory updates | Commits 0.0, 1.4, 3.1 |
| `.claude/specs/02-SGS-BLOCKS.md` | render.php migration pattern documented | Commit 2.1 |
| `.claude/specs/00-naming-conventions.md` | §3.1 link target updated (currently points to retired Spec 16 §12.3) | Commit 0.0 |
| `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` | Bucket distribution updates; new logs registered (`unresolved_equivalent_block.log`, `cross-db-conflicts.log`, `unresolved_pattern_fingerprint.log`); trace.jsonl event taxonomy updates | Commit 1.4 |
| `.claude/parking.md` | Close subsumed entries (P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP, P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES, P-FR1-VARIATION-BUF-CONSISTENCY, P-MATCH-JSON-GATE-REDEFINITION, P-G3-STAGE-3-VISUAL-SLOT-MAPPING, P-G5-PER-BLOCK-DOM-SHAPE-FIXES). Add new: P-LEGACY-GAP-CANDIDATES-MIGRATION (1480 sgs-framework.db rows) | Commits 0.0, 4.3 |
| `.claude/plans/2026-05-25-phase-1-universal-extraction.md` | Archive + replace with Spec 22's Phase 1 plan (Phase 3 of this Spec 22 work) | Commit 0.0 |
| `.claude/plans/2026-05-24-strategic-plan.md` | Rewrite or retire post-Spec-22 ratification | Commit 0.0 or Phase 4.3 |
| `.claude/state.md` | Phase + status + latest_commit through every commit | Every commit |
| `.claude/handoff.md` | Final close at Phase 4.3 | Commit 4.3 |
| Root `CLAUDE.md` | "binding rules" updates to reference R-22-1 through R-22-14 (R-22-14 added 2026-05-27 per Fix 4 reframing) | Commit 1.4 + Phase 2 update |
| `.claude/CLAUDE.md` (working area) | Authoritative-pointers table gains Spec 22 entry | Commit 0.0 |
| `plugins/sgs-blocks/CLAUDE.md` | "Block customisation standard" gains hybrid-block migration reference | Commit 2.1 |
| `~/.claude/skills/sgs-wp-engine/SKILL.md` | Spec 22 referenced as canonical Stage 4 spec | Commit 0.0 |
| `~/.claude/skills/sgs-clone/SKILL.md` | Hard rules list updates to drop FR1 references; add FR-22-* references | Commit 1.4 |
| `.claude/docs-registry.yaml` | Add Spec 22 entry; mark Spec 16 retired | Commit 0.0 |
| `~/.claude/CLAUDE.md` (global) | If cloning-pipeline section references Spec 16, update to Spec 22 | Commit 0.0 |

**Estimated total: ~20 docs touched across Spec 22's lifespan.** Commit 0.0 alone touches 11 of them — it IS the gating commit for status flip.

## 9. Out of scope (explicitly)

- **Header / footer cloning** — Phase 2 sibling spec (already drafted at `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`); parked until Spec 22 closes body sections.
- **Pattern fast-path automation** — pattern fingerprinting / mood-board recognition / cross-pattern matching. Phase 3+. `recognition_log` data supports this work but it sits above Spec 22.
- **Theme variation / per-client style overrides** — Phase 5a/b shipped (D43); not touched here.
- **uimax tables outside the SGS-WP-relevant 6** — per FR-22-9.
- **Migration of 1,480 legacy sgs-framework.db `attribute_gap_candidates` rows** — parked as P-LEGACY-GAP-CANDIDATES-MIGRATION. Table is read-only under Spec 22 (no new writes).
- **Phase 1.5 noise-floor work** — empirically scoped after Phase 1 closes.

## 10. Risks (with mitigations)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Phase 0.1 `canonical_slot` backfill wrongly tags behavioural attr as block-equivalent | LOW (scope-corrected 2026-05-27 — D84) | Walker mis-emits child block for what should be scalar attr | **Structural guardrail**: assign-canonical.py refuses to operate on rows where `derived_selector IS NULL`. Risk surface reduced from 1,214 rows to ≤72 Tier B candidates. Dry-run JSON diff (one screen) reviewed by Bean before any DB write. 1,142 triple-NULL behavioural attrs untouched by construction. Golden corpus regression test DROPPED — diff IS the review surface. |
| Phase 1 walker rewrite drops sections that legacy walker handled via essence-match | MEDIUM | Pixel-diff regression on specific section | **Pre-rewrite DB snapshot** (Commit 0.1) enables true rollback (legacy code + legacy DB state). Stage 11 measurement at Commit 1.4 catches the regression immediately. |
| Hybrid block render.php migration breaks existing posts | MEDIUM | "Unexpected content" warnings; clients see broken blocks | deprecated.js shim per FR-22-6 step 4; tested in editor before deploy. |
| Cross-client validation surfaces new naming gaps | LIKELY (feature, not risk) | Slot_synonyms / naming_conventions rows added | Validated against Mama's pipeline run AFTER each addition; rollback if Mama's regresses. |
| Performance regression — walker DB queries per node | LOW | Slow `/sgs-clone` runs | `converter_v2/db_lookup.py` LRU cache; performance threshold committed in FR-22-8 (≤2ms cache-warm, ≤20ms cold). |
| `recognition_log` writes (75k+ rows already) become bottleneck | LOW | Slow `/sgs-clone` runs | Buffered append-only writes; uimax compaction job already exists. |
| `wp-blocks.py` unified CLI is single point of failure | MEDIUM | All walker emits depend on one function correctness | **Adversarial test corpus** (Commit 0.2) per F-RA-3. Positive + negative + edge cases. |
| Parallel Phase 2 agents collide on shared file | LOW (mitigated) | PHP fatal error on render-helpers.php | **FR-22-6.1 coordination protocol** forbids shared-file edits in parallel agents. |
| Phase 3 cleanup ships before Phase 2 closes | LOW (mitigated) | Ghost-failure diagnoses in parallel agents | **FR-22-6.1 enforces sequencing** — Phase 3 BLOCKED until all Phase 2 parallel agents close. |
| ≤5% Phase 1 gate is still aspirational (noise floor unknown) | MEDIUM | Phase 1 won't close cleanly; Phase 1.5 needed sooner than expected | **Bean visual sign-off** (R-22-13) is co-authoritative. Numbers stuck at 6-8% but visual match → still acceptable provisional closure pending Phase 1.5. |
| decisions.md / mistakes.md pruning deletes load-bearing entry | LOW | Past mistake re-introduced in future session | **Modernised, not deleted** when underlying lesson still applies. Git history preserved. |

## 11. Success criteria

After Spec 22 Phase 4.3 closes:

- Every body section on Mama's homepage measures ≤5% pixel-diff × 3 viewports
- Bean visual sign-off captured on cropped-pair artefacts for every section
- Cross-client validation gate met on at least one other client (Indus Foods or helping-doctors)
- Spec 16 archived; all references in 18+ docs updated to Spec 22
- `convert.py` reduced substantially in LoC (target ~50-60% reduction)
- `wp-blocks.py` unified CLI deployed; converter calls one tool not two
- Hybrid-block roster (Phase 0.4) empty of unresolved blocks (every hybrid has migrated render.php)
- `_retired/` folder bulk-deleted after Phase 4 acceptance
- decisions.md + mistakes.md cleaned of stale Spec 16 references
- Zero hardcoded class-to-block dicts remain in Python (role classification migrated to `slot_synonyms.role_classification` column per D85/D86; Tier C derivation deleted)
- ≤72-row Tier B backfill diff reviewed by Bean + applied; 1,142 triple-NULL behavioural rows verified unchanged post-script (per D84 scope correction)
- A fresh `/sgs-clone` run on any client mockup produces deterministic ≤5% per-section output (Phase 1) with a clear path to ≤1% (Phase 1.5)

**The business outcome: cloning a new client mockup takes a `/sgs-clone` command plus a Bean visual review — not "weeks of converter tuning."** Phase 1 puts the system in operational range (≤5%); Phase 1.5 polishes to brand-tier (≤1%).

## 12. Time estimate

Per F-PE-13 the previous greenfield-assumption gave 31-41 hours. With the corrections (wp-blocks.py extension not greenfield; hybrid scope 8-15 not 90; existing dual-DB connection; assign-canonical.py existing):

| Phase | Work | Estimate |
|---|---|---|
| 0.0 (cross-doc sync) | 11 docs touched, no code | ~2 hours |
| 0.1 (DB enrichment, scope-corrected D84) | assign-canonical.py Tier B extension + structural guardrail + dry-run diff + Bean review (≤72 rows). DB snapshot already captured. | ~1.5 hours |
| 0.2 (wp-blocks.py extension) | 6 subcommands, adversarial tests | ~3 hours |
| 0.3 (pixel-diff.py hardening) | vertical-anchor fix, font-load wait | ~2 hours |
| 0.4 (hybrid-block audit) | Query + report | ~1 hour |
| 1.1 (pre-rewrite snapshot) | git mv + living-docs | ~30 min |
| 1.2 (atomic-tag map migration) | One commit, measure | ~1-2 hours |
| 1.3 (ARRAY_LIFT_PATTERNS retirement) | One commit, measure | ~2 hours |
| 1.4 (universal walker — the core) | Walker rewrite + new db_lookup functions + measure | ~5-6 hours |
| 1.5 (Phase 1 measurement) | Full-page run + decide | ~1 hour |
| 2.N (hybrid migrations, 8-15 blocks) | Parallel dispatch, sequential helper additions | ~6-10 hours |
| 3.1-3.3 (legacy cleanup) | Subprocess removal, archive moves, bulk delete | ~2 hours |
| 4.1-4.3 (acceptance gate) | Mama's + cross-client + handoff | ~2-3 hours |
| 5.1-5.2 (doc pruning) | decisions.md + mistakes.md walks | ~1-2 hours |
| **Total** | | **~32-40 hours** |

Spread across **6-10 sessions** of 3-5 hours each. NOT a single sprint. R-22-5 (phases never ship as single commits) is the operating discipline.

## 13. Appendix A — walker pseudocode (implementation reference, not FR)

Implementation pseudocode for the universal walker is provided here as reference. The FRs in §3 are the authoritative spec; this pseudocode is illustrative only.

```
function walk(node, css_rules, depth=0, is_top_level=False):
    # Exception 0 — text nodes return their text
    if node is a text node:
        return text-or-None

    classes = node.classes
    sgs_classes = [c for c in classes starting with "sgs-"]

    # Permitted exception 1 — atomic-tag swap
    if not sgs_classes and node.tag in atomic_tag_map():
        return emit_atomic(node)

    # Permitted exception 2 — chrome-skip at top level
    if is_top_level and node.tag in SKIP_TOP_LEVEL_TAGS:
        trace("chrome_skip", node)
        return None

    # Universal path — BEM → DB → emit
    slug = resolve_slug_from_bem(sgs_classes)  # FR-22-1 with multi-class disambiguation
    if slug is None:
        # Pass-through (FR-22-11) — recurse, bubble children's emit
        return walk_passthrough(node, css_rules, depth)

    attrs = lift_behavioural_attrs(node, slug)  # FR-22-2 (NULL equivalent_block only)
    css = collect_css_for_classes(classes, css_rules)  # FR-22-5
    children_markup = recursively walk each child

    # Permitted exception 3 — top-level section container wrap
    if is_top_level and slug != 'sgs/container':
        return emit_sgs_container_wrapping(slug, attrs, children_markup, css)

    return emit_wp_block(slug, attrs, children_markup, css_buf=css)
```

Total branching surface: 3 named exceptions (atomic-tag swap / chrome-skip / top-level container wrap). No per-block conditionals.

## 14. Appendix B — atomic_tag_map() DB resolution algorithm

Per FR-22-3 + Commit 1.2. The mapping from HTML tag to block slug is derived at startup from sgs-framework.db (cached in db_lookup.py):

Resolution order per tag:
1. `slot_synonyms.html_semantic_tag = <tag>` → return `standalone_block` (when set in DB)
2. For HTML primitives not covered by Tier 1, reverse-walk `blocks.replaces` JSON: find first sgs-source block where `replaces` contains the matching `core/<equivalent>` slug
3. If no SGS replacement exists, return the core block slug (`core/paragraph`, `core/heading`, `core/image`, etc.) as the default

The Tier 2 cascade is the SAME pattern as the legacy ATOMIC_TAG_MAP but DB-derived. The legacy dict had 9 entries; the new map will have ≥9 entries and grow automatically as new SGS blocks declare `blocks.replaces` mappings.

Example seed (live-derived at startup, not hardcoded):
- `p` → sgs/text (via blocks.replaces contains "core/paragraph") or core/paragraph fallback
- `h1`-`h6` → sgs/heading (via slot_synonyms.html_semantic_tag) or core/heading fallback
- `img` → sgs/media (via slot_synonyms or blocks.replaces) or core/image fallback
- `hr` → sgs/divider (via blocks.replaces contains "core/separator") or core/separator fallback

## 15. Council findings addressed in v0.3

| Council finding | Severity | Address in v0.3 |
|---|---|---|
| F-AP-1 / F-SC-1 — "No branches" structural contradiction | CRIT | FR-22-3 explicitly names exactly 3 permitted exceptions; PASS/FAIL test added |
| F-AP-2 / F-SC-11 — ROLE_TO_BLOCK dict violates R-22-1 | CRIT | **RESOLVED via Tier C deletion (D85 2026-05-27).** Earlier v0.3 mitigation derived Tier C from existing `slot_synonyms.role + standalone_block` columns; qc-council Rater B (2026-05-27) and Bean directive removed Tier C entirely on empirical grounds (0 inputs in current DB → no measurement evidence for the dominance heuristic). The DB-derived role-classification column (`slot_synonyms.role_classification`) now powers FR-22-2.2 via the positive-allowlist gate without any Python lookup dict. R-22-1 honoured. |
| F-PE-3 — ATOMIC_TAG_MAP via blocks.replaces wrong direction | CRIT | Resolution algorithm specified in Appendix B (§14) — 2-tier lookup via slot_synonyms.html_semantic_tag + blocks.replaces reverse |
| F-PE-4 — Hybrid scope 90 not 5 | CRIT | Recalibrated: 63 raw → 8-15 true hybrid via FR-22-2.2 role-exclusion |
| F-RA-1 — Phase 0.1 backfill semantic golden corpus | CRIT → DOWNGRADED LOW (D84, 2026-05-27) | Mitigation restructured: script constrained by construction to `derived_selector IS NOT NULL` input. DB audit 2026-05-27 showed 1,142 of 1,214 "NULL canonical_slot" rows are correctly-NULL behavioural attrs (NOT backfill targets); real backfill scope is ≤72 Tier B rows reviewable inline. Golden corpus DROPPED — dry-run JSON diff IS the review surface. |
| F-RA-2 — Cold rollback broken by DB mutation | CRIT | Pre-rewrite DB snapshot in Commit 0.1 |
| F-SC-2 — Body sections not enumerated | CRIT | Explicit table in FR-22-7 |
| F-AP-4 / F-RA-4 — ≤1% has no empirical precedent | CRIT → Resolved | **Acceptance gate softened to ≤5% Phase 1; ≤1% Phase 1.5 stretch per Bean directive** |
| F-AP-3 — "Hybrid block" is renamed "container-shaped composite" | HIGH | Acknowledged honestly in §1 point 3 |
| F-AP-5 / F-SC-12 / F-SC-6 — Cross-DB invariants undefined | HIGH | FR-22-8.1 defines authoritative source + write destination per logical entity |
| F-AP-6 / F-SC-4 / F-SC-5 / F-SC-7 — Stale cross-doc references | HIGH | **Commit 0.0 is now the gate for Spec 22 status flip from draft → active**; touches 11 of the 18 docs |
| F-PE-5 — Tier C covers 0 rows in current DB | HIGH | **RESOLVED via Tier C deletion (D85 2026-05-27).** Original v0.3 mitigation kept Tier C wired-but-dormant; qc-council Rater B + Bean directive removed it entirely. Re-introduction gated on parking entry `P-SGS-UPDATE-ROLE-DETECTION-IMPROVE` generating real Tier C inputs. |
| F-PE-7 — Multi-SGS-class disambiguation unspecified | HIGH | FR-22-1 row added + `_pick_primary_sgs_block` tiebreaker named |
| F-PE-8 — packSizes array-of-objects has no resolution | HIGH | FR-22-2.5 (Array-of-objects resolution) added |
| F-RA-3 — wp-blocks.py adversarial test corpus | HIGH | Required in Commit 0.2 |
| F-RA-5 — Parallel render-helpers.php collision | HIGH | FR-22-6.1 coordination protocol forbids shared-file edits in parallel agents |
| F-SC-3 — FR-22-2 + FR-22-5 same logic, no authority declared | HIGH | FR-22-5 explicitly says "SAME function call as FR-22-2 — single authoritative implementation in db_lookup.py" |
| F-SC-8 — FR-22-3 contains pseudocode not contract | HIGH | Pseudocode moved to Appendix A (§13); FR-22-3 is now input/output contract |
| F-AP-7 — Stage 2 bypass behaviour underspecified | MED | FR-22-12 added — Stage 2 still produces artefact even when walker bypasses top_pick |
| F-AP-8 / F-RA-6 — Commit 1.2 packed; Phase 2/3 sequencing | MED | Phase 1 split into 1.1/1.2/1.3/1.4/1.5; FR-22-6.1 sequences Phase 2 → Phase 3 |
| F-RA-7 — decisions.md / mistakes.md pruning safeguards | MED | Phase 5 explicit "modernised, not deleted when lesson applies"; git preserves |
| F-RA-8 — Cross-client validation re-opens accepted gate | MED | Cross-client added per FR-22-9 with regression check against Mama's pipeline |
| F-RA-9 — assign-canonical.py golden corpus | MED → DROPPED (D84, 2026-05-27) | Golden corpus made obsolete by structural guardrail (script refuses `derived_selector IS NULL` input). See F-RA-1 row above. |
| F-RA-10 — "Preserved" claims need verification | MED | §5 Survives + FR-22-12 (Stage 2 artefact production guaranteed) |
| F-SC-9 — Parallel-session statement is planning note | MED | Moved from FR-22-6 body to FR-22-6.1 (operational protocol) + §7 Phase 2 implementation notes |
| F-SC-10 — FR-22-8 defers interface decision | MED | Performance threshold committed (≤2ms cache-warm, ≤20ms cold) — gate not deferred |
| F-PE-11 — pipeline-stage-gate.py mechanism undefined | MED | R-22-12 cites existing hook by name |
| F-PE-12 — Complex hybrid blocks need separate scoping | MED | Phase 2 description acknowledges per-block design pass for hero / cta-section / mobile-nav |
| F-PE-14 — unresolved log not in Spec 21 | LOW | Spec 21 update is Commit 1.4 (cross-doc impact list) — log paths registered |
| F-RA-11 — No "partial ship" definition | LOW | Phase 1 ≤5% + Phase 1.5 ≤1% IS the partial-ship structure |
| F-SC-13 — direct ≤1% vs HIGH-prob risk | LOW (resolved) | ≤5% accepts the HIGH-prob risk; ≤1% deferred to Phase 1.5 |
| F-SC-14 — FR-22-10 is documentation not FR | LOW | Removed from FR list; folded into §5 stage coverage table |
| F-SC-15 — Missing FR for pass-through | LOW | FR-22-11 added |
| **DROPPED — category errors (5)** | — | F-PE-1, F-PE-6, F-PE-9 (predictions), F-PE-10 (functions-don't-exist critiques against build-spec); F-SC-2 hero-regression sub-claim |
| **PARTIAL — recalibrated** | — | F-PE-2 (wp-blocks.py extension not greenfield), F-PE-13 (32-40h not 31-41h), F-PE-4 (8-15 not 90 hybrid blocks) |

## 16. Ratification gate

Spec 22 status flip from `draft` → `active` requires:

1. Commit 0.0 (cross-doc sync) lands on `main` — closes 11 stale references identified by council
2. Bean visual review of v0.3 + sign-off
3. /docscore on v0.3 returns Grade A
4. This section (§16) checklist marked complete:

```
[X] Commit 0.0 landed (2026-05-26 — 31 files in single commit)
[X] Bean sign-off on v0.4 (2026-05-26)
[X] /docscore returns ≥A- (22/22 scored docs at A 100%; 2 custom doc_types unscored)
[X] Council findings table (§15) all addressed/dropped/recalibrated
```

**ALL 4 BOXES TICKED 2026-05-26.** Spec status flipped from `draft` → `active`. Phase 0.1 (DB enrichment — Tier B ≤72-row backfill per D84 scope correction 2026-05-27) begins next session.
