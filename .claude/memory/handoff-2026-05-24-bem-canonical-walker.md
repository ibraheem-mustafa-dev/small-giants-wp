# Session Handoff — 2026-05-24 (BEM-canonical walker + Stage 4 wiring shipped)

## TL;DR (read this first)

5 changes shipped + pushed to main (commit `e3cd1a04`): slot_synonyms cleanup, section_inner_absorb walker pre-pass, quote canonical migration, /sgs-update Stage 4 wiring, brand mockup BEM rename + (extras) +REGISTER pixel-diff gate + 3 misnamed pattern .php deletions. Stage 11 mean pixel-diff 70.5% baseline → **73.9%**. Block-type mapping now correct across all 9 Mama's sections; remaining pixel-diff regression on featured-product/ingredients/social-proof is the **CSS-lift gap** on the new richer skeleton — closes when Step 1.7 G3 (slot_list visual extension) lands.

**Architectural theme of this commit (D48–D54):** BEM is the canonical signal for block recognition. HTML tag is rendering shape only. Walker code stays universal; data layer drives recognition. Adding new block recognition = adding DB rows, not editing walker code.

**Steps 1.6 / 1.7 / 1.8 / 1.9 / 1.10 / 1.11 of the Phase 1 plan remain pending.** Phase 1 follow-on items F1 + F2 appended at end of `phase-1-structural-recovery.md`.

## Completed this session

