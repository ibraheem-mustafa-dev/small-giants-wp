---
doc_type: report
title: Responsive-control defect taxonomy — root causes, variations, detector rules
date: 2026-08-03
scope: plugins/sgs-blocks/src (84 block dirs), shared components, converter, framework DB
status: READ-ONLY analysis — no file was edited to produce this
---

# Responsive-control defect taxonomy (Spec 35 scanner input)

Bean reported eight defect variations by hand-inspecting the editor. This report proves
the root cause of each, enumerates **15 distinct variations** across the roster, and gives
an implementable detector rule per variation.

**Denominator used throughout:** 84 directories under `plugins/sgs-blocks/src/blocks/`
(minus `extensions/`), of which **42 blocks declare 173 responsive attribute families**
(a family = an attr `X` with `XTablet` and/or `XMobile` declared alongside it).
Counted by direct enumeration of every `block.json`, not inherited from prose.

---

## 0. The responsive system as it actually exists

There are **six** distinct implementations of "edit a value per device tier", not one.

| # | Implementation | File | State source | Storage model | Call sites |
|---|---|---|---|---|---|
| 1 | `ResponsiveControl` | `src/components/ResponsiveControl.js:97` | **WP-native** `core/editor` `getDeviceType()`/`setDeviceType()` (`:107-121`), local `useState` fallback (`:116`) | caller's choice — flat siblings *or* tier object | **59** |
| 2 | `ResponsiveOverride` | `src/components/ResponsiveOverride.js:48` | **local** `useState('desktop')` (`:49`) — never touches `core/editor` | `{desktop,tablet,mobile}` object | 9 |
| 3 | `ResponsiveTriStateControl` | `src/components/ResponsiveTriStateControl.js` | **local** `useState` | tri-state enum `'inherit'\|'on'\|'off'` | 2 blocks |
| 4 | `ResponsiveBoxControl` / `ResponsiveBorderRadiusControl` | `src/components/ResponsiveBoxControl.js:130,184` | delegates to #1 | `{base,tablet,mobile}` — note **`base`**, not `desktop` | several |
| 5 | `ResponsiveBoxControls` (plural) | `src/components/ResponsiveBoxControls.js` | delegates to #2 | `{desktop,tablet,mobile}` object | 2 blocks |
| 6 | Ad-hoc per-device sibling controls (no switcher at all) | e.g. `ContainerWrapperControls.js:670,699,725` | none | flat siblings | 5 blocks |

`DeviceTabs` (`src/components/DeviceTabs.js`) is the shared *presentational* tab shell used
by #1, #2 and #3 — it owns no state, so it cannot unify them.

**Two competing storage models coexist for the same semantic property.**
`maxWidth` is a `string` with `maxWidthTablet`/`maxWidthMobile` siblings on 42 blocks, and
an `object` `{desktop,tablet,mobile}` on `sgs/site-header-row` / `sgs/site-footer-row`
(`src/blocks/site-header-row/block.json`), switched server-side by
`'responsive_model' => 'object'` (`src/blocks/site-header-row/render.php:222`) reaching
`includes/class-sgs-container-wrapper.php:132`. Blocks with explicit tier-object defaults:
`sgs/mega-aside`, `sgs/mega-panel`, `sgs/nav-drawer`, `sgs/site-footer-row`,
`sgs/site-header-row` (5 blocks, ~9 attrs) — everything else is flat siblings.

**Prior art in the guards.** `scripts/check-control-ux.js` already detects
`RESPONSIVE-FAMILY-WITHOUT-SWITCHER` (a tier attr written by a block's own `setAttributes`
with no `ResponsiveControl` wrapper and no shared-component delegation). Its baseline
(`scripts/control-ux-baseline.json`) is **empty** and the guard currently reports
"No net-new control-UX violations" — i.e. **every defect below is invisible to the guard
that was built to catch this class**. Its documented blind spots (dynamic key
construction; the `tablet: 'xTablet'` breakpoint-map exemption at `:285-290`) are exactly
the shapes the real defects take.

---

## R1 — Responsive toggles carry a control NAME

**Root cause: shared component.** `ResponsiveControl` takes a `label` prop and renders it
as a header row *beside the device tabs*:

```
src/components/ResponsiveControl.js:151-169
  <div className="sgs-responsive-control">
    <div className="sgs-responsive-control__header">
      { label && <span className="sgs-responsive-control__label">{ label }</span> }
      <DeviceTabs … ariaLabel={ sprintf( '%s — device', label ) } />
```

Because the API *requires* a label to build the tablist `aria-label` (`:163-167`), every
call site passes one. `ResponsiveOverride.js:81-83` does the identical thing.

**Signature.** `<ResponsiveControl label={…}>` — the wrapper owns a visible label.
**Scale.** 59 of 59 `ResponsiveControl` call sites; 9 of 9 `ResponsiveOverride` call sites.
**Examples.** `src/components/TypographyControls.js:354`; `src/blocks/button/edit.js:491`;
`src/blocks/multi-button/edit.js:232`.

