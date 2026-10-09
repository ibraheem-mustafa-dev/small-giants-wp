# Rater C: false-positive audit of open style/box rows

## Method
- Final walker report per surface (newest Solve run today, last round by mtime): footer round-2, home round-13, mega-lenses round-4, shop round-13, product round-final. The triage files for home, shop and product point at yesterday's runs, so I did not use their labels.
- Open row = `accepted` falsy, `kind` style or box. Distinct rows keyed by (state, width, pair, kind, key): footer 195, home 1,319, mega-lenses 94, shop 2,583, product 2,617 (6,808 in all).
- Stratified random sample: `random.seed(20261009)`, 6 per surface, drawn uniformly from each surface's distinct rows (script in the scratchpad, `samp.py`).
- Verdicts come from both snapshots (box, text, textX/textY, tag, styles). One live read: the mirror's `::after` on the Lenses trigger.

## Sample
| Surface | Row (state, width, pair, key) | Verdict | Evidence |
|---|---|---|---|
| footer | opening 768 col-visit letter-spacing 2.3 vs 0.81px | REAL | h5 heading tracking and size differ; column 165 vs 177px high |
| footer | opening 1920 brand-wordmark y-in-main 6056 vs 6017 | FALSE-ARTEFACT | same x, w, h; footer-root itself starts 34px apart (6071 vs 6037), so ~35 of the 39px is inherited upstream; relative offset only 4px. Tag also mismatched (div vs h4) |
| footer | opening 375 col-visit color grey 119 vs near-black 20 | REAL | heading colour differs |
| footer | opening 1440 social-row y-after-text +1 vs -2 | REAL (minor) | box 40 vs 44 high, 3px shift; draft side has no text, live has the hidden labels |
| footer | opening 1920 link-terms text-decoration none vs underline | REAL | draft x 1623, live x 1019 (different position) and underline differs |
| footer | opening 1440 col-visit font-size 11.5 vs 13.5 | REAL | visible heading size |
| home | opening 1440 about-step-1 width 514.297 vs 515.25 | FALSE-INVISIBLE | 0.95px; li vs div tags, same text |
| home | reviews-next 1920 hero-image top null vs 0px | FALSE-INVISIBLE | `top` on a non-positioned side; draft y 591 vs live y 3726 also shows the two sides captured at different scroll positions |
| home | reviews-next 1440 brand-strip padding-bottom 0 vs 26 | FALSE-MISPAIRED | draft = whole `section` with the brand names; live = empty `__track` div. Same y, 97px high |
| home | opening 1440 gen-home-65 width 514.297 vs 515.25 | FALSE-INVISIBLE | sub-pixel; ol vs div, same text and height |
| home | hero-scrolled 1920 whybuy-2-heading width 299 vs 239 | REAL | text-align start both, so text starts at x 630 vs 660 (30px shift) |
| home | reviews-next 1440 brand-strip padding-top 0 vs 26 | FALSE-MISPAIRED | same pair as above |
| mega-lenses | 1920 lenses-panel scale none vs 1 | FALSE-INVISIBLE | `scale:1` is identical to `none` |
| mega-lenses | 1920 lenses-panel painted-ground none vs white | UNSURE | draft wrapper 1440 wide at x 240, live 1920 full-bleed white; text lands at the same place. Settle with a 1920 screenshot of both open panels |
| mega-lenses | 1440 lenses-panel padding-bottom 40 vs 0 | FALSE-INVISIBLE | box 244 vs 242 high, text y 64 vs 63 |
| mega-lenses | 1440 lenses-trigger content none vs "" | FALSE-INVISIBLE | live read: `::after` is 52x1px, transparent, no border, so it paints nothing at rest |
| mega-lenses | 1440 lenses-panel scale none vs 1 | FALSE-INVISIBLE | as above |
| mega-lenses | 1920 lenses-card-single flex-grow 0 vs 1 | FALSE-INVISIBLE | box 333x166 both, 1px x offset |
| shop | panel-after-click 375 gen-shop-5 margin-bottom 0 vs null | FALSE-MISPAIRED | draft "SHAPE" span vs live "SHOP" p |
| shop | panel-after-click 375 gen-shop-5 rotate none vs null | FALSE-MISPAIRED | same pair |
| shop | scrolled 1920 gen-shop-48 h 2861 vs 2762 | REAL | draft cards carry brand label and star rating the live cards lack; 99px taller |
| shop | brand-ray-ban 1920 sort max-width 100% vs none | REAL | select 152 vs 107px wide |
| shop | size-open 375 size-heading padding-top 16 vs 0 | FALSE-INVISIBLE | button vs summary, 335x52 vs 333x52, text y 19 vs 18 |
| shop | scrolled 1920 gen-shop-10 padding-top 28 vs 0 | REAL (mis-described) | whole filter and grid block starts 31px apart; content differs (live has "Filter", "Colour" labels). The padding is a symptom, not the cause |
| product | tab-details 1440 add-to-bag line-height 16 vs 19.5 | FALSE-INVISIBLE | button height 56 both, text y 20 vs 19. The same button is 44px wider on the draft, which is real but is a different row |
| product | opening 375 gen-product-10 width 335 vs 295 | REAL | draft div with tick glyphs vs live ul, indented 20px; 252 vs 223 high |
| product | tab-details 1920 gen-product-12 line-height 16 vs 17.5 | FALSE-INVISIBLE | pair is the tabs wrapper; text insets identical (18, 17) |
| product | tab-details 1440 gen-product-56 h 107 vs 83 | REAL | spec cell 171x107 vs 215x83 |
| product | opening 1920 tabs-reveal color 20 vs 15 | FALSE-INVISIBLE | 5/255 colour difference |
| product | tab-sizing 1920 gen-product-113 h 234 vs 238 | REAL | related-product card 163 vs 197 wide; draft shows brand and rating |

