Invoke /autopilot before doing anything else.

# The cloning tool, Track T: the header's last items, then T4, T5 and Track T's closing council

Context (plain English):
- **What this is.** SGS clones Claude Design drafts into WordPress through the "computed route" (`scripts/computed-route/`, Spec 48). The skeleton proposes the block tree; Fill writes block settings from the draft's CSS through the framework DB. Calibration (`cache/<block>.json`, gitignored) records which element and property each setting paints.
- **The plan.** `.claude/plans/2026-10-21-handoff-readers.md` holds Track T (the tooling, this session), Track F (the framework, no session now) and Stage S (the Indus Foods site).
- **The last wave.** The header-looks wave (2026-10-23) fixed every gap at its universal root, per Bean's rulings 11 to 13 in the plan:
  - compact controls take the draft's size, never below 24px;
  - per-width content is one block instance per variation;
  - every fix covers every variation of its gap.
- **Where the header stands.** The Indus header (indus-test post 201) now matches the draft at 375/768/1440 apart from the items below. Pairs: `sites/indus-foods/build/qa/pairs/header-2026-10-23-looks/`. The last Fill run is `sites/indus-foods/build/qa/fill/header/2026-10-23T04-45-48/`. `node scripts/computed-route/census.mjs <run dir> --check` names every unwritten row's cause and fails on a new kind.
- **This session** continues in the same conversation after a compaction.

Read first:
- the plan's "The closing standard", the Rulings (1 to 13) and "Status" (the header-looks done line and the next line);
- `.claude/queue.md`, including the four 2026-10-23 Track F requests waiting for Bean;
- `scripts/computed-route/README.md` for the modules a task touches.

## Tasks, in order
1. **The header's last items**, each proved at its root with the systematic-debugging method and fixed universally (FP-9), at most 3 implementer lanes with no shared files:
   - **(a)** At 768 the tablet "Register" button sits centred where the draft puts it beside the burger. In the draft the burger shares the button's group (`Indus Foods Website v2.dc.html`, header around lines 40 to 90); the skeleton gives the burger to the nav, a row sibling. Treat it as a per-width structure (ruling 12), or as an equal-in-effect position the width ladder writes.
   - **(b)** `lib/fill-step-rungs.mjs` writes the 1024 to 1199px nav item padding only on the measured items (`:nth-of-type(3)`, `(7)`). A setting that paints every item must get one rule for every item.
   - **(c)** The top row's mobile `gap` is 10px against the draft's 12px. The source is unproven (no spacing decision at 375 in `fill-report.json`); prove it first.
   - **(d)** Split the census's 83-row `no-setting` class by real cause:
     - block layout values with no calibrated default paint (display, position, z-index, flex-shrink), which the held classifier cannot judge;
     - part settings the block lacks (the burger bars);
     - `headerSticky` misread as "no setting for position".

     Teach `data/census-classes.json` and the held classifier accordingly.
   - **(e)** 82 dead hover settings that `tools/fixture-completeness.mjs` cannot explain: diagnose the largest groups, and fix the fixtures where a gap is proven.
   - **(f)** The flaky tests under the full run: `calibrate-size-box`, `wp-build-page-inserter-defaults` and a random-item test. Find the shared state and fix it.

   **The site run**, inside `T site-run-start` / `T site-run-end` in the queue:
   1. Skeleton `propose`.
   2. Fill (`--client indus-foods --surface header --skeleton sites/indus-foods/build/skeleton/header.skeleton.json --draft-dir sites/indus-foods/handoff --draft-index "Indus Foods Website v2.dc.html" --allow-external --live-url https://lavender-dinosaur-183533.hostingersite.com`).
   3. Copy `filled.tree.json` to `sites/indus-foods/build/trees/sgs_header/header.json`, and the walker files to `sites/indus-foods/build/qa/parity/`.
   4. Run `node scripts/wp-build-page.js --env-file .claude/secrets/indus-test.env --env-key INDUSTEST --tree sites/indus-foods/build/trees/sgs_header/header.json --post-id 201`: dry run, then build.
   5. Take pairs with the scratchpad script `pairs-looks.mjs`, run from `scripts/computed-route`.

   **Done when:**
   - the pairs match by eye apart from the Track F items;
   - `census.mjs --check` passes;
   - Bean has seen the pairs.
2. **T4 and T5**, as the plan's next line names them:
   - **(a)** T4 tokens into the snapshot after proving Indus's 16px/1.6 fallback, and U8's `::selection` writer;
   - **(b)** T5 checks reading the record, and `solve.mjs` loading the facts for FR-48-14;
   - **(c)** the T2b/T3 residuals;
   - **(d)** the over-400-line files split by responsibility.
3. **Track T's closing council** (the full three-rater `/qc-council`), one fix agent, the docs (plan Status, Spec 48 Status lines, README, delivery-map keys), `/handoff` local and `/compact`.

## Skills
`/autopilot`; `/delegate`, `/subagent-prompt`, `/dispatching-parallel-agents`; `/systematic-debugging` the moment something fails; `/qc-council`; `/sgs-wp-engine`; `/migration-method` before the 4th file getting the same change; `/handoff`.

## Guardrails
- **Gates after each merge, in the main checkout:**
  - `node scripts/computed-route/check-approved.mjs indus-foods --no-built` (157/0);
  - `node scripts/computed-route/freeze.mjs diff-all 2026-10-21-1947` (Indus 120/11/11, Mama's 182/7/0; show Bean only what changes);
  - `node --test "tests/*.test.mjs"` in `scripts/computed-route` (only the known intake re-run test red);
  - `lint.mjs`, `capabilities.mjs --gate`, `delivery-map.mjs indus-foods --check`;
  - `python scripts/check-no-client-names.py --check`.
- **Lessons from the last wave**, to put in every brief:
  - DB reads go through `lib/db.mjs` helpers, never raw SQL (a raw query crashed Fill on a setting with no `css_property`).
  - Every mutation `find` must match the current code once.
  - Re-run the real Fill after each merge and diff the tree per node: three lane fixes passed their tests and still broke the real run.
- **Recalibration:** recalibrate a block (`calibrate.mjs --site local-indus --client indus-foods --blocks <b> --recalibrate`) inside queue lines, backing up `cache/<block>.json` first.
- **Git and file writing:**
  - explicit pathspecs, with `git branch --show-current` in the same command;
  - a merge commit carries `[batch-ok:…]`;
  - write JSON and code from Python with `newline=''`, or with the Edit tool for a JS string with an apostrophe.
- **Close-out:** delete this prompt file (`git rm`) in the wave's handoff commit.
