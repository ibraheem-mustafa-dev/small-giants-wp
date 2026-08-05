# Routing-key coverage — ground truth

**Date:** 2026-08-05
**Scope:** `block_attributes` columns used for CSS→block-attribute routing
**Method:** every figure below is a re-measurement. No number is carried over from
`.claude/reports/2026-08-02-pipeline-routing-review.md` — several of that report's
figures are refuted here (see §6).
**Read-only.** No code, data, or doc outside this file was changed.

DB: queried via `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "<SQL>"`.
Converter: `plugins/sgs-blocks/scripts/converter/`.

---

## 0. Base denominators

```sql
SELECT COUNT(*) total, SUM(block_slug LIKE 'sgs/%') sgs_rows,
       COUNT(DISTINCT block_slug) blocks FROM block_attributes;
```
| total | sgs_rows | distinct blocks |
|---|---|---|
| 2970 | **2464** | 187 |

**2,464** is the `sgs/%` row population. Every percentage below states its own
denominator explicitly; most are NOT 2,464.

Role classification catalogue (`roles` table) splits roles two ways:

```sql
SELECT classification, GROUP_CONCAT(role_name,' ') FROM roles GROUP BY classification;
```
- `content-bearing` (12 roles): content, icon-dashicon, icon-emoji, icon-lucide, icon-wp-icon, identity, image-alt, image-object, link-href, rating, svg, text-content
- `styling-behaviour` (21 roles): a11y-text, behaviour, boolean-visibility, color, colour-gradient, colour-text, enum-class-probe, layout, motion, number-css-percent, number-css-px, position, query-descriptor, scalar-media, select-from-enum, spacing-token, styling, tag-identity, technical, typography, visual

Joined against `sgs/%` rows:

```sql
SELECT COALESCE(r.classification,'unclassified') c, COUNT(*) n
FROM block_attributes b LEFT JOIN roles r ON r.role_name=b.role
WHERE b.block_slug LIKE 'sgs/%' GROUP BY c;
```
| classification | rows |
|---|---|
| styling-behaviour | **1847** |
| content-bearing | 207 |
| unclassified (role IS NULL) | 410 |

---

## 1. Schema — all nine columns exist

```sql
SELECT sql FROM sqlite_master WHERE name='block_attributes';
```

Confirmed present on `block_attributes`: `attr_type` (NOT NULL), `enum_values`,
`role`, `inspector_control_type`, `css_layer`, `css_property`, `box_family`,
`css_element`, `css_state`, `css_tier`. Existing UNIQUE constraint is
`UNIQUE(block_slug, attr_name)` — nothing keyed on CSS today.

---

## 2. Per-column measurement

### 2.1 `role`

**Eligibility rule: ALL 2,464 `sgs/%` rows.** Every attribute is either
content-bearing or styling/behaviour — there is no third kind of attribute, and
`db_lookup.py:151-160` treats an unclassified role as a routing failure, not a
legitimate state. So the eligible population is the whole table.

```sql
SELECT COUNT(*) n, SUM(role IS NOT NULL) p FROM block_attributes WHERE block_slug LIKE 'sgs/%';
```
→ **2054 / 2464 = 83.4 %**. 410 rows unclassified.

**Readers (converter):**
- `converter/db/db_lookup.py:998-1016` `content_attrs_for_block()` — returns `{attr: {role, canonical_slot, attr_type, derived_selector}}`
- `converter/db/db_lookup.py:1077-1098` `is_color_role()` — the sanctioned `role='color'` gate
- `converter/db/db_lookup.py:1107-1126` `tag_identity_attrs()` — gates on `role='tag-identity'`
- `converter/db/db_lookup.py:199` — role-deletion guard counts referencing rows
- `converter/resolvers/array_content.py:90,232,250` — L2 role-fallback field matching
- `converter/resolvers/scalar_content.py:122-123` — `role='rating'` star lift, `role='image-object'` media lift
- `converter/gates/check_content_attr_collisions.py:217,234,244,329` — collision gate

