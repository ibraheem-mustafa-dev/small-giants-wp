---
doc_type: truth-spec
client: mamas-munches
mockup_path: sites/mamas-munches/mockups/homepage/index.html
last_renamed: 2026-05-10
convention: sgs-prefixed-bem (Spec 13)
---

# Mama's Munches Homepage — TRUTH-SPEC

Section-by-section binding manifest. Each row maps a mockup section to the SGS block / pattern that the recogniser should produce, the wrapper class used in the mockup, and the slot-to-class mappings inside.

This file is the source of truth for:
- `/sgs-clone` Stage 1 boundary detection (which wrapper class delimits which section)
- `/sgs-clone` Stage 3 slot list (which inner classes feed which block slot)
- `/visual-qa` mockup-parity-validator selector lookups

## Section binding table

| # | Section | Type | Wrapper class | Notes |
|---|---------|------|---------------|-------|
| 1 | Header | pattern | `.sgs-header` | Existing pattern `sgs-theme/header-mamas-munches`. Mockup uses short slug `sgs-header` for class namespace |
| 2 | Hero | composite block | `.sgs-hero` | Single composite SGS block. `--desktop` / `--mobile` modifiers fork separate DOM elements |
| 3 | Trust bar | block | `.sgs-trust-bar` | One instance |
| 4 | Featured product | pattern | `.sgs-featured-product` | NO existing pattern yet — flag as new-pattern candidate for Phase 8 |
| 5 | Product cards | pattern | `.sgs-products` | NO existing pattern. Contains 4× `sgs/product-card` block instances |
| 6 | Gift section | pattern | `.sgs-gift-section` | NO existing pattern. Contains 3× cards (1 trial + 2 gifts) |
| 7 | Ingredients | pattern | `.sgs-ingredients-section` | Existing pattern `sgs/ingredients-section`. Inside: `sgs/feature-grid` of `sgs/info-box` instances |
| 8 | Brand story | composite block | `.sgs-heritage-strip` | Single composite SGS block |
| 9 | Social proof | pattern | `.sgs-social-proof` | NO existing pattern. Contains `sgs/testimonial-slider` + a trustpilot bar |
| 10 | Footer | pattern | `.sgs-footer` | Existing pattern `sgs-theme/footer-mamas-munches`. Mockup uses short slug `sgs-footer` |
| 11 | Announcement bar | block | `.sgs-announcement-bar--send-to-ward` | Block `sgs/announcement-bar` with variant modifier |

## Slot bindings — per section

### Header (`.sgs-header`)

| Slot | Class | Maps to |
|------|-------|---------|
| inner | `.sgs-header__inner` | wrapper div |
| logo | `.sgs-header__logo` | `core/site-logo` block (existing pattern uses this) |
| skip-link | `.sgs-header__skip-link` | plain HTML `<a>` |
| nav | `.sgs-header__nav` | `core/navigation` block |
| nav-featured | `.sgs-header__nav-featured` | nested navigation item |
| hamburger | `.sgs-header__hamburger` | `sgs/mobile-nav-toggle` block (existing) |
| cart | `.sgs-header__cart` | custom — no existing SGS cart block; gap candidate |
| cart-badge | `.sgs-header__cart-badge` | child element of cart |
| right | `.sgs-header__right` | layout container |

### Hero (`.sgs-hero`)

| Slot | Class | Maps to |
|------|-------|---------|
| content | `.sgs-hero__content` | wrapper |
| copy | `.sgs-hero__copy` | heading + paragraph |
| sub | `.sgs-hero__sub` | subheading paragraph |
| ctas | `.sgs-hero__ctas` | button row |
| image | `.sgs-hero__image` | hero image (desktop) |
| image--mobile | `.sgs-hero__image--mobile` | separate mobile image |
| --desktop | `.sgs-hero--desktop` | desktop-layout modifier on a wrapper |
| --mobile | `.sgs-hero--mobile` | mobile-layout modifier on a wrapper |

### Trust bar (`.sgs-trust-bar`)

| Slot | Class | Maps to |
|------|-------|---------|
| inner | `.sgs-trust-bar__inner` | wrapper |
| badge | `.sgs-trust-bar__badge` | individual badge item |
| icon | `.sgs-trust-bar__icon` | badge icon circle |
| text | `.sgs-trust-bar__text` | badge text label |
| badge--halal-pending | `.sgs-trust-bar__badge--halal-pending` | halal-pending variant |

### Featured product (`.sgs-featured-product`)

| Slot | Class | Notes |
|------|-------|-------|
| inner | `.sgs-featured-product__inner` | wrapper |
| pill | `.sgs-featured-product__pill` | individual pill chip |
| pill-group | `.sgs-featured-product__pill-group` | row of pills |
| price | `.sgs-featured-product__price` | price amount |
| price-note | `.sgs-featured-product__price-note` | unit / "per box" annotation |
| price-row | `.sgs-featured-product__price-row` | price + CTA row |

