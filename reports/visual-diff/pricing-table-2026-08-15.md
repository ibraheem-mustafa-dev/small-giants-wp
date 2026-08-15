# Visual diff — sgs/pricing-table — 2026-08-15

verdict: PASS
intent_capture_passed: true
source_sha: 28322d0d166aea18

## What changed

Wave 2 of the colour-panel rollout (D609/D618/D619/D621/D622): migrated this block's colour
attributes off scattered inline `DesignTokenPicker` controls onto the shared `SgsColourPanel`,
and set `supports.color.{background,text,gradients}` to `false` in `block.json`.

## Assertion

Setting the native `supports.color` sub-flags to `false` cannot change this block's frontend
markup, because `__experimentalSkipSerialization: true` was already present on this block's
`color` support before this change (confirmed: `git diff render.php` = 0 lines — this migration
never touched `render.php`). Skip-serialization means WordPress core never emits a native inline
colour style into saved/rendered markup regardless of the sub-flag booleans; the flags only
control whether the editor SHOWS the corresponding UI control. There is no code path by which
this change could alter frontend output.

## Live result

Captured live on the sandybrown canary (`wave2-visual-diff-capture`, page 2446), a fresh instance
of `sgs/pricing-table` inserted with default attributes. Root element: no inline `style` attribute at
all — confirmed via direct HTML fetch + regex scan for `style="..."` containing `color`/
`background` on the block's wrapper element. Matches the assertion exactly.

## Why before/after doesn't apply

`render.php` — the only file that determines frontend markup — has a byte-for-byte empty diff
against `HEAD` for this block. There is no "before" state distinguishable from "after" to diff;
the live capture confirms the assertion holds in reality, not that a change occurred and reverted.

## Gates

`npm run build` exit 0 · cheat-gate 0 new (18 baselined) · `check-element-manifest-conformance`
GATE PASS at the pre-wave-2 baseline (style-defect 7/7, state-without-base 1/1) · payload-verify
83/83 block.json checksums matched on deploy.
