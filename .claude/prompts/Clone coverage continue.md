Invoke /autopilot before doing anything else.

TRACK: Clone coverage plan (`.claude/plans/2026-10-12-clone-coverage-foundation.md`), after Phase 2. Written 2026-10-18 by the cloud session that settled step 1.6 and wrote Phase 2; `main` held its work at `3dc0ff8`, and the Spec 38A S7 close-out landed after it. This session runs on Bean's PC, where the framework DB, the gitignored files and the client test sites are available.

CONTEXT (plain English)
- SGS clones a client's Claude Design draft into a WordPress site through "the computed route" (`scripts/computed-route/`, governed by `.claude/specs/48-CLONING-SYSTEM.md`). The clone coverage plan makes "can we clone everything?" a test instead of a memory. A generated inventory lists every capability the framework offers and everything a draft can hold. A coverage map records, for each one, how the route recognises, writes and checks it, Bean's signed exclusion, or a gap naming the Phase 4 wave that will close it. A gate fails on any capability with no entry.
- Intake (stage 1 of a clone) reads which capabilities a draft uses from its files, with the running page as the check. It raises a "seen but unsupported" review row for each one the map does not cover. Bean ruled (2026-10-18) that these rows are accepted in bulk: review.md's Accept all marks each `gap:<wave>`, or `difference` when he excluded the capability, so he never reads them one by one.
- Spec 48 §10 now runs in both directions. Rows 11 (motion) and 12 (behaviour) point at the coverage map's gaps, and §10.1 holds the recogniser framework (FR-48-77) plus one requirement per Phase 4 wave: FR-48-78 motion writer (4.0), -79 modes and values with no CSS property, -80 behaviour recognisers, -81 states, -82 content, media and icons, -83 shop, forms and data, -84 site and surfaces, -85 draft reading. Each is done when `node scripts/computed-route/capabilities.mjs --gaps` lists none of its wave and `--gate` exits 0, with a planted draft that raises its row again once its writer, recogniser or reader is removed.

DONE (with commits, all on `main`)
- Phase 0, the Spec 38A motion model: built (S1 to S7; all four sites on `57d936225`, live motion QA 19/19). Bean still owes a look at the canary and a real-Safari check of canary page 5465 (LEDGER Front M). Motion cloning (FR-38A-33) is clone coverage step 4.0.
- Phase 1, the capability inventory, coverage map, gate and draft-side usage read: built and signed off (plan steps 1.1 to 1.6).
- Step 1.6's bulk acceptance (2026-10-18). A usage-read run on the Indus and Mama's redesign drafts found false rows and IDs no list held, fixed first in `4a28a73`:
  - A property mdn-data files under several groups counts only toward the groups its own spec defines (`text-transform` is Text, not MathML), and a vendor name counts as its standard property.
  - The motion flag matches whole function names, so `linear-gradient()` is no longer motion.
  - Catch-all IDs now exist for draft custom elements (`html:custom-element`), other embed hosts (`embed:other`), and SVG elements and CSS properties no browser lists (`svg:unlisted` and `css-property:unlisted`, both excluded by Bean).
  - The `gap:<wave>` Accept-all mark landed in `59b42b4`.
