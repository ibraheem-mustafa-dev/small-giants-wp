# SGS Block Test - Visual QA Stage 2 Brief

## Page: Block Test (/block-test/)

### Mobile
**Visual Summary:** The mobile experience presents a functional but structurally uneven foundation, severely marred by overlapping form labels and missing component rendering.
**Strengths:**
1. Navigation and CTAs (like the WhatsApp button) are generously sized and accessible for touch.
2. The Certification Bar gracefully collapses into a neat, proportional 2x2 grid.
3. Typography scaling on headings remains legible and maintains strong visual hierarchy.
**Polish Items:**
1. Fix the critical spacing issue causing form labels to render directly on top of placeholders.
2. Add vertical breathing room between stacked pricing cards and form elements.
3. Remove raw CSS strings (`style="color:var(--wp-preset-color-text)"`) leaking into the Pricing Table UI.

### Desktop
**Visual Summary:** Desktop layout feels excessively stark due to missing assets and raw code leaks, failing to achieve the target premium Independent Business persona.
**Strengths:**
1. The Countdown Timer and Team Member blocks display excellent horizontal rhythm and whitespace usage.
2. The Table of Contents provides a crisp, well-structured nested list.
3. The Announcement Bar spans cleanly across the viewport without awkward padding.
**Polish Items:**
1. Fix the CSS string leak in the Pricing Table to restore a professional appearance.
2. Resolve the form field floating labels overlapping placeholder text.
3. Implement maximum width constraints on the "How Would You Prefer to Order?" grid to prevent awkward stretching.

### Spec-Fidelity Concern
Typography and hierarchy are critically compromised in interactive zones. Form fields have broken floating labels overlapping placeholders, rendering them illegible. The pricing table is leaking raw CSS text into the user interface. Missing component contents (Process Steps, Testimonial) indicate rendering or shortcode failures that break the intended structural rhythm.

---

## Block by Block Breakdown

**1. Announcement Bar**
*   **Grade:** B
*   **Strengths:** Clean colour contrast; clear typography.
*   **Polish to lift to A:** Add a subtle hover state or icon to make it feel less like a raw div.
*   **Cross-breakpoint consistency:** Scales well across viewports.
*   **Comparison anchor:** Kadence includes an optional dismiss button and subtle gradient options.

**2. Certification Bar**
*   **Grade:** A
*   **Strengths:** Perfect 2x2 grid reflow on mobile; clean border radius on badges.
*   **Polish to lift to A:** Add a subtle drop shadow to the badges to lift them off the grey background.
*   **Cross-breakpoint consistency:** Adapts seamlessly from row to grid.
*   **Comparison anchor:** Matches GenerateBlocks Pro grid controls.

**3. Counter (Animated Number)**
*   **Grade:** B
*   **Strengths:** Bold, impactful teal typography; mobile touch target fix is verified.
*   **Polish to lift to A:** The alignment between the number and the "Product Lines" label feels slightly loose; tighten the gap.
*   **Cross-breakpoint consistency:** Scales well.
*   **Comparison anchor:** Kadence allows prefix/suffix styling distinct from the number.

**4. Decorative Image**
*   **Grade:** F
*   **Strengths:** Heading renders correctly.
*   **Polish to lift to A:** The block is completely empty aside from a yellow divider. Needs image rendering.
*   **Cross-breakpoint consistency:** N/A (Broken).
*   **Comparison anchor:** Spectra provides fallback placeholder graphics.

**5. Gallery (Grid Layout)**
*   **Grade:** C
*   **Strengths:** Clear empty-state placeholder text and icon.
*   **Polish to lift to A:** Needs real image testing to grade layout; empty state feels a bit unstyled.
*   **Cross-breakpoint consistency:** Consistent empty state.
*   **Comparison anchor:** Kadence natively styles empty states with brand colours.

**6. Google Reviews**
*   **Grade:** B
*   **Strengths:** Good text hierarchy for reviewer names and dates; clean star iconography.
*   **Polish to lift to A:** Text avatars (A, J, S) need proper circular backgrounds with brand colours; currently they look like stray letters.
*   **Cross-breakpoint consistency:** Padding wraps well.
*   **Comparison anchor:** Spectra auto-generates coloured initial-avatars if images fail.

