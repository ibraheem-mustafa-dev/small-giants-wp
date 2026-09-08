# FR-38-31 perf harness — promoted out of `scratch/` 2026-09-08

The measurement tooling behind the FR-38-31 / generative-background-engine perf work,
moved here so it survives `scratch/`'s 30-day ageing-out. Phase 2 item 8 of the
(now archived) generative-background-engine plan.

## What is here

| File | What |
|---|---|
| `fr3831-perf.html` | The perf fixture page, driven repeatedly by `measure-frame-cost.mjs`. Deliberately separate from the banding fixture so editing one cannot put the other's recorded result in question. |
| `negative-control.html` | The control page — proves the harness can register a difference. |
| `measure-frame-cost.mjs` | The frame-cost driver. |
| `capture-heldout.mjs` | Captures the held-out comparison pair. |
| `compare.py` / `identify-pairs.py` | Comparison + pairing. |
| `gate-e-check.py` + `gate-e-manifest.txt` | Gate E check and its manifest. |
| `frame-cost.json`, `heldout-*.json`, `selfcheck.json` | The recorded results. |

## What is deliberately NOT here

**The PNG captures were left behind, not forgotten.** `heldout-live-dpr1/2.png` are
screenshots of another party's live page — their expression. The licence position
(technique spec §"Licence position, stated once") is that their artwork is never
reproduced anywhere tracked, and `reports/` is tracked and permanent. The `heldout-rig-*.png`
files are our own rig's output and were left with them only to keep the pair together.

The measurements those images produced are preserved in the JSON files above, which is
what any future reader actually needs. Re-running `capture-heldout.mjs` regenerates the
images locally if a visual comparison is ever needed again.

## Paths

These scripts were written to run from `.claude/scratch/stripe-hero-poc/perf/`. Relative
paths inside them are not rewritten — check before re-running from here.
