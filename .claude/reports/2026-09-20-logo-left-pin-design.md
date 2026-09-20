---
doc_type: design-gate
project: small-giants-wp
title: sgs/responsive-logo left default without an auto margin
date: 2026-09-20
plan_row: W3A-4
spec: 36-SGS-NAVIGATION-SYSTEM FR-36-22
status: PROPOSED (design gate, rule 7; approved in principle by Bean as option A)
---

# sgs/responsive-logo: keep the left default, stop stealing the row's free space

## Problem

`plugins/sgs-blocks/src/blocks/responsive-logo/render.php` emits, for the default `align: left`,
`{sel}{margin-inline-end:auto;margin-inline-start:0}`. In a flex row that distributes space
(`sgs/site-header-row` with `justifyContent: space-between`), the auto margin takes ALL the free space
before `justify-content` runs. On the Mama's Munches header the nav sits 433px from the logo and 16px
from the cart, so it is not centred between them. The draft centres the items between the logo and the
cart (measured 746 against a viewport centre of 714).

## Evidence (page `qa-logo-pin`, id 3774, six containers, the logo at its default, measured with and
without `margin-inline-end:0 !important`; positions are offsets from the container's left edge)

| Container | Logo left, pin | Logo left, no pin | Siblings, pin | Siblings, no pin |
|---|---|---|---|---|
| flow group | 0 | 0 | none | none |
| constrained group | 183 | 183 | none | none |
| flex, default justify | 0 | 0 | nav 901, cart 1033 | nav 207, cart 339 (packed after the logo) |
| flex, space-between | 0 | 0 | nav 1267, cart 1399 | nav 737, cart 1399 (equal gaps 554 and 554) |
| flex, justify center | 0 | 530 | nav 1267, cart 1399 | nav 737, cart 869 (the whole row centred) |
| grid, three columns | 0 | 0 | same | same |

The pin never changes the logo's own position in flow, constrained, flex-start, space-between or grid
containers. It only takes free space from the logo's siblings in flex rows, and it overrides a row that
the operator centred. On the live header, removing the margin gives gaps of 224px and 225px between logo,
nav and cart.

## Design

1. Delete the `if ( 'left' === $align ) { $scoped_css[] = $sel . '{margin-inline-end:auto;margin-inline-start:0}'; }`
   block in `responsive-logo/render.php`. `align: 'left'` stays the default and still adds the
   `alignleft` class; centre, right and wide are unchanged. The left default is delivered by the
   container's own start alignment (flex-start, block flow, grid start), which the measurement shows is
   where the logo already sits without the margin.
2. Update the `align` attribute's `_comment` in `responsive-logo/block.json` and the render.php comment to
   say the container places the logo.
3. Amend Spec 36 FR-36-22 basics: the left default is a placement the container provides; the block emits
   no alignment margin.
4. Test: a PHP test asserting the rendered scoped CSS for a default logo contains no `margin-inline-end:auto`
   (with a control: `align: 'center'` still renders its class), and a live probe on the fixture page
   `qa-hdr-mega-dropdown-drawer` and the Mama's header: nav gap left equals gap right within 2px.

## Risks to test (what the reviewers must attack)

- A container that relied on the auto margin to pin the logo LEFT against `align-items: center` in a
  column flex (footers, drawers, patterns): removing the margin would centre the logo there. Census every
  use of `sgs/responsive-logo` in `theme/sgs-theme/patterns/`, `theme/sgs-theme/parts/`, `templates/`,
  the site-footer, the drawer patterns and any client content.
- Any theme or plugin CSS that assumes the margin (`grep -rn "sgs-responsive-logo"` in `theme/` and
  `plugins/`).
- The header collapse/mobile layout: the burger and logo at 375px.
- Editor canvas parity: the editor preview must not depend on the removed rule.
- The measurement covers six containers; name any container type not covered.
