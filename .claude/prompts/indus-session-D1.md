Invoke /autopilot before doing anything else.

# Indus delivery, Session D1 (effects)

Context: the Indus Foods clone's script effects (magnet, sheen, ripple, tilt and glare, the image peek, parallax, scroll progress, floats, rings), recognised in the draft and written through the existing Spec 38A motion model (FR-48-77), plus the Heritage timeline, the image clip reveals and the logo and About hero SVG animation. Third in the refresh-loop order. Needs Session B's split of `lib/fill-resolve.mjs` pushed. Runs beside D2 and G.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. First commit (about 10 min): `scripts/computed-route/data/effect-settings.json`, an array of `{ block, attr, effect }` for every setting U13 writes (D2 appends U14's). Push it and message Session D2 so it can start U11. If Session B's split of `lib/fill-resolve.mjs` is not on `origin/main` yet (`git log origin/main --oneline -- scripts/computed-route/lib/fill-resolve.mjs`), do U13a, U13b and U13c's allowlist first and U13 once it lands.
2. U13 (the effect recogniser, including the peek's full reveal on keyboard focus and on tap in `plugins/sgs-blocks/src/shared/effects/cursor-field.js`), U13a (the timeline: SGS's switch point kept as an accepted difference, the active-year look built) and U13b (clip reveals, no radius build): each row in the plan.
3. U13c last: the SVG upload allowlist keeping SMIL and `<style>` animation under `lib/svg-screen.mjs::svgProblem`'s refusals (security-relevant: a MUST FAIL test for every refused case, and `/security-standards`), the logo's inline-SVG setting, then the original files uploaded to indus-test and the logo hover written in its custom CSS, labelled in the logo's `sgsCustomCssNote`. L-06 and L-09 stay open for Bean's content question in Session S.
4. At the end: the refresh-loop pass after C's.

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/sgs-wp-engine` and `/wp-block-development` for block changes; `/security-standards` for U13c; `/visual-qa` for the effect pairs. `.claude/rules/motion-qa.md` loads when you touch motion paths.

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
Gate G-D1 in the plan, with a cropped draft-and-live pair per effect at 375/768/1440 and the five SVG files animating on indus-test after upload. Every delivery-map key your units own is flipped (done with its commit, or accepted naming the rule it breaks), and your planted-draft test `scripts/computed-route/tests/<session>-planted-draft.test.mjs` raises its gaps again with one write ref nulled.

Estimate: 2 h agent time plus the refresh-loop pass.

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
