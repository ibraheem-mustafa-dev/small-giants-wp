---
doc_type: phase-plan
phase_id: 3
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 3 — 4-layer catalogue build
session_date: 2026-05-11
plan_label: PLAN sonnet
estimated_minutes: 300-360
---

# Phase 3 — 4-layer catalogue build

**USP:** The catalogue IS the SGS column of the Rosetta Stone. After this phase, extract.py (P4) can dispatch generically across all 67 SGS blocks instead of hero-hardcoded.

**Plan label:** `[PLAN: sonnet]` — bulk authoring + cross-platform mapping; deterministic generation from block.json + render.php.

**Success criteria:**

- [ ] Directory `plugins/sgs-blocks/scripts/fingerprint-builder/output/` exists with 5 JSON files
- [ ] `layer-1-envelopes.json` — one entry per registered pattern (≥35 patterns)
- [ ] `role-templates.json` (Layer 2) — 13 roles with cross-platform recipes
- [ ] `layer-3-internal-elements.json` — one entry per block (67 blocks) with slot list + role tags
- [ ] `layer-4-inner-blocks.json` — composition data sourced from sgs-db `block_compositions` (38+ rows populated; was 1 of 39)
- [ ] sgs-db `block_compositions` updated with non-empty `block_slugs` for at least 38 patterns
- [ ] Per Hard Rule 6 (Rosetta Stone): every JSON entry carries `equivalent_implementations` payload
- [ ] Commit: `feat(p3): 4-layer catalogue shipped — 67 blocks + 35+ patterns mapped`

**Entry context:**

- Spec 14 FR1 (Layer 4), FR2 (Layer 2 role-templates), FR3 (Layer 3 slot lists), FR4 (Layer 1 envelopes), FR26 (semantic features integration)
- v1 fingerprints data at `tools/recogniser/data/fingerprints.json` — semantic features per block (USE for Layer 3 augmentation; do NOT trust block_type field per P1 finding)
- ATTR_TO_CSS dict in `plugins/sgs-blocks/scripts/pattern-fingerprint.py` — partial Layer 2 (~30 mappings)
- sgs-db `patterns` table (36 rows) — Layer 1 source
- sgs-db `block_compositions` table (39 rows, 38 empty) — Layer 4 target
- All 67 `block.json` files at `plugins/sgs-blocks/src/blocks/<slug>/block.json`
- All 67 `render.php` files (for Layer 3 slot derivation)
- theme/sgs-theme/patterns/*.php files (35 patterns)

**Tooling Index:**

| Type | Name | Used in |
|---|---|---|
| cli | Python json + sqlite3 | All steps |
| cli | BeautifulSoup (parse render.php) | Step 6 |
| cli | git | Step 12 |
| dispatch | Sonnet subagent (per-block Layer 3) | Step 6 fanout |
| skill | /sgs-db | Step 1, 3, 5 |
| skill | /uimax | Step 11 QA |

---

## Step 1 — [SESSION-START] Pre-flight + create output directory

```
Step 1 — Pre-flight + dir
  Model:       inline
  Action:      Run master pre-flight. Create `plugins/sgs-blocks/scripts/fingerprint-builder/output/` and `plugins/sgs-blocks/scripts/fingerprint-builder/` if absent.
  Outcome:     Directory exists and writable
  Marker:      SESSION-START
  Time:        2 min
  Cold-Entry:  Read master plan + spec 14 FR1-FR4 + FR26
  Tooling:     Bash mkdir
```

## Step 2 — Build Layer 1 envelopes from sgs-db patterns table

```
Step 2 — Layer 1 envelopes
  Model:       haiku
  Action:      Query `SELECT slug, title, category, blocks_used, industry FROM patterns ORDER BY slug`. For each row, emit a layer-1 entry with `pattern_slug`, `wrapper_class` (derived as `.{slug-with-dashes}` from SGS-BEM convention), `confidence` (1.0 for canonical SGS-BEM), `category`, `industry`. Write `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-1-envelopes.json` with shape: { "generated_at": ts, "source": "sgs-framework.db patterns", "envelopes": { "<pattern_slug>": { ... } } }.
  Files:       layer-1-envelopes.json (new)
  Outcome:     File written; ≥35 envelopes; each has all required fields
  Exec:        PARALLEL with Step 3
  Time:        15 min
  Tooling:     Python sqlite3
  On-Fail:     sgs-db unreachable → run /sgs-update first
  Test:
    Happy:       JSON parses; envelope count matches patterns table count
    Edge:        Pattern with non-standard slug (e.g. namespaced differently) → log + continue
    Fail:        sgs-db query error → halt
    Integration: Stage 1 BOUNDARY reads this file to recognise pattern wrappers
```

## Step 3 — Populate `block_compositions` for the 38 empty rows

```
Step 3 — Layer 4 block_compositions
  Model:       sonnet
  Action:      **PRE-FLIGHT (Adversarial QC fix):** Before the parse loop, query each `patterns.file_path` and verify the path resolves to an actual file on disk. If > 5 patterns have unresolved (NULL or missing) paths, HALT and surface as operator-review (data consistency issue). Otherwise log + skip those individually.

  For each pattern in sgs-db `patterns` where `block_compositions.block_slugs = '[]'` or NULL AND `patterns.file_path` resolves, read `theme/sgs-theme/patterns/<slug>.php`. Parse the WP block markup to extract the ordered list of block names (e.g. `<!-- wp:sgs/heading -->` → `sgs/heading`). Update the corresponding `block_compositions` row's `block_slugs` field to a JSON array of slugs. Skip patterns whose PHP file is missing (log them with `file_path-missing` reason).
  Files:       sgs-db updates (in-place SQL); log of skipped patterns
  Outcome:     ≥38 rows in `block_compositions` have non-empty `block_slugs`
  Exec:        PARALLEL with Step 2
  Time:        45 min (38 patterns × ~1 min each via parse-and-update loop)
  Tooling:     Python regex on PHP comment block markers; Python sqlite3
  On-Fail:     Per-pattern parse error → log + skip; continue with others
  Test:
    Happy:       SQL count of non-empty `block_slugs` rows ≥ 38
    Edge:        Pattern PHP contains nested patterns (recursion) — flatten one level; deep nesting → log + flag
    Fail:        All patterns failed → halt; investigate parse logic
    Integration: Layer 4 reads `block_compositions`; FR1 acceptance depends on this
```

Inline execution sketch:

```python
import re, json, sqlite3
def extract_block_names(php_body):
    # Match WP block markers: <!-- wp:sgs/foo {...} --> or <!-- wp:sgs/foo /-->
    pattern = re.compile(r'<!--\s*wp:([\w/-]+)(?:\s+\{[^}]*\})?\s*/?-->', re.DOTALL)
    return pattern.findall(php_body)

