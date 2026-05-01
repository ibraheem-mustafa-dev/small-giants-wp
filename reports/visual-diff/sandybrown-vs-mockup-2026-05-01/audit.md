# Sandybrown vs Mockup — Visual Fidelity Audit
- Date: 2026-05-01, Model: gemini-3.1-pro-preview
- Verdict: F - The live site has ignored the approved design, defaulting to boilerplate theme colours, omitting entire product sections, and leaving placeholder text in the footer.

## Header (logo, nav, CTA, cart, mobile toggle)
The live header completely fails to match the mockup. On desktop, the live site shows generic page titles ("Mamas Munches Homepage", "Sample Page") instead of the designed navigation ("Shop", "Our Story", etc.). The logo is missing, and there is no shopping cart icon or pink notification badge. On mobile, the header is empty except for a basic hamburger menu, stripping away all brand identity.

## Hero section (palette, headline, CTAs, decoration, layout)
The live hero section uses a default dark teal background (#0F7E80) instead of the approved coral pink (#E68A95). The crucial hero image of the cookies is completely missing on the live site. The buttons use default orange and teal styling rather than the brand's solid and outlined pink. The typography has drifted from the elegant serif in the mockup to a generic sans-serif.

## Trust signals row
The live implementation is missing the soft pink (#F5C2C8) background band. The icons on the live site are placed directly on a white background, lacking the white circular containers present in the approved mockup.

## Product feature ("Zookies") - present? layout?
Completely missing. The live site skips this entire section. There is no product card, no quantity selectors, no "Add to Cart" button, and no "The Trial Pack" card. This is a critical e-commerce failure.

## Story section
The layout is reversed. The mockup features text on the left and an image of a smiling mum on the right over a cream background (#FBF3DC). The live site places the text on the right and uses an incorrect image of boxed cookies on the left, all over a plain white background.

## Ingredients grid
The mockup displays the four ingredients (Oats, Brewer's Yeast, Flaxseed, Fenugreek) as distinct white cards sitting on a cream background. The live site removes the card styling entirely, presenting the text and icons directly on a plain white background, which ruins the visual separation.

## Gift section
The live site abandons the card-based layout for the "New Baby Gift Box" and "40-Day Care Bundle", displaying them as stacked plain text with teal buttons. The coral pink background is missing, and the "Heading to hospital?" banner has been completely omitted.

## Testimonials/Trustpilot - present?
Completely missing. The live site does not include the Trustpilot logo, the star rating, or the three customer review cards shown in the mockup.

## Footer (palette, layout, placeholder pollution)
The live footer is severely unpolished. It uses a dark navy background instead of the approved cookie brown (#8B6F4E). It is riddled with "Set in Settings > Business Details" placeholder text. The logo, social media buttons (Instagram, WhatsApp), and designed column layouts are entirely missing, replaced by generic "Quick Links".

## Cross-cutting findings
- Palette drift: The live site uses the SGS default teal (#0F7E80) and orange instead of the mockup's coral pink (#E68A95), cream (#FBF3DC), and soft pink (#F5C2C8).
- Typography drift: The live site relies heavily on a default sans-serif font, completely losing the elegant serif headings that give the brand its character.
- Mobile issues: The mobile layout is broken, with an empty header, missing sections, and unstyled text blocks.
- Placeholder pollution: "Set in Settings" placeholders are highly visible throughout the footer.

## Top 10 polish items (severity P0/P1/P2, location, fix-effort)
1. P0 - Global - Apply correct brand palette (coral pink, cream, cookie brown) instead of default teal/orange. (Low effort)
2. P0 - Homepage - Restore the missing "Zookies" product feature section. (High effort)
3. P0 - Homepage - Restore the missing Testimonials/Trustpilot section. (Medium effort)
4. P1 - Header - Fix navigation links and restore the logo and cart icon. (Low effort)
5. P1 - Footer - Remove "Set in Settings" placeholder pollution and apply correct layout. (Low effort)
6. P1 - Hero - Add the missing hero image of the cookies to the right column. (Low effort)
7. P1 - Typography - Update global fonts to match the serif headings from the mockup. (Low effort)
8. P2 - Story Section - Swap the layout order to match the mockup and use the correct image. (Low effort)
9. P2 - Ingredients - Style the 4 ingredients as white cards on a cream background. (Medium effort)
10. P2 - Gift Section - Restore the card layouts and add the "Heading to hospital?" banner. (Medium effort)

## What to preserve (3 things)
1. The core text content (headlines and body copy) for the hero, story, and ingredients sections has been migrated accurately.
2. The custom SVG icons for the ingredients (oats, brewer's yeast, flaxseed, fenugreek) are present and correct.
3. The trust signal icons (house, tick, van, star) in the band below the hero are correct.

## Final verdict: fidelity 15/100, grade F, ship-ready N, sessions to 90% 3