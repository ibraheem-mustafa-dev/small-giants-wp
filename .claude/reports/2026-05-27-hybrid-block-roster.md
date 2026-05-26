---
doc_type: report
generated: 2026-05-27
spec_ref: 22-FR-22-6
session_tag: small-giants-wp-2026-05-27-spec-22-phase-0-4
---

# Spec 22 Phase 0.4 — Hybrid-block roster

## Summary
- Total SGS blocks audited: 77
- Total block_attributes rows scanned (SGS-only): 1740
- Hybrid blocks (≥1 content-bearing attr): 61
- Estimated Phase 2 render.php migrations: 61
- Mean hybrid_attr_count per hybrid block: 3.08
- Median hybrid_attr_count: 2

## Roster (sorted by hybrid_attr_count descending)

| block_slug | hybrid_attr_count | example_attrs (first 5) |
|---|---|---|
| sgs/hero | 11 | backgroundImage, backgroundMedia, backgroundVideo, badges, ctaPrimaryText, ... |
| sgs/media | 8 | caption, decorMedia, imageUrl, linkUrl, videoAttachmentId, ... |
| sgs/icon-list | 7 | bulletChar, emojiChar, items, numberStyle, subBulletChar, ... |
| sgs/cta-section | 6 | backgroundImage, backgroundMedia, body, buttons, headline, ... |
| sgs/form-field-number | 6 | conditionalField, conditionalOperator, conditionalValue, fieldName, label, ... |
| sgs/container | 5 | backgroundImage, backgroundImageMobile, backgroundImageTablet, backgroundMedia, backgroundRepeat |
| sgs/form-field-address | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-checkbox | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-consent | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-date | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-email | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-file | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-hidden | 5 | conditionalField, conditionalOperator, conditionalValue, defaultValue, fieldName |
| sgs/form-field-phone | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-radio | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-select | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-text | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-textarea | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/form-field-tiles | 5 | conditionalField, conditionalOperator, conditionalValue, fieldName, label |
| sgs/icon | 5 | iconName, iconSource, iconValue, linkTarget, linkUrl |
| sgs/info-box | 5 | description, heading, iconValue, mediaEmoji, subtitle |
| sgs/button | 4 | anchor, iconTitle, iconValue, label |
| sgs/mobile-nav | 4 | ctaText, ctaUrl, secondaryCtaText, secondaryCtaUrl |
| sgs/product-card | 4 | ctaText, ctaUrl, description, priceNote |
| sgs/testimonial | 4 | avatar, name, quote, reviewDate |
| sgs/heading | 3 | headline, label, sub |
| sgs/team-member | 3 | bio, name, photo |
| sgs/whatsapp-cta | 3 | iconOverride, label, message |
| sgs/accordion-item | 2 | isOpen, title |
| sgs/announcement-bar | 2 | messages, targetDate |
| sgs/business-info | 2 | linkEmail, linkPhone |
| sgs/certification-bar | 2 | items, title |
| sgs/counter | 2 | label, number |
| sgs/label | 2 | tag, text |
| sgs/mega-menu | 2 | badge, label |
| sgs/notice-banner | 2 | customIcon, text |
| sgs/post-grid | 2 | readMoreText, tags |
| sgs/quote | 2 | attribution, body |
| sgs/text | 2 | tag, text |
| sgs/trustpilot-reviews | 2 | reviews, subtitleText |
| sgs/card-grid | 1 | items |
| sgs/countdown-timer | 1 | targetDate |
| sgs/decorative-image | 1 | imageUrl |
| sgs/featured-product | 1 | text |
| sgs/footer | 1 | text |
| sgs/form-review | 1 | heading |
| sgs/form-step | 1 | label |
| sgs/gallery | 1 | images |
| sgs/gift-section | 1 | text |
| sgs/header | 1 | text |
| sgs/icon-block | 1 | iconValue |
| sgs/process-steps | 1 | steps |
| sgs/responsive-logo | 1 | alt |
| sgs/social-icons | 1 | icons |
| sgs/social-proof | 1 | text |
| sgs/star-rating | 1 | label |
| sgs/tab | 1 | label |
| sgs/table-of-contents | 1 | title |
| sgs/testimonial-slider | 1 | testimonials |
| sgs/timeline | 1 | entries |
| sgs/trust-badges | 1 | items |

## Per-block detail (blocks with hybrid_attr_count ≥ 3)

### sgs/hero (11 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| backgroundImage | sgs/media | A |
| backgroundMedia | sgs/media | A |
| backgroundVideo | sgs/media | A |
| badges | sgs/info-box | A |
| ctaPrimaryText | sgs/button | A |
| ctaPrimaryUrl | sgs/button | A |
| ctaSecondaryText | sgs/button | A |
| ctaSecondaryUrl | sgs/button | A |
| headline | sgs/heading | A |
| label | sgs/label | A |
| subHeadline | sgs/text | A |