**Detector rule `RESP-LABELLED-SWITCHER`.** AST: any JSXElement named
`ResponsiveControl`/`ResponsiveOverride` with a `label` attribute → finding.
**False-positive risk:** none for detection; the rule is a *migration inventory*, not a
bug list — under the sticky-switcher model every one of these becomes a plain control.

**Compliant sub-idiom worth preserving:** most call sites already pass
`hideLabelFromVision` on the *inner* control so the name is not printed twice
(`TypographyControls.js:357-358`, `nav-drawer/edit.js:210-211`,
`responsive-logo/edit.js:415-416`, `mega-panel/edit.js:269-270`). When the wrapper is
deleted, that `hideLabelFromVision` must be removed in the same edit or the control loses
its name entirely.

---

## R2 — Toggles are oversized and clunky

**Root cause: shared component + a total absence of stylesheet.** Two independent proofs.

1. **No CSS exists.** Grepping the entire plugin (excluding `node_modules`/`build`) for
   `sgs-responsive-control`, `sgs-device-tabs`, `sgs-responsive-override` returns only
   three files — `DeviceTabs.js`, `ResponsiveControl.js`, `ResponsiveOverride.js`. There
   is no rule anywhere for `.sgs-responsive-control__header`, so the header `<div>`
   (`ResponsiveControl.js:152`) is a default block box: the `<span>` label renders on one
   line and the tablist `<div>` (which sets its own `display:flex`, `DeviceTabs.js:70`)
   wraps onto a second. Every responsive control therefore costs **two rows of chrome
   before the input**.
2. **Hard-coded 44px targets, inline.** `DeviceTabs.js:86` sets
   `style={{ minWidth: '44px', minHeight: '44px' }}` on each of three `Button`s. That is
   the FR-37-29 / WCAG-2.2 requirement working as designed — 132px + gaps of tab strip,
   44px tall, inside a ~248-280px inspector column.

`sgs-inspector-help` (used for the desktop signpost paragraphs, below) likewise has **no
CSS rule anywhere** — only the four JSX usages in `ContainerWrapperControls.js`.

**Signature.** A `className` minted in a shared inspector component with zero matching
selector in any `.css`/`.scss`/PHP-emitted stylesheet.
**Scale.** 4 orphan class names (`sgs-responsive-control`, `…__header`, `…__label`,
`sgs-inspector-help`) + the `sgs-responsive-override*` family + `sgs-device-tabs`.
**Detector rule `RESP-ORPHAN-INSPECTOR-CLASS`.** Collect every string literal assigned to
`className` under `src/components/**` and `src/blocks/*/components/**`; assert each has ≥1
selector match across `src/**/*.css`, `assets/css/**`, and PHP `wp_add_inline_style` bodies.
**False-positive risk:** medium — WP core supplies rules for `components-*` class names, so
the rule must be scoped to the `sgs-` prefix only.

**Migration note:** the 44px is not the bug. Three 44px targets in a 260px column is only
clunky when repeated per control. One sticky switcher at 3×44px is the correct spend.

---

## R3 — A plain control and a toggle-enabled control of the same setting coexist

**Root cause: per-block edit.js.** This is one recurring authored pattern I will call the
**split-desktop pattern**: the desktop value keeps its original plain control, and a
*second* `ResponsiveControl` is bolted on underneath solely to reach tablet/mobile.
Not a shared-component defect — the shared component is capable of owning all three tiers
(and does, in ~50 other call sites).

**Confirmed instances (5).**

| # | Setting | Plain desktop control | Bolt-on responsive control |
|---|---|---|---|
| 1 | Outer max-width | `ContainerWrapperControls.js:275` `<UnitControl label="Outer max-width">` | `:284` `<ResponsiveControl label="Outer max-width by viewport">` |
| 2 | Content band width | `:337-349` ToggleGroup + `Custom content band width` UnitControl | `:351` `<ResponsiveControl label="Content band width by viewport">` |
| 3 | Padding | WP-native Dimensions panel (`style.spacing`) | `:1203` `<ResponsiveControl label="Padding">` |
| 4 | Margin | WP-native Dimensions panel | `:1228` `<ResponsiveControl label="Margin">` |
| 5 | Line height | `TypographyControls.js:404-415` `<UnitControl label="Line height">` (renders unconditionally) | `text/edit.js:347` `<ResponsiveControl label="Line height (tablet / mobile)">` |

Note #5 crosses a component boundary — the plain control lives in a *shared* component and
the bolt-on in the *block's* edit.js, which is why `check-duplicate-controls.js`
(same-edit.js, same-attr) cannot see it: the two controls write **different attribute
names** (`lineHeight` vs `lineHeightTablet`/`lineHeightMobile`) for one semantic setting.

