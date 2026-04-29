# Audit — Folder 2: `docs/plans/` (excluding archive)
**Date:** 2026-04-29
**Auditor:** Claude Code (Opus 4.7)
**Reference plan:** 5-phase optimisation-toolkit rebuild + Steps 3+4 of the SGS-WP 5-step master plan (spec at `~/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md`)

---

## Document Index

| # | File | Lines | What it is |
|---|------|-------|-----------|
| 1 | `2026-02-21-framework-completion-plan.md` | 570 | Live framework-completion roadmap (6-phase, self-updated 2026-04-28) |
| 2 | `2026-04-18-plan-docs-status.md` | 70 | Meta-audit of docs/plans/ done 2026-04-18 — recommended archival of 7 files |
| 3 | `2026-04-21-non-essential-pipelines-deferred.md` | 124 | Identifies pipelines deferrable from critical path (P8/P10/P11/P13) |
| 4 | `2026-04-21-step2-strategic-plan.md` | 319 | Step 2 of the 5-step master plan — 5-client queue + framework completion + Track A/B parallelisation |
| 5 | `2026-04-21-toolset-spec-from-sgs-studio-session.md` | 422 | Master tool inventory (180 slugs) + 13-pipeline catalogue + tier hierarchy + per-skill eval references |
| 6 | `2026-04-24-design-brain-architecture.md` | 596 | Phase 4 spec — Designer/Blueprint/Council restructure of `/ui-ux-pro-max` and toolbox consolidation |

---

## Classification Buckets

### A — "Already in our plan"

| Doc | How it fits |
|-----|-------------|
| `2026-02-21-framework-completion-plan.md` | The doc's "Phase 4 (Indus Foods completion)" + "Phase 3.2 Global Defaults System" + "Phase 5.1 Conditional Visibility" map directly to the current plan's Phase 5 ("Track A framework + Track B 5 priority clients"). The doc has been self-updated with status as of 2026-04-28 — Phases 0-3 mostly DONE, Phase 4 NOT STARTED, Phase 5 PARTIAL. The "What's NEXT" section (lines 56-62) is the active framework-completion track. |
| `2026-04-21-non-essential-pipelines-deferred.md` | Designates P8, P10, P11, P13 as deferrable from the small-giants-wp critical path. The current plan's Phase 4 ("pipeline rebuild as ONE unit") implicitly inherits this deferral — design-brain goes first, P10 (scroll-animation) is parked. The deps tables here are still load-bearing for any future Phase 4 sequencing decisions. |
| `2026-04-21-step2-strategic-plan.md` | This IS Step 2 of the 5-step master plan. The current plan ("optimisation-toolkit + tooling-rebuild") is **Steps 3+4** of THIS plan, per the spec's reference to Section 5 of the optimisation-toolkit-design doc. Section 1 (5-client queue), Section 2 (theme base completion), Section 3 (new framework features — Ecommerce, 3D, Variant, /quoter rebuild, Dark mode), and Section 4 (Track A/B sequencing) are all foundational inputs to Phase 5. |
| `2026-04-21-toolset-spec-from-sgs-studio-session.md` | Verified tool inventory (180 slugs across 5 domains), 13-pipeline catalogue (Section 4), tier hierarchy (Section 2), and Change/Improve/Add/Subtract recommendations (Section 7). The current plan's Phase 1b (lifecycle skill updates), Phase 2 (rubric universe), Phase 4 (pipeline rebuild) all draw from this master spec. Several specific items map cleanly: "/uimax INGEST" (Section 7 ADD #6) is now blocked on Phase 4; "merge /frontend-design → /innovative-design" (Section 7 CHANGE #1) is captured in design-brain doc Section 3.5.1. |
| `2026-04-24-design-brain-architecture.md` | This IS the Phase 4 spec. The current plan's "design-brain rebuild goes FIRST — Blueprint schema + Designer + Council must be production-ready first" is the headline implementation target from this doc. The 7 design-brain rubrics shipped 2026-04-27/28 (colourise, bolder, quieter, normalize, polish, distill, delight) all carry frontmatter `phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode <X>)` — which matches Section 3.5.1 line-for-line ("DELETE colourise, bolder, quieter, normalize, polish, distill, delight" → `uimax modify --mode <X>`). The 5-phase implementation in Section 7 is the Phase 4 work plan. |

---

