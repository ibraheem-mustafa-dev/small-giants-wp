---
doc_type: plan
plan_id: fidelity-comparator
phase_name: Council-approved fidelity comparator (replaces the NO-GO harness design)
project: small-giants-wp
created: 2026-08-29
spec_ref: 38
status: EXECUTED 2026-08-29 (D888). All 3 tasks shipped + a final whole-branch review. The instrument works; the gap it measures is REAL and OPEN (2 of 3 sampled phases over ceiling). Two follow-ups deferred and named: production option path, shared harness-lib.mjs.
---

# Fidelity comparator — build plan

Replaces `.claude/plans/2026-08-29-poc-replica-fidelity-harness-design.md`, which a six-seat
`/adversarial-council` returned **NO-GO** on (grades D+, D+, C−, C, C+, B). This plan is the
council's own replacement scope, not a revision of the original.

## What changed from the NO-GO design, and why

| Dropped | Reason |
|---|---|
| Three-component harness built from scratch | `generative-background-perf.html` already exposes `__ready`, `__drawAt(t)`, `textureSource`, and defaults to 1393×761. ~80% existed. |
| `ablate-uniforms.mjs` | Separate project, separate consumer, separate timescale. Gating "done" behind it is the stall trap. Own plan, after sign-off. |
| Rung 0 as "rig vs rig" | Cannot fail. A stubbed comparator returns 0.00% and passes. |
| `compare.py`'s default crop | Its own comment: *"the softer crop on edges"* — and our known defect is an edge. |

## Global constraints (bind every task)

1. **Never use `compare.py`'s `DEFAULT_CROP`.** Always pass an explicit `--crop`, and record the
   box in the output. The default was chosen to avoid silhouette edges.
2. **Fail closed, and distinguish the two failure classes.** A `compare.py` non-zero exit is a
   HARNESS ERROR (exit 2). A parsed result over threshold is a FIDELITY FAILURE (exit 1).
   Conflating them logs "the crop was wrong" as "we regressed".
3. **`compare.py` never exits non-zero on a bad comparison** — verified in its `main()`. The
   driver must parse `--json` and apply the threshold itself. Never treat its exit code as a
   verdict.
4. **Every numeric output carries its provenance**: GPU renderer/vendor string, Chromium version,
   viewport, DPR, crop box, `u_time`, and SHA-256 of both input PNGs. A figure without these is
   not comparable to any other figure.
5. **Assert, do not assume, that both sides match.** Where an assertion is impossible, print the
   known divergence beside the number rather than omitting it.
6. **No PNG is committed.** Derived statistics and hashes are committed. Imagery is not.
   (Guardrail is asset-scoped, not path-scoped — Bean, 2026-08-29.)
7. **Run-scoped output directories.** Several sessions share this worktree; a fixed
   `render.png` path means two runs silently read each other's frames.
8. **British English** in all comments and output.

## Known state divergences from the reference (as of 2026-08-29)

Established by the council's code-grounded seats. **Depth was fixed in `ba01581df`; the rest are
live.** Each must be either neutralised or reported beside the number:

| Mechanism | Rig | Ours | Action |
|---|---|---|---|
| Depth | `depthWrite/depthTest: true` | ~~`depth: false`~~ **fixed** | none |
| Blend | `CustomBlending`, `src*src` (colour squared) | `gl.BLEND` never enabled | Drive the rig with `?blend=off` (it supports this) and say so in the report |
| Texture flipY | `TextureLoader` defaults `flipY: true` | no `pixelStorei` call | **Task 1 must resolve and assert** — a V-flipped palette silently inverts colour |
| DPR cap | 2 | 1.5 | Pin both to DPR 1 and assert |
| `u_time` units | milliseconds, `+ timeOffset` | `seconds × speed` | **Task 1 must convert and assert equality** |

## Task 1 — `poc-replica.html` + the debug contract

**Deliverable:** `plugins/sgs-blocks/scripts/generative-background/poc-replica.html`

Our engine mounted in the rig's page layout (hero box, canvas at `left: 330px`, 1393×761 within
a 1440×900 viewport — copy the markup/CSS from `.claude/scratch/stripe-hero-poc/index.html`).

**Query parameters, matching the rig's vocabulary:**
- `?t=<n>` — sets the shader's `u_time` uniform **directly**, bypassing the `speed` multiplier.
  ⛔ `handle.draw( seconds )` multiplies by `speed`; the rig's `?t=` sets `u_time` absolutely
  (`index.html:471`). Passing the same number to both without this conversion compares two
  different moments of the animation. Expose `window.__drawAtRawTime( uTime )`.
