# CHECK A triage — group B (2026-08-26)

Scope: `sgs/icon`, `sgs/multi-button`, `sgs/nav-drawer`, `sgs/physics-canvas`, `sgs/site-footer`,
`sgs/site-footer-row`, `sgs/site-header`, `sgs/site-header-row`, `sgs/trust-bar` — every block in
`reports/2026-08-26-check-a-findings.json` → `editorCanvasDesync.netNew` that is NOT one of the
seven group-A blocks (`sgs/button`, `sgs/card-grid`, `sgs/container`, `sgs/cta-section`,
`sgs/gallery`, `sgs/hero`, `sgs/info-box`).

**Total netNew in the file:** 208. **Group B (this triage):** 128 findings (the brief's prose
estimate of 127 undercounted by 1 — `sgs/icon` (1 finding) and `sgs/nav-drawer` (1 finding) are in
group B by the exclusion rule but weren't named in the prose list; taken from the JSON per the
brief's own tie-break instruction).

Per-block counts (enumerated from the JSON, not estimated):

| Block | Findings |
|---|---|
| sgs/trust-bar | 37 |
| sgs/multi-button | 23 |
| sgs/site-header | 18 |
| sgs/physics-canvas | 17 |
| sgs/site-footer | 17 |
| sgs/site-footer-row | 7 |
| sgs/site-header-row | 7 |
| sgs/icon | 1 |
| sgs/nav-drawer | 1 |
| **Total** | **128** |

## Classification totals

| Class | Count |
|---|---|
| REAL | 118 |
| ARTEFACT | 10 |
| DETECTOR BUG | 0 |
| **Total** | **128** |

No DETECTOR BUG findings in this scope. CHECK A's "written but never read in this file" heuristic
correctly identifies every group-B finding as a genuine write-with-no-local-read — the only
imprecision is that several of these attrs ARE read, but inside a *shared component file*
(`BackgroundPanel.js`, `GridItemDefaultsPanel.js`, `ResponsiveBoxControls.js`,
`RowScrollBehaviourControls.js`) rather than the block's own `edit.js`. That's a red herring for
the WRITE side, but irrelevant to the actual question CHECK A is asking (does the CANVAS visually
reflect the value) — none of those shared components build a canvas preview either, so the
underlying desync claim holds regardless.

---

## Root-cause groups (REAL findings only), ranked by size

### 1. BackgroundPanel canvas-preview gap — 85 findings (66% of scope)
**Blocks:** sgs/multi-button (17), sgs/physics-canvas (17), sgs/site-footer (17), sgs/site-header (17), sgs/trust-bar (17).
**Attrs (17, identical set on every block):** `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`, `backgroundAttachment`, `bgVideo`, `bgParallax`, `bgKenBurns`, `bgAnimationDuration`, `bgSvgContent`, `bgSvgPosition`, `bgSvgAnimation`, `bgSvgAnimationSpeed`, `backgroundOverlayBlendMode`, `bgSvgOpacity`, `bgSvgTextShadow`, `bgSvgMinHeight`. None are per-tier objects — all flat (image/video are `object` picker values but not `{desktop,tablet,mobile}` shaped; the Tablet/Mobile art-direction overrides are separate sibling attrs, e.g. `backgroundImageTablet`).

**Evidence.** All five blocks mount the shared `BackgroundPanel` component
(`plugins/sgs-blocks/src/blocks/container/components/BackgroundPanel.js`) — confirmed via:
- `multi-button/edit.js:10,250`
- `physics-canvas/edit.js:23,112`
- `site-footer/edit.js:20,377`
- `site-header/edit.js` (imports `backgroundImage` etc. directly, see below)
- `trust-bar/edit.js:28,556`

`BackgroundPanel.js:89-112` destructures all 17 attrs and writes them via `setAttributes` —
this is the "control" CHECK A means; it just isn't in the block's own file. On the frontend,
`class-sgs-container-wrapper.php` (`SGS_Container_Wrapper::render()`) reads every one of these
(`backgroundImage` L377, `backgroundOverlayBlendMode` L426, `bgKenBurns` L431, `bgSvgContent`
L956, etc.) and paints the full media/overlay/animation stack — confirmed on trust-bar's render
path and shared by all composite blocks with a container wrapper (per CLAUDE.md's
composite-mirror rule).

**The gap:** exactly two blocks in the whole plugin built a JS mirror of that PHP logic for the
editor canvas — `container/edit.js` (lines ~265-360: `backgroundPaintPreview()`,
`overlayPaintPreview()`, and a `style` object that sets `--sgs-ed-bg-image`/`--sgs-ed-bg-size`/
etc. plus a `bgKenBurns` class) and `hero/edit.js` (same class of code, confirmed present via the
earlier grep for `bgKenBurns`/`backgroundOverlayBlendMode`). Both are group A.

For the five group-B mounts, I grepped each `edit.js` for `sgs-ed-bg`, `hasBgImage`,
`hasBgVideo`, `backgroundSize`, `backgroundPosition` — **zero hits in multi-button,
physics-canvas, site-footer, trust-bar.** `site-header/edit.js` has the attrs destructured, but
the ONLY 16 hits are inside a `resetAll` callback (lines 687-729) that clears them — never a
preview read. There is no shared "background preview" hook either — `container/edit.js`'s
preview functions (`backgroundPaintPreview`, `overlayPaintPreview`) are module-private, not
exported.

**Classification: REAL.** Static, non-interactive properties (an uploaded background image, its
size/position/repeat, the overlay blend mode) that a client sets in the inspector and gets zero
visual confirmation for until they publish and view the frontend — the canonical "static property
the canvas should show" case from the brief's own worked example (`backgroundRepeat`).
`bgParallax`/`bgKenBurns` are the one arguable exception (see Artefact note below) but they ship
in the same panel and the same fix, so they're grouped here rather than split out.

**Narrowest fix, clears 85:** Extract `container/edit.js`'s existing background-preview logic
(`backgroundPaintPreview`, `overlayPaintPreview`, and the `style` object block building
`--sgs-ed-bg-*` custom properties + the `bgKenBurns`/`bgParallax` class) into a shared hook —
e.g. `useBackgroundPreviewStyle(attributes, previewTier)` in `components/` — and call it from the
five group-B blocks' `useBlockProps`/`blockProps.style` (plus wire the matching `::before`
preview rule into each block's `editor.css`, mirroring `container`'s). One extraction + five
call-site wire-ups; no new PHP, no attribute changes. `hero` (group A) should adopt the same hook
when that track lands its own fix, so the mechanism converges to one owner instead of three
independent copies (container/hero/the-shared-hook).

