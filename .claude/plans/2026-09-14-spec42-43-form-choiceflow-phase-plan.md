---
plan_id: spec42-43-form-choiceflow
phase_name: "Phase 0 — fail-open requireLogin fix"
project: small-giants-wp
header: "sgs_form CPT + sgs/choice-flow — post-council implementation plan"
cost_estimate: "~5 min agent time, Phase 0 only"
docscore_grade: not-run (ad-hoc, in-flight — see phase-planner Stage 7 note on active plans)
---

# Phase 0 — Fix the fail-open `requireLogin` bug (Spec 42 FR-42-0)

**USP:** Closes a live, unauthenticated-submission security defect on the canary today,
with zero dependency on anything else in Spec 42 or Spec 43 — the cheapest, highest-value
action available in this whole programme.

**Plan label:** [PLAN: sonnet]

**Docscore:** not run — this is an in-flight ad-hoc phase-plan (no `plans/archive/` entry
yet); per phase-planner's own note, docscore only applies once the plan moves to archive.

**Aggregate cost estimate:** ~5 min, 1 step + 1 QA gate, Haiku-shaped (a scoped, mechanical
one-function fix with a named test).

**Phase success criteria (done when):**
- [ ] `class-form-rest-submission.php::handle_submit` refuses the submission (HTTP 503)
      when its `requireLogin` config cannot be resolved, instead of defaulting to `false`
- [ ] A login-gated form with its config cache cold (or deliberately cleared) rejects an
      anonymous submission with a clear error, not a silent 200
- [ ] A login-gated form with its config cache warm still accepts a genuine logged-in
      submission (no regression)
- [ ] Deployed to sandybrown and verified live via a real POST, not just a unit assertion

**Entry context (read before starting):**
- `plugins/sgs-blocks/includes/forms/class-form-rest-submission.php::handle_submit` — the
  exact function, lines ~59-61 (verified this session, both by the Cynic persona and the
  Abuse Red-Team persona independently, against live source)
- `.claude/specs/42-SGS-FORM-CPT-AND-PRICING.md` §7 + §1 + the FR-42-0 requirement-index
  row — the decided fix-shape (refuse outright, not default-true)

**References:**
- `.claude/specs/42-SGS-FORM-CPT-AND-PRICING.md` v2.1.0 — governing spec, FR-42-0
- 2026-09-14 combined `/adversarial-council` run (6 personas) on Spec 42+43 — this bug was
  independently confirmed live by 2 of the 6 personas before any fix was designed
