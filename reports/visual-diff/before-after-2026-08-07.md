---
block: sgs/before-after
date: 2026-08-07
source_sha: 2702455cf5ac01d1
change: per-device video autoplay tiers (videoAutoplay / Tablet / Mobile) + BooleanResponsiveControl
surface: https://sandybrown-nightingale-600381.hostingersite.com/sgs-ba-video-1850/ (page 2177)
         https://sandybrown-nightingale-600381.hostingersite.com/sgs-ba-probe-1845/ (page 2176, image case)
method: live DOM capture at first paint (Playwright, deployed canary)
verdict: PASS
first_paint_capture_passed: true
---

# sgs/before-after — visual diff, 2026-08-07

## What changed

Per-device video autoplay. Desktop keeps the real `videoAutoplay` attribute;
`videoAutoplayTablet` / `videoAutoplayMobile` are emitted as `data-*` on the root
and resolved by `view.js` at runtime. `edit.js` gains the new shared
`BooleanResponsiveControl`.

## Baseline — the block still renders (page 2176, image case)

| check | result |
|---|---|
| rendered (non-zero box) | `true`, 400px tall |
| `<img>` count | 2 |
| labels | "Before" / "After" present |
| accessible control | `input[type=range]` present |
| `data-has-video` / `data-video-autoplay` | `0` / `0` — correct for images |

## Tier resolution (page 2177, video case)

Two instances, captured at viewport 1745px:

| instance | authored | emitted `data-*` |
|---|---|---|
| 1 | desktop `true`, tablet `false`, mobile `false` | `data-video-autoplay="1"`, `data-video-autoplay-tablet="0"` |
| 2 | desktop `true` only | `data-video-autoplay="1"` |

Both rendered, 2 `<video>` each, all `muted` and `playsinline` — the prerequisites
for autoplay to be permitted by browsers at all.

## Result — two things proven

1. **The cascade resolves.** `render.php` computes tablet from desktop and mobile
   from tablet, so an unset tier inherits rather than defaulting to off.
2. **Emission is conditional, not blanket.** Instance 1 omits
   `data-video-autoplay-mobile` because its resolved value equals tablet's, and
   instance 2 omits both tier attributes because nothing differs from desktop.
   That is the right discipline — the same "emit only when the tier actually
   overrides" rule the `sgs-cols-*` gate exists to enforce. A blanket emitter
   would write a redundant attribute that later reads as an intentional override.

**PASS**

## Limits of this capture — what is NOT proven

- **Playback was not verified.** The probe pointed at a URL with no file behind
  it, so the four console errors on page 2177 are 404s from the probe, not block
  defects. This report certifies the tier ATTRIBUTE contract, not that a real
  video actually starts playing.
- **Only the desktop viewport was captured.** The tier attributes are resolved by
  `view.js` per viewport; this confirms what the server emits for it to act on,
  not the runtime switch at tablet/mobile widths.
- The `autoplay` HTML attribute is `false` on every `<video>` at first paint by
  design — `view.js` applies playback itself rather than relying on the attribute.

A follow-up capture with a real uploaded video, at three viewport widths, would
close both gaps. No video attachment exists on the canary today.
