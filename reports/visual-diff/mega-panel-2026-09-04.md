# Visual diff — sgs/mega-panel — SgsBorderControl migration (B4) — 2026-09-04

verdict: PASS (live-verified, positive+negative controls confirmed 2026-09-04)
intent_capture_passed: true
source_sha: d62617f8d8b60255

B4 — migrate mega-panel's root border to the shared `SgsBorderControl` pattern. The
ANOMALY case in `survey-border-control-migration.py`: the panel already had a client
border colour (+gradient), but width/style were HARDCODED in render.php
(`border:1px solid var(--sgs-mm-panel-border);`, no attributes existed at all).

## Assertions (stated before measuring)

1. **A pre-existing/fresh instance with no explicit `borderWidth`/`borderStyle` renders
   an UNCHANGED 1px-solid border** — the new attrs default to values (`{}` /
   `'solid'`) that render.php resolves to the exact same `1px solid` shorthand the old
   hardcoded rule produced, for every side.
2. **An operator can now set a real border width/style** (a genuine capability
   addition — SgsBorderControl always renders a width box, there is no colour+radius
   -only composition) — a positive-control instance with an explicit non-default width
   must render that width, not the 1px fallback.
3. **A `borderStyle: 'none'`-equivalent instance (via width forced to 0 + style none)
   renders NO border** — G5 (a style with no width must never fall back to the CSS
   initial `medium` ~3px), gated in render.php by an explicit `$has_border_width`
   condition enclosing the emission.
4. **Radius is unaffected** — the existing scalar `borderRadius` attribute/control is
   untouched by this migration (radius was deliberately NOT wired into
   `SgsBorderControl`, see commit message).

## Live result

`node scripts/qa/check-border-roundtrip.js --blocks sgs/mega-panel` against the
sandybrown canary, run twice:

- **Pre-deploy** (old code still live): FAIL — `border-top-width = 1px, expected 4px`
  on the positive-width probe, and the negative control (`borderStyle:none`) still
  painted `1px solid`. This is EXPECTED and is itself evidence the new attrs did not
  exist server-side yet (WP silently drops attributes a live block.json hasn't
  declared) — not a defect in the migration.
- **Post-deploy** (`build-deploy.py --target sandybrown --blocks-only`, commit
  `20bcb52b8`): **PASS** — `positive[4px solid rgb(230, 138, 149)] · control[0px none
  rgb(230, 138, 149)] · expected colour rgb(230, 138, 149)`. Assertions 2 and 3
  confirmed directly on the live frontend.

## Update — default-instance parity + editor-path confirmed (2026-09-04, post-deploy)

Two further live checks, both against the deployed canary:

1. **Default-instance parity (assertion 1)** — `POST
   /wp-json/wp/v2/block-renderer/sgs/mega-panel?context=edit` with `attributes: {}`
   (no `borderWidth`/`borderStyle` set) returns
   `border-style:solid;border-width:1px 1px 1px 1px;border-color:var(--sgs-mm-panel-border);`
   — byte-identical in effect to the pre-migration hardcoded
   `border:1px solid var(--sgs-mm-panel-border);` shorthand it replaced.
2. **Editor render path (assertion 2, editor-adjacent)** — the same endpoint with
   `borderWidth:{top:6px,right:6px,bottom:6px,left:6px}, borderStyle:'dashed'`
   returns `border-style:dashed;border-width:6px 6px 6px 6px;border-color:...` — this
   is the SAME `render.php` invocation the block editor's native preview calls
   (WP core's `ServerSideRender`/block-renderer REST route), so it proves the
   editor-facing render path resolves the new attrs correctly.

**Interactive editor-canvas screenshot NOT captured** — the shared Playwright MCP
browser was locked by another concurrent session (`Error: Browser is already in use`)
on 3 attempts; per the task brief this is reported honestly rather than forced or
fabricated. The block-renderer REST checks above exercise the identical PHP render
path the editor canvas calls, so the remaining uncaptured risk is narrow (React
control-wiring/UI-only, e.g. whether `SgsBorderControl`'s width box actually calls
`setAttributes` on drag) — the `edit.js` prop wiring for that mirrors
`sgs/accordion-item`'s already-proven-live pattern exactly (same
`widthValues`/`onWidthChange`/`styleValue`/`onStyleChange` shape).

## Why before/after (pixel diff) doesn't apply

The default-instance claim (assertion 1) is a "renders identically" claim, which a
computed-style positive/negative-control probe proves more directly than a pixel
diff — `check-border-roundtrip.js` measures `border-top-width`/`border-style`/
`border-color` on the live rendered `.wp-block-sgs-mega-panel` element for both a
default instance and an explicit-value instance, which is the exact property set this
migration touches. A full-page pixel diff would need a bespoke fixture page and would
not add evidence beyond what the roundtrip probe already measures directly.
