---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-11 (session 6). Two more per-device settings migrated and shipped. Four commits, pushed.**

- **`maxWidth` + `contentWidth` (pass 2) and `gridTemplateColumns` (pass 3a) are done** — 37
  migrations across 30 block-slots. The setting that used to be three separate values is now one, and
  the control that writes it moved in the same commit, which is what pass 1 got wrong.
- **The thing that measures our work was broken, and had been the whole time.** It asked the browser
  for the wrong property name and got back a blank answer — indistinguishable from "this block has
  no value". Pass 1 never noticed because `gap` is the one setting whose name it happened to ask
  correctly. **Without one check we already had, pass 2 would have shipped 15 confident "all clear"
  reports built on 90 blank readings.**
- **Two grids were silently deleted, then put back.** One line treated "setting exists but is empty"
  as "setting is in use", switching off the column layout on the gallery and the feature grid.
  Nothing errored. Caught only by comparing against how they looked before.
- **The editor crashed, and only opening the editor found it.** Every automated check was green.
- **You were right about the site header and footer.** They are empty shells that house rows, and the
  test tool refused to test their rows because it wanted the shell to have a setting the shell will
  never have. That was the tool's mistake, and I repeated it back to you without checking. Fixed —
  it would have blocked evidence on every remaining pass.
- **⚠ You called the process too slow, and you are right.** The plan to fix it is in NEXT SESSION
  below. Short version: we are doing the same migration 20+ times by hand, and verifying it in the
  most expensive way available.

**Earlier narrative:** `memory/session-2026-08-08.md`; sessions 2-6 in commit messages +
`decisions.md` D546-D569.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D569**.

### ✅ PASS 2 (`maxWidth` + `contentWidth`, 11 blocks) — CLOSED 2026-08-11

**Record: D568.** 18 migrations / 11 distinct blocks. Control migrated in the SAME commit
(`ContainerWrapperControls.js` feeds **24** blocks) and **proven through the real inspector control
in the live editor**, not programmatically — desktop stores `{desktop:"456px"}`, the global device
toggle on Tablet stores `{tablet:"789px"}`, zero flat siblings, no new console errors. Both halves of
D563 closed by measurement. **Evidence:** 11 reports at `reports/visual-diff/*-2026-08-11.md`.

⛔ **THE MEASURING INSTRUMENT WAS BLIND AND ONLY THE POSITIVE CONTROL CAUGHT IT.**
`capture-tier-fixture.py` passed the ATTRIBUTE name to `getPropertyValue()`, which needs the
HYPHENATED CSS name and returns `''` otherwise — silently. Every `maxWidth` reading was blank. It
survived pass 1 only because `gap`'s attribute and CSS names are identical. Without the positive
control this pass would have emitted **15 confident "nothing moved" reports off 90 blank readings**.
Fixed + `--self-test` (7 cases, negative controls, proven able to fail). **Passes 3a-6 depend on it.**

**Three things the plan did not predict, all now closed:**
1. **49 scalar values in 33 THEME files** — `patterns/` + `templates/` + `parts/`. The survey checked
   `patterns/` only, and only for orphan SIBLINGS, never a BASE attr whose shape stopped matching.
   `check-dead-pattern-attrs.py` failed the build and named all 49.
2. **`responsive-logo` lost its cap with NO warning** — `sgs_responsive_css_rule()`'s gate is
   `$transform || is_numeric()`; an array fails it and the declaration just vanishes.
3. **`unit_default` on the wrapper's `maxWidth` entry would be INERT** — the atom formatter returns
   early when a transform is set. The bare-number→px rule lives in the transform instead.

⚠ **Carried, NOT introduced by pass 2:** `sgs/hero`, `sgs/site-header`, `sgs/site-footer` declare a
`maxWidth` control that renders NOTHING — no scoped rule in the browser CSSOM before or after, zero
`maxWidth` references in their own `render.php`. Recorded per block via `--known-dead`. Composite-
mirror capability gap; needs a Rule 7 design gate, not a migration edit.

⚠ **Report filenames are `{block}-{date}.md` and the commit gate hardcodes that** — a second pass the
same day REPLACES the first's file. Pass 1's reports live at `fa638cea`; the file is a per-day
artefact tied to the staged `source_sha`. Know this before 3a/3b run today.

### ✅ PASS 3a (`gridTemplateColumns`, 19 targets) — CLOSED 2026-08-11

