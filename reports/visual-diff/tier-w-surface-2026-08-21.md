# Visual diff — Tier W surface treatments (first Tier W effect)

**Date:** 2026-08-21 · **Branch:** `feat/tier-w-surface-treatments`
**Commits:** `af2d7cdf` (build) · `481e6e55` (duotone ramp) · `2ad5d439` (colour fallback)
**Canary:** https://sandybrown-nightingale-600381.hostingersite.com/tier-w-surface-canary/ (page 2591)
**Spec:** 38 §1.2b (Tier W) · D479

> **Written BEFORE the commit that claims it** (STOP-67).

---

## What is on the page

Four `sgs/team-member` instances carrying the **same source photograph**
(`/wp-content/uploads/2026/08/cookies-stacked-1.jpeg`, attachment 2150), so any visible
difference is attributable to the treatment and nothing else.

| Instance | Treatment | `data-sgs-webgl-active` | Asset |
|---|---|---|---|
| A | `grain` | `1` | `assets/tier-w-A-grain.png` |
| B | `halftone` | `1` | `assets/tier-w-B-halftone.png` |
| C | `duotone` | `1` | `assets/tier-w-C-duotone.png` |
| D | *(none — control)* | absent | `assets/tier-w-D-control.png` |

Full page: `assets/tier-w-surface-desktop-full.png` (1440w) ·
mobile: `assets/tier-w-surface-mobile.png` (375×812).

---

## Bean's eye — what to look at (R-31-13)

R-31-13 is co-authoritative: the numbers below do not close this on their own.

- **B (halftone)** is the strongest result — a genuine editorial dot-screen. This is the
  register's *"makes stock photography look art-directed"* claim, rendered.
- **A (grain)** is deliberately subtle at the default `uIntensity` 0.08 — film grain plus a
  slight contrast lift. Judge whether the default should be stronger out of the box.
- **C (duotone)** now maps navy shadow → cream highlight. **Compare against the two earlier
  captures in this session's history if you want to see why it changed** — it was muddy
  brown until two defects were fixed (below).
- **D (control)** must look exactly like an ordinary photo. If it does not, the effect is
  leaking onto untreated blocks.

---

## Measured results

### Probe — `scripts/motion-qa/probe-tier-w-surface.mjs`

**VERDICT: PASS — 19/19 assertions held, 1 SKIPPED (not counted as a pass).**

| Arm | Result | Evidence |
|---|---|---|
| 1a canvas + liveness flag | PASS | A: `hasCanvas=true`, flag `1` |
| 1a negative control | PASS | D: neither canvas nor flag |
| 1b discriminator stability | PASS | two shots of the same canvas byte-identical (659,504 B) |
| 1b canvas is a real image | PASS | 659,504 B (floor 1,000) |
| 2 treated ≠ untreated | PASS | A 659,504 B vs D 11,991 B, not byte-identical |
| 3 no-WebGL fail-open | PASS | no canvas, `<img>` visible, flag absent |
| 3 positive control | PASS | same instance DOES set the flag with WebGL on |
| 4 no-JS fail-open | PASS | 0 canvases, `<img>` visible |
| 4 positive control | PASS | canvas present when JS runs |
| 5 mobile 375×812 | PASS | visible element 327×267.2 — never a blank box |
| 6 reduced motion paints | PASS | canvas + flag both present under `reduce` |
| 6 reduced motion identical | PASS | normal vs reduce byte-identical (659,504 B both) |
| 7 GPU disposal via hook | **SKIPPED** | `__gpuObjectCount()` is a bare ES-module export; nothing attaches it to `window`, so it is unreachable from a live page. Reported as SKIPPED, never PASS. |
| 7 fallback — DOM cleanup | PASS | canvas count 3 → 2 on element removal |
| 7 fallback — no GL warnings | PASS | none observed on teardown |

**Every absence arm carries a positive control**, so a silent no-op cannot read as a pass.

### Byte budget

| Figure | Value |
|---|---|
| `fx-surface-treatment.js` gzip | **4,325 bytes** |
| D479 Tier W page allowance | 122,880 bytes |
| Allowance used | **3.5%** |
| Headroom | 118,555 bytes |

Recorded in `scripts/motion-bundle-baseline.json`; enforced by
`check-motion-bundle-budget.py --page-budget tier_w`, whose `--self-test` proves that mode
can fail.

### Panel-roster containment (the D459 measurement, repeated)

| Configuration | Roster | Offered | Verdict |
|---|---|---|---|
| `creates_panel=0` **(shipped)** | 32 blocks (unchanged) | 15 image-bearing blocks | containment held |
| `creates_panel=1` (measured, rejected) | 39 blocks (+7) | 22 | 5 of the 7 new panel hosts were `form-field-tiles`, `option-picker`, `social-icons`, `star-rating`, `card-grid` — a form field acquiring a scroll-scrub panel, which is exactly the failure D459 exists to prevent |

---

## Defects found by LOOKING, after every automated signal was green

Recorded because the pattern matters more than the fixes.

**1. Duotone rendered muddy brown, not a duotone.** Canvas present, liveness flag set,
build green, deploy verified — four green signals. The image was wrong.
*Cause (proven live, not inferred):* `resolveColourVec3()` probed `var(--sgs-fx-shadow)` by
setting a probe element's `color` and reading it back. With the property unset, CSS treats
the declaration as invalid-at-computed-value-time and **inherits** rather than failing — so
the probe returned `rgb(58,46,38)`, byte-identical to the element's inherited colour, the
regex matched, and the preset-default fallback was **unreachable**. Both duotone colours
collapsed to the body text colour. Fixed in `2ad5d439` by checking whether the property is
declared before probing. **This was the DEFAULT path** (pick Duotone, don't choose colours).

**2. The duotone ramp was unstretched.** Raw sRGB luminance fed straight into
`mix(shadow, highlight, lum)` meant a mid-key photograph only reached the bottom third of
the ramp. Fixed in `481e6e55` with a `smoothstep(0.06, 0.78, lum)`.

**3. The probe's own pixel arms were measuring the instrument.** Arms 1b/2/6 read the
WebGL canvas back via `drawImage` and always got `[0,0,0,0]`, because the renderer has no
`preserveDrawingBuffer` (correct for production). They reported FAIL on a working feature.
Rewritten to compare browser-composited element screenshots with a same-element-twice
stability control. **The renderer was NOT changed to suit the test.**

---

## Known gaps — stated, not hidden

- **Naked-`<img>`-root blocks cannot use the effect.** `sgs/decorative-image` (and any
  block rendering its image as the block root) is offered the treatment but no-ops, because
  the boot module looks for a nested `img`. 13 of the 15 offered blocks nest theirs and
  work. Fixing this needs a re-parent or a wrapper, and `decorative-image`'s responsive
  tiers use compound selectors on the `<img>` itself — a design decision, not a patch.
- **`sgs/media` is not offered at all** — it hosts no fx panel, and `creates_panel=0`
  (correctly) will not create one. The documented escape hatch is
  `supports.sgs.fx.motionSurface: true` on that block, which is Bean's call.
- **`sgs/media` and `sgs/decorative-image` both violate a standing project rule**: they
  render an `<img>` and neither declares `imageControls`. Pre-existing.
- **Arm 7's primary GPU-tally assertion is unverifiable on a live page** (see table).

---

## Reproduce

```bash
node plugins/sgs-blocks/scripts/motion-qa/probe-tier-w-surface.mjs \
  https://sandybrown-nightingale-600381.hostingersite.com/tier-w-surface-canary/
```
