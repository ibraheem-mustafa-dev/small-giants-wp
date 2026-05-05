# Pattern Dedup + Classification Mechanics

**Date:** 2026-05-05
**Status:** Design spec — pre-implementation
**Owner:** Bean (SGS) + next-session implementer

---

## ⚠ REVISIONS — Bean's late-session corrections (2026-05-05) override the original spec below

The original spec (preserved below for context) had four problems Bean rejected. Read this section first; the rest of the file is the original v1 thinking.

### Correction 1 — uimax: extend EXISTING tables, no new pattern_instances

**Original spec said:** create a new `pattern_instances` table in uimax for captured artefacts.
**Bean's correction:** uimax already has tables for `block-pattern`, `component`, `colour-palette`, `wcag-friendly`, `icons`, etc. Extend those — don't add a new instances table. The biggest add-value is **adding categories (industry / mood / style)** and **adding new platforms / coding languages** to uimax, since it doesn't currently cover php / html / css / wp but covers plenty of others (used for INITIAL drafting design). BEM referencing could potentially be a new reference doc OR a new DB table — defer that decision.

**What this changes:**
- DROP the `pattern_instances` table proposal in Section 5.3 of the original
- ADD the industry / mood / style classification columns to every relevant existing uimax table
- ADD platform / coding-language columns: PHP, HTML, CSS (incl. SCSS), JavaScript (incl. TypeScript), WordPress (Gutenberg + classic), Tailwind, Bootstrap, Astro, Next.js, Eleventy, Hugo, etc.
- DEFER BEM-as-reference-doc-vs-DB-table decision to next session

### Correction 2 — sgs-db: SINGLE table, NO licensing, fingerprint is the most important column

**Original spec said:** separate `clone_observations` table for competitor patterns vs SGS-native, with provenance / licence / promotion-path complexity for IP awareness.
**Bean's correction:** "the licensing thing is absurdly stupid, you can't license a web design or pattern of web components. Just use a single table. For both blocks and patterns just say the source as `idea`, `draft`, and if comp, just leave the URL — that's all we need. The most important thing is the fingerprint."

**What this changes:**
- DROP the separate `clone_observations` / `external_patterns` table proposal
- DROP all licensing / IP / provenance-enum columns
- USE a single `patterns` table with one `source` column whose value is either `idea`, `draft`, or a competitor URL string — that's the entire taxonomy
- ELEVATE `fingerprint` to the headline column — it's the dedup key
- KEEP the existing `block_compositions` table resurrection (Section 5.4 of original) — that's good as is

### Correction 3 — Focus only on Use Case 3 (HTML drafts) first

**Original spec said:** design dedup + classification for all three use cases (drafts → mockup, competitor harvest, HTML → WP).
**Bean's correction:** "We need to get this working on the HTML drafts perfectly first, don't dilute efforts and focus on other targets."

**What this changes:**
- Layer 2 (structural fingerprinting) and Layer 3 (perceptual hash) are deferred — they exist to handle competitor utility-class soup, which is out of scope until Use Case 3 hits 100% first
- Single primary check: **fingerprint = sha256(normalised_html + sorted_css_var_dump)**. Two patterns with the same fingerprint are the same pattern. Done.
- Perceptual hash column can still exist on the table for later, but doesn't drive dedup decisions
- Competitor cloning (Use Case 2) and LLM design generation (Use Case 1 first stage) are explicitly out of scope until HTML-only-first lands

### Correction 4 — Don't use /sgs-update for dedup queries

**Original spec said:** call `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-update.py` as a registration step.
**Bean's correction:** "I wouldn't recommend calling /sgs-update for dedup, its sole role is for updating but we could use /sgs-db or a command that calls a script which queries it."

**What this changes:**
- Dedup queries route through `/sgs-db` (extend with a `fingerprint <hash>` subcommand), NOT `/sgs-update`
- `/sgs-update` keeps its current role: re-scanning the SGS codebase to refresh the DB after files change — it never does dedup
- The cloning pipeline writes patterns to disk, registers via direct SQL INSERT (or a new `scripts/pattern-register.py` that wraps the INSERT), then calls `/sgs-update` ONLY to refresh the DB scan

### Correction 5 — `block_compositions` and `wp-pattern-gen.py` are good starts

Bean confirmed the spec's call to resurrect `block_compositions` (currently 0 rows) and extend `wp-pattern-gen.py` instead of replacing them. No change to original — proceeding as designed.

---

## Simplified flow (Bean-corrected, supersedes original Sections 4-7)

