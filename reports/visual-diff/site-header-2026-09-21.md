# Live verification — sgs/site-header — 2026-09-21 (Wave 3C U-1 commit 2: force-solid paints the resting background)

verdict: PASS
intent_capture_passed: true
source_sha: ad9ea4b53fc723ea
commit_sha: 60d8905f0 (U-1 commit 4a fix, on top of bf2200abd 4a, 3fa812e8d 3b, e8c70192c 3 and 6eb948176 2)

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

---

# U-1 commit 4a: shared surface ground (blur, saturate, fill opacity); `backdropBlur` renamed `surfaceBlur`

Change: `includes/helpers-surface-ground.php` (blur and saturate declarations, fill translucency), the container
wrapper emits `backdrop-filter` for any block that declares `surfaceBlur` / `surfaceSaturate`, the header's own
blur emission is removed (one writer), `sgs_header_float_single_length` moves to `helpers-css-safety.php` as
`sgs_css_single_length_value` (council B1), and the header gains `surfaceSaturate` and `surfaceOpacity` with a
shared `SurfaceGroundControls` inspector component and canvas preview. Fixtures: page 3826 `qa-hdr-surface`
(`backgroundColour #fcfbf8`, `surfaceOpacity 0.86`, `surfaceBlur 18px`, `surfaceSaturate 140`) and 3734 (pill,
`surfaceBlur 8px`). Real headed Chrome, one window, page fully loaded.

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 12 | Wrapper emits blur and saturate | PASS | 3826: computed `backdrop-filter saturate(1.4) blur(18px)`; live rule `.sgs-container-5390ab33{backdrop-filter:saturate(140%) blur(18px)}` |
| 13 | Fill translucency reaches the page | PASS | 3826: computed `background-color color(srgb 0.988235 0.984314 0.972549 / 0.86)` (= #fcfbf8 at 86%) |
| 14 | Defect found and fixed | PASS | first deploy: the style engine DROPPED the `color-mix()` fill (no background rule at all, fill computed `rgba(0,0,0,0)`); fix (60d8905f0) writes a translucent fill as its own scoped rule; re-measured as row 13 |
| 15 | Renamed attribute still blurs the pill | PASS | 3734: header computed `backdrop-filter blur(8px)`, `position sticky` |
| 16 | Council F5: mega panel inside a blurred header | PASS | 3734, real hover on Brands: `aria-expanded true`, panel `position absolute`, rect [152,262,1120,485] wholly inside the viewport, `elementFromPoint` at the panel centre is inside the panel |
| 17 | Unit tests | PASS | `tests/php/run-surface-ground-standalone.php` 23 of 23 (helper bounds, `0` legal, two-value blur rejected, gradient and empty fill left alone, orphan token; wrapper emits with the attributes and not without); against the previous wrapper the three wrapper cases FAIL (negative control) |
| 18 | Pre-deploy stored-content audit | PASS | first deploy ABORTED (`undeclared-attr backdropBlur` in stored content, the pill fixture); fixture rebuilt with the new name, audit 0 NEW HIGH, deploy exit 0 |

Not measured: a dropdown and a non-modal drawer open inside a blurred header (council F5 asks for both before any
other block adopts blur; only the mega panel was checked); the editor canvas is mirrored (blur, saturate,
opacity) but not opened in the block editor in this pass; a header with a gradient fill (opacity is left alone by design).
