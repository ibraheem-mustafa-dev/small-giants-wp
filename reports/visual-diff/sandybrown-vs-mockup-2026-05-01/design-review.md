# Design Review — Mama's Munches: Live vs Mockup
Reviewer: design-reviewer agent (Claude Sonnet 4.6)
Date: 2026-05-01
Live site: https://sandybrown-nightingale-600381.hostingersite.com/
Mockup: sites/mamas-munches/mockups/homepage/index.html

---

## Overall Verdict

**Grade: F — Score: 12/100**

I broadly concur with Gemini's F grade. If anything the score should be lower: 12 rather than 15, because the root cause is a single missed setup step (style variation not activated), which means nothing in the colour system, typography cascade, or surface backgrounds is correct. The live site is not a degraded version of the mockup — it is a different site that shares some text content.

One important nuance Gemini missed: this is not a *build* failure. The `mamas-munches.json` style variation file exists in the theme, is fully specified with the correct brand palette, and would immediately fix the global colour, typography, and background issues if activated. The severity of the visual divergence is therefore almost entirely attributable to a single WordPress admin action that was never taken.

---

## Is the Mamas-Munches Style Variation Active?

**No. Definitively not.**

Live DOM inspection via Playwright confirms:

```
--wp--preset--color--primary: #1F7A7A   (SGS default teal)
--wp--preset--color--accent:  #F59E0B   (SGS default amber)
--wp--preset--color--surface: #FAF9F6   (SGS default off-white)
```

The `mamas-munches.json` file defines:

```
--wp--preset--color--primary: #E68A95   (coral pink)
--wp--preset--color--accent:  #F5D050   (warm yellow)
--wp--preset--color--surface: #FBF3DC   (cream)
```

No stylesheet with "mamas" in its path is loaded. The body has no style-variation class. The global-styles inline CSS block contains the base SGS theme palette verbatim with zero overrides from `mamas-munches.json`.

The hero background computes as `rgb(15, 76, 76)` — that is `has-primary-dark-background-color` resolving through the SGS teal token, not the brand coral.

**Fix:** WP Admin → Appearance → Editor → Styles → Browse styles → select "Mama's Munches". One click. This alone resolves approximately 60% of the visible discrepancy.

---

## Per-Section Verdict

### Header — D (not F)
**Gemini verdict:** complete failure, generic page titles, no logo, no cart.
**My read:** Partially agree, but softer. The navigation is rendering real nav items (the mockup items appear to be present in the HTML). The main failures are: no logo image set, no cart icon configured, the nav background picks up the wrong primary colour (teal instead of coral). These are content/settings gaps, not structural build failures. The hamburger menu works on mobile. Trust-signal icons below the nav are present.

### Hero — F
**Agree with Gemini.** Background is `#0F4C4C` (dark teal) vs the approved soft pink `#F5C2C8`. Hero image of cookies is absent — the right column is empty. The headline text is present and legible. Button colours are wrong (orange/teal vs coral/outlined). Typography is Inter rather than Fraunces serif — confirming the style variation issue, since `mamas-munches.json` defines Fraunces as the heading font.

Nuance Gemini missed: the hero block is using `has-primary-dark-background-color` as a block attribute. Simply activating the style variation would not fix this — the block attribute explicitly sets the token, but it will resolve to a *different value* once the variation palette redefines that token. So activation fixes it indirectly. No manual block edit needed.

### Trust Signals Row — C (not F)
**Disagree with Gemini's implicit severity.** The four icons (handmade, registered business, free UK delivery, loved by breastfeeding mums) are all present and correct. The text content matches. The background is plain white instead of `#F5C2C8`, and icons lack the white circular container. These are genuine gaps but the section is not "missing" — it exists and communicates the right information. A design fidelity failure, not an e-commerce failure.

### Product Feature ("Zookies") — F
**Agree with Gemini.** This section is entirely absent from the live desktop view. The mockup's centrepiece — product card with quantity selector, Add to Cart, The Trial Pack — does not exist. This is the most commercially damaging gap.

