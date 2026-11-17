# Mama's Munches: Bean's issue register, round two (2026-11-17 evening)

What Bean found on `mamas-test` after round one's fixes shipped: some new, some round-one fixes that hold at 375, 768 and 1440 and fail at other widths. Bean's own words, one item per line. Each ID carries on from round one's numbers in `issue-register.md` (beside this file), so an ID names one item across both files and in `register-findings.md` and `fix-catalogue.md`, where status is kept. "Live" is `mamas-test`; "draft" is the Claude Design draft in `sites/mamas-munches-redesign/handoff/`.

## Header

- **Header 10:** There's a point when the sticky header is about to activate where it bugs out like crazy switching between the main header and the shrunk header.
- **Header 11:** The yellow still isn't clear on the light pink, might need to use the darker pink shade. (Follows Header 9: the page scrollbar's yellow thumb on its light pink track.)
- **Header 12:** On 1023px the main header goes super huge because the middle-aligned mobile logo is added and it's huge and the left-aligned desktop logo is still there. (Bean's screenshot: both logos show at once, the phone logo at several hundred pixels wide over the menu.)

## Footer

- **Footer 10:** Above 1024px the attribution link's hover underline gets thinner after the sweep animation completes.
- **Footer 11:** The gallery images on 766px and below have the top and bottom getting cut off.

## Basket drawer

