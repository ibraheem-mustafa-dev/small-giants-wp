# Visual Diff Report: countdown-timer (2026-08-14)

## Change Category
T4 wave-1 colour-panel rollout (D609/D618 recipe). `block.json`
`supports.color` sub-flags changed (`text`/`background`/`gradients`
true→false). `edit.js`: the 2 `DesignTokenPicker` rows (`numberColour`/
`labelColour`) inside the "Styling" `PanelBody` replaced by one
`SgsColourPanel` mount (2 single-state rows — neither attr has a hover
sibling in this block's schema) rendered first. `render.php` untouched. Not
auto-skippable (`check-blockjson-metadata-only.py countdown-timer` → exit 1).
Real before/after live capture below.

## Changes Reviewed
- `countdown-timer/block.json`: `supports.color` sub-flags
  `{background:true,gradients:true,text:true,__experimentalSkipSerialization:true}`
  → `{background:false,gradients:false,text:false,__experimentalSkipSerialization:true}`.
- `countdown-timer/edit.js`: `SgsColourPanel` import replaces
  `DesignTokenPicker` import (verified via grep — `DesignTokenPicker` had no
  other call sites in this file). The two `DesignTokenPicker` rows removed
  from the "Styling" `PanelBody` (which retains its `SelectControl`s for
  card style / digit style, unaffected).

## Verification — real capture, not reasoning from memory
Deployed to the sandybrown canary alongside the other 3 wave-1 blocks
(`--payload plugins/sgs-blocks/src/blocks/countdown-timer/`). Live test page
(post 2423, deleted after verification) included
`<!-- wp:sgs/countdown-timer {"numberColour":"#ff00aa","labelColour":"#123456"} /-->`.

Server-side rendered markup (`wp eval-file`, bypassing HTTP/edge caching):

```
<div class="sgs-countdown sgs-cd-529bddcb sgs-countdown--elevated sgs-countdown--digit-simple wp-block-sgs-countdown-timer" data-expired-message="This offer has expired." data-digit-style="simple" role="timer" aria-live="polite" aria-atomic="true">
  <div class="sgs-countdown__grid">…4 units…</div>
  <div class="sgs-countdown__expired" hidden aria-hidden="true">This offer has expired.</div>
</div>
```

No `has-*-color` class, no inline `style="color:…"` from native
`supports.color` — flag flip has no rendered effect (mechanism below).

Fetched the live page's consolidated scoped-CSS file
(`wp-content/uploads/sgs-css/sgs-1686-*.css`, lifted by
`class-sgs-css-registry.php`):

```
.sgs-cd-529bddcb.wp-block-sgs-countdown-timer{--sgs-countdown-number-colour:#ff00aa;--sgs-countdown-label-colour:#123456;}
```

Both hex values present, correctly mapped — proves `render.php`'s attribute
reads are unaffected by the `edit.js` change.

**Mechanism proving the `supports.color` flag flip is inert on the frontend**
(D618 precedent): `__experimentalSkipSerialization: true` was ALREADY set on
this block's `color` support before this change, so native `supports.color`
output was already suppressed. The sub-flags only control native editor
colour-UI generation.

first_paint_capture_passed: true

## Verdict
verdict: PASS

source_sha: dfa8dacab9ba64b7

## Notes
- Task: T4 wave-1. Same shared-checkout stash/restore discipline as the
  breadcrumbs report — see that report's Notes for the full explanation.
- Test page 2423 deleted after verification.