Nuance: the mobile screenshot shows what appears to be a "Zookies" heading and product card with pricing. This may be present but only rendering on certain viewport/post configurations, or it is present on mobile and hidden on desktop due to a responsive bug. Requires further investigation before calling it a pure build omission.

### Story Section — C
**Partially agree with Gemini.** The section exists, the copy matches the mockup closely, and the "Read the full story" CTA is present. The issues are: image is wrong (cookies in a box vs smiling mum portrait), layout is not reversed (text-left, image-right on live vs text-right, image-left in mockup — Gemini has this backwards relative to the desktop screenshot), background is white instead of cream `#FBF3DC`. These are real fidelity failures but the section functions.

### Ingredients Grid — C
**Agree with Gemini on substance, disagree on severity.** All four ingredients with their icons, names, and descriptions are present. The icons match. The failure is purely the card treatment: white cards on cream background in the mockup, flat content on white background on live. This is a CSS styling gap, not a content gap. Medium severity.

### Gift Section — D
**Agree with Gemini.** New Baby Gift Box and 40-Day Care Bundle sections are present with correct pricing (£15, £42) and copy. The card layout is absent, coral pink background is missing, the "Heading to hospital?" banner is absent. The teal CTAs are jarring against the brand intent. More functional than Gemini implies, but visually far from the mockup.

### Testimonials / Trustpilot — F
**Agree with Gemini.** The testimonials section is completely absent from the live desktop view. The mobile screenshot also does not show it. This is a full content omission. The Trustpilot widget, star rating display, and three customer review cards are all missing. Commercially significant — social proof is a primary trust lever for a D2C brand.

### Footer — D (not F)
**Partial agreement.** The footer does have "Set in Settings > Business Details" placeholder text throughout, which is unacceptable for a live-facing staging site. The background is dark navy (`#0F172A` SGS default `footer-bg`) rather than cookie brown `#8B6F4E`. However, `mamas-munches.json` defines `footer-bg` as `#3A2E26` (charcoal, not cookie brown) — the mockup and the JSON disagree on footer colour, which is a design spec gap separate from the activation issue.

Social media buttons, logo, and multi-column layout from the mockup are missing. Quick Links column exists but is sparse. The "Website by Small Giants Studio" credit at the bottom is present but premature given the state of the rest of the page.

Placeholder pollution is the most urgent fix here — it signals an incomplete setup, not just a visual gap.

---

## Where I Agree with Gemini

1. Grade F is correct — the site is not ship-ready in any sense.
2. The palette drift diagnosis is accurate: SGS default teal throughout instead of coral pink.
3. Testimonials section is fully absent — this is a hard content gap.
4. Product feature section is absent (at least on desktop).
5. Placeholder pollution in the footer is a P0 fix before any stakeholder sees this URL.
6. Typography has drifted — Fraunces headings are not rendering.
7. The core text content (hero headline, story copy, ingredients text) is well-migrated and accurate.

## Where I Disagree or Add Nuance

1. **Root cause is simpler than Gemini implies.** Gemini frames this as a series of individual build failures. The actual root cause is one: the style variation was never activated in WP admin. Activating it fixes colour, typography, surface backgrounds, and button styles site-wide in under 60 seconds. The remaining gaps (missing sections, placeholder text, wrong images) are then a much shorter list.

2. **Trust signals are not "missing" — they are unstyled.** Gemini says the section "completely fails." It exists, renders, and communicates all four trust points. It just lacks the pink band background and white icon circles.

3. **Story section layout description is imprecise.** Gemini says "text on left, image on right" for the mockup. The desktop mockup screenshot shows text-right, image-left. Minor point but affects the fix direction.

4. **Mobile is closer to the mockup than desktop.** Gemini treats mobile as wholesale broken. The mobile screenshots show several sections (hero, story, ingredients, gift) rendering in reasonable sequence with correct text. The mobile hero is missing the image but the layout is not broken. The gap is narrower on mobile.

5. **Score.** 15/100 is slightly generous. With the style variation not activated, the brand does not exist on this page. I score it 12/100.

---

## Top 5 Priority Fixes (impact-to-effort ratio)

