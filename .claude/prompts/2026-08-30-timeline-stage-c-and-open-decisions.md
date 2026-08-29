# Next session — timeline: verify an unseen fix, four decisions, one design gate

**Written 2026-08-29, revised the same evening after two more sparkler defects and a
re-measure of the gate state.** Supersedes `2026-08-30-timeline-connector-stage-b.md`, deleted in the
same commit — that prompt's tasks all shipped. Invoke `/autopilot` first. Bean is QC-only: put
every open question to him in ONE opening message, then build while he considers them.

---

## READ THIS BEFORE ANYTHING ELSE

**Six tracks share `main`.** Commit with explicit paths (`git commit -- <paths>`), never
`git add -A`. Re-check the branch inside the commit command. `git commit --amend` flushes the
whole index whatever pathspec you gave it.

⛔ **Never `git stash` here.** A peer's stash swept every session's uncommitted work on
2026-08-28; someone then dropped the ref. 553 lines survived only as a dangling commit.

⛔ **Never `git checkout -- <your own file>`.** It reverts to the last commit and takes any
unrelated uncommitted fix in that file with it. That destroyed a spark fix on 2026-08-29.
Commit first, or copy to the scratchpad, then revert.

⛔ **Another track's `git add -A` WILL sweep your uncommitted file into THEIR commit.** It
happened on 2026-08-29: a scoped `git commit -- <my file>` returned "no changes added" because
`9a69d60b5 fix(border): …` had already taken it, along with 19 other files. The code survived
intact, but the commit message explaining it did not — so the reasoning had to be written into
the visual-diff report instead. **Commit early and often; and if a scoped commit reports nothing
to commit, check whether HEAD moved rather than assuming you had no change.**

⛔ **`.git/index.lock` collides when several tracks commit at once.** Retry in a loop; NEVER
delete the lock. It took five attempts on 2026-08-29.

⛔ **Long prose through a `cat <<EOF` heredoc FAILS in the Bash tool.** Use the Write tool, then
`cat` the file. This bit again on 2026-08-29.

⛔ **`build-deploy.py` prints `ABORTED` and still exits 0.** Read its output. Never trust the
exit code. It happened twice on 2026-08-29.

⛔ **Declare your payload:** `--payload plugins/sgs-blocks/src/blocks/timeline/`. Never
`--allow-dirty` (that flag took two client sites down for 2.5h, D336).

---

## ⛔ THE TWO INSTRUMENT TRAPS THAT COST 2026-08-29

Both produced confident, self-consistent, WRONG numbers. Both are now in CC memory. Read them
before you measure anything.

**1. Lenis animates every scroll.** This framework ships Lenis smooth-scroll (`html.lenis`,
`scroll-behavior: smooth`), so `window.scrollTo()` does not land immediately and any read after
a fixed delay measures the WRONG position. It made the connector look frozen, made me declare
the milestone observer dead TWICE, and reported two probe sections as 0-of-4 and 1-of-4 revealed
when the truth was 4-of-4. Proof: a probe asked for ~1080, read `scrollY: 0`, and moments later
the same page read 1041.

⭐ **Wait for the scroll to STOP MOVING, never for a fixed delay:**

```js
window.scrollTo( { top: y, behavior: 'instant' } );
let last = -1, stable = 0;
for ( let i = 0; i < 60; i++ ) {
  await wait( 50 );
  if ( window.scrollY === last ) { if ( ++stable >= 3 ) break; }
  else { stable = 0; last = window.scrollY; }
}
```

⚠ `window.lenis.scrollTo` is NOT a function on this build.

**2. A scroll-driven custom property reads back as a STAIRCASE.** `getComputedStyle()` on
`--sgs-timeline-fill-progress` holds flat for 200-250px, then jumps, and reports `1` while the
block sits below the viewport. The paint is smooth; the value handed to JS is not. The reveal
keyed off that read fired three milestones at once. **Compute progress from geometry instead** —
`view.js`'s `computeViewProgress()` now does, and both drivers share it.

⚠ Related: a composited opacity/transform animation reports its BASE value in headless Chrome,
so a spark that paints correctly reads `opacity: 0`. **Open a screenshot before any visual
verdict.** Every real defect on 2026-08-29 was caught by a screenshot or by Bean, never by a gate.

---

## What shipped 2026-08-29 — deployed and live-verified EXCEPT the last item

