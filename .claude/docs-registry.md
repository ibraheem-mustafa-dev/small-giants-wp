---
doc_type: docs-registry
project: small-giants-wp
generated: 2026-05-13
last_verified: 2026-05-14
last_patched: 2026-05-14 (3-reviewer QC corrections: 14-vs-18 count clarified, deprecated paths clarified, date aligned with YAML sidecar)
purpose: Single authoritative registry of every canonical .claude/ doc - what it owns, what it does NOT own, update triggers. Use this to decide WHERE a piece of information belongs and WHEN it must be updated. The registry is the meta-truth; every other canonical doc is governed by an entry here.
update_triggers:
  - Adding a new canonical doc (add row to canonical-docs table)
  - Deprecating an existing canonical doc (move row to deprecated table + add superseded_by)
  - Changing an ownership boundary (update the does-not-own column)
  - Closing a phase (mark phase-canonical plan docs as scope:closed)
sidecar: .claude/docs-registry.yaml (machine-readable version for hooks/scripts)
enforcement_hook: .claude/hooks/tooling-map-drift-check.py (committed - fails commit if scripts on disk drift from tooling-map.md)
---

# `.claude/` Docs Registry

## How to use this doc

**Before writing or updating any content**, ask: "Which doc OWNS this fact?" Look up the canonical-docs table below.

**Before adding a new doc**, ask: "Is this overlap-with-existing or genuinely new ownership?" If overlap, extend the existing doc instead.

**Whenever a triggering event fires**, update the matching docs in the SAME commit as the underlying change. Stale truth-docs are worse than missing ones - they actively mislead.

---

## 1. Canonical docs (14 forever-scope sources + phase-scoped patterns)

Project-local. `~/.claude/CLAUDE.md` and `~/.claude/rules/*.md` are global - out of registry scope.

**Count clarification:** rows 1-14 are forever-scope docs (always canonical). Rows 15-17 are spec/plan PATTERNS (the spec, the master plan, the per-phase plan template). Row 18 is the currently-active instance of the phase-N pattern (Phase 6 v2). Total individual rows = 18; total forever-canonical concepts = 14. The YAML sidecar lists 17 docs because it omits the phase-N PATTERN row (row 17) - patterns aren't useful in machine-readable form; only the active phase plan (row 18) is enumerated there.

| # | Doc | Scope | Owns | Does NOT own | Update triggers |
|---|-----|-------|------|--------------|------------------|
| 1 | `CLAUDE.md` | forever | Project rules, hard rules, deploy commands, gotchas, framework architecture, naming conventions | Per-script status (-> tooling-map), per-pipeline detail (-> cloning-pipeline-flow), DB schema (-> db-tables-map) | Any new project-wide rule; any hard constraint added; deploy command change |
| 2 | `architecture.md` | forever | System design + 354-feature audit + dev setup (high-level only) | Per-pipeline stages (-> cloning-pipeline-flow), per-script wiring (-> tooling-map) | Architectural decisions affecting system shape; major dev-setup changes |
| 3 | `goals.md` | forever | Active project goals + exit criteria | Per-phase steps (-> plans/), session-level state (-> state.md) | New goal added; exit criterion met or revised |
| 4 | `state.md` | forever (auto-regen) | Current phase + current sub-phase + current step + blockers + recommended_model_next | Decision rationale (-> decisions.md), pre-arranged plan steps (-> plans/), historical handoffs (-> memory/) | Every `/handoff` run; every phase or sub-phase transition; new blocker surfaced or resolved. **SOT for "what phase are we in" - all other docs LINK to state.md, never duplicate.** |
| 5 | `handoff.md` | forever (auto-regen) | Last session summary | Next session's prompt (-> next-session-prompt.md), historical summaries (-> memory/) | Every `/handoff` run |
| 6 | `next-session-prompt.md` | forever (auto-regen) | Pre-written kick-off prompt for the next session | Spec content (-> specs/), plan content (-> plans/) | Every `/handoff` run when a clear next-task exists |
| 7 | `decisions.md` | forever (append-only) | Architectural / scope / tooling decisions with date + reasoning | Behavioural lessons (-> mistakes.md via blub.db), spec changes (-> specs/) | Every decision that affects future sessions or changes a previously-agreed approach |
| 8 | `mistakes.md` | forever (append-only) | Thin manual log of recurring mistakes worth surfacing in handoffs. SoT is blub.db corrections API; this is the human-readable mirror. | The corrections themselves (SoT is blub.db `/api/corrections`); global rules (-> `~/.claude/rules/*.md`) | Every captured behavioural correction that's project-specific (not a global rule). Cross-post to blub.db. |
| 9 | `parking.md` | forever (append-only with status updates) | Deferred work, parked decisions, "do this later" notes | In-flight work (-> plans/), historical parks resolved (close with date + outcome) | Every "do this later" decision; every parked item resolution (mark closed) |
| 10 | `plan.md` | forever (master) | Current top-level master plan summary (1 page) | Per-phase detail (-> plans/spec-15-master-execution-plan.md + plans/phase-N-*.md) | Phase rename, master-plan revision, new top-level milestone |
| 11 | `cloning-pipeline-flow.md` | forever | Annotated visual flow of /sgs-clone + /sgs-update pipelines with per-stage scripts, files, DB tables, skills, status | Per-script inventory (-> tooling-map.md), per-skill inventory (-> skills-commands-map.md), per-table schema (-> db-tables-map.md), spec content (-> specs/) | Any pipeline stage change; script wired or unwired; DB schema change affecting pipeline; skill dispatch change |
| 12 | `tooling-map.md` | forever | Per-script inventory (107 scripts) with status (CURRENT/DEPRECATED/ONE-OFF/REFERENCE) + wired-in classification + file path | Skill/command inventory (-> skills-commands-map.md), DB schema (-> db-tables-map.md), pipeline flow (-> cloning-pipeline-flow.md) | Any script add/remove/rename; any script wiring status change; any script status reclassification. **Enforced by `.claude/hooks/tooling-map-drift-check.py`.** |
| 13 | `skills-commands-map.md` | forever | All slash commands + skills with pipeline position + scripts each invokes | Per-script detail (-> tooling-map.md), DB R/W (-> db-tables-map.md) | New skill or command added/retired; pipeline position change for any skill |
| 14 | `db-tables-map.md` | forever | Per-table inventory (29 sgs-framework + 48 uimax) with schema + R/W matrix per pipeline stage | Pipeline stage definitions (-> cloning-pipeline-flow.md), script inventory (-> tooling-map.md) | Any table add/remove/column change; any script that newly reads or writes a table |

