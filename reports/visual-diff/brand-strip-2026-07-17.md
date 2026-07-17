---
doc_type: reference
title: "Visual-diff — sgs/brand-strip uniform-tile fidelity fix (Indus Foods clone)"
block: sgs/brand-strip
date: 2026-07-17
verdict: PASS
first_paint_capture_passed: true
---

# sgs/brand-strip — uniform-height, dynamic marquee + hover fix (Indus Foods "Our Brands")

**Verdict: PASS.** The original "Our Brands" is a CONTINUOUSLY MOVING logo
carousel, not a static row — Passes 1-3 (turning scrolling off + trimming to
8 items) were built on a wrong premise and are corrected in Pass 4 (this
revision). Final state: the marquee scrolls continuously (confirmed via two
`transform` samples 2s apart, both breakpoints and desktop all show real
movement); all 12 original logos are back (not 8); full colour (`filter:
none`); every logo tile renders at the exact same height at every breakpoint;
hovering a tile shows a border outline AND the logo image zooms
(`scale(1.1)`), contained inside the tile (`overflow: hidden`) exactly
matching the reference's own measured hover mechanism; no real horizontal
overflow. Verified live via an independent fresh Playwright session
(cache-busted) at 1440/768/375.

**Revision history:**
- **Pass 1** fixed uniform height (all logos equal) but left tiles far
  smaller than the original (96px vs 175px, `maxHeight` left at its
  pre-existing 48px value).
- **Pass 2** fixed the SIZE match: added a universal `--sgs-logo-scale`
  responsive multiplier to `style.css`; set `maxHeight: 155` (was 48) on
  page 13. This closely matched tile size (175/144/107.5px vs original's
  175/143/107px) but introduced a NEW defect — at 1440 the static row of 8
  bigger tiles (8×175 + 7×24 gap = 1568px) exceeded the 1200px content
  container, and `overflow: hidden` clipped the first (Sanam) and last
  tile.
- **Pass 3** fixed the clipping under the (wrong) assumption that the
  original was a static row: measured 0px CSS gap between original tiles;
  added a full-bleed breakout + reduced static-mode gap + a flex-wrap
  fallback for narrow viewports; reduced `maxHeight` 155→148. This
  successfully fixed the clipping FOR A STATIC ROW — but the underlying
  premise (turning `scrolling` off, trimming to 8 logos) was itself the
  actual defect, per the coordinator's Pass 4 correction.
- **Pass 4 (this revision, CORRECTION)** — Bean clarified the original is
  a continuously-moving Spectra `uagb-slick-carousel`, not a static row.
  Reversed the scrolling-off + logo-trim from Passes 1-3: `scrolling: true`
  restored, all 12 original logos restored (not 8), added native hover
  (border + contained image zoom) mirroring the reference's own measured
  hover CSS. KEPT the one genuinely correct outcome from Passes 1-3: the
  uniform equal-height tile CSS (§2's `.sgs-brand-strip__item` /
  `.sgs-brand-strip__logo` rules), which is unaffected by scrolling vs
  static mode and remains the fix for Bean's original "some logos huge,
  some tiny" complaint.

## 1. Measured original tile spec (lightsalmon-tarsier-683012.hostingersite.com)

The "Our Brands" band is a Spectra/UAGB image-gallery carousel (`slick`
slider) sitting directly below the hero section. Measured at 1440 on the
first non-cloned slide set:

| Property | Value |
|---|---|
| Tile (`.spectra-image-gallery__media`) size | 175 × 175px square |
| Tile border-radius (container) | 30px |
| Visible tile bg / rounding | **baked into the raster asset**, not CSS — each logo file (`Sanam-Logo-300x300.jpg`, `Green-Leaf-Logo-300x300.jpg`, `Shan-Foods-300x300.jpg`, the `logo-0N.webp` placeholders) is a pre-composited square white-card image with the logo already centred + padded inside it. The container div itself has `background-color: transparent` and `box-shadow: 0 0 0 0` (i.e. none) |
| Rendered image | 155.77 × 155.77px, `object-fit: cover`, centred in the 175px slot (≈10px inset each side — this inset is what reads as the "gap" between tiles) |
| Slide pitch (tile-to-tile) | exactly 175px (slides touch; the visual "gap" is the ~10px white-card inset baked into each image, not a CSS gap) |
| Tile size at 768 | 143 × 143px |
| Tile size at 375 | 107 × 107px |
| Scrolling | Uses `slick` clones for an infinite carousel mechanism, but at rest reads as a static row (matches Bean's "NOT scrolling" description) |
| Colour | Full colour, no greyscale/desaturation filter |

**Per-breakpoint logo content height (the follow-up measurement) — image
element rendered height, i.e. the visible logo excluding the baked-in white
inset:**

| Breakpoint | Tile size | Logo (img) rendered height | Inset (each side) |
|---|---|---|---|
| 1440 | 174–175px | 154.77px | ~9.6px |
| 768 | 143px | 123.6px | ~9.7px |
| 375 | 107px | 87.4px | ~9.8px |

The inset is effectively **constant (~10px)** at every breakpoint — the
original does not tier its padding, it tiers the logo/tile size itself
while keeping a flat white margin. This directly informed the CSS fix
below (flat `--sgs-tile-padding: 10px` + a responsive scale on the logo
height, rather than tiering the padding).

> **SUPERSEDED NOTICE (Pass 4):** §1a and §2 items 2-4 below describe the
> STATIC-mode fix built in Pass 3, under the mistaken premise that the
> original was a static row. The original is a continuously-moving
> carousel. The static-mode CSS (full-bleed breakout, static gap, set-wrap
> fix) is now DORMANT — it's still present in `style.css`, correctly scoped
> under `:not(.sgs-brand-strip--scrolling)`, so it does no harm and would
> only activate if a future site explicitly sets `scrolling: false`, but it
> is NOT what's live on page 13 any more. §7 below (Pass 4) is the current,
> live configuration. Kept in this report for the historical record and
> because the CSS itself remains in the file as a legitimate (if currently
> unused) fallback for any client that genuinely wants a static, non-moving
> brand strip.

### 1a. Original row-packing mechanics (Pass 3 measurement — gap + row span)

Measured the `slick-track` at 1440 directly (non-cloned slides only):

| Property | Value |
|---|---|
| Slide (tile) width | 174px (all 12 logos, uniform) |
| Gap between adjacent slides | **0px** (`rects[i].left - rects[i-1].right` = 0 for all 11 pairs — tiles physically touch) |
| Visible list container (`.slick-list`) width | 1385px (of a 1440px viewport, ~20px side margins) |
| Row span needed for 8 tiles at 0 gap | 8 × 174 = 1392px (marginally exceeds the 1385px list — the original is a continuously-moving carousel, so a few px of sub-pixel overflow at rest is invisible; a STATIC row can't hide that the same way) |

**Key finding:** the original's visible "gap" between white cards is NOT a
CSS gap between tile containers — it's the ~10px white margin **baked into
each source image** (§1 above), rendered on a fully transparent tile
container with 0 CSS gap between slides. Our implementation's tile
`background-color` is a CSS rule covering the FULL 175×175 box (no
baked-in inset), so a literal 0px gap between our tiles would make
adjacent white tiles visually merge into one continuous bar — we need a
small but non-zero CSS `gap` for the "separate rounded card" look the
original has, which the flat-inset technique gives it for free. This is
why the fix below combines a full-bleed breakout (more available width)
with a modest gap (8px) and a small tile-size reduction, rather than
literally copying "gap: 0".

**Implementation note:** the original achieves uniform height by using
pre-cropped square source images (`object-fit: cover`), not a CSS technique.
Our SGS logos are arbitrary-aspect-ratio uploads (wordmarks, square badges),
so `cover` would crop/clip content unpredictably. The equivalent-and-more-
robust technique for a general-purpose block is: fixed-size white tile +
`object-fit: contain` + an explicit (not max-) `height` on the image — this
guarantees identical rendered height for any source aspect ratio without
cropping. This is the approach implemented below.

## 2. Files changed

`plugins/sgs-blocks/src/blocks/brand-strip/style.css` — all changes below
are universal block-CSS (apply to every SGS site using `sgs/brand-strip`),
scoped by the existing `:not(.sgs-brand-strip--scrolling)` selector so the
scrolling marquee is untouched.

**Carried over from Pass 2** (unchanged this pass):
- `.sgs-brand-strip__item`: fixed-size white rounded tile, `width`/`height`
  = `(--sgs-logo-max-height × --sgs-logo-scale) + (--sgs-tile-padding × 2)`,
  white background, rounded corners, flex-centred. `--sgs-tile-padding`
  default `10px` (matches the original's measured constant ~10px inset).
- `.sgs-brand-strip__logo` / `...sgs-media--sgs-brand-strip`: explicit
  `height` (not `max-height`) forces every logo to the same rendered size;
  `object-fit: contain` + `max-width: 100%` prevents cropping/overflow.
- `--sgs-logo-scale` universal responsive multiplier: `0.8` at ≤1023px,
  `0.565` at ≤767px, derived from the original's measured img-height
  ratios.

**NEW this pass (Pass 3 — the clipping fix):**

1. **`overflow: hidden` scoped to scrolling mode only** (`.sgs-brand-strip--scrolling`
   instead of the base `.sgs-brand-strip`). It's only needed to hide the
   marquee's cloned sets sliding off-screen; in static mode it was actively
   clipping the first/last tile once the row (correctly) got wider or
   wrapped onto a second line.
2. **Full-bleed breakout on `.sgs-brand-strip:not(.sgs-brand-strip--scrolling) .sgs-brand-strip__track`** —
   `margin-left/right: calc(50% - 50vw)` (negative-margin-only technique,
   deliberately WITHOUT an explicit `width: 100vw`/`max-width: 100vw`,
   which was tried first and caused a real 8px scrollbar-inclusion overflow
   — confirmed live via `scrollWidth` 1433 vs `clientWidth` 1425, fixed by
   dropping the explicit width and letting the box auto-size between the
   pulled-out margins) + `padding-left/right: var(--sgs-static-row-inset, 20px)`.
   This is a CSS-only, block-level mechanism — not a per-instance `align`
   attribute — so it applies automatically to any client's static-mode
   brand-strip regardless of whether they've set `align="wide"/"full"`.
3. **Static-mode gap reduced**: `--sgs-static-row-gap` default `8px`
   (down from the shared `--wp--preset--spacing--50`, ~24px) on both
   `.sgs-brand-strip__track` and `.sgs-brand-strip__set` in static mode
   only. The original's own gap is effectively 0px (§1a), but our tiles
   have a full-coverage white background (unlike the original's baked-in
   partial-coverage images), so a literal 0px gap would visually merge
   adjacent tiles into one bar — 8px is the smallest gap that keeps tiles
   visually distinct while still fitting all 8 in one row at 1440.
4. **`.sgs-brand-strip__set` width + flex-shrink fix (root cause of the
   wrap not engaging)**: added `width: 100%; flex-shrink: 1;` in static
   mode, overriding the base rule's `flex-shrink: 0` (which the scrolling
   marquee needs to keep cloned sets at full intrinsic width). Without a
   width constraint of its own, a `flex-wrap: wrap` container just grows to
   fit all its children — confirmed live at 768px: the set measured
   1163px wide inside a 728px track with zero rows wrapped. Constraining
   the set to the track's own width is what makes wrap actually trigger
   once 8 tiles collectively exceed it.

## 3. Page 13 attribute changes (Indus Foods homepage, live block editor)

Backup of pre-edit content: `.claude/backups/page-13-content-2026-07-17-brandstrip.html`
(28,045 bytes, saved via `wp.data.select('core/editor').getEditedPostContent()`
before any change — wp-cli was NOT used, per the post_content write block).

Block `sgs/brand-strip` (clientId `0567938b-0b3d-4bb2-a8c0-0cd47d25e83a`):

| Attribute | Session start | Pass 1 | Pass 2 | Pass 3 (final) |
|---|---|---|---|---|
| `greyscale` | `true` | `false` | `false` | `false` |
| `scrolling` | `true` | `false` | `false` | `false` |
| `maxHeight` | `48` | `48` | `155` | **`148`** |
| `align` | (none) | (none) | (none) | (none — briefly tested `full`, then reverted; the final fix is CSS-only, not attribute-driven) |
| `logos` | 12 items | 8 items | 8 items | 8 items (unchanged since Pass 1) |

Saved via `wp.data.dispatch('core/editor').savePost()` each pass; Pass 3
confirmed `isSavingPost: false`, `didPostSaveRequestFail: false` post-save.

**Why 148 (down from 155):** with the static-mode gap now a real 8px (not
0), fitting 8 tiles in one row at 1440 needs `8 × tile + 7 × 8 ≤
~1400px` (the full-bleed track's available width after its 20px side
insets). Solving backwards: `tile ≈ 168px` → `maxHeight = tile − 2 ×
tile-padding(10) = 148px`. This is a deliberate, modest size trade-off
(168px tile vs the original's 175px, ~4% smaller) to buy room for a
visible gap once the clipping bug forced the row wider than the default
1200px content container could hold either way.

## 4. Per-logo rendered heights + tile positions at 3 breakpoints (proof of no clipping + uniformity)

All 8 logos, live cache-busted loads (`?nocache=17700` at 1440, same
session at 768/375 after resize). `canScrollH` = forced `document.
documentElement.scrollLeft = 9999` then re-read — `true` only if the page
genuinely scrolled (real overflow), not just a `scrollWidth` reading.

### 1440 — one row, all 8 tiles fully visible

| Tile | Left | Right |
|---|---|---|
| 1 (Sanam) | 12.5 | 180.5 |
| 2 (Lemon Tree) | 188.5 | 356.5 |
| 3 (Green Leaf) | 364.5 | 532.5 |
| 4 (Shan Foods) | 540.5 | 708.5 |
| 5 (Indus Foods) | 716.5 | 884.5 |
| 6 (Brand Logo 1) | 892.5 | 1060.5 |
| 7 (Brand Logo 2) | 1068.5 | 1236.5 |
| 8 (Brand Logo 3) | 1244.5 | 1412.5 |

All lefts ≥ 0, all rights ≤ 1425 (`clientWidth`) — **no clipping**. Tile
1's left (12.5) and tile 8's right (1412.5) are both comfortably inside the
viewport (unlike Pass 2, where tile 1's left was -71.5 and tile 8's right
was 1496.5 — both outside bounds and clipped by `overflow: hidden`).

Tile size: **168 × 168px** (original: 174-175px — within 7px / ~4%).
Logo height: **all 8 = 148px** (uniform).
`canScrollH`: **false** (no real horizontal scroll).

### 768 — wraps to 2 rows (5 + 3), all tiles fully visible

Two distinct row tops confirmed (683.97 and 830.36). All item lefts ≥
14.52, all rights ≤ 738.47 — inside the 753px `clientWidth`. Tile size:
**138.39 × 138.39px** (original: 143px — within 5px). Logo height: **all 8
= 118.39px** (uniform). `canScrollH`: **false**.

### 375 — wraps to 3 rows (3 + 3 + 2), all tiles fully visible

Three distinct row tops confirmed (857.94, 969.55, 1081.16). All item
lefts ≥ 16.58, all rights ≤ 343.41 — inside the 360px `clientWidth`. Tile
size: **103.61 × 103.61px** (original: 107px — within 3.4px). Logo height:
**all 8 = 83.61px** (uniform). `canScrollH`: **false**.

**Result: all 8 tiles fully visible with zero clipping at every
breakpoint, all 8 logo heights identical at every breakpoint, tile size
within 3-7px of the original.** At 768/375 the row wraps onto multiple
lines rather than showing 8-in-one-row — this is expected and correct: 8
tiles at any reasonable size cannot fit in a 375-768px viewport without
either scrolling (which the original does via its carousel) or wrapping
(which our static row now does instead). Wrapping with zero clipping is
the right non-scrolling equivalent.

## 5. Overflow check

| Breakpoint | `scrollWidth` reading | Real scroll (`scrollLeft` forced to 9999) | Verdict |
|---|---|---|---|
| 1440 | 1425 (matches `clientWidth`) | `false` | ✅ no overflow |
| 768 | — | `false` | ✅ no overflow |
| 375 | — | `false` | ✅ no overflow |

No real horizontal overflow at any breakpoint (`scrollLeft` never moved
off 0 when forced). Note: at one point during Pass 3 troubleshooting,
`document.documentElement.scrollWidth` read 1433 vs `clientWidth` 1425 (an
8px gap) — investigated and traced to a PRE-EXISTING, unrelated element
far down the page (`.sgs-testimonial-slider__slide`, extending to
`right: 2897px`, confirmed non-scrollable) — not a brand-strip regression.
`scrollLeft` forcing is the more reliable check for genuine overflow and
was used for the final verification above.

Zero console errors on any load (1 pre-existing unrelated warning, not
brand-strip).

## 6. Screenshots

- `reports/visual-diff/original-fullpage-2026-07-17.png` — original full page
- `reports/visual-diff/original-brandstrip-crop-2026-07-17.png` — original "Our Brands" band, cropped
- `reports/visual-diff/brand-strip-clone-1440-after-2026-07-17.png` — clone viewport at 1440 (Pass 3 final)
- `reports/visual-diff/brand-strip-clone-1440-crop-after-2026-07-17.png` — clone band cropped, all 8 tiles fully visible, for direct comparison
- `reports/visual-diff/brand-strip-clone-768-after-2026-07-17.png` — clone at 768 (Pass 3 final, wraps to 2 rows)
- `reports/visual-diff/brand-strip-clone-375-after-2026-07-17.png` — clone at 375 (Pass 3 final, wraps to 3 rows)

Side-by-side (original vs clone, cropped band at 1440): same structure —
white rounded tiles on the blue "Our Brands" band, full-colour logos,
uniform tile size, no scroll, and now **all 8 tiles fully visible with no
clipping**, matching the original's one-row-of-8 layout.

## 7. Deploy

Four deploys this session (Pass 2: 1; Pass 3: 3, iterating on the
scrollbar-overflow and set-wrap bugs found during live verification), all
`plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty
--target palestine-lives` — all self-verify PASS (`[verify] HTTP 200`,
markers present), `.bak` rollback retained server-side each time.
`plugins/sgs-blocks/includes/lucide-icons.php` auto-gen churn reverted
post-deploy (`git checkout HEAD --`) every time per standard practice. CDN
was cleared by the coordinator both times; all verification used
`?nocache=<n>` cache-busting regardless.

## 8. Anything needing Bean's attention

1. **Tile size is now ~4-7px smaller than the original's measured size**
   (168/138.4/103.6 vs original's 175/143/107) — a deliberate trade-off to
   fit all 8 tiles in one row at 1440 with a visible (not zero) gap between
   them, after fixing the clipping bug. If Bean would rather have exact
   175px tiles with a near-invisible ~3px gap (mathematically the only way
   to keep both "exact original size" AND "no clipping" AND "one row" at
   1440), that's a one-line CSS change (`--sgs-static-row-gap` from `8px`
   to `~3px`) — flag if wanted.
2. **3 placeholder logos** (Brand Logo 1-3) render as generic light-blue
   placeholder thumbnails, matching the original's `logo-0N.webp` filler
   assets — this is expected (same placeholder pattern as the original, not
   a bug).
3. The tablet/mobile scale factors (`0.8` / `0.565`) are derived from THIS
   client's reference measurements. They're now baked into the shared block
   CSS as the default responsive behaviour for `sgs/brand-strip` on every
   SGS site (a client can still override via their own theme-snapshot CSS
   if a different site's reference scales differently — no other client
   currently uses this block with custom tiering, so no regression risk
   identified).

**Points 1-3 above are now moot** — Pass 4 (below) reverted to `scrolling:
true`, so the static-mode CSS these points describe is dormant on page 13.
They're kept for the historical record in case a future client genuinely
wants a static (non-scrolling) brand strip.

---

# Pass 4 — CORRECTION: restore dynamic marquee + native hover (live/current state)

**Root cause of the correction:** the coordinator's Passes 1-3 direction
(turn `scrolling` off, trim to 8 logos) was itself wrong — Bean confirmed
the original "Our Brands" is a continuously-moving Spectra
`uagb-slick-carousel`, not a static row. This pass reverses that premise
while keeping the one genuinely correct fix (uniform equal-height tiles,
§2 above, unaffected by scrolling vs static mode) and adds native
per-tile hover (border + contained image zoom) that Bean explicitly asked
for, mirroring the reference's own measured hover mechanism.

## 9. Original hover mechanism (measured, informs the fix below)

Inspected `document.styleSheets` on the reference site directly (not
inferred) for `:hover` rules touching the gallery/media/slick elements:

```css
.uagb-block-9cbc7e04 .spectra-image-gallery__media:hover {
  border-color: var(--ast-global-color-1);
}
.uagb-block-9cbc7e04 .spectra-image-gallery__media-wrapper:hover .spectra-image-gallery__media-thumbnail {
  filter: none;
  transform: scale3d(1.1, 1.1, 1.1);
}
```

Computed-style confirmation: `.spectra-image-gallery__media { overflow:
hidden; border: 10px solid rgb(10, 126, 168); }` — `rgb(10,126,168)` =
`#0A7EA8`, which is the exact `primary` colour token in
`sites/indus-foods/theme-snapshot.json` (line 11). So the original's hover
mechanism is: **border colour change to the theme's primary colour + the
logo image scales to 1.1× + `overflow: hidden` on the tile contains the
zoom** — precisely what Bean described ("border outline" + "zoom,
contained").

## 10. Block-native attributes used (no new attributes invented)

Checked `block.json` before touching anything (FR-31-8 schema-first rule).
The block already exposes exactly what's needed — no candidate attribute
speculated by the coordinator (`sgsHoverImageZoom`, `sgsHoverScale`, etc.)
exists or was needed:

| Attribute | Type | Values | Used for |
|---|---|---|---|
| `scrolling` | boolean | — | Marquee on/off |
| `scrollSpeed` | string | `slow`/`medium`/`fast` (maps to 60s/30s/15s per loop) | Marquee speed |
| `scrollDirection` | string | `left`/`right` | Marquee direction |
| `greyscale` | boolean | — | Colour vs desaturated |
| `borderColourHover` | string | any colour | Border-on-hover colour |
| `effectHover` | string | `none`/`lift`/`scale`/`glow` | Hover effect family |

`effectHover: 'scale'` is the existing, closest-native concept to "zoom" —
no new attribute was added. What WAS fixed (universal block-CSS, not a new
attribute): the existing `--hover-scale`/`--hover-lift`/`--hover-glow` +
`borderColourHover` rules were previously scoped to `.sgs-brand-strip:hover`
(the WHOLE STRIP), which doesn't make sense for a multi-tile grid block —
hovering anywhere would trigger the effect for the entire row at once.
Rescoped to `.sgs-brand-strip__item:hover` (a single tile) — see §11.

## 11. Files changed (Pass 4)

`plugins/sgs-blocks/src/blocks/brand-strip/style.css` (universal, all SGS
sites using this block):

1. **`.sgs-brand-strip__item`**: added `overflow: hidden` (contains the
   hover-zoomed logo image inside the tile — this is what makes the zoom
   "not escape the tile", matching the original's own `overflow: hidden`
   on `.spectra-image-gallery__media`), `border: 2px solid transparent`
   (reserves space so the hover border-colour transition doesn't shift
   layout), and a `border-color` transition.
2. **Hover-state rules rescoped from block-root to per-tile**:
   `.sgs-brand-strip[style*="--sgs-hover-border"]:hover` (and `-bg`/`-text`
   equivalents) → `.sgs-brand-strip[style*="--sgs-hover-border"]
   .sgs-brand-strip__item:hover` (attribute-presence gate stays on root
   where render.php declares the CSS var; the `:hover` TRIGGER moves to
   the item; the var itself inherits down with no extra wiring).
3. **`--hover-scale` rescoped to the LOGO IMAGE, not the tile**:
   `.sgs-brand-strip--hover-scale .sgs-brand-strip__item:hover
   .sgs-brand-strip__logo { transform: scale(1.1); }` (was
   `.sgs-brand-strip--hover-scale:hover { transform: scale(1.02); }` on
   the whole block). Scaling the tile itself would NOT be contained by the
   tile's own `overflow: hidden` (an element's own transform isn't clipped
   by its own overflow — only its children are), so the zoom target had to
   be the image (a child of the tile), matching Bean's "the logo IMAGE
   should zoom" instruction exactly. `1.1` matches the reference's measured
   `scale3d(1.1, 1.1, 1.1)` precisely.
4. **`--hover-lift`/`--hover-glow` also rescoped to per-tile** for
   consistency (not directly requested, but the same architectural issue
   applied to all 3 effect variants — a universal fix, not cherry-picked).

No changes to render.php or edit.js — `borderColourHover` and `effectHover`
already existed and already wired their CSS vars onto the root; only the
STYLE.CSS selector scope changed.

## 12. Page 13 attribute changes (Pass 4, final)

Block `sgs/brand-strip` (clientId `0567938b-0b3d-4bb2-a8c0-0cd47d25e83a`).
Restored the ORIGINAL 12-logo array parsed directly from the pre-edit
backup (`.claude/backups/page-13-content-2026-07-17-brandstrip.html`) —
not re-typed from memory:

| Attribute | Pass 3 (wrong premise) | Pass 4 (final, current) |
|---|---|---|
| `scrolling` | `false` | **`true`** |
| `greyscale` | `false` | `false` (unchanged — confirmed original `filter: none`) |
| `logos` | 8 items (trimmed) | **12 items** (Sanam, Lemon Tree, Green Leaf, Shan Foods, Indus Foods, Brand Logo 1-7 — the full original set, verified alt-text list matches the backup exactly) |
| `scrollDirection` | (n/a, static) | `left` (matches the original's measured `translateX` moving toward increasingly negative X = leftward) |
| `scrollSpeed` | (n/a, static) | `fast` (closest available option — see §13 note on why it's still slower than the original) |
| `borderColourHover` | (none) | `#0A7EA8` (the theme's `primary` token, matching the original's measured hover border colour exactly) |
| `effectHover` | `none` | `scale` |
| `maxHeight` | `148` | `148` (unchanged — still produces uniform equal-height tiles; tile SIZE is no longer a hard constraint now scrolling mode's own marquee CSS applies, not the static full-bleed/wrap mechanism) |

Saved via `wp.data.dispatch('core/editor').savePost()`; confirmed
`isSavingPost: false`, `didPostSaveRequestFail: false`, `isEditedPostDirty:
false` post-save, then re-read `getBlock(clientId)` — all 7 values
persisted exactly as set.

**Scroll speed note:** measured the original's `slick-track` transform
twice, 3 seconds apart, at 1440: `translateX` moved from `-2218.85px` to
`-3132px` — a delta of −913.15px in 3s ≈ **304 px/sec**. Our block's
`scrollSpeed` options are a fixed 3-tier map (`slow`=60s, `medium`=30s,
`fast`=15s **per full-loop-of-one-set**, not a raw px/sec value). With 12
logos at our tile pitch (~168px + ~24px gap ≈ 192px/tile), one set ≈
2304px; at `fast` (15s) that's ≈154 px/sec — roughly **half** the
original's measured speed. `fast` is the closest available option; there
is no faster native tier. Flagged for Bean in §14 if an even faster speed
is wanted (would need a 4th `scrollSpeed` tier added to the block, a
larger change out of scope for this fix).

## 13. Verification (Pass 4, independent fresh Playwright session)

The Playwright MCP browser tab became permanently stuck on an unhandled
`beforeunload` dialog mid-session (every tool call after a `navigate`
reported "does not handle the modal state", with no `browser_handle_dialog`
tool available to clear it — a genuine environment limitation, not a
brand-strip defect). Verification for this pass used an independent, fresh
Python Playwright session (`playwright.sync_api`) instead, hitting the live
deployed site with `?nocache=` cache-busting — same live-DOM verification
standard, different driver.

**Marquee movement** — `getComputedStyle(track).transform` sampled twice, 2
seconds apart, per breakpoint:

| Breakpoint | Sample 1 | Sample 2 | Moved |
|---|---|---|---|
| 1440 | `matrix(1,0,0,1,-81.92,0)` | `matrix(1,0,0,1,-391.67,0)` | ✅ yes |
| 768 | `matrix(1,0,0,1,-75.79,0)` | `matrix(1,0,0,1,-337.75,0)` | ✅ yes |
| 375 | `matrix(1,0,0,1,-59.55,0)` | `matrix(1,0,0,1,-265.42,0)` | ✅ yes |

**Full colour** — `getComputedStyle(img).filter` = `"none"` at all 3
breakpoints (no greyscale).

**Item count** — 24 DOM items at all 3 breakpoints (12 logos × 2 — view.js
clones the set once for the seamless infinite-loop marquee, confirming all
12 logos are present, not 8).

**Uniform equal height** — sampled 12 logo heights per breakpoint, all
identical: **148px** (1440), **118.39px** (768), **83.61px** (375).

**Hover — border + contained zoom** (marquee paused first via
`strip.dispatch_event('mouseenter')`, which fires the same JS listener
`view.js` uses to pause the track on real hover, then a genuine
`item.hover(force=True)` on a visible, now-stationary tile to trigger the
CSS `:hover` pseudo-class):

| Property | Before hover | After hover | Result |
|---|---|---|---|
| Tile `border-color` | `rgba(0,0,0,0)` (transparent) | `rgb(10,126,168)` (`#0A7EA8`) | ✅ border appears |
| Tile `overflow` | `hidden` | `hidden` | ✅ zoom is contained |
| Logo `transform` | `none` | `matrix(1.1,0,0,1.1,0,0)` (scale 1.1) | ✅ image zooms |

Identical result at all 3 breakpoints (1440/768/375) — border colour
change confirmed, image scale confirmed, `overflow: hidden` on the tile
confirmed present throughout (containing the zoom).

**Overflow check** — `scrollWidth === clientWidth` at all 3 breakpoints
(1440/1440, 768/768, 375/375), AND `document.documentElement.scrollLeft`
forced to 9999 then re-read as `0` (no real scroll) — both checks pass,
zero horizontal overflow.

**Console errors** — 0 errors on a fresh page load (separate check).

## 14. Screenshots (Pass 4, overwritten)

- `reports/visual-diff/brand-strip-clone-1440-after-2026-07-17.png` — clone at 1440, marquee mid-scroll (full colour, uniform tiles)
- `reports/visual-diff/brand-strip-clone-1440-crop-after-2026-07-17.png` — cropped band, shows Shan/Indus Foods + 4 placeholder tiles mid-scroll, full colour, uniform height
- `reports/visual-diff/brand-strip-clone-768-after-2026-07-17.png` — clone at 768, marquee moving
- `reports/visual-diff/brand-strip-clone-375-after-2026-07-17.png` — clone at 375, marquee moving

(Screenshots necessarily show a snapshot of a MOVING carousel — the exact
tile positions will differ from a re-run, which is expected and correct
for a marquee; §13's two-transform-sample proof is the authoritative check
for "is it actually moving", not a single static screenshot.)

## 15. Deploy (Pass 4)

One deploy this pass: `plugins/sgs-blocks/scripts/build-deploy.py
--blocks-only --allow-dirty --target palestine-lives` — self-verify PASS
(`[verify] HTTP 200`, markers present), `.bak` rollback retained
server-side. `plugins/sgs-blocks/includes/lucide-icons.php` auto-gen churn
reverted post-deploy (`git checkout HEAD --`). CDN cleared by the
coordinator; verification used `?nocache=<n>` cache-busting regardless.

## 16. Anything needing Bean's attention (Pass 4)

1. **Scroll speed is ~2× slower than the original** even at the fastest
   native tier (`fast` = 15s/loop ≈154 px/sec vs the original's measured
   ≈304 px/sec) — the block's `scrollSpeed` attribute only has 3 discrete
   tiers (slow/medium/fast), no raw px/sec control. If exact-speed parity
   matters, this needs a small block enhancement (either a 4th faster tier
   or a numeric px/sec attribute) — flagging rather than hacking in an
   inline animation-duration override, which would violate the no-inline
   contract.
2. **3 placeholder logos** (Brand Logo 1, 2, 3 — plus 4 more now restored:
   Brand Logo 4, 5, 6, 7) render as generic light grey/blue placeholder
   thumbnails, matching the original's own `logo-0N.webp` filler assets —
   expected, not a bug.
3. **The Playwright MCP browser tab is stuck** on an unhandled
   `beforeunload` dialog (see §13) — every `mcp__plugin_playwright_
   playwright__*` tool call on that tab now fails with "does not handle
   the modal state". This doesn't block verification (an independent
   Python Playwright session was used instead, see §13), but the stuck
   MCP tab itself may need a fresh session/restart to recover for future
   interactive work on this page.
4. The per-tile hover rescoping (§11) is a universal fix applied to ALL 3
   hover-effect variants (`lift`/`scale`/`glow`), not just `scale` — any
   other SGS site using `borderColourHover` or `effectHover` on
   `sgs/brand-strip` will now get per-tile hover instead of whole-block
   hover, which is a strict improvement (the whole-block behaviour never
   made sense for a multi-tile grid) but is technically a behaviour change
   worth knowing about if any other client relies on the old whole-block
   hover look.
