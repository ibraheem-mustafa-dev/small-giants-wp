---
doc_type: plan
plan_id: poc-replica-fidelity-harness
phase_name: Like-for-like POC replica + tool-driven visual accuracy comparison
project: small-giants-wp
created: 2026-08-29
spec_ref: 38
status: SUPERSEDED 2026-08-29 — /adversarial-council returned NO-GO (6 seats; metrologist D+, cynic D+, spec-lawyer C-, IP C, ship-PM C+, fact-check B). Kept for the reasoning ONLY. Replaced by .claude/plans/2026-08-29-fidelity-comparator-build-plan.md, which is a quarter the size. Do NOT build from this file. Findings recorded at D887.
---

# POC replica harness + fidelity comparison — design

## The problem this solves

**Problem.** We cannot currently answer "how close is our engine to the POC?" with a number
anyone can check. The evidence so far is a silhouette IoU I computed ad hoc and two screenshots
compared by eye. Bean's standing rule is that his eye is co-authoritative (R-31-13) — *not* that
his eye is the only instrument.

**Effect.** Every fidelity claim needs Bean to personally look, which makes him the bottleneck on
a loop that should be self-verifying, and makes regressions invisible between his looks.

**Solution.** Rebuild the POC's page setup exactly, driving *our* engine, and compare the two with
the same comparator that was used to verify the POC against live Stripe.

## ⛔ The central design constraint — one number over four variables is unattributable

A raw pixel diff of "our page" vs "the rig" conflates four independent things:

1. Geometry / transform (layers 1+2+3)
2. The fragment pipeline (grading, striations, glow gate, depth fade, grain)
3. The texture
4. The §7 post-pass (angular blur + grain) — which we deliberately do not build

A single percentage over all four tells us *that* we differ, never *where*. Worse, it cannot
distinguish a real defect from a feature we chose not to implement. So the design is a **ladder**:
each rung holds everything constant except one thing.

| Rung | Ours | Reference | Isolates | Gate? |
|---|---|---|---|---|
| **0** | rig @ fixed t | rig @ same t | Comparator noise floor | Yes — must be ~0% |
| **1** | our engine, same palette, `nopost` | rig, same palette, `nopost` | **Geometry + shading** | Yes — the real signal |
| **2** | our engine in exact page clone | rig page | "Does it look like the POC" | Bean's eye |
| **3** | *(context only)* | rig with post | What §7 would buy | No — informational |

⭐ **Rung 0 is not optional and is the rung most likely to be skipped as ceremony.** Without a
known-answer control, a 4% result at rung 1 is uninterpretable — there is no way to tell a real
defect from the comparator's own floor. The rig already contains `perf/identify-pairs.py`, which
exists *because* a previous session trusted filenames over content and produced a confidently
wrong 14.81% figure. Rung 0 is the same defence.

## Decisions taken (Bean, 2026-08-29)

| Decision | Choice | Reasoning |
|---|---|---|
| Post-pass in the comparison | **`?nopost` on both sides** | Blur softens edges — it destroys exactly the geometric detail being measured. Comparing at nopost is what measures *shape*. Whether we ultimately BUILD §7 is a separate decision, deferred until after shape sign-off, informed by rung 3's number. |
| Colour control | **Feed OUR engine the rig's palette PNG** | Holds colour constant so the diff is attributable to geometry. |
| Page replica scope | **Exact clone of the rig's page** | Identical markup/CSS/text/canvas box, so the comparator sees only the effect differing. |
| Time anchor | **Fixed t, ~3 sampled moments** | A defect can appear at one phase of the breathing cycle only. Reuses the multi-frame rig the contrast criterion needs anyway. |

### ⚠ The §7 cost framing was corrected during this design

The technique spec's "70% of total frame cost" is a **ratio, not a burden**. Absolute figures:
wave pass 0.113 ms, post pass 0.261 ms, total 0.373 ms — **2.2% of a 60 fps frame**. Bean was
right to challenge it, and that Stripe ships it is real evidence it is affordable.

Two corrections in the other direction, recorded so this is not re-litigated from the wrong
premise next time:

- **"Raw so it's lighter" does not apply to §7 specifically.** three.js's overhead is CPU/JS; the
  post-pass cost is GPU fillrate (six texture samples per pixel over a fullscreen quad). A raw
  reimplementation costs about the same. Raw wins on bundle size and CPU, which we already win.
