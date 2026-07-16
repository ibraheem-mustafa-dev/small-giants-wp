# QC Report — /qc (Sonnet review, 2026-04-29)

---

## Q1. Is certainty_calc wired into Stage 3?

**Import statement (lines 121–126):**
```python
try:
    sys.path.insert(0, str(Path("~/.agents/skills/shared-references/").expanduser()))
    from optimisation_toolkit.certainty_calc import score as certainty_score
    certainty_result = certainty_score(responses)
```

**score() call (line 127):**
```python
certainty_result = certainty_score(responses)
```

**Verdict-handling branch (lines 169–176):**
```
| `OK`         | ≥ 70  | Continue normally to Stage 4 |
| `REVIEW`     | 50–69 | Flag report with **LOW CERTAINTY** tag; annotate which responses dissented; continue to Stage 4 with annotation |
| `HOLD`       | < 50  | **HARD STOP** — do not proceed past Stage 3. Surface to Bean with all responses inline... |
| `LOW_SAMPLE` | N/A   | Emit `low sample (N=X)` annotation in evidence; continue to Stage 4 — do not crash |
```

**Confirmed:** `certainty_calc` is fully wired. Import, call, and all four verdict branches are present.

---

## Q2. Is the HOLD threshold correctly enforced?

**Kill Gates section (lines 293–295):**
```
- **Stage 3 certainty HOLD:** Stage 3 — if `certainty_calc` verdict is `HOLD` (certainty < 50),
  do not proceed past Stage 3. Surface all responses inline to Bean so the dissent is visible.
  Report must state: "Certainty too low to proceed (X%). Dissenting responses below:" followed
  by each response verbatim. Continuation requires Bean explicit override.
```

The `<50` threshold in Kill Gates matches the control-flow table in Stage 3 (`HOLD | < 50`). Both sources agree.

**Confirmed:** Kill Gates entry is present and threshold is consistent.

---

## Q3. Were all 5 secondary gaps fixed?

**QC-8 — Hand-off contract row 3→4 includes certainty fields (line 280):**
```
| 3 → 4 | execute → compare | JSON | `results` (array matching scenario names; each ran result
  has evidence_path), `certainty.certainty` (float 0–100 or null),
  `certainty.certainty_verdict` ("OK" | "REVIEW" | "HOLD" | "LOW_SAMPLE" | "UNAVAILABLE"),
  `certainty.dominant_answer` (str or null), `certainty.dissenting_count` (int or null) |
  kill gate: all results with status=error → abort |
```
**Status: LANDED**

**QC-9 — ImportError caught around certainty_calc import (lines 133–141):**
```python
except ImportError:
    # Module unavailable — skip certainty pass gracefully, do not crash
    certainty_result = {
        "certainty": None,
        "dominant_answer": None,
        "dissenting_count": None,
        "verdict": "UNAVAILABLE",
        "annotation": "certainty_calc module unavailable — skipping certainty pass"
    }
```
**Status: LANDED**

**QC-10 — Low-sample annotation when N<5 (lines 128–131):**
```python
if len(responses) < 5:
    certainty_result = {
        **(certainty_result or {}),
        "annotation": f"LOW_SAMPLE (N={len(responses)}); certainty result has reduced confidence"
    }
```
Threshold is N<5 (was N<2 per spec).
**Status: LANDED**

**QC-11 — Kill Gates section has "Stage 3 certainty HOLD" entry (lines 293–295):**
```
- **Stage 3 certainty HOLD:** Stage 3 — if `certainty_calc` verdict is `HOLD` (certainty < 50),
  do not proceed past Stage 3...
```
**Status: LANDED**

**QC-12 — Stage 6 report format includes Certainty block (lines 228–234):**
```
**Certainty block (required immediately after the verdict/confidence line):**

**Certainty:** <X>/100 — verdict: <OK|REVIEW|HOLD|LOW_SAMPLE|UNAVAILABLE>,
dominant: <dominant_answer>, dissenting: <N>
<low-sample or unavailable annotation if applicable>
```
Stage 6 narrative (line 225) explicitly lists "certainty block (see format below)" as a required section.
**Status: LANDED**

