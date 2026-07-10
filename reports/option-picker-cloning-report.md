# sgs/option-picker — cloning fidelity + no-inline migration

**Date:** 2026-07-10
**Branch:** feat/option-picker-cloning (worktree, uncommitted — for main-session review)
**Status:** build GREEN; DB seeds authored but NOT run; 2 explicit STOPs (flagged, not guess-wired)

---

## 1. Files changed

| File | What changed |
|---|---|
| `plugins/sgs-blocks/src/blocks/option-picker/block.json` | Skip-serialised `color`/`spacing`/`__experimentalBorder` supports; +14 new attrs (colourPreset, showSelectedTick, pillSelectedBorderColour, pillSelectedBorderRadius, pillPadding + tiers, root box-object tiers, borderWidth/borderStyle/borderColour) |
| `plugins/sgs-blocks/src/blocks/option-picker/render.php` | Full rewrite — **block-private** (dropped `SGS_Container_Wrapper`), `<fieldset>` is the block root, all CSS scoped via `.{uid}` class, zero inline property declarations (2 accepted var/data exceptions — see §6) |
| `plugins/sgs-blocks/src/blocks/option-picker/style.css` | Decoupled `--sgs-op-sel-border`/`--sgs-op-sel-pill-radius` (R2), `--no-tick` suppression, `soft`/`solid` colour-preset classes (R3), pill-padding object fallback note |
| `plugins/sgs-blocks/src/blocks/option-picker/edit.js` | Rewritten — no `ContainerWrapperControls`/wrapper; own width/spacing/border panel (mirrors sgs/quote); new controls for every new attr |
| `plugins/sgs-blocks/src/blocks/product-card/block.json` | +10 `pickerPill*`/`pickerColourPreset`/`pickerShowSelectedTick` forward attrs |
| `plugins/sgs-blocks/src/blocks/product-card/render.php` | Extracts + bundles `$picker_style_attrs`; forwarded into both `render_block('sgs/option-picker')` call sites (variable-axis + non-variable pill) |
| `plugins/sgs-blocks/includes/product-card-builtin-render.php` | Same forwarding into the typed-standalone `render_block('sgs/option-picker')` call site |
| `plugins/sgs-blocks/src/blocks/product-card/style.css` | R5: removed the `.product-card--live .sgs-option-picker{--sgs-op-border:var(--wp--preset--color--primary,#e68a95)}` client-hex hardcode; replaced 3 unrelated pre-existing bare `border-radius` literals with `var(--sgs-x, default)` (F3 gate false-positives triggered by the new attr names — see §7) |
| `plugins/sgs-blocks/src/blocks/product-card/edit.js` | Renamed "Picker labels" → "Picker style" panel (un-gated from `isBound`), added all new forwarded controls; imported `RangeControl` |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | `ATTR_CLASSIFICATION_OVERRIDES` — 21 new entries for option-picker + product-card (documented below). **NOT RUN.** |

---

## 2. Central DB-seed list (R7 — authored in `sgs-update-v2.py`, NOT executed)