### Phase-scoped canonical docs (truth-during-phase, archive-after)

| # | Doc pattern | Scope | Owns during phase | Archive when |
|---|------------|-------|--------------------|--------------|
| 15 | `specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` | spec-version-canonical | Authoritative spec for current spec version (15). Architecture, layers, FRs, phases | Spec is superseded by a new spec number |
| 16 | `plans/spec-15-master-execution-plan.md` | spec-version-canonical | Cross-phase orchestrator for this spec's phases | When spec is superseded |
| 17 | `plans/phase-N-*.md` | phase-canonical | Per-phase executable plan + step status | When phase status flips to CLOSED in state.md - then mark `scope: closed` and move out of active rotation |
| 18 | `plans/phase-6-pattern-fidelity-v2.md` | phase-canonical (active) | Phase 6 executable plan (v2) - supersedes v1; covers extract.py CSS-consumption generalisation + 14-module wiring + Rosetta Stone fix + small wins | Phase 6 closes - mark scope:closed |

---

## 2. Deprecated docs

Files that USED to be canonical or were referenced as canonical, now retired.

**Column meaning:** "Original path" is where the doc USED to live. "Current location" is where its contents now reside (or where the superseding doc lives). Deprecated specs are MOVED to `.claude/scratch/absorbed/` (not left in their original `.claude/specs/` location). The "leave on disk for commit-history continuity" rule means **the move target preserves commit history**, not that the original path stays populated.

| Original path (now empty) | Why | Current location | Date |
|----|-----|-------------|------|
| `.claude/reports/script-inventory-master-2026-05-09.md` | Referenced in state.md but file was never written / lost | `.claude/tooling-map.md` (richer, QC-verified) | 2026-05-13 |
| `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` | Absorbed into Spec 15 | `.claude/scratch/absorbed/12-DRAFT-TO-SGS-PIPELINE.md` (commit history continuity) | 2026-05-12 |
| `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` | Absorbed into Spec 15 §8.1 | `.claude/scratch/absorbed/13-DRAFT-NAMING-CONVENTION.md` | 2026-05-12 |
| `.claude/specs/14-CLONING-PIPELINE-CATALOGUE.md` | Absorbed into Spec 15 | `.claude/scratch/absorbed/14-CLONING-PIPELINE-CATALOGUE.md` | 2026-05-12 |
| `.claude/plans/phase-6-pattern-fidelity.md` (v1) | Superseded by v2 - v1 framed Phase 6 as "patch composer + chrome + hero" (symptom-driven); v2 is architecture-driven (wire 14 modules + extract.py generalisation + retire Stage 0.7) | `.claude/plans/phase-6-pattern-fidelity-v2.md` | 2026-05-14 |

