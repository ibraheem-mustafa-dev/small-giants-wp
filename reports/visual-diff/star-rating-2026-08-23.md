# Visual diff — sgs/star-rating — 2026-08-23

verdict: PASS
intent_capture_passed: true
source_sha: 40b0384af9d622f8

## What changed

Two dead colour controls on the Trustpilot style variations. Neither is visible to
rule 31, which is a JS-only scanner and cannot read `render.php`.

**1 — `is-style-trustpilot` silently discarded the client's star colour.**
`render.php` assigned the brand green UNCONDITIONALLY whenever the flat preset was
active:

```php
if ( $is_tp_flat ) {
    $star_colour = '#00B67A';
}
```

The control existed, the client picked a colour, and nothing happened — the
dead-control defect D751 closed for six blocks. Brand green is now the preset's
DEFAULT: it applies only while `starColour` still holds its declared default, and an
explicit client choice wins.

⚠ The first attempt gated on `! isset( $attributes['starColour'] )`. That is WRONG:
`WP_Block_Type::prepare_attributes_for_render()` populates every missing attribute
from its block.json default BEFORE `render_callback` runs, so `isset()` is always
true and the preset would have gone green-less with no error. Gated on the declared
default value instead.

**2 — `is-style-trustpilot-official` showed two controls that paint nothing.**
On that style `render.php` emits Trustpilot's own `<img>` badge and no inline
`<svg>` stars at all, so `starColour`/`emptyColour` have no node to paint.
`edit.js` now gates the whole `SgsColourPanel` on the same condition, mirroring
`render.php:46-48` exactly — same split, same `in_array` semantics, same
official-wins-over-flat precedence — so the two cannot drift.

## Intent capture — live, on the canary, WITH its negative control

Page 2715, `/u2-star-rating-intent-capture/`, deployed from this working tree via
`build-deploy.py --target sandybrown --payload plugins/sgs-blocks/src/blocks/star-rating/`.

Three instances on one page. Read from the live rendered HTML — the `fill` is an SVG
presentation attribute written per instance, so it is directly observable and needs no
computed-style step:

| # | Instance | Asserted | Live `fill` | |
|---|---|---|---|---|
| 1 | `is-style-trustpilot`, colour untouched | brand green (preset default) | `#00B67A` ×5 | PASS |
| 2 | `is-style-trustpilot`, `starColour: "primary"` | **client's colour, NOT green** | `var(--wp--preset--color--primary)` ×5 | PASS |
| 3 | default style, colour untouched | accent; guard must NOT fire | `var(--wp--preset--color--accent)` ×5 | PASS |

Instance 2 IS the fix: before this change it rendered `#00B67A`, discarding the
client's choice. Instance 3 is the negative control — it proves the guard is
conditional rather than simply removed; a fix that made every instance non-green
would pass instance 2 and fail here.

⚠ The first probe reported "0 star-rating instances found" — a broken regex (a
non-greedy `</div>` match cannot span nested markup), not a broken page. Re-read
from the raw HTML by counting `fill="…"` directly. A no-evidence result is a broken
probe until proven otherwise.

## Not covered by this report

The editor CANVAS still draws SVG stars on `is-style-trustpilot-official` while the
frontend draws the badge. Pre-existing, and `check-editor-render-parity.js` does not
catch it: its SHAPE A asks whether an attribute is referenced in the JSX return body,
not whether the canvas BRANCHES on style variations the way `render.php` does. That
is a gap in the gate, not only in this block. Recorded, not fixed here — the honest
options (a canvas placeholder vs `ServerSideRender`, this repo's canonical answer to
preview drift) differ in blast radius and that is a design call.
