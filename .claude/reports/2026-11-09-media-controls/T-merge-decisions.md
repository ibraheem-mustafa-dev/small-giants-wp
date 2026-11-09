# Spec 49 v0.5 merge decisions (main thread working notes, 2026-11-09)

Sources: T1 to T9 (T10 and T11 pending at the time of writing). Each decision names its evidence.

## Scope test applied

Stays if a draft uses it (T8), or a standard pattern in target builders (T5, T6, T7) that the cloner maps. Otherwise stays only if a client would miss it. Absence from three drafts never cuts anything alone.

## Cut or simplified

| Item | Decision | Evidence |
|---|---|---|
| Five emitter kinds rewritten twice | The table row names an existing helper; `SGS_Media_Emitter` is a thin dispatcher. JS side reuses `border-preview.js`, `radius-preview.js`, `spacing-preview.js`. PS-7 narrows to the dispatcher | T3 §5.1: `helpers-responsive.php`, `helpers-box.php`, `helpers-border-style.php`, `helpers-shadow-*`, `helpers-hover-state.php` have 77 to 105 callers |
| `media-shapes.json` | Cut. Extend `icon-shapes.json` with `fit`, `paint`, `ratio` | T3 §5.2 |
| Moving divider paths and sticker geometry into the library | Cut | T3 §5.3; clients never see it |
| Uploading a mask shape | Deferred. Security surface, failure states, data-URI path; the cloner maps unknown polygons to Custom CSS anyway | §11; Kadence, Spectra, Bricks offer it, so a later stage can add it |
| Blob shapes | Keep three (paths only) | T5: Kadence, Spectra, Stackable all ship blobs |
| SVG stroke border on masks (PS-3) | Cut. Border is omitted with a mask shape; Circle, Ellipse and Pill keep ordinary borders | T8: border-on-mask appears in no draft; circles use radius |
| Different media kind per device | Cut. One kind per slot; each device can have its own file of that kind, or none. AC-4's mixed-kind case goes | T8 none; saved per-device use is same-kind only (T2 C2) |
| Tile `space` and `round` | Cut; keep repeat both, across, down, none | T5 all four WP tools; T8 none |
| Per-device Greyscale and Blur | Cut; one value | T8 none |
| Per-device Overlay strength | Stays | T2 C2: `backgroundOverlayOpacity` saved per device x7; Spec 35 O-C rule 2 |
| Hidden-value note and `hiddenWithValue` | Cut. Values hidden with their control are kept silently. Where a visible field loses to another, inline help says so | T1 §2(6); no product does it (T5) |
| Rules DSL with eight atoms, memoisation, 16 ms budget | Cut. One JS file of plain per-control visibility functions | T4 §8.2; rules run only in the editor |
| `paint_node` DB column and seeder layer | Cut. A field in `media-settings.json`; `css_element` carries node names, PS-1 proves it | T3 §5.4, T4 §8.4 |
| Separate `media-slot.schema.json` | Generated from attribute `properties`; `wp-build-page` descends into objects | T4 §4, §8.5 |
| `sizes` parser | Width px, vw, rem, em, else `100vw`; keep existing crop factor and item-set column count. Cut `%`, `calc`, `clamp`, `min`, `max` | T1 §2(6) |
| Decorative image video branch | Cut; no saved `decorMedia` on any site | T2 C2 |
| AC volume | Merge to one gate per area; three browsers only for AC-3, AC-23, AC-27; matrix 30 to 12 | T4 §8.6 |

Stays although questioned: Pinned, Padding and Background colour (cloner and migration map them); Featured kind (post-grid, product-card); Captions file (WCAG); generator writing `block.json` (over 200 gates read it); `basis:page` parallax (both parallax drafts use it, T8 A6).

## Gaps the spec must add