**When deprecating**, do these in the same commit:
1. Move row from canonical table to deprecated table
2. Add `status: deprecated` + `superseded_by: <path>` + `deprecated_on: YYYY-MM-DD` to the doc's frontmatter
3. **For specs being absorbed**: `git mv .claude/specs/X.md .claude/scratch/absorbed/X.md` (preserves commit history in the new location). The original `.claude/specs/` path is then empty - that's intentional.
4. **For plans being superseded** (e.g. v1 → v2): leave the v1 file in `.claude/plans/` with `status: deprecated` frontmatter. Don't move plan files; they live with their successors.
5. Update `.claude/docs-registry.yaml` sidecar to match.

---

## 3. Update-trigger matrix

When event X happens, all listed docs update in the SAME commit as the underlying change.

| Event | Docs that must update |
|-------|------------------------|
| Add a new script under `plugins/sgs-blocks/scripts/`, `scripts/`, or `tools/` | `tooling-map.md` (add row) + (if pipeline-relevant) `cloning-pipeline-flow.md` (add to stage block) |
| Wire an unwired module into the live path | `tooling-map.md` (status YES + reason) + `cloning-pipeline-flow.md` (✗ -> ✓ in the affected stage block) |
| Remove or retire a script | `tooling-map.md` (move to TO-RETIRE or remove) + `cloning-pipeline-flow.md` (remove from stage block) |
| Add a new sgs-framework.db or uimax table | `db-tables-map.md` (add row) + (if pipeline reads/writes) `cloning-pipeline-flow.md` (update stage block) |
| Add/remove a column on an existing DB table | `db-tables-map.md` (update schema column) |
| Phase status flips to CLOSED | `state.md` (current_phase advances) + `plans/phase-N-*.md` (mark scope: closed) + `decisions.md` (close decision logged) + `handoff.md` (final summary) + `plan.md` (master view advanced) |
| New skill or command added | `skills-commands-map.md` (add detail) |
| Skill/command pipeline position changes | `skills-commands-map.md` + `cloning-pipeline-flow.md` (update skill dispatch chain at top + relevant stage block) |
| New behavioural correction captured | `mistakes.md` (project-specific) OR `~/.claude/rules/*.md` (global) + blub.db POST to `/api/corrections` |
| Architectural change to a pipeline stage | `specs/15-...md` (update §7) + `cloning-pipeline-flow.md` (update stage block) + `decisions.md` (log decision + reasoning) |
| New canonical doc added | `docs-registry.md` (add row) + `docs-registry.yaml` sidecar |
| Doc deprecated | `docs-registry.md` (move row to deprecated table) + doc's frontmatter (`status: deprecated; superseded_by:`) |

---

## 4. Ownership boundaries (explicit rules for overlap-prone content)

These are the cases where two docs LOOK like they should both carry the same fact. Define explicitly which wins.

| Content | Lives in | Does NOT live in | Rationale |
|---------|----------|-------------------|-----------|
| Current phase status | `state.md` ONLY | Spec, master plan, phase plans | One SoT. Other docs LINK ("see state.md") if they need to mention current phase. |
| Per-script wiring status | `tooling-map.md` (status + wired-in column) | cloning-pipeline-flow.md, skills-commands-map.md | Pipeline flow uses ✓/✗ symbols inheriting from tooling-map but doesn't re-derive |
| Per-script "what it does" | `tooling-map.md` ONLY | cloning-pipeline-flow.md (just names the script + symbol) | Description is in tooling-map; flow-doc just plots |
| Per-pipeline-stage definition | `cloning-pipeline-flow.md` (annotated visual) + `specs/15-...md` §7 (formal definition) | Both ARE allowed because spec is the contract + flow is the implementation map. They MUST stay aligned. | Spec change triggers flow-doc update in same commit |
| Skill dispatch chain | `skills-commands-map.md` (full detail) + `cloning-pipeline-flow.md` (visual summary at bottom) | Per-skill mid-stage detail (just the skill name + ↑/↓ arrow in flow) | Flow shows orchestration; map shows skill internals |
| DB table schema | `db-tables-map.md` ONLY | cloning-pipeline-flow.md (just names the table) | Schema column lists belong in one place |
| Behavioural rule | global -> `~/.claude/rules/*.md`; project-specific -> `mistakes.md` + blub.db | Anywhere else | Two-tier system: global vs project. Both POST to blub.db as SoT. |
| Decision rationale | `decisions.md` (append-only log entry) | Spec/plans/state (which may mention "per decision X" with a date but not duplicate the rationale) | Decisions log is the audit trail |
| Deferred work | `parking.md` ONLY | Plans (which may mention "parked per parking.md line N") | One park log |
| Spec FR list | `specs/15-...md` §10 ONLY | Plans reference FR numbers but don't redefine them | Spec is the FR contract |

