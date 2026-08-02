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
| tables | 39 | 39 |
| total rows | 18684 | 10807 |

- Missing tables: **none**
- Extra tables: **none**
- Tables with identical row counts: **16**
- Short of live: **9**
- Empty, known Phase-1 gaps: **0**
- Empty, NOT a known gap: **13**

## ⚠ Empty but NOT a known gap

These were not on the Phase-1 list and need explaining before Phase 1 starts.

| table | live rows |
|---|---|
| `_meta_schema_version` | 1 |
| `attribute_gap_candidates` | 2912 |
| `block_changes` | 2735 |
| `block_styles` | 63 |
| `components` | 13 |
| `deploy_steps` | 7 |
| `gotchas` | 12 |
| `pattern_coverage` | 108 |
| `patterns` | 57 |
| `pipeline_corrections` | 4 |
| `plugins` | 3 |
| `style_variations` | 8 |
| `theme_parts` | 28 |

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
| `indexed_files` | 110 | 83 | 27 |
| `markup_examples` | 422 | 83 | 339 |

## MORE rows than live

Worth a look: the rebuild produced rows live does not have.

| table | live | rebuilt |
|---|---|---|
| `docs` | 1077 | 1123 |

## Identical

16 tables reproduced with exactly matching row counts.

<details><summary>Full list</summary>

| table | rows |
|---|---|
| `array_item_fields` | 0 |
| `array_item_schema` | 68 |
| `block_selectors` | 86 |
| `excluded_properties` | 10 |
| `fx_effects` | 15 |
| `hooks` | 5494 |
| `html_tag_to_core_block` | 17 |
| `legacy_role_lookup` | 15 |
| `modifier_suffixes` | 19 |
| `preset_implications` | 23 |
| `property_suffixes` | 154 |
| `roles` | 29 |
| `schema_metadata` | 4 |
| `schema_migrations` | 29 |
| `slots` | 104 |
| `variant_slots` | 27 |

</details>
