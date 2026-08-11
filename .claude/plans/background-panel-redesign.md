---
doc_type: design
title: "Background panel — native colour/gradient, four tabs, and the section-kind gate"
status: DESIGNED — Bean-approved 2026-08-11 at the design gate. NOT BUILT.
date: 2026-08-11
scope: SHARED WRAPPER (ContainerWrapperControls / BackgroundPanel) — container, cta-section, hero, trust-bar
---

# Background panel redesign

## Context — what Bean found, testing the canary

Trying to use the gradient controls after the Phase 4 Item 5 deploy:

1. **"None of the gradient controls work."**
2. **The tab strip overflows offscreen** — `Image | Video | Animation | Overlay | SVG` does not fit
   the sidebar (screenshotted; the strip is cut mid-word).
3. **Colour/gradient is in the wrong primitive.** It sits as a tab alongside Image / Video /
   Animation / SVG, which says "pick one of these five." That is false: an overlay colour sits **on
   top of** a background image. It is **additive and independent**, not an alternative. The tab strip
   is carrying an item that does not belong in it — which is also *why* it overflows.
4. **"Why can't we copy the native control?"** WP's own colour UI is a simple swatch strip in the
   sidebar that opens to a Colour | Gradient popover. Familiar, compact, far less custom code.
5. **Global/theme colours cannot be picked for gradient stops.** ⚠ Bean's words: *"I should be able
   to pick global colours on the gradient colour picker but I can't."*
6. **Parallax must connect to the background image AND video when set.**
7. **The two opacity controls are redundant** — the colour picker's own alpha covers the overlay.
8. **This belongs in the SHARED WRAPPER, not just hero.**

---

## The diagnosis for (1) — STRONG HYPOTHESIS, not yet proven

⛔ **Do not write this up as the cause until the block identity is confirmed.**

`class-sgs-container-wrapper.php`:
- `:294-299` — for **layout/content**-kind blocks the overlay attributes are **zeroed outright**
  (`$overlay_gradient = false; $overlay_gradient_from = ''; …`).
- `:1149` — the overlay emit is gated `if ( $is_section && ! $opt_no_overlay )`.

So the Overlay tab renders its controls for every block that mounts `BackgroundPanel`
(container, cta-section, hero, trust-bar — all four both declare the attrs and render the panel,
verified), but **the CSS is only produced when the block is section-kind**. On a layout- or
content-kind block the client sets a gradient, the value saves, and nothing renders.

**This is the same defect class as `imageControls`** — a control surfaced where its mechanism does
not apply. Third instance found on 2026-08-11 (after `imageControls` and the FX route-box).

**Outstanding fact needed:** which block/configuration was being edited. If it was section-kind, this
hypothesis is wrong and the cause is elsewhere — most likely in the control→attribute→render chain,
which must then be traced live in the editor rather than read.

⚠ **Ruled out already:** the `GradientOverlayControl` `attrNames` refactor (same day) is **not** the
cause — reads and writes both use computed keys consistently and `DEFAULT_ATTR_NAMES` reproduces the
original names exactly. Verified by reading the component end to end.

---

## The design (Bean-approved at the gate)

### D1 — Colour/gradient leaves the tab strip

Becomes a **top-level row** in the Background panel, above the tabs, using **WP's native colour +
gradient dropdown** (the `PanelColorGradientSettings` / `ColorGradientSettingsDropdown` family) —
the swatch-strip-opens-popover pattern Bean screenshotted.

Rationale beyond aesthetics: it makes the additive relationship **visually true** — the colour sits
above, the media source below — and it is doctrine mechanism **(a) native**, which today's
capability-routing work established as the default.

### D2 — Four tabs, renamed to fit

