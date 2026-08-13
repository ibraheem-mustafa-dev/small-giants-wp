---
doc_type: report
title: "editor-render-parity fresh triage — 143 findings classified with file:line evidence"
date: 2026-08-13
status: FINDINGS — triage only, REAL-GAP backlog not yet fixed (Phase 2 pending)
method: 3 parallel Explore-agent batches, each reading actual edit.js + render.php + style.css consumption sites (no attribute-name pattern-matching)
governing_tool: plugins/sgs-blocks/scripts/check-editor-render-parity.js (CHECK A)
---

# editor-render-parity fresh triage

Full re-triage of the 143 net-new Check A findings remaining after the cross-file-consumption
baseline (D603). Three background agents, one per ~1/3 of blocks, each classified every finding
into INTERACTION-ONLY / REAL-GAP / OTHER-SHAPE by reading the actual code — not by pattern-matching
attribute names.

## Totals

| Verdict | Count | % |
|---|---|---|
| REAL-GAP | 70 | 49% |
| INTERACTION-ONLY | 50 | 35% |
| OTHER-SHAPE | 23 | 16% |
| **Total** | **143** | |

**Phase 1 stop criterion met.** The instruction was to stop refining once a fresh triage sample
comes back "mostly REAL-GAP rather than mostly a new false-positive shape" — 70/143 is the largest
single bucket, and the other two buckets are legitimate non-bug classifications, not a new
false-positive detector shape needing a 4th structural exemption signal (see OTHER-SHAPE note below
for the one partial exception).

## REAL-GAP (70) — the confirmed backlog, Phase 2's job

Grouped by fix shape (for the Phase 2 auto-generator ROI decision, see D606):

**Mechanical — add an existing/known CSS property to an already-existing preview-style builder
(~50 of 70):**
- `sgs/audio` accentColour
- `sgs/button` lineHeight, letterSpacing, boxShadow, iconGap (dead on BOTH sides — nothing consumes
  the custom property it writes either; recommend deleting after a live-usage check, not wiring up)
