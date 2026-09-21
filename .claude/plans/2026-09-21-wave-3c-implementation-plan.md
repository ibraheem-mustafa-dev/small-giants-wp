---
doc_type: implementation-plan
project: small-giants-wp
spec_id: 36+37 (merged execution track)
status: READY TO EXECUTE
parent_plan: plans/2026-07-29-merged-spec36-37-track-strategic-plan.md (Wave 3C)
inputs: reports/reference-requirements/FAMILIES-MASTER.md, families-master.json, FAMILIES-REVIEW.md
---

# Wave 3C — implementation plan (the requirements table is signed)

The 13 references are captured, clustered into 46 capability families and adversarially reviewed. Bean signed
the family list and accepted every recommended decision. This plan turns the signed list into build work.
A fresh session runs it from the top; nothing else needs to be read first except § Lessons.

## 1. Decisions (all accepted)

| ID | Outcome | Effect on the work |
|---|---|---|
| DEC-01 | Keep resn as clone 13: real DOM text for its labels, the WebGL scene approximated with a Tier V effect or an existing fx field, the divergence recorded | roster stays 13; M-08 kept on its merits |
| DEC-02 | Keep SGS's accessible default everywhere and record each divergence at clone time; one carve-out: an attribute for lamalama's close-on-scroll (in U-9) | no opt-outs for a11y defects |
| DEC-03 | Away is the UK storefront | Away's copy cells are not cloned verbatim; re-read Away on the UK site before Wave 4 |
| DEC-04 | Re-capture ButcherBox and rabbit.tech at 768, rabbit's open dropdown and both footers, headed, before Wave 4 | Step 0c |
| DEC-05 | A short pass measuring footer hover and one reveal before U-16 is designed | Step 0d |
| DEC-07 | buck's per-load random fill is out of scope: the clone freezes one colour and the divergence is recorded | nothing built |
| DEC-09 | The drawer closes when the viewport crosses `collapsePoint` while open; otherwise it stays open and reflows; one rule, no attribute | in U-9 |
| DEC-10 | Clone the INTENT of Bean's two drafts, not their runtime's bugs | the panel-entry shape in U-5 is a real requirement |
| DEC-11 | The drafts' 768 rows are mobile | no tablet row for them |
| DEC-13 | Lottie and live-canvas logos: out of Wave 3C; clone as stills and record the divergence | U-17 is removed from this wave |
| DEC-14 | Add a `triggerMode` value meaning "the row's own surface is the trigger" | in U-14 |
| DEC-15 | Amend FR-36-6: the drawer's own × becomes optional per `closeStyle` and per tier, required only when no other visible, keyboard-reachable close control is live | amendment written into Spec 36 before U-11 builds |
| DEC-16 | Scope floor of 3 references, except where the fix is small. IN: M-10 (magnet strength, two attributes) and M-47 (multi-open accordion, `accordionExclusive`, default true). PARKED with the reference named: M-08's detaching trigger chip (buck), M-20 (Away's callout row), M-24 sibling dim (wearecollins, one more), M-25 two-copy label roll (two references). M-24 and M-25 need new markup, so they sit below the line; Bean can flip either | shrinks U-6, U-8, U-14 |
| DEC-17 | Build four furniture blocks now: local-time clock, language switch, back-to-top, account/log-in link. Park the store selector, wishlist, theme toggle and sound mute | U-12 = four blocks |
| ENG-01 | z-index becomes a per-tier attribute defaulting to 100 | inside U-1 |
| ENG-02 | `accordionExclusive` boolean, default true | inside U-9 |
| ENG-03 | Re-run `/sgs-update` before Wave 3C reads the framework DB (six `sgs/site-header` attributes are missing from it) | Step 0a |

Parked items go to `.claude/parking.md` ONLY when Bean asks; until then they live here and in the decision log.

### Two earlier questions still awaiting Bean (the plan builds the recommendation unless he changes it)

- **Force-solid header background:** a tier set to "force solid" keeps a transparent background; the correct off value is the header's own resting background. Recommendation: fix it in U-1 (`site-header` tri-state emission), for every header, with or without the pill.
- **Trigger-anchored drawer overhang** (canary page 3699: a 420px drawer at left -376px): recommendation: clamp the panel inside the viewport, in U-3 (drawer anchor), with the Spec 36 wording.

## 2. Step 0 — before any unit (about half a day, mostly parallel)

