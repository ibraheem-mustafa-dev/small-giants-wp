# T8 draft census: media treatments and motion in three AI-produced designs

Scope: only files under the three `handoff/` folders were read. All three drafts are plain-text `.dc.html` templates (no bundle decoding needed); `support.js` was not read. Counts come from regex over the template source and from `animations.json` (`records`, `counts`, `unresolved`). Where a value is a template expression (`{{ ... }}`) the runtime value is "not verified". No design uses `<video>`, `<picture>`, `<source>`, `srcset`, `sizes`, `<canvas>`, `<object>` or `<embed>`; Indus uses two `<iframe>` map embeds.

Abbreviations: EC = eye-care-ward-end (`Eye Care Birmingham.dc.html`, `Frame Card.dc.html`), IF = indus-foods (`Indus Foods Website v2.dc.html`, `TradeApplication.dc.html`, `EnquiryForm.dc.html`, `indus-logo.js`, `image-slot.js`), MM = mamas-munches-redesign (14 `.dc.html` files plus `store.js`).

## A. Motion inventory

### A0. Record counts (`animations.json`)

| Design | Total records | Mechanisms |
|---|---|---|
| EC | 213 | css-animation 90 (entrance 78, feedback 5, marquee 2, drawer 2, modal 2, mega-menu 1), css-transition 97 (hover 78, state 19), css-pseudo 16, js-style-write 6, js-scroll 3, css-media 1; 0 Web Animations calls |
| IF | 217 | css-transition 125, waapi 50, js-style-write 16, css-pseudo 15, js-scroll 5, css-media 3, waapi-control 2, js-text-write 1 |
| MM | 196 | css-transition 139, css-pseudo 31, waapi 10, js-scroll 8, js-style-write 3, css-animation 2, css-media 2, js-text-write 1 |

None of the three uses CSS scroll timelines (`animation-timeline`, `scroll-timeline`, `view-timeline`: 0 hits each), `will-change` aside (EC 1, IF 2, MM 0), no GSAP, Lenis, WebGL or canvas, and no external animation script. `animations.json::unresolved` is empty for EC and MM; for IF it holds the reduced-motion note and the "real :hover/:focus cannot be synthesised" note, so IF hover values are from source, not observed.

### A1. Image motion

