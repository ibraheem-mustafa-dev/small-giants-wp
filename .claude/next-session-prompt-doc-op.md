---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-25-doc-optimisation-execution
generated: 2026-05-24
parent_session: small-giants-wp-2026-05-24-doc-optimisation-council
primary_goal: "Execute the 10-phase doc-optimisation plan validated by /qc-council on 2026-05-24. Then integrate the universal + doc-type-specific rules into `/docscore` so future drift is caught automatically. AFTER this work closes, the deferred BEM-canonical Step 1.7 G3 slot_list visual extension (see .claude/next-session-prompt.md) becomes the next priority."
status: deferred_pre_g3_work
---

# Next session (DOC-OPTIMISATION) — 10-phase execution + `/docscore` rule integration

**Invoke `/autopilot` before anything else.**

## ORDER (re-stated for clarity)

This is the doc-optimisation session. It runs BEFORE Step 1.7 G3 of the Phase 1 plan. The G3 work is in the standard `next-session-prompt.md` and resumes AFTER this completes.

## STOP — READ THIS FIRST

Read in order:
1. `.claude/handoff-doc-op.md` — 2026-05-24 council session summary + 11 breakage gotchas + Bean's 5 refinements
2. `.claude/handoff.md` — 2026-05-24 BEM-canonical session summary (the prior session) — for context only; not the active task
3. The 6 binding rules from `.claude/next-session-prompt.md` "STOP — 6 BINDING RULES" section — they still apply for this work
4. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` — verify the silent-dropout bug (`wc -c MEMORY.md` against the 24576-byte autoload cap)

**Reading discipline:** cite line numbers when summarising back. Wait for Bean's go-ahead before any commit work.

## 10-phase execution order

| # | Phase | Action | Files touched | Commit boundary |
|---|---|---|---|---|
| **1** | **F2 (CRITICAL — fix MEMORY.md silent dropout FIRST)** | Rewrite every entry in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` to one-line stubs: `- [name](file.md) — one-line hook`. Currently uses multi-line block-quote summaries. Target: ≤ 76 lines (one per feedback file in that directory). Verify post-edit: `wc -c MEMORY.md ≤ 24000` (gives headroom under 24.4 KB cap). | `~/.claude/projects/.../memory/MEMORY.md` only | Commit 1 — "fix: MEMORY.md silent rule-dropout (functional safety)" |
| **2** | **F1 (4.4 GB worktree force-removal with branch-safety)** | `git worktree list` to enumerate the 21 locked entries. For each, check `git branch --merged main` to see if its branch is merged. Anonymous `worktree-agent-*` branches: `git worktree remove --force`. Named branches (`feat/spec18-customiser-cleanup`, `feat/phase-2a-*`) that ARE merged: same. Named branches NOT merged: surface to Bean before removing — these may carry unfinished work. After clearing eligible worktrees: `git worktree prune`. Verify: `du -sh .claude/` drops from 4.4 GB to <50 MB. | `.claude/worktrees/` (deleted) | Commit 2 — "chore: remove 21 stale locked agent worktrees (recover 4.4 GB)" |
| **3** | **Phase A' (revised — atomic gitignore)** | `git rm --cached .claude/specs/02-SGS-BLOCKS-REFERENCE.md` + add `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` to `.gitignore` in same commit. Confirm `.claude/worktrees/` + `.claude/scratch/` are ALREADY in `.gitignore` (do not re-add). | `.gitignore` + git index entry | Commit 3 — "chore: untrack auto-generated 02-SGS-BLOCKS-REFERENCE.md (6,089 lines)" |
| **4** | **F5 + F6 + F3 (small fixes)** | F5: in `.claude/CLAUDE.md` line referencing `subprojects.md` — either create the file with current subproject inventory OR remove the pointer. F6: strip the 23-line comment header block at top of `.claude/docs-registry.yaml` → 3-line header (`generated: …` + `last_updated: …` + `project: …`). F3: delete 7 stale next-session-prompt files from `.claude/memory/` (any file named `next-session-prompt-2026-05-{01..17}-*.md`). | `.claude/CLAUDE.md` + `.claude/docs-registry.yaml` + 7 files in `.claude/memory/` | Commit 4 — "docs: fix broken subprojects ref + slim registry header + remove stale memory files" |
| **5** | **B' (revised — Bean's active prune, NOT age-cutoff archive)** | Three sub-tasks. Each gets its own commit unless trivially small. Per Bean refinements 2/3/4. **See "Bean-refined prune protocols" section below for the per-doc protocol.** | `mistakes.md`, `decisions.md`, `parking.md`, `memory/mistakes-archive.md`, `memory/decisions-archive.md`, `memory/parking-archive.md` | Commits 5a/5b/5c |
| **6** | **F4 (eviction policy in registry)** | Add a `retention:` field convention to `docs-registry.yaml` for `memory/` destination: next-session-prompt files 30-day TTL; handoff files 60-day TTL; everything else permanent. Document the cleanup script trigger (manual on /handoff, future auto). | `docs-registry.yaml` only | Commit 6 — "docs(registry): add retention policy for memory/" |
| **7** | **C' (revised — relocate misplaced specs + archive quickstart)** | 11 spec relocations + quickstart archive. BEFORE moving files: grep for inbound references, update them in same commit. **See "Phase C' pre-move checklist" below.** Bean refinement 5: `quickstart.md` → `memory/quickstart-archive.md` (hasn't been updated). | 11 specs + relative-link-updating docs + `quickstart.md` | Commit 7 — "docs: relocate misplaced specs + archive quickstart" |
| **8** | **D' (revised — atomic restructure of heavy docs)** | Split each heavy doc in atomic commits. **See "Phase D' atomic commit boundaries" below.** | `architecture.md`, `cloning-pipeline-flow.md`, `pipeline-state-debug-artefacts-inventory.md`, `.claude/CLAUDE.md`, `plan.md`, `docs-registry.yaml`, `drift-check-dispatcher.py` | Commits 8a–8g |
| **9** | **E' (registry sync + decision entry)** | Update `docs-registry.yaml` paths post-moves. Write doc-optimisation decision entry into `decisions.md` AFTER Phase B' pruning (else it gets immediately pruned). | `docs-registry.yaml` + `decisions.md` | Commit 9 — "docs: registry sync + decision log post doc-optimisation" |
| **10** | **G — `/docscore` rule integration** | Update `~/.claude/commands/docscore.md` (or its skill equivalent) with the universal + doc-type-specific rules below. The command should output a per-doc score against the rule-set + a remediation list. | `~/.claude/commands/docscore.md` (or skill SKILL.md) | Commit 10 — "feat(docscore): universal + doc-type rules from 2026-05-24 council" |

