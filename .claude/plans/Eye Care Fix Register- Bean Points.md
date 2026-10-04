Just reviewing your fix list:
Header-
1. Think we should match the text size but the icons on the live look better than the draft, so keep them larger.
2. I think keeping it black in this case is better as it's easier to read and instead to make it feel more reactive, please make the underlining effect animate from left to right on hover and backwards when unhovered.
3. Only visible loading animation we are missing is the circle around the item in bag number expands into view.
4. Don't need new control, our colour picker allows for opacity.
5. As mentioned in point 1, I like the icons at this size
N1. The phone number colour is supposed to darken to black when hovered, missing on live.
N2. Our logo is set up differently with the text element side of it, which is causing 2 issues.
A - The whole logo should be treated as one link block but ours has only the ec/logo image as clickable and the 'EYE CARE BIRMINGHAM' part is plain text.
B - When we scroll down the logo and the logo text shrinks with the shrinking sticky bar, and when you scroll back up to the normal header both have their logo and logo text increase but the live version's text is buggy. The animation doesn't just expand the text size on the line it's on, for about half a second it place EYE above CARE so the text becomes 3 lines instead of 2 and then I think due to the header finishing expanding the text then goes back to normal with EYE CARE being on a single line again.
N3. The item's in bag number is supposed to be aligned to the middle vertically but our live version is too low. The top of the bg circle aligns with the top of the BAG text which is too low. The number should be aligned with the text if we want it to be sat in the correct place.
N4. When the trust bar's items are no longer at a screen width where all are visible it is supposed to turn into a constant scroller unless hovered on.

Mega Menus-
6. Already addressed in header points. - However there is a related issue that needs to be dealt with - The mega menu setup has a huge issue, all of the mega menus parent menu items aside from 'Brands' link to a page on the draft, but our mega menu CPT setup doesn't allow for mega menu items to be clickable and link to a page, so our sunglasses, lenses and Help menu items don't link to their corresponding pages because they are mega menus. (Will number this point N5.5)
7. Give them the same underline hover effects I mentioned in the header menu items. Also, have the underline colour match the text colour so the Green Whatsapp link should have the same colour underline.
8. Ok, but I think that this is a larger issue that might have a different overall solution. See N5
9. The brand tiles on the draft only have the brand names in text because they are missing the logo images. So, this is correct, only thing to make sure is that screen readers can read it the exact same with logos as with text.
10. Difference isn't visible to me.
11. Yes difference is very visible - also takes more space horizontally, at same width the draft has 7 columns of links and the live has 6.
12. Ok
N5. The mega menu's max possible width is 1310px and is left. Also, on higher widths where this is visible the mega menu is left aligned. The outer bit is supposed to always be full width on this website like in the draft. And, the content should be placed in the centre of the screen.
N6. Lenses mega menu, when each item is clicked on all of the text in the item is underlined.

Phone Drawer-
13. Ok
14. Ok - I saw the CSS being used for each menu item, it's pretty simple:
animation: 0.5s ease 0.05s 1 normal both running rise;
    animation-duration: 0.5s;
    animation-timing-function: ease;
    animation-delay: 0.05s;
    animation-iteration-count: 1;
    animation-direction: normal;
    animation-fill-mode: both;
    animation-play-state: running;
    animation-name: rise;
    animation-timeline: auto;
    animation-range-start: normal;
    animation-range-end: normal;
}
The only difference to make the 1 by 1 effect is the ease timing:
Sunglasses - 0.05s
A - Brands - 0.10s
B - Prescription Lenses - 0.15s
C - Glasses SOON - 0.20s
D - 4 mini nav item links as a group - 0.30s
E - Container for the 4 contact buttons - 0.36s
15. Agree with diagnosis as it happens on mobile and tablet, don't understand why the min-height setting is problematic. The main issue seems like whatever mechanism is calculating the margin top is the problem. I checked them both at the same width, the draft's full drawer consistently shows the whole thing in view when there's space, but on the live it consistently pushes the phone button to the same level as where the social buttons are on the draft and the live's social buttons are always under the fold and require scrolling to get into view. The margin top of draft vs live is 197.2px vs 252.9px.
The only difference in the settings that I could see which was clear is the 'bottom' CSS rule. The draft rule was set to auto and the live was set to 0.
N7. This is a problem on the draft and live. The 3 social button's colours on normal state and hover state should be exactly the same as the 3 social buttons on the draft's footer.

