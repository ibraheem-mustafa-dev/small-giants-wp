---
doc_type: truth-spec
spec_version: 2
client: mamas-munches
mockup_path: sites/mamas-munches/mockups/homepage/index.html
last_renamed: 2026-05-10
fact_checked: 2026-05-31 (2 parallel subagents vs live DOM — v1 was ~50% accurate: 65 ACCURATE / 19 WRONG / 49 INCOMPLETE across 133 claims)
convention: sgs-prefixed-bem (Spec 13)
---

# Mama's Munches Homepage — TRUTH-SPEC (v2, DOM-verified)

Section-by-section binding manifest, **fact-checked against the live mockup DOM on 2026-05-31**. Each row maps a mockup section to the SGS block / pattern the recogniser should produce, the wrapper class, and the slot-to-class mappings inside. Line numbers reference `index.html`.

This file is the source of truth for:
- `/sgs-clone` Stage 1 boundary detection (which wrapper class delimits which section)
- `/sgs-clone` Stage 3 slot list (which inner classes feed which block slot)
- `/visual-qa` mockup-parity-validator selector lookups
- **Structural-diff gate** (emitted block tree vs this manifest) — the deterministic gate ahead of pixel-diff

## v1 → v2 corrections (what was wrong)

1. **`.sgs-products` is NOT a top-level section** — it is a `<div>` nested inside `.sgs-featured-product__inner` (L836). Removed as a standalone row; folded into Featured product.
2. **Announcement bar is NOT a top-level section** — it is the last child inside `.sgs-gift-section__card-inner` (L974). Folded into Gift section.
3. **Brand story wrapper was `.sgs-heritage-strip` — RETIRED 2026-05-16.** Real wrapper is `.sgs-brand` with entirely different slot names.
4. **Product-card count: 2, not 4.** Gift-section card count: **2, not 3** (the "trial" card is in Featured product, not Gift).
5. **Hero dual-DOM (`--desktop`/`--mobile`/`__image`/`__copy`) is stale** — migrated to single-DOM `__media` + `__split-image--{mobile,desktop}`.
6. **Section headings were omitted everywhere** — nearly every section opens with a `.sgs-section-heading__label` and/or bare `<h2>` and an intro/sub paragraph. Now recorded per-section.
7. **Layout values were absent** — `grid-template-columns` / `gap` per wrapper now recorded (needed for native-grid attribute lifting).
8. **True DOM order corrected:** Header → Hero → Trust bar → Featured product → Brand → Ingredients → Gift → Social proof → Footer.

## Section binding table (9 top-level sections, DOM order)

| # | Section | Line | Type | Wrapper class | Notes |
|---|---------|------|------|---------------|-------|
| 1 | Header | 724 | pattern | `.sgs-header` | Existing pattern `sgs-theme/header-mamas-munches`. Skip-link (L719) is a sibling BEFORE `<header>`. |
| 2 | Hero | 764 | composite block | `.sgs-hero` | Single-DOM. `__media` holds two `<img>` art-direction variants via `__split-image--{mobile,desktop}`. |
| 3 | Trust bar | 792 | block | `.sgs-trust-bar` | 4 badges (grid 2-col mob / 4-col ≥600px). Halal badge is CSS-only — no DOM instance. |
| 4 | Featured product | 830 | pattern | `.sgs-featured-product` | Contains a NESTED `.sgs-products` grid (L836) of **2** `sgs/product-card` instances. NO existing pattern. |
| 5 | Brand story | 892 | pattern | `.sgs-brand` | Was `.sgs-heritage-strip` (RETIRED). `sgs/brand` pattern = `sgs/container` 2-col grid. |
| 6 | Ingredients | 914 | pattern | `.sgs-ingredients-section` | Existing pattern. Inside: `.sgs-feature-grid` of **4** `.sgs-info-box`. |
| 7 | Gift section | 951 | pattern | `.sgs-gift-section` | **2** gift cards. Contains nested `.sgs-announcement-bar--send-to-ward` (L974) as final child. NO existing pattern. |
| 8 | Social proof | 985 | pattern | `.sgs-social-proof` | `trustpilot-bar` THEN `testimonial-slider` (3 `<article>` testimonials). NO existing pattern. |
| 9 | Footer | 1022 | pattern | `.sgs-footer` | Existing pattern `sgs-theme/footer-mamas-munches`. 3 columns (`2fr 1fr 1fr` ≥768px). |

## Slot bindings — per section (DOM-verified)

