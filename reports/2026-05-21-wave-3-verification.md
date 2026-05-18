# Wave 3 — Universal Extraction Verification Report

**Date:** 2026-05-18  
**Run ID:** `mamas-munches-homepage-2026-05-18-213819`  
**Scope:** Post-Wave-3 pipeline run against Mama's Munches homepage mockup. Verifies whether Bean's universal-extraction directive was achieved: hero's ~30 formerly-special-cased attributes should now surface via D3 (attribute_gap_candidates) or D1 (extracted), not silently drop.

---

## Step 1 — Pipeline Run

Command:

```
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --converter-v2 \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --auto-section --skip-autonomy-gate --skip-register --mode draft
```

Pipeline completed cleanly. Key headline numbers from stdout:

- 9 section boundaries detected
- 188 total slots generated (Stage 3)
- 374 attributes extracted (Stage 4)
- 1,107 leftover entries (Stage 9) — identical to the pre-Wave-3 baseline from `reports/2026-05-21-pixel-parity-bucket-audit.md`

---

## Step 2 — Leftover Buckets

**Total: 1,107** (unchanged from pre-Wave-3 baseline of 1,107)

| Bucket | Count |
|---|---|
| extraction_failed | 1,102 |
| chrome_skipped | 2 |
| cv2_handled_no_top_level_match | 3 |
| unrecognised_class | 0 |
| unrecognised_section | 0 |
| animation_unclassified | 0 |

All 1,102 `extraction_failed` entries are `gap_level: attribute`, `severity: medium`, `source: stage_3_slot_list`. These represent slots in the Stage-3 catalogue that received no value from the extractor — catalogue holes, not silent drops of CSS that was present.

**Hero section specifically:** 144 of the 1,102 extraction_failed entries are for the hero boundary. Section breakdown:

| Section | extraction_failed |
|---|---|
| social-proof | 262 |
| ingredients-section | 245 |
| brand | 191 |
| gift-section | 165 |
| hero | 144 |
| featured-product | 81 |
| trust-bar | 14 |

---

## Step 3 — attribute_gap_candidates DB Query

**Total rows in DB:** 989  
**Added in last hour (D3 from this run):** 14 across three blocks

| Block | Gap rows added |
|---|---|
| sgs/product-card | 6 |
| sgs/hero | 5 |
| sgs/info-box | 3 |

**sgs/hero D3 rows written this run:**

| attr_name | stem (CSS property) | Source class |
|---|---|---|
| fontWeight | font-weight | .heading |
| letterSpacing | letter-spacing | .heading |
| textGridArea | grid-area | .sgs-hero__content |
| mediaGridArea | grid-area | .sgs-hero__media |
| mediaOverflow | overflow | .sgs-hero__media |

Note: source_class `.heading` is the internal label for unclassed `h1` elements (the slot_name is `heading`, no sgs- class present, so the fallback label `.{slot_name}` fires).

---

## Step 4 — Stage-3 canonical_source Distribution

| canonical_source | Count | % |
|---|---|---|
| db | 153 | 81.4% |
| auto-derived | 35 | 18.6% |
| **Total** | **188** | |

Hero boundary (b2) specifically: 142 db, 31 auto-derived (82.1% db). **Target was > 80% db post-Wave-3b — met at 81.4% globally and 82.1% for hero.**

---

## Step 5 — Universal-Handling Acceptance Check (Hero)

This is the core acceptance test. For 11 specific hero CSS properties drawn directly from the mockup source, each was traced through D1 (extracted into attrs), D3 (attribute_gap_candidates), or silent-drop (neither).