| Design | Effect | Where | Trigger | Properties and values | Duration, delay, easing | Per device |
|---|---|---|---|---|---|---|
| EC | Ken Burns settle | `Eye Care Birmingham.dc.html::img` (hero, `animation:kenburns`) record CA-04 | route mount of home | `transform: scale(1.08)` to `scale(1)` | 3000 ms, 0, `cubic-bezier(.2,.7,.2,1)`, once | not verified (no breakpoint noted) |
| EC | Hero parallax | hero wrapper (`heroRef`), record J-05 | window scroll, passive listener | `transform: translate3d(0, scrollY*0.18px, 0)`; JS, removed under reduced motion | none (direct write) | none noted |
| EC | Hover zoom | `img` in `sgs-about-strip` (TR-20): `transition:transform 1.4s` with `style-hover="transform:scale(1.05)"`; `span` background-image tile: `transition:transform 1s`, hover `scale(1.07)`; `Frame Card.dc.html` product tile `div` background-image: `transition:transform .9s, filter .4s` with a hover transform (exact value not verified) | pointer hover | scale 1.05, 1.07 | 1400 ms, 1000 ms, 900 ms; all `cubic-bezier(.2,.7,.2,1)` | hover only, no touch variant |
| EC | Gallery image enter | `div` background-image gallery, `animation:zoomIn .5s both` | gallery key change | `opacity 0>1`, `scale(.985)>none` | 500 ms, ease | none |
| EC | Filter change on swatch | lens preview `div`: `transition:filter .6s cubic-bezier(.2,.7,.2,1)` | state | `filter` value is a template expression (not verified) | 600 ms | none |
| IF | Hero image frame reveal | A-22, hero frame `div` | page load | `clip-path: inset(8% 8% 8% 8% round 26px)` to `inset(0 round 22px)`, `opacity 0>1`, `scale(.94)>none` | 1100 ms, delay 200, `cubic-bezier(.16,.84,.32,1)` | not verified |
| IF | Hero image zoom-out | A-23 | page load | `scale(1.18)` to `scale(1)` | 1600 ms, delay 200, same easing | not verified |
| IF | Hero image parallax | J-03, `[data-hero-img]` | window scroll, rAF-throttled | `translate: 0 round(scrollY * -0.06)px` | none (direct write) | not verified |
| IF | Image reveal on scroll | A-08, image targets | IntersectionObserver threshold 0.12, rootMargin `0 0 -4% 0`, once | `opacity 0>1`, `clip-path: inset(10% 10% 10% 10% round 24px)` to `inset(0 round 0)` | 1000 ms, 0, `cubic-bezier(.16,.84,.32,1)` | target set differs by breakpoint and route (record note); image-slots inside the brand marquee are excluded |
| IF | Circle photo hover | `div` with `border-radius:50%;overflow:hidden` wrappers (two) | hover | `transform: scale(1.04..)` with spring transition `.55s cubic-bezier(.34,1.56,.64,1)` (full values not verified) | 550 ms | none |
| IF | Range tile hidden photo peek | J-22, J-23, `[data-peek]` card: `clip-path: circle(var(--pr,0px) at var(--mx,50%) var(--my,50%))`, transition `clip-path .4s cubic-bezier(.16,.84,.32,1)` | pointer move (not touch); hover sets `--pr:90px`; drag of a file sets `--pr:150%` | circular reveal following the cursor over a `#EAF4F7` layer, with a white wash `::after` | 400 ms | pointer only |
| IF | Brand logo marquee | A-15, `image-slot` logo tiles | mount, re-run on width change | `translateX(0)` to `translateX(-dist px)`, seamless; copies = max(2, ceil(viewport / (n x (tile+14))) + 1) | `dist / 0.045` ms (45 px/s), linear, infinite; J-14 slows to `playbackRate 0.15` on hover | dist recomputed per width |
| IF | Food scatter (float J-19, parallax J-18, pop-in A-04, float A-03) | JS-built layer | none of it runs: record notes say density is hard-coded off and `buildScatter()` never builds anything | n/a | n/a | dead code |
| MM | Logo rotate on hover | `Contact.dc.html::img[src=assets/logo-round.png]`, `SiteFooter.dc.html::img` logo | hover | `rotate(-8deg)` to `rotate(6deg) scale(1.05)` | 600 ms, `cubic-bezier(.3,1.6,.5,1)` | hover only |
| MM | No hover zoom, parallax, Ken Burns or entrance on photographs | `Home.dc.html::img`, `Product.dc.html` main image, `ProductCard.dc.html` | n/a | none found (the only image scale hover is the logo above) | n/a | n/a |

### A2. Video and embed motion

No video in any design (0 `<video>`, no `autoplay`, `poster`, `muted`, `loop`). Embeds: IF only, two `<iframe loading="lazy">` Google Maps (`Indus Foods Website v2.dc.html::iframe[title="Indus Foods location map"]`, z=15 absolute full-bleed and z=14 at 100% x 210px with `filter:grayscale(.35) contrast(1.05)`); no motion on either. EC and MM have 0 iframes (EC map tile is an `<a>` link, `aspect-ratio:4/3`).

### A3. SVG motion

