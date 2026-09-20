---
doc_type: design
project: small-giants-wp
date: 2026-09-20
status: DRAFT for design-gate
plan_row: W2-p
spec: 37-HEADER-FOOTER-BUILDER
---

# W2-p — Floating header "pill" mode: design gate

**Nothing here is built. This document exists to be approved or amended before any code is
written** (project rule 7: a shared-mechanism change needs a pre-build design gate). It touches
`sgs/site-header`'s shared sticky/transparent writer and the site-wide header-offset token, which
is exactly the blast radius rule 7 names.

---

## 1. Plain English first

### What a "floating pill" is

Today the header sits flush against the top and both side edges of the browser window, like a shelf
screwed to the wall. A **floating pill** detaches it: the bar sits a small gap down from the top,
a small gap in from each side, with rounded ends and a soft shadow, so it reads as a card hovering
over the page rather than a band welded to it. It is the look you see on a lot of 2026 product
sites and design-system demos.

### Why it is not just "add rounded corners"

Three things in the framework assume the header's top edge is at zero and its bottom edge is
therefore the same number as its height:

1. **Anchor links and keyboard focus.** When you click an in-page link, or tab to something near
   the top of the page, the browser needs to know how far down the page the header's *bottom* is,
   so it doesn't park the target underneath it. The framework publishes a number for this
   (`--sgs-header-height` — a CSS custom property, which is just a named value CSS can reuse). That
   number is the header's **height**. Once the header floats 16px down, its bottom edge is
   16px lower than its height, and everything reading that number is 16px short.
2. **Hide-on-scroll.** The "header slides away as you scroll down" behaviour slides it by exactly
   its own height. A floating header slid by its own height still leaves its top gap visible, so a
   16px sliver of bar stays stuck on screen.
3. **Dropdowns and the mega panel.** A dropdown hanging off a narrow pill has to decide whether it
   is as wide as the pill or as wide as the page.

None of these is hard. All three are invisible until someone looks, which is why they belong in a
design gate rather than in the middle of a build.

### What is being asked for

The ruling already signed on 2026-07-30 (recorded in `.claude/decisions.md::D418`, the "Q4 mobile
pill" bullet) says: **the pill persists at mobile** — it does not turn back into a full-width bar
on a phone. Width is `min(cap, 100% − 2×inset)` plus safe-area insets (the space iPhones reserve
for the home indicator and the notch), with **one opt-in toggle** to collapse to full width below a
breakpoint — deliberately *not* three per-device controls.

---

## 2. Is the header-offset primitive actually complete? (the gate question)

The plan row says *"Depends on the header-offset primitive (`--sgs-header-height` is published;
confirm it is complete before starting)."* I confirmed it from code rather than from the plan.

### 2.1 Who publishes it

| Publisher | Where | Behaviour |
|---|---|---|
| The live measurement | `plugins/sgs-blocks/src/header-behaviours/view.js::publishHeight` | `ResizeObserver` on `header.sgs-site-header`; writes an integer px value **inline** on `documentElement` and `body`. |
| The gate on that measurement | `plugins/sgs-blocks/src/header-behaviours/view.js::isHeaderPinned` | Reads the **computed** `position`. Publishes the measured height only while the header computes `sticky` or `fixed`; otherwise publishes an explicit `0px`. |
| The static default | `theme/sgs-theme/assets/css/utilities.css` (`:root { --sgs-header-height: 80px }`) | A theme-side literal. |

Two properties of this that matter downstream:

- The published value is **inline on `:root`/`body`**, so it out-ranks the theme's static 80px
  whenever the script has run. The explicit `0px` write is deliberate and documented — the CSS
  fallback `var( --sgs-header-height, 0px )` only fires while the property is *undefined*, and the
  theme defining it at `:root` means that fallback is unreachable in practice (this is already
  written down in `.claude/specs/37-HEADER-FOOTER-BUILDER.md` §scroll-padding-publisher).
- Tier handling is **measured, not declared.** `render.php` emits `position` per device tier
  through `sgs_merge_tri_state_declarations()`, and the publisher reads whatever the browser
  actually computed at the current width. So "sticky on desktop only" already publishes `0px` on a
  phone with no extra code. **Tier coverage is complete.**

