# Block source scanner

Reads a block's source with nothing rendered and works out its parts (the classes and tags it prints) and where each of its settings paints: which part, which CSS property, in which state and at which screen tier. The setting record (`../setting-record/`) builds on it and reuses its selector reader, stylesheet reader and helper index; the route reads where each setting paints from that record, not from the scanner's own output. The scorer compares the scan with a measured reference (slot maps and default paints) that the retired calibration wrote and no command writes now.

Offline only: it reads `src/blocks/<block>/` (block.json, render.php and the PHP files it requires, the functions they call in `includes/` and in block folders, view.js and its imports, the block's stylesheets). It writes no database and touches no site.

## Files

| File | Job |
|---|---|
| `scan.py` | The `Scan` class and the command line: `python scan.py --out <folder> <block-folder> [...]` writes `<folder>/<block>.scan.json` |
| `common.py` | Paths, class-token rules, and the seeder modules reused by import (`behavioural-analyser/extract-signatures.py`'s comment stripper and helper contracts, `php_source_index.py`, `php_preprocess.py`) |
| `php_lex.py` | PHP string and inline-HTML segments, code mask, brace frames, the condition or loop around a position |
| `js_lex.py` | JavaScript string and template literals, comment stripping |
| `css_read.py` | Stylesheet rules, selector lists, the part a selector styles |
| `values.py` | Which settings a PHP expression carries (direct reads and variables, several hops) |
| `parts.py` | `PartsReader`: printed classes and tags, the call graph through `includes/`, script-built parts, stylesheet-only and declared-only parts, and the flags for regions it cannot read |
| `settings.py` | `SettingsReader`: setting placements by mechanism (listed in its docstring) |

| `selector_eval.py` | The selector evaluator: what a PHP expression can hold (concatenation, interpolation, earlier assignments under their conditions, parameters bound per call with their defaults, array literals by key, `array_map` closures over a selector list, helper returns), the CSS rules such a value writes (`css_emissions`), and the part, state and pseudo-element a selector names (`analyse_selector`); what it cannot work out is `unknown` with the expression and reason | | `rules.py` | `RulesReader`: rules written from a block file's top level (helpers read through the call that reaches them), helper selector arguments resolved through the evaluator, and the precedence rule (code outranks a declaration; a declared element with no `selector` is a hint kept in `hints`, never placing a setting alone; an unknown selector stays `part: null`, never the root) | | `reference.py` | The measured reference: a slot map and default paint files the retired calibration wrote (no command writes them now), turned into part keys (zones host, shared, child, outside), measured placements (part x property, state, widths) and measured effects | | `reference-faults.json` | Known faults of the retired calibration reader (the `::first-letter` on faded text, the `::placeholder` on every input), excluded from the score with their reason; delete an entry when the reader is fixed | | `score.py` | The score: `python score.py --manifest <manifest.json> --scans <folder> --out <folder> [block ...]`; the manifest maps each block to `{"slotmap": path, "paint": [paths]}`; a missing scan (a child block's) is made on the spot |

## The score

Every placement counts, not the best one. A scan placement is expanded to one item per (part, property) and judged right only when part, property and state agree and its tier does not contradict the widths the reference measured (`score.py::judge`); width and height are separate properties, a pseudo-element layer is a part of its own, a longhand folds to the shorthand the reference's slot map uses (`reference.py::canon_props`). Items are split by evidence: code, a declaration with a `selector`, and a hint (a declared element with no `selector`, whose part is the guessed `sgs-<block>__<key>`). Per block and in total it reports:
- settings: code alone clean (every measured placement covered, nothing wrong) and any right; settings right only through a declaration or a hint; item precision (right against wrong; unknown parts are reported, not counted wrong); measured placements covered by code;
- parts: matched by class per zone (host, shared, child block, outside the root), tag-only matches in their own column, scan parts never measured split into declared-only, stylesheet-only, conditional and unconditional;
- settings neither side places, each with whether front-end source names it; unit companions (`fooUnit` beside `foo`) folded into their value.

## Output (`<block>.scan.json`)

- `parts`: token -> owner (`host`, `block:<name>`, `shared`), origins, tags, where printed, loop and condition context, the settings that decide whether it prints.
- `settings`: setting -> placements, each `{part, props, state, mechanism, tiers?, where?, selector?}`. A placement from block.json `supports.sgs.elements` has mechanism `declared-attrMap` and `declaredSelector` (false when the element states no `selector`, so its part is the derived `sgs-<block>__<key>` guess).
- `switchClasses`, `dataAttrs`: the settings that decide whether a modifier class (or family) or a data attribute prints. A ` data-x` literal is read from its ternary or enclosing condition (`values.py::switch_attrs(concat=False)`); Interactivity directives (`data-wp-*`) are skipped.
- `conditionValues`: token (a part, a class or family, `data-<name>`) -> {setting: [values the code compares it against]}: every setting the token's own conditions read (the caller's only when the helper has none), each with the literals those conditions test (`=== 'x'`, `in_array`, `strpos` and friends as a sample holding the needle, `?? 'x'`), the token's own first, then every comparison anywhere in the sources read. A setting only tested for being set has an empty list. A token with two or more settings needs them together.
- `settingValues`: setting -> every value any source read compares it against (a validator helper's `in_array` is read through the argument the caller passes).
- Argument binding: a call's arguments are bound to the helper's parameters (`values.py::call_seed`), an `array( 'key' => expr )` argument per key, so `$args['body']` carries the setting passed as `body`; a helper called with different arguments is read again after the first pass (`parts.py::run_rewalks`, at most `MAX_WALKS_PER_FUNCTION`).
- `unread`: known unknowns (markup from WordPress or another block, class names built at run time, helper prefixes not stated as literals, calls past the depth limit).

## Environment

The CSS property vocabulary comes from the seeder (`helper_maps.py::css_vocabulary`), which adds `node_modules/known-css-properties` when installed. Without it, properties no block stylesheet declares (`-webkit-text-stroke-color`, `mask-composite`) drop out of helper contracts and the scan reads fewer placements. Run it in a checkout with `node_modules` installed.
