# Visual diff — sgs/brand-strip — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: d6f94771193b5447

## What changed

Added a per-item `decorative` field (boolean, default `false`) to the `logos[]` repeater's
item schema — a single top-level flag would apply to every logo at once, the wrong shape
for "some logos are decorative, some aren't". `edit.js`'s `LogoEditor` gets a
`ToggleControl` next to each item's alt-text field, disabling it when set; `render.php`
blanks that item's alt and injects `aria-hidden="true"` on the `<img>` via a targeted
`preg_replace` (no native `aria-hidden` param on the shared `sgs_render_media()` helper).

## Assertion

An unset item (every existing logo) renders byte-identical (`decorative` defaults false
per item). Marking one logo decorative in a multi-logo strip affects only that item.

## Live capture — sandybrown canary, REST-created probe instance

Probe: one `sgs/brand-strip` instance with a single logo item, `decorative: true`.

| Measure | Result |
|---|---|
| Rendered `<img>` alt | `""` ✅ (authored alt text absent from output) |
| `aria-hidden="true"` on the `<img>` | ✅ |

## Detector note

`18-decorative-image-aria` correctly clears `sgs/brand-strip` — confirmed via a fresh
`node scripts/inspector-scan/run.js --json` run. The rule was extended this session to
recurse into an array attribute's `items.properties` (fixture pair:
`fixtures/18-decorative-image-aria/image-via-repeater-{with,without}-decorative/`), which
is exactly `logos[].decorative`'s shape.

## Risk

No markup change for existing content — `decorative` defaults false per item.