**Record: D569.** Controls migrated in the same commit; 15 theme values folded (siblings merged INTO
the object, so the mobile single-column collapse survived). **The storage-shape gate reached 0 and is
WIRED INTO `prebuild`** — promotion trigger met, and proven able to fail on the real tree
(inject → exit 1 → revert → byte-identical). **Live editor: Mobile tier stores `{mobile:"1fr 2fr"}`,
no flat siblings, 0 console errors.** Evidence: 17 reports at `reports/visual-diff/*-2026-08-11.md`.

⛔ **Three defects it caught that NO static gate could:**
1. **`is_array()` is TRUE for an unset object attr** (`{}` → `array()`), so the wrapper's object-grid
   flag flipped on for every container-query block and DELETED their grids — gallery 3 cols → 1,
   feature-grid 4 → 2. The design doc warned about this trap for NEW guards; this was an EXISTING one.
2. `feature-grid/render.php` `trim((string)$attr)` → `"Array"`, non-empty, suppressing auto-flex.
3. **Editor crash** — `container/edit.js` `gridTemplateColumns?.trim()` → `TypeError`. Same class as
   D567. Every gate green throughout.

⛔ **CARRIED — a LIVE pass-1 residue, editor-preview only, NOT fixed:** `gap` is object-typed on
feature-grid / gallery / trust-bar but their previews still do `String(gap)` and hand the OBJECT to a
React style value. Sites: `feature-grid/edit.js:78`, `gallery/edit.js:264,295`, `trust-bar/edit.js:49`.

### ⭐ NEXT SESSION — Bean-directed 2026-08-11. READ THIS WHOLE SECTION FIRST.

**Bean's brief:** finish this session's leftovers, then review progress and rework the master plan so
Spec 35 lands in **as short a time as possible**, folding in what the work itself taught us. **He
does not have days for foundational uniformity work** — it is not what earns; the cloning pipeline
is. Treat speed as a requirement, not a preference.

#### PART A — finish the leftovers (do first, ~45 min total)

**A1. Review the uncommitted report-generator change.**
`plugins/sgs-blocks/scripts/make-visual-diff-reports.py` is MODIFIED and UNCOMMITTED (~660
insertions). A subagent trimmed it (collapse unchanged blocks into one summary; auto-derive
"inapplicable" from measured `display`). Its own 14-assertion `--self-test` passes. **It was NOT
independently verified** — the main thread ran out of context: one negative control failed to
apply, and the real-data runs were inconclusive because nothing was staged, so `source_sha` failures
swamped the result.
⛔ **Verify before committing.** This is the script that caught the blind instrument. Confirm
specifically: a non-binding probe still FAILS; a changed value with no reason still FAILS; a summary
row carries ITS OWN numbers. ⚠ **Design concern to weigh, not merely test:** auto-deriving
"inapplicable" removes the moment a human would ask *"why is this block flex when it should be
grid?"*.

**A2. Pass 3b — `gridTemplateRows`, 19 blocks.** The only remaining pass needing NEW plumbing
first: `class-sgs-container-wrapper.php:569` has NO `is_array()` guard (every neighbour does), and
there is no object emission path. Both are one-line additions — add
`'gridTemplateRows' => 'grid-template-rows'` to the prop map at ~`:2141`, reusing the
`sgs_sanitize_grid_template` transform branch already written for `gridAutoRows`.

**A3. The `gap` editor-preview residue — LIVE since pass 1.** `gap` is object-typed on
feature-grid / gallery / trust-bar, but their previews still do `String(gap)` and hand the OBJECT to
a React style value. `feature-grid/edit.js:78`, `gallery/edit.js:264,295`, `trust-bar/edit.js:49`.
**Do A2 + A3 in ONE build/deploy/capture cycle** — file-disjoint, and the canary is the bottleneck.

#### PART B — rework the plan for SPEED (the main event)

Target: `~/.claude/plans/go-track-1b-playful-hamster.md` §Phase 1.6 and its estimates.

