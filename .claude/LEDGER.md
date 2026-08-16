---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-15
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-15 (late session). The colour work is DONE for Track A — every block a client can
recolour now has one predictable Colour panel, in the Styles tab, and the picker inside it is
ours rather than WordPress's.** 4 commits on `main` (`aaa91c3e`, `a5b74bd1`, `f6f3c033`,
`0c287cf6`), plus the doc sweep committed alongside this handoff.

**What actually shipped, in order.**

1. **The reseed** (your Task 2). Drift orphans 3 → 2, zero new violations. It also flagged an
   "unexpected" `block_selectors` drop that turned out to be a **false alarm** — diffed my own
   pre-reseed snapshot against the post-reseed DB, zero rows changed either way; the drop
   predated tonight entirely.

2. **You asked mid-session whether we'd actually taken WP core's picker code as our own.** We
   had taken the popover *shell* (last session) but the picker *inside* it — the swatch grid,
   hex/RGB/alpha sliders — was still a live import. Now forked: ~29 files from WordPress at a
   pinned version, converted to plain JS, ours to customise. **One real bug surfaced doing it:**
   the forked CSS leaked into an unrelated block's *frontend* stylesheet (caught by the
   anti-cheat gate flagging `sgs/accordion`, a block the commit never touched). Fixed properly —
   two of the four stylesheets were duplicating CSS WordPress already ships, so they were deleted
   rather than shipped twice.

3. **A ruling that was never actually coded.** D621 (last session) said the Colour panel belongs
   in the **Styles** tab, and the previous LEDGER summarised it as shipped. It wasn't — the
   component still had no tab setting at all. Caught by reading the code and confirming live in
   the editor. One-line fix, verified live, **landed before the 33-block rollout** so every block
   went to the right place first time instead of needing a second pass.

4. **Wave 2 — 33 blocks migrated** via 16 parallel agents. Worklist rebuilt from the live DB
   rather than the plan doc's cached list, which was wrong twice (`social-icons` listed but has
   no custom colour attrs at all; `cart` missing despite having 5). Agents caught several places
   where the DB's own classification disagreed with the real code and were right to. **One real
   bug from the parallel dispatch itself:** an agent shipped a broken JSX tag that broke the
   shared build for every other agent — found and fixed directly, and notably that agent's own
   final report described it as "a transient concurrent-build collision" when it was a genuine
   syntax error. Its sibling agents reported it correctly.

5. **Task 3 (the schema question) turned out not to need a schema change at all** — and this is
   the part worth reading. I diagnosed both remaining drift orphans, proposed fixes, and a
   second-opinion review agent **overturned both diagnoses before anything was built**. My
   trust-bar diagnosis was factually wrong (I'd conflated two different attributes' CSS emits);
   my hero one rested on a false premise (a "stale leftover" class that is actually current and
   intentional). Both real fixes were one-line manifest declarations. Drift orphans: **2 → 0.**

⚠ **One mistake worth knowing about.** `git commit -- <paths>` re-stages those files from the
working tree, silently discarding a careful partial staging I'd done minutes earlier — so two of
the *concurrent* session's uncommitted attribute declarations landed on `main` inside my commit.
No functional damage (inert declarations, build green) and you ruled to leave it, but it's now a
STOP entry so it doesn't recur.

6. **Then Bean cleared four more residuals in one go** — and made a fair correction while doing it:
   three of the four had been parked as "needs a ruling" when they just needed *doing*
   (the nav-menu stale comment especially — a one-line fix should not have been an agenda item).
   All four completed via 4 parallel agents and verified. **None of them could commit** — see
   "Uncommitted work" below; the blocker is the other session's shared-DB state, not the work.

**Full narrative:** `memory/session-2026-08-15*.md` (auto-snapshotted at close).

## Shipped this session

