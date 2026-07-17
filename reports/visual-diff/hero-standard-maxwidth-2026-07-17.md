# Visual-diff — sgs/hero standard-variant max-width hardcode drop (2026-07-17)

verdict: PASS
first_paint_capture_passed: true

## Problem (container-block hardcode audit #1, High)
`plugins/sgs-blocks/src/blocks/hero/style.css:180` — the standard hero content band read
`max-width: var(--wp--style--global--wide-size, 1200px)`. The `1200px` fallback is a
hardcode (R-31-1 violation) AND mismatched: it reads the `wide-size` token but falls back
to a `content-size`-magnitude value (theme.json defines `wideSize: 1400px`,
`contentSize: 1200px`). On a client whose theme.json omits `wideSize`, the band would
silently cap at 1200px instead of falling through to full-width per the composite-mirror
"absence → full-width" rule.

## Fix (universal, shared block — no per-site patch)
```css
.sgs-hero--standard .sgs-hero__content {
	max-width: var(--wp--style--global--wide-size);
}
```
Drops the px fallback so the theme.json token is the sole source. Same pattern as the
already-landed split-variant render.php band fix.

## What IS verified (machine evidence)
- theme.json:297-298 read directly: `contentSize 1200px`, `wideSize 1400px` — tokens exist,
  so WP populates `--wp--style--global--wide-size` on the live site → render-neutral there. ✅
- Grep confirmed exactly 2 instances of this fallback pattern in `src/` (hero + mega-menu);
  no other instance left behind (comprehensive-fix rule). ✅
- Deployed live via `build-deploy.py --blocks-only` (all prebuild gates green;
  HTTP 200 verify; `.bak` rollback kept). CDN cleared. ✅
- Live DOM at 1440 (`palestine-lives.org`, page 13 / Indus front page):
  `scrollWidth === clientWidth` (1425 = 1425) → **no horizontal overflow**. ✅
- The Indus hero is the SPLIT variant (`sgs-hero--split`); `.sgs-hero--standard` is NOT
  present on the page (`standardHeroPresent: false`) → the edited selector cannot regress
  this page. Split-content max-width correctly `none`. ✅
- 0 console errors.
- First-paint capture: `.playwright-mcp/hardcode-fix-firstpaint-1440-2026-07-17.png`. ✅

## Visible change on Indus
None (standard variant absent; on any site with `wideSize` defined the render is identical).
This is framework-hygiene / robustness — correct behaviour surfaces only on a client theme
that omits the token, where the band now correctly falls through to full-width.
