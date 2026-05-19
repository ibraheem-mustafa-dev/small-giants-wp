# Pipeline Root-Gap Council — Rater Sonnet (Primary)

**Date:** 2026-05-20  
**Rater:** Sonnet 4.6 (Rater 1, adversarial lens)  
**Files read:** evidence-pack.md, leftover-buckets.json (sampled), summary.log, convert-trace-b2/b4/b6.jsonl, slot-list.json, extract.json, convert.py (~3753 lines), __init__.py, slot_list.py, index.html (hero section + CSS), render.php files (trust-bar, hero), sgs-framework.db, db_lookup.py, mamas-munches.css, functions.php, sgs-clone-orchestrator.py

---

## 1. Gap Register

```json
[
  {
    "issue": "82% of inner-element CSS selectors in mamas-munches.css are dead — they target mockup class names that render.php never emits",
    "root_cause_class": "theme",
    "severity": "critical",
    "evidence_file_line": "theme/sgs-theme/styles/mamas-munches.css:all — 51 of 62 inner-element selectors (e.g. .sgs-hero__sub, .sgs-trust-bar__badge, .sgs-trust-bar__text) have no matching class in any block render.php; confirmed via cross-reference of mamas-munches.css vs render.php files across all blocks",
    "proposed_fix": "Stage 0.7 (css-lift) must emit a selector-remapping layer, not raw mockup CSS. For each inner-element rule in the mockup CSS, the pipeline must look up the corresponding block render.php BEM element name (via a DB-backed mock-name→canonical-name map) and rewrite the selector before writing to the variation CSS file. Alternatively, enforce a shared BEM contract: the mockup spec must use the SAME inner-element names as the block's render.php, and Stage 0 BEM-lint must gate on exact match. Either way, the current state — where Stage 0.7 blindly copies mockup selectors that never match rendered HTML — is the dominant failure mode.",
    "cross_pattern_impact": "Affects every future clone because: every mockup's inner-element CSS is written verbatim and every block has its own render.php BEM vocabulary. Any new client mockup with bespoke __yyy names produces dead CSS. This is not Mama's-specific — it is structural.",
    "confidence": 0.95
  },
  {
    "issue": "Extraction-failed metric inflated by NULL canonical_slot attrs — 941 of 1097 failures are for schema attrs the slot-walker can never reach",
    "root_cause_class": "DB",
    "severity": "high",
    "evidence_file_line": "leftover-buckets.json: all 941 cv2_emitted_dynamic entries have reason='no value extracted'; sgs-framework.db block_attributes: sgs/text attrs letterSpacing/textTransform/fontFamily/fontSize have canonical_slot=NULL; sgs/hero attrs alignment/backgroundColor/textColor and 20 others have canonical_slot=NULL",
    "proposed_fix": "Every block attribute that has a CSS counterpart must have a canonical_slot. The DB populate step (run via /sgs-update) should scan each block's block.json for attrs whose names match a property_suffixes css_property and auto-assign the canonical slot. For attrs with NULL canonical_slot and a CSS css_property mapping, the cv2 walker should fall back to direct CSS-to-attr lookup (bypassing the slot chain) so those attrs are lifted when CSS exists in the mockup. This is a DB hygiene + fallback path fix, not a per-block patch.",
    "cross_pattern_impact": "Affects every emitted block. sgs/text has 4 styling attrs with NULL slot; sgs/heading similarly; sgs/hero has 23. Every future clone that emits these blocks will log identical failures and the leftover-bucket count will misrepresent actual extraction quality.",
    "confidence": 0.90
  },
  {
    "issue": "letterSpacing / textTransform / fontFamily not lifted for sgs/text atoms because font-family is missing from _CORE_BLOCK_STYLE_MAP and the flat-map path only runs when the CSS rule is found",
    "root_cause_class": "converter",
    "severity": "high",
    "evidence_file_line": "convert.py:1391-1427 (_CORE_BLOCK_STYLE_MAP dict) — 'font-family' key absent; confirmed by grep: 'font-family NOT in convert.py CORE STYLE MAP'; _flatten_wp_style_to_sgs_flat:1539-1548 handles letterSpacing/textTransform IF they reach the style_dict, but _CORE_BLOCK_STYLE_MAP never puts them there for the atomic_paragraph/atomic_text_fallback paths that produce sgs/text",
    "proposed_fix": "Add 'font-family' to _CORE_BLOCK_STYLE_MAP at convert.py line ~1396 with path ['typography', 'fontFamily'] and kind 'str_passthrough'. This is a single-line addition. Then verify _flatten_wp_style_to_sgs_flat handles fontFamily (it handles font-size/weight/letterSpacing/textTransform but not fontFamily). Add fontFamily mapping in _flatten_wp_style_to_sgs_flat at line ~1527 alongside the other typography props. Universal: this fixes fontFamily lifting for ALL sgs/text atoms across all future clones.",
    "cross_pattern_impact": "fontFamily is the top unresolved typography property. Every section with branded typography (Fraunces, Inter specific weights) loses the correct font because fontFamily is never lifted to sgs/text attrs. Expected impact: 5-15% pixel-diff reduction per section with distinctive typography.",
    "confidence": 0.88
  },
  {
    "issue": "max-width and margin are skipped for core/* blocks (not_in_core_style_map) affecting layout-critical container rules",
    "root_cause_class": "converter",
    "severity": "medium",
    "evidence_file_line": "convert-trace-b6.jsonl: 7 events of css_decl_skipped:not_in_core_style_map for core/paragraph including 'margin' and 'max-width'; _CORE_BLOCK_STYLE_MAP:1391-1427 — 'max-width' and 'margin' (shorthand) absent; margin-top/right/bottom/left ARE present but 'margin' shorthand is not",
    "proposed_fix": "Add 'margin' shorthand to _CORE_BLOCK_STYLE_MAP with path ['spacing', 'margin'] and kind 'unit' — the shorthand parser already handles it in _lift_root_supports_to_style (line 1680-1685) but that function only runs for sgs/* blocks. Either (a) extend the shorthand expansion to run before the _CORE_BLOCK_STYLE_MAP loop at line 1679, or (b) add 'margin' shorthand to _CORE_BLOCK_STYLE_MAP with a special 'shorthand' kind that expands per-side. max-width belongs in the SGS path (_lift_root_supports_to_style), not _CORE_BLOCK_STYLE_MAP since core blocks don't support dimensions natively.",
    "cross_pattern_impact": "Affects any core/paragraph or core/heading with a class-targeted max-width or margin shorthand rule. In the mamas-munches mockup: .sgs-featured-product h2 { margin-bottom: 6px } and similar rules are dropped. Medium impact — WP native spacing tokens can partially compensate.",
    "confidence": 0.80
  },
  {
    "issue": "slot_synonyms missing for 'price-row', 'price-note', 'card-tag', 'text' — preventing canonical slot resolution for featured-product and gift-section elements",
    "root_cause_class": "DB",
    "severity": "medium",
    "evidence_file_line": "convert-trace-b4.jsonl: db_lookup_miss events with token='price-row', 'price-note', 'card-tag' and lookup='canonical_slot_for'; convert-trace-b4.jsonl and b6.jsonl: db_lookup_miss for 'text' with lookup='standalone_block_for'",
    "proposed_fix": "Add slot_synonyms rows: 'price-row' → canonical 'price', 'price-note' → canonical 'annotation', 'card-tag' → canonical 'badge', 'text' → canonical 'text' with standalone_block 'sgs/text'. Run /sgs-update after. These are generic enough to apply across clients (any product card, any pricing section) so they should live in the framework DB, not per-client config.",
    "cross_pattern_impact": "Any clone with pricing sections, card tags, or composite text elements will hit these same misses. The 'text' miss specifically means composite-element-to-standalone routing falls through to a generic container wrapper instead of emitting sgs/text — losing all inline styling.",
    "confidence": 0.85
  },
  {
    "issue": "Width mismatch: SGS pages constrained to 1200px (base wideSize) while mockup is 1440px — indicates mamas-munches style variation may not be active on test page",
    "root_cause_class": "orchestration",
    "severity": "high",
    "evidence_file_line": "evidence-pack.md: 'trust-bar 1440: mockup 1440x88 / SGS 1200x93'; mamas-munches.json settings.layout.wideSize=1280px; base theme.json settings.layout.wideSize=1200px; functions.php:228-237 — mamas-munches.css is only enqueued when active_theme_style='mamas-munches'",
    "proposed_fix": "Stage 10 (upload_and_patch.py) must verify that the target page's parent site has the mamas-munches style variation active (active_theme_style theme mod) before the pixel-diff run. If not active, Stage 10 should set it via WP REST API or WP-CLI as part of the deploy sequence. Without this, both the CSS and the contentSize/wideSize dimensions will differ from the mockup, adding structural width noise to every section's pixel-diff. The pipeline should emit a warning to summary.log when this condition is unverified.",
    "cross_pattern_impact": "Any client whose style variation isn't active during pixel-diff measurement gets false-high pixel-diff numbers from width/layout differences, masking the real attribution between 'CSS dead' vs 'attrs not lifted' vs 'structure wrong'.",
    "confidence": 0.75
  },
  {
    "issue": "Trace event field shapes are inconsistent for db_lookup_miss — aggregators counting 'miss_type' return wrong totals",
    "root_cause_class": "orchestration",
    "severity": "low",
    "evidence_file_line": "evidence-pack.md: 'Some have miss_type field, some have lookup + token, some have lookup + canonical_slot'; confirmed in convert-trace-b4.jsonl: db_lookup_miss events use {lookup, token} shape, not {miss_type} shape",
    "proposed_fix": "Normalise db_lookup_miss to a single shape: {stage, lookup, token, boundary_id}. All call sites in db_lookup.py should use the same field names. The 33 db_lookup_miss events reported in evidence-pack may be undercounting because different shapes aren't aggregated together. This is low severity but impairs root-cause visibility for all future runs.",
    "cross_pattern_impact": "Trace data quality affects all future gap-analysis council runs. Inconsistent shapes mean future raters will draw different conclusions from the same data depending on which fields they inspect.",
    "confidence": 0.90
  }
]
```

