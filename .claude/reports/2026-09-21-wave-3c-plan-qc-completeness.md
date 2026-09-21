---
doc_type: report
project: small-giants-wp
title: Wave 3C implementation plan and start prompt, completeness and misconstrual review
date: 2026-09-21
reviewed: plans/2026-09-21-wave-3c-implementation-plan.md, prompts/2026-09-21-wave-3c-start.md
against: plans/2026-07-29-merged-spec36-37-track-strategic-plan.md (Checkpoint protocol, Wave 3B, Wave 3C, gates, risk register), reports/reference-requirements/FAMILIES-MASTER.md + FAMILIES-REVIEW.md + families-master.json, CLAUDE.md (root, plugins/sgs-blocks, .claude), ~/.claude/CLAUDE.md and rules, decisions D1120 to D1135, Spec 36 FR-36-6, Spec 37 §1.2, .githooks/sgs-gates.sh, scripts/nav-qa/README.md
read_only: true (nothing in the tree was changed except this file)
---

# Wave 3C plan and prompt: completeness and misconstrual review

**Verdict: ship after fixes.** The plan is the right shape (decisions, Step 0, a serial chain with a lock table, a per-unit loop, lessons) and the prompt points at the right documents. What is missing is the material a long build actually fails on: a definition of done per unit, what happens when a gate says no, who owns deploy and commit when agents run in parallel, how a new attribute reaches the editor, the framework DB and the clone converter, and what state a session leaves behind. Two sentences in the plan (and one row in the strategic plan) would let a fresh session build something Bean has not decided.

Counts: **6 critical, 10 high, 9 medium, 4 low** (29 findings).

Severity key: critical = a fresh session would act without Bean where his rules require asking, or would ship a unit that cannot be judged done; high = a predictable stall, collision or rework in the first two sessions; medium = missing information a session would have to rediscover; low = wording.

---

## CRITICAL

### 1. The two unanswered questions are written as "built unless he changes it"

**Plan text (§1):** "Two earlier questions still awaiting Bean (the plan builds the recommendation unless he changes it)". D1135 repeats it: "recommendations recorded; built unless he changes them". The strategic plan W3C-1 row goes further and states it as done: "force-solid and the drawer clamp folded into U-1 and U-3".

**Why it matters.** This is the exact misconstrual the plan's own lesson forbids ("Bean's decisions are not assumed. 'Should I start it?' waits for an answer"). D1125 recorded both items as needing a decision: force-solid "needs a design decision"; the drawer clamp "needs a spec amendment first" and "needs Bean's eye" (D1122 b). ~/.claude/CLAUDE.md: "No assumptions, if uncertain, ask." A silent default here also adds a Spec 36 amendment (the trigger-anchor clamp) that nobody approved.

**Change to.** In §1 replace the heading and parenthesis with:

> ### Two questions Bean has not answered. They gate U-1 and U-3; nothing is built on them until he answers.
> Step 0f: put both to Bean as a menu with one recommendation (force-solid: fix in U-1 for every header; the clamp: clamp inside the viewport in U-3, with the FR-36-6 trigger-anchor wording amended in the same commit). U-1's design gate and U-3's design gate each carry his answer. If he has not answered when U-1 reaches its design gate, ship U-1 without the force-solid change and record it as open in the U-1 row; do the same for U-3.

Strategic plan W3C-1 row: change "force-solid and the drawer clamp folded into U-1 and U-3" to "force-solid and the drawer clamp are asked at Step 0f and land in U-1 and U-3 only on Bean's answer". D1135's sentence should be corrected the same way when decisions.md is next touched.

### 2. No definition of done per unit, and no pointer to the cells a unit must satisfy

**Gap.** §3 lists families per unit and §4 step 7 says "measured against the capture JSON's cell", but nothing says which cells, for which references, at which tiers. A unit can be "built" with a new attribute that expresses none of the measured values.

**Why it matters.** Gate 3C ("every family built or parked") is unverifiable per unit; a session will close a unit on "attribute exists". The strategic plan's TEST for Wave 3C is "every reference's row is expressible with block attributes". The data to make that testable already exists: `families-master.json::families[].uncovered_references` (per family, the references with a value the framework cannot express) and `<reference>.json::rows[surface,tier].cells[column]`.

**Add to §4 (new step 0 of the loop, before the design gate):**

