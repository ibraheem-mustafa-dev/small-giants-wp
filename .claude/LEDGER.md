---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-11 (session 8). THE 41-SETTING MIGRATION IS COMMITTED AND LIVE** (`d6ca8b10`,
90 files) — the thing that has been staged and blocked for two sessions. Six commits pushed.
Getting there meant rebuilding the measuring tool three times and finding four real bugs
that were already live on the canary.

- **The 7 blocks now render, proven on the real page, not in a test.** Their "minimum to look
  like themselves" recipe was already written in each block's own file — I read it rather than
  inventing one, so it maintains itself as blocks change.
- **The bigger find: last session fixed WHICH SETTING was measured; this session found it was
  measuring the WRONG PART OF THE BLOCK.** 22 of the 41 settings style an inner piece — the
  little label under a trust badge, a card's title, a price — but the tool read the outer box.
  It got a real number back every time, from an element the setting never touches.
- **Two browser traps sat inside that fix, both producing confident blank answers.** One made
  the tool examine 64 stylesheets and 0 rules while reporting "this block has no styling". The
  other made a button's *icon* width answer for the *button's* width, because one class name
  is a prefix of the other. Both found by running it.
- **Where it ended: 56 of 65 settings verified working on the live page**, up from 29 — each
  measured on the exact element it actually styles. The 9 that don't are individually
  explained and **none is a fault in the migration**; 4 of them I could not explain and have
  said so rather than inventing a reason.
- **The commit needed one gate bypassed, and you authorised it (D577).** The gate wanted
  before/after screenshots I could no longer produce honestly. Instead I proved the thing it
  was looking for outright: **zero of the 65 settings changed what they render when left
  unset** — a check of every one, where the gate would have sampled a handful. What that does
  NOT cover is written down plainly rather than glossed.
- **A test page (1593) was blocking the deploy** with an old setting the migration removed.
  Fixed. ⚠ I said the tool the error message named "doesn't exist in the repo" — wrong: it is
  at the repo root `scripts/wp-migrate-oldshape-blocks.js`. I searched the plugin's scripts
  folder and reported absence as fact. An earlier session recorded the same false absence.
- **Then your question — "isn't there a cheaper way to measure these?" — found three real
  bugs.** Chasing it showed most of the "34 not working" wasn't a measuring problem: the
  settings genuinely weren't reaching the page. **125 broken style rules were live on the
  canary**, all one cause — a per-device setting handed to code expecting a single value, which
  PHP turns into the literal word "Array". Worst of them: **a section's minimum height did
  nothing at all when an operator set it**, and its tablet/mobile values never rendered. All
  three fixed and verified live (125 → 0). You design-gated the shared-wrapper one; I changed
  only that single read.
- **The migration's own checker could never have caught the worst one.** It only looks inside
  block files, never the shared code every block runs through — and its own documentation
  asserts the shared wrapper "already reads the new format", which is what made every block
  report clean. Fixed and pushed.
- **⚠ THE BIG ONE, found last: the canary had been running STALE settings files.** Every
  per-device setting was being thrown away by WordPress before any block code ran, because the
  deployed schema still said "this is a single value" while the page stored a per-device one.
  **No amount of PHP fixing could have worked** — the value was gone upstream. One redeploy
  fixed both remaining bugs with zero code changes.
- **I told you min-height was fixed when it wasn't, and my own tool caused that.** It matched a
  generic "shrink to fit" rule that mentions every block, measured a CHILD element, and reported
  a confident 64px for a setting that had no rule anywhere on the page. Two agents proved me
  wrong while I was reporting it as done. Guard added; the tool had actually recorded which
  element it measured all along — I just never read that field.
- **Both agents had to predict the result BEFORE I deployed.** Both predictions were exactly
  right, which is what turned a plausible story into proof.

**Earlier narrative:** session 7 → `memory/session-2026-08-11-session7.md`; session 6 and
earlier → `memory/session-2026-08-08.md`; the rest in commit messages + `decisions.md`
D546-D577.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D577** (this line
> has now gone stale TWICE while sitting on the words "never cache it" — read the command, not
> this number).