| Design | Effect | Where | Trigger | Properties | Duration, delay, easing |
|---|---|---|---|---|---|
| IF | About hero sun rays spin | A-24, inlined `assets/about-hero-{desktop,tablet,mobile}.svg`, `[id="sunrays_spin"]` | mount | `rotate 0>360deg` | 40000 ms, linear, infinite |
| IF | About hero mountains rise | A-25 | mount | `translate 0 140px>0`, `opacity 0>1` | 1100 ms, `cubic-bezier(.16,.84,.32,1)` |
| IF | About hero snow fade | A-26 | mount | `opacity 0>1` | 700 ms, delay 700 |
| IF | About hero sun grow and expand | A-27, `sunrays_expand` | mount | `scale 0>4.2`, `opacity 0>1` | 4200 ms, delay 200 |
| IF | About hero gold path draw | A-28 | mount | `stroke-dashoffset 1>0` | 1600 ms, delay 1100 + i x 120, `cubic-bezier(.65,0,.35,1)` |
| IF | About hero road fill | A-29 | mount | `fill #2c3e50>#FFFFFF` | 900 ms, delay 2400 |
| IF | About hero background | A-30 | mount | `fill #2b3f59>#E7D768` | 4400 ms, `cubic-bezier(.65,0,.35,1)` |
| IF | Logo (`indus-logo.js`) | L-01 spin 60000 ms linear infinite; L-02 sun expand 1200 ms delay 150 spring `cubic-bezier(.34,1.56,.64,1)`; L-03 mountain rise 120px 1000 ms; L-04 snow fade 700 ms delay 650; L-05 road wipe `clip-path inset(100% 0 0 0)>inset(0)` 900 ms delay 500; L-06 letters rise 60px 650 ms delay 420 + i x 45 | scroll into view (entrance), loop (spin) | as listed | as listed |
| IF | Logo hover | L-07 sun pulse 900 ms, L-08 mountain bob 700 ms, L-09 letters bob 520 ms delay i x 28, L-10 rays `playbackRate 1>14` over 900 ms | hover | as listed | spring/ease-out |
| EC, MM | Inline `<svg>` icons (EC 19, MM 17, `viewBox="0 0 24 24"`) and EC `assets/*.svg` as `<img>` (WhatsApp, Google G, Instagram) | static | no motion | n/a | n/a |

The About hero SVG is chosen by breakpoint in JS: `const bp = w < 768 ? 'm' : w < 1024 ? 't' : 'd'` (IF), then fetched and inlined; the three files are identical in size (21,572 bytes each).

### A4. Section background motion

| Design | Effect | Where | Trigger | Values |
|---|---|---|---|---|
| IF | Decorative ring drift | A-40 | loop | `translate 0 0>{dx}px {dy}px` (random within +-18px), `scale 1>1.05+random x 0.07`, 7000 + random x 6000 ms, ease-in-out, infinite, random negative delay |
| IF | Hero copy and float | A-16 hero float `translateY 0>-12px` 4200 ms (184) / 900 ms (256) ease-in-out infinite; A-17 random float `translate 0 0>0 -12px`, 2800 + random x 2200 ms | loop | as listed |
| MM | Sparkle twinkle | A-02 `[data-twinkle]` | loop | `scale 1>1.35>1` with `rotate 0>90>180deg`, 2400 ms, ease-in-out, infinite |
| MM | Sticker float | A-03 `[data-float]` ("Baked to order") | loop | `translate 0 0>0 -10px>0 0`, 3200 ms, ease-in-out, infinite |
| EC | None (backgrounds are static; the only background-image motion is the hover zoom and gallery enter in A1) | | | |

### A5. Entrance and reveal (general)

