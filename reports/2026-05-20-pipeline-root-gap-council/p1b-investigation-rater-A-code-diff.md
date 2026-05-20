---
doc_type: council-rater-report
rater: A
angle: code-diff-vs-documented-intent
commits_reviewed: 05fb38a4 (router) + 44ba373b (dedup fix)
date: 2026-05-20
---

# Rater A — Code Diff vs Documented Intent

## Nice-to-Have Status

**NTH-1 — Wire or remove dead `_snap_attrs_to_tokens` at convert.py:159**
DONE. `convert.py:239-243` confirms the function was removed with a tombstone comment explaining the replacement path. File:line: `convert.py:239`.

**NTH-2 — Fix `typography.lineHeight` misrouting to `font_size` role**
DONE. `css_router.py:544-546` routes `line-height` to `"typography"` via the substring match. Both the in-loop path (prop found in suffix table) and the fallback path (line 553-554) correctly return `"typography"`. File:line: `css_router.py:544, 553`.

**NTH-3 — Skip filter for `'0'`/`'auto'`/`'none'`/`'inherit'`/`'initial'`/`'unset'`/`'revert'`**
DONE. `css_router.py:73-75` defines `_NON_TOKENISABLE_VALUES` frozenset; `css_router.py:305-312` implements `_is_non_tokenisable()`; `css_router.py:470` applies it at the D1 routing site. The `snap_skipped: True` flag propagates into the D1 sidecar entry. File:line: `css_router.py:73, 305, 470`.

**NTH-4 — Document hero-0 limitations at `_snap_style_dict_leaves` call sites**
DONE. `convert.py:127-135` has the full P1.A nice-to-have #4 comment documenting the hero FR1 path exclusion. Additional documentation appears at `convert.py:2118` and `convert.py:2498-2499`. File:line: `convert.py:127`.

All four nice-to-haves were implemented as claimed.

---

## Destination Spec-Compliance Verdicts

**D0 — Global/reset rules**
PARTIAL COMPLIANCE. The `_is_d0_global()` function at `css_router.py:188-214` correctly identifies element selectors without class components. Spec 16 §FR6 D0 says these rules go to variation CSS "NOT page-id-scoped". Implementation: D0 rules are written first in `write_variation_css()` without any scope prefix — COMPLIANT. Gap: the `_GLOBAL_BARE_TAGS` frozenset at `css_router.py:56-69` includes pseudo-class roots like `:focus`, `:hover`, `:active` as D0 globals. A rule like `a:hover { color: red }` would be D0-routed and emitted globally — this matches mockup intent but may interfere with WP theme-level `a:hover` rules. Minor — not a regression driver.

**D1 — Typed attribute lift**
PARTIAL COMPLIANCE. The router correctly identifies typed-attr candidates via `_css_prop_maps_to_typed_attr()` and writes them to the D1 sidecar keyed by `block_slug` (e.g. `sgs/hero`). The cv2 integration at `convert.py:161-182` reads the sidecar and flattens to `{css_prop: value}`. Critical gap: D1 entries carry the `media` field (e.g. `@media (min-width: 768px)`) but `_load_d1_assignments()` discards it — every media-query-scoped D1 value is treated as a base value. A property that only applies at tablet/desktop gets merged into the base attrs dict, potentially overriding mobile-first values. The spec (§FR6 D1) does not define media-query handling for typed attrs, but the implementation conflates responsive variants.

**D2 — Wrapper CSS fallback**
PARTIAL COMPLIANCE. D2 rules are scoped to `.page-id-N` for non-`@media` rules. However `@media`-wrapped rules are emitted verbatim without the `.page-id-N` scope (see Drift 1 below). D2 is also receiving full-rule duplicates when a rule has mixed D1/D2 properties (see Drift 2). D2 specificity is therefore inconsistent across responsive breakpoints — the dominant regression driver.

**D3 — Gap candidates**
COMPLIANT. D3 entries are correctly identified (prop in suffix table, block exists, no matching typed attr), written to `attribute_gap_candidates` DB, and also emitted to D2 as fallback per spec §FR6 D3 ("Until authored: the rule ALSO lifts to Destination 2 as a temporary fallback"). File: `css_router.py:499-514`.

