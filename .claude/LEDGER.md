---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-11 (session 5) left things — Phase 0 is COMPLETE:**

- **Most of what was "open" was already finished.** Of the three open Phase 0 questions, one had been
  answered by code **two days earlier** while the notes still called it a blocker holding up a whole
  later phase. That phase is now unblocked, and I'd planned a session to redo work that was already
  done. The lesson is written down: a note saying "still open" needs closing in the same breath as
  the code that closes it.
- **The border question answered itself with a measurement.** Rounded corners already work per-device
  on 12 blocks. Border *thickness* doesn't — and nothing in the entire product has ever asked for it.
  So it stays desktop-only, and because the shared machinery already supports it, changing our mind
  later is cheap. That's recorded so nobody re-opens it.
- **Three settings that let you type any text into a "corner radius" box are now proper controls**
  with a number and a unit picker. One of them defaulted to "50%" to make a circle — worth noting
  because a careless fix would have quietly removed that.
- **I was told to fix five and fixed three.** The other two were the tool being wrong, not the code:
  it had matched an attribute name mentioned in a *comment* and blamed the nearest control. I checked
  each one by reading it before changing anything. That same tool feeds another planned task, which
  is exactly why that task is a decision rather than a job.
- **The safety checks now exist for everyone, not just this machine.** The visual check, the secrets
  scanner and four others lived only in an uncommitted file here — anyone else cloning the project got
  none of them. Now committed. Reading them across turned up **three faults that only ever hurt other
  machines**, the worst being a check that would have reported PASS on a genuine failure. Fixed.
- **The last Phase 0 item is done.** Every WordPress building block this project borrows is marked
  "experimental" by WordPress — meaning they can rename or delete it without warning, which would have
  broken 50 files at once. All 115 uses now go through one small file, so that becomes a one-line fix.
- **My own tool caught my own miscount.** I'd counted 47 files by hand; the tool found 50. And the
  first version of the tool damaged a comment while rewriting a file — caught by the build, fixed, and
  the tool now refuses to save anything it can't read back.

**Where 2026-08-11 (session 4) left things:**

- **The first real migration pass is DONE and working on the live site.** A per-device setting used to
  be three separate settings (`gap`, `gapTablet`, `gapMobile`). It is now ONE setting holding all three
  values, across **21 blocks**. Proven live: a block set to 64px on desktop and 8px on mobile renders
  exactly that.
- **It is not committed yet.** A safety gate wants a before/after screenshot report for each of the 21
  blocks, and I have one real capture, not 21. Writing 21 reports off one capture is the exact
  fabrication that gate exists to stop, so I stopped. **That is the first job next session**, and it is
  mostly a scripting job — build one page carrying all 21 blocks, capture it once, generate the reports.
- **You were right that blocks shouldn't have to opt in.** Per-device values now work on every block
  automatically. Before today a block had to declare a flag or the shared code ignored its per-device
  values entirely — which would have left about 15 blocks with **no gap at all, silently**. Fixed. The
  flag still exists but only for a separate feature (letting a block respond to its own width), and it
  is renamed so nobody mistakes it for the general one again.
- **A real bug was found and fixed in the hero block**: two different settings were both writing the
  image height to the same element, so cloning a hero picked a winner at random or errored. One was
  added earlier the same day and couldn't have known, because the data that would have shown the clash
  was months stale.
- **That stale data is now refreshed automatically.** A classifier that had to be run by hand — and
  evidently hadn't been for a long time — is now wired into the update pipeline. It immediately
  surfaced 7 dead database rows and 2 real bugs, and the health check went from **failing to passing**.
- **I made two mistakes worth knowing about.** I sent a helper agent to edit a file I was still editing
  myself, and it left that file half-renamed — briefly deployed. And I twice reported a measurement that
  was of the wrong thing (the wrong website, then the wrong page element). Both were caught by checks,
  not by me. Written into the guardrails.

**Earlier narrative:** newest snapshot on disk is `memory/session-2026-08-08.md`; sessions 2-4 are
recorded in the commit messages + `decisions.md` D546-D559.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D565**.

### ✅ PHASE 0 IS CLOSED — 2026-08-11 session 5

| What | Commit |
|---|---|
| 0b ruled + 0c corrected + §14 conformance measured (D560/D561) | `7c396b61` |
| 3 raw-`TextControl` radius boxes → `UnitControl` + `check-editor-only.py` (D562) | `9fda666f` |
| SGS commit gates version-controlled + 3 portability defects (D564) | `17e5bbf6` |
| **0d — `__experimental*` compat boundary, migrated + gated (D565)** | `5d84324b` |

**All four Phase 0 items are done.** 0a measured, 0b ruled, 0c closed (it had already shipped), 0d
built, migrated and gated. Phase 4's Background item is UNBLOCKED.

