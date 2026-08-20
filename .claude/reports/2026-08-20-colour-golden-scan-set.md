# The colour golden — the COMPLETE scan set (the POC)

```
doc_type: report
created:  2026-08-20
status:   Bean-confirmed complete
purpose:  what a finished control-type audit scans for, in totality, and the exact
          commands that produce it. Colour is the only type where all of this runs.
```

⛔ **Every figure below was produced by the command beside it on 2026-08-20 at `8fcbd32e`.**
Do not quote a number from this file without re-running its command — and do not
re-derive any of them by matching a detector's message prose. That is how two fabricated
tables got written and deleted on 2026-08-20; the rule's own `key` field is the taxonomy.

---

## Why it takes four layers

No single tool holds the picture, and that is the finding, not an accident:

- **rule 31** answers *is each control ROW the right shape?* — it has no concept of MISSING.
- **the census** answers *SHOULD this block have the control, and where does the fix live?* —
  it has no concept of a row's states or gradient path.

The categorisation people remember is the union of the two. Neither alone is it.

---

## Layer 1 — ROW shape · `rule 31`

```bash
node scripts/inspector-scan/run.js --json
```

⛔ **Read the kind from the `key` field, split on `|`, index 3.** The findings carry no
`kind` property (measured: `kind` is `None` on all 409). ⛔ **Count `status == "FLAGGED"`
only** — `core/report.js` serialises BASELINED findings into the same array.

| finding kind | count | what it catches |
|---|---|---|
| `row-below-minimum-states` | 191 | a colour row offering fewer states than its element declares (floor 2) |
| `row-missing-gradient` | 193 | a row with no gradient path and no declared exemption |
| `native-colour-ui` | 25 | `block.json supports.color` with a live UI sub-flag |
| `banned-lookalike` | 0 | regression guard — proven able to fail |
| `roster-surface-unknown` | 0 | null-surfaces guard |
| **total** | **409** | |

⚠ `__experimentalSkipSerialization` is NOT a UI flag — it is REQUIRED by the conformant
shape. Counting it reports 50 against a true 25. Two sessions made this mistake independently.

---

## Layer 2 — BLOCK scope · the census

```bash
node scripts/surveys/survey-golden-conformance.js --json
```

| axis | result |
|---|---|
| canonical | 63 CONFORMANT · 1 VIOLATION · 13 MISSING · 6 NOT-APPLICABLE |
| nativeUi | 58 CONFORMANT · 25 VIOLATION (23 double-painted · 2 core-only) |
| bannedLookalikes | 83 CONFORMANT ⚠ **see the hops hole below — not trustworthy** |
| hoverMechanism | 8 CONFORMANT · 9 UNCLEAR · 66 N/A |
| gradient | 25 CONFORMANT · 58 VIOLATION |

**The MISSING / NOT-APPLICABLE split is the point of this layer**, and it exists because
scope is decided by `qualifiesFor()` on independent evidence — never by roster.json's
`surfaces.colour`, which is computed from what a block ALREADY has and is therefore
self-fulfilling (it can only ever find non-conformance, never absence).

Each verdict carries the evidence that decided it, plus `home`:

- **VIOLATION (1)** — `sgs/buybox`: paints 27 own declarations, no client control.
- **MISSING (13)** — 12 `sgs/form-field-*` + `form-review`, all `home=ancestor`
  ("painted by `sgs/form`"), so it is **ONE fix on the parent**, not 12 block edits;
  plus `sgs/site-footer` (`home=self`, core paints it via live sub-flags).
