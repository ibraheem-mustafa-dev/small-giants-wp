# QC Report — /gap-analysis (Sonnet review, 2026-04-29)

---

## Q1. Is Lens 6 ALWAYS-on (no opt-out path)?

**Yes. Confirmed.**

Heading: `### Step 4.5 — System Effect Check (6-Lens, HARD GATE)` — line 200.

Exact always-on declaration, lines 218–219:

> **Lens 6 — Values alignment (added 2026-04-18). Lens 6 ALWAYS runs — there is no opt-out path.** Every artefact evaluated by gap-analysis must be checked against a confirmed rubric file at `references/end-goal-rubric.md`.

The word "ALWAYS" is bolded. The phrase "there is no opt-out path" appears literally. No conditional clause anywhere in the Lens 6 section creates an escape route.

The output JSON schema at lines 229–242 includes `"values_alignment"` as a mandatory key alongside the other five lenses, with no flag marking it optional. Absence of the key would be a schema deviation.

---

## Q2. Is the 4-step fallback chain present and ordered correctly?

**Yes. Present and ordered correctly.**

All four fallback steps are at lines 220–225, under the sub-heading `**Fallback chain — evaluate in order, first match wins:**`

| Step | Location | Text (paraphrased to confirm match) |
|------|----------|--------------------------------------|
| 1 — confirmed | Line 221 | "File exists at `references/end-goal-rubric.md` with `bean_signoff: confirmed` — use it as the rubric for this lens." |
| 2 — pending | Line 222 | "File exists but `bean_signoff: pending` — use it, and flag the pending status prominently in the output." |
| 3 — no file / draft | Lines 223–224 | "No file exists — generate a draft rubric inline this run. Surface it to Bean before scoring. Use it for this run only. Flag as `draft-unconfirmed` in the evaluation JSON." |
| 4 — declined / B- cap | Line 225 | "Bean declines the inline draft — use the 5-lens system-effect check alone (lenses 1–5) and cap the overall grade at B- (3.4) regardless of other lens scores." |

Order exactly matches spec §3.6: confirmed → pending → no-file/draft → declined/cap-at-B-.

The `"first match wins"` instruction ensures steps are not evaluated in parallel. Correct.

---

## Q3. Drift / contradictions

**Two items found. Both minor.**

**3a — Step 4.5 intro paragraph names "lenses 1–4" as hard gates; Lens 5 as a veto; Lens 6 as an addendum.** Line 204:

> "A rubric-A target that fails any of lenses 1-4 stays a failure. Lens 5 is a veto ... Lens 6 (values_alignment, added 2026-04-18) catches a separate failure mode ..."

The prose structure implies Lens 6 is an addendum with lower authority than Lens 5's veto. A cold executor reading top-to-bottom might infer Lens 6 is optional because it's framed as "added later" and has a "separate failure mode" rather than being introduced with equal weight alongside the other lenses. The always-on declaration at line 218 corrects this — but the intro prose at line 204 creates momentary doubt that a careful reader must resolve by continuing to line 218.

*Severity: minor. No actual contradiction — the always-on line is explicit. But the intro framing is inconsistent with the always-on mandate.*

**3b — Scoring cap applied for fallback 4 (B-, 3.4) vs. fallback-3 B cap (3.9) creates an undocumented asymmetry.** The Lens 6 section at line 227 says:

> "For fallbacks 1–3, evaluate whether the target carries: (1) top USP ... If NONE of the three are present ... cap at B (3.9)."

Then line 225 (fallback 4) says: `cap the overall grade at B- (3.4)`. The grading scale at Step 4 (line 198) maps B to 3.5–4.4 and D to 1.5–2.4 — there is no "B-" band defined in the display mapping. The JSON at line 225 uses `"lens_6_fallback": "grade_capped_B_minus"` and the numeric 3.4, but the Step 4 mapping shows 3.4 is in the C band (2.5–3.4), not a B-. A cold executor applying the Step 4 display mapping to score 3.4 would output letter grade C, not B-.

*Severity: minor drift. The label "B-" appears only in fallback 4; the numeric value 3.4 is the C/B boundary in the scoring table. Executor needs to decide which takes precedence — the letter label or the numeric map.*

---

## Q4. Cold-executor confusion

**Four ambiguities identified.**

**4a — What does `draft-unconfirmed` mean in the output JSON?**
Lines 223–224 instruct the executor to "flag as `draft-unconfirmed` in the evaluation JSON" but no JSON schema shows where this flag lives. The output JSON template at Step 7 (lines 337–403) has `"system_effect_lens"` with a `"values_alignment"` key, but no `draft_unconfirmed` field or rubric status field anywhere in the schema. A cold executor knows to set the flag but has no prescribed key name or location to put it. It may invent `"rubric_status": "draft-unconfirmed"` or embed it in `"reasoning"` — result is inconsistent across runs.

**4b — What triggers the B- cap (which fallback path)?**
The JSON example at line 225 uses `"lens_6_fallback": "grade_capped_B_minus"`. This key is not present in the Step 7 JSON template. The `"system_effect_lens"` block at lines 229–242 has `"grade_cap_applied": null` — the prescribed key for grade caps. A cold executor must infer that `grade_cap_applied` should be set to `"B_minus"` when fallback 4 triggers, but the two keys from lines 225 and 241 are different names. Inconsistency is near-certain.

**4c — How is Bean's confirmation/decline detected?**
Line 224 (fallback 3) defines confirmation keywords: `"confirmed", "ok", "go", "yes", "ship it"`. Line 224 also defines decline keywords: `"skip", "no", "decline"`. These are explicit — this part is unambiguous.

However, there is no instruction on what happens if Bean ignores the inline draft entirely (no response, session continues to next topic). The fallback chain has no timeout or "no response = proceed with draft" / "no response = treat as declined" clause. For a non-interactive run (subagent dispatch where Hard Rule 1 directs full output), Bean can never respond. The fallback chain assumes an interactive loop that cannot always be provided.

**4d — What happens if the rubric file exists but is malformed (truncated YAML, missing `bean_signoff` key)?**
Fallback steps 1 and 2 both test for `bean_signoff` value (`confirmed` vs `pending`). If the file exists but has no `bean_signoff` key at all (malformed or incomplete YAML), neither step 1 nor step 2 matches, but a file does exist. No instruction covers this case. An executor might fall through to step 3 (no file — generate draft) or throw an error. Behaviour is undefined.

---

## Q5. Scope creep

**Nothing outside the Lens 6 always-on / fallback chain was added in the §3.6 edit.** The Lens 6 section is self-contained within Step 4.5. All surrounding steps (1 through 8) and their content are pre-existing architecture.

One adjacent observation that does not constitute scope creep but is worth flagging: the `end-goal-rubric.md` file that the fallback chain depends on does not exist at `~/.claude/skills/gap-analysis/references/end-goal-rubric.md`. Every live run of `/gap-analysis` will hit fallback 3 (no file — generate draft) until this file is created. This means every run currently requires an interactive confirmation exchange before Lens 6 can produce a stable score. This was likely known at edit time and is noted here for completeness — it is not a defect in the Lens 6 wording itself.

*Scope creep severity: none.*

---

VERDICT: drift-minor
