# Next session — timeline connector: milestone media, branching, and one inherited bug

**Written 2026-08-29.** Supersedes `2026-08-29-timeline-connector-stage-a.md` (deleted — Stage A
shipped and is live). Invoke `/autopilot` first. Bean is QC-only: batch every open question into one
message at the start, then work without interrupting him.

---

## READ THIS BEFORE ANYTHING ELSE

**Five tracks share `main`.** Commit with explicit paths (`git commit -- <paths>`), never
`git add -A`, and re-check the branch in the same command. `git commit --amend` flushes the WHOLE
index regardless of your original pathspec.

⛔ **NEVER `git stash` on this worktree.** A peer's stash swept every session's uncommitted work on
2026-08-28; the ref was then dropped by someone else. 553 lines survived only as a dangling commit.

⛔ **NEW, earned 2026-08-29 — `git checkout -- <your own file>` is the same hazard turned inward.**
Used mid-session to undo a bad edit, it reverted to the last commit and silently destroyed an
unrelated uncommitted fix in the same file. The spark-visibility fix was lost this way and had to be
rebuilt. **Commit first, or copy to scratch, then revert.**

⛔ **Two commit-gate layers, different bypasses.** `[gates-ok:<reason>]` in the commit MESSAGE clears
the session hook. The git-native `.githooks/pre-commit` is separate and needs `--no-verify`.
Identical-looking output, different mechanisms. Do not reach for either without Bean.

⛔ **The visual-diff gate takes a SCOPED bypass, not `--no-verify`:**
`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..."`. A skip is a DEBT logged to
`reports/visual-diff/manual-skips.log`. Pay it with a real report.

⛔ **Long prose through a `cat <<EOF` heredoc FAILS in the Bash tool.** Use the Write tool.

⛔ **`build-deploy.py` refuses on ANY dirty file in deploy scope, including other tracks'.** Declare
your own with `--payload plugins/sgs-blocks/src/blocks/timeline/`. **Never `--allow-dirty`** — that
is the D336 flag (two client sites down ~2.5h).

---

## ⛔ THE ONE PITFALL THAT COST THIS WHOLE SESSION

**Five separate instruments passed while the feature was visibly broken.** Full detail:
`STOP-CATALOGUE.md` E17 / `STOP-INSTRUMENT-SHAPE`. The short version, because it WILL recur:

| # | The instrument said | The truth |
|---|---|---|
| 1 | `display:block`, right stroke, dasharray 1px, dashoffset animating smoothly | element was **2px × 2px**, painted nothing |
| 2 | horizontal arm DRIFTing | viewport was below the 767px breakpoint, so the harness walked the wrong axis |
| 3 | fill SHRINKING as progress grew | colour predicate demanded `g>140`; the token was `g=138` |
| 4 | sparks correctly suppressed under reduced motion | **no positive control** — it never checked they fire when they should |
| 5 | connector "10px clear" of the dates, twice | box read before `scrollIntoView` settled; the line visibly crossed the glyphs |

**Every one was caught by opening a screenshot or by Bean looking. None by a gate.**
⭐ **Open a screenshot before writing any verdict on a visual change.** Assert PAINTED GEOMETRY
(bounding rect vs parent, or a pixel sample), never computed style alone. Give every check a
positive control.

---

## State recap

`sgs/timeline` now has an optional scroll-driven connector (Spec 38 **FR-38-35**, Tier V,
block-private). **Live on canary page 3072**, `/probe-fr-38-35-timeline-progress-connector/`.
Commits `72825d07c` → `0a5b4dd2f`. D879.

One `@property`-registered number, `--sgs-timeline-fill-progress` (0→1), drives everything: a
CSS-mask fill, a blurred trail glow, a head dot, and spark bursts fired as the fill crosses each
milestone. Two drivers write it — native `@supports (animation-timeline: view())`, and a vanilla rAF
path in `view.js`. **The JS path is PRIMARY for Firefox, which has no `animation-timeline` in any
stable build** (lands 157; Safari has had it since 26.0).

⛔ **The SVG-path route is dead for a straight connector.** Three defects, one cause — a unit
`viewBox` stretched non-uniformly: `non-scaling-stroke` resolves dashes in SCREEN space (defeating
`pathLength="1"`, painting a 1px dotted line), removing it doubles the stroke to 4px, and the same
viewBox sized the SVG 2px × 2px. **Spec 31 QC correction C9's no-JS escape hatch is CLOSED** —
anything needing a path must budget a JS `ResizeObserver` to generate `d`.

Probes committed: `scripts/motion-qa/probe-fr-38-35-live.mjs`, `-connector-stack.mjs`, `-sparks.mjs`,
`-timeline-progress.mjs`.

---

## Task 1 — Milestone media (Bean-specified, NOT started)

**What:** each milestone can carry its own media, placed opposite the content — which on the
alternating vertical layout is the same side as the date.
**Why:** MIC's journey page needs imagery per milestone; without it the page is text-only.
**Estimated time:** 30-40 min.

**Two placements Bean asked for, both needed:**
1. media sits UNDER the date, or
2. the date sits ON the middle of the media (overlay).

**Media TYPE must be a choice**, mirroring `sgs/hero`'s split-media.

