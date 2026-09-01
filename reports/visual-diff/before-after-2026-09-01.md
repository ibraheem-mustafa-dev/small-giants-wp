---
block: sgs/before-after
date: 2026-09-01
verdict: PASS
intent_capture_passed: true
source_sha: 56ce292819ced9d8
---

# Visual-diff — sgs/before-after independence fix (Wave 5b) — 2026-09-01

**Bug fixed:** `sgsObjectFit`/`sgsObjectPosition` came from the universal `supports.sgs.imageControls`
extension, which injects ONE shared pair of attributes for the whole block. `render.php` then wrote
them as a single custom-property rule on the block root (`--sgs-object-fit`/`--sgs-object-position`),
inherited identically by BOTH the before and after `<img>`. Setting fit to "cover" set BOTH images to
"cover", with no way to differ them.

**Fix:** Removed `imageControls`/`imageControlsExplicit` from `block.json`, replaced with
`supports.sgs.mediaElements` — two entries, `prefix: "before"` and `prefix: "after"`, each declaring
`atoms: ["object-fit", "focal-point"]`. `media-render.php`'s `sgs_before_after_resolve_media()` now
takes the block's `$uid` and adds `sgs-media-el` + `sgs_media_element_scope_class( $uid, $prefix )`
to each slot's own `<img>`/`<video>` (svg excluded — object-fit/focal-point are image+video scope
only per registry.js). `render.php` emits each slot's CSS via the existing
`SGS_Media_Element::style()` — no new CSS-generation code, calling the same shared function
`sgs/media` uses. `edit.js` mounts `<MediaElementPanel prefix="before"/"after">` next to each slot's
existing `MediaSlotPicker`. `style.css`'s old `.wp-block-sgs-before-after__img { object-fit: var(
--sgs-object-fit, cover ) }` rule removed — the universal `.sgs-media-el` rule in the
already-globally-enqueued `assets/css/media-atoms/object-fit.css`/`focal-point.css` now owns it.

**Falsification test (plan step 7), run and reported literally:**

```
$ git diff --name-only HEAD -- plugins/sgs-blocks/src/components/media/ \
    plugins/sgs-blocks/src/components/MediaElementPanel.js \
    plugins/sgs-blocks/includes/helpers-media-element.php \
    plugins/sgs-blocks/includes/class-sgs-media-element.php \
    plugins/sgs-blocks/includes/media/atoms/ \
    plugins/sgs-blocks/assets/css/media-atoms/
(no output)
```

Zero changes to any shared-layer path. `git status --short` for this track's own work shows only:

```
 M plugins/sgs-blocks/src/blocks/before-after/block.json
 M plugins/sgs-blocks/src/blocks/before-after/edit.js
 M plugins/sgs-blocks/src/blocks/before-after/media-render.php
 M plugins/sgs-blocks/src/blocks/before-after/render.php
 M plugins/sgs-blocks/src/blocks/before-after/style.css
```

The shared layer needed NO changes — before-after's independence fix consumes
`SGS_Media_Element::style()`/`scope_class()` exactly as built. No shared-layer gap was found; nothing
was patched to force this test to pass.

## Live proof (plan step 9)

Published probe page (`probe-wave5b-before-after-independence`, since deleted) with
`beforeObjectFit: "contain"`, `afterObjectFit: "fill"` on the sandybrown canary:

- `wp/v2/block-renderer` (editor SSR) response's emitted `<style>`:
  `.sgs-before-after-e344a397--before{--sgs-media-object-fit:contain}` /
  `.sgs-before-after-e344a397--after{--sgs-media-object-fit:fill}` — two distinct scope classes,
  two distinct values.
- Both `<img>` class lists confirmed distinct:
  `wp-block-sgs-before-after__img wp-block-sgs-before-after__img--before sgs-media-el
  sgs-before-after-e344a397--before` vs the `--after` equivalent.
- **Real published frontend**, `getComputedStyle()` on each `<img>`:
  `{ cls: "...--before", objectFit: "contain" }` / `{ cls: "...--after", objectFit: "fill" }` —
  genuinely different computed values, not just different attribute storage.
- Screenshot confirms the visual difference: the "After" side (fill) stretches the image to fill its
  box while "Before" (contain) keeps its aspect ratio letterboxed — visibly different crop
  behaviour.

## Result — PASS

The shared-setting bug is fixed. Independence proven on computed style, not just stored attributes,
on the real published frontend.