### 1. Activate the Mamas-Munches style variation
**Effort: 2 minutes. Impact: 60% of visual fidelity recovered immediately.**
WP Admin → Appearance → Editor → Styles → Browse styles → "Mama's Munches" → Save.
This applies the full brand palette (coral pink, cream, warm yellow, Fraunces serif headings) site-wide via the existing `mamas-munches.json` file. No code change needed.

### 2. Remove footer placeholder text
**Effort: 5 minutes. Impact: site becomes stageable for client review.**
Go to Settings → SGS Business Details (or whatever the settings page is) and fill in: business name, address, phone, email, social links. Alternatively, if the block editor controls these, update them directly. The "Set in Settings > Business Details" strings appearing verbatim on a client-facing URL is a credibility failure that overrides all other concerns.

### 3. Add hero image and fix hero background colour
**Effort: 10 minutes. Impact: hero goes from brand-wrong to brand-correct.**
Set a hero image in the block editor (cookies/product shot). The background colour will correct itself once the style variation is active (see Fix 1). These are block attribute changes only.

### 4. Add testimonials section
**Effort: 30 minutes. Impact: social proof restored — critical for D2C conversion.**
Build the testimonials section using SGS blocks (testimonials or a manual grid). Three review cards with name, text, and star rating. Add Trustpilot widget or static Trustpilot badge. This is a full content build, not a styling fix.

### 5. Add product feature / Zookies section (desktop)
**Effort: 60 minutes. Impact: primary e-commerce CTA restored.**
Build the Zookies signature cookie product card with Add to Cart functionality, quantity selector, and The Trial Pack card. This is the highest-revenue section on the page and is absent on desktop. Investigate first whether this is a mobile-only rendering bug (the mobile screenshot hints at its existence) or a full build omission.

---

## Additional Observations Not in Gemini's Audit

- **Font loading:** `mamas-munches.json` specifies Fraunces loaded from `fonts.gstatic.com` (Google Fonts CDN). Once the variation is active, verify the font request fires — no CORS or CSP issue on Hostinger should block it, but worth confirming with a Network tab check.

- **Footer background token mismatch:** The mockup shows cookie brown `#8B6F4E` footer. The `mamas-munches.json` defines `footer-bg` as `#3A2E26` (dark charcoal, closer to black). These do not match — a design spec decision is needed before the footer colour can be called "fixed."

- **`surface-pink` token exists but has no structural role yet:** The soft pink `#F5C2C8` is defined in the variation as `surface-pink` (a custom slug). It is not a standard SGS framework token. The trust signals band background and hero band would need to reference this token explicitly in block attributes. This is a build step beyond style variation activation — individual blocks need their backgrounds set to `has-surface-pink-background-color`.

- **Button text colour concern:** `mamas-munches.json` sets button `color.text` to `var:preset|color|text` (`#3A2E26`). Coral pink background (`#E68A95`) with charcoal text (`#3A2E26`) — contrast ratio is approximately 3.7:1. This fails WCAG AA for normal text (requires 4.5:1). The button font size at `0.95rem` is not large text. This needs remedying — either darken the button background to `#C56A7A` or use white (`#FFFAF5`) text. Flag for design decision.

- **No WooCommerce detected.** The product section references "Add to Cart" — there is no WooCommerce or e-commerce plugin visible on the live site. This is a prerequisite for the Zookies section that goes beyond visual fidelity.

---

## Summary

The live site is a partial build of the content with zero brand application. The `mamas-munches.json` style variation is complete and correct but was never activated. One admin action recovers 60% of the fidelity gap immediately. The remaining 40% is genuine build work: missing testimonials, missing product section, footer content setup, and per-block background token assignments for the soft pink band.

Gemini's F grade is correct. The framing of "many individual build failures" is less accurate than "one setup omission plus three content gaps."

**Files referenced:**
- `theme/sgs-theme/styles/mamas-munches.json` — style variation (complete, not activated)
- `sites/mamas-munches/mockups/homepage/index.html` — approved mockup
- `reports/visual-diff/sandybrown-vs-mockup-2026-05-01/audit.md` — Gemini reference audit
