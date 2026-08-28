# Visual diff — sgs/mega-panel — 2026-08-29

verdict: PASS
intent_capture_passed: true
live_verified: true
source_sha: 6ff0dfd31b3798f7
block: mega-panel
url: https://sandybrown-nightingale-600381.hostingersite.com/?p=2154 (Mega Panel Canary 2026-08-06)
method: live computed-style measurement (getComputedStyle) on the deployed canary

## ⚠ READ THIS BEFORE TRUSTING THE VERDICT

**PASS is scoped to "the rename did not break rendering". It is NOT sign-off on the renamed
surface, because the canary does not exercise it.** See "Not verified" — that section is the
point of this report, not a footnote.

## What changed

The Bean-ruled `accent*` rename plus two new resting-state attributes:

  accentBackground            -> iconBackground
  accentTextColour            -> iconColour
  accentBorderColour          -> groupBorderColourHover
  accentBorderColourGradient  -> groupBorderColourGradientHover
  NEW: groupBorderColour, groupBorderColourGradient   (resting state, Bean-ruled
       "build a resting-state border control too")

Plus two new manifest elements (`icon`, `group`) covering a genuine cross-block blind spot:
mega-panel styles `sgs/icon-list` and `sgs/mega-group` BEM classes reused as its own markup.

`accentBackgroundImage` is a DIFFERENT attribute and deliberately keeps its name — a substring
grep for `accentBackground` returns 3 hits on this block and all three are benign (that attr
twice, plus a `_note` recording the rename). Do not "clean them up".

## Assertion

After the rename lands and deploys:
1. The block still renders — a rename that missed a read site would blank it.
2. Its colours still resolve (no unresolved token slugs, which WP emits verbatim as invalid CSS).
3. No inline `style` property declaration appears (Spec 32).

## Measured (live, 2026-08-29)

  .sgs-mega-panel   uid class    sgs-mega-panel-35c98155
                    background   color(srgb 0.984314 0.952941 0.862745 / 0.92)  [2 PASS]
                    border-color color(srgb 0.227451 0.180392 0.14902 / 0.22)   [2 PASS]
                    style attr   null                                           [3 PASS]
                    renders      yes, with content                              [1 PASS]

  .sgs-mega-panel__content   color rgb(58, 46, 38)   background transparent   inline null

Server payload independently confirmed before measuring: `build/blocks/mega-panel/block.json`
contains `iconBackground`, `iconColour`, `groupBorderColour`; file mtime 23:47 on 2026-08-29.

## ⛔ NOT VERIFIED — the renamed surface itself

The only published mega-panel instances on the canary render `__content` and a button label.
**None renders an `icon` or `group` element**, so this capture could not measure:

  - `iconBackground` / `iconColour`   — the renamed icon surface
  - `groupBorderColour` / `groupBorderColourGradient` — the two NEW resting-state attrs,
    which no client has ever seen rendered
  - `groupBorderColourHover` / `...GradientHover` — the renamed hover surface

So this report proves the rename is SAFE (nothing broke, nothing inlined, colours resolve). It
does NOT prove the renamed attributes paint what Bean intended. Under R-31-13 his eye is
co-authoritative and has not been applied to this surface.

**Owed:** build a canary instance that actually mounts an `icon` and a `group` with non-default
colours, then re-measure. Until then, treat the icon/group surface as UNPROVEN rather than
green. A capture that cannot reach the changed surface is not evidence about it.
