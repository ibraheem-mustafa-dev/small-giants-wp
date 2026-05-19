---
doc_type: spec
spec_id: 16
spec_version: 0.3
project: small-giants-wp
title: Deterministic Slot-Aware Converter — Spec 15 §7 Stages 3-7 Implementation
status: PARTIAL CLOSURE 2026-05-15 — Phase 1 + Phase 7 architectural shipped; Phase 4 visual gate redefined as per-section; Phase 8 section-by-section work pending. **2026-05-18 ADDENDUM: P-WP-ALIGNMENT-WIDTH-SYSTEM closed (3 commits, see decisions.md D2+D3).** Converter `_lift_root_supports_to_style` now emits semantic `widthMode` (default/wide/full) instead of always lifting raw max-width to `style.dimensions.maxWidth`. New helpers `_detect_client_layout_widths` + `_write_client_layout_widths` + `_load_theme_widths` + `_match_theme_width` (±5% tolerance) add a one-time pipeline pass before the per-section walker — see `.claude/cloning-pipeline-flow.md` "Stage 0.8" for the annotated flow. Module-level constants: `_LIFT_CONTEXT`, `_WIDTH_MATCH_TOLERANCE_PCT=5.0`, `_SGS_BEM_BLOCK_ROOT_RE` (segmented kebab, blocks `--` modifier shapes — see common-wp-styling-errors.md Section T), `_FULL_BLEED_WIDTH_VALUES`. Universal-benefit: zero client literals in framework code.
session_date: 2026-05-15
authors: Bean + Claude (Opus 4.7)
status_history:
  - 2026-05-14: v0.2 ACCEPTED, Phase 1 prototype shipped, Phases 2-6 queued
  - 2026-05-15: v0.3 PARTIAL CLOSURE — Phase 7 architectural work shipped (commits 06eca194 + 19c89f0f on feat/spec-16-converter-v2-rollout, pushed not merged); visual gate redefined as PER-SECTION (not full-page) per binding methodology rule (blub.db row 256); legacy extract.py retirement deferred to Phase 8 + visual-gate-close; heritage-strip block retired in favour of Brand Story PATTERN (Bean's 2026-05-15 redirect, completed in P-PHASE8-1 commit 9a32a164)
  - 2026-05-18: Phase 9 PRE-WORK shipped — evidence infrastructure for section-by-section walkdown (commits 8b69bc0a + 10a93d87 + 397295c3 on main). Three new layers behind --debug-trace flag: per-section convert-trace-<boundary>.jsonl (walker decisions + attr skips + DB lookup misses), per-section expected-rules-<boundary>.jsonl baseline (parse_css + soupsieve), split-metric pixel-diff (suffix-anchored attribute-coverage% via property_suffixes DB). Trace lifetime discipline: convert_section wraps v3.set_trace() in try/finally so the module-level _TRACE singleton resets at exit. Provably side-effect-free (Step 4 shakeout: byte-identical extraction with trace on/off across all 10 Mama's sections). 4-rater /qc panel ratified post-fix.
closure_gate_definition_v0_3:
  rule: "Closure unit is the SECTION, NOT the page. Each section closes independently at <= 1% pixel diff across 375 / 768 / 1440 viewports via `scripts/pixel-diff.py --selector .sgs-{section}`. The page closes when ALL sections close."
  rationale: |
    Full-page pixel diff has a structural noise floor of ~30-45% baked in by
    WP-block-wrapper differences (`<section class="sgs-container wp-block-sgs-container ...">`
    vs mockup's bare `<div class="sgs-products">`) plus intentional UX choices
    (carousel vs stacked, theme.json tokens vs inline CSS values). No "perfect"
    converter can reach 1% full-page diff with this comparison shape. Per-section
    cropped diff strips the wrapper noise — it's the honest converter-quality
    measurement. Captured as binding rule (blub.db row 256) after the 2026-05-15
    session ran 12 full-page passes plateaued at ~39% before this realisation.
  enforcement: |
    Phase 8 section-by-section workflow + `scripts/pixel-diff.py --selector` flag
    + `scripts/screenshot-diff-helper.js --selector` flag are the standard.
    Full-page diff retained for trend tracking only — not as the closure gate.
mandatory_methodology_rules:
  - rule: "Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing about converter quality or pixel-diff causes."
    captured_at: blub.db row 254
    why: "The orchestrator already classifies every gap by (section, slot, reason) into 5 buckets. The 2026-05-15 session lost ~6 hours spot-fixing pixel-diff without consulting this data. Spot-fixes without bucket evidence are forbidden."
  - rule: "Multi-model /qc panel (Sonnet + Haiku + Gemini Flash + Cerebras) BEFORE every commit touching converter / pipeline / SGS block logic."
    captured_at: blub.db row 255
    why: "Single-Sonnet implementer review missed 4+ hyperspecific patterns in the 2026-05-15 session. The panel catches what the implementer's context blinds them to. extract.py's death-by-hyperspecificity is the precedent this panel exists to prevent."
relationship_to_spec_15: |
  Spec 16 is the concrete implementation of Spec 15 §7 Stages 3-7. Spec 15
  defined the convention layer (SGS-BEM), the mapping layer (slot synonyms +
  property suffixes + modifier suffixes), the data layer (block_attributes
  with canonical_slot column populated by /sgs-update Stage 4), and the 10-
  stage pipeline shape. Spec 16 specifies the actual converter module that
  consumes the Layer 2 + Layer 3 data Spec 15 created.
  
  Spec 15 §7.2 already commits to retiring overrides/hero.py "after Phase 3
  of this spec lands (canonical-slot data populated in sgs-db)". That data
  IS now populated. Spec 16 delivers the deletion.

  Spec 15 stays canonical for L0-L3, Stage 0-2, Stage 8-9, and the
  /sgs-update pipeline. Spec 16 owns Stages 3-7 (extraction → token snap →
  default-inherit → emission → render) and the converter module surface.
references:
  - .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (canonical L0-L3 + §7 outline)
  - .claude/cloning-pipeline-flow.md (annotated stage map + script status)
  - .claude/tooling-map.md (per-script inventory)
  - .claude/skills-commands-map.md (skill + command catalogue)
  - .claude/db-tables-map.md (DB schema R/W matrix)
captured_corrections_this_session:
  - container-mandatory-at-section-mandatory-only-at-section
  - status-built-filter-falls-through-doesnt-block
  - tag-fallback-wins-over-bem-class
  - composite-claims-slot-first-then-standalone
  - pass-through-wrappers-lift-css-to-variation
  - retire-extract-py-this-cycle-not-deferred
---

# Spec 16 — Deterministic Slot-Aware Converter

## 1. Purpose + relationship to Spec 15

Implement Spec 15 §7 Stages 3-7 as a single recursive DOM walker that consumes the canonical_slot / role / derived_selector data that `/sgs-update` Stage 4 already populates in `block_attributes`.

The implementation **replaces**:
- `tools/recogniser-v2/extract.py` (731 lines) — per-block role-strategy dispatcher
- `tools/recogniser-v2/extract_strategies.py` (303 lines) — 11 role strategies
- `tools/recogniser-v2/overrides/hero.py` (908 lines) — per-block hand-coded override

Total legacy code retired: ~1,942 lines. Replacement: ~1,140 lines across 3 Python modules (db_lookup.py ~280, convert.py ~680, convert_page.py ~170 — verified Haiku QC 2026-05-14). The retired code lives in `tools/recogniser-v2/` which is kept as a deprecated path with a deletion gate in Phase 6.

## 2. The 5 architectural rules (accepted 2026-05-14)

### R1 — Container rule (refined per Bean 2026-05-14)

> sgs/container is **MANDATORY** at the top-level section boundary (one container per section, wrapping the whole pattern).
> sgs/container is **AVAILABLE** anywhere else when a container block's functionality (background, max-width, columns, shape dividers, etc.) provides utility.
> sgs/container is **NOT auto-emitted** for nested wrappers without functionality. Those pass through.

The converter only auto-emits sgs/container at the top-level section. Operators / pattern authors can still nest containers manually when wanted. Captured 2026-05-14.

### R2 — Atomic-tag precedence

> Tag-fallback ALWAYS wins over BEM class-based routing for atomic tags.

`<img class="sgs-product-card__image">` → core/image, not a slot-wrapper container. The class travels as className AND is lifted into the parent block's typed attribute when the parent claims the slot. Captured 2026-05-14.

### R3 — Slot-claim precedence

> A composite block claims its canonical slot ONLY when the descendant is inside its block-root. Outside the parent block, the canonical slot routes to its standalone block fallback.

Inside `sgs/product-card`, a `__card-tag` descendant becomes `trialTag` attr. Outside, an unparented `__label` becomes `sgs/label`. Captured 2026-05-14.

### R4 — Status filter (refined per Bean 2026-05-14)

> The block lookup uses `status='built'` only. Drafts referencing blocks that aren't yet built do NOT block conversion — they fall through to `sgs/container` with the source className preserved.

**This is the gap-surfacing mechanism, not a stop gate.** When the operator sees the `className: "sgs-novel-block"` carried on an emitted container, they decide: author the new block, or keep as a styled container. The fall-through preserves both the source intent (className) AND the visual styling (CSS lifted to variation buffer).

The status filter is necessary because emitting `<!-- wp:sgs/<planned-block-not-yet-built> /-->` produces a WordPress "this block contains unexpected or invalid content" error in the editor. Status=`built` ensures every emitted block has working PHP/JS to render it.

### R5 — CSS drives emission (re-architected per Bean 2026-05-14)

> Every CSS rule in the source draft has a guaranteed destination in the converter output. The converter NEVER drops a CSS rule. CSS drives emission decisions.

**The principle:** we're making clones. The whole point is faithful reproduction. A CSS rule that exists in the source MUST end up somewhere in the output where it still binds. The converter has three valid destinations for any given rule:

1. **Markup wrapper carrying the className** — the rule's target class lives on an emitted element. Standard case, no further action.
2. **Typed attribute on the parent block** — the rule's CSS property maps to a typed attribute on the parent emitted block via `property_suffixes` lookup. The value lifts into the attribute; the rule itself doesn't need to ship in variation CSS.
3. **Attribute gap candidate** — the rule's CSS property doesn't currently have a matching typed attribute on the responsible block. The converter writes the gap to `attribute_gap_candidates` (Spec 15 §4.2 table, already exists) with enough context for the operator to author the new attribute.

The converter MUST NOT drop any CSS rule into the void. If options 1-3 all fail (the rule has no parent block AND no atomic emitted wrapper to carry it), that's a converter bug — surface as halt-level.

**Mechanic for option 1 (wrapper emission, CSS-driven):**

When walking a wrapper that wouldn't otherwise emit (no block match, no typed-attr lift available, no canonical-slot standalone), check whether ANY CSS rule in the parsed-CSS dict targets the wrapper's classes. If yes → emit `sgs/container` (or `core/group` per styling needs) carrying the className. The wrapper becomes a markup anchor for the CSS rule. If no → pass-through walk (the original R5 behaviour, now safe because no CSS exists to anchor).

**This corrects the over-aggressive R1 implementation.** R1 says "sgs/container is mandatory at top-level, available elsewhere when its functionality is useful". CSS rules targeting a wrapper class ARE a form of useful functionality — they're explicit layout/styling intent. The converter detects CSS presence and emits the wrapper when needed.

**Mechanic for option 2 (typed-attr lift):**

For each CSS rule lifted at the parent-block level (e.g. `.sgs-hero { padding: 56px; }` while inside the `sgs/hero` block-root):
- Iterate CSS properties; look up `property_suffixes` table for each
- Find the parent block's typed attribute matching the property's role
- If matched: snap value to theme.json token (CSS-token-snap pass, per Gemini Flash QC), lift into the attribute
- If not matched: option 3 fires (gap candidate)

**Mechanic for option 3 (attribute gap candidate):**

The converter writes one row per (block_slug, css_property, raw_value, source_class) to `sgs-framework.db.attribute_gap_candidates`. The Stage 9 coverage report aggregates these into the operator-review.html. Operator decision per gap:
- Author the new attribute on the block.json (recommended) — converter picks it up on the next run
- Author a new pattern that includes a wrapper carrying the class (alternative)
- Mark as "intentional-noop" (accept the styling won't apply — rare and surfaces in the report regardless)

**Why this matters:** the converter becomes a "block schema discovery" tool. Running it on a real client draft tells us exactly what attributes are missing from our catalogue. Over time, the catalogue extends to cover every CSS pattern Bean's drafts use.

## 3. The 9 functional requirements

### FR1 — Block-root slot harvest

For every SGS-BEM draft section whose `.sgs-<block>` matches a registered block (status=built):
- Emit one `<!-- wp:sgs/<block> {attrs} /-->` (self-closing) with attrs lifted from descendants
- Descendant elements with `__<element>` class names lift into the matching attribute via `attr_name_for_slot_or_alias(block_slug, canonical_slot_for(element))`
- Tag-fallback fires for unclassed `<h*>` (lifts to heading-slot attr, generic via DB lookup) and CTA `<a class="sgs-button">` (lifts to ctaText/Url or ctaPrimaryText/Url + ctaSecondaryText/Url depending on schema)
- Array-typed attrs (e.g. `packSizes` on product-card) use special-case extractors

### FR2 — Atomic-tag emission

Per ATOMIC_TAG_MAP:
- `<h1>`–`<h6>` → `core/heading` with `level` and optional `anchor`
- `<p>` → `core/paragraph`
- `<img>` → `core/image` with `url`/`alt`/`width`/`height`; url resolved through media-map
- `<a class*="sgs-button">` → `sgs/button`
- `<button>` → `sgs/button`
- `<span>`/`<div>` with SGS-BEM element resolving to a canonical slot that has a standalone block — route to that block (e.g. `sgs/label` for label/badge/icon)

### FR3 — Pass-through wrapper rule

For any element that doesn't match FR1/FR2 and isn't the top-level section:
- DO NOT emit a sgs/container wrapper
- Walk children, return concatenated child markup joined with newlines
- Lift the wrapper's source CSS rules into the variation buffer (per R5)

### FR4 — Top-level section container

For the outermost section element (called with `is_top_level=True`):
- Emit `sgs/container` with the SGS-BEM class preserved as `className`
- Lift the section-level CSS rules into the variation buffer
- This is the ONLY place the converter AUTO-emits sgs/container

### FR5 — Media-map resolution

Before emitting `core/image` (or any image-bearing typed attr like `sgs/product-card.image`):
- Look up the source `src` basename in the loaded media-map
- If found, substitute the registered WP attachment URL
- If not found, pass the original src unchanged

Hook point: `/image-optimiser` runs at the orchestrator's Stage 4i media-sideload step, not inside the converter.

### FR6 — CSS routing (four-destination policy per R5)

For every CSS rule in the parsed-CSS dict, the converter MUST route it to one of four destinations. Never drop. Never halt.

**Destination 0 — Global/reset rules (added per Sonnet QC 2026-05-14):**

Rules whose selector has NO class component AND targets a global element pass straight to the variation CSS buffer as unscoped global rules. These are NOT halt-level errors — they're legitimate styling intent that belongs at the page/site level.

Includes:
- Element selectors: `body { ... }`, `html { ... }`, bare tag selectors (`h1 { ... }`, `a { ... }`)
- Pseudo-class roots: `:root { --colour: ... }` (CSS custom-property declarations)
- Universal: `* { box-sizing: ... }`
- Pseudo-elements: `::before`, `::after` without a class anchor

Detection rule: parse the selector with `tinycss2` or a simple CSS-selector regex. If NO `.classname` component appears AND the selector is one of the global patterns above → Destination 0. The variation CSS file gets these rules at the top of the file, NOT page-id-scoped (because they ARE global intent).

This destination prevents the converter from halting on legitimate "reset" CSS or theme-wide overrides that have no per-block routing.

**Destination 1 — Typed attribute lift (preferred):**

When the rule targets a class on a descendant inside a block-root, AND the CSS property maps to a typed attribute on that parent block via `property_suffixes`:
- Apply CSS-token-snap to the value (Spec 15 §5.4): look up nearest theme.json token via `design_tokens`; ΔE2000 ≤ 2.0 → snap (confidence 1.0); ≤ 5.0 → snap (0.85); ≤ 10.0 → snap (0.6); > 10.0 → keep raw + flag gap candidate
- Lift the (possibly snapped) value into the typed attribute
- The rule does NOT ship in variation CSS — the block's render.php applies the styling via inline styles or block-level CSS at editor save

**Destination 2 — Markup wrapper carrying className (fallback):**

When the rule targets a class on a wrapper that has NO typed-attr destination (block doesn't expose a matching attr, OR the wrapper isn't inside any block-root):
- Emit a markup wrapper for that node (`sgs/container` or `core/group` depending on layout needs) carrying the className
- Lift the rule into the variation CSS buffer; orchestrator writes it to `theme/sgs-theme/styles/<client>.json` `styles.css` field, scoped via `.page-id-N`
- The class on the emitted wrapper is the anchor for the CSS rule

**Destination 3 — Attribute gap candidate:**

When the rule's class IS inside a block-root AND the CSS property logically belongs as a typed attribute, BUT the block doesn't currently declare such an attribute:
- Write a row to `sgs-framework.db.attribute_gap_candidates` (table exists per Spec 15 §4.2): `(block_slug, attr_name_proposed, css_property, raw_value, source_class, source_run_id)`
- The Stage 9 coverage report aggregates these into operator-review.html
- Operator authors the missing attribute on the block.json — converter picks it up next run (Destination 1 now succeeds)
- Until authored: the rule ALSO lifts to Destination 2 as a temporary fallback so styling doesn't visibly drop while the operator decides

**Hard rule:** every CSS rule MUST hit at least one of Destinations 0 / 1 / 2 / 3. The converter logs a halt-level error if a rule can't be routed. There is no fifth "silently dropped" destination.

**Implication for FR3 (pass-through):** an unmatched wrapper passes through (no markup wrapper) ONLY when no CSS rules in the buffer target its classes. The presence of CSS upgrades the pass-through to a Destination-2 emission.

**Reporting:** Stage 9 surfaces per-section:
- Typed-attr lifts (count) — these are the "perfect" conversions
- Wrapper-CSS lifts (count + class list) — these are working but operator could promote to typed attrs over time
- Attribute gap candidates (count + (block, property, value) triples) — the catalogue-extension work queue

### FR7 — Visual QA verification (the closure gate)

Spec 16 is not closed until end-to-end visual QA passes:
- Run `/sgs-clone --converter` on a target page (Mama's homepage is the canary)
- Deploy resulting block markup + variation CSS to staging
- Run `/visual-qa` against the deployed URL at 375 / 768 / 1440 viewports
- Pixel diff ≤ 1% against the source mockup

Until FR7 verifies, "is it visually correct?" remains unanswered.

### FR8 — Legacy extract.py retirement (added 2026-05-14 per Bean)

**Clarified gating per Sonnet QC 2026-05-14 — three-tier confidence:**

Spec 15 §7.2 originally authorised this deletion "after Phase 3 of this spec lands (canonical-slot data populated in sgs-db)". That data IS now populated. Spec 16 narrows the gate to three concrete preconditions:

1. **Spec 16 Phase 3 (orchestrator wiring) tests green** — the converter is the live Stage-4 path for SGS-BEM-canonical sections; legacy extract.py is reachable only as fallback for non-SGS-BEM input
2. **At least one client (Mama's homepage) passes the converter end-to-end** through deploy + Stage 8 visual QA
3. **Grep audit of the orchestrator codebase confirms no Python imports of `extract.py` / `extract_strategies.py` / `overrides/*` outside `tools/recogniser-v2/__init__.py`**

If (3) finds external imports, those get rewired to the converter BEFORE the deletion. Two-client validation (Mama's + Indus Foods or helping-doctors) is DESIRABLE but is the criterion for full Spec 16 closure (§9 item 7), not for FR8 specifically. Single-client visual QA pass is sufficient to retire the legacy code.

Deletion steps:
- `rm tools/recogniser-v2/extract.py`
- `rm tools/recogniser-v2/extract_strategies.py`
- `rm -rf tools/recogniser-v2/overrides/`
- Update `tools/recogniser-v2/__init__.py` to re-export converter module functions
- Update Spec 15 §7.1 + §7.2 to reference Spec 16
- Update `tooling-map.md` + `cloning-pipeline-flow.md` to reflect Stage 4 path swap

### FR9 — sgs/heading composite block (added 2026-05-14 per Bean)

Build a new composite block `sgs/heading` that packages the section-heading three-element pattern as one block.

**Source pattern in drafts:**
```html
<span class="sgs-section-heading__label">Give the gift of nourishment</span>
<h2 id="gift-h2">A gift she'll actually use</h2>
<p class="sgs-section-heading__sub">For baby showers, new arrivals, and the mums who deserve a treat.</p>
```

**Block attrs:**
- `label` (string) + `labelTag` (enum: span/p/div, default "span") + `labelEnabled` (boolean, default true) + label typography family (mirrors sgs/hero's labelFontSize/Weight/etc, default `textTransform: "uppercase"`)
- `headline` (string) + `headlineLevel` (enum: h1-h6, default "h2") + `headlineId` (string, anchor) + heading typography family
- `subheading` (string) + `subheadingTag` (enum, default "p") + `subheadingEnabled` (boolean, default true) + sub typography family (mirrors sgs/hero's sub family)
- `icon` (string) + `iconPosition` (enum: above-label, beside-label, none, default "none") — leverages existing sgs/icon block conventions
- `emoji` (string) — single emoji rendered alongside label per existing block patterns
- Container attrs inherited from sgs/container `supports` for background / spacing if section-heading needs them at block-level
- Alignment + colour controls native via `supports.color` + `supports.spacing.margin`

**Default styles taken from the gift-section CSS** (so the block ships with sensible visual defaults):
- Label: uppercase, 11px-13px, weight 700, letter-spacing 0.5px, colour `accent`/text
- H2 default: 28px mobile / 36px desktop, weight 600, colour `text`
- Sub: 16px, colour `text-muted`, line-height 1.55

**Converter integration:**
- When the converter encounters any element whose class matches a block-root pattern for `sgs/heading` (e.g. `<div class="sgs-section-heading">` or `<header class="sgs-heading">`), lift the entire subtree into one `sgs/heading` block instead of emitting children as separate atomic blocks. This uses the same FR1 block-root slot-harvest path as `sgs/product-card`.
- **Detection rule (corrected per Sonnet QC 2026-05-14):** trigger on the block-root class (`sgs-section-heading` or `sgs-heading`). The three sub-elements (`__label`, the `<hN>` heading, `__sub`) are then harvested from descendants regardless of sibling position, order, or wrapping. This matches how every other composite block (product-card, hero) already works.
- **Source drafts may not use a wrapping block-root class today.** For backwards compatibility with the Mama's mockup pattern (label + h2 + sub as bare siblings in section content), the converter ALSO recognises a contiguous sibling run matching the three-element template as a heading composite — but Spec 15-conformant new drafts SHOULD wrap them in `<div class="sgs-section-heading">` to be unambiguous.
- Fallback: if only some elements present (e.g. label + h2 but no sub), still emit sgs/heading with the missing slots disabled. The block.json sets `labelEnabled` / `subheadingEnabled` so absent sections don't render.

## 4. The 6 phases (all next-session work — none deferred per Bean 2026-05-14)

### Phase 1 — Standalone prototype (SHIPPED 2026-05-14)

- `db_lookup.py` + `convert.py` + `convert_page.py` ✓
- `sgs/label` atomic block ✓ (PR #21 merged)
- Test on `.claude/test/Featured-product.html` ✓
- Test on `sites/mamas-munches/mockups/homepage/index.html` (9 sections, 10 block types) ✓
- Container over-emission fixed (114 → 12) ✓
- Sonnet Issue 2 applied (status='built' filter) ✓

### Phase 2 — Atomic-block expansion: sgs/heading + sgs/divider

Build TWO blocks:
- `sgs/heading` per FR9 above (the section-heading composite)
- `sgs/divider` — styled section separator (Q5a #3 — currently emits as empty container or core/separator)

Skip `sgs/icon` (already exists). Skip the other 7 candidates from Q5a.

**Subagent dispatch plan**: 2 parallel Sonnet implementers (one per block, disjoint file sets), 1 Haiku QC reviewer per output, sgs-update Stage 4 in between to populate canonical_slot rows. Total wall time ≤ 45 min.

### Phase 3 — Orchestrator wiring (Spec 15 Stage 4 replacement)

- Add `--mode pipeline --out <path>` CLI to `convert.py` that writes per-section JSON in Stage 4 schema
- Add `--converter-v2` flag to `sgs-clone-orchestrator.py`
- Branch in `stage_4_5_6_7_8_extract` to dispatch the converter for SGS-BEM-canonical sections
- Skip Stages 4.5 (token resolve), 5 (supports decision), 7 (compose) when converter is used — converter does these inline
- Keep Stages 0.1, 0.5, 1, 2, 4i, 4j, 8, 9, +REGISTER unchanged

**Subagent dispatch plan**: 1 Sonnet implementer for the orchestrator branch, 1 Sonnet QC for the per-section JSON shape correctness, 1 Haiku QC for the flag wiring. Total wall time ≤ 30 min.

### Phase 4 — Visual QA verification end-to-end

**Baseline clarified per Sonnet QC 2026-05-14:**

The pixel-diff comparison is **WP-rendered output (with active style variation) vs WP-rendered source mockup**, NOT WP-rendered output vs raw mockup HTML. The two are different render contexts:

| Render context | What it includes | Suitable as baseline? |
|---|---|---|
| Raw mockup HTML in browser | Local fonts, no WP theme styles, no plugin styles | No — too many spurious diffs (font loading, base styles, variation overrides) |
| WP-rendered source mockup (mockup HTML pasted into a WP post on staging) | Active theme CSS, active style variation, all WP filters | **Yes — this is the canonical baseline.** Diffs reflect ONLY converter output differences, not render-context differences. |
| WP-rendered converter output (the new path) | Same theme + variation context | The thing being measured |

The Phase 8 visual_qa_capture.py module already supports rendering BOTH the mockup-as-WP-post AND the converter-output-as-WP-post and diffing them. Phase 4 reuses that exact path — no new render comparator needed.

**Steps:**
- Build Mama's homepage via `/sgs-clone --converter-v2 sites/mamas-munches/mockups/homepage/index.html`
- Deploy to sandybrown-nightingale-600381.hostingersite.com (staging)
- Render the SAME mockup as a WP post on the same staging site (the baseline)
- Run `/visual-qa` against both URLs at 3 viewports (375, 768, 1440)
- Pixel diff ≤ 1% per viewport vs the WP-rendered mockup baseline

**Max iteration gate (per Sonnet QC 2026-05-14):** if Phase 4 fails on the first run, dispatch ONE Sonnet diagnostician to identify the converter bug + propose a patch. Apply the patch, re-run. If the SECOND iteration still fails, surface the diff thumbnails to Bean for human review. Three iterations maximum per Phase 4 attempt — prevents unbounded loop.

**Subagent dispatch plan**: inline `/sgs-clone --converter-v2` run + inline `/visual-qa` run; if diff > 1%, dispatch Sonnet diagnostician (max 2 dispatches). Total wall time ≤ 60 min (≤ 45 min on first-pass success).

### Phase 5 — /sgs-update Stage 4 canonical pass

`/sgs-update` Stage 4 (canonical assignment) hasn't yet populated canonical_slot for the new sgs/label block's typography family. Run a manual pass + spot-check the output. Same for sgs/heading + sgs/divider when Phase 2 lands.

**Subagent dispatch plan**: inline. ~10 min.

### Phase 6 — Retire legacy extract.py (FR8)

Delete the 1,942 lines of extract.py + extract_strategies.py + overrides/hero.py. Update Spec 15 references. Add tooling-map entries.

**Subagent dispatch plan**: 1 Sonnet implementer (carefully sequences the deletes + import-path updates), 1 Haiku QC verifying no stale references. Total wall time ≤ 20 min.

### Total next-session estimate (all phases, parallel where safe): ~2.5 hours

## 5. Module surface (Phase 1 shipped, Phases 2-6 add to this)

### Current modules (Phase 1)

| Module | Role | Lines (verified) | Status |
|---|---|---|---|
| `.claude/scratch/converter-prototype/db_lookup.py` | DB-backed canonical lookups | 282 | Prototype scratch |
| `.claude/scratch/converter-prototype/convert.py` | Single-section converter + DOM walker | 681 | Prototype scratch |
| `.claude/scratch/converter-prototype/convert_page.py` | Full-page wrapper | 173 | Prototype scratch |
| **Total** | | **1,136 lines** | (Haiku QC 2026-05-14) |

### Phase 3 target locations (production)

| Module | Role | Promoted from |
|---|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | Canonical lookups | scratch/ |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | DOM walker | scratch/ |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert_page.py` | Full-page wrapper | scratch/ |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | Public API: `convert_section(html, css, media_map) → (markup, variation_css)` | NEW |

## 6. What gets retired (Phase 6)

| File | Lines | Why retired |
|---|---|---|
| `tools/recogniser-v2/extract.py` | 731 | Replaced by converter's `walk()` + `lift_subtree_into_block_attrs()` |
| `tools/recogniser-v2/extract_strategies.py` | 303 | Role-strategy dispatch replaced by canonical_slot DB lookup |
| `tools/recogniser-v2/overrides/hero.py` | 908 | Per-block override pattern obsolete once canonical_slot data is complete |
| `tools/recogniser-v2/overrides/__init__.py` | Small | Module registry no longer needed |

What stays:
- `tools/recogniser-v2/data/role-templates.json` — referenced by Spec 15 §6 Stage 4; canonical_slot data layer
- `tools/recogniser-v2/visual_qa_config.json` — pixel-diff thresholds, used by Stage 8
- `tools/recogniser-v2/*-validator.js` — multi-frame QA, used by Stage 8

## 7. Open design questions (answered or parked)

| # | Question | Resolution |
|---|---|---|
| Q1 | Which canonical slot vocabulary is missing for v0.2? | Add `icon` canonical (Bean confirmed sgs/icon-block already exists, just needs the canonical row in slot_synonyms). Other Q5a candidates either already exist or stay deferred. |
| Q2 | Converter as new module vs CLI substitute? | Module — same-process import via `from orchestrator.converter_v2 import convert_section`. ~50ms saved per section, easier stack traces. CLI substitute pattern only retained for `extract.py` legacy compatibility during Phase 3. |
| Q3 | How do blocks usually store CSS? | Three places: (1) theme.json tokens (cross-block), (2) per-block style.css (block's static frontend CSS), (3) per-instance inline `style="..."` set by editor for non-token values. Spec 16's variation buffer lands in (1) at `theme/sgs-theme/styles/<client>.json` styles.css field, scoped via `.page-id-N`. |
| Q4 | /sgs-update + new label block typography canonicals? | Yes — manual Stage 4 pass in Phase 5. Or extend `assign-canonical.py` heuristics during Phase 5. |

## 8. Known limitations + parked items (non-blocking)

| Item | Severity | Source | Resolution |
|---|---|---|---|
| `source: "html"` on sgs/label.text is broad — round-trip break if save.js wraps content later | Low | Sonnet Issue 1 | Park; revisit when adding sgs/heading with multi-RichText (Phase 2) |
| `attr(data-X)` CSS responsive doesn't work cross-browser (systemic across hero/info-box) | Medium | Sonnet Issue 3 | Park; switch to inline CSS custom properties at save time across all blocks in a future cleanup pass |
| variantStyle enum hardcoded `["standard","trial","gift"]` | Low | Sonnet enum live-reading | Move to live DB read via `block_attributes.enum_values` in Phase 3 |
| Nested block-roots (block inside block) need recursion guard | Edge case | Sonnet Q1 edge case | Add guard in Phase 3 wiring work |
| JSON serialisation has no pre-emit validation for newlines/quotes | Low | Gemini Flash surprise 1 | Add in Phase 3 |

## 9. Tooling integration

Cross-references to `.claude/skills-commands-map.md`, `.claude/tooling-map.md`, `.claude/db-tables-map.md`, and `.claude/cloning-pipeline-flow.md`. Every entry in the tables below is verifiable in those companion docs.

### 9.1 Skills + slash commands the converter invokes / integrates with

| Skill / command | Role for Spec 16 |
|---|---|
| `/sgs-clone` | The pipeline that Spec 16 implements Stages 3-7 of. Phase 3 adds `--converter-v2` flag dispatching to the new path. |
| `/sgs-update` | Populates the canonical data (block_attributes, slot_synonyms, modifier_suffixes, property_suffixes, design_tokens) that the converter consumes. Phase 5 of the rollout runs a full canonical pass. |
| `/sgs-db` | Operator + subagent query interface to the SGS knowledge base. Used in Phase 2 to verify new blocks register with canonical_slot rows; used in Phase 4 to inspect attribute_gap_candidates writes. |
| `/wp-blocks` | Block-schema lookup for cross-checking block.json shape during Phase 2 (sgs/heading + sgs/divider creation). |
| `/visual-qa` | Phase 4 closure gate — 9-layer audit at 3 viewports against the WP-rendered mockup baseline. ≤1% pixel diff required to close. |
| `/uimax` / `/ui-ux-pro-max` | Reads `uimax.naming_conventions` for the SGS-BEM regex via the cached `_sgs_bem_regex()` helper in `db_lookup.py`. |
| `/uimax-classify-naming` | Spec 15 §8 upstream condition for non-SGS-BEM input. Not consumed by the converter directly; routes external sources to SGS-BEM before they enter `/sgs-clone`. |
| `/subagent-driven-development` | Phase 7 Steps 1.1, 1.2, 2.1, 2.3 — implementer + 2 reviewers pattern for new block creation + orchestrator wiring. |
| `/dispatching-parallel-agents` | Phase 7 Steps 1.1+1.2 parallel (different file sets), Step 8 four-reviewer final QC. |
| `/delegate` | Per-step model routing — Sonnet for load-bearing, Haiku for mechanical, Gemini Flash for cheap edits, Gemini Pro for deep review, Cerebras for grep audits. |
| `/handoff` | Final step of every Phase 7 session; regenerates handoff.md + next-session-prompt.md + state.md body. |

### 9.2 Scripts (production paths after Phase 3 promotion)

| Script | Lines | Wired into | Role |
|---|---|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | 282 | converter_v2 module | DB-backed canonical lookups: BEM parser, registered_block_slugs, slot_synonyms loader, modifier_suffixes loader, attr_name_for_slot_or_alias finder, hyphen-normalised string match |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | 681 | converter_v2 module | Single-section DOM walker + slot-aware extraction + 4-destination CSS routing |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert_page.py` | 173 | converter_v2 module | Full-page wrapper; splits mockup into top-level sections, dispatches per-section, concatenates output + variation CSS buffer |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | NEW | converter_v2 module | Public API: `convert_section(html, css, media_map)`, `convert_page(html, media_map)` |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | (existing) | Stage 4 dispatch | Branches to converter_v2 when `--converter-v2` flag set AND section is SGS-BEM-canonical |
| `plugins/sgs-blocks/scripts/orchestrator/trace.py` | (existing) | Diagnostic | Optional `Trace.for_run(run_dir)` for converter decision logging — wired in Phase 3 |
| `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` | (existing) | Stage 1 | Identifies sections + SGS-BEM-canonical flag the converter dispatch depends on |
| `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` | (existing) | Stage 2 | Matches sections to registered blocks (status='built'); converter consumes the match |
| `plugins/sgs-blocks/scripts/lints/bem-lint.py` | (existing) | Stage 0.1 | BEM compliance gate before converter runs (Spec 15 §9) |
| `plugins/sgs-blocks/scripts/lints/token-lint.py` | (existing) | Stage 0.5 | Token-usage gate; surfaces non-token values as gap candidates |

### 9.3 Scripts retired in Phase 6

| Script | Lines | Replaced by |
|---|---|---|
| `tools/recogniser-v2/extract.py` | 731 | `converter_v2/convert.py` walk() + lift_subtree_into_block_attrs() |
| `tools/recogniser-v2/extract_strategies.py` | 303 | DB-backed canonical_slot lookup in `converter_v2/db_lookup.py` |
| `tools/recogniser-v2/overrides/hero.py` | 908 | Per-block override pattern obsolete; hero's slots become regular catalogue-driven entries (Spec 15 §7.2) |
| `tools/recogniser-v2/overrides/__init__.py` | ~8 | Module registry no longer needed |

### 9.4 DB tables (R/W matrix)

| Table | DB | R / W | When | Purpose |
|---|---|---|---|---|
| `blocks` | sgs-framework.db | R | every convert_section call | Filter to `status='built'` for routable block slugs |
| `block_attributes` | sgs-framework.db | R | per block-root match | Reads attr_name + canonical_slot + role + attr_type for slot-aware extraction |
| `slot_synonyms` | sgs-framework.db | R | every BEM element resolution | Maps element name (eyebrow, sub, description, etc.) → canonical slot (label, subheading, text) |
| `modifier_suffixes` | sgs-framework.db | R | every BEM modifier resolution | Canonical Primary / Secondary / Hover / Tablet / etc. with kind (variant/state/breakpoint/side) |
| `property_suffixes` | sgs-framework.db | R | CSS-token-snap pass (FR6 Destination 1) | Maps CSS property → token category (palette, spacingSizes, fontSizes, etc.) |
| `design_tokens` | sgs-framework.db | R | token-snap value resolution | Source of truth for theme.json token slugs + values |
| `style_variations` | sgs-framework.db | R | client variation CSS lift | Reads active client's tokens_json overlay |
| `patterns` | sgs-framework.db | R | (future Phase 2 pattern-level match) | Pattern-level routing when section spans multiple blocks |
| `attribute_gap_candidates` | sgs-framework.db | **W** | FR6 Destination 3 | The converter writes one row per (block_slug, css_property, raw_value, source_class) when a CSS rule has no matching typed attribute — the catalogue-extension work queue |
| `naming_conventions` | uimax | R | BEM regex resolution | `convention_name='SGS WordPress'` row holds the canonical regex for `_sgs_bem_regex()` |
| `recognition_log` | uimax | **W** | Stage 9 (unchanged) | Existing pipeline writes; converter doesn't add to or remove from this |

### 9.5 Cross-references to companion docs

- `.claude/skills-commands-map.md` — full catalogue of all 17 skills + commands, pipeline position, scripts invoked
- `.claude/tooling-map.md` — per-script inventory across `plugins/sgs-blocks/scripts/`, `tools/`, and skill bundles. Spec 16 added converter prototype rows 2026-05-14
- `.claude/db-tables-map.md` — per-table inventory (29 sgs-framework + 48 uimax) with schemas + R/W matrix per pipeline stage
- `.claude/cloning-pipeline-flow.md` — annotated visual flow of /sgs-clone + /sgs-update with per-stage scripts, files, DB, skills, status. Spec 16 status note added 2026-05-15 in frontmatter

---

## 10. Validation criteria for "the universal cloning script that works without intervention"

Bean's stated end goal: a script that converts any SGS-BEM draft into a working WP site with zero AI or Bean intervention. Spec 16 closure requires ALL of:

1. ✓ Phase 1 — prototype produces clean block markup on the Mama's mockup (single-page test)
2. ⏳ Phase 2 — sgs/heading + sgs/divider blocks exist; converter routes to them
3. ⏳ Phase 3 — converter wired into orchestrator; `/sgs-clone --converter-v2` runs end-to-end
4. ⏳ Phase 4 — Mama's homepage deployed via converter passes `/visual-qa` at ≤ 1% pixel diff (THIS is the closure gate)
5. ⏳ Phase 5 — /sgs-update Stage 4 canonical data complete for all new blocks
6. ⏳ Phase 6 — legacy extract.py + overrides retired
7. ⏳ End-to-end run on a SECOND client (Indus Foods or helping-doctors) without code changes — confirms the architecture generalises

Items 1-6 are next-session work. Item 7 is the production validation that happens after the first client ships.

---

## 11. Spec 17 pattern-target extension (added 2026-05-19, not yet implemented)

Spec 17 ships 9 framework header/footer patterns + a `sgs/site-info` block binding source.
Stage 6 emission should be extended to recognise when an extracted header/footer subtree
substantially matches a framework pattern, then emit a `wp:pattern` reference + Site Info
bindings instead of bespoke markup.

**Acceptance gate:** when running `/sgs-clone` on a mockup whose header is structurally
identical to `sgs/framework-header-default`, the output should contain:

```
<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->
```

at the header slot, NOT bespoke `<header>...</header>` markup.

**Match algorithm:** compare extracted slot tree against the pattern's structural
fingerprint (allowed nesting + child-block count + text-content shape). Differences in
content values (logo file, social links, copyright text) are routed through `sgs/site-info`
block bindings to the central Site Info store rather than being baked into the emitted
markup.

**Cross-reference:**
- Spec 17 §S6 — the framework pattern definitions
- `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` — full header/footer architecture
- `.claude/cloning-pipeline-flow.md` "Stage 6 — Block.json emission" — pipeline context

---

## 12. Appendix A — Spec 15 absorbed content (2026-05-21)

Spec 15 (`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`) was the predecessor spec covering convention + data + mapping + pipeline layers + /sgs-update. Today (2026-05-21) Spec 15 is formally ABSORBED into Spec 16 as the single end-goal spec. Spec 15 stays on disk as a redirect stub with frontmatter pointer to this section for git-blame continuity. This appendix folds the canonical content Spec 15 owned (per its frontmatter: L0–L3 + Stages 0-2 + 8-9 + /sgs-update); Spec 16 already owns Stages 3-7.

### 12.1 Architectural layers (Spec 15 §2)

The system has six layers; each consumes only the layers below it.

```
L5 — END GOAL: deterministic draft → SGS clone + QA-validated output
L4 — CONVERTER + QA PIPELINE: /sgs-clone orchestrator (Stages 0-9 + QA per stage)
L3 — MAPPING LAYER (Rosetta Stone): slot synonyms · property suffixes · modifier
     suffixes · output-signature canonicalisation · token value-matcher · default-
     inheritance check · cross-platform composition
L2 — DATA LAYER: sgs-framework.db (blocks, block_attributes [canonical_slot + role
     + derived_selector + output_signature + equivalent_implementations], patterns,
     block_compositions, design_tokens, block_selectors, slot_synonyms,
     property_suffixes, modifier_suffixes, legacy_role_lookup [added Wave 3c
     2026-05-21]) + uimax (component_libraries, patterns, design_tokens, animations,
     naming_conventions, recognition_log, attribute_gap_candidates,
     functionality_gap_candidates) + theme.json + per-client style variations
L1 — CONVENTION LAYER: SGS-BEM canonical (.sgs-<block>__<element>--<modifier>);
     block.json attribute naming canonical via canonical_slot; theme.json token slug
     canonical; behavioural canonicalisation rule (same output signature → same
     canonical slot)
L0 — UPSTREAM CONDITIONS: drafts emit SGS-BEM HTML with theme.json tokens; AI-builder
     output routes through /uimax-classify-naming + lingua-franca conversion; external
     scrapes route through /uimax-sgs-scrape-pattern first
```

### 12.2 Convention layer (Spec 15 §3)

- **SGS-BEM regex:** `^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`. `<block>` = registered SGS block slug; `<element>` = canonical slot from §12.4; `<modifier>` = canonical modifier from §12.6 OR block.json attribute enum value.
- **Behavioural canonicalisation rule:** two attributes with the same output signature (output function + DOM wrapper + BEM element class + CSS property + conditional gates, derived by static analysis of render.php / save.js) ARE the same concept and share a canonical slot regardless of declared names.
- **Canonical attribute decomposition template:** `<canonical_slot><PropertyType><Modifier><Breakpoint>` (e.g. `headlineFontSizeMobile` → heading + FontSize + ∅ + Mobile; `ctaPrimaryHoverBackground` → button + Primary + Hover + Background).

### 12.3 Canonical slot vocabulary (Spec 15 §3.4)

Lives in `sgs-framework.db.slot_synonyms`. v1 seed table:

| Concept | Canonical | Synonyms folded in |
|---|---|---|
| Primary heading | `heading` | title, headline, name |
| Sub-heading | `subheading` | subtitle, subHeadline, sub |
| Pre-heading label | `label` | eyebrow, kicker, tag |
| Paragraph body | `text` | body, description, content, caption, copy |
| Polymorphic image/video | `media` | image, photo, picture, video, embed |
| Background polymorphic | `backgroundMedia` | backgroundImage, backgroundVideo, bgImage, bgVideo, heroImage |
| Image alt text | `alt` | — |
| Image caption | `caption` | — |
| Primary CTA / button | `button` | cta, ctaPrimary, primaryCta, primaryButton |
| Secondary CTA / button | `buttonSecondary` | ctaSecondary, secondaryCta, secondaryButton |
| Link target URL | `link` | url, href, anchor |
| Repeating list of items | `items` | (distinct from options, badges) |
| Form-field selection options | `options` | — |
| Decorative badge / pill | `badge` | pill |
| Person portrait | `avatar` | portrait, profile, authorImage |
| Iconography | `icon` | symbol, glyph |
| Date | `date` | datetime, timestamp |
| Price | `price` | cost, amount |
| Star rating | `rating` | stars, score |
| Visual divider | `separator` | divider, rule |

Phase 3.5 extended the vocabulary to also include layout primitives (padding/margin/gap/width/column), state slots (hover/focus/active/disabled), and motion concepts (transition/animation) — these are first-class design slots, not NULL-gap candidates.

### 12.4 Property suffix vocabulary (Spec 15 §3.5)

32 canonical property suffixes frozen after Phase 1, lives in `sgs-framework.db.property_suffixes` (117 rows as of 2026-05-21 — original 99 + 18 per-side longhand rows added post-2026-05-17):

- **Colour family:** Colour, Color, Background, Foreground, TextColour, TextColor, BorderColour, BorderColor, BackgroundColour, BackgroundColor, Stroke, Shadow
- **Typography:** FontFamily, FontSize, FontWeight, LineHeight, LetterSpacing, TextTransform, TextDecoration, TextAlign
- **Layout:** Padding, Margin, Gap, Width, Height, MinHeight, MaxWidth, MaxHeight, MinWidth, AspectRatio
- **Visual:** BorderRadius, BorderWidth, BorderStyle, BoxShadow, Opacity, ObjectFit, ObjectPosition
- **Content:** Url, Href, Link
- **Behaviour:** Style, Variant, Layout, Alignment, Required, Placeholder, HelpText, ErrorMessage

### 12.5 Modifier suffix vocabulary (Spec 15 §3.6)

Lives in `sgs-framework.db.modifier_suffixes` (19 rows across 6 kinds):

| Kind | Values |
|---|---|
| Breakpoint | Mobile, Tablet, Desktop |
| Side | Top, Right, Bottom, Left |
| Corner | TL, TR, BL, BR |
| State | Hover, Active, Focus, Disabled |
| Variant | Primary, Secondary, Tertiary |
| Unit | Unit |

### 12.6 /sgs-update unified pipeline (Spec 15 §6) — 11 stages

`/sgs-update` is the single scanner that keeps the data layer current and the mapping layer derived. All 11 stages idempotent.

| Stage | Function |
|---|---|
| 1 — Inventory | Walk `plugins/sgs-blocks/src/blocks/` + `theme/sgs-theme/`. Populate blocks, patterns, theme_parts |
| 2 — Block.json native | Parse each block.json. Populate block_attributes (basic) + block_selectors + block_supports |
| 3 — Behavioural analysis | Parse render.php / save.js per block. Extract output_signature per attribute |
| 4 — Canonical assignment | Decompose attr name per §12.2, look up canonical_slot via slot_synonyms, assign role via property_suffixes, derive selector. Write to block_attributes |
| 5 — Pattern composition | Parse `theme/sgs-theme/patterns/*.php` for nested block markers. Populate block_compositions |
| 6 — Token sync | Parse theme.json. Sync settings.* to design_tokens; sync styles.* defaults to theme_defaults cache |
| 7 — Animation sync | Scan sgsAnimation enum values; sync to uimax animations |
| 8 — Uimax mirror | Sync to uimax (component_libraries, patterns, design_tokens, animations, naming_conventions) |
| 9 — Drift validator | Every attribute decomposes into known canonicals? Flag violations. Exit non-zero on `--strict` |
| 10 — Gap detection | Signatures without canonical_slot → attribute_gap_candidates. Unresolved selectors → gap candidates |
| 11 — Reference doc regen | Regenerate `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` + canonical vocabulary appendix |

**Added 2026-05-21 (Wave 3c):** Stage 0 — legacy_role_lookup seeding via `seed-legacy-role-lookup.py` (idempotent; populates the DB table from authoritative pre-SGS-BEM mappings).

### 12.7 Upstream conditions (Spec 15 §8)

Conditions that draft-building pipelines and external-source integrations must conform to:

| Source of draft | Required pre-processing | Enforcement |
|---|---|---|
| Bean-controlled HTML/CSS draft | Author in SGS-BEM. Use theme.json tokens | Stage 0.1 + 0.5 of /sgs-clone |
| `/ui-ux-pro-max` draft output | SGS-BEM HTML + token values | /ui-ux-pro-max skill |
| `/innovative-design` router | Propagates SGS-BEM + token requirements to dispatch targets | /innovative-design skill |
| `/sgs-clone --draft-mode` | Soft warnings on BEM violations | Stage 0.1 soft mode |
| AI-builder output (Lovable, v0, Bolt, Cursor) | Route through `/uimax-classify-naming` + lingua-franca conversion | External pipeline wrapper |
| External scraped sites | `/uimax-sgs-scrape-pattern` runs first. SGS-BEM is primary; source class preserved in equivalent_implementations | /uimax-sgs-scrape-pattern gateway |

**Wave 1 (2026-05-21) update:** non-SGS-BEM input to `/sgs-clone` now HALTS-WITH-CLEAR-ERROR. The previous silent fallback to legacy extract.py is gone. Operators get an actionable message pointing at Spec 13 §8.1 (re-author the draft) or /uimax-sgs-scrape-pattern (route through scraper first).

### 12.8 QA gates summary (Spec 15 §9)

QA fires at every stage. Three modes: strict (halt), soft-warn (log + continue), legacy-bypass (skip). See Spec 16 §FR6 + §FR7 for the converter-layer gates; below covers Spec 15-owned Stage 0/0.1/0.5 + Stage 2 + Stage 8/9:

| Stage | QA gate | Wave 2 status |
|---|---|---|
| 0.1 | BEM compliance | LIVE (3 modes via bem-lint.py) |
| 0.5 | Token-usage | LIVE (3 modes via token-lint.py) |
| 2 | Block-type match confidence ≥ 0.7 | LIVE 2026-05-21 (Wave 2c; constant STAGE_2_CONFIDENCE_THRESHOLD in confidence-matrix.py + leftover-bucket-router.py) |
| 3 | Per-attribute extraction outcome logged | LIVE 2026-05-21 (Wave 3b; canonical_source: 'db' \| 'auto-derived' annotation) |
| 6 | block.json schema validation | LIVE 2026-05-21 (Wave 2d; require_schema default-True; --no-schema-validation opt-out) |
| 7 | WP block markup parse | LIVE (extract.py / staged_merge.py serialise to WP block-comment markup; orchestrator halts on serialiser exception) |
| 8 | Visual parity ≤ 1% pixel-diff at 3 viewports, per-section | LIVE 2026-05-21 (Wave 2a; --selector threading via page.locator(selector).screenshot(); unresolved_slots==0 deploy gate) |
| 9 | Coverage + gap report | LIVE (writes attribute_gap_candidates + functionality_gap_candidates) |

Plus `/sgs-update` Stage 9 drift validator + pre-commit hook on `sites/*/mockups/` files.

### 12.9 Functional requirements (Spec 15 §10, consolidated with Spec 16)

Spec 15 absorbed Spec 14 FR1–FR26 and added FR27–FR40. Spec 16 added FR1–FR9 (converter v2 architecture). Together they form the converter + data-layer + canonical-vocabulary surface. Notable post-2026-05-21 status:

- **FR21 (no canonical mutation outside designated FRs):** LIVE — Wave 3a's CSS D3 destination writes to `attribute_gap_candidates` only; no canonical-block mutation
- **FR22 (stage-resume removed):** LIVE — atomic sessions, no `--resume` flag (router-pattern.md doc stub references to be cleaned next session)
- **FR27 (behavioural canonicalisation):** LIVE
- **FR28 (canonical attribute decomposition):** LIVE — 117 property_suffixes (32 canonical + 18 per-side longhands populated since 2026-05-17 expansion) + 19 modifier_suffixes seeded in DB
- **FR29 (slot_synonyms table seeded):** LIVE
- **FR30 (property_suffixes + modifier_suffixes vocab tables):** LIVE
- **FR31 (block_attributes schema extension with canonical_slot/role/derived_selector):** LIVE
- **FR32 (static analyser for render.php/save.js → output_signature):** LIVE (assign-canonical.py)
- **FR33 (`/sgs-update` Stages 3+4+9+10):** LIVE
- **FR34 (token value-matcher ΔE2000):** LIVE
- **FR35 (default-inheritance check):** LIVE — supports_writer.py
- **FR38 + FR39 (Stage 0.1 BEM lint + pre-commit hook):** SHIPPED 2026-05-12

### 12.10 Spec 15 retirement notes

Spec 15 file (`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`) is retained on disk with absorption marker in its frontmatter. Future readers: this section (Spec 16 §12) is the canonical content; Spec 15 file is historical record only.
