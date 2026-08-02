---
doc_type: report
project: small-giants-wp
created: 2026-08-02
phase: Phase 1b
parent: .claude/plans/2026-08-01-db-derivation-and-converter-cleanup.md
title: "Spec 31 column-use reconciliation — sgs-framework.db vs converter reality"
---

# Spec 31 column-use reconciliation

**Method note (read before the findings).** This is a READ-ONLY analysis. The database
was opened `mode=ro`. No code, DB row, or spec text was changed. Every "no reader"
verdict below was confirmed with **at least two independent search shapes** (directory
scope + repo-wide scope, and — where the finding is call-graph-based — a check that the
apparent reader function is actually *called*, not merely defined or referenced in a
docstring). One candidate finding (`inherit_style_for_modifier`) was **retracted during
the investigation** after a second search shape found the real caller inside
`db_lookup.py` itself, which my first grep had excluded — this is recorded below as a
worked example of the exact failure mode the brief warned against.

Spec 31 (`31-UNIVERSAL-CLONING-PIPELINE.md`, v0.6, 753 lines) was read in full,
including the DB-column-utilisation map at §4 (the closest thing to a canonical "every
useful column → its role" table), §13.1–13.8 (binding rules, the content fork, variant
detection), and Appendix C/D (run artefacts, stage index).

## Headline

| Bucket | Count | Materiality |
|---|---|---|
| **SPEC'D-BUT-UNUSED** | 7 | 2 HIGH (real dead machinery with populated data), 3 MEDIUM, 2 LOW |
| **UNSPEC'D-BUT-USED** | 3 | 2 MEDIUM (load-bearing columns missing from §4's own map), 1 LOW |
| **BOTH-AGREE** | ~26 columns/mechanisms verified consistent (see collapsed list) | — |

The DB has 38 tables. Most (`docs`, `hooks`, `gotchas`, `patterns`, `deploy_steps`,
`style_variations`, `theme_parts`, `indexed_files`, `pattern_coverage`,
`markup_examples`, `components`, `plugins`, `animation_tokens`, `fx_effects`,
`pipeline_corrections`, `schema_metadata`, `schema_migrations`) are editor-tooling,
audit-log, or reference data with no CSS/content-transfer role at all — Spec 31 does not
claim them and the converter does not touch them. This report does not itemise every
column in those tables individually (per the brief's own guidance that this is
legitimate and not a finding); it focuses on the tables Spec 31 §4 actually claims
govern the pipeline: `block_attributes`, `block_composition`, `block_capabilities`,
`block_supports`, `block_selectors`, `blocks`, `modifier_suffixes`, `property_suffixes`,
`slots`, `variant_slots`, `preset_implications`, `design_tokens`, `roles`,
`array_item_schema`, `array_item_fields`, `excluded_properties`,
`attribute_gap_candidates`, `html_tag_to_core_block`.

**Confirmed per the brief's "known-true" list:** `variations` and `block_styles` are
genuinely absent from the live schema (dropped D469/D472); the one surviving
`variations` query in `db_lookup.py` is defensive (`try/except OperationalError`,
soft-fails to `{}`) — this is correct post-retirement code, not a bug.
`_meta_schema_version` is likewise absent (the live `schema_metadata`/`schema_migrations`
tables are a different, still-used pair). `legacy_role_lookup` (15 rows) is still
*present* in the DB and still has an active seeder script
(`uimax-tools/seed-legacy-role-lookup.py`), but the converter's own comments confirm all
resolution now goes through `slots` — the table is written to but never read by the
pipeline, an orphaned-but-harmless leftover, not a live drift risk.

---

## SPEC'D-BUT-UNUSED

