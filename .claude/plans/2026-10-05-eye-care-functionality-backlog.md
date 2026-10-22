---
title: "Eye Care: the functionality and feature backlog pulled out of the fix register"
project: small-giants-wp
created: 2026-10-05
status: Tier 1 built; Tier 2 partly built (open rows below); Tiers 3-4 open except 73
governs: what to build next, after the register-proven repairs track closed
references:
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - .claude/plans/archive/2026-10-05-eye-care-register-proven-repairs.md
---

# Eye Care: the functionality and feature backlog

**Written for:** Bean, and whoever picks this up next session.

**What this is.** The fix register holds every Eye Care fix, and most of them are *values* (a spacing, a colour, a weight) which belong to the page trees and to Solve. This document holds only the open rows that change what the site can **do**: a feature that does not exist, a control that exists but paints nothing, or a behaviour that is broken. Every item is already decided in the register, which stays the source of truth; if an item below disagrees with its register row, the register wins. Page-tree values, content, pure styling and the Spec 48 measuring route are excluded.

CR6 (padding and margin longhands) is done, see `plans/archive/2026-10-07-cr6-box-longhand-migration.md`.

**How to read the tiers.** Tier 2 is a feature that does not exist. Tier 3 is a control that exists and does nothing. Tier 4 is small setting additions. Within a tier, the order is the order to build in.

---

## Tier 2: features that do not exist yet

### The shop

| Ref | The feature |
|---|---|
| **65B** | **The shop goes to a single column below 400px.** Its "narrow layout: grid" floors each column at 50%, so it can never reach one column. Also fixes 65A and 65C |

### Menus, header and drawer

| Ref | The feature |
|---|---|
| **N5.5** | **Mega menu items you can click through to their page.** The ordinary dropdown renders a link plus a separate open button; mega items render a button only. Give mega items with a page the same link-plus-button pattern (button discreet, still 44px), then add page links to Sunglasses, Lenses and Help (Brands has no Section page set). Done 2026-10-20 (`e89779dbf`, `2dda500ff`, deployed to eye-care-test): the draft draws Sunglasses, Lenses and Help as plain links with no chevron, so with the block's caret off a parent with a page is one link that is also its panel's trigger (Spec 36 FR-36-5); their panels' Section pages are the shop (6), Prescription lenses (168) and Help (171), Brands has none. Live in headed Chrome at 1440: each is one link with no button or caret, hover opens its panel, a click lands on its page (200), Tab focus opens Sunglasses, Escape closes it with focus kept, ArrowDown moves into the panel; Brands stays a button. At 1024, 768 and 375 the bar collapses to the menu button, and the drawer menu has no dropdowns. |
| **N5** | **Mega panel setting: "width limit applies to panel / content".** Content mode paints the ground edge to edge and centres the content at 1440. Today the panel stops at 1440 and sits left-aligned at wide screens |

### Motion on Home

| Ref | The feature |
|---|---|
| **53** | **Hero "drift" mode.** The photo moves at a set share of the scroll speed (draft 0.18), replacing the fixed-background parallax where the photo stands still. Off under reduced motion. Framework built 2026-10-15 (Spec 38A M5.7 `parallax`, `1da86bffa`; 0.18 reads 90px at scrollY 500 live); the Eye Care hero takes it on the M6.5 sweep |

### Footer and site furniture

| Ref | The feature |
|---|---|
| **135** | The contact form's narrow-width stretch becomes **switchable**, so Send can be full width on a phone |

### Checkout and confirmation

The least-started area. Eye Care gets its own checkout template; nothing here changes the checkout other SGS clients get.

| Ref | The feature | Notes |
|---|---|---|
| **154 + 149 + 150** | **Build the draft's checkout as Eye Care's own checkout template** (numbered small uppercase step headings, white fields, flat summary card, 1200px column, delivery cards, "Pay now" with the price on the right, the secure-payment note). One job; this site only | **Answer first: can `wp-build-page.js` build a template or template part?** If not, WordPress saves a Site Editor edit of a part per site. The draft's prescription step and express-pay row need planned plugin work, so scope them separately |
| **156** | **Confirmation screen**: tick icon, "Thank you", short message, "Back to the shop", centred. No order table; the email carries the details | Wording per client |
| **157** | The confirmation grid **collapses to one column when the shipping box is empty**, instead of leaving billing alone in the right half | Small |
| **155** | **Hide WooCommerce's collapsed top summary on phones**, so the order summary appears once, below the form | Prove the selector first |
| **148** | Checkout sections fade up on scroll, from tokens. A CSS-tier fix in the stylesheet, not through a setting | Small |

