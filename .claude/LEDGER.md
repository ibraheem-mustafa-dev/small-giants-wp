---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-08
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## FOR BEAN — plain English (read this first)

**Where 2026-08-08 (late) left things:**

- **The background work is BUILT, live on the canary, and pushed.** You can set a flat background
  colour, and dim a background image without dimming the text on top of it. Both work on the
  published page AND in the editor.
- **You made the big call: SGS gets its own three tabs** (Content · Style · Advanced), like Kadence,
  Spectra and Stackable. It can't ship until we remove WordPress's own colour controls from 27
  blocks first, or you'd see our three tabs plus theirs. Removing those was blocked on the flat
  colour — which now exists, so that's unblocked.
- **WordPress core has NO rule for which tab a control goes in.** I read the Gutenberg source. That
  is why every attempt to apply "the rule" gave a different answer — there was never a rule. The
  competitors all built their own, which is why yours does too.
- **I've paused the next step on purpose.** The new model only decides where 46% of controls go; the
  other 54% land in a "block-level panel" I described in one line and never designed. On hero that's
  76 controls in one panel — the crammed tab you rejected, just moved. Designing that panel is the
  next job.
- **You caught me deferring verification instead of doing it.** I'd listed tier images, fixed
  backgrounds, video and the editor as "not covered". Testing them found a real bug: the editor
  ignored the new opacity control entirely, so a client would set 35%, see nothing, and get a dimmed
  image on the live page. Fixed.
- **The repo is clean for the first time in weeks** — nothing uncommitted, no stashes, no leftover
  worktrees. Two build scripts were rewriting tracked files on every single build, which is why
  genuinely abandoned files were indistinguishable from noise.
**Full narrative:** `memory/session-2026-08-08*.md`.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D536** (Phase 1
> background capability shipped + verified live).

### ⭐ Track 1b (Spec 35) — Phase 0 + Phase 1 SHIPPED. Phase 2 ON HOLD.

**Phase 1 (background capability) is DONE, verified live on the canary, pushed.** Phase 2 (hero POC)
is deliberately held — see the blocker below. Design doc:
`plans/2026-08-08-element-driven-inspector-design.md`.

**The placement rule, in one line (D533):** one panel per element, holding that element's content,
styling and hover together, titled and ordered by its own `supports.sgs.elements` declaration. **No
behaviour-vs-appearance question anywhere** — WP core has no such rule (verified in the Gutenberg
source: the Styles tab is a hard-coded list of native support categories, Settings is the `default`
group).

**⭐ Bean decision D535 — SGS owns a three-tab bar (Content · Style · Advanced)**, as Kadence,
Spectra and Stackable all do. ⛔ **It ships AFTER native-supports retirement**, or the client sees
three SGS tabs PLUS core's Styles tab. That retirement was blocked on the background capability,
which Phase 1 has now delivered.

#### ⛔ Phase 2 is ON HOLD — the model places under half the controls

A QC pass implemented the placement rule and ran it over all 83 blocks' real data: **46% of declared
attributes resolve to an element; 54% fall to a "block-level panel" the rule describes in ONE line
and never designs.** For `sgs/hero` that is **76 controls in one undefined panel** — the crammed tab
Bean rejected, relocated. Design the block-level panel BEFORE the hero POC, or the POC demonstrates
the problem rather than the fix. **`contentAttrs` is declared by ZERO blocks**, so the content half
of the model resolves for nothing yet.

#### Shipped this session

