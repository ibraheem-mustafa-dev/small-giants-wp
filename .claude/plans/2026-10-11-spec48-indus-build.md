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

**Where it stands.** Step 1 is done: `node scripts/computed-route/handoff-check.mjs sites/indus-foods/handoff` →
`pass (0 failures, 2 warnings)` on 2026-10-11 (the warnings are `METHOD.md` and `READING-DC-FILES.example.md`
differing from the master copy; the check validates with the master). Progress per step is marked in the phases below.

## Orchestration

### Lanes
| Lane | Where | Steps, in order | Needs | Agent time (Appendix B) |
|---|---|---|---|---|
| Bean | Bean | 2 mailbox | nothing | 5 min |
| Route | session A (the one that wrote this plan) | 3 → 5 → 6 → 7 → 8 | 8 needs 4 | 3 h 15 |
| Mirror | session A, background subagent | 4, later 16 | 16 needs 2 (Appendix A step 6) | 45 min, then 30 min |
| Framework | session B, prompt `.claude/prompts/2026-10-11-spec48-framework-lane.md` | 9 → 10 → 11 → 12 (queued) | nothing | 2 h 55 |
| Intake | session C, prompt `.claude/prompts/2026-10-11-spec48-intake-lane.md` | 13 → 14 | 3 pushed | 5 h 15 |

The lanes join at step 15 (needs 8 and 14). The critical path is the intake lane (3, 13, 14: about 5 h 45 by the
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

**Guardrails on every commit.** `python scripts/check-spec-id-landing.py` and `--self-test` green;
`node --test "scripts/computed-route/tests/*.test.mjs"` fails only the 3 known `lint.test.mjs` brandName cases; never
edit or revert `sites/mamas-munches/theme-snapshot.json`; explicit-pathspec commits straight to `main`.

## Phases

### Phase 1. Set-up and stage 0 (Appendix B steps 1 to 8)
- [x] **1. Current export.** Passes `handoff-check.mjs` (2026-10-11).
- [ ] **2. Mailbox** (Bean). The Indus mailbox in hPanel and its password under a new key in the email secrets file
  (Appendix A step 6, `.claude/dev-setup.md` §Site email). Done when `provision-site-mail.py --check` can read the key.
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

### Phase 2. Spec 32 framework halves (steps 9 to 12, session B)
- [ ] **9. Palette slugs.** FR-32-14's done-when (five slugs in the framework palette and every snapshot with today's
  rendering kept; the completeness gate and the push guard each with negative controls). See Open question 1.
- [ ] **10. Per-tier section padding and gutter tokens.** FR-32-15's done-when.
- [ ] **11. `sgsCustomCss` hardening.** FR-32-20's done-when.
- [ ] **12. Framework refresh loop** (Appendix B), once for 9 to 11, through the serial queue.

### Phase 3. Stage 1 intake (steps 13 to 15, session C, then the join)
- [ ] **13. Intake 4a.** FR-48-23 and FR-48-28 done-whens; FR-48-24's census with `construct-registry.json`; the
  Appendix C schemas for the reading record, the registry and the baseline.
- [ ] **14. Intake 4b.** FR-48-26, FR-48-30, FR-48-31, FR-48-32 done-whens; FR-48-27, FR-48-33, FR-48-34 and §3.4's
  skeleton inventory and proposal; `review.md` and `intake.mjs --apply-review` (FR-48-17); the intake and page-map
  schemas.
- [ ] **15. Intake run and Bean's review.** Stage 1's exit (FR-48-17): every census construct has a reader or a gap
  row, and every review row carries Bean's mark.

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

## Open questions
1. **FR-32-14 and FR-32-15 add tokens to every snapshot, including `sites/mamas-munches/theme-snapshot.json`, which this
   track's guardrail forbids editing.** Session B stops at that file and asks Bean before its migration runs.