Six commits, `1014fc9d8` → `18396d152`. Probe page **3079**,
`/probe-timeline-milestone-media-stripes-connector-reveal/`, eight sections including a
no-features control. Full evidence: `reports/visual-diff/timeline-2026-08-29.md` (four addenda).

- **Milestone media** — image, video or SVG per milestone, on the date's side. Two placements:
  under the date, or the date over the media. Reuses `sgs_tier_media_render()` with one desktop
  tier.
- **A/B row bands** — measured rows 1/3 transparent, rows 2/4 `surface-alt`.
- **Reveal as the connector arrives** — one milestone at a time, measured 0→1→2→3→4.
- **Sparkler** — continuous emission from the travelling fill head; the milestone halo ring is
  no longer covered.
- **Reached milestones stay marked**, and the phantom `border-subtle` token is swept framework-wide
  to `border` (23 sites). The draft decided that, not preference.
- **`left` split from the date gutter** — `showDateColumn` is now its own toggle.
- **DB seeded** (`bd61e13a6`): all eight new attributes carry roles; the cloning pipeline can see
  them; `element-manifest-conformance` reports `UNCLASSIFIED: 0`.

⛔ **ONE ITEM IS IN `main` BUT NOT LIVE AND NEVER VERIFIED — two sparkler defects Bean caught
after the last deploy.** Both were real, both measured, both fixed:

  1. **Sparks sat 304px behind the head.** Measured: CSS fraction `0.931`, head at viewport
     y=644, first spark at y=340. The head is placed by CSS from
     `calc(var(--sgs-timeline-fill-progress) * 100%)`; the sparks were placed from a JS number.
     Now both use the SAME CSS expression, so they coincide by construction.
  2. **2 of 8 timelines burned at once**, each with its own rAF loop. One page-level coordinator
     now elects a single active timeline per frame (head on screen, nearest the viewport centre).

  ⚠ **A DELIBERATE SPLIT — do not "unify" it.** Spark POSITION comes from CSS; the reveal and
  reached-state decisions still come from geometry (`computeViewProgress()`). Each uses the
  source that is correct for it: CSS is where the head actually is, geometry is continuous where
  the property read is stepped (trap 2). Making both use one source reintroduces one of the two
  bugs, whichever way you go.

  **This could not be deployed** — the border track was mid-repair with 18 uncommitted
  `render.php` files, so `build-deploy` refused with `deployed-files-dirty`. Verified at the
  compiled level only. Rationale + measurements: `reports/visual-diff/timeline-2026-08-29.md`
  Addendum 5.

---

## Open the session with these four questions

### Q1 — `centre` now duplicates `left`. Retire it, repurpose it, or keep both?

Measured live: `left` puts date and content both at `32→1425` with the rail at x=9; `centre`
does the same with the rail at x=17. Identical column spans, rails 8px apart.

`centre` was ALWAYS the rail-left single-column pattern — node in column 1 spanning both rows,
date row 1 and content row 2 in column 2. It is not centred and never was. Fixing `left` moved
the duplication rather than removing it.

⛔ **Do not resolve this alone.** Retiring or repurposing an alignment value changes stored
content on every page using it.

### Q2 — Does the align-left rail need fixing when there is NO media?

With media, the rail now derives from the grid and lands on the dots (measured: rail 205, node
204). Without media, column 1 is `auto`, no expression for its width exists, and the rail keeps
its old position — **the original 107px misalignment survives there**. Fixing it means giving
the date column an explicit width, which changes how a long date string wraps.

### Q3 — Spark density and travel (R-31-13), AFTER the owed verification below

Contrast measured 1.04 → 2.13:1. **Nothing has signed off the feel**, and two
sparkler defects were fixed late on 2026-08-29 that have never been seen live —
so verify first (see "Owed" below), then ask.

Three knobs, one number each: `--sgs-timeline-spark-size` (6px),
`--sgs-timeline-spark-life` (520ms), and `EMIT_EVERY_MS` (45) in `view.js`.

⚠ Headless Chrome CANNOT confirm a spark is legibly painted (see trap 2). Bean's
eye is the only instrument for the LOOK.

### Q4 — Should the viewport reveal get the same no-JS protection?

