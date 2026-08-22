# Step 2 — Teach rule 31 to resolve each colour row's PAINT MECHANISM

Repo: `c:\Users\Bean\Projects\small-giants-wp`.

**STATUS: DONE (2026-08-22).** This file previously described a render.php text-scan approach. A
council tracer measured that approach and found it unsound before it was built — the shared wrapper
calls neither `sgs_background_paint_decl` nor `sgs_text_colour_decl` anywhere across its 3,243
lines, so wrapper-routed blocks could never resolve fill/text that way. Bean steered to a DB-first
resolver instead. This file now records what actually shipped, for the next reader.

## What shipped

Rule 31 resolves a colour row's mechanism from `block_attributes.css_property` — the declarative
routing column Spec 31 R-31-1 (DB-first, no hardcoded dicts) already requires blocks to populate —
never by scanning render.php.

- **`plugins/sgs-blocks/scripts/inspector-scan/export-colour-css-property.py`** — a thin DB read
  (same `DB_CANDIDATES` pattern as `sync-container-wrapping-blocks.py`). Prints
  `{ block_slug: { attr_name: css_property|null } }` to stdout for every `block_attributes` row
  with `role IN ('color', 'colour-gradient')`.
- **`plugins/sgs-blocks/scripts/inspector-scan/core/golden.js`** — three new exports:
  - `MECHANISM_BY_CSS_PROPERTY` — the map (`color`/`color-gradient` → text; `background-color`/
    `background-image`/`background-color-gradient` → fill; `border-color`/`border-color-gradient`/
    `outline-color` → border; `box-shadow-color` → shadow; `stroke` → stroke).
  - `resolveMechanismFromCssProperty( cssProperty )` — returns `{ mechanisms: string[], unresolved
    }`. A **compound** value (comma-joined — confirmed live, e.g. `"background-color,color"`, one
    attribute painting two CSS properties at once) resolves to every mechanism it names; a row is
    correct if it matches ANY of them. Empty/null/unrecognised → `unresolved: true`, never guessed
    from the attribute's own name.
  - `getColourCssPropertyMap( ctx )` — shells out to the Python export script via
    `child_process.spawnSync`, memoised on `ctx` (same pattern as `roster.js` calling
    `build-roster.py`, and as rule 31's own pre-existing `getSharedOwnerScan`). **Fails closed**: a
    non-zero exit or empty stdout throws, rather than silently resolving every row as unresolved
    (which would look identical to "the mechanism axis found nothing wrong").
- **`plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js`** —
  `recordRowMechanism()` is called once per PER-BLOCK row (inside `checkRow`), and:
  - stores `{ block, rowKey, attrName, cssProperty, mechanisms, unresolved }` on
    `ctx.__rule31RowMechanisms` for Step 3 to assert against — **no finding is pushed, no assertion
    changed**;
  - on the first call in a run, prints a DB-WIDE unresolved count to stderr (not scoped to rows
    actually visited during the JS walk), satisfying "the run reports an explicit UNRESOLVED count".

**Shared-owner rows are deliberately NOT resolved** (`scanSharedOwnerRows` — a shared file can be
mounted by several blocks, and a bound attribute name is only meaningful per mounting block; same
class of blind spot as the existing shared-row `colourExemptions` gap the header already declares).

## Measured result (re-run before trusting; this is a snapshot)

`node plugins/sgs-blocks/scripts/inspector-scan/run.js --check` →
**157 of 517** colour attrs UNRESOLVED, gate rules 0 gating findings, advisory findings **1129**
(unchanged from the pre-Step-2 baseline — confirmed by running `--check` before and after this
step's edits and diffing the SUMMARY line). Rule 31's own live-scan finding count: **413**
(unchanged). Self-test: `RULE 31-golden-colour-control — PASS`.

## Verify

```bash
node plugins/sgs-blocks/scripts/inspector-scan/run.js --check     # exit 0, advisory findings 1129
node plugins/sgs-blocks/scripts/inspector-scan/run.js --self-test # RULE 31 — PASS
```

`sgs/heading` resolves three mechanisms from the DB: `textColour` → text (`color`), `backgroundColour`
→ fill (`background-color`), `borderColour` → border (`border-color`) — confirmed via
`python plugins/sgs-blocks/scripts/inspector-scan/export-colour-css-property.py` piped to a quick
`json.load` check on `sgs/heading`.

## Handed to Step 2b / Step 3

- The **157 unresolved** attrs are Step 2b's seeding worklist (re-derive the exact split by
  running `census-colour-paint-route.py --json` against the CURRENT tree — cached splits in the
  plan doc were already stale before this step ran; see the plan's own repeated warning).
- `ctx.__rule31RowMechanisms` is populated and ready for Step 3's mechanism-aware gradient
  assertion — Step 3 is what actually changes which findings fire; this step deliberately does not.
