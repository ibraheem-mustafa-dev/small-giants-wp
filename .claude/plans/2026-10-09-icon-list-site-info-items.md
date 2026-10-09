# sgs/icon-list: items that take their text and link from Site Info

Approved by Bean 2026-10-09 (Eye Care fix register, footer "Visit or call" column: one link list holding a typed link, phone, address, opening hours and email).

## What changes

Each `items[]` entry of `sgs/icon-list` gains two optional keys (no renames, no new top-level attribute, old saved content untouched):

- `siteInfoSource`: `''`/`typed` (today's behaviour) | `phone` | `email` | `address` | `hours`.
- `siteInfoLink`: boolean. Address: link to the Site Info Maps link (same as `sgs/business-info` `addressLink`). Hours: link to the typed `url` if the item has one, else the Google Business profile (`socials.google`). Phone and email always link (`tel:` / antispambot `mailto:`), as business-info does.

A blank Site Info value hides the item (same rule as `sgs/icon`). Hidden items are dropped before the loop, so the per-item `:nth-child` colour rules stay aligned.

## Reuse (no duplicated formatting)

- New `includes/helpers-site-info-items.php` (aggregated by `render-helpers.php`): `sgs_site_info_hours_groups()` (the condensed-hours grouping lifted out of `business-info/render.php`, which now calls it), `sgs_site_info_hours_text()`, `sgs_site_info_item()` (text HTML + href per source).
- Link maths stays in `Sgs_Site_Info_Binding::link_for_key()`; values in `Sgs_Site_Info::get()`.
- Editor: `window.sgsBlocksData.siteInfo` (phone, email, address) plus a new `window.sgsBlocksData.siteInfoHours` ({text, link}) printed by `Sgs_Site_Info_Binding`, so the canvas shows the real value.

## Files

render.php, block.json (items.properties docs), edit.js (ItemEditor: Content source select, preview, link toggle, typed link), helpers file, business-info/render.php, class-sgs-site-info-binding.php, wp-stubs (is_email, antispambot), tests/php/IconListSiteInfoItemsTest.php.

## Verification

PHPUnit red first (each source, blank hides, escaping, nth-child alignment, business-info condensed parity), `npm run build`, audit-inline-styling --check, run-gates fast tier. No deploy, no reseed.
