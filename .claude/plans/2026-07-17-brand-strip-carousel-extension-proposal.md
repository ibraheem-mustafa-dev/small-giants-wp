---
doc_type: proposal
project: small-giants-wp
subject: sgs/brand-strip carousel extension — gap analysis vs Spectra Image Gallery + proposal
status: DRAFT — for adversarial-council review BEFORE any build
author: Claude (coordinator), 2026-07-17
decision_locked: "Option 2 (lean carousel motion) + optional per-logo name caption — Bean, 2026-07-17"
---

# Brand-Strip Carousel Extension — Gap Analysis + Proposal

## 0. Why this doc exists
The Indus original renders its "Our Brands" logo row with **Spectra Image Gallery** in carousel mode (a slide-by-slide carousel with two independent speeds). Our clone used `sgs/brand-strip`, which is currently a **constant CSS marquee** only. Bean's requirement: make `sgs/brand-strip` able to mirror that slide-carousel behaviour — but WITHOUT bloating a specialised block or duplicating a carousel we already have.

**Key constraint discovered mid-analysis:** `sgs/gallery` ALREADY implements a grid+carousel (autoplay, arrows, dots, `carouselSpeed` in ms, imageSize presets, lightbox, captions, columns-per-breakpoint, aspectRatio). So the carousel engine is not missing from SGS — it is missing from `brand-strip`.

**Locked decision (Bean, 2026-07-17):** Option 2 — add a LEAN carousel *motion* mode to `brand-strip` (only controls that serve the brand-logo use case), reusing gallery's engine where feasible; keep the photo-specific kit (lightbox, imageSize presets, aspect-grid) OUT — that stays gallery's job. Exception: an OPTIONAL per-logo **name caption** is included (symbol-only logos need a recognisable/accessible name).

This doc is the artefact for an adversarial-council pre-build review. Nothing is built until the council reports.

---

## 1. Block roles (the specialisation boundary)
- **`sgs/brand-strip`** = the *brand-logo* specialist. Its differentiators vs gallery: uniform equal-height logo TILES, white card background, greyscale→colour-on-hover, endless marquee motion. Domain = "a row of brand/partner logos."
- **`sgs/gallery`** = the *photo* specialist. Differentiators: lightbox, captions overlay, aspect-ratio grid/masonry, imageSize presets. Domain = "a gallery of photographs."

The filter for every proposed control is therefore: **"does this serve the brand-logo use case?"** — NOT "does Spectra have it?"

---

## 2. Control inventory — three-way comparison

### A. Spectra Image Gallery (the original's block — from Bean's screenshots)
- **Type:** Grid | Masonry | Carousel
- **Carousel panel:** Starting Image · Transition Speed (ms) · Crop Images to Squares · Infinite Carousel · Display Dots · Display Arrows · Autoplay · Autoplay Speed (ms) · Pause on Hover
- **Columns / slides-to-show** (per breakpoint)
- **Image Size:** Thumbnail | Medium | Large | Full (4 presets only)
- **Click event:** None | Lightbox | Open image in new tab | Custom URL
- **Image panel:** Hover Zoom · Zoom Type · Blur Overlay · Effect (None | Grayscale | Sepia) · Gap between images
- **Border** (style/width/radius/colour) · **Box Shadow** · **Caption** · **Spacing**

### B. `sgs/brand-strip` — current (21 native attrs + shared extensions)
- **Motion:** `scrolling` (marquee on/off) · `scrollSpeed` (slow|medium|fast — 3 PRESETS ONLY) · `scrollDirection` (left|right) · `fadeEdges` + `fadeWidth`
- **Logo treatment:** `logos[]` (each `{image:{url,id,alt}, name}`) · `maxHeight` (PX — fine-grained) · `greyscale` (bool)
- **Hover:** `effectHover` · `borderColourHover` · `backgroundColourHover` · `textColourHover` · `transitionDuration` · `transitionEasing` + shared hover extension (`sgsHoverImageZoom`, `sgsHoverScale`, `sgsHoverShadow`, `sgsHoverBorderColour`, `sgsHoverGrayscale`, `sgsHoverTilt3D`)
- **Layout/other (shared extensions):** per-breakpoint padding/margin/borderRadius · `sgsAnimation*` · `sgsBlockLink` · visibility conditions · `sgsCustomCss` · `sgsMaxWidth` · `sgsHeight*`

### C. `sgs/gallery` — already has a carousel (reuse candidate)
- `layout` (grid) · `layoutMode` · `carouselAutoplay` · `carouselShowArrows` · `carouselShowDots` · `carouselSpeed` (ms, default 5000) · `columns`/`columnsTablet`/`columnsMobile` · `imageSize` (presets) · `enableLightbox` · `showCaptions`/`captionReveal`/`captionBgColour`/`captionColour` · `aspectRatio` (1/1 = crop-to-square equivalent) · `effectHover`/`grayscaleHover`/`imageZoomHover` · `gap`/`gapTablet`/`gapMobile`

---

## 3. Gap analysis (filtered by brand-logo use case)

