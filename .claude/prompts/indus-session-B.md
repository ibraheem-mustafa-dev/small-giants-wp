Invoke /autopilot before doing anything else.

# Indus delivery, Session B (content)

Context: the Indus Foods clone's content writers: images and maps, icons, links and the remaining styling. This session goes first in the refresh-loop order (reseed, deploy to indus-test, mirror refresh, recalibrate). Its first commit splits `scripts/computed-route/lib/fill-resolve.mjs` (413 lines), because Session D1 waits on that split. Runs beside A, C and G.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. U5's first commit: split `lib/fill-resolve.mjs` under 400 lines by responsibility (every consumer's import updated, the README listing updated, the route suite green). Push it straight away and message Session D1 if it is running.
2. U5 (images and maps), U6 (icons), U7 (links), U8 (styling): each row in the plan. U8 writes to what exists (conditional visibility, the theme scrollbar tokens, the logo's mobile size) and builds only the `::selection` colour. Mechanical writers can go to Sonnet subagents in worktrees. The map display controls (height per device, zoom, a filter with a custom value) are a framework change on `sgs/business-info` (confirm with `/sgs-db`): build them with an inspector control and a render, per CLAUDE.md, and clone the draft's whole filter including `contrast(1.05)`.
3. At the end: batch the framework edits into one refresh-loop pass, after `ListAgents` and a message to each busy peer.

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/wp-block-development` and `/sgs-wp-engine` when U5 adds the map controls; `/wp-sgs-deploy` for the deploy in the refresh loop.

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
Gate G-B in the plan, including a cropped draft-and-live pair for both Indus maps at 375/768/1440. Every delivery-map key your units own is flipped (done with its commit, or accepted naming the rule it breaks), and your planted-draft test `scripts/computed-route/tests/<session>-planted-draft.test.mjs` raises its gaps again with one write ref nulled.

Estimate: 1 h 15 agent time plus the refresh-loop pass (about 20 min machine).

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
