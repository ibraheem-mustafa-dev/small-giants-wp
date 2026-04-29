# Gap Register — ui-ux-pro-max (32 gaps)

> **Status (2026-04-29):** 2026-04-15 overnight run closed most A and B gaps. See `~/.claude/lifecycle-reports/2026-04-15-night.md` for the run results. This register is now an audit trail with a STATUS column added — a few C-grade items are still open and become Phase 4 inputs.
>
> **Three new gaps surfaced during the run** (C-grade): `design.csv` schema broken (header=2 rows but data has 6+ cols), 4 stack/styles/typography CSVs have wrong column count, `stats` subcommand bleeds bad-row content into provenance output. Tracked at the bottom.

Sourced from main-thread analysis + Gemini 3.1 Pro review + Cerebras Qwen-3-235b review (2026-04-14).
Priority breakdown: **1 Strategic (S), 11 A, 16 B, 4 C.**

Tooling suggestions per row refer to which model/agent handled the fix in the overnight run.

## Status legend

- ✅ CLOSED — fixed by overnight run
- ⏳ OPEN — Phase 4 input
- ⏸ DEFERRED — out of scope (S3, S4)
- 🔁 SUPERSEDED — A1 resolved by architecture decision (bundled committed at 95% confidence)

## Strategic (architecture-level)

| ID | Gap | Source | Tooling |
|----|-----|--------|---------|
| A1 | Architecture anti-pattern: bundling flat-file DB + Python engine inside a skill. Right shape may be MCP server with SKILL.md teaching when to query | Gemini Pro | `/gemini-pro` research + main-thread decision |

## A priority — closes low-score criteria

| ID | Gap | Criterion | Tooling |
|----|-----|-----------|---------|
| C1 | No Integration Contract for sub-skill callers | completeness | Cerebras (draft) + main-thread (review) |
| CL2 | 11 hardcoded `python3 skills/ui-ux-pro-max/scripts/search.py` paths (not absolute) | clarity | Cerebras |
| R1 | Only 1 of 13 bash blocks has error handling | robustness | Cerebras |
| R2 | No CLI-not-found fallback documented | robustness | main-thread |
| E1 | No integration example showing sub-skill → CLI → apply | exemplar | main-thread + example |
| EC1 | No Ecosystem Integration section listing 25+ consumers | ecosystem | main-thread |
| G1 | No `requirements.txt` / dependency management | Gemini Pro add | Cerebras |
| G2 | No `--limit` / context-window protection for sub-skill callers | Gemini Pro add | main-thread (Python edit) |
| G3 | No data dictionary / CSV schemas | Gemini Pro add | Cerebras (bulk) |
| S1 | CSV injection vector via formula-prefixed cells | Cerebras security add | main-thread (security) |
| A2 | No relational mapping between CSVs (14 silos, not a system) | Gemini Pro arch add | main-thread (design) + update-db.py |

## B priority — meaningful improvements

| ID | Gap | Criterion | Tooling |
|----|-----|-----------|---------|
| C2 | `data/_sync_all.py` exists but undocumented | completeness | main-thread (judgement re upstream) |
| C3 | `ui-reasoning.csv` used by CLI but not in description | completeness | Cerebras |
| C4 | `--json` output format undocumented | completeness | Cerebras |
| CL1 | Process Stages (new) + How to Use (legacy) redundant | clarity | main-thread (reconcile) |
| R3 | No empty-result handling documented | robustness | Cerebras |
| R4 | No data-integrity validation script for CSV edits | robustness | main-thread (`update-db.py validate`) |
| E2 | No worked `--json` output example | exemplar | Cerebras |
| EC2 | `templates/platforms/` (15+ AI platform configs) unmentioned | ecosystem | Cerebras |
| I1 | `draft.csv` 1,778 rows — header says "not read by CLI" | deadweight | main-thread (PII audit first) |
| I2 | No provenance tracking on CSV entries | data | Cerebras backfill |
| G4 | Upstream source for `_sync_all.py` undocumented | completeness | main-thread (code read) |
| G5 | Zero tests for `scripts/core.py` | robustness | Cerebras (skeleton), main-thread (real tests) |
| D1 | Normalisation: hex codes `#FFFFFF` vs `ffffff` inconsistent? | data quality | Cerebras (audit + normalise) |
| D2 | Categorical mismatch: `landing.csv` "SaaS" vs `colors.csv` "Software"? | data quality | Cerebras (normalise taxonomy) |
| D3 | No staleness SLA for fast-decaying domains (`google-fonts`, `react-performance`) | data governance | main-thread (doc freshness policy) |
| D4 | `design.csv` schema/purpose unknown — may overlap with `ux-guidelines`, `ui-reasoning` | data audit | main-thread (inspect + document) |
| S2 | PII risk in `draft.csv` — user comments may contain personal data | security | main-thread (audit + anonymise) |

## C priority — polish / future

| ID | Gap | Criterion | Tooling |
|----|-----|-----------|---------|
| C5 | 4 domains missing from description (ui-reasoning, icons, products, react-performance) | completeness | Cerebras |
| I3 | No version / history on CSV entries | data governance | post-migration (SQLite or MCP handles) |
| I4 | CLI surface thin (3 query types vs SGS DB 15 subcommands) | API depth | Unit 19 expansion |
| I5 | No health / stats subcommand | observability | Unit 19 expansion |
| I6 | `design.csv` purpose undocumented (overlaps D4 but stands alone as clarity fix) | completeness | Cerebras (add doc block) |
| E3 | No failure-mode worked example | exemplar | Cerebras |
| S3 | Skill output accessibility — markdown/CLI output lacks ARIA / semantic guidance | accessibility | deferred (not this run) |
| S4 | No contribution guide / pre-commit hooks / linting | project hygiene | deferred (not this run) |

