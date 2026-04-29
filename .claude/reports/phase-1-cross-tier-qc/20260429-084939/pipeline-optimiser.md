=== START: pipeline-optimiser ===
Skill path: /c/Users/Bean/.claude/skills/pipeline-optimiser/SKILL.md
Reviewer: gemini-2.5-flash

## Q1. Does this skill generate an end-goal rubric BEFORE producing the artifact body?

Yes, the skill explicitly generates and confirms the end-goal rubric in "Stage 1 — Confirm End Goals → Build Domain-Specific Rubric" before proceeding to any other optimization stages.

**Quote:**
```markdown
### Stage 1 — Confirm End Goals → Build Domain-Specific Rubric

> The rubric is the optimiser's instruction set for what counts as an improvement.

**Step 1 — Read the pipeline SKILL.md fully.** If it wraps scripts (any `scripts/` or external `.py`/`.js` references), READ THE SCRIPTS TOO — lesson 151 HARD GATE: any disagreement between docs and scripts is an instant fail.

**Step 2 — Rubric resolution (three paths):**

Check for `<target-pipeline-dir>/references/end-goal-rubric.md`:

- **File exists + `bean_signoff: confirmed`** → load it as the active rubric, proceed to Step 3. Do not regenerate.
- **File exists + `bean_signoff: pending`** → surface the rubric to Bean and ask for re-confirmation before continuing. Accept any of: `confirmed` / `confirm` / `approved` / `ok` / `go` / `yes` / `ship it`. On confirmation, update the file's `bean_signoff` field to `confirmed` and proceed.
- **File absent** → generate a domain-specific rubric inline (see Step 2a), then pause for Bean confirmation. On confirmation, save to `<target-pipeline-dir>/references/end-goal-rubric.md` with `bean_signoff: confirmed` and proceed.
```
This section clearly shows that the rubric is either loaded or generated and then confirmed *before* moving to subsequent stages like "Stage 2 — Internal Records Search" and "Stage 3 — External Research," which would contribute to the "artifact body" of the optimization.

---

## Q2. Where exactly does the HARD GATE land?

The HARD GATE for Bean sign-off on the rubric is located within "Stage 1 — Confirm End Goals → Build Domain-Specific Rubric" and immediately follows the rubric generation or loading process. There is also a separate HARD GATE for cross-tier QC peer review in Stage 7, which is a regression guard.

**Quote for Rubric Sign-off HARD GATE:**
```markdown
### Stage 1 — Confirm End Goals → Build Domain-Specific Rubric
...
**Step 2 — Rubric resolution (three paths):**
...
- **File exists + `bean_signoff: pending`** → surface the rubric to Bean and ask for re-confirmation before continuing. Accept any of: `confirmed` / `confirm` / `approved` / `ok` / `go` / `yes` / `ship it`. On confirmation, update the file's `bean_signoff` field to `confirmed` and proceed.
- **File absent** → generate a domain-specific rubric inline (see Step 2a), then pause for Bean confirmation. On confirmation, save to `<target-pipeline-dir>/references/end-goal-rubric.md` with `bean_signoff: confirmed` and proceed.
...
```
This explicitly states that if a rubric exists with `bean_signoff: pending` or if it's newly generated, the process pauses for Bean's confirmation before proceeding. This acts as a hard gate.

**Quote for Cross-tier QC peer review HARD GATE:**
```markdown
### Stage 7 — Verify with Regression Guard
...
5. **HARD GATE — Cross-tier QC peer review with full protocol dispatch.** Before logging the post-fix grade as final, dispatch `/qc` as a parallel Sonnet subagent (cross-tier — same-model QC inherits the same blind spots). Source: blub.db correction id 163 (`qc-peer-review-after-self-optimisation`). Phantom gates and self-violating stages pass self-grade every time — QC catches them.
...
```
This HARD GATE is for the final verification step, ensuring that the fixes are peer-reviewed. It sits after all fixes are executed and regression checks are done.

The prompt asked to "Confirm it sits immediately after the rubric-generation sub-stage, not buried elsewhere." The rubric sign-off gate is indeed immediately after generation/load. The Stage 7 HARD GATE is for a different purpose (post-fix verification).

---

## Q3. Drift / contradictions

1.  **Contradiction in Frontmatter vs. Stage 1 Goal:**
    *   **Frontmatter description:** "confirm end goals and build domain-specific rubric, search internal records for past runs and corrections, research external trusted and community sources, grade via gap-analysis with pre-populated research, user picks fixes and opportunities, execute token-efficiently, verify with regression guard."
    *   **Stage 1 title:** "Confirm End Goals → Build Domain-Specific Rubric"
    *   **Conflict:** The frontmatter description implies "confirm end goals" and "build domain-specific rubric" are two distinct, sequential steps within the first part of the flow. However, the Stage 1 title bundles them together, and the internal steps (Step 2 and Step 3) also treat them as interwoven, with Step 3 being a conversational confirmation *after* the rubric is resolved (loaded/generated). This isn't a severe contradiction, but a slight semantic drift in how the "confirm end goals" part is presented.