- Phase 2, Spec 48 in both directions: `e0650c9` (QC'd by an independent agent, approved by Bean); plan ticked in `b889a13`.

CURRENT STATE
- Bean started an Indus intake re-run on this PC on 2026-10-18: `node scripts/computed-route/intake.mjs indus-foods --record` on `main` at `3dc0ff8`. Every stage through "defects pass A: 3 visits, 66 defects and 46 incomplete left for pass B" finished. Then the window went quiet: pass B (`scripts/computed-route/lib/intake-run-defects.mjs`) logs nothing until it ends, and it forces the 46 leftover candidates on every route at three widths.
- Nothing is written until the whole run ends. Before it started, Bean's previous `review.md` was copied to `sites/indus-foods/build/intake/review.before-rerun-<stamp>.md` (never commit that copy). Marks carry over from `intake.json` only, so any marks Bean typed into `review.md` without running `--apply-review` live only in that copy.
- The committed `sites/indus-foods/build/intake/intake.json` and `review.md` are still the 12 October run.
- The Indus clone is paused at Bean's intake review (`.claude/plans/2026-10-11-spec48-indus-build.md` step 15) until step 4.0 lands.

READ FIRST
- `.claude/plans/2026-10-12-clone-coverage-foundation.md` in full (Phases 3 and 4 especially).
- `.claude/specs/48-CLONING-SYSTEM.md` §10 and §10.1 (FR-48-77 to FR-48-85), FR-48-34, FR-48-47, Appendix C "Review marks".
- `.claude/specs/38A-SGS-MOTION-MODEL.md` FR-38A-33 and decision 3 (for step 4.0).
- `scripts/computed-route/README.md`: the entries for `lib/capabilities.mjs`, `lib/clone-coverage.mjs`, `lib/intake-usage.mjs`, `lib/intake-missing.mjs`, `lib/intake-review.mjs`, `lib/motion-validate.mjs`, `lib/fill-entrance.mjs`.
- `.claude/LEDGER.md` Fronts M and H.

TASKS, IN ORDER

0. Start-up checks (5 min):
   - `git pull` on `main`, then `cd scripts/computed-route; npm ci`.
   - `node capabilities.mjs --check`. S7 reseeded the DB; if it reports out of date, run `--write`, then `--gate`, and remove any orphan coverage entry the gate names. Never change an `excluded` entry without Bean's ruling.
   - `node capabilities.mjs --gate` must exit 0.
   - Done when both pass.
1. Finish and check the Indus intake re-run (inline; 15 min of work, up to 2 hours of machine time).
   - Ask Bean whether the PowerShell window is still open and what its last line says.
   - If pass B is still running: check that node and Chrome are using CPU (`Get-Process node, chrome | Sort-Object CPU -Descending | Select-Object -First 5`), and allow up to about 90 minutes after the pass A line.
   - If it is hung (no CPU for several minutes, or past 90 minutes): Ctrl+C, then re-run `node scripts/computed-route/intake.mjs indus-foods`. Leave out `--record`, since the replay file was recorded in the first two minutes; if it says the replay is missing, add `--record` back.
   - When it ends, it prints `indus-foods: wrote … review.md (N rows)`. Then check:
     - Count the rows: `(Select-String -Path sites\indus-foods\build\intake\review.md -Pattern "gap:").Count`, expected about 170.
     - Every `missing:coverage:*` row proposes `gap:<wave>`, or `difference` for an excluded capability, and none names an ID outside the coverage map.
     - Bean's earlier marks were carried (`intake.prev.json` sits beside it).
     - The waves match those in `capabilities.mjs --gaps`.
   - Then run `node scripts/computed-route/intake.mjs --rerun-skeletons indus-foods` (standing rules) and `node scripts/computed-route/check-approved.mjs indus-foods` (must exit 0).
   - Commit `sites/indus-foods/build/intake/intake.json`, `review.md`, `finalise-request.json` (if changed) and `sites/indus-foods/build/page-map.json` by explicit pathspec, never the backup copy.
   - Done when the regenerated review is committed and the counts are reported to Bean in a short table by wave.
2. Step 4.0, the motion cloning writer (Spec 48 FR-48-78, Spec 38A FR-38A-33). Plan mode first; get Bean's approval.
   - Today `scripts/computed-route/lib/fill-entrance.mjs::sampleEntrances` measures entrances, and `::entranceWrites` still writes through the resolver. The flat animation settings it targeted were removed in Spec 38A S6, so every entrance comes out unmapped.
   - The writer writes per-element `sgsMotion` (entrance, hover, effect) through `scripts/computed-route/lib/motion-validate.mjs`, with motion fields read from the framework DB as Spec 38A decision 3 settles it, and token references where a value equals the client's token.
   - It must close every "motion writer (4.0)" entry in `scripts/computed-route/data/clone-coverage.json` (`capabilities.mjs --gaps`) or name it as a Spec 38 gap. Each coverage entry it closes gets its recognise, write and check references.
   - Done when FR-48-78's done-when holds, Indus's entrances clone with their measured timings at 375/768/1440, and a planted draft raises its row again with the writer removed.
   - About 4 to 6 hours across two sessions; this is what the Indus clone waits on.
   - Bean decides the order of steps 2 and 3. Recommend step 2 first, because it unblocks the Indus clone.
3. Phase 3, behaviour meanings in the framework DB (framework lane, plan mode first). Follow the plan's "Next (first step)" under Phase 3:
   - Survey what the DB records for behaviour and content settings against each `block.json`.
   - Settle the shape of a meaning with Bean (what it does, its trigger, its parameters).
   - Build the detector first if more than 3 files change (`.claude/skills/migration-method/SKILL.md`).
   - Extend `sgs-update-v2.py`, the only DB writer, then reseed.
   - Done when a behaviour setting with no recorded meaning fails a test. About 3 to 4 hours.
4. Phase 4's other waves (FR-48-79 to FR-48-85), ordered by the Indus re-run's seen-but-unsupported rows. Each wave is its own plan-mode session, closed by its FR's done-when.

OPEN ITEMS FOR BEAN
- Confirm that the two catch-all exclusions (`svg:unlisted`, `css-property:unlisted`) are what he meant. He ruled on the mesh-gradient SVG elements and `enable-background` seen in an exported logo, and the catch-alls also cover any future element or property no browser lists.
- Deferred to Phase 4: rows for partly covered CSS groups (colour, fonts, box model) still read "seen but unsupported", though Fill reads some of their properties.

GUARDRAILS
- `cd scripts/computed-route && node capabilities.mjs --gate` stays green, and `node --test tests/clone-coverage.test.mjs tests/capabilities.test.mjs tests/intake-usage.test.mjs tests/presentational-hints.test.mjs tests/intake-coverage-rows.test.mjs tests/intake-review.test.mjs` passes; so do `node lint.mjs` and `node --test tests/intake-missing.test.mjs tests/intake-finalise.test.mjs`.
- `data/capabilities.json`, `data/presentational-hints.json` and `.claude/reports/2026-10-17-clone-coverage-gaps.md` are generated (`capabilities.mjs --write`, `tools/presentational-hints.mjs`, `capabilities.mjs --gaps`). Never hand-edit them. `data/clone-coverage.json` is hand-maintained: entries change only with evidence, and `excluded` entries only on Bean's explicit ruling.
- No client or reference-site name in code or data outside `sites/` (`python scripts/check-no-client-names.py --check`; the route lint also checks).
- Docs state current truth only, cite code by symbol, and are never hard-wrapped (`python scripts/check-md-wrap.py --check <file>`).
- Commit straight to `main` by explicit pathspec, with `git branch --show-current` in the same command; `git pull` first; never stash. Other sessions commit to `main` at the same time.
- Every new rule gets a MUST FAIL test that fails with the rule removed.

ENVIRONMENT NOTES
- A cloud checkout lacks the framework DB, the gitignored calibration cache (Spec 48 cites `cache/mega-group.json`) and the generated `02-SGS-BLOCKS-REFERENCE.md`. There, `lint-spec-drift.py` and `handoff-preflight.py` show those as failures that pass on this PC. A cloud session also counts too few scripts for `generate-tooling-catalogue.py`.
- `sgs/hero::splitMediaType` flips role between seeder runs and leaves `attr-role-map.json` modified after local gate runs. Restore that file before a pull (LEDGER Front M).