### Reviews

| Ref | The feature |
|---|---|
| **GBP sync** | **Google Business Profile sync for `sgs/google-reviews`.** The settings page only tells the user to find the Place ID themselves; offer the sync so a client connects the profile without looking anything up. A feature idea, not a register item |

### Measured diagram (D1) deferrals

The block is built and live (plan `plans/archive/2026-10-07-measured-diagram-block.md`). Deferred, each with its trigger:

- An angle `kind` for `sgs/diagram-dimension` (an arc plus degrees). Trigger: the first client needing angles.
- A conditional-visibility rule for product category or field, so one template holds one diagram per product shape. Trigger: the first shop selling two product shapes.
- Number formatting (`decimals`, units) and a shopper mm/inch toggle. Trigger: the first non-mm client.
- Stock text in the `sgs-variation-change` detail. Trigger: a bound stock value that must follow the size.
- Mixed per-size values on a plain bound text: switching to a size with no value hides the value but leaves the " mm" after-text. Fix by wrapping before/after inside the span when the value can vary. Trigger: the first product whose sizes disagree on having a value.
- Skip a diagram dimension on the server when no size has its value: `includes/helpers-measured-diagram.php::sgs_diagram_dimension_empty_marker` prints a hidden marker whenever the key can vary, so the six no-lens-height frames carry a dead `display:none` dimension. Check that some variation has a non-empty value first. Trigger: the next change to that helper.
- Consolidate the four duplicate `.sgs-sr-only` definitions. Trigger: the next block that needs one.

---

## Tier 3: controls that exist and paint nothing