### 2.2 Who consumes it

| Consumer | Where | Reads it as |
|---|---|---|
| Anchor / focus scroll padding | `theme/sgs-theme/assets/css/utilities.css` — `html { scroll-padding-top }` plus two admin-bar `calc()` variants | distance from viewport top to the header's bottom edge |
| WooCommerce sticky element offset | `theme/sgs-theme/assets/css/woocommerce.css` — `top: calc(var(--sgs-header-height, 0px) + var(--wp--preset--spacing--40, 1.5rem))` | same |
| Motion-path rest position | `plugins/sgs-blocks/assets/css/fx-motion-path.css` — `calc( var( --sgs-header-height, 80px ) + 16px )` across the rest-Y ladder | same |
| Motion utilities | `plugins/sgs-blocks/src/shared/effects/motion-utils.js` — `getPropertyValue( '--sgs-header-height' )`, with the admin bar added as a separate term | same |
| Root scroll padding (plugin) | `plugins/sgs-blocks/assets/css/header-behaviours.css` — `:root { scroll-padding-top: var( --sgs-header-height, 0px ) }` | same |
| Mega panel and submenu height bound (pre-JS floor) | `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` — the `__mega-panel-wrap` rule and the `__submenu-wrap` rule, each `max-height:var(--sgs-mm-panel-max-h, calc(100dvh - var(--sgs-header-height, 80px) - 16px))` | fallback only: `mega-disclosure.js::repositionPanel` publishes `--sgs-mm-panel-max-h` by measurement, and the token is read only until that value exists (no JS, or before the first open) |
| Header-anchored drawer (fallback) | `plugins/sgs-blocks/src/blocks/nav-drawer/render.php` — `$sgs_nd_geometry_for_anchor`, `case 'header'`: `top:var(--sgs-drawer-header-offset, var(--sgs-header-height, 0px))` and the matching `max-height` | fallback only: `store.js` writes `--sgs-drawer-header-offset` from `getBoundingClientRect().bottom` when the drawer opens, and removes it when the header rect's bottom is not positive |

**Completeness of this table.** The command `grep -rn -- "var( *--sgs-header-height\|var(--sgs-header-height" theme plugins | grep -v "/build/" | grep -v node_modules` returns 36 lines across 7 files: `fx-motion-path.css` 27, `utilities.css` 3, `nav-menu-submenu-css.php` 2, and 1 each in `woocommerce.css`, `header-behaviours.css`, `nav-drawer/render.php` and `view.js`. Two of the 36 are docblock mentions, not reads (`fx-motion-path.css` line 73 and `view.js` line 198), leaving 34 reading lines in 6 files. `motion-utils.js` reads the token through `getPropertyValue` and is outside that pattern. So there are 7 consumer files, all listed above.

**Two places measure the edge themselves instead of reading it, and both are right:**

- `plugins/sgs-blocks/src/shared/nav-interactivity/store.js` measures the header's real
  `getBoundingClientRect().bottom` and writes `--sgs-drawer-header-offset`, with a comment saying
  in as many words that the token is the theme's static value and not the real bottom edge.