**Detector rule `RESP-SPLIT-DESKTOP`.** For each block, build the set of responsive
families from `block.json`. For family `X`: flag when (a) some JSX control writes `X`
*outside* any `ResponsiveControl`/`ResponsiveOverride` subtree, **and** (b) a
`ResponsiveControl` subtree in the same render tree writes `XTablet` or `XMobile`.
Resolve shared components by following the import graph one hop (`TypographyControls`,
`SpacingControl`, `ContainerWrapperControls`, `ResponsiveBoxControl*`) — §1.4/§4.5 of the
scanner architecture doc notes nothing resolves them today.
**False-positive risk:** medium-high for #3/#4, where the "plain control" is WP's native
Dimensions panel and never appears in the block's source at all. Detect that arm from
`block.json` `supports.spacing` rather than from JSX.

---

## R4 — The parent control's name is altered because a toggle exists

**Root cause: per-block edit.js (a consequence of R3).** Because the desktop tier lives
elsewhere, the author renames the responsive control to say so. Three label shapes:

| Shape | Label | File:line |
|---|---|---|
| "by viewport" suffix | `Outer max-width by viewport` | `ContainerWrapperControls.js:284` |
| "by viewport" suffix | `Content band width by viewport` | `ContainerWrapperControls.js:351` |
| device names baked in | `Line height (tablet / mobile)` | `text/edit.js:347` |

**Detector rule `RESP-DEVICE-IN-LABEL`.** String-match the `label` prop of any
`ResponsiveControl`/`ResponsiveOverride` against
`/\b(by viewport|per (device|breakpoint)|desktop|tablet|mobile|phone)\b/i`.
**False-positive risk:** low within `ResponsiveControl` labels. Do **not** run this pattern
over general control labels — it would sweep up legitimate ones (see V6/false positives).
**Scale:** 3 of 59.

---

## R5 — In `sgs/text` line-height, no desktop value can be set

**Root cause: per-block edit.js — a conditional render-prop that returns `null` on
desktop.** Proven, and it **partially contradicts Bean's description**.

```
src/blocks/text/edit.js:347-351
  <ResponsiveControl label={ __( 'Line height (tablet / mobile)' … ) }>
    { ( breakpoint ) => {
        if ( breakpoint === 'desktop' ) {
            return null;                 // ← desktop renders NOTHING
        }
```

Ruling out the three candidate causes explicitly:

- **Not a missing attribute.** `lineHeight` and `lineHeightUnit` are declared and
  destructured at `text/edit.js:267-268`.
- **Not delegated to a native support.** It is delegated to a *shared SGS* control:
  `TypographyControls` is mounted at `text/edit.js:327-340` with `showLineHeight={true}`,
  and `TypographyControls.js:404-415` renders `<UnitControl label="Line height">`
  **unconditionally** (it is not inside any `ResponsiveControl` and has no breakpoint
  guard).
- **It is the conditional render.** The desktop tier of *this* control is
  `return null` — an empty labelled box with a 44px device switcher and no input.

**So the desktop line-height IS settable** — in a separate control named "Line height"
sitting immediately above, added by a shared component. What Bean saw is real (this
control has no desktop input) but the value is not unreachable. This is R3 instance #5
plus a missing signpost.

The same shape occurs **four more times with a signpost**, which is the strictly better
authored variant of the identical defect:

```
ContainerWrapperControls.js:286-292   <p className="sgs-inspector-help">Desktop max-width is set above.</p>
ContainerWrapperControls.js:353-359   … Desktop content band width is set above.
ContainerWrapperControls.js:1205-1211 … Desktop padding & margin are set in the Dimensions panel above.
ContainerWrapperControls.js:1230-1236 … (same)
```

— and `sgs-inspector-help` has no CSS (R2), so even the signpost renders as unstyled body text.

**Detector rule `RESP-DEAD-DESKTOP-TIER`.** AST: inside a `ResponsiveControl` render-prop
whose parameter is the breakpoint, find an `IfStatement` testing `param === 'desktop'`
whose consequent is `return null` (severity HIGH) or `return <p>…</p>` / any node
containing no interactive control element (severity MEDIUM).
**False-positive risk:** low. A genuine "desktop is intentionally not configurable" case
would still be a UX defect under the sticky-switcher model, so a false positive is cheap.
**Scale:** 5 (1 × `null`, 4 × help paragraph).

---

## R6 — One control PER device, which the toggle existed to eliminate

**Root cause: per-block edit.js.** No shared component involved; these predate or ignore
`ResponsiveControl`. Confirmed instance families:

| Block | Controls | File:line |
|---|---|---|
| `sgs/container` background **image** | `Desktop image` / `Tablet image (optional)` / `Mobile image (optional)` | `ContainerWrapperControls.js:670`, `:699`, `:725` |
| `sgs/container` background **video** | `Desktop video` / `Mobile video (optional)` | `ContainerWrapperControls.js:794`, `:821` |
| `sgs/responsive-logo` | `Desktop logo (horizontal)` / `Tablet logo (square)` / `Mobile logo (mark/icon)` | `responsive-logo/edit.js:268`, `:276`, `:285` |
| `sgs/image-sequence` | `Desktop frames folder URL` / `Tablet frames` + `Tablet frames folder URL` / `Mobile frames` + `Mobile frames folder URL` | `image-sequence/edit.js:304`, `:366`, `:378`, `:408`, `:420` |
| `sgs/hero` | `Split image mobile height (px)` — a mobile-only sibling of a desktop-only height | `hero/edit.js` (label scan) |

