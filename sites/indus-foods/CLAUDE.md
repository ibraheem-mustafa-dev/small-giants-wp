# Indus Foods — Site-Specific Instructions

## Client Overview

**Indus Foods Ltd** — Birmingham-based ethnic food wholesaler, est. 1962, £15.3M turnover, 5,000+ customers. Website built by Small Giants Studio using the SGS WordPress framework.

## Live Sites

- **Reference site (client's current live site, non-SGS stack):** https://lightsalmon-tarsier-683012.hostingersite.com/ — DO NOT modify, client-facing, read-only reference only
- **Dedicated test site (2026-09-19):** https://lavender-dinosaur-183533.hostingersite.com/ — a fresh, Indus-only SGS install (sgs-theme + sgs-blocks active, no WooCommerce, no other client's content). Registered as `build-deploy.py --target indus-test`. Indus's theme-snapshot tokens are already applied to this site's on-disk `theme.json`. Use this as the PRIMARY render target for all Indus header/footer/nav/homepage work — no shared-canary active-CPT-pointer conflict here.
- **Build/test site (shared canary, other clients live here too):** sandybrown-nightingale-600381.hostingersite.com — only ONE client's header/footer/drawer/theme-snapshot can be ACTIVE at a time (`sgs_active_header_cpt_id` etc. are single global `wp_options`, checked live 2026-09-19). Avoid for Indus header/footer/nav work now that the dedicated test site exists; still fine for isolated block-level QA that doesn't touch the active pointers.

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

Deploy to **sandybrown-nightingale-600381.hostingersite.com** (shared SGS canary) via `build-deploy.py`:

```bash
cd /c/Users/Bean/Projects/small-giants-wp
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

**DO NOT deploy to lightsalmon-tarsier-683012.hostingersite.com** — that's the client-facing test site.

After deployment, push Indus Foods colours onto the canary:

```bash
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73
```

## Page Build Status

**Header/footer/nav-drawer build (2026-09-19, dedicated test site https://lavender-dinosaur-183533.hostingersite.com/):**
`sgs_header` #28 (top-strip business-info phone/email + site-info social-icons; main row responsive-logo `logoId:5` + `sgs/nav-bar-menu` `ref:2` `drawerRef:27`) · `sgs_footer` #29 (4-col grid: Brand/Quick Links/Contact+Opening Hours/Address, collapses to 2-col tablet / 1-col mobile per `columns:{"desktop":4,"tablet":2}`; bottom copyright row) · `sgs_drawer` #27 (`sgs/nav-drawer-menu` `ref:2` + "Register for a Trade Account" CTA) · classic `nav_menu` term 2 "Indus Foods Primary" (7 top-level items; About/Sectors/Trade are dropdowns; Brands is a `post_type` item targeting `sgs_mega_menu` post #6, native FR-36-15 attach) · `sgs_mega_menu` #6 "Indus - Brands Mega Menu" (`sgs/mega-panel` variant=brands + `sgs/card-grid` 4 columns) · Home page #30 set as static front page. Active pointers (`sgs_active_header_cpt_id`=28, `sgs_active_footer_cpt_id`=29, `sgs_active_drawer_cpt_id`=27) set directly — safe on this dedicated site (nothing else to protect). Phone/email/address/opening-hours/socials populated once via `Sgs_Site_Info::set_internal()` (the `sgs_site_info` option) rather than hardcoded per-block, so `sgs/business-info` and `sgs/social-icons source="site-info"` both read the one store. Live-verified 375/768/1440: dropdowns (About/Sectors/Trade) open correctly, Brands mega renders all 4 columns at its real menu position, mobile drawer opens with full accordion tree + CTA, footer collapses 4→2→1 columns, 0 console errors (bar the expected favicon 404). **Post-build fix (same day):** independent verification found the desktop footer rendering only 3 grid tracks for 4 columns (Address wrapping into an ugly second row) — root-caused as content-level, not a framework bug: `columns:{"desktop":4}` alone drives the shared wrapper's intrinsic/auto-fit column sizing, whose default 256px per-column minimum didn't fit 4 real columns at this row's actual container width. Fixed by adding an explicit `"gridTemplateColumns":{"desktop":"1.4fr 1fr 1fr 1fr"}` to post #29's columns row, which takes precedence over the count-based auto-fit fallback. Live-verified: computed grid now renders `316.9px 226.4px 226.4px 226.4px`, all 4 columns as direct siblings, no wrapping. **Not run: Spec 36 §7 Phase-2 Gate-2's full acceptance sweep** (axe/occlusion/late-CSS-A-B/reduced-motion/Bean's-eye rubric) — deliberately out of scope for this pass, per Bean's direction. **Fixed same day:** About/Sectors/Trade parent items carried a literal `#` menu-item URL, which made `nav-bar-menu/render.php::from_link()`'s existing `has_url` check (`'' !== $raw_url`) incorrectly treat them as real links — rendering `<a href="#">` instead of the non-link disclosure trigger the mechanism was already built to emit for a parent-only item. Root cause was content (`_menu_item_url` postmeta on menu items #8/#14/#20), not code — cleared to `''` via `wp post meta update`, which now flows correctly through the pre-existing `has_url` branch. Live-verified: all three render as `<button aria-expanded>` (no `href`), dropdowns still open with all items intact, no page-jump. Brands' drawer plain-link degrade points at an internal `?sgs_mega_menu=` query URL (the CPT is `public=>false`, no real permalink) — expected per FR-36-5, not a bug. **Fixed same day:** the 4 mega-menu cards had no images. Per Bean's direction, sourced the real brand logos from the live reference site (https://lightsalmon-tarsier-683012.hostingersite.com/) rather than placeholders — downloaded server-to-server (Sanam/Shan Foods/Green Leaf/Lemontree, 500×500 JPEGs, matching the reference's own Astra mega-menu image-to-category mapping exactly), imported into this site's media library (attachment IDs 32-35), and wired into `sgs/card-grid`'s `items[].media` object on mega-menu post #6. Live-verified: mega-menu now renders all 4 real brand logos matching the reference.

| Page | Status | Notes |
|---|---|---|
| Homepage | ✅ Deployed | Post ID 13, all sections rendering (needs visual polish) — NOTE: this row's post IDs are on an OLDER site (see Live Sites); not yet reconciled with the new dedicated test site |
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