**7. Heritage Strip**
*   **Grade:** C
*   **Strengths:** The dot-pattern background adds a premium texture.
*   **Polish to lift to A:** Fix the WCAG contrast issue on the "EST. 1962" badge; add more padding inside the container.
*   **Cross-breakpoint consistency:** Box structure holds up on mobile.
*   **Comparison anchor:** Kadence allows overlay gradients on patterns.

**8. Icon Block (Single Icon)**
*   **Grade:** B
*   **Strengths:** Crisp SVG rendering.
*   **Polish to lift to A:** Feels isolated; needs an optional background shape or circular container to give it weight.
*   **Cross-breakpoint consistency:** Consistent.
*   **Comparison anchor:** GenerateBlocks allows multi-layer icon backgrounds.

**9. Icon List**
*   **Grade:** A
*   **Strengths:** Perfect vertical rhythm; crisp checkmarks align perfectly with multi-line text.
*   **Polish to lift to A:** Add a subtle hover colour shift to the list items.
*   **Cross-breakpoint consistency:** Wraps perfectly.
*   **Comparison anchor:** Matches Kadence list block natively.

**10. Modal (Popup Dialogue)**
*   **Grade:** B
*   **Strengths:** Clear CTA trigger button using primary blue.
*   **Polish to lift to A:** Add a subtle icon (like an expanding arrow) to indicate it opens a dialogue.
*   **Cross-breakpoint consistency:** Standard button scaling.
*   **Comparison anchor:** Spectra includes modal trigger entrance animations.

**11. Notice Banner**
*   **Grade:** A
*   **Strengths:** Excellent use of light blue background for the informational state; icon alignment with text is perfect.
*   **Polish to lift to A:** Already solid; could use an optional dismiss toggle.
*   **Cross-breakpoint consistency:** Good padding on all devices.
*   **Comparison anchor:** Beats Kadence with better default icon spacing.

**12. Post Grid**
*   **Grade:** C
*   **Strengths:** Empty state is well-formatted and aligned.
*   **Polish to lift to A:** Unable to grade the actual grid design without content.
*   **Cross-breakpoint consistency:** N/A.
*   **Comparison anchor:** N/A.

**13. Pricing Table**
*   **Grade:** D
*   **Strengths:** The "Monthly / Yearly" toggle switch is visually clear.
*   **Polish to lift to A:** Fix catastrophic CTA contrast (white on gold); remove raw CSS string leak (`style="color:var(--wp-preset-color-text)"`) above features.
*   **Cross-breakpoint consistency:** Stacks correctly on mobile, but vertical padding is tight.
*   **Comparison anchor:** Spectra pricing tables have bulletproof contrast defaults and never leak CSS.

**14. Process Steps**
*   **Grade:** F
*   **Strengths:** Heading renders.
*   **Polish to lift to A:** Block content is entirely missing, leaving only a divider.
*   **Cross-breakpoint consistency:** N/A.
*   **Comparison anchor:** Kadence handles empty process steps gracefully.

**15. SVG Background Container**
*   **Grade:** B
*   **Strengths:** Renders large SVGs cleanly without causing horizontal scrolling.
*   **Polish to lift to A:** SVG stroke width feels too heavy on mobile compared to desktop; ensure stroke scales proportionally.
*   **Cross-breakpoint consistency:** Scales down but loses stroke elegance.
*   **Comparison anchor:** GenerateBlocks allows intricate control over SVG scaling.

**16. Table of Contents**
*   **Grade:** A
*   **Strengths:** Crisp, perfectly indented nested list structure; clean typography.
*   **Polish to lift to A:** Add a subtle background colour or left-border line to encapsulate the block.
*   **Cross-breakpoint consistency:** Wraps nicely without breaking indentation.
*   **Comparison anchor:** Matches Spectra's TOC standard.

