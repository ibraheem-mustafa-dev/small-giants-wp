---
doc_type: session
date: 2026-08-24
track: colour-golden / tooling
summary: "prebuild 153.4s -> 31.0s; the burn-down metric exists; the migration method
  rewritten, cut and gated across four adversarial rounds"
---

# Session — detector-first and the serial loop

Full narrative. `LEDGER.md` carries the live status; this file carries the detail so the
LEDGER can stay inside its byte cap.

## T1 — the serial build loop, closed

`prebuild` was 61 `&&`-joined commands, 3,353 characters, **fail-fast**. Measured
end-to-end for the first time: **153.4s**. The ~128s figure in circulation came from a
single unrecorded spot-timing and was 17% low.

Split by measurement, not by guess. The four heavyweights were **76.1%** of the total:

| Gate | Measured | Share |
|---|---|---|
| `pytest-oracle-converter` | 47.32s | 33.8% |
| `check-dead-api-calls` | 31.21s | 22.3% |
| `audit-block-file-consistency` | 16.66s | 11.9% |
| `inspector-scan-run` | 11.31s | 8.1% |

The council's guess about *which* four was right — but it was a guess until it was run.

**After: 31.0s.** 57 of 61 commands still run on every build.

⛔ **`build-deploy.py` had NO gate step to repoint.** It calls `npm run build`; npm fires
`prebuild` as a lifecycle hook. Splitting `prebuild` alone would have silently dropped all
four heavyweights from the deploy path. `step_gate_full()` is new; `npm run gate:wired`
fails closed if that call ever disappears — and it was observed FAILING before the wiring
landed, then passing after.

**A regression this caused and caught by reading the diff, not from a gate:**
`generate-tooling-catalogue.py` derived its gate table from the `prebuild` STRING, so
collapsing that string deleted 55 gates' descriptions from `dev-setup.md` (−488 lines)
while `--check` still exited 0. Fixed to read the roster.

## T3 — the burn-down, closed

`scripts/programme-progress.py`. **109 attributes / 37 families / 27 properties** still on
a flat tier trio.

⛔ **No percentage, deliberately.** Both obvious denominators are wrong: `css_tier` is
Front-1 CSS-routing metadata, not migration status (only 23 of 306 flat-named rows carry
it); `attr_type='object'` conflates three shapes (spec-39-seed-requirements G5). And a
finished migration DELETES its Tablet/Mobile sibling rows, so it becomes structurally
indistinguishable from an attribute that never needed one — the schema no longer holds the
original total. Any ratio would read 0% by construction and never move.

The subagent's figure was **more correct than my own reproduction**: I got 34 families, it
got 37, and it was right — it recognised `{base}Desktop` as a valid desktop tier where I
only checked the bare name (`brand-strip.columns`, `hero.textAlign`, `whatsapp-cta.showOn`).

## T0 — the method: four rounds, fifteen personas

### The thesis was backwards

The doc claimed the colour rollout was slow because it had no census. **It had one.**
`f6f3c0331` (2026-08-15 — **day 2** of the window) built its worklist *"from the DB's
`role='color'` census this session"*, landed 33 blocks in ONE commit, and caught two errors
in the hand-derived list it replaced.

What cost the fortnight was that the target SHAPE was still being decided while it ran:

| | Decision | How it was settled |
|---|---|---|
| D609 | ONE colour control everywhere | amended SAME DAY after Bean rejected a build on sight |
| D618 | not into native's `group="color"` | Bean looking at a live editor page |
| D621 | the panel belongs in STYLES | overturned D618 |
| D622 | placement follows D533/D537 | a census |
| D632 | colour split from ShadowControl | a survey, run AFTER the shape was decided |

Bean's ruling: add a shape-gate (Step 3) in front of the census for client-visible changes.
That also closes the Rule 7 design-gate conflict, because the shape gate IS the design gate.

### Five unsound figures, four of them found here