- `sgs/decorative-image` overflow
- `sgs/mega-aside` asideBg, asidePadding, asideRadius, asideBorderColour, asideBorderWidth (all 5 —
  one root cause: the block's preview `<div>` has no computed style object at all yet)
- `sgs/modal` maxWidth, modalBackground
- `sgs/nav-drawer` toggleCloseColour
- `sgs/option-picker` pillPadding
- `sgs/quote` attributionFontFamily, attributionTextDecoration, attributionTextTransform (all 3 —
  `buildAttribStyle()` already mirrors every sibling typography property and just omits these 3)
- `sgs/social-icons` iconColour, colourMode, gap
- `sgs/team-member` cardShadow
- `sgs/testimonial` maxWidth
- `sgs/whatsapp-cta` showOnMobile, showOnDesktop
- `sgs/icon` backgroundPadding
- `sgs/hero` imageObjectFit, imageWidthUnit, imageHeight, imageHeightUnit, imageBorderStyle,
  imageBorderWidth, imageBorderColour, mediaKenBurns, splitImageBleed (9)
- `sgs/site-footer-row` + `sgs/site-header-row` alignItems, flexDirection, justifyItems,
  alignContent, gridAutoRows (+ gridTemplateColumns, gridTemplateRows on footer-row only) — 12
  findings, ONE root cause: `previewStyle` hardcodes/ignores these instead of reading the
  attribute, same fix pattern repeated per block

**Needs new preview markup, not just a style tweak (~14 of 70):**
- `sgs/form` submitLabel, submitStyle — no `<button>` element exists in the canvas at all
- `sgs/pricing-table` toggleStyle, billingToggleMonthlyLabel, billingToggleYearlyLabel, ctaStyle,
  ctaColour, ctaBackground — no billing-toggle or CTA-button element exists in the canvas at all
- `sgs/table-of-contents` collapsible, defaultCollapsed — canvas always renders the flat structure;
  needs to switch to `<details>/<summary>` to match render.php
- `sgs/testimonial` reviewDate, sourcePlatform — real visible frontend text with no canvas node
  rendering it at all
- `sgs/text` dropCap, firstLetterColour, firstLetterFontSize, firstLetterFontSizeUnit,
  firstLetterFontWeight — needs a scoped `::first-letter` style block generated in JS

**Genuine bugs, not gaps (~6 of 70):**
- `sgs/heading` inheritStyle — OPPOSITE-direction desync: render.php suppresses
  background/border/shadow when `inheritStyle` is true; `buildWrapperStyle()` in edit.js always
  applies them regardless. This is a real behavioural bug, not just a missing preview.
- `sgs/hero` contentBandPadding — the frontend "band" element this padding targets
  (`.{uid}__inner`, from `SGS_Container_Wrapper`) has no editor-canvas counterpart at all.
- `sgs/trust-bar` columns — badge grid's real column count never reflected; canvas falls back to
  flex-wrap.

## INTERACTION-ONLY (50) — no fix needed, correctly non-visual

Dominant shapes: pure scroll/click/hover-driven behaviour with no static resting-state difference
(physics-canvas ×3, image-sequence fx* ×4, decorative-image pathDraw* ×4, timeline reveal* ×2,
trust-bar autoScroll/autoScrollSpeed, hero mediaParallax, post-grid *ColourHover ×3, modal
overlay* ×2, table-of-contents scrollOffset/activeLinkColour); genuinely non-visual technical/a11y
fields (button linkTarget/rel/download/ariaLabel, form honeypot/successRedirect,
form-field-file allowedTypes, icon linkTarget, tabs blockLabel, icon-list renderLandmark); and
attributes whose consumer computes a per-visitor/session-dependent runtime value with no fixed
static value (countdown-timer evergreenMinutes, counter duration, accordion defaultOpen — the
`open` attribute is set by view.js on load, never statically in render.php).

## OTHER-SHAPE (23) — a real, structural, recurring pattern; candidate for a Signal 4

**21 of the 23 fall into exactly TWO shapes, both "editor-canvas cannot have the real data, so the
block deliberately renders a static placeholder instead":**
- `sgs/buybox` (6 attrs: soldOutLabel, unavailableLabel, notifyEnabled, notifyMeLabel,
  addToCartLabel, perUnitDenomination) — needs a live WooCommerce product/variation context that
  doesn't exist in the block editor; edit.js explicitly documents this and renders a static
  "Buybox" placeholder instead of attempting a misleading preview.
- `sgs/google-reviews` (15 attrs: columns, minRating, textOnly, excludeKeywords, sortBy,
  showAggregate, showBreakdown, showAvatar, showDate, showGoogleLogo, reviewRequestUrl, cardStyle,
  starColour, showDots, showArrows) — reviews are fetched live from the Google API inside
  render.php at render time; the editor shows a static "Configure Google API settings" placeholder
  instead.

**Recommendation (feeds D606):** these 21 are structurally identical to Signal 1/2/3's own shape —
a genuine, recurring, non-bug pattern worth its own detector exemption signal (Signal 4:
"live-external-data placeholder branch"), the same way Signal 3 already recognises sgs/media's
video no-preview `<Notice>` branch. Not built this session (see D606) — flagged as the next
refinement candidate if/when this detector gets revisited, rather than something to hand-triage
again on every future survey run.

**1 finding is a genuinely different one-off shape:** `sgs/mega-panel` viewAllPlacement — the
markup it positions is injected by a cross-block WP filter hook (`sgs_mega_panel_footer_html`)
owned by a DIFFERENT block (`sgs/nav-menu`), so the content to position doesn't exist in
mega-panel's own standalone editor context. Not a recurring shape (n=1) — not worth a signal.

## Phase 2 auto-generator ROI (D606)

~50 of the 70 REAL-GAP findings are the exact same mechanical shape — add one already-known CSS
property (already correctly identified by the triage's file:line evidence) to an existing
preview-style-builder object. That is a real, common, generator-friendly pattern.

**Not built.** The other ~20/70 need actual new markup or structural changes a generator cannot
safely produce (a missing `<button>`, switching to `<details>/<summary>`, a scoped
`::first-letter` block, a genuine behavioural-bug fix). Building, testing, and trusting a code
generator for one non-recurring backlog of 70 known, file:line-precise findings is slower than
directly fixing them — the triage agents already did the expensive part (finding the exact
consumption site and the exact missing line). A generator would pay off on a SECOND detector of
this shape finding a comparable backlog on a different codebase; it does not pay off on a
one-time 70-item backlog already this well-specified.
