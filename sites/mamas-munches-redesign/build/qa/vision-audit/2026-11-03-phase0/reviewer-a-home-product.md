# Phase 0 review A: HOME (live /, draft Home.dc.html, trees 154 + 161) and PRODUCT (live /product/zookies/, draft Product.dc.html, tree 202)

Measured with headless Chromium after scrolling the page once (reveal animations done), draft served from the repo, live = http://localhost:8084. Numbers are CSS px. "d" = draft, "l" = live. Page heights: home 1440 7680 d / 7430 l; 768 9539 / 9058; 375 10352 / 9530. Product 1440 4518 / 3806; 768 5000 / 4126; 375 5246 / 4589. Focus ring (3px solid #3a2a22, offset 3px) matches on every control reached by Tab. Hero "Build your box" hover matches the draft (bg #f9cf6e to #fffaf0, shadow 4 to 7px, translate -3,-3).

## New causes found (full list at the end). Tags used below: C1 to C6 as in the brief, plus
- N1 padding stored as {desktop:"40px"} (tier to string); the real shape is tier to {top,right,bottom,left}, so it is ignored.
- N2 no resting rotate / absolute position / z-index settings (polaroid, tape, stamp, tilted cards).
- N3 option-picker with no `optionItems`; choice-flow with no options for a question.
- N4 `textDecoration="underline"` stored on wrapper containers (propagates to every descendant).
- N5 dead draft-server URL (127.0.0.1:61088) stored in `colourBackgroundGradient`.
- N6 button with no `url` renders a `<button>`; the draft has an `<a href>`.
- N7 sgs/button with no `label` prints the default "Click Here".
- N8 choice-flow cannot do the draft's one-page configurator.
- N9 round/pill shape set with a width but no height or aspect ratio.
- N10 heading with no `fontSize` falls back to the 58px heading default.
- N11 form-field-checkbox with no options shows "Option 1".
- N12 no sticky mobile buy bar.

## HOME

