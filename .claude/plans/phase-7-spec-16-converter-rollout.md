---
doc_type: phase-plan
phase: 7
plan_version: 1
spec: 16
project: small-giants-wp
generated: 2026-05-14
status: ready-to-execute (next session)
estimated_wall_time: 2.5–3 hours
parallel_dispatch_eligible: yes — see Step-level dispatch tables
references:
  - .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md
  - .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md
  - .claude/cloning-pipeline-flow.md
  - .claude/tooling-map.md
  - .claude/skills-commands-map.md
---

# Phase 7 — Spec 16 Converter Rollout (Phases 2-6)

Implements Spec 16 §4 Phases 2-6 (Phase 1 prototype already shipped). Closes with end-to-end visual QA passing on Mama's Munches homepage at ≤1% pixel diff.

## Pre-flight checks (run inline at session start, ~3 min)

```bash
# 1. Phase 1 artefacts present
ls .claude/scratch/converter-prototype/{convert.py,convert_page.py,db_lookup.py}
# 2. sgs/label block exists + DB row present
ls plugins/sgs-blocks/src/blocks/label/
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT slug, status FROM blocks WHERE slug='sgs/label'"
# 3. Phase 1 smoke test still passes
python .claude/scratch/converter-prototype/convert_page.py \
  sites/mamas-munches/mockups/homepage/index.html \
  sites/mamas-munches/research/sandybrown-media-map.json \
  --summary-only
# Expected: 9 sections, 10 SGS block types, 12 containers, 27 variation CSS rules
```

If any check fails — halt and surface to Bean. The plan assumes the Phase 1 baseline.

---

## Step 1 — Phase 2: Atomic-block expansion (parallel dispatch, ~45 min wall)

### Step 1.1 — sgs/heading composite block (Sonnet implementer + Haiku QC)

**Goal:** Build the section-heading composite per Spec 16 FR9. Three slots (label + headline + sub) bundled as one block, mirroring how sgs/hero packages its label family.

**Files created:**
- `plugins/sgs-blocks/src/blocks/heading/block.json` — 30+ attrs (label + labelTag + labelEnabled + label-typography family, headline + headlineLevel + headlineId + heading-typography family, subheading + subheadingTag + subheadingEnabled + sub-typography family, icon + iconPosition + emoji + native supports.color + supports.spacing)
- `plugins/sgs-blocks/src/blocks/heading/edit.js`
- `plugins/sgs-blocks/src/blocks/heading/save.js`
- `plugins/sgs-blocks/src/blocks/heading/style.css` — defaults from the Mama's gift-section CSS (label uppercase 11–13px, h2 28px mobile / 36px desktop, sub 16px text-muted)
- `plugins/sgs-blocks/src/blocks/heading/editor.css`
- `plugins/sgs-blocks/src/blocks/heading/index.js`

**Subagent dispatch:**

| Agent | Model | Role | /delegate model rationale |
|---|---|---|---|
| **Implementer** | **Sonnet** | Author the 6 block files following SGS conventions | Load-bearing, needs careful schema design + style.css responsive correctness |
| **QC reviewer A** | **Haiku** | Mechanical check (valid JSON, RichText + useBlockProps wired, no hardcoded hex, supports.color present) | Fast mechanical correctness pass |
| **QC reviewer B** | **Gemini Flash** | Fresh-eyes on the editor UX shape — does the variant detection make sense? | Independent perspective |

**Dispatch tool:** `/subagent-driven-development` (implementer + 2 reviewers per task pattern from yesterday).

**Wall-time estimate:** ~25 min implementer + ~5 min parallel QC.

### Step 1.2 — sgs/divider atomic block (parallel with 1.1 — different files)

**Goal:** Section separator block. Variants: line / dots / wave / shape. Useful for transitions between sections that currently fall to bare `<hr>` or empty containers in drafts.

**Files created:** Same 6-file SGS pattern as 1.1. ~10 attrs (variant, colour, thickness, spacing top/bottom, alignment).

**Subagent dispatch:** Identical shape — Sonnet implementer + Haiku + Gemini Flash QC. Different files entirely so safe to run in parallel with Step 1.1.

**Wall-time estimate:** ~15 min implementer + ~5 min parallel QC.

### Step 1.3 — /sgs-update Stage 4 canonical pass (inline, sequential after 1.1 + 1.2)

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/update-db.py --repo .
```

Verifies both new blocks are in the DB at `status='built'` with canonical_slot rows populated for their typed attributes. Spot-check via:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, canonical_slot FROM block_attributes \
   WHERE block_slug IN ('sgs/heading','sgs/divider') ORDER BY block_slug, attr_name"
```