- `?pal=<name>` — load `.claude/scratch/stripe-hero-poc/assets/<name>.png` as `textureSource`.
  Default `palette-a`. This file is a **measurement fixture only** — never referenced from
  `plugins/` runtime code, never committed, never deployed.

**Debug contract (must match the rig's exactly):**
- `window.__ready` — `true` once the first draw has landed
- `window.__drawAtRawTime( uTime )` — deterministic single-frame draw
- `window.__utime()` — the value actually in the `u_time` uniform after the last draw
- `window.__glstate()` — `{ blend, blendSrcRGB, blendDstRGB, depthTest, cullFace, unpackFlipY, contextAttributes }` read back via `gl.getParameter` / `gl.getContextAttributes()`
- `window.__frustum()` — `{ width, height }` the projection was built from

**Resolve flipY.** The rig's loader flips the texture vertically by default; we issue no
`pixelStorei`. Determine which orientation matches, apply it, and state in a comment which was
chosen and why. An unresolved flip silently inverts the palette's colour ramp.

**Done when:** the page renders, `__glstate()`/`__utime()`/`__frustum()` all return real values,
and a manual load at `?t=2.0&pal=palette-a` paints a visible folded ribbon.

## Task 2 — `fidelity-compare.mjs`

**Deliverable:** `plugins/sgs-blocks/scripts/generative-background/fidelity-compare.mjs`

The driver. Captures both sides, asserts parity, runs `compare.py`, writes a tracked baseline.

**Rungs, in this order, fail-closed at each:**

- **0a — determinism floor.** Rig vs rig, same `u_time`. Expect ≈0. Establishes the noise floor.
- **0b — POSITIVE control (the rung that makes 0a mean anything).** Take the rig capture, inject
  a known perturbation (+3/255 on the green channel), and compare. `compare.py` must return
  `mean_abs ≈ 3.0` on G with `signed_mean.G ≈ +3.0`. **If it does not return the injected
  answer, the comparator is broken and no other rung is reported.** Predict the figure in the
  code before running it.
- **0c — discrimination.** Rig at two different `u_time` values must differ materially. Proves
  `?t=` actually reaches the uniform and captures are not cached.
- **1 — geometry + shading.** Ours vs rig, same palette, same `u_time`, rig at `?blend=off`,
  both at DPR 1. Explicit edge-inclusive crop.
- **2 — the side-by-side** for Bean, at full page. No number; produces the blink comparator's
  two inputs.

⛔ **THE RIG DOES NOT IMPLEMENT THE DEBUG CONTRACT — the driver must inject it.** Corrected
2026-08-29 after a Task 1 review; the original plan wrongly assumed both sides could expose it.
The rig exposes only `__ready`, `__diag`, `__drawAt`, `__matrices`, `__tier`, `__capability` and
`__stop`. There is no `__utime`, `__glstate` or `__frustum` anywhere in it.

Consequences the driver must handle:

- **Inject the readback functions into the rig page via `page.evaluate()` at capture time**, using
  the same `gl.getParameter`/`getContextAttributes` calls the replica uses. Do NOT edit
  `.claude/scratch/stripe-hero-poc/index.html` — it is the ground truth, and mutating it makes
  every previously-recorded figure incomparable.
- Getting the rig's `gl` handle requires reaching its context. If it is not reachable from the
  page scope, wrap `HTMLCanvasElement.prototype.getContext` in an `addInitScript` BEFORE
  navigation to capture the context on creation. Injecting after load is too late.
- **The rig's `__drawAt(x)` IGNORES its argument whenever `?t=` is present** (`index.html:471`).
  So the driver must RELOAD the rig once per sampled `u_time` rather than calling through — the
  two sides are not symmetric here, and a loop that calls `__drawAt` per time value would
  silently compare the same frame N times. This is exactly the failure rung 0c exists to catch.

**Preconditions, all fail-closed with a named reason:**
1. Both pages report WebGL2 available — and on the rig side, assert `window.__capability`
   reports supported and `#c` is still in the DOM. ⛔ The rig sets `__ready = true` on four
   paths where it drew nothing and REMOVED its canvas; a scratch-canvas WebGL probe does not
   catch those.
2. `__glstate()` matches between the two sides on every field, or the differing fields are on a
   declared known-divergence allowlist (from the table above) and are printed with the result.
3. `__utime()` matches between the two sides.
4. `__frustum()` matches between the two sides.
5. Painted-geometry assertions (area, coverage, distinct hues) pass on **both** sides — not just
   ours. Reuse `capture-render.mjs`'s existing checks.

⛔ **Task 2 OWNS widening the capture server's root.** `capture-render.mjs` roots its static
server at `plugins/sgs-blocks` and 403s anything outside it, but `poc-replica.html` must load the
palette from `.claude/scratch/`. Task 1 correctly declined to change a shared file unilaterally
and documented the requirement instead. The driver must serve from a root that reaches BOTH
trees, keeping the traversal guard against that wider root — do not simply delete the guard.

⛔ **`preserveDrawingBuffer` is false on both sides — a post-composite `readPixels` returns
ZEROS.** Verified twice this session, once as a false "0% painted" report over a perfectly good
render. Every capture must either use `page.screenshot()` or draw and read within the SAME
evaluate turn. A zero reading from this trap is indistinguishable from a genuinely blank canvas,
which is the most expensive shape of wrong answer available here.

**Output:** `plugins/sgs-blocks/scripts/generative-background/fidelity-baseline.json` — TRACKED.
Per rung and per sampled `u_time`: the full `compare.py` stat block, crop box, `u_time`, the
SHA-256 of both input PNGs, the palette's SHA-256, and the environment block (GPU renderer,
GPU vendor, Chromium version, viewport, DPR). Plus an `accepted_deltas` array (rung, threshold,
date, one-sentence reason) so a legitimate future divergence can be recorded rather than turning
the check permanently red.

