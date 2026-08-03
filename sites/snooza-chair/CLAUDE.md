# Snooza Chair — Client Project

## Client

**Ophir Solutions** — UK distributor for the Rolapal Snooza Chair
- Website: ophirsolutions.co.uk
- Contact: sales@ophirfurniture.co.uk / +44 01622 801401
- Current platform: Wix (JS-rendered, poor performance)

## The Proposal

Bean is proposing an SGS WordPress site with the SGS Configurator Pro plugin as the centrepiece. The 3D configurator IS the differentiator — no other agency pitching will have a working demo of the chair spinning in 3D with AR on a phone.

**The pitch:** Walk in with a phone showing the Snooza Chair in AR on the meeting room floor.

## Product: The Snooza Chair

Medical/rehabilitation seating for children and adults with epilepsy, autism, cerebral palsy. Foam construction with medical-grade vinyl, breathable washable cover.

**Configurations — CORRECTED BY BEAN 2026-08-03. This supersedes any earlier reading.**

⚠ There are **THREE** variant axes, not two. An earlier version of this file listed the headrest as
part of a fixed "standard kit"; it is actually a customer CHOICE, which changes the SKU matrix from
24 to **72** and matters for the configurator's variant engine.

- **Size:** 1, 2, 3, 4 (Size 1 = 12-24 months, through Size 4 = adult)
- **Colour:** Orange, Blue, Green, Grey, Pink, Black *(6)*
- **Headrest:** Low Profile · Standard Profile · Deep Contour *(3)* ← the third axis
- **Base SKU matrix: 4 x 6 x 3 = 72**

**Optional accessories — separately priced ADD-ONS, not variants.** These toggle on/off and are added
to the same order; the existing variation engine does not model add-ons (see the build plan §6):

| Accessory | Note |
|---|---|
| Rocker Base | |
| Mobile Base | |
| Medial Thigh Support | **has its own 2 variants:** standard pommel / short pommel |
| Leg Rest | **has 4 sizes, which must MATCH the chair size** — a dependent option, not a free choice |
| Padded Tray | |
| Side Infill Pads | |
| Base Wedge | |
| Back Rest Adjustment | |

⚠ **Two accessories are not simple toggles** and are the awkward cases for both the cart model and
the 3D model: Medial Thigh Support carries a nested variant, and Leg Rest is CONSTRAINED by the
chosen chair size. Neither is a plain on/off boolean.

**Pricing:** From £1,164.71 ex VAT. Accessories priced separately.

## Reference Images

⛔ **CORRECTED TWICE — read this carefully, the first correction was WRONG.**

`sites/snooza-chair/assets/` exists and holds **19 files** plus an `assets/3d-model/` subdirectory.
**But NONE of the filenames this document used to list actually exist.** There are no `ophir-01`..`14`,
no `video-still-001`..`203`, no `fortuna-*.jpg`. The real contents are **Wix-CDN hash-named images**
(`bc3963_<32-hex>~mv2.jpg`), presumably scraped from the client's current Wix site.

⚠ **Why this is recorded rather than quietly rewritten:** the first correction (earlier the same day)
fixed the DIRECTORY path and left the filename list untouched — which made the section look resolved
(right folder, right file count) while every specific reference in it was still fiction. **A
half-correct correction is worse than the original error**, because it stops the next reader checking.

**What this means in practice:** nobody can cite a specific reference image by name. Whoever
generates the 3D model must OPEN the directory and choose from what is actually there. There is no
curated "best images for AI model generation" shortlist any more — the old one named files that do
not exist.

## Source Pages

- https://www.ophirsolutions.co.uk/product-page/rolapal-snooza-chair
- https://www.fledglings.org.uk/products/the-snooza-chair
- https://www.fortunamobility.com/snooza-for-kids
- https://www.rolapal.co.nz/products/snooza-chair/ (manufacturer)

## Model accuracy — Bean's ruling 2026-08-03

The reference photos are not ideal and **the 3D model does not need to be dimensionally exact**
for the pitch demo. It needs to read convincingly as the Snooza Chair on a phone screen in AR.
Fidelity is a Track-2 concern, not a blocker for the meeting.