### 1 · Header (`.sgs-header`, L724)
```
a.sgs-header__skip-link            ← sibling BEFORE <header> (L719)
header.sgs-header
  └ div.sgs-header__inner
      ├ a.sgs-header__logo > img                         → core/site-logo
      ├ nav.sgs-header__nav (5 links)                    → core/navigation
      │   └ a.sgs-header__nav-featured ("Send to Ward ★")
      └ div.sgs-header__right
          ├ a.sgs-header__cart > svg + span.sgs-header__cart-badge
          └ button.sgs-header__hamburger > span×3        → sgs/mobile-nav-toggle
```

### 2 · Hero (`.sgs-hero`, L764) — single-DOM
```
section.sgs-hero
  ├ div.sgs-hero__content
  │   ├ span.sgs-section-heading__label   ("Handmade in Birmingham")
  │   ├ h1                                 (bare — no __copy wrapper)
  │   ├ p.sgs-hero__sub
  │   └ div.sgs-hero__ctas
  │       ├ a.sgs-button.sgs-button--primary
  │       └ a.sgs-button.sgs-button--secondary
  └ div.sgs-hero__media
      ├ img.sgs-hero__split-image.sgs-hero__split-image--mobile
      └ img.sgs-hero__split-image.sgs-hero__split-image--desktop
```

### 3 · Trust bar (`.sgs-trust-bar`, L792)
```
section.sgs-trust-bar
  └ div.sgs-trust-bar__inner            ← grid: 2-col mob / 4-col ≥600px; gap 16px 12px
      └ div.sgs-trust-bar__badge ×4
          ├ span.sgs-trust-bar__icon > svg
          └ span.sgs-trust-bar__text
   (halal-pending badge: CSS-only, no DOM instance)
```
> **FR-22-4.1 resolution (D118):** `sgs-trust-bar__inner` is a DIRECT descendant of the section container with no registered block match + carries a grid layout → it FOLDS into the `sgs-trust-bar` section container per §FR-22-4.1 rule #2 (grid case): the section container absorbs the 4-col grid + each badge's positioning CSS as grid-item attrs. One container, four badge grid-items. No second nested container.

