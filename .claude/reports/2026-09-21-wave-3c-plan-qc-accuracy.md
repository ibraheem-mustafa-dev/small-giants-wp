---
doc_type: qc-report
project: small-giants-wp
subject: accuracy + staleness fact-check of the Wave 3C implementation plan and its fresh-session prompt
targets:
  - .claude/plans/2026-09-21-wave-3c-implementation-plan.md
  - .claude/prompts/2026-09-21-wave-3c-start.md
ground_truth:
  - .claude/reports/reference-requirements/families-master.json (46 families, 17 units, 14 decisions, 3 engineering notes)
  - the repo at HEAD (branch main)
date: 2026-09-21
---

# Wave 3C plan + prompt — accuracy and staleness QC

**Method.** Every path globbed, every command's argparse or docstring read, every unit row
diffed against `families-master.json` programmatically, and the unit file-overlap graph
recomputed from the JSON's own `files` arrays rather than trusted from its `collides_with`.
Repo claims were checked against the named symbol in the named file.

**Headline.** The plan is substantially accurate. Its command surface, its lock-file lists,
its serialisation claim and its repo claims all hold. The defects are in the *bookkeeping of
scope*: one family added to a unit that the adversarial review had deliberately removed it
from, one attribute dropped from a verification list, a set of families that the Gate 3C
wording cannot dispose of, two scope items agreed in §1 that never reach the unit table, and
one stale spec citation in the prompt.

---

## Findings, ranked by severity

### HIGH

**1. U-12's families list adds M-51, which the review deliberately removed from U-12's scope.**

- Plan text (§3, U-12 row): `| ‖ | U-12 | Four blocks: … | M-18, M-51 | high | new directories only |`
- Evidence: `families-master.json::units[U-12].families == ["M-18"]`. `families[M-51]`
  ("Drawer secondary-block roster (the drawer body is open InnerBlocks)") has
  `coverage_status: "covered"` and is assigned to **no** unit. `families[M-18].note` states
  the reason verbatim: *"The first pass folded F-C-15 (status COVERED …) into a partial
  family, which made a covered fact read as part of an eight-block build. F-C-15 is now
  M-51."* No decision re-adds it.
- Effect: the plan re-creates the exact error the adversarial review corrected; a builder
  reading the row will try to build an already-covered capability.
- Corrected wording: `| ‖ | U-12 | Four blocks: … (DEC-17) | M-18 | high | …`

**2. Step 0a verifies five of the six attributes ENG-03 names; `shadowScrolledColour` is missing.**

- Plan text (§2, 0a): *"confirm `headerFloat`, `headerFloatInset`, `headerFloatCollapse`,
  `backdropBlur`, `shadowScrolled` exist in `block_attributes` for `sgs/site-header`"* — and
  §1 ENG-01/03 row: *"six `sgs/site-header` attributes are missing from it"*.
- Evidence: `families-master.json::engineering_notes[ENG-03]` names **six** —
  `backdropBlur, headerFloat, headerFloatCollapse, headerFloatInset, shadowScrolled,
  shadowScrolledColour`. All six are present in
  `src/blocks/site-header/block.json::attributes` (verified: 65 attributes, all six
  `PRESENT`). The plan's own prose says six and then checks five.
- Effect: the one attribute most likely to stay unseeded is the one not checked; §1's own
  count contradicts §2's list in the same document.
- Corrected wording: add `shadowScrolledColour` to the 0a confirmation list.

**3. Gate 3C's pass condition cannot be satisfied: 12 signed families are in no unit and in no parked list.**

- Plan text (§5): *"Gate 3C passes when every family in the signed list is built or
  explicitly parked (section 1)"*.
- Evidence: recomputed from the JSON — 34 of the 46 families are assigned to a unit. The 12
  unassigned are `M-01, M-02, M-05, M-06, M-12, M-23, M-26, M-29, M-41, M-42, M-50, M-51`.
  Eleven carry `coverage_status: "covered"`; `M-02` is `"partial"` but
  `uncovered_count: 0`. None appears in the plan's §1 parked list (DEC-16 parks only M-08's
  chip, M-20, M-24, M-25; DEC-13 parks M-33; DEC-17 parks four blocks).
- Effect: the gate has a third, unnamed bucket — *already covered* — so as written it can
  never close.
- Corrected wording: *"…every family in the signed list is **built, already covered
  (the 12 families with `uncovered_count: 0`, listed in `families-master.json`), or
  explicitly parked (section 1)**"*.

