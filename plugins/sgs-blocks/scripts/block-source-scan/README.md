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

## Output (`<block>.scan.json`)

- `parts`: token -> owner (`host`, `block:<name>`, `shared`), origins, tags, where printed, loop and condition context, the settings that decide whether it prints.
- `settings`: setting -> placements, each `{part, props, state, mechanism, tiers?, where?, selector?}`. A placement from block.json `supports.sgs.elements` has mechanism `declared-attrMap` and `declaredSelector` (false when the element states no `selector`, so its part is the derived `sgs-<block>__<key>` guess).
- `unread`: known unknowns (markup from WordPress or another block, class names built at run time, helper prefixes not stated as literals, calls past the depth limit).

## Environment

The CSS property vocabulary comes from the seeder (`helper_maps.py::css_vocabulary`), which adds `node_modules/known-css-properties` when installed. Without it, properties no block stylesheet declares (`-webkit-text-stroke-color`, `mask-composite`) drop out of helper contracts and the scan reads fewer placements. Run it in a checkout with `node_modules` installed.
