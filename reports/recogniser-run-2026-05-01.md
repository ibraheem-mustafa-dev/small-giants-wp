# Recogniser Run -- mamas-munches -- 2026-05-01

- Source HTML: `sites\mamas-munches\mockups\homepage\index.html`
- Sections: 9
- Variation: `mamas-munches`

## Summary

- Full matches: 3
- Partial: 3
- Fallback: 1
- Deferred: 2

## Prompt template tweaks applied

- Added 'raw mockup, not WP-rendered' header so missing SGS class names don't downgrade matches to partial.
- Strengthened SGS-vs-core preference rule: match by semantic role first (header/hero/feature-grid/testimonial/notice-banner/footer), with class fingerprints as a hint not a requirement.
- Tightened deferred-tier definition: only sections with explicit ecom content (price+currency, add-to-cart, variant selector) qualify; generic product-CTA sections fall back to sgs/cta or core.
- Added quick-reference SGS block list inline so the model has a concrete shortlist to choose from on every section.

## Decisions

| section_id | semantic_role | block | tier | confidence | gap |
|------------|---------------|-------|------|-----------:|-----|
| site-header | header | core/group | deferred | 0.00 | -- |
| made-for-the-mum-who-needs-it-most | main | sgs/hero | full | 0.96 | -- |
| trust-bar | main | sgs/notice-banner | partial | 0.82 | extend-base: multi-badge-row, icon-per-badge, pending-state-badge |
| zookies-our-signature-giant-cookie | main | core/group | deferred | 0.00 | -- |
| a-story-that-started-with-a-friend | main | core/columns | fallback | 0.90 | -- |
| proper-ingredients-properly-used | main | sgs/feature-grid | partial | 0.82 | new-block: sgs/feature-grid block does not exist in catalogue, eyebrow-label-slot, intro-paragraph-slot, disclaimer-footer-slot, emoji-icon-type |
| a-gift-she-ll-actually-use | main | sgs/feature-grid | partial | 0.82 | extend-base: per-card-tag-eyebrow, per-card-price, per-card-cta-button, trailing-notice-bar-slot |
| what-mums-are-saying | main | sgs/testimonial | full | 0.95 | -- |
| shop | footer | sgs/footer | full | 0.94 | -- |

## Per-section detail

### site-header

```json
{
  "section_id": "site-header",
  "match": {
    "block_name": "core/group",
    "confidence": 0.0,
    "tier": "deferred",
    "extracted_attrs": {
      "className": "sgs-deferred-recogniser-failure",
      "note": "Recogniser parse error: inner JSON parse error: Expecting ',' delimiter: line 1 column 1187 (char 1186)"
    },
    "inner_blocks": []
  }
}
```

### made-for-the-mum-who-needs-it-most

```json
{
  "section_id": "made-for-the-mum-who-needs-it-most",
  "match": {
    "block_name": "sgs/hero",
    "confidence": 0.96,
    "tier": "full",
    "extracted_attrs": {
      "headline": "Made for the mum who needs it most",
      "subHeadline": "Handmade lactation cookies with proper galactagogue ingredients. No medical claims — just nourishment your body will thank you for.",
      "ctaPrimaryText": "Shop Zookies",
      "ctaPrimaryUrl": "/shop/",
      "ctaSecondaryText": "Try 3 for £5",
      "ctaSecondaryUrl": "/product/trial-pack/"
    },
    "inner_blocks": []
  }
}
```

### trust-bar

```json
{
  "section_id": "trust-bar",
  "match": {
    "block_name": "sgs/notice-banner",
    "confidence": 0.82,
    "tier": "partial",
    "extracted_attrs": {
      "badges": [
        {
          "icon": "home",
          "text": "Handmade in Birmingham"
        },
        {
          "icon": "check",
          "text": "Registered Food Business"
        },
        {
          "icon": "truck",
          "text": "Free UK Delivery Over £35"
        },
        {
          "icon": "star",
          "text": "Loved by Breastfeeding Mums"
        },
        {
          "icon": "moon",
          "text": "Halal Certified",
          "pending": true
        }
      ]
    },
    "gap": {
      "missing_features": [
        "multi-badge-row",
        "icon-per-badge",
        "pending-state-badge"
      ],
      "classification": "extend-base",
      "recommended_path": "extend sgs/notice-banner with a repeatable badges array (icon + text + pending flag) rendered as a horizontal trust-bar layout, OR introduce sgs/trust-bar as a dedicated block if notice-banner should remain single-message"
    }
  }
}
```

### zookies-our-signature-giant-cookie