2.  **Correction-Ledger Consults:**
    *   **Mandatory Reference:** "Before assessing ANY pipeline, load `shared-references/communication-standards.md`."
    *   **Stage 0:** "Read Correction Ledger (MANDATORY)"
    *   **Conflict:** The "Mandatory Reference" section mentions `shared-references/communication-standards.md` as the mandatory load, but Stage 0 (MANDATORY) focuses solely on `references/correction-ledger.md`. While both are important, the initial mandatory reference creates a slight ambiguity on whether `communication-standards.md` is loaded at Stage 0, or if it's a general guideline for all outputs. Given the explicit Stage 0 for the correction ledger, `communication-standards.md`'s loading point is unclear.

3.  **Lesson 151 HARD GATE placement and context:**
    *   **Stage 1, Step 1:** "READ THE SCRIPTS TOO — lesson 151 HARD GATE: any disagreement between docs and scripts is an instant fail."
    *   **Stage 4 payload:** "`scripts_reviewed: [<scripts actually read>]` — lesson 151 HARD GATE"
    *   **Conflict:** Lesson 151 is mentioned as a HARD GATE in both Stage 1 (during script reading) and again in Stage 4 (as part of the payload to `/gap-analysis`). While its intent is clear (docs/scripts agreement), its dual placement and the phrasing "lesson 151 HARD GATE" in two different contexts could be confusing to a cold executor. It's unclear if the "HARD GATE" in Stage 1 is a hard stop *within* Stage 1, or just a declaration that this condition contributes to the later Stage 4 gate.

---

## Q4. Cold-executor confusion

1.  **Whether to skip rubric-gen if the artifact being authored already has a rubric file?**
    *   **Line:** Stage 1, Step 2: "Check for `<target-pipeline-dir>/references/end-goal-rubric.md`:"
    *   **Ambiguity:** The skill provides three clear paths if the file *exists* or is *absent*. A cold executor would know to check for the file and follow the corresponding path. If `bean_signoff: confirmed` is present, it explicitly states "load it as the active rubric, proceed to Step 3. Do not regenerate." This indicates that rubric generation *is* skipped if a confirmed rubric exists. So, this specific point is *not* ambiguous.

2.  **What format the rubric must conform to (frontmatter + sections)?**
    *   **Lines:** Stage 1, Step 2a: "Draft 6-8 criteria anchored on the pipeline's actual purpose, using this frontmatter shape: ... Followed by three mandatory sections: 1. **End goal** ... 2. **Success criteria** ... 3. **Worst failure modes**"
    *   **Ambiguity:** The skill *clearly* specifies the frontmatter shape and the three mandatory sections for inline rubric generation. A cold executor would know the required format. So, this specific point is *not* ambiguous.

3.  **Where to save the rubric (path)?**
    *   **Line:** Stage 1, Step 2 (File absent path): "On confirmation, save to `<target-pipeline-dir>/references/end-goal-rubric.md` with `bean_signoff: confirmed` and proceed."
    *   **Ambiguity:** The skill *clearly* specifies the save path as `<target-pipeline-dir>/references/end-goal-rubric.md`. A cold executor would know where to save the file. So, this specific point is *not* ambiguous.

4.  **What "Bean sign-off" means in chat terms (literal string match? approval keyword?)?**
    *   **Line:** Stage 1, Step 2 (File exists + `bean_signoff: pending` and File absent paths): "Accept any of: `confirmed` / `confirm` / `approved` / `ok` / `go` / `yes` / `ship it`."
    *   **Ambiguity:** The skill *explicitly* lists the acceptable keywords for "Bean sign-off." A cold executor would know which keywords to look for. So, this specific point is *not* ambiguous.

**Re-evaluation of Q4:**
It appears my initial scan for ambiguities was too broad. Upon closer reading, the skill is quite explicit about these points. Therefore, there is **no cold-executor confusion** based on the questions asked.

---

## Q5. Scope creep

The editor made changes primarily focused on integrating the rubric generation and the HARD GATE for Bean's sign-off, as per the specified remit.

1.  **Jargon Rewrites / Clarifications:**
    *   **Line:** Throughout Stage 1, new introductory sentences and explanations like "> The rubric is the optimiser's instruction set for what counts as an improvement." are added.
    *   **Severity:** Low. These are clarifications to enhance understanding of the new rubric stage and directly support its purpose. They do not introduce new functionality or significantly alter existing sections outside the rubric's scope.

2.  **Stage 7 HARD GATE (Cross-tier QC peer review):**
    *   **Lines:** Added "5. **HARD GATE — Cross-tier QC peer review with full protocol dispatch.**" and the accompanying "DISPATCH PROMPT GATE" and subsequent instructions.
    *   **Severity:** Medium. While this is a HARD GATE, the prompt mentioned "rubric-gen sub-stage and a HARD GATE for Bean sign-off". This new HARD GATE in Stage 7 is for cross-tier QC, not directly for Bean's sign-off on the rubric. It *could* be considered outside the *exact* remit of "rubric-gen + HARD GATE" if "HARD GATE" was singular and strictly tied to the rubric. However, the overall spec for the optimisation toolkit might imply broader quality gates. Given it's a new HARD GATE and significant addition, it's worth noting.

VERDICT: drift-minor
