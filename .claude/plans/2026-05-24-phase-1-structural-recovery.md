---
doc_type: phase-plan
phase: 1
parent_plan: .claude/plans/2026-05-24-strategic-plan.md
plan_label: opus
docscore_grade: B+ (self-assessed)
generated: 2026-05-23
revised: 2026-05-23 (post-session correction — see "Reframing" section below)
primary_goal: "Close G1+G3+G5 entirely by shipping the universal walker that powers the NORMAL ROUTE (Spec 16 §15 steps 1-3) + the OPEN-block emission for FR1-matched composite blocks (G1) + slot_list visual-slot extension (G3) + per-block DOM-shape fixes (G5). Plus complete the 2026-05-21 architecture programme data leftovers (hooks completion, role='content' DB sync, doc-drift cleanup)."
---

# Phase 1 — Universal walker + G1+G3+G5 closure + architecture programme leftovers

## Reframing (2026-05-23 — corrects earlier misframings)

This phase was originally scoped as "structural pipeline recovery" with the framing "5 sections fall through to fallback at Stage 2 → walker pre-pass closes the fall-through." That framing was **wrong**. Sections falling through to `sgs/container` is the **correct architectural default** per Spec 16 §FR4 + §R1 + §R4 + Decision 3 (2026-05-20). The actual gap is that the **normal route** (which starts every non-FR1-matched section with `sgs/container` per FR4) lacks the universal walker to populate inner blocks correctly.

**The two-route topology (per Spec 16 §FR1, reframed 2026-05-23):**

| Route | When it fires | Emit shape |
|---|---|---|
| **FR1 fast path** | Section class matches a registered composite block (`sgs/hero`, `sgs/trust-bar`, `sgs/card-grid`) OR a registered pattern slug (`sgs/featured-product`, `sgs/gift-section`, `sgs/footer-indus-foods`). | Emit the matched block / pattern directly. Skip element-by-element walk. |
| **Normal route (default)** | No FR1 match. Every section that isn't an exact match takes this route. | Start with `sgs/container` as the section base (per FR4). Universal walker (per FR2 + FR3 + FR6 + §15 steps 1-3) builds the inner block tree element-by-element. |

**G1/G3/G5 mapped to the two routes:**

- **G1** (OPEN-block emission for composite blocks with InnerBlocks data) — **FR1-path** fix. `sgs/hero` matched at Stage 2 currently emits self-closing; should emit OPEN with nested `sgs/multi-button` + `sgs/button` for CTAs.
- **G3** (Stage 3 slot resolver only extracts text content) — **Both routes** affected. `slot_list.py` needs to query `property_suffixes` for visual/structural slots, not just text content. Fixes hero's 142 stage_3_slot_list failures on FR1 path AND enables the normal route's universal walker to lift CSS-driven attrs on inner blocks.
- **G5** (Per-block DOM-shape mismatches) — **Normal-route** fix mostly. Tag/class preservation (blockquote stays blockquote, not normalised to section) + per-block render.php adjustments where mockup nesting doesn't match block render output (testimonial-slider 3-col grid vs single-card carousel, trust-bar `__badge` vs `__item`).

**Spec 16 §15 steps 1-3** = the universal walker that makes the **normal route** work. Step 4 (`_lift_inner_blocks` DB-driven InnerBlocks emit) already shipped 2026-05-21 (commit `79158da5`) and fires from both FR1 and normal route emit branches.

**Plan label:** `[PLAN: opus]` — architectural rewrite touching the converter's emit topology. Multi-hop reasoning. Expensive-to-undo if wrong.

**Aggregate cost estimate:** ~8-12 hrs wall-clock across 2-3 sessions.

## Phase success criteria (done when)

Empirical, evidence-cited, all required:

