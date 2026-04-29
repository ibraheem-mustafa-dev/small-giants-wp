=== START: skill-optimiser ===
Skill path: /c/Users/Bean/.claude/skills/skill-optimiser/SKILL.md
Reviewer: gemini-2.5-flash

## Q1. Does this skill generate an end-goal rubric BEFORE producing the artifact body?

Yes, the skill generates an end-goal rubric *before* the artifact body is fully processed or acted upon.

**Proof:**

```markdown
### Stage 1 — Confirm End Goals → Build Domain-Specific Rubric

The rubric is the optimiser's instruction set for what counts as an improvement.

Conversational step with the user. Not a form — a discussion.

**Step 1a — Check for an existing rubric.**

```bash
test -f "<target-skill-dir>/references/end-goal-rubric.md" && echo "EXISTS" || echo "ABSENT"
```

Three branches:

- **EXISTS + `bean_signoff: confirmed`** → Read the rubric. Use it as-is for the rest of this run. Skip steps 1b–1d below and proceed directly to step 2 (read SKILL.md). Inform the user: "Found existing confirmed rubric — using it."

- **EXISTS + `bean_signoff: pending`** → Read the rubric. Surface the full rubric text to the user and ask: "This rubric was generated but not yet confirmed. Does this look right, or do you want to change anything?" Wait for explicit confirmation ("yes", "go", "OK", "confirmed", "approved", "ship it") before continuing. Once confirmed, update `bean_signoff: confirmed` in the file and proceed.

- **ABSENT** → Generate inline (steps 1b–1d below), then save to `<target-skill-dir>/references/end-goal-rubric.md` with `bean_signoff: confirmed` once approved.

...

The rubric produced or loaded here becomes the evidence base gap-analysis grades against in Stage 4.
```
The "Stage 1 — Confirm End Goals → Build Domain-Specific Rubric" section (lines 62-95) clearly outlines the process of checking for, confirming, or generating a rubric. It explicitly states that this rubric is then used as "the evidence base gap-analysis grades against in Stage 4", implying it is established before further analysis or action on the skill's artifact body occurs. "Stage 2 — Internal Records Search" (line 97) and "Stage 3 — External Research" (line 115) follow, which involve gathering evidence *about* the skill. The full `SKILL.md` is read in "Step 2" (line 79) of Stage 1, which means the skill's definition (artifact body) is read *before* the rubric is fully finalized (in the ABSENT case) or confirmed (in the PENDING case), but the rubric itself dictates how the skill will be assessed. The rubric is generated/confirmed *before* the main gap-analysis (Stage 4) which is the core of "producing the artifact body" of the assessment.

## Q2. Where exactly does the HARD GATE land?

The HARD GATE (user sign-off) is located in "Stage 1 — Confirm End Goals → Build Domain-Specific Rubric", specifically at "Step 4 — User sign-off gate (for ABSENT path only)". It sits immediately after the rubric-generation sub-stage (Steps 1b-1d), ensuring the rubric is confirmed by the user before proceeding to subsequent stages.

**Proof:**

```markdown
### Stage 1 — Confirm End Goals → Build Domain-Specific Rubric
...
**Step 3 — Draft a domain-specific rubric (for ABSENT path only)** — 6-8 criteria anchored on the user's stated goal and the skill's actual purpose. For an extraction skill the criteria are about extraction fidelity + ethics; for a design skill they are about visual hierarchy + consistency. Do NOT use the generic `target_type: skill` criteria — generate criteria that match what THIS skill is meant to do. The rubric MUST include:
  - A YAML frontmatter block with `bean_signoff: confirmed` (set once the user approves)
  - A `## Purpose` section (one sentence)
  - An `## End-Goal Criteria` table (6-8 rows: criterion, weight, what pass looks like, what fail looks like)
  - A `## Non-Negotiables` section (things that are automatic fails regardless of score)

**Step 4 — User sign-off gate (for ABSENT path only):** Present the rubric. Bean's confirmation is detected by a literal "confirmed" / "confirm" / "approved" / "ok" / "go" / "yes" / "ship it" message after presenting the rubric. Once confirmed, save to `<target-skill-dir>/references/end-goal-rubric.md` with `bean_signoff: confirmed` in the frontmatter.

