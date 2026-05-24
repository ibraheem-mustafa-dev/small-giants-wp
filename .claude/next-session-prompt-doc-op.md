---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-25-doc-op-phase-6-onwards
generated: 2026-05-24
parent_session: small-giants-wp-2026-05-24-doc-op-execution
primary_goal: "Finish the doc-optimisation programme: Phases 6, 7, 9, 10, 12, 13 (active prune + retention policy + spec relocation + heavy-doc restructure + registry sync + /docscore rule integration). Then resume the deferred BEM-canonical Step 1.7 G3 work via the standard next-session-prompt.md."
status: ready
---

# Next session (DOC-OP CONTINUATION) — Phases 6, 7, 9, 10, 12, 13

**Invoke `/autopilot` before anything else.**

## STOP — READ THIS FIRST

Read in order:
1. `.claude/handoff-doc-op.md` — 2026-05-24 EXECUTION session close (12 commits, ~5 GB recovered, cc sweep done, Tasks I + H + Phases 1-5 done).
2. The 5 binding rules captured this session:
   - `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_active_prune_over_age_cutoff_archive.md`
   - `~/.claude/projects/.../feedback_mistakes_md_as_keyword_stubs.md`
   - `~/.claude/projects/.../feedback_memory_md_silent_dropout_safety_bug.md`
   - `~/.claude/projects/.../feedback_shipped_claims_need_grep_verify.md`
   - `~/.claude/projects/.../feedback_data_migration_needs_read_path_port.md`
3. The 6 binding rules from `.claude/next-session-prompt.md` STOP section — they still apply.
4. `~/.claude/projects/.../memory/MEMORY.md` — verify still under 24,576 bytes (was 22,581 at session close).

**Reading discipline:** cite line numbers when summarising back. Wait for Bean's go-ahead before any commit work.

## What's already done (this session, 2026-05-24)

12 commits to main: `a252fb75` → `9b1cd251`. Plus 1 to user `~/.claude` repo.