| Design | Effect | Trigger | Properties | Duration, delay, easing | Implementation |
|---|---|---|---|---|---|
| EC | `rise` keyframes, 78 entrance records | route or mount | `opacity 0>1`, `translateY(18px)>none` | 500 to 1000 ms; hero ladder delays 150, 280, 420, 560 ms; ease | CSS `@keyframes rise`, `fade` (300 ms), `slideL` (`translateX(100%)>none`, 400 ms `cubic-bezier(.2,.7,.2,1)` bag drawer), `zoomIn` |
| EC | Scroll reveal `[data-reveal]` (J-01 to J-04) | IntersectionObserver, rootMargin `0 0 -6% 0`, threshold 0.01, once | `opacity 0>1`, `translateY(26px)>0` | 460 ms, stagger `min(i,7) x 70` ms, ease-out cubic `1-(1-p)^3` | JS stepped with `setTimeout(16ms)`; shows all at once without IntersectionObserver or under reduced motion |
| EC | Toast, pop, modal | state | `scale(.6)>1`, `opacity`, toast `translate(-50%,16px)>(-50%,0)` 3200 ms | 350 to 600 ms | CSS |
| IF | Route fade A-10 | route | `opacity 0>1` | 380 ms ease-out | WAAPI |
| IF | Hero copy stagger A-21 | load | `opacity 0>1`, `translateY(28px)>none`, `blur(8px)>0` | 900 ms, delay 80 + i x 110, `cubic-bezier(.16,.84,.32,1)` | WAAPI |
| IF | Scroll reveals A-05 to A-09 | IntersectionObserver | line draw `scaleY/scaleX 0>1` (1800/1400 ms, delay 200); heading `translateY(22px)`, `blur(6px)>0` 850 ms; grid item `translateY(40px) scale(.96)>none` 800 ms delay `(i%8) x 80` | as listed | WAAPI |
| IF | Mega-menu A-12, A-13; drawer A-14, A-36 to A-39; form steps A-31 to A-35 (slide 36px, success pop spring, validation shake 320 ms) | state | as in records | 320 to 700 ms | WAAPI |
| MM | Scroll reveal A-04 to A-08 | IntersectionObserver threshold 0.12, once | `opacity 0>1`, `translate 0 32px>0` (28px for single reveals) | 800 ms (750 ms) , stagger `min(index,4) x 90`, `cubic-bezier(.2,.7,.2,1)` | WAAPI, targets `[data-reveal]` |
| MM | Order tick badge A-09, nav drawer A-10, builder cookie wobble A-01 | mount, state | tick `scale(0) rotate(-40deg)>scale(1) rotate(-8deg)` 800 ms spring `cubic-bezier(.3,1.6,.5,1)`; drawer rows `translate -18px 0>0` 420 ms delay 80 + min(i,10) x 35; wobble 520 ms | as listed | WAAPI |

### A6. Scroll-driven motion and how it is built

| Design | Effect | Implementation |
|---|---|---|
| EC | Hero parallax factor 0.18 (J-05); header shadow state at scrollY > 40 | JavaScript `scroll` listener, passive; no CSS scroll timeline; `position:sticky` x4 for filter and header bars only |
| IF | Scroll progress bar `scaleX(min(1, scrollY/(scrollHeight-innerHeight)))` (J-02); hero parallax -0.06 (J-03); header shadow `0 10px 30px -18px rgba(20,40,60,.35)` (J-01, 300 ms); pinned horizontal timeline (J-04 to J-08) | JavaScript `scroll` listener, rAF-throttled. The pinned timeline is `position:sticky` inside a tall wrapper with JS writing `translate3d(-p x dist px,0,0)` where `p = clamp((stickyTop - pin.top)/(pin.offsetHeight - sticky.offsetHeight), 0, 1)`; scrubbed (no easing), also drives progress bar `scaleX`, active card `opacity .55>1` and `scale .94>1` (400/500 ms), active year colour, and counter text. Desktop only: tablet and mobile get a native horizontal scroller with no JS. These scroll-linked writes keep running under reduced motion |
| MM | None. Carousel dragging and snapping only (J-02 to J-07: `scroll-snap-type:x mandatory` x4, mouse drag disables snap then re-enables, buttons and dots use smooth `scrollTo`) | JavaScript plus native scroll-snap |

### A7. Ambient loops