### ✅ SESSION 8 — SHIPPED + PUSHED (6 commits, `main` @ `d6ca8b10`)

| Commit | What |
|---|---|
| `a33c87ce` | Fixture render minimums (7 blank blocks → 0 NOT-FOUND) + naked-root selector + batch KeyError |
| `4969db59` | Survey scans SHARED INCLUDES; dead-code vs live-bug discriminator (14→53 assertions) |
| `5939d3e3` | Type-correct probe values per property + "did it MOVE?" positive control |
| `f1150251` | Probe no longer accepts a universal-selector (`> *`) backstop as a target |
| `e3ca18db` | D576 — stale deployed `block.json` dropped every migrated attribute |
| **`d6ca8b10`** | **THE 41-PROPERTY MIGRATION — 90 files, LANDED** |

### ✅ COMMITTED — the 41-property migration (90 files, `d6ca8b10`)

**Landed 2026-08-11 with the visual-diff gate BYPASSED ONCE, Bean-authorised, justified in
D577.** A valid BEFORE capture was no longer obtainable (migration already deployed; a parallel
session deploying to the same canary from its own worktree — the cause of D576). Generating
reports from the stale before-capture was REFUSED: false premise.

Evidence accepted in its place — **stronger on the question the gate asks, weaker on breadth,
both stated**: zero defaults changed across ALL 65 (block, property) pairs (18 preserved, 47
unset both sides, 0 changed — a census, not a sample), plus 56/65 properties verified binding
live on the correct element. **NOT covered:** incidental visual changes unrelated to defaults.

**Scope:** 41 properties / 35 blocks. S1 (block.json) + S2 (edit.js controls) + S3 (render.php
reads) + S4 (155+ theme instances across ~30 files).

⛔ **`columns` is DELIBERATELY EXCLUDED** — 21 blocks, and it is the FALLBACK mechanism for
`gridTemplateColumns`/`Rows` (when a tier has no explicit template the wrapper generates one
from the column COUNT, ~4 call sites in `class-sgs-container-wrapper.php`). That is genuine
shared-wrapper surgery and needs its own design gate (Rule 7), not a batch run.

**Real bugs found and fixed during this pass — none visible to any static gate:**
1. `hero/edit.js` — a dangling unclosed `<RRangeControl>` from the control swap **broke the
   entire build**. Caught only by running `npm run build`.
2. `media/render.php` — `maxHeight` was object-typed but still cast straight to string:
   a LIVE "Array to string conversion" on every render since that migration landed.
3. `button`/`heading` `render.php` — hand-rolled `(float) $attributes['fontSize']` casts, same
   bug class, live.
4. `container/edit.js` — `maxWidth` object handed bare to `style.maxWidth`: the editor preview
   had been rendering nothing.
5. `text`/`label` `edit.js` — a control writing to a RETIRED attr (WP discards silently), a
   duplicate letter-spacing control, and a reset comparing an object to a bare number.
6. `decorative-image` — stale `widthTablet`/`widthMobile` reads + a `resetAll` writing dead keys.

### ⛔ THE INSTRUMENT WAS BLIND ON 29 OF 41 PROPERTIES (D573 — read before trusting any report)

`capture-tier-fixture.py` derived each property's CSS name by camelCase→kebab-case. That is
correct for `minHeight`→`min-height` and **wrong for 29 of the 41**: `labelFontSize` →
`label-font-size`, `priceFontSize` → `price-font-size`, `thickness` → `thickness`. None of
those are CSS properties. `getPropertyValue()` returns `''` for an unknown property **without
throwing**, and `''` is indistinguishable from "no value set" — the pass-2 blind-instrument
bug, at ~70% of a pass instead of one property.