⛔ **A D-NUMBER COLLISION HAPPENED — read this before assuming numbering is safe.** A co-active
session took **D563** for pass 1 while this work was in flight, so the hook restructure became D564
and 0d became D565, and every in-code citation had to be renumbered. **On a shared `main`, re-run the
D-ceiling command immediately before writing an entry, not at the start of the work.**

### Phase 0 detail — the two measurement lessons

⛔ **A survey leg is a candidate list, not a defect list.** §14's census named 5 violations; **2 were
false positives** of the comment-match class (`button`, `product-card` — both already canonical, the
scanner having attributed an attribute name from a nearby *comment* to the next control it saw). The
approved scope was "fix the 5" and was corrected to 3 *before* any edit ran. Same defect already known
in the LENGTH survey — which is why 3.2a is a decision, not a build.

⛔ **A `⛔ Open` in a decision entry has a shelf life.** Close it in the commit that closes the code, or
it becomes a false blocker that costs a planned session (0c cost one).

⛔ **A codemod must check its own output.** The 0d transform split an import on commas and shredded a
comma-bearing comment into bare code — a SyntaxError written to disk, caught only by the build. `--fix`
now refuses to write anything `@babel/parser` cannot read back, and a regression fixture asserts the
output PARSES; every string assertion had passed on the broken version.

### Shipped 2026-08-11 session 4

| What | Commit |
|---|---|
| Two migration gates + classifier wiring + re-runnable census | `e86dbd04` |
| `sgs/hero` split-image height de-duplication (+ real before/after capture) | `fe7c5fed` |
| P2 — fossil `css_tier` cleared on collapsed tier objects, 4 controls | `b14b2fa6` |
| `migrate-tier-object.py` — the property-by-property codemod | `b57b4482` |
| **Pass 1 (`gap`, 21 blocks) + wrapper ungate + flag rename** | ⚠ **UNCOMMITTED** |

**Measured outcomes:** `db-consistency` **failing (7 findings) → exit 0** · routing coverage
**1,039 → 1,132** attrs · 94 stale orphan rows pruned (3,196 → 3,102) · storage-shape gate
**3 findings → 1**. ⚠ The coverage figure was first written as 1,136 — measured BEFORE the hero
de-duplication removed further attrs. Re-derived against the session-start snapshot at handoff.
**Re-derive it, do not quote this line.**

### ⭐ NEXT SESSION — ORCHESTRATION PLAN

**Full plan (read this first): `plans/2026-08-11-track-1b-next-session.md`.**

#### State recap, plain English

`gap` is migrated across 21 blocks, deployed and verified, but **uncommitted** — the visual-diff gate
needs one report per block. Two more property passes follow (widths, then the grid pair), and they
should be much cheaper: the codemod exists, the wrapper handles the new shape universally, and the
traps are written down. Then the cloning converter, which still emits the OLD shape — that is Spec 39,
still a SEED with three open design decisions.

#### WAVE 1 — four tracks, fully parallel, file-disjoint

**T1 — Unblock the pass-1 commit.** *(INLINE + script · 40 min · THE blocker)*
Build ONE canary page carrying all 21 migrated blocks, capture once at 1440/900/390, then write
`scripts/make-visual-diff-reports.py` to emit one report per block citing **its own** measured element.
⛔ Do NOT write 21 reports off one block's capture — that is the fabrication the gate exists to stop.
**The script is the deliverable**, reusable for passes 2-6. **Acceptance:** gate passes, commit lands.

**T2 — The clone-output gate.** *(DELEGATE · Sonnet · file-disjoint · 45 min)*
Fail a clone run emitting a flat tier for an already-migrated property (ruling C). Slot is precedented:
`sgs-clone-orchestrator.py:2053` writes `extract.json`; the R-31-15 gate runs there (`:70`,
~`:2645-2670`, `--skip-stage-gate` at `:2404`). ⛔ **Needs a POSITIVE CONTROL** — `gap` is now migrated
so, unlike last session, one can finally exist. **/qc gate after:** `/qc-inline`.

**T3 — Compact `MEMORY.md`.** *(DELEGATE · Haiku · pure mechanical · 15 min)*
At **24,531 of 24,576 bytes** — past the cap it truncates silently and rules stop loading. **Archive,
do not trim**: move older entries verbatim to `MEMORY-archive.md`, keep one-line pointers. Target
≤ 20,000. **Acceptance:** `handoff-preflight.py --check` passes; nothing lost, only moved.

**T4 — Spec 39 pre-reads.** *(DELEGATE · Sonnet · READ-ONLY · 25 min)*
Its own R6a names two: `route_area_css_to_block_attrs` docstring (GRID_AREA may be half-solved) and
`css_pass.py:211-255` (merge order). Also re-verify R1's file/line table against current `main` — it
was captured 2026-08-10 and this session moved code. Report drift, change nothing.

