---
doc_type: report
project: small-giants-wp
title: Capability families — group A (header shell, bar, footer)
plan_row: W3B-4
date: 2026-09-21
data: families-A.json
---

# Capability families — group A: header shell, bar, footer

25 families clustered from `digests/digest-A-header-bar-footer.md` across 13 references
(studionamma · buck · dogstudio · fantasy · lamalama · lusion · wearecollins · resn · away ·
butcherbox · rabbit · halcyon · indus-foods). Typed values, per-family `needed_by` rows and the
`how_checked` command behind every coverage status live in `families-A.json`.

**"Needed by N of 13"** counts the references that have a measured value the capability must
reproduce. A reference whose value is *none* (no blur, no magnet, no adaptive ink) is not counted;
it is listed in that family's `absent_in`. `absent` is a real value and clusters as its own value,
never a forced fill.

**Coverage:** covered 6 · partial 14 · gap 4 · conflict 1.

| Family | Needed by | SGS coverage | Note |
|---|---|---|---|
| F-A-01 Header pin mode on scroll | 13 of 13 | covered | `site-header::headerSticky` + `headerHideOnScroll` are per-tier tri-states, so dogstudio's hide/reveal and wearecollins' iOS-only 375 case both land. |
| F-A-02 Header shell archetype and width | 13 of 13 | partial | The floating pill is fully built (`headerFloat` + `headerFloatInset` + `headerFloatCollapse`); resn's shell-less header has no expression because `sgs/site-header` always emits a `<header>`. |
| F-A-03 Surface ground: fill, border, shadow | 12 of 13 | partial | Fills, alphas, gradients, borders, shadows all covered; fantasy's masked gradient fade and buck's per-page-load random fill are not. |
| F-A-04 Backdrop blur behind a see-through surface | 3 of 13 | partial | `site-header::backdropBlur` reaches lamalama's `blur(4px)` exactly; it is a length only, so halcyon's companion `saturate(1.4)` is lost. |
| F-A-05 Section-adaptive ink | 5 of 13 | **gap** | Nothing in the tree reads the section behind the header. `contrastSafe` is a WCAG scrim advisory, not a colour flip; `mix-blend-mode` exists only on the background overlay panel. |
| F-A-06 Scroll-state restyle (rest vs scrolled) | 4 of 13 | partial | `headerTransparent` + `backgroundColourScrolled`/`textColourScrolled`/`shadowScrolled` cover it; fantasy keys on scroll *direction*, which `headerTransparentDirection` (a position toggle) cannot express. |
| F-A-07 Per-tier row tracks and rail alignment | 12 of 13 | covered | One mechanism, identical on `site-header-row` and `site-footer-row`; `gridTemplateColumns` takes away's explicit 371.7/602.6/371.7 tracks, and the footer row's `intrinsicColumns` matches away's reflow-only footer. |
| F-A-08 Stacked header rows | 3 of 13 | partial | Multiple rows with their own slot, paint and hide-on-scroll are covered; studionamma's second strip pinned to the *bottom* of the viewport is not. |
| F-A-09 Rotating or randomised header message | 3 of 13 | **gap** | `sgs/notice-banner` holds one static string with one colour set — no slides, no per-slide colour pair, no arrows, no timer, no random source, no clock. |
| F-A-10 Utility control roster in the bar | 9 of 13 | partial | Cart (with count badge) and CTA buttons covered; search exists but declares no `headerEssential`; wishlist, account, store/country selector, theme toggle and a site-wide sound mute have no block. |
| F-A-11 Bar collapse breakpoint and mechanism | 9 of 13 | covered | `nav-bar-menu::collapsePoint` is a free number, so halcyon's 940 and indus's 960 land exactly. **768 is a mobile tier for both drafts.** |
| F-A-12 Nav item hover paint | 7 of 13 | partial | `itemBgHoverTreatment: 'highlight'` IS the sliding pill (FR-41-25); tint, colour swap, weight bump and underline all covered. Opacity fade (buck) and the two-copy label roll (studionamma) are not. |
| F-A-13 Sibling dim on hover | 1 of 13 | **gap** | Every hover attribute repaints the hovered element. Nothing repaints its *siblings*. Recurs in group C (wearecollins drawer, resn canvas dissolve) — judge it across groups. |
| F-A-14 Pointer-tracking label magnet | 2 of 13 | partial | `itemMagnetEnabled` is a boolean with no strength, while the *trigger* has both radius and strength: halcyon's 0.16 and indus's 0.14 collapse to one constant. Add `itemMagnetStrength`. |
| F-A-15 Item type scaling mode | 13 of 13 | partial | Fixed and stepped are covered by the per-tier `itemFontSize` object. No attribute expresses a formula, so buck's `1.49vw` with a 20px floor, fantasy's root-rem scale and lusion's container-em scale all freeze into three numbers and drift between tiers. |
| F-A-16 Caret ornament on panel-owning items | 4 of 13 | covered | `submenuCaret` already applies only to items that own a submenu, which is the halcyon/indus rule exactly; away's caret-less aria-only marking is the boolean off. |
| F-A-17 Current-page indicator | 0 of 13 | covered | The one family where SGS is *ahead*: six current-state attributes, and no reference in group A uses any of them. All default to empty, so nothing leaks into a clone. |
| F-A-18 Menu trigger form and placement | 13 of 13 | partial | `triggerMode` (icon / text / icon-and-text) with its own icon, label and paint covers burger, pill and bare word. lamalama's whole-bar-is-the-trigger is not expressible; a detached trigger belongs to F-A-19. |
| F-A-19 Detached fixed controls outside the header box | 5 of 13 | **gap** | No attribute pins a header child to a viewport edge. The only position attributes in the whole DB are on `sgs/decorative-image`. This decides whether resn is clonable as a header at all. |
| F-A-20 Surface entrance animation | 6 of 13 | partial | The footer has it (`fxFooterStagger`, reusing the FR-38-7 scrub runtime unmodified). The header does not: `site-header` declares `hideExtensions: ['fx']`, and its row's `fx*` attributes are background fields, not entrances. |
| F-A-21 Header stacking order | 12 of 13 | **conflict** | `render.php` hardcodes `z-index: 100` in all three declaration branches and `style.css` repeats it; there is no attribute. Eleven distinct values were measured, 9 to 10000 plus `auto`. |
| F-A-22 Footer archetype | 9 of 13 have a footer | covered | Sitemap, location blocks, information footer, CTA sign-off and multi-column are all rows of blocks; `minHeight` reaches wearecollins' one-viewport footer. halcyon, indus-foods and resn have *no* footer — a measured value. |
| F-A-23 Footer ground and background media | 8 of 13 | partial | Transparent, solid, gradient, per-tier background video and a tinted overlay all covered — studionamma's 6 looping muted videos and fantasy's white-panel-over-black-90% both land. buck's per-page-load random fill does not. |
| F-A-24 Footer secondary block roster | 8 of 13 | partial | Socials, newsletter and every legal/address/credit line are covered by `social-icons` + `business-info::displayType` + `form`. **Four blocks do not exist: live local-time clock, language switch, country/store selector, back-to-top.** Widest build gap in group A. |
| F-A-25 Logo rendering substrate and per-tier swap | 13 of 13 | partial | Per-tier mark, switch point, sizes, home link and stroke-draw (FR-38-15, owned by the block) all land. buck's animated Lottie and lamalama's live 2D canvas mark can only be reproduced as stills. |

