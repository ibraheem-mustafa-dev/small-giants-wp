# QC Report — /qc-inline (Sonnet review, 2026-04-29)

## Q1. Is certainty_calc wired into the evidence pass?

Yes. The wiring is present in Step 4 under "Certainty calculation (evidence pass)".

**Import (lines 123–124):**
```python
sys.path.insert(0, str(Path("~/.agents/skills/shared-references/").expanduser()))
from optimisation_toolkit.certainty_calc import score as certainty_score
```

**Score call (lines 125–127):**
```python
certainty_result = certainty_score(responses)
# certainty_result = {certainty: 0–100, dominant_answer, dissenting_count, verdict}
```

**Verdict handling — control-flow table (lines 149–157):**

| Verdict | Certainty | Action |
|---------|-----------|--------|
| `OK` | ≥ 70 | Continue to Step 5 normally |
| `REVIEW` | 50–69 | Annotate "LOW CERTAINTY" in report; continue |
| `HOLD` | < 50 | HARD STOP at Step 4. Surface dissenting responses inline. Recommendation = hold. |
| `LOW_SAMPLE` | N/A | Emit annotation; continue to Step 5 |
| `UNAVAILABLE` | N/A | Emit annotation; continue to Step 5 |

Spec requirement (certainty<70 = flag, certainty<50 = HOLD) is satisfied. The `REVIEW` row covers the 50–69 flag; the `HOLD` row covers the <50 hard stop. Both match spec exactly.

The emit spec is also satisfied — line 143–144 emits `{certainty, dominant_answer, dissenting_count}` into the inline report via the `**Certainty:**` template line.

---

## Q2. Are the inline-mode adaptations present?

**Smaller batches (<5 responses) handled gracefully:** Yes. The `REVIEW` and `LOW_SAMPLE` paths both continue to Step 5. The explicit note at line 158:
> "if `responses` contains fewer than 2 items, `certainty_calc` raises `ValueError`. The structured `LOW_SAMPLE` dict above is returned instead. Do NOT crash. Continue to Step 5 normally."

**N<2 case returns LOW_SAMPLE structured dict, not crash:**
```python
except ValueError:
    certainty_result = {
        "certainty": None,
        "dominant_answer": None,
        "dissenting_count": None,
        "verdict": "LOW_SAMPLE",
        "annotation": "single-response inline run — certainty calculation skipped"
    }
```
Structured dict confirmed. No flat string. No crash path.

---

## Q3. Were all 4 secondary gaps (G1–G4) fixed?

**G1 — ImportError caught, emits "UNAVAILABLE" verdict:**
```python
except ImportError:
    certainty_result = {"verdict": "UNAVAILABLE", "annotation": "certainty_calc module unavailable — skipping certainty pass"}
```
Present at lines 136–137. Confirmed.

**G2 — Output template includes Certainty: line:**
```
**Certainty:** <X>/100 — verdict: <OK|REVIEW|HOLD>, dominant: <dominant_answer>, dissenting: <N>
```
Present at lines 143–144. Confirmed.

**G3 — LOW_SAMPLE emits structured dict (matches /qc schema) not flat string:**
The `except ValueError` branch returns a 5-key dict: `certainty`, `dominant_answer`, `dissenting_count`, `verdict`, `annotation`. No flat string. Confirmed.

**G4 — `responses` provenance comment added before certainty_calc call:**
```python
# responses = list of per-scenario verdict strings ("pass" | "fail" | "partial") built during Step 4
```
Present at line 121, directly before the `try` block. Confirmed.

All 4 secondary gaps landed. No DRIFT on G1–G4.

---

## Q4. Schema parity with /qc

The G3 spec says LOW_SAMPLE should emit a structured dict matching `/qc`'s schema. `/qc` SKILL.md was not read for this review — parity is assessed against internal consistency only.

