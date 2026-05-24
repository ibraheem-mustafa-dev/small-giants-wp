# Block Colour & Animation Defaults — Revised Audit Table

**Status:** v2 — applies the 9 high-severity contrast fixes from the QC review (2026-04-29) and adds an Animation/timing column referencing the motion tokens shipped in commit `618db29`.

**Architecture:**
- All values are palette slugs / motion-token slugs (work for any active style variation)
- Defaults declared in each block's `block.json` `attributes.*.default` (Gutenberg-canonical pattern)
- Animation defaults driven by extension attributes (sgsAnimationType / sgsAnimationDuration / sgsAnimationEasing) committed in `33d0962`
- Hover defaults driven by hover-effects extension (sgsHoverScalePreset / sgsHoverShadow / sgsHoverImageZoom / sgsHoverDuration / sgsHoverEasing / sgsFocusRing) committed in `33d0962`

---

## Universal rules

1. **`prefers-reduced-motion` honoured globally** — already in `extensions.css` for animations; needs adding for hover transitions in a global rule
2. **`:focus-visible`** — 11 opt-in cards default `sgsFocusRing: true`; all other clickable blocks (buttons, links inside) inherit a global `:focus-visible` ring
3. **Click/active feedback** — all clickable elements get `transform: translateY(1px)` or `scale(0.99)` on `:active` via global CSS rule (no per-block attribute needed)
4. **Slug aliases**: when a block uses a colour palette slug it resolves through whatever style variation is active

---

## Group A — Hero / banner