**4. Two scope items agreed in §1 never appear in the U-1 and U-3 unit rows.**

- Plan text (§1, "Two earlier questions still awaiting Bean"): force-solid fixed *"in U-1
  (`site-header` tri-state emission), for every header"*; the drawer clamp *"in U-3 (drawer
  anchor), with the Spec 36 wording"*. The U-1 row (§3) lists only close-grace wiring,
  per-tier z-index and vocabulary alignment. The U-3 row lists only side anchor, container
  inset and pitch tier object.
- Evidence: the parent plan carries both —
  `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`, W3C-1 row: *"force-solid and
  the drawer clamp folded into U-1 and U-3"*. The implementation plan is the one that
  drops them.
- Effect: a fresh session that builds from the unit table (which §3 presents as the
  execution surface) ships U-1 and U-3 without either fix.
- Corrected wording: append to U-1's scope *"; force-solid tri-state emission (the off
  value is the header's own resting background)"*, and to U-3's *"; clamp the panel inside
  the viewport for a trigger-anchored drawer"*.

**5. The prompt tells the next session to read FR-36-22 before touching the drawer model; FR-36-22 is the logo requirement, and its unit is cut from this wave.**

- Prompt text (line 10): *"Spec 36 … FR-36-6 and FR-36-22, and Spec 37 §1.2, before
  touching the drawer model."*
- Evidence: `specs/36-SGS-NAVIGATION-SYSTEM.md` — `FR-36-22` is *"Logo
  (`sgs/responsive-logo`) — the logo OBJECT"* (line 809 heading; FR index line 100). The
  only logo unit, U-17 (`families[M-33]`), is removed from Wave 3C by DEC-13. FR-36-6 is
  correctly *"The drawer (`sgs/nav-drawer`)"*.
- Effect: a reading gate pointed at an out-of-scope requirement, and the requirement that
  *is* load-bearing for DEC-09's resize rule and DEC-14's trigger is not named.
- Corrected wording: *"Spec 36 FR-36-6 (the drawer) and Spec 37 §1.2 (the boundary rule:
  a change crossing the line edits BOTH specs in the same commit), before touching the
  drawer model."*

### MEDIUM

**6. U-12's lock files "new directories only" is false — the JSON includes two existing block.json files, and the capability they carry is silently dropped.**

- Plan text (§3, U-12 lock column): `new directories only`.
- Evidence: `units[U-12].files` = the eight new block directories **plus**
  `src/blocks/product-search/block.json` and `src/blocks/filter-search/block.json`;
  `units[U-12].rationale`: *"Eight new blocks plus two headerEssential flags."* DEC-17
  scopes the *blocks* (four of eight) and says nothing about the two flags.
- Effect: the `headerEssential` half of M-18 is dropped without a decision. (Parallel safety
  is unaffected — neither file is touched by any other unit.)
- Corrected wording: `new directories, plus product-search/block.json and
  filter-search/block.json (the two headerEssential flags)`.

**7. U-8's lock list omits `mega-aside/render.php`.**

- Plan text (§3, U-8 lock column): `nav-menu-submenu-css.php`, `mega-panel/{block.json,render.php}`.
- Evidence: `units[U-8].files` includes `plugins/sgs-blocks/src/blocks/mega-aside/render.php`
  (the aside/callout column count). The directory exists and contains `render.php`.
- Effect: the lock list is what the plan says governs concurrency; an omitted file is an
  unlocked file. (Here it is harmless — no other unit touches mega-aside — but the list is
  presented as "the units' real files" and is not.)
- Corrected wording: add `mega-aside/render.php` to U-8's lock column.

**8. M-24 and M-25 are parked by DEC-16's *recommendation*, not by Bean's answer — but they sit in a table headed "Decisions (all accepted)".**

- Plan text (§1 header): *"## 1. Decisions (all accepted)"*; DEC-16 row: *"M-24 and M-25
  need new markup, so they sit below the line; Bean can flip either"*.
- Evidence: `decisions[DEC-16].recommendation` ends *"It needs the owner to say which side
  of the line M-24 and M-25 fall on, since both need new markup rather than a new value."*
  The decision text itself flags these two as unanswered.
