# Visual Diff Report: before-after (2026-08-14)

## Change Category
Inspector architecture change (block.json `supports.color` sub-flag +
edit.js/SgsColourPanel.js editor mount). Same class of change as `sgs/icon`
(D618) and `sgs/accordion` (same wave) — NOT auto-skippable because
block.json's `supports.color.background` genuinely changed. Real before/after
live capture below, not a category-based waiver.

## Changes Reviewed
- `before-after/edit.js`: `labelColour`, `labelBackgroundColour`,
  `dividerColour`, `handleColour`, `handleIconColour` move from scattered
  inline `DesignTokenPicker` rows (inside the "Divider" and "Labels" panels)
  into ONE `SgsColourPanel` mount, rendered FIRST in the inspector. Pure
  editor-UI change — no hover siblings exist for these five attrs.
- `before-after/block.json`: `supports.color` sub-flags changed from
  `{background:true, text:false, gradients:false, __experimentalSkipSerialization:true}`
  to `{background:false, text:false, gradients:false, __experimentalSkipSerialization:true}`.
  This is the one change with a plausible frontend effect.

## Verification — real before/after live capture on the sandybrown canary
Created a throwaway WP-CLI test page (`colour-verify-before-after`, post
2425) with
`sgs/before-after {"labelColour":"#ff00aa","beforeImageUrl":"…","afterImageUrl":"…"}`
(both image slots populated — `render.php` early-returns empty output when
either slot has no content, `render.php:50`) and diffed the SAME page's
lifted CSS file (`sgs-block-css-is-lifted-not-inline`) across three deploys,
`render.php` untouched throughout:

1. **AFTER (this change)** — deployed via `build-deploy.py --target
   sandybrown --blocks-only --payload plugins/sgs-blocks/src/blocks/before-after/`
   (+ the other blocks in this wave's payload). Fetched the page, extracted
   the lifted CSS URL, confirmed:
   `--sgs-before-after-label-colour:#ff00aa` present in the emitted root
   custom-property block (`render.php:298-299`) — proving `labelColour`
   reaches the frontend unaffected by the edit.js/block.json change.
2. **BEFORE (HEAD, `git show HEAD:.../block.json`)** — temporarily restored
   the pre-change `block.json` only, rebuilt, redeployed with the identical
   `--payload` set, re-fetched the SAME page. The lifted CSS filename's
   content-hash suffix (`eb53a02afeb312e68a95f0495a3ffdfc`) was IDENTICAL to
   AFTER's, and `diff BEFORE-before-after.css AFTER-before-after.css` →
   **byte-identical, no diff output**.
3. Restored the AFTER `block.json`, rebuilt, redeployed a third time (the
   final state this commit ships), re-fetched the page after a full
   LiteSpeed cache purge — **still byte-identical** to step 1's capture.

This confirms the same mechanism as D618/`sgs/icon`/`sgs/accordion`:
`__experimentalSkipSerialization: true` on the PRE-change `supports.color`
block already suppressed WordPress's native colour output entirely, so the
`background` sub-flag flipping true→false has zero rendered effect. The
block's own colour rendering (`--sgs-before-after-*` custom properties via
`render.php`) is driven entirely by its own typed attrs, never by native
`supports.color`.

first_paint_capture_passed: true

## Verdict
verdict: PASS

source_sha: 6ce79775794c8bdd

## Notes
- Task: T4 wave-1 uniformity-rollout batch (D609/D618 recipe).
- Test page 2425 deleted after verification (content was updated once
  mid-verification, via `wp post update`, to add the required before/after
  image URLs once the initial content-less test showed the block's
  `has_content` guard suppressing all output — not a bug, an artefact of the
  minimal test content).
