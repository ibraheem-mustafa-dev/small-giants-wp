---
doc_type: phase-plan
phase_id: 7
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
parent_plan: .claude/plans/master-spec14-build-plan.md
title: Phase 7 — Lingua-franca conversion for external scrapes
session_date: 2026-05-11
plan_label: PLAN sonnet
estimated_minutes: 120
---

# Phase 7 — Lingua-franca conversion

**USP:** The pipeline accepts non-SGS-BEM inputs (Bootstrap, Tailwind, etc.) by converting them to canonical SGS-BEM at Stage 1. Closes the lingua-franca loop the Rosetta Stone promised.

**Success criteria:**

- [ ] Each of 15 non-canonical naming conventions in uimax has a `conversion_rule` field populated
- [ ] `convert_to_sgs_bem(source_html, source_css, source_convention)` helper exists at `plugins/sgs-blocks/scripts/recogniser/lingua_franca.py`
- [ ] Tier-1/2/3 fallback: class-name pattern match → DOM-structure heuristic → operator review queue
- [ ] Original convention preserved as sibling rows in uimax `equivalent_implementations`
- [ ] Lossy-conversion guard: ambiguous mapping flags as structural-mismatch-or-orphan
- [ ] Smoke test: feed a synthetic Bootstrap mockup; pipeline converts and runs Stage 2 MATCH successfully
- [ ] Commit: `feat(p7): lingua-franca conversion at Stage 1`

**Entry context:** Spec 14 FR6. uimax `naming_conventions` table (16 rows). `/uimax-classify-naming` skill (existing). Layer 2 role-templates.json (from P3).

**Tooling Index:** Python + Edit + uimax SQLite + `/uimax-classify-naming` subprocess + git.

---

## Step 1 — [SESSION-START] Pre-flight + read conversion patterns

```
Step 1 — Pre-flight + read conventions
  Model:       inline
  Action:      Master pre-flight. Read all 16 rows from uimax `naming_conventions`. For each non-canonical (15 of 16), check if `extraction_rule` is populated. Note which conventions need conversion-rule authoring.
  Outcome:     Inventory of conversion authoring scope
  Marker:      SESSION-START
  Time:        10 min
  Cold-Entry:  master plan + spec 14 FR6
```

## Step 2 — Author conversion rules per convention

```
Step 2 — Conversion rules
  Model:       sonnet
  Action:      For each of 15 non-canonical conventions in uimax, write a `conversion_rule` field as a structured object: { tier_1_class_patterns: [{ regex, sgs_bem_target }], tier_2_dom_heuristics: [{ shape, sgs_block, sgs_modifier }], tier_3_fallback: 'operator-review' }. Examples:
    - Bootstrap 5: `.btn-primary` → `.sgs-button__cta--primary`; `.card` → `.sgs-card__wrapper`; `.row > .col-*` → `.sgs-grid__row > .sgs-grid__col`
    - Tailwind utility: utility composition `flex items-center justify-between` → SGS pattern `.sgs-flex--row-between-center` (heuristic match on common combos)
    - Astra: `.ast-container` → `.sgs-container__wrapper`; `.ast-row` → `.sgs-grid__row`
    - Kadence: `.wp-block-kadence-rowlayout` → `.sgs-grid__row`
    - shadcn/Radix: `<Button variant="primary">` → `.sgs-button__cta--primary` (heuristic via React-component name + variant prop)
  Update each row's `conversion_rule` field. Validate via `uimax-write-validator.py`.
  Files:       uimax DB updates (in-place SQL)
  Outcome:     15/15 conventions have populated conversion_rule field
  Time:        45 min
  Tooling:     Python sqlite3 + uimax_write helper
  On-Fail:     A convention's conversion rules are too sparse to cover the common cases → log + ship with minimum rules; expand later via gap-candidate flow
  Test:
    Happy:       Bootstrap conversion rule resolves `.btn-primary` → `.sgs-button__cta--primary` correctly
    Edge:        Hybrid convention (mockup uses both BEM + Tailwind) → handled per-section by /uimax-classify-naming voter
    Fail:        SQL constraint violation → fix payload + retry
    Integration: lingua_franca.py reads these
```

## Step 3 — Build `lingua_franca.py` converter

```
Step 3 — Converter module
  Model:       sonnet
  Action:      Implement `convert_to_sgs_bem(source_html, source_css, source_convention)` at `plugins/sgs-blocks/scripts/recogniser/lingua_franca.py`. Reads conversion_rule from uimax. Applies in order:
    - Tier 1: regex-based class-name substitution across the source HTML
    - Tier 2: for classes that don't match tier-1 patterns, run DOM-structure heuristic from uimax `tier_2_dom_heuristics`
    - Tier 3: for unmatched classes after tier-1+tier-2, emit them to leftover-bucket-router as `structural-mismatch-or-orphan`
  Output: rewritten HTML+CSS with SGS-BEM classes + a conversion log + a list of unconverted classes (tier-3 fallthroughs).
  Files:       plugins/sgs-blocks/scripts/recogniser/lingua_franca.py (new, ~250 LOC)
  Outcome:     Module loads; helper function callable; smoke test on a Bootstrap fixture converts correctly
  Time:        45 min
  Tooling:     Write tool + Python BeautifulSoup + uimax sqlite3 read
  On-Fail:     Conversion produces malformed HTML (BS4 parse error) → halt + diagnostic
  Test:
    Happy:       Synthetic Bootstrap card → converted SGS-BEM card markup; classes match expectations
    Edge:        Class with no conversion rule → emitted as tier-3 + logged; NOT silently dropped
    Fail:        Lossy conversion (rule maps two different sources to same SGS class without context) → flag as structural-mismatch-or-orphan
    Integration: Stage 1 BOUNDARY calls this when /uimax-classify-naming reports non-canonical
```

## Step 4 — Wire into Stage 1 BOUNDARY

```
Step 4 — Pipeline wiring
  Model:       sonnet
  Action:      Patch `sgs-clone-orchestrator.py` Stage 1: after `/uimax-classify-naming` runs, if convention != 'SGS WordPress', invoke `lingua_franca.convert_to_sgs_bem()` before the boundary voter runs. Persist the converted HTML+CSS to `pipeline-state/<run-id>/converted-source.html` + `converted-source.css` for downstream stages.
  Files:       sgs-clone-orchestrator.py (modified)
  Outcome:     Non-canonical mockups are converted upstream of boundary detection
  Time:        15 min
  Test:
    Happy:       Run pipeline on a Bootstrap mockup → converted-source.html exists + has SGS-BEM classes
    Integration: Stage 2 MATCH reads the converted source; no Stage 2 logic changes needed
```

## QA Gate — P7 acceptance

```
QA Gate — P7
  Model:       sonnet
  Check:       Smoke test on a synthetic 1-section Bootstrap mockup. Verify: (a) conversion happens; (b) Stage 2 MATCH proposes an SGS block name; (c) tier-3 fallthroughs surface in operator review
  Marker:      QA
```

## Step 5 — [HANDOFF] Commit P7

```
Step 5 — Commit
  Action:      Stage. Commit `feat(p7): lingua-franca conversion + 15 convention rules populated`. Push.
  Marker:      HANDOFF
  Time:        3 min
```
