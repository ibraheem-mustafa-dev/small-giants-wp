# small-giants-wp — `.claude/` working area

**Authoritative project rules:** see [`../CLAUDE.md`](../CLAUDE.md). This file is the manifest for the working area.

## Canonical structure

| Slot | Path | What |
|------|------|------|
| Project rules | `../CLAUDE.md` | Hard rules, deploy commands, gotchas |
| Architecture | `architecture.md` | System design + key decisions (Part A only) |
| Dev setup | `dev-setup.md` | Build / deploy / SSH / local environment |
| Goals | `goals.md` | Active goals + exit criteria |
| Living status | `LEDGER.md` | THE one status doc (plain-English top + live status + product queue + pointers). Collapsed state.md + handoff.md + next-session-prompt.md (P4, 2026-07-17). Replace-not-append; `ledger-rotate.py` Stop hook snapshots to `memory/session-YYYY-MM-DD.md` past 24576 bytes |
| Structural defences | `STOP-CATALOGUE.md` | UNCAPPED STOP catalogue + pre-flight ritual (D101 — never drop a defence; carry-forward count-check every `/handoff`) |
| Mistakes | `mistakes.md` | Keyword-stub index — full body in blub.db + memory/feedback_*.md |
| Decisions | `decisions.md` | D-numbered architectural log, compressed; entries tagged `[INCIDENT]`/`[ROUTINE]` (P4) |
| Parking | `parking.md` | OPEN deferred work, 6 taxonomy buckets, `**Status:**` field |
| Prior sessions | `memory/session-*.md` + `memory/state-archive.md` | Full narrative + swept history (LEDGER points here) |
| Specs | `specs/` | **Canonical index = [`specs/README.md`](specs/README.md) — the ONE roster, including the DEAD-never-cite list. Never cache a roster here: this cell drifted twice (2026-07-15 snapshot was 3 specs wrong by 2026-07-27) and was cut to a pointer 2026-07-28.** |
| Active plans | `plans/` | `/strategic-plan` + `/phase-planner` outputs |
| Strategy docs | `plans/strategy/` | Cross-cutting strategy docs |
| Archived plans | `plans/archive/` | Completed / superseded / legacy plans |
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

*(No doc registry: `docs-registry.yaml` was DISSOLVED 2026-07-28 — a fourth roster that listed deleted specs as live and omitted the newest three. Credentials rehomed to `dev-setup.md`; pipeline run-artefact inventory to Spec 31 Appendix C.)*

## Conventions

- Doc shapes per template in `~/.agents/skills/shared-references/doc-templates/`
- `/handoff` runs the slug-uniqueness gate on parking.md + reconciles the living docs (no registry walk; doc-correctness = on-demand `/doc-audit`)
- **Retention:** `scratch/` ages out after 30 days or promotes to `reports/`; `reports/` is forever; `memory/` holds archived sessions + per-doc overflow. `plans/archive/` + `specs/archive/` are git-blame-only — never referenced from a living doc.
- **parking.md = parked work ONLY (Bean-locked 2026-06-02, D150):** entries are `OPEN | PARTIAL | BLOCKED | DEFERRED` only, in the syntax `**Status:** X`, under one of the six bucket sections. The moment a task is `CLOSED | RESOLVED | DROPPED | SUPERSEDED`, MOVE it to `memory/parking-archive.md` (verbatim + completion date). **An entry holds RESIDUAL SCOPE only — strip shipped clauses; that history lives in `decisions.md` and git.** Normalised 2026-07-29 (296KB → 125KB).
- **`python .claude/hooks/handoff-preflight.py --check` is the mechanical gate** for the rules above and below — LEDGER byte cap, D101 STOP carry-forward, parking Status conformance, parking archive-on-resolve, tombstones at live paths, dangling links. It must pass before a handoff completes. Built 2026-07-29 because these rules had been asserted as "enforced every /handoff" while being enforced nowhere: the LEDGER reached 38,799 bytes against a prose-only 24,576 cap, and a 2026-05-09 tombstone sat at the repo root being copied to OpenClaw under a passing gate. `--self-test` proves each check can still fail. Same archive-on-resolve discipline for `decisions.md` → `memory/decisions-archive.md` (retired/superseded/non-load-bearing) and `MEMORY.md` ≤ 24,576 bytes → `MEMORY-archive.md`. Prevents the doc-balloon (parking hit 1,400+ lines; MEMORY 34KB, silently dropping autoload rules).
- Recent decisions: read `decisions.md` head (most-recent-first; D-ceiling verified via `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`). **Live status (D-ceiling, current front, what's shipped vs open) is single-sourced to `.claude/LEDGER.md` — do NOT cache a D-summary here; it drifts (the D225 cache was 16 stale by 2026-06-23; a D254 cache was 4 stale by 2026-07-02).** STABLE (non-drifting) milestones only: cloning CSS-transfer foundation (Phase F) COMPLETE; the modular `converter/` engine is THE ONLY converter (frozen tree DELETED at D276, 2026-07-05 — SGS_NEW_ENGINE flag + fallback gone; STOP-28 satisfied by construction); Spec 30 (WooCommerce) COMPLETE (D220).