**Seeder:** automatic, three layers, all inside `/sgs-update`
(`plugins/sgs-blocks/scripts/sgs-update-v2.py`):
1. derived classifier — `behavioural-analyser/extract-signatures.py` + `assign-canonical.py`
2. hand-authored override layer — `plugins/sgs-blocks/scripts/attr-classification-overrides.json`
   (175 entries; loaded fail-loud at `sgs-update-v2.py:1445-1482`), applied after
   and winning over the derived layer
3. `converter/db/db_lookup.py:479-593` re-asserts `role='scalar-media'` on a fixed
   roster, idempotently (D474 — the role had been silently lost by a reseed)

So: **automatic, with a hand-maintained correction file.**

---

### 2.2 `css_property`

**Eligibility rule: styling-behaviour rows that are NOT tier-suffixed siblings.**
Two exclusions, both justified from the code:
- A **content-bearing** attr routes content via block-equivalence, never CSS
  (`db_lookup.py:105-107`). It cannot carry a `css_property`. Measured: **0** of
  the 207 content-bearing rows carry one, and 0 of the 410 NULL-role rows do either
  — the DB agrees with the rule.
- A **tier-suffixed sibling** (`*Mobile`/`*Tablet`/`*Desktop`) is *deliberately*
  left NULL. `db_lookup.py:1185-1201` documents this as correct-by-design: the
  sibling's property is derived from its BASE row at read time, so writing it onto
  the sibling would be redundant drift. Excluding them is required or the
  denominator is fabricated.

```sql
WITH b AS (SELECT * FROM block_attributes WHERE block_slug LIKE 'sgs/%'),
sb AS (SELECT b.* FROM b JOIN roles r ON r.role_name=b.role WHERE r.classification='styling-behaviour'),
base AS (SELECT * FROM sb WHERE attr_name NOT GLOB '*[a-z]Mobile'
         AND attr_name NOT GLOB '*[a-z]Tablet' AND attr_name NOT GLOB '*[a-z]Desktop')
SELECT (SELECT COUNT(*) FROM base) eligible,
       (SELECT COUNT(*) FROM base WHERE css_property IS NOT NULL) populated;
```
| population | rows | with css_property | % |
|---|---|---|---|
| all `sgs/%` | 2464 | 1050 | 42.6 % |
| styling-behaviour | 1847 | 1046 | 56.6 % |
| **styling-behaviour, base tier (ELIGIBLE)** | **1342** | **788** | **58.7 %** |

The 4-row difference between 1050 and 1046: four rows carry a `css_property` while
their role sits outside `styling-behaviour` — flagged, not investigated. **UNVERIFIED**
whether those are mis-roled or a legitimate edge.

**Readers:**
- `db_lookup.py:1144-1256` `declared_attrs_for_css_property()` — the column-first
  declarative lookup (Spec 31 FR-31-5.2/5.3)
- `db_lookup.py:1290-1330` `_base_domain_attrs_for_css_property()` — base-domain
  restriction feeding `attr_for_property`
- `db_lookup.py:2245-2264` `css_property_has_suffix_row()` — liftability test
- `db_lookup.py:2308-2344` `attr_for_property()` — the name-built suffix fallback
- `converter/dispatch_table.py:83-147` — `_writer_path()`, `media_signal()`,
  `excluded_properties` / grid-layout routing
- `converter/resolvers/outer_box.py:123,230-244`, `grid.py:16,124`,
  `grid_area.py:7,127`, `content_band.py:8,127` — layer resolvers

**Seeder:** automatic. Derived layer written by
`behavioural-analyser/extract-signatures.py::extract_css_property_and_layer` into
`behavioural-analyser/css-property-classifications.json` (209 KB, present, verified
2026-08-05 14:27), loaded by `sgs-update-v2.py:1997-2003`. Overridden by
`attr-classification-overrides.json`. A third writer, `sgs-update-v2.py:1537-1578`,
owns `css_property='fx:*'` for motion attrs (moved into `/sgs-update` at D432 after
the build-time-only channel caused a data loss). Consistency gate:
`scripts/db-consistency/check_css_property_reseed.py`.

---

### 2.3 `css_element`

**Eligibility rule: rows that carry a `css_property`** — 1,050. `css_element` is a
*disambiguator within* a CSS route (which node the declaration lands on). A row with
no `css_property` has no route to disambiguate; the column would be meaningless on it.