**17. Testimonial (Single Card)**
*   **Grade:** F
*   **Strengths:** Heading renders.
*   **Polish to lift to A:** Content is completely missing.
*   **Cross-breakpoint consistency:** N/A.
*   **Comparison anchor:** N/A.

**18. WhatsApp CTA (Inline)**
*   **Grade:** A
*   **Strengths:** Strong, recognisable brand green (`#25d366`); good icon-to-text ratio.
*   **Polish to lift to A:** Add a subtle hover lift or pulse animation.
*   **Cross-breakpoint consistency:** A full-width mobile option would improve touch targets.
*   **Comparison anchor:** Matches industry standards.

**19. Form - Contact Enquiry (All Field Types)**
*   **Grade:** D
*   **Strengths:** Comprehensive field types; good border radius on inputs.
*   **Polish to lift to A:** Fix severe label/placeholder overlap ("Full NameSmith"); fix harsh red borders on radio buttons; constrain width of the "How Would You Prefer to Order?" grid on desktop.
*   **Cross-breakpoint consistency:** Fields stack fine on mobile, but overlap issue breaks the UI everywhere.
*   **Comparison anchor:** Fluent Forms or Kadence Forms have perfect label states out of the box.

**20. Form - Multi-Step Trade Account Application**
*   **Grade:** D
*   **Strengths:** The numeric step indicator (1, 2, 3) is visually clean and well-spaced.
*   **Polish to lift to A:** Same catastrophic label/placeholder overlap; the "Next" button lacks the visual weight of other CTAs.
*   **Cross-breakpoint consistency:** Step indicator scales beautifully to mobile.
*   **Comparison anchor:** Kadence multi-step forms have better transition animations and no text overlaps.

**21. Countdown Timer**
*   **Grade:** A
*   **Strengths:** Excellent visual hierarchy; the numbers pop and labels are perfectly muted.
*   **Polish to lift to A:** Add a subtle container card or background tint to group them tighter.
*   **Cross-breakpoint consistency:** Great flex-wrapping on mobile.
*   **Comparison anchor:** Beats Spectra with cleaner typography defaults.

**22. Star Rating**
*   **Grade:** B
*   **Strengths:** Good alignment between stars and rating text.
*   **Polish to lift to A:** The yellow (`#d8ca50`) on a white background lacks contrast; use a deeper gold for the fill.
*   **Cross-breakpoint consistency:** Consistent.
*   **Comparison anchor:** Matches Kadence.

**23. Team Member**
*   **Grade:** A
*   **Strengths:** Clean, professional layout; text hierarchy (Name -> Role -> Bio) is perfect.
*   **Polish to lift to A:** Needs an image placeholder; a subtle card shadow would elevate the premium feel.
*   **Cross-breakpoint consistency:** Good text wrapping.
*   **Comparison anchor:** Spectra includes social icons natively in team blocks.

**24. Social Icons**
*   **Grade:** B
*   **Strengths:** Clean, minimalist line-art style.
*   **Polish to lift to A:** Add a hover state with brand colour fill; ensure touch targets are strictly 44px minimum on mobile.
*   **Cross-breakpoint consistency:** Good.
*   **Comparison anchor:** Standard execution.

**25. Breadcrumbs**
*   **Grade:** B
*   **Strengths:** Subtle, maintains proper page hierarchy context.
*   **Polish to lift to A:** The slashes (/) could be lighter or swapped for SVG chevrons (>) for a more modern look.
*   **Cross-breakpoint consistency:** Wraps correctly.
*   **Comparison anchor:** Yoast/Kadence breadcrumbs typically use chevrons.

**26. Back to Top**
*   **Grade:** F
*   **Strengths:** None.
*   **Polish to lift to A:** No visible trigger or button rendered below the heading.
*   **Cross-breakpoint consistency:** N/A.
*   **Comparison anchor:** Kadence has a floating persistent option natively.

**27. Accordion**
*   **Grade:** A
*   **Strengths:** Clean borders, elegant chevron icons; great padding inside rows.
*   **Polish to lift to A:** Add a subtle background colour change on hover or active state.
*   **Cross-breakpoint consistency:** Stretches nicely on both viewports.
*   **Comparison anchor:** Beats Spectra's default heavy borders.

