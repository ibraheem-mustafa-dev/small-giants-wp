Invoke /autopilot before doing anything else.

# The cloning tool, Track F: framework waves

Context (plain English): SGS clones Claude Design drafts into WordPress through the "computed route" (`scripts/computed-route/`, Spec 48). The plan `.claude/plans/2026-10-21-handoff-readers.md` holds all of it: Track T (the tooling, run by the handoff readers session in parallel with you), Track F (the framework, yours) and Stage S (the Indus Foods site, where the tooling is tested). Track F builds the block and theme features the route's writers need and the Indus draft uses but SGS does not yet offer. You are an orchestrator: you keep judgement and Bean's decisions in the main thread and send each wave's units to Sonnet implementers in worktrees.

Read first, all of it: `.claude/plans/2026-10-21-handoff-readers.md` sections "How the work runs" (with its closing standard, delivery map and Rulings), "Track F", "Units (the specs)" (every row whose Track names F: U5, U8, U10, U11, U13, U13a, U13c, U14, U17) and Status. Then `.claude/LEDGER.md`'s Indus front. Before a unit, read the spec section its row names (Spec 04 forms, Spec 01 SVG upload, Spec 36 the logo, Spec 38 and 38A motion, Spec 32 the theme snapshot and focus); grep a large spec to the FR, never read it whole.

## Your waves, in order (each a wave of at most three Sonnet implementers)
1. F1, forms: U10, every form setting its row lists, each a new `FR-4-<N>` in `.claude/specs/04-SGS-FORMS.md` with a test, an inspector control and the render, built in the owning block; saved progress per Ruling 4; the field-from-link value escaped and limited to a select's own options.
2. F2, motion features: U13's peek reveal on keyboard focus and tap (`plugins/sgs-blocks/src/shared/effects/cursor-field.js`, Ruling 8); U13a's timeline settings (proximity focus, progress counter) and active-entry year look; U14's builds (the page transition's custom duration and easing beside its presets, always winning, Ruling 5; the opening-hours dot pulse and today row; the accordion's scroll to the opened section, J-20); U13c (a) the SVG upload allowlist keeping SMIL and `<style>` animation under the refusals `scripts/computed-route/lib/svg-screen.mjs::svgProblem` makes (a MUST FAIL test for every refused case; this is security work) and (b) `sgs/responsive-logo`'s inline-SVG setting (Ruling 2).
3. F3, styling and layout: U8's `::selection` snapshot pair and the theme rule that paints it (a `sgs/nav-drawer` scrollbar setting only if the drawer's colours differ from the site's); U5's map controls on `sgs/business-info` (height per device, zoom, a filter with a custom value; clone the draft's whole filter including `contrast(1.05)`); U17's repairs in blocks and theme (visible focus, the drawer as a true modal, `aria-expanded` and `aria-controls` on mega triggers and FAQ rows, 44px targets, 4.5:1 text pairs). The header and footer rows' minimum height only if Bean has chosen it (the plan's "Facts the header work needs").
4. F4, setting meanings: U11 once Track T has committed `scripts/computed-route/data/effect-settings.json` (check `git log origin/main -- scripts/computed-route/data/effect-settings.json`; if absent, message the handoff readers session and do F4 last): the detector `plugins/sgs-blocks/scripts/check-setting-meanings.py` first (`--check` fails on a listed setting with no `sgs.meaning`, with a MUST FAIL test), then the meanings, then one reseed.

## Each wave's loop
1. Brief each implementer with `/subagent-prompt` after `/delegate` picks its model (Sonnet in a worktree for code): its unit row in full, the closing standard, the files it may touch (only `plugins/`, `theme/` and the specs above; never `scripts/computed-route/`, which is Track T's), `npm ci` in the worktree's `scripts/computed-route` if it runs route tests (never a junction to the main checkout's `node_modules`), and the gates below.
2. Read every diff in the main thread; merge with `git merge --no-ff` after `git diff --cached --name-only` shows an empty index.
3. One `/qc-council` on the wave (scoped to the wave's units); apply its fixes.
4. The wave's framework edits go live once: `ListAgents` and a message to the handoff readers session, then a reseed from a clean `origin/main` worktree (`.claude/dev-setup.md` "Reseeding from a clean worktree", diffing `block_attributes` against a copy taken first), `npm run build` from PowerShell, and `python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test --blocks-only` (add `sandybrown` for a canary check); then one live check per unit at 375/768/1440 (computed styles and a screenshot), never closing on a green gate alone.
5. Docs: the plan's Track F items ticked with their commits in the same commit as the work; each unit's delivery-map keys flipped (`node scripts/computed-route/delivery-map.mjs indus-foods --status`, `--check`); the owning spec's FR Status lines; `.claude/catalogues/` regenerated if a gate says so.

## Skills
- `/autopilot` first.
- `/delegate` before each dispatch; `/subagent-prompt` for each brief; `/dispatching-parallel-agents` for a wave.
- `/sgs-wp-engine` for all block and theme work; `/wp-block-development` for core block-API questions; `/wp-interactivity-api` for view scripts; `/wp-block-themes` for theme.json and snapshot work.
- `/security-standards` for U13c's SVG allowlist; `/a11y-audit` for U17.
- `/migration-method` before the 4th file getting the same change (detector first).
- `/systematic-debugging` the moment something fails unexpectedly (prove the cause first).
- `/qc-council` per wave; `/handoff` to close the session.

## Tools
| Tool | Use it for |
|---|---|
| `/sgs-db`, `python ~/.claude/hooks/wp-blocks.py` (`schema`, `attrs`) | a block's settings before claiming one is missing or built (read-only) |
| `node scripts/computed-route/capabilities.mjs --like <id>` / `--drafts` / `--gate` | worked examples, the open gap list, the coverage gate |
| `node scripts/computed-route/delivery-map.mjs indus-foods --status` / `--check` | the tracking file |
| `node scripts/computed-route/tools/mutate.mjs <route dir> <mutations.json> <test>` | mutation checks for route-side tests |
| `npm run gate:list`, `python plugins/sgs-blocks/scripts/run-gates.py --only <id>` | the plugin's gates |
| Playwright MCP / Chrome DevTools MCP | live computed styles and screenshots at 375/768/1440 (one browser at a time) |
| `ListAgents` + `SendMessage` | the serial queue before any reseed, build, deploy or calibration |

## Research
1. Before a unit, query the framework DB for the block's settings and read its `render.php`, `block.json` and `edit.js`.
2. For a control that already works on another block, find it and reuse its shape (`git grep` the attribute family; the colour, border, spacing and typography standards in `.claude/rules/`).
3. For a WordPress API question, Context7 (`/library-docs`) before memory; for the SVG allowlist, the OWASP SVG guidance via `/search`.

## Done when
F1 to F4 are ticked in the plan with their commits; every delivery-map key Track F's units own is flipped (done, or accepted naming the rule it breaks); each unit has its MUST FAIL test and red mutation where it has route-side tests, and a live check on indus-test; the specs' Status lines updated; the session closed with `/qc-council` then `/handoff`. Delete this prompt file (`git rm`) in the closing commit.

Guardrails (beyond CLAUDE.md): never touch `scripts/computed-route/` (Track T's) or `sites/eye-care-ward-end/design_handoff_*` (Bean's deliberate deletion). Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the Rulings). Commits name their unit (`feat(U10): …`), explicit pathspecs, `git branch --show-current` in the same command. Write files from Python with `newline=''`; `sed -i` is denied.
