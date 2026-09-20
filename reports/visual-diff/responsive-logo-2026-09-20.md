# Visual diff — `sgs/responsive-logo` — 2026-09-20 (W2-l logo resolution chain, FR-36-22)

```
verdict: PASS
first_paint_capture_passed: true
blocks: responsive-logo, site-info (admin)
target: sandybrown-nightingale-600381.hostingersite.com
date:   2026-09-20
branch: main @ 6cf7c481c ("feat(responsive-logo): Site Info logo as the middle tier of the logo chain")
```

Live verification of the three-tier logo chain on the real canary homepage — **not** a
probe page for tiers 2/3: the ACTIVE header (post 3648, `Mamas Munches Header`) already
carries `<!-- wp:sgs/responsive-logo {"width":183,"linkToHome":true} /-->` with no
block-level logo, so the site header is itself the tier-2/3 test surface.

Every fetch used a `?qacb=<unique>` cache-buster and `wp litespeed-purge all` after each
state change; response headers read `x-hcdn-cache-status: MISS` on every capture, so no
result below came from a CDN copy.

## State touched, and its restore proof

| Thing | Original | Restored | Proof |
|---|---|---|---|
| `sgs_site_info` option | no `logo` key at all | no `logo` key | `wp option get sgs_site_info --format=json \| md5sum` = `a779a302030a4ebfb1906487ac2fac57` **before and after** |
| `custom_logo` theme mod | `10` | untouched | never written |
| Header post 3648 | — | untouched by Feature A | `post_content` md5 `79f62b4b6e269a8b7864c711ab4eb6af` unchanged across this feature |
| `[QA]` attachments 3701 (PNG), 3702 (TXT) | — | `wp post delete --force` | absent from `wp post list --s="[QA]"` |
| `[QA]` page 3704 (block-tier probe) | — | `wp post delete --force` | as above |

The `logo` key was written with `wp option patch insert/update/delete sgs_site_info logo`,
which round-trips the rest of the store untouched — proven by the md5 equality above.

## Checks

| # | Check | Measured evidence | ✓ |
|---|---|---|---|
| 1 | Baseline: header logo renders through `sgs/responsive-logo` with no block-level logo, resolving to tier 3 | homepage header `<img class="sgs-responsive-logo__image--desktop" src=".../uploads/2026/05/mamas-munches-logo.webp" alt="Mama&#039;s Munches home" width="183">` — `mamas-munches-logo.webp` is attachment 10 = the `custom_logo` theme mod | ✓ |
| 2 | Tier 2 (Site Info `logo`) overrides tier 3 | with `logo:3701`, header `<img src=".../uploads/2026/09/qa-logo-a.png">` | ✓ |
| 3 | Alt falls back to the ATTACHMENT's alt text, never the literal "logo" | `alt="[QA] Munches wordmark"` (the `_wp_attachment_image_alt` set on 3701) | ✓ |
| 4 | Alt falls back to `[Site] home` when the attachment has none | tier-3 render: `alt="Mama&#039;s Munches home"`; string `alt="logo"` appears 0 times in any capture | ✓ |
| 5 | NEGATIVE: non-existent attachment id falls THROUGH, does not render a broken img | `logo:999999` → header src back to `mamas-munches-logo.webp`; `999999` appears 0× in the HTML; `<img src="">` count 0 | ✓ |
| 6 | NEGATIVE: non-image attachment (text/plain, id 3702) falls THROUGH | header src back to `mamas-munches-logo.webp`; `qa-not-an-image` appears 0× in the HTML; `<img src="">` count 0 | ✓ |
| 7 | Clearing `logo` returns the ORIGINAL render exactly | every `sgs-responsive-logo__image` tag on the page (header + 2 footer/body instances) byte-identical to the step-1 capture — Python list equality `True` | ✓ |
| 8 | Tier 1 (block's own `logoId`) still wins over tier 2 | on one request with `logo:3701` active, `[QA]` page 3704's in-content block (`logoId:10, width:200`) rendered `mamas-munches-logo.webp` while the header on the SAME page rendered `qa-logo-a.png` | ✓ |
| 9 | Admin picker exists in the Identity section | wp-admin `admin.php?page=sgs` → section heading `Identity`, field label `Site logo` | ✓ |
| 10 | Choose/Replace + Remove controls present | buttons read `Replace logo` (correctly, because a logo was set — the code prints `Choose logo` only when empty) and `Remove logo`; live preview `<img>` showing `qa-logo-a.png` | ✓ |
| 11 | Media modal opens | after clicking Replace: `.media-modal` present + visible, title `Choose your site logo`, media router tabs present, 160 attachments listed | ✓ |
| 12 | No console errors on the admin page | 0 errors after login + page load + modal open | ✓ |

## Notes

- Check 9 initially "failed" against `admin.php?page=sgs-site-info`; that is NOT the URL.
  `Sgs_Site_Info_Admin::add_menu()` registers the submenu under
  `Sgs_Admin_Menu::MENU_SLUG` (`'sgs'`) while `PAGE_SLUG` (`'sgs-site-info'`) is only the
  Settings-API section key. Recorded here so the next probe does not re-derive it.
- The picker also surfaces a `Set logo in Site Editor →` deep-link for tier 3, matching
  `class-sgs-site-info-admin.php`'s docblock.

## Screenshots

`reports/visual-diff/responsive-logo-2026-09-20/`

- `header-site-info-logo-1440.png` — header element with the Site Info logo active (tier 2)
- `header-restored-custom-logo-1440.png` — header element after restore (tier 3, baseline)
- `site-info-logo-picker-modal.png` — the Site Info admin page with the media modal open
