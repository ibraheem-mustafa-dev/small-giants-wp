# The 63 rows the walker cannot see — categorised

**2026-10-06; the open rows closed 2026-10-07.** Live at **`7cb60d4f4`** (`~/.sgs-deploy-marker-eye-care-test.json`); each row's proof is in its register Fix cell.
Live `https://darkcyan-grouse-898606.hostingersite.com` · draft `https://mintcream-lyrebird-224487.hostingersite.com/`.
Source of truth: `.claude/plans/2026-10-02-eye-care-fix-register.md`. Partition: `worksheet.md`.

**Classification needed no deploy**: every commit the register's built rows cite was already an ancestor of the
then-live `578a8830b`. The **fixes** this session then made shipped in `4aa477507`, `110b53738` and `0cc773b19`.

## Headline

| Category | Rows |
|---|---|
| **Closed** — built and live, fixed, or already closed | **33**, plus the 4 aliases verified |
| **Still open** | **2**: 14 (built, deploy pending), N36S (blocked on data and D1) |
| Content — written, ours to own | 4 |
| Accepted divergence / beyond the draft | 2 |
| Alias of a parent row | 12 |
| CR — route, not client-visible | 14 (CR12 parked, CR6 a migration) |
| Still to measure | **0** |

§5 is the product card (N26): measured at 1-2% clickable, now 99% and permanent.

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

## 2. The open rows — closed 2026-10-07

Every row below was built, deployed and measured live on eye-care-test (`7cb60d4f4`); the register's Fix cell
carries each one's proof. Framework commits `111bcd98b`, `db97bed10`, `235d54de0`, `7d1173187`, `7cb60d4f4`;
trees `7507ce0ae`, `473b42694`.

| Ref | Closed by |
|---|---|
| **S8** (+N9, N34) | `includes/price-trim-zeros.php`: whole pounds everywhere the shop shows a price; checkout, emails, admin and order views keep pennies (D4) |
| **S7** (+N27, N31) | `noReviewsText` removed from 11 card nodes; the product page's none-yet panel deleted |
| **36** | the two-line address stored; `sanitise_address` keeps typed lines |
| **N38** | `choice-flow` `skipAddsToBag`; `lens-skip-to-bag.mjs` PASS |
| **51** | the ken-burns paint repaired on the hero's own `<img>`; zoom-out-once 3s from 108% |
| **96** | `scripts/check-focus-ring-token.py` (a build gate): 93 focus rules in 32 files now read the client's ring token |
| **N4** | trust-bar drop and scroll coexist; 44px pause toggle |
| **N37, 73, D7, N30** | advance-on-pick with a step announcer; buybox photo entrance; the Google badge in the header's top row; plain size numbers |
| **N2A, N33A** | measured as never applied on Eye Care, then fixed in the trees |
| **N8** | not reproduced (wordmark stayed on 1 line while the bag opened) |

Three defects surfaced while verifying and are fixed: every frame's add-to-bag was refused (two attributes
labelled "Size"; `class-cart-proxy.php`), a set `sgs/media` size was ignored on every WooCommerce page
(`media-atoms/box-shape.css`), and a drawer with no menu block never loaded its stagger CSS (`077f7dbec`, not
yet deployed).

## 3. Content — written, ours to own

**Bean's ruling: the content is ours to write, not a client dependency.** Fatima reviews it when the site is
ready, and she is not asked to draft anything while the build is in progress. So these are no longer "needs
content from the client":

- **45** `/privacy` and `/terms`: WRITTEN, `sites/eye-care-ward-end/content/{privacy,terms}.md`. UK GDPR, the
  eye test and prescription treated as special-category health data, made-to-order lenses against the 14-day
  cancellation right. Every value is a UK-law or trade default; no placeholders remain.
- **151** delivery wording: WRITTEN, `content/shipping.md`, for the three methods the shop already runs.
- **161** brand intros: WRITTEN, `content/brand-intros.md`. 40 intros, all distinct openings. **All 40 stay** —
  the site carries test products built for design and development, so there is no real catalogue to trim
  against yet.
- **159** is clinic photography, which arrives with the real build rather than being drafted.

## 4. Accepted divergence / beyond the draft

- **37, "address not a link"** — the **draft has no maps link either** (zero maps/directions links). This is an
  improvement the register chose, not a divergence from the draft. Reclassify before it is counted as a gap.
