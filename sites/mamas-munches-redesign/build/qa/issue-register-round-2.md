# Mama's Munches: Bean's issue register, round two (2026-11-17 evening)

What Bean found on `mamas-test` after round one's fixes shipped: some new, some round-one fixes that hold at 375, 768 and 1440 and fail at other widths. Bean's own words, one item per line. Each ID carries on from round one's numbers in `issue-register.md` (beside this file), so an ID names one item across both files and in `register-findings.md` and `fix-catalogue.md`, where status is kept. "Live" is `mamas-test`; "draft" is the Claude Design draft in `sites/mamas-munches-redesign/handoff/`.

## Header

- **Header 10:** There's a point when the sticky header is about to activate where it bugs out like crazy switching between the main header and the shrunk header.
- **Header 11:** The yellow still isn't clear on the light pink, might need to use the darker pink shade. (Follows Header 9: the page scrollbar's yellow thumb on its light pink track.)
- **Header 12:** On 1023px the main header goes super huge because the middle-aligned mobile logo is added and it's huge and the left-aligned desktop logo is still there. (Bean's screenshot: both logos show at once, the phone logo at several hundred pixels wide over the menu.)

## Footer

- **Footer 10:** Above 1024px the attribution link's hover underline gets thinner after the sweep animation completes.
- **Footer 11:** The gallery images on 766px and below have the top and bottom getting cut off.
- **Footer 12:** (Bean's proofing of 2026-11-18.) The underline fix on the attribution link has just made the underline very thin consistently, I liked the thicker/normal underline.

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
- **Basket page 6:** (Added by Bean later the same evening.) The taster trio's free shipping doesn't work, how should that function?
- **Basket page 7:** (Bean's review of round two's fixes, 2026-11-17 late evening.) The summary on the basket page should be used on the checkout page too (although checkout needs to add the items of the purchase in too) so we're not hand fixing 2 identical cards. But still had greyish font and the text for add coupons/gift card, shipping type/name does not match the site at all, it's very small too. Feel like the input boxes and button sizes in the checkout summary card are better on the checkout version (button bg colour should be yellow though) so should adopt that instead of using the basket page's version instead.
- **Basket page 8:** (Bean, 2026-11-17 late evening.) Additionally, the basket page when empty still has the ugly default looking product cards when the whole site's product cards have switched already too.

## Sign-in

- **Sign-in 6:** The email me tick is blue coloured, doesn't fit site colours.
- **Sign-in 7:** The vertical spacing above and below email me lne is huge.
- **Sign-in 8:** Current/selected option between sign-in and create account should not have a hover lift effect.
- **Sign-in 9:** When switching between the 2 options, can we have the box animate it's extension/shrinking height instead of an instant switch.
- **Sign-in 10:** The account button when not signed in opens a useless my account page that just leaves links to the sign-in page. Needs to redirect, that useless page can just get deleted or we get rid of the sign-in url and replace that unsigned-in my account design that leaves links to sign-in page with the actual sign-in page itself.
- **Sign-in 11:** Remove bake date wording.
- **Sign-in 12:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Sign in form's vertical gaps between the input boxes is bigger than the create an account's vertical gaps between the input boxes.
- **Sign-in 13:** (Bean's proofing of 2026-11-18.) Go to the shop hyperlink doesn't have the underline effect on it when hovered.

## Contact

- **Contact 12:** Instead of wrapping letters to the next line, when the email card gets too small for the full length of the email to fit, the email just extends out of the box on live.
- **Contact 13:** The input boxes of the form have only the top border line be the full proper black border, the rest are very thin.
- **Contact 14:** Add an arrow symbol to the end of the 'More answers on the Help page' button so it's clear that it's clickable since our live setup has the underline show up after hovering on it.
- **Contact 15:** (Bean's review of round two's fixes, 2026-11-17 late evening.) The wrapping starts even when there's a huge amount of space in the boxes on desktop, the wrap point leaves a lot of space on the right and the wrapping still applies when the layout changes to stacked mode even though there's again a huge amount of space when it goes under 767px. (The email address in its contact card, after Contact 12's fix.)

## Help

- **Help 10:** Can we have the filter options on screen widths that can't fit all of them wrap to another row instead of getting a horizontal scroll-bar. (Shop page already does this)
- **Help 11:** On 1022px and below - On the 3 options in the delivery card, the price bit which should be left aligned gets messed up on the 2nd and 3rd option with them getting an extra push inwards.
- **Help 12:** Vegan base paragraph on allergens and ingredients section has a hover lift effect on it which should be removed.
- **Help 13:** You've turned terms and conditions and the privacy bits into regular buttons, I prefer the structure of the draft, can you adapt that layout to fit the current setup where we have separate pages for those and they are just really nicely designed buttons that fit the aesthetic of the page.
- **Help 14:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Help all resolved, but found a new issue. The 'Still Stuck' label is a bad colour for the background. Should switch it to the same dark pink as other labels.

## Gifts

- **Gifts 13:** The 'Gift for' heading is tilted on live.
- **Gifts 14:** The responsiveness points in the live site and draft are different. Look at all screen widths and match the draft.
- **Gifts 15:** There is a really thin cream strip under the header above the hero section.
- **Gifts 16:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Gifts all issues resolved but the pick flavours button should be aligned to the bottom, some product cards at lower widths end up with the pick flavours button having a gap underneath it.
- **Gifts 17:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Also, the gap between the products seems like it's gone on the live especially on the 2 card per row range.

## Shop

- **Shop 15:** The padding on the inside of the content section of each product card is too high. Very visible how the live heading is lower and the text starts further inwards/to the right of the draft.
- **Shop 16:** Similar issue to the gifts page, the responsiveness of the cards doesn't match the draft at all, need to check where exactly the draft switches how many cards per row and apply that.
- **Shop 17:** The sorting picker is messed up. THe text and chevron pointing down are top aligned instead of sitting in the vertical centre. Also, it says 'Default sorting' on live when it should say 'Default' like the draft. Lastly, the top corners of the picker morph and look really weird when the dropdown has been opened and the right side still has the thicker border/shadow effect on it which looks weird and I think is the reason the right corner of the picker doesn't align with the top right of the dropdown.
- **Shop 18:** This is a global issue wherever on the site a product card exists, the whole thing should be clickable, linking to the product page. But on the content part of the product cards it isn't clickable, the image and the button are clickable, but not that area.
- **Shop 19:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Why did you remove a bunch of sorting options and not fix the shape issue?
- **Shop 19:** (Bean's proofing of 2026-11-18.) The build your own box and allergy cards should have their buttons aligned to the bottom so they're aligned. otherwise the build your own box looks squashed because it has less content.

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
- **Home 36:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Trust bar text doesn't wrap but it's even worse now. The text gets hidden under the icon of the next item in the ranges that used to have the text wrap.
- **Home 37:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Undo, doesn't have a gap between it and the options above it. It also doesn't show up when you reach 3 flavours - Vanilla flavour is already picked by default and I don't think the logic counts it and instead you have to click 3 options instead of just having 3 options selected without needing to select a 3rd if you keep the default vanilla flavour.
- **Home 38:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Gifts section still has huge super long content part of the product cards with huge vertical gaps everywhere between 1023-1318px.
- **Home 39:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Trust bar pauses when tapped and stays paused even when you move away. Should be paused during hover and touch states.
- **Home 40:** (Bean's proofing of 2026-11-18.) The vertical spacing/padding in the cookie builder above and below the step labels/headings is basically non-existent. Look at what the buybox's equivalent step label/heading vertical padding/gaps are and copy that.

## Product page: Zookies

- **Product 16:** The testimonial card slider on 766px and below - The arrows overlap with the cards, needs some padding below cards.
- **Product 17:** The sticky bottom add to basket button gets covered by everything on page even though it should be the top layer.
- **Product 18:** Th button in the sticky bar is huge filling most of the screen's width when it should be quite small, it doesn't seem to even have any padding on it and covers the price.
- **Product 19:** You might also like product cards still have bits that don't match the draft's styles and the rest of the site's styles e.g. label and button being pill shaped.
- **Product 20:** The draft has an issue where when it has less products per row it doesn't show any slider or way to show all of the products originally in the section, we shouldn't copy that and should instead give it the same sort of slider functionality we've set up elsewhere on the site.
- **Product 21:** (Bean's review of round two's fixes, 2026-11-17 late evening.) You might also like cards getting cut off on the left/right when on the edge of the page.

## Account

- **Account 3:** Bean had not reviewed the rebuilt account area at the time of his round-two list ("Wasn't ready for review at point of compaction and handoff").
- **Account 4:** (Bean's proofing of 2026-11-18.) "What about the order confirmation page and account page? Those have to still be open too right as they didn't even have items on the review register." Open: a first careful comparison of the signed-in account area with the draft, and the draft's extras (order thumbnails with "View order", the gift note on an order, the "Email me about new flavours and bake days" tick, the address book with "Make default"), which Bean asked about ("Are the other 2 you're recommending for dropping part of the draft too?": all four are in the draft).
- **Account 5:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Edit on address cards should be on the top right corner - same line as the heading.
- **Account 6:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Heading for address cards needs increasing, it's smaller than the person's name underneath it.
- **Account 7:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) a) The email me about new flavours checkbox and text should be a good size proportion to eachother. b) Currently looks like the text is too small for the checkbox. Also, the text should add on 'and treats as well as special offers.' c) The consent should definitely be above the password area if it doesn't require a lot of effort. I also think that the account details and password reset should be separated like in the draft too unless it requires some framework building too.
- **Account 8:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Padding above 'your account' label in the hero is less on the live than the draft.
- **Account 9:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) View order link text needs to be left aligned on the stacked/mobile view. Screenshot shows it sitting with a visible indent compared to the text above it.
- **Account 10:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Switch view order button's resting bg/fill colour to be the yellow.
- **Account 11:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Order summary is missing the order again button.
- **Account 12:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Isn't the first step supposed to be the processing stage? Why does the live example screenshot show us on the second stage with it saying the woocommerce status is still processing? I thought it'd say something at least like confirmed.

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
- **Checkout 11:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Selected, who's it for still has a second border outside of the border.
- **Checkout 12:** (Bean's review of round two's fixes, 2026-11-17 late evening.) The summary card gets its right side's shadow cut off.
- **Checkout 13:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Delivery options still have no vertical gap.
- **Checkout 14:** (Bean's review of round two's fixes, 2026-11-17 late evening.) As mentioned regarding the design of the summary card to unify between basket and checkout but checkout needs the order items in it in addition.
- **Checkout 15:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Who's it for heading overlaps the border and the bottom of that section has a bit too much empty space/padding.
- **Checkout 16:** (Bean's review of round two's fixes, 2026-11-17 late evening.) All of the input boxes are too tall. The text sits in the bottom (should be centred) and it looks like the input box is built to fit 2 lines of the text for these simple and short boxes like names, post-code, email etc
- **Checkout 17:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Side agent said the UK only checkout could block people buying whose card address is abroad even if the delivery address is UK.

## Order confirmation

- **Order confirmation 2:** Bean had not reviewed the rebuilt page at the time of his round-two list ("Same status as account page to my knowledge").
- **Order confirmation 3:** (Bean's proofing of 2026-11-18.) Open with Account 4: a first careful comparison of the order confirmation page with the draft, for a guest, a signed-in owner and a gift order.
- **Order confirmation 4:** (Bean's proofing of 2026-11-18.) Order confirmation page's back to the kitchen arrow icon and posted card arrow icons are both the wrong type too.
- **Order confirmation 5:** (Bean's proofing of 2026-11-18.) the ig icon is black when it should be white to match the rest of the ig icons on the site.
- **Order confirmation 6:** (Bean's proofing of 2026-11-18.) why's there a different vertical gap between the order card and Billing address card?
- **Order confirmation 7:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Email confirmation link text colour is light grey. Pretty sure I've banned this a few times, I'm doing it again. Never do this or allow this, switch it back to black.
- **Order confirmation 8:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Confirm email and view order button has dark pink bg/fill colour. Should just be the regular yellow instead.
- **Order confirmation 9:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) When the order confirmation page is not in stacked mode and the 'What's coming' and 'send here a taster trio' cards are in the same row, they should fill height, the taster trio card is a little shorter and all of the cards on the same row aside from these 2 are the same height.
- **Order confirmation 10:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) the order confirmation page feels like it should have more of its cards have non-blank bg/fill colours like the pink or yellow of other cards, especially towards the bottom of the page.
- **Order confirmation 11:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) Confirm email and view button doesn't have much of a vertical gap/padding between it and the content above it. That should be increased and the vertical gap/padding above the Email address* label needs reducing it's quite large and is inconsistent with the rest of the gaps/padding. And should probably make the label bold or add weight to it so it stands our from the regular text.

## Gift card page

- **Gift card 1:** (Bean's proofing of 2026-11-18.) The amount tiles read "£15.00"; Bean agreed they should read "£15", and the button wording follows the draft.

## All pages

- **All pages 2:** (Bean's review of round two's fixes, 2026-11-17 late evening.) Need to fix that 1023 px blindspot and check if the other breakpoints have the same blinspot too because I think we have the same thing at 767px because I think the breakpoint is supposed to be 768px but the changes layout changes usually occur at 766px.
- **All pages 3:** (Bean's proofing of 2026-11-18.) Several buttons don't use the standardised arrow shape that is used across the site e.g. the homepage hero's first button or the arrows in the nav drawer are correct. The incorrect arrows exist in the sign-in form's sign in button, the contact form's submit button, the help page's 3 bottom cards - terms and conditions, privacy policy and still stuck.
- **All pages 4:** (Bean's proofing of 2026-11-18.) You should do that small framework fix for add to baskets and the cache now. (The security token printed into cached pages: a page cache older than about a day would make add to basket fail.)
- **All pages 5:** (Bean's proofing of 2026-11-18.) the yellow bg cards also have a darker yellow/gold label on them like we fixed previously. Make sure to switch all offenders with dark pin[k] label.
- **All pages 6:** (Bean's proofing of 2026-11-18.) across the site most pages have a large amount of white space (a large gap) between the bottom of the page's content and the top of the footer. Can we cut this down to normal and make it consistent across all of the pages, it just looks really unnatural and a bit broken like I accidentally hit enter a bunch of times while writing a word doc.
- **All pages 7:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) All tick boxes on the site should match the tick box look on the basket drawer's gift note tick box. - Do a full site sweep and make sure all are standardised.
- **All pages 8:** (Bean's review of the account and order confirmation pairs, 2026-11-18.) (On All pages 6.) The bottom page padding/gap should be equal across all pages at a sensible value that you can decide based on /research
- **All pages 9:** (Raised by the main session and a side agent on 2026-11-18, not Bean's words; Bean may rule it out.) Three pages the draft has no design for and nobody has reviewed look unstyled: search results (very large pink headings with "Read more", a pink search button), Saved items when empty (small plain text, a pink "Continue shopping" button) and the 404 page (a search box with the same pink button). To be restyled in the site's own look, matched to the nearest built pages.

## Bean's verdicts so far (2026-11-17 late evening)

- **Shop 18:** fixed.
- **Product 15 and the checkout's wallet row:** Google Pay and Apple Pay buttons show up in checkout.
- **Footer 10:** still unresolved on wide screens.
- **Help:** all resolved (Help 14 raised after).
- **Gifts:** all issues resolved (Gifts 16 and 17 raised after).
- **Home 37:** the Undo button is to be removed.
- **"Add a Taster Trio for a friend" row in a filled drawer (2026-11-18):** dropped. "They can't split where that ships vs the rest of the shopping and ... it's just not cost-effective to buy 3 cookies for £5 when the rest of the order will have the cookies at a much better price."
- **Gift card 1 (2026-11-18):** the amount tiles read "£15", not "£15.00" ("Sure").
- **Footer 10 (2026-11-18):** the redrawn underline is too thin; see Footer 12.
- **Account 4, addresses (2026-11-18):** "Go with the closest honest version for addresses": one billing and one delivery address as cards in the draft's style, with no "Make default", no "Remove" and no address book.
- **All pages 3, Help cards (2026-11-18):** "Keep the outlined circle, and yes switch those arrows too" (the three Home button links and "View order" take the standard arrow).
- **Order confirmation 3, extras (2026-11-18):** "Keep the extras" (the order summary strip and the two address cards the draft does not have).
- **Order confirmation 3, card arrows (2026-11-18):** "I've looked at both arrows, replace them" ("Send one" and "Create an account" take the standard arrow). Typed arrows inside sentences stay: "we've got a lot of normal arrows in text, it's just the buttons I'm looking for or components that looks and act like buttons".
- **No bake days (2026-11-18):** "Don't include any content with bake days in it." The account tick reads "Email me about new flavours".
- **Screenshots (2026-11-18):** Bean wants pairs, the draft beside the test site, at the three main widths, for the account and order confirmation pages.
- **Account 4, "Something not right? Message Zainab" (2026-11-18):** the link goes to the Contact page.
- **Light grey text (2026-11-18):** banned everywhere. "Pretty sure I've banned this a few times, I'm doing it again. Never do this or allow this, switch it back to black." (Raised first as Checkout 7.)
- **Account notice and order wording (2026-11-18):** "Restyle the pink notice, and use Posted for completed orders." The notice above an unverified customer's orders is a dashed yellow card with a bold "Confirm email address" link; a completed order's pill reads "Posted" and its tracker stops at the Posted step (`orderCompletedStep` `dispatched`), with "With you" ahead.
- **Old proofing photos (2026-11-18):** "can you delete the old proofing photos that are in the same folder as the new ones you've taken for me. It's confusing". `E:\sgs-tmp\mamas-register\round2\for-bean\` holds only the current set; an older pass is deleted when its replacement is made.