Because `ContainerWrapperControls` is the shared wrapper-controls component for the whole
composite roster, the container background-image/video variant is **not one block's
problem — it renders identically on every composite that mounts the shared controls**
(18 blocks resolve their wrapper attrs through it).

**Detector rule `RESP-PER-DEVICE-SIBLING-CONTROLS`.** Two conditions, both required:
(a) ≥2 control elements in one render tree whose `label` literals differ only by a device
token (`/^(.*)\b(desktop|tablet|mobile|phone)\b(.*)$/i`, same remainder after
normalising `(optional)`); **and** (b) they write attrs belonging to the same
`block.json` responsive family (`X`, `XTablet`, `XMobile`).
**False-positive risk:** condition (b) is what keeps this honest. Without it the rule
sweeps up legitimate non-tier device wording:
- `sgs/nav-menu:615,619` `Tablet`/`Mobile` are `ToggleGroupControlOption`s that set one
  `collapsePoint` number (a burger breakpoint) — **legitimate**, one attribute.
- `sgs/whatsapp-cta:134,142` `Show on mobile` / `Show on desktop` — visibility booleans,
  not tiers of one value.
- `sgs/gallery`, `sgs/post-grid`, `sgs/google-reviews`, `sgs/trustpilot-reviews`,
  `sgs/buybox` `Drag to scroll (desktop)` — a desktop-only *behaviour*, no tier family.
- `sgs/quote` `Box shadow (desktop)`, `sgs/content-collection` `Columns (desktop)`,
  `sgs/testimonial-slider` `Slides visible (desktop)` — same.

---

## R7 — Hero split image uses two attributes, and the mobile one has no control

Every clause of Bean's report is confirmed, and the mechanism is narrower than
"a purpose-built role" suggests — it is a role with **exactly two rows in the entire
framework DB**, both of them hero split images.

**Proven, with two independent sources per claim.**

1. **Two attributes, not one.** `src/blocks/hero/block.json` declares `splitImage`
   (`type: object`) and `splitImageMobile` (`type: object`) as separate attrs; the DB
   agrees (`block_attributes` rowids 414600 / 414602, both `canonical_slot='media'`).
2. **The mobile attr has no inspector control.** `grep -n 'splitImageMobile\b'
   src/blocks/hero/edit.js` returns **nothing** (exit 1) — only `splitImage`,
   `splitImageBleed`, `splitImageMobileHeight` appear. Independently, the editor preview
   at `hero/edit.js:1396-1410` renders a single `<img src={ splitMedia?.url ||
   splitImage?.url }>` — there is no mobile source in the editor at all, which is exactly
   why the editor's Mobile preview shows the desktop image.
3. **The front end does honour it.** `hero/render.php:948-981`: when
   `$split_image_mobile['url']` is non-empty it emits a **second** `<img>` with class
   `sgs-hero__split-image--mobile`, marks the desktop one `--desktop`, and appends
   `@media (max-width:767px){…--desktop{display:none}}` +
   `@media (min-width:768px){…--mobile{display:none}}` (`:978-980`). Two `<img>` elements
   toggled by CSS — not `<picture>`/`srcset`.
4. **The cloning route.** `role='scalar-media'` exists in `roles` (classification
   `styling-behaviour`) and is carried by **exactly two** `block_attributes` rows in the
   whole DB: `sgs/hero.splitImage` and `sgs/hero.splitImageMobile`. The converter's
   composite-interior arm resolves the base attr via
   `db_lookup.scalar_media_attr_for(slug, element)` and then does a literal string
   concatenation:

   ```
   scripts/converter/services/extraction.py:651-652
     is_mobile   = (img_modifier in mobile_sfxs) if img_modifier else False
     target_attr = f"{base_attr}Mobile" if is_mobile else base_attr
   ```

   `mobile_sfxs` comes from `_mobile_suffixes()` (`extraction.py:151-186`) →
   `db_lookup.breakpoint_suffix_rules()` → `modifier_suffixes WHERE kind='breakpoint'`
   (DB rows: `Mobile`, `Tablet`, `Desktop`). The draft's `<img>` carries a BEM
   `--mobile` modifier; that is the entire signal.

5. **This path is live, and it is the only one.** The enclosing function is
   `run_mechanism_b` (`extraction.py:516`), called from `walk.py:448` when
   `rec.delegates_content == 1`; branch A additionally requires
   `db_lookup.is_class_section_block(rec.slug)` — and `blocks.tier` for `sgs/hero` is
   `class-section`. A hard pre-condition guard added 2026-08-02
   (`db/db_lookup.py:553-583`) refuses to seed `scalar-media` onto any block that is not
   `class-section`, because the role is **not content-bearing**: applying it *removes* the
   attr from the universal walk's candidate set, so `run_mechanism_b` branch A is the only
   thing that can lift it. `sgs/testimonial-slider.sideImage` was added to the roster and
   measured broken the same day.

