# Bean's Eye Care review list, 2026-11-08 (eye-care-test, darkcyan)

Bean's words, kept as written. This list is the work for the Eye Care stream, straight after Indus (plan `.claude/plans/2026-11-02-clone-finishing-streams.md`, "How an item is worked" and "Eye Care"): reproduce each item on eye-care-test beside the draft, find its root cause, fix it there, and check it by sight beside the draft before calling it done. Bean: "an exhaustive list that can be mostly patchwork fixes unless you find framework issues are causing some of these problems." Not yet reviewed by Bean: checkout, account (post sign-in), order confirmation / thank you; these pages get a side-by-side comparison with the draft in the same stream.

Bean's earlier notes (2026-11-07, his words): "I've had a look at the shop page and homepage as well as the header, mega menus and footer and the only issues I noticed so far were the width of the sections on the homepage, maybe padding, some hover animations, most of the reveal/open animation were missing/wrong."

1. When switching images on the buybox the live site is missing the animation as the main image switches.
2. The product FAQ accordions and normal accordions have lost the closing animation on the icon: it usually spins from a cross in the opposite direction of the opening animation, 45 degrees, going back to being a plus symbol. It also used to have a bounce effect which it has lost. This part is not in the draft but Bean really likes it (keep it).
3. On the help page the 2 naked links "SIZE GUIDE" and "CONTACT ME" are supposed to be identical to the naked links on the homepage, but the hover effect removes the underline and replaces it with a closer underline. It is supposed to keep it exactly the same but give it a lift animation.
4. The "WhatsApp me" link in the HELP mega menu does the standard underline animation but turns the text black; the underline should match the original green instead.
5. On the contact page the contact form is always supposed to fill the full width but it is confined to a left column on desktop. It just needs removing from whatever container sets it up as a grid item.
6. The phone, email, clinic and hours blocks should have the same white square box with its light grey border that turns black on hover behind them as the Google and Instagram blocks.
7. Those Google and Instagram blocks have one issue: when their links are hovered they turn the banned light grey, when they should stay black like all other links.
8. Choose whichever underline is better, the far-distance underline on phone and email or the directly-under-the-text underline on Google and Instagram, and make it consistent across all 4 of those blocks' hover effects.
9. The Send button on the contact form does not have the regular lift that all the other buttons across the site have.
10. The spacing and padding, especially vertically, on the My Account sign-in page is off.
11. When any modal or drawer is closed, or the page is reloaded, it jumps up a bit weirdly.
12. The nav drawer menu is very off:
    - Remove the small Google review pill from the nav drawer header (a bigger version sits much lower).
    - The 3 big menu items, when hovered, should just have the separator under them animate to black from left to right, like the regular menu item underline effect but for the full-width separator. Live lifts on hover, and when going back to normal it suddenly turns the separator black only to animate the black away, and it lowers the menu item.
    - The Google Review strip button under the menu has a weak hover: its border should switch to a brand-related colour like the Google blue; it just darkens the grey a little.
    - The bottom row has a duplicate: the middle button is a Google link, so remove it.
    - The call button's border should turn the brand's taupe preset colour and lose the lift, consistent with the other buttons in the drawer.
    - The bottom 2 remaining social media buttons should have exactly the same colours, normal and hover, as their 2 equivalents in the footer.
13. The cart block's bag icon button in the header loses its hover colour when it collapses into icon-only mode.
14. At that same low/mobile width the Eye Care logo in the header aligns right instead of centred in the strip, leaving a large gap between the burger and the logo.
15. Reminder: the vast majority of the entrance animations on this site are wrong or missing.
