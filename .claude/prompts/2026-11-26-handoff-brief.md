# Handoff brief, 2026-11-26 (afternoon), deadline lane session small-giants-wp-06

Reader: the handoff worker. You have no access to the conversation; everything you need is here. The session continues after a context compaction (Bean runs `/compact`, then "continue"), so the next-session prompt is written by the main session, not you.

## Tasks this session and their intended outcomes

1. **Deadline lane of `.claude/plans/2026-11-25-land-fixes-and-editor-cleanup.md`** (Tasks 1–10, 14–16, now also 31 parts 1–2): land the clone root-fix branches so SGS and MIC can be cloned from Claude Design drafts by 2026-11-28 with no hand fixes. Outcome not yet hit: several branches are still in fix/review, batch 1 not yet merged, Task 10 not started, SGS/MIC drafts not started (Bean's).
2. **Mama's live-shop update** (deploy target `mamas-test`, frozen copy `E:/sgs-tmp/wt-mamas-target` at `9c35674e9`), then pause Mama's deploys. Outcome not yet hit: two deploy attempts aborted before upload (nothing uploaded; live shop untouched). Attempt 1: the isolated deploy worktree lacked `scripts/computed-route/node_modules` (the frozen copy never had it; `deploy_ship.py` silently skips a missing link source) — fixed by copying the folder into the frozen copy. Attempt 2: full-tier gate `setting-record-changed-proof` failed: 17 blocks' browser verdicts (`plugins/sgs-blocks/scripts/setting-record/browser/verdicts/*.json` `scriptHash`) are stale on main too, so EVERY deploy is blocked until a browser pass re-measures them. A worker (`fix/verdicts-refresh`, worktree `E:/sgs-tmp/wt-verdicts`) is running that pass now (Bean made it priority; it runs outside the queue with 3 tabs). After it lands: cherry-pick its verdict/record files onto the frozen copy (the 17 blocks' `src/blocks/<b>` and `src/shared` do not differ between `9c35674e9` and main), rerun the deploy, then `NODE_PATH=scripts/computed-route/node_modules node sites/mamas-munches-redesign/build/content/shop-check.cjs https://mamasmunches.com E:/sgs-tmp/tmp-mamas-update/shop-after`, compare with `shop-before`, then mark Mama's deploys paused. DB backup already taken: `/home/u945238940/backups/db/mamasmunches.com-20261126-111022-pre-deploy-20261126.sql.gz`.
3. **Queue and machine-load work** (Bean): see findings below.
4. **Bean's questions answered:** site looks (why they exist), effort levels (research), VPS, GitHub Actions.

## Commits on main this session (all pushed; main == origin/main at `fb1ba72f1` or later)