✅ **Do not build from scratch — two things already exist:**
- `entries[]` already carries an `image` field, and `render.php:438` already emits
  `.sgs-timeline__image`.
- `sgs_tier_media_render()` at `includes/helpers-tier-media.php:161` is genuinely shared and
  block-agnostic — it takes `$base_class` and `$uid`, so it is reusable, not copyable.

⚠ **Hero declares 32 attributes for split media because it is tiered PER DEVICE. Do NOT replicate
that per entry** — 3 pickers × N milestones is unusable for a client. Use ONE tier per entry
(`desktop` only), which still gives image/video/SVG switching through the same helper and the same
markup contract.

**Orchestration:**
- Execution: **inline** (main thread) — it spans `block.json` + `edit.js` + `render.php` + `style.scss`
  and needs judgement about the entries repeater UI.
- Depends on: none. Parallel with: none.
- /qc gate after: yes — `/qc-inline`, plus a screenshot at 375/768/1440.
- ⚠ New attrs inside `entries[]` need `/sgs-update` (announce first — shared-DB write), then
  `python plugins/sgs-blocks/scripts/generate-attr-role-map.py`.
- **Acceptance:** a client can pick a media type and source per milestone in the editor; both
  placements render; the alternating layout still alternates; screenshot at all three widths.

## Task 2 — Branching connectors + sparks down each branch (Bean-specified, DEFERRED by agreement)

**What:** the connector can branch, and sparks travel down each branch as well as the main line.
**Why:** Bean's explicit ask; it is the visual centrepiece of the journey page.
**Estimated time:** unknown until the design gate — do not guess.

⛔ **This needs its own DESIGN GATE before any code.** It changes the rendering primitive: you
cannot position anything along a branch without a real path, and the no-JS SVG shortcut is closed
(see State recap). Expect `offset-path` + `offset-distance` for anything riding the curve, and a
`ResizeObserver` regenerating `d` on layout change.

**Orchestration:**
- Execution: **inline**, `/brainstorming` in design mode first, then `/qc-council` on the fix-shape.
- Depends on: Task 1 only insofar as both touch `render.php` — do not run them in parallel.
- **Acceptance:** a signed design gate, not code. Do not start building from this prompt alone.

## Task 3 — Spark density + travel sign-off (R-31-13)

**What:** get Bean's eye on the spark feel; tune if he wants it.
**Estimated time:** 10 min.

Contrast measured **1.04 → 2.13:1** and bursts are visibly firing at each milestone, but the *feel*
has not been signed off. Three knobs, one number each: `--sgs-timeline-spark-size`,
`--sgs-timeline-spark-life` (style.scss), and the burst `count` in `view.js`'s `burst()`.

**Acceptance:** Bean says it looks right, or names the change. Nothing else counts.

## Task 4 — ⚠ PRE-EXISTING BUG, not this track's: milestone node dots are INVISIBLE

**What:** the milestone dots do not render on the canary. Not caused by the connector work.
**Estimated time:** 10 min once Bean rules.

**Proven cause:** `render.php` emits the scoped colour as `var(--wp--preset--color--border-subtle)`
**with no fallback**. This theme has no `border-subtle` token, and that scoped rule outranks the base
`style.scss` rule which DOES carry `#0d5557` — so `.sgs-timeline__node::before` computes
`rgba(0,0,0,0)`. Measured live.

⛔ **Needs Bean's call before touching.** Changing the block's default `connectorColour`, or making
`sgs_colour_value()` emit a fallback, is framework-wide and affects every existing timeline and
potentially every block using that helper.

---

## Dependency graph

```
Task 3 (spark sign-off — ask Bean in the opening batch, costs nothing to wait on)
Task 4 (ask Bean in the SAME opening batch — needs a ruling, not work)
  ↓
Task 1 (inline — milestone media)          ← the only build work not gated on a decision
  ↓ /qc-inline + screenshots at 375/768/1440
  ↓ deploy + live verify + STOP-67 report
Task 2 (design gate ONLY — /brainstorming, then /qc-council. No code.)
```

Batch Tasks 3 and 4 into the opening message to Bean, then build Task 1 while he considers them.

## Methodology guardrails (do not skip)

- **Deploy before you measure.** A test against undeployed code measures stale output.
- **`build-deploy.py` can ABORT while exiting 0** — read its output, never the exit code.
- **Open a screenshot before writing any verdict on a visual change** (STOP-INSTRUMENT-SHAPE).
- **Assert painted geometry, not computed style.** A style check cannot see a zero-area element.
- **Give every check a positive control.** "It's correctly 0 when suppressed" proves nothing unless
  you also proved it is non-zero when it should be.
- **A green measurement is not fidelity (R-31-13).** Bean's eye is co-authoritative.
- **A brand accent is a GROUND, not an indicator.** Never hardcode `#fff` in decoration on a light
  page — key it to the client's token and go darker if it must read.
- **Verify the EDITOR, not just the frontend.**
- **Visual-diff report BEFORE any commit touching a block** (STOP-67), repo-root
  `reports/visual-diff/`.
- **Announce before `/sgs-update` or any shared-DB write.**
- **Never restore a trashed fixture** (2023, 2114 carry pre-migration authoring). Author fresh.
