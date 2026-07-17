# Extraction depth diagnostic — 2026-05-14

## Run analysed
- run_id: `mamas-munches-homepage-2026-05-14-160700`
- mockup: `sites/mamas-munches/mockups/homepage/index.html`
- flags: `--no-playwright --mode draft --auto-section`

---

## Summary

Extraction is failing across 8 of 9 sections because **the DB (`sgs-framework.db.block_attributes`) is not populated for most client blocks**. Blocks like `sgs/featured-product`, `sgs/header`, `sgs/footer`, `sgs/gift-section`, `sgs/heritage-strip`, `sgs/ingredients-section`, and `sgs/social-proof` each have exactly **1 row** in `block_attributes` — the synthetic `text` slot with `role=NULL, selector=NULL`. `extract.py`'s convention-path dispatches by role; with `role=NULL`, `dispatch()` returns `(None, 0.0, 'no-strategy-for-role:None')` and writes nothing. Only the `anchor` synthetic attribute (set outside the dispatch loop in `extract.py` main) survives. Hero is the outlier: it has a hand-written `overrides/hero.py` that extracts ~45 attrs directly from BS4 + CSS, bypassing the DB entirely.

---

## Per-section findings

### featured-product

- **Slots declared in block.json:** 30+ (inferred from the custom CSS `<!-- wp:html -->` fallback — no direct count; block.json not examined)
- **Slots in sgs-framework.db:** 1 (`text`, role=NULL, selector=NULL)
- **Slots extracted:** 1 (just `anchor`)
- **Failure mode:** `load_layer3()` returns `{'slots': [{'attribute': 'text', 'role': None, 'selector': None}]}`. The convention-path in `extract_block()` iterates that slot, finds `role=None`, calls `dispatch(None, ...)`, which hits `ROLE_TO_STRATEGY.get(None) → None`, returns `(None, 0.0, 'no-strategy-for-role:None')`. `value is None` → not written. No override registered for `sgs/featured-product`. Result: the only output is the `anchor` fallback set unconditionally in `extract.py:main()`. The `<!-- wp:html -->` block in `extract-b4.json` is the `_pending_custom_css` fallback, generated from unabsorbed CSS rules dumped via `emit_scoped_custom_css()` — this is not WP block markup, it's raw CSS.
- **Evidence:**
  - DB query: `SELECT attr_name, role, derived_selector FROM block_attributes WHERE block_slug='sgs/featured-product'` → 1 row: `(text, None, None)`
  - `extract-b4.json`: `"attributes": {"anchor": "sgs-featured-product-1"}`, plus `<!-- wp:html -->` CSS fallback blob

### hero

- **Slots declared in block.json:** 173
- **Slots extracted:** 45
- **Coverage:** 26%
- **Which 45 are correct:** The 45 attrs are all from `overrides/hero.py` (`extract()` function + `apply_computed_overrides_hero()`). With `--no-playwright`, `apply_computed_overrides_hero()` is called but `computed={}` so it returns immediately — all 45 come from the BS4 override path alone. Values that look correct: `headline`, `subHeadline`, `label`, `variant=split`, `splitImage`, `splitImageMobile`, padding values, font-size values, colour tokens.
- **Which are wrong or missing:** The 129 not-extracted attrs include:
  - CTA content: `ctaPrimaryText`, `ctaPrimaryUrl`, `ctaSecondaryText`, `ctaSecondaryUrl` — present in mockup HTML but `overrides/hero.py` has no extractor for them
  - Tablet breakpoint variants: `contentPaddingTopTablet`, `headlineFontSizeTablet`, `subHeadlineFontSizeTablet` — need Playwright at 768px viewport; `--no-playwright` skips this
  - `alignment` — declared in Layer 3 DB with `role=select-from-enum, selector=.wp-block-sgs-hero` but the mockup uses a BEM draft class (`.sgs-hero`), not `.wp-block-sgs-hero`, so the selector misses the element
  - `backgroundImage`, `overlayColour`, `overlayOpacity` — declared in Layer 3 DB but selectors target `.wp-block-sgs-hero` / `.sgs-hero__overlay` which resolve differently in BS4 vs live DOM
- **Bean's "rendered output is poor" diagnosis:** The 45 attrs extracted include the key structural ones (variant, headline, text, images, padding). However CTAs are entirely absent — no `ctaPrimaryText` or URL means the rendered WP block shows no buttons. This is the most visible defect. Additionally, token-snap has converted `subHeadlineFontSize: "18px"` → `"medium"` and `subHeadlineFontSizeMobile: "16px"` → `"medium"` (both map to the `medium` slug in theme.json) — this is correct behaviour but may produce a different visual size if the `medium` token doesn't exactly match the mockup values.
- **Evidence:** `extract-b2.json` attributes list; `sgs-framework.db` hero rows show `ctaPrimaryText` etc. not in the DB at all (not in the `block_attributes` table); hero.py `extract()` function has no CTA extraction logic.

