# `.claude/` working area

One home per job:

| Job | Home |
|---|---|
| Current status, what's next, parked work | `LEDGER.md` — replaced each handoff, never appended, ≤ 24,576 bytes |
| What the system must do | `specs/` — roster and dead-never-cite list in [`specs/README.md`](specs/README.md) |
| How a piece of work will be done, and anything deferred from it | `plans/` (finished plans in `plans/archive/`) |
| Rules | `../CLAUDE.md`, plus path-scoped `rules/*.md` |
| Lessons | Claude Code auto memory (its `MEMORY.md` index loads every session) |
| Build, deploy, SSH, generated catalogues | `dev-setup.md` |
| System design | `architecture.md` |
| Why something was decided | the doc it changed, and the commit message |
| History | git |

`archive/` holds frozen, read-only files: `archive/decisions.md` (look up an old `D<N>` citation) and `archive/parking.md`. Never write to them.

`/handoff` updates `LEDGER.md` and every plan, spec and doc the session touched, then runs `python .claude/hooks/handoff-preflight.py --check`.
