Invoke /autopilot before doing anything else.

# The cloning tool, Track F: framework waves

Context (plain English): SGS clones Claude Design drafts into WordPress through the "computed route" (`scripts/computed-route/`, Spec 48). The plan `.claude/plans/2026-10-21-handoff-readers.md` holds all of it: Track T (the tooling, run by the handoff readers session in parallel with you), Track F (the framework, yours) and Stage S (the Indus Foods site, where the tooling is tested). Track F builds the block and theme features the route's writers need and the Indus draft uses but SGS does not yet offer. You are an orchestrator: you keep judgement and Bean's decisions in the main thread and send each wave's units to Sonnet implementers in worktrees. This is one session for the whole track: you never start a fresh one (see "Between waves").

First action: read the plan's "How the work runs" (the wave loop, the queue file, ownership, terms, the closing standard, the delivery map, the Rulings), "Track F", the rows in "Units (the specs)" whose Track column names F (U5, U8, U10, U11, U13, U13a, U13c, U14, U17), and Status; then `.claude/queue.md`; then run `ListAgents` to learn the other sessions' names (the Track T session is the handoff readers session). Then F0.

## Your waves, in order
The plan's "Track F" section is the authority: each wave's contents and its done-when are there; follow them exactly.
1. F0: ask Bean the header row-height question as the plan words it, before F3.
2. F1, forms (U10).
3. F2, motion features (U13's peek reveal, U13a, U14's builds, U13c (a) and (b)).
4. F3, styling and layout (U8's `::selection`, U5's map controls, U17's repairs, the rows' minimum height if Bean chose it). Record Bean's F0 answer in the plan's "Facts the header work needs" bullet on the row height.
5. F4, setting meanings (U11), only after `.claude/queue.md` holds `T effect-settings complete`; its detector may be built earlier against a fixture.

## Each wave (the plan's wave loop, applied to Track F)
1. State the wave's dispatch count. This session allows 4 subagents at once: at most 3 implementers, leaving one slot for the reviewer.
2. `/delegate` before each dispatch (it picks the model and gives the three brief lines every brief carries word for word); `/subagent-prompt` writes each brief; `/dispatching-parallel-agents` sends the batch. Each brief holds: the unit's row in full, the closing standard, the files it may touch (only `plugins/`, `theme/` and the specs Track F owns), the commit gate (commit only if its tests pass and every gate its diff touches is green: `python plugins/sgs-blocks/scripts/run-gates.py --only <id>`), explicit pathspecs, and `npm ci` in the worktree's `scripts/computed-route` if it runs route tests (never a junction to the main checkout's `node_modules`). No two implementers edit the same file.
3. Read every diff; check `git diff --cached --name-only` is empty; merge with `git merge --no-ff`; run the gates in the main checkout.
4. One reviewer for the wave's whole diff (`/qc-council` Stage 7.5, routed by `/delegate`), one fix agent for its findings; a wave that changes a shared mechanism (F2, with the SVG allowlist) gets the full three-rater `/qc-council` instead, and a full council closes the track.
5. Read `.claude/queue.md` before any reseed, deploy or framework-DB read; Track T never reads the DB between your `reseed-start` and `reseed-done`, and recalibrates the listed blocks after `reseed-done`; a `T svg-screen change <sha>` line means mirror that change in the PHP upload allowlist and its tests. Make the wave live once: append `F reseed-start <sha>` to `.claude/queue.md` (commit and push), reseed from a clean `origin/main` worktree (`.claude/dev-setup.md` "Reseeding from a clean worktree": `sgs-update-v2.py` then `dbschema/seed_reference_data.py` in one command, a copy of the DB taken first and `block_attributes` diffed after; `npm run build` does not reseed `block_attributes`), copy the regenerated tracked files back and commit them, `npm run build` from PowerShell, `python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test --blocks-only` (add `sandybrown` for a canary check), then append `F reseed-done <sha> blocks: <slugs> settings: <names>` and one `F built <unit> <sha>` per unit. If the db-consistency gate flags rogue seeds, regenerate `scripts/behavioural-analyser/css-property-classifications.json` with `extract-signatures.py` and check its diff removes nothing; a new `*TextStroke*` attribute needs its element-manifest claim (`check-text-stroke-routing`).
6. One live check per unit at 375/768/1440 (computed styles and a screenshot), never closing on a green gate alone.
7. Docs: tick only Track F's items in the plan with their commits; flip delivery-map keys only for units whose Track is F alone (U10's 3 keys; for split units Track T flips after writing); edit only the block spec's FR Status lines (Spec 04, 01, 36, 38, 38A, 32); LEDGER: only the Track F line of the cloning front.