**Total: ~5 hours. Disk freed: 4.4 GB. Always-loaded context drops ~80%. All ~76 memory rules load reliably.**

## Bean-refined prune protocols (per-doc)

### 5a — `mistakes.md` (keyword stubs + blub.db row refs)

Replace every entry's full body with this format:

```
### [YYYY-MM-DD] keyword-line summary
- **Pattern key:** `<key from blub.db>`
- **blub.db row:** `<N>`
- **Feedback file:** [name](~/.claude/projects/.../memory/feedback_X.md)
```

The full body lives in blub.db `learnings` table (canonical) + the `feedback_X.md` file (workspace mirror). No duplicate body text in `mistakes.md`.

Target: 30 entries max in active `mistakes.md`. Older / less-load-bearing entries → keyword stub in `memory/mistakes-archive.md` (still searchable; not session-loaded).

ACTIVE-header at top of trimmed `mistakes.md`:
```
<!-- ACTIVE — last 30 entries (keyword stubs). Full body in blub.db `learnings` table or feedback_X.md files. Archive: memory/mistakes-archive.md. Search: grep -r KEYWORD memory/ + curl localhost:5050/api/learning?search=KEYWORD -->
```

### 5b — `decisions.md` (audit + relevance-prune + canonical-home check)

For each entry, ask:
1. **Still relevant?** — has the decision been superseded by a newer one? Has the context changed?
2. **Optimally written?** — is it ≤3 lines + a pointer to commit SHA / spec section? Or is it 10 lines of restated history?
3. **Canonical home elsewhere?** — does the decision describe something already canonical in a spec, code comment, or DB schema?
   - Example: "Decision: use attribute suffixes table" — that's already in `block_attributes` + Spec 16 §12.4. **DELETE from `decisions.md`** (no purpose here).
   - Example: "Decision: D32 two-commit archive-then-delete pattern" — recurring methodology, not described elsewhere. **KEEP** in active.

