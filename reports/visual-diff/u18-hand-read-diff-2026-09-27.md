# U-18 hand-read diff: the two header copies against their references (step 1 baseline)

Plan: `.claude/plans/2026-09-27-reference-capture-method-plan.md`, Method step 1. This is the diff the walker must reach
or beat (steps 3 to 5). Every row names the reference value, the copy value and the widths it holds at.

**How it was read.** The Indus draft source (`sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html`, markup,
inline styles and its component script) was read rule by rule. Then every reference and copy was walked in a headed Chrome
(the canary answers headless with a 403) by a DOM inventory dumper that is independent of the walker: every painting
element under the header, panel or drawer root in DOM order with its type, colour, box, border, padding, transform and
transition, `::before`/`::after`/`::marker`, the hover end state and a 60ms mid-transition sample of every link and
button, text sampled at 60 and 200ms during hover (scramble), and opacity, transform, clip and box sampled at 30, 120,
250, 450 and 900ms after each open action. The screenshots were then read by eye. Copies were measured only as the ACTIVE
header, inside one trapped command (`wp sgs header set-active 4461|4435`, always restoring 3777 plus
`qa-item-markup-fixture.php two-bar`). Widths: 1440, 768 and 375 (375 as an iPhone 13, touch), plus 1920 for lamalama's
viewport scaling. Both sides were read in the same headed browser, so both carry the same device-pixel rounding (a 3px
border reads 2.4px on both).

The dumper is scratch tooling; this report is its durable output. Bean's floor (L1 to L10, I-1 to I-3) maps to the rows
marked with it.

## A reference finding Bean must settle first: the Indus draft's entrance motion never runs

The draft's source declares a panel entrance (340ms, `translateY(-8px) scale(.99)` to rest, `cubic-bezier(.16,.84,.32,1)`),
a staggered link rise in each panel (460ms, 14px, 26ms apart, capped at 320ms) and a staggered drawer-item slide from the
right (420ms, 24px, 55ms apart). None of it plays in the rendered draft. Proven: `Element.prototype.animate` was wrapped
before hovering About and was never called, and `document.getAnimations()` showed only CSS transitions. Cause: the draft
runtime (`support.js`) calls the component's `componentDidUpdate(prevProps)` with one argument, and the draft's
`componentDidUpdate(pp, ps)` returns at once when `ps` is missing. So the draft **as rendered** has no panel or drawer
entrance: panels appear instantly, and only the backdrop fades (300ms). **Decision for Bean:** is the reference what the draft renders
(no entrance) or what its source intends (the three entrances above)? **Decided (Bean, 2026-09-28): source intent.**
I-M1 to I-M3 are proved on the copy alone against the declared timings, not compared with the draft.

## Indus (draft vs page 4465, header 4461)

### Desktop bar, 1440

