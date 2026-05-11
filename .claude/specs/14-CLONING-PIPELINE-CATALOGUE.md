---
doc_type: spec
spec_id: 14
spec_version: 2.1
project: small-giants-wp
title: SGS Cloning Pipeline — Autonomous Draft-to-WordPress Conversion
status: APPROVED (round-2 QC passed 6/6 GO-WITH-CHANGES; 5 critical fixes folded in)
session_date: 2026-05-11
authors: Bean + Claude (Opus 4.7)
supersedes: parts of spec 12 (pipeline stages remain authoritative; this spec adds the catalogue + autonomy + Rosetta Stone integration layer)
depends_on: spec 12 (DRAFT-TO-SGS-PIPELINE), spec 13 (DRAFT-NAMING-CONVENTION)
companion_doc: .claude/cloning-pipeline-flow.md (one-page visual reference)
v2_changes: visual-qa-gated apply pattern; full theme.json token surface coverage; supports-first attribute writing; button role + dynamic-link via SGS-BEM modifier (no NLP); semantic feature taxonomy from v1 fingerprints; /wp-blocks CLI integration; block-variation matching; pre-commit gate chain; /sgs-update post-success; /wp-theme-check presets as token source; pattern-not-template-part scaffolding; media-library sideloading; build locking; idempotency; confidence scoring; FR5 golden file; revised time estimate
v2_1_changes: per-client overrides route to style variation file (never root theme.json) — closes Gemini Pro structural concern; FR12 deprecation template content defined (previous save() output verbatim + attribute migration); FR21 PASS branch adds post-merge build verification (rebuild canonical, redeploy, pixel-diff against approved); Q-open-5 resolved as filesystem move-then-replace (not git apply); FR8 schema adds `status` field (pending/applied/discarded) with FR21 lifecycle management to prevent DB pollution on visual-qa FAIL
---

# Spec 14 — SGS Cloning Pipeline — Autonomous Draft-to-WordPress Conversion (v2.1)

## 1. One-liner

A single-command script-driven pipeline that converts any HTML+CSS draft (Bean-controlled SGS-BEM or external scrape) into a deployed SGS WordPress clone ready for operator review, with new patterns / atomic-blocks / attributes / functionality extensions auto-detected and auto-applied **only when visual-qa passes**. Every clone compounds the cross-platform Rosetta Stone catalogue.

## 2. Pain point and motivation

Today's `/sgs-clone` runs structurally end-to-end across 9 boundaries in Mama's Munches mockup but only `sgs/hero` produces non-empty extracted attributes (extract.py is hero-hardcoded at 1569 LOC). Beyond Phase 8, no automation exists for surfacing new patterns / blocks / attributes / functionality from each clone — the framework cannot compound across client work.

Documented infrastructure that does NOT exist on disk (verified via `git log --all`): `plugins/sgs-blocks/scripts/fingerprint-builder/` directory, 5-file 4-layer catalogue, and 4 of 8 recogniser scripts (`heuristic-fallback-builder.py`, `computed-style-passport.py`, `recursion-guard.py`, `critical-fix-verification.py`). architecture.md, /sgs-clone SKILL.md, and state.md all corroborate the false claim. This spec reconciles disk reality alongside the build.

## 2.5 — Build status inventory

What exists on disk vs what this spec creates / mutates. Scan first in any future session.

Legend: **✓** = exists and usable as-is | **◐** = partial (exists but needs extending/refactoring) | **✗** = missing (this spec builds it) | **🔧** = exists but mutated by pipeline (gated by FR21 visual-qa-pass)

### Catalogue files (4-layer Rosetta Stone — SGS column)

| Artefact | Status | Location | Owned by |
|---|---|---|---|
| Layer 1 envelopes JSON | ✗ | `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-1-envelopes.json` | FR4 |
| Layer 2 role-templates JSON | ◐ → ✗ → ✓ | `plugins/sgs-blocks/scripts/fingerprint-builder/output/role-templates.json` | FR2 (consumes existing `ATTR_TO_CSS` dict in `pattern-fingerprint.py`, ~30 entries) |
| Layer 3 internal-elements JSON | ✗ | `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-3-internal-elements.json` | FR3 (consumes v1 fingerprints semantic-feature data) |
| Layer 4 inner-blocks data | ◐ | sgs-db `block_compositions` table (39 rows, 38 with empty `block_slugs`) | FR1 fills the 38 empty rows |

### Recogniser scripts (`plugins/sgs-blocks/scripts/recogniser/`)

| Script | Status | Notes | Owned by |
|---|---|---|---|
| `per-section-convention-voter.py` | ✓ | Shipped 2026-05-11 (commit 7ac627cf) | — |
| `confidence-matrix.py` | ✓ | Shipped 2026-05-11 | — |
| `leftover-bucket-router.py` | ✓ → 🔧 | Exists; FR9 patches to split into 4 gap-level buckets | FR9 |
| `simple_html_review_report.py` | ✓ | Shipped 2026-05-11 | — |
| `heuristic-fallback-builder.py` | ✗ | Never existed; doc claim was false | FR18 (decide: build or retire) |
| `computed-style-passport.py` | ✗ | Never existed; FR3 fallback uses Playwright runtime probe instead | FR18 (decide: build or retire) |
| `recursion-guard.py` | ✗ | Never existed | FR18 (decide: build or retire) |
| `critical-fix-verification.py` | ✗ | Never existed; recommendation: build as acceptance harness | FR18 (recommended build, ~2 hr) |

### Pipeline orchestration scripts

| Script | Status | Notes | Owned by |
|---|---|---|---|
| `tools/recogniser-v2/extract.py` | 🔧 | Exists, 1569 LOC, hero-hardcoded; FR5 refactors to ≤ 700 LOC catalogue-driven dispatcher; hero block retained as override | FR5 |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | ✓ → 🔧 | Multi-section walker shipped 2026-05-11 (commit 690169a3); FR15 adds pre-flight chain + post-success chain | FR15 |
| `plugins/sgs-blocks/scripts/pattern-fingerprint.py` | ✓ → ◐ | Carries the ~30-entry `ATTR_TO_CSS` dict; FR2 migrates to role-templates.json and deprecates the standalone dict | FR2 |
| `plugins/sgs-blocks/scripts/pattern-classify.py` | ✓ | Used by /sgs-clone Stage 9 +REGISTER | — |
| `plugins/sgs-blocks/scripts/pattern-register.py` | ✓ | Used by /sgs-clone Stage 9 +REGISTER | — |
| `tools/recogniser/*.py` (v1) | ✓ | 8 scripts, ~3067 LOC, archived but kept for fingerprints.json data + reference | — (no longer invoked at runtime; data is the asset) |

### v1 data assets (consumed, not mutated)

| Artefact | Status | Notes | Owned by |
|---|---|---|---|
| `tools/recogniser/data/fingerprints.json` | ✓ | 78 blocks scaffolded, 54 attr_extractors, semantic feature markers (`required_features`, `optional_features`, `block_type` static/dynamic) | FR3 + FR26 + FR12 (consume) |

### uimax + sgs-db tables

| Table | Status | Notes | Owned by |
|---|---|---|---|
| sgs-db `block_compositions` | ◐ | 39 rows; 38 with empty `block_slugs` | FR1 fills |
| sgs-db `patterns` | ✓ → 🔧 | 36 rows; `fingerprint` column 0/36 populated (FR11 writes per-run during scaffold) | FR11 |
| uimax `naming_conventions` | ✓ | 16 rows; SGS WordPress canonical row at `is_canonical_for_sgs_drafts=1` (shipped 2026-05-07) | — |
| uimax `animations` | ✓ | 63 rows with Rosetta Stone columns (`sgs_block`, `sgs_animation_attribute`, etc.) | — |
| uimax `component_libraries` | ✓ → 🔧 | 210 rows incl. 66 SGS Blocks synced 2026-05-10; **missing `is_gap_candidate` column** | FR7 adds column |
| uimax `patterns` | ✓ | Cloning-pipeline target table; cross-platform `equivalent_implementations` schema present | — |
| uimax `attribute_gap_candidates` | ✗ | New table | FR8 creates |
| uimax `functionality_gap_candidates` | ✗ | New table | FR8 creates |

### Integration CLIs (existing, wired in by this spec)

