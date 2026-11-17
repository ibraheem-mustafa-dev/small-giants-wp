# Mama's Munches: Bean's issue register of mamas-test against the draft (2026-11-17)

Bean's own words, one item per line, each given an ID (`<Section> <number>`) so the plan (`.claude/plans/2026-11-16-mamas-fix-and-surface-cloning.md`) and the fix catalogue (`fix-catalogue.md`, beside this file) can name it. "Live" is `mamas-test`; "draft" is the Claude Design draft in `sites/mamas-munches-redesign/handoff/`. Status is kept in the fix catalogue, not here.

## All pages

- **All pages 1:** Most pages are missing the entrance animations. (Bean, 2026-11-17, added after the register.)

## Header

- **Header 1:** Selling strip has dashed pattern top and bottom border on draft but dotted on live
- **Header 2:** Both are wrong - The top and bottom lines should be border lines but they don't extend to the full width of the screen and they sit inside the strip instead of as the vertical borders that are the edges.
- **Header 3:** Mobile + tablet version, when hovered on/touched the bag icon moves uo and to the left but on the draft it doesn't move.
- **Header 4:** Both are wrong - Unconditionally switches to 2 items on the too strip trust bar when it goes from desktop to tablet when it still fits 3. Also, it shouldn't just default to a static 2 items, when it reaches the point the full set of trustbar items it should turn into a ticker/infinite scroller. (just like eye care's trust bar strip.)
- **Header 5:** Need to remove the subscribe and save item from the menu.
- **Header 6:** When visiting the account/sign-in pages the draft has the hover effect pink circle bg applied to the account icon in resting state.
- **Header 7:** Has an empty bottom strip that should not render/be visible when empty.
- **Header 8:** On some widths on mobile, the account icon stacks on top of the cart/basket icon instead of sitting next to each other.
- **Header 9:** This isn't the header but the slider is yellow on a cream bg which isn't the best look as they're very similar so I'm thinking why don't we make the slider bg the light pink brand colour token?
- **Header 10:** (Round 2, 2026-11-17 evening, after the ship.) There's a point when the sticky header is about to activate where it bugs out like crazy switching between the main header and the shrunk header.
- **Header 11:** (Round 2, 2026-11-17 evening, after the ship.) The yellow still isn't clear on the light pink, might need to use the darker pink shade. (Follows Header 9: the page scrollbar's yellow thumb on its light pink track.)
- **Header 12:** (Round 2, 2026-11-17 evening, after the ship.) On 1023px the main header goes super huge because the middle-aligned mobile logo is added and it's huge and the left-aligned desktop logo is still there. (Bean's screenshot: both logos show at once, the phone logo at several hundred pixels wide over the menu.)

## Basket drawer