- Effect: the plan's own §6 lesson is *"Bean's decisions are not assumed"*, and this row
  assumes two. The force-solid and drawer-clamp defaults ARE correctly labelled (§1's
  "Two earlier questions still awaiting Bean … the plan builds the recommendation unless he
  changes it") — M-24/M-25 need the same label.
- Corrected wording: move M-24 and M-25 out of the DEC-16 row into the "still awaiting Bean"
  subsection: *"**Sibling dim (M-24) and two-copy label roll (M-25):** both need new markup,
  so DEC-16's floor parks them by default. Recommendation: parked; Bean can flip either into
  U-6."*

**9. `reports/` means two different roots inside one document.**

- Plan text: §4 step 1 *"A short `reports/<date>-<unit>-design.md`"*; §4 step 5
  *"`reports/visual-diff/<block>-<date>.md`"*; front matter
  `inputs: reports/reference-requirements/…`.
- Evidence: `reports/visual-diff/` is repo-root (the gate writes there —
  `.githooks/sgs-gates.sh` uses `$REPO_ROOT/reports/visual-diff`). The
  reference-requirements inputs and every design/audit report live under `.claude/reports/`.
  Both directories exist.
- Effect: the design gate's report lands in the wrong tree half the time.
- Corrected wording: `.claude/reports/<date>-<unit>-design.md` in step 1 and in the front
  matter (`.claude/reports/reference-requirements/…`, `.claude/plans/2026-07-29-…`); leave
  step 5's repo-root `reports/visual-diff/` as-is.

**10. "the `source_sha:` the gate prints" — after a MANUAL SKIP the gate prints nothing.**

- Plan text (§4 step 5): *"…then commit the capture report … and the `source_sha:` the gate
  prints straight after."*
- Evidence: `.githooks/sgs-gates.sh` — the skip branch `continue`s immediately after logging
  to `manual-skips.log`; the `add: source_sha: …` hint is printed only in the *other* branch
  (a report exists but has no `source_sha:`). The sha comes from
  `plugins/sgs-blocks/scripts/visual-report-sha.py <block>`. Everything else in step 5 is
  exact: `SGS_VISUAL_GATE_SKIP`, `SGS_VISUAL_GATE_REASON` (empty reason fails closed),
  `verdict: PASS`, `intent_capture_passed: true`, the change-keyed `source_sha:` check.
- Corrected wording: *"…and the `source_sha:` from
  `python plugins/sgs-blocks/scripts/visual-report-sha.py <block>` straight after."*

**11. Sizes were silently changed from the signed JSON for two units.**

- Plan text: U-6 `medium`, U-14 `medium`.
- Evidence: `units[U-6].size == "high"` and `units[U-14].size == "high"`. Both changes are
  *justified* (DEC-16 parks M-24+M-25 out of U-6; DEC-16 parks M-08's chip out of U-14), but
  the plan states neither as a re-size — and U-14's families row also silently drops M-08
  while §1's DEC-01 row says *"M-08 kept on its merits"*, which reads as "kept in scope".
- Effect: two of the fourteen sizes disagree with the signed data with no stated reason, and
  DEC-01 and DEC-16 appear to contradict each other on M-08.
- Corrected wording: U-6 `medium (was high; M-24+M-25 parked)`, U-14 `medium (was high;
  M-08's chip parked)`; and DEC-01's Effect cell → *"roster stays 13; M-08 judged on its own
  merits, then parked by DEC-16"*.

**12. Time estimates run above `~/.claude/rules/time-estimates.md`'s default-low rule.**

- Plan text: *"## 2. Step 0 — before any unit (about half a day, mostly parallel)"*;
  *"medium about 1 focused hour, high about 2 to 3; the whole chain about 3 to 4 sessions"*.
- Evidence: `~/.claude/rules/time-estimates.md` — *"give the smallest plausible figure"*;
  baselines *cold/mechanical ~5 min, design ~15 min, research ~30 min*; anti-pattern
  *"Multi-week predictions … should be exceptionally rare"* and *"Padding for safety"*.
  Step 0 is one script run (0a), one spec edit (0b) and a headed capture pass (0c–0e) —
  0a/0b are mechanical and 0c is a short headed run by DEC-04's own words (*"It is a short
  headed run"*). "About half a day" is the padded figure, not the smallest plausible one.
  The per-unit medium/high figures are defensible; the chain figure is inherited from the
  parent plan's W3C-1 row unchanged.
- Corrected wording: *"## 2. Step 0 — before any unit (about 90 minutes, mostly parallel;
  0a and 0b are minutes, 0c is the only real cost)"*.

**13. The plan and the prompt disagree about what must be read first.**

- Plan text (intro): *"A fresh session runs it from the top; nothing else needs to be read
  first except § Lessons."*
- Evidence: the prompt (lines 5–11) requires five documents read **in full** before Step 0,
  and the plan's own §4 step 1 requires the per-reference capture JSON, §2 0b requires
  Spec 36, and project `CLAUDE.md` requires the governing spec read end to end every
  session.
- Effect: a reader who trusts the plan's intro skips the governing spec.
- Corrected wording: *"A fresh session runs it from the top; § Lessons first, then the
  documents listed in `.claude/prompts/2026-09-21-wave-3c-start.md`."*

### LOW

**14. "The 14 nav units share files, so they run ONE AT A TIME" overstates the graph.**

- Evidence: recomputed overlap graph (prefix-aware, from `units[].files`) matches every
  `collides_with` array exactly, and confirms the independence claim: **U-12, U-15 and U-17
  are the only units disjoint from everything** — so the plan's parallel claim is correct.
  But within the 14 there are many disjoint pairs (U-13 collides only with U-1/U-14/U-16;
  U-16 only with U-1/U-13/U-14; U-8 only with U-1/U-2/U-4/U-5/U-6/U-7). The chain is
  serialised *conservatively*, not because all fourteen share files.
- Corrected wording: *"The 14 nav units form one connected file-overlap component
  (`nav-menu-markup.php` and `site-header/*` are the hot files), so they run ONE AT A TIME
  in this order."*

**15. U-2's scope implies both surfaces carry the hardcoded scrim; only the drawer does.**

- Plan text (§3, U-2): *"Surface scrim on the panel and the drawer (colour, alpha, blur per
  tier; today hardcoded `rgba(0,0,0,0.55)`)"*.