**LOW_SAMPLE dict keys (lines 129–135):**
`certainty` (None), `dominant_answer` (None), `dissenting_count` (None), `verdict` ("LOW_SAMPLE"), `annotation` (string)
→ 5 keys, nulls for numeric fields.

**UNAVAILABLE dict keys (lines 136–137):**
`verdict` ("UNAVAILABLE"), `annotation` (string)
→ 2 keys. Omits `certainty`, `dominant_answer`, `dissenting_count`.

**Schema divergence found.** LOW_SAMPLE and UNAVAILABLE are not structurally identical. LOW_SAMPLE null-pads all five schema fields; UNAVAILABLE omits the three numeric fields entirely. A Step 7 emitter accessing `certainty_result["certainty"]` unconditionally would raise KeyError on an UNAVAILABLE result.

The spec row (G3) says LOW_SAMPLE "matches /qc schema" — it says nothing about UNAVAILABLE. But the combined error-handling design implies both branches feed the same downstream emitter. The UNAVAILABLE branch should also carry null-padded numeric keys for consistency. This is a minor schema gap, not a logic error — the annotation substitution rule in lines 145–146 means Step 7 won't blindly render `<X>/100` for UNAVAILABLE in practice. But the structural inconsistency remains.

---

## Q5. Cold-executor confusion

**Output template Certainty line — format clear?**
The `**Certainty:**` template (lines 143–144) shows the OK-case format: `<X>/100 — verdict: <OK|REVIEW|HOLD>, dominant: <dominant_answer>, dissenting: <N>`. Lines 145–146 say to emit the annotation string "in place of the numeric score" for LOW_SAMPLE/UNAVAILABLE — but no concrete alternative template is shown. A cold executor has to infer the substitution. Minor ambiguity: does "in place of the numeric score" mean replace only `<X>/100`, or replace the entire line content after `**Certainty:**`?

**`responses` provenance — is variable origin clear?**
The comment (line 121) states the type and construction point ("built during Step 4"). Adequate. One gap: it doesn't state the list must be strings, not dicts or mixed types. Low severity — the `"pass" | "fail" | "partial"` annotation makes the expected values clear.

**Inline-mode HOLD path — does the runner know to surface dissent to Bean inline (not to a file)?**
The HOLD row says "Surface all dissenting responses inline to Bean." The word "inline" is explicit; no file path is mentioned. However, "dissenting responses" is ambiguous — it could mean (a) the raw response strings that disagreed with `dominant_answer`, or (b) the full scenario evidence transcripts for those responses. `dissenting_count` is available but not the dissenting values themselves. A cold executor would likely surface only the count, which gives Bean a number but not enough context to act. Low severity in the inline skill context (evidence excerpts are already in the scenario table), but the HOLD path instruction could be more precise.

**Summary of ambiguities (all minor):**
1. LOW_SAMPLE/UNAVAILABLE Certainty line substitution not shown as a concrete alternate template.
2. `responses` element type not stated (string list vs other).
3. HOLD: "dissenting responses" content (count vs full transcripts) not defined.

None of these block execution. They introduce interpretation variance.

---

## Q6. Scope creep

No scope creep detected. The modifications visible in the SKILL.md are:

1. "Certainty calculation (evidence pass)" block under Step 4 (lines 113–158) — the primary Phase 1b row 8 wiring.
2. Control-flow verdict table (lines 149–157) — part of row 8.
3. `**Certainty:**` template line (lines 143–144) — G2.
4. `responses` provenance comment (line 121) — G4.
5. `except ImportError` branch (lines 136–137) — G1.
6. `except ValueError` / LOW_SAMPLE dict (lines 128–135) — G3.

All other sections — Output Format, Differences from /qc, Hard Gates, Common Mistakes, Invoked Skills, Tool Bindings, Process steps 1–3 and 5–7 — are unchanged. Nothing outside the certainty_calc wiring + 4 secondary gaps was touched.

---

VERDICT: drift-minor
