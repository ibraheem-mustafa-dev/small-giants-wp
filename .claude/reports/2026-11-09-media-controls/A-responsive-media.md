# A. Responsive media: what the specs and code actually say (read from E:/sgs-tmp/wt-indus)

There are THREE separate per-device media mechanisms, plus one standard (Spec 35 D5) that calls them all "art direction". Terminology: "Art direction" is the inspector label ("Art direction (optional)", BackgroundPanel.js) and the Spec 35 D5 name ("Per-device MEDIA SOURCE (art direction) - the canonical pattern"). Its data shape is flat sibling attributes `{base}` / `{base}Tablet` / `{base}Mobile`. The "responsive object" (one attribute holding `{desktop,tablet,mobile}`) is the Spec 02 / Spec 35 D3 shape for lengths and values ("One stored shape: a length per device ... in one object attribute", 02-SGS-BLOCKS.md). Media files are deliberately NOT in that shape.

## Mechanism 1: background image (container, hero standard variant, every wrapper adopter)

Attributes (container/block.json): `backgroundImage`, `backgroundImageTablet`, `backgroundImageMobile`, each `{"type":"object"}` holding `{id,url,alt}` (BackgroundPanel.js onSelect writes `{ id, url, alt }`). Editor: one `<ResponsiveControl label="Art direction (optional)">` gated on `hasBgImage`; the desktop tab shows an italic note, tablet and mobile tabs show Set/Replace and "Use the main image here".

Emission (class-sgs-container-wrapper.php::SGS_Container_Wrapper::render):
- `$sgs_bg_img_is_simple = ( 'no-repeat' === $bg_repeat ) && in_array( $bg_size, array('cover','contain') ) && 'fixed' !== $bg_attachment && empty( $bg_image_tablet['url'] ) && empty( $bg_image_mobile['url'] );`
- Simple: a real `<img>` via `sgs_responsive_image( id, url, '', 'full', {class sgs-container__image-bg, aria-hidden true, fetchpriority high|auto, loading eager|lazy, decoding sync|async} )`. Only the first background on the page gets high/eager (`sgs_next_background_image_index()`, shared with hero). object-fit and object-position go to a scoped rule `.uid > .sgs-container__image-bg`. Srcset comes from wp_get_attachment_image when an id exists; width/height from attachment metadata. Alt is always empty (decorative).
- NOT simple (tiled, non-cover/contain size, fixed attachment, OR any tablet/mobile image): `if ( $has_bg_image && ! $has_bg_video && ! $sgs_bg_img_is_simple )` the base image is a CSS `background-image:url(<stored url>)` on `.uid::before` (`content:"";position:absolute;inset:0;z-index:-1`). Tiers: `SGS_Breakpoints::media('tablet') . '{.uid::before{background-image:url(tablet url);background-size;background-position}}'`, same for mobile. Breakpoints (class-sgs-breakpoints.php::query): tablet = `(max-width:TABLET_MAX)`, mobile = `(max-width:MOBILE_MAX)`, so a tablet-only image cascades down to phones; a mobile-only image affects phones only; mobile wins by source order.
- Hero: hero/render.php `$has_standard_bg_image = ! $is_split && ! empty( $bg_image['url'] ) && empty( backgroundImageTablet url ) && empty( backgroundImageMobile url )`. Same rule; with any tier set it falls back to the wrapper's `::before`. The code comment: "a tablet or mobile image swaps on the wrapper's ::before layer inside @media rules, which a lone <img> cannot follow, so with any tier image set the whole background stays on the wrapper's CSS path."

Download behaviour: CSS `url()` on the winning rule only, so a phone downloads only the mobile image. But: discovered only after the style is parsed (invisible to the preload scanner), no `fetchpriority`, no `<link rel=preload>` (grep: none), no srcset/sizes (raw stored `url`, usually the full-size original), no width/height, alt unused. Some tiers unset: unset tiers inherit upward through the CSS cascade, correct. Video: separate `bgVideo` / `bgVideoTablet` / `bgVideoMobile` (wrapper emits `<video ... preload="none">`). SVG: `bgSvgContent`.

