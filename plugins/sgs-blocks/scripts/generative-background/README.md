# Generative background — fidelity comparator

This directory holds the fidelity harness for the WebGL generative-background effect
(`src/shared/effects/webgl/generative-background-transform.js` + the block's viewScriptModule).
It answers one question — **does our engine's output match the design reference closely enough
to ship?** — and it answers it two ways: a number (`fidelity-compare.mjs` → `fidelity-baseline.json`)
and an eye test (`blink.html`).

If you are reading this after the reference rig is gone, start at **"The reference rig is
temporary — read this first"** below.

## The reference rig is temporary — read this first

The ground-truth visual reference this whole harness was built against is
`.claude/scratch/stripe-hero-poc/` — a captured/derived copy of a real Stripe.com hero
animation, used only to answer "does ours look right?" during development.

- It has **never been committed to git.** `.claude/scratch/` is gitignored project-wide.
- It is **expected to disappear** — scratch directories in this project are working
  material, not permanent fixtures, and get cleaned up.
- If it's gone and you need it back, it is not recoverable from this repo. Nothing in this
  README can regenerate it; it was a one-off capture of a third party's live site.

**This means every tool in this directory that talks to the rig — `fidelity-compare.mjs`,
`capture-render.mjs`, `flip-probe.mjs`, `extract-reference-matrices.mjs` — stops working the
day the rig disappears.** That is fine and expected. What survives is:

1. **`fidelity-baseline.json`** (committed) — the durable numeric record of the last
   comparison. See below for what its numbers mean.
2. **`reference-matrices.json`** (committed) — ground-truth transform matrices extracted from
   the rig, used by `verify-transform.mjs` to check the shipped maths without needing the rig
   itself ever again. This is the one gate in this directory that keeps working forever.
3. **This README.**

Do not try to "fix" a tool in here that fails because the rig is missing. That failure is
correct — it means you've reached the point this README describes.

## What the committed `fidelity-baseline.json` numbers mean

`fidelity-baseline.json` is the output of the last `fidelity-compare.mjs` run. It compares our
engine's rendered frame against the rig's, at three sampled `u_time` values, and records the
result as a JSON tree with several **rungs**:

| Rung | What it checks | Why it exists |
|---|---|---|
| `0a_determinism` | rig vs itself, same settings | If this isn't ~0, nothing else below can be trusted — the capture apparatus itself is noisy. |
| `0b_positive_control` | rig vs a deliberately corrupted copy (+3/255 on green) | Proves the comparator (`compare.py`) actually detects a known injected difference. If this fails, `compare.py` is broken and every other rung is meaningless. |
| `0c_discrimination` | rig at two different **effective phases** | Proves `?t=` genuinely reaches the shader uniform and this isn't silently comparing one cached (or near-identical) frame to itself. |
| `1_geometry_shading` | **ours vs rig, per sampled `u_time`, at the SAME effective phase** | The actual fidelity result. This is the headline number. |
| `2_side_by_side` | full-page captures, no scoring | Feeds `blink.html` — for a human eye, not a threshold. |

**⚠ `u_time` is a raw uniform value, not the shader's effective phase — read this before
quoting any number.** The rig scales time INSIDE its shader (`u_time * u_speed`, with
`u_speed = 4e-5`); ours doesn't. `fidelity-compare.mjs`'s `SAMPLE_TIMES` are the RIG's raw
`?t=` values (chosen inside its real operating range — `timeOffset(17500) + seconds*1000`);
the driver converts them to the matching replica time via `oursTimeFor(t) = t * 4e-5` so both
engines land on the same effective phase. **A previous version of this driver skipped that
conversion and drove both sides with the same raw value — 25,000x apart in actual phase — while
its own precondition check compared the raw uniforms and passed.** That bug is fixed; the
numbers below are from the corrected run.

**The headline figures, as of the last committed run (this session — ground colour + silhouette
IoU added; numbers below are effectively unchanged from the 2026-08-29 corrected-phase-mapping
run, see "what's been eliminated" below):**

| `u_time` (rig raw) | effective phase | `mean_abs_pct` (crop-wide) | masked mean_abs_pct (painted-only) | `bias_over_abs` | silhouette IoU |
|---|---|---|---|---|---|
| 17,500 | 0.70 | 5.28% ⚠ OVER | 10.69% | 0.942 | 0.772 |
| 27,500 | 1.10 | 4.70% | 9.88% | 0.915 | 0.799 |
| 47,500 | 1.90 | 5.62% ⚠ OVER | 10.61% | 0.871 | 0.756 |

**Verdict: FIDELITY FAILURE — 2 of 3 sampled times over the 5% ceiling** (`verdict.overCeilingTimes`
in the JSON). Fixing the phase-mapping bug did **not** collapse or meaningfully narrow the gap —
the numbers before and after the fix are within a point of each other (4.61–5.40% before, at the
wrong phases entirely, vs 4.71–5.63% now, at correct phases). That consistency is itself informative:
whatever is causing this divergence is not sensitive to which moment of the animation gets sampled.

## What's been eliminated this session, with evidence — and what's genuinely new

Two named alternative explanations (D888) had to be ruled out before the shape-divergence
hypothesis could be trusted. Both were checked for real, not assumed:

1. **Wrong comparator configuration — ELIMINATED.** `poc-replica.html` calls
   `createGenerativeBackground()` with no fold/displacement/glow options, so a fresh block
   instance genuinely falls through to the same `DEFAULT_*` constants (`block.json` declares no
   `default` for any of the nine geometry attrs — confirmed). Ground colour was the one exception:
   production resolves it from a live theme token (`--sgs-genbg-ground`, `surface` = `#FAF9F6`),
   which the bare-engine replica page never set, defaulting instead to the engine's hardcoded
   `DEFAULT_GROUND` (`[0.98,0.98,0.97]`, near-white). `poc-replica.html` now accepts `?ground=`
   and `fidelity-compare.mjs` passes the real resolved token. **Measured effect: none worth
   noting** (5.29→5.28%, 4.71→4.70%, 5.63→5.62%) — the two colours were already near-identical
   sRGB triples, so this genuinely was not the cause, now proven rather than assumed.
2. **Harness drift — FIXED, not just ruled out.** `harness-lib.mjs` now owns the one shared
   `serve()`, MIME map, and GPU launch-flag list; `fidelity-compare.mjs`, `capture-render.mjs`,
   `flip-probe.mjs` and `extract-reference-matrices.mjs` all import it instead of four
   independently-drifted copies. Proven behaviour-preserving, not just asserted: every one of the
   four scripts was re-run post-refactor and produced byte-identical output to its
   pre-refactor run (`fidelity-compare.mjs`'s headline numbers unchanged to 2 d.p.;
   `flip-probe.mjs`'s sha256/diffs unchanged; `extract-reference-matrices.mjs`'s
   `reference-matrices.json` output is a zero-byte git diff against the committed copy;
   `verify-transform.mjs` still 7/7).

**New this session: a direct silhouette (shape-only) measurement, not inferred from
`bias_over_abs`.** `silhouette_iou` (new `compare.py`-adjacent Python subcommand in
`fidelity-compare.mjs`) computes intersection-over-union between each side's own painted mask —
answering "do the two renders occupy the same screen pixels", independent of any colour
difference within the overlap. **Result: IoU 0.76–0.80 across all three sampled phases, and our
side consistently covers LESS of the frame than the rig at every phase (39–41% vs 46–52%).** This
is real, direct evidence for shape divergence, not an inference from directionality — but it is
**not yet a proven cause**: the "painted" mask is "differs from the dominant background colour by
quantised-key", not a true geometric silhouette, so a stronger depth-fade-toward-ground blend on
our side (§2/§3's fragment effects, which were tuned by eye against the canary and never verified
against reference) could shrink the SAME underlying geometry's apparent coverage without any real
shape difference. **The next elimination step, not yet done:** isolate layers 1–3 (geometry only,
flat unlit fill, no glow-gate/striation/depth-fade) from the fragment-level effects, to find out
which one the silhouette gap actually belongs to before touching either.

- `mean_abs_pct` — the average per-pixel colour difference, as a percentage of the 0–255
  range, measured over the shared crop box (`fidelity-baseline.json`'s top-level `crop`
  field). The project's working ceiling is **5%** (`fidelityCeilingPct` — inherited from
  `compare.py`'s own printed convention, which is itself a local convention with no external
  precedent — see `fidelityCeilingNote` in the JSON).