| Tool | Status | Wired in by |
|---|---|---|
| `/uimax-classify-naming` | ✓ | FR6 (lingua-franca-conversion at Stage 1) |
| `/uimax-sgs-scrape-pattern` | ✓ | Stage 9 +REGISTER (called per novel pattern) |
| `/uimax-scrape-animation` | ✓ | Stage 9 +REGISTER (called per novel animation) |
| `/uimax-scrape` | ✓ | FR6 (token harvest during external-scrape conversion) |
| `/ui-ux-pro-max` | ✓ | Stage 6 + Stage 9 (judgement calls only) |
| `/visual-qa` | ✓ | FR16 (auto-invoked on staged deploy) |
| `/sgs-db` | ✓ | FR12 / FR14 pre-flight (`impact <slug>` + `weaknesses` + `gotchas`); FR15 pre-flight (`context <variation>`) |
| `/sgs-update` | ✓ | FR33 (auto-invoke after FR21 PASS) |
| `/wp-blocks` | ✓ | FR27 wires 8 subcommands across pipeline stages |
| `/wp-theme-check` | ✓ | FR22 (`presets theme.json` as authoritative token source); FR32 gate (`validate`) |
| `/wp-hook-graph` | ✓ | FR32 gate (validate hooks in scaffolded render.php) |
| `/wp-hooks` | ✓ | FR32 anti-hallucination guard |
| `/lint` | ✓ | FR32 gate (first step) |
| `/diagnostics` | ✓ | FR32 gate (LSP error check) |
| `/wp-perf-gate` | ✓ | FR32 gate (auto-fires on commit; spec integrates verdict) |
| `uimax-write-validator.py` | ✓ | Used by uimax-* skills (no-licensing + Rosetta Stone enforcement) |
| `uimax_write.py` | ✓ | Single chokepoint for all uimax writes |
| `scripts/mockup-parity-validator.js` | ✓ | /visual-qa internal |
| `scripts/screenshot-diff-helper.js` | ✓ | /visual-qa internal; FR21 post-merge verification |
| `tools/multi-frame-qa/capture.js` | ✓ | /visual-qa internal |
| `scripts/global-styles-reset.js` | ✓ | +DEPLOY tail stage |
| `scripts/wp-update-block-attrs.js` | ✓ | +DEPLOY tail stage |

### Doc reconciliation targets (FR17)

| Doc | Current state | Action |
|---|---|---|
| `architecture.md` L151 | Falsely claims 4-layer catalogue shipped 2026-05-08 with row counts | FR17 reframes as "to be built per spec 14" |
| `/sgs-clone` SKILL.md pre-flight checks | References 4 missing recogniser scripts + missing `fingerprint-builder/output/` directory | FR17 reconciles with spec 14 / FR18 decisions |
| `state.md` | Drift on script inventory + extract.py LOC | FR17 corrects |
| `decisions.md` line 84 | Claims "Rosetta Stone infrastructure is structurally ready" — partially true; tables exist, catalogue files don't | FR17 notes the partial-truth |

### Net build surface