The connector reveal hides entries behind `.is-js`, so a broken script shows everything.
Measured: opacity 0 with JS, 1 without. **The older viewport reveal keys on the
`data-reveal-on-scroll` ATTRIBUTE instead**, so with JS disabled its entries stay hidden forever.
Re-keying it trades a hidden-forever bug for a flash-then-hide one. That is a judgement call, not
a tidy-up.

---

## Then build, in this order

### 1. FIRST — deploy, then verify the two unverified sparkler fixes

Nothing else on this list is worth doing while a fix sits in `main` unseen. Both checks are one
probe each, and both have a hard number to beat:

- **Spark vs head co-location.** They were **304px** apart. Read the head's painted y as
  `progressEl.top + cssFrac * progressEl.height` and compare against a live spark's centre. They
  should now sit within a few px. ⚠ Sparks live ~520ms — catch one mid-life, and remember a
  composited animation reports its BASE opacity here, so judge POSITION, not opacity.
- **Exactly one timeline emitting.** It was **2 of 8**. Park mid-page with several timelines on
  screen, jiggle the scroll to force emission, and count roots with live
  `.sgs-timeline__spark` children. The answer must be 1.

⛔ **The deploy is blocked until the two red gates named at the foot of this file are green** — they are not this track's
to fix, so check first and say so rather than working around them. Pay the visual-gate skip debt
logged for `timeline` once this is measured.

### 2. Measure mobile at 375px — the one gap in yesterday's verification

The `@media (max-width: 767px)` rules for milestone media are written and compiled but **never
measured**. Below 768px the two-sided grid does not exist: odd and even rows get identical rules
and the date drops BELOW the content, so "the date's side" has no meaning. `under-date` should
collapse to a full-width media at row 3; `date-over-media` should stay an overlay.

Check all three alignments plus both placements on page 3079. Use the settle-loop. Open the
screenshots.

### 3. Branching connectors + sparks down each branch — DESIGN GATE ONLY, no code

Bean's ask, deferred by agreement. It changes the rendering primitive.

⛔ **The no-JS SVG route is closed.** A unit `viewBox` stretched non-uniformly defeats
`pathLength="1"` (dashes resolve in screen space), doubles the stroke, and sized the SVG
2px × 2px. Spec 31 QC correction C9's escape hatch is dead. Expect `offset-path` +
`offset-distance` for anything riding a curve, and budget a `ResizeObserver` regenerating `d`.

Run `/brainstorming` in design mode, then `/qc-council` on the fix-shape. **The deliverable is a
signed design gate, not code.**

---

## ⛔ MAIN IS RED — measured 2026-08-29 late, BOTH from the Shape-B border track

Re-measure before trusting this; the border track was committing every few minutes.
`npm run build` reports **2 of 73 gates failing**, and neither is `sgs/timeline`:

1. **`check-undeclared-attrs`** — 4 findings, all the same shape: `"style"` is
   destructured in `edit.js` but not declared in `block.json`, so WordPress
   silently discards it. Blocks: `before-after`, `product-faq-item`,
   `site-footer`, `site-header`. Fallout from their "free the reserved `style`
   key" work.
2. **`check-editor-render-parity` CHECK A** — 178 against a ceiling of 177. The
   net-new finding is `sgs/pricing-table pricingTableStyle`.

**These block every track's next deploy, including the sparkler verification below.**

✅ **Already FIXED, do not go looking for it:** `pricing-table`'s
`$pt_border_args` always-falsy bug and the 33 PHPStan findings from `a6428a781`.
The border track cleared them in `9a69d60b5`.

`sgs/timeline`'s own CHECK A finding is the pre-existing `borderColourGradient`
alone — one finding, not the overage.

## Standing rules

- **Deploy before you measure.** A test against undeployed code measures stale output.
- **Assert painted geometry**, not computed style. A style check cannot see a zero-area element.
- **Give every check a positive control.** "Correctly 0 when suppressed" proves nothing on its own.
- **Visual-diff report before any commit touching a block** (STOP-67), repo-root
  `reports/visual-diff/`. A report needs `source_sha:` — get it from
  `python plugins/sgs-blocks/scripts/visual-report-sha.py timeline`.
- **Announce before `/sgs-update`.** It is a shared-DB write. On 2026-08-29 another track
  committed mid-reseed and left three gates red.
- **Never restore a trashed fixture** (2023, 2114 carry pre-migration authoring). Author fresh.
- **A green measurement is not fidelity (R-31-13).** Bean's eye is co-authoritative.
