# Visual diff — sgs/image-sequence — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: 965e566865fcc007

## What changed

Added `thumbnailDecorative` (boolean, default `false`), block-level (not per-tier — the
tablet/mobile thumbnails are art-directed crops of the SAME photo, not different pictures,
so one editorial choice covers all of them). Scoped to the fail-open `<img>` thumbnail only
— the scroll-scrubbed `<canvas>` itself takes no `alt`/`aria-hidden` the same way. `edit.js`
adds a `ToggleControl` near the existing thumbnail/alt controls; `render.php` blanks
`$thumbnail_alt` when set, matching `sgs/timeline`'s `milestoneMediaDecorative` pattern.

## Assertion

An unset instance renders byte-identical (`thumbnailDecorative` defaults false). The
render.php change sits after the block's fragile printf-assembled `<style>` block (a known
sensitivity documented in this file's own comments) and was written to avoid disturbing it.

## Live capture — sandybrown canary, REST-created probe instance

Probe: one `sgs/image-sequence` instance with a thumbnail + alt text, `thumbnailDecorative:
true`.

| Measure | Result |
|---|---|
| Rendered alt | authored text absent ✅ |
| `aria-hidden` present | ✅ |

## Risk

No markup change for existing content — `thumbnailDecorative` defaults false. Canvas/
scroll-scrub JS untouched.
