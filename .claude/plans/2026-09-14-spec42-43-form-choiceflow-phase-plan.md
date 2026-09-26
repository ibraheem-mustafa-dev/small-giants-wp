---
plan_id: spec42-43-form-choiceflow
phase_name: "Phase 0 — fail-open requireLogin fix"
project: small-giants-wp
header: "sgs_form CPT + sgs/choice-flow — post-council implementation plan"
cost_estimate: "~5 min agent time, Phase 0 only"
docscore_grade: not-run (ad-hoc, in-flight — see phase-planner Stage 7 note on active plans)
---

**Status (2026-09-26):** Phases 0 to 4 SHIPPED; the UX and architecture follow-up runs in
`2026-09-26-choice-flow-ux-and-guided-buybox.md`; Phase 5 (FR-42-9, FR-42-7b) open.
- Phase 0: landed with Phase 1 (fc6c66444); proven live 2026-09-25 (an unresolvable formId gets 503, a real form 200).
- Phase 3: add-on price list (FR-43-17 to 20) as the Eye Care lens configurator; product-option steps reading any
  product attribute (FR-43-10/10a), purchase from the flow's own variation (FR-43-5), email-capture ending with a
  server-read rate limit (FR-43-4). Commits 63d1bf426, 0bb4fc61d, 812a4d93f, 137c8e3de, a8b00ef82.
- Phase 4: linked flows inline or in a popup (FR-43-6); Mama's Munches (FR-43-7) on sandybrown product 3990: full
  customisation in a popup (page 4012, flow 4008) and pack on the product page with the rest in a popup (product 3990
  links flow 4010 through `_sgs_choice_flow`; its buybox opens it, FR-43-25). Flow chrome built and applied to the
  Eye Care configurator.
- Proof: live QA 2026-09-26 at 1440 and 375 (journeys, cart rows, tampered variation 400, cross-page state,
  resume, editor round trip, email 200/429/400/403/404, Eye Care 268 path); evidence in c:\tmp\qa-choiceflow\.
- The v1.8.0 follow-up (Continue model, showcase, product link, guided buybox) is in
  `2026-09-26-choice-flow-ux-and-guided-buybox.md`. A flow that asks only some of its product's price-changing
  options now gets an editor warning (all in the flow or all on the page, D9).

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
- [x] `class-form-rest-submission.php::handle_submit` refuses the submission (HTTP 503)
      when its `requireLogin` config cannot be resolved, instead of defaulting to `false`
      (fc6c66444; `tests/php/FormSubmissionTest.php` FR-42-0 block, with a negative control)
- [x] A login-gated form with its config cache cold (or deliberately cleared) rejects an
      anonymous submission with a clear error, not a silent 200 (the guard runs before
      `requireLogin` is read; Phase 1 made the lookup cache-independent via `resolve_form()`)
- [x] A login-gated form with its config cache warm still accepts a genuine logged-in
      submission (no regression)
- [x] Deployed to sandybrown and verified live via a real POST, not just a unit assertion (2026-09-25:
      `formId` "qa-nonexistent-form" gets 503 `form_config_unavailable`; control form "focus-test-40" gets 200)

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

**Phase 1 — `sgs_form` CPT, no mandatory rebuild. SHIPPED (2026-09-15).** Full 8-step
execution plan: `plans/archive/2026-09-15-phase-1-sgs-form-cpt.md` — all 8 steps + 3 QA
gates done and deployed; archived after this session's completion audit. Spec 42 FR-42-1/2/3 (capability
`edit_sgs_forms`, no `custom-fields`, 10-revision cap — all already decided, zero
ambiguity to plan around), FR-42-4/5 (`LinkControl` picker), FR-42-7a (trashed-form
degrade, two audiences), FR-42-8 (cache-independent lookup — same code path as Phase 0's
fix). New forms are CPT-backed; existing forms keep working unchanged. No client-visible
change to anything already live.

**Phase 2 — `sgs/choice-flow`, plain-question step + recommendation terminal only. SHIPPED
(2026-09-15), exceeded scope with a Phase 2b visual pass.** Plan archived to
`plans/archive/2026-09-15-phase-2-sgs-choice-flow.md`.
FR-43-1 (plain-question step type), FR-43-2/2a (branching + editor-time validation),
FR-43-3 (recommendation terminal), FR-43-8 (CPT, same decided values as Phase 1),
FR-43-9 (the block's own small IAPI store — decided, not a build-time fork), FR-43-11
(inserter disambiguation). **This is the first genuinely sellable feature in either spec** —
a complete qualification quiz, zero WooCommerce/pricing/modal dependency.

**Phase 3 — priced steps + real purchase. SHIPPED (2026-09-26).** Built first as the add-on price list (Spec 43 v1.4.0 FR-43-17 to
FR-43-20) for the Eye Care lens configurator: the price list and its settings page, the cart/order integration
(`woocommerce_before_calculate_totals`, cart item data, order line meta), the proxy's optional `addons` argument,
priced add-on questions, the live price panel and the purchase terminal. The variation source (FR-43-10/10a,
`Product_Manifest`) follows for flows that resolve a product's own axes. **Precondition:** for the add-on source,
the price list filled in (seeded for Eye Care from the draft); for the variation source, real WooCommerce
variations.

**Phase 4 — modal delivery + Mama's Munches acceptance criterion. SHIPPED (2026-09-26).** FR-43-6 (2026-09-25): a
`sgs_choice_flow` post shown by a linked `sgs/choice-flow` (`flowId` + `flowIsLinked`, the Linked Form picker's
shape), inline or inside a fullscreen `sgs/modal`. FR-43-7 (2026-09-26): Mama's two journeys, see Status.

**Phase 5 — mandatory rebuild + deferred items.** FR-42-9 (rebuild, ONLY after Phase 1 has
run on the canary for a full session and the real instance count is known — run
`wp post list`/a DB query FIRST, per the spec's own decided sequencing), FR-42-7b
(delete-guard hook + Gutenberg #33234 race check — confirm the race doesn't apply to a
slug-keyed, contentless reference before building anything). Runs in a fresh session once
`2026-09-26-choice-flow-ux-and-guided-buybox.md` is closed. The cloning-pipeline gap
(FR-42-10/FR-43-14) and analytics (FR-42-13) are parked in
`2026-09-26-form-choiceflow-pipeline-and-analytics.md`.

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
