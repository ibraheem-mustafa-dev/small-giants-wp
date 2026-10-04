# Eye Care: fix register

**Written for:** Bean. Every fix the Eye Care test site still needs to match its draft, one line each, merged with your review of the first version.

**How this version was made (2026-10-03).** Your points file went through four steps:
1. Six investigators traced each cause in the code, the layout files, the draft source and the live site (shop, bag and drawer items were tested in a browser).
2. A research pass covered the questions you asked about standard practice.
3. A council of three reviewers checked every named file and setting exists (127 references, spot-checked by me), attacked each fix for rule breaks and simpler options, and audited that every one of your points lands exactly once.
4. I ruled on their disagreements. The working notes are in the session scratchpad; this register is the result.

**Numbering.** Original item numbers are kept so you can compare. Your new points keep your labels; where you used a label twice it is split (N16a/N16b, N17a/N17b, N36/N36S). Site-wide fixes are S1 to S12; an item that one of them covers says so.

**Status column:**
- *proven*: the cause is shown in the code or measured on the live site.
- *to prove*: the fix is designed, but the cause must be confirmed first (the line says how).
- *decision*: yours to call; see "Decisions for you".

**Type column:**
- *tree*: a value in the page's layout file.
- *framework repair*: an existing setting that does not work, or a hardcode overriding one.
- *framework new*: a missing setting any client would need.
- *content*: page, product or Site Info data.
- *client*: Eye Care-only styling, in its own token file.

## Three build rules for every item

1. **Step 0: rebuild every page from its layout file first.** The live header is older than `header.tree.json`: the file has asked for an 18px wordmark that shrinks to 15px since 30 September, and the live one is 16px with no shrink. Every tree is rebuilt through `wp-build-page.js` before any item is judged, so no fix chases a stale page. **Done 2026-10-03:** all 17 trees rebuilt on eye-care-test with zero invalid blocks; the wordmark now computes 18px at rest and 15px scrolled.
2. **Match each element's full CSS, not just the difference you can see (your point 26).** For every element touched, set margin, padding, line height, font, letter spacing and width to the draft's values, so neighbours stop shifting. This applies on every surface, not just the footer.
3. **Every new or repaired setting uses the shared controls (your point 70).** Typography through the shared typography controls; per-device values through the responsive control; spacing and gaps through the shared spacing control; padding and margins through the box control; colours through the token picker. Each new setting names the block where the same control is already done, and copies it.

## Decisions

