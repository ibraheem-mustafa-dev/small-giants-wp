---
spec_id: optimisation-toolkit-design
date: 2026-04-27
authors: [Bean Mustafa, Opus + Sonnet subagents]
status: draft
phase: Small-Giant-WP Phase 2 + SSB Phase 4 (lean) — cross-cutting toolkit
canonical_path: ~/.claude/specs/2026-04-27-optimisation-toolkit-design.md
recommended_model: opus (system-level work) | sonnet (mechanical implementation)
---

# Optimisation Toolkit + Tooling Rebuild — Design Spec

> One-line: A library of shared optimisation utilities at `~/.agents/skills/shared-references/optimisation-toolkit/` that existing skills opt into via small hooks — gated by demonstrated improvement on held-out corpus. Plus the 5-phase tooling-rebuild structure that uses these utilities to optimise the SGS skill library, then rebuild the 13 pipelines as one unit.

---

## 0. Hard rules (non-negotiable)

1. **Must demonstrably improve results, not be another step for the sake of it.** Captured in blub.db `pattern_key: no-low-value-perfectionism-must-improve-results` (row 161). Every utility must prove >=5% weighted rubric improvement on at least one consumer before being wired in.
2. **Default to minimum viable structure.** Complexity is added only when there is evidence it helps. No utility ships without a smoke test + adoption gate.
3. **Never build a parallel system.** This toolkit does not replace or compete with `/skill-optimiser`, `/gap-analysis`, or `/lifecycle`. Those tools are the surface; this toolkit provides the internals they can call.
4. **Re-check every proposal against the perfectionism rule before building it.** If a spec section does not explain what gets concretely better and by how much, park it.
5. **SSB IS the global AI setup.** All optimisation-toolkit consumers live within SSB. No separate subproject. Rejected 2026-04-27 evening (decisions.md).

---

## 1. Architecture

### 1.1 Three-gate trust hierarchy

Every artefact (skill, pipeline, command) passes three gates before it is considered production-quality:

| Gate                           | Tool                                         | What it checks                                                                                                                                                             |
| ------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gate 1 — Form linter**       | `/skillscore` (sgs-skillscore.py)            | Structural requirements: required sections present, frontmatter complete, HARD GATE markers, routing accuracy, no dead references                                          |
| **Gate 2 — Universal quality** | `/gap-analysis` Lenses 1-5                   | End-result, OC/CC connectivity, blub.db persistence, automation vs human-memory, ADHD/overwhelm veto                                                                       |
| **Gate 3 — Domain end-goal**   | `/gap-analysis` Lens 6 (reads custom rubric) | Skill-specific outcomes. Lens 6 always runs; it always uses a custom rubric. Priority: file on disk > confirmed-saved inline > draft-unconfirmed inline > drafted this run |

Gate 1 and Gate 2 together form the baseline. Gate 3 is the differentiator — it grades actual end-results, not just structure.

### 1.2 File locations

| Asset                 | Location                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Per-skill rubric      | `<skill-dir>/references/end-goal-rubric.md`                                                |
| Per-command rubric    | `~/.claude/commands/.rubrics/<command-name>.md`                                            |
| Toolkit utilities     | `~/.agents/skills/shared-references/optimisation-toolkit/`                                 |
| Design-brain rubrics  | `~/Projects/small-giants-wp/.claude/specs/design-brain/<mode>.rubric.md`                   |
| Shared scoring engine | `~/.agents/skills/shared-references/sgs-skillscore.py` (precedent for the toolkit pattern) |

### 1.3 Framework vs sites split (small-giants-wp)

The `small-giants-wp` project is both a framework build (SGS blocks, theme, pipeline infrastructure) and a client site host. The distinction matters for the optimisation toolkit:

