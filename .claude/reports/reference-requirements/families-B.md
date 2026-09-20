---
doc_type: report
project: small-giants-wp
title: Reference capability families — group B (dropdown, mega panel, trigger and close)
plan_row: W3B-4
date: 2026-09-21
data: families-B.json
---

# Capability families — group B

Source: `digests/digest-B-panels-trigger.md` (13 references x 3 surfaces x 3 tiers), the per-reference
`.md` summaries, each JSON's `headed_recheck` (headed values trusted over headless), `CAPTURE-PROTOCOL.md`
and `HEADED-SPOTCHECK.md`. SGS coverage is checked against the live DB and the shipped files, never assumed;
every row's `how_checked` is in the JSON.

**25 families.** Coverage: 9 covered, 12 partial, 2 gap, 2 conflict.

Reference set (13): studionamma, buck, dogstudio, fantasy, lamalama, lusion, wearecollins, resn, away,
butcherbox, rabbit, halcyon, indus-foods. The last two are Bean's own Claude Design drafts, where the SOURCE
states the intended behaviour and the RENDER omits some of it; both are recorded separately in `F-B-15`.
Away's reference is the UK storefront (`away.json::headed_recheck`). resn's header is shell-less fixed
controls, so its trigger rows are `present` by what a visitor sees, not by an element.

| Family | Needed by | SGS coverage | Note |
|---|---|---|---|
| `F-B-01` Panel ownership per bar item | 6 of 13 | **covered** | Dropdown, mega, both, inline-in-pill, or none — 7 of 13 references have no panel at all. |
| `F-B-02` Panel width rule | 6 of 13 | **covered** | Shipped default `min(1120px, calc(100vw - 56px))` is byte-for-byte the rule derived from both drafts. |
| `F-B-03` Panel horizontal anchor | 6 of 13 | **partial** | Every anchor is reachable, but by choosing dropdown-vs-mega, not by an anchor control. |
| `F-B-04` Panel top offset (gap below the header) | 5 of 13 | **partial** | submenuTopOffset covers the dropdown fork; the mega fork's gap has no attribute. |
| `F-B-05` Panel ground (fill, blur, radius, border, shadow) | 6 of 13 | **partial** | bgBlur is a boolean emitting one fixed blur, and the mega panel's shadow is hardcoded. |
| `F-B-06` Panel scrim (viewport dimmer behind an open panel) | 5 of 13 | **gap** | The panel disclosure ships with no backdrop at all; 4 of 5 measured panels have one, 2 use it to close. |
| `F-B-07` Panel content shape (columns / cards / minimal list / logo grid) | 6 of 13 | **covered** | mega-panel style ['columns','cards','minimal'] matches halcyon's three presets exactly. |
| `F-B-08` Panel side rail / secondary block | 3 of 13 | **partial** | asideFormat feature|preview|cta maps one-to-one; away's image-callout ROW has no expression. |
| `F-B-09` Hover-reactive preview rail | 1 of 13 | **covered** | asideFormat='preview' is literally this behaviour, restoring the authored default on leave. |
| `F-B-10` Pointer-following light inside the panel | 1 of 13 | **covered** | fxEffect='cursor-field' plus the always-on .sgs-mega-aside spotlight. |
| `F-B-11` Panel link hover treatment | 3 of 13 | **partial** | Tint/underline/colour covered; the card lift is a hardcoded translateY(-3px), so indus's -6px cannot clone. |
| `F-B-12` Panel link ornament | 3 of 13 | **partial** | Icon hosts covered; index numbers (01..05) have no counter, attribute or CSS rule anywhere. |
| `F-B-13` Panel open trigger mode (hover/focus vs click) | 5 of 13 | **partial** | Hover-or-focus is the shipped default; there is no attribute to make a desktop panel click-only. |
| `F-B-14` Open intent delay and close grace | 3 of 13 | **partial** | submenuCloseGrace is wired to the dropdown fork only — the mega fork hardcodes 170 and ignores it. |
| `F-B-15` Panel open/close motion | 4 of 13 | **partial** | fade and slide-down plus staggerOnOpen; the drafts' translate+scale entry has no enum value. |
| `F-B-16` Panel dismissal and focus semantics | 4 of 13 | **conflict** | SGS closes on Escape/outside-click unconditionally; away and lamalama measurably do not. |
| `F-B-17` Trigger presence per tier and the collapse breakpoint | 13 of 13 | **covered** | collapsePoint is a plain number, so 940 and 960 are ordinary values. |
| `F-B-18` Trigger form | 13 of 13 | **covered** | triggerMode icon|text|icon-and-text plus triggerIcon covers every measured form. |
| `F-B-19` Close-control model | 13 of 13 | **covered** | closeStyle's four values plus anchor='header' + modality='non-modal' cover all three models. |
| `F-B-20` Close-control placement relative to the burger | 6 of 13 | **partial** | closeSize covers the size difference; the close control's POSITION has no attribute. |
| `F-B-21` Trigger-to-close transition motion | 12 of 13 | **partial** | burger-morph and text-swap exist; no duration, easing or morph-shape control. |
| `F-B-22` Trigger semantics, accessible name and open state | 11 of 13 | **conflict** | SGS always emits a real button with aria-expanded; 9 of 13 references omit it. |
| `F-B-23` Trigger and close target size | 13 of 13 | **covered** | burgerSize and closeSize default to 44px; 10 of 13 references fail that floor. |
| `F-B-24` Trigger persistence on scroll | 1 of 13 | **gap** | Nothing keeps a control alive after its header scrolls away, or changes its form when it does. |
| `F-B-25` Menu dismissal routes and background scroll while open | 13 of 13 | **partial** | Escape, outside-click and scroll lock ship unconditionally; close-on-scroll, hotkey and history-back do not exist. |

