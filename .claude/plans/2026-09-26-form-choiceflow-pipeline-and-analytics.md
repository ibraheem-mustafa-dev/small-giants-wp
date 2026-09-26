---
doc_type: plan
plan_id: form-choiceflow-pipeline-analytics
spec: 42-SGS-FORM-CPT-AND-PRICING.md, 43-SGS-CHOICE-FLOW.md
status: parked
date: 2026-09-26
---

# Forms and choice flows: cloning-pipeline creation and analytics (parked)

**Why this is separate:** Bean, 2026-09-26: these two items are not being built yet. Every other part of the
form and choice-flow track is in `archive/2026-09-14-spec42-43-form-choiceflow-phase-plan.md`.

## 1. The cloning pipeline creates form and flow posts (Spec 42 FR-42-10, Spec 43 FR-43-14)
- **Gap:** `sgs-clone-orchestrator.py --deploy-target` cannot create a new `sgs_form` or `sgs_choice_flow` post, so a
  cloned draft containing a form or a flow still emits inline content. That breaches the rule that forms and flows
  live as saved posts.
- **Decided for forms (Bean, 2026-09-26, Spec 42 §9):** every form is a saved post; a cloned form becomes a saved
  form plus a linking `sgs/form`. Until the pipeline does this, open the cloned page and press "Save as reusable
  form" on the form block (it moves the fields into a new saved form and links it).
- **Still open (owner policy):** the same rule for cloned flows, and how cloned forms and flows are named.
- **Then:** one follow-up fixes both post types; don't solve it twice.

## 2. Analytics and A/B testing (Spec 42 FR-42-13, applies to flows identically)
- **Gap:** the "reuse one saved form or flow everywhere" argument rests partly on per-form and per-flow analytics
  (completion rate, drop-off per step) and A/B tests, which don't exist.
- **Needs:** research into what to measure (step drop-off, completion, revenue per flow) and where it's stored, and
  a design for comparing two versions of a flow. Plan it via `/strategic-plan` when it's picked up.