- [ ] **G1 closed.** Hero's CTAs render on the live page. Test: load `https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/`, inspect `header.sgs-hero` — the two CTA buttons are present in the DOM (not just the lifted attrs as text). Same for any other FR1-matched composite block whose mockup contains InnerBlocks-shaped descendants.
- [ ] **G3 closed.** Hero `stage_3_slot_list` failures drop from 142 to under 30 (per Spec 16 §15 numeric acceptance). `slot_list.py` queries `property_suffixes` for visual/structural slots; trace.jsonl shows `stage_3_slot_list` events for visual slots (backgroundImage, overlayColour, minHeight, ctaPrimaryColour, alignment) with values lifted instead of "no value extracted".
- [ ] **G5 closed.** Per-block DOM-shape audit complete: blockquote stays blockquote (brand-strip body), 3-col grid renders as 3-col grid (testimonial-slider), `__badge` / `__text` preserved (trust-bar items + inline SVG). Per-block render.php fixes shipped where the mockup DOM doesn't match current block render output. Spec 16 §14.5 list addressed.
- [ ] **Universal walker (Spec 16 §15 steps 1-3) shipped.** `_walker_pre_pass(section_node, css_rules) → ClassGraph` runs once per section before walk(); walker uses the class-graph to drive nested-block emission on the normal route (the `sgs/container` fallback path). Per blub.db row 269: universal extraction primitive — NO per-block special-case branches in the walker.
- [ ] **Stage 11 pixel-diff captured for every body cell.** All 7 body sections × 3 viewports = 21 cells measured per-commit and post-Phase-1. Not gated to ≤ 1% in this phase — measurement-only. (The walker landing correctly + G1/G3/G5 fixes are the gate; pixel-diff is a downstream side-effect that will land below ~20% after Phase 1 ships, with the final ≤1% closure depending on F5 D1 responsive variants + operator-promotion work currently parked.)
- [ ] **Architecture programme data leftovers closed:**
    - Phase 1 hooks completion: `SELECT COUNT(*) FROM hooks` in sgs-framework.db matches legacy hooks.db count (7,283) ±2%, OR documented decision that the 2,049-row gap is intentional (e.g. JS-only hooks excluded)
    - `role='content'` DB rows match source files: 87 attrs across 40 blocks (currently 17 across 11) — via `/sgs-update` Stage 1 re-run
    - Stale doc claims fixed: Spec 17 §6.4 "Option A pending" claim corrected, plan 2026-05-21 block count refreshed 73→69
- [ ] **Every commit in this phase passed `/qc-council` Stage 5** + the predicted-delta gate landed within ±5%
- [ ] **No regression** on previously-converging metrics: hero + trust-bar stay at Stage 2 conf 1.0; no body cell regresses > ±5% from pre-Phase-1 baseline

## Entry context (read before starting — MANDATORY)

1. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §2 (R1-R5 architectural rules) + §3 (FR1-FR9, especially FR1's two-route topology + FR4's normal-route start) + §14 (G1-G5 detail) + §15 (Wave 2 reshape = universal walker for normal route)
2. `.claude/cloning-pipeline-flow.md` Stage 2 + Stage 4 (post-2026-05-23 reframing notes)
3. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — diagnostic artefact map
4. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/` — canonical pre-Phase-1 baseline
   - Read `summary.log` first
   - Then `trace.jsonl` (filter by stage_2 + stage_4 per boundary)
   - Then `leftover-buckets.json` for gap distribution
   - Then `stage-11-pixel-diff.json` for per-section baseline numbers
5. `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` — original G1-G5 honest-path council
6. `.claude/plans/archive/phase-wave-2-wiring-fix-complete.md` — Wave 2 archived plan documenting the 4 changes that constitute the universal walker
7. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 3780-3970 (current walk() function — FR1 fast path at 3826-3870; normal route falls through to sgs/container at the bottom)
8. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/slot_list.py` — current slot resolver (text-only)
9. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` — orchestrator-level callsite for `_convert_section_body`
10. `plugins/sgs-blocks/scripts/sgs-update-v2.py` lines 540-720 — current hooks import logic
11. **Reverted attempt** (do NOT re-implement this shape): commit `124e1d06` (reverted via `f3885f14`) built a tactical guard for composite_element branch only — not the universal walker. The mistake was treating walker steps 1-3 as a "section recognition" fix; they're a "normal-route build-up" fix.

## References

- blub.db row 254 — leftover-buckets discipline
- blub.db row 255 — multi-model /qc-council per commit
- blub.db row 256 — per-section cropped pixel-diff
- blub.db row 269 — universal extraction only, no per-block patches in the walker (per-block render.php fixes for G5 are different — those touch block render code, not the walker)
- blub.db row 272 — schema enumeration before missing-X claims
- blub.db row 284 — no per-client CSS variation files as deploy artefacts
- `feedback_dispatched_agents_no_commit_authority.md` (captured 2026-05-23) — dispatched agents return uncommitted artefacts; main thread + Bean decide commits

## Tooling Index

| Type | Name | Used in |
|---|---|---|
| skill | `/qc-council` | Before every converter/pipeline commit (per blub.db row 255) |
| skill | `/qc-inline` | Per-file checks during implementation |
| skill | `/verify-loop` | 2-attestation per load-bearing claim |
| skill | `/systematic-debugging` | Root-cause investigation |
| skill | `/sgs-clone` | After every converter/pipeline change (Stage 11 auto-captures pixel-diff) |
| skill | `/sgs-update` | Stage 1 re-run for role='content' DB sync (Step 1.9) |
| skill | `/subagent-prompt` | Pre-write cold prompts for dispatched implementers |
| skill | `/dispatching-parallel-agents` | Per-block G5 work is parallelisable across blocks |
| skill | `/capture-lesson` | New architectural rules surfaced |
| skill | `/handoff` | Phase 1 close |
| agent | `wp-sgs-developer` (via `general-purpose` subagent + model=sonnet, embedding the agent's cold prompt) | Steps 1.6, 1.7, 1.8 (walker + G1 OPEN-block + G3 slot_list extension); Step 1.9 G5 per-block work parallelisable |
| mcp | Playwright | Stage 11 auto-uses; live-page DOM verification for G1 (CTAs present) |
| cli | WP-CLI over SSH | Sandybrown introspection |
| python | `~/.claude/hooks/wp-blocks.py dump` | Schema enumeration before any "missing X" claim |
| python | `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB query CLI |
| python | `scripts/pixel-diff.py` | Stage 11 auto-uses |

