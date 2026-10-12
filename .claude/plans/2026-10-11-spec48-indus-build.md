---
doc_type: plan
title: "Spec 48 Indus build: Appendix B as phases, lanes and sessions"
spec: .claude/specs/48-CLONING-SYSTEM.md (Appendix B) and .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md (FR-32-14, FR-32-15, FR-32-20)
created: 2026-10-11
status: in progress
---

# Spec 48 Indus build

**Purpose.** Spec 48 Appendix B lists the 25 ordered steps that turn the Indus Claude Design export
(`sites/indus-foods/handoff/`) into a working SGS site through stages 0 to 5. This plan groups them into phases, each
closed by the done-when of the requirement it cites, and fixes who runs what, in which order, beside what. Quality and
reliability come first; a speed or cost gain is taken only where it adds no risk (Bean, 2026-10-11).

**Where it stands (2026-10-12).** Steps 1 and 3 to 7 are done; step 8's command is built and 13 of the 17 Indus
blocks are current, with four slot maps left stale on purpose (step 8 says why). Steps 9 to 12 are done (2026-10-12). Steps 2 and 13 to 25 are not started or are in the other lanes. Progress per step is marked in the phases below.

## Orchestration

### Lanes
| Lane | Where | Steps, in order | Needs | Agent time (Appendix B) |
|---|---|---|---|---|
| Route | session A (the one that wrote this plan) | 3 → 5 → 6 → 7 → 8 | 8 needs 4 | 3 h 15 |
| Mirror | session A, background subagent | 4, later 2 and 16 | nothing | 45 min, then 5 and 30 min |
| Framework | session B, prompt `.claude/prompts/2026-10-11-spec48-framework-lane.md` | 9 → 10 → 11 → 12 (queued) | nothing | 2 h 55 |
| Intake | session C, prompt `.claude/prompts/2026-10-11-spec48-intake-lane.md` | 13 → 14 → 14b | 3 pushed | 6 h |