**Contradiction to flag.** `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:604` states, as
a MEASURED finding dated 2026-08-01, that *"no code path today routes a draft's `--mobile`
art-directed image to the Mobile attr"* because `content_attr_for_element`
(`db/db_lookup.py:5346`) resolves purely on the BEM element token and `splitImage` wins by
`ORDER BY rowid`. That is true **of that resolver**, which serves the per-attr content
walk — but `extraction.py:651` in `run_mechanism_b` branch A is a *different* resolver,
is reachable from `walk.py:448`, and does inspect the modifier. Both statements can be
true simultaneously (two routes, one working, one not), but the spec line reads as
absolute and would mislead anyone planning the migration. Converter tests
`tests/test_art_direction_live_path.py:184-186,224` and `tests/test_extraction.py:346-392`
assert the working route. **This needs a live-run measurement to settle which route a real
hero draft takes; I have not run the pipeline.**

**What a move to a single responsive image attribute must contend with (8 things).**

1. `scripts/data/scalar-media-roles.json` + the module-load seeder at
   `db/db_lookup.py:~500-590` — including its deliberate `is_class_section_block` guard.
2. `db_lookup.scalar_media_attr_for()` / `has_scalar_media_attrs()` and the
   `is_class_section_block` gate in `run_mechanism_b` branch A.
3. `extraction.py:651-652` — the `f"{base_attr}Mobile"` concat is the **only** mobile
   art-direction route in the converter. Deleting `splitImageMobile` without a replacement
   drops the mobile image silently.
4. `_mobile_suffixes()` and `modifier_suffixes(kind='breakpoint')` lose their only consumer
   on this path.
5. `hero/render.php:948-981` — the dual-`<img>` + `display:none` toggle, plus
   `splitImageMobileObjectPosition` (DB `css_element='split-image--mobile'`, rowid 414603)
   and `splitImageMobileHeight` (rowid 414639, `css_tier='mobile'`). A single-attr model
   implies `<picture>`/`srcset`, which changes which element the object-position and height
   rules target.
6. Converter tests `test_extraction.py:346-392` and
   `test_art_direction_live_path.py:184-224` assert the two-attr shape by name.
7. Existing cloned post content already carries `splitImageMobile` in `post_content`.
   `D293` bans version bumps and deprecations pre-production, so the migration has to be a
   read-both/write-one shape, not a `deprecated.js`.
8. `.claude/specs/02-SGS-BLOCKS-REFERENCE.md:313-315` and Spec 31 §604 both name the attrs
   and must be amended in the same change (`spec-is-the-system` rule).

**Detector rule `RESP-TIER-ATTR-NO-CONTROL` (the general form of R7).** A `block.json` attr
matching `/(Tablet|Mobile)$/` whose base exists, which is **never mentioned** in the
block's `edit.js` or `components/*.js`, and which is **not** reachable via
(a) a shared component the block mounts that writes it literally, or
(b) a dynamic-prefix builder (`typographyAttrName(prefix, 'FontSizeTablet')`).
**False-positive risk: HIGH and it dominates.** Naïvely, 208 of 227 tier attrs look
orphaned. After resolving the two coverage routes, the real residue is **12** (see V7).
`splitImageMobile` is a *third* legitimate-looking category: it has no editor control by
design and is fed by the converter role — the scanner should classify it as
`CONVERTER-FED-NO-CONTROL`, a distinct (and still-defective) verdict rather than
"uncontrolled".

---

## R8 — The responsive override should be a standard optional capability on every control

**Root cause: architectural — the capability is opt-in at the call site and there is no
mechanism to make it universal.** Every one of the 59 `ResponsiveControl` usages is a
hand-written wrapper the block author chose to add; nothing enumerates "controls that
*could* be responsive but are not".

Two hard pieces of evidence that the intent already existed and died:

1. `ResponsiveControl` grew an optional inherit-indicator + reset API
   (`isInherited` / `resolvedValue` / `onReset`, `ResponsiveControl.js:36-60, 132-195`,
   Spec 35 T1.2) and it has **zero callers** — grep finds the prop names only inside the
   component's own docblock. Its own comment says so: *"a caller that doesn't pass them
   (all current callers)"* (`:133-135`). Dead API.
2. `ResponsiveOverride` re-implements the same inherit UX independently
   (`ResponsiveOverride.js:106-151`) with a different vocabulary
   (`Inherited from Tablet` vs `Inheriting from Desktop`), a different cascade
   (`mobile ← tablet ← desktop` via `resolveResponsiveTier` vs `ResponsiveControl`'s
   caller-supplied predicate), and its own local state.