- **Basket drawer 1:** Needs recloning
- **Basket drawer 2:** (Round 2, 2026-11-17 evening, after the ship.) Drawer header has more padding around your basket and close button.
- **Basket drawer 3:** (Round 2, 2026-11-17 evening, after the ship.) The free delivery meter is supposed to have a white bg and dashed line border below it.
- **Basket drawer 4:** (Round 2, 2026-11-17 evening, after the ship.) Qty is not supposed to be written and the input box for the number is supposed to be an input box with a minus and plus button on either side (this box is already built on cart page). And, the remove button is supposed to have the underline closer to the bottom of the text and it's supposed to be on the right end of the same line as the quantity input box.
- **Basket drawer 5:** (Round 2, 2026-11-17 evening, after the ship.) Each item is supposed to have a separator line between it and the item below.
- **Basket drawer 6:** (Round 2, 2026-11-17 evening, after the ship.) The draft didn't have the label of the product variation before the choice e.g. base, chip, flavour
- **Basket drawer 7:** (Round 2, 2026-11-17 evening, after the ship.) There's no option to mark it as a gift.
- **Basket drawer 8:** (Round 2, 2026-11-17 evening, after the ship.) When the basket is empty, it's supposed to have a message in the centre with the logo, then 'Your Basket is empty', then a message to say if they're new to try the taster trio and then a button to add it to basket and under that to browse the shop. (Bean's screenshot of the draft: round logo, "Your basket is empty", "New to Zookies? The Taster Trio is 3 cookies for £5, postage included.", a pink button "Add a Taster Trio · £5", an underlined "Browse the shop".)

## Basket page

- **Basket page 1:** (Round 2, 2026-11-17 evening, after the ship.) There is no padding on each item card so the product image touches the left border and the price touches the right border under 1024px
- **Basket page 2:** (Round 2, 2026-11-17 evening, after the ship.) Under 1024px the bottom border of each item loses the solid black line.
- **Basket page 3:** (Round 2, 2026-11-17 evening, after the ship.) The fontstyle of the number in the item quantity box is wrong and the plus and minus symbols should be black.
- **Basket page 4:** (Round 2, 2026-11-17 evening, after the ship.) The summary block is way too different the draft even though I do recognise that there needs to be some difference due to the addition of coupons and gift card. But gift card section could be collapsible too, the apply button on gift cards is totally wrong styles, it's got the wrong heading, 'CART TOTALS' instead of 'SUMMARY' and that heading is missing under 1024px.
- **Basket page 5:** (Round 2, 2026-11-17 evening, after the ship.) This is a bigger issuee than just the cart page but the cart I was testing with was over the free shipping minimum and the cart still added a shipping price - The default should always be the lower priced delivery option especially if it's free.

## Nav drawer

- **Nav drawer 1:** Totally missing all entrance animations inside the drawer.
- **Nav drawer 2:** Say hello 3 social media cards have a few inconsistencies.
- **Nav drawer 2a:** Rounded on draft, straight corners on live.
- **Nav drawer 2b:** Social media icons have border lines in draft, missing on live.
- **Nav drawer 2c:** IG social media icon in draft has IG gradient colour, flat purple on live.
- **Nav drawer 3:** Need to remove the subscribe and save item from the menu.
- **Nav drawer 4:** The 'Who are you shopping for' cards are much too tall on live. Draft has the boxes the images fit in as a set size with the images centred in them but live has the image extend to show the full length of the image.
- **Nav drawer 5:** The menu items don't actually link to the pages they're supposed to link to.

## Footer

- **Footer 1:** 'Hungry? Of course you are.' Is contained within a max-width CSS rule that holds it so it can't extend to fill the full width of the visible empty space until the width.
- **Footer 2a:** Shop and help list items should shift to the right when hovered on.
- **Footer 2b:** Shop an help headings change colour on hover on live but they are static in the draft.
- **Footer 3a:** The email text is undersized.
- **Footer 3b:** When hovering on the email, the underline should switch to match the text colour too.
- **Footer 4:** Social icons should have black outline around them that matches the shadow colour on both normal and hover state.
- **Footer 5:** Ig icon hover turns whole button white when it shouldn't change colour at all.
- **Footer 6:** This point isn't in the draft but please fix the sgs attribution link hover colour to switch to either my SGS orange or teal - whichever looks better on the pink bg colour.
- **Footer 7:** The gallery images get a white tint on them when hovered on on the live version but the draft has no white tint effect.
- **Footer 8:** Not sure about this but I feel like the draft's hover on the gallery images staggers the 2 effects like first it straightens out rotation and then extends the shadow and on live they both animate at the same time or maybe the difference is the speed of the animation. I'm not sure if I'm right or not because the visual difference could not exist.
- **Footer 9:** The yellow tagline band above the footer is about 15px taller on live than on the draft, with larger type. (Found in review; Bean added it to the list on 2026-11-17.)
- **Footer 10:** (Round 2, 2026-11-17 evening, after the ship.) Above 1024px the attribution link's hover underline gets thinner after the sweep animation completes.
- **Footer 11:** (Round 2, 2026-11-17 evening, after the ship.) The gallery images on 766px and below have the top and bottom getting cut off.

## Sign-in

- **Sign-in 1:** Sign-in form box is too narrow, it should match the content width of the why have an account section directly below it.
- **Sign-in 2:** Sign in button at the bottom of the form is missing the vertical space that should be above it.
- **Sign-in 3:** Create account form is missing most of the info boxes from the draft, live only has email address box.
- **Sign-in 4:** Register button is totally missing the site's button tokens/styles. Should look the exact same in normal and hover states as the sign in button on the sign in form.
- **Sign-in 5:** When you sign-up it switches to the account page's contents but it doesn't actually switch to the my-account page.
- **Sign-in 6:** (Round 2, 2026-11-17 evening, after the ship.) The email me tick is blue coloured, doesn't fit site colours.
- **Sign-in 7:** (Round 2, 2026-11-17 evening, after the ship.) The vertical spacing above and below email me lne is huge.
- **Sign-in 8:** (Round 2, 2026-11-17 evening, after the ship.) Current/selected option between sign-in and create account should not have a hover lift effect.
- **Sign-in 9:** (Round 2, 2026-11-17 evening, after the ship.) When switching between the 2 options, can we have the box animate it's extension/shrinking height instead of an instant switch.
- **Sign-in 10:** (Round 2, 2026-11-17 evening, after the ship.) The account button when not signed in opens a useless my account page that just leaves links to the sign-in page. Needs to redirect, that useless page can just get deleted or we get rid of the sign-in url and replace that unsigned-in my account design that leaves links to sign-in page with the actual sign-in page itself.
- **Sign-in 11:** (Round 2, 2026-11-17 evening, after the ship.) Remove bake date wording.

## Contact

- **Contact 1:** Hero section is a bit narrower on live than on the draft,
- **Contact 2:** The 'Say hello to Zainab heading' should have some gap vertically between it and the text underneath it but on the live it's missing that.
- **Contact 3:** The big logo on the hero is supposed to have the rotate effect that is the same on the footer but it's missing here.
- **Contact 4:** All of the content outside of the hero is completely missing the gutters/content width and just fills the absolute max width of the screen.
- **Contact 5:** The WhatsApp and ig icons in the 3 contact cards are supposed to have the same black outline as the email icon in the 3rd contact card.
- **Contact 6:** The 'What's it about?' pills on the draft have the text centred in the pills but on the live they are top aligned.
- **Contact 7:** On the quick answers accordion, opening an answer switches the symbol from a plug to a x and reverses it the other way around. But on the draft it animates this switch via rotation, our live version just switches them with no animation. (Works on help page)
- **Contact 8:** The live has a nice bounce animation when opening an accordion item that the draft doesn't. Keep this, don't copy draft.
- **Contact 9:** When opened an item the whole accordion item is supposed to get a yellow bg colour but on live that only exists on the top item. for the others below, when opened only the top heading section gets the bg colour switched to yellow. (Works on help page)
- **Contact 10:** When opened, the accordion item is supposed to get the corner shadow shape on it, but it's missing on live. (Works on help page)
- **Contact 11:** Also, the category label above the heading of each accordion item heading is missing. (Works on help page but the label on help page's accordion items has wrong styling.)
- **Contact 12:** (Round 2, 2026-11-17 evening, after the ship.) Instead of wrapping letters to the next line, when the email card gets too small for the full length of the email to fit, the email just extends out of the box on live.
- **Contact 13:** (Round 2, 2026-11-17 evening, after the ship.) The input boxes of the form have only the top border line be the full proper black border, the rest are very thin.
- **Contact 14:** (Round 2, 2026-11-17 evening, after the ship.) Add an arrow symbol to the end of the 'More answers on the Help page' button so it's clear that it's clickable since our live setup has the underline show up after hovering on it.

## Help

- **Help 1:** The search bar and filter options are supposed to be placed inside the pink bg of the hero section under the page heading.
- **Help 2:** The selected filter option, when hovered on - The top gets cut off.
- **Help 3:** The category label in each accordion item has the wrong styles. Much too big, wrong font family and wrong colour.
- **Help 4:** The accordion items on the contact page have a nice bounce animation when opening them, please add that to the accordion on this page too.
- **Help 5:** Delivery section - For some reason, when hovering over the 2 Royal Mail tracked cards, the delivery timing line under the name of the delivery option lifts.
- **Help 6:** Privacy policy and terms and conditions boxes - Is it realistic to fit the full contents of both of these in here? Feel like these should be buttons that link to the page for each of those.
- **Help 7:** Missing vertically gap/padding above the 'Still stuck? Message Zainab' button.
- **Help 8:** 'Still stuck? Message Zainab' button should be treated as a full clickable button, live currently only had the arrow icon as a clickable link to contact page.
- **Help 9:** 'Still stuck? Message Zainab' button - The arrow icon is supposed to be in a white circle but on live it's in a rectangle. Also, on live when you hover on the arrow icon it has it's own hover lift when on the draft the whole card/button has 1 joint hover state and animation/effect.
- **Help 10:** (Round 2, 2026-11-17 evening, after the ship.) Can we have the filter options on screen widths that can't fit all of them wrap to another row instead of getting a horizontal scroll-bar. (Shop page already does this)
- **Help 11:** (Round 2, 2026-11-17 evening, after the ship.) On 1022px and below - On the 3 options in the delivery card, the price bit which should be left aligned gets messed up on the 2nd and 3rd option with them getting an extra push inwards.
- **Help 12:** (Round 2, 2026-11-17 evening, after the ship.) Vegan base paragraph on allergens and ingredients section has a hover lift effect on it which should be removed.
- **Help 13:** (Round 2, 2026-11-17 evening, after the ship.) You've turned terms and conditions and the privacy bits into regular buttons, I prefer the structure of the draft, can you adapt that layout to fit the current setup where we have separate pages for those and they are just really nicely designed buttons that fit the aesthetic of the page.

## Gifts

- **Gifts 1:** Hovering on non-selected filer options should raise them.
- **Gifts 2:** The filter options both get swapped out for a filter products button that opens a drawer on tablet and mobile on live. But needs to keep the options like on draft. It's doing this to try to follow the filter rule on shop pages which have a full filter sidebar on the side of the page on desktop which needs to be switched with a button to fit in a drawer, but that doesn't exist here.
- **Gifts 3:** The note in the hero has a hover lift on it but it shouldn't, also the text in the note has a separate hover lift effect on it which should be removed too.
- **Gifts 4:** The picture in the hero should have a rotate and lift effect on hover but the live only has a lift effect.
- **Gifts 5:** The picture in hero has its padding placed inside the frame under the caption but it's supposed to be applied under the box around the image and caption. This is causing the bottom of the image on tablet and mobile to get cut off by the bottom of the section.
- **Gifts 6:** This isn't on the draft but I think when it's hovered on the picture card should show as a higher layer than the note so the whole thing is visible while hovered on.
- **Gifts 7:** The product cards labels are incorrectly styled. Should be pill shaped, black outline and sentence case.
- **Gifts 8:** The product cards should have the same rotated/tilt pattern as the gallery images with the same hover effect of it rotating, lifting and getting the shadow effect.
- **Gifts 9:** The add to basket button/build your box buttons should all have their text switched to 'Build Your Batch' or 'Pick Flavours' (whatever sounds more attractive to the target audience) There can be a default set of flavours/ingredients on the product pages but there shouldn't be an option to add to basket on these cards because it will stop them from seeing the fact that they can add a card and stop them from being able to choose what tastes they prefer if they want to. The customised picker should be adapted to fit on every product page but fit the product of that page.
- **Gifts 9b:** Also, the styles of these buttons should match the regular button styles for both normal and hover states.
- **Gifts 10:** Gifting 1,2,3 cards hover effect doesn't rotate to straighten out the hovered card like it should.
- **Gifts 11:** Write her a note section doesn't update the note's writing live as you type, it has a 'save my note' button that never existed on the draft. Remove that and fix the functionality,
- **Gifts 12:** The gift card section is supposed to have a hyperlink to the gift card page.
- **Gifts 13:** (Round 2, 2026-11-17 evening, after the ship.) The 'Gift for' heading is tilted on live.
- **Gifts 14:** (Round 2, 2026-11-17 evening, after the ship.) The responsiveness points in the live site and draft are different. Look at all screen widths and match the draft.
- **Gifts 15:** (Round 2, 2026-11-17 evening, after the ship.) There is a really thin cream strip under the header above the hero section.

## Shop

- **Shop 1:** The 'fresh from Zainab's kitchen' label above the page heading has no padding under it on live when it does on the draft.
- **Shop 2:** The filter options on the draft only allow one selected at a time but the live site allows every category (aside from all) to be selected at the same time.
- **Shop 3:** When all is clicked again after picking a filter option the whole page reloads. Is that necessary?
- **Shop 4:** The 'Sort by' text is actually just supposed to say 'Sort' and it's supposed to have different text styles too.
- **Shop 5:** The sort pill is supposed to have the corner shadow effect on it.
- **Shop 6:** The sort pill's dropdown on both versions is an ugly default look that doesn't connect to the top button that opens it up. Is there any way to make it fit with the pill look that fits and connects to the button that it opens from?
- **Shop 7:** Products need the exact same end shape as described in gift page points since it's just a product page variation
- **Shop 8:** Same filter options getting replaced by a button to open a drawer. This site doesn't have a sidebar filter that needs a drawer to replace it.
- **Shop 9:** 'Build Your Own Box' card is supposed to be fully clickable to the Zookies page.
- **Shop 10:** The 'Start Building' CTA in the 'Build your own box' card is missing and the arrow icon has not got a circle bg behind it.
- **Shop 11:** 'Build your own box' card's arrow icon and heading have their own hover lift effect. Needs removing, who card is supposed to be treated as 1 component with a shared hover.
- **Shop 12:** Subcribe and save card should have its content replaced by another USP/selling point that you think fits.
- **Shop 13:** On the tablet/phone mode the padding under the sort button is missing on the live.
- **Shop 14:** The image in the gifting for someone card has sharp corners that escape the rounded corners of the card it sites in.
- **Shop 15:** (Round 2, 2026-11-17 evening, after the ship.) The padding on the inside of the content section of each product card is too high. Very visible how the live heading is lower and the text starts further inwards/to the right of the draft.
- **Shop 16:** (Round 2, 2026-11-17 evening, after the ship.) Similar issue to the gifts page, the responsiveness of the cards doesn't match the draft at all, need to check where exactly the draft switches how many cards per row and apply that.
- **Shop 17:** (Round 2, 2026-11-17 evening, after the ship.) The sorting picker is messed up. THe text and chevron pointing down are top aligned instead of sitting in the vertical centre. Also, it says 'Default sorting' on live when it should say 'Default' like the draft. Lastly, the top corners of the picker morph and look really weird when the dropdown has been opened and the right side still has the thicker border/shadow effect on it which looks weird and I think is the reason the right corner of the picker doesn't align with the top right of the dropdown.
- **Shop 18:** (Round 2, 2026-11-17 evening, after the ship.) This is a global issue wherever on the site a product card exists, the whole thing should be clickable, linking to the product page. But on the content part of the product cards it isn't clickable, the image and the button are clickable, but not that area.

## Home

- **Home 1:** The spinning gold star at the top of the hero before the label text is missing the black outline on the live.
- **Home 2:** The hero label has a hover rotate/tilt effect on live, shouldn't have it.
- **Home 3:** The baked to order sticker in the hero doesn't have the looping up and down animation in the live. Needs to have it like in the draft. (similar effect to homepage hero image on indus draft site).
- **Home 4:** Baked with love label doesn't have the arrow shaped indent on live, just rectangle shaped.
- **Home 5:** The 3 image cards are completely missing their hover lift and rotate effects. Also, I want to add something new on top of that - I want the hovered card to be the top layer of the 3 cards so that if someone hovers on the 2 cards that are partially covered by the main card the visitor can read the message on the card.
- **Home 6:** The dashed border in between the hero and trust bar is supposed to go across the full screen. The live has it fit inside the content width.
- **Home 7:** This is a HUGE issue and difference across all 3 device types and needs deep investigation/comparison with draft and solving - The hero is a completely static size on desktop (trust bar also matches it on desktop) and on tablet and mobile when it switches to stacked, it also has a completely static size which doesn't move or respond at all to different screen widths. It looks horrid and on desktop both the hero and trust bar extend off screen on the right side and on tablet/mobile the hero is super squashed to the left no matter how much space is on the left.
- **Home 8:** As mentioned in point 7 on desktop, the trust bar's points extend outside of the screen.
- **Home 9:** A} On tablet/mobile the trust bar is in ticker/infinite scroller mode. It doesn't go to the edge of the screen like the draft. B) And, the trust bar items overlap instead of having the gap that they do in the draft.
- **Home 10:** 'Who are we baking for today?' section, 'Build your Zookie' section and 'Zainab’s Zookie recipe' section and FAQ section are missing the gutters/content width padding.
- **Home 11:** Builder Your Zookie's interactive cookie visual is completely messed up, there's no cookie, changing options doesn't play an animation on the builder and barely any of the options actually change anything visually and even then they don't match the draft!
- **Home 12:** Wording under the cookie visual in the box saying your options is missing.
- **Home 13:** We removed the subscription/single purchase options under the cookie visualiser but didn't replace it. Lets place the quantity' options under it instead of on the left side. And, under that please place the add to basket button instead of having it as a super wide button across the screen even on desktop.
- **Home 14:** Base options - Please remove the colour swatch square and the tick. Make it the same as the chips options look.
- **Home 15:** For the cards in the 'Who are we baking for today' section can we have the same fix as mentioned for the same 2 cards in the nav drawer. These fit the full length/height of the image and it looks a bit ugly/. Should have the boxes to fit the images be one set size/ratio and then the image itself should fill width and be centred so any length that doesn't fit at full width is hidden on the top and bottom so the centre of the image is visible.
- **Home 16:** On tablet/mobile - When scrolling past the Cookie Builder section it has a product page sticky add to basket bits stuck to the bottom of the page.
- **Home 17:** On tablet/mobile the gifts for new mums section's card slider is totally different. On live it just has a slider and on the draft version it is draggable by finger and it also has arrow buttons as well as the dots to show how many cards there are and what cards in the order are currently on screen.
- **Home 18:** The where it started image's 2 stickers are too tall and they're placed slightly off. The right one is too far right on mobile and too far left on desktop.
- **Home 19:** Testimonial section - The trustpilot average review and link to trustpilot bit is not formatted the same and is missing the padding under it is completely missing so it overlaps the review cards under it.
- **Home 20:** The review slider is missing the arrows and the dots are styled wrongly.
- **Home 21:** Also, the review slider's auto sliding by 1 card every internal is missing.
- **Home 22:** A) The review cards are missing the pink open quotations symbol in the top right. B) The review card heading is the wrong font. C) The bottom left of the card should only have the reviewer name - live has date there too. D) Bottom right should have date + 'Trustpilot. E) The card contents are supposed to spread across the vertical height of the card so there shouldn't be a big gap on the bottom of cards with shorter reviews like it currently shows on the live.
- **Home 23:** The hover lift, rotate and shadow effect doesn't work on the last item in the slider.
- **Home 24:** (Round 2, 2026-11-17 evening, after the ship.) The spinning gold star drifts during its animation and then at the end of what I assume is each cycle it teleports back to its starting position since it drifts away. The draft's version doesn't move position at all.
- **Home 25:** (Round 2, 2026-11-17 evening, after the ship.) The trust bar under the hero needs to switch to have smaller gutters or switch to scrolling ticker at a higher px because the first item's text wraps to 2 lines for a bit before it switches.
- **Home 26:** (Round 2, 2026-11-17 evening, after the ship.) The 2 cards in the 'Who are we baking for today?' look awful between 768px and 1024 px. It needs to remove the huge vertical space above and below the text+button in the content half of the cards.
- **Home 27:** (Round 2, 2026-11-17 evening, after the ship.) Cookie Builder: Needs to be some vertical padding between the How Many options and the add to basket button.
- **Home 28:** (Round 2, 2026-11-17 evening, after the ship.) Cookie Builder: Steps need renumbering because the how many section is now last visually.
- **Home 29:** (Round 2, 2026-11-17 evening, after the ship.) Cookie Builder: The undo button needs to be attached to the bottom of the flavours options.
- **Home 30:** (Round 2, 2026-11-17 evening, after the ship.) 'A gift she'll actually eat' section - Remove the horizontal slider bar, it doesn't visually match the rest and overlaps with stuff.
- **Home 31:** (Round 2, 2026-11-17 evening, after the ship.) 'A gift she'll actually eat' section - Similar issue to gift and shop pages with the breakpoints for tiling and when it switches to a slider.
- **Home 32:** (Round 2, 2026-11-17 evening, after the ship.) In the testimonial section, the bit with the overall trustpilot score that links to the trustpilot profile - I'd like it to get a nice looking hover animation.
- **Home 33:** (Round 2, 2026-11-17 evening, after the ship.) Testimonial slider's auto sliding to the next card seems to stop working after I manually switch to another card.
- **Home 34:** (Round 2, 2026-11-17 evening, after the ship.) Hovering on/touching the trust bar under the hero doesn't pause is temporarily like the other trust bars in the header and footer. Additionally, are you able to make the colours of the icon in the trust bar items change colour when that item is hovered on?
- **Home 35:** (Round 2, 2026-11-17 evening, after the ship.) The 2 links on the homepage hero under the buttons have the button up and to the left lift on them when hovered, it just doesn't look right on plain text. Please give it better hover effects that are more consistent with the rest of the site.

