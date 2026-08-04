# Content-role detectors (Spec/Track A, Step 1)

Three independent structural detectors that find which `block_attributes` rows are genuinely
content-bearing (client-editable text/image), replacing the ~60-entry hardcoded name-regex in
`plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py:1279-1316`.

Full writeup, union table, precision/recall, and blind-spot analysis:
`.claude/reports/2026-08-04-content-attr-miss-denominator.md`.

**Read-only on the DB.** These scripts only read source files; they never write to
`sgs-framework.db`. They are the seeder's detector inputs for Step 2 — re-run them, don't hand-roll
a fresh scan.

## Detector 1 — render.php output-escaping walk

PHP `token_get_all()`-based. Finds every eligible attribute reaching `esc_html`/`esc_html__`/
`esc_html_e`/`esc_textarea`/`wp_kses`(SVG)/`wp_kses_post`/`esc_url`/`esc_attr`/`esc_attr__` in any
block's `render.php` or the shared `includes/` tree (including per-block helper files like
`before-after/media-render.php`).

```bash
php detector1_render_escaping.php --glob > d1_raw.ndjson
python classify_detector1.py d1_raw.ndjson > d1_classified.ndjson
```

Two stages: the PHP tokenizer extracts raw facts (which attribute reaches which escaping call), a
Python pass classifies each into `visible-text` / `a11y-metadata` / `svg-markup` / `link-href` /
`STYLING-exclude` / `NOT-content`. Requires a PHP CLI on PATH (verified: PHP 8.5.5).

**Fixed 2026-08-04 (independent-verification correction pass, report §0):** the statement-splitter
was gluing any PHP control-structure header (`if (...) {`, `foreach (...) {`, a bare `}`, the
file's own `<?php` open tag) onto the front of the NEXT statement, breaking the assignment-anchor
regex whenever an attribute's var-tracking assignment happened to be the first statement inside a
block. `wp_kses_post` was also entirely absent from the tracked-function list. Both are fixed;
`strip_statement_glue()` now runs before every assignment match, and see `negctrl/plant_render2.php`
(scratchpad) for the regression fixture.

Known blind spots: JS-side rendering (Interactivity API/`viewScriptModule`), text escaped in a
child InnerBlocks composite rather than the parent's own render.php, `printf`/`sprintf`
multi-placeholder templates splitting the HTML attribute name from the escaped value. Full list in
the report §4.

## Detector 2 — edit.js control-binding walk

Pure Python, JSX-tag-aware (balanced-brace span matching, not a single-line regex). Finds every
eligible attribute bound to `RichText`/`PlainText`/`TextControl`/`TextareaControl` (content) vs
`ColorPicker`/`DesignTokenPicker`/`RangeControl`/`UnitControl`/`SelectControl`/`ToggleControl`/
`BoxControl` (styling) in `src/blocks/*/edit.js` and `src/components/*.js`. Resolves the
control's `value={...}` binding through direct `attributes.x` access, destructured
`const { x } = attributes;`, dynamic/template-literal keys (`` attributes[`${side}Suffix`] ``), and
a fallback-wrapped bare identifier (`value={ x || '' }` / `value={ x ?? '' }`).

```bash
python detector2_editjs_controls.py --glob > d2_raw.ndjson
```

**Fixed 2026-08-04 (independent-verification correction pass, report §0):** `value={ x || '' }`
(49 occurrences across 20 edit.js files) previously matched NONE of `extract_value_binding()`'s
branches and silently produced zero rows for the tag — no marker, no trace. Also, a
`const { ..., // Section comment\n x, ... } = attributes;` destructuring block (inline `//`
comments between names) broke `resolve_destructured_var()`'s per-comma parser, so a name following
a comment on its own line never entered the destructuring map. Both fixed; see
`negctrl/plant_edit2.js` (scratchpad) for the regression fixture.

Known blind spots: **control TYPE alone is not a reliable content signal in this codebase** — 34%
of raw `TextControl`/`TextareaControl`/`RichText` hits in the eligible-262 pool are technical
settings (form field names, refs, config), not content. Always cross-check D2 hits against D1/D3 or
a manual read before trusting a raw D2 hit as content. Object-wrapped bindings
(`value={ { url: x } }`, e.g. a `LinkControl`) are still not handled. Full list in the report §4.

## Detector 3 — i18n-wrapped-default walk

Pure Python, regex over comment-stripped source (does not depend on the PHP CLI). Finds the shape
`$attributes['key'] ?? __( 'Default copy', 'sgs-blocks' )` (and the `isset(...) ? ... : __(...)`
ternary variant). Hypothesis: a styling attribute's fallback is never i18n-wrapped. Actively hunts
for counter-examples rather than assuming near-zero false positives.

```bash
python detector3_i18n_default.py --glob > d3_raw.ndjson
python detector3_i18n_default.py --glob --audit-counterexamples   # prints suspects to stderr
```

Known blind spots: narrow recall by design (only catches this one shape — most content attrs
default to `''` with no i18n wrap at all), can't see `block.json`-declared defaults. Full list in
the report §4.

## Building the union

The report's union table (`.claude/reports/2026-08-04-content-attr-miss-denominator.md` §2) was
built by cross-referencing all three NDJSON outputs against the eligible-262 pool (query in the
report §0/header) and applying manual triangulation for disagreements (§5) and false positives
(§4/§5). No standalone "union builder" script is checked in here — the reconciliation logic is
documented inline in the report so the Step-2 seeder author can see the reasoning, not just
consume a number.
