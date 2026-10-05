---
title: "Eye Care Session C: repair the measuring route (Spec 47 gaps only)"
project: small-giants-wp
created: 2026-10-05
status: not started
governs: Session C of .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md
references:
  - .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
  - .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md
  - .claude/plans/2026-10-05-eye-care-session-c2-finding-assessment.md
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - scripts/computed-route/README.md
---

# Eye Care Session C: repair the measuring route (Spec 47 gaps only)

**Goal:** every declared-but-unbuilt and known-broken part of Spec 47 is built, the route stops producing findings
that ignore how the framework works, and a fresh measure-only sweep and triage on the repaired route record a new
framework-gap count. **No block controls and no shared CSS files are touched in this session.**

**Status: not started.** Bean approved this work and set its order: the route first, the findings afterwards.
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
`.claude/plans/2026-10-05-eye-care-session-c2-finding-assessment.md`. The block work (W1 and W2 there) sits behind
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
| **C0.2** | Clear the sandybrown deploy blocker | `build-deploy.py --target sandybrown` passes its oldshape audit. It aborts today on 155 old-shape `sgs/cta-section` blocks on the Spec 47 calibration page (post 4750). Migrate with `scripts/wp-migrate-oldshape-blocks.js` or empty the page (calibration replaces it with an empty tree at the end of each run anyway). **Never `--skip-oldshape-audit`** | 10 min |
| **C0.3** | W0a: 15 new ledger entries | see "W0a in detail" below. `node scripts/computed-route/lint.mjs --register .claude/plans/2026-10-02-eye-care-fix-register.md --surfaces sites/eye-care-ward-end/build/surfaces.json` passes, and a planted bogus register id turns it red | 10 min |
| **C0.4** | Record the baselines | four numbers written into this plan: the route test count, the **ambiguous-row count**, the F count (163), and `calibration.discovered` counts per block. Every later gate compares against these | 5 min |

**C0.4 matters most.** Two Wave 1 changes (L1.1's context hop and L1.4's canvas hop) widen the candidate set, so
rows that resolve today can become `ambiguous`. A rise in that count is a **fail**, and it cannot be detected
without the baseline.

#### W0a in detail (C0.3): 15 entries, 15 of the 17 D rows, no code

Of the 17 **D** rows, 14 are `sgs/business-info`'s link padding and margin on the **footer**
(`cr-ref-footer-24`, all eight properties) and the **header** (`cr-ref-header-11`, six of them).
`divergences.json::D-17`–`D-24` already decide those exact properties on that exact element with
`expected: { rule: 'touch-target' }`, but they are pinned to `cr-ref-contact-9` alone, so the same decided
mechanism re-reports as 14 fresh candidates on the other two surfaces. Add the entries for those two nodes. It is
a house rule, so they cite no register item (`lint.mjs::HOUSE_RULES` exempts `touch-target` and `accessibility`).
The measured negative margin equals the padding, so the text paints where the draft's does.

**Give each new entry its own `scope`.** `D-17` to `D-24` all carry `scope: "contact"` (verified in `divergences.json`),
and `parity/lib/divergences.mjs` matches on scope, so a copy left at `contact` would match nothing on the footer or
the header. The new entries take `scope: "footer"` and `scope: "header"`, and the product one `scope: "product"`.

One more entry: `cr-ref-product-4`'s option `transform` (draft a 2px lift, live 3px, which is S1's decision that
every button lifts 3px), citing `S1`.

**The count: 15 new entries closing 15 of the 17 D rows.** Eight on `cr-ref-footer-24`, six on `cr-ref-header-11`,
one on `cr-ref-product-4`. The remaining two D rows are `sgs/google-reviews` timing, which belong to the parallel
track. These 15 sit **outside** the F count, so F does not change: what they remove is 15 rows that would
otherwise re-report as fresh candidates every time those surfaces are measured.

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
| **L2.1** | 1920 in every standard run | FR-47-6 item 2, not started |
| **L2.2** | Focus and active states on every interactive element of a compared region (hover is built, `devtools.mjs::forcedHover`) | FR-47-6 item 3 remainder, not built |
| **L2.3** | Link coverage: the same text must sit inside a link on both sides | FR-47-6 item 4, not started |
| **L2.4** | Line counts sampled during state transitions (header shrink and grow, drawer open) | FR-47-6 item 5, not started |
| **L2.5** | Script-driven entrance motion read | §5 R7's `FR-47-6` tag |
| **L2.6** | **Tag-mismatch guard.** 4 combos in Session B compared a draft `<div>` to a live `<img>`, or a `<span>` to an `<h1>` | a B2 finding |
| **L2.7** | **Drop style rows from refs the pairing left unmatched** (`qa/pairs/*.json::left`). Would have removed 24 of one agent's 58 rows before triage saw them, and retires two medium-confidence `woocommerce/product-template` rows | a B2 finding |