- **0a** `python plugins/sgs-blocks/scripts/sgs-update-v2.py` (the stage map is in its module docstring), then confirm `headerFloat`, `headerFloatInset`, `headerFloatCollapse`, `backdropBlur`, `shadowScrolled` exist in `block_attributes` for `sgs/site-header`.
- **0b** Spec amendments drafted and committed first: Spec 36 FR-36-6 (optional × with the "only when another live close control exists" condition), and the same-commit statement in Spec 37 §1.2 if the drawer model text changes.
- **0c** Headed capture pass (DEC-04): ButcherBox and rabbit.tech at 768 plus rabbit.tech's open dropdown and both footers; `labels-butcherbox.json` and `labels-rabbit.json`; Away re-read on the UK storefront. Method: `reports/reference-requirements/CAPTURE-PROTOCOL.md`, ONE headed Chrome window (the chrome-devtools MCP), page fully loaded before measuring.
- **0d** Footer hover and one footer reveal measured on the references that have footers (DEC-05).
- **0e** Optional: a 1000px tablet capture of the two drafts (DEC-11).

## 3. Units, in execution order (after the decisions)

The 14 nav units share files, so they run ONE AT A TIME in this order. U-12 and U-15 have no file overlap with anything and run in parallel with the chain from day one. U-17 is out (DEC-13).

| Order | Unit | Scope after the decisions | Families | Size | Lock files (do not run two units that share one) |
|---|---|---|---|---|---|
| 1 | U-1 | De-hardcode the nav surfaces: FIRST COMMIT wires the mega fork's `closeGrace` to `submenuCloseGrace` (`includes/nav-menu-markup.php` builds it with a literal 170); per-tier z-index attribute (ENG-01); align the surface-ground vocabulary (per-block attribute names differ) | M-43, M-09, M-13, M-21 | medium | `nav-menu-markup.php`, `site-header/{render.php,style.css,block.json}`, `mega-panel/{render.php,style.css,block.json}`, `nav-drawer/block.json` |
| 2 | U-9 | Dismissal routes, modality, trigger semantics, resize rule (DEC-09), `accordionExclusive` (ENG-02), close-on-scroll attribute (DEC-02) | M-34, M-35, M-36, M-47, M-40 | medium | `nav-bar-menu/block.json`, `nav-drawer/block.json`, `nav-menu-markup.php`, `nav-interactivity/store.js`, `mega-disclosure.js` |
| 3 | U-11 | Close control presence, placement and morph motion (DEC-15); magnet strength (M-10, DEC-16) | M-27, M-10 | medium | `nav-drawer/{block.json,render.php,style.css}`, `nav-bar-menu/{block.json,style.css}` |
| 4 | U-5 | Entry and exit animation vocabulary and item stagger; the mega fork has NO entry-animation attribute today | M-31, M-32 | high | `nav-drawer/{style.css,render.php,block.json}`, `mega-panel/block.json`, `nav-menu-markup.php`, `nav-interactivity/` |
| 5 | U-2 | Surface scrim on the panel and the drawer (colour, alpha, blur per tier; today hardcoded `rgba(0,0,0,0.55)`) | M-14 | medium | `mega-panel/{render.php,block.json}`, `nav-drawer/{style.css,render.php,block.json}`, `store.js` |
| 6 | U-3 | Drawer side anchor, container inset, pitch tier object | M-17, M-46 | medium | `nav-drawer/{render.php,block.json}`, `nav-drawer-menu/block.json` |
| 7 | U-6 | Item hover parity: opacity and padding-shift hover, row separators. M-24 and M-25 are parked | M-21, M-30 | medium | `nav-bar-menu/{block.json,style.css}`, `nav-drawer-menu/{block.json,style.css}`, `nav-menu-markup.php`, `nav-menu-submenu-css.php` |
| 8 | U-7 | Per-item ornament and per-item media slot | M-22, M-15 | medium | `nav-menu-markup.php`, `nav-drawer-menu/block.json`, `mega-group/`, `nav-menu-submenu-css.php` |
| 9 | U-10 | Role migration: move a non-menu header block into the drawer per tier | M-19 | medium | `site-header-row/block.json`, `nav-drawer/render.php`, `nav-menu-markup.php` |
| 10 | U-4 | Type scaling mode: a formula unit, per-tier line-height; include `business-info` for the footer half | M-45 | medium | `nav-bar-menu/block.json`, `nav-drawer-menu/block.json`, `nav-menu-submenu-css.php`, `business-info/block.json` |
| 11 | U-8 | Panel geometry controls: anchor enum and mega top offset ("panel follows the pill" is a covered value of M-16). M-20 is parked | M-16 | medium | `nav-menu-submenu-css.php`, `mega-panel/{block.json,render.php}` |
| 12 | U-14 | Band pass-through (zero-height shell) and the surface-trigger `triggerMode` value (DEC-14). The detaching chip is parked | M-52, M-39 | medium | `site-header/{render.php,block.json,style.css}`, `site-header-row/block.json`, `nav-bar-menu/block.json` |
| 13 | U-13 | Header scroll intelligence: direction-keyed restyle, section-adaptive ink | M-03, M-04 | high | `src/header-behaviours/view.js`, `includes/class-sgs-header-behaviours.php`, `site-header/*` |
| 14 | U-16 | Header and footer entrance animation, after the DEC-05 measurements | M-11 | medium | `site-header/block.json`, `site-footer/block.json`, `site-footer-row/block.json` |
| ‖ | U-12 | Four blocks: local-time clock, language switch, back-to-top, account/log-in link (DEC-17). One agent per block, each in its own new directory | M-18, M-51 | high | new directories only |
| ‖ | U-15 | Self-changing header message (rotate, random, live clock) on `notice-banner` | M-07 | medium | `notice-banner/*` |

