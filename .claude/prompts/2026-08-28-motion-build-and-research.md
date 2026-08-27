# Motion track — build the decided work, research the undecided (2026-08-28)

**Invoke `/autopilot` before anything else.**

## Where you are

Three design gates closed on 2026-08-27. Bean decided all three personally; none is open. Two
"tasks" on the old list dissolved when someone finally read the source. One shipped and is live.
Your job is to build what he decided and to research the one thing he cannot decide yet.

**Read first, in this order:**
1. `.claude/LEDGER.md` — the PARTICLE + GATES SUB-TRACK block. Confirm nothing below has moved.
2. `.claude/decisions.md` **D839-D842, D846, D853** — the whole session, single-sourced.
3. `.claude/specs/38-SGS-MOTION-SYSTEM.md` — **in full** before touching any motion surface.

**Verify in the same command as any commit:**
```bash
git branch --show-current
grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1
```

⛔ **The D-ceiling moved THREE times inside one session (835 → 838 → 845 → 852).** Re-run that grep
immediately before you write a decision, never once at session start. Code comments citing a
D-number had to be renumbered mid-flight because of exactly this.

⛔ **`main` is shared by five tracks.** Commit by exact path — `git commit -- <paths>`. Never
`git add -A`, never a glob pathspec. Deploy from an isolated `git worktree`, junctioning
`node_modules` and `vendor` from the main tree.

⛔ **Do not touch** `fx-wave-gradient.*` or `webgl/wave-gradient.js`. Another track owns them and
shipped a six-style engine at D852.

---

## Task 1 — Fix three gaps in the motion-fx registry

**What:** Three small defects found while proving the `fxPath`/`fxShape`/`fxMagnet` question needed
no work at all. Bean asked for all three fixed.
**Why:** Each one lets a real defect pass a green gate.
**Time:** 20 min.

1. `fxPin` and `fxDraggable` hold `css_property = NULL` in `block_attributes` and appear nowhere in
   `FX_ATTR_CSS_PROPERTY`. Two rows that exist but nothing marks.
2. `check_motion_fx_reseed.py` writes `in_picker` but never compares it — an unguarded column.
3. That guard's `--self-test` perturbs **5 of the 10** columns it checks. `tier`, `plugin_set`,
   `reduced_motion`, `editor_story` and `creates_panel` are guarded but unproven.

**Orchestration:** inline. Small, and each fix needs the surrounding contract in view.
**Acceptance:** all ten guarded columns have a self-test injection that fails when perturbed; both
NULL rows carry a real `css_property` or a written reason for staying NULL.

## Task 2 — Build the cursor grid-dot field (FR-38-33)

**What:** A background grid with a dot in each cell. Dots within range lean toward the pointer,
each locked inside its own cell, and ease back to centre when the pointer leaves.
**Why:** Bean specified this effect months ago. The spec recorded a different one and blocked it
behind a design gate for seven weeks (D839). The gate is gone; the effect is not built.
**Time:** 45–60 min.

⛔ **Read Spec 38's corrected `floating-objects` entry first.** It carries his description verbatim.
Do not paraphrase it into something else — that is the exact failure D839 records.

**Shape, already settled:** its own canvas effect, following FR-38-32's precedent. Not a
cursor-field type — CSS cannot compute per-cell distance. Tier V, canvas 2D. **Not Tier W.**

**Owed before you build:** the design gate itself (cell size, radius, lean distance, ease-back
curve, dot cap, and the SC 2.3.1 coverage answer FR-38-32 had to give), plus a reference Bean has
seen. **Ask him. Do not choose these yourself.**

**Orchestration:** inline, Opus. Novel design plus a shared-mechanism surface.
**QC gate after:** `/qc-council`.
**Acceptance:** the effect renders on a canary page, honours reduced motion, and Bean has watched
it. A measurement alone never closes a visual claim (R-31-13).

## Task 3 — Build the timeline connector

**What:** Per-entry progressive fill on scroll, plus themed connector styles — pulse, vine, tree,
falling bricks. MIC (Muslims in Construction) asked for these for their journey page.
**Time:** 20 min for the fill mechanism, then 20–30 min per style.

⛔ **The old prompt cited the sketch twice, and both citations were wrong.** FR-38-26 is looping
carousels. The real sketch is `P-TIMELINE-ADVANCED-VISUAL-EFFECTS` in
`.claude/memory/archived-2026-07-28-parking-pre-normalise.md:1228-1268`.

⚠ **Two of that sketch's premises are stale.** It assumes a `.sgs-timeline__connector` element and
proposes replacing it with per-segment SVG. No such element exists: the connector is a single
root-level `::before` (`timeline/style.scss:56-65`), and there is no per-segment DOM at all. Build
the base fill first; per-segment styles need new markup the sketch treats as already there.

**Orchestration:** build the base inline. The styles are independent once it exists — dispatch them
in parallel via `/dispatching-parallel-agents`, one agent per style.
**Acceptance:** fill tracks scroll at 375/768/1440, reduced motion falls back to a plain line, and
decorative SVG carries `aria-hidden`.

## Task 4 — Make `SgsLengthControl` fit for purpose

**What:** Its `presets={true}` mode is unusable at all 66 mounts. Bean wants it fixed properly.
**Why:** A control that corrupts the value it writes is worse than no control.
**Time:** 45 min, and survey before you touch anything.

