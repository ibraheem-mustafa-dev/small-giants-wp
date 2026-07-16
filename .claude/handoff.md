---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-16
session: Phase 2 nav/logo fixes (D341/D342) + qc-council GO + 3-branch consolidation to main (a693e0e8) + dual-site deploy, both LIVE-VERIFIED
---

# Session Handoff — 2026-07-16 (Phase 2 ship + project-wide consolidation to `main`)

## Branch / state

`main` is now **`a693e0e8`**, pushed. Theme `1.5.38`. Everything below is LIVE on both
sandybrown (canary) and palestine-lives/Indus (production).

## DONE this session

**Phase 2 — two nav/logo bugs fixed + committed on `feat/adaptive-nav-dialog-drawer`:**

1. **`bd7fd5b0` — `sgs/responsive-logo`: removed the unshippable `auto` logo-switch mode.**
   A `/brainstorming` persona panel + `/research-buddies` pass both found the space-aware
   `auto` mode needed either a JS `ResizeObserver`-with-hysteresis or a flex-grow-container-
   query trick, AND it clashed with `sgs/adaptive-nav`'s existing "More" overflow menu (both
   wanted the flex leftover slot). Bean scrapped `auto` for an operator-chosen breakpoint:
   new `custom` mode + `logoSwitchCustomPx` (number, default 1024, RangeControl 320-2000);
   `logoSwitchMode` enum now `["mobile","tablet","custom"]`. Also fixed the image-switch tier
   (was 600/1024 → now 767/1023, matching `SGS_Breakpoints`). qc-inline PASSed (95/100).
2. **`65bd9cdd` — `sgs/adaptive-nav`: collapse tier now reads `SGS_Breakpoints`**
   (TABLET_MAX=1023/MOBILE_MAX=767) instead of hardcoded 768/1024/1280 (the 1280 was
   phantom); default `collapseTier` `mobile`→`tablet` (R-31-1/FR-S9-4). Fixes the burger not
   appearing in the 768-1023 tablet band. **Live-verified on both sites**: burger ≤1023,
   bar ≥1024, exact boundary correct.

**qc-council ship gate: GO.** 2 cross-perspective raters — a11y/live-break clean; only
finding was a 1-line `style.css` `Version` conflict on merge; recommended deploying from a
worktree to avoid the shared checkout's mid-edit `build-deploy.py`.

**Phase 2.5 — project-wide consolidation (DONE), via an isolated worktree:**

Merged 3 sources into `main`, pushed **`a693e0e8`**:
- `feat/adaptive-nav-dialog-drawer` (44 commits: Spec 34 disclosure drawer + the uimax-brain
  →council→fixes thread + D338 remnants + the Phase-2 fixes above)