- Evidence: `src/blocks/nav-drawer/style.css` lines 63 and 78 carry
  `background-color: rgba(0, 0, 0, 0.55)` — twice, drawer only. `mega-panel/` has no match;
  `units[U-2].rationale`: *"the panel fork has no scrim element at all"*.
- Corrected wording: *"…(the drawer hardcodes `rgba(0,0,0,0.55)` twice in style.css; the
  panel fork has no scrim element at all)"*.

**16. The `nav-interactivity/` paths in the U-9 and U-5 lock lists are not the real paths.**

- Plan text: `nav-interactivity/store.js`, `mega-disclosure.js`, `nav-interactivity/`.
- Evidence: the real location is `plugins/sgs-blocks/src/shared/nav-interactivity/store.js`
  and `…/mega-disclosure.js` (the JSON uses the full paths). The plan abbreviates
  inconsistently — every other lock entry is block-relative, this one is neither.
- Corrected wording: `src/shared/nav-interactivity/{store.js,mega-disclosure.js}`.

**17. §7 points at a prompt the plan should not outlive.**

- Plan text (§7): *"See `.claude/prompts/2026-09-21-wave-3c-start.md`."*
- Evidence: memory rule `delete-prompt-files-once-their-session-is-over` — a prompt is an
  instruction, not a record, and is `git rm`'d in the same commit that supersedes it. A
  permanent pointer from the plan to a disposable prompt becomes a dangling link that
  `handoff-preflight.py --check` will flag.
- Corrected wording: *"§7. The fresh-session prompt lives at
  `.claude/prompts/2026-09-21-wave-3c-start.md` until Wave 3C starts, then it is deleted —
  this plan is the record."*

**18. The prompt's first action writes to the shared framework DB while the project defaults to plan mode.**

- Prompt text (line 16): *"First action (under 5 minutes): read the plan, then run Step 0a
  (`sgs-update-v2.py`)"*.
- Evidence: project `CLAUDE.md` — *"This project defaults to PLAN MODE
  (`.claude/settings.json` `permissions.defaultMode: "plan"`). Every session starts
  read-only."* `sgs-update-v2.py` writes to `sgs-framework.db` (Stage 1 INSERT/UPDATE,
  Stage 9 prune).
- Corrected wording: *"First action (under 5 minutes): read the plan and tell Bean in three
  lines what you will do first; Step 0a (`sgs-update-v2.py`) writes to the framework DB, so
  it needs plan mode exited."*

---

## Verified correct (no finding)

These were checked and hold exactly as written, and are recorded so a later reader does not
re-audit them:

- Counts: 13 references, 46 families, 17 units, 14 decisions, 3 engineering notes — all match
  `meta` and the arrays. The decision ID set in §1 (DEC-01..05, 07, 09, 10, 11, 13, 14, 15,
  16, 17 + ENG-01..03) is exactly the JSON's, including the correct absence of DEC-06/08/12
  (they became ENG-01/02/03, and `engineering_notes[].was` confirms the mapping).
- Every decision's stated outcome matches its `recommendation`: DEC-01 (b), DEC-02 (a) with
  the lamalama carve-out, DEC-03 (a) UK, DEC-04 (a), DEC-05 (a), DEC-07 (a), DEC-09 (a) one
  rule no attribute, DEC-10 (a) intent, DEC-11 (a) mobile, DEC-13 (a), DEC-14 (a),
  DEC-15 (b) with the Spec 36 amendment before U-11, DEC-16 (c) — the plan's *"floor of 3,
  except where the fix is small; IN: M-10 and M-47"* is option (c) verbatim — DEC-17 (b) with
  the correct four blocks and the correct four parked.
- The `independent` claim: recomputed graph gives exactly `[U-12, U-15, U-17]`.
- U-1's first commit: `includes/nav-menu-markup.php:144` is `'closeGrace' => 170,` (a
  literal) while the non-mega fork at `:239` reads `$submenu['close_grace']`.
- FR-36-6's unconditional ×: `nav-drawer/render.php` — `$close_html = sprintf('<button
  type="button" class="sgs-nav-drawer__close" data-sgs-nav-close…')` under the comment
  *"The × button itself remains fixed, undeletable chrome in EVERY style (FR-36-6)."*
- `triggerMode` exists on `nav-bar-menu/block.json::attributes.triggerMode`
  (`icon | text | icon-and-text`, PHP-validated, no JSON enum) — so DEC-14 does add a
  *fourth* value, as the plan says.
- `notice-banner` is the U-15 host, and `mega-group` / `mega-aside` both exist as block
  directories.
- Deploy targets are exactly `sandybrown | indus-test | eye-care-test`, `--blocks-only` and
  `--target` are real flags, and the two opt-in targets are satisfied by naming `--target`
  explicitly (`build-deploy.py:1763`).
- `qa-hdr-*` is the real fixture slug prefix (`PAGE_SLUG_PREFIX = "qa-hdr-"`, five fixtures).

---

## Every path and command checked