## False positives flagged by Gemini review

| ID | Original flag | Gemini's push-back | Verdict |
|----|---------------|--------------------|---------|
| CL3 | 437-line body over 250 budget | Reference skills legitimately need more space | Dropped |
| I1 note | draft.csv "dead weight" | Likely staging for `_sync_all.py` promotion — not waste | Still audit for PII, but don't assume waste |

## Unique Cerebras findings (not in main audit or Gemini)

| ID | Finding | Grade | Rationale |
|----|---------|-------|-----------|
| S1 | CSV injection via formulas | **A** | Real security vector — malicious CSV opened in Excel/Sheets executes |
| S2 | PII in `draft.csv` | B | Cerebras flagged draft may contain user comments |
| S3 | Accessibility of skill output | C | Markdown/CLI output could include ARIA hints for screen-reader-assisted workflows |
| S4 | No contribution guide | C | `pre-commit`, linting, `CONTRIBUTING.md` missing |

## Unique Gemini findings (not in main audit or Cerebras)

| ID | Finding | Grade | Rationale |
|----|---------|-------|-----------|
| A1 | MCP-server architectural re-shape | **S** | Flat-file DB inside skill folder is wrong architectural level |
| G1 | `requirements.txt` missing | A | Hidden dependency risk |
| G2 | Context-window protection via `--limit` | A | Sub-skills could accidentally dump 1,775 rows |
| G3 | Data dictionary / CSV schemas | A | Agents can't formulate valid `--json` queries without column knowledge |
| G4 | Upstream source for `_sync_all.py` | B | Hidden data lineage |
| G5 | Zero tests for `core.py` | B | Query engine has no coverage |
| A2 | Relational mapping between 14 CSVs | A | `colors.csv` palette has no key to matching `google-fonts.csv` pairing |
| D1 | Normalisation consistency | B | Hex / font-name formats may be inconsistent |
| D2 | Categorical consistency across files | B | Broken joins between files |
| D3 | Staleness SLA | B | Fast-decaying domains need refresh triggers |
| D4 | `design.csv` unknown purpose | B | 1,775 rows — could overlap destructively |
---

## Post-run status (2026-04-29 audit)

### Closed by 2026-04-15 overnight run (18 gaps)

| ID | Resolution |
|----|-----------|
| A1 | 🔁 Architecture committed: bundled CLI + SQLite at 95% confidence |
| C1 | ✅ Integration Contract section added to SKILL.md (U11) |
| CL2 | ✅ 11 hardcoded paths fixed (verified: 0 matches) |
| R1 | ✅ Error handling added to 10 bash blocks |
| R2 | ✅ CLI-not-found fallback documented |
| E1 | ✅ Integration example shipped (U11) |
| EC1 | ✅ Ecosystem Integration section added |
| G1 | ✅ requirements.txt added (U6) |
| G2 | ✅ --limit flag shipped (U14) |
| G3 | ✅ Data dictionary at references/data-dictionary.md (U11) |
| S1 | ✅ CSV injection fix landed (sanitise_cell in core.py) |
| S2 | ✅ draft.csv archived after PII audit |
| C2 | ✅ _sync_all.py documented (U5) |
| C3 | ✅ ui-reasoning.csv added to description |
| C4 | ✅ --json output documented (U13) |
| E2 | ✅ Worked --json example shipped |
| I1 | ✅ draft.csv archived |
| I2 | ✅ provenance column added to all 29 CSVs (U17) |
| C5 | ✅ Description domains expanded |

### Open — Phase 4 inputs (C-grade only)

| ID | Status | Phase 4 disposition |
|----|--------|---------------------|
| CL1 | ⏳ Process Stages vs How to Use redundancy | Phase 4 SKILL.md restructure |
| R3 | ⏳ Empty-result handling not documented | Phase 4 polish |
| R4 | ⏳ Data-integrity validation script | Phase 4 — covered by update-db.py validate stub from U17 |
| EC2 | ⏳ templates/platforms/ unmentioned | Phase 4 ecosystem coverage |
| G4 | ⏳ _sync_all.py upstream source | Resolved enough by U5 docs; close as not-needed |
| G5 | ⏳ Zero tests for core.py | Phase 4 hardening |
| D1-D4 | ⏳ Data quality (normalisation, categorical, staleness, design.csv purpose) | Phase 4 data audit |
| A2 | ⏳ Relational mapping across 14 CSVs | Phase 4 — partially solved by SQLite mirror compile |

### Deferred

| ID | Reason |
|----|--------|
| S3 | Skill output a11y — non-blocking, documented as deferred |
| S4 | Contribution guide / linting — project hygiene, deferred |
| I3 | Version/history on entries — post-migration concern |

### New gaps surfaced during the run (3, all C-grade)

| ID | Gap | Discovered |
|----|-----|-----------|
| N1 | `design.csv` schema broken (header=2 rows, data rows have 6+ columns) | 2026-04-15 stats subcommand revealed |
| N2 | 4 stack/styles/typography CSVs have wrong column count vs header | 2026-04-15 |
| N3 | `stats` subcommand verbose — bleeds bad-row content into provenance output | 2026-04-15 |

These three are addressed in the 2026-04-29 audit follow-up session.