```sql
SELECT COUNT(*) n, SUM(css_element IS NOT NULL) p FROM block_attributes
WHERE block_slug LIKE 'sgs/%' AND css_property IS NOT NULL;
```
→ **942 / 1050 = 89.7 %**. (943 across all `sgs/%` rows — one row carries a
`css_element` with no `css_property`.)

**Readers:**
- `db_lookup.py:1240-1247` — the OUTER-layer element guard
  (`css_element IS NULL OR IN ('','root','self','wrapper')`), the fix that stopped the
  false `AmbiguousLayerAttrError` between `cardPadding` and `ctaPadding`
- `db_lookup.py:1303-1310` `_base_domain_attrs_for_css_property()` — `_BASE_ELEMENTS = ("", "root", "self")`
- the cross-node AREA fold (`attr_for_area_property`) matches on `css_element` alone

**Seeder:** automatic — same `css-property-classifications.json` derived layer as
`css_property`, plus the overrides file.

---

### 2.4 `css_state`

**Eligibility rule: rows carrying a `css_property` AND representing a non-resting
state.** This is the trap column. `css_state IS NULL` is the *correct and expected*
value for a resting-state declaration — it is not an unpopulated cell. There is no
way to compute "how many rows *should* be `:hover`/`:focus`" from the DB; that fact
lives in each block's `style.css`. So a coverage percentage for this column is
**not computable from the DB and any figure quoting one is fabricated.**

What is measurable is the size of the non-resting population that has been captured:

```sql
SELECT COUNT(*) FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND css_state IS NOT NULL;
-- 97 (all 97 also carry a css_property)
```
→ **97 rows carry a state.** Denominator: unknown by construction. Marked
**UNVERIFIED** — establishing it needs a CSS-side census of `:hover`/`:focus` rules
across `src/*/style.css`, not a DB query.

**Readers:**
- `db_lookup.py:1201` — `AND css_state IS NULL` in the base-tier clause (excludes
  state siblings from the base resolver)
- `db_lookup.py:1308` — same exclusion in `_base_domain_attrs_for_css_property`
- `attr_for_state_property` — the direct `(block, css_property, css_state)` hover lift,
  called from `outer_box.py:230-236`, `grid.py:124`, `grid_area.py:127`, `content_band.py:127`

**Seeder:** automatic — derived layer + overrides, same channel as `css_property`.

---

### 2.5 `css_tier`

**Eligibility rule: same shape as `css_state` — NULL is correct for the base tier.**
`db_lookup.py:1201` treats `css_tier IS NULL OR css_tier='desktop'` as *the base
attribute*, and `1185-1201` documents that a Mobile/Tablet sibling deliberately
carries `css_tier IS NULL`. So neither NULL nor non-NULL is evidence of a gap.

```sql
SELECT COUNT(*) FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND css_tier IS NOT NULL;
-- 317 (316 of which also carry a css_property)
```
→ **317 rows carry a tier.** Denominator not computable from the DB.
**UNVERIFIED.**

⚠ The prior session already litigated this and wrote the answer into the code
(`db_lookup.py:1189-1201`, and `.claude/reports/2026-08-04-trackC-tier-sibling-rows-root-cause.md`):
of 554 tier-suffixed rows → 339 with a matching base → 238 whose base has a populated
`css_property` → **145 correctly NULL on the sibling**. Those 145 are *not* a backlog.
I did not re-derive that chain; it is cited, not measured here. **UNVERIFIED by this audit.**

**Readers:** `db_lookup.py:1198-1202` (base clause), `1307` (base domain), plus the
breakpoint re-append mechanism (Spec 31 §3.A step 4).

**Seeder:** automatic — derived layer + overrides.

---

### 2.6 `box_family`

**Eligibility rule: attrs declared in `supports.sgs.boxFamilies` in their own
block.json.** This is not an inference — `sgs-update-v2.py:1945-1992`
(`_derive_box_family_overrides_from_block_json`) walks exactly that key and writes
exactly those rows, warning-and-skipping any declaration whose attr does not exist.
The block.json declarations ARE the eligible population by construction.

