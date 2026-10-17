# Smell Signals — QC Pipeline Stage 5 Trigger Catalogue

A "smell" is a signal that tests pass but something is still wrong. Stage 4 (Compare) tags scenarios with `smell: true` when any of these patterns appear in the evidence. If any scenario is smell-tagged, Stage 5 (Code Review) fires.

This catalogue grows over time — append new patterns as they are discovered.

---

## Browser / UI Smells

| Signal | What to look for | Why it matters |
|--------|-----------------|---------------|
| Console errors on load | Any `console.error` entries captured by Playwright | Errors suppressed from UI but present in log indicate broken state |
| Layout shift jank | Visible element reflow in screenshots taken 100ms apart | CLS issue — affects Core Web Vitals and user experience |
| Overflow clipping | Elements cut off at viewport edge in screenshots | Content is hidden, not responsive |
| Invisible focus indicator | Tab sequence shows no visible focus ring | Accessibility failure — keyboard users cannot navigate |
| Empty alt text on meaningful images | axe-core flags `image-alt` rule | Screen reader users receive no context |
| Deprecated API warning | Console warns of deprecated method | Will break in a future browser version |
| Response time anomaly | Page load exceeds 8 seconds on a local/staging server | Infrastructure or render-blocking resource issue |
| Font flash (FOUT) | Screenshots show fallback font before web font loads | Font loading not optimised |
| Zero-height sections | A section renders at 0px height | Hidden content or CSS conflict |

---

## Skill / Script Smells

| Signal | What to look for | Why it matters |
|--------|-----------------|---------------|
| Unexpected warnings in stdout | Lines starting with `WARNING:` or `WARN:` | Skill is silently degrading |
| Truncated output | Output ends mid-sentence or mid-JSON | Context window or buffer overflow |
| Fallback path used unexpectedly | Stdout mentions "falling back to" on a golden-path scenario | Primary path is broken |
| Model not as expected | Stdout names a different model than the skill declared | Routing table mismatch |
| Stale cache served | Timestamp in output is older than the invocation time | Cache invalidation broken |
| Empty JSON fields | Required output fields present but value is `null` or `""` | Stage hand-off will fail downstream |

---

## Pipeline Artifact Smells

| Signal | What to look for | Why it matters |
|--------|-----------------|---------------|
| `errors: []` missing from artifact | Validator passes but no errors array present | Validator cannot confirm clean run |
| Stage duration far outside expected range | Stage took 10× the documented duration estimate | Infinite loop or hung subprocess |
| Retry count at maximum | Artifact records `retries: 2` (max) | Stage barely passed — fragile |
| Kill gate triggered and bypassed | HALT.json exists but pipeline continued | Kill gate enforcement broken |
| Mismatched run_id across artifacts | Two artifacts have different `run_id` values | State contamination from a previous run |

---

## Code / Implementation Smells (Stage 5 only)

These are not detectable by automated test execution — they require the reviewer panel.

| Signal | What to look for |
|--------|-----------------|
| N+1 query pattern | Loop that calls a DB query or API per iteration |
| Hardcoded credentials or paths | Strings like passwords, API keys, or `C:\Users\...` outside config files |
| Missing input validation | Function accepts user input without sanitisation |
| Silent exception swallow | `except: pass` or `except Exception: pass` with no logging |
| Unused import or dead code | Imported but never called |
| Direct DOM manipulation alongside a framework | `document.getElementById` inside a React/Vue component |

---

## Updating This Catalogue

When a new smell pattern causes a Stage 5 miss (tests green, but bug shipped), add an entry here:

```
| [Signal name] | [How to detect in evidence] | [Why it matters] |
```

Tag with the date discovered and the QC run ID where it was first seen.
