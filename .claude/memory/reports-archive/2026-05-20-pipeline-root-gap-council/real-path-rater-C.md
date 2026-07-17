# Rater C — Pipeline Output Trace Forensics
**Run:** `mamas-munches-homepage-2026-05-20-082521`
**Angle:** Does the pipeline produce the RIGHT block markup + CSS, or are there silent failures?
**Verdict:** Pipeline output is **structurally incomplete in two distinct ways** depending on section type. The gap is NOT downstream (render.php/cascade). It lives in extraction.

---

## 1. Per-Section Pipeline Health Table

| Section | Attrs Extracted | D1 Lifts | CSS Props in `.css` | variation_css_rules | Leftover (extraction_failed) | Stage-3 Slots | Pixel Mismatch (best viewport) |
|---|---|---|---|---|---|---|---|
| hero | 31 unique | 21 | 24 | **0** | 142 (source: stage_3_slot_list) | 171 | 61.9% (768) |
| trust-bar | 3 unique | 2 | 24 | **0** | 14 (source: stage_3_slot_list) | 15 | 24.2% (768) |
| featured-product | 37 unique | 0 | 36 | 15 | 78 (source: cv2_emitted_dynamic) | 0 | 58.8% (768) |
| brand | 37 unique | 0 | 26 | 8 | 191 (source: cv2_emitted_dynamic) | 0 | 43.7% (1440) |
| ingredients-section | 34 unique | 0 | 15 | 7 | 245 (source: cv2_emitted_dynamic) | 0 | 41.2% (768) |
| gift-section | 28 unique | 0 | 45 | 17 | 168 (source: cv2_emitted_dynamic) | 0 | 47.4% (768) |
| social-proof | 16 unique | 0 | 21 | 11 | 270 (source: cv2_emitted_dynamic) | 0 | 57.2% (1440) |

_Attr counts de-duplicated (extract.json stores each attr twice: prefixed + unprefixed). D1 lifts = properties in `css-d1-assignments.json` for that section's selectors. CSS props = mamas-munches.css rule count for section. Leftover source is the discriminator for extraction path._

---

## 2. Two Extraction Paths — Two Failure Modes

The stage-4 trace (`trace.jsonl`, `stage_4_converter_v2` entries) reveals a critical routing split:

### Path A — Slot-driven (known SGS blocks: sgs/hero, sgs/trust-bar)
- `variation_css_rules = 0` (artefact: `trace.jsonl` stage_4_converter_v2 entries for b2 + b3)
- Stage 3 produces a slot-list (b2: 171 slots, b3: 15 slots from `stage-3.json output.slot_lists`)
- All extraction failures carry `source: stage_3_slot_list` — the slot resolver ran but returned `"no value extracted"` for 142 hero slots and 14 trust-bar slots
- The CSS in `mamas-munches.css` for these sections (12 rule blocks for hero, 9 for trust-bar) is **never read by the converter** — confirmed by `variation_css_rules=0`

### Path B — CSS-driven (core/group + pattern sections: featured-product, brand, social-proof, etc.)
- `variation_css_rules > 0` (15, 8, 11, 17, 7 respectively per trace)
- Stage 3 produces 0 slots (no `block_json_found`, no DB matches)
- cv2 reads the variation CSS, walks the DOM, emits block markup — attrs succeed
- But `cv2_emitted_dynamic` failures still reach 78–270 per section because cv2 emits a **superset slot list** for every block type it instantiates (it validates all possible attrs, most of which have no CSS value)

### Why hero and trust-bar get `variation_css_rules=0`
Stage 7 (css-lift) ran at 08:25:21 and wrote `mamas-munches.css` with 138 D2 rules. Stage 4 ran at 08:25:23 — the file existed. The issue is selector matching: **all 109 page-scoped rules in `mamas-munches.css` use `.page-id-144` as the scope prefix** (artefact: `theme/sgs-theme/styles/mamas-munches.css`, all hero/trust-bar rules). The stage-4 converter, when reading CSS for a known SGS block, searches for rules matching the section selector (`.sgs-hero`). The CSS contains `.page-id-144 .sgs-hero` — no bare match — so it returns 0. This is a converter-internal scope-stripping failure, not a CSS content failure.

---

## 3. Best vs Worst: What Does trust-bar Do Right?

