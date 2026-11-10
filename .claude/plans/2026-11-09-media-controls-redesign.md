---
doc_type: plan
status: parked
archive-after: the Eye Care sign-off (an Eye Care doc links here; it moves to plans/archive/ with the links repointed then)
---

# Media controls redesign: Bean's issue register

Status: superseded by the ground-up design in `.claude/specs/49-SGS-MEDIA-SYSTEM.md` (v0.7, approved by Bean 2026-11-10; evidence in `.claude/reports/2026-11-09-media-controls/`; Bean 2026-11-09: design from the ground up, media-first, one shared cutover). The register below stays the list of what Bean raised; the Design and Sequence sections are replaced by the spec. The build follows the spec's §14 (Stage A under way). Raised by Bean on 2026-11-09 after checking the editor.

## Order of work (Bean)

1. Understand what exists: read the specs and the code for responsive media and art direction. No claims from memory or summaries.
2. Say whether the current setup is optimal or what would be better. This comes before styling or motion controls.
3. Full adversarial council on `sgs/media`. The list below is not exhaustive.
4. Survey every media element in the framework: controls, effects, what is built or part built, whether the architecture is consistent. Each element keeps specialised controls only where its context needs them.
5. One redesign covering every item here: harmonious, feature-rich, user friendly, shared files, standardisation rules followed, and the rules updated where needed.

## Questions to answer

- Q1. The art-direction claim: does a per-device background image really render as CSS rather than an element, and is the setup labelled art direction the right one against a responsive object setup? Read the specs and code first.
- Q2. What would the optimal responsive media setup be?
- Q3. What does a shortcut from the Background panel to the motion panel look like and do in the editor?
- Q4. Is the background layer selectable in the motion element picker in every state, and should the Background panel keep specialised effect controls, none, or specialised plus the general motion controls?

## Issue register

### Headings

- H1. An h1 with a default size in the stylesheet and no manual size on the page must take its size from the stylesheet automatically. Bean reads the current behaviour as a framework bug. Find out why a heading did not.

### Focal point

- F1. Build one shared responsive focal point control and use it universally on all media elements.
- F2. The Background panel's focal point is labelled Position and is a preset dropdown: replace it with the proper control.
- F3. The right control already exists on `sgs/media`: the image shown with a clickable focal point, plus percentage inputs on the x and y axes.
- F4. Position only works with some Size values, and it stays visible and editable when it does nothing. Possibly because the setting serves other media types set as backgrounds; confirm.

### Background panel and parallax

- B1. Attachment (Scroll or Fixed, labelled parallax) genuinely works, but has no strength or speed option once enabled.
- B2. Decide where background effects live (Q4). Dependent settings in this panel have the same confusion as `sgs/media` (fit type against position).

### `sgs/media` block (Bean: a frankenstein block, functionality added circumstantially)

- M1. It opens an Image styling panel inside the Settings tab while a panel with the same name exists in the Styles tab; that panel cannot be collapsed. Check those settings for overlaps, dissolve the panel, and move the right controls into the existing style panels.
- M2. The Effects panel is completely empty, and there is nowhere else to set effects. It has no parallax or any effect the Background panel has.
- M3. The top panel in Styles is Filters, holding only duotone (native WordPress). Bean does not want it: most native controls have been moved away from. Duotone fits at the bottom of the overlay panel.
- M4. Too many controls and panels are shown regardless of relevance: controls must appear only when their media type or parent setting is in use. Examples: a Typography panel offering image caption (none set) and video captions (an image was picked); sub-settings of box shape and others; caption colour only when there is a caption, and moved into this block's Typography panel.
- M5. Shadow controls must follow the universal setup, in their own Shadow panel, not inside Box and Shape.
- M6. Box and Shape is poorly implemented: options are weak, settings overlap and do not work together, and some should apply to the image itself or to both frame and image.
- M7. The shape control does not adjust the settings it depends on. Circle: sides go out of view, or the circle does not fit the image and leaves gaps. Rounded: rounded borders with visibly square image corners. Bean's view: probably remove it, since square is the default and border radius gives rounded corners and circles.
- M8. The minimum height control breaks the standard design for single-unit controls.

### Rules for the new design

- R1. Conditional controls must work with the global responsive device switcher.
- R2. Every media element ends up working consistently, with specialised controls only where the element's context needs them.
- R3. Shared files, standardisation rules followed; update the standards where needed.
- R4. Motion and effects are designed after the media model is understood.

## What was found (2026-11-09)

Evidence: `.claude/reports/2026-11-09-media-controls/` A to G. Council: veteran builder, delivery lead, rival product head, spec lawyer, support realist, and a live test of the riskiest fixes in real Chrome.