Bag Drawer-
16. I think our version is superior, the draft's bag drawer also is missing the close animation.
17. Ok, also I mentioned 2 related issues in the header points:
A - The pop on the draft occurs on page load even when at 0, the live doesn't have this.
B - The number is not vertically aligned to the centre and visibly a little lower than the BAG text which it should on the same line as.
18. Additionally, the 'Added to your basket.' notification strip that gets inserted below the add to bag button should be switched off when this toast option is active.
19. Not sure but I think the text being bold here might be better.
20. This is not the full scope. 
A - Draft is missing the colour variation picked.
B - Our sizes say the lens width instead of the general size letter.
So, if it's a frame only order the single line should look like this:
'Frame only · Size: M · Colour: Gold'
C1 - The draft has the frame and its prescription as separate items, not sure if it should be like this or like live which combines both What do you think?
C2 - Also, on draft after adding adding a prescription for a frame it still shows the 'Add my prescription' button which is weird and I feel like it doesn't make sense and should be hidden after.
D - The prescription details, are a little messy when added and it adds this your prescription and what they're for lines which make no sense. Also, the Options: bit is unnecessary and the thickness measurement number is too since it has a size.
So, if it's a frame and prescription it should look like this:
'Prescription · Distance · Thin · Light-reactive
Size: M · Colour: Gold'
21. Not relevant to this section.
22. I just tried using control to go through the drawer and I was able to select the close button and when I tried pressed enter it closed it.
23. Obviously - it's part of the features of this site. Related points in point 20's comments so combine with this point since several of the comments I made are about this.
24. No, the frame isn't visible in the draft so it just makes the image smaller for no reason. It already has padding/space between it and everything next to it. The frame setting should also be via border controls not padding controls too.
N8. Not sure why but when I open the bag drawer, the buggy animation mentioned in N2b occurs.
N9. I wanted the price bits where there are no pennies to be calculated to just hide the .00 like in the draft.
N10. The text that mentions the brand name is a placeholder, it's supposed to have a horizontal form of the logo of the brand.
N11. Can only add 1 product to the bag drawer, when I add multiple products only 1 shows up. Also, this is related but not bag drawer specific, you can't add a 2nd pair of the same frame to basket, the product page actually says this 'Please wait before adding more of this item.'

Footer-
25. Yes, the main row needs more padding on all 4 sides, and the bottom row needs less in areas.
26. Visually the same on both. Fix it but the CSS rules need to completely match otherwise it will be off e.g. live heading adjusts itself to match with 8px bottom padding. - THIS IS VERY IMPORTANT TO DO PER ELEMENT AND WILL FIX MOST OF THE ISSUES ACROSS THE WHOLE FOOTER AND ELSEWHERE.
27. True, please also use a sgs/heading in subheading mode instead of sgs/text.  As mentioned, in point 26. Make sure each element/block matches the CSS in the draft. I think the biggest difference maker for this point is the tagline's 18px top margin on the draft.
28. Yeah, the tagline is missing width: 32ch and text-wrap: pretty on the live. - Might need to add the ch as a unit option, think I've only seen it available on line indent's unit dropdown.
29. Ok
30 Ok - can't you add custom values as an option to gaps? There should be a toggle at least. The sgs button group's gap control is an input number with a unit dropdown.
31. Ignore for now - Just leave it normal - doubt we'll leave it in as an arriving soon placeholder when we go live so not a problem.
32. Have the hover styles effect match the decision described in the header points regarding keeping it black with the sweeping underline.
33. Fold into point 32
34. Have the hover match the hover for the phone number in the header.
35. Why do we have an opacity setting hardcoded like this when we can just change it via the opacity slider in the colour picker popover?
36. Ok
37. Can't this link to the Google Business link that we set in the framework business info?
38. Ok
39 - 43. Ok - every point is valid, only thing to make sure to fix is that in the brand colour mode, the icon should be normal with its regular brand colours, and then the hover in this case should set the border colours to match the brand colour and remove the scale up effect on hover.
44. Should have same hover effects as the rest of the menu links.
45. Ok
46. Yes and it's missing the attribution link to SGS via the business-info blocks's variant.
47. Ok
48. Think this point is covered by point 25's fixes. Also, the current live footer has the faint top line.
N12. As mentioned earlier. Need to add SGS attribution to bottom footer strip. Also, can remove thsi from the copyright bit as it's common sense 'All brand names are trademarks of their owners'. 
N13. The floating Whatsapp button may overlap with the links/content in the bottom right of the footer bottom strip.

