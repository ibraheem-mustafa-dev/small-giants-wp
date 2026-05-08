recommended_model: opus

Invoke `/autopilot` before doing anything else.

# Next session — cloning-skill build (parking P-11)

The next session executes the comprehensive `/sgs-clone` build via 10-milestone subagent orchestration. Foundation is locked from the 2026-05-07/08 session.

**Read these in order:**
1. `.claude/handoff.md` — last session summary
2. `.claude/next-session-prompt-cloning-skill-build.md` — the full milestone-by-milestone plan with subagent dispatch specs (this is the actual session prompt)
3. `.claude/reports/rule-stage-coverage-audit-2026-05-07.md` — 97 rules audited, 28 genuine gaps, Top-12 ranked
4. `.claude/reports/fingerprint-design-review-synthesis-2026-05-07.md` — 11 fixes from the 4-model peer review

The specialised prompt at `next-session-prompt-cloning-skill-build.md` is the canonical kick-off for this session — full task breakdown, milestone sequencing, success criteria, skills + tools tables, and guardrails.

**Quick orientation:**
- 10 milestones, ~6-7 hr wall-time
- Heavy parallel-subagent dispatch (Sonnet × 3-5 per milestone for Milestones 1-6)
- Main agent orchestrates + briefs + qc-inlines after each return
- Mama's homepage smoke run as Milestone 9 (the test)
- Final `/handoff` as Milestone 10

**Sibling next-session prompts** (queued after P-11 ships):
- `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md` — sgs/empty-state, sgs/toggle, sgs/testimonial-slider, timeline rework (P-9)