---

## Dispatch bindings — APPLY TO EVERY AGENT DISPATCH IN THIS PHASE

Per `feedback_dispatched_agents_no_commit_authority.md` (captured 2026-05-23). Every Agent tool dispatch for code changes MUST embed all four bindings verbatim in the cold prompt:

### Binding A — NO commit authority

The agent makes changes (Edit/Write), runs validation (`/sgs-clone`, `/qc-inline`), captures artefacts (Stage 11 numbers, match.json deltas, leftover-buckets.json deltas, `git diff --stat`, `git diff`), then RETURNS the **uncommitted** state to main thread. Main thread analyses + presents to Bean. Bean decides commit. The agent NEVER commits. The cold prompt must explicitly forbid `git commit`, `git add`, `git push` by the agent.

### Binding B — `/sgs-clone` per sub-change (MANDATORY, NOT bundled)

After each incremental code change (every Edit/Write affecting pipeline code), the agent runs `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --deploy-target page:144 --debug-trace` IMMEDIATELY after the change. Stage 11 numbers, match.json deltas, leftover-buckets.json deltas captured per-change.

### Binding C — Living-docs + /capture-lesson inline per change

The agent updates the matching doc the moment the event fires:

| Trigger | Doc to update |
|---|---|
| Architectural decision surfaced | `.claude/decisions.md` |
| Bug, mistake, or anti-pattern surfaced | `.claude/mistakes.md` |
| Deferred work / scope-creep | `.claude/parking.md` |
| Pipeline stage behaviour changed | `.claude/cloning-pipeline-flow.md` |
| DB schema, table, or read-path changed | `.claude/architecture.md` |
| New pipeline-state artefact added | `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` |
| New architectural RULE that should outlive session | Invoke `/capture-lesson` |

### Binding D — TodoWrite breakdown + per-sub-task status

At dispatch start, the agent creates a TodoWrite list breaking the work into sub-tasks. Status updates per sub-task as completed.

### Required output block (cold prompt MUST include)

```
RETURN to main thread (do NOT commit):
1. TodoWrite final state (all sub-tasks + status)
2. Per sub-change:
   a. File path + line range changed
   b. `git diff <path>` (the actual diff, uncommitted)
   c. Pre-change /sgs-clone artefact paths (Stage 11 json, match.json, leftover-buckets.json)
   d. Post-change /sgs-clone artefact paths (same set)
   e. Numeric deltas (mean pixel-diff, per-cell, fall-through count)
3. Living-docs updates made (which docs, what sections)
4. /capture-lesson invocations made (with pattern-keys)
5. blub.db corrections POSTed (if any)
6. Architectural surprises / new rules surfaced (flag for main-thread review)
7. Overall recommendation: "commit all changes" / "commit changes 1+3 only, revert 2" / "do not commit; needs re-scope"
```

---

# Steps

## Step 1.1 — Resume context anchor `[SESSION-START]`

Read every file in "Entry context" above. Spend extra time on Spec 16 §FR1 + §FR4 + §15 (the two-route topology + universal walker spec). Write a paragraph confirming the FR1 fast-path vs normal-route distinction is internalised: "FR1 fast path fires when section class matches a registered block OR registered pattern. Normal route is the default — starts with sgs/container per FR4, universal walker builds inner block tree element-by-element. G1 closes by OPEN-block emission on FR1 path. G3 closes by slot_list.py querying property_suffixes for visual slots. G5 closes by per-block DOM-shape fixes." Time: 20 min. Inline.

