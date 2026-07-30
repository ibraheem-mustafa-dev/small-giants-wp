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

> **Sibling spec (Bean decision, 2026-07-28): Spec 35 and Spec 32 stay SEPARATE, not merged.** Spec 35 (this doc) owns the block INSPECTOR-UX standard (editor-facing controls). Spec 32 owns the styling/token EMISSION contract (no-inline, scoped CSS, box-object attrs). Both gate every block build — read them together.

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
- **D4. Per-device CONTENT cascade (added 2026-07-21, re-homed from Spec 37 FR-37-24).** D3's
  inheritance applies to content **presence**, not only to property values. Desktop is the base;
  tablet inherits desktop; mobile inherits tablet. Hiding a block at a tier applies to that tier
  **and every tier below**, never above; a tier that is explicitly edited stops inheriting.
  - **HIDE, never REMOVE.** The cascade hides via CSS and never forks the block tree per tier.
    `includes/device-visibility.php:10,15` already generates `display:none` media queries and
    states *"Content remains in the DOM for SEO (display:none only hides visually)"*. A
    structural remove would break crawlability (memory `degrade-to-more-content-never-less`) and
    would need per-device cache fragments the page-cache model has no key for.
  - **`inherit` resolves at render, never copies down at save.** Copying a parent's value into a
    child tier at save time makes an inherited value indistinguishable from an explicit
    override, so a later desktop edit can no longer cascade.
  - **⚠ SCOPE AMENDED (D400, Bean-ruled 2026-07-28): general block VISIBILITY is EXCLUDED from
    this cascade.** `sgsHideOnMobile`/`Tablet`/`Desktop`
    (`src/blocks/extensions/responsive-visibility.js`) KEEP their three independent per-device
    toggles — no reshape, no inheritance. Bean's reasoning (the rule): per-device hiding's
    dominant use is a device-SPECIFIC block — hidden on desktop precisely because it exists for
    mobile/tablet; inheritance would make a desktop-hide cascade everywhere and the block could
    never render. The earlier plan to reshape the visibility extension onto the cascade (D358
    re-homing) is REVERSED on this point. **D4's down-cascade model now applies ONLY to
    header/footer CONTENT curation (Spec 37 §3.8's item-level trimming — Bean re-confirmed its
    down-cascade 2026-07-28)** and the cascade mechanism itself applies to BEHAVIOURS and
    RESPONSIVE VALUES (FR-37-14 / FR-37-16 families).
  - **Reuse the one cascade (for behaviours/values/§3.8 content).** Resolve via the same
    `resolveTier()` shape P1 DP1 defines — do not introduce a second inheritance mechanism.
    Approved contract: `plans/archive/2026-07-28-resolveTier-cascade-design-gate.md` (D400).
  - **Consumer:** Spec 37 §3.8 depends on this; that spec owns the requirement, this spec owns
    the build.
  - **✅ BUILD STATUS: BUILT + LIVE-PROVEN (2026-07-28, same day as the D400 approval).** The
    canonical `resolveTier()` shipped in JS (`src/utils/responsive.js`, with `resolveResponsiveTier`
    now a thin alias) + PHP (`sgs_resolve_tier()`, `helpers-responsive.php`) with ONE shared 16-case
    golden fixture set passing 16/16 in BOTH runtimes (`b9c5f6d1`); the scoped per-tier emission
    helper (`sgs_emit_tier_rules`, 9/9 goldens) + `ResponsiveTriStateControl` followed (`ac0c30eb`);
    FR-37-14's site-header reshape consumed it and was proven live at 3 viewports incl. explicit-off
    override + sticky+transparent coexistence (`e4bd72ef`→`eb255f06`); rows unified onto the same
    vocabulary (legacy `sgs_resolve_tier_booleans` DELETED). Per D400/D405, general block VISIBILITY
    remains EXCLUDED (see the amended scope note above) — the §3.8 header-CONTENT cascade feature
    is a separate, still-open consumer owned by Spec 37.
    `src/blocks/extensions/responsive-visibility.js:68-70` is still three
    INDEPENDENT flat booleans (`sgsHideOnMobile`/`Tablet`/`Desktop`, `default:false`) with no
    inheritance — deliberately (D400 scope amendment, general block visibility keeps its own
    per-device toggles).
    **✅ RESOLVED (verified 2026-07-30): `headerSticky`/`headerTransparent`/`headerShrink`/
    `headerHideOnScroll` are no longer flat `boolean`s.** They are now `{"type":"object",
    "default":{}}` at `site-header/block.json:142-157` (line numbers shifted since this passage
    was written). **Spec 37 FR-37-14** (behaviour tri-state) consumed the canonical
    `resolveTier()` cascade and is built and live-proven — see the BUILD STATUS block below and
    Part M, which already record this as shipped. The former blocking relationship ("Spec 37
    Group-B items cannot be built until this ships") is historical: the cascade shipped same-day
    (2026-07-28) and FR-37-14 now depends on it successfully, it is not still waiting on it.

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

**⚠ EXEMPTION (added 2026-07-30, resolves a cross-spec conflict): `sgsCustomCss` is NOT the
bespoke "Custom CSS" field this fail-list bans.** Spec 32 FR-32-4 names `sgsCustomCss` as **the
only permitted non-attr, non-scoped-`<style>` styling output** framework-wide, and Spec 31
FR-31-5.2 makes it **load-bearing** — it is the built D3 passthrough channel that carries arbitrary
non-device-tier draft breakpoints (`ResidualBand`) onto a clone; removing it breaks clone fidelity.
It is registered on all 81 blocks (`src/blocks/extensions/custom-css.js:25`) and tracked as a
deliberate, framework-wide exception in `decisions.md` D401 ("flagged, NOT fixed"). The Part-F
anti-pattern still stands for any OTHER bespoke per-block custom-CSS field — this exemption is not
a licence to add a second, block-specific one.

## PART G — Prefer native, don't hand-roll (adopt these WP mechanisms)

**⚠ Part G AMENDED by D402 (T0.4/T0.5 design gates, Bean-approved 2026-07-28) — the blanket
"adopt native" guidance is replaced by a per-support VERDICT table. Nothing adopts a support
without the Spec-32 skip-serialisation + scoped-emission pattern.**

| Support | VERDICT (D402) | Reasoning |
|---|---|---|
| `filter.duotone` | **ADOPT** (T3.5 imageControls wave) | Nothing hand-rolled exists; free client value on image blocks |
| `dimensions.aspectRatio` | **ADOPT** (T3.5) | Replaces 4 inconsistent per-block attrs |
| `shadow` | **KEEP SGS** | ShadowControl + `sgs_shadow_value()` exceeds the native preset picker |
| `dimensions.minHeight` | **KEEP SGS** | Per-breakpoint attr families beat native's single value; adopting = Part-F duplicate panel |
| `position.sticky` | **KEEP SGS** | Collides with the D400 behaviour cascade |
| `lightbox` | **KEEP SGS** (gallery) | Bespoke has more features; native considered only for `sgs/media` in T3.5 |
| `templateLock:"contentOnly"` | **PER-CLIENT OPT-IN ONLY** | Hides children's inspector settings (contradicts the inspector standard; D377/D378 rejection stands; D393 template-reapply risk). Build-time lock for a specific client with a real breakage problem — never framework patterns |

| Native mechanism | Use instead of | Priority |
|---|---|---|
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
| Colour | `DesignTokenPicker` EXISTS — `enableAlpha` + `clearable` BUILT (both default true; verified 2026-07-28, `DesignTokenPicker.js:51-58,:87-94`) | DONE (Wave 1.1) |
| Normal/Hover state | `StateToggleControl` EXISTS (2026-07-18) | roll out to stateful blocks |
| Extension opt-out | `hideExtensions` EXISTS (2026-07-18) | — |
| **Shadow builder** | `ShadowControl` **BUILT + ROLLED OUT** (X/Y/blur/spread/colour+alpha/inset + theme presets; `src/components/ShadowControl.js`) — consumers now incl. testimonial `shadowHover`, trust-bar `iconCircleShadow`/`badgeImageShadow` (`b9c5f6d1`, 2026-07-28) | DONE (Wave 1) |
| **Link/CTA** | `SgsLinkControl` **BUILT + ROLLED OUT** (`src/components/SgsLinkControl.js`) — card-grid, media (4 fields), product-card (3 CTAs), trust-bar item links migrated (`ac0c30eb`, 2026-07-28); raw-url-link WARNs 40→0 (2 reasoned EXC exemptions remain) | DONE (Wave 1) |
| **Bulk media/gallery** | **BUILT** — `MediaGalleryPicker` extracted from `gallery/edit.js`, both call sites swapped (`07c67642`, 2026-07-28) | DONE (Wave 2) |
| **Focal point / image size / aspect-ratio** | **BUILT** — FocalPointPicker `{x,y}`, object-fit via scoped var; image-size dropdown ruled NOT-FORCIBLE at extension level (no universal attachment ID, documented) (`07c67642`) | DONE (Wave 2) |
| **Gradient / bg overlay** | **BUILT** — `GradientOverlayControl`, one shared `BackgroundPanel` covers container/cta-section/hero (`07c67642`) | DONE (Wave 2) |
| **Spacing token control** | raw units | still open — not part of the 2026-07-28 waves; not gated by Part K |
| ToolsPanel disclosure | **BUILT + ROLLED OUT** — 23 panels converted across 19 blocks, 8 skip-reasoned in-code (`07c67642`+`f5fac495`) | DONE (Wave 2) |
| **Client-safe editing** | `templateLock:"contentOnly"` resolved **PER-CLIENT OPT-IN ONLY** (D402 design gate, Part G) | Not a framework rollout — deliberate, not a gap |
| **Dynamic content** | check for bespoke | still open — not part of the 2026-07-28 waves |
| **Reduced-motion gate** | verify on animation ext | **RESOLVED 2026-07-30 — the "gap" was a measurement bug, not missing gates.** A DB roster regeneration briefly flagged 18 blocks (14× `form-field-*`, `form-review`, `form-step`, `accordion-item`, `tab`) as lacking `prefers-reduced-motion`. All 18 were FALSE POSITIVES: `build-roster.py` substring-matched `"animation"` against the raw `supports.sgs` JSON, so `hideExtensions:["animation"]` — an opt-**OUT** list — was read as *having* animation. None of the 18 even has a `style.css`. Fixed by stripping `hideExtensions` before matching (`animation` 36→18; gate PASS; the 18 retained are the genuinely-animating blocks, all passing). **A genuine framework-wide gate already covers every block:** `theme/sgs-theme/assets/css/core-blocks-critical.css:69-78` (`*`/`*::before`/`*::after` + `!important`), enqueued unconditionally (`functions.php:233`) — it explicitly "replaces piecemeal per-block reduced-motion rules". ⚠ Residual: the audit rule only inspects a block's OWN `style.css`/`view.js`, so it is still blind to that global gate — a future block that genuinely animates and correctly relies on the global rule WILL be falsely flagged. Teaching rule 5 about the global gate is the remaining work. |
| **Whole-card link** | **BUILT** — stretched-link overlay (sibling overlay + aria-label + focus ring; nested-`<a>` impossible by construction) replaces the old whole-block `sgsBlockLink` wrap; team-member + info-box dead attrs deleted (`07c67642`) | DONE (Wave 2) |
| Native duotone/aspectRatio/sticky | duotone + aspectRatio **ADOPTED native** on media/gallery (D402 verdict table, `ac0c30eb`); shadow/minHeight/sticky/gallery-lightbox **KEPT SGS** (deliberate) | DONE (Wave 3) |

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

## PART M — Implementation status (living; updated 2026-07-28)

**The STANDARD (Parts A–L) is COMPLETE as a written spec (v2.0). The BUILD SURFACE against it is
now SUBSTANTIALLY COMPLETE (`07c67642` → `64f5080e`, late 2026-07-28, ~18 delegate-routed packages
across waves A+B + the Bean-eye/QC fix chain — see the dated completion block below); the component
layer and the Part-K gate ARE complete and genuinely wired fail-closed (`51ff7c27`). ⚠ Reconciled
2026-07-30: Spec 35 does still carry three named open items — Part I's own table lists them as
"still open" in the same document — so "no remaining build items" (an earlier claim in this
section) was a self-contradiction. The three: (1) **Spacing token control** — still raw units, not
part of the 2026-07-28 waves; (2) **Dynamic content** (Block Bindings migration) — still open, not
part of the 2026-07-28 waves. **(3) Reduced-motion gate — RESOLVED 2026-07-30, not a gap:** an
18-block flag proved to be a `build-roster.py` opt-out-list substring bug, and a framework-wide
gate already covers every block (see Part I). Its residual is that the audit rule cannot SEE that
global gate. Neither of the two genuinely-open items blocks the Part-K structural gate or the
shipped component layer.**

**Measurement & enablement layer (makes Part L enforceable) — SUBSTANTIALLY BUILT:**
- **Element-manifest conformance linter** (`plugins/sgs-blocks/scripts/check-element-manifest-
  conformance.js`): per-block OK/GAP/ORPHAN + a states axis. **67 of 80 blocks manifested, 13
  skipped; resting-state defect class CLOSED.** GAP is a queryable catalogue, not a backlog.
- **Code-derived control classification** (`extract-signatures.py`, committed `20ea88fe`
  2026-07-21): each attribute now carries which CSS property it drives (`css_property`), on
  which **element / state / tier** — all derived from code, never names. Routing-determinism
  ambiguity is **0 in the data** (was 106). Two-layer override architecture
  (`attr-classification-overrides.json` applied after the derived layer).
- **`inspector_control_type` made edit.js-AUTHORITATIVE** and wired into `/sgs-update` (reseeds
  every run); **93 wrong control types corrected** (2 independent audits, 0 stored-correct;
  incl. the nested `MediaUpload>Button` trap). This is the machine signal Part B (control
  completeness) and Part L (per-block DoD) need: you can now query, per block, which control
  each attribute actually renders — the prerequisite for the Part-K structural gate.

**New findings that shape the approach (2026-07-21):**
- **`role` (value-type) and `css_property`+element/state/tier (delivery) are PERPENDICULAR
  axes**, not competing — a control's completeness needs BOTH (what the value IS + how it is
  delivered). `role` measured **~99% accurate** on its measurable overlap; do NOT replace it.
  (parking `P-ROLE-AND-CSSPROP-ARE-PERPENDICULAR-AXES`.)