**The mismatch:** `presets={true}` writes a token slug. Nearly every mount stores a **number plus a
separate unit string**, splitting the input with `parseUnit()`. A slug cannot survive that.
Three concrete casualties: `separator.thickness` is an object attribute and would corrupt a tier
object; `nav-menu.collapsePoint` is typed `number`, so a slug vanishes silently and `"50"` is
accepted as 50px — a plausible wrong value; `hero.splitMediaWidthUnit` runs a digit-strip regex and
would write the slug as a CSS unit.

⛔ **More than three blocks, so build the detector first** — read `.claude/THE-MIGRATION-METHOD.md`
before the fourth file edit. Survey, then fix behind the detector, then gate.
**Acceptance:** `presets={true}` works at every mount that adopts it, and the gate refuses any mount
whose attribute cannot hold both shapes.

## Task 5 — Research references for generative cover images

**What:** Find real examples of generated cover artwork Bean can react to, and find open-source work
worth modelling.
**Why:** Spec 40 is written and scoped, and a build gate blocks it until Bean approves a reference.
**Time:** 30 min.

**Use `/research-buddies` and `/gh-research`.** Bean named both.

**Bring back three things:** actual images (form, ground, hue spread — light or dark decides
everything downstream), any library or repo that already generates deterministic seeded artwork,
and a plain recommendation. **Ask Bean to pick. Do not choose for him.**

⛔ **D781 is why this task exists.** Three Aurora attempts and a full Tier W build were made against
a reference nobody had looked at. Verify the reference, not just the technique.
⚠ Spec 40 covers a **static offline image generator**. The motion track's "generative background
engine" is a different thing that shares an adjective. Read Spec 40 §0.

## Task 6 — Wrap `decorative-image` when a treatment is applied

**What:** Inject a wrapper only when a surface treatment is configured. Bean decided this at D840;
nobody has built it.
**Why:** A client can pick grain, halftone or duotone on this block today, save, and get nothing at
all — silently.
**Time:** 20 min.

**The cause:** the block is naked by design — `sgs_responsive_image()` emits the `<img>` as the
block root. `fx-surface-treatment.js:353` calls `el.querySelector('img')`, which never matches `el`
itself, then returns a silent no-op.

⛔ **Existing instances must render byte-identical.** The block's CSS uses compound selectors that
assume no ancestor. The video branch already builds its own `<span>` wrapper
(`render.php:261-266`) — follow that pattern.
**Acceptance:** a treatment renders on a naked-mode instance, and an untreated instance's markup is
unchanged.

---

## Order

```
Task 1 (inline)  ·  Task 5 (research, parallel — no shared files)
      ↓
Task 6 (inline, small)  →  Task 4 (survey → detector → fix)
      ↓
Task 2 (design gate with Bean, then build)  →  /qc-council
      ↓
Task 3 (base inline, then styles in parallel)
```

Tasks 1 and 5 share nothing and can run together. Everything else touches block source or needs
Bean's input, so run it in sequence.

## Guardrails

- **Prove the cause before the fix.** The particle trail's invisibility was measured at 1.44:1
  before a line was written. The first attempt to prove it was **vacuous** — it set `el.style.color`
  and fired a window resize, but the module observes a `ResizeObserver` on the element, so nothing
  re-ran and both screenshots came back identical. A negative control has its own failure mode:
  confirm it landed before trusting what it appears to prove.
- **A green measurement is not fidelity.** That trail painted ~7,400 canvas pixels while being
  invisible. Every automated signal was green.
- **An absence verdict is only as wide as its search.** Searching the editor DOM reported "Trail
  colour" missing — and also reported `Density` and `Size` missing, both of which exist. Check the
  registry, not the DOM text.
- **`wp_update_post()` strips backslashes.** Pass `wp_slash()` or lose every escape sequence. This
  turned a stored `—` into literal `u2014` on a live page. Back up before the write; read the
  rendered result, not the exit code.
- **Never restore a trashed fixture.** Pages 2023 and 2114 carry pre-migration authoring, so
  `minHeight` coerces to `{}` and spacers collapse — a page that looks like a fixture while the pin
  never pins. Author fresh, and commit the markup.
- **Deploy before you measure.** A test against an undeployed change measures stale output.
- **`/sgs-update` is a cross-track action.** It once swept 7 `fx:*` rows another seeder owned and
  broke two tracks. Announce it to other sessions first.
- **A gate failing on another track's work is not yours to force.** Prove it pre-existing in a clean
  worktree, then fix it properly if you can. `parse_blocks()` was blocking every track's deploys and
  took one allowlist line.
- **Visual-diff report before any commit touching a block** (STOP-67, repo-root
  `reports/visual-diff/`).

## Still parked, deliberately

- `P-PARTICLE-TRAIL-VARIATIONS` — sparkler and continuous-connected trail looks. **Post-launch**,
  Bean's own timing. Do not start them.
- `P-ROW-COLLAPSE-FIXTURE` — the reduced-motion header row-collapse cannot be observed. The canary
  has zero `.sgs-row-behaviour` elements, an in-page fixture cannot work (`view.js:67` takes the
  first header in the document), and enabling it on the live header part was tried and reverted when
  the class refused to render. Read the entry before reopening it.
