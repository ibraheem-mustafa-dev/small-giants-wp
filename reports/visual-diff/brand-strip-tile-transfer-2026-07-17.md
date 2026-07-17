---
block: brand-strip
date: 2026-07-17
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/brand-strip` exact tile-CSS transfer + min-height fix — 2026-07-17

Makes the block able to reproduce the reference "Our Brands" strip's exact tile
CSS (Bean's mirror principle: transfer the equivalent block's real CSS, don't
approximate), and removes a band-height over-reservation.

## What changed (all inside `src/blocks/brand-strip/`)

1. **`tilePadding` control** (block.json number, default 10 → drives
   `--sgs-tile-padding`). At `0` the logo fills the tile edge-to-edge (the
   reference has no white padding — its logo image IS the tile face).
2. **`tileRadius` control** (block.json number, default 16 → drives
   `--sgs-tile-radius`). Reference tiles are `border-radius:30px`.
3. **`logoFit` control** (block.json enum contain|cover, default contain →
   drives `object-fit: var(--sgs-logo-fit, contain)`). Lets an instance
   reproduce the reference's `object-fit:cover` crop-to-square; Indus stays
   `contain` (its logos are near-square, so contain fills without cropping).
4. **min-height over-reservation removed** — dropped the trailing
   `+ var(--wp--preset--spacing--50) * 2` (~48px of dead vertical space) from
   the CLS-reservation calc; min-height now equals exactly the tile height.
   Safe: tiles are fixed-height, so no layout-shift risk. This was the cause of
   the clone band being taller than the reference.

All emitted the no-inline way: `--var` values on the root (contract §A);
zero new inline property declarations; no dead controls (build gate green);
no version bump / no deprecated.js.

## Reference vs clone (exact transfer, measured live)

| Property | Reference | Clone before | Clone after |
|---|---|---|---|
| Tile radius | 30px | 16px | **30px** |
| Tile padding (white around logo) | 0 (logo fills) | 10px | **0** |
| Tile size | ~154 (inner white face) | 175 | **155** |
| Logo image height | 155 | 148 → 155 | **155 (fills)** |
| Band height | 271 | 299 | **271** |

Reference logo `object-fit` = cover on a fixed 154² box (centre-crop). Clone
uses `contain`; with padding 0 + a 155² tile the near-square Indus logos fill
without cropping, so the crop was not needed here (control available if ever is).

## Live verification (palestine-lives.org, page 13, CDN cleared)

Instance values set on page 13: `tilePadding:0`, `tileRadius:30`, `logoFit:contain`
(+ band group padding tuned to 27px each so band = 271).

| Breakpoint | Tile | Band | Overflow | Result |
|---|---|---|---|---|
| 1440 | 155² r30 pad0 | 271 | band 0 | PASS |
| 768 | 124² (logo-scale 0.8) | 235 | band 0 | PASS |
| 375 | 88² (logo-scale 0.565) | 198 | 0 | PASS |

Logos fill their tiles edge-to-edge matching the reference; soft 30px corners;
tight gaps; full-bleed marquee; band breathing matches at 271. The 768 page-level
20px overflow is the pre-existing, out-of-scope Services-section grid (hardcoded
`139/250/123/187=771px` columns) — the brand band itself is 0.

**Bean visual sign-off (R-31-13):** cropped 1440 pair (original vs clone) delivered.
