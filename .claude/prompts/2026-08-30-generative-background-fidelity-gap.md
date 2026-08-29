# Generative background — close the fidelity gap

Invoke `/autopilot` before anything else.

**Your job:** find out why our engine's output diverges from the reference by ~10.6% over the
painted region, and close it. The engine is built, live and numerically verified. A reproducible
instrument now measures the gap. Nobody knows what causes it.

---

## 1. Read first

1. **`.claude/decisions.md` D886, D887, D888** — in that order. They supersede the technique
   spec's Animation section and record two claims that were asserted and then withdrawn. Skip them
   and you will re-derive a wrong answer that already has a name.
2. `.claude/plans/2026-08-27-generative-background-engine.md` — Phase 3, for where this sits.
3. `plugins/sgs-blocks/scripts/generative-background/README.md` — how to run the instrument.

Read the technique spec only for §1–§6 mechanism detail. Its Animation section is superseded.

---

## 2. Settled. Do not re-litigate.

- **The engine's three layers are built, verified and live.** The CPU fold and object transform
  match matrices extracted from the running rig. Frame cost 0.240ms against a 0.300ms ceiling.
- **The depth-buffer bug is fixed** (`ba01581df`). It caused the stair-step artefact. Do not
  re-enable `CULL_FACE` as an optimisation — the sheet is double-sided by design.
- **D880 stands.** Bean authorised porting the reference's vertex-shader mechanism. The palette
  PNG is a measurement fixture read in place from `.claude/scratch/`, never in `plugins/`.
- **Gate E stays held.** `.claude/scratch/stripe-hero-poc/` is in ZERO git files — `git ls-files`
  returns 0. A `git clean -xdf` destroys every reference number permanently.
- **The comparator's design was council-approved.** Do not redesign it. Two follow-ups are named
  below; everything else about it is settled.

---

## 3. First action — under 5 minutes

```bash
cd plugins/sgs-blocks && npm run fidelity:compare
```

Reproduce the current numbers before changing anything. Expect exit 1, with 2 of 3 sampled phases
over the 5% ceiling. If you get different numbers, stop and find out why — the baseline records
GPU renderer, Chromium version, crop box and input hashes precisely so a mismatch is visible.

---

## 4. The gap, as measured

| Effective phase | Crop-wide | Painted-only | bias/abs |
|---|---|---|---|
| 0.70 | **5.29% over** | 10.71% | 0.943 |
| 1.10 | 4.71% | 9.90% | 0.916 |
| 1.90 | **5.63% over** | 10.64% | 0.871 |

**Quote the painted-only figure.** 52% of the crop is background clipped at G≥253, so the
crop-wide number is diluted roughly twofold by pixels that agree because both sides are blank.

---

## 5. The hypothesis, and what must be eliminated first

⛔ **A colour/tone cause was asserted and withdrawn.** `bias_over_abs ≈ 0.90` measures
DIRECTIONALITY, not spatial uniformity — a localised, one-signed geometric divergence produces a
high ratio too. Three figures in `fidelity-baseline.json` contradict a tone cause:

- painted coverage differs by 7.7 points at t=17500 (ours 0.319, rig 0.396) — **a tone shift cannot change how
  much of the canvas is covered**
- distinct hue count differs 2.3× (162 vs 371)
- the error is bimodal: ~50% of pixels within 4/255, ~43% beyond 32/255. A gamma or transfer
  difference is smooth and everywhere-present.

**Shape divergence is the leading hypothesis. It is UNTESTED.** "Not noise" is exculpatory for
noise only — never inculpatory for anything else.

**Eliminate these two before investigating shape.** Both are live alternative explanations, and
both are cheap:

