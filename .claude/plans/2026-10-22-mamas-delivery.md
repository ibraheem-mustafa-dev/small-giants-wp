---
doc_type: plan
spec: .claude/specs/48-CLONING-SYSTEM.md
status: open, starts after the Indus sign-off (`plans/2026-10-21-indus-delivery.md`, U18)
---

# Mama's Munches delivery

## Goal
The Mama's Munches redesign clone signed off on mamas-test (brief `sites/mamas-munches-redesign/CLAUDE.md`, draft `sites/mamas-munches-redesign/handoff/`), the first shop proof of Spec 48 (§5.2): every surface built from the draft, checked by the route and by Bean's eye at 375, 768 and 1440, with a `gaps.json` naming only differences Bean accepted. It follows the Indus delivery's closing standard, delivery map and session shape (`plans/2026-10-21-indus-delivery.md`, "The closing standard", "The delivery map"); this plan is expanded into units and a `sites/mamas-munches-redesign/build/qa/delivery-map.json` when the Indus clone is signed off.

## Open items (each checked open on 2026-10-22: `git grep` finds no use in `scripts/computed-route/`)
- **Writers for the controls Mama's draft taught** (built in `plans/archive/2026-10-19-control-gaps-build.md`, none written by the route yet): the floating ribbon tag's end shapes (`sgs/label` `endShapeLeft`, `endShapeRight`, `endDepth` and its border set; G5, the draft's `polygon(0 0,100% 0,88% 50%…)`); the phone add-to-basket bar (`sgs/buybox` `stickyBar` and its three bar colours; G6); the highlighter stripe and the photo inside a line of text (detectors for an absolutely positioned background span and an inline-block image wrapper in a heading or paragraph, writing `sgs-highlight` and `sgs-inline-photo` markup; G7, G8); the footer link underline in its own colour (`{prefix}LinkUnderlineColour`, `ColourHover`, `Offset` and the `hover` mode; G11); the hero collage's Floating layers (`sgs/decorative-image` `widthUnit` and inner blocks; G13). Each needs its coverage entry, MUST FAIL test and mutation check.
- **Mama's recalibration** on its mirror (Spec 48 Appendix A step 13; FR-48-8 Status "Not built"), including `sgs/buybox`, which needs a product on the calibration page.
- **The shop parts of the site build** (Spec 48 FR-48-55): the `product`, `product_cat` and `shop` page-map rows stop the run today (`scripts/computed-route/lib/site-build-map.mjs::SHOP_TYPES`), and the four `woocommerce_*_page_id` options are not set.
- **The account and cart calibrations Mama's shop surfaces need:** `sgs/account` calibration on a WooCommerce mirror is the handoff readers plan's Close (`plans/2026-10-21-handoff-readers.md`); the cart's `panelSlide*` row is Spec 48 §5.4 Res 60.
