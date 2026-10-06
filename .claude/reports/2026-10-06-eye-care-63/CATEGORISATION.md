# The 63 rows the walker cannot see — categorised

**2026-10-06.** Live block code **`578a8830b`** (`~/.sgs-deploy-marker-eye-care-test.json`).
Live `https://darkcyan-grouse-898606.hostingersite.com` · draft `https://mintcream-lyrebird-224487.hostingersite.com/`.
Source of truth: `.claude/plans/2026-10-02-eye-care-fix-register.md`. Partition: `worksheet.md`.

**No deploy was needed.** All 21 commits cited by the register's built rows are ancestors of `578a8830b`,
including `ea72eab7b`, which the register still calls "committed but NOT yet deployed". That note is stale.

## Headline

| Category | Rows |
|---|---|
| Built and verified live | 10 |
| Genuinely open | 9 |
| Needs content from the client | 5 |
| Accepted divergence / beyond the draft | 2 |
| Alias of a parent row | 12 |
| CR — route, not client-visible | 14 |
| Still to measure | 11 |

Plus **one defect found that is not in the 63 at all** — see §5.

---

## 1. Built and verified live

Each verified against the running site tonight, not against its commit.

| Ref | Verdict | Evidence |
|---|---|---|
| **18** | Toast speaks on an add | New flow `toast-added-to-bag.mjs`: **PASS** — "Added to your basket.", `role=status`, `aria-live=polite`, "View bag" visible. The shell is opt-in (`Sgs_Toast::request()`): present on the product page, absent on home, shop and lenses — correct, since those cards are `learn-more` and never add. |
| **N11** | A second product reaches the bag | `bag-two-products` **PASS** — bag holds 420 and 417 (20:41 run). |
| **N25** | Filter panel survives a clear | `filter-apply-clear` **PASS** — panel restored, 10 groups / 10 headings. **Stronger than the register's own proof**, which ran on a canary with only 3 groups where the break never reproduced. |
| **59, 61** | Colour dots are focusable buttons | Real `Tab`, not programmatic `.focus()`: **39 swatch stops**, first is `button.sgs-product-card__swatch--button`, outline 2px. |
| **91** | "In stock" renders | Details tab shows `In stock` and `In stock — dispatched next working day`. |
| **95** | Spec rows are filled | **112 of 112** attribute slots filled across 16 products; the rendered page confirms Material `Metal`, Frame type `Full rim`, Hinge `Standard barrel`, Nose pads `Adjustable pads`, Lens width `58 mm`, Bridge `14 mm`. The register's "Style" is the live `Shape`. |
| **S9** | Brand logos render | `brand-logo` markers 47 home / 45 shop / 27 product. The row's "tree OPEN" half appears landed. |
| **S12** | Built and live | `8aa7274ef` is an ancestor of the live SHA. Not separately re-measured. |
| **bag second unit** | Cooldown allows a second unit | `bag-second-unit` **PASS** — 2 units, second add 2,828 ms after the first. |

## 2. Genuinely open — with its fix shape

| Ref | Live reading | Draft reading | Fix shape | Size |
|---|---|---|---|---|
| **S8** (+N9, N34) | every whole-pound price shows `.00` — `£115.00`, `£109.00` | **zero** `.00`; 36 plain prices (`£129`, `£339`) | one filter on `wc_get_price_decimals` / `wc_price`; emails and admin keep pennies, D4 keeps checkout totals | **greenfield — no such filter exists anywhere in the plugin** |
| **S7** (+N27, N31) | "No reviews yet" ×8 on home | **zero** | remove the card text, delete the product panel; D7 rehomes the Google rating | small, tree |
| **36** | `644 Washwood Heath Rd, Birmingham B8 2HQ` on one line | `644 Washwood Heath Rd` / `B8 2HQ`, two `<br>` | store the Site Info address with a line break | **minutes, content only** |
| **45** | `/privacy/` and `/terms/` both **404** under every slug tried, and the footer links to both → live broken links | draft has neither | create both pages | needs client copy |
| **N38** | `lens-skip-to-bag` **FAIL** `skip-opens-extra-step` | — | `block.json` has no "skip adds to bag" setting; `flow-skip.js::handleSkipClick` routes to the add-to-bag ending | framework new + tree |
| **51** | **confirmed: the hero paints nothing.** `@keyframes sgs-hero-ken-burns` exists, but only **1** element carries a ken-burns class and the hero's own `.sgs-hero__bg-img--parallax` computes `animation-name: none`, `duration: 0s`, `transform: none` | one-off 3s zoom, 108% → 100% | repair the paint, add a "zoom out once on load" mode | framework repair + new |
| **96** | focus ring computes **`rgb(20,20,20)`** — black | draft taupe | focus rules read the client focus-ring token | framework repair |
| **N26 / S10 partial** | on cards **with** an image the photo and body are links, but the **title is not** | the whole card is one link | the stretched surface does not reach the title row | measure before fixing — see §5 |
| **N4** | no marquee markers found live | — | repair so "drop" and "scroll" coexist; pause button for WCAG 2.2.2 | framework repair |

