# Spec 49 v0.6: the proposal for Bean's approval

**Full spec:** `.claude/specs/49-SGS-MEDIA-SYSTEM.md`. Its §18 appendices give every block (today, change, end shape), every shared file (verdict and package) and every control (reason, what SGS has today, what was not verified).

**Evidence:** this folder: T research, T12 effects run, C councils, Q and QS raters, `fc-QS-*` fact-checks, A reference implementations, R and QC per-device tests.

## What changed since v0.5

- **The QC sweep.** Three raters raised about 70 findings. Each was fact-checked against the code (`fc-QS-A.md`, `fc-QS-B.md`, `fc-QS-C.md`): about 45 valid, 25 partly valid, 1 wrong. Every valid point is applied.
- **Your decisions (2026-11-10):**
  - any slot that allows two or more kinds can show a different kind per device
  - the white logo filter and the logo's own switch width stay
  - the image-size dropdown goes
  - Effects is the whole library, filtered by the kind on each device
  - existing atoms and shared files are used and extended from the start.
- **Fixed background.** It stays, as Pinned. Parallax at full strength was tested as a replacement and leaves part of the section empty while it scrolls in or out (`T12-effects-run-A.md`).
- **Loading priority.** Images load immediately in the sections the editor measures as above the fold (two by default), at most 16; the first gets high priority. It uses the same "above the fold" function as the motion rule.
- **The 28 effects never run before** are now run (T12): 23 work, 6 partly work, 4 are broken (counts per test row).

## What changes for each block

| Blocks | What changes | Specialised controls that stay |
|---|---|---|
| Media | Rebuilt: one Media setting per device with its kind, clean panels, effects for the first time | Caption, link |
| Container, hero, trust bar, site header, site footer, multi-button, physics canvas, nav drawer | A real background element in every state; per-device kinds (video on desktop, photo on phones); a proper focal picker; Pinned; one motion line | Tiling, Surface panel, hero SVG parts |
| Hero split | Same settings as Media; its per-device kinds keep working, without the wasted downloads | Column placement |
| Decorative image | Only the settings a floating layer uses | Position, rotation, anchor, flip, fade on scroll |
| Gallery | One fit and one focal setting instead of three each | Layouts, lightbox, drag reorder |
| Card grid, post grid, product card, buybox | Same settings, per item; the buybox's preview and brand logo become slots | Grid, colour swap, thumbnails |
| Team, testimonial, before-after, timeline, logos, choice flow, form tiles, option picker, trust badge, brand strip, image sequence, measured diagram | Adopt the system with only the settings each needs | Each block's own behaviour, including the logo's switch width |
| Cart, wishlist, product search, store flags, drawer menu items, mega panel cards, review avatars | Keep their own settings; one internal call replaced | All |
| Business map, audio, icon pickers, fixed review badges | Not media; untouched | All |

## What happens to shared files

(Appendix B lists all of them.)

| Action | What |
|---|---|
| Keep | CSS collector, responsive, box, border, shadow and hover helpers, SVG sanitising, scope hashing, the Lottie effect |
| Extend | The 15 media atoms (all kept, none broken), their registry, generator and tests; `SGS_Media_Element` as the one renderer; `MediaElementPanel` as the panel host; the per-device helper `sgs_tier_media_render`, reworked so only the shown files download |
| Rework | Per-device wrapper, focal picker, media picker, shape file, `sizes` logic, the cloner's image route |
| Replace | The atom stylesheets and their generator become one `media-base.css`; the two video-swap scripts become one |
| Delete | Box-shape's clip-path presets, the old render and loading helpers, the theme's hero preload, the Lottie media-kind code, the registration-time attribute injector |

## Controls

(Appendix C has every control.)

| Setting | Control | Why | SGS today | Modelled on |
|---|---|---|---|---|
| Media | Per device: kind choice (only kinds the slot allows), preview, Replace, Remove; video needs a cover image | One place per device; the kind decides what prints | Separate pickers per kind and device | Stackable stores media per device; original in downloading only the shown file |
| Alt, Decorative | Multi-line box; a checkbox hides it; a device with its own file gets its own alt | Alt describes the file shown | Single-line box | Gutenberg, Kadence |
| Aspect ratio | Chips including 4:5, Custom; a client's own ratios added | Every client-facing tool uses named presets | A select | Webflow, Stackable |
| Width, Height | Lengths with Auto; Height also has Match its space | Plain sizes; Match its space covers cards stretched by text | Mode chips (removed) | Gutenberg, Stackable; Match its space is original |
| Smallest and largest size | Four fields, collapsed | Rarely needed, always available | None | GenerateBlocks |
| How it fills | Chips with plain captions: Crop to fill, Show all | CSS words confuse clients | A select | Gutenberg |
| Focal point | Drag on the photo, percentages, Reset | The field standard | Three shapes, a dropdown on backgrounds | Gutenberg |
| Shape | Grid drawn with the client's own photo | Pictures beat names | Four options | Stackable, improved |
| Colour | Natural, Black and white (strength), White | Keeps the white-logo control; covers what drafts use | White only, on some blocks | Original |
| Shadow | Preset chips, then Custom | Usable without blur and spread | Layered editor | Stackable |
| Overlay | Colour, then strength starting at 40 | A safer start | Colour and opacity | All products |
| Load priority | Automatic, Load first, Load later | Plain words | None for images | Webflow, Bricks |
| Pinned (backgrounds) | "Keep the photo still while the page scrolls" | Keeps today's Fixed | "Fixed (parallax)" in a dropdown | Gutenberg Cover |
| Per-device | Grey inherited value, "Mobile: using Tablet", dots, Reset naming the true source | Shows where a value comes from | Partly; hard-coded "Desktop" | Original: no product checked shows it (A3) |