- ~~Confirmed Part-B failure live in the wrapper: `sgs/container` band-width "custom"~~ **RESOLVED
  2026-07-23** — not reproduced (Playwright 20/20); already fixed at `d5416ae8`; Bean's report was a
  stale cached editor bundle. Parking entry archived (`memory/parking-archive.md`).

**Roadmap (Part J) — BUILD status: COMPLETE (2026-07-28, `07c67642` → `64f5080e`).** All three
waves shipped same day; the plan referenced in earlier revisions
(`~/.claude/plans/please-read-through-all-hashed-wreath.md`) executed in full:
- **Wave 1 (rollout) — DONE.** `SgsLinkControl` migrated across all raw-URL fields (card-grid
  item links, media 4-field, product-card 3 CTAs, trust-bar item links, brand-strip — `ac0c30eb`);
  raw-url-link WARNs 40→0 (2 reasoned config-URL exemptions remain, tagged EXC). `ShadowControl`
  rolled out (testimonial `shadowHover`, trust-bar `iconCircleShadow`/`badgeImageShadow` —
  `b9c5f6d1`). `templateLock:"contentOnly"` resolved as **PER-CLIENT OPT-IN ONLY** (D402 design
  gate, Part G table) — not a framework-pattern rollout; not a gap.
- **Wave 2 — DONE (`07c67642`).** `MediaGalleryPicker` extracted from `gallery/edit.js` (both
  call sites swapped). `imageControls` extended: FocalPointPicker `{x,y}`, object-fit via scoped
  var, image-size dropdown ruled **NOT-FORCIBLE at extension level** (no universal attachment ID —
  documented, not a gap). Whole-card link rebuilt as a **stretched-link overlay** (sibling overlay
  + aria-label + focus ring; nested-`<a>` impossible by construction — replaces the old
  whole-block-wrap risk; team-member + info-box dead `blockLink` attrs deleted,
  `.sgs-block-link-wrapper` now 0 occurrences repo-wide). ToolsPanel rollout: 23 panels converted
  across 19 blocks, 8 skip-reasoned in-code (mode wizards/repeaters/variant-gated — product-card
  ×3, card-grid, testimonial-rating, trustpilot-repeater, hero-image wizard). Shared
  `GradientOverlayControl` built (one `BackgroundPanel` covers container/cta-section/hero).
  Decorative-image toggle + button aria-label chain fixed.
