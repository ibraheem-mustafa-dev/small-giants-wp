---
doc_type: report
project: small-giants-wp
created: 2026-08-02
phase: Phase 0 Step 0.5 — rebuild-from-empty
---

# Rebuild-from-empty comparison

`sgs-update-v2.py --rebuild` run against an EMPTY database inside a sandbox HOME
(so every `Path.home()`-hardcoding script resolved there, never at the live file —
the live database's mtime was confirmed unchanged afterwards).

**Rebuild exit code: 0**

## Headline

| | live | rebuilt |
|---|---|---|
| tables | 40 | 40 |
| total rows | 19138 | 4004 |

- Missing tables: **none**
- Extra tables: **none**
- Tables with identical row counts: **9**
- Short of live: **11**
- Empty, known Phase-1 gaps: **3**
- Empty, NOT a known gap: **17**

## ⚠ Empty but NOT a known gap

These were not on the Phase-1 list and need explaining before Phase 1 starts.

| table | live rows |
|---|---|
| `_meta_schema_version` | 1 |
| `attribute_gap_candidates` | 3063 |
| `block_changes` | 2735 |
| `block_styles` | 63 |
| `components` | 13 |
| `deploy_steps` | 9 |
| `gotchas` | 12 |
| `legacy_role_lookup` | 15 |
| `markup_examples` | 399 |
| `modifier_suffixes` | 19 |
| `pattern_coverage` | 108 |
| `patterns` | 57 |
| `pipeline_corrections` | 4 |
| `plugins` | 3 |
| `style_variations` | 8 |
| `theme_parts` | 28 |
| `variations` | 205 |

## Empty — known, carried to Phase 1

Already established as having no regenerative source. This is Phase 1's scope.

| table | live rows |
|---|---|
| `excluded_properties` | 10 |
| `property_suffixes` | 154 |
| `slots` | 104 |

## Short of live

| table | live | rebuilt | shortfall |
|---|---|---|---|
| `animation_tokens` | 8 | 1 | 7 |
| `block_attributes` | 2947 | 2593 | 354 |
| `block_capabilities` | 96 | 23 | 73 |
| `block_composition` | 210 | 19 | 191 |
| `block_supports` | 1340 | 521 | 819 |
| `blocks` | 205 | 117 | 88 |
| `design_tokens` | 224 | 150 | 74 |
| `docs` | 1257 | 46 | 1211 |
| `hooks` | 5433 | 161 | 5272 |
| `indexed_files` | 110 | 83 | 27 |
| `roles` | 29 | 21 | 8 |

## Identical

9 tables reproduced with exactly matching row counts.

<details><summary>Full list</summary>

| table | rows |
|---|---|
| `array_item_fields` | 0 |
| `array_item_schema` | 68 |
| `block_selectors` | 86 |
| `fx_effects` | 15 |
| `html_tag_to_core_block` | 17 |
| `preset_implications` | 23 |
| `schema_metadata` | 4 |
| `schema_migrations` | 29 |
| `variant_slots` | 27 |

</details>