## Motion, mapped to Spec 38

Almost everything in group A is Tier V: hide-on-scroll headers, transparent-to-solid restyles, hover
paint, the sliding pill, the label magnet, caret rotation and burger-to-X morphs are all class
toggles with CSS transitions, inside Tier V by FR-38-1 but named by **no FR**. Three named FRs are
actually in play: **FR-38-7** (scrub) already drives `fxFooterStagger`, **FR-38-5** governs the
entrance-versus-scrub choice a surface has to make, and **FR-38-15** (DrawSVG) is declared
`providesNatively` on `sgs/responsive-logo`. **FR-38-10** (SplitText) is the nearest named effect for
lamalama's GSAP message reveal. Nothing in group A needs Tier G, H or W: the one WebGL surface (resn's
page-wide gem scene) is a page background, not a header, and resn's own teardown already records it as
passing no Tier W test. Two effects have no tier at all and are **new-effect decisions, not gaps to
close by attribute**: a Lottie-player logo and a live 2D-canvas mark (buck, lamalama).

## Disagreements and surprises

1. **The DB is stale against `block.json` for `sgs/site-header`.** `block_attributes` has no row for
   `headerFloat`, `headerFloatInset`, `headerFloatCollapse`, `backdropBlur`, `shadowScrolled` or
   `shadowScrolledColour`, all of which exist and are rendered. Anyone grading header coverage from
   `/sgs-db` alone would call the floating pill and the backdrop blur gaps — they are built. Every
   status here was taken from `block.json` and `render.php`; the DB reads are recorded as the
   secondary source. `/sgs-update` should be re-run before Wave 3C uses the DB for this block.
2. **The z-index conflict is the one status that is worse than a gap.** A hardcoded `100` is not
   neutral: it is 10× wearecollins' 9 and 1/100th of studionamma's 10000, so a clone of either
   changes which page elements pass over the header. By the project's own rule a hardcoded wrapper
   default that overrides faithfully-transferred CSS is a cheat to remove or gate, not a blocker.