| Attribute | CSS Property | Source Element | Outcome | Root cause |
|---|---|---|---|---|
| headlineFontSizeDesktop | font-size | h1 (unclassed) | **D1-LIFTED** | Base font-size falls through to Desktop candidate correctly |
| headlineFontSizeTablet | font-size@768px | h1 | **D1-LIFTED** | Breakpoint correctly parsed to `Tablet` suffix |
| headlineFontSizeMobile | font-size (base=34px) | h1 | **SILENT-DROP** | Base value (34px) initially assigned to Desktop candidate, then overwritten by the 1280px breakpoint value (58px). Mobile attr never written — the mobile-first base value is orphaned. |
| headlineFontWeight | font-weight | h1 | **D3-SURFACED** | Mode 2: `headlineFontWeight` not in schema → gap candidate. D3 working correctly. |
| headlineLetterSpacing | letter-spacing | h1 | **D3-SURFACED** | Mode 2: `headlineLetterSpacing` not in schema → gap candidate. D3 working correctly. |
| headlineFontFamily | font-family | h1 | **SILENT-DROP** | `font-family` only present in `@media (min-width:768px)` rule, not in base_decls. D3 Mode 2 only iterates `base_decls`. Also: the global `h1, h2, h3` selector is never matched because `last_part` after `split()` is `h3` not `h1` (grouped-selector parsing gap). |
| headlineLineHeight | line-height | h1 | **SILENT-DROP** | Same as font-family — breakpoint-only. D3 Mode 2 skips it. |
| verticalAlignment | justify-content | .sgs-hero__content | **SILENT-DROP** | `justify-content` is in `_SUPPORTS_HANDLED_PROPS` → excluded from D3 by design. But `_lift_root_supports_to_style` only covers WP native `style.*` attrs (colour, spacing, border) — not block-specific attrs like `verticalAlignment`. Falls through both paths with no record. |
| splitColumnRatio | grid-template-columns | .sgs-hero | **SILENT-DROP** | `grid-template-columns` is in `_SUPPORTS_HANDLED_PROPS` → excluded from D3. Same supports-lift gap as verticalAlignment. The desktop value (1fr 1fr) is never surfaced anywhere. |
| imageObjectFit | object-fit | .sgs-hero__split-image | **SILENT-DROP** | The `split-image` element has no canonical_slot mapping in the DB (`canonical_slot_for('split-image')` returns None). `_lift_styling_attrs` is never called for this element. D3 never sees its CSS properties. `imageObjectFit` is in the schema with 58 image-related attrs, but extraction path never reaches it. |
| imageObjectPosition | object-position | .sgs-hero__split-image | **SILENT-DROP** | Same root cause as imageObjectFit. `object-position: center 20%` is in base_decls but never processed. |

**Tally:** 3 D1-Lifted · 2 D3-Surfaced · 6 Silent-Drop

---

## Headline Verdict: PARTIAL-PASS

Wave 3 achieved partial progress. D3 correctly fired for properties that ARE in `property_suffixes` and ARE present in `base_decls` when a known slot handles them (`font-weight`, `letter-spacing`, grid-area layout signals). The 81.4% db canonical_source target was met.

However, 6 of 11 spot-checked hero attributes still drop silently. That is a majority of the checked set. The Wave 0 critical concern — "hero-specific attributes silently dropped" — is not resolved by Wave 3 alone. Universal extraction is not yet working for the categories below.

---

## Four Root Causes of Remaining Silent Drops

### RC-1 — D3 Mode 2 only covers base_decls, not breakpoint decls

`_lift_styling_attrs` iterates `base_decls` when building `_lifted_css_props`. The D3 Mode 2 check (lines 2401–2412) only flags gaps for properties present in `base_decls`. If a CSS property appears **only** in `@media` breakpoint rules (common for progressive-enhancement patterns like adding `font-family` and `line-height` at tablet), D3 never sees it.

**Affected:** `headlineFontFamily`, `headlineLineHeight`. Also `justify-content` on `.sgs-hero__content` which is tablet-only.

**Fix needed:** After the base_decls D3 sweep, loop `bp_decls` and record gap candidates for any breakpoint-specific prop that also failed to land in schema via the breakpoint loop (lines 2423–2438).

### RC-2 — SUPPORTS_HANDLED_PROPS over-excludes block-specific attrs

`_SUPPORTS_HANDLED_PROPS` blocks `justify-content` and `grid-template-columns` from D3 on the grounds that "supports-lift handles these". But `_lift_root_supports_to_style` only lifts into WP native `style.*` (colour, spacing, border) — it has no path to block-specific attrs like `verticalAlignment` or `splitColumnRatio`. The result is a no-man's-land: excluded from D3, not covered by supports-lift, never surfaced.

