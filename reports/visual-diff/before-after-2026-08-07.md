---
block: sgs/before-after
date: 2026-08-07
source_sha: 9e0e70d5d237eb3c
change: (1) per-device video autoplay tiers + BooleanResponsiveControl; (2) art-direction tiers on the IMAGE pair
surface: https://sandybrown-nightingale-600381.hostingersite.com/art-direction-tier-probe/ (page 2178, image tiers)
         https://sandybrown-nightingale-600381.hostingersite.com/sgs-ba-video-1850/ (page 2177)
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

---

# Part 2 — art-direction tiers on the IMAGE pair (added 2026-08-07)

The sha above was regenerated for this change, so this file now certifies BOTH parts.
**Part 1's "what is NOT proven" section above still stands unchanged** — nothing below
re-verifies real video playback or the runtime tier switch, and no video attachment
exists on the canary yet. Those remain open.

## What changed

Eight attrs — `{before,after}Image{Id,Url}{Tablet,Mobile}` — resolved in
`media-render.php` and emitted as sibling `<img>`s inside their own comparison slot (they
must stay in the slot, or the divider will not clip them). Breakpoint toggles are scoped
in `render.php`, which is where `$uid` exists; the resolver reports back which tiers it
actually emitted.

Editor: one `<ResponsiveControl>`-wrapped `ImagePickerRow` per side, gated on a desktop
image existing. `ImagePickerRow` gained `showAlt` (default true) — the tier pickers pass
false, because alt is NOT tiered (a different crop of the same subject describes the same
thing) and rendering that field with no `alt`/`onAltChange` pair would have put an
uncontrolled, untypeable input on screen.

## A gate finding that was real feedback, not a false alarm to baseline

`check-dead-controls.js` CHECK 4 reported all 8 attrs FULLY DEAD. The gate was wrong about
the code — but right that the code was unreadable to it: its dynamic-prefix resolver reads
`$attributes[$var . 'Literal']` and cannot follow `$prefix . 'ImageId' . $tier`, a key
whose tail is a second variable. Rewritten to concatenate WHOLE literal suffixes
(`$prefix . 'ImageIdTablet'`). All 8 cleared with no baseline entry.

Re-measured: CHECK 4 net-new went 11 -> 3, and the 3 remaining (`before-after ::
maxWidthUnit`, `button :: fontFamily`, `hero :: subHeadline`) are pre-existing.

## Measured — first paint per width, computed visibility

Viewport set, then a FRESH navigation at that width (no resize-after-load). Width is
`window.innerWidth` measured in the page, not the requested size — a requested 800px
measured 727px, which would have tested mobile while labelled tablet.

| measured innerWidth | `__img` nodes | visible | which tiers |
|---|---|---|---|
| 1364 | 6 | 2 | `--before-desktop`, `--after-desktop` |
| 818 | 6 | 2 | `--before-tablet`, `--after-tablet` |
| 364 | 6 | 2 | `--before-mobile`, `--after-mobile` |

Two visible is correct — one per comparison slot. Before and after were given DIFFERENT
images per tier, so a swap on one side could not be mistaken for the other.

**PASS** for the image-tier change.

## Limits of Part 2

- Image slots only. The video and SVG slot types were not re-captured.
- The divider drag was not exercised at tier boundaries.

---

# Part 3 — the Part 1 gaps are now CLOSED (2026-08-07, real video)

Bean uploaded two real MP4s to the canary (attachments 2180 `1.mp4`, 2181 `2.mp4`), which was the
single blocker on Part 1's two "what is NOT proven" items. Both are now measured.

Surface: `/real-video-tier-probe/` (page 2182), authored `videoAutoplay: true`,
`videoAutoplayTablet: false`, `videoAutoplayMobile: false`. Fresh navigation per width.
`source_sha` unchanged — no block source was edited for this pass, only the evidence.

## PLAYBACK is proven, not just the attribute contract

| measured innerWidth | before clip | after clip | paused | currentTime after 2.5s |
|---|---|---|---|---|
| 1364 (desktop) | `1.mp4` | `2.mp4` | **false** | **8.32 / 8.27** |
| 818 (tablet) | `1.mp4` | `2.mp4` | true | 0 |
| 364 (mobile) | `1.mp4` | `2.mp4` | true | 0 |

`currentTime` ADVANCING past 8s is the assertion that matters — a `<video>` that exists, is
`readyState: 4` and reports `paused: false` could still be a stalled element; a clock that has moved
8 seconds cannot be. Both were `muted: true`, the precondition browsers require to permit autoplay.

## The runtime tier switch is proven, with a control

Tablet and mobile are PAUSED at first paint while desktop PLAYS — same two videos, same browser,
same page, differing only in viewport width. Desktop playing is the positive control: it proves
autoplay is permitted in this environment, so tablet/mobile being paused is the TIER acting, not the
browser silently blocking autoplay. Without that control, three paused videos would have been
indistinguishable from a feature that does nothing.

**Part 1's two open limits are now closed.** The remaining Part 2 limits (video/SVG slot types in the
image-tier work, divider drag at tier boundaries) are unaffected and still stand.