**Detector rule `RESP-COVERAGE-GAP`.** For each block, compute
`declared_families` (from `block.json`) and `switched_families` (families whose tier attrs
are written inside a `ResponsiveControl`/`ResponsiveOverride`/`ResponsiveBox*` subtree).
Report `declared − switched`, plus the inverse coverage metric "controls with no tier
family at all" as an informational denominator for the migration.
**False-positive risk:** low as a metric; it is not a per-instance bug list.

---

## Variations Bean did not report

### V9 — Half families: a mobile tier with no tablet tier (8)

`block.json` declares `XMobile` but no `XTablet`, so the middle tier is silently
unreachable and the value jumps desktop → mobile at 767px.

```
sgs/container        bgVideo               (bgVideoMobile, no bgVideoTablet)
sgs/cta-section      bgVideo
sgs/hero             bgVideo
sgs/trust-bar        bgVideo
sgs/hero             headlineMarginBottom
sgs/hero             subHeadlineMarginBottom
sgs/hero             splitImage
sgs/product-search   maxResults
```

`bgVideo` ×4 is arguably defensible (one alternate video for small screens), but it is
inconsistent with `backgroundImage`, which *does* carry a Tablet sibling on the same
blocks. `product-search.maxResultsMobile` is a behaviour count, not a style.

**Detector `RESP-HALF-FAMILY`.** `XMobile` present XOR `XTablet` present.
**False-positive risk:** low-medium — some are deliberate. Ship as WARN with an
allow-list, not a build failure.

### V10 — Two storage models for the same property name (5 blocks vs 42)

Described in §0. `maxWidth`/`gap`/`contentWidth`/`padding` are `string` + siblings almost
everywhere and `object {desktop,tablet,mobile}` on the header/footer-row family. A third
key vocabulary exists inside `ResponsiveBoxControl`, which uses **`base`** where everything
else uses **`desktop`** (`ResponsiveBoxControl.js` docblock §"Attribute shape"), and
`mega-panel/edit.js:284-292` has to translate (`const key = tier === 'base' ? 'desktop' : tier`).

**Detector `RESP-MIXED-STORAGE-MODEL`.** For each attr name appearing on ≥2 blocks, assert
one consistent `type` (+ one consistent tier-key vocabulary in defaults).
**False-positive risk:** low; genuinely different semantics under one name would be a
naming bug anyway.

### V11 — Only one of the four switchers drives WordPress's native device preview

`ResponsiveControl.js:107-121` reads and writes `core/editor` `getDeviceType`/
`setDeviceType`. `ResponsiveOverride.js:49` and `ResponsiveTriStateControl` both use a
private `useState('desktop')`. Consequence today: on `sgs/site-header-row`, switching the
padding switcher to Tablet changes which value you edit but does **not** resize the canvas,
while on `sgs/container` the identical-looking switcher does. Two switchers on screen can
disagree about which device you are editing.

This directly threatens the migration: the captured project rule
`responsive-switcher-sync-wp-native-devicetype` requires the switcher and core
`deviceType` to stay in sync, and **three of four implementations currently violate it**.

**Detector `RESP-SWITCHER-NOT-NATIVE`.** Any component rendering `DeviceTabs` (or a
device tier-list) that does not `useSelect(select('core/editor').getDeviceType)`.
**False-positive risk:** low. The documented site-editor/widgets fallback
(`ResponsiveControl.js:19-20`) is the legitimate shape — require the *fallback* pattern,
not the absence of native.

### V12 — Dead inherit/reset API (see R8 evidence #1)

`isInherited` / `resolvedValue` / `onReset`: zero callers. Detector: exported optional
props with no call site → `DEAD-COMPONENT-API`.

### V13 — Near-miss and bespoke breakpoints in block stylesheets

Histogram of every `min-width`/`max-width` px literal across `src/` + `includes/`:
767 (134), 1023 (120), 768 (16), 1024 (6) — the device-tier standard, healthy. Then:

| Value | Count | Locations | Classification |
|---|---|---|---|
| `599px` | 10 | `countdown-timer/style.css:105`, `form/style.css:120`, `gallery/style.css:581`, `google-reviews/style.css:132`, `info-box/style.css:268`, `post-grid/style.css:835`, `process-steps/style.css:12`, `tabs/style.css:281,353`, `trust-bar/style.css:141` | **Suspect device-tier** — 599 was the pre-2026-06-16 wrapper mobile value that was unified to 767. Each needs individual classification. |
| `600px` | 4 | `accordion/style.css:247`, `product-faq/style.css:140`, `table-of-contents/style.css:157`, `gallery/style.css:504` (a `max-width` property, not a query) | Mixed — one is not a breakpoint at all. |
| `769px` | 1 | `whatsapp-cta/style.css:121` `@media (min-width: 769px)` | **Genuine bug.** Paired with the 767 standard this leaves 768px covered by neither rule. Should be 768. |
| `480px`, `560px`, `640px` | 8 | `buybox`, `form` (`@container`), `mega-panel` (`@container`) | **Legitimate visual/container queries** — `@container` is not the device system at all. |