## Counts (n=30)
REAL 12 (footer 5, home 1, shop 3, product 3) | FALSE-INVISIBLE 12 | FALSE-MISPAIRED 4 | FALSE-ARTEFACT 1 | UNSURE 1.

## False-positive rate
- Definite false positives 17/30 = 57%; 60% if the UNSURE is false.
- 95% interval (Wilson, n=30) about 39% to 73%.
- Weighted by each surface's open-row count: about 56%.
- Per surface (of 6): footer 1 FP, home 5, mega-lenses 5 (+1 unsure), shop 3, product 3. Mega-lenses and home are the dirtiest; footer the cleanest.
- Caveats: the sample covers raw rows, not distinct root causes. One real cause typically throws many rows (heading colour at 4 widths), so real causes are far fewer than real rows. Shop and product (about 2,600 rows each) dominate any total.

## False-positive patterns
1. Computed value with no paint effect (12 of 17). Examples: `scale: none` vs `1`; a `::after` with empty content and transparent background; flex-grow on an item that already fills the row; colour 20 vs 15; line-height on a button whose height and text position are unchanged; padding vs centring giving the same box.
2. Different elements paired (4). The brand-strip pair compares the draft `section` that holds the names with the live `__track` div that holds none; gen-shop-5 compares "SHAPE" with "SHOP". Matching is by ref/position, not element role or text.
3. Sub-pixel noise (home width 514.297 vs 515.25). No tolerance on widths.
4. Upstream offset reported as the pair's own (wordmark y-in-main): 35 of 39px is the footer starting lower, so a parent's shift is blamed on a child. The home hero-image pair shows the sides captured at different scroll positions.
5. Property meaningless on one side (`top` null on a non-positioned box; `rotate` null vs none; `margin-bottom` null).
6. Symptom row hiding the real cause: the shop "padding-top 28 vs 0" is really different filter content, and the add-to-bag "line-height" row sits beside a real 44px width gap. A fix aimed at the named property changes nothing visible, or the wrong thing.

## Misleading descriptions
- brand-strip padding-top/bottom: reads as a spacing fault, is a mispair.
- gen-shop-5 margin-bottom/rotate: describes a "SHOP" heading compared with "SHAPE".
- add-to-bag and tab line-height: reads as a typographic difference, paints nothing.
- brand-wordmark y-in-main 6056 vs 6017: reads as a 39px wordmark offset; only 4px is its own.
- lenses-panel scale: "none vs 1" is no change; painted-ground may be a real full-bleed vs 1440-wide difference, needing the 1920 screenshot.
- Gap rows of the owner's example type (computed, paints nothing) did not appear in this sample.
