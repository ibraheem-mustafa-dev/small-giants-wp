# Spec 47 retirement ledger (into Spec 48)

Date 2026-10-11. Source: `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` v0.18.0 (781 lines, read in full) at HEAD `6b4b8c19e`.
Inputs: `.claude/plans/2026-10-10-claude-design-handover-standard.md` (Task B4), `.claude/plans/2026-10-04-spec47-full-coverage.md`
(route-accuracy R1 to R6), `scripts/computed-route/README.md`, `.claude/reports/2026-10-10-handover-council/R4-needs-and-specs.md`
and `R6-dc-format.md`, `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md`.

**Verdicts.** CARRY = into Spec 48 as is or reworded. REWORK = carries, but changes because the draft's code is now the
primary source or because Spec 48A now owns the input. RETIRE = not carried, with the reason and where its content goes.

**Spec 48 section names used below are proposals** (the outline Spec 48 is written against), not yet a document:
§Rules · §Inputs (the 48A handoff) · §Intake · §Reading the draft (code first, measuring what code cannot state) ·
§Tokens and extractor (absorbed FR-33-n) · §Skeleton writer · §Calibration · §Resolver · §Fill · §Solve (verify and
repair) · §Walker and pairing · §Deliberate differences · §Canvas surfaces · §Site Info and handover · §States and
behaviour · §Triage and gap reports · §Route accuracy · §Safety and tooling · §Acceptance · §Deferred.

**Citer counts** come from `git grep -l -E "<ID>([^0-9]|$)" -- ':!.claude/archive' ':!.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md'`
(so `.claude/plans/archive/` and dated reports are included; `.claude/archive/` is not). "code" = files not ending `.md`.
Spec 47 as a whole (`Spec 47|spec47|47-COMPUTED-ROUTE`): 160 files, 89 of them not `.md`.

---

## 1. Section ledger