**Decided on 2026-10-03:**
- D1: a general "measured diagram" block (drawing uploaded as media, labels bound to product measurements, table and note, follows the size picker); the table and note go in first with existing blocks.
- D7: the Google rating as a badge (the reviews block's badge layout) in the header's top bar, on every page.
- D8: the brand logo above the product name, linking to the brand page.
- D2: accept the 50-60ms stagger difference.
- D3: build the draft's drift mode.
- D4: hide ".00" everywhere except WooCommerce's checkout total lines.
- D5: the floating WhatsApp steps aside over the footer strip.
- D6: the live best-sellers list.
- D9: brand pages (`/brand/<slug>/`) with a short unique intro each; filtered shop links point to them, and an intro-less brand page stays out of the index.

**Readings of your notes** (unchallenged on 2026-10-03, so they stand):
- In 54+55 you wrote "N14B"; I read it as N14C, the green WhatsApp style. N14B is the black hero button.
- 153 "All seems fine": the live checkout's extra fields stay. The redesign (154) restyles them.
- 19: the bag's free-delivery text stays bold (your preference). The bar's fill speed still gets matched, because you did not object to it.
- N19: the "See everything" and "All 12 styles" links get the draft's warm-taupe hover colour, because you said the hover colour is missing. Menus and footer links stay black (your point 2).

## Answers to your questions

- **15, why the drawer's minimum height is the problem.**
  - The drawer body is told to be at least a full screen tall, but it starts 64px down, below the title row. So it ends 64px below the screen and the bottom group follows it off the screen.
  - The draft's body fills only the space under the title row.
  - The `bottom: 0` against `auto` you spotted is on boxes that ignore it, so it moves nothing.
  - Fix: the body fills the space that is left.
- **67, why core/post-content.** It is the only block that prints a product's full description with its formatting (lists, images). It is not on the banned list, and no SGS block does this job. It stays.
- **70, "use sgs/accordion".** It already is sgs/accordion. Its problems are inside the block: a hardcoded size and colour, and two height animations running at once. The block is repaired once and both accordions benefit (S5).
- **71, control or per-site code.** A framework control: the product block gains settings that pass text styling through to the colour and size options.
- **84, Tab skipping the options.** This is correct, not a bug. Each option row is one keyboard stop: Tab lands on the chosen option and the arrow keys move between options. That is the standard pattern screen-reader and keyboard users expect, and it passes WCAG. I tested the arrows live.
- **87, breadcrumbs.** End at the product name, in regular weight and not a link (Google's and NN/g's guidance).
  - Today the trail ends at the brand, which is wrongly marked as "this page" and forced bold.
  - Fixed: Home / Sunglasses / Gucci (link) / Gucci Oversized Cat-Eye.
- **88, stock line weight.** Regular. The green dot and the words already carry the status; bold adds nothing.
- **128, contact details layout.** At desktop width the two match. The difference is smaller screens: the draft goes to 3 columns on a tablet and 1 on a phone; live stays at 2. Your call: tablet stays at 2 (live), phone goes to 1 (draft).
- **N17b, hero text position.** Bottom-left, as the draft. The layout file already asks for bottom, but a framework bug sends it to the middle. Fixing the bug gives you the draft's look, which keeps the photo's subject clear.
- **N24, Google logos linking.** Yes. Google's display rules require each review to show its source with a link back to it; the G logo is the natural place for that link.
- **N30, the little box in the sizes.** It is the "boxing system" symbol frame makers print inside the arm ("56□17 145": lens width, bridge, temple). Your call: plain "56 · 17 · 145" everywhere, because it tells a shopper nothing.
- **N33B, Save shown twice.** Keep the one beside the price, where the buying decision happens; drop the photo tag.
- **59, swatches on cards.** Standard (Baymard): a swatch changes only its own card's photo, and clicking the card then opens the product with that colour already chosen.
- **C1 (20), one bag line or two.** One combined line with a single remove. The lenses only exist with that frame, so two lines risk orphaned lenses. Evidence here is thinner than for the other answers.
- **115.** It is the first sentence of the size-guide pop-up ("Which size am I?"), which is a lighter grey than the draft.
- **28, the "ch" unit.** It already exists on text and heading width settings; the tagline just does not use it.
- **30, custom gaps.** Yes, the shared spacing control is the universal one (S11).
- **35, the hardcoded fade.** A leftover default with no setting. It is deleted, as you said, and any fade you want comes from the colour picker's opacity.
- **37.** Yes: the address can link to the Google Business link stored in Site Info.
- **62.** The WooCommerce filter block already has a "show counts" switch in its settings, so clients can turn it back on.
- **N22, shape tile borders.** The draft code gives the tiles a light border (#E6E1DA) at rest and a slightly darker one (#CFC7BB) on hover. Your call: match the draft (item N22).
- **N39, side margins.** At 1440 the text starts at the same spot on both pages, so your 128 against 85.2 was probably measured at another width. The top spacing is the main fault and is fixed by S6; the sides are re-measured at 1280, 1366 and 1920 (item N39).

## Site-wide fixes (one change, many items)

| ID | What it fixes | Fix | Type | Covers |
|---|---|---|---|---|
| S1 | Button hover is inconsistent: some lift, some darken, some do nothing | One site setting holds the button hover: lift 3px over 0.25s (the draft's timing). It is a new "default" entry in the existing button-style token family, so there is still one scheme. Every button style reads it: preset buttons, boxed custom buttons, the product page's add-to-bag, the colour tiles and the reviews buttons. The framework default stays "no lift", so other clients are unchanged. Plain text links use a "link" button style (the same one S2 uses) that never lifts. The white button style is repaired: today its hover is white text on white. Colour rules: white with black text = lift only; black with white text and border = lift plus a lighter ground; green WhatsApp = lift only. The generic darken goes (the outline wash and About's darker green). | client token + framework repair + tree | 50, 60, 104, 113, N14, N16a, N41, N36C |
| S2 | Text links and menu words | Text stays its own colour (black). An underline sweeps in left to right on hover and retracts right to left on unhover, in the link's own colour (a green WhatsApp link gets a green line). One mechanism: the theme's existing underline-slide utility, corrected to retract backwards and drawn so it works on links that wrap; the plugin's unused duplicate is deleted. Header menu: the existing "sweep" setting, switched on. Mega-menu links: a "link" button style using the same sweep. Plain links in text, and the footer's link-list items (which carry their own class), use the same rule, switched on by a client token. The register's old taupe hover values are not applied. | tree + framework repair + client token | 2, 6, 7, 32, 33, 44, 131 |
| S3 | Phone and email hover fades instead of darkening | Delete the hardcoded 80% hover fade on phone/email links and the bag button. Set the hover colour to black in the trees. Same-pattern sweep: delete hardcoded hover fades only where the block already has a hover-colour setting. Contact page phone/email also take the S2 sweep, so they mirror the page's other links (131): the sweep is switched on by adding the utility's class to those two blocks in the contact layout file. Header and footer phone darken only. The fade is the probable cause of the missing darken: read the live hover colour before and after to confirm. | framework repair + tree | 4, 34, 35, 139, N1, 131 |
| S4 | WhatsApp buttons and cards differ page to page | **Button:** green ground, black label, and the icon follows the label colour (fixes the icon going near-black by accident). Hover = S1 lift only. **Card** (product page, size pop-up): the text stops inheriting the button's bold, tight line height; title and subline take the draft's size, weight and dark-green colours (two client colour tokens). The live logo size stays. Hover = the S1 lift: the block's built-in grow-and-shadow default goes, and the lift comes from the S1 setting (no number written into the block). **About and contact buttons:** the home button's icon and text size. | framework repair + tree + client token | 54, 55, 74, 78, 79, 108, 109, 127, 138, N28, N36D |
| S5 | Accordions (product "Good to know" and Help FAQ) | Header text follows the accordion's size setting per device (the hardcoded 1rem and the phone 0.9rem go). No ground on hover or open by default. One open/close animation (the browser's native one) instead of two stacked. The older JavaScript animation stays only as a fallback for browsers without native support, so the two never run together. The + rotates 45° into an × in time with the motion. Header and answer padding: the block's existing padding settings are repaired so the header actually reads them (today a hardcoded value wins). New settings: icon rotation and icon size only. Product: several open at once (as the draft). Help: one at a time (as the draft). Icon size midway between draft and live. | framework repair + framework new + tree | 70, 110, 122, N32 A-F |
| S6 | Page content starts too low on Lenses, About, Help, Contact | Each page's outer container uses the section spacing (104px) instead of the draft's page spacing. Set top/bottom to 48/90px (phone 28/60). Help's page ends at 0 today: check whether its last section already supplies the bottom space before setting 90. | tree | 146, N39, N42, N43, N44 |
| S7 | "No reviews yet" broadcasts a lack of demand | Remove the "No reviews yet" text from every product card (the framework already shows nothing when it is empty). Delete the product page's "no reviews on this frame yet" panel. Stars still show on products that do have reviews. The shop's Google rating moves out of the deleted panel (D7). | tree | N27, N31, 86 |
| S8 | Prices show ".00" | One switch hides ".00" on whole-pound prices across the shop's pages: product page, cards, bag, lens pop-up and the shop's own price text. Emails and admin keep pennies. Checkout total lines: see D4. | framework repair | N9, N34 |
| S9 | Brand names typed where logos belong | All 40 brands already have a logo saved on the brand. One shared lookup prints the logo, with the brand name as its text alternative, on product cards, the product page top and bag lines. It falls back to the name when a brand has no logo. | framework new + tree | N10, N27-brand, N33A |
| S10 | Things that should be one link are not | One shared "stretched link" piece: the main link's clickable area covers the whole card or logo row, while buttons inside (wishlist, swatches) sit above it and keep working. Used by product cards (whole card links to the product) and the header logo (logo plus "EYE CARE BIRMINGHAM" as one link). | framework new + tree | N26, N2A |
| S11 | Gap settings that take presets only | The universal control exists (your point 30): the shared spacing control, whose free-input mode (number plus unit) the button group uses. Today a control is either presets or free input. Small repair: one "Custom" entry beside the presets switches to the number-plus-unit box, so every gap offers both. Link lists and social icons switch to it. Their output accepts a length as well as a preset, checked before it is printed. | framework repair | 30, 40; Lenses benefits list (2026-10-03: `icon-list/render.php` turns the tree's `11px` gap into `--wp--preset--spacing--11`, which does not exist, so the gap silently falls back) |
| S12 | A clicked card or link gets underlined everywhere | The theme draws an underline on any focused link, which beats each block's "no underline". Show it only for keyboard focus, on text links. The keyboard focus ring stays. | framework repair | N6 (and every whole-card link) |

## Header

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 1 | Top bar sentences larger than the draft (14px vs 12.5px); icons are fine | trust-bar label size 12.5px, weight 400. Icons stay at the live size (your choice). | tree | proven |
| 2 | Menu word hover | S2: black, sweep underline | tree | proven |
| 3 | The only missing load animation: the bag count circle pops into view | See 17 | | |
| 4 | Phone and bag fade on hover | S3 | framework repair | proven |
| N1 | Phone number does not darken to black on hover | S3 | framework repair + tree | proven in code |
| N2A | Only the logo image is a link; "EYE CARE BIRMINGHAM" is plain text | S10: new "whole logo row is the link" setting on the logo block, then on in header.tree.json | framework new + tree | proven |
| N2B | Scrolling back up, the wordmark briefly wraps to 3 lines ("EYE" over "CARE") | Reproduced after step 0 (2026-10-03, 1440 wide, sampled every 40ms): while the wordmark grows from 15px back to 18px it wraps to 2 lines for about 240ms (16.0px to 17.9px), then settles to 1. The wordmark column shrinks to its narrowest width while the row animates. Set the heading's text-wrap to "nowrap", which stops the wrap whatever squeezes the column. | tree | proven live |
| N3 + 17B | Bag count sits too low, not centred on the BAG text | The bag-count rule inherits a 2px nudge meant for the icon-only badge. Reset it so the circle centres on the text line. | framework repair | proven live |
| N4 | Top bar should become a moving strip when its items no longer fit, paused on hover | Follow the draft: below 768px the bar scrolls (30s loop); at 768px and above, items that do not fit are dropped. The scroll settings exist. A small repair lets "drop" and "scroll" work together: today turning scrolling on switches dropping off at every width. The strip pauses on hover and on keyboard focus, and gets a visible pause button: moving content over 5 seconds needs one for WCAG 2.2.2. | tree + framework repair | proven |
| D7 | The shop's Google rating needs a positive, prominent home | The reviews block in its existing badge layout (stars, score, count, linked to the Google listing) as an item in the header's top bar | tree | decided |

## Mega menus

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 6 | Top menu word hover | S2 | tree | proven |
| 7 | Links in the Sunglasses and Help panels | S2: a "link" button style with the sweep. The underline takes the text colour, so the green WhatsApp link gets a green line. | framework new + tree | proven |
| 8 | Panel text starts 52px too far right | The panel's first container adds a second 52px. Set it to full content width in the Sunglasses, Brands and Help trees. | tree | proven live |
| 9 | Brand tiles: live logos are correct | Logos read as the brand name to screen readers. One fix: the Ferrari tile reads its name twice; clear its title or its image's text alternative. | tree | proven live |
| 11 | Brand list rows taller and bolder; draft fits 7 columns, live 6 | Rows: no minimum height, weight 400, line height 1.5. Columns: the same rule as the draft; live loses 104px to item 8's double padding, so item 8 closes it (computed, not measured: re-count after). | tree | proven (rows); to prove (columns) |
| 12 | Lens cards 15px shorter | label and price line height 1.5 | tree | proven |
| N5 | At wide screens the panel stops at 1440px, left-aligned; draft ground is full width with the content centred | New panel setting "width limit applies to: panel / content". Content mode paints the ground edge to edge and centres the content at 1440. | framework new + tree | proven live at 1920 |
| N5.5 | Sunglasses, Lenses and Help open their panels but cannot be clicked through to their pages | The ordinary dropdown menu already renders a link plus a separate open button; mega items always render a button only. Mega items with a page get the same link-plus-button pattern, with the button discreet and still 44px. Then add the page links to the three menu items (Brands stays button-only). | framework repair + content | proven in code |
| N6 | Clicking a Lenses card underlines all its text | S12 | framework repair | proven live |

## Phone drawer

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 13 | Title and close button touch the screen edges | drawer title row padding 20px 24px 0 | tree | proven |
| 14 | Shop links all appear at once; draft brings them in one by one | New drawer setting "stagger items inside groups", CSS only, replays on every open. Draft movement: rise 18px, 0.5s ease. Timings: D2. | framework new + tree | proven |
| 15 | Bottom group (phone, social buttons) pushed below the fold | The body is a full screen tall but starts 64px down. Make the drawer a column and let the body fill only the space left. The remaining ~13px comes from the "More" list: gap 14px and line height 22.5px, as the draft. | framework repair + tree | proven live |
| N7 | Drawer social buttons' colours (normal and hover) should equal the draft footer's | Swap the three hand-styled buttons for the same social-icons block as the footer (colours and hover from footer 39-43), with a new "fill the row" option to keep the full-width buttons. Same Site Info links. | framework new + tree | proven |

## Bag drawer

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 17 | Count pop: wrong size and timing; draft pops on page load even at 0 | The existing on/off pop setting becomes off / on change / on load and change. The pop takes the draft's shape: grows from 60% with a fade, overshoots to 115%, 0.5s. Check it plays at 0. | framework repair + tree | proven |
| 18 | "Added to bag / View bag" toast missing | One shared toast (polite announcement, "View bag", closes after 5s, pauses on hover or focus, respects reduced motion). Errors also show as a toast, in error colours, and stay until closed. The red inline notice and the "Added to your basket." strip under the button are removed in toast mode. First check whether the notice-banner block can be the toast's shell. | framework new + tree | proven |
| 19 | Free-delivery bar fills faster than the draft | Bar fill duration to the draft's; the text stays bold (your choice) | framework new + tree | proven |
| 20 + 23 | Bag line details are messy | One server-built summary per line. The bag, cart, checkout and emails all use it. **Frame only:** "Frame only · Size: M · Colour: Gold". **With lenses:** line 1 "Prescription · Distance · Thin · Light-reactive", line 2 "Size: M · Colour: Gold". It drops "Your prescription", "What they're for" and "Options:", the lens thickness number, and the lens width shown as the size (the size letter comes from the same size scale the product page uses). One combined line per frame. "Add my prescription" hides once that frame has lenses. The framework builds the summary from labels; the wording ("Frame only", "Prescription", each option's short name) is set in Eye Care's lens pop-up layout file, so no optician words live in framework code. | framework repair + framework new + tree | proven in code |
| N8 | Opening the bag sets off the wordmark wrap | Same as N2B | tree | to prove |
| N9 | ".00" shown | S8 | | |
| N10 | Brand name typed in the bag line | S9 | | |
| N11 | A second, different product never reaches the bag; a second pair of the same frame says "Please wait before adding more of this item." | Two faults in the shop's add-to-bag route. **(a)** It says "added" but drops the line when the bag already holds something. Adding through WooCommerce's own route works, so the bag display is fine. **(b)** A deliberate 30-second "per item" cooldown blocks a normal second pair. Ship (b) now: no cooldown for an item already in the bag, plus clearer wording. For (a), the leading theory is that the route builds the bag without loading the saved one. Test it on the canary (add A, add B, read the bag), then load the saved bag before adding. | framework repair | (a) symptom proven live, mechanism to prove; (b) proven live |

## Footer

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 25 | Main row needs more space all round; bottom row less | Main row padding 104/52px (phone 56/20); footer's own side padding 0; bottom row 16px 24px | tree | Solve closed (padding, 2026-10-03); the footer height still follows 29, 30 and 34 |
| 26 | Wordmark box taller in the draft | heading weight 500, line height 1.5, margins 0 | tree | Solve closed (2026-10-03) |
| 27 | Spacing between wordmark, BIRMINGHAM and tagline | BIRMINGHAM becomes sgs/heading in subheading mode (9.5px, 0.32em tracking, label colour, 4px top margin). Tagline 18px top margin. Social row 20px top margin. Brand column gap 0, so only these margins space it. | tree | Solve closed: the margins, size and tracking (2026-10-03); the block swap stays |
| 28 | Tagline too wide | width 32ch, text-wrap pretty (both settings exist) | tree | Solve closed (2026-10-03; written as the 32ch value in px, 293.9px) |
| 29 | Column headings bold serif; draft is light sans | the three headings in subheading mode: 11.5px, 0.2em, uppercase, weight 400, line height 1.5, 4px bottom margin. Each column stacks with a 10px gap (draft). | tree | Solve closed (2026-10-03): size, tracking, weight, line height, bottom margin, and the 10px gap (columns set to the stack layout) |
| 30 | Link lists use the banned core/list | Replace with sgs/icon-list: no markers, 14px, line height 1.5, gap 10px (S11) | tree + framework new | proven |
| 32, 33, 44 | Link colours and underlines | S2 | | |
| 34, 35 | Phone hover; phone link 44px tall (draft 21px) | S3 (darken to black like the header). Phone link: no minimum height, no padding, so it is one 21px line. The 44px touch-target rule is met by the line spacing around it; check after. | framework repair + tree | proven |
| 36 | Address on one line with a comma | Store the Site Info address with a line break | content | proven |
| 37 | Address not a link | New address-link setting on business-info: none / Google Business profile / directions. Set to Google Business profile (the link already in Site Info). | framework new + tree | proven |
| 38 | Hours bold and split | weight 400, condensed, inline. The day labels' weight 600 is hardcoded on `.sgs-business-hours__day` and the block's weight setting does not reach it (Spec 47 calibration, 2026-10-03): the day label follows the block weight, or gets its own setting | framework repair + tree | proven |
| 39-43 | Social icons: colours, gap, order, hover | Brand-colour mode gets a variant that colours only the glyph: Google in its 4 colours, Instagram in its gradient (new glyph), WhatsApp green. The box stays white with a light border. Hover: border and a 1px ring in the network's colour, no scale-up. New "networks" setting for order: Instagram, Google, WhatsApp. Gap 10px (S11). Boxes stay 44px, not the draft's 40px, to keep the 44px touch-target rule. | framework repair + framework new + tree | proven |
| 45 | /privacy and /terms are missing pages | Create both pages | content | proven |
| 46 + N12 | Bottom row layout; no SGS credit; trademark sentence | Bottom row padding and spacing as above. Add the existing "Website credit" variant of business-info. Remove "All brand names are trademarks of their owners" from the Site Info copyright text. | tree + content | proven |
| 47 | Text moved by other causes | Re-walk after the rebuild | none | proven |
| 48 | Space above the footer | Live already has the top line; spacing comes from 25 | tree | proven |
| N46 | A footer row with a width cap collapses to zero width (found by Spec 47 Solve, 2026-10-03) | `maxWidth` on `sgs/site-footer-row` gives the row auto side margins that cancel its stretch, so its content width goes to 0 and every column squeezes. The header rows had the same fault, fixed in acc2a3b6d (`sgs_header_rows_align_css`); give footer rows the same full-width rule. Calibration also shows the row's per-device gap and content width skipping 768: prove that next | framework repair | proven live |
| N13 | Floating WhatsApp can cover the bottom-right links | The button steps aside while the footer's bottom strip is on screen: extend its existing "hide near another WhatsApp button" watcher with a generic opt-in on the footer row (D5) | framework repair + tree | proven |

## Floating WhatsApp button

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 49 | Label heavier than the draft; icon small, especially when it collapses to icon-only | Label weight 500 and 13.5px (draft). Icon 25px in the pill (between the draft's 22 and live's 28). In the collapsed circle the icon stays 28px or larger, which needs a small "collapsed icon size" setting. | tree + framework new | proven |

## Home

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 50, 60 | Buttons that should lift do not | S1 | | |
| 51 | Hero photo has no slow zoom-out on load | The ken-burns effect paints nothing on the standard hero, and it is a 20s loop where the draft is a one-off 3s zoom from 108% to 100%. Repair the paint and add a "zoom out once on load" mode with duration and start size. | framework repair + framework new | proven in code |
| 52 | Brand logo strip never starts scrolling | Thought to wait for off-screen images before starting. Read the live page first. | framework repair | to prove |
| 53 | Hero photo does not drift like the draft's | Live uses a fixed background (the photo stands still while the page moves); the draft drifts. Turn the fixed parallax off and add a "drift" mode: the photo moves at a set share of the scroll speed (draft 0.18), off under reduced motion (D3). | framework new + tree | proven in code |
| 54, 55 | WhatsApp button colours | S4 | | |
| 57 | Pre-filled WhatsApp message | Keep it (your choice) | none | closed |
| 58 | Hero buttons appear instantly | Button group: fade-up 18px, 0.9s, ease, 0.56s delay. The label, heading and paragraph already match the draft exactly. | tree | proven |
| 59 | Card colour dots cannot be focused or clicked | Swatches become real buttons that change only their own card's photo; the card link then opens the product with that colour chosen (the standard). | framework new + tree | proven |
| N14 | Button hover standard | S1 | | |
| N15 | "See all reviews" has no hover; draft darkens its blue ground | See-all hover ground #1765CC (the draft's) | tree | proven |
| N16a | Review buttons need the 3px lift | S1 | | |
| N16b | Best sellers is 8 hand-picked cards, not a live list | WooCommerce's best-sellers product collection (8, by sales) with the same product card inside (D6). The test site has no sales yet, so the order is arbitrary until orders arrive. | tree | proven |
| N17a | The whole Google reviews block grows on hover | Remove the default scale-up and shadow from the reviews block (no client wants a full section growing) | framework repair | proven |
| N17b | Hero text sits in the middle, not bottom-left | The vertical position setting writes to the wrong axis, and a hardcoded "centre" overrides it. Repair both; the layout file already asks for bottom. | framework repair | proven in code |
| N18 | Draft overlay is darker; you prefer live | Keep live. The walker is improved to catch overlays (see "Walker improvements"). | none | closed |
| N19 | "See everything" and "All 12 styles": underline touches the text; no hover colour | Draft draws a 1px line 3px below the text, not an underline: bottom border 1px, bottom padding 3px, no underline. Hover colour: the draft's taupe (see readings above). | tree | Solve closed (2026-10-03) |
| N20 | Shapes section's ground stops at 1440px | The draft has no ground there at all; live adds a grey band (a tile colour used by mistake). Remove the ground, and use content width instead of box width. | tree | proven at 1920 |
| N21 | Grey tint behind the shape tiles | Most likely that same band (N20). Re-check after N20. | tree | to prove |
| N22 | Tile borders look white | Match the draft: #E6E1DA at rest, #CFC7BB on hover. The tree already says so, so first read the live border colour to find what overrides it. | tree or framework repair | rest colour Solve closed (2026-10-03): it was a tree value; hover colour still to check |
| N23 | Review slider arrows have no light-blue hover | arrow hover ground #F1F6FE; the "Write a review" hover gets the same | tree | proven |
| N24 | Google logo in each review card should link | Link it to the review or listing (Google's display rules) | framework repair | proven |

## Shop

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 61 | Card colour dots | Same as 59 | | |
| 62 | Size chips show counts "Small (4)" | show counts off; the switch stays in the block's settings for clients | tree | proven |
| 64 | Filter drawer's top bar scrolls away | Pin the top bar like the bottom one | framework repair | proven |
| 65A | "Polarised" tag drops to its own row, right-aligned | When it wraps, align it left under the name | framework repair | proven live |
| 65B | Shop never goes to one column, even at 320px | The shop's "narrow layout: grid" floors each column at 50% width, so it can never reach one column. Add "single column below 400px" to the shop's narrow layout. Research leaned to 2 columns for visual products, but its evidence was weak, and one column also fixes 65A and 65C. | framework new + tree | proven live |
| 65C | Price on its own line, RRP drops beside the swatches | Keep price and RRP together on one line; the swatches wrap below instead | framework repair | proven live |
| N25 | Choosing then removing a filter breaks the filter panel (duplicate Gender, empty sections with arrows) | WooCommerce redraws the filters and leaves the shop's own group wrappers behind as empty shells. Clear the empty shells before each rebuild. Test: choose then clear; group count equals heading count. | framework repair | proven live |
| N26 | Only the photo and title are links | S10: whole card links to the product, wishlist and swatches still work | framework new + tree | proven |
| N27 | "No reviews yet" on cards | S7 | | |
| N27-brand | Typed brand name on cards | S9 | | |

## Product page

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 67 | Description inset 24px and fluid-sized | Tabs gain a panel padding setting (set 0); description uses a fixed 16.5px size preset. core/post-content stays (see answers). | framework new + tree | proven |
| 68 | Colour tiles 8px taller with a gap above the photo or colour | Remove the tile's top padding whenever the tile shows a photo or a colour block (it is meant only for text-only tiles) | framework repair | proven |
| 69 | Size pop-up | See Help 123 (one fix for the pop-up) | | |
| 70 | Accordion | S5 | | |
| 71 | Swatch names bigger and bolder | The product block passes text styling through to the options (size, weight, tracking, colour) | framework new + tree | proven |
| 72 | Sections do not fade up on scroll | fade-up 26px on the three section containers | tree | proven |
| 73 | Main photo does not fade in on load | New entrance setting for the gallery photo on the product block | framework new + tree | proven |
| 74, 78, 79 | WhatsApp card | S4 | | |
| 75, 82, 158 | Gallery thumbnails and colour-swatch photos do not show, though you set up the photos (gucci-oversized-cat-eye) | Your data is right; the framework ignores it. The gallery reads only an SGS-only field and never WooCommerce's own product gallery, and the swatch-photo setting is off. Fixes: (1) gallery = the variation's photo plus the WooCommerce gallery, without duplicates; (2) turn on swatch photos; (3) any variation with its own photo shows it. Today a photo equal to the main image is skipped, so Ivory stays flat. | framework repair + tree | proven live |
| 76 | Colour tile lift is abrupt | The lift is missing from the tile's transition list, so it snaps. Add it at 0.25s, the draft's timing. The lift follows S1, so the tiles move 3px where the draft moves 2px (your "consistent lift" rule). | framework repair | proven |
| 77 | Chosen colour frame 2px vs 1px | Selected-tile border width setting | framework new + tree | proven |
| 81, N29 | Close button has a grey circle | See Help 123 | | |
| 83 | "Add my prescription" text 6px further in | button side padding 22px | tree | proven |
| 87 | Breadcrumb | Show the product name as the last crumb; the current crumb follows the weight setting (400). See answers. | tree + framework repair | proven |
| 88 | Stock line bold | New stock-text weight setting, set to 400 | framework new + tree | proven |
| 89 | Price on the Add to bag button bold | The button's price text follows the button weight | framework repair | proven |
| 90, N36B | "from +£59" grey on the black button | The note follows the button's text colour (white) | framework repair | proven |
| 91 | "In stock" missing in the Details tab | Fall back to "In stock" / "Out of stock" when the stock is not tracked | framework repair | proven |
| 93 | Red basket notice instead of the draft's toast | Item 18 | | |
| 94 | Photo does not zoom and brighten on hover | Gallery photo joins the shared hover zoom | framework new + tree | proven |
| 95 | Several spec rows empty (Style, Frame type, Material, Hinge, Nose pads) | Fill the product data. The 4-column layout is correct, as you said. | content | proven |
| N28 | Size pop-up WhatsApp card text wrong | S4 | | |
| N30 | Small box beside the bridge size | Plain "56 · 17 · 145" everywhere (your choice): size buttons, size guide and the sizing note | content + tree | proven |
| N31 | Reviews panel when there are none | S7; the Google rating moves to the header top bar (D7, Header line D7) | | |
| N32 | Accordion A-F | S5 | | |
| N33A | Brand name typed at the top | S9: the brand logo above the product name, linking to the brand page (D8) | framework new + tree | proven |
| N33B | Save shown on the photo and beside the price | Turn off the photo tag | tree | proven |
| N34 | ".00" shown | S8 | | |
| N35 | Size letter not centred | Centre the text inside each size button | framework repair | proven |
| N36A | Grey measurements on the selected (black) size button | Full strength on the selected button; muted only when not selected | framework repair | proven |
| N36C | White "add to bag" button changes ground on hover | New add-to-bag hover ground setting, set to white; lift per S1 | framework new + tree | proven |
| N36D | WhatsApp card text | S4 | | |
| N36E, N36F | "Which size am I?" links: no hover; the Sizing-tab copy's underline touches the text | One shared "quiet link" style for both: muted text, 1px line 2px below. Text and line turn black on hover. | framework repair + tree | proven |
| N36S | Sizing tab: no diagram; 3 rows not 4; no description column; no note | Now, with existing blocks: a 4-row table (Lens width, Bridge, Lens height, Temple) with name, value and full description, plus your note under it (its "56▫17 145" written plain, per N30). Lens height needs adding to the product data (the draft's 74% of lens width is a placeholder). Diagram: D1. The interim table shows the default size; following the size chosen in the picker comes with the D1 block. | tree + content (+ D1) | proven |

## Lens pop-up

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 96 | Keyboard focus ring black, draft taupe | Focus rules use the client's focus-ring colour token | framework repair | proven |
| N37 | Steps should move on as soon as you pick an option (except the last) | New mode "advance on pick, keep Continue": picking moves on, Back then Continue returns without re-picking, and each step change is announced to screen readers | framework new + tree | proven |
| N38 | "Skip the lenses" opens an extra step | New setting "skip adds to bag": skip adds the frame straight to the bag using the existing add-to-bag function | framework new + tree | proven |

## Lenses page

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 99 | Heading line spacing | line height 1.02 all sizes | tree | Solve closed (2026-10-03) |
| 100 | Price cards 4px shorter | 4px top margin on each price (page padding does not change card height) | tree | Solve closed (2026-10-03): the margin; the card height closed once the four price cards dropped their stack layout and 6px gap (a flex-column gap stacked on the price's own margins) |
| 101 | Gap under section headings 16px too big | heading bottom margin 0 | tree | Solve closed (2026-10-03) |
| 102 | Step numbers large and bold; text not aligned with its number | numbers 15.5px, weight 500, gaps 16/15px; each step's text aligned to its number's line | tree (check the alignment setting exists) | Solve closed (2026-10-03) |
| 103 | "Choose a frame" text too bold | weight 400 | tree | closed (2026-10-03): weight 400, with the button's draft padding box (0 26px) and 50px height |
| N39 | Content starts too low | S6 (the top spacing is the main fault: it pushes every page down). Side margins: re-measure at 1280, 1366 and 1920 and fix only if they differ. | tree | proven (top); to prove (sides) |
| N40 | Gap above the button too big | Match the draft's gap (same cause as 101: a default heading/text bottom margin) | tree | to prove |
| N41 | "Choose a frame" does not lift | S1 | | |

## About

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 104 | Shop the range hover | S1 (lifts like every button) | | |
| 105 | Heading, credentials and intro spacing | name heading bottom margin 20px | tree | Solve closed (2026-10-03) |
| 106 | Credential cards come out shorter | card headings line height 1.5, bottom margin 6px | tree | Solve closed (2026-10-03) |
| 107 | Columns the wrong widths | grid columns 1.1fr 1fr | tree | closed (2026-10-03): the tree held `1.1fr 0.9fr`; set to `1.1fr 1fr` and the credential column width reads closed on the Solve re-walk |
| 108, 109 | WhatsApp button | S4. Sizing done in the tree (2026-10-03): the home button's icon 20px and gap 11px, no vertical padding, 50px tall (draft); 1px wider than the draft from the 20px icon (draft 19px, your rule 109). Icon colour and the hover grow-and-shadow stay with S4 | tree (done) + S4 | proven |
| N42 | Content starts too low | S6 | | |

## Help

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 110, 122 | Accordion | S5 (also remove the 20px gap that spaces the rows apart) | | |
| 111 | FAQ answers wrap differently | answer width 72ch (the draft's value) | tree | proven |
| 112 | "Call the clinic" grey and height | colour text-muted, line height 1.5, no minimum height | tree | proven |
| 113 | Call / Contact me hover | S1 | | |
| 115 | Size-guide pop-up first sentence lighter | colour text-soft | tree | proven |
| 116 | Size numbers smaller on a phone | 32px on phone | tree | proven |
| 117, 123, 69, 81, N29 | Size pop-up: wider at tablet, no header bar, padding wrong, close button has a grey circle | (1) Close button: transparent ground, square. (2) Header bar as a container in the pop-up's own layout file: title, divider, sticky. Pop-up gets a padding setting (draft: flat 24px; header 20px 24px). (3) Screen-edge gap from a token: 32px each side above phone size, 16px on a phone. | framework repair + framework new + tree | proven |
| 119 | Title line spacing on a phone | line height 1.02 on phone | tree | Solve closed (2026-10-03) |
| 120, 121 | Questions heading and links side by side on a phone; links look plain | Two text-link buttons with the draft's static line 3px below the text (like N19, not the S2 sweep); they then wrap under the heading like the draft | tree | proven |
| N43 | Content starts too low | S6 | | |

## Contact

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 124 | Heading 63px on 3 lines; draft 48px on 2 | 48px (phone 34), line height 1.02, bottom margin 20, text-wrap pretty | tree | Solve closed (2026-10-03) |
| 125 | Gaps under eyebrow and intro | 10px and 28px | tree | Solve closed (2026-10-03) |
| 126, 137 | Column widths; map too narrow | grid 1.1fr 1fr; map container as a stack so the map fills | tree | proven |
| 127, 138 | WhatsApp button | S4 | | |
| 128 | Details stay 2 columns on a phone | desktop 2, tablet 2 (your choice: live looks better), phone 1, gap 24 | tree | done (2026-10-04): the grid's desktop-only `repeat(2, …)` columns applied at every width over `columns.mobile: 1`; a phone value `minmax(0, 1fr)` added, and the details stack on a phone |
| 129 | Label too close to its value | detail cell gap 14px | tree | Solve closed (2026-10-03) |
| 130 | Hours | Same as footer 38 | | |
| 131 | Phone/email hover | S3 (mirrors the page's other links) | | |
| 133 | Form heading sits high | line height 1.5 | tree | Solve closed (2026-10-03) |
| 134 | Social cards compact | card row as a 2-column grid | tree | proven |
| 135 | Send button full width on a phone | The form's narrow-width stretch becomes switchable | framework new + tree | proven |
| 136 | Intro wraps one word early | text-wrap pretty | tree | Solve closed (2026-10-03) |
| 139 | Phone/email fade | S3 | | |
| 140 | Address on one line | Same as footer 36 | | |
| N44 | Content starts too low | S6 | | |
| N45 + 142-145 | Contact form | (1) The form gets its own full-width row: one main column, not half the page. (2) Repair: fields without a visible label still get the floating-label space and invisible placeholders; that rule should apply only when a label exists. This also removes the 24px dead gap. (3) New: one "field style" setting group (ground, border colour, corner radius, minimum height, padding, text size, placeholder colour, gap between rows, button alignment). Set to the draft: white fields, square corners, 52px tall, 14px sides, 15px text, 10px gaps, button on the left. | tree + framework repair + framework new | proven in code |

## Checkout

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 147 | Title 63px vs 48px | page-title size token at 48px | client token + tree | proven |
| 148 | Sections do not fade up | checkout entrance from tokens | framework new | proven |
| 149 | "Place Order" vs "PAY NOW" with the price on the right | Label "Pay now" and the price-on-button style. The checkout is the shared theme part, so Eye Care's wording needs a per-site copy of that part: WordPress saves a Site Editor edit of a part per site. Build it from a new checkout layout file if the page builder can build parts; check that first. | tree + framework repair | to prove (per-site part) |
| 150 | Secure-payment note missing | Same per-site checkout part as 149, holding Eye Care's note | tree | to prove (per-site part) |
| 151 | Delivery option wording | shipping method titles and descriptions | content | proven |
| 152 | Coupon, order note and terms | All three stay on. Confirm each can be switched off without code: order notes is a checkout block setting, coupons a WooCommerce setting, terms an inner block in the shared part. | none | to prove (switches) |
| 153 | Extra fields (country, flat, phone, billing, guest line) | Keep them (your reading) | none | closed |
| 154 | Checkout looks like default WooCommerce | Bespoke redesign to the draft, Eye Care only. The shared checkout stylesheet reads tokens (heading size, case and tracking; field look; summary card), so every client benefits. The Eye Care look goes in Eye Care's own token file, the only client styling channel that deploys: numbered small uppercase step headings, white fields, a flat summary card, a 1200px column, delivery cards. A prescription step and an express-pay row need the planned plugin work. | framework repair + client | proven |
| 155 | Order summary twice on a phone | One summary, below the form (draft): hide WooCommerce's collapsed top summary on phones | framework repair | to prove (selector) |

## Confirmation

| Ref | What is wrong | Fix | Type | Status |
|---|---|---|---|---|
| 156 | Draft: tick, "Thank you", short message, "Back to the shop", centred; live: full order table | Build it in the shared confirmation part (tick icon, heading, button), with the wording per client. The order table is left out, as the draft; the email carries the details. | framework repair + content | proven |
| 157 | Billing box alone in the right half | The grid collapses to one column when the shipping box is empty | framework repair | proven |

## Content not tied to one screen

| Ref | What | Type |
|---|---|---|
| 159 | No photo of Fatima unless she asks; a clinic photo for Home is still wanted | content |
| 160 | Keep the pre-filled WhatsApp message (decided) | closed |
| 161 | Brand links go to brand pages, each with a short unique intro (D9); filtered shop links point to them | content + tree |
| 162 | Keep the contact form's empty-submit messages (decided) | closed |

## Computed route findings (Spec 47 stage 3)

Calibration (2026-10-03) measured, on eye-care-test's private calibration page, what each setting of the 44 SGS blocks these layouts use actually paints. It also flags settings that change nothing ("dead") and settings that reach only some screen widths. Each is a lead to prove before it becomes a fix: many dead settings are fixture artefacts (a border style with no border width, burger settings on a menu that never collapses on a plain page). The per-block lists are in `scripts/computed-route/cache/<block>.json` (`dead`, `oneWidth`, `untestedStates`).

| Ref | Finding | Evidence | Status |
|---|---|---|---|
| CR1 | Header rows and footer rows: the per-device gap and content width reach phone and desktop but not tablet | Calibration markers on `sgs/site-header-row` and `sgs/site-footer-row`: 375 and 1440 move, 768 does not, identically on both blocks (likely shared code) | to prove |
| CR2 | A header's scrolled background and text colours show no change | `site-header/render.php`: the scroll script that adds `is-header-scrolled` is switched on only by transparent, shrink, hide, a scrolled shadow or section ink, never by these two colours. Calibration also saw no change with shrink on, so a second cause remains | to prove |
| CR3 | Accordion header colour, background and weight settings change nothing | Calibration of `sgs/accordion` (headerColour, headerBackground, headerFontWeight and their hover/open versions dead); matches S5's "hardcoded size and colour" | to prove, with S5 |
| CR4 | Large dead sets to triage | `nav-bar-menu` 77, `product-card` 56, `cart` 50, `mega-panel` 30, `nav-drawer` 28, `icon-list` 28 dead settings, mostly states the calibration page cannot show (collapsed menus, closed drawers, empty carts) | to prove |
| CR6 | Setting one side of a padding or margin box sets the other three to 0, wiping the block's own default (the About WhatsApp button lost its 24px sides when only the top was set) | `includes/helpers-box.php::sgs_box_object_shorthand` prints `0` for every unset side; measured live on About, 2026-10-03 (padding-left/right 24px → 0px). Reaches every block that uses the helper. Solve now writes the other sides at their default, so it no longer trips on it | proven |
| CR5 | Not calibrated | `brand-strip`: its calibration page (live product-brands source in every instance) times out loading; needs a manual-logo fixture or a smaller chunk. `heading` shrunk size and `nav-drawer` hover settings need a header or an open drawer | open |
| CR7 | Every box-shaped corner-radius setting read as dead in calibration, and Solve would have written radii the page ignores | `includes/helpers-box.php::sgs_border_radius_tiers` reads only `topLeft`, `topRight`, `bottomLeft`, `bottomRight` inside `{desktop, tablet, mobile}`; calibration and `lib/resolve.mjs` used `top`, `right`, `bottom`, `left`. Fixed in the route (4ea7e489f); 54 of the 55 affected blocks (26 sandybrown, 29 eye-care-test) re-calibrated and now map it (accordion-item still reads dead) | proven, fixed |
| CR8 | `sgs/decorative-image` ignores the editor's "Additional CSS class(es)" field | Its `render.php` never calls `get_block_wrapper_attributes()` and never reads `className`; both output paths build `class` from the block's own id. Calibration cannot find an instance, so the block is uncalibrated until it is repaired | proven from code |
| CR9 | More per-device settings that skip one width (CR1's pattern) | Calibration on sandybrown: `gallery` gap and content width and `mega-aside` aside gap reach 375 and 1440, not 768; `notice-banner` padding and margin boxes reach 375 and 768, not 1440; `form-field-tiles` grid columns reach 768 and 1440, not 375 | to prove, with CR1 |
| CR10 | Aspect-ratio settings are never measured | 7 blocks have an `aspect-ratio` setting; neither the walker's property list nor calibration's (`lib/calibrate.mjs::READ_PROPS`, from the walker) reads `aspect-ratio`, so Solve can never see or write one | open (route) |
| CR11 | A border style alone reads as dead on about 50 blocks | The style prints only with a border width, and calibration changes one setting at a time. Calibration needs a paired width marker before border style can be mapped | open (route) |
| CR12 | The dark-mode toggle renders nothing for every current client | `theme-toggle/render.php` returns early without a derived dark palette (`settings.custom.dark`); no `sites/*/theme-snapshot.json` has one | open |
| CR13 | `sgs/form-field-hidden`'s block.json example uses `name` and `value`, which the block does not have (`fieldName`, `defaultValue`) | Offline fixture check against block.json, 2026-10-03 | fixed (7d465cff2); deploys with the next sandybrown deploy |
| CR14 | Solve cannot write a setting on an element no walker pair measures, so writes coupled to it are reverted as wrong | About's WhatsApp button (2026-10-03): the draft values for gap (11px) and vertical padding (0) were written and reverted, because the button's width moved 153px→160px against 155px. The cause was the icon (live 24px, draft 19px: label x 52 vs 54, label width 77.28px both sides); `whatsapp-cta.json::settings.iconSize` maps it, but the svg is not a walker pair, so no row asked for it. Written by hand in the tree, then closed on the re-walk | proven; route fix open (measure a pair's child media, or batch a setting's calibrated side effects) |

## Walker improvements (why some of your points were missed)

The comparison tool missed several things you found. Each gap becomes a check, with a planted fault to prove it catches it:
- **Overlays and tints drawn as pseudo-elements** (N18, N21): sample painted brightness at fixed points over images.
- **Every surface walked at 1920 as well** (N5, N20).
- **Hover on every interactive element**, not only configured pairs (N1, N23).
- **"Is this text inside a link" compared both sides** (N2A).
- **Line count sampled while the header shrinks and grows** (N2B).
- **Clicked and focused states**, not only hover (N6).
- **Shopping flows as scripted end-to-end tests**, not comparisons: two products in the bag, a second pair, choosing then clearing a filter (N11, N25).

## Closed (checked; no change)

Each was proposed, then dropped by you or by the evidence. Kept so you can compare lists.
- 5 top bar icons: keep live (you).
- 10 brands headings line box: not visible (you).
- 16 bag drawer fade: ours is better (you).
- 21 duplicate of 1.
- 22 bag Close reachable by keyboard: you tested it, it works.
- 24 thumbnail frame: not in the draft.
- 31 "arriving soon" grey: ignore for now (you).
- 56 reviews header gaps: not visible (you).
- 63 "Measured across one lens" note: ignore (you).
- 66 price ceiling label: the slider shows it (you).
- 80 RRP colour: leave it (you).
- 84 Tab and the size options: correct keyboard pattern, tested live (see answers).
- 85 Klarna line: no (you).
- 92: replaced by N36S.
- 97 pop-up "?" focus fill: matches, you checked.
- 98 pop-up corners: square on both (you).
- 114 pop-up WhatsApp sentence: no such element (you).
- 118 Help keyboard focus: you tested it, it works.
- 132, 141 map strip and Directions link: the real Google Map replaces the sketch.
- From the first version's dropped list (unchanged): about WhatsApp label hover; checkout input clipped; footer Google Business link; bag "Ask me anything" button; bag ground colour; mega underline fade; mega panel fade; mega card hover fade; drawer slide; header phone width; bag pill hover text; Help panel in scrolled state; brand names at 75%; style-tile zoom speed; "Clear all" underline; accordion answer fade; product WhatsApp text link; "Which size am I?" underline (now N36E/F); lens "Skip the lenses" underline.
