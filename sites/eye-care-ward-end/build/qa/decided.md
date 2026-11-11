# Eye Care: differences Bean has already decided (NOT findings)

The one list every Eye Care review, walk triage and round proposal reads before reporting a difference. Sources: `.claude/plans/2026-10-02-eye-care-fix-register.md` (decisions, accepted and dropped lists, closed rows as expected live values) and `build/qa/divergences.json` (the walker's machine copy). If live differs from the draft in one of these ways, it is correct: do not report it. Each round's new decisions are added here in the same commit as the register.

Site-wide
- Header: a Google rating badge (G, 4.7, stars) as a pill beside the menu (R7-11, replacing D7's position); compact (one star) below 1400px, hidden below 1290px.
- Header: no "Glasses SOON" menu item anywhere (header, phone menu, footer). (R1-6, N48)
- Header: the account icon is a person icon in a 44px circle; the phone Bag is an outlined round icon with the count on its corner. (R1-7, R1-8)
- Brands show as LOGO images (not serif text) on product cards, the product page (above the name) and the bag. (S9, D8)
- Every button lifts 3px on hover over 0.25s, including ones the draft lifts 2px or darkens. (S1)
- Text links and menu words stay black on hover with an underline that sweeps in; never the draft's taupe hover colour. (S2)
- Footer: column headings 13.5px uppercase in the text colour (not small taupe); address and hours in the text colour; no "Glasses — arriving soon" line; a "Website by Small Giants Studio" credit after Terms; Privacy/Terms black. Footer brand is the logo image. (rows 29, 30, 46, N12, N47, N48)
- The Google reviews panel follows Google's own look (colours, arrows, sizes), not the draft. (N17c)
- The site's own WhatsApp number is the full number (07960 597847), not the draft's short one. (D-99)
- Prices hide ".00". (S8)

Product and cards
- No star rating line and no "No reviews yet" on cards or the product page when a product has no reviews; no reviews section on a product with none. (S7)
- No "Save £X off RRP" tag on the product photo; the saving shows once, beside the price. (N33B)
- No Klarna / Apple Pay line under the buttons. (85)
- No "Colourway shots are stand-ins…" note (a draft note).
- Breadcrumb ends with the product name (regular weight, not a link). (87)
- Stock line regular weight. (88)
- Sizes read "56 · 17 · 145" (no box symbol). (N30)
- Product data differs from the draft's demo catalogue (names, prices, number of sizes/colours, which products exist): not a finding. Photography placeholders ("Photo to come") are not findings.
- Thumbnails show the product's real gallery images (number varies).

Contact and pages
- A real embedded Google Map replaces the draft's sketch map, with no "Directions" caption strip. (D-16, 132, 141)
- The contact page's phone and email links have 44px tap areas. (D-17..D-33)
- Contact form empty-submit error messages and red rings are kept. (D-52..D-59)
- Live best-sellers list (order follows sales). (D6)
- Hero overlay: live's lighter overlay is kept. (N18)
- Small stagger timing differences (50–60ms). (D2)

Decided or fixed in rounds 1 and 2 (2026-11-02), do not re-raise
- Header trust bar scrolls as a marquee on tablet and phone (Bean); on desktop the claims spread edge to edge (space-between, 24px sides).
- Header account: person icon in a 44px circle linking /my-account/; phone bag is an outlined round icon with a corner count.
- Content sits 52px from the edge at 1440 and 768, 20px at 375; About content at x 222 at 1440 (draft).
- Footer bottom bar: copyright left, Privacy · Terms centre, "Website by Small Giants Studio" right (stacked on phones); the credit hovers teal #1F7A7A (Bean), not the draft colour. No trademark sentence.
- Contact page: centred; see round 5 for the form position. The Send button sits left at its natural width.
- The "Similar shapes" card width on phones is fine (Bean).
- Product cards have a 1px #E4DFD6 outline; the "Photo to come" panel is the stage grey. Brand logos on cards are capped at 18px tall.
- The home "shapes" tiles have no grey band behind them.
- Shop pagination is now a "Load more" button (built); with 16 products and a batch of 24 the shop shows every product and no button. Do not report it.
- Capture artefacts: the full-page capture loses the home hero photo and the lazy contact map; both render for real visitors. Do not report them from the full-page images.

Fixed in round 3 (2026-11-03), live values to expect (report only if live now differs from these)
- Selected size tile label white on black; colour captions 10.5px #4A453E.
- Shape grid tiles on home: no grey bands between tiles.
- Google reviews header on one row at 768 and 1440; its buttons wrap at 375 as in the draft.
- Brand strip: 1px #EFEAE2 dividers between logos, 44px tall.
- Help: open answers left-aligned under their question; FAQ row pitch 71px; help cards label-to-body 10px, grid ground #E6E1DA fills the empty 768 cell.
- Shop and home phone cards: price stacked above the RRP on mobile.
- Buybox selected colour name #6B655E.
- Shop filter chevrons about 5.4px with a 1px stroke; sort select 152px at 13.5px.
- Accordion "+" stroke 1.5; product Good-to-know rows 65px; assurance list 14px tick-to-text, rows 58px.
- Product brand logo 91x15 with multiply blend (no white box); card brand logos 72px wide max on phones.
- Product description 16.5px/1.5 #4A453E, list items 15.5px; product lower columns 1.1fr/1fr.
- "See everything" / "All 12 styles" carry a 1px black underline 3px below.
- Contact textarea 120px; "Photo to come" label #A39C90.
- Headings on dark bands #FAF8F5 (the heading-on-dark colour).
- Buttons using the primary preset are UPPERCASE with 1.3px letter-spacing.
- Measured equal in round 3 (do not re-raise): the lenses step-numeral colour (#6F6152 both sides) and "from +£59" (the draft has the plus).

Known low leftovers already on the round 4 list (confirm or measure, no need to re-describe)
- Selected size pill label 14px against the draft's 13.5px.
- Card-grid per-tile overlay feeding the section's dark tone: check no text outside the shape tiles takes on-dark colours.
- Page weight (separate plan): do not report file sizes.

Decided or fixed in round 4 (2026-11-03), live values to expect (report only if live now differs)
- The Google rating badge sits LEFT of the logo (Bean), full size from 1440 down to 768, hidden on phones. The header phone number hides below 1160px (by design).
- Phone header at 375: burger 8-46, logo 87-257, account 265-309, bag 315-359 (draft boxes).
- Trust bar labels 0.5px letter-spacing, 15px icons.
- Lens pop-up: closes after adding; no Continue on unanswered tap steps; EC logo in its header; finish photos fill the tile; summary "Size M".
- The "Added" toast is a dark square pill with an underlined "View bag" AND a close button (the close button is Bean's choice).
- Bag lines show "Colour: Ivory" and "Tinted to match" (Bean: kept); a frame-only line has an "Add my prescription" link; the free-delivery text stays BOLD (Bean).
- Shop price filter keeps its two-handle range (Bean: an upgrade). Curly apostrophes kept (Bean). Product tabs' unselected colour stays #5E584F (Bean, contrast). Footer social icons stay 44px (Bean).
- Similar shapes grid: 5 cards across at 1440, 2 at 768 and 375.
- Product: saving chip 12.5px/400; colour tiles 1px border; size-guide link #6B655E with #C9C2B8 underline; size pill 13.5px; Add my prescription 56px; WhatsApp card title 14.5px #12301E; breadcrumb #6B655E.
- Help: link buttons weight 400; open answers 1.5 line height with 22px below; FAQ header gap 20px; phone line #5E584F.
- Home hero buttons 12px apart on phones. Footer opening hours 13px.
- The floating WhatsApp button steps aside (hides) while an inline WhatsApp card is on screen (D5, by design).

Live since the round 4 deploy (expect these): the bag line separator ("Colour Ivory · Size M"), the floating WhatsApp icon gap (10px), the product description's list styling (15.5px #5E584F, 11px apart), and WordPress fluid type switched off (text holds its stated sizes at 375).

Fixed in round 5 (2026-11-03, live at 301cee05e). Expect these values and report only if live now differs:
- Trust bar 40.8px tall (labels line-height 1.5); its four icons are the draft's own drawings, 15px, tan.
- Footer copyright #77716A.
- Phone menu: the bottom block (rating, phone, social tiles) runs full width (327px at x24 at 375, 720 at 768); the two social tiles match the footer's (brand colours, normal and hover); the Google tile is removed (round 11); secondary links 36.5px apart; close glyph 20px inside a 44px tap area.
- Contact: the form is its own full-width row below the details and map at every width (Bean, round 11).
- Product: code line "GG1566S · 001" #6B655E; "Need advice?" card body 13px #2F5C3F.
- Buy box: stock line to Colour 47px; labels to tiles 31 / 29.5px; colour tiles to Size 24px; size tiles to "Add my prescription" 28px; the two buttons 10px apart; struck RRP #77716A at full opacity; size letters weight 400 with an 11px measurement line; colour tile ground #F3F0EB.
- Lens pop-up: the prescription step's bottom bar is 85px from 600px wide (Back 17px from its top); "Add to bag £348" 187px wide.
- Bag: the line photo sits inside its pale tile with a 4px frame; footer 191.5px (Subtotal to Checkout 71.8px).

Accepted in round 5 (Bean, live is the better version). Do not report:
- The "POLARISED" tag wraps under the name on phone cards (the draft's one line runs past the card).
- The lens pop-up Close and skip row stay 44px tall (draft 42 and 20).
- The bag close keeps its 44px tap area. The shop's Gender buttons stay 44px (draft 42).

Dropped in round 5. Do not report:
- "from +£59" stays white on the black button (by decision).
- Footer link boxes are inline (invisible).
- The trust bar icon colour (the same tan as the draft).
- The footer heading gap (a decided heading size).
- The floating WhatsApp size (163.5x52 / 54x52 as intended).
- The contact hours gap (about 1px).
- The Price filter height (the accepted two-handle range).
- The bag title position (within 1px).
- One size and no Klarna line (decided).

How to judge fixes (Bean, 2026-11-03): a one-off look on the buy box, bag or lens pop-up is fixed in that block's own Custom CSS, so it is still a valid finding. Just report the measured difference.

Closed in round 6 (expected live values; report only if live now differs):
- Toast "Added to bag": a 292px one-row pill at 375, 768 and 1440; it closes when the bag opens (an error toast stays).
- Lens "How thin": nothing pre-selected; Standard carries the tag and a 1px rgb(20,20,20) frame; the footer shows Back only; no "Standard · included" summary row.
- Phone header bag: icon 18px inside a 44px circle (icon x328 y65.8 at 375); count badge 20px on the circle's corner (x344 y50.8).
- Product: brand logo below the thumbnails 28px gap at 375 and 33.7 at 768; desktop unchanged.
- Product main photo box: background rgb(243,240,235), 1px solid rgb(230,225,218) border, radius 0.
- "You save" chip radius 0. Price row gaps 14/14; struck RRP 15px; stock line 14px.
- Buy buttons: add-to-cart and "Add my prescription" both 22px side padding.
- Help: Size guide and Contact me bottoms aligned at 1440 and 768 (they wrap at 375 as the draft does); "Still not answered?" heading to body 42px.
- Contact: message box to the Send button 20px at every width.
- Phone menu Google tile: an outlined G (fill none, stroke text colour, 18px).
- Floating WhatsApp label colour rgb(11,43,23).
- Editor: forms and checkboxes open without errors.

Dropped in round 6. Do not report:
- The phone menu's rating badge in its top row (decided, D7).
- The header logo 2px taller (the draft squashes its box).
- The header phone link box 5px narrower (invisible; icon and number in place).
- The contact link cards (76.3px in both).

How fixes are judged (Bean, 2026-11-03, replaces the note above): this site's own design (brand logos, the lens tagged-option frame) goes in the block's Custom CSS; an ordinary part beside parts with full controls gets a setting; a default wrong for every site is a framework fix. Either way, report the measured difference.


Decided or accepted in rounds 7 to 9 (2026-11-04 to 06). Do not report:
- Hover rule S1 restated (R7): a white button lifts only, a black one lifts with a lighter ground, the green WhatsApp lifts only; nothing darkens (N36C). The draft's WhatsApp card tint and the outline "as they are" fill were dropped.
- The lens summary greys pass contrast (6.2:1; draft 3.3:1). The colour-dot focus ring is dark so it shows on gold and tan dots. Every input, select and textarea takes one inset 2px focus outline with no border change (Bean, round 13).
- The lens summary "Tinted to match" label at 375 (a draft glitch that wraps and clips).
- Shop brand filter rows and search box 44px; the bag Remove's 24px row; the lens skip row 44px; the Gender buttons' focus ring inset. (R8, live is better)
- Sign-in and checkout: the show-password eye and the checkout floating labels stay; the account's Subscriptions, Downloads and Payment methods tabs are hidden; Stripe runs in test mode with Apple Pay, Google Pay, Card and Klarna (Amazon Pay and Link off). (R9, Bean)
- The local pickup description shows only once that option is chosen (WooCommerce's own behaviour); the thank-you heading shows the order number only to a viewer WooCommerce lets see the order, otherwise "Thank you." (R9)

Settled in the round 10 wrap-up walk (2026-11-06). Do not report:
- Shop card position: heading-to-first-card gap equals the draft at 1440/768/375; the page sits 2px lower from above the heading (invisible).
- Product page height above the tabs: the draft's star line, colourway note and three sizes (content, per S7 and the product-data rule), not spacing.
- Unselected product tab labels #5E584F (Bean, contrast 6.6:1; draft #8B8478 is 3.5:1), restated 2026-11-06.
- Bag drawer ground: cream behind the items and a white subtotal strip, as the draft. The panel element's own computed background reads white because its ground is painted on `::after`; that reading is not a finding (pixel samples equal the draft).
- Size guide pop-up (round 10, closed): transparent close, sticky title bar with divider, 24px body, 32px from the screen edges from 768px, height 88% of the padded screen. Report only if live differs from these.
- Thank-you page entrances (round 10): tick pop 600ms, heading, note and button rise 600/700/800ms.
- Checkout walker rows for express payment, delivery cards and section headings come from stale finders (round 9's paired review is the comparison); not findings until the checkout config is re-paired.

Decided in round 11 (Bean, 2026-11-09). Do not report:
- Header logo: one combined transparent image (mark and wordmark, 6px apart), 164px wide, 150px on phones, truly centred on phones. This replaces the draft's position and the two-image logo (R4-9).
- The phone menu: no small review pill; big items take no lift, their full-width separator sweeps to black left to right; the review strip's hover border is Google blue; the call button's hover border is the taupe `accent`, with no lift.
- Contact details: phone, email, clinic and hours sit in the same bordered white boxes as Google and Instagram, 14px text, 10px apart; all four hovers are the tight underline, and phone and email keep their 44px tap areas.
- The accordion icon's close spins back with a spring (not in the draft; Bean keeps it).
- The register form's privacy line is one short line with a link.

Decided in round 12 (Bean, 2026-11-09). Do not report:
- The header's side gutters do not change when it turns sticky (reverses the draft).
- The drawer call button's hover border is taupe, the `accent` taupe (closed, Bean, round 13).
- The white line under Four reasons on the home page was a page-load artefact, not a bug.
- A draft's font sizes are copied verbatim, including `vw` clamps (Specs 01, 32, 35A and 48 say so); the hero h1 uses the `hero` size, clamp(42px, 4.4vw, 72px).
- The trust bar is a still row when its badges fit and a ticker only when they do not (`belowBreakpoint: overflow`); it stays still at 1440 and 1920.
- The hero parallax moves the Background part's real image (speed ratio 0.18, page basis); the lens flow fits the screen and shows four columns only from a 2200px container.
- The hero focal points (post 208) and the lens tag and outline (post 463) stay in Custom CSS until Spec 49.

Decided in round 13 (Bean, 2026-11-09 and 2026-11-10). Do not report:
- Input focus is one inset 2px outline drawn inside the border, with no border colour change, on every text input, select and textarea (contact, account, checkout), and on every checkbox, radio and selectable delivery or payment card, on a click as well as a keyboard focus, with no second ring outside (Bean, round 14); buttons and links keep the gap. This replaces "Contact fields turn tan on focus" (R7).
- The drawer call button's hover border is taupe.
- Field labels stay 13px.
- Above the fold, no entrance starts fully invisible: fades start at 1%, clip reveals at 99% and scale-from-zero at a tiny scale. "Above the fold" is the first two content sections, or the count the editor measured when the page was saved.
- The filter drawer keeps its slide-up sheet and adds the draft's group fades (250ms).
- The size pop-up matches the draft: a zoom from .985 to 1 with a 270ms fade and a 250ms backdrop.
- The "Confirm your email" notice is kept.
- The Express Checkout heading is hidden; the wallet buttons and their divider stay.
- Stripe's "Save payment information to my account" checkbox stays at checkout, though the draft has none (Bean, 2026-11-10).
- The "Added to bag" toast follows the draft's life: about 3.3s, paused while hovered or focused (Bean, round 14).
- Collect in Birmingham is WooCommerce's block Local pickup with one location: it asks for a billing address (card payment needs one) and shows "Collect from 644 Washwood Heath Rd…" under the delivery cards (Bean, round 14).
- The express wallet row (Apple Pay, Google Pay and the like) is Stripe's own: which buttons show, their count, size and layout depend on the visitor's browser and device and are not compared with the draft (Bean, round 14).
- The Klarna pay-later line under the payment options is Stripe's own messaging: its font, size and colour are Stripe's, not the draft's 12.5px grey (round 14).
- Form and WooCommerce buttons keep the site button preset's 3px lift on hover and keyboard focus, though the draft's account buttons do not lift (round 13 ruling, restated round 14).
- The thank-you note ("View my orders") shows only to the signed-in owner of the order.
- Prices hide ".00" everywhere except at checkout, where pennies show.
- "Already have an account? Sign in" sits beside the Contact heading on one line, not below the fields.

Decided on 2026-11-11 (Bean). Do not report:
- Stripe's frame text and labels need not match the draft (Stripe's frame is Stripe's).
- The "By providing your card information, you allow ... to charge your card for future payments" line is Stripe's standard wording for a saved card and stays; turning Saved cards off is a business decision that is still open.
- Colour settings are not generalised, and the account post's literal colours stay as they are.