| Design | Loop | Values |
|---|---|---|
| EC | Brand marquee CA-09 | `translateX(0>-50%)`, 64000 ms, linear, infinite, route-level |
| EC | Trust ticker CA-01, mobile only (`effW < 768`), list doubled | 30000 ms linear infinite; desktop `none` |
| IF | Brand logo marquee A-15 (45 px/s), footer open-now dot pulse A-02 (`box-shadow 0 0 0 0 > 0 0 0 8px transparent`, 1600 ms linear infinite), logo rays spin, About rays spin, ring drift, hero float | see above |
| MM | Trust bar marquee: `Home.dc.html` `mmMarquee 24s linear infinite` (doubled items) and `SiteFooter.dc.html` `mmMarquee 32s linear infinite`; paused on hover or focus (J-08); `@media (prefers-reduced-motion:reduce){[data-marquee]{animation:none!important}}` | `translateX(0>-50%)` |

### A8. Hover and interaction (non-media, for completeness)

| Design | Dominant hover patterns (from `animations.json`) |
|---|---|
| EC | 149 hover properties: border-colour to `#141414` (12 at 250 ms, 5 at 200 ms); background to `#2a2a2a` (12, 200 ms); `translateY(-3px)` (8) and `-2px` (5), 250 ms ease; box-shadow `0 14px 32px rgba(20,20,20,.09)` 300 ms; colour swaps. Hover scales on controls: 1.04, 1.05, 1.06, 1.07, 1.08, 1.12, 1.25 |
| IF | 214 hover properties: `scale(1.05) translateY(-2px)` (14 at 250 ms `cubic-bezier(.2,.8,.2,1)`, 8 at 200 ms ease); box-shadow `0 6px 20px rgba(0,0,0,.25)` (13); `scale(1.15) translateY(-3px) rotate(-8deg)` 350 ms spring (8); card `translateY(-6px)` 350 ms |
| MM | 371 hover properties, neo-brutalist hard shadows: `translate(-2px,-2px)` (29) and `(-3px,-3px)` (22) at 200 ms `cubic-bezier(.3,1.6,.5,1)`; box-shadow `7px 7px 0 #3A2A22` (24), `5px 5px 0` (17), `8px 8px 0` (14 at 300 ms); press `translate(3px,3px)` with `0 0 0` shadow; `translateY` shifts to `-4px` at 300 ms `cubic-bezier(.3,1.4,.5,1)` |

Cursor and click interaction: IF only (magnetic buttons J-10 `translate` pull over 250 ms, shine sweep A-18 `translateX(-120%) skewX(-18deg)>translateX(260%)` 750 ms, press ripple A-19 `scale 0>1`, `opacity 1>0` 650 ms, tilt J-09 with spring reset A-20 600 ms, nav label magnet J-11, range tile peek J-22). EC and MM have no cursor-following effect. Reduced motion: EC uses a `@media (prefers-reduced-motion:reduce)` rule setting durations to .01 ms (RM-01); IF has three such rules plus per-animation `rm` checks; MM only removes the marquee animation (RM-01, RM-02).

## B. Media sizing and treatment inventory

### B1. Media element counts

| Design | `<img>` | `<image-slot>` | `<svg>` inline | `<iframe>` | CSS `background-image: url()` | `<video>` | `<picture>` |
|---|---|---|---|---|---|---|---|
| EC | 23 (9 are 17 to 30 px icon SVG/PNG files, 7 are logos/wordmarks, 2 are Unsplash photos, 0 photo files local) | 0 | 19 | 0 | 10 (all `background-size:cover`) | 0 | 0 |
| IF | 5 (icons only) | 28 (`shape="rect"` 22, `"circle"` 3, `fit="contain"` 6) | 14 | 2 | 0 | 0 | 0 |
| MM | 23 (8 photos as `<img>`, 12 logos, rest thumbnails) | 0 | 17 | 0 | 8 (`url(assets/...) center / cover`, plus template-driven `background-image`) | 0 | 0 |

`image-slot.js` (IF) renders a shadow-DOM frame (`overflow:hidden`, `background:rgba(127,127,127,.08)`), a fallback `aspect-ratio:3/2` when the container height is indefinite, and an absolutely positioned centred `<img>` with `max-width:none`; `shape` maps to `rect`, `rounded`, `circle` (50% radius) or `pill`, `fit` is `cover` (default) or `contain`, and `mask` accepts any `clip-path`. Its in-page edit controls (blur 6px, hover buttons) are tool chrome, not design.