> 0. **Done when.** Before designing, list the unit's exit cells: for each family in the unit, each reference in `families-master.json::families[<id>].uncovered_references`, read that reference's `<ref>.json` row (surface, tier) and cell (column) and write the measured value into the design report's "Exit cells" table (reference, surface, tier, column, measured value, the attribute and value that will express it). The unit is done when (a) every exit cell's value is reachable by a block attribute (editor-settable, per tier where the cell differs per tier), (b) at least one exit cell per family is reproduced on a `qa-hdr-*` fixture and measured live equal to the reference value within the 2px tolerance of the capture protocol, (c) the family's `coverage_status` can honestly move to covered or its residue is named in the unit row. A cell the unit does not satisfy is written in the unit row as "not covered: <ref>/<surface>/<tier>/<column>, reason" (rule 4, no skipping).

Add a "Done when" column to the §3 table, or a one-line "Exit: M-xx for refs a, b, c" per row derived from the JSON (do not hand-copy values; cite the JSON path).

### 3. No path for a design gate or QC council that rejects the design

**Gap.** §4 steps 1 and 2 assume "approve with changes". Nothing says what to do on "do not build", "wrong layer" (spec gap, not implementation), or a council that splits.

**Why it matters.** This is where long builds sprawl: a session iterates a rejected design inline under context pressure (the project's STOP #19 and the memory "refine across a session boundary" exist because it happened). Root CLAUDE.md: "Classify the layer: implementation bug or spec gap. Fix the right layer."

**Add to §4 after step 2:**

> 2a. **If the gate or council says no.** Do not build. Record the verdict and the reason in the design report, classify it (implementation vs spec gap vs scope change), and: spec gap → write the spec amendment first and re-gate; scope change → put it to Bean as a menu with one recommendation and stop the unit until he answers; implementation → revise once, re-run the same two reviewers on the revision; a second no ends the session on that unit with a `/handoff` that states the two verdicts (Rule 13: fresh session, not inline iteration). A council that splits is not approval; the design goes to Bean with both positions.

### 4. No rollback or failed-live-check procedure

**Gap.** Step 7 verifies live; nothing says what to do when it fails after the deploy, and a unit is several commits (U-1 is at least two by design).

**Why it matters.** The risk register itself names "rollback after destructive attr cuts is multi-commit on a shared worktree" as a risk with no mitigation in this plan. `build-deploy.py` rotates `.bak` copies, but the plan does not say so, and a session that hand-rolls a restore is the recipe the root CLAUDE.md bans.

**Add to §4 after step 7:**

> 7a. **If the live check fails.** Do not iterate on the canary. (1) Redeploy the last green commit through `build-deploy.py` (never a hand-rolled restore; the script's `.bak` rotation is for the script). (2) `git revert` the unit's commits newest-first with an explicit pathspec, one revert commit per unit commit; never `git reset --hard` on this worktree. (3) Record the failing measurement in the unit's design report and in the unit row ("live FAIL <date>, reverted <sha>"). (4) Prove the cause on the live page before any second attempt (computed styles and rules, then confirm by removing the cause); the second attempt is a new design-gate revision. (5) If the failure is in a shared file another unit has since touched, stop and `/handoff`.

### 5. Editor controls are absent from the loop, so a unit can pass every gate and still not be done

**Gap.** Step 3 says "Build". The root CLAUDE.md: "No block feature is complete until it has full block-editor UI controls. Every customisable property must be exposed as an inspector control. If a setting requires touching code, it is not done." The plan never names `SgsColourPanel` (every fill/text/link colour: U-2 scrim colour, U-6 hover paint, U-13 ink), `TypographyControls` (U-4 is a typography unit), `ResponsiveControl` for every per-tier object (U-1 z-index, U-2, U-3, U-11 closeStyle), `SgsBorderControl`, the global device toggle rule (no per-control switcher, inspector-scan rule 25), or the risk-register mitigation "after any edit.js change: deploy and OPEN the real editor before closing the unit; every `createBlock` slug must be registered".

**Add to §4 step 3:**

> 3. **Build**, including the editor surface: every new attribute gets its inspector control in the same commit as its render (colour rows in `SgsColourPanel` with `linked` wired; per-element typography through `TypographyControls`; per-tier objects through `ResponsiveControl` under the global device toggle; borders through `SgsBorderControl`; enums as `ToggleGroupControl` or `SelectControl` with the PHP allow-list carrying the same values as the JSON enum). Run `node scripts/inspector-scan` on the block. After any `edit.js` or shared-component change, deploy and open the real editor on the canary (log in with `.claude/secrets/sandybrown.env`), insert the block, set each new control, save, reload: a control that does not round-trip is not done.

### 6. Nothing carries a new attribute into the framework DB and the clone converter, which is what Wave 4 depends on

**Gap.** `/sgs-update` runs once, at Step 0a, before any attribute exists. The strategic plan's integration test is "Wave 4 clones consume the families without per-reference code", and the converter routes a draft's CSS only through `block_attributes` rows with `css_property`/`css_element`/`css_state`/`css_tier` (Spec 31 §3.A; seeded by `sgs-update-v2.py`). A hover attribute must be named `{base}Hover` and carry `css_state='hover'` or it silently misroutes; box families come from `block.json supports.sgs.boxFamilies`; variants from `supports.sgs.variants`.

**Add to §4 step 8:**

> 8a. **DB and converter.** After the unit's block.json changes: `python plugins/sgs-blocks/scripts/sgs-update-v2.py` (background), then prove the rows: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name, css_property, css_element, css_state, css_tier, box_family FROM block_attributes WHERE block_slug='sgs/<block>' AND attr_name IN (<new attrs>)"`. Every new attribute that maps to a CSS property must show its `css_property`; hover companions must be `{base}Hover` with `css_state='hover'`; tier objects declare `{"type":"object","default":{}}`; box-object attrs are declared in `supports.sgs.boxFamilies`. Then one converter smoke: `python -m pytest plugins/sgs-blocks/scripts/converter -q` (and, for a unit that adds a per-element hover, confirm `db_lookup.per_element_state_attrs` lists it). The commit that adds the attribute and the reseed are pushed together.

---

## HIGH

### 7. Every locked file is already two to three times over the file-length rule, and every unit adds to them

**Measured:** `nav-menu-markup.php` 583 lines, `nav-menu-submenu-css.php` 721, `nav-drawer/render.php` 909, `site-header/render.php` 658, `store.js` 924, `header-behaviours/view.js` 685 (`wc -l`). Code-quality rule: PHP 300, JS 250; "If you inherit a file that exceeds these limits, flag it, don't add to it." The plan's §4 step 1 requires "universal, no per-block carve-outs" but is silent on this, and U-1, U-5, U-6, U-7, U-9, U-10 all ADD to `nav-menu-markup.php`.

**Change.** Add to §2 a Step 0g: "Bean decides once: (a) split the six over-length files before U-1 (U-1's first commit becomes the split, pure move, byte-identical render proven by the 143-scenario CSS comparison from D1131 and `check-fixture-fidelity.py`), or (b) disclose per commit with `[gates-ok:pre-existing file length]` and split at Gate 3C. Recommendation: (a) for `nav-menu-markup.php` and `nav-drawer/render.php` only (six units each), (b) for the rest." Without this a session either violates the rule fourteen times or stalls on it.

### 8. Parallel agents: the plan names "one agent per block" but not the rules that make that safe on this worktree

**Gap.** The strategic plan states them ("Parallel agents get disjoint file lists stated in their brief; a deploy is done once by the main thread after the agents' work is read and merged, never by an agent"; risk register: "`git diff --stat` read after every agent"); the implementation plan and the prompt drop them. Memory records four ways agents destroyed work (self-test, cleanup, framing is not access control, shared index).

**Add to §3 after the table:**

> **Parallel dispatch rules (U-12, U-15, and any reviewer agent).** Each agent's brief names the ONLY directory it may write (`src/blocks/<new-block>/` for U-12; `src/blocks/notice-banner/` for U-15) and states: no `git add`, `git commit`, `git stash`, `npm run build`, deploy, or edit outside that directory; no cleanup of files it did not create; tests written under its own directory. Blocks register by directory discovery (`includes/class-sgs-blocks.php` scans `build/blocks/*/block.json`), so no shared registry edit is needed; `site-header-row` has no `allowedBlocks` restriction, so no allow-list edit either. The main thread reads `git diff --stat` after each agent, builds once, commits each agent's directory with its own pathspec, deploys once. Two agents never share `build/`: builds are serialised in the main thread.

### 9. Owner gates per unit are not stated; the plan reads as if only Gate 3C needs Bean

**Plan text (§5):** Bean's eye at Gate 3C only. Root CLAUDE.md rule 7: "DESIGN-GATE sensitive/high-blast-radius changes (shared wrapper, walker, converter) + get Bean's approval before building." The strategic plan's checkpoint protocol step 5 names Bean's gates per unit table, and this plan's table has no such column. Memory (Bean-directed): "dispatch on decision, do not batch to the end".

**Add a column "Bean" to §3:** `design` for units that change a shared mechanism (U-1 nav-menu-markup and site-header render, U-9 store.js, U-2, U-5 interactivity, U-10, U-13 header-behaviours IIFE, U-14) meaning "the design report goes to Bean as a three-line ask with one recommendation; build on his reply"; `eye` for units whose output he judges visually (U-5, U-6, U-11 morph, U-16, U-15); `none` for U-3, U-4, U-7, U-8, U-12. State in §4 step 1: "A design gate on a `design` unit is closed by Bean's reply, not by the council."

### 10. Session chain: no `/handoff` rule, no state to record, no "never stop here" points

**Gap.** "The whole chain about 3 to 4 sessions" with no instruction on what a session leaves behind. The visual-diff gate sequence in step 5 (commit with a skip, then commit the capture report) creates a window where a session ending leaves a logged skip with no report, which is exactly the "skip reason must be true" failure from this session.

**Add §4a "Session boundaries":**

> End every session with `/handoff`. Before it: never stop between a skipped-gate commit and its capture-report commit, nor between a deploy and its live check; finish the unit step or revert to the last green commit. LEDGER gets one line: "Wave 3C: U-x at loop step N; last green sha; deployed to <targets>; capture report owed y/n; Bean questions open: <list>". The plan's §3 row for the unit records the same. The fresh-session prompt is regenerated from that line (not reused from this file), starts with `Invoke /autopilot`, and names the next unit's exit cells. One unit per checkpoint; do not start a second nav unit in a session that has an unverified deploy.

### 11. Step 0 makes 0c and 0d blockers for U-1; DEC-04 said the opposite

**Plan text (§2):** "Step 0, before any unit". DEC-04's accepted option: "Re-capture ... before Wave 4; proceed with Wave 3C now on the families that do not depend on them." DEC-05 gates U-16 only.

**Change §2 heading to** "Step 0: 0a and 0b before U-1; 0c before Wave 4 (and before U-8/U-2 read rabbit's dropdown cells); 0d before U-16's design gate; 0e optional. 0c and 0d run headed, so they flash a Chrome window on Bean's screen: tell him before starting and run them in one browser session." The prompt's "Then do Step 0 (0a to 0e in the plan), then the units" must change to match.

### 12. The first action writes to shared state before Bean has said go, in a project that starts in plan mode

**Prompt text:** "run Step 0a (`sgs-update-v2.py`) and tell Bean in three lines what you will do first". `/sgs-update` writes the shared framework DB and regenerates Spec 02; the project defaults to PLAN MODE (read-only until a plan is approved). ENG-03 is accepted, so the write is authorised in principle, but the prompt's ordering has the session act, then ask.

**Change the prompt's last paragraph to:** "First action (under 5 minutes): read the plan, `git status` the worktree, then tell Bean in three lines: the two open questions (finding 1), whether the dirty tree blocks a deploy (finding 13), and that you will run Step 0a on his go. Run 0a in the background when he says go."

### 13. The worktree is dirty with other sessions' files and the deploy has a dirty-tree gate; the plan does not say what to do

**Measured (git status at review time):** modified `includes/render-helpers.php`, `google-reviews/{block.json,render.php,style.css}`, `sites/mamas-munches/theme-snapshot.json`, deleted mockup files, dozens of untracked memory and report files. `build-deploy.py` carries a dirty-tree gate; the root CLAUDE.md says never `--allow-dirty`.

**Add to §4 step 6:** "If the dirty-tree gate blocks: the dirt is another session's. Do not stash, do not `--allow-dirty`, do not commit it. List the paths, tell Bean, and wait; or, if he has said the other track is closed, ask him whether to commit those paths under their own message. A deploy with `--allow-dirty` ships an unreviewed edit from a session you cannot see."

### 14. The FR-36-6 amendment's "live close control" condition is not a testable predicate, and the closeStyle tier-object migration it depends on is missing from U-11

**Plan text (DEC-15, 0b):** "required only when no other visible, keyboard-reachable close control is live". Spec 36 FR-36-6 today says the × is "Always rendered" and separately that `closeStyle` "MUST become a per-device tier object", a migration with a documented coercion hazard ("ship the migration and the fallthrough check together"). U-11's row mentions neither.

**Change.** In 0b, write the predicate: "the × may be omitted at a tier only when `modality` is `non-modal` AND the bar's burger is rendered at that tier (`collapsePoint` puts the burger in the DOM) AND `closeStyle` at that tier is `burger-morph`; in every other combination render.php forces the × on. PHP test: modal + burger-morph → × present; non-modal + `separate-x` → × present; non-modal + burger-morph + burger hidden → × present; non-modal + burger-morph + burger live → × absent." In U-11's row add: "`closeStyle` string → tier object (`scripts/migrate-tier-object.py --property closeStyle`, with the fallthrough check that a stored flat string still resolves), `$sgs_nd_allowed_close_styles` kept equal to the JSON enum." Without the tier object, "per tier" in DEC-15 cannot be built.

### 15. FAMILIES-MASTER's unit table contradicts the plan's, and the prompt tells the session to read both in full

**Measured.** FAMILIES-MASTER §"Wave 3C build units" still lists U-17, U-12 as "eight new blocks" with `product-search`/`filter-search` files, U-6 with M-24/M-25, U-14 with M-08, U-8 with M-20 and `mega-aside/render.php`. The plan (post-DEC-13/16/17) removes all of those. A fresh session reading FAMILIES-MASTER second will see the larger scope.

**Add to the plan §3 (first line):** "This table supersedes FAMILIES-MASTER's unit table, which is pre-decision. Use `families-master.json::units[].files` for the full file lists and `families[].uncovered_references` for exit cells; take scope from here." And add one line at the top of FAMILIES-MASTER's unit section: "Superseded for scope by `plans/2026-09-21-wave-3c-implementation-plan.md` §3 (DEC-13, DEC-16, DEC-17)."

### 16. Gate 3C is worded three different ways

**Measured.** Plan §5: "every family built or explicitly parked ... each unit's live report is PASS ... one composed real header (a pill or capped header, a mega, a drawer whose × is optional)". Strategic plan Gate 3C: "built or explicitly mapped ... one composed real header matches its table row". Verify doc W3C-1: a capped-width header centred on the viewport with equal gaps at 1440, mega width equals header width, dropdown centred on its item, plus `audit-inline-styling.js --check` exits 0. None names the fixture.

**Change §5 to one definition and copy it to the other two:** "Gate 3C passes when: (1) every family in §1's signed list is covered (its exit cells reachable and one reproduced live) or listed as parked/not-covered with the reference named; (2) each unit row cites its live report with `verdict: PASS`; (3) `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 and `python plugins/sgs-blocks/scripts/no-inline/check-no-inline.py` passes against a reachable canary; (4) the composed header on fixture 3734 (pill) and 3733 (capped) matches its reference row cells (lamalama for the pill; the capped case's reference named at the gate), with Bean's eye (R-31-13); (5) specs, verify doc, LEDGER state the model. Bean's session for (4) is booked at the last unit's close with the evidence pack pre-built and an external ping (Rule 7)."

---

## MEDIUM

### 17. Deploying to all three targets per unit costs about 18 minutes fourteen times

**Plan text (§4 step 6):** sandybrown, then indus-test, then eye-care-test, "about 6 minutes each". The fixtures (`qa-hdr-*`) exist on sandybrown only; the other two sites carry client chrome. Time-estimates rule: default low.

**Change to:** "Deploy to `sandybrown` per unit. Deploy `indus-test` and `eye-care-test` after U-1 (the de-hardcoding touches every header) and at Gate 3C, and after any unit that changes `site-header`'s emitted CSS for a header with no new attribute set (prove with the D1131 byte-identical comparison first; if identical, skip the two client sites)."

### 18. Accessibility obligations per unit are not stated

**Gap.** WCAG 2.1 AA is a non-negotiable; DEC-02 keeps the accessible defaults, but several units add motion or dynamic content: U-5 and U-16 (prefers-reduced-motion, Spec 35 E5, and the memory "a check with no positive control passes against a dead feature"); U-15 rotating message (2.2.2 Pause, Stop, Hide: a pause control and no `aria-live` on the rotation; a live clock must not announce every second); U-12 language switch (`lang` and `hreflang` on each option) and back-to-top (focus moves to the target); U-2 scrim click-closes must not remove the keyboard route; U-13 section-adaptive ink must keep 4.5:1 on every section (the DP7 contrast sweep, `palette-contrast-sweep.mjs`).

**Add to §4 step 7:** "Run `node scripts/nav-qa/axe-run.mjs` on the fixture with the surface open, and the unit-specific check above; reduced-motion checks need a positive control (the effect fires without the media query)."

### 19. Useful commands and locations the plan omits

Add a §8 "Commands and locations":
- Build on Windows in PowerShell (`cd plugins/sgs-blocks; npm run build`); the nvm shim is broken in Git Bash.
- Fixture page ids on the canary: 3723 plain, 3733 capped, 3734 pill, 3735 drawer with submenus, 3763 hover parity; the loose-block pages 3692 to 3699 are not evidence. `build-header-fixtures.py` must be RE-RUN after a unit changes a nav block's attribute schema (stored fixtures carry old attributes; new ones default) and the new ids recorded.
- Credentials: `.claude/secrets/sandybrown.env` (`WP_USER_SANDYBROWN`, `WP_PWD_SANDYBROWN`, `WP_APP_PWD_SANDYBROWN`).
- Gates: `python plugins/sgs-blocks/scripts/run-gates.py`; `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check`; `python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`; `python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <p> --survey`; `node scripts/qa/check-border-roundtrip.js`.
- Visual gate contract: `SGS_VISUAL_GATE_SKIP` without `SGS_VISUAL_GATE_REASON` fails closed; every skip is appended to `reports/visual-diff/manual-skips.log` (tracked); the report file is `reports/visual-diff/<block>-<YYYY-MM-DD>.md` with `verdict: PASS`, `first_paint_capture_passed: true` (or `intent_capture_passed: true` per `visual-report-sha.py`) and the `source_sha:` the gate prints.
- Capture cells: `<ref>.json::rows[]` filtered by `surface` and `tier`, `cells[<column>].value` with `evidence.raw`.

### 20. Known gotchas from this session that a fresh session will hit again

Add to §6 (each is in D1120 to D1135 or the reports):
- The site caches phone and tablet page variants separately; a first live measurement after deploy can read a stale variant (D1132 A1). Purge, reload, measure twice.
- Hostinger's CDN can serve week-old HTML; `build-deploy.py` does not purge it (D1122 i).
- A defaulted attribute joining the uid hash changes every header's uid once (cache churn only; D1131). Expect it after U-1 and do not chase it.
- A tier-object attribute given a scalar string emits nothing (D1131: pill `maxWidth`); `{}` defaults drop old scalar defaults (memory).
- `header-behaviours/view.js` now wires every header on a page; fixture pages have two `<header>` elements; probes select `.entry-content header.sgs-site-header` (strategic plan Wave 3A).
- `freezeBackground` is a pure function `collectFreezeTargets` since D1125; U-9 and U-2 touch its neighbourhood.
- `mega-disclosure.js::MAX_INTENT_DELAY_MS = 80` clamps a markup-declared 300 (V-03): U-1 must lift or parameterise it, not just wire `closeGrace`.
- FR-36-8's priority+More contradiction and `class-sgs-floating-ui-renderer.php`'s `aria-hidden` container (D1122 k): U-14's detached/pass-through work must not reuse that renderer as is.
- The framework DB is stale for `sgs/site-header` until 0a; `block.json` is ground truth.
- `sgs-db.py stats` crashes on "no such column: grade" (D1122 j); use `sql`.

### 21. Wave 4 preconditions are not listed

**Plan text (§5):** names W4-a2 and W4-b only. The strategic plan requires for W4-b: "W2-i..u CP set + W2-f live verified + Gate 2/3 passed + W3C complete", the Away UK re-read (DEC-03), the 0c captures, resn re-judged at family level from the headed capture (D1133), the parked-item rule, and the Bean session booked with an evidence pack and external ping.

**Add to §5** a five-line checklist with those items and who closes each (session or Bean).

### 22. Parked and deferred items are incomplete against the decisions

**Measured.** DEC-02's text defers wearecollins' `m` hotkey and resn's history-back closer ("can wait"); neither appears in §1's parked list. DEC-07 (buck's random fill) and DEC-13 (Lottie/canvas logos) are "record the divergence" items with no place named where the divergence is recorded.

**Add to §1 after the table:** "Parked (revisit only if a Wave 4 clone stalls): M-08 detaching chip (buck), M-20 (away), M-24 (wearecollins), M-25 (studionamma, lusion), store selector, wishlist, theme toggle, sound mute, wearecollins `m` hotkey, resn history-back closer, U-17. Divergences to record at clone time (DEC-01, DEC-02, DEC-07, DEC-13): in the clone's `reports/visual-diff/<clone>` report under a 'Recorded divergences' heading, one line each, so Bean's eye does not read them as defects."

### 23. Names and defaults that an agent would otherwise invent

DEC-02's close-on-scroll attribute (name, default off), DEC-14's `triggerMode` value (name), ENG-02 `accordionExclusive` (named), U-2's scrim attribute set, U-3's side anchor value names, U-11's placement enum values (FAMILIES-MASTER: same-slot / top-row-start / top-row-end). Add: "Attribute names and defaults are fixed in the unit's design report (with the DB check that the name does not collide: `SELECT block_slug FROM block_attributes WHERE attr_name='<name>'`), never by an implementer agent; enum values are mirrored in the PHP allow-list in the same commit."

### 24. The plan claims self-sufficiency the prompt contradicts

**Plan text (§0):** "nothing else needs to be read first except § Lessons." **Prompt:** five documents "in full", including Spec 36 FR-36-6 and FR-36-22 and Spec 37 §1.2. The root CLAUDE.md requires the governing spec in full at session start for pipeline sessions; this track's governing specs are 36 and 37. Change the plan's sentence to "read with the prompt's list; Spec 36 in full before U-1, Spec 37 §1 and §2 before any drawer unit."

### 25. U-12 loses the `headerEssential` flags without saying so

FAMILIES-MASTER U-12 listed `product-search/block.json` and `filter-search/block.json` (two `headerEssential` flags, V-19). The plan's U-12 row says "new directories only". Either the flags are out of scope (say so, with the family cell they leave uncovered) or they are a main-thread edit outside the agents' directories. One line in the U-12 row.

---

## LOW

### 26. "Sizes ... medium about 1 focused hour, high about 2 to 3" is padded against the project's own actuals

D1131 built and live-verified the pill (a high unit by this scale) in one session with a council. Quote "medium 30 to 60 minutes, high 1 to 2 hours; the chain about 3 sessions" and let live calibration revise (time-estimates rule).

### 27. §4 step 2 names models by this session's choice

"this session used opus and fable" reads as an instruction. Change to "two different models chosen by `/delegate`".

### 28. Step 5's "run long commits in the background" needs the wake-up caveat

Memory: a backgrounded gate with a "wait" gets no wake-up and the session claims completion. Add: "poll the commit's exit before claiming it landed; `git log -1` is the proof."

### 29. Spec 37 same-commit rule is quoted narrower than the rule

Plan 0b: "the same-commit statement in Spec 37 §1.2 if the drawer model text changes". Spec 37 §1: "A change that crosses the line requires an edit to BOTH specs in the same commit" (the line is nav vs container/CPT). U-10 (role migration between header row and drawer) and U-14 (band pass-through on the header shell) cross it too. Change to "Spec 36 and Spec 37 in the same commit whenever a unit changes what the header row, footer row or drawer CPT owns (U-10, U-11, U-14, U-16), per Spec 37 §1."

---

## Consistency checks that passed

- The decisions table matches D1135 and FAMILIES-MASTER §"Decisions for the owner" one for one (DEC-01 to DEC-17 less the demoted three, ENG-01 to ENG-03).
- The §3 lock-file lists match `families-master.json::units[].files` after the decisions (U-8 drops `mega-aside/render.php` with M-20; U-14 drops M-08; U-6 drops M-24/M-25), with the one omission in finding 25.
- The serial order follows the lane analysis (U-1 first; LANE-DRAWER and LANE-HEADER after U-1); U-12/U-15 are the only parallel units, matching the computed components.
- The per-unit loop respects rules 3, 6 and 7 as written (universal, per-tier objects, design gate); no wording contradicts "no version bumps or deprecations pre-production" (nothing in the plan proposes a `deprecated.js`; finding 14's tier-object migration must be done by the migrate script, not a deprecation).
- The prompt's git rules match `git-hygiene.md`.

## Verdict

**Ship after fixes.** Findings 1, 2, 3, 4, 5 and 6 must be applied before the fresh session starts; 7 to 16 before U-1's design gate; the rest on touch. None of them changes the decisions or the order, so the edits are to §1, §2, §4, §5 and one column in §3, plus the strategic plan's W3C-1 row and one superseded line in FAMILIES-MASTER.
