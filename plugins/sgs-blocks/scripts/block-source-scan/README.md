# Block source scanner

Reads a block's source with nothing rendered and works out its parts (the classes and tags it prints) and where each of its settings paints: which part, which CSS property, in which state and at which screen tier. Calibration (`scripts/computed-route/calibrate.mjs`) measures the same facts on a live page; it stays the reference, and nothing in the route reads the scanner's output yet.

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

| `reference.py` | The measured reference: a calibration slot map and default paint files turned into part keys (zones host, shared, child, outside), measured placements (part x property, state, widths) and measured effects | | `reference-faults.json` | Known faults of the calibration reader (the `::first-letter` on faded text, the `::placeholder` on every input), excluded from the score with their reason; delete an entry when the reader is fixed | | `score.py` | The score: `python score.py --manifest <manifest.json> --scans <folder> --out <folder> [block ...]`; the manifest maps each block to `{"slotmap": path, "paint": [paths]}`; a missing scan (a child block's) is made on the spot |

## The score

Every placement counts, not the best one. A scan placement is expanded to one item per (part, property) and judged right only when part, property and state agree and its tier does not contradict the widths calibration measured (`score.py::judge`); width and height are separate properties, a pseudo-element layer is a part of its own, a longhand folds to the shorthand the slot map uses (`reference.py::canon_props`). Items are split by evidence: code, a declaration with a `selector`, and a hint (a declared element with no `selector`, whose part is the guessed `sgs-<block>__<key>`). Per block and in total it reports:
- settings: code alone clean (every measured placement covered, nothing wrong) and any right; settings right only through a declaration or a hint; item precision (right against wrong; unknown parts are reported, not counted wrong); measured placements covered by code;
- parts: matched by class per zone (host, shared, child block, outside the root), tag-only matches in their own column, scan parts never measured split into declared-only, stylesheet-only, conditional and unconditional;
- settings neither side places, each with whether front-end source names it; unit companions (`fooUnit` beside `foo`) folded into their value.

## Output (`<block>.scan.json`)

- `parts`: token -> owner (`host`, `block:<name>`, `shared`), origins, tags, where printed, loop and condition context, the settings that decide whether it prints.
- `settings`: setting -> placements, each `{part, props, state, mechanism, tiers?, where?, selector?}`. A placement from block.json `supports.sgs.elements` has mechanism `declared-attrMap` and `declaredSelector` (false when the element states no `selector`, so its part is the derived `sgs-<block>__<key>` guess).
- `unread`: known unknowns (markup from WordPress or another block, class names built at run time, helper prefixes not stated as literals, calls past the depth limit).

## Environment

The CSS property vocabulary comes from the seeder (`helper_maps.py::css_vocabulary`), which adds `node_modules/known-css-properties` when installed. Without it, properties no block stylesheet declares (`-webkit-text-stroke-color`, `mask-composite`) drop out of helper contracts and the scan reads fewer placements. Run it in a checkout with `node_modules` installed.
