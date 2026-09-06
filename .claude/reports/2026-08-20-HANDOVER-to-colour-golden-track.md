---
doc_type: handover
project: small-giants-wp
created: 2026-08-20
from: shop-archive / R-3 enforcement-script track
to: colour-golden track (the parallel session)
subject: Scanner + gate changes that land under your feet — read before your next scan run
---

# Handover: what I changed in the scanners, and what it does to your colour-golden numbers

**Commit `03fd4247` on `main` (pushed).** I am DONE editing scripts, scanners and gates — nothing of
mine is still in flight. Everything below is already on `main`.

**Why you're getting this:** your track's priority-1 item is *"switch rule 31 to the wider resolver
(`resolveComponentFiles()`)"*. **I have already adopted that resolver in five other gates.** Your
rule-31 work now lands in a changed world, and at least one of your baselines will move.

---

## 1. ⭐ THE ONE THAT CHANGES YOUR NUMBERS — the wider resolver is now adopted

`inspector-scan/core/components.js` → `resolveComponentFiles()` was already in-tree with only 4 call
sites. **Five more gates now use it:**

| Script | Was | Now |
|---|---|---|
| `check-editor-render-parity.js` | `edit.js`-only corpus (`:74-76`) | resolver |
| `check-dead-controls.js` | `edit.js` corpus + hardcoded `ContainerWrapperControls.js` literal | resolver |
| `check-duplicate-controls.js` | block-own `components/` only | resolver |
| `check-inert-controls.py` | hardcoded literal | resolver, via subprocess |
| `check-undeclared-attrs.py` | `edit.js`-only | resolver, via subprocess |

**NEW, and you will want it:** `components.js` gained a `--dump-json` entry point so **Python** gates
reuse the SAME resolver instead of reimplementing it. If any colour scanner of yours is Python and
hand-rolls "find this block's controls", use this rather than writing a second mechanism:

```
node plugins/sgs-blocks/scripts/inspector-scan/core/components.js --dump-json
```

**Measured effect (enumerated, not estimated):** `contentWidth` — the canonical probe, invisible to
every narrow corpus — went from **1 → 56** controlled attrs in `check-dead-controls.js` and **3 → 59**
in `check-inert-controls.py`. Expect a comparable jump when rule 31 adopts it. Your LEDGER already
says the 409-finding count is *"a floor, not a ceiling"* — that is correct, and this blindness is
exactly the floor.

⚠ **Still do the predicted-vs-measured pass your LEDGER insists on.** Your own note calls this a
load-bearing advisory-gate count change, not a bolt-on. Nothing I did removes that requirement.

## 2. NEW advisory rule 34 — it overlaps your territory

`inspector-scan/rules/34-declared-attr-unrendered.js` (auto-discovered; `rules.json` entry, advisory,
`openBacklog: 415`). It asserts the previously-uncovered edge: **a declared `block.json` attribute is
consumed by `render.php`, a helper, the shared wrapper, or `save.js`.**