- **N16b, "best sellers is hand-picked"** — the test site has no sales, so a live best-seller collection would
  order arbitrarily. Not settleable until real orders exist.

## 5. The thing nobody was looking for

Two separate defects. The first is a stated design intent that is not met; the second compounds it.

### (a) The product card is not a stretched link

Grid-sampled at 81 points per card with `document.elementFromPoint` (real hit-testing, not synthetic clicks),
each card scrolled into view first:

| Card | Clickable surface |
|---|---|
| with an image | **73-79%** -> **99%** |
| without an image | **2-5%** -> **99%** |

Every card carries `a.product-card__title-link` around the title text, covering **1-2%** of the card. Cards
with an image add `a.product-card__img-link` at **73%**. Nothing stretches a link across the card:
`sgs-block-link-overlay` appears **zero** times on home, shop and product.

**So the card WAS clickable only on the product name and the image.**

> **FIXED AND VERIFIED LIVE, 2026-10-06 (`3db77f090`, deployed in `6f1963c28`).** The mechanism was never broken: the card
> already supported a whole-surface link, but it hung on an operator toggle (`sgsBlockLinkAuto`) that was simply
> off. Bean's ruling is that it must not be switchable off at all, so a new `supports.sgs.blockLinkAlways` flag
> replaces `blockLinkAutoUrl` on this block: `render.php` calls `sgs_stretched_link_apply()` directly instead of
> `sgs_stretched_link_handover()`, which gates on that toggle, and the Block Link panel renders no toggle, so no
> dead control is left behind. The title's hover underline is also removed - the whole card is the link, so the
> cursor already carries the affordance.
>
> **The URL field deliberately stays** (Bean caught this): a TYPED card resolves no product and so no permalink,
> `apply()` is handed `''` and no-ops, and that field is its only way to have a destination. On a live card
> `apply()` overwrites whatever is typed, so it is inert there rather than conflicting.
>
> **Verified live on the same 81-point grid, so before and after are directly comparable.** Every card on
> `/shop/` and `/` is now **99% clickable**, imageless ones included, and 16 overlays on the shop plus 8 on home
> each resolve to their OWN product slug, so per-card URL resolution is correct rather than ambient loop state.
> The residual 1% is **one point landing on `button.sgs-product-card__wishlist`** - correct, since the wishlist
> must stay clickable in its own right rather than be swallowed by the overlay.
>
> **The keyboard story holds.** The overlay is inert (`tabindex="-1"`, `aria-hidden="true"`) and supplies hit
> area only; the title keeps the single named route, with **exactly one** non-inert anchor to the product. A real
> `Tab` walk inside a card stops on the wishlist button, the title link ("Aviator Classic"), then four swatch
> buttons - so no nested control was lost and no duplicate tab stop was created.
>
> **The hover underline is gone**, read under a real mouse hover: `text-decoration-line` is `none` resting and
> `none` hovered.
>
> Proven by marker AND checksum, never liveness: marker `6f1963c28` with `3db77f090` an ancestor, and the
> deployed `product-card/style.css` md5 (LF-normalised) matches local at `3d4218db0a4ab77eade44e428d7c5aed`,
> with `title-link:hover` absent and `blockLinkAutoUrl` gone from the deployed `block.json`. **Expected on re-measure:
> near-100% clickable on every card, including the 12 with `photo-to-come.png`, and no underline on hover.**
> Bean confirms the card is *supposed* to be fully clickable. S10's commits were live, but on the product card
> the block's own visible link (`e62f45952`: "a block's OWN visible link owns the surface") was the 1-2% title
> anchor, which is why the card read as dead almost everywhere; `3db77f090` makes the whole card the link.

> **Correction.** An earlier draft of this report said the imageless cards had "no link at all". That was a
> measurement error: the hit-test landed on the title row's padding, and the title link covers only 1-2% of the
> card. The link exists - it is just very small. The corrected figures are the table above.

### (b) The imageless cards are a content state, NOT a defect — hypothesis withdrawn

**12 of 16 shop cards render no image, and that is correct.** Only **4 products have a real photograph**
(Round Metal, Original Wayfarer, Holbrook, Oversized Cat-Eye). The other 12 carry `photo-to-come.png`, a
deliberate stand-in awaiting the client's photography, and 1 (the QA test item) has no image at all.