```
# ground truth from block.json (84 files under plugins/sgs-blocks/src/)
boxFamilies-declared attrs: 235, across 45 blocks
```
```sql
SELECT COUNT(*) FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND box_family IS NOT NULL;
-- 228
```
→ **228 / 235 = 97.0 %**. The 7-row shortfall is consistent with the seeder's
fail-loud WARN path (stale declarations naming an attr the block no longer has), but
I did not run `/sgs-update` to confirm which 7. **UNVERIFIED which rows.**

Cross-check on shape: 297 of the 2,464 `sgs/%` rows are `attr_type='object'`; 228 of
those carry a `box_family`. The 69 that do not are dominated by `role='image-object'`
(24) and NULL-role objects (19) — i.e. non-box objects, correctly excluded.

⚠ Do **not** use "object-typed attrs" (297) as the denominator. A media object and a
link object are `type:object` and are not box families; that denominator manufactures
a 23 % gap that does not exist.

**Readers:**
- `db_lookup.py:1024-1040` `box_family_for()` — the sole sanctioned accessor
- `converter/orchestrator.py:67,81,106,255,261,275`
- `converter/resolvers/content_band.py:82,90,107,153,166,210`
- `converter/resolvers/grid.py:46,52,55,186-287`
- `converter/resolvers/grid_area.py:72,90-136`
- `converter/resolvers/outer_box.py:195,209,214,269`

There is a structural AST gate requiring these call sites to go through
`box_family_for()` and never an attr-name regex (Spec 31 §13.4 FR-31-22.2).

**Seeder:** automatic, declaratively from block.json. Block files are the source of truth.

---

### 2.7 `inspector_control_type`

**Eligibility rule: attrs that have an inspector control in the block's `edit.js`.**
Not computable from the DB — the seeder discovers it by parsing `edit.js`. Any
DB-derived denominator here is a guess.

Raw population, with the honest caveat attached:
```sql
SELECT COALESCE(r.classification,'unclassified') c, COUNT(*) n,
       SUM(b.inspector_control_type IS NOT NULL) ict
FROM block_attributes b LEFT JOIN roles r ON r.role_name=b.role
WHERE b.block_slug LIKE 'sgs/%' GROUP BY c;
```
| classification | rows | with ict |
|---|---|---|
| styling-behaviour | 1847 | 612 |
| content-bearing | 207 | 115 |
| unclassified | 410 | 221 |
| **total** | **2464** | **948 (38.5 %)** |

38.5 % is over the *wrong* denominator (all rows) and is quoted only to be explicit
about what was and was not measured. The true eligible population is
**UNVERIFIED** — it requires an `edit.js` control census.

**Readers in `converter/`: NONE.** A full grep of `converter/` (excluding `tests/`)
for `inspector_control_type` returns zero hits. This column is editor/audit metadata,
not a routing key. If Bean wants routing to key on it, that is new wiring, not an
under-populated existing path.

**Seeder:** automatic, single writer.
`behavioural-analyser/extract-signatures.py --task-b-only`, invoked as a Stage 1 tail
step by `sgs-update-v2.py:1155-1194` (`_run_inspector_control_type_seed`). It
*overwrites on disagreement* — the previous competing writer in
`uimax-tools/enrich-db.py` was removed after an audit found 88/93 of its values wrong.

---

### 2.8 `enum_values`

**Eligibility rule: attrs declaring an `enum` in their block.json.** WordPress
block.json is the only place an enum can be declared, so it is the exact eligible set.

```
# ground truth: 84 block.json files, 2442 attrs total
attrs with an "enum" key: 218
```
```sql
SELECT COUNT(*) FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND enum_values IS NOT NULL;
-- 218
```
→ **218 / 218 = 100.0 %.** Exact match. This column is fully seeded.

⚠ Do **not** use role as the denominator. `role='select-from-enum'` covers 109 rows of
which only 39 have `enum_values`, and `enum-class-probe` covers 28 with 0 — which
would read as a 25 % coverage disaster. The two are simply not the same set: the
remaining 179 enum declarations sit on rows with other roles. Role does not gate enums.

**Readers:**
- `db_lookup.py:1107-1130` `tag_identity_attrs()` — reads `enum_values` as the write
  gate for tag-identity attrs, explicitly gated on `role='tag-identity'` and never on
  bare enum-membership (the docstring calls out `hero.variant` as the reason)
