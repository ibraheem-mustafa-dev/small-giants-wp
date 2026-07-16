---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-16
session: D341/D342 — Spec 34 disclosure drawer BUILT + live (Gate B all-pass); scoped handoff for Tracks B+C; qc-council pre-build gate
---

# Session Handoff — 2026-07-16 (D341/D342)

*(Previous session archived → `.claude/memory/handoff-2026-07-15-D338.md`)*

## Branch / state

`feat/adaptive-nav-dialog-drawer`. All work COMMITTED. **Not pushed** (mid-flight).
Canary sandybrown carries the build; **palestine-lives untouched** (on `main`, Bean's rollback).

⛔ **SHARED-CHECKOUT HAZARD (bit us twice).** Track C ran `git checkout -b` in the MAIN
checkout and detached this branch mid-build. Recovered via cherry-pick; Track C now has its own
worktree (`../small-giants-wp-trackc`). Both track prompts were rewritten to mandate
`git worktree add`, never `checkout`. **Verify `git branch --show-current` before any commit.**

## DONE this session

**Bean's point 1 — scoped handoff: COMPLETE.** D338's unverified tree verified live + committed
(`fc1be02a`) with 5 per-block reports (cart / heading / business-info / product-card /
site-footer). All 3 track prompts rewritten: clean-start, no dirty-tree dependency, completed
steps removed, worktree-mandated, per-track scratch decision files. Tracks B+C launchable
(Track B has since RUN and is done — see its prompt header).

**Bean's point 2 — Spec 34: spec + plan + council + BUILD. Gate B ALL PASS.**
- `.claude/specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` (docscore 96% A) ·
  `.claude/plans/2026-07-15-spec34-build-plan.md` (4 pre-written dispatch prompts) ·
  `.claude/reports/2026-07-15-spec34-qc-council.md`.
- **The qc-council earned its cost** (3 cross-model raters, all GO-WITH-MUST-FIX). Its #1
  (triangulated ×3): dropping `showModal()` reopens the container-wrapper specificity war →
  the drawer would have re-broken exactly as Bean originally reported. Fix = re-parent to
  `<body>`. Its #2: the header pattern ALREADY had drawer children, and WP's InnerBlocks
  `template` only seeds EMPTY blocks → **the flagship header would have shipped with ZERO nav
  links.** 10 must-fixes folded in pre-dispatch.
- **Built by 2 parallel Opus workstreams + inline integration.** Live on canary at 375:
  header row stays visible AND interactive (toggle hit-tested reachable), burger↔X in place,
  drawer top 143 == header bottom 143, full-bleed, reaches viewport bottom, scrim never covers
  the header, background `inert`, non-modal (`aria-modal` never set), `position: fixed`,
  44×44, no overflow, **axe 0 on the open drawer**, 6 links via the NEW `sgs/nav-menu` block
  inheriting through block context. Reports:
  `reports/visual-diff/{adaptive-nav,nav-menu}-2026-07-16.md`.

## ⛔ BEAN'S CORRECTIONS (2026-07-16 — apply; do not re-litigate)

1. **`P-CALL-BUTTON-CONTRAST` is a NON-ISSUE — delete the parking entry.** Bean: *"totally
   irrelevant unless that is hardcoded. We'll be cloning the draft's menu which doesn't feature
   that button anyway."* Do not "fix" the Call button.
2. **`primary-dark` is NOT a mis-named token.** Bean: *"Primary dark is darker than the normal
   primary which pink but a lighter shade. There is no issue there at all."* My framing ("a
   token named dark that isn't") was WRONG — it imported D339's drawer-BACKGROUND case (where
   `primary-dark` was the panel colour) into a different situation.
   **Consequence to review:** I shipped `color: inherit` on `nav-menu`'s `:hover`/
   `:focus-visible` (`src/blocks/nav-menu/style.css` ~L52) to stop theme.json's global
   `a:hover` repainting drawer links `primary-dark`. Bean says there is no issue → **that rule
   may be unnecessary and may have removed an intended darker-pink hover.** Ask Bean: is a
   darker-pink hover on the lighter-pink drawer his intent? If yes, revert that one rule (the
   underline affordance stays regardless). Do NOT keep it just because it measures higher.
3. **"Fix the other 2 bugs next session too."** All three bugs I reported were already fixed +
   committed THIS session. **Confirm with Bean in ONE line which two he means** before acting —
   most likely reading: the 2 real ones (header-height publisher, UA dialog defaults) stand as
   fixed and #3 is the non-issue per correction 2. Do not assume.

## The big find (fixed — wider than this drawer)

**`--sgs-header-height` has NEVER been a live measurement on any deployed site.** The FR-S9-9
publisher (`src/header-behaviours/view.js`) was never compiled: `webpack.config.js` listed only
`extensions/index` + `plugins/product-variation-sets/index` as non-block entries, and wp-scripts
auto-discovers `src/blocks/*` only. So `build/header-behaviours/view.js` never existed, the
deploy tar excludes `src/`, and `enqueue_assets()` found neither path → silent `return`. The var
fell back to `utilities.css`'s static **80px** while the real header measured **143px**.
**Also breaks `scroll-padding-top` (WCAG 2.4.11 anchor offset) on every deployed site.** Fixed
by adding the entry to BOTH branches of the entry function (proven by resolving `cfg.entry()`;
my first inference about which branch was live was wrong).
**This falsified a qc-council "CLEAN" finding** — the rater verified the CODE publishes, not
that the script LOADS. Lesson: verify the live trigger, not the source.

## NEXT (in order)

1. **Bean gate:** confirm correction #3 (one line) · delete `P-CALL-BUTTON-CONTRAST` · review
   the `nav-menu` hover rule per correction 2.
2. **Step 5 — FR-34-5 drawer settings** (Sonnet): `toggleOpenColour`, `drawerAlign`,
   `drawerGap` {tiers}, `drawerPadding` {tiers}; reuse `ResponsiveControl`. Prompt §Dispatch-D
   is pre-written in the plan.
3. **Step 6 — FR-34-6 builder reflection** (Sonnet): §Dispatch-E pre-written. **Reconcile, do
   not redo** — the nav-menu child insertion into `parts/header.html` +
   `framework-header-default.php`, the theme bump (1.5.25→1.5.26) and `/sgs-update` (nav-menu
   `blocks` + `block_composition` rows, + a `roles.position` row) ALREADY LANDED this session.
4. **Gate C — FR-34-7:** 768 + 1440 sweeps · ESC + focus-return + Tab-wrap · elementFromPoint
   sweep vs the 10/10 baseline · frame sweep (anchor constant) · late-CSS A/B · two-default
   `sgs/nav-menu` uid-collision · short-viewport 50dvh floor · logged-in `#wpadminbar` probe ·
   **Bean's screenshot sign-off (R-31-13)**.
5. **Step 7 (Bean-ordered — do FRESH, it is the point of the exercise):**
   `/adversarial-council` on the shipped result **with a tech-illiterate-client UX rater** on
   the Site-Editor builder (Bean's bar: "super easy and user friendly"), AND **prove the
   Site-Editor→frontend round trip for BOTH header AND footer** — identify WHICH source
   actually loads: the theme part file, the DB template-part copy the first Site-Editor edit
   silently creates and which shadows the file thereafter, or the `sgs_header`/`sgs_footer` CPT
   rules engine. Header and footer are wired DIFFERENTLY (`parts/header.html` inlines its
   pattern; `parts/footer.html` references it) — test both, never extrapolate from one.

Then the standing queue (see `next-session-prompt.md`): SPLIT framework/per-site header/footer
→ Goal 4 (Mama's draft) → Goal 1 (Indus) → Goal 3 (de-hardcode base blocks).

## Notes for next session

- **A subagent's "verified clean" is a hypothesis** (STOP-16) — the council's CLEAN list held a
  falsified item. Re-verify anything load-bearing on the LIVE page.
- **Your own probe is a hypothesis too.** This session I: matched a CSS rule instead of an
  element; grabbed a disclosure button instead of the toggle; flagged a logo image for text
  contrast; called a Grep rendering artifact a CSS syntax error; inferred the wrong webpack
  branch; and asserted "full width" against `innerWidth` when a fixed element sizes to
  `clientWidth`. Every one was caught by re-measuring. Measure, then check the measurement.
- **Read a SETTLED value** — a 200ms `transition: color` produced two false readings.
- Gates all green at commit: dead-controls · F3 · control-UX · F5 · F6 · inline-styling (0/78)
  · cheat-gate · oracle 180. Canary deploys used `--skip-oldshape-audit` (Track B's new gate,
  not yet baselined for this branch).
- `MEMORY.md` is at its size cap — compact before adding entries.
