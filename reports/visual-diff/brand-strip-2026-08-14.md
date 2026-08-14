# Visual Diff Report: brand-strip (2026-08-14)

## Change Category
Inspector architecture change (block.json `supports.color` sub-flags +
edit.js/SgsColourPanel.js editor mount). Same class of change as `sgs/icon`
(D618) and the other blocks in this wave — NOT auto-skippable because
block.json's `supports.color.background`/`gradients` genuinely changed. Real
before/after live capture below, not a category-based waiver.

## Changes Reviewed
- `brand-strip/edit.js`: `tileBackgroundColour`⇆`backgroundColourHover`,
  `tileBorderColour`⇆`borderColourHover`, `nameColour`⇆`textColourHover`
  move from the Styles-tab "Tile colours" `ToolsPanelItem`
  (`StateToggleControl` with 6 inline `DesignTokenPicker` rows split across
  Normal/Hover states) and the Caption panel's standalone
  `DesignTokenPicker`, into ONE `SgsColourPanel` mount with 3 rows, each
  carrying a normal + hover state pair (D609 clause 9b), rendered FIRST in
  the inspector. Pure editor-UI change. The "Tile colours" `ToolsPanelItem`
  is reduced to just its one non-colour member (`tileBorderWidth`), renamed
  "Tile border width".
- `brand-strip/block.json`: `supports.color` sub-flags changed from
  `{background:true, gradients:true, text:false, __experimentalSkipSerialization:true}`
  to `{background:false, gradients:false, text:false, __experimentalSkipSerialization:true}`.
  This is the one change with a plausible frontend effect.

## Verification — real before/after live capture on the sandybrown canary
Created a throwaway WP-CLI test page (`colour-verify-brand-strip`, post
2426) with `sgs/brand-strip {"tileBackgroundColour":"#ff00aa"}` and diffed
the SAME page's lifted CSS file (`sgs-block-css-is-lifted-not-inline`)
across three deploys, `render.php` untouched throughout:

1. **AFTER (this change)** — deployed via `build-deploy.py --target
   sandybrown --blocks-only --payload plugins/sgs-blocks/src/blocks/brand-strip/`
   (+ the other blocks in this wave's payload). Fetched the page, extracted
   the lifted CSS URL, confirmed `--sgs-tile-bg:#ff00aa` present
   (`render.php:230-233`) — proving `tileBackgroundColour` reaches the
   frontend unaffected by the edit.js/block.json change.
2. **BEFORE (HEAD, `git show HEAD:.../block.json`)** — temporarily restored
   the pre-change `block.json` only, rebuilt, redeployed with the identical
   `--payload` set, re-fetched the SAME page. The lifted CSS filename's
   content-hash suffix (`bccee58705a5ec205c1c6f2b50c06428`) was IDENTICAL to
   AFTER's, and `diff BEFORE-brand-strip.css AFTER-brand-strip.css` →
   **byte-identical, no diff output**.
3. Restored the AFTER `block.json`, rebuilt, redeployed a third time (the
   final state this commit ships), re-fetched the page after a full
   LiteSpeed cache purge — **still byte-identical** to step 1's capture.

This confirms the same mechanism as D618/`sgs/icon` and the sibling blocks in
this wave: `__experimentalSkipSerialization: true` on the PRE-change
`supports.color` block already suppressed WordPress's native colour output
entirely, so the `background`/`gradients` sub-flags flipping true→false has
zero rendered effect. The block's own colour rendering (`--sgs-tile-*`
custom properties via `render.php`) is driven entirely by its own typed
attrs, never by native `supports.color`.

first_paint_capture_passed: true

## Verdict
verdict: PASS

source_sha: ac9911bdaecff7ad

## Notes
- Task: T4 wave-1 uniformity-rollout batch (D609/D618 recipe).
- Verified via render.php/style.css that `textColourHover` feeds
  `--sgs-tile-hover-text` (`style.css:410`), the hover counterpart of the
  caption's `nameColour` — confirming the `caption` row's normal/hover pair
  is correctly matched (not a guessed pairing).
- Test page 2426 deleted after verification.