### Products (`.sgs-products`) — uses `sgs/product-card` instances

| Slot | Class | Notes |
|------|-------|-------|
| card | `.sgs-product-card` | single product card (block slug) |
| card-image | `.sgs-product-card__image` | card photo |
| card-body | `.sgs-product-card__body` | card text container |
| card-description | `.sgs-product-card__description` | card description paragraph |

### Gift section (`.sgs-gift-section`)

| Slot | Class | Notes |
|------|-------|-------|
| cards | `.sgs-gift-section__cards` | grid wrapper |
| card | `.sgs-gift-section__card` | individual gift card |
| card-inner | `.sgs-gift-section__card-inner` | card content wrapper |
| card-tag | `.sgs-gift-section__card-tag` | tag/badge on card |
| card-description | `.sgs-gift-section__card-description` | card text |
| card-price | `.sgs-gift-section__card-price` | card price |
| card--trial | `.sgs-gift-section__card--trial` | trial variant card |
| card-tag--trial | `.sgs-gift-section__card-tag--trial` | trial tag styling |

### Ingredients (`.sgs-ingredients-section`)

| Slot | Class | Notes |
|------|-------|-------|
| inner | `.sgs-ingredients-section__inner` | wrapper |
| disclaimer | `.sgs-ingredients-section__disclaimer` | bottom notice |
| feature-grid | `.sgs-feature-grid` | block slug — wraps info-box instances |
| info-box | `.sgs-info-box` | each ingredient card |
| info-box icon | `.sgs-info-box__icon` | ingredient icon |

### Brand story (`.sgs-heritage-strip`)

| Slot | Class | Notes |
|------|-------|-------|
| inner | `.sgs-heritage-strip__inner` | wrapper |
| text | `.sgs-heritage-strip__text` | story text column |
| image | `.sgs-heritage-strip__image` | story photo |

### Social proof (`.sgs-social-proof`)

| Slot | Class | Notes |
|------|-------|-------|
| inner | `.sgs-social-proof__inner` | wrapper |
| testimonial-slider | `.sgs-testimonial-slider` | block slug — wraps testimonial blocks |
| testimonial | `.sgs-testimonial` | block slug — individual testimonial |
| testimonial text | `.sgs-testimonial__text` | quote body |
| testimonial author | `.sgs-testimonial__author` | reviewer name |
| testimonial stars | `.sgs-testimonial__stars` | rating stars |
| trustpilot-bar | `.sgs-social-proof__trustpilot-bar` | external review bar |
| trustpilot-logo | `.sgs-social-proof__trustpilot-logo` | TP logo |
| trustpilot-stars | `.sgs-social-proof__trustpilot-stars` | TP stars |
| trustpilot-text | `.sgs-social-proof__trustpilot-text` | TP rating text |

### Footer (`.sgs-footer`)

| Slot | Class | Maps to |
|------|-------|---------|
| inner | `.sgs-footer__inner` | wrapper |
| grid | `.sgs-footer__grid` | column grid |
| col | `.sgs-footer__col` | individual column |
| brand | `.sgs-footer__brand` | brand column |
| logo | `.sgs-footer__logo` | `core/site-logo` block (existing pattern uses this) |
| tagline | `.sgs-footer__tagline` | brand tagline paragraph |
| social | `.sgs-footer__social` | social icons row |
| bottom | `.sgs-footer__bottom` | bottom strip |
| meta | `.sgs-footer__meta` | copyright + meta |

## Cross-section utility classes

| Slot | Class | Notes |
|------|-------|-------|
| section-heading label | `.sgs-section-heading__label` | small label above heading |
| section-heading intro | `.sgs-section-heading__intro` | main heading |
| section-heading sub | `.sgs-section-heading__sub` | subheading / lede |

Convention introduced for cross-cutting section headings. A `sgs/section-heading` block does not yet exist; create one in Phase 7 / 8 if the recogniser needs it.

## Buttons

| Slot | Class | Notes |
|------|-------|-------|
| button | `.sgs-button` | block slug |
| primary | `.sgs-button--primary` | primary CTA variant |
| secondary | `.sgs-button--secondary` | secondary CTA variant |
| ghost | `.sgs-button--ghost` | low-emphasis variant |

## State classes (exempt from Spec 13)

- `.active` — interactive state on nav items, cards, etc. Not a structural class.

## Gap candidates for Phase 8

Sections without an existing pattern that will need creating before live deploy:

1. `featured-product` pattern (1 instance, contains pills + price-row + CTA)
2. `products` pattern (4× `sgs/product-card` grid)
3. `gift-section` pattern (3× cards: 1 trial + 2 gifts)
4. `social-proof` pattern (testimonial-slider + trustpilot-bar)

Section-heading block (`sgs/section-heading` — wraps label/intro/sub) is a possible future addition if the recogniser needs a dedicated block for these utility classes; otherwise they remain a CSS-only convention.