db = sqlite3.connect(SGS_DB_PATH)
empty = list(db.execute("SELECT auto_pattern_slug, file_path FROM patterns p JOIN block_compositions bc ON bc.auto_pattern_slug = p.slug WHERE bc.block_slugs = '[]' OR bc.block_slugs IS NULL"))
for slug, path in empty:
    try:
        body = open(path, encoding='utf-8').read()
        names = extract_block_names(body)
        db.execute('UPDATE block_compositions SET block_slugs = ? WHERE auto_pattern_slug = ?', (json.dumps(names), slug))
    except FileNotFoundError:
        log_skip(slug, 'PHP file missing')
db.commit()
```

## Step 4 — Build Layer 4 JSON view (cross-platform Rosetta Stone)

```
Step 4 — Layer 4 inner-blocks JSON
  Model:       sonnet
  Action:      Read `block_compositions` (now populated). For each row, emit a Layer 4 entry with `pattern_slug`, `block_slugs` (ordered array), `equivalent_implementations` JSON carrying cross-platform mapping (sgs / html_css / bootstrap / shadcn / tailwind / react_generic). For html_css mapping, generate the equivalent HTML structure inline (semantic tags matching the block sequence: heading → <h2>, feature-grid → <div class="grid">, etc.). For Bootstrap/Tailwind/shadcn/React: emit `null` for now, mark `is_gap_candidate=true` per platform — future work surfaces those via /uimax-sgs-scrape-pattern.
  Files:       layer-4-inner-blocks.json (new)
  Outcome:     File written; one entry per populated block_compositions row; html_css equivalents non-null
  Exec:        SEQUENTIAL after Step 3
  Time:        30 min
  Tooling:     Python json
  On-Fail:     html_css generation rule missing for a block → emit placeholder + log
  Test:
    Happy:       JSON parses; entry count matches block_compositions populated count
    Edge:        Pattern has 1 block (single-block-composition) → still write entry
    Fail:        json.dump error → halt
    Integration: Stage 2 MATCH consults this for composition; FR1 acceptance
