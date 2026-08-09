---
block: sgs/site-footer-row
date: 2026-08-09
source_sha: 52d4524b54d5e6c2
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright MCP against the live canary block EDITOR, footer builder post 1654 ("T1 Footer Columns"), logged in as Claude — the real row block selected in situ, inspector opened, panel contents read from the live DOM
deployed_build: build-deploy.py --target sandybrown --skip-build, 2026-08-09, verify HTTP 200 + markers present
change: D539 — container controls WIRED (this block KEEPS SGS_Container_Wrapper; the opposite remedy to sgs/nav-menu)
---

## Why this block gets the OPPOSITE remedy to nav-menu

Identical reasoning to its header sibling: `render.php:217` passes
`'responsive_model' => 'object'`, forcing `$grid_on_inner` and the `__inner` element
(`class-sgs-container-wrapper.php:525-533`, `:1906-1911`). The operator's InnerBlocks are
the direct children of `.uid>.sgs-container__inner` — the exact element the arrangement CSS
targets (`:1192`). A genuine container, so the unwired attributes are a missing-controls
gap. Nothing deleted.

## Live measurement — canary editor, real footer post

| Check | Result |
|---|---|
| Row block found in situ | `sgs/site-footer-row` (3 row blocks present in the post) |
| Stored `layout` | **grid** |
| New panel renders | **Alignment & grid** |
| Block validity | valid |

**Anti-vacuity — the panel was opened.** Contents: `Vertical alignment`, `Justify items`,
`Align content`, `Auto rows`. 6 interactive controls. Real controls, not an empty header.

## The conditional gating is proven live, in BOTH directions

This row is **grid**, and shows the grid set (`Justify items`, `Align content`,
`Auto rows`) while `Flex direction` is absent. Its header sibling at `layout: flex` shows
the exact complement (see `site-header-row-2026-08-09.md`). Two rows, two layouts, two
disjoint control sets — that pair is the positive-and-negative control. One capture alone
could not tell a working gate from a control that never renders.

## Known divergence between the two sibling blocks — flagged, NOT silently normalised

`gridTemplateColumns` is typed **`string`** on `site-header-row` and **`object`** on
`site-footer-row`. The wrapper only routes it through the live object-model path when the
value is an array (`class-sgs-container-wrapper.php:1826-1831`), so each block was wired to
its own ACTUAL declared shape rather than one being quietly rewritten to match the other.

Consequence recorded rather than fixed: on the footer, the flat siblings
`gridTemplateColumnsTablet`/`Mobile` only activate on the legacy scalar path, so once the
object attr is wired they are orphans — the same shape as `gapMobile`/`gapTablet`. Left
declared and unwired; normalising the type across the two blocks is its own decision.

## Also flagged, not acted on

`templateMode` is declared on both row blocks and referenced NOWHERE else (0 hits in the
wrapper, both `render.php` files and both `edit.js` files). Unlike `sgs/container`, where it
gates `allowedBlocks`, here it is fully inert. Left declared; deleting it was outside the
authorised scope.

## Not verified here

Frontend rendering with the NEW controls actually set — the controls render with correct
option sets, but no value was changed and saved. These attributes were already rendered by
the wrapper before this change; only the editor surface changed, so an untouched
instance's frontend is unchanged by construction.

⚠ This post reports 2 INVALID blocks in the editor — both `sgs/heading`, a block this
change never touched. Pre-existing and unrelated; recorded so a later reader does not
attribute it to this diff. All 3 row blocks in the post are valid.