| Phase | Status |
|---|---|
| Phase 1 (F2) — MEMORY.md compression | ✓ shipped (file at 22,581 bytes) |
| Phase 2 (F1) — Worktree removal | ✓ shipped (4.39 GB recovered) |
| Task I — block_compositions migration | ✓ shipped (D55) |
| Task H — Source DB retirement + 3 script ports + cache dirs | ✓ shipped (D56, 647 MB recovered) |
| Proposals A/B/C — cc reductions on Stage 4/5 + Mode B | ✓ shipped (commits 4c5aaa5c, 8127f880, c0fb9639) |
| Polish + Mode A/B collapse | ✓ shipped (1f299169) |
| Batches 1-5 cc sweep (8 functions) | ✓ shipped (10+ commits) |
| Phase 3 (A') — gitignore auto-gen reference | ✓ shipped (47bf8b1f) |
| Phase 4 (F5+F6+F3) — small fixes | ✓ shipped (9b1cd251) |
| Phase 5 (J) — 5 lessons captured | ✓ shipped (in user memory dir) |

## What's left (next session)

### Phase 6 (B') — Active prune of mistakes.md / decisions.md / parking.md

**This is the biggest judgement-load work remaining.** Per Bean's 5 refinements:

#### 6a — `mistakes.md` (keyword stubs + blub.db row refs)

Convert every entry's full body to:
```
### [YYYY-MM-DD] keyword-line summary
- **Pattern key:** `<key from blub.db>`
- **blub.db row:** `<N>`
- **Feedback file:** [name](~/.claude/projects/.../memory/feedback_X.md)
```

Target: 30 entries max in active. Older / less-load-bearing → `.claude/memory/mistakes-archive.md` (same format).

ACTIVE-header:
```
<!-- ACTIVE — last 30 entries (keyword stubs). Full body in blub.db `learnings` table or feedback_X.md files. Archive: memory/mistakes-archive.md. Search: grep -r KEYWORD memory/ + curl localhost:5050/api/learning?search=KEYWORD -->
```

#### 6b — `decisions.md` (audit + relevance-prune + canonical-home check)

Per-entry: is it still relevant? optimally written (≤3 lines + commit SHA)? canonically housed elsewhere?

Sort: KEEP active (relevant + not duplicated + ≤3 lines) / ARCHIVE to memory/decisions-archive.md (old + non-load-bearing) / DELETE (wrong / contradicted / restated-from-elsewhere).

Target: 50 active entries max. Each ≤3 lines + commit SHA pointer.

ACTIVE-header:
```
<!-- ACTIVE — last 50 decisions (compressed format). Older or non-load-bearing → memory/decisions-archive.md. Deleted entries listed in git log only. -->
```

#### 6c — `parking.md` (OPEN only + completion-date archive)

RESOLVED entries → memory/parking-archive.md with completion date in heading.
OPEN entries: review actionability; archive if implicitly resolved; delete if wrong/contradicted.

ACTIVE-header:
```
<!-- ACTIVE — open parking items only. Resolved entries → memory/parking-archive.md with completion date. -->
```

### Phase 7 (F4) — Retention policy in docs-registry.yaml

Add a `retention:` field convention to `docs-registry.yaml` for `memory/` destination:
- next-session-prompt files: 30-day TTL
- handoff files: 60-day TTL
- everything else: permanent

Document the cleanup script trigger (manual on /handoff, future auto).

### Phase 9 (C') — Relocate 11 misplaced specs + archive quickstart

BEFORE moving each file: grep for inbound references, update in same commit.

| Source | Destination | Pre-move grep |
|---|---|---|
| `specs/09-GOLD-STANDARD-AUDIT.md` | `reports/reference/` | specs/06-BUILD-ORDER.md + specs/10-COMPETITOR-RESEARCH.md + specs/README.md |
| `specs/10-COMPETITOR-RESEARCH.md` | `reports/` | specs/09-* cross-ref + specs/README.md |
| `specs/RESEARCH-PROMPT.md` | DELETE | specs/README.md row |
| `specs/2026-04-16-local-code-review-architecture.md` | `~/.claude/specs/` | `~/.claude/commands/dev.md:37` hard-coded path |
| `specs/2026-04-27-optimisation-toolkit-design.md` | `~/.claude/specs/` | (none) |
| `specs/2026-04-29-wp-studio-ai-manual.md` | `~/.claude/skills/` or DELETE if obsolete | `plans/master-plan/master-plan.md` |
| `specs/chrome-devtools-stage-8-integration.md` | `plans/strategy/` | (none) |
| `specs/cloning-skill-salvage-matrix-2026-05-05.md` | `plans/archive/` | (none) |
| `specs/pattern-dedup-classify-mechanics-2026-05-05.md` | `plans/archive/` | (none) |
| `specs/hostinger-mcp-catalogue.md` | `~/.claude/specs/` | (none) |
| `specs/legacy-2026-03-25-mobile-nav-attributes.md` | `plans/archive/` | (none) |
| `specs/legacy-2026-03-27-mobile-nav-v2-composition.md` | `plans/archive/` | (none) |
| `.claude/quickstart.md` | `memory/quickstart-archive.md` | `.claude/CLAUDE.md` line ~34 — Phase 10 D' rewrites this anyway |

### Phase 10 (D') — Atomic restructure of heavy docs

Split each heavy doc in atomic commits per the boundary table:

| Commit | Action |
|---|---|
| **D'-1** | `architecture.md` split → Part A (200 lines, stays) + Part B (354-feature audit → `plans/archive/2026-02-21-feature-audit.md`) + Part C (dev setup → NEW `.claude/dev-setup.md`) + registry entry update |
| **D'-2** | `cloning-pipeline-flow.md` split + `drift-check-dispatcher.py` hook update (hook hard-codes path + reads section headings — must coordinate). Overview gets stage-index table at top |
| **D'-3** | `pipeline-state-debug-artefacts-inventory.md` rename → `specs/21-PIPELINE-STATE-ARTEFACTS.md` + update 8 reference sites: `docs-registry.yaml` + `next-session-prompt.md` + `strategic-plan.md` + all 4 phase plans + `drift-check-dispatcher.py` |
| **D'-4** | `.claude/CLAUDE.md` Karpathy rewrite (~50 lines, manifest-only, prose→table) + update line ~34 quickstart reference (since quickstart moved in C') |
| **D'-5** | `plan.md` → 10-line stub + move closed content to `plans/archive/2026-05-21-architecture-programme.md` + update registry pointer |
| **D'-6** | `docs-registry.yaml` slim — strip `canonical_docs` narrative; PRESERVE `pipeline_run_artefacts.read_when:` fields |