- **The genuine blocker is architectural, not performance.** The Tier W renderer interface is
  single-pass by construction; a post-pass needs framebuffers, which reopens D479 decision 2. That
  is a design gate for Bean to open, not a performance veto. It remains open.

### ⚠ The palette-PNG decision, and why the concern was over-stated

Bean chose to feed our engine the reference's palette PNG. The concern originally raised against
this was **too strong**: that file is *already in this repo* at
`.claude/scratch/stripe-hero-poc/assets/palette-a.png`, deliberately retained under a held Gate E
as study material. Using it in a local harness introduces **no new copy**, which is what KJC-4
actually prohibits ("study it, write our own, keep nothing").

**Binding guardrails, unchanged:**

- It is read from its existing `.claude/scratch/` location. No copy is made.
- It never enters `plugins/` or `theme/`, and never ships in any build or client site.
- Harness renders are gitignored. The reference rig's own rendered output is never committed.
- The shipped engine's colour continues to come from client theme tokens via the OKLCH pipeline.
  The palette is a **measurement fixture only** — it is not, and must not become, a fallback,
  default, or asset.

## Components to build

### 1. `poc-replica.html` — our engine in the rig's page

An exact clone of the rig's hero markup, CSS, text and canvas box (`left: 330px`, 1393×761 within
a 1440×900 viewport), mounting `createGenerativeBackground()` instead of three.js.

Exposes the same debug contract the rig does, so one capture script drives both:

- `window.__ready` — set once the first draw has landed
- `window.__drawAt(t)` — deterministic single-frame draw at an absolute time
- `?nopost`, `?t=`, `?pal=` — same query-parameter vocabulary as the rig

⚠ **The contract must match the rig's exactly.** If the two pages signal readiness differently the
capture script needs a branch per page, and a branch is where a "the effect never drew" bug hides
as "the page was slow".

### 2. `fidelity-compare.mjs` — the capture + compare driver

Renders both pages at matched settings, then calls the **existing** comparator.

⛔ **Reuse `.claude/scratch/stripe-hero-poc/perf/compare.py` — do not write a second comparator.**
It is the canonical one, it reports the statistic that matters (bias/abs ratio, which separates a
systematic colour cast from zero-mean noise), and a fidelity number produced by a fresh ad-hoc
comparator is exactly the failure its own docblock was written about.

⚠ **Its 5% ceiling is a local convention for that study with no derivation, and its own docblock
says so.** Do not cite it as a project standard. This harness reports the number; the pass line is
Bean's to set once we see rung 0's floor.

### 3. `ablate-uniforms.mjs` — what each variable actually does

For each of the ten geometry uniforms: render at its default, then at ±N%, and report the pixel
delta plus a contact sheet. Turns "what does `twistPowerY` do?" into a measured answer rather than
folklore, which is Bean's stated prerequisite for moving to client colours.

## Load-bearing assumptions

| Assumption | Status | If wrong |
|---|---|---|
| The rig's `?nopost` / `?t=` params work as documented | **PROVEN** — read in `index.html`; `NOPOST` and `T_ABS` are live | — |
| `compare.py` runs and takes two PNGs + crop | **PROVEN** — docblock read, usage documented | — |
| The palette PNG exists at the stated path | **PROVEN** — listed in `assets/` | — |
| Our engine can accept an arbitrary texture source | **PROVEN** — `opts.textureSource`, used by the perf harness | — |
| Rung 0 will show a near-zero floor | **ASSUMED** | If the floor is high, the animation is not deterministic frame-to-frame and rung 1 numbers mean nothing until that is fixed. **This is why rung 0 runs first.** |
| Our fragment pipeline is close enough that rung 1 reads as geometry | **ASSUMED** | If rung 1 is dominated by shading differences, add a rung 1a with grading neutralised on both sides. |

## Out of scope

- Building §7. Deferred pending Bean's decision, now informed by a measured number.
- Client-colour work. Explicitly sequenced *after* shape fidelity and per-variable understanding.
- Changing the engine to chase a number before Bean has seen rung 2.

## Definition of done

1. Rung 0 reports a near-zero floor, establishing the comparator works.
2. Rung 1 reports a geometry number with the bias/abs ratio, at three sampled times.
3. Rung 2 produces a side-by-side of two pages identical but for the engine.
4. The ablation table exists for all ten uniforms.
5. Every figure is reproducible by re-running one command.
