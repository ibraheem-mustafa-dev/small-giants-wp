# converter/ — SGS clean modular converter

The fresh modular home that replaces the frozen `orchestrator/converter_v2/convert.py`
(D-MODULAR, D229). Built as a **vertical slice** (D-A, D242): one real resolver
end-to-end first, the rest one-per-stage in step 3.

**Authoritative design:** `.claude/plans/2026-06-23-modular-scaffold-design.md` v3
(§3 slice + §10 binding conformance corrections). Spec: `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` §12.

## How it works (one sentence)

The orchestrator walks the draft; for each CSS declaration it builds a key
`(block, layer, property)`, the **dispatch table** names exactly one resolver,
and that resolver writes one native block attribute (or records a tracked GAP).
The table names no block; per-block behaviour comes from the DB.

## Architecture

```
orchestrator.py  →  dispatch_table.resolver_id(block, layer, property)  →  resolvers/<id>.py
                                                                              │
                                                       services/{layer_detect, attr_resolve,
                                                       tier_suffix, value_serialise, token_snap,
                                                       validate, gap_writer}.py
```

- **Layers** are `OUTER / CONTENT / GRID` (`db_lookup._LAYER_PREFIXES`). `GRID_AREA`
  has no DB backing → stub-only this phase.
- **Routing is 3-part** `(block, layer, property)`; tier does not change the resolver
  (tier-invariance, design §2.1 — tested, slice-scoped/provisional per §10 A15).

## Symptom → file cheatsheet (for a non-coder QC owner)

| If this looks wrong on the clone | The file that owns it |
|----------------------------------|-----------------------|
| Section spacing / width / background | `resolvers/outer_box.py` |
| Inner content-band width | `resolvers/content_band.py` |
| Columns & gaps | `resolvers/grid.py` |
| Fonts / text styling | `resolvers/typography.py` |
| Quote / name / stars (single text bits) | `resolvers/scalar_content.py` |
| Images / video | `resolvers/scalar_media.py` |

## Anti-cheat gates (converter/gates/)

Each gate is a runnable `--report / --check / --update-baseline` script, wired into
`.claude/hooks/f5-commit-gate.py` AND collected by the prebuild pytest suite. A gate
that exists but isn't wired protects nothing (STOP-6).

| Gate | Rejects |
|------|---------|
| `gates/no_slug_literal.py` | any AST comparison of `block_slug`/`variant_value`/`variant_attr` against a string literal/set in `resolvers/` or `services/` (enforces "names no block" in bodies, design §4.1 / A7) |
| `gates/import_ban.py` | any `converter/` import of the frozen engine except `db_lookup` (closes the freeze-callback backdoor, design §4.1) |

(Golden-source, conservation/disjointness, totality, and `test_unrouted_fails` gates
arm in the slice build, before `outer_box`'s transfer logic — design §4/§4.1/§10.)

## The one rule that matters

**LANDED, not conservation, measures progress** (§10 A1). Conservation goes 100%
green while transferring almost nothing (everything → `UNIMPLEMENTED_STUB`). Only the
count of cells that LAND (live computed-style matches the draft, mockup-vs-clone)
measures faithfulness. `STUB` / `GAP` rows in the coverage report are **not-yet-faithful**.