- **Wave 3 (native-adopt) — DONE per the D402 per-support verdict table** (`ac0c30eb`, Part G):
  duotone + aspectRatio **ADOPTED native** on media/gallery (skip-serialised + scoped;
  `dimensions.aspectRatio` verdict evidenced from core source — core inlines unconditionally,
  hence skip-serialise); shadow/minHeight/sticky/gallery-lightbox **KEPT SGS** (deliberate, not a
  gap — SGS exceeds the native equivalent in each case).
- **Part K structural gate: PROMOTED fail-closed (`51ff7c27`).** `audit-inspector-conformance.js`
  gained `--check` mode (exits 1 on any non-exempt WARN; missing roster also fails) and is wired
  as the final prebuild step. Promotion condition was measured, not asserted: 0 WARN-severity
  findings after the Wave-1 link/shadow migrations. Negative-control proven live: an injected
  raw-url `TextControl` killed `npm run build` (exit 1) with remediation guidance, then reverted
  clean.
- **Per-device CONTENT cascade (D4) + canonical shared `resolveTier()` — BUILT (`b9c5f6d1`,
  T1.1, then `ac0c30eb`/`e4bd72ef`/`eb255f06`, T1.2–T1.4).** Canonical `resolveTier()` now exists
  in both runtimes (JS `src/utils/responsive.js`, PHP `sgs_resolve_tier()`), one shared 16-case
  golden fixture, 16/16 both runtimes; `resolveResponsiveTier` is now a thin alias (no fork).
  `ResponsiveTriStateControl` + `sgs_emit_tier_rules()`/`emitTierRules()` (single-writer scoped
  per-tier `@media` emission, 9/9 golden both runtimes) consume it. Spec 37 **FR-37-14** (behaviour
  tri-state) is built and live-proven on this exact mechanism — **Spec 37 Group B is UNBLOCKED**.
  `responsive-visibility.js`'s three independent flat booleans are **deliberately excluded** from
  this cascade (D400 scope amendment, Bean-ruled 2026-07-28 — general block visibility keeps its
  own per-device toggles; see Part D4 above). `sgs_resolve_tier_booleans()` (the old boolean-only
  PHP resolver) was **DELETED** — 0 consumers once the rows migrated onto the canonical resolver.

