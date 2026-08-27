# Generative background engine — Phase 3: build it

Invoke `/autopilot` before anything else.

**Your job:** build the engine the technique spec now describes. The spec has a `GO` from
`/adversarial-council`. Do not re-review it — build from it.

---

## 1. Read first

1. `.claude/reports/2026-08-25-generative-background-engine-technique-spec.md` — the whole spec.
   Every section is load-bearing: Assembly & priority order, the seven mechanisms, Acceptance
   criteria, Target file, CSS fallback contract, Configurability axes.
2. `.claude/decisions.md` **D874** — why the spec took three council rounds, and what each round
   fixed. Skip it and you will rebuild a mistake the councils already caught.
3. `.claude/plans/2026-08-27-generative-background-engine.md` — the plan this build closes out.

---

## 2. Settled. Do not re-litigate.

- **The technique is the Stripe-hero replication POC's** — a CPU-folded plane, not FR-38-31's
  fullscreen-triangle noise field. Bean ruled on this directly, 2026-08-28. The two effects share
  nothing but a project.
- **The licence position is settled and correct** — verified across three council rounds,
  including a dedicated legal re-check. Ship no third-party file; keep no copy in this repo. The
  spec's licence section states the rest.
- **Gate E stays held.** `.claude/scratch/stripe-hero-poc/` holds your only reference material.
  Do not delete it. Do not let anyone else delete it before this build ships.
- **§7 (the post-processing pass) stays out of scope.** It costs 70% of the frame and needs a
  design gate this build doesn't have. Build §1 through §6 only.

---

## 3. First action — under 5 minutes

Open the spec's "Assembly & priority order" section. Step 1 needs no WebGL: a static,
hue-adjacent, correctly-grounded gradient, built once in JS via Canvas 2D and OKLCH colour
interpolation, from the client's four `DesignTokenPicker` colours. Build that first. If it meets
Bean's bar on its own, it ships as v1 and the WebGL work becomes a deliberate, separate upgrade —
not an assumed next step.

---

## 4. The build order

Follow the spec's own sequence. Do not reorder it.

1. **Static gradient (§5 hue adjacency + §6 ground).** Zero WebGL risk. Validate here before
   writing a line of shader code.
2. **Geometry (§1) plus its Animation and Camera subsections.** The spec flags this mechanism as
   the one most likely to repeat FR-38-31's rejected "B-movie 3D VFX" look. Build it, then stop
   and compare it against the step-1 gradient. Two retune passes, maximum — the spec's own kill
   criterion. A third attempt needs a fresh design gate, not more tuning.
3. **Colour sampling (§2), OKLCH texture.** The one structural change from a static gradient to a
   runtime-built, token-derived texture.
4. **Striations (§3), then grain (§4).** Cheap. Build last.

---

## 5. Where the code lands

A third Tier W entry, sibling to — never an edit to —
`plugins/sgs-blocks/src/shared/effects/webgl/renderer.js`. Exact paths and naming convention are in
the spec's "Target file" section. Do not touch FR-38-31's files (`webgl/wave-gradient.js`,
`webgl/aurora.js`, `fx-wave-gradient.*`) — that effect is finished and closed.

---

## 6. What "done" means

Both gates in the spec's "Acceptance criteria" section, not just code that runs:

- **Validation gate:** no grey band in the static gradient; Bean's visual sign-off on it alone.
- **Full ship gate:** a named sign-off against the "B-movie 3D VFX" risk; contrast holds through
  the animation cycle where text overlaps the effect; reduced motion draws one frame and stops;
  context loss recovers or falls back to the CSS contract; frame cost stays under 300 μs on the
  Q6 reference rig; DPR stays capped at 1.5.

Verify frame cost with the promoted `perf/measure-frame-cost.mjs` tooling once it exists at its
new tracked location (see the spec's "Where the evidence lives" — the promotion itself is still
open; do it as part of this build, not after).

---

## 7. Four small things the councils flagged and left for the build to close

None of these block starting. Close them as you reach the relevant step.

- Speed and Size controls need §1's geometry to mean anything — don't ship them live in the
  editor before v1.1's WebGL path exists; hide or disable them on the static-gradient path.
- The deny-list content for the WebGL capability gate is real, unwritten work. Build it from a
  public source (Chromium's GPU blocklist, or `webglreport.com` samples) — the spec names the
  *structure*, not the list.
- The gradient texture's OKLCH build needs a stated gamma round-trip (sRGB → linear → OKLCH →
  linear → sRGB) and a gamut clamp after interpolation. Both are in §2 — follow them exactly, they
  were added because a first draft got this wrong.
- Twist's rotation needs a per-vertex band-ID attribute, set once at the CPU fold, because a
  vertex's final position doesn't tell you which of the three folded bands it came from.

---

## 8. Hazards — carried forward, still live

- ⛔ **Never run `composer install` without `--no-dev` on a tree you then deploy.** It rewrites the
  autoloader to require dev packages the tarball excludes; the site 500s on every request through
  every green gate. `build-deploy.py` guards this now — don't bypass it.
- ⛔ **`git commit -- <paths>` commits the working-tree state of those paths.** After a partial
  `git apply --cached` stage, use a bare `git commit`, not a path-scoped one, or you discard the
  stage.
- ⛔ **Never run `git stash`, `git clean`, `git checkout -- .`, or `git restore .` in this tree.**
  Several sessions share it. A `git stash -u` has already destroyed an hour of a peer's work once.
- Deploy from an isolated worktree if the shared tree is dirty. Precedent: D822.

---

## 9. Tools

| Skill | When |
|---|---|
| `/delegate` | Pick the model for every dispatch |
| `/qc-council` | Validate a fix-shape before dispatching it, if a build step surfaces one |
| `/adversarial-council` | Only if a genuinely new architectural question surfaces mid-build — the spec itself does not need re-review |
| `/visual-qa` | Compare the shipped v1 gradient and, later, the animated build against Bean's bar |

**Canary credentials** live at `.claude/secrets/sandybrown.env` and are always available — don't
ask. Values are single-quoted; strip the quotes when parsing.

⚠ Headless Chromium has no GPU unless launched with
`--use-gl=angle --use-angle=default --ignore-gpu-blocklist --enable-gpu`. Confirm the browser is
WebGL-capable before trusting any "no canvas" result — otherwise a vacuous pass reads as real.

---

## 10. Done when

- The step-1 static gradient ships, with Bean's sign-off, either as the whole v1 or as the base
  the WebGL build sits on.
- If geometry proceeds: it passes its own named sign-off, or the kill criterion has already ended
  that attempt and the static gradient ships instead.
- Every acceptance criterion in section 6 above is met, not assumed.
- `decisions.md` carries the closing entry, D-ceiling re-derived immediately before the commit.
- `LEDGER.md`'s motion section reflects the outcome — fold in, do not append.
- `python .claude/hooks/handoff-preflight.py --check` passes. The self-healing `decisions-size`
  check is the one expected failure and must not be "fixed".