### Phase 12 (E') — Registry sync + decision entry

Update `docs-registry.yaml` paths post-Phase-9 moves. Write doc-optimisation decision entry into `decisions.md` AFTER Phase 6 pruning (else it gets immediately pruned).

### Phase 13 (G) — `/docscore` rule-set integration

Update `~/.claude/commands/docscore.md` (or its skill equivalent) with the universal + doc-type-specific rules from the original next-session-prompt-doc-op.md (sections U1-U8 + doc-type table + X1-X5 cross-doc rules + output format). Command should output a per-doc score against the rule-set + a remediation list.

## Efficiency improvements — USE EXISTING SKILLS (corrected per Bean 2026-05-24)

Honest retrospective from the execution session: ~30-45 min of avoidable manual work + excess Sonnet tokens were burned by NOT using existing skills/commands. Use these from session start:

| Skill / command | When to use | What it replaces |
|---|---|---|
| **`/capture-lesson`** | Every lesson surfaced during the session | Manual Write + frontmatter + blub.db POST. Saves ~5 min/lesson; ensures all 3 persistence layers stay in sync |
| **`/handoff`** | Session close | Manual hand-writing of handoff.md + next-session-prompt.md. Auto-walks docs-registry.yaml for stale docs. Saves 10-15 min |
| **`/delegate`** | EVERY Agent dispatch | Manual sonnet/haiku picking. Returns cheapest model that will succeed per task shape; routes mechanical reviewers to Cerebras (zero-cost) or Gemini Flash |
| **`/qc-council`** | Multi-rater validation before any commit on pipeline code | Ad-hoc Agent-tool parallel reviewers. Has empirical pre/post measurement gates baked in + structured `qc_review` JSON outputs |
| **`/subagent-prompt`** | Every cold-prompt-shaped Agent dispatch | Hand-writing the 6-section prompt template inline. Faster + more consistent across dispatches |
| **`/search--local`** | Stage 1.5 of every task that builds/researches/evaluates (mandatory per autopilot) | I skipped this 100% of the time. Would have surfaced 2026-05-21 architecture-staging's shared-helper-pattern recommendations |
| **`local-search.py` hook** | Same as `/search--local` (the underlying impl) | Zero-cost local context preload. Autopilot mandates this; I never ran it |
| **`/dispatching-parallel-agents`** | Any parallel-Agent fanout (especially the 3-agent investigation pattern) | I ran the pattern manually 10+ times. Skill codifies it + handles failure cases |
| **`/diagnostics` (mcp__ide__getDiagnostics)** | Reading SonarLint cc warnings + parse errors | Waiting for IDE auto-scan + reading from system-reminder. Direct call eliminates round-trip latency |
| **`/cerebras`, `/gemini-flash`, `/gemini-pro`** | Mechanical reviewers + bulk processing | Routing everything to Sonnet/Haiku. Cerebras is zero-cost; perfect for "read this diff + answer 10 yes/no questions" reviewer slots |
| **`/research-check` / `/research-buddies`** | Any "best practice for X" question that came up mid-refactor | Inline guessing or web search. Returns multi-source answers with citations |
| **`/wp-blocks dump`** (via `wp-blocks.py`) | Schema enumeration before any "missing column/table" claim | Manual `python -c "import sqlite3..."` invocations. Binding rule #4 mandates the wp-blocks.py route |
| **`/qc-inline`** | Reviewing any artifact mid-conversation | Ad-hoc reading. I used this once for the agent proposals; should have used it on every batch's diff |

