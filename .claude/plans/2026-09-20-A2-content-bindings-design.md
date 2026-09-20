# A2: content bindings (design for approval, 2026-09-20)

Status: BUILT (D1134); approved by Bean 2026-09-20. Follows A1 (D1132). Two changes from this design while building: A2a reads the values from the draft's own script (the same reader that builds the saved map) rather than the saved map file, and reads only its `text/x-dc` script; A2b also removes a branch the runtime did not render for a row (hidden presence marker inside every `<sc-if>`), which the design had left to A3, because expansion otherwise multiplied raw placeholders (4 to 66). Parent plan: `2026-09-20-draft-standardisation-plan.md`.

## Measured starting point

Run `eye-care-ward-end-eye-care-birmingham-2026-09-20-201202` (v2 bundle, A1 on): 116 raw `{{ }}` occurrences, 33 names, all in text and labels.
Command: parse `stage-4.json`, collect every `block_markup`, regex `\{\{\s*([^}]*?)\s*\}\}`.

| Group | Names (occurrences) | Where the value lives |
|---|---|---|
| Site link | `gmbHref` (8) | a string constant in the draft script (`gmbHref:'https://share.google/...'`); the saved `site-info-placeholder-map.json` already says it is Site Info `socials.google` |
| Home-page copy in loops | `t.text` (ticker), `b.name` (brand marquee), `r.title/body/no` (reasons), `s.name` (shape tiles), `r.text/who/initial/meta/date` (reviews) | `static TICKER / BRANDS / REASONS / SHAPES / REVIEWS` arrays; the draft's render turns each row into an item object |
| Overlay and flow copy | `o.*` (choose-your-lenses options), `l.*` (mega menu lenses), `m.*`, `cur.*`, `it.*` (bag), `r.k/r.v` (running total), `lensPreviewNote`, `curSize`, `lensTotalLabel` | runtime state (nothing selected, empty bag) or an overlay that is not part of the page |

## Why the current resolver does not clear the loop copy

`orchestrator/js_content_resolver.py` (FR-31-26) renders the draft in a real browser and splices the result back. It skips a loop unless (a) the item body has NO literal text and (b) at most one field is used (`find_unresolved_sc_fors`, `_simple_shape_fields`). Of the 38 `<sc-for>` loops in the draft only the ticker passes both gates; reasons (3 fields), reviews (7 fields, and literal labels), shape tiles (9 fields) are all skipped. It is also off by default. The evaluator from A1 cannot substitute here: it refuses `this`, `new`, functions and state, and these arrays are built from `C.` class statics with `.map`.

## Design

**A2a. Site link values (small, no converter change).** New string-level pass in the orchestrator, next to Stage -1.4. For every name in the client's saved placeholder map, read the value with the existing `business_info` extractor (same call that built the map; a value only counts if it passes its shape check) and replace `{{ name }}` in the template part of the run copy with it. No map or no name in the map: byte-identical. Where a whole block attribute is one such name, `metadata.bindings` with the `sgs/site-info` source is the right emit (source exists: `includes/class-sgs-site-info-binding.php`); Eye Care has no such instance today, so it is NOT built now.

**A2b. Multi-field loop items (extend the existing resolver, default on).**
1. Eligibility: any `<sc-for>` with at least one item-variable mustache in text or in an attribute. Drop the "no literal text" and "one field" gates. Loops that render zero items at load (empty bag, nothing selected) are skipped WITH a gap row saying so.
2. Capture per field, not per element. In the temporary served copy only, wrap each text-position `{{ r.title }}` in `<span data-sgs-f="rN.k">` and add `data-sgs-a-<attr>-k="{{ ... }}"` beside each attribute-position mustache. The runtime clones the item per row, so reading those markers gives every field value for every item, keyed by marker, not by document order.
3. Splice: replace the `<sc-for>` with N copies of the ORIGINAL body (string level, same discipline as `dc_import_resolver.py`), each mustache replaced by its captured, HTML-escaped value. Style bindings inside the item (`o.bg`) are captured the same way, so they become plain values before the converter reads them.
4. Anything not captured (a branch that did not render, a computed expression that produced nothing) stays raw and becomes a gap row naming loop, item index and field. Nothing silent.
5. Default: on whenever the draft contains `<sc-for>`; `--no-resolve-js-content` opts out. Fail-soft as today: any failure returns the original HTML and logs a reason.

**Regression safety.** A static or BEM draft has no `<sc-for>`, so both passes return the same string. Proved by Mama's byte-identical in place (30,319 characters, 9 sections), as in A1.

## Not in A2
- Ticker container detection (which block holds the repeated items): its own design gate, next.
- `<sc-if>` branch choice, `style-hover`, overlays and flow entities: A3, A4 and Track D. The overlay and flow names above stay gap rows until then.

## Done means (each checked on the live Eye Care page, rule 5)
1. `gmbHref` occurrences in emitted markup: 8 to 0; link value equals the draft's.
2. Each REASONS title, each of the 13 REVIEWS names, each SHAPES name, each brand name and every ticker text is in `block_markup` and in the live page's `innerText`; item counts equal the arrays' lengths.
3. Raw `{{ }}` in emitted markup drops from 116 to the overlay and flow set only; every remaining one has a gap row.
4. Mama's markup identical; full test suite green; each new rule has a planted-violation negative control.