trust-bar is the best-performing section at 24.2% mismatch (768px), vs hero at 61.9% (768px). This seems like trust-bar is "better" — but the artefacts show the opposite pattern in the pipeline. **trust-bar's lower pixel diff is not because extraction is better; it is because the block produces simpler rendered output** (a single-row flexbox with text labels, no images, no complex grid).

What trust-bar actually has in its markup (`extract.json`, section b3):
- `items`: 4 trust items with labels — correctly extracted
- `style.spacing.padding` and `style.color.background` — correctly extracted via style object
- Token resolution: 4 tokens resolved (`surface-pink`, `text`)

What trust-bar is **missing** (14 extraction_failed in `leftover-buckets.json`):
- `showItemIcons`, `dividers`, `animated` — visual behaviour switches
- `valueColour`, `labelColour`, `labelFontSize` — typography controls
- All hover and transition controls

The 24.2% mismatch on trust-bar is primarily from **layout and icon rendering differences** — the trust-bar block renders with circular icon containers, grid layout, and box-shadow. The mockup CSS at `.page-id-144 .sgs-trust-bar__icon` has `border-radius: 50%`, `box-shadow: 0 1px 2px rgba(...)`, and the `sgs-trust-bar__inner` has `grid-template-columns: 1fr 1fr` at mobile and `repeat(4, 1fr)` at tablet. None of this is in the extracted attrs — it was never passed through the slot resolver.

**What trust-bar does RIGHT vs hero**: nothing fundamentally different. trust-bar's lower mismatch is a coincidence of visual simplicity, not a pipeline improvement. Both sections have `variation_css_rules=0` and both fail via the slot-resolution path.

---

## 4. Honest Verdict: Where Is the Gap?

**The pipeline output is incomplete. The gap is in extraction, not in render.php or cascade.**

Evidence:

1. **Hero block markup is syntactically complete and valid** — `stage-4j.json` reports `validate_block_markup: {status: valid, errors: []}`. render.php accepts what the pipeline emits. The render path is not broken.

2. **The 31 attrs hero DOES emit are rendering correctly** — headline text, CTA text, label text, font sizes, background colour token, split-image URLs. These appear in the block markup and render.php reads them all (confirmed by checking `render.php` lines 16–80). If render.php were the problem, even these would fail.

3. **The 140 attrs hero DOESN'T emit cause the visual gaps** — `backgroundImage` (no value extracted), `overlayColour`, `overlayOpacity`, `minHeight`, `minHeightMobile`, `ctaPrimaryStyle`, `ctaPrimaryColour`, `ctaPrimaryBackground`, `alignment` — all `leftover-buckets.json extraction_failed`. When these are absent, render.php falls back to defaults: no background image, no overlay, default min-height, default CTA style. These defaults produce the 61.9–86.5% mismatch.

4. **The D1 CSS lift correctly identifies and lifts hero CSS properties** (`css-d1-assignments.json`: `sgs/hero:.sgs-hero__content h1` has 7 properties including font-size, font-family, letter-spacing). These D1 lifts ARE in the block markup. But the STAGE-3 slot resolver fails to extract the deeper attributes (image, overlay, height, CTA colour) from the mockup HTML/CSS.

5. **brand, social-proof, gift-section have the inverse problem** — their extraction path (CSS-driven) succeeds for structure and text, but `cv2_emitted_dynamic` generates slot-validation failures for 191–270 attrs that were never present in the source CSS (border-radius, box-shadow, hover states, mobile font sizes). These are "expected absent" failures — the mockup didn't have them; cv2 is cataloguing what it couldn't find, not what is wrong with the output.

**The rendered brand/social-proof/gift sections are actually broadly correct structurally** — the block markup for brand has 2-column grid, correct image attrs, correct headline font settings, correct body copy. The 43–55% mismatch for brand is from visual presentation differences (background colour, section padding, typography rendering, font-family `Fraunces` likely not loaded) not from extraction gaps. That's a render/cascade/font problem, not a pipeline problem.

---

## 5. Top 3 Root-Cause Hypotheses (Ranked by Leverage)

### Hypothesis 1 — HIGHEST LEVERAGE: Stage-3 slot resolver cannot read values from mockup CSS for `sgs/` blocks

**Evidence:** 142 hero slot failures, 14 trust-bar slot failures, all with `source: stage_3_slot_list`, `reason: no value extracted`. The stage-3 slot list correctly identifies 171 hero slots from `block.json` and DB. But the resolver that maps those slots to mockup values returns empty for the majority.

