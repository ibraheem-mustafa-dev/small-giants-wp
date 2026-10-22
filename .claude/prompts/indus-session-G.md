Invoke /autopilot before doing anything else.

# Indus delivery, Session G (gate machinery)

Context: the Indus Foods clone's closing gates (Spec 48 §14: the gate chain G0 to G7, the gap ledger `gaps.json` with Bean's accepted differences, the kill line, the sample rows) and the route's remaining checks. This is code-only work with no site, DB write or secret dependency. Runs beside every build session from the start. It may take two sittings; the second starts from the first's handoff prompt.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. U2c (spec truth and the inventory scanner, about 30 min): its full row in the plan: the stale Status lines, the scanner skipping the Spec 48A runtime files, and the reduced-motion-only `@media` and pseudo-element ids covered by SGS's own reduced-motion handling. Its 4 delivery-map keys go done.
2. U2b (intake safety, about 20 min): two MUST FAIL tests in `scripts/computed-route/tests/intake-review.test.mjs`. Code-only, so it may run as a cloud session (`/delegate` with `--code-only`).
3. U16 (gate machinery, the rest of the session): each FR in its row, each with its own MUST FAIL test, in this order: FR-48-41 (Session R's header close needs it; FR-48-50, the breakpoint rule, is the handoff readers plan's wave 3), FR-48-36's rendered-live half, FR-48-64 (the chain), FR-48-65, FR-48-66 (`gaps.json` with an `accepted` list, each entry naming the rule it breaks), FR-48-67, FR-48-69, FR-48-22, FR-48-71, FR-48-20's code-to-code check, FR-48-11's walker half. Send independent FRs to Sonnet subagents in worktrees (at most three at once) and read every diff in the main thread before merging.

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/requesting-code-review` once at the end over the session's diff.

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
Gate G-G in the plan: every U16, U2b and U2c done-when met with MUST FAIL tests mutation-red, `capabilities.mjs --gate` exit 0, and the full route suite green in the main checkout; no refresh-loop pass (code only). Each Spec 48 FR's Status line updated once, in the closing commit. Every delivery-map key your units own is flipped (done with its commit, or accepted naming the rule it breaks), and your planted-draft test `scripts/computed-route/tests/<session>-planted-draft.test.mjs` raises its gaps again with one write ref nulled.

Estimate: 2 to 3 h agent time over one or two sittings.

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