| # | Spec 47 section | Verdict | Reason | IDs defined |
|---|---|---|---|---|
| 1 | Front matter (v0.18.0, `references`) | RETIRE | Spec 48 gets fresh front matter. Its references (Spec 32, framework-principles, GAP-CHECKLIST) carry; the Eye Care fix register is a client document and is cited only from §Deliberate differences as an example. | none |
| 2 | §0 Problem and Effect | CARRY | Still true: agents copied selected numbers; the commonest miss is a value the draft never states (UA defaults, inheritance); corrections ate Bean's review time. Becomes Spec 48 §0's "why". | none |
| 3 | §0 Solution | REWORK | "Measure the rendered draft" becomes "read the draft's code (template + logic, `handoff-schema/METHOD.md`) and measure only what code cannot state". Solve and Fill keep one engine; Fill becomes the primary path for a fresh clone. | none |
| 4 | §0 Routing ("every draft, script-rendered or static, any classes") | REWORK | Spec 48A makes the handoff folder the only accepted input; whether non-Claude-Design drafts stay in scope is decision D5. | none |
| 5 | §1 Binding rules (table) | REWORK | Rules carry one by one (table 2); R-47-4 is reversed, R-47-7 and R-47-11 change. | R-47-1 to R-47-12 |
| 6 | §2 Input | REWORK | Input becomes the checked handoff folder (`sites/<client>/handoff/`, FR-48A-1, passing `handoff-check.mjs`) plus the snapshot and DB. | none |
| 7 | §2 How a draft arrives (`design_handoff_<project>/`, zip fallback guesses palette) | RETIRE | Superseded by Spec 48A FR-48A-1, -2, -3 and -8 (placement, required files, reachability, README template). The zip fallback is gone: no handoff, no clone. | none |
| 8 | §2 Surface manifest (`surfaces.json`) | REWORK | Today hand-written. Spec 48 generates it from the intake page map Bean confirms (FR-48A-9); `canvas` stays derived from post type; `states` come from the draft logic's state list (R6 council read C) instead of hand-written walker configs. | none |
| 9 | §2 Reference blocks (linked placeholders, frames, template parts, `lint.mjs --surfaces`) | CARRY | Framework fact about what prints another post; unaffected by code primacy. | none |
| 10 | §2 Output (tree, report, walker config) | CARRY | Unchanged. | none |
| 11 | §2 Not in scope (content beyond the draft, behaviour, asset upload, block swaps) | REWORK | B4 seed "builds a client site from a fresh WordPress install" pulls in target creation, asset upload, menus and possibly products (R4 rows 12, 16, 18). Decision D3. | none |
| 12 | §3.1 Resolver | CARRY | The one property-to-setting engine; independent of where a value came from. Adds: accept a declared form read from code (`clamp()`, `repeat(n, …)`) where calibration shows the setting takes it. | FR-47-1; gap reasons `no-setting`, `ambiguous`, `shape` |
| 13 | §3.2 Block calibration | CARRY | Framework-side truth (what a setting paints, default paint); the draft's code cannot supply it. Marker table, presence/content/link reads, cache, deploy hash, local mirrors, chunking all carry. | FR-47-2 |
| 14 | §3.3 Solve | REWORK | Mechanics carry (Step 0 refs, rounds, write rules, classification, Handover, report, failure handling). Role changes: after a code-first Fill it is the verify-and-repair loop, and the live-repair tool for near-finished sites (FR-48A-11). Decision D4. | FR-47-3; classes Hardcode, Missing setting, Intended, Unresolved, Handover; handover owners (5); `trial-reject`, `breaks-layout`, `used-value`, `unmeasured-side`, `unmapped-element`, `linked` |
| 15 | §3.4 Skeleton writer (inventory, propose, finalise, review; `tpl` finder; `check-refs`; `origin.json`) | REWORK | The inventory is re-derived at intake from the code by METHOD.md (FR-48A-7) and joined to rendered boxes; block proposals can use the logic's typed lists (R6 council read C). `tpl` finders and `origin.json` carry unchanged. | none (FR-47-4 part) |
| 16 | §3.4 Fill steps 1 to 5 (read, resolve root-down, spacing ownership, refs + config, report + Not read) | REWORK | Step 1 changes: values come from the template's declared styles and `renderVals()` per width first, rendered computed style for UA defaults, inheritance and what code cannot state (decision D2). Steps 2 to 5 carry. | FR-47-4 |
| 17 | §3.4 Presence and content | CARRY | Words now come from code for every route, step and slide, not only the walked screen (R4 row 11); the presence mechanism is unchanged. | none |
| 18 | §3.4 Site Info rows (row lift) | CARRY | Moves to §Site Info and handover beside FR-47-9. | none |
| 19 | §3.4 Values that need care (fluid fit, 16px breakpoint sweep, entrances) | REWORK | Fluid: `clamp()`/`vw` read as declared, curve-fit becomes a check. Breakpoints: the `renderVals` ternary thresholds, sweep becomes a check. Entrances: recorded `animate()` calls and CSS animation/transition events (`trace-check.mjs`, `animations.json`), pose sampling kept as confirmation. | none |
| 20 | §3.5 Divergence ledger | CARRY | Schema, matching, stale rule, register citation, independent check carry. Note: B5 mirrors Eye Care's decisions into its draft, so the ledger then holds only computed-style differences the draft cannot show. | FR-47-5; entry IDs `D-<n>`; `lib/ledger.mjs::RULES` names |
| 21 | §3.6 Walker upgrades (items 1 to 19) | CARRY | The walker stays the closing comparison (R-31-11). Items 11, 17 and 18 rework (table 2b). Decision D9 on whether Spec 48 or GAP-CHECKLIST owns the requirement text. | FR-47-6; items 1 to 19 |
| 22 | §3.7 Functional flows | REWORK | The generic requirement (flows the walker cannot see are scripted and reported apart) carries; the flow list comes from the draft logic (form steps, basket, filters). The four Eye Care flows and N11/N25 go to the Eye Care plan. | FR-47-7 |
| 23 | §3.8 Canvas awareness | CARRY | Unchanged; independent of draft source. | FR-47-8; reason `canvas-settable`; `confirm-canvas.json` |
| 24 | §3.9 Social and contact rows | CARRY | Cloning half carries; the icon render half is already Spec 02 (`02-SGS-BLOCKS.md` Site Info link). Site Info values can now be read from the draft's script data at intake as well as from handover rows. | FR-47-9 |
| 25 | §4 Files | REWORK | Keep R-47-1's rule (README indexes every file and export, lint enforces). Drop the duplicated file table: it is already stale (says "thirteen `lib/fill-*.mjs`", README has 16; omits `skeleton`, `pairs`, `origin`, `trial`, `answer-sheet`, `check-refs`, `confirm-canvas`, `handoff-check`, `trace-check`). Triage classes move to §Triage. | triage classes W, F, T, U, L |
| 26 | §5 stages 1 to 4 (foundations, footer proof, Solve on every Eye Care surface, Fill proved on a built surface) | RETIRE | Built; history is in `plans/2026-10-04-spec47-full-coverage.md` "Spec 47 build log" and git. The footer proof's success measures (≥90% handled, no regression, ≤10% wrong writes, kill lines) carry as Solve's report metrics in §Solve, diagnostic only (R-31-4). | stages 1 to 4 |
| 27 | §5 stage 5 (a second draft) | RETIRE | Superseded by the plan's "After B" replan: the three 48A exports are cloned against Spec 48. | stage 5 |
| 28 | §5 Bean ruling: a correctly named gap is a success | CARRY | Into §Acceptance. | none |
| 29 | §5 Bean ruling: Contact subtext keeps 22px (CR15/N45b) | RETIRE | Eye Care client decision; lives in the fix register and goes into the draft in B5. | none |
| 30 | §5 Bean ruling: mobile tier box keeps tablet's other sides; `seedSides` only for border width | CARRY | Into §Resolver. | none |
| 31 | §5 Bean ruling: calibration reads both `content` and `text-content` | CARRY | Already stated in §3.2; one statement in §Calibration. | none |
| 32 | §5 Bean ruling: every CPT and theme page template is a canvas | CARRY | Already in §3.8; one statement in §Canvas surfaces. | none |
| 33 | §5 Bean ruling: dark-mode toggle CR12 parked | RETIRE | Eye Care client item; stays on the register row. | none |
| 34 | §5 Bean ruling: Session D works the whole register | RETIRE | Session history, not a requirement. | none |
| 35 | §5 Residual (open) | see §3 | Item by item below. | none |
| 36 | §5 build-log pointer | RETIRE | History; git and the plan keep it. | none |
| 37 | §6 Open questions ("None open") | RETIRE | Each answer already lives in its section (dedicated `sgs_header`/`sgs_footer`/`sgs_drawer` calibration posts, both text roles, canvas definition, private calibration page) and carries with §Calibration and §Canvas surfaces. | none |
| 38 | §7 Creating a client's targets | REWORK | Comes into scope under the "fresh install" seed: targets are created from the confirmed page map (FR-48A-9), which also relaxes R-47-11. Specs 42 FR-42-10 and 43 FR-43-14 cite this gap and must repoint. Decision D3. | none |
| 39 | §7 Social-row address recognition (`wa.me`, `youtu.be`, `g.page`) | CARRY | Still deferred; still needs Bean's approval after `/brainstorming`. Into §Deferred. | none |
| 40 | §7 First real Site Info fill | CARRY | Still deferred to the first real clone's dry run. | none |
| 41 | §7 Bluesky and Threads | CARRY | Deferred, waits for Site Info keys; it is framework work (brand registry + Site Info), so Spec 48 only points at it. | none |
| 42 | §7 `sgs-clone` not adapted | REWORK | Spec 48 names the skill adaptation as a plan step (the skill must learn the 48A intake, `siteInfoRow`, handover and Fill), not a deferral. | none |