### sgs/media (8 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| caption | sgs/text | A |
| decorMedia | sgs/media | A |
| imageUrl | sgs/media | A |
| linkUrl | sgs/button | A |
| videoAttachmentId | sgs/media | A |
| videoPosterAttachmentId | sgs/media | A |
| videoPosterUrl | sgs/media | A |
| videoSchema | sgs/text | A |

### sgs/icon-list (7 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| bulletChar | sgs/icon | A |
| emojiChar | sgs/icon | A |
| items | sgs/info-box | A |
| numberStyle | sgs/counter | A |
| subBulletChar | sgs/icon | A |
| subEmojiChar | sgs/icon | A |
| subIcon | sgs/icon | A |

### sgs/cta-section (6 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| backgroundImage | sgs/media | A |
| backgroundMedia | sgs/media | A |
| body | sgs/text | A |
| buttons | sgs/button | A |
| headline | sgs/heading | A |
| stats | sgs/counter | A |

### sgs/form-field-number (6 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |
| step | sgs/process-steps | A |

### sgs/container (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| backgroundImage | sgs/media | A |
| backgroundImageMobile | sgs/media | A |
| backgroundImageTablet | sgs/media | A |
| backgroundMedia | sgs/media | A |
| backgroundRepeat | sgs/media | A |

### sgs/form-field-address (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-checkbox (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-consent (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-date (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-email (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-file (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-hidden (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| defaultValue | sgs/text | A |
| fieldName | sgs/label | A |

### sgs/form-field-phone (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-radio (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-select (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-text (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-textarea (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/form-field-tiles (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| conditionalField | sgs/text | A |
| conditionalOperator | sgs/text | A |
| conditionalValue | sgs/text | A |
| fieldName | sgs/label | A |
| label | sgs/label | A |

### sgs/icon (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| iconName | sgs/icon | A |
| iconSource | sgs/icon | A |
| iconValue | sgs/icon | A |
| linkTarget | sgs/button | A |
| linkUrl | sgs/button | A |

### sgs/info-box (5 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| description | sgs/text | A |
| heading | sgs/heading | A |
| iconValue | sgs/icon | A |
| mediaEmoji | sgs/media | A |
| subtitle | sgs/text | A |

### sgs/button (4 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| anchor | sgs/button | A |
| iconTitle | sgs/icon | A |
| iconValue | sgs/icon | A |
| label | sgs/label | A |

### sgs/mobile-nav (4 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| ctaText | sgs/button | A |
| ctaUrl | sgs/button | A |
| secondaryCtaText | sgs/button | A |
| secondaryCtaUrl | sgs/button | A |

### sgs/product-card (4 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| ctaText | sgs/button | A |
| ctaUrl | sgs/button | A |
| description | sgs/text | A |
| priceNote | sgs/pricing-table | A |

### sgs/testimonial (4 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| avatar | sgs/media | A |
| name | sgs/heading | A |
| quote | sgs/quote | A |
| reviewDate | sgs/testimonial | A |

### sgs/heading (3 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| headline | sgs/heading | A |
| label | sgs/label | A |
| sub | sgs/text | A |

### sgs/team-member (3 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| bio | sgs/text | A |
| name | sgs/heading | A |
| photo | sgs/media | A |

### sgs/whatsapp-cta (3 hybrid attrs)
| attr_name | resolved equivalent_block | derivation_tier |
|---|---|---|
| iconOverride | sgs/icon | A |
| label | sgs/label | A |
| message | sgs/text | A |

## Out-of-roster blocks (audited, 0 hybrid attrs)

The following SGS blocks have no content-bearing attrs and require no render.php migration in Phase 2:

- sgs/accordion, sgs/back-to-top, sgs/brand-strip, sgs/breadcrumbs, sgs/data-display
- sgs/divider, sgs/feature-grid, sgs/form, sgs/google-reviews, sgs/mobile-nav-toggle
- sgs/modal, sgs/multi-button, sgs/pricing-table, sgs/reading-progress, sgs/svg-background
- sgs/tabs

## Methodology
- `equivalent_block_for()` implementation: converter_v2/db_lookup.py:867 (positive-allowlist 2-tier per D85/D86)
- Query date (UTC): 2026-05-26T13:03:35.097125Z
- DB snapshot: triple-NULL = 1,090 (post Phase 0.1 baseline, preserved by D85 positive-allowlist gate)
- slot_synonyms.role_classification distribution: 4 content-bearing + 1 styling-behaviour + 53 unclassified
- Total SGS block_attributes rows: 1740

## Phase 2 scope statement
This roster IS the canonical Phase 2 scope. Hand-curated additions are out per R-22-1 (DB-first). New blocks added to the framework AFTER this audit require re-running the audit query.