```

## Step 5 — Migrate ATTR_TO_CSS dict + build Layer 2 role-templates.json

```
Step 5 — Layer 2 role-templates
  Model:       sonnet
  Action:      Author `role-templates.json` with 13 role rows. For each role: { role_slug, description, selector_strategy (one of: bem-element, bem-element-modifier, computed-style-on-selector, dom-query, parent-walk), value_extractor (callable name from extract.py: e.g. text_content, attr_href, attr_src, computed_color, computed_px_int, enum_class_probe, boolean_visibility, query_descriptor), css_property (when applicable), cross_platform_recipe: { sgs, html_css, tailwind, bootstrap, shadcn, react_generic } }. Source the 13 roles from spec 14 FR2. Migrate the existing ATTR_TO_CSS dict (~30 attribute→CSS mappings) into the relevant role entries as `applies_to_attribute_names` arrays for fast lookup.
  Files:       role-templates.json (new); pattern-fingerprint.py (annotate ATTR_TO_CSS as deprecated, point at role-templates.json)
  Outcome:     File written with 13 fully-populated roles; cross_platform_recipe non-null for at least sgs + html_css per role
  Exec:        SEQUENTIAL after Step 4
  Time:        60 min
  Tooling:     Write tool; Python read of pattern-fingerprint.py
  On-Fail:     A role's cross_platform_recipe lacks a mapping for a platform → emit null + is_gap_candidate flag
  Test:
    Happy:       JSON parses; 13 roles present; ATTR_TO_CSS attribute names cross-referenced
    Edge:        Tailwind/shadcn mappings sometimes don't exist for SGS-specific roles → null is acceptable
    Fail:        Schema validation against expected shape fails → halt
    Integration: extract.py (P4) reads this as the dispatch table
```

13-role taxonomy (canonical list from spec 14 FR2):
`colour-text`, `colour-bg`, `colour-border`, `colour-gradient`, `number-css-px`, `number-css-percent`, `spacing-token`, `shadow-preset`, `font-family-preset`, `font-size-preset`, `border-radius-token`, `transition-preset`, `image-object`, `link-href`, `text-content`, `richtext-content`, `enum-class-probe`, `boolean-visibility`, `select-from-enum`, `query-descriptor`.

(Spec lists 20 candidate roles; the "13" is the original target. Author all 20 — better coverage, same effort. Adjust phase title in final plan.)

## Step 6 — Auto-generate Layer 3 per-block slot lists (fanout)

```
Step 6 — Layer 3 internal-elements
  Model:       sonnet (fanout: dispatch one subagent per 8-10 blocks for parallelism)
  Action:      For each of 67 SGS blocks: read block.json + render.php. For each attribute in block.json, derive the DOM slot mapping using these rules (in order): (1) if render.php has explicit echo of the attribute value inside a HTML element with a `.sgs-<slug>__<element>` class, use that as the selector; (2) if block.json `selectors` field maps the attribute, use that; (3) if attribute name follows convention (`titleX` → `__title`, `subHeadlineX` → `__sub-headline`), derive selector from name; (4) fallback: log as "selector-derivation-failed" + flag for operator review. Tag each slot with its Layer 2 role (from Step 5 role-templates). Output: `layer-3-internal-elements.json` keyed by block slug, each value containing slot list + role tag + required_features + optional_features (sourced from v1 fingerprints semantic-feature data per FR26). Hero block: hand-author per the existing HERO_FINGERPRINT_SELECTORS in `tools/recogniser-v2/extract.py` — preserves the regression baseline.

  **Recursion-guard usage (resolves Gemini Flash QC concern):** wrap each per-block DOM walk in `RecursionGuard(max_depth=12)` from P2's `recursion-guard.py` module. Prevents runaway recursion on malformed mockups or render.php with deeply-nested conditional logic.
  Files:       layer-3-internal-elements.json (new); per-block subagent dispatch logs
  Outcome:     File written; 67 block entries; hero entry matches HERO_FINGERPRINT_SELECTORS bit-exactly
  Exec:        PARALLEL within (fanout — 8 subagent batches of ~8 blocks each)
  Deps:        Step 5 (needs role taxonomy for tagging)
  Time:        90 min (with 8x parallel dispatch; ~45 min serial)
  Tooling:     Python BeautifulSoup for render.php parsing; subagent fanout
  On-Fail:     Per-block parse error → log + emit partial entry + flag; do not block other blocks
  Test:
    Happy:       JSON parses; 67 entries; each has slot list non-empty (where attrs exist); hero entry matches HERO_FINGERPRINT_SELECTORS
    Edge:        Hybrid block (InnerBlocks) → slot list for the wrapper attrs only, not children
    Fail:        Hero entry doesn't match baseline → halt; refactor selector-derivation rules
    Integration: extract.py reads this as the per-block slot list