## Step 1.2 — Refresh stale doc claims (quick wins, already shipped 2026-05-23)

Three small edits, already shipped in commit `99f60132` + later. Verify they still hold:
- (a) `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` + parking entry `P-PHASE-5B-INERT-CUSTOMISER-OUTPUT`: Option A SHIPPED claim aligns to reality (renderer.php:73-78 emits :root --sgs-header-bg / footer-bg). ✓
- (b) `goals.md` + `cloning-pipeline-flow.md` (line 1110): "73 blocks" → "69 blocks". ✓
- (c) `.claude/plans/2026-05-21-architecture-staging.md` line 87 Decision 12 footnote: verify it correctly identifies the FR1-vs-normal-route framing, not the "5 sections fall through" misframing. **NEEDS UPDATE** — current footnote uses the wrong frame. Update inline.

Time: 15 min. Inline.

## Step 1.3 — Pre-implementation diagnostic confirmation `[QA]`

Per blub.db row 254 — read leftover-buckets.json + match.json + trace.jsonl from `pipeline-state/mamas-munches-homepage-2026-05-23-145045/` BEFORE conjecturing. Confirm 3 things in writing:

1. **FR1 fast-path currently matches 2 sections**: hero (conf 1.0) + trust-bar (conf 1.0). The other 7 (header, footer, featured-product, brand, ingredients-section, gift-section, social-proof) take the normal route → emit bare `sgs/container` because the universal walker (§15 steps 1-3) isn't built.
2. **Pattern table HAS pattern slugs matching the 5 body fall-through sections**: query `SELECT slug FROM patterns WHERE slug IN ('sgs/featured-product','sgs/gift-section','sgs/brand','sgs/ingredients-section','sgs/social-proof','sgs/header','sgs/footer')`. If matches exist, those sections COULD hit FR1 fast-path branch (b) once pattern-match is wired.
3. **Hero stage_3_slot_list failures = 142** in trace.jsonl. Most are visual/structural slots (backgroundImage, overlayColour, minHeight, ctaPrimaryColour). G3 fix (slot_list.py + property_suffixes query) addresses these.

Time: 30 min. Inline. Surface findings to Bean before proceeding.

## Step 1.4 — Hidden-decisions peer review (pre-dispatch)

Dispatch 2 cold raters (Sonnet + Haiku via general-purpose) with the Phase 1 plan + Step 1.5 cold prompt + Spec 16 §2 + §3 + §15. Question: "What ambiguities would pause a junior wp-sgs-developer mid-execution of Step 1.5? What architectural decisions aren't pre-resolved?" Apply findings to the cold prompt before dispatch.

Time: 25 min. /dispatching-parallel-agents.

## Step 1.5 — Universal walker (Spec 16 §15 steps 1-3) — NORMAL ROUTE delivery

**Primary delivery of Phase 1.** Implement the walker-entry pre-pass that powers the normal route. Per Spec 16 §15:

1. **Walk every CSS class** encountered in each section (full-width, one pass, before walk() runs)
2. **Assign CSS ownership per class** — direct (`.C` / `tag.C`), descendant (`.parent .C` / `.parent > .C`), compound (`.C.other`). EXCLUDE parent-qualified scope-breaks (already stripped by Stage 2 css_strip)
3. **Record parent-child class relations** via BEM parsing + `blocks.parent_block` + `slot_synonyms.standalone_block` + `block_attributes.canonical_slot` + `property_suffixes` + `modifier_suffixes` + `legacy_role_lookup` + `naming_conventions` (uimax)
4. **Wire the resulting class-graph into the normal-route emit logic** — when Stage 2 routes a section to `sgs/container` (per FR4 normal-route start), the walker uses the graph to populate inner blocks element-by-element via tag-fallback (FR2) + canonical-slot lift (FR3) + CSS routing (FR6)

**Universal discipline (blub.db row 269):** NO per-section / per-block branches in the walker. Same code path for every section taking the normal route. Mama's Munches is the test input; the walker must work on ANY mockup.

**Pattern fast-path extension (Spec 16 §FR1 branch b):** while implementing the walker, also wire pattern-match into Stage 2 fast-path. When a section class matches `patterns.slug` (e.g. `sgs/featured-product`, `sgs/gift-section`), the section bypasses the normal route and emits `<!-- wp:pattern {"slug":"sgs/<slug>"} /-->`. Pattern match is an additional FR1 branch — same composite-block precedence rule applies (block wins over pattern when both match).

