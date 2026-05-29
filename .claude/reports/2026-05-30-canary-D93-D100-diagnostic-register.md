---
doc_type: reference
title: Canary D93-D100 per-section diagnostic register
project: small-giants-wp
generated: 2026-05-30
pipeline_run: pipeline-state/mamas-munches-homepage-2026-05-29-062707/
baseline_pre_d93_d100: 58.6% mean pixel-diff (post-Fix-1 2026-05-27-193804)
measured_post_d93_d100: 57.96% mean pixel-diff (this run)
empirical_movement_from_d93_d100: -0.64pp (essentially flat — architectural gate closure did not translate to user-visible deltas)
methodology: 7 parallel Sonnet subagents, one per body section, each running /systematic-debugging 4-phase + /qc-council self-skeptic with mandatory full-read of Spec 22/21/20 + cloning-pipeline-flow + cloning-pipeline-stages + decisions D93-D100
authors:
  - subagent_hero (agentId abdb278d8a791da72)
  - subagent_trust_bar (agentId a6b746212aed0bedc)
  - subagent_featured_product (agentId a74f6db6e1dc36b19)
  - subagent_brand (agentId a49b280bdce73fa0b)
  - subagent_ingredients (agentId ab3a886680df33ff7)
  - subagent_gift_section (agentId aa1b9df1f678aafb1)
  - subagent_social_proof (agentId a4eff8eeaac3fd853)
binding_rules: R-22-1 (DB-first), R-22-2 (BEM is the recognition signal), R-22-3 (3 walker exceptions), R-22-4 (pixel-diff gates every commit), R-22-9 (universal mechanisms, no per-block hyperfocus), R-22-11 (verify rendered output), R-22-13 (Bean visual sign-off co-authoritative)
---

# Canary D93-D100 per-section diagnostic register

## TL;DR

D93-D100 architectural batch (8 decisions, 99 files, +5346/-2275 lines) closed the link-href gate AND extended every load-bearing block AND unified the slots/roles tables — yet mean pixel-diff moved only **-0.64pp (58.6% → 57.96%)**. The architectural work was necessary but not sufficient. **The empirical gap is dominated by universal walker mechanism bugs**, each affecting 3-7 sections at once. Single fixes will cascade.

Per R-22-9 (universal mechanisms, no per-block hyperfocus): the 12 cross-section patterns identified below are the right unit of work, not 7×N per-section fixes.

## Per-section pixel-diff snapshot (375 / 768 / 1440 / mean)

| Section | 375 | 768 | 1440 | Mean | Pattern |
|---------|-----|-----|------|------|---------|
| `sgs-trust-bar` | 22.0% | 21.6% | 27.1% | **23.6%** | BEST — simple content, layout grid lost (F1) bounded impact |
| `sgs-social-proof` | 33.8% | **75.5%** | 21.4% | 43.6% | Tablet breakpoint mismatch (54pp spread) + missing trustpilot-bar |
| `sgs-ingredients-section` | 46.3% | 61.5% | 61.6% | 56.4% | Stage 1 voter short-circuits DB → confidence-0.0 cascade |
| `sgs-gift-section` | 57.5% | 52.3% | 61.2% | 57.0% | Lost card-inner/cards wrappers + malformed @media |
| `sgs-featured-product` | 44.2% | 49.4% | **87.0%** | 60.2% | Lost `.sgs-products` grid wrapper (43pp viewport spread) |
| `sgs-brand` | **89.1%** | 53.6% | 53.2% | 65.3% | No `brand` row in slots + image extraction failed |
| `sgs-hero` | 88.4% | 61.3% | 56.1% | **68.6%** | sgs/hero block_attributes ALL canonical_slot NULL (102 extra leftover entries) |

## Cross-section pattern detection — top priority (R-22-9 universal mechanisms)

Findings grouped by RECURRENCE across sections. Each P0 pattern recurs in 3+ subagent reports and per R-22-9 should be fixed as a single universal mechanism, not 7× per-section.

