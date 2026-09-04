---
doc_type: design
title: The SGS Media Element — full architecture
date: 2026-08-30
status: PROPOSED — for adversarial council, then Bean's approval
owner: client-controls track
supersedes: the L0-L5 sketch in 2026-08-30-unified-media-element-design.md
---

# The SGS Media Element — full architecture

**Design stance (Bean, 2026-08-30):** *"Let's not just look for pre-existing stuff or precedences —
these need to directly suit and satisfy this implementation. Create the most optimal setup."*

So every mechanism below is chosen on merit. Reuse happens where a thing was purpose-built for this
job (`GradientOverlayControl` was made for background media). Where the existing approach is simply
what we happen to have, it is replaced.

---

## 0. What must be true when this is done

1. A media element is declared **once** and works on any block, at any insertion point.
2. Adding a control reaches **every** surface with **no per-block edit**.
3. Attributes, editor UI, canvas preview and front-end render **cannot drift**, structurally.
4. The emitted markup is **identical across surfaces**, because the cloning pipeline reads it.
5. A block that hand-rolls media controls **fails the build**.

⛔ **CORRECTION (2026-08-30) — the founding claim of this section was FALSE, caught by the
adversarial council's spec-lawyer seat.**

This section originally read: *"the framework already contains `sgs_tier_media_toggle_css()` — a
correct shared helper with zero callers."* **It has callers.** Verified:

```
includes/helpers-tier-media.php:267   $css .= sgs_tier_media_toggle_css( ... )
  <- called from sgs_tier_media_render()  (same file, :182)
     <- src/blocks/hero/render.php:1265
     <- src/blocks/timeline/render.php:748
```

My measurement searched only `src/blocks/*/render.php` — i.e. DIRECT block-level calls — then I
stated the result as though it covered all calls. The helper is called from the shared layer, which
is **correct encapsulation, not non-adoption**.

**The corrected diagnosis, which is narrower and differently shaped:** the shared renderer
`sgs_tier_media_render()` has **2 adopters (hero, timeline) out of ~9 candidate surfaces**, and
`sgs/media` hand-rolls its own duplicate (`render.php:484`, used at `:737` and `:1298`) rather than
calling it. The failure mode is **PARTIAL adoption — some blocks use the shared layer, others
hand-roll past it** — not "nobody adopts shared code."

**This strengthens the case for Gate 1 rather than weakening it**, because partial adoption is the
harder problem: a helper with zero adopters is visibly dead and gets deleted, whereas one with two
adopters looks healthy while the other seven surfaces quietly diverge. But the gate must be designed
for the real case — detecting a block that hand-rolls *past* an available helper — not for the
"nobody uses it" case as originally stated.

Point 5 is still the one that decides success. **Only a gate converts an available helper into a
standard.**

---

## 1. The ten dimensions

| # | Dimension | Owner |
|---|---|---|
| 1 | Attribute schema + naming | descriptor registry → codegen |
| 2 | Control descriptors | `src/media/controls/*` |
| 3 | Composition (sets / context / insertion) | `src/media/compose.js` |
| 4 | Editor UI + disclosure | `MediaElement.js` |
| 5 | Canvas preview | shared CSS builder (same input as front end) |
| 6 | Server markup | `Sgs_Media_Renderer` (HTML API) |
| 7 | Server CSS | `Sgs_Media_Styles` (Style Engine) |
| 8 | Front-end behaviour | Interactivity API store |
| 9 | Cross-layer consistency | generator + 4 gates |
| 10 | Migration of existing content | one codemod + one content migration |

---

## 2. Dimension 1 — attribute schema

### The descriptor is the single source of truth

```js
// src/media/controls/object-fit.js
export default defineControl( {
  key: 'objectFit',
  label: __( 'Fill style' ),
  control: 'select',
  options: FIT_OPTIONS,
  tiered: true,                      // emits <key>, <key>Tablet, <key>Mobile
  appliesTo: [ 'image', 'video', 'svg' ],
  css: ( v ) => ( { 'object-fit': v } ),
  gate: 'hasSource',
} );
```

