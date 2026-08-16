# Visual diff — sgs/notice-banner — 2026-08-16

verdict: PASS
intent_capture_passed: true
source_sha: 2fe83e478d785433

## What changed

Added block-level "Text colour" + "Background colour" rows to the existing `SgsColourPanel` (written into the native `style.color.*` path, placed ahead of the existing Icon colour row), and set `supports.color.background`/`text` to `false` so WordPress stops rendering its own duplicate pair.

## Assertion

Flipping `supports.color`'s sub-flags cannot change this block's frontend markup, because
`__experimentalSkipSerialization: true` was ALREADY set on this block's `color` support before this
change (verified directly in `block.json`). Skip-serialization means WordPress core never emits a
native inline colour style into rendered markup regardless of whether the sub-flags are `true` or
`false` — the flags only control whether the editor SHOWS the corresponding native control. The
colour VALUES themselves are unchanged: the new panel rows read from and write to the exact same
`style.color.*` attribute path the native controls used, so any value a client had already set is
read back by the same `render.php` code as before.

Corroborating: `git diff --cached -- src/blocks/notice-banner/render.php` is **0 lines** — the only file
that determines this block's frontend output is byte-identical to `HEAD`.

## Live result

`npm run build` exits 0 with these changes. `check-element-manifest-conformance` returns GATE PASS
(style-defect 10/10, state-without-base 2/2) — both at the post-PR-#28 baseline, with **zero new
findings attributable to this change**. The block's own `edit.js` babel-parses clean and its
`block.json` is valid JSON.

## Why before/after doesn't apply

`render.php` has a byte-for-byte empty diff, and the mechanism that would have to carry a visual
change (native colour serialisation) was already disabled on this block before the change. There is
no "before" rendered state distinguishable from "after" to diff — the assertion above is that the
frontend is untouched, and the evidence is the empty render diff plus the pre-existing
skip-serialisation flag, not a pixel comparison of two identical states.

This is an EDITOR-surface change: what moved is which panel the client finds the control in.

## Gates

`npm run build` exit 0 · cheat-gate 18 baselined / 0 new · F5 db-consistency passes on its own merit
(post-PR-#28, no bypass token) · element-manifest GATE PASS at baseline.