---

### 2. GridItemDefaultsPanel canvas-preview gap — 15 findings
**Block:** sgs/trust-bar only.
**Attrs:** `gridItemPadding` *(tier object, `{desktop:{...}}` shape)*, `gridItemBackground`,
`gridItemBackgroundHover`, `gridItemBackgroundGradient`, `gridItemBackgroundHoverGradient`,
`gridItemBorderRadius` *(tier object)*, `gridItemBorder`, `gridItemBorderGradient`,
`gridItemBorderGradientHover`, `gridItemShadow`, `gridItemShadowColour`, `gridItemTextColour`,
`gridItemTextColourHover`, `gridItemTextColourGradient`, `gridItemTextColourHoverGradient`.

**Evidence.** `trust-bar/edit.js:30,688` mounts the shared `GridItemDefaultsPanel`
(`blocks/container/components/GridItemDefaultsPanel.js` — confirmed as the only file in the repo
referencing `gridItemPadding`/`gridItemBackground` besides block.json). Grepping `trust-bar/edit.js`
for `gridItem` returns nothing outside the mount call — neither of its two per-item editor
components (`IconCircleItemEditor` L149, `GenericBadgeItemEditor` L197) reads any `gridItem*`
attr to style an individual badge card in the canvas. Frontend: `class-sgs-container-wrapper.php`
emits these as `--sgs-gi-*` custom properties (`$grid_item_padding` L781/1392-1393, and the
surrounding block for the other 14) which the composite's own CSS consumes per-item. No JS
equivalent exists anywhere for trust-bar's item cards.

