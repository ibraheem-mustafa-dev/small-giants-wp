---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-11 (session 8). The 7 blank blocks are FIXED — the test page went from 42 blind
spots to 0. But fixing them uncovered that the measuring tool was pointed at the wrong part
of each block, so the migration still can't be committed. One commit pushed (`a33c87ce`).**

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
- **Where it stands:** after deploying, 29 settings now measure correctly. 34 still don't, in
  three clearly separated groups — and none of them pass silently, they all fail loudly. The
  biggest group isn't a bug at all: the test writes "64px" into settings like "align items"
  and "row direction", where a pixel value is meaningless, so they can never match.
- **A test page (1593) was blocking the deploy** with an old setting the migration removed.
  Fixed. ⚠ The tool the error message told me to use for that doesn't exist in the repo.

**2026-08-11 (session 7). The whole remaining long tail migrated in one pass — 41 settings
across 35 blocks. Six commits pushed. The migration itself is NOT committed yet, because the
thing that proves it works turned out to be broken and I fixed that instead.**

- **You were right twice, and both times it changed the plan.** First: "isn't there a
  difference between 30 one-offs and one property across 30 blocks?" — no, not once
  verification batches too, so I built the batching. Second: "the mapping is easy and is
  findable in the blocks source files" — correct, and it saved me proposing a design session
  for something the code already declares.
- **The measuring instrument was blind again, and worse than last time.** It guessed each
  setting's CSS name by reformatting the attribute name. That works for `minHeight` →
  `min-height`, and is WRONG for 29 of the 41. `labelFontSize` became `label-font-size`,
  which is not a real CSS property — the browser returns an empty answer, and empty looks
  exactly like "this block has no value set". **~70% of this pass would have produced
  confident reports built on blank readings.** Found by actually running it, not by reasoning.
- **The fix came from your source files, not from me guessing.** Each block's `render.php`
  literally declares which CSS property it drives, and the project already has a database
  table (`property_suffixes`) that resolves 33 of the 41 on its own. It now reads those, and
  **refuses to measure anything it can't resolve** rather than silently recording a blank.
- **Real bugs the build caught along the way:** a broken file that stopped the whole build,
  two live "Array to string" bugs already shipped on the canary, and a container preview that
  had been rendering nothing. None of these would have been found by the automated checks
  alone.
- **⚠ One thing left before the migration can be committed:** 7 blocks don't appear on the
  test page at all because they're empty shells (a media block with no image, a text block
  with no text). The test tool correctly refuses to score them. That's a small, contained fix.

**Earlier narrative:** `memory/session-2026-08-08.md`; sessions 2-7 in commit messages +
`decisions.md` D546-D573.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D573**.

### ✅ SHIPPED + PUSHED this session (6 commits)

| Commit | What |
|---|---|
| `5b122b03` | Visual-diff reports collapse unchanged blocks into one summary (verified, 14 assertions) |
| `cac9aa33` | Pass 3b — `gridTemplateRows` tier object + the A3 `gap` editor-preview carry-forward |
| `d2519199` | `migrate-tier-object.py` classifies edit.js/render.php STATE; S2 auto-fixer |
| `64998eee` | S4 theme-scalar codemod promoted to `scripts/`, proven vs real git history |
| `12f86c12` | Batch mode across all 3 fixture scripts (multi-property, one page/deploy/capture) |
| `7af83d4b` | **attr→CSS mapping derived from source + refusal guard** (the big one, see below) |

### ⛔ NOT COMMITTED — the 41-property migration (89 files, STAGED, build-green)

**Everything is staged and `npm run build` passes with all gates green.** It is deliberately
uncommitted: the pre-commit visual-diff gate wants per-block evidence, and generating that
evidence is blocked on ONE remaining fixture gap (below). Nothing is half-applied.

**Scope:** 41 properties / 35 blocks. S1 (block.json) + S2 (edit.js controls) + S3 (render.php
reads) + S4 (155+ theme instances across ~30 files) all done and swept clean — `0` RAW/LEGACY
findings across all 41 via `migrate-tier-object.py --property <p> --survey`.

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