**Role default:** `bg = primary-dark → primary` gradient (FIX #6 — start at primary-dark not primary), `text = text-inverse` (large text only safe on primary), `accent = accent` (CTAs)

| Block | bg | text | Hover | Animation entry | Focus ring |
|---|---|---|---|---|---|
| `sgs/hero` | gradient(`primary-dark` → `primary`) | `text-inverse` | none on wrapper; CTA gets primary-dark hover bg | `reveal-up`, duration: `slow`, easing: `ease-out` | n/a (no wrapper interaction) |

---

---

## Group C — CTA blocks (FIX #1, #2)

| Block | bg | text | Button | Hover | Animation entry |
|---|---|---|---|---|---|
| `sgs/cta-section` | `accent` | **`text`** (FIX — was text-inverse, 1.96:1 fail; text gives 7.6:1) | bg `primary-dark`, text `text-inverse`, scale `1.02`, shadow lift on hover | duration: `medium`, easing: `default` | `fade-up`, duration: `medium` |
| `sgs/whatsapp-cta` | `whatsapp` | **`text`** (FIX — was text-inverse, 1.81:1 fail; text gives 8.23:1) | inline (whole block is button); scale `1.02`, slight bg darken on hover | duration: `medium`, easing: `default` | optional `fade-up` |

---

## Group D — Notice / alert / announcement (FIX #3)

| Block | bg | text | Border / accent | Hover |
|---|---|---|---|---|
| `sgs/notice-banner` (info) | `surface-alt` | `text` | 4px left `primary` | none (informational) |
| `sgs/notice-banner` (success) | `surface-alt` | `text` | 4px left `success` | none |
| `sgs/notice-banner` (warning) | `accent-light` | `text` | 4px left **`accent-text`** (FIX — was accent, 1.93:1 invisible; accent-text gives 6.37:1) | none |
| `sgs/notice-banner` (error) | `surface-alt` | `text` | 4px left `error` | none |
| `sgs/announcement-bar` | `primary-dark` | `text-inverse` | `accent` (CTA links — underline grow on hover) | link colour shift only |

**Animation entry for all notices:** `slide-down`, duration: `medium`, easing: `ease-out`. Optional dismiss fade `fast`.

---

## Group E — Display strips (FIX #9)

**Role default:** `bg = surface-alt`, **primary content = `text`** (FIX — primary stat labels, addresses, phone numbers must NOT be `text-muted`; reserve `text-muted` for secondary meta only), `accent icons = primary`

| Block | bg | Primary content | Secondary | Accent | Hover |
|---|---|---|---|---|---|
| `sgs/trust-bar` | `surface-alt` | stat labels = `text` | optional sub-caption = `text-muted` | icons/numbers = `primary` | none |
| `sgs/certification-bar` | `surface-alt` | cert names = `text` | optional caption = `text-muted` | full-colour cert logos | optional opacity 0.85 → 1.0 lift on hover |
| `sgs/brand-strip` | `surface` | n/a (logos) | n/a | full-colour logos (per direction — no greyscale) | optional scale `1.05` on logo hover |
| `sgs/business-info` | `surface-alt` | address/phone/hours = `text` | "open hours" labels = `text-muted` | icons = `primary`, headings = `text` (bold) | none |

**Animation entry for all strips:** `fade-up`, duration: `medium`, easing: `ease-out`.

---

## Group F — Interactive cards (clickable, hover-eligible — opt-in list)

**These 11 blocks default `sgsHoverScalePreset: '1.02'`, `sgsHoverShadow: 'md'`, `sgsHoverImageZoom: true` (where image), `sgsFocusRing: true`, `sgsHoverDuration: 'medium'`, `sgsHoverEasing: 'default'`** — already shipped in commit `33d0962`.

**Role default:** `bg = surface`, `heading = primary`, `body = text`, `meta = text-muted`, `border = border-subtle`

| Block | bg | Headings/body | Hover spec | Animation entry |
|---|---|---|---|---|
| `sgs/card-grid` | `surface` | role-default | role-default + border `primary` on hover | stagger `fade-up` 80ms, duration: `medium` |
| `sgs/post-grid` | `surface` | meta = `text-muted` | role-default + title shifts to `primary-dark` on hover | stagger `fade-up` 60ms |
| `sgs/info-box` | `surface` | + 4px left border `primary` (idle) → `primary-dark` (hover) | role-default | `fade-up`, duration: `medium` |
| `sgs/team-member` | `surface` | name = `primary`, role = `text-muted` | role-default; image-zoom on photo | stagger `fade-up` 80ms |
| `sgs/pricing-table` (default tier) | `surface` | price = `text` | role-default + border `primary` | stagger `slide-up` 100ms |
| `sgs/pricing-table` (featured) | `accent-light` | price = `primary-dark`, badge bg = `accent`, badge text = `text` (FIX #18) | resting scale `1.03` + shadow-3; hover scale `1.05` + shadow-4 | as-default + subtle pulse 2s |
| `sgs/google-reviews` | `surface` | stars = `accent`, Google "G" retains brand | role-default | stagger `fade-up` 60ms |
| `sgs/process-steps` | `surface` | number circle bg = `primary`, number = `text-inverse`, line = `border-subtle` (active = `success`) | role-default + step lift on hover | scroll-driven line fill 600ms; check draw `fast` |
| `sgs/icon-block` | none | icon = `primary` (hover → `primary-dark`, scale `1.05`) | role-default minus shadow (no card bg) | `fade-up` |
| `sgs/whatsapp-cta` | `whatsapp` | (Group C above) | scale only (no zoom; no image) | + optional 2s pulse on idle |
| `sgs/gallery` | none | tiles | image-zoom `1.08` only (NOT card-scale); tile overlay `linear-gradient(transparent, primary-dark 70%)`; caption `text-inverse` (FIX #7 — overlay min 85% opacity at caption position; caption confined to bottom 40% of tile) | masonry stagger `fade-in` 60ms |
| `sgs/testimonial` | `surface-alt` | author = `primary`, role = `text-muted`, quote-mark = `accent` 0.2 opacity (large decorative) | not in opt-in list (display variant); `fade-up` only | `fade-up`, duration: `medium` |

---

## Group G — Display blocks (non-clickable; child elements may animate)

| Block | bg | Primary | Secondary | Hover | Scroll-into-view |
|---|---|---|---|---|---|
| `sgs/counter` | none | number = `primary` | label = `text-muted` | none | **count-up** 2000ms ease-out, IntersectionObserver threshold 0.5, once-only, reduced-motion skips to final value |
| `sgs/star-rating` | none | filled = `accent` | empty = `border-subtle` | none (display); interactive variant: hover preview fill `fast` | optional `fill-stars` sequential |
| `sgs/decorative-image` | none | n/a | n/a | image-zoom on hover (opt-in) | `fade-up` |
| `sgs/icon` | none | icon = `primary` | n/a | scale `1.1` + colour shift to **`accent-text`** (FIX #15 — was accent, 2.04:1 fail; accent-text gives 5.0:1) (opt-in) | none |
| `sgs/icon-list` | none | icons = `primary`, text = `text` | n/a | per-item: text → `primary`, icon scale `1.05` | stagger `fade-up` 50ms |
| `sgs/social-icons` | none | base = `text-muted` (or `border-subtle`) | brand colour on hover | per-icon: scale `1.1` + colour shift to brand | none |
| `sgs/svg-background` | none | none | none | none — pure decoration | none |
| `sgs/table-of-contents` | `surface-alt` | title = `text` (bold) | links = `text-muted` | per-link: text → `primary`, underline grow | `fade-up` |
| `sgs/reading-progress` | transparent track | fill = `accent` | n/a | n/a | scroll-driven fill (animation-timeline: scroll()) |

---

## Group H — Forms (focus states, not hover)

**Role default:** `label = text`, `input bg = surface`, `border = border-subtle`, **`focus border = primary`, focus ring = `var(--wp--custom--focus-ring--color-primary)` 3px offset 2px** (uses focus-ring tokens), `error border = error`

| Block | Default behaviour |
|---|---|
| `sgs/form` | wrapper: no bg defaults; on submit: button shows spinner `medium` |
| `sgs/form-step` | step indicator: active = `primary`, inactive = `border-subtle`; transition `fast` slide between steps |
| `sgs/form-review` | bg = `surface-alt`, rows separated by `border-light`; transition `fast` between edit/review modes |
| All `sgs/form-field-*` | role-default. Floating label opt-in (translate `0,-1.5em` scale `0.85` duration `fast` on focus/filled). Validation: error border + 200ms shake on invalid submit |
| `sgs/form-field-tiles` | tile bg = `surface`; selected tile bg = `accent-light` + **`accent-text`** border (FIX #4 — was accent, same 1.93:1 fail); transition `medium` |
| `sgs/form-field-consent` | checkbox accent = `primary` |
| Submit button | bg = `primary`, text = `text-inverse`, hover bg = `primary-dark`, scale `1.02`, focus ring on, loading spinner `medium` |

---

## Group I — Navigation (child links own hover)

| Block | Wrapper bg | Items | Hover state | Animation entry |
|---|---|---|---|---|
| `sgs/mega-menu` | `surface` | text = `text` | bg → `surface-alt`, text → `primary`; chevron rotate 180° `fast` | dropdown panel: opacity + 8px translateY `fast` |
| `sgs/mobile-nav` | `surface` (drawer) | text = `text` | bg → `surface-alt`, text → `primary` | drawer: 300ms cubic-bezier translate-X; hamburger morph `medium`; backdrop fade `fast` |
| `sgs/breadcrumbs` | none | text = `text-muted`, separator = **`text-muted`** (FIX #12 — was border-subtle, 1.32:1 invisible; text-muted gives 4.99:1), current = `text` | hover link: text → `primary`, underline grow width 0→100% `fast` | none |
| `sgs/back-to-top` | **`primary-dark`** (FIX #8 — was primary; primary-dark gives 8.88:1 + clarifies semantic from primary CTAs) | icon = `text-inverse` | bg → primary at 0.85 opacity, scale `1.1` | fade + translateY `medium` on scroll-threshold cross (400px) |

---

## Group J — Multi-part interactive (per-child specs)

### `sgs/accordion` + `sgs/accordion-item`

| Element | Idle | Hover | Open | Timing |
|---|---|---|---|---|
| Header bar bg | `surface` | `surface-alt` | `surface-alt` | `fast` |
| Header text | `text` | `primary` | `primary` | `fast` |
| Chevron icon | `text-muted` | `primary` | `primary`, rotated 180° | rotate `medium`, easing `default` |
| Content panel | grid-rows 0fr | — | grid-rows 1fr + opacity 0→1 | `medium`, easing `default` |
| Border-bottom between items | `border-light` | — | — | n/a |

### `sgs/tabs` + `sgs/tab`

| Element | Idle | Hover | Active | Timing |
|---|---|---|---|---|
| Tab button text | `text-muted` | `text` (+ underline appears, FIX #14) | `primary` | `fast` |
| Tab bg | transparent | transparent | transparent | n/a |
| Active indicator | none | none | 2px `primary` underline (slides between tabs) | left+width `medium`, easing `default` |
| Content panel | hidden | — | opacity 0→1 + 4px translateY | `fast` |

### `sgs/testimonial-slider`

| Element | Idle | Hover | Active | Timing |
|---|---|---|---|---|
| Card bg | `surface-alt` | shadow-lift | — | `medium` |
| Card author | `primary` | — | — | n/a |
| Card quote-mark | `accent` 0.2 opacity | — | — | n/a |
| Arrow button bg | `primary` | `primary-dark` (scale `1.05`) | depress shadow + scale `0.99` | `fast`, easing `default` |
| Arrow button icon | `text-inverse` | `text-inverse` | — | n/a |
| Dot indicator | `border-subtle` filled | `primary` filled, scale `1.2` | `primary-dark` filled, scale `1.3` | `fast`, easing `spring` |
| Slide transition | n/a | n/a | translate + crossfade | `slow`, easing `ease-out` |
| Autoplay | OFF by default (a11y); pause on hover & focus-within when ON | — | — | 6s if enabled |

### `sgs/countdown-timer`

| Element | Colour | Animation |
|---|---|---|
| Numbers | `primary` (or `text-inverse` on dark variant) | flip-card style optional, duration `fast` per flip |
| Labels | `text-muted` | static |
| Separators | `border-subtle` | static |
| ENDED state | bg `surface-alt`, text `text-muted` | crossfade `medium` |

### `sgs/modal`

| Element | Idle | Hover | Timing |
|---|---|---|---|
| Backdrop | `primary-dark` 70% opacity | — | fade `fast` |
| Panel bg | `surface` | — | scale 0.95→1 + opacity, easing `spring`, duration `medium` |
| Close button bg | **`border-subtle`** (FIX #11 — was text-muted; border-subtle gives 12.0:1 with text icon, reads as a chip) | `primary-dark` (FIX #4 — drop the error-on-hover concept; primary-dark gives 8.88:1) | `fast` |
| Close button icon | `text` | `text-inverse` | `fast` |
| Focus trap | enabled by default | — | n/a |

### `sgs/gallery` (lightbox)

| Element | Idle | Hover | Timing |
|---|---|---|---|
| Lightbox backdrop | `primary-dark` 90% opacity | — | fade `medium` |
| Lightbox image | scale 0.9 | — | scale to 1 + opacity, duration `medium`, easing `ease-out` |
| Arrow nav | `text-inverse` icon on `primary-dark` 50% bg | bg → `primary-dark` 80% | `fast` |
| Caption | hidden in tile state | fades in inside lightbox | `fast` |

### `sgs/post-grid` (AJAX pagination)

| State | Behaviour | Timing |
|---|---|---|
| Loading | "Load more" button shows spinner | `medium` |
| New posts arriving | fade-up stagger 60ms per card | duration `medium`, easing `ease-out` |
| Outgoing posts (filter change) | fade out `fast` | — |

---

## Group K — Layout primitives

| Block | Notes |
|---|---|
| `sgs/container` | No bg defaults — author sets per-instance |
| `sgs/svg-background` | No colour defaults — pure SVG decoration |

---

## Summary of contrast fixes applied (vs v1)

| # | Where | Was | Now | Reason |
|---|---|---|---|---|
| 1 | `sgs/cta-section` text | `text-inverse` on `accent` | `text` on `accent` | 1.96:1 → 7.6:1 |
| 2 | `sgs/whatsapp-cta` text | `text-inverse` on `whatsapp` | `text` on `whatsapp` | 1.81:1 → 8.23:1 |
| 3 | `sgs/notice-banner` warning border | `accent` | `accent-text` | 1.93:1 → 6.37:1 |
| 4 | `sgs/form-field-tiles` selected border | `accent` | `accent-text` | same fix |
| 5 | `sgs/modal` close hover bg | `error` | `primary-dark` | 4.41:1 → 8.88:1 + semantic clarity |
| 6 | `sgs/hero` gradient direction | `primary` start | `primary-dark` start | body text mid-gradient lift |
| 7 | `sgs/gallery` caption | undefined contrast on transparent overlay | overlay ≥85% opacity at caption position | safe contrast zone |
| 8 | `sgs/back-to-top` button bg | `primary` | `primary-dark` | clarifies semantic + 8.88:1 |
| 9 | Group E primary content (trust-bar, business-info) | `text-muted` | `text` | 4.61:1 (zero headroom) → 15.5:1 |
| 11 | `sgs/modal` close idle bg | `text-muted` | `border-subtle` (icon = `text`) | semantic chip + 12.0:1 |
| 12 | `sgs/breadcrumbs` separator | `border-subtle` | `text-muted` | 1.32:1 → 4.99:1 |
| 14 | `sgs/tabs` hover state | text shift only | + underline appears | non-colour signal (WCAG 1.4.1) |
| 15 | `sgs/icon` hover colour | `accent` | `accent-text` | 2.04:1 → 5.0:1 |
| 18 | `sgs/pricing-table` featured badge text | unspecified | `text` (on accent bg) | explicit 7.6:1 |

All UI-component contrast ratios now ≥3:1; all text contrast ratios ≥4.5:1 (normal) or ≥3:1 (large).

---

## Implementation plan

**Wave 1 (block.json defaults — parallel branches by block category):**
- Branch X: Group A + B + C + D + Group K layout primitives (~9 block.json files)
- Branch Y: Group E + G + I (~13 block.json files)
- Branch Z: Group F (11 opt-in cards) + Group H forms (~15 block.json files)

**Wave 2 (per-child specs — sequential, depends on Wave 1):**
- Update style.css + view.js for accordion, tabs, testimonial-slider, modal, gallery (per-child timing rules)

**Wave 3 (verification + close):**
- Visual QA on `/block-test/` at 3 breakpoints
- Lighthouse + a11y audit
- Archive: this is the final framework completion deliverable