If canonical_slot is NULL for slots that clearly map to existing canonicals — extend `assign-canonical.py` heuristics OR insert rows manually.

**Wall-time:** ~5 min.

### Step 1.4 — Converter routing for the new blocks (inline)

Update `.claude/scratch/converter-prototype/convert.py`:
- Add `sgs/heading` to detection: any element matching block-root class `sgs-heading` OR `sgs-section-heading` triggers the FR1 block-root lift path
- Add `sgs/divider` to atomic detection: `<hr>` tag fallback routes here; class `sgs-divider` block-root match

Smoke-test against Mama's gift-section (already has the three-element pattern):

```bash
python .claude/scratch/converter-prototype/convert_page.py \
  sites/mamas-munches/mockups/homepage/index.html \
  sites/mamas-munches/research/sandybrown-media-map.json \
  --summary-only
# Expected: gift-section emits one sgs/heading block with label + h2 + sub lifted
```

**Wall-time:** ~10 min.

---

## Step 2 — Phase 3: Orchestrator wiring (Sonnet SDD, ~30 min wall)

**Goal:** Wire the converter into `sgs-clone-orchestrator.py` as the live Stage 4 path for SGS-BEM-canonical sections. Legacy `extract.py` remains as fallback for non-SGS-BEM input (until Step 5 retirement).

### Step 2.1 — Promote converter prototype to production path (Sonnet)

**Files moved:**
- `.claude/scratch/converter-prototype/db_lookup.py` → `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py`
- `.claude/scratch/converter-prototype/convert.py` → `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`
- `.claude/scratch/converter-prototype/convert_page.py` → `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert_page.py`
- New: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` exposing public API `convert_section(html, css, media_map)` and `convert_page(html, media_map)`

### Step 2.2 — CLI mode on convert.py (Sonnet)

```bash
python convert.py --mode pipeline \
  --section-html <path> --section-css <path> \
  --media-map <path> --out <json-path>
```

Output JSON shape matches what `stage_4_5_6_7_8_extract` expects per Stage 4 schema:

```json
{
  "per_section_results": [{
    "boundary_id": "b1",
    "section_id": "...",
    "selector": "section.sgs-X",
    "block_name": "sgs/X",
    "status": "complete",
    "extract_path": "...",
    "extracted_attributes": {...},
    "block_markup": "<!-- wp:sgs/X ... /-->",
    "variation_css": "...",
    "attribute_gap_candidates": [{...}]
  }]
}
```

### Step 2.3 — Orchestrator branch (Sonnet, careful)

In `sgs-clone-orchestrator.py:stage_4_5_6_7_8_extract`:

```python
# Phase 7 Step 2.3 — branch on --converter-v2 flag
if args.converter_v2 and is_sgs_bem_canonical(boundary):
    # New path: converter handles Stages 4 + 4.5 + 5 + 7 in one call
    from orchestrator.converter_v2 import convert_section
    result = convert_section(
        html=section_html, css=css_text, media_map=media_map_obj,
    )
    per_section_results.append(result)
    # Stage 8 visual QA still runs as usual
else:
    # Legacy path: extract.py subprocess + token_resolver + supports_writer
    proc = subprocess.run([...extract.py...])
    # ... existing flow
```

Add `--converter-v2` argparse flag. Skip Stages 4.5, 5, 7 when converter ran (it did them inline).

### Step 2.4 — Orchestrator QC (Haiku + Sonnet parallel)

| Agent | Model | Role |
|---|---|---|
| QC A | Haiku | Stage-4 JSON schema conformance: does converter output match what staged_merge expects? |
| QC B | Sonnet | Branch logic correctness + per_section_results downstream consumers (autonomy_chain, recognition_log, +REGISTER) — do they tolerate the converter's shape? |

**Wall-time:** ~25 min implementer + ~10 min parallel QC.

---

## Step 3 — Phase 4: Visual QA verification end-to-end (~60 min wall)

**Goal:** Close FR7 — the "is it visually correct" gate.

### Step 3.1 — Build Mama's via converter (inline)

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --converter-v2 \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --auto-section \
  --media-map sites/mamas-munches/research/sandybrown-media-map.json \
  --mode draft \
  --clone-url https://sandybrown-nightingale-600381.hostingersite.com/clone-test-spec-16-phase-7/
```

### Step 3.2 — Deploy + render baselines (inline)

- Deploy converter output to a new WP post on sandybrown staging
- Render the SAME source mockup as a separate WP post (the canonical baseline per FR7 / Phase 4 spec)
- Both posts use the active mamas-munches style variation so render context is identical

