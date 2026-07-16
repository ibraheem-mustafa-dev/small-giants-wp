---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Adversarial council verdict on Loop-1 findings + methodology — NO-GO, re-run by section"
created: 2026-06-08
status: VERDICT — Loop-1 findings (2026-06-08-loop1-responsive-style-rootcauses.md) are NOT trustworthy as-is. Re-run by SECTION with a completion gate before any implementation.
panel: "Process Auditor (D), Evidence Fact-Checker (C), Scope-Fidelity Lawyer (D), Completeness Enforcer (C+), Cynic-on-correctness (D+)"
overall: "NO-GO"
---

# Council verdict — convergence-weighted

## Convergent headline (≥2 personas independently)
**The Loop-1 findings cannot be trusted as a basis for fixes.** The by-PROBLEM-TYPE dispatch destroyed the per-section cross-attestation that was the user's chosen confidence mechanism, and forensic spot-checks then found a factually wrong root cause, a mis-attributed symptom, fabricated/over-cleared scope, and two "unproven" items that were closable in-run. Re-run by section with a completion gate.

## CONVERGENT MUST-FIX (fatal first)

- **C1 — RC-5 is FACTUALLY WRONG (Fact-Checker + Cynic).** `class-sgs-container-wrapper.php:489` DOES emit `max-width` for `widthMode=custom`. And the brand clone (line 854) has NEITHER `max-width` NOR `margin-inline:auto` → the brand is NOT going through the custom-width branch at all. RC-5's premise + conclusion are unsafe. Re-diagnose which width path the brand actually takes.
- **C2 — BR-A is mis-attributed; RC-2 alone will NOT fix it (Cynic + Fact-Checker).** Even if the missing `gridTemplateColumnsDesktop` slot is added (RC-2), the emitted `@media(min-width:1024px){.uid{1fr 1fr}}` (specificity 0,1,0) STILL loses to the inline `1fr` (1,0,0,0). BR-A requires **RC-1 ∧ RC-2 fixed together**. A fix built on the doc (RC-2 "Covers BR-A") would ship, re-clone, and BR-A would still be broken.
- **C3 — RC-1 is over-generalised and the fix-direction is a DECISION, not a given (Cynic + Process Auditor).** "Inline NEVER beats @media" is false: `src/blocks/hero/render.php:362-365` ALREADY beats inline with `!important` (a shipped counter-pattern), and the clone proves it works. So the universal fix is a deliberate choice — de-inline the base value vs emit `!important` overrides — not "replicate minHeight". RC-1's "Covers:" list partly evaporates into RC-2/RC-3 (force-fitting).
- **C4 — Process: by-type dispatch destroyed cross-attestation (Process Auditor + Cynic).** Every RC is a single agent's chain with no independent corroboration; the project's own ≥2-evidence rule (R-22-11) is unmet for RC-1/3/4/5/7. Re-dispatch ONE agent per section; build a convergence table (which independent section-agents landed on each cause). A cause attested by ≥2 sections = confirmed; single-source = needs a confirming read.
- **C5 — Fabricated / improperly-cleared scope (Scope Lawyer + Completeness).** "BR heading typography" was invented, investigated, cleared — the user never raised it. FP-B was cleared WITHOUT the approval gate, and FP-B is "font sizing/styles OFF" (plural) — clearing one example ("OUR SIGNATURE" font-size) doesn't clear it. "SP-G" was added to loops without the user confirming it. Investigate ONLY verbatim-listed issues; clear nothing without the gate.
- **C6 — Completeness: unproven items were closable in-run (Completeness + Process Auditor).** The council RAN the prescribed check: **`sgs/media` HAS `borderRadius`, `maxHeight` (responsive), `imageHeight`** — so R3b/c's premise ("native lift may have no slot") is FALSE; the real cause is the lift not feeding those slots (RC-1/RC-2 family). H-A was closable by reading `hero/render.php`. No completion gate exists → an incomplete loop shipped as "DIAGNOSIS COMPLETE".
- **C7 — Approximate `~line` citations violate "exact file:line" (Process Auditor + Fact-Checker).** RC-1/2/3/4/5/7 use `~`. Pin every one.

## What SURVIVES (safe to build on now)
- **RC-8 — VERIFIED solid** (multiple personas). `convert.py:611-613` class-selector branch has no ancestor check (the tag branch 614+ does) → cross-section CSS pollution (`.sgs-social-proof .__sub` bleeds into gift). Real bug; draft line 618 confirms the offending rule.
- **RC-2's DB-absence FACT** — verified TRUE: `sgs/container` has no `*Desktop` slots. (But the mechanism wording + BR-A attribution are wrong — see C2.)
- **RC-9 mechanism** — `db_lookup.py` lacks `min-width:640` → social-proof heading stuck at 28px (verified). But cite the gift-grid path that DID work (apparent contradiction).
- **RC-6** — `heading/style.css:7-9` `:where(){text-align:center}` verified; the correct fix is "emit explicit textAlign:left", NOT "change the block default" (lower-risk).
- **RC-3's gate** — `class-sgs-container-wrapper.php:978` (contentWidth XOR layout) is real; but prove `contentWidth` was actually computed for the trust-bar (needs an attr dump), don't assume.

## Single missing artefact that would prove-or-kill RC-3/4/5/7 at once
A **per-block converter attr-dump** (the `container_attrs` the converter actually produced for each clone block) + **one Playwright/`/browsing` computed-style pass at 1440/768/375**. Reading the code tells you what it CAN do; the attr-dump + computed style tell you what it DID.

## Process fixes to bake into the re-run (the completion gate)
1. ONE agent per SECTION; investigate only that section's verbatim issues end-to-end.
2. Per-issue 7-field entry (ID + verbatim + draft-line + clone-line + script:line + DB + root-cause). EXACT lines, no `~`.
3. Convergence/attestation table; ≥2 independent sources for any load-bearing/universal claim.
4. Coverage ledger vs the verbatim list: every issue = proven | cleared(only with gate) | deferred-with-reason. **unproven must == 0** at hand-back (or carry a stated tool-barrier).
5. Diagnosis only — no fix-candidates in the entries (RC-6/RC-7 breached this).
6. Run `/gap-analysis` on the issue log BEFORE the approval gate (it would have caught C6 immediately).

## GO/NO-GO
**NO-GO** on trusting Loop-1 as-is or handing it to an implementation session. Salvage RC-8 (+ RC-2 DB fact, RC-6, RC-9) as confirmed seeds; re-run the rest by section with the gate.
