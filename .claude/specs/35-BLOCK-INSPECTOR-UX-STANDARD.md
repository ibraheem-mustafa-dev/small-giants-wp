# Spec 35 — SGS Block Inspector UX, Control-Completeness & Capability Standard

```
doc_type: spec
spec_id: 35
spec_version: 2.0
status: ACTIVE (v1 2026-07-18; v2 same day — expanded with a 6-stream research sweep:
        WP component capabilities, competitor parity, inspector UX/a11y, uncovered
        components, newer WP platform capabilities, interaction/effects/content)
owner: framework
companions: Spec 32 (component styling/token contract — governs RENDERED output),
            Spec 00 (naming). This spec governs the EDITOR-FACING control surface.
```

## Why this exists

Every SGS block builds its inspector ad hoc. Clients are non-technical and live in the block
editor (CLAUDE.md "Client experience is primary"). Symptoms this fixes: cluttered/duplicated
sidebars, **half-built controls** (colour picker with no transparency; "shadow" = only Small/Medium;
logos added one-at-a-time), missing table-stakes features every WP power-user expects (hover states,
responsive-everywhere, alpha+gradient, real shadow/border builders, link controls), and
**re-inventing things WordPress core already ships** (duotone, aspect-ratio, lightbox, sticky,
dynamic content, client-safe editing).

This is the standard + fail-list + upgrade roadmap. It becomes an enforceable per-block
definition-of-done (Part L → fold into `block-migration-DONE-checklist.md` + a structural gate).

---

## PART A — Layout & grouping

- **A1. Placement hierarchy:** on-canvas → Block Toolbar (frequent/primary) → Inspector (secondary).
  Never put a control the block can't function without ONLY in the sidebar. [WP Block Design]
- **A2.** Sidebar is not the home for every option — every attribute has a sensible default. [10up]
- **A3. Native Settings/Styles/Advanced tabs via the `group` prop.** Behaviour/content → Settings;
  appearance → Styles (or sub-groups `color`/`typography`/`dimensions`/`border` to slot INTO the
  native panel); CSS-class/anchor → Advanced (`group="advanced"`/`InspectorAdvancedControls`).
- **A4. Element-first grouping** for composite blocks (panels by block PART, not property type).
- **A5. Progressive disclosure with `ToolsPanel`/`ToolsPanelItem`** once a panel hits ~6+ controls:
  optional controls behind the "+" menu, 1–3 `isShownByDefault`, `resetAll`. THE anti-clutter tool.
- **A6. Never duplicate a native `supports` panel** (inspector-UX form of R-31-9).
- **A7. Per-block universal-extension opt-out** via `supports.sgs.hideExtensions: [...]`
  (`hide-extensions.js`). Declarative + universal.
- **A8. Panel order = frequency-first;** escape-hatches last + collapsed.
- **A9. In-row layout primitives** (`HStack`/`VStack`/`Flex`/`Grid`/`Spacer`/`Divider`) — lay related
  controls in a row, not one full-width field per line (density for non-technical clients).

## PART B — Control completeness (no half-built controls)