#### WAVE 2 — passes 2 and 3 *(SEQUENTIAL — same blocks; STOP-39)*

```
python scripts/migrate-tier-object.py --property <p> --survey | --fix | --fix --apply | --check
```
**Pass 2 — `maxWidth` + `contentWidth`** (already object on 3 blocks; centring defect closed at
`1979c419`). **Pass 3 — `gridTemplateColumns` + `Rows`** → takes the P1 gate to **0**, its named
promotion trigger: **wire `check-tier-storage-shape.py` into `prebuild` at that point.**

**Do first, pays for itself twice:** extend the codemod with `--fix-reads` to propose the proven
`render.php` pattern (`sgs_responsive_normalise_object()` + per-tier fallbacks). Pass 1 needed 6 such
edits by hand; passes 2-6 will need dozens. ⛔ Per pass: fix every direct read (a string cast on an
object emits `gap:Array`), migrate the theme patterns in the same commit (16 in 14 files during pass
1), and bin canary pages holding the flat shape **with a backup first** — `oldshape-audit` blocks the
deploy until they are gone, which is the gate working.
**Model:** codemod inline; per-block follow-ups **Sonnet, ONE block at a time**. **1h per pass.**

#### WAVE 3 — Spec 39's design calls *(INLINE, Opus — do not delegate · 1h)*

R1 object-only vs dual-shape · R2 tier vocabulary · R3 derived per-tier view vs migrating every
consumer. **R4 is already answered by this session's P2** (D558) and goes in as an input.
⛔ **R5 — keep the BOX `{top,right,bottom,left}` and TIER `{desktop,tablet,mobile}` axes orthogonal.**
Conflating them made the P1 gate's first two rule attempts wrong.

#### Dependency graph

```
WAVE 1 (parallel, file-disjoint):  T1 [inline] · T2 [sonnet] · T3 [haiku] · T4 [sonnet, read-only]
        ↓ T1 must land before Wave 2 — do not stack two uncommitted passes
WAVE 2 (SEQUENTIAL): pass 2 → commit → pass 3 → commit → P1 gate = 0 → wire into prebuild
        ↓
WAVE 3: Spec 39 design calls [inline]
```

**Not in scope:** passes 4-6 (`columns` needs 3 pattern files updated in-commit; font-size families
route through `TypographyControls`, a different edit shape) · Phase 2.1 (gated on deriving its roster
from real `post_content`, D545) · Phase 3.2a — ⛔ its input has a **measured false-positive rate**;
it is a decision, not a build.

### Programme scope — done vs remaining (measured 2026-08-11, re-derive rather than trust)

**Phase level** (`go-track-1b-playful-hamster.md`): of 9 phases, **2 CLOSED** (Phase 1 the responsive
model; **Phase 0 FULLY, as of 2026-08-11**), **1 IN PROGRESS** (1.6, this migration), **5 OPEN** —
1.5, 2.1, 2.2/3.2b, 3.2a, 3.3, 4.

**Phase 4 is no longer blocked** — 0c was its blocker and was already shipped (D561). 3.3 is still
blocked on replacing a hardcoded 16-name tuple, and 3.2a is ⛔ **a decision, not a build** — its
input has a measured false-positive rate, now confirmed a second time by §14's own census.