## Disagreements and surprises

1. **The panel scrim is the one clean gap (`F-B-06`).** Four of the five references whose open panel was
   measured paint a full-viewport dimmer behind it, and two of those (halcyon, indus-foods) use it as the
   click-to-close target. `mega-disclosure.js` states in its own header comment that the mega is a positioned
   disclosure with "no scroll-lock, no focus trap, no backdrop". The only scrim in the nav system belongs to
   `sgs/nav-drawer`. Nothing about this is a styling preference — two references' dismissal behaviour depends
   on an element that does not exist.

2. **`submenuCloseGrace` is wired to the dropdown fork and ignored by the mega fork (`F-B-14`).**
   `includes/nav-menu-markup.php` builds the mega interactivity context with a literal `'closeGrace' => 170`
   while the dropdown branch a hundred lines below passes `$submenu['close_grace']`. The attribute exists, has
   an editor control, is read in `render.php`, and does nothing on a mega panel. Both drafts measure
   173-188ms against a declared 170ms, so the default happens to be right and the defect is invisible until
   an operator moves the slider. This is a one-line fix and a genuine "green gate, broken feature" case.

3. **SGS is more accessible than almost every reference, and that is a fidelity conflict, not a win to hide
   (`F-B-16`, `F-B-22`).** Nine of thirteen triggers carry no `aria-expanded`; two are unfocusable `<div>`s;
   buck's button has no accessible name at all; wearecollins' `aria-controls="menu"` points at an id no
   element has. away measurably does NOT close a focus-opened panel on Escape, and Enter on a trigger follows
   its href instead of toggling. SGS cannot emit any of that, and should not. Clone acceptance for these two
   rows has to be "deliberate divergence, recorded", or Bean's eye will read a correct clone as wrong.

4. **The two drafts are not a reference for motion, only for intent (`F-B-15`).** Both declare a 340ms panel
   entry (opacity + `translateY(-8px)` + `scale(.99)`) and a 460ms staggered child reveal; both render with
   zero animations and the panel opaque on its first frame, because the runtime calls
   `componentDidUpdate(prevProps)` with one argument and the draft reads a second. Cloning the RENDER would
   ship a motionless panel; cloning the SOURCE needs an entry shape `submenuAnimation` (none/fade/slide-down)
   does not have.

5. **halcyon is close to a specification of the shipped block.** `mega-panel::style` is validated against
   exactly `['columns','cards','minimal']`; `maxWidth` defaults to `1120px`; the shipped wrap width is
   `min(1120px, calc(100vw - 56px))`, which is the width rule derived independently from the draft's boundary
   measurements; `bgBlur` emits exactly `saturate(1.5) blur(24px)`, halcyon's measured value; the cards hover
   lift is a hardcoded `translateY(-3px)`, halcyon's measured value. The cost shows up on the OTHER draft:
   indus-foods lifts `-6px` and blurs not at all, and neither is reachable.

