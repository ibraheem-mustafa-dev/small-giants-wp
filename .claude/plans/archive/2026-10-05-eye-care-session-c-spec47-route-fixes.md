---
title: "Eye Care Session C: repair the measuring route (Spec 47 gaps only)"
project: small-giants-wp
created: 2026-10-05
status: complete at `b0492a5af` (Waves 0 to 3 and Gates 1 to 3 all passed; three host jobs owed, see "Wave 3's remaining items")
governs: Session C of .claude/plans/archive/2026-10-04-eye-care-sweep-audit-fix.md
references:
  - .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
  - .claude/plans/archive/2026-10-04-eye-care-sweep-audit-fix.md
  - .claude/plans/archive/2026-10-05-eye-care-session-c2-finding-assessment.md
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - scripts/computed-route/README.md
---

# Eye Care Session C: repair the measuring route (Spec 47 gaps only)

**Goal:** every declared-but-unbuilt and known-broken part of Spec 47 is built, the route stops producing findings
that ignore how the framework works, and a fresh measure-only sweep and triage on the repaired route record a new
framework-gap count. **No block controls and no shared CSS files are touched in this session.**

**Status: COMPLETE at `b0492a5af`** — Waves 0 to 3 and Gates 1 to 3 all passed, no block code touched. **The route result is raw F 338 to 176, measured on identical Solve reports. The current measured state, on a fresh sweep of all 17 surfaces at block code `7f375f765`, is raw F 192** (`qa/triage/*.json`), and the 176 to 192 step is not separable. A Gate 3 council corrected 12 of this plan's own claims; read "Gate 3 — QC council" before quoting any figure from it. **Three host jobs remain owed** — see "Wave 3's remaining items". Bean approved this work and set its order: the route first, the findings afterwards.
The brief he worked from is the Gate B doc, https://claude.ai/code/artifact/d3b24008-a0bc-403f-83ae-a8788dd7501f.

## Why the route is repaired before any finding is judged

Four reasons, and they set the whole scope.

1. **The fix register is the source of truth.** `.claude/plans/2026-10-02-eye-care-fix-register.md` already holds
   the decided issues and their decided fixes. The 163 walker rows Session B classed **F** are *findings to assess*,
   not a list of gaps to build. A walker row never creates a new fix.
2. **Many of those findings ignore how the framework works.** choice-flow, mega menus and modals are CPT-based
   canvases composed from blocks, so "this block declares no setting" is not a defect by itself: the value can sit
   on a block already in the canvas, or arrive from a parent by block context. Bean: the lens flow looks almost
   perfect, yet it carries 35 F rows.
3. **The grouping G1 to G8 is rejected as a unit of work.** `SGS_Container_Wrapper` must not be applied as a
   blanket fix (it brings far more than a layout panel), and the claim that
   `sgs/nav-bar-menu::itemTextDecorationHover` was "the framework's only hover-decoration control" was false:
   `sgs/button::textDecorationHover`, `sgs/nav-drawer-menu`, and the `.sgs-hover-underline-slide` / `-fade`
   utilities all exist, and register items S2 and S12 already decide link behaviour.
4. **Those bad findings are a route defect.** So the route is repaired *before* the findings are judged.

Judging the findings is **Session C2**, on the post-C sweep, planned in
`.claude/plans/archive/2026-10-05-eye-care-session-c2-finding-assessment.md`. The block work (W1 and W2 there) sits behind
Bean's per-item approval.

## Two sittings

The session splits at Gate 1: **sitting i** is Waves 0 and 1, **sitting ii** is Waves 2 and 3. Both are Session C.
Every gate is a clean stop, so a follow-on session resumes from this plan without reading anything else.

## Scope

**In scope: Spec 47 route and logic gaps only.** Every item is listed in "The work" below with a lane. Nothing in
that list is deferred: the only way an item leaves it is proof that it is already built or no longer applies, cited
as `file::symbol` or a named test, recorded in this plan beside the item.

**Out of scope, with where each lives instead:**

| Left out | Where it goes |
|---|---|
| Judging any walker finding; matching rows to register Refs | Session C2 steps 1 to 3 |
| Block controls, `block.json`, `render.php`, block `style.css`, theme CSS, shared helpers | Session C2 step 4, after Bean's per-item yes |
| The 447 **T** rows (values the next run writes) and the 28 **U** rows | Session D, `plans/2026-10-04-spec47-full-coverage.md` "Progress" |
| `sgs/google-reviews`: 3 F rows, 8 deferred icon combos, all attribution work | the parallel Google reviews track (closed 2026-10-05, `plans/archive/2026-10-05-google-reviews-attribution.md`); expect it to deploy |
| The register items whose cause is already proven in code and whose fix is already decided | a parallel track, `plans/archive/2026-10-05-eye-care-register-proven-repairs.md`, which runs beside this session and touches only `plugins/` and `theme/` |
| Spec 47 stage 5, a second draft from a different designer | blocked: no second draft exists. See "The one item not built" |
| Spec 47 stage 6, handover to Spec 31 | a Spec 31 decision under Spec 31's own plan (`sc_var_responsive_bridge.py`) |

**Open in Spec 47 but owned by Session D, not this session.** These are open *route results* on particular
surfaces, not route *gaps*. None is dropped; each names its owner. Bean can move any of them into Session C.

| Spec 47 item | What it is | Owner |
|---|---|---|
| §5 R2a Contact's hours-list row gap | Session B proved it a confirmed framework gap (`sgs/business-info` has no gap control for that row) | Session C2's list |
| §5 R2a Contact's address width | Closed: no width row remains open on `cr-ref-contact-13/15/17`; the declared-width write holds | nothing to do, recorded in `plans/2026-10-04-spec47-full-coverage.md` |
| §5 R2a the form's select height | a finding | Session C2's list |
| §5 R2c Home re-run with full coverage | a per-surface Solve run | Session D |
| §5 R2e Help measured only under the old guard | a per-surface Solve run | Session D |
| §5 R2f Contact's 375px name-field drop (CR15 / N45b) | deliberately open: Bean decided the subtext keeps its 22px margin | the register |

**Exception: Lenses' three regressions** (§5 Residual, the per-surface bullet). Solve wrote them, so they are a candidate route defect, not a
surface result. **L8 diagnoses them read-only** and returns a verdict: route defect (fixed in this session) or tree
value (Session D). It is not dropped and not assumed.

## Success criteria

Session C is done when all five hold:

1. Every item in "The work" is built, or carries proof in this plan that it was already built or no longer applies.
2. `node --test "scripts/computed-route/tests/*.test.mjs"` passes, and each new behaviour has a MUST-FAIL test that
   was shown **red before the fix and green after**, named in the commit.
3. `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json` passes;
   `python scripts/check-no-client-names.py --check` passes; every new export and test is listed in
   `scripts/computed-route/README.md`.
4. A fresh **measure-only** sweep and a triage of all 17 surfaces have run on the repaired route, from clean HEAD,
   with the same command and flags as the 2026-10-05 baseline.
5. **The new framework-gap count is recorded**, with what moved and why, as Session C2's input.

Criterion 5 is the session's point. A lower F count is the expected outcome, not a required one: the honest result
is whatever the repaired route measures.

## Orchestration

**The main thread coordinates and verifies only. It writes no feature code.** Every lane is one subagent with
`isolation: "worktree"` and a fixed file list. An agent that needs a file outside its list stops and reports.

**Shared files no agent edits:** `scripts/computed-route/README.md`, `scripts/computed-route/lint.mjs`,
`sites/eye-care-ward-end/build/surfaces.json`, `sites/eye-care-ward-end/build/qa/divergences.json`, the framework
database and its seeding channels. Each agent returns its README entries (new exports, new tests) **as text**; the
main thread merges them once per wave.

**Agents never** build, deploy, reseed, commit, run gates, or touch a host. Each agent runs **phase 1 read-only
diagnosis plus a written approach**, then a main-thread check, then **phase 2 with a MUST-FAIL test shown red
before the fix**.

**Check for collisions again** whenever an agent's phase-1 approach names a file outside its list.

## Do not stage another session's work

Two or more sessions share this worktree, so the commit discipline is part of the plan, not a detail.

- **Commit straight to `main` with an explicit pathspec** (`git commit -- <paths>`), checking
  `git branch --show-current` in the same command. **Never `git add -A`, never a glob, never `git stash`**: on a shared
  worktree a stash sweeps another session's uncommitted files and a glob sweeps a half-done edit into your commit.
