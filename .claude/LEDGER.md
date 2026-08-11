---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-11 (session 5). Two tracks ran in parallel; BOTH are finished and merged to `main`.**

- **The first migration pass is COMMITTED and pushed.** The per-device setting that used to be three
  separate settings (`gap`, `gapTablet`, `gapMobile`) is now ONE setting holding all three values,
  across **21 blocks**. It was stuck last session waiting on evidence; that is cleared.
- **Building that evidence found the pass had shipped broken, and had been live for a day.** It
  changed how the value is *stored* but never changed the *control that writes it*. On 19 of 21 blocks
  the Tablet and Mobile fields saved nothing, and the Desktop field **deleted the whole setting** when
  used. Fixed, and verified in the real editor. Why nobody saw it: last session's check set values by
  script, so it never touched the inspector — the surface where the bug lived.
- **A number quietly changed meaning too.** A bare `20` used to mean "spacing step 20" (8px); after the
  migration it emitted invalid CSS the browser threw away. You ruled a bare number means **px**. Three
  block defaults that relied on the old meaning are now explicit, and all three measured identical
  before and after.
- **You spotted the header and footer shells shouldn't have a gap at all.** Correct — and it was doing
  nothing either way. Removed, along with a stale mapping that would have pointed the cloning
  converter at an attribute that no longer exists.
- **The evidence is now a tool, not a chore.** Three committed scripts build a test page carrying every
  migrated block, measure it at three screen sizes before and after, and write one report per block
  from its own measurement. The generator **refuses** to produce a pass it cannot back up. Passes 2-6
  reuse it.
- **Phase 0 of the inspector programme is CLOSED** on the other track. Its best lesson: *fix the
  measuring instrument before working its list* — doing so removed more "work" than it created.
- **⚠ Not everything planned got done.** Passes 2 and 3, and the converter design decisions, were in
  this session's plan and were **not started**. They are the whole of next session.

**Earlier narrative:** newest snapshot is `memory/session-2026-08-08.md`; sessions 2-5 live in the
commit messages + `decisions.md` D546-D567.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D568**.

### ✅ PHASE 0 IS CLOSED — 2026-08-11

| What | Commit |
|---|---|
| 0b ruled + 0c corrected + §14 conformance measured (D560/D561) | `7c396b61` |
| 3 raw-`TextControl` radius boxes → `UnitControl` + `check-editor-only.py` (D562) | `9fda666f` |
| SGS commit gates version-controlled + 3 portability defects (D564) | `17e5bbf6` |
| **0d — `__experimental*` compat boundary, migrated + gated (D565)** | `5d84324b` |
| QC council on Phase 0 — 5 defects found + fixed (D566) | `dfaab961` |
| §14 residuals discharged: instrument fixed, then the work it mismeasured | `be5715d0` |
| Live-editor crash — 3 calls to the DELETED `ResponsiveSpacingPanel` (D567) | `0bcec27d` |

**All four Phase 0 items are done and §14 is 100% conformant.** 0a measured, 0b ruled, 0c closed (it
had already shipped), 0d built/migrated/gated. **Phase 4's Background item is UNBLOCKED.**

⭐ **The §14 residuals are DISCHARGED, not parked.** They had been deferred to a "Phase 3" containing
no border work (STOP-29 — a named-sounding deferral resolving to nothing). Final border census:
**4-CORNER 30/30 canonical · 0 no-control · 0 banned lookalikes · scalar radius 11 canonical · raw-CSS
border `TextControl` 3 → 0 · per-side scalars 0.**

⛔ **THE SINGLE MOST USEFUL LESSON: fix the instrument BEFORE working its list.**
`survey-box-controls.py` had **four** defects — counted matches inside COMMENTS, no ELEMENT BOUNDARY,
blind to controls in SHARED panel files, no canonical component declared for its scalar legs. Fixing
the tool first **removed more "work" than it created**: a 5-item wrong-shape backlog evaporated, 4 of
6 "missing controls" already existed, the missing-`units` gap was 2 not 8. Two real defects remained;
both fixed. Regression guards per defect (self-test 5 → 7).

### ✅ PASS 1 (`gap` → tier object, 21 blocks) — CLOSED 2026-08-11

| What | Commit |
|---|---|
| **Migration + control swap + bare-number rule + the evidence toolkit** | `fa638cea` |
| Header/footer shells: inert `gap` + its stale `css:gap` mapping REMOVED | `0cd1c314` |

**Record: D563.** **Evidence:** 21 per-block reports at `reports/visual-diff/*-2026-08-11.md`, each
citing its own measurement, plus the two shell reports.

⛔ **THREE FINDINGS THAT RECUR ON EVERY REMAINING PASS** — now items 0a-0d of the per-pass definition
of done. Read them there before pass 2:

1. **The CONTROL must migrate in the same commit as the storage.** `ContainerWrapperControls.js` —
   ONE shared file feeding 19 blocks — kept writing `gapTablet`/`gapMobile` after they were deleted.
   WordPress discards an undeclared attribute silently (D338); the desktop branch wrote a STRING into
   an object-typed attr, which coerces to the default and **destroys the setting**.
2. **The frontend is not the editor.** A programmatically-set value is already the right shape and
   never exercises the inspector. **Only opening the editor finds this class** — the same conclusion
   D567 reached independently the same day.