### Step 3.3 — /visual-qa panel (skill dispatch)

```
/visual-qa <converter-output-url>
  --compare-to <mockup-rendered-as-post-url>
  --viewports 375,768,1440
  --threshold 1.0
```

Pass gate: ≤ 1% pixel diff per viewport.

### Step 3.4 — Iteration loop (max 2)

If diff > 1%:
- Dispatch ONE **Sonnet diagnostician** subagent: read the diff thumbnails + converter output + variation CSS + attribute_gap_candidates; identify the load-bearing converter bug; propose a patch
- Apply the patch, re-run Step 3.1 → 3.3
- If SECOND iteration still > 1%: surface to Bean with diff thumbnails + diagnostician report

**Cap rationale:** unbounded iteration on Phase 4 is what made yesterday's debugging cycle drag. 2 iterations = "tried twice, surface to human" — Bean sees the actual state.

**Wall-time:** ~30 min first pass, +15 min per iteration up to cap.

---

## Step 4 — Phase 5: /sgs-update full canonical pass (~10 min wall, inline)

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/update-db.py --repo .
```

Confirms the converter's `attribute_gap_candidates` writes from Phase 4 are visible in the DB. Spot-check via:

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, attr_name, proposed_action FROM attribute_gap_candidates \
   WHERE created_at > date('now','-1 day')"
```

If candidates exist — surface to Bean as the catalogue-extension work queue (which Spec 16 §FR6 Destination 3 is explicitly designed to produce).

---

## Step 5 — Phase 6: Legacy extract.py retirement (~20 min wall)

### Step 5.1 — Grep audit (Cerebras — zero-cost mechanical scan)

**Why Cerebras here:** purely mechanical. Find every Python import of the soon-deleted files across the repo. /delegate routes this to Cerebras as the cheapest-LLM-with-correct-output choice for a pattern-search task.

```bash
grep -rn "from tools.recogniser_v2.extract\|import extract\|extract_strategies\|overrides.hero" \
  plugins/ tools/ .claude/ 2>/dev/null
```

If any external imports found → rewire to converter_v2 first.

### Step 5.2 — Deletes (inline)

```bash
rm tools/recogniser-v2/extract.py
rm tools/recogniser-v2/extract_strategies.py
rm -rf tools/recogniser-v2/overrides/
# Edit tools/recogniser-v2/__init__.py to re-export converter_v2 functions
```

### Step 5.3 — Spec 15 cross-reference update (Sonnet)

In `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`:
- §7.1: replace role-template dispatch description with "implemented by Spec 16's converter_v2 module"
- §7.2: mark per-block override deprecation as ✓ delivered by Spec 16 FR8

### Step 5.4 — tooling-map.md + cloning-pipeline-flow.md updates (Gemini Flash)

**Why Gemini Flash:** mechanical doc edits with cross-referencing. /delegate routes mechanical-update-with-context tasks to Gemini Flash (cheap + accurate at this scale).

- `tooling-map.md`: mark `extract.py` / `extract_strategies.py` / `overrides/hero.py` as RETIRED; add `converter_v2/*.py` rows
- `cloning-pipeline-flow.md`: replace Stage 4's script-list with converter_v2 module

**Wall-time:** ~15 min implementer + ~5 min parallel updates.

---

## Step 6 — Phase 6 (continued): Verification (~5 min wall)

```bash
# Pipeline still runs end-to-end
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --converter-v2 \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --skip-autonomy-gate --skip-register

# Verify no stale references
grep -rn "extract\.py\|extract_strategies\|overrides/hero" plugins/ tools/ 2>/dev/null | grep -v __pycache__
# Expected: empty (all references retired)
```

---

## Step 7 — Commit + PR + merge (inline)

Per Bean's "always merge to main" rule:
```bash
git checkout -b feat/spec-16-converter-v2-rollout
git add plugins/sgs-blocks/src/blocks/heading/ plugins/sgs-blocks/src/blocks/divider/
git add plugins/sgs-blocks/scripts/orchestrator/converter_v2/
git add plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py
git add -A tools/recogniser-v2/  # picks up deletes + __init__ update
git add .claude/specs/15-*.md .claude/specs/16-*.md
git add .claude/tooling-map.md .claude/cloning-pipeline-flow.md
git commit -m "feat(sgs-clone): Spec 16 converter v2 rollout — Phases 2-6 complete"
git push -u origin feat/spec-16-converter-v2-rollout
gh pr create --title "feat(sgs-clone): Spec 16 converter v2 rollout"
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
```