| Commit | What |
|---|---|
| `aaa91c3e` | **Colour-picker fork (D627).** WP core's `ColorPalette`/`ColorPicker`/`CircularOptionPicker` (~29 files) forked from Gutenberg at pinned SHA `28c0dedc4eaf…` (WP 7.0.4) into `src/components/colour-picker/`. TS→JS, `@emotion/styled`→SCSS. New MIT deps: `react-colorful`, `colord`, `clsx`. No `framer-motion` (verified unused — no Spec 38 Tier-H conflict). Fixed the CSS-leak-into-frontend-bundle bug it introduced |
| `a5b74bd1` | **D621 actually coded (D628).** `SgsColourPanel` now `group="styles"`. Was ruled last session, summarised as shipped, never written |
| `f6f3c033` | **Wave 2 — 33 blocks (D629).** 16 parallel agents. Every colour state sets `linked: true` (D619). 17 blocks got live-captured `intent_capture_passed` visual-diff evidence; 16 auto-passed editor-only |
| `0c287cf6` | **Last 2 drift orphans closed (D630).** Manifest-only. Both original fix-shapes were wrong and were overturned pre-dispatch by an independent review |
| `49e10671` + `31163cfc` | Doc sweep: D627-D631, Spec 35 Parts A3/H/I/M, plan §1.2d, 4 parking entries, 3 STOP entries (221→224), 3 mistakes entries |
| ⚠ **UNCOMMITTED** | **4 residual fixes — done and verified, blocked from committing.** See "Uncommitted work" below |

### Numbers

| Metric | Start | End |
|---|---|---|
| `css_element` drift orphans | 3 | **0** |
| Blocks on `SgsColourPanel` | ~9 | **~42 of 49 (Track A complete)** |
| Element-manifest style defects | 7 | 7 (unchanged, at baseline) |
| STOP catalogue entries | 221 | **224** |
| D-ceiling | D626 | **D631** |

⚠ **Style defects did NOT drop to 6 as predicted.** Nothing regressed (gate passes at baseline),
but the prediction was simply not met — recorded honestly rather than quietly dropped.

## ⛔ UNCOMMITTED WORK — read before touching anything

**12 files are modified in the working tree. They are FINISHED and VERIFIED, not work-in-progress.**
Bean cleared 4 residuals late in the session (rightly pointing out that three of them never needed a
ruling, just doing). All four landed; none could commit.

| Fix | Files | State |
|---|---|---|
| **`social-icons` migrated onto `SgsColourPanel`** | `social-icons/{block.json,edit.js}` | Done. `colourMode='brand'` correctly renders hover-only (brand colours are per-platform, not client-settable) |
| **`hero` object-position mis-attribution cleared** | `hero/block.json` | Done. All 3 attrs traced in `render.php` (lines 584/590/1195) to ONE node `.sgs-hero__split-image`; the two false claims (`media`, `split-media`) removed |
| **`nav-menu` stale manifest comment** | `nav-menu/block.json` | Done. Prose only, schema untouched |
| **Block-level Text/Background rows folded into the panel** | `notice-banner/`, `quote/`, `product-card/` (+`testimonial-slider/edit.js` comment) | Done for 3 of 5 |
| **Block Build Status rows** | `plugins/sgs-blocks/CLAUDE.md` | Done (earlier in session, same blocker) |

**Verified:** all 5 changed `edit.js` babel-parse clean · all 6 changed `block.json` valid ·
`check:element-manifest` style-defect **7/7** and state-without-base **1/1** — exactly the
pre-change baseline, **zero new findings from this work**.

⛔ **`testimonial-slider` and `process-steps` were deliberately NOT changed** — and the agent was
right to stop. Both declare a `states.hover` whose BASE resolves via `attrMap: native:color.*`, so
switching the native flag off breaks the element-manifest gate (state-without-base 1 → 5) even
though `render.php` still paints correctly. Fixing those two needs the manifest's native-base
resolution addressed first — a real design question, not a flag flip. Both fully reverted.

### Why it couldn't commit (not this work's fault)

The **shared, machine-global** `sgs-framework.db` has `*ShadowColour` attributes seeded into it by
the concurrent shadow-extension session. That session's **branch** declared those attrs in
`scripts/behavioural-analyser/css-property-classifications.json`; **`main` does not**. So on `main`
the F5/db-consistency gate compares a DB that HAS them against a classifier that DOESN'T →
violations, and **every commit touching `plugins/sgs-blocks/` on `main` is blocked**.