- `converter/services/assembly.py:170` — consumes `tag_identity_attrs()`
- `converter/services/validate.py:13-24` `_parse_enum_values()` — JSON-array parse,
  enum-value validation
- `converter/resolvers/outer_box.py:322` — `enum_values IS NULL` noted for the
  container shadow attr

**Seeder:** automatic, direct from block.json during `/sgs-update` Stage 1 block ingest.

---

### 2.9 `attr_type`

**Eligibility rule: all 2,464 rows** — the column is `NOT NULL` in the schema, so
every row must carry it.

```sql
SELECT COUNT(*), SUM(attr_type IS NOT NULL AND attr_type <> '')
FROM block_attributes WHERE block_slug LIKE 'sgs/%';
-- 2464, 2464
```
→ **2464 / 2464 = 100.0 %.** Distribution: string 1528, number 367, object 297,
boolean 217, array 35, integer 20.

**Readers:**
- `db_lookup.py:1052-1067` `is_boolean_attr()` — the sanctioned `attr_type='boolean'` gate
- `db_lookup.py:1008-1016` `content_attrs_for_block()`
- `converter/services/state_value_lift.py` `_coerce_for_attr_type`
- `converter/resolvers/scalar_content.py:122-123` — `role`+`attr_type` pair gates
- `converter/gates/check_content_attr_collisions.py:17,140,217,234`

**Seeder:** automatic, direct from block.json.

---

## 3. The §7 UNIQUE-key proposal — what it actually costs

Proposed: `UNIQUE(block_slug, css_property, css_layer, css_element, css_state, css_tier)`
with `css_layer`/`css_element` NOT NULL and `''` sentinels for state/tier.

### 3.1 Among rows that carry a `css_property` — **zero collisions**

```sql
SELECT COUNT(*) colliding_groups, SUM(n) rows_in_collision, SUM(n-1) rows_that_must_change
FROM (SELECT COUNT(*) n FROM block_attributes
      WHERE block_slug LIKE 'sgs/%' AND css_property IS NOT NULL
      GROUP BY block_slug, css_property, COALESCE(css_layer,''), COALESCE(css_element,''),
               COALESCE(css_state,''), COALESCE(css_tier,'')
      HAVING COUNT(*)>1);
```
→ **0 colliding groups. 0 rows.** Denominator: the 1,050 `sgs/%` rows with a
non-NULL `css_property`.

**This is the headline.** The declarative data already satisfies the proposed key
exactly. Adopting the constraint costs nothing on the routes that exist today.

### 3.2 Across the whole table with `''` sentinels — **1,330 rows must change**

```sql
SELECT COUNT(*) colliding_groups, SUM(n) rows_in_collision, SUM(n-1) rows_that_must_change
FROM (SELECT COUNT(*) n FROM block_attributes WHERE block_slug LIKE 'sgs/%'
      GROUP BY block_slug, COALESCE(css_property,''), COALESCE(css_layer,''),
               COALESCE(css_element,''), COALESCE(css_state,''), COALESCE(css_tier,'')
      HAVING COUNT(*)>1);
```
→ 79 colliding groups, 1,409 rows in collision, **1,330 rows that must change.**

And every one of them is in the `css_property IS NULL` bucket:
```sql
SELECT COUNT(*) groups, SUM(n) rows FROM (
  SELECT COUNT(*) n FROM block_attributes WHERE block_slug LIKE 'sgs/%' AND css_property IS NULL
  GROUP BY block_slug, COALESCE(css_layer,''), COALESCE(css_element,''),
           COALESCE(css_state,''), COALESCE(css_tier,'') HAVING COUNT(*)>1);
```
→ **79 groups / 1,409 rows — 100 % of the collisions.**

### 3.3 What that means

The 1,330 figure is **not** a conflict between competing routes. It is "1,330 rows
have no CSS route at all, so they all fall into the same empty bucket". Two
consequences, and the choice between them is the real decision:

- **Keep SQLite NULL semantics** (NULLs are distinct in a UNIQUE index): the
  constraint can be added **today at zero cost** and enforces exactly the invariant
  §7 wants on declared routes. The unrouted rows sail through — which is correct,
  because a row with no `css_property` genuinely is not a route.
