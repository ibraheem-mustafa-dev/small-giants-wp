Invoke /autopilot before doing anything else.

# Indus delivery, Session R (refresh and header close)

Context: every build session (A, B, C, D1, D2, G) is closed. This session takes the last refresh-loop pass for everything after their passes, re-runs the intake on the Indus draft to catch anything the builds changed, and closes the header slice through the gate chain G0 to G7 with Bean's eye.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. The last refresh-loop pass (reseed, deploy to indus-test, mirror refresh, recalibrate; about 20 min machine), after `ListAgents`.
2. The intake delta re-run (about 20 min machine): mark its review rows. FR-48-34's timer-opened state is checked on it.
3. The header through G0 to G7 (Session G's chain), then cropped pairs at 375, 768, 1023, 1024, 1199, 1200, 1259, 1260 and 1440 for Bean's eye (about 15 min of his time).

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/sgs-clone`, `/wp-sgs-deploy`, `/sgs-update`, `/visual-qa`.

## Tools
| Tool | Use it for |
|---|---|
| `/sgs-db`, `python ~/.claude/hooks/wp-blocks.py` (`schema`, `attrs`) | what a block's settings are and do, before claiming anything is missing or built (framework DB, read-only) |
| `node scripts/computed-route/capabilities.mjs --like <id>` / `--drafts` / `--gate` | worked examples for a gap, the open gap list, the coverage gate |
| `node scripts/computed-route/delivery-map.mjs indus-foods --check` / `--status` | the tracking file: flip each key you finish to `{ "done": "<commit>", "unit": "<unit>" }` or `{ "accepted": "<reason>", "unit": "<unit>" }` |
| `node scripts/computed-route/tools/mutate.mjs <route dir> <mutations.json> <test file>` | proving each MUST FAIL test turns red when its code is broken |
| Playwright MCP / Chrome DevTools MCP | live DOM and computed styles at 375/768/1440, and draft-and-live pairs (one browser at a time) |
| `ListAgents` + `SendMessage` | the serial queue before any build, deploy, reseed or calibration |

## Done when
Gate G-R in the plan: the header passes G0 to G7 and Bean's eye; the delta re-run's review rows marked.

Estimate: 30 min agent time plus about 40 min machine.

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