**What's missing:** The slot resolver needs to match slots against two sources: (a) mockup HTML attribute values, and (b) mockup CSS declarations. For `backgroundImage`, it would need to find `background-image: url(...)` in the mockup CSS and map it. For `ctaPrimaryColour`, it would look for the CTA button's colour in CSS. Currently it appears to do neither reliably — it extracts 29/171 (17%), suggesting it handles only the slots it can read directly from HTML content (text slots: headline, subheadline, label, CTA text).

**Fix scope:** Extend slot resolver to read CSS property values for non-text slots. Map `background` → `backgroundImage`, `min-height` → `minHeight`/`minHeightMobile`, button colour props → CTA colour attrs. This is the single highest-leverage fix: hero goes from 17% to potentially 60%+.

### Hypothesis 2 — HIGH LEVERAGE: `mamas-munches.css` page-scoped rules are invisible to the stage-4 converter for `sgs/` blocks

**Evidence:** `variation_css_rules=0` for hero and trust-bar in trace vs. 12 and 9 CSS rule blocks actually present in the file. The converter searches for bare selector matches (`.sgs-hero`) but the CSS contains scoped selectors (`.page-id-144 .sgs-hero`). The D1 stage (run earlier, in Stage 7) correctly strips the scope when writing D1 assignments — which is why hero has 21 D1 props. But the per-block CSS context passed to the stage-4 converter does not include these rules. The converter therefore has no CSS evidence to draw from when resolving slots.

**Fix scope:** When stage-4 reads variation CSS to resolve slot values, strip `.page-id-N` prefixes from selectors before matching. Alternatively, pass the D1 sidecar (which already has stripped properties) into the slot resolver as a secondary lookup source. This is a 1–2 line change in the CSS-matching logic.

### Hypothesis 3 — MEDIUM LEVERAGE: `sgs-section-heading` CSS class is a SHARED pattern class, not a section class, but no D1 entries exist for it

**Evidence:** `css-d1-assignments.json` has 0 entries for `sgs-section-heading` selectors. Yet the CSS has 21 property declarations across `.sgs-section-heading__label`, `.sgs-section-heading__intro`, `.sgs-section-heading__sub` selectors. These are shared sub-components used inside featured-product, brand, ingredients-section, gift-section, and social-proof. The cv2 converter emits `sgs/label` and `sgs/text` blocks for these but without the typography attributes (font-size, font-weight, line-height, colour) that the CSS specifies. This produces visible heading-label rendering differences across all 5 sections.

**Fix scope:** Add `sgs-section-heading` sub-selectors to the D1 routing logic in `css_router.py`. Map their props to the `sgs/label` and `sgs/text` attribute names.

---

## 6. Key Artefact Citations

| Finding | Artefact | Location |
|---|---|---|
| 1108 extraction_failed total | `leftover-buckets.json` → `extraction_failed` count | `pipeline-state/mamas-munches-homepage-2026-05-20-082521/` |
| Hero: 142 slot failures, source=stage_3_slot_list | `leftover-buckets.json` → `extraction_failed` → section_id=hero | Same run dir |
| Brand/social: source=cv2_emitted_dynamic | `leftover-buckets.json` → `extraction_failed` → brand 191, social-proof 270 | Same run dir |
| variation_css_rules=0 for hero, trust-bar | `trace.jsonl`, stage_4_converter_v2 entries for b2, b3 | Same run dir |
| Hero: 29/171 = 17% coverage, 142 open slots | `stage-9.json` → output.coverage → b2 | Same run dir |
| Trust-bar: 1/15 = 6.7% | `stage-9.json` → output.coverage → b3 | Same run dir |
| D2: 138 page-scoped rules in CSS | `stage-7.json` → output.css_router_stats.d2_count | Same run dir |
| All hero/trust-bar CSS uses .page-id-144 | `theme/sgs-theme/styles/mamas-munches.css` | All hero/trust-bar rule blocks |
| Hero markup valid, render.php will accept it | `stage-4j.json` → validate_block_markup.status = valid | Same run dir |
| Hero render.php reads all 31 emitted attrs | `plugins/sgs-blocks/src/blocks/hero/render.php` lines 16–80 | Codebase |
| D1 hero has 21 properties (scoped stripped correctly) | `css-d1-assignments.json` → sgs/hero:* keys | Same run dir |
| hero/375 = 86.5%, social-proof/768 = 79.7%, trust-bar/768 = 24.2% | `reports/.../pixel-diff/*/diff.json` → mismatch_percent | pixel-diff subdirs |