### 4 · Featured product (`.sgs-featured-product`, L830)
```
section.sgs-featured-product
  └ div.sgs-featured-product__inner
      ├ span.sgs-section-heading__label   ("Our signature")
      ├ h2                                 (bare)
      ├ p.sgs-section-heading__intro
      └ div.sgs-products                   ← NESTED grid; 1-col mob / 5fr 3fr ≥768px; gap 16px
          ├ div.sgs-product-card                       (main: Zookies)
          │   ├ img.sgs-product-card__image
          │   └ div.sgs-product-card__body
          │       ├ h3
          │       ├ p.sgs-product-card__description
          │       ├ div.sgs-featured-product__pill-group > button.sgs-featured-product__pill ×4
          │       ├ div.sgs-featured-product__price-row
          │       │   ├ span.sgs-featured-product__price
          │       │   └ span.sgs-featured-product__price-note
          │       └ a.sgs-button.sgs-button--primary    (card CTA)
          └ div.sgs-product-card.sgs-gift-section__card--trial   (trial pack — cross-section modifier)
              ├ img.sgs-product-card__image
              └ div.sgs-product-card__body
                  ├ div.sgs-gift-section__card-tag--trial ("New? Start here")
                  ├ h3
                  ├ p.sgs-product-card__description
                  ├ div.sgs-featured-product__price-row
                  └ a.sgs-button.sgs-button--secondary
```
> **FR-22-4.1 resolution (D118):** `sgs-featured-product__inner` is a DIRECT descendant of the section container with no registered block match + max-width only → folds as inner-CSS layer onto the section container (§FR-22-4.1 rule #2, 1-child case). `.sgs-products` is NOT a direct descendant of the section (sits under `__inner`) → its own `sgs/container` with grid CSS lifted onto native grid attrs (§FR-22-4.1 rule #4). The 2 `sgs-product-card` divs ARE direct descendants of `.sgs-products` AND match a registered block → emitted as `sgs/product-card` blocks which ARE the grid items (§FR-22-4.1 rule #3). Result: section container (padding+bg) → inner-CSS fold → `.sgs-products` sgs/container (5fr 3fr grid) → 2× sgs/product-card side-by-side.

### 5 · Brand story (`.sgs-brand`, L892) — was `.sgs-heritage-strip` (RETIRED)
```
section.sgs-brand                        ← grid 1-col mob / 1fr 1fr ≥768px; gap 32→60px
  ├ div.sgs-brand__content
  │   ├ h2.sgs-brand__headline
  │   ├ div.sgs-brand__quote
  │   │   ├ p ×3
  │   │   └ p.sgs-brand__attribution    ("— Zainab, Founder")
  │   └ a.sgs-brand__cta.sgs-button.sgs-button--ghost
  └ img.sgs-brand__image
```

### 6 · Ingredients (`.sgs-ingredients-section`, L914)
```
section.sgs-ingredients-section
  └ div.sgs-ingredients-section__inner
      ├ span.sgs-section-heading__label   ("What's in them?")
      ├ h2
      ├ p.sgs-section-heading__intro
      ├ div.sgs-feature-grid              ← grid 2-col mob / 4-col ≥600px; gap 14px
      │   └ div.sgs-info-box ×4
      │       ├ div.sgs-info-box__icon
      │       ├ h4
      │       └ p
      └ p.sgs-ingredients-section__disclaimer
```

### 7 · Gift section (`.sgs-gift-section`, L951)
```
section.sgs-gift-section
  └ div.sgs-gift-section__card-inner       ← section centring wrapper (NOT per-card)
      ├ span.sgs-section-heading__label    ("Give the gift of nourishment")
      ├ h2
      ├ p.sgs-section-heading__sub
      ├ div.sgs-gift-section__cards         ← grid 1-col mob / 1fr 1fr ≥640px; gap 16px
      │   └ div.sgs-gift-section__card ×2
      │       ├ span.sgs-gift-section__card-tag
      │       ├ h3
      │       ├ p.sgs-gift-section__card-description
      │       ├ div.sgs-gift-section__card-price
      │       └ a.sgs-button.sgs-button--primary
      └ div.sgs-announcement-bar--send-to-ward   ← NESTED (not a top-level section); flex space-between
          ├ p
          └ a
```

### 8 · Social proof (`.sgs-social-proof`, L985)
```
section.sgs-social-proof
  └ div.sgs-social-proof__inner
      ├ h2
      ├ p.sgs-section-heading__sub
      ├ div.sgs-social-proof__trustpilot-bar   ← FIRST; flex centre; gap 14px; has bg+border+radius+padding
      │   ├ span.sgs-social-proof__trustpilot-logo
      │   ├ span.sgs-social-proof__trustpilot-stars
      │   └ span.sgs-social-proof__trustpilot-text
      └ div.sgs-testimonial-slider             ← grid 1-col mob / 3-col ≥640px; gap 12px
          └ article.sgs-testimonial ×3
              ├ div.sgs-testimonial__stars
              ├ p.sgs-testimonial__text
              └ p.sgs-testimonial__author
```

### 9 · Footer (`.sgs-footer`, L1022)
```
footer.sgs-footer
  └ div.sgs-footer__inner
      ├ div.sgs-footer__grid               ← grid 1-col mob / 2fr 1fr 1fr ≥768px; gap 36px
      │   ├ div.sgs-footer__brand
      │   │   ├ img.sgs-footer__logo
      │   │   ├ p.sgs-footer__tagline
      │   │   ├ p.sgs-footer__meta ×2
      │   │   └ div.sgs-footer__social > a ×2 (Instagram + WhatsApp, svg + label)
      │   └ div.sgs-footer__col ×2          (Shop: 7 links | Information: 5 links)
      │       ├ h5
      │       └ ul > li > a
      └ div.sgs-footer__bottom             ← flex col mob / row ≥768px space-between
          └ span ×2 (copyright | "Made with love")
```

## Cross-section utility classes

### Section headings — `.sgs-section-heading__{label,intro,sub}`
| Class | Used in | Notes |
|-------|---------|-------|
| `__label` | Hero, Featured product, Ingredients, Gift | small eyebrow label above heading |
| `__intro` | Featured product, Ingredients | per-section CSS overrides (size/colour/max-width vary) |
| `__sub` | Gift, Social proof | lede paragraph |

Hero uses `__label` but a bare `<h1>` + `.sgs-hero__sub` (not `__intro`). A `sgs/section-heading` block does not exist — these remain a cross-cutting CSS convention unless the recogniser needs a dedicated block.

### Buttons — `.sgs-button` (on both `<a>` and `<button>`)
| Variant | Used in |
|---------|---------|
| `--primary` | Featured product, Gift |
| `--secondary` | Hero, trial card |
| `--ghost` | Brand CTA (carries inline `margin-top:8px`) |

### State classes (exempt from Spec 13)
- `.active` — confirmed on `.sgs-featured-product__pill` (the "12-pack" pill, `aria-pressed="true"`). Nav `.active` is JS-driven, not in static DOM.

## Gap candidates (sections without an existing pattern)

1. `featured-product` pattern (contains nested `products` grid of 2 product-cards + section heading + pills + price-row + CTA)
2. `brand` pattern (`sgs/container` 2-col: content column + image)
3. `gift-section` pattern (2 cards + nested announcement-bar)
4. `social-proof` pattern (heading + trustpilot-bar + testimonial-slider of 3)

`sgs/section-heading` block — possible future addition if the recogniser needs a dedicated block for the label/intro/sub convention; otherwise CSS-only.
