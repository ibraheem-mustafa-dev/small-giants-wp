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
- **A3. TARGET — SGS owns a three-tab bar (Content · Style · Advanced)** *(Bean-decided 2026-08-08)*.
  Kadence, Spectra and Stackable each ship their own tab bar rather than the native Settings/Styles
  split, and core has **no** semantic rule for that split anyway — verified in the Gutenberg source,
  the Styles tab is a hard-coded list of native block-support categories and Settings is simply the
  `default` group.
  ⛔ **Sequencing: the tab bar lands AFTER native-supports retirement**, or the client sees our three
  tabs plus core's Styles tab. **Interim state** (not the target, do not extend it): element panels in
  Settings, native supports in core's Styles tab, CSS-class/anchor in Advanced.
  ⛔ **A3 previously read "Behaviour/content → Settings; appearance → Styles".** That rule splits an
  element's appearance from the content it modifies; 8 blocks were sorted on it on 2026-08-08 and
  rejected. Full rule: `.claude/plans/spec-35-control-type-contract.md` §"THE PLACEMENT RULE".
- **A4. Element-first grouping** for composite blocks (panels by block PART, not property type) —
  **derived from `supports.sgs.elements`, never hand-sorted.** One element = one panel titled by its
  `label`, holding that element's content (`contentAttrs`) + style clusters + its states **inline
  beside each base value**. Hover is never its own panel. Unresolved element → the control does not
  move. Kadence, Spectra, Stackable, Otter and Essential Blocks all converge on this grouping
  independently. Canonical statement: contract §CO-2 + §"THE ELEMENT MANIFEST".
  ⛔ **TWO TIERS (Bean-locked, D537, 2026-08-09).** A4 is TIER 1 only. **TIER 2** governs WITHIN a
  panel, and for every control that scopes to no element: group by **property-family**
  (text/fill/layout/position/motion/animation — already defined in
  `scripts/consistency/cluster-member-sets.json`, not invented per-block), resolved via each
  element's declared `clusters` and honouring `appliesToLayers`. This **replaces** the earlier
  framing that block-root/no-element controls needed a single catch-all "block-level panel" still
  to be designed. A control that styles **nothing** (`variant`, `templateMode`, `tagName`, `layout`,
  `autoplay`, `showDots`, `required`) takes **one `Settings` panel, pinned first.** Full rule:
  `.claude/plans/spec-35-control-type-contract.md` §"THE PLACEMENT RULE".
- **A5. Progressive disclosure with `ToolsPanel`/`ToolsPanelItem`** once a panel hits ~6+ controls:
  optional controls behind the "+" menu, 1–3 `isShownByDefault`, `resetAll`. THE anti-clutter tool.
- **A6. Never duplicate a native `supports` panel** (inspector-UX form of R-31-9).
- **A7. Per-block universal-extension gating — TWO models (D551/D579, 2026-08-11).** Most
  extensions (`animation`, `clickEffects`, `parallax`) stay **opt-OUT**: universal unless a block
  declares `supports.sgs.hideExtensions: [...]`. `hover` and `blockLink` are **opt-IN**: attached to
  NO block unless it declares `supports.sgs.enabledExtensions: [...]` — flipped because their panel
  had a real targeting defect (painted the block root, not the element a client wanted), not merely
  because they were unused. Both declarative + read by `hide-extensions.js`
  (`isExtensionHidden()` / `isExtensionEnabled()`). Full reasoning: `decisions.md` D551 + D579.
- **A8. Panel order — OPEN, do not build a rule from this line** *(Bean, 2026-08-08)*. "Frequency-first,
  escape-hatches last + collapsed" is one candidate; "the element's declared `order`" (contract §THE
  PLACEMENT RULE) is another, and they do not agree. **CO-28's design gate still stands: Bean picks
  the canonical order.** Research 2026-08-08 found NO competitor centralises panel order — Kadence,
  Spectra, Stackable, Otter and Essential Blocks all use authoring order — so this is genuinely new
  ground rather than a solved problem to copy.
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