6. **buck separates header behaviour from trigger behaviour, and nothing else does (`F-B-24`).** Its header
   scrolls away while the burger detaches into a fixed round chip with its own z-index (9100 over the
   header's 1400) and its own threshold (300-360px at 1440, 180-240px at 768). Every SGS scroll behaviour
   acts on the header or a header row. One reference in thirteen, but it is the kind of thing a "sticky
   header" family would silently swallow.

7. **lamalama's panel is not a panel and its rules still hold.** The opened pill IS the panel: width 343px at
   375 and 438px at 768/1440, growing 160px downward, with no separate ground. Per Bean's rule, a pill header's
   panel takes the pill's left edge and width — which is exactly the `--sgs-mm-panel-width` /
   `--sgs-mm-panel-top` override `repositionPanel` writes when the header measures as inset from both viewport
   edges. The shipped comment reaches the same conclusion from the same evidence: "follow the header" is the
   single rule that reproduces all of them.

8. **Two references put the close control somewhere the burger never was.** butcherbox hides the burger
   (left 16) and shows a close control at the far right (left 335) of the same header row; resn at 375 paints
   a 26x26 close button ON TOP of its 18x18 menu button, which drops to opacity 0 underneath. `closeStyle`
   knows the kind of control but not where it goes (`F-B-20`).

9. **resn at 768 and 375 cannot be closed by pointer at all.** A full-viewport canvas at z-index 1005 sits
   over the fixed controls; the headed re-check reproduced it on a desktop pointer, leaving only Escape and
   history back. It is recorded as the reference's real behaviour, not a capture failure.

## Cells I could not cluster and why

- **`trigger_close.magnet` on the trigger.** Every reference that was probed reads `none` / `not detected`,
  and four (buck, dogstudio, studionamma, and the close controls of both drafts) read `not probed`. There is
  no positive value to cluster, so no family. SGS has `triggerMagnetEnabled` / `triggerMagnetRadius` /
  `triggerMagnetStrength` with nothing in group B asking for them. The label magnets that WERE measured
  (halcyon 0.160, indus-foods 0.140) act on BAR ITEMS, which is group A's surface.

- **butcherbox and rabbit at 768.** Three rows each (`dropdown`, `mega`, `trigger-close`) are
  `present | NOT CAPTURED`; the emulated pass covered 375 and 1440 only. Their 768 values are absent from
  every family rather than guessed.

- **rabbit's open dropdown.** The panel was measured closed (visibility hidden, opacity 0, 142px, radius 10,
  shadow-lg, orange) and never opened from synthetic pointer events, so its scrim, motion, close grace, item
  states and hover treatment are recorded as absent-because-unmeasured in `F-B-06`, `F-B-11`, `F-B-14` and
  `F-B-15` rather than as absent-because-the-site-lacks-them.

- **butcherbox's dropdown dismissal.** `not_measured` records that close grace, Escape and outside click were
  never tested, so it contributes only its open mode (click) to `F-B-13`, not a dismissal value to `F-B-16`.

- **`item_typography` on the panels.** Every panel reference carries a full type block (family, size, weight,
  letter-spacing, transform, line-height, colour, per role). It is a real column, but it is the same
  typography capability the bar and the drawer rows carry, so clustering it here would split one mechanism
  across three groups. It belongs in a cross-group typography family, not a group-B one — flagged for
  whoever merges A, B and C.

- **`content` and `tier_delta` cells.** `content` is per-reference copy (link text, panel labels, whether it
  is CMS-managed or a fixed array literal) and clusters into no capability; `tier_delta` is the
  cross-tier delta of the other columns rather than a capability of its own, and its one load-bearing value
  (the panel disappears below the breakpoint and its links reappear in the drawer accordion) is carried by
  `F-B-17` and by group C's drawer rows.

- **resn's canvas-drawn menu items.** The three menu labels are per-item 2D canvases with a sibling-dissolve
  on hover, and at 375 the DOM holds no text at all. `resn.md`'s own tier verdict says no built Spec 38 effect
  matches and the nearest (FR-38-11 ScrambleText, Tier G) is a different look. That is a drawer-row effect
  (group C) and a Bean decision on the 12-vs-13 roster, not a group-B capability.
