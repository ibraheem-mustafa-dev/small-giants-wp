# Media controls research (image, video, background), 2026-11-09

Scope note: time-boxed run. Items 1 and 4 are well covered by primary sources. Item 2 is verified only for Kadence (via Nexcess-hosted Kadence docs) and Webflow (help centre, via search snippets). GenerateBlocks, Spectra, Stackable, Greenshift, Bricks, Breakdance, Framer and Elementor's responsive-inheritance article were NOT verified from primary sources (redirects, a certificate error, truncated pages). Item 3's WP 7.x inspector guidance was not found; only the ToolsPanel reference was read. Treat those gaps as open.

## 1. Art direction versus resolution switching

MDN separates the two problems. Resolution switching serves the same picture at different sizes using `srcset` with `w` descriptors plus `sizes` (or `x` descriptors with no `sizes`). Art direction serves different crops and uses `<picture>` with `<source media>`. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images

MDN rule: use `media` only for art direction, never mix it with media conditions in `sizes`. The first matching `<source>` wins, and the `<img>` is mandatory as the default and fallback. Same source.

MDN explains why this must be declarative HTML: the browser preloads images before parsing CSS or JavaScript, so a JavaScript or CSS swap downloads the wrong image first. Same source. Consequence: per-device images belong in `<picture>`, not in a JS swap.

CSS `image-set()` is resolution and format switching only (`x`, `dppx` descriptors, `type()` for AVIF/JPEG fallback), Baseline widely available since September 2023. Backgrounds expose nothing to assistive technology, so `image-set()` suits decorative imagery only; informative images need an `<img>` with alt text. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/image/image-set

LCP: `fetchpriority="high"` on the LCP image lifts it from Low to High priority (Google Flights test: LCP 2.6 s to 1.9 s). It is a hint, not a directive. Preload is still required to discover LCP images that are CSS backgrounds, and that preload should also carry `fetchpriority="high"`. Source: https://web.dev/articles/fetch-priority

Responsive preload: use `<link rel="preload" as="image" imagesrcset imagesizes fetchpriority="high">` in the `<head>`, never in an HTTP Link header or 103 Early Hints (the viewport is not defined yet). There is no preload equivalent of `<picture>`; for art direction emit one preload per breakpoint, each with its own `media` query. Preload only the preferred format (for example AVIF) because `type` does not stop at the first supported format. If the image is already discoverable in markup, skip the preload. For a CSS `image-set()` background, preload with `imagesrcset` and no `href`. Source: https://web.dev/articles/preload-responsive-images

Implication for a shared system: a hero or section background that is an LCP candidate should be a real `<img>` (or `<picture>`) positioned absolutely with `object-fit: cover`, not a CSS background. That gives alt text where needed, `srcset`/`sizes`, `fetchpriority`, `loading`, and preload-scanner discovery without a manual preload. This is an inference from the sources above, not a quoted recommendation.

Per-device focal points: MDN's responsive images guide does not cover `object-position`. The standard mechanism is `object-position` on an `<img>` (or `background-position` on a background), set per breakpoint as a percentage pair. Kadence stores a focal point as Left and Top percentages and lets the author choose it by dragging a dot on a preview. Source: https://docs.nexcess.com/software/kadence/row-layout-block/ . The per-breakpoint part for `<img>` is our design decision; no primary source specifies it.

## 2. How the products organise it (verified subset)

Kadence Blocks (Row Layout), per its docs: background can be set separately for Desktop, Tablet and Mobile ("use a different background for that device type"). Focal point is a draggable dot or manual Left/Top percentages. Size options are Cover, Contain, Auto or Custom width/height, and Repeat appears only when size is not Cover (a dependent control that is shown or hidden, not disabled). Attachment is Scroll, Fixed or Parallax. Image Focus "does not work when Parallax is enabled" because the parallax script owns the position (a documented conflict between two controls). Overlay is set per device with opacity, solid or gradient, and an optional overlay image; blend mode carries a browser-support caveat. Video background accepts local upload, HTML5 URL, YouTube or Vimeo, with mute, loop, play/pause visibility, a poster image and a background colour, and is explicitly "for decorative purposes". Source: https://docs.nexcess.com/software/kadence/row-layout-block/