Sizes are the merger's low/medium/high; convert with `~/.claude/rules/time-estimates.md` (medium about 1 focused hour, high about 2 to 3; the whole chain about 3 to 4 sessions).

## 4. The per-unit loop (the checkpoint protocol from the strategic plan, made concrete)

1. **Design gate (rule 7).** A short `reports/<date>-<unit>-design.md`: the problem, the measurements from the capture JSON (cite the reference and cell), the design, the risks. Attributes are per-tier objects driven by block attributes; no inline styles; universal, no per-block carve-outs.
2. **QC council before building any shared change:** one code-path census agent and one adversarial reader on different models (this session used opus and fable; both said "approve with changes" and were right). Apply their changes.
3. **Build.** `/subagent-driven-development`: an implementer plus two reviewers. One unit at a time in the nav chain.
4. **Tests.** PHP tests in `plugins/sgs-blocks/tests/php/` with a negative control (the test fails against the previous code); JS tests under `scripts/tests/`; `npm run build`; the prebuild gates.
5. **Commit with explicit pathspecs.** The visual-diff gate blocks a block commit that has no live capture report. The capture needs the deploy and the deploy needs the commit, so use `SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="<truthful>"`, then commit the capture report (`reports/visual-diff/<block>-<date>.md`, with `verdict: PASS`, `intent_capture_passed: true` and the `source_sha:` the gate prints) straight after. Run long commits in the background (`run_in_background`) because the hooks take over a minute.
6. **Deploy** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`, then `indus-test`, then `eye-care-test` (about 6 minutes each; run in the background).
7. **Verify live in a real, headed Chrome, one window** (the chrome-devtools MCP): the page fully loaded, measured against the capture JSON's cell with `getComputedStyle` and `getBoundingClientRect`, using `clientWidth`. Fixtures are `qa-hdr-*` pages built inside a real `sgs/site-header` by `plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py`; never measure a loose block in page content. Real pointer paths for hover behaviour. A negative control for every claim.
8. **Docs in the same push:** Spec 36 (and Spec 37 in the same commit where the drawer model changes), this plan's unit row, `verify/merged-spec36-37-track.md`, `LEDGER.md`, `decisions.md`, then `python .claude/hooks/handoff-preflight.py --check` and `python plugins/sgs-blocks/scripts/lints/lint-spec-drift.py --check`. Push to `main` after every unit.

## 5. Gate 3C and what comes next

Gate 3C passes when every family in the signed list is built or explicitly parked (section 1), each unit's live report is PASS, the specs state the model, and one composed real header (a pill or capped header, a mega, a drawer whose × is optional) matches its requirements-table row, with Bean's eye (R-31-13). Then W4-a2 (Bean signs the substitution policy) and W4-b, the studionamma clone. The parked items return only if a Wave 4 clone stalls on one.

## 6. Lessons to carry (each cost time this session)

- **Real headed Chrome, one window, wait for the load.** Headless distorts timing, WebGL, scrollbars (about 15px) and pointer input; one script per browser launch makes windows flash on Bean's screen. Use the chrome-devtools MCP or one `launchServer` process.
- **Presence is what a visitor sees**, not an HTML tag (resn has a header of fixed controls and no `<header>`).
- **Test inside a real header.** Loose nav blocks in page content showed defects that do not exist in a header (bullets, underline, no surface, hover parity) and hid a real one.
- **Prove the cause before the fix.** Both W3A-4 causes were found by reading computed styles and CSS rules on the live page, then confirmed by removing the cause.
- **The Bash tool halves backslashes in heredocs.** Write scripts with the Write tool and run them; syntax-check.
- **A gate's skip reason must be true.** Do not claim a live check that has not happened.
- **Bean's decisions are not assumed.** "Should I start it?" waits for an answer; a notification is never an answer.
- **The framework DB is stale for `sgs/site-header`**; check `block.json` for any attribute claim.

## 7. Fresh-session prompt

See `.claude/prompts/2026-09-21-wave-3c-start.md`.
