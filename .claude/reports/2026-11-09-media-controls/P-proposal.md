# Spec 49 v0.5: the proposal for Bean's approval

Full spec: `.claude/specs/49-SGS-MEDIA-SYSTEM.md`. Evidence: this folder (T research, C councils, Q browser and code proofs, A reference implementations read from source).

## What changes for each block

| Blocks | What changes | Specialised controls that stay |
|---|---|---|
| Media | Rebuilt: one source setting, clean panels, effects available for the first time | Caption, link |
| Container, hero, trust bar, site header, site footer, multi-button, physics canvas, nav drawer | A real background element in every state; a proper focal picker replaces the position dropdown; one motion line | Tiling, Surface panel, hero SVG parts |
| Hero split | Same settings as Media | Column placement |
| Decorative image | Only the settings a floating layer uses | Position, rotation, anchor, flip, fade on scroll |
| Gallery | One fit and one focal setting instead of three each | Layouts, lightbox, drag reorder |
| Card grid, post grid, product card, buybox | Same settings, per item | Grid, colour swap, thumbnails |
| Team, testimonial, before-after, timeline, responsive logo, drawer logo, choice flow, form tiles, option picker, trust badge, brand strip, image sequence, measured diagram | Adopt the system with only the settings each needs | Each block's own behaviour |
| Cart, wishlist, product search, store flags, drawer menu items, mega panel cards, review avatars | Keep their own settings; one internal call replaced | All |
| Business map, audio, icon pickers, fixed review badges | Not media; untouched | All |

## What happens to shared files

| Action | What |
|---|---|
| Keep | CSS collector, responsive, box, border, shadow and hover helpers (77 to 105 callers each), SVG sanitising, scope hashing |
| Rework | Per-device wrapper, focal picker, media picker, shape file, `sizes` logic, the cloner's image route, page builder validation |
| Extend | The 15 media atoms: 9 extended, 5 kept as they are, `media-type` and `intrinsic` folded into `source`, box-shape split into `sizing` and `shape`, plus one new `filter` atom; their registry, generator and passing tests; `SGS_Media_Element` as the one renderer; `MediaElementPanel` as the panel host |
| Delete | Box-shape's clip-path presets, the old render functions and loading helpers, the registration-time attribute injector, and the gates and tests tied to deleted code |

## Controls

| Setting | Control | Modelled on |
|---|---|---|
| Media | Preview with Replace and Remove | Every product |
| Alt, Decorative | Multi-line box, with a checkbox that hides it | Gutenberg, Kadence |
| Aspect ratio | Chips including 4:5, Custom; a client's own ratios added | Webflow, Stackable |
| Width, Height | Lengths with Auto; Height also has Match its space | Gutenberg, Stackable |
| Smallest and largest size | Four fields, collapsed | GenerateBlocks |
| How it fills | Chips with plain captions: Crop to fill, Show all | Gutenberg |
| Focal point | Drag on the photo, percentages, Reset | Gutenberg |
| Shape | Grid drawn with the client's own photo | Stackable, improved |
| Shadow | Preset chips, then Custom | Stackable |
| Overlay | Colour, then strength, starting at 40 | All, with a safer start |
| Load priority | Automatic, Load first, Load later | Webflow, Bricks |
| Per-device | Grey inherited value, "Mobile: using Tablet", dots, Reset naming the true source | Elementor, Stackable, improved |

## Motion

Audit of the framework's 60 effects, run in real Chrome: 28 work, 3 partly work, none broken, 1 unanswered, 30 could not be run (no test page), mostly sliders, countdowns and header behaviours.

Media gets the whole Hover library (31 presets) and Entrance library (80 presets), each with Fine-tune, minus the few that need text. Effects adds, by kind: image parallax, Ken Burns, float, scrub; video parallax, float, scrub; embed float; SVG parallax, float, scrub, SVG loop, draw, morph, motion path; backgrounds parallax, plus Ken Burns on images and SVG loop and parts on SVG.

Hover answers the pointer. Entrance plays once. Effects run with time or scroll. The Background panel holds no motion controls: one line shows what is set and opens Effects on the background.

## Cut for simplicity

Cut: uploaded mask shapes, a different media type per device, tile `space` and `round`, per-device Greyscale and Blur, click-to-play embed covers, video on decorative images, the hidden-value note, preload links, the upload-size warning, the separate rules language, a new DB column and a second shape file.

After cutover (Stage C): the browser-native parallax driver, Pinned.

## Where a proven model exists, and where it does not

Separate video, embed and SVG files per device stay (Bean). Mask shapes ship in the first release (Bean).

Modelled on read source: `<picture>`, `sizes`, loading priority and clipping (WordPress core and Gutenberg), captions (Gutenberg), attribute generation (Stackable), migration (Spectra, avoiding its gap), parallax driver (Motion), Pinned (Gutenberg Cover).

No proven model found, so ours is original and test-backed: overscan on moving images, naming the source of an inherited value, the shape grid drawn with the client's photo.
