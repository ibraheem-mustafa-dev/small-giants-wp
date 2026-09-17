---
plan_id: spec43-phase-2-choice-flow
phase_name: "Phase 2 — sgs/choice-flow, plain-question step + recommendation terminal"
project: small-giants-wp
header: "sgs/choice-flow v1 slice — qualification-quiz block, zero pricing/modal/WooCommerce"
cost_estimate: "~1.5-2h agent time across 2 parallel waves + 2 QA gates"
docscore_grade: not-run (in-flight ad-hoc phase plan — docscore applies once archived)
---

# Phase 2 — `sgs/choice-flow`, plain-question step + recommendation terminal

**USP:** Ships the first genuinely sellable feature in Spec 43 — a complete branching
qualification quiz ("which service suits you") — touching zero WooCommerce, zero pricing,
zero `sgs_modal`, and zero of `sgs/form`'s existing engine. Phase 3 (pricing) and Phase 4
(modal delivery) both build on top of this without any retrofit.

**Plan label:** [PLAN: sonnet]

**Docscore:** not run — in-flight ad-hoc phase plan, no `plans/archive/` entry yet.

**Aggregate cost estimate:** ~1.5-2h across 2 waves (4 parallel steps + 3 sequential steps)
+ 2 QA gates. All steps sonnet-shaped (new architecture, not mechanical scaffolding) — this
project's own delegation table routes "Heavy WP build (blocks, migrations)" to sonnet/the
`wp-sgs-developer` agent, not haiku.

**Phase success criteria (done when):**
- [ ] `sgs_choice_flow` CPT registered with the SAME literal values as `sgs_form` (FR-43-8):
      capability `edit_sgs_forms`, no `custom-fields`, 10-revision cap, `resolve_choice_flow()`
      mirroring `resolve_form()`
- [ ] A `sgs/choice-flow` block can be placed on a page containing 2+ `sgs/form-step`
      children, each holding one `sgs/choice-flow-question` (FR-43-1, plain-question type only)
- [ ] Any answer option can target a different step via `nextStepMap` (FR-43-2); default
      (no map / unmatched answer) advances linearly
- [ ] Publish is BLOCKED with a named editor error when a `nextStepMap` entry targets a
      non-existent step ID, or when the routing graph has a cycle with no terminal exit
      (FR-43-2a) — proven live, both positive (blocks) and negative (a valid flow publishes
      clean) controls
- [ ] A flow can end in an `sgs/choice-flow-result` recommendation screen (FR-43-3), with a
      simple weighted-tag matching rule (FR-43-12 — kept deliberately simple, no formula engine)
- [ ] Step navigation, `nextStepMap` resolution, and session-persisted step index run on
      `sgs/choice-flow`'s OWN small Interactivity API store (FR-43-9) — no attempt to import
      or share `sgs/form/view.js`'s 878-line engine
- [ ] `sgs/form` and `sgs/choice-flow` carry distinct, plain-English inserter descriptions
      naming the actual behavioural difference (FR-43-11)
- [ ] Live on sandybrown: build a real 3-step branching quiz, walk it via chrome-devtools-mcp
      to 2 different recommendation results depending on answers given, confirm both paths

**Entry context (read before starting):**
- `.claude/specs/43-SGS-CHOICE-FLOW.md` §2-3, §5-7, §9 (Phase 2 line), §10 — governing spec,
  v1.2.0 (already read in full this session)
- `plugins/sgs-blocks/includes/class-sgs-block-cpts.php` — Phase 1's `sgs_form` CPT block
  (capability map, shared args, `resolve_form()`, `guard_form_slug_rename()`,
  `limit_form_revisions()`) — the exact pattern to mirror for `sgs_choice_flow`, per FR-43-8's
  "same literal values, not a parallel decision"
- `plugins/sgs-blocks/src/blocks/form-step/block.json::parent` — currently `["sgs/form"]`
  only; needs widening to also allow `sgs/choice-flow` (small additive change, confirmed this
  session by reading the file)
