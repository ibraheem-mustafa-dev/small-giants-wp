# Handoff brief, 2026-11-23 (setting record plan, Task 4 step 3)

Worktree: `E:\sgs-tmp\wt-setrec-t4` (detached HEAD, level with `origin/main` at `ed06a6c3d` when this brief was written). Commit from this worktree straight to `main` by explicit pathspec; do not push (the main session reviews first).

## Tasks and intended outcomes
1. **Setting record plan Task 4 step 3** (`.claude/plans/2026-11-21-setting-record.md`, Task 4): the cloning route reads the setting record (database `setting_placements`) and each client's site look (built offline from `sites/<client>/theme-snapshot.json` by `plugins/sgs-blocks/scripts/site-look/site_look.py`) instead of calibration's browser-measured cache. Outcome: route tests pass with no `scripts/computed-route/cache` folder. ACHIEVED: 6,807 tests, 6,804 pass, 3 skipped (local intake replay, local Indus fact record, a live canary test), 0 fail; `node scripts/computed-route/tools/check-mutation-lists.mjs`: 0 new stale.
2. **Align items regression fix (Bean asked mid-session, "don't defer")**: Fill could not write Align items, Justify content, Justify items or Align content since the 2026-11-22 per-device migration (`a6dfa5fab`), because the framework database lost those settings' allowed choices. ACHIEVED, on `main`.
3. **Code review of this session's code** (run in handoff Step 1): 5 important + 4 minor findings; 1 important finding dismissed after checking (see Findings), 1 minor deferred to the plan, the rest fixed in `2fdab59db`.

## This session's commits (all on `main`)
- `0eaf001ec` wip(route): the route reads the setting record (made by the previous session, rebased here)
- `eb2068d1b` the look is keyed by client, not site (Bean 2026-11-23: the `client` field on calibration-targets.json removed)
- `7349c1c7b` the record reader follows a rule's selector below its part (`lib/setting-record.mjs::rowPaths`, `compounds`); tools/record-fixtures.mjs
- `f9e50333d` fix(layout alignment): per-device alignment choices restored (seeder control name `TierSelectControl`; planner reads stored choices through `tierEnumDef`); shared DB reseeded with `sgs-update-v2.py --stage 1` (74 rows; backup `E:\sgs-tmp\setrec-t4\sgs-framework.before-align.db`)
- `d1723f886` two marker tests follow the alignment choices
- `7ab491213` tests read checked-in records (`scripts/computed-route/tests/fixtures/records/<client>/<block>.record.json.gz`); resolver candidates must be placed in the asked state (`lib/resolve.mjs::tiedBy`)
- `ac2e8b84e` a run builds its missing site looks in one parallel batch (`prepareLooks`, called by `lib/paint-gate.mjs::assertPaints` through `calFor.prepare`); plan status and LEDGER line
- `2fdab59db` the code review's fixes (tier reader as a media query evaluator, state part resolved in its state via `paintState`, root named by its modifier, `unplaced` list, stop message reasons and `--woocommerce`, per-device marker default, README signatures)
- `ed06a6c3d` plan note: the deferred review finding

## Findings (including where no file changed)
- The record writer's proof deliberately accepts a rule whose subject is a child of the named part (setting-record README); the misreading was the route reader's, fixed by `rowPaths`. Fifty stored selectors across twenty blocks name a subject below their part.
- Review finding "state vocabulary mismatch in tiedBy" was checked and dismissed: a record state is used only where the block_attributes row names none, and such rows are never candidates for a named state, so excluding them at rest is the intended behaviour.
- Pre-existing failures on `main` fixed on the way: `tests/part-look-signed-in.test.mjs` (stale since `ffe84db38`), `tests/calibrate-marker-shapes.test.mjs` (stale since `a6dfa5fab`), `tests/fill-equivalents.test.mjs` (the alignment regression).
- `tests/test_block_source_reader.py::test_real_tier_objects_state_the_choices_of_one_tier` had been failing on `main` since `a6dfa5fab` with no gate running it; it now also checks all four container alignment settings.
- The route's stale-tree guard, deploys: nothing deployed this session; no site touched. The shared framework DB was reseeded (stage 1 only).
- Large fixture records are stored gzip-compressed (5.7 MB of JSON as ~120 KB).

## State
- Branch: detached HEAD in `E:\sgs-tmp\wt-setrec-t4`, level with `origin/main` `ed06a6c3d`. No uncommitted session files (this brief is new).
- Build: no plugin build needed (no block code changed). Route suite green as above.

## Docs known to need changing, and why
- `.claude/plans/2026-11-21-setting-record.md` Task 4 Status: already updated for steps 1-3; add that the review fixes are `2fdab59db` (clones from `main` must start at or after it). Step 4 remains (proof clone, then retirement).
- `.claude/LEDGER.md` calibration replacement line (front for this plan): already says steps 1-3 on main; keep under the 24,576-byte limit (it is near it).
- Spec 48 (`.claude/specs/48-CLONING-SYSTEM.md`) §3.2 and calibration FRs: describe calibration as the source; the plan says they change at the retirement step (step 4), so mark nothing done yet, but correct any statement that is now false (e.g. that the route reads the calibration cache, that the paint gate advises `calibrate.mjs`), or record it as step-4 work in the plan.
- `scripts/computed-route/README.md`: updated in `2fdab59db`; check for other mentions of removed names: `calibrationForSite`, `clientOf`, `lookSite`, `AlignItemsTierControl`, `--paint-site`, `calibrationLoader( site`.
- `E:\sgs-tmp\setrec-t4\NEXT.md` is a scratch note, not a repo doc; ignore it.
- Used prompt file to delete: none in `.claude/prompts/` started this session (it started from the scratch NEXT.md); delete this brief in your commit.