- Surface tone, blur, saturate, fill opacity stay in their own Surface panel (T1 §6).
- `bgSvgParts`, `bgSvgPartsTrigger`, `bgSvgOpacity`, `bgSvgMinHeight`: destinations (T1 §5).
- The gallery lightbox and its layouts stay; "a lightbox" non-goal reads "no new lightbox" (T1 §4).
- `sgs/decorative-image`: delete `hideOnTablet/Mobile`, keep universal `sgsHideOn*`; FR-49-6 wording (T1 §3).
- Settings for a layer are only what a layer uses (T1 §3).
- §10.4 additions: measured-diagram (Source only), business-info map, wishlist-panel, form-field-tiles, google-reviews avatars, nav-drawer chrome logo, choice-flow `headerLogo`, store-selector flags, nav-drawer-menu, mega-panel, product-card brand logo, buybox `previewImageId`. Remove info-box (T2).
- Fixed-artwork blocks and audio are out of scope; gates allow-list them. JS-built thumbnails (cart, wishlist-panel, product-search) use the emitter, not the PHP renderer (T2).
- FR-49-17: Google Maps iframes are out of its allow-list by design: `sgs/business-info` keeps its map and moves width and height to CSS (T2 B19). Draft Indus has map iframes with a filter (T8).
- `logoSwitchCustomPx`: drop the custom pixel value (T2 B10).
- FR-49-16: remote avatars get a fixed-size exception (T2 B15).
- §13 rows: product-card `image`, `imageFill`, `imageSize`, `imageAspectRatio`; overlay family; hero `mediaPadding`, `mediaBackground`; media `video*` playback and captions, `imageHeight`; gallery `mediaItems`, `imageSize`; responsive-logo and `chromeLogo*`; before-after; measured-diagram; team `photo`; timeline `media*`; container `boxAspectRatio` stays as layout; `sgsHeight`, `sgsMaxWidth`, `sgsColourTreatment`; card-grid and post-grid `imageHeight`, `imagePadding`; `itemThumb*`; `headerLogo`; buybox `mainPhoto*`; `tileShape`, `swatchShape` (T1, T2, T3).
- Hero Size, Position and Attachment are inert on a plain image today, so AC-25 must expect those hero images to change (T1 §5).
- §8.2: corrected paths; add `sgs_hidden_render_*` and `sgs_allowed_svg_tags` (move first), cover-crop functions, `canvasStyle.js`, `media/controls/*`, `*PanelLayout.js`, `background-preview.js`, `objectPosition.js`, rules 37 to 40, `wf_media.py`, `check-media-breakpoints.js`, `check-image-controls-support.py`, `check-dead-controls.js`, stubs in `scripts/qa/lib/wp-stubs.php`, `package.json` entries, 12 `gates.json` ids, 22 tests (T3, T4).
- WP-13 scope: `fill-media.mjs::imageSlots`, `scalar-media-roles.json`, `detector5_image_alt_companion.py`, `apply-svg-file.mjs`, `calibrate-instances.mjs`, `property_equivalents` height row, fixtures (T4).
- `ResponsiveOverride` has 135 importers; `ResponsiveControl`, `ResponsiveBoxControl`, `ResponsiveLengthControl` form a second family. Rework must be proven on non-media consumers (T4).
- WP-15a publishes the gate list (T4 §5).

## Real-nesting proof (real Chrome, 600px parent)

Ratio plus Height holds through figure, link, picture and helper (300 by 300, each). Two defects:

1. A caption spreads the figure to the full 600px under a 300px image. `width:fit-content` alone widens it to the caption (327px). Rule to prove in PS-2: figure `width:fit-content; max-width:100%` with figcaption `width:0; min-width:100%`, when Width is auto.
2. A helper with Height only ignores the file's proportions (600 by 300, wanted 533 by 300). Rule: when the helper is printed with Height set and no Ratio, the renderer prints the file's own ratio as `aspect-ratio` on the helper, per device.

## Control changes from research

Alt: multi-line box with one help line (T5). Decorative: checkbox beside Alt, hides it (T5, T6). Poster: "Cover image before play" (T6). Load priority: Automatic, Load first, Load later (T5, T6). Caption: None, From library, Write my own (T6). Link: `LinkPopoverControl` (T5). Limits: four lengths in a collapsed group (T5, T6). Fit: icon chips with plain captions (T5, T6). Shadow: preset chips then Custom (T5, T6). Corners: one slider, link for four, Round preset (T5, T6). Greyscale: "Black and white" (T5, T6). Inherited values: greyed placeholder in the field, "Mobile: using Tablet", dot, Reset (T5, T6). Order: number stepper (T6). Video: add a pause button option, off by default (T6 Webflow; WCAG 2.2.2; Bean's standing rule).