Floating WhatsApp button-

49. Our floating Whatsapp button's Icon and font is much bigger/heavier weight than the draft. I think the draft's is a bit small so can we meet a little in the middle, dropping the weight to match but increasing the size of the icon. Icon looks really small on the button especially collapses to be on the smaller widths to only show the icon.

Home-
50. This should be the default for all regular buttons, e.g. not plain text ones. I've noticed other pages on the site with buttons like the About page's message me and shop the range buttons have the generic darken effect on them which is not consistent with these other buttons.
N14. Standardised hover CSS for all buttons should match 3 buttons if it matches their base colours:
A. Hero button 'SHOP SUNGLASSES' - Base colours bg white, black text - only lift
B. Hero button 'ADD YOUR PRESCRIPTION' - Base colours bg black, white text, white border - lift + brighten bg
C. Homepage bottom button 'Message me on Whatsapp' - Base colours black text and icon, green bg - only lift
51. Ok
52. Ok
53. Issue is inaccurate - Draft has normal image bg set, live has bg image set as parallax.
54 + 55. Incorrect - Mention the styles for the Whatsapp button in N14B. Go with that
56. I can't see any difference.
N15. See all reviews button is missing hover effect where the bg darkens.
N16. Add the 3 px lift to hover for both review buttons so they're consistent with all other site buttons.
N17. Remove the hover scale effect on the full Google Reviews block.
57. Prefill seems much better for UX
58. The hero's content has same staggered anim setup as nav drawer. Here's the animation CSS for the container that owns both buttons:
    animation: 0.9s ease 0.56s 1 normal both running rise;
    animation-duration: 0.9s;
    animation-timing-function: ease;
    animation-delay: 0.56s;
    animation-iteration-count: 1;
    animation-direction: normal;
    animation-fill-mode: both;
    animation-play-state: running;
    animation-name: rise;
    animation-timeline: auto;
    animation-range-start: normal;
    animation-range-end: normal;
}

The ease is also the only thing that changes in this case so the brands label at the top of the hero is 0.15s, the hero heading is 0.28s, the into paragraph is 0.42s and the last thing is the buttons' container.
59. Problem with matching the draft is that the swatches in one product card change the image for all product cards to go to that colour. I feel like it might make more sense to have it open the product page up with that colour option pre-selected. What is the standard/optimal/recommended setup?
60. This should be the standard for this site.
N16. An issue I noticed in the block editor is that this Best Sellers section is supposed to be a set of 8 products that are the best selling. But our homepage just has 8 individual product cards set to match the ones in the draft. We need to actually mirror the intended functionality here, not the visible products.
N17. The hero content is supposed to be in the bottom left of the image but the live's content is in the middle left. Which looks better? Can't decide whether to conform to draft or not.
N18. The draft bg overlay is much stronger than the live but I feel like I prefer the live's version. Only mentioning this as all of the discrepancies should have been caught so the measuring tool should be improved to pick this up like all the others.
N19. The plain text button's that say 'SEE EVERYTHING' and 'ALL 12 STYLES' - The underline is missing the gap it should have, the live's underline touches the text and also, the hover colour effect is missing.
N20. The shape section's bg colour isn't full width, it is limited to 1440 px.
N21. The shape tiles on the live version hasve a gradient shadow/tint sitting behind the tiles.
N22. Shape tiles have white border on normal and hover state, I think draft has no border on normal and black on hover. Both draft and live have correct shadows I think.
N23. Arrows in the Google review slider are missing the light blue bg hover colour.
N24. This isn't in the draft but the G reviews slider's G logos in each card should link to the original review right? Or am I overthinking it?