One object yields: the block.json attribute fragment, the server-registered PHP schema, the editor
control, the canvas CSS and the front-end CSS. **Nothing may be re-declared by a block.**

### ⛔ Why NOT WordPress Block Supports — the obvious idiomatic choice, rejected on evidence

Block Supports is WP's own mechanism for controls shared across blocks, and it would be the default
answer. It **cannot express this problem**:

- **Supports are singleton per block.** One `spacing`, one `border`. `sgs/before-after` needs **two
  independent media elements**, and `sgs/hero` needs split media *plus* background media. A support
  cannot be instantiated twice with different prefixes.
- **Supports have no per-tier vocabulary.** Art direction needs `<key>Tablet`/`<key>Mobile` with
  inherit-upward; supports have no such concept.
- **Supports auto-serialise inline styles**, which Spec 32 forbids framework-wide.

**Verdict: custom registry, and the reasoning is recorded so this is not re-litigated.** Where a
support *does* fit an atom (border, shadow), the atom wraps the existing SGS control rather than
re-implementing it.

### Naming

`<prefix><Key><Tier>` — `splitMediaObjectFitTablet`, `beforeObjectFitTablet`, bare at root
insertion (`objectFitTablet`). Deterministic from the descriptor, so the cloning pipeline can
recognise a media element **by shape** rather than by a hardcoded name list.

---

## 3. Dimension 2 — the atoms

One file per setting, mirroring `colour-variants/*Row.js` (factory returning a descriptor, not JSX).

**Common presentation — applies to image, video AND svg:**
box-shape · object-fit · focal-point · padding · border+radius · opacity · shadow · alignment ·
max-width · **overlay** (colour, gradient, opacity ×3 tiers, blend mode)

**Meaning:** alt-text · decorative · caption · link

**Image-only:** lazy-load · ken-burns · parallax
**Video-only:** autoplay · loop · muted · controls · playsinline · poster · preload
**SVG-only:** svg-source · animation-source · path-draw

**Reused because purpose-built:** `GradientOverlayControl` (made for background media),
`FocalPositionField`, `SgsBorderControl`, `ShadowControl`, `MediaPicker`.
**Replaced:** `MediaSizingPanel`'s 13-prop interface (its *logic* is right; its interface is the
defect) and every hand-rolled tier-visibility closure.

---

## 4. Dimension 3 — composition, three orthogonal axes

```js
mediaElement( { prefix, context, insertion, mechanism, types } )
```

| Axis | Decides | Values |
|---|---|---|
| **context** | which controls apply | `root` · `element` · `backdrop` |
| **insertion** | panel vs rows, and prefixing | `root` · `element` |
| **mechanism** | how per-tier markup is emitted | `picture` · `sibling` · `naked` |

A context is an **array filter**. An exception is an entry added or removed — **never a fork**.

---

## 5. ⭐ Dimension 6 — markup, and a mechanism decision made on merit

### `<picture>` becomes the canonical image mechanism

The dominant current mechanism is **sibling markup + `display:none`**. It has an objective defect:
**a hidden `<img>` is still downloaded.** Three tiers means three files fetched, on mobile, to show
one.

`<picture><source media>` — which `responsive-logo` already uses — lets the browser fetch **only the
matching source**. It is native art direction, needs no CSS, and is what the platform provides for
exactly this problem.

⛔ **But it does not generalise to video.** The `media` attribute on `<source>` inside `<video>` is
not reliably re-evaluated on resize across browsers. **This is why `mechanism` is a real axis rather
than one global choice:**

| Type | Mechanism | Reason |
|---|---|---|
| image | `<picture><source media>` | native, single fetch, no CSS |
| video | sibling + Interactivity-driven swap | `<source media>` unreliable; needs a runtime |
| svg | inline, single node | markup is the payload; no fetch to optimise |
| naked (`decorative-image`) | conditional wrapper | the root IS the `<img>`; already-shipped precedent |

