---
doc_type: design
title: "Background panel — native colour/gradient, four tabs, and the section-kind gate"
status: SHIPPED 2026-08-11 — D1/D2/D3/D4/D5/D6 all built; live-verification pending on D4/D6 (deploy blocked by an unrelated Track 1b migration issue at session close). D579-D582. The universal-extension follow-up (Track A/B, colour/gradient census + gate) is CLOSED — see `go-track-1b-playful-hamster.md` Phase 4 "Background, part 2".
date: 2026-08-11
scope: SHARED WRAPPER (ContainerWrapperControls / BackgroundPanel) — container, cta-section, hero, trust-bar
---

# Background panel redesign

> ## ⭐ STATUS 2026-08-11 (session close) — read before acting on anything below
>
> **Shipped and live-verified on the canary (page 1486):**
> - **D1** — swatch+popover, boxed like native (`Card`/`CardBody`), sitting above the tabs. DONE.
> - **D2** — "Anim" tab rename, 4-tab strip fits. DONE.
> - **D3** — native `GradientPicker` kept as originally built; the palette-per-stop question is
>   CLOSED, not deferred — Bean ruled a bespoke stop editor "not worth the time" once shown the
>   real cost (no WP extension point exists for it). Documented as an accepted trade-off, not a
>   gap to revisit.
> - **D5** — both opacity controls fully removed (control + attr + render, all 6 blocks + shared
>   wrapper + hero's private copy + editor CSS/JS). DONE.
>
> **Built this session, deploy pending (blocked by an UNRELATED Track 1b migration issue on
> post 2270 — `contentBandPadding`, nothing to do with this doc — retry the deploy once that
> clears; do not re-investigate it, it isn't this track's bug):**
> - **D4 (parallax)** — BUILT (D585). Real bug, not a design gap: `bgParallax` was fully wired
>   everywhere except the one CSS declaration that turns it on. Fixed in THREE places
>   independently (shared wrapper's image case, shared wrapper's NEW video case, hero's own
>   private image+NEW video case) — see D585 for the exact mechanism (image uses
>   `background-attachment:fixed`; video/real-`<img>` use `position:fixed`, since
>   `background-attachment` is a no-op on either).
> - **D6 (section-kind gate)** — REMOVED (D585). Bean overruled the "background is section-only"
>   architecture directly. Background/overlay/parallax/ken-burns/SVG-background now read
>   universally in the shared wrapper; a layout/content-kind block only gets a working background
>   if it separately declares the attrs in its own block.json (safe by construction — WP drops
>   undeclared attrs). Shape dividers (same file, separate section-only feature) deliberately left
>   untouched — out of scope.
> - **Settings/Styles duplication** (found by Bean live-testing, not originally scoped in this
>   doc) — hero had THREE redundant media-selection panels on the Settings tab duplicating what
>   the Styles-tab Background panel already provides for the same attributes. Removed; kept only
>   the Split variant's own unique media family.
>
> **Found and fixed along the way (not originally scoped here, but blocking — see D579-D582 in
> `decisions.md` for full detail):**
> 1. Hero's own overlay never read the gradient attributes at all — the real root cause of "the
>    gradient controls don't work". Render-side bug, unrelated to this panel's UI shape.
> 2. A shared-wrapper CSS rule collapsed hero's/cta-section's own overlay span to 0×0 — the
>    control could be 100% correct and still be invisible.
> 3. **Native `supports.color` background/gradients was REMOVED from hero/container/cta-section/
>    trust-bar** (D581) — it was competing with this control for the same visual property with no
>    defined precedence, and (found live, by Bean) was silently winning. This is a NEW decision
>    beyond the original design — the original doc never anticipated the native panel was still
>    live and would conflict; it assumed native was either equivalent-and-redundant or already
>    inert. Neither was true: it was active AND conflicting.
>
> **Superseded finding:** the capability-routing doctrine's Part 9 "hero's overlay reaches 2 of 2
> known-good paths" framing undercounted the real defect — see `spec-35-capability-routing-doctrine.md`'s
> own status update for the corrected number (0 of 15 for the UNRELATED `image-controls.php`
> mechanism; this doc's hero overlay is a separate mechanism entirely, now fixed).
>
> ### ✅ CLOSED 2026-08-11 (same day, later session) — "background as universal extension" question
>
> Was a fresh-session prompt for later exploration; answered same day instead. Worked through
> `/brainstorming` design mode against `spec-35-capability-routing-doctrine.md` Parts 1-2. Full
> record, including the live census, the two false-positive corrections, Bean's Track B scope
> ruling, and the two shipped artefacts (the `gradients:true` completion fix + the
> `survey-background-colour-support.py` census/gate): **`go-track-1b-playful-hamster.md` Phase 4,
> "Background, part 2"** — that is now the canonical record, not this doc.
>
> One-line answer: NOT a new `render_block` auto-injection mechanism. Colour/gradient for
> single-element blocks was already mechanism (a) native WP support, already live on ~40 blocks —
> the only real work was completing a 17-block gap and building the effect-verification gate. The
> full image/video/overlay/parallax panel (mechanism (c)) stays scoped to blocks with a real
> content box; census found no blocks that both need it and lack it after Bean's scope ruling on
> `notice-banner`/`product-faq-item`.

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

## The diagnosis for (1) — ⛔ THE LEADING HYPOTHESIS IS **REFUTED**. Start elsewhere.

> ### ⛔ REFUTED 2026-08-11 — Bean confirmed the block was **HERO**
>
> `sgs/hero` is **`container_kind = section`** (DB-authoritative: `block_composition`), and
> `$is_section = 'section' === $kind` (`class-sgs-container-wrapper.php:120`). So for hero
> `$is_section` is **TRUE** — the overlay emit gate at `:1149` passes, and the attributes are **NOT**
> zeroed (the `:294-299` zeroing is the layout/content branch, which hero never takes).
>
> **The section-kind theory below cannot explain hero. Do not spend time on it.** It is kept only
> because it remains a real, separate defect for layout/content-kind blocks — a control rendering
> where its mechanism cannot apply — which is still worth fixing under D6, just not the cause here.
>
> ### Revised candidates, cheapest first
>
> 1. ⭐ **The canary was in flux between two sessions' deploys.** My verification deploy rolled the
>    schema back (D576); the concurrent session then redeployed to fix it. If Bean tested inside that
>    window, WordPress may have been discarding attributes before any block code ran — which presents
>    exactly as "the control does nothing". **Rule this out FIRST: redeploy a known-good state and
>    retest.** It costs one deploy and would explain the symptom completely.
> 2. **The control writes but the value never reaches the wrapper** — trace hero's attrs into
>    `SGS_Container_Wrapper::render()`. Hero passes a curated attr set, not blindly.
> 3. **The value is written in a shape the wrapper does not read** — check what `parseLinearGradient`
>    stores versus what `:275-278` reads.
> 4. **The gate's other half** — `! $opt_no_overlay` (`:1149`). Does hero pass `no_overlay` in its
>    helper opts? It sets `wrap_inner=false` for split; check whether it disables the overlay too.
>
> **Method:** trace it LIVE in the editor and on the page — write a value, read the stored attribute,
> then check the emitted CSS. Do not infer from source. Three defects today were invisible to source
> reading and to a green build.

⛔ **Original hypothesis, retained for the layout/content case only:**

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

## Open questions — RESOLVED (2026-08-11 session close)

1. ✅ **Which block/config produced "none of the gradient controls work"?** Hero, and it wasn't a
   config issue — hero's render.php never read the gradient attrs at all (D579), plus a CSS
   specificity collision independently collapsed the overlay span to 0×0 (D580), plus a live
   conflict with native `supports.color` (D581). All three fixed.
2. ✅ **Can the native gradient picker offer theme palette colours per stop?** No — confirmed
   against Gutenberg source, no extension point exists. Bean ruled this "not worth the time";
   native `GradientPicker` kept as-is (D582/D3).
3. ⛔ **Still OPEN — why are overlay attrs zeroed for layout/content kinds?** (D6.) Not touched
   this session. A prior investigation (this doc's earlier revision) found: the markup slot exists
   for every `container_kind`, but layout/content composites never DECLARE the overlay attrs in
   their own `block.json` (Spec 31's "KIND gates which attrs exist as a destination" is deliberate
   architecture, not a bug). Fixing this needs a design decision (add the attrs to those blocks'
   block.json + lift the two PHP gates together) — still needs Bean's call before building.
4. ✅ **How many live rows carry non-default `backgroundMediaOpacity`?** 2 pages (internal QA
   probes only, no client content) — both migrated during the D5 removal (D582).