| Block | Attr | role | derived_selector | box_family | `--sgs-op-*` var |
|---|---|---|---|---|---|
| sgs/option-picker | pillBgColour | color | `.sgs-option-picker__pill` | — | `--sgs-op-bg` |
| sgs/option-picker | pillTextColour | color | `.sgs-option-picker__pill` (pre-existing seed) | — | `--sgs-op-text` |
| sgs/option-picker | pillBorderColour | color | `.sgs-option-picker__pill` (pre-existing seed) | — | `--sgs-op-border` |
| sgs/option-picker | pillSelectedBgColour | color | `.sgs-option-picker__pill--active` **(new)** | — | `--sgs-op-sel-bg` |
| sgs/option-picker | pillSelectedTextColour | color | `.sgs-option-picker__pill--active` **(new)** | — | `--sgs-op-sel-text` |
| sgs/option-picker | pillSelectedBorderColour | color | `.sgs-option-picker__pill--active` **(new attr)** | — | `--sgs-op-sel-border` |
| sgs/option-picker | pillBorderRadius | typography* | `.sgs-option-picker__pill` | — (kept scalar) | `--sgs-op-pill-radius` |
| sgs/option-picker | pillSelectedBorderRadius | typography* | `.sgs-option-picker__pill--active` **(new attr)** | — (kept scalar) | `--sgs-op-sel-pill-radius` |
| sgs/option-picker | paddingTablet/Mobile | — | — | `padding` | (WP-native tier) |
| sgs/option-picker | marginTablet/Mobile | — | — | `margin` | (WP-native tier) |
| sgs/option-picker | borderRadiusTablet/Mobile | — | — | `borderRadius` | (WP-native tier) |
| sgs/option-picker | borderWidth | — | — | `borderWidth` | (SGS custom, base-only) |
| sgs/option-picker | pillPadding(+Tablet/Mobile) | — | — | `pillPadding` **(new family)** | — |
| sgs/product-card | pickerPillBgColour | color | `.sgs-product-card__pill` | — | forwarded → option-picker's `pillBgColour` |
| sgs/product-card | pickerPillTextColour | color | `.sgs-product-card__pill` | — | → `pillTextColour` |
| sgs/product-card | pickerPillBorderColour | color | `.sgs-product-card__pill` | — | → `pillBorderColour` |
| sgs/product-card | pickerPillSelectedBgColour | color | `.sgs-product-card__pill--active` | — | → `pillSelectedBgColour` |
| sgs/product-card | pickerPillSelectedTextColour | color | `.sgs-product-card__pill--active` | — | → `pillSelectedTextColour` |
| sgs/product-card | pickerPillSelectedBorderColour | color | `.sgs-product-card__pill--active` | — | → `pillSelectedBorderColour` |
| sgs/product-card | pickerPillBorderRadius | typography* | `.sgs-product-card__pill` | — (kept scalar) | → `pillBorderRadius` |
| sgs/product-card | pickerPillSelectedBorderRadius | typography* | `.sgs-product-card__pill--active` | — (kept scalar) | → `pillSelectedBorderRadius` |

`*` — see §4 for why border-radius uses `role='typography'`, not `role='color'`.

---

## 3. Selected-state `derived_selector` — the routing evidence

The universal styling-lift (`converter/resolvers/styling_content.py::lift_styling_content`) resolves an attr's `derived_selector` via a **plain BeautifulSoup class match** — `node.find(class_=class_name)` — one BEM class token, no CSS pseudo-class/combinator support. This is why the WHY section's framing ("the draft marks selected via the `--active` MODIFIER class + `aria-pressed`") is load-bearing: a static mockup has no live `:checked` state, so the ONLY way the converter can identify "this is the selected pill" is a literal class baked into the draft's markup on that one element (`class="sgs-option-picker__pill sgs-option-picker__pill--active"`).

Evidence this routes correctly (traced in `collect_css_decls_for_element`, `styling_helpers.py:427`): the function builds the CSS cascade for an element from **every** selector in `css_rules` that matches the element's actual class list — so a draft rule `.sgs-option-picker__pill--active{background:...;border-color:...}` is picked up (with correct specificity over the base `.sgs-option-picker__pill` rule) ONLY for the element(s) that literally carry the `--active` class. Resting attrs (`derived_selector='.sgs-option-picker__pill'`) resolve to the FIRST element with that class in document order — since a draft's static markup puts the selected pill's `--active` modifier as an ADDITIONAL class (not instead of the base pill class), `node.find` on the base class alone could theoretically hit the active pill first if it's literally first in the DOM. This is a **pre-existing** limitation of the mechanism (identical to the already-seeded `pillTextColour`/`pillBorderColour` resting rows) — not something introduced by this task, and not something this task's scope (option-picker + product-card files + the ATTR_CLASSIFICATION_OVERRIDES dict) can fix without touching the shared resolver (out of scope per the contract).

**I could not verify this against a live DB or a real draft mockup** (no draft with an `--active`-class pill was available in the worktree during this session) — the routing logic is traced from the resolver source code, not confirmed against a real clone run. Flagging this as the main session's verification item before trusting the lift end-to-end.

---

## 4. Border-radius classification — `role='typography'`, not a box_family

R1 gave discretion: "4-corner box family where per-corner is meaningful... OR keep single-value scalar if the block only supports uniform radius (§6.1c) — decide per checklist + document why."

**Decision: KEEP SCALAR.** A pill's border-radius has no meaningful per-corner use case (a pill is semantically always uniform-rounded — the whole point of the shape). Spec 32 §6.1(c)'s own keep-scalar table doesn't list it because option-picker's pill wasn't migrated at spec-writing time, but the reasoning is identical to the listed single-side families (would show dead/meaningless controls for a property with no real per-corner design use).