---

## 2. Top 3 Root Gaps (ordered by severity × cross-pattern impact)

### Gap 1 — Dead CSS from class-name divergence (CRITICAL, confidence 0.95)

The dominant cause of 25–99% pixel-diff across ALL sections. Stage 0.7 copies the mockup's CSS verbatim into `mamas-munches.css`. That CSS targets inner-element BEM classes like `.sgs-hero__sub`, `.sgs-trust-bar__badge`, `.sgs-trust-bar__text`. But the WP block `render.php` files emit entirely different inner element names: `sgs-hero__subheadline`, `sgs-trust-bar__item`, `sgs-trust-bar__label`. Cross-referencing `mamas-munches.css` (62 inner-element selectors) against all `render.php` files shows **51 of 62 (82%) are dead CSS** — they never match a rendered element. The variation CSS is loaded correctly by `functions.php` (line 228), but it hits nothing. The hero at 96%+ diff: `.sgs-hero__sub { font-size:16px; line-height:1.65 }` targets the subheadline but `render.php` outputs `class="sgs-hero__subheadline"`. Zero styling applies for that slot.

**Fix:** Either (a) enforce a shared BEM contract — the pipeline BEM-lints the mockup against the block's render.php element vocabulary and rejects mismatches at Stage 0.1, OR (b) Stage 0.7 rewrites selectors using a mock-name→render-name lookup table seeded from render.php. Option (a) is cleaner and enforces discipline upstream.

