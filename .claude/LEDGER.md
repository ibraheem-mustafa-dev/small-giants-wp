---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-08
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## FOR BEAN — plain English (read this first)

**Where 2026-08-08 (evening) left things:**

- **The inspector work has a DESIGN now, and you approved every decision in it.** Nothing is built.
  The next session's first job is amending the contract that caused the mistake below.
- **I sorted 8 blocks' panels into Settings/Styles on the wrong model and you rejected it.** The
  Styles tab ended up crammed. Your model: only root styles that touch no single element go in
  Styles; element styles group with that element's content in Settings. The 8 blocks are
  **superseded, not reverted** — reverting would restore the worse single-tab problem.
- **The cause was a DOC, not just me.** The control-type contract literally says "behaviour →
  Settings, appearance → Styles". That is the rule I followed and it is wrong. Amending it is
  Phase 0, or the next session repeats the mistake from the same source.
- **Your blocks already describe themselves properly** — all 83 declare an element map (283 elements)
  with names, order, which CSS each part owns, and hover *inside* the element. The inspector ignores
  all of it and gets hand-written. Building it FROM that map is the whole design.
- **Two measurement bugs found, both the same shape** — something that always returned the same
  answer and therefore looked healthy. Your Motion Diagnostics page has reported "0 KB" for every
  page since it was built. And my own first editor check would have passed a block I never touched.
- **A 4-rater council corrected my own figures** — the fourth-quadrant count is **243**, not the 262
  I reported earlier in the session.

**Full narrative:** `memory/session-2026-08-08*.md`.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D532** (rule 21
> triaged 280→243; WordPress core is a second structurally-invisible control surface).

### ⭐ Track 1b (Spec 35) — DESIGN APPROVED, build not started

**`.claude/plans/2026-08-08-element-driven-inspector-design.md` is the live front.** All three open
questions answered by Bean 2026-08-08. Phase 0 (contract amendment) is the next action.

The design in one line: **render the inspector FROM `supports.sgs.elements` instead of hand-writing
it per block.** Element → one panel in Settings holding its content + styles + hover, named and
ordered by the declared `label`/`order`. No element → Styles tab.

Bean's decisions, all recorded in the design doc:
1. **Background** — flat colour with alpha + gradient, colour layer painting ABOVE media so opacity
   IS the overlay. One concept. cta-section's 4 fixed gradients deleted.
2. **Universal hover system goes** ("worse than useless"). ⛔ **48 blocks rely on it SOLELY** —
   capability lands before removal, per block, never a silent loss.
3. **POC = `sgs/hero`** (9 elements, genuine root/element mix), not button.
4. **`contentAttrs` = generate and review**, hero first, unresolved elements reported not guessed.

### Track 1b enforcement — shipped this session

- **D532: rule 21 triaged 280 → 243 real** across 32 of 83 blocks. Four false-positive classes; one
  fixed in the rule (WordPress core's own controls, a second invisible surface sibling to the
  extension axis), three baselined with checkable reasons. ⚠ **A 4-rater council then falsified two
  of my own claims** — read D532's CORRECTED section, not the paragraphs above it.
- **Extension tab placement fixed** (`9169d546`) — 3 files fix placement on all 83 blocks at once.
  Verified live. ⚠ This part survives Bean's rejection; it is root-level, not per-element.
- **Scanner can now see `src/blocks/extensions/`** — the unbuilt prerequisite the contract named.
  Plumbing only; every rule's count identical before/after.
- **Batch A tab split (`dfba396b`) — SUPERSEDED.** Re-derived by the design, not reverted.

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phases 0-3 done, Phase 4 PARTIAL, 5 OPEN.
  `scalar-media` still not retirable (residual child block). Registers:
  `reports/2026-08-02-pipeline-routing-review.md`.