**28. Tabs**
*   **Grade:** C
*   **Strengths:** Clear typography.
*   **Polish to lift to A:** On desktop, tab triggers look like stacked input fields rather than connected tabs; they lack a unified container connecting them to the content area.
*   **Cross-breakpoint consistency:** Stacks vertically, completely losing the "tab" metaphor on mobile.
*   **Comparison anchor:** Kadence Tabs use true horizontal scroll or seamless accordion fallbacks on mobile.

**29. Icon Block (sgs/icon-block)**
*   **Grade:** B
*   **Strengths:** Simple, functional rendering of the star icon.
*   **Polish to lift to A:** Identical to the previous icon block; needs background options for versatility.
*   **Cross-breakpoint consistency:** Good.
*   **Comparison anchor:** N/A.

**30. Extension Tests**
*   **Grade:** B
*   **Strengths:** Text confirms the extensions are firing correctly.
*   **Polish to lift to A:** Cannot fully verify animation/hover effects from a static screenshot, but the UI text rendering is clean.
*   **Cross-breakpoint consistency:** Device visibility text successfully confirms mobile-only behaviour.
*   **Comparison anchor:** N/A.

---

## Cross-Cutting Audit

**WCAG 4.5:1 concerns by eye:**
*   Yellow stars in Star Rating block (`#d8ca50` on `#ffffff`) are likely too light.
*   Footer business hours are `#424242` on `#2c3e50` (effectively invisible).
*   Yellow horizontal dividers (`#d8ca50` on white) used throughout the page may fail the 3:1 contrast rule for structural UI elements.
*   The red borders on the form radio buttons ("Preferred Delivery Frequency") lack sufficient contrast and clash with the palette.

**Hard exclusion violations:**
*   Form label and placeholder overlap ("Full NameSmith") makes inputs completely illegible, excluding visually and cognitively impaired users.

**Design system consistency (palette drift, typography drift, spacing drift):**
*   Palette drift: The red radio button borders look like browser default error states rather than the Indus palette.
*   Typography drift: Raw CSS variables (`var(--wp-preset-color-text)`) are leaking as raw text into the Pricing Table.
*   Spacing drift: Sections with missing content (Decorative Image, Process Steps, Testimonial, Gallery) create awkward dead zones, breaking vertical rhythm.

**ADHD glanceability score per page:**
*   **Mobile:** 4/10. The severe form overlaps and raw CSS leaks cause immediate cognitive friction and confusion.
*   **Desktop:** 5/10. Better spacing, but the broken components make the page feel unfinished and distracting.

**Persona lens (Premium-independent-business):**
*   Fails. The leaking code, broken forms, and missing components make the application feel like an unpolished staging site rather than a premium wholesale supplier platform.

---

## Final Verdict

**Overall Grade:** D

**Top 10 polish items ranked by impact:**
1. Fix the catastrophic floating label vs. placeholder overlapping in all Forms.
2. Remove the raw CSS string leak (`style="color:var(--wp-preset-color-text)"`) in the Pricing Tables.
3. Fix the known contrast failure on the Trade CTA button (white text on `#d8ca50` gold).
4. Restore missing component rendering for Process Steps, Testimonial, Decorative Image, and Back to Top.
5. Fix the known contrast failure in the Footer Business Hours (`#424242` on `#2c3e50`).
6. Fix the "EST. 1962" badge contrast (`#0a7ea8` on `#e7d768` is only 3.13:1).
7. Unify the card visual language (give Pricing, Team Member, and others a consistent border radius and shadow).
8. Style the raw text avatars in Google Reviews to look like intentional coloured circles.
9. Fix the styling of the Tabs block so they look like connected tabs rather than stacked input fields.
10. Correct the red border on the form radio buttons to align with the Indus brand palette.

**3 things to PRESERVE:**
1. The excellent mobile 2x2 grid reflow of the Certification Bar.
2. The clean, professional typography scaling and horizontal rhythm of the Countdown Timer.
3. The crisp execution and formatting of the Table of Contents nested list.