### Markup contract — the pipeline reads this

```html
<figure class="sgs-media" data-sgs-media="image">
  <picture class="sgs-media__source">…</picture>
  <div class="sgs-media__overlay"></div>
  <figcaption class="sgs-media__caption">…</figcaption>
</figure>
```

⛔ **Fixes a live defect:** `before-after` gives video and SVG the base class `__img`, so a BEM
reader keying on `__img` misclassifies them. Under this contract the element class is **invariant**
and the type lives in `data-sgs-media` — one attribute to read, no class-name inference.

**Built with the WP HTML Tag Processor**, not string concatenation — it is the platform's
correctness-guaranteed way to emit and amend markup, and it eliminates the escaping class of bug.

---

## 6. Dimensions 5 + 7 — CSS from ONE builder

`buildMediaCss( attributes, prefix )` is called by **both** the canvas and the server. Not "kept in
sync" — literally the same function, with the PHP side generated from the same descriptors.

Server-side declarations come from **`wp_style_engine_get_styles()`**, WP's canonical generator,
emitted into the block's scoped `<style>` (never inline — Spec 32).

**This structurally kills editor/front-end preview drift.** There is no second implementation to
drift from.

---

## 7. Dimension 8 — behaviour via the Interactivity API

Replaces every bespoke media runtime: `bootVideoSyncLayer`, lazy-load handlers, Ken Burns triggers.

One store, `sgs/media`, with declarative directives (`data-wp-on--`, `data-wp-watch`). It is the
platform standard from WP 6.5, ships once, and is SSR-aware. **`before-after`'s two-`<video>` sync
problem** — flagged as real engineering cost — becomes a derived-state subscription rather than
hand-written DOM tracking.

⚠ Honest risk: the Interactivity API is a different mental model from the current vanilla modules
and carries a learning cost. Named for the council.

---

## 8. Dimension 9 — the four gates that make it a standard

| Gate | Fails when |
|---|---|
| `media-no-handroll` | a block declares a media attribute or media CSS outside the registry |
| `media-attr-parity` | generated PHP schema ≠ JS descriptors |
| `media-markup-parity` | two surfaces emit different DOM for the same context+mechanism |
| `media-control-coverage` | a declared attribute has no control, or a control shows for a type it does not apply to |

Each ships with a **negative control** proving it does not overmatch. Without gate 1 this is another
`sgs_tier_media_toggle_css` — correct, shared, and used twice.

---

## 9. Dimension 10 — migration

1. **Codemod** — rewrites each surface's `edit.js`/`block.json`/`render.php` to the single mount.
   Survey → fix → check → self-test.
2. **Content migration** — `product-card.image` is a bare URL string with no attachment ID or tiers.
   This is the only step touching live data, so it ships **separately**, after the abstraction is
   proven, with a WP-CLI batch and `--user=1` (KSES strips CSS from block attrs otherwise).

---

## 10. Build order

1. Descriptor runtime + `defineControl` + generator + gate 2.
2. The atoms.
3. Composition + `MediaElement` + gate 4.
4. Server renderer + CSS builder + gate 3.
5. Interactivity store.
6. **Wire `sgs/media`** — first consumer, not the design driver.
7. ⭐ **The second-surface test: wire hero split media. It must need ZERO new shared code.** If it
   does not, the layer was shaped around `sgs/media` — say so and fix the layer.
8. Gate 1, then the codemod for the rest.

---

## 11. Named risks

| Risk | Honest position |
|---|---|
| Interactivity API learning cost | real; contained to dimension 8 |
| `<picture>` for video | does not work; hence the mechanism axis |
| `product-card` storage migration | touches live content; shipped separately |
| Descriptor list moves during build | expected; architecture does not depend on the final list |
| `before-after` video tier-sync | real engineering cost, not a mechanical copy |
| Codegen adds a build step | mitigated by precedent (`generate-extension-attributes.js`) + gate 2 |