### Single dedup check — fingerprint

```
fingerprint = sha256(normalised_html + sorted_css_var_dump)
```

- `normalised_html` — strip whitespace, sort attribute order, lowercase tag names, drop comments, drop content text (so two patterns with same structure but different copy hash the same)
- `sorted_css_var_dump` — every `--*` CSS custom property the pattern relies on, sorted alphabetically, value pairs

SQL check:
```sql
SELECT id, slug FROM patterns WHERE fingerprint = ?
```

If hit → log "duplicate of pattern N", exit. If miss → register.

### Single sgs-db `patterns` table

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `slug` | TEXT UNIQUE | `mamas-hero`, `indus-trust-bar` |
| `name` | TEXT | human-readable |
| `category` | TEXT | hero / footer / trust-bar / FAQ / contact / pricing-table / product-card / etc. |
| `industry` | TEXT | food, healthcare, retail, etc. |
| `mood` | TEXT | warm-friendly, premium-minimal, etc. |
| `style` | TEXT | classic, modern, brutalist, etc. |
| `content_shape` | TEXT | single-column / split / grid / carousel / accordion / tabs |
| **`fingerprint`** | **TEXT NOT NULL UNIQUE** | **the dedup key** |
| **`source`** | **TEXT** | **`idea` / `draft` / `<competitor URL>`** |
| `block_composition` | JSON | which SGS blocks the pattern is built from |
| `file_path` | TEXT | `plugins/sgs-blocks/patterns/<slug>/` |
| `parent_pattern_id` | INTEGER FK NULL | for variants |
| `perceptual_hash` | TEXT NULL | populated for later use, not yet a decision input |
| `created_at` | TIMESTAMP | |

### Registration flow — 6 steps

1. Compute `fingerprint`
2. SQL `SELECT id FROM patterns WHERE fingerprint = ?` — if hit, log "duplicate of pattern N" and exit
3. Auto-derive `content_shape` + `block_composition` from the recogniser output
4. LLM-suggest `category` + `industry` + `mood` + `style`; operator confirms (or accepts defaults)
5. Write pattern files via extended `wp-pattern-gen.py` to `plugins/sgs-blocks/patterns/<slug>/`; add `pattern.meta.json` sidecar with fingerprint + classification
6. Direct SQL INSERT into `patterns` table; INSERT linked rows into `block_compositions`. Then call `/sgs-update` to refresh the DB scan (its proper role)

### uimax extension

For each existing uimax table that should classify rows (block-pattern, component, colour-palette, wcag-friendly, icons, ...):
- Add `industry` (open enum)
- Add `mood` (open enum drawn from existing tags)
- Add `style` (open enum drawn from existing tags)
- Add `platform` / `language` (or join to a new `platforms` table) covering PHP / HTML / CSS / JS / WordPress / Tailwind / Bootstrap / Astro / Next.js / Eleventy / Hugo / etc.

Backfill existing 5,598 rows where reasonable (LLM-classified with operator confirmation).

### Out of scope until Use Case 3 hits 100%

- Competitor cloning (Use Case 2)
- LLM design generation (Use Case 1 first stage)
- Layer 2 structural fingerprinting
- Layer 3 perceptual-hash decision layer
- IP wall / licensing / provenance complexity
- `clone_observations` / `external_patterns` separate tables
- BEM-as-DB-table (BEM-as-reference-doc may still happen)

### Open questions still on Bean's plate

1. uimax exact schema — confirm via `.schema` on the actual DB at session start
2. BEM as reference doc OR DB table — pick when we know if the pipeline needs queryable BEM lookups
3. `/sgs-db` extension subcommand naming — `sgs-db.py fingerprint <hash>`? `sgs-db.py dedup-check <hash>`? `sgs-db.py find-pattern <hash>`?
4. Operator-confirmation prompt shape for LLM classifications — design at first real run

---

## ORIGINAL v1 SPEC BELOW — superseded but preserved for context
**Companion to:** SGS cloning pipeline (designed next session) + `wp-pattern-gen.py` (existing) + `/clone-patterns` command (existing)

## Headline summary (paste-ready)

**(a) Most important missing schema columns.** sgs-db `patterns` table currently has 9 columns and tracks ZERO of the variables this pipeline needs: no content hash, no structural fingerprint, no perceptual hash, no source URL, no capture date, no provenance / licence, no parent-pattern relationship for variants, no design-family or content-shape labels. uimax has NO concrete-pattern-instance table at all — its `landing` table (34 rows) holds abstract pattern recipes, not captured artefacts. Both DBs need substantial schema additions before the cloning pipeline can write to them.

