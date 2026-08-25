---
doc_type: report
project: small-giants-wp
spec_ref: 38
status: PROPOSAL — drafted from a POC session; Spec 38 deliberately not edited. Needs Bean's decision.
last_updated: 2026-08-25
---

# Proposal — Tier W needs a runtime budget, not just a byte budget

**Status: a proposal, not a decision.** Spec 38 is not writable from a POC session, so this is
drafted here for a later session to act on with Bean's sign-off.

## Problem

Spec 38 §1.2b gives Tier W a **named 120KB JS allowance** (D479) and **no runtime budget at all**.
Every containment mechanism the tier has — the closed list, the D-numbered admission, the byte
allowance — bounds *download size*. None of them bounds *what a frame costs to draw*.

## Effect: the budget that exists does not constrain the thing that hurts

The Q6 measurement (2026-08-25) shows the two are close to uncorrelated:

| Effect | Bytes gzip | % of 120KB allowance | GPU ms/frame @1.06MP |
|---|---|---|---|
| `surface-treatment` (FR-38-29) | 5,674 | 4.6% | not measured |
| `flowing-gradient` (FR-38-31) | 3,648 | 3.0% | **0.040** |
| Reference two-pass hero (study rig) | — | — | **0.373** |

**An effect 9.4× more expensive to draw need not be any larger to download.** A Tier W effect could
sit at 3% of its byte allowance and still drop a mid-range phone below 30fps. The current budget
would report that as comfortably compliant.

This is not hypothetical for the FR-38-31 rework. Adding the second pass — the single biggest
visual contributor after form and ground — costs **0.261ms, 70% of the total frame**, while adding
almost nothing to the bundle. Under a byte-only budget that change is free. It is not free.

## Solution — two parts, and deliberately only the first is a number

### Part 1 (propose adopting now): a measurement obligation

Every Tier W effect must ship with a **measured per-frame GPU cost** recorded in its FR entry,
together with the configuration it was measured on. Not an estimate — a measurement, from the
committed harness.

- Harness: `.claude/scratch/stripe-hero-poc/perf/measure-frame-cost.mjs` (promote to a permanent
  home if adopted — it currently lives in scratch and scratch does not promote).
- Method: GPU timer query as primary, batched wall-clock with a `readPixels` stall as the
  independent check, **both controls run** (a `glClear`-only negative control, and a DPR positive
  control). ⚠ Two instruments in this very study returned confident, plausible, wholly false
  numbers; only the controls caught them. A cost figure without its controls is not evidence.
- Reported alongside: backing-store pixel count and **ms per megapixel**, because a cost measured
  at one canvas size does not transfer to another.

### Part 2 (propose deferring): the threshold itself

⛔ **Do not set a number yet, and this is the important recommendation.**

This same study self-set a 5% fidelity ceiling with no derivation and no precedent, and the
adversarial council was right to call it out. Repeating that mistake one document later — inventing
a "0.5ms per frame" ceiling from a single measurement on a single desktop GPU — would be the
identical error with a different unit.

What is needed before a threshold can be defended:

1. **Three or more Tier W effects measured** on the same harness. Currently there is one
   (FR-38-31) plus a study rig that we do not ship.
2. **At least one weak-GPU data point.** Every figure here comes from an RTX 2060. The reference
   implementation's own 47-entry GPU blocklist and `failIfMajorPerformanceCaveat` exist precisely
   because this class of effect stops being cheap on weak hardware — so the strong-GPU number is
   the least informative one available.
3. **A stated reference configuration** the budget is expressed against, so the number means the
   same thing to the next reader.

Until then, the honest position is: **measure and record, do not gate.** A recorded number that
everyone can see beats an invented threshold that gets quoted as though it were derived.

## What can be said today, with evidence

- 0.373ms/frame is ~2% of a 16.7ms budget on a strong desktop GPU. **Relatively expensive,
  absolutely cheap — on that GPU.** Both halves matter and neither generalises alone.
- The effect is **fillrate-bound**: 3.0× cost for 4× the pixels. FR-38-31's existing DPR cap of 1.5
  is therefore doing real work and should stay. ⭐ A DPR cap is the highest-leverage runtime control
  Tier W has, and it is already in the codebase.
- **Drawing every 2nd frame halves the cost** for motion this slow, and is confirmed working in the
  reference (601 rAF ticks → 301 drawn frames). FR-38-31 does not currently do this; it is a
  candidate cheap win, subject to checking it does not make slow motion look stepped.

## Recommendation

Adopt Part 1 as a Spec 38 §1.2b amendment. Explicitly record Part 2 as deferred, with its three
preconditions named, so the absence of a threshold is a stated position rather than an oversight a
future session quietly fills in with a guess.

**Evidence:** `.claude/reports/2026-08-25-stripe-hero-anatomy.md` §Q6 ·
`perf/frame-cost.json` · D791.
