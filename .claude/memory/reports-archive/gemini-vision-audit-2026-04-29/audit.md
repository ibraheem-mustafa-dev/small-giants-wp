# SGS WordPress Framework - Design System Visual Audit

## Page: SGS Block Test (/block-test/)

**Mobile**
- **Summary:** The mobile viewport is critically compromised by severe horizontal overflow, causing content clipping and breaking the responsive structure entirely.
- **Strengths:** 
  1. The Indus brand palette (#0a7ea8 and #d8ca50) is accurately applied.
  2. The typography scales down cleanly.
  3. Block headings maintain a strong visual hierarchy.
- **Polish items:** 
  1. Resolve the horizontal overflow in the top bar (the contact buttons break the viewport width).
  2. Fix the flex or grid wrapping on the Certification Bar so badges stack neatly instead of bleeding off-screen.
  3. Prevent the headings (like "Counter") from truncating on the right edge.

**Desktop**
- **Summary:** The desktop layout establishes a clean baseline with correct brand colours, but suffers from basic CSS clipping and unpolished default states.
- **Strengths:** 
  1. The Certification Bar establishes a solid, premium structural foundation.
  2. The gold dividers provide a nice visual anchor.
  3. Good contrast on the primary Announcement Bar text.
- **Polish items:** 
  1. Fix the vertical text clipping on the Counter block subtitle ("Product Lines" is cut off).
  2. Refine the active state on the primary navigation ("Home" has an unpolished, blocky solid fill).
  3. Integrate the Announcement Bar to span full width or sit flush with the layout, rather than floating awkwardly below a heading.

**Spec-fidelity concern:** 
Touch targets on the desktop top-bar pills appear smaller than the mandated 44x44px minimum, and the horizontal scrolling on mobile directly violates the "mobile-first - works at 375px without compromise" principle.

### Block-by-Block Evaluation

**Announcement Bar**
- **Grade:** C
- **What's strong:** Passes WCAG contrast easily (white on #0a7ea8); clear Inter typography.
- **What's weak:** Placed arbitrarily in the content column rather than spanning full viewport width; feels like a standard paragraph block rather than a structural alert.
- **Comparison anchor:** Falls behind Spectra's notice blocks, which offer full-width structural integration by default.
- **Hover state:** N/A (static display).

**Certification Bar**
- **Grade:** C
- **What's strong:** Excellent use of the pill aesthetic for accreditations; clean background separation.
- **What's weak:** Causes severe horizontal overflow on mobile; the outer border feels slightly disconnected from the inner pill borders.
- **Comparison anchor:** Matches Kadence visually on desktop, but fails technically on mobile responsiveness.
- **Hover state:** Not visible, but if linked, the badges should employ a subtle transition to #075E80.

**Counter (Animated Number)**
- **Grade:** D
- **What's strong:** The primary number uses the primary brand colour boldly with strong typographic impact.
- **What's weak:** Critical CSS failure with vertical clipping on the "Product Lines" text below the number; mobile heading is truncated.
- **Comparison anchor:** Fails against Kadence Pro and GenerateBlocks due to the container clipping bug.
- **Hover state:** N/A.

## CROSS-CUTTING AUDIT

- **WCAG 4.5:1 concerns:** The "OUR ACCREDITATIONS" label in the Certification Bar uses a muted grey (text-muted) that appears to risk falling below the 4.5:1 ratio against the background tint.
- **Hard exclusion violations:** The Counter block exhibits vertical clipping, pointing to malformed CSS line-heights or fixed container heights. The layout violates the core responsive requirements.
- **Design system consistency:** The palette application is consistent across blocks, but the vertical spacing rhythm feels disjointed. The gold dividers sit too tight to the headings below them, lacking the "generous whitespace" mandated by the brief. The navigation active state feels disconnected from the premium aesthetic.
- **Interactive cards coherence:** The 5 interactive cards (Card Grid, Info Box, CTA Section, Team Member, Pricing Table) are not visible in the provided viewport screenshots, so their coherence cannot be evaluated in this pass.
- **ADHD glanceability score:** 4/10. The horizontal overflow on mobile and text clipping on desktop create visual friction that immediately distracts the eye from the core content.
- **Persona lens:** The target "premium independent business" feel is undermined by layout bugs. A premium brand must render flawlessly on mobile; the current overflow issues make it feel like a draft rather than a polished product.

## FINAL VERDICT

- **Overall grade:** D
- **Top 10 polish items ranked by impact:**
  1. Resolve the global horizontal overflow on the mobile viewport (affecting top bar and Certification Bar).
  2. Fix the vertical text clipping on the Counter block subtitle ("Product Lines").
  3. Implement proper flex-wrap properties for the Certification Bar badges on mobile.
  4. Ensure all touch targets, particularly the top bar contact pills, meet the 44x44px minimum.
  5. Redesign the primary navigation active state to feel premium (replace the default blocky fill).
  6. Increase vertical margin below the gold dividers to establish a generous spacing rhythm.
  7. Integrate the Announcement Bar as a full-width structural element rather than an inline block.
  8. Check and adjust the contrast ratio on the "OUR ACCREDITATIONS" subheading.
  9. Add wrapping or stacking rules for the mobile top bar elements to prevent viewport breaking.
  10. Verify line-height on all headings to prevent any future truncation.
- **3 things to PRESERVE:**
  1. The accurate and confident application of the Indus brand palette (#0a7ea8 primary and #d8ca50 accent).
  2. The clean, pill-based visual direction for the Certification Bar badges.
  3. The strong typographic scale and hierarchy between section titles and block content.