# container — visual-diff report (2026-08-08)

```
verdict: PASS
first_paint_capture_passed: true
source_sha: b639a4a9a0d736e3
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

## What is NOT covered by this report

Stated so nobody reads it as broader than it is:

- **Tablet/mobile tiers.** The `@media` overrides were retargeted to `::before` in the same change
  but the probe sets no tier images, so they are unexercised here.
- **Video backgrounds.** The media layer is gated `$has_bg_image && ! $has_bg_video`; the video path
  is unchanged and untested by this probe.
- **`background-attachment: fixed` and parallax** against the new layer.
- **The editor canvas.** Frontend only — the editor is a separate surface no gate here covers.
- **cta-section's four fixed gradients and its hardcoded `primary-dark` scrim**, which the design
  says to delete. Not touched in this change.

## Two traps hit during the build, recorded so they are not repeated

1. **Declarations built where the emitter does not exist.** The CSS was first appended to
   `$responsive_css` at the point the `$bg_*` variables are in scope. Neither `$uid` nor
   `$responsive_css` exists there, and `$responsive_css` is initialised to `''` sixty lines later —
   every emission would have been silently discarded. Correct-looking code that could never fire.
   Now built there, emitted where those variables live, with a comment.
2. **`content:""` is mandatory.** A `::before` without it generates no box, so the whole rule would
   have been inert while reading perfectly in source.
