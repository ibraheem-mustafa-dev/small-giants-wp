# Visual Diff Report: accordion (2026-08-14)

## Change Category
Inspector architecture change (block.json `supports.color` sub-flags +
edit.js/SgsColourPanel.js editor mount). Same class of change as
`sgs/icon` (D618, same day) — NOT auto-skippable by `check-editor-only.py` or
`check-markup-neutral.py` because block.json changed a real supports flag,
not just `supports.sgs`. Real before/after live capture below, not a
category-based waiver.

## Changes Reviewed
- `accordion/edit.js`: `headerColour`, `headerBackground`, `iconColour` move
  from a scattered `PanelBody title="Colours"` (three inline
  `DesignTokenPicker` rows) into ONE `SgsColourPanel` mount, rendered FIRST
  in the inspector. Pure editor-UI change — no hover siblings exist for
  these three attrs, so each row is single-state.
- `accordion/block.json`: `supports.color` sub-flags changed from
  `{background:true, text:true, gradients:true, __experimentalSkipSerialization:true}`
  to `{background:false, text:false, gradients:false, __experimentalSkipSerialization:true}`.
  This is the one change with a plausible frontend effect.

## Verification — real before/after live capture on the sandybrown canary
Created a throwaway WP-CLI test page (`colour-verify-accordion`, post 2424)
with `sgs/accordion {"headerColour":"#ff00aa"}` + one `sgs/accordion-item`
child, and diffed the SAME page's lifted CSS file
(`wp-content/uploads/sgs-css/sgs-<postid>-<contenthash>.css` —
`sgs-block-css-is-lifted-not-inline`, so the frontend HTML itself carries no
inline colour; the block's scoped `<style>` rule lives in this file) across
three deploys, `render.php`/`accordion-item/render.php` untouched throughout:

1. **AFTER (this change)** — deployed via `build-deploy.py --target
   sandybrown --blocks-only --payload plugins/sgs-blocks/src/blocks/accordion/`
   (+ the other blocks in this wave's payload). Fetched the page, extracted
   the lifted CSS URL, confirmed the header-colour rule renders:
   `.sgs-accordion-item-5fbf14c8.wp-block-sgs-accordion-item
   .sgs-accordion-item__header{color:var(--wp--preset--color--ff00aa)}`
   (the `DesignTokenPicker` on this block stores a slug, so the raw hex
   sanitises to a slug-shaped token — this proves render.php genuinely reads
   `headerColour` via `$block->context['sgs/accordionHeaderColour']` and
   emits a scoped rule keyed on it, unaffected by the edit.js/block.json
   change).
2. **BEFORE (HEAD, `git show HEAD:.../block.json`)** — temporarily restored
   the pre-change `block.json` only (working tree, not the staged index),
   rebuilt, redeployed with the identical `--payload` set, re-fetched the
   SAME page. The lifted CSS filename's content-hash suffix
   (`3f5cc2ece8b452a4b6a08f1d5aaba74b`) was IDENTICAL to AFTER's, and
   `diff BEFORE-accordion.css AFTER-accordion.css` → **byte-identical, no
   diff output**.
3. Restored the AFTER `block.json`, rebuilt, redeployed a third time (the
   final state this commit ships), re-fetched the page after a full
   LiteSpeed cache purge — **still byte-identical** to step 1's capture.

This confirms the mechanism this report predicted (same as D618/`sgs/icon`):
`__experimentalSkipSerialization: true` on the PRE-change `supports.color`
block already suppressed WordPress's native colour className/inline-style
output entirely, so the sub-flags changing from true/true/true to
false/false/false has zero rendered effect — output was already fully inert
on the frontend before this commit, and stays fully inert after it. The
block's own colour rendering (`--sgs-*` custom properties / scoped rules via
`accordion-item/render.php`) is driven entirely by `headerColour`/
`headerBackground`/`iconColour` via block context, never by native
`supports.color`.

first_paint_capture_passed: true

## Verdict
verdict: PASS

source_sha: 2ee88f52090d437f

## Notes
- Task: T4 wave-1 uniformity-rollout batch (D609/D618 recipe), applying the
  proven `sgs/icon` pattern to `accordion`/`audio`/`before-after`/
  `brand-strip`.
- Test page 2424 deleted after verification.
- The old "Colours" `PanelBody` (three inline `DesignTokenPicker` rows) was
  removed outright — no colour is settable in two places at once.
