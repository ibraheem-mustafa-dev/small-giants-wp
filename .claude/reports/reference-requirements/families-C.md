---
doc_type: report
project: small-giants-wp
plan_unit: W3B-4
surface_group: C (drawer)
generated: 2026-09-21
---

# Capability families — group C (drawer)

24 families across 13 references (studionamma, buck, dogstudio, fantasy, lamalama, lusion,
wearecollins, resn, away, butcherbox, rabbit, halcyon, indus-foods). Typed values, `needed_by`
with the digest cell, `absent_in` and a checked `sgs_coverage` for each live in
[`families-C.json`](families-C.json). This file is the readable summary.

**Coverage tally:** 9 covered · 11 partial · 3 gap · 1 conflict.

**Counting note.** Five references have no drawer at 1440 (away, butcherbox, rabbit, halcyon,
indus-foods) — that absence is a value in F-C-01, not a hole. butcherbox and rabbit have a
`present` 768 row with no cells (`not_measured`), so they count for presence only and are
excluded from every value-bearing family at that tier. halcyon's 6 variants and indus-foods'
2 variants record `variant_effect: none` on every drawer cell except the ground fill and label
colour, so a variant is named once per family rather than per cell.

| Family | Name | Needed by | SGS coverage | Note |
|---|---|---|---|---|
| F-C-01 | Drawer presence per tier | 13 of 13 | covered | `nav-bar-menu::collapsePoint` + `showBurger`; 5 references have no drawer at 1440 at all. |
| F-C-02 | Panel anchor archetype | 13 of 13 | partial | 4 anchors shipped (full-screen / header / trigger / centred); no **side drawer** (away @768: 390×900 flush left over the header). |
| F-C-03 | Panel width cap | 3 of 13 | covered | `nav-drawer::panelSize`, per tier; two shipped patterns already carry 438px and 310px. |
| F-C-04 | Panel corner radius | 2 of 13 | covered | `nav-drawer::borderRadius`, per tier — covers lusion's 7.5px→10px step. |
| F-C-05 | Panel ground: fill, opacity, blur | 13 of 13 | covered | `drawerBg` + `drawerBgGradient` + `surfaceOpacity` + `surfaceBlur`; lamalama's 0.6 fill + blur(4px) maps exactly. |
| F-C-06 | Scrim behind the drawer | 4 of 13 | **gap** | Colour, alpha and blur are hardcoded `rgba(0,0,0,0.55)` in `style.css`, and all 4 references change their scrim per tier. |
| F-C-07 | Background visual layer | 5 of 13 | partial | `backgroundImage` on `::before` covers dogstudio's image layer; per-link thumbnail (studionamma) and per-link glyph (buck) have no attribute. |
| F-C-08 | Per-item ornament on primary rows | 7 of 13 | partial | Expand caret covered; decorative leading glyph (buck, lamalama) and CSS index counter (dogstudio @1440 only) are not. |
| F-C-09 | Row separators | 3 of 13 | partial | Reachable via the object-typed `itemBorderWidth`; the drawer menu has no separator quintet where the **bar** menu does. |
| F-C-10 | Item typography + scaling mode | 13 of 13 | partial | Per-tier `itemFontSize` covers stepped ladders; **fluid vw** (buck 3.5vw), **height-driven** steps (dogstudio) and a per-tier line-height are not expressible. |
| F-C-11 | List layout: columns, alignment, pitch | 12 of 13 | partial | `listColumns` (per tier) + `itemTextAlign` + `drawerAlign` cover most; `nav-drawer-menu::gap` is a scalar string so lusion's per-tier row pitch can't land, and buck's "right of centre, 45%" is a fourth alignment. |
| F-C-12 | Item hover treatment | 8 of 13 | partial | 14 hover-state attributes cover self-hover; **sibling dim** (wearecollins) cannot be expressed by a hover state at all. |
| F-C-13 | Current-page indicator | 2 of 13 | covered | 6 `current`-state attributes; 9 references explicitly show no marker. |
| F-C-14 | Submenu model in the drawer | 5 of 13 | **conflict** | `<details name>` is exclusive by construction — single-open always. away @768 measured **two panels open at once**, which the built default actively prevents, with no opt-out. |
| F-C-15 | Secondary block roster | 11 of 13 | covered | The drawer body is open InnerBlocks; the 7 shipped starters already compose CTA / social / contact / copyright. Per-tier show/hide of one secondary block belongs to the child block. |
| F-C-16 | Close-control model | 13 of 13 | covered | Both halves ship: the header burger morphs to an X in place (`nav-bar-menu/style.css` `[aria-expanded="true"]` rules) **and** `closeStyle` gives separate-x / text-swap / burger-morph / icon-and-text. |
| F-C-17 | Header chrome persistence | 13 of 13 | covered | `modality:'non-modal'` keeps the header live; the `header` anchor uses a **measured** header bottom, not the static token. |
| F-C-18 | Close routes | 11 of 13 | partial | Escape always closes (native `<dialog>`) while **7 of 11** measured references do not; close-on-scroll, close-on-link-click and close-on-history-back have no attribute. |
| F-C-19 | Modality: scroll lock, focus trap, semantics | 13 of 13 | partial | Scroll lock and focus trap are unconditional; **6 references deliberately let the page scroll** and 6 let Tab leave. SGS is more accessible than the references here — close it by deciding the rule, not by loosening the default. |
| F-C-20 | Internal scrolling of drawer content | 4 of 13 | covered | Every anchor emits a viewport-bounded `max-height`, so the body scrolls the overflow. |
| F-C-21 | Entry / exit motion archetype | 13 of 13 | partial | Only 4 animations, each **bound to an anchor**: `animateFrom` has two values (`auto`/`fade`). Slide-from-edge, slide-up, clip-path wipe, curtain sweep and per-card stagger are unreachable, and there is no duration or easing attribute (measured spread 150ms → ~2.0s). |
| F-C-22 | Item entry stagger | 6 of 13 | **gap** | `grep -rn 'stagger'` over both blocks returns zero. 4 references stagger, 2 more intend to (both Claude Design drafts: 420ms, delay i×55ms). |
| F-C-23 | Tier-delta role migration | 10 of 13 | partial | The menu's own bar→accordion degrade is covered; migrating a **non-menu** header block (CTA, search, help link, store selector) into the drawer has no mechanism but hand-duplication. |
| F-C-24 | Open-state survival across resize | 10 of 13 | **gap** | Three measured behaviours (stays open and reflows / closes / flag persists but surface is hidden) and SGS has one unstated one. Nothing listens for a resize across `collapsePoint`. |

