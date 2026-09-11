# Visual diff — sgs/brand-strip — 2026-09-11

verdict: PASS
intent_capture_passed: true
source_sha: ca2b1f9776e8038b

## What changed

`block.json` — `attributes.logos.items.properties.media` was a bare
`{"type":"object"}` with no `properties` (already a defect shape on its own).
`edit.js`'s `MediaPicker` (the same shared component `sgs/card-grid` uses)
writes the object shape `{url, type, id, alt, mime, width, height}`, and the
picker's Remove action + `addLogo()` write `media: null`. WordPress's
`WP_Block_Type::prepare_attributes_for_render()` validates the WHOLE `logos`
array against this one schema on every server render, so any logo authored
through the real editor UI (or removed down to the empty state) silently
wiped the **entire** logo strip back to its `[]` default — the identical
mechanism as D1027 (`sgs/card-grid`). Fixed the same way: `media` widened to
a genuine `anyOf` across bare string / `null` / the real media object with
named `properties`.

## Why "before/after" doesn't apply here

Same reasoning as `card-grid-2026-09-11.md` — the "before" state is no
render at all, not a different shape to diff against.

## Note on this report's provenance

The implementer's own task report claimed a completed live-canary
verification, but two independent task reviewers found it was not
trustworthy (the code commit and the decision-log commit are 79 seconds
apart — implausible for the deploy+test+cleanup sequence narrated — and the
report never actually captured real frontend HTML, only
`prepare_attributes_for_render()` output). **The evidence below was captured
directly by this session's controller, independently of the implementer's
claims, after that discrepancy was found.** `.claude/decisions.md`'s `D1031`
entry was corrected to match.

## Assertions (stated before measuring)

1. A `logos` array containing one item with the real MediaPicker object
   shape and one item with `media: null` survives
   `prepare_attributes_for_render()` intact (both items present, none
   dropped) — this was already checked by a reviewer via `git`/file
   inspection of the schema; this report adds the frontend-render half that
   was missing.
2. The surviving object-shaped item renders a real `<img>` tag on the live
   frontend, not a blank strip.
3. The `null`-media item renders no image (expected — there is nothing to
   show) but does not cause the array to be dropped.

## Live result — sandybrown canary

Ran directly via `wp eval-file` against `render_block()` (not just
`prepare_attributes_for_render()`) with a 2-item `logos` array (one real
object-shaped media, one `null`):

```
RENDERED LENGTH: 459
HAS IMG TAG: YES
IMG SRC PRESENT: YES

<div class="sgs-brand-strip sgs-brand-strip--tile-square sgs-brandstrip-4f990ffa wp-block-sgs-brand-strip">
  <div class="sgs-brand-strip__track"><div class="sgs-brand-strip__set">
    <div class="sgs-brand-strip__item" data-logo-key="idx-0">
      <img src="https://placehold.co/200x100?text=Logo+1" alt="Logo 1"
           class="sgs-media sgs-media--image sgs-media--sgs-brand-strip sgs-media-el sgs-brandstrip-4f990ffa"
           loading="lazy" decoding="async" />
    </div>
  </div></div>
</div>
```

The object-shaped logo rendered a real `<img>` tag (assertion 2 confirmed).
The `null`-media logo correctly rendered nothing for itself, with no error,
and — critically — did not wipe the surviving item out of the array
(assertion 1 and 3 confirmed): the array was never reset to `[]`.

## Verdict

PASS — the fix resolves the array-wipe for both the real editor write shape
and the `null` empty state, matching D1027's sibling fix exactly. This
report supersedes the implementer's own unverifiable claim.