| Ref | The dead control | Where |
|---|---|---|
| **CR13** | **Spacing presets render as pixels, framework-wide (found 2026-10-13).** `includes/helpers-css-safety.php::sgs_css_length_value_preset_slugs` reads `slug` at the top level of `wp_get_global_settings( array( 'spacing', 'spacingSizes' ) )`, which WordPress returns grouped by origin (`{default: [...], theme: [...]}`), so the slug list is empty and every bare-number spacing value meant as a preset ("20") renders as pixels (20px) in the helper's 79 caller files since `8ae3efffa` (2026-09-08); proven live on sandybrown. Its tests stub a flat slug list, which hides it. `sgs/label`'s dot gap no longer depends on it (`8c34187eb`, default 8px) | Diagnose first, then fix: (1) establish which meaning each writer intended (Solve and Fill wrote and measured pages against the pixel behaviour; read the writers and diff the Eye Care trees' bare-number spacing values against the draft); (2) flatten the origin groups in the helper, accepting both shapes, with a PHPUnit case on the real shape; (3) re-measure Eye Care (the finished answer key) before and after, and migrate any value whose intended meaning changes |
| **71** | The product block does not pass text styling through to the colour and size options, so swatch names cannot be sized or weighted | Control plumbing |
| **CR10** | `sgs/media`'s `aspectRatio` has no `css_property` in the framework DB, so it can never be resolved or written | Small, DB-side |

---

## Tier 4: small setting additions

| Ref | The setting |
|---|---|
| **67** | Tabs gain a panel padding setting (Eye Care sets 0) |
| **94** | The gallery photo joins the shared hover zoom |
| **Card-grid zoom** | A zoom amount control on `sgs/card-grid`: the card has a hover scale, and the image zoom amount is the scale of the image part in the `sgsMotion` Hover panel (Spec 38A), so check that its scale control covers the zoom size |
| **77** | A selected-tile border width setting (Eye Care wants 2px against 1px) |
| **49** | A "collapsed icon size" setting on the floating WhatsApp button, so the icon stays 28px or larger once it collapses to a circle |
| **117, 123, 69, 81, N29** | The size pop-up: a **padding setting**, a header bar built as a container in the pop-up's own layout file (title, divider, sticky), a **screen-edge gap token** (32px above phone, 16px on a phone), and a square transparent close button |
| **9** | The Ferrari brand tile reads its name twice to screen readers: clear either its title or its image's text alternative |
| **152** | Confirm coupon, order note and terms can each be switched off without code (order notes is a checkout block setting, coupons a WooCommerce setting, terms an inner block in the shared part). A verification task, not a build |

---

## Open items with no other home

Each names its evidence; the register stays the source of truth for fixes.

| Ref | What is open | Evidence and what to do first | Tier |
|---|---|---|---|
| **Q10** | The product field binding's `fallback` and `fallback_link` arguments (the "Ask us" cell on frames with no lens height) have no inspector control; they live only in the Single Product template's markup, and `src/bindings/product-field.js::getValues` returns '' so the canvas never shows "Ask us". Core Block Bindings has no UI for source arguments, and products use the classic edit screen, so the template is the only editor surface | Give the arguments an editor surface | 4 |
| **IconPicker id** | `IconPicker` has no `id` prop (props: `value`, `onChange`, `label`, `sources`, `brands`), so its label cannot be associated with the control | Add an `id` prop and wire the label to it, then use it in each caller | 4 |
| **Box-alignment separator** | The front-end separator at a numeric 40% width has not been read in LTR and RTL | One live read of the separator at 40% in each direction | 4 |
| **P0-4** | The wiring gate's L5 tracer misses a value that passes through a normalising variable and then a ternary | `sgs/google-reviews::scrollbarStyle`, still in `wiring-fingerprint-baseline.json`. Extend the tracer to follow the variable, then clear the baseline entry | 4 |
| **P0-5** | 34 structural borders have no control: post-grid card, pricing plan, trustpilot card, wishlist row, product-search panel, choice-flow showcase panels | Add a border control per block | 3 |
| **P0-7** | The gradient regex is duplicated in `src/utils/tokens.js` and `surface-tone.js`, because `surface-tone.js` cannot import it without a circular import with background-preview | Move the regex to a leaf module both import | 4 |
| **P0-8** | Unread: does the container load the svg-bg and shape-divider CSS on a page with a hero but no container? | One live read on such a page | 4 |
| **sgs/hero maxWidth** | `section.sgs-hero{max-width:none}` beats the wrapper's uid rule (`353b9b4ed`, `HERO-DEAD-SETTINGS.md`) | Never remove the `max-width:none` (D725); give maxWidth a path that wins on the hero | 3 |
| **Tier background, no base image** | A tier background with no base image may paint nothing (candidate gap, `HERO-DEAD-SETTINGS.md`) | `class-sgs-container-wrapper.php`'s tier rule against the `::before` box guarded by `$has_bg_image`. Proof: an instance with `backgroundImageTablet` set and `backgroundImage` empty, then read `getComputedStyle(root,'::before')` `content` and `background-image` at 768 | 3 |
| **sgs/hero gridTemplateColumns** | The live path is undetermined (`HERO-DEAD-SETTINGS.md`) | Find the rule that writes it before deciding it is dead | 4 |
| **Spacing rows (Session C2)** | Cause 1: `sgs/container` margin against core `is-layout-constrained` (the class-list read is not done). Cause 2: `sgs/site-footer::margin-top`, cause refuted, no replacement proven | `reports/2026-10-06-session-c2/FACT-CHECK-RESULTS.md`. Read the class list, then prove the cause | 3 |

## Deferred: product-manifest transient is never purged

`includes/class-product-manifest.php` writes the transient `sgs_manifest_v9_<id>_<tax-fingerprint>`, while `includes/class-cart-cache-purge.php::purge_by_product_id` and `seed-48-sku-fixture-v2.php` delete `sgs_manifest_<id>`. The purge key can never match the write key, so a product's manifest is never purged on change and expires only on TTL: an edited product can keep serving its old variations, swatches and availability. It is not the cause of the imageless Eye Care shop cards (those are 12 products carrying `photo-to-come.png`).

Fix shape: make the purge delete the versioned key, which needs the tax fingerprint, or delete by prefix. Prove it first with a negative control: edit a variable product's variation, confirm the shop card is stale before the fix and fresh after it.