Code: `d270e7a49` (fill-diagram: in-page measurer takes `PX_TOL` as an argument), `2572d9ee2` `b3fd6efe3` `37c1aefd9` `161c5a8b9` (page parents follow the draft's own routes, Bean's ruling; Indus's 16 menu-parented pages become top-level; `routePath` renamed `ancestorSegments`; `site-build-map.mjs::parentRow` matches slug first; manifest parent only between page rows), `5ff53d824` `ffe9c4dab` `f36a030cc` `5caca9ff3` `747193830` (shared site-look store `E:/sgs-tmp/look-store`, `SGS_LOOK_STORE`; look key now covers the cascade reader, bridge and its imports, framework DB plus its WAL, php/node/sass versions; LF-normalised hashing), `018af52c1` (third heavy slot needs 8 GB free memory, was 12), `ffc22b388` (third slot judges CPU over a 5-second average). Docs: `a99721dab`, `f42b0459a`, `fdab0ecb1`, `110c55a4d`, `b359777d8`, `ea46d5b3b`, `7d20588b5`, `77149390e` (adds `.claude/reports/2026-11-26-site-look-cost.md`), `43c7fe240`, `663d23dbd`, `aa99e5d76`, `31b1ca087`, `cc8845907`, `fb1ba72f1`. `c2c0e3ad7` is the other session's. `~/.claude` (separate repo): `48b7151` restore point, `6d6bf65` removed the agent-model-guard hook (Bean's approval) — it silently put every unnamed subagent on Sonnet; script archived at `~/.claude/archive/2026-11-26/`; `TOOLS.md` updated.

## Findings and decisions (state each where it belongs)

- Merge method changed (Bean): branches are proven by their own tests and mutations only; reviewed branches merge onto `fix/land-batch-<n>`, which gets ONE whole non-browser suite and ONE all-surface sweep against the shared main baseline (`E:/sgs-tmp/general-cloning/baseline-ea46d5b3b`, queued; its worktree `E:/sgs-tmp/wt-baseline-ea46d5b3b` was moved to main `747193830` before it started). Workers sweep only surfaces the batch sweep does not fill. Already in the plan and `_common.md`.
- Worker rules added to `_common.md`: one browser test file (or a mutation run of one) runs without a heavy slot; "Review your own diff first" against seven fault kinds before reporting.
- Subagents: every builder, fixer and reviewer is dispatched with `model: "opus"` and `effort: "high"` (Bean). Until the hook removal all of today's workers ran on Sonnet 5.5 (at high effort via `modelSettings`). Research: `~/.claude/memory/research/2026-11-26-claude-effort-levels.md`.
- Site looks: the measurement (`.claude/reports/2026-11-26-site-look-cost.md`) showed structure facts 100% identical across clients, 57% of renders (the value-forms loop) identical, every build does all 104 blocks while a client uses 46–53 and a surface 5–18. Task 31 parts 1–2 brought forward (worker on `fix/look-fast`); part 3 after the deadline. The plan's Task 31 already says this.
- Follow-ups recorded in the plan: Sass compile cache keyed by file name only (`setting-record/diff.py::compiled_scss`); 82 bad `content-setting` gap rows; `deploy_ship.py` silently skips a missing `node_modules` link source (deploy from a worktree without it fails later with an unclear error) — NOT yet in the plan: add it as a follow-up (fix: fall back to the main checkout's folder via the git common dir, or abort with a clear message).
- GitHub Actions: repo is public (free runners). Worker on `fix/ci-route-tests` (worktree `E:/sgs-tmp/wt-ci`) is iterating; failures so far: DB-build step killed with exit 143 (SIGTERM from outside, likely its own `concurrency: cancel-in-progress` while it pushed often) and a SyntaxError in `scripts/computed-route/tools/ci-summary.mjs`. Not merged.
- VPS (KVM 2, 2 cores, 8 GB, 13 Docker services): not an offload target. Its details live in `~/.claude/skills/vps-deploy/references/vps-config.yaml` (memory note saved).
- Other session (editor lane, small-giants-wp-e7): its "Stage E1/E2" are editor Tasks 11–12, unrelated to this lane's restore tracks, now named R1 and R2 (plan Task 8). It changed hosted eye-care-test content at Bean's request (posts 199 and 11: trust-bar `pauseOnTouch:true` became `touchPause:"hold"`, backup `/home/u945238940/backups/db/darkcyan-grouse-898606.hostingersite.com-20261126-125857-before-touch-hold.sql.gz`) — Task 10's eye-care-test mirror must be refreshed before its render check (add to Task 10 if missing). Its future W5 item 3 moves 8 blocks off `style.spacing` and touches route writers (merge note already in the plan). It agreed G2 makes the trust-bar edit.js change for the stored marquee value; the editor lane rebases onto it.

## Branch / worker state now (update the plan's "Where it stands" table to exactly this)

| Branch | Worktree | State |
|---|---|---|
| `fix/review2-rf1910` | `wt-review2-rf1910` | second-review fixes of rf1, rf9, rf10 built; three mutation runs running directly (logs `E:/sgs-tmp/general-cloning/build/review2-rf1910/b2-*.log`); then batch 1 |
| `fix/f-mega` | `wt-f-mega` | done: two reviews and their fixes; batch 1; Bean eyeballs Eye Care brands cards |
| `fix/cart-trigger` (A4) | `wt-cart-trigger` | done: two reviews and fixes, deploy guard `deploy_cart_trigger_guard.py` (TEMPORARY, read-only, refuses a deploy while saved content holds old trigger keys, incl. options/postmeta, JSON-escaped and serialised forms); batch 1; live order: backup, copy sweep to server, dry run, apply, deploy |
| `fix/c-parts` | `wt-c-parts` | review fixes done and rebased; its variant-floor survey (`c-parts-survey`) queued; then batch 1 |
| `fix/l-layout` | `wt-l-layout` | done (tip `6a09a2a87`): first and second review fixes, hero `contentWidth` from the capped wrapper; proof via the batch sweep (indus-foods/home); Bean eyeballs the Indus hero |
| `fix/d-readings` | `wt-d-readings` | second-review fixes and look-read speed cuts done; account merge proven on a scratch mirror (written, read back, idempotent, 0 old names left); look-build timing running (`d-readings-looktime`); merges before the deadline clones only if it adds under 15 minutes per site |
| `fix/rf7-shop-forms` | `wt-rf7-shop-forms` | rebased (936/936 related tests); code review found 1 confirmed fault (wizard forms lose field widths) and 3 plausible; its worker is fixing them |
| `fix/s-shop` | `wt-s-shop` | Track S (Task 15) building on top of rf7 |
| `fix/g2-trustbar` | `wt-g2-trustbar` | Track G2 (Task 6) building, includes the trust-bar edit.js change and a ticker migration |
| `fix/e1-restores` | `wt-e1-restores` | restore track R1 done (link-only lists, slider visible-card count `lib/fill-visible-count.mjs`, `dcLogic` reach calls); in code review; proof via batch sweep |
| `fix/e2-restores` | `wt-e2-restores` | restore track R2 building |
| `fix/look-fast` | `wt-look-fast` | Task 31 parts 1–2 building; byte-identity proof queued |
| `fix/verdicts-refresh` | `wt-verdicts` | browser re-measure of 17 blocks running (priority); unblocks every deploy |
| `fix/ci-route-tests` | `wt-ci` | GitHub Actions route suite, iterating |

Merged this session: `fix/pagemap-draft-routes`, `fix/look-store`; earlier today (already in the plan): rf1–rf6, rf8–rf10, B, G1, nav-look, main-regressions, form-pairing-test, rf3/rf4/rf6 second-review fixes.

Plan task statuses: Task 2 (rf7 under review fixes; A4 ready), Task 3 C (fixed, survey queued), Task 4 D (see table), Task 6 G2 (building), Task 7 B (merged), Task 8 R1/R2 (R1 in review, R2 building), Task 9 F (ready), Task 14 L (ready), Task 15 S (building on rf7), Task 16 (waits on Bean's drafts), Task 10 (not started beyond Mama's update and the baseline), Task 31 (parts 1–2 building). Correct any status line in the plan that says otherwise.

## Tests and builds

Main's non-browser route suite: every failure from the morning full run passes on main; only known failure is the timing-sensitive font-wait test. No plugin build on main this session.

## Deploy state

Nothing deployed this session. Mama's live shop runs the build from before today (`wt-mamas-deployed` at `ed5effd01`); deploys to all targets are blocked by the stale browser verdicts until `fix/verdicts-refresh` lands.

## Docs you must update (in the main checkout, explicit pathspec, commit to main, do NOT push)

1. `.claude/plans/2026-11-25-land-fixes-and-editor-cleanup.md`: replace the "Where it stands" table with the table above; correct task Status lines; add the `deploy_ship.py` node_modules follow-up; add to Task 10 the eye-care-test mirror refresh (content changed 2026-11-26) and the cart-trigger, account-merge and ticker migrations in order with backups; note that per-branch sweeps for surfaces in the baseline sweep are not run. Keep it under the plan skill's size guidance where you can; do not delete decisions.
2. `.claude/LEDGER.md` Front H only (re-read and `git diff` first; parallel sessions edit it): short status: batch method, branches in flight, deploys blocked by stale verdicts (fix running), Mama's update pending, pointer to the plan's "Where it stands".
3. `scripts/computed-route/README.md`: add the shared look store row if missing (`SGS_LOOK_STORE`, default `E:/sgs-tmp/look-store`, empty disables; `site_look.py::write_block` takes a look from `<store>/<client>/<block>.<key>.json` when its key matches and writes the store copy after a build). Check the page-map rows describe draft-route parenting (`lib/intake-pagemap.mjs::ancestorSegments`).
4. `.claude/dev-setup.md` heavy-job paragraph: confirm it states the queue, one slot per job, the third slot at 8 GB free memory and CPU under 70% over a 5-second average, single test files run without a slot.
5. Run the impact script on this session's code commits (`d270e7a49 2572d9ee2 b3fd6efe3 161c5a8b9 5ff53d824 ffe9c4dab f36a030cc 5caca9ff3 747193830 018af52c1 ffc22b388`) and reconcile per the handoff skill; then `python .claude/hooks/handoff-preflight.py --check`.

Delete this brief file in your commit. Do not touch any `fix/*` branch or worktree, any site, the queue file, or `~/.claude` beyond reading.
