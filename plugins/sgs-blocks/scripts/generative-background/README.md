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
engine's rendered frame against the rig's, at three sampled `u_time` values (2, 5, 9), and
records the result as a JSON tree with several **rungs**:

| Rung | What it checks | Why it exists |
|---|---|---|
| `0a_determinism` | rig vs itself, same settings | If this isn't ~0, nothing else below can be trusted — the capture apparatus itself is noisy. |
| `0b_positive_control` | rig vs a deliberately corrupted copy (+3/255 on green) | Proves the comparator (`compare.py`) actually detects a known injected difference. If this fails, `compare.py` is broken and every other rung is meaningless. |
| `0c_discrimination` | rig at `t=2` vs `t=9` | Proves `?t=` genuinely reaches the shader uniform and this isn't silently comparing one cached frame to itself. |
| `1_geometry_shading` | **ours vs rig, per sampled `u_time`** | The actual fidelity result. This is the headline number. |
| `2_side_by_side` | full-page captures, no scoring | Feeds `blink.html` — for a human eye, not a threshold. |

**The headline figures, as of the last committed run (2026-08-29):**

| `u_time` | `mean_abs_pct` | `bias_over_abs` |
|---|---|---|
| 2 | 4.61% | 0.906 |
| 5 | 5.40% | 0.903 |
| 9 | 5.21% | 0.930 |

- `mean_abs_pct` — the average per-pixel colour difference, as a percentage of the 0–255
  range, measured over the shared crop box (`fidelity-baseline.json`'s top-level `crop`
  field). The project's working ceiling is **5%** (`fidelityCeilingPct` — inherited from
  `compare.py`'s own printed convention, which is itself a local convention with no external
  precedent — see `fidelityCeilingNote` in the JSON).
- **`bias_over_abs`** — the standing finding of this whole exercise. It is the ratio of the
  *signed* mean difference to the *absolute* mean difference, per channel:
  - **1.0** means the divergence is **pure systematic error** — every pixel is off in the
    same direction (e.g. everything is 15% too green). This is what a colour-space, blend
    mode, or texture-decoding bug looks like.
  - **0.0** means the divergence is **pure noise** — as much too light as too dark, evenly
    scattered. This is what genuine per-pixel randomness or dithering looks like.
  - **The measured ~0.90–0.93 here is close to 1.0**, i.e. this is almost entirely a
    directional colour cast, not noise. That means the ~5% gap is very likely a single fixable
    systematic cause (most plausibly the accepted blend/post-processing divergences logged in
    `acceptedDeltas` in the JSON), not death-by-a-thousand-small-differences. Anyone picking
    this back up should chase the systematic cause, not tighten tolerances.

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
