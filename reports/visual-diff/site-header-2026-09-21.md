# Live verification — sgs/site-header — 2026-09-21 (Wave 3C U-1 commit 2: force-solid paints the resting background)

verdict: PASS
intent_capture_passed: true
source_sha: e1d8f366700f2117
commit_sha: 6eb948176 (fix(site-header): force-solid tier paints the header's resting background through the merge)

> `source_sha` is the `visual-report-sha.py` recipe applied to the committed bytes of
> `src/blocks/site-header/render.php` in 6eb948176 (the script reads the git index, which is empty
> after the commit, so it was recomputed from the commit with the same recipe).

## Environment and method

| Item | Value |
|---|---|
| Site | sandybrown canary, blocks plugin deployed with `build-deploy.py --target sandybrown --blocks-only --skip-build` (exit 0, live motion probes green) |
| Fixture | page 3790, slug `qa-hdr-force-solid`, built by `scripts/nav-qa/build-header-fixtures.py --only qa-hdr-force-solid`: a real `sgs/site-header` with `headerTransparent {desktop: on}` and `contrastSafe {mobile: force-solid}` |
| Browser | real headed Chrome (chrome-devtools MCP), one window, page fully loaded (`readyState complete`), viewport set with `emulate` (1440x900, then `375x844x2,mobile,touch`) |
| Note | the page carries two headers (the template's active header and the fixture's in-content header); all measurements read the fixture header by its `sgs-sh-e113c9f0` uid |

## Checks

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 1 | Desktop is still transparent | PASS | `background-color rgba(0, 0, 0, 0)`, `position absolute`, `z-index 100` |
| 2 | Mobile (375 wide, `clientWidth` 375) is solid | PASS | `background-color rgb(251, 243, 220)`, `background-image none` (sandybrown's surface token) |
| 3 | The emitted mobile rule is the merge's single writer | PASS | live stylesheet: `@media (max-width: 767px){ .sgs-sh-e113c9f0.sgs-site-header { background: var(--wp--preset--color--surface, currentColor) !important; position: revert !important; top: revert !important; left: revert !important; right: revert !important; z-index: revert !important; } }` |
| 4 | Negative control on the live element | PASS | applying `background: revert !important` (what the merge emitted before) to the same element computes to `rgba(0, 0, 0, 0)`; removing it restores `rgb(251, 243, 220)` |
| 5 | Unit test, same scenario | PASS | `tests/php/run-header-force-solid-standalone.php`: 11 of 11, including two negative controls that fail without the merge entry (`background:revert !important` at mobile, no solid colour) |

## Not measured

The header's own colour and gradient variants of the force-solid fill are covered by the unit test only
(no fixture sets a gradient). Bean's eye is not asked for on this commit.
