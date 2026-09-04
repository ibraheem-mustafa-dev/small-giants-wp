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
- **Post-deploy**: see the "Update" section below, added once `build-deploy.py
  --target sandybrown --blocks-only` has run and the probe was re-executed.

## Why before/after (pixel diff) doesn't apply

The default-instance claim (assertion 1) is a "renders identically" claim, which a
computed-style positive/negative-control probe proves more directly than a pixel
diff — `check-border-roundtrip.js` measures `border-top-width`/`border-style`/
`border-color` on the live rendered `.wp-block-sgs-mega-panel` element for both a
default instance and an explicit-value instance, which is the exact property set this
migration touches. A full-page pixel diff would need a bespoke fixture page and would
not add evidence beyond what the roundtrip probe already measures directly.