⚠ **The branch then VANISHED mid-session.** `feat/universal-shadow-extension` was deleted locally
AND on the remote by that session. Its commit `7f289f3b` still exists as a dangling object but is
**not on `main`**. Violations also went **10 → 16** in that window (stable at 16 across a 20s
re-sample, so that session is paused, not mid-write).

**Bean had approved merging that branch — the approval was NOT acted on, because the branch it
referred to no longer exists.** Merging a dangling commit whose author just un-published it could
clobber a rework in progress. That decision is Bean's to re-make with current facts.

⛔ **Do NOT `--no-verify` these.** It switches off gitleaks, cheat-gate, F5/F6, block-uniformity and
the visual-diff gate to route around one unrelated failure. The custom `SGS_VISUAL_GATE_SKIP` bypass
(commit `02de11fd`) does NOT help — it is scoped to the visual-diff gate only; the F5 hook in
`.githooks/pre-commit` honours no env skip at all, verified by reading its source.

## Blockers

- **None from this session's own work.** Every gate was green when this session's 4 commits
  landed (build exit 0, cheat-gate 0 new, element-manifest GATE PASS at baseline).
- ⛔ **`npm run build` is RED (exit 1) — NOT this session's doing.** F6/db-consistency reports
  **16 NEW violations** (was 10 earlier in the session), every one a `*ShadowColour` attribute
  (`cta-section.shadowColour`, `trust-bar.iconCircleShadowColour`/`badgeImageShadowColour`,
  `brand-strip.tileShadowColour`, `card-grid.cardShadowColour`/`shadowHoverColour`,
  `team-member.shadowHoverColour`/`cardShadowColour`, `info-box.shadowHoverColour`, …). Full
  mechanism in "Uncommitted work" above. **Do NOT try to fix these — they are not yours**, and do
  NOT `--update-baseline` them (that would absorb another session's unfinished work into this
  project's baseline permanently).
- ⚠ **The concurrent session's branch `feat/universal-shadow-extension` has been DELETED**
  (local + remote) after being pushed. Commit `7f289f3b` is dangling but reachable. **Its work is
  NOT on `main`.** Do not resurrect it by hash without asking Bean — the author un-published it
  and may be reworking.
- 📌 **12 of this session's files sit uncommitted and verified** — see "Uncommitted work" above.
  They are finished; the blocker is environmental, not quality.

## Open — ready to pick up

### ⭐ NEXT SESSION — orchestration plan

**You are the SGS framework engineer.** Track A of the colour programme is complete and four
residual fixes are done-but-unlanded. **Task 0 is unblocking and committing them — do that before
anything else**, because they will rot or be clobbered while the tree stays dirty on a shared
checkout.

---

## Task 0 — Unblock and land the 12 uncommitted files ⛔ DO THIS FIRST

**What:** Get the F5/db-consistency gate green, then commit the 4 finished fixes + the plugin
CLAUDE.md rows.
**Why:** Verified work sitting in a dirty tree on a SHARED checkout is the single most losable
thing in this repo right now.
**Estimated time:** 10 min if the shadow work has landed; a short conversation with Bean if not.

**Orchestration:** inline, main thread. Do NOT delegate — this is a judgement call about another
session's work, not a mechanical task.

**Sequence:**
1. `git status` + `git log --oneline -5` + `git branch -a` — establish what changed overnight.
2. `cd plugins/sgs-blocks/scripts && python db-consistency/run.py --check` — is F6 green now?
3. **If GREEN** (the other session landed its classifier update on `main`): commit the 12 files
   as one commit, every gate active, no bypass. The full rationale for each fix is in
   "Uncommitted work" above — reuse it in the commit message.
4. **If STILL RED**, do NOT force it. Check whether `feat/universal-shadow-extension` was
   re-pushed (`git branch -a`) or whether `7f289f3b` landed on `main` some other way. Then put
   the options to Bean: merge the shadow work (if it's genuinely back and its author is done),
   or wait. ⛔ Do not `--no-verify`, do not `--update-baseline`, do not merge a dangling commit
   unilaterally.

**Acceptance:** `git status` clean of these 12 files, every commit gate passed on its own merit
(no bypass token), and `check:element-manifest` still at style-defect 7/7 / state-without-base 1/1.

---

## Task 1 — Colour-panel Track B (the 6 shared-wrapper blocks)

**What:** Migrate the colours owned by `ContainerWrapperControls.js` (`backgroundOverlayColour`,
`shapeDividerTopColour`/`BottomColour`, `gridItemBackground`, `gridItemTextColour`) onto
`SgsColourPanel`, reaching `container`, `cta-section`, `hero`, `trust-bar`, `site-header`,
`site-footer`.
**Why:** The last blocks where a client still finds colour in a different place. Completes the
client-facing outcome the whole track exists for.
**Estimated time:** ~1 session.

**Orchestration:**
- Execution: **design gate FIRST, then delegated**
- ⛔ **Do NOT dispatch straight into a rollout.** These 5 attributes are declared once in a
  SHARED component and reach 6 blocks (~29 wrapper consumers total) — Rule 7 (shared mechanism,
  high blast radius) requires Bean's approval on the shape before building. Track A's per-block
  recipe does NOT transfer unexamined: there is no per-block `block.json` to edit for these.
- Model: re-run `/delegate` after the design gate — shape is not yet known.
- Brief: read D618/D619/D621/D622 + `parking.md` `P-COLOUR-PANEL-TRACK-B-SHARED-WRAPPER`.
- Context they won't have: `ContainerWrapperControls.js` is ALSO being actively edited by a
  concurrent session (the shadow-extension work) — **check `git status` and coordinate before
  any agent touches that file.** Two writers on it is the known failure mode.
- Depends on: none · Parallel with: none (single shared file)
- **/qc gate after: yes** — live swatch-pick per block, not DOM structure alone.

**Acceptance:** all 6 blocks' wrapper colours in the Styles-tab Colour panel, `linked: true`,
a real swatch pick verified live on at least one composite, zero new element-manifest findings.

## Task 2 — The `native:color` manifest-base problem (the one real design question left)

**What:** `testimonial-slider` and `process-steps` still show WP's native Text/Background controls
alongside the SGS Colour panel, and could NOT be switched off like the other three. Both declare a
`states.hover` whose BASE resolves via `attrMap: "native:color.text"` / `"native:color.background"`,
so `check-element-manifest-conformance.js` fails that resolution the moment the native flag goes
`false` (state-without-base 1 → 5) — even though `render.php` still paints correctly.
**Why:** It is the last thing standing between the client and one single colour surface everywhere.
It is a genuine question about how the manifest expresses "the base state lives in native supports",
not a flag to flip.
**Estimated time:** design call, then small.

**Orchestration:** design gate (Bean picks), then inline. Depends on: Task 0. **/qc gate after: yes.**
**Acceptance:** goal-shaped — those two blocks show ONE colour surface, and the element-manifest
gate passes on its own merit rather than by keeping a duplicate control alive.

⭐ **Related, worth raising in the same conversation:** `audit-css-element-drift.py` only detects
*undeclared* element names — a **declared-but-wrong** value passes clean. That is exactly how hero's
three-way mis-attribution survived until it was found by hand this session. Extending the audit to
cross-check each `attrMap` claim against the selector its attribute actually emits to is the real
systemic fix, and would have caught hero automatically.

## Task 3 — Custom gradient bar (per-stop palette linking)

**What:** Build the gradient bar with palette-linked stops.
**Why:** Kadence + Spectra both ship per-stop palette already; this is catch-up, not
differentiation.
**Estimated time:** own session.

**Orchestration:** delegated after a design gate. **The prerequisite already landed** — core's own
gradient bar imports the exact `ColorPicker` module now forked into `src/components/colour-picker/`,
so the shared dependency is SGS-owned. Note core's bar deliberately offers NO palette swatches for
stops, so per-stop palette linking is genuinely new work, not a port.
Depends on: none. **/qc gate after: yes.**
**Acceptance:** a client can pick a theme palette colour for an individual gradient stop and a
brand-palette change re-colours it.

---

## Dependency graph

```
Task 0 — unblock + land the 12 uncommitted files    ⛔ FIRST, blocks everything
   |
   +-- Task 1 — Track B (the main event; design gate before any dispatch)
   |
   +-- Task 2 — native:color manifest base (design call, then small)
   |
   +-- Task 3 — gradient bar (own session, independent)
```
**Task 0 gates the rest** — not because of a code dependency, but because a shared checkout with 12
verified-but-uncommitted files is the state most likely to lose work. Tasks 1-3 are independent of
each other once it's clear.

## Methodology guardrails (do not skip)

- **A ruling in `decisions.md` + a "shipped" line in a status doc is NOT evidence the code
  changed.** D621 was ruled, summarised as shipped, and had never been written. Read the code.
- **Verify what a commit ACTUALLY contains** — `git show --stat HEAD` / `git show HEAD -- <file>`
  — because `git commit -- <paths>` re-stages the working tree over a partial `git add -p`.
- **A subagent's explanation of a failure IT caused is the least reliable account of it.** One
  agent called its own real syntax error "a transient collision"; three siblings reported it
  correctly. Verify causes independently, not just "fixed" claims.
- **Dispatch a second opinion BEFORE building a fix-shape, not after.** Tonight's review
  overturned two of my diagnoses pre-dispatch. A coherent-sounding fix is not a verified one.
- **This checkout is SHARED and the branch can change under you mid-session.** Re-run
  `git branch --show-current` + `git status` immediately before every commit.
- **Verify on the real editor, not the DOM alone** — a swatch that opens is not a swatch that
  applies.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** ⛔ **VERIFY — this drifted mid-session.** My work is on `main`; a concurrent session
  created `feat/universal-shadow-extension` and left HEAD there. Run `git branch --show-current`
  AND `git status` before anything.
- **D-ceiling:** **D631** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep has reported a hex colour as the ceiling before).
- **`main` HEAD:** `0c287cf6` + this handoff's doc commit. ⛔ Verify.
- **Build:** ⛔ **currently exit 1** — 10 NEW F6 violations, all `*ShadowColour` attrs from the
  concurrent shadow-extension session's shared-DB seeding (see Blockers; not this session's work,
  do not chase). **At the time this session's own commits landed it was exit 0**, with cheat-gate
  18 baselined / 0 new and element-manifest GATE PASS (style-defect 7/7, state-without-base 1/1).
  `handoff-preflight.py --check` 9/9 pass (doc gates, unaffected).