---

## Step 8 — Final QC multi-model panel + /handoff (~15 min wall)

### Step 8.1 — QC panel on the final state (parallel dispatch)

| Agent | Model | Scope |
|---|---|---|
| QC A | **Sonnet** | Architectural review on the wired converter + Spec 15/16 alignment |
| QC B | **Haiku** | Mechanical scan: tests pass, no stale refs, JSON schemas valid |
| QC C | **Gemini Pro** | Deep technical review on Phase 4 visual QA output — does the pixel diff match the spec's quality bar? |
| QC D | **Gemini Flash** | Fresh-eyes on the final Mama's output: scan for surprising emissions, check semantic completeness |

### Step 8.2 — /handoff (inline, last)

Triggers `.claude/handoff.md` + `.claude/next-session-prompt.md` regeneration. Update `state.md` to reflect Spec 16 fully shipped.

---

## Delegation summary — model + tool routing per step

| Step | Models | Dispatch tools | Rationale |
|---|---|---|---|
| 1.1 sgs/heading | Sonnet + Haiku + Gemini Flash | `/subagent-driven-development` | Architectural work (Sonnet) + parallel QC (Haiku mechanical, Flash fresh-eyes) |
| 1.2 sgs/divider | Sonnet + Haiku + Gemini Flash | `/subagent-driven-development`, `/dispatching-parallel-agents` for parallel with 1.1 | Different file sets — safe parallel |
| 1.3 /sgs-update | inline | n/a | Mechanical |
| 1.4 Converter routing | inline | n/a | Small targeted edit |
| 2.1 Promote prototype | inline | n/a | File moves + __init__ |
| 2.2 CLI mode | Sonnet | inline | Single careful Python file |
| 2.3 Orchestrator branch | Sonnet | inline | Production codepath — careful |
| 2.4 Orchestrator QC | Haiku + Sonnet | `/dispatching-parallel-agents` | Parallel review |
| 3.1–3.3 Visual QA | inline | `/visual-qa` skill | Skill-driven |
| 3.4 Diagnostician (if needed) | Sonnet | `/subagent-driven-development` | Deep diagnostic |
| 5.1 Grep audit | Cerebras | `/cerebras` | Cheap mechanical scan |
| 5.3 Spec 15 update | Sonnet | inline | Careful spec edit |
| 5.4 tooling-map + flow updates | Gemini Flash | `/gemini-flash` | Cheap accurate mechanical doc edits |
| 8.1 Final QC panel | Sonnet + Haiku + Gemini Pro + Gemini Flash | `/dispatching-parallel-agents` | 4 reviewers, disjoint scopes, parallel |
| 8.2 /handoff | inline | `/handoff` skill | Skill-driven |

---

## Risk register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | Phase 4 pixel diff > 1% on first pass | Medium-high | 2-iteration cap with Sonnet diagnostician; then surface to Bean |
| R2 | Step 2.3 orchestrator branch breaks legacy fallback path | Low-medium | Sonnet QC explicitly checks legacy path still works for non-SGS-BEM input |
| R3 | sgs/heading detection triggers on unintended elements | Low | Block-root class trigger (per FR9 corrected) is unambiguous; tested in Step 1.4 |
| R4 | Attribute gap candidates pile up faster than operator can author | Low — this is the catalogue extension work queue, expected behaviour | Stage 9 report priority-orders gaps so operator triages top of stack first |
| R5 | Pipeline-state mutex deadlock if Step 1.3 /sgs-update conflicts with Step 3.1 /sgs-clone | Low | /sgs-update completes Step 1.3 before Step 3.1 starts (sequential dependency) |

---

## Exit criteria (Phase 7 closure)

1. ✓ Phase 2: sgs/heading + sgs/divider in `src/blocks/` at status='built'
2. ✓ Phase 3: orchestrator runs `--converter-v2` end-to-end
3. ✓ Phase 4: Mama's homepage passes /visual-qa at ≤ 1% pixel diff (3 viewports)
4. ✓ Phase 5: /sgs-update Stage 4 canonical pass complete; attribute_gap_candidates surfaced
5. ✓ Phase 6: legacy extract.py + extract_strategies.py + overrides/ deleted; Spec 15 cross-refs updated; tooling-map + flow doc updated
6. ✓ Final QC panel: 4-reviewer multi-model verdict on the full state (all SHIP / PASS / READY / TECHNICALLY-SOUND)
7. ✓ /handoff invoked; state.md reflects shipped status; PR merged to main

Without all 7 — Phase 7 is NOT closed, Spec 16 stays open.
