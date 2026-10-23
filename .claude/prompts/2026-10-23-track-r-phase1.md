Invoke /autopilot before doing anything else.

# Track R (the Fill route), Phase 1: fix every known route issue

Context:
- **The cloning tool** turns a Claude Design draft into an SGS WordPress site through the "computed route" (`scripts/computed-route/`, Spec 48).
- **Fill** is the step that writes block settings from the draft's CSS and motion. The parity walker (`scripts/parity/draft-live-walk.mjs`) compares the draft and the live clone and is the closing measure.
- **The plan:** `.claude/plans/2026-10-23-cloning-tool-completion.md` fixes every known issue first (Phase 1), then re-clones all three clients (Phase 2), then fixes what the census finds (Phase 3), looping until the walker reports identical.
- **Phase 0 is done.** The walker now measures honestly, done marks need live evidence, the site build handles shops, and a cross-surface census exists.
- **This session is Track R.** It owns the files the plan's track table gives it: `lib/fill-*.mjs`, `lib/css-equivalence/**`, `lib/css-families.mjs`, `lib/resolve*.mjs`, `lib/db.mjs`, `lib/ledger.mjs`, `lib/pairs.mjs`, `lib/solve-*.mjs`, `skeleton*.mjs`, `fill.mjs`, `solve.mjs`.
- **Other tracks run as separate sessions:** W (walker and proof), F (framework), S (sites and inputs). Signal them through `.claude/queue.md`.

Read first:
- the plan in full: How the work runs, Rulings, the register rows E, R1 to R12 and W7/W8, and Phase 1;
- Spec 48 FR-48-86 (setting equivalence by measured effect), FR-48-76, FR-48-81, FR-48-51 and FR-48-8 (`.claude/specs/48-CLONING-SYSTEM.md`);
- `scripts/computed-route/README.md` for the modules you touch.

The latest Indus header walk is in the session scratchpad of 2026-10-23. Re-walk it yourself from the main checkout: serve `sites/indus-foods/handoff` with `lib/draft.mjs::serveDraft`, set `SGS_DRAFT_URL`, then run `node scripts/parity/draft-live-walk.mjs sites/indus-foods/build/qa/parity/header.fill.mjs --widths 1440,768,375 --headless` with `NODE_EXTRA_CA_CERTS` set to certifi's bundle. It shows the real rows this track owns:
- the CTA's doubled hover lift (R2);
- default hover and focus looks never cancelled (R1; about 190 focus rows on header links);
- the nav items' hover ground and the current item's gold underline (part rows; E and R1);
- the CTA's missing sheen and ripple (R9);
- transition timings (R8);
- the scrolled header scrolling away (R11: the tree sets `headerSticky` only at desktop).

## Tasks
1. **One wide wave**, every item at once as API workers (`/delegate`, `api-agent.py --prompt-file <brief> --tools full --cwd <worktree>`, in the background; `/subagent-prompt` writes each brief with the three brief lines). The only rule is that no two lanes edit the same file.

   | Lane | Work | Done when |
   |---|---|---|
   | E | The equivalence engine, FR-48-86's five layers. Add `@webref/css` to `scripts/computed-route/package.json`. | Its done-when |
   | E-check | A read-only `wp-sgs-developer` Agent run maps each of the header Fill run's 87 `no-setting` rows to the SGS setting, shared helper, extension or block default that paints it. | Lane E's answers match it |
   | R1 | Default state looks cancelled: hover, focus and active, every hover-capable property. | Its MUST FAIL tests pass |
   | R2 | One writer per property: the preset leaves out what per-instance `sgsMotion` writes. | Same |
   | R4 | Covered judged per tier against the block's measured fallback. | Same |
   | R5 | The default judged on the live confirm read; the old calibration-page judge deleted. | Same |
   | R6 | `none` and keywords writable for size settings. | Same |
   | R7 | Fix each silent drop. Track W builds the conservation check in `census.mjs --check`; start from the known drop (the nav letter-spacing, likely `lib/fill-page.mjs`'s `em` path) and take the rest from W's check once its `W` queue line lands. | Same |
   | R8 | Transitions split per property. Waits on E inside the wave. | Same |
   | R9 | The sheen and ripple written: why the recogniser's records did not reach the CTA. | Same |
   | R10 | FR-48-9, -10, -14, FR-47-2, FR-48-4 and -5. | Each FR's own done-when |
   | R11 | The diagnoses, filed under a cause. | Each filed |
   | R12 | The residuals. | Each with a MUST FAIL test |
   | W7/W8 | `lib/pairs.mjs` pairing. | Last; a full Fill tree diff and `freeze.mjs diff-all` for both clients |

   Every lane:
   - proves its cause first, then enumerates its variants as a DB-derived list;
   - writes MUST FAIL tests;
   - runs `tools/mutate.mjs` until red with 0 skipped;
   - passes `capabilities.mjs --gate`;
   - re-runs the real Indus header Fill and diffs the tree per node.

   Each worktree runs `npm ci` in `scripts/computed-route` (and, from PowerShell, in its own `plugins/sgs-blocks` if it walks). **Every brief says "Never link or junction any node_modules."**
2. **Merge each lane** (`git merge --no-ff`, `[batch-ok:…]`). After each merge, in the main checkout:
   - run the full route suite (only the known intake re-run red);
   - run the plan's gates;
   - before any `git worktree remove`: `Get-ChildItem -Recurse -Force -Attributes ReparsePoint <worktree>` must return nothing.
3. **The site run** inside `T site-run-start` / `T site-run-end` queue lines:
   1. skeleton `propose`;
   2. Fill (`--client indus-foods --surface header --skeleton sites/indus-foods/build/skeleton/header.skeleton.json --draft-dir sites/indus-foods/handoff --draft-index "Indus Foods Website v2.dc.html" --allow-external --live-url https://lavender-dinosaur-183533.hostingersite.com`);
   3. copy `filled.tree.json` to `sites/indus-foods/build/trees/sgs_header/header.json`;
   4. `node scripts/wp-build-page.js --env-file .claude/secrets/indus-test.env --env-key INDUSTEST --tree sites/indus-foods/build/trees/sgs_header/header.json --post-id 201`, dry run then build;
   5. the walker.

   **Done when:** every R row the register names is gone from the walk, or is filed with Bean's decision.
4. **Close:** the full three-rater `/qc-council` (Fill's resolver is a shared mechanism), one fix agent, the docs (plan Status, Spec 48 Status lines, README), `/handoff local`, `/compact`.

## Guardrails
- Bean's rules:
  - no framework requests (ruling 14: an equivalent or shared setting first; `sgsCustomCss` with a gaps log row last);
  - a cloned size overrules 44px (ruling 11);
  - universal fixes only (ruling 13);
  - pairs to Bean only when the walker reports identical.
- Regenerate route outputs only in the main checkout. Read the framework DB only through `lib/db.mjs`, and never between a queue `reseed-start` and its `reseed-done`.
- Git: explicit pathspecs with `git branch --show-current` in the same command; never stash or `git add -A`; never touch `.claude/settings.json`.
- Delete this prompt (`git rm`) in the wave's handoff commit.
