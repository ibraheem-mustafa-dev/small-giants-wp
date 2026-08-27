# Deploy the six background styles, then give their colours real controls

Invoke `/autopilot` before anything else.

**Your job, in order:** deploy the six-style background engine that shipped but never reached the
canary, verify all six live, then build the two control upgrades Bean has already specified. Both
shapes are chosen — this is a build session, not a design one.

---

## 1. Mandatory READING

1. `.claude/decisions.md` **D852** — the whole of last session. Six styles, three control defects,
   two live incidents, and the reasoning behind the curated-colour rule. Read it before touching
   anything.
2. `.claude/LEDGER.md` → `## ▶ MOTION TRACK`, section **A**. Current status in one screen.
3. `plugins/sgs-blocks/src/shared/effects/webgl/aurora.js` — read its docblock in full. It records
   why this is a shader, why additive compositing is right here and was wrong next door, and the
   backtick hazard that has broken this file's sibling twice.

⛔ Do not re-litigate whether CSS can render an aurora. Three attempts failed three different ways
(bars, ovals, haze); the finding is in D852 and it is structural, not a tuning problem.

---

## 2. First action — Task 1: deploy and verify

⭐ **Smallest first step, under 5 minutes:** run `git status --porcelain plugins/` and confirm the
deploy scope is clean. That single command tells you whether Task 1 is a 10-minute deploy or needs a
clean worktree, and it costs nothing.

**What:** the engine is committed and pushed through `715f10078` but never deployed. Last session's
deploy was blocked by another track's dirty `media`/`post-grid` files.

**Time:** 10 minutes if the tree is clean.

```
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only
```

⭐ **Run it PLAIN first — no skip flags.** At session close all **68 fast-tier gates passed**
(verified 2026-08-27, `run-gates.py --tier fast`). Every deploy earlier that day needed
`--skip-gate-full` and `--skip-oldshape-audit` for failures that belonged to other tracks
(responsive-family-without-switcher on five blocks, a `parse_blocks` allowlist gap, a stale roster).
Those tracks have since fixed them. Do not carry yesterday's skip flags forward as habit — that is
how a real failure gets waved through.

If the dirty-tree gate fires, check whether the named files are yours. If they are not, deploy from a
clean worktree at `origin/main` — the pattern is in D838, and ⛔ **unlink the junctions before
`git worktree remove`**, which once emptied `node_modules`.

**Acceptance:** page 2740 returns HTTP 200 and carries `sgs-wave-gradient--pastel`. Then switch a
probe instance through all six styles and confirm the split: `pastel`, `horizon`, `ribbon` and
`veil` boot **zero** canvases; `aurora` and `ink` boot **one** and set `data-sgs-wave-active="1"`.
That opposite behaviour is the proof the variant gate works.

⚠ Measure with a **fixed integer clip**, never an element screenshot. A fractional host `y` re-rounds
between captures and saturates the metric at ~99% for every interval, which reads as motion and is
not. Sample the saved PNG with PIL; never `gl.readPixels()` from a delayed call.

---

## 3. Task 2 — Gradient controls for the four CSS styles

**What:** `pastel`, `horizon`, `ribbon` and `veil` currently derive their in-between gradient stops
with `color-mix()` from four flat colours. Bean wants the client to set those stops directly.

**Why it is small:** the helpers exist. All three row builders (`fillRow`, `textRow`, `borderRow`)
are gradient-capable, and `SgsColourPanel` takes a per-row `gradientCapable` flag that swaps
`DesignTokenPicker` for `GradientCapableColourControl`.

