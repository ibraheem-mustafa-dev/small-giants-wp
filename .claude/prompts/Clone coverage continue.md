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
- The Indus intake re-run finished on Bean's PC on 2026-10-18 (98 minutes; draft-defects pass B alone took 78 minutes and prints nothing until it ends) and is committed (`71ae521`), with `--rerun-skeletons` applied. `node scripts/computed-route/check-approved.mjs indus-foods` reproduces all 93 of Bean's recorded decisions (exit 0). The old intake held no saved marks (his decisions live in `approved-decisions.json` and the standing rules), so "carried marks 0" was correct.
- review.md: 1,336 rows, 813 to read and 523 that Accept all covers. 184 of them are seen-but-unsupported rows: draft reading 67, content, media and icons 33, shop, forms and data 28, motion writer (4.0) 20, modes and values with no CSS property 12, behaviour recognisers 10, states 8, excluded 3, site and surfaces 1, and 2 not in the map (`html:image-slot`, `html:indus-logo`). Those 2 came from intake's skeleton path, which named a draft's custom elements by their own tag; fixed in the commit that wrote this note (`lib/intake-missing.mjs::coverageMissing` now counts them as `html:custom-element`, wave draft reading). The committed review still shows them until the next full intake run; Bean can mark both `gap:draft reading` by hand rather than re-run.
- The running page used 8 capabilities the file read missed (each still raised as a row): `input-type:email`, `input-type:tel` and `input-type:text` on Indus element 560 (the enquiry form's inputs), `svg:filter`, `svg:feGaussianBlur`, `svg:feMerge` and `svg:feMergeNode` on element 321 (an SVG filter the draft's script builds), and `css-function:max` in an inline style the running page set. They are draft-reading wave work (FR-48-85): the file read should find inputs whose type is set in code and SVG elements built in code.
- The clone coverage plan and the Indus build plan (`.claude/plans/2026-10-11-spec48-indus-build.md`) now run as one sequence (the coverage plan's Phase 4 "Order" subsection, agreed with Bean 2026-10-18). Each coverage wave names the Indus step it unblocks; Indus step 15 (Bean's intake review) does not wait for step 4.0, because motion transfers at Fill, not at the review, so it runs beside this work through `.claude/prompts/Track 1 Indus review.md`.

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
1. Done 2026-10-18 (see CURRENT STATE).
2. Step 4.0, the motion cloning writer (Spec 48 FR-48-78, Spec 38A FR-38A-33). Plan mode first; get Bean's approval.
   - Today `scripts/computed-route/lib/fill-entrance.mjs::sampleEntrances` measures entrances, and `::entranceWrites` still writes through the resolver. The flat animation settings it targeted were removed in Spec 38A S6, so every entrance comes out unmapped.
   - The writer writes per-element `sgsMotion` (entrance, hover, effect) through `scripts/computed-route/lib/motion-validate.mjs`, with motion fields read from the framework DB as Spec 38A decision 3 settles it, and token references where a value equals the client's token.
   - It must close every "motion writer (4.0)" entry in `scripts/computed-route/data/clone-coverage.json` (`capabilities.mjs --gaps`) or name it as a Spec 38 gap. Each coverage entry it closes gets its recognise, write and check references.
   - Done when FR-48-78's done-when holds, Indus's entrances clone with their measured timings at 375/768/1440, and a planted draft raises its row again with the writer removed.
   - Retire the gate's Phase 0 rule in the same work: `scripts/computed-route/lib/clone-coverage.mjs::coverageProblems` still requires every motion gap to carry `waiting: "phase-0"` and `::seedGaps` still adds it, though Phase 0 is built. Remove the rule and the field from the 163 gap entries that carry it (gap entries only), from `data/clone-coverage.schema.json` if it names it, and from its test in `tests/clone-coverage.test.mjs`; update Spec 48 §10's "Both directions" list of gate conditions and the plan's step 1.4 and Phase 4 waves line to match.
   - About 4 to 6 hours across two sessions. Indus step 20 (the header slice) needs it, as do Fill's entrances on every surface.
3. Then follow the combined order in the coverage plan's Phase 4 "Order" subsection; each item is its own plan-mode session, closed by its Spec 48 FR's done-when (`capabilities.mjs --gaps` lists none of its wave, `--gate` exits 0, and a planted draft raises its row again with the writer, recogniser or reader removed):
   - Draft reading (FR-48-85), including the 8 capabilities only the running page showed (see CURRENT STATE).
   - Site and surfaces (FR-48-84) and the media upload part of content, media and icons (FR-48-82), then Indus step 18 (site build).
   - States (FR-48-81), then Indus step 20 (header slice).
   - Phase 3, behaviour meanings in the framework DB, following the plan's "Next (first step)" under Phase 3: survey what the DB records for behaviour and content settings against each `block.json`, settle the shape of a meaning with Bean (what it does, its trigger, its parameters), build the detector first if more than 3 files change (`.claude/skills/migration-method/SKILL.md`), extend `sgs-update-v2.py` (the only DB writer) and reseed. Done when a behaviour setting with no recorded meaning fails a test. About 3 to 4 hours.
   - Behaviour recognisers (FR-48-80, absorbing Indus step 20b) and modes and values with no CSS property (FR-48-79), which both need Phase 3.
   - The rest of content, media and icons, and shop, forms and data (FR-48-82, FR-48-83), with Indus step 22 (forms).
   - Then Indus steps 21, 23, 24 and 25 (trees, check, answer sheet, sign-off).

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
