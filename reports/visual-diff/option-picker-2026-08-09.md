---
block: sgs/option-picker
date: 2026-08-09
source_sha: 45b29be4ddc8d09f
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright (chromium) against the live canary block EDITOR at wp-admin/post-new.php, block inserted via wp.data, the Styles inspector tab selected by aria-label, every collapsed panel expanded, then labels and registered attributes read from the live DOM
deployed_build: build-deploy.py --target sandybrown --blocks-only, 2026-08-10, verify HTTP 200 + markers present
change: D540 — contentWidth RENAMED to width; behaviour byte-identical; 0 stored instances anywhere, so nothing to migrate
---

## What changed and why

Same defect and same remedy as `sgs/info-box`. This block dropped `SGS_Container_Wrapper` under D294
and renders block-private, pushing `width:` from `contentWidth` and `max-width:` from `maxWidth` into
the **same root-selector rule** (`render.php:347-352`) — two widths on one element, the second named
for a second layer that does not exist.

Renamed rather than deleted, to stay consistent with info-box (Bean, 2026-08-10). Unlike info-box
there was nothing to migrate: **0** theme patterns/parts and **0** canary posts set it.

## Live measurement — canary editor

| Check | Result |
|---|---|
| `contentWidth` still registered client-side | **false** |
| `width` registered | **true** |
| `maxWidth` still registered | true |
| Width controls present (Styles tab) | **`Width`, `Max-width`** |
| A control still labelled "Content width" | **false** |
| Console errors on insert + select | **0** |

## A measurement trap this run walked into — recorded because it nearly produced a false finding

The first two capture attempts reported **no width controls at all**, which reads exactly like "the
rename broke the control". It had not. Two separate DOM facts hid it:

1. A collapsed `components-panel__body` keeps its children out of the DOM entirely, so reading
   before expanding measures the accordion, not the control.
2. This block's width controls live in `InspectorControls group="styles"` (`edit.js:508`) — the
   **Styles** tab, not the one shown by default. The tab buttons carry **no text** (`textContent` is
   `""`); they are identified only by `aria-label`. A selector matching on visible text found
   nothing and silently "proved" absence.

Both were fixed in the capture, not the block: expand every `aria-expanded="false"` control, then
select the tab by `aria-label`, then read. This is the
`a-probe-that-never-reaches-the-effect-measures-the-probe` shape — an absence manufactured by the
instrument, indistinguishable from a real one until the instrument itself is checked.

## Render impact

None possible: the attribute is set by nothing, anywhere. The rename is a naming correction with no
stored consumer.