**Affected:** `verticalAlignment` (justify-content), `splitColumnRatio` (grid-template-columns).

**Fix needed:** Either extend `_lift_root_supports_to_style` to handle these as named block attrs, or remove them from `_SUPPORTS_HANDLED_PROPS` so D3 Mode 1/2 can surface them.

### RC-3 — Un-slotted BEM elements never fed to `_lift_styling_attrs`

`lift_subtree_into_block_attrs` processes slots via canonical_slot DB lookup. BEM elements like `split-image`, `split-image--mobile`, `split-image--desktop` have no entry in `slot_synonyms`. The code path that calls `_lift_styling_attrs(desc, canonical, ...)` never fires for these elements. Their CSS declarations (object-fit, object-position, height, etc.) are invisible to both D1 and D3.

**Affected:** `imageObjectFit`, `imageObjectPosition`, and likely the full image border/padding attrs (58 schema attrs for sgs/hero relating to the image side).

**Fix needed:** Add `split-image`, `media`, `image` as slot synonyms in the DB pointing to the canonical image slot for sgs/hero.

### RC-4 — Mobile-first base value orphaned by Desktop override

For `headlineFontSizeMobile`: the mobile-first base value (34px, no @media wrapper) initially maps to `headlineFontSizeDesktop` via the Desktop fallback path (line 2328–2330). The 1280px breakpoint then overwrites it with 58px. The 34px mobile value is never written to `headlineFontSizeMobile` because that would require the converter to recognise "this base value is the mobile value and the mobile attr exists in schema".

**Affected:** Any block using mobile-first base values where the schema has separate Mobile/Tablet/Desktop attrs. A generic pattern, not hero-specific.

**Fix needed:** Before the Desktop fallback, check whether `{prefix}{suffix}Mobile` is in schema. If yes, write the base value there rather than (or in addition to) the Desktop fallback.

---

## Confidence and Caveats

- The analysis is based on direct simulation of `_collect_css_decls_for_element`, `_css_prop_to_suffix`, and `property_suffixes` DB lookups against the actual mockup CSS. The root causes are confirmed by code inspection, not inferred.
- The leftover bucket count (1,107) being unchanged from the pre-Wave-3 baseline is not necessarily bad — those are slot-catalogue holes (slots with no source CSS), not silent CSS drops. The distinction matters: slot-catalogue holes are expected; silent drops of present CSS are the bug.
- The 5 D3 rows written for sgs/hero are genuine Wave 3 wins: they would not have appeared pre-Wave-3. But 5 out of ~30 expected hero-specific attrs is roughly 17% capture rate. Wave 3 is a working foundation, not a complete solution.
- Confidence in the PARTIAL-PASS verdict: high. All 11 spot-checked attrs were traced to specific code paths. No speculation.

---

## Recommended Follow-Ups (Priority Order)

1. **RC-3 (slot synonyms)** — Add `split-image`, `media`, `image` to `slot_synonyms` DB for sgs/hero. Estimated 15–20 attrs would lift from silent-drop to D1 immediately. Lowest-risk change (DB-only, no converter code).

2. **RC-2 (SUPPORTS_HANDLED_PROPS)** — Remove `justify-content` and `grid-template-columns` from the exclusion set. These belong in D3 for blocks that have dedicated schema attrs (`verticalAlignment`, `splitColumnRatio`). Affects ~2 attrs for hero but the pattern recurs across all blocks.

3. **RC-1 (breakpoint D3 coverage)** — Extend the D3 sweep to iterate `bp_decls` as well as `base_decls`. The change is localised to `_lift_styling_attrs` lines 2359–2413. Would surface `font-family`, `line-height`, `justify-content` from breakpoint rules as gap candidates.

4. **RC-4 (mobile-first base value)** — Add a pre-Desktop-fallback check: if `{prefix}{suffix}Mobile` exists in schema, write base value there. This is a more structural change and should be last.
