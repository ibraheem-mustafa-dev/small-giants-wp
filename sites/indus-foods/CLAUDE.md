# Indus Foods — Site-Specific Instructions

## Client Overview

**Indus Foods Ltd** — Birmingham-based ethnic food wholesaler, est. 1962, £15.3M turnover, 5,000+ customers. Website built by Small Giants Studio using the SGS WordPress framework.

## Sites

- **Reference site (client's current live site, non-SGS stack):** https://lightsalmon-tarsier-683012.hostingersite.com/ — DO NOT modify or deploy to; client-facing, read-only reference only.
- **Indus Foods build/test site:** https://lavender-dinosaur-183533.hostingersite.com/ — an Indus-only SGS install (sgs-theme + sgs-blocks active, no WooCommerce). Deploy target `indus-test`. This is the PRIMARY render target for all Indus header/footer/nav/homepage work.
- **Shared canary (sandybrown):** the canary can hold only one client's active header/footer/drawer/theme-snapshot at a time — `sgs_active_header_cpt_id` etc. are single global `wp_options` — so it is for isolated block QA only.

## Design Reference

All design decisions are documented in `notes/Indus-Foods-Website-Research-Updated-V2V3.md` — this is the single source of truth.

### Design Tokens

These values live in `sites/indus-foods/theme-snapshot.json`:

```
--primary: #0A7EA8 (teal)          --accent: #D8CA50 (gold)
--primary-dark: #075E80            --accent-light: #E7D768
--success: #2E7D4F (green)         --whatsapp: #25D366
--surface: #FFFFFF                 --surface-alt: #F8F7F4
--text: #2C3E50                    --text-muted: #5A6070
--text-inverse: #FFFFFF            --border: #2EADE2
--footer-bg: #2C3E50
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
| `mockups/` | HTML design references — Food Service V3 (template for all service pages) and Trade Application V2/V3 |
| `content/` | Image status notes, test site URL, asset requirements |
| `notes/` | Research document (V2V3) — full company intel, competitive analysis, design rationale |

## Deploy

Deploy to the Indus test site via `build-deploy.py`:

```bash
cd /c/Users/Bean/Projects/small-giants-wp
python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test
```

Push the Indus Foods tokens (name the domain explicitly — `--target-domain` defaults to the canary):

```bash
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client indus-foods --target u945238940@141.136.39.73 \
  --target-domain lavender-dinosaur-183533.hostingersite.com
```

## Site Build State (indus-test)

Header/footer/nav-drawer objects:

| Object | ID | Contents |
|---|---|---|
| `sgs_header` | 28 | Top strip (business-info phone/email + site-info social icons); main row with responsive logo (`logoId` 5) + `sgs/nav-bar-menu` (`ref` 2, `drawerRef` 27) |
| `sgs_footer` | 29 | 4-column grid (Brand / Quick Links / Contact + Opening Hours / Address), 2 columns tablet, 1 mobile; bottom copyright row |
| `sgs_drawer` | 27 | `sgs/nav-drawer-menu` (`ref` 2) + "Register for a Trade Account" CTA |
| `sgs_mega_menu` | 6 | "Indus - Brands Mega Menu": `sgs/mega-panel` variant `brands` + `sgs/card-grid` (4 columns) |
| nav menu term | 2 | "Indus Foods Primary" — 7 top-level items; About / Sectors / Trade are dropdowns; Brands is a `post_type` item targeting `sgs_mega_menu` post 6 |
| Home page | 30 | Static front page |

Active pointers: `sgs_active_header_cpt_id`=28, `sgs_active_footer_cpt_id`=29, `sgs_active_drawer_cpt_id`=27. Phone, email, address, opening hours and socials live in the `sgs_site_info` option (set via `Sgs_Site_Info::set_internal()`), read by `sgs/business-info` and `sgs/social-icons source="site-info"`. The Brands mega-menu cards use brand logos (Sanam, Shan Foods, Green Leaf, Lemontree) held as media attachments 32-35, wired into `sgs/card-grid` `items[].media`.

Durable content rules:
- **A 4-column footer needs an explicit `gridTemplateColumns` override.** The count-based `columns:{"desktop":4}` attribute drives the wrapper's auto-fit sizing, whose per-column minimum can collapse 4 real columns to 3 tracks at this row's container width. Post 29 sets `"gridTemplateColumns":{"desktop":"1.4fr 1fr 1fr 1fr"}` on its columns row.
- **A parent-only dropdown menu item must have an EMPTY `_menu_item_url`.** A literal `#` makes `nav-bar-menu/render.php::from_link()`'s `has_url` check treat it as a real link and render `<a href="#">` instead of the non-link disclosure button. About / Sectors / Trade are stored with an empty URL.
- The Brands drawer plain-link degrade points at an internal `?sgs_mega_menu=` query URL (the CPT is `public=>false`, no permalink) — expected per FR-36-5.

Pages on the site: Home (30, published) and a draft privacy policy. Service pages (Food Service, Manufacturing, Retail, Wholesale), Trade Application, /brands/, /our-story/, /certifications/ and /blog/ are not built; the Brands mega menu is `sgs_mega_menu` post 6.

## Placeholder Items Awaiting Client

- Real customer testimonials (mockups have placeholders)
- Certification logos: BRC, Halal, SALSA, Unitas, FWD
- Brand logos: Sanam, Shaan, Falak Rice, Lemon Tree, Leaf Green
- Professional photography (placeholder images flagged in mockups)