**Role classification for the styling-lift:** R1 states the universal lift "acts on an attr ONLY when it has role='color' (or typography)". Border-radius is neither colour nor literally typography, but `styling_content.py::_compute_value`'s generic fallback ("Remaining typography properties (line-height, letter-spacing, text-align, etc.) — store raw CSS value as string") is already the established mechanism the codebase uses for ANY scalar CSS value lifted by suffix that isn't colour/font-weight/font-size — the `'typography'` label is historical (font-first naming), not a semantic gate. I classified `pillBorderRadius`/`pillSelectedBorderRadius` (and the product-card mirrors) as `role='typography'` on this precedent, matching how the SAME mechanism already handles non-font scalar properties.

**UNVERIFIED — flagged, not guess-wired:** I could not confirm `property_suffixes` has a resolvable `'BorderRadius'`-suffix → `css_property='border-radius'` row, because the worktree's `sgs-framework.db` has **zero tables** (empty/unseeded copy — confirmed via `sqlite3`/python query, `sqlite_master` returned nothing). If that suffix row is absent or its `css_property` is NULL, these two DB-seed rows are **inert** — `styling_content.py`'s no-op floor means the lift silently does nothing (no crash), not a wrong value. **Action for the main session:** run `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT * FROM property_suffixes WHERE suffix LIKE '%Radius%'"` against the real DB before trusting this row, or before running `/sgs-update`.

---

## 5. Block-private vs keep-wrapper decision (D294)

**Decision: BLOCK-PRIVATE — dropped `SGS_Container_Wrapper`.**

Verified against the wrapper's own source (`includes/class-sgs-container-wrapper.php:85-260`): for `kind='content'`, the wrapper renders ONLY `maxWidth`/`contentWidth`/padding/margin — zero grid, zero background/overlay, zero shape-divider machinery (all of those are gated `if ( $is_section )`, false for content-kind). Option-picker's own render.php call was already `SGS_Container_Wrapper::render($attributes, $block, $inner_html, 'content', ['tag'=>'fieldset', ...])` — i.e. it was ALREADY only using the wrapper for box+width, and the wrapper's `tag` option already rendered the exact `<fieldset>` element option-picker needs as its root. Nothing the wrapper provided was load-bearing beyond what a block-private implementation reproduces directly. This is the **identical** situation to `sgs/quote` (D294) — same content-KIND, same box+width-only usage, same "wrapper renders the caller's own chosen tag" pattern.

Consequence: `<fieldset>` is now built directly via `get_block_wrapper_attributes()` in render.php (no wrapper delegation); the scoped uid is a CLASS (`sgs-op-{hash}`, not an id) so the anchor `id` attribute stays free — mirrors quote exactly. `view.js` and `editor.css` were NOT touched (out of scope) and both still work unchanged: they select on `.sgs-option-picker` / `.sgs-option-picker__options`, which the new render.php/edit.js still emit identically.

---

## 6. The two preset token names + values

**`colourPreset` attr** (not bare `preset` — see naming note below), enum `["", "soft", "solid"]`, default `""` (framework-neutral — byte-identical to the pre-2026-07-10 base pillStyle look for any STANDALONE option-picker that never sets a preset).

| Preset | Resting | Selected |
|---|---|---|
| **solid** | transparent bg / foreground text / **primary border** | solid **primary fill** / white text / border=fill (undecoupled) / tick visible |
| **soft** | surface bg / foreground text / **border-subtle** border | pale **secondary-tint fill** / text-token text / **primary OUTLINE (decoupled border)** / **no tick** |

Both use `--wp--custom--option-picker-presets--{preset}--{role}` tokens (WordPress-generated from a future `settings.custom.optionPickerPresets` snapshot key — mirrors `buttonPresets` exactly, Spec 32 §7) with THEME-TOKEN fallbacks only (`--wp--preset--color--*`), never a client hex — matching R3/Spec 32 FR-32-6.

**Naming deviation (documented):** I named the attr `colourPreset`, not the contract's literal `preset`, to avoid ambiguity with the pre-existing structural `pillStyle` attr (outlined/filled/ghost) — both classes coexist on the root (`sgs-option-picker--outlined sgs-option-picker--soft`), so a bare `preset` name risked being misread as replacing `pillStyle`. If the main session wants the literal name `preset`, it's a pure rename (attr + class prefix + DB seed key), no logic change.

