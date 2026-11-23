# Handoff brief: setting record plan Task 4 step 4 (proof clone) and the code review fixes, 2026-11-23

This brief is Step 1 of `/handoff` for the session `small-giants-wp-76`. The worker runs Steps 2 to 9 from it. The project is `C:\Users\Bean\Projects\small-giants-wp`; this session worked in the worktree `E:\sgs-tmp\wt-setrec-fix` (detached HEAD, pushed to `main` by `git push origin HEAD:main`). The shared main checkout `C:\Users\Bean\Projects\small-giants-wp` is behind `origin/main` (its `main` was at `a343f44ae`); run the worker in a checkout that is current with `origin/main`.

## Tasks and intended outcomes

1. **Trace the site look's differences from calibration's Mama's readings.** Outcome: every difference group named by cause. **Achieved.** The groups and causes are written in `.claude/plans/2026-11-21-setting-record.md` Task 4 "Step 4 inputs".
2. **The proof clone** (plan Task 4 "Done when": a Mama's clone on a scratch mirror no worse against its draft than calibration, every difference in Fill's writes classified, `site-check.mjs` passes; then Bean's eye, FP-13). **Code shipped, outcome not yet hit.** The record build is 10% worse than calibration on the same skeleton (calibration 4,611 open walker differences on matched draft elements, the record 5,083; 5,156 before the fixes). The cause of most of the rest is proven: the site look draws each block's default from the record check's enriched fixture (39 of 97 fixtures switch on extras such as the icon's label and the container's background layers), so `scripts/computed-route/lib/fill-part-pairing.mjs::rootIsPart` refuses to read the draft's one element as the part. **Bean chose option A on 2026-11-23**: split each fixture into the plain block (`attributes`, which the look draws, plus stand-ins a block needs to render offline) and the check's extras (a key of their own that only the check merges); records unchanged. Four Fill write groups are not yet traced (listed in the plan Status).
3. **Retire calibration** (plan Task 4 step 4's retirement). **Not started**: waits for task 2 to pass.
4. **Code review fixes** (Bean: "Fix all issues found by code review"). **Achieved** (see the review-fix commit).

## Commits this session (all on `main`)

- `a55a60fe7` fix(setting record): block context reaches fixture children; a child block's root named by its own class; instance ids mapped by the element whose class carries them; 11 records rewritten.
- `8b04423ae` fix(site look): a container drawn nested in its section; `pathAttrs` recorded.
- `f06b79acb` fix(route skeleton): the accordion's open/closed child read from the look's attributes (`unitSlots`).
- `7e3605300` docs(setting record): plan Task 4 status and step 4 inputs; LEDGER line.
- `6f566e6d7` fix(parity flows): `candidateRoots` reads `SGS_SECRETS_ROOT`.
- The review-fix commit(s) the main session makes after this brief (hash given to the worker in its prompt if known; otherwise `git log --oneline -8` on `main`).

## Code review (Step 1 close-out)

`/code-review` (medium) on `a55a60fe7^..6f566e6d7` found: (important) render cache files raced between threads when children re-render per job; an empty `pathAttrs` counted as recorded attributes; part settings could name a non-child as the resting child; a child broken by a job's context was drawn into an ok parent render; (pre-existing) children received the parent fixture's page-level harness context whatever their `usesContext`; (nits) `candidateRoots` replaced rather than added the worktree fallback and compared case-sensitively; `aria-current="false"` counted as current; `tested_attrs` read attribute-like brackets in declarations (named grid lines); `scripts/computed-route/data/skeleton-decisions.json` accordion `childSlots.reason` described the old reading. All fixed, each with a test that fails without the fix (`plugins/sgs-blocks/scripts/setting-record/tests/test_render_context.py`, `plugins/sgs-blocks/scripts/site-look/tests/test_site_look.py::test_tested_attrs_reads_attribute_selectors`, `scripts/computed-route/tests/skeleton-unit-slots.test.mjs` with `tests/skeleton-unit-slots-state.mutations.json` 7 of 7 killed, `scripts/parity/flows/tests/pure.test.mjs`). The buy box record (the one fixture with a page-context stand-in and children) still matches after the context fix.

## Findings (including ones where no file changed)

- The proof needed a same-skeleton A/B: the pre-switch worktree `E:\sgs-tmp\wt-setrec-pre` (at `d1723f886` with a copy of the calibration cache) built today's skeleton on the same scratch site. Comparing with the 2026-11-20 calibrated run mixed in three days of unrelated route work (its proposal differs). Memory saved: `prove-a-route-switch-on-one-skeleton-and-one-site`.
- `clone-surface.mjs` fails the proposal under `--strict` on three paint-conservation problems that the pre-switch code raises identically; the calibrated runs used `site-run.mjs` without `--strict`. Not a switch effect; no file changed.
- `site-check.mjs` drops page-map ids written for another site (`lib/site-build-map.mjs::rowsForSite`): a scratch copy of `local-mamas` holds the same ids but is treated as a different site, so only one page was checked. With the ids marker pointed at the copy for the run (not committed), 9 pages pass; failures are on surfaces not cloned in the proof (header sign-in link and "Subscribe & save" item; the Build your Zookie flow, absent from both builds). This scratch-copy gap is unfixed: record it as deferred work in the plan (it blocks a clean site check on any scratch copy).
- The nav menus' record fixture's only current page is a sub-link, so `itemColourCurrent` has no top-level element that shows it (header proof).
- `plugins/sgs-blocks/scripts/setting-record/tests/test_task3.py::test_a_block_written_in_sass_has_its_rules_read` fails without `SGS_NODE_PATH` (identically on `main`); passes with it. Pre-existing environment dependency.
- Framework DB reseeded by `seed_reference_data.py` (sha256 `b3bc104ed9ae` to `c6df5a343b63`; backup `E:\sgs-tmp\setrec-t4\sgs-framework.before-context-reseed.db`).

## State

- Branch: worktree detached, pushed to `main`; `main` HEAD after the review-fix push is the latest commit there.
- Tests: route suite with no cache folder 6,811 tests, 0 failing (on `f06b79acb`; rerun on the review fixes); setting-record and site-look Python suites 391 passed, 1 failed (the sass test above, environmental); record gate `check.py --changed` passes (104 records); `npm run build` passed on `f06b79acb`'s code; check-mutation-lists 0 new stale; check-no-client-names passes.
- Deploy: nothing deployed (scripts and data only). Mama's site looks on disk (`scripts/computed-route/site-look/`, gitignored) were built before the review's `site_look.py` change, so they rebuild on their next run.
- Scratch: scratch mirror `local-mediatest-setrec4` (port 8167, holds the record build of home), worktrees `E:\sgs-tmp\wt-setrec-t4`, `E:\sgs-tmp\wt-setrec-pre`, `E:\sgs-tmp\wt-setrec-fix`, `E:\sgs-tmp\wt-setrec-build`; evidence in `E:\sgs-tmp\setrec-t4` (side-by-side strips in `ab\pairs\`). The main session keeps them for the re-proof after option A.
- Uncommitted: `.claude/reports/serverside-render-disabled-audit.json` and `.md` (rewritten by `npm run build`, not this session's work; leave them).

## Docs known to need checking

- `.claude/plans/2026-11-21-setting-record.md` Task 4: Status already records option A, the measurements and the open groups; add the deferred `rowsForSite` scratch-copy gap and the review fixes' effect where relevant; check "Step 3 design" still matches (`unitSlots` now reads `pathAttrs`).
- `.claude/specs/48-CLONING-SYSTEM.md` §3.2 (block calibration) note and any FR describing the site look or the skeleton's unit pairing (FR-48-6).
- `.claude/LEDGER.md` line "**Calibration replacement:**" (already updated; the file is 24,555 of its 24,576-byte cap).
- `scripts/computed-route/README.md`, `plugins/sgs-blocks/scripts/setting-record/README.md`, `plugins/sgs-blocks/scripts/site-look/README.md` (updated in the commits; verify).