### Hero (cr-ref-home-1 to 20); draft 117 to 906 (h 789) at 1440, live 117 to 748 (h 631)
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| H1 | eyebrow "up for a night feed? we see you, mama" (Caveat 32px, #8e3444) | all | rest | text present at y 180 | absent; only the "✦" (cr-ref-home-3) renders | cr-ref-home-2 container has only text-3 "✦"; no text block | C2 | add the text block beside the ✦ | high |
| H2 | H1 "Made for the mum [pill photo] who needs it most" (Young Serif 82/54/46px, lh 1.02, 3 lines at 1440) with yellow underline stroke under "most" | all | rest | present, y 240 to 480 | absent: container cr-ref-home-4 has font settings but no text and its child cr-ref-home-5 is empty | cr-ref-home-4/5 no text, no pill image, no underline | C2 | rebuild as heading block with text; pill photo 125x66 inline media; underline as span/CSS | high |
| H3 | hero text/button column position | 1440 | rest | para x 140 w 500, buttons y 654 | para x 10 w 500, y 163 (130px left, 345px higher); section has no left padding | sgs/hero cr-ref-home-1 split: no padding, minHeight mobile 0 only | NEW:N1-family | set section padding/gutter on the hero (tier box) | high |
| H4 | hero photo collage: 3 polaroids (260x306 at -9deg, 244x289 at +8deg, 286x286 at -1.5deg), captions "fresh batch!", "for a new mum", "3am snack sorted ♥", right half of hero at x 765 to 1320 | all | rest | present (at 768 two columns, at 375 stacked under the buttons, 148 to 175px photos) | no images at all; the 3 captions stack as plain centred Caveat lines (x 10, w 1160) | cr-ref-home-13/14/15 are loose text blocks, no media blocks | C3 + N2 | framework gap: sgs/media needs frame (polaroid: border, white mat, caption, shadow) plus resting rotate and absolute position; or a media-collage block | high |
| H5 | stamp "BAKED to order" circle 132x132, #ee8088, 2px border, 4px shadow, rotated 12deg at x 1145 y 524 | all | rest | circle | pill 1160x132 spanning the full column (2 to 1170) | cr-ref-home-16: minHeight 132, no width, no aspect ratio, no rotate | N9 + N2 | width 132 + boxAspectRatio 1/1 (exists) + rotate (gap) | high |
| H6 | tape label "baked with love" (#ee8088, rotated -6deg, 167x67) | all | rest | tilted pink flag over polaroid | un-rotated 1160x50 outlined box, transparent background | cr-ref-home-19: border set, no backgroundColour, no rotate | N2 | add backgroundColour accent + rotate | high |
| H7 | trust bar (4 items: "Baked fresh when you order", "Handmade in Birmingham", "Registered food business", "Free UK delivery over £35", 15px/700 Karla, circled line icons 40px) | 1440 | rest | 4 items on one row, columns 290px, dashed top border, y 848 | 4 default placeholder items "Fast delivery / Certified quality / Trusted service / Loved by customers" (faint icons) at x 300/590/880 and x 10; the real labels are glued into one all-caps line "BAKED FRESH WHEN YOU ORDERHANDMADE IN BIRMINGHAM…" at 11px | cr-ref-home-20 `items` = defaults, `title`=concatenated labels | C2 | set `items` to the 4 real labels/icons; clear `title` | high |
| H8 | trust bar | 768, 375 | rest | single-row horizontal scroll strip (items cut at edge: "Free UK delivery over") | 4 items stacked vertically, 44px apart, 4 rows | cr-ref-home-20 gridTemplateColumns tablet/mobile "none"; custom CSS width ladder align-items | C6 | per-device layout setting (scroll row) | high |
| H9 | trailing links "4.3 on Trustpilot" and "New? Taster Trio" | all | rest | star order "★★★★★ 4.3 on Trustpilot" (stars first), 15px | text order "4.3 on Trustpilot ★★★★★", letterSpacing 1px, bold | cr-ref-home-11 label text order | C2 | reorder label | low |
| H10 | "Build your box" button link target | all | click | `<a href="#build">`, 212x60 | `<button>` with no href, 177x60 (label "Build your box →" plain arrow, draft has a 36px dark circle holding the arrow) | cr-ref-home-8: no `url`; icon is a text arrow | N6 | set `url` "#build"; use button icon (circle) setting | medium |
| H11 | "4.3 on Trustpilot" | all | click | `<a href="#reviews">` | `<button>`, no href | cr-ref-home-11 no url | N6 | url "#reviews" | low |
| H12 | CTA row gap/size | 1440 | rest | Send a gift 144x60 at x 366 | 144x60 at x 201 | follows H3 | n/a | none | low |
| H13 | sparkle ✦ before eyebrow | all | rest | outlined gold star (stroke), twinkles | solid pale star, no stroke visible | cr-ref-home-3 colour primary on pink; twinkle in Custom CSS | C5 | motion setting (loop) | low |
| H14 | hero spacing at 375 / 768 | 375, 768 | rest | 375: H1 at y 195, para y 362, buttons stacked y 515/590; 768: two columns | 375: para at y 137 (x 10), buttons side by side; no gap above | as H3 | N1 | as H3 | high |

### Who are we baking for today? (cr-ref-home-21 to 39)
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| W1 | section heading position | 1440 | rest | H2 y 1018, x 100 | y 860, x 140 | cr-ref-home-21 gets the default section padding 80px 32px; draft section pad 112px top/bottom (80 at 768, 64 at 375) | N1 | explicit tier box padding, 112/80/64 vertical | medium |
| W2 | gap heading to cards | 1440 | rest | cards start y 1109 (heading bottom 1079, 30px) | cards start y 923 (heading bottom 921, 2px) | cr-ref-home-22 margin bottom 0 and no gap before grid | NEW:heading-gap | margin-bottom on heading 30px | medium |
| W3 | card text panel padding | all | rest | text x 414 at 1440 (34px inside the panel); 24px tablet; 18px mobile | text starts at the image edge x 402 (0px padding) | cr-ref-home-26/34 padding {desktop:"34px"...} string | N1 | tier box padding | high |
| W4 | card image | 1440 | rest | image 278x441, full height of card (445) | image 260x89 (card 1) and 260x411 (card 2); inconsistent, card 1 image 352px short; card height 415 vs 445 | grid items stretch; media block has no height/fit | NEW:media-height | media: height 100% / aspect-ratio fill | high |
| W5 | card heights/layout at 768 | 768 | rest | stacked: image on top 283x311, text below; card h 655 | image 260x89 on top, text under, big empty pink area; card h 613 | tablet grid repeat(1,…) + image height | NEW:media-height | as W4 | high |
| W6 | card layout at 375 | 375 | rest | image left 118x257, text right; card h 257 | image 118x40 (card 1), 118x187 (card 2); arrow button 14x32 detached | as W4 | NEW:media-height | as W4 | high |
| W7 | "Build your box ›" / "Shop gifts ›" link text beside the 32px dark arrow circle (16px/700) | all | rest | text + circle | only a 14x32 dark pill with a tiny arrow, no text | cr-ref-home-30/38 hold only the arrow button (label "→"); text dropped | C2 | add text | high |
| W8 | whole card is a link (#build, #gifts), 610x445 | all | click | `<a>` covers the card | only the 14x32 arrow is a link (touch target 14x32) | no sgsBlockLink on cr-ref-home-24/32 | NEW:no-block-link | sgsBlockLink (exists on cr-ref-home-103) | high |
| W9 | card hover | 1440 | hover | shadow 8px + rotate approx 0.5deg + translate | shadow 8px only, no tilt/translate | cr-ref-home-24/32 sgsMotion hover set but no rotation arrives | N2 | verify hover transform runs; add resting rotate | low |
| W10 | "for me ✦" eyebrow | all | rest | Caveat 28px, colour #8e3444 | 28px but letterSpacing -0.42px (draft normal) | heading block default letter spacing | NEW:heading-spacing | letterSpacing 0 | low |

### Build your Zookie (cr-ref-home-40 + flow tree 161); draft panel 1240x840 at y 1664 (1440)
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| B1 | outer pink panel (bg #f9d5d3, 2px border, radius 36, padding 58) | all | rest | present | absent; heading sits on cream; flow card bg #fbf3dc 523 wide at x 817 | cr-ref-home-40 has no background/border/radius; padding string | N1 | backgroundColour section-alt + border + radius 36 + box padding | high |
| B2 | one-page configurator: questions "1 · BASE", "2 · CHIPS", "3 · FLAVOURS", "4 · HOW MANY" all visible, 48px chips | all | rest | all 4 groups on screen | wizard: "STEP 1 OF 6 / Base", 2 wide 64px outlined boxes (483x64), "Continue" button disabled-looking (#fbe0a8 132x48) | cr-ref-flow-...-4 flowLayout "showcase", 6 form-steps | C3 + N8 | framework gap: choice-flow needs "all questions on one page" layout, pill (chip) option style with 48px height | high |
| B3 | chip look: pill 999 radius, 2px border, selected = #f9cf6e with 3px shadow; size 148x48 | all | rest/selected | pill | rectangle, radius 0 | choice-flow-question has no option style | N8 | framework gap: option shape/selected colour/shadow settings | high |
| B4 | question 3 flavours: 13 chips with colour dot (Vanilla, Chocolate, Strawberry, Mango, Banana, Coffee, Mint, Caramel, Coconut, Pistachio, Honey ...), "Pick up to 3 and we'll split your box between them", multi-select up to 3 with tick | all | rest | present | question has no options at all (cr-ref-flow-...-10: no `options`); intro text appears only in step 3 | N3 + C2 | add options with colour dot; framework gap: multi-select with max 3 and colour swatch | high |
| B5 | "Your 20: 10 strawberry · 10 mango" split line | all | rest | present (14px) | absent | no block | C3 | framework gap: choice-flow derived text | medium |
| B6 | question 4 sizes "8 £9.50 £1.19 each", "20 £21.50 £1.08 each" (selected), "40 £38.00 £0.95 each" with "Most popular"/"Best value" tags; tiles 190x89 | all | rest | present | options "8/20/40" have only labels; no price, per-unit line or badge | cr-ref-flow-...-12 options labels only | C2 + N8 | framework gap: option price, sub-line and badge | high |
| B7 | live preview card (cookie illustration 240px, caption "20 × Classic oat, milk choc chips, strawberry & mango" Caveat 26px) | all | rest | 471x363 white card, 2px border, 28px radius | empty 72x72 square next to "TOTAL —" in a collapsed `<details>` summary | showPricePanel true, no preview art/caption | C3 + N8 | framework gap: choice-flow preview (image + caption from selections) | high |
| B8 | price panel: "Subscribe & save 10% £19.35 (£21.50 struck)", interval chips "Every 2 weeks / Every 4 weeks", "One-off box £21.50", full-width "Subscribe · £19.35" 471x64 button, note under it | all | rest | present | not rendered; last steps carry no options text; "Baked fresh for you…" shown in a bordered box 484x52, left aligned (draft centred, 600 weight, no box) | steps 13/15/17 have options without prices | C3 + N8 | framework gap: choice-flow plan cards with strike-through price, result button label | high |
| B9 | stage note | all | rest | text centred 14px, weight 600, no box | boxed, left aligned, weight 400 | summaryNoteColour only | NEW:note-style | style settings for stage note | low |
| B10 | flow header/footer chrome | 1440 | rest | none | "BASE" header bar 523x48 and footer bar 523x77 with 1px lines | chrome default | N8 | hide chrome in one-page layout | medium |
| B11 | heading block spacing | 1440 | rest | eyebrow, H2, para left at x 158, para 520 wide | x 100, para indented to x 167 | cr-ref-flow-...-3 text padding | NEW:text-indent | remove indent | medium |
| B12 | chip hover/focus | 1440 | hover | translate -2,-2 | translate 0,-2 | choice-flow default | N8 | match setting | low |
| B13 | section height (heading top to next section) | 1440 | rest | 1664 to 2504 panel (840) | flow 1560 to 2132 plus cream gap; heading to gifts 682 vs 1008 | follows B1 to B8 | n/a | none | high |

### Gifts (cr-ref-home-42 to 107)
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| G1 | section vertical padding | 1440, 768, 375 | rest | 112 / 80 / 64 | 0 (heading flush with section top, 6px) | cr-ref-home-42 padding strings | N1 | tier box padding | high |
| G2 | content x | 1440 | rest | x 100 | x 140 | maxWidth 1240 + 40px gutter | NEW:gutter | gutter 0 or maxWidth 1320 | low |
| G3 | card photos (photo-bags-pink, photo-pair, logo, etc., 4:3 slot, 303x~190) | all | rest | photos present | grey beige blocks (#f3e6cc, #f9d5d3); zero `<img>` | cr-ref-home-51/61/71/81 container backgrounds only, no media | C3 | framework gap: product-card style block or media blocks | high |
| G4 | card size | 1440 | rest | 303x386 each, tilted -1/+1/-0.6/+1.2deg | 277x576 each (190px taller, empty space), no tilt | cards fill grid row height with stack gap; no rotate | N2 + NEW:media-height | remove stretch; resting rotate | high |
| G5 | card link target | all | click | whole card `<a>` (Product.dc.html?id=…) 303x386 | only a 17.8x23.2 arrow link (touch target far under 44) | no sgsBlockLink on cr-ref-home-50/60/70/80 | NEW:no-block-link | sgsBlockLink | high |
| G6 | arrow button | all | rest | 36px circle (dark ring) | 18x23 pill | cr-ref-home-59/69/79/89 no fixed size | N9 | width+aspect 1/1 | medium |
| G7 | tag chips ("Just had a baby" etc.) | 1440 | rest | 90x15.6 text only (13px), no padding visible in dump, yellow pill | 128x24 pill with 2px border, 3/10px padding | cr-ref-home-53 | NEW:chip-style | check colours/padding vs draft | low |
| G8 | 375 layout | 375 | rest | swipe row, card 261x376, dots (4, active 34x12) + arrows 52x52 | 4 columns squeezed 80x604 (names wrap one word per line, "Taster Trio" cut); dots show "Click Here" labels; arrows 33x52 | cr-ref-home-49 grid mobile repeat(4,1fr) + custom overflow CSS | C1 + C6 + C3 | per-device swipe row (fixed card width 261, overflow auto) | high |
| G9 | dots | 375 | rest | 12px dots | 4 buttons "Click Here" (dark pill 98x48 + outlined) | cr-ref-home-92 to 95 no label, minHeight 12 only | N7 | label empty + circle size | high |
| G10 | 768 layout | 768 | rest | 2 columns 350x422, image 350x~265 on top | 2 columns 346x410, grey image slot | G3 | C3 | as G3 | high |
| G11 | testimonial note (rotated -1deg, yellow tape) | all | rest | tilt, tape piece 90x26 at +2deg | flat, no tape; w 547 vs 643; padding differs | cr-ref-home-100: no rotate; tape missing | N2 | rotate + tape element | medium |
| G12 | baby shower card | all | rest/hover | rotated 0, logo rotated -8deg (94x91), hover shadow 8 + translate -4,-4 | logo not rotated (79x75), hover shadow only | N2 | rotate | low |
| G13 | "All gifts →" | all | rest/click | `<a href=Gifts>` 81x44 | `<button>` 77x44 no href | cr-ref-home-48 no url | N6 | url /gifts/ | medium |

### Ingredients (cr-ref-home-108 to 137)
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| I1 | section padding | all | rest | 112 / 80 / 64 vertical, section top border at y 3640 | section starts with heading at x 776 y 3175; 80px 32px default | cr-ref-home-108 default section pad | N1 | explicit padding | medium |
| I2 | notebook card | 1440 | rest | rotated -1deg, 625x516, tape piece pink 112x36 (rotated -4deg), card radius 10, shadow 8 | flat, no tape, h 497 | cr-ref-home-109: padding string, no rotate, no tape | N1 + N2 | padding box, rotate, tape | medium |
| I3 | tick badges | all | rest | 36px yellow circle with ✓ | 32x55 ellipse outline, no fill, ✓ tiny (1440); 32px wide x ~55 high at 375/768 | cr-ref-home-114/119/124/129 customWidth 32, no height, no backgroundColour | N9 | height 32 or aspect 1/1; backgroundColour accent | high |
| I4 | item text | 1440 | rest | title 20px lh 31, description 15px 2 lines (w 458) | title ok; descriptions run one line at w 492 (card wider) | follows I2 padding | low | n/a | low |
| I5 | disclaimer box ("We make nourishing food, not medicine. If you're worried about your supply, your midwife, health visitor or a lactation consultant (IBCLC) is the right person to talk to. Allergens →") | all | rest | dashed 2px box 540x110, text 15px + inline link | box 125x62 holding only the "Allergens →" button, centred; sentence missing | cr-ref-home-136 contains only the button | C2 | add the paragraph text before the link | high |
| I6 | heading column | 1440 | rest | H2 3 lines h 177 at x 780 w 560 | 4 lines h 237 at x 776 w 524 | narrower column from padding/gutter | N1 | follows I1 | medium |
| I7 | notebook hover | 1440 | hover | no change | bg transparent to #fffaf0 | cr-ref-home-109 backgroundColourHover | NEW:hover-bg | remove hover bg | low |

### Story (cr-ref-home-138 to 149)
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| S1 | section padding | all | rest | 112/80/64; section 784 high at 1440 | 0; section 577 high; photo card overlaps top border (y 3683 vs section 3677) and heading of next section sits flush | cr-ref-home-138 padding string | N1 | padding box | high |
| S2 | polaroid (-2.5deg, 544x578 card, two yellow tape pieces 103x44 at -8deg and 102x34 at +7deg, photo 513x513, caption 26px) | all | rest | present, tilted, taped | no tape, no tilt; card 508 wide | no rotate/tape | N2 | rotate + tape | medium |
| S3 | text column x | 1440 | rest | x 721 w 619 | x 727 w 573 | gap/padding | low | none | low |
| S4 | story quote | 1440 | rest | 36px, 4 lines | 36px, 4 lines (same) | none | n/a | none | n/a |

### Reviews (cr-ref-home-150 to 225); draft heading y 5181, live 4314
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| R1 | review row | 1440 | rest | swipe row: cards 343 to 405 wide x ~316 tall, rotated -1/+1/-0.5/+1.2deg, scroll-snap x mandatory, scrollWidth 2540 in 1280 viewport | 6 cards in a grid, each 175 wide x ~913 tall, text squeezed into 1 to 3 words per line, big empty gap above the quote mark | cr-ref-home-164 gridTemplateColumns desktop only "repeat(6, 1fr)" | C1 + C3 | framework gap: review slider block (scroll-snap row, arrows scroll one card = 418) | high |
| R2 | review row | 768 | rest | cards 347x340 swipe | 6 columns 99 wide x 1328 tall | as R1 | C1 | as R1 | high |
| R3 | review row | 375 | rest | cards 295x391 swipe (one and a bit visible) | 6 columns ~36px wide, words broken one per line, total height 1500+ | as R1 | C1 | as R1 | high |
| R4 | card padding/min | all | rest | 26px | 26px (ok); star rows ok; date line "January 2026 · Trustpilot" beside name | live puts name, date, source stacked | NEW:meta-row | low |
| R5 | rating summary | all | rest | "4.3" + stars stacked with "8 on Trustpilot ↗" link | "4.3 ★★★★★" only, link missing from the row (a separate "uk.trustpilot.com" link exists, 139x40) | cr-ref-home-156 | C2 | medium |
| R6 | arrows | 1440 | rest | 52x52 circles, next arrow yellow (#f9cf6e), previous cream | 33x52 pills both cream | cr-ref-home-157/158 padding 6, no width; no fill on next | N9 | width/aspect + colour | medium |
| R7 | arrows | all | click | scroll by 418px, scroll-snap | nothing moves (container overflow visible, scrollWidth = clientWidth 1200) | static grid | C3 | slider block | high |
| R8 | dots | all | rest | 4 dots 12px, active 34x12 pill | 6 buttons labelled "Click Here" (86x48 and 146x48), first dark | cr-ref-home-220 to 225: no label; Custom CSS step ladders `wgate220` to `wgate224` | N7 + C4 | label empty, size, remove step ladder | high |
| R9 | card hover | 1440 | hover | shadow 6px + rotate resets to 0 + translate -4 | shadow 6px only | N2 | low |
| R10 | card order/count | all | rest | 6 cards: KA, mariahzaini, Mrs MIM, Tamanna, Lisha Mehmood, RB (same) | same | none | n/a |
| R11 | section vertical padding | all | rest | 112/80/64 | 0, heading flush against story section border (live y 4314 vs section end 4254, 60px) | N1 | high |

### FAQ (cr-ref-home-226 to 245); draft heading y 5898, live 5671
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| F1 | question titles (Young Serif 19px): "When will my order arrive?", "Are they OK to eat while breastfeeding?", "How does Subscribe & save work?", "What allergens do they contain?" | all | rest | present | absent in all four rows; only a 51x30 "+" pill shows | cr-ref-home-234/238/241/244 have the + text but no title text | C2 | add question text | high |
| F2 | answers 2 to 4 | all | open | "They're made from everyday food ingredients. Fenugreek isn't right for everyone, so if you or your baby are sensitive to it, or you have a health condition, check with your midwife or GP first."; "Build your box and choose every 2 or 4 weeks. You get 10% off every box and free delivery on 20 and 40 packs. Skip, swap flavours or cancel online whenever you like."; "Oats (gluten), eggs, milk and fenugreek, a legume that may cross-react with peanut or soy allergies. Made in a kitchen that also handles tree nuts. The vegan base has no eggs or dairy." | none exist | only answer 1 is stored (cr-ref-home-236) | C2 | add the three answers | high |
| F3 | accordion behaviour | all | click | single-open: clicking row 2 closes row 1, opens row 2 (rows move 71px), icon + becomes × and rotates 45deg | static: row 1 always open, other rows do nothing (no panel exists) | static containers | C3 | framework gap: accordion block with single-open, icon turn | high |
| F4 | "+" icon | all | rest | 36px ringed circle (open row 51px with ×) | 51x30 / 36x30 pill, "+" off-centre | cr-ref-home-235 sgsChildWidth 50.91 fixed, no height | N9 | width/aspect | medium |
| F5 | intro para "Can't see yours? Message Zainab on WhatsApp, or read the full Help & FAQs." (17px #4e…) | all | rest | present | only the "Help & FAQs" link (101x26) | cr-ref-home-230 holds only the button | C2 | add the sentence | medium |
| F6 | row widths/x | 1440 | rest | x 634, w 706 | x 642, w 658 | gutter | low | n/a | low |
| F7 | section padding | all | rest | 88/64/48? (section 483 high, y 6365 at 1440) | same 483 high; heading x 140 vs 100 | N1-like gutter | low | n/a | low |

### Instagram wall, marquee, final CTA, footer links
| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| X1 | wall photos (6 tiles 198 to 202, rotations -2/1.5/-1/2/-1.5/1deg) | all | rest | present | present, same sizes (197 to 198) and tilt; tray and bun-case tiles use 300px thumbnails (143px natural width) | gallery uses -300x292 / -300x172 files | NEW:thumb-source | use full-size attachment for 2 tiles | low |
| X2 | "Follow along" button | all | rest/hover | 173x52, text 16px | 173x52 | none | n/a |
| X3 | marquee | all | rest | same 4 phrases, 32px Young Serif, pink ✦ (only phase differs) | same | none | n/a |
| X4 | final CTA | all | rest | "Hungry? Of course you are." 80/56/40px, button 205x60 | same sizes; button 207x60 | none | n/a |
| X5 | page vertical offset | all | rest | all sections below y 6365 shifted | live is 250px (1440), 481px (768), 822px (375) shorter overall | accumulated | n/a |

## PRODUCT (tree 202)

| # | element | widths | state | draft value | live value | stored cause | tag | proposed fix | sev |
|---|---|---|---|---|---|---|---|---|---|
| P1 | every text on the page | all | rest | no underline except breadcrumb links | every heading, paragraph, label and price underlined (decoration inherited) | cr-ref-product-0, -1 and -2 all carry `textDecoration="underline"` | N4 | clear textDecoration on the three wrappers (breadcrumb buttons keep their own) | high |
| P2 | page top offset | 1440 | rest | breadcrumb y 153, x 100 | y 229, x 140 (76px lower, 40px right) | cr-ref-product-0 padding string ignored; theme section pad 80 + gutter | N1 | tier box padding | medium |
| P3 | two-column hero (gallery 100 to 710, buy column 766 to 1340) | 1440 | rest | 2 columns (1.05fr / 1fr) | single column at x 150 w 574; all 35 children flow in one stack | hero cr-ref-product-6 children not wrapped into gallery column and buy-box column | NEW:flattened-hero-columns | wrap in two sibling containers | high |
| P4 | hero at 768 | 768 | rest | 2 columns: gallery left (image 340), info right x 402 | single column x 42 w 332 | as P3 | NEW:flattened-hero-columns | as P3 | high |
| P5 | main photo box 602x602 at x 100 y 188, radius 28, 2px border, 8px shadow, photo of Zookies; badge "Build your own" (yellow pill, 13px/700) top-left; "baked with love" tape flag (-4deg, #ee8088, 152x54) bottom-right | all | rest | present | photo missing; badge is a full-width 574x29 outlined bar; tape flag a 574x44 transparent box | no media block; cr-ref-product-7/8 no width, no background, no rotate | C3 + N2 | media block with frame; badge/flag absolute (gap) | high |
| P6 | thumbnails: 4 tiles 88x88 (76 at tablet, 64 at mobile), radius 16, 3px shadow, first selected -2,-2 | all | rest/click | photos; click swaps main image | 4 buttons labelled "Click Here" (88x88 stacked, wrap at 574), no photos | cr-ref-product-10 to 13: colourBackgroundGradient url("http://127.0.0.1:61088/assets/photo-*.jpg") (dead host) and no label | N5 + N7 | framework gap: product gallery with thumbnails (sgs/product-card store already drives one); use uploads URLs | high |
| P7 | pink buy panel (bg #f9d5d3, 2px border, radius 28, 574x596 at x 766 y 375) holding steps 1 to 4 | all | rest | present | absent; labels sit straight on cream | no container around cr-ref-product-18 to 28 | NEW:flattened-hero-columns | add container with background/border/radius | high |
| P8 | "1 · HOW MANY" tiles 165x87 (8 £9.50 £1.19 each / 20 £21.50 (selected) / 40 £38.00 with tags "Most popular", "Best value") | all | rest | present | label only; nothing under it | cr-ref-product-19 option-picker has no `optionItems` | N3 | optionItems with sub-label | high |
| P9 | "2 · BASE" chips (Classic oat selected, Vegan oat), "3 · CHIPS" (Milk choc selected, White, Dark, No chips), "4 · FLAVOURS Up to 3, split evenly" (11 chips with colour dots, Strawberry selected with tick), "All 20 strawberry" | all | rest | present, 46px chips, 2px border, selected #f9cf6e + 3px shadow | label rows only, 27px apart, no chips | cr-ref-product-21/23/27 option-pickers empty | N3 | optionItems; flavour multi-select = framework gap (option-picker is single-select) | high |
| P10 | chip hover | 1440 | hover | translate -2,-2 | not testable (no chips) | N3 | | | medium |
| P11 | plan cards: "Subscribe & save 10% £19.35 (£21.50 struck)" 574x72, "Every 2 weeks/Every 4 weeks" 228x44, "One-off box £21.50" 574x60 | all | rest | present | absent; only a dashed fieldset "Send it as a gift / Option 1" | cr-ref-product-29 option-picker anchor "subscribe" has no options | N3 | optionItems with price text | high |
| P12 | "Send it as a gift" dashed box (574x80, radius 22, checkbox 24px, title 16/700, help 14px) | all | rest | present | `<fieldset>` with legend "Send it as a gift", checkbox "Option 1", then the same title and help text repeated twice, no dashed box (3 lines) | cr-ref-product-30 form-field-checkbox without options | N11 | single-checkbox option, drop duplicate text 31/32 | high |
| P13 | "Add to basket · £21.50" (574x64, #f9cf6e, 4px shadow, 18px/700) | 1440 | rest/hover | 574x64 | 205x~46 left-aligned inside narrow column (underlined) | cr-ref-product-33 sgsChildSizing fill but parent not full | NEW:flattened-hero-columns | follows P3/P7 | high |
| P14 | add-to-basket hover | 1440 | hover | bg to #fffaf0, shadow 4 to 7, translate -3,-3 | same | none | n/a |
| P15 | trust trio: ✦ "Baked fresh when you order", → "With you in 3–5 days", £ "Free UK delivery over £35" in 3 columns (36px circles, 14px/700) | 1440 | rest | 3 columns | 3 stacked 36x23 pills (x 150), labels missing | cr-ref-product-35/37/39: text blocks fixed width 36, label text absent | C2 + N9 | add labels, circle size | high |
| P16 | accordion "Ingredients & allergens" (open, yellow, ×), Delivery, Keeping them fresh, A gentle note (+) , rows 574x60 | all | rest/click | titles Young Serif 18px; open row 178 tall; others close/open | titles missing on all four, only 45x30 "+" pills; only Ingredients body text shown (underlined) | cr-ref-product-41/44/46/48 title text absent; answers for Delivery, Keeping them fresh, A gentle note absent | C2 + C3 | add titles/answers; accordion block | high |
| P17 | reviews heading "real mums, real words / What people are saying" | all | rest | x 100 y 1939 | x 140 y 1454 | N1 | low |
| P18 | review cards (3): 404x316, rotated -1/+1/-0.5deg, title 20px Young Serif, quote 15px, footer "KA · June 2026" with dashed rule | 1440 | rest | present | cards 372 wide, no tilt; card title is an H2 at 58px (lh 81) so 3 words per line, card 502 high; footer shows only the name, date missing | cr-ref-product-56/62/68 heading without fontSize; date text absent | N10 + C2 + N2 | fontSize 20, add date line | high |
| P19 | review cards | 768, 375 | rest | 768: swipe row 347x340; 375: 295x? swipe | 768: title 43px, 3 columns x 240; 375: title 34px, cards ~60px wide, words broken | cr-ref-product-53 grid desktop only + custom overflow CSS | C1 + C6 + N10 | per-device swipe row | high |
| P20 | related products "You might also like": 3 cards 405x616 (tilted -1/+1/-0.6/ +1.2deg), photo 4:3 top (photo-bun-case, photo-gift-heart, photo-hero-mug), badge pill ("New? Start here", "Gift favourite", "Most thoughtful"), name 22px, price 21px + sub ("postage included", "gift-boxed", "6 deliveries"), full-width "Add to basket" 15px | 1440 | rest | present | no photos (url to dead host 127.0.0.1:61088 in button background); cards untilted; the add button is a small 98x18 pill not full width; badges are bare text 12px with no pill | cr-ref-product-78/89/100 colourBackgroundGradient dead URL; cr-ref-product-101 contentWidth 393px | N5 + C3 + N2 | framework gap: product-card block; use uploads URL | high |
| P21 | related grid | 375 | rest | 2 columns 261 | cards 205 and 205 wide, Add-to-basket text 14px | grid mobile 2 columns; draft shows rows with image | medium |
| P22 | mobile sticky buy bar ("£21.50 / 20 Zookies" + "Add to basket" 105x~48) | 375 | rest/scroll | fixed bar at viewport bottom | absent | no block | N12 | framework gap: sticky add-to-basket bar | high |
| P23 | card hover (review) | 1440 | hover | shadow 6px, translate -4 and un-tilt | shadow 6px only | N2 | low |
| P24 | breadcrumb | 1440 | hover | no motion | links translate -3,-3 on hover | button blocks default hover | NEW:hover-bg | low |
| P25 | Instagram wall, marquee, CTA on product | all | rest | present | present, same as Home X1 to X4 | none | n/a |

## NEW causes (every element hit)
1. N1 padding stored as tier-to-string. Hits: home cr-ref-home-26, 34 (card text panels), 40 (Build your Zookie section), 42 (gifts section), 49, 109 (notebook), 138 (story), 150 (reviews); product cr-ref-product-0 (page), 53, 79, 90. Effect: 0 or default 80px/32px padding instead of the draft's 112/80/64 and 34/24/18. Fix: store boxes {top,right,bottom,left} per tier (the container block.json says padding is "TIER-of-BOXES"). Detector: scan trees for padding tier values that are strings (23 on home, 11 on product).
2. N2 no resting rotate / absolute position / z-index. Hits: home hero collage (3 polaroids -9/8/-1.5deg, stamp 12deg, tape -6deg), "for a new mum" captions, gift cards (-1/1/-0.6/1.2deg), note card (-1deg), baby shower logo (-8deg), notebook (-1deg) + tapes (-4deg), story polaroid (-2.5deg) + tapes (-8/7deg), review cards (-1/1/-0.5/1.2), FAQ + icon (45deg open), instagram tiles; product main photo/tape flag (-4deg), review cards, related cards. Live: 0 elements with a resting transform in either page (hover transforms exist). Fix: framework gap on sgs/container, text, media, label: resting `rotate` plus `position:absolute` offsets.
3. N3 option-picker / choice-flow-question with no options. Hits: product cr-ref-product-19, 21, 23, 27, 29; home flow cr-ref-flow-choice-flow-build-your-zookie-10 (Flavours), and -12 (no price/badge).
4. N4 `textDecoration="underline"` on wrapper containers. Hits: product cr-ref-product-0, -1, -2 (whole page underlined). Home: none.
5. N5 dead draft-server URL in `colourBackgroundGradient`. Hits: product cr-ref-product-10, 11, 12, 13 (thumbnails), 78, 89, 100 (related card photos): 7 values pointing at 127.0.0.1:61088.
6. N6 button with no `url`. Hits: home cr-ref-home-8, 11, 48; product main CTAs are fine.
7. N7 empty button label shows "Click Here". Hits: home cr-ref-home-92 to 95 (gift dots), 220 to 225 (review dots); product cr-ref-product-10 to 13 (thumbnails).
8. N8 choice-flow gaps: one-page layout, pill options, multi-select max 3 with swatches, option price/sub-line/badge, preview art, plan cards, hidden chrome. Hits: home flow tree 161 as a whole.
9. N9 shape set by width only (circle/pill without height/aspect). Hits: home cr-ref-home-16 (stamp), 59/69/79/89 (card arrows), 114/119/124/129 (✓ badges), 235/239/242/245 (FAQ +), 157/158 (review arrows), 31/39; product cr-ref-product-36/38/40 (trust circles), 42/45/47/49 (accordion +).
10. N10 heading without fontSize. Hits: product cr-ref-product-56, 62, 68 and the other review card titles (58px instead of 20px).
11. N11 form-field-checkbox default "Option 1". Hits: product cr-ref-product-30.
12. N12 no sticky mobile buy bar. Hits: product 375 (and 768 below the hero).
13. NEW:flattened-hero-columns. Hits: product cr-ref-product-6 (gallery column, buy column and pink panel are not separate containers).
14. NEW:media-height. Hits: home cr-ref-home-25, 33 (card photos 88px / 411px high instead of 441), gift card slots.
15. NEW:no-block-link (card is not a link). Hits: home cr-ref-home-24, 32, 50, 60, 70, 80 (only 103 has sgsBlockLink).
16. Smaller NEW items: heading letterSpacing -0.42px on "for me"/"for her" (cr-ref-home-27, 35, 138-section eyebrows); hover background on notebook (cr-ref-home-109); stage note style (flow); indent on flow paragraph (flow -3); 300px thumbnails in the Instagram wall (2 tiles).
