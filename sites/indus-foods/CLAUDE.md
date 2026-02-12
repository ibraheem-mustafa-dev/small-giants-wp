# Indus Foods — Site-Specific Instructions

## Client Overview

**Indus Foods Ltd** — Birmingham-based ethnic food wholesaler, est. 1962, £15.3M turnover, 5,000+ customers. Website built by Small Giants Studio using the SGS WordPress framework.

## Live Sites

- **Test site:** https://lightsalmon-tarsier-683012.hostingersite.com/ — DO NOT modify, client-facing
- **Dev site:** palestine-lives.org — safe for testing and deployment

## Design Reference

All design decisions are documented in `notes/Indus-Foods-Website-Research-Updated-V2V3.md` — this is the single source of truth.

### Design Tokens (Indus Foods Variation)

These values live in `theme/sgs-theme/styles/indus-foods.json` (WordPress style variation):

```
--primary: #1A3A5C (navy)         --accent: #D4A843 (gold)
--primary-dark: #0F2640            --accent-light: #F5E6C4
--success: #2E7D4F (green)         --whatsapp: #25D366
--surface: #FFFFFF                 --surface-alt: #F8F7F4
--text: #1E1E1E                    --text-muted: #555555
```

**Fonts:** DM Serif Display (headings) + DM Sans (body) — self-hosted WOFF2.

### Page Architecture

One service page template serves all four audiences. Only these elements change per page:

1. Hero headline and sub-headline
2. Benefit cards (pain points/solutions)
3. Featured product categories
4. Testimonial

Shared sections (trust bar, heritage strip, process, delivery, brands, certifications, final CTA) are identical across all four.

### Trade Application Form (4 Steps)

1. **About You** — personal info, low-friction (5 fields max)
2. **Business Details** — VAT/CRN optional, sole-trader-friendly
3. **Account Preferences** — visual product tiles, delivery/payment
4. **Review & Submit** — summary with edit buttons, file upload, T&Cs/GDPR

## Files in This Directory

| Directory | Contents |
|---|---|
| `mockups/` | HTML design references — Food Service V3 (template for all service pages) and Trade Application V2 |
| `content/` | Image status notes, test site URL, asset requirements |
| `notes/` | Research document (V2V3) — full company intel, competitive analysis, design rationale |

## Placeholder Items Awaiting Client

- Real customer testimonials (mockups have placeholders)
- Certification logos: BRC, Halal, SALSA, Unitas, FWD
- Brand logos: Sanam, Shaan, Falak Rice, Lemon Tree, Leaf Green
- Professional photography (placeholder images flagged in mockups)