L2.6 and L2.7 are the cheapest false-finding removers in the session: run them first inside the lane.

#### L3 Flows, one agent

Files: `scripts/parity/flows/` (new), and the state mapping those flows need.

| id | Item | Spec 47 |
|---|---|---|
| **L3.1** | The four flows: two products in the bag; a second unit of the same product; apply then clear a filter; the lens pop-up's skip-to-bag | FR-47-7, not started |
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
      L7.3's text read covers both role content and role text-content, or Bean's answer is recorded
      and the scope matches it
FAIL: the identity breaks and a delta cannot be explained
TYPE: auto-gate, then a main-thread read of every diff
```

### Wave 3, main thread, serial, one host job at a time

| id | Item | Done when |
|---|---|---|
| **C3.1** | **R1: the 32 routable rows, declared in the hand-authored override channel.** See "R1 in detail" below | every row declared in `plugins/sgs-blocks/scripts/attr-classification-overrides.json`, **never in the derived layer and never as an `UPDATE`** |
| **C3.2** | One reseed, from clean HEAD, **after messaging peer sessions** | `/sgs-update` completes |
| **C3.3** | The database consistency check | `python plugins/sgs-blocks/scripts/db-consistency/run.py --check` passes, invariants A, B and C green |
| **C3.4** | **Recalibrate every block whose code OR routing columns changed**, on the local WSL mirrors. Includes CR17's `sgs/business-info` and CR12's `theme-toggle` | each block's cache file regenerates; for every row C3.1 routed, `settings[<attr>].slots` contains the cited selector; no new `dead` or `noMarker` outcome |
| **C3.5** | **A paid test order on eye-care-test**, so the confirmation surface paints its tick and continue link (PA-5) | the confirmation walk is complete |
| **C3.6** | **One measure-only sweep**, all 17 surfaces, same command and flags as the 2026-10-05 baseline, from clean HEAD | `sweep.json` written, with the surfaces measured stated beside the result |
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

## The §6 question for Bean, with a recommendation

**Should the text read cover `role` `text-content` (235 rows) as well as `role` `content` (84)?**

**Plain English.** The route is meant to copy the draft's words into the site's settings. Settings that hold words
are labelled two ways in the framework database. The spec says to read one label; most of Eye Care's words sit
under the other.

| Option | What it entails | Benefits | Drawbacks |
|---|---|---|---|
| **Read both** (recommended) | L7.3 renders a marker string for 319 settings instead of 84 | Reaches the words that actually matter here (`sgs/product-card::noReviewsText`, `::brandName`, `sgs/buybox::stockInStockLabel`, `sgs/whatsapp-cta::cardTitle`). Register items S7, N27, N31, 91 and N28 become reachable; left as specified they stay unreachable | Widens FR-47-2: calibration renders 235 more marker strings, so calibration runs longer |
| Read `content` only | as specified | smallest change | the read is close to pointless on this site: it would miss five register items and most of the words |

**Recommendation: read both.** The cost is calibration time, which is already chunked and cached; the benefit is
that the feature does the job it was specified for. **Needed before L7.3 starts, in Wave 2** — so the session opens
without waiting.

### The second answer owed: which surfaces are canvases?

**FR-47-8 needs a roster, and it is needed earlier: before L1.4, which is in Wave 1.** Proposed, and these four
post types are confirmed in the code: `sgs_mega_menu`, `sgs_modal`, `sgs_drawer` and `sgs_choice_flow`. Each is
its own post composed from arbitrary blocks.

**`sgs_header` and `sgs_footer` are deliberately excluded**, although they are also their own posts. On this client
they are route output: the route writes `header.tree.json` and `footer.tree.json` itself, so a missing setting there
is a real gap rather than a composition the author would complete. If Bean disagrees, adding them is one manifest
field each. A page is **not** a
canvas even though it is also composed from blocks, because its blocks are the route's own output rather than an
author's composition. Spec 47 §6 carries the question.

**If the answer has not arrived when Wave 1 dispatches,** L1.4 and L1.5 build against the proposed roster and the
flag stays data in `surfaces.json`, so changing it later is an edit to one manifest field and no code. That is the
reason the roster is data and not a list in the source.

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