- **NOT-APPLICABLE (6)** — 5 "paints nothing, and nothing paints its rendered classes";
  `sgs/responsive-logo` via feature parity ("replaces core/site-logo, which does NOT
  enable core `color` UI").

Also emitted: **shared-file attribution** — "fix once there, not once per block".

---

## Layer 3 — colour-specific censuses

```bash
python scripts/surveys/survey-colour-coverage.py     # 33 state-uncontrolled + 87 base = 120, across 34 blocks
python scripts/surveys/survey-colour-controls.py     # divergence per CSS property
```

⚠ `survey-colour-controls` says so itself: *"component attribution is a static heuristic
(nearest-preceding-JSX-tag scan), not an AST parse — spot-check file:line before treating
a DIVERGENCE or BANNED-lookalike finding as ground truth."*

⚠ **Overlap with Layer 1 is UNQUANTIFIED.** colour-coverage reports 120; rule 31 reports
409. Nobody has established whether these describe the same defects. Reconciling them is
owed work, not a detail.

---

## Layer 4 — cross-cutting detectors that catch colour defects

```bash
python scripts/check-undeclared-attrs.py    # 3 — WP silently discards the write
python scripts/check-inert-controls.py      # 1 — control visible, render.php overwrites it
python scripts/surveys/survey-control-gaps.py .   # 17 — a control weaker than its value
```

Each answers a question no other tool asks:

- `check-undeclared-attrs` — the `sgs/quote` class: control writes it, render reads it,
  `block.json` never declares it, WordPress throws the write away. Green build, no error.
- `check-inert-controls` — the attribute has a control AND a renderer, but render.php
  overwrites it with a hardcoded value first.
- `survey-control-gaps` — rule 21 finds an attr with no control; `check-dead-controls`
  finds a control with no attr; **this finds one that exists, renders, saves and cannot
  hold its value.** ⚠ candidates only, high false-positive rate — hand-read every one.

From `inspector-scan` (same run as Layer 1): rule 29 duplicate visible labels **8** ·
rule 21 render-without-control **197** · rule 04 colour-alpha **0** (gate).

---

## ⛔ The one open hole — resolution depth

`bannedLookalikes` reads **83 CONFORMANT**, and that is clean only because the scan
follows ONE hop. Measured, 1 hop vs full depth:

| component | 1 hop | full depth |
|---|---|---|
| `ColorPalette` | 3 | 64 |
| `DesignTokenPicker` | 18 | 64 |
| `SgsGradientPicker` | 4 | 64 |
| `ShadowControl` | 15 | 30 |

⛔ **Depth and the banned-lookalike exclusion must move TOGETHER.** `ColorPalette` is
banned and appears in 64 blocks at full depth — but ~61 reach it legitimately THROUGH
`DesignTokenPicker`. Raising depth alone trades under-reporting for ~61 false positives.

Reproduce before touching either: `python scripts/surveys/compare-reach-depth.py .`

⚠ Related: a tag scan cannot see a RUNTIME-selected component. `SgsColourPanel` picks its
row via `const Control = row.gradientCapable ? A : B`, so neither name appears as a literal
JSX tag — `GradientCapableColourControl` reads as dead code while being live in 6 blocks.

**This is the last thing standing between colour and "finished".**

---

## What generalising to the other 20 types actually requires

The row-level engine in `scripts/inspector-scan/core/golden.js` is **already generic and
already exported** — `requiredStatesFor( elements, attrName )`, `statesArrayHasGradient(
statesArray )`, `collectIndirectRowSources()`. None of them mentions colour. Rule 31 is
their only consumer, and its colour-binding is the schema path it reads (`controls.colour`),
the component names it looks for (which already live in every type's own `canonical` row),
and its message strings.

So it is **parameterise one rule**, not build 20 detectors.

⛔ **Blocked on a correctness fix first:** 16 of 21 types declare no
`qualifiesWhen.paintsOwnSurface.cssProperties`, so they fall through to a fallback the
survey documents as *"REPRODUCES COLOUR'S REGEX BYTE-FOR-BYTE"*. Until each type declares
its own properties, every non-colour scope verdict is decided by colour evidence.

Bean's axis table, for the record:

| axis | works for |
|---|---|
| canonical | colour only |
| qualifiesWhen | 1 of 14 (declared by 21, real for 4) |
| native-UI detection | 4 of 14 |
| states | 1 of 14 |

---

# ADDENDUM — from the programme doc (`.claude/plans/2026-08-18-inspector-enforcement-programme.md`)

Read in full 2026-08-20. Four things it carries that the scan set above did not.

## ⛔ 1. `row-missing-gradient` is BINARY and that is INSUFFICIENT — the 193 is soft

The programme doc (§Phase 5, point 3) is explicit and it changes how to read Layer 1:

> There are THREE gradient mechanisms and which is correct depends on what the row paints:
> a per-state toggle inside `DesignTokenPicker` (background / border / icon);
> `GradientCapableColourControl` (**TEXT only** — needs `background-clip:text`);
> `GradientOverlayControl` (whole-block overlay, single-state by construction).
> ⛔ A binary "does a gradient path exist?" check is INSUFFICIENT: **a text row wired to
> the background mechanism would PASS while rendering nothing.** Rule 31's current
> `row-missing-gradient` kind is binary and needs this refinement.

So **193 is a floor with an unknown false-PASS rate**: it counts rows with no gradient path
at all, and cannot see a row that has the WRONG mechanism for its painted property. Closing
colour properly means making that axis mechanism-aware, not just counting absences.

## 2. Two roster detectors were never built

| ID | Rule | Catches | State |
|---|---|---|---|
| D4 | `check-element-panels` | one element, one panel | ⬜ **not built** |
| D5 | `capture-inspector-surface` | live editor oracle | ⬜ **not built, never a gate** |

⭐ **D5 is the answer to a question nothing else asks.** Per the doc: *"D1–D4 all ask does
the right JSX exist, never CAN A CLIENT REACH IT. Hero's split-media dead end is the proof:
the picker exists, correctly typed, and stays unreachable."* **D5 must WALK STATES, not
snapshot one.** Every static layer in this report shares that blind spot.

(D2 `check-panel-expectations` was deliberately SUPERSEDED by rule 31, not skipped: a binary
"does a panel exist?" conflates three unrelated defects, proven on its own 5-block candidate
list — `buybox`/`site-footer`/`site-header` have core's native UI as their only colour
control, while `container`/`hero` have neither. One finding would have pointed at the wrong
fix for three of five.)

## 3. Governance constraints that bind any new detector

- **Three tiers.** T1 fingerprint (gates) · T2 schema (gates once baselined) · **T3 shape
  heuristic — ⛔ ADVISORY FOREVER.** A heuristic promoted to a gate taxes legitimate work;
  that is how nine advisory rules accumulated 383 findings nobody reads.
- **Per-detector completion:** self-test with a negative control that genuinely fails ·
  `--survey` over all 83 blocks with **no `head -N`** · expected count declared BEFORE the
  first live run, then reconciled · registered in `rules.json` in the SAME commit as the
  rule file · ships advisory, never promoted on its introducing run.
- **`sgs/button`'s hover exemption must be DECLARED IN DATA** with a reason — never a
  hardcoded block name in a script (R-31-1 bans hardcoded dicts).
- ⛔ **`retireWhen` is a STALE completion condition** — the doc self-checks that no such
  mechanism exists anywhere in `scripts/` and no rule has ever had one. Either build it or
  drop the condition; do not keep asserting a condition nothing enforces.

## 4. Sequencing, and what is still open

⛔ **Phase 5 (the closing audit) runs AFTER C1 and AFTER C2's conversion pass** — before
that it would flag the entire backlog as violations on day one. C1 (the shared
`sgs_emit_state_colour_css` helper) is DONE, live-verified on 8 blocks. C2's conversion pass
is not.

Open, from §8:
- **`sgs/site-header` shows 5 default-visible rows against FR-37-27's cap of 3.** Which
  three move behind disclosure is a client-facing UX call, still Bean's. D679's separate
  audit of the same block did NOT resolve it.
- **WP 7.1 landed 19 Aug 2026.** T1 fingerprints pin to core internals (`BoxControl`'s
  unconditional label, `.components-tools-panel-header > h2`). Needs a `wpVersionVerified`
  field and a re-check.
- **The cloning converter still writes `gridItem*`** (`converter/resolvers/grid.py:187`,
  `services/arrangement.py:154`), so a cloned hero still receives attrs WordPress silently
  discards until the DB-derived GRID destination is reseeded via `/sgs-update`.

## The programme's own completion condition

> **Bean stops finding these by photographing his own screen.**

⛔ **Never close a step on a green exit code** — on this repo an aborted deploy and a
dropped stash both reported success.
