# Visual-diff report — sgs/container (exact-match width model, widthMode retired) — 2026-06-18

verdict: PASS first_paint_capture_passed: true block: container change: retire widthMode → 3 independent layers (align / maxWidth literal / contentWidth token-or-literal); token rename narrow=content-size, default=wide-size decision: D230

## What changed
- `class-sgs-container-wrapper.php`: removed all `widthMode` rendering. OUTER box = literal `maxWidth` only (or `align:full/wide` → `alignfull/alignwide` WP-native breakout). INNER band = `contentWidth` resolved as token (`narrow`→`var(--wp--style--global--content-size)`, `default`→`var(--wp--style--global--wide-size)`, `full`→no cap) or literal. Responsive `maxWidthTablet/Mobile` deferred to `.uid` rule when tiers exist (so `@media` wins — the specificity fix). contentWidth base sanitiser unified onto `$sgs_css_length`.
- `convert.py`: full-bleed section → `align:"full"` (was `widthMode:"full"`); outer max-width → `maxWidth` literal (no 5% snap, no `int()` truncation); slug-None section with no band → `contentWidth:"full"` (fidelity).
- `container/block.json`: removed `widthMode*` + `customWidth*`; `contentWidth` default `""` → `"default"`.
- `container/components/ContainerWrapperControls.js` + `edit.js`: UnitControl-style number+unit controls for `maxWidth`/`contentWidth`; breakout via WP-native align toolbar; widthMode dropdown removed.
- `container/style.css`: deleted dead `.sgs-container--width-content/wide/full` keyword rules.

## Verification evidence (LIVE — canary, page /sgs-width-v04-test/, 1440px, fonts loaded)
Browser computed-style via Playwright (`document.fonts.ready` awaited → first paint, FOUT-free):
- **`align:full`** → class `alignfull`, outer `max-width:none`, breaks out to **1425px** (full viewport). ✅ breakout.
- **`maxWidth:800px`** → outer computed `max-width:800px`, rendered width **exactly 800px**. ✅ exact-match outer literal.
- **`contentWidth:default`** → inner band computed `max-width:1400px` (theme wide-size). ✅ default→wide-size.
- **`contentWidth:narrow`** → inner band computed `max-width:1200px` (theme content-size). ✅ narrow→content-size. Rename confirmed: default (1400) > narrow (1200).
- Also verified via `do_blocks()` SSR render: `contentWidth:1100px` → `max-width:1100px` (literal); `maxWidth:62.5rem` → `max-width:62.5rem` (decimal preserved); responsive `maxWidthMobile:600px` → `@media(max-width:767px){.uid{max-width:600px}}` wins below 767px.
- Screenshot: `reports/visual-diff/width-v04-1440.png` (3 containers at distinct widths).

## Conformance + build
- Gate A golden harness: 43 passed (6 goldens rebaselined `widthMode:"full"`→`align:"full"` only — verified no other drift).
- converter_v2 unit suite: 41 passed.
- `npm run build`: green, all prebuild guards pass (dead-control clean after customWidth/widthMode control removal).
- `php -l`: clean.

## first-paint capture
`document.fonts.status === 'loaded'` confirmed true before the computed-style read — values are not a FOUT artefact.

## v0.5 follow-up (same day, D231) — content-band token rename + default-full
The live theme's content-size=1200 / wide-size=1400 (not the assumed 780/1200), so the token labels were corrected and the default changed:
- `normal` → content-size (was `narrow`); `wide` → wide-size (was `default`); `full` → no cap.
- `contentWidth` default `"default"` → `"full"` (blank → content fills the outer maxWidth, no imposed band — also resolves the earlier outer-800+1200-band nuance).
- Live-verified on the deployed wrapper (do_blocks): `normal`→`var(--content-size,1200px)`, `wide`→`var(--wide-size,1400px)`, `full`→no cap, **blank→no cap (default full)**, `900px`→`max-width:900px`. The browser computed-style of these vars was Playwright-proven in the v0.4 capture above (identical resolution path; only token keys + default changed). 29 vestigial `widthMode` block.json declarations + 8 stale render.php comments swept (non-visual).

## Process
Designed via /brainstorming → /adversarial-council (caught a fatal maxWidth-occupied premise pre-build) → Bean design-gate (4 iterations, model evolved to v0.4) → SDD build (subagents implement, Opus orchestrates) → /qc-council (caught a responsive-specificity WRITTEN-not-LANDED bug pre-commit) → this live LANDED verify.