**Sort buckets per entry:**
- KEEP active — relevant + not duplicated + ≤3 lines (or compress to ≤3 lines)
- ARCHIVE to `memory/decisions-archive.md` — old + non-load-bearing but historically interesting
- DELETE outright — wrong / contradicted / restated-from-elsewhere

Target: 50 entries max in active. Each ≤3 lines + commit SHA pointer.

ACTIVE-header:
```
<!-- ACTIVE — last 50 decisions (compressed format). Older or non-load-bearing → memory/decisions-archive.md. Deleted entries listed in git log only. -->
```

### 5c — `parking.md` (OPEN only + completion-date archive)

For each entry currently marked RESOLVED: move the entire entry block to `memory/parking-archive.md` (or `plans/archive/parking-archive.md` — pick one place, document the choice in registry). Append the completion date to the entry's heading: `**P-FOO** — RESOLVED 2026-05-24`.

For each entry currently marked OPEN: review:
1. Is it actually still actionable? (Yes → keep)
2. Is it implicitly resolved (e.g. the related code shipped without this being checked off)? (Yes → archive with completion date estimated from latest related commit)
3. Is it wrong / contradicted? (Yes → DELETE)

Active `parking.md` ends up with only genuinely OPEN entries.

ACTIVE-header:
```
<!-- ACTIVE — open parking items only. Resolved entries → memory/parking-archive.md with completion date. -->
```

## Phase C' pre-move checklist

For each relocation, grep for inbound references FIRST and update in the same commit:

```bash
# Template — replace FILENAME
grep -rln "FILENAME" .claude/ plugins/ ~/.claude/ ~/.openclaw/ 2>&1
```

