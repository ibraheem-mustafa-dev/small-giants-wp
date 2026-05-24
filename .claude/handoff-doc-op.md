# Session Handoff — 2026-05-24 (Doc-Optimisation Council)

**This is a SECONDARY handoff** for the doc-optimisation work surfaced this session. The primary session handoff (`handoff.md`) remains the BEM-canonical walker + Stage 4 wiring summary (commit `e3cd1a04`). The doc-optimisation work is the NEXT session's priority; the BEM Step 1.7 G3 work is deferred behind it.

## TL;DR (read this first)

This session ran `/research-buddies` + 3-rater `/qc-council` on `.claude/` + `specs/` + `plans/`. Council verdict: **REVISE-WITH-FIXES** on substantive phases A/B/C/D (E PROCEED conditional). **Phase F** surfaced 6 missed optimisations, **2 CRITICAL**:

- **F1: 4.4 GB stale worktrees + branch-safety check** (Phase A's framing was incomplete)
- **F2: MEMORY.md at 32.8 KB exceeds 24.4 KB autoload cap → ~15–20 binding rules silently NOT loading per session** (functional safety bug, not just bloat)

Plus Bean's 5 refinements override the original archive strategy: **active prune > age-cutoff archive**; mistakes.md → keyword stubs + blub.db row refs; parking → completed entries to archive doc with completion date; decisions audit (relevance + canonical-home check + delete contradicted); quickstart → archive.

No code/doc edits shipped this session. Output = this handoff + `next-session-prompt-doc-op.md` + `/docscore` rule-set (in the next-session-prompt).

## Council scores

- **The Nerd** (Karpathy + community research): 82/100
- **The Practical One** (per-doc audit): 82/100
- **Rater A — Ops Risk**: 82/100 (11 specific breakage gotchas found across phases)
- **Rater B — Information Architecture**: 82/100 (CLAUDE.md needs prose→table; Phase B needs ACTIVE-header; Phase D needs stage-index)
- **Rater C — Missed-optimisation**: 88/100 (6 Phase F items surfaced; 2 critical)

## Bean's 5 refinements (these OVERRIDE the original archive strategy)

1. **Active prune > weekly age-cutoff archive.** Don't auto-archive after N days. Actively human-review each entry: is it still useful? Prune what isn't; keep what is regardless of age.
2. **Mistakes.md → keyword stubs + blub.db row refs.** `/capture-lesson` already writes to 3 locations (workspace lesson file + CC auto-memory feedback file + blub.db `learnings` table). blub.db row IS the canonical full text. So `mistakes.md` should be keyword index per entry — searchable keywords + reference to blub.db row N for further reading. Full body removed.
3. **Parking → completion-date archive.** Resolved entries move to `memory/parking-archive.md` (or similar) with completion date. Active `parking.md` only contains OPEN entries — no append-forever.
4. **Decisions audit.** Per-entry review: (a) still relevant? (b) optimally written? (c) is the content canonically housed elsewhere already? (e.g. "attribute suffixes in DB" entry — already in `block_attributes` table + Spec 16 §12.4 — DELETE from decisions). Old + irrelevant → `memory/decisions-archive.md`. Wrong / contradicted by newer decision → DELETE.
5. **Archive quickstart.md.** Hasn't been updated in ages.

## Council's 11 breakage gotchas (must be embedded in execution plan)

1. **Phase A**: `git rm --cached 02-SGS-BLOCKS-REFERENCE.md` MUST add it to `.gitignore` in same op or it re-tracks. (gitignore lines for worktrees + scratch already exist — don't duplicate.)
2. **Phase B**: Each trimmed file needs a 2-line ACTIVE-header pointer to its archive (`<!-- ACTIVE — last N entries. Archive: memory/X.md. Search history: grep -r KEYWORD memory/ -->`).
3. **Phase C**: `specs/06-BUILD-ORDER.md` + `specs/10-COMPETITOR-RESEARCH.md` + `specs/README.md` have relative links to `09-GOLD-STANDARD-AUDIT.md` — must update before/with the move.
4. **Phase C**: `~/.claude/commands/dev.md:37` has hard-coded path to `2026-04-16-local-code-review-architecture.md` — update before the move.
5. **Phase C**: `09-GOLD-STANDARD-AUDIT.md` is marked `active` in `specs/README.md` with a TODO — recommend `reports/reference/` not plain `reports/`.
6. **Phase C**: Confirm `specs/README.md` row for `RESEARCH-PROMPT.md` before deletion.
7. **Phase D**: `cloning-pipeline-flow.md` split MUST coordinate with `drift-check-dispatcher.py` hook (hard-codes path + reads specific section headings). Split + hook update in same commit.
8. **Phase D**: `pipeline-state-debug-artefacts-inventory.md` rename to `specs/21-PIPELINE-STATE-ARTEFACTS.md` — ATOMIC across 8 reference sites (registry + next-session-prompt + strategic-plan + all 4 phase plans + drift-check-dispatcher.py).
9. **Phase D**: `quickstart.md` move/archive — `.claude/CLAUDE.md:34` references it; update in same commit.
10. **Phase D**: `architecture.md` Part C → new `.claude/dev-setup.md`, NOT into root CLAUDE.md (root already large).
11. **Phase D**: `docs-registry.yaml` slim — PRESERVE `pipeline_run_artefacts.read_when:` fields (functional diagnostic instructions, not narrative decoration).

## Phase F (Rater C's 6 missed items)

| # | What | Effort | Risk |
|---|---|---|---|
| F1 | Worktree FORCE-removal with branch-safety check for 21 locked worktrees (recover 4.4 GB) | 10 min | Low |
| F2 | MEMORY.md compression to one-line entries (fixes silent rule-dropout) | 10 min | Zero |
| F3 | Delete 7 stale next-session-prompt files from `.claude/memory/` (2026-05-01 → 2026-05-17) | 2 min | Zero |
| F4 | Add retention policy to `docs-registry.yaml` for `memory/` (30-day TTL on next-session-prompt; 60-day TTL on handoff; permanent otherwise) | 5 min | Zero |
| F5 | Fix broken `subprojects.md` ref in `.claude/CLAUDE.md:34` — create file OR remove pointer | 3 min | Zero |
| F6 | Strip 23-line comment block at top of `docs-registry.yaml` → 3-line header | 2 min | Zero |

## Lessons surfaced this session (worth /capture-lesson on next run)

1. **Doc-optimisation requires audit + active prune, not just age-cutoff archive.** Old entries can still be USEFUL; new entries can be JUNK. Active human-style review separates the two.
2. **Append-only docs WITH canonical SoT elsewhere should be keyword stubs not full text.** `mistakes.md` re-states what's in blub.db `learnings`. Cut to keywords + row ref. Saves tokens; preserves searchability.
3. **MEMORY.md silent dropout = functional safety bug.** Index file exceeding 24.4 KB autoload cap means bottom-loaded rules don't enforce. Detect via `wc -c MEMORY.md` ≤ 24576.

## Files modified this session

**None.** Research + council + plan only. Deliverables = this handoff + `next-session-prompt-doc-op.md`.

## Next priorities (in order)

1. **Execute doc-optimisation plan** per `next-session-prompt-doc-op.md`. ~5 hours, 10 phases (F2 first → F1 → A' → small fixes → B' → F4 → C' → D' → E' → G `/docscore` rule integration).
2. **AFTER doc-optimisation closes**: resume the deferred BEM-canonical Step 1.7 G3 slot_list visual extension. Original next-session-prompt for that work is in `.claude/next-session-prompt.md` (current file, preserved from commit `8e5fa206`).

## Next Session Prompt

See `.claude/next-session-prompt-doc-op.md`.