**(b) Most consequential design decision Bean needs to make.** Whether competitor-cloned patterns live in the SAME `patterns` table as SGS-native patterns (with a `provenance` flag) or in a SEPARATE `external_patterns` / `clone_observations` table. This is fundamentally an IP question, not a technical one. Mixing them keeps queries simple but means a single SELECT can return cloneable competitor work alongside Bean's own patterns — risking accidental redistribution. Separating them keeps clean walls but requires every search query to UNION two tables. Recommendation in section 6: separate, with a curated promotion path from `clone_observations` → `patterns` after human review and re-implementation.

**(c) Riskiest assumption.** That structural fingerprinting (Layer 2) will reliably catch "same pattern, different content" duplicates. Real competitor sites use deeply nested utility-class soup (Tailwind, BEM, framework-specific class names) where two visually identical heroes can have wildly different DOM trees, and two structurally identical DOMs can paint completely different patterns once CSS lands. Layer 2 may produce both false positives (merging genuinely different patterns) and false negatives (missing real duplicates) at high rates. Next session must pressure-test on 5-10 real captured pages before committing to a threshold — and may need to demote Layer 2 from a decisive layer to a hint that feeds Layer 3.

---

## 1. Current state of both DBs

### 1.1 uimax DB

**Path:** `C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`
**Query API:** `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py <query> --domain X --limit N [--json]`
**Total rows:** ~9,400 across 34 tables (5,164 in `design_tokens` alone, 1,923 google_fonts, 269 colours, etc.)

**Domains exposed via search.py:** style, color, chart, landing, product, ux, typography, icons, react, web, google-fonts. Plus 16 stack-specific tables (`stack_react`, `stack_nextjs`, `stack_vue` etc.).

**Tables relevant to "patterns":**

| Table | Rows | What it is | Concrete or abstract? |
|---|---|---|---|
| `landing` | 34 | Pattern-name + section-order recipes ("Hero-Centric Design", "Long-form Narrative") | **Abstract recipes** — not instances |
| `gov_patterns` | 68 | GOV.UK + GCDS components ("breadcrumbs", "task list") | Abstract spec descriptions |
| `interaction_patterns` | 30 | ARIA practices ("combobox", "tabs") | Abstract spec |
| `ui_reasoning` | 161 | Style-pattern decision rules | Abstract |
| `styles` | 84 | Visual style taxonomies (brutalist, glassmorphism, etc.) | Abstract |
| `colors` | 269 | Curated palette rows | Concrete data |
| `typography` | 74 | Curated font pairings | Concrete data |

**Crucial finding:** uimax has **no concrete pattern-instance storage**. Every "pattern" table holds a rule, recipe, or taxonomy. There is no row that says "here is a captured hero from indus-foods.com on 2026-05-05, here are its design tokens, here is the screenshot path." The cloning pipeline will produce that row type, and the schema does not currently exist for it.

**Dedup mechanism today:** every table has a `provenance` column (free-text source attribution). No content hash, no UNIQUE constraint beyond table-by-table primary keys (often `no` ordinals or `name`). Dedup is operator discipline at ingest time — `ingest-*.py` scripts run idempotently from authoritative repos and wipe-and-rewrite their own rows. There is no general-purpose "is this a duplicate of something already here?" check.

### 1.2 sgs-db (SGS Framework knowledge base)