Per the captured `device-tier vs visual breakpoints` rule this must **not** be swept.
**Detector `RESP-NEAR-MISS-BREAKPOINT`.** Flag `@media` px values within ±2 of 767/768/
1023/1024 (catches 769, 766, 1022, 1025) as HIGH; flag exact `599`/`600` as
MEDIUM-needs-human; **exempt `@container` queries entirely**.
**False-positive risk:** the MEDIUM tier is explicitly a human-classification queue, not a
fixable finding. A mechanical agent must not act on it.

### V14 — Two device-visibility systems on the same block

`src/blocks/extensions/responsive-visibility.js:68-70` registers
`sgsHideOnMobile`/`sgsHideOnTablet`/`sgsHideOnDesktop` on **every** block via
`addFilter('editor.BlockEdit')`. `sgs/decorative-image` additionally declares and controls
its own private `hideOnTablet`/`hideOnMobile` (`decorative-image/edit.js:298-317`) and its
`block.json` `supports.sgs` declares **no** `hideExtensions` — so the operator sees two
sets of hide-by-device toggles. `sgs/whatsapp-cta` has the inverse-polarity twin
(`showOnMobile`/`showOnDesktop`, `whatsapp-cta/edit.js:134,142`).
`DeviceVisibilityPanel.js:11-14` warns about exactly this in its own docblock.

**Detector `RESP-DUPLICATE-VISIBILITY-SYSTEM`.** A block declaring a private attr matching
`/^(hide|show)On(Mobile|Tablet|Desktop)$/` while not declaring
`supports.sgs.hideExtensions` containing the visibility extension.
**False-positive risk:** low.

### V15 — Genuinely uncontrolled tier attrs (the honest residue of R7's rule)

After resolving shared-component coverage (142 attrs across 18 blocks via
`ContainerWrapperControls`; 54 attrs across 14 blocks via `TypographyControls`'
dynamic-prefix builder), **12** tier attrs have no editor path at all:

```
sgs/button          iconSizeTablet, iconSizeMobile
sgs/media           orderTablet, orderMobile
sgs/physics-canvas  contentBandPaddingTablet/Mobile, contentWidthTablet/Mobile,
                    maxWidthTablet/Mobile, minHeightTablet/Mobile
```

`sgs/physics-canvas` (8 of the 12) is the newest block — it declares the full wrapper
responsive family but does not mount `ContainerWrapperControls`, so it inherited the
attribute schema without the controls. That is the *shape* of the defect, worth a rule of
its own: **`RESP-WRAPPER-FAMILY-WITHOUT-WRAPPER-CONTROLS`** — a block declaring ≥4
canonical wrapper tier attrs (`maxWidth*`, `contentWidth*`, `gap*`, `padding*`,
`gridTemplateColumns*`) while mounting neither `ContainerWrapperControls` nor
`ResponsiveBoxControls`.

**False-positive risk for the parent rule: HIGH.** Both coverage routes must be modelled or
the rule reports 208 findings, ~94% of them false. The `TypographyControls` route is
specifically the dynamic-key blind spot `check-control-ux.js:38-41` already documents.

---

## Summary of variations

| ID | Variation | Scale | Layer |
|---|---|---|---|
| V1 | Switcher carries a control name (R1) | 68 call sites | shared component |
| V2 | Switcher unstyled + 2-row chrome + 3×44px (R2) | 6 orphan class names, all call sites | shared component + missing CSS |
| V3 | Split-desktop duplicate control (R3) | 5 families | per-block edit.js |
| V4 | Device words baked into the parent label (R4) | 3 labels | per-block edit.js |
| V5 | Desktop tier renders nothing / prose (R5) | 5 (1 `null`, 4 `<p>`) | per-block edit.js |
| V6 | One control per device (R6) | 5 blocks, ~13 controls | per-block edit.js |
| V7 | Tier attr fed by converter role, no control (R7) | 1 (`splitImageMobile`) | schema + converter |
| V8 | Responsive is opt-in, no universal mechanism (R8) | architectural | shared component |
| V9 | Half family — mobile without tablet | 8 | block.json schema |
| V10 | Two/three storage models + `base` vs `desktop` key | 5 blocks vs 42 | schema + components |
| V11 | 3 of 4 switchers ignore core `deviceType` | 3 components, 11 call sites | shared components |
| V12 | Dead inherit/reset API on `ResponsiveControl` | 3 props, 0 callers | shared component |
| V13 | Near-miss / legacy breakpoints (`769`, `599`×10) | 15 sites | CSS |
| V14 | Duplicate device-visibility systems | 2 blocks | extension + block |
| V15 | Genuinely uncontrolled tier attrs | 12 attrs, 3 blocks | schema vs edit.js |

**15 distinct variations.**

---

## What the sticky-switcher migration must contend with

1. **Three of four switcher implementations must be rewritten, not deleted.** Only
   `ResponsiveControl` speaks `core/editor` `deviceType`. `ResponsiveOverride`,
   `ResponsiveTriStateControl` and (transitively) `ResponsiveBoxControls` hold private
   `useState`. Under a single sticky switcher, a component holding private tier state is a
   second, invisible source of truth. (V11)