## Disagreements and surprises

1. **Nobody uses a scrim div.** The 2026-07-28 `DIFF-ANALYSIS.md` found 0 of 8 sites using a
   separate backdrop element, and the fresh 13-reference capture agrees: 9 have no scrim at all
   because an opaque panel already covers everything. SGS's own `render.php` reached the same
   conclusion independently — `$sgs_nd_needs_scrim` emits the scrim **only** for a partial-width
   anchor. The surprise is what the 4 scrim-bearing references do with it: away's is fully
   **transparent** (`#000000 @0`) and exists purely as a click target, and lamalama's is
   `pointer-events: none` so the "outside click" actually lands on the page and a window
   listener closes the drawer. A scrim is not one thing.

2. **Escape is the minority behaviour.** 7 of the 11 references where it was tested do **not**
   close on Escape (studionamma, buck, lamalama, lusion, resn @375, halcyon, indus-foods). SGS's
   native `<dialog>` always does. This is SGS being right and the references being wrong, but it
   is still not faithful transfer, and F-C-18 records it as a gap rather than quietly passing.

3. **Scroll lock and focus trap do not travel together, and neither tracks "modal".** away is the
   only reference in the set with a real focus trap, and it is also the only one declaring
   `role=dialog aria-modal=true` **and** returning focus to the toggle on close. fantasy declares
   the same ARIA and has neither a trap nor a lock. studionamma sets `body{overflow:hidden}` and
   the page **still scrolls at 1440** because Lenis bypasses it — a lock that reads as applied in
   the DOM and does nothing to the visitor.

4. **buck repaints its drawer per page load.** The ground fill is picked from a brand palette on
   each load, not per tier: this run gave `#196efa` / `#f4c054` / `#508054` at 1440 / 768 / 375,
   while the 2026-07-28 record saw `#7f4c1e` and `#00513c`. Anyone diffing buck's drawer colour
   between two runs will see a "regression" that is the site working as designed.

5. **dogstudio's link size is driven by viewport HEIGHT as well as width.** `1440×900` renders
   60px; `1440×713` renders 45px; `1440×1100` goes back to 60px. Every SGS responsive tier is a
   width media query, so this one is not expressible at all — and it would be invisible to any
   capture that only varies width.

6. **The two Claude Design drafts intend three things their runtime never does.** Source and
   render are recorded separately throughout. **Intent:** items stagger in `translateX(24px) → 0`
   over 420ms with `delay i*55ms`, `cubic-bezier(.16,.84,.32,1)`, `fill: backwards`
   (halcyon `animateMobile()` L236–241, indus L310–315). **Render:** `animations_seen: 0`,
   first-item opacity never below 1, with a console `TypeError: Cannot read properties of
   undefined (reading 'active')` — a `componentDidUpdate` signature mismatch, the same one that
   kills the desktop panel entry. **Escape:** the source registers a global keydown handler
   (halcyon L211–212, indus L286) but it calls `closeAll()`, which clears only the **desktop**
   `active` state and never `mobileOpen`, so the overlay measurably does not close
   (`escape: {overlayOpenAfter: true}`). **Scroll lock:** the render lets the page behind scroll
   400px on wheel — and the source carries no lock code either, so that one is a gap in the
   draft, not only a render omission.

7. **The one real conflict is single-open accordions.** `<details name>` is exclusive by
   construction: opening one row closes its siblings, with no attribute to turn that off. Three of
   the four accordion references want exactly that (lamalama, halcyon, indus-foods) — but away
   @768 measured two panels open simultaneously at 669.5px and 1229.9px. The built default does
   not merely lack the option; it actively prevents the measured behaviour.

