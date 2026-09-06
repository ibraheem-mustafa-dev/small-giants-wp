# Visual diff — sgs/team-member — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: 3443fd0ed094282c

## What changed

Added `photoDecorative` (boolean, default `false`) — a decorative-image toggle for the
person's photo, per detector item 18 (WCAG 2.1 AA 1.1.1). `block.json` declares the
attribute; `edit.js` adds a `ToggleControl` inside the existing "Photo" panel with
cautionary help text ("Only use this for a purely decorative graphic..."); `render.php`
blanks the alt text and adds `aria-hidden="true"` when set, in both the plain and
hover-overlay photo-wrapper branches.

## Assertion

An unset instance (the overwhelming majority — every existing team-member on the canary)
renders byte-identical: the new attribute defaults `false`, and every new line of
render.php is inside an `if ( $photo_decorative )` branch nothing else touches. When a
client explicitly turns the toggle on, the rendered `<img>`'s `alt` attribute is emptied
and the photo wrapper carries `aria-hidden="true"`.

## Live capture — sandybrown canary, REST-created probe instance

Probe: a scratch draft page (`wp/v2/pages`, deleted after capture) containing one
`sgs/team-member` instance with `photoDecorative: true` and a real photo + alt text, then
one with the same shape and `photoDecorative: false` for contrast.

| Measure | Result |
|---|---|
| `photoDecorative: true` — rendered `alt` | **`""`** ✅ (the authored alt text does not appear anywhere in the output) |
| `photoDecorative: true` — `aria-hidden` on the photo wrapper | **present** ✅ |
| `photoDecorative: false` (control) — rendered `alt` | authored alt text present, unchanged ✅ |
| Block registration on the deployed canary | `photoDecorative` confirmed present in `wp/v2/block-types/sgs/team-member` after deploy |

⚠ First capture attempt (before this session's deploy landed) genuinely failed — the
canary was still running the pre-session build, which has no `photoDecorative` attribute
at all, so WordPress silently dropped it server-side and the toggle appeared inert. Not a
code defect: confirmed via the block-types REST endpoint that the attribute was absent
pre-deploy and present post-deploy, and the identical test then passed. Recorded here so
the same false alarm isn't repeated.

## Risk

No markup change for existing content (attribute defaults false, all new render.php lines
gated). New output is scoped to instances where an operator explicitly opts in.