| Source file | Destination | Pre-move grep targets |
|---|---|---|
| `specs/09-GOLD-STANDARD-AUDIT.md` | `reports/reference/` (NOT plain `reports/` — README marks it `active`) | `specs/06-BUILD-ORDER.md` + `specs/10-COMPETITOR-RESEARCH.md` + `specs/README.md` — update relative links |
| `specs/10-COMPETITOR-RESEARCH.md` | `reports/` | `specs/09-GOLD-STANDARD-AUDIT.md` cross-ref + `specs/README.md` |
| `specs/RESEARCH-PROMPT.md` | DELETE | `specs/README.md` row — remove |
| `specs/2026-04-16-local-code-review-architecture.md` | `~/.claude/specs/` | `~/.claude/commands/dev.md:37` hard-coded path — update |
| `specs/2026-04-27-optimisation-toolkit-design.md` | `~/.claude/specs/` | Confirm no active scripts grep this |
| `specs/2026-04-29-wp-studio-ai-manual.md` | `~/.claude/skills/` (or delete if obsolete) | Check `plans/master-plan/master-plan.md` references |
| `specs/chrome-devtools-stage-8-integration.md` | `plans/strategy/` | (no inbound refs found) |
| `specs/cloning-skill-salvage-matrix-2026-05-05.md` | `plans/archive/` | (no inbound refs) |
| `specs/pattern-dedup-classify-mechanics-2026-05-05.md` | `plans/archive/` | (no inbound refs) |
| `specs/hostinger-mcp-catalogue.md` | `~/.claude/specs/` | (no inbound refs in this repo) |
| `specs/legacy-2026-03-25-mobile-nav-attributes.md` | `plans/archive/` | (no active refs) |
| `specs/legacy-2026-03-27-mobile-nav-v2-composition.md` | `plans/archive/` | (no active refs) |
| `.claude/quickstart.md` | `memory/quickstart-archive.md` | `.claude/CLAUDE.md` line 34 reference — update / remove (do this in D' CLAUDE.md rewrite) |

## Phase D' atomic commit boundaries

| Commit | Action | Atomicity reason |
|---|---|---|
| **8a** | `architecture.md` split → Part A (200 lines stays) + Part B (354-feature audit → `plans/archive/2026-02-21-feature-audit.md`) + Part C (dev setup → NEW `.claude/dev-setup.md`) + registry entry update | All 4 files change together |
| **8b** | `cloning-pipeline-flow.md` split + `drift-check-dispatcher.py` hook update (hook hard-codes path + reads section headings) — overview gets stage-index table at top per Rater B's fix | Hook must keep working through the split |
| **8c** | `pipeline-state-debug-artefacts-inventory.md` rename → `specs/21-PIPELINE-STATE-ARTEFACTS.md` + update 8 reference sites: `docs-registry.yaml` + `next-session-prompt.md` + `strategic-plan.md` + all 4 phase plans + `drift-check-dispatcher.py` | 9 files change together |
| **8d** | `.claude/CLAUDE.md` Karpathy rewrite (~50 lines, manifest-only, prose→table per Rater B fix) + update line 34 quickstart reference (since quickstart moved in C') | Two changes share the file |
| **8e** | `plan.md` → 10-line stub + move closed content to `plans/archive/2026-05-21-architecture-programme.md` + update registry pointer | Atomic stub + archive |
| **8f** | `docs-registry.yaml` slim — strip `canonical_docs` narrative; PRESERVE `pipeline_run_artefacts.read_when:` fields | Single-file edit |

## `/docscore` rule-set (Phase 10 — integration into the command)

### Universal rules (apply to ALL `.claude/` + `specs/` + `plans/` docs)

| ID | Rule | Detection | Score |
|---|---|---|---|
| **U1** | Line cap ≤200 unless `scope: reference` | `wc -l` | Full <200; partial 200-300; zero >300 |
| **U2** | Tables over prose for parallel-item lists | Detect bullet sections with ≥3 parallel items + prose paragraphs | Score deducted per detection |
| **U3** | YAML frontmatter present | First lines match `^---` … `^---` | Required for: handoff, next-session-prompt, state, plans/, specs/ |
| **U4** | No auto-gen inline content | Filename matches `*REFERENCE*` / `*AUTO*` / `*dump*` + tracked in git | Zero credit if tracked |
| **U5** | No dead relative-link refs | Every `[text](path)` resolves to existing file | Zero credit per broken link |
| **U6** | Recency window per doc-type | `last_updated` field within window: handoff <30d / next-session-prompt <14d / state <30d / plans <60d unless archived / specs <180d | Score scaled by age |
| **U7** | No duplication of content from canonical home | Per-doc audit flag | Manual or fuzzy-match |
| **U8** | Single source of truth | If a section restates a spec / DB row / commit message — link instead of restate | Manual audit flag |

### Doc-type-specific rules

| Doc-type | Match pattern | Rules |
|---|---|---|
| `CLAUDE.md` | exact filename | <100 lines, manifest-only (table-driven), NO inline binding rules, NO inline shipping notes, NO gitignored paths in canonical table |
| `state.md` | `.claude/state.md` | Auto-regen by `/handoff`; required fields: `current_phase`, `current_subphase`, `last_updated`, `latest_commit`, `working_tree`, `blockers` |
| `handoff.md` | `.claude/handoff.md` | Date in heading. TL;DR ≤5 lines. Sections: "Completed this session", "Current state", "Captured lessons", "Files modified", "Next priorities", "Next Session Prompt" |
| `next-session-prompt.md` | `.claude/next-session-prompt*.md` | Reading list with cite-line discipline. Tool bindings table. Per-step time estimates. Pre-Step-N baseline numbers. First-action ≤5 lines |
| `mistakes.md` | `.claude/mistakes.md` | Keyword-stub format per entry. Max 30 active. Body in blub.db `learnings`. ACTIVE-header pointer to archive |
| `decisions.md` | `.claude/decisions.md` | D-id + 1-line title + date + status (active/superseded/contradicted). Detail ≤3 lines OR pointer to commit SHA. Max 50 active. No restating other canonical sources |
| `parking.md` | `.claude/parking.md` | OPEN entries only. Resolved → archive with completion date. Each open entry: P-KEY + 1-line summary + 3-line context + status + re-open trigger |
| `specs/*.md` (numbered) | `specs/[0-9][0-9]-*.md` | Frontmatter with `status` + `spec_version` + `last_verified`. Locked + versioned. Section numbering present. |
| `specs/*.md` (non-numbered) | non-`[0-9]*.md` in specs/ | NOT a spec — rehome to `plans/` or `reports/`. Flag for relocation |
| `plans/*.md` (active) | `plans/*.md` not in `plans/archive/` | Date-stamped filename. `status: active`. In docs-registry.yaml `canonical_docs` |
| `plans/archive/*.md` | `plans/archive/*.md` | No further edits expected. Date in filename. Read-only marker in frontmatter |
| `cloning-pipeline-flow.md` | exact | Stage-index table at top. Per-stage detail follows. Coordinate with `drift-check-dispatcher.py` |
| `architecture.md` | exact | Part A only (system design + key decisions). Inventories → DB query. Dev setup → `.claude/dev-setup.md` |
| Auto-gen (`*REFERENCE.md`, etc.) | filename match | NOT tracked in git. Query DB on demand |
| Archive (`memory/*`, `plans/archive/*`) | path match | Date in filename or frontmatter. Read-only |

### Cross-doc rules

| ID | Rule | Detection |
|---|---|---|
| **X1** | Every `docs-registry.yaml` entry resolves to existing file at stated path | `for p in registry.canonical_docs: assert Path(p).exists()` |
| **X2** | Every relative link resolves (run across ALL .claude/ + specs/) | Markdown link extraction + file-exists check |
| **X3** | `subprojects.md` reference in CLAUDE.md matches file existence | grep + Path.exists |
| **X4** | Single owner per content (registry's `sot_for` field is authoritative) | Detect overlap via fuzzy content match |
| **X5** | MEMORY.md auto-load size | `wc -c ~/.claude/projects/.../memory/MEMORY.md ≤ 24576` |

### Output format `/docscore` should produce

For each scanned doc:
```
[doc-name] score: NN/100
  U1 (line cap): PASS/FAIL — N lines
  U2 (table-over-prose): PASS/FAIL — N detected sections
  ...
  Doc-type rules ([type]):
    [rule]: PASS/FAIL — reason
  Remediation: [ordered list of fixes]
```

Plus aggregate:
```
Total docs scanned: N
Passing all rules: N
Failing one or more: N
Highest-impact remediations (top 5): ...
```

## Tool bindings (mandatory)

| Tool | When |
|---|---|
| `/qc-council` | BEFORE every commit touching multiple files atomically (blub.db row 255) |
| `/qc-inline` | Single-file checks during implementation |
| `/capture-lesson` | 3 new lessons surfaced this session (see handoff-doc-op.md) |
| `/handoff` | After Phase 10 closes — generate fresh handoff + next-session-prompt for resuming BEM Step 1.7 G3 |
| `python ~/.claude/hooks/wp-blocks.py dump` | If any spec-level claim is made about DB schema |

## Phase 10 success criteria

- [ ] `/docscore` runs on the 13 `.claude/` root docs + 25 numbered specs + 7 plans + scores each per rule-set
- [ ] Total score across the project improves vs baseline (run `/docscore` BEFORE Phase 1 starts; capture as `pre-optimisation-score.json`; run AFTER Phase 9 closes; compare)
- [ ] All 6 universal rules + every doc-type-specific rule has executable detection logic
- [ ] Cross-doc rule X5 (MEMORY.md size) is checked automatically and surfaced as critical-priority remediation if it ever exceeds 24576 bytes

## After Phase 10 closes

Run `/handoff` to generate a fresh `handoff.md` + `next-session-prompt.md` for **Step 1.7 G3** (the BEM-canonical work that was deferred behind this doc work). The doc-op session's `handoff-doc-op.md` + `next-session-prompt-doc-op.md` can then be archived to `memory/` since the work they describe is complete.

## First action

After reading `handoff-doc-op.md` + verifying the MEMORY.md size via `wc -c`, start with Phase 1 (F2 MEMORY.md compression). It's 10 minutes; recovers ~15-20 silently-dropped binding rules; zero risk. Highest impact-per-minute in the entire plan.