### 3a. Spectra HAS, brand-strip LACKS — and it SERVES logos → **ADD**
| Spectra control | Serves logos? | Proposed brand-strip attr |
|---|---|---|
| Type = Carousel (slide-by-slide) | YES (the original IS one) | `displayMode: marquee | carousel` |
| Transition Speed (ms) | YES | `transitionSpeed` (number, ms) |
| Autoplay + Autoplay Speed (ms) | YES | `autoplay` (bool) + `autoplaySpeed` (number, ms) |
| Slides-to-scroll per activation | YES (Bean asked) | `slidesToScroll` (number) |
| Slides-to-show (visible count, responsive) | YES | `slidesToShow` (+ tablet/mobile) |
| Display Dots / Arrows | YES | `showDots` / `showArrows` (bool) |
| Infinite | YES | `infinite` (bool) |
| Pause on Hover | YES | `pauseOnHover` (bool) |
| Crop to Squares | YES (uniform tiles) | `cropSquares` (bool) |
| Effect adds Sepia | MINOR yes | upgrade `greyscale` bool → `imageEffect: none|grayscale|sepia` (back-compat migrate) |
| Click event: Custom URL | YES (link to brand page) | per-logo `linkUrl` (+ `linkTarget`) — likely already partly via `sgsBlockLink`; needs PER-LOGO not block-level |
| Caption (name) | YES (symbol-only logos) — **Bean override** | `showNames` (bool) + reuse each logo's `name` as an optional visible label; optional position |

### 3b. Spectra HAS, brand-strip LACKS — but does NOT serve logos → **SKIP (gallery's job)**
- Lightbox · Open-image-in-tab · full caption OVERLAY system (bg/reveal/colour) · imageSize presets (we use px) · Masonry · Blur Overlay · Zoom Type variants · aspect-ratio grid.

### 3c. brand-strip HAS, Spectra LACKS — **KEEP (our advantages, do not downgrade)**
- `maxHeight` in PX (finer than Spectra's 4 size presets) · `scrollDirection` · `fadeEdges` (marquee edge fade) · full `sgsHover*` suite (tilt-3D, scale, shadow) · animation extension · visibility conditions · custom CSS · per-breakpoint spacing · uniform-tile + greyscale-hover logo treatment.

### 3d. Both have, but GRANULARITY differs
| Dimension | Spectra | brand-strip now | Verdict |
|---|---|---|---|
| Motion speed | ms | 3 presets | Spectra finer → add ms (`transitionSpeed`/`autoplaySpeed` for carousel; consider a custom-ms option for marquee too) |
| Image size | 4 presets | px (`maxHeight`) | brand-strip finer → KEEP px |
| Effect | none/grayscale/sepia | greyscale bool | Spectra finer → upgrade to select |

---

## 4. Proposal (Option 2 — lean carousel motion)

**4.1 Two motion modes via `displayMode`:** `marquee` (current endless CSS scroll, default, back-compat) | `carousel` (new slide-by-slide). Editor shows carousel controls only when `displayMode = carousel`; marquee controls only when `marquee`.

**4.2 New carousel attributes** (all namespaced/gated to carousel mode): `transitionSpeed` (ms), `autoplay` (bool), `autoplaySpeed` (ms), `slidesToScroll` (n), `slidesToShow` (+ tablet/mobile), `showDots`, `showArrows`, `infinite`, `pauseOnHover`, `cropSquares`.

**4.3 Shared upgrades (both modes):** `greyscale` (bool) → `imageEffect` (none|grayscale|sepia) with a deprecation-free migration (map stored `greyscale:true` → `imageEffect:'grayscale'` at render, per the no-deprecations policy); optional `showNames` caption reusing each logo's `name`.

**4.4 Engine reuse:** the carousel slide logic (autoplay timer, transition, dots, arrows, pause, infinite, slidesToShow/Scroll, keyboard + aria) should REUSE `sgs/gallery`'s existing carousel `view.js` engine rather than duplicating it — extract a shared module if the two blocks' markup allows. The CSS marquee path is untouched.

**4.5 Accessibility (non-negotiable, WCAG 2.2):** carousel must ship with — a visible pause/play control (2.2.2 pausing moving content), keyboard-operable arrows/dots, `aria-live` handling, prefers-reduced-motion freeze, 44px touch targets on controls, focus-visible states.

**4.6 Explicitly OUT of scope:** lightbox, imageSize presets, caption overlay system, masonry/aspect grid — remain `sgs/gallery`.

---

## 5. Open questions FOR THE COUNCIL
1. **Engine reuse vs duplication:** is `sgs/gallery`'s carousel `view.js` cleanly extractable into a shared module, or is it coupled to gallery markup such that a lean brand-strip re-implementation is actually simpler/safer? Which is less total risk?
2. **Two blocks, two carousels:** does having carousel motion in BOTH gallery and brand-strip confuse the block roster / the cloning converter's block-type matching? Or is the domain split (logos vs photos) clear enough?
3. **`greyscale`→`imageEffect` migration:** under the no-deprecations policy, is a render-time value-map safe, or does it risk a silent mismatch (block.json enum coercion — cf. the D291/D328 coercion bugs)?
4. **Converter impact:** does adding `displayMode` change how the cloning pipeline recognises/emits brand-strips? Any `variant_slots`/`blocks.variant_attr` registration needed?
5. **Scope creep check:** is even Option 2 too much for a specialised block — should logo-carousels just be a documented `sgs/gallery` use case (Option 1) after all? Argue the strongest case against building this.
6. **A11y of an auto-advancing logo carousel:** is autoplay-by-default defensible, or must autoplay ship OFF with an opt-in (WCAG + user-annoyance)?
7. **Per-logo linkUrl:** brand-strip logos currently have no per-item link; adding `clickAction`/`linkUrl` per logo touches the `logos[]` item schema + render — is that in-scope for THIS extension or a separate change?

---

## 6. What is NOT decided here (defer to council + Bean)
- Exact attribute names / defaults (autoplay off vs on, default speeds).
- Whether marquee also gets a custom-ms speed or keeps 3 presets.
- Build sequencing vs the remaining Indus section-fidelity work.