Verdict on the claim "a per-device background image paints on ::before CSS and not an element": TRUE for container and hero, exactly when any tablet or mobile image is set (or tiled/sized/fixed). The block.json absentWhy wording ("A tiled, sized, parallax, fixed or per-device background image paints on the root's ::before layer (SGS_Container_Wrapper::render, $sgs_bg_img_is_simple false)") is accurate except "parallax" is not a clause of `$sgs_bg_img_is_simple` in the code I read.

Consequence: setting ONE mobile image demotes the DESKTOP image from an LCP-prioritised `<img fetchpriority=high>` with srcset to a plain CSS background with no priority and no srcset. The code comment admits it: "whenever ANY tier override exists the WHOLE image stays on the existing CSS path until the tiers are migrated too." An unfinished migration with no spec stage.

## Mechanism 2: foreground media tiers (hero split media; timeline entry media; decorative-image per Spec 02)

Attributes: `splitImage` / `splitImageTablet` / `splitImageMobile` (plus splitVideo*, splitSvg*, splitLottie*, splitMediaType*), and per-tier alt `splitMediaImageAlt{Tablet,Mobile}` (hero/render.php `$sgs_hero_split_alt`).

Emission: includes/helpers-tier-media.php::sgs_tier_media_render builds one sibling element per present tier: classes `base`, `base--tier` (desktop only when a narrower tier exists), `base--type`; `sgs_tier_media_toggle_css` emits compound `display:none` rules per band (Spec 35 D5 band-ownership table). Images go through `sgs_responsive_image` (srcset from the attachment id; width/height from stored media, else `wp_get_attachment_image_src(...,'large')`, so CLS is handled). Video siblings: `preload="metadata"` for desktop, `"none"` otherwise. SVG siblings: `wp_kses( ..., sgs_allowed_svg_tags() )` per tier.

DEFECT (verified in code): `$img_loading = $options['img_loading'] ?? 'eager'; $img_fetchpriority = $options['img_fetchpriority'] ?? 'high';`. The hero calls `sgs_tier_media_render( $split_tiers, 'sgs-hero__split-media', $uid, $sgs_hero_split_alt, array(...extras) )` with no options. So EVERY tier image is `loading=eager fetchpriority=high`, and a `display:none` image with eager loading still downloads. A hero with desktop, tablet and mobile split images fetches all three on every device, each at high priority. Only timeline passes `img_loading => lazy`. The video branch comment ("keeps sibling markup honest against D5's three-videos-all-fetching objection") shows the author knew; images were missed. The hero split image also does not use `sgs_image_loading_attrs()` or the page-wide first-image counter.

Only some tiers set: handled correctly by the band-ownership table (computed, not hand-written).

## Mechanism 3: sgs_render_media (helpers-media.php, image branch)

Attr `mobile_url`: a true `<picture class="sgs-media-picture"><source media="(max-width:MOBILE_MAX)" srcset="mobile_url"><img loading=lazy decoding=async ...></picture>`. One mobile tier only, no tablet. The only `<source media>` picture in the files I read; Spec 36 also names a `<picture>` for the nav logo (chromeLogo Tablet/Mobile).

## Shared atoms and the "responsive object" for a single image

includes/class-sgs-media-element.php and helpers-media-element.php are the atom framework (`sgs-media-el` marker, object-fit and focal-point atoms keyed by prefix, scoped scope-class CSS). `splitMediaObjectPosition` is a TIER OBJECT emitted as scoped per-device `object-position` (per-device focal point for one image: the responsive-object shape). helpers-media.php::sgs_media_cover_crop_plan computes a concrete `sizes` string (`(max-width: Tpx) Apx, (max-width: Mpx) Bpx, Cpx`) from per-device MaxWidth/Height/DisplayWidth, and `sgs_media_drop_auto_sizes` strips core's `auto`. Well designed for single-image responsive crop.

## Spec vs build contradictions

