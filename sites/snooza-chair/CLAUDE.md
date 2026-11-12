# Snooza Chair: client project

## Client

**Ophir Solutions**, UK distributor for the Rolapal Snooza Chair
- Website: ophirsolutions.co.uk
- Contact: sales@ophirfurniture.co.uk / +44 01622 801401
- Current platform: Wix (JS-rendered, poor performance)

## The Proposal

Bean is proposing an SGS WordPress site with the SGS Configurator Pro plugin as the centrepiece. The 3D configurator is the differentiator: no other agency pitching will have a working demo of the chair spinning in 3D with AR on a phone. The pitch is to walk in with a phone showing the Snooza Chair in AR on the meeting room floor. Build plan: `.claude/plans/2026-08-03-snooza-configurator-build-plan.md`.

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