## Between waves
When a wave is fully done (merged, reviewed, fixed, live, docs updated): run `/handoff` in `local` mode, then the session is compacted (`/compact`), then continue the next wave in this same session from the prompt the handoff wrote (`.claude/prompts/<date>-track-f-<wave>.md`, deleted when used). The first handoff deletes this file (`git rm`) in its commit. Nothing carries across a compaction except the docs, `.claude/queue.md` and that prompt.

## Skills
- `/autopilot` first.
- `/delegate`, `/subagent-prompt`, `/dispatching-parallel-agents` for every dispatch; `/qc-council` for the wave's review.
- `/sgs-wp-engine` for all block and theme work; `/wp-block-development` for core block-API questions; `/wp-interactivity-api` for view scripts; `/wp-block-themes` for theme.json and snapshot work.
- `/security-standards` for U13c's SVG allowlist; `/a11y-audit` for U17.
- `/migration-method` before the 4th file getting the same change (detector first).
- `/systematic-debugging` the moment something fails unexpectedly (prove the cause first).
- `/handoff` between waves and at the end.

## Tools
| Tool | Use it for |
|---|---|
| `/sgs-db`, `python ~/.claude/hooks/wp-blocks.py` (`schema`, `attrs`) | a block's settings before claiming one is missing or built (read-only) |
| `node scripts/computed-route/capabilities.mjs --like <id>` / `--drafts` / `--gate` | worked examples, the open gap list, the coverage gate |
| `node scripts/computed-route/delivery-map.mjs indus-foods --status` / `--check` | the tracking file |
| `npm run gate:list`, `python plugins/sgs-blocks/scripts/run-gates.py --only <id>` | the plugin's gates |
| Playwright MCP / Chrome DevTools MCP | live computed styles and screenshots at 375/768/1440 (one browser at a time) |
| `.claude/queue.md`, `ListAgents`, `SendMessage` | the cross-track signal and courtesy messages before any reseed, build or deploy |

## Research
1. Before a unit, query the framework DB for the block's settings and read its `render.php`, `block.json` and `edit.js`.
2. For a control that already works on another block, find it and reuse its shape (`git grep` the attribute family; the colour, border, spacing and typography standards in `.claude/rules/`).
3. For a WordPress API question, Context7 (`/library-docs`) before memory; for the SVG allowlist, the OWASP SVG guidance via `/search`.

## Done when
F0 to F4 meet the plan's done-whens and are ticked in the plan with their commits; `.claude/queue.md` holds each wave's `reseed-done` and `built` lines; every key of a Track-F-only unit is flipped; the block specs' Status lines are updated; the last wave closes with `/handoff`.

Guardrails (beyond CLAUDE.md): never touch `scripts/computed-route/` or `scripts/wp-build-page.js` (Track T's); never touch `sites/eye-care-ward-end/design_handoff_*` (Bean's deliberate deletion); never touch `sgs/cart`'s editor files (`plugins/sgs-blocks/src/blocks/cart/edit.js`, `editor.css`, `PanelPreview.js`) or the drawer-preview toggle in `sgs/nav-drawer/edit.js`, or the editor files of `sgs/site-header-row`, `sgs/site-header`, `sgs/responsive-logo` and `sgs/trust-bar` (`edit.js`, `editor.css`) and the content-band preview utils (`src/utils/content-band-preview.js::contentBandPreview`, `resolveContentWidthPreview`), without first messaging the session `ListAgents` shows working on them (small-giants-wp-fb on 2026-10-22, editor-canvas fixes) and checking `.claude/queue.md` for its done line. Clone what the draft does and add no safeguard it lacks; every preset control also takes a custom value (the Rulings). Commits name their unit (`feat(U10): …`), explicit pathspecs, `git branch --show-current` in the same command. Write files from Python with `newline=''`; `sed -i` is denied.