- `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` measures the panel's own
  `rect.top` for its vertical bound, with a comment explicitly refusing the token ("that is a
  scroll-padding token").

Those two measured paths are **already pill-correct by construction** — they measure, so an inset
changes nothing for them. The same two surfaces also carry a token-reading fallback (the last two
rows of the consumer table). Those fallbacks read `--sgs-header-height` only until the measured
value exists:

- **No-JS, or before the first open:** `--sgs-header-height` resolves to the theme's static `80px`
  (`utilities.css`), or to whatever `view.js::publishHeight` has published once it has run. A
  floating pill's real bottom edge is its inset plus its height, which the static `80px` does not
  know about. The mega panel's height floor and the header-anchored drawer's `top`/`max-height`
  therefore sit off by `pill bottom edge − 80px` until the measurement replaces them.
- **After §3.2:** where the publisher has run, the token is the pill's measured bottom edge, so
  those fallbacks read the correct value. Float implies sticky (§3.4), so the `isHeaderPinned` gate
  publishes the measurement rather than `0px`.

So the measured paths need no work, and the two fallbacks need no code change of their own beyond
§3.2 but do need the pre-JS check in test row P11. If P11 shows the static `80px` clips or gaps
under a floating header, the theme default (or the emitted per-header value) has to include the
inset.

### 2.3 The verdict — and the one thing that is NOT complete

`.claude/decisions.md::D418` records: *"B1 validated: all 4 consumers of `--sgs-header-height`
audited, none compensates for height-not-bottom-edge semantic."* The current consumer set is 7
files (§2.2 gives the exact grep command and its count); the four D418 names are `utilities.css`,
`woocommerce.css`, `fx-motion-path.css` and `motion-utils.js`, and the other three are
`header-behaviours.css`, `nav-menu-submenu-css.php` and `nav-drawer/render.php`. I read all seven
and none compensates for the height-not-bottom-edge semantic. But read what D418 says:

> **the token is a HEIGHT, and every consumer treats it as a BOTTOM EDGE.**

Today those are the same number, because the sticky writer hardcodes `'top' => '0'`
(`plugins/sgs-blocks/src/blocks/site-header/render.php`, the sticky entry of the
`sgs_merge_tri_state_declarations()` call). **A floating pill is precisely the case where they stop
being the same number.** The primitive is complete for a flush header and structurally short by
exactly the top inset for a floating one.

So: the primitive is **not** a missing prerequisite to go and build. It is a *correct* mechanism
carrying one latent assumption that this feature invalidates, and fixing that assumption is
**step one of this build**, not a separate blocked row.

> ⚠ **Correction to the plan.** The brief for this document referred to "W2-v (the header-offset
> primitive, 'B1') has no build record". There is no `W2-v` row — the plan's Wave 2 rows run
> `W2-a` … `W2-u` (`.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`). "B1" is a
> bullet inside D418, and it is recorded there as **validated**, not as pending work. Nothing is
> blocking W2-p.

### 2.4 One inconsistency found while auditing (not a blocker, worth closing on touch)

The fallback value differs between consumers: `0px` in `utilities.css` and `woocommerce.css`, but
`80px` in `fx-motion-path.css`. Because the theme defines the property at `:root`, **no fallback
ever fires**, so this is currently inert — but it is two different beliefs about the same token
sitting in one tree. Close it in the same commit as §3's change, or leave it and say so.

---

## 3. The design

### 3.1 The one-line shape

A pill is a **sticky header whose `top` offset is an inset instead of zero, whose width is capped
and centred, and which carries radius and shadow.** Everything else about the header is unchanged.

That framing matters because it keeps this inside the existing shared writer rather than creating a
second positioning system.

### 3.2 The primitive fix (build this first)

**Change `publishHeight` to publish the header's measured bottom edge rather than its height.**

```
publishGated() → publishHeight( isHeaderPinned( header )
    ? Math.max( 0, header.getBoundingClientRect().bottom )
    : 0 )
```

Why this specific shape, and not a second token:

- For every header shipping today (`top:0`), `rect.bottom === height`, so the published number is
  **byte-identical**. That is the regression test — the same discipline `FR-37-40` used when it
  added the collapse path.
- It keeps **one** load-bearing mechanism. Adding a second token alongside the first would leave
  two overlapping fixes where neither can ever be safely removed
  (`~/.claude/rules/prove-the-cause-before-fix.md`).
- Every one of the seven consumers wants the bottom edge. None wants the height. The name stays;
  only the docblock changes to state the semantic honestly.

⚠ **`getBoundingClientRect()` is viewport-relative, so `rect.bottom` on a header that hide-on-scroll
has translated upward goes negative.** The `Math.max( 0, … )` floor handles it, and it is the
correct answer: a header that is off-screen obscures nothing.

### 3.3 Attributes

Keep the new surface as small as it can honestly be. `sgs/site-header` **already declares**
`margin`, `maxWidth`, `contentWidth`, `borderRadius`, `shadow`, `shadowColour`, `borderWidth`,
`borderStyle` and `borderColour` (`plugins/sgs-blocks/src/blocks/site-header/block.json`). A pill
is mostly those controls with a `top` offset.

