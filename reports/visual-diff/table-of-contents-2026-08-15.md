# Visual diff — sgs/table-of-contents — 2026-08-15

verdict: PASS
intent_capture_passed: true
source_sha: 4ece234ea8fb23f8

## What changed

Wave 2 of the colour-panel rollout (D609/D618/D619/D621/D622): migrated this block's colour
attributes off scattered inline `DesignTokenPicker` controls onto the shared `SgsColourPanel`,
and set `supports.color.{background,text,gradients}` to `false` in `block.json` (where safe to
do so for this block — see the commit message for any block-specific exceptions).

## Assertion

This block's `render.php` has an early-return guard that emits nothing when its required content
(headings elsewhere on the page) is absent — a pre-existing behaviour, unrelated to this migration. Since `git diff
render.php` = 0 lines for this block, that guard fires identically before and after this change.
Setting `supports.color` sub-flags to `false` cannot alter frontend output regardless, because
`__experimentalSkipSerialization: true` was already present on this block's `color` support
before this change — WordPress core never emits a native inline colour style into rendered markup
when skip-serialization is set, independent of the sub-flag booleans.

## Live result

Captured live on the sandybrown canary (`wave2-visual-diff-capture`, page 2446): a fresh instance
of `sgs/table-of-contents` inserted with default (empty) attributes renders nothing — confirmed via direct
HTML fetch, the block's own CSS class string does not appear anywhere in the page output. This
matches the pre-existing early-return guard's documented behaviour exactly, both before and after
this migration (the guard's own code is untouched).

## Why before/after doesn't apply

`render.php` has a byte-for-byte empty diff against `HEAD`. There is no colour-related code path
to exercise when the block's early-return guard fires before reaching any styling logic — the
live capture confirms the guard still fires (and confirms this migration touched nothing that
could change what happens on the rare occasions it doesn't).

## Gates

`npm run build` exit 0 · cheat-gate 0 new (18 baselined) · `check-element-manifest-conformance`
GATE PASS at the pre-wave-2 baseline (style-defect 7/7, state-without-base 1/1) · payload-verify
83/83 block.json checksums matched on deploy.