---

## Top 5 Code-Path Drifts Ranked by Likely Pixel-Diff Impact

### Drift 1 — `@media` rules written to D2 without `.page-id-N` scope inside the query (CRITICAL, estimated +15-25 pt)

**Location:** `css_router.py:656-665` (`write_variation_css`)

**Mechanism:** `_rule_text()` at `css_router.py:392-397` produces `@media (min-width:768px) { .sgs-hero { ... } }` as a single string. In `write_variation_css`, the scope-prefix logic checks `if scope_prefix and not rule.startswith("@")`. Because the string starts with `@`, it is emitted verbatim — no `.page-id-144` inside the media block. This means responsive overrides have specificity `(0,1,0)` while the corresponding base rules have `(0,2,0)` (from the `.page-id-144` prefix). The mobile-first cascade inverts: at 768px+ the base-rule wins over the media-query override because specificity beats source-order. Desktop-targeted media rules (min-width:1024px, min-width:1280px) are those most affected — brand grid, hero grid, hero content padding, hero h1 font-size — all verified present in `mamas-munches.css:65-74, 111-113`. This directly explains brand +24.8pt, hero +10.2pt at 1440 and brand +16.5pt at 768.

**Fix sketch:** Instead of emitting `@media (...) { <original-selector> { ... } }`, the writer should emit `@media (...) { .page-id-N <original-selector> { ... } }` by extracting the inner selector from the flat-form `@media` string. The router already stores `media` and `selector` separately on each rule dict; the writer should use those to re-compose rather than relying on the pre-joined `_rule_text()` output. When `media` is present and `scope_prefix` is set, the emitted rule becomes `@media (condition) { .page-id-N selector { decls } }`.

---

### Drift 2 — Full rule emitted to D2 for every non-D1 property, contaminating D1-lifted values (HIGH, estimated +5-10 pt)

**Location:** `css_router.py:461-520` (the per-property loop)

**Mechanism:** The routing loop iterates over `props.items()` and for each non-D1 property appends `_rule_text()` — which serialises ALL properties in the rule — to D2. A rule with 5 properties where 2 are D1-able and 3 are D2-routed produces 3 D2 entries each containing all 5 props (including the 2 D1 values). The dedup in commit `44ba373b` catches exact-duplicate rule strings, so 3 identical D2 entries collapse to 1. But that 1 remaining D2 entry still contains the D1-destined property values. When the browser renders, the D2 `.page-id-N .sgs-hero { color: X }` rule competes against the cv2-emitted block-level inline style for the same property. The D2 scoped class (specificity `0,2,0`) beats the block's `wp-block-sgs-hero` inline style on many surfaces, causing the typed-attr value to be ignored in favour of the raw mockup literal. The verbatim dump had no D1/D2 distinction, so no such competition existed.

**Fix sketch:** When a property is routed D1, it must be EXCLUDED from the `_rule_text()` output for D2. The function should be split into `_rule_text_filtered(exclude_props)` that accepts a set of already-D1-routed property names and emits only the remaining props. If all props in a rule are D1-routed, no D2 entry is emitted at all for that rule. If a mix exists, D2 gets the remaining props only, preventing the D1 property from appearing in variation CSS.

---

### Drift 3 — D1 sidecar keyed by `block_slug` not `section_id`; multi-section pages lose per-section resolution (MEDIUM, estimated +5-8 pt)

**Location:** `css_router.py:455` (section_key assignment) and `convert.py:161-182` (_load_d1_assignments)

**Mechanism:** The router assigns `section_key = block_slug` (e.g. `sgs/hero`). On a page where `sgs/hero` appears more than once (or where hero has different styling at different positions), all hero CSS rules merge into the same D1 key. The last-written value wins for each `attr_path`. More critically, the D1 sidecar provides one value per `(block_slug, css_prop)` pair; the cv2 walker calls `_load_d1_assignments(block_slug)` for every hero section it encounters and gets the same merged values. The verbatim dump was a flat CSS file — the browser handled per-section resolution via cascade order. The D1 sidecar collapses the page's section-level variation into a single per-block-type value. For Mama's Munches where each hero-like section has different padding/colours, this forces the same token onto all instances.

