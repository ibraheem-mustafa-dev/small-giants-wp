---
title: Google reviews inline badge in the header row (Eye Care D7 redesign)
project: small-giants-wp
created: 2026-10-08
status: done 2026-10-08 - built, council-reviewed and verified live on eye-care-test (dd32a11d2); register D7 and 13 closed
authors: Bean, Claude
governs: Eye Care fix register D7 (.claude/plans/2026-10-02-eye-care-fix-register.md); Spec 36/37 (header family); sgs/google-reviews
---

# Google reviews inline badge in the header row

## Why
D7 put the Google rating in the header, but it was built as a whole extra row above the logo and nav: a bordered strip holding a white card badge (padding 1rem 1.5rem, border, shadow, text stacked in two lines). It is 135px tall at 1440 and 175px at 375, and the header grows from 79px (draft) to 223px (live). Bean (2026-10-08): it looks disgusting and claims its own row; it belongs inside the header row beside the logo, nav and phone, compressed when space is short, and on phones it fits in the drawer.

## Decisions (Bean, 2026-10-08)
- **Desktop:** beside the phone number, in the empty space between the logo and the phone (about 190px free at 1440), divided from the phone by a hairline. Slim one-line credential, no card, border or shadow: Google G (colour), five gold stars, `4.7`, `15 reviews` in small muted text. Always visible.
- **Squeezed widths** (below about 1200px while the header is still the desktop layout): it compresses itself to the G and `★ 4.7` (count and four stars drop) so nothing wraps.
- **Tablet and mobile (the drawer layouts, 768 and 375):** not in the header row. A slim `G ★★★★★ 4.7 · 15 reviews` line sits at the top of the nav drawer, linking to the Google listing.
- The empty top `sgs/site-header-row` (`cr-ref-header-2`) is deleted from `header.tree.json`.

## Decisions (Bean, 2026-10-08, second pass)
- The badge is its own block, `sgs/google-rating-badge`, designed as a badge rather than the reviews block's header with parts removed. The reviews block's `badge` and `floating-badge` variants are removed; floating becomes a position option on the new block.
- The "Maps" part of the logo goes everywhere: the reviews block's attribution logo becomes Google's "Google" wordmark, and condensed badges use the G.
- Research (verified 2026-10-08):
  - Google's customer-review brand rules (partnermarketinghub.withgoogle.com/brands/google/use-cases/customer-reviews) allow "the Google G or full Google wordmark". They require the rating to be described "on Google", never "Google rating", and forbid stars "by the Google name or logos". So the anatomy is G, then score, then stars, then count.
  - The Places API policy asks for the "Google Maps" logo or, "where space is limited, the text Google Maps". That applies to live API data only, so synced data keeps the text "Google Maps" (the badge caption "on Google Maps", the reviews block's "View on Google Maps" link).
- Three presets: `pill` (the one-liner; its border width and corner radius are controls, so a square-cornered, 0px-border pill is the chrome-free header look), `card` (two rows, accent stripe; drawers and footers), `stacked` (footer columns). There is no separate `inline` preset and no divider. Mock: https://claude.ai/artifact/C73uxE1v1Kf2qwRzZPGxHc.
- Phone and tablet drawer: the badge never sits above the menu (it would push the primary navigation down). It goes in two places, for testing:
  - the drawer's top row, between the logo and the ×. `sgs/nav-drawer`'s fixed chrome slot gains a Google rating type;
  - a full-width square pill directly above the phone button in the bottom contact group.
- The phone drawer is re-solved against the draft (Spec 47 route), keeping Bean's approved exceptions: menu items underline on hover rather than the draft's lighter text; the social buttons take the footer's social colours (register N7); the phone button gets a hover state the draft lacks.
- Compression is a viewport `compactBelow` (default 1200px), not a container query: a shrink-to-fit flex child with `container-type: inline-size` collapses to 0.

## Design direction
Quiet editorial credential: the header is a calm cream strip with a serif logo and small caps nav, so the badge matches that (no chrome, hairline divider, muted count). Google's own colours stay (G and gold stars) per the standing rule that Google reviews follow Google's UI. Hover brightens, never darkens; the whole thing is one link (`sgsBlockLink`) with a visible focus ring and a 44px minimum hit area.

## Work
1. **Framework (sgs/google-reviews):** a new `badgeLayout` style so any client can use it, not an Eye Care patch. Add `inline` (a one-line, chrome-free layout) beside the existing card layout; in `inline`, container-query compression (full, then G + `★ 4.7`) and no shadow, border or padding, with each of those exposed as an inspector control with a default (a customisable property needs a control). Touch: `block.json`, `render.php`, `style.css`, `edit.js` + its preview plan, the DB (`/sgs-update`), `tests/php/GoogleReviews*Test.php`. Search every `floating-badge` / `badge` reference first (list: block.json, edit.js, render.php, style.css, two PHP tests; the hover-guard fixtures are frozen copies). Read the CR6/Spec 32 rules: no inline `style=`, box values per side, `sgs_border_element_decls` for borders.
2. **Eye Care trees:** `header.tree.json` (delete row `cr-ref-header-2`; add the block as the first child of the right-hand container `cr-ref-header-10`, before the phone), `mobile-menu.tree.json` (add the block at the top of the drawer content, mobile and tablet only), both rebuilt one page at a time with `scripts/wp-build-page.js`. Header `padding` edits for `cr-ref-header-2` go with the row.
3. **Deploy:** `build-deploy.py --target sandybrown` first (gates), then the Eye Care target only after messaging peers (they own eye-care-test deploys). Read the header live at 375/768/1440 plus the drawer open at 375/768, and the draft's header height (79px / 69px) as the target.
4. **Close:** `/qc-council` over the block change; register D7 row, Spec 36/37 mention if any, and the LEDGER to current truth; `/handoff`.

## Verify
- Header height at 1440 is the draft's 79px plus nothing (the extra 144px row is gone); badge text and phone do not overlap at 1024, 1200 and 1440.
- 768 and 375: no badge in the header; drawer top shows it; the link opens the Google listing.
- Contrast 4.5:1 for the muted count, focus ring visible, hit area at least 44px, reduced motion respected, axe clean on the header.
- `audit-inline-styling.js --check` exit 0; the google-reviews PHP tests and a new `inline` row test pass.

## Outcome (2026-10-08)
- Header 79px (the draft) at every desktop width; the badge shows G, 4.7 and stars from 1400px, G ★ 4.7 from 1290px and hides below (measured: nothing more fits beside the phone, About, Help and Bag; the framework hides the header phone below 1160px). A "hide only between two widths" setting would let it return from 1060 to 1160px; not built.
- Drawer: rating beside the close button in the top row, a full-width pill with "15 reviews on Google" above the phone; the drawer's overlap was a framework bug (a full-width button's 100% flex basis in a column), fixed in sgs/button.
- Register N7 (drawer social buttons take the footer's colours) belongs to the parallel social-icons rebuild.

## Open
- Header cart-panel and Help footer-gap rows live in the CR6 plan (P2-e, P2-k), not here.