| # | Element | Draft | Copy | Floor |
|---|---|---|---|---|
| I-B1 | Logo | 24px accent diamond (radius 7, rotated 45deg) + "Indus Foods" 19px/700, letter-spacing -0.19px, gap 10 | one image (`indus-foods-logo-qa-copy.png`, 144x30) | |
| I-B2 | Logo hover | opacity 0.75 (the draft's global `a:hover`) | opacity 0.85 and the link colour turns Mama's pink #c56a7a (the image does not show it) | I-1 |
| I-B3 | Nav item box | 42px tall, padding 0 15px, gap 2px between items, radius 11 | 50px tall, padding 13px 16px, 4px gaps, radius 11 | I-1 |
| I-B4 | Nav label type | Plus Jakarta Sans 15px/600, line-height normal (18px box), letter-spacing -0.15px | 15px/600, line-height 24px, **no letter-spacing** | I-1 |
| I-B5 | Nav x positions | Home 397, About 472, Sectors 566, Brands 670, Trade 769, Blog 858, More 923 | 387, 467, 563, 671, 773, 864, 934 | I-1 |
| I-B6 | Caret | 11px chevron at opacity 0.6, 6px from the label | 15px chevron at full opacity | I-1 |
| I-B7 | Caret turn | rotates 180deg while its panel is open, 0.3s `cubic-bezier(.16,.84,.32,1)` | rotates 180deg on hover | I-1 |
| I-B8 | Hover, panel items (About, Sectors, Brands, Trade, More) | text and caret to #0A7EA8, ground rgba(10,126,168,.12), 0.22s | the same colours, painted on a `::before`, 0.15s | I-1 |
| I-B9 | Hover, plain links (Home, Blog) | no colour or ground change (only panel items take the active state) | text to #0A7EA8 and the 12% ground, as for panel items | I-1 |
| I-B10 | Label magnet | the label follows the pointer, 0.14 x the offset from centre, `transform .2s ease-out` | magnet on (strength 0.16 in the bar config) | I-1 |
| I-B11 | Active item while its panel is open | keeps the 12% ground and the blue | blue text; the button's ground reads transparent (the `::before` is not re-read here; walker to confirm) | I-1 |
| I-B12 | Request Catalogue type | Plus Jakarta Sans 15px/700, box 180x45 | **Inter** 15px/700, box 179x48 | I-1 |
| I-B13 | Request Catalogue hover | lifts 2px (`transform .2s`), shadow to `0 9px 22px -6px rgba(10,126,168,.55)` (0.3s), opacity 0.75 | ground to Mama's dark brown #41322b, text cream #f7f1ec, shadow to `0 5px 18px -6px`, no lift, 0.3s | I-1 |
| I-B14 | Header bar | 76px row + 3px accent bottom border (78.4 painted) | 79px including the border | |
| I-B15 | Page scrim while a panel is open | rgba(20,25,35,.25), blur 2px, fades 0.3s ease | a heavier, darker scrim (screenshots); its values are not in this read: walker pair needed | I-1 |

### Mega panels, 1440

| # | Element | Draft | Copy | Floor |
|---|---|---|---|---|
| I-P1 | Panel boxes | About/Trade 620 at x410, Sectors/Brands 1080 at x180, More 300 at x570; top 90 (12px under the bar) | same x and widths; top 91 | |
| I-P2 | Panel heights | About 413, Sectors 340, Brands 296, Trade 351, More 187 | About 397, Sectors 332, Brands 281, Trade 386, More (not re-read) | I-2 |
| I-P3 | Panel shadow | `0 30px 80px -30px rgba(20,25,35,.28), 0 2px 8px -2px rgba(0,0,0,.08)` | four-layer warm brown shadow (`rgba(58,46,38,…)` 2/8/24/48px): Mama's theme shadow | I-2 |
| I-P4 | Link column padding | 24px top, 22 right, 10 bottom, 26 left: first row at y115 | **no top padding**: first row at y92 | I-2 |
| I-P5 | Link rows | `<a>`, 76px tall, padding 16px 6px, hairline rgba(30,42,60,.09), number/label gap 16, baseline-aligned | not links (containers), 79px tall, number-label gap 13 to 16 | I-2 |
| I-P6 | Link label / desc | label 15px/700 line-height 22.5, -0.15px; desc 13px/400 #68727C, 2px under | label line-height 18px; desc 10px lower (label-desc gap 10px) | I-2 |
| I-P7 | Link row hover | slides right: padding-left 6 to 12px, 0.22s ease-out; opacity 0.75 | none (not a link) | I-2 |
| I-P8 | Feature aside ground | About #075E80, Trade #0A7EA8, text white | **60% white** with a faint radial glow: the white title, text and link vanish | I-2 |
| I-P9 | Feature aside edges | no border; 300 wide, padding 24 | a 1.6px left border (#3a2e26 / #0A7EA8); radius 0 12 12 0; padding-left 24 | I-2 |
| I-P10 | Feature image frame | 252x130, 1px rgba(255,255,255,.25) border, square corners, image slot inside | 250x128, border .35, radius 8, empty ground rgba(255,255,255,.08) | I-2 |
| I-P11 | Feature tag, title, text | tag at y265 (18px under the frame); title 19px/700 -0.38px; desc 13.5px at .8 white | tag at y260; title -0.19px letter-spacing; the title and desc 16px lower | I-2 |
| I-P12 | Feature link | "Read our story" 14px/700, gap 7, 2px accent underline, line-height 21 | line-height 16.8, underline 1.6px; no hover (the draft fades to 0.75) | I-2 |
| I-P13 | Sectors cards | `<a>` cards 245x282, radius 18, padding 18, 14px gap; image area 209x110 radius 12, no border | containers 247x282; image area 211x110 **with a border** (.35) and an icon plus a lower-case caption inside | I-2 |
| I-P14 | Sectors card text | title at y265, desc 13px, CTA 13.5px/700 at y363 | title at y258, desc y305 | I-2 |
| I-P15 | Sectors card hover | lifts 6px, shadow `0 20px 40px -18px rgba(0,0,0,.4)`, 0.25s `cubic-bezier(.16,.84,.32,1)` / 0.3s; opacity 0.75 | none (containers); the CTA links have no hover either | I-2 |
| I-P16 | Brands eyebrow | "Our Brands" Geist Mono 11px/400, letter-spacing 1.54, #68727C, at y117 (26px panel padding) | generic monospace 11px/500 #6b5c50 at y92 (**no top padding**) | I-2 |
| I-P17 | Brand tiles | 174x64, radius 12, border rgba(30,42,60,.1), #FAFAF8, 10px gap, image slots | 170x75, border .35, an icon plus the brand name in text | I-2 |
| I-P18 | Own Brands aside | rgba(10,126,168,.06) ground, 3px #0A7EA8 left border, content centred vertically, 26px padding | 60% white ground, 1.6px left border, content from the top (y151 vs 157), padding-left 24 | I-2 |
| I-P19 | Own Brands CTA | "View All Brands" 14px/700 line-height 21, box 246x45, gap 8, fades to 0.75 on hover | box 154x48, line-height 16.8, no hover | I-2 |
| I-P20 | Panel-to-panel | moving between items swaps panels instantly; leaving closes after 170ms | not read (walker) | I-2 |

### Motion, 1440

| # | Element | Draft as rendered | Draft source intent | Copy | Floor |
|---|---|---|---|---|---|
| I-M1 | Panel entrance | none (instant) | 340ms, from `translateY(-8px) scale(.99)`, opacity 0 | opacity fade, 180ms ease-out | I-1 |
| I-M2 | Panel link/card entrance | none | each `[data-anim]` 460ms from 14px down, 26ms stagger, max 320ms | none measured on the rows | I-1, I-2 |
| I-M3 | Drawer item entrance (below 960) | none | 420ms from 24px right, 55ms stagger | the whole drawer fades in from -8px, 250ms linear | I-1, I-3 |
| I-M4 | Backdrop | 300ms ease opacity | same | not read | I-1 |

### Drawer, 768 and 375 (the draft switches to its drawer below 960px)

| # | Element | Draft | Copy | Floor |
|---|---|---|---|---|
| I-D1 | Order | logo row → CTA row (CTA, email, call) → 7 items → socials | close only → 7 items → CTA → email, call → socials | I-3 |
| I-D2 | Logo row | 64px row: 20px diamond + "Indus Foods" 17px/700 white | **no logo** | I-3 |
| I-D3 | Close | 38x38 box, 1.5px rgba(255,255,255,.6) border, radius 8, "×" 20px | bare 28px icon in a 44x44 button, opacity 0.75, no border | I-3 |
| I-D4 | CTA | full width (616 at 768, 223 at 375 where it wraps to two lines), 51 tall, radius 26, accent ground, 15px/700 PJS, arrow icon | 245x49 at the menu's foot, **Inter 15px/600**, a **1.6px pink border** (Mama's), no arrow | I-3 |
| I-D5 | Email / call | 46px accent circles beside the CTA, 16px icons | 24px circles (+12px padding) in a row under the CTA; the glyph paints about 37px, larger than its circle | I-3 |
| I-D6 | Items | Plus Jakarta Sans **20px/700**, -0.2px, rows 60px, padding 17px 4px, text at x24 | **Inter 16px/400**, rows 44px, padding 8px 12px, text at x44 (768) / 35 (375) | I-3 |
| I-D7 | Item hairlines | 1px accent (yellow #D8CA50) | 1px rgba(255,255,255,.18) | I-3 |
| I-D8 | Item caret | 11px at 0.85; turns 45deg when open | 16px in a 44px `<summary>` | I-3 |
| I-D9 | What opens a section | the whole row is one button | only the 44px caret; the label is a **link to the homepage** (tapping "About" leaves the page) | I-3 |
| I-D10 | Open label colour | the accent (yellow) | white | I-3 |
| I-D11 | Open About section | compact feature card first (#075E80, 64px thumb, tag 10px, title 15px, "Read our story" 12.5px), then links on the drawer blue: white 15px/700 labels, yellow numbers, 12.5px descs at .7 white, white .15 hairlines, rows 70px | the desktop panel body: cream #FBF3DC ground, dark text, blue numbers, 79px rows, then the desktop feature card (washed out, see I-P8) **below** the links | I-2, I-3 |
| I-D12 | Socials | four 38px circles, centred, 12px gap: LinkedIn #0A66C2 "in", Facebook #1877F2 "f", Google #EA4335 "G", Instagram #E1306C "IG" | five icons at the left (adds Twitter/X), 24px circles, glyphs overflowing | I-3 |
| I-D13 | Item hover (768) | none on items; CTA and round buttons fade to 0.75 | items turn Mama's pink #e68a95 (0.15s); CTA ground to #41322b; icons scale 1.1 and turn #7a6500 | I-3 |
| I-D14 | Drawer ground | #0A7EA8, full screen | #0A7EA8, full screen | (match) |

## lamalama (lamalama.com vs page 4446, header 4435)

### Closed pill

| # | Element | Reference | Copy | Floor |
|---|---|---|---|---|
| L-C1 | Pill box | 438x50 at top 16 (343 wide at 375), radius 4, black 60% ground, blur 4px | the same at 375, 768 and 1440 | |
| L-C2 | Viewport scaling | everything is in rem with a fluid root: 16px up to 1440, then about 1.111vw (21.33px at 1920): the pill is **584x67 at top 21**, logo 48, burger 40x48 | fixed 438x50 at 1920 | L8 |
| L-C3 | Logo | animated canvas 36x36, centred in the pill (y23, 7px from its top) | still image 36x36 at y16 (**flush with the pill's top**) | L8 |
| L-C4 | Burger | 30x36 at y23; three 16x2 bars, 3px gaps | 30x36 at **y20**; three 16x2 bars, 3px gaps | L8 |
| L-C5 | Middle text | a rotating message ("NICE ENTRANCE", "YOU MADE IT", "LET'S DO DAMAGE"), Sometype 10px/**500**, -0.2px, uppercase, centred between logo and burger | a fixed "LOOKING SHARP TODAY" in a notice banner, Sometype Mono 10px/**400**, no letter-spacing | L8 |
| L-C6 | Middle text click | a full-pill overlay (`div.js-menu-toggle`, cursor pointer) takes the click and opens the menu | the text is a plain paragraph: the click does nothing | L9 |
| L-C7 | Middle text at 375 | absent (closed and open) | shown | L10 |

### Open drawer

| # | Element | Reference | Copy | Floor |
|---|---|---|---|---|
| L-O1 | How it opens | the pill itself grows down: height 50 → 256 (30ms) → 410 (120ms) → 435 (250ms) → 436, top fixed | a separate dialog fades in over the pill: opacity 0 → 1 and -8px → 0, 450ms linear | L7 |
| L-O2 | Item entrance | each label rises from about 18px below with a clip reveal (`clip-path inset(0 0 100%)` → `inset(0)`), staggered; done by about 450ms | none | L6 |
| L-O3 | Burger when open | the three bars merge into one line (outer bars move ±5px) | a single line (matches) | |
| L-O4 | Page behind | blurred and dimmed; the reference's open pill reads as dark grey over it | nearly black behind the pill | |
| L-O5 | Item type | SuisseBPIntl 16px/400, line-height 22.4, -0.32px | **Inter** 16px/400, line-height 33 | L4 |
| L-O6 | Item indent | text at x533 (1440): 32px in from the row, the space the hover marker uses | text at x513 (12px) | L4 |
| L-O7 | Rows | 50px, 1px rule at 10% cream between rows | 50px, 0.8px rule at 10% cream | (match) |
| L-O8 | "What we do" glyph | 10px glyph of five 2px dots in a cross, at the row's right | a 2x3 dot grid | L1 |
| L-O9 | "Careers" glyph | 10px glyph at the row's right | **none** | L2 |
| L-O10 | Item hover | a 10% white ground fades in (opacity 0 → 1, about 120ms), a marker built from SVG paths fades in at the row's left, path by path (staggered), and the row rule hides | text turns Mama's pink #e68a95 (0.15s), nothing else | L4 |
| L-O11 | CTA hover | the label **scrambles** (random glyphs, then the label) for about 200ms; a fill fades in behind (outline button: cream fill, dark text; filled buttons: black fill, cream text) and the inner face scales to 0.98 | outline: Mama's pink fill #f5c2c8 at .91 and dark brown text; filled: Mama's brown #41322b ground, cream text; no scramble | L5 |
| L-O12 | CTA type | Sometype 10px/500, -0.2px, uppercase | Sometype Mono 10px/500, -0.2px, uppercase | (match) |
| L-O13 | "This is Us" | while open: a fixed button at the viewport's bottom centre (header child): a 40px round autoplay video above "THIS IS US" (Sometype 10px uppercase), at every width | **none** | L3 |
| L-O14 | Corner card | "GET IN TOUCH" card with a 136x200 video (1440 only) | none | accepted, DEC-18 |

## What the walker must see to reach this diff

Classes of evidence this diff rests on (the walker's current reach is compared in the walker report):
1. Hover on every link and button in the bar, each panel and the drawer, including pseudo-element grounds (`::before`) and descendants (the draft's link rows change `padding-left`, lamalama's marker is SVG paths).
2. Open states driven by hover (the draft opens panels on pointer-enter) and by click, the drawer's accordion through its real control.
3. Motion sampled over time after each open: box growth, clip reveal, staggered children, and every running animation's timing.
4. Text sampled over time during hover (scramble).
5. Element order inside the drawer and panels, and elements present on one side only (logo row, feature card, "This is Us", glyphs).
6. Sizes at 1920 as well as 1440 (viewport-scaled rem).
7. What takes a click at a point (the pill text overlay) and what a click on a drawer label does (opens vs navigates).

## Steps 2 to 5: the walker against this diff (2026-09-28)

**Step 2, walker as it was** (configs `plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-indus.mjs` and `parity-lamalama.mjs`,
using only the existing features). It found about half the rows. It missed:
- every panel-link and card hover, because an earlier bar hover closed the panel and the pair was skipped silently;
- all entrance motion, because running motion was read after the state's own wait;
- `::before` and child grounds (read as transparent, which gave false positives);
- horizontal positions, element order, and elements present on one side only (logo row, glyphs, socials, "This is Us");
- the pill text taking the click (L9), and a drawer label navigating instead of opening (I-D9);
- the scramble (L5) and the hover marker (L4);
- L10, because its 375 was a desktop window and the site hides the message by device.

**Step 4, header mode added to the walker** (`scripts/parity/GAP-CHECKLIST.md` section 11). Each check has a
self-baseline (a reference against itself reads 0 at every width) and a planted-CSS negative control that turns it
red. Both are recorded in the commit messages.

**Step 5, final runs** (`reports/visual-diff/u18-walker-indus-2026-09-28.md`, `u18-walker-lamalama-2026-09-28.md`;
self-baselines 0 open at every width for both references):

| Rows | Walker result |
|---|---|
| Indus bar I-B1 to I-B15 | all found except I-B14: the header's 1px height difference is within the 2px box tolerance |
| Indus panels I-P1 to I-P20 | all found. I-P20 (panel switch) is found as timing (Brands grows 1.41x at 30ms on the copy), with no dedicated state |
| Indus motion I-M1 to I-M4 | found for the draft **as rendered**. The source-intended entrances need Bean's decision (top of this report) |
| Indus drawer I-D1 to I-D14 | all found (order, missing logo row, close, CTA, email/call, type, hairline, caret, label navigates, open colour, accordion body, socials, hover) |
| lamalama L1 to L10 and L-O rows | all found: glyphs (dots/5 vs svg/6; Careers svg/4 vs none), "This is Us" presence, hover ground and marker, scramble, rise (`timeline:children`), grow-from-pill (`timeline:growth`), 1920 scaling, logo/burger/message offsets, pill text tap (opened vs nothing), message absent at 375 on a phone, text indent 43 vs 12 |

**Found by the walker only (beyond the hand-read):**
- the Indus copy's panel sits inside the header element where the draft's is a sibling of the bar (a structural
  fact, nothing painted);
- the lamalama copy's first drawer link opens focused, with a gold glow (the dialog focuses it on open);
- the message line-height is 20 against 16.

**Exceptions, named in GAP-CHECKLIST section 11:**
- canvas logo (content not DOM-readable);
- rotating message (words ignored);
- scrambled glyphs (only the fact of change is compared);
- video content;
- the reference's hidden in-pill contact form (Cancel/Next, dropped from the inventory).

Next is step 6 (sort each row into composition or framework capability, then plan the fixes). Its first input is
Bean's decision on the draft's entrances.