The lanes join at step 15 (needs 8, 9, 14 and 14b). The critical path is the intake lane (3, 13, 14: about 5 h 45 by the
spec's figures, against about 12 h with every set-up and intake step in a row).

### Why these lanes (file-overlap proof, grep on 2026-10-11)
Two steps run side by side only when the files they write do not overlap.
- Step 3 rewrites the third-party imports in `calibrate.mjs`, `pairs.mjs`, `trace-check.mjs`, `lint.mjs`,
  `lib/fill-read.mjs`, `lib/handoff.mjs`, `lib/runtime-probe.mjs`, `lib/svg-screen.mjs`, `lib/trial-run.mjs`,
  `lib/winning-rule.mjs` and ten test files (`grep -rln node_modules scripts/computed-route --include=*.mjs`).
- Step 5 writes `lib/cache.mjs` (imported only by `calibrate.mjs`), `calibrate.mjs`, `lib/calibrate.mjs` and the
  default-paint readers `lib/fill-prop.mjs` and `lib/fill-resolve.mjs` (`grep -rln "defaultPaint\|paintKey"`).
- Step 6 writes `lib/calibrate.mjs` (the `forms: union(…)` line) and the marker and instance planners
  (`lib/calibrate-markers.mjs::markersFor`, `lib/calibrate-instances.mjs`).
- Step 7 writes the same planners (`gridTemplateColumns` is in `cache/container.json` `dead`),
  `lib/resolve.mjs` (`TIER_OF`, `tiersOf`, and the two ties that stop `container.layout`'s discovered values; its NULL
  `css_property` is by design, proven 2026-10-11, so no seeder edit or reseed).
- Overlaps: 3 and 5 share `calibrate.mjs`, 5 and 6 share `lib/calibrate.mjs`, 6 and 7 share the planners. So 3, 5, 6
  and 7 run strictly in sequence.
- Step 4 writes `scripts/local-wp/sync-build.sh`, `scripts/local-wp/README.md`, `calibration-targets.json`, a gitignored
  secrets file, the WSL mirror and one private page on `indus-test`: no route file, so it runs beside the route lane.
- Steps 13 and 14 write new files (`intake.mjs`, `lib/intake-*.mjs`, `lib/tokens.mjs`, `data/*.schema.json`); they
  need step 3's `package.json` and must not edit it (a new dependency goes back to session A) and edit only their own
  rows of `scripts/computed-route/README.md`.
- Steps 9 to 11 are framework files (`theme/`, `plugins/`). They run in sequence inside their lane until a grep proves
  them disjoint (9 and 15 both add tokens to `theme/sgs-theme/theme.json` and every snapshot).

### The serial queue
Deploys, DB reseeds, `local-indus` mirror refreshes, calibration runs and live-site writes run one at a time across
every session (they write the shared DB, the shared mirror or the live test site). Before each: `ListAgents`, then
`SendMessage` to every active peer naming the operation; after it lands, say so. Expected order: (a) step 4's
calibration page and mirror fill (done); (b) step 6's recalibration of heading and container on `local-indus` (done);
(c) step 12's refresh loop; (d) step 8's stage-0 calibration run. If (c) lands after (d), (c)'s recalibration step refreshes the slot maps it made stale.

### Model and QC per step
Every diff is read on the main thread before its commit. Every commit keeps the guardrails green.
| Step | Model | QC beyond the done-when |
|---|---|---|
| 3 | Sonnet | `npm ci` installs the lock; negative control: the lint ban turns red when its rule is removed |
| 4 | Sonnet | mirror answers `/wp-json/` 200; the calibration page is private and has the same ID on both sites |
| 5 | Sonnet | calibrating one block on two sites leaves the first site's `.paint.json` byte-identical |
| 6, 7 | Opus | each done-when case fails with its fix removed |
| 8 | Sonnet builds, Opus judges the run | the baseline counts are read against `cache/*.json`, not the command's own summary |
| 9 | Sonnet | every negative control in FR-32-14's done-when |
| 10, 11 | Opus | as their done-whens; 11 is security-relevant (CSS scoping) |
| 12, 16 | Sonnet | each refresh-loop step's own exit signal |
| 13, 14 | Opus | each case named in the FR done-whens; 14's `review.md` read by the main thread |
| 20, 23 | Opus | the check's verdict table and Bean's eye at 375/768/1440 |

**Estimate rule.** A step that finishes in a third of its estimate or less revises every remaining estimate down in
the same reply.
**Actuals (2026-10-11).** Steps 3 to 7 took 5 to 25 minutes of agent time each against 30 to 60 estimated, so
read every remaining Appendix B agent estimate at about a third.

**Guardrails on every commit.** `python scripts/check-spec-id-landing.py` and `--self-test` green;
`node --test "scripts/computed-route/tests/*.test.mjs"` fails only the 3 known `lint.test.mjs` brandName cases; never
edit or revert `sites/mamas-munches/theme-snapshot.json`; explicit-pathspec commits straight to `main`.

## Phases

### Phase 1. Set-up and stage 0 (Appendix B steps 1 to 8)
- [x] **1. Current export.** Passes `handoff-check.mjs` (2026-10-11).
- [x] **2. Test-site email** (done 2026-10-12). Appendix A step 6 on `indus-test` through the studio mailbox (sandybrown's
  login and key, `.claude/dev-setup.md` §Site email): From `Indus Foods (test) <admin@smallgiantsstudio.co.uk>`, digest and
  `--redirect-all-to` the studio mailbox; no client mailbox (Bean, 2026-10-12: the studio does not run Indus's domain or
  email). `provision-site-mail.py --target indus-test --check` exits 0; the test send is row 1 `sent` in `wp_fsmpt_email_logs`.
- [x] **3. Route dependencies** (done 2026-10-11; route suite 867/870, the 3 known failures). FR-48-75 done when: `npm ci` in `scripts/computed-route` installs the pinned set; a
  planted import from `plugins/sgs-blocks/node_modules` fails `lint.mjs`. (The G0 browser-version case lands with G0,
  Phase 6.)
- [x] **4. Indus mirror and targets** (done 2026-10-11: `local-indus` on port 8083, database `wp_indus`; calibration
  page 15 on both sites; overlay image attachment 18). Appendix A step 13 done: `local-indus` serves, its secrets file exists, the
  calibration page exists on `indus-test` and the mirror with one ID, and `calibration-targets.json` has `indus-test`
  and `local-indus`.
- [x] **5. Per-site default paint** (done 2026-10-11; a mirror shares its test site's paint through `mirrorOf`). §3.2 done when a run on one site never reads or overwrites another site's
  `cache/<site>/<block>.paint.json`, and the slot map stays one library-wide `cache/<block>.json`.
- [x] **6. Accepted value forms** (done 2026-10-11; also fixed `container.gridTemplateColumns`, step 7's first item). FR-48-2 done when recalibrating `sgs/heading` and `sgs/container` records `clamp` on
  a font-size setting that accepts it and `repeat` on the container's grid template setting, and a planted setting that
  strips `clamp()` records no `clamp`.
- [x] **7. Indus calibration fixes and the desktop tier** (done 2026-10-11). FR-48-74 done when `resolve.test.mjs` writes 48px at 1440
  and 52px at 1920 as desktop 48px with no gap, routes a declared `clamp()` with the same readings to the fluid path,
  and both cases fail with the 1920 merge restored (built 2026-10-11); plus `container.gridTemplateColumns` is not dead
  (done in step 6) and a flex row and a grid draft on the container's root resolve to `layout` `flex` and `grid`
  (the hide-on-device and `flex`/`stack` ties, FR-48-3).
  Left open, for Phase 5 (the header slice is the first Solve run that needs them): `solve.mjs` builds a row's
  `siblings` from difference rows only, so a flex-row draft whose live element is already a row stays `ambiguous` in
  Solve (Fill passes every draft property and resolves); calibration does not record the value a marker painted
  (`lib/calibrate.mjs::slotFor`), so a yes/no setting that reaches all three widths cannot be excluded by value; and
  the stack discovery records `flex-direction: column` on the root only, though the wrapper also forces it on
  `__inner`.
- [ ] **8. Stage 0 command and run.** FR-48-3 done when a stage-0 run on Indus writes
  `sites/indus-foods/build/intake/calibration-baseline.json` (validating against its Appendix C schema), refuses to
  report a block whose deploy hash differs from its cache as calibrated, and writes no default-paint file. Stage 0's
  exit (FR-48-16) then holds.
  Command built and fixtures portable (2026-10-11); 13 of 17 Indus blocks current, nav-drawer-menu recalibrated on
  `local-indus`. **Next:** prove why nav-bar-menu, site-header, media and nav-drawer lose settings on `local-indus`
  that Eye Care's run reaches (FR-48-3 status lists them; likely missing calibration content such as a badge menu
  item, a header background image or a video), extend `provision-calibration-refs.mjs`, then re-run stage 0 with the
  cache backed up and every block's settings diffed. Add a guard so a `--recalibrate` that would drop a setting the
  existing slot map reaches is refused, not written (a slot map is shared by every client).

### Phase 2. Spec 32 framework halves (steps 9 to 12, session B)
- [x] **9. Palette slugs** (code done 2026-10-12, commits 7815a2b9b, 8caab9757, 25a761b5b). FR-32-14: the five slugs in
  the framework and all nine snapshots, the completeness gate and push guard with negative controls, the container's
  Section ground toggle. Four non-client snapshots linked below 4.5:1 and take the darker shade of the same hue (Spec 32
  FR-32-14 status). The rendered colour check runs after step 12's deploy.
- [x] **10. Per-tier section padding and gutter tokens** (code done 2026-10-12, commits 2c9f4f5ed, 039c21622,
  2d4a1b876). FR-32-15: six tokens in every snapshot at today's values, `theme/sgs-theme/assets/css/layout-tokens.css`
  as their reader, the wrapper's `.sgs-container--section-pad`, the placeholder, the push guard. The Indus 375/768/1440
  parity check needs step 17's snapshot; the nested-section and token-change checks run after step 12's deploy.
- [x] **11. `sgsCustomCss` hardening** (code done 2026-10-12, commit d6c1d3968; its gate folded in 2d4a1b876). FR-32-20: parsed and scoped per instance (PHP and JS twins
  on one shared case table, one gate), stable instance key, core-block lift, `edit_css` save check, route label; three
  raw unscoped readers removed (the nav link helper, `nav-drawer`), guarded. The canvas-versus-page and head-collector
  checks run after step 12's deploy.
- [x] **12. Framework refresh loop** (done 2026-10-12). The framework lane reseeded the shared DB from a detached HEAD
  worktree (twice: for steps 9 to 11, then for the route lane's typography overrides 9295b6005), ran
  `dbschema/seed_reference_data.py` after each (a normal reseed leaves `sgs/hero.splitMediaType` as select-from-enum),
  and deployed `indus-test` at 3e1bdd9e9. FR-32-14, -15 and -20 were verified live there. The route lane then
  refreshed `local-indus` and ran stage 0: all 17 Indus blocks current (`stage0.mjs --plan` lists none to recalibrate),
  baseline in `sites/indus-foods/build/intake/calibration-baseline.json`. One live-check fix landed on the way:
  section padding is a per-role opt-in (`supports.sgs.sectionPadding`, sgs/container), so the site header takes none.

### Phase 3. Stage 1 intake (steps 13 to 15, session C, then the join)
- [x] **13. Intake 4a** (done 2026-10-12, session C). FR-48-23 and FR-48-28 done-whens; FR-48-24's census with
  `construct-registry.json`; the Appendix C schemas for the reading record, the registry and the baseline. Built as
  `lib/intake-sandbox.mjs`, `-record`, `-process`, `-prose`, `lib/intake-harness.mjs`, `lib/intake-reading.mjs`, the
  `lib/intake-census*.mjs` static and runtime passes and `lib/intake-registry.mjs`, each case with its MUST FAIL
  control; `tests/intake-schemas.test.mjs` holds every Appendix C schema equal to the spec. The Indus census (24
  visits at three widths) takes about 9 minutes and is identical across two runs.
- [ ] **14. Intake 4b.** FR-48-26, FR-48-30, FR-48-31, FR-48-32 done-whens; FR-48-27, FR-48-33, FR-48-34 and §3.4's
  skeleton inventory and proposal; `review.md` and `intake.mjs --apply-review` (FR-48-17); the intake and page-map
  schemas.
- [ ] **14b. Re-derived inventory and prop variants** (session C, Opus; needs 13; before 15). FR-48-25 and FR-48-29
  are on FR-48-17's work list but were in no Appendix B step (Bean, 2026-10-12: a step of their own, not built inside
  13 or 14). Until it lands, the motion construct kinds sit in `data/construct-registry.json` as gaps citing FR-48-25.
- [ ] **15. Intake run and Bean's review.** Stage 1's exit (FR-48-17): every census construct has a reader or a gap
  row, and every review row carries Bean's mark. Runs after session B's step 9 as well as 8 and 14b: the palette
  proposal reads the slugs from `theme/sgs-theme/theme.json`, so FR-32-14's new slugs reach it only once step 9 lands.

### Phase 4. Stage 2 site build (steps 16 to 19)
- [ ] **16. Appendix A on `indus-test`**, the steps not already done (may start after step 4).
- [ ] **17. Snapshot** (needs 12 and 15): the extractor reads `tokens/*.css` with the confirmed roles; dry run, then
  push.
- [ ] **18. Site build** (needs 15 and 16): FR-48-55, FR-48-58 and FR-48-59 done-whens.
- [ ] **19. Default-paint step** (needs 17): FR-48-18's exit, as the refresh loop's step 4.

### Phase 5. Header vertical slice (step 20)
- [ ] **20. Header through stage 5** (needs 11 and 19): FR-48-8 and FR-48-50 done-whens on the header, gates G0 to G7
  on its rows, and Bean's eye at 375/768/1440. The other surfaces wait until this passes.

### Phase 6. The rest of Indus (steps 21 to 25)
- [ ] **21. Trees**, **22. Forms** (FR-48-57's done-when; needs 2), **23. Check**, **24. Answer-sheet sample**
  (FR-48-71, FR-48-73), **25. Gap list and sign-off** (stage 5's exit).

After Indus: Mama's (shop surfaces, after Spec 27 FR-30-16/17 and fixture products).

## Decisions
- **FR-32-14 and FR-32-15 migrate every snapshot, `sites/mamas-munches/theme-snapshot.json` included** (Bean,
  2026-10-11), with values equal to what each site shows today.
- **Calibration fixtures become portable** (Bean, 2026-10-11): references resolved per calibration target, and a
  calibration menu, drawer and image on every test site (step 8).