### ⭐ NEXT SESSION — clear the 34 non-binding properties, then the commit lands

**Task A below is DONE (D574, `a33c87ce`) — 42 NOT-FOUND → 0. Kept for context only.**
The fixture page (2248) is published with the new content, the migration IS deployed to the
canary, and before/after captures exist. What blocks the commit now is that **34 of 63
probe measurements do not bind**, in three separated classes. Full detail in D574; order:

1. **(a) FIRST — probe values are the wrong TYPE.** `PROBE_TIERS` writes `64px` into keyword
   properties (`alignItems`, `flexDirection`, `flexWrap`, `justifyContent`), integers
   (`order`, `splitContentOrder`), a transform (`rotation`) and an enum (`widthType`).
   Invalid CSS cannot bind, so these can NEVER pass. Needs a per-property-type probe value —
   derive the type from the property, do not hand-list blocks. Biggest group, cheapest fix,
   and it must go first or it buries the real signal.
2. **(b) THEN — the element is absent for want of content.** `trust-bar.titleFontSize`,
   `quote.attributionFontSize`, `brand-strip.name*`, `product-card.tagFontSize` report
   target `None`: the BLOCK paints but the ELEMENT does not. Same shape as task A one level
   down — extend the render minimums so each measured element has content.
3. **(c) LAST — what remains may be REAL regressions.** `sgs/container` + `sgs/cta-section`
   emit no root `min-height` for a set value while `sgs/hero` does; `sgs/heading` `fontSize`
   reads 16px against a set 64px. ⛔ UNPROVEN in both directions — do not fix or dismiss
   before (a) and (b) are cleared.

⛔ **Do NOT re-run task A's fix.** And note `--payload` is required to deploy with the tree
deliberately dirty: `build-deploy.py --target sandybrown --payload plugins/sgs-blocks/src/
--payload plugins/sgs-blocks/includes/ --payload plugins/sgs-blocks/scripts/ --payload
theme/sgs-theme/`.

#### A. Fix the 7 non-rendering fixture blocks — ✅ DONE (D574). Context only.

`before-after, collapsible-text, decorative-image, media, option-picker, text, whatsapp-cta`
render as empty shells on the fixture page, so the capture reports 42 NOT-FOUND
(7 blocks × 3 viewports × 2 variants) and **correctly refuses to score them** — that refusal is
the tool working, not a bug.

Mechanism already exists: `build-tier-fixture-page.py`'s `TYPED_ITEMS` map (currently one entry,
`sgs/card-grid`). Each of the 7 needs the minimum attrs that make it paint, **read from its own
`block.json`, never invented** — e.g. `media` needs an image source, `text` a `text` value
(⚠ the attr is `text`, NOT `content` — that exact mistake is already recorded in that file).

#### B. Then run the cycle that is now fully built and self-tested

1. `build-tier-fixture-page.py --property <41 comma-separated> --publish --manifest <path>`
   (already proven: 28 blocks, one page, `sgs/button` carrying all 8 of its properties in ONE
   instance — page id 2248 exists on the canary and can be reused/updated).
2. Capture BEFORE **on the live pre-migration site** (do NOT deploy first — that is the whole
   point of a before).
3. `build-deploy.py --target sandybrown`.
4. Capture AFTER, then `make-visual-diff-reports.py`.
5. Commit the 89 staged files by EXACT PATH. **D573 is already written** — extend it with the
   evidence (report count, live-editor result), do NOT author a new entry for it.

#### C. Then `columns` — its own session, its own design gate

21 blocks, entangled with the wrapper's grid fallback. Map the mechanism and bring Bean the
before/after before touching it.

#### Orchestration

| Task | Execution | Depends on | Gate |
|---|---|---|---|
| A fixture content for 7 blocks | inline (Opus) — needs per-block schema judgement | none | capture reports 0 NOT-FOUND |
| B before/deploy/after/reports | inline (Opus) — one deploy, never parallel (STOP-39) | A | 35 reports, all PASS |
| B5 commit + decisions D573 | inline | B | pre-commit gate passes on real evidence |
| C `columns` design | inline + `/brainstorming`, then Bean sign-off | B | Bean approves before build |

