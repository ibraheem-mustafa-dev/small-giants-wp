---
doc_type: parking
project: small-giants-wp
last_updated: 2026-05-27
---

> **2026-05-27 note (D85 — role-exclusion DB-derive + Tier C deletion):** `P-D85-ROLE-EXCLUSION-DB-DERIVE` and `P-TIER-C-DELETE-OR-PROVE` closed-as-completed (no separate parking entries existed; tracked here for completeness). The two hardcoded frozensets (`_CONTENT_BEARING_ROLES`, `_ROLE_EXCLUSION_ALLOWLIST`) in `db_lookup.py` are gone — replaced by DB-driven `_content_bearing_roles()` / `_styling_behaviour_roles()` querying the new `slot_synonyms.role_classification` column (idempotent migration at module load). Tier C derivation deleted from `equivalent_block_for()` per qc-council Rater B + Bean directive. Spec 22 §FR-22-2.1 / §FR-22-2.3 / §15 amended. Re-introduction of a role-derived tier gated on `P-SGS-UPDATE-ROLE-DETECTION-IMPROVE` (closed for role detection itself, but a follow-up parking entry can be re-opened if Tier C inputs accumulate).

<!-- ACTIVE — open parking items only. Resolved entries → memory/parking-archive.md with completion date in heading. -->

> **2026-05-26 note (Spec 22 supersedes Phase 1 plan):** Cloning-pipeline entries listed below as superseded by the 2026-05-25 phase plan are now further superseded by **Spec 22** (Universal Block-Equivalent Extraction). The canonical phase plan is `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`. Closed/dissolved entries: **P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP** (dissolved — IS Spec 22), **P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES** (dissolved — Spec 22 makes universal-emit default), **P-FR1-VARIATION-BUF-CONSISTENCY** (dissolved — FR1 fast path retired), **P-MATCH-JSON-GATE-REDEFINITION** (FR-22-12 preserves Stage 2 artefact production), **P-G1-HERO-INNERBLOCKS** (closed by Spec 22 FR-22-3 universal walker), **P-G3-STAGE-3-VISUAL-SLOT-MAPPING** (closed by FR-22-5 D1 routing + FR-22-2.2 role-exclusion), **P-G5-PER-BLOCK-DOM-SHAPE-FIXES** (closed by FR-22-3 universal walker — no per-block branches). Other cloning entries (P-DUPLICATE-HEADER, P-INGREDIENTS-1440-REGRESSION, P-PIXEL-DIFF-VERTICAL-ANCHOR-FIX) are Phase 1.5 / Phase 2 work. New entry: **P-LEGACY-GAP-CANDIDATES-MIGRATION** (1,480 legacy sgs-framework.db `attribute_gap_candidates` rows; Spec 22 FR-22-8.1 makes table read-only; migration to uimax parked).

