---
doc_type: plan
project: small-giants-wp
title: Front D Wave 2 — header/footer/drawer CPT architecture build orchestration
last_updated: 2026-09-17
---

# Front D Wave 2 — build orchestration plan

Design is DONE (Spec 37 v1.2.0, FR-37-46 through FR-37-49; decisions.md D1091/D1092). This plan
is the execution order for building it. Full design context:
`.claude/reports/2026-09-17-header-footer-cpt-issue-register.md`, `.claude/LEDGER.md` Front D.

## Task 1 — Scope FR-37-49's W2-b (drawer post-picker)
**What:** decide what UI component picks a Menu Drawer post from `sgs/nav-bar-menu`'s
`drawerRef` attribute — nothing has been designed yet, only named.
**Why:** FR-37-49 cannot start without this; it's this wave's first blocker. Full context:
`.claude/parking.md` → `P-SPEC37-W2B-DRAWER-POST-PICKER`.
**Estimated time:** ~10 min if an existing pattern is reused; longer only if nothing reusable exists.

**Orchestration:**
- Execution: inline (main thread) — this is a short investigation, not a build.
- Model: n/a (inline).
- Brief: grep the codebase for how `sgs/modal`'s `modalRef` or `sgs/form`'s `formId` let an
  operator pick a target post today — if either already has a working "choose a post of this
  CPT type" control, that's the pattern to reuse for `drawerRef`. If neither does, a short
  `/brainstorming` pass decides the shape (Gutenberg core's own post-picker component vs. bespoke).
- Depends on: none.
- Parallel with: none (do this first — everything else in this wave can proceed either way, but
  this is cheapest to clear first).
- `/qc` gate after: no — this is a scoping decision, not code.
- **Acceptance:** a named, concrete UI shape for W2-b is written into FR-37-49 (Spec 37), replacing
  its current "no UI shape" flag.

## Task 2 — Verification spike for FR-37-46
**What:** confirm the actual WordPress mechanism this design leans on (whole-post-level
`template`/`template_lock` on a CPT) behaves the way FR-37-46 assumes, before building against it.
**Why:** a first `/adversarial-council` pass (D1092) found the design's only citation for this
(D393) proves a DIFFERENT, block-level WP code path, not the post-level one this design needs —
see `feedback_prior_art_citation_does_not_transfer_across_code_paths.md`. Building on an unverified
mechanism risks the same corruption class D393 already caused once.
**Estimated time:** ~15 min (grep the real WP core bundle + one empirical test on a throwaway post type).

**Orchestration:**
- Execution: inline or delegated to `wp-sgs-developer` — either is fine, this is investigation, not
  a shared-mechanism change.
- Model: sonnet via `/delegate` if delegated.
- Brief: register `template`/`template_lock` on a throwaway test CPT, confirm live in the editor
  that (a) a fresh post opens pre-populated and locked, (b) re-opening it after adding content
  doesn't silently re-apply the template and wipe it (the D393 failure mode, one level up). Cite
  the actual WP source function this behaviour comes from, per this project's own citation rule.
- Depends on: none.
- Parallel with: Task 1.
- `/qc` gate after: no — this is proof-gathering, feeds into Task 3's build.
- **Acceptance:** either the mechanism is confirmed safe (cite the real source + the empirical test
  result), or it isn't — in which case FR-37-46 needs a guard (e.g. gate template application on
  `post_status === 'auto-draft'`, matching D393's own `isEmpty`-latch fix) before Task 3 starts.

## Task 3 — Build FR-37-46 (template-lock the 3 CPTs)
**What:** `register_post_type()` gains `template` + `template_lock:'all'` on `sgs_header`/
`sgs_footer`/`sgs_drawer`.
**Why:** closes D1/D2/G/C's structural half — a new post is never empty, nothing can exist beside
or below the locked block.
**Estimated time:** ~20 min (small registration change + editor verification).

**Orchestration:**
- Execution: delegated.
- Model: sonnet via `/delegate`.
- Dispatch pattern: single-agent (`wp-sgs-developer`).
- Brief: implement exactly what FR-37-46 specifies (Spec 37 v1.2.0) using Task 2's verified
  mechanism. Do not build the REST-side validation filter — that's a named, accepted future
  hardening item, not part of this FR's Done-when.
- Context needed: Task 2's verification result; the fact this project banned reasoning from
  "preserve existing canary content" (pre-production, nothing to protect).
- Depends on: Task 2.
- Parallel with: none.
- `/qc` gate after: yes — `/qc-inline`, live Playwright check that a new post of each type opens
  locked and pre-populated.
- **Acceptance:** FR-37-46's Done-when, exactly as written in the spec.

## Task 4 — Build FR-37-48 (auto-seed one post per CPT)
**What:** `wp sgs header|footer|drawer seed-starter` runs once on plugin activation, guarded
against double-seeding.
**Why:** so the admin list table is never showing zero rows on a fresh install.
**Estimated time:** ~10 min — the CLI command already exists and is live-verified.

**Orchestration:**
- Execution: delegated.
- Model: haiku via `/delegate` (mechanical — wiring an existing command to a hook).
- Dispatch pattern: single-agent.
- Brief: implement exactly what FR-37-48 specifies. The seed command already exists — this is
  wiring, not new logic.
- Depends on: none (independent of Tasks 1-3).
- Parallel with: Task 3.
- `/qc` gate after: yes — `/qc-inline`.
- **Acceptance:** FR-37-48's Done-when, exactly as written.

## Task 5 — Build FR-37-47 (starter-preset control)
**What:** starter looks become a preset control on the now-locked block, extending the
already-built FR-37-28 "Layout preset" pattern.
**Why:** closes H — content never goes through WordPress's pattern-insertion path, so the
"Edit pattern" lock can't apply.
**Estimated time:** ~30 min (a new Inspector control + reusing an existing safe client-side call).

**Orchestration:**
- Execution: delegated.
- Model: sonnet via `/delegate`.
- Dispatch pattern: single-agent.
- Brief: implement exactly what FR-37-47 specifies (the REDESIGNED version — a preset control, not
  a bespoke write-action). Reuse `RowQuickInsertAppender`'s existing `replaceInnerBlocks()` call
  for looks that differ in content, and FR-37-28's existing derive-from-attributes pattern for
  looks that are purely stylistic.
- Depends on: Task 3 (needs the locked block to exist first).
- Parallel with: Task 4.
- `/qc` gate after: yes — `/qc-inline`, including the FR-37-26 proxy re-test named in FR-37-47's
  own Done-when.
- **Acceptance:** FR-37-47's Done-when, exactly as written.

## Task 6 — Build FR-37-49 (drawer post-picker + drop embedded drawer)
**What:** W2-b (the post-picker, now scoped by Task 1) and W2-d (dropping `sgs/nav-drawer` from
the 8 header/footer starter patterns), same wave, W2-b first.
**Why:** closes the last piece of D2 — completes a stage FR-37-43 left open since 2026-07-30.
**Estimated time:** ~30-40 min depending on Task 1's scoping outcome.

**Orchestration:**
- Execution: delegated.
- Model: sonnet via `/delegate`.
- Dispatch pattern: sequential (`/subagent-driven-development`) — W2-b implemented + reviewed
  before W2-d starts, per the sequencing ruling recorded against FR-37-43.
- Brief: implement exactly what FR-37-49 specifies, using Task 1's scoped UI shape for W2-b.
- Depends on: Task 1 (scoping), Task 3 (the locked block W2-d's patterns will target).
- Parallel with: none — this is the highest-risk item, run it last, not first.
- `/qc` gate after: yes — `/qc-inline` for W2-b, then a second pass for W2-d confirming the
  sibling-insert fallback (Spec 36 FR-36-9a clause 2) still protects any pre-existing
  sibling-embedded drawer.
- **Acceptance:** FR-37-49's Done-when, exactly as written.

## Dependency graph
```
Task 1 (scope W2-b, inline)  ------------------------\
                                                        \
Task 2 (verify WP mechanism) --> Task 3 (build FR-37-46) \
                                        |                  \
                        +---------------+---------------+   \
                        v                                v   \
              Task 4 (build FR-37-48)          Task 5 (build FR-37-47)
                        |                                |   /
                        +---------------+----------------+  /
                                        v                   /
                              Task 6 (build FR-37-49, W2-b then W2-d) <---/
                                        |
                                        v
                              Commit + merge to main
```
Task 6 depends on BOTH Task 1 (the W2-b scoping) and Task 3 (the locked block W2-d's patterns
target) — not Task 3 alone. Task 1 has no other dependent.

## Methodology guardrails (do not skip)
- **Deploy before measure** — any change that should be visible live needs `npm run build` + tar
  deploy + OPcache reset BEFORE any Playwright test against that URL.
- **Root cause before instance fix** — standing rule, applies to any new gap found mid-build.
- **Outcome vs completion** — a task isn't done when code ships; it's done when its own Done-when
  criteria are met and live-verified, per this session's own E/F/J/B/D3 standard (real clicks,
  real DOM reads, not self-reported).
- **/qc-council BEFORE every commit touching converter/pipeline/SGS-block logic** (standing rule).
- **Never reason from "preserve existing canary content"** — this project is pre-production
  (`feedback_never_reason_from_what_the_canary_currently_renders.md`).
- **A citation of a past fixed bug does not prove a claim about a differently-scoped mechanism
  sharing the same name** — verify each code path independently
  (`feedback_prior_art_citation_does_not_transfer_across_code_paths.md`, this session's own catch).
- **Continuous active direction throughout a session already is sign-off** — don't ask again at
  the end if Bean has been steering the decision (`feedback_continuous_engagement_is_sign_off.md`).