| # | Path / command / claim | Result |
|---|---|---|
| 1 | `plugins/sgs-blocks/scripts/sgs-update-v2.py` (no required args; stage map in module docstring, 13 stages, `choices=range(1,14)`) | OK |
| 2 | `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | OK |
| 3 | build-deploy `TARGETS` = sandybrown / indus-test / eye-care-test | OK |
| 4 | build-deploy `--theme-only`, `--skip-build`, `--skip-purge` (mutually-exclusive scope group) | OK |
| 5 | `.claude/hooks/handoff-preflight.py --check` | OK |
| 6 | `plugins/sgs-blocks/scripts/lints/lint-spec-drift.py --check` | OK |
| 7 | `plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py` + `qa-hdr-` prefix | OK |
| 8 | `plugins/sgs-blocks/scripts/visual-report-sha.py` (the real source of `source_sha:`) | OK (plan misattributes it — finding 10) |
| 9 | `.claude/reports/reference-requirements/CAPTURE-PROTOCOL.md` | OK |
| 10 | `.claude/reports/reference-requirements/FAMILIES-MASTER.md` ("17 units", 46 families) | OK |
| 11 | `.claude/reports/reference-requirements/families-master.json` | OK |
| 12 | `.claude/reports/reference-requirements/FAMILIES-REVIEW.md` | OK |
| 13 | `.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` (Checkpoint protocol §150, Wave 3B §197, Wave 3C §272, Gate 3C §410) | OK |
| 14 | `.claude/verify/merged-spec36-37-track.md` | OK |
| 15 | `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` FR-36-6 (§274, the drawer) | OK |
| 16 | Spec 36 FR-36-22 (§809) — **is the logo, not the drawer** | FAIL (finding 5) |
| 17 | Spec 37 §1.2 — file is `37-HEADER-FOOTER-BUILDER.md` (not `37-SGS-HEADER-FOOTER.md`); §1.2 = "This spec does NOT own" + the both-specs-same-commit boundary rule | OK (neither doc cites a wrong filename) |
| 18 | `.githooks/sgs-gates.sh` `SGS_VISUAL_GATE_SKIP` / `SGS_VISUAL_GATE_REASON` (empty reason fails closed; logged to `reports/visual-diff/manual-skips.log`) | OK |
| 19 | Gate report fields `verdict: PASS`, `intent_capture_passed: true`, `source_sha:` (change-keyed) | OK |
| 20 | `reports/visual-diff/<block>-<date>.md` (repo root) | OK |
| 21 | `includes/nav-menu-markup.php::closeGrace` literal `170` at :144 | OK |
| 22 | `includes/nav-menu-submenu-css.php` | OK |
| 23 | `includes/class-sgs-header-behaviours.php` | OK |
| 24 | `src/header-behaviours/view.js` | OK |
| 25 | `site-header/block.json` — `headerFloat`, `headerFloatInset`, `headerFloatCollapse`, `backdropBlur`, `shadowScrolled` | OK |
| 26 | `site-header/block.json::shadowScrolledColour` (6th ENG-03 attribute) | OK in repo — **absent from plan's 0a list** (finding 2) |
| 27 | `nav-drawer/render.php` unconditional `sgs-nav-drawer__close` under FR-36-6 | OK |
| 28 | `nav-bar-menu/block.json::triggerMode` (3 values) | OK |
| 29 | `nav-drawer/style.css` `rgba(0,0,0,0.55)` ×2; none in `mega-panel/` | OK (plan phrasing — finding 15) |
| 30 | Block dirs: site-header, site-header-row, site-footer, site-footer-row, mega-panel, mega-group, mega-aside, nav-drawer, nav-drawer-menu, nav-bar-menu, notice-banner, business-info | OK (all 12) |
| 31 | `src/shared/nav-interactivity/{store.js,mega-disclosure.js}` | OK (plan's path abbreviation — finding 16) |
| 32 | `mega-aside/render.php` (in `units[U-8].files`) | OK in repo — **missing from plan's U-8 lock list** (finding 7) |
| 33 | `product-search/block.json`, `filter-search/block.json` (in `units[U-12].files`) | OK in repo — **excluded by "new directories only"** (finding 6) |
| 34 | `plugins/sgs-blocks/tests/php/`, `plugins/sgs-blocks/scripts/tests/` | OK |
| 35 | `site-header`/`site-footer` `supports.sgs.hideExtensions` (U-16's premise) | OK (`site-footer-row` has none, as the JSON implies) |
| 36 | `~/.claude/rules/time-estimates.md` | OK (plan inconsistent with it — finding 12) |
| 37 | Unit file-overlap graph recomputed vs all 17 `collides_with` arrays | OK — 17/17 exact match |
| 38 | `independent_units` == `[U-12, U-15, U-17]` recomputed | OK |
| 39 | Unit families vs `units[].families`, all 17 | FAIL ×3 (U-12 +M-51, U-14 −M-08, U-6 −M-24/M-25 — the last two decision-justified: findings 1, 11) |
| 40 | Unit sizes vs `units[].size`, all 17 | FAIL ×2 (U-6, U-14 — finding 11) |
| 41 | Decision outcomes vs `decisions[].recommendation`, all 14 | OK — 14/14 |
| 42 | ENG-01/02/03 vs `engineering_notes[]` (incl. `was:` DEC-06/08/12) | OK |
| 43 | Counts: 13 references / 46 families / 17 units / 14 decisions | OK |
| 44 | Family coverage: 34 of 46 assigned to units; 12 unassigned | FAIL against Gate 3C's wording (finding 3) |
| 45 | D-numbers cited in plan or prompt | OK — none cited (live ceiling D1135); nothing to go stale |
| 46 | `families-master.json::meta.revision` = 2, post-review | OK |
| 47 | Front-matter `parent_plan` / `inputs` root-relative paths | FAIL (finding 9) |

Note for a future reader, not a finding against these two documents:
`families-master.json::decisions[DEC-04].families` cites `M-44`, `M-48` and `M-49`, and
`decisions[DEC-09].families` cites `M-49` — none of which exist in the 46-family master list
(they are source-list IDs from `families-A/B/C.json` that the merge renumbered). DEC-09's
real destination is `M-40` ("Collapse breakpoint … and what happens on a resize across it"),
which the plan correctly places in U-9. The stale IDs are in the signed JSON, not in the plan.
