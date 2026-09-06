---
block: sgs/decorative-image
date: 2026-08-28
source_sha: (not regenerable — see "About source_sha" below)
verdict: PASS
first_paint_capture_passed: true
method: live before/after DOM capture on the sandybrown canary, probe page 2900
describes_commits: 9ac4b3986, 643f8c4a4
---

# sgs/decorative-image — surface-treatment wrapper (FR-38 / D865)

## What changed and why a change was expected

A client could select a surface treatment (grain / halftone / duotone) on this block, save, and
get **nothing at all**, with no error anywhere.

The block is naked by design: `sgs_responsive_image()` returns the `<img>` as the block root. The
effect's boot module does `el.querySelector( 'img' )`, which searches DESCENDANTS only and can
never match `el` itself, then returns a silent no-op closure. The second half fails independently —
`webgl/renderer.js` appends its `<canvas>` INSIDE that element, and an `<img>` is a void element
that cannot hold children.

The fix gives the effect a host: a `<span>` wrapper, emitted **only** when a treatment is
configured, following the pattern the video branch in the same file already used.

So two changes were expected and both are visible below: a treated instance gains a wrapper, and
an untreated instance renders byte-identically to before.

## Method

Live DOM on `/gate-do-not-delete-decorative-image-surface-treatment-probe/` (page **2900**),
cache-busted, captured BEFORE the deploy and again AFTER. Two `sgs/decorative-image` instances,
both with `fx: "surface-treatment"`; the second deliberately sets **no** `fxTreatment` so the
default-fallback path is exercised.

⚠ Not the emitted stylesheet — SGS block CSS is lifted into `uploads/sgs-css/`, so grepping page
HTML proves nothing about styling. This capture asserts STRUCTURE, which is what the change alters.

## Measurements

| | BEFORE (old code) | AFTER (`4494e6e1d` deployed) |
|---|---|---|
| decorative-image roots | 2 | 4 (2 wrappers + 2 media) |
| root element | `<img>` ×2 | `<span>` ×2 |
| `data-sgs-fx` on root | `surface-treatment` | `surface-treatment` |
| `data-sgs-fx-treatment` | `grain` | `grain` |
| `sgs-decorative-image--treated` | absent | **present** |
| `sgs-decorative-image__media` | absent | **present** |
| inner `<img>` carries uid / base class / `data-*` | n/a | **no** (stripped) |
| surface-treatment JS enqueued | yes | yes |

**Instance 2 is the load-bearing one.** It sets no `fxTreatment`, and BOTH captures show
`data-sgs-fx-treatment="grain"` — the `SGS_FX_TREATMENT_DEFAULT` fallback firing live. That is the
evidence that the gate had to key on `fx`, not on `fxTreatment`: a client who picks the effect and
never touches the preset has a live treatment with an empty preset, and a preset-keyed gate would
have left exactly that client still broken. The first cut of this change made that mistake and the
capture caught it before deploy.

## Untreated instances are unchanged — proved, not asserted

Structure alone would not show a regression on the untreated path, so it was proved separately by
differential render: HEAD's `render.php` and the working copy were run against identical attribute
sets through identical stubbed WP core (loading the REAL `render-helpers.php`, not a hand-copied
stub that could diverge). **All seven untreated cases byte-identical:**

| case | bytes |
|---|---|
| plain image, no tiers | 416 |
| image + both art-direction tiers | 1264 |
| image + tablet tier only | 900 |
| parallax + fade + hide flags | 496 |
| `fx` key absent entirely | 402 |
| `fxTreatment` set but `fx` NOT set | 402 |
| video branch | 565 |

The harness carries its own negative control asserting that TREATED output DIFFERS from untreated —
without it, a fully inert gate would have passed the parity half perfectly.

## Known limitation, recorded not hidden

**Treatment + art-direction tiers samples the DESKTOP image at every width.** The JS takes the first
`<img>`, and hidden tiers are `display:none` rather than removed, so on a phone the visible image is
the mobile tier while the canvas over it was sampled from the desktop one. Not fixed here: the fix
belongs in the shared JS module every treatment-qualifying block uses, which is a design-gate
change rather than a side effect of one block's wrapper fix. A treatment with no tiers is
unaffected.

## About `source_sha`

`visual-report-sha.py` hashes the **staged** bytes of the block's source, so a report certifies one
specific version of one change at commit time. This report is written AFTER its commits landed
(`9ac4b3986`, `643f8c4a4`), so there is nothing staged to hash and the value cannot honestly be
regenerated. The `describes_commits` field names what it certifies instead.

**Why it is late.** The report was owed at commit time and could not be produced then: the AFTER
capture requires the code deployed, and deploying requires a clean tree, which required the commit.
Three scoped `SGS_VISUAL_GATE_SKIP` bypasses were used — never `--no-verify` — each logged with its
reason to `reports/visual-diff/manual-skips.log`, each promising this report. It discharges those
three entries.
