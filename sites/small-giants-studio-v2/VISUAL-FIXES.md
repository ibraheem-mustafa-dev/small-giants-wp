# Visual Fixes — 12 Feb 2026

Issues found from reviewing the live deployment at small-giants-studio.vercel.app.

## Issue Tracker

| # | Issue | Severity | Component | Fix Applied | Status |
|---|-------|----------|-----------|-------------|--------|
| V1 | Logo letter holes filled white (brightness-0 invert hack) | Critical | Logo.tsx | Removed brightness-0 invert. Footer uses LogoText. Header uses mix-blend-multiply (light) + LogoText (dark). | Fixed |
| V2 | Wave divider white tear line between sections | High | FishTank, USPs, Testimonials, CTA | Changed `-translate-y-full` to `-translate-y-[calc(100%-2px)]` for 2px overlap. Fixed USPs wave fill from primary-50 to primary-900 (was wrong colour — should match MidCTA above). CTA wave now uses className-based fill with dark: variant. | Fixed |
| V3 | Hero SVG giant invisible — blends into teal background | High | Hero.tsx | Doubled opacity from 0.11 to 0.22 (body) and 0.09 to 0.18 (arms). Shadow-grow animation endpoints updated to match. | Fixed |
| V4 | Hero SVG connection lines not rendering between nodes | High | Hero.tsx | strokeDasharray and strokeDashoffset increased from 100 to 200. Longest line (Marketing→Operations) is ~160 units — 100 was too short, causing incomplete rendering. | Fixed |
| V5 | FishTank callout box invisible on light mode | High | FishTank.tsx | Added `border border-primary-300 shadow-sm dark:border-primary-700`. Improved text contrast with separate light/dark colour values. | Fixed |
| V6 | USP cards invisible/no visible boundary on light mode | High | USPs.tsx | Changed `border-border` to `border-primary-200 shadow-sm dark:border-primary-800` for visible card boundaries. | Fixed |
| V7 | Testimonials section green background on dark mode | High | Testimonials.tsx | Added `dark:bg-background` override so dark mode uses proper dark surface colour instead of overridden primary-50 (#0D1F1F). | Fixed |
| V8 | Testimonials no separation from previous section on light mode | Medium | Testimonials.tsx | Wave divider now uses correct colour matching section above. The bg-primary-50 provides visual distinction from bg-background Services section above. | Fixed |
| V9 | USPs has 7 cards, should be 6 — grid broken | Medium | USPs.tsx | Removed "One connected system, not Frankenstein" — redundant with FishTank callout box. 6 cards now fit 3x2 grid. | Fixed |
| V10 | Footer text barely readable — teal on teal | High | Footer.tsx | Changed all body text from `text-primary-200` to `text-primary-100` for better contrast. | Fixed |
| V11 | Footer logo too small, letter holes filled white | High | Footer.tsx, Logo.tsx | Logo bumped from h-10 to h-12. Light variant now uses LogoText (no PNG filter needed). | Fixed |
| V12 | Footer dual LinkedIn icons look like duplicate mistake | Medium | Footer.tsx | Added text labels: "Ibraheem" for personal, "Company" for business page. Icons now have visible context. | Fixed |
| V13 | CTA phone button colours bad on dark mode | Medium | CTA.tsx | CTA section uses fixed orange gradient (doesn't change in dark mode), so button styling is consistent. Wave divider fix resolved the visual mismatch between sections. | Fixed |
| V14 | Community/forest section breaks homepage conversion flow | Medium | page.tsx, about/page.tsx | Removed Community from homepage. Added Community component to About page (after existing community text section, before CTA). Partners + Evertreen forest embed now live on /about. | Fixed |

## Verification

- Build: pass (13/13 pages, compiled 2.6s)
- ESLint: 0 errors, 0 warnings
- TypeScript: 0 errors
- Deployed to: https://small-giants-studio.vercel.app
- Structure verified via WebFetch: 6 USP cards, no Community on homepage, labelled LinkedIn links, Community on /about with all 3 partners + forest embed

## Files Modified

1. `components/ui/Logo.tsx` — removed brightness-0 invert, added mix-blend-multiply + dark:LogoText fallback
2. `components/sections/Hero.tsx` — doubled giant opacity, fixed strokeDasharray/offset from 100→200
3. `components/sections/FishTank.tsx` — wave overlap fix, callout box border + shadow
4. `components/sections/USPs.tsx` — removed redundant USP, wave colour fix, card border/shadow fix
5. `components/sections/Testimonials.tsx` — dark:bg-background override, wave overlap fix
6. `components/sections/CTA.tsx` — wave overlap fix, className-based fill with dark: variant
7. `components/layout/Footer.tsx` — text-primary-100, logo h-12, LinkedIn labels
8. `app/page.tsx` — removed Community import and component
9. `app/about/page.tsx` — added Community import and component

## Note for Future

The PNG logo (`sgs-horizontal-logo.png`) has a **white background, not transparent**. This limits CSS-only dark mode handling. A properly exported transparent PNG would allow the image to work on both light and dark backgrounds without the LogoText fallback. This would also restore the giant figure icon in the logo.