- **Track 1c** (Spec 31 converter completion) — build shipped; open item is PROOF not build,
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
  `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed · Snooza = 72 SKUs.

---

## State Snapshot

- **Branch:** `main` at `d69130fc`. **Shared worktree** — another track holds uncommitted files
  (`includes/lucide-icons.php`, `reports/phase4-*`). Commit by EXACT PATH, never `git add -A`.
- **Build:** `npm run build` exit 0, all prebuild gates passing.
- **Scanner:** self-test passes. `01-tab-group` 57 · `21-render-without-control` 243 FLAGGED + 12
  BASELINED.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` · `git status` ·
  `git branch --show-current` · D-ceiling
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (heading-anchored — the unanchored form once matched hex colour `#0D5557` and reported D5557).
- **Sites:** dev = palestine-lives.org · canary = sandybrown-nightingale-600381.hostingersite.com.
  ⚠ **Canary is WP 7.0.3** (read from `wp-includes/version.php` 2026-08-08) — the long-standing
  "both on 7.0.2" line was stale.
- **Canary credentials:** `.claude/secrets/sandybrown.env` (gitignored, always available).

---

## ⭐ NEXT SESSION — orchestration plan

**Identity.** SGS framework engineer. The inspector design is approved; you are building it,
starting with the doc that caused the last mistake.

### Task 1 — Phase 0: amend the contract (INLINE, Opus)

**What:** `.claude/plans/spec-35-control-type-contract.md` §6 field 4 says "behaviour → Settings;
appearance → Styles". Replace it with the design's §2.1 model. Update CO-2 to match. Add
`contentAttrs` to the element schema.
**Why:** this exact sentence is what produced the rejected split. Until it changes, the next session
reads it and repeats the mistake.
**Acceptance:** contract §6 + CO-2 state the element-scoped model; a fresh reader could not derive
the old rule from the doc. ~20 min.
**Gate:** Bean sign-off before Task 2.

### Task 2 — Phase 1: background capability (INLINE, Opus)

**What:** flat colour with alpha + gradient + **media opacity** in the SGS background panel; colour
layer paints above media; opacity is the overlay. Delete cta-section's 4 fixed gradients.
**TWO real gaps, both must be built: FLAT COLOUR and MEDIA OPACITY.** The panel already has overlay
opacity, gradient from/to pickers, parallax and Ken Burns — but `sgs/container` declares only
`backgroundOverlayOpacity` and `bgSvgOpacity`; there is no media opacity at all. ⚠ An earlier draft
of this plan claimed media opacity existed: the `Opacity (%)` label sits after `bgSvgPosition`
(`ContainerWrapperControls.js:978`) and is the **SVG** control. Caught by handoff QC.
**⛔ Still verify before writing:** current paint order, and whether the overlay is gated on media.
**Why:** flat colour lives ONLY in the native Color panel today, so nothing native can be stripped
until this lands.
**Acceptance:** live editor on the canary (R-31-11) + Bean's eye. ~1h.

### Task 3 — Phase 2: hero POC (INLINE, Opus — Bean's eye is the gate)

**What:** hero's inspector rendered from its element map. Root elements (`wrapper`, `grid`,
`content-band`, `content`, `grid-item`) → Styles. Element panels (`media`, `headline`,
`sub-headline`, `cta`) → Settings with content + styles + hover together.
⚠ `sub-headline` and `cta` have EMPTY `clusters` — enrich them as part of this.
**Acceptance:** Bean looks at it and says yes. A green scanner does NOT close this (R-31-13).

### Task 4 — Enforcement rules (DELEGATED, Sonnet, parallel with Task 3)

Five scanner rules, advisory, each with a must-flag + must-not-flag fixture pair:
`native-duplicates-custom` · `element-panel-conformance` · `hover-not-inline` ·
`universal-hover-colour` · `panel-order` (closes CO-28 with data).
**Acceptance:** self-test passes; every rule provably able to fail.

### Dependency graph

```
Task 1 (contract) ──► Bean sign-off
        ↓
Task 2 (background)  ──►  Task 3 (hero POC) ──► Bean's eye
                              ║ parallel
                          Task 4 (rules, Sonnet)
                              ↓
                    commit by exact path, main
```

### ⛔ Do NOT start these