**All 5 secondary gaps confirmed landed. No DRIFT.**

---

## Q4. Drift / contradictions

### Schema mismatch: 3→4 contract vs certainty_calc return shape

The Stage 3 inline JSON schema (lines 157–164) uses the key `"verdict"`:
```json
{
  "certainty": <0-100 or null>,
  "dominant_answer": "<string or null>",
  "dissenting_count": <int or null>,
  "verdict": "OK|REVIEW|HOLD|LOW_SAMPLE",
  "annotation": "<low sample note if applicable>"
}
```

The hand-off contract table row 3→4 (line 280) uses `"certainty_verdict"`:
```
`certainty.certainty_verdict` ("OK" | "REVIEW" | "HOLD" | "LOW_SAMPLE" | "UNAVAILABLE")
```

**DRIFT — minor.** The key name differs between the stage-3 inline schema (`verdict`) and the hand-off contract validator field (`certainty_verdict`). A runner writing `stage-3-evidence.json` using the inline schema will produce `certainty.verdict`; the validator will look for `certainty.certainty_verdict` and raise a contract violation. One key name must be chosen and applied consistently.

### Stage 6 Certainty block verdict values vs Stage 3 inline schema

Stage 6 certainty block format (line 231) lists:
```
<OK|REVIEW|HOLD|LOW_SAMPLE|UNAVAILABLE>
```

Stage 3 inline JSON schema verdict comment (line 162) lists only four values — `UNAVAILABLE` is absent:
```
"verdict": "OK|REVIEW|HOLD|LOW_SAMPLE"
```

The `UNAVAILABLE` value is emitted by the ImportError fallback (line 139) so it is a real runtime value. The inline schema comment is incomplete. Minor — the code is correct, the doc is incomplete.

### Kill Gates vs Stage 3 threshold

Kill Gates: `HOLD (certainty < 50)` — line 294.
Stage 3 control-flow table: `HOLD | < 50` — line 171.
Stage 3 prose: `"Certainty too low to proceed (<certainty>%)"` — line 173.

**Confirmed: all three agree on <50. No contradiction.**

---

## Q5. Cold-executor confusion

**ImportError fallback — what does UNAVAILABLE allow?**

Lines 133–141 define the `UNAVAILABLE` verdict and annotation. However, the control-flow table (lines 169–175) lists only `OK`, `REVIEW`, `HOLD`, and `LOW_SAMPLE` — `UNAVAILABLE` has no row. Stage 6 mentions it in the format string but specifies no pipeline behaviour. A cold executor receiving `verdict: UNAVAILABLE` has no documented action — continue to Stage 4, halt, or warn only? **Missing row in the control-flow table.**

**LOW_SAMPLE annotation — continue or HOLD?**

Lines 128–131 add an annotation to whatever verdict `certainty_score()` returned when N<5. The annotation reads "certainty result has reduced confidence" but does not state the action. The verdict itself could be `OK`, `REVIEW`, or `HOLD` depending on the score — the annotation is purely informational. A cold executor may not realise that `OK + LOW_SAMPLE annotation` still means continue. The annotation should explicitly say: "continue with annotation — do not HOLD solely due to low sample count."

**sys.path setup — import path undocumented**

Line 123: `sys.path.insert(0, str(Path("~/.agents/skills/shared-references/").expanduser()))`. This path is referenced in the code block but is not explained anywhere in the SKILL.md — no description of what lives at `~/.agents/skills/shared-references/`, whether it is a standard installation path, or how to verify it is present. The ImportError catch handles the failure gracefully but a cold executor on a non-standard machine has no context for troubleshooting the missing path.

---

## Q6. Scope creep

**ValueError catch block (lines 143–150):** Handles `ValueError` raised when `certainty_score` receives fewer than 2 responses. Not listed in any of the 5 secondary gaps (QC-8 through QC-12) and not in spec §5 Phase 1b row 7. Emits `verdict: LOW_SAMPLE` + a single-response annotation.
**Severity: low** — genuinely useful defensive guard; does not interfere with specified behaviour. Constitutes unrequested scope but carries no risk.

No other additions outside the specified change set.

---

VERDICT: drift-minor