- **Net-new files:** ~12 (Layer 1/2/3 catalogue JSONs, 4 new DB schema migrations including FR8's `status` field, FR11 pattern scaffolder, FR14 block scaffolder, FR19 media sideloader, FR20 build mutex helper, FR21 staged-merge orchestrator, FR22 token resolver, FR32 gate chain runner, FR18 critical-fix-verification harness)
- **Net-new lines on top of existing tools:** ~3,500 LOC across all FRs (most FRs are wiring to existing CLIs)
- **Refactor surface:** extract.py 1569 → ≤ 700 LOC (FR5)
- **Doc reconciliation:** 4 docs (FR17)

## 3. Goal

Single-command autonomous draft-to-clone, gated by visual-qa, leaving the canonical framework untouched until visual-qa machine-verifies the clone:

```
/sgs-clone <draft-path>
   → 9-stage pipeline + 4-level gap detection
   → all mutations land in pipeline-state/<run-id>/staging/
   → pre-commit gate chain (lint / diagnostics / perf / theme-check / hook-graph)
   → deploy staged version to sandybrown
   → /visual-qa runs against deployed URL
   → ON PASS: staged mutations merge to canonical + /sgs-update refresh
   → ON FAIL: staged mutations discarded; canonical untouched
   → output bundle: deployed URL + visual-qa report + gap-candidate manifest
```

## 4. Non-goals (out of scope)

- Visual-parity validator + screenshot-diff (already exist as `scripts/mockup-parity-validator.js` + `scripts/screenshot-diff-helper.js`)
- Deployment automation (tar/scp/OPcache/LiteSpeed already exist)
- Multi-frame capture infrastructure (already exists at `tools/multi-frame-qa/capture.js`)
- uimax write infrastructure (`uimax-write-validator.py` and `uimax_write.py` already exist)
- Building NEW blocks / attributes / extensions for use cases the pipeline does NOT surface (manual feature work outside the pipeline remains a separate workflow)
- Style variation creation (separate workflow via `/innovative-design`)
- Theme template authoring (separate workflow via `/wp-block-themes`)
- Animation taxonomy expansion (already covered by `/uimax-scrape-animation`)
- Editing stable framework template-part files (`theme/sgs-theme/parts/*.html` are stable slots — never auto-scaffolded by this pipeline)
- LLM-based intent detection for Bean-controlled drafts (semantics live in SGS-BEM modifier slots — see Spec 13)

## 5. Architecture summary

### 5.1 Canonical language

SGS-BEM (`.sgs-<block>__<element>--<modifier>`) per Spec 13 is the hub. uimax `naming_conventions.SGS WordPress` row is flagged `is_canonical_for_sgs_drafts=1` and carries the canonical `pattern_regex` and `extraction_rule`. 15 other conventions (BEM, Tailwind, Bootstrap, shadcn, Material UI, Atomic, OOCSS, SUIT, Astra, Kadence, Spectra, WP Gutenberg native, Lovable, v0, Bolt) map to and from the hub via lingua-franca-conversion rules in uimax.

**Key consequence:** intent semantics are encoded in the modifier slot. `.sgs-button__cta--primary` IS a primary CTA. `.sgs-button__cta--latest-blog` IS a latest-blog dynamic link. No NLP needed for in-house drafts; external scrapes go through deterministic per-convention conversion rules.

### 5.2 Four-layer catalogue (the SGS column of the Rosetta Stone)

| Layer | Stores | Storage | Cross-platform link |
|---|---|---|---|
| Layer 1 — envelopes | Pattern wrapper class → pattern slug | uimax `naming_conventions.pattern_regex` (canonical row) + Layer-1 JSON | One per convention; lingua-franca routes non-canonical to canonical |
| Layer 4 — inner-blocks | Pattern slug → ordered block composition | sgs-db `block_compositions.block_slugs` JSON array | uimax `patterns.equivalent_implementations` carries cross-platform pattern equivalents |
| Layer 3 — internal-elements | Block → DOM slot mapping + role tag per slot | `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-3-internal-elements.json` | uimax `component_libraries` (66 SGS Blocks synced) extended with per-platform slot mappings |
| Layer 2 — attribute-roles | Slot role → extraction strategy + cross-platform recipe | `plugins/sgs-blocks/scripts/fingerprint-builder/output/role-templates.json` (13-role taxonomy) | Each role row carries `sgs`, `html_css`, `tailwind`, `bootstrap`, `shadcn`, `react_generic` recipes |

### 5.3 Gap detection at four levels (auto-apply ONLY after visual-qa PASS)

| Gap level | Detection signal | uimax home | Staged action |
|---|---|---|---|
| Pattern | Stage 2 MATCH returns no SGS pattern slug for a section | `patterns.is_gap_candidate=1` | Stage `theme/sgs-theme/patterns/<slug>.php` |
| Atomic block | Stage 2 MATCH returns no SGS block slug for an atomic role within a section | `component_libraries.is_gap_candidate=1` | Stage `plugins/sgs-blocks/src/blocks/<slug>/` (6-file scaffold) |
| Attribute | Bucket C declaration on a CSS property present in Layer 2 role taxonomy (first-sighting promotion via role classifier; no frequency threshold) | `attribute_gap_candidates` (new table) | Stage block.json edit (+ deprecated.js for static blocks) |
| Functionality | Pseudo-state / media-query / animation rule on block lacking matching extension | `functionality_gap_candidates` (new table) | Stage bulk apply to ALL eligible blocks per extension type |

### 5.4 Autonomous flow (visual-qa gated)

See the one-page visual reference at `.claude/cloning-pipeline-flow.md`. Summary:

```
draft → naming-convention check → (lingua-franca convert if needed)
      → per-section walk: pattern → composition → slots → role-based extraction
      → gap detection (4 levels, recorded with cross-platform mappings)
      → ALL mutations staged to pipeline-state/<run-id>/staging/  (canonical untouched)
      → pre-commit gate chain (lint, diagnostics, perf-gate, theme-check, hook-graph)
      → deploy staged version
      → visual-qa runs
      → PASS: merge staged → canonical + /sgs-update; bundle output
      → FAIL: discard staged; canonical untouched; bundle failure report
```

## 6. Hard constraints

- **SGS-BEM canonical (Spec 13).** All Bean-controlled drafts conform. External scrapes use lingua-franca-conversion. Validation regex `^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`.
- **Rosetta Stone discipline (blub.db row 213).** Every uimax write carries `equivalent_implementations` populated. Validator enforces.
- **No licensing language (blub.db row 211).** Source taxonomy is `idea` / `draft` / `<URL>` only.
- **Patterns over single blocks (blub.db row 209).** Mockup sections map to PATTERNS holding 1+ blocks. Single-block emission is the inner step. Hero is the composite-single-block exception.
- **No em-dashes anywhere** (Bean preference 2026-05-08).
- **Coverage gate: zero silent loss.** Every block.json attribute lands in extracted / defaulted / flagged. Every CSS declaration lands in Bucket A / B / C.
- **No `--resume` flag** (Bean correction). Sessions are atomic.
- **Verify rendered output, not internal metrics** (lessons 194 + 207). Visual-qa is the FINAL gate; pre-commit chain is the FIRST gate.
- **No mid-run operator confirms.** Single command in, single output back.
- **No canonical mutation until visual-qa PASS.** All FR12 / FR13 / FR14 mutations land in `pipeline-state/<run-id>/staging/` first. Merge to canonical happens only after visual-qa PASS. Discard on FAIL leaves the framework untouched.
- **Idempotent runs.** Run 2 against the same draft after a successful run 1 produces zero filesystem changes and zero new gap-candidate rows. FR12/FR14 check for existence before writing.
- **Single build mutex.** Only one `npm run build` invocation runs at a time against `plugins/sgs-blocks/`. Build operations serialise via lock file.
- **Hero override preserved during cutover.** The existing `extract_hero()` and `HERO_FINGERPRINT_SELECTORS` are kept as per-block override entries. Regression on hero coverage is a fail.
- **Template parts are stable framework slots.** `theme/sgs-theme/parts/*.html` files are never auto-scaffolded by this pipeline. Per-client header/footer/mega-menu CONTENT is delivered via patterns at `theme/sgs-theme/patterns/`.
- **Root theme.json is never mutated by this pipeline.** All per-client style overrides, token additions, and `styles.blocks` entries route to the active style variation file at `theme/sgs-theme/styles/<client-slug>.json` (created if missing). Root `theme/sgs-theme/theme.json` is the framework baseline and stays pristine across all clones. Closes the Gemini Pro round-2 framework-poisoning concern: 50 sequential clones produce 50 variation files, not one bloated root theme.json.

## 7. Functional requirements

Each FR carries a model recommendation and a holistic 4-layer test strategy.

### FR1 — Populate Layer 4 `block_compositions` for the 9 Mama's mockup patterns

Fill the `block_slugs` array on the 9 unregistered Mama patterns plus any other patterns added during this spec build. Hand-authored by reading mockup HTML and identifying inner-block boundaries.

- **Model:** Sonnet
- **Tests:** Unit (SQL select returns expected `block_slugs` per pattern slug); Integration (`/sgs-clone --section .sgs-ingredients-section` correctly recurses into inner block list); End-to-end (full Mama's run produces non-empty extracted attributes on ≥ 7 of 9 sections); Observational (Bean opens `wp post get <id>` and confirms inner block tree matches mockup).

### FR2 — Layer 2 attribute-role taxonomy (13 roles)

Define `role-templates.json` at `plugins/sgs-blocks/scripts/fingerprint-builder/output/role-templates.json`. Roles: `colour-text`, `colour-bg`, `colour-border`, `colour-gradient`, `number-css-px`, `number-css-percent`, `spacing-token`, `shadow-preset`, `font-family-preset`, `font-size-preset`, `border-radius-token`, `transition-preset`, `image-object`, `link-href`, `text-content`, `richtext-content`, `enum-class-probe`, `boolean-visibility`, `select-from-enum`, `query-descriptor`. Each role row carries: role slug, description, extraction recipe (selector strategy + value extractor + CSS property if applicable), cross-platform equivalents (`html_css`, `tailwind`, `bootstrap`, `shadcn`, `react_generic`).

**Source data:** consume the existing `ATTR_TO_CSS` dict in `plugins/sgs-blocks/scripts/pattern-fingerprint.py` (~30 entries — partial Layer 2 already populated). Migrate into role-templates.json with role tags added; deprecate the standalone dict.

- **Model:** Sonnet
- **Tests:** Unit (every role has all required fields populated; cross-platform fields non-null); Integration (extract.py dispatch reads role-templates and calls the right strategy per role); End-to-end (hero re-extraction via convention-dispatcher matches existing hardcoded output — regression guard); Observational (Bean reviews the taxonomy for coverage gaps before commit).

### FR3 — Auto-generate Layer 3 per-block slot lists for all 48 SGS blocks

Script reads each `block.json` + `render.php` per block, derives the DOM slot mapping per attribute, tags each slot with its Layer 2 role. Output: `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-3-internal-elements.json`. Hero gets a hand-authored entry that mirrors the existing hardcoded selectors as an override.

**PHP analysis fallback:** when static analysis cannot resolve a slot selector from `render.php` (e.g. dynamic conditionals, loops, nested template includes), fall back to a Playwright runtime probe against a rendered fixture. Document the fallback explicitly per block where it applies.

- **Model:** Sonnet
- **Tests:** Unit (for each block, output contains one slot per declared block.json attribute); Integration (extract.py reads layer-3, identifies slots by block name, applies layer-2 role strategy); End-to-end (pipeline produces ≥ 30 attrs filled per non-hero block on Mama's mockup); Observational (Bean spot-checks 3 random blocks' slot lists against block.json).

### FR4 — Layer 1 envelope fingerprints derived from SGS-BEM convention

Layer 1 is cheap because SGS-BEM declares the wrapper class directly: `.sgs-<pattern-slug>`. Script enumerates registered patterns from `sgs-db.patterns` and writes one envelope entry per pattern. Output: `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-1-envelopes.json`. Each entry carries an **extraction confidence score** (1.0 for canonical SGS-BEM exact match; lower for fuzzy patterns).

- **Model:** Haiku
- **Tests:** Unit (every pattern slug in sgs-db has a corresponding layer-1 entry); Integration (Stage 1 BOUNDARY uses layer-1 to recognise pattern wrappers); End-to-end (all 9 Mama sections detected); Observational (voter output lists 9 boundaries).

### FR5 — Refactor `extract.py` to dispatch via the 4-layer catalogue

Replace `FINGERPRINTS = {'sgs/hero': ...}` and the 526-line `extract_hero()` with a convention-driven dispatcher. Reads layer-3 to find slot list per block, layer-2 to find extraction strategy per role, applies the strategy. Hero's existing `extract_hero` stays as a per-block override (precedence: override > convention). Target: extract.py ≤ 700 LOC.

**Golden-file regression guard.** Before refactor, run today's extract.py on Mama's hero fixture and commit the JSON output as `tests/golden/hero-extraction-baseline.json`. FR5's integration test diffs the refactored output against this baseline. Bit-exact match required.

**Confidence score per extracted value.** Each attribute value carries a `confidence` field (0-1) derived from the extraction strategy: exact CSS match = 1.0, computed-style match = 0.9, fuzzy class probe = 0.7, fallback default = 0.3. Bucket C entries with confidence < 0.7 surface in operator manifest and do NOT trigger FR10 auto-promotion.

- **Model:** Opus 4.7
- **Tests:** Unit (dispatcher correctly routes by role slug; override resolution gives override precedence); Integration (hero re-extraction matches golden-file bit-exactly); End-to-end (trust-bar + heritage-strip produce ≥ 30 attrs filled); Observational (Bean reviews diff of extract.py before commit; coverage report verified).

### FR6 — Lingua-franca conversion at Stage 1

When `/uimax-classify-naming` reports the source convention is not SGS-BEM, rewrite class names to SGS-BEM canonical form before Stage 2. Original convention preserved as sibling rows in `equivalent_implementations`. Conversion rules per source convention stored in uimax `naming_conventions.extraction_rule`.

**Tier-1 → tier-2 → tier-3 fallback** for unresolved conversions:
- Tier 1: class-name pattern match (e.g. `.btn-primary` Bootstrap → `.sgs-button__cta--primary`)
- Tier 2: DOM-structure heuristic (filled button inside hero → likely primary CTA)
- Tier 3: route to leftover-bucket-router as `unrecognised-cta-role`; surface in operator review HTML

**Lossy-conversion guard.** If conversion produces ambiguous semantic mapping, flag the section as a structural-mismatch-or-orphan rather than proceed with low-confidence output.

- **Model:** Sonnet
- **Tests:** Unit (each supported convention has a documented conversion rule); Integration (Tailwind sample converts cleanly to SGS-BEM); End-to-end (external Bootstrap mockup runs through full pipeline); Observational (Bean inspects converted class names).

### FR7 — Add `is_gap_candidate` column to uimax `component_libraries`

Schema migration. Default `0`. Mirrors existing `animations` + `patterns` column convention.

- **Model:** Haiku
- **Tests:** Unit (column exists, defaults to 0); Integration (gap-detection writes `is_gap_candidate=1` for atomic-block leftovers); End-to-end (Mama's run produces ≥ 1 gap candidate); Observational (Bean queries uimax).

### FR8 — Create `attribute_gap_candidates` + `functionality_gap_candidates` tables

Schema: `id`, `block_slug`, `selector`, `css_property` (or `feature_type` for functionality), `value_seen`, `role_proposed`, `confidence`, `seen_count`, `last_seen`, `staged_at`, `applied_at` (NULL until visual-qa PASS), `provenance` (run_id), **`status`** (enum: `pending` / `applied` / `discarded`, default `pending`).

**Status lifecycle managed by FR21:**
- New rows write with `status='pending'` during the pipeline run
- On visual-qa PASS + canonical merge: FR21 flips matching rows to `status='applied'` + sets `applied_at` timestamp
- On visual-qa FAIL OR pre-commit gate FAIL: FR21 flips matching rows to `status='discarded'` + retains `provenance` for audit
- Closes the Gemini Flash round-2 DB-pollution concern: failed runs do not leave phantom candidates in active state. Queries that drive operator review filter by `status='applied'` OR `status='pending'`; never read `discarded` rows.

- **Model:** Haiku
- **Tests:** Unit (tables created with correct schema; INSERT works); Integration (Stage 6 Bucket C writes when role taxonomy matches); End-to-end (full run produces non-zero rows); Observational (Bean queries the tables).

### FR9 — Patch `leftover-bucket-router.py` for 4 gap-level buckets

Split today's conflated `unrecognised-section` bucket into: `pattern-gap`, `atomic-block-gap`, `attribute-gap`, `functionality-gap`. Plus existing `animation-unclassified`, `extraction-failed`, `structural-mismatch-or-orphan`. Tag each leftover with cross-references to `/sgs-db weaknesses` and `/sgs-db gotchas` for the affected block.

- **Model:** Sonnet
- **Tests:** Unit (router correctly routes known-pattern-gap fixture); Integration (Stage 9 REPORT calls router and bucket counts match); End-to-end (Mama's run produces sensible buckets); Observational (Bean reads operator-review.html).

### FR10 — Bucket C → attribute candidate via role-taxonomy lookup (NO auto-apply)

When Stage 6 CLASSIFY produces a Bucket C entry, check if its CSS property is in the Layer 2 role taxonomy AND extraction confidence ≥ 0.7. If yes: write row to `attribute_gap_candidates` with `confidence` field populated AND `status='pending'` (per FR8 lifecycle); stage the block.json edit. If no: emit as scoped wp:html style block (existing behaviour). **No auto-apply at this stage** — application happens at FR21 (visual-qa-gated merge), which flips `status` to `applied` on PASS or `discarded` on FAIL.

- **Model:** Sonnet
- **Tests:** Unit (classifier identifies `letter-spacing` as role-taxonomy-present; `clip-path` as absent); Integration (Stage 6 + Stage 9 promotes a known-eligible entry to the staged change set); End-to-end (Mama's run stages ≥ 1 attribute candidate); Observational (Bean reviews the staged manifest pre-deploy).

### FR11 — Pattern auto-scaffold (staged)

For every pattern flagged `is_gap_candidate=1`, generate a staged PHP file at `pipeline-state/<run-id>/staging/theme/sgs-theme/patterns/<slug>.php` with header comment block (`Title:`, `Slug:`, `Categories:`, `Description:`) plus the captured serialised block markup body. Idempotent — existing pattern slugs skip. Per-client variant naming follows existing convention: `header-<client-slug>.php`, `footer-<client-slug>.php`, `mega-menu-<area>-<client-slug>.php`. **Stable framework template-parts (parts/*.html) are NEVER scaffolded by this FR** — they are framework infrastructure.

- **Model:** Sonnet
- **Tests:** Unit (scaffold function produces valid PHP with correct header); Integration (file lands in staging at the right path; idempotency check prevents duplicate when run twice); End-to-end (Mama's `sgs/ingredients-section` pattern staged); Observational (after FR21 merge, Bean opens block editor + sees new pattern in inserter).

### FR12 — Attribute staged-application (no auto-apply)

For every `attribute_gap_candidates` row from FR10, generate a staged block.json diff. For static blocks, additionally generate a staged `deprecated.js` entry.

**Pre-compute static-block list** during P1 from `sgs-framework.db` `blocks.type` field (maintained by `/sgs-update` Stage 1 codebase scan) AUGMENTED by direct save.js inspection. sgs-db's semantic is "static = no render.php"; FR12's semantic is "save.js returns non-null serialised output". The two diverge on hybrid blocks (sgs-db marks dynamic but save emits wrapper + `<InnerBlocks.Content />` marker — WP still validates the wrapper). Correct list: blocks where save.js returns non-null JSX, regardless of sgs-db classification. ~14% of SGS blocks (9 of 67 as of 2026-05-11): 6 pure-static + 3 hybrid. The list is enumerable upfront via the P1 manifest at `tests/golden/static-block-snapshots/_manifest.json`. **NOT v1 fingerprints.json `block_type` field** — that artefact is frozen, stale (testimonial + whatsapp-cta migrated 2026-05-05 to dynamic; not reflected in v1 data). Prepare deprecation templates per snapshot-needed block before any staged application.

**Deprecation template content (defined to prevent existing-post breakage).** Each generated `deprecated.js` entry MUST contain:

1. **`attributes`** field — exact JSON copy of the BEFORE-mutation `block.json` attributes (captured during P1 static-block snapshot)
2. **`save`** function — exact AST clone of the CURRENT `save.js` output, preserved verbatim. Captured by reading the compiled save bundle BEFORE FR12 mutates block.json. No template stubs; no regeneration from attributes — the literal previous output, byte-for-byte
3. **`migrate`** function — when the mutation adds a new attribute, returns the old attribute set unchanged (new attribute gets its `default` from the post-mutation block.json). When the mutation renames an attribute (rare), `migrate` maps old name to new
4. **`isEligible`** function — returns `true` when the saved HTML matches the pre-mutation save output (string compare). Prevents WP applying the deprecation to unrelated posts

Without this exact-content rule, existing posts using a mutated static block trigger "Block contains unexpected content" errors on every page load. Closes Practical round-2 must-fix.

**Static-block snapshot artefact:** P1 captures `tests/golden/static-block-snapshots/<slug>.json` for every static block (current attributes + current compiled save output). FR12 reads from this artefact; never tries to regenerate the previous save from current source.

**Idempotency:** FR12 reads block.json BEFORE staging the diff. If an attribute with the same name already exists, skip. If exists with different type, escalate to operator review.

Application to canonical happens only at FR21 (after visual-qa PASS) and includes `npm run build` invocation under the FR20 build mutex.

- **Model:** Sonnet
- **Tests:** Unit (staged block.json diff is valid JSON; static-block list matches v1 `block_type` field); Integration (rebuilt block renders with new attribute; edit.js exposes auto-generated control matching attribute type); End-to-end (Mama's clone uses an auto-added attribute after FR21 merge); Observational (Bean opens Site Editor for affected block; new inspector control visible + editable).

### FR13 — Functionality extension bulk application (staged)

When functionality gap detected, audit ALL SGS blocks for eligibility for that extension type via `/sgs-db impact <extension>` analysis. Apply uniformly to all eligible blocks. Example: hover-effects extension currently on 4 blocks; if gap detected on a 5th, stage `supports.sgs.hoverEffects=true` updates on all eligible blocks (those that render an interactive element and have no existing hover-effects).

**Eligibility audit via `/sgs-db impact`** rather than ad-hoc classifier. Surfaces cascading impact + known weaknesses + known gotchas per affected block. Operator review HTML includes the impact summary.

**Idempotency:** FR13 checks existing `supports.sgs.<feature>` before staging. No-op if already enabled.

- **Model:** Opus 4.7
- **Tests:** Unit (eligibility classifier returns correct subset; `/sgs-db impact` invoked + parsed); Integration (bulk staged application updates ≥ 1 block.json; rebuild succeeds under FR20 mutex); End-to-end (Mama's mockup stages extension to additional blocks if functionality gap detected); Observational (Bean inspects extension coverage table post-merge).

### FR14 — Atomic-block auto-scaffold (staged, full 6-file scaffold)

When `component_libraries.is_gap_candidate=1` flagged, scaffold the 6-file block directory at `pipeline-state/<run-id>/staging/plugins/sgs-blocks/src/blocks/<slug>/` from a template. Files: `block.json`, `edit.js` (auto-generated InspectorControls per attribute type), `save.js` (returns null for dynamic blocks — the default), `render.php` (template interpolating extracted markup with `$attributes`), `style.css` (harvested Bucket-C scoped CSS for this block), `view.js` (omitted unless interactivity detected).

**Pre-flight via `/sgs-db impact <similar-existing-slug>`** to gauge naming-collision risk + framework conventions for the role.

**Hook validation:** `/wp-hook-graph validate` runs on the staged render.php before deploy. Any reference to a non-existent WP hook fails FR32 (pre-commit gate chain).

**Idempotency:** FR14 checks `plugins/sgs-blocks/src/blocks/<slug>/block.json` exists before scaffolding. No-op if already exists.

Application to canonical happens only at FR21 (after visual-qa PASS) and includes `npm run build` invocation under the FR20 build mutex.

- **Model:** Opus 4.7
- **Tests:** Unit (scaffold produces 6 syntactically valid files); Integration (build succeeds under mutex; PHP fatal-checker passes; editor loads block without console errors); End-to-end (novel atomic role from Mama's scaffolded and rendered on clone after FR21 merge); Observational (Bean opens block editor; finds new block; inserts it; renders it).

### FR15 — Single autonomous command entry

`/sgs-clone <draft-path>` runs the full chain by default in autonomous mode. No `--autonomous` flag needed — autonomy is the default. Existing `--section`, `--auto-section`, `--draft-mode`, `--legacy` flags remain for partial runs and pre-Spec-13 mockups. New flag `--no-deploy` for dry-run that produces the report without shipping.

**Pre-flight chain (before pipeline starts):**
1. `/sgs-db context <variation>` — activate the correct style variation for the target client
2. `/wp-blocks health` — confirm DB readiness
3. `git status --porcelain` — abort if uncommitted changes touch blocks the pipeline is likely to mutate

**Post-success chain (after FR21 merge):**
1. `/sgs-update` — full 4-stage refresh (DB scan + block reference regen + uimax sync + animation gap scan)
2. Visual-qa report bundled into output deliverable

- **Model:** Sonnet
- **Tests:** Unit (argparse accepts new default mode without breaking existing flags); Integration (full autonomous run completes without operator interaction); End-to-end (`/sgs-clone sites/mamas-munches/mockups/homepage/` produces deployed clone + visual-qa report); Observational (Bean times the run; reports wall-clock duration).

### FR16 — Auto-invoke `/visual-qa` at end of run

After staged deploy completes, invoke `/visual-qa` on the deployed URL. Multi-frame capture, pixel-diff at 375/768/1440, axe-core accessibility, mockup-parity-validator, screenshot-diff (perceptual). The visual-qa verdict gates FR21.

Output bundled into operator deliverable at `reports/visual-diff/<run-id>.md`.

- **Model:** Haiku
- **Tests:** Unit (visual-qa invocation wired into +VISUAL-QA tail stage handler); Integration (passing pipeline produces a visual-qa report at expected path); End-to-end (Mama's autonomous run terminates with visual-qa report attached); Observational (Bean opens the report + deployed URL side-by-side).

### FR17 — Reconcile architecture.md / /sgs-clone SKILL.md / state.md with disk reality

Remove or revise every claim about infrastructure that does not exist on disk. Specifically: `plugins/sgs-blocks/scripts/fingerprint-builder/` directory and its 5 JSON files (created by this spec — claim becomes truthful after P3 lands), plus the 4 missing recogniser scripts (decide per FR18). Reframe as "shipped per spec 14" or remove from documented pre-flight checks.

- **Model:** Haiku
- **Tests:** Unit (grep `architecture.md` for "shipped 2026-05-08" — finds zero matches after fix); Integration (/sgs-clone pre-flight passes against revised architecture); End-to-end (fresh session reading docs gets truthful picture); Observational (Bean opens architecture.md and confirms accuracy).

### FR18 — Decision per missing recogniser script

Decide and document. `heuristic-fallback-builder.py`, `computed-style-passport.py`, `recursion-guard.py`, `critical-fix-verification.py`. Per-script options: build, retire, or merge into existing scripts. **Decided in P1 KJC2 (2026-05-11) after evidence audit; revised same day after Bean caught a fabrication on recursion-guard:**

- `heuristic-fallback-builder.py` → RETIRE (function absorbed by Layer 2 role-templates per-attribute strategies)
- `computed-style-passport.py` → RETIRE (replaced by Playwright runtime probe in FR3 PHP-analysis fallback)
- `recursion-guard.py` → BUILD as standalone ~50-LOC module in P2 (default max_depth=12 + visited_nodes set; imported by `sgs-clone-orchestrator.py` and DOM-walking scripts; raises typed exception on overflow). Earlier "retire / handled inline" claim was a fabrication — `grep` confirmed no max_depth check existed anywhere. Building as a separate file matches the original `/sgs-clone` skill design and keeps determinism legible.
- `critical-fix-verification.py` → BUILD in P10 as a lightweight ~45-min acceptance harness with 5 canonical-mutation-boundary checks (no root theme.json mutation; no canonical-block files mutated outside FR21 commit; no licensing strings in uimax writes; idempotency re-run produces no new gap rows; staging dir empty post-success). Scope chosen because the other 10 spec-14 hard constraints are already enforced by uimax-write-validator / argparse / editor convention / FR20 / FR32 — duplicating those adds maintenance cost without new value.

- **Model:** Opus 4.7
- **Tests:** Unit (documented decision for each script; retired scripts removed from skill body); Integration (pipeline runs without referencing retired scripts); End-to-end (critical-fix-verification gates spec 14 acceptance run with PASS/FAIL); Observational (Bean reviews decision rationale before commit).

### FR19 — Media Library sideloading

Captures local image references (`<img src="./assets/hero.jpg">`) at Stage 4 EXTRACT. At +DEPLOY, uploads each to WP Media Library via `media_sideload_image()`. Rewrites attribute URLs to Media-Library attachment IDs (`{url, id, alt}` shape) so the deployed clone references uploaded assets, not broken local paths.

Idempotency: media-map manifest at `pipeline-state/<run-id>/media-map.json` records `local_path → attachment_id` mapping; re-runs skip already-uploaded assets via hash match.

- **Model:** Sonnet
- **Tests:** Unit (sideload helper uploads test image; returns attachment ID); Integration (extracted local URLs rewritten to attachment IDs in staged block markup); End-to-end (Mama's clone deploys with images loading correctly); Observational (Bean inspects Media Library + confirms uploads).

### FR20 — Single build mutex

Across FR12 + FR14, all `npm run build` invocations serialise via lock file at `pipeline-state/<run-id>/build.lock`. Acquire-or-wait pattern. No parallel builds against `plugins/sgs-blocks/`.

- **Model:** Sonnet
- **Tests:** Unit (lock file acquire/release works correctly); Integration (parallel FR12 + FR14 invocations serialise without race); End-to-end (clean build completes during autonomous run); Observational (Bean inspects build output for race symptoms).

### FR21 — Visual-qa-gated staged-merge

The replacement for the original auto-apply pattern. Sequence:

1. All FR11 / FR12 / FR13 / FR14 staged mutations live in `pipeline-state/<run-id>/staging/` with mirror directory layout matching canonical paths (`staging/plugins/sgs-blocks/...`, `staging/theme/sgs-theme/styles/<client>.json`, etc.)
2. FR8 gap-candidate rows written as `status='pending'` during staging
3. FR32 pre-commit gate chain runs against staging — any failure aborts before deploy
4. Staged version deployed to sandybrown (existing tar/scp infrastructure points at staging dir, not canonical)
5. FR16 visual-qa runs against the staged deployment; captures approved screenshots at 375/768/1440
6. **ON PASS — atomic merge sequence (filesystem move-then-replace, NOT `git apply`):**
   a. Move staging file tree → canonical paths in a single rsync `--delete` pass with `--backup-dir` for rollback
   b. Run `npm run build` against canonical under FR20 mutex
   c. **Post-merge build verification (round-2 Adversarial fix):** redeploy the canonical-built artefact to sandybrown → run fast screenshot-diff against the FR16-approved screenshots at the same 3 viewports → fail-loud if pixel parity below threshold (canonical build diverged from staged build the visual-qa actually approved)
   d. Single `git add . && git commit -m "feat(clone): <run-id>"` to lock in atomically
   e. FR8 rows flip from `pending` → `applied` (sets `applied_at` timestamp)
   f. FR33 invokes `/sgs-update`
7. **ON FAIL** (visual-qa OR post-merge build-verification OR pre-commit gate):
   - Staging dir preserved at `pipeline-state/<run-id>/staging/` for operator post-mortem
   - Canonical untouched (no rsync happened) OR rolled back via `--backup-dir` restore (if failure was in step 6c)
   - FR8 rows flip from `pending` → `discarded`
   - Failure report bundled with deliverable showing which gate failed + which staged mutations were attempted

**Why filesystem move-then-replace, not `git apply`** (resolves Q-open-5):
- `git apply` rejects hunks on HEAD drift if any file in the change-set was modified between staging and merge
- `git apply` does not patch binary files (FR19 sideloaded images would silently fail)
- Partial-apply leaves canonical in malformed state (some files updated, others not)
- rsync `--backup-dir` provides atomic-at-filesystem-level rollback that handles all file types uniformly
- The single `git commit` at the end provides the same audit trail as `git apply` without the partial-apply failure mode

**Mid-merge interruption resilience:** if interrupted between rsync and commit, working tree shows uncommitted canonical state. Recovery: rsync the `--backup-dir` back over canonical to restore pre-merge state. Document this recovery step in operator deliverable.

Failure modes:
- Pre-commit gate fails → no deploy, no merge, FR8 rows discarded, report shows which gate
- Visual-qa fails → no merge, deployed staging URL remains live but flagged as failed for operator inspection, FR8 rows discarded
- Post-merge build verification fails → rsync `--backup-dir` rolls back canonical, deployed staging URL remains live, FR8 rows discarded, report flags that visual-qa approved a build that diverged from the canonical rebuild (signals dependency/build-config drift)

- **Model:** Opus 4.7
- **Tests:** Unit (staging dir structure mirrors canonical layout; merge function is atomic); Integration (a failing pre-commit gate aborts before deploy; a failing visual-qa skips merge); End-to-end (Mama's run produces PASS or FAIL state with correct canonical-mutation behaviour); Observational (Bean confirms canonical state matches expectation after both PASS and FAIL runs).

### FR22 — Token-aware extraction (11 token surfaces)

When extracted CSS values match theme.json tokens, the captured attribute value is the token reference (e.g. `var(--wp--preset--color--primary)`), NOT the raw value. Covers all 11 surfaces:

| Token type | Path | Source |
|---|---|---|
| Palette colours | `var(--wp--preset--color--<slug>)` | `settings.color.palette` (16 entries) |
| Font sizes | `var(--wp--preset--font-size--<slug>)` | `settings.typography.fontSizes` (7) |
| Font families | `var(--wp--preset--font-family--<slug>)` | `settings.typography.fontFamilies` (4) |
| Spacing | `var(--wp--preset--spacing--<slug>)` | `settings.spacing.spacingSizes` |
| Shadows | `var(--wp--preset--shadow--<slug>)` | `settings.shadow.presets` |
| Gradients | `var(--wp--preset--gradient--<slug>)` | `settings.color.gradients` |
| Border radius | `var(--wp--custom--border-radius--<slug>)` | `settings.custom.borderRadius` |
| Duration | `var(--wp--custom--duration--<slug>)` | `settings.custom.duration` |
| Easing | `var(--wp--custom--easing--<slug>)` | `settings.custom.easing` |
| Transition | `var(--wp--custom--transition--<slug>)` | `settings.custom.transition` |
| Button presets | `var(--wp--custom--button-presets--*)` | `settings.custom.buttonPresets` |

**Source-of-truth: `/wp-theme-check presets theme.json`** returns the exact list of CSS custom properties WP generates at runtime. FR22 reads this, not raw theme.json. **Per-variation aware:** when an active style variation is set (via FR15 pre-flight), the token list is the merged root theme.json + active variation overrides (variation wins on conflict).

**Resolution order (READ path):** WP core default → root theme.json default → root theme.json `styles.blocks.<slug>` → active style variation file (`theme/sgs-theme/styles/<client-slug>.json`) → user attribute (post content). FR22 reads up this chain to find the right token reference.

**Write path (CRITICAL — closes Gemini Pro round-2 framework-poisoning concern):** FR22 NEVER mutates root `theme/sgs-theme/theme.json`. All per-client overrides — `styles.blocks.<slug>` entries, new token additions, palette extensions, custom CSS variables — are written exclusively to the active style variation file at `theme/sgs-theme/styles/<client-slug>.json`. If no active variation file exists for the target client, FR15 pre-flight creates one (empty overlay) before pipeline stages run.

This means:
- 50 sequential clones produce 50 style variation files at `theme/sgs-theme/styles/<client-1>.json` ... `<client-50>.json`, NOT one bloated root theme.json
- Root theme.json remains the framework baseline across all clones
- Switching active style variation in the Site Editor cleanly switches between client identities without root mutation
- Post-content attributes (per-instance overrides on a specific block insertion) still write to the block instance, not the variation file

- **Model:** Sonnet
- **Tests:** Unit (each of 11 token surfaces has a resolver; resolver returns canonical var() reference); Integration (extracted hex `#1F7A7A` resolves to `var(--wp--preset--color--primary)` via /wp-theme-check presets); End-to-end (Mama's clone styles change correctly when switching style variation); Observational (Bean switches style variation and confirms clone re-paints).

### FR23 — Native WP `supports` first, custom attribute fallback

Before adding a custom block.json attribute, check if native WP `supports.color.background / spacing / typography` covers the capability. If yes: write to WP's native `attrs.style.color.background` path. If no: fall through to a custom attribute.

**`appearanceTools=true` simplification.** Theme.json declares `appearanceTools: true`, which unlocks border/dimensions/typography controls without per-block `supports.*` declarations. FR23 leverages this — most layout/typography/border capabilities are already available via the native path; only specialised SGS attributes need custom declarations.

**Root-theme.json protection (mirrors FR22 write-path rule).** When FR23 enables `supports.sgs.*` on a block, the toggle is written to the block's own `block.json` (a framework-level capability addition — affects every client). When FR23 writes block-style overrides (per-client `styles.blocks.<slug>` entries), those go to the active style variation file at `theme/sgs-theme/styles/<client-slug>.json`, never to root theme.json. Distinction: framework capability toggles touch the block; per-client style values touch the variation overlay.

- **Model:** Sonnet
- **Tests:** Unit (supports-first classifier correctly identifies a native capability); Integration (a layout attribute is staged to native path, not custom block.json); End-to-end (Mama's run produces fewer custom attribute additions vs naive approach); Observational (Bean confirms Site Editor's global style controls work on the affected block).

### FR24 — Button role via SGS-BEM modifier (no NLP)

Block `sgs/button` (and any CTA-bearing block) declares an attribute:

```json
"role": { "type": "string", "enum": ["primary","secondary","tertiary","ghost"], "default": "primary" }
```

SGS-BEM modifier reads the role: `.sgs-button__cta--primary`. Extractor reads modifier → maps to enum. Render.php applies framework default styling via `is-style-{role}` class — pulls from `settings.custom.buttonPresets` in theme.json. **No per-instance colour/padding/radius extraction for buttons.**

For external scrapes (FR6): tier-1 class-name match (e.g. Bootstrap `.btn-primary` → SGS modifier `primary`). Tier-3 falls to operator review.

- **Model:** Sonnet
- **Tests:** Unit (`role` attribute added to sgs/button block.json with correct enum); Integration (extractor reads `.sgs-button__cta--primary` modifier → sets role to "primary"); End-to-end (Mama's CTAs render with correct framework default styling per role); Observational (Bean inspects rendered buttons; styling matches framework defaults).

### FR25 — Dynamic-link via SGS-BEM modifier (no NLP)

Block declares a `linkTarget` attribute with curated enum:

```json
"linkTarget": {
  "type": "string",
  "enum": ["custom","latest-blog","latest-post","newest-product","featured-product","popular-this-week","most-viewed-post","homepage","shop","contact"],
  "default": "custom"
}
```

SGS-BEM modifier reads the target. Render.php resolves the query at render time using existing WP_Query primitives. When `linkTarget=custom`, falls back to static URL extracted from `<a href>`.

For external scrapes: lingua-franca-conversion uses tier-1 pattern match per source convention; tier-3 falls to operator review.

Enum is extensible via standard gap-candidate flow when a new modifier appears in a draft.

- **Model:** Sonnet
- **Tests:** Unit (`linkTarget` attribute on link-bearing blocks with correct enum); Integration (extractor reads `.sgs-button__cta--latest-blog` modifier → sets linkTarget to "latest-blog"; render.php resolves to latest post URL); End-to-end (Mama's dynamic-link button renders pointing to latest post); Observational (Bean publishes a new post + confirms button URL updates).

### FR26 — Semantic feature taxonomy integration

Extend Layer 3 slot lists to declare per-slot `required_features` + `optional_features` from the v1 fingerprints data (e.g. `primary-cta`, `secondary-cta`, `headline`, `sub-headline`, `product-grid`, `nav-items`). Stage 2 MATCH uses these as recognition anchors alongside CSS class matching — faster + more precise.

**Backfill source:** v1 fingerprints.json at `tools/recogniser/data/fingerprints.json` covers 39 of 78 blocks; 39 zero-coverage blocks need backfilling during FR3. Source-of-truth merge with v1.

- **Model:** Sonnet
- **Tests:** Unit (Layer 3 entries carry feature tags); Integration (Stage 2 MATCH uses feature anchors; recognition precision improves vs class-only); End-to-end (Mama's mockup recognition uses features for at least 3 sections); Observational (Bean reviews recognition log to confirm feature tags fire).

### FR27 — `/wp-blocks` CLI integration

Wire each subcommand into its target pipeline stage:

| Subcommand | Pipeline stage |
|---|---|
| `/wp-blocks match "description"` | Stage 2 MATCH — alongside convention voter |
| `/wp-blocks tokens [variation]` | FR22 token source |
| `/wp-blocks impact <slug>` | FR12 / FR14 pre-flight |
| `/wp-blocks validate "<markup>"` | FR11 / FR14 staged output validation |
| `/wp-blocks gaps <industry>` | FR9 leftover-bucket-router context |
| `/wp-blocks weaknesses` | FR9 leftover-bucket-router context |
| `/wp-blocks variations <query>` | FR28 block-variation matching |
| `/wp-blocks health` | FR15 pre-flight check |

- **Model:** Sonnet
- **Tests:** Unit (subprocess invocations succeed; output parsed correctly); Integration (each integration point makes its expected call); End-to-end (Mama's run invokes each subcommand at least once); Observational (Bean inspects `/wp-blocks health` output in pre-flight log).

### FR28 — Block-variation matching

Extend Stage 2 MATCH to check existing block `variations` array (from block.json) before declaring a match. If a variation fits the mockup section, emit `{name: 'sgs/hero', variation: 'split-image'}` instead of staging bespoke attribute additions or new block scaffolding.

- **Model:** Sonnet
- **Tests:** Unit (variation matcher returns correct variation for known fixture); Integration (Stage 2 MATCH emits variation when applicable); End-to-end (Mama's hero matches an existing variation if one exists); Observational (Bean confirms inserter shows the matched variation).

### FR29 — Template-parts + custom-templates handling for full-page clones

**Template-parts** (`theme/sgs-theme/parts/*.html`) are framework infrastructure — never auto-scaffolded by this pipeline. Currently 11 part files (header.html, footer.html, footer-minimal.html, 7× mega-menu-*.html, sidebar.html). Spec assumes they remain stable.

**Per-client header/footer/mega-menu CONTENT** is delivered via pattern files at `theme/sgs-theme/patterns/`. FR11 stages new patterns; per-client naming convention: `header-<client-slug>.php`, `footer-<client-slug>.php`, `mega-menu-<area>-<client-slug>.php`.

**Custom templates** (currently 1: `front-page` in customTemplates) — only scaffolded when the clone introduces a page type that no existing template covers. Rare.

- **Model:** Sonnet
- **Tests:** Unit (FR11 never targets parts/*.html; only patterns/*.php); Integration (per-client header pattern scaffolded with correct slug); End-to-end (Mama's clone produces patterns/header-mamas-munches.php if needed); Observational (Bean confirms parts/ directory untouched after a run).

### FR30 — Native routing for lightbox / duotone / appearanceTools features

Three first-class theme.json features get native-routed:

- `settings.lightbox.enabled=true` is set; when an image in the mockup uses a lightbox-like wrapper, FR22 routes the lightbox flag to the native `core/image` `lightbox` attribute, not a custom JS layer.
- `settings.color.duotone` presets are token surfaces; FR22 includes duotone in the token-resolution chain.
- `settings.appearanceTools=true` is set; FR23 leverages this to skip per-block `supports.*` declarations for native controls.

- **Model:** Sonnet
- **Tests:** Unit (each native feature has a resolver); Integration (lightbox image in Mama's mockup routes to native lightbox); End-to-end (Mama's clone uses native WP lightbox UI); Observational (Bean clicks a lightbox image on the clone + confirms native WP behaviour).

### FR31 — Pre-flight `/wp-blocks health` check

Before any pipeline stage runs, `/wp-blocks health` confirms the underlying DB is functional + indices are current. Failure halts with a clear "run /sgs-update first" message.

- **Model:** Haiku
- **Tests:** Unit (health subcommand returns exit 0 on healthy DB); Integration (pipeline halts cleanly when health fails); End-to-end (autonomous run begins with health PASS message); Observational (Bean sees health PASS in pre-flight log).

### FR32 — Pre-commit gate chain

Before any staged mutation merges to canonical (FR21 PASS branch), the gate chain runs in order:

1. `/lint <changed-files>` — ESLint + Prettier + Stylelint + phpcbf + ruff
2. `/diagnostics <changed-files>` — TypeScript / PHP / ESLint LSP errors
3. `/wp-perf-gate` (auto-fires on commit) — blocks anti-patterns
4. `/wp-theme-check validate theme/sgs-theme/theme.json` — only if theme.json touched
5. `/wp-hook-graph validate plugins/sgs-blocks/` — only if render.php scaffolded

Any non-zero exit aborts the canonical merge. Staging dir preserved for inspection. Operator deliverable bundles the failing gate's output.

- **Model:** Sonnet
- **Tests:** Unit (each gate invocation works in isolation); Integration (chain runs in sequence; any failure aborts); End-to-end (a staged mutation with deliberately-broken JSON fails at the lint step + does not deploy); Observational (Bean sees failing-gate output in deliverable when a run aborts at FR32).

### FR33 — Auto-invoke `/sgs-update` after FR21 PASS

After staged-to-canonical merge succeeds, run `/sgs-update` (4 stages: DB scan + block reference regen + uimax sync + animation gap scan). New blocks / patterns / attributes land in sgs-db and uimax `component_libraries`. Next clone benefits.

- **Model:** Haiku
- **Tests:** Unit (`/sgs-update` invocation works post-merge); Integration (DB row count for blocks/patterns increments after a run that scaffolds new ones); End-to-end (run 2 against the same draft is idempotent because run 1's blocks are registered); Observational (Bean queries sgs-db after a run + sees new rows).

### FR34 — `/wp-theme-check presets` as FR22 token source

FR22 reads token list from `/wp-theme-check presets theme.json` (returns exact CSS custom properties WP generates at runtime), NOT manual theme.json parsing. Authoritative source.

Also gates theme.json mutations: if FR22/FR23 stage a write to theme.json, `/wp-theme-check validate` runs as part of FR32 chain.

- **Model:** Haiku
- **Tests:** Unit (subprocess invocation returns parseable preset list); Integration (FR22 uses `/wp-theme-check presets` output instead of raw theme.json); End-to-end (Mama's token resolution uses the authoritative list); Observational (Bean runs `/wp-theme-check presets theme.json` independently + confirms FR22 output matches).

## 8. Acceptance criteria (spec-level)

The spec is complete when:

1. `/sgs-clone sites/mamas-munches/mockups/homepage/` runs to completion without operator interaction
2. All 9 sections produce non-empty extracted attributes (≥ 30 attrs per section baseline)
3. ≥ 1 pattern auto-scaffolded to staging
4. ≥ 1 attribute candidate written to `attribute_gap_candidates`
5. ≥ 1 functionality extension bulk-staged (if Mama's surfaces a gap)
6. Pre-commit gate chain (FR32) runs against staging — all 5 gates pass or the run aborts cleanly
7. Staged version deployed to sandybrown
8. /visual-qa report bundled
9. If visual-qa PASSES: staging merges to canonical; `/sgs-update` runs; canonical state reflects the changes
10. If visual-qa FAILS: canonical untouched; failure report bundled
11. Bean opens the deployed URL at 375 / 768 / 1440 and confirms PASS (lesson 221 — no agent fallback)
12. Coverage report shows zero silent loss in Bucket A/B/C accounting
13. Idempotency: run 2 on the same draft after a successful run 1 produces zero filesystem changes
14. architecture.md / /sgs-clone SKILL.md / state.md reconciled with disk reality

## 9. Phasing (revised estimates)

| Phase | FRs | Estimate | Notes |
|---|---|---|---|
| P1 — Doc reconciliation + static-block list | FR17, FR18, FR12 (static-block list pre-compute) | ~45 min | Truthful base + enumerable upfront list |
| P2 — Schema + recursion-guard | FR7, FR8, FR18-recursion-guard | ~1 hr | Tables + 50-LOC standalone recursion guard module before any DOM-walking script runs |
| P3 — Catalogue files (4 layers) | FR1, FR2, FR4, FR3, FR26 | ~5-6 hr | Layer 4 → 2 → 1 → 3 + feature taxonomy backfill |
| P4 — Extract refactor + golden file | FR5 (with golden file) | ~3-4 hr | Reads catalogue from P3; bigger than original estimate |
| P5 — Gap detection | FR9, FR10 | ~2 hr | Reads catalogue + writes gap tables (with confidence scoring) |
| P6 — Staged scaffolding | FR11, FR12, FR13, FR14, FR19, FR20 | ~6-8 hr | All staged; canonical untouched. Includes media sideloading + build mutex |
| P7 — Convention conversion | FR6 | ~2 hr | Tier-1/2/3 fallback |
| P8 — WP integration wiring | FR22, FR23, FR24, FR25, FR27, FR28, FR30, FR34 | ~4-5 hr | Mostly wiring to existing CLIs |
| P9 — Visual-qa gate + autonomy | FR15, FR16, FR21, FR31, FR32, FR33 | ~3-4 hr | Wraps everything in single command |
| P10 — Acceptance harness | FR18's critical-fix-verification (lightweight, 5 canonical-mutation-boundary checks per P1 KJC2) | ~45 min | Gates spec 14 acceptance |

**Total: ~30-35 hr.** Honest range per QC fleet feedback. Parallelisable across multi-day work; P3 and P7 can run in separate sessions.

## 10. Dependencies

- Spec 12 (DRAFT-TO-SGS-PIPELINE) stages 1-9 remain authoritative
- Spec 13 (DRAFT-NAMING-CONVENTION) for SGS-BEM canonical form + Stage 0 pre-flight gate
- Existing `uimax-write-validator.py` + `uimax_write.py` for uimax writes
- Existing `/uimax-classify-naming` + `/uimax-sgs-scrape-pattern` + `/uimax-scrape-animation` for Stage 9 +REGISTER
- Existing `/visual-qa` skill for FR16
- Existing `/wp-blocks` CLI for FR22 / FR27
- Existing `/wp-theme-check` CLI for FR22 / FR34 / FR32 gate
- Existing `/wp-hook-graph` + `/wp-hooks` CLIs for FR32 gate
- Existing `/lint` + `/diagnostics` + `/wp-perf-gate` for FR32 gate
- Existing `/sgs-db` CLI for FR12 / FR14 impact analysis + FR15 pre-flight
- Existing `/sgs-update` 4-stage script for FR33 post-success
- Existing `scripts/mockup-parity-validator.js` + `scripts/screenshot-diff-helper.js` for visual-qa
- Existing `tools/multi-frame-qa/capture.js` for multi-frame capture

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Staged-then-merge atomic failure leaves repo in inconsistent state | FR21 uses `git apply` (atomic by definition); on partial failure, `git reset --hard HEAD` restores; staging dir preserved for post-mortem |
| Auto-attribute-application breaks existing post content via block.json schema drift | Static blocks (13%) get auto-generated deprecated.js; FR12 pre-flight verifies attribute doesn't exist before adding; FR32's lint gate catches malformed JSON |
| Atomic-block auto-scaffold produces wrong output | /visual-qa is the gate; FAIL discards staging; framework never sees the bad scaffold |
| Layer 2 role taxonomy too narrow → Bucket C overflow | Confidence-scoring suppresses low-confidence promotions; role taxonomy itself becomes a gap-candidate target (meta) |
| Lingua-franca-conversion mistranslates external scrape | Tier-1/2/3 fallback; tier-3 routes to operator review rather than silent failure |
| Reconciled docs in FR17 introduce new false claims | Pre-commit grep for "shipped 2026-XX-XX" + manual review before commit |
| Bean runs autonomous flow with significant local-only changes | FR15 pre-flight `git status` check; halt if uncommitted changes touch likely-mutated blocks |
| Parallel `npm run build` race | FR20 single build mutex via lock file |
| Confidence-threshold (0.7) too aggressive or too conservative | Threshold is configurable per role; reviewed after each clone's manifest; iteratively tuned |
| Run-2 idempotency edge cases | FR12 / FR14 read-before-write checks; FR8 tables tracked per-run via `provenance` field |
| Media sideload upload failure mid-run | FR19 media-map manifest enables retry; pipeline marks affected attributes as "media-pending" rather than failing whole run |

## 12. Open questions

Resolved during the v2 revision:

- Q1 dispatch keying: regex + Layer 2 role lookup. ✓
- Q2 override granularity: per-attribute. ✓
- Q3 synonym table: role-templates.json + extract.py helper. ✓
- Q4 enum snap: DOM class-name probe + computed-layout fallback. ✓
- Frequency threshold: removed (first-sighting via role taxonomy + confidence score). ✓
- Functionality application scope: bulk apply to all eligible blocks via /sgs-db impact. ✓
- Atomic-block scaffold operator-review: removed; visual-qa is the gate. ✓
- Visual-qa gating pattern: staged-then-merge replaces auto-apply. ✓
- Template-parts vs patterns: parts stable; patterns scaffolded per client. ✓
- Token surfaces: all 11 covered; /wp-theme-check presets as source. ✓
- Button role + dynamic link: SGS-BEM modifier (no NLP needed). ✓

Resolved in v2.1 (round-2 QC fixes):

- Q-open-1 / Q-open-5: **filesystem move-then-replace via rsync `--delete --backup-dir`**, NOT `git apply`. See FR21. Avoids hunk-rejection failure modes, handles binary files (FR19 images), provides atomic rollback. Single `git commit` at end provides audit trail.

Still open (deferred to build-phase polish, not blocking):

- Q-open-2: When FR13 bulk-applies an extension to ≥ 10 blocks, should the operator deliverable include a "big change" callout (visibility, not a gate)?
- Q-open-3: Should the Layer 2 role taxonomy be treated as fixed (13 roles) or living (open extension)? Recommendation: living, with promotion-via-gap-candidate workflow
- Q-open-4: For FR19 media sideloading, should images be resized/optimised at upload time or shipped at source size? Recommendation: source size for v2.1; optimisation defer to a future spec

## 13. References

- Visual reference (this spec at a glance): `.claude/cloning-pipeline-flow.md`
- Spec 12 — `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` (canonical 9-stage pipeline)
- Spec 13 — `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` (SGS-BEM convention + Stage 0 gate)
- Fingerprint design synthesis — `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md` (origin of 4-layer catalogue design)
- v1 fingerprints data — `tools/recogniser/data/fingerprints.json` (54 attr_extractors across 78 blocks; semantic feature markers)
- v1 ATTR_TO_CSS dict — `plugins/sgs-blocks/scripts/pattern-fingerprint.py` (partial Layer 2)
- Theme.json — `theme/sgs-theme/theme.json` (16 colours + 7 font sizes + 4 font families + spacing/shadow/gradient/custom)
- 2026-05-11 handoff — `.claude/handoff.md`
- 2026-05-11 next-session-prompt — `.claude/next-session-prompt.md`
- blub.db rows: 209 (patterns-not-blocks), 211 (no licensing), 213 (Rosetta Stone), 236 (SGS-BEM canonical); lessons 194, 207 (verify rendered output), 221 (no agent fallback)