### trust-bar (clearest failing story for a partially-populated block)

- **Slots in sgs-framework.db:** 15 (well-populated with roles and selectors)
- **Slots extracted:** 4 (`animated`, `dividers`, `showItemIcons` = `boolean-visibility` role, `anchor` synthetic)
- **Failure mode:** `boolean-visibility` and `query-descriptor` roles work from BS4 (they probe `.get('class')` or DOM presence). All `colour-*` and `font-size-preset` roles require `computed` dict populated by Playwright. With `--no-playwright`, `computed={}` → `computed_color({}, ...)` returns `(None, 0.0)` → not written. The 4 extracted attrs are exactly the BS4-only-roles subset. The 11 colour/font-size attrs are silently skipped.
- **Evidence:**
  - `extract.json` shows `trust-bar.animated=false, trust-bar.dividers=false, trust-bar.showItemIcons=false` (3 boolean-visibility results) plus `trust-bar.anchor`
  - `ROLE_TO_STRATEGY` in `extract_strategies.py`: `colour-text`, `colour-bg`, `font-size-preset` all call `computed_color` or `computed_px_int` — both require non-empty `computed` dict

---

## Architectural root cause

Three separate gaps stack on top of each other:

1. **DB population gap (primary, affects 8/9 sections):** Most client-specific blocks (`sgs/featured-product`, `sgs/header`, `sgs/footer`, `sgs/gift-section`, `sgs/ingredients-section`, `sgs/social-proof`, `sgs/heritage-strip`) have exactly 1 row in `block_attributes` — a placeholder `text` row with `role=NULL`. These are blocks added after the last `/sgs-update` full rescan, or blocks whose attribute scanning produced no parseable `role` from the block.json (because they have no `canonical_slot` metadata). Without DB rows, `load_layer3()` returns an empty slot list, and the convention-path extracts nothing.

2. **Override gap (affects hero quality):** Hero has a hand-written override covering ~45 of 173 attrs. The 128 remaining attrs (CTAs, tablet breakpoints, responsive typography details) have no override and no DB rows with correct selectors (the DB rows that exist use `.wp-block-sgs-hero` which doesn't appear in the SGS-BEM draft mockup). Hero's "rich" extraction is override-dependent, not convention-path-dependent.

3. **`--no-playwright` coverage loss (affects all colour/font extractions):** All `colour-*`, `font-size-preset`, `spacing-token`, `border-radius-token`, `shadow-preset` roles are computed-style-only. They return `(None, 0.0)` without Playwright. For sections that have DB rows, this halves effective coverage. For this diagnostic run, `--no-playwright` was used per the task brief — but it means any colour extraction result is structurally 0.

The `stage_4_slot_extract` trace events are also 0 because `--run-dir` is never passed to the `extract.py` subprocess in the orchestrator (line 1019-1033). The subprocess has no way to write to the parent trace.jsonl.

---

## Recommended fixes (ranked)

### 1. Run `/sgs-update` to repopulate `block_attributes` for client blocks (15 min)

`python ~/.claude/skills/sgs-wp-engine/scripts/update-db.py` rescans all block.json files and repopulates `block_attributes`. For blocks like `sgs/featured-product` that have real attributes in block.json, this will produce the full slot list. After rerunning, re-run the clone and slot extraction should immediately improve for all 8 under-populated blocks.

**Caveat:** `/sgs-update` only populates `attr_name` and derives a `role` from naming conventions. The `derived_selector` column is filled by a separate heuristic. Selectors for blocks like `sgs/featured-product` will need manual review to ensure they match the SGS-BEM draft class names (e.g. `.sgs-featured-product__title` not `.wp-block-sgs-featured-product`).

### 2. Pass `--run-dir` to the extract.py subprocess (5 min)

In `sgs-clone-orchestrator.py` at line ~1033, add:
```python
cmd.extend(["--run-dir", str(run_dir)])
```
This wires `stage_4_slot_extract` events into the parent trace.jsonl, making per-slot strategy choices visible without needing to inspect each `extract-b*.json` manually.

### 3. Add CTA extraction to `overrides/hero.py` (20 min)

`overrides/hero.py:extract()` has no logic for `ctaPrimaryText`, `ctaPrimaryUrl`, `ctaSecondaryText`, `ctaSecondaryUrl`. These are in the mockup HTML as `<a class="sgs-hero__cta-primary">` elements. Adding 4 BS4 reads fixes the most visible rendered defect (missing buttons).

### 4. Audit Layer 3 DB selectors for SGS-BEM draft class names (30 min)

The existing DB rows for `sgs/hero` use `.wp-block-sgs-hero` as selector — the live WP block class, not the draft mockup class. Mockup uses `.sgs-hero`. `extract_block()` uses the DB selector verbatim for BS4 `.select_one()`, so these misses are systematic. A one-time audit of `derived_selector` values for all blocks, replacing `.wp-block-sgs-*` with `.sgs-*` in the draft-mode path, would immediately fix the convention-path extraction gaps.