Shop-
61. Already addressed in homepage points, I think item 59
62. Turn it off but we should also make it accessible for clients to hide/show these settings if wanted.
63. Irrelevant - ignore it
64. Fix it - make the top sticky, just like the bottom of the filter drawer/modal
65. No idea what your fix does tbh. I think this has a cluster of issues that need a solution designed for all of them.
A. Polarised tag can't work like on draft as it escapes the card on smaller dimensions. But, the current way of dropping them down is ugly.
The polarised tag when it takes its own row looks because it's right aligned while all the other text is left aligned. Should either be stuck to the top right of the white part of product card or just left aligned.
B. The shop never falls back to single stacked product cards, it forces a 2 column row for even the most small screen widths. Need a reasonable responsiveness rule to tell when the stack should start. If it's based on px we can go with 400 px or whatever the mobile breakpoint is.
C. The price and RRP price need to be attached, at a certain width we have the price sit on its own line, then have the RRP under that on the same line next to the colour swatches which makes no sense.
66. I don't think it's needed since it shows the max price at the bottom right corner of the slider.
N25. When I choose a filter option like medium and then remove it on the live site's shop it breaks the filter block. The filter block then weirdly duplicates its gender section and then creates an empty section under each other section with a dropdown arrow on the left side of it.
N26. The whole of the product card should be a link to its page aside from elements with specific functions that override it e.g. The wishlist heart. Everything else should be clickable, but on the current product card only the image if added. The product card is a hyperlink to the product page aside from the wishlist - this is the proper ecommerce functionality for UX.
N27. Products with no reviews should just hide anything relating to reviews, not say 'No reviews yet' as it is broadcasting a lack of demand and/or trust. Should only mention reviews in a positive sense.
The top left bit on the product cards has athe brand name typed out, those on the draft site are just placeholder text. They are supposed to be replaced with the actual brand logos - ideally a horizontal form of it.