1. Spec 35 D5 says the control is one `<ResponsiveControl>` picker and tiers are sibling markup (Spec 02: "Art-direction images for tablet and mobile are sibling `<img>` elements toggled by compound selectors"). The background image uses the same control but renders as CSS `::before`, never mentioned in D5 or any spec.
2. D5: "Alt text is NOT tiered." Hero tiers it (`splitMediaImageAlt*`, per-tier alt cascade in sgs_tier_media_render).
3. D5's sibling pattern depends on hidden siblings not downloading. Code defaults to eager/high (see defect).
4. The `$sgs_bg_img_is_simple` comment promises tier migration later; no spec or plan names it (grep "art direction" in specs hits only Spec 02 L541, Spec 35 D5, Spec 36, Spec 48 `flat_sibling`).
5. Spec 48 cloning maps the three background attrs through `flat_sibling` by `css_tier`, so the cloner depends on the flat three-attribute shape.

## Term mapping

- Art direction = a different IMAGE FILE per device: flat sibling attrs (`xTablet`, `xMobile`): background images, hero split media, decorative-image, responsive-logo, timeline media, bgVideo*.
- Responsive object = ONE setting `{desktop,tablet,mobile}` of values: object-position, min-height, padding, gap, radius, displayWidth. A single image with a per-device focal point is a responsive object; swapping files is art direction. Both are needed; they are different.

## Is it optimal? Honest evaluation

Wrong or weak:
1. Background tiers are CSS-only: no srcset/sizes, no preload, no fetchpriority, and setting any tier DEMOTES the desktop image off the LCP path. An LCP hero with a mobile crop is exactly the case that matters most.
2. Foreground tiers use display:none siblings with eager/high: all three download, three high-priority fetches. `<picture>` would download one.
3. Three divergent mechanisms for one idea; alt tiered in one place and not others; per-device focal point only for foreground.
4. Flat sibling attributes triple every media attribute; background tiers carry no width/height.
5. `<picture>` with `<source media>` exists only in sgs_render_media (one mobile source).

Standards: art direction = `<picture>` + `<source media>` (each source with own srcset/sizes; browser downloads exactly one; `fetchpriority`/`loading` on the single `<img>`; visible to the preload scanner). `image-set()` is resolution/format switching in CSS and cannot do media-conditional crops. Use a CSS background only for tiling, fixed attachment, or true decoration.

Best setup (pre-production, no back-compat, FP-14 compliant):
- Data: one object attribute per media slot: `{ "alt": "", "decorative": true, "fit": "cover", "sources": { "desktop": {id,url,w,h,focal:{x,y}}, "tablet": {...}|null, "mobile": {...}|null } }`. Tiers inherit UP via `sgs_resolve_tier`; alt/decorative once at slot level (honours D5); focal per source.
- Render: one shared `sgs_media_picture()`: `<picture><source media="(max-width:MOBILE_MAX)" srcset sizes><source media="(max-width:TABLET_MAX)" srcset sizes><img src srcset sizes width height alt loading fetchpriority decoding></picture>`. A tier with no source is omitted so cascade-up is automatic. The first picture on the page takes eager and `fetchpriority=high` (existing page counter), all others lazy. Per-tier object-fit, object-position and `aspect-ratio` in scoped CSS (no inline style). LCP preload: `<link rel=preload as=image imagesrcset imagesizes media=...>` per source with `media`, emitted via the head collector for the lead image only.
- Backgrounds: keep CSS `::before` ONLY for tile, fixed, parallax. Every other background including per-device becomes a `<picture>` layer with object-fit. Delete the tier clause from `$sgs_bg_img_is_simple`.
- Video keeps the `preload=none` swap; SVG per-tier kses stays.
- Immediate fix regardless: in sgs_tier_media_render give non-base tiers `loading=lazy fetchpriority=auto` (or only the active band eager) until `<picture>` replaces siblings.

## Scope note

Read in full: the wrapper bg sections, hero bg/split sections, helpers-tier-media.php::sgs_tier_media_render, helpers-media.php image branch and sizes helpers, BackgroundPanel.js art-direction control, Spec 35 D5, Spec 02 decorative-image rules. Not read end to end: sgs/media render.php (1379 lines), Specs 32/38 (grep only showed no media-tier rules), the editor atom files. The sgs/media block's own per-device behaviour is therefore not verified here.
