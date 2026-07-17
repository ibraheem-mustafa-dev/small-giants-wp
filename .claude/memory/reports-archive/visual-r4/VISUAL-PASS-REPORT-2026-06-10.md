# R4 Product-Template panel — mandatory admin-UI visual pass (2026-06-10)

Screenshots: `01-panel-default.png` (1440), `02-confirm-box.png` (1440, preview open), `03-panel-768.png` (768). Driven via Playwright CLI (both browser MCPs disconnected this session). Raters: orchestrator inline (D201-mechanism eye) + sonnet operator-empathy + haiku design/WCAG.

## Functional bugs caught (browser-only — invisible to every REST/one-shot gate)
1. **All buttons silently dead:** the JS `JSON.parse`d the data element's `textContent`, but PHP printed `var sgsTemplateData = {...};` inside it. Fix: pure-JSON `<script type="application/json">` element. (Same class as session-18's dead preview button.)
2. **CPT capability map broke `manage_woocommerce` SITE-WIDE** (singular meta-caps in `capabilities` — see memory `cpt-singular-meta-caps-break-the-mapped-capability-sitewide`). Every shop admin panel stopped rendering; 204 `map_meta_cap` notices. Caught because the live panel was empty; fixed to plural primitives; flood stopped (count frozen at 216).

## Layout fixes (D201 mechanism, round 3 of the same family)
WC floats panel inputs/selects as well as labels — labels rendered AFTER their inputs until `float:none` was added to the save input, apply select, import textarea and starting-price input.

## Operator-language fixes (sonnet rater's 2 blockers + 4 defects — commit f5f3449b)
Raw meta keys (`_sgs_swatch_image_id`, `_sgs_pack_k`, `_sgs_pack_sizes`) and the internal word "PREFLIGHT" removed from every operator-facing string; apply-row description de-jargoned; dry-run summary restructured (Will set up / Not carried over / Important, 65ch); import relabelled "from another site"; £ replaced with the live shop currency symbol.

## Rater findings REFUTED with evidence (left as-is)
- "Export link undiscoverable until confirm" — it appears on template *selection* (`fields-js.php:120`), not confirm.
- "Import has no success feedback" — `setMsg('sgs_template_import_msg', strings.imported)` exists; static screenshots can't show it.
- Description contrast / select placeholder styling / focus outlines — WC core admin idiom; diverging would be the inconsistency.

## Deferred polish (non-blocking)
Green "Review the preview below" hint could move inside the preview box; 768px section spacing rhythm; "(JSON)" still on the export link text (it names the downloaded file type — judged acceptable).

## uimax coverage gap (logged)
The design-intelligence DB returned 0 rows for admin template/import-export/wizard UX across `ux_guidelines`, `app_interface`, `products`; `stack_wordpress` + `stack_sgs_wordpress` tables are empty. Admin-surface UX (settings panels, import/export flows, two-step applies) is an uncovered domain — candidate for a future `/uimax ingest` pass.

## Final state
Zero console errors; labels precede inputs at 1440 + 768; 44px controls; two-step apply with plain-English consequence copy. Live on canary; awaiting Bean's R-22-13 eye on the three screenshots.