**Fix sketch:** The spec's `boundaries_meta` parameter is passed to `route_css()` as `{}` (empty dict, see `sgs-clone-orchestrator.py` line dispatching the router). Populating this from the boundary detection output would let the router key D1 entries by `(section_id, block_slug)` rather than `block_slug` alone. The cv2 walker already has the `boundary_id` at the time it calls `_load_d1_assignments`; passing that as the lookup key would restore per-section fidelity.

---

### Drift 4 — `_is_d0_global()` routes `h1`/`h2`/`h3` rules inside `@media` blocks to D0 (MEDIUM, estimated +3-5 pt)

**Location:** `css_router.py:188-214` and `css_router.py:132-157` (recursion into media blocks)

**Mechanism:** `_extract_rules()` recursively processes `@media` blocks and flattens their rules to the same `rules` list, setting `media=<condition>` on each. A rule like `@media (min-width:768px) { h1, h2, h3 { font-size: 2rem } }` has no class component and matches `_GLOBAL_BARE_TAGS` — so it is D0-routed and written unscoped at the top of the variation CSS. In the verbatim dump this rule stayed inside its `@media` block, was affected by the browser's media query, and only applied at tablet+. After the router it is unconditionally applied globally. Mamas-munches mockup uses `h1, h2, h3 { font-family: 'Fraunces', serif; line-height: 1.2 }` as a D0 rule. If the mockup has responsive h1/h2/h3 overrides inside `@media` blocks, those also go D0-unscoped. The spec says D0 rules go to variation CSS "NOT page-id-scoped" — correct for global resets — but does not address D0 rules that originated inside `@media` blocks.

**Fix sketch:** D0-classification should be gated on `media is None` (top-level rules only). Rules from inside `@media` blocks that happen to match D0 patterns (bare tag selectors, no class component) should fall through to D2, preserving their media-query wrapper. A one-line guard at the D0 route point: `if _is_d0_global(selector) and media is None:` routes them D0; `if _is_d0_global(selector) and media:` routes them D2 with the `@media` wrapper intact.

---

### Drift 5 — D1 media-field stored but silently discarded by `_load_d1_assignments()` (LOW, estimated +2-4 pt)

**Location:** `css_router.py:483` (D1 entry stores `media`) and `convert.py:174-182` (`_load_d1_assignments` ignores it)

**Mechanism:** Each D1 sidecar entry carries a `media` key recording the originating `@media` condition. When `_load_d1_assignments()` flattens to `{css_prop: value}` it discards `media`. This means a property that only applies at `(min-width: 1024px)` in the mockup is merged into the base attrs dict unconditionally. The cv2 block emits it as a base inline style that renders at all viewports. The verbatim dump served the value only at that breakpoint. For the hero's desktop-specific padding and font-size values (which are large and visually prominent), unconditionally applying the 1024px+ values at mobile widens the element at mobile viewport — contributing to mobile and tablet regressions that otherwise would not have appeared.

**Fix sketch:** `_load_d1_assignments()` should return a richer structure: `{css_prop: {base: value, responsive: {condition: value}}}`. The cv2 integration sites should then route base values to block attrs and responsive values to either a responsive-attrs structure (if the block supports it) or D2 scoped within the correct `@media` block.

---

## Summary Assessment

The main task (four-destination router) was correctly designed and partially implemented. All four nice-to-haves were delivered. The two dominant regression drivers are Drift 1 (unscoped `@media` rules vs scoped non-media rules — specificity inversion) and Drift 2 (D1 properties leaking into D2 full-rule emissions). These are structural bugs in `write_variation_css()` and the per-property routing loop respectively. Both are fixable in under 50 LOC without redesigning the router architecture.

The verbatim dump had no page-id scoping at all (confirmed by `git show 05fb38a4^`), so its `@media` rules and base rules had equal specificity. The router introduced the `.page-id-N` scope to prevent cross-page pollution, but the incomplete implementation of that scope (non-`@media` rules only) created the specificity inversion that wasn't present before.
