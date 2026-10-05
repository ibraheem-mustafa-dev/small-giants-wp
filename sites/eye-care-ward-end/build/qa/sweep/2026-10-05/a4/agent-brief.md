You are judging fix-register items against a whole-site measurement. You only read: never edit, create or delete a file, and run no browser, network or git command. Reading files with the Read tool, grep or `node -e` is fine.

A first pass at this was rejected as shallow: it cited any row on a big block (one product-page block holds 120 rows, each on its own element path) and gave no values. Your answers go through a validator that refuses that. Take the time each item needs.

## Inputs
- Your bundle (path below): `rules` (the five statuses, binding), `items` (`{ id, section, covers, surfaces, cells }`; `cells` are the register row: what is wrong, the fix, its type and recorded status), `surfaces` (`report`, `refs` measured), `rows` (each open difference: `surface, ref, pair, path, block, property, widths, state, kind, class, reason, values, report`). `path` is the CSS path of the exact element inside the block (`""` is the block's own root). `values` are the draft and live readings.
- To learn what a ref is, read `sites/eye-care-ward-end/build/qa/pairs/<surface>.json` (`keptPairs`: each ref's first and last words and its draft element). The hand configs `sites/eye-care-ward-end/build/qa/parity/<name>.mjs` show what each named pair measures. The surfaces' trees `sites/eye-care-ward-end/build/<surface>.tree.json` (or the tree named in `surfaces.json`) show each block's settings; a block carrying class `cr-ref-<surface>-<n>` is that ref.

## Method, for every item
1. From the item's cells, write down the exact element and property it is about (for example "the 'See all reviews' button's hover background"), and the surface.
2. Find that element: match its words against the pairing reports' first and last words, the block type, and the row `path`s (a class name in the path such as `__see-all` or `__cta` usually names it). Narrow to rows whose `path` is that element, not a wrapper around it.
3. Decide:
   - **still open**: a row on that element and that property (or the property the fix changes) differs. Cite exactly that row.
   - **clean on the walker**: the element is measured (its ref is in the surface's `refs`) and no row on it touches the property.
   - **not walker-measurable**: behaviour, entrance or load motion, keyboard, focus, a11y, content or Site Info. Hover is measured: the walker forces :hover on every pair (hover rows have `kind: "hover"`), so a hover item is still open or clean, never this.
   - **closed earlier**: the register records it closed or decided with evidence, and no row on its element contradicts it.
   - **partly measured**: the element is not among the measured refs or rows, or only some of its surfaces are measured. Say what you searched.

## Output
Only a JSON array, one entry per bundle item, `id` exactly as given:
- still open: `{ "id", "status": "still open", "evidence": { "report", "ref", "path", "property", "draft", "live", "element" } }` with `report, ref, path, property` copied exactly from one row and `draft`, `live` copied exactly from one of its `values` (same JSON type). `element` is one sentence on why that path is the element the item names.
- For checkout, bag and confirmation items (group 6 only): `{ "status": "still open", "evidence": { "walk": "sites/eye-care-ward-end/build/qa/sweep/2026-10-05/walks/<checkout|bag|confirmation>", "pair", "property", "draft", "live", "element" } }`, copied exactly from a diff in that walk's `report.json` (`runs[].pairs[<pair>].diffs[]`: `key` is the property).
- clean on the walker: `{ "report", "ref", "property", "element" }`.
- every other status: `{ "reason": "<one or two sentences, naming what you checked>" }`.