- **Enforce `NOT NULL` + `''` sentinels as §7 literally proposes**: every one of
  those 1,330 rows must first be given a `css_property` (or moved out of the table).
  That converts the constraint from a free win into a hard dependency on completing
  the entire `css_property` seeding backlog first.

The §7 text asks for the second. The measurement says the first delivers the same
protection now. That is the recommendation and it is Bean's call.

### 3.4 Ambiguity counts (the §7 "97 triples already raise")

Measured three ways — the answer depends entirely on which one §7 meant, and §7
does not say:

| definition | query shape | count |
|---|---|---|
| `(block, property, layer)` with ≥2 attrs, **restricted to base domain** (the domain the resolver actually queries) | `css_layer IS NOT NULL AND (css_tier IS NULL OR ='desktop') AND css_state IS NULL` | **4** |
| `(block, property, layer)` with ≥2 attrs, no base restriction | `css_layer IS NOT NULL` | **90** |
| `(block, property)` with ≥2 attrs, layer ignored | — | **203** |
| `(block, property)` in the `_base_domain_attrs_for_css_property` domain (the `AmbiguousCssPropAttrError` gate) | element root/self/OUTER + base tier + base state | **2** |

§7's **97** is closest to the 90 figure. It does not match any of the four exactly.
Either it was measured on a pre-`110-colour-attr-reseed` snapshot, or on a definition
I have not reproduced. **The operationally meaningful number is 4**, because that is
the population the resolver's own base-domain restriction can actually reach. Note
the last row: the `AmbiguousCssPropAttrError` docstring claims "0 residual" on the
base domain and I measure **2** — so that claim is now stale.

---

## 4. Name-built-fallback-only `(block, property)` pairs — **120, not 172**

The fallback is `attr_for_property()`'s suffix loop (`db_lookup.py:2308-2344`): for a
`css_property`, walk `property_suffixes` rows, build a candidate attr name as
`suffix[0].lower() + suffix[1:]` (or via `_ATTR_NAME_OVERRIDES`, which contains exactly
one entry: `("grid-template-columns","Columns") → "gridTemplateColumns"`), and check
whether the block declares it. A pair is *fallback-only* when that name-built path
finds an attr but no row on that block declares the property.

```sql
SELECT COUNT(*) FROM (
  SELECT DISTINCT ba.block_slug, ps.css_property
  FROM property_suffixes ps
  JOIN block_attributes ba ON ba.attr_name = CASE
      WHEN ps.css_property='grid-template-columns' AND ps.suffix='Columns' THEN 'gridTemplateColumns'
      ELSE lower(substr(ps.suffix,1,1))||substr(ps.suffix,2) END
  WHERE ba.block_slug LIKE 'sgs/%'
    AND NOT EXISTS (SELECT 1 FROM block_attributes d
                    WHERE d.block_slug=ba.block_slug AND d.css_property=ps.css_property));
```
→ **120 pairs.** (121 without the one-entry override map applied.)

Against the declarative side:
```sql
SELECT COUNT(*) FROM (SELECT DISTINCT block_slug, css_property FROM block_attributes
                      WHERE block_slug LIKE 'sgs/%' AND css_property IS NOT NULL);
```
→ **634 declarative pairs.** So **120 / 754 = 15.9 %** of resolvable pairs are
fallback-only. `property_suffixes` holds 154 rows spanning 89 distinct properties.

**The report's 172 is not reproducible.** The gap is ~30 %. Most likely explanation:
the DB has been reseeded since 2026-08-02 (HEAD is
`8bb106e1 fix(db): decouple role from canonical_slot — 110 colour attrs stop losing their role`),
which moves rows into the declarative set and out of fallback-only. **UNVERIFIED**
whether 172 was correct at the time of writing — I did not check out the old DB.

Caveat on my own figure: this is a *static* census keyed on the name-building rule as
written in the code. The live-run share (§4.3 of the prior report claimed
73.4 % declarative / 26.6 % name-built) is a different measurement over actual
resolver calls and is **not re-verified here**.

---

