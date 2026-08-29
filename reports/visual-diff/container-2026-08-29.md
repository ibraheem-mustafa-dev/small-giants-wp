# Visual diff — sgs/container (Ken Burns) — 2026-08-29

verdict: PASS
intent_capture_passed: true
live_verified: true
source_sha: 6c74fb4c7
block: container
url: https://sandybrown-nightingale-600381.hostingersite.com/test-kenburns/
method: computed `transform` matrix sampled at two times on the deployed canary, plus a
        time-separated screenshot pair of the painted element

Pays the MANUAL SKIP logged at `2026-08-29 10:46:57` in `manual-skips.log`.
Test page authored by Bean: a container with a background image and Ken Burns enabled.

## The defect

Two conditions in `SGS_Container_Wrapper` were independent when they should not have been:

- the `<img>` LCP fast path fires on `$has_bg_image && !$has_bg_video && $sgs_bg_img_is_simple`
- `sgs-container--ken-burns` is added on `$has_bg_image && !$has_bg_video` alone — **no check on
  `$sgs_bg_img_is_simple`**

The original animation moves `background-size`/`background-position` on the container. When the
fast path renders the background as a real `<img class="sgs-container__image-bg">`, the container
has no `background-image`, so the animation had nothing to move.

## The bug and the fix, both visible in one live reading

Measured on Bean's page — this is the configuration the diagnosis predicted would be broken
(a plain background image, no responsive tiers, so `$sgs_bg_img_is_simple` is true):

```
imgFastPath       = YES
containerBgImage  = none                          <-- nothing for the old rule to animate
containerAnim     = sgs-container-ken-burns       <-- the OLD animation, running on nothing
imgAnim           = sgs-container-ken-burns-img   <-- the fix, on the element that paints
```

`containerBgImage = none` alongside a running `containerAnim` **is** the silent no-op, captured
directly. Nothing errors; every computed style resolves; the picture simply never moves.

## Proof of motion

`transform` on `.sgs-container--ken-burns > .sgs-container__image-bg`:

| Sample | transform |
|---|---|
| t = 0 | `matrix(1.19815, 0, 0, 1.19815, -31.3472, 23.1247)` |
| t = +17.1 s | `matrix(1.1046, 0, 0, 1.1046, -1.35552, 0.999963)` |

Scale moved **1.198 → 1.105** and translation **(-31.3, 23.1) → (-1.4, 1.0)** — inside the
declared `scale(1.1) translate(0,0)` → `scale(1.2) translate(-2%, 2%)` range, on a 20s
`alternate` cycle. Sampling the live matrix is the reliable instrument here: an animating
`transform` returns its current interpolated value, so two differing samples prove motion.

Screenshot pair of the painted element at the same two moments (`kb-t0.png`, `kb-t17.png`):
the frames visibly differ — the image is zoomed further in and offset at t=0, wider and
recentred at t=17. **Looked at, not just measured** — a matrix can be right while the picture
is wrong.

## Reduced motion

Both arms are present in the deployed stylesheet:

```
@media (prefers-reduced-motion: reduce) {
  .sgs-container--ken-burns                                  { animation: none }
  .sgs-container--ken-burns > .sgs-container__image-bg        { animation: none; transform: none }
}
```

⚠ **Honest scope:** this is rule-presence in the live CSSOM, not emulated-media behaviour — the
browser tooling available here exposes no `prefers-reduced-motion` emulation. The rule exists,
is correctly scoped to the new element, and matches the pre-existing arm's shape; it has not
been observed *taking effect*. Anyone with media emulation should close that gap.

## Why the fix animates the `<img>` rather than suppressing the fast path

Keeps the LCP benefit, and is strictly better motion: `transform` is GPU-composited, whereas
animating `background-size` forces a full repaint every frame. Preconditions verified before
writing it — the `<img>` is `position:absolute; inset:0; width/height:100%; object-fit:cover`
(so a scale-up has room and cannot letterbox), `--has-bg-image` sets `overflow:hidden` (clipping
it), and `extensions/parallax.js` contains no `transform` at all, so there was no transform to
collide with.

The change is purely additive — a new rule on a selector whose animation was already dead — so
it cannot regress any path that worked before.
