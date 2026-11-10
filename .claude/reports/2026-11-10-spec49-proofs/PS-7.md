# PS-7: sizing parity, PHP and JS (2026-11-10)

**Verdict: PASS WITH CHANGES.**

Prototype twins: `sizing.php` (101 lines) and `sizing.mjs` (102 lines). Run it with `node --import ./register.mjs compare.mjs`; PHP runs under WSL with the real plugin helpers.

| Test | Measured | Result |
|---|---|---|
| PHP equals JS, all 21 `sizing-cases.json` cases | 21 of 21 | Pass |
| Both equal the fixture's declarations | 21 of 21 | Pass |
| Inheritance: tablet-only change, mobile inherits, unchanged prints nothing, `none` cancels, the file ratio cancelled on mobile, `fill` | 6 of 6, PHP equals JS and the expected output | Pass |
| `breakouts.json` `refuse.length` refused by both | 5 of 5 | Pass |
| `keep.length` kept by both | 13 of 13 | Pass |
| `refuse.any` | 14 of 16; `var(--a, ')` and `var(--a, "x)` pass the length helpers, in both twins alike | Gap in the shared helpers |

## Reuse

- **PHP:** `plugins/sgs-blocks/includes/helpers-responsive.php::sgs_resolve_tier` and `plugins/sgs-blocks/includes/helpers-css-safety.php::sgs_css_single_length_value`.
- **JS:** `src/utils/responsive.js::resolveTier` and `src/utils/css-length.js::cssSingleLengthValue`.
- **Written twice:** validation, the default-width rule, the file-ratio rule, the cancel table, and the print-only-the-difference loop.
- **Candidates for one shared JSON table:** the base and property lists, the cancel table, and the keyword allow-list.

## Spec changes (each checked by the main thread)

1. **`.js` on imports.** `src/utils/responsive.js` imports `./breakpoints` without `.js` (confirmed), so Node cannot load it, and the parity test cannot run the real cascade. Atom modules and the utils they import keep `.js` on every import.
2. **Shared length helpers.** `sgs_css_length_value` and `cssLengthValue` have no quote check (confirmed). They also turn `10` into `10px`, and pass `min(10px 20px)`. Add quote balance, bare-number refusal and the adjacent-term check to the shared length helpers, so every atom gets them. `sgs_resolved_css_value` already refuses unbalanced quotes (Task 2).
3. **Cancelling a minimum.** `min-width:none` and `min-height:none` are invalid CSS. The cancel keywords become:
   - `auto` for Height and Width
   - `natural` for Ratio, printed as `aspect-ratio:auto`
   - `none` for Max width and Max height
   - `none` for Min width and Min height, printed as `0`.
4. **Fixture split by node.** With a helper printed, Width lands on the layout node and Height on the surface, so the fixture needs a case giving both nodes their own declaration map.
