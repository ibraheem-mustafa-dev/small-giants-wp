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

**Full narrative:** `memory/session-2026-08-15*.md` (auto-snapshotted at close).

## Shipped this session

| Commit | What |
|---|---|
| `aaa91c3e` | **Colour-picker fork (D627).** WP core's `ColorPalette`/`ColorPicker`/`CircularOptionPicker` (~29 files) forked from Gutenberg at pinned SHA `28c0dedc4eaf…` (WP 7.0.4) into `src/components/colour-picker/`. TS→JS, `@emotion/styled`→SCSS. New MIT deps: `react-colorful`, `colord`, `clsx`. No `framer-motion` (verified unused — no Spec 38 Tier-H conflict). Fixed the CSS-leak-into-frontend-bundle bug it introduced |
| `a5b74bd1` | **D621 actually coded (D628).** `SgsColourPanel` now `group="styles"`. Was ruled last session, summarised as shipped, never written |
| `f6f3c033` | **Wave 2 — 33 blocks (D629).** 16 parallel agents. Every colour state sets `linked: true` (D619). 17 blocks got live-captured `intent_capture_passed` visual-diff evidence; 16 auto-passed editor-only |
| `0c287cf6` | **Last 2 drift orphans closed (D630).** Manifest-only. Both original fix-shapes were wrong and were overturned pre-dispatch by an independent review |
| (this handoff) | Doc sweep: D627-D631, Spec 35 Parts A3/H/I/M, plan §1.2d, 4 parking entries, 3 STOP entries (221→224), 3 mistakes entries |

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

## Blockers

- **None from this session's own work.** Every gate was green when this session's 4 commits
  landed (build exit 0, cheat-gate 0 new, element-manifest GATE PASS at baseline).
- ⛔ **`npm run build` is RED right now (exit 1) — and it is NOT this session's doing.** Caught by
  the handoff's own QC gate re-running the build *after* my commits, which is exactly why that
  gate exists. **F6 reports 10 NEW violations, every one a `*ShadowColour` attribute**
  (`cta-section.shadowColour`, `trust-bar.iconCircleShadowColour`/`badgeImageShadowColour`,
  `brand-strip.tileShadowColour`, `card-grid.cardShadowColour`/`shadowHoverColour`,
  `team-member.shadowHoverColour`/`cardShadowColour`, …) — i.e. the **concurrent
  `feat/universal-shadow-extension` session's** in-flight work, seeded into the SHARED
  `sgs-framework.db` but not yet declared in the classifier layer. F6 calls them "rogue seeds
  that would vanish on the next reseed", which is precisely what a mid-flight shadow rollout
  looks like from outside.
  **Do NOT try to "fix" these — they are not yours.** The owning session either finishes its
  `extract-signatures.py` run or reseeds, and they resolve. Verify with
  `git log --oneline -3` + `git status` first; if that branch has since merged and F6 is still
  red, THEN it is a real regression worth chasing.
- ⚠ **A concurrent shared-wrapper session is live in this same checkout** and created branch
  `feat/universal-shadow-extension` mid-handoff. Its uncommitted work (7+ block `edit.js`/
  `render.php`, `ShadowControl.js`, `tokens.js`) is in the working tree — **not mine, not
  touched, do not commit it.** My work is all on `main`.

## Open — ready to pick up

### ⭐ NEXT SESSION — orchestration plan

**You are the SGS framework engineer.** Track A of the colour programme is complete. The next
piece is Track B — the same treatment for the six blocks whose colours live in the shared
wrapper — which Bean ruled must be its own session because it touches every composite at once.

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

## Task 2 — `sgs/social-icons` design decision (Bean picks, small)

**What:** Decide whether `social-icons` converts to custom colour attributes (joining the panel)
or stays on native WP colour supports.
**Why:** It was assumed to be a Track-A block all along; the DB census proved it has no custom
colour attrs at all, so it silently never migrated.
**Estimated time:** Bean's ruling, then <1h if it converts.

**Orchestration:** design gate, inline. Depends on: none. **/qc gate after:** only if it converts.
**Acceptance:** goal-shaped — either it renders its colours in the shared panel like every other
block, or `parking.md` records the ruling that it deliberately doesn't.

## Task 3 — Hero `object-position` element mis-attribution

**What:** One CSS property painting on ONE node currently carries **three different**
`css_element` names across its desktop/tablet/mobile attributes (`media` / `split-image` /
`split-media`). Hero's own `block.json` already admits part of this in a `_note`.
**Why:** ⭐ **The bigger point:** `audit-css-element-drift.py` only detects *undeclared* names — a
**declared-but-wrong** value passes clean. So tonight's "0 orphans" is a floor, not a census, and
the inspector-placement + colour-panel consumers reading that column are being fed known-wrong
values on hero.
**Estimated time:** ruling + ~1h, or longer if the audit is extended.

**Orchestration:** design gate first (which name is authoritative per attribute), then inline.
Depends on: none. **/qc gate after: yes** — plus consider extending the audit to cross-check
`attrMap` claims against the emitting selector, which is the actual systemic fix.
**Acceptance:** goal-shaped — one node's one property resolves to one element name, AND either
the audit catches the declared-but-wrong class or `parking.md` records why it can't.

## Task 4 — Custom gradient bar (per-stop palette linking)

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
Task 2 (ruling, minutes)     Task 3 (ruling + fix)     Task 4 (own session)
                    \              |                        /
                     +---- all independent of each other ---+
                                   |
                          Task 1 (Track B) — the main event,
                          needs its own design gate first
```
All four are independent. Task 1 is the substantive one; 2 and 3 are rulings that unblock small fixes.

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
- **7 blocks keep native `supports.color` alongside the SGS panel** (`notice-banner`, `quote`,
  `testimonial-slider`, `testimonial`, `option-picker`, `process-steps`, `product-card`) — the flags
  are load-bearing for a root-level `style.color.*` mechanism the migration doesn't replace. Not a
  defect; not fully single-surface either.
- **`nav-menu`'s `block.json` manifest comment is stale** — describes a hover/selected defect
  `render.php` shows was fixed 2026-07-31. Doc debt, not code debt.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
- **SonarCloud Security Rating C** on PR #27's new code — never resolved, merged on Bean's
  instruction with the gate red. Worth reading before the next merge.
