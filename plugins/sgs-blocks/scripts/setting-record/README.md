# setting-record: what each block setting changes, checked against the block's own code

Each block gets a written record of where every setting paints: the part, the CSS properties, the state and the media conditions. `check.py` runs the block's real `render.php` offline for every setting (no site, no browser), compares what changes with the record both ways, and proves each placement with a CSS cascade. It replaces calibration's browser measurement (plan `.claude/plans/2026-11-21-setting-record.md`).

## Use

```
python check.py sgs/button --record path/button.json          compare: exit 1 on any add, remove, change, parts order or schema error
python check.py sgs/button --write path/button.json           write the record from the code (entries marked runner are kept)
python check.py sgs/button sgs/cart --record-dir DIR          several blocks at once, one process each (--write-dir DIR to write)
python check.py --self-test                                   plant four faults in copies of sgs/button and prove each is caught
python -m pytest tests                                        unit tests (each rule has a must-fail case)
```

Options: `--plugin P` checks another copy of the plugin; `--fixtures F` another fixtures file; `--instances PLAN.json` / `--instances-dir DIR` replays a saved instance plan instead of generating one from block.json; `--no-proof` skips the cascade proof (kinds are then left out); `--strict-parts` also fails on block.json part declarations that do not match the render; `--out DIR` is where `<block>.check.json` reports go. Renders are cached under `SGS_SETTING_RECORD_CACHE` (default `.cache/` here), keyed per block on a hash of the files its renders can read (its own folder and its fixture's blocks, every block.json, `includes/`, `assets/`, `schemas/`, `templates/`, `src/shared`, the runner), so an unchanged block re-checks in seconds and another block's stylesheet or script never throws its renders away; an `includes/` edit re-renders every block. The proof itself is not cached: about 10 s (button) to 7 min (form) a block. `SGS_SETTING_RECORD_WORKERS` sets the parallel renders.

## Reading a report

- `add`: the code changes this, the record lacks it. `remove`: the record has it, the code no longer changes it. `change`: same setting, part and properties, other state or media condition.
- `skippedRunnerCannotSee`: record entries marked `runner` (a paint the offline runner cannot see yet: a `render_block` filter, `wp_footer`), listed, never passed silently.
- `partNotNamed`: placements whose part the selector reader cannot name (`block-source-scan/selector_eval.py::analyse_selector`); kept out of records.
- `parts`: `order` is the block's printed parts in markup order (the record's `parts` must equal it); `declaredNotPrinted`, `declaredScriptBuilt` and `printedNotDeclared` compare block.json `supports.sgs.elements` with the render. These are block faults, reported always and failing only with `--strict-parts`.
- `proof`: every entry's verdict. `proved` (a property differs between the plain and the changed render on that part), `refiled` (it differs on another part, where the entry moves), `removed` (the part is drawn and the entry's own rule matches it, yet nothing differs: the evidence names the winning rule), `blind` (the proof cannot see what decides it: the part is not in the server render, the rule needs a class or attribute no render here carries, or the value reads a custom property only the theme or site defines; the entry is kept and the cause named).

## The record

`record.schema.json`: `{block, schemaVersion: 1, parts: [...], entries: [{setting, part, props, state, tiers, kind, unproved?, runner?, selector?}]}`. The key is (setting, part, props, state, tiers); `selector` is for people and never compared. `kind` is `value` when the property takes the setting's value and `switched-on` when moving the setting off its default turns the declaration on with a value of its own; the proof decides it. A blind entry carries `unproved` naming why (`script-built-part`, `part-not-rendered`, `part-printed-nowhere`, `theme-value`, `same-value-here`, `rule-needs-absent-markup`, `state-not-holdable`, `container-query`); its kind is then only a reading (`switched-on` for a true/false setting, else `value`), and a reader that acts on kind must treat it as unproven.

## Files

| File | Job |
|---|---|
| `check.py` | The CLI: run, compare, write, report |
| `instances.py` | The renders each setting needs, from block.json (attrMap, element prefix and clusters, the source scanner), with partner settings and the fixture's preconditions |
| `fixtures.json`, `fixtures/` | Per block: attributes, variants, preconditions, children, runner stand-ins (`harness`), and `post` steps that apply what a front-end script sets on load (each cites the script) |
| `render.py` | Runs `scripts/qa/lib/render-css-harness.php`, cached and in parallel |
| `diff.py` | Plain against changed render: printed rules, custom properties through relays, classes, data attributes, inline style; its CSS reader keeps a media query nested inside a rule |
| `cascade.py`, `computed.py` | The cascade (nesting, `@media`, `@layer`, specificity, held states, media conditions) and computed values (inheritance, `var()`, shorthands) |
| `vocab.py` | When two descriptions name the same thing: `flex` as its longhands, `prefers-reduced-motion: no-preference` as the normal state, a `-webkit-` twin folded onto its standard property |
| `proof.py` | The proof and the kind |
| `selftest.py` | The planted-fault self-test |

## Known limits

The offline runner does not fire `render_block` filters or `wp_footer`, its style-engine stub drops spacing, and it loads no theme CSS: those paints are `runner` entries or `blind` proof verdicts until the runner learns them (plan Task 2). Layout results (what `auto` works out to) are compared as declared values.
