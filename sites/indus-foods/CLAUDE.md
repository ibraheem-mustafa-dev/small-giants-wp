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
--primary: #0a7ea8 (teal)          --accent: #d8ca50 (gold)
--primary-dark: #076a8e            --accent-light: #e7d768
--success: #2E7D4F (green)         --whatsapp: #25D366
--surface: #FFFFFF                 --surface-alt: #F2F5F7
--text: #1E1E1E                    --text-muted: #424242
--text-inverse: #FFFFFF            --border-subtle: #2eade2
--footer-bg: #2c3e50
```

**Fonts:** Montserrat (headings) + Source Sans 3 (body) — self-hosted variable WOFF2.

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

## Deploy

Use the tar method from the framework CLAUDE.md — `scp -r` creates nested directories on Hostinger.

```bash
# Build blocks plugin first
cd plugins/sgs-blocks && npm run build && cd ../..

# Deploy via tar (from repo root — see framework CLAUDE.md for full sequence)
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' theme/sgs-theme plugins/sgs-blocks
# ... rest of tar/scp/ssh sequence in framework CLAUDE.md Deploy Commands section
```

**DO NOT deploy to lightsalmon-tarsier-683012.hostingersite.com** — that's the client-facing test site.

## Page Build Status

| Page | Status | Notes |
|---|---|---|
| Homepage | ✅ Deployed | Post ID 13, all sections rendering (needs visual polish) |
| /contact/ | ✅ Created | Post ID 57 (placeholder content) |
| /apply-for-trade-account/ | ✅ Created | Post ID 58 (placeholder content) |
| Food Service | Not started | Template for all service pages (V3 mockup) |
| Manufacturing | Not started | Same template, different content |
| Retail | Not started | Same template, different content |
| Wholesale | Not started | Same template, different content |
| Trade Application | Not started | V2 mockup, requires form blocks (Phase 1b) |
| /brands/ | Not started | Mega menu template parts ready |
| /our-story/ | Not started | |
| /certifications/ | Not started | |
| /blog/ | Not started | |

Update this table as pages are built and deployed.

## Placeholder Items Awaiting Client

- Real customer testimonials (mockups have placeholders)
- Certification logos: BRC, Halal, SALSA, Unitas, FWD
- Brand logos: Sanam, Shaan, Falak Rice, Lemon Tree, Leaf Green
- Professional photography (placeholder images flagged in mockups)