3. **The two drafts' `768` rows are mobile, not tablet.** halcyon collapses at 940 and indus-foods at
   960 (both breakpoint-verified at ±1px). Reading their 768 cells as a tablet tier would invent a
   tablet layout neither design has.
4. **`aria-current` is everywhere and a visible current-page mark is nowhere.** Zero of thirteen
   references mark the current page visually, yet `sgs/nav-bar-menu` carries six current-state
   attributes. The risk here is the inverse of a gap — a non-empty default would add a mark the draft
   never had. All six default to empty, so the risk is closed.
5. **Bean's own drafts are the only references whose intent and render disagree**, and they disagree
   on three separate things: sticky (declared, does not stick — proven cause is an ancestor
   `overflow-x:hidden`), entry animations (declared 340/460/420ms, run zero times — a
   `componentDidUpdate` arity bug), and Escape (never closes the mobile overlay). Both are recorded
   twice in `families-A.json`, tagged `intent` and `render`. **What SGS should clone is the intent.**
6. **buck's footer colour is chosen per page load, not per tier.** Three colours in one run looks like
   a responsive value and is not. A clone freezes whichever colour the capture saw. The attribute is
   right; its *supply* is the gap.
7. **The widest build gap is ordinary commercial furniture, not art-direction.** A live clock, a
   language switch, a country selector and a back-to-top button account for four missing blocks across
   six references. The exotic effects (canvas logos, sibling dim, section-adaptive ink) are fewer.
8. **resn is present, not absent.** It has no `<header>`, `<nav>` or `<footer>` element and is still
   the reference that most needs F-A-19: its entire header is four independently pinned controls.
   Whether F-A-19 gets built decides whether resn can be the 13th clone as a *header* at all — a
   separate question from the Tier W motion verdict the teardown already gave.
9. **Away's reference is the UK storefront.** The captured JSON is the US storefront the headless run
   received; a headed Chrome is served UK (GBP, `/en-gb`, first two nav items swapped, no consent
   banner). Structure is identical, so no family changes — but 5 of the 12 differing static cells are
   storefront copy and must not be cloned from the JSON verbatim.
10. **Headed timings replaced headless ones wherever they conflicted.** lamalama's committed pill
    opacity of 0 was a pre-intro reading (full opacity at ~7.7 s), lusion's 40 s control arrival was a
    software-rendering artefact (~6.1 s headed), and studionamma's preloader figure held exactly
    (0 of 36 static cells differed). F-A-20 uses the headed values.

## Cells I could not cluster and why

- **`content` cells (every reference, every surface).** Nav labels, announcement copy, office
  addresses, legal lines. These are the *content* a clone carries, not a capability a block attribute
  expresses. The one part of `content` that IS a capability — copy that changes by itself — is
  clustered as F-A-09.
- **`tier_delta` cells.** Every one is a restatement of another cell measured at two tiers. They were
  read as evidence for F-A-02, F-A-07, F-A-11 and F-A-15 rather than clustered as a family of their
  own; a "things change between tiers" family would have no single mechanism behind it.
- **butcherbox and rabbit at 768 (all surfaces), and rabbit's footer at every tier.** Never captured —
  the emulated-viewport pass covered 375 and 1440 only. Their absence from a `needed_by` list is a
  capture gap, not a measured `absent`, and is flagged as such in the JSON's `conventions`.
- **All footer `motion` cells and most footer `item_states` cells.** In `not_measured` for away, buck,
  dogstudio, fantasy, lamalama, lusion, studionamma and wearecollins — hover was never driven and no
  reveal was sampled. F-A-20 therefore rests on class names (`appear-fade-up`, `grow-appear`) and not
  on values. Re-measuring footer hover and reveal is the cheapest way to raise confidence in F-A-13
  and F-A-20.
- **Away's announcement transition timing** (all three tiers) and **buck's Lottie logo animation over
  time.** Both are the *only* motion evidence their families would have had; F-A-09 and F-A-25 are
  therefore scored on structure, not on duration or easing.
- **fantasy's `is-light` header variant.** Never observed: every sampled scroll offset (0, 400, 900,
  1800, 3500, 6000, 10000, 13500) was over a dark section. The light-ground half of its
  section-adaptive ink is source-only, which is why F-A-05 records fantasy from source rather than
  from a measured colour pair.
- **resn's per-item canvas dissolve numbers** (hovered canvas holds 1411/1259/1650 lit pixels, sd 0–6,
  while the others lose 40–98%). Measured, real, and a drawer cell — it belongs to group C. It is
  named in F-A-13 only as evidence that sibling dim is a cross-group mechanism, not a one-site quirk.