## Motion

- **Hover and Entrance:** media gets the whole Hover (31) and Entrance (80) libraries with Fine-tune, minus the few that need text.
- **Effects:** every registered effect the element can carry, worked out per device from the kind shown there. Effects that need a layer (sheen, glare, ripple, curtain) get it automatically.
- **How the panels fit:** Hover answers the pointer, Entrance plays once, and Effects runs with time or scroll. The Background panel's one motion line opens Effects on the background.
- **What exists today** (§10.5), from every effect run in real Chrome:
  - **Built and good:** the hover and entrance libraries, parallax, Ken Burns, float, SVG loop and draw, image sequence, Pinned on desktop, sliders, counters, header behaviours and more.
  - **Needs rework:** surface treatment on the decorative image, particles and grid dots and generative background on container backgrounds, the media SVG animation, flip, curtain, the before-after vertical divider, the audio visualisers.
  - **Missing and not added:** 3D tilt, click effects, click-to-play embeds (no draft uses them).

## Cut, deferred and kept

- **Kept, which v0.5 had cut:**
  - a different media kind per device
  - the white logo filter
  - the logo switch width
  - the fixed background (as Pinned).
- **Cut for simplicity:**
  - tile `space` and `round`
  - per-device Black and white
  - Blur on media
  - click-to-play embed covers
  - video on decorative images
  - the image-size dropdown (sizes are automatic)
  - preload links
  - the upload-size warning
  - a separate CSS rules language (the existing value helpers do it)
  - a new DB column
  - a second shape file.
- **After cutover (Stage C):**
  - the browser-native parallax driver
  - uploaded mask shapes.

## Where a proven model exists, and where it does not

- **Modelled on read source:**
  - `<picture>`, `sizes`, loading priority and clipping: WordPress core and Gutenberg
  - captions: adapted from Gutenberg's centred-image rule, proved by PS-2
  - attribute generation: Gutenberg and Stackable
  - migration: Spectra, avoiding its gap
  - the Stage C parallax driver: Motion
  - Pinned: Gutenberg Cover
  - per-device media storage: Stackable.
- **Original and test-backed:**
  - downloading only the shown file per device (tested in Chrome, Firefox and WebKit)
  - overscan on moving images (Q2)
  - the Fill floor (the same idea as Cover's minimum height; PS-2)
  - the default-width and file-ratio rules (PS-2, PS-7)
  - naming the source of an inherited value
  - the shape grid drawn with the client's photo
  - the Stage A and B cutover.

## Councils and what they changed

- **v0.5:** five adversarial reviewers (C1 to C5) and three QC raters (Q1 to Q3). They changed:
  - sizing: real-browser proofs, the Fill floor, the caption rule
  - the parallax driver
  - the per-kind table
  - the cuts.
- **v0.6:** the QC sweep (QS-A, QS-B, QS-C), fact-checked, changed:
  - the rollout wording
  - the Slice gate (now a hand-built page)
  - owning atoms for seven settings
  - about 20 missing migration rows
  - the atom stylesheets' fate
  - the loading rule
  - the "modelled on" claims
  - this proposal's missing columns
  - the per-device design (itself QC'd: 11 of 15 findings valid; two of the reviewer's suggestions were wrong and would have wasted downloads).

## Found along the way, outside this spec

- **Gallery carousel on tablet and phone:** images after the first keep their desktop width (`gallery/style.css`, the tablet and mobile carousel rules). It's a two-line fix.
- **Surface treatment on the decorative image:** it never starts, because the effect looks for a photo inside itself (`fx-surface-treatment.js::initTreatment`). It's a one-line fix.
- **Motion track:** flip runs intermittently; curtain doesn't play when it is a drawer's only motion; the audio visualisers are blank at rest; the header rests shorter under reduced motion.

## After approval

These are your brief's Tasks 2 to 7:
1. Councils on the listed commits.
2. Contracts.
3. Proofs.
4. Stage A on main: atom edits live and guarded, new files unadopted. The Slice gate is a hand-built page with a photo on desktop and video on mobile.
5. Stage B: one cutover release with migration and your eye on five sites.
6. LEDGER and handoff.
