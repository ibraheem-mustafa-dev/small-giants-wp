# Wave 0 Legacy Deletion Safety Scan
**Date:** 2026-05-21
**Scope:** Pre-deletion coverage check for three legacy files scheduled for Wave 0 removal
**Prepared by:** Automated safety scan (Claude Sonnet 4.6)

---

## Files Inspected

### Legacy (scheduled for deletion)
- `tools/recogniser-v2/extract.py` (731 lines)
- `tools/recogniser-v2/extract_strategies.py` (303 lines)
- `tools/recogniser-v2/overrides/hero.py` (908 lines)

### cv2 Replacement Path
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (~2800 lines)
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert_page.py` (246 lines)
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py`
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py`

### Orchestrator (wiring checked)
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (Stage 4 wiring at lines ~927-1270)

---

## Phase 1 — Capability Inventory

### File 1: `tools/recogniser-v2/extract.py`

| # | Function | What it does | Input | Output |
|---|----------|-------------|-------|--------|
| 1 | `_load_trace()` | Locates and soft-imports `orchestrator/trace.py` at runtime | None | `Trace` class or `None` |
| 2 | `extract_computed_styles()` | Opens a mockup HTML file in Chromium via Playwright across 3 viewports (desktop/tablet/mobile) and captures `getComputedStyle()` values for a list of CSS selectors | mockup path, list of selectors | `(computed_dict, font_report)` |
| 3 | `load_layer3()` | Queries `sgs-framework.db` `block_attributes` table and rebuilds the Layer 3 slot-list dict for every registered block | none (reads DB) | `{blocks: {slug: {slots: [...]}}}` |
| 4 | `load_role_templates()` | Loads the hand-authored `role-templates.json` file that maps role slugs to extraction recipes | none (reads file) | role-templates dict |
| 5 | `auto_derive_responsive_attrs()` | Scans `block.json` attributes for `Mobile`/`Tablet`/`Desktop` suffixes and returns a dict of base names to their responsive variants | block.json schema dict | `{base: [suffixes]}` |
| 6 | `load_block_schema()` | Loads a block's `block.json` from the repo by block slug | block name (e.g. `sgs/hero`) | parsed JSON dict |
| 7 | `_parse_rules_in_block()` | Recursively parses a chunk of CSS text (including nested `@media`) into `{selector: {prop: val}}` | CSS string, optional media prefix | `{selector_key: {prop: val}}` |
| 8 | `parse_mockup_styles()` | Finds all `<style>` tags in a mockup HTML and parses their CSS using `_parse_rules_in_block()` | full HTML string | `{selector: {prop: val}}` |
| 9 | `extract_block()` | Catalogue-driven dispatcher: for each Layer 3 slot of a block, either calls the registered override (hero) or dispatches by role to `extract_strategies` | block name, BS4 section element, context dict | `(attrs, inner_blocks, strategy_trace)` |
| 10 | `serialize_block()` | Converts a block slug + attributes dict + inner_blocks list into WP block-comment markup | block name, attrs dict, inner_blocks | WP markup string |
| 11 | `coverage_report()` | Compares extracted attributes against the block.json schema and returns coverage percentages | schema dict, extracted dict | coverage dict with `declared`, `extracted`, `coverage_pct`, `not_extracted` |
| 12 | `_fingerprint_for_block()` | Returns the list of CSS selectors to probe via Playwright for a given block (either from override's `fingerprint_selectors` or from Layer 3 slots) | block name | list of CSS selectors |
| 13 | `_verify_against()` | Diffs extracted attributes against a saved baseline JSON — no-regression and strict modes | baseline JSON path, attrs dict, strict bool | exit code 0/1 |
| 14 | `main()` / CLI | CLI entry point: parses args, runs Playwright, dispatches extraction, prints coverage + markup, optionally writes JSON output or verifies against baseline | CLI args | stdout report + optional file output |

---

### File 2: `tools/recogniser-v2/extract_strategies.py`

| # | Function | What it does | Input | Output |
|---|----------|-------------|-------|--------|
| 1 | `text_content()` | Reads the visible text content of the first matching DOM element | section, CSS selector | `(str or None, confidence float)` |
| 2 | `richtext_html()` | Reads the inner HTML of an element preserving `<strong>`, `<em>`, `<a>`, `<br>` | section, CSS selector | `(str or None, float)` |
| 3 | `attr_href()` | Reads the `href` attribute from an `<a>` element | section, CSS selector | `(str or None, float)` |
| 4 | `attr_src_image()` | Reads `<img>` src, alt, width, height, srcset and resolves against a media_map | section, CSS selector, optional media_map | `(dict or None, float)` |
| 5 | `computed_color()` | Reads a computed colour value (rgb/rgba) from Playwright's computed-style dict | computed dict, viewport, selector, optional prop | `(str or None, float)` |
| 6 | `computed_px_int()` | Reads a computed CSS property and parses it to an integer pixel value | computed dict, viewport, selector, css_property | `(int or None, float)` |
| 7 | `computed_background_image()` | Reads computed `background-image` (gradient or url) | computed dict, viewport, selector | `(str or None, float)` |
| 8 | `enum_class_probe()` | Checks an element's classList for BEM modifiers matching a list of enum values | section, selector, enum_values list | `(str or None, float)` |
| 9 | `boolean_visibility()` | Returns True if the element is present in the DOM | section, selector | `(bool, float)` |
| 10 | `attr_data()` | Reads a `data-*` attribute from a DOM element | section, selector, data_attr name | `(str or None, float)` |
| 11 | `query_descriptor()` | Parses a dynamic-link modifier string (e.g. `:latest-post(category=blog,limit=3)`) into a structured descriptor dict | modifier_value string | `(dict or None, float)` |
| 12 | `ROLE_TO_STRATEGY` | Dispatch table mapping Layer 2 role slugs to the strategy functions above | — | dict |
| 13 | `dispatch()` | Resolves a single slot's value by looking up the role in `ROLE_TO_STRATEGY`, building kwargs, calling the strategy, and returning `(value, confidence, strategy_label)` | role, slot dict, section, computed, viewport, media_map | `(value, float, str)` |

---

### File 3: `tools/recogniser-v2/overrides/hero.py`

| # | Function | What it does | Input | Output |
|---|----------|-------------|-------|--------|
| 1 | `HERO_FINGERPRINT_SELECTORS` | Constant list of 11 CSS selectors to probe via Playwright specifically for `sgs/hero` | — | list of strings |
| 2 | `apply_computed_overrides_hero()` | Uses Playwright-captured computed styles to override rule-derived values for hero: headline font sizes per viewport, content padding per viewport (desktop/tablet/mobile), sub-headline typography (font-size/weight/line-height/max-width), label typography (font-size/weight/letter-spacing/text-transform/line-height/margin-bottom), image object-fit/object-position | extracted attrs dict, computed dict, css_var_to_slug | mutates attrs dict in-place |
| 3 | `_strip_media_prefix()` | Strips the `@media (min-width: X)` prefix from a combined selector key, returning only the bare selector | selector_key string | bare selector string |
| 4 | `emit_scoped_custom_css_format_key()` | Formats a single CSS rule, preserving the `@media` prefix if present, scoped to a block's anchor | key, anchor, body | CSS rule string |
| 5 | `collect_section_css()` | Filters the full CSS rule set down to only rules whose selectors match an element inside the given section, using BS4's CSS selector engine for full-fidelity matching | section element, all_rules dict | `{selector_key: {prop: val}}` |
| 6 | `emit_scoped_custom_css()` | Emits CSS rules not mapped to block attributes, scoped to the block's anchor, skipping fully consumed rules and universally-handled selectors | anchor, rules dict, consumed_rules set, consumed_decls dict | multi-line CSS string |
| 7 | `_parse_padding_shorthand()` | Parses CSS padding shorthand (e.g. `28px 20px 40px`) into `(top, right, bottom, left)` tuple of px integers | CSS value string | `(int|None, int|None, int|None, int|None)` |
| 8 | `extract_hero()` | Full 50-attribute hero extraction: variant detection (split/standard), text content (headline/sub-headline/label), split image + mobile image, background colour, headline/sub-headline/label typography, min-height, grid column ratio, vertical alignment, content padding per viewport, image controls, inner blocks (sgs/multi-button + sgs/button structure) | BS4 section element, context dict | `(attrs dict, inner_blocks list)` |
| 9 | `_normalise_var()` | Normalises a CSS `var(--slug)` string to `--slug` | CSS value string | string |
| 10 | `build_css_var_to_slug()` | Reads `:root { --slug: #...; }` from the mockup HTML and maps each CSS variable to its WP palette slug | full HTML string | `{--slug: slug}` dict |
| 11 | `HERO_OVERRIDE` | Registry entry dict for the hero override, carrying `extract`, `apply_computed`, `fingerprint_selectors`, `block_name` | — | dict |

---

## Phase 2 — Coverage Table

| Capability | Legacy location | cv2 verdict | cv2 evidence |
|------------|----------------|-------------|--------------|
| `extract_computed_styles()` — Playwright multi-viewport computed style capture | `extract.py:130` | **NOT-COVERED-IN-CV2** | No Playwright import or computed-style capture anywhere in `converter_v2/`. cv2 is entirely BS4 + CSS-text parsing. |
| `load_layer3()` — DB-driven slot list | `extract.py:226` | COVERED-DIFFERENT-SHAPE | cv2 uses `db_lookup.py` (DB-backed) for block existence, slot synonyms, etc. Same DB, different query surface. |
| `load_role_templates()` — hand-authored role→extraction recipe table | `extract.py:259` | NOT-COVERED-IN-CV2 | cv2 dispatches by BEM structure, not by a role taxonomy. `role-templates.json` has no counterpart in cv2. |
| `auto_derive_responsive_attrs()` — coverage reporting helper | `extract.py:271` | NOT-COVERED-IN-CV2 | cv2 does not produce attribute coverage reports against block.json. |
| `load_block_schema()` — load block.json for coverage reporting | `extract.py:284` | COVERED-DIFFERENT-SHAPE | cv2 uses `_block_json_item_keys()` (`convert.py:700`) for a similar block.json read, scoped to array attr defaults. |
| `_parse_rules_in_block()` / `parse_mockup_styles()` — CSS parser | `extract.py:293, 336` | COVERED-DIRECT | cv2's `parse_css()` (`convert.py:262`) does the same thing using a brace-balanced scanner, explicitly noted as a replacement. |
| `extract_block()` — catalogue-driven role dispatcher | `extract.py:348` | COVERED-DIFFERENT-SHAPE | cv2's `walk()` + `lift_subtree_into_block_attrs()` perform the equivalent function via DOM walking + DB-driven BEM resolution, not via role dispatch. |
| `serialize_block()` — WP block markup serialiser | `extract.py:429` | COVERED-DIRECT | cv2's `emit_wp_block()` (`convert.py:582`) does the same thing. |
| `coverage_report()` — coverage metrics | `extract.py:450` | NOT-COVERED-IN-CV2 | cv2 does not produce declared/extracted/coverage_pct reports. |
| `_fingerprint_for_block()` — Playwright selector list | `extract.py:466` | NOT-COVERED-IN-CV2 | cv2 has no Playwright pass; no equivalent fingerprint selector mechanism. |
| `_verify_against()` — regression baseline diff | `extract.py:487` | NOT-COVERED-IN-CV2 | cv2 has no regression-verification mode (no `--verify-against` equivalent). |
| `apply_computed_overrides_hero()` — Playwright override for hero typography/padding | `hero.py:55` | **NOT-COVERED-IN-CV2** | cv2 has no Playwright pass at all; computed-style-driven attribute precision for hero is absent. |
| `_strip_media_prefix()` | `hero.py:211` | COVERED-DIFFERENT-SHAPE | cv2 uses `:: ` separator in its CSS rule keys (`parse_css()`) rather than stripping prefixes; different shape, same goal. |
| `emit_scoped_custom_css_format_key()` / `emit_scoped_custom_css()` — scoped CSS emission for unconsumed rules | `hero.py:236, 279` | **NOT-COVERED-IN-CV2** | cv2 emits variation CSS via `variation_buf` (`convert.py`, passed through `walk()`) but does NOT scope unconsumed rules to a block anchor. The `emit_scoped_custom_css` mechanism that wraps leftover CSS in `#anchor { ... }` blocks has no equivalent in cv2. |
| `_parse_padding_shorthand()` — padding shorthand expansion | `hero.py:310` | COVERED-DIRECT | cv2 has its own `_parse_padding_shorthand()` at `convert.py:1186`. |
| `extract_hero()` — 50-attribute hero block extractor | `hero.py:342` | **NOT-COVERED-IN-CV2** | cv2 has no hero-specific extraction logic. It would walk `sgs/hero` via the generic FR1 block-root path (`walk()` → `lift_subtree_into_block_attrs()`), which lifts text/image slots via BEM descent. The ~30 hero typography/padding/layout attributes that `extract_hero()` reads from CSS rules and Playwright computed styles are not lifted by cv2. |
| `_normalise_var()` + `build_css_var_to_slug()` — CSS var→palette slug resolution | `hero.py:873, 879` | COVERED-DIFFERENT-SHAPE | cv2's `_extract_token_or_hex()` (`convert.py:1062`) and `_VAR_TOKEN_RE` regex cover CSS var→slug resolution. Same purpose, slightly different regex approach. |
| `HERO_OVERRIDE` registry | `hero.py:903` | NOT-COVERED-IN-CV2 | cv2 has no override registry mechanism; it treats all blocks through the same generic walker path. |
| `text_content()`, `richtext_html()`, `attr_href()`, `attr_src_image()` — DOM strategies | `extract_strategies.py:48-114` | COVERED-DIFFERENT-SHAPE | cv2's `_array_lift_text_of_first()`, `lift_attrs_for_block()`, and `_lift_bem_child_array()` cover text and image slot lifting via BEM descent rather than explicit role-keyed functions. |
| `computed_color()`, `computed_px_int()`, `computed_background_image()` — Playwright strategies | `extract_strategies.py:117-158` | **NOT-COVERED-IN-CV2** | cv2 has no Playwright pass; these three functions have no counterpart. |
| `enum_class_probe()` — BEM modifier enum detection | `extract_strategies.py:161` | COVERED-DIFFERENT-SHAPE | cv2's `lift_attrs_for_block()` reads BEM modifiers via `db.modifier_kind()` (`convert.py:567`). |
| `boolean_visibility()`, `attr_data()` — DOM presence/data attribute | `extract_strategies.py:180-196` | NOT-COVERED-IN-CV2 | No dedicated presence/data-attr strategy in cv2; these would fall through as unlifted attributes. |
| `query_descriptor()` — dynamic link descriptor parser | `extract_strategies.py:199` | NOT-COVERED-IN-CV2 | cv2 has no FR25 dynamic-link descriptor concept. |
| `ROLE_TO_STRATEGY` dispatch table + `dispatch()` function | `extract_strategies.py:226-287` | NOT-COVERED-IN-CV2 | cv2 dispatches by BEM structure, not role taxonomy. The entire role-dispatch architecture is absent. |

---

## Phase 3 — Findings

### Finding 1 — `extract_computed_styles()` (and the three computed-style strategies in extract_strategies.py)

**File:line:** `tools/recogniser-v2/extract.py:130` and `tools/recogniser-v2/extract_strategies.py:117-158`

**What it does (plain English):** This function opens your mockup HTML file in an actual browser (Chromium) at three screen sizes — desktop, tablet, and mobile — and asks the browser "what does this element actually look like right now?". It captures things like the real computed font sizes, real colours after all the CSS has been applied, real padding values, and whether gradients are visible. It does this at all three screen widths so that responsive differences are captured.

**What gap it fills:** Without this, the pipeline only reads CSS text. CSS text can be misleading: a font size might be overridden by a media query at a different breakpoint, a colour might be set via a CSS variable that resolves differently, or a gradient might be painted over a background colour. The browser resolves all of that; reading CSS text does not. The three strategies `computed_color`, `computed_px_int`, and `computed_background_image` all depend on this browser pass.

**Why it matters for the end-goal:** Pixel-parity below 1% per section at 375/768/1440px requires that the extracted attributes reflect what the browser actually renders, not what the CSS text says. If a hero section has a gradient or if font sizes change at breakpoints, and the extractor only reads CSS text, the extracted values will be wrong, and the rendered WP block will not match the mockup visually. This directly blocks the pixel-parity goal.

**Recommended action:** This capability is **not relevant to cv2's architecture**. The cv2 converter is a CSS-text + DOM-walking converter — it was designed to be Playwright-free. The legacy Playwright pass was specific to the recogniser-v2 path. Since the orchestrator's Stage 4 now routes cv2-eligible boundaries to cv2 (not to extract.py), the Playwright capability effectively moves out of scope for cv2. However, the legacy extract.py is still invoked for non-cv2-eligible boundaries (see Finding 6). **Defer deletion until the legacy path is fully retired from the orchestrator.** Mark as DEFER-DELETION.

**Confidence:** HIGH — traced the exact call path in `sgs-clone-orchestrator.py:1217`.

---

### Finding 2 — `apply_computed_overrides_hero()`

**File:line:** `tools/recogniser-v2/overrides/hero.py:55`

**What it does (plain English):** After the hero section has been extracted from CSS text, this function takes the values captured by the browser (real computed font sizes, real padding values at each screen size) and uses them to correct or fill in the values the CSS-text pass got wrong or missed. It handles six known categories of discrepancy that were found during QA in May 2026: desktop headline font size, content padding at large screens, sub-headline font weight (was entirely missing), label line-height (inherited from body), and image positioning.

**What gap it fills:** The comment in the code says this "solves four 2026-05-04 QC defects". These were real gaps where CSS-text extraction produced wrong attribute values for the hero block. The Playwright pass corrects them. Without it, these specific hero attributes would be wrong or missing in the extracted output.

**Why it matters for the end-goal:** The hero section is typically the most visually prominent section on any page — it appears above the fold and is the first thing visitors see. Incorrect font sizes or padding on the hero directly contributes to pixel-parity failures at all three viewports. This function directly targets pixel-parity for the hero block.

**Recommended action:** This is tied entirely to the legacy extract.py Playwright flow, which cv2 does not use. If cv2 becomes the sole path for hero sections, this function's corrections would need to be reconsidered — either cv2's walker handles hero sections well enough via BEM descent, or hero-specific CSS lifting logic needs adding to cv2. **Do not delete until hero sections have been validated through the cv2 path and pixel-parity for hero confirmed at all three viewports.** Mark as PORT-FIRST (hero-specific CSS lifting) or DEFER-DELETION pending validation.

**Confidence:** HIGH — function is explicitly referenced and called in `extract.py:591`.

---

### Finding 3 — `extract_hero()` — the main hero extraction function

**File:line:** `tools/recogniser-v2/overrides/hero.py:342`

**What it does (plain English):** This is the full recipe for converting a hero section in a mockup into WP block attributes. It reads approximately 50 different properties: which layout variant (split image or standard), headline text, sub-headline text, eyebrow label text, background colour, all the typography settings (font sizes at three screen sizes, font weight, line height, letter spacing, text transform), content padding at three screen sizes, the image and its mobile variant, grid column ratio, vertical alignment, and the call-to-action buttons (which become inner blocks). It also tracks which CSS rules it consumed so the remainder can be scoped to a custom CSS block.

**What gap it fills:** The cv2 converter would process a hero section via its generic FR1 path, which walks the DOM by BEM structure. It would lift text content and images, but it would not lift the ~30 typography/padding/layout attributes that `extract_hero()` reads from CSS rules. Those attributes would be absent from the output, making the hero block appear with default styling rather than the mockup's intended styling.

**Why it matters for the end-goal:** The hero is the highest-impact section for visual parity. Missing 30 out of ~50 attributes means the hero would render with wrong font sizes, wrong padding, wrong colours, and potentially wrong layout variant. This directly fails the pixel-parity goal for the hero section.

**Recommended action:** If the production path for hero sections is being migrated to cv2, a hero-specific lifting module must be added to cv2 before this file is deleted. The architecture would look different (BEM-slot-aware CSS lifting rather than explicit selector probing), but the attribute targets are the same. **This is a PORT-FIRST item.** Suggest creating `converter_v2/block_overrides/hero.py` mirroring the attribute targets. Priority: HIGH.

**Confidence:** HIGH — confirmed cv2 has no hero-specific logic via grep across the entire orchestrator directory.

---

### Finding 4 — `emit_scoped_custom_css()` — unconsumed CSS scoping

**File:line:** `tools/recogniser-v2/overrides/hero.py:279`

**What it does (plain English):** After the extractor has mapped as many CSS rules as possible to block attributes, there are usually CSS rules left over — custom animations, hover states, specific positioning rules — that do not map to any block attribute. This function takes those leftover rules and wraps them in a CSS block scoped to the specific block's anchor ID (e.g. `#sgs-hero-1 .some-selector { ... }`). This output gets emitted as a `wp:html` custom CSS block so the styling is still applied on the final page.

**What gap it fills:** Without this, leftover CSS rules are silently dropped. Custom hover effects, custom animation keyframes, or client-specific positioning would be missing from the converted output. The block would render but with some styling absent.

**Why it matters for the end-goal:** Faithful visual reproduction requires that styling which cannot be mapped to block attributes is still preserved, anchored to the correct element. Dropping it degrades pixel parity on sections that rely on custom CSS beyond what block attributes cover.

**Recommended action:** The cv2 converter accumulates variation CSS in a `variation_buf` list, but does not scope unconsumed rules to block anchors. This is a different, less precise approach. Whether this specific capability needs porting depends on whether cv2's variation_buf approach is sufficient. **Mark as DEFER — review after cv2 hero sections are validated. If custom CSS rules specific to the hero section are being lost, port the anchor-scoping mechanism.**

**Confidence:** MEDIUM — cv2's variation_buf exists and is passed to the orchestrator, but I did not fully trace how the orchestrator uses it downstream. The gap may be narrower than stated here.

---

### Finding 5 — `_verify_against()` + regression-test mode

**File:line:** `tools/recogniser-v2/extract.py:487`

**What it does (plain English):** This function compares the attributes extracted in the current run against a previously saved "golden file" (a baseline JSON). It runs in two modes: no-regression mode (the current run must not have lost any attribute the baseline had), and strict mode (the output must be byte-for-byte identical). This is the mechanism for preventing regressions — if a code change accidentally breaks hero extraction, running `--verify-against` would catch it.

**What gap it fills:** Without this, there is no automated way to confirm that a change to the extraction pipeline has not silently degraded extraction quality. It is a quality gate, not a runtime feature.

**Why it matters for the end-goal:** Deterministic byte-identical output is one of the stated end-goals. Without regression verification, a change that degrades output quality might not be caught until a full visual-QA run — which takes much longer. The verify mode is a fast inner loop.

**Recommended action:** This is a developer tool, not a production runtime requirement. cv2 does not need a port of this specific mechanism — the orchestrator's autonomy gate and visual-QA serve the same quality-gate function at a higher level. However, if regression tests exist that invoke `extract.py --verify-against`, they will break when the file is deleted. **Check `tests/golden/` for baseline JSONs and update or retire any tests that reference this mode before deleting.** Mark as OUT-OF-SCOPE for cv2 port, but validate test breakage first.

**Confidence:** HIGH — function exists and is fully wired to the CLI `--verify-against` flag.

---

### Finding 6 — Legacy extract.py is still the production path for non-cv2-eligible boundaries

**File:line:** `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:1217`

**What it does (plain English):** The orchestrator currently runs two paths in parallel. When `--converter-v2` is passed AND a section's class signature is already SGS-BEM canonical, the cv2 converter runs. For all other sections — including sections from live websites that have not been normalised to SGS-BEM naming — the orchestrator still calls `extract.py` as a subprocess. Deleting `extract.py` would break this path at runtime.

**What gap it fills:** Not a capability gap — this is a wiring gap. The legacy file is still a hard dependency in the orchestrator for non-cv2-eligible sections.

**Why it matters for the end-goal:** Deleting `extract.py` while the orchestrator still calls it at line 1217 would cause `FileNotFoundError` on any run that processes a non-cv2-eligible boundary, halting the pipeline entirely for those sections.

**Recommended action:** **This is the blocking finding for deletion.** Before deleting `extract.py`, either: (a) update the orchestrator to remove the `extract.py` subprocess call and handle non-cv2-eligible sections via the cv2 path or an explicit "unmatched" surface, OR (b) confirm that ALL production runs now use `--converter-v2` and that no non-cv2-eligible boundaries remain in scope. Until one of these is confirmed, deletion of `extract.py` will break the production pipeline. **DEFER-DELETION.**

**Confidence:** HIGH — line 1217 of `sgs-clone-orchestrator.py` is unambiguous.

---

## Phase 4 — Dependency Check

The following files outside the three legacy targets also reference `tools/recogniser-v2/`:

- `plugins/sgs-blocks/scripts/behavioural-analyser/backfill-coarse-roles.py:36` — reads `role-templates.json`
- `plugins/sgs-blocks/scripts/drift-validator/validate.py:61` — reads `role-templates.json`
- `plugins/sgs-blocks/scripts/gap-detection/apply-fanout-proposals.py:162` — reads `role-templates.json`
- `plugins/sgs-blocks/scripts/orchestrator/autonomy_gate.py:73` — reads `visual_qa_config.json`
- `plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py:73` — reads `visual_qa_config.json`

The `role-templates.json` and `visual_qa_config.json` data files live in `tools/recogniser-v2/data/` and are NOT among the three files scheduled for deletion. However, any sweep that deletes the entire `tools/recogniser-v2/` directory would also remove these data files, breaking the scripts above. Confirm the deletion scope is limited to the three named `.py` files only.

---

## Final Verdict

**DEFER-DELETION**

The three files cannot be safely deleted at this time. Two blocking reasons:

1. **`extract.py` is still wired into the production orchestrator** at `sgs-clone-orchestrator.py:1217`. The legacy subprocess call fires for any non-cv2-eligible boundary. Deleting the file breaks production runs.

2. **`overrides/hero.py:extract_hero()`** contains ~50-attribute hero-specific extraction logic, including Playwright-based typography/padding overrides, that has no equivalent in cv2. If hero sections have been confirmed as cv2-eligible (i.e. all hero processing now goes through cv2 and the legacy extract.py path is never triggered for hero), then this specific concern may be moot — but that needs verification, not assumption.

**Three items to resolve before deletion:**

| Priority | Action | Who |
|----------|--------|-----|
| BLOCKING | Remove or gate the `extract.py` subprocess call at `sgs-clone-orchestrator.py:1217` | Developer |
| BLOCKING | Confirm hero sections are processed by cv2 with acceptable pixel-parity at 375/768/1440 (run per-section pixel-diff before retiring the hero override) | Developer + visual QA |
| ADVISORY | Check `tests/golden/` for baseline JSONs that use `--verify-against`; retire or migrate those tests | Developer |

---

## Confidence and Caveats

- The orchestrator wiring finding (Finding 6) is **HIGH confidence** — line 1217 is unambiguous.
- The cv2 coverage findings are **HIGH confidence** — confirmed via grep across the entire `orchestrator/` directory that no Playwright, no `extract_strategies`, no `role_templates`, and no `extract_hero` equivalent exists in cv2.
- The variation-CSS scoping finding (Finding 4) is **MEDIUM confidence** — the cv2 `variation_buf` downstream handling was not fully traced; the gap may be narrower.
- The responsive-coverage reporting finding (Finding 5) is assessed as OUT-OF-SCOPE for cv2 port — it is a developer tool, not a runtime capability.
- This scan did not trace the `tools/recogniser-v2/utils.py` or `overrides/__init__.py` files; if those contain load-bearing capabilities beyond what these three files import, a follow-up scan is needed.
