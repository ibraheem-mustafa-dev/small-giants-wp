# Live verification — sgs/site-header — 2026-09-21 (Wave 3C U-1 commit 2: force-solid paints the resting background)

verdict: PASS
intent_capture_passed: true
source_sha: 8884e65b565f7829
commit_sha: 3fa812e8d (U-1 commit 3b, on top of e8c70192c commit 3 and 6eb948176 commit 2)

> `source_sha` is the `visual-report-sha.py` recipe applied to the committed bytes, at 3fa812e8d, of
> the four site-header files changed by commits e8c70192c and 3fa812e8d (`block.json`, `edit.js`,
> `render.php`, `style.css`). The commit-2 section below was certified against `render.php` at
> 6eb948176 (digest e1d8f366700f2117) (the script reads the git index, which is empty
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

---

# U-1 commit 3 and 3b: per-tier `zIndex`

Change: `sgs/site-header` gains `zIndex` (tier object of whole numbers, 0 to 99998, empty = 100). One
writer (`includes/sgs-header-z-index.php`); the sticky, float and transparent behaviours no longer carry
`z-index` in the merge. The first header WITH a value publishes `--sgs-header-z` on `:root`; the drawer
and its scrim derive from it (`min(90, max(2, header - 1))`, scrim one lower). Base `.sgs-site-header`
z-index 100 moved into a zero-specificity `:where()`.

Fixture: page 3799, slug `qa-hdr-z-index`: a real sticky `sgs/site-header` with `zIndex {desktop 10, mobile 999}`.
Browser: real headed Chrome, one window, `readyState complete`, `clientWidth` 1425 then 375.

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 6 | Desktop header z-index | PASS | fixture header `z-index 10`, `position sticky`; the template's own header (nothing authored) stays `100` |
| 7 | Publisher slot claimed by the header with a value | PASS | `:root --sgs-header-z = 10` at 1440 although the template header rendered first |
| 8 | Drawer follows the header (desktop) | PASS | `dialog#sgs-nav-drawer` computed `z-index 9` (= 10 - 1) |
| 9 | Mobile tier | PASS | header `z-index 999`, still `sticky`; `--sgs-header-z 999`; drawer `90` (capped) |
| 10 | Emitted rules | PASS | live stylesheet: `:root{--sgs-header-z:10}` and `@media (max-width:767px){ .sgs-sh-d2ce4af3.sgs-site-header{z-index:999} :root{--sgs-header-z:999} }` |
| 11 | Unit tests | PASS | `tests/php/run-header-z-index-standalone.php` 19 of 19, including negative controls (with z-index inside the merge an off tier emits `z-index:revert !important`; an empty header must not use up the publisher slot) |

Defect found and fixed during verification (commit 3b): the publisher slot was first claimed by any
header, so a template header with nothing authored would have stopped the header that has a value from
publishing. The slot is now claimed at the first emitted value (test: 3 cases in the runner).

Not measured: the non-modal drawer opened over a low-z header (the default drawer is modal, top-layer,
where z-index does not apply). The derived scale is verified by computed value only.