---

## 5. Cold-start reading order

When a new session opens and needs full context (not just autopilot's quick load), read in this order:

1. **`state.md`** - what phase, current step, blockers (always first)
2. **`handoff.md`** - last session's summary (what just happened)
3. **`next-session-prompt.md`** - what was queued (if it matches current intent)
4. **`cloning-pipeline-flow.md`** - the annotated flow (for pipeline work) OR `architecture.md` (for non-pipeline work)
5. **`plans/phase-<current>-*.md`** - active phase steps
6. **`decisions.md`** - last 5-10 entries (recent context)
7. **`parking.md`** - last 5 entries (deferred items still pending)
8. **Domain reference** as needed: `tooling-map.md`, `skills-commands-map.md`, `db-tables-map.md`, `specs/15-...md`

If working on a specific block or skill: jump straight to its inventory entry in the relevant -map.md after step 4.

---

## 6. Retention rules

| Directory | Retention | Trigger |
|-----------|-----------|---------|
| `.claude/scratch/` | Age-out after 30 days OR move to `.claude/reports/` if durable | `/handoff` invokes scratch-prune; durable items get explicitly promoted before /handoff |
| `.claude/reports/` | Forever (these are durable QC / audit / lifecycle reports) | Add row to `cloning-pipeline-flow.md` references or `tooling-map.md` if the report names something canonical |
| `.claude/memory/` | Forever (archived handoffs + consolidation receipts) | `/handoff` rotates current handoff.md INTO memory/ on next session |
| `.claude/scratch/absorbed/` | Forever (deprecated docs preserved for commit-history continuity) | Move-on-deprecation only |

---

## 7. Enforcement

| Hook | Path | What it does | Status |
|------|------|--------------|--------|
| `tooling-map-drift-check.py` | `.claude/hooks/tooling-map-drift-check.py` | Pre-commit: walks `plugins/sgs-blocks/scripts/`, `scripts/`, `tools/` for .py/.js files. Compares against tooling-map.md. Fails commit if any file on disk is missing from the inventory OR any file in the inventory is missing from disk (excluding TO-RETIRE / MISSING-from-disk entries). | COMMITTED - built 2026-05-13 |
| `db-tables-drift-check.py` (future) | `.claude/hooks/db-tables-drift-check.py` | Compare PRAGMA table_info against db-tables-map.md schema columns | NOT BUILT - candidate for next phase |
| `cloning-pipeline-flow-status-check.py` (future) | `.claude/hooks/cloning-pipeline-flow-status-check.py` | Parse LIVE-stage status labels; fail if a LIVE-marked module has no import in entry-points | NOT BUILT - semantic parsing required; deferred |
| `role-templates-vs-property-suffixes-check.py` (future) | `.claude/hooks/role-templates-vs-property-suffixes-check.py` | Compare role-templates.json (legacy v1 seed) against property_suffixes DB columns; fail on divergence. Closes drift risk surfaced by parking entry P-S15-ROLE-TEMPLATES-MIGRATE. | NOT BUILT - awaits parking-entry execution |

---

## 8. Frontmatter convention for canonical docs

Every canonical doc MUST have YAML frontmatter with these fields:

```yaml
---
doc_type: <one of: project-rules | architecture | goals | state | handoff | next-session-prompt | decisions | mistakes | parking | master-plan | execution-plan | phase-plan | spec | tooling-map | skills-commands-map | db-tables-map | docs-registry | visual-reference>
project: small-giants-wp
last_verified: YYYY-MM-DD  # date someone last ran the QC against disk
update_triggers:           # list from docs-registry section 3
  - "event X"
  - "event Y"
companion_docs:            # cross-links to related canonical docs
  - .claude/...
status: active             # or "deprecated" if retired
# If status is deprecated:
superseded_by: .claude/...
---
```

Existing canonical docs should be updated to include `last_verified` and `update_triggers` in their frontmatter on next touch.

---

## 9. Machine-readable sidecar

The same registry data is mirrored at `.claude/docs-registry.yaml` for hook/script consumption. Whenever this markdown file is updated, the YAML sidecar must be regenerated.

(To be generated as part of the docs-registry rollout work.)

---

## See also

- Spec: [.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md](specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md)
- Master plan: [.claude/plans/spec-15-master-execution-plan.md](plans/spec-15-master-execution-plan.md)
- Visual flow: [.claude/cloning-pipeline-flow.md](cloning-pipeline-flow.md)
- Tooling map: [.claude/tooling-map.md](tooling-map.md)
- Skills + commands: [.claude/skills-commands-map.md](skills-commands-map.md)
- DB tables: [.claude/db-tables-map.md](db-tables-map.md)