**0d shipped** (D565): 115 imports across **50** files (not the 47 a line-anchored grep claimed — the
detector caught its own author's undercount), 10 symbols, now behind `src/components/primitives/`
with the gate wired into `prebuild`.

**Phase 1.6 (the migration) — roughly 12% done.** `npm run survey:responsive-shape` at HEAD:

| | Before pass 1 | Now | Source |
|---|---|---|---|
| Tier families total | 311 | **288** | the survey's own count |
| **Migration candidates** | 160 / 41 blocks | **141 / 41 blocks** | the survey's `MIGRATION CANDIDATES` line |

Pass 1 cleared **19 candidates** (the 19 flat `gap` blocks; the 2 blended row blocks were never
candidates). **141 remain.** Biggest clusters still flat: `columns` 21 blocks · `gridTemplateColumns`
19 · `gridTemplateRows` 19 · `maxWidth` 11 · `minHeight` 8 · `contentWidth` 7 — so passes 2 and 3
alone account for **~56 of the 141**, and pass 4 (`columns`) another 21.

⚠ **Do not quote 160 as the work-list any more** — it was the pre-pass-1 figure and is now stale by
19. Re-run the survey; it prints the live number.

### Methodology guardrails (earned this session; do not skip)

- ⛔ **Never dispatch an agent onto a file the main thread is editing.** Cost: a half-renamed shared
  wrapper, deployed. **`php -l` passes on undefined variables** — it is not a safety net for a rename.
  Before any dispatch, list the agent's files and confirm none is in your own working set.
- ⛔ **Scope DOM queries.** `querySelector('.wp-block-sgs-container')` returned the site *header*, not
  the probe block — and produced a confident false FAILURE.
- ⛔ **Never select a site with a glob.** `ls ~/domains/*/public_html | head -1` picked `feldeluxe.com`;
  there are **11 WordPress installs** on that server. Name the path.
- **Check what a number DESCRIBES** — "12,565 tier-attribute instances" was the *block* count; the real
  figure was 2,962.
- **A match inside a comment is not a usage** — `trust-bar` needed no change for exactly that reason.
- **Build the break first.** Both new gates were proven able to fail by injecting a real violation into
  a live file, then reverting and confirming on disk — not by fixture alone.
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main`. ⛔ **Do not trust this line for tree state — run `git status`.** Commit by
  EXACT PATH (a pre-commit gate requires a pathspec; the visual-diff gate requires a `source_sha`
  in the report and REJECTS one carrying a previous change's sha — that is the stale-report defence
  working, not a bug).
- **⚠ UNCOMMITTED, deliberate:** pass 1 (`gap`) across 21 blocks + the wrapper ungate + the flag
  rename. Deployed and verified; held back only by the per-block visual-diff reports (T1).
- **Untracked, deliberate:** `.claude/Border Example HTML.html` (Bean's reference markup).
  `.claude/backups/2026-08-10-gap-migration/` — content backup of the 38 binned canary pages
  (17KB, verified readable, includes Homepage).
- **Baselines, safe to cite:** `inspector-scan` rule 21 = **133**, tree-wide **250** at HEAD;
  129/245 at `cb209dc1`. Rule 26 = **3**. Denominator **83**. ⚠ The JSON path is
  **`results[].findings`**, NOT `rules[].findings` — the wrong key returns `[]` and looks clean.
- **DB:** snapshot at `~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-10-pre-T0-classifier`.
  Restore = `shutil.copy2` that file over the live DB. ⚠ `~/.claude/skills/...` is a junction to the
  SAME file — verify with `os.path.samefile`, never assume two databases.
- **Build:** `npm run build` exit 0, all gates green. `db-consistency --check` exit 0.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com. ⚠ **11 WP installs share that server** —
  always name the full path, never glob. Credentials `.claude/secrets/sandybrown.env` (always available).
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **THE next-session plan (carries the full reading ORDER)** | `plans/2026-08-11-track-1b-next-session.md` |
| **⭐ THE GOVERNING SPEC for this track** | **`specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`** (ACTIVE v2.0) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` |
| **Programme scope + phases** (NOT the entry point) | `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md` |
| **The live migration design** | `plans/spec-35-flat-to-object-migration-design.md` + `spec-39-seed-requirements.md` |
| Decisions (D-numbered) | `decisions.md` — D556-D559 are this session |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- **Pass 1 cannot commit** until the 21 per-block visual-diff reports exist (T1). Everything else in
  the session is committed and pushed. Not a code problem — an evidence problem, and T1 is the fix.
  ⭐ **T1 may now be cheaper than the plan assumes:** `check-editor-only.py` (D562) skips the gate for
  any block whose sole staged file is `edit.js`. Pass 1 touches `block.json` + `render.php` on most
  of its 21, so most still need real captures — but **triage them first**; any that turn out
  editor-only need no report at all. ⛔ Do not stretch the branch to cover them: it refuses
  `block.json` deliberately, because attribute data moves pixels.
- ~~0d deferred~~ ✅ **DONE** — pass 1 landed (`fa638cea`, co-active session), the tree went clean,
  and 0d shipped the same session. 115 imports across 50 files now route through
  `src/components/primitives/`, with `check:experimental-imports` wired into `prebuild`.
- ⚠ **A line-keyed baseline is a live hazard for any future codemod.** `inspector-scan`'s
  `08-raw-url-link` keys entries on `file:LINE`, so a 2-line import shift turned an accepted
  exemption into a gating finding. Re-anchored (D565) with a `_meta` warning. **Passes 2-6 of the
  tier-object migration will hit this again** — expect it, and re-anchor only when nothing but the
  line moved.

## Open — carried, not ours to close

- **`MEMORY.md` at 24,531 of 24,576 bytes** — blocks every new memory entry; T3 clears it.
- **Ruling B's premise is partly falsified, and it is Bean's call.** It said pages get binned because
  writing a converter would be slower. A stored-content migration harness DOES exist
  (`scripts/wp-migrate-oldshape-blocks.js`, wired into `build-deploy.py`'s pre-flight) — but it handles
  content restoration and RENAMES, not flat→object, so extending it is real work. Binning remains
  reasonable; the reasoning in the design doc should be corrected either way.
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had a value.
  Needs its own design; ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation toggle;
  needs its own design gate. Not started.
- **blub :5050 is DOWN** (HTTP 000) — re-POST pending lessons to `/api/learning`.