- **D5. Per-device MEDIA SOURCE (art direction) — the canonical pattern (added 2026-08-07, D521).**
  A client must be able to choose a different CROP per device wherever media appears, not only where
  the cloning pipeline wrote the values. Shipped across every media-bearing block; treat this as the
  standard for any NEW block with a media source.

  - **Attr shape:** `{base}` / `{base}Tablet` / `{base}Mobile`. An empty tier falls back UP
    (mobile → tablet → desktop), per D3. **Match the base attr's TYPE** — an object-typed base
    (`avatarMedia`, `thumbnail`) takes object-typed tiers, because WP silently coerces a flat value
    on an object-typed attr to its default and drops the whole thing.
  - **Control:** exactly ONE `<ResponsiveControl>`-wrapped picker, **gated on the base media
    existing**. A per-device override for media that is not there is a dead control.
  - **Alt text is NOT tiered.** A different crop of the same subject describes the same thing; a
    per-device alt is a second place for the description to drift.

  - **IMAGES tier by MARKUP.** Emit all tiers as sibling elements carrying a BEM tier modifier and
    toggle them with breakpoint rules in the block's own scoped `<style>`. Three `<img>`s cost
    nothing meaningful, it needs no JS, and the BEM modifier is the vocabulary the cloning pipeline
    reads — one convention on both ends is what makes a clone round-trip.
    - ⛔ Build tier selectors from the **BARE scope token**, never from a multi-member selector LIST:
      a descendant appended to a list binds to its LAST member only (this hid every image at every
      width on `sgs/media` before it was caught live).
    - ⛔ **Naked-mode blocks** (the media element IS the block root, e.g. `sgs/decorative-image`)
      have no ancestor to descend from: each tier sibling must carry the uid class ITSELF and the
      toggles are COMPOUND selectors (`.{uid}.{block}--mobile`), not descendant.
    - ⛔ Append tier CSS **before** the block assembles its `<style>` string. Appending it next to
      the element emit compiles cleanly and emits nothing (hit on `sgs/image-sequence`).

  - **VIDEO tiers by RUNTIME SWAP — deliberately NOT the markup pattern.** Three `<video>` elements
    each begin fetching and three embeds each load a player, so siblings are not free here. Use
    sgs/hero's established `data-src-desktop`/`-tablet`/`-mobile` contract and swap in `view.js`.
    The DESKTOP source still renders as real server markup so a no-JS visitor gets a working video.
    Bean accepted the cost for embeds (D521): crossing a breakpoint mid-watch rebuilds the iframe
    and loses playback position, so the swap fires ONLY when the resolved source actually differs.
    - ⛔ **Any node the swap REBUILDS must carry the tier `data-*` forward**, or the swap is
      one-way and can never return — it will look correct in the one direction anyone tests first.

  - **Verification bar:** computed visibility (or, for video, an ADVANCING `currentTime`) at FIRST
    PAINT per width — viewport set, then a fresh navigation, never a resize-after-load. Markup
    presence scores a false pass. Assert on the MEASURED `window.innerWidth`, not the requested
    viewport size; a requested 800px measured 727px and would have tested mobile while labelled
    tablet. Include a positive control: prove the effect CAN fire in that browser, or "nothing
    happened" is indistinguishable from a dead feature.

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