Product page-
67. Ok, but why are we using core/post-content?
68. Ok, adding an optional header bar as well as the padding control will be helpful.
69. Yeah, the draft's paddings for the modal are a flat 24px
70. To fix this hardcoded setup, why not replace it with the sgs/accordion block which has controls for all of this stuff.
71. Ok - do we need to set up a control or is something that gets coded in for each site in their product page template? Just interested
72. Ok
73. Ok
74 + 78 + 79. Only thing I prefer about the live whatsapp Card is the size of the whatsapp logo, everything else needs ot be updated to match the draft.
Also, for the hover animation I quite like it in the live. We can either keep it like that or standardise it to match the 3px lift the other buttons have across the site.
75 + 82. The live gallery thumbnails and swatch images do not work. I made placeholder images for 'https://darkcyan-grouse-898606.hostingersite.com/product/gucci-oversized-cat-eye/' - So, it has an image for all 3 colours. I set each image as the main image for the associated variation in the product data and saved it. Also, I've added the 2 extra variation images to the product gallery panel which sits under the product image panel.
- Even with all of this set up, there are no gallery thumbnails visible or images replacing the swatches in the colour picker. The only change is the basic main product pic changes when the associated colour is picked.
76. It does lift but it doesn't do it as smoothly/gently as the draft, it's much more abrupt/fast.
77. Ok
80. No, leave it. It looks good.
81. Think I refer to this in N29
83. Ok
84. True, I've checked by trying to tab through, the Option picker's first option is the only one accessible, on the next tab press it skips all of the other options to the next element/block. This is not just an issue for the size options, it also affects the colour options.
85. No
86. We're getting rid of the whole no reviews placeholder anyway. If there's nothing to show then skip anything to do with reviews.
87. So, the live site adds weight to the end page in the breadcrumbs. Which is better and are the breadcrumbs supposed to end at the brand of the glasses or the product name?
88. Which looks better? Pick 1
89. Ok
90. For now we don't need a specific note text colour, It can just match the colour of the regular button text so in this case it'd be white.
91. Ok
92. Already covered in N36
93. This is already covered in the bag drawer section's points. Lets remove our red basket notice and replace it with the toast from the draft.
94. Ok
95. Incorrect, the draft at full width has 4 columns too and both go down to a single column stacked at narrow screen widths.
N28. Size modal - Whatsapp CTA's heading and text is the wrong size, weight and line height.
N29. Also, the modal's close button has a coloured circle behind it on the live site. Not on the draft so it needs removing.
N30. Every place that the 3 sizes are mentioned, the bridge measurement has a little box on the left of it on the draft and live. Why does that exist and can you remove it or replace it with whatever it is supposed to represent?
N31. Hide the reviews panel on the product page if it doesn't have any yet. A lack of reviews is a negative trust signal so never mention them unless we have a positive claim.
N32. Accordion has many issues that should be resolvable easily by replacing it with an actual sgs/accordion block. Issues include:
A- Font size differences for headings and text across different platforms too.
B- An accordion item's heading area when hovered on and opened turns the bg colour white but the draft doesn't do that.
C- The draft accordion allows you to open all at the same time, but live accordion auto-closes any open when another is opened, forcing only 1 at a time.
D- Live accordion's open and close animation looks pretty sluggish. It looks like it moves to halfway in one move then moves the rest of the way after a short pause.
E- The draft animates the + symbol turning 45 degrees to become an x when an accordion item is opened and the opposite animation when closing it. The live doesn't animate it. It waits till the content reveal/hide animation is complete and then switches the symbol.
F- The open/close symbols on the accordion seem too small on the draft but too big on the live, can we adjust them to be in the middle of both.
N33A. Feel like we should either replace the written brand name at the top of the product page with the brand logo or keep it at the top and place it on the top left of the main product image.
N33B. Additionally, the save £x note is both on the top right of the main product image and on the right of the price, is it a good idea to keep both?
N34. Thought we decided to hide any empty penny values?
N35. Frame size buttons on the live product page should have the size letter centred like the draft. The live has the size letter aligned to the left with the first size number. - Also, remember that the weird box/square next to the middle measurement needs removing or fixing.
N36. Grey on a black bg on buttons is hard to read and doesn't look good: A- The selected size button, has a black bg colour, the size letter is white but the measurement numbers are grey.
B- On the 'ADD MY PRESCRIPTION'  button the 'from +£59' bit is in grey and needs to changed to white.
C- Not the exact same issue but related, the white button underneath for adding to bag without prescription has a really bad hover bg colour switch. Lets leave it white for the bg and leave the only hover effect for this button be the lift.
D- This was mentioned in an earlier point but, just to reiterate, the Whatsapp CTA's heading and text colour, weight and colour (maybe line height too) are inaccurate. Make sure the one on product page and the modal are accurate to the draft.
E- This is an improvement, not a fix. The link next to the size option picker 'Which size am I?' when hovered, please make the text and underline colour black
F- The Sizing tab also has a Which size am I? link - The issue with this one is the underline touches the bottom of the text on the live and is missing the gap, just switch the styling of this link to match exactly the styling of the link in point E.
N36- This is definitely the largest gap in the live site,
A- The Sizing diagram that we custom coded into the draft is completely missing. In the draft it has a front and side view with the product's measurements data connected to the relevant place on the diagrams.
B- This was supposed to be a custom code/feature built specifically for this site so it doesn't need to be built as a modular SGS block. Just needs inserting
C- You have 3 measurements in the sizing tab. There are 4 measurements in this section and one of your labels is inaccurate: 'LENS WIDTH', 'BRIDGE', 'LENS HEIGHT', 'TEMPLE'.
D- You put a small description under the measurement name, but there's a 3rd column, for the full description so it goes - measurement name, product's measurement value, description of what that measurement represents.
E- There is supposed to be a message underneath the table that says 'Every pair of glasses carries three numbers inside the arm, written as 56▫17 145 - lens width, bridge, then temple length. Lens height (41 mm here) matters for varifocals, which need depth to work. Compare them against a pair you already wear and you'll know instantly whether these will fit.'