| Control | Complete means | Incomplete smell |
|---|---|---|
| `RangeControl` | `min`/`max`/`step` real; `withInputField`; `allowReset`+`resetFallbackValue`; unit shown | slider only, no input/reset, arbitrary 0–100 |
| `UnitControl` | `units` covering every meaningful unit; `isResetValueOnUnitChange` | px-only |
| `BoxControl` | 4 sides + link/unlink; `units`; `allowReset`; `splitOnAxis` | one linked number |
| Colour | **`enableAlpha`** (≈always) + `clearable` (alpha-0 ≠ unset); `disableCustomColors` false | no alpha (can't pick transparent — reported bug) |
| `GradientPicker` | custom builder + alpha stops + `clearable` | preset-only |
| Border (`BorderBoxControl`) | `enableStyle` + `enableAlpha` + per-side split; radius as separate 4-corner control | one colour+width, no style/per-side |
| Shadow | real X/Y/blur/spread/colour+alpha/inset builder (+ presets on top; multi-layer ideal) | **None/Small/Medium only** |
| Selection | `ToggleGroupControl` (2–5 short); `ComboboxControl` (>~10, searchable); `FormTokenField` (multi-value) | comma-text; giant Select |
| Media/gallery | `multiple="add"` + `gallery` + array attr + `MediaUploadCheck` + drag-drop | scalar attr + single MediaUpload |
| Link/CTA | **`LinkControl`** (internal search + new-tab + rel nofollow/sponsored via `settings`) | raw URL `TextControl` |
| Typography | full set: `FontSizePicker` (presets+fluid) + `FontAppearanceControl` + `LineHeightControl` + letter-spacing/transform/decoration | fontSize only |
| Image | size dropdown (attachment `sizes`) + aspectRatio + object-fit/`FocalPointPicker` | hardcoded full-size `src`, centre-crop only |
| Spacing | token-based `__experimentalSpacingSizesControl` (S/M/L, theme.json) OR UnitControl | raw px RangeControl (breaks token system) |

**Universal completeness features:** reset path · `enableAlpha`+clearable · per-side/per-corner ·
real units · ToolsPanel disclosure · device-tier responsive · real builders (not presets alone) ·
array attrs for multi-item · correct `group` · `MediaUploadCheck` · Combobox for long lists.

## PART C — Feature parity checklist (T=table-stakes · P=premium · N=native WP mechanism exists)

**Links/CTAs:** internal-content search (N: LinkControl) T · new-tab + auto-rel-noopener (N) T ·
rel nofollow/sponsored (N: LinkControl `settings`) T · **whole-card/block clickable link** (no
native — hand-rolled overlay `<a>`) T — *high-impact gap for card-grid/team/product/testimonial* ·
download attr P.

**Media:** focal point (N: FocalPointPicker) T · aspect-ratio (N: `dimensions.aspectRatio`) T ·
object-fit/position T · native lightbox (N: `settings.lightbox`, image only, no swipe/keyboard nav) T ·
srcset/lazy-load (N, automatic) T · video poster/autoplay/loop/mute (N: core video attrs) T ·
background video (N: Cover) T · SVG sanitise-on-upload (security — never raw) T.

**Effects/filters:** opacity T · duotone (N: `filter.duotone` — prefer over hand-rolled) T · CSS
filters blur/brightness/etc P · backdrop-filter/mix-blend-mode P · clip-path/mask P.

**Motion/animation:** entrance P · scroll-triggered P · hover transforms (scale/rotate/translate) T ·
parallax P · sticky-on-scroll (N: `position.sticky`) T · **`prefers-reduced-motion` gating on ALL
animation (WCAG 2.3.3) — from day one, never bolted on** T.

**Position/layout:** sticky (N: position support) T · z-index P · min/max height (N: `dimensions.minHeight`) T ·
vertical align (N) T · responsive column ordering P · flex/grid gap (N: `layout.spacing.blockGap`) T ·
full-bleed align (N: `align`) T.

**Conditional/display:** by device T · by login/role (server-side capability check) T · by date/schedule P ·
by query/context P · **content-only editing (N: `templateLock:"contentOnly"`)** T — *native, unused, high-value*.

**Content:** dynamic data binding (N: **Block Bindings API**, WP 6.5+ — build on this, not a bespoke
system) T · repeaters/loops (N: `core/query`) T · counters/ratings/icons P.

**A11y/SEO as controls:** alt-text field (N) T · **decorative-image toggle** (empty alt +
`aria-hidden`) — gap, cheap, WCAG · heading-level (N) T · **general ARIA-label control** for icon-only
buttons — gap · schema → leave to `seo-schema` skill, don't duplicate in blocks.

## PART D — Responsive UX

- **D1.** Two patterns, never conflated: editor device-preview (viewport only) vs per-block responsive
  attributes (SGS `ResponsiveControl` + `paddingTablet`/`Mobile`).
- **D2.** Breakpoints = locked **768 / 1024** device standard; never a bespoke third value (device-tier
  vs arbitrary-visual-breakpoint rule).
- **D3.** Mobile inherits from desktop unless overridden — blank tiers fall back safely.

## PART E — Accessibility (WCAG 2.1/2.2 AA)

- **E1.** 4.5:1 contrast on the block's OWN control UI.
- **E2.** `ToggleGroupControl`: selected/focus visible under High-Contrast (not colour alone); `help`
  via `aria-describedby`. [Gutenberg #50785, #76740]
- **E3.** Keyboard-operate everything (inherited free from native components).
- **E4.** No extra unlabelled `role="region"` around InspectorControls.
- **E5.** `prefers-reduced-motion` gate on every animation/transition (WCAG 2.3.3 AA).
- **E6.** Decorative-image toggle + ARIA-label control where markup needs them.

## PART F — Anti-patterns (fail-list)

Essential control only in sidebar · sidebar as home for every option · no headers past a handful ·
**incomplete option sets (Small/Medium, no Custom)** · bespoke panel duplicating a native supports
panel · no reset · colour-only focus/selected · help not `aria-describedby`-linked · bespoke
"Custom CSS" field on the block · re-implementing box-side unlink per block · duplicate hover panels /
hover split from resting · everything in the Settings group · **raw URL field instead of LinkControl** ·
**hand-rolling duotone/aspect-ratio/lightbox/sticky/dynamic-content when a native support exists** ·
animation with no reduced-motion gate · raw-px spacing instead of the token scale.

## PART G — Prefer native, don't hand-roll (adopt these WP mechanisms)

| Native mechanism | Use instead of | Priority |
|---|---|---|
| `templateLock:"contentOnly"` (patterns) | training clients / bespoke lock | **HIGH** — client-safe editing, free |
| Block supports: `dimensions.aspectRatio`/`minHeight`, `background`, `position.sticky`, `shadow`, `filter.duotone`, `layout` | bespoke panels/CSS for these | **HIGH** — free inspector UI + CSS |
| theme.json v3 `styles.blocks.<name>.css` + `appearanceTools` | per-block bespoke CSS plumbing | **HIGH** — fits per-client `theme-snapshot.json` |
| **Block Bindings API** (`register_block_bindings_source`) | any bespoke dynamic-content attr system | **HIGH** — WP's own direction |
| `LinkControl` | raw URL text fields | **HIGH** — internal search + rel + new-tab free |
| Native duotone / aspect-ratio / lightbox / sticky | hand-rolled filter/box/JS/position | **HIGH** — check before building any of these |
| Block style variations w/ inner-element styles ("Section Styles", 6.6) | bespoke variant switching where it's "same structure, different look" | Med — maps onto `variant_slots` |
| Fluid typography + spacing presets (theme.json) | hand-written type breakpoints | Med (complements device-tier, doesn't replace) |
| `register_block_pattern` + categories/blockTypes | uncategorised patterns | Med — audit existing `patterns/*.php` |
| Interactivity API (`@wordpress/interactivity`) | hand-rolled view.js DOM code | Med — real rewrite cost |
| Copy/paste styles (WP 6.2, free) | — | works IF styling is in native `supports` attrs (Spec 32 direction) |
| Save-as-default (locked 4-channel model) | a custom defaults store | — already the right call |
| Block Hooks | — | LOW — template-context only; SGS clones to Pages |

## PART H — Component quick-reference (which component for which job)

Numeric+unit → `UnitControl` · bounded numeric → `RangeControl` (+input+reset) · 4-side box →
`BoxControl` · colour → `ColorPalette`/`ColorGradientControl` (**`enableAlpha`**) · gradient →
`GradientPicker` · angle/direction → `AnglePickerControl` · border → `BorderBoxControl` · radius →
`__experimentalBorderRadiusControl` · spacing token → `__experimentalSpacingSizesControl` · segmented
choice → `ToggleGroupControl` · long/searchable list → `ComboboxControl` · multi-value tags →
`FormTokenField` · link/CTA → `LinkControl` · font size → `FontSizePicker` · weight+style →
`FontAppearanceControl` · line-height → `LineHeightControl` · focal point → `FocalPointPicker` ·
date → `DateTimePicker` · optional-controls group → `ToolsPanel`/`ToolsPanelItem` · in-row layout →
`HStack`/`VStack`/`Flex`/`Spacer`/`Divider` · swatch preview → `ColorIndicator` · inline hint →
`Tip`/`Notice` · greyed prerequisite → `Disabled` · compact secondary → `Dropdown`/`DropdownMenu` ·
destructive confirm → `Modal` · inline mark → `registerFormatType`. Free-from-supports: anchor,
className, align, aspectRatio, background, position, shadow, filter/duotone.

## PART I — SGS component action layer (exists vs build)

| Capability | SGS status | Action |
|---|---|---|
| Responsive per-breakpoint | `ResponsiveControl`, `ResponsiveBoxControl` EXIST | audit coverage; use everywhere responsive-worthy |
| Typography per element | `TypographyControls` EXISTS (R-22-13) | extend to appearance/letter-spacing where missing |
| Colour | `DesignTokenPicker` EXISTS — **NO `enableAlpha`/clearable audit** | **ADD `enableAlpha` + `clearable`** (framework-wide transparent fix) |
| Normal/Hover state | `StateToggleControl` EXISTS (2026-07-18) | roll out to stateful blocks |
| Extension opt-out | `hideExtensions` EXISTS (2026-07-18) | — |
| **Shadow builder** | **MISSING** (3-option selects) | **BUILD** shared `ShadowControl` |
| **Link/CTA** | **likely raw URL fields** | **AUDIT + migrate to `LinkControl`** wrapper |
| **Bulk media/gallery** | **MISSING** (`MediaPicker` single) | **BUILD** `MediaGalleryPicker` (`multiple="add"`+`gallery`) |
| **Focal point / image size / aspect-ratio** | **partial** (`imageControls`) | **EXTEND** `imageControls` to size+aspect+object-fit+focal |
| **Gradient / bg overlay** | **MISSING** | adopt `GradientPicker` + pseudo-element overlay |
| **Spacing token control** | raw units | adopt `SpacingSizesControl` where tokens apply |
| ToolsPanel disclosure | only `site-header` | adopt for control-dense panels |
| **Client-safe editing** | **unused** | adopt `templateLock:"contentOnly"` in patterns |
| **Dynamic content** | check for bespoke | build new on **Block Bindings** |
| **Reduced-motion gate** | verify on animation ext | ensure every animation gated |
| **Whole-card link** | **MISSING** | build overlay-`<a>` block-link pattern (extend `sgsBlockLink`) |
| Native duotone/aspectRatio/sticky | verify not hand-rolled | prefer native supports |

## PART J — Prioritised upgrade roadmap (sequenced)

**Wave 1 — framework-wide, high-impact, low cost (do first):**
1. `DesignTokenPicker`: add `enableAlpha` + `clearable` (fixes transparent everywhere) — ~small.
2. Audit every link/URL field → `LinkControl` wrapper (`SgsLinkControl`) — high client impact.
3. Build shared `ShadowControl` (real X/Y/blur/spread/colour+alpha) → replace None/Small/Medium selects.
4. `templateLock:"contentOnly"` in client patterns — client-safe editing, near-zero cost.

**Wave 2 — high-impact, medium cost:**
5. `MediaGalleryPicker` (bulk multi-upload) → brand-strip logos + any repeater-media block.
6. Extend `imageControls` = size dropdown + aspectRatio + object-fit + FocalPointPicker.
7. Whole-card clickable-link pattern for card-grid/team/product/testimonial.
8. Adopt `ToolsPanel` progressive disclosure on control-dense panels.
9. Ensure every animation is `prefers-reduced-motion`-gated (WCAG).

**Wave 3 — architectural / adopt-native:**
10. Migrate bespoke dynamic content → Block Bindings; verify native duotone/aspect-ratio/sticky
    used over hand-rolled; adopt Section Styles for "same structure, different look" variants;
    audit patterns' categories/blockTypes; consider Interactivity API for hand-rolled view.js.

## PART K — Rollout mechanism

Bean is QC-only long-term (CLAUDE.md SUCCESS). This standard must be enforced structurally, not by
memory: (a) fold Part L into `block-migration-DONE-checklist.md`; (b) a lint/gate that flags a
colour control without `enableAlpha`, a URL field not using LinkControl, a preset-only "shadow",
an animation without a reduced-motion gate; (c) `/doc-audit` cites this spec per block.

## PART L — Per-block inspector definition-of-done (checklist)

[ ] Settings/Styles/Advanced split via `group` · [ ] element-first panels · [ ] control-dense panels
use ToolsPanel · [ ] every colour has `enableAlpha`+clearable · [ ] every CSS-length uses UnitControl
(real units) or the spacing token scale · [ ] every 4-value prop per-side via box_family · [ ] compound
values (shadow/border) use real builders · [ ] links use LinkControl (new-tab + rel) · [ ] images have
size + aspect-ratio + object-fit + focal point where relevant · [ ] multi-item data is array-shaped
with gallery/repeater · [ ] responsive props expose the 768/1024 device switcher · [ ] states use
`StateToggleControl` · [ ] irrelevant universal panels hidden via `hideExtensions` · [ ] `MediaUploadCheck`
on every MediaUpload · [ ] no native-supports panel duplicated · [ ] native supports used over hand-rolled
(aspectRatio/duotone/sticky/lightbox) · [ ] animation `prefers-reduced-motion`-gated · [ ] decorative-image
+ ARIA-label where needed · [ ] keyboard + contrast + `aria-describedby` a11y pass · [ ] client patterns
use `templateLock:"contentOnly"` · [ ] no Part-F anti-patterns.

## Sources

developer.wordpress.org Block Editor Handbook (all component references + Block Design, Accessibility,
Block Supports, Block Bindings, Interactivity API, theme.json v3, Block Locking, Patterns, Format API);
WP Developer Blog (inspector sidebar groups, box-shadow, Block Bindings, Section Styles, per-block CSS,
content-only editing); make.wordpress.org/core (inspector tabs, WP 6.8 UI/a11y, Block Bindings, Block
Hooks); gutenberg.10up.com (Anatomy of a Block, ToolsPanel); Gutenberg PRs #50785/#76740/#56897/#51545/
#62852; Kadence/Spectra/GenerateBlocks/Stackable/GreenShift docs; Block Visibility plugin. Full URL list
in the six 2026-07-18 research transcripts.
```