- **Framework work** (block dev, Phase 3.2, Phase 5 extensions) — optimisation targets the tooling pipeline
- **Client work** (Indus Foods, Mama's Munches, etc.) — optimisation targets the per-site build pipeline

The `/gap-analysis` Lens 6 rubric selection respects this split: framework targets load the framework rubric; site targets load the per-site pipeline rubric.

### 1.4 Sites registry

`small-giants-wp/.claude/sites.md` — one row per managed site. `/autopilot` reads this at session start to scope tool invocations to the active client. Format:

```
| slug          | name           | url              | state         | track-a-gate |
|---------------|----------------|------------------|---------------|--------------|
| mamas-munches | Mama's Munches | tbc              | live-partial  | A6 SGS Ecom  |
| indus-foods   | Indus Foods    | indusfoodsuk.com | homepage-live | A4 /quoter   |
| cmx-group     | CMX Group      | tbc              | engaged       | A4 /quoter   |
```

---

## 2. Rubric file format

### 2.1 Frontmatter spec

```yaml
---
target_type: skill | pipeline | command | spec
target_path: <absolute or ~-prefixed path>
last_reviewed: YYYY-MM-DD
bean_signoff: confirmed | pending
domain: <short domain name>
phase_3_merge_target: <pipeline name or "n/a"> # optional — only for design-brain skills
---
```

- `bean_signoff: confirmed` = rubric has been reviewed and approved by Bean in a live session
- `phase_3_merge_target` signals which design-brain sub-skills merge into `ui-ux-pro-max` in Phase 4

### 2.2 Three mandatory sections

**Section 1 — End-Goal Criteria table** (skill-specific only)

- 6 to 10 criteria; do not exceed 10
- Every criterion must have both a 5/5 anchor (world-state after success) and a 1/5 anchor (world-state after failure)
- Weights 1.0-1.5; total weight pool is informational, not normalised
- Anchors describe world-state, not process steps: "The lesson is visible in 5 future-session surfaces" not "The skill ran Stage 3"

**Section 2 — Never Do**

Runtime and output anti-patterns specific to this skill. Executable, not aspirational. Each item says exactly what to block and what to do instead.

**Section 3 — Lens 6 Anchors** (optional)

If the skill's value proposition is subtle or easy to misframe, add 2-4 anchors that explain the compounding effect. This section helps future gap-analyses understand the skill's true end-goal without re-reading the full SKILL.md.

### 2.3 End-result framing rule

Every anchor describes the world after the skill has either succeeded or failed. This prevents the rubric from grading process compliance instead of outcomes.

Correct: "The next session reads HANDOFF.md and is fully oriented within 60 seconds with zero follow-up questions."
Wrong: "The skill ran Gate 3 and wrote the output file."

---

## 3. Authoring path changes — what each writer does

### 3.1 Skill-writer (`/skill-writer`)

Gains a mandatory rubric-generation step at creation (Stage 2, before any SKILL.md content is drafted). The rubric is produced by the writer, confirmed by Bean (HARD GATE — no continuation until Bean signals `confirmed`), and saved to `<skill-dir>/references/end-goal-rubric.md` before the SKILL.md body is written.

Rationale: rubric-first prevents the SKILL.md from being written around the wrong goal. A confirmed rubric is the spec; the SKILL.md is the implementation.

### 3.2 Pipeline-writer (`/pipeline-writer`)

Same pattern as skill-writer. Pipeline rubric is generated at Stage 1 (before pipeline stages are defined), placed at `<pipeline-dir>/references/end-goal-rubric.md` or inlined into the pipeline spec. Bean sign-off gates pipeline stage design.

### 3.3 Command-writer (`/command-writer`)

Command rubric generated and placed at `~/.claude/commands/.rubrics/<command-name>.md`. The HARD GATE applies the same way: rubric confirmed, then command content drafted.

### 3.4 Skill-optimiser (`/skill-optimiser`)

Stage 1 reads the existing rubric from `references/end-goal-rubric.md`. If the file exists and has `bean_signoff: confirmed`, it uses that rubric to drive the gap-finding pass. If the rubric is absent, the optimiser generates one inline and pauses for Bean confirmation before continuing. The rubric is the optimiser's instruction set for what counts as an improvement.

### 3.5 Pipeline-optimiser (`/pipeline-optimiser`)

Same as skill-optimiser: rubric-first, inline generation + confirmation if file absent.

### 3.6 Gap-analysis (`/gap-analysis`) — Lens 6 behaviour

Lens 6 always runs. It always uses a custom rubric — never the generic 6-lens rubric alone. Fallback chain when no confirmed rubric file exists:

1. File at `references/end-goal-rubric.md` with `bean_signoff: confirmed` — use it
2. File exists but `bean_signoff: pending` — use it, flag the pending status in the output
3. No file — generate a draft rubric inline this run, surface it to Bean, use it for this run only, flag as `draft-unconfirmed`
4. Bean declines inline draft — use the 5-lens system-effect check alone and cap grade at B-

---

## 4. Optimisation toolkit utilities

All utilities live at `~/.agents/skills/shared-references/optimisation-toolkit/`. They are imported by consumer skills as optional enhancements — never as orchestrators or required dependencies.

### 4.1 Active utilities (4 to build)

| Utility                | File                                        | What it does                                                                                                                                                                                                                                   | Consumer hook                                                          |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `canary_split.py`      | `optimisation-toolkit/canary_split.py`      | Holds out 20% of the skill's fixture set before any optimisation pass. Scores the candidate version against held-out pairs only. Returns `{before_score, after_score, delta, pass: bool}`. Gate: `delta >= 0.05` required.                     | `/skill-optimiser` Stage 5 runs this before committing a fix           |
| `dspy_signature.py`    | `optimisation-toolkit/dspy_signature.py`    | Wraps any LLM prompt in a DSPy ChainOfThought signature. On first run, uses MIPROv2 to search for a better instruction + demos on the canary held-out set. Returns the optimised prompt if `delta >= 0.05`; otherwise returns original.        | `/skill-writer` rubric-generation step; `/skill-optimiser` Stage 3     |
| `certainty_calc.py`    | `optimisation-toolkit/certainty_calc.py`    | Given a batch of 5 model responses, calculates agreement-weighted certainty score (0-100). Outputs `{certainty, dominant_answer, dissenting_count}`. Below 70 = flag for human review; below 50 = HOLD.                                        | `/qc` Stage 3 evidence pass; `/gap-analysis` Lens 3 (robustness)       |
| `few_shot_injector.py` | `optimisation-toolkit/few_shot_injector.py` | Queries blub.db `corrections` + `knowledge` tables for the top-3 examples most semantically similar to the current task (using existing embeddings table). Injects them as few-shot examples into the prompt. Returns augmented prompt string. | `/skill-writer` rubric generation; `/subagent-prompt` criteria writing |

### 4.2 Parked utilities (2 — not building yet)

| Utility                 | Why parked                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forward_hypothesis.py` | Requires insights-graph Layer B (cluster synthesis) + SSB Phase 7 night-runner. Neither exists yet. Revisit when Layer B ships and nightly consolidation is live.                      |
| `cost_router.py`        | `/delegate` already handles cheap-model dispatch. Building a separate cost router would be a parallel system (anti-pattern, row 161). Revisit only if `/delegate` proves insufficient. |

### 4.3 Build order

1. `canary_split.py` first — foundational. Every other utility that claims improvement must prove it via canary split.
2. `dspy_signature.py`, `certainty_calc.py`, `few_shot_injector.py` in parallel — no cross-dependencies once canary_split exists.

### 4.4 Smoke test convention

Each utility ships with `tests/smoke_<utility_name>.py` that:

- Runs in under 10 seconds on a synthetic fixture
- Makes no network calls
- Asserts pass on a known-good input and fail on a known-bad input
- Exits with code 0 on pass, code 1 on failure

### 4.5 Adoption gate

A utility is only wired into a consumer skill when:

1. Smoke test passes
2. Consumer skill's canary split shows `delta >= 0.05` on weighted rubric score
3. Bean signs off via `/lifecycle` confirmation step

A utility that passes its own smoke test but fails the adoption gate for a given consumer is not wired into that consumer. It may pass for a different consumer.

### 4.6 Living principle

Utilities are libraries consumers opt into. They are never a pipeline, never an orchestrator, and never a mandatory dependency. A consumer skill without the toolkit is still a valid, shippable skill. A consumer skill with the toolkit is measurably better.

---

## 5. Phasing — Steps 3+4 of the SGS-WP master plan

The optimisation toolkit lives in Steps 3 and 4 of the SGS-WP 5-step master plan:

| Step  | Description                                       | Status                          |
| ----- | ------------------------------------------------- | ------------------------------- |
| 1     | Tool inventory + mapping                          | Done (2026-04-21)               |
| 2     | Strategic plan                                    | Done (2026-04-21)               |
| **3** | **Toolset gap-analysis**                          | Pending — this spec's Phase 1-3 |
| **4** | **Per-tool gap-analysis + improvement execution** | Pending — this spec's Phase 3-4 |
| 5     | Execute (Track A framework + Track B clients)     | Pending — Phase 5 below         |

### Phase 1 — Foundations

Sequential. Nothing else starts until Phase 1 is complete.

**1a — Build toolkit utilities** (build order: canary_split first, then 3 in parallel)

Estimated: ~4 hrs. Each utility smoke-tests on a real fixture before Phase 2 starts.

**1b — Update lifecycle + quality + QC skills** (BLOCKING — must complete before any per-skill optimisation)

Update all 8 via `/lifecycle`. Method: manual edit + cross-tier QC peer review (NOT self-apply — a separate Sonnet instance reads the updated skill fresh):

| Skill                 | Change                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `/skill-writer`       | Add rubric-generation at Stage 2; HARD GATE on Bean sign-off                              |
| `/pipeline-writer`    | Add rubric-generation at Stage 1; HARD GATE on Bean sign-off                              |
| `/command-writer`     | Add rubric-generation pre-command-body; HARD GATE; output to `.rubrics/`                  |
| `/skill-optimiser`    | Stage 1 reads existing rubric or generates inline; uses it as gap-finding instruction set |
| `/pipeline-optimiser` | Same as skill-optimiser                                                                   |
| `/gap-analysis`       | Lens 6 always runs; fallback chain per Section 3.6                                        |
| `/qc`                 | Wire `certainty_calc.py` into Stage 3; flag certainty < 70                                |
| `/qc-inline`          | Same as /qc for inline runs                                                               |

---

### Phase 2 — Rubrics universe

Depends on Phase 1 complete.

**2a — Per-skill optimisation pass on the 22 confirmed rubrics**

The 22 skills already have confirmed rubrics (paths in Section 10.1). Run `/skill-optimiser` on each, using the confirmed rubric as Lens 6 input. The updated lifecycle stack from Phase 1b powers these runs.

Estimated: ~30 min per skill. Parallelisable in groups of 3 via `/delegate`.

**Known structural debt — surfaced during P1.5d (2026-04-30):**

| Target | Score | Issues | Notes |
|---|---|---|---|
| `design-reviewer` agent | 53% | 585 lines (over 300 budget); missing HARD GATE tags; missing correction ledger integration; missing shared-references; tools declared but not referenced in body (8 tools); 6 magic numbers; 1 second-person line | seo-visual merge done at description level (P1.5d step 5). Body needs full structural pass to reach 85% threshold. Allocate ~45 min in Phase 2a, not the standard ~30. |
| `email-html-builder` skill | 63% | Missing "When NOT to use" section; missing "## Goal" section; no correction ledger; no references/ directory; no HARD GATE tags; doesn't declare invoked skills; doesn't declare system effect (0/6 lenses) | sgs-email-branding merge done at description level (P1.5d step 6). Standard 30 min Phase 2a pass should clear it. |
| `seo-auditor` agent | 59% | Missing "When NOT to use" body section; missing "## Goal"; missing "## Common Mistakes"; no correction ledger; no HARD GATE tags; no shared-references; no process summary or flowchart | seo-content merge done at description level (P1.5d step 7). Standard 30 min Phase 2a pass. |
| `sgs-extraction` skill | 85% | No references/ directory; missing System Effect / 6-lens section; no hooks/ or scripts/ directory (wraps external scripts at `~/.claude/hooks/`); 5 magic numbers (real timings + viewport sizes — acceptable) | 4 factual errors fully fixed at content level (P1.5d step 9). Only structural gap left — short Phase 2a pass (~15 min) to add the System Effect section. |
| `seo-technical` agent | 52% | Frontmatter fix done (HTML comment + model line moved into YAML block). Remaining: missing "When NOT to use" body section; missing "## Goal"; missing "## Common Mistakes"; no correction ledger; no HARD GATE tags; no shared-references | seo-sitemap + seo-hreflang both merged at description level (P1.5d step 10 — Bean override 2026-04-30: hreflang fits technical SEO). Standard 30 min Phase 2a pass. |

This list is the discovered floor — running `/skill-optimiser` on the rest of the 22 may uncover similar debt in the other agents/skills that were authored before the lifecycle quality bar was raised. Budget for variability.

**2b — Draft rubrics for remaining tools (triage first)**

Before drafting rubrics for the remaining ~140 skills, triage out tools that do not meaningfully affect end results:

- One-off CLI wrappers (e.g. invoice-sgs, screenshot)
- Dev-only utilities with no client-deliverable contribution (e.g. windows, docker-essentials)
- Pure routing skills with no direct output (e.g. wordpress-router)

For each remaining tool that passes triage, draft a rubric tagged with `serving_pipeline` and `stage` fields. Target: ~50-60 tools after triage. Rest get a `skip: true` flag in a central registry.

**2c — Draft end-goal rubrics for all 13 pipelines**

Each pipeline gets its own rubric at `<pipeline-dir>/references/end-goal-rubric.md`. The pipeline rubric describes what a successful pipeline run looks like from the client's perspective — not from the pipeline's internal stage perspective.

The 13 pipelines (current roster as of 2026-04-27 audit): sgs-discover, qc, ui-ux-pro-max, build-website, seo-full, research-pipeline, subagent-driven-development, phase-planning-to-execution, capture-and-compound, insights-generation, site-extraction, onboarding, analytics-intelligence.

---

### Phase 3 — Three-lens gap-analysis

Depends on Phase 2 complete.

**Execution model (resolved 2026-04-28):**

```
Per pipeline (3b) and per critical skill (3c):

  Sonnet subagent → draft rubric inline + run gap-analysis (combined single pass)
        ↓
  Gemini Flash → QC the Sonnet output (peer review)
        ↓
  Opus (main thread) → evaluate + synthesise → presents final version to Bean
```

- Rubrics for pipelines and critical skills are **built inline** during the gap-analysis run — no separate Phase 2c pre-drafting pass. Rubric draft → immediate use → refined in the same cycle.
- Sonnet subagents run in parallel groups of 3 (empirical ceiling from 2026-04-25; 5 caused rate-limit failures).
- Gemini Flash QC is the peer review layer — catches Sonnet drift before Opus sees it.
- Opus stays in the main thread as final evaluator and synthesiser. All final verdicts and gap reports presented to Bean inline.
- 3a and 3d remain fully Opus inline — architectural and sign-off work cannot be delegated.

**3a — System-level gap-analysis with 3 lenses** _(Opus inline, ~1.5h)_

A single analysis across the full skill library, examining three dimensions:

1. **Coverage gaps** — pipelines that cannot hit their end-goal because a critical skill is missing, too weak, or poorly connected
2. **Duplicate roles** — skills with overlapping triggers and similar outputs; candidates for merge or deletion
3. **Ordering/placement** — skills whose impact would change if invoked at a different stage or pipeline. Example: a QC-time skill that would prevent issues if invoked at design-time; a skill whose output would benefit a different pipeline earlier in the chain

**3b — Per-pipeline gap-analysis** _(Sonnet → Flash → Opus, 3 parallel, ~45 min)_

One gap-analysis run per pipeline. Rubric drafted inline at the start of each run and used immediately as Lens 6 input. Output: rubric file written to disk + per-pipeline gap report + prioritised fix list, all presented by Opus.

**3c — Per-skill gap-analysis on critical-pipeline skills only** _(Sonnet → Flash → Opus, ~30 min)_

"Critical pipeline" = any pipeline that directly touches client deliverables or system reliability. Skills used exclusively by non-critical pipelines are parked — no per-skill gap-analysis until they enter a critical pipeline. Same draft-QC-synthesise execution model as 3b.

**3d — Consolidation pass** _(Opus + Bean sign-off, ~30 min)_

3a + 3b + 3c findings inform three types of action before Phase 4 starts:

- **Merge candidates** — two skills become one with a new rubric
- **Delete candidates** — a skill has no confirmed-valuable pipeline role
- **Rebuild candidates** — a skill needs structural rewrite (not just patching) to hit its rubric

Consolidation decisions require Bean sign-off before Phase 4 begins.

**Total Phase 3 estimate: ~3h across 2–3 sessions.**

---

### Phase 4 — Tooling rebuild as one unit

All 13 pipelines are rebuilt together using:

- The updated lifecycle stack (Phase 1b)
- The 22+ optimised skills (Phase 2a)
- The full toolkit utilities (Phase 1a)
- The Phase 3 consolidation findings

**Design-brain goes FIRST in Phase 4** — it is not a concurrent sub-component; it gates all other pipeline rebuilds. Reason: the Blueprint JSON schema, Designer modes (A+B), and the 4-reviewer Council are new stages that insert into every one of the other 12 pipelines (see design-brain-architecture.md Section 5, Pipelines 1–8). Rebuilding the other 12 before the design-brain ships means inserting those stages twice. Design-brain must be production-quality — Blueprint schema locked, council.py smoke-tested, philosophy-autoload.py wired — before any other pipeline formalisation begins.

Sequence within Phase 4:

1. **Design-brain rebuild** (ui-ux-pro-max + innovative-design + 8 deprecated modifier skills deleted, 4 new SQLite tables seeded, council.py + designer.py built, hook wired) — gates everything below
2. **Pipelines 1–8 formalisation** (insert Designer stage + Council stage at correct positions, register blueprint-validator.json, smoke-test each pipeline end-to-end)
3. **Remaining 5 pipelines** (seo-full, research-pipeline, subagent-driven-development, phase-planning-to-execution, analytics-intelligence — redesign is lighter; they receive council but not the full Designer interview)

The 7 design-brain skills (`colourise`, `bolder`, `quieter`, `normalize`, `polish`, `distill`, `delight`) each carry `phase_3_merge_target: ui-ux-pro-max design brain` in their rubric frontmatter. Their Phase 2a optimisation passes feed directly into the Phase 4 `ui-ux-pro-max` rebuild.

Phase 4 ships as a single batch — no partial pipeline releases. All 13 pipelines meet their rubric gate or the phase is not closed.

#### Phase 4 detail (added 2026-04-29 — open items reconciled from strategy docs)

The high-level Phase 4 description above gates everything below. The following sub-sections enumerate the concrete deliverables inside Phase 4 that previously only lived in the strategy docs.

##### 4.1 Design-brain rebuild internals (gates everything else)

From `.claude/plans/strategy/2026-04-24-design-brain-architecture.md`. Each item must ship before Phase 4.2 starts.

| #      | Deliverable                                                                                                                                             | Source section                              | Type                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------- |
| 4.1.1  | `archetype_token_matrix` SQLite table seeded with Jung 12 × 4 pricing tiers (48 rows)                                                                   | design-brain §3.8                           | DB schema             |
| 4.1.2  | `brand_pillars` table (~36+ rows across archetypes)                                                                                                     | design-brain §3.8                           | DB schema             |
| 4.1.3  | `top_task_templates` table (~20 templates × 5 SGS industries)                                                                                           | design-brain §3.8                           | DB schema + seed      |
| 4.1.4  | `council_personas` table (4 personas)                                                                                                                   | design-brain §3.8                           | DB schema + seed      |
| 4.1.5  | `philosophy_rules` table (seeded from superdesign + delight + harden migrations)                                                                        | design-brain §3.8                           | DB schema + seed      |
| 4.1.6  | `scripts/modify.py` — `uimax modify --mode <X>` CLI (replaces 8 modifier sub-skills)                                                                    | design-brain §3.5.1                         | Code                  |
| 4.1.7  | `scripts/designer.py` — Designer Mode A interactive + Mode B autonomous                                                                                 | design-brain §3.2-3.3                       | Code                  |
| 4.1.8  | `scripts/council.py` — 4-Task dispatcher + synthesiser (Sonnet + Gemini-Pro + Cerebras + gemini-vision)                                                 | design-brain §3.6                           | Code                  |
| 4.1.9  | `references/blueprint-schema.json` — strict JSON contract Designer outputs                                                                              | design-brain §3.4                           | Schema                |
| 4.1.10 | `~/.claude/hooks/philosophy-autoload.py` PreToolUse hook on Skill matcher `ui-ux-pro-max`                                                               | design-brain §4.1                           | Hook                  |
| 4.1.11 | `~/.claude/pipelines/blueprint-validator.json` registered with pipeline-stage-gate                                                                      | design-brain §4.2                           | Pipeline registration |
| 4.1.12 | Delete 8 deprecated modifier skills (colourise, bolder, quieter, normalize, polish, distill, delight, adapt) — content migrated per design-brain §3.5.1 | design-brain §3.5.1                         | Removal               |
| 4.1.13 | `/innovative-design` rewrite as ~50-line thin classifier router                                                                                         | design-brain §3.5.2                         | Skill rewrite         |
| 4.1.14 | Merge `/superdesign` → `ui-ux-pro-max/references/superdesign-philosophy.md` + `philosophy_rules` rows                                                   | design-brain §3.5.1                         | Merge                 |
| 4.1.15 | Delete `/frontend-design` (orphan; surviving uniques → `aesthetic-reference.md`)                                                                        | design-brain §3.5.1, toolset-spec CHANGE #1 | Removal               |
| 4.1.16 | Merge `/audit` → `/site-reviewer`; delete `/critique` (becomes council persona); repurpose `/tailwind-design-system` to `/library-docs tailwind v4`     | design-brain §3.5.1                         | Merge/repurpose       |
| 4.1.17 | `/uimax ingest --mark-validated` flag (self-improvement loop)                                                                                           | design-brain §3.7                           | CLI flag              |
| 4.1.18 | `scripts/diversity-audit.py` (quarterly variance check)                                                                                                 | design-brain §3.7                           | Code                  |

design-brain's own internal Phase 1-5 (Cleanup → Superdesign Consolidation → DB+CLI → Skill Restructure & Hook → Self-Improvement) is the implementation order _inside_ Phase 4.1. Estimated 26-38h focused work per design-brain §7. Prefix any reference to design-brain phases with "design-brain Phase X" to disambiguate from the outer optimisation-toolkit Phases.

##### 4.2 Pipeline orchestrators to formalise (5 missing chargeable pipelines)

From `2026-04-21-toolset-spec-from-sgs-studio-session.md` ADD #9 + Section 4. The 5 missing orchestrators are the biggest revenue gap per the source handoff.

| #     | Pipeline                                        | Status today                                 | Phase 4 deliverable                                                                                                                                                                                                            |
| ----- | ----------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.2.1 | P1 — New client build                           | Informal stages exist; no orchestrator skill | Formalise as orchestrator with Designer Stage 1.5 + Council pre-deploy                                                                                                                                                         |
| 4.2.2 | P2 — WP→SGS migration                           | Informal                                     | Formalise; Blueprint mode fork "preserve existing" vs "elevate during migration"                                                                                                                                               |
| 4.2.3 | P3 — Draft→SGS (mockup input)                   | Informal                                     | Formalise; Designer Mode B (autonomous) extracts implicit Blueprint from mockup                                                                                                                                                |
| 4.2.4 | P4 — Audit→redesign proposal (THE pitch engine) | Informal                                     | Formalise; integrates `/lead-research-assistant` + `/site-reviewer` + Designer Mode B for proposal Blueprint                                                                                                                   |
| 4.2.5 | P6 — QA→deploy (pre-ship)                       | Informal stages exist                        | Formalise; Council 4-reviewer panel replaces single-LLM design review                                                                                                                                                          |
| 4.2.6 | P7 — `/build-website`                           | Already formalised                           | Apply 7-item remediation from toolset-spec §6 (Stage 1 AND not OR; delete `/site-clone` dead ref; REPORT.md motivation layer; post-deploy `/site-reviewer` smoke; `/uimax` INGEST stage; shared ethics gate; SEO completeness) |
| 4.2.7 | P9 — Block development standalone               | Informal                                     | Formalise; optional `/uimax query --domain product` consult; Council if block is design-surfaced                                                                                                                               |
| 4.2.8 | P12 — Client onboarding (DNS → live WP)         | Informal                                     | Formalise; biggest revenue gap per source handoff. `/cloudflare-toolkit` → `/vps-deploy` OR Hostinger SSH → `/wp-wpcli-and-ops` install → `/sgs-wp-engine` → `/design-tokens` → `/deploy-check`                                |

##### 4.3 New skills to build during Phase 4

From `toolset-spec` Section 7 ADD list. Build only what Phase 4 pipeline rebuilds depend on.

| #     | Skill                                                                                                            | Tier            | Why needed                                                                                                                                                                                                                                                             | Source                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 4.3.1 | `/interactivity-capture` (NEW)                                                                                   | Tier 2          | Closes the interactivity row of the 18-cell matrix. Parses captured HTML/CSS/JS for `:hover`, `:focus`, `:active`, `@media (hover:hover)`, `addEventListener`, IntersectionObserver, `data-wp-on--*` patterns. Bean's correction — fully possible from scraped source. | toolset-spec ADD #3                               |
| 4.3.2 | `/reference-voice-extractor` (NEW)                                                                               | Tier 3          | Content+tone extraction from reference sites (sibling to `/style-replicator`). Closes content+tone gap in clone outputs.                                                                                                                                               | toolset-spec ADD #4                               |
| 4.3.3 | Shared ethics gate module                                                                                        | Reference       | `robots.txt` + rate-limit + User-Agent gate. Consumed by `/sgs-extraction`, `/sgs-discover`, `/animation-harvest`, `/clone-patterns`. New Stage 0.5 in each.                                                                                                           | toolset-spec ADD #8, build-website remediation #6 |
| 4.3.4 | Promote `/site-reviewer` L5 (flow/UX) into a reusable dispatch stage                                             | Refactor        | Closes flow+UX column in build pipelines.                                                                                                                                                                                                                              | toolset-spec ADD #5                               |
| 4.3.5 | `/uimax` INGEST command (write path)                                                                             | New CLI surface | Already listed in Section 6.2 as a Phase 4 deliverable; cross-referenced here.                                                                                                                                                                                         | toolset-spec ADD #6                               |
| 4.3.6 | `/sgs-db` schema migrations: `animations`, `sections_detected`, `block_opportunities`, `extraction_cache` tables | DB migration    | Already listed in Section 6.2; cross-referenced.                                                                                                                                                                                                                       | toolset-spec ADD #7                               |

##### 4.4 Reclassifications (low-risk file moves)

From `toolset-spec` Section 7 CHANGE list. Bundle into a single PR.

| #     | Action                                                                                                                                                                                                         | Source                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 4.4.1 | Reclassify `/style-replicator` → content/voice domain (NOT design)                                                                                                                                             | CHANGE #2                    |
| 4.4.2 | Reclassify `/design-tokens` → WP-core domain (it wraps wp-token-bridge.py)                                                                                                                                     | CHANGE #3                    |
| 4.4.3 | Fix `/sgs-extraction` 4 factual errors (captured lesson 151)                                                                                                                                                   | CHANGE #4                    |
| 4.4.4 | Autopilot domain table: ensure entries for `/playwright`, `/animation-harvest`, `/sgs-discover`, `/sgs-extraction` (verify post-2026-04-29 — animation-harvest is in autopilot at line 206; verify the others) | CHANGE #5                    |
| 4.4.5 | Fix `/capture-lesson` skill Step 2 path drift `A:/.openclaw/` → `C:/Users/Bean/.openclaw/`                                                                                                                     | CHANGE #6                    |
| 4.4.6 | Delete stale Opportunity Skills section + `/site-clone` dead ref in `build-website` SKILL.md                                                                                                                   | toolset-spec SUBTRACT #3, #4 |

##### 4.5 Deferred pipelines (NOT in Phase 4 scope)

From `2026-04-21-non-essential-pipelines-deferred.md`. Each is parallelisable post-Phase-4 when its trigger fires. Listed here so future sessions don't accidentally pull them into critical path.

| Pipeline                          | Defer-until trigger                                                           | Dependencies before resumption                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| P8 — Content creation             | First 2-3 SGS sites ship and content-creation becomes a recurring bottleneck  | `/brand-voice-replicator` (NEW) + at least one Track B client live                                                                    |
| P10 — Scroll-animation-originator | First SGS flagship client where premium scroll-animation is pitched as upsell | fal.ai account + LTX-Video credits + `sgs/scroll-animation` block                                                                     |
| P11 — Email campaign              | When SGS adds email-campaign as a service offering                            | `/email-html-builder` 18-gap remediation + email_send.py html=True fix                                                                |
| P13 — App delivery                | After 3-5 SGS site clients prove the SGS theme revenue flow                   | `/uimax` stack-aware routing + Mobbin integration in `/sgs-discover` + `/app-block-library` (NEW) + TestFlight/Play Console toolchain |

Phase 4 ships without these. They reactivate by their own triggers, not by Phase 4 completion.

---

### Phase 5 — Step 5 client builds (Track A + Track B)

**Track A — Framework + tooling build-out** (no client dependencies)

9 items, sequential. Each unblocks one or more Track B clients.

| #   | Item                                                                                         | What it enables                                                                            |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| A1  | Steps 3+4 complete (this spec's Phases 1-4)                                                  | All Track B clients                                                                        |
| A2  | Responsive Extension                                                                         | SGS Studio v2                                                                              |
| A3  | Hover Extension                                                                              | SGS Studio v2                                                                              |
| A4  | `/quoter` rebuild                                                                            | Indus Foods pricing + CMX Group quotes                                                     |
| A5  | Dark-mode                                                                                    | SGS Studio v2                                                                              |
| A6  | SGS Ecom Plugin                                                                              | Mama's Munches (~4-6 wks; consider Stripe Checkout redirect for Phase 1 to unblock sooner) |
| A7  | Variant Picker                                                                               | Snooza/Ophir                                                                               |
| A8  | 3D Configurator (`<model-viewer>`, fallback three.js if material-swap fidelity insufficient) | Snooza/Ophir                                                                               |
| A9  | Block style variations                                                                       | SGS Studio v2                                                                              |

**Track A item detail (added 2026-04-29 — sub-tasks reconciled from `2026-04-21-step2-strategic-plan.md`)**

Each A-row above expands to the following sub-tasks. A-row is "done" only when all its sub-rows ship.

#### A2 — Responsive Extension (universal per-breakpoint controls)

Source: step2-strategic-plan §2.1 P1 items. Consolidate the following into one universal block extension so every block benefits from a single ship:

| P1#  | Item                                                  | Impact | Effort |
| ---- | ----------------------------------------------------- | ------ | ------ |
| #29  | Responsive spacing per breakpoint (universal)         | 5      | 3      |
| #32  | Linked/unlinked spacing toggle                        | 4      | 2      |
| #34  | Responsive gap per breakpoint                         | 4      | 2      |
| #37  | Per-breakpoint font size (universal)                  | 5      | 2      |
| #157 | Font size responsive per breakpoint (paired with #37) | 5      | 2      |
| #163 | Text alignment per breakpoint                         | 5      | 2      |

Plus from same source:

| P1# | Item                                     | Notes                                         |
| --- | ---------------------------------------- | --------------------------------------------- |
| #2  | Column gap per breakpoint                | All column blocks                             |
| #3  | Row gap per breakpoint                   | Pair with #2                                  |
| #9  | Asymmetric grid presets (2/3 + 1/3 etc.) | Column layout picker on `sgs/container`       |
| #18 | Background overlay with opacity          | Pseudo-element + controls on Hero + Container |
| #24 | Min-height per-breakpoint                | Hero specifically                             |

##### A3 — Hover Extension (universal per-block hover controls)

Source: step2-strategic-plan §2.1.

| P1#  | Item                            | Notes                                     |
| ---- | ------------------------------- | ----------------------------------------- |
| #101 | Scale transform on hover        | Extension candidate — audit not confirmed |
| #102 | Shadow elevation shift on hover | Pair with #101                            |
| #104 | Image zoom inner on hover       | Already in Gallery — lift to extension    |
| #106 | Reveal overlay on hover         | Already in Gallery — lift to extension    |
| #125 | Icon slide on hover             | Buttons + CTAs                            |

##### A4 — `/quoter` rebuild

Source: step2-strategic-plan §3.4. Single track, ~1 week:

| Sub-item                                                                                                         | Notes                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rebuild `/quoter` standalone                                                                                     | 5 ADHD friction resolvers: scope-creep detection, tiered scope menu, transparent ADHD buffer, ranked timeline scenarios, thread closure before finalising |
| Extract 6-lens business-strategy framework + challenge library from `/sales-intelligence-advisor` into `/quoter` | Pattern not domain                                                                                                                                        |
| DELETE `/sales-intelligence-advisor` from Bean's system                                                          | Amir retains his copy                                                                                                                                     |
| KEEP + adapter `/lead-research-assistant`                                                                        | One-way feed into `/quoter` (prospect research → scope seed)                                                                                              |

Unblocks: Indus Foods Phase 2 pricing + CMX Group quote.

##### A5 — Dark-mode extension

Source: step2-strategic-plan §2.3. SGS Studio v2 blocker.

| Sub-item                                                                     | Notes                                     |
| ---------------------------------------------------------------------------- | ----------------------------------------- |
| theme.json style variation switching triggered by JS toggle + `localStorage` | Body data-theme="dark"                    |
| Token layer in theme.json that swaps on `data-theme="dark"`                  | Token-driven, not per-block CSS overrides |

##### A6 — SGS Ecommerce Plugin Phase 1

Source: step2-strategic-plan §3.1. 4-6 weeks elapsed; spec doc to create at `specs/10-SGS-ECOMMERCE.md` before build starts.

Phase 1 minimum-to-ship-Mama's:

| Sub-item        | Notes                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Product CPT     | price, SKU, stock, images, short/long description, category/tag taxonomy                                                              |
| Variant support | size/colour/style (reusable attribute taxonomy)                                                                                       |
| Cart            | session-stored, sidebar + dedicated page                                                                                              |
| Checkout        | one-page; guest + account; Stripe Checkout session (redirect, recommended) OR Stripe Elements (in-page) — decide during gap analysis  |
| Order CPT       | status (pending/paid/fulfilled/cancelled), customer, line items, Stripe payment intent ID                                             |
| Admin           | product manager (native WP edit screens enhanced), order list with status filters, basic sales stats dashboard                        |
| Emails          | order confirmation (customer), new order alert (admin) — via existing N8N webhook pattern, NOT `wp_mail()`                            |
| Schema          | `Product`, `Offer`, `AggregateRating` on product pages (Rank Math integration)                                                        |
| Blocks          | `sgs/product-grid`, `sgs/product-card`, `sgs/product-hero`, `sgs/add-to-cart`, `sgs/cart-drawer`, `sgs/checkout`, `sgs/order-summary` |

Phase 2 (NOT required for Mama's launch): discount codes, shipping zones/rates, tax tables, abandoned cart recovery, customer accounts beyond guest-checkout, inventory per-variant.

Why not WooCommerce: avoids fighting Woo's opinionated stack; keeps ecom inside the framework's block-first editor philosophy.

##### A7 — Variant/Colour Picker block

Source: step2-strategic-plan §3.3. Shared component for A6 ecom variants AND A8 configurator colour swatches — REUSE, don't duplicate.

| Sub-item                                                     | Notes                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| Block: `sgs/product-page` (or extend product blocks from A6) | Integrates with ecom Product CPT AND configurator block     |
| Variant/colour picker component                              | Same UI drives both ecom variants and configurator swatches |
| Price updates on variant change                              | Ecom mode                                                   |
| Stock indicator per variant                                  | Ecom mode                                                   |
| "Add to cart" integration                                    | With cart drawer from A6                                    |
| Mobile sticky add-to-cart bar                                | UX requirement                                              |

Effort: 1-2 weeks parallel to A6 once variant schema stable.

##### A8 — 3D Configurator block

Source: step2-strategic-plan §3.2. Spec doc to create at `specs/11-SGS-3D-CONFIGURATOR.md`.

| Sub-item                                                                                                                                     | Notes                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Block: `sgs/3d-configurator`                                                                                                                 | Core renderer: Google `<model-viewer>` web component (approved); fallback to three.js only if Ophir's fidelity bar isn't met |
| Attributes: `primaryModel`, `variants`, `accessories`, `colourPalette`, `initialCamera`, `autoRotate`, `arEnabled`, `background`, `lighting` | See source §3.2 for detail                                                                                                   |
| Editor UX: InspectorControls per attribute group                                                                                             | Thumbnails for variants; drag-and-drop model upload                                                                          |
| Frontend UX: rotate, zoom, AR button, swatch picker, size picker, accessory checkboxes                                                       | Built-in AR auto-hidden on unsupported devices                                                                               |
| Performance: lazy-load model-viewer polyfill; on-demand GLB load; `importance="high"` on initial model                                       | Mandatory                                                                                                                    |
| Accessibility: keyboard rotation (arrow keys), screen-reader description of current config, alternate 2D image fallback                      | Mandatory                                                                                                                    |

Effort: 2-3 weeks once A7 lands.

##### A9 — Block style variations

Source: step2-strategic-plan §2.1 P1 #99. Framework supports `register_block_style()` but nothing registered yet. Polish before SGS Studio v2 rebuild. Per-block presets ship as one batch when the design-brain Phase 4.1 lands (philosophy_rules table seeds the presets).

**Track B — 5 priority clients (fixed order)**

| #   | Client         | Track B gate                                      | Current state                                                                                                                             |
| --- | -------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Mama's Munches | A6 SGS Ecom Plugin                                | Live site — decent desktop, poor mobile, not fully designed. Brand exists; logo with 2 fixed colours. Global palette beyond logo is open. |
| 2   | Indus Foods    | Build can start now; A4 `/quoter` for pricing     | Homepage live on Hostinger test                                                                                                           |
| 3   | CMX Group      | Design can start now; A4 `/quoter` for quote flow | Live engagement; competitor refs with Bean                                                                                                |
| 4   | Snooza/Ophir   | A7 Variant Picker + A8 3D Configurator            | 3D assets committed; no `sites/<slug>/` dir yet                                                                                           |
| 5   | SGS Studio v2  | A2 Responsive + A5 Dark-mode                      | Live on Vercel; brand docs in place                                                                                                       |

---

## 6. Recording schema

### 6.1 What's live now

- `pipeline_runs` table in `blub.db` — captures per-pipeline execution events

### 6.2 What's missing (build targets)

| Missing element                                                                                    | Where it would live         | Why it matters                                                                        |
| -------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `/uimax` INGEST command (read-only path exists; write path missing)                                | `ui-ux-pro-max` skill       | Design-brain rebuild builds it — Phase 4 deliverable                                  |
| `/sgs-db` new tables: `animations`, `sections_detected`, `block_opportunities`, `extraction_cache` | `blub.db`                   | Enables cross-run pattern detection in site builds                                    |
| Per-pipeline `/api/knowledge` POSTs                                                                | Each pipeline's final stage | Feeds correction ledger; enables cross-run gap detection                              |
| Council gap register                                                                               | `blub.db`                   | Tracks which skill gaps have been flagged, fixed, or accepted                         |
| `archetype_token_matrix` + validated-outcome ingestion                                             | `blub.db`                   | Enables design-brain to accumulate pattern evidence across clients                    |
| Pipeline telemetry: cost + time per run                                                            | `blub.db` `plan_actuals`    | Grounds phase-planner time estimates in actuals (currently all estimates are guesses) |

### 6.3 Lead and client interaction data

Until the dashboard tables exist, per-client state lives in `.claude/clients/<slug>.md` — one file per client, manually updated. Format:

```markdown
# Client: <Name>

slug: <slug>
state: <engaged | active | paused | live>
track-b-position: <1-5>
track-a-gate: <A1-A9>
last-contact: YYYY-MM-DD
next-action: <one sentence>
```

Sync to dashboard tables when `archetype_token_matrix` and per-pipeline `/api/knowledge` POST pattern are established.

---

## 7. Risk register

| Risk                                                             | Likelihood | Impact | Mitigation                                                                                                                     |
| ---------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Hot leads cooling — CMX, Snooza/Ophir, Indus Phase 2             | High       | High   | Add deadline-pressure trigger to `/live-project-status` for clients with last-contact > 14 days; Telegram ping via `tg-cli.py` |
| Steps 3+4 scope creep — Phase 1b expands to cover all 140 skills | Medium     | High   | Phase 1b covers the 8 lifecycle + quality + QC skills only. All others in Phase 2. Phase 1b is BLOCKING; Phase 2 is not        |
| `/quoter` rebuild slipping — Indus + CMX blocked                 | Medium     | High   | Use current `/quoter` for Indus + CMX. Rebuild only needed for client 4+. A4 gates only clients after CMX                      |
| SGS Ecom Plugin 4-6 week build                                   | Low        | High   | Stripe Checkout redirect as Phase 1 substitute; full plugin for Phase 2                                                        |
| `<model-viewer>` material-swap fidelity                          | Low        | Medium | Fall back to three.js if needed                                                                                                |
| `/uimax` INGEST path not yet built                               | Medium     | Medium | INGEST is Phase 4 deliverable. Phase 2a design-brain runs use existing DB queries without INGEST                               |
| 4 invisible skills in autopilot domain table                     | Medium     | Low    | ~1 hour fix. Add to Phase 1b as item 9. Does not block Phase 1 start                                                           |
| 2 of 5 clients have no `sites/<slug>/` directory                 | Low        | Low    | Run `/project-init` per client at Phase 5 start                                                                                |

---

## 8. Sites registry pattern

`small-giants-wp/.claude/sites.md` is the single source of truth for all managed client sites.

**File format:**

```markdown
---
last_updated: YYYY-MM-DD
---

# Sites Registry

| slug          | name           | url                     | state         | track-a-gate | notes                       |
| ------------- | -------------- | ----------------------- | ------------- | ------------ | --------------------------- |
| mamas-munches | Mama's Munches | tbc                     | live-partial  | A6           | Decent desktop, poor mobile |
| indus-foods   | Indus Foods    | indusfoodsuk.com        | homepage-live | A4           | Hostinger test              |
| cmx-group     | CMX Group      | tbc                     | engaged       | A4           | Competitor refs with Bean   |
| snooza-ophir  | Snooza/Ophir   | tbc                     | assets-ready  | A7+A8        | No sites/ dir yet           |
| sgs-studio-v2 | SGS Studio v2  | smallgiantsstudio.co.uk | live          | A2+A5        | Brand docs in place         |
```

`/autopilot` reads `sites.md` at Stage 0 to scope tool invocations to the active client. If a client's `sites/<slug>/` directory does not exist, autopilot surfaces the missing directory before any build work starts.

---

## 9. Open questions deferred

| Question                                                                 | Why deferred                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | When to revisit |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| ~~Design-brain rebuild timing relative to Pipeline 1/2/3 formalisation~~ | **RESOLVED 2026-04-28:** Design-brain goes FIRST in Phase 4. Blueprint schema + Designer + Council must be production-ready before any other pipeline formalisation. See Phase 4 section.                                                                                                                                                                                                                                                                                                                                                                              | —               |
| ~~Steps 3+4 owner + duration~~                                           | **RESOLVED 2026-04-28:** Execution model = Sonnet subagent (draft rubric inline + gap-analysis) → Gemini Flash QC → Opus inline synthesis + final presentation to Bean. 3a + 3d stay fully Opus. Parallelism cap: 3 Sonnet subagents. Total Phase 3 ~3h. See Phase 3 section.                                                                                                                                                                                                                                                                                          | —               |
| ~~Top-task template industries to seed in design-brain DB~~              | **RESOLVED 2026-04-28:** 5 industries confirmed: (1) construction (CMX — get a quote), (2) B2B wholesale/trade (Indus Foods — open a trade account), (3) accountant (book a consultation), (4) healthcare/dental (book an appointment; Snooza tagged `assistive-equipment` as a sub-row — assessment-led, funded, not standard ecommerce), (5) gifting ecommerce/wellness brand (Mama's Munches — shop / send as a gift / subscribe; NOT standard ecommerce, emotional+occasion-driven purchase). ~20 templates per industry = 100 seed rows at Phase 3 DB build time. | —               |
| Parallel execution ceiling for Phase 2a                                  | 3 parallel Sonnet subagents worked on 2026-04-25; 5 returned 50% failures (rate-limit). Ceiling at 3 until evidence for higher                                                                                                                                                                                                                                                                                                                                                                                                                                         | Phase 2a start  |
| `/qc-inline` vs `/qc` for Phase 1b peer review                           | Use `/qc` (more rigorous); `/qc-inline` for quick health checks mid-session only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Phase 1b start  |

---

## 10. References

### 10.1 All 22 confirmed rubric file paths

**3 pilots:**

| Skill             | Rubric path                                                     |
| ----------------- | --------------------------------------------------------------- |
| `/capture-lesson` | `~/.agents/skills/capture-lesson/references/end-goal-rubric.md` |
| `/qc`             | `~/.agents/skills/qc/references/end-goal-rubric.md`             |
| `/critique`       | `~/.claude/skills/critique/references/end-goal-rubric.md`       |

**5 high-confidence:**

| Skill                    | Rubric path                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `/phase-planner`         | `~/.agents/skills/phase-planner/references/end-goal-rubric.md`         |
| `/subagent-prompt`       | `~/.agents/skills/subagent-prompt/references/end-goal-rubric.md`       |
| `/interactivity-capture` | `~/.agents/skills/interactivity-capture/references/end-goal-rubric.md` |
| `/ethics-gate`           | `~/.agents/skills/ethics-gate/references/end-goal-rubric.md`           |
| `/handoff` (command)     | `~/.claude/commands/.rubrics/handoff.md`                               |

**7 medium:**

| Skill                  | Rubric path                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `/extract`             | `~/.claude/skills/extract/references/end-goal-rubric.md`             |
| `/harden`              | `~/.claude/skills/harden/references/end-goal-rubric.md`              |
| `/adapt`               | `~/.claude/skills/adapt/references/end-goal-rubric.md`               |
| `/project-consolidate` | `~/.claude/skills/project-consolidate/references/end-goal-rubric.md` |
| `/autopilot`           | `~/.agents/skills/autopilot/references/end-goal-rubric.md`           |
| `/strategic-plan`      | `~/.agents/skills/strategic-plan/references/end-goal-rubric.md`      |
| `/architecture-doc`    | `~/.agents/skills/architecture-doc/references/end-goal-rubric.md`    |

**7 design-brain:**

| Skill        | Rubric path                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `/colourise` | `~/Projects/small-giants-wp/.claude/specs/design-brain/colourise.rubric.md` |
| `/bolder`    | `~/Projects/small-giants-wp/.claude/specs/design-brain/bolder.rubric.md`    |
| `/quieter`   | `~/Projects/small-giants-wp/.claude/specs/design-brain/quieter.rubric.md`   |
| `/normalize` | `~/Projects/small-giants-wp/.claude/specs/design-brain/normalize.rubric.md` |
| `/polish`    | `~/Projects/small-giants-wp/.claude/specs/design-brain/polish.rubric.md`    |
| `/distill`   | `~/Projects/small-giants-wp/.claude/specs/design-brain/distill.rubric.md`   |
| `/delight`   | `~/Projects/small-giants-wp/.claude/specs/design-brain/delight.rubric.md`   |

### 10.2 Methodology doc

`C:/Users/Bean/Projects/small-giants-wp/.scratch/extracted-rubrics-2026-04-27.md`

615 lines. Contains all 22 rubric extractions from the most recent 25 gap-analysis reports, with per-skill grades, criteria, and Never Do anti-patterns.

### 10.3 Multi-role audit data

The `all-skills-classified-v2.json` file was not present on disk at spec-assembly time (`C:/Users/Bean/Projects/small-giants-wp/.scratch/skill-batches/` directory does not exist). Audit outcomes documented in `state.md` (2026-04-27 current_step): 161 SKILL.md files classified via 5 parallel Gemini Pro CLI calls; 94 toolkit-qualifiers identified; 5 edge cases. 6 BRAIN-class skills: `ui-ux-pro-max`, `superdesign`, `sgs-wp-engine`, `vercel-react-best-practices`, `marketing-psychology`, `marketing-ideas`. `ui-ux-pro-max` already ships self-improvement (ingest path, 11,964 rows, 36 tables).

### 10.4 WP Studio operational reference

The QA-to-deploy pipeline (Phase 4.2.5) and `/verify-loop` step budgeting both depend on WP Studio's MCP tools (`validate_blocks`, `need_for_speed`, `take_screenshot`, `rank_me_up`). Full CLI reference, MCP tool signatures, import/export workflows, Blueprint format, and gotchas:

- [`.claude/specs/2026-04-29-wp-studio-ai-manual.md`](2026-04-29-wp-studio-ai-manual.md) — operational manual (added cross-reference 2026-04-30)

### 10.5 SGS-WP planning docs informing Sections 5 and 7

- `C:/Users/Bean/Projects/small-giants-wp/.claude/handoff.md` — 2026-04-28 session handoff with Track B client state
- `C:/Users/Bean/.openclaw/workspace/code/small-giants-wp/CONVERSATION-HANDOFF.md` — framework completion plan status
- `C:/Users/Bean/.openclaw/.claude/subprojects/ssb/handoff.md` — SSB Phase 5 closure + Phase 6 spec
- `C:/Users/Bean/.openclaw/.claude/subprojects/ssb/state.md` — 2026-04-27 evening optimisation toolkit audit context
- `C:/Users/Bean/.openclaw/.claude/subprojects/ssb/decisions.md` — all 2026-04-27 evening decisions on optimisation toolkit scope, patterns, and audit method

### 10.6 Captured rules from blub.db

| Rule                                                            | blub.db row | Pattern key                                                       |
| --------------------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| No-low-value-perfectionism-must-improve-results                 | 161         | `no-low-value-perfectionism-must-improve-results`                 |
| End-goal rubric per skill is mandatory                          | 182         | `end-goal-rubric-per-skill-mandatory`                             |
| Capture-lesson must write to project mistakes and lessons files | 188         | `capture-lesson-must-write-to-project-mistakes-and-lessons-files` |
