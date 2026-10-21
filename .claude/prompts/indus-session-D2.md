Invoke /autopilot before doing anything else.

# Indus delivery, Session D2 (behaviour)

Context: the Indus Foods clone's behaviours mapped onto existing SGS settings (FR-48-80): the testimonial slider, accordions, the blog filter, the header shadow, opening hours, the drawer motions, the route fade and the layout-property hovers. Then the setting meanings (an `sgs.meaning` object per attribute in `block.json`, seeded into the DB). Last in the refresh-loop order. Runs beside D1 and G.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. U14 (the behaviour recogniser): its row in the plan. Builds inside it: the page transition's custom duration and easing beside its style presets, always winning (Ruling 5); the opening-hours dot pulse and today's row highlight; the accordion's scroll to the opened section (J-20). Everything else maps to existing settings. A block behaviour the draft lacks is switched off where a setting allows, or else recorded as an accepted difference. Hovers that darken are cloned as drawn (Ruling 7). For each open U14 key (`delivery-map.mjs indus-foods --status`): `capabilities.mjs --like` for a worked example; done when the built tree holds the record's values and the live probe confirms them, else accepted naming the rule it breaks. Send batches of keys to a Sonnet subagent with that rule; judge its results in the main thread.
2. U11 (setting meanings), once Session D1's `scripts/computed-route/data/effect-settings.json` is pushed: append U14's settings to it, then build the detector `plugins/sgs-blocks/scripts/check-setting-meanings.py` (it does not exist yet; `--check` fails on a listed setting with no `sgs.meaning`, with a MUST FAIL test), then the meanings, then a reseed from a clean `origin/main` worktree in this session's refresh-loop slot.
3. At the end: the refresh-loop pass after D1's.

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/sgs-wp-engine`, `/wp-interactivity-api` and `/wp-block-development` for the controls U14 builds; `/sgs-update` for the reseed; `/migration-method` for U11's detector.

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
Gate G-D2 in the plan; every U14 and U11 delivery-map key (163 at the start) done or accepted with reasons. Every delivery-map key your units own is flipped (done with its commit, or accepted naming the rule it breaks), and your planted-draft test `scripts/computed-route/tests/<session>-planted-draft.test.mjs` raises its gaps again with one write ref nulled.

Estimate: 1 h 45 agent time plus the refresh-loop pass.

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