> **Withdrawn.** An earlier version of this report proposed that a never-purged manifest transient
> (`sgs_manifest_v8_<id>_<fingerprint>` written vs `sgs_manifest_<id>` deleted) was starving the cards of
> images, and offered the fact that `gucci-oversized-cat-eye` rendered correctly as corroboration. That was a
> coincidence: the Gucci product is simply one of the four with a real photo. The cache-key mismatch is still a
> real bug, untracked anywhere (`class-product-manifest.php` writes `sgs_manifest_v8_<id>_<fingerprint>`; the purge
> deletes `sgs_manifest_<id>`, so it never matches; an earlier draft wrongly cited row 59) — but it is **not** the cause of anything observed here, and no fix
> should be built on it. Caught by Bean, who knew the photo inventory.
>
> The measuring error behind it: the check for a placeholder image tested only for the string `placeholder`,
> so a client stand-in named `photo-to-come.png` counted as a real photo and 16 of 17 products looked
> photographed.

What survives is (a), and it absorbs this entirely: a card with no real photo has no image link, so it falls
from 73-79% clickable to **2-5%**. Making the whole card the link fixes the imageless cards too, and does not
wait on the photography.

## 6. The 14 CR rows — answered by the route owner

CR1-CR12, CR14, CR17, CR18 are route and calibration findings. **Their table has no Fix column**
(`Ref/Finding/Evidence/Status/Sweep`), so none can carry Fix-cell proof. Session `small-giants-wp-c8`, the route
owner, answered on 2026-10-06:

**None of the 14 were closed by the route cleanup.** Its 16 tasks are H1, H2, P1, P2a, P2b1-3, P3a-d, P4 and
R1-R3, and no CR reference appears anywhere in `plans/2026-10-06-spec47-route-cleanup.md`. State that precisely:
it is strong evidence the two sets are disjoint, **not** a line-by-line proof that no CR row was incidentally
fixed by one of the 16. So no CR status is stale on that account, and none is marked closed here.

| Group | Rows | What they need |
|---|---|---|
| Route already fixed, waiting on a **re-calibration host window** | CR3, CR7, CR10, CR11, CR17 | a quiet host, not a decision |
| Still to prove, so no owner needed yet | CR1, CR2, CR4, CR5, CR9 (prove CR9 with CR1 — same pattern) | investigation |
| Partly fixed | CR14, CR18 | finish (CR18: Lenses and the rest still to re-pair) |
| **CR6** — owned by the route session | **CR6** | a MIGRATION: 178 call sites / 56 files |
| **CR12** — PARKED by Bean | **CR12** | no owner needed |

**CR6** was genuinely orphaned: `LEDGER.md` named "Spec 47 §5 Residual" as its owner and that section never
mentioned it, so the one CR row marked proven-and-unbuilt had nobody. Now recorded there (`c0d45ec20`) with its
blocker: `lib/resolve.mjs::seedSides` models the zero-fill CR6 removes, so the helper change and `seedSides`
**must land together** or the route re-introduces what it just removed. Not scheduled. c8 offered to take it as
one focused piece.

**CR12 is PARKED (Bean, 2026-10-07).** Dark mode IS implemented in the theme (`dark-mode.css`,
`dark-mode.js`), so it is a toggle that renders nothing for current clients, not an unbuilt feature.
Parked rather than orphaned, and not to be picked up without Bean.

⚠️ **Any re-calibration must run AFTER the framework-DB reseed now in flight**, or it measures against a DB
that is about to change.

## 7. Aliases, not independent work

A third of the "to assess" rows only point at a parent. Six point at a parent that is **already built and live**:
N2A, N26 → S10 · N10, N33A → S9 · N6 → S12 · 61 → 59.
The rest inherit their parent's open state: 3 → 17 · N9, N34 → S8 · N27, N31 → S7 · N8 → N2B.

## 8. The 15 unmeasured rows — classified from source

Root-caused 2026-10-06 under `/systematic-debugging`, from code and the client's built trees only (the shared
host was held by two peers). Each carries the one live measurement that would confirm it.

**Three verified directly by me**, because they are the cheapest wins in the whole list:

| Ref | Cause, verified | Fix |
|---|---|---|
| **58** hero buttons appear instantly | `home.tree.json`: the hero heading and text carry `sgsAnimation: fade-up`; the `sgs/multi-button` node carries **none**. The attribute exists on the block. | **FIXED, verified live `0cc773b19`** (page rebuilt with `wp-build-page.js`) |
| **N33B** Save shown twice | `single-product.tree.json` sets `gallerySavingBadge: true`; the `block.json` default is `false`. The price-row pill comes separately from `rrpMetaKey`. | **FIXED, verified live `0cc773b19`** (page rebuilt with `wp-build-page.js`) |
| **9** Ferrari tile reads its name twice | `mega-brands.tree.json`: **1 of 12** tiles carries a `title`, and it is Ferrari Scuderia with `title` identical to its `media.alt`. Every other tile has `title: ""`. | **FIXED, verified live `0cc773b19`** (page rebuilt with `wp-build-page.js`) |

**The rest:**

| Ref | Class | Root cause |
|---|---|---|
| 152 coupon / note / terms | **BUILT** | the three are separate unlocked inner blocks in `parts/sgs-checkout-content.html`; confirm-only |
| N30 bridge-size box | TREE + seed data | the seeder writes `U+25A1` into `_sgs_size_measure` (`woo-seed/seed.php::sgs_seed_find_or_create_size_term`); the draft uses the same glyph |
| N36S sizing tab | mixed | 4th row is a tree change needing lens-height data that does not exist; the diagram is a new block (D1). **The register's "no description column" is STALE — it is already built** |
| 64 filter bar scrolls | **FIXED, verified live `0cc773b19`** | `sgs-shop-filters.js::ensureParts` puts the header inside `.sgs-shop-filters__scroll`, which has `overflow-y:auto`; the footer is appended outside it, which is why it stays pinned |
| 14 drawer stagger | FRAMEWORK | `nav-drawer-menu/style.css` staggers only direct children of `.sgs-nav-drawer__body`; the tree's `sgs/container` is one child, so everything inside it arrives together |
| 17, 3 bag count pop | **FIXED, verified live `0cc773b19`** | `count-pop.js::maybeAnimateCountPop` pops only on increase and the first call is `NaN`, so no pop on load; the CSS is fixed at 0.35s against the draft's 0.5s |
| 19 delivery bar | **FIXED, verified live `0cc773b19`** | `cart/style.css` hardcodes `transition: width 0.3s ease`; no duration or easing attribute exists |
| 73 photo fade | FRAMEWORK | `sgs/buybox` has no photo-entrance attribute; the existing crossfade fires only on variation swap |
| N13 WhatsApp overlap | **CLOSED — already worked** | `floatingHideNearInline` defaults to true and the footer holds a real `sgs/whatsapp-cta`, which `whatsapp-cta/view.js` matches; measured hiding at the footer |
| N37 advance on pick | FRAMEWORK | `block.json::advanceMode` is an enum of `continue` and `tap` only; tap hides Continue, so Back cannot return without re-picking |
| D7 Google rating | FRAMEWORK or tree | the top bar is `sgs/trust-bar`, dynamic with no InnerBlocks and an icon-and-label repeater, so it cannot host `sgs/google-reviews` |
| N24 review logo link | **FIXED, verified live `0cc773b19`** | `google-reviews/render.php` draws the logo as a bare `<img aria-hidden="true">`; a per-review `reviewUrl` already reaches the render |

**Fix together — these share one mechanism:**
- **Cart motion (17, 3, 19)** — one pass over `cart/count-pop.js` and `cart/style.css`
- **Tree-only batch (58, N33B, 9, + confirming 152)** — about 5 minutes on one build
- **Entrance motion (14, 73, 17)** — all want a draft-shaped entrance; fix against one shared keyframe and timing convention (rise 18px, 0.5-0.9s, `cubic-bezier(.2,.7,.2,1)`) rather than re-typing it three times

**Not settled from source, stated rather than guessed:** 152 (a live-DB copy of the part could carry locks),
N36S (whether real lens-height values exist), 14 (whether the live drawer uses the tree's `sgs/button` nav
container), 19 (whether the bar transitions at all, a different cause from the duration).

## What is left

- **14** drawer stagger: deploy `077f7dbec` (blocks-only) to eye-care-test, then at 375 confirm the drawer's
  links start at staggered times (`animationstart` listener installed before navigation).
- **N36S** sizing tab: blocked. The 4th row needs a lens-height value no product carries, and the diagram is
  the new D1 block. The note under the table is live.

**Do not rebuild on:** the manifest-cache theory in §5(b). It was withdrawn.