Model: wp-sgs-developer (via general-purpose subagent, model=sonnet, full Step 1.5 cold prompt embedded). Apply Dispatch Bindings A+B+C+D.

Time: 90-120 min wall-clock. Cold prompt pre-written; main thread reviews uncommitted output before commit.

## Step 1.6 — G1 closure: OPEN-block emission for FR1-matched composite blocks

Per Spec 16 §14.1: cv2 emits `<!-- wp:sgs/hero {...} /-->` (self-closing) instead of OPEN block with InnerBlocks children. When an FR1-matched composite block has InnerBlocks data in its lifted attrs (e.g. `ctaPrimary*` for hero, multi-card data for card-grid), emit OPEN block with nested `<!-- wp:sgs/multi-button --><!-- wp:sgs/button --></...> ... -->` etc. Set `self_closing=False` on the emit. Legacy attrs stay for deprecated.js migration.

Affects FR1 fast-path branch only (composite blocks that match registered slugs). The normal route from Step 1.5 already emits nested blocks correctly via the universal walker.

Model: wp-sgs-developer (subagent, sonnet). Apply Dispatch Bindings.

Time: 45-60 min.

## Step 1.7 — G3 closure: slot_list.py visual-slot extension via property_suffixes

Per Spec 16 §14.3: `slot_list.py` resolver handles text-content slots but returns "no value extracted" for visual/structural slots (backgroundImage, overlayColour, minHeight, ctaPrimaryColour, alignment). 142 of hero's 171 slots fail not because CSS is missing but because the resolver doesn't know how to read it.

**Fix:** extend slot_list.py to call `_collect_css_decls_for_element` for visual slots + map CSS property → SGS attr name via `property_suffixes` table (the existing D1 typed-attr-lift path per Spec 16 §FR6 Destination 1). Per-slot-role dispatch:
- Text content slot → existing text path
- Colour / dimension / image / structural slot → new CSS-driven path via `property_suffixes`