- `plugins/sgs-blocks/src/blocks/form/{block.json,edit.js,render.php,view.js}` — read for
  shape/convention only, NOT to copy the step-engine logic (FR-43-9 forbids that) — copy the
  file-layout and block-registration conventions, not the 878-line engine

**References:**
- `.claude/specs/43-SGS-CHOICE-FLOW.md` v1.2.0 — governing spec
- `.claude/specs/42-SGS-FORM-CPT-AND-PRICING.md` v2.1.0 — sibling CPT, same decided values
- `.claude/plans/2026-09-15-phase-1-sgs-form-cpt.md` — Phase 1's executed plan, the direct
  precedent for CPT registration + `resolve_*()` shape + deploy/QA sequencing
- `plugins/sgs-blocks/CLAUDE.md` — Block Customisation Standard, colour-control convention
  (`SgsColourPanel`, never a raw picker), no-inline-styling contract (Spec 32)

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | `/delegate` | every dispatched step |
| skill | `/qc-inline` | per-file check, wave 1 QA gate |
| skill | `/qc-council` | mandatory pre-commit multi-rater review — new SGS blocks (blub.db 255) |
| cli | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | final QA gate deploy |
| mcp | `chrome-devtools-mcp` | final QA gate — live branching walkthrough |
| cli | `wp post list` / `wp eval` | verification of CPT registration + resolve function |

---

## Architecture decision (made now, not deferred to build time — see KJC below)