**Storage contract** (from `GradientCapableColourControl`'s docblock — follow it exactly): sibling
attributes, not a mode toggle on one slot. `{attr}` holds the flat colour; `{attr}Gradient` holds the
gradient; the gradient wins when non-empty. Switching to Solid clears the gradient sibling;
switching to Gradient never touches the flat one. The canonical prop is `onGradientChange` — the
legacy `gradientOnChange` alias was removed.

**Time:** 45 minutes.

**Orchestration:** delegated, Sonnet via `/delegate`, single agent. Give it one file at a time and
name the file it may edit — last session's two CSS agents both honoured a hard single-file scope and
both reports verified clean, so keep that pattern.

**Acceptance:** every gradient stop in the four CSS styles is client-settable; no `color-mix()`
derivation remains; a changed gradient visibly changes the rendered style on the canary.

---

## 4. Task 3 — A three-state colour control for the aurora/ink ramp

**What:** `aurora` and `ink` build a vertical ramp from three colours — green low, teal mid, violet
high. Bean's shape: **one colour control carrying three states**, rather than three separate rows.
The states row already renders multiple swatches in a single popover, so this reuses an existing
shape instead of inventing one.

**Time:** 30 minutes.

⚠ **Check this against rule 31 before building.** Rule 31 resolves the state COUNT statically. D738
records a computed states array rendering both states correctly while the detector reported "carries
1 state" — the code improved and the gate went blind. Build the three entries as **literal array
members**, never `.map()` over a list, and confirm the detector still reads three.

**Acceptance:** the ramp is set from one row with three states; the detector reports three; both
shader styles still render correctly on the canary.

---

## 5. Standing rules for this surface

- ⛔ **Never put a backtick inside the GLSL template literals** in `aurora.js` or `wave-gradient.js`,
  including inside a `//` comment. It terminates the JS string and the build fails with an unrelated-
  looking error. Both files have broken this way.
- ⛔ **`php -l` proves a file parses, not that its symbols exist.** A mangled `\trim` became
  `<TAB>rim(` last session, passed the linter, and 500'd the canary — an undefined-function fatal is
  a runtime error. After any generated PHP edit, run
  `python plugins/sgs-blocks/scripts/check-dead-api-calls.py --check`.
- ⛔ **Do not add `fx_effects` rows.** The variant rides the existing effect precisely so no shared
  `sgs-framework.db` write and no registry regeneration are needed. A reseed there has broken two
  tracks' builds.
- ⛔ **Do not mount `SgsColourPanel` from the fx extension.** 29 of 32 fx-capable blocks already
  mount one; a second gives them two "Colour" panels. Use the row convention instead.
- **Curated colours belong in `:where()`** at zero specificity. The render layer emits client picks
  as a single-class rule, which would lose to the `(0,2,0)` variant selectors otherwise.
- `main` is shared by several tracks. Verify the branch in the same command as the commit, and use
  `git commit -- <paths>`; a bare commit flushes the whole index and has swept another track's work.

---

## 6. Tool bindings — skills

| Skill | When |
|---|---|
| `/brainstorming` | Any design decision that is not already settled above |
| `/gap-analysis` | Grade output before calling a task done |
| `/lifecycle` | Before any skill, agent or pipeline change |
| `/research` | Auto-routes to the right research tier |
| `/strategic-plan` | If a task grows past its estimate |
| `/delegate` | Pick the model for every dispatch — do not hardcode one |
| `/sgs-wp-engine` | Block, theme and framework work |
| `/qc-inline` | Per-file checks before commit |
| `/wp-blocks`, `/sgs-db` | Schema and DB ground truth before any "missing X" claim |

## 7. Tool bindings — agents and MCP

| Agent | When |
|---|---|
| `general-purpose` (Sonnet) | Task 2's single-file CSS work |
| `wp-sgs-developer` | Heavier block or render-layer work |
| `design-reviewer` | If Bean disputes how a style looks |

| Tool | For |
|---|---|
| Playwright MCP | Live DOM and canvas verification. ⚠ It has been locked by concurrent sessions — use an isolated instance if so |
| `sgs-db.py` | DB queries |

⚠ Headless Chromium here has no GPU unless launched with
`--use-gl=angle --use-angle=default --ignore-gpu-blocklist --enable-gpu`. Without those the
capability gate correctly declines WebGL and only the CSS fallback renders. That is not a bug.

**Canary credentials** are at `.claude/secrets/sandybrown.env` and are always available — do not ask
for them. ⚠ The values are single-quoted; strip the quotes when parsing, or the password is wrong by
two characters.

---

## 8. Done when

- All six styles render correctly on the canary, with the canvas split verified.
- The four CSS styles take gradients; the two shader styles take a three-state ramp.
- `decisions.md` carries the closing entry, D-ceiling re-derived immediately before the commit.
- `LEDGER.md`'s motion section reflects the closed state — fold in, do not append.
- `python .claude/hooks/handoff-preflight.py --check` passes. The self-healing `decisions-size`
  check is the one expected failure and must not be "fixed".

**After this track closes, the next work is the POC rebuild** —
`.claude/plans/2026-08-27-generative-background-engine.md`. Its Phase 1 is still open: pick a
reference before any code. Do not start it inside this session.