- Q1. True, with detail. `SGS_Container_Wrapper::render` prints a real `<img>` only when the image is no-repeat, cover or contain, not fixed, and has no tablet or mobile image; `sgs/hero` applies the same two tier tests. Otherwise it paints on a `::before` with no srcset, preload or priority, and motion aimed at it does nothing. The code comments call the tier migration unfinished; no spec or plan schedules it. Art direction (a different image per device) is stored as flat `xTablet`, `xMobile` siblings. The responsive object is one `{desktop,tablet,mobile}` value. Both exist, for different things.
- Q2. Not optimal. Hero split tiers are hidden siblings, eager and high priority, so all three download on every device (measured: 3 requests at each width; `<picture>` gives 1). Target: `<picture>` with one `<source media>` per device, and one responsive preload for the lead image only.
- F4. Bean's theory is partly right, but not the cause. `backgroundSize` and `backgroundPosition` do serve image and video together, but the backdrop focal control's visibility rule is hard-coded to shown, and the image tab never calls it. Its video tab already has the proper picker.
- H1. Inheritance works: an unsized heading took the stylesheet rule at 1440 and 375. The bug is `sgs_font_size_value()`, which treats `var(--wp--preset--font-size--…)` as a slug, mangles it and so falls to 16px.
- M2. `sgs/media` never declares `supports.sgs.fx.motionSurface`, so it is not in the generated effect list. `sgs/decorative-image` declares it.
- Root cause of the `sgs/media` mess: four control layers added in different waves, never reconciled; controls gated only by media type, never by other controls; panels mount when they have nothing to show. Everything but the overlay paints on the image, so overlay ignores radius and clip-path cuts the shadow. Embeds carry no marker, so most styling is dead for them.
- Consistency: focal point has five data shapes and four mounts; `MediaUpload` is hand-used in 25 files against the shared `MediaPicker`; object fit has four surfaces.
- Research: `<picture>` for art direction, inherit-down responsive values, omit rather than grey dependent controls (Kadence, Webflow). No plugin read models a per-device focal point. GenerateBlocks, Spectra in depth, Bricks and Elementor's inheritance could not be verified.

## Live test results (real Chrome)

- `<picture>` downloads one image per width. A device set to none must be an empty source: `display:none` alone still downloads.
- Each `<source>` needs its own true width and height, or an auto-height image jumps (3600px against 200px).
- Per-device focal point works by scoped CSS on the `<img>`.
- Real background element with translate parallax and Ken Burns composes, with no gap provided overscan is at least the largest travel.
- Frame rule (radius 50%, ratio 1:1, overflow hidden, overlay inside, shadow on the frame) is a true circle, for images and iframes.
- Preload with `imagesrcset` and `media` fetches once, with media queries matching the sources exactly.
- Unmeasured: `background-attachment:fixed` on a real iPhone. Desktop WebKit with an iPhone profile showed no fault, so the iOS claim rests on issue trackers only.

## Design

### Shared media slot

Each slot (sgs/media, hero background, hero split, container background, decorative image, gallery item, card image, buybox photo) uses the same responsive values. Each attribute resolves on its own, inherit-down: mobile empty uses tablet, tablet empty uses desktop.

- `<slot>Sources`: `{desktop:{type,id,url,width,height},tablet,mobile}`. `{type:"none"}` hides from that device down, printed as an empty source.
- `<slot>Focal`: `{desktop:{x,y},tablet,mobile}` in native picker floats, keyed to the device, not the image.
- `<slot>Fit`: responsive.
- `<slot>Alt`: one value plus a decorative flag, never tiered.

`sgs_render_media_slot()` is the only printer; `MediaSlotControl` the only picker. `<source>` media queries come from the DB breakpoints. Scope class is derived from a hash of the values, never random. Spec 35 D5 is amended to the responsive object form in the same change.

### Frame rule

One element `.sgs-media__frame` takes size, ratio, border, radius, shadow and overlay, and clips. Only fit, focal, opacity and filters apply to the media itself. Hover zoom clips automatically.

### Controls

Background panel: what the background is. Media, per-device sources, How it fills (fit), Focal point (the proper picker, per device), Repeat only when tiling, overlay. One row at the bottom: "Motion: Parallax, speed 0.18 [Edit]" or "No motion [Add]".

Effects panel: everything that moves, Background as a target in every state once backgrounds are a real element. Parallax gains speed, direction and per-device; Pinned is a separate choice. Attachment goes when this ships.

`sgs/media`:

- Settings: Media, Alt, Caption and link (with an image or video), Video playback (video only).
- Styles: Size and crop (width, ratio chips 1:1, 4:3, 16:9, 3:4, 21:9, Original, height, min height in the standard control, fit, focal when fit crops, one-click Circle); Border and radius; Shadow (universal panel); Overlay and filters (duotone at the bottom, native Filters gone); Typography (caption with its colour when a caption exists, video time only for the player); Effects.

### Conditional controls

`media-control-rules.js` is the single table: control, media types, parent condition. It resolves at the active device using inherit-down, and against the resolved type at that device (image on desktop and video on mobile shows playback on mobile only). Irrelevant controls are omitted; a panel with nothing to show does not mount.

Every responsive control shows which device it is editing, "Mobile: using Tablet" when inherited, a dot on devices with their own value, and Reset to that device's inherited value. A control hidden while holding a value keeps it, and the panel names it: "Focal point (Mobile) is saved but unused: Fill is Show all." with Reset.

Empty, deleted and oversized media have their own states. Replacing an image keeps focal and alt.

### Sequence

- P0. Heading value fix and stylesheet-size choice; `motionSurface`; hero split download fix.
- P1. Editor clean-up, no saved-content change: dissolve Image Styling and Media Styling, Shadow panel, duotone move, conditional rule table with device awareness, min height control, omit-not-grey, proper focal picker on the Background panel, Typography clean-up. Bean checks it by eye.
- P2. Frame rule; Shape replaced by the Circle preset with a content sweep; Background motion row; parallax speed.
- P3. Responsive focal point everywhere, one data shape, detector first (survey, fix, check, self-test on all five mirrors).
- P4. Slot model on `sgs/media` proven against the DB, both gate tiers and `check_value_identity`, a one-page attribute-to-property map first. Then `<picture>` and real background elements. Attribute shapes for client sites stay frozen until they are signed off.
- P5. Remaining elements in batches under detectors, a gate that refuses hand-rolled media pickers and a second focal shape, and a machine-readable slot schema the cloner fills in.

### Decided against

Duplicating motion controls inside the Background panel. Shapes and masks: Spec 49 §7.5 (Circle is a shape; mask shapes ship in the first release).