- **Basket drawer 2:** Drawer header has more padding around your basket and close button.
- **Basket drawer 3:** The free delivery meter is supposed to have a white bg and dashed line border below it.
- **Basket drawer 4:** Qty is not supposed to be written and the input box for the number is supposed to be an input box with a minus and plus button on either side (this box is already built on cart page). And, the remove button is supposed to have the underline closer to the bottom of the text and it's supposed to be on the right end of the same line as the quantity input box.
- **Basket drawer 5:** Each item is supposed to have a separator line between it and the item below.
- **Basket drawer 6:** The draft didn't have the label of the product variation before the choice e.g. base, chip, flavour
- **Basket drawer 7:** There's no option to mark it as a gift.
- **Basket drawer 8:** When the basket is empty, it's supposed to have a message in the centre with the logo, then 'Your Basket is empty', then a message to say if they're new to try the taster trio and then a button to add it to basket and under that to browse the shop. (Bean's screenshot of the draft: round logo, "Your basket is empty", "New to Zookies? The Taster Trio is 3 cookies for £5, postage included.", a pink button "Add a Taster Trio · £5", an underlined "Browse the shop".)

## Basket page

- **Basket page 1:** There is no padding on each item card so the product image touches the left border and the price touches the right border under 1024px
- **Basket page 2:** Under 1024px the bottom border of each item loses the solid black line.
- **Basket page 3:** The fontstyle of the number in the item quantity box is wrong and the plus and minus symbols should be black.
- **Basket page 4:** The summary block is way too different the draft even though I do recognise that there needs to be some difference due to the addition of coupons and gift card. But gift card section could be collapsible too, the apply button on gift cards is totally wrong styles, it's got the wrong heading, 'CART TOTALS' instead of 'SUMMARY' and that heading is missing under 1024px.
- **Basket page 5:** This is a bigger issuee than just the cart page but the cart I was testing with was over the free shipping minimum and the cart still added a shipping price - The default should always be the lower priced delivery option especially if it's free.

## Sign-in

- **Sign-in 6:** The email me tick is blue coloured, doesn't fit site colours.
- **Sign-in 7:** The vertical spacing above and below email me lne is huge.
- **Sign-in 8:** Current/selected option between sign-in and create account should not have a hover lift effect.
- **Sign-in 9:** When switching between the 2 options, can we have the box animate it's extension/shrinking height instead of an instant switch.
- **Sign-in 10:** The account button when not signed in opens a useless my account page that just leaves links to the sign-in page. Needs to redirect, that useless page can just get deleted or we get rid of the sign-in url and replace that unsigned-in my account design that leaves links to sign-in page with the actual sign-in page itself.
- **Sign-in 11:** Remove bake date wording.

## Contact

- **Contact 12:** Instead of wrapping letters to the next line, when the email card gets too small for the full length of the email to fit, the email just extends out of the box on live.
- **Contact 13:** The input boxes of the form have only the top border line be the full proper black border, the rest are very thin.
- **Contact 14:** Add an arrow symbol to the end of the 'More answers on the Help page' button so it's clear that it's clickable since our live setup has the underline show up after hovering on it.

## Help

- **Help 10:** Can we have the filter options on screen widths that can't fit all of them wrap to another row instead of getting a horizontal scroll-bar. (Shop page already does this)
- **Help 11:** On 1022px and below - On the 3 options in the delivery card, the price bit which should be left aligned gets messed up on the 2nd and 3rd option with them getting an extra push inwards.
- **Help 12:** Vegan base paragraph on allergens and ingredients section has a hover lift effect on it which should be removed.
- **Help 13:** You've turned terms and conditions and the privacy bits into regular buttons, I prefer the structure of the draft, can you adapt that layout to fit the current setup where we have separate pages for those and they are just really nicely designed buttons that fit the aesthetic of the page.

## Gifts

- **Gifts 13:** The 'Gift for' heading is tilted on live.
- **Gifts 14:** The responsiveness points in the live site and draft are different. Look at all screen widths and match the draft.
- **Gifts 15:** There is a really thin cream strip under the header above the hero section.

## Shop

- **Shop 15:** The padding on the inside of the content section of each product card is too high. Very visible how the live heading is lower and the text starts further inwards/to the right of the draft.
- **Shop 16:** Similar issue to the gifts page, the responsiveness of the cards doesn't match the draft at all, need to check where exactly the draft switches how many cards per row and apply that.
- **Shop 17:** The sorting picker is messed up. THe text and chevron pointing down are top aligned instead of sitting in the vertical centre. Also, it says 'Default sorting' on live when it should say 'Default' like the draft. Lastly, the top corners of the picker morph and look really weird when the dropdown has been opened and the right side still has the thicker border/shadow effect on it which looks weird and I think is the reason the right corner of the picker doesn't align with the top right of the dropdown.
- **Shop 18:** This is a global issue wherever on the site a product card exists, the whole thing should be clickable, linking to the product page. But on the content part of the product cards it isn't clickable, the image and the button are clickable, but not that area.

## Home

- **Home 24:** The spinning gold star drifts during its animation and then at the end of what I assume is each cycle it teleports back to its starting position since it drifts away. The draft's version doesn't move position at all.
- **Home 25:** The trust bar under the hero needs to switch to have smaller gutters or switch to scrolling ticker at a higher px because the first item's text wraps to 2 lines for a bit before it switches.
- **Home 26:** The 2 cards in the 'Who are we baking for today?' look awful between 768px and 1024 px. It needs to remove the huge vertical space above and below the text+button in the content half of the cards.
- **Home 27:** Cookie Builder: Needs to be some vertical padding between the How Many options and the add to basket button.
- **Home 28:** Cookie Builder: Steps need renumbering because the how many section is now last visually.
- **Home 29:** Cookie Builder: The undo button needs to be attached to the bottom of the flavours options.
- **Home 30:** 'A gift she'll actually eat' section - Remove the horizontal slider bar, it doesn't visually match the rest and overlaps with stuff.
- **Home 31:** 'A gift she'll actually eat' section - Similar issue to gift and shop pages with the breakpoints for tiling and when it switches to a slider.
- **Home 32:** In the testimonial section, the bit with the overall trustpilot score that links to the trustpilot profile - I'd like it to get a nice looking hover animation.
- **Home 33:** Testimonial slider's auto sliding to the next card seems to stop working after I manually switch to another card.
- **Home 34:** Hovering on/touching the trust bar under the hero doesn't pause is temporarily like the other trust bars in the header and footer. Additionally, are you able to make the colours of the icon in the trust bar items change colour when that item is hovered on?
- **Home 35:** The 2 links on the homepage hero under the buttons have the button up and to the left lift on them when hovered, it just doesn't look right on plain text. Please give it better hover effects that are more consistent with the rest of the site.

## Product page: Zookies

- **Product 16:** The testimonial card slider on 766px and below - The arrows overlap with the cards, needs some padding below cards.
- **Product 17:** The sticky bottom add to basket button gets covered by everything on page even though it should be the top layer.
- **Product 18:** Th button in the sticky bar is huge filling most of the screen's width when it should be quite small, it doesn't seem to even have any padding on it and covers the price.
- **Product 19:** You might also like product cards still have bits that don't match the draft's styles and the rest of the site's styles e.g. label and button being pill shaped.
- **Product 20:** The draft has an issue where when it has less products per row it doesn't show any slider or way to show all of the products originally in the section, we shouldn't copy that and should instead give it the same sort of slider functionality we've set up elsewhere on the site.
- **Product 21:** The wording on the c (Bean's note stops here; asked on 2026-11-17 for the rest.)

## Account

- **Account 3:** Bean had not reviewed the rebuilt account area at the time of his round-two list ("Wasn't ready for review at point of compaction and handoff").

## Checkout

- **Checkout 2:** Express Checkout, sign in and 'Add a note to your order' don't match the site font styles and sizes and colours
- **Checkout 3:** The naming, numbering and separation of the sections doesn't make much sense now. Can you look at merging some sections, changing the names and numbering them properly.
- **Checkout 4:** The express checkout sections borders and background colour should match the rest of the sections in the checkout. It looks a little odd like this.
- **Checkout 5:** There are thin box lines wrapped around the card payment options and delivery options, also theres no gap between the card payment options and delivery options.
- **Checkout 6:** The points I raised about the summary section weren't addressed. It just has several things that just dont match the draft and don't fit with the site or even the rest of the page's aesthetic too. The gift card bit even doesn't match the rest of the summary card (should work and look the same as coupon bit) and the coupon code box text sits at the bottom instead of the middle, the apply button should be the same height as the input box too. Theres also this really basic looking table drawn inside the summary card too. and the name of the card is wrong.
- **Checkout 7:** I really dislike the greying text you're using around this page.
- **Checkout 8:** On tablet/mobile the top of the express checkout words are cut off and there's no gap between summary card and pay button
- **Checkout 9:** Country/Region - She only sells to UK so is the dropdown necessary? Also, the arrow for the dropdown is at the top of the box instead of the centre.
- **Checkout 10:** The focus/selected border colour for the input boxes is just a darker/thicker black than the regular border, why don't we make it the brand pink instead?

## Order confirmation

- **Order confirmation 2:** Bean had not reviewed the rebuilt page at the time of his round-two list ("Same status as account page to my knowledge").
