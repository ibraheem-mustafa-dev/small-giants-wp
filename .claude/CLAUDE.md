# small-giants-wp — `.claude/` working area

**Authoritative project rules:** see [`../CLAUDE.md`](../CLAUDE.md). This file is the manifest for the working area.

## Canonical structure

| Slot | Path | What |
|------|------|------|
| Project rules | `../CLAUDE.md` | Hard rules, deploy commands, gotchas |
| Architecture | `architecture.md` | System design + key decisions (Part A only) |
| Dev setup | `dev-setup.md` | Build / deploy / SSH / local environment |
| Goals | `goals.md` | Active goals + exit criteria |
| Living status | `LEDGER.md` | THE one status doc (plain-English top + live status + product queue + pointers). Replace-not-append; kept under 24576 bytes — `handoff-preflight.py --check` refuses a handoff above it |
| Structural defences | `STOP-CATALOGUE.md` | UNCAPPED STOP catalogue + pre-flight ritual (never drop a defence; carry-forward count-check every `/handoff`) |
| Mistakes | `mistakes.md` | Recurring-lesson log — each entry carries its rule inline; ~30 active, oldest pruned to `memory/mistakes-archive.md` |
| Decisions | `decisions.md` | D-numbered architectural log, compressed; entries tagged `[INCIDENT]`/`[ROUTINE]` |
| Parking | `parking.md` | OPEN deferred work, 6 taxonomy buckets, `**Status:**` field |
| Prior sessions | `memory/session-*.md` + `memory/state-archive.md` | Full narrative + swept history (LEDGER points here) |
| Specs | `specs/` | **Canonical index = [`specs/README.md`](specs/README.md) — the ONE roster, including the DEAD-never-cite list. Never cache a roster in this cell; point at the README.** |
| Active plans | `plans/` | `/strategic-plan` + `/phase-planner` outputs |
| Strategy docs | `plans/strategy/` | Cross-cutting strategy docs |
| Archived plans | `plans/archive/` | Completed plans |
| Verify | `verify/` | Per-phase verification criteria |
| Reports | `reports/` | Generated audit / QC / lifecycle reports |
| Scratch | `scratch/` | Ephemeral working notes |
| Memory | `memory/` | Archived handoffs + consolidation receipts + per-doc archive overflow |

## Authoritative pointers

**Pointers only — a summary sentence here is a copy that drifts. Every line names a file; the file owns the content.**

| For | Read |
|---|---|
| Cloning pipeline (spec, stage index, binding rules R-31-1..15, run artefacts) | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Live status / current front | `LEDGER.md` |
| Doc-op canonical templates | `~/.agents/skills/shared-references/doc-templates/` |
| Doc correctness check (on demand, not per handoff) | `/doc-audit` |

*(There is no doc registry, and none should be created — a separate roster file drifts against `specs/README.md`. Credentials live in `dev-setup.md`; the pipeline run-artefact inventory in Spec 31 Appendix C.)*

## Conventions

- Doc shapes per template in `~/.agents/skills/shared-references/doc-templates/`
- `/handoff` runs the slug-uniqueness gate on parking.md + reconciles the living docs (no registry walk; doc-correctness = on-demand `/doc-audit`)
- **Retention:** `scratch/` ages out after 30 days or promotes to `reports/`; `reports/` is forever; `memory/` holds archived sessions + per-doc overflow. **`plans/archive/` holds plans that are DONE, and a living doc may cite one for implementation detail** — "this feature exists; how it was built is in `plans/archive/<file>`" is exactly what the folder is for, and such a citation is correct, not drift. What a living doc must never do is treat an archived plan as the source of live STATUS or open scope; that lives in `LEDGER.md`. When a plan moves to `archive/`, repoint its citations rather than deleting them. `specs/archive/` is git-blame-only.
- **parking.md = parked work ONLY:** entries are `OPEN | PARTIAL | BLOCKED | DEFERRED` only, in the syntax `**Status:** X`, under one of the six bucket sections. The moment a task is `CLOSED | RESOLVED | DROPPED | SUPERSEDED`, MOVE it to `memory/parking-archive.md` (verbatim + completion date). **An entry holds RESIDUAL SCOPE only — strip shipped clauses; that history lives in `decisions.md` and git.**
- **`python .claude/hooks/handoff-preflight.py --check` is the mechanical gate** for the rules above and below — LEDGER byte cap, STOP carry-forward, parking Status conformance, parking archive-on-resolve, tombstones at live paths, dangling links. It must pass before a handoff completes — a prose-only rule is enforced nowhere. `--self-test` proves each check can still fail. Same archive-on-resolve discipline for `decisions.md` → `memory/decisions-archive.md` (retired/superseded/non-load-bearing) and `MEMORY.md` ≤ 24,576 bytes → `MEMORY-archive.md`. This is what prevents a doc ballooning past its cap and silently dropping the rules below the cut.
- `decisions.md`'s size is self-healing via the Stop hook `decisions-sweep-auto.py`; do not treat its size as a violation.
- Recent decisions: read `decisions.md` head (most-recent-first; D-ceiling verified via `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` — **anchor on the heading**. An unanchored `grep -oE 'D[0-9]+'` matches any `D` followed by digits anywhere in the file, including hex colours, and reports a wildly wrong ceiling with full confidence). **Live status (D-ceiling, current front, what's shipped vs open) is single-sourced to `.claude/LEDGER.md` — do NOT cache a D-summary here; it drifts.**