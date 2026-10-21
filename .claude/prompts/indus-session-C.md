Invoke /autopilot before doing anything else.

# Indus delivery, Session C (forms)

Context: the Indus Foods clone's forms: the careers and catalogue inline forms, the contact enquiry form and the 5-step trade application, built from SGS form blocks with real submission, recipient and email (Spec 48 Appendix B step 22, FR-48-57, Spec 04). Second in the refresh-loop order. Runs beside A, B and G.

Read first: `.claude/plans/2026-10-21-indus-delivery.md` in full (it is the approved plan for its units; you need no separate plan-mode approval), then `.claude/LEDGER.md`'s Indus front. Before touching a surface, read the governing spec section the plan names (Spec 48 `.claude/specs/48-CLONING-SYSTEM.md`, Spec 38 and 38A for motion, Spec 04 for forms, Spec 01 and 36 for the logo and SVG upload); grep large specs to the FR, never read them whole.

## Tasks, in order
1. U10 first (the form settings the writer needs; none exists today): per-field validation copy, floating labels, textarea maxlength and counter, autocomplete, inputmode, default value (text and select) and checked, a field's value taken from a named link parameter (escaped, and a select accepts only its own options), the review step's per-section cards with an Edit link, and saved progress per the plan's Ruling 4 (every field and the step in `localStorage`, restored with the draft's notice, cleared on submit). Each one is a new `FR-4-<N>` in `.claude/specs/04-SGS-FORMS.md` (continuing its numbering) with a test, built in the owning block with an inspector control.
2. U9 (form writer): its row in the plan, including the careers "Apply for this role" link per Ruling 6.
3. Step 22's done-when: each Indus form submits on indus-test and the owner email reaches the confirmed recipient (FluentSMTP log).
4. At the end: one refresh-loop pass after B's, after `ListAgents`.

## Skills
- `/autopilot` first (routing, orchestration, docs current).
- `/delegate` before each subagent dispatch (model and effort); `/subagent-prompt` to write the brief; `/dispatching-parallel-agents` for at most three at once.
- `/systematic-debugging` the moment anything fails unexpectedly (prove the cause before the fix).
- `/migration-method` before the 4th file getting the same change (detector first).
- `/qc-council` on the session's work before `/handoff`, which closes the session.
- `/wp-block-development`, `/wp-interactivity-api` (form view.js) and `/security-standards` for the link parameter and saved progress (sanitising and escaping); `/sgs-wp-engine`.

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
Gate G-C in the plan, with the trade application's review step and saved progress paired with the draft, and the careers link preselecting both selects on indus-test. Every delivery-map key your units own is flipped (done with its commit, or accepted naming the rule it breaks), and your planted-draft test `scripts/computed-route/tests/<session>-planted-draft.test.mjs` raises its gaps again with one write ref nulled.

Estimate: 1 h 45 agent time plus the refresh-loop pass.

Guardrails (beyond CLAUDE.md): follow the plan's "Sessions" paragraph on shared resources (refresh-loop order B, C, D1, D2; reseed only from a clean `origin/main` worktree; edit only your own units' keys in `clone-coverage.json`, `data/coverage-test-baseline.json` and the delivery map, committing and rebasing after each unit). Every unit meets the plan's "closing standard" (shared mechanism, coverage entry with a test, MUST FAIL plus mutation red, reduced motion, commit named `feat(<unit>): …`). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the plan's Rulings). Run the full route suite in the main checkout (`node --test "tests/*.test.mjs"` in `scripts/computed-route`); a worktree run fails 5 known lint and solve-held tests. `python scripts/check-no-client-names.py --check` before every commit. Agent worktrees need `npm ci` in `scripts/computed-route` first.

Delete this prompt file (`git rm`) in the session's closing commit.
