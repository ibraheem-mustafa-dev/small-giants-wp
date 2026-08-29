# Next session — timeline: four decisions, one design gate, one unmeasured breakpoint

**Written 2026-08-29.** Supersedes `2026-08-30-timeline-connector-stage-b.md`, deleted in the
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

## What shipped 2026-08-29 (all deployed, live-verified, pushed)

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

### Q3 — Spark density and travel (R-31-13)

Contrast measured 1.04 → 2.13:1 and the sparkler emits on the line at the head. **Nothing has
signed off the feel.** Three knobs, one number each: `--sgs-timeline-spark-size` (6px),
`--sgs-timeline-spark-life` (520ms), and `EMIT_EVERY_MS` (45) in `view.js`.

⚠ Headless Chrome CANNOT confirm a spark is legibly painted (see trap 2). Bean's eye is the only
instrument here.

### Q4 — Should the viewport reveal get the same no-JS protection?

The connector reveal hides entries behind `.is-js`, so a broken script shows everything.
Measured: opacity 0 with JS, 1 without. **The older viewport reveal keys on the
`data-reveal-on-scroll` ATTRIBUTE instead**, so with JS disabled its entries stay hidden forever.
Re-keying it trades a hidden-forever bug for a flash-then-hide one. That is a judgement call, not
a tidy-up.

---

## Then build, in this order

### 1. Measure mobile at 375px — the one gap in yesterday's verification

The `@media (max-width: 767px)` rules for milestone media are written and compiled but **never
measured**. Below 768px the two-sided grid does not exist: odd and even rows get identical rules
and the date drops BELOW the content, so "the date's side" has no meaning. `under-date` should
collapse to a full-width media at row 3; `date-over-media` should stay an overlay.

Check all three alignments plus both placements on page 3079. Use the settle-loop. Open the
screenshots.

### 2. Branching connectors + sparks down each branch — DESIGN GATE ONLY, no code

Bean's ask, deferred by agreement. It changes the rendering primitive.

⛔ **The no-JS SVG route is closed.** A unit `viewBox` stretched non-uniformly defeats
`pathLength="1"` (dashes resolve in screen space), doubles the stroke, and sized the SVG
2px × 2px. Spec 31 QC correction C9's escape hatch is dead. Expect `offset-path` +
`offset-distance` for anything riding a curve, and budget a `ResizeObserver` regenerating `d`.

Run `/brainstorming` in design mode, then `/qc-council` on the fix-shape. **The deliverable is a
signed design gate, not code.**

---

## Two things NOT from this track — do not adopt them

**`main` is currently RED on two gates, both from the Shape-B border track's `0ea1143ad`:**

1. `check-render-undefined-vars` — `pricing-table/render.php:414`, `$pt_border_args` in `empty()`
   always exists and is always falsy. A real bug. The gate's own text says do not baseline it.
2. `check-editor-render-parity` CHECK A — 178 against a ceiling of 177. The net-new finding is
   `sgs/pricing-table pricingTableStyle`, the attribute that commit introduced.

**These block every track's next deploy.** The DB-parity failure from the same commit is already
fixed (a `--stage 1` reseed; parity back to 309 pairs).

`sgs/timeline`'s own CHECK A finding is the pre-existing `borderColourGradient` alone.

---

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
