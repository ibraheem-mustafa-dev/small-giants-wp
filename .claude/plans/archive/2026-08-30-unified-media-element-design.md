---
doc_type: design
title: The unified media element — plug-and-play controls across every media surface
date: 2026-08-30
status: DESIGN — awaiting Bean's approval
owner: client-controls track
---

# The unified media element

## Why this exists

Three surfaces render media and **none of them agree**: `sgs/media` (root block), split media
(an element inside hero, and the same shape in product-card), and background media (behind
content). Measured this session, they differ in control set, panel structure, disclosure rules,
naming, enum UI, and even in whether a media *type* is stored at all.

**Bean's requirement (2026-08-30):**

> *"A unified set of controls that can be used for all of my library's media elements easily,
> plug and play style, not needing to be recoded into every instance."*
>
> *"Helper files for each control/setting/style so we can create helper variants for the overall
> element/block based on the context."*

## What already exists — this is a GENERALISATION, not an invention

⛔ **Do not build a new component library.** The atomic layer is largely built:

| Exists | Adopters | Role here |
|---|---|---|
| `MediaPicker.js` | 9 | media source selection |
| `MediaSizingPanel.js` (C19, 2026-08-27) | 5 | box shape → object-fit → focal point as one chain |
| `FocalPositionField.js` | — | focal point |
| `ResponsiveControl` / `ResponsiveOverride` | many | the per-tier (art-direction) machinery |
| `SgsBorderControl` (45) · `SgsColourPanel` (65) · `SgsBoxControl` · `SgsLengthControl` | many | style primitives, already standard |
| `extension-attributes.generated.php` + its `generate-extension-attributes` gate | — | ⭐ **precedent for GENERATING PHP from a JS declaration** |

**`MediaSizingPanel` is the pattern Bean is describing, already proven.** Its docblock even carries
the context mechanism in embryo:

> *"A future adopter that DOES have one passes `insetValue` + `onInsetChange` and the row appears;
> omitting them omits the row rather than rendering a broken control."*

### But it has exactly the weakness Bean named

Its signature is **13 hand-wired `value`/`onChange` props**. Every adopter re-wires all 13 by hand,
each block re-declares the attributes in its own `block.json`, and each re-implements the CSS in
its own `render.php`. **It is plug-and-play for the UI layer only** — the attribute, canvas and
front-end layers are still copied per block. That is precisely *"recoded into every instance"*.

## The design

### Principle: one control owns all FOUR layers, or the layers drift

Bean's ruling: *"from the attributes to the control UI to the canvas rendering to the live page
rendering… we don't need to continue to code this all in over and over."*

So each control is ONE module declaring four things, and a block may re-declare none of them:

```
src/media/controls/object-fit.js
  ├─ attributes( prefix )   → the block.json attribute fragment (incl. per-tier siblings)
  ├─ Control( ctx )         → the inspector UI
  ├─ editorCss( attrs )     → canvas styling, so the preview cannot drift from the front end
  └─ cssRules( attrs )      → the declarations the front end emits
```

**PHP cannot import a JS module, so the bridge is GENERATED, not disciplined.** The repo already
does this: `generate-extension-attributes` (gate 4) writes `extension-attributes.generated.php`
from a JS source of truth. The media controls use the same mechanism — one declaration, generated
into `block.json` fragments and a PHP render helper.

**A generator, not a convention, is what keeps four layers in step.** A convention is what we have
now, and it produced three incompatible surfaces.

### Layer 1 — control helpers, one file per control

From the union of the three surveyed surfaces:

`media-source` · `media-type` · `object-fit` · `focal-point` · `box-shape` (the existing C19 chain)
· `media-padding` · `media-border` · `media-radius` · `opacity` · `shadow` · `caption` · `link` ·
`alt-text` + `decorative` · `lazy-load` · `video-behaviour` (autoplay / loop / muted / controls /
playsinline / poster) · `svg-source` · `ken-burns` · `parallax` · `overlay`

⚠ **Provisional** — the exact union is the outstanding cross-cutting pass. The *architecture* does
not depend on the final list.