**On a re-run, compare the environment block against the stored baseline and print a loud banner
if it differs** — a recorded field nobody reads is decoration.

**`--self-test`:** feed the comparator two deliberately different PNGs, assert it reports a large
number and exits 1. Without this, the day it starts comparing a file against itself it returns
0.0% and everyone celebrates.

**Sampled times:** three named absolute `u_time` values, written down in the file, reused every
run. Not "~3 moments".

## Task 3 — `blink.html` + wiring

**Deliverables:**
- `plugins/sgs-blocks/scripts/generative-background/blink.html`
- `package.json` + `scripts/gates.json` entries

**The blink comparator.** Both captures absolutely positioned in the same box, ours on top.
Space (or any key) toggles the top image's opacity 0↔1. Arrow keys step through the sampled
`u_time` values. A caption line shows which `u_time` and which rung is displayed.

⭐ **This is the artefact Bean actually signs off against, and it is the reason it ranks above the
numbers.** The human visual system is far better at detecting registration and shape divergence
in a blink than at reading a percentage. It makes Bean faster, rather than removing him.

**Wiring — this is part of the task, not a follow-up.** This project's documented failure mode is
detectors built and never wired (one sat with zero references for three weeks):
- `"check:transform-parity": "node scripts/generative-background/verify-transform.mjs"` — add to
  `gates.json` **fast tier**. It reads the committed `reference-matrices.json` and imports the
  production module, so it has **no rig dependency** and keeps working after Gate E fires. This
  is the piece that genuinely protects the shipped engine.
- `"fidelity:compare": "node scripts/generative-background/fidelity-compare.mjs"` — a manual
  command, deliberately **NOT** in `prebuild` (needs the rig and a GPU).
- Both registered in `gates.json` so `gate:list` shows them and `--assert-wired` can see them.

**Also add a `README.md`** in that directory explaining what the reference was, that it lives
outside git, and what the committed baseline numbers mean once it is gone. The harness will
outlive the rig and be read by someone who never saw it.

## Definition of done

Each item is a GATE unless marked REPORT-ONLY.

1. Rung 0b returns the injected answer within tolerance. **GATE** — nothing else is reported if
   this fails.
2. Rung 0a's floor is measured and written into `fidelity-baseline.json`. **REPORT-ONLY** — the
   pass threshold is Bean's to set once he sees the floor.
3. Rung 0c shows a material difference between two `u_time` values. **GATE**.
4. Rung 1 reports a number with the bias/abs ratio at three named `u_time` values, with crop box
   and full provenance. **REPORT-ONLY**.
5. `blink.html` opens and toggles. **GATE**.
6. `fidelity-baseline.json` is committed and contains hashes + environment. **GATE**.
7. Both commands appear in `npm run gate:list`. **GATE**.
8. `--self-test` passes. **GATE**.
9. Bean has viewed the blink comparator and recorded a verdict. **GATE — human.**

## Out of scope

- §7 post-pass. Not built (Bean, 2026-08-29 — lower risk, and its blur hides the shape being
  verified). Rung 3 may be added later to price it.
- The uniform ablation. Own plan, after sign-off.
- Changing the engine to chase a number.