## Product page: Zookies

- **Product 1:** Vertical gap/padding between label, heading, reviews line, product description etc is too high.
- **Product 2:** Hovering on the review line gives a lift animation. Should remove the motion in the effect and be replaced by a sweeping underline effect.
- **Product 3:** The pin effect on the product image doesn't work below 1024px when it should turn off under 768px when the page switches to stacked mode.
- **Product 4:** Current/selected image's thumbnail should have the lift and shadow applied in resting state and have no hover state.
- **Product 5:** The vertical gap between the main product image and the thumbnails below it is smaller on the live vs the draft and the gap between the thumbnails is smaller too on live.
- **Product 6:** The price per cookie text is tiny and super out of place and tiny. (Don't think it's in the draft so it's just placed a little randomly)
- **Product 7:** Vertical gap/padding under the add to basket button is smaller on live.
- **Product 8:** The product accordion item text is regular black text in the draft. But on live it is the same font and weight as the item heading.
- **Product 9:** Hover effects and drag functionality on review cards is also a bit janky on some of the items here too like the homepage.
- **Product 10:** Contents of each review card needs to be spread out across the full height of each card.
- **Product 11:** The draft on0p-pky has 3 review cards so it's missing the slider functionality that the homepage has, needs arrow buttons and the dots added same as the homepage testimonial slider.
- **Product 12:** 'You might also like' section has a whole section hover lift effect on live. Needs removing.
- **Product 13:** The 'You might also like' section heading is missing the vertical padding/gap underneath it.
- **Product 14:** The product cards in it have the wrong styling and need to match the shop page's product card styles and hover effects.
- **Product 15:** Missing option to pay now with Google/Apple Pay under/above the add to basket button.
- **Product 16:** (Round 2, 2026-11-17 evening, after the ship.) The testimonial card slider on 766px and below - The arrows overlap with the cards, needs some padding below cards.
- **Product 17:** (Round 2, 2026-11-17 evening, after the ship.) The sticky bottom add to basket button gets covered by everything on page even though it should be the top layer.
- **Product 18:** (Round 2, 2026-11-17 evening, after the ship.) Th button in the sticky bar is huge filling most of the screen's width when it should be quite small, it doesn't seem to even have any padding on it and covers the price.
- **Product 19:** (Round 2, 2026-11-17 evening, after the ship.) You might also like product cards still have bits that don't match the draft's styles and the rest of the site's styles e.g. label and button being pill shaped.
- **Product 20:** (Round 2, 2026-11-17 evening, after the ship.) The draft has an issue where when it has less products per row it doesn't show any slider or way to show all of the products originally in the section, we shouldn't copy that and should instead give it the same sort of slider functionality we've set up elsewhere on the site.
- **Product 21:** (Round 2, 2026-11-17 evening, after the ship.) The wording on the c (Bean's note stops here; asked on 2026-11-17 for the rest.)

## Product page: other products

- **Other products 1:** The buyboxes on all of these just look super broken, they need to align with the Zookies product page template.
- **Other products 2:** The gift card product page should look still have the same format as the other product pages just like the draft but the only difference should be the right side of the buybox which is also supposed to be different across all of the other products too anyway.
- **Other products 3:** The review cards and other products sections should be fixed with the zookies product fix points.

## Account

- **Account 1:** Needs totally recloning/building. Totally different.
- **Account 2:** The notification for verifying account with email needs fixing too to have the styles that match this site's tokens. (Already did this on Eye Care Test too.)
- **Account 3:** (Round 2, 2026-11-17 evening, after the ship.) Bean had not reviewed the rebuilt account area at the time of his round-two list ("Wasn't ready for review at point of compaction and handoff").

## Checkout

- **Checkout 1:** Generally pretty accurate but it has several areas where there are differences and where it's just really ugly and broken looking. I'm not listing every single one because these are mainly issues we already had to deal with for eye care test.
- **Checkout 2:** (Round 2, 2026-11-17 evening, after the ship.) Express Checkout, sign in and 'Add a note to your order' don't match the site font styles and sizes and colours
- **Checkout 3:** (Round 2, 2026-11-17 evening, after the ship.) The naming, numbering and separation of the sections doesn't make much sense now. Can you look at merging some sections, changing the names and numbering them properly.
- **Checkout 4:** (Round 2, 2026-11-17 evening, after the ship.) The express checkout sections borders and background colour should match the rest of the sections in the checkout. It looks a little odd like this.
- **Checkout 5:** (Round 2, 2026-11-17 evening, after the ship.) There are thin box lines wrapped around the card payment options and delivery options, also theres no gap between the card payment options and delivery options.
- **Checkout 6:** (Round 2, 2026-11-17 evening, after the ship.) The points I raised about the summary section weren't addressed. It just has several things that just dont match the draft and don't fit with the site or even the rest of the page's aesthetic too. The gift card bit even doesn't match the rest of the summary card (should work and look the same as coupon bit) and the coupon code box text sits at the bottom instead of the middle, the apply button should be the same height as the input box too. Theres also this really basic looking table drawn inside the summary card too. and the name of the card is wrong.
- **Checkout 7:** (Round 2, 2026-11-17 evening, after the ship.) I really dislike the greying text you're using around this page.
- **Checkout 8:** (Round 2, 2026-11-17 evening, after the ship.) On tablet/mobile the top of the express checkout words are cut off and there's no gap between summary card and pay button
- **Checkout 9:** (Round 2, 2026-11-17 evening, after the ship.) Country/Region - She only sells to UK so is the dropdown necessary? Also, the arrow for the dropdown is at the top of the box instead of the centre.
- **Checkout 10:** (Round 2, 2026-11-17 evening, after the ship.) The focus/selected border colour for the input boxes is just a darker/thicker black than the regular border, why don't we make it the brand pink instead?

## Order confirmation

- **Order confirmation 1:** Haven't done this as I haven't done a test purchase yet. You can show me screenshots of this after you do a test purchase when you finish the checkout page.
- **Order confirmation 2:** (Round 2, 2026-11-17 evening, after the ship.) Bean had not reviewed the rebuilt page at the time of his round-two list ("Same status as account page to my knowledge").