**Pattern deviation from R3's literal text (documented):** R3 says a preset selection "SEEDS the individual pill-colour attrs... then each stays independently editable" (the OLD D283 seed-on-apply model). Spec 32 v1.1 explicitly **superseded** that model for `sgs/button` (the CURRENT button implementation is pure class-driven, no seeding-on-apply — verified by reading the live `button/render.php`/`style.css`, no `presets.js`/"Apply preset" code exists any more). I implemented option-picker the SAME way as the CURRENT button (pure class-driven, no attr-seeding), consistent with the authoritative, more-recent Spec 32 body rather than R3's residual phrasing of the old pattern.

---

## 7. F3 disposition

**Option-picker itself:** zero rows in `hardcoded-render-defaults-baseline.json` before this session (confirmed via grep) and zero after — no new hardcode introduced.

**Product-card:** adding the new `pickerPill*` attrs caused `check-hardcoded-render-defaults.js`'s name-matching heuristic to newly flag 3 PRE-EXISTING, UNRELATED bare `border-radius` literals elsewhere in `product-card/style.css` (`.product-card .pill` line ~120, `.product-card .trial-tag` line ~225, `.product-card .sgs-product-card__pill` line ~1057) — none of these are governed by the option-picker forwarding (they're the card's own legacy pill/tag markup, a distinct DOM path from the shared `sgs/option-picker` block's own pills). Per the gate's own suggested fix #1 ("Replace the literal with `var(--sgs-x, <default>)`"), I wrapped all 3 in scoped CSS vars with the SAME default value — a harmless, in-scope, gate-satisfying change; it does not change current rendered output (var() with the literal as fallback is byte-identical) and does not add a new baseline row. Confirmed `check-hardcoded-render-defaults.js` reports 0 net-new after the fix.

---

## 8. Per-attr DONE-checklist self-audit (11 conditions)

Self-audit format: ✓ = condition met and verified in-file; N/A = condition doesn't apply to this attr's shape.