2. **The tier vocabulary is not uniform.** `desktop|tablet|mobile` (most),
   `base|tablet|mobile` (`ResponsiveBoxControl`), `Desktop|Tablet|Mobile`
   (WP's `deviceType` values, mapped at `ResponsiveControl.js:91-95`), and
   `inherit|on|off` per tier (tri-state). One switcher needs one vocabulary and a mapping
   layer at exactly one seam. (V10)
3. **Two storage models must both keep working during the migration.** Flat siblings
   (42 blocks, 173 families) and the tier object (5 blocks) are read by *different PHP
   branches* — `class-sgs-container-wrapper.php:132` forks on
   `responsive_model === 'object'`. The switcher is editor-side, so it must write whichever
   shape the block already declares; a big-bang schema unification is a separate,
   larger change.
4. **Deleting the per-control wrapper is not a pure deletion.** ~50 inner controls carry
   `hideLabelFromVision` precisely because the wrapper printed the name
   (`TypographyControls.js:357-358` etc.). Removing the wrapper without removing that prop
   leaves unnamed inputs. (V1)
5. **The 5 split-desktop pairs must collapse to one control each**, and the 4 desktop
   signpost paragraphs plus the 1 `return null` disappear with them — otherwise the
   sticky switcher set to Desktop lands on a control that still refuses to show a desktop
   input. (V3/V5)
6. **The 12 uncontrolled tier attrs get a control for free** the moment the switcher makes
   every control tier-aware — *if* the base control exists. For `sgs/physics-canvas` (8 of
   the 12) the base wrapper controls are not mounted at all, so the switcher gains it
   nothing. (V15)
7. **The hero split image cannot be fixed editor-side alone.** A single responsive image
   attribute touches the converter's only art-direction route, the `scalar-media` role's
   two-row roster and its `is_class_section_block` pre-condition guard, the dual-`<img>`
   render, two DB-routed companion attrs, two converter test modules, existing cloned
   `post_content`, and two spec documents. Treat it as a separate design-gated change, not
   a line item in the switcher migration. (R7)
8. **The "override" indicator needs one cascade, not two.** `ResponsiveControl`'s dead
   `isInherited` predicate is caller-supplied; `ResponsiveOverride` hard-codes
   `mobile ← tablet ← desktop` via `resolveResponsiveTier`; `utils/responsive.js:75-115`
   `resolveTier` is the canonical resolver with a PHP mirror
   (`includes/helpers-responsive.php`). The switcher's "this tier overrides desktop" badge
   must read `resolveTier`, or editor and front end will disagree. (V12)
9. **`sgs-inspector-help` and the whole `sgs-responsive-control*` class family have no
   stylesheet.** Any new sticky-switcher chrome must ship with real CSS, and the orphan
   classes should be removed rather than inherited. (V2)
10. **Do not sweep breakpoints as part of this.** The `599`/`600` set needs
    case-by-case human classification, and `@container` queries in `form`/`mega-panel`/
    `buybox` are not the device system. The only mechanical fix in V13 is
    `whatsapp-cta/style.css:121` `769` → `768`. (V13)

---

## Anything that contradicts Bean's description

1. **R5 is not "desktop is unreachable".** The desktop line-height IS settable via
   `TypographyControls`' unconditional `<UnitControl label="Line height">`
   (`TypographyControls.js:404-415`) rendered immediately above. The defect is that the
   *responsive* control returns `null` on desktop (`text/edit.js:349-351`) with no
   signpost, so it looks broken. Four sibling instances in `ContainerWrapperControls` do
   the same thing but print "…is set above".
2. **R7's converter route may be contested.** Spec 31 line 604 records a MEASURED finding
   (2026-08-01) that *no* code path routes a `--mobile` art-directed image to
   `splitImageMobile`. A different, live route does exist (`extraction.py:651-652`, reached
   from `walk.py:448`) and is covered by passing tests. I have not run the pipeline, so
   which route a real hero draft takes is **unproven either way** — worth one live run
   before anyone plans around it.
3. **R6 is broader than the container background.** `responsive-logo` (3 logos) and
   `image-sequence` (5 controls) are the same variation, and the container background case
   lives in the *shared* `ContainerWrapperControls`, so it renders on every composite that
   mounts it — not on `sgs/container` alone.
4. **R3 has a fifth instance Bean did not name** — padding and margin in
   `ContainerWrapperControls.js:1203` / `:1228` are the same split-desktop pattern against
   WP's native Dimensions panel.
5. **The guard that should already catch most of this reads green.**
   `node scripts/check-control-ux.js` reports "No net-new control-UX violations" against an
   **empty** baseline. Its `RESPONSIVE-FAMILY-WITHOUT-SWITCHER` check is defeated by its own
   `tablet: 'xTablet'` breakpoint-map exemption (`check-control-ux.js:285-290`) and by
   dynamic key construction — the two idioms the real defects use.