- **Read `git diff --cached --name-only` before every commit.**
- **Never stage** `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, any path containing `Bean Points` (Bean's
  private notes), or another session's `plugins/sgs-blocks/tests/php/*` edits.
- **Agents never commit at all.** The main thread commits each lane after reading its diff.
- A gate bypass is allowed only for violations that are genuinely not this session's work, and it is disclosed in
  the commit message as `[gates-ok:<reason>]`. **Never `--no-verify`.**

## The work

### Wave 0, main thread, serial

| id | Item | Done when | Time |
|---|---|---|---|
| **C0.1** | Confirm live = HEAD by checksum | the deployed sgs-blocks build is checksum-equal to the local build of HEAD, with the command recorded. The Google reviews track was mid-deploy to eye-care-test at Session B's handoff, so the recorded block code `4726700c1` may be stale | 5 min |
| **C0.2** | Clear the sandybrown deploy blocker | `build-deploy.py --target sandybrown` passes its oldshape audit. **Found already clear at C0.2** (page 4750 held 1 byte and 0 `sgs/cta-section` blocks; the gate's own audit passed over 483 posts). It had aborted on 155 old-shape blocks there. Migrate with `scripts/wp-migrate-oldshape-blocks.js` or empty the page (calibration replaces it with an empty tree at the end of each run anyway). **Never `--skip-oldshape-audit`**. The parallel repairs track needs sandybrown too: whoever reaches this first does it, and the other checks whether it is already cleared | 10 min |
| **C0.3** | W0a: 15 new ledger entries | see "W0a in detail" below. `node scripts/computed-route/lint.mjs --register .claude/plans/2026-10-02-eye-care-fix-register.md --surfaces sites/eye-care-ward-end/build/surfaces.json` passes, and a planted bogus register id turns it red | 10 min |
| **C0.4** | Record the baselines | four numbers written into this plan: the route test count, the **ambiguous-row count**, the F count (**raw 338**; the audited figure is 163 and the two are not comparable), and `calibration.discovered` counts per block. Every later gate compares against these | 5 min |

**C0.4 matters most.** Two Wave 1 changes (L1.1's context hop and L1.4's canvas hop) widen the candidate set, so
rows that resolve today can become `ambiguous`. A rise in that count is a **fail**, and it cannot be detected
without the baseline.

#### Wave 0 results, measured 2026-10-05

**C0.1 — live = HEAD, proven by the deploy marker and a code diff.** The recorded block code `4726700c1` was
stale, as suspected. `~/.sgs-deploy-marker-<target>.json` in the SSH home (written by
`build-deploy.py::write_deploy_marker`) records **eye-care-test and sandybrown both at `7f375f765`**, deployed
2026-10-05 19:38 and 19:30 — the Google reviews track finished its deploy to both sites. `7f375f765` is an
ancestor of HEAD `c683e942b`, and
`git diff --name-only 7f375f765..HEAD -- plugins/sgs-blocks/src plugins/sgs-blocks/includes plugins/sgs-blocks/*.php theme/`
is **empty**: the four commits since are docs-only. **So the live block code is identical to HEAD's, and C3.6's
sweep is recorded at block code `7f375f765`.** The peer repairs track confirms it has deployed nothing to
eye-care-test and has run no reseed.

**C0.2 — no work needed; the blocker was already gone.** Calibration page 4750 holds **1 byte and zero
`sgs/cta-section` blocks**: calibration replaced it with an empty tree at the end of its last run. Because
`--dry-run` *skips* the oldshape step, the gate was replicated read-only — target post types enumerated with the
same `NON_BLOCK_POST_TYPES` exclusions, one bulk `wp post list --format=json` fetch, then
`plugins/sgs-blocks/scripts/audit-post-content-blocks.py <dir> --check --baseline
plugins/sgs-blocks/scripts/oldshape-audit-baseline.json`: **483 posts scanned, exit 0, PASS**, findings
`[INFO] empty-innerblocks` only plus 6 already baselined. The peer track was told sandybrown is clear to deploy.

**C0.4 — the four baselines. Every later gate compares against these.**

| Baseline | Value |
|---|---|
| Route tests | **237 of 237 pass**, host quiet (`node --test "scripts/computed-route/tests/*.test.mjs"`) |
| Ambiguous rows | **43** (triage verdicts carrying a resolver `gap: 'ambiguous'`, across all 17 surfaces). A rise is a Gate 1 **fail** |
| `calibration.discovered` | **623 entries across 94 blocks**. Cache dir holds 190 files = 94 `<block>.json` caches + 96 `<block>.tree.json` trees. **`theme-toggle` is the only real block with no cache**, confirming CR12 (L5.3); `empty` is the empty-tree fixture, not a block |
| `enumSettings` pool | **633 rows** exactly (`css_property IS NULL AND enum_values IS NOT NULL`) |

⚠️ **The F count has two values, and confusing them would wreck C3.8.** The committed triage files hold the
**raw** machine classification; this plan's headline figures are Session B's **audited** classification.

| Class | Raw triage (`qa/triage/*.json`) | Session B's audit of the raw F | Audited (this plan's figures) |
|---|---|---|---|
| W | 1,562 | +148 | **1,710** |
| F | **338** | 163 stay F | **163** |
| T | 445 | +2 | **447** |
| U | 28 | — | **28** |
| D | — | 17 | **17** |
| deferred | — | 8 | **8** |
| **Total** | **2,373** | 338 audited | **2,373** |

Session B audited all **338** raw-F rows (grouped as 271 combos in
`.claude/reports/2026-10-05-session-b/b2/*-verdicts.json`, every one with `candidate: 'F'`) and split them
163 F / 148 W / 17 D / 8 deferred / 2 T. Both columns total 2,373 and reconcile exactly.

**Consequence for C3.7 and C3.8.** A re-run of triage produces a **raw** number, comparable to **338** and
**never to 163**: comparing it against 163 would report a false catastrophic regression. Worse, **148 of those
338 rows were already hand-moved from F to W by Session B for substantially the reasons FR-47-8's canvas rule
automates** — so much of the canvas rule's benefit is already inside the audited 163 but absent from the raw 338.
**C3.8 therefore reports raw-against-raw (338 → new raw F) as the headline**, states the per-lane movement
against that, and says plainly that an audited-equivalent figure needs Session C2's judgement and is not
something this session can produce.

**C0.5 — one definition of a distinct open issue (new item, structural).** `lib/sweep.mjs` and `lib/triage.mjs`
each held their own copy of the four values that make a surface's triage count equal its sweep count: the visual row
kinds, the four Solve classes and their order, the unmapped-state class, and `wholePage`'s issue key (the two arrow
functions were byte-identical). The identity held **by copy**. That is both a latent fault and a lane collision:
**L6** adds row kinds to `lib/sweep.mjs` while `lib/triage.mjs` belongs to **L1**, so a kind added on one side only
would break the identity silently, and L6 would have had to edit another lane's file. Now
`lib/issue-classes.mjs` exports `VISUAL`, `SOLVE_CLASSES`, `UNMAPPED` and `issueKey`, imported by both under local
aliases so **no usage site changed** (11 insertions, 14 deletions), listed in `README.md` per R-47-1. Proven no
behaviour change: tests 237/237; lint green; **triage re-run on all 17 surfaces — counts and issue key sets
identical** (W 1562 / F 338 / T 445 / U 28). Negative control: removing `box` from `VISUAL` in the shared module
alone moved footer from 201 issues (W 109) to 138 (W 46), then restored.

**C0.6 — the canvas roster is live as manifest data.** `canvas: true` on **12 of 17** surfaces in
`surfaces.json`: `header`, `footer`, `mobile-menu`, `mega-sunglasses`, `mega-brands`, `mega-lenses`, `mega-help`,
`size-guide`, `lens`, `contact-form` (CPT posts) and `shop`, `product` (theme templates). Not canvases: `home`,
`about`, `lenses`, `help`, `contact`. Plumbed as `canvas: !! s.canvas` into triage's ctx in
`triage.mjs::runTriage`, where the manifest entry was already in scope. Nothing reads it until L1.5, and triage
counts are unchanged, which is the point: the flag is inert until the rule lands. Verified nothing validates
`surfaces.json` keys, so the new key is safe; `lint.mjs --surfaces` passes.

#### Wave 1 findings that change the plan's premises (all measured, 2026-10-05)

Lane diagnoses refuted nine plan premises. Each is recorded because a later session would otherwise rebuild to the
wrong assumption.

| Premise as written | What the evidence says |
|---|---|
| **L1.1: the resolver searches only the attributed block** | **Void as a defect.** Joining all 318 F/`no-setting` verdicts back to their `owners` and asking the DB and calibration what `attempt()` asks gives **0 rows diagnosed `owner-should-have-resolved`**: the existing caller hop (`solve.mjs::writeRound` and `lib/triage.mjs::resolveIssue` retrying on `r.owners`) **has no bug**, and `ref-trace.mjs::traceRef` already walks every enclosing ref up to `documentElement` while `addRefs` stamps every tree node, so every ancestor in the canvas tree is already reachable. The real split: **149 `owner-path-uncalibrated`** (an enclosing block declares the property, but the descendant's path is absent from that block's calibration), 120 `no-owner-candidate`, 33 `owner-setting-not-painting-slot`, 16 `no-owners`. **The 149 is a calibration-coverage limit no fixture can fix**, since no fixture holds an arbitrary client's descendant path, and it is an upper bound on *settable* rather than a count of it: `sgs/container::padding` declaring `padding` says nothing about a social-icons item's box. Precisely why R-47-12 explains and cites instead of writing. |
| **L1.2: 128 rows, or 1,043 namespaced rows** | Both wrong. 1,062 namespaced rows exist over 36 properties, but **only 85 rows across 19 properties are `source IN ('sgs','sgs-ext')`**: the `fx:` mass is **977 rows of `source = 'sgs-fx'`, which `lib/db.mjs::attrsFor` excludes by design** (R-47-10). On this client the payoff is about **2 rows**. The 75 motion rows that actually hurt are `transition-*`, and `anim:duration` does not paint `transition-duration`. |
| **L1.2: `settingFits`'s blanket strip is an active bug** | **Latent, not active.** `.replace( /:.*$/, '' )` turns `grid-template-columns:count` into `grid-template-columns`, which is *correct* for a modifier, and `anim:duration` into `anim`, which matches nothing, while `nameFits` already returns true for `animation-duration`. Worth making namespace-aware, but it closes no row today. |
| **L1.3: make `resolveDiscovered` reach the mega-group case** | **Not fixable in the resolver.** `cache/mega-group.json::discovered.sgsChildSizing` is `{}`, and all five of mega-group's discovered entries are empty, so there is no data to reach. The cause is the fixture: `flex: 0 1 auto` changes nothing measurable unless the group sits inside a flex `sgs/mega-panel`, and the fixture renders it loose. What *is* broken in the resolver: `resolveDiscovered` compares slots **exactly** while every other path comparison uses `loose()`; `resolveIssue::attempt`'s `known` set omits `cal.discovered[*][prop].slots`, so 14 rows gap `unmapped-element` before the resolver runs; and `resolveDiscovered` is skipped for any state-qualified row. |
| **L5.1: four causes clear 203 dead rows** | **About 144 are fixture-only.** Two causes are mislabelled: nav-bar-menu's "READ_CAP_81" is no read cap at all (`classify_dead.py::classify` guesses it from `len(elements) >= 77`, while `calibrate-read.mjs::readInstancesInPage` reads everything and a test already proves elements past the 81st are read; that cache holds 445), and cart's "PORTAL_OR_CLOSED_SURFACE" is a fixture gap (`block.json::displayMode` defaults to `link`, so `render.php::$has_panel` is false). 59 rows need site menu data or a drawer render context, not a fixture. |
| **L5.5: `site-footer-row` is a one-width hardcode** | **No: a harness misclassification, and it clears 27 rows.** The block passes `container_queries => true` to the shared wrapper, so its tiers follow container width, and at 768 the container is 664px, inside the mobile tier. `calibrate.mjs::calibrateBlock` sets `containerQuery` only by grepping the built `style-index.css` for `@container`, which has 0 occurrences because that CSS is emitted at render time. **19 of the 40 `oneWidth` rows** belong to four such blocks (site-footer-row 7, site-header-row 7, gallery 4, mega-aside 1). ⚠️ Corrected from 27 during the build: **`multi-button`'s 8 rows are not container queries at all** — its `render.php` carries a comment reading "Do NOT pass `container_queries => true`" and its tiers use page `@media`. The detector strips PHP comments before matching for exactly this reason, so a naive grep would have swept multi-button in wrongly. Its 8 rows go to the Wave 3 probe list instead. The C2 suspicion is removed. |
| **L5.6: some states have no trigger** | **None do.** Every `css_state` in the DB (`current` 33, `hover` 541, `open` 3, `scrolled` 5, `shrunk` 1) has a `STATE_TRIGGERS` entry, so `triggerFor` returns undefined for none. The 55 `untestedStates` are **51 hover rows whose target stays hidden even after its toggle opens** (the opener usually sits outside the instance, so `markTargetInPage` finds no toggle inside the root) and **4 site-header rows where `is-header-scrolled` never applied**. |
| **L3.2: Contact and its form hold unmapped-state rows** | **They hold none.** `walkStates` was `["opening"]`, so the form states were never walked, though `contact.mjs` has always defined `field-focused` and `form-submitted-empty`. The 323 are **shop 163, product 109, home 33, lens 18** and nothing else. L3.2 *adds* rows rather than clearing any. |
| **L3: register N11(b) is an open bug to fail against** | **Already fixed at HEAD** by `35e8b94d4`, which exempts an item already in the bag from `class-cart-proxy.php`'s cooldown, so the flow must pass on a HEAD build and can only be shown failing against a pre-`35e8b94d4` build or a local mock. Register N38's "skip adds to bag" setting does not exist at all (`choice-flow/block.json` has no such attribute), so that flow fails until N38 lands: a spec item, not one of the two named register bugs. |

#### C0.7: the 323 unmapped-state rows now have a mapped state

`surfaces.json` gained the walker-state maps for the surfaces that carried them, each name checked against that
walker config's real `states` array first so no phantom state is mapped: **home** 1 to 3, **shop** 1 to 11,
**product** 1 to 10, **lens** 4 to 6, and **contact** and **contact-form** 1 to 3 with `walkStates` extended to the
two form states that were defined but never walked. `product` maps `pick-colour` and `pick-size` to the DB's
`current` state and `accordion-open` to `open`; every other state maps to rest (`null`), the precedent `lens` and
the mega surfaces already set.

The 323 are **shop 163, product 109, home 33, lens 18**.

⚠️ **This moves no count until Solve re-runs, and that is not a failure.** A triage re-run still reports **2,373
with 323 unmapped-state rows**, because `lib/triage.mjs::issuesOf` reads `report.classes` as the committed Solve
report recorded it: the unmapped-state classification is baked in at Solve time, not recomputed by triage. The
benefit therefore lands in **C3.6's measure-only sweep** and is measured at **C3.7**, where those 323 rows stop
being unjudgeable and take a real class instead. **Expect F to rise there for that reason**, and expect it to be
explainable row for row: it is 323 rows becoming judgeable, not 323 new defects.

**7 rows carry a state conflict** the map cannot express (one pair, two states, different draft values):
`home cr-ref-home-5` hover `transform`; `product cr-ref-product-12` `color` and `border-bottom-color`;
`product gen-product-12 painted-ground`; `shop cr-ref-shop-4 width`; `shop cr-ref-shop-31 outline-color`;
`shop cr-ref-shop-28 outline-style`. A group whose mapped states disagree must be refused rather than written with
the last run's value. That guard belongs to `lib/solve-rows.mjs`, so it is **lane L8's, as new item L8.8**.

#### Wave 1 lane corrections, applied before dispatch

| Correction | Why |
|---|---|
| **L2's file list was wrong and is widened** to `parity/lib/`'s `collect.mjs`, `devtools.mjs`, `compare.mjs`, `compare-state.mjs`, `auto-collect.mjs`, **`auto-compare.mjs`**, **`auto-align.mjs`**, `focus.mjs`, `state-passes.mjs`, `links.mjs`, `entrances.mjs`, **`paint.mjs`**, **`ref-trace.mjs`**, plus **`parity/draft-live-walk.mjs`**, `parity/benchmark.mjs` and `GAP-CHECKLIST.md` | Five of L2's seven jobs live in files the original list omitted: the 1920 default is `draft-live-walk.mjs` (`cfg.widths \|\| [1440, 768, 375]`, and `lib/` holds no width default); "every interactive element" is the automatic check in `auto-compare.mjs`/`auto-collect.mjs`; `:active` needs a list beside `collect.mjs::FOCUS_PROPS`/`HOVER_PROPS`; **no line-count code exists anywhere**, its home being `paint.mjs`'s row and line-box logic plus `compare.mjs`; and dropping unmatched-ref rows is `ref-trace.mjs::stampRefs`, called from `compare-state.mjs`. A lane stops when it needs a file outside its list, so this had to be right. `parity/` is edited by no other lane; **L4 reads `paint.mjs` and must not edit it**. New GAP-CHECKLIST sections start at **20** (1–19 exist) |
| **L1.1 is a diff-and-extend, not a build** | An ancestor hop **already exists** at the caller level: `solve.mjs::writeRound` and `lib/triage.mjs::resolveIssue` both retry on `g.owners`/`r.owners` with `anyIndex: true`, and only when the first result is `no-setting` or `unmapped-element`, so it already runs strictly after a direct match. L1.1's phase 1 must report what that hop does and does not reach **before writing anything**: a second overlapping hop is what `prove-the-cause-before-fix.md` forbids, since two overlapping fixes are unfalsifiable and neither can ever be removed |
| **L1.2 covers every namespace, and must stay namespace-aware** | The database holds **1,043 rows across 36 namespaced `css_property` values**, not the 128 assumed: `fx:*` 29 properties (~1,000 rows), `anim:*` 6 (46 rows), plus `grid-template-columns:count` (10). ⚠️ **`grid-template-columns:count` is a real property with a modifier, not a pseudo-property**, so a blanket strip of everything after `:` would make it wrongly match `grid-template-columns`. `lib/triage.mjs::settingFits` already strips with `.replace( /:.*$/, '' )` and carries the same trap. The `sgsAnimationDuration` split is confirmed: 73 rows total, 64 `css_property` NULL, 9 routed |
| **L1.4's write half moves to Wave 2 as L8.7** | The hop must reach `triage.mjs::resolveIssue` (L1's file) **and** `solve.mjs::writeRound` (L8's file) identically, or the write path and the classification disagree. L1.4 delivers the hop **inside `resolve.mjs`** with its unit test; L8.7 does the `writeRound` call-site plumbing in Wave 2, which is where Solve's writes live anyway. `resolve( input, ctx )` receives no surface field today, so the plumbing is real work, not a rename |
| **L1.5 puts `canvas-settable` in `decidedBy`** | Verified: triage verdicts have **no `reason` field**. Existing W verdicts carry `decidedBy` values such as `consequence` and `resolver-blocked`, so the reason belongs there (or in `evidence`), and the flag arrives as `ctx.canvas` from C0.6 |

#### W0a (C0.3): 12 entries written, 3 held back with evidence. Done 2026-10-05.

Of the 17 **D** rows, 14 are `sgs/business-info`'s link padding and margin on the **footer** (`cr-ref-footer-24`,
all eight properties) and the **header** (`cr-ref-header-11`, six). `divergences.json::D-17`–`D-24` already decide
those exact properties on that exact element with `expected: { rule: 'touch-target' }`, but they are pinned to
`cr-ref-contact-9`, so the same decided mechanism re-reported as fresh candidates on the other two surfaces. The
remaining 3 are `sgs/google-reviews` (2, the parallel track's) and one `sgs/buybox` transform.

**Written: 12 entries, `D-40` to `D-51`** (the ledger held 36 entries, highest id `D-39`). Eight on
`cr-ref-footer-24` (state `opening`, all four widths) and four on `cr-ref-header-11` (state `closed`, **widths
`[1440, 1920]` only** — its rows exist at no other width). Each carries its own `scope` (`footer`, `header`),
because `parity/lib/divergences.mjs` matches on scope and a copy left at `contact` would match nothing. House
rules cite no register item (`lint.mjs::HOUSE_RULES` skips `touch-target` and `accessibility`).

**Proven, not assumed.** `lib/ledger.mjs::match` run against the committed footer and header walk reports:
`D-40`–`D-47` match **4 row-instances each**, `D-48`–`D-51` match **2 each** — **40 row-instances matched, 0
matched by any other entry** (no over-reach), and the only unmatched rows are the 3 held back.

**Three rows deliberately NOT closed, each with its measured reason.** None is dropped; each is named for
Session C2.

| Row | Why it was not closed |
|---|---|
| `cr-ref-header-11` **`padding-left`** and **`padding-right`** (2 rows, 1440/1920) | The `touch-target` rule does not explain them. Measured: **draft declares 10px, live paints 7.5px** — live pads *less* than the draft, so this is a real declared-padding difference, not a tap-area expansion cancelled by a negative margin. Marking it `touch-target` would freeze a 2.5px difference as intended. **Session C2 judges it**; the 4 margin rows on the same node *are* the touch-target mechanism (draft 0px, live pulls -7.5px side and -12.625px vertical) and are closed |
| `cr-ref-product-4` **`transform`** (1 row, hover, 768/1440/1920) | ⚠️ **The ledger cannot express it safely.** `lib/ledger.mjs::match` has **no path discriminator** — it matches on node, state, pseudo, property and width only. `cr-ref-product-4` carries **three** F-class hover `transform` rows on different paths (an option pill, the add-to-bag button at `.sgs-buybox__config-col > form > button`, and a gallery `.sgs-media-el`). Session B decided **only** the add-to-bag button (register S1: draft `matrix(1,0,0,1,0,-2)` = 2px lift, live `-3` = the site-wide 3px lift). One entry would silently close the other two genuine findings, which is exactly what the "never add a ledger entry to close a row" guardrail forbids. **S1 already decides it, so C2 closes it by citation with no entry needed** |

**A newly found route gap, recorded for Spec 47 §5 Residual.** The divergence ledger has no way to scope a
decision to one element path when a node holds several rows of the same property and state. It is why the product
row cannot be written. Not fixed here: it is not a listed item in "The work", it would change the shared ledger
schema, `lint.mjs` and all 48 existing entries, and the row it would close is already decided by S1. Session C2 or
a later session owns it.

**These 12 sit outside the F count**, so F does not change. What they remove is 12 rows that would otherwise
re-report as fresh candidates every time the footer and header are measured.

**Verification.** `node scripts/computed-route/lint.mjs --register .claude/plans/2026-10-02-eye-care-fix-register.md
--surfaces sites/eye-care-ward-end/build/surfaces.json` passes. ⚠️ **The negative control the plan originally named
is vacuous**: a planted bogus register id on a new `touch-target` entry leaves the lint **green**, because
`lint.mjs::lintLedger` `continue`s on `HOUSE_RULES` before it ever reads `register`. The valid control plants the
bogus id on a **value** entry — done on `D-39` (which cites `113`/`S1`): lint failed with
`entry D-39 cites register item NOT-A-REAL-ITEM-999, which the register does not hold`, exit 1, then green again
once restored.

### Wave 1, six lanes in parallel (file sets are disjoint)

#### L1 Resolver and triage, one agent, serial inside the lane

Files: `scripts/computed-route/lib/resolve.mjs`, `lib/db.mjs`, `lib/triage.mjs`, `lib/triage-source.mjs`, their
tests. **Serial because every other part of the route reads this.** Order inside the lane is fixed:

| id | Item | Spec 47 | Done when |
|---|---|---|---|
| **L1.1** | **R2, the context hop.** The resolver searches only the block the walker attributed the element to, so it declares a gap while the control sits one level up, working. `accordion-item/render.php` reads `$block->context['sgs/accordionHeaderPadding']` and emits `--sgs-accordion-header-pad`; `sgs/container` carries 13 typography attributes that inherit into every descendant declaring none | FR-47-1, and §3.2's `providesContext`/`usesContext` gap (the spec says nothing about either: that silence is itself a gap, see "What the spec does not say") | a MUST-FAIL test on the **real** accordion-item header-padding draft node (never a synthetic one) is red then green; the hop is ordered **strictly after** direct and `reaches` ties; the ambiguous count has not risen against C0.4 |
| **L1.2** | **R1b, the `anim:` and `fx:` namespaces.** The 9 already-routed `sgsAnimationDuration` rows carry `css_property = 'anim:duration'`, a namespaced pseudo-property, so `candidates(db, block, 'animation-duration')` can never match. Teach `candidates`/`splitProperty` the namespaces. 128 rows (`sgsAnimationDuration` 64, `sgsAnimationEasing` 64) | FR-47-1 | a probe on an `animation-duration` row against `sgs/card-grid` (already routed) resolves; MUST-FAIL test red then green |
| **L1.3** | **Enum discovery reach.** 28 rows (`sgsChildSizing` 10, `sgsHoverEasing` 9, `sgsHoverDuration` 9) work through `calibration.discovered` and must keep working. Make `resolveDiscovered` reach them for the properties they actually paint. `sgs/mega-group::sgsChildSizing` set to `fit` emits exactly the draft's `flex: 0 1 auto` (`includes/child-sizing.php::child_sizing_declarations`) and the `mega-panel/style.css` default it loses to carries a comment saying a group's own Child sizing setting overrides it | FR-47-1, R-47-6 | the mega-group case resolves through discovery; `lib/db.mjs::enumSettings`' 633-row pool is unchanged (assert the count); `calibration.discovered` counts per block are unchanged against C0.4 |
| **L1.4** | **FR-47-8 canvas awareness, resolver half.** See "The new rule" below | **new: FR-47-8, R-47-12** | the ancestor hop inside a canvas resolves; MUST-FAIL test red then green |
| **L1.5** | **FR-47-8 canvas awareness, triage half.** See "The new rule" below | **new: FR-47-8** | a row a canvas sibling can hold classes `W` / `canvas-settable` citing the block and attribute, never `F`; with the rule disabled the same row classes `F` (the negative control) |

**Never route `css_property` onto a row whose `enum_values` is non-NULL.** 633 rows work through calibration
discovery precisely because that column is empty. This lane must not undo that; L1.3 exists to keep it.

#### L2 Walker core, one agent

Files, all under `scripts/parity/lib/` except the last two: `collect.mjs`, `devtools.mjs`, `compare.mjs`,
`compare-state.mjs`, `auto-collect.mjs`, `focus.mjs`, `state-passes.mjs`, `links.mjs`, `entrances.mjs`, plus
`scripts/parity/benchmark.mjs` and `scripts/parity/GAP-CHECKLIST.md`. (`collect.mjs` and the rest are in `lib/`, not
at the top level: only `benchmark.mjs`, `draft-live-walk.mjs` and `GAP-CHECKLIST.md` sit there. The lane stops and
reports if it needs anything else, so the list must be right.) **Every item gets its own GAP-CHECKLIST section
with its planted fault turning red**, which is FR-47-6's own done-condition.

| id | Item | Spec 47 |
|---|---|---|
| **L2.1** | 1920 in every standard run | FR-47-6 item 2 — **BUILT sitting i** (`aa483b9a6`, GAP-CHECKLIST §22) |
| **L2.2** | Focus and active states on every interactive element of a compared region | FR-47-6 item 3 remainder — **BUILT sitting i** (`aa483b9a6`, §23) |
| **L2.3** | Link coverage: the same text must sit inside a link on both sides | FR-47-6 item 4 — **BUILT sitting i** (`aa483b9a6`, §24; emitted as kind `auto` with keys `link-missing`/`link-extra`) |
| **L2.4** | Line counts sampled during state transitions (header shrink and grow, drawer open) | FR-47-6 item 5 — **BUILT sitting i** (`aa483b9a6`, §25) |
| **L2.5** | Script-driven entrance motion read | §5 R7's `FR-47-6` tag |
| **L2.6** | **Tag-mismatch guard.** 4 combos in Session B compared a draft `<div>` to a live `<img>`, or a `<span>` to an `<h1>` | a B2 finding |
| **L2.7** | **Drop style rows from refs the pairing left unmatched** (`qa/pairs/*.json::left`). Would have removed 24 of one agent's 58 rows before triage saw them, and retires two medium-confidence `woocommerce/product-template` rows | a B2 finding |

L2.6 and L2.7 are the cheapest false-finding removers in the session: run them first inside the lane.

#### L3 Flows, one agent

Files: `scripts/parity/flows/` (new), and the state mapping those flows need.

| id | Item | Spec 47 |
|---|---|---|
| **L3.1** | The four flows: two products in the bag; a second unit of the same product; apply then clear a filter; the lens pop-up's skip-to-bag | FR-47-7 — **BUILT sitting i** (`44d5058a4`); the live run is Wave 3's |
| **L3.2** | State mapping for the **form flow**. Contact and its form walk only their rest state today | FR-47-7; §5 R8 |
| **L3.3** | State mapping for **filters**. Shop's filter panel alone reports 163 differences, every one read with the filters open, a state the route maps nowhere | FR-47-7 |

**Done when** each flow passes on eye-care-test after its register fix and fails against the bug it was written
for (register N11 and N25), and every one of the **323 unmapped-state rows** either gets a mapped state or a stated
reason why it has none. 323 rows and 15 register items wait on this lane: it is the largest single block of
unjudgeable rows in the sweep.

#### L4 Pairing, one agent

Files: `scripts/computed-route/lib/pairs.mjs`, `lib/pairs-page.mjs`, `pairs.mjs`, the per-surface finder configs.

| id | Item | Spec 47 |
|---|---|---|
| **L4.1** | The **17 `pairing`** register items: the element sits on a measured surface but no pair reaches it | §5 R7b |
| **L4.2** | **PA-1**, register N7: `pairs.mjs` collects no words inside the open live phone drawer (`.sgs-nav-drawer[open]`; no landmark exclusion applies; cause unproven) | §5 R2b, R7 |
| **L4.3** | **PA-2**: shop's and product's kept draft finders hold other words at 375 and 768 (the draft rebuilds its layout per width), so 17 shop blocks are left out. A finder chosen per width keeps them | §5 R2b |
| **L4.4** | **PA-3**, register 103: a hand pair's live trace names its block (`choose-a-frame`), but only auto-paired refs count as measured. **The `pairs.mjs` side only** — the `register-sweep.mjs` side is L6.4 | §5 R7 |
| **L4.5** | **PA-5**, register 157: the confirmation surface has no tick or continue link because the only order on eye-care-test is cancelled (652). **The code side only** — creating a paid test order is C3.5, a host job | §5 R7 |

#### L5 Fixtures and harness, one agent

Files: `scripts/computed-route/calibration-fixtures.json`, the calibration harness,
`sites/eye-care-ward-end/build/qa/independent-check.mjs`.

| id | Item | Spec 47 |
|---|---|---|
| **L5.1** | The **four fixture or harness changes that clear 203 of the 605 `dead` calibration results** (700 counting the 40 `oneWidth` and 55 `untestedStates` too), split by cause in P0-11 (`.claude/reports/2026-10-05-session-b/calibration-outcomes.md`). **No cause needs block code** | §3.2 |
| **L5.2** | **CR17**: `sgs/business-info::textBefore` (role `text-content`). The fixture now sets it (`f4d5fa0fe`), but recalibration timed out twice on the editor and has not run, so `.sgs-business-info__before` is still not a calibrated element and Help's 12 colour rows on it go unwritten. **The fixture and harness side only** — the recalibration is C3.4 | §5 R4; §5 council F3 |
| **L5.3** | **CR12**: `theme-toggle` is the one SGS block with no library-wide cache file | §5 "Calibration" |
| **L5.4** | **PA-4**: `independent-check.mjs` counts screen-reader-only text parked at -9999px as painted (9 Contact rows). The walker's collector already skips it (`auto-collect.mjs::srOnly`) | §5 R2b |
| **L5.5** | **Prove** `sgs/site-footer-row`'s per-device `gap` and `contentWidth` reaching 375 and 1440 but not 768 (a one-width hardcode candidate). Read-only: if real it is a **finding for Session C2**, not a fix here | §5, the "result run 2" paragraph |
| **L5.6** | **The calibration results L5.1 does not clear**, so none is left without an owner: the **152** residual `dead`, the **40** `oneWidth` and the **55** `untestedStates`. Classify each by cause and either fix it in this lane or name where it goes. `untestedStates` is a declared Spec 47 limit for states with no trigger, so the deliverable there is the **list of which states have no trigger and why**, not a fix | §3.2; P0-11 |

#### L6 Sweep, one agent

Files: `scripts/computed-route/lib/sweep.mjs`, `lib/register-sweep.mjs`, their tests.

| id | Item | Spec 47 |
|---|---|---|
| **L6.1** | Carry **text** rows. `lib/sweep.mjs` keeps style, hover and box rows only, so text rows reach no register check | §5 R6a |
| **L6.2** | Carry **presence** rows, same reason | §5 R6a |
| **L6.3** | Carry **link-coverage** rows, which L2.3 starts producing | §5 R6a; FR-47-6 item 4 |
| **L6.4** | **PA-3's merge side**: `register-sweep.mjs merge` counts only auto-paired refs as measured; accept a hand pair whose live trace names its block | §5 R7 |

**The 2,373 identity must survive this lane.** `lib/sweep.mjs::UNMAPPED` and `lib/triage.mjs::issuesOf` read the
same classes in the same order, which is what makes a surface's triage count equal its sweep count. Adding row
kinds changes both counts: the gate is that they stay equal to each other, and that every delta against 2,373 is
explained row-for-row.

### Gate 1 (end of sitting i)

```
GATE 1: Wave 1 merges
AFTER: L1 to L6
PASS: merge ONE lane at a time; read every diff in the main thread;
      node --test "scripts/computed-route/tests/*.test.mjs" and
      node scripts/computed-route/lint.mjs --surfaces ... green after EACH merge;
      every lane's README entries merged by the main thread into scripts/computed-route/README.md;
      python scripts/check-no-client-names.py --check passes;
      the ambiguous-row count has NOT risen against C0.4;
      calibration.discovered counts per block unchanged against C0.4;
      lib/db.mjs::enumSettings still selects 633 rows
FAIL: a lane fails its own tests, or the ambiguous count rises
ON FAIL: the other lanes still merge. The failing lane's items stay open in this plan WITH THE LANE NAMED.
TYPE: auto-gate, then a main-thread read of every diff
```

### Gate 1 PASSED, 2026-10-05. All six lanes merged.

Measured in the main checkout after each merge, with the identical command over all 17 surfaces, not
taken from any lane's report.

| | W | F | T | U | total | ambiguous |
|---|---|---|---|---|---|---|
| Baseline (C0.4) | 1562 | **338** | 445 | 28 | 2373 | 43 |
| After Gate 1 | 1764 | **177** | 445 | 28 | 2414 | 43 |

**Every transition accounted for, nothing unexplained:**

| Rows | Movement |
|---|---|
| **161** | `F/no-setting` → `W/canvas-settable` |
| 33 | `W/resolver-unmapped-element` → `W/canvas-settable` (same class, truer reason) |
| 26 | `W/resolver-ambiguous` → `W/canvas-settable` (same class, truer reason) |
| 41 | new keys, all `W/content` (13 text + 28 presence) |
| 0 | keys gone. **T and U unchanged**, so no row that resolved before stopped resolving |

**The sweep-to-triage identity holds on all 17 surfaces** (site total 2,414 on both sides), and the
only delta against 2,373 is those 41 content rows. `byClass`: unresolved 1618, derived 432,
unmapped-state 323, content 41.

**The canvas-only guarantee is measured, not assumed: 0 class changes on any non-canvas surface.**
F held at 58 (home), 36 (help), 1 (contact), 0 (about), 0 (lenses). All 161 reclassifications are on
canvases: footer 76→21, product 42→5, mega-lenses 24→4, header 15→0, contact-form 10→0,
mega-brands 14→8, mobile-menu 12→4, shop 7→2, lens 38→34, mega-sunglasses 2→1. **Session C2's
worklist shrinks from 338 to 177 and no genuine framework gap on an ordinary page is masked.**

**Gates after the final merge:** `node --test` **322 of 322**; `lint.mjs` green including the R-47-1
export index; `check-no-client-names.py` green; `enumSettings` exactly 633; `calibration.discovered`
untouched at 623 entries across 94 blocks.

**⚠️ The F figure to carry forward is 177 against a baseline of 338 — raw against raw.** It is
**not** comparable to the audited 163. See the Wave 0 results table: Session B audited the 338 raw-F
rows down to 163, and an audited equivalent of 177 needs Session C2's judgement, which this session
cannot produce.

#### What is still open after Gate 1, with its owner

Nothing is dropped. Every item below is named with where it goes.

| Open item | Owner |
|---|---|
| **The `known` twin in `solve.mjs::writeRound`**, which holds the identical set and still omits `cal.discovered[*][*].slots`; plus plumbing `canvas`/`ancestors`/`measuredSlots` into `writeRound` so a `canvas-settable` write goes through the same hop. **Until it lands the write path and the classification can disagree**: triage reaches `resolveDiscovered` for a row Solve still gaps `unmapped-element` | **L8.7** (Wave 2) |
| **The state-conflict guard**: refuse a group whose mapped walker states disagree, rather than writing the last run's value. The 7 rows are named in `scripts/parity/flows/state-map-reasons.json` | **L8.8** (Wave 2) |
| **`mega-group`'s empty discovery data.** `cache/mega-group.json::discovered.sgsChildSizing` is `{}` and all five entries are empty, so no resolver change can reach it. The fixture already had `sgs/mega-panel` as its parent (the earlier "loose fixture" theory was wrong), so the cause is unproven: the Wave 3 probe is whether the rendered group carries `sgs-child-sizing` and its scoped `<style>` at all. **Spec 47's L1.3 line claiming this resolves through discovery is still open** | Wave 3 probe, then C2 |
| **`benchmark.mjs --noise` — DONE 2026-10-06** (`8210af3a1`, `reports/2026-10-06-session-c2/BENCHMARK-NOISE-RESULT.md`). 10 runs on a quiet host: **5 of 5 scored cases caught** (case a is unscorable because the draft shares the gap, though the walker still emitted a row for it). The "no new noise rows" condition stated here was WRONG and is withdrawn: the run read **5 noise rows**, every one a phase artefact — a draft view-swap fade (already accepted at `qa/parity/shop.mjs`:286), the `sgs/trust-bar` marquee's scroll phase, and one `box-shadow` read at t≈0.999 (same colour; alpha, blur and spread each short by an identical 0.0950%). Not host load and not detector flakiness. A run reading 0 was never evidence of absence, because every cause is phase-dependent | **CLOSED** |
| **The four functional flows have run against eye-care-test:** `bag-two-products`, `bag-second-unit` and `filter-apply-clear` PASS, and `lens-skip-to-bag` fails with `skip-opens-extra-step` until N38 lands (results in "Wave 3's remaining items"). A selector miss reports as ERROR, never as a pass or fail, and none occurred | closed |
| **`theme-toggle` cannot calibrate on any client.** Its gate is derived at deploy by `push-theme-snapshot.py::apply_dark_palette` from a `_sgsDark` key no committed snapshot has. Enabling it changes the snapshot md5 and therefore stales every cached `paintKey` | a decision for Bean, not a calibration bug |
| **13 rows whose DB `css_state` is NULL** (`DB_STATE_MISSING_HOVER` 11, `STATE_FOCUS_UNROUTED` 2), listed in lane L5's commit. A missing **state**, not a missing property, so not part of C3.1's 32 | a later routing pass |
| **Register rows 150, 152, 155** need `surfaces.json` entries for checkout, bag and confirmation, which have walker configs but no tree and no target | Session D (the trees), then a manifest entry |
| **Rows 88 and N36A** are sub-elements with no `cr-ref` of their own, so they need hand pairs; **S3 and D7** can have no pair at all; **CR6 and CR18** are stale premises now About is paired | C2's list / closed |
| **106 UNEXPLAINED dead calibration rows**, plus multi-button's 8 `oneWidth`, notice-banner 4, wishlist-panel 3, nav-bar-menu burger 2, google-reviews star sizes 2 — each with the probe that would settle it, and **no guessing** | Wave 3 probe, then C2 if real |
| **`sgs/product-card` throws a TypeError in the block editor** (`Me is not a function` at `edit()`), reproducible with that block alone on an empty page. Pre-existing, inherited from the repairs track | its own handoff item, not a Spec 47 finding |
| **`lint.mjs` does not list the new `(region)` pair name** among those a walker `accept` may use | a one-line fix when an accept needs it |

**No lane failed its gate, so no lane's items are left open for that reason.**

### QC council on Session C's merged work, 2026-10-05. Three raters, cross-model (no Opus), read-only.

Run at Bean's request after Gate 1, as a **diagnostic council plus a retrospective falsifiability gate**: for each
recorded claim, is it measured or asserted, what command reproduces it, and **would it turn red if the underlying
fix were reverted**. Raters: a falsifiability auditor and an overlap/proof auditor (Sonnet), and a code-path tracer
(Haiku). Structural pre-gate first: **all 21 `file::symbol` citations in the commit messages and this plan exist.**

**What held.** All six numeric claims reproduced exactly, from the committed baseline and a fresh run: F 338 → 177,
W 1562 → 1764, T 445 and U 28 unchanged, total 2373 → 2414, ambiguous 43, `enumSettings` 633,
`calibration.discovered` 623/94. The transition matrix diffed key by key: **exactly 161 / 33 / 26 / 41 new (13 text,
28 presence) / 0 gone / 0 duplicates.** The sweep-to-triage identity holds on all 17 surfaces. The code-path tracer
confirmed **12 of 12** load-bearing symbols do what their commit messages say, including the `1 === reach.length`
write guard (0 and 2 both skip), the raw-path dedupe in `reachedDescendants`, state-strict candidates, and
`grid-template-columns:count` returning its exact stored string.

#### ⚠️ Correction: "the hop is falsifiable by deleting one call" is FALSE

That claim appears in lane L1's commit message and in this plan. The council falsified it.

With `lib/resolve.mjs::resolveViaAncestor` never called, **F stays 177, W stays 1764, T stays 445, and the suite is
322/322 green.** Only one evidence field differs (`where: 'ancestor'`) across 295 rows. So:

- **The 161/33/26 reclassifications are driven by `lib/triage.mjs::canvasSettable` plus the manifest `canvas` flag,
  not by the hop.** `triageIssue` reads `const settable = res.cite || canvasSettable( issue, ctx )`, and
  `canvasSettable` is a **superset** of the hop: it searches ancestors *and* siblings. Forcing `ctx.canvas` false
  gives **F 338**; disabling both the hop and `canvasSettable` gives **F 338** and turns exactly two tests red.
- **The hop has never produced a write on this data.** T is unchanged with it off, which is consistent with L1.1's
  own premise (0 of 318 rows were `owner-should-have-resolved`).
- **The tests cannot separate the two.** `tests/triage.test.mjs` stubs `ancestorHop: () => null`, so the triage
  canvas case and its negative control prove only `canvasSettable`; `tests/resolve.test.mjs` proves only the hop.

**So the hop's classification half is redundant today, and this is the overlap `prove-the-cause-before-fix.md`
forbids: two fixes covering one behaviour, neither shown necessary.** It is **not** deleted now, for one stated
reason: its unique contribution is the **proven-write path**, which Wave 2's **L8.7** needs when
`solve.mjs::writeRound` starts writing through it. **The hop must earn its place at L8.7 by producing at least one
write, or be deleted.** That is a condition on L8.7, recorded here so it cannot be forgotten.

#### Three further downgrades, each from asserted to its real strength

| Claim | Its real strength |
|---|---|
| **"Zero class changes on any non-canvas surface"** | True and measured, but it is a **property of the manifest, not the code**. A rater set `canvas: true` on the five pages in a scratch manifest and **home's F fell 58 → 15 and help's 36 → 20**: 59 real F rows would be masked. So the canvas roster is load-bearing, and Session C2 must treat a wrong roster as able to hide genuine page gaps |
| **"Ambiguous held at 43"** | True, and the resolver's real gap *is* preserved beside the citation (verified on `mega-brands` `cr-ref-mega-brands-41`, which carries both an `ambiguous` resolver gap and a `canvas-settable` citation). But the count reads the **evidence**, not the verdict, so 26 of the 43 are now `W/canvas-settable` and **the number cannot detect a reclassification by itself**. It is a weaker gate than it reads |
| **"0 of 318 F/no-setting verdicts were `owner-should-have-resolved`"** | **Asserted, not reproducible**: the join script was never committed, and those diagnosis labels appear only in this plan. Corroborated indirectly only — T stays 445 with the hop on or off, so the hop never wrote. Treat the figure as a diagnosis, not a measurement |
| `enumSettings` 633 and `discovered` 623/94 | Correct, but they are **"nothing touched it" statements**: one is a database fact and the other a gitignored local cache, so no code change in this session could move either. They evidence no fix |

Also corrected: "the 977 `fx:` rows are `source='sgs-fx'`" is imprecise — **29 `fx:` rows carry `source='sgs'`**; the
977 is the count of `sgs-fx` rows.

#### The untested line that matters most

**`triage.mjs::runTriage`'s manifest read has no test.** Forcing `canvas: false` there leaves the suite at 322/322
while measured F doubles from 177 to 338. The session's headline result is protected only by re-running triage by
hand. **Gate 2 and C3.7 must therefore assert the F count explicitly against the canvas roster**, rather than
relying on the suite, and that assertion is now part of those gates.

#### The three-way identity is not yet one definition

`lib/solve-report.mjs::wholePage` still filters on `VISUAL.includes( x.kind )` while `lib/sweep.mjs` and
`lib/triage.mjs` use `isIssue`, which also counts link-coverage rows (kind `auto`, keys `link-missing`/
`link-extra`). Lane L6 flagged it; only the `triage.mjs` half was routed to L1, because `solve-report.mjs` is lane
**L8's** file. Latent at 0 link rows, and it diverges the moment L2's link rows reach a Solve report. **L8 switches
`wholePage` to `isIssue`.**

#### The ledger attribution, corrected

`D-40` to `D-51` carried `decided: "2026-10-05 Bean (…)"`. Bean decided the **rule** and the **contact** node
(`D-17` to `D-24`); extending it to the footer and header nodes was this session's inference. The field now reads
`2026-10-05 Session C (touch-target house rule; Bean decided the rule and cr-ref-contact-9 as D-17 to D-24, this
entry extends it to this node by the same mechanism)`, and each `reason` now states plainly that
**`lint.mjs::lintLedger` skips `HOUSE_RULES` before any evidence check, so nothing verifies the 44px tap target.**
All 28 house-rule entries in the ledger are unlinted for the same reason. The row matching itself was independently
re-verified: 40 row-instances, 4 per footer entry and 2 per header entry, **0 matched by any other entry**, and the
three held-back rows were confirmed correct — `cr-ref-product-4` really does carry three F-class hover `transform`
rows on different paths, so one entry would have closed two undecided findings.

**No lane weakened a test or a gate.** The only test-line removals across the six lane commits are import widenings
and two fixtures changing `kind: 'text'` to `kind: 'motion'`, which the new content class requires. No threshold was
raised, no check skipped, no branch short-circuited.

**A clean stop.** Sitting i ends here. A follow-on session resumes at Wave 2 from this plan without re-reading
anything else.

### Wave 2, after L1 has merged (these depend on the resolver)

#### L7 Calibration reads, one agent

Files: `scripts/computed-route/lib/calibrate.mjs`, `lib/calibrate-instances.mjs`, `calibrate.mjs`.

| id | Item | Spec 47 |
|---|---|---|
| **L7.1** | **Gap typing.** A setting that paints a parent while a rule on a child overrides it comes out "Missing setting"; calibration records nothing for the overriding child. 38 rows came out Missing setting where the evidence says Hardcode. Record the overriding child | §5 R5; §5 stage 2 run 3 |
| **L7.2** | **Presence read**: `presence: { shows: [paths], hides: [paths] }` for every setting with `role` `boolean-visibility` (600 rows) or `presence-boolean` (3), and for each variant value (`blocks.variant_attr`, `variant_slots`). A style change alone is not presence | FR-47-2, not built |
| **L7.3** | **Text read**: `text: <path>`, the element whose text a setting prints, rendered with a marker string. **Scope: both `role` `content` (84) and `role` `text-content` (235)** — see the §6 question below | FR-47-2, not built; §6 row 2 |
| **L7.4** | **Link read**: `link: <path>`, the element a link or URL setting makes a link | FR-47-2, not built |
| **L7.5** | **The cross-site default-paint lead.** §3.2 records it as "a lead, not yet seen": a Solve run showing a default-paint mismatch on another site is fixed by recalibrating that block there. Confirm or refute it read-only | §3.2 |

L7.1 first: it is the only item in the lane that changes an existing classification, so it must be measured
separately from the three new reads.

#### L8 Solve writes, one agent

Files: `scripts/computed-route/solve.mjs`, `lib/solve-rows.mjs`, `lib/solve-report.mjs`.

**Starts once L7's output shape is agreed in phase 1**, so the two lanes overlap rather than queue.

| id | Item | Spec 47 |
|---|---|---|
| **L8.1** | Write **presence** rows through calibration's `presence` | FR-47-3, not built |
| **L8.2** | Write **text** rows through calibration's `text` | FR-47-3, not built |
| **L8.3** | Write **link** rows through calibration's `link` | FR-47-3, not built |
| **L8.4** | **The handover list**: `solve-report.json` `handover`, each row with its evidence and owner. §3.3 names four owners (`site-info`, `product-data`, `content-page`, `behaviour`) but §5 R7 uses a fifth, `woocommerce-text`, for one register item. **Recommendation: add `woocommerce-text` as a fifth owner**, because WooCommerce strings are edited in a different place from a content page. Unblocks the 6 `handover` register items | FR-47-3, not built |
| **L8.5** | The **whole-page line** for every surface (§5 stage 3: "appears from the next runs") | `solve-report.mjs::wholePage` |
| **L8.6** | **Diagnose Lenses' three Solve regressions** (§5 R2d), read-only, and return a verdict: route defect or tree value | §5 R2d |

L8.1 to L8.3 unblock the **8 `content-fixable`** register items (S7, 9, N16b, N27, N30, N31, N33B, 159).

#### L9 Fill, one agent

Files: `scripts/computed-route/fill.mjs` (new), `lib/draft.mjs` (new).

Needs L7.2's presence output shape, nothing else.

| id | Item | Spec 47 |
|---|---|---|
| **L9.1** | `lib/draft.mjs`: serve a local draft folder on 127.0.0.1 at an ephemeral port | FR-47-4 step 1, not built |
| **L9.2** | `fill.mjs` steps 1 and 2: read every referenced element at 375, 768 and 1440 from the skeleton's `draftRef` and `draftSlots`, then resolve root-down, writing only what differs (R-47-5) | FR-47-4, not built |
| **L9.3** | **Spacing ownership** (step 3), decided per tier from rendered gaps, not the draft's CSS: a gap is the distance between consecutive children's border boxes along the parent's main axis, equal means within 0.5px; a parent's gap is written only when every sibling gap is equal, otherwise the parent gap is 0 and each child takes its own margin | FR-47-4, not built |
| **L9.4** | **Refs and the generated walker config** (step 4): a `cr-ref-<surface>-<n>` class on every node, and a walker config generated from the refs with `refPrefix: 'cr-ref-'` and the ledger path | FR-47-4, not built |
| **L9.5** | **The outputs** (step 5): the filled tree, `fill-report.md`, the **UNMAPPED list** (property, value, node, reason) and the **handover list**, which is L8.4's shape | FR-47-4, not built |
| **L9.6** | **Presence and content**: the skeleton carries the draft's words in each block's `content` settings, and Fill sets visibility and variant settings from calibration's `presence`, so a built block shows the elements its draft element shows and no others | FR-47-4, not built |
| **L9.7** | **The three values that need care**: **fluid sizes** sampled at 375, 768, 1024, 1440 and 1920 (linear within 0.5px means fluid, written as `clamp()` only where calibration showed the setting accepts one, else per-tier); **breakpoints** swept every 16px from 320 to 1920 with each step logged against the nearest SGS boundary for `divergences.json`; **entrances**, duration and delay from the walker's entrance sampler and distance from the transform at the first sampled frame, written to the `sgs-fx` settings calibration ties to `transform` and `opacity` | FR-47-4, not built |

**FR-47-4's own done-condition cannot be met in this session, and this is the honest reason.** It reads: "Fill on
one unbuilt surface produces a tree that builds, and a walk of it shows only rows listed in its UNMAPPED list or in
`divergences.json`." **All 17 Eye Care surfaces are built**, so there is no unbuilt surface here. L9's done-condition
is therefore §5 stage 4's other half, which is reachable: **Fill one built Eye Care surface with its committed tree
withheld, then compare Fill's tree against that committed tree as the hand-checked answer.** The unbuilt-surface
demonstration carries forward to the first client that has one, recorded in Spec 47 §5 stage 4.

### Gate 2 (end of sitting ii's first half)

```
GATE 2: Wave 2 merges
AFTER: L7, L8, L9
PASS: everything Gate 1 requires, plus:
      re-run triage on all 17 surfaces and require the sweep-to-triage identity to hold
      (every surface's triage count equals its sweep count), with every delta against 2,373
      explained row-for-row in the commit;
      L7.3's text read covers both role content and role text-content (319 settings: Bean's answer, applied);
      AND the F count is asserted explicitly against the canvas roster, because triage.mjs::runTriage's
      manifest read has NO test: forcing canvas false leaves the suite green while measured F doubles
      from 177 to 338 (QC council, 2026-10-05)
FAIL: the identity breaks and a delta cannot be explained
TYPE: auto-gate, then a main-thread read of every diff
```

### Gate 2 PASSED, 2026-10-06. All three Wave 2 lanes merged.

Measured in the main checkout after each merge, with the identical command over all 17 surfaces, not taken from any
lane's report.

| Stage | W | F | T | U | total | ambiguous |
|---|---|---|---|---|---|---|
| Gate 1, as recorded | 1764 | 177 | 445 | 28 | 2414 | 43 |
| Reproduced here before Wave 2 | 1764 | **177** | 445 | 28 | 2414 | 43 |
| After L7 and L8 | 1764 | **177** | 445 | 28 | 2414 | 43 |
| After C3.1's reseed | 1765 | **176** | 445 | 28 | 2414 | 43 |
| After L9 — **Gate 2** | 1765 | **176** | 445 | 28 | 2414 | 43 |

**Gate 1's figures reproduced exactly from a fresh run before any Wave 2 work**, which is the second independent
confirmation the QC council asked for: its finding was that the headline was protected only by a hand re-run.

**The whole of Wave 2 moved exactly one row**: F 177 to 176, W 1764 to 1765, which is C3.1's two routed `sgs/hero`
rows taking effect at the reseed. Nothing else moved, and that is the correct result for three lanes that rebuilt
read and write machinery **without regenerating a single calibration cache**. The sweep-to-triage identity holds on
every surface at every stage, and `ambiguous` never rose above 43.

**The canvas roster is now asserted explicitly, both halves.** The council's main structural finding was that
`triage.mjs::runTriage`'s manifest read had no test, so forcing `canvas: false` left the suite green while measured
F doubled.

- **Unit half:** `tests/triage-manifest.test.mjs` (lane L8) fails if the manifest flag stops reaching the triage
  context, built on a throwaway client folder so it is hermetic and client-name-free.
- **Measured half:** triage was re-run against a control client that junctions the real report directory but carries
  a manifest with all 12 `canvas` flags stripped. **F 176 to 338, W 1765 to 1603, total unchanged at 2414**, a delta
  of exactly the **161** rows Gate 1 recorded, landing exactly on the raw 338 baseline. Per surface, every row that
  moved is on a canvas, and **the five ordinary pages did not move at all** (about 0, contact 1, help 36, home 58,
  lenses 0). The canvas-only guarantee is therefore re-measured, not inherited.

**Gates after the final merge:** `node --test` **523 of 523** (322 at Gate 1, plus 35 L7, 35 L8 and 131 L9), run
twice clean; `lint.mjs --surfaces` green including the R-47-1 export index, with all 28 of L9's new files and every
export indexed by the main thread; `check-no-client-names.py` PASS; `db-consistency/run.py --check` **0 violations**;
`enumSettings` exactly 633; `calibration.discovered` untouched at 623 entries across 94 blocks.

#### The canvas hop earned its fair trial and still produced no write

L8.9 fixed the omission the main thread found before dispatch: `lib/triage.mjs::resolveIssue` built a per-ancestor
`measured` array and called the hop without `measuredSlots`, so `reachedDescendants( attr, ancestor, undefined )`
returned `[]` and the `1 === reach.length` write guard could never be true. **The council's "the hop has never
produced a write" was therefore a symptom of a one-line omission, not evidence the hop was redundant**, and it could
not honestly be deleted on that basis.

With the input supplied, `resolveIssue` was re-run over all 2,414 issues: the hop is called **1,583 times and returns
0 writes**. 799 calls find nothing declaring the property, 776 cite an ancestor that declares it while calibration
proves no reach, 8 reach exactly one descendant, 2 are the context channel. Of the 8 that passed the write guard, 5
are **correct** refusals by the inner resolver (`background-color: none` three times, `letter-spacing: normal`, and a
`color` differing by width) and the rest resolve to no setting. The structural reason: `writeRound`'s owners retry
already builds the same inputs as the hop's inner `resolve`, so the hop can only add a write where the block's own
attempt failed with a gap other than `no-setting` or `unmapped-element`.

**So deleting the hop would not have changed any of the 2,414 verdicts.** Under `prove-the-cause-before-fix.md` that
is the overlapping fix neither half of which can be removed, and the recommendation at Gate 3 is to **delete it**.
The one cost is that 295 rows lose a `where: 'ancestor'` evidence field; `lib/triage.mjs::canvasSettable` is a
superset and already produces every one of the 161 reclassifications.

#### Decisions the main thread took on merge, each verified before taking it

| Decision | Why, and the proof |
|---|---|
| `HANDOVER_OWNERS` moved to `lib/issue-classes.mjs` | Lanes L8 and L9 had each declared a byte-identical five-element list, and two copies drift. It now lives once in the shared vocabulary module both already imported. The two entry **shapes** stay different on purpose: Solve discovers a handover from a measured walker row, Fill carries one its skeleton declared before any measurement exists, and 3.3 requires only an owner and an evidence row |
| `state-conflict` added to triage's blocked-gap list | L8's new guard made Solve refuse those groups while triage would still have classed them T, the two engines disagreeing again, which is what L8.7 existed to fix. Proven to move nothing here: a measure-only run breaks out of `solveLoop` **before** any write round and emits no gaps at all, and a fresh 17-surface triage returns **0** `resolver-blocked` verdicts either way |
| L9's `evidence` field **not** renamed to L8's `row` | 37 usages across 8 files, and `evidence` matches Spec 47 3.3's own wording. Renaming at merge time would have been risk for no gain, so the divergence is recorded instead |

#### Corrections to figures this plan carried

- **The text and link role counts were all-source totals.** Bean's decision to read **both** halves of each role pair
  is honoured and asserted by test, but the route calibrates SGS-owned blocks only (`lib/db.mjs::attrsFor`, R-47-10),
  so the reads cover **258 text** settings (`text-content` 179 plus `content` 79), not 319, and **14 link**
  (`link-href` 12 plus `link-content` 2), not 39. The remainder are `native_wp` rows on core blocks
  (`core/button::url`, `core/image::href`). Whether core blocks should be calibrated is a deliberate R-47-10 change
  and is **not** taken here.
- **The `transition,*` routing precedent is 4 blocks, not 12.** `sgs/brand-strip`, `sgs/card-grid`, `sgs/info-box`
  and `sgs/testimonial` carry the pair with `css_element` NULL; `sgs/cta-section` carries it on `btn`. Five blocks
  and ten rows in total.
- **`paintKey` and `slotKey` are read by nothing.** They are written into all 94 cache files, and a grep for them
  over `scripts/` hits only `calibrate.mjs` itself. Cache invalidation therefore rests entirely on `--recalibrate`.
  The blast radius is small, because `defaultPaint` strips every inherited property and only
  `lib/resolve.mjs::seedSides` reads the values, so a stale default paint can mis-seed only the unmeasured sides of a
  box setting (lane L7.5).
- **`--stage 1 --dry-run` is not a trustworthy change preview.** It reported `new_attrs: 14`; the real run inserted
  **0**. Only its `updated_attrs: 4` matched reality.
- **C3.1 is not inert before the reseed, and splitting C3.1 from C3.2 blocks every session's deploys.** An override
  the database does not match is a reseed-survival violation: `db-consistency` Check #8 fails, that suite has no
  baseline and no accepted-violation mode, and `build-deploy.py` runs it in its fast tier. A peer session hit it
  within minutes of C3.1 landing. **C3.1 and C3.2 run together.**

#### Two load-sensitive tests, so a future session does not chase them

`tree.test.mjs`'s `assertQuiet` case and `tests/fill-entrance.test.mjs`'s browser-backed case both go red while a
deploy or reseed is running on this machine. Both were seen red here and both were proven environmental: the first
named this session's own reseed, and then a peer's `build-deploy.py --target sandybrown`, in its own message; the
second passed alone and in two consecutive clean full-suite runs. **A red there means the machine is busy.**

#### Wave 3 findings, 2026-10-06

**C3.4: no `transition,*` row calibrates anywhere in the library, so C3.1's routing buys calibration nothing.**
`sgs/hero` was recalibrated on the local mirror after C3.1 (local and mirror build hashes matched at
`b234ef74fee1843483a6b3437f3ed41b`, verified before the run). Both routed settings came back **`noMarker`**, with no
calibrated slot. The cause is `lib/calibrate-markers.mjs::markersFor`, which dispatches on
`row.css_property.split(',')[0]` — `transition` — and has no branch for it: not colour, keyword, enum, box, length or
count, so it falls through to `return []`. **Checked against every precedent block before concluding: `sgs/brand-strip`,
`sgs/card-grid`, `sgs/info-box`, `sgs/testimonial` and `sgs/cta-section` all carry the same pair in `noMarker` with no
slot.** So this is a pre-existing library-wide gap that C3.1's routing joined consistently, not something C3.1 caused.
The one row that moved F → W at the reseed moved on **database** evidence through `lib/db.mjs::candidates`, not on a
calibrated slot.

C3.4's done-condition as written ("`settings[<attr>].slots` contains the cited selector") therefore **cannot be met**
until `markersFor` gains a transition branch. That is route code rather than block code, but it belonged to no lane
this session. **Owner: the next route session.** A marker would need to set a duration and an easing and read
`transition-duration` / `transition-timing-function` off the root, which is a new marker shape rather than a tweak.

**L7.1 is proven on live data, not only in tests.** The same hero run produced `overriddenBy` on ten inherited
settings — `textColour`, `textColourHover`, `fontSize`, `fontWeight`, `fontStyle`, `lineHeight`, `letterSpacing`,
`textTransform`, `fontFamily`, `textWrap` — which is exactly the inherited-only scope L7 built it for.

**C3.6: footer had been unwalkable since sitting i, and no gate could have caught it.**
`sites/<client>/build/qa/parity/footer.mjs` declared a second walker state `modal-open` (added by lane L4 at
`d605bb5ba`) and `pairs.mjs --state modal-open` was never run for it, so `footer.full.mjs` carries **zero** pairs
scoped to that state. `scripts/parity/lib/lint.mjs::lintConfig` refuses any config whose declared state after the
first has no pair scoped to it — its own comment explains why: "a state after the first changes something; a pair
scoped to it must look at what changed". All four widths failed their config lint and the walker wrote no report, so
`solve.mjs` threw.

It was incomplete in a second way: `surfaces.json`'s state map for footer is `["opening"]` only, so `modal-open` was
never mapped to a setting state either. Any row measured in it would have been an unmapped-state row — reported,
never written. **It could not have produced a usable row this session under any circumstances.**

**Why no gate caught it, corrected by the Gate 3 council.** An earlier version of this entry said "no gate could
have caught it". **That is false: the gate exists.** `scripts/parity/draft-live-walk.mjs` calls
`lib/lint.mjs::lintConfig` before any browser opens and `process.exit(1)`s on a problem, so the very first walk of
footer after `d605bb5ba` would have failed loudly. **The accurate finding is that no gate RAN.** The 2026-10-05
baseline ran at `1ea514ae8`, before `d605bb5ba`, and footer's walk history shows nothing between then and C3.6.
Gate 1 re-ran **triage** over already-committed Solve reports and never re-walked a surface, so an existing
walk-time gate sat unexercised for a whole sitting. **A gate's scope is not the defect's scope**: Gate 1 measured
classification, and walkability is a different property that only a walk can test. The cheap structural fix is for
Gate 1 to run `draft-live-walk.mjs --lint` over every surface's `walkerFull`, which needs no browser and no host.

**Fixed by removing the incomplete state, not by completing it**, and the reason is comparability: completing it
would *add* modal coverage, changing footer's issue count for reasons unrelated to the route repairs and confounding
C3.8's delta against the baseline. After the removal footer declares `opening` only with 39 pairs and
`lintConfig` passes, which is exactly the coverage the baseline measured.

**Deferred, with its owner:** footer's size-guide modal coverage needs the `modal-open` state re-declared **together
with** a pair scoped to it (`pairs.mjs --state modal-open`, which the state's own comment anticipated) **and** an
entry in `surfaces.json`'s footer `states` map. All three are needed or the surface breaks again. **Owner: Session D**,
with the surface work, since it adds measurement coverage rather than repairing the route.

### C3.8 — the new framework-gap count. 2026-10-06. This is Session C's output.

Measured at block code **`7f375f765`**, which is what eye-care-test ran at the time of the sweep, **before** HEAD was
deployed there. All 17 surfaces, no abort, `sweep.mjs` and `triage.mjs` with the same commands and flags as the
2026-10-05 baseline. Sweep: `sites/eye-care-ward-end/build/qa/sweep/2026-10-06/sweep.json`, with
`run-manifest.tsv` beside it recording the per-surface timings and the live block code. **Triage output, which is
what Session C2 consumes: `sites/eye-care-ward-end/build/qa/triage/*.json`** (17 files, rewritten by this run).

**Headline, corrected by the Gate 3 council: the defensible result is F 338 → 176, the route code measured on
identical reports. The current measured F on fresh reports is 192, and the step between them is NOT separable.**
338 → 176 is a single-variable change (−162). 176 → 192 mixes three changes and no part of it is attributable.

| Class | Baseline raw (2026-10-05) | Gate 2 (same reports, repaired route) | **C3.7 (fresh reports, repaired route)** |
|---|---|---|---|
| W | 1,562 | 1,765 | **1,242** |
| **F** | **338** | **176** | **192** |
| T | 445 | 445 | **378** |
| U | 28 | 28 | **29** |
| **total** | **2,373** | **2,414** | **1,841** |

`byClass` on the sweep: unresolved 1,618 → 1,396, derived 432 → 395, **unmapped-state 323 → 0**, content 41 → 45.

**The site-wide sweep total is 1,836, not 1,841, and the five are accounted for.** `lib/sweep.mjs::aggregate` keys a
row with no `ref` as `<config>|<issue>`, and **`contact` and `contact-form` declare the same hand walker config**
(`qa/parity/contact.mjs`). Content rows carry no `ref` at all, so five ref-less `presence` rows measured on both
surfaces — `form-card`, `error-name`, `error-email`, `error-topic`, `error-message` — collapse into one site-wide row
each, carrying `alsoIn: ["contact-form"]`. The baseline had zero such rows because content rows only entered the
sweep in sitting i. **The identity the gate requires holds exactly: every surface's triage count equals its sweep
count, on all 17, 1,841 on both sides.**

#### What moved, and why — two independent mechanisms, in opposite directions

The movement decomposes cleanly, because Gate 2 triaged the **identical** reports with the repaired route:

| Step | F | What it isolates |
|---|---|---|
| Baseline | 338 | old reports, old code |
| → Gate 2 | **176** (−162) | **the route code alone.** Sitting i's canvas rule (161 rows) plus C3.1's hero routing (1 row) |
| → C3.7 | **192** (+16) | **NOT attributable — three variables changed at once.** (a) the walker and Solve code (L2's `tag` rows 0 → 618, L4's per-width draft layout, L8, L9, C0.7's state mapping); (b) **the live block code**, because the baseline sweep ran 2026-10-05 11:11 while eye-care-test took `7f375f765` at 19:38 that evening, and `git diff 4726700c1 7f375f765` touches `google-reviews` and `responsive-logo/render.php`, which renders in the header and footer; (c) newly walked states on `contact` and `contact-form`. The per-surface pattern is consistent with state mapping, but nothing isolates it |

**The +16 is rows gaining a class for the first time, not 16 new defects**, and it is per surface:

| Surface | F, Gate 2 → C3.7 | Why |
|---|---|---|
| contact | 1 → **17** (+16) | C0.7 mapped `field-focused` and `form-submitted-empty`. Both were always *defined*, but `walkStates` was `["opening"]`, so neither was ever walked. Walking them **adds** rows, which sitting i predicted in writing |
| product | 5 → **17** (+12) | product held 109 of the 323 unmapped-state rows; mapped, they became judgeable and 12 came out F |
| shop | 2 → 4 (+2) | held 163 of the 323 |
| contact-form | 0 → 1 (+1) | its two form states walked for the first time, as contact's |
| home | 57 → **49** (−8) | held 33 of the 323; judgeable, and most resolved |
| lens | 34 → **28** (−6) | held 18 of the 323 |
| footer | 21 → 20 (−1) | re-run on the repaired config |

Every other surface's F is unchanged.

#### The total fell 2,414 → 1,841, and it is resolution rather than lost coverage

A 573-row drop with nothing deployed demands proof it is not the walker going blind. Checked with the route's own
reader (`lib/solve-rows.mjs::openRows` plus `lib/issue-classes.mjs::isIssue`) on the two surfaces that fell hardest:

| Surface | pairs MEASURED | pairs with an open row | open rows | issues |
|---|---|---|---|---|
| mega-sunglasses | **39 → 39** | 37 → 37 | 467 → 165 | 421 → 115 |
| product | **44 → 44** | 44 → 42 | 6,420 → 4,142 | 5,991 → 3,772 |

⚠️ **The council falsified the inference, and the honest evidence is different from what was first offered here.**
A pair count cannot fail: the measured pair set is fixed by the walker config, so "37 → 37" would hold even if the
walker read nothing. The first version of this section also mislabelled "pairs with at least one open row" as "pairs
measured", which is why it reported product as losing 2 pairs. **Product measures 44 → 44; two pairs now carry zero
open rows, which is an outcome, not a coverage loss.** The "6.7% (3,940 → 3,677)" figure was `issues + otherRows`
summed from the two `sweep.json` files, which counts rows the sweep *classified* rather than rows measured, and it is
withdrawn as a coverage measure.

**The coverage dimension that can fail, measured by the council: the (pair × width × state) instance count held
exactly at 5,060 → 5,060 across the 15 surfaces other than `contact` and `contact-form`**, rising only on those two
(268 → 852) where states were walked for the first time. Accepted diffs fell 3,136 → 2,421, so the drop is not Solve
accepting more. **One real coverage loss the first version missed: `scroll` rows fell 24 → 0 on product and 2 → 0 on
shop — a row kind that vanished, unexplained.** So coverage held on the dimension that could have failed, with that
one named exception, and the drop is consistent with resolution without being proven to be it. The suggested cause is lane
L4's per-width draft layout fix: the walker had been comparing the wrong draft layout at some widths and reporting
phantom differences. That is a measuring repair, which is what this session exists to do — the route was reporting
false gaps.

**Withdrawn: "product lost 2 distinct pairs."** Product measures 44 pairs in both runs; two now carry no open rows.
That is resolution, not a coverage delta. **Owed instead: the `scroll` row kind disappearing on product (24 → 0) and
shop (2 → 0)**, which is a genuine unexplained loss. Owner: the next route session.

#### What this count is NOT

- **It is a raw machine classification, comparable to 338 and never to Session B's audited 163.** An audited
  equivalent needs Session C2's judgement and this session cannot produce one.
- **It measures code that predates 13 blocks' worth of register fixes.** The sweep ran at `7f375f765` deliberately,
  so every register row fixed between that commit and HEAD still reads as open here — including 87's breadcrumb
  weight (`9776e7d86`) and 15's drawer column (`31aa51090`). **Those are fixed in code and will clear on the next
  sweep; they are not regressions.** Measuring before the deploy is what keeps this count attributable to the route
  rather than to a fortnight of block work.
- **The canvas roster is load-bearing data.** Triaging against a manifest with all 12 `canvas` flags stripped
  gives **F 345** against this run's 192, with zero movement on any non-canvas surface. A wrong roster would mask
  genuine page gaps — and Session C2 proved it does, for a named class of claim (Spec 47 §5 Residual, the
  `canvasSettable` entry).
  **Session C2 re-measured this control twice (2026-10-06): 345 on these reports and 346 on its own fresh
  reports, against the 338 first recorded here.** The two independent measurements agree with each other and
  disagree with 338 by 7 and 8 rows; 338 appears to have been the Gate 2 figure (baseline 176) carried forward
  rather than re-measured on this run. **The zero-movement-on-non-canvas half is confirmed**: stripped against
  unstripped reads home 50/50, help 36/36, contact 17/17, about 0/0, lenses 0/0.

#### Still open, row by row, as Session C2's input

| Item | Count | Owner |
|---|---|---|
| F rows to assess | **192** | Session C2, from `qa/triage/*.json` |
| of which `lens` | 28 | C2 — the flow surface, highest single F |
| of which `help` | 36 | C2 — unchanged by the route, so genuinely its own |
| of which `home` | 49 | C2 |
| of which `footer` | 20 | C2 |
| of which `contact` + `contact-form` | 18 | C2, newly judgeable |
| of which `product` + `shop` | 21 | C2, newly judgeable |
| of which the four mega menus + mobile-menu | 20 | C2 |
| U rows, nothing explains them | 29 | C2 |
| `transition,*` calibrates nowhere in the library (`markersFor` has no branch) | 5 blocks, 10 rows | next route session |
| footer's size-guide modal coverage (state + scoped pair + `surfaces.json` state map, all three) | 1 surface | Session D |
| product's 2 lost pairs | 2 | Session D |
| 20 presence rows unwritable (no live element → no trace → no node) | 20 | next route session |
| `link-missing` rows unwritable (`auto-collect.mjs` stores `lk: true`, not the href) | — | next route session |
| `resolveContent` belongs in `resolve.mjs` under R-47-3's one-resolver rule | — | next route session |
| triage's CONTENT verdict ignores Solve's `contentClass` | 45 content rows | next route session |
| the 38 gap-typing rows are not yet re-typed (needs a calibration run per block, then Solve) | 38 | next route session |
| 45 state-conflict groups refused, of which 7 are the named ones | 38 untriaged | Session D |

#### Wave 3's remaining items, measured 2026-10-06

**The deploy. eye-care-test is at `94122e326`, and it was verified two ways rather than from the log.** The host's
`~/.sgs-deploy-marker-eye-care-test.json` reads `94122e3266de2c11be1002e3cc95df4c74ecb8e8` at 03:19:56, and 6 of 7
spot-checked blocks are checksum-identical between the local build and the deployed one
(`lib/deploy-hash.mjs::localBlockHash` against `::remoteBlockHash`). The seventh, `product-card`, differs only
because the local build predates `ea72eab7b` and `23d3f5aea`, which both touched `src/blocks/product-card/`; the
deployed side is the correct one. **The eye-care-test freeze is lifted.**

**S1 is proven end to end, which the canary could never do.** Every Eye Care button on the deployed homepage reads
`transition-duration: 0.25s` across all seven properties — `background-color, color, border-color, transform,
translate, box-shadow, opacity` — with `transition-timing-function: ease`. That is the site's own
`buttonPresets.default.hover-transition` reaching the button rather than the stylesheet's 0.18s fallback, and the
property list including `translate` and `box-shadow` is `1b96cf786`'s fix holding. sandybrown sets no such preset, so
its buttons fall to the fallback and S1 could not be closed there. ⚠️ A freshly inserted button on the **canary**
still computes 300ms because `sgs_block_defaults` pins it there; that is site data, not framework code.

**The four functional flows: 3 PASS, 1 expected FAIL, 0 ERROR**, run as one host job against eye-care-test.

| Flow | Result | Detail |
|---|---|---|
| `bag-two-products` | PASS | bag holds both products (420, 417) |
| `bag-second-unit` | **PASS** | 2 units of 420, second add 905 ms after the first — required to pass, since N11(b) is fixed at HEAD |
| `lens-skip-to-bag` | **FAIL**, signal `skip-opens-extra-step` | expected until register **N38** lands: `choice-flow/block.json` has no "skip adds to bag" setting and `flow-skip.js::handleSkipClick` routes to the add-to-bag ending. A spec item, not a regression |
| `filter-apply-clear` | PASS | panel restored: 10 groups, 10 headings |

No ERROR on any flow, so no selector missed — which matters because the flows had never run against this site and
their selectors come from source.

**C3.5's paid order exists.** Order **652** was inspected before being touched (1 × Oversized Cat-Eye, £289, GBP,
its own order key, which is a credential and is not recorded here) and set to `processing`; `is_paid()` now returns true. Its received URL is
`/checkout/order-received/652/?key=<order key>` (read it with `wp eval` rather than storing it; the key authorises viewing the order without logging in). It matches the draft flow the confirmation walker
follows, so it is the right fixture rather than a new order. **The confirmation walk itself is still owed** — it
needs a quiet host and a peer session holds it.

**`benchmark.mjs --noise`: caught 5 of 5. The noise half is NOT judgeable from this run, and the reason is
measured.**

Fault detection passed outright: all five planted faults were caught with their matching rows (b the floating filter
button, c the clipped price-slider handle, d the `.00` prices, plus e and f on the lens flow). Case **a** is NOT
SCORED by design — the draft carries the same gap, so only design review can catch it.

The noise cases read **13 rows on shop and 9 on lens**, where the 2026-10-03 run read **0 on both**. That looks like
a 22-row stability regression and it is not one: **`sandybrown` was deployed at 03:59:25, between this run's
`shop-control` (finished 03:40:32) and its `case-noise-shop` (finished 04:25:37).** A `build-deploy.py` purges
OPcache, the LiteSpeed page cache and the theme pattern cache on that box, and sandybrown shares the Hostinger host
with eye-care-test, so the control and its own noise case were measured either side of a cache purge and a burst of
deploy verification traffic. ⚠️ **The Gate 3 council found this explanation insufficient, and it is downgraded.** A cache purge on sandybrown
changes no CSS on eye-care-test, so it cannot produce the specific rows observed. The rows are hover rows where the
draft shows its hover end state while live reads rest (`card-gucci` border/box-shadow/transform, `swatch-black`
transform), a `focus` box-shadow flipping between two spellings of "no shadow", and lens rows landing on a different
product between runs — all of which are read-timing properties of the walker. **Decisively, the CONTROL's own hover
row count fell 18 → 6 between the two runs with an unchanged config, then read 11 in the noise run**, which is
walker-read drift the deploy cannot explain. `link-missing` is also a read kind that did not exist on 2026-10-03
(208 rows in both control and noise now), so that run could not have produced those noise rows at all.

**SUPERSEDED 2026-10-06 — the measurement was made and the answer was a third mechanism neither candidate
below covers: PHASE.** 10 runs on a quiet host read 5 noise rows, every one a time-varying value sampled at a
different moment (a draft view-swap fade, a CSS marquee's scroll phase, and a `box-shadow` read at t≈0.999).
Host load is excluded and so is detector flakiness. `reports/2026-10-06-session-c2/BENCHMARK-NOISE-RESULT.md`.
The reasoning that follows is kept because it names the two candidates correctly and its demand for a
back-to-back run on a quiet host is what settled it.

**The position before that run: the 22 noise rows are unproven in both directions.** Host load from the deploy is an available
contributor; the walker's read path changed substantially since the 0-noise run; neither is excluded. The earlier
wording here replaced one unverified cause with another, which is the exact failure
`~/.claude/rules/prove-the-cause-before-fix.md` exists to prevent. **The measurement that would separate them:** run
control and noise back to back five minutes apart on a quiet host (same rows ⇒ walker flakiness; zero rows ⇒ load or
the 45-minute gap), and separately run commit `6a4a02ecf`'s walker against today's host.

**DONE 2026-10-06** (`8210af3a1`, `reports/2026-10-06-session-c2/BENCHMARK-NOISE-RESULT.md`): 10 runs back to
back on a quiet host. Catch rate 5 of 5 scored cases. **Noise settled at 5 rows — and the answer was NEITHER of
the two options predicted here.** The prediction was "same rows ⇒ walker flakiness; zero rows ⇒ load or the
45-minute gap"; the result was 5 rows, every one a **phase artefact**: a draft view-swap fade sampled mid-fade
(already an accepted difference at `qa/parity/shop.mjs`:286), the `sgs/trust-bar` marquee's scroll phase, and one
`box-shadow` read at t≈0.999 (the same shadow — identical colour, with alpha, blur and spread each short by an
identical 0.0950%). So a third mechanism neither candidate covered, which is why the earlier 0-noise run was
legitimate rather than contradictory: every cause is phase-dependent, so a phase-dependent count cannot be
compared across runs without pinning the phase. The superseded wording follows.

**Superseded — the original owed item:** re-run `node scripts/parity/benchmark.mjs --noise` on a quiet host and compare the
noise counts against 0. Until then the catch rate stands at 5 of 5 and the noise figure is unproven in both
directions. **Owner: the next route session**, since it needs ~80 minutes of uninterrupted shared host.

**Still owed and why:** the confirmation walk (needs the host) and the `sgs/media` recalibration that would prove
L7's `text`, `presence` and `link` reads on real data rather than only in fixtures (needs the host, and
`calibrate.mjs` calls `assertQuiet`). Both were blocked by a peer session's sandybrown deploys, which is the correct
behaviour of R-47-11 rather than a fault. **Both claims about L7 are corrected by the Gate 3 council.**

**The content reads were exercised on real data and returned nothing — they are not merely untested.**
`cache/hero.json` was measured at `2026-10-06T01:17:19Z`, **after** L7 landed (proven by the file carrying
`overriddenBy`, which only L7 emits). `sgs/hero` has **17 content-role rows** in the framework database — 10
`boolean-visibility`, 6 `content`, 1 `text-content` — and the file carries **no `text`, `presence` or `link` key at
all**. Since `lib/calibrate-content.mjs::collectContent` omits a key only when empty, the reads ran and recorded
nothing. That is a **real-data null result on a block with 17 qualifying settings, and it is uninvestigated**: it may
be legitimate (no marker, nothing shown or hidden) or the read may be failing silently. Nothing distinguishes the two
yet. A consequence worth stating: with no cache carrying those keys anywhere,
`lib/solve-rows.mjs::resolveContent` has never fired on real data either, and returns `no-setting` by construction.

**`overriddenBy` emits on real data, but its contents carry a systematic false positive.** Ten of hero's 45 settings
carry it and all ten are inherited properties, which is the intended scope. But **all ten name
`.sgs-hero__video-bg > source`** as an overriding child. A `<source>` is a metadata element inside `<video>`: it
renders no box and no text, so it cannot override `font-size`, `color` or `line-height`. It is named because the
marker's inherited value never reached it, and `lib/calibrate.mjs::overridingChildren` infers "has its own rule" from
that absence without checking the element renders. The other two paths it names
(`.sgs-hero__content > span`, `> h1`) look genuine. **Owed: a rendered-box guard in `overridingChildren`**, owner the
next route session. Until then "L7.1 proven on real data" overstates it: the key emits, and its contents are partly
wrong.

### Gate 3 — QC council on this sitting's own claims, 2026-10-06. Three raters, cross-model, no Opus, read-only.

Run as a **retrospective falsifiability gate**: for every load-bearing claim this sitting recorded, is it measured or
asserted, what exact command reproduces it, and would it turn red if the underlying fix were reverted. Raters: a
falsifiability auditor on the numbers and a confound/scope auditor (Sonnet), and a code-path tracer (Haiku). Each was
told to find what the author wanted to be true, and pointed at the rival explanation the author had rejected.

**Structural pre-gate first: all 50 `file::symbol` citations in this sitting's claims resolve, 0 phantom.**

**The council corrected 12 claims and confirmed 7.** Every correction is applied in place above; this section records
what moved and why, so the next session inherits the corrected version rather than the first draft.

#### What held, with the command that reproduces it

| Claim | Status |
|---|---|
| **The three endpoints 338, 176 and 192 all reproduce exactly.** 192 matches the committed `qa/triage/*.json` on every surface with 0 differences | MEASURED |
| **338 → 176 is a genuine single-variable result.** The baseline triage files and Gate 2's run read *identical* `report` paths — verified field by field against `sweep/2026-10-05/sweep.json` — so only the triage code, the database and the manifest differed | MEASURED |
| The canvas-roster control: stripping all 12 `canvas` flags takes F 176 → 338 | MEASURED |
| **Zero block code touched**, verified independently across all 8 session SHAs; the only `plugins/` path is the sanctioned `attr-classification-overrides.json`, and no `*.tree.json` or `divergences.json` was touched | HONEST |
| **Deleting `lib/resolve.mjs::resolveViaAncestor` would change no verdict.** The hop's inner `resolve` receives inputs identical to `writeRound`'s owners-retry, field by field; and `where: 'ancestor'` is written into evidence and report tables but **never read to make a decision**. `lib/triage.mjs::canvasSettable` stamps that same field itself from `r.owners`, so it is not the hop's to lose. The one real cost is a test assertion on the hop's own citation | CONFIRMED |
| **No `transition,*` row calibrates anywhere.** `lib/calibrate-markers.mjs::markersFor` dispatches on the first comma-segment, `transition`, and every branch misses: not colour, not `KEYWORDS` (no entry), not enum, not box, not `tier_object` (`LENGTH` fails), not weight/opacity/transform/letter-spacing/number/count. Fallthrough returns `[]` | CONFIRMED |
| The 5-row sweep dedupe: `contact` and `contact-form` share `qa/parity/contact.mjs`, `aggregate` keys ref-less rows `<config>\|<issue>`, and exactly 5 rows carry `alsoIn: ["contact-form"]`. **All five are W, so F is unaffected.** No other shared walker collapses anything | MEASURED |

#### Three further findings the corrections above do not cover

**1. The 176 is reproducible only from untracked local files.** `.gitignore:189` ignores `sites/*/build/qa/solve/`, and
`git ls-files` finds 0 tracked report files there. The 338 → 176 half of the decomposition re-derives today **only
because the 2026-10-05 report folders are still on this machine**. On a fresh checkout, or after any cleanup of that
folder, it cannot be reproduced at all. The command that works while they exist is
`triage.mjs --client eye-care-ward-end --surface <s> --report <the path in sweep/2026-10-05/sweep.json>`, which
bypasses `lib/sweep.mjs::latestReport`. **Either snapshot those two report sets or treat the decomposition as
machine-local.**

**2. The sweep-to-triage identity is true by construction and is a weak gate.** `lib/sweep.mjs::issueRows` and
`lib/triage.mjs` both import `isIssue`, `isContentRow` and `issueKey` from `lib/issue-classes.mjs`; triage
re-implements only the grouping loop. So the identity guards against that one loop drifting and **cannot** detect a
wrong shared predicate, a wrong classification, or a vanished measurement. It does not turn red when the canvas rule
is reverted, because that changes classes rather than counts. It was presented in the Gate 2 table as evidence; it is
a consistency check.

**3. The per-surface class totals double-count the five shared rows.** W/F/T/U are summed per surface (1,841) while
the sweep dedupes site-wide (1,836). All five are W, so **F 192 is unaffected**, but the W total of 1,242 is inflated
by 5 against a deduped count of 1,237. Worth knowing before anyone compares W across the two figures.

#### The honest headline, after the council

- **The route code alone: raw F 338 → 176 (−162), on identical reports.** This is the defensible result and the one
  to carry forward. It is the canvas rule's 161 rows plus C3.1's single hero row.
- **The current measured state on fresh reports: F 192**, which is what Session C2 consumes from
  `qa/triage/*.json`.
- **The step between them is not separable** and no part of the +16 is attributable, because the walker and Solve
  code, the deployed block code and the walked states all changed at once.
- **The 573-row total drop is consistent with resolution and is not proven to be it.** Coverage held on the one
  dimension that could fail — (pair × width × state) instances 5,060 → 5,060 across the 15 non-form surfaces — with
  one named exception, the `scroll` row kind vanishing on product and shop.

## Inherited from the parallel repairs track (closed 2026-10-05 at `a62ae6fdb`)

That track finished and pushed before this session's Wave 3. It made **no eye-care-test deploy and no
reseed**, so this session's baseline is intact.

⚠️ **Corrected hashes (the track deployed twice more after its first handover message).** **sandybrown's
block code is `1b96cf786`**, not `a62ae6fdb` — which matters because `calibrate.mjs` refuses to run on a
local-vs-deployed hash mismatch, so a cached `a62ae6fdb` would abort C3.4. **The commit to deploy to
eye-care-test is `75364c71a`** (its full range is `7689ebb70..75364c71a`). The two commits after
`1b96cf786` are docs-only, so live equals HEAD in block-code terms. eye-care-test remains untouched at
`7f375f765`.

The extra code commit was a self-caught regression worth knowing about: `c1c660428` stopped `sgs/button`
emitting a per-instance `transition: all` and let `button/style.css`'s base rule carry the timing, but
that list named only `background-color, color, border-color, transform, opacity` while `render.php`
paints the hover lift as `translate: 0 -Npx` and the shadow through `sgs_shadow_decls()` — `all` had
covered both, the explicit list did not, so a button using `liftHover` or `boxShadowHover` snapped.
`1b96cf786` adds `translate` and `box-shadow` and drops `product-card/style.css`'s hardcoded
`transition: all 0.15s` so those buttons read the site token. It shares this checkout, so its thirteen commits are
already in `main`'s history and interleave with this session's — which is why every commit here uses
an explicit pathspec.

**Wave 3's deploy order is agreed with it and must not be rearranged:**


#### ✅ Register CR6 is coupled to this lane's code — and that coupling is now DISCHARGED (2026-10-07)

The Spec 47 route cleanup is complete and CR6 is owned by the route track, so the helper change, the
`seedSides` deletion and the `tests/resolve.test.mjs` "MUST FAIL TO ZERO" case now land together in one
session. The validated design is in `plans/2026-10-05-eye-care-functionality-backlog.md` §"CR6". The coupling
itself, verified below, is still exactly why they must land together.

Found by the other track's `/qc-council` gate and **verified here against the files themselves**:
`lib/resolve.mjs::seedSides` **deliberately models** the defect CR6 wants removed, and
`tests/resolve.test.mjs:89` ("MUST FAIL TO ZERO: one side into an empty box keeps the other sides at
their default paint") asserts the compensation. `seedSides`' own comment cites the helper by name —
"A box with some sides set prints 0 for the rest (`helpers-box.php::sgs_box_object_shorthand`),
overriding the block's own stylesheet default" — and a second comment reads "(an unset side there
prints 0, CR6)".

So the coupling is real and runs both ways. The helper's behaviour **is** a genuine framework defect
(setting one side of a padding box wipes the block's own defaults on the other three; measured live on
About, 24px sides to 0px), and the resolver models it **correctly as it stands**. But the moment the
helper stops zero-filling, `seedSides` becomes wrong in the opposite direction: it would seed sides
that no longer need seeding.

**Neither file has been touched by either track.** The other track has re-tiered CR6 out of its build
list and gated it behind this route work. The validated fix shape is a **new sibling function beside
the old one**, so the 157 call sites that interpolate the value after `padding:` migrate deliberately
rather than all at once. If the zero-fill assumption is ever to leave this lane, that is the shape,
and it needs coordinating rather than racing — the helper change and the `seedSides` change must land
together, or every box write is wrong in one direction or the other.

1. **C3.6 measures eye-care-test at `7f375f765`** — the code live there now. This is the count Session C exists to produce, and it is only attributable to the route while that code is unchanged.
2. **Then deploy HEAD** to eye-care-test (block and theme code only; no trees, no snapshot, no ledger entries).
   ⚠️ Corrected 2026-10-06: the target is **HEAD**, not `a62ae6fdb` and not `75364c71a`. The block and theme delta
   between what eye-care-test runs (`7f375f765`) and HEAD is **31 files across 13 blocks** — `brand-strip`,
   `breadcrumbs`, `business-info`, `button`, `buybox`, `cart`, `heading`, `hero`, `nav-drawer`, `option-picker`,
   `product-card`, `site-footer`, `tabs` — plus `theme/sgs-theme/theme.json` (S12's `:focus` → `:focus-visible`
   line). That range is sitting i's register work as well as the parallel track's, so no single earlier hash
   describes it.
3. **Then read one Eye Care button's computed `transitionDuration`** and record it against register S1. sandybrown sets no `buttonPresets.default.hover-transition`, so its buttons fell to the stylesheet's 0.18s fallback and S1 could not be proven end to end there; eye-care-test sets 0.25s, so this deploy is what proves it. The register row already states that limit, so an unread measurement leaves no false claim — but taking it closes the last gap in that track's evidence.

**Three findings from its verification, each of which would otherwise arrive as fresh work:**

| Finding | Why it matters here |
|---|---|
| **`sgs/product-card` throws a TypeError in the block editor** (`Me is not a function` at `edit()`), reproducible with that block alone on an empty new page | Pre-existing and neither track's. It is a **real defect and not a Spec 47 finding**, so it travels to the handoff as its own item rather than surfacing as route noise |
| **The canary's `sgs_block_defaults` option pins `sgs/button` (127 attributes) and `sgs/text` (112) to `transitionDuration: 300`**, and `extensions/block-defaults.js::applyBlockDefaults` merges it over `block.json` at registration | So a **newly inserted** button on sandybrown still gets 300 despite the new 0 default, while existing buttons compute 0.18s. This is site data, not framework code: **do not read a 300ms transition on a freshly inserted canary button as S1 being unfixed.** Directly relevant to Session C2, which will judge button findings |
| **`sgs_header_rows_align_css()` shares N46's latent shape.** Its own comment says header rows render into the outer element "in the common case (no content band)", so a header **with** a content band would collapse its rows exactly as the footer did | Deliberately left untouched, because this session is measuring that surface. **If a capped header row reads collapsed in C3.6's sweep, this is the cause and it is a real gap**, not a measuring artefact |

**Two measurement limits inherited with its items**, both already in the register:

- **Register 38 and 68 could not be exercised on sandybrown at all** — nothing there renders `.sgs-business-hours__day` or a tile-style option picker, so those stylesheets are never even enqueued. That reads later as "fix unverified" when it is really "the canary cannot show it". Eye Care renders both, so this session's sweep is where they are exercised.
- **S12 is larger than its register row.** The framework half (`theme/sgs-theme/theme.json`'s `:focus` → `:focus-visible`) is fixed, but the canary's `wp_global_styles` post (post 7) carries the same `:focus` node and overrides the file, as do three client snapshots. `8aa7274ef` changed `sites/eye-care-ward-end/theme-snapshot.json` in the repo, but **nothing has been pushed to the site**, so the underline is still live on eye-care-test. **Do not record a residual focus underline against the framework**: the framework half is done and the remainder is a user-layer value awaiting a snapshot push, which is Bean's call and outside this session.

### Wave 3, main thread, serial, one host job at a time

| id | Item | Done when |
|---|---|---|
| **C3.1** | **R1: the 32 routable rows, declared in the hand-authored override channel.** See "R1 in detail" below | every row declared in `plugins/sgs-blocks/scripts/attr-classification-overrides.json`, **never in the derived layer and never as an `UPDATE`** |
| **C3.2** | One reseed, from clean HEAD, **after messaging peer sessions** | `/sgs-update` completes |
| **C3.3** | The database consistency check | `python plugins/sgs-blocks/scripts/db-consistency/run.py --check` passes, invariants A, B and C green |
| **C3.4** | **Recalibrate every block whose code OR routing columns changed**, on the local WSL mirrors. Includes CR17's `sgs/business-info` and CR12's `theme-toggle` | each block's cache file regenerates; for every row C3.1 routed, `settings[<attr>].slots` contains the cited selector; no new `dead` or `noMarker` outcome |
| **C3.5** | **A paid test order on eye-care-test**, so the confirmation surface paints its tick and continue link (PA-5) | the confirmation walk is complete |
| **C3.6** | **One measure-only sweep**, all 17 surfaces, same command and flags as the 2026-10-05 baseline, from clean HEAD | `sweep.json` written, with the surfaces measured stated beside the result **and the block code it was measured at**. The parallel repairs track holds its eye-care-test deploy until this has run, precisely so this count is attributable to the route and nothing else: confirm with it before measuring |
| **C3.7** | **Re-triage all 17 surfaces** | the sweep-to-triage identity holds; every delta against 2,373 explained |
| **C3.8** | **Record the new F count and what moved** | a table in this plan: F before, F after, and per lane the rows it reclassified with the reason, **plus the path of the post-C triage output** (`sites/eye-care-ward-end/build/qa/triage/*.json`) and **the list of rows still open**, row by row. The table explains the move; the row list is what Session C2 actually consumes |

**"The blocks it touched" is defined as any block whose code *or* `block_attributes` routing columns changed.**
Otherwise C3.1, which changes no code, recalibrates nothing and stays inert.

#### R1 in detail (C3.1)

Three facts about the route decide R1's scope. Each is verified against the code and the database, and each rules
out an obvious-looking approach:

1. **`resolve.mjs` never reads `css_element`.** `grep -c css_element scripts/computed-route/lib/resolve.mjs`
   returns **0**; `lib/db.mjs::candidates` filters on `css_property` and `css_state` only. The column is read by
   `lib/calibrate-instances.mjs` (where to put a state marker) and by triage's evidence print. **So declaring
   `css_element` resolves nothing until the affected block is recalibrated** — which is why C3.4 follows C3.2, and
   why "touched" is defined as above.
2. **Declaring `css_property` on an enum row destroys a working path.** `lib/db.mjs::enumSettings` selects
   `css_property IS NULL AND enum_values IS NOT NULL`; that 633-row pool feeds `calibration.discovered`, which
   feeds `resolve.mjs::resolveDiscovered`. `sgsChildSizing` **is** an enum (`["fit","fill","fixed"]`), so routing
   the original flagship example would have made it **worse**.
3. **The animation half is resolver work**, which is L1.2, not routing.

**The split of the 188 NULL rows:**

| Family | Rows | Verdict |
|---|---|---|
| `sgsChildSizing` 10, `sgsHoverEasing` 9, `sgsHoverDuration` 9 | **28** | **Never route.** All enums; they work through discovery, and **L1.3** keeps them working |
| `sgsAnimationDuration` 64, `sgsAnimationEasing` 64 | **128** | **L1.2**, the `anim:`/`fx:` namespaces. Resolver work |
| `sgsChildWidth` 10, `sgsHoverDurationMs` 9, `sgsHoverZoomDuration` 9, `transitionEasing` 3, `panelSize` 1 | **32** | **C3.1's whole scope** |

`sgsHoverDuration` (an enum of tokens) and `sgsHoverDurationMs` (a number) are the same setting in two units on the
same 9 blocks. **Route one, never both**, or
`(block, css_property, css_layer, css_element, css_state, css_tier)` resolves to two attributes and invariant C
fails with `AmbiguousLayerAttrError`.

**Per-row rules, all mandatory.** Never route a row whose `enum_values` is non-NULL. Never infer `css_element` from
the attribute's name: derive it from the BEM element the block's `render.php` or `style.css` actually declares the
property on, cited `file::selector`. **A wrong `css_element` is worse than NULL**, because it sends calibration's
marker to the wrong element, so Solve writes a real value onto the wrong element: one row closes, another opens,
and the database asserts a falsehood every future session inherits.

**Declare it in the hand-authored override file, and nowhere else.** `css_property` and `css_element` are **derived
columns**: `/sgs-update` resets them to NULL and rebuilds them from two layers, a **derived** one
(`plugins/sgs-blocks/scripts/behavioural-analyser/css-property-classifications.json`) and a **hand-authored** one
(`plugins/sgs-blocks/scripts/attr-classification-overrides.json`, loaded as `ATTR_CLASSIFICATION_OVERRIDES` by
`sgs-update-v2.py`), plus `extension-roster.json` for `source='sgs-ext'` rows.

⚠️ **The derived file is not the channel.** Its own `_doc` header reads: “a
REGENERATED file, not hand-edited”, refreshed by `behavioural-analyser/extract-signatures.py` and applied by
`sgs-update-v2.py` Stage 1C as the **base** layer, with `attr-classification-overrides.json` applied **after and
winning on any field conflict**. So an edit to the derived file is wiped by the next `extract-signatures.py` run as
surely as a bare `UPDATE` is wiped by the next reseed, and both fail
`db-consistency/check_css_property_reseed.py` invariant B. **Routing means declaring in
`attr-classification-overrides.json`.**

#### R1 decided (C3.1): 2 rows routed of the 32, and the other 31 must stay NULL. Decided 2026-10-05.

The 32 are confirmed exactly: `css_property IS NULL AND enum_values IS NULL` on `sgsChildWidth` 10,
`sgsHoverDurationMs` 9, `sgsHoverZoomDuration` 9, `transitionEasing` 3, `panelSize` 1, with **none**
blocked by `enum_values`. (For scale: 4,438 rows have a NULL `css_property` and 3,805 of those have
NULL `enum_values`. The plan's "188" is the audited subset that the route actually meets; most NULL
rows are behaviour settings such as `sgsCustomCss` and `sgsCondition*` that correctly paint nothing.)

**But the premise that the 32 are "routable" is wrong, and the database is right as it stands.**
`src/blocks/extensions/extension-roster.json`, which seeds the `source='sgs-ext'` rows, states the
policy in its own `_meta.css_slots`: attributes that "compose into one declaration" or "paint a slot
a block can already own (width, hover shadow, image zoom) keep css_property NULL", and "omitted =
NULL: no single CSS property to route". `sgsHoverOpacity` and `sgsHoverIndent` **do** declare theirs,
so these NULLs are a design decision, not an oversight. No build-time injector reads any of the five
families; every reader is a PHP `render_block` filter or a `render.php`.

**Routed: 2 rows, both on `sgs/hero`.**

| Row | `css_property` | `css_element` | Evidence |
|---|---|---|---|
| `sgs/hero::transitionEasing` | `transition,transition-timing-function` | NULL (root) | `hero/style.css::.sgs-hero` is the **sole** consumer: `transition-duration: var(--sgs-transition-duration, 300ms); transition-timing-function: var(--sgs-transition-easing, ease-in-out); transition-property: background-color, color, border-color`. Emitted by `includes/helpers-tokens.php::sgs_transition_vars`, called from `hero/render.php` |
| `sgs/hero::transitionDuration` | `transition,transition-duration` | NULL (root) | The same rule, the same element. Routed **with** easing because they are one pair: routing easing alone would leave a `transition-duration` row gapping while its twin resolved |

The spelling and the NULL `css_element` follow the established precedent exactly: 12 sibling blocks
using the same helper are already routed this way (`sgs/brand-strip`, `sgs/card-grid`,
`sgs/info-box`, `sgs/testimonial` all carry `transition,transition-duration` with `css_element` NULL).

**Held, 31 of the 32, each with the reason it must stay NULL.** A wrong `css_element` is worse than
NULL, and a row routed onto a conditional declaration is worse still: the resolver would write a
value that paints nothing, closing one row and opening another.

| Family | Rows | Why it stays NULL |
|---|---|---|
| `sgsChildWidth` | 10 | It paints `width` on the block root (`includes/child-sizing.php::child_sizing_declarations`, a per-instance scoped rule on `.sgs-child-sizing.<uid>`), **but only when that tier's `sgsChildSizing` is `fixed`**. The resolver cannot express that precondition, so a write without the enum set paints nothing. The roster says to keep it NULL because it composes with `sgsChildSizing`, and the roster is right |
| `sgsHoverDurationMs` | 9 | **The same setting as `sgsHoverDuration` in different units**, on the same 9 blocks: `includes/hover-effects/vars.php::build_hover_vars` emits one `--sgs-hover-duration` from whichever is set, and the editor labels the number "Overrides the duration above. 0 = use it." Routing both would resolve one lookup to two attributes and fail invariant C with `AmbiguousLayerAttrError`. Routing either is wrong anyway: the only generic reader is the shared `.sgs-has-hover` `transition` shorthand in `assets/css/extensions.css`, which lists six properties and applies only while a hover effect is active, so it paints **no single property** |
| `sgsHoverZoomDuration` | 9 | Four are **inert** — `container`, `google-reviews`, `pricing-table` and `whatsapp-cta` list `imageZoom` in `supports.sgs.hoverExcludeControls`, so the variable is never emitted and the control is hidden; a marker would have no element to land on. Of the rest, `info-box`, `media` and `product-card` land on `.sgs-media-el` through a **shared** selector, which is not a BEM element of the block; `cta-section` lands on the root's `::before`, which has no element name at all; and `team-member`'s real target is an `img` **inside** `.sgs-team-member__photo`, so a `css_element` of `photo` would send the marker to the wrapper |
| `transitionEasing` | 2 of 3 | `gallery` consumes the variable on **8** different elements (carousel arrows, dot, item, `__img-wrap::after`, img, overlay, grayscale img, caption) and `post-grid` on **3** (`__card`, `__img`, `__badge`), with the root carrying only the default. No single `css_element` is true |
| `panelSize` | 1 | `nav-drawer/render.php::$sgs_nd_geometry_for_anchor` uses it as a **`min()` cap** — `width:min(<panelSize>, 100vw)` — and only for 3 of its 7 anchors (`side-start`, `side-end`, `trigger`, `centred`). It is ignored for `full-screen`, `header`, `container` and `header-box`, which set their own width. Conditional on the anchor, so the same objection as `sgsChildWidth` |

**What this means for Wave 3.** C3.1 declares **2 rows** in
`plugins/sgs-blocks/scripts/attr-classification-overrides.json` and nowhere else, and C3.4 then
recalibrates **`sgs/hero` only**, since that is the one block whose routing columns changed.
`css_element` drives no resolution (`grep -c css_element scripts/computed-route/lib/resolve.mjs`
returns 0), so the measurable gain is whatever a `transition-duration` or
`transition-timing-function` row on hero's root now resolves — a small number, honestly reported.

**The far larger routing finding is that 31 of the 32 were never routable**, and recording that
stops a future session re-opening them. The 13 rows lane L5 hands over
(`DB_STATE_MISSING_HOVER` 11 and `STATE_FOCUS_UNROUTED` 2, where the DB row's `css_state` is NULL
rather than its `css_property`) are a **different** question — a missing state, not a missing
property — and they are genuinely routing data. They are listed in L5's commit and belong to a
later routing pass, not to C3.1's 32.

**Measure the closure on the 32 before extending.** Any figure for how many rows this unblocks is **unproven** until
a batch is routed and the affected blocks are recalibrated, because `css_element` does not drive resolution.
Replan from what the 32 actually close.

### Gate 3 (end of the session)

```
GATE 3: the route is repaired and re-measured
AFTER: Wave 3
PASS: every item in "The work" built, or carrying proof in this plan that it was already built or no longer applies;
      node --test, lint.mjs, check-no-client-names.py all green from clean HEAD;
      db-consistency/run.py --check green, invariants A B C;
      the sweep-to-triage identity holds with every delta explained;
      the new F count recorded with what moved, per lane;
      NO divergences.json entry was added to close a row (C0.3's touch-target entries are the one declared
      exception, and they close D rows, not F rows);
      no block.json, render.php, block style.css, theme CSS or shared helper was touched (git diff --name-only
      proves it)
FAIL: the F count cannot be explained, or a block file was touched
TYPE: auto-gate, then Bean sees the before-and-after F table
```

## The new rule: canvas awareness (FR-47-8, R-47-12)

**The problem.** Bean's challenge, in plain terms: a mega menu, a modal and a choice flow are empty canvases held
in their own CPT post and composed by the author from whatever blocks suit. On such a surface, "the block this
element belongs to declares no setting for this property" says nothing about whether the value can be set, because
the author is expected to reach for a block that can hold it. The route asks the attributed block and nothing else,
so it reports a framework gap where the framework is working as designed. Bean: the lens flow looks almost
perfect, yet it carries 35 F rows, and the mega-menu rows are 22 more.

**What the spec does not say.** Spec 47 contains nothing about `providesContext`, `usesContext`, block context as a
settings channel, choice flow as a canvas, or checking a parent before declaring a gap. Its gap classifications
(`no-setting`, `ambiguous`, `shape`, `linked`, `used-value`, `unmapped-element`; Hardcode / Missing setting /
Intended / Unresolved / Handover) have no parent or canvas step at all. The nearest existing text is R-47-5, which
already uses "its parent's measured live value" for inherited properties — so the spec accepts that a parent can
own a value, but only for inheritance, never for settings. **That silence is the defect.** This is a new
requirement, not a correction to an existing one.

**The wording, now written into Spec 47 §1 as R-47-12 and §3.8 as FR-47-8.** Read it there rather than here; the
summary is that a surface the manifest marks `canvas: true` may not have a row classed **Missing setting** on the
evidence of the attributed block alone. The route checks, in order: (a) the attributed block; (b) every ancestor
block in the same canvas tree, including the canvas root; (c) every block already present in that canvas tree that
declares the property, ancestor or not; (d) the block context channel (`providesContext` / `usesContext`). If any
of them can hold the value the row is a **route gap**, reason `canvas-settable`, citing the block and attribute
that can hold it. In the triage classes this session uses, that is **W**.

**Where it lives: both, with different jobs, because they answer different questions.**

| Half | Where | What it does | Why there |
|---|---|---|---|
| (b) and (d) | **`lib/resolve.mjs`** (L1.4) | an ancestor and context hop the resolver can *resolve and write* through | the resolver is the one engine (R-47-3); a write must go through it |
| (c) | **`lib/triage.mjs`** (L1.5) | refuse **F** when any block in the canvas declares the property, and cite it | a classification question, not a write path: the route cannot decide which sibling *should* hold the value, so it must refuse F and hand it to a human |

**The MUST-FAIL test.** A fixture where the draft wants padding on an `sgs/mega-group` inside a mega-menu canvas
whose `sgs/mega-panel` ancestor declares a padding box family. Assert the row classes **W** / `canvas-settable`
citing `sgs/mega-panel::<attr>`. **The negative control:** with the canvas rule disabled the same row classes
**F**. Shown red before the fix, green after.

**The canvas roster is data, not a hardcoded list.** It belongs in `surfaces.json` as a per-surface
`canvas: true` flag, derived from the surface's post type, so a new canvas kind needs no code change. L1.4's phase
1 proposes where the flag is read; `surfaces.json` is a shared file, so **the main thread makes that edit**, not
the agent.

**This rule does not close any row by itself.** It reclassifies rows from F to W with a citation. Session C2 then
tests whether the cited block really can hold the value on the live site. A reclassification is a claim, and C2
is where it is checked.

## The two answers Bean gave, both applied

**The text read covers both roles: 319 settings** (`role` `content` 84 + `text-content` 235). Reading `content`
alone would have left register items S7, N27, N31, 91 and N28 unreachable, because most of this register's words
live in `text-content`. The cost is calibration time, which is chunked and cached. Spec 47 §3.2 carries it, and §6's
row is closed. **L7.3 builds to 319.**

**The canvas roster is every CPT and every theme page template**, which on Eye Care is **12 of the 17 surfaces**:
`header`, `footer`, `mobile-menu`, the four mega menus, `size-guide`, `lens`, `contact-form` (posts of `sgs_header`,
`sgs_footer`, `sgs_drawer`, `sgs_mega_menu`, `sgs_modal`, `sgs_choice_flow`, `sgs_form`), plus the theme templates
`shop` and `product`. The five ordinary pages (`home`, `about`, `lenses`, `help`, `contact`) are not canvases.

**This includes the header and footer.** An earlier draft of this plan excluded them, on the grounds that the route
writes their trees itself so a missing setting there is a real gap; Bean overrode that, and the shipped result bears
it out — header F went 15 to 0 and footer 76 to 21 at Gate 1. The flag is one manifest field per surface
(`surfaces.json`, applied in C0.6), so the roster changes with no code change.

## The one item not built

**Spec 47 stage 5, a second draft from a different designer, to test generality.** It is blocked on a second draft
existing. No amount of route work unblocks it. It stays in §5's build order with that reason stated, and it is the
only item in the spec this session does not build.

For completeness, **stage 6 is not route work**: Spec 31 decides, under its own plan, whether
`sc_var_responsive_bridge.py` is still needed once script-rendered drafts route here.

## Declared limits, not work

These read like gaps and are not. They are recorded so a later session does not re-open them as unbuilt work.
Each is a stated design limit of Spec 47.

| Limit | Section |
|---|---|
| Box rows (`w`, `h`) name no CSS property, so no setting can hold them: never written, listed as derived, and they close when the spacing that moves them closes | §3.3 step 3 |
| A draft width that is not a plain declared length is reported as a `used-value` gap, because a computed width is the box's used size and writing it would freeze a fluid layout | §3.3 step 3 |
| Rows of kinds other than style, hover, box, and now text, presence and link, are reported, never written | §3.3 step 3 |
| A state with no trigger, a hidden element that cannot be hovered, or a header that never takes its scrolled class is listed in `untestedStates`, never calibrated as rest | §3.2 |
| A block with more than `CHUNK` (150) instances is built and read across several pages (google-reviews has about 400; a 400-instance save failed with an invalid JSON response) | §3.2 |
| A block with no fixture is reported, not guessed | §3.2 |
| `lib/tree.mjs::stripRefs` leaves that surface's generated walker config no longer working | §4 |
| Hostinger's edge answers headless browsers with a 403 after bursts, and a captcha even to headed logins; run against the local WSL mirrors | §3.3 step 2 |
| The block swaps in register 27, 29 and 30 are outside the footer proof and appear as Unresolved or Missing setting | §5 stage 2 |
| Register 25's footer height follows from register 29, 30 and 34 | §5 stage 2 |
| The footer proof's criterion 2 misses by one element at one width (the copyright line, 348px to 344px); the guard found no write on that element to revert | §5 stage 2 |

## Effort

Headline figures are the optimistic ones (`~/.claude/rules/time-estimates.md`). Every lane is first-attempt with no
historical calibration. The basis is the lane's file count plus whether it has a named precedent in the route.

| Unit | Headline | Band | Notes |
|---|---|---|---|
| Wave 0 (C0.1 to C0.4) | 30 min | Block | C0.2 needs the host |
| L1 Resolver (5 items, serial in-lane) | 40 min | Session | the critical path of Wave 1 |
| L2 Walker core (7 items) | 30 min | Block | 7 GAP-CHECKLIST sections |
| L3 Flows (3 items, new files) | 35 min | Block | needs eye-care-test for the flow runs |
| L4 Pairing (5 items) | 25 min | Block | |
| L5 Fixtures and harness (5 items) | 20 min | Block | |
| L6 Sweep (4 items) | 15 min | Quick | |
| **Gate 1** (merge 6 lanes one at a time, read every diff) | 30 min | Block | serial, main thread |
| L7 Calibration reads (5 items) | 30 min | Block | |
| L8 Solve writes (6 items) | 30 min | Block | overlaps L7 from phase 1 |
| L9 Fill (2 new files) | 25 min | Block | **off the critical path** |
| **Gate 2** (merge 3 lanes, re-triage 17 surfaces) | 25 min | Block | serial, main thread |
| Wave 3 (C3.1 to C3.8) | 70 min | Session | reseed 10, db check 3, recalibrate 20, sweep 30, re-triage 5 |

**Sitting i:** Wave 0 plus Wave 1 plus Gate 1, about **1 h 40** wall clock (Wave 1's lanes run in parallel, so the
lane total is not the elapsed time; L1 at 40 min sets it).
**Sitting ii:** Wave 2 plus Gate 2 plus Wave 3, about **2 h 5**.
**Total about 3 h 45**, which is why it is planned as two sittings with a clean stop at Gate 1.

**What L9 adds: nothing to the critical path.** It runs parallel inside Wave 2 beside L7 and L8, both of which are
longer, and it has no dependents. Gate 2 gains about 5 minutes to read its diff. **What stage 5 would add: it
cannot start**, so the figure is not a time but a blocker.

**Value order, false findings removed per optimistic minute:** L2.6 and L2.7 first (24 rows retired in one B2
batch alone, inside a 30-minute lane), then L1.1 and L1.4/L1.5 (the mega-menu 22 and the lens-flow 35 are the two
largest contested blocks of F rows), then L3 (323 unjudgeable rows get a state), then L1.2 and L1.3 (156 rows
become resolvable), then the rest.

## Risks

| Risk | Impact | Likelihood | Mitigation | When |
|---|---|---|---|---|
| **L1.1 or L1.4 widens the candidate set, so rows that resolve today become `ambiguous`** | High | High | order both hops strictly after direct and `reaches` ties; record the ambiguous count in C0.4 and treat a rise as a Gate 1 fail | before + gate |
| **L1.1 writes a parent's inherited value and changes every other descendant** (`sgs/container`'s 13 typography attributes inherit everywhere) | **High** | **High** | the hop may **explain** a row, so it classes as resolved, but must **refuse to write** a parent attribute whose paint reaches more than one measured descendant; the write belongs on the child | during |
| **L1.3 or C3.1 routes an enum row and deletes a working discovery path** (633 rows depend on `css_property` staying NULL) | **High** | Medium | never route a row with non-NULL `enum_values`; a detector listing `enum_values NOT NULL AND css_property NOT NULL`; diff `calibration.discovered` per block against C0.4 | before + gate |
| **C3.1 declared in the wrong file.** A bare `UPDATE` is wiped by the next reseed, and the *derived* classifications JSON is wiped by the next `extract-signatures.py` run | High | **High**: the derived file is the one that looks like the channel, and its name says so | declare only in `plugins/sgs-blocks/scripts/attr-classification-overrides.json`, then reseed, then `db-consistency/run.py --check` invariant B | during + gate |
| `sgsHoverDuration` and `sgsHoverDurationMs` both routed, so invariant C fails with `AmbiguousLayerAttrError` | High | High | route one unit of each pair, never both | during |
| **A wrong `css_element`** sends calibration's marker to the wrong element, so Solve writes onto the wrong element | **High** | Medium | derive it from a cited `file::selector`; assert after C3.4 that `settings[attr].slots` contains it | gate (3) |
| **L1's changes invalidate Session B's whole classification** | High | Medium | L1 merges as its own commit; re-run triage on all 17 surfaces at Gate 2 and require the sweep-to-triage identity | gate (2) |
| **L6 adds row kinds and the 2,373 identity breaks silently** | High | Medium | the gate is that each surface's triage count equals its sweep count, and every delta against 2,373 is explained row-for-row in the commit | gate (1, 2) |
| **The canvas rule reclassifies F to W without proof** that the cited block can really hold the value | Medium | High | a reclassification is a claim with a citation, never a closure. Session C2 step 2 tests each one live | by design |
| Two lanes edit the same file because a phase-1 approach names a file outside its list | High | Medium | the agent stops and reports; re-run the collision check whenever an approach names an outside file | before |
| A reseed during Wave 1 or 2 breaks another session's deploy | High | Low | Wave 3 owns the one reseed; lanes are told not to reseed; message peers first | during |
| **Wave 3's recalibration times out**, as CR17's business-info did twice | Medium | High | WSL mirrors, `--max-old-space-size=8192` and `SGS_CAL_CHUNK=50` where a block needs it (P0-10); recalibrate only changed blocks | during |
| Hostinger challenges the automated browser after bursts | Medium | Medium | `SGS_HEADED=1`, one host job at a time, WSL mirrors as the fallback (`scripts/local-wp/README.md`) | during |
| **L3's flows need a bag, a filter and a lens pop-up on a live site**, so the lane needs host access the orchestration denies agents | Medium | High | L3's agent writes the flow scripts and unit-tests their state mapping; the **main thread runs them** against eye-care-test in Wave 3 as one host job | before |
| L9's FR-47-4 done-condition is unreachable here (no unbuilt surface) | Low | Certain | stated in L9; the done-condition is §5 stage 4's hand-checked-answer half instead | by design |
| A lane fails its gate and its items are quietly lost | Medium | Medium | on a fail, the other lanes still merge and **the failing lane's items stay open in this plan with the lane named** | gate |

## First action (under 5 minutes, no dependencies)

Confirm live = HEAD by checksum (C0.1), because the Google reviews track was mid-deploy at Session B's handoff and
nothing should be measured against an unknown build:

```
python plugins/sgs-blocks/scripts/build-deploy.py --target eye-care-test --verify-only
```

Then md5 the deployed front-end files and grep the server, per
`~/.claude/projects/.../memory/verify-deploy-by-checksum-not-liveness.md`. If a deploy or reseed is still running,
`node --test "scripts/computed-route/tests/*.test.mjs"` returns 236 of 237: that is `lib/tree.mjs::assertQuiet`
(R-47-11) working, not a regression. Re-run once the host is quiet and expect 237 of 237.

## Handoff per wave

```
[Wave 1 — handoff]
  Trigger: six subagents in one message, isolation: "worktree", one per lane L1 to L6
  Entry context per lane: this plan's lane table; .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md section named
                 in the lane's "Spec 47" column; scripts/computed-route/README.md; the lane's own files
  Model: opus for L1 (it changes the shared engine), sonnet for L2 to L6
```

```
[Wave 2 — handoff]
  Trigger: three subagents, L7, L8, L9, after L1 has merged
  Entry context: this plan's lane table; Spec 47 §3.2, §3.3, §3.4; L7's agreed output shape for L8 and L9
  Model: opus for L7 (it changes what calibration records), sonnet for L8 and L9
```

```
[Wave 3 — handoff]
  Trigger: main thread only; /wp-sgs-deploy for any deploy ceremony; /sgs-update for the one reseed
  Entry context: .claude/dev-setup.md; CLAUDE.md build and deploy rules; P0-10's calibration memory;
                 the C0.4 baselines
```
