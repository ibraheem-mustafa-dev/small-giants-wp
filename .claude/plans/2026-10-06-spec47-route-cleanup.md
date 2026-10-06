---
title: "Spec 47 route cleanup: close every open point and make the measuring tool reusable"
project: small-giants-wp
created: 2026-10-06
status: runnable
governs: the route-defect fixes arising from Session C2's four diagnoses
references:
  - .claude/reports/2026-10-06-session-c2/QC-ROUTE-FIXES.md
  - .claude/reports/2026-10-06-session-c2/STEP3-RESWEEP.md
  - .claude/reports/2026-10-06-session-c2/BEAN-LIST.md
  - .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
---

# Spec 47 route cleanup

**Goal (Bean, 2026-10-06): clean up the measuring tool as much as possible to make it reusable.** Close
every point this session opened, including the pairing gate that was first deferred. The next session
categorises the 63 register items via `/phase-planner`.

**This plan is written to survive a compact.** Everything an executing session needs is here: every task,
the exact files it owns, its negative control, and the wave it runs in. No task requires re-reading the
four diagnoses — each has a brief file.

---

## The two structural facts that decide the orchestration

**1. Worktrees are not available for these lanes.** Five route test files need a built `node_modules`
(playwright/chromium): `walker-devtools.test.mjs`, `walker-l2.test.mjs`, `calibrate-read.test.mjs`,
`independent-check.test.mjs`, `wp-session.test.mjs`. Two of those are exactly the tests the hover and icon
fixes need. A bare worktree has no `node_modules` junction, so its browser cases fail for the wrong
reason. **Work on `main` with explicit disjoint pathspecs**, which is what `~/.claude/rules/git-hygiene.md`
calls for anyway.

**2. `scripts/parity/lib/collect.mjs` is the hub, and four separate fixes want it.** Just as
`sgs/social-icons` was the hub in the earlier block partition, `collect.mjs` is the hub here:
P3a (`centreOf`), P3c (`loops`), P2b3 (icon reader scope) and P1 (`iconKind`) all edit it. **They cannot
be split across agents.** One lane owns that file and does all four.

**Consequence for the SDD rule.** `subagent-driven-development` says never dispatch implementation
subagents in parallel. That rule exists to prevent file conflicts. Here the conflict set is *proven
disjoint per wave* and enforced by a gate (below), so parallelism within a wave is safe. The deviation is
deliberate and gated, not an oversight.

---

## File ownership map — the whole basis of the plan