> ⛔ **THIS LIST IS THE CORE-COMPONENT REFERENCE, NOT THE CANONICAL CONTROL SET. Where it names a raw
> core component that SGS has since wrapped, the wrapper wins — and two of them are enforced by live
> build gates.** Corrected 2026-08-09 after the conflict was measured.
>
> | Job | Part H named | **Canonical (governing)** | What the gate ACTUALLY catches |
> |---|---|---|---|
> | colour | `ColorPalette` / `ColorGradientControl` | **`DesignTokenPicker`** (contract §1) | rule `04-colour-alpha` (`gate`) flags a raw colour picker **only when `enableAlpha` is absent** (`rules/04-colour-alpha.js:92`). `<ColorPalette enableAlpha>` passes clean |
> | link / CTA | `LinkControl` | **`SgsLinkControl`** (contract §2) | **nothing.** Rule `08-raw-url-link` matches `<TextControl type="url">` only (`rules/08-raw-url-link.js:99-101`) — it has no knowledge of `LinkControl` |
>
> ⛔ **Neither raw component is gated out of a block's `edit.js`.** An earlier draft of this box
> claimed "writing either raw component fails `prebuild`" — **false, and verified false by reading
> both rule bodies**. The contract's ban is a *contract*, not an enforced one; closing that gap is
> real outstanding work, not a documentation fix. Do not treat a green build as evidence of
> conformance here.
>
> Governing document: `.claude/plans/spec-35-control-type-contract.md` (AUTHORITATIVE 2026-08-08),
> which lists both raw components as **banned lookalikes**. **PART I of this same spec already
> records `DesignTokenPicker` and `SgsLinkControl` as BUILT + ROLLED OUT** — Part H was simply never
> swept when they landed, so the spec contradicted itself. Measured in `src/` at `a09226e8`: raw
> `<ColorPalette>` and `<LinkControl>` are rendered in exactly two files,
> `src/components/DesignTokenPicker.js:87` and `src/components/SgsLinkControl.js:154` — i.e. only
> *inside* the canonical wrappers. (Repo-wide they also appear in `scripts/inspector-scan/fixtures/**`
> and in `rules/04-colour-alpha.js`'s own matcher list, which is expected.)
>
> ⚠ **Part H is not the only place in this spec naming the raw components** — `:90`, `:101`, `:102`,
> `:249`, `:283`, `:356`, `:376`, `:384` still list `LinkControl`. The sweep is owed; correcting Part
> H alone relocated the contradiction rather than removing it.
>
> ⚠ The other ~23 assignments below are **not yet reconciled against the contract**. `BorderBoxControl`
> agrees with contract §14. Treat the rest as indicative until swept.

Numeric+unit → `UnitControl` · bounded numeric → `RangeControl` (+input+reset) · 4-side box →
`BoxControl` · colour → **`DesignTokenPicker`** (wraps `ColorPalette`; `enableAlpha`+`clearable`
default true) · gradient → `GradientPicker` · angle/direction → `AnglePickerControl` · border →
`BorderBoxControl` · radius →
`__experimentalBorderRadiusControl` · spacing token → `__experimentalSpacingSizesControl` · segmented
choice → `ToggleGroupControl` · long/searchable list → `ComboboxControl` · multi-value tags →
`FormTokenField` · link/CTA → **`SgsLinkControl`** (wraps `LinkControl`) · font size → `FontSizePicker` · weight+style →
`FontAppearanceControl` · line-height → `LineHeightControl` · focal point → `FocalPointPicker` ·
**object-position → `FocalPointPicker`** (same component; responsive tiers required — added
2026-08-11, previously absent despite Parts B and C both listing object-fit/position as table
stakes) · **object-fit → `SelectControl`** (closed enum: cover/contain/fill/none/scale-down) ·
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
| Extension gating | `hideExtensions` (opt-out, most extensions) + `enabledExtensions` (opt-in, hover/blockLink only, D579 2026-08-11) EXIST | — |
| **Shadow builder** | `ShadowControl` **BUILT + ROLLED OUT** (X/Y/blur/spread/colour+alpha/inset + theme presets; `src/components/ShadowControl.js`) — consumers now incl. testimonial `shadowHover`, trust-bar `iconCircleShadow`/`badgeImageShadow` (`b9c5f6d1`, 2026-07-28) | DONE (Wave 1) |
| **Link/CTA** | `SgsLinkControl` **BUILT + ROLLED OUT** (`src/components/SgsLinkControl.js`) — card-grid, media (4 fields), product-card (3 CTAs), trust-bar item links migrated (`ac0c30eb`, 2026-07-28); raw-url-link WARNs 40→0 (2 reasoned EXC exemptions remain) | DONE (Wave 1) |
| **Bulk media/gallery** | **BUILT** — `MediaGalleryPicker` extracted from `gallery/edit.js`, both call sites swapped (`07c67642`, 2026-07-28) | DONE (Wave 2) |
| **Focal point / image size / aspect-ratio** | ⛔ **NOT DONE — corrected 2026-08-11. This row read "BUILT … DONE (Wave 2)" and was FALSE.** The control is BUILT and attaches to all 15 blocks declaring `supports.sgs.imageControls: true`, but it **functionally reaches 2 of them**. The extension injects `sgs-has-image-controls` on the block ROOT and the CSS then guesses where the image is (`> img`, `figure > img`) — so it only matches when the image happens to sit in one of those positions. `decorative-image` matches **nothing** (its root IS the `<img>`, so the class lands on the element itself); `info-box` declares the capability with **no media surface at all**. The client drags a crosshair and nothing happens: no error, no warning. ⚠ The "NOT-FORCIBLE at extension level" note applied only to the *size dropdown*, on data-availability grounds — the deeper limit is DOM-shape inference, which defeats focal-point and object-fit too. **Governing fix + the routing rule that prevents a repeat: `plans/spec-35-capability-routing-doctrine.md`.** Original claim: (`07c67642`) | ⛔ **REOPENED (Wave 2 claim withdrawn)** |
| **Gradient / bg overlay** | **BUILT** — `GradientOverlayControl`, one shared `BackgroundPanel` covers container/cta-section/hero (`07c67642`) | DONE (Wave 2) |
| **Spacing token control** | raw units | still open — not part of the 2026-07-28 waves; not gated by Part K |
| ToolsPanel disclosure | **BUILT + ROLLED OUT** — 23 panels converted across 19 blocks, 8 skip-reasoned in-code (`07c67642`+`f5fac495`) | DONE (Wave 2) |
| **Client-safe editing** | `templateLock:"contentOnly"` resolved **PER-CLIENT OPT-IN ONLY** (D402 design gate, Part G) | Not a framework rollout — deliberate, not a gap |
| **Dynamic content** | check for bespoke | still open — not part of the 2026-07-28 waves |
| **Reduced-motion gate** | verify on animation ext | **RESOLVED 2026-07-30 — the "gap" was a measurement bug, not missing gates.** A DB roster regeneration briefly flagged 18 blocks (14× `form-field-*`, `form-review`, `form-step`, `accordion-item`, `tab`) as lacking `prefers-reduced-motion`. All 18 were FALSE POSITIVES: `build-roster.py` substring-matched `"animation"` against the raw `supports.sgs` JSON, so `hideExtensions:["animation"]` — an opt-**OUT** list — was read as *having* animation. None of the 18 even has a `style.css`. Fixed by stripping `hideExtensions` before matching (`animation` 36→18; gate PASS; the 18 retained are the genuinely-animating blocks, all passing). **A genuine framework-wide gate already covers every block:** `theme/sgs-theme/assets/css/core-blocks-critical.css:69-78` (`*`/`*::before`/`*::after` + `!important`), enqueued unconditionally (`functions.php:233`) — it explicitly "replaces piecemeal per-block reduced-motion rules". **RESOLVED 2026-08-01: rule 5 now sees the global gate.** ⚠ The mechanism described below LIVES ON, but it moved: `audit-inspector-conformance.js` was retired 2026-08-06 (Task D, `4e07ab6c`) and this detector now sits in `plugins/sgs-blocks/scripts/inspector-scan/rules/17-reduced-motion-gate.js`, which additionally resolves the theme directory via `ctx.themeDir` rather than a hardcoded path (so a fixture can simulate "global gate absent"). Historically, `audit-inspector-conformance.js` gained `findUnconditionallyEnqueuedThemeCssPaths()` + `cssHasUniversalReducedMotionGate()`: it reads `theme/sgs-theme/functions.php` live each run, follows the `add_action( 'wp_enqueue_scripts', ... )` hook to the enqueuing function, keeps only `wp_enqueue_style()` calls at brace-depth 0 (genuinely unconditional, not inside an `if`/`foreach`), resolves each enqueued CSS file, and checks it for a `@media (prefers-reduced-motion: reduce)` block that targets `*, *::before, *::after` with `!important`. A block whose own `style.css`/`view.js` has no `prefers-reduced-motion` string is no longer flagged when that live-detected global gate is present. Nothing is hardcoded as "the gate exists" — if the CSS rule or its unconditional enqueue is ever removed, the detector returns false on its next read and rule 5 goes back to flagging every genuinely-ungated animating block (proven via a negative-control run against a temporarily gate-blinded copy of the theme files, then confirmed byte-identical via md5 after restore). |
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

## PART M — Implementation status (living; updated 2026-08-11)

> ### Flat-to-object migration — COMPLETE 2026-08-11 (D580)
>
> `gap` (D563, `fa638cea`+`0cd1c314`), `maxWidth`+`contentWidth` (D568), `gridTemplateColumns`+
> `gridTemplateRows` (D569/D570), `columns` (D578) — all four properties that route through
> `class-sgs-container-wrapper.php`. ⛔ **"Passes 5-6 = font-size families + long tail" was FALSE**
> — every font-size family was already object-shaped, verified directly against `block.json`. The
> real remaining work turned out to be a 5th SHAPE this migration's tooling didn't classify
> correctly — 4 BOX-per-tier properties (`contentBandPadding` [7 blocks, shared wrapper],
> `contentPadding`, `pillPadding`, `padding`) — closed same-session (D580). Per-block evidence in
> `reports/visual-diff/*-2026-08-11.md`. Post-close survey re-run found exactly 1 unrelated
> residual (`sgs/team-member.photo`, a media art-direction tier — different shape, not scheduled).
> Full detail: `.claude/LEDGER.md` + `decisions.md` D580. Do not duplicate that content here.
>
> **One rule from that pass is a STANDARD-level rule and belongs in this document, not only in the
> plans:** a responsive family's **control primitive must match its STORAGE SHAPE**, and the two
> change together in one commit — `ResponsiveControl` for flat sibling attrs, `ResponsiveOverride`
> for an object-typed base. Governing text with the measured incident:
> `plans/spec-35-control-type-contract.md` §12 field 3.
>
> **Why it earned a place here:** the mismatch is silent and destructive in both directions.
> WordPress discards an attribute a block no longer declares, and coerces a flat value on an
> object-typed attr to its default. Migrating `gap`'s storage without its control left **19 of 21
> blocks with an inspector that deleted the setting when used** — through a green build, every static
> gate, and a deploy. **Only opening the editor finds this class**, which is the same conclusion D567
> reached independently the same day from the other track.

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
gate already covers every block (see Part I). Its residual — the audit rule couldn't SEE that
global gate — was itself closed 2026-08-01: rule 5 now detects the gate live by reading
`theme/sgs-theme/functions.php` + its enqueued CSS each run (see Part I "Reduced-motion gate" row
for the mechanism), so it no longer false-flags a block that genuinely relies on the global rule.
Neither of the two genuinely-open items blocks the Part-K structural gate or the shipped
component layer.**

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

⛔ **PARTIALLY WITHDRAWN 2026-08-11 — see Part I's focal-point row.** "COMPLETE" holds for
`MediaGalleryPicker`, `ShadowControl` and `SgsLinkControl` (all three verified in live use). It does
**NOT** hold for the `imageControls` extension: built and attached, but functionally reaching 2 of
the 15 blocks that declare it. Built ≠ reaching. See `plans/spec-35-capability-routing-doctrine.md`.

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
- **Part K structural gate: PROMOTED fail-closed (`51ff7c27`); the gate was REPLACED by
  `plugins/sgs-blocks/scripts/inspector-scan/run.js` on 2026-08-06 (Task D, `4e07ab6c`) and the old script deleted.**
  `audit-inspector-conformance.js`
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

**2026-08-09 (D537–D540) — THE PLACEMENT RULE itself changed shape; several rows above are now
superseded, not merely extended.** Full text: `decisions.md` D537–D540; canonical rule text: A3/A4
above + `.claude/plans/spec-35-control-type-contract.md` §THE PLACEMENT RULE.
- **A4's "block-level panel" is retired.** Every root-scoped control now resolves to a TIER 2
  property-family panel via `cluster-member-sets.json`, not a catch-all — see A4 above. The Task 3
  vocabulary gap this exposed (background-media + shape-divider families had no cluster member to
  resolve to) is now closed: `check-cluster-coverage.py`'s typo guard was widened to validate
  member keys against every registry row (not just `css:*`/`anim:*`), gaining a 7-case
  `--self-test` in the same change (`ab9cb5c7`).
- **A new advisory gate, rule 22 (`inspector-scan/rules/22-placement-rule-surfaces.js` +
  `placement-rule-surfaces.json`), asserts every doc surface stating the placement rule states the
  CURRENT one** (`dc332ba1`). Re-run: `node plugins/sgs-blocks/scripts/inspector-scan/run.js` —
  currently **0 flagged, 0 baselined** (re-derived 2026-08-09).
- **Measured, library-wide** (`python plugins/sgs-blocks/scripts/placement-reach.py`, re-derived
  2026-08-09): element-scoped 1,702/2,595 (65.6%), tier-2 893/2,595 (34.4%); `sgs/hero`'s tier-2
  count closed 61 → 30. Contested placements (the tie-break-instead-of-report defect the earlier
  46.1% figure hid) are **0 library-wide** — the last 9 were all `sgs/nav-menu`, resolved by its
  wrapper exit below. `inspector-scan` rule 21 (`render-without-control`) fell 243 → 130 in the
  same work (re-derived: `node plugins/sgs-blocks/scripts/inspector-scan/run.js`, at the time
  **130 flagged, 12 baselined**). ⛔ **RE-MEASURED 2026-08-09 at `a09226e8`: 129 flagged, 12
  baselined.** 130 was correct when written; `0fb1507d` (the `sgs/physics-canvas` `tagName` wiring)
  cleared its last finding. ⚠ Count `status:"FLAGGED"` — `core/report.js:96-101` puts BASELINED
  entries in the `--json` array too, so a raw array length reads 141.
- **The composite-mirror rule (root `CLAUDE.md` §"Composite-mirror rule") gained a fourth,
  measured exit condition (D538/D539): a block whose wrapper contributes ZERO live arrangement CSS
  to its own children may exit `SGS_Container_Wrapper` and render block-private — this is
  DIFFERENT from D294's KIND-based test and stands on its own measured evidence, not on D294's
  authority.** `sgs/nav-menu` exited on this test (24 of ~107 wrapper keys declared, 3 reachable,
  wrapper contributed no live CSS) — attrs 77 → 57, `render-without-control` findings for this
  block 17 → 0, contested placements 9 → 0. Two live bugs fixed in the same change: the "item gap"
  control moved from the wrapper root (where its flex sibling had already been `display:none`d,
  so it painted nothing) to `.sgs-nav-menu__bar`; the accessible name's double-`esc_attr()` was
  fixed to single. `sgs/site-header-row`/`sgs/site-footer-row` took the OPPOSITE fix — they KEEP
  the wrapper and had their ~7 real missing controls wired, because `responsive_model=>'object'`
  forces their InnerBlocks to be direct children of the element the wrapper's arrangement CSS
  targets (genuine containers, not specialised). `sgs/physics-canvas` SPLIT: ~18 box/width attrs
  were a real gap (`minHeight` had no control at all) and are now wired; ~61 were inert or
  colliding with a hardcoded selector in `style.css` and were deleted.
- **`contentWidth` is now a NAMED contract (D540): it may exist only on a block that renders a
  genuine inner band.** Five block-private composites (`quote`, `testimonial`, `notice-banner`,
  `team-member`, `product-faq`) were emitting `max-width` (from `maxWidth`) AND `width` (from
  `contentWidth`) on the SAME root selector — two competing widths under one name promising a
  second layer that did not exist. `contentWidth` was deleted from all five; `sgs/nav-menu` also
  lost `maxWidth` (redundant with its parent row's own width control, wired above).
- **The gate IS now built (2026-08-10): `inspector-scan` rule 23
  (`23-content-width-needs-inner-band.js`, ADVISORY).** Building it falsified D540's own census,
  which had grouped 33 blocks on "routes through `SGS_Container_Wrapper`" without reading each
  render path. Three more blocks were carrying the drift: `product-card` (suppresses the band
  unconditionally via `wrap_inner => false` and reads the attr nowhere — inert control, DELETED) and
  `info-box` + `option-picker` (never wrapper-routed at all; they dropped it under D294 and the
  census matched their COMMENTS saying so — both RENAMED `contentWidth` → `width`, behaviour
  identical, 6 canary rows migrated). `sgs/hero` split does NOT flag: it suppresses the `__inner`
  div but bands the content with centred `padding-inline` on the grid, which is a real band and the
  right mechanism for a grid item (Bean-ruled 2026-08-10). Re-run:
  `node plugins/sgs-blocks/scripts/inspector-scan/run.js` — currently **0 flagged**. Full record:
  `decisions.md` D540 §"CLOSED + CORRECTED 2026-08-10".

**2026-08-10 (session 2) — the shared wrapper became generically responsive; the tier axis is now
universal, not per-block.** Full amendment (the two-axis model, the six-row prop_map, the Stage-2
custom-property split, the four measurement controls): **`plans/spec-35-control-type-contract.md`
§12 (THE RESPONSIVE WRAPPER FAMILY)** — do not duplicate that text here, it drifts. Summary only:
- `inspector-scan` gained **rule 26** (a new detector; see the rule file for its exact contract) and
  `sgs_emit_responsive_css()`'s `WidthPanel` had its two duplicate "… by viewport" controls merged
  into the shared tier mechanism.
- The unreachable min-height panel was deleted (0 mount sites passed `'section'`, per D550).
- Dead image-control CSS was un-gated (per-property hover gating now applies).
- `sgs/gallery` migrated to the FR-37-16 object model — see its Block Build Status row in
  `plugins/sgs-blocks/CLAUDE.md`; `ResponsiveSpacingPanel` is now DELETED (D548).
- `sgs/hero`'s three mobile-only orphan attrs were promoted to full responsive triples.
- **The shared wrapper itself is now fully responsive (D549)**: 14 properties are tier-capable — 6
  shipped as data-driven `prop_map` rows (layout set), 8 named as Stage 2 (the `gridItem*` custom-
  property set plus `shadow`/`contentBandBackground`, STILL OPEN per D549's STOP-29 flag — do not
  treat these as shipped).
- A live `max-width:Array` bug in `sgs_responsive_normalise_object()` was fixed (an un-normalised
  object leaking into a scalar-only code path).

## PART N — Role data layer + enforcement rules for Task F (added 2026-08-06)

**Why this Part exists.** Parts A–L specify the CONTROL SURFACE. This Part specifies the DATA
LAYER underneath it — the `role` on every `block_attributes` row, which says what the value IS.
The two are perpendicular and both are needed: `role` (what the value is) + `css_property`/element/
state/tier (how it is delivered). A control cannot be judged complete without both.

⛔ **NO CACHED COUNTS IN THIS PART.** Every number below names the command that regenerates it.
This is not pedantry: the live status doc carried "pool 69 / D4-review 20 / report-only 13" into a
session where the true figures were 23 / 10 / 5, and four separate task descriptions were written
against the stale ones. Read the number, do not quote this file's memory of it.

```
cd plugins/sgs-blocks/scripts/content-role-detect && python fingerprint_content_roles.py
```

**Pool reached 0 on 2026-08-06 (Spec 35 "Track 1b").** Every role in the pool was assigned BY
MECHANISM — hand-assignment stayed banned throughout (D497). `ASSIGNABLE 0` at `pool=0` is now the
TERMINAL STEADY STATE for this data layer: a future non-zero reading is a regression (a new
attribute landed unrouted), not a backlog to clear by hand. The command above still regenerates
the true figure every time — the "never cache a count" discipline does not relax just because the
count is currently zero; it is exactly the number a stale cache would get wrong first.

### N.1 — The mechanism map (what may LEGALLY seed each role)

Hand-assigning a role is BANNED (D497). A role may be written only by the mechanism that owns it:

| Role | The ONLY legal route |
|---|---|
| `technical` | A Detector-1 VETO — D1 walked EVERY usage site and found none content-bearing. Qualifying verdicts are `NOT-content` **or `value-fragment`**; `value-fragment` has never been a disqualifier |
| `styling` | A non-NULL `css_property`, OR a wrapper-only consumer (TIER 2.4) |
| `color` | A proven paint site (D7 / TIER 3.15) |
| `enum-mode` | TIER 3.5 reading `enum_values`, which `/sgs-update` Stage 1 fills from block.json `enum` |
| `link-content` | TIER 3.45 reading `output_signature.link_template` with EXACTLY ONE `{value}` |
| `layout` and other families | `property_suffixes` provisioning, or D6's per-key native-support map |
| `image-alt` | `alt_companion_attr`, declared per row — never name-guessed |
| `icon-*` family | TIER 3.16 (correction pass), guarded `role NOT LIKE 'icon-%'` so it only ever
  fixes a wrongly-classified icon-source attr — it cannot invent a new icon-* row |
| `technical` (second route) | The token-sanitiser veto (D1) — a value passed through
  `sanitize_key()` / `sanitize_html_class()` / `wp_validate_redirect()` before use, which proves it
  is a machine token regardless of what a naive content read would suggest |
| `a11y-text` | D-series accessibility-text detection — routed alongside the other content roles,
  never hand-assigned |

**Detector inventory** (`plugins/sgs-blocks/scripts/content-role-detect/`). D1/D3 are trusted alone;
D2 reports and never assigns (66% precise); D8 reports a SCHEMA gap, never a role.

### N.2 — Rules Task F must enforce (each earned by a live defect)

- **N-1. "Referenced" is not "used".** An attribute read into a variable that is then never used
  passes every consumption check that greps for the attribute NAME. `sgs/form.formName` shipped a
  live editor control and two variations seeding translatable copy while rendering NOTHING, and
  `check-dead-controls.js` reported `OK — 0 net-new dead controls`. **CHECK 5 (dead assignment)
  now covers this; 18 findings on first run.** A control that needs code to mean anything is not
  done (Part B).
- **N-2. A built mechanism is not a reached one.** The `link-content` role, its extractor and its
  reader were all built, tested and threaded — and the whole chain was INERT because nothing
  assigned the role and the writer was never invoked (`/sgs-update` runs `extract-signatures
  --task-b-only`). A built-but-unreachable mechanism reads exactly like a missing one. Gate on the
  OBSERVED end state, never on the code existing.
- **N-3. A detector's negative result describes the detector.** Three separate tasks were blocked
  by one gap — a detector that will not cross a function boundary. D4's own comment names it; D7
  is single-file; D1's symbol table is file-scoped. Before recording "no evidence", establish
  whether the evidence is merely unreachable.
- **N-4. Declare the expected population BEFORE the run.** A number below expectation is a claim
  requiring evidence. A number ABOVE it needs per-row justification, not a silent accept.
- **N-5. A zero from a search you wrote requires a positive control.** A dead-assignment probe
  returned "0 findings" and was wholly vacuous — a broken regex, not a clean codebase. It became
  trustworthy only once proven to CATCH a known-bad row.
- **N-6. Negative controls should be REAL ROWS, not fixtures, wherever one exists.** The fragment
  rule's controls are `sgs/whatsapp-cta.phoneNumber` and `sgs/counter.prefix`; the colour-upgrade
  sweep's is `gridItemBorder`. A real row cannot drift away from the thing it guards.
- **N-7. A guard whose safety is INCIDENTAL is not a guard.** `gridItemBorder` survives D7 only
  because D7 cannot reach the file it is painted in — its documented "it is a shorthand" reasoning
  has never actually been exercised. Prefer a shape where the guard holds BY CONSTRUCTION.
- **N-8. The visual-diff gate applies to a block.json `enum` declaration.** Adding an `enum` can
  change render: WP coerces an out-of-enum stored value back to the default. Never fabricate
  `first_paint_capture_passed` to clear it.
- **N-9. A gate can be DATE-keyed instead of CHANGE-keyed.** The visual-diff gate is satisfied by
  `reports/visual-diff/<block>-<DATE>.md` carrying `verdict: PASS`. A concurrent track's same-day
  report for a DIFFERENT change to the same block would satisfy it for yours too. Evidence must
  bind to the diff it is meant to certify, not merely to the block and the date.
- **N-10. A dead ASSIGNMENT is dead CODE, not automatically a dead CONTROL.** CHECK 5 (N-1) returned
  18 findings; triage showed 13 were unused local variables whose FEATURE STILL WORKS (the shared
  helper reads the raw `$attributes` directly, bypassing the dead local), 2 were abandoned attrs,
  and only 3 were genuine dead controls. The raw count was misread by its own author within
  minutes of the run. A severity split is owed before any finding is treated as a defect count.
- **N-11. A conservative gate refusing a provably-safe change is CORRECT, not a blocker to work
  around.** `check-markup-neutral.py` refuses ANY deletion of a non-comment line, so even a
  provably-dead variable deletion still needs real visual verification before it lands. Do not
  weaken a gate to land your own commit faster.

### N.3 — Enforcement status

**Governed by the CONTROL-TYPE CONTRACT (`.claude/plans/spec-35-control-type-contract.md`) since
2026-08-08, D522/D523.** The 27-condition DONE checklist it replaced is a tombstone; every one of its
30 items is ABSORBED into a control-type contract or CARRIED into that document's §CARRIED
OBLIGATIONS, proven by its ABSORPTION MAP. ⚠ **The former "0 of 24 end conditions" figure carried
here was dead and has been removed** — it was one of the doc claims the 2026-08-07 council flagged as
asserting more than the gates proved.

The bar for "enforced" is `STOP-CATALOGUE.md` §E6 (10 points) — **"has a script" is not the bar**,
and neither is "the gate reads green": a gate keyed to a component NAME has a blind spot by
construction, which is why the contract requires each rule to enumerate its banned lookalikes.
⛔ Task F builds no enforcement for a rule scoped against `block_capabilities` or icon `role` until
those two Tier 0 columns are corrected.

## Sources

developer.wordpress.org Block Editor Handbook (all component references + Block Design, Accessibility,
Block Supports, Block Bindings, Interactivity API, theme.json v3, Block Locking, Patterns, Format API);
WP Developer Blog (inspector sidebar groups, box-shadow, Block Bindings, Section Styles, per-block CSS,
content-only editing); make.wordpress.org/core (inspector tabs, WP 6.8 UI/a11y, Block Bindings, Block
Hooks); gutenberg.10up.com (Anatomy of a Block, ToolsPanel); Gutenberg PRs #50785/#76740/#56897/#51545/
#62852; Kadence/Spectra/GenerateBlocks/Stackable/GreenShift docs; Block Visibility plugin. Full URL list
in the six 2026-07-18 research transcripts.
```