### B2. Aspect ratios (count)

| Design | Values |
|---|---|
| EC | 15 declarations: `1/1` 4, `1` 3, `16/9` 3, `4/5` 2, `4/3` 2, `16/10` 1. Used on tiles (`overflow:hidden`, `background:#F3F0EB`, `border:1px solid #E6E1DA`), lens/variant swatches (16/9), map tile (4/3), frame card (1/1), shop tiles (4/5), hero link card (16/10) |
| IF | 10: `3741 / 848` 2 (logo), `1998 / 1302` 1 (square logo), `4 / 3` 2, `3 / 2` 1, `1` 1, `4 / 5` 1, template `{{ b.ratio }}` 1 (runtime value not verified), plus the `3/2` slot fallback. Frames: `border-radius:22px;overflow:hidden;border:5px solid #FFFFFF`, shadow `0 34px 60px -30px rgba(44,62,80,.7)` (hero) and `0 30px 54px -30px rgba(44,62,80,.6)` (b.ratio frame) |
| MM | 9: `1 / 1` 5, `4 / 5` 2, `3 / 4` 1, `4 / 3` 1. Photos `width:100%;aspect-ratio:4 / 5` or `1 / 1;object-fit:cover;border-radius:4px` (`Home.dc.html::img`); product main image `aspect-ratio:1 / 1;border:2px solid #3A2A22;border-radius:28px;overflow:hidden` (`Product.dc.html`); card `aspect-ratio:1 / 1;border-bottom:2px solid #3A2A22` (`ProductCard.dc.html`); gifts `3 / 4` background tile with `border-radius:4px` |

### B3. Object-fit and object-position

| Design | `object-fit` | `object-position` |
|---|---|---|
| EC | `contain` 5 (logos and wordmarks), `cover` 2 (hero and about strip) | `{{ heroPos }}` 1 (runtime value not verified), `center 20%` 1 |
| IF | `cover` 1 (outside `image-slot.js`); slots fit by their own `fit` attribute | 0 |
| MM | `cover` 12 | 0 |

### B4. Radius, borders, shadows, padding and ground colour behind media

| Design | Border-radius on media | Borders and shadows | Ground colour behind media |
|---|---|---|---|
| EC | None on photos (square corners); `50%` 20 and `999px` 8 appear in the file overall (buttons, dots, badges), not on photo frames | 1px `#E6E1DA` or `#D0C8BA` on tiles; no shadows on media except card-hover `0 18px 44px rgba(20,20,20,.09)` | `#F3F0EB`, `#DFD8CC`, `#EFEAE2`, `#fff` |
| IF | Frames `22px`; circles `50%` on photo wrappers (62 uses of 50% and 43 of 999px in the file overall, mostly controls); 58px avatar circle | `5px solid #FFFFFF` and `6px solid #FFFFFF` (circle) and `5px solid rgba(255,255,255,.92)`; shadows `0 34px 60px -30px`, `0 34px 56px -26px rgba(0,0,0,.65)`, `0 24px 36px -18px rgba(0,0,0,.6)`; `2px solid #FFFFFF` avatar | `#F2F5F7`, `#EAF4F7`, `{{ card.imgBg }}`, `{{ hero.imgBg }}` (runtime not verified), `#FFFFFF` |
| MM | `4px` photos (6 on `Home.dc.html`), `12px`, `14px` thumbs, `18px` Instagram tiles, `28px` product main image, `14px` basket thumbnail; `999px` 162 (pills, overall) | `2px solid #3A2A22` on product image, tiles, thumbs; `border-bottom:2px solid #3A2A22` on header strips and cards; hard offset shadows on cards | `#F9D5D3`, `#F9CF6E`-type pastels, `{{ imgBg }}`, `{{ t.bg }}` |

Padding on media wrappers: only EC's `padding:0` on tile buttons and `padding:4px` on a lens label; not otherwise used as a media inset (not verified beyond a regex).

