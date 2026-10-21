Invoke /autopilot before doing anything else.

# Indus delivery, Session E (trees and accessibility)

Context: every Indus mechanism is built. This session builds every remaining surface on indus-test through skeleton, Fill and build (footer, drawer, 4 mega menus, 23 page routes, the 6 blog posts and their single-post template, the form host pages), and repairs the accessibility the clone must not copy from the draft.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. Before any build onto indus-test: a `mysqldump` backup (`.claude/dev-setup.md`). Trees build only into the ids the page map holds.
2. U15: FR-48-51 (button presets) and FR-48-14 (one parent write over a loop body) as their own first commits with tests; then every row of `sites/indus-foods/build/page-map.json` (23 pages, 6 posts, 4 forms), every surface in `sites/indus-foods/build/surfaces.json` and the single-post template. Send surface builds to the `wp-sgs-developer` agent or Sonnet subagents one at a time (one browser and one build at a time on the site).
3. U17: its row in the plan, checked with axe and a keyboard walk at 375/768/1440. The drawer's scroll lock and the slider's dot labels come from U14: verify them, never rebuild.

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/sgs-clone`, `/a11y-audit`, `/visual-qa`; the `wp-sgs-developer` agent for builds; `scripts/wp-build-page.js --dry-run` before each build.

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
The U15 and U17 done-whens in the plan; every U15 delivery-map key done or accepted.

Estimate: 2 h 30 agent time plus machine time.

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