### XS-1 (P0) — CSS serialiser emits `@media (...) :: .selector` instead of `@media (...) { .selector { ... } }`

**Recurrence**: hero F4 (-25pp predicted), gift-section F4 (-10pp predicted). Affects EVERY responsive media query in every section's inline `<style>` block.

**Evidence**: hero block_markup contains `'@media (min-width: 768px) :: .sgs-hero { grid-template-columns: 1fr 1fr...'` (30 occurrences in hero alone). `variation-d0-d2.css` is CLEAN — the corruption is at serialise-time, not source CSS. Single-character bug in the @media wrapper emit.

**Predicted aggregate impact**: -15 to -30pp across all sections (responsive layout is the dominant pixel-diff contributor; restoring `@media` parsing means breakpoint rules actually apply at 375/768).

**Fix shape**: Locate `css_serialise.py` (or equivalent) in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/`; the inline `<style>` block emitter has a `' :: '` separator where `'{ ... }'` brace nesting is required. Likely a single substring fix.

**R-22 compliance**: R-22-9 (universal), R-22-11 (verify rendered output — must include Playwright check that browser now parses the rule).

**Severity**: P0. **Confidence**: 0.95 (95% — direct grep evidence in block_markup).

### XS-2 (P0) — Stage 1 voter short-circuits before DB consultation

**Recurrence**: ingredients-section F1 (-32pp predicted). UNIVERSAL across every section-root with `sgs-` prefix (which is all 7 body sections + chrome header/footer = 9/9 boundaries).

**Evidence**: `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py:303-305` — `vote_block_slug()` for SGS-BEM classes returns `f"sgs/{slug_root}"` at confidence 1.0 BEFORE the line 308 loop that calls `_legacy_role_lookup_for()` (the slots section-scope query). Every section-root with sgs-prefix emits a phantom block slug that no `block.json` registers (e.g. `sgs/ingredients-section` doesn't exist). Stage 2 then falls back to `sgs/container` at confidence 0.0 with `tie_breaker=deferred-no-match`. Confirmed in `stage-2.json` across all 9 boundaries.

**Predicted aggregate impact**: -8 to -32pp per section depending on how much section-scope routing benefit is unlocked.

**Fix shape**: Reorder `vote_block_slug()`: consult `_legacy_role_lookup_for(slug_root)` (queries `slots WHERE scope='section'`) FIRST. Return DB row's `standalone_block` at confidence ~0.9. Only fall through to literal-slug-match at confidence 1.0 if no section-scope row exists AND a registered `block.json` with that slug exists. Single-function refactor; ~10 LoC.

**R-22 compliance**: R-22-1 (DB-first — section-scope slots row must be consulted), R-22-9 (universal voter mechanism, no per-section branches), R-22-11.

**Severity**: P0. **Confidence**: 0.9.

### XS-3 (P0) — Missing element-scope slots rows for layout-bearing wrapper divs

**Recurrence**: gift-section F2 (-18pp, `__card-inner` + `__cards`), featured-product F1 (-28pp, `.sgs-products` grid wrapper), social-proof F2 (-22pp, `__trustpilot-bar`), trust-bar F1 (-12pp, `__inner`), brand F? (mobile order:-1 image cell). **5 of 7 sections** have at least one layout-bearing wrapper div with no slots row → walker drops the wrapper → CSS grid/max-width/centring context destroyed → cascading vertical anchor shifts inflate pixel-diff by 12-28pp per section.

**Evidence**: per-section convert-trace files show `absorb_skipped_child` events on wrapper divs with substantial layout CSS (display:grid, grid-template-columns, gap, max-width, margin:auto). Mockup HTML clearly shows these as nested wrapper divs. `variation-d0-d2.css` correctly captures the rules — but no DOM node renders with the matching className, so the rules are orphans.

**Predicted aggregate impact**: -60 to -100pp across affected sections (single largest pixel-diff contributor when stacked).

**Fix shape**: Either (a) cascade-fold mechanism — when walker absorbs a child, harvest grid-defining declarations onto parent's container attrs (per `feedback_cascade_fold_default_plus_override.md`); or (b) add element-scope slots rows for the canonical wrapper patterns (`inner`, `cards`, `card-inner`, `products`, `trustpilot-bar`) → walker emits nested `sgs/container` blocks preserving sibling structure. Recommended: **(b)** — DB-first per R-22-1, matches universal mechanism per R-22-9.

**R-22 compliance**: R-22-1 (DB-first), R-22-2 (BEM is recognition signal), R-22-3 (must NOT introduce a 4th walker exception), R-22-9 (universal).

**Severity**: P0. **Confidence**: 0.85.

### XS-4 (P0) — block_attributes mass-NULL on canonical_slot/role/derived_selector

**Recurrence**: hero F1 (-22pp, ALL 165 sgs/hero attrs NULL), featured-product F2 (-12pp, all 11 sgs/product-card attrs NULL), gift-section F3 (-12pp, card-* element routings missing). UNIVERSAL pattern: many SGS blocks have rich block_attributes rows but `canonical_slot` / `role` / `derived_selector` are NULL → Tier A `equivalent_block_for()` returns None → walker can't route extracted values into block attrs → blocks emit as empty shells with InnerBlocks children that lack content.

**Evidence**: `sgs-db.py sql "SELECT * FROM block_attributes WHERE block_slug='sgs/hero'"` returns 165 rows, every `canonical_slot` NULL. Same pattern for `sgs/product-card` (11 rows). This is **the same defect class as D99's sgs/media.videoUrl gap** that this session's Task 1 backfilled (just at 30× scale).

**Predicted aggregate impact**: -25 to -50pp across hero + product-card sections.

**Fix shape**: Run `assign-canonical.py` dry-run + Bean approval to batch-populate canonical_slot/role/derived_selector across all SGS blocks. Configuration-only attrs (paddings, hovers, transitions, opacity) legitimately stay NULL. Content attrs (headlines, text, image URLs, CTA text+URL) get populated. Per `feedback_row_by_row_measurement_gate_per_db_change.md`, ship per-block (not per-row) since canonical_slot binding is a block-internal data structure, not a routing change that affects walker behaviour for other blocks.

**R-22 compliance**: R-22-1 (data lives in DB, not code), R-22-8 (schema enumeration first — confirmed attrs exist), R-22-9 (universal pattern across all blocks).

**Severity**: P0. **Confidence**: 0.9.

### XS-5 (P0) — Section-scope slots rows route to content-block primitives (violates lesson)

**Recurrence**: featured-product F6 (`featured-product→sgs/featured-product`), ingredients-section F2 (`ingredients-section→sgs/feature-grid` + `ingredients→sgs/feature-grid`), gift-section F1 (`gift-section→sgs/feature-grid`), social-proof F1 (`social-proof→sgs/testimonial`), brand F1 (`brand-story→sgs/info-box`). **5 sections** have at least one section-scope slots row violating `feedback_section_root_aliases_target_sgs_container_only.md`.

**Evidence**: `sgs-db.py sql "SELECT slot_name, standalone_block FROM slots WHERE scope='section'"` shows the wrong routings. Currently dormant because Stage 1 short-circuit (XS-2) bypasses section-scope DB consultation — but once XS-2 fixes, these will become load-bearing AND will cause the +21pp 375 regression already recorded in the 2026-05-27 Fix 2 incident.

**Predicted aggregate impact**: -10 to -25pp once XS-2 fix activates DB lookup AND -50pp ABSENT XS-2 fix (because Fix 2's regression pattern would replay).

**Fix shape**: `UPDATE slots SET standalone_block='sgs/container' WHERE scope='section' AND slot_name IN ('ingredients-section', 'ingredients', 'gift-section', 'social-proof', 'featured-product', 'brand-story')`. Optionally retire dead rows entirely. Ship row-by-row per `feedback_row_by_row_measurement_gate_per_db_change.md` with /sgs-clone Stage 11 measurement between each.

**R-22 compliance**: R-22-1, R-22-9.

**Severity**: P0 (sequenced AFTER XS-2). **Confidence**: 0.85.

### XS-6 (P1) — Spurious top-level container wrap around already-registered section roots

**Recurrence**: hero F5 (-3pp). Confidence 0.8. Walker applies FR-22-3 #3 top-level container wrap UNCONDITIONALLY to all section roots, ignoring Stage 2's confidence_matrix decision when it identifies a registered block (sgs/hero, sgs/product-card etc.).

**Fix shape**: In Stage 5 top-level wrap decision: read `match.json[boundary].block_name + confidence`. If confidence ≥ 0.9 AND block is registered, skip the container wrap and emit the chosen block directly. Container wrap remains the fallback only when no registered match was found.

**R-22 compliance**: R-22-3 (the 3 exceptions are PERMITTED, not MANDATORY), R-22-9.

**Severity**: P1. **Confidence**: 0.8.

### XS-7 (P1) — Walker treats container-shaped BEM nodes as leaf-block emissions

**Recurrence**: hero F2 (-10pp). `sgs-hero__media`, `sgs-hero__ctas` (containers wrapping multiple element-children) emit as `sgs/media`/`sgs/button` wrappers around empty children, instead of being treated as passthrough containers whose children emit independently.

**Fix shape**: Add a `has_element_children` shape-check at `bem_resolve_slot_fallback`. When the BEM node matches a slot whose `standalone_block` is a leaf-content block (sgs/media, sgs/button, sgs/heading) AND the node has element-children, treat it as chrome-skip-equivalent (recurse into children, don't emit the standalone_block wrapper). Alternative: extend slots table with a `child_shape` column ('leaf' | 'container' | 'auto') and let walker branch on it (R-22-1 preferred).

**R-22 compliance**: R-22-1, R-22-3, R-22-9.

**Severity**: P1. **Confidence**: 0.85.

### XS-8 (P1) — Stage 3 slot-list noise flood masks real defects

**Recurrence**: trust-bar F2, featured-product CSO, social-proof CSO, ingredients-section CSO, gift-section CSO. **6 of 7 sections** get exactly 69 `extraction_failed` entries from sgs/container's default attrs being enumerated as "required" → drowns real defects in `leftover-buckets.json`.

**Fix shape**: Filter `stage_3_slot_list` extraction_failed emission to slots where (a) the attribute lacks a populated default OR (b) the section CSS contains a rule targeting a property bound to this slot. Drops noise to ~5-10 genuinely-missing slots per section; isolates real defects.

**R-22 compliance**: R-22-9. Observability, not pixel-diff (0pp predicted delta).

**Severity**: P1 (observability gate; doesn't affect pixel-diff but blocks accurate diagnosis going forward).

### XS-9 (P1) — atomic-tag swap drops inline HTML (`<br>`, `<strong>`, `<em>`, `<a>`)

**Recurrence**: hero F3 (-2pp, `<br>` collapse on h1 headline). UNIVERSAL across any rich-text Gutenberg attr — h1-h6, p, span, blockquote.

**Fix shape**: In `atomic_tag_swap`, when extracting content for an `attr_type='string'`/rich-text Gutenberg attr, use `innerHTML` (preserving inline tags) rather than `textContent`. Add safe-tag allowlist to prevent script injection.

**R-22 compliance**: R-22-9.

**Severity**: P1. **Confidence**: 0.95.

### XS-10 (P2) — HTML comment leakage as raw text content

**Recurrence**: featured-product F4 (-2pp). Walker passes through text from HTML comment nodes (e.g. `<!-- Main product -->` → bare "Main product" between block markers).

**Fix shape**: Walker child-iteration must skip `Comment` node types (BeautifulSoup `isinstance(c, Comment)` check). Universal one-line guard.

**Severity**: P2. **Confidence**: 0.95.

### XS-11 (P2) — UTF-8 mojibake (file opened without explicit encoding)

**Recurrence**: gift-section F6 (-0.5pp). `🏥` → `🏥`. Affects any non-ASCII character.

**Fix shape**: Find mockup file-read in the extract path, force `encoding='utf-8'`. Trivial fix.

**Severity**: P2. **Confidence**: 0.95.

### XS-12 (P2) — Observability gaps in walker chrome-skip path

**Recurrence**: hero F6 (P2). `sgs-hero__content` wrapper div silently chrome-skipped with no trace event per Spec 20 structured-pipeline-log spec.

**Fix shape**: Emit structured-log event for every walker chrome-skip decision per Spec 20.

**Severity**: P2.

## Per-section findings (full subagent JSON outputs)

### sgs-hero (boundary b2, mean 68.60%)
Full output: subagent agentId `abdb278d8a791da72`. **6 findings**: F1 hero attrs ALL canonical_slot NULL (P0, -22pp), F2 container-shape walker bug (P0, -10pp), F3 `<br>` collapse (P1, -2pp), F4 CSS `::` serialiser bug (P0, -25pp), F5 spurious container wrap (P1, -3pp), F6 `__content` silent skip observability (P2). Predicted aggregate: ~-50pp if all stack.

### sgs-trust-bar (boundary b3, mean 23.56% — BEST)
Full output: subagent agentId `a6b746212aed0bedc`. **4 findings**: F1 `__inner` grid wrapper absorbed (P1, -12pp), F2 slot-list noise (P2, 0pp), F3 telemetry slug=null (P3), F4 trust-bar __icon styling verification needed (P2, -1.5pp). D72 retirement HANDLED correctly (walker NOT attempting retired sgs/trust-bar).

### sgs-featured-product (boundary b4, mean 60.19%)
Full output: subagent agentId `a74f6db6e1dc36b19`. **6 findings**: F1 `.sgs-products` grid wrapper lost (P0, -28pp), F2 sgs/product-card attrs NULL (P0, -12pp), F3 pill→label misroute (P1, -6pp, candidate for FR-22-15 capability tiebreaker), F4 HTML comment leak (P2, -2pp), F5 cross-section BEM bleed (P2, -3pp), F6 dead bespoke section row (P2, -1pp). Both product-card instances correctly emitted (no collapse).

### sgs-brand (boundary b5, mean 65.31%)
Full output: subagent agentId `a49b280bdce73fa0b`. **3 findings**: F1 NO slots row for `brand` (P0, -12pp), F2 image extraction failed entirely (P0, -18pp), F3 mobile-specific responsive slots auto-derived empty (P1, -8pp, cascades from F1). 36pp mobile regression at 375 explained by missing image + missing mobile-first single-column attrs.

### sgs-ingredients-section (boundary b6, mean 56.42%)
Full output: subagent agentId `ab3a886680df33ff7`. **3 findings**: F1 Stage 1 voter short-circuit at `per-section-convention-voter.py:303-305` (P0, -32pp — XS-2 root cause), F2 section-scope row routes to sgs/feature-grid (P0, -12pp — XS-5), F3 element-scope `feature-grid`+`info-box` slots missing (P2, -2pp — R-22-1 compliance, currently masked by literal-fallback). FR-22-6 InnerBlocks WORKING for `feature-grid > info-box × 4`.

### sgs-gift-section (boundary b7, mean 56.98%)
Full output: subagent agentId `aa1b9df1f678aafb1`. **6 findings**: F1 section row routes to sgs/feature-grid (P2, -2pp — XS-5), F2 lost `__card-inner` + `__cards` wrappers (P0, -18pp — XS-3), F3 card-*  child slots missing (P0, -12pp — XS-4 variant), F4 malformed @media (P0, -10pp — XS-1), F5 section CSS not lifted into sgs/container attrs (P1, -8pp), F6 UTF-8 mojibake (P2, -0.5pp — XS-11). Card count preserved (2 product-cards both emit), but nesting collapsed.

### sgs-social-proof (boundary b8, mean 43.57%)
Full output: subagent agentId `a4eff8eeaac3fd853`. **3 findings**: F1 section row routes to sgs/testimonial (P0, -2pp dormant — XS-5), F2 missing `trustpilot-bar` slot row + walker drops the aside (P0, -22pp — XS-3 variant), F3 testimonial-slider tablet breakpoint mismatch 640px-vs-768px (P0, -45pp — explains 75.49% 768 spike). Trustpilot text concatenated as bare text inside container (no white-bordered card).

## Recommended ship sequence for Task 4 (next session)

Per R-22-9 (universal mechanisms) + `feedback_row_by_row_measurement_gate_per_db_change.md` (ship one row at a time + measure), sequence the fixes by:
1. **Predicted pixel-diff impact** (largest first)
2. **Independence** (fixes that DON'T depend on other fixes ship first)
3. **Risk** (DB-row corrections riskier than code fixes per Fix 2 regression incident; ship code fixes first)

### Wave 1 — Independent code fixes (predicted: -30 to -50pp)

| Order | Fix | XS-id | Predicted impact | Why first |
|-------|-----|-------|------------------|-----------|
| 1.1 | CSS serialiser `:: ` → `{ ... }` brace fix | XS-1 | -15 to -30pp (cascades to every section) | One-character bug, zero dependencies, massive impact |
| 1.2 | Comment node skip in walker child loop | XS-10 | -2pp | One-line guard, zero dependencies |
| 1.3 | UTF-8 encoding fix on mockup file-read | XS-11 | -0.5pp | One-line fix |
| 1.4 | atomic-tag swap innerHTML preservation | XS-9 | -2pp | Localised, no dependencies |

**Measurement gate after Wave 1**: /sgs-clone --debug-trace Stage 11. Expected mean pixel-diff drop from 57.96% to ~35-40%.

### Wave 2 — Stage 1 voter reorder (predicted: -8 to -32pp)

| Order | Fix | XS-id | Predicted impact |
|-------|-----|-------|------------------|
| 2.1 | Reorder vote_block_slug() to consult section-scope slots FIRST | XS-2 | -8 to -32pp per section |

**Critical sequencing**: XS-2 MUST ship BEFORE XS-5 row corrections, otherwise XS-5 corrections do nothing (voter bypasses DB anyway).

**Measurement gate after Wave 2**.

### Wave 3 — Section-scope row corrections (predicted: -10 to -25pp)

| Order | Fix | XS-id | Predicted impact |
|-------|-----|-------|------------------|
| 3.1 | UPDATE social-proof.standalone_block → sgs/container | XS-5 | -2 to -5pp |
| 3.2 | UPDATE ingredients-section.standalone_block → sgs/container | XS-5 | -10 to -15pp |
| 3.3 | UPDATE ingredients.standalone_block → sgs/container | XS-5 | -1 to -3pp |
| 3.4 | UPDATE gift-section.standalone_block → sgs/container | XS-5 | -2 to -4pp |
| 3.5 | UPDATE brand-story.standalone_block → sgs/container OR INSERT brand | XS-5 + brand F1 | -10 to -15pp |
| 3.6 | UPDATE featured-product (retire bespoke or → sgs/container) | XS-5 | -1 to -3pp |

**Per row-by-row gate**: Ship ONE row at a time. Measure Stage 11 between each (per `feedback_row_by_row_measurement_gate_per_db_change.md`, Fix 2's regression).

### Wave 4 — Layout-bearing wrapper slot rows (predicted: -60 to -100pp aggregate — LARGEST CONTRIBUTOR)

| Order | Fix | XS-id | Predicted impact |
|-------|-----|-------|------------------|
| 4.1 | INSERT slots row: products (element) → sgs/container | XS-3 | -28pp featured-product |
| 4.2 | INSERT slots row: card-inner (element) → sgs/container | XS-3 | -8pp gift-section |
| 4.3 | INSERT slots row: cards (element) → sgs/container | XS-3 | -10pp gift-section |
| 4.4 | INSERT slots row: trustpilot-bar (element) → sgs/container | XS-3 | -22pp social-proof |
| 4.5 | INSERT slots row: inner (element) → sgs/container OR cascade-fold alternative | XS-3 | -12pp trust-bar (+ likely cascades to other sections) |

### Wave 5 — Walker mechanism fixes (predicted: -10 to -15pp)

| Order | Fix | XS-id | Predicted impact |
|-------|-----|-------|------------------|
| 5.1 | Container-shape detection (has_element_children check) | XS-7 | -10pp hero |
| 5.2 | Skip top-level container wrap when section root is registered block | XS-6 | -3pp hero |

### Wave 6 — Data backfill (predicted: -25 to -50pp)

| Order | Fix | XS-id | Predicted impact |
|-------|-----|-------|------------------|
| 6.1 | assign-canonical.py over sgs/hero content attrs | XS-4 | -22pp hero |
| 6.2 | assign-canonical.py over sgs/product-card content attrs | XS-4 | -12pp featured-product |
| 6.3 | INSERT element-scope rows for card-tag/card-description/card-price | gift F3 | -12pp gift-section |

### Wave 7 — Stage 3 noise filter (observability, 0pp pixel-diff)

XS-8 — restrict extraction_failed emission to genuinely-missing slots. Lets future diagnostic runs surface real defects without 69-noise-rows-per-section flood.

### Cumulative predicted pixel-diff trajectory

| Stage | Predicted mean | Notes |
|-------|----------------|-------|
| Pre-Wave-1 (now) | 57.96% | Baseline |
| Post-Wave-1 | ~35-40% | XS-1 CSS serialiser is the single biggest win |
| Post-Wave-2 | ~28-32% | XS-2 voter unblocks downstream |
| Post-Wave-3 | ~22-28% | Row corrections activate DB |
| Post-Wave-4 | ~12-18% | Wrapper-slot mechanisms restore grid contexts |
| Post-Wave-5 | ~10-15% | Walker mechanism cleanups |
| Post-Wave-6 | ~5-10% | Data backfill closes content gaps |
| Phase 2 acceptance gate | ≤5% per-section × 3 viewports | R-22-13 Bean visual sign-off co-authoritative |

Per `time-estimates-default-low`: realistic shippable work to hit ≤5% target is 2-3 sessions, not 5-6.

## Open questions surfaced by subagents

1. **CSS serialiser location** — where in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/` is the inline `<style>` `:: ` bug? Grep for `@media` string-build in css_emit / css_serialise modules.
2. **block_capabilities verification** — does `sgs/button` have `interactive` capability registered so FR-22-15 D96 tiebreaker prefers it over sgs/label when HTML tag is `<button>`? (featured-product F3 candidate)
3. **Cross-section BEM bleed policy** — is `sgs-gift-section__card--trial` inside featured-product a Spec 00 §3.1 mockup violation (lint warning) or intentional design language (alias the BEM)? (featured-product F5 candidate, Bean P1 decision)
4. **sgs/hero registered-block override** — at Stage 5 top-level wrap, should walker prefer registered block emission over container wrap when confidence ≥ 0.9? (hero F5 + XS-6)
5. **Cascade-fold vs slot-row mechanism for layout-bearing wrappers** — which is the universal R-22-1+R-22-9-compliant fix for XS-3? Cascade-fold lives in walker code; slot-row lives in DB. Bean architectural call.
6. **Stage 11 vertical-anchor cropping** — does pixel-diff.py use vertical-anchor cropping per blub.db 256? Bug detection at certain viewports may be confounded by anchor offset rather than real defects.