## 5. `css_layer IS NULL` really does match every layer

**Confirmed — this is not a hypothesis.** `db_lookup.py:1245-1252`:

```sql
"SELECT attr_name FROM block_attributes "
"WHERE block_slug = ? AND css_property = ? "
"AND (css_layer = ? OR css_layer IS NULL) "
```

A NULL `css_layer` row matches an `OUTER`, `CONTENT`, `GRID` **and** `GRID_AREA`
query alike. The docstring frames this as intentional ("a NULL css_layer row is
treated as self/OUTER-default"), but the SQL applies it to all four layers, not just
OUTER.

Distribution:
```sql
SELECT css_layer, COUNT(*) n FROM block_attributes WHERE block_slug LIKE 'sgs/%'
GROUP BY css_layer ORDER BY n DESC;
```
| css_layer | rows |
|---|---|
| NULL | 1956 |
| OUTER | 250 |
| GRID | 182 |
| GRID_AREA | 46 |
| CONTENT | 30 |

**How many rows this actually affects** — only rows with a `css_property` ever enter
the layer query:

| measure | query | rows |
|---|---|---|
| NULL-layer rows visible to *every* layer query | `css_property IS NOT NULL AND css_layer IS NULL` | **542** |
| …that survive the OUTER element guard (`css_element` NULL/''/root/self/wrapper) | + element clause | **224** |
| …that share `(block, css_property)` with a **layered** sibling — i.e. a genuine cross-layer leak where a NULL row competes with an explicitly-layered one | `EXISTS (… css_layer IS NOT NULL)` | **13** |

So: 542 rows are theoretically over-matched, but only **13** are in a position to
actually collide with a properly-layered row today. The OUTER path additionally has
the element guard (`db_lookup.py:1240-1247`) narrowing 542 → 224; **CONTENT, GRID and
GRID_AREA queries apply no element filter at all**, so those three see all 542.

That asymmetry — OUTER guarded, three layers unguarded — is the concrete defect, and
it is 13 rows wide, not 1,956.

---

## 6. Prior-report figures that do not reproduce

Re-measured against the current DB. Listed so nobody re-imports them.

| prior claim (2026-08-02 report) | measured 2026-08-05 | verdict |
|---|---|---|
| "`role` is NULL on 65.5 % of rows" | 635/2970 = **21.4 %** all rows; 410/2464 = **16.6 %** `sgs/%` | **REFUTED** |
| "439 NULL-role rows *do* carry a `css_property`, so NULL role ≠ CSS-ineligible" | `SELECT COUNT(*) … WHERE role IS NULL AND css_property IS NOT NULL` → **0** | **REFUTED** — NULL role currently implies NULL `css_property` exactly. The stated reason eligibility "needs Bean's ruling rather than a query" no longer holds. |
| "~2,130 attr rows need `css_property`" | eligible base-tier styling rows lacking it = 1342 − 788 = **554** | **REFUTED** (2,130 ≈ all rows minus populated — the all-rows-denominator error) |
| "511 need `css_layer`" | 542 rows carry a `css_property` with NULL layer | close, **not exact** |
| "97 `(block, layer, property)` triples already raise" | 4 (base domain) / 90 (unrestricted) / 203 (property only) | **not reproducible as stated** |
| "172 `(block, property)` pairs fallback-only" | **120** | **REFUTED** |
| "`css_layer IS NULL` matches every layer" | confirmed at `db_lookup.py:1247` | **UPHELD** |
| "~145 tier-sibling NULLs are correct-by-design, not a gap" | cited from `db_lookup.py:1189-1201`, not re-derived | **UNVERIFIED here, but code-documented** |
| `AmbiguousCssPropAttrError` docstring: "0 residual on the base domain" | **2** | **now stale** |

Most of these are consistent with the DB having been reseeded after 2026-08-02
(HEAD `8bb106e1` moved 110 colour attrs). The role figures, though, are wrong by a
factor of ~4 in a direction reseeding does not explain, and the 2,130 figure is a
denominator error of the exact kind this audit was commissioned to avoid.

---

## 7. Summary table

Denominators differ per row — read the eligibility column, not just the percentage.

| column | exists | eligible population (rule) | eligible n | populated | % | read by (converter) | seeder |
|---|---|---|---|---|---|---|---|
| `role` | yes | all `sgs/%` rows — every attr is content or styling | 2464 | 2054 | **83.4 %** | `db_lookup.py:998,1077,1107,199`; `array_content.py:90`; `scalar_content.py:122`; `check_content_attr_collisions.py:217` | auto — extract-signatures + assign-canonical, overridden by `attr-classification-overrides.json` (175 entries), re-asserted `db_lookup.py:513` |
| `css_property` | yes | styling-behaviour roles, base tier (content attrs + tier siblings excluded by design) | 1342 | 788 | **58.7 %** | `db_lookup.py:1144,1290,2245,2308`; `dispatch_table.py:83-147`; all 4 layer resolvers | auto — `css-property-classifications.json` + overrides + `fx:*` writer (`sgs-update-v2.py:1562`) |
| `css_element` | yes | rows carrying a `css_property` | 1050 | 942 | **89.7 %** | `db_lookup.py:1240,1303`; AREA fold | auto — same derived layer |
| `css_state` | yes | rows with a non-resting state — **not DB-computable**; NULL is correct for resting | UNVERIFIED | 97 | n/a | `db_lookup.py:1201,1308`; `attr_for_state_property` via `outer_box.py:230`, `grid.py:124`, `grid_area.py:127`, `content_band.py:127` | auto — same derived layer |
| `css_tier` | yes | rows in a non-base tier — **not DB-computable**; NULL correct for base AND for tier siblings (`db_lookup.py:1189-1201`) | UNVERIFIED | 317 | n/a | `db_lookup.py:1198,1307`; breakpoint re-append | auto — same derived layer |
| `box_family` | yes | attrs declared in `supports.sgs.boxFamilies` in block.json (the seeder's exact input) | 235 | 228 | **97.0 %** | `db_lookup.py:1024`; `orchestrator.py:81,261`; `content_band.py:107`; `grid.py:204,238,271`; `grid_area.py:91`; `outer_box.py:214` | auto — `sgs-update-v2.py:1945` derives from block.json |
| `inspector_control_type` | yes | attrs with a control in `edit.js` — **not DB-computable** | UNVERIFIED | 948 of 2464 | 38.5 % (wrong denominator, quoted for transparency) | **NOTHING in `converter/`** — zero grep hits | auto — sole writer `extract-signatures.py --task-b-only` via `sgs-update-v2.py:1155` |
| `enum_values` | yes | attrs declaring `enum` in block.json | 218 | 218 | **100.0 %** | `db_lookup.py:1124`; `assembly.py:170`; `validate.py:13-24`; `outer_box.py:322` | auto — direct from block.json |
| `attr_type` | yes | all rows (schema `NOT NULL`) | 2464 | 2464 | **100.0 %** | `db_lookup.py:1052,1008`; `state_value_lift._coerce_for_attr_type`; `scalar_content.py:122`; `check_content_attr_collisions.py:217` | auto — direct from block.json |

### Extra findings

- **UNIQUE-key collisions today: 0** among the 1,050 rows carrying a `css_property`.
  Under the literal §7 `NOT NULL` + `''` form applied to all 2,464 rows: 79 groups /
  **1,330 rows must change** — and 100 % of them are the `css_property IS NULL`
  bucket, i.e. unrouted rows, not competing routes. Keeping SQLite NULL semantics
  buys the same invariant for free.
- **Fallback-only `(block, property)` pairs: 120**, not 172. Against 634 declarative
  pairs → 15.9 % of 754.
- **`css_layer IS NULL` matches every layer: CONFIRMED** (`db_lookup.py:1247`).
  542 rows are over-matched; 224 survive the OUTER element guard; **13** genuinely
  compete with an explicitly-layered sibling. CONTENT/GRID/GRID_AREA apply no
  element filter, OUTER does — that asymmetry is the real defect.
- Every column is **automatically seeded**. The only hand-maintained artefact is
  `plugins/sgs-blocks/scripts/attr-classification-overrides.json` (175 correction
  entries, loaded fail-loud). There is no hand-maintained column.
- `inspector_control_type` is **not a routing key** — nothing in `converter/` reads it.