---

## 2. ID ledger

### 2a. Requirements and rules

| ID | Summary | Verdict | Spec 48 home or reason | Citers (total / code) · examples |
|---|---|---|---|---|
| FR-47-1 | Resolver: slug + slot + property + state + per-width value to one attribute write in its storage shape, or a gap | CARRY | §Resolver | 6 / 2 · `scripts/computed-route/lib/resolve.mjs`, `tests/resolve.test.mjs`, `.claude/catalogues/tooling.md` |
| FR-47-2 | Block calibration: slot map and default paint per block, markers, presence/text/link, deploy-hash guard | CARRY | §Calibration | 32 / 26 · `scripts/computed-route/calibrate.mjs`, `lib/calibrate-chunk.mjs`, `lib/calibrate-container.mjs` |
| FR-47-3 | Solve: rounds of build, walk, write; classification; Handover; wrong-write ratio | REWORK | §Solve (verify and repair) | 9 / 5 · `lib/issue-classes.mjs`, `lib/solve-report.mjs`, `lib/solve-rows.mjs` |
| FR-47-4 | Fill: skeleton (from the skeleton writer) filled root-down from the draft; UNMAPPED and Not read before any build | REWORK | §Skeleton writer + §Fill (values code-first) | 28 / 24 · `scripts/computed-route/fill.mjs`, `lib/draft.mjs`, `.claude/reports/2026-10-09-skeleton-writer-test/evidence/propose.mjs` |
| FR-47-5 | Divergence ledger: schema, value and rule entries, stale, accept, register citation | CARRY | §Deliberate differences | 17 / 14 · `scripts/computed-route/ledger.mjs`, `lib/ledger.mjs`, `scripts/parity/lib/divergences.mjs` |
| FR-47-6 | Walker upgrades items 1 to 19 | CARRY | §Walker and pairing (items: 2b) | 20 / 13 · `scripts/computed-route/tests/walker-refs.test.mjs`, `.claude/reports/2026-10-05-session-b/measure-gap-tags.json`, `.claude/plans/2026-10-04-spec47-full-coverage.md` |
| FR-47-7 | Functional flows scripted per flow, reported apart; unmapped states listed | REWORK | §States and behaviour (flow list from draft logic; Eye Care flows to its plan) | 19 / 10 · `lib/issue-classes.mjs`, `lib/triage.mjs`, `.claude/reports/2026-10-05-session-b/measure-gap-tags.json` |
| FR-47-8 | Canvas awareness: ancestor and context hop, triage refuses F, `confirm-canvas` | CARRY | §Canvas surfaces | 12 / 7 · `lib/resolve.mjs`, `lib/triage.mjs`, `solve.mjs` |
| FR-47-9 | Social and contact rows bound to Site Info; lint rejects typed brand addresses; provisioning script | CARRY | §Site Info and handover | 4 / 0 · `.claude/specs/02-SGS-BLOCKS.md`, `.claude/reports/2026-10-10-handover-council/R4-needs-and-specs.md`, `.claude/plans/archive/2026-10-08-icon-unification-and-spacing-control.md` |
| R-47-1 | Isolation: all route code in `scripts/computed-route/`, README indexes every export, no import from `plugins/sgs-blocks/scripts/` | CARRY | §Safety and tooling (folder name: decision D8) | 11 / 4 · `lint.mjs`, `lib/resolve.mjs`, `tests/lint.test.mjs` |
| R-47-2 | Framework DB opened read-only (`node:sqlite`, `mode=ro`) | CARRY | §Rules | 34 / 28 · `calibrate.mjs`, `lib/calibrate-chunk.mjs`, `lib/calibrate-container.mjs` |
| R-47-3 | One engine: Solve and Fill write only through `lib/resolve.mjs` | CARRY | §Rules | 14 / 10 · `lib/fill-entrance.mjs`, `lib/fill-prop.mjs`, `lib/issue-classes.mjs` |
| R-47-4 | Measured, not copied: every written value from computed style; draft code gives identity and structure only | REWORK (meaning reversed) | §Rules, reworded as "code first, measured where code cannot state" with the confirmation rule of decision D2. The 33 code citers mostly cite it for "never parse source text for values" or "identity only" (`lib/fill-read.mjs`, `lib/skeleton-inventory.mjs`, `lib/fill-diagram.mjs`); each must be re-read and cite the new wording (same ID if D1 keeps IDs, else the new rule ID). Text-regex parsing of `.dc.html` stays banned (R6 council §3.2). | 44 / 33 · `scripts/computed-route/fill.mjs`, `check-refs.mjs`, `tests/walker-tpl-finder.test.mjs` |
| R-47-5 | Write only what differs (calibrated default paint; parent's live value for inherited properties; fixture switches) | CARRY | §Rules | 30 / 25 · `ledger.mjs`, `lib/calibrate-props.mjs`, `lib/fill-page.mjs` |
| R-47-6 | Calibration is the slot truth; DB `css_element`/`derived_selector` only seed it | CARRY | §Rules | 23 / 15 · `lib/calibrate.mjs`, `.claude/reports/2026-10-05-session-b/b2/b2c-verdicts.json` |
| R-47-7 | Tokens before literals: exact, nearest within tolerance, then flagged literal; font stack snap | REWORK | §Rules + §Tokens and extractor: the snapshot is built from the declared `tokens/*.css` (B4 seed); snap order carries; one-off colours stay hex (memory `one-off-colours-are-hex-not-presets`). Spec 32 line 965 cites it and must repoint. | 25 / 14 · `lib/normalise.mjs`, `lib/issue-classes.mjs`, `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` |
| R-47-8 | Divergences are data (`divergences.json`, read by Fill, Solve, walker) | CARRY | §Rules + §Deliberate differences (with B1 item 5's per-client deliberate-differences list) | 15 / 10 · `lib/fill-resolve.mjs`, `lib/resolve.mjs`, `lib/triage.mjs` |
| R-47-9 | Bounded loop: three write rounds, try before write, regression guard, settle walk | CARRY | §Solve (already carries the R6 amendment) | 11 / 3 · `lib/guard.mjs`, `solve.mjs`, `tests/solve.test.mjs` |
| R-47-10 | Gates: dry-run before build; only `source='sgs'` settings; no style values in a skeleton; client-name check; `cr-ref-` prefix | CARRY | §Rules | 18 / 13 · `fill.mjs`, `lib/calibrate-content.mjs`, `lib/db.mjs` |
| R-47-11 | Live-site safety: only listed targets; canary home/posts page and motion-QA fixtures refused; no pointer changes; deploy/reseed check; calibration lock | REWORK | §Safety and tooling: "only existing targets" becomes "only targets the confirmed page map names", so the route may create them (D3); the refusals and lock carry. Specs 42 FR-42-10 and 43 FR-43-14 cite it and must repoint. | 10 / 3 · `lib/tree.mjs`, `lib/calibration-lock.mjs`, `tests/tree.test.mjs` |
| R-47-12 | Canvas awareness: no Missing setting on the attributed block alone; `canvas-settable` to a human | CARRY | §Canvas surfaces | 12 / 7 · `lib/resolve.mjs`, `lib/triage.mjs`, `solve.mjs` |

No FR-47 or R-47 ID is retired outright, so no code citer needs a replacement ID unless decision D1 renumbers.

### 2b. Walker items (FR-47-6, §3.6). Cited as "Spec 47 §3.6" by 6 files (including `.claude/specs/README.md` row 20) and by GAP-CHECKLIST section numbers.

| Item | Summary | Status in 47 | Verdict | Reason |
|---|---|---|---|---|
| 1 | Pseudo-element paint per layer | built | CARRY | Unchanged. |
| 2 | 1920 in every standard run | built | CARRY | Unchanged. |
| 3 | Hover, focus, active on every interactive element | built | CARRY | Unchanged. |
| 4 | Link coverage rows | built | CARRY | Unchanged. |
| 5 | Line counts during state transitions | built | CARRY | Unchanged. |
| 6 | Config names a divergence ledger | built | CARRY | Unchanged. |
| 7 | Ref tracing (`ref`, `path`) | built | CARRY | Unchanged. |
| 8 | Flow position, identity transform | built | CARRY | Unchanged. |
| 9 | Solve modes `--lean`, `--draft-cache`, `tagEls` | built | CARRY | Unchanged. |
| 10 | Settled reads | built | CARRY | Unchanged. |
| 11 | Declared values (8 `DECLARED_PROPS`) | built | REWORK | Becomes a main input: declared values for all properties plus the runtime's pseudo sheet (R6 council read A), the intent check that picks a fluid or track setting. |
| 12 | Motion timings as rows | built | CARRY | Unchanged. |
| 13 | Text-run `row-gap` rows | built | CARRY | Unchanged. |
| 14 | Diagram reads | built | CARRY | Unchanged. |
| 15 | Eager load before the resting read | not built | CARRY | Measurement still needs below-fold images at real size. |
| 16 | Property-capture test against `property_suffixes` | not built | CARRY | Still needed. |
| 17 | 12-width sweep and loaded-font record | not built | REWORK | Breakpoints come from the logic's thresholds (read C), so the sweep is a check; the loaded-font record carries unchanged. |
| 18 | Motion-library and WebGL detection | not built | REWORK | Libraries are now known from the handoff's reachable scripts (FR-48A-3) and the recorded calls (`trace-check.mjs`); a WebGL `canvas` context check still needs building. |
| 19 | Identity pairing, mispaired rows, paint check, `decoPath` | built | CARRY | Becomes the primary pairing (route-accuracy R4, R5). |

### 2c. Other names Spec 47 defines

| Name | Defined in | Verdict | Spec 48 home |
|---|---|---|---|
| Gap reasons `no-setting`, `ambiguous`, `shape` | §3.1 | CARRY | §Resolver |
| Solve classes Hardcode, Missing setting, Intended, Unresolved, Handover (+ issue and cause views) | §3.3 | CARRY | §Solve |
| Handover owners `site-info`, `product-data`, `content-page`, `behaviour`, `woocommerce-text` | §3.3 | CARRY | §Site Info and handover |
| Ledger entry IDs `D-<n>` and rule names | §3.5 | CARRY | §Deliberate differences |
| Triage classes W, F, T, U, L | §4 | CARRY | §Triage and gap reports |
| `cr-ref-<surface>-<n>` ref classes | §3.3, R-47-10 | CARRY | §Solve / §Rules |
| Build stages 1 to 5 | §5 | RETIRE | Built (1 to 4) or replanned (5); 6 live citers cite "§5 stage 3" or "§5" (`tests/solve.test.mjs`, `tests/calibrate-overridden.test.mjs`, `sites/eye-care-ward-end/build/qa/solve-score.mjs`, `.claude/plans/2026-10-02-eye-care-plan.md`): repoint to §Solve (state mapping), §Calibration (gap typing) and §Acceptance. |

---

## 3. §5 Residual (open route gaps)

| # | Item | Verdict | Reason |
|---|---|---|---|
| 1 | Skeleton writer has no marquee rule (scrolling strip becomes `sgs/text`, not `sgs/trust-bar` autoScroll) | CARRY | Skeleton-writer rule, so Spec 48 §Skeleton writer (the plan lists it under framework vocabulary edits; decision D10). Code-first makes it detectable from the recorded loop animation. |
| 2 | Pill CTA link proposed as a container holding only its arrow | CARRY | Skeleton-writer defect; the template shows the `<a>` and its children directly. |
| 3 | Fill carries no grid column count onto `sgs/container` | REWORK | The count is in the code (`repeat(n, …)`); Fill reads it as declared and writes it. Track sizes stay measured. |
| 4 | No flex row for a two-child header row | CARRY | Same mechanism as 3: layout mode from the declared `display`. |
| 5 | Nothing fills Site Info from a draft | REWORK | Partly built since (FR-47-9 `provision-site-info-from-draft.py` from `handover.json`); intake can also read business details from the draft's script data. Remaining: first real run (§7). |
| 6 | Draft-extracted snapshot is advisory until confirmed (FR-33-5) | CARRY | Moves with the extractor into §Tokens and extractor (FR-33-n kept); palette now from declared tokens. |
| 7 | Fixture attributes whose `css_property` looks mis-tagged in the DB (`responsive-logo.logoId`, `nav-bar-menu.featuredItemIds`, `nav-drawer.closeStyle`, `diagram-dimension.endX/endY`) | RETIRE | Framework DB data defect, not route behaviour; route the fix to the seeder (`sgs-update-v2.py` classifier) and its owning doc. |
| 8 | Each Eye Care surface to its done line | RETIRE | Client work; superseded by B5 (Eye Care draft mirror, FR-48A-11) and the Eye Care plan. |
| 9 | Gap typing: `overriddenBy` re-typing and its rendered-box guard | CARRY | Calibration is unchanged; §Calibration / §Triage. |
| 10 | `resolveContent` belongs in `lib/resolve.mjs` (R-47-3) | CARRY | One-engine rule carries. |
| 11 | Triage's content verdict ignores Solve's outcome | CARRY | §Triage. |
| 12 | Presence rows for an element missing live, and every `link-missing` row, unwritable until `stampRefs` stamps content rows and `auto-collect.mjs` stores the href | CARRY | Walker work; §Walker and pairing. |
| 13 | `resolveViaAncestor` writes nothing and is to be deleted | CARRY (with a check) | Unverified as stated: it is still imported by `solve.mjs` and `lib/triage.mjs` (the triage hop, `ctx.ancestorHop`). The full-coverage plan's "Owed to Bean" proposes relaxing it with `sc-for` loop evidence instead, which code-first makes easier. Spec 48 must pick one; see D11. |
| 14 | `draft-live-walk.mjs --lint` over every `walkerFull` not yet a route gate | CARRY | §Safety and tooling. |
| 15 | Whether content reads returned nothing on real data | CARRY | Verification owed; §Calibration. |
| 16 | The `scroll` row kind that vanished between sweeps | CARRY | Unexplained; §Walker and pairing. |
| 17 | `writeRound` sets `canvasSettable` with no emission check (durable fix: emission selector in the DB) | CARRY | §Canvas surfaces; the DB half goes to the seeder owner. |
| 18 | Emission read by string search of PHP literals | CARRY | Same as 17. |
| 19 | `chrome-compare.mjs::hoverEffects` ignores `loops` (cause unproven) | CARRY | Walker. |
| 20 | Live-side walker findings (`reveal-unfired`) never persisted | CARRY | §Triage and gap reports. |
| 21 | Ledger cannot scope a decision to one element path | CARRY | Schema change in §Deliberate differences; smaller impact after B5. |
| 22 | Seeder leaves rows unrouted (`sgsHover*`, `sgsChildWidth` NULL on purpose) | RETIRE | Framework DB routing pass, owned by the seeder; Spec 48 only reads the DB (R-47-2). |
| 23 | Calibration exhausts the 4 GB heap; `SGS_CAL_CHUNK` workaround, cause unproven | CARRY | §Calibration. |
| 24 | Fill UNMAPPED: `layout` (`display` ambiguous across hide-on-device settings) | CARRY | Resolver ambiguity remains; the declared `display` narrows it. |
| 25 | Fill UNMAPPED: `variant` until presence keys exist on real blocks | CARRY | Calibration. |
| 26 | Fill UNMAPPED: border colour (no `borderColour` setting tied) | RETIRE | Framework calibration/DB tie, not route; route to the framework gap list. |
| 27 | No calibration cache carries a `forms` list with `clamp`, so fluid sizes are written per tier | REWORK | Code-first gives the declared `clamp()`; calibration must still prove which settings accept it. |
| 28 | CR17's business-info `textBefore` element | RETIRE | Eye Care register item. |
| 29 | Calibration reads no presence for `layout`/`select-from-enum` enums with no CSS property (`hoursLayout`); fix needs Bean's sign-off | CARRY | §Calibration; the sign-off stays open. |
| 30 | Walker-state conflict rows (`state-map-reasons.json`); guard belongs in `lib/solve-rows.mjs` | REWORK | The state list comes from the draft logic, so the state map is generated; the refusal guard carries. |
| 31 | Walker items 15 to 18 not built | CARRY / REWORK | Per item, table 2b. |
| 32 | Step 5 (a second draft) not built | SUPERSEDED BY 48A | The three 48A exports, cloned after B ("After B" in the plan). |

Not in §5 Residual but open on the same route, carry into Spec 48: the trial misses margin writes the rebuild shows moving boxes (shop WW-SH-01, `.claude/LEDGER.md`); footer and header re-pairing exposed two identity defects (link-list identity is its first link; header root pair lost to a word-based width refusal).

---

## 4. Route-accuracy mechanisms R1 to R6 (`plans/2026-10-04-spec47-full-coverage.md`, built 2026-10-10 at `8b0a859a5`)

| # | Mechanism | Verdict | Reason and open work |
|---|---|---|---|
| R1 | Answer sheet: 100 frozen hand-labelled Eye Care rows, baseline ratchet (`answer-sheet.mjs`, `qa/answer-sheet.json`, `-baseline.json`) | CARRY | §Route accuracy: every route change scored before and after. Rows were labelled against the old Eye Care draft; B5 changes the draft, so the sheet needs re-freezing (D7). |
| R2 | Element-ID skeleton writer (`skeleton.mjs`, `tpl` finder, `check-refs.mjs`, decisions files) | REWORK | Inventory from code per METHOD.md (FR-48A-7) instead of the rendered page alone. Open: finaliser never run as a subagent; `siteName` from decisions not Site Info; link-list `draftRef` is its first link; header nav proposed as buttons, trust bar, rating badge and cart get no node. |
| R3 | Fill: business-info's five settings and the Not read list (`lib/fill-unread.mjs`), fixture preconditions, icon fixes | CARRY | §Fill. Open: recalibrate `sgs/social-icons` with the new size-box markers; `hoursLayout` is residual 29; the 2026-10-09 footer skeleton's raw selectors are stale. |
| R4 | Exact ID pairing (`pairs.mjs::identityPass`, `origin.mjs`, `lib/identity.mjs`, `mispaired`) | CARRY | Becomes the primary pairing; word pairing stays the cross-check. Open: inside-block structural matching of named parts not built. |
| R5 | "Does it paint?" (`scripts/parity/lib/neutralise.mjs`: `inert`, `breaks-box`, `moves`) | CARRY | §Walker and pairing. Open: the `{ value, src }` row field is only needed where R6 tries. |
| R6 | Try before write (`lib/trial.mjs`, `trial-page.mjs`, `trial-run.mjs`, `trial.mjs`) | CARRY | Already in R-47-9. Open: margin writes missed (WW-SH-01). |

---

## 5. Commands and libraries per Spec 48 section

| Proposed Spec 48 section | Commands | Libraries and data |
|---|---|---|
| §Inputs / §Intake | `handoff-check.mjs`, `trace-check.mjs` (Spec 48A) | `lib/handoff.mjs`, `lib/runtime-probe.mjs`, `lib/draft.mjs`, `data/known-runtimes.json`, `data/runtime-probe.*`, `data/runtimes/` |
| §Skeleton writer | `skeleton.mjs`, `check-refs.mjs`; finaliser brief `prompts/skeleton-finaliser.md` | `lib/skeleton-{inventory,model,facts,classify,propose,review,finalise}.mjs`, `lib/fill-skeleton.mjs`, `data/skeleton-decisions.json` |
| §Calibration | `calibrate.mjs` | `lib/calibrate*.mjs` (9), `lib/cache.mjs`, `lib/calibration-lock.mjs`, `lib/deploy-hash.mjs`, `calibration-targets.json`, `calibration-fixtures.json`, `cache/` |
| §Resolver / §Tokens | none | `lib/resolve.mjs`, `lib/normalise.mjs`, `lib/db.mjs` |
| §Fill | `fill.mjs` | `lib/fill-*.mjs` (16), `lib/entrance.mjs`, `lib/draft.mjs` |
| §Solve | `solve.mjs`, `trial.mjs` (replay) | `lib/solve-rows.mjs`, `lib/solve-report.mjs`, `lib/solve-groups.mjs`, `lib/winning-rule.mjs`, `lib/guard.mjs`, `lib/trial*.mjs`, `lib/tree.mjs`, `lib/references.mjs` |
| §Walker and pairing | `pairs.mjs`, `origin.mjs` (plus `scripts/parity/draft-live-walk.mjs`) | `lib/pairs.mjs`, `lib/pairs-page.mjs`, `lib/pair-scope.mjs`, `lib/identity.mjs`, `scripts/parity/lib/*` |
| §Deliberate differences | `ledger.mjs` | `lib/ledger.mjs` |
| §Canvas surfaces | `confirm-canvas.mjs` | `lib/triage.mjs` (canvas parts), `lib/resolve.mjs` (hop) |
| §Site Info and handover | none (plus `plugins/sgs-blocks/scripts/provision-site-info-from-draft.py`) | `lib/brand-registry.mjs`, `lib/fill-handover.mjs`, `lib/fill-row-lift.mjs`, `lib/fill-presence.mjs`, `lib/issue-classes.mjs::HANDOVER_OWNERS` |
| §States and behaviour | none in the route (`scripts/parity/flows/`) | none |
| §Triage and gap reports | `triage.mjs`, `sweep.mjs` | `lib/triage.mjs`, `lib/triage-source.mjs`, `lib/sweep.mjs`, `lib/issue-classes.mjs` |
| §Route accuracy | `answer-sheet.mjs` | `lib/answer-sheet.mjs` |
| §Safety and tooling | `lint.mjs` | `lib/tree.mjs` (target checks), `lib/calibration-lock.mjs` |

**Not covered by any Spec 47 requirement today:**
- `register-sweep.mjs` + `lib/register-sweep.mjs`: Eye Care's Session D register tool (listed only in §4). No proposed Spec 48 home; decision D6.
- `tests/check-lane-collisions.mjs`: a parallel-lane process gate living in `tests/`; not route behaviour. Recommend it moves out of the route or is listed as tooling only.
- `answer-sheet.mjs`, `origin.mjs`, `trial.mjs`, `pairs.mjs`, `sweep.mjs`, `triage.mjs`, `skeleton.mjs`, `check-refs.mjs`: named in Spec 47 prose or the plan but in no "Done when"; Spec 48 gives each a requirement in the sections above.
- `handoff-check.mjs`, `trace-check.mjs`: governed by Spec 48A, not Spec 47.

**Needed by Spec 48 and not built:** an intake command (re-derive the inventory by METHOD.md, FR-48A-7; propose the page map, FR-48A-9; sandboxed run, FR-48A-10; build the structured file from tokens and code), the code readers (declared values for all properties, recorded motion, logic as data), and target creation from the page map.

---

## 6. Open decisions for Bean

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | ID policy for the retired spec's IDs | (a) keep FR-47-n and R-47-n inside Spec 48, as FR-33-n and FR-41-n were kept; (b) renumber to FR-48-n / R-48-n and sweep every citer | (a): 89 non-doc files cite Spec 47 IDs, precedent exists in `specs/README.md`, and the landing-check script stays a lookup. |
| D2 | New wording for R-47-4: may a value read from code be written without a rendered check? | (a) code value written as is; (b) code supplies the intent (declared form, track count, easing, keyframes, states, content) and the written value must agree with the rendered computed value at 375/768/1440; (c) keep R-47-4 and add the council's three in-browser reads only | (b): code cannot state UA defaults or inheritance, and source and render disagree (Eye Care 18px vs 26px, R6 council §3.3); regex parsing of `.dc.html` stays banned. |
| D3 | Scope of "builds a client site from a fresh install" | (a) Spec 48 also creates targets from the confirmed page map and uploads media, with menus and WooCommerce product data as named later stages; (b) everything beyond surfaces stays out of scope as in Spec 47 §2 | (a): the seed requirement asks for it, and §7's target-creation gap already blocks Specs 42 and 43. |
| D4 | Solve's role once Fill reads code | (a) keep the full write loop as verify-and-repair; (b) reduce Solve to measure-only verification | (a): it is the only tool that repairs a near-finished live site (Eye Care) and it carries the trial and guard. |
| D5 | Drafts that are not a Claude Design handoff (static HTML, other tools) | (a) out of scope, Spec 48 requires a 48A handoff; (b) keep a measured-only path with word pairing | (a): `CLAUDE.md` Sites already says every client draft comes from Claude Design's handoff; word pairing stays as the identity cross-check. |
| D6 | Eye Care-specific material (`register-sweep.mjs`, flows N11/N25, CR12, CR15, CR17) | (a) out of Spec 48, kept in the Eye Care plan and register, `register-sweep.mjs` left as an indexed tool with no FR; (b) generalise register checking into Spec 48 | (a), keeping the generic part that already exists: `lint.mjs` checks every ledger entry cites a register item. |
| D7 | The answer sheet after B5 changes the Eye Care draft | (a) re-freeze the Eye Care sheet on the B5 draft and add a second sheet from the first fresh clone; (b) keep the current 100 rows | (a): rows labelled against the old draft will report false regressions. |
| D8 | Rename `scripts/computed-route/` | (a) keep the name; (b) rename (for example `scripts/cloning/`) | (a): low value, touches every citer path; low priority. |
| D9 | Who owns the walker requirements | (a) Spec 48 §Walker holds them, GAP-CHECKLIST stays the proof log; (b) GAP-CHECKLIST holds them | (a), and repoint `specs/README.md` row 20. |
| D10 | Where the marquee rule lives | (a) Spec 48 §Skeleton writer; (b) the framework vocabulary edits list in plan B4 | (a): it is a skeleton-writer rule; `sgs/trust-bar` autoScroll already exists. |
| D11 | `resolveViaAncestor` | (a) delete as §5 Residual says, replacing the triage hop; (b) keep it and relax it with `sc-for` loop evidence (the plan's "Owed to Bean") | (b): code-first makes loop membership exact, and triage still uses the hop. |

---

## 7. Citers that must repoint when Spec 47 retires

- `.claude/specs/README.md`: roster row 47; "Not a live spec" rows 16/22/29, 20, 31, 44/45 all say "47".
- `.claude/specs/42-SGS-FORM-CPT-AND-PRICING.md` FR-42-10 and `43-SGS-CHOICE-FLOW.md` FR-43-14 (R-47-11, "Spec 47 section 7").
- `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` (FR-32-8, FR-32-10, Part D lines citing R-47-7 and Spec 47), `27`, `35A`, `36`, `37`, `38` (prose "Spec 47's computed route"), `48A` front matter.
- `.claude/rules/cloning-pipeline.md` ("Cloning runs on the computed route (Spec 47…)").
- `scripts/computed-route/README.md` title and header, and the 89 non-doc files' header comments (by ID if D1 keeps IDs, only R-47-4's 33 code citers need a wording check).
- `plugins/sgs-blocks/includes/class-sgs-header-footer-cli-commands.php`, `plugins/sgs-blocks/scripts/attr-classification-overrides.json` (two `_why` strings), `scripts/parity/lib/{devtools,divergences,neutralise,auto-collect}.mjs`, `scripts/parity/draft-live-walk.mjs`.

## 8. Unverified

- Citer counts include `.claude/plans/archive/` and dated reports; they exclude only `.claude/archive/`.
- "Code" counts treat every non-`.md` file as code, so a few `.json` reports are counted.
- Section-number citations ("§3.4" etc.) were counted only where written as "Spec 47 §N"; other forms may exist.
- Residual 13's "writes nothing" claim was not traced through `solve.mjs`; only the imports were checked.