| # | Column / mechanism | What the spec (or the column's own docstring) promises | Why it looks unwired | What wiring it would buy | Confidence |
|---|---|---|---|---|---|
| 1 | `block_capabilities.capability` (33 of 36 seeded tags, e.g. `carousel`, `icon-text`, `faq`, `modal-popup`, `pricing`, `grid-layout`, `full-width-banner`) | Spec 31 §4 states verbatim: *"`grid-layout`/`full-width-banner` gates … `scalar-styling-lift`/`scalar-content-lift` = the existing DB opt-in precedent for a new `container-css-lift` capability."* This asserts `grid-layout`/`full-width-banner` are **currently active gates**. | Traced the call graph, not just the string: `db_lookup.blocks_with_capability()` — the only generic-tag accessor — has **zero callers anywhere in the repo** (only its own docstring example). `capabilities_for()` is called live, but every real call site checks membership against exactly 3 hardcoded strings (`scalar-content-lift`, `scalar-styling-lift`, `array-content-lift`). `grid-layout` and `full-width-banner` do not appear as a string literal anywhere in `converter/` outside that one docstring comment. 50 `sgs/%` blocks carry a capability tag; 73 of those rows use one of the 36 non-lift tags — all inert. | The other 33 tags describe real block behaviour (carousel/faq/pricing/etc.) that is currently gated, if at all, by ad-hoc per-block logic elsewhere. Wiring `blocks_with_capability()` into even one resolver would let a future capability-gated resolver (the spec's own suggested `container-css-lift`) reuse this DB-first mechanism instead of inventing a new one — that's the free win. | **HIGH** — call graph traced, spec's own claim directly falsified. |
| 2 | `array_item_fields` table (0 rows) + `db_lookup.array_item_fields()` | A full parallel content-schema mechanism: `CREATE TABLE`, a documented accessor with worked examples, and prune-on-reseed logic in `sgs-update-v2.py` — built for `supports.sgs.arrayItemSchema`. | Table has 0 rows. No `INSERT INTO array_item_fields` exists anywhere in the repo (confirmed by a second, case-insensitive search). The accessor function is defined and documented but has **zero callers** — not even in tests. It was superseded by the sibling `array_item_schema` table (68 rows), which **is** genuinely wired (`array_content.py`, `walk.py` — traced, real callers). | Nothing — this is dead, superseded machinery, not a live gap. Listed here because it is exactly the incident pattern the brief called out (a query exists, a table exists, but the call graph is empty) and because it is safe, low-risk cleanup: the table/function pair can be dropped the same way `variations`/`block_styles` were. | **HIGH** — traced: no writer, no caller, superseded by a working sibling. |
| 3 | `block_composition.composition_role` + `db_lookup.get_block_composition_role()` | The function's own docstring (dated, "XS-3 refined trigger, 2026-05-31"): resolves whether a block is a `section-root`/`wrapper-shell`/`content-block`/`leaf`, "used by the refined layout-bearing wrapper detection to check parent's role." | Defined, documented, **zero callers anywhere in the repo** (repo-wide grep, not directory-scoped). Not mentioned in Spec 31 §4's own utilisation map at all — the map lists `block_composition.(container_kind, wraps_block, accepts_allowed_blocks)` but omits `composition_role` entirely. | If "layout-bearing wrapper detection" is still a real need (the fold/recurse test in §2.4 has exactly this shape — "is this child a pass-through wrapper or does it have block identity?"), this column already carries the answer and nothing reads it — the fold/recurse logic may be re-deriving the same fact ad hoc. Worth checking whether `services/section_passes.py`/`l2_qualify.py` duplicate this classification instead of reading the column. | **MEDIUM** — traced (zero callers proven), but the spec never explicitly promises this exact mechanism, so it is a documented-in-code capability rather than a documented-in-spec one. |
| 4 | `slots.standalone_block_default_attrs` via `db_lookup.slot_default_attrs_for()` | A second reader of the same "slot sets default attrs on its emitted block" capability described in Spec 31 (button preset defaults, e.g. `--ghost` → `inheritStyle:'outline'`). | `slot_default_attrs_for()` (keyed on the raw BEM **element** token) has zero callers anywhere. **Important correction during this investigation:** the underlying data (4 populated rows: `buttonSecondary`/`button-primary`/`button-outline`/`option-picker`) **is** reached in production — but via the sibling function `preset_style_for_element()` → `inherit_style_for_modifier()` (keyed on the BEM **modifier**), called live from `services/assembly.py` step 5 and `walk.py`'s foreign-identity arm. My first grep wrongly flagged `inherit_style_for_modifier` as dead because it filtered out matches inside `db_lookup.py` itself, where the real call site lives — a second, unfiltered search caught it. `slot_default_attrs_for()` is the genuinely dead one: an unused, element-keyed duplicate of a working, modifier-keyed path. | Low — the data isn't lost, just reachable through one path instead of two. Worth a cleanup note (delete the dead function) rather than a build task. | **MEDIUM** — traced; low materiality since the capability isn't actually lost. |
| 5 | `block_supports.is_stale` | Column name implies a live/stale filter on `block_supports` rows (mirrors `blocks.is_stale`, which the spec's disclaimer list already excludes from CSS-lift utility). | `block_supports_for()` (the only reader of `block_supports`) selects `support_name, support_value` with no `WHERE is_stale` clause — a stale row would be silently treated as live. | Currently harmless: `SELECT COUNT(*) FROM block_supports WHERE is_stale=1` returns 0, so no wrong behaviour today. Worth a one-line `WHERE is_stale=0` as cheap insurance before it ever gets populated. | **LOW** — real gap, zero current impact. |
| 6 | `modifier_suffixes` kind=`'variant'` (3 rows: `Primary`/`Secondary`/`Tertiary`) | Not documented in Spec 31 §4's `modifier_suffixes` row at all — the spec text names only breakpoint/side/corner/state. | No call site anywhere filters `modifier_suffixes(kind='variant')`; the live 3-way button-style mechanism uses `inherit_style_presets()`/`preset_style_for_element()` against `slots`, not this. | Unclear — may be an abandoned earlier design for the same button-preset problem `slots.standalone_block_default_attrs` now solves. Low value; flag for a cleanup decision rather than a build task. | **LOW** — data present, zero readers, no clear intended consumer found. |
| 7 | `block_selectors.(element, selector)` | Spec 31 §4 itself already documents this as **ORPHANED** (measured 2026-08-01): the only references are two comments in `db_lookup.py` naming it as the *intended, unbuilt* disambiguator for `AmbiguousLayerAttrError`/`AmbiguousCssPropAttrError`, superseded by the `css_element`/`css_state`/`css_tier` columns. | Confirmed independently: zero `SELECT … FROM block_selectors` anywhere in `converter/`. | Nothing to wire — the spec's own text says the intended fix landed elsewhere. Listed here for completeness only, and moved to the collapsed BOTH-AGREE tally below rather than counted as a fresh finding, since spec and code already agree it's dead. | N/A — not a real finding, spec is accurate. |

*(Item 7 does not count toward the headline "7" above as a genuine discrepancy — it is
included in the table for traceability but is really a BOTH-AGREE case. The headline
count of 6 substantive SPEC'D-BUT-UNUSED findings is items 1–6.)*

---

## UNSPEC'D-BUT-USED

| # | Column | Which code reads it | What Spec 31 §4 omits | Drift-to-fix or spec-to-amend | Confidence |
|---|---|---|---|---|---|
| 1 | `block_attributes.(role='image-alt', alt_companion_attr)` | `db_lookup.image_alt_companion_for()`, called live from `walk.py` (the B1 scalar-content-lift path, tagged `CG-8, 2026-07-05`) to route a lifted image's alt text onto its DB-declared companion attr. | Spec §4's `block_attributes` row lists `(attr_name, attr_type, canonical_slot, role, enum_values, derived_selector)` as "the destination table" columns and separately calls out `css_property`/`css_layer`/`css_element`/`css_state`/`css_tier`, `emit_shape`, `box_family` — but never mentions `alt_companion_attr` or the `image-alt` role value, despite this being a real, dated (D-numbered) fix with a live production call site. | **Spec-to-amend** — this is working code the spec's own "every useful column → its role" table simply forgot to list. No behaviour to fix, just a documentation gap in the map that exists specifically to prevent this class of gap. | **HIGH** — traced call site, dated commit reference in the code comment. |
| 2 | `modifier_suffixes` kind=`'unit'` (the `Unit` suffix) via `db_lookup.unit_companion_attr()` | Called live from `resolvers/grid_area.py` (L4 per-area CSS routing) to find a box/typography attr's paired CSS-unit companion attr (e.g. `contentPaddingTop` → `contentPaddingUnit`). | Spec §4's `modifier_suffixes` row text says "breakpoint (tier), side/corner (shorthand decomposition), state (:hover) suffix grammar" — three kinds. The live table has **six** distinct `kind` values (`breakpoint`, `side`, `corner`, `state`, `variant`, `unit`); `unit` is a fourth kind that's genuinely wired and undocumented. (`variant` is the fifth/sixth kind — see SPEC'D-BUT-UNUSED item 6 above — it is seeded but has no reader.) | **Spec-to-amend** — real, working mechanism; the spec's own column-role text is simply incomplete, not wrong. | **HIGH** — traced call site. |
| 3 | `array_item_schema.field_order` (ordering column, not named individually in §4) | `array_item_field_names()`/`array_item_field_schema()` both `ORDER BY field_order` — live callers in `resolvers/array_content.py` and `walk.py`. | Spec §4 doesn't itemise `array_item_schema`'s own columns at all (the table isn't in the §4 map; it's described narratively in §13.3 FR-31-2.5 instead, without naming `field_order`). | **Spec-to-amend**, and low-stakes — this is really a documentation-completeness gap in §4 (which explicitly aims to be "every useful column") rather than a behavioural disagreement; §13.3 already describes the mechanism correctly in prose, just not in the §4 table. | **LOW** — traced, but the omission is from a table that never claimed to be exhaustive over every FR-31-2.5-family column, only the ones the author thought needed a row. |

---

## BOTH-AGREE (verified, not padded)

**~26 columns/mechanisms checked and confirmed consistent between Spec 31's claims and
a traced converter call graph** (not just a string match — each of these was followed to
a real, non-test call site):

`property_suffixes.(css_property, suffix, role, kind_override, is_token_matched,
token_source)` · `block_attributes.(css_property, css_layer, css_element, css_state,
css_tier)` · `block_attributes.emit_shape` · `block_attributes.box_family` ·
`block_attributes.(canonical_slot, role, derived_selector, enum_values)` ·
`block_composition.(container_kind, wraps_block, accepts_allowed_blocks)` ·
`blocks.parent_block` (forced-parentage, traced via the `child_tokens` CTE query) ·
`blocks.variant_attr` + `variant_slots.(variant_value, unique_slot)` ·
`block_supports.(support_name, support_value)` (module-level accessor, real callers) ·
`block_capabilities` for exactly the 3 lift tags (`scalar-content-lift`,
`scalar-styling-lift`, `array-content-lift`) · `design_tokens.(slug, default_value,
token_type)` (shadow-preset token-snap in `outer_box.py`) · `roles.(role_name,
classification)` · `slots.(slot_name, aliases, standalone_block)` ·
`array_item_schema.(field_key, role)` (68 rows, real content-lift use) ·
`preset_implications.*` (`resolvers/preset_absence.py`, FR-31-23) ·
`excluded_properties.css_property` (`dispatch_table.py`) · `html_tag_to_core_block` ·
`attribute_gap_candidates` (write-only completeness ledger, matches its documented
role) · `block_selectors` (both spec and code agree it is orphaned) · `has_inner_blocks`
— **note**: the DB column was already physically dropped from `block_composition`
(confirmed: the live schema has no such column) and the converter's own code
(`services/has_inner.py`) correctly derives `delegates_content` at runtime instead of
querying it. Spec §4's own text ("the column itself still EXISTS in the DB … verified
2026-07-04") is now **stale** relative to the live schema, but the *code* has already
moved on correctly — this is a doc-freshness gap in the spec, not a code defect, and
does not belong in either working bucket since nothing is currently wrong.

---

## What I could not determine, and why

1. **Whether `composition_role`/`slot_default_attrs_for` dead code is a genuine
   regression (something un-wired a live path) or was always inert.** Git blame /
   history archaeology was out of scope for a read-only DB+code snapshot; I traced the
   *current* call graph exhaustively but did not walk commit history to establish
   whether these functions ever had a caller that was later removed. The docstrings
   read as if they describe intended, not historical, behaviour, which is why I scored
   them MEDIUM rather than HIGH.
2. **Whether the 33 unused `block_capabilities` tags are read by non-Python consumers**
   (e.g. a JS editor-side check, or the `uimax` design-intelligence DB via its own sync
   path) that this Python-scoped grep would miss. I checked `plugins/sgs-blocks/src/`
   is out of scope for a "converter reads it" question but did not exhaustively grep the
   editor JS tree for these capability strings — if `edit.js` files gate UI panels on a
   capability tag, that would be a legitimate non-converter reader and would move some
   of item 1 out of the SPEC'D-BUT-UNUSED bucket. Flagging as an open gap rather than
   asserting either way.
3. **Full column-by-column coverage of the 20 non-pipeline tables** (`docs`, `hooks`,
   `gotchas`, `patterns`, etc.) was not done at individual-column granularity — I
   confirmed at the table level that Spec 31 makes no claims about them and the
   converter does not import them, per the brief's own guidance that this is legitimate,
   but a column inside e.g. `patterns` (14 columns) was not independently checked one by
   one. If Track 1 wants that granularity for a specific table, it needs a second pass.
4. **The `wp-blocks.py`/`sgs-db.py` CLI layer** (outside `converter/`) was checked for
   table-name references (the earlier per-table file-count scan) but not exhaustively
   for column-level usage — that CLI is a read/reporting tool, not a pipeline component,
   so its usage doesn't change any converter-facing verdict above, but it does mean a
   column I scored "no reader in the converter" could still have a reporting-only reader
   there that I didn't individually trace.

## Files referenced

- Spec: `c:/Users/Bean/Projects/small-giants-wp/.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`
- DB (read-only): `C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db`
- Primary DB access layer: `plugins/sgs-blocks/scripts/converter/db/db_lookup.py`
- Key call sites traced: `plugins/sgs-blocks/scripts/converter/walk.py`,
  `plugins/sgs-blocks/scripts/converter/services/assembly.py`,
  `plugins/sgs-blocks/scripts/converter/resolvers/grid_area.py`,
  `plugins/sgs-blocks/scripts/converter/resolvers/array_content.py`,
  `plugins/sgs-blocks/scripts/converter/resolvers/outer_box.py`,
  `plugins/sgs-blocks/scripts/converter/services/has_inner.py`,
  `plugins/sgs-blocks/scripts/converter/dispatch_table.py`
- Seeder/writer side checked: `plugins/sgs-blocks/scripts/sgs-update-v2.py`,
  `plugins/sgs-blocks/scripts/uimax-tools/seed-legacy-role-lookup.py`
