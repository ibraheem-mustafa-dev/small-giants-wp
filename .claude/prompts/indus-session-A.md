Invoke /autopilot before doing anything else.

# Indus delivery, Session A (opener)

Context: the Indus Foods clone (the client draft in `sites/indus-foods/handoff/`, built on the test site indus-test) is being finished under one plan. This session opens it: it archives the two plans the new one replaced, and closes the declared-values work (Fill writing every value the draft's code declares, with a confirm record per value) and the drawer's safe-area value. Runs beside Sessions G, B and C.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. Step 0 (the plan's "Step 0" section, 5 min, inline): archive the two old plans, repoint links until the plan's `git grep` lists only archive files, and merge LEDGER's Front M and the Indus front into one front pointing at the plan.
2. U0 (5 min, inline): confirm its done-when still holds after `git pull` (the header tree path the plan names). Its 10 delivery-map keys stay open: Session R flips them after the header's gate chain and Bean's eye.
3. U2 (declared values close): follow `.claude/prompts/Declared-values-final-session-prompt.md` tasks 2 to 4. Delegate the fill and calibration runs to one Sonnet operator subagent (serial: one calibration and one browser at a time) and judge its results in the main thread against `fill-report.json`. Bean reviews step 6's surface proof (about 20 min): show him the cropped pairs and the confirm record's disagreements. Mark the 22 open U2 delivery-map keys done as their entries become covered. Delete the declared-values prompt file when its tasks are done.
4. U4b (safe-area, about 15 min, inline or one Sonnet subagent in a worktree): its done-when in the plan.

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/sgs-clone` for the Fill and calibration runs; `/sgs-wp-engine` for block questions.

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
Gate G-A in the plan: the U2 and U4b done-whens met, `capabilities.mjs --gate` and `delivery-map.mjs indus-foods --check` exit 0, the full route suite green in the main checkout; a refresh-loop pass only if this session changed framework code (then ahead of B's). Every delivery-map key your units own is flipped (done with its commit, or accepted naming the rule it breaks), and your planted-draft test `scripts/computed-route/tests/<session>-planted-draft.test.mjs` raises its gaps again with one write ref nulled.

Estimate: 1 h agent time plus about 45 min machine.

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