Kadence has a separate Image Overlay block with a hover opacity setting for the overlay (a hover effect inside the block's own panel). Source: search snippet at https://www.liquidweb.com/?p=445470 (secondary, unverified).

Webflow, per its help centre: styles inherit down from a higher breakpoint and any inherited style can be overridden at any time; Webflow recommends designing desktop first. Settings in the Element settings panel apply to all breakpoints regardless of the breakpoint being viewed; only Style panel values are per breakpoint. The background-styles article says background controls apply to most elements except media elements (image, video), so the image element and the background layer are separate concepts there. Background video is a distinct component with a built-in play/pause button. Sources: https://help.webflow.com/hc/en-us/articles/33961260724243 , https://help.webflow.com/hc/en-us/articles/33961278898323

Not verified: GenerateBlocks, Spectra, Stackable, Greenshift, Bricks, Breakdance, Framer, Elementor. Elementor's help page on background parallax gave no usable detail on this run. Whether effects (filter, duotone, hover zoom, parallax speed) live in the background panel, a global effects panel, or both is therefore confirmed only for Kadence (parallax and overlay inside the background panel; hover opacity in a separate block) and Webflow (separate Interactions panel; not fetched).

## 3. Inspector UX

WordPress `ToolsPanel` (reference guide): items are shown by default only with `isShownByDefault`; otherwise a child is shown only after a value is set, decided by each item's `hasValue`. The panel menu toggles each item. Hidden items render nothing, or placeholders if `shouldRenderPlaceholderItems` is true. `onDeselect` clears that item's value; `resetAll` is required and runs every item's `resetAllFilter`. `panelId` restricts which items register. Elements outside a `ToolsPanelItem` still render but are not controlled by the menu. The page says nothing about per-device behaviour or conditional display. Source: https://developer.wordpress.org/block-editor/reference-guides/components/tools-panel/

Pattern evidence: Kadence hides Repeat unless size is not Cover and documents the Focus/Parallax conflict rather than disabling the control. Webflow splits per-breakpoint Style values from all-breakpoint Element settings. Elementor's inherited-values article and a WP 7.x inspector guideline were not retrieved.

## 4. Parallax

MDN: `animation-timeline: view()` creates a view progress timeline as the element crosses its scroll container; inset arguments set start and end; scrolling back reverses it; MDN lists it as Baseline 2026 (newly available). The page shows an `@supports not (animation-timeline: view())` fallback pattern. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/view

MDN `background-attachment: fixed` is fixed relative to the viewport and ignores `background-origin`. The mobile and iOS caveats and the transform containing-block note were in the unread part of the page; they are NOT verified here. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/background-attachment

Technique (general practice, not quoted from a source): animate `transform: translateY()` on a real child element that is taller than its frame (overscan) so no gap shows; speed control is the overscan percentage or the translate distance; wrap in `@media (prefers-reduced-motion: no-preference)`; fall back to a static image where `animation-timeline` is unsupported. Kadence's own Parallax mode enlarges the image and reveals more as you scroll, which is the same overscan idea driven by script.

## Sources
- https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images
- https://developer.mozilla.org/en-US/docs/Web/CSS/image/image-set
- https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/view
- https://developer.mozilla.org/en-US/docs/Web/CSS/background-attachment
- https://web.dev/articles/fetch-priority
- https://web.dev/articles/preload-responsive-images
- https://developer.wordpress.org/block-editor/reference-guides/components/tools-panel/
- https://docs.nexcess.com/software/kadence/row-layout-block/
- https://help.webflow.com/hc/en-us/articles/33961260724243
- https://help.webflow.com/hc/en-us/articles/33961278898323