- **Phase 1 (D536)** — flat colour ungated (the overlay required media to exist, which is why flat
  colour lived only in core's Color panel); new `backgroundMediaOpacity`; media moved to a
  `.{uid}::before` layer so it can be dimmed without dimming content. **Editor fixed to match** —
  `edit.js` painted on the element, so the opacity control did nothing in the surface clients
  actually use. Verified live at 1440/768/375: tier swap (3 distinct images), `attachment:fixed`,
  video excluded correctly, and **tier + opacity together** (the tier override does not reset
  opacity — testing them separately would both have passed while the combination was broken).
  Evidence: `reports/visual-diff/container-2026-08-08.md`.
- **Phase 0 (D533)** — contract + spec 35 A3/A4 amended; all 13 `Tab` fields guarded; the
  `01-tab-group` scanner message and 4 extension comments no longer teach the retired rule.
  A 4-rater qc-council caught that the first pass fixed the rule's STATEMENT and left its
  DISTRIBUTION.
- **`wp-content-guard` is ADVISORY (D534)** — the ban protected static blocks; every SGS block is
  dynamic. ⚠ Qualified same-day: a slot-bearing composite DOES store its children, and a
  hand-written wrapper div made probe containers invalid in the editor while rendering fine on the
  frontend.
- **Repo cleared** — 0 dirty, 0 untracked, 0 stashes, 0 orphan worktrees. Both stashes were proven
  superseded before dropping. Two generators that dirtied tracked files on EVERY build were fixed;
  that churn is why orphaned files could not be told from build noise.

#### ⛔ Do NOT start these

- **Hero POC / rolling the model across blocks** — blocked on the block-level panel design above.
- **Deleting the universal hover extension** — 48 blocks rely on it solely; capability first.
- **Re-sorting the 8 batch-A blocks by hand** — re-derived by the model or not at all.

#### Next actions, in order

1. **Design the block-level panel** (what it is called, how many, what order). Unblocks Phase 2.
2. **Strip native colour supports** (27 blocks) — now unblocked by Phase 1. Per-block live verify.
3. **Generate `contentAttrs` for `sgs/hero`**, review it, then the POC.
4. Residual Phase 1: parallax MOTION unverified (the layer renders with `bgParallax` set; that is
   not the effect animating), Ken Burns, and cta-section's 4 fixed gradients + hardcoded scrim.

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

- **Branch:** `main` at `53f84d5c`. **Tree CLEAN** — 0 dirty, 0 untracked, 0 stashes, 0 orphan
  worktrees (cleared 2026-08-08). ⚠ The long-standing "shared worktree, another track holds
  uncommitted files" line was RETIRED: Bean confirmed this is the only active session, and every
  outstanding file was this track's own leftovers. Still commit by EXACT PATH — a pre-commit gate
  requires a pathspec — but the co-active-track premise is gone.
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

### Task 1 — Phase 0: amend the contract — ✅ DONE 2026-08-08, Bean-signed-off

**The rule is now ONE sentence:** *one panel per element, holding its content, styling and hover
together; panel title = `label`, order = `order`; hover inline beside the value it modifies.* No
behaviour-vs-appearance question anywhere. First draft was a 2-step scope test — **Bean: "you're
overcomplicating; there's precedent to model from"**, and he was right.

**⭐ Bean decision A1 — SGS owns a three-tab bar (Content · Style · Advanced)**, as Kadence, Spectra
and Stackable all do. ⛔ **It ships AFTER native-supports retirement** (27 blocks declare native
`color`, 48 `__experimentalBorder`) or the client sees our 3 tabs PLUS core's Styles tab. **Phase 1
(background capability) is still the first build.** Interim: element panels in Settings, native
supports in core's Styles tab.

**Research that settled it (primary sources, 2026-08-08):** WP core has **NO** semantic Settings/
Styles rule — the Styles tab is a hard-coded list of native support categories, Settings is the
`default` group. Kadence/Spectra/Stackable group composites by PART; Otter + Essential Blocks
converge on the same shape independently. Hover-inline-beside-base is unanimous incl. core's
`state-control.js`. **Nobody centralises panel order** → CO-28 stays open (Bean decision 2b); spec 35
**A8** marked OPEN as its sibling.

**Shipped:** contract §THE PLACEMENT RULE + §THE ELEMENT MANIFEST (schema of record, adds
`contentAttrs` + 5 binding conditions) · CO-2 rewritten · all 13 `Tab` fields now guarded · spec 35
A3/A4/A8 · `01-tab-group.js` fix-message (it was still instructing the retired rule) · 4 extension
comments that cited it as justification (routing unchanged — verified) ·
`check-element-manifest-conformance.js` docblock off the ARCHIVED schema doc.

**Verified:** `npm run build` exit 0, all prebuild gates incl. `inspector-scan --check` ·
manifest-gate output byte-identical to HEAD (1,214,034 B, same md5; broken-copy control → 0 B, so the
check can fail) · handoff-preflight 9/9 · every schema figure independently re-derived by a 4th rater.

**qc-council: 4 raters, verdict OK, 12 findings — all fixed or Bean-decided.** Two were the same
defect one level up: I amended the rule's *statement* and left its *distribution* (9 of 12 `Tab`
fields + the scanner's fix message still taught the old rule).

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
| Control-type contract (✅ placement AMENDED 2026-08-08 — see §"THE PLACEMENT RULE") | `plans/spec-35-control-type-contract.md` |
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