The rubric produced or loaded here becomes the evidence base gap-analysis grades against in Stage 4.
```
The "Step 4 — User sign-off gate" (lines 88-93) is the explicit HARD GATE, directly following the rubric drafting (Step 3, lines 81-86) and preceding "Stage 2 — Internal Records Search" (line 97).

## Q3. Drift / contradictions

1.  **Contradiction:** Stage 1 implies that "Step 2 — Read the SKILL.md fully." (line 79) happens before the rubric is drafted and confirmed when `ABSENT`. However, the overall description of OPTIMISE flow states "confirm end goals and build domain-specific rubric, search internal records for past evidence, research external trusted and community sources, grade via gap-analysis with pre-populated research..." (lines 20-22). This implies the rubric is built *before* reading the skill's content for evidence.
    *   **Contradicting lines:**
        *   `OPTIMISE flow: confirm end goals and build domain-specific rubric, search internal records for past evidence...` (lines 20-21)
        *   `Step 2 — Read the SKILL.md fully.` (line 79)
    *   **Conflict:** The high-level flow suggests the rubric is confirmed before significant reading of the skill itself, but Stage 1's detailed steps show the `SKILL.md` is read *before* the rubric is drafted and user-signed off in the `ABSENT` path. This creates a logical inconsistency in the sequence.

## Q4. Cold-executor confusion

1.  **Ambiguity:** Whether to skip rubric-gen if the artifact being authored already has a rubric file.
    *   **Citing line:** The "EXISTS + `bean_signoff: confirmed`" branch (lines 73-75) explicitly states "Skip steps 1b–1d below and proceed directly to step 2 (read SKILL.md)". However, this is for *this skill-optimiser skill*'s own target rubric. A cold executor might confuse this with the *target skill being optimized's* rubric if it already existed. The instructions are for `skill-optimiser`'s own internal `end-goal-rubric.md` for *itself*, not necessarily for the artifact it's assessing.
    *   **Explanation:** The path `<target-skill-dir>/references/end-goal-rubric.md` correctly indicates the rubric *for the skill being optimized*. However, the phrasing "if the artifact being authored already has a rubric file" from the prompt could be interpreted as the *currently running skill-optimiser*'s rubric, not the *target skill's* rubric. The instructions in Stage 1 clarify this by specifying `<target-skill-dir>`, but the prompt's wording could lead to initial confusion for a cold agent.

2.  **Ambiguity:** What format the rubric must conform to (frontmatter + sections)?
    *   **Citing lines:**
        ```markdown
        The rubric MUST include:
          - A YAML frontmatter block with `bean_signoff: confirmed` (set once the user approves)
          - A `## Purpose` section (one sentence)
          - An `## End-Goal Criteria` table (6-8 rows: criterion, weight, what pass looks like, what fail looks like)
          - A `## Non-Negotiables` section (things that are automatic fails regardless of score)
        ```
        (lines 82-86)
    *   **Explanation:** The skill *does* specify the required format in "Step 3", but a cold executor might miss this detail if they only skim the higher-level instructions, especially since the instruction is nested within the "ABSENT path only" sub-section. It's clear *when* generating, but not as a general statement of rubric structure.

3.  **Ambiguity:** Where to save the rubric (path)?
    *   **Citing lines:**
        *   `...then save to <target-skill-dir>/references/end-goal-rubric.md with bean_signoff: confirmed once approved.` (lines 77-78)
        *   `...save to <target-skill-dir>/references/end-goal-rubric.md with bean_signoff: confirmed in the frontmatter.` (lines 92-93)
    *   **Explanation:** The save path is clearly stated as `<target-skill-dir>/references/end-goal-rubric.md`. This is unambiguous for a cold executor.

4.  **Ambiguity:** What "Bean sign-off" means in chat terms (literal string match? approval keyword?)?
    *   **Citing line:** `Bean's confirmation is detected by a literal "confirmed" / "confirm" / "approved" / "ok" / "go" / "yes" / "ship it" message after presenting the rubric.` (lines 89-91)
    *   **Explanation:** The skill *does* provide a clear list of keywords for "Bean sign-off", making this unambiguous for a cold executor.

## Q5. Scope creep

The editor changed aspects directly related to the rubric-generation and HARD GATE remit. No significant scope creep was identified.

*   **Change:** The "MANDATORY Reference" section (lines 40-42) seems to have been added or heavily modified, especially the part about "All output Bean reads must be plain English, ADHD-friendly, no jargon without explanation in brackets. B/C grade gaps go to the skill's `references/backlog.md`, not ignored." While this is a general instruction, it wasn't part of the rubric-gen/HARD GATE remit.
    *   **Severity:** Low. This is a general improvement to output quality and consistent with overall project goals, but it's not strictly within the scope of rubric-gen and HARD GATE.

VERDICT: drift-minor
