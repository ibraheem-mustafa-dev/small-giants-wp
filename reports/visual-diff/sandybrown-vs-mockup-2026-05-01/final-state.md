# Sandybrown — Post-Fix State Report

**Date:** 2026-05-01
**Live URL:** https://sandybrown-nightingale-600381.hostingersite.com/

## Starting state

- **Gemini grade:** F (15/100)
- **Sonnet design-reviewer grade:** F (12/100)
- **Root cause:** Mama's Munches style variation never activated. Default SGS teal palette in use.

## Fixes applied this session

| # | Fix | Method | Impact |
|---|-----|--------|--------|
| 1 | Activated Mama's Munches style variation | Site Editor → Browse styles → Mama's Munches → Save | Coral pink + cream + Fraunces serif palette now live |
| 2 | Populated Business Details (name, tagline, email, city, country, Instagram) | WP-CLI option update | Footer placeholders cleared |
| 3 | Uploaded + set custom logo | wp media import + theme mod | Header now shows brand logo |
| 4 | Updated site title + tagline | wp option update blogname + blogdescription | Page title now "Mama's Munches – Real food for real mums" |
| 5 | Cleared LiteSpeed page + CSS cache | rm -rf wp-content/litespeed/* | Style variation actually visible on frontend |

## What the live site looks like NOW

**Recovered (versus the F grade):**
- ✅ Coral pink hero band (#E68A95)
- ✅ Cream surface (#FBF3DC)
- ✅ Pink serif headings (Fraunces)
- ✅ Cookie brown footer (#8B6F4E)
- ✅ Mama's Munches logo in header
- ✅ Email, Instagram, address fields populated in footer
- ✅ Buttons in coral pink (Read the full story, Shop Gift Box, Shop Bundle)
- ✅ Yellow "Shop Zookies" CTA matches mockup
- ✅ Mobile view rendering brand palette correctly

**Estimated new fidelity:** ~65/100 (up from 12-15/100). Grade C+/B-.

## What remains to reach 90% fidelity

| # | Gap | Severity | Effort |
|---|-----|----------|--------|
| 1 | Zookies product feature section missing (primary revenue CTA — £10 cookies + £5 trial pack with variant pills + Add to Cart) | P0 | 30-45 min |
| 2 | Testimonials/Trustpilot section missing (3 customer review cards + Trustpilot logo + star rating) | P0 | 20-30 min |
| 3 | Trust signals row needs soft pink (#F5C2C8) band background | P1 | 5 min CSS |
| 4 | Ingredient cards need white card containers on cream (currently flat text) | P1 | 10 min CSS |
| 5 | Gift section needs card containers + soft pink background section | P1 | 15 min CSS |
| 6 | Hero needs cookies-on-pink-circle decoration on right side at desktop | P2 | 20 min |
| 7 | Story section needs mum-with-cookies image instead of cookies-in-tray | P2 | 5 min (replace media) |
| 8 | Header nav menu — needs a designed Mama's Munches menu (Shop, Our Story, Send to Ward CTA pill, Gift Ideas, FAQs) instead of WP page list defaults | P2 | 10 min |
| 9 | Add to Cart shopping basket icon in header (top-right) | P2 | 15 min (needs ecom plugin context) |
| 10 | "Heading to hospital? Ask us about our Send to Ward delivery" callout banner missing | P3 | 10 min |

**Total estimated effort to reach 90%: 2-3 hours of focused work.**

## Outstanding design decision (not blocking)

**WCAG AA contrast on coral pink buttons.** Both the mockup and the live site use coral pink (#E68A95) buttons with charcoal/white text — contrast is ~3.0-3.5:1, fails WCAG AA for body text (needs 4.5:1).

Three options for Bean:
1. **Keep as designed** — accept the contrast hit (most decorative buttons get away with this; AA Large still passes)
2. **Darken primary-dark for buttons** — use #B85F70 or darker for button bg (changes brand feel)
3. **Use white pills with pink text + thicker borders** — matches the "Try 3 for £5" outlined style consistently across the site

## Files changed in this session

- `theme/sgs-theme/parts/header.html` — top-bar removed, hamburger now uses sgs/mobile-nav-toggle block
- `theme/sgs-theme/patterns/header-indus-foods.php` — preserves original Indus header with top bar
- `theme/sgs-theme/patterns/footer-indus-foods.php` — preserves original Indus footer
- `theme/sgs-theme/patterns/header-mamas-munches.php` — fixed (was using fictitious sgs/header block)
- `theme/sgs-theme/patterns/footer-mamas-munches.php` — fixed (was using fictitious sgs/footer block)
- `theme/sgs-theme/parts/footer.html` — generic quick links + neutral directions URL
- `plugins/sgs-blocks/src/blocks/mobile-nav-toggle/` — new block (block.json, edit.js, index.js, render.php, style.css)
- `reports/visual-diff/sandybrown-vs-mockup-2026-05-01/audit.md` — Gemini Pro Vision audit
- `reports/visual-diff/sandybrown-vs-mockup-2026-05-01/design-review.md` — Sonnet design-reviewer second-opinion
- `reports/visual-diff/sandybrown-vs-mockup-2026-05-01/final-state.md` — this report

## DB-only changes on sandybrown server

None of these are in git (DB state, not files):

- `wp_global_styles` post 7 → populated with mamas-munches.json contents
- `sgs_business_*` options (name, tagline, email, city, country)
- `sgs_social_instagram` option
- Theme mod `custom_logo` = 10 (Mama's Munches Horizontal Logo)
- `blogname` and `blogdescription` updated
- Logo uploaded to `wp-content/uploads/mamas-munches-logo.webp`

These do NOT propagate to other sites (palestine-lives, etc) — they are sandybrown-specific WP state.