```
A -> B -> commit -> C (separate session)
```

### Methodology guardrails (earned; do not skip)

- ⛔ **The right property read off the wrong ELEMENT is the same bug as the wrong property.**
  D573 fixed `labelFontSize`→`font-size`; D574 found it was still being read from the block
  root while the rule sits on a descendant. Both return a real, plausible number.
- ⛔ **Recurse on `.length`, never on truthiness.** Chrome's `CSSStyleRule` exposes an empty
  `cssRules` since CSS Nesting: a truthiness guard skipped every style rule, walking 64
  stylesheets and examining 0.
- ⛔ **`.includes()` on a class name is a substring test** — every BEM element class starts
  with its block class, so `.sgs-button__icon` matches `.sgs-button`. Anchor to a boundary.
- ⛔ **No fallback to a plausible target.** When the attribute's own rule is absent, return
  "no target" — a fallback handed back the neighbouring element and read perfectly cleanly.
- ⛔ **`git commit --amend` IGNORES the original pathspec** and commits the WHOLE index. Used
  to fix a subject line, it swept all 89 deliberately-staged migration files into the commit.
  Caught by reading `--stat`; undone with `reset --soft` + re-commit by path.
- ⛔ **A mapping that LOOKS right can measure nothing.** `getPropertyValue()` returns `''` for
  an unknown property silently. Assert the REAL target, never the shape of the name. Twice now
  this class of bug has produced confident reports off blank readings.
- ⛔ **Run it for real before trusting it.** The 29 bad mappings and the 7 empty blocks were
  both invisible to self-tests and only appeared on a live capture.
- ⛔ **Derive from source, don't design around it.** Bean caught me about to spec a research
  task for a mapping that `render.php` and `property_suffixes` already declare.
- ⛔ **Never run a project-wide formatter as a post-step.** `wp-scripts lint-js --fix` on an
  out-of-tree path silently fell back to its default `src/` glob and reformatted **~250 files**,
  including a committed one. Caught by `git status` immediately after; reverted. Documented in
  `plugins/sgs-blocks/CLAUDE.md`.
- ⛔ **Verify the EFFECT landed, not the exit code** — a deploy that aborted and a `git stash`
  that dropped a change both reported success.
- ⛔ **A survey leg is a candidate list, not a defect list**, and **fix the instrument before
  working its list**.
- ⛔ **On a shared `main`, re-run the D-ceiling command IMMEDIATELY before writing an entry.**
- ⛔ **`supports.anchor` ≠ honouring it** — blocks that hand-build their wrapper drop it.
- ⛔ **Scope every DOM query** — the fixture page carries 8 `.wp-block-sgs-site-header`.
- ⛔ **A subagent that says it "dispatched" the work did nothing.** Two dispatches this session
  returned confident status messages having touched zero files; a third silently duplicated a
  completed task in parallel. Check `git status`, never the agent's own report.
- **Full STOP catalogue + pre-flight ritual: `STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main` at `7af83d4b`, pushed. ⛔ **Do not trust this line for tree state — run
  `git status`.** Commit by EXACT PATH: a pre-commit gate REQUIRES a pathspec (co-active
  sessions share `main`), and the visual-diff gate REJECTS a report whose `source_sha`
  describes a previous change.
- **Working tree: 89 files STAGED, uncommitted, deliberately** (the 41-property migration).
  Build green, all gates pass. **One file untracked, deliberately:**
  `.claude/Border Example HTML.html` (Bean's reference markup, not part of any track).
- **Tests/build:** `npm run build` exit 0 — asset-target, ghost, motion-bundle-budget,
  dead-controls, dead-pattern-attrs, tier-storage-shape all green.
- **Script self-tests:** `migrate-tier-object.py` 14 · `migrate-theme-tier-scalars.py` 7 ·
  `capture-tier-fixture.py` 34 · `make-visual-diff-reports.py` 22. All pass.
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
| Decisions (D-numbered) | `decisions.md` — D570-D573 are this session |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- **One, contained:** the 7 non-rendering fixture blocks (NEXT SESSION §A). Nothing else is
  blocked; the migration and all tooling are done and green.

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