### Layer 2 — context variants (Bean's item 2)

A context declares which controls it includes **and why it excludes the rest**. Exclusions are
justified, never arbitrary — that is what makes "the core" mean something.

| Context | Used by | Excludes | Justification |
|---|---|---|---|
| `root` | `sgs/media` | — | Standalone, foreground, interactive. Everything, including player chrome. |
| `element` | split media, product-card media | — | Inside a composite. Same control set as `root`; differs only by attribute PREFIX and panel placement. |
| `backdrop` | background media | player chrome (controls, poster), caption, link | ⭐ **Bean's reason:** it sits BEHIND content. A visible player UI is meaningless there and would be un-clickable. Caption and link belong to foreground media. |

**Everything not excluded is CORE and identical across contexts.** A context may include or exclude
a control with a recorded reason. It may **never redefine a control's shape** — that is what
produced today's divergence.

### Layer 3 — block usage, the plug-and-play surface

```jsx
<MediaElement
    context="element"
    prefix="splitMedia"
    attributes={ attributes }
    setAttributes={ setAttributes }
/>
```

One mount, no per-control prop wiring. The block's `block.json` attributes come from the generator;
its `render.php` calls the generated PHP helper.

### Disclosure rules (Bean's D9, both directions)

1. **Nothing that styles media appears before media exists** — except genuinely generic controls.
2. **Type-specific controls appear only for that type** (Bean's ruling: video behaviour only when
   video is selected).
3. **Every attribute that exists has a control.** Measured violations today: 3 dead attributes on
   `sgs/media`; every background video behaviour hardcoded server-side with no control at all.
4. ⛔ **Gate on the CONTENT, never on a sibling.** Hero's bug is a content gate keyed to the wrong
   attribute — the media-type enum is gated on `splitImage?.url`, so video is unreachable without
   first uploading an unwanted image, while `render.php` supports image-free video perfectly well.

### Panel structure — C14 as Bean corrected it (2026-08-30)

1. **Group by ELEMENT — primary.** All of one element's controls in ONE panel. **Never split across
   the Settings/Styles tabs.**
2. Order element panels by DOM position — top to bottom, left to right at the same level.
3. WP-native ordering applies **only** to non-element/root panels, so we don't invent an order.
4. One exception: the global colour panel.
5. Visibility Conditions is permanently second-from-bottom; Advanced is last.

⚠ Measured: **16 of 84 blocks use both tabs**, and at least `hero`, `option-picker` and
`product-card` split a single element across them (`product-card` spreads its Card element over
five panels in two tabs). Lower bound — detected by title matching, so elements split under
unrelated names are not counted.

### Art direction is a PIPELINE CONTRACT, not a preference

Bean: *"the reason we chose art direction is because it's easy for the cloning pipeline to
recognise and match… make sure our markup/architecture in the block is unified too."*

- Media type and every media-type-tied control are **per-tier with inherit-upward**. Hero's shape
  wins; `sgs/media`'s flat scalar is the outlier.
- **The emitted MARKUP must be identical across contexts** — same element structure, same class
  convention, same per-tier mechanism. Attribute-name parity alone is not enough: a surface storing
  per-tier attributes while emitting a different DOM defeats the reason the shape was chosen.
- **This is testable, so it becomes a gate**, not a guideline.

## Rollout

1. **Build the helper layer + generator**, with `sgs/media` as the reference conversion — the
   THE-MIGRATION-METHOD step of settling the target shape on one instance first.
2. **Bean's eye on the reference** before anything else moves.
3. **Codemod the rest** — split media, product-card media, background media, then the wider
   `<img>`-rendering population.
4. **Gates:** markup parity across contexts · every attribute has a control · no control before
   content · no element split across tabs.

## Population — CORRECTED after Bean challenged the 3-surface scope (2026-08-30)

The design above was written from THREE surfaces. Bean asked what about the rest. Measured:
**31 blocks emit media markup; 15 declare client-selectable media.** Two further surveys (M4, M5)
covered the gap. Final scope:

| Context | Surfaces | Note |
|---|---|---|
| `root` | `sgs/media` · `responsive-logo` | logo is root by POSITION but uses `<picture><source media>` |
| `element` | hero split media · `product-card` · `before-after` (**two** slots) | |
| `backdrop` | background media · `decorative-image` | decorative-image is "naked" — the root IS the `<img>` |

**Excluded, with reasons — not forced to fit:**
- **`info-box` — NOT a media surface.** Its `mediaType`/`image`/`icon` attributes are DEAD back-compat
  cruft; `render.php:35-36` says so in its own words (*"no longer read here… retained"*). Real media
  selection is delegated to a CHILD `sgs/media` block (`edit.js:217-219` writes
  `mediaType: image|video|svg` onto the child). ⛔ **This dissolves the "name collision" hazard I
  raised** — the dead attribute carries an `icon|emoji|image` vocabulary, but nothing reads it, and
  the live path already uses the standard vocabulary. **info-box is the delegation model working.**
  Action: delete the dead attributes, not reconcile them.
- **`image-sequence` — agency-only** (`inserter: false`, requires an ffmpeg CLI). Excluding is
  better than distorting a client-facing standard around it.

### ⭐ Architectural refinement — CONTEXT and DOM MECHANISM are separate axes

`responsive-logo` is `root` by position yet renders `<picture><source media>`, a structurally
different mechanism from every other surface. **My original contexts conflated "where it sits" with
"how it renders".** They are orthogonal:

- **Context** (root / element / backdrop) decides WHICH CONTROLS apply.
- **Mechanism** (sibling-markup + `display:none` · `<picture><source>` · naked root element)
  decides HOW the per-tier markup is emitted.

The standard must name the mechanism explicitly per surface rather than assuming one. `<picture>`
is arguably the better mechanism and should be evaluated on merit, not excluded for being different.

### Two hard cases the standard must survive

1. **`before-after` — TWO media elements in one block**, driven by one parameterised
   `MediaSlotPicker` + `sgs_before_after_resolve_media()`. **It is the CLEANEST implementation
   found** (0 uncontrolled attrs, correct type gating, symmetric slots) — a model to generalise, not
   a problem to fix. Carry forward: its custom-property-VALUE colour emission, and its slot symmetry.
   ⛔ Its image side is per-tier but **video/SVG are flat**, and extending video is NOT a mechanical
   copy — `bootVideoSyncLayer` would need to track which tier-pair is visible. Real cost.
2. **`decorative-image` — naked mode**, and there is already a shipped precedent for what breaks:
   `fx-surface-treatment.js`'s `querySelector('img')` silently no-ops on itself, and a `<canvas>`
   cannot be appended inside a void `<img>`. The block now forks into a conditional wrapper only when
   a treatment is active. **A shared helper using descendant selectors must handle this or reuse that
   fork.**

### Markup defects already found (the pipeline contract)

- **`before-after` gives every media type the base class `__img`** (video/svg only ADD `__video`/
  `__svg`). A cloning-pipeline BEM reader keying on `__img` misclassifies video and SVG as images.
- **`product-card`'s image is a bare URL string** — no attachment ID, no tiers — and in bound/live
  modes it is an override-over-live-product-data, a THIRD storage shape. The standard needs a
  position on it.

### C14 tab-split — corrected count

⛔ **`SgsColourPanel.js:116` hardcodes `group="styles"` framework-wide (65 blocks). That is Bean's
SANCTIONED EXCEPTION, not a violation** — M4 scored it as one, and my own earlier "16 blocks, a whole
class" included every block that merely mounts the colour panel. Filtering to NON-colour panels in
the Styles tab: **15 candidates, 3 individually confirmed** (`hero`, `option-picker`,
`product-card`). The other 12 need per-block confirmation that the SAME element also has Settings
controls — the test used does not prove that. **Do not scope work from the 15.**

## THREE AXES, not two (Bean's correction, 2026-08-30)

I had context and mechanism. **Insertion is a third, and it is orthogonal to both.**

| Axis | Decides | Values |
|---|---|---|
| **Context** | WHICH controls apply | `root` · `element` · `backdrop` |
| **Mechanism** | HOW per-tier markup is emitted | sibling + `display:none` · `<picture><source>` · naked root |
| **Insertion** | WHERE the panel goes, and the attribute prefix | `root` · `element` |

**Insertion — Bean's point:** on `sgs/media` the controls apply at ROOT level (the block IS the
media). On every other surface they apply to ONE PARTICULAR ELEMENT and must be grouped with it.

| | Root insertion | Element insertion |
|---|---|---|
| Panel | IS the block's own panel | one element panel among several |
| Surfaces | `sgs/media` · `decorative-image` · background media | hero split · `product-card` · `before-after` x2 |
| Placement | top level | by DOM order (C14), grouped with its element |
| Prefix | bare (`imageUrl`) | prefixed (`splitMediaImageUrl`, `beforeImageUrl`) |

⛔ **Proof the axes are independent:** background media is **`backdrop` context but ROOT insertion**
— it applies to the whole block, not to one element inside it.

**Cost: one flag.** Root insertion returns a whole panel; element insertion returns ROWS that the
parent element panel absorbs — the same caller-decides-placement contract as `SgsColourPanel({rows})`.

## ⛔ OVERLAY — omitted from my first inline breakdown, Bean caught it

**8 attributes, and they belong in the COMMON PRESENTATION set** (they apply over image, video and
SVG alike):

`backgroundOverlayColour` + `Hover` · `overlayGradient` + `Hover` ·
`backgroundOverlayOpacity` + `Tablet` + `Mobile` · `backgroundOverlayBlendMode`

Controls: `GradientOverlayControl` (gradient-capable colour) + `ResponsiveControl`-wrapped opacity +
a blend-mode select. **Overlay opacity is ALREADY tiered**, so it is art-directed exactly as the
standard requires. It is also the LARGEST property in the tier-migration survey (8 block-touches).
Its own help text ties it to media: *"Lower it to let an image or video behind show through."*

It was in the design doc's provisional L1 list and I dropped it from the inline L2/L3 breakdown.
A plain miss, not a judgement call.

## `sgs/product-card` — Bean's ruling (2026-08-30)

**Typed mode:** convert the image to the unified setup.
**Bound mode:** replace the `Override image` boolean-plus-single-upload with the SAME panels as the
typed side, identical functionality.

**Why this is a small change:** `ContentOverridesPanel` (bound-only) already means *"toggle ON
reveals the typed control beneath; OFF hides it but PRESERVES the value; an empty override never
blanks the card."* Bean's change swaps ONE FIELD for THE WHOLE MEDIA ELEMENT under the same
semantics. No new concept, and it deletes the asymmetry where bound mode gets one upload button.

⚠ **The real cost is storage, not UI.** `product-card.image` is a **bare URL string** — no attachment
ID, no alt pairing, no tiers — and in bound mode it is an override over live product data. The
unified setup assumes id/url/alt. **This is a content migration on existing cards.**

### ✅ Variation photos — NOT a precedence problem (Bean, 2026-08-30)

I asked whether a variation photo should override the art-directed tier. Bean:

> *"Variation photos are a separate mechanism, they are something the user willingly sets. If we
> don't want variations to change the image we just don't need to set them."*

**So there is no precedence rule to design.** They are two independent opt-in choices: a variation
swaps WHICH asset is displayed; the tier machinery styles whatever asset is currently displayed. A
client wanting strict art direction simply does not set variation photos. ⛔ Do not invent a
conflict-resolution layer here.

## Open, and not guessed at

- **The exact control union** — needs the cross-cutting pass over the three inventories.
- **`sgs/media`'s video/SVG panels reportedly rendering BELOW Visibility Conditions** — not
  reproducible statically; all its panels sit in one `<InspectorControls>`, which should render
  above the extension's. Needs a live editor check, not a theory.
- **Whether `backdrop` keeps Ken Burns / parallax.** Both are image-only by their own help text,
  yet are currently always visible there — even with no image, and even when only a video is set.