- **415 findings across 46 of 83 blocks** — 118 `warn` (provably unconsumed), 290 `informational`
  (the render corpus contains a computed-key read it cannot statically resolve, mostly blocks routing
  through `SGS_Container_Wrapper`'s `$attributes[ $sgs_attr ]` loop).
- `contentWidth` correctly NOT flagged, proven by assertion rather than eyeballing.
- **Relevant to you:** many of those 415 are colour attributes. Before your defect-level matching
  work (your priority 3), read rule 34's output — some of what you would call a colour defect may
  already be described there, and some of your 409 may be the same underlying bug.
- ⚠ Its backlog was corrected 408 → 415 the same day with a stated reason: 408 was measured while
  three agents were editing concurrently. **If you see it move again, suspect a concurrent tree
  before you suspect a regression.**

## 3. Baseline convention — applies to YOUR baselines too

The "never raise a baseline silently — any increase must include a written reason" convention
(previously only in `check-element-manifest-conformance.js:796-798`) is now on six baselines:
`dead-controls`, `editor-render-parity`, `box-flat`, `shared-css-state-rules`, `oldshape-audit`,
`lint-theme-css-hardcodes`.

Five took a `_comment` JSON key. **`lint-theme-css-hardcodes` could NOT** — its loader iterates every
baseline key, so a `_comment` key would have broken the gate; it took a loader code-comment instead.
**If you add a convention note to a baseline, read how its loader parses the file first.**

`dead-controls-baseline.json` is currently **empty (zero-tolerance)** and green.

## 4. Two mechanism corrections to carry

**(a) `editor-render-parity-baseline.json`'s 783 findings are INERT.** The gate reading them has
`CHECK_A_BLOCKS_BUILD` / `CHECK_B_BLOCKS_BUILD` both hardcoded `false` (`:3489-3490`). I did NOT flip
them — that is R3-c's job and must wait until the resolver widening above is triaged. **Do not treat
that baseline as evidence of anything until those flags are flipped.**

**(b) Your D338 correction (`e81ea92a`) corrected ME, mid-write.** I had written "WordPress silently
discards undeclared attributes" into a live report. Your finding — undeclared attrs reach
`render.php` verbatim, it is the EDITOR that drops them — is now folded into
`.claude/reports/2026-08-20-r3b-blocked-real-defects.md`. It changed the wording of a shipped report;
thank you.

**(c) Your `shadowColour` fix (`70c88348`) landed between my measurement and my commit.** I had
baselined 4 `shadowColour` dead-control findings with written reasons; your commit fixed them
(a crash on 5 mounts, plus dead everywhere else). I removed all 4 stale entries — the baseline is
empty again. Nothing for you to do; recorded so the history reads straight.

## 5. Things I deliberately did NOT do

| Item | Status | Why |
|---|---|---|
| **Rule 31 → wider resolver** | **NOT DONE — still yours** | Your call, needs its own predicted-vs-measured pass |
| Gradient mechanism-awareness (your priority 2) | NOT DONE | Yours |
| Wiring `check-inert-controls` / `check-undeclared-attrs` into `prebuild` (R3-b) | **BLOCKED ON PURPOSE** | Both exit 1 under `--check`, and their 4 findings are REAL defects. Baselining real bugs to force a green build is how a gate becomes decoration. See `.claude/reports/2026-08-20-r3b-blocked-real-defects.md` |
| Flipping the parity gate's blocking flags (R3-c) | NOT DONE | Must follow the widening triage |
| `check-unresolvable-token-refs.py` wiring | NOT DONE | Its `main()` ends `return 0` at line **355** — it literally cannot fail. It also finds 0 today. Fix the exit path before anyone bothers wiring it |

## 6. Two never-run detectors worth your time

Full first-run evidence: `.claude/reports/2026-08-20-r3g-unwired-detectors-first-run.md`.

- **`surveys/survey-control-gaps.py`** — 17 findings, and **already shared-component-aware** (explicit
  globs `:178-184`). It is the NON-blind half of the same edge the blind gates cover, and it has been
  sitting unwired while the blind one ran on every build.
- **`surveys/survey-wrapper-capability.js`** — reports **2 UNRESOLVED computed-key reads in the wrapper
  PHP** (`class-sgs-container-wrapper.php:2416,2418`). **Directly relevant to you:** those two reads
  are why rule 34 must mark 290 findings "informational" instead of resolving them, and they are the
  same blind spot any colour scanner hits on wrapper-routed attributes.

## 7. Method notes that cost me real time today

- **A script's exit code can differ with and without `--check`.** Two agents reported "exit 0 → 0"
  having measured without the flag; under `--check` both were 1, and one redded the build. Always
  measure with the flag the gate is actually wired with.
- **Do NOT regenerate `attr-role-map.json` on a shared worktree.** I ran `generate-attr-role-map.py`
  and it net-DELETED 37 rows (2946 → 2909), including `sgs/hero::gridItemBackground` and a dozen
  `templateMode` rows, because it regenerates from whatever tree you are sitting in. Reverted. If you
  must regenerate, diff the row count first.
- **A count taken on a shared worktree has a timestamp, not a value.** `gridItemShadowColour` appeared
  and vanished under me inside one session while you were working on it. Two of my gate readings
  flipped for reasons that had nothing to do with my changes.
