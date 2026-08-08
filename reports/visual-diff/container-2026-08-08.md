# container — visual-diff report (2026-08-08)

```
verdict: PASS
first_paint_capture_passed: true
source_sha: dbf27b3c3bba4507
```

**Block:** `sgs/container` (and every composite rendering through `SGS_Container_Wrapper`)
**Date:** 2026-08-08
**Change:** Phase 1 background capability — flat colour ungated, `backgroundMediaOpacity` added,
background image moved to a `.{uid}::before` media layer.
**Target:** sandybrown canary via
`build-deploy.py --target sandybrown --blocks-only --payload plugins/sgs-blocks`
(payload-scoped dirty gate; never `--allow-dirty`). Post-deploy verify: HTTP 200, markers present.

---

## Why this is a visual change (i.e. why it needed this report)

The background image previously painted as a `background-image` on `.{uid}` itself. It now paints on
`.{uid}::before`. That is a genuine change to how the section renders, so the gate demanding evidence
was correct — this is not a markup-neutral or metadata-only edit.

## Probe

Page 2188, `/phase-1-background-probe-2026-08-08/`, created via the REST API with the canary app
password. Three containers, identical apart from the variable under test:

| # | Case | Purpose |
|---|---|---|
| 1 | media at **100%**, no colour layer | **CONTROL** — same image, opacity untouched |
| 2 | media at **35%** + colour layer at 40% | the new capability |
| 3 | **flat colour, no media at all** | the case that rendered NOTHING before today |

Case 1 exists so case 2 is an A/B against a like-for-like baseline rather than an assertion.

## Live evidence — emitted CSS, read from the lifted stylesheet

Read from `uploads/sgs-css/sgs-1231-*.css`, **not** from the page HTML: SGS block CSS is lifted into
`uploads/sgs-css/`, so grepping the page proves nothing either way.

```css
.sgs-container-edf99978::before{content:"";position:absolute;inset:0;z-index:-1;
  pointer-events:none;background-image:url(.../cookies-stacked-1.jpeg);
  background-size:cover;background-position:center center;
  background-repeat:no-repeat;opacity:0.35}

.sgs-container-19946625 .sgs-container__overlay{background-color:#B23A48;opacity:1}
```

The second rule is the flat-colour container with **no image**. Before this change the overlay was
gated on `$has_any_bg && $has_overlay_colour`, so it emitted nothing at all.

## Live evidence — computed styles at first paint (Playwright, 1440×900)

| uid | media layer image | media opacity | z-index | overlay colour | overlay opacity | text renders |
|---|---|---|---|---|---|---|
| `91a33041` (control) | yes | `1` | `-1` | — | — | yes |
| `fde157f0` (35% + colour) | yes | `0.35` | `-1` | `rgb(11,61,81)` | `0.4` | yes |
| `32410bc4` (flat, no media) | no | `1` | `auto` | `rgb(178,58,72)` | `1` | yes |

**The load-bearing row is the last column.** Text renders at full strength in all three, including
the 35% case — which is the whole point of the layer. Had the opacity still been applied to the
element, the text would have faded with the image. The control row proves the 0.35 is doing
something: same image, same block, only the attribute differs.

Screenshot: `reports/visual-diff/phase1-background-probe-1440-2026-08-08.png` (full page, 1440).

## Edge surfaces — VERIFIED, not deferred

The first draft of this report listed these as "not covered". Bean pushed back: the change
RETARGETED the responsive tier rules and moved the paint site, so these are surfaces this change
touches, not inherited gaps. They were then measured. Probe page 2190
(`/phase-1-edge-probe/`), Playwright at 1440 / 768 / 375, asserting on measured `window.innerWidth`.

| Case | 1440 | 768 | 375 | Verdict |
|---|---|---|---|---|
| A — tier swap (3 distinct images) | cookies-stacked | cookies-on-bun | aesthetic-pic | PASS — the `::before` retarget swaps correctly per tier |
| B — `background-attachment: fixed` @ 60% | fixed, 0.6 | fixed, 0.6 | fixed, 0.6 | PASS — survives on the layer |
| C — video background + colour layer | no `::before` image, `<video>` present | same | same | PASS — video correctly excluded from the media layer; overlay coexists |
| D — parallax (`bgParallax`) @ 80% | image, 0.8 | image, 0.8 | image, 0.8 | PASS for the LAYER only — see limit below |
| E — tier image + 40% opacity | stacked @ 0.4 | — | aesthetic @ 0.4 | PASS — **the tier override does NOT reset opacity** |

**Case E is the one that mattered.** The `@media` tier rules set only image/size/position. Had they
also reset `opacity`, mobile would have silently lost its dimming while desktop kept it. Testing
tiers and opacity separately would BOTH have passed while the combination was broken.

## EDITOR CANVAS — a real gap this change created, now fixed

`edit.js` painted the background on the ELEMENT via an inline style, so `backgroundMediaOpacity` was
invisible in the editor: a client could set 35%, see no change, and get a dimmed image on the
published page. The editor is the surface clients actually work in, so this was a defect, not a
footnote.

Fixed by mirroring the frontend — media handed to a `::before` layer through custom properties,
gated on `.sgs-container--has-bg-media` so no other container in the canvas gains a pseudo-element.

Measured in the real editor (Playwright, logged in as `Claude` on the canary, post 2188):

| container | has media class | `::before` image | `::before` opacity | image on element |
|---|---|---|---|---|
| control (100%) | yes | cookies-stacked-1.jpeg | `1` | **no** |
| media 35% + colour | yes | cookies-stacked-1.jpeg | **`0.35`** | **no** |
| flat colour, no media | no | none | `1` | no |

Editor and frontend now agree. Screenshot:
`reports/visual-diff/phase1-editor-canvas-2026-08-08.png`.

## Remaining limits, stated precisely

- **Parallax MOTION is unverified.** Case D proves the media layer renders correctly with
  `bgParallax` set; it does NOT prove the parallax effect still animates. An effect that engages is
  not an effect that works.
- **cta-section's four fixed gradients and its hardcoded `primary-dark` scrim** — the design says to
  delete them. Not touched here.
- **Ken Burns** against the new layer.

## Probe-content defects found (mine, not the framework's)

Three D338 instances in my own probe markup, each silently discarded by WordPress with no error:
`content` vs `text` on `sgs/text`; `text` vs `content` on `sgs/heading`; `backgroundMedia` (a
cta-section attribute) vs `bgVideo` on `sgs/container`. A fourth was structural: `containerKind` is
not a declared attribute, which the deploy's `oldshape-audit` caught as 11 NEW HIGH findings before
anything could be stranded. And the probe's hand-written `<div class="wp-block-sgs-container">`
wrapper made every container INVALID in the editor — `save()` emits only `<InnerBlocks.Content />`,
no wrapper. **That last one qualifies the "dynamic blocks cannot be corrupted" premise: a
slot-bearing composite DOES store markup (its children), and hand-written markup can invalidate it.**

## Two traps hit during the build, recorded so they are not repeated

1. **Declarations built where the emitter does not exist.** The CSS was first appended to
   `$responsive_css` at the point the `$bg_*` variables are in scope. Neither `$uid` nor
   `$responsive_css` exists there, and `$responsive_css` is initialised to `''` sixty lines later —
   every emission would have been silently discarded. Correct-looking code that could never fire.
   Now built there, emitted where those variables live, with a comment.
2. **`content:""` is mandatory.** A `::before` without it generates no box, so the whole rule would
   have been inert while reading perfectly in source.