| Attribute | Shape | Default | What it does |
|---|---|---|---|
| `headerFloat` | tri-state tier object `{desktop,tablet,mobile}` of `on`/`off`/`inherit` — **the same shape as `headerSticky`** | `{}` (off everywhere) | Turns pill mode on for a tier. |
| `headerFloatInset` | TIER-of-BOX: `{desktop:{top,right,bottom,left}, …}` | `{desktop:{top:'1rem',right:'1rem',left:'1rem'}}` | The gap between the pill and the viewport edges. `bottom` is unused and is not offered in the UI. |
| `headerFloatCollapse` | object `{enabled:boolean, breakpoint:number}` | `{enabled:false, breakpoint:768}` | The single signed opt-out: below `breakpoint` the pill goes full-width, radius 0, inset 0. **Off by default — the pill persists at mobile** (D418). |

Three deliberate refusals:

1. **No new width attribute.** The cap is the existing `maxWidth`. A pill with no `maxWidth` set is
   full-bleed-minus-insets, which is a legitimate look, not a bug.
2. **No new radius/shadow attributes.** `borderRadius` and `shadow` already exist and already reach
   the root. A `floatRadius` would be a duplicate control — the exact defect
   `check-duplicate-controls.js` exists to catch.
3. **`headerFloatCollapse` is one toggle plus one number, not per-tier controls.** Signed in D418
   after the shadcn reference measured as having no responsive behaviour at all. Do not re-litigate
   it into three tier switches.

**Why `headerFloatInset` is a TIER-of-BOX and not a plain box:** the canonical envelope for a
per-device box in this repo is one attribute holding `{desktop:{top,right,bottom,left}, …}`
(`plugins/sgs-blocks/CLAUDE.md` § "The canonical TIER-of-BOXES envelope"). Side-keyed, so it reads
through `sgs_box_object_shorthand()`. Do not invent a variant of the envelope.

### 3.4 Composition with the four existing header behaviours

This is the part that needs Bean's ruling, because each row is a policy choice, not a mechanism.

| Existing behaviour | Interaction | Proposed ruling |
|---|---|---|
| **Sticky** | A pill that is not pinned is just an inset bar that scrolls away. Float without sticky is *nearly* meaningless but not incoherent. | **Float ON for a tier implies the sticky declaration for that tier.** Add float as a **third entry** to the existing `sgs_merge_tri_state_declarations()` call with documented precedence **Float > Sticky > Transparent** for `position`/`top`/`z-index`, so the single-writer-per-property guarantee is preserved. Float's `top` is the inset instead of `0`. |
| **Transparent** | A detached pill with a transparent fill is invisible — you see a floating shadow around nothing. | **Float + Transparent at the same tier = transparent fill AND shadow suppressed at rest; both restored on `.is-header-scrolled`.** This reuses `backgroundColourScrolled` and pairs naturally with plan row **W2-n** (scrolled-state shadow), which is currently NOT DONE. If W2-n has not shipped, ship the shadow-suppression half here and note the dependency. |
| **Shrink** | Works unchanged. The pill gets shorter; `ResizeObserver` republishes the bottom edge. | No change. Verify, don't assume. |
| **Hide-on-scroll** | `translateY(-100%)` moves the pill by its own height, leaving the inset as a visible sliver. **This is a real bug the feature introduces.** | Under float, travel becomes `calc( -100% - var( --sgs-header-float-inset-top, 0px ) )`. The custom-property *value* is emitted by `render.php` per tier (a value, never an inline property declaration — Spec 32). |
| **`headerTransparentDirection`** | Orthogonal. | No change. |
| **`contrastSafe`** | Unchanged; note D418's A1-lite (auto-upgrade fires when **any** tier is transparent). | No change. |

### 3.5 Width, centring and safe areas

```
width:  min( var(--cap), calc( 100% - var(--inset-left) - var(--inset-right) ) )
margin-inline: auto
```

with each inset resolved as `max( <authored inset>, env( safe-area-inset-left ) )` and the right
side likewise. The signed D418 wording is `min(cap, calc(100% − 2×inset))`; expressing it as two
independent sides is the same thing and survives an asymmetric authored inset.