**Also outstanding across the board:** editor-CANVAS verification — everything to date verified
by frontend render + REST attribute registration, never by opening the block editor
(`ShadowControl` precedent: crashed on first live render despite 180 passing unit tests, R-31-13).
**OPEN (parked, none blocking Spec 35):** `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` (Track 2, not
this spec) · `P-NO-INLINE-GATE-COVERAGE-GAPS` (gate canary page for var-driven features; see the
Spec 32 amendment below) · `sgs-758` lifted-CSS MIME error (one-off, unchased) ·
`HeaderBehavioursTest.php` needs a composer/PHPUnit env to execute · Shrink+Hide legacy-transition
overlap on pre-animation-timeline browsers (documented, not speculatively fixed).

## Sources

developer.wordpress.org Block Editor Handbook (all component references + Block Design, Accessibility,
Block Supports, Block Bindings, Interactivity API, theme.json v3, Block Locking, Patterns, Format API);
WP Developer Blog (inspector sidebar groups, box-shadow, Block Bindings, Section Styles, per-block CSS,
content-only editing); make.wordpress.org/core (inspector tabs, WP 6.8 UI/a11y, Block Bindings, Block
Hooks); gutenberg.10up.com (Anatomy of a Block, ToolsPanel); Gutenberg PRs #50785/#76740/#56897/#51545/
#62852; Kadence/Spectra/GenerateBlocks/Stackable/GreenShift docs; Block Visibility plugin. Full URL list
in the six 2026-07-18 research transcripts.
```
