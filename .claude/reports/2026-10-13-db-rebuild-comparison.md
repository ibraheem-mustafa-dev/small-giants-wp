---
doc_type: report
project: small-giants-wp
created: 2026-10-13
phase: Phase 0 Step 0.5 — rebuild-from-empty
---

# Rebuild-from-empty comparison

`sgs-update-v2.py --rebuild` at `HEAD`, from a throwaway worktree, run against an EMPTY database inside a sandbox HOME (so every `Path.home()`-hardcoding script resolved there, never at the live file — the live database's mtime was confirmed unchanged afterwards).

**Rebuild exit code: 0**

## Headline

| | live | rebuilt |
|---|---|---|
| tables | 31 | 31 |
| total rows | 24911 | 21898 |

- Missing tables: **none**
- Extra tables: **none**
- Tables with identical row counts: **12**
- Short of live: **9**
- Empty, known Phase-1 gaps: **0**
- Empty, NOT a known gap: **9**

## ⚠ Empty but NOT a known gap

These were not on the Phase-1 list and need explaining before Phase 1 starts.

| table | live rows |
|---|---|
| `components` | 669 |
| `deploy_steps` | 5 |
| `gotchas` | 12 |
| `motion_shape_signatures` | 18 |
| `pattern_coverage` | 108 |
| `patterns` | 57 |
| `plugins` | 3 |
| `style_variations` | 8 |
| `theme_parts` | 28 |

## Short of live

| table | live | rebuilt | shortfall |
|---|---|---|---|
| `array_item_schema` | 105 | 104 | 1 |
| `block_attributes` | 13304 | 12780 | 524 |
| `block_composition` | 222 | 34 | 188 |
| `block_supports` | 1289 | 470 | 819 |
| `blocks` | 219 | 132 | 87 |
| `design_tokens` | 397 | 306 | 91 |
| `docs` | 1221 | 1179 | 42 |
| `indexed_files` | 128 | 97 | 31 |
| `markup_examples` | 422 | 97 | 325 |

## MORE rows than live

Worth a look: the rebuild produced rows live does not have.

| table | live | rebuilt |
|---|---|---|
| `schema_migrations` | 29 | 32 |

## Identical

12 tables reproduced with exactly matching row counts.

<details><summary>Full list</summary>

| table | rows |
|---|---|
| `block_capabilities` | 562 |
| `block_selectors` | 59 |
| `fx_effects` | 22 |
| `hooks` | 5494 |
| `html_tag_to_core_block` | 17 |
| `modifier_suffixes` | 19 |
| `motion_presets` | 96 |
| `property_suffixes` | 158 |
| `roles` | 47 |
| `schema_metadata` | 4 |
| `slots` | 106 |
| `variant_slots` | 83 |

</details>
