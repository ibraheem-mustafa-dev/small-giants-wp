---
block: sgs/before-after
date: 2026-09-01
verdict: PASS
intent_capture_passed: true
commit: (see git log — the commit this report is staged alongside)
source_sha: 4fdcabe8beb9d29b
canary_page: 3153 (temporary probe, deleted after capture)
---

# sgs/before-after — BooleanResponsiveControl import relocated, no behaviour change

## What changed and what is asserted

`edit.js`'s `import BooleanResponsiveControl from './BooleanResponsiveControl'`
became `import { BooleanResponsiveControl } from '../../components'` — the
block-local file was deleted and its content promoted verbatim (plus an
optional `disabled` prop, unused by this block) to
`src/components/BooleanResponsiveControl.js`, per both the deleted local
file's own docblock ("If a THIRD block needs this pattern, promote…") once
`sgs/media`'s `video-behaviour` atom became that third consumer.

**Assertion:** this is a component-relocation with an additive-only prop
change — the block's own usage (label/attrBase/attrTablet/attrMobile/
attributes/setAttributes) is unaffected, so the block editor should load with
no new console errors and the Autoplay control should behave identically.
This is an `intent_capture` because there is no "before" render state to diff
— the component's own output is unchanged; the only question is "does the
editor still load and function".

## Method

Live canary, REST-authored probe page 3153 with an `sgs/before-after` block
(`videoAutoplay:true`, `videoAutoplayTablet:false`, both slots set to Image).
Opened in `wp-admin`'s block editor, selected the block, opened the "Media"
panel, and inspected the console for JS errors.

## Result

The block's "Media" inspector panel renders in full (Before/After media-type
pickers, Object fit, Focal point, all sub-panels: Divider/Labels/Frame
size/Border/Visibility conditions) with no React crash and no error boundary.

The Autoplay control itself is correctly ABSENT for this instance — it is
gated on at least one slot being Video (a pre-existing, unrelated behaviour;
both slots here are Image) — so its non-appearance here is the block's
existing gate working correctly, not a regression from the import change.

Console showed exactly 2 errors, both pre-existing and unrelated to this
change: a 404 for the placeholder image URL used in the probe (never a real
attachment), and a 400 from the `block-renderer` SSR preview endpoint for the
same reason (the preview server-render fails on a non-existent image, a
before-after quirk unrelated to `BooleanResponsiveControl`). No console error
referencing `BooleanResponsiveControl`, no missing-module error, no React
error boundary text ("Something went wrong" etc. — absent from the DOM).

## Not asserted

- Visual comparison of the divider/handle/labels — this change touches no
  rendering code for those, only an import path for one hidden-in-this-
  instance control.
- Live Autoplay control behaviour with an actual video slot set — deferred
  as out of scope for a pure import-path change; `sgs/media`'s own report
  (`media-2026-09-01.md`) proves the SAME promoted component works correctly
  end-to-end (tiered writes, lock behaviour, editor UI) on that block.
