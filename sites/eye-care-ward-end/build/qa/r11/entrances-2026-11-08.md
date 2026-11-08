# Eye Care entrances: draft vs live (eye-care-test), measured 2026-11-08, 1440px, Chromium

Draft source: animations.json (CA-*, J-01..J-05) plus the draft's `data-reveal` markup. Reveal rule J-02: opacity 0 to 1, translateY 26px to 0, 460ms, easeOutCubic, delay min(index among data-reveal siblings, 7) x 70ms, fires once. Draft `rise` = opacity 0 to 1, translateY 18px to 0, ease, on route mount, delays as listed. Live read from saved `sgsMotion` (REST edit context) and rAF sampling (opacity, translate, scale at 0/150/400/800ms after the element enters view). Raw data: probe_out.json, probe.mjs, hero.mjs, open.mjs.

Class key: M = matches, W = wrong values, X = missing on live, ? = not measured.

## Home (33 elements: 21 M, 5 W, 7 X)
| Draft element | Draft values | Live saved | Live observed | Class | Cause |
|---|---|---|---|---|---|
| Hero image kenburns (CA-04) | scale 1.08 to 1, 3000ms, cubic-bezier(.2,.7,.2,1) | ken-burns zoom-out-once 108 to 100, 3000, token easing | scale 1 at first paint, snaps to 1.08 when JS starts (about 0.6s later on this host), then eases to 1 | W (start) | b: effect starts from JS, not CSS |
| Hero label (CA-05) | rise 18px, 800ms, delay 150, ease | preset entrance-fade-up trigger scroll, from opacity 0, ty 18, 800, 150, ease | opacity 1 the whole time (CSS emits --sgs-me-from-op:1), translate 18 to 0 only after data-sgs-in is set by JS | W | a: LCP rule (Spec 38A s9) holds opacity at 1 unless allowLcpFade; trigger is scroll not load |
| Hero h1 (CA-06) | rise 900, delay 280 | same, 900/280 | same fault | W | a |
| Hero sub (CA-07) | rise 900, delay 420 | same, 900/420 | same fault | W | a |
| Hero buttons (CA-08) | rise 900, delay 560 | same, 900/560 | same fault | W | a |
| Brand marquee (CA-09) | 64s linear, pause on hover | marquee 64000, hoverRate 0 | running | M | |
| Best sellers header row (reveal) | 26px, 460, idx0 | cr-ref-home-10 26/460 easing (0.33,1,0.68,1) | 0 / 0.38 / 0.92 / 1 | M | |
| 8 product cards (reveal, idx 0..7) | delay 0,70..490 | cr-ref-home-16..23, delays 0,70..490 | opacity 0, 0.64..0, ... staggered correctly | M x8 | |
| Why-buy header (reveal) | 26/460 | cr-ref-home-25 | 0 / 0.64 / 0.99 / 1 | M | |
| 4 reason cards (reveal idx 0..3) | 0,70,140,210 | cr-ref-home-31/35/39/43 same | staggered | M x4 | |
| Start-with-a-shape header (reveal) | 26/460 | cr-ref-home-48 | 0 / 0.69 / 1 | M | |
| 6 shape tiles (reveal idx 0..5, 0..350) | 26/460 stagger 70 | card-grid cr-ref-home-53 has stagger step 70 but no item entrance saved | no data-sgs-me on any tile | X x6 | a |
| Reviews header (reveal) | 26/460 | cr-ref-home-55 | 0 / 0.64 / 0.99 / 1 | M | |
| Google reviews box (reveal) | 26/460 | container cr-ref-home-54 root entrance empty | none | X | a |
| About strip photo + text (idx 0,1) | 0, 70 | cr-ref-home-60 (0), 61 (70) | staggered | M x2 | |
| Optician photo + text (idx 0,1) | 0, 70 | cr-ref-home-68 (0), 71 (70) | staggered | M x2 | |
| Hero parallax (J-05, not an entrance) | image translate 0.18 x scrollY | parallax background, speedRatio 0.5 | not measured | ? (ratio differs) | a |