1. **Read-discipline first 30%** — read Phase 1 plan + Spec 16 + cloning-pipeline-flow + handoff in full, cited line numbers, restated the 5 framing pitfalls, waited for Bean's go-ahead before any code work.
2. **Deleted 9 hand-made body patterns** from `sgs-framework.db.patterns` table + corresponding .php files (sgs/featured-product, sgs/gift-section, sgs/social-proof, bare sgs/header + sgs/footer, plus 4 misnamed inverted-order header/footer patterns).
3. **Change 1 — slot_synonyms cleanup**: removed 7 bad text-canonical aliases (inner, content, body-row, custom-content, quote, textAlign, textTransform) from DB both mirrors + `seed-slot-synonyms.py` (so /sgs-update doesn't re-seed the bug).
4. **Change 2 — section_inner_absorb walker pre-pass**: `_is_absorbable_wrapper` + `_absorb_transparent_wrappers` helpers added to `convert.py` + wired into 4 callsites in `__init__.py` + `convert_page.py`. Single transparent-wrapper children of section roots absorbed into the root → one outer sgs/container per section. FR1-matched sections skipped. 4 single-wrapper Mama's sections collapse cleanly.
5. **Change 3 (initial attempt) REVERTED** — tag-side-channel approach (`canonical_for_html_tag` + walker `html_tag_priority` branch) violated Spec 00 §3 BEM-as-canonical. Bean caught it; reverted.
6. **Change 3' — quote canonical migration (data-layer, no walker code change)**: `__quote` / `__blockquote` / `__pullquote` BEM elements now route to sgs/quote via existing composite_element branch + corrected `slot_synonyms` data. Spec 00 §3.1 + Spec 16 §12.3 updated.
7. **Change 4a/b/c — /sgs-update Stage 4 wiring + array-attr canonical resolution**: `sgs-update-v2.py:stage_1_sgs_codebase_scan()` tail now invokes `assign-canonical.py` (previously orphaned standalone). Extended `assign-canonical.py` with `_singularise` + `standalone_block_to_canonical` + `resolve_array_canonical` (Tier A singularise + Tier B registered-block reverse-lookup). **12 previously-NULL array-attr canonical_slots populated** (testimonials→review, logos→logo, plans→card, steps→step, reviews→review, images→media, icons→icon, badges→badge, etc.). Added `messages` / `message` aliases to text canonical for sgs/announcement-bar.messages.
8. **Change 4e (full ARRAY_LIFT_PATTERNS removal) DEFERRED** — universal 1e-B path doesn't yet have count_stars special extractor or multi-selector fallback chains. Tracked as Phase 1 follow-on F1.
9. **Change 5 — brand mockup BEM rename**: `<blockquote class="sgs-brand__body">` → `<div class="sgs-brand__quote">`; `<footer>` → `<p class="sgs-brand__attribution">`. Brand now emits `<!-- wp:sgs/quote {"className":"sgs-brand__quote","attribution":"— Zainab…",...} /-->`.
10. **+REGISTER pixel-diff gate** at `register_patterns.py` (+226 lines from earlier subagent dispatch) — pattern INSERT guarded by Stage 11 ≤ 1% threshold across 375/768/1440 viewports.
11. **Comprehensive doc walk** — 29 docs-registry entries + 25 numbered specs audited; 11 docs updated (architecture, state, decisions, mistakes, cloning-pipeline-flow, parking, Spec 00 §3.1, Spec 16 §12.3 + §15 status, Phase 1 plan with F1+F2 follow-ons, Strategic plan revision 2026-05-24).
12. **/qc-council validated Changes 1+2** mid-session (PROCEED, 86/87 confidence, one tracked issue surfaced + resolved as Change 3').
13. **Subagent dispatched** to investigate /sgs-update Stage 4 canonical-assignment gap; returned with two-tier fallback proposal which I executed.
14. **5 new durable lessons captured** as feedback memory files + 5 new lessons appended to `mistakes.md`.
15. **Committed + pushed** to main as `e3cd1a04` — 21 files changed, +711 −200.

## Empirical state (verified)

- Stage 11 mean pixel-diff: 70.5% (baseline) → 73.9% (post all changes)
- Brand emits sgs/quote with attribution lifted (was: sgs/text collapse)
- 4 single-wrapper sections (featured-product / ingredients / social-proof / gift-section) collapse to one container
- FR1 sections (hero, trust-bar) unchanged at confidence 1.0
- 12 array-attr canonical_slots populated (was NULL)
- assign-canonical.py auto-runs on every /sgs-update Stage 1 invocation

## Systematic-debugging retrospective — session mistakes + root causes

Applied 4-phase methodology to the mistakes Bean caught + the misconceptions I had during this session.

### Phase 1 — Root cause investigation (12 mistakes)

| # | Mistake | What happened | Root cause |
|---|---|---|---|
| 1 | Tag-side-channel attempt for blockquote routing | Built `canonical_for_html_tag` DB helper + walker `html_tag_priority` branch reading `slot_synonyms.html_semantic_tag` column. Worked for blockquote case but created a parallel canonical path competing with BEM. | Jumped to code-level solution without checking what Spec 00 says is canonical. Treated "make it work" as success criterion instead of "make it work per the canonical architecture". |
| 2 | Repeated options-offering after Bean stated hypothesis | Multiple turns where Bean said "doesn't X look universal?" and I responded with "options A/B/C — pick one" instead of doing the audit. Bean called this out: "stop doing such surface level work. I want evidence-based deduction not probabilistic solutions based on the suggestions I make." | Deferred synthesis to Bean. Treated his hypothesis as a directive to find options instead of a research question to answer. |
| 3 | G1 scope ping-ponged | Proposed "all composite blocks", narrowed to "hero only" under Bean's correction, then re-broadened, then re-corrected. | Scope-proposed-without-evidence. Didn't audit DB for "container-shaped composite block" signals before proposing scope. |
| 4 | Half-made pattern "rescue" suggestion (catastrophe averted by Bean) | Found 5 of 7 normal-route body sections had matching pattern slugs in `patterns` table; proposed wiring FR1 pattern fast-path to emit them. Would have produced visibly broken pattern references on the live page because those patterns are hand-made half-finished placeholders. | Trusted DB data without validating its semantic quality. Equated "row exists" with "production-ready". |
| 5 | Single-column DB cleanup left seed-script stale | Change 1 removed 6 aliases from `slot_synonyms` DB via direct UPDATE. Didn't update `seed-slot-synonyms.py` where those same aliases were authored. Future `/sgs-update --refresh-upstream` would have re-seeded the bug invisibly. | Addressed read path, ignored write path. No "follow the data write-back" check. |
| 6 | Spec-vs-impl drift undetected (assign-canonical.py orphaned) | Spec 16 §12.6 says canonical assignment runs in /sgs-update Stage 4. Subagent investigation revealed `assign-canonical.py` was a standalone script NEVER wired into `sgs-update-v2.py`. Would have proposed building a new table if subagent hadn't checked. | Trusted spec docs as proof of implementation. No grep-the-orchestrator-to-verify habit. |
| 7 | Hardcoded dict stale selectors (ARRAY_LIFT_PATTERNS) | Dict's selectors `p.sgs-testimonial__text` / `p.sgs-testimonial__author` DIDN'T MATCH the DB-canonical `.sgs-testimonial__quote` / `.sgs-testimonial__name`. Two sources of truth; dict won silently because it ran first. | Data duplicated between code and DB always drifts. Didn't proactively detect drift via DB-vs-code comparison. |
| 8 | "Pretty lazy answer" — relying on Bean's hypothesis instead of evidence | Multiple instances: assumed packSizes was a real issue (Bean: it's optional, single-item products are norm), assumed brand needs different handling (Bean: same universal rule, you just hadn't checked sgs/container attrs), assumed Spec 02 needed updating (didn't — block schemas unchanged). | Surface-level conclusion-jumping instead of scope-wide investigation before stating any conclusion. |
| 9 | Doc walk initial scope too narrow | Started with 3 docs (cloning-pipeline-flow, mistakes, decisions). Bean had to redirect: "all docs on the yaml registry + all numbered spec docs." | Small mental model of "what counts as related." Didn't enumerate before classifying. |
| 10 | Proposed new table for ARRAY_LIFT_PATTERNS migration | Suggested creating `block_array_lift_patterns` table to replace the hardcoded dict. Bean: "data already in existing tables — /sgs-db dump /uimax dump." | Didn't enumerate the 31+49+7 = 87 existing tables before proposing a new one. |
| 11 | Missed sgs/quote worked example in universal-extraction explanation | Discussed how it applies to testimonial-slider + trust-bar but skipped sgs/quote (the block we were fixing). Bean: "you mention how you'd fix this for the trust bar and testimonial slider but not the quote blocks which we're setting up." | Incomplete worked-example coverage. Didn't pressure-test "does my explanation cover the original problem case?" |
| 12 | "What about X?" gaps requiring Bean follow-ups | Bean repeatedly asked clarifying questions I should have surfaced myself ("isn't this universal?", "what about the quote block?", "what about Spec 02?", "what about pack-size?"). | No self-pressure-test before presenting. Should have walked through "what would Bean ask?" before surfacing each plan. |

### Phase 2 — Pattern analysis (root causes cluster into 6 themes)

**Theme A — Surface-level analysis (mistakes 3, 8, 11, 12):** drawing conclusions from limited evidence instead of full-scope investigation. Treating one section as representative, one block as the case, one doc as the scope.

**Theme B — Letting Bean do synthesis (mistakes 2, 8, 12):** offering options for Bean to pick OR jumping to his hypothesis as the answer, instead of doing the engineering deduction myself.

**Theme C — Code-first over data-first (mistakes 1, 10):** proposing code changes (new branch, new table) when data-layer fixes exist. Violates blub.db row 269 "universal extraction primitive, walker code stays universal; data layer drives recognition."

**Theme D — Spec/script duplication blind-spots (mistakes 5, 7):** data duplicated between code (hardcoded dicts, seed scripts) and DB (slot_synonyms, block_attributes) drifts silently. No proactive detection mechanism.

**Theme E — Narrow doc scope (mistake 9):** architectural changes touch 10–15 docs, not 3. Doc walk needs comprehensive enumeration before classification.

**Theme F — Spec-as-truth (mistake 6):** trusting spec documents as proof of implementation behaviour. Need grep-verify habit.

### Phase 3 — Hypothesis: what changes prevent recurrence

For each theme, the binding rule that would catch this category of mistake BEFORE it surfaces:

**Theme A → Comprehensive scope inventory before any conclusion.** Before proposing or concluding anything: enumerate the FULL set. All 9 sections, not 1. Every relevant block.json, not just the matched one. Every alias in the canonical, not just the one in question. The pressure-test question: "did I check the full scope or did I sample?"

**Theme B → Engineering deduction is MY job, not Bean's.** When Bean hints at a pattern ("doesn't X look universal?"), that's a research question. Go answer it with evidence. Come back with ONE conclusion + citations, not options. No "(a)/(b)/(c) — pick one" when (a) can be verified by reading 5 files.

**Theme C → Data-first audit before code change.** Before any walker / converter / pipeline code edit: (1) `python ~/.claude/hooks/wp-blocks.py dump` for schema enumeration, (2) `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` for relevant rows, (3) grep `slot_synonyms` aliases for relevant terms, (4) check `block_attributes` for the target attr. If data-layer fix exists, take that path. blub.db row 269 + Spec 00 §3 BEM-as-canonical.

**Theme D → Write-path audit on every data-layer change.** Before applying any DB UPDATE: locate the seed script + any migration scripts that wrote the original data. Update those alongside the DB. Run `git grep` for the term you're changing to find duplicates.

**Theme E → Comprehensive doc walk on architectural changes.** Doc walk = enumerate `.claude/*.md` + every entry in `.claude/docs-registry.yaml` + every numbered spec in `.claude/specs/` + active plans, classify each as MUST-UPDATE / LIKELY-AFFECTED / UNAFFECTED, then update the first two tiers. Expect 10–15 affected docs, not 3.

**Theme F → Grep-verify spec claims before trusting.** When a spec declares behaviour ("Stage X runs in /sgs-update", "the converter routes Y through Z"), grep the orchestrator code to confirm before treating the spec as proof. Drift between spec and impl is a real failure mode.

### Phase 4 — Implementation (binding rules embedded in next-session-prompt)

The 6 binding rules above are embedded as MANDATORY pre-action checks in `.claude/next-session-prompt.md`. They join the existing 4 binding rules from `feedback_dispatched_agents_no_commit_authority.md` for agent dispatches.

5 new durable lessons captured as feedback memory files this session:
- `feedback_evidence_based_deduction_not_probabilistic.md` — covers Themes A + B
- `feedback_comprehensive_db_audit_before_data_layer_changes.md` — covers Themes C + D
- `feedback_pattern_production_readiness_gate.md` — covers Theme C (specific to patterns)
- `feedback_header_footer_site_suffix_naming_convention.md` — narrow convention rule
- (existing) `feedback_dispatched_agents_no_commit_authority.md` — agent boundary

## Current state

- **Branch:** main at `e3cd1a04` — pushed to GitHub
- **Working tree:** clean (commit + push confirmed)
- **Active phase:** Phase 1 second pass shipped uncommitted-then-committed. Steps 1.6 / 1.7 / 1.8 / 1.9 / 1.10 / 1.11 of the Phase 1 plan remain pending.
- **Pixel-diff baseline for next session:** `pipeline-state/mamas-munches-homepage-2026-05-24-122653/stage-11-pixel-diff.json` (mean 73.9%)

## Captured lessons (durable corrections in CC auto-memory)

- `feedback_evidence_based_deduction_not_probabilistic.md` — comprehensive-scope investigation before any conclusion; no options-for-Bean-to-pick
- `feedback_comprehensive_db_audit_before_data_layer_changes.md` — write-path audit on every data-layer change; surface 5 areas before proposing
- `feedback_pattern_production_readiness_gate.md` — patterns table content needs production-readiness gating at INSERT (now enforced at +REGISTER)
- `feedback_header_footer_site_suffix_naming_convention.md` — per-site headers/footers MUST be `sgs/header-<client>` / `sgs/footer-<client>` shape
- `feedback_dispatched_agents_no_commit_authority.md` — agents return uncommitted artefacts; main thread + Bean decide commits

## Files modified (this session)

| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | +126 — section_inner_absorb helpers + frozensets |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py` | +10 — 2 absorb callsites |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert_page.py` | +3 — 2 absorb callsites |
| `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` | +107 — singularise + Tier B reverse-lookup + array-attr fallback |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | +28 — Stage 1 tail invocation of assign-canonical |
| `plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py` | +25 / −7 — bad aliases removed; quote + messages aliases added |
| `plugins/sgs-blocks/scripts/orchestrator/register_patterns.py` | +226 — pixel-diff gate at pattern INSERT |
| `sites/mamas-munches/mockups/homepage/index.html` | brand BEM rename |
| `theme/sgs-theme/patterns/*.php` | 3 misnamed inverted-order files deleted |
| `.claude/specs/00-naming-conventions.md` | §3.1 BEM-as-canonical recognition rule |
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | §12.3 quote canonical row + §15 second-pass status |
| `.claude/cloning-pipeline-flow.md` | Stage 4 STATUS update (second pass) |
| `.claude/decisions.md` | D48–D54 |
| `.claude/mistakes.md` | 5 new lessons |
| `.claude/parking.md` | P-BLOCKQUOTE-TAG-OVERRIDE RESOLVED |
| `.claude/architecture.md` | BEM-is-canonical note |
| `.claude/state.md` | current_phase update |
| `.claude/plans/2026-05-24-phase-1-structural-recovery.md` | "What ACTUALLY shipped" + F1+F2 follow-ons appended |
| `.claude/plans/2026-05-24-strategic-plan.md` | Phase 1 revision note |
| `~/.claude/projects/.../memory/feedback_*.md` (3 new) | Durable lessons |
| `~/.claude/skills/sgs-wp-engine/sgs-framework.db` + agents mirror | slot_synonyms aliases + 12 canonical_slot populations |

## Next priorities (in order)

1. **Step 1.7 — G3 slot_list visual extension via property_suffixes** (HIGH leverage). Closes the +30% pixel-diff regression on featured-product / ingredients-section by lifting visual/structural slots (backgroundImage, overlayColour, minHeight, gridTemplateColumns, etc.) into typed attrs on the new richer skeleton. This is THE high-yield move for next session.
2. **Step 1.6 — G1 OPEN-block emit for sgs/hero only.** Hero's CTAs render via InnerBlocks instead of self-closing attrs. Per-Bean-scope (hero only; broader work parked at P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES).
3. **Step 1.8 — G5 per-block DOM-shape fixes** (parallel — blockquote tag preservation, testimonial-slider 3-col grid, trust-bar __badge/__text structure).
4. **Step 1.9 — Hooks completion (2,049 missing) + role='content' DB sync.**
5. **Step 1.10 — Final /qc-council Stage 5 on combined Phase 1 work.**
6. **Step 1.11 — Phase 1 close /handoff.**
7. **Phase 1 follow-on F1** — ARRAY_LIFT_PATTERNS full migration to universal extraction (after Step 1.7 lands the visual slot extension that 1e-B needs).
8. **Phase 1 follow-on F2** — 9 remaining NULL-canonical array attrs (vocab additions OR new canonicals OR design decisions).
9. **Phase 2 — Header + footer specialised cloner** (after Phase 1 closes).

## Doc-op programme — added 2026-05-25 (covers 2026-05-24 execution + 2026-05-25 standards close)

The full doc-op programme ran across two sessions (parallel to the BEM-canonical work above):
- 2026-05-24 execution session — Phases 1-5 + 6c + 7 + 12 + 13 initial
- 2026-05-25 continuation session — Phases 6a + 6b + 9 + 10 + 13 expanded + back-door close + skill alignment + plan templates + qc-council remediation + adoption surfaces

Total: 21+ commits across the programme. Original handoff trio archived to `.claude/memory/handoff-doc-op-2026-05-24-25.md` + `.claude/memory/next-session-prompt-doc-op-2026-05-24-25.md` (containing the granular per-task detail).

### What shipped (high-level)

- **parking.md restructured** — 1,914 lines / 158 entries → ~91 active entries with 6 stable taxonomy buckets + canonical `**Status:**` field (OPEN/PARTIAL/BLOCKED/DEFERRED) + slug-uniqueness gate in `/handoff`
- **mistakes.md keyword-stub migration** — 1,013 lines → 179 lines / 30 active stubs linking to feedback_*.md + blub.db; `/capture-lesson` updated to write the new format
- **decisions.md compressed** — 1,398 lines → 296 lines / 62 active D-entries (D-id + ≤3 body lines + commit SHA)
- **Spec relocation (Phase 9)** — 33 → 19 numbered specs in `.claude/specs/`; comparator reports → `reports/`; legacy → `plans/archive/`; cross-repo specs → `~/.claude/specs/`
- **Heavy doc splits (Phase 10)** — architecture.md 2,101 → 163 lines + new feature-audit (1,074) + new dev-setup.md (592); cloning-pipeline-flow.md 1,757 → 123 overview + new cloning-pipeline-stages.md (827); CLAUDE.md 73 → 40 lines Karpathy manifest-style; plan.md 200 → 14 line stub; docs-registry.yaml 435 → 254 lines
- **17 canonical doc-type templates** in `~/.agents/skills/shared-references/doc-templates/` (added `archived-plan`, `dev-setup`, `reference`, `spec`, `strategic-plan`, `phase-plan` to the original 11)
- **docscore.py** — new auto-detect (filename + parent-dir + frontmatter doc_type with filename_glob + required_dir constraints to close self-declaration back-door); 3 new structural checks (U5 dead-links, X1 registry-resolves, X5 MEMORY.md size); spec/plan/claude-md-specific checks; cognitive-complexity refactor (10 SonarLint warnings closed; behaviour preserved); `~/.claude/hooks/docscore-on-doc-edit.py` PostToolUse hook auto-runs docscore on every in-scope edit (silent on pass, stderr advisory < 90% A-)
- **17 decisions logged** (D55-D68) — covers DB retirement, parking restructure, spec relocation, retention TTL, /docscore rule integration, plan templates, hook, adoption surfaces, /qc-council remediation
- **Adoption surfaces propagated** — `~/.claude/CLAUDE.md` (global) + `<project-root>/CLAUDE.md` + `~/.claude/commands/handoff.md` (new Gate 4.6 docscore check) + `~/.claude/skills/autopilot/SKILL.md` (preload templates on plan-keyword opening messages) + 5 doc-touching skills aligned (spec-writer, capture-lesson, phase-planner, project-init, project-consolidate, strategic-plan)
- **Research notes**: `~/.openclaw/workspace/memory/research/2026-05-24-spec-docs-and-karpathy-manifest-best-practice.md` + `~/.openclaw/workspace/memory/research/2026-05-24-strategic-plan-and-phase-plan-best-practice.md`

### Empirical final state

**15/15 in-scope docs at 100% Grade A docscore** (CLAUDE.md, parking, mistakes, decisions, dev-setup, cloning-pipeline-stages, 2 specs, 2 archived plans, 5 active plans). Hook in place to keep them there.

### Doc-op decisions for cross-reference

- D55 — block_compositions table merge
- D56 — source-DB retirement (blocks.db + hooks.db)
- D57 — parking.md formatting v2 (6 taxonomy buckets + Status enum)
- D58 — spec relocation
- D59 — per-doc-type retention TTL
- D60 — Phase 13 expanded (U5 + X1 + X5 + 4 templates)
- D62 — doc_type self-declaration back-door closed
- D63 — 7 doc-touching skills aligned
- D64 — docscore.py technical debt closed (10 SonarLint warnings)
- D65 — strategic-plan + phase-plan templates (merged from skill spec + research)
- D66 — PostToolUse hook docscore-on-doc-edit
- D67 — adoption surface updates (global + project + handoff + autopilot)
- D68 — /qc-council remediation on plan templates (3 fixes)

## Next Session Prompt

See `.claude/next-session-prompt.md`. The prompt embeds 6 systematic-debugging-derived binding rules to prevent the categories of mistake captured above from recurring.