**Fixed by DERIVING from source (Bean's call — the mapping is declared, not guessable):**
1. explicit override, each cited to the `render.php` line it came from — `positionX`→`left`,
   `rotation`→`transform`, `thickness`→`border-bottom-width`, `iconSize`→`--sgs-btn-icon-size`,
   `widthType`→`width`;
2. **`property_suffixes` in `sgs-framework.db`, LONGEST suffix wins** — the project's canonical
   table (R-31-1 DB-first). Resolves **33 of 41** alone: `labelFontSize` ends in `FontSize` →
   `font-size`, which is what the block actually emits onto its label element;
3. kebab-case only as a last resort.

Plus the guard whose absence let it through: **`validate_css_property()` REFUSES before
measuring** anything that isn't a real CSS property, instead of recording blanks. Two attrs are
declared unmeasurable-by-design and skipped with a stated reason (`customWidthUnit` is a unit
modifier; `maxResults` is a REST query limit).

⚠ **The old self-test asserted only that the result LOOKED like a CSS property** (lowercase,
hyphenated) — which `label-font-size` satisfies perfectly while measuring nothing. It now
asserts the REAL target per attribute. 34 assertions, proven able to fail.

### ⭐ NEXT SESSION — orchestration plan (the 41-property migration is DONE)

**⛔ Sections A and B below are COMPLETE.** They survive only because `decisions.md` cites their
reasoning. Do NOT re-run them. §C (`columns`) is Task 1 here.

**State recap, plain English.** The framework stores each responsive setting once per device
(desktop/tablet/mobile) instead of as three separate flat settings. That conversion is finished
for 41 settings across 35 blocks, committed (`d6ca8b10`), deployed, and 56 of 65 verified
working on the live canary. The tool that proves it works measures a real browser: it had to be
rebuilt three times (D573 measured the wrong CSS property, D574 the wrong element, D576 the
wrong element again via a `> *` backstop rule). One setting is left — `columns` — and it is the
hardest because the shared wrapper uses it as a fallback for the grid.

---

## Task 1 — Migrate `columns` to the tier-object shape

**What:** the last of the 42 responsive settings. 21 blocks declare it.
**Why:** finishes Spec 35's tier-object migration; until then the framework has two storage
shapes for responsive values.
**Estimated time:** 45 min design gate + 30 min build.

**Orchestration:**
- Execution: **inline (main thread)** for the design gate; delegated for the mechanical sweep.
- If delegated (build only):
  - Model: `sonnet` via `/delegate`
  - Dispatch pattern: single-agent
  - Brief: apply the proven `migrate-tier-object.py --fix --apply` triad to `columns` across the
    21 blocks, then hand back for the wrapper work — which stays inline.
  - Context it will not have: `columns` is NOT an ordinary property. When a tier has no explicit
    `gridTemplateColumns`/`Rows`, the shared wrapper GENERATES one from the column COUNT
    (~4 call sites in `class-sgs-container-wrapper.php`). Changing its storage shape changes
    that fallback for every grid block.
- Depends on: **Bean's design gate (Rule 7 — shared wrapper).** Do not start the wrapper edit
  without it.
- Parallel with: Task 2.
- /qc gate after: **yes — `/qc-council`** (shared-wrapper change, blub.db 255).

**Acceptance:** `migrate-tier-object.py --property columns --check` exits 0 AND the fixture page
shows `columns` binding per tier on a representative grid block AND no grid block's rendered
column count changes when `columns` is left unset. Deferral of any part must name a spec STAGE,
never "out of scope" (STOP-29).

---

## Task 2 — Make `build-deploy.py` verify the DEPLOYED schema, not just HTTP 200

**What:** after deploying, ask WordPress what schema it actually registered and compare against
local `build/`. Fail the deploy on mismatch.
**Why:** D576. A co-active session deploying from its own worktree shipped an OLDER `build/`
over this track's, silently reverting every migrated `block.json` to `type:string`. WordPress
then discarded every object attribute before render — and the deploy's own verify passed green.
This is cause-agnostic: it catches the failure whatever the cause.
**Estimated time:** 20 min.

**Orchestration:**
- Execution: delegated.
- Model: `sonnet` via `/delegate`
- Dispatch pattern: single-agent
- Brief: extend the existing verify step in `plugins/sgs-blocks/scripts/build-deploy.py` to run
  `wp eval` against `WP_Block_Type_Registry` over SSH for a sample of blocks and diff the
  attribute schema against the local `build/blocks/*/block.json`. Fail closed on mismatch.
- Context it will not have: the verify step is default-ON and must stay so; the canary is
  contended, so the check must name the FULL path (11 WP installs share that server).
- Depends on: none.
- Parallel with: Task 1.
- /qc gate after: yes — `/qc-inline`.

**Acceptance:** deliberately deploying a stale `build/` fails the deploy with a message naming
the mismatched block and property. Proven by injecting the regression, not by reasoning.

---

## Task 3 — Resolve the 4 unexplained non-binding properties

**What:** `button.fontSize`, `decorative-image.positionY`, `hero.splitContentOrder`,
`quote.attributionMarginTop` do not bind their probe value. **Cause unknown and deliberately
NOT theorised.**
**Why:** each is either a real rendering bug on a shipped block or a further instrument gap.
Both matter; neither is guessable.
**Estimated time:** 30 min.

**Orchestration:**
- Execution: delegated.
- Model: `sonnet` via `/delegate`
- Dispatch pattern: `/systematic-debugging`, iron law — no fix without a root cause proven as
  `file:line` + mechanism.
- Brief: reproduce on the live fixture page, prove the cause, fix. The other 5 non-binding
  properties are already explained (2 declared unmeasurable and should not be probed at all;
  2 hero margins live on CHILD blocks via `className` from `HERO_CONTENT_TEMPLATE`; 1 needs a
  live WooCommerce Bound connection) — do not re-investigate those.
- Context it will not have: the agent MUST NOT deploy. The canary is contended and parallel
  deploys are a recorded incident — it pre-registers a predicted measurement and the main thread
  runs the single deploy that tests it. That protocol is what proved D576.
- Depends on: none.
- Parallel with: Tasks 1 and 2.
- /qc gate after: yes — `/qc-inline`.

**Acceptance:** each of the 4 either binds, or is documented with a proven cause and a named
owner. "Still unexplained" is not acceptance.

---

## Dependency graph

```
Bean design gate (columns) ──► Task 1 (inline + sonnet, /qc-council)
Task 2 (sonnet)            ──┐
Task 3 (sonnet, systematic) ─┴─► ONE deploy (never parallel) ──► capture ──► commit
```

⛔ **ONE deploy per cycle, run by the main thread.** Agents pre-register predictions; the main
thread deploys once and checks them. Parallel deploys to the shared canary caused D576.

## Methodology guardrails (do not skip)

- **Deploy before measure** — and then verify the DEPLOYED schema, not just HTTP 200 (D576).
  A green deploy verify does not mean your code is what is running.
- **Root cause before instance fix** — ask what CLASS of failure this is before fixing the one
  case. Three bugs today were one class (an object attr reaching code expecting a scalar).
- **Outcome vs completion** — code shipped is not outcome achieved. For spec'd work, map every
  deferral to a named spec STAGE, never "out of scope" (STOP-29).
- **`/qc-council` before every commit** touching converter / pipeline / shared-wrapper / SGS
  block logic (blub.db 255).
- **A survey leg is a candidate list, not a defect list** — and fix the instrument before
  working its list.
- **Verify the EFFECT landed, not the exit code** — a deploy that aborted and a `git stash` that
  dropped a change both reported success.
- **`git commit --amend` IGNORES the original pathspec** and flushes the WHOLE index. Amend only
  when the index is empty.
- **Re-run the D-ceiling command immediately before writing a decision entry** — `main` is
  shared with a co-active session.
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main` at `d6ca8b10`, pushed. ⛔ **Do not trust this line for tree state — run
  `git status`.** Commit by EXACT PATH: a pre-commit gate REQUIRES a pathspec (co-active
  sessions share `main`), and the visual-diff gate REJECTS a report whose `source_sha`
  describes a previous change. ⚠ `--pathspec-from-file` does NOT satisfy that gate; a verified
  whole-index commit needs an explicit `[batch-ok: <reason>]` token in the message.
  ⛔ **`git commit --amend` IGNORES the original pathspec and flushes the WHOLE index** — used
  to fix a subject line it swept all 89 staged migration files into an unrelated commit
  (caught in `--stat`, undone with `reset --soft`). Amend only when the index is EMPTY.
- **Working tree: CLEAN of migration work — the 41-property migration is COMMITTED**
  (`d6ca8b10`, 90 files). Remaining unstaged files belong to the co-active session, not this
  track. **One file untracked, deliberately:** `.claude/Border Example HTML.html` (Bean's
  reference markup, not part of any track).
- **Tests/build:** `npm run build` exit 0 — asset-target, ghost, motion-bundle-budget,
  dead-controls, dead-pattern-attrs, tier-storage-shape all green.
- **Script self-tests:** `migrate-tier-object.py` **53** · `migrate-theme-tier-scalars.py` 7 ·
  `capture-tier-fixture.py` 34 · `make-visual-diff-reports.py` 22 ·
  **`build-tier-fixture-page.py` 92 (NEW this session)**. All pass.
- **⛔ THE CANARY IS CONTENDED.** A parallel session deploys to it from its own worktree, and
  on 2026-08-11 that shipped an OLDER `build/` over this track's — silently reverting every
  migrated block.json to `type:string`, so WP dropped every object attribute before render
  (D576). **After ANY deploy, verify the REGISTERED schema, not just HTTP 200:**
  `ssh hd "cd domains/…/public_html && wp eval '…get_registered(\"sgs/cta-section\")->attributes…'"`.
  A green deploy verify does not mean your code is what is running.
- **⚠ Line endings:** several `block.json` blobs are stored CRLF while the repo declares
  `eol: lf`, so ANY edit normalises the whole file and the diff looks enormous. Read the real
  change with `git diff --ignore-cr-at-eol`. Pre-existing debt, not damage.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com. Fixture page **2248**
  (`/tier-fixture-batch-41props/`) exists from this session — reusable. ⚠ **11 WP installs
  share that server** — always name the full path, never glob. Credentials
  `.claude/secrets/sandybrown.env` (always available; do not ask).
- **DB:** snapshot at `~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-10-pre-T0-classifier`.
  ⚠ `~/.claude/skills/...` is a junction to the SAME file — verify with `os.path.samefile`.
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **THE migration triad — survey/fix/gate, all 4 shapes** | `plugins/sgs-blocks/CLAUDE.md` §"Tier-object migration triad" + §"S4" |
| **THE procedure for the next passes** | `plans/spec-35-flat-to-object-migration-design.md` |
| **THE GOVERNING SPEC for this track** | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` |
| Programme scope + phases (NOT the entry point) | `~/.claude/plans/go-track-1b-playful-hamster.md` |
| Decisions (D-numbered) | `decisions.md` — D574-D577 are session 8 |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- **NONE for this track.** The 41-property migration is committed (`d6ca8b10`), deployed and
  verified; the fixture instrument is rebuilt and self-tested. `columns` is the remaining
  property and it is GATED, not blocked — it needs a design decision from Bean, not a fix.
- ⚠ **Environmental, affects everyone:** the canary is shared with a co-active session that
  deploys from its own worktree. Assume your code may not be what is running; verify the
  registered schema after any deploy (State Snapshot).

## Open — carried, not ours to close

- **The two pre-commit hooks are still unreconciled** (`.git/hooks/pre-commit` vs
  `.githooks/pre-commit`) — shared-mechanism change needing its own design gate.
  ⛔ Do not `cp` one over the other.
- **`migrate-tier-object.py`'s classifier does not recognise `TypographyControls`** as a shared
  import, so `text`/`label`/`button`/`heading` report `edit.js is UNCLEAR` for `fontSize` even
  though the wiring is correct (verified by reading `ResponsiveOverride.js`). Add it to
  `_SHARED_CONTROL_IMPORT_RE`. Cosmetic — a classifier gap, not a functional one.
- **`sgs/site-header` / `sgs/site-footer`** — `gap` removed; **no other inert attributes
  audited** on those shells.
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had
  a value. ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.