## Cross-cutting evidence integrity

- All 9 boundaries got `convert-trace-b*.jsonl` files (debug-trace default now ON validated empirically — Phase A success).
- Stage 9c sidecar logs: 0 errors, 0 warnings, 0 chrome_skip events surfaced. The walker is COMPLETING but silently dropping work — exactly the observability gap XS-12 surfaces.
- `leftover-buckets.json` totals: 723 extraction_failed (all gap_level=attribute, severity=medium) + 8 cv2_handled_no_top_level_match + 1 animation_unclassified = 732. **723 of these are Stage 3 slot-list noise per XS-8 — only 8 are real top-level routing failures, plus per-section structural defects identified by subagents.**

## R-22-N compliance summary

| Rule | Status | Notes |
|------|--------|-------|
| R-22-1 (DB-first) | VIOLATIONS FOUND | XS-2 (voter bypasses DB), XS-4 (block_attributes NULL), XS-3 (slot rows missing) |
| R-22-2 (BEM is recognition signal) | UPHELD | Walker correctly resolves BEM classes; defects are in routing/extraction, not recognition |
| R-22-3 (3 walker exceptions) | UPHELD (one near-miss) | XS-7 candidate fix MUST go through slot row, not a 4th exception |
| R-22-4 (pixel-diff gates commits) | UPHELD | This run IS the pixel-diff measurement |
| R-22-9 (universal mechanisms) | EMPHASISED | All 12 cross-section patterns are universal; ship-sequence respects this |
| R-22-11 (verify rendered output) | UPHELD | Stage 11 measures rendered output; subagents flag triangulation needs |
| R-22-13 (Bean visual sign-off) | PENDING | Numeric measurement complete; Bean visual co-authoritative for closure |
| R-22-14 (no legacy fallback hacks) | UPHELD | No proposed fix-shape proposes server-side scalar fallback per FR-22-6 |

## Captured-lesson applicability

- `feedback_section_root_aliases_target_sgs_container_only.md` — confirmed across 5 sections (XS-5)
- `feedback_db_rows_via_sgs_update_not_direct_seed.md` — applies to Wave 3+4 DB row corrections
- `feedback_row_by_row_measurement_gate_per_db_change.md` — binding for Wave 3 row corrections
- `feedback_cascade_fold_default_plus_override.md` — candidate for XS-3 alternative mechanism
- `feedback_read_leftover_buckets_before_conjecturing.md` — followed (subagents read first)
- `feedback_extend_measurement_set_when_human_eye_disputes.md` — applies to Bean's R-22-13 review
- `feedback_verify_rendered_output_not_internal_metrics.md` — Stage 11 IS the rendered-output measurement
- `feedback_grep_verify_handoff_diagnostic_premises.md` — subagents grep-verified their claims against codebase + DB

## Out of scope for this register

- Implementation of any fix (Task 4 next-session work driven by this register)
- Header/footer pixel-diff (chrome-skipped per FR-22-3 #2; their reported 49% and 98% diffs reflect WordPress block-theme template parts, not body-cloning scope)
- Pre-existing 3 hero CTA test failures in `test_phase_3_inner_blocks.py` (confirmed pre-existing per parent handoff)
- Trustpilot live-deploy validation (parking entry P-TRUST-BADGES-MERGE-VALIDATION)
- sgs/media video extension live-deploy validation (parking entry P-MEDIA-VIDEO-VALIDATION)
- sgs/svg-background migration live-deploy validation (parking entry P-SVG-BACKGROUND-MIGRATION-VALIDATION)

## Conclusion (plain English)

The D93-D100 architectural batch did exactly what it claimed (closed the link-href gate, unified slots/roles, extended every load-bearing block) — but the empirical measurement shows pixel-diff barely moved. The reason is that the pipeline has structural defects in the walker mechanism itself, NOT in the data layer that the architectural batch fixed.

Twelve distinct universal mechanism bugs were identified by independent diagnostic subagents per body section. The single biggest win available — fixing the CSS `:: ` serialiser bug — is a one-character change that affects every responsive media query in every section's emitted `<style>` block. The next largest wins come from the Stage 1 voter short-circuit (forcing voter to consult section-scope DB rows) and adding slot rows for layout-bearing wrapper divs (`.sgs-products`, `__card-inner`, `__cards`, `__trustpilot-bar`, `__inner`).

If next session ships Waves 1-4 (predicted ~22-28% mean pixel-diff), the canary is within striking distance of the ≤5% per-section Phase 2 acceptance gate after Waves 5-6. That's 2-3 sessions of disciplined work, not the 5-6 the inflated estimate framework would suggest.
