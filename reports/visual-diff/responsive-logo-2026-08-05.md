---
block: responsive-logo
date: 2026-08-05
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/responsive-logo: prefix-to-suffix rename + image-shape mirror — 2026-08-05

**Change.** Two parts. (1) `desktopLogoId`/`tabletLogoId`/`mobileLogoId` became
`logoId`/`logoIdTablet`/`logoIdMobile`, moving the device tier from a PREFIX to the framework's
universal SUFFIX convention. (2) Added `logoUrl`/`logoUrlTablet`/`logoUrlMobile` (`string`) beside the
integer IDs, mirroring `sgs/media`'s `imageId` + `imageUrl` pair; `render.php` resolves ID-first with
the URL as fallback (the `media/render.php:467` order). `alt` now carries role `image-alt` with
`alt_companion_attr=logoUrl`.

**Why the URL half matters.** `walk.py:295` gates alt capture on
`role == "image-object" AND attr_type == "string"`. Three bare attachment IDs (`type=number`) could
never satisfy it, which is why `alt` was routed through the interim `authored-alt-text` category. This
change is what actually retires that category — NOT the rename. The rename changed no `attr_type`, so
`image-alt` stayed non-viable after it; verified post-rename, not assumed.

**Second bug fixed en route.** `edit.js` read `attributes._desktopLogoUrl` — attrs never declared in
`block.json`, so WordPress silently discarded them. After any save-and-reload every preview URL was
`undefined` and each slot fell back to its placeholder: the operator's chosen logo appeared to vanish
from the EDITOR while the ID was stored fine and the frontend rendered correctly. Now persisted to the
declared `logoUrl*` attrs.

**Live capture performed (post-deploy, this change deployed to the canary on 2026-08-05):**
`https://sandybrown-nightingale-600381.hostingersite.com/` loaded in Playwright at TWO viewports —
desktop (1745px inner) and mobile (341px inner). Measured on the real painted DOM:

| | desktop | mobile |
|---|---|---|
| `sgs/site-header` | 1731 x 93, text 73 chars | h 90 |
| `sgs/site-footer` | 1731 x 188, text 143 chars | h 363 |
| `sgs/responsive-logo` img | 180 x 67.6, real src, alt "Mama&#39;s Munches home" | visible, same src + alt |
| broken images (naturalWidth===0) | 0 | 0 |
| horizontal overflow | none | none |

Deployed schema re-read over SSH from `wp-content/plugins/sgs-blocks/build/` ON THE SERVER — not from
the local tree — confirming the shipped `block.json` carries the intended attributes.

**What the capture proves for THIS block.** The live instance stores an attachment ID and no
`logoUrl` (it predates this change), so it exercises the ID-wins path: the logo renders at 180x67.6
with a real `src` and the functional default alt, unchanged from before the deploy. No broken image,
no layout shift, identical at mobile.

**Render-path proof for the NEW path.** A cloned block has a draft `<img src>` and no library item, so
there is no ID to resolve — that case does not exist on the canary and cannot be captured there.
`plugins/sgs-blocks/scripts/tests/test-responsive-logo-url-fallback.php` bootstraps the REAL
`render.php` and asserts 5 cases: ID-only resolves, URL-only renders, ID WINS when both are set,
no-source early-returns, plus a vacuity guard. Proven able to fail — removing the fallback fails the
URL-only check; inverting precedence fails both both-set checks; restored gives 5/5 green.

**Gates.** `check-dead-controls` 0 net-new; `check-dead-pattern-attrs` OK; `check-control-ux` 0
net-new (4 baselined — the `logoId*`/`logoUrl*` tier pairs, accepted because these are three DISTINCT
media assets each needing an always-visible slot, per the block's own text: "Desktop logo is required.
Tablet and mobile fall back to desktop when not set.").