## Shop (5 rows: 0 M, 1 W, 2 X, 2 ?)
| Draft element | Draft values | Live | Class | Cause |
|---|---|---|---|---|
| Title block (CA-10) | rise 18px, 600, on mount | no entrance saved or observed (only product cards animate) | X | a |
| Product cards (reveal idx stagger 0..490 plus CA-13 fade 250 inside) | 26/460, delay min(i,7) x 70 | archive-product template: one loop item entrance 26/460 scroll, no stagger step; observed first 6 cards identical timing (0 / 0 / 0.82 / 1 at 150/150/400/800 for all) | W | a: loop stagger step is a supported field (FR-38A-26) but unset |
| Card inner fade (CA-13) | fade 250 on mount | none | X | a |
| Active filter chip pop (CA-11) | scale .6 to 1 overshoot, 350 | not measured (needs a filter applied) | ? | |
| Filter drawer fade below 1060px (CA-12) | fade 300 | not measured (mobile only) | ? | |

## Product page (10 rows: 0 M, 1 W, 9 X)
| Draft element | Draft values | Live | Class | Cause |
|---|---|---|---|---|
| Gallery image (CA-14) | zoomIn: opacity 0 to 1, scale .985 to 1, 500, ease, replays on every image or swatch change | buybox main-photo entrance: fade-up (translateY token distance), load trigger, 900ms; observed 0 / 0.85 / 0.99 / 1 with 18px rise; no replay on change | W | a (shape, duration) plus c (replay on change has no equivalent: photoEntrance is load only) |
| Info rail (CA-15) | rise 18, 600 | none | X | a |
| Tab content fades (CA-16 to CA-19, 4) | fade 300 on mount | none | X x4 | a |
| Tabs, Reviews, More-from-brand, Similar sections (reveal, 4) | 26/460 | none saved on those blocks (product-card 109/114 carry empty elements) | X x4 | a |

## Help (1 X) and Contact (1 ?)
| Draft element | Draft values | Live | Class | Cause |
|---|---|---|---|---|
| FAQ answer open (CA-31) | fade 300 | details panel is full opacity and full height at 0ms; no animation | X | a (accordion panel has no open entrance saved; only the icon rotate is saved) |
| Thank-you message (CA-32) | fade 300 on submit | not measured (needs a form submit, a write) | ? | |
| Help and contact page bodies | no reveal in draft | none live | M | |

## Global (open animations, from the header)
| Draft | Live | Class |
|---|---|---|
| Mega panel fade .2s (CA-03) | opacity 0.38 at 157ms, 1 at 318ms after hover (includes the 150ms hover intent) | M |
| Bag drawer slideL 400, cubic-bezier(.2,.7,.2,1), transform only (CA-53) | translateX 460 to 0 over about 450ms but also fades opacity 0 to 1 (draft does not fade) | W (minor) |
| Mobile menu items rise (CA-45..52), size modal zoomIn (CA-56), lens steps | not measured | ? |

## Totals (5 pages plus bag and mega)
M 22, W 8, X 19, ? 6 (measured 49 rows). Live animates something the draft does not: only the bag drawer's extra fade.

## Grouping by cause
- (a) Settings not set or wrong on the block: 25 rows (19 missing, plus 4 hero text, 1 shop card stagger, 1 gallery shape). Fixed by writing sgsMotion entrance values; the hero needs allowLcpFade true and trigger load.
- (b) Framework fault, saved but does not play as set: 1 (hero ken-burns starts from JS so it shows scale 1 then snaps to 1.08); the 4 hero text rows share the JS-start mechanism (scroll trigger waits for data-sgs-in).
- (c) Capability gap: 1 (gallery zoomIn replaying on every image or swatch change; buybox photoEntrance is load only).

Top causes: (1) entrances never saved on whole sections (product page 8, home tiles and reviews box 7, shop header, help panel); (2) hero rows saved but held at opacity 1 by the LCP rule and started by JS; (3) loop stagger step unset on the shop grid.

Decided list: no entrance ruling covers these pages (only the thank-you page, round 10). Register rows 73, 107b and 148 are closed and cover only the buybox photo, the Solve-written entrance and checkout.