### B — "Done"

| Doc | What got done | Evidence |
|-----|---------------|---------|
| `2026-04-18-plan-docs-status.md` | The audit it performed has been actioned. 7 files recommended for archive are now in `docs/plans/archive/`: `2026-02-12-phase-1b-foundation.md`, `2026-02-13-content-blocks-batch-2.md`, `2026-02-13-sgs-forms.md`, `2026-02-14-accordion-deploy-review-schema-toc.md`, `2026-02-21-post-grid-block.md`, `2026-02-26-phase2-blocks-complete.md`, `2026-02-27-hero-fixes.md` — all 7 confirmed by `ls archive/`. `framework-completion-plan.md` was kept as live roadmap (and self-updated 2026-04-28) per the doc's recommendation. The status doc has fulfilled its purpose. |
| `2026-02-21-framework-completion-plan.md` (Phases 0-3) | **Phase 0** all 9 bug fixes — confirmed by self-update + `render-helpers.php` exists. **Phase 1** Tasks 1.1-1.4 — confirmed live. **Phase 2** all 6 blocks — confirmed by `2026-02-26-phase2-blocks-complete.md` (now archived). **Phase 3** Tasks 3.1, 3.3, 3.4 — confirmed (per the doc's own STATUS UPDATE 2026-04-28). |
| `2026-04-21-toolset-spec-from-sgs-studio-session.md` (subsets) | 22 of the rubrics it proposed (and many of its CHANGE/IMPROVE items) are now done — see 2026-04-28 handoff: "22 end-goal rubrics shipped". Specific items confirmed elsewhere this session: stats subcommand bleed fix (related to /sgs-extraction toolset hardening), animation-harvest dispatch contracts (R4/R5/R8 covered earlier today). |

---

### C — "Contradicts"

**None.** All 6 docs are mutually consistent and consistent with the current 5-phase optimisation-toolkit plan. The 4 strategy docs (step2, toolset-spec, deferred-pipelines, design-brain) form one coherent stack despite originating in different sessions:

- step2-strategic-plan defines the 5-client queue and Track A/B parallelisation
- toolset-spec defines the verified tool inventory + 13 pipelines
- deferred-pipelines designates which pipelines are non-critical
- design-brain defines the Phase 4 architecture for `/ui-ux-pro-max`

The current plan's Phases 4 + 5 are the synthesis of all four.

---

### D — "Outdated"

**None.** Even the oldest active doc (framework-completion-plan, originally 2026-02-21) was self-updated on 2026-04-28 with current status. The status-meta-audit doc (2026-04-18) is "Done" rather than "Outdated" because its recommendations were actioned.

---

## Cross-Document Patterns

### 1. Four-doc strategy stack form one coherent body

The four strategy docs from 2026-04-21 to 2026-04-24 are not redundant; they're complementary layers of the same plan:

```
step2-strategic-plan (2026-04-21)
   ├── 5-client queue + Track A/B
   │
toolset-spec (2026-04-21)
   ├── 180-slug inventory + 13-pipeline catalogue
   │
deferred-pipelines (2026-04-21)
   ├── critical-path vs deferrable
   │
design-brain (2026-04-24)
   └── Phase 4 architecture (designer/blueprint/council)
   ↓
optimisation-toolkit-design.md (2026-04-27/28)
   └── Phases 1-5 of execution = Steps 3+4 of master plan
```

Future sessions need to treat them as one stack, not 4 separate docs. Recommendation: add a one-line header to each cross-linking the others (or a master index).

### 2. The "5-step master plan" frame is implicit, not documented

step2-strategic-plan §0 names "the 5-step master plan (mapping → strategic plan → toolset gap analysis → per-tool gap analysis → execute)" but no doc captures Step 1 (mapping). The current plan's Phase 5 is Step 5 (execute), but Step 1 is unwritten. This is a navigation gap, not a contradiction.

Recommendation: either retroactively document Step 1 in a one-page reference, OR drop the "5-step" framing and rely on the optimisation-toolkit plan's own Phase 1-5 numbering as the canonical sequence.

### 3. design-brain doc's Phase 1-5 vs optimisation-toolkit's Phase 1-5 — different numbering, same era

design-brain has its own "Implementation Phases" 1-5 (cleanup/superdesign/DB+CLI/skill+hook/self-improvement). The optimisation-toolkit plan also has Phases 1-5. These are NOT the same numbering — they're two different but compatible plans.

design-brain's Phase 1-5 is the per-skill work to ship the design-brain itself.
optimisation-toolkit's Phase 4 ("design-brain rebuild") is the slot where design-brain's full Phase 1-5 plays out.

This is fine but confusing. Recommendation: when referring to design-brain phases, prefix with "design-brain Phase X" to disambiguate from the outer optimisation-toolkit phases.

### 4. Pipeline 7 (`/build-website`) is the most cross-referenced asset

It appears in:
- toolset-spec Section 6 (full 4-reviewer panel reconciliation, 7-item remediation priority, 18-cell matrix coverage)
- step2-strategic-plan §1.5 (SGS Studio rebuild uses framework, dark-mode toggle blocker)
- framework-completion-plan (uses blocks across phases)
- design-brain Section 5 Pipeline 7 reshape (adds Stage 1.5 Designer + Stage 8 ingest)

All four are consistent. Pipeline 7 is the productised flagship; it surfaces in every strategy doc. Phase 4 (design-brain) and Phase 5 (Track A framework polish) both touch it.

### 5. Hot-lead pressure surfaced in strategy stack but not in framework-completion-plan

step2-strategic-plan §1 lists the 5 priority clients with kick-off gates. The 2026-04-28 handoff names "Hot-lead pressure" as a known concern: CMX (proposal needed), Snooza/Ophir (live engagement), Indus Phase 2 (blocked on /quoter rebuild). framework-completion-plan focuses on the framework polish track, not the client track.

This is intentional separation (framework = Track A, clients = Track B) but it means a future session resuming framework-completion-plan won't see the client pressure unless they also read step2-strategic-plan and the handoff. Recommendation: add a one-line cross-link in framework-completion-plan to step2-strategic-plan's §1 client queue.

---

## Recommended Actions

### Archive (1 item)

| File | Reason |
|------|--------|
| `2026-04-18-plan-docs-status.md` | Its recommendations were actioned (7 files archived). The doc is now historical record of the cleanup pass. Move to `docs/plans/archive/` as `2026-04-18-plan-docs-status.md`. |

### Keep + add cross-links (5 items)

| File | Action |
|------|--------|
| `2026-02-21-framework-completion-plan.md` | Add a "Related plans" header pointing to step2-strategic-plan §1 (client queue) and the optimisation-toolkit-design spec. Otherwise leave as-is — the 2026-04-28 self-update is current. |
| `2026-04-21-non-essential-pipelines-deferred.md` | Add a "Related plans" header pointing to toolset-spec Section 4 (the 13 pipelines) and design-brain (Phase 4). |
| `2026-04-21-step2-strategic-plan.md` | Add a "Related plans" header pointing to toolset-spec, deferred-pipelines, design-brain, and the optimisation-toolkit-design spec. This doc is the entry point — it should anchor the stack. |
| `2026-04-21-toolset-spec-from-sgs-studio-session.md` | Add a "Related plans" header pointing to step2-strategic-plan, deferred-pipelines, design-brain. Add a status update line referencing the 22 rubrics shipped 2026-04-27/28 so readers know which CHANGE/IMPROVE items are done. |
| `2026-04-24-design-brain-architecture.md` | Add a "Related plans" header. Add a status header noting that this is the active Phase 4 spec of the current optimisation-toolkit plan. |

### No deletions, no replacements

All 5 strategy docs are load-bearing for the current plan. None contradict each other. None are outdated.

### Optional follow-up — index doc

If the cross-link headers feel insufficient, create a one-page `docs/plans/INDEX.md` that maps the 5 active plans to the master 5-step structure and the optimisation-toolkit Phase 1-5. This is lower priority than the cross-links but would help session continuity.

---

## Comparison with Folder 1

Folder 1 had a lot of cleanup (6 deletes, 8 archives, 1 replace, 2 updates). Folder 2 has almost none — it's already well-curated:
- 5 of 6 docs are live and load-bearing
- 1 doc (status-audit) is done and ready to archive
- Zero contradictions, zero genuine staleness

The 2026-04-18 plan-docs-status audit (and the current plan's structure) did a good job keeping `docs/plans/` clean. Folder 2's main risk is **not** dead docs — it's the cross-doc navigation gap (5 strategy docs need cross-links so a fresh session can navigate the stack).