```json
{
  "section_id": "zookies-our-signature-giant-cookie",
  "match": {
    "block_name": "core/group",
    "confidence": 0.0,
    "tier": "deferred",
    "extracted_attrs": {
      "className": "sgs-deferred-featured-product",
      "note": "TODO: Replace with sgs/product-card (with pack-size variant pills, price, add-to-cart) and a sgs/trial-pack-card once SGS Ecom Plugin Phase 1 ships. Section contains two product cards with explicit price (£10.00, £5.00), pack-size variant selector (8/12/20/40-pack pills with aria-pressed state), and add-to-cart CTAs — all ecom primitives deferred to Ecom Plugin Phase 1."
    }
  }
}
```

### a-story-that-started-with-a-friend

```json
{
  "section_id": "a-story-that-started-with-a-friend",
  "match": {
    "block_name": "core/columns",
    "confidence": 0.9,
    "tier": "fallback",
    "extracted_attrs": {
      "columns": 2
    },
    "inner_blocks": [
      {
        "block_name": "core/column",
        "inner_blocks": [
          {
            "block_name": "core/image",
            "extracted_attrs": {
              "url": "../../research/photography/wp-media-library/Halimahs.jpeg",
              "alt": "A mum smiling and holding Mama's Munches cookies"
            }
          }
        ]
      },
      {
        "block_name": "core/column",
        "inner_blocks": [
          {
            "block_name": "core/heading",
            "extracted_attrs": {
              "level": 2,
              "content": "A story that started with a friend"
            }
          },
          {
            "block_name": "core/quote",
            "extracted_attrs": {
              "value": "She was struggling with breastfeeding her newborn. We started making lactation cookies together — using oats, brewer's yeast, flaxseed, fenugreek. The same ingredients that have appeared in traditional postpartum foods from Pakistan to West Africa for generations.\n\nThey helped her. I was so grateful.\n\nNow I make them for breastfeeding mums across the UK. Not because I can promise they'll work for every mum — I can't, and I won't. But because they're real food, with real ingredients, made with real care. And many mums tell me they helped.",
              "citation": "Zainab, Founder of Mama's Munches"
            }
          },
          {
            "block_name": "core/button",
            "extracted_attrs": {
              "text": "Read the full story →",
              "url": "/about/"
            }
          }
        ]
      }
    ]
  }
}
```

### proper-ingredients-properly-used

```json
{
  "section_id": "proper-ingredients-properly-used",
  "match": {
    "block_name": "sgs/feature-grid",
    "confidence": 0.82,
    "tier": "partial",
    "extracted_attrs": {
      "eyebrow": "What's in them?",
      "headline": "Proper ingredients, properly used",
      "intro": "Every Zookie contains the same four galactagogues that appear in postpartum food traditions across cultures.",
      "columns": 4,
      "iconType": "emoji",
      "disclaimer": "We make nourishing food. We don't make medical claims. If you have specific concerns about lactation, your IBCLC or midwife is the right person to speak to.",
      "items": [
        {
          "icon": "🌾",
          "heading": "Oats",
          "text": "Rich in iron. Used in postpartum foods across cultures for centuries."
        },
        {
          "icon": "🍺",
          "heading": "Brewer's Yeast",
          "text": "B-vitamins and chromium. A traditional galactagogue used worldwide."
        },
        {
          "icon": "🌿",
          "heading": "Flaxseed",
          "text": "Omega-3 fatty acids. Good for mum and baby."
        },
        {
          "icon": "🌱",
          "heading": "Fenugreek",
          "text": "Traditional postpartum herb. If your baby shows GI sensitivity, speak to your midwife first."
        }
      ]
    },
    "inner_blocks": [],
    "gap": {
      "missing_features": [
        "sgs/feature-grid block does not exist in catalogue",
        "eyebrow-label-slot",
        "intro-paragraph-slot",
        "disclaimer-footer-slot",
        "emoji-icon-type"
      ],
      "classification": "new-block",
      "recommended_path": "build sgs/feature-grid with attrs: eyebrow, headline, intro, columns (2-6), iconType (emoji|svg|lucide), items[] (icon, heading, text), disclaimer; until shipped, fall back to core/columns with sgs/icon-block + core/heading + core/paragraph per column"
    }
  }
}
```

### a-gift-she-ll-actually-use