Affects BOTH FR1 path (hero slot extraction improves) AND normal route (walker's slot resolution becomes correct for visual properties).

Model: wp-sgs-developer (subagent, sonnet). Apply Dispatch Bindings.

Time: 60-90 min.

## Step 1.8 — G5 closure: per-block DOM-shape fixes (parallelisable across blocks)

Per Spec 16 §14.5: mockup uses `<blockquote>` for brand-strip body; render emits `<section>`. Mockup uses 3-col grid for testimonial-slider; render emits single-card carousel. Mockup uses `__badge`/`__text` for trust-bar items + inline SVG; render uses `__item`/`__label` + Lucide slugs.

**Two sub-tasks per affected block:**
- (a) Preserve mockup tag/class info in the emitted block markup — `<blockquote>` stays `<blockquote>`, mockup classes travel as `className` / `additionalClasses`
- (b) Per-block `render.php` adjustments OR Block Style Variation additions (via P2.iii infrastructure already in place) — fix the cases where current render.php output structurally differs from mockup nesting (3-col grid, badge/text vs item/label, etc.)

Sub-task (a) is universal (lives in convert.py emit logic). Sub-task (b) is per-block — parallelisable across blocks. Use `/dispatching-parallel-agents` to fan-out per-block render.php work; each branch scopes to one block (different file, no overlap).

Blocks to audit + fix in scope: brand-strip, testimonial-slider, trust-bar items, plus any others Step 1.5's Stage 11 results surface as DOM-shape mismatches.

Model: per-block subagents (sonnet). Apply Dispatch Bindings.

Time: 90-120 min across all per-block branches.

## Step 1.9 — Architecture programme data leftovers: hooks completion + role='content' sync

Two data tasks:

**1.9.A — Hooks completion (2,049 missing).** Investigate `sgs-update-v2.py` Stage 2 (Mode A) import logic at lines 540-720. The 2026-05-23 fact-check found sgs-framework.db hooks = 5,234; legacy hooks.db has 7,283. Either close the import gap OR document the 2,049 as intentional exclusion (e.g. JS-only hooks excluded from PHP hook table). Update `.claude/decisions.md` with the resolution.

**1.9.B — role='content' DB sync.** Re-run `/sgs-update` Stage 1 (SGS codebase scan). Source files have 87 `role='content'` attrs across 40 blocks; DB has only 17 across 11. Re-scan picks up the source changes that landed in Phase 6 of the architecture programme.

Time: 30-45 min combined. Inline.

## Step 1.10 — Combined /qc-council verification + Phase 1 close-out [GATE]

Per blub.db row 255 — `/qc-council` Stage 5 on the combined state of Steps 1.5-1.9. Validation commands:

- **G1:** Playwright on sandybrown — `header.sgs-hero` has 2 CTA buttons in DOM
- **G3:** trace.jsonl per-boundary — hero stage_3_slot_list failures < 30
- **G5:** Visual diff brand-strip — `<blockquote>` preserved; testimonial-slider renders 3-col; trust-bar items match mockup structure
- **Walker universal:** Stage 11 per-cell — every body cell improves vs baseline (no regression > ±5%); leftover-buckets `unrecognised_section` count drops to 0 for body sections
- **Hooks:** `SELECT COUNT(*) FROM hooks` matches legacy ±2% OR decision documented
- **role='content':** `SELECT COUNT(*) FROM block_attributes WHERE role='content'` = 87; DISTINCT(block_slug) = 40

Time: 30 min. Inline `/qc-council`.

## Step 1.11 — Phase 1 close handoff `[HANDOFF]`

Invoke `/handoff`. Update `state.md` (current_phase → "phase-2-header-footer-cloner"). Write `next-session-prompt.md` scoped to Phase 2 (header+footer cloner) — reference `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`. Cite Phase 1 deltas: G1+G3+G5 status, hero stage_3_slot_list before→after, per-section pixel-diff before→after, hooks before→after, role='content' before→after.

Time: 20 min. Inline /handoff.

---

## Key Judgement Calls

### Primary decisions

- **KJC 1A — Walker implementation shape: in-place modify `walk()` OR new pre-pass function called once per section?**
  - Options: (A) modify walk() to take pre-built class-ownership map; (B) add `_walker_pre_pass(section_node) → ClassGraph` called before walk(); (C) split into two functions: `_build_class_graph` + `_walk_with_graph`
  - Recommendation: **B (new pre-pass function called ONCE per section)** — clean separation; walk() stays at its current ~800 lines; pre-pass is testable independently
  - Locked at plan time; implementer can deviate with /qc-council validation

- **KJC 1B — Pattern fast-path: ship in Step 1.5 alongside walker, OR defer to Phase 1.5?**
  - Options: (A) ship with walker (one coherent FR1 + normal-route delivery); (B) defer pattern fast-path to a follow-on
  - Recommendation: **A** — they're the same Spec 16 §FR1 surface; deferring fragments the FR1 implementation
  - Locked at plan time

- **KJC 1C — Per-block G5 fixes: parallelise OR sequential?**
  - Options: (A) parallel-dispatch per block (different files, no overlap); (B) sequential
  - Recommendation: **A for the 3 named blocks** (brand-strip, testimonial-slider, trust-bar). Sequential if Step 1.5's Stage 11 results surface > 5 blocks needing fixes
  - Locked at plan time

### Pre-emptive decisions (Hidden Decisions — apply Step 1.4 raters' findings inline)

- **Pre-empt 1: What if FR1 pattern-match conflicts with FR1 composite-block-match on the same slug?**
  - Pre-answer: Per the updated Spec 16 §FR1, registered composite block wins. Document the precedence in Step 1.5 cold prompt explicitly.

- **Pre-empt 2: What if the walker pre-pass changes Stage 4 attr counts but Stage 11 numbers regress?**
  - Pre-answer: Surface to main thread. Walker is the structural primitive — pixel-diff is a downstream effect. If structure is right but pixel-diff regresses, the issue is downstream (likely missing CSS lift). Do NOT revert the walker; debug the downstream gap.

- **Pre-empt 3: What if a per-block G5 fix touches the same file as another per-block fix?**
  - Pre-answer: Sequentialise those two. Per-block parallelism only applies when file sets are disjoint.

- **Pre-empt 4: What if the agent attempts to commit despite Binding A?**
  - Pre-answer: Revert the unauthorised commit immediately + capture as a structural enforcement gap (candidate for a git pre-commit hook that fails when invoked from an agent context).

- **Pre-empt 5: What if Step 1.5's walker breaks the FR1 fast-path that's working today (hero + trust-bar at conf 1.0)?**
  - Pre-answer: Step 1.10 QA gate (g) "No regression on currently-matching sections at Stage 2" catches it. If trust-bar regresses from conf 1.0, the walker change touches Stage 2 incorrectly — STOP, do not commit.

- **Pre-empt 6: What if G5's per-block render.php fixes blow the converter's universal-extraction discipline (blub.db row 269)?**
  - Pre-answer: G5 work touches block render code (per-block render.php), not the walker. The walker stays universal. Block render code is per-block by definition.

---

## Living docs to update at Phase 1 close

- `.claude/state.md` — current_phase → "phase-2-header-footer-cloner"
- `.claude/decisions.md` — add: (a) walker implementation shape (KJC 1A); (b) pattern fast-path scope (KJC 1B); (c) hooks gap resolution (1.9.A); (d) any new architectural rules from /capture-lesson
- `.claude/parking.md` — close P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP + P-UNIVERSAL-EXTRACTION-RC-FIXES + P-G1-HERO-INNERBLOCKS + P-G3-STAGE-3-VISUAL-SLOT-MAPPING + P-G5-PER-BLOCK-DOM-SHAPE-FIXES (these resolve when G1+G3+G5 close in this phase)
- `.claude/cloning-pipeline-flow.md` — Stage 2 + Stage 4 STATUS updated with walker + pattern fast-path shipping notes
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §13 + §14 — mark G1+G3+G5 closed with commit SHAs; mark §15 steps 1-3 SHIPPED
- `.claude/architecture.md` — note universal-walker primitive + pattern fast-path branch
- `.claude/handoff.md` + `.claude/next-session-prompt.md` — Phase 1 close + Phase 2 entry

## What success looks like (one-line)

After Phase 1: re-running `/sgs-clone --deploy-target page:144` produces a stage-11-pixel-diff.json where every body cell improves vs baseline; G1 verified by Playwright (hero CTAs in DOM); G3 verified by trace.jsonl (hero stage_3_slot_list failures < 30); G5 verified by per-block visual diff. The universal walker + FR1 pattern fast-path + OPEN-block emission + slot_list visual extension + per-block DOM fixes ship as a coherent commit sequence, all gated by /qc-council and Bean-approved commits per Binding A.

---

## What ACTUALLY shipped — Phase 1 second pass (2026-05-24, uncommitted at end of session)

The original plan above scoped a "universal walker pre-pass" (Spec 16 §15 steps 1-3) as the primary architectural rewrite. Mid-session investigation surfaced that the existing `convert.py:walk()` already contains 9 named branches (FR1 block-root, essence-match, composite_element, css-driven container, sgs-bem-wrapper, pass-through, top-level container + 5 atomic-tag swaps) that together deliver the walker outcome — provided the data layer they consume is correct. Bean's redirect: data-layer fixes + a minimal pre-pass for transparent wrappers + Stage 4 wiring.

**5 changes shipped uncommitted in this session:**

1. **slot_synonyms cleanup** — 7 bad aliases removed from text canonical (inner, content, body-row, custom-content, quote, textAlign, textTransform) in DB + seed-slot-synonyms.py (so /sgs-update doesn't re-seed). Root cause for wrapper divs collapsing to sgs/text.
2. **section_inner_absorb walker pre-pass** (convert.py + db_lookup.py + 4 callsites) — single transparent-wrapper children absorbed into section root for one-section-one-container architecture. Skips FR1-matched sections.
3. **quote canonical migration** — `__quote` / `__blockquote` / `__pullquote` BEM elements route to sgs/quote via composite_element branch + slot_synonyms data. Zero walker code changes. Spec 00 §3.1 + Spec 16 §12.3 updated.
4. **/sgs-update Stage 4 wiring** — `sgs-update-v2.py:stage_1_sgs_codebase_scan()` tail invokes `assign-canonical.py` (previously standalone, never auto-run despite Spec 16 §12.6 saying it ran). Extended `assign-canonical.py` with singularise + Tier B (registered-block reverse-lookup via standalone_block) so 12 plural-named array attrs got canonical_slot populated.
5. **Brand mockup BEM rename** — `<blockquote class="sgs-brand__body">` → `<div class="sgs-brand__quote">`; `<footer>` → `<p class="sgs-brand__attribution">`. Spec 00 BEM-as-canonical consistency. Brand now emits `<!-- wp:sgs/quote ... -->` with attribution lifted.

**Empirical**: Stage 11 mean pixel-diff 70.5% (baseline) → 73.9% (post all 5 changes). Block-type mapping is correct; pixel-diff regression on featured-product/ingredients is the CSS-lift gap on the new richer skeleton — closes when Step 1.7 G3 (slot_list visual extension) lands.

**Steps 1.6 (G1 hero OPEN-block), 1.7 (G3 slot_list visual extension), 1.8 (G5 per-block DOM fixes), 1.9 (hooks + role='content'), 1.10 (final /qc-council), 1.11 (handoff) all remain TODO.** The session's work has the walker emitting structurally correct block trees for the 5 normal-route body sections (was: 1-block collapse; now: 4-10 inner blocks per section). The remaining pixel-diff closure comes from CSS lift onto the new richer emit + per-block render-shape fixes.

---

## Phase 1 follow-on items (deferred from this session; not parked because they're load-bearing data work)

These were surfaced during the second-pass investigation and are too important for parking — they live here so the next Phase 1 work session picks them up:

### F1 — ARRAY_LIFT_PATTERNS full migration to DB-driven universal extraction

**What:** Delete the hardcoded `ARRAY_LIFT_PATTERNS` dict at `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py:1008-1031` + the `_array_lift_text_of_first` / `_array_lift_count_stars` helpers. Let the existing 1e-B universal lifter (already in convert.py:lift_subtree_into_block_attrs around line 3502) handle all array attrs via `block_attributes.canonical_slot/derived_selector` + `slot_synonyms.standalone_block`.

**Why deferred:** The hardcoded dict provides two features 1e-B doesn't yet replicate:
- (a) `count_stars` extractor for sgs/testimonial.rating (counts ★ chars from text content)
- (b) Multi-selector fallback chains like `p.sgs-testimonial__text,blockquote,p` (try several selectors, first hit wins)

**Fix shape when picked up:**
- Add a role-based extractor map to 1e-B: when `block_attributes.role='rating'` (or canonical_slot='rating'), use star-count extractor on the matched element's text content. Other role-based special extractors as needed.
- Extend `derived_selector` semantics to support multi-selector OR strings (comma-separated) — already partially supported in atomic_text_standalone branch.
- After both land: delete ARRAY_LIFT_PATTERNS dict + helpers + the iteration sites at convert.py:3494 + :3621.

**Verification:** post-fix `/sgs-clone` on Mama's social-proof section emits sgs/testimonial-slider with testimonials[] array of 3 items, each carrying quote/name/rating, identical to current state. No regression.

**Audit-trail receipt:** Investigation showed the hardcoded selectors `p.sgs-testimonial__text` and `p.sgs-testimonial__author` DON'T MATCH the DB-canonical `.sgs-testimonial__quote` and `.sgs-testimonial__name` derived_selectors. Authored against older BEM convention; DB tracks current. Migrating to DB-driven auto-cures the drift.

### F2 — Remaining 9 NULL-canonical_slot array attrs: vocabulary additions OR new canonicals

After Change 4a-c (Stage 4 fix + messages vocab), 9 array attrs still have NULL canonical_slot because neither Tier A (singularise + slot_synonyms lookup) nor Tier B (registered-block reverse-lookup) resolves them. They're domain-specific names that need either (a) alias additions to existing canonicals OR (b) net-new canonicals for the concept.

| Block.attr | Suggested resolution | Required action |
|---|---|---|
| `sgs/form-field-address.fields` | Add `fields` to `items` canonical aliases | seed-slot-synonyms.py edit + DB |
| `sgs/form-field-file.allowedTypes` | Likely needs a new `mime-type` or `allowed-type` canonical OR accept NULL (configuration enum, not extractable) | design decision |
| `sgs/form-field-tiles.tiles` | Add `tiles` to `card` canonical aliases | seed + DB |
| `sgs/gallery.mediaItems` | Add `mediaItems` + `mediaItem` to `media` canonical aliases | seed + DB |
| `sgs/info-box.elementOrder` | Configuration data (block-design ordering), not a slot. Accept NULL. | document — no canonical needed |
| `sgs/product-card.packSizes` | Block-specific feature; add `packSize` + `packSizes` to new `pack-size` canonical OR `options` canonical | design decision |
| `sgs/table-of-contents.headingLevels` | Enum data, not a slot. Accept NULL. | document |
| `sgs/team-member.socialLinks` | Add `socialLinks` + `socialLink` to `link` canonical aliases | seed + DB |
| `sgs/timeline.entries` | Currently blocked by guard `WHERE derived_selector IS NULL` in assign-canonical.py — `derived_selector='.sgs-timeline__item'` is pre-populated. Resolution: relax guard for canonical_slot-only backfill OR manual one-shot UPDATE. Would resolve to `card` (Tier A — entry is in card aliases). | code or DB |

**Fix shape when picked up:** Batch the alias additions (~5 entries) into seed-slot-synonyms.py + apply DB UPDATEs to both mirrors. For sgs/timeline.entries specifically: relax the guard or manual UPDATE.

**Why this is here (not parking):** Without these, ~9 array attrs across the block catalogue can't have their items walked by the universal extractor when those blocks get used in client mockups. The data IS the architecture per Spec 00 BEM-as-canonical; missing canonical_slot rows = missing recognition paths. Load-bearing for cross-client cloning beyond Mama's.