3. **A bare number means `px`, framework-wide** (Bean-ruled). Every LENGTH-valued entry added to the
   wrapper's object prop list must declare `unit_default`, or it emits `gap:20` — invalid CSS.

**Measured, re-derive rather than quote:** migration candidates **160 → 141** across 41 blocks ·
storage-shape gate **1 finding, baselined** (was 3; both `gap` entries cleared and REMOVED from the
baseline — it shrinks only) · live-editor check **PASS** (stores `{desktop,mobile}`, no flat siblings,
0 console errors).

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

### ⭐ NEXT — pass 3a, then 3b, then Wave 3

**Pass 2 is done. 3a/3b/Wave 3 remain.**

#### READING GATE — Spec 35 order. ⛔ Do NOT open Spec 31 end-to-end.

That rule is scoped to *cloning-pipeline* sessions; this is BLOCK-STANDARD work, so its precondition
does not hold and Spec 31 is ~195KB. Read Spec 31 only for converter work, targeted.

| # | Read | Why |
|---|---|---|
| 1 | **This file** | State + the plan below |
| 2 | **`plans/spec-35-flat-to-object-migration-design.md`** | **THE procedure. Read "Per-pass definition of done" items 0a-0d FIRST** — added after pass 1 shipped incomplete |
| 3 | `plans/spec-35-control-type-contract.md` **§12 field 3** | Storage-shape ↔ control-primitive pairing, with the measured incident |
| 4 | `decisions.md` **D563** (+ **D567**) | Pass 1's record; D567 is the same lesson from the other track |
| 5 | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` **PART M** | The standard's status; the rest is reference, not a cold read |
| 6 | `STOP-CATALOGUE.md` | Structural defences (uncapped, D101) |
| 7 | `~/.claude/plans/go-track-1b-playful-hamster.md` §Phase 1.6 | Programme scope + phase status — **not the entry point** |
| 8 | `plans/spec-39-seed-requirements.md` | **Wave 3 only** — do not front-load |

#### WAVE 2 — passes 2 and 3 *(SEQUENTIAL — same blocks; never parallel writers, STOP-39)*

```
python scripts/migrate-tier-object.py --property <p> --survey | --fix | --fix --apply | --check
```

**Pass 3 — `gridTemplateColumns` + `gridTemplateRows`.** `sgs/site-footer-row.gridTemplateColumns` is
the ONE finding the storage-shape gate still baselines — pass 3 takes it to **0**, its named promotion
trigger. **Wire `check-tier-storage-shape.py` into `prebuild` at that point.**

⛔ **Per pass, non-negotiable:**
- **Migrate the CONTROL in the same commit** (`ResponsiveControl` → `ResponsiveOverride`). Grep every
  writer across `edit.js`, `components/` AND `extensions/`. A shared component is the high-risk case.
- **Prove it in the LIVE EDITOR** — register, render, write, assert the stored shape, assert no flat
  siblings, assert 0 console errors.
- **Declare `unit_default`** for every length-valued property.
- **Use the evidence toolkit; do not hand-write reports.** `build-tier-fixture-page.py` →
  `capture-tier-fixture.py` → `make-visual-diff-reports.py`. Honest-edge flags: `--expect-change`,
  `--known-dead`, `--removed-attr`.
- Fix every direct `render.php` read (a string cast on an object emits `gap:Array`), migrate theme
  patterns in the same commit, bin canary pages holding the flat shape **with a backup first**.

**Worth doing first, pays for itself twice:** extend `migrate-tier-object.py` with `--fix-reads` to
propose the proven `render.php` pattern (`sgs_responsive_normalise_object()` + per-tier fallbacks).
Pass 1 needed 6 such edits by hand; passes 2-6 need dozens.

**Model:** codemod + design inline; per-block follow-ups Sonnet, ONE block at a time. **~1h per pass.**

#### WAVE 3 — Spec 39's design calls *(INLINE, Opus — do not delegate · ~1h)*

R1 object-only vs dual-shape · R2 tier vocabulary · R3 derived per-tier view vs migrating every
consumer. **R4 is already answered by D558** and goes in as an input.
⛔ **R5 — keep the BOX `{top,right,bottom,left}` and TIER `{desktop,tablet,mobile}` axes orthogonal.**
Conflating them made the storage-shape gate's first two rule attempts wrong.

⭐ **A pre-read is already done, and it changes the shape of the work.** Spec 39's R1 table points at
scattered per-resolver sites, but there is a **single choke point it never names** —
`converter/services/tier_suffix.py:46`, which every resolver funnels through via
`tier_suffix()`/`tier_state_suffix()`. It also misses a whole second path
(`converter/services/root_supports.py:596,637`, the native `style.*` lift). And
`converter/services/css_pass.py:211-255` merges with a **shallow `dict.update()`**, which would
overwrite a whole tier object rather than merge tiers — the concrete thing that breaks first.
⚠ R1's `fold_helpers.py` numbers have DRIFTED (`:262`→`:265`; `:291`/`:326`/`:352` now point at
unrelated code; the real construction site is `:416`).

#### Not in scope

Passes 4-6 (`columns` needs 3 pattern files updated in-commit; font-size families route through
`TypographyControls`, a different edit shape) · Phase 2.1 (gated on deriving its roster from real
`post_content`, D545) · Phase 3.2a — ⛔ its input has a **measured false-positive rate**; a decision,
not a build.

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
