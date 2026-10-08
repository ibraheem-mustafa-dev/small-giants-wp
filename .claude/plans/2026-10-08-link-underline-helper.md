---
title: Link underline helper for text blocks, and the Eye Care footer "Visit or call" column
project: small-giants-wp
created: 2026-10-08
status: batch 1 live on eye-care-test (blocks at 872a8434a) and read live 2026-10-09; batches 2 (icon-list, label) and 3 (collapsible-text, quote, testimonial, timeline, product-card) open
authors: Bean, Claude (small-giants-wp-57)
governs: register CR6 P2-n (moved here from .claude/plans/archive/2026-10-07-cr6-box-longhand-migration.md, which is box-longhand work only)
---

# Link underline helper for text blocks

**Goal:** a client chooses how the links in any text block are underlined (theme default, none, always, or a line
that sweeps in on hover) with one shared setting, and the Eye Care footer's "Visit or call" column matches the rest of
the footer: every link takes the hover sweep, the address links to the Google Business Profile, and the opening times
sit beside the day.

## Status and design

**Batch 1 live and read 2026-10-09** (code `f26e5ed76`, `7bf5ae3da`, `805174aae`, council fixes `6819dd389`, panel move `872a8434a`; reseeds `17e1af923`, `c78d57ea7`; Eye Care tree `0b846cbb1`). Batches 2 and 3 open. Built: `includes/helpers-link-underline.php::sgs_link_underline_css` (modes '', none, always, sweep; the line in the link's own colour, so no second colour row; the sweep on the content box so a padded link draws it under its text) with its canvas twin `src/utils/link-underline.js` and `src/components/LinkUnderlineControl.js` in the Link colour row's `after` slot, on `sgs/text`, `sgs/heading` and `sgs/business-info`; `sgs/business-info` also gained `addressLink` (Maps CID, else `socials.google`, else a Maps search) and `hoursRowJustify` (`flex-start` keeps the hours beside the day). Tests `tests/php/LinkUnderlineTest.php`, `tests/php/BusinessInfoLinksAndHoursTest.php`. Eye Care tree: `cr-ref-footer-23` and `-24` `linkUnderline: sweep`; `-25` `addressLink`, sweep, `textColour` `text`; `-26` `hoursRowJustify: flex-start`. Open: batch 2 (`icon-list`, `label`), batch 3 (`collapsible-text`, `quote`, `testimonial`, `timeline`, `product-card`). Original finding and design: The underline is wanted, not removed: header, footer and menu links carry a hover underline sweep and keep their text colour (divergence ledger D-93 to D-98, `bean-choice`), because the draft's muted hover colour read poorly. What is wrong is the "Visit or call" column (`sites/eye-care-ward-end/build/footer.tree.json`, `cr-ref-footer-21`): "About Eye Care" (`cr-ref-footer-23`, `sgs/text`) shows a permanent underline (nothing opts its link out of the browser and `theme.json` link underline), the phone (`cr-ref-footer-24`) has no underline effect, the address (`cr-ref-footer-25`) is `text-muted` and not a link (Bean: same colour as the rest, a link to the Google Business Profile with the effect), and the condensed opening times (`cr-ref-footer-26`) stretch across the column (`business-info/style.css::.sgs-business-hours__row` is `justify-content:space-between`). Bean's model: make the hover underline a helper and give it to the text blocks (`sgs/text`, `sgs/heading`, `sgs/label`, `sgs/icon-list` and other suitable blocks). Council refinements: (1) draw it with the background-line technique of `theme/sgs-theme/assets/css/utilities.css::.sgs-hover-underline-slide`, not the nav's `border-bottom`/`::after` band, which paints only the first and last fragment of a link that wraps; `sweepAngle` stays nav-only. (2) One implementation driven by custom properties: a new `includes/helpers-link-underline.php::sgs_link_underline_css( $attributes, $prefix, $selector )` beside `sgs_link_colour_css` (`helpers-typography.php` is already over 500 lines) emits `--sgs-sweep-thickness`, `--sgs-link-hover-color`, `--sgs-sweep-duration` and `--sgs-link-underline-colour` plus `text-decoration:none` at rest when the treatment is not `none`; the one shared rule consumes them; `swap` is a native `text-decoration-color` change; `custom.linkSweep` gets defined in `theme.json` (today it is only a CSS fallback). (3) Attributes `{prefix}LinkUnderlineTreatment` (enum none/swap/sweep, default none), `...Thickness`, `...Colour`, `...ColourHover`, never `{prefix}TextDecoration`, added to each block's `supports.sgs.elements` link entry and to `attr-classification-overrides.json`. (4) Editor: `TreatmentSelect` moves from `src/shared/nav-menu-panels/ColourRowExtras.js` to `src/components/`; colours are `SgsColourPanel` rows. (5) Behaviour: `:is(:hover,:focus-visible)`, hover rules inside `@media (hover:hover)`, reduced motion shows the line at once, `forced-colors` falls back to a real underline, RTL flips the origin, no sweep over a gradient link colour, links in running text keep a resting underline (WCAG 1.4.1). (6) Batches: `sgs/text` + `sgs/heading`; then `icon-list` + `label`; then `collapsible-text`, `quote`, `testimonial`, `timeline`, `product-card`. Framework rows this also needs, each before its tree change: `sgs/business-info` address link (`render.php` `case 'address'` renders a plain `<address>`; href from Site Info `maps_cid`, falling back to `socials.google`), and an hours row alignment (`hoursCondensedInline` gives a dotted one-liner, not compact rows). Prediction: the four footer rows (23, 24, 25, 26) compare equal to the intended state after the tree change.

## Live read (2026-10-09, eye-care-test, 375 / 768 / 1440)

All pass: `.cr-ref-footer-23 a`, `-24 a` and `-25 a` rest with no underline and `background-size: 0px 1px`, sweep to
`100% 1px` on hover and on keyboard focus (`:focus-visible`), in `rgb(20, 20, 20)`, the same as the Shop column's
`.cr-ref-footer-9 a`. The address links to `https://share.google/9YZzTiRj2gvW1Xrpr` (Site Info `socials.google`; no Maps
CID is set) and ends above the hours (1440: link 633.9-689.9, hours from 692.9). The condensed hours row puts the time
13px after the day.

## Council (2026-10-08): applied and open

Two reviewers (code path and cascade; client UX and accessibility). Applied in `6819dd389`: business-info's rules
use the doubled uid class (0,2,1) so `.sgs-business-info__link:hover{text-decoration:none}` and the theme's link
focus underline (0,2,0) no longer win; the helper runs only for the phone, email and address links (the attribution
credit keeps its own sweep); a linked multi-line address cancels its link padding (`margin-block: -0.5em`) and aligns
its icon to the top; forced-colours mode shows the underline at rest for `none` and `sweep`; plainer labels.
`872a8434a` moved the hours position, padding and lines into one Styles-tab "Hours rows" panel (inspector-scan
rule 03 back to its backlog of 27).

Open, each for Bean or a later batch:
- **Touch fallback (Bean's call):** on a touch screen `sweep` shows no underline at rest, the same as `none`. The UX
  reviewer proposed `@media (hover: none)` restoring the underline at rest. Not applied: Bean's header, footer and menu
  lists are sweep-only by decision, and lists of links are not the running-text case WCAG 1.4.1 targets; the help text
  steers links in paragraphs to Always.
- **Multi-line linked address:** business-info's link is one flex box, so the sweep draws under the last line only.
- **`socials.google` can hold a review link:** Site Info documents it as the Google Business Profile or review link;
  a client storing a "write a review" URL gets the review form from the address. Consider a dedicated Maps link field.
- **Batch 2:** `icon-list` and `sgs/button` link style already sweep through `utilities.css`
  (`:where(.sgs-icon-list__item-link, .sgs-button--link .sgs-button__label)`); adopting the control there means
  retiring those selectors so one element never has two sweeps.
- **Ledger:** the footer walk now reports the decided differences (the sweep's `background-image` on refs 23-25, the
  address colour and its link box's `gap`/`display` rows). They need divergence entries citing Bean's 2026-10-08
  decision (S2 covers the sweep; the address colour and link need a register row first).