**B1. Make the migration mechanical (Bean's proposal, endorsed).** We were hand-repeating one edit
20+ times. Classify the SHAPES, then write one codemod per shape — **S1 and S2 DONE (D571,
2026-08-11), S3 deliberately stays manual, S4 still open**:
- **S1** flat trio → object in `block.json` — `migrate-tier-object.py --fix --apply` does this,
  full triad (`--survey`/`--fix`/`--check`).
- **S2** `ResponsiveControl` + attrMap → `ResponsiveOverride` in `edit.js` — **NOW AUTOMATED
  (D571).** `migrate-tier-object.py --survey` classifies every block's control as
  SHARED/OVERRIDDEN/LEGACY/NONE/UNCLEAR; `--fix --apply` rewrites `LEGACY` blocks, proven against
  two real historical examples (`ContainerWrapperControls.js`, `site-footer-row/edit.js`, both
  pre-fix) and self-tested (14 assertions, `--self-test`). Refuses on anything not matching the
  exact known shape.
- **S3** `render.php` scalar read → `sgs_responsive_normalise_object()` — **detect-only, ON
  PURPOSE, not a gap to close.** `--survey` classifies DELEGATED/NORMALISED/RAW/UNCLEAR, but there
  is no `--fix`: what matters is what the surrounding code DOES with the value afterwards
  (`trim()`? cast? `is_array()`?) — exactly where D569/D570's real regressions lived. Auto-writing
  this risks reintroducing that exact bug class. Stays a flagged judgement call.
- **S4** theme pattern/template scalar → object, folding orphan siblings in — **NOW PROMOTED
  (D571).** `scripts/migrate-theme-tier-scalars.py`, full triad, proven against REAL git history
  (replays pass 3a's actual commit `7b272d81` byte-for-byte, not an invented fixture) rather than
  gridTemplateRows's own (empty) instances. Caught a real bug in the process: a scalar `prop` in
  theme JSON is only a migration target when the block's OWN block.json has already moved that
  attr to `"type":"object"` — without that gate it reported 7 false findings on `sgs/nav-menu`'s
  `gap` (never tiered, plain string, would have been silently discarded by WP if folded).
⭐ Full documentation of the triad + why S3 stays manual: `plugins/sgs-blocks/CLAUDE.md` §"Tier-
object migration triad".

**B2. Golden-shape comparison instead of before/after (Bean's proposal — endorsed WITH one
correction).** We now know what a correct migration looks like, so most of it can be asserted
STATICALLY per block, with no deploy and no browser: object-typed attr, zero flat siblings, zero flat
writers across `edit.js`/`components/`/`extensions/`, `ResponsiveOverride` mounted, normaliser used
in `render.php`.
⛔ **The correction, from measured evidence:** a static golden-shape check would NOT have caught
this session's two real regressions. Both came from a SHARED code path reacting to the new shape
(`is_array()` on an empty object), not from any block's own structure. So the shape is: **static
golden check per block (fast, no deploy) + ONE end-to-end rendering probe per pass for the shared
wrapper + the live-editor check.** That collapses ~19 measure/report cycles into 1, keeps the two
checks that actually caught things, and drops the three-deploy stash dance entirely.

**B3. Re-estimate honestly.** Current plan estimates are inflated to the point of being misleading.
**Measured today: 2 full passes + 4 commits + 3 instrument fixes in ONE session.** With B1+B2 a pass
should be ~15-20 min, not hours. Re-baseline every remaining estimate against that.

**B4. Re-scope what is actually needed.** 4 property families remain (`gridTemplateRows`, `columns`,
the font-size families, the long tail). Ask per family whether it needs migrating AT ALL to reach
Spec 35's goal, or whether it is uniformity for its own sake. Bean's constraint makes that a real
question, not a rhetorical one.

#### Orchestration

| Task | Execution | Model | Depends on | QC gate |
|---|---|---|---|---|
| A1 verify generator | inline (Opus) — it guards everything else | — | none | self-test + real data |
| A2+A3 one cycle | inline (Opus); per-block edits may go Sonnet | `/delegate` | A1 | live editor + 1 render probe |
| B1 codemods S2/S3/S4 | delegated, parallel per shape | Sonnet | A2 (proves the shape) | `--self-test`, proven able to fail |
| B2 golden-shape checker | delegated | Sonnet | B1 | must fail on an injected violation |
| B3+B4 plan rework | inline (Opus), `/strategic-plan` | — | B1+B2 | Bean sign-off |

```
A1 -> A2+A3 (one deploy) -> B1 (3 parallel codemods) -> B2 -> B3+B4 -> Bean
```

⛔ **Passes stay SEQUENTIAL; the canary is the bottleneck** — one deploy target, one build. Never
two agents deploying at once (STOP-39).

### Methodology guardrails (earned; do not skip)

- ⛔ **Verify the EFFECT landed, not the exit code.** Two silent failures, both producing
  perfect-looking output: a deploy that **aborted** on a missing build dir (the capture that followed
  looked identical — which is what a correct result looks like), and a **`git stash` that reported
  success while dropping the change** (the follow-up diff looked right because line-ending churn
  masked the missing 5 lines). Fetch the deployed artefact; diff with `--ignore-cr-at-eol`.
- ⛔ **A survey leg is a candidate list, not a defect list**, and **fix the instrument before working
  its list**. §14's census named 5 violations; 2 were comment-match false positives, corrected before
  any edit ran.
- ⛔ **A codemod must check its own output.** The 0d transform shredded a comma-bearing comment into a
  SyntaxError; every string assertion passed on the broken version. `--fix` now refuses to write what
  `@babel/parser` cannot read back.
- ⛔ **Gate results are unreliable while another session is writing.** A build failure chased for
  ~20 minutes was the other track mid-edit on a lint baseline; it went green on its own.
- ⛔ **On a shared `main`, re-run the D-ceiling command IMMEDIATELY before writing an entry**, not at
  the start of the work — a D-number collision happened this session and forced a renumber.
- ⛔ **`supports.anchor` ≠ honouring it.** WP applies it only via `get_block_wrapper_attributes()`;
  blocks that hand-build their wrapper drop it silently. Fixtures wrap each instance in an anchored
  `sgs/container` and select its child.
- ⛔ **Scope every DOM query.** The fixture page carried **8** `.wp-block-sgs-site-header` elements,
  because the real site header renders there too.
- ⛔ **Never dispatch an agent onto a file the main thread is editing.** `php -l` passes on undefined
  variables — for a rename the check is "zero occurrences of the old name".
- ⛔ **A `⛔ Open` in a decision entry has a shelf life.** Close it in the commit that closes the code,
  or it becomes a false blocker (0c cost a planned session).
- **A match inside a comment is not a usage.** **Check what a number DESCRIBES before quoting it.**
  **Run any cleanup twice; the second run must report zero/unchanged.**
- **Full STOP catalogue + pre-flight ritual: `STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main`, pushed. ⛔ **Do not trust this line for tree state — run `git status`.** Commit
  by EXACT PATH: a pre-commit gate REQUIRES a pathspec (co-active sessions share `main`), and the
  visual-diff gate REJECTS a report whose `source_sha` describes a previous change.
- **Working tree:** no stashes, no extra worktrees. Everything this session produced — code, the 21+2
  visual-diff reports, and this documentation pass — is COMMITTED and pushed.
  **One file is untracked, deliberately:** `.claude/Border Example HTML.html` (Bean's reference
  markup). It is not part of any track and should not be committed.
  ⚠ An earlier draft of this line asserted a clean tree while seven doc files, including this one,
  were still uncommitted — the handoff QC caught it. **A status doc claiming its own cleanliness is
  the one claim it cannot verify about itself; confirm with `git status` at read time.**
- **⚠ Line endings:** several `block.json` blobs are stored CRLF while the repo declares `eol: lf`, so
  ANY edit normalises the whole file and the diff looks enormous. Read the real change with
  `git diff --ignore-cr-at-eol`. Pre-existing debt, not damage.
- **Baselines, safe to cite:** storage-shape gate **1** (baselined) · migration candidates **141 / 41
  blocks**. ⚠ **The inspector-scan JSON key is `rules[].findings`, NOT `results[]`.** A previous
  handoff asserted the opposite; reading it that way returns nothing and looks clean. Verified
  2026-08-11 against the live file.
- **DB:** snapshot at `~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-10-pre-T0-classifier`.
  ⚠ `~/.claude/skills/...` is a junction to the SAME file — verify with `os.path.samefile`.
- **Build:** `npm run build` exit 0, all gates green. `db-consistency --check` exit 0.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com, holding current `main`. ⚠ **11 WP
  installs share that server** — always name the full path, never glob. Credentials
  `.claude/secrets/sandybrown.env` (always available; do not ask).
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **THE procedure for the next passes** | `plans/spec-35-flat-to-object-migration-design.md` |
| **THE GOVERNING SPEC for this track** | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` |
| Programme scope + phases (NOT the entry point) | `~/.claude/plans/go-track-1b-playful-hamster.md` |
| Decisions (D-numbered) | `decisions.md` — D560-D567 are this session |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- **None.** Pass 1's evidence gate is cleared, Phase 0 is closed, both tracks are merged. Wave 2 can
  start cold.

## Open — carried, not ours to close

- **The two pre-commit hooks are still unreconciled.** The enforcing hook was untracked (D562) and is
  now version-controlled (D564), but reconciling `.git/hooks/pre-commit` with `.githooks/pre-commit`
  is a shared-mechanism change needing its own design gate. ⛔ Do not `cp` one over the other.
- **`sgs/site-header` / `sgs/site-footer`** — `gap` removed; **no other inert attributes were audited**
  on those shells. If more exist, they are the same class.
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had a
  value. Needs its own design; ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation toggle;
  needs its own design gate. Not started.
- **blub :5050 is DOWN** (HTTP 000) — re-POST pending lessons to `/api/learning`.
