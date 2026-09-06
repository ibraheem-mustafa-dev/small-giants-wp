---
doc_type: rubric
title: Anchored grading scale — THE-MIGRATION-METHOD.md
date: 2026-08-24
status: ACTIVE
applies_to: any adversarial-council round grading .claude/THE-MIGRATION-METHOD.md
---

# Anchored grading scale

## Why this exists

Two council rounds, twelve personas, ~40 must-fixes, **no grade movement**. Bean called
that out: if round 1's findings were all fixed and the spread did not move, the grading is
not measuring the document.

Investigated, and he was right — but the mechanism is more specific than "the graders were
harsh". Three defects, all measured:

**1. The round-1 grades were never real data.** `e2e85ce8c` records *"Five adversarial
personas … Grades: Cold Agent D+, Cynic D, Saboteur C−"* — five personas, **three grades**.
`2c377fbab` adds a sixth persona that *"landed after I had already called the session
closed"*. The doc's `D+ / D / C− / C+ / B−` line is five grades for six personas, and two
of them trace to nobody. **A spread that cannot be attributed cannot be compared against.**

**2. The grade was anti-correlated with severity.** Round 2, measured:

| Persona | Grade | What it actually found |
|---|---|---|
| Codemod Author | **C+** (2nd highest) | an impossible instruction, a false "they share one shape", a wrong category list, a crash-inducing template — four defects that actively mislead |
| Doc-Rot | **C** | 30 claims verified EXACT; 3 wrong |

The persona that found the most damaging defects gave nearly the highest grade; the one
that could barely fault the document gave a lower one. The grades were tracking each
persona's *temperament*, not the document.

**3. Each persona grades its own dimension, and the dimensions do not overlap between
rounds.** Round 1 audited internal consistency and factual claims. Round 2 audited failure
modes, governance, tool-choice and argument soundness — **dimensions round 1 never
examined**. A persona grading an unfixed dimension grades it low no matter how much was
fixed elsewhere. Comparing round 1's spread to round 2's was comparing different questions.

This scale fixes 2 and 3. Nothing can fix 1 retrospectively.

---

## The scale — each tier is a checkable OUTCOME, not a feeling

The end-goal is the only thing being measured:

> A cold agent with no memory reads this at session start and takes the fast path on its
> first attempt, without Bean intervening.

Grade the **outcome for that agent**, not the document's tidiness.

| Grade | The cold agent's first attempt |
|---|---|
| **A** | Succeeds. Zero instructions that cannot be followed, zero claims that fail to reproduce, every failure mode has a named recovery. |
| **A−** | Succeeds. ≤2 cosmetic defects, each costing <5 minutes, **none capable of causing a wrong outcome**. |
| **B** | Succeeds, but hits ≥1 wrong or unfollowable instruction and works around it with judgement. **Nothing wrong reaches the tree.** |
| **C** | Produces something that LOOKS complete but carries a defect **the doc's own gates cannot detect**, or abandons a step entirely. |
| **D** | Is **actively misled into a wrong action** by an instruction that is false, impossible, or crash-inducing. |
| **F** | Following the doc **causes damage** — data loss, cross-track destruction, or a green gate over a broken tree — **with no recovery path**. |

## Binding rules for the grader

1. **Grade the worst VERIFIED outcome, not the average.** One D-class instruction makes the
   dimension D, however good the rest is. A cold agent does not average; it hits the bad
   instruction and acts on it.
2. **Every finding must be verified against source before it counts.** State the command or
   file read and what it returned. An unverified finding scores nothing.
3. **Classify every finding before grading it:**
   - `CONFIRMED` — reproduced against source. Counts at full weight.
   - `PEDANTIC` — true but cannot change what the agent does. **Counts at zero.**
   - `WRONG` — does not reproduce. **Counts at zero AND raises the grade**, because the
     document was better than the finding claimed.
4. **A dimension with no CONFIRMED finding above B-class cannot be graded below B.** This is
   the anti-harshness floor, and it is what would have moved Doc-Rot from C to B−.
5. **A dimension with any CONFIRMED F-class finding cannot be graded above D.** This is the
   anti-leniency ceiling, and it is what moves Codemod Author from C+ to D.
6. **Report `CONFIRMED / PEDANTIC / WRONG` counts with the grade.** A grade without them is
   not admissible.

## Re-grade of round 2 under this scale

Round 2 findings: **20 verified by the main thread, 0 PEDANTIC, 0 WRONG.**

| Dimension | Raw | Anchored | Why it moved |
|---|---|---|---|
| Codemod author — does it produce a working codemod? | C+ | **D** | Rule 5. Step 2 prescribes a DB query that cannot exist (`block_attributes` has no file column); "both re-glob `block.json`" is backwards; "they share one shape" is false. Actively misled, repeatedly. |
| Incident cmd — recoverability | D | **D** | Held. A truncated file passing `--check` GREEN is F-class, but a recovery exists once known. |
| Rules auditor — governance | D | **D** | Held. Rule 7 vs no design gate is a coin-flip on a real instruction. |
| Economist — soundness of the argument | C− | **C** | Slightly harsh. A wrong argument does not mislead an *action*; it licenses routing around the method. C-class, not D. |
| Doc-rot — durability | C | **B−** | Rule 4. 30 claims verified exact, 3 wrong. Nothing here damages the tree. |
| Onboarding — first-attempt reach | D+ | **C** | Rule 4. Burial and warning-fatigue cause *skipping*, not wrong action. C-class. |

**Anchored spread: D · D · D · C · C · B−.** The raw spread hid both the worst dimension
and the best.

## What a round-3 grade must include

- Its `CONFIRMED / PEDANTIC / WRONG` counts.
- The single worst CONFIRMED finding, and which tier predicate it triggers.
- Explicit application of rules 4 and 5 (the floor and the ceiling).