### Concrete use-by-phase

- **Phase 6 (active prune):** Use `/capture-lesson` for each behavioural lesson surfaced during the prune (e.g. "this entry was kept because of X reasoning"). Use `/delegate` to route the mechanical entry-classification subagents to Cerebras.
- **Phase 9 (spec relocation):** Use `/dispatching-parallel-agents` to fan out per-spec inbound-ref grep + same-commit-update. Use `/delegate` to route the mechanical grep-and-update branches to Haiku/Cerebras.
- **Phase 10 (heavy-doc restructure):** Use `/subagent-prompt` for the cold prompts (6 atomic commits = 6 cold prompts). Use `/qc-council` for the multi-rater review on the architecture.md split (high-risk doc).
- **Phase 13 (`/docscore` rules):** Use `/skill-writer` (already exists via `/lifecycle`) for the actual edit. Use `/qc-inline` on the rule-set after writing.
- **Session close:** Use `/handoff` — don't hand-write next-session-prompt again.

## Process discipline that worked

- **Cross-model 2-rater review (Sonnet + Haiku via Agent tool, parallel)** is sufficient for byte-equal-gate-confirmed refactors. Don't escalate to the 4-rater /qc panel for mechanical extractions; do escalate for new-logic introductions.
- **Baseline → implementer → smoke-test gate** caught zero regressions but kept everyone honest. Don't skip the baseline capture.
- **Shared-helper-first batching** (Pattern A from holistic investigation) — when N functions share a pattern, build the helper once, apply N times. Phases 6c (parking-entry conversion) and 9 (spec relocation) both have this shape; identify the shared template first.
- **Fix-non-blockers-before-commit** per Bean's 2026-05-24 rule. Reviewer concerns surfaced during /qc are NOT "future work" — they're commit-gate items.

## Tool bindings (mandatory)

| Tool | When |
|---|---|
| `/autopilot` | Session start — auto-loads + classifies subsequent messages |
| `/handoff` | After Phase 13 closes — generate fresh handoff trio for the next thing |
| `python ~/.claude/hooks/wp-blocks.py dump` | If any spec-level claim is made about DB schema |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` | If asked about DB row counts |
| Agent tool (parallel) | Cross-model review of any diff before commit on pipeline files |
| /qc-inline | Verify multi-rater proposals before subagent dispatch |
| /capture-lesson | Any genuinely surprising correction surfaced during the session |

## First action

After reading handoff-doc-op.md + verifying MEMORY.md size + reading the 5 new lessons:
- Decide whether to build the 4 efficiency-helper skills first (Bean's call — adds 30-45 min upfront but accelerates Phases 6 + 9 + 10).
- If skipping the helpers: start with Phase 7 (F4 retention policy, ~5 min, zero-risk) to warm up, then Phase 6c (parking.md OPEN-only conversion — the most tractable of the three prune sub-phases since it's mechanical).
- Phase 6a (mistakes.md → keyword stubs) is the highest judgement-load piece — do it when freshest, not as the last task of the session.

## After all phases close

Run `/handoff` to generate a fresh `handoff.md` + `next-session-prompt.md` for **Step 1.7 G3** (the BEM-canonical work that was deferred behind the doc-op programme). The handoff-doc-op.md + next-session-prompt-doc-op.md can be archived to `memory/` once the work they describe is complete.
