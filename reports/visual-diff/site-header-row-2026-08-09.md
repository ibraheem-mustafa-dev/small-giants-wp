---
block: sgs/site-header-row
date: 2026-08-09
source_sha: 6bd3a2e0cd55a142
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright MCP against the live canary block EDITOR, header builder post 1655 ("T1 Header HideOnScroll"), logged in as Claude — the real row block selected in situ, inspector opened, panel contents read from the live DOM
deployed_build: build-deploy.py --target sandybrown --skip-build, 2026-08-09, verify HTTP 200 + markers present
change: D539 — container controls WIRED (this block KEEPS SGS_Container_Wrapper; the opposite remedy to sgs/nav-menu)
---

## Why this block gets the OPPOSITE remedy to nav-menu

Same symptom, different mechanism. This is a GENUINE container: it holds arbitrary
InnerBlocks with no curated palette, and it passes `'responsive_model' => 'object'`
(`render.php:222`), which FORCES `$grid_on_inner = true`
(`class-sgs-container-wrapper.php:525-533`) and FORCES the `__inner` element to render
(`:1906-1911`). So the wrapper's arrangement CSS targets `.uid>.sgs-container__inner`
(`:1192`) and the operator's own blocks ARE that element's direct children.

The controls therefore arrange exactly what the operator inserted. nav-menu failed this
test (its arrangement landed on a root whose children are the bar and the burger); this
block passes it. Nothing was deleted here — the unwired attributes were a MISSING-CONTROLS
gap, not dead weight.

## Live measurement — canary editor, real header post

| Check | Result |
|---|---|
| Row block found in situ | `sgs/site-header-row` |
| Inspector panels | Header row · **Alignment & grid** · Spacing & width (per device) · Row behaviour (Advanced) · Block Link · Visibility conditions · Advanced |
| New panel renders | **Alignment & grid** |
| Console errors | 0 |
| Block validity | valid |

**Anti-vacuity — the panel was opened, not just counted.** Contents: `Vertical alignment`
(options start / center / end / stretch) and `Flex direction` (blank / row / row-reverse /
column / column-reverse). 2 interactive controls, 310 characters of panel text. Real
controls with real option sets, not an empty header.

## The conditional gating is proven live, in BOTH directions

This row's `layout` is **flex**, and the panel correctly shows ONLY `Vertical alignment` +
`Flex direction`. The grid-only controls (`Justify items`, `Align content`, `Auto rows`)
are absent.

The sibling capture — `site-footer-row` at `layout: grid` (see
`site-footer-row-2026-08-09.md`) — shows the complement: `Justify items`, `Align content`
and `Auto rows` present, `Flex direction` gone. A single capture would not distinguish
"the gate works" from "those controls never render at all"; the pair does.

## A deviation from the build brief, accepted because it is more correct

The brief proposed treating `alignContent` per block (live on footer, inert on header
because D455 locks the header to a single non-wrapping line). The implementer instead
gated it to `layout === 'grid'` on BOTH blocks — matching what `sgs/container`'s own
LayoutPanel already does (verified: `{ layout === 'grid' && (` wraps that control group in
`ContainerWrapperControls.js`). `align-content` does nothing on a single-line flex row, so
the universal gate removes the dead case without a per-block carve-out. That is R-31-9
(no per-block exceptions) applied correctly against a brief that would have breached it.

## Not verified here

Frontend rendering with the NEW controls actually set. The controls were confirmed to
render and to carry correct option sets, but no value was changed and saved, so the
resulting CSS emission is unproven at first paint. The attributes were ALREADY rendered by
the wrapper before this change — only the editor surface changed — so frontend behaviour
for an untouched instance is unchanged by construction.