| Attr | 1 Zero-inline | 2 Skip-ser. | 3 Box-object | 4 Device-tiers-only | 5 No wrapper | 6 F3-drained | 7 Controls | 8 Security | 9 No churn | 10 LANDED | 11 Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pillBgColour/TextColour/BorderColour | ✓ var-only | N/A (custom) | N/A (scalar colour) | N/A | N/A | ✓ | ✓ DesignTokenPicker | ✓ sgs_colour_value | ✓ | **NOT VERIFIED** (main session) | ✓ build green |
| pillSelectedBg/Text/BorderColour | ✓ var-only | N/A | N/A | N/A | N/A | ✓ | ✓ | ✓ | ✓ | **NOT VERIFIED** | ✓ |
| pillBorderRadius / pillSelectedBorderRadius | ✓ var-only | N/A | N/A (kept scalar, §4) | N/A | N/A | ✓ | ✓ RangeControl | ✓ absint | ✓ | **NOT VERIFIED** | ✓ |
| showSelectedTick | ✓ (class only) | N/A | N/A | N/A | N/A | ✓ | ✓ ToggleControl | ✓ (boolean) | ✓ | **NOT VERIFIED** | ✓ |
| colourPreset | ✓ (class only) | N/A | N/A | N/A | N/A | ✓ | ✓ SelectControl | ✓ enum-checked | ✓ | **NOT VERIFIED** | ✓ |
| pillPadding(+Tablet/Mobile) | ✓ scoped `<style>` | N/A (SGS custom, no WP support target) | ✓ object `{top,right,bottom,left}` | ✓ 1023/767 only | N/A | ✓ (new family, no baseline debt) | ✓ ResponsiveBoxControl | ✓ `$sgs_css_length` | ✓ | **NOT VERIFIED** | ✓ |
| style.spacing.padding/margin (base) | ✓ scoped via `wp_style_engine_get_styles` | ✓ `__experimentalSkipSerialization` | ✓ WP-native object (pre-existing shape) | N/A (base) | N/A | ✓ | ✓ ResponsiveBoxControl | ✓ (WP core escapes) | ✓ | **NOT VERIFIED** | ✓ |
| paddingTablet/Mobile, marginTablet/Mobile | ✓ scoped `@media` | N/A (SGS object, no WP support) | ✓ object | ✓ 1023/767 only | N/A | ✓ | ✓ | ✓ `$sgs_css_length` | ✓ | **NOT VERIFIED** | ✓ |
| style.border.radius (base) | ✓ scoped | ✓ skip-ser. | ✓ WP-native corner object | N/A | N/A | ✓ | ✓ ResponsiveBorderRadiusControl | ✓ | ✓ | **NOT VERIFIED** | ✓ |
| borderRadiusTablet/Mobile | ✓ scoped `@media` | N/A | ✓ object | ✓ 1023/767 only | N/A | ✓ | ✓ | ✓ | ✓ | **NOT VERIFIED** | ✓ |
| borderWidth (base-only, no tiers — matches quote) | ✓ scoped | N/A (SGS custom) | ✓ object `{top,right,bottom,left}` | N/A (no tiers, matches quote precedent) | N/A | ✓ | ✓ ResponsiveBoxControl (showResponsive=false) | ✓ `$sgs_css_length` | ✓ | **NOT VERIFIED** | ✓ |
| borderStyle / borderColour | ✓ scoped | N/A | N/A (scalar, not a box family) | N/A | N/A | ✓ | ✓ SelectControl/DesignTokenPicker | ✓ enum-checked / colour value | ✓ | **NOT VERIFIED** | ✓ |
| contentWidth / maxWidth | ✓ scoped | N/A (SGS custom scalar) | N/A (kept-scalar, unchanged from pre-existing) | N/A (no tiers on these — pre-existing, out of scope to add) | N/A | ✓ | ✓ UnitControl | ✓ `$sgs_css_length` | ✓ | **NOT VERIFIED** | ✓ |
| label*/pillFontSize/pillFontWeight (typography, pre-existing) | ✓ via `sgs_typography_css_rule` (already scoped, untouched logic) | N/A | N/A (kept scalar, existing) | ✓ (helper handles tiers) | N/A | ✓ (no change) | ✓ (unchanged) | ✓ (unchanged) | ✓ | **NOT VERIFIED** | ✓ |
| labelColour / labelMarginBottom | ✓ moved to scoped `<style>` (WAS inline pre-migration — see contract's explicit call-out) | N/A | N/A (kept-scalar per Spec 32 §6.1c — single side) | N/A | N/A | ✓ | ✓ (unchanged) | ✓ `$sgs_css_length` on margin | ✓ | **NOT VERIFIED** | ✓ |
| Root element (fieldset) | ✓ no wrapper div, no property declarations | N/A | N/A | N/A | ✓ IS the root (§B3/§5) | ✓ | N/A | ✓ | ✓ no version bump | **NOT VERIFIED** | ✓ |

**Column 10 (LANDED) is uniformly "NOT VERIFIED" by design** — per STOP-43/44, emit-green ≠ LANDED; this is explicitly the main session's job (deploy + live 375/768/1440 + reclone), not mine. I did not claim it.

---

## 9. What I could NOT verify / explicit STOPs

1. **`property_suffixes` `'BorderRadius'` suffix resolvability** (§4) — worktree DB is empty (0 tables). The main session must query the real `sgs-framework.db` before trusting the `role='typography'` border-radius rows are live.
2. **Selected-state `derived_selector` routing on a real draft** (§3) — traced through resolver source code only; no live draft with a `--active`-class pill was available to run the converter against. The main session should run `/sgs-clone` (or a targeted converter unit test) against a fixture mockup with `<span class="sgs-option-picker__pill sgs-option-picker__pill--active">` to confirm the lift actually populates `pillSelectedBgColour` etc. from the draft's CSS.
3. **`pillPadding*` has no converter LIFT resolver yet** — I seeded the `box_family` DB row and built the render.php/edit.js consumption side (authored-only, via the BoxControl), but no existing converter resolver (`outer_box.py`, `content_band.py`, or `styling_content.py`) targets a nested-child box-family object — this is an honest gap, not a guess-wired mechanism. Flagged, not silently left implicit.
4. Did NOT run `npm run build` past the FIRST failure without fixing root cause: the initial 3 F3 false-positives (§7) were investigated (confirmed unrelated pre-existing CSS, not something my new attrs should silently suppress via baseline) before applying the sanctioned `var()` fix — never dumped into the baseline file.
5. Did NOT run `/sgs-update`, deploy, or commit — per contract.

---

## 10. Build result

`npm run build` (worktree `plugins/sgs-blocks`) — **GREEN**, exit code 0. All prebuild gates passed: dead-controls (0 net-new), hardcoded-render-defaults (0 net-new after §7 fix), control-ux, product-search-guards, db-consistency, cheat-gate, excluded-gate, ledger coverage, atomic-slug-literals, declare_input, oracle pytest (180 passed, 1 skipped). `php -l` clean on all 3 touched PHP files (both source and webpack-copied `build/` output). Built `render.php` output grepped for `style="..."` — exactly 2 occurrences, both contract-pre-approved exceptions (swatch chip `background` data-value, `--sgs-op-swatch-text` var-value) — zero real property declarations anywhere else in the rendered subtree.

---

## 11. SHIP-WITH-FIX addendum (coordinator review — applied 2026-07-10)

Applied the coordinator's single must-fix: **migrated the 4 pill border-radius attrs from `number` to a CSS-length `string`.** This resolves all three review findings at once — (must-fix #1) the styling-lift's generic string value (`"6px"`) now lands in a matching string attr with NO converter change; (must-fix #2) an explicit `"0"`/`"0px"` is now distinguishable from unset; (minor #3) the editor no longer discards a 0.

**Files changed in this pass:**

| File | Change |
|---|---|
| `option-picker/block.json` | `pillBorderRadius` + `pillSelectedBorderRadius` → `"type":"string","default":""` |
| `product-card/block.json` | `pickerPillBorderRadius` + `pickerPillSelectedBorderRadius` → `"type":"string","default":""` |
| `option-picker/render.php` | Read as string; gate on `'' !== $x` (not `> 0`); emit value directly sanitised via `$sgs_css_length` (dropped `absint`); preserves explicit `"0"` |
| `product-card/render.php` | `pickerPill*BorderRadius` forwards read as string (`sanitize_text_field((string)...)`, no `absint`/`null`) |
| `includes/product-card-builtin-render.php` | Same string-forward for the typed call site |
| `option-picker/edit.js` | 2 `RangeControl`→`UnitControl` (number+unit → string; `onChange` sets `''` when cleared, never `null`); removed now-unused `RangeControl` import |
| `product-card/edit.js` | 2 `RangeControl`→`UnitControl` (added `UnitControl` import + `PICKER_RADIUS_UNITS`; removed now-unused `RangeControl` import) |
| `sgs-update-v2.py` | Border-radius override entries UNCHANGED — KEEP `role='typography'` + `derived_selector` (still routes via the generic-string lift, now correct with a string attr); comment updated to record the number→string fix |

**Radius round-trip verification (PHP, using the real `$sgs_css_length` sanitiser + the real gate):**

| Input | Emitted |
|---|---|
| `"6px"` | `--sgs-op-pill-radius:6px` ✓ |
| `"0"` | `--sgs-op-pill-radius:0` ✓ (distinct from unset) |
| `"0px"` | `--sgs-op-pill-radius:0px` ✓ |
| `"1.5rem"` | `--sgs-op-pill-radius:1.5rem` ✓ |
| `""` (empty) | *(no var)* → CSS default var governs ✓ |
| unset | *(no var)* → CSS default var governs ✓ |
| `"6px;}body{x:1}"` (injection) | `--sgs-op-pill-radius:6pxbodyx1` — sanitised to inert garbage, no `;{}` breakout ✓ |

`npm run build` after the fix — **GREEN, exit 0**; all prebuild gates pass (dead-controls 0 net-new, hardcoded-defaults 0 net-new, cheat-gate 0 new, control-ux clean, oracle pytest green). `php -l` clean on all 3 PHP files.

**Role-redundancy disposition (low-priority):** Confirmed from `scripts/behavioural-analyser/assign-canonical.py:517` that `role` IS derived from the peeled property-suffix (`role = prop_info["role"]` where `prop_info` comes from a `property_suffixes` lookup on the `*Colour` suffix). **However**, `assign-canonical.py` populates role purely from the `property_suffixes` TABLE (`SELECT suffix, role, css_property FROM property_suffixes`, line 127 — no runtime keyword-heuristic fallback for this path), and I could NOT verify the base seed actually contains a `Colour`/`Color` row with `role='color'` (the worktree `sgs-framework.db` is empty — 0 tables — and no base seed INSERT surfaced in the source). If that row is absent, dropping the explicit `role:'color'` keys would silently break the lift. Per the coordinator's own "if unsure, leave them (harmless)" allowance — and matching the existing precedent in the SAME dict (`sgs/testimonial` `orgColour`/`summaryColour` at lines ~1215-1216 KEEP explicit `role:'color'` alongside `derived_selector`) — **I left the 6 `role:'color'` keys in place**. They are harmless (the override is the final writer and `role='color'` is the correct value either way) and consistent with existing code convention. Recommend the main session confirm the `property_suffixes` `Colour`→`color` seed against the live DB and, if present, drop them in a follow-up cleanup (keeping `derived_selector`, the load-bearing part). Per contract I did NOT touch the converter.
