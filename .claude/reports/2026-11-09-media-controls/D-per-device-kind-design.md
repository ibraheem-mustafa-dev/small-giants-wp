# Design: a different kind of media per device (Spec 49), approved by Bean 2026-11-09 subject to QC

The version reviewed by `QC-per-device-design.md`. After that QC, video moved from a script-filled `data-src` to `<source media>` with a reduced-motion query (`video-media-rm-test.mjs`), and the blank image source stays a data URI (an empty `srcset` downloads the image). Spec 49 §7.1 holds the result.

## Problem

One media slot (the `sgs/media` block, the hero split column, a section background, timeline and card media) should be able to show a different kind of media per device: for example a video on desktop and a photo on mobile, or a photo on desktop and an inline SVG on mobile. Only the files for the visitor's device may download.

Today:
- **Hero split:** does it through `plugins/sgs-blocks/includes/helpers-tier-media.php::sgs_tier_media_render`, but every tier's `<img>` is `loading="eager" fetchpriority="high"`, and every video tier is `autoplay preload="none"`. The test below shows browsers download both even when hidden.
- **Container background:** stores image tiers (`backgroundImage`, `…Tablet`, `…Mobile`) and video tiers (`bgVideo`, `…Tablet`, `…Mobile`). A set video plays on every device (the mobile video falls back up to the desktop one), with the image as a fallback beneath it. Kind cannot switch per device.
- **`sgs/media`:** one `mediaType` for all devices.

## Evidence

- **Browser test:** `E:/sgs-tmp/media-qc/hidden-download-test.mjs`, output in `hidden-download-result.json`. Real Chrome, Playwright Firefox and WebKit, at 375 and 1440, with each case hidden by `display:none` at 375.

| Case | Downloads when hidden? |
|---|---|
| `<img loading="eager">`, hidden itself or by its parent | Yes, in all three |
| `<img loading="lazy">`, hidden | No, in all three |
| `<video autoplay>`, hidden, with or without `preload="none"` | Yes, in all three |
| `<video preload="none">` without autoplay, hidden | No in Chrome and Firefox; yes in WebKit |
| `<video>` with `data-src` only | No, in all three |
| `poster` on a hidden video | Yes, in all three |
| `<iframe loading="lazy">`, hidden | No |
| `<iframe>` (eager), hidden | Yes |
| `<video>` with `<source media="(min-width:768px)">` and no other source, at 375 | No video downloads; its poster does |
| `<picture>` with `<source media>` | Exactly one file per width |
| `<picture>` whose desktop `<source>` is a `data:` blank GIF, with an eager mobile `<img>` | Desktop downloads nothing; mobile downloads the photo |

- **Products** (`E:/sgs-tmp/media-qc/R-per-device-kind.md`, two claims re-read from source):
  - **Stackable** (`gambitph/Stackable src/components/div/video-background.js`) stores one media URL per device, each of which may be a video or an image. It prints one `<video autoPlay src>` per device, hidden by `stk--hide-*` classes, so the hidden videos download.
  - **Elementor** (`assets/dev/js/frontend/handlers/background-video.js`) offers one kind per element plus a "Play on mobile" switch: with it off, the handler returns early on mobile and shows a fallback image.
  - No product was found that ties effects to the media kind per device.

## Design

1. **Data.** One `Source` value per slot, a responsive object `{desktop, tablet, mobile}`. Each device holds `{kind, id, url, …}`; tablet and mobile inherit upward until set (Spec 35 D3). The slot's registry entry lists the kinds it allows (`types`, already enforced by the atom registry); a device's kind must be one of them.
2. **Editor.** One "Media" setting with Desktop, Tablet and Mobile tabs, using the existing `ResponsiveOverride` pattern ("Mobile: using Desktop"). Each tab holds a kind choice (only the slot's allowed kinds; hidden when the slot allows one kind), the file, and for video a Cover image.
3. **Rendering**, by extending `sgs_tier_media_render` (no new renderer):
   - **Images:** every device that shows an image is served by one `<picture>`. Devices that show another kind get a `<source media>` whose `srcset` is an inline blank GIF, so nothing downloads there, and the `<img>` can still be eager on the device that shows it.
   - **Video:** the file sits in `data-src` only. A small view script picks the source for the current device on load and on a breakpoint change (`matchMedia`), then plays it. Hidden videos download nothing. The cover image is not a `poster` attribute: it is printed as a `<picture>` under the video, using the same blank-source rule, so it loads only on the devices that show that video.
   - **Embeds:** `iframe` with `loading="lazy"` on devices where it is hidden, or the same `data-src` holder.
   - **SVG:** inline (sanitised by `sgs_svg_kses_allowed_tags`), no download.
   - A CSS rule from the shared breakpoint helper shows the right sibling per device.
4. **Loading priority** (Bean's rule, from the Eye Care session). "Above the fold" is the first two top-level content sections, template parts excluded, including every loop item in them. Images there load eagerly, capped at 16 (`sgs_eager_image_limit`), and the first gets `fetchpriority="high"`; everything else is lazy. The definition is one shared pure function of the parsed block tree, which Eye Care's round 13 builds in `includes/motion/`. With per-device kinds, eager and high priority apply only on the devices where the image shows (through the blank-source rule).
5. **Where it applies.** The kind switch appears only where a slot allows two or more kinds: the Media block, the hero split, backgrounds, timeline media and card media. Photo-only slots (product and gallery photos, avatars, thumbnails) keep per-device files but no kind switch. Logos and decorative layers allow photo or SVG.
6. **Effects.** The Effects list shows the registered effects that fit any kind the slot shows on any device. Each effect runs only on the devices whose media can take it, and the panel says so ("Desktop and tablet; the phone shows a photo"). Switching the editor's device preview updates it.
7. **Background panel.** Its separate Image and Video tabs become this one Media setting.
8. **No JavaScript or reduced motion.**
   - With no JavaScript, the cover image (or photo) shows and the video never loads.
   - Under reduced motion, video does not autoplay; the cover shows with the existing play/pause control.