### B5. Width and height patterns

| Design | Patterns |
|---|---|
| EC | `width:100%;height:100%;object-fit:cover` hero (inside a wrapper); `position:absolute;inset:0;width:100%;height:100%` about strip; fixed icon sizes via `width/height` attributes 17 to 30 px; logos `width/height` from `{{ logoW }}` (not verified); `max-height: {{ lensImgMax }}` and `flex: {{ lensImgFlex }}` (not verified) |
| IF | Slots fill container (`width:100%;height:100%`); frames sized by `aspect-ratio`; circle `height:100%;aspect-ratio:1;margin:0 auto`; fixed `width/height:{{ R.fsImgH }}` circle (not verified); map iframe `height:210px` and absolute `inset:0` |
| MM | `width:100%;aspect-ratio:...`; `width:100%;height:100%;min-height:{{ L.pathImgH }}` (not verified); header strips `width:100%;height:84px`; thumbs `76px`, `56px`, `64px`; logos `width:140px`, `84px`, `120px`, `height:44px/60px;width:auto` |

No `min-width`, `max-width` or `max-height` on media other than the EC and global `img{display:block;max-width:100%}` (MM `<helmet>` style).

### B6. Clip-path, mask, filter, blend, opacity, overlays

| Design | `clip-path` | `mask` | `filter` | `mix-blend-mode` | Overlays | Opacity on media |
|---|---|---|---|---|---|---|
| EC | 0 | 0 | 10 declarations, all template expressions (`{{ t.filter }}`, `{{ c.filter }}`, `{{ cur.imgFilter }}`, `{{ o.filter }}`, `{{ lensPreviewFilter }}`, `{{ p.imgFilter }}`) so values are not verified; plus `backdrop-filter:blur(16px)` x2 | 0 | `linear-gradient(180deg,rgba(20,20,20,0) 40%,rgba(20,20,20,.8) 100%)` (1 absolute-fill caption scrim) | `opacity:.92` on a swatch image |
| IF | `circle(var(--pr,0px) at var(--mx,50%) var(--my,50%))` x1 (cursor peek), reveal `inset(... round ...)` in JS x2 | `linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)` x2 (marquee edge fade) | `grayscale(.35) contrast(1.05)` on map iframe; `blur(6px)` and `blur(8px)` only in JS reveals; `blur(2px)`, `blur(1.2px)` on decorative layers; `backdrop-filter blur(2px)` x2 | 0 | `linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.3))` white wash (1); 29 gradient backgrounds in total (19 linear, 10 radial) | not verified |
| MM | `polygon(0 0,100% 0,88% 50%,100% 100%,0 100%)` x2 (tag-shaped sticker, `Home.dc.html`, `Product.dc.html`) | 0 | 0 real (3 hits are JS text) | 0 | none on photographs | `opacity:.95` on a logo |

### B7. Background properties

| Design | `background-size` | `background-position` | `background-repeat` | `background-attachment` |
|---|---|---|---|---|
| EC | `cover` 11 | `center` 10, `center 25%` 1 | none | none |
| IF | `100% 1px` 1 (hairline) | none | none | none |
| MM | `cover` 7, template values (`{{ imgSize }}` 2, `{{ t.size }}` 1, `{{ bgSize }}` 1; runtime not verified) | `center` 11 | `no-repeat` 4 | none |

`space`, `round`, `repeat-x`, `repeat-y`, `fixed`, `local` and `contain` as background values: 0 in all three. Patterned backgrounds in MM use `repeating-linear-gradient` (2) and radial gradients (5); IF uses 10 radial and 19 linear gradients. The MM product background `background-size` falls between `cover` and a template value, and `Product.dc.html` sets `background-repeat:no-repeat` explicitly.

### B8. Responsive and art-direction