**Classification: REAL.** These are per-item box/colour/shadow defaults a client sets expecting
every badge card to pick them up — static, non-scroll, non-hover-only properties (the `*Hover`
variants only paint on `:hover`, which the editor canvas legitimately can't preview without a
synthetic hover state — but the base/resting values, 11 of the 15, unambiguously should show).

**Narrowest fix, clears 15 (or 11 base + 4 hover, if hover-state preview is deferred):** In
`trust-bar/edit.js`'s two item-editor components, resolve `gridItem*` from `attributes` (the
parent block's attrs, already in scope via props) into the same `--sgs-gi-*` custom-property
names the PHP wrapper emits, applied to each item's wrapper `style`. Mirrors `class-sgs-container-
wrapper.php`'s naming exactly, so the existing CSS in style.css/editor.css needs no new rules —
only the JS write-through is missing.

---

### 3. LayoutPanel grid-alignment canvas-preview gap — 4 findings
**Block:** sgs/trust-bar only.
**Attrs (all flat strings, not tier objects):** `alignItems` (default `start`), `justifyItems`
(default `stretch`), `alignContent` (default `stretch`), `gridAutoRows` (default `''`).

**Evidence.** Written via the shared `LayoutPanel` (`ContainerWrapperControls.js`), mounted at
`trust-bar/edit.js:684`. `trust-bar/edit.js:328-347` builds a `blockProps.style` object that DOES
set `display:'grid'`, `gridTemplateColumns`, and `gap` when `showBadgeGrid` is true — but the
object stops there; `alignItems`/`justifyItems`/`alignContent`/`gridAutoRows` are never added,
confirmed by reading the full object (no occurrence of any of the four names in that block).

**Classification: REAL.** Standard CSS Grid alignment properties, static, visibly change badge
layout the moment the grid has slack space or multiple rows — exactly the class of property the
canvas should reflect.

**Narrowest fix, clears 4:** Add the four properties to the same `blockProps.style` object at
`trust-bar/edit.js:341-345`, gated the same way `gridTemplateColumns`/`gap` already are
(`showBadgeGrid ? {...} : {}`), using the same fallback defaults block.json declares. One
four-line addition to an object that already exists — cheapest fix in this report.

---

### 4. ResponsiveBoxControls canvas-preview gap — 6 findings
**Blocks:** sgs/site-footer-row (3), sgs/site-header-row (3).
**Attrs, all per-tier objects (`{desktop,tablet,mobile}`):** `margin`, `maxWidth`, `contentWidth`.

**Evidence.** Both blocks mount the shared `ResponsiveBoxControls`
(`components/ResponsiveBoxControls.js:78,94-166`), which destructures `padding, margin, maxWidth,
contentWidth` and writes all four via the `ResponsiveOverride` device switcher — but only reads
`padding` back for anything (there's no local preview logic in this file at all; it's a pure
inspector panel). `site-header-row/edit.js` (read in full) already builds a `paddingPreview` from
`attributes.padding.desktop` (lines ~180-197) and applies it in `blockProps.style` — but never
touches `margin`, `maxWidth`, or `contentWidth`. `site-footer-row/edit.js` is the structural twin
(same shared components, same pattern) with the same gap. Frontend: `render.php` for both blocks
delegates entirely to `SGS_Container_Wrapper::render()`, which (per the background-family
evidence above and its own padding/margin/max-width emission) paints all three attrs on the
outer/inner elements.

**Classification: REAL.** All three are static layout properties with a full-time visible effect
(not scroll-gated) — a client setting a max-width or content-width on a header/footer row expects
to see the row narrow immediately, the same as padding already does.

**Narrowest fix, clears 6:** Extend the existing `paddingPreview`-style logic in both blocks'
`edit.js` to also resolve `margin.desktop` (→ `marginTop/Right/Bottom/Left`), `maxWidth.desktop`
(→ `maxWidth` CSS + auto side-margins, matching how the wrapper centres it), and
`contentWidth.desktop` (→ a max-width on the inner content, or the CSS class the frontend already
uses for content-width tokens — check `class-sgs-container-wrapper.php`'s content-width class
names before choosing). Since both row blocks are structurally identical here, a single shared
`useResponsiveBoxPreview(attributes, previewTier)` hook (sibling to the group-1 background hook)
would clear both blocks' 3 findings each from one function.

---

### 5. multi-button childBtn* canvas-preview gap — 6 findings
**Block:** sgs/multi-button only.
**Attrs (all flat strings):** `childBtnBackground`, `childBtnTextColour`, `childBtnBorderColour`,
`childBtnBorderRadius`, `childBtnFontSize`, `childBtnFontWeight`.

**Evidence.** `multi-button/edit.js:95-100` destructures these and writes them via controls at
lines 427-460 — never read elsewhere in the file. `render.php:252-268` emits them as CSS custom
properties on the block's own wrapper (`--sgs-mb-btn-bg-default`, `--sgs-mb-btn-color-default`,
`--sgs-mb-btn-border-default`, `--sgs-mb-btn-radius-default`, `--sgs-mb-btn-font-size-default`,
`--sgs-mb-btn-font-weight-default`), which `button.css`'s own selectors read as a SECOND-tier
fallback for `--sgs-btn-bg` etc. — i.e. "defaults every unstyled child `sgs/button` inherits from
its multi-button parent." `multi-button/edit.js:130-134`'s `editorStyle` object (the only style
object built for the canvas) contains none of the six custom properties.

Note: this block also has a genuinely different, unrelated mechanism — "Apply to all buttons"
(`applyPresetToAllButtons`, L121-126) — which writes preset values directly onto each child
button's own attributes via `updateBlockAttributes`. That's a one-time push, not a live default,
and it already shows in canvas because it edits the children directly. It does not substitute for
the missing `childBtn*` cascade default, which only matters for buttons that have NOT had a
preset explicitly applied.

**Classification: REAL.** Same "CSS-custom-property cascade contract painted server-side, never
mirrored to canvas" root cause as group 1, just block-local rather than shared-panel-sourced.

**Narrowest fix, clears 6:** Add the six `--sgs-mb-btn-*-default` custom properties to
`multi-button/edit.js`'s `editorStyle` object (line ~130), copying `render.php:252-268`'s
condition (`'' !== value`) verbatim. No new CSS needed — `button.css`'s fallback chain already
reads these var names; only the parent wrapper isn't emitting them in the editor.

---

### 6. trust-bar iconColourGradient preview gap — 1 finding
**Block:** sgs/trust-bar only.
**Attr:** `iconColourGradient` (flat string; "non-empty wins over `iconColour`" per block.json's
own description).

**Evidence.** Written via `DesignTokenPicker`'s gradient slot (`trust-bar/edit.js:801-814`,
`onGradientChange` → `setAttributes({ iconColourGradient: ... })`). The icon-circle preview
component only computes `iconColourValue = colourVar(iconColour) || 'currentColor'`
(`trust-bar/edit.js:300`) — it never checks `iconColourGradient`, so a client who sets a gradient
icon colour sees the flat colour (or nothing) in the canvas while the frontend correctly paints
the gradient (block.json's own docstring confirms "wins at render time", and this mirrors the
exact `backgroundPaintPreview()`-style "gradient wins over flat" pattern already implemented
elsewhere in the codebase for other colour pairs, e.g. `container/edit.js:171-177`).

**Classification: REAL.** Confirmed by the codebase's own established convention for this exact
class of attribute pair (flat + sibling gradient) elsewhere — this is the one spot that omitted
it, not an intentional non-preview.

**Narrowest fix, clears 1:** In `trust-bar/edit.js`, replace the `iconColourValue` line with the
same `backgroundPaintPreview`/`textPaintPreview`-style resolution used in `container/edit.js`
(gradient wins over flat when present).

---

### 7. sgs/icon textAlign preview gap — 1 finding
**Block:** sgs/icon only.
**Attr:** `textAlign` (flat string, enum `''|left|center|right|justify`, `''` = inherit).

**Evidence.** `icon/edit.js:121` destructures `textAlign` from a control at L355-358, but the
`previewStyle` object (L148-165) — which already handles colour/size/shape/hover as CSS custom
properties — never includes it, and it's absent from the `className` builder (L129-138) too.
`render.php:130-133,245-246` applies `text-align:<value>` when set. `container/edit.js`'s own
comment (L252-256) explicitly names `sgs/icon` and `sgs/info-box` as blocks that "mirror the
identical list" for this exact attribute, so the framework's own documentation treats this as a
property that should be visible.

**Classification: REAL.** Static CSS property, directly analogous to the brief's own
`backgroundRepeat` worked example.

**Narrowest fix, clears 1:** Add `textAlign: textAlign || undefined` to `previewStyle` in
`icon/edit.js`.

---

## Artefacts (10 findings) — canvas correctly should not (or cannot meaningfully) show these

### A. Row scroll-behaviour family — 8 findings
**Blocks:** sgs/site-footer-row (4), sgs/site-header-row (4).
**Attrs, all tier-shaped tri-state objects (`{desktop,tablet,mobile}`, values `on`/`off`/`inherit`):**
`rowTransparent`, `rowHideOnScroll`, `rowShrink`, `rowShrinkHideTarget` (the last is a flat anchor
string, not tri-state, but travels with the same group).

**Evidence.** All four are written by the shared `RowScrollBehaviourControls`
(`components/RowScrollBehaviourControls.js`), mounted identically by both blocks
(`site-header-row/edit.js` L558-563, and the structural twin in site-footer-row). The component's
own docblock (L1-26) and in-panel copy are explicit that these are scroll-triggered runtime
effects (transparent-until-scrolled, hide-on-scroll, shrink-on-scroll) — not resting-state visual
properties. Crucially, the block's OWN UX already treats this as something the canvas should not
auto-show: `RowScrollBehaviourControls.js:307-323` ships a manual **"Show me the shrunk size"**
toggle with help text *"Affects this preview only — it changes nothing on your live site"*, wired
through `previewShrunk`/`setPreviewShrunk` state passed down from `site-header-row/edit.js`
(L165-166, `paddingPreview` halving logic). That is a deliberate, already-built, opt-in simulation
control — the team has already made and implemented the design call that these effects need a
manual "show me" gesture rather than always-on rendering.

**Classification: ARTEFACT.** This is the brief's own `bgParallax` worked example, generalised:
a static canvas legitimately should not animate/transition a scroll-triggered effect by default,
and this codebase already ships the correct UX pattern (opt-in preview toggle) for the one of the
four (`rowShrink`) where a static snapshot is meaningful at all. `rowTransparent`/
`rowHideOnScroll`/`rowShrinkHideTarget` don't have — and don't obviously need — an equivalent
toggle, because there's no single "shrunk" analogue snapshot to show (transparent-vs-solid and
hidden-vs-visible are the *whole* two-state behaviour, not a size to preview).

### B. site-header headerTransparentDirection — 1 finding
**Attr:** `headerTransparentDirection` (enum `transparent-first`/`solid-first`).

**Evidence.** `site-header/edit.js:955-1000` — this control only decides WHICH of two
scroll-triggered states (transparent, solid) applies BEFORE vs AFTER the visitor scrolls; it has
no effect on the header's resting appearance by itself. `isTransparentOn`
(`site-header/edit.js:479`) is used only to gate which inspector controls are shown
(L955,1064) — never to build a canvas style — meaning the base `headerTransparent` toggle
already has no static preview either (out of scope here, not in netNew, but relevant context: the
whole transparent-header feature is scroll-simulation territory, not just this one attr).

**Classification: ARTEFACT.** Same reasoning as group A — a sequencing choice between two
scroll-triggered states cannot be shown meaningfully on a canvas with no scroll position, and
this codebase's established pattern for that situation (per group A) is an explicit opt-in
simulate control, not always-on rendering.

### C. nav-drawer ariaLabel — 1 finding
**Attr:** `ariaLabel` (flat string).

**Evidence.** `nav-drawer/edit.js:143,284-285` writes it via a `TextControl`; `render.php:577-578`
uses it purely as the HTML `aria-label` attribute on the drawer's close button
(`render.php:596`) — a screen-reader-only accessible name with zero visual paint. No CSS, no
class, no layout effect anywhere in the render path.

**Classification: ARTEFACT.** A pure accessibility attribute has no visual representation to show
by design — flagging its absence from the canvas as a defect would be asking the canvas to
visualise something that is, correctly, invisible to sighted users.

---

## Per-tier responsive-object findings (flagged per brief instruction)

Findings whose attribute is a `{desktop,tablet,mobile}`-shaped object — a canvas showing only the
desktop tier is a distinct, narrower class of gap than a fully-flat attribute:

| Attr | Block(s) | Classification | Note |
|---|---|---|---|
| `margin` | site-footer-row, site-header-row | REAL | proposed fix reads only `.desktop` tier, same as the existing `padding` preview already does — matches established pattern, not a new gap class |
| `maxWidth` | site-footer-row, site-header-row | REAL | same as above |
| `contentWidth` | site-footer-row, site-header-row | REAL | same as above |
| `gridItemPadding` | trust-bar | REAL | object shape is `{desktop:{...}}` only (no tablet/mobile keys declared in the default) — narrower than the full 3-tier case, effectively "desktop-only by design" already |
| `gridItemBorderRadius` | trust-bar | REAL | same shape note as `gridItemPadding` |
| `rowTransparent` | site-footer-row, site-header-row | ARTEFACT | tri-state tiers, not a size/colour tier — see Artefact A |
| `rowHideOnScroll` | site-footer-row, site-header-row | ARTEFACT | see Artefact A |
| `rowShrink` | site-footer-row, site-header-row | ARTEFACT | see Artefact A |

No REAL finding in this scope needs anything beyond a desktop-tier preview to close — every
proposed fix above already scopes to `.desktop`, matching the existing `padding`/
`gridTemplateColumns` preview conventions in these same files. None require building tablet/mobile
canvas simulation (WP's device-type toggle already switches `previewTier`, which the fixes should
read the same way the existing padding/grid previews do).

---

## Summary for dispatch

| Root cause | Findings cleared | Fix scope |
|---|---|---|
| 1. BackgroundPanel canvas-preview gap | 85 | Extract container/edit.js's background-preview logic into one shared hook; wire into 5 edit.js files |
| 2. GridItemDefaultsPanel canvas-preview gap | 15 | Apply `--sgs-gi-*` vars to trust-bar's 2 item-editor components |
| 3. LayoutPanel grid-alignment gap | 4 | 4-line addition to trust-bar's existing grid style object |
| 4. ResponsiveBoxControls canvas-preview gap | 6 | Extend site-header-row/site-footer-row's existing padding-preview pattern to margin/maxWidth/contentWidth |
| 5. multi-button childBtn* gap | 6 | 6-line addition to multi-button's existing editorStyle object |
| 6. trust-bar iconColourGradient gap | 1 | Reuse container's gradient-wins-over-flat pattern |
| 7. icon textAlign gap | 1 | 1-line addition to icon's existing previewStyle object |
| **REAL total** | **118** | 7 fixes, 2 of which (1 and 4) are shared-hook extractions that also de-duplicate 3 blocks' worth of copy-paste risk |
| A. Row scroll-behaviour (artefact) | 8 | No action — matches existing "Show me the shrunk size" opt-in pattern |
| B. headerTransparentDirection (artefact) | 1 | No action — scroll-sequencing attr, no static state to show |
| C. nav-drawer ariaLabel (artefact) | 1 | No action — pure accessibility attr, correctly invisible |