- `.claude/rules/prove-the-cause-before-fix.md` — the bug's exact line was verified against
  source before this plan was written, not inferred

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| cli | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` | step 1 deploy |
| cli | `wp eval` / direct REST POST | QA gate |
| skill | `/qc-inline` | QA gate (per-file check, this touches one file) |

---

Step 1 — Fix the fail-open default and add a negative-control test
  Model:       sonnet
  Action:      In `class-form-rest-submission.php::handle_submit`, replace the
               `(bool) ( $form_config['requireLogin'] ?? false )` / non-array-branch
               `false` fallback with: if `$form_config` cannot be resolved to a valid
               array (cache miss, malformed value, anything short of a real config read),
               `wp_send_json_error` a 503 with a clear message and return — never fall
               through to a guessed `requireLogin` value of either `true` or `false`.
               Add a PHPUnit case that (a) asserts a resolved config with
               `requireLogin:true` still gates correctly (no regression), and (b) asserts
               a missing/unresolvable config returns 503, never a 200.
  Files:       plugins/sgs-blocks/includes/forms/class-form-rest-submission.php,
               plugins/sgs-blocks/tests/php/FormRestSubmissionTest.php (new or extended)
  Inputs:      Spec 42 §7/FR-42-0 (this session's decided fix-shape)
  Outcome:     `handle_submit` refuses on unresolved config; existing resolved-config
               behaviour (both `true` and `false` legitimately configured) is unchanged
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        5 min
  Tooling:     none beyond Read/Edit — this is a single-function, single-file fix
  On-Fail:     git diff the one file, revert via `git checkout -- <file>` if the fix
               breaks the existing resolved-config PHPUnit suite
  Cold-Entry:  Read `class-form-rest-submission.php::handle_submit` in full (it's short —
               under 300 lines per this project's PHP file-length rule) before editing;
               read Spec 42 §7 for the exact decided wording ("refuse outright... HTTP 503")
  Test:
    Happy:       A form with `requireLogin:true`, config resolved from cache → anonymous
                 POST returns 401/403 as before (unchanged)
    Edge:        Config lookup returns null/malformed (simulate: clear the transient
                 before POSTing) → anonymous POST returns 503, not 200
    Fail:        A logged-in user POSTs while config is unresolved → still 503 (refusing
                 is intentionally blind to auth state when config itself is the failure —
                 this is correct per FR-42-0's "refuse outright, don't guess either way")
    Integration: Live REST POST against the sandybrown canary (not just PHPUnit) — see
                 QA gate below

QA Gate — Fail-closed behaviour verified live, not just in PHPUnit
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    step 1 complete
  Check:   Deploy via `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
           --blocks-only`, then on a real login-gated `sgs/form` instance: (1) clear its
           config transient via `wp transient delete <key>` over SSH, (2) `curl -X POST`
           the form's REST submit endpoint anonymously, (3) confirm HTTP 503 in the
           response, not 200; (4) re-warm the cache by loading the page once, POST again
           as a logged-in session, confirm normal gated behaviour is unchanged.
  Pass:    Step (3) returns 503 with the refusal message; step (4) behaves exactly as
           before this fix (no regression to legitimate logged-in submission)
  Fail:    Revert the deploy (`build-deploy.py`'s own `.bak` rollback), re-check the PHP
           logic against Spec 42 §7's exact wording, re-fix, redeploy
  Marker:  QA

---

## Roadmap — Phases 1 through 5 (scoped, not detailed — each gets its own `/phase-planner`
## run when work reaches it; produced in full here would exceed what's useful to plan this
## far ahead of execution, per this project's own low-time-estimate + no-speculative-build
## discipline)

**Phase 1 — `sgs_form` CPT, no mandatory rebuild. Full 8-step execution plan written:**
`plans/2026-09-15-phase-1-sgs-form-cpt.md` — ready to execute. Spec 42 FR-42-1/2/3 (capability
`edit_sgs_forms`, no `custom-fields`, 10-revision cap — all already decided, zero
ambiguity to plan around), FR-42-4/5 (`LinkControl` picker), FR-42-7a (trashed-form
degrade, two audiences), FR-42-8 (cache-independent lookup — same code path as Phase 0's
fix). New forms are CPT-backed; existing forms keep working unchanged. No client-visible
change to anything already live.

**Phase 2 — `sgs/choice-flow`, plain-question step + recommendation terminal only.**
FR-43-1 (plain-question step type), FR-43-2/2a (branching + editor-time validation),
FR-43-3 (recommendation terminal), FR-43-8 (CPT, same decided values as Phase 1),
FR-43-9 (the block's own small IAPI store — decided, not a build-time fork), FR-43-11
(inserter disambiguation). **This is the first genuinely sellable feature in either spec** —
a complete qualification quiz, zero WooCommerce/pricing/modal dependency.

**Phase 3 — priced WC-variation steps + real purchase.** FR-43-1's priced step type,
FR-43-10/10a (binds to `sgs/buybox`'s existing `Product_Manifest`, not a new pricing
system), FR-43-5 (unmodified `/sgs/v1/cart/add-item` proxy reuse), FR-43-4's rate-limit
note. **Precondition, not a build task:** the target product's priced attributes (e.g.
lens thickness/finish) must already exist as real WooCommerce attribute terms with real
per-variation pricing — a catalogue-setup step in WooCommerce's own admin UI, done before
this phase's block work starts, not during it.

**Phase 4 — modal delivery + Mama's Munches acceptance criterion.** FR-43-6 (`sgs_modal`
delivery, `flowRef` + shared `LinkControl` picker), FR-43-7 (explicitly demoted to this
phase per the spec's own text — a UX preference, not a capability gap).

**Phase 5 — mandatory rebuild + deferred items.** FR-42-9 (rebuild, ONLY after Phase 1 has
run on the canary for a full session and the real instance count is known — run
`wp post list`/a DB query FIRST, per the spec's own decided sequencing), FR-42-7b
(delete-guard hook + Gutenberg #33234 race check — confirm the race doesn't apply to a
slug-keyed, contentless reference before building anything), FR-42-10/FR-43-14 (clone-
orchestrator CPT-creation gap — owner policy call, not an agent decision), FR-42-13
(analytics/A-B testing — the disclosed-unbuilt justification for "mandatory" reuse).

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** Whether to plan Phases 1–5 in full step-block detail now, alongside
  Phase 0, or scope this /phase-planner run to Phase 0 only with a roadmap for the rest.
  - **Options:** [A] Full 16-field step blocks for all 6 phases in one document. [B]
    Phase 0 fully detailed (it's the immediate, ≤5-min action); Phases 1–5 as a scoped
    roadmap, each planned in full via its own `/phase-planner` run when work reaches it.
  - **Recommendation:** [B]
  - **Why:** This project's own time-estimate rule says default low, not high, and its
    ADHD-collaboration rule 2 wants the smallest first action visible and actionable now
    — not five phases of detail for work that won't start for weeks and whose steps will
    likely need re-deriving anyway once Phase 0/1 are actually shipped and inform the
    next phase's real starting state. Phase 3 in particular has a hard precondition
    (real WC catalogue data) that doesn't exist yet — planning its steps in detail now
    would be planning against a fiction.
  - **Cost of wrong choice:** [A] wastes session time producing detail that will be stale
    by the time it's executed (phase-planner's own Stage 0 says to calibrate against past
    actuals — there are none yet for this exact work). [B]'s cost is a follow-up
    `/phase-planner` call per phase, which is cheap and expected by the skill's own design.
  - **Who decides:** architect (this session) — flagged here for Bean's visibility, not a
    blocking question.

### Pre-emptive decisions (would otherwise pause mid-execution)

- **Decision:** Phase 0's PHPUnit test file — new file or extend an existing one?
  - **Recommendation:** Extend an existing `forms/` test file if one already covers
    `class-form-rest-submission.php`; only create `FormRestSubmissionTest.php` if no
    such file exists. Check `plugins/sgs-blocks/tests/php/` before assuming a new file
    is needed.
  - **Why:** Avoids a duplicate/competing test file for the same class — this project's
    own PHP file-length and no-duplication conventions apply to tests too.
- **Decision:** Does the 503 refusal need its own translated user-facing string, or is a
  generic REST error sufficient for v1?
  - **Recommendation:** Generic is sufficient for Phase 0 — this bug fix's scope is
    "refuse instead of guess," not "design the full error-taxonomy" (that's a broader,
    explicitly-deferred gap the Support Realist persona flagged across both specs, not
    specific to this one function).