**Path:** `C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db`
**Query API:** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>`
**Health:** 64 blocks, 1,207 attributes, 28 tokens, 8 style variations, **36 patterns**, 12 gotchas.

**Patterns table — current schema:**
```sql
CREATE TABLE patterns (
  slug          TEXT PRIMARY KEY,    -- e.g. "sgs/about-stats"
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,       -- always "sgs" today
  description   TEXT,
  blocks_used   TEXT NOT NULL,       -- JSON list of block slugs
  file_path     TEXT NOT NULL,       -- theme/sgs-theme/patterns/<file>.php
  industry      TEXT,                -- often NULL today
  is_auto_generated INTEGER DEFAULT 0,
  created_at    TEXT
)
```

**What the table tracks today:** name, file location, block composition. That's it. 36 rows, all with `industry=NULL` and `category='sgs'`.

**What it does NOT track:**
- Content hash / structural fingerprint / visual hash (no dedup signal at all)
- Source URL or capture date (every pattern is assumed SGS-native)
- Provenance / licence (no IP awareness)
- Intent label (hero / testimonial-grid / cta-banner — only inferable from slug)
- Design family (warm-friendly, premium-minimal, brutalist)
- Content shape (single-column / split / grid / carousel)
- Variant relationships (no `parent_slug` column)
- Screenshot path (no visual reference)
- Confidence / quality score (no curation flag)

**Adjacent tables that ALMOST help but don't:**
- `block_compositions` (0 rows) — designed to track frequent block combinations across pages, intended to feed `auto_pattern_slug` back into `patterns`. Empty — never populated.
- `pattern_coverage` — 96 rows tracking industry × section-type matrix coverage. Useful for "do we have a healthcare hero?" queries; not for dedup.
- `sections_detected` + `block_opportunities` + `extraction_cache` — populated by sgs-extraction during clone runs. These hold the raw upstream signal but DO NOT survive into `patterns` — they're per-extraction working memory.

### 1.3 sgs-update flow

**Command:** `/sgs-update` runs `update-db.py --repo <repo> --full` then regenerates `02-SGS-BLOCKS-REFERENCE.md`.

**What update-db does:** scans `theme/sgs-theme/patterns/*.php` and `plugins/sgs-blocks/patterns/*.php` (latter doesn't exist yet — pattern files currently live only in the theme). For each `.php` pattern file, parses the `Pattern Name`, `Slug`, `Categories`, `Block Types`, etc. headers and the block content. UPSERTs into `patterns`. Computes `blocks_used` by parsing block markup with a recursive walker.

**What update-db does NOT do:** compute hashes, fingerprints, or visual hashes; record source URLs; identify duplicates; classify by intent or industry beyond what the file header declares. It is a pure file-system mirror, not an intelligence layer.

**Implication for the cloning pipeline:** the pipeline cannot rely on `update-db` to do dedup. Dedup must happen BEFORE a pattern file is written to disk, otherwise duplicates pile up in `patterns/` and update-db dutifully imports them all.

---

## 2. Dedup design — three layers

The cloning pipeline produces an artefact bundle per detected section: HTML snippet, CSS variables harvest, screenshot PNG, source URL, intent guess (from sgs-extraction's section detector), proposed block composition. The dedup gate runs before registration.

### Layer 1 — Content hash (exact-match)

**Algorithm:** SHA-256 of normalised HTML + sorted CSS variable assignments.

Normalisation rules (critical — without these, every clone is "new"):
1. Strip whitespace runs to single spaces
2. Lowercase all tag and attribute names
3. Drop class names matching framework-noise patterns (`css-[a-f0-9]{6,}`, `wp-[a-z]{8,}-[a-f0-9]{6,}`, Tailwind hash-suffixed)
4. Drop inline style values, keep style property keys
5. Drop text-node content (we want structure, not copy — copy diffs go through Layer 2 as "variant of")
6. Sort CSS variables alphabetically before hashing

**Storage:** new column `content_hash TEXT` on `patterns` and on the proposed `clone_observations` table. UNIQUE INDEX on `content_hash`.

**Threshold:** byte-equal hash is the only positive match. No fuzzy.

**Action on hit:**
- If hash matches a SGS-native row → **skip + log** ("identical to sgs/about-story, no action")
- If hash matches a `clone_observations` row → **increment `seen_count`, append source URL to `also_seen_at` list**, skip registration

**Cost:** ~1ms per pattern. Cheap; always run first.

### Layer 2 — Structural fingerprint

**Algorithm:** depth-first walk of the HTML, emit a tuple `(tag, child_count, attr_keys_sorted)` per node. Concatenate, then hash. This captures "same shape, different copy/images".

Example fingerprint for a 2-column hero:
```
section[class,style] > div[class] > (h1[],p[],a[href]) | div[class] > img[src,alt]
→ structure_hash = SHA-256(canonicalised tuple)
```

**Storage:** column `structure_hash TEXT` plus optional `structure_signature TEXT` (the human-readable canonicalised form, for debugging).

**Threshold:** byte-equal `structure_hash`. Two patterns with the same `structure_hash` but different `content_hash` are flagged as **variant candidates**.

**Action on hit:**
- Existing row found with same `structure_hash`, different `content_hash` → register the new artefact as a **variant** (`parent_slug` set, `is_variant=1`). Skip writing a new pattern file; instead append to a `pattern_variants` JSON entry on the parent.
- Multiple existing rows match → flag for human review (`needs_review=1`).

**Risk (the riskiest assumption — see headline (c)):** structure_hash equality is brittle. Two visually identical heroes built with different DOM strategies (flexbox vs grid, semantic vs div-soup) will have different fingerprints. Two structurally identical DOMs may paint very different patterns once CSS lands. **Calibration step required next session:** capture 5-10 known-duplicate hero pairs from competitor sites and measure actual hash collision rate before locking the threshold.

**Cost:** ~5-20ms per pattern.

### Layer 3 — Visual perceptual hash

**Algorithm:** render the pattern (or use the captured screenshot), downscale to 32×32 greyscale, compute pHash (DCT-based) per the standard imagehash algorithm. Store as a 64-bit integer.

**Storage:** column `phash INTEGER`. Optional column `screenshot_path TEXT` pointing at the saved PNG.

**Threshold:** Hamming distance between phashes:
- distance ≤ 4 → very likely the same pattern (default match)
- distance 5–10 → flag for human review
- distance > 10 → treat as visually distinct

Bean to confirm thresholds on real captures (see open question 6.2). 90% similarity in phash terms ≈ Hamming distance ≤ 6.

**Action on hit:**
- distance ≤ 4 to existing row → flag as visual-twin, queue for human review (could be intentional re-build worth merging, or a genuine duplicate)
- distance 5–10 → log only, proceed with registration but link via `visually_similar_to` column

**Cost:** ~50ms per pattern (screenshot generation dominates if not already captured).

### Layer order summary

```
incoming pattern artefact
  ├── compute content_hash → Layer 1 lookup
  │     └── HIT → skip, log, increment seen_count, EXIT
  ├── compute structure_hash → Layer 2 lookup
  │     └── HIT → register as variant of parent, EXIT
  ├── compute phash → Layer 3 lookup
  │     └── distance ≤ 4 → flag for human review, queue, EXIT
  │     └── distance 5–10 → register but link visually_similar_to, continue
  └── all clear → run classification → register as new pattern
```

---

## 3. Classification design

When a pattern passes all three dedup layers, classify across six dimensions before registration. Each dimension has a source-of-truth: auto-derived, LLM-assigned, or human-confirmed.

### 3.1 Classification schema

| Field | Type | Allowed values (enum) | Source |
|---|---|---|---|
| `intent` | TEXT | `hero`, `feature-grid`, `feature-split`, `testimonial-single`, `testimonial-grid`, `cta-banner`, `cta-centred`, `pricing-table`, `faq-accordion`, `contact-form`, `mega-menu`, `footer-columns`, `footer-centred`, `trust-bar`, `logo-cloud`, `team-grid`, `gallery-grid`, `stats-strip`, `process-steps`, `about-story`, `about-mission`, `product-card-grid`, `blog-list`, `image-text-split`, `cookie-banner`, `breadcrumbs` | LLM-assigned, human-confirmed |
| `industry` | TEXT | `food`, `healthcare`, `retail`, `professional-services`, `construction`, `education`, `nonprofit`, `tech-saas`, `hospitality`, `wholesale`, `mosque-faith`, `eyecare`, `agnostic` | LLM-assigned with auto-suggestion from existing `style_variations.industry` |
| `design_family` | TEXT | `warm-friendly`, `premium-minimal`, `editorial-content-heavy`, `brutalist`, `glassmorphism`, `neumorphism`, `corporate-clean`, `playful-illustrated`, `dark-luxe`, `swiss-grid`, `magazine` | LLM with reference to `uimax.styles` taxonomy (84 style rows) |
| `content_shape` | TEXT | `single-column`, `two-column-split`, `three-column-grid`, `four-column-grid`, `carousel`, `accordion`, `tabs`, `vertical-timeline`, `horizontal-timeline`, `masonry`, `bento-grid`, `full-bleed-stack` | Auto-derived from DOM walker |
| `block_composition` | TEXT (JSON) | List of `sgs/*` block slugs in order | Auto-derived from sgs-extraction's `block_opportunities` |
| `provenance` | TEXT (JSON) | `{source_url, captured_at, source_license, capture_method, capturing_agent}` | Auto-recorded by cloning pipeline |

### 3.2 Source-of-truth assignment

| Field | Auto | LLM | Human |
|---|---|---|---|
| `intent` | sgs-extraction's section detector seeds it | LLM refines to enum | confirms in 1-line CLI prompt |
| `industry` | inherits from active style_variation if cloning under a client | LLM if external clone | confirms |
| `design_family` | — | Gemini 3 Flash with prompt referencing uimax styles taxonomy + screenshot | confirms |
| `content_shape` | DOM walker — count children, count rows, detect carousel libs | — | review only on edge cases |
| `block_composition` | sgs-extraction `block_opportunities` JSON | — | review only |
| `provenance` | fully automatic | — | — |

### 3.3 LLM prompt template (for `intent`, `industry`, `design_family`)

```
You are classifying a captured web pattern for the SGS pattern library.
Screenshot: <attached>
Source URL: <url>
Detected DOM structure: <abbreviated>
Detected blocks: <list>

Return strictly:
{
  "intent": "<one of [enum]>",
  "industry": "<one of [enum]>",
  "design_family": "<one of [enum]>",
  "confidence": 0.0-1.0,
  "rationale": "one sentence"
}
```

Model: Gemini 3 Flash (cheap, vision-capable, 1M context). Cerebras as fallback for intent+industry only (no vision).

### 3.4 Human confirmation step

After auto + LLM classification, the pipeline emits a one-screen summary:

```
NEW PATTERN: indus-foods-hero-2026-05-05
  intent:        hero                   (LLM 0.94)
  industry:      food                   (inherited from active variation)
  design_family: warm-friendly          (LLM 0.81)
  content_shape: two-column-split       (auto)
  blocks:        sgs/hero, sgs/cta-button, sgs/image
  source:        https://indusfoods.example  (CC-BY observation only)

Confirm? [Y / edit / skip / flag]
```

`Y` accepts and registers. `edit` opens an inspector where each enum can be re-picked. `skip` discards. `flag` parks in `clone_observations` with `needs_review=1` for batch review later.

---

## 4. Registration flow — end-to-end

```
┌─ cloning pipeline produces artefact bundle ──────────────────────┐
│  { html, css_vars, screenshot_png, source_url, intent_guess,     │
│    block_composition, capturing_agent }                          │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
              ┌── 1. compute hashes ──┐
              │  content_hash         │  (Python hashlib + DOM normaliser script)
              │  structure_hash       │  (NEW: scripts/fingerprint.py)
              │  phash                │  (Python imagehash — NEW dep)
              └──────────┬────────────┘
                         ▼
              ┌── 2. Layer 1 lookup ──┐
              │  SELECT … WHERE       │
              │   content_hash = ?    │
              └─────┬───────┬─────────┘
                    │ HIT   │ MISS
                    ▼       ▼
              skip+log   3. Layer 2 lookup
                            ┌─────┬─────┐
                            │ HIT │ MISS│
                            ▼     ▼
                         variant  4. Layer 3 lookup
                                     ┌─────┬─────┐
                                     │ HIT │ MISS│
                                     ▼     ▼
                                  human   5. classification (LLM + auto)
                                  queue   ▼
                                          6. confirm prompt (Y/edit/skip/flag)
                                          ▼
                                          7. register:
                                             - INSERT clone_observations (external)
                                               OR INSERT patterns (SGS-native)
                                          8. write pattern file:
                                             plugins/sgs-blocks/patterns/<slug>/
                                          9. /sgs-update refresh
                                          10. log markdown summary
```

### Step-by-step + script status

| Step | What it does | Script status |
|---|---|---|
| 1 | Compute three hashes | NEW: `plugins/sgs-blocks/scripts/fingerprint.py` (250-line single-file utility, exposes `compute_all(html, css_vars, screenshot_path)`) |
| 2 | Layer 1 dedup | NEW: query helper in `sgs-db.py dedup --hash <content_hash>` |
| 3 | Layer 2 dedup | NEW: same query helper, alternate column |
| 4 | Layer 3 dedup | NEW: requires `imagehash` Python lib + Hamming-distance scan over indexed phashes (linear at 36-row scale, fine; switch to BK-tree if >5k rows) |
| 5 | Classification | NEW: `plugins/sgs-blocks/scripts/classify-pattern.py` — calls Gemini 3 Flash via existing `/gemini-flash` route, parses JSON, validates against enum |
| 6 | Confirm prompt | NEW: TUI step in the cloning pipeline orchestrator. Default Y after 30s if non-interactive |
| 7 | Register | NEW: `sgs-db.py register-pattern --json <bundle>` — INSERT into `patterns` or `clone_observations` based on provenance flag |
| 8 | Write pattern file | EXISTING: `wp-pattern-gen.py` already writes PHP pattern files. Extend to also write `pattern.meta.json` sidecar with hashes + classification |
| 9 | sgs-update refresh | EXISTING: `/sgs-update`. Extend `update-db.py` to read `pattern.meta.json` if present and import the hash columns |
| 10 | Log summary | NEW: append to `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/clone-log.md` |

### Sample registered row

```json
{
  "slug": "sgs/hero-warm-split-indus-001",
  "title": "Indus warm-split hero (clone observation)",
  "category": "external",
  "intent": "hero",
  "industry": "food",
  "design_family": "warm-friendly",
  "content_shape": "two-column-split",
  "blocks_used": ["sgs/hero", "sgs/cta-button", "sgs/image"],
  "file_path": "plugins/sgs-blocks/patterns/external/hero-warm-split-indus-001/",
  "content_hash": "sha256:7f3a…",
  "structure_hash": "sha256:9e2b…",
  "phash": 13742398472394823,
  "screenshot_path": "plugins/sgs-blocks/patterns/external/hero-warm-split-indus-001/screenshot.png",
  "provenance": {
    "source_url": "https://indusfoods.example/",
    "captured_at": "2026-05-05T14:32:00Z",
    "source_license": "observation-only",
    "capture_method": "playwright+gemini-vision",
    "capturing_agent": "wp-pattern-gen.py v0.3"
  },
  "parent_slug": null,
  "is_variant": 0,
  "needs_review": 0,
  "seen_count": 1,
  "also_seen_at": []
}
```

---

## 5. Schema gaps — what to add

### 5.1 sgs-db `patterns` — additive migration

```sql
ALTER TABLE patterns ADD COLUMN content_hash    TEXT;
ALTER TABLE patterns ADD COLUMN structure_hash  TEXT;
ALTER TABLE patterns ADD COLUMN phash           INTEGER;
ALTER TABLE patterns ADD COLUMN screenshot_path TEXT;
ALTER TABLE patterns ADD COLUMN intent          TEXT;
ALTER TABLE patterns ADD COLUMN design_family   TEXT;
ALTER TABLE patterns ADD COLUMN content_shape   TEXT;
ALTER TABLE patterns ADD COLUMN provenance_json TEXT;
ALTER TABLE patterns ADD COLUMN parent_slug     TEXT REFERENCES patterns(slug);
ALTER TABLE patterns ADD COLUMN is_variant      INTEGER DEFAULT 0;
ALTER TABLE patterns ADD COLUMN needs_review    INTEGER DEFAULT 0;
ALTER TABLE patterns ADD COLUMN seen_count      INTEGER DEFAULT 1;
ALTER TABLE patterns ADD COLUMN also_seen_at    TEXT;  -- JSON list

CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_content_hash ON patterns(content_hash);
CREATE INDEX IF NOT EXISTS idx_patterns_structure_hash ON patterns(structure_hash);
CREATE INDEX IF NOT EXISTS idx_patterns_phash ON patterns(phash);
CREATE INDEX IF NOT EXISTS idx_patterns_intent ON patterns(intent);
CREATE INDEX IF NOT EXISTS idx_patterns_industry ON patterns(industry);
```

### 5.2 New table — `clone_observations` (recommended over flag-on-`patterns`)

```sql
CREATE TABLE clone_observations (
  slug             TEXT PRIMARY KEY,
  title            TEXT,
  source_url       TEXT NOT NULL,
  captured_at      TEXT NOT NULL,
  source_license   TEXT DEFAULT 'observation-only',
  capture_method   TEXT,
  intent           TEXT,
  industry         TEXT,
  design_family    TEXT,
  content_shape    TEXT,
  blocks_suggested TEXT,        -- JSON
  content_hash     TEXT UNIQUE NOT NULL,
  structure_hash   TEXT,
  phash            INTEGER,
  screenshot_path  TEXT,
  html_path        TEXT,
  needs_review     INTEGER DEFAULT 1,
  promoted_to      TEXT REFERENCES patterns(slug),  -- non-null = promoted to canonical pattern
  seen_count       INTEGER DEFAULT 1,
  also_seen_at     TEXT,
  notes            TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_clone_obs_structure_hash ON clone_observations(structure_hash);
CREATE INDEX idx_clone_obs_phash ON clone_observations(phash);
CREATE INDEX idx_clone_obs_intent ON clone_observations(intent);
```

**Why a separate table:** IP firebreak. Anything in `clone_observations` is "we saw this on someone else's site" — never shipped to clients without a human re-implementing it cleanly into a row in `patterns`. The `promoted_to` column is the audit trail of that human step.

### 5.3 uimax — new `pattern_instances` table

uimax currently has no concrete-instance table. Proposed addition (mirrors `clone_observations` shape but with broader scope — also useful for the lead-research and design-extraction flows):

```sql
CREATE TABLE pattern_instances (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  source_url       TEXT NOT NULL,
  captured_at      TEXT NOT NULL,
  intent           TEXT,
  industry         TEXT,
  design_family    TEXT,
  content_shape    TEXT,
  content_hash     TEXT UNIQUE,
  structure_hash   TEXT,
  phash            INTEGER,
  screenshot_path  TEXT,
  tokens_json      TEXT,          -- design tokens harvested (colour, typography)
  license          TEXT,
  provenance       TEXT
);
CREATE INDEX idx_pi_intent  ON pattern_instances(intent);
CREATE INDEX idx_pi_phash   ON pattern_instances(phash);
```

Populated by the same cloning pipeline (one bundle → two writes: `clone_observations` in sgs-db, `pattern_instances` in uimax). uimax's row is reference-data oriented (token harvest, taxonomic lookup); sgs-db's is build-data oriented (which blocks, which file path).

### 5.4 Variants relationship

Already covered by `parent_slug` + `is_variant` columns in 5.1. Query: `SELECT * FROM patterns WHERE parent_slug = ?` returns all variants. No separate table needed at this scale.

---

## 6. Open questions for Bean

### 6.1 Separate `clone_observations` table, or a `provenance='external'` flag on `patterns`?

**Recommendation:** separate table. IP firebreak; cleaner promotion path; queries against `patterns` stay safe-by-default. Cost is one extra UNION for "show me everything we've ever seen" queries — acceptable.

### 6.2 What's the Layer 3 phash threshold?

Default proposed: Hamming distance ≤ 4 = match, 5–10 = review, > 10 = distinct. Bean to confirm after a calibration pass on 10 known-duplicate and 10 known-distinct hero pairs next session. Make the threshold configurable via `--phash-threshold` flag.

### 6.3 Auto-commit to git, or queue for batch human review?

**Recommendation:** queue for batch. Each clone-pipeline run produces 0-N pattern artefacts. Auto-commit per artefact pollutes git history with reverts and operator confusion. Better: pipeline writes to `plugins/sgs-blocks/patterns/_inbox/`, weekly review session promotes accepted ones into the main `patterns/` tree with a single commit. Bean to confirm the cadence.

### 6.4 Fully-automated classification, or human-confirmation default?

**Recommendation:** human-confirmation default with a `--auto` override flag. Bean's ADHD pattern is closure-on-clarity, not closure-on-speed; getting the classification wrong silently is worse than a 10-second confirm prompt. The `--auto` flag exists for batch-import scenarios (e.g. importing 50 patterns from one site clone) where the operator has pre-committed to trusting the LLM.

### 6.5 Promotion path from `clone_observations` → `patterns`

When a competitor pattern is genuinely worth replicating, what's the rewrite step? Proposal: human picks a clone_observation, drafts a clean SGS-native re-implementation, runs it through the existing visual-QA / mockup-parity validator against the original, and only then registers as `patterns`. The `promoted_to` column links them. Bean to confirm whether this is the right gate or whether something lighter (visual-similarity score over a target threshold) is enough.

### 6.6 Should structure_hash be authoritative, or a hint?

Given the headline-(c) risk, suggest demoting Layer 2 from "decisive variant-marker" to "hint that boosts Layer 3 confidence". I.e. a structure-match alone doesn't merge or variant-link; it just feeds into Layer 3's review threshold. Bean to confirm after the calibration pass.

---

## 7. Estimated build effort

| Component | Estimate |
|---|---|
| `fingerprint.py` (3 hash functions, normalisers) | 30 min |
| `classify-pattern.py` (LLM call + enum validation) | 20 min |
| Schema migration (sgs-db + uimax) | 15 min |
| `sgs-db.py dedup` + `register-pattern` subcommands | 25 min |
| Pipeline orchestrator wiring (steps 1-10) | 30 min |
| Calibration pass (10 hero pairs) | 20 min |
| Confirm-prompt TUI | 15 min |
| **Total** | **~2.5 hours** for a working v1 |

These are smallest-plausible per the time-estimates rule. Calibration may extend if Layer 2 needs demotion.

---

## File path + line count

- **Path:** `c:/Users/Bean/Projects/small-giants-wp/.claude/specs/pattern-dedup-classify-mechanics-2026-05-05.md`
- **Line count:** see file (target 300-500, this draft sits within range)
