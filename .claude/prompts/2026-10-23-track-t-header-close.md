Invoke /autopilot before doing anything else.

# The cloning tool, Track T: every dropped CSS rule and effect on the Indus header, fixed at its root

Context (plain English):
- **The route.** SGS clones Claude Design drafts into WordPress through the "computed route" (`scripts/computed-route/`, Spec 48). The skeleton proposes the block tree; Fill writes block settings from the draft's CSS and motion through the framework DB. Calibration (`cache/<block>.json`, gitignored) records which element and property each setting paints.
- **The plan.** `.claude/plans/2026-10-21-handoff-readers.md` holds Track T (the tooling, this session) and Stage S (the Indus site).
- **The last wave and what it missed.** The header-looks wave (2026-10-23) fixed many root causes:
  - shorthand families;
  - per-width values;
  - sizes;
  - per-device instances;
  - per-child values;
  - part slots.

  It did not finish the header. Fill's unwritten list (110 rows, `node scripts/computed-route/census.mjs <run dir>`) counts only what Fill knows it skipped. On the live page (indus-test post 201, https://lavender-dinosaur-183533.hostingersite.com) the header still drops tens of the draft's declared rules: hover colours, motion effects (the nav label magnet, button lifts, the burger's bar animation), gaps and more.

Bean's rules for this session (2026-10-23):
1. **Never blame missing framework features or ask for anything to be built.** Most if not all functionality is built. Every difference is a route defect until every existing setting and equivalent-in-effect form is ruled out. For example:
   - an opacity is a colour with alpha (every SGS colour picker has an alpha channel);
   - the nav already draws current-state looks and underlines;
   - the burger already animates its bars (`burgerMorph`, `burgerBarCount`, `burgerIconWidth`).

   Grep the block's `block.json`, `render.php` and the DB (`lib/db.mjs` helpers) before any "no setting" verdict.
2. **Only root cause investigation and the universal solution.** Use `/systematic-debugging` per cause. Each fix covers every variation of its gap for every block and client (rulings 11 to 13 in the plan).
3. **Bean sees pairs only when the walker reports the header identical** at 375, 768 and 1440, including hover and motion. Never earlier.

Read first:
- the plan's "The closing standard", the Rulings and "Status" (the header-looks done line and the next line);
- `.claude/queue.md`;
- `scripts/parity/GAP-CHECKLIST.md` (the walker's gap classes);
- `scripts/computed-route/README.md` for the modules a task touches.

## Tasks, in order
1. **Measure the truth.** Run the parity walker on the last Fill run's config:
   - command: `node scripts/parity/draft-live-walk.mjs sites/indus-foods/build/qa/parity/header.fill.mjs --widths 1440,768,375 --headless`, with `NODE_EXTRA_CA_CERTS` set to certifi's bundle;
   - it compares computed styles, boxes, hover end states, motion, focus and structure for every draft and live pair;
   - list every differing property per element and width, including hover and motion, and group them by root cause in the route: why Fill did not write it, or wrote it wrong.

   Show Bean that census table (cause, rows, the existing setting it lands on) before dispatching. It is a decision table, not a screenshot.
2. **Fix each cause universally,** at most 3 implementer lanes with no shared files, each with MUST FAIL tests and killed mutations, each proved on the real run. The causes already known, each to be proven first:
   - hover state colours not written;
   - draft motion effects not reaching the existing effect and motion settings;
   - gaps not preserved live;
   - the current item's gold underline;
   - the caret's opacity (as colour alpha);
   - the burger's tapered bars and their hover (the existing burger animation);
   - the social icons sitting about 21px apart against the draft's 10px;
   - at 768 the "Register" button centred where the draft places it beside the burger;
   - `lib/fill-step-rungs.mjs` writing the 1024-1199px nav padding only on the measured items;
   - the top row's 10px mobile gap against 12px;
   - the census's 83-row `no-setting` class, split by cause;
   - the 82 dead hover settings `tools/fixture-completeness.mjs` cannot explain;
   - the flaky tests (`calibrate-size-box`, `wp-build-page-inserter-defaults`, a random-item test).
3. **The site run,** inside `T site-run-start` / `T site-run-end` queue lines, repeated until the walker reports identical:
   1. skeleton `propose`;
   2. Fill (`--client indus-foods --surface header --skeleton sites/indus-foods/build/skeleton/header.skeleton.json --draft-dir sites/indus-foods/handoff --draft-index "Indus Foods Website v2.dc.html" --allow-external --live-url https://lavender-dinosaur-183533.hostingersite.com`);
   3. copy `filled.tree.json` to `sites/indus-foods/build/trees/sgs_header/header.json`, and the walker files to `sites/indus-foods/build/qa/parity/`;
   4. `node scripts/wp-build-page.js --env-file .claude/secrets/indus-test.env --env-key INDUSTEST --tree sites/indus-foods/build/trees/sgs_header/header.json --post-id 201`, dry run then build;
   5. the walker again.

   Only then take the pairs at 375/768/1440 into `sites/indus-foods/build/qa/pairs/header-<date>-final/` for Bean to double-check.
4. **Then, if the session has room:** T4 and T5 and the T2b/T3 residuals, as the plan's next line names them.
5. **Close:** the wave review (the full three-rater `/qc-council`, one fix agent), the docs (plan Status, Spec 48 Status lines, README), `/handoff` local and `/compact`.

## Skills
`/autopilot`; `/systematic-debugging`; `/delegate`, `/subagent-prompt`, `/dispatching-parallel-agents`; `/qc-council`; `/sgs-wp-engine`; `/migration-method` before the 4th file getting the same change; `/handoff`.

## Guardrails
- **Gates after each merge, in the main checkout:**
  - `node scripts/computed-route/check-approved.mjs indus-foods --no-built` (157/0);
  - `node scripts/computed-route/freeze.mjs diff-all 2026-10-21-1947` (Indus 120/11/11, Mama's 182/7/0);
  - `node --test "tests/*.test.mjs"` in `scripts/computed-route` (only the known intake re-run red);
  - `lint.mjs`, `capabilities.mjs --gate`, `census.mjs <run dir> --check`, `delivery-map.mjs indus-foods --check`;
  - `python scripts/check-no-client-names.py --check`.
- **Lessons from the last wave**, for every brief:
  - DB reads go through `lib/db.mjs` helpers, never raw SQL.
  - Every mutation `find` must match the current code once.
  - Re-run the real Fill after each merge and diff the tree per node: lane fixes that passed their tests still broke the real run three times.
  - A rater or lane verdict of "needs a framework setting" is a claim to disprove against the block's existing settings.
- **Recalibration:** recalibrate a block (`calibrate.mjs --site local-indus --client indus-foods --blocks <b> --recalibrate`) inside queue lines, backing up `cache/<block>.json` first.
- **Git and file writing:**
  - explicit pathspecs, with `git branch --show-current` in the same command;
  - a merge commit carries `[batch-ok:…]`;
  - write JSON and code from Python with `newline=''`, or with the Edit tool for a JS string with an apostrophe.
- **Close-out:** delete this prompt file (`git rm`) in the wave's handoff commit.