### Gap 2 — NULL canonical_slot on styling attrs inflates extraction failures (HIGH, confidence 0.90)

941 of 1097 `extraction_failed` entries come from `cv2_emitted_dynamic` blocks (sgs/text: 491, sgs/info-box: 180, sgs/button: 92). For sgs/text specifically: `letterSpacing`, `textTransform`, `fontFamily`, `fontSize` all have `canonical_slot=NULL` in the DB (`sgs-framework.db block_attributes` table). The slot-walker skips any attr with NULL slot. The `attr_skipped` roll-up at `convert.py:2937-2952` then marks every unfilled schema attr as `value_empty` regardless of whether the mockup had the CSS or not. This means the 1097 number is noisy — it includes both genuine extraction misses AND attrs that were correctly omitted because the CSS didn't specify them. The metric is misleading the council.

**Fix:** Add canonical_slot values for styling attrs that have a CSS counterpart in `property_suffixes`. Separately, add a fallback path in `_lift_styling_attrs` for attrs with `canonical_slot=NULL` but a known `css_property` mapping — attempt direct CSS-to-attr lift without the slot chain.

### Gap 3 — font-family missing from both CSS-to-attr mapping paths (HIGH, confidence 0.88)

`font-family` is absent from `_CORE_BLOCK_STYLE_MAP` (`convert.py:1391-1427`) and therefore never lifted when `_lift_core_block_style` processes atomic paragraph/heading nodes. `_flatten_wp_style_to_sgs_flat` handles `letterSpacing`, `textTransform`, `lineHeight` etc. for `sgs/text` but has no `fontFamily` branch. The featured-product section uses `font-family: 'Fraunces', serif` for the price display — this never reaches the block attrs. Since typography (font choice, letter-spacing, transforms) is a primary visual differentiator between default SGS rendering and a client's brand, this class of miss is disproportionately visible.

**Fix:** Single-line addition to `_CORE_BLOCK_STYLE_MAP` at convert.py line ~1396, plus a `fontFamily` branch in `_flatten_wp_style_to_sgs_flat` at line ~1527. The DB `_KIND_BY_SUFFIX` already has `"FontFamily": "string"` at db_lookup.py:380 — the pipeline just doesn't connect it to the `_CORE_BLOCK_STYLE_MAP` path.

---

## 3. Smoking Gun Confirm/Refute

### Smoking Gun #1: `css_decl_skipped: no_sgs_bem_class_on_node` indicates DOM/CSS class drift

**PARTIALLY CONFIRMED — but lower severity than pre-analysis implied.**