- **masked mean_abs_pct** — the SAME comparison restricted to the union of painted (non-
  background) pixels on either side (`rung.perTime[t].maskedStats`). This exists because the
  crop-wide mean is diluted roughly 2x by agreeing, near-saturated background: 0b's own
  arithmetic shows only ~48% of crop pixels moved under a full +3/255 injection (the rest were
  already clipped near white), and that ~48–53% "background fraction" tracks `within_pct['4']`
  closely at every sampled time. The masked figure (~10%) is closer to the true divergence
  where the effect actually paints.
- **`bias_over_abs`** — the ratio of the *signed* mean difference to the *absolute* mean
  difference, per channel. 1.0 = pure systematic (directional) error; 0.0 = pure noise
  (compare.py's own docstring). **What this does and does not license:** a high ratio proves
  the divergence has a consistent SIGN — every affected pixel skews the same way. It does
  **not**, on its own, distinguish a global colour/tone shift from a spatially LOCALISED
  one-signed divergence (a shape or geometry difference that happens to always push colour the
  same direction wherever it occurs would also score high on this ratio). Per this project's
  binding rule, "not noise" is exculpatory for noise only — it is never inculpatory for a
  specific cause like colour transfer.
  - **Evidence that argues AGAINST a pure tone/colour-transfer cause, all already in the
    committed JSON:** painted coverage differs by 8 points (`painted.ours.coverage` ≈0.32 vs
    `painted.rig.coverage` ≈0.40) — a uniform tone/gamma shift cannot change how much of the
    frame reads as "painted"; distinct hue count differs 2.3x (`painted.ours.unique` ≈162 vs
    `painted.rig.unique` ≈371); and the error distribution is bimodal, not smooth
    (`within_pct['4']` ≈50%, meaning roughly half the crop is near-identical while the rest
    sits well beyond `within_pct['32']`) — a genuine gamma/transfer-function difference would
    be smooth and present everywhere, not concentrated in half the frame.
  - **The leading UNTESTED hypothesis, not yet investigated by this harness:** geometry/shape
    divergence between the two engines' displacement or fold maths at these phases, which would
    naturally produce exactly this signature — a one-signed error (whichever engine's ribbon
    extends further into a region reads as "more/less painted" there, always in the same
    direction) concentrated in a spatially distinct subset of the crop, not smeared everywhere.
    This has NOT been confirmed — it is the most consistent explanation for the coverage/hue/
    distribution evidence above, offered as the next thing to check, not a diagnosis.
  - What this rules out with reasonable confidence: the accepted `acceptedDeltas` divergences.
    `acceptedDeltas[0]` (blend) is **proven inert** in the JSON — SRC_ALPHA/ONE_MINUS_SRC_ALPHA
    with alpha≡1 is a mathematical no-op, verified against the live shader source — and
    `acceptedDeltas[1]` (`nopost`) records that the rig's post-process pass is fully REMOVED
    from the measured path on both sides. Neither can be the cause; a previous version of this
    README named them as the "most plausible" cause, which was wrong given data already in the
    same JSON — corrected here.

Every number in the JSON also carries its own provenance (GPU renderer/vendor, Chromium
version, viewport, DPR, crop box, SHA-256 of both compared PNGs) — see `environment` and each
rung's `stats` block. A number without this context is not comparable to a future run's number;
don't quote a bare percentage out of the file without also quoting where it came from.

## The tools, what each proves, and how to run them

Run everything from `plugins/sgs-blocks` (the directory with `package.json` / `node_modules`).

### `fidelity-compare.mjs` — the scored comparison (needs the rig + a GPU)

```
node scripts/generative-background/fidelity-compare.mjs
```

Captures both engines under matched settings, runs every rung above, and overwrites
`fidelity-baseline.json` with a fresh result. Also writes the full-resolution PNGs used for
the comparison into a **run-scoped** directory: `runs/<timestamp>-<pid>/` (gitignored — see
"No PNGs are committed" below). `fidelity-baseline.json`'s `runDir` field points at whichever
run produced it; if that directory is gone, the numbers in the JSON are still valid, you've
just lost the images.

**Deliberately manual** — this needs the reference rig and a real GPU context, so it is not
wired into `prebuild`. Run it by hand when you've changed the shader, the transform maths, or
anything else that could move the rendered pixels.

Exit codes: **0** = fidelity confirmed (all rungs passed). **1** = FIDELITY FAILURE — the
apparatus worked, but rung 1 measured over the 5% ceiling for at least one `u_time`. **2** =
HARNESS ERROR — a precondition failed, the comparator itself is broken (0a/0b/0c), or an
unhandled exception occurred anywhere in the script. **Trap:** `compare.py` (below) never
signals failure via its own exit code — see the trap section.

### `blink.html` — the sign-off artefact, for a human eye

```
python -m http.server 8787
# then open http://localhost:8787/blink.html
```

(Any static file server works — the page just needs to be served over `http://`, not opened
directly as a `file://` URL, because browsers block `fetch()` of local JSON files under
`file://`.)

Reads the committed `fidelity-baseline.json` at load time — no build step, no dependencies.
Stacks the "ours" and reference captures in the same box, ours on top. **Press space (or any
key) to instantly toggle the top layer's opacity** — this is the actual test. A human blinking
between two images catches registration and shape divergence far better, and far faster, than
reading a percentage. Arrow keys step through the three sampled `u_time` values; `A` switches
the reference between `rigMatched` (the exact settings that produced the scored numbers) and
`rigDefault` (the rig's real finished look, with post-processing and its own blend mode —
included for context, not because it's the pair that was scored). The on-screen caption always
says which is which.

If `fidelity-baseline.json` is missing, or the PNGs its `runDir` points at have been cleaned
(both expected — see below), the page says so in plain words rather than rendering an empty box
that could pass for a working comparison.

### `verify-transform.mjs` — the gate that survives the rig (no rig dependency)

```
node scripts/generative-background/verify-transform.mjs
```

Checks the **shipped production module**
(`src/shared/effects/webgl/generative-background-transform.js`, imported directly — not a
reimplementation) against `reference-matrices.json`, a committed snapshot of ground-truth
matrices extracted from the rig while it still existed. This is the one check in this
directory that keeps protecting the shipped engine after the rig is gone — it belongs in the
fast gate tier. Exits non-zero on any mismatch, and treats a passing negative control as a
failure too (a check that can't fail proves nothing).

### `extract-reference-matrices.mjs` / `capture-render.mjs` / `flip-probe.mjs` (need the rig)

Development-time tools used to build `reference-matrices.json` and investigate specific
divergences (the `flipY` texture bug, palette extraction, etc.) while the rig was available.
Kept for provenance of how the committed data was produced; not expected to run again once the
rig is gone.

### `harness-lib.mjs` — shared plumbing, no rig dependency of its own

The ONE static-file-server implementation, MIME map, and GPU launch-flag list every script above
imports, rather than each hand-rolling its own (D888 named the resulting drift — different roots,
different traversal guards, one server 403ing a palette PNG another needed — as a live alternative
explanation for part of the fidelity gap, separate from shape/colour). Not runnable standalone; it
has no CLI of its own. If you're modifying how any of the four scripts above serve files or launch
Chromium, change it here, not in the caller.

## Two traps that have already cost real time on this codebase

**1. `preserveDrawingBuffer: false` silently zeros a perfectly good render.**
Both engines create their WebGL context with `preserveDrawingBuffer: false` (the correct,
performant default). If you call `gl.readPixels()` *after* the browser has already composited
and presented the frame, you get back all zeros — indistinguishable from a genuinely blank
canvas. It is easy to build a probe that "confirms" nothing is drawing when the page is
actually rendering fine. Every capture in this directory uses `page.screenshot()` (which reads
the actual composited pixels), never a post-hoc `gl.readPixels()` call. If you write a new
probe, do the same — grabbing GL state or pixels straight out of the context after the fact is
not a substitute.

**2. `compare.py`'s exit code is not a verdict — read its `--json` output instead.**
`compare.py` (`.claude/scratch/stripe-hero-poc/perf/compare.py`, part of the now-gone rig tree)
**never exits non-zero on a bad comparison** — this was verified directly against its
`main()`. A comparison that measures 50% divergence and a comparison that measures 0% both exit
0. Any driver around it (this one included) must parse the `--json` result itself and apply the
threshold in its own code; a non-zero exit from `compare.py` means the *comparator itself*
broke (a HARNESS ERROR), never that the comparison found a fidelity problem. Conflating the two
logs "the crop argument was wrong" as "we regressed" — a false alarm that looks like real
evidence of a fidelity failure.

## No PNGs are committed

Every capture PNG this harness produces lives under a run-scoped `runs/<timestamp>-<pid>/`
directory and is covered by the repo's blanket `*.png` gitignore rule. This is deliberate and
asset-scoped, not path-scoped: several sessions can share this worktree, so a fixed output
path would let two concurrent runs silently read or overwrite each other's frames, and imagery
is large, regenerable, and not itself the evidence — the derived statistics and SHA-256 hashes
in `fidelity-baseline.json` are the durable record; the pixels that produced them are not.
`blink.html` is built to say so plainly (rather than render a blank comparison) whenever a
run's images are no longer on disk.