- **Stripping native `color`/`border` supports** (**27** and 48 blocks) — blocked until Task 2 ships
  flat colour AND media opacity, else every block loses backgrounds. ⚠ The colour figure is 27, not
  the 38 written earlier today; 38 came from a loose regex and did not reproduce under any
  derivation. The governing predicate: declares `supports.color.background|.text` AND maps
  `css:color`/`css:background-color` to a non-`native:` attr in its element map.
- **Deleting the universal hover extension** — blocked until element hover exists; 48 blocks rely on
  it solely.
- **Re-sorting the 8 batch-A blocks by hand.** They are re-derived by the model or not at all.

---

## Methodology guardrails (every one was earned — do not skip)

- **Confirm the MODEL with Bean before applying it to N blocks.** 2026-08-08: I sorted 8 blocks'
  panels on a rule from a doc, never checked the intent, and Bean rejected all of it. A rule that
  scopes every block is a Rule 9 decision, not an implementation detail.
- **A measurement that always returns the same answer may be measuring nothing.** Two found in one
  session: Motion Diagnostics reported 0 KB for EVERY page since it was built (a regex assumed
  attribute order), and my first editor check passed blocks I had never touched. **Build a POSITIVE
  control before trusting any zero or any pass.**
- **Confirm WHAT a value describes before building on it.** I read an `Opacity (%)` label in a grep
  and reported "media opacity exists"; it was the SVG control two lines below `bgSvgPosition`. The
  next session would have skipped building a capability Bean needs.
- **State the predicate with any derived count.** "38 blocks" came from a regex matching any mention
  of colour; the real figure under a stated predicate is 27, and three other plausible predicates
  give 55, 30 and 2. A count without its derivation is not reproducible and will be wrong.
- **A doc rule can be the defect.** Fix the source sentence, not just the instances it produced.
- **A capped search proves presence, NEVER absence.** Re-run unbounded before writing "X does not
  exist".
- **A grep count is not a measurement, and provenance is not derivation.** Re-derive; never relay an
  agent's number over your own.
- **Detect by what a control DOES, not what it is called.** Every gate keyed to a component name has
  a blind spot by construction.
- **A gate can exist and be wired to nothing.** Grep the WIRING, not the file.
- **A commit that "succeeds" in terminal output can be silently BLOCKED** by the visual-diff gate —
  a `tail -N` hid the reason twice. Verify HEAD via `git log -1`, never the reported hash.
- **Editor-only block changes still trip the visual-diff gate.** Write an honest report stating
  render.php is untouched + recompute `source_sha`; never `--no-verify`, never a fabricated PASS.
- **Rewriting a repo file? `newline=""` on read AND write** — Python text mode turns CRLF into LF and
  a small sweep ships as a whole-file diff.
- **Shared worktree:** stage AND commit by EXACT PATH; never `git add -A`, never `git stash`.
- **Re-check the D-ceiling before writing any D reference**, heading-anchored.
- **Verify at FIRST PAINT**, test the RETURN path (A→B→A), assert on measured `window.innerWidth`.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| The live design | `plans/2026-08-08-element-driven-inspector-design.md` |
| Control-type contract (⚠ §6 field 4 is WRONG until Task 1) | `plans/spec-35-control-type-contract.md` |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |
| Prior sessions | `memory/session-YYYY-MM-DD*.md` |

## Blockers

**NONE for Track 1b.** `--target palestine-lives` still aborts on `oldshape-audit`, but that site is
disposable Indus staging that gets remade — it blocks nothing that matters. The canary is current
and deploying cleanly (verified 2026-08-08).

## Open — carried, not ours to close

- ⚠ **Track 2's canary (post 2164) lost a text node** 2026-08-07 — `sgs/mega-group`'s
  `templateLock:'all'` dropped a stored `sgs/text` child. Track 2 should re-count text-owning nodes.
- **Residual empty `sgs/media` ChildBlock** in the art-direction walk (D514), emitter untraced.
  Blocks the `scalar-media` retirement.
- **Non-colour hover effects** (`sgsHoverScale`/`Shadow`/`ImageZoom`/`Grayscale`) survive the
  extension's deletion as a capability — placement decided (design §10.1), build not scoped.
