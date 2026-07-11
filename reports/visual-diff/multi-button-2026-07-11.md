---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/multi-button flex-wrap default nowrap"
block: sgs/multi-button
date: 2026-07-11
wave: "button-wrap fidelity fix (D228 hardcoded-default removal)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/multi-button — flex-wrap default `wrap`→`nowrap` (LANDED)

**Verdict: PASS.** Bean reported the hero buttons stacked at ~800px instead of at the
767/768 tablet breakpoint.

**Root cause (proven live, not inferred).** The draft's hero CTA group
(`.sgs-hero__ctas`) declares NO `flex-wrap` → the CSS-initial `nowrap`: buttons stay in
a ROW (shrinking to fit) down to 768px, then stack (column) below 768. The cloned
`sgs/multi-button` rendered with `flex-wrap: wrap` — the block's hardcoded default
(render.php fallback + block.json), which the converter never overrode (the stored block
carries only `{"gap":"12px","gapMobile":"10px"}`, no `wrap`). Live measurement:

| viewport | multi-button container width | 2 buttons need (151+136+12 gap) | result |
|---|---|---|---|
| 820px | 306px | 299px | fit → row |
| 800px | 296px | 299px | **299 > 296 → wrap (stack)** |

The container is narrow because the hero is a 2-column grid until 767px; the button
column is ~296px in the 768–810 band, so with `wrap` the two ~150px buttons spill onto a
second line. This is the D228 pattern — a hardcoded block default overriding the draft's
faithfully-ABSENT value.

**Fix.** Default `flex-wrap` → `nowrap` (the CSS initial, matching the draft) in
`render.php` (`$wrap`/`$wrap_mobile` fallbacks) + `block.json` (`wrap`/`wrapMobile`
defaults). Universal (all multi-buttons); no carve-out. The page-8 instance re-renders on
next load (render.php is dynamic; `wrap` isn't stored) — no re-clone needed.

## Evidence (live, sandybrown page 8, post deploy + OPcache reset)

Stacking probe (`getBoundingClientRect().top` per child = stacked when on different rows):

| viewport | flex-direction | flex-wrap | stacked | button widths |
|---|---|---|---|---|
| 860 / 820 / 801 / 800 / 790 / 781 / 769 / 768 | row | nowrap | **false** | 151 / 136 |
| 767 / 760 / 700 | column | nowrap | true (intended) | 727 / 720 / 660 (full-width) |

- Buttons now stay side-by-side from desktop down to **768px**; stack (column,
  full-width) at **767px** — matches the draft's `@media (min-width:768px)` row rule and
  the mobile column rule.
- No premature wrap at 800px (the reported defect) — RESOLVED.

## Gates
- `npm run build` green (all prebuild gates incl. dead-controls, hardcoded-render-defaults,
  inline-styling, box-family, cheat-gate 0-new).
- No regression at 375 / 768 / 1440.
