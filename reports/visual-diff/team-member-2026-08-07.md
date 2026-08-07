---
block: sgs/team-member
date: 2026-08-07
change: shadow preset slug rename (md -> raised, lg -> floating) in style.css + render.php allowlist
surface: https://sandybrown-nightingale-600381.hostingersite.com/sgs-shadow-probe-1757/ (page 2174)
method: live computed-style capture at first paint (Playwright, real deployed canary)
verdict: PASS
first_paint_capture_passed: true
---

# sgs/team-member — visual diff, 2026-08-07

## What changed

Two things, both part of the shadow preset rename:

1. `style.css` — `var(--wp--preset--shadow--md)` -> `var(--wp--preset--shadow--raised)`
2. `render.php` — the preset allowlist:
   `array( 'sm', 'md', 'lg', 'glow' )` -> `array( 'subtle', 'raised', 'floating', 'glow' )`

The allowlist is the reason this block could NOT be auto-classified as
token-rename-neutral: a stored attribute value that fails that `in_array()` check
renders **no shadow at all**, silently. That is a real regression risk, so it
needed a real capture rather than a classifier's word.

## Why a probe page exists

`sgs/team-member` appears on no published canary page, so there was nothing to
capture against. Rather than stamp a field nobody measured, a probe page was
created (page 2174) holding two instances exercising both renamed tiers.

## Measurement

Captured at first paint, no interaction.

Resolved tokens on `:root`:

| token | resolved value |
|---|---|
| `--wp--preset--shadow--subtle` | `0 1px 3px rgba(0,0,0,0.08)` |
| `--wp--preset--shadow--raised` | `0 4px 12px rgba(0,0,0,0.1)` |
| `--wp--preset--shadow--floating` | `0 8px 30px rgba(0,0,0,0.12)` |
| `--wp--preset--shadow--sm` / `--md` / `--lg` | *(undefined)* — retired as intended |

Painted values:

| instance | `cardShadow` | computed `box-shadow` | rendered |
|---|---|---|---|
| 1 | `raised` | `rgba(0, 0, 0, 0.1) 0px 4px 12px 0px` | true |
| 2 | `floating` | `rgba(0, 0, 0, 0.12) 0px 8px 30px 0px` | true |

Both elements had non-zero width/height and non-empty text, so these are real
painted nodes, not collapsed boxes scoring a false pass.

## Result

Instance 1 paints exactly what `--shadow--md` produced before the rename
(`0 4px 12px rgba(0,0,0,0.1)`); instance 2 paints exactly what `--shadow--lg`
produced (`0 8px 30px rgba(0,0,0,0.12)`). The allowlist accepts the new slugs —
had it not, both would have painted `none`, which this capture would have caught.

**PASS** — no visual change, which is the intended outcome for a rename.

## Scope note

Covers the shadow rename only. This block also carries in-flight art-direction
work (`photo` / `photoTablet` / `photoMobile`) from a separate track, which is NOT
staged in this commit and is NOT covered by this verdict — that track owns its own
verification (LEDGER D515-D517). The `sgs/before-after` block did not render on the
probe page; it is likewise not part of this commit.