> **P-SLOT-SYNONYMS-CONTENT-GAPS-AUDITED** — NEW 2026-05-27 (pre-Phase-1 audit, closed same-day). Initial finding: 11 content-bearing slot_synonyms rows had NULL standalone_block. Per-row audit (via block_attributes usage query) revealed 10 of 11 are CORRECTLY NULL by design: `alt`/`ariaLabel` (accessibility props of parent, not InnerBlocks children); `bar`/`feature`/`header` (only catch *Colour/*Background color attrs); `nav`/`slot` (0 usage); `progress`/`ribbon` (role=visual, excluded by positive-allowlist); `options` (form-field internal rendering, Phase 2 scope). One gap filled: `role.standalone_block = sgs/label` (activates walker routing for team-member.role + testimonial.role per existing aliases `authorRole`/`jobTitle`/`speakerRole`/`category`). Walker activation verified: `equivalent_block_for('sgs/team-member', 'role') → sgs/label` post-fill. All 5/5 + 4/4 + 30/30 tests still PASS. Triple-NULL baseline unchanged at 1090.
> **Status:** CLOSED 2026-05-27

> **P-LEGACY-GAP-CANDIDATES-MIGRATION** — 1,480 legacy rows in `sgs-framework.db.attribute_gap_candidates` (Spec 16 era). Spec 22 FR-22-8.1 makes this table read-only; all new D3 writes go to uimax's `attribute_gap_candidates` (91 rows, with confidence + provenance columns). Migration of the 1,480 legacy rows is out-of-scope for Spec 22. **Trigger:** post-Spec-22 close, when Phase 1.5 considers cleaning up legacy data surfaces.
> **Status:** DEFERRED

> **P-SGS-UPDATE-ROLE-DETECTION-IMPROVE** — CLOSED 2026-05-27 (Spec 22 Phase 0.1.b implementation). Role-detection module added to `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (`detect_role_from_block_json()` + dry-run + apply mode). Three-tier heuristic: (1) attr-name regex against the 5 content-bearing role families; (2) JSON-schema `format` hint (uri/email → link-href); (3) description-keyword scan as low-confidence fallback. Hard guard: only proposes values in `_CONTENT_BEARING_ROLES` (text-content / image-object / content / link-href / identity) — never styling roles. Dry-run output: `pipeline-state/_snapshots/role-detection-diff-2026-05-26T12-03-24Z.json` (94 high-confidence proposals: 42 text-content, 31 link-href, 12 identity, 7 image-object, 2 content). Acceptance verified: sgs/icon.iconSource/iconName resolve to `identity`, linkTarget to `link-href`, sgs/timeline.entries to `content` (all four match spec's expected outcomes). 11 unit-test cases pass via `--self-test`. Apply with `--apply-roles --role-diff-file <path>`.
> **Status:** CLOSED 2026-05-27

> **P-D85-BASELINE-CONSTANT-DRIFT** — CLOSED 2026-05-27 (Spec 22 Phase 0.1.b implementation). Replaces the hardcoded `1142` triple-NULL baseline constant in assign-canonical.py with a file-backed snapshot at `pipeline-state/_snapshots/triple-null-baseline.json`. Sanity check now reads the snapshot at script start and reports `OK — guardrail intact, matches snapshot` on match, or a drift message naming the snapshot + capture date on mismatch. New `--recapture-baseline` CLI flag writes a fresh snapshot with the current count when /sgs-update Stage 4 legitimately adds new blocks. Eliminates alert fatigue when DB grows.
> **Status:** CLOSED 2026-05-27

## Cloning pipeline (cv2 / orchestrator / DOM walker / pixel-diff)

_60 entries._


**P-DUPLICATE-HEADER-EXPOSED-BY-INLINE-CSS-FIX** — NEW 2026-05-25 (after D70 Stage 10 inline-CSS shipped). With variation-d0-d2.css now deployed inline per-page, the mockup's `<header class="sgs-header">` block in cv2 output renders visually for the first time — appearing BELOW the framework's `<header>` template part (rendered on every page by `theme/sgs-theme/parts/header.html`). Visible regression: header section pixel-diff at 375px jumped from 25.4% → 84.8% (+59.4pp) in run mamas-munches-homepage-2026-05-25-060541. Sister sections (768, 1440) only +0.9 / -2.3pp because framework header dominates the viewport there. **Resolution:** Phase 2 — header + footer specialised cloner. Gated on Phase 1.5 hitting per-section ≤1% (per `.claude/plans/2026-05-25-phase-1-universal-extraction.md` + `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`). The specialised cloner emits to wp_template_part shape, not page-content shape, and dedupes against framework header. Until then the live page carries both headers on mobile.
**Status:** OPEN
**Trigger:** Phase 2 kickoff.


**P-INGREDIENTS-1440-REGRESSION-AFTER-INLINE-CSS** — NEW 2026-05-25 (after D70). Stage 11 ingredients-section at 1440px regressed from 31.5% → 53.9% (+22.4pp) post-fix while same section dropped -22pp at 375 and -20pp at 768 (clear net win at the other two viewports). Hypothesis A: a desktop rule in variation-d0-d2.css overrides framework defaults at 1440 with a partial cascade conflict. Hypothesis B: screenshot-timing — page wasn't fully painted when Playwright captured. Hypothesis C: a desktop-specific rule in variation CSS doesn't match the live DOM shape exactly. **Trigger:** trace investigation — pixel-diff/section.sgs-ingredients-1440x900/diff.json + mockup.png + sgs.png + heatmap.png in run mamas-munches-homepage-2026-05-25-060541. Re-run /sgs-clone to rule out timing artefact first.
**Status:** OPEN



**P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES** — NEW 2026-05-24 (scoped narrow). Step 1.6 (G1 closure) ships OPEN-block emit for `sgs/hero` only this phase, plus FR1 branch-(b) pattern-reference emission in Step 1.5. All other composite blocks (info-box, product-card, card-grid, etc.) continue to emit self-closing. **Why scoped narrow:** no DB column today cleanly identifies "container-shaped composite block" — `blocks.parent_block`, `block_supports`, `patterns.block_composition`, `block_attributes.output_signature` each describe partial facets but none excludes info-box / product-card from a "container-outer + InnerBlocks" definition. Investigated candidates: (a) add `is_pattern_shaped` boolean to `blocks`, hand-curated; (b) new `/sgs-update` stage that static-analyses each `render.php` for `<InnerBlocks />` inside an outer container element; (c) manual `block.json` annotation under `supports.sgs.containerShaped: true`.
**Status:** DEFERRED
**Trigger:** After Phase 1 ships AND Stage 11 per-section pixel-diff results show empirical evidence of WHICH other composite blocks visibly need OPEN-block emit from body sections emitting self-closing today.


**P-MATCH-JSON-GATE-REDEFINITION** — NEW 2026-05-24 (KJC required). The Phase 1 plan Step 1.7 gate condition (c) says "match.json shows 0 of the 5 originally-falling-through body sections still emitting sgs/container at confidence < 0.5". This gate is structurally impossible to meet with a Stage 4 walker pre-pass alone — match.json is produced by Stage 2 confidence_matrix, which runs before Stage 4. Three options: (A) redefine gate to use leftover-buckets `unrecognised_section` count (already at 0 post commit `124e1d06` — cheapest, factually correct); (B) add post-Stage-4 confidence refinement pass that infers confidence from block_markup; (C) update Stage 2 confidence_matrix to query DB child-block presence for unregistered section slugs.
**Status:** DEFERRED
**Trigger:** Bean decision needed before Step 1.7 QA gate evaluation. Present options A/B/C at that session start — Option A is recommended (cheapest, factually correct).


**P-WALKER-PREPASS-REGRESSION-TRIAGE** — HIGH — blocks Step 1.7 closure. Commit `124e1d06` causes visual regressions in featured-product (375: +53.2pp, 768: +34.7pp) and ingredients-section (all viewports: +23.6 to +33.8pp) while improving brand (-6 to -28.7pp) and gift-section (-12 to -31.9pp). Root cause: the pre-pass guard correctly prevented `composite_element` from claiming BEM-element wrappers as `sgs/text` — but the structurally correct output (individual blocks) renders further from the mockup visually because per-block CSS hasn't been lifted yet (Step 1.7.5).
**Status:** OPEN
**Bean decision (pick one, ~2 min):**
1. **Proceed to Step 1.7.5** _(recommended)_ — accept regressions as structural correctness; Steps 1.7.5+1.7.6 CSS lift will close them. Net direction is right.
2. **Revert `124e1d06`** — safer if Steps 1.7.5/1.7.6 are delayed >1 session; keeps the baseline clean at the cost of re-landing the pre-pass commit later.
3. **CSS-lift first** — add CSS-lift for the regressing sections before Step 1.7 is closed; most thorough but adds ~1-2 hrs before the gate clears.


**P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER** — The clone pipeline treats header and footer markup the same as page body. Headers and footers are template-parts on the WP target (`wp_template_part` post type), not page content. The pipeline needs a dedicated stage that (a) detects header/footer sections in the source mockup, (b) extracts them once per site rather than per page, (c) emits to template-part shape (not page-content shape), (d) handles the unique template-part wrapper classes (`wp-block-template-part`, `area="header"` / `area="footer"`). Without this handler the h/f markup either duplicates per page, drops silently, or malforms into a page-body block tree. **Trigger:** before the next multi-page clone run.
**Status:** OPEN


**P-G2-PAGE-ID-SCOPE-STRIP** — PARTIAL-RESOLVED 2026-05-23 (Wave B2). Original hypothesis (scope-prefix blocks cv2 lookup) is CLOSED: Playwright confirmed 0 `.page-id-N` scoped rules detected at the live render; the scope-strip at convert.py:3013-3015 is working. NEW finding: trust-bar emits empty `value` slot + label carrying all text → visual duplication artefact. **Closure path for the residual:** rolled into P-WAVE-2-RESHAPE — `slot_list.py` querying `property_suffixes` for non-text slots resolves this universal-extraction gap.
**Status:** PARTIAL


**P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP** — G1 + G3 + G5 reframed as ONE wiring gap, not three separate problems. The SGS-framework.db has all the mapping data needed (`property_suffixes` 117 rows, `slot_synonyms` 89 rows, `block_attributes` 1755 rows, `modifier_suffixes` 19 rows, plus pattern composition data on `patterns.block_composition` JSON column) but cv2 doesn't query all of it consistently. Wave 2 = one architectural change wiring the DB tables into the walker's emit shape, NOT three per-block fixes. See decisions.md Decision 26. **Trigger:** Wave 2 of next session.
**Status:** OPEN


**P-FR1-VARIATION-BUF-CONSISTENCY** — PARTIAL-RESOLVED 2026-05-22 commit `8ceb8787` (Wave 2 Change 1) for the FR1 fast path (block-root branch, `convert.py:3839-3867`). **/qc-council 2026-05-23 found two sibling call-sites with the same pattern still open:** (a) **essence-match tier** at `convert.py:3926` — lifts then returns at `3936-3937` without `variation_buf.append`; (b) **composite-element-to-standalone-block** at `convert.py:3970` — lifts then returns at `3990-3991` without `variation_buf.append`. Same one-line fix applies to both. **Trigger:** Task 4 Wave 2 reshape — pair with G1+G3+G5 wiring fix. ~10 min for the two sibling sites once Wave 2 starts.
**Status:** PARTIAL


**P-CLONING-PIPELINE-FLOW-DOC-DRIFT** — 2026-05-21 reality check found that the entry-point chain "verified 2026-05-13" predates the 2026-05-20 architectural rewrite (`css_router.py`, `essence_match_detector.py`, `stage_attribute_promotion.py` added but ASCII chain not refreshed). Plus G2 Step 1+2 changes (orchestrator-side CSS merge into `_section_css` + cv2 scope strip) aren't documented yet.
**Status:** OPEN
**Trigger:** Before the next architectural pipeline change that modifies the stage boundary or script chain. G2 Step 1+2 changes (commit `affca3f1`) are the immediate outstanding update.


**P-G1-HERO-INNERBLOCKS** — cv2 emits self-closing `wp:sgs/hero` block. Render.php uses `$content` (InnerBlocks) for CTAs — empty when block is self-closing. Live page 144 hero CTAs ARE INVISIBLE. ~50pp of hero's 67.8% pixel-diff. **STATUS: Phase 3 infrastructure shipped (`79158da5`) but live-page-144 end-to-end verification PENDING — that is the actual closure step.** Decision 12 adds adjacent-slot grouping; hero CTAs should emit as nested InnerBlocks via `blocks.parent_block` lookup, but no Playwright run on the live URL has confirmed the CTAs render.
**Status:** OPEN
**Trigger:** Before next pixel-diff session on hero (~15 min Playwright verification run on page 144). Pair with P-G3-STAGE-3-VISUAL-SLOT-MAPPING in the same run.


**P-G3-STAGE-3-VISUAL-SLOT-MAPPING** — Stage 3 `slot_list.py` only extracts text-content slots. Visual/structural slots (backgroundImage, overlayColour, minHeight, ctaPrimaryColour, alignment) return "no value extracted" even when mockup CSS has the values. **STATUS: Phase 3 + Phase 6 infrastructure shipped (`79158da5` + `d307c8b0`) but live-page-144 end-to-end verification PENDING — that is the actual closure step.** Decision 12's `_lift_inner_blocks` rewrite reads `slot_synonyms.standalone_block` via `db.standalone_block_for()`; Phase 6 backfills `block_supports` gaps that expose visual slot controls. No live verification has confirmed visual slots now resolve.
**Status:** OPEN
**Trigger:** Same Playwright run as P-G1-HERO-INNERBLOCKS (page 144, before next pixel-diff session). Pair both verifications in one 15-min run to amortise overhead.


**P-G4-MEASUREMENT-DECONTAMINATION** — `scripts/pixel-diff.py` screenshots include WP admin bar + sgs-header. Mockup screenshots have neither. Systematic +10-20pp inflation on EVERY section measurement. Fix: Playwright `addInitScript` removes `#wpadminbar` + `.sgs-header` before screenshot. **PARTIAL-RESOLVED 2026-05-28** by Spec 22 Phase 0.3 work on `scripts/pixel-diff.py`: chrome-detect (`#wpadminbar` + first `header.wp-block-template-part`) + chrome-hide (`visibility:hidden` pre-screenshot, only on `is_sgs=True` captures of sticky/fixed chrome) + new `--wait-fonts` flag. Empirical: hero-clone-poc 1440 54.5% → 10.3% (-44.2pp); Mama's hero 1440 69.6% → 60.8% (-8.8pp). Most non-chrome-affected cells unchanged. Trust-bar / brand-1440 / hero-768 / hero-375 dimensions baseline unchanged.
**Status:** PARTIAL — closed for sticky template-part-header overlay (the primary 60px chrome bleed). Residual: cv2-emitted `<header class="sgs-header">` body content is NOT hidden (correctly — it's part of the comparison surface, gated on `.wp-block-template-part` class check). **Note (D88 2026-05-27 — /qc-council Task 5 Rater A correction):** Mama's brand-375 +2.4pp shift (53.2% → 55.6%) is NOT flake — three byte-identical-PNG re-runs confirmed determinism. It's a REAL methodology shift from the 83px sticky-chrome hide at 375. Implication: every chrome-affected Mama's cell partially-stale on 2026-05-26 mean 63.0% baseline; Wave B (2026-05-27) re-capture confirmed at full-page scale: new baseline `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` overall mean 62.99% → 58.91% (-4.08pp); Spec 22 body cells aggregate 57.83% → 57.14%. Hero 1440 -8.8pp confirmed. brand-375 +2.4pp persists (0 chrome detected on this cell; wait_fonts=true; effect is wait_fonts-stabilisation not chrome-hide — net honest, not regressed). 23/23 captured cells had chrome-detected + wait_fonts=true telemetry. 2 footer captures failed (Wave B halted reporting per brief threshold; main session accepted per D88 context). Phase 1.5 stretch goal owns any further measurement-script tuning.
**P-PIXEL-DIFF-VERTICAL-ANCHOR-FIX** — Closed by Phase 0.3 (Spec 22 Commit 0.3). 60px chrome-bleed on hero-clone-poc identified as `position:sticky;top:0` template-part header overlaying `el.screenshot()` viewport. Mitigated by pre-screenshot `visibility:hidden` on detected sticky/fixed chrome. Telemetry: `sgs_chrome_height_px` + `wait_fonts` now written to every `diff.json`. See `pipeline-state/_phase-0-3-regression/` for postfix evidence.
**Status:** CLOSED 2026-05-28


**P-G5-PER-BLOCK-DOM-SHAPE-FIXES** — Per-block mismatches between mockup and render output:

- brand-strip: mockup `<blockquote>` vs render `<section>`
- testimonial-slider: mockup 3-col static grid vs render single-card carousel (needs Block Style Variation `displayMode: grid` via P2.iii infrastructure)
- trust-bar: mockup `__badge` + `__text` + inline SVG vs render `__item` + `__label` + Lucide slugs
**Trigger:** Wave 3 of next session (G5), parallel subagents per block.
**Status:** OPEN

**P-F5-D1-MEDIA-FIELD-RESPONSIVE-FLOW** — D1 sidecar preserves `media` field but reader at `convert.py:_load_d1_assignments` only merges base values. Responsive variants (`@media (min-width: 1024px)` → `Desktop` attr) never flow. Hero 375 mobile +13.3pt regression from this. Fix: map media-condition → breakpoint slug → responsive-variant-attr name. **Trigger:** Wave 3 of next session (F5), parallel with G5.
**Status:** OPEN


**P-P1Bx-COMMA-MEDIA-INNER** — P1.B.x's `_scope_media_rule()` only scopes the first part of comma-grouped inner selectors. `@media (...) { .sgs-hero, .sgs-cta { ... } }` produces `.page-id-144 .sgs-hero, .sgs-cta { ... }` — `.sgs-cta` left unscoped. Low-frequency edge case. **Trigger:** next css_router maintenance pass.
**Status:** OPEN


**P-P1Bx-NESTED-SUPPORTS** — Nested `@supports` inside `@media` produces invalid CSS. Recurse the scope-injection OR pass through unchanged. Low-frequency. **Trigger:** next css_router maintenance pass.
**Status:** OPEN


**P-P2II-CSS-VALUE-RE-TIGHTEN** — `_CSS_VALUE_RE = re.compile(r"^[^;{}<>\"]*$")` in `stage_attribute_promotion.py` permits single quotes, backticks, parentheses. Defence-in-depth (esc_attr() in PHP is real guard) but worth tightening. **Trigger:** next P2.ii maintenance pass.
**Status:** OPEN


**P-P2III-ESSENCE-MATCH-TIER-GATE** — `essence_match_variation` tier in cv2 walker only fires when `target == "sgs/container"`. Theoretical edge case: an existing-but-stub block at slug X with a sibling concept Y wouldn't trigger the variation tier. Low-priority. **Trigger:** first real-world variation-detection run.
**Status:** DEFERRED


**P-LEGACY-FILES-PHYSICAL-DELETION** — `tools/recogniser-v2/extract.py` + `extract_strategies.py` + `overrides/hero.py` (1942 LOC) remain on disk; unreachable from orchestrator. Physical deletion deferred until universal extraction handles hero via D1/D3 (no per-block legacy).
**Status:** OPEN
**Trigger:** Phase 1 G5 (per-block DOM-shape fixes) verification PASSES on hero universal-handling at all 3 viewports. "Wave 3" in earlier entry text = current Phase 1 G5 wave.


**P-TEST-POLLUTION-HYGIENE** — `test_licensed_in_description_rejected` fails after `test_staged_merge` (now N/A after Wave 2b revert, but underlying state-leak pattern likely affects other cross-file runs).
**Status:** DEFERRED
**Trigger:** Revisit on first cross-file pytest ordering failure. No active failure observed since Wave 2b revert.



**P-WAVE-4-DOC-FOLLOWUPS** — Sonnet /qc raters surfaced: `/research-buddies` skill missing from dispatch chain; Wave 3 Indus heritage-strip not in flow doc body; `+DEPLOY`/`+PARITY` tails could use dedicated stage blocks; FR36/FR37/FR40 status incomplete in Spec 16 §12.9.
**Status:** OPEN
**Trigger:** Next doc-op session specifically targeting Spec 16 §12.9 and cloning-pipeline-flow.md. "Phase 4" in the original trigger = `.claude/plans/2026-05-24-phase-4-skill-optimisation.md` — check that plan's scope before opening this entry.


### P-DETECT-INNER-ELEMENT-WIDTHS — `_detect_client_layout_widths` misses `__inner` element widths (~20 min)
**Status:** OPEN


**What:** Today's orchestrator re-run wrote `theme/sgs-theme/styles/mamas-munches.json:settings.layout = {contentSize: 1000px, wideSize: 1000px}` — both keys carry the same value because only one block-root selector (`.sgs-brand { max-width: 1000px }`) matched. The mockup actually authors content widths on `__inner` elements: `.sgs-header__inner: 1280px`, `.sgs-trust-bar__inner: 1100px`, `.sgs-featured-product__inner: 1040px`, `.sgs-ingredients-section__inner: 960px`, `.sgs-gift-section__card-inner: 960px`, `.sgs-social-proof__inner: 960px`. The current SGS-BEM-block-root regex correctly rejects these (per Section T of common-wp-styling-errors.md), but in doing so loses real layout-width signal.

**Fix shape:** extend `_detect_client_layout_widths` to ALSO accept `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*__inner$` selectors (the canonical SGS-BEM "inner wrapper" element name). Universal-benefit: `__inner` is a convention name, not a client-specific class. The function still rejects `__title`, `__lead`, `__card`, etc — only `__inner` counts as a layout-width signal.

**Trigger:** next session's intra-section closure work — picking up after this session's framework shipment.

### P-FOOTER-WRAPPER-CLASS-MISSING — sgs/footer render.php doesn't emit `.sgs-footer` on wrapper (~10 min)
**Status:** OPEN


**What:** Pixel-diff against page 144 (canary — page 131 was deleted) selecting `.sgs-footer` at 1440 returns 98.7% diff — but the cause isn't the footer rendering badly; it's that `.sgs-footer` matches a stray `<h2 class="...sgs-footer-label">` heading on the page, NOT the actual `<footer>` wrapper. The sgs/footer block's render.php emits the `<footer>` element without adding `sgs-footer` as its block-root class. Selector-by-prefix mismatches cause this collision.

**Fix shape:** audit sgs/footer (and sgs/header — same issue suspected; header diff 24% may also be wrong-element-matched) render.php to add `sgs-<block-name>` class to the wrapper alongside any existing `wp-block-sgs-<name>`. Re-measure with the corrected wrapper class to get a real footer diff.

**Trigger:** before any further pixel-diff measurement on `.sgs-footer` or `.sgs-header` — selector reliability gate.

### P-HEADER-WRAPPER-CLASS-AUDIT — sgs/header same suspected pattern (~10 min)
**Status:** PARTIAL


**What:** Similar to footer. Header at 24% (clean baseline) is suspiciously low given the visual rendering shows substantial differences. Possible that the selector is matching only a partial header sub-tree. Confirm by checking what `.sgs-header` matches on page 144 (canary page — page 131 was deleted).

**Fix shape:** read first `<*[class*=sgs-header]>` element on page 144; if it's not a `<header>` wrapper, apply the same fix as P-FOOTER-WRAPPER-CLASS-MISSING. **Closure criterion:** Playwright confirms `.sgs-header` matches a `<header>` wrapper element on page 144.

**Trigger:** alongside P-FOOTER-WRAPPER-CLASS-MISSING.

### P-UTF8-MOJIBAKE-IN-CONVERTER — gift-section promo bar shows `ƒÄë New product launch ÖÇö get 20% off` mojibake (~30 min)
**Status:** OPEN


**What:** The rendered SGS output of the gift-section promo bar shows characters that look like CP-1252-as-UTF-8 mojibake — smart-quote / em-dash / emoji bytes have been double-encoded somewhere in the converter pipeline. Mockup source likely contains the correct UTF-8 characters; converter or render is corrupting them.

**Fix shape:**
1. Inspect the raw mockup source to confirm the canonical characters
2. Trace the path from mockup HTML → BeautifulSoup parse → extract → block_markup serialise → WP REST update → render. Find where the encoding gets mishandled.
3. Likely culprits: `convert.py` reading file without explicit `encoding='utf-8'`, or `block_markup` being passed through a Python str→bytes that defaults to cp1252 on Windows.

**Trigger:** intra-section closure work on gift-section.

### P-HEADING-DEFAULTS-NORMALISE-FOR-SERIF — `headlineLetterSpacing: -0.01em` default not universal (~20 min)
**Status:** OPEN


**What:** Rater 1 finding. sgs/heading render.php fallback default `headlineLetterSpacing: -0.01em` actively hurts readability on loose serif faces (DM Serif Display, Playfair). Sans-serif display (Inter, Montserrat) benefits from -0.01 tracking; serifs don't.

**Approach:** Change default to empty string in render.php (no inline style emitted unless explicitly set). Same audit for `headlineLineHeight: 1.2` etc. — defaults should be `null`/empty so theme/inherited values win. Per-attribute audit + update.

**Trigger:** First serif-typography client OR when adding a non-Inter style variation.


### P-BORDER-STYLE-ENUM-PARITY — sgs/heading vs sgs/quote borderStyle enum mismatch (~5 min)
**Status:** OPEN


**What:** Rater 4 finding. quote allows `["none","solid","dashed","dotted","double"]`. heading only allows 4 (no "double"). Setting `borderStyle: double` on heading silently downgrades to `none`.

**Approach:** Standardise to the 5-value set across heading + text + quote + future. One-line edit in each block.json.



### P-WP-AUTOP-INTERACTION — Audit how WP `wpautop` interacts with sgs/text emission (~30 min)
**Status:** DEFERRED

**Trigger:** Revisit if a real test failure surfaces showing double-wrap on sgs/text content — currently theoretical only.

**What:** Rater 4 theoretical risk. WP's `wpautop` filter wraps bare text in `<p>` — if sgs/text emits `<p>` content, double-wrap risk.

**Approach:** Test scenario; if real, add `wpautop` opt-out in block render.


### P-WP-UNIQUE-ID-CACHE-COLLISION — Anchor scoping under fragment cache (~30 min)
**Status:** DEFERRED

**Trigger:** Revisit if a production collision is observed (fragment-cached ID mismatch manifests as a broken style scope). Currently theoretical.

**What:** Rater 4 theoretical. `wp_unique_id()` is per-request sequential. Fragment cache combining requests could mismatch scoped `<style>` ID with rendered element ID.

**Approach:** Use content-derived hash (e.g. `md5` of block JSON) for scoped IDs instead of sequential counter. Stable across cache fragments.

### P-HEADING-TRANSITION-ATTRS — Add transitionDuration + transitionEasing attrs to sgs/heading hover (~15 min)
**Status:** OPEN


**What:** Rater 4 finding (partially false — attrs don't exist today). sgs/heading hover transition is hardcoded `300ms ease`. Non-configurable; should expose attrs for parity with hover-controls extension.

**Approach:** Add `transitionDuration` (number, default 300) + `transitionEasing` (string, default "ease") to block.json. Render.php reads them. Same for sgs/text + sgs/quote.

### P-WRAPPER-ATTR-LEADING-SPACE-AUDIT — Sweep `<element<?php echo` across all dynamic blocks (~45 min)
**Status:** OPEN


**What:** sgs/heading rendered malformed HTML `<divstyle="..."` when WP's block-supports filter injected a style attr via regex without leading space. Fixed today via explicit space: `<div <?php echo $wrapper_attrs; ?>>`. The same pattern likely exists in other dynamic blocks (sgs/info-box, sgs/feature-grid, sgs/testimonial, sgs/card-grid, sgs/container, sgs/hero, sgs/button, sgs/cta-section, sgs/media, sgs/text) — any wrapper tag rendered as `<tag<?php echo $wrapper_attrs; ?>>` without explicit leading space is at risk when block-supports adds inline-style attrs.

**Approach:** grep for `<\w+<\?php echo \\\$wrapper_attrs` across all `plugins/sgs-blocks/src/blocks/*/render.php`. For each match, insert a literal space before the `<?php` opener.

**Trigger:** Next time a dynamic block adds WP-native `supports.spacing` / `supports.color` AND the converter emits it. Or any time someone reports a section that renders shorter than expected on the frontend (could be premature `</tag>` close from malformed parent).

Captured 2026-05-17 from /qc-inline finding 1 (HIGH).

### P-FR1-PLUS-GRID-DOUBLE-LIFT-REGRESSION — Add regression scenario for FR1 + grid container interaction (~30 min)
**Status:** OPEN


**What:** `_lift_root_supports_to_style` for sgs/container is now called from BOTH the FR1 block-root path (line ~1956) AND the css_driven_container path (line ~2422). A node that's BOTH a block root AND has display:grid would route through both branches. The lift uses `_set_in` with never-overwrite semantics → theoretically idempotent, but never exercised end-to-end.

**Approach:** craft a synthetic mockup snippet where a sgs/X-rooted block also has `display: grid` in its mockup CSS. Run through converter. Assert `attrs["style"]` doesn't get clobbered by the second pass.

**Trigger:** Before shipping any further `_lift_root_supports_to_style` changes (immediate gate). The synthetic test scenario is the acceptance criterion — write it once, run it on every lift commit thereafter.

Captured 2026-05-17 from /qc-inline finding 4 (LOW).

### P-MEASUREMENT-CONTEXT-PARITY — Pixel-diff baseline has 30%+ wrapper-context noise floor
**Status:** OPEN


**What:** Brand pixel diff stayed at ~36/13/39% across multiple variations even after universal lift + Path B (sgs/media + sgs/text) + naked-img figure removal + real image upload. Root cause is NOT converter quality — it's wrapper-context noise in the measurement.

**Evidence (2026-05-17):** `.sgs-brand` crop dimensions at 1440 viewport:
- post 66 (mockup baseline): 780 × 791
- post 65 (SGS converter output): 1000 × 705

Different DOM wrapper contexts: post 66 is plain mockup HTML inside WP content area; post 65 has SGS sgs/container parent applying its own padding/max-width. The 30%+ floor cannot be closed without rendering both sides in identical contexts.

**Approach options:**
1. **Standalone-page renderer** — both mockup and converter output rendered as bare HTML pages (no WP theme chrome), pixel-diff between those. New infrastructure (~2-4 hrs).
2. **Identical-wrapper mode** — modify post 66 to wrap mockup HTML in the same SGS-container DOM as post 65. Brittle; depends on the section-shape Bean is cloning. (~1 hr).
3. **Reduced-noise selector** — pixel-diff a finer-grained selector (e.g. just `.sgs-brand__image` element) rather than the whole section. Eliminates wrapper noise but loses cross-element context.

**Trigger:** Next brand+hero walkdown session OR when Bean reviews the 2026-05-17 close.

Captured: 2026-05-17.

### P-IMAGE-UPLOAD-INTO-PIPELINE — Promote upload_and_patch.py into the orchestrator (~30 min)
**Status:** OPEN


**What:** The 2026-05-17 session built `reports/brand-walkdown-2026-05-19/upload_and_patch.py` as a one-shot fix to upload mockup images + patch block_markup. The orchestrator's stage-4i media-sideload runs in `--dry-run` mode by default; live upload is never triggered through the canonical pipeline.

**Approach:** Add `--upload-media` flag to `sgs-clone-orchestrator.py`. When set:
- Pass `upload=True` to `sideload_batch`
- Add a post-sideload "URL rewrite" step that maps relative paths in `extract.json:block_markup` to the uploaded WP attachment URLs
- Save patched extract as authoritative for post-deploy `register_to_wp`

**Trigger:** Any client deploy or live-data run where the converter must produce a working page.

Captured: 2026-05-17.

### P-CORE-STYLE-MAP-DB-MIGRATION — Migrate `_CORE_BLOCK_STYLE_MAP` to DB-driven lookup (~1.5 hrs)
**Status:** OPEN


**What:** The new `_lift_core_block_style()` helper in `convert.py` (commit landing 2026-05-19) uses a 26-entry module-level dict `_CORE_BLOCK_STYLE_MAP` mapping CSS properties to WP core-block `style.*` paths. This is data, not logic — should live in the canonical sgs-framework.db, not inline.

**Why DB-first:** Binding rule blub.db row 260 (2026-05-17) — hardcoded lookup dicts must check DB first. The existing `property_suffixes` (117 rows) covers the SGS-flat-attr mapping (`color → colour`, `font-size → fontSize`, etc.). Core-block style paths (`color → ["color","text"]`, `font-size → ["typography","fontSize"]`) are a parallel but distinct mapping. Either: (a) add a new column to property_suffixes (`core_block_style_path`, JSON-encoded), OR (b) add a new sibling table `core_block_style_paths` (css_property, style_path JSON, kind, image_only bool).

**Trigger:** Next converter iteration touching core-block lift OR a `/sgs-update` refresh that should propagate to both maps OR rater feedback on subsequent commits flags the duplicate.

**Approach:**
1. Schema migration adding `core_block_style_paths` table (CSV-seeded for idempotency)
2. New `db_lookup.core_block_style_path_for(css_prop)` returning `(path, kind, image_only)`
3. Replace module-level `_CORE_BLOCK_STYLE_MAP` with lazy DB call (lru_cache on first use)
4. Mark Bean's row-260 lesson satisfied

Captured: 2026-05-19 by QC rater 2 (Haiku DB-schema lens).

### P-COVERAGE-METRIC-CORE-STYLE — Extend `attribute_coverage` to count core-block nested style paths (~30 min)
**Status:** OPEN


**What:** `scripts/pixel-diff.py compute_attribute_coverage` does suffix-anchored match on SGS-flat-attr keys (`headlineFontSize`, `image.url`, etc.). The new universal-lift helper emits nested `style.color.text`, `style.typography.fontSize`, `image.style.scale` etc. — the coverage matcher doesn't recognise these paths as covering CSS rules.

**Evidence:** 2026-05-19 brand walkdown: post-lift extract has +4 new nested style objects (image.style, heading.style, paragraph.style, button.style). Coverage% still reads 18.75% — unchanged from pre-lift baseline. The lift IS happening (verified in extract.json); the metric is blind to it.

**Approach:** Add a second matcher to `compute_attribute_coverage` that walks nested `*.style` dicts and matches each leaf's path tail (e.g. `style.color.text` covers `color` rules, `style.typography.fontSize` covers `font-size`, `style.dimensions.maxHeight` covers `max-height`). Reuse `_CORE_BLOCK_STYLE_MAP` from convert.py as the ground truth.

**Trigger:** Next session's brand+hero re-measurement OR before any handoff that claims coverage% as evidence.

Captured: 2026-05-19 inline during brand walkdown.

### P-PARENT-QUALIFIED-TAG-LIFT — Smarter SGS-class guard allowing parent-qualified tag selectors (~45-60 min)
**Status:** OPEN


**What:** The 2026-05-19 commit's `_lift_core_block_style` SGS-class guard rejects lift on any node without an `sgs-` class. This correctly blocks the tag-blast-radius bug (rater 3 finding: `p { color: #333 }` corrupting every paragraph globally). However, it ALSO rejects parent-qualified tag selectors like `.sgs-brand__body p { font-size }` — the inner `<p>` has no SGS class but the matching selector IS class-qualified via the ancestor.

**Evidence:** Post-fix shakeout 2026-05-19 shows -1 attr per non-canary section vs subagent's permissive run (brand 40 vs 41, featured-product 53 vs 54, ingredients 28 vs 29, gift 43 vs 44, social-proof 17 vs 18). The lost attr per section is the parent-qualified tag-selector lift.

**Approach:** Modify `_collect_css_decls_for_element` (or add a sibling fn) to RETURN the matched selectors alongside declarations. Then in `_lift_core_block_style`, after collecting decls, filter to only those whose matched selector has at least one `.sgs-*` class token anywhere in the selector chain. This allows `.sgs-brand__body p` (has ancestor sgs class) while rejecting bare `p` (no sgs class anywhere).

**Trigger:** Next session's brand+hero re-measurement when the -1 attr/section gap proves to bite OR P-COVERAGE-METRIC-CORE-STYLE shipping reveals which specific rules are lost.

Captured: 2026-05-19 post-fix verification.

### P-TAG-SELECTOR-LIFT — Lift CSS from tag-only selectors targeting atomic children (~30-45 min)
**Status:** OPEN


**What:** `_lift_core_block_style` reads CSS via `_collect_css_decls_for_element` which matches by class + parent-qualified class selectors. Pure tag selectors (`blockquote p`, `blockquote footer`, `h1, h2, h3 { font-family }`, `img { max-width }`, `a { color }`) aren't picked up because the node's classes don't match.

**Why this matters for brand:** mockup CSS has 5 tag-only rules that affect brand subtree visibility:
- `*, *::before, *::after { box-sizing; margin; padding }`
- `h1, h2, h3 { font-family; line-height }`
- `img { max-width; display }`
- `a { color; text-decoration }`
- `blockquote { font-style }` + `blockquote p { ... }` + `blockquote footer { ... }`

After universal-class filter (the 5 above are universal → don't count), the blockquote-children rules are still missing. They drop brand's effective coverage by 3 rules (blockquote, blockquote p, blockquote footer).

**Approach:** Add a second pass in `_lift_core_block_style` that queries CSS rules for selectors matching the node's tag name + ancestor chain. Limit ancestor chain to 3 levels to avoid combinatorial blowup. Reuse mapping infrastructure.

**Trigger:** Next walkdown where blockquote / tag-styled content is visible OR P-COVERAGE-METRIC-CORE-STYLE shows tag-selector residual.

### P-PHASE9-REDEPLOY-BASELINE — Refresh sandybrown post 65 with post-lift converter output (~20 min)
**Status:** OPEN


**What:** Pixel-diff baseline (post 65 at sandybrown-nightingale-600381.hostingersite.com) was last refreshed 2026-05-17. The 2026-05-19 commit adds new `style.*` attrs into emitted block markup. Until post 65 is redeployed with the new markup, pixel-diff% won't reflect the visible improvement.

**Approach:** Re-run `/sgs-clone` full-page mode → take new extract.json's block_markup for the brand section → update WP post 65 via REST or wp-admin → take fresh screenshots. Standard redeploy workflow.

**Trigger:** Next session's brand+hero re-measurement.

### P-COVERAGE-SCOPE-FILTER — Add `selector_scope` field to expected-rules baseline (~30 min)
**Status:** OPEN


**What:** Coverage% currently treats every CSS rule in `expected-rules-<boundary>.jsonl` as a candidate for SGS-attr matching. Universal selectors (`*, *::before, *::after`), generic-tag selectors (`h1, h2, h3`, `img`, `a`), and pseudo-only-state selectors (`:hover` against generic tags) have no SGS-attr equivalent by design. Including them in the denominator deflates coverage% on every section. Real impact: brand reads 18.75% coverage today (dry-run 2026-05-18); with universal filter applied it would read ~30%. The qualitative verdict ("real debugging needed") doesn't change — but the metric will be more accurate.

**Approach:** Add `selector_scope` field to each baseline row. Values: `universal` (matches `*`, `:root`, `html`, `body`), `tag_generic` (bare tag selectors with no class), `block_scoped` (matches `.sgs-*`). Coverage computation reports `block_scoped` only; the other two surface as separate non-counted lines. Cross-block attr aggregation (rules targeting nested blocks should compare against the child's attrs) is a harder second-order refinement — park separately.

**Trigger:** Bean asks "coverage% feels low" OR cross-cutting batch in a future session OR raters at next session's council debate cite metric noise as a problem.

### P-PHASE9-5 — Empty-DB defensive assertion (Adversarial A1)
**Status:** OPEN


**What:** `db_lookup.css_property_suffixes()` returns `[]` silently if the `property_suffixes` table is empty or DB file is missing (sqlite3 auto-creates an empty file on connect). The lifter then extracts zero CSS-driven attrs across the entire pipeline with no error raised.

**Approach:** Add `assert len(rows) > 0` at module load. Or fail-fast with a clear `RuntimeError` message naming the canonical DB path + `/sgs-update` recovery command. ~5 line fix.

### P-PHASE9-6 — RETIRED_BLOCK_REMAP future-block-registration guard (Adversarial C1)
**Status:** OPEN


**What:** `RETIRED_BLOCK_REMAP = {"heritage-strip": "brand"}` silently locks pattern routing even if `sgs/brand` is later registered as a real block. The remap fires unconditionally; Tier 2 always picks the pattern over the block.

**Approach:** Add a module-load assertion that no `RETIRED_BLOCK_REMAP` value collides with a currently-registered block slug (via `db.registered_block_slugs()`). Or invert the priority: check `block_exists()` first, only remap when the block is actually gone.


### P-PHASE9-NITS-BATCH — Fresh-eyes nits in convert.py / db_lookup.py
**Status:** DEFERRED

**Trigger:** Batch these during the next convert.py general maintenance pass — no functional impact, pure readability.

- **P-PHASE9-8:** `convert.py:_css_prop_to_suffix()` and `_breakpoint_suffixes()` are thin wrappers with no transformation. Inline the calls at the 3 call sites; drop the wrapper functions. ~10 lines removed.
- **P-PHASE9-9:** `db_lookup._kind_for(suffix, role)` is opaque on cold read. Rename to `_value_kind_for_suffix()`. Update the 1 call site.

### P-PHASE8-14 — Section-collapses-into-leaf-block guard
**Status:** OPEN


**What:** Multi-rater /qc panel (fresh-eyes lens) flagged an adversarial scenario: a section whose class accidentally matches a leaf-level block name (e.g. `<section class="sgs-product-card">` rather than `<section class="sgs-products"><div class="sgs-product-card">…</div>…</section>`). Stage 2 matches the registered `sgs/product-card` at confidence 1.0. The block-root fast path fires at the section root. `lift_subtree_into_block_attrs` collapses the entire multi-component section into a single product-card block with whatever the first descendant's attrs were. No bucket captures this — silent collapse.

**Trigger:** Real client mockup hits the pattern, OR Phase 8 closure work uses an adversarial test to demonstrate the gap.

**Approach:** Add a new check `route_section_complexity_mismatch` (or extend `route_wrong_block_type`): when Stage 2 matches a registered LEAF block (no InnerBlocks slot in block.json) at confidence ≥ threshold AND the section DOM contains > N child elements OR descendant depth > D, emit `structural_mismatch_or_orphan` with `source="section_collapsed_into_leaf_block"` and severity `high`. Need to read block.json `supports` to determine "is this a leaf vs composite block". ~25 lines + DB lookup.

### P-PHASE8-15 — severity_totals key in orchestrator router-failure fallback
**Status:** OPEN


**What:** Multi-rater /qc panel (ecosystem lens) noted the orchestrator's bucket-router subprocess-fail fallback initialiser hardcodes `{"leftover_buckets": {}, "totals": {}, "total_count": 0}` — no `severity_totals` key. If the router subprocess fails (non-zero exit) AND a downstream consumer eventually reads `severity_totals`, it'll throw KeyError. No consumer reads it yet, but future operator-review HTML / handoff regen may.

**Trigger:** First downstream consumer of `severity_totals` is wired in.

**Approach:** Add `"severity_totals": {}` to the fallback init dict at `sgs-clone-orchestrator.py:1606`. 1 line.

### P-PHASE8-9 — Slot-synonym expansion: tile / panel / feature / module / item
**Status:** OPEN


**What:** The 2026-05-16 walker fix added `card → sgs/info-box` via `slot_synonyms.standalone_block`. Multi-rater /qc panel (fresh-eyes lens) recommended also registering the four next-most-common BEM element names that map to info-box compositions in real-world client mockups: `tile`, `panel`, `feature`, `module`, `item`.

**Trigger:** Next client onboarding hits one of these element names AND surfaces as an unmatched gap in `pipeline-state/<run>/leftover-buckets.json`, OR Phase 8 closure work touches a section with these names.

**Approach:** INSERT rows into `slot_synonyms` (sgs-framework.db) with `canonical_slot` = one of the names, `standalone_block` = `sgs/info-box`. Mirror as aliases on the existing `card` row if structurally equivalent. ~5 min per synonym.

### P-PHASE8-10 — Standalone-block column validation on walker startup
**Status:** DEFERRED


**What:** Multi-rater /qc panel (architecture lens) raised a deferred concern: a bad row in `slot_synonyms.standalone_block` (e.g. `text → sgs/paragraph`, `media → sgs/image`) would route every leaf-text element through the composite path, conflicting with `ATOMIC_TAG_MAP`. No load-time validation today.

**Trigger:** Next time someone proposes adding a synonym for a tag covered by `ATOMIC_TAG_MAP`, OR the converter exhibits unexpected routing under DB extension.

**Approach:** In `db_lookup._slot_to_standalone_block()`, reject any row where the standalone_block matches a value in `ATOMIC_TAG_MAP.values()`. Emit stderr warning + drop the row from the map. ~10 lines.

### P-PHASE8-2 — Per-block render.php audits
**Status:** OPEN


**What:** Many lifted styling attrs aren't honoured by block render.php. The converter lifts `headlineFontSizeTablet` correctly but the block's render.php doesn't emit a `@media (min-width:768px) { .sgs-Xxx__headline { font-size:N }}` rule for it. Audit 6-8 blocks (hero, product-card, info-box, heritage-strip, testimonial-slider, feature-grid, card-grid, cta-section).

**Trigger:** Phase 8 section-by-section closure — each section's per-section diff above 1% drives an audit of its block's render.php.

**Approach:** for each block:
1. List all *Tablet / *Mobile / *Desktop variant attrs in block.json
2. Confirm render.php emits matching media-query CSS for each
3. Confirm CSS uses `:not([style*="<prop>"])` fallback pattern per SGS standard

**Effort:** ~30 min per block × 6-8 = 3-4 hours.

### P-PHASE8-3 — Remove hyperspecific block_slug guards in `lift_subtree_into_block_attrs`
**Status:** OPEN


**What:** `if block_slug == "sgs/hero":` at line 1016 and `if block_slug == "sgs/heritage-strip":` at line 1048 are pre-existing technical debt the multi-model QC panel surfaced as "in scope of NEEDS-REFACTOR but not new". Refactor to BEM-modifier-driven generic lift via a DB-backed `block_image_slots` table (subagent 5's 2026-05-15 design).

**Trigger:** Either Phase 8 closure work hits a non-Mama's hero, OR the heritage-strip pattern refactor (P-PHASE8-1) makes the heritage guard dead code.

**Approach:** see 2026-05-15 subagent 5 report in conversation transcript. ~70-80 lines + DB seed.

### P-PHASE8-4 — `convert_page.py` line 198 still hardcodes `extracted_attributes: {}`
**Status:** OPEN


**What:** During the 2026-05-15 styling-lift work, the implementer fixed `convert_section()` in `__init__.py` to populate extracted_attributes via brace-depth extraction. The parallel `convert_page.py` function still has the hardcoded empty dict. If the orchestrator routes through convert_page.py instead of convert_section, Stage 9 sees empty extracted_attributes.

**Trigger:** Next session start (Phase 8 will run convert_page.py at orchestrator invocation; surface this as one of the first investigations).

**Approach:** apply the same brace-depth extractor logic. ~15 lines.

### P-PHASE8-5 — Pack-size pills not rendering on featured-product cards
**Status:** OPEN


**What:** Lift code in `_extract_attr_value` and the lift_subtree loop correctly emits `packSizes` array in the converter's WP block markup for Zookies card. Render.php has `if ( ! $is_trial && ! empty( $pack_sizes ) )` gate. Pills don't render visibly on the deployed page. Audit the `$is_trial` computation — likely the variantStyle being lifted as "standard" doesn't quite match what render.php expects.

**Trigger:** Phase 8 section-by-section closure hits `.sgs-featured-product`.

**Approach:** open `plugins/sgs-blocks/src/blocks/product-card/render.php`, trace `$is_trial`, confirm the variantStyle enum mapping. ~15 min.

### P-PHASE8-6 — Section-internal nav mapping
**Status:** OPEN


**What:** `<nav>` is in `SKIP_TOP_LEVEL_TAGS` so the top-level header skip works. But nested navs (inside non-header sections) currently pass-through their children as bare `<a>` tags that render as `<p>Shop</p><p>About</p>…` paragraphs. Map nested `<nav>` to `core/navigation` or `sgs/mega-menu`.

**Trigger:** Phase 8 work hits a section with nested nav, OR a new client mockup needs section-internal navigation.

**Approach:** add `<nav>` to ATOMIC_TAG_MAP routing to `core/navigation` with a child-link lifting helper. ~30 lines.

### P-PHASE8-7 — `_BREAKPOINT_SUFFIXES` non-standard breakpoint silent-drop
**Status:** OPEN


**What:** The styling-lifter's `_BREAKPOINT_SUFFIXES` table covers 5 industry-standard breakpoints (min-width 768/1024/1280, max-width 767/640). Non-standard breakpoints (e.g. `min-width: 900px` or `min-width: 576px`) are silently ignored — the responsive attr family doesn't get lifted.

**Trigger:** Phase 8 work hits a mockup with non-standard breakpoints, OR a CC/QC reviewer flags this gap.

**Approach:** add a stderr warning when a media-query selector matches a known class but the breakpoint isn't in the table. Long-term: read breakpoints from theme.json or a new config rather than a hardcoded set. ~30 min.

### P-MM-1 — Create 4 gap-candidate patterns for Mama's homepage
**Status:** OPEN


**What:** Four mockup sections have no matching pattern yet: `featured-product`, `products` (4× `sgs/product-card` grid), `gift-section` (3 cards: 1 trial + 2 gifts), `social-proof` (containing `sgs/testimonial-slider` + trustpilot bar). Each needs a pattern file under `theme/sgs-theme/patterns/` following the same shape as `ingredients-section.php` and `header-mamas-munches.php`.

**Trigger:** Phase 8 starts. Patterns get created inline as `/sgs-clone` Stage 7 (composition emit) surfaces them — per the "make new blocks inline, never defer with placeholder" rule.

**Spec:** TRUTH-SPEC at `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` documents the slot bindings for each. The renamed mockup HTML at `sites/mamas-munches/mockups/homepage/index.html` is the visual source of truth.

**Effort:** ~10-15 min per pattern (use ingredients-section.php as scaffold; replace inner blocks per slot table).

### P-MM-2 — Decide on sgs/section-heading block
**Status:** OPEN


**What:** Mama's mockup has cross-section utility classes `.sgs-section-heading__label`, `.sgs-section-heading__intro`, `.sgs-section-heading__sub` appearing inside 4 different parent sections. Currently a CSS-only convention. Decide whether to formalise as a dedicated `sgs/section-heading` block so the recogniser can match it as a real block, or leave as a utility convention.

**Trigger:** Phase 8 — if the recogniser flags these classes as orphan elements during Stage 6 (CSS classify), promote to a block. Otherwise stay as utility.

**Effort:** ~30-45 min if creating the block (block.json + edit.js + save.js + render.php + style.css). Zero if leaving as utility.

### P-MM-3 — Add cart element to header-mamas-munches pattern
**Status:** OPEN


**What:** Current `theme/sgs-theme/patterns/header-mamas-munches.php` uses `core/site-logo` + `core/navigation` + `sgs/mobile-nav-toggle` + `sgs/mobile-nav`. The renamed mockup has cart button + cart badge that the pattern doesn't model. Structural drift between mockup and pattern.

**Trigger:** Phase 8 live-deploy parity check. The cart element needs an SGS block or a core block addition to the pattern.

**Spec:** TRUTH-SPEC documents `.sgs-header__cart` + `.sgs-header__cart-badge` slots. There is no SGS cart block currently — likely a `sgs/cart-link` or similar to create.

**Effort:** ~20-30 min (extend the pattern + new block if needed).

### P-PH8-1 — Hero parity test file scaffold
**Status:** OPEN


**What:** Phase 6 Step 6 specified running `python -m pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py::test_hero_filled_slots_match_baseline_count -v` as a sanity check. The test file doesn't exist yet — Phase 8 deliverable.

**Trigger:** Phase 8 starts. The test verifies that `/sgs-clone`'s slot-filler produces ≥50 attributes on the hero section matching `plugins/sgs-blocks/scripts/recogniser/tests/fixtures/hero-baseline.json` (50-attr baseline).

**Spec:** Test file location is the canonical path. Pytest collects from project root. Baseline fixture already exists at `fixtures/hero-baseline.json` (per Phase 6 plan entry-context list — verify before referencing).

**Effort:** ~30-45 min.

---

### P-11-M9 — REOPENED 2026-05-09 (false-claim ship, milestone never actually validated)
**Status:** OPEN


**Status as of 2026-05-09 (this session):** The M9 milestone was claimed shipped by the previous session but was NOT actually validated. The orchestrator extension code shipped (commit dcb185b). The 6521-file foundation committed. But the multi-section orchestrator NEVER RAN on the live site. The wp-sgs-developer subagent was given a brief that contained a fallback ("hero-only deploy is acceptable") and took it; only the M8 hero markup was redeployed to the homepage post. Operator never opened the live URL before claiming success. Live result: hero+footer only, debug WordPress nav, empty footer fields, hero not a clean clone of post 29. Lesson captured as `dont-delegate-the-test-of-unproven-work` (blub.db row 221). M9 must be redone fresh — see next session prompt.

**Critical reframe for the redo:** The end goal is the PIPELINE, not the homepage. The homepage being a perfect clone is the OUTCOME of a working pipeline. When discrepancies are found in the next session, the fix is to identify the failing pipeline component and fix it, then rerun — NEVER patch the artefact directly. Manual SQL edits to fix the WordPress nav menu, manual content fills for the footer, hand-edited block markup are all forbidden. If the pipeline cannot produce a clean clone, the pipeline is incomplete and that is what gets fixed.

**Captured:** 2026-05-09 (M7-M10 session close), reopened 2026-05-09

**Status update 2026-05-09 session:** M7 + M8 COMPLETE.
- M7: 6 sibling skills shipped via /lifecycle Mode A, all >=B grade. Skill scoreboard at evaluation-history.json. Rubric files all carry `bean_signoff: confirmed_via_m7_brief_2026-05-08`.
- M8: minimal orchestrator at plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py. Hero smoke at 100% PoC parity (50/50 attrs match manual baseline). Visual-diff report at reports/visual-diff/hero-2026-05-09.md.
- M9: deferred to next session (this entry).
- M10: handoff + narrow commit (M7/M8 artefacts only) shipped this session. Foundation commit blocked.

**What's left (M9 only):**
- Multi-section orchestrator extension to walk all 9 sections of Mama's homepage in one run (the current orchestrator is single-section)
- Live deploy OVERWRITING the sandybrown homepage (Bean instruction 2026-05-09 — deploy target is the live homepage post, not a sibling post). Snapshot existing `post_content` first for rollback. Post 29 stays preserved as manual hero PoC reference.
- Multi-frame Playwright capture at 0/200/500/1000/3000 ms across 375/768/1440 viewports
- mockup-parity-validator.js per section
- screenshot-diff-helper.js per Q1-Q4 delta flagged
- 13 remaining block visual-diff reports written to reports/visual-diff/<block>-<date>.md (button, container, data-display, icon, icon-block, icon-list, media, mega-menu, mobile-nav, notice-banner, post-grid, process-steps, trust-bar, whatsapp-cta)
- Pre-commit STOP GATE unblocks once all 14 visual-diff reports present (hero + 13 listed)
- 690-file foundation commit lands (currently uncommitted on main since 2026-05-08)
- Bucket-2 session unblocks for Tasks 10-12 dogfood loop

**Source docs (M9 only — M7+M8 complete):**
- `.claude/handoff.md` — most recent session digest
- `.claude/next-session-prompt.md` — full M9 task brief with skills/MCP/agents tables
- **Note:** `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` was deleted (Spec 12 retired). Successor is Spec 15 (`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`) + Spec 16 (`.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`).

**Effort:** ~3 hours wall-time remaining (M9 main-thread + foundation commit).

**Resume trigger:** When Bean has a focused window for the M9 build session.

---

### P-9 — Bucket 2 new blocks + timeline rework
**Status:** OPEN

**Depends on:** P-11-M9 must ship first (pipeline stability prerequisite). If P-11-M9 is substantially delayed, demote this to DEFERRED.

**Captured:** 2026-05-07

**What:** Three new SGS blocks + one rework of an existing block:

| Item | Source | Effort |
|---|---|---|
| `sgs/empty-state` block | gap candidate `empty-state-float` from animation gap audit | 25-40 min |
| `sgs/toggle` block | gap candidate `toggle-slide` from animation gap audit | 40-60 min |
| `sgs/testimonial-slider` block | gap candidate `swipe-to-dismiss` from animation gap audit | 90-120 min |
| `sgs/timeline` rework | Bean 2026-05-07: "design / lack of variety / animations are pretty awful" | 60-120 min |

Total estimate: 3.5-5.5 hrs.

**Strategic dogfood opportunity:** if `/sgs-clone` is shipped + stable when this session runs, design the static layers as HTML/CSS mockups first, then run `/sgs-clone` on each as a real-world stress test. Manually layer the interactive concerns (slider gestures, toggle state) on top.

**Specialised next-session-prompt:** `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md`.

**Resume trigger:** After P-11 ships.

---

## Framework + SGS surface (blocks / theme / specs / Header-Footer)

_21 entries._

**P-SGS-UPDATE-V2-COGNITIVE-COMPLEXITY-REFACTOR** — PARTIAL-RESOLVED 2026-05-24 (3 of ~9 functions shipped this session; 6 remain). SonarLint surfaced 9 functions in `plugins/sgs-blocks/scripts/sgs-update-v2.py` (2,400-line `/sgs-update` orchestrator) with Cognitive Complexity above the 15 allowed.
**Status:** PARTIAL


**Shipped 2026-05-24:**
- **Proposal A** — `stage_5_slot_synonym_auto_seed` cc 29 → ~10 (commit `4c5aaa5c`). 3 helpers: `_match_slot_to_block`, `_apply_high_confidence_match`, `_build_synonym_report`. Cross-model review (Sonnet + Haiku) APPROVE. Polish follow-up: contains-candidates slice moved from helper into coordinator for API consistency (commit `<polish>`).
- **Proposal B** — `stage_4_style_variation_sync` cc 85 → ~9 (commit `8127f880`). 4 helpers: `_write_token_row`, `_build_token_candidates` (promoted from nested), `_process_client_snapshot`, `_write_stage4_report`. Cross-model review found 2 real issues + 1 false-positive; all real issues fixed before commit (dead `_CUSTOM_KEY_BLACKLIST` deleted, `_write_stage4_report` docstring corrected). Haiku's "double-count" was a misdiagnosis — original DID increment `client_inserted` for conflict-inserted when `existing_prefixed is None`.
- **Proposal C** — `_mode_b_refresh_upstream` cc 142 → ~28 (commit `c0fb9639`). 4 source-helpers: `_scrape_source_1_gutenberg`, `_scrape_source_2_hooks`, `_scrape_source_3_wpcli`, `_scrape_source_4_since`. Sources 5-10 kept as the existing shared loop. `new_rows` mutated by reference, per-source commit cadence preserved. Live-network smoke test confirmed Stage 2 return dict byte-identical to baseline. Cross-model review APPROVE. Polish follow-up: `base64` import promoted to module level (commit `<polish>`).

**Remaining for follow-on session:**
- 6 cc warnings not yet investigated. SonarLint line numbers drifted after 3 refactors + polish; re-locate by function name. Approximate function names from the latest sonarlint scan: `stage_1_sgs_codebase_scan` (~cc 73), an early helper near line 571 (~cc 96), `stage_3_wpcli_handbook_refresh` (~cc 27), `stage_7_*` / `stage_8_*` (each ~cc 18), and one more. Run `python plugins/sgs-blocks/scripts/sgs-update-v2.py --dry-run` then re-read the IDE diagnostics for current line numbers.

**Implementation discipline (binding, validated this session):** (1) /subagent-driven-development one proposal at a time per Bean 2026-05-24 — no parallel dispatch on the same file (blub.db row 240 + 254). (2) Each refactor commit gated by 2-rater cross-model review minimum (Sonnet + Haiku via Agent tool). (3) Each refactor's commit-gate: predicted post-fix Stage-N return dict matches baseline dict; report-file body byte-equal (timestamp line excluded); for Mode B `--refresh-upstream --dry-run` source-success / source-fail counts identical pre/post. Do not commit on divergence. (4) Fix ALL issues even non-blocking before commit per Bean 2026-05-24. (5) Implementer must re-locate functions by name (line numbers drift after each commit).

**Trigger to action (remaining 6):** dedicated session after current doc-op programme closes. Open with `python plugins/sgs-blocks/scripts/sgs-update-v2.py --dry-run` + re-read IDE diagnostics to get current line numbers, then dispatch parallel-agents-then-/qc-inline per the 2026-05-24 pattern. Apply same `/subagent-driven-development` discipline — one function at a time, full commit gate before next.



**P-HEADER-FOOTER-SITE-SUFFIX-NAMING-CONVENTION** — NEW 2026-05-24 (clone pipeline convention). Headers + footers produced from drafts by the clone pipeline MUST be saved as `sgs/header-<client-slug>` / `sgs/footer-<client-slug>` (e.g. `sgs/header-mamas-munches`, `sgs/footer-mamas-munches`, `sgs/footer-indus-foods`). Bare `sgs/header` / `sgs/footer` are framework defaults, never site-specific. **Existing misnamed patterns:** `sgs/mamas-munches-header` + `sgs/mamas-munches-footer` use the inverted order (`<client>-<role>` instead of `<role>-<client>`). Phase 2 header/footer cloner should: (a) author headers/footers under the canonical convention, (b) rename the misnamed mamas-munches pair, (c) add a `/sgs-update` Stage 9 drift rule that fails when a `sgs/header-*` / `sgs/footer-*` pattern doesn't follow the canonical order. Spec 17 §S6 enforces this convention for framework defaults already; this entry extends it to client-derived patterns.
**Status:** OPEN



### P-S17-B — Pattern versioning on `wp_template_part` records (~2 hrs)
**Status:** OPEN


**What:** Pipeline cannot detect "what version of this pattern is currently live vs the version I'm about to write." Re-clone idempotence (FR-S7-4) protects against overwriting OPERATOR edits, but doesn't help when the pipeline regenerates the same pattern with intentional updates.

**Fix shape:** Add `_sgs_pattern_version` post meta alongside `_sgs_cloned_from_pattern_slug`. Pipeline compares version on re-run; if newer, overwrite; if same, skip.

**Trigger:** After v1 ships and the first pipeline regeneration scenario surfaces (likely when an SGS client requests a refresh).

**Source:** Spec 17 council, Seat 4 Round 2.

### P-S17-C — Complex nested-component patterns (~4-6 hrs)
**Status:** OPEN


**What:** v1 assumes one pattern per page section (header, footer, hero, etc.). Real mockups have 5+ levels of container > row > column > component nesting. The current 1:1 mapping breaks for designs with composite layouts.

**Fix shape:** Pattern composition registry — patterns can reference other patterns. Spec the depth limit, recursion guard, and inserter UX.

**Trigger:** When a client mockup contains a nesting structure the v1 mapping cannot represent.

**Source:** Spec 17 council, Seat 4 Round 2.

### P-S17-D — Live preview on variation picker (~3-4 hrs)
**Status:** OPEN


**What:** FR-S5-2's variation picker is a dropdown + Activate button. Operator can't see what the variation will do until they activate. The Site Editor's Styles panel has live preview; the SGS picker does not.

**Fix shape:** Either (a) replicate Site Editor's preview mechanism via iframe, OR (b) replace the dedicated picker with a deep-link into the Site Editor Styles panel. Option (b) is the v1.1 default — option (a) is a v2 idea.

**Trigger:** First operator complaint or usability test that flags the missing preview.

**Source:** Spec 17 council, Seat 2 walkthrough #2.

### P-S17-E — Public browseable pattern library marketing page (~1-2 days)
**Status:** DEFERRED

**Trigger:** When SGS has 20+ client-facing patterns OR a sales lead explicitly asks "what do my header options look like?"

**What:** Frost (the block theme) hosts `frostwp.com/patterns` — a public page listing every header/footer/section pattern with screenshots. Useful for sales conversations: agency can show a prospective client "here are 12 header shapes that work with this framework" before they commit.

**Fix shape:** Static page generated from the pattern registry (auto-screenshot via Playwright or hand-curated). Hosted on smallgiantsstudio.co.uk or a subdomain.

**Source:** Research brief idea #7.

### P-S17-F — Deeper PII export safety beyond GDPR exporter (~2-3 hrs)
**Status:** OPEN


**What:** v1 ships the basic `wp_privacy_personal_data_exporters` integration in FR-S4-1. The council surfaced a richer concern: per-key sensitivity flags, export-policy controls (e.g. "VAT number always excluded from any export channel"), and audit logging of who exported what.

**Fix shape:** Extend Site Info schema with a `sensitivity` flag per well-known key (`public` | `business-internal` | `restricted`). Export channels respect the flag.

**Trigger:** When SGS hosts a client with regulated data (medical, legal, financial) OR a GDPR audit requirement surfaces.

**Source:** Spec 17 council, Seat 3 Round 2.

### P-S17-G — Down-migrations + rollback in the migration framework (~4-6 hrs)
**Status:** DEFERRED

**Trigger:** Before the first data-destructive migration is added. Build rollback capability then, not speculatively now.

**What:** FR-S7-2's migration framework is one-way. If a future migration breaks something and the framework is rolled back, attribute data may be in an unrecoverable state. Top WP plugins (WooCommerce, Yoast) ship down-migration support.

**Fix shape:** Each migration callable in `plugins/sgs-blocks/includes/migrations/{version}.php` gains an optional `down()` method. CLI gets `wp sgs migrations rollback --to=<version>`.

**Source:** Spec 17 council, Seat 3 Round 1.


---


### P-17 — Shared universal icon picker component (framework-wide upgrade)
**Status:** OPEN


**Captured:** 2026-05-08 (during sgs/icon-list expansion review)

**What:** Every SGS block that exposes an icon picker control hardcodes its own ~8-item dropdown. Meanwhile the framework actually supports a much richer icon universe: **Lucide (1,963 SVG icons)** + **emojis treated as icons** (uimax `icon_libraries` has 12 emoji families flagged `is_emoji=1` with full Rosetta Stone equivalents) + any **other icon sets installed** (Heroicons, Phosphor, Tabler, Font Awesome — registerable via a future `sgs_register_icon_set` hook). Operators editing `sgs/icon-list`, `sgs/icon`, `sgs/icon-block`, `sgs/info-box`, `sgs/process-steps`, `sgs/multi-button`, `sgs/whatsapp-cta`, `sgs/notice-banner`, `sgs/trust-bar`, etc. all see different tiny dropdowns and never reach any of the broader universe.

**Why this matters strategically:** every clone we do that uses an icon-rich design (services pages, feature grids, process steps, food/restaurant menus) currently risks the operator picking "the closest of 8" instead of "the right icon out of thousands". Recogniser quality also suffers — it can't propose accurate icon mappings if the editor can't render them. Branded emoji-as-marker is a real client request (food sites, lifestyle brands, kids/education sites) that SGS structurally supports today but no operator can actually reach via the UI.

**Spec — universal `<IconPicker>` component (NOT lucide-specific):**

1. **New shared component:** `plugins/sgs-blocks/src/components/IconPicker.js`
   - **Source-agnostic interface** — accepts a `value` shaped as `{ source: 'lucide' | 'emoji' | 'heroicons' | '<custom>', value: '<icon-id-or-glyph>' }` and emits the same shape via `onChange`
   - **Source switcher tabs** at top: Lucide / Emoji / [other registered sets] / Recent / Favourites
   - **Search field** (debounced ~150ms) — searches across the active source by name + tag list. Cross-source search optional (toggle: "Search all sources").
   - **Virtual-scrolling grid** (`react-window` or equivalent) — only renders visible cells. Critical for Lucide (1,963 icons) and the emoji set (~3,500 standard Unicode emojis).
   - **Category sidebar per source:**
     - Lucide: commerce / food / transport / nature / interface / arrows / weather / health / etc.
     - Emoji: smileys / animals / food / activities / travel / objects / symbols / flags
     - Other sets: whatever taxonomy the set declares
   - **Favourites** — pinned icons saved per-site in `wp_options` (max 36, mixed sources).
   - **Recently used** — last 16 used in this editor session (sessionStorage).
   - **Selected preview** at the top with the source label so operator knows what's picked.
   - **Keyboard navigation** (arrow keys + Enter) and 44×44 touch targets per WCAG.

2. **Icon-set registry** (PHP + JS):
   - PHP-side: `sgs_register_icon_set( $args )` — params: `slug`, `label`, `icons` (array of `{id, name, tags, category, svg_or_glyph}`), `kind` (`'svg'` / `'emoji'` / `'font-icon'`)
   - JS-side: `wp.hooks.applyFilters('sgs.icon-picker.sources', defaultSources)` — third-party plugins can extend
   - Built-in registrations:
     - `lucide` (kind=svg) — sourced from existing `includes/lucide-icons.php` (regenerated with tag/category metadata if missing)
     - `emoji-keycap`, `emoji-people`, `emoji-food`, etc. (12 families, kind=emoji) — sourced from uimax `icon_libraries WHERE is_emoji=1`
     - Future: heroicons / phosphor / tabler — opt-in installs

3. **Render-side handling** — the `value` shape carries `source` so the renderer knows whether to:
   - For `source: 'lucide'` → output inline SVG via `sgs_get_lucide_icon()` (existing path)
   - For `source: 'emoji'` → output the glyph directly (needs `aria-label` from the icon's name for screen readers)
   - For `source: '<custom>'` → look up the registered renderer for that set
   
   Render helper: new `sgs_render_icon( $value )` in `includes/render-helpers.php` that switches on source and returns the right HTML.

4. **Migration path** — every block currently exposing an icon-picker control:
   - `sgs/icon-list` (single icon + per-item icon + pattern entries)
   - `sgs/icon`
   - `sgs/icon-block`
   - `sgs/info-box`
   - `sgs/process-steps`
   - `sgs/multi-button` (icon-before-label / icon-after-label)
   - `sgs/whatsapp-cta` (icon override)
   - `sgs/notice-banner` (state icon)
   - `sgs/trust-bar` (per-item icon)
   - `sgs/social-icons` (already partially solves this for social platforms — keep as-is OR fold in)
   - any block that hardcodes its own icon dropdown
   
   Replace each block's bespoke dropdown with `<IconPicker value={...} onChange={...} />`. **Schema change:** existing string-typed icon attributes (e.g. `icon: 'check'`) need migration to the object shape (`{ source: 'lucide', value: 'check' }`). Each migration carries a deprecation that maps old string values to the lucide source. ~15-20 min per block including build verification + deprecation.

5. **Lucide registry expansion** — `includes/lucide-icons.php` is auto-generated. If the current file doesn't carry tag/category metadata, regenerate with metadata included. Confirm the generator script during work.

6. **Emoji registry** — already in uimax. Build a one-time importer that pulls `uimax.icon_libraries WHERE is_emoji=1` plus the standard Unicode emoji set into a JSON manifest at `includes/emoji-icons.json` for the picker to consume offline.

7. **Performance budget** — virtual-scrolling means only rendered cells eat DOM. The full Lucide SVG payload should NOT be loaded on editor mount; lazy-fetch chunks (e.g. by category) on demand. Emoji glyphs are essentially free (single Unicode characters). Render `<svg>` inline only for visible Lucide cells (~20-40 × ~1KB each = ~30KB DOM at any time).

**Effort:** ~3-4 hrs for the shared component + source-registry + emoji import + Lucide metadata regen. ~15-20 minutes per migrated block × ~10 blocks = ~3-4 hrs migration including deprecations. Total **~6-8 hrs realistic** (revised up from initial 4-6 estimate to reflect the broader scope).

**Resume trigger:** standalone session (not a blocker for any active path). Could run before bucket-2 (so the 3 new bucket-2 blocks land using IconPicker from day one) or after bucket-2 (so existing blocks get the upgrade once and bucket-2 ships without it).

**Why this slipped:** original sgs/icon-list spec asked for 8 icons; nobody widened the universe since. Caught 2026-05-08 when the icon-list expansion subagent reported "Editor icon library limited to 8 editor presets" as a known limitation. Bean immediately surfaced the broader missing-functionality (emoji-as-icons + other registered sets) — captured fully here in this revised entry.

---

### P-19 — Broader saved-defaults system audit + WP-native migration
**Status:** OPEN


**Captured:** 2026-05-08 (during icon-list 3-mode design review)

**What:** SGS has a saved-defaults system (`includes/class-block-defaults.php` + `withSaveAsDefault` HOC + the 2026-05-08 unified slot-aware routes added by Fixes-1+2) that lets operators save block-attribute snapshots as site-wide defaults. Bean's insight 2026-05-08: this DUPLICATES WordPress's native Site Editor → Styles → Blocks panel (`wp_global_styles` overlay on theme.json) for visual styling, and the use cases the SGS system covered are mostly handled better by WP-native mechanisms.

The icon-list refactor (2026-05-08) removes saved-defaults usage from icon-list specifically and replaces it with a sessionStorage `useLastUsedAttributes` hook + 5 block patterns. The broader system stays in place because OTHER blocks may still use `withSaveAsDefault` — auditing + migrating each is out of scope for the icon-list refactor.

**Spec:**

1. **Audit (~30 min):**
   - Grep `plugins/sgs-blocks/src/blocks/` for `withSaveAsDefault` usage — list every consumer
   - Grep for `<BlockDefaultsPanel>` direct usage — should be 0 after icon-list refactor
   - For each consumer, classify what's being saved:
     - **Visual only** (colour, typography, spacing, border) → migrate to native WP Site Editor → Styles → Blocks panel; delete saved-defaults usage
     - **Structural** (mode, type, behaviour switches) → replace with `useLastUsedAttributes` sessionStorage hook + canonical block patterns
     - **Mixed** → split: visual goes native, structural goes sessionStorage + patterns

2. **Per-block migration (~10-20 min each):** remove HOC wrap; for visual no further action; for structural, import `useLastUsedAttributes` + register 3-5 patterns; add deprecation if attribute schema changed.

3. **Once all consumers migrated:**
   - Delete `withSaveAsDefault` HOC from `extensions/block-defaults.js`
   - Delete `<BlockDefaultsPanel>` shared component
   - Delete the slot-aware REST routes (`/block-defaults/{block}?slot=...`)
   - Delete the legacy single-slot routes (`/defaults` body-param + `/defaults/{block}` orphan)
   - Drop `class-block-defaults.php` entirely (or keep as a stub for one release cycle if read-time fallback needed)

4. **Documentation:** update CLAUDE.md to capture the model — visual styling = WP Global Styles, structural starting-state = block patterns, per-operator memory = sessionStorage, per-instance customisation = inspector. Project-wide design principle so new blocks don't reintroduce parallel saved-defaults infrastructure.

**Effort:** Audit ~30 min. Per-block migration ~10-20 min × N consumers. Cleanup ~30 min. Total likely 3-6 hours depending on N.

**Resume trigger:** framework polish pass; not blocking any active work; could fold into bucket-2 or its own session.

**Why this matters:** every parallel system the framework maintains is ongoing maintenance cost. WordPress Global Styles is well-understood by operators (it's where they already go) and well-maintained by core. Centralising on it reduces SGS surface area and makes the framework feel native to WordPress rather than "yet another plugin with its own conventions."

---

---


### P-S16-1: sgs/label `source: "html"` selector breadth
**Status:** OPEN

Source binding selector on text attr is `.wp-block-sgs-label` (the root). If save.js is ever modified to wrap content in a child element, round-trip break. Revisit when adding sgs/heading composite block (Phase 2) — same RichText shape, same potential trap.
Source: Sonnet QC 2026-05-14

### P-S16-2: `attr(data-X)` CSS responsive font-size pattern is systemic
**Status:** OPEN

Used in sgs/label + sgs/hero + sgs/info-box. Near-zero browser support for `attr()` outside `content:`. Switch all three to inline CSS custom properties at save time in a future cleanup pass.
Source: Sonnet QC 2026-05-14

### P-S16-3: variantStyle enum hardcoded in converter
**Status:** OPEN

`["standard","trial","gift"]` hardcoded in convert.py:lift_subtree_into_block_attrs. Move to live DB read via block_attributes.enum_values.
**Trigger:** Spec 16 Phase 3 wave (next converter iteration touching lift_subtree).

### P-S16-4: Pre-emit JSON serialisation validation
**Status:** OPEN

Source text with newlines / unescaped quotes / control chars could break the JSON serialisation in block markup. Currently no pre-emit validator.
**Trigger:** Spec 16 Phase 3 wave (same converter pass as P-S16-3). Batch these together.
Source: Gemini Flash QC 2026-05-14

### P-S16-5: Nested block-roots edge case (block inside block)
**Status:** OPEN

sgs-product-card inside sgs-featured-product would trigger lift_subtree on the outer block but its descendant walk would consume the inner block's slots into outer attrs. Add recursion guard.
**Trigger:** Spec 16 Phase 3 wave OR when a real client mockup hits this nested pattern (check leftover-buckets first).
Source: Sonnet QC architectural review 2026-05-14

### P-S16-6: Indus Foods + helping-doctors converter validation
**Status:** OPEN

Spec 16 §9 item 7 (closure criterion): run converter on second client without code changes. Indus Foods and helping-doctors mockups exist but haven't been tested yet.
**Trigger:** After Mama's pipeline reaches ≤1% per-section pixel-diff across 375/768/1440 (Phase 1 G1-G5 structural gaps closed). Estimated ~30 min once stable. "Mama's Phase 4" in older entry text = current Phase 1 structural recovery work.

### P-S17-W2-ADMIN-SPLIT: Split class-sgs-site-info-admin.php (502 lines → ~250 + ~80 + existing fields companion)
**Status:** OPEN

Wave 2 Task 1 + Fix Bundle A1 grew the file from 377 → 502 lines while shipping 4 QC fixes (W1 show_in_rest, W2 social-labels i18n, W3 repeater JS, U3 deprecated-blocks notice). 502 lines is 67% over the 300-line PHP cap from `plugins/sgs-blocks/CLAUDE.md`. Subagent justified the overflow as tight coupling to admin lifecycle constants.

Proposed split: extract `maybe_show_deprecated_blocks_notice()` + `handle_dismiss_floating_ui_notice()` + the 2 dismiss-related constants + the admin-post hook wire into a new `class-sgs-site-info-admin-notices.php` (~80 lines). Main class drops to ~420 lines — still over but defensibly closer.

Trigger: next time anything else gets added to `class-sgs-site-info-admin.php` (new section, new field type, new admin action) OR when Wave 3 starts. Until then, the file works fine; the cap is a maintainability target, not a runtime constraint.
Source: 4-rater /qc panel 2026-05-19 (R3 architecture, A1 + A2 findings; subagent justified inline).


### P-S17-FONT-COLLECTION-NOTICE: WP_Font_Collection sanitize_and_validate_data fires _doing_it_wrong on every WP-CLI invocation
**Status:** OPEN

**Captured 2026-05-20.** `wp_register_font_collection('sgs-google-fonts', [..., 'src' => '<URL>'])` triggers `WP_Font_Collection::sanitize_and_validate_data` with the registration metadata (which has no `font_families` — those live in the JSON at `src`, intended to lazy-load). WP 6.5+ validator complains "missing or empty property: font_families".

**Impact:** WP_DEBUG_DISPLAY is already `false` on staging so the notice is NOT user-visible in admin or frontend. Only appears in WP-CLI output (which respects different display rules). Functionally harmless — fonts work in the editor when the JSON URL is fetched.

**Options when un-parking:**
1. Register with `font_families` inline (load 2.5MB JSON via file_get_contents into a transient on first access) — heavy on cold cache
2. Move registration from `init` to `current_screen` / `enqueue_block_editor_assets` so it only fires in editor context — clean
3. Wait for WP core to fix the eager-validation regression — uncontrolled

**Recommendation:** Option 2 next time we touch this file. Hook is currently `init` — switching to a hook fired only in the block-editor admin path silences CLI noise and avoids loading 1923 entries on every request.

Touch point: `plugins/sgs-blocks/includes/class-font-collection.php`.
Source: Session 2026-05-20 sandybrown smoke test (Spec 17 live verification).

### P-S18-TRANSPARENT-PATTERN-IS-STUB: framework-header-transparent currently delegates 100% to default pattern
**Status:** OPEN

**Captured 2026-05-20.** `theme/sgs-theme/patterns/framework-header-transparent.php` is `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->` with an inline future-work note: "v1.1: variant-specific markup + transparent-over-hero behaviour."

**Impact:** the conditional-rule engine cannot be verified end-to-end at the rendered-output layer for the transparent variant — both default and transparent rules produce byte-identical HTML. Resolver verification works in isolation (`Sgs_Header_Rules::evaluate()` returns 13151 bytes correctly), but the visible-distinction acceptance criterion from Spec 17 ("transparent header renders on homepage when rule fires") is untestable.

**To un-park:** implement the transparent overlay variant per Spec 18 v1.1:
- Sticky positioning with translucent background (likely `position: absolute; top: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(...)`)
- A distinguishing wrapper class so visual diff tests can verify which variant fired
- Once shipped, re-run the acceptance check by adding a rule with `is_front_page` condition and curling `/` to see the transparent classes appear.

**Sibling patterns to audit at same time:** `sgs/framework-header-shrink`, `sgs/framework-header-sticky`, `sgs/framework-header-centred`, `sgs/framework-header-minimal` — check whether they're real variants or stubs delegating to default too.

Source: Session 2026-05-20 sandybrown smoke test (Task 1 acceptance criterion 4).

### P-TIMELINE-ADVANCED-VISUAL-EFFECTS: sgs/timeline needs textured / themed line + progressive-fill effects
**Status:** DEFERRED
**Trigger:** MIC (Muslims in Construction) client requests the bricks timeline effect, OR any other client specifically requests a textured timeline. Do not build speculatively.

**Captured 2026-05-20.** Bean's directive (originally requested before Phase 2A, re-flagged at session end): the sgs/timeline block shipped in Phase 2A Branch D supports orientation (vertical default / horizontal), alignment, scroll-reveal via IntersectionObserver, and prefers-reduced-motion honour. But the LINE itself + per-entry backgrounds need advanced visual treatment Bean specifically asked for:

**Required effects on the timeline LINE:**
1. **Pulsing** — animated stroke or filter pulse on `.sgs-timeline__connector`
2. **Texture / theme** — operator-selectable connector style beyond `line / dashed / dotted`:
   - Vine (organic curved + leaves at intervals via SVG pattern or background-image)
   - Tree (trunk + branches at each entry node)
   - Connected bricks falling into place 1-by-1 as scroll progresses (MIC — Muslims in Construction client primary use case)
   - General colour / gradient fill that progresses with scroll position
3. **Per-entry background fill** — as user scrolls past each entry node, that entry's `.sgs-timeline__content` background fills with a colour or gradient. Operator chooses the source colour / gradient per entry OR globally per timeline.

**Implementation sketch (for the future session):**
- Add `connectorTexture` attribute (enum: 'plain' | 'pulse' | 'vine' | 'tree' | 'bricks' | 'gradient-fill') — extends existing connectorStyle
- Add `connectorFillSource` (string: token slug for colour OR gradient slug)
- Add `entryFillOnReveal` (boolean) — toggle per-entry background fill on reveal
- Add `entryFillSource` (string: token slug or per-entry override)
- view.js extends: in addition to .is-revealed toggle, track scroll position relative to each connector segment and animate fill-percentage via CSS custom property `--sgs-timeline-fill-progress` updated on rAF
- SVG-based connector renders: replace solid `<div class="sgs-timeline__connector">` with `<svg>` per connector segment when texture != plain, allowing pattern fills + path animation
- Bricks variant: each entry segment is a series of small block elements stagger-animated with transform translateY → 0 + opacity 0 → 1 on reveal

**Client driving the request:** MIC (Muslims in Construction) — wants the timeline-of-bricks visual for their journey/process page.

**Acceptance when this lands:**
- Each connector texture rendered correctly at 375 / 768 / 1440 viewports
- `prefers-reduced-motion` disables texture animation, falls back to plain solid line
- Per-entry background fill animates only on scroll progression past entry node
- Bricks variant renders distinct brick units (not a single texture)
- WCAG: animations honour reduced-motion; decorative SVG textures have `aria-hidden="true"`

**Also update blocks spec:** `.claude/specs/02-SGS-BLOCKS.md` needs an sgs/timeline section that documents these expanded effects as the canonical scope (currently only sgs/process-steps is documented as "horizontal timeline").

Source: Bean's 2026-05-20 directive — captured at end of Phase 2A massive session before cloning-pipeline resumption.

---

### P-WP70-REGISTER-BLOCK-VARIATION-MISSING — polyfill load-bearing forever

**Status:** BLOCKED
**Why:** `register_block_variation()` does NOT exist as a top-level PHP function in WP 7.0. Session A's commit `cc541e94` migrated all 13 SGS variation files to the `get_block_type_variations` filter. That polyfill is load-bearing and must not be removed by a future "WP 7.0 cleanup" refactor.
**Acceptance when this lands:**
- Watch WP 7.1+ release notes for a `register_block_variation()` top-level function. If/when introduced, the migration filter can be retired.

## Skills, agents, pipelines (lifecycle + QC + meta-tooling)

_4 entries._

**P-BATCH-GA-14-SKILLS** — Run `/batch-gap-analysis` (full `/gap-analysis` protocol per target, sequential, in main conversation per blub.db row 176) on the 14 WP/SGS skills revised during Phase 7. Targets: the 10 original WP-family skills (`wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`) plus `sgs-wp-engine`, `wordpress-router`, `sgs-extraction`, `sgs-clone`. **Estimated:** ~3 hours dedicated session.
**Status:** OPEN
**Trigger:** After P-11-M9 ships AND G1-G5 structural gaps close (skills reference those pipeline components — grading against stale code is pointless). Do NOT run before both those milestones land.


**P-SUBAGENT-DRIVEN-DEV-SKILLSCORE-DEBT** — NEW 2026-05-23. `~/.agents/skills/subagent-driven-development/SKILL.md` scores 84% (below 90% threshold). Pre-existing issues surfaced when the line-319 xref fix triggered the skillscore hook: (a) no numbered process stages found, (b) skill doesn't declare which skills it invokes, (c) no hooks/ directory, (d) no scripts/ directory, (e) body 317 lines (over 300 working budget — needs progressive disclosure). Cleanup routes through /lifecycle per project CLAUDE.md. **Trigger:** Task 6 skill-optimiser session (mode 2 = gap analysis + research) is the natural home — bundle with /batch-gap-analysis pass on 14 WP/SGS skills.
**Status:** OPEN


**P-QC-COUNCIL-PHASE-B-BACKPORTS** — qc-trio gap-analysis identified 5 backports from /qc-council into /qc + /qc-inline. Phase A shipped this session via Sonnet subagent — branch `feat/qc-skills-backport-from-qc-council` commit `e340cde` in `~/.agents/skills/`. Phase B = optional follow-ups for hard-iteration-cap + persona-disagreement-carry-forward + rationalisation-table integration. Lower priority since the trio is already at 92-94% skillscore. **Trigger:** next skill-optimisation session.
**Status:** OPEN



### P-OPS-1 — Skill-type classifier in sgs-skillscore v3
**Status:** OPEN


**What:** 24 of 45 Phase 4 surfaces sit below 90% on skillscore because the validator grades commands, agents, mini-skills, and discipline references against full-skill criteria. A `--type` flag or auto-detection (command files in `~/.claude/commands/`, agent files in `~/.claude/agents/`, mini-skills via `user-invocable: false` frontmatter) would lift these scores out of rubric-mismatch baseline.

**Trigger:** Bean explicitly opens scope for a skillscore upgrade, or a pattern emerges where rubric-mismatch is masking a real regression. Not urgent.

**Spec:** Add `type` field detection to `sgs-skillscore.py validate`. Type tiers: full-skill (current rubric), command (CLI shortcut — relaxed), agent (identity file — different criteria), mini-skill (sub-skill routed via parent — minimal rubric), reference (discipline doc — minimal rubric).

**Effort:** ~60-90 min (rubric design + implementation + re-grade all 45 Phase 4 surfaces as regression check).

## Infrastructure (hooks, deploy, hosting, third-party integrations)

_3 entries._

**P-PHASE-5B-THEMEJSON-CONSUMPTION-PURITY** — NEW 2026-05-23 (architectural cleanup). The Customiser :root CSS custom property emission ships at `class-sgs-header-renderer.php:73-78` + `class-sgs-footer-renderer.php:68`. Current paint via inline `<style id="sgs-header-customiser">` is functionally correct but architecturally less pure than consuming via theme.json `styles.color.background = var(--sgs-header-bg)`. **Trigger:** WP-7-architecture-polish session, low priority. NOT blocking on any client work.
**Status:** OPEN


### P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** OPEN

**Trigger:** ~15-20 min task via Playwright MCP. Pick it up mid-clone session when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

---

### P-6-LUCIDE-REST-ENTRY-POINT — research WP 7.0 icon-collection registration API

**Status:** BLOCKED
**Why:** `class-sgs-lucide-icons-rest.php` checks `function_exists('wp_register_icon_collection')` — that function doesn't exist in WP 7.0 even though `WP_REST_Icons_Controller` class does. The registration entry point is somewhere else — likely a class method on `WP_REST_Icons_Controller` (candidate: `register_collection()`).
**Acceptance when this lands:**
- Correct registration API name identified from WP 7.0 source (`wp-includes/rest-api/endpoints/class-wp-rest-icons-controller.php`)
- `class-sgs-lucide-icons-rest.php` updated to actually register the SGS Lucide collection
- Playwright confirms editor icon picker loads from native REST endpoint
- `sgs_get_lucide_icon()` shim can then be retired (separate follow-up commit)

## Cross-platform emit pathway (M9+ — deferred until production-stable)

_3 entries._

### P-CP-1 — `/sgs-emit` (cross-platform component emitter)
**Status:** DEFERRED
**Trigger:** M9 production-stable + ≥3 successful clones banked. Do not start before then.


**What it does:** Read a `/sgs-clone` result (composition + filled slots + recognised SGS blocks) and emit equivalent component code for non-WP platforms. Targets in priority order: React (web SPA), React Native (mobile), Flutter (mobile), SwiftUI (iOS native), Web Components (framework-agnostic). Emit pathway uses `role-templates.json` direction:generate entries plus uimax `equivalent_implementations` payloads to map SGS blocks to platform-idiomatic components.

**Trigger:** Vague — client request for non-WP platform. Specific named use cases as recognition aids: Bean & Tub mobile app (RN); Indus Foods mobile reskin (RN or Flutter); any SGS Studio v2 mobile component. Soak ~3 months after M9 production-stable.

**Effort estimate:** ~8-12 hours initial scaffold + ~4-6 hours per platform target for first smoke test.

**Source materials:**
- uimax `stack_*` tables (Angular, Astro, Flutter, HTML/Tailwind, Jetpack Compose, Laravel, Next.js, Nuxt, React, React Native, shadcn, Svelte, SwiftUI, Three.js, Vue — 49–60 rows each)
- `role-templates.json` direction:generate entries (post-Phase 4)
- uimax `equivalent_implementations` payloads on every artefact (Rosetta Stone)
- Spec 13 (`.claude/specs/13-DRAFT-NAMING-CONVENTION.md`) — SGS-BEM is what makes cross-platform structural alignment feasible at all

**Dependencies:** M9 production-stable (so the clone pipeline is reliable before we extend it); ≥3 successful clones banked (test data); Phase 4 propagation complete (so `/sgs-clone` body honours Spec 13 lingua-franca rule).

### P-CP-2 — Style translation (theme.json → React/Flutter/SwiftUI styles)
**Status:** DEFERRED
**Trigger:** P-CP-1 in flight OR client request for style-only cross-platform port. Do not start before M9 production-stable.


**What it does:** Read `theme.json` palette + spacing + typography tokens (or uimax `design_tokens` table directly) and emit equivalent style objects for: React (CSS-in-JS objects, styled-components ThemeProvider props, Tailwind config), Flutter (`ThemeData` + per-component overrides), SwiftUI (custom modifier extensions on `View`), Web Components (CSS custom property block). Honours DTCG token format already in uimax.

**Trigger:** Vague — P-CP-1 in flight OR client request for style-only port (e.g. design system migration). Specific named: HelpingDoctors EHR app theme port from web to mobile.

**Effort estimate:** ~6-8 hours per target platform.

**Source materials:**
- uimax `design_tokens` table — 5,164 DTCG-format rows as of 2026-05-10
- Rosetta Stone payloads on token rows
- `theme.json` v3 (per-client style variations in `theme/sgs-theme/styles/`)

**Dependencies:** Not strictly required after P-CP-1 but synergistic — emit + translate ship together for full app-component parity. Deferred until M9 production-stable.

### P-CP-3 — Animation translation (uimax animations → React-spring / Flutter / SwiftUI)
**Status:** DEFERRED
**Trigger:** P-CP-1 + P-CP-2 in flight AND animation-rich app port requested. Do not start before M9 production-stable.


**What it does:** Translate CSS keyframe animations captured in uimax `animations` table to: React-spring config (`useSpring` calls + `config` objects), Flutter `AnimationController` + `Tween` setups, SwiftUI `.animation()` and `withAnimation { }` form. Reads via `equivalent_implementations` Rosetta Stone payloads on each animation row.

**Trigger:** Vague — P-CP-1 + P-CP-2 in flight, animation-rich app port requested. Specific named: Bean & Tub mobile splash/transitions; HelpingDoctors EHR loading states.

**Effort estimate:** ~4-6 hours per platform target.

**Source materials:**
- uimax `animations` table — 63 rows (post 2026-05-10 5-column migration: `is_gap_candidate`, `gap_reason`, `sgs_block`, `sgs_animation_attribute`, `equivalent_implementations`)
- Rosetta Stone payloads on animation rows

**Dependencies:** `animations` table needs ≥30 cross-platform-mapped rows (current 63 rows, but mapping coverage to verify before emit work begins). M9 will surface more animations via `/uimax-scrape-animation` runs. Cross-link to P-CP-1 and P-CP-2.

---

## Other (uncategorised — manual triage needed)

_2 entries._

### P-10 — `svg-morph` animation gap candidate (DEFERRED INDEFINITELY)
**Status:** DEFERRED


**Captured:** 2026-05-07

**Why deferred:** Requires GSAP MorphSVGPlugin — paid Club GSAP library. Misaligned with SGS open-source default.

**Resume trigger:** Only if a paid client specifically needs SVG morphing AND they're willing to fund Club GSAP licensing. Otherwise leave the uimax `animations` row flagged `is_gap_candidate=1` with a note pointing here.

**Alternative path:** Anime.js morphing helpers, custom SMIL fallbacks, hand-coded path interpolation. None match GSAP MorphSVG's polish but all are licence-free.

---

### P-2 — Phase 2.5 / G2.5 deferred work
**Status:** BLOCKED

**Blocker:** Waiting for Phase 2 G2 gate to close. The referenced `.claude/plans/phase-2-rubrics-universe.md` has been deleted — G2 gate status unverified. Verify current G2 status in `.claude/plans/` before opening this entry.

See G2.5 section in the Phase 2 plan. Triggered by Phase 2 G2 gate close + tooling spec finalisation.

- Track 2 optimiser passes (4 skills): /extract, /harden, /ethics-gate, /interactivity-capture
- Structural debt content fixes (3 agents): design-reviewer, seo-auditor, sgs-extraction
- seo-technical content fixes (3 A-grade rubric gaps + ai-crawler-management opportunity)
- 9 deletion-bound migration notes (Phase 4 design-brain DB schema dependency)

---