## 3. Needs content from the client

**45** legal copy for `/privacy` and `/terms` · **159** a clinic photo, and a photo of Fatima only if she asks ·
**161** a short unique intro per brand page · **151** shipping method titles and descriptions.

**95 is NOT here** — the product data has already been filled.

## 4. Accepted divergence / beyond the draft

- **37, "address not a link"** — the **draft has no maps link either** (zero maps/directions links). This is an
  improvement the register chose, not a divergence from the draft. Reclassify before it is counted as a gap.
- **N16b, "best sellers is hand-picked"** — the test site has no sales, so a live best-seller collection would
  order arbitrarily. Not settleable until real orders exist.

## 5. The thing nobody was looking for

**12 of 16 shop cards server-render a `product-card__no-image` placeholder, and those cards expose no link at
all** — photo, body and title all hit-test to no anchor, so those products cannot be reached by clicking their
card. Measured with `document.elementFromPoint`, not synthetic clicks, after scrolling each card into view.

The products are not the problem: the Store API reports **16 of 17 products have images** (only the QA test item
genuinely has none), while `product-card__no-image` appears **12 times in the server-rendered HTML**.

**Leading hypothesis, not yet proven — a cache key that can never match:**

| | |
|---|---|
| Manifest **write** | `class-product-manifest.php:161` → `sgs_manifest_v8_<id>_<tax-fingerprint>` |
| Manifest **purge** | `class-cart-cache-purge.php:158,160` → `sgs_manifest_<id>` |

The purge key can never match the write key, so the manifest transient is **never purged** and expires only on
TTL. Register row 59 already records this as "a real framework bug found and recorded, not fixed".

**Corroboration:** the 4 cards that *do* render images include `gucci-oversized-cat-eye` — the exact product the
75/82/158 work was performed on. Those got fresh manifests; the rest appear to serve stale ones. That row also
records "a stale cache was hiding it" once before.

**One command proves or kills it**, and it is a host write, so it was not taken unilaterally while peer sessions
are active: delete the stale transients for one affected product and reload `/shop/`. If that card gains its
image and its link, the cause is proven and the fix is the purge key.

## 6. Out of scope — the 14 CR rows

CR1, CR2, CR3, CR4, CR5, CR6, CR7, CR9, CR10, CR11, CR12, CR14, CR17, CR18 are route and calibration findings
belonging to the Spec 47 route owner. **They have no Fix column** (`Ref/Finding/Evidence/Status/Sweep`), so they
can carry no Fix-cell proof — report-only, by schema.

## 7. Aliases, not independent work

A third of the "to assess" rows only point at a parent. Six point at a parent that is **already built and live**:
N2A, N26 → S10 · N10, N33A → S9 · N6 → S12 · 61 → 59.
The rest inherit their parent's open state: 3 → 17 · N9, N34 → S8 · N27, N31 → S7 · N8 → N2B.

## 8. Still to measure

**64** filter bar pinning · **N13** WhatsApp over footer links · **N37** advance-on-pick · **D7** Google rating
placement · **9** Ferrari tile double-read · **N24** Google logo link · **N30** bridge size format ·
**N33B** duplicate Save tag · **N36S** sizing tab · **152** switch-off confirmation · and the motion rows
14, 17/3, 19, 58, 73, which need per-frame sampling against the draft.

## What I would do next, in order

1. **Prove or kill the manifest-cache hypothesis** (§5). One transient delete. It is the only item here that
   makes 12 of 16 shop cards both imageless and unclickable.
2. **36 and S8** — the address line break is minutes; the `.00` switch is one filter and closes three rows.
3. **51 and 96** — both now have a measured cause rather than a description.
4. Leave the 14 CR rows with the route owner.