- **DB snapshot (pre-reseed, tonight):**
  `~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-16-pre-reseed`. Rollback is one `cp`.
  ⚠ The real DB lives at `~/.agents/skills/sgs-wp-engine/` — there is a **0-byte decoy** at the repo
  root (`sgs-framework.db`); `dev-setup.md` documents the real path. I snapshotted the decoy first.
- **Canary:** sandybrown. Every throwaway test page created tonight was deleted (2441, 2443, 2445,
  2446 — none left live).
- **Playwright MCP:** worked fine tonight. One stuck `beforeunload` dialog blocked navigation twice —
  `browser_handle_dialog` clears it; no need to fall back to Chrome DevTools MCP.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101 — 224 entries) |
| Colour programme — full history, Track A/B split, wave detail | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2d |
| D627-D631 (this session) + D609/D617-D622 (colour architecture) | `decisions.md` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (Parts A3/H/I/M updated tonight) |
| Control-type contract (colour §1, link §2) | `.claude/plans/spec-35-control-type-contract.md` |
| Open deferred work (4 entries added tonight) | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **2 blocks (not 7) still keep native `supports.color` alongside the SGS panel** —
  `testimonial-slider` and `process-steps`, both blocked by the `native:color` manifest-base problem
  that is now **Task 2**. `notice-banner`, `quote` and `product-card` were fixed this session
  (uncommitted); `testimonial` and `option-picker` already had their flags off.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
- **SonarCloud Security Rating C** on PR #27's new code — never resolved, merged on Bean's
  instruction with the gate red. Worth reading before the next merge.
