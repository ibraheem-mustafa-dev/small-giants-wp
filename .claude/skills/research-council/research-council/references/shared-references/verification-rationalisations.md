# Verification Rationalisations — Shared Reference

A catalogue of the rationalisations agents and operators use to claim work is complete WITHOUT running verification. Load this from any skill where a "claim of completion / fix / pass" can be made before evidence has been produced.

**Consumed by:** `/qc`, `/qc-inline`, `/qc-council`, `/systematic-debugging`, `/subagent-driven-development`, `/deploy-check`.

## The Iron Law (binding across all consumers)

> Claiming work is complete without verification is dishonesty, not efficiency. No completion language ("done", "fixed", "should work", "looks good", "ready", "ship it") without fresh test evidence in the same message that cites the command + exit code.

Honest claim wording: cite the command and exit code. Example: *"ran 'npm test', exit 0, 34/34 pass"*. Without that, the claim is forbidden regardless of how confident the agent or operator feels.

## Red Flags — STOP signals before any completion claim

If any of the following are about to happen, halt and run verification first:

- Using softeners: "should", "probably", "seems to", "looks like", "I think"
- Expressing satisfaction before verification: "Great!", "Perfect!", "Done!", "Nailed it"
- About to commit / push / open PR without fresh test evidence
- Trusting a subagent's success report without independent re-check
- Relying on a partial check (only linter, only build, only diagnostics) as if it covered the whole gate
- Thinking "just this once" or "this case is different"
- Tired and wanting the work over
- ANY wording implying success without the command + exit code in the same message
- Tests that pass immediately (no failing-test step) when running TDD
- Inability to explain why the test failed before the fix
- "Test hard = design unclear" framing used to skip the test entirely

## Rationalisation table — verification side

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification. Confidence is not evidence. |
| "I'm confident" | Confidence is not evidence. |
| "Just this once" | No exceptions. The rule erodes the moment one exception is allowed. |
| "Linter passed" | Linter is not the compiler. Linter is not the test suite. Run the actual gate. |
| "Build passed" | Build is not the test suite. Build is not the live load. Run the actual gate. |
| "Agent said success" | Verify independently. Subagents have been caught reporting success on no-op fixes — 2026-05-21 Wave-1 G2 + G4 both. |
| "I'm tired" | Exhaustion is not an excuse. The cost of a wrong completion claim is higher than the cost of running the check. |
| "Partial check is enough" | Partial proves nothing. Either every gate ran or none of them counts. |
| "Different words so rule doesn't apply" | Spirit over letter. Reframing a claim does not exempt it from verification. |
| "Type-check passed" | Type-check is not the test suite, and the test suite is not the live load. Run all three gates relevant to the artefact. |
| "I already manually tested it" | Ad-hoc is not systematic. No record means it cannot be re-run. Write the systematic test. |

## Rationalisation table — TDD side

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. The test takes thirty seconds. |
| "I will test after" | Tests-after verify what was built, not what was required. Discovery happens before the implementation, not after. |
| "Tests after achieve same goals" | Tests-after answer "what does this do?" Tests-first answer "what should this do?" Different questions, different evidence. |
| "Need to explore first" | Fine. Throw away the exploration. Start the real work with TDD. |
| "Deleting X hours of code is wasteful" | Sunk cost. Keeping unverified code is technical debt that compounds. |
| "Keep as reference, write tests first" | The code will be adapted. Adaptation is tests-after with a polite name. Delete means delete. |
| "Test hard = design unclear" | Listen to the test. Hard to test means hard to use. The hardness is the signal. |
| "TDD will slow me down" | TDD is faster than debugging. Pragmatic means test-first because the cost of debugging unverified code dominates the cost of writing the test. |
| "Manual test faster" | Manual does not prove edge cases. Manual cannot be re-run. Every code change re-pays the manual cost. |
| "Existing code has no tests" | Improving the code means adding the tests. The improvement is the test, not the code change. |
| "Already spent X hours, deleting is wasteful" | Sunk cost fallacy. Hours invested in unverified code are not recovered by keeping the code. |
| "TDD is dogmatic, I'm being pragmatic" | Pragmatism without evidence is wishful thinking. The dogma exists because the failure mode is real. |
| "This is different because..." | Every "different because" is the standard rationalisation. Apply the rule. |

## Proof per step (multi-step work)

When a plan has several steps, a "done" claim at the end proves little: the failure usually hid in step 3. Write the proof before the work, so a step cannot be marked complete on a feeling.

1. **Before starting a step, write its proof:** the command, and the exact result that counts as a pass. The command must run as written, with no placeholders.
2. **Pick the proof by what the step touches:**

| The step changes | Proof | Passes when |
|---|---|---|
| Logic with a test suite | the test command | exit 0, and the new test failed before the change |
| A page or block people see | Playwright screenshot or snapshot at the target URL | the condition you can see holds (not "page loads") |
| An endpoint or WP-CLI behaviour | `curl` or `wp` command | status and body match what you stated |
| A file or config | `test -f`, `grep -c`, or a diff | the expected line exists |
| A claim about an outside system | a command that reads that system | output matches the claim |

3. **Run the proof when the step finishes**, then mark it complete, citing the command and exit code.
4. **If the proof fails:** make one targeted fix and re-run. If it still fails, stop and report the failing output and your fix. A second blind attempt on the same proof means the cause is not understood; go back to `/systematic-debugging` Phase 1.

For work with no test suite (most WordPress and client-site work), the proof is the visual or API check from the table. A change you never looked at is not verified.

## Verification patterns by artefact type

**Tests (unit / integration):**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass — ran 'npm test', exit 0"
❌ "Should pass now" / "Looks correct" / "I am confident"
```

**Regression tests (TDD red-green):**
```
✅ Write test → Run (must FAIL with current code) → Apply fix → Run (must PASS)
   → Revert fix → Run (must FAIL again, proving the test catches regression)
   → Restore fix → Run (passes)
❌ "I have written a regression test" (without the red-green verification)
```

**Build:**
```
✅ [Run build command] [See: exit 0] "Build passes — ran 'npm run build', exit 0"
❌ "Linter passed" (linter is not the compiler)
```

**Requirements:**
```
✅ Re-read the original request → Create line-by-line checklist → Verify each item ran
   → Report gaps OR confirm completion item-by-item
❌ "Tests pass, phase complete" (test pass is not requirement coverage)
```

**Live load (web / app):**
```
✅ Open the live URL in browser → Observe condition X holds → Screenshot evidence
   → Report URL + screenshot path + observation
❌ "Server returns 200" (200 is not user-visible correctness)
```

**Code review / spec review:**
```
✅ Three reviewer raters all agree (1) every recommendation has been addressed and
   (2) no new gaps surface on a re-read
❌ "Reviewer X said it looks good" (single-rater is not a council)
```

## How to apply

When loading this reference inside a skill:

1. **At the iron-law gate** (any "completion claim" boundary), cite the iron law verbatim. Reject the claim if the command + exit code is missing.
2. **At the red-flag scan** (any "I want to call this done" moment), check the operator's last message and the agent's draft response against the red-flag list. If any flag fires, do not let the completion language proceed.
3. **At the rationalisation challenge** (when the operator or agent pushes back), match the pushback against the rationalisation tables. The table's "Reality" column is the answer. Do not negotiate down the iron law.
4. **At the artefact-specific verification** (when running the gate), use the pattern matching the artefact type. Mixed artefacts (e.g. a feature that ships code + a config change + a documentation update) need every relevant pattern run.
