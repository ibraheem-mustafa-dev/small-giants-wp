# R: per-device media KIND (video desktop, image mobile)

Date 2026-11-09. Evidence is from opened sources only; anything else is marked NOT VERIFIED / NOT FOUND. GitHub code search hit its rate limit mid-run, so Kadence, Spectra, GenerateBlocks and Bricks source was not read.

## Q1 Web platform

| Question | Finding | Source |
|---|---|---|
| 1a `media` on `<source>` in `<video>`: support | MDN BCD `html.elements.source.media`: Chrome 3 (Chrome Android, Opera, WebView mirror it), Edge 12, Firefox 15 with the note "In Firefox 53-119, `media` is supported only in `<source>` within `<picture>`" (so video/audio from Firefox 120), Safari 3.1 (iOS mirrors). The BCD does not record Chrome's removal and re-add. Chrome 120 for video was reported by web.dev (Nov 2023) and Scott Jehl, both pre-release statements; Chrome's own release notes NOT VERIFIED. A blink-dev "Intent to ship: Media query support for video source elements" thread exists (title only seen). | https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/source.json ; https://web.dev/blog/web-platform-11-2023 ; https://groups.google.com/a/chromium.org/g/blink-dev/c/QxNXdcTG0dI |
| 1a Once or on resize | Once. Spec: "The media attribute is only evaluated once during the resource selection algorithm for media elements"; environment changes are not tracked (unlike `picture`). Scott Jehl: "assessed only at page load time... you'll need to refresh the page". | https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element ; https://scottjehl.com/posts/responsive-video/ |
| 1b `display:none` `<img>` eager | NOT VERIFIED. MDN says only that eager loads "regardless of whether or not the image is currently within the visual viewport". The web.dev sentence that Chrome, Safari and Firefox do not load `display:none` images sits inside the `loading="lazy"` article, so it is evidenced for lazy only. | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img ; https://web.dev/articles/browser-level-image-lazy-loading |
| 1b `display:none` `<img>` lazy | Not loaded: "Chrome, Safari, and Firefox don't load images using display: none; styling, either on the image element or on a parent element. However, other image hiding techniques, such as using opacity:0 styling, still cause the browser to load the image." MDN: lazy images "never be loaded if they do not intersect a visible part". | web.dev and MDN img links above |
| 1b `display:none` `<video preload="none">` | NOT VERIFIED for display:none. MDN: `none` = "should not be preloaded", but it is "a mere hint". With `loading="lazy"` on video: "will not start downloading and autoplaying until the element is near or within the viewport". | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video |
| 1b `display:none` `<video autoplay>` | NOT VERIFIED for display:none. MDN: "autoplay has precedence over preload... the browser would obviously need to start downloading the video". Treat a hidden autoplay video as downloading unless a network test proves otherwise. | MDN video link above |
| 1b `display:none` `<iframe loading="lazy">` | NOT VERIFIED. web.dev says the attribute defers offscreen iframes and is "honored, subject to distance limits"; nothing on display:none. | https://web.dev/articles/iframe-lazy-loading |
| 1c Recommended pattern | No primary source states one "best" recipe. Evidence supports: (1) `<video>` with `<source media="(width >= 800px)" src=...>` plus `poster` and no catch-all source, so a phone matching nothing fetches no video (MDN's source example has this shape with a catch-all second source added); (2) for a different KIND the platform has nothing: `media` only picks among video files, never swaps video for an `<img>` or SVG, and `<picture>` only picks images. A kind switch therefore needs CSS hiding of one element (lazy images are then not fetched) or JS/server choice of which element to emit. No standard covers it. | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/source ; https://scottjehl.com/posts/responsive-video/ |

## Q2 Products

| Product | Per-device KIND? | Editor | Stored / rendered | Unused kind downloaded? | Source |
|---|---|---|---|---|---|
| Elementor | Partly. One background type per element (video or image) plus a "Play On Mobile" switch and a "Background Fallback" image. | Switcher "Play On Mobile" (video type only), MEDIA control "Background Fallback" | Fallback is CSS `background: url(...) 50% 50%; background-size: cover` on the element. With play_on_mobile off, the video container gets class `elementor-hidden-mobile` and the JS handler returns early in mobile mode, so the video is never activated. | Video: no (never activated on mobile). Fallback image is a CSS background, always requested. | elementor/elementor `includes/controls/groups/background.php::play_on_mobile`, `::video_fallback`; `includes/elements/container.php` (`elementor-hidden-mobile`); `assets/dev/js/frontend/handlers/background-video.js` (`background_play_on_mobile` + `getCurrentDeviceMode`) |
| Stackable | YES. Separate URL attributes per device (`backgroundMediaUrl`, `...Tablet`, `...Mobile`); each URL may be video or image (`urlIsVideo` tested per URL), so desktop video + mobile image works. | Desktop/Tablet/Mobile tabs on one media control (`useDeviceType`) | Frontend emits one `<video autoPlay muted loop playsinline src=...>` per device with classes `stk--hide-desktop/tablet/mobile`; images become per-breakpoint CSS. style.js skips the CSS for a video URL ("this will cause the video to show up twice in the network requests"). | Not guaranteed: hidden videos still carry `src` + autoplay, so they likely download (NOT VERIFIED by network test). Image kind avoids duplicate requests. | gambitph/Stackable `src/components/div/video-background.js::VideoBackground.Content`; `src/block-components/helpers/backgrounds/edit.js`; `src/block-components/helpers/backgrounds/style.js` |
| Kadence Blocks (Row Layout) | Docs only: background settable for Desktop, Tablet, Mobile; overlay per device; visibility toggle per device; "Video Poster" shown behind the video until it loads; no dedicated fallback; mobile video behaviour not described. Source not read. | Per-device background tabs, visibility toggles | NOT VERIFIED | NOT VERIFIED | https://docs.nexcess.com/software/kadence/row-layout-block/ (redirect from kadencewp.com help centre) |
| Spectra | NOT VERIFIED (docs 404, source not read) | | | | |
| GenerateBlocks | NOT VERIFIED (docs redirect to learn.generatepress.com/v1-blocks/, no video/device text found) | | | | |
| Bricks | NOT VERIFIED (docs 404) | | | | |
| Webflow | NOT VERIFIED (help page 403) | | | | |
| Framer | NOT VERIFIED (not fetched) | | | | |
| Divi | NOT VERIFIED (not fetched) | | | | |

## Q3 Effects tied to media kind per device

| Product | Finding |
|---|---|
| Elementor | NOT FOUND (video handler gates only on mobile mode). |
| Stackable | NOT FOUND in the files read (video-background.js has no effect logic). |
| Kadence, Spectra, GenerateBlocks, Bricks, Webflow, Framer, Divi | NOT VERIFIED. |

## Archetype

- (i) Data shape (Stackable): the slot holds one value PER DEVICE (desktop, tablet, mobile), each carrying its own kind (video, image, later svg/embed), not one kind with per-device URLs. Elementor's single kind + "play on mobile" + fallback image is the weaker precedent.
- (ii) Rendering: emit only what the device can use. `<source media>` cannot change kind and is evaluated once, so a kind switch is server-emitted markup plus CSS hiding (Stackable: one element per device with `stk--hide-*`; images as per-breakpoint CSS) or JS that gates activation by device mode (Elementor handler).
- (ii) No wasted download: lazy `display:none` images are not fetched (web.dev), but hidden autoplay video probably is. Give hidden videos no `src` (keep it in `data-src`, set by JS on the matching breakpoint) or use `<source media>` when only the video file differs. Always render a poster/fallback image.
- (iii) Editor control: per-device tabs on the media control with a kind picker inside each tab (Stackable device tabs), plus a plain fallback-image field for video (Elementor `video_fallback`).
- Gap to close before building: a DevTools network test that `display:none` + autoplay/preload=none video, eager img and lazy iframe issue no request; no cited doc states it.
- Effects: no proven precedent found; SGS must define it (effect applies only where the active device's kind supports it).