| Task | What | Files it edits | Tests it writes |
|---|---|---|---|
| **H1** | Narrow `entranceStart` to the first viewport so an armed pose cannot cause a `sgsAnimationStart: load` write | `scripts/computed-route/lib/entrance.mjs` | new case in `tests/entrance.test.mjs` |
| **H2** ⚠️ **DO FIRST — LIVE BUG** | `sgs_transition_vars` rejects a non-integer instead of stripping it; `formatValue` gains a seconds → integer-ms branch. **Not latent: all 8 blocks that call the helper declare `transitionDuration` as `type: "string"`**, so `"0.3"` emits 3ms today on `sgs/hero`, `sgs/brand-strip`, `sgs/cta-section`, `sgs/gallery`, `sgs/info-box`, `sgs/post-grid`, `sgs/team-member`, `sgs/testimonial-slider` | `plugins/sgs-blocks/includes/helpers-tokens.php`, `scripts/computed-route/lib/resolve.mjs` | new case in `tests/resolve.test.mjs` + a PHP case asserting a decimal is refused, not stripped |
| **P2b1** | Exclude non-`summary` children of a closed `<details>` from `layoutElement` | `scripts/parity/lib/paint.mjs` | `tests/walker-refs.test.mjs` |
| **P2b2** | Retarget the `about-step-*` live finder from `.sgs-process-steps__title` to the step; delete the stale accept entry | `sites/eye-care-ward-end/build/qa/parity/home.mjs` | config regression assert |
| **P3b** | `armedEntrances` + `triggerArmed`: scroll armed entrances into view and settle before the resting read; emit `reveal-unfired` when one never plays | `scripts/parity/lib/devtools.mjs`, `scripts/parity/draft-live-walk.mjs` | `tests/walker-devtools.test.mjs` |
| **P3a** | Clamp the hover point to the rect∩viewport intersection, verify with `elementFromPoint`, return `unreached` rather than reading "no change" as a pass | `scripts/parity/lib/collect.mjs`, `scripts/parity/lib/chrome-walk.mjs`, `scripts/parity/lib/state-passes.mjs` | `tests/walker-devtools.test.mjs` |
| **P3c** | Record `loops` (properties animated by an infinite animation) and exclude them from style/hover rows; stop comparing `animation-name` | `scripts/parity/lib/collect.mjs` | new case |
| **P2b3** | Read `icon-*` only when the element is an SVG or contains exactly one painted SVG | `scripts/parity/lib/collect.mjs` | `tests/walker-l2.test.mjs` |
| **P1** | `iconKind` per side (svg/glyph/dashicon/null) + normalised `icon-colour`; suppress text props and `icon-fill`/`icon-stroke` when the kinds differ and one is a glyph. **No `icon-size`** (QC'd out). Glyph detector needs single-grapheme **plus** icon context | `scripts/parity/lib/collect.mjs`, `scripts/parity/lib/compare.mjs`, `scripts/parity/lib/ref-trace.mjs` | `tests/walker-reads.test.mjs`, `tests/walker-l2.test.mjs` |
| **P2a** | Twin-containment gate: new `judgePairScope`, computed in `runPairing`, captured in `pairs-page.mjs`, enforced by `lintConfig` so it exits 1 before a browser opens | **new** `scripts/computed-route/lib/pair-scope.mjs`, `scripts/computed-route/pairs.mjs`, `scripts/computed-route/lib/pairs-page.mjs`, `scripts/parity/lib/lint.mjs`, `scripts/parity/draft-live-walk.mjs` | `tests/pairs.test.mjs`, `tests/lint.test.mjs` |
| **P4** | Transition markers: duration `437` ms integer, easing from the PHP whitelist excluding `ease-in-out`; `slotFor` compares TIMING via an exported `timingSet` | `scripts/computed-route/lib/calibrate-markers.mjs`, `scripts/computed-route/lib/calibrate.mjs`, **export** `timingSet` from `scripts/parity/lib/compare.mjs` | `tests/calibrate.test.mjs` |
| **P3d** | Tighten triage's `transientOf` so a resting `opacity: 0.75` on a non-animated element is not swallowed | `scripts/computed-route/lib/triage.mjs` | `tests/triage.test.mjs` |

### Contention, read off that table

| File | Wanted by | Resolution |
|---|---|---|
| `parity/lib/collect.mjs` | **P3a, P3c, P2b3, P1** | **One lane owns all four** |
| `parity/lib/compare.mjs` | P1, P4 (export only) | Same lane as P1 does P4's export; P4 consumes it next wave |
| `parity/draft-live-walk.mjs` | **P3b, P2a** | Different waves |
| everything else | one task each | free |

### Hard dependencies

1. **H2 → P4.** `formatValue` must handle time before calibration lets the route write transitions, or it
   writes 25ms where 250ms was meant.
2. **P2b2 → P2a.** The gate needs the corrected `about-step` config as its own positive control.
3. **P1 → P4.** P4 needs `timingSet` exported from `compare.mjs`, which P1's lane owns.
4. **P3b → P3d.** The triage tightening is checked against a walker that no longer reads armed poses.
5. **P3b → P2a** (file only, not logic) — both edit `draft-live-walk.mjs`.

---

## The gate that makes parallelism safe

**Write this first, before any dispatch.** `scripts/computed-route/tests/check-lane-collisions.mjs`:

- Holds the wave → lane → owned-file-path map from the table above.
- Exits **1** on (a) any path owned by two lanes in the same wave, (b) any file in `git status --porcelain`
  that no lane in the current wave owns, (c) any lane that edited a file outside its own set.
- Exits **0** when the wave's partition is safe.

Run it immediately before dispatching each wave and immediately after the wave returns, before committing.
It is the structural answer to "will parallel agents collide" — not a promise to be careful.

The Session B checker (`.claude/reports/2026-10-05-session-b/check-queue-collisions.mjs`) is the precedent
but is **block-scoped** (`sgs/...`), so it cannot be reused directly for route files.

---

## Waves

Per wave: run the gate → dispatch the lanes in **one message** → gate again → main thread reads each diff
→ commit per lane with an explicit pathspec → run the full suite.

**Agents never commit, never deploy, never reseed, never touch a host.** Agents run `node --check` on
their own files and any **non-browser** test they wrote. **The main thread runs the full 523 at every wave
boundary** — if agents ran it mid-wave they would trip over each other's half-finished files and fail for
the wrong reason.

### Wave 1 — the write hazards and the isolated fixes (3 lanes, parallel)

| Lane | Tasks | Files |
|---|---|---|
| **W1-A** | H1, H2 | `entrance.mjs`, `resolve.mjs`, `helpers-tokens.php` |
| **W1-B** | P2b1, P2b2 | `paint.mjs`, `qa/parity/home.mjs` |
| **W1-C** | P3b | `devtools.mjs`, `draft-live-walk.mjs` |

Zero file overlap. **W1-A is the highest value in the whole plan and H2 is its first task**: H2 is a live bug
mangling any decimal transition duration on eight blocks today, and H1 stops the route writing an animation
setting from a measurement artefact.

**Wave 1 is complete.** Commits `809d30f8d` (H2 then H1, with the caller wiring), `1963180ac` (P2b1, P2b2),
`d72c88afe` (P3b), `2590fc00d` (gate and lane reports). Suite **535 of 535**, the 523 baseline plus 12 new
cases.

A fourth lane, **W1-MAIN**, was needed and is recorded in the gate. H1's viewport narrowing was **inert as
first written**: `entranceStart`'s `rects` parameter defaults to `g.rects`, which nothing in the codebase
assigns, so `inFirstViewport` read `undefined`, returned false, and the write was suppressed for EVERY
group — including the genuine first-screen case H1 exists to make. The lane's own over-suppression test
passed because a unit test supplies the rect itself, which made that negative control vacuous. `solve.mjs`
and `lib/triage.mjs` now pass `groupRects` of their own walker report, and `entrance.test.mjs` carries a
source-level detector asserting both callers still do — proven by planting the three-argument call back and
watching it go red. **The lesson generalises: a negative control that supplies the missing input itself
cannot see a wiring gap.**

### Also owned by this plan, added 2026-10-06

Two pieces of work were otherwise unassigned. Both are measurement work needing the same host window, so
they belong here rather than in a separate session:

1. **The 180 unconfirmed canvas-settable claims.** Session C2 refuted 29 from source and proved a named
   masking class (the `bgHoverZoom` 20), but **180 claims were never live-confirmed** — its planned
   Playwright step was substituted with source analysis. After P2a and the `canvasSettable` fix land, test
   them by **family, not by row**: the claims collapse to 68 families of (cited block, setting, row
   property), and 2 reads per family covers all 68 in ~101 readings instead of 209. Families span surfaces,
   so surface is the wrong axis.
2. **Three host jobs Session C left owed** (quiet shared host each): the **C3.5 confirmation walk** — order
   652 on eye-care-test is already `processing` and paid, so set `EYECARE_ORDER_URL` to its
   order-received URL and read the key with `wp eval`, **never store it**; an **`sgs/media` recalibration**
   to exercise the content reads on a block that has them, because `sgs/hero`'s run recorded nothing across
   17 qualifying settings and nobody knows whether that is legitimate; and a **`node scripts/parity/benchmark.mjs --noise`**
   re-run with control and noise back to back, since it caught 5 of 5 planted faults but its noise figure is
   unproven in both directions. Commands in `plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`
   §"Wave 3's remaining items".

Both slot into **Wave 4**, alongside the verification sweep, since they share its host window.

### Host serialisation against the other two tracks

Three tracks are live and **only this one may touch the host until its verification sweep completes**:

| Track | Prompt | Host |
|---|---|---|
| **1. This plan** | `.claude/prompts/Spec 47 Cleanup Prompt.md` | **owns the host** through Wave 4 |
| 2. The 5 approved block fixes | `.claude/prompts/Eye Care Block Fixes Prompt.md` | may write and test code in parallel; **must hold its deploy AND its reseed** until this plan signals clear |
| 3. The 63 register items | `.claude/prompts/63 Item Categorisation Work Prompt.md` | deploys and tests live, so it starts after this plan's sweep |

**Why, and it is not just politeness.** (a) `assertQuiet` aborts this plan's walks when `tar`/`rsync` runs
on the shared host. (b) Track 2 adds `block.json` attributes, so it needs an `sgs-update` reseed — and that
rewrites the shared framework DB that P4's calibration reads. (c) **Decisively: this plan's prediction of
F 193 → 148–168 is only single-variable if the live site does not change.** Track 2's fixes close ~19 rows
of their own; deploying them mid-sweep mixes two causes and reproduces exactly the "not separable" trap
Session C fell into with its 176 → 192 step.

### Wave 2 — the hub and the gate (2 lanes, parallel)

| Lane | Tasks | Files |
|---|---|---|
| **W2-D** | P3a, P3c, P2b3, P1 (+ export `timingSet`) | `collect.mjs`, `compare.mjs`, `chrome-walk.mjs`, `state-passes.mjs`, `ref-trace.mjs` |
| **W2-E** | P2a | new `pair-scope.mjs`, `pairs.mjs`, `pairs-page.mjs`, `parity/lib/lint.mjs`, `draft-live-walk.mjs` |

W2-D is the big lane and cannot be subdivided. W2-E takes `draft-live-walk.mjs` only after W1-C has
released it, and depends on W1-B's corrected config.

### Wave 3 — the dependents (2 lanes, parallel)

| Lane | Tasks | Files |
|---|---|---|
| **W3-F** | P4 | `calibrate-markers.mjs`, `calibrate.mjs` |
| **W3-G** | P3d + **R1** | `triage.mjs`, `tests/triage.test.mjs`, `tests/solve.test.mjs` |
| **W3-H** | **R2 + R3 + R4** | `sweep.mjs`, `issue-classes.mjs`, `solve-report.mjs` |

All gated on earlier waves; files disjoint.

**Four tasks were added to this plan on 2026-10-06** (Bean's decision, to close every open point). Spec 47
§5 Residual gives a named fix to twelve Session C2 defects and this plan's table owned nine.

| Task | What | Why it could not be left |
|---|---|---|
| **R1** | `triage.mjs::canvasSettable` respects the emission selector, not the property name alone | **This plan already depended on it** — Wave 4's 180-claim test is specified to run "after P2a and the `canvasSettable` fix land", and no lane built it. As written it would mask non-transition gaps on the next client |
| **R2** | A normalised row key beside `issue-classes.mjs::issueKey`, additive so no ledger entry re-keys | It is what stops **this plan's own** verification sweep reading a cosmetic path change as mass close-and-reopen. P1 and P2b3 both change emitted paths |
| **R3** | `sweep.mjs::latestReport` refuses a report older than the sweep's own start | A failed surface silently serves a stale measurement as a current one. Observed live on `header` |
| **R4** | The sweep surfaces the walker's `findings` and `unsettled` keys | Out of W1-C's own report: P3b emits `reveal-unfired`, and **nothing in the codebase reads `findings`**. The walker knew its measurement was untrustworthy and told nobody |

### Wave 4 — verification and closure (main thread, serial)

1. **Full suite**: `node --test "scripts/computed-route/tests/*.test.mjs"` — 523 existing plus every new
   case, all green.
2. **Route lint**: `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`.
3. **Client names**: `python scripts/check-no-client-names.py --check`.
4. **Config lint across all 17** (the gate Spec 47 §5 says existed but never ran):
   `node scripts/parity/draft-live-walk.mjs <each config> --lint`.

   ⚠️ **P2a's gate is inert until a pairing run populates `handScope`, and that needs a browser.**
   `judgePairScope` is computed once by `pairs.mjs` and written into `qa/pairs/<surface>.json`; every later
   walk lints from that file and exits 1 before a browser opens. **None of the 17 existing Eye Care pairing
   reports carries `handScope`**, so none is refused today and the "6 refused" figure cannot be checked
   without that run. So Wave 4 must **run `pairs.mjs` for the 17 surfaces first**, then lint. A surface is
   only judged once `pairs.mjs` has run for it since its pairs last changed — treat a missing `handScope` as
   "not yet judged", never as "passed".
5. **`/qc-council`** on the whole change set, per Bean. Two or more fix shapes landed, which is exactly
   its trigger.
6. **A verification re-sweep** (see the prediction below), host permitting and after messaging the peer.
7. **Docs**: Spec 47 §5 Residual loses every defect this plan closes and keeps what it does not;
   `LEDGER.md`; this plan marked complete.
8. **`/handoff`**, with the next session's prompt pointing at `/phase-planner` for the 63.

---

## The prediction, to be committed before the re-sweep

Recorded now so the verification is falsifiable rather than narrated, the same discipline that scored the
last sweep.

**F should fall from 193 to roughly 148–168, i.e. by 25 to 45 rows.** Expected contributions:

| Fix | Expected F rows cleared |
|---|---|
| P1 icon normalisation | ~11 (help accordion) |
| P2b3 icon reader scope | ~8 |
| P2b2 process-steps retarget | 6 |
| P2b1 closed-`details` descent | ~5 |
| P3b armed entrances | ~3 |
| P3c marquee dynamic | 2 |
| P2a gate | 6 refused at lint rather than reclassified |

**A fall outside that band means something other than these fixes moved, and the cause must be named
before the number is used.** Overlaps are possible, so the figures are not simply additive.

⚠️ **The baseline has moved TWICE, and only the first move was verified harmless.** eye-care-test runs
**`578a8830b`**, read from `~/.sgs-deploy-marker-eye-care-test.json` on the host (deployed 2026-10-06
16:12). Not `6d6906b98`, which this plan recorded, and not the `94122e326` that F 193 was measured at.

`6d6906b98` was verified not to affect Eye Care's 17 surfaces on three axes (`STEP3-RESWEEP.md`
addendum). **`578a8830b` was not.** 18 commits sit between them, and several touch rendering code:
`src/blocks/product-card` (2), `includes/hover-effects` (1), `includes/cart-line-summary` (4),
`includes/addon-price-list` (1), `src/shared/toast` (1). One of them, `e62f45952`, changes the stretched
link so a card title carries a real anchor instead of an empty overlay — expected to move nothing on
eye-care-test because no tree there enables `sgsBlockLinkAuto`, but that is a prediction, not a
measurement.

**So the single-variable claim behind the F band is weakened before the sweep runs.** Treat the band as
corroboration, not proof, and lean on per-fix row attribution instead: the solve reports survive on disk
under `sites/eye-care-ward-end/build/qa/solve/` (gitignored, so machine-local), which allows a row-level
comparison that an aggregate count cannot give. Record the SHA on the sweep either way.

⚠️ **The re-keying trap applies to this verification.** Row identity is `ref|path|kind|property`, and P1
and P2b3 change emitted paths. A cosmetic path change reads as mass close-and-reopen. Compare on a
**normalised** path, not the raw key, or the delta will be meaningless — this is the Gate TAIL defect this
session found, and it will bite this very sweep.

---

## Token-efficiency rules for the dispatch

- **Write one brief file per task** under `.claude/reports/2026-10-06-session-c2/briefs/<task>.md`, holding
  the diagnosis extract, the exact fix, the files owned, and the negative control. **Point agents at the
  path; never paste a diagnosis into a prompt.** The four diagnoses are long and pasting them into five
  lanes would multiply the cost fivefold.
- Each dispatch carries: one line on where the task fits, the brief path, the owned-file list, the
  report-file path, and the hard rules. Nothing else — no session history, no other lanes' state.
- Agents write their full report to a file and return only status, files touched, a one-line test summary,
  and concerns.
- Model: Sonnet for every implementation lane (these are well-specified mechanical changes against a
  written proposal). Route each through `/delegate` at dispatch time rather than hardcoding.

## Standing rules for every lane

- `.sgs-` BEM if any class name is emitted; UK English; cite by `path/file::symbol`, never line number.
- **No `deprecated.js`, no version bumps** — pre-production, per `.claude/rules/block-authoring.md`.
- Every change ships with its negative control: a test that goes red on revert **and** a test that proves
  it does not over-suppress. A fix that hides real differences is worse than the artefact it removes.
- **Never stage**: `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, any path containing `Bean Points`.
- Commit straight to `main`, explicit pathspec, `git branch --show-current` in the same command. Never
  `git add -A`, never a glob, never `git stash`.

## Effort

| Wave | Lanes | Estimate |
|---|---|---|
| Gate (write the collision checker) | main thread | 10 min |
| Briefs (12 task briefs) | main thread | 15 min |
| Wave 1 | 3 parallel | 20 min |
| Wave 2 | 2 parallel | 30 min |
| Wave 3 | 2 parallel | 15 min |
| Wave 4 verification + `/qc-council` | main thread | 40 min |
| Re-sweep (host, optional but it is the real proof) | main thread | 60 min |
| Docs + `/handoff` | main thread | 20 min |

Roughly **2.5 hours without the re-sweep, 3.5 with it.** The three waves are about an hour of that; the
verification is the bulk, which is the right shape for a change to the measuring instrument.

## First action, under 5 minutes

Write `scripts/computed-route/tests/check-lane-collisions.mjs` with the Wave 1 partition and run it
against a clean tree. It must exit 0. That is the gate everything else depends on.
