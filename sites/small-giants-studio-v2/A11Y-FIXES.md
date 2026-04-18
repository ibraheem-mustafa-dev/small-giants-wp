# Accessibility Fixes Tracker

**Audit date:** 12 Feb 2026
**Engine:** axe-core 4.10.2 via Playwright
**Standard:** WCAG 2.2 AA
**Result:** ALL 8 PAGES PASS — 0 violations in both light and dark mode

---

## Root Cause Fix

- [x] **FIX-0: Add `@custom-variant dark` to globals.css** — Tailwind v4 `dark:` utilities weren't responding to `.dark` class. One line fix resolved 38 of 53 dark mode violations instantly.
  - File: `app/globals.css:2`

---

## Light Mode Fixes

### Serious — colour contrast (WCAG 1.4.3)

- [x] **FIX-1: `text-accent-600` → `text-accent-700` on white buttons** — ratio 3.38:1 → 4.66:1
  - File: `components/ui/Button.tsx:22`

- [x] **FIX-2: `text-white/90` → `text-white` on CTA banners** — ratio 4.07:1 → 4.66:1
  - Files: `app/about/page.tsx`, `app/services/page.tsx`, `components/sections/CTA.tsx`

- [x] **FIX-3: `text-primary-300` → `text-primary-200` on stat cards** — ratio 4.37:1 → 5.6:1
  - File: `components/sections/Problem.tsx:59`

- [x] **FIX-4: `text-accent-400` → `text-accent-300` on about partner labels** — ratio 3.69:1 → 4.53:1
  - File: `app/about/page.tsx:250`

- [x] **FIX-5: `text-primary-700` → `text-primary-800` on fish tank callout** — ratio 4.31:1 → 5.3:1
  - File: `components/sections/FishTank.tsx:196`

### Serious — link-in-text-block (WCAG 1.4.1)

- [x] **FIX-6: Added `underline` to inline links on /privacy and /terms**
  - Files: `app/privacy/page.tsx` (3 links), `app/terms/page.tsx` (1 link)

---

## Dark Mode Fixes (auto-resolved by FIX-0)

- [x] **FIX-7–10: All dark mode violations resolved** — `@custom-variant dark` fixed the root cause. The `dark:` Tailwind utilities now correctly apply when `.dark` class is toggled.

---

## Verification Log

| Fix | Tested | Light | Dark | Notes |
|-----|:------:|:-----:|:----:|-------|
| FIX-0 | 12 Feb | PASS | PASS | 53 → 15 dark violations (38 auto-resolved) |
| FIX-1 | 12 Feb | PASS | PASS | accent-700 on white = 4.66:1 |
| FIX-2 | 12 Feb | PASS | PASS | Pure white on accent bg = 4.66:1 |
| FIX-3 | 12 Feb | PASS | PASS | primary-200 on primary-800/50 = 5.6:1 |
| FIX-4 | 12 Feb | PASS | PASS | accent-300 on primary-800 = 4.53:1 |
| FIX-5 | 12 Feb | PASS | PASS | primary-800 on primary-50 = 5.3:1 |
| FIX-6 | 12 Feb | PASS | PASS | Links now have underline |

## Final Audit Summary

| Page | Light | Dark |
|------|:-----:|:----:|
| `/` | 0 | 0 |
| `/about` | 0 | 0 |
| `/services` | 0 | 0 |
| `/contact` | 0 | 0 |
| `/work` | 0 | 0 |
| `/insights` | 0 | 0 |
| `/privacy` | 0 | 0 |
| `/terms` | 0 | 0 |
| **Total** | **0** | **0** |

**Before:** 69 violations (16 light + 53 dark)
**After:** 0 violations

### Files changed (10 total)
1. `app/globals.css` — added `@custom-variant dark`
2. `components/ui/Button.tsx` — white variant text colour
3. `app/about/page.tsx` — CTA text opacity + partner label colour
4. `app/services/page.tsx` — CTA text opacity
5. `components/sections/CTA.tsx` — CTA text opacity
6. `components/sections/Problem.tsx` — stat card label colour
7. `components/sections/FishTank.tsx` — callout text colour
8. `app/privacy/page.tsx` — link underlines
9. `app/terms/page.tsx` — link underline
