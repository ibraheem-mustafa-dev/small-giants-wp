# Snooza Chair: client project

## Client

**Ophir Solutions**, UK distributor for the Rolapal Snooza Chair
- Website: ophirsolutions.co.uk
- Contact: sales@ophirfurniture.co.uk / +44 01622 801401
- Current platform: Wix (JS-rendered, poor performance)

## The Proposal

Bean is proposing an SGS WordPress site with the SGS Configurator Pro plugin as the centrepiece. The 3D configurator is the differentiator: no other agency pitching will have a working demo of the chair spinning in 3D with AR on a phone. The pitch is to walk in with a phone showing the Snooza Chair in AR on the meeting room floor. Build plan: `.claude/plans/archive/2026-08-03-snooza-configurator-build-plan.md`.

## Product: the Snooza Chair

Medical/rehabilitation seating for children and adults with epilepsy, autism, cerebral palsy. Foam construction with medical-grade vinyl, breathable washable cover.

**Configurations (Bean, 2026-08-03):** three variant axes.
- **Size:** 1, 2, 3, 4 (Size 1 = 12-24 months, through Size 4 = adult)
- **Colour:** Orange, Blue, Green, Grey, Pink, Black (6)
- **Headrest:** Low Profile, Standard Profile, Deep Contour (3). It is a customer choice, not part of a fixed kit, which takes the SKU matrix from 24 to 72 and matters for the configurator's variant engine.
- **Base SKU matrix: 4 x 6 x 3 = 72**

**Optional accessories** are separately priced add-ons, not variants: they toggle on or off and are added to the same order. The existing variation engine does not model add-ons (build plan §6). Rocker Base, Mobile Base, Padded Tray, Side Infill Pads, Base Wedge, Back Rest Adjustment, Medial Thigh Support, Leg Rest.

⚠ **Two accessories are not simple toggles**, and are the awkward cases for both the cart model and the 3D model:
- **Medial Thigh Support** has its own 2 variants: standard pommel or short pommel.
- **Leg Rest** has 4 sizes, which must match the chair size: a dependent option, not a free choice.

**Pricing:** from £1,164.71 ex VAT. Accessories priced separately.

## Reference images

`sites/snooza-chair/assets/` holds Wix-CDN hash-named images (`bc3963_<32-hex>~mv2.jpg`, scraped from the client's current Wix site), an `assets/3d-model/` subdirectory and working scripts. No reference image is cited by name: whoever generates the 3D model opens the directory and chooses from what is there.

## Source pages

- https://www.ophirsolutions.co.uk/product-page/rolapal-snooza-chair
- https://www.fledglings.org.uk/products/the-snooza-chair
- https://www.fortunamobility.com/snooza-for-kids
- https://www.rolapal.co.nz/products/snooza-chair/ (manufacturer)

## Model accuracy (Bean, 2026-08-03)

The reference photos are not ideal and the 3D model does not need to be dimensionally exact for the pitch demo. It needs to read convincingly as the Snooza Chair on a phone screen in AR. Fidelity is a Track-2 concern, not a blocker for the meeting.

## Build status: not started

No part of the Snooza site or its configurator is built. The plan is archived at `.claude/plans/archive/2026-08-03-snooza-configurator-build-plan.md` (Appendix A holds the Configurator Pro config schema and the v1 scope); read it before starting. This section is the live record of what remains.

### Phases (plan section 12)

| Phase | Name | Timebox | Deliverable | Gate |
|---|---|---|---|---|
| 0 | Pitch-demo track (parallel, independent) | 2-3 days | One `.glb` and `.usdz` pair, one static AR-enabled HTML page, tested on the actual demo phone | Bean opens the link on his phone, taps AR, sees the chair on the floor |
| 1 | 3D model spec and generation | about 1 week | Approved single-geometry, material-variant, toggleable-mesh `.glb` (spec: plan section 7) | Bean's visual sign-off; all 6 material variants and the accessory meshes toggle correctly in a viewer |
| 2 | `sgs/product-viewer` block and variant wiring | weeks 2-3 | The block renders the model; colour and size selection swaps material and geometry live; accessibility defaults in place (plan section 8) | axe-core 0 on the block; keyboard-only walkthrough passes; no autoplay verified live |
| 3 | Accessory add-on mechanism | weeks 3-4 (the largest new item, plan section 6) | Accessory toggle UI and the extended multi-item cart proxy (`class-cart-proxy.php`) with full adversarial-fixture parity | Multi-item add-to-cart security fixtures pass; running total correct |
| 4 | Ecommerce integration and checkout | weeks 3-4 | Chair and accessories flow through the existing WooCommerce checkout unchanged | A real test order with 2 accessories completes checkout |
| 5 | Polish, mobile QA, byte budget, content | week 5 | Configurator-page byte budget confirmed against the new exception; mobile, keyboard and reduced motion re-verified | Design review and performance audit pass; WCAG 2.2 AA re-confirmed on the finished product page |
| 6 | Launch | week 6 | Live site | Bean's sign-off |

### Open questions for Bean (plan section 13)

1. **Accessories: extended cart proxy or a paid WooCommerce extension?** Option A extends the existing cart proxy and has no paid dependency; Option B uses WooCommerce Bundles or Composite Products. The plan recommends A because Bean already promised the client no monthly fees. Bean decides.
2. **Where do the reference product images live?** The plan could not find the files its earlier client notes named. `sites/snooza-chair/assets/` now holds the scraped images; confirm that is the source before phase 1 starts.
3. **Configurator-page byte budget ceiling.** Needs a build-session measurement of the real `model-viewer` plus the existing buybox JavaScript, not the plan's estimate (plan section 10).
4. **When does the Configurator Pro licence extraction (the £299 a year plugin) happen?** The plan recommends after Snooza's own launch; Bean may want it earlier if a second prospect is waiting.
