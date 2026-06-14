# Evaluation: /sgs-wp-engine (SKILL.md harness rewrite)

**Grade: B (4.19/5)**  ·  target_type: skill  ·  2026-06-12

## Context
Rewritten 2026-06-12 from a 498-line doc to a 129-line research-grounded HARNESS skill:
pointers not copies; an evidence-gate PreToolUse hook enforces a `GROUND-TRUTH:` line
before any SGS framework-code edit; a Stop hook will enforce a `SKILL-STATUS` self-report;
a freshness gate compares `db_synced` to the DB; WooCommerce reality replaces the false
"No WooCommerce" stance. skillscore 98%.

## Research baseline
- Correction ledger (decisive): "Instructions alone are insufficient enforcement. Fix: use
  <HARD-GATE> tags that are visually distinct and structural." -> the evidence-gate HOOK is
  exactly that structural enforcement. The harness approach IS the documented fix.
- Skill-type rolling avg 3.99 (n=14). No inflation flag; no identical-score run.
- Anthropic guidance (Agent Skills / progressive disclosure): just-in-time pointer loading
  beats long inline docs — validates the cut-to-pointers design.

## Scores
| Criterion | Score | Note |
|---|---|---|
| completeness | 4.0 | ships; minor reliance on pointer-following |
| clarity | 4.2 | strong |
| routing_accuracy | 4.3 | strong |
| robustness | 4.0 | no floor fired |
| security | 4.5 | strong |
| negative_routing | 4.5 | present |
| example_quality | 3.5 | weakest — one inline format example, concrete worked examples are pointers |
| ecosystem_awareness | 4.5 | strong |

**Strongest:** security / negative_routing / ecosystem_awareness — 4.5
**Weakest:** example_quality — 3.5

## 6-Lens system effect
1. End-result: PASS — drives evidence-grounded SGS builds + a compounding library; the gate changes behaviour structurally, not by prose.
2. OC<->CC: PASS — CC-side skill; OC reads SGS DB stats; lessons flow to OC via feedback_* -> blub.db.
3. blub.db persistence: PASS — captured rules land in feedback_*/blub.db.
4. Automation vs human-remember: PASS (standout) — hooks replace the "remember to check" reflex; nothing relies on Bean remembering.
5. ADHD/overwhelm (VETO): PASS — net LOWER load (129<498 lines, one-line DB answers, a single automated pre-edit gate, not a manual checkpoint). Not vetoed.
6. values_alignment: PASS (provisional) — System Effect table carries USP (revenue engine) + TA-serving action (cuts time-to-ship) + % impact (high/compounding). end-goal-rubric.md present but bean_signoff pending -> treated provisional.

## Recommendations (fixes, by opportunity value)
1. [B] Add ONE filled-in concrete `GROUND-TRUTH:` example to the SKILL.md body (e.g. the sgs/hero contentWidth case) — ~5 min, +~0.5 on example_quality, raises gate-compliance fidelity.
2. [C] Add a one-line pointer from SKILL.md to references/examples/ so the worked examples are reachable in <=1 hop from the body.

## Opportunities (what it could become)
1. Eval-driven skill regression — the item-5 eval set becomes a recurring before/after drift harness tied to the freshness gate. Connects to: /sgs-update, blub.db. Showpiece: medium.
2. GROUND-TRUTH telemetry — the evidence gate logs evidence-source distribution (db/dom/file/spec) to blub.db, surfacing which evidence types agents skip. Connects to: blub dashboard. Showpiece: medium.
3. SKILL-STATUS dashboard widget — parse self-report lines into a verified-vs-assumed turn-rate metric. Connects to: blub dashboard. Showpiece: medium.

## S-grade
Candidate (not awarded — pending Bean sign-off): USP + Innovative (model-independent structural
enforcement of evidence-before-edit is rare). It is really the HOOK SYSTEM that is the S-candidate,
not the doc. Marketing angle: "how we stopped our AI guessing." Needs human sign-off.

## QC note
/qc-council (Step 7.75) dispatches rater SUBAGENTS via /delegate; Bean directed NO agent
delegation this session, so the documented fallback was used: inline assumption self-check
(Step 7.6 substance). Each gap/opportunity's assumption was traced to the actual SKILL.md /
hook code in this session. qc_review.fallback_reason recorded.