**Zoom and reflow, both non-negotiable:** the authored inset default is `1rem`, not `16px`.
A unit-only `px`/`vw` inset fails WCAG 1.4.4 at 200% zoom — the same a11y lock-in D420 recorded for
the fit-cascade clamps. At a 320px viewport (WCAG 1.4.10) the `min()` guarantees no horizontal
scroll.

### 3.6 Dropdowns, the mega panel and the drawer

| Surface | Current state | Under a pill |
|---|---|---|
| Mega panel vertical bound | `mega-disclosure.js` measures the panel's own `rect.top`; `nav-menu-submenu-css.php` keeps a token-reading pre-JS floor. | **Measured path correct already.** The pre-JS floor reads `--sgs-header-height` (§2.2) and is proved by P11. |
| Mega panel horizontal width | Currently derived from the bar. | **Decision needed — see the menu, item 2.** Recommendation: the panel's width follows the pill's own content box. This matches the header-attached precedent already measured in this repo (`.claude/decisions.md` D418's drawer-research bullet: *"header-attached must derive width from the header"*, measured on lamalama). |
| Dropdown horizontal clamp | `store.js` / `nav-menu-submenu-css.php` clamp against the viewport. | A dropdown on the pill's leftmost item can now overhang into the inset. Clamp against the **pill's** box, not the viewport, so it stays visually inside the card. |
| Drawer `header` anchor | `store.js` measures `headerRect.bottom` into `--sgs-drawer-header-offset`; `nav-drawer/render.php` falls back to `--sgs-header-height` when that value is absent. | **Measured path correct already.** A header-anchored drawer panel hangs from the pill's real bottom edge with zero code once the measurement exists; the fallback is proved by P11. |
| Drawer full-screen variants | Unaffected. | No change. |

### 3.7 Accessibility

| Requirement | How it is met |
|---|---|
| **WCAG 2.4.11 focus not obscured** | The §3.2 primitive fix. `scroll-padding-top` becomes the pill's real bottom edge. This is the single most important line in the document. |
| **44px touch targets** | Unchanged; the pill changes the container, not the items. The inset must not squeeze the row — the fit-cascade (D420) already owns that and applies here too. |
| **Visible focus ring not clipped** | ⛔ **The pill must not set `overflow:hidden`.** A rounded container with clipped overflow cuts the focus ring off the leftmost and rightmost items. Radius without overflow clipping is the requirement; if a background image ever needs clipping, clip a `::before` layer, not the root. |
| **Contrast over a hero** | Existing `contrastSafe` + the §3.4 transparent ruling. A pill over a photo with shadow suppressed needs its scrolled-state background to clear 4.5:1. |
| **Reduced motion** | The pill has no entrance animation in this scope. If a future "bar morphs into a pill on scroll" variant is proposed, it is a separate gate and must be gated on `prefers-reduced-motion`. |
| **Landmark semantics** | Unchanged — still one `<header>` banner. The one-header-per-request guard is untouched. |

### 3.8 Performance

Zero new JavaScript. `publishHeight` already runs and already reads a rect; §3.2 swaps which
property of that rect it reads. The added CSS is a handful of declarations inside the tier blocks
`render.php` already emits. No new stylesheet, no new module, no measurable budget impact.

### 3.9 Competitor precedent — verified, and flagged where it is not

**Measured in this repo, trustworthy:** `.claude/decisions.md::D418` records a live measurement of
shadcn's "Floating Pill Navbar" — it has **no responsive behaviour at all** and **overflows roughly
45px each side at a 390px viewport**. That measurement is the reason the signed default is
"pill persists, width `min(cap, …)`, safe-area insets" rather than "copy shadcn". It is a
cautionary reference, not an authority.

**Read this week, NOT independently measured** — treat as design-press consensus only, and do not
let it drive a decision on its own:

- shadcn's block catalogue documents the pattern as a rounded-full container with shadow holding
  logo, links and a CTA, and a multi-segment variant that splits branding / links / actions into
  three independently styled segments. ([shadcn.io](https://www.shadcn.io/blocks/navbar-floating-pill), [CodeFronts](https://codefronts.com/navigation/css-responsive-navbar/css-floating-island-multi-segment-navbar/))
- The recurring caution in the 2026 write-ups is that a pill comfortably carries only **4–5 primary
  links** before it needs a dropdown that undermines the look. ([CodeFronts](https://codefronts.com/navigation/css-glassmorphic-navbars/floating-pill-navbar/))
- The a11y floor quoted across these sources is the same one this framework already exceeds:
  44×44px targets and a visible `:focus-visible` on every interactive element. ([UXPin](https://www.uxpin.com/studio/blog/mobile-navigation-examples/), [Design Studio](https://www.designstudiouiux.com/blog/mobile-navigation-ux/))

The 4–5-link caution is worth surfacing to clients as an editor notice, and it is already the same
shape as the existing FR-36-12 informational link-count notice — reuse that, don't build a second.

---

## 4. Ranked decision menu

### Recommendation — Option A: fix the token, then compose the pill from existing controls

Publish the measured bottom edge from `publishHeight` (§3.2); add three attributes (§3.3); add
float as a third precedence entry in the existing tri-state merge (§3.4); fix the hide-on-scroll
travel; clamp dropdowns to the pill box.

**Why this one.** It changes one number in one publisher and adds one entry to one existing writer.
Everything else — radius, shadow, width cap, border — is controls the client already has. The drawer
and mega panel's measured paths need no work because they measure rather than read the token;
their token-reading fallbacks are covered by §3.2 and proved by P11. The regression
proof is strong and cheap: for every header shipping today the published value is unchanged, so
"nothing moved on any existing page" is a measurable assertion, not a hope.

**Cost of being wrong.** Low. The token change is revertible in one line; the float attributes are
additive and default off.

### Option B: add a second token (`--sgs-header-bottom`) and leave `--sgs-header-height` alone

Publish both; migrate consumers one at a time.

**For:** nothing existing changes semantics; migration can be incremental.
**Against:** two overlapping mechanisms where neither can ever be removed, which is the
unfalsifiable-fix shape this project has a written rule against. Seven consumers is not enough
migration work to justify it. **Pick this only if Bean wants the seven consumers migrated on
separate days.**

### Option C: pill mode owns its own geometry, token untouched

Emit the pill's offsets purely inside `sgs/site-header`'s scoped CSS and accept that anchor
scrolling is short by the inset.

**For:** smallest diff.
**Against:** ships a known WCAG 2.4.11 failure on purpose. **Do not choose this.** Listed for
completeness so the option space is visible.

### Option D: defer W2-p behind W2-n

Build the scrolled-state shadow first, then the pill.

**For:** §3.4's transparent-pill ruling depends on a scrolled shadow attribute that does not exist.
**Against:** W2-n is a 30-minute row; the pill can ship with shadow suppression alone and pick up
the scrolled shadow when W2-n lands. **Reasonable if Bean wants the full transparent story in one
go — say so and I will sequence W2-n first.**

---

## 5. Exact files a build would touch

| File | Change |
|---|---|
| `plugins/sgs-blocks/src/header-behaviours/view.js` | `publishHeight` / `initHeightPublisher` — publish `rect.bottom` floored at 0; docblock restated to say "bottom edge". |
| `plugins/sgs-blocks/src/blocks/site-header/block.json` | Declare `headerFloat`, `headerFloatInset`, `headerFloatCollapse`. |
| `plugins/sgs-blocks/src/blocks/site-header/render.php` | Third entry in the `sgs_merge_tri_state_declarations()` call with Float > Sticky > Transparent precedence; per-tier pill rules (width/`margin-inline`/radius/shadow); emit `--sgs-header-float-inset-top` as a custom-property **value**; the collapse-breakpoint `@media` block. |
| `plugins/sgs-blocks/src/blocks/site-header/edit.js` | Mount the float tri-state on the existing `ResponsiveTriStateControl`; inset via `ResponsiveControl`; the collapse toggle. **No new device switcher** (inspector-scan rule 25). |
| `plugins/sgs-blocks/assets/css/header-behaviours.css` | Hide-on-scroll travel `calc( -100% - var( --sgs-header-float-inset-top, 0px ) )`. |
| `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` | Only under menu item 2 (panel width follows the pill) — horizontal clamp basis. |
| `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` | Dropdown horizontal clamp basis (pill box, not viewport). |
| `theme/sgs-theme/assets/css/utilities.css` | Only if §2.4's fallback inconsistency is closed in the same pass. |
| `plugins/sgs-blocks/assets/css/fx-motion-path.css` | Same — the `80px` fallback. |
| `.claude/specs/37-HEADER-FOOTER-BUILDER.md` | New FR for float mode + restate the token's semantic. |
| `.claude/decisions.md`, `.claude/LEDGER.md` | Record the decision; move W2-p. |

**Not touched, deliberately:** `store.js` (already measures the real bottom edge),
`class-sgs-container-wrapper.php` (the header is `containerKind: section` and keeps the wrapper —
this is not a wrapper change), any other block.

---

## 6. Test plan

Every row is a live check on the canary, per rule 5 (verify on the real page, not the emit).

### 6.1 Positive checks

| # | Check | Method | Pass condition |
|---|---|---|---|
| P1 | Published token equals the real bottom edge | Playwright: read `getComputedStyle(document.documentElement).getPropertyValue('--sgs-header-height')` and `header.getBoundingClientRect().bottom` | Equal to within 1px, float on and off |
| P2 | Anchor lands below the pill | Navigate to a `#fragment`, measure the target's `rect.top` | `>= ` pill bottom edge |
| P3 | Keyboard focus not obscured | Tab to the first in-content link, measure its rect | Fully below the pill bottom edge |
| P4 | Pill geometry | Computed `top`, `width`, `border-radius`, `margin-inline` on the header | Matches the authored inset / cap |
| P5 | Pill persists at 390px | Resize to 390, screenshot + measure | Still inset both sides, **no horizontal page scroll** (`scrollWidth === clientWidth`) |
| P6 | Hide-on-scroll fully clears | Scroll down past the trigger, measure `rect.bottom` | `<= 0` |
| P7 | Drawer header anchor | Open a header-anchored drawer, read `--sgs-drawer-header-offset` | Equals the pill's bottom edge |
| P8 | Mega panel does not overflow the viewport bottom | Open the widest panel at 1440 and at 768 | `rect.bottom <= innerHeight` |
| P9 | 200% zoom | Emulate 200% page zoom | Inset still proportionate; no clipped items; no horizontal scroll |
| P10 | axe | `npm run` the existing nav-qa axe harness | Zero **new** violations vs the pre-change baseline |
| P11 | Pre-JS fallback under float | Playwright with JavaScript disabled, then again with JavaScript enabled but before the first menu open: read the computed `--sgs-header-height` on `:root`, the computed `max-height` and `top` of the mega panel wrap and submenu wrap (opened via a forced `display:block`), and the header-anchored drawer's computed `top` and `max-height` (`case 'header'` in `nav-drawer/render.php`, dialog forced open) | Panel `top + max-height <= innerHeight`; the drawer's `top` equals the pill's bottom edge within 1px. A larger difference means the static default must include the inset |

### 6.2 Negative controls (a test with none is vacuous)

| # | Control | What it proves |
|---|---|---|
| N1 | **Revert `publishHeight` to `rect.height` and re-run P1–P3 with float ON** | P2/P3 must FAIL by exactly the inset. If they still pass, the tests are not measuring what they claim. |
| N2 | **Float OFF everywhere, compare the published token byte-for-byte against the pre-change deploy** | Proves the primitive change is a no-op for every existing header. This is the regression test, and it is the reason Option A is safe. |
| N3 | **Set `headerSticky` off, float on, at mobile** | Token must publish `0px` (the `isHeaderPinned` gate still governs). Proves float did not smuggle in an ungated publish. |
| N4 | **Remove the hide-on-scroll travel fix and re-run P6** | `rect.bottom` must be positive and roughly equal to the inset. Proves P6 can fail. |
| N5 | **Deliberately set `overflow:hidden` on the pill and re-run P3 with a focus-ring screenshot** | The ring must visibly clip. Proves §3.7's overflow rule is load-bearing, not folklore. |
| N6 | **Set an inset in bare `px` and re-run P9** | Must fail the zoom check. Proves the `rem` requirement discriminates. |

### 6.3 What does not close the task

Script output alone does not close it. Per R-31-13 this needs **Bean's eye on the real homepage**
at 390 / 768 / 1440 with the pill on, and again with it off. A green harness with a pill that looks
wrong is a failed build.
