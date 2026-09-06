# Visual diff — sgs/before-after — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: 04d738a091d027e0

## What changed

Added `beforeImageDecorative`/`afterImageDecorative` (boolean, default `false`) — one per
comparison slot, since a client may treat one side as content and the other as decoration.
`block.json` declares both; `edit.js`'s `MediaSlotPicker` builds the attribute key via
`` `${side}ImageDecorative` `` (template-literal, per-slot) and adds a `ToggleControl`
that disables the slot's alt-text field when on; `media-render.php` (the sibling file
`before-after/render.php` delegates its per-slot media resolution to) blanks that slot's
alt and adds `aria-hidden="true"` via `$attributes[$prefix . 'ImageDecorative']`.

## Assertion

An unset instance renders byte-identical (both new attributes default false). Toggling one
slot's decorative flag blanks only that slot's alt/adds `aria-hidden` only there — the
other slot is unaffected, since the block-level `videoAutoplay` precedent aside, this
attribute is genuinely per-slot.

## Live capture — sandybrown canary, REST-created probe instance

Probe: one `sgs/before-after` instance with `beforeImageDecorative: true` and
`afterImageDecorative: false`, distinct alt text on each slot.

| Measure | Result |
|---|---|
| Before slot alt (decorative: true) | blanked ✅ |
| After slot alt (decorative: false) | kept ✅ — confirms per-slot independence, not a block-level flag |
| `aria-hidden` present | ✅ |

## Risk

No markup change for existing content. Both attributes default false and are scoped to
the image type only (video/SVG slots untouched, per the task's own scoping).