```

Fanout dispatch pattern: 8 parallel Sonnet subagents, each handling 8-9 blocks. Each subagent's prompt:

```
You are a cold subagent. For each block slug in [list of 8-9 slugs]:
1. Read plugins/sgs-blocks/src/blocks/<slug>/block.json
2. Read plugins/sgs-blocks/src/blocks/<slug>/render.php (or save.js if no render.php)
3. For each attribute in block.json's attributes object, derive slot mapping per rules below.
4. Tag each slot with its Layer 2 role from role-templates.json.
5. Cross-reference v1 fingerprints.json for semantic features (required_features, optional_features).
6. Output JSON for these blocks at /tmp/layer3-<batch-id>.json.

[Selector derivation rules + role tagging + sample output schema here]
```

Final aggregation step: merge 8 batch outputs into single `layer-3-internal-elements.json`.

## Step 7 — Hero entry verification (regression baseline)

```
Step 7 — Hero entry must match HERO_FINGERPRINT_SELECTORS
  Model:       inline
  Action:      Diff hero entry in `layer-3-internal-elements.json` against `HERO_FINGERPRINT_SELECTORS` constant in `tools/recogniser-v2/extract.py`. Selectors MUST be bit-identical (after sorting). If diff → hero entry takes precedence (use the hardcoded list verbatim).
  Files:       layer-3-internal-elements.json (potentially patched)
  Outcome:     Hero entry's selector list ⊇ HERO_FINGERPRINT_SELECTORS
  Time:        5 min
  Tooling:     Python set diff
  On-Fail:     Selectors differ → patch entry to match the constant
  Test:
    Happy:       Bit-identical match
    Edge:        Auto-derivation found MORE selectors than the constant (good — augments hero coverage); ensure superset
    Fail:        Auto-derivation MISSED a selector from the constant → patch
    Integration: Step 8 P4 golden file capture relies on hero baseline parity
```

## Step 8 — Build the catalogue generator script (idempotent re-run)

```
Step 8 — Generator script for future re-runs
  Model:       sonnet
  Action:      Write `plugins/sgs-blocks/scripts/fingerprint-builder/build-catalogue.py` — a single entry point that regenerates Layer 1 + Layer 4 (read sgs-db) + Layer 3 (parse block.json + render.php). Layer 2 role-templates.json is NOT regenerated by this script (it's hand-authored). Make idempotent: re-running produces byte-identical JSON if inputs unchanged. Add to /sgs-update Stage 5 (proposed addition — flag for post-P3 follow-up).
  Files:       build-catalogue.py (new, ~200 LOC)
  Outcome:     Running `python build-catalogue.py` regenerates Layers 1+3+4 without manual intervention
  Time:        45 min
  Tooling:     Write tool; Python json + sqlite3 + BeautifulSoup
  On-Fail:     Idempotency test fails (second run produces diff) → fix non-determinism
  Test:
    Happy:       Run twice; diff is empty
    Edge:        sgs-db has new pattern since last run → output updates correctly
    Fail:        Non-deterministic output → identify and fix (likely timestamp or set ordering)
    Integration: Future /sgs-update extension
```

## QA Gate — Catalogue complete

```
QA Gate — P3 catalogue integrity
  Model:       haiku
  Check:       Python script asserting: (1) all 5 JSON files exist; (2) each parses; (3) layer-1 envelope count ≥ 35; (4) layer-2 role count ≥ 13 (target 20); (5) layer-3 block count = 67; (6) hero layer-3 entry contains every selector in HERO_FINGERPRINT_SELECTORS; (7) layer-4 entry count ≥ 38; (8) every Layer 2 role has non-null sgs + html_css recipe entries
  Pass:        Stdout "PASS: catalogue ready for P4"
  Fail:        Return to failing step
  Marker:      QA
```

## Step 9 — [HANDOFF] Commit P3 + push

```
Step 9 — Commit P3
  Model:       inline
  Action:      Stage `plugins/sgs-blocks/scripts/fingerprint-builder/` (output JSONs + generator script). Commit: `feat(p3): 4-layer catalogue shipped — Rosetta Stone SGS column populated`. Push.
  Outcome:     Commit on origin/main
  Marker:      HANDOFF
  Time:        3 min
  Test:
    Happy:       Commit visible
    Fail:        Pre-commit hook reject → fix
    Integration: P4 + P5 + P7 + P8 unblock
```

## Optional follow-up (parked, not blocking P3 ship)

- Populate Bootstrap / Tailwind / shadcn / React equivalents in `equivalent_implementations` across Layer 2/3/4 — currently null with `is_gap_candidate=true`. Captured as parking entries; surfaces via future `/uimax-sgs-scrape-pattern` runs.
- Extend `/sgs-update` to invoke `build-catalogue.py` as a new stage — keeps catalogue current as blocks evolve.
