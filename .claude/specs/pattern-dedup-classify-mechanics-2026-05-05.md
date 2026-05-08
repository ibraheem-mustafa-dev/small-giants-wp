# Pattern Dedup + Classification Mechanics

**Date:** 2026-05-05
**Last revised:** 2026-05-06 (v1 sections pruned; Rosetta Stone addendum added; classification finalised per Bean's 2026-05-06 follow-ups)
**Status:** Design spec — pre-implementation
**Owner:** Bean (SGS) + next-session implementer

---

## ⚠ REVISIONS — Bean's corrections (2026-05-05 + 2026-05-06)

The original spec had four problems Bean rejected. **This section is the authoritative spec.** v1 content has been pruned (see git history if needed).

### Correction 1 — uimax: extend EXISTING tables, no new pattern_instances; ADD a `patterns` table

- DROP the old `pattern_instances` proposal
- ADD `industry` / `mood` / `style` columns to existing classifiable tables: `landing`, `colors`, `icons`, `icon_libraries`, `component_libraries`, `ux_guidelines`, `app_interface`, `products`, `gov_patterns`, `interaction_patterns`
- ADD new tables: **`patterns`** (per 2026-05-06 follow-up — needed as the bridge layer between landing recipes and component_libraries blocks), `naming_conventions`, `animations`, `mood_boards`
- ADD new stack tables: `stack_sgs_wordpress`, `stack_wordpress`, `stack_php`, `stack_html_css`, `stack_bootstrap` (each with `version_min` column for cadence tracking)
- ADD `is_emoji` flag on `icon_libraries`
- Defer `stack_eleventy` / `stack_hugo` until UC1 / UC2 lands

### Correction 2 — sgs-db: SINGLE table, fingerprint is the headline column

- DROP the separate `clone_observations` / `external_patterns` table proposal
- DROP all licensing / IP / provenance-enum columns (see blub.db row 211)
- USE a single `patterns` table with one `source` column whose value is `idea`, `draft`, or a competitor URL string
- ELEVATE `fingerprint` to the headline column — it's the dedup key
- KEEP the existing `block_compositions` table resurrection — good as is

### Correction 3 — Focus only on Use Case 3 (HTML drafts) first

- Layer 2 (structural fingerprinting) and Layer 3 (perceptual hash) are deferred — they exist to handle competitor utility-class soup (out of scope until UC3 hits 100%)
- Single primary check: **fingerprint = sha256(normalised_html + sorted_css_var_dump)**
- Perceptual hash column can still exist for later, but doesn't drive dedup decisions

### Correction 4 — Don't use /sgs-update for dedup queries

- Dedup queries route through `/sgs-db` (extend with `fingerprint <hash>` subcommand), NOT `/sgs-update`
- `/sgs-update` keeps its current role: re-scanning the SGS codebase to refresh the DB after files change
- The cloning pipeline writes patterns to disk, registers via direct SQL INSERT (or `pattern-register.py`), then calls `/sgs-update` only to refresh the scan

### Correction 5 — `block_compositions` and `wp-pattern-gen.py` are good starts

Bean confirmed both. Resurrect the table; extend the script.

### Correction 6 (2026-05-06) — Pattern categorisation by purpose, not client

Categories on uimax `patterns` and on WP pattern registration are the **purpose** (Heroes, Pricing, Trust Bars, Footers, Headers, Testimonials, CTAs, Galleries, FAQs, Contact, Stats Strips, Process Steps, Team Grids, Logo Clouds, etc.). NOT client-specific (`mamas-munches` / `indus-foods`). Pollution prevention is handled by:
- Patterns use design-token slugs (`var(--wp--preset--color--primary)`) not hex codes
- Content placeholders (`Lorem ipsum`) not real client copy
- pattern-generator.md rules already enforce both

This means Mama's hero auto-registers to the `Heroes` category alongside Indus's hero. No `_inbox/` staging area.

---

## ⚠ ROSETTA STONE ADDENDUM — added 2026-05-06

Every uimax row representing a design artefact (pattern, component, animation, naming convention, design token) MUST carry **equivalent-name mappings** across all major platforms:

- `sgs_block` (slug or `null`+gap-flag if no SGS equivalent)
- `html_css_draft` (semantic class anatomy)
- `bootstrap` (class composition)
- `shadcn` (component name)
- `tailwind` (utility composition)
- `react_generic` (component name)
- `ai_builder_lovable` / `ai_builder_v0` / `ai_builder_bolt` (where applicable)

Implementation: every new uimax table must include an `equivalent_implementations` JSON column or per-platform columns. Tools writing to uimax MUST populate the SGS-block equivalent or flag the gap. Never silently drop the translation. See blub.db row 213.

---

## Simplified flow (Bean-corrected)

### Single dedup check — fingerprint

```
fingerprint = sha256(normalised_html + sorted_css_var_dump)
```

- `normalised_html` — strip whitespace, sort attribute order, lowercase tags, drop comments, drop content text, drop framework-noise classes (`css-[a-f0-9]{6,}`, `wp-[a-z]{8,}-[a-f0-9]{6,}`, JIT-hashed Tailwind)
- `sorted_css_var_dump` — every `--*` CSS custom property the pattern uses, sorted alphabetically as `name=value` pairs

SQL check:
```sql
SELECT id, slug FROM patterns WHERE fingerprint = ?
```

If hit → log "duplicate of pattern N", exit. If miss → register.

### Single sgs-db `patterns` table — extended schema

| Column | Type | Notes |
|---|---|---|
| `slug` | TEXT PRIMARY KEY | existing |
| `title`, `category`, `description`, `blocks_used`, `file_path`, `industry`, `is_auto_generated`, `created_at` | existing | — |
| `content_shape` | TEXT | NEW. single-column / split / grid / carousel / accordion / tabs / vertical-timeline |
| `mood` | TEXT | NEW. warm-friendly, premium-minimal, etc. |
| `style` | TEXT | NEW. classic, modern, brutalist, etc. |
| **`fingerprint`** | **TEXT NOT NULL UNIQUE** | NEW. dedup key |
| **`source`** | **TEXT** | NEW. `idea` / `draft` / `<URL>` |
| `block_composition` | JSON | NEW. SGS block slugs as JSON array |
| `parent_pattern_id` | INTEGER FK NULL | NEW. for variants |
| `perceptual_hash` | TEXT NULL | NEW. populated for later, not yet a decision input |

### New uimax `patterns` table — schema

| Column | Notes |
|---|---|
| `slug` | matches sgs-db `patterns.slug` |
| `name` | human-readable |
| `category` | semantic — Heroes / Pricing / etc. |
| `industry`, `mood`, `style`, `content_shape` | classification |
| `block_composition` (JSON FK list) | references `component_libraries` rows for SGS blocks |
| `landing_recipe_ids` (JSON FK list) | references `landing` rows |
| `product_type_ids` (JSON FK list) | references `products` rows |
| `equivalent_implementations` (JSON) | Rosetta Stone — per-platform expressions |
| `fingerprint`, `source` | inherited from sgs-db (source = `idea` / `draft` / `<URL>` only) |

The 3-way mapping (patterns ↔ landing, patterns ↔ products, patterns ↔ component_libraries) is what makes recommendations seamless across platforms.

### Registration flow — 6 steps

1. Compute `fingerprint` (via `pattern-fingerprint.py`)
2. SQL `SELECT id FROM patterns WHERE fingerprint = ?` — if hit, log duplicate, exit
3. Auto-derive `content_shape` + `block_composition` from DOM walker (via `pattern-classify.py`)
4. LLM-suggest `category` + `industry` + `mood` + `style`; operator confirms (or `--auto` accepts defaults)
5. Write pattern files via extended `wp-pattern-gen.py` to `plugins/sgs-blocks/patterns/<slug>/`; add `pattern.meta.json` sidecar with fingerprint + classification + Rosetta Stone equivalents
6. Direct SQL INSERT into sgs-db `patterns` AND uimax `patterns`. Then call `/sgs-update` to refresh the scan.

### uimax extension scope

For each existing classifiable table (`landing`, `colors`, `icons`, `icon_libraries`, `component_libraries`, `ux_guidelines`, `app_interface`, `products`, `gov_patterns`, `interaction_patterns`):
- Add `industry` / `mood` / `style` columns (open enum)
- Add `equivalent_implementations` JSON column where applicable

Backfill existing rows where reasonable (LLM-classified with operator confirmation, in a later batch run — not blocking UC3).

### Out of scope until Use Case 3 hits 100%

- Competitor cloning (Use Case 2)
- LLM design generation (Use Case 1 first stage)
- Layer 2 structural fingerprinting
- Layer 3 perceptual-hash decision layer
- `clone_observations` / `external_patterns` separate tables
- BEM-as-DB-table (BEM is now its own row in the `naming_conventions` table — confirmed 2026-05-06)

### Open questions (closed 2026-05-06)

- ✓ uimax exact schema confirmed (see Q3 closure in salvage matrix)
- ✓ BEM lives in `naming_conventions` table
- ✓ `/sgs-db` extension subcommand: `sgs-db.py fingerprint <hash>` plus `patterns-by-category`, `patterns-by-industry`, `patterns-by-fingerprint-prefix`
- ✓ Operator-confirmation prompt: per `pattern-register.py` Step 4 — one-screen summary table; `Y / edit / skip`

---

## v1 content removed 2026-05-06

The original 470-line v1 spec (3-layer dedup with structure_hash, phash thresholds, separate `clone_observations` table, IP firebreak proposals) is preserved in git history. Recovery: `git log --all -- '.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md'` and check the commit immediately preceding the 2026-05-06 prune commit. Do not re-introduce its licensing / IP / promotion-path framing — explicitly rejected (blub.db row 211).