`Image | Video | Anim | SVG`. "Animation" → **"Anim"** (Bean's instruction) so the strip fits without
horizontal overflow. Removing Overlay is what creates the room; the rename is the safety margin.

### D3 — ⚠ Global colours in the gradient picker — VERIFY BEFORE BUILDING

Bean requires theme/global colours to be selectable for **gradient stops**.

⛔ **This is the one requirement I cannot promise from the native control without checking.** WP's
native gradient UI surfaces theme **gradient presets** (from `theme.json` `settings.color.gradients`);
whether the *custom* gradient picker's per-stop colour picker exposes the theme **palette** depends
on how the component is mounted and what settings it receives. **Verify first:**
- what `useMultipleOriginColorsAndGradients()` supplies to the popover,
- whether per-stop colour selection reaches the palette or only a freeform picker,
- and whether the canary's `theme.json` actually defines gradient presets.

If native cannot do per-stop palette selection, that is a **genuine trade-off to put back to Bean**,
not something to silently ship half of.

### D4 — Parallax connects to background image AND video

`bgParallax` is **already declared on 11 blocks** and already has a control in the shared
`ContainerWrapperControls.js` — so this is "make it reachable and correct", not "build it".
Establish what it currently binds to, and wire it so it applies whenever a background image **or**
video is set. Place it on the Image/Video tab area, not as a separate concern.

### D5 — ⛔ Removing the two opacity controls — CAPABILITY DELETION, CENSUS FIRST

Bean's reasoning: the colour picker's alpha already gives overlay opacity, so
`backgroundOverlayOpacity` and `backgroundMediaOpacity` are redundant.

**Agreed for `backgroundOverlayOpacity`** — alpha genuinely replaces it.

⚠ **`backgroundMediaOpacity` is NOT the same control.** Its own help text: *"Dims the image or video
itself, without dimming the content on top of it."* A semi-transparent overlay **tints** as well as
dims; media opacity dims **without** tinting. Close, not identical. Removing it removes a capability
that a black-at-30% overlay only approximates.

**Protocol before either is removed (D270 — `deprecated.js` is banned):**
1. **Census the live canary** for stored non-default values of both attributes, via WP-CLI against
   `post_content`. ⛔ **Not yet run.** `audit-post-content-blocks.py` audits stored *files*, not the
   live DB — this needs its own query.
2. If rows exist, migrate them (an overlay opacity folds into the colour's alpha; a media opacity has
   no lossless target — surface the count to Bean and decide).
3. Remove control **and** attribute **and** render path in the same commit — no dangling attrs.
4. `backgroundOverlayOpacity` currently drives real CSS (`opacity:%s` in the wrapper's overlay
   branch). Removing the control but keeping the attribute would leave existing values **frozen and
   uneditable** — the exact "declared but unreachable" shape this project keeps finding.

### D6 — Fix the section-kind gate (Bean chose this over hiding the control)

Make the overlay work for layout/content kinds too, rather than hiding the control where it cannot
apply. That means revisiting the `:294-299` zeroing and the `:1149` `$is_section` gate.

⚠ **High blast radius** — the zeroing exists for a reason that must be established before it is
removed (likely: layout/content kinds have no `__overlay` element to paint into). **Find that reason
first.** If the overlay genuinely has nowhere to render on those kinds, the honest fix is the other
branch — hide the control — and that is a decision to put back to Bean, not to take silently.

---

## Verification (per today's repeated lesson)

- **Live editor, every change.** Register → render the control → write a value → assert the stored
  shape → confirm it renders on the front end. Not source reading. Three regressions today were
  invisible to source reading and to a green build.
- **Test the UNSET/default state**, not only with values set — the `text-align` regression was
  invisible whenever the attribute was set.
- **Positive control** — a gradient that visibly renders — before any PASS is claimed.
- Per-block visual-diff reports bound to `source_sha`.

## Open questions

1. Which block/config produced "none of the gradient controls work"? (Decides D-diagnosis.)
2. Can the native gradient picker offer theme palette colours per stop? (D3.)
3. Why are overlay attrs zeroed for layout/content kinds? (D6 — the reason gates the fix shape.)
4. How many live rows carry non-default `backgroundMediaOpacity`? (D5.)