No `<picture>`, `srcset`, `sizes` or `loading` attributes (IF has `loading="lazy"` x2 on the map iframes only). Per-width media differences are JS-driven: IF swaps the About hero SVG at `w < 768`, `< 1024`; IF desktop gets the pinned timeline while smaller widths get a native scroller; EC runs the trust ticker only under 768 px. Images themselves are the same file at every width. `@media` rules in the three designs are limited to `prefers-reduced-motion` (EC 1, IF 4) and `print` (IF 1); layout breakpoints are JS widths in state (`w`, `effW`), not CSS media queries.

## C. What none of the three designs uses, and sample warning

None of the three designs uses any of: `<video>` (so no video poster, autoplay, loop, controls, `object-fit` on video or video overlay), `<picture>`, `srcset` or `sizes`, art-direction by width on raster images, `object-view-box`, `mix-blend-mode`, CSS `mask` on a photograph (only the marquee edge fade in IF), `clip-path` on a photograph other than IF's animated reveal and cursor peek, `background-attachment` (no CSS fixed-background parallax), `background-repeat` values `space`, `round`, `repeat-x`, `repeat-y`, `background-size: contain`, CSS scroll timelines (`animation-timeline`, `scroll-timeline`, `view-timeline`), view transitions, `@container` queries or `container-type`, scroll-driven animation in CSS, GSAP, Lenis, WebGL or canvas, Lottie, a lightbox or zoom-on-click, cursor-follow on a photograph in EC or MM, `loading="lazy"` on images, `fetchpriority`, and `<audio>` or `<embed>` or `<object>`. EC and MM use no `<iframe>` at all, and no design embeds a video service (YouTube, Vimeo). No image carries a gradient overlay in MM, and no design uses blend modes or duotone filters.

Sample warning: three designs from one tool in one project family cannot stand for what clients ask for. All three are plain-text drafts from the same Claude Design runtime and handoff schema, so they share its idioms (one `image-slot` custom element in IF, `style-hover` shorthand, JS widths in place of media queries, WAAPI or hand-stepped JS in place of scroll timelines). Their fashion is narrow: two are shop or trade brochure sites for Birmingham clients, one is a consumer baking brand, so no restaurant hero video, no law-firm editorial portrait crops, no background video, no full-bleed `background-attachment:fixed` band and no photo gallery with lightbox appear. A zero here means "this tool did not produce it for these briefs", not "clients do not need it", so controls should be built from the CSS property space and from client briefs, not trimmed to this census. Several values were also not verifiable because they are template expressions resolved at runtime (EC filters, IF `b.ratio`, MM `imgSize`), and IF's trace was source-derived, not observed.

## Files read

- `E:/sgs-tmp/wt-media/sites/eye-care-ward-end/handoff/animations.json`
- `E:/sgs-tmp/wt-media/sites/eye-care-ward-end/handoff/Eye Care Birmingham.dc.html` (regex-scanned, not read in full)
- `E:/sgs-tmp/wt-media/sites/eye-care-ward-end/handoff/Frame Card.dc.html` (regex-scanned)
- `E:/sgs-tmp/wt-media/sites/indus-foods/handoff/animations.json`
- `E:/sgs-tmp/wt-media/sites/indus-foods/handoff/Indus Foods Website v2.dc.html` (regex-scanned)
- `E:/sgs-tmp/wt-media/sites/indus-foods/handoff/TradeApplication.dc.html` (regex-scanned)
- `E:/sgs-tmp/wt-media/sites/indus-foods/handoff/EnquiryForm.dc.html` (regex-scanned)
- `E:/sgs-tmp/wt-media/sites/indus-foods/handoff/image-slot.js` (grepped)
- `E:/sgs-tmp/wt-media/sites/indus-foods/handoff/indus-logo.js` (regex-scanned)
- `E:/sgs-tmp/wt-media/sites/indus-foods/handoff/README.md` (grepped)
- `E:/sgs-tmp/wt-media/sites/mamas-munches-redesign/handoff/animations.json`
- `E:/sgs-tmp/wt-media/sites/mamas-munches-redesign/handoff/*.dc.html` (14 files, regex-scanned) and `store.js` (regex-scanned)