1. **The comparator measures the wrong configuration.** `poc-replica.html` calls
   `createGenerativeBackground()` with only `textureSource` and `speed`. Production goes through
   `fx-generative-background.js`, which passes ~13 further uniforms from block attributes
   (`dispAmount`, `foldFreq1-3`, `foldPower1-3`, `glowAmount/Power/Ramp`, `groundColour`). So the
   baseline compares the module's `DEFAULT_*` constants against the reference — not the shipped
   look. Any default that diverges is part of the gap.
2. **Four Chromium harnesses have drifted.** `fidelity-compare.mjs`, `flip-probe.mjs`,
   `capture-render.mjs` and `extract-reference-matrices.mjs` each implement their own server, MIME
   map, traversal guard and GPU flags. They already disagree: one roots where the palette 403s,
   and painted-geometry thresholds are duplicated in two places. Extract a shared
   `harness-lib.mjs` owning `serve()`, `launch()`, the flag list, DPR, canvas box, thresholds and
   an exit-code enum.

---

## 6. Hazards — carried forward, still live

- ⛔ **Assert the EFFECTIVE value, not the raw one.** The comparator's own precondition asserted
  `ours.utime === rig.utime`, passed on every run, and was comparing moments 25,000× apart in
  phase, because the reference scales time inside its shader by 4e-5. An assertion that passes
  while meaning nothing is worse than none.
- ⛔ **`preserveDrawingBuffer` is false on both sides.** A `readPixels` after the compositor runs
  returns ZEROS on a page rendering perfectly. This produced a false "0% painted" report twice in
  one session. Use `page.screenshot()`, or draw and read in the same evaluate turn.
- ⛔ **Never `compare.py`'s `DEFAULT_CROP`.** Its own comment calls it "the softer crop on edges",
  and edges are the known defect class. Pass an explicit crop and record it.
- ⛔ **`compare.py` never exits non-zero on a bad comparison.** Parse its `--json`; never read its
  exit code as a verdict.
- ⛔ **Never run `git stash`, `git clean`, `git checkout -- .` or `git restore .`** — several
  sessions share this tree, and a `git stash -u` has already destroyed an hour of a peer's work.
- ⛔ **Commit path-scoped.** A bare `git commit` flushes the whole index and sweeps other tracks'
  staged files. A glob pathspec is not a scoped commit.
- ⚠ **Two bypass layers exist and are separate.** `[gates-ok:<reason>]` clears the session hook;
  git's native `.githooks/pre-commit` needs `--no-verify` as well. Using `--no-verify` skips
  gitleaks, so hand-scan the staged diff for secrets.

---

## 7. Tools

| Skill | When |
|---|---|
| `/delegate` | Pick the model for every dispatch |
| `/subagent-driven-development` | If the work splits into independent tasks — it found five Criticals this session that inline work would have shipped |
| `/adversarial-council` | Before building anything substantial. It returned NO-GO on a design that looked fine and found a live rendering bug nobody was hunting |
| `/qc-council` | Validating a fix-shape against a measured baseline |

**Canary credentials:** `.claude/secrets/sandybrown.env`, always available, values single-quoted.

⚠ Headless Chromium has no WebGL without `--use-gl=angle --use-angle=default
--ignore-gpu-blocklist --enable-gpu`. Confirm WebGL2 before trusting any "nothing rendered"
result, or a vacuous pass reads as real.

---

## 8. Done when

- The gap's cause is **proven, not inferred** — a measured before/after, not a plausible story.
- `npm run fidelity:compare` passes at all three sampled phases, or the residual is recorded as an
  accepted delta with a reason and a date in `fidelity-baseline.json`.
- **Bean's NAMED visual sign-off** against the "B-movie 3D VFX" rejection risk. No number closes
  this; the acceptance criteria say it is his eye.
- `decisions.md` carries the closing entry, D-ceiling re-derived immediately before the commit
  (anchor the grep on `^## D` — an unanchored one once matched a hex colour and reported D5557).
- `LEDGER.md`'s motion section reflects the outcome — fold in, do not append. It sits near a
  24,576-byte cap.
- `python .claude/hooks/handoff-preflight.py --check` passes.