Only 2 events across all 9 boundaries (b4 and b6, both `core/heading`). The guard at `convert.py:1649-1653` fires for `_lift_core_block_style` only — and only when the node has zero sgs- classes. In practice, most unclassed headings in the mockup have parent-qualified CSS (`.sgs-xxx h2 {}`). That CSS is already in `mamas-munches.css` and WILL apply at render time via the WP DOM nesting — the core/heading sits inside a `sgs/container` wrapper with the correct BEM class, so `.sgs-xxx h2` selectors still hit. The guard is correct behaviour (prevents blast-radius corruption) and only fires on 2 nodes. **Not a root cause.**

### Smoking Gun #2: `css_decl_skipped: not_in_core_style_map` indicates incomplete cv2 core-style-map

**CONFIRMED — specific gaps confirmed, severity medium.**

`margin` shorthand and `max-width` are missing from `_CORE_BLOCK_STYLE_MAP` (`convert.py:1391-1427`). `font-family` is completely absent. `convert-trace-b6.jsonl` shows 7 `not_in_core_style_map` events for `core/paragraph` including `margin` and `max-width`. However: the cv2 atomic paths for sgs-classed paragraphs swap to `sgs/text` (not `core/paragraph`) and use `_lift_core_block_style` → `_flatten_wp_style_to_sgs_flat` which DOES handle the result. The core-style-map misses only affect unclassed core/* blocks and the upstream CSS-not-lifted path. `font-family` is the most impactful miss here (Gap 3 above).

### Smoking Gun #3: `db_lookup_miss: canonical_slot_for: <token>` indicates missing slot_synonyms rows

**CONFIRMED — real but secondary.**

`convert-trace-b4.jsonl` shows 5 `db_lookup_miss` events: `canonical_slot_for: 'price-row'`, `'price-note'`, and `'text'` (standalone_block_for). These prevent correct block routing for featured-product elements. `'text'` as a slot lookup returns no standalone block, causing leaf text nodes to fall through to a generic `sgs/container` wrapper instead of `sgs/text`. This contributes to featured-product's 66% diff. Fix is straightforward: add 3 rows to `slot_synonyms`. Secondary because it affects a limited element surface — the dominant cause (dead CSS) would persist even after this fix.

---

## 4. Fourth Root Cause (not in pre-analysis)

**Style variation may not be active on the test page, causing both CSS and layout to diverge.**

`mamas-munches.css` is gated by `active_theme_style = 'mamas-munches'` in `functions.php:228`. If that theme mod is not set on the test page's site, the variation CSS is **never enqueued** — producing zero styling from the mockup CSS entirely. Separately, `mamas-munches.json` sets `wideSize: 1280px`, but the pixel-diff shows trust-bar at SGS width 1200px (evidence-pack: `trust-bar 1440: SGS 1200x93`). The base `theme.json` has `wideSize: 1200px`. The 1200px SGS width matches the **base theme, not the mamas-munches variation** — suggesting the variation is inactive on the test page. If confirmed, this means both CSS and layout dimensions are wrong simultaneously. The pipeline currently does not verify or enforce variation activation as part of Stage 10 deploy, and `summary.log` shows only stage pass/fail counts, no variation-active confirmation.

---

## 5. Adversarial Challenge — Is extraction coverage really the primary lever?

**Strongest case against:** The 1097 extraction_failed count is mostly noise. Consider: trust-bar has only 14 extraction_failed entries yet still fails at 24.7%. The trust-bar's CSS for background and padding ARE lifted correctly as WP `style.*` attrs. So the 14 failures are for attrs like `showItemIcons`, `dividers`, `animated`, `valueColour` — none of which drive the pixel-diff. The trust-bar renders at 24.7% diff not because of missing attrs, but because `.sgs-trust-bar__badge` (in `mamas-munches.css`) never hits `.sgs-trust-bar__item` (in `render.php`). If we fixed every extraction failure for trust-bar's 14 attrs, the pixel-diff would barely move.

**The implication:** Improving extraction coverage is the wrong primary lever. The primary lever is **CSS selector alignment** — ensuring the variation CSS targets the same class names that render.php outputs. Once that's fixed, the raw mockup CSS in `mamas-munches.css` will finally do its job, and many of the "extraction failures" will turn out to be slots that the CSS already handles (no block-attr extraction needed at all).

**Counter-counter:** This argument only holds for sections where variation CSS is sufficient. For sections with intricate typography, hover states, and responsive behaviours (hero, gift-section), CSS alone can't carry everything — the attrs need to be lifted into block JSON to be editor-controllable. But for the first pass toward ≤1% pixel-diff, fixing the CSS namespace is the highest-ROI change.

**Verdict:** The pre-analysis treating `extraction_failed` counts as the primary diagnostic is misleading. The primary diagnostic should be "what % of variation CSS rules actually match rendered classes?" That number is 18% (11/62). Fix that first. Extraction completeness is the second phase.