8. **Away changes archetype between 375 and 768.** At 375 it is a full-width panel starting at the
   header bottom with a fully transparent scrim and the toggle still visible as the close. At 768
   it is a 390px side drawer at `top: 0` **over** the header, with a 50%-black scrim and no visible
   close control at all. Two different families' values, from one reference, one breakpoint apart —
   which is why F-C-02 is keyed per tier rather than per reference.

9. **Two references replace the trigger somewhere else entirely.** The set is dominated by
   replace-in-place (8 of 13), but butcherbox hides the left-hand burger and puts the close at the
   **right** end of the header (`[16,56,24,24]` → `[335,60,24,16]`), and lamalama's burger morphs
   to a **single horizontal bar**, not an X — the three bars translate onto the middle one. SGS's
   `burger-morph` keyframe is hardcoded to the X pose.

10. **wearecollins duplicates its tertiary links in the DOM** (desktop-only and mobile-only
    classes, 12 `linkBtn` elements at every tier, one set `display:none`) rather than reflowing
    one set. It is also the only reference whose drawer carries a full **copy of the header bar**
    at the identical rect.

## Cells I could not cluster and why

Recorded verbatim in `families-C.json::unclustered`; summarised here.

- **`drawer/content` (all 13).** Link labels, promo headlines and social-item names are the site's
  own copy, not a capability. A family keyed on them would be keyed on prose. The one typed thing
  in those cells — `caseOrigin`, i.e. whether upper-casing comes from the source text or from CSS
  `text-transform` — is clustered into F-C-10.
- **`drawer/ground.fillNote` (buck).** Randomised per-page-load palette selection. Content
  behaviour, not a styling capability; clustering it would invent a "random fill" family that one
  reference needs and no block attribute should have.
- **z-index (8 distinct values, 1 → 10000).** No design meaning — each is that site's own stacking
  context. SGS puts the drawer in the native `<dialog>` top layer, which makes the number
  irrelevant rather than unmatched. Noted so the spread is not mistaken for a gap.
- **Overlay overshoot rects** (fantasy `+100px` top and bottom; wearecollins `bottom: -639` in the
  2026-07-28 record). An implementation artefact of how those sites size their overlay: the inner
  panel is exactly the viewport in both cases, and that is what a visitor sees.
- **resn `item_typography` @375.** The labels are drawn into canvases (108×47, 92×47, 146×47) with
  no DOM text at that tier, so there is no size, weight or colour to cluster. 768 and 1440 keep a
  hidden DOM copy at opacity 0 and those values *are* in F-C-10. A canvas-only label is something
  SGS must not reproduce (it deletes real text), so it is a Bean trim/exclude decision under the
  W4-c termination rule, not a family.
- **butcherbox and rabbit `drawer | 768` (every column).** Both carry a `present` row with no cells
  and an explicit `not_measured` reason ("the 768 tier was not captured for this reference; the
  emulated viewport pass covered 375 and 1440 only"). Presence is honest, so those rows feed
  F-C-01; every other family excludes them at 768 rather than inferring from 375.
- **resn `mechanics.hoverBlocker` / `clickTargets`.** A `pointer-events: none` hover-blocker under
  the items, plus a z-index 1005 canvas that intercepts real pointer input at 768 and 375
  (reproduced headed on a desktop pointer; iPad and iPhone user agents work by touch). A defect in
  the reference, not a capability. It is cited inside F-C-12 and F-C-18 as the reason those cells
  read as they do.
- **away storefront divergence.** The headed session is served the **UK** storefront (GBP,
  `/en-gb`, first two nav items swapped, no consent banner) while the JSON describes the US
  storefront the headless run received — 12 of 55 static cells differ, 7 from the 15px classic
  scrollbar alone. Structure is identical, so the families use the values as captured, but *which
  storefront is the reference* is an open decision (the file's own `follow_up`: "decide which
  storefront is the reference before Wave 4") and cannot be clustered.

## What the digest could not answer

- **butcherbox and rabbit at 768** — never captured. Both are "present" and nothing more.
- **butcherbox and rabbit mechanics** — Escape, focus handling, the Gifts row expansion and the r1
  submenu were all untested.
- **away multi-open at 375** — the second accordion toggle sat below the open panel and the click
  missed; multi-open is proven at 768 only.
- **away hover** — not measured at either tier.
- **lusion open/close durations from the headless run** — software WebGL rendered about one frame a
  second and the end pose was never reached within 7s. The headed spot-check resolved it
  (cards +87–147ms, settled by +500ms; close settled by +748ms).
- **dogstudio motion durations** — the page is WebGL-heavy and each `evaluate` took 0.4–1s, so
  1830/2045/2793ms are **upper bounds**, not measurements.
- **resn motion easing and duration** — the visible animation happens inside canvases; the headed
  re-check recovered wall-clock timings (mount +11ms, canvases build over ~1.3s, close removal
  +482–508ms) but no easing.
- **studionamma link stagger at 768** — measured at 375 and 1440 only.
- **studionamma close-on-link-click** — not tested (swup page transitions).