1. six D-numbers dated 2026-08-11 read as "took one day"
2. "1 day each" — a COMMIT DATE, in the table banning that inference
3. "13 days, 25 corrections" — those D-numbers span **three** days
4. "71 commits, 23 fixes" — written AS the correction to #3, with "re-run it, do not trust
   this sentence" attached. Re-run: **67 and 21**. The grep matches commit BODIES; only 8
   of 67 name the panel in their subject
5. "fixed 255 rows" — 255 is the CENSUS size; `daf9e6935` records `AUTOFIXABLE 161 (75%)
   -> 29 (14%)`. It sat **four lines below** the sentence quoting "14%"

**The rule: never a commit date, never a D-number, never a body-matching grep.**

### Gates built, each with a negative control, each proven to fail

- **`crosscheck()`** in `migrate-length-sanitiser.py` — the whole-corpus stage
  `transform()` structurally cannot be. `--check` gates on it.
- **`BARE_OK`** — every surviving bare mention pinned by per-file count with a reason. The
  load-bearing one: `helpers-box.php:30`, a `function_exists()` polyfill guard where the
  string IS the function's identity.
- **`WIDTH_OK` + `broad_enumeration()`** — reconciles `targets()` against a second, dumb,
  wide walk sharing no code with it. **Found a real gap on its first run.** Defeats the
  narrow-`targets()` evasion: 4 files → `CORPUS TOO NARROW: 7 file(s)`, exit 1.
- **`check-withdrawn-figures.py`** — five shapes. A/B anchored on sentences; C/D/E anchored
  on the FIGURE, because prose gets reworded and the number is what misleads.
- **`check-doc-citations.py`** — every `| \`sym\` | \`:N\` |` row must land on what it
  names. The skeleton table rotted **three times in one day**.
- **tier integrity** in `run-gates.py` — a `--check` in `tier: generator` runs on NO tier
  while `gate:list` prints it and `--assert-wired` passed. And `gate:selftest` had been RED
  for two commits (hardcoded `== 61` against a 63-row roster) with nothing running it.

### The council itself was the finding

Nine personas across three rounds, nine MUST-FIX lists, **zero asked to subtract** — and
the document grew every round: **222 → 343 → 513 → 605 → 670**. Round 1's Cynic and
Saboteur had warned that another prose pass "is the accretion failure, not the fix"; that
lens was dropped and the failure reproduced.

Round 4 added a **Cutter** (subtraction only, forbidden from proposing additions) and a
**Saboteur** (evasion). Both found things nine reviewers had missed. **670 → 582.**

### Grading was measuring the graders, not the document

Round 1's grades were never data: five personas, **three** recorded grades, and the
`D+/D/C−/C+/B−` line had two attributable to nobody. Worse, the grade was
**anti-correlated with severity** — the persona that found an impossible instruction and a
crash-inducing template gave C+; the one that verified 30 claims exact gave C.

`rubrics/migration-method-grading.md` makes each tier a checkable outcome, with a floor
(no confirmed finding above B-class ⇒ cannot grade below B) and a ceiling (any confirmed
F-class ⇒ cannot grade above D), and requires `CONFIRMED / PEDANTIC / WRONG` counts.

Round 4 result: **0 WRONG across all four personas**, and four self-reported WRONGs were
their own attacks failing — including a Cutter that checked its instinct to delete the
withdrawn-figures table, found `check-withdrawn-figures.py` names that file as its sole
permitted home, and logged its own instinct as wrong.

## What I got wrong, for the record

- Fixed ~20 false claims and **introduced five new ones**, including the fifth unsound
  figure inside the section about unsound figures, and a wrong D-number cited twice
  (D574 for what is D575).
- Cited `helpers-box.php:30` as a third bare-mention site for a rename — **it guards a
  different function**. Conflated two symbols into one example.
- My banner codemod fixed ten files and missed the loudest copy, in `LEDGER.md`, while the
  gate built to prevent exactly that reported clean.
- Placed a collection after `scan()`'s `if quiet: continue`, so `--check` saw an empty
  corpus and called every allowlist entry stale — a gate failing for the wrong reason.
- Nearly moved a gate to `full` on a 40.1s wall-clock reading; `--time` said the fast tier
  was 30.9s. The difference was process startup and machine noise.