Spec 43 leaves the exact block split as "decide at build time" (FR-43-1's own wording). To
keep this plan executable without a build-time pause, the split is:

- **`sgs/choice-flow`** — NEW top-level block. Root wrapper, own settings (title, terminal
  type — `recommendation` only in Phase 2), constrains InnerBlocks to `sgs/form-step`, owns
  the IAPI store (FR-43-9).
- **`sgs/form-step`** — REUSED, unchanged except one additive `block.json::parent` widening
  (add `sgs/choice-flow` alongside the existing `sgs/form`). Continues to be an inert marker
  div — zero JS engine attached (FR-43-9's explicit boundary).
- **`sgs/choice-flow-question`** — NEW. Question text + a repeater of answer options; each
  option carries a `nextStepMap` target (a step ID, or a sentinel for "go to terminal").
  Child of `sgs/form-step`, one per step for the plain-question type.
- **`sgs/choice-flow-result`** — NEW. The recommendation terminal: heading/body text,
  optionally driven by the simple weighted-tag match (FR-43-12). Also a child of
  `sgs/form-step` (a step whose content IS the terminal, matching the flow's own step-based
  navigation model rather than a separate non-step block type).

**What's explicitly NOT built this phase:** no `sgs_modal`/`flowRef` cross-page reference
(FR-43-6 is Phase 4) — a `sgs/choice-flow` instance in Phase 2 is authored directly on the
page it lives on, InnerBlocks-only, same as placing any other composite block. This mirrors
`sgs/form`'s own pre-CPT-link mode, de-risks Phase 4 (no retrofit needed — Phase 4 adds
linking on top, doesn't change this phase's shape), and matches the spec's own phasing table
listing FR-43-6 under Phase 4, not Phase 2.

---

## Wave 1 — 4 disjoint-file steps, dispatch in PARALLEL

Step 1 — `sgs_choice_flow` CPT registration
  Model:       sonnet
  Action:      In `class-sgs-block-cpts.php`, add `public const CHOICE_FLOW_CPT =
               'sgs_choice_flow';`, mirroring Phase 1's `FORM_CPT` block exactly: same
               `$form_capabilities`-shaped map to `edit_sgs_forms` (FR-43-8 — ONE capability
               governs both CPTs), same shared args (no `custom-fields`, `map_meta_cap =>
               true`), `register_post_type()` call, `add_submenu_page()` entry. Add
               `resolve_choice_flow(string $slug): ?WP_Post` mirroring `resolve_form()`
               exactly (`get_page_by_path($slug, OBJECT, self::CHOICE_FLOW_CPT)`). Add the
               10-revision cap to `limit_form_revisions()`'s existing post-type switch
               (extend, don't duplicate the function). Extend `register()`'s filter/hook
               wiring the same way Phase 1 did.
  Files:       plugins/sgs-blocks/includes/class-sgs-block-cpts.php
  Inputs:      Spec 43 FR-43-8; Phase 1's own `FORM_CPT` block in the same file (read first)
  Outcome:     `sgs_choice_flow` CPT live, `resolve_choice_flow()` callable, own admin
               submenu entry, capped at 10 revisions — zero duplication of Phase 1's helpers
  Exec:        PARALLEL with steps 2, 3, 4
  Deps:        none
  Marker:      SESSION-START
  Time:        15 min
  Tooling:     none beyond Read/Edit
  On-Fail:     git diff the one file; revert via `git checkout -- <file>` if it collides
               with the existing `FORM_CPT` block
  Cold-Entry:  Read `class-sgs-block-cpts.php`'s `FORM_CPT` block + `resolve_form()` +
               `limit_form_revisions()` in full before editing (Phase 1 already built and
               live-verified this exact pattern once)
  Test:
    Happy:       `wp post-type list --field=name | grep sgs_choice_flow` shows the CPT;
                 creating a post via `wp post create --post_type=sgs_choice_flow` succeeds
    Edge:        An 11th revision on a `sgs_choice_flow` post is pruned to 10, same as
                 `sgs_form` (reuses the same filter, so this is really a regression check
                 that extending the switch didn't break the existing `sgs_form` case)
    Fail:        A user without `edit_sgs_forms` cannot see the admin submenu entry
    Integration: `resolve_choice_flow('some-slug')` returns null for a non-existent slug,
                 a real `WP_Post` for a published one — verified via `wp eval`

Step 2 — `sgs/choice-flow` block scaffold (block.json + edit.js shell, no IAPI store yet)
  Model:       sonnet
  Action:      New block directory `plugins/sgs-blocks/src/blocks/choice-flow/`. `block.json`:
               `apiVersion:3`, category `sgs-forms`, `supports.sgs` per the Block
               Customisation Standard, InnerBlocks `allowedBlocks: ["sgs/form-step"]`,
               attrs for `terminalType` (enum, `recommendation` only valid value this phase)
               + `title`. `edit.js`: standard InnerBlocks template (2 starter steps), no
               step-engine logic — that's step 5's job. Distinct inserter description per
               FR-43-11 (e.g. "A step-by-step quiz that branches to different questions and
               ends in a result — not a single form.").
  Files:       plugins/sgs-blocks/src/blocks/choice-flow/{block.json,edit.js}
  Inputs:      Spec 43 §2/§5/§7; `sgs/form`'s own block.json for file-layout convention only
  Outcome:     Block registers, inserts, holds `sgs/form-step` children, shows the correct
               distinct description in the inserter
  Exec:        PARALLEL with steps 1, 3, 4
  Deps:        none
  Marker:      (none)
  Time:        20 min
  Tooling:     none
  On-Fail:     revert the new directory
  Test:
    Happy:       Block inserts, shows 2 starter steps, accepts more `sgs/form-step` children
    Edge:        Inserting a non-`sgs/form-step` child is rejected by `allowedBlocks`
    Fail:        n/a (pure scaffold)
    Integration: standalone until step 5/6 wire the engine + render.php

Step 3 — `sgs/choice-flow-question` block (plain-question step content)
  Model:       sonnet
  Action:      New block directory `plugins/sgs-blocks/src/blocks/choice-flow-question/`.
               `block.json`: `parent: ["sgs/form-step"]`, attrs = `question` (string),
               `options` (array of `{label, value, nextStepId}` — `nextStepId` empty/absent
               means "advance to next step in order", a sentinel value e.g. `"__terminal__"`
               means "jump straight to the result step"). `edit.js`: question text control +
               a repeater UI for options (label + a step-picker dropdown for `nextStepId`,
               populated from sibling step IDs within the same `sgs/choice-flow` — read via
               `useSelect`/`getBlocks()` on the parent, same technique used elsewhere in this
               codebase for sibling-block awareness). `render.php`: emits the question +
               options as data attributes the IAPI store (step 5) reads, no inline `style=`
               (Spec 32).
  Files:       plugins/sgs-blocks/src/blocks/choice-flow-question/{block.json,edit.js,render.php}
  Inputs:      Spec 43 FR-43-1 (plain question), FR-43-2 (`nextStepMap` shape)
  Outcome:     A step can hold one question + N options, each independently routable
  Exec:        PARALLEL with steps 1, 2, 4
  Deps:        none
  Marker:      (none)
  Time:        30 min
  Tooling:     none
  On-Fail:     revert the new directory
  Test:
    Happy:       A question with 3 options, one routed to step 3, others default-linear,
                 saves and re-opens with the routing intact
    Edge:        An option's `nextStepId` pointing at a step that gets deleted after the
                 fact is NOT silently cleared — it becomes step 7's dangling-reference case
    Fail:        Empty `options` array renders no options, no fatal
    Integration: standalone until step 6 (render.php wiring) + step 7 (validation)

Step 4 — `sgs/choice-flow-result` block (recommendation terminal)
  Model:       sonnet
  Action:      New block directory `plugins/sgs-blocks/src/blocks/choice-flow-result/`.
               `block.json`: `parent: ["sgs/form-step"]`, attrs = `heading`, `body`
               (RichText), `matchTags` (optional array — the simple weighted-tag match,
               FR-43-12, kept deliberately simple: if `matchTags` is set on multiple result
               blocks within one flow, the terminal shown is whichever result's tags overlap
               most with tags accumulated from the answered options along the taken path; if
               `matchTags` is empty/unset anywhere in the flow, there is exactly one result
               block and it always shows — the common case). `edit.js`: heading/body
               `RichText` + an optional tags `TextControl` (comma-separated, simple). No
               formula/expression engine (explicitly deferred, FR-43-12).
  Files:       plugins/sgs-blocks/src/blocks/choice-flow-result/{block.json,edit.js,render.php}
  Inputs:      Spec 43 FR-43-3, FR-43-12
  Outcome:     A step can be the flow's terminal, showing matched or single-result content
  Exec:        PARALLEL with steps 1, 2, 3
  Deps:        none
  Marker:      (none)
  Time:        20 min
  Tooling:     none
  On-Fail:     revert the new directory
  Test:
    Happy:       Single-result flow (no `matchTags` anywhere) always shows that result
    Edge:        Two result blocks with overlapping `matchTags` — the higher-overlap one
                 wins; an exact tie falls back to flow order (first-declared wins) —
                 document this tie-break in a one-line code comment, it's the only
                 non-obvious behaviour in an otherwise simple rule
    Fail:        No result block anywhere in the flow — step 7's validation should flag
                 this at publish time (a flow with no terminal is the same class of bug as
                 a dangling `nextStepMap`)
    Integration: standalone until step 6 (render.php wiring)

QA Gate 1 — Wave 1 registrations don't collide, all four blocks build clean
  Model:   haiku
  Exec:    SEQUENTIAL
  Deps:    steps 1-4 complete
  Check:   `cd plugins/sgs-blocks && npm run build 2>&1 | tail -40` exits 0; `wp post-type
           list --field=name | grep sgs_choice_flow`; `wp eval 'var_dump(class_exists("SGS\
           Blocks\Block_CPTs"));'` (or the actual namespaced class — confirm the exact name
           from step 1's diff) returns `bool(true)`; grep the build output for all 3 new
           block names (`sgs/choice-flow`, `sgs/choice-flow-question`,
           `sgs/choice-flow-result`) to confirm registration, no PHP fatal in the WP-CLI
           output.
  Pass:    Build exits 0, CPT is listed, all 3 new blocks appear registered, zero fatals
  Fail:    Read the specific error, fix the offending file only (do not touch the other
           3 agents' files), re-run this gate
  Marker:  QA

---

## Wave 2 — 3 sequential steps (each depends on wave 1's shapes being settled)

Step 5 — `sgs/choice-flow`'s own IAPI store (the step engine, FR-43-9)
  Model:       sonnet
  Action:      New `plugins/sgs-blocks/src/blocks/choice-flow/view.js`. Own, small
               Interactivity API store — NOT an import/extension of `sgs/form/view.js`.
               State: current step index/ID, a step history stack (needed so "back" works
               on a branched path, and so the result block can read accumulated `matchTags`
               from the actual path taken, not just a linear scan). Actions: `selectAnswer`
               (reads the clicked option's `nextStepId`, pushes history, updates current
               step, session-persists via the SAME `sessionStorage` key convention
               `sgs-form-step-${formId}` used by `sgs/form` — but scoped to this flow's own
               instance ID so the two block families never collide on the same page).
               Accept ~150-200 lines of logic that looks structurally similar to
               `sgs/form/view.js`'s step-visibility code — this duplication is the spec's own
               explicitly accepted v1 cost (FR-43-9), not a bug to "fix" by importing.
  Files:       plugins/sgs-blocks/src/blocks/choice-flow/view.js
  Inputs:      Wave 1 steps 2-4's final attribute shapes (question options, result matchTags)
  Outcome:     Clicking an answer option navigates to the correct next step (branched or
               linear default), history supports back-navigation, session persists across
               reload, the terminal step resolves and shows the correct result
  Exec:        SEQUENTIAL
  Deps:        steps 2, 3, 4 (needs their final attribute shapes, not just scaffolds)
  Marker:      (none)
  Time:        45 min
  Tooling:     none
  On-Fail:     git diff the one new file; the block still renders statically (server-side)
               even with a broken store — degrade gracefully, don't let a JS error blank
               the page
  Cold-Entry:  n/a (mid-stream step)
  Test:
    Happy:       3-step linear flow with no branching behaves identically to a plain wizard
    Edge:        A branch mid-flow, then a "back" press — lands on the actual previous step
                 taken (from history stack), not a naive index-1 fallback
    Fail:        `sessionStorage` unavailable (private browsing) — falls back to in-memory
                 state for that page load, no fatal, no console error loop
    Integration: Two `sgs/choice-flow` instances on the same page (if ever placed) don't
                 collide in `sessionStorage` — instance-scoped key confirmed

Step 6 — `sgs/choice-flow`'s render.php (parent wiring)
  Model:       sonnet
  Action:      `plugins/sgs-blocks/src/blocks/choice-flow/render.php`. Server-render:
               `get_block_wrapper_attributes()` + `do_blocks()`/native InnerBlocks render of
               the `sgs/form-step` children (same mechanism `sgs/form` already uses for its
               steps — read that file for the exact call shape, do not re-derive). No CPT
               resolution logic needed in Phase 2 per this plan's architecture decision
               (unlinked-only this phase) — keep the function simple; do NOT pre-build a
               `resolve_choice_flow()` call site here that has nothing to link to yet
               (YAGNI — Phase 4 adds it when `flowRef` exists).
  Files:       plugins/sgs-blocks/src/blocks/choice-flow/render.php
  Inputs:      `sgs/form/render.php` (read for the InnerBlocks-render convention only)
  Outcome:     Server output matches editor preview; the IAPI store's expected data
               attributes are present on the rendered markup
  Exec:        SEQUENTIAL
  Deps:        step 5 (needs the store's expected data-attribute contract settled)
  Marker:      (none)
  Time:        15 min
  Tooling:     none
  On-Fail:     revert the one file
  Test:
    Happy:       Frontend render matches editor preview exactly for a 3-step flow
    Edge:        A flow with zero steps renders an empty wrapper, no fatal
    Fail:        n/a
    Integration: Works inside a normal WP page template, no template-part dependency

Step 7 — Editor-time publish validation (FR-43-2a)
  Model:       sonnet
  Action:      In `sgs/choice-flow`'s `edit.js` (or a `useEntityBlockEditor` /
               `editor.PostTypeSupportCheck`-style publish hook — confirm the correct WP
               hook via `/wp-block-development` if the exact API is unclear before writing
               this), add a pre-publish check: walk every `sgs/choice-flow-question`
               descendant's `options[].nextStepId` values against the live set of step IDs
               in the same flow. Block publish (a named, visible editor notice — not a
               silent console warning) if: (a) any `nextStepId` doesn't resolve to a real
               step in this flow, or (b) the routing graph has a cycle with no reachable
               `sgs/choice-flow-result` step. A valid flow (all targets resolve, at least
               one reachable terminal) publishes clean with no warning.
  Files:       plugins/sgs-blocks/src/blocks/choice-flow/edit.js
  Inputs:      Spec 43 FR-43-2a (exact requirement wording — re-read before writing this
               step, it is the one MUST-FIX in this phase's scope)
  Outcome:     A client cannot publish a broken flow and get a silently-stranded site
               visitor; a correct flow publishes with zero friction
  Exec:        SEQUENTIAL
  Deps:        step 3 (needs the final `options[].nextStepId` attribute shape), step 4
               (needs to detect an `sgs/choice-flow-result` step for the terminal-reachability
               check)
  Marker:      HANDOFF
  Time:        30 min
  Tooling:     `/wp-block-development` if the exact publish-hook API needs confirming
  On-Fail:     revert the one file; the flow still functions at runtime even without this
               guard (steps 5/6 don't depend on it) — this is an editor-only safety net,
               never load-bearing for rendering
  Test:
    Happy:       A flow where every `nextStepId` resolves and a result step is reachable
                 publishes with no warning
    Edge:        A 2-cycle (`step A → step B → step A`, no path to any result step) blocks
                 publish with a named error mentioning the cycle
    Fail:        A dangling `nextStepId` (points at a step ID that was since deleted) blocks
                 publish with a named error naming the broken option
    Integration: Positive AND negative control both proven live in the same session — a
                 valid flow that publishes, and a broken one that visibly can't, side by side

---

## QA Gate 2 — Full live verification + mandatory pre-commit review

  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    steps 1-7 + QA Gate 1 complete
  Check:   (1) `/qc-council` on the full diff — mandatory per this project's own rule for any
           new SGS block (blub.db 255), not optional for this phase. (2) Deploy via
           `build-deploy.py --target sandybrown --blocks-only`. (3) Via chrome-devtools-mcp,
           build a real 3-step branching quiz on the canary (question 1 branches to either
           question 2a or 2b depending on the answer; both paths lead to a distinct
           `sgs/choice-flow-result`). (4) Walk BOTH paths live, confirm each reaches its own
           correct result. (5) Attempt to publish a deliberately broken flow (dangling
           `nextStepId`) in the SAME session, confirm the editor blocks it with a named error
           — the negative control, not just the happy path. (6) Confirm the inserter shows
           `sgs/choice-flow` and `sgs/form` with visibly distinct descriptions (FR-43-11).
  Pass:    All 6 checks pass; `/qc-council` returns no unresolved MUST-FIX findings
  Fail:    Do not deploy/commit past a `/qc-council` MUST-FIX. For a live-walkthrough
           failure, `build-deploy.py`'s own `.bak` rollback, fix the specific step, redeploy
  Marker:  QA

---

## Documentation updates (fold into the same session, not a separate step)

- `.claude/decisions.md` — new D-number recording Phase 2 shipped + the architecture
  decision made in this plan (block split, unlinked-only-this-phase choice) — re-verify the
  D-ceiling immediately before writing (`grep -oE '^## D[0-9]+' .claude/decisions.md | ...`),
  do not trust the 1080 figure checked at plan-write time.
- `.claude/LEDGER.md` — replace (not append) the Spec 42/43 status block to show Phase 1
  AND Phase 2 shipped, Phase 3's precondition (real WC attribute/variation catalogue data)
  still unmet, Phase 4/5 still open.
- `.claude/specs/43-SGS-CHOICE-FLOW.md` — no spec content change expected (this phase
  builds exactly what v1.2.0 already specifies); if the build surfaces a genuine spec gap,
  amend the spec directly rather than silently diverging in code.
- No `parking.md` entry expected — everything explicitly deferred by this phase (FR-43-6/7
  to Phase 4, pricing to Phase 3) is already captured in the spec's own phasing table, not
  new residual scope this session created.

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** Build the 4-block split (`sgs/choice-flow` +
  `sgs/choice-flow-question`/`-result`, reusing `sgs/form-step`) now, vs. deferring the exact
  split to build time as the spec's own text allows.
  - **Options:** [A] Decide now, write it into this plan's steps (what this plan does). [B]
    Leave FR-43-1's "decide at build time" open, let the first dispatched agent choose.
  - **Recommendation:** [A]
  - **Why:** An undecided architecture can't be split into disjoint parallel-dispatchable
    files — wave 1's 4-way parallelism is only possible because the file boundaries are
    fixed here, not left for 4 agents to independently improvise (which would likely produce
    4 different guesses at the same boundary and a merge conflict, not 4 disjoint files).
  - **Cost of wrong choice:** If this split proves wrong once real usage arrives, it costs a
    rename/refactor pass later — cheap, this project is pre-production (per the root
    CLAUDE.md's own "never weigh blast radius against a pre-production canary" rule).
  - **Who decides:** architect (this session) — flagged for Bean's visibility.

- **Decision:** Ship `sgs_choice_flow` CPT in Phase 2 (per FR-43-8's explicit Phase 2 listing)
  but keep the BLOCK itself unlinked/standalone this phase — no `flowRef`/LinkControl
  cross-referencing until Phase 4.
  - **Options:** [A] CPT + unlinked-only block this phase (what this plan does). [B] Build
    the full linked/unlinked dual-mode now (mirroring `sgs/form`'s `formIsLinked` pattern),
    pulling Phase 4's FR-43-6 forward.
  - **Recommendation:** [A]
  - **Why:** The spec's own phasing table lists FR-43-6 under Phase 4, not Phase 2 — pulling
    it forward is scope creep against an explicitly phased spec. The CPT still gets built now
    (satisfying FR-43-8 exactly as written) so Phase 4 adds linking on top without touching
    this phase's files again.
  - **Cost of wrong choice:** If Phase 4 turns out to need the dual-mode 4 weeks from now
    anyway, the cost is redoing `edit.js`'s picker UI once — the same shape Phase 1 already
    built once for `sgs/form`, so it's a known, fast pattern to repeat, not a novel build.
  - **Who decides:** architect (this session) — flagged for Bean's visibility.

### Pre-emptive decisions (would otherwise pause mid-execution)

- **Decision:** Does `sgs/choice-flow-result` need its own dedicated block, or could the
  terminal just be a specially-flagged `sgs/choice-flow-question` with zero options?
  - **Recommendation:** Dedicated block (what this plan does) — a question and a result
    screen have genuinely different attribute shapes (options+routing vs. heading+body+tags)
    and conflating them into one block with a "no options = terminal" implicit rule is
    exactly the kind of silent-magic behaviour this project's own root-cause discipline
    warns against ("not declared != does nothing" — MEMORY.md). An explicit block name is
    self-documenting in the inserter and the block list.
- **Decision:** Where does the weighted-tag match (FR-43-12) actually run — client-side in
  the IAPI store, or server-side in render.php?
  - **Recommendation:** Client-side, in the step-5 IAPI store. The whole flow (including
    which result is reached) is already a client-side navigation state machine; computing
    the match server-side would require either a full page reload per step (breaks the
    "one-decision-per-screen" UX this whole spec is built around) or a REST round-trip with
    no security requirement to justify one (unlike Phase 3's pricing, nothing here is a
    server-authoritative value — a recommendation result is content, not money).
- **Decision:** Should QA Gate 1's build check be haiku (mechanical) or sonnet?
  - **Recommendation:** Haiku — it's a scoped assertion (build exits 0, grep for expected
    strings), not architectural judgement. Matches this project's own convention of routing
    per-file mechanical checks to the cheap tier and reserving sonnet for the live-browser
    QA Gate 2, which needs judgement to interpret a failed walkthrough.

---

## Offer

Wave 1's 4 steps are genuinely disjoint (confirmed: 4 separate new directories + one
existing file none of the other 3 touch) — ready to dispatch in parallel now via
`/dispatching-parallel-agents`, or run inline sequentially if preferred. Wave 2 is
inherently sequential (each step depends on the previous step's settled shape).