- `feat/core-block-migration` (Track C, core→SGS migration, ~395 core blocks across the
  framework's safe zone)
- origin's docs-reconciliation commit `3cdb4b2f`

2 trivial conflicts resolved: theme `style.css` `Version`→1.5.38; `parking.md` kept the
branch's (ours) version. **Track B** (`feat/track-b-content-restore`, Indus page content)
stayed OUT/paused — its uncommitted working-tree edits + pre-existing dirt in the shared
checkout were left untouched.

Deployed canary (sandybrown) then production (palestine-lives/Indus) via the D336-hardened
`build-deploy.py` (fail-closed verify + `.bak` rollback) — **both PASS.**

## LIVE-VERIFIED after deploy (both sites unless noted)

- Bug 3 (burger-at-tablet): works on both sites.
- The rebuilt `sgs/nav-menu` drawer is now LIVE — the old self-rendered `__drawer-menu` is
  gone (the pre-deploy canary had been serving stale/DB-shadowed code).
- **Cart guard CONFIRMED LIVE on Indus:** Indus has no WooCommerce (`bodyHasWoo:false`) and
  the cart is correctly absent (this closes the verification the D337 cart report deferred).
- Drawer colours measured live: bg = `primary` `#e68a95` (not dark), focus mirrors base
  (black, `color:inherit` holds — no `primary-dark`), divider = subtle black-18% tint (not
  pink), underline + accent-yellow focus outline present. **Bean's earlier "dark pink/pink
  divider/primary-dark focus" complaint was the OLD (pre-rebuild) drawer** — now replaced.
  **Only refinement outstanding:** resting link text is `#000` vs Bean's stated preferred
  `text` token charcoal `#3a2e26`.
- **Pre-existing 9px horizontal overflow on Indus** at BOTH 1000px and 1440px
  (width-independent, so NOT the Phase-2 change; header is within bounds at 1425<1440).
  Source: the decorative `sgs-brand-strip` marquee (already `overflow:hidden` — root cause
  not yet found). Parked: `P-INDUS-BRANDSTRIP-OVERFLOW-9PX`.

## Deferred

The `custom` logo-switch mode + adaptive-nav tablet-tier fix shipped without their per-block
`reports/visual-diff/*.md` reports (STOP-67) — live-verification substituted this session.
Parked: `P-PHASE2-VISUAL-DIFF-REPORTS-DEFERRED`.

**Track B and Track C's scratch decision logs** (`.claude/scratch/track-{b,c}-decisions-
pending.md`, referenced by the prior session's next-session-prompt as holding TB-1..9 /
TC-1..34) were **not found in this worktree or in git history** at doc-update time — if they
exist on another branch/worktree, fold them into `decisions.md`/`parking.md` at the next
session; until then this is recorded as an open reconciliation item, not invented content.

## NEXT

1. **Phase 1 — small drawer polish:** resting link text → `text` token (charcoal `#3a2e26`);
   keep focus-mirrors-base + underline (already live-correct, do not touch).
2. **Phase 3 — finish Spec 34:** Step 5 drawer settings (FR-34-5), Step 6 reflection
   (FR-34-6, reconcile not redo), Gate C (FR-34-7), then Step 7 — a FRESH
   `/adversarial-council` + prove the Site-Editor→frontend round trip for BOTH header AND
   footer (they are wired differently — test both, never extrapolate from one).
3. **Goal 1 — Indus:** header/footer replication work, including the new 9px overflow.
4. Merge the Track B/C scratch decision logs into `decisions.md`/`parking.md` once located.

---

# Session Handoff — 2026-07-16 (Track C — core→SGS migration COMPLETE)

*Ran in the `../small-giants-wp-trackc` worktree, branch `feat/core-block-migration`. Separate from the D341/D342 session below (Track A).*

## Track C DONE — every core block with a real SGS replacement is now an SGS block

Safe-zone replaceable core blocks: **395 → 0** across the session. All live-verified on the sandybrown canary.

1. **Preset font-size gap CLOSED** (`9b3b5f2c`) — qc-council-gated; `sgs/heading`+`sgs/text` `fontSize` widened to `["number","string"]` so theme preset slugs render. Live 16/24px→14px.
2. **Migrated (all pairings, live-proven):** `core/image`→media (7), `core/heading`→heading (51), `core/paragraph`→text (121+4 bound), `core/button`→button (15)+`core/buttons`→multi-button (13), `core/latest-posts`→post-grid, `core/site-logo`→responsive-logo (3), `core/cover`→hero (1), `core/details`→**accordion** (5, retargeted from collapsible-text), `core/group`→container (96), `core/columns`+`core/column`→container (78).
3. **Buttons use the PRESET system** (`81131811`) — primary buttons → `inheritStyle:"primary"` (Mama's designed preset), not custom colours. Bean-corrected.
4. **New capabilities:** SGS **block bindings** (`8fe67eed`) so bound email/phone survive migration; **`tagName`** on `sgs/container` (D344, `5681ba21`) — a11y/SEO landmarks (`div/section/article/aside/main/nav/header/footer/figure`) + editor dropdown.
5. **`core/query` mapping DROPPED as not-real** (`dbfcc3b2`) — post-grid has no main-query inherit mode, so it can't replace the 3 archive/search/index `inherit:true` loops; removed `core/query`+`core/post-template` from `sgs/post-grid.replaces`. The 6 stay core (no real replacement, not a STOP violation).
6. **qc-council caught 2 of my errors** on the container pairing: a fix-shape that was already a no-op, and a "regression" that was a probe measuring the `__inner` not the outer — the migration was correct all along (STOP-19 rollback + prove-the-cause).
7. **`/sgs-update` reconciled the DB** — `tagName`, `fontSize` unions, details→accordion + post-grid maps; regenerated `02-SGS-BLOCKS-REFERENCE.md` (200 blocks / 2741 attrs).

**Migration infra** (`plugins/sgs-blocks/scripts/migrate-core-blocks/`): span-preserving parser + `driver.py` (DB-first pairing map, leaf-first re-parse, structural anti-silent-discard gate) + one module per pairing. Decisions log: `.claude/scratch/track-c-decisions-pending.md` (TC-1..TC-34).

**Left for follow-up:** 187 Track-A hands-off instances (header/footer/mega-menu) — migrate after Track A's rebuild lands. `feat/core-block-migration` is unmerged in the worktree.

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

---

## 2026-07-16 — PARALLEL THREAD (uimax brain → adversarial-council → fixes), same branch

*A second workstream ran on `feat/adaptive-nav-dialog-drawer` alongside the Spec 34 work above.
Its commits: `6b9e4831`, `bacc0375`, `8779c3f8`, `8a8b3d94`, `01f88b57` (+ spec-17 edits that
landed via the Spec 34 session's `8a561e42`). All pushed to PR #23.*

**1. `/ui-ux-pro-max` now authors SGS-BEM drafts (the design brain).** Added a DB-generated
vocabulary (`sgs-draft-vocabulary.md`, regenerated by `/sgs-update`), an authoring contract
(`sgs-draft-authoring.md`), a queryable `sgs-wordpress` stack, and `draft-vocab-lint.py`. Fixed
its dead HARD RULE (dead specs 13/15, wrong regex). *(Skill files live in `~/.agents/` — not in
git, no commit.)*

**2. Found + fixed a total outage in the brain's search.** Every `/ui-ux-pro-max` domain query
had returned ZERO results for its whole life — a column-name casing mismatch (`CSV_CONFIG` +
`_STACK_COLS` used Title-Case; the CSVs are snake_case). **4,994 curated rows were unreachable.**
Fixed at the seam (normalise both sides) so re-casing can't recur.

**3. 7-persona adversarial-council on Spec 17 + Spec 33 Part 1** (judged vs uimax-as-the-brain).
Convergent findings, all now actioned: the D339 "87 of 95" note was arithmetically wrong (4/7
personas — it's 78); §S8 dead-spec presented as live for 445 lines; FR-S9-5 specced the deleted
`sgs/mobile-nav`; the opening-paragraph Customiser classes are fiction. All corrected via a
fail-loud anchored script (`migrations/2026-07-16-fix-spec-drift.py`).

**4. Ghost blocks killed — the Cynic's worst finding, confirmed live.** `build/blocks/{header,
footer,mobile-nav,mobile-nav-toggle}` still REGISTERED `sgs/header`/`sgs/footer` on every deploy
(gitignored → invisible to git; absent from DB → invisible to `/sgs-db`; tar-deploy never
deletes). Deleted locally AND on palestine-lives.org (backed up, OPcache reset). `clean:build`
now runs first in prebuild + a plant-tested ghost gate in postbuild → impossible by construction.

**5. New gate `lints/lint-spec-drift.py`** — checks every `src/blocks/<x>/`, `Sgs_<Class>`,
`sgs/<slug>` a spec names against the filesystem + DB. Drove 15 gating spec-drift findings → 0.
BLOCK-SLUG is advisory (the `sgs/` namespace covers blocks + patterns + binding sources).

**6. qc-council (Stages 0-8) on 3 problem sets → all closed, empirically gated:**
   - **7 red converter tests → 0 (449 passed).** Root cause: a PARTIAL DB reseed left
     `role='tag-identity'`, `role='icon-%'`, and `emit_shape` unseeded. A FULL `/sgs-update`
     repaired it; testimonial `quote`/`reviewerName` needed targeted overrides (two different
     gates: one needs a role, one needs a selector). The council FALSIFIED the "universal seeder
     fix" — it would have made `sgs/button.url` take the button's label text as its href.
   - **Stage 11 exit-1-but-reported-ok → fixed.** Stale roster entry (`sgs/mobile-nav`) +
     a summary printer that never read `result['status']` (reported "ok" for warned/retired
     stages — the same silent-degradation class that hid the partial reseed).
   - **15 spec-drift findings → 0.** 13 the spec's fault, 2 the gate's; zero code changes.

**7. 3 client-facing safety fixes — QC'd 21/21, SHIP:** brand clobber (`push-theme-snapshot.py`
now value-level diff — was key-set, so a client's colour edit got silently overwritten); the
"retired" seeder hook was still armed (an ordinary Site Editor Save could wipe a header/footer);
empty Site Info hints rendered to PUBLIC customers (now operator-context-only). Committed
`8779c3f8`; docs reconciled `8a8b3d94`.

**8. FR-31-2.1a closure DECISION (Bean-delegated) — do NOT flip the reader in one shot.** The
seeder derives `role` from an attr-NAME regex (an FR-31-2.1a violation) but produces correct
roles today. A naive flip regresses 9 load-bearing attrs. **Key ground-truth catch:** block.json
`"role":"content"` is WP 7.0's `contentOnly` pattern-editability marker, NOT the converter
vocabulary — it must stay `content` or client pattern-editing breaks; the converter role needs a
separate SGS-owned channel. Sequenced closure + tracking audit
(`audit-declared-vs-seeded-roles.py`) recorded: Spec 31 FR-31-2.1a note + parking
`P-FR-31-2.1A-CLOSURE`. Committed `01f88b57`.

**Convergent lesson with the Spec 34 thread above:** both workstreams independently learned *"your
own probe is a hypothesis"* — this thread produced 4 phantom measurements (0 sections, zero-h1,
`quote:['\\']`, a false clause-(e) violation), each caught by re-measuring. Captured as memory
`check-what-the-declaration-says-before-citing-the-rule` + `retract-the-content-not-just-the-label`
+ `docs-are-the-system-gate-them-like-code`.

**Still open (logged, not Bean-blocking):** FR-31-2.1a flip (own design gate); Spec 18 D-number
staleness; a few doc-staleness items in archived plans (deliberately not touched).