```json
{
  "section_id": "a-gift-she-ll-actually-use",
  "match": {
    "block_name": "sgs/feature-grid",
    "confidence": 0.82,
    "tier": "partial",
    "extracted_attrs": {
      "eyebrow": "Give the gift of nourishment",
      "headline": "A gift she'll actually use",
      "subHeadline": "For baby showers, new arrivals, and the mums who deserve a treat.",
      "columns": 2,
      "cards": [
        {
          "tag": "Gift idea",
          "heading": "New Baby Gift Box",
          "description": "The perfect gift for a new mum. A mix of Zookies and Classics in a gift box, ready to send.",
          "price": "£15",
          "ctaText": "Shop Gift Box",
          "ctaUrl": "/product/gift-box/"
        },
        {
          "tag": "Most thoughtful",
          "heading": "40-Day Care Bundle",
          "description": "Six weekly deliveries for the 40-day postnatal window. One of the most thoughtful gifts you can give a new mum.",
          "price": "£42",
          "ctaText": "Shop Bundle",
          "ctaUrl": "/product/40-day-bundle/"
        }
      ]
    },
    "inner_blocks": [
      {
        "block_name": "sgs/notice-banner",
        "extracted_attrs": {
          "icon": "emoji",
          "iconValue": "🏥",
          "text": "Heading to hospital? Ask us about our Send to Ward delivery.",
          "linkText": "Find out more →",
          "linkUrl": "/send-to-ward/"
        }
      }
    ],
    "gap": {
      "missing_features": [
        "per-card-tag-eyebrow",
        "per-card-price",
        "per-card-cta-button",
        "trailing-notice-bar-slot"
      ],
      "classification": "extend-base",
      "recommended_path": "extend sgs/feature-grid card schema with tag, price, ctaText, ctaUrl attributes; render price above CTA. Notice bar already covered by appending sgs/notice-banner with linkText/linkUrl (already a known extend-base gap on notice-banner)."
    }
  }
}
```

### what-mums-are-saying

```json
{
  "section_id": "what-mums-are-saying",
  "match": {
    "block_name": "sgs/testimonial",
    "confidence": 0.95,
    "tier": "full",
    "extracted_attrs": {
      "heading": "What mums are saying",
      "subheading": "Real feedback from real mums — nothing fabricated.",
      "columns": 3,
      "showRating": true,
      "layout": "card",
      "testimonials": [
        {
          "quote": "I was sceptical but honestly these have made such a difference. My supply picked up within a few days. And they actually taste amazing.",
          "name": "Reham",
          "role": "London",
          "rating": 5
        },
        {
          "quote": "Bought these for my best friend who was really struggling. She was in tears when they arrived — said they were the loveliest gift. And they did help.",
          "name": "Sarah M.",
          "role": "Manchester",
          "rating": 5
        },
        {
          "quote": "Zainab is so responsive and lovely. The cookies arrived quickly and my daughter (new mum) absolutely loved them. Will order again and again.",
          "name": "Halimah",
          "role": "Birmingham",
          "rating": 5
        }
      ]
    },
    "inner_blocks": []
  }
}
```

### shop

```json
{
  "section_id": "shop",
  "match": {
    "block_name": "sgs/footer",
    "confidence": 0.94,
    "tier": "full",
    "extracted_attrs": {
      "logoUrl": "../../research/brand/Mamas-Munches-Horizontal-Logo-2-305x102.webp",
      "logoAlt": "Mama's Munches",
      "tagline": "Real food for real mums. Handmade in Birmingham with care.",
      "location": "Birmingham, UK",
      "email": "Zainab@mamasmunches.com",
      "socialLinks": [
        {
          "platform": "instagram",
          "url": "https://www.instagram.com/mamasmunches/",
          "label": "Instagram"
        },
        {
          "platform": "whatsapp",
          "url": "/contact/",
          "label": "WhatsApp"
        }
      ],
      "columns": [
        {
          "heading": "Shop",
          "links": [
            {
              "text": "All Products",
              "url": "/shop/"
            },
            {
              "text": "Zookies",
              "url": "/product/zookies/"
            },
            {
              "text": "Trial Pack (£5)",
              "url": "/product/trial-pack/"
            },
            {
              "text": "Gift Ideas",
              "url": "/gift-ideas/"
            },
            {
              "text": "Send to Ward",
              "url": "/send-to-ward/"
            },
            {
              "text": "Our Story",
              "url": "/about/"
            },
            {
              "text": "FAQs",
              "url": "/faqs/"
            }
          ]
        },
        {
          "heading": "Information",
          "links": [
            {
              "text": "Privacy Policy",
              "url": "/privacy-policy/"
            },
            {
              "text": "Shipping Info",
              "url": "/shipping/"
            },
            {
              "text": "Terms & Conditions",
              "url": "/terms/"
            },
            {
              "text": "Allergen Information",
              "url": "/allergens/"
            },
            {
              "text": "Contact Us",
              "url": "/contact/"
            }
          ]
        }
      ],
      "copyright": "© 2026 Mama's Munches. Registered Food Business, Birmingham.",
      "bottomNote": "Made with love for breastfeeding mums 🍪"
    },
    "inner_blocks": []
  }
}
```
