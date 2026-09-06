---
block: sgs/star-rating
date: 2026-08-29
verdict: PASS
intent_capture_passed: true
commit: 1014fc9d8
canary: sandybrown-nightingale-600381.hostingersite.com
---

# sgs/star-rating — `emptyColour` default no longer resolves to nothing

## What changed

`block.json:118` default and the `render.php:27` fallback both moved from
`border-subtle` to `border`. `emptyColour` paints the UNFILLED star, written as an
SVG `fill` presentation attribute via `sgs_colour_value()`.

## Why this is an intent capture and not a before/after diff

`sgs_colour_value('border-subtle')` emits
`var(--wp--preset--color--border-subtle)`. That custom property is defined in no
palette, so the browser drops the whole declaration. The before-state is an
**unpainted unfilled star** — there is no meaningful "before" image to diff
against, and a pixel comparison of "nothing" to "something" adds no information
the measurement below does not already carry.

## Assertion

> The slug this block now defaults to resolves to a real colour on the live canary;
> the slug it used to default to does not.

## Measurement — live canary, in-page, with a negative control

A probe element was appended to the live document and each token applied in turn:

| token | computed `background-color` | |
|---|---|---|
| `--wp--preset--color--border` | `rgb(232, 213, 192)` | ✅ resolves — the NEW default |
| `--wp--preset--color--border-subtle` | **`rgba(0, 0, 0, 0)`** | ❌ does not resolve — the OLD default |
| `--wp--preset--color--border-light` | `rgb(229, 231, 235)` | resolves (discriminating control) |
| `--wp--preset--color--accent` | `rgb(245, 208, 80)` | resolves (sanity control) |

**Negative control:** `border-subtle` returns fully transparent, so this probe CAN
report failure — it is not a check that passes against anything.

**Discriminating control:** `border-light` also resolves, so "the token resolves"
is not trivially true of every string. The probe distinguishes real palette
entries from phantom ones.

## Corroboration from a rendered element

The same token was observed painting on a real block in the same page load:
`sgs/timeline`'s milestone dot, which shares the identical
`sgs_colour_value()` → `var(--wp--preset--color--…)` path, computed
`rgb(232, 213, 192)` on its `::before`. See `timeline-2026-08-29.md`, which carries
the screenshot.

## Not asserted here

The unfilled star's CONTRAST against the page ground. `#E8D5C0` on the `#FBF3DC`
canary surface is a low-contrast pairing by design (an unfilled star is meant to
recede), but no WCAG figure was measured and none is claimed. If the unfilled star
must meet the 3:1 non-text threshold, that is a separate colour decision, not a
token-resolution one.