Lens pop-up-
96. Ok
97. I disagree, it matches. I've checked.
98. Add to bag has square corners on draft and live.
N37. Btw, all of the steps aside from the last one should be able to go to the next step once you pick an option like in the draft. The continue buttons can be used for people that are going backwards and then going back to where they were without repicking their choices.
N38. The 'Frame only? Skip the lenses' link adds the frame to the bag in the draft but on the live version, it opens a pointless page that just adds another step to add it to the bag, Cut the extra step and have the skip the lenses link add it to the basket.

Lenses page-
99. Ok
100. Could be due to the margin/padding differences for the overall page
101. Ok
102. Ok - Also, the text for each point needs to align vertically with the number for its step.
103. Ok
N39. The live page's title is much lower than the draft. The margins and paddings are much different for the page container. This issue occurs on several other pages.
Draft:
Padding: Top=48, Bottom=90, Sides=52
Margin: Sides=128, Top/Bottom=0
Live:
Padding: Top/Bottom=104, Sides=52
Margin: Sides=85.2, Top/Bottom=0
N40. Also the gap between the button and the content above it is bigger than the draft. Similar to point 101.
N41. Choose a frame button should have lift animation on hover like all else on the site.

About-
104. No, the lift effect should be consistent across the site's buttons.
105. Ok
106. Ok
107. Ok
108. Think this is fine since it's consistent with the other whatsapp CTA buttons on the rest of the site.
109. Match the icon and text size from the homepage button.
N42. The N39 issue is applicable on here.

Help-
110 + 122. For all of this stuff on the accordion setup - please just refer to all of the accordion points I made for the one on the product page/
111. Ok
112. Ok
113. Don't care, as mentioned everywhere else both of these buttons fit the 2 homepage hero button's looks so they should also have the site-wide lift hover effect.
114. There are no pop-up whatsapp buttons or sentences on this page. Unless you're referring to the site wide floating button.
115. Not sure what this referring to but ok.
116. Ok
117. Ok, pretty sure this was covered in the product page points since this pop-up exists there.
118. Incorrect, I have tested it. It works across all of the buttons/elements you mentioned in this point.
119. Ok
120. Ok, fix it.
121. Ok
123. Yes, this point should be merged into the identical one in the product page section.
N43. The N39 issue is applicable on here.

Contact- 
124. Ok
125. Ok
126. Ok
127 + 138. Instead of matching the draft, make sure it's consistent with the other whatsapp CTA buttons on the rest of the site.
128. Not sure I agree with this. What do you mean by it, because the general column structure is identical between both.
129. Ok
130. Think we already have a point to cover this in the footer section, merge this point with that one.
131. Disagree - Colour does change slightly but that's not the focus. Have the hover effect mirror these 2 links: 'Review & hours'and '@eyecare.birmingham' - They're on the same page.
132 + 141. It's supposed to be a Google Map on live. We'll be switching to her actual Google Business profile once she has approved.
133. Ok
134. Ok
135. Ok
136. Ok
137. Ok
139. Ok, that's stupid, either fix it properly or switch to setting up normal links through a text block or something else.
140. The footer section has a point that deals with this by setting the content in the settings to have a line break.
142 - 145. Dealt with in N45

N44. The N39 issue is applicable on here.
N45. Our version of the contact form is pretty awful, all critiques are valid and should be addressed. However, there's one point that I want to change from the draft. The contact form is in its own row so it looks stupid to constrain it to half the page with nothing in the other column. Lets have this row only have 1 main column aside from in the form itself which will be most likely setup via the form CPT.

Checkout-
147. Ok
148. Ok
149. Ok
150. Ok
151. Ok
152. Ok, make sure they're easy to turn on and off and then leave the 3 all on.
153.  All seems fine
154. Totally redesign the checkout to fit this site's checkout draft page. Doesn't mean it needs to the setup for all future sites, it's a bespoke customisation.
155. The draft design sees better, lets go with that.

Confirmation-
156. Ok, lets go with the suggested framework part building fix.
157. Ok

Content and decisions not tied to one screen-
158. As mentioned in product section - I tested this by uploading extra images for the cats eyes product. It doesn't work properly.
159. Don't need a photo of Fatima anywhere on the site unless she requests it.
160. Keep
161. Which is better for SEO and AI discoverability? /seo  
162. Keep ours