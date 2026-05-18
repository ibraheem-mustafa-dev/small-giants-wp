# Pipeline consistency + requirements audit — Opus (main thread)

**Generated:** 2026-05-21
**Auditor:** Opus 4.7 (main agent)
**Files read in full:** `state.md`, `handoff.md`, `cloning-pipeline-flow.md`, `specs/16-DETERMINISTIC-CONVERTER-V2.md`, `~/.claude/skills/sgs-clone/SKILL.md`. Skimmed: `decisions.md`, `mistakes.md`, `architecture.md`, `tooling-map.md`, `skills-commands-map.md` (sized only — not fully read in main thread, but their roles are reflected in the flow doc + spec cross-references). `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` inspected by structure (grep for stage functions, not line-by-line).

## Headline verdict

The pipeline is internally **inconsistent on what "Phase N" means** — there are at least **5 different "Phase N" namespaces** in active use (Spec 15 Phases 1-4.5 + 5a-5f + 6; Spec 16 Phases 1-6; Spec 16 frontmatter's "Phase 7-9"; Phase 2A block additions; next-session-prompt Phase 0-6). It is **substantially consistent on stage architecture** (the 10-stage flow + 4 tails matches across the canonical flow doc, Spec 16 cross-refs, and orchestrator code), but **the actual coverage of Bean's 9 requirements is only about 60% — three of his nine asks are not explicitly addressed in any spec**, and one of the partials (pattern-level matching at Stage 2) is a known, documented gap that has not been planned.

## Requirements coverage matrix

| # | Requirement | Verdict | Evidence | Notes |
|---|-------------|---------|----------|-------|
| 1 | Scan a full draft HTML page | **COVERED** | Spec 16 FR1+FR2+FR3; flow doc Stage 1 (`recogniser/per-section-convention-voter.py`) + Stage 4 (`tools/recogniser-v2/extract.py` OR `orchestrator/converter_v2/convert.py`) | `--auto-section` flag traverses every top-level section; Phase 9 evidence layer (Spec 16 frontmatter status_history line 13) captures the walk in `convert-trace-<boundary>.jsonl` |
| 2 | Clone exact visual to 99% accuracy (<1% per section × 3 viewports) | **PARTIAL** | Spec 16 FR7; closure_gate_definition_v0_3 (per-section, not full-page); Stage 8 (`autonomy_gate.py` + `visual_qa_capture.py`); current baseline per SKILL.md:200 is 64.9% / 43.7% / 36.5% across viewports | Pixel-diff machinery exists. The <1% target IS the closure gate. Current measurement is way off target — this audit cannot evaluate "would it reach 99%" against the existing converter; it can only confirm the gate exists |
| 3 | Group class sections into `sgs/container` UNLESS header/footer/hero | **PARTIAL / CONTRADICTORY** | Spec 16 R1 + FR4 (top-level → sgs/container, MANDATORY); Spec 17 §11 (referenced in spec 16 §11 + flow doc line 466-475, **NOT YET IMPLEMENTED**); flow doc has no explicit "skip container for header/footer/hero" carve-out | Spec 16 R1 says `sgs/container` is **always** auto-emitted at top-level. Bean wants header/footer/hero to keep their semantic shape. **No source acknowledges Bean's exception clause.** Hero is partially covered because `<section class="sgs-hero">` matches `sgs/hero` block-root via FR1 (so it emits sgs/hero, not sgs/container) — but only when the recogniser successfully matches. Header/footer routing through Spec 17 framework patterns is **planned but unimplemented**. |
| 4 | Match all div classes to equivalent block (except section-name-matching div which IS the section) | **PARTIAL** | Spec 16 FR1+FR2 (block-root + atomic-tag), R3 (slot-claim precedence) | Block-root harvest at section level + descendant slot lift is the standard model. The specific "div with same name as section = the section itself, not a child block" case is **not explicitly called out** in any source. Implicit in FR1 (block-root match) but the redundancy case (`<section class="sgs-brand"><div class="sgs-brand">`) isn't tested for in the orchestrator code I sampled. |
| 5 | Recognise hierarchy for parent and child blocks | **PARTIAL** | Spec 16 R3 (slot-claim inside vs outside block-root); Spec 16 §8 known limitation "Nested block-roots (block inside block) need recursion guard"; orchestrator/`recursion-guard.py` BUILT (per Spec 14 FR18 P2 ship) | Architecture supports nesting. But Spec 16 §8 row 4 marks "Nested block-roots need recursion guard" as an edge case, and the guard is built but the parent-child block-root matching path isn't documented as "tested + green". Also: Stage 2 pattern-level matching is **not implemented** (flow doc lines 314-321) — for composite sections the pattern-level container/child relationship falls through |
| 6 | Find and translate attribute slot names | **COVERED** | `sgs-framework.db slot_synonyms` table (Spec 15 §7); Spec 16 §9.4 R/W matrix; `attr_name_for_slot_or_alias()` in `db_lookup.py` | DB-first lookup. The slot synonym vocabulary is canonical and `/sgs-update` keeps it in sync. |
| 7 | Extract and move over slot content | **COVERED** | Spec 16 FR1-FR2; Stage 4 extractor; `extract.json` per_section_results | Standard FR1 block-root harvest + FR2 atomic-tag emission cover text/src/href/etc. |
| 8 | (Optional) Recognise unmatched block → create new block; OR existing-block extension → add functionality/attribute | **PARTIAL — internally contradictory across docs** | Spec 16 R4 (status='built' fall-through); Spec 16 FR6 D3 (`attribute_gap_candidates`); Stage 9b autonomy chain (`bucket-c-classifier.py` + `atomic-block-scaffold.py`) | Flow doc Stage 9 (lines 906-913) marks gap-writers as **RESOLVED 2026-05-14** but Stage 9b autonomy (line 705) says **"PARTIALLY LIVE — classifier + scaffold fire, gap-writers don't"**. Internal contradiction inside the same doc. The capability exists in code but its wiring status disagrees with itself. |
| 9 | (Minimum) Report unconverted items with diagnostic info | **COVERED** | `pipeline-state/<run>/leftover-buckets.json` (binding rule blub.db row 254); `operator-review.html`; `gap-review.md` (`gap-review-report.py` wired 2026-05-14 Phase 6 v2 Step 4h) | Multi-bucket classification (5 buckets) with section/slot/reason tagging. Empirically used in this session (see `reports/2026-05-21-pixel-parity-bucket-audit.md`). |

**Tally: 4 COVERED, 5 PARTIAL/CONTRADICTORY, 0 MISSING.** No requirement is completely absent from the docs/code — but five are partial in concerning ways.

## Inconsistencies found

### 1. "Phase N" namespace overload (BLOCKING for planning)

There are 5 distinct phase-numbering systems in active use, all called "Phase N":

| Namespace | Source | Phase numbers in use |
|-----------|--------|----------------------|
| Spec 15 phases | `specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` | 1, 2, 3, 4, 4.5, 5a-5f, 6, "Phase 6 Step 0", "Phase 6 v2 Step 4-5" |
| Spec 16 phases | `specs/16-DETERMINISTIC-CONVERTER-V2.md` §4 | 1, 2, 3, 4, 5, 6 |
| Spec 16 "Phase 7-9" (referenced but undefined in §4) | spec 16 frontmatter status_history + state.md | 7, 8, 9 |
| Block-content phases | state.md current_phase | "Phase 2A" (block additions, Spec 17 / framework-block work) |
| Today's session phases | `next-session-prompt.md` | 0 (preparatory), 1 (anti-cheat scripts), 2 (coverage honesty), 3 (lift gaps), 4 (baseline refresh), 5 (per-section loop), 6 (side tasks) |

`state.md` line 7 says "Next session focus: return to cloning pipeline (Spec 16 phase 7 / orchestrator resumption)" — but **Spec 16 §4 only defines Phases 1-6**. Spec 16 frontmatter status_history line 13 mentions "Phase 9 PRE-WORK shipped" with no §4 entry for Phase 9. This is a doc bug, not just a labelling preference.

**Recommended resolution:** rename the next-session-prompt's "Phase 0-6" to a new namespace ("Session Track" or similar). Add Spec 16 §4 entries (or §11+) for the "Phase 7", "Phase 8", "Phase 9" work referenced elsewhere, OR retire those labels in favour of Spec 16's canonical numbering.

### 2. `tools/recogniser/` vs `tools/recogniser-v2/` vs `plugins/sgs-blocks/scripts/recogniser/`

Three live recogniser locations, three different sets of claims about which is canonical:

- **`tools/recogniser/`** (legacy): flow doc treats `tools/recogniser/data/fingerprints.json` as "legacy v1 seed file" (line 358-363). SKILL.md pre-flight (line 177-184) **does not list this path at all** as a precondition. Today's Task 0.3 still wrote here per the explicit instruction in cloning-pipeline-flow.md lines 951-971.
- **`tools/recogniser-v2/`**: Spec 16 §6 says `extract.py` (731 LOC), `extract_strategies.py` (303), and `overrides/hero.py` (908) are **scheduled for deletion in Phase 6**. Flow doc Stage 4 (line 353) lists `tools/recogniser-v2/extract.py` as the **active extractor**.
- **`plugins/sgs-blocks/scripts/recogniser/`**: SKILL.md pre-flight names this as the canonical recogniser path. Flow doc Stage 1, 2, 9, 9b all dispatch into scripts here.

**Reading:** the orchestrator runs `recogniser/per-section-convention-voter.py` (in plugins/) at Stage 1, `recogniser/confidence-matrix.py` at Stage 2, then dispatches Stage 4 to either `tools/recogniser-v2/extract.py` OR `orchestrator/converter_v2/convert.py` depending on `--converter-v2` flag. The Phase 6 retirement clause (Spec 16) is **not yet executed**, so all three trees are still live. SKILL.md should be updated to acknowledge the `tools/recogniser-v2/` and `tools/recogniser/` paths as part of the active chain.

### 3. Stage 9 / Stage 9b status: doc disagrees with itself

`cloning-pipeline-flow.md` Stage 9 (line 906-913) marks all 4 gap-writers as **RESOLVED 2026-05-14**. Stage 9b (line 705) says **"PARTIALLY LIVE — classifier + scaffold fire, gap-writers don't"**. Same doc, internally contradictory. Best reading: the gap-writers fire at Stage 9 (per-section, post-extraction) but the Stage 9b autonomy chain (which would route an unmatched section to scaffold a new block) does not consume them. Worth reconciling in the next flow-doc sync.

### 4. `--converter-v2` flag: default OFF but binding-rule REQUIRED

- `cloning-pipeline-flow.md:34`: "`--converter-v2` flag (default OFF)"
- `handoff.md:67`: "`--converter-v2` flag required on production orchestrator runs (binding rule from 2026-05-18)"
- `next-session-prompt.md:36`: "`--converter-v2` required on production orchestrator runs"

Foot-gun: anyone running the orchestrator without the flag will get the legacy path silently. The default-OFF was justified during rollout (Spec 16 frontmatter), but now the binding rule says it's mandatory. Flip the default or document the gap loudly in `--help`.

### 5. Bean's R3 — header/footer/hero carve-out is unimplemented + unspecced

Spec 16 R1: "sgs/container is **MANDATORY** at the top-level section boundary". This is the auto-emit rule. Bean's stated requirement: container UNLESS section is header/footer/hero. **No spec or flow doc carves out this exception.** Hero is incidentally covered when `<section class="sgs-hero">` matches `sgs/hero` block-root via FR1; header/footer is supposed to be routed via Spec 17 framework patterns (`sgs/framework-header-default` etc.) but Spec 16 §11 marks that as "not yet implemented". So today's pipeline would emit `sgs/container` for header/footer sections too — possibly correct (it's a container with className preserved) but not aligned with Bean's mental model.

### 6. Pattern-level matching gap acknowledged in flow doc, missing in spec roadmap

`cloning-pipeline-flow.md:314-321` flags this clearly: "**Matches at BLOCK level only — no PATTERN-level matcher consulting patterns table or block_compositions before falling through. For Mama's: 6 of 9 sections return core/group (no match) and fall to Stage 9b autonomy fallback.**" Spec 16 §4 Phase 1-6 does NOT include pattern-level matching. SKILL.md Hard Rule 3 says "mockup classes map to PATTERNS, not single blocks" — but the implementation doesn't do pattern-level matching. The Hard Rule is **aspirational, not enforced**. This is the single biggest implementation/spec gap I found.

## Gaps / missing coverage

1. **Bean R3 header/footer/hero carve-out** — no spec acknowledges Bean's stated exception. Either (a) tighten Spec 16 R1 to "MANDATORY at top-level UNLESS section root matches a block (hero) OR is `<header>`/`<footer>`"; or (b) accept current behaviour and update Bean's mental model to "containers everywhere is correct; header/footer/hero just live inside containers with `className` carried through".

2. **Bean R4 (section-name-redundant inner div)** — not explicitly tested. Add a test case: `<section class="sgs-brand"><div class="sgs-brand">...</div></section>` should match `sgs/brand` once, not twice.

3. **Pattern-level matching at Stage 2** — the single biggest implementation gap. Flow doc acknowledges it; no spec/plan addresses it. This is the bottleneck for social-proof / gift-section / featured-product on Mama's.

4. **Stage 9b autonomy chain** — partially live; the unmatched-→-scaffold-new-block path that Bean's R8 asks for is only half wired. Closing this is small (gap-writer-consumes-by-autonomy-chain) but undocumented in the roadmap.

5. **Phase 7-9 plans referenced in state.md + spec 16 frontmatter but never defined** — these need explicit §4 entries or retraction.

## Items where the pipeline OVER-COVERS or has dead code

1. **Stage 0.7 monolithic CSS dump** — flow doc lines 186-212: "wrong-architecture, dumps ALL CSS into one variation file instead of splitting universal / per-instance / bespoke per `feedback_cloning_preserves_intentional_bespoke_detail` rule. Tracked as architecture debt; not a Phase 6 blocker." Captured 2026-05-12 but still not addressed.

2. **`tools/recogniser/` legacy fingerprint catalogue** — Spec 16 Phase 6 retires `extract.py` + `extract_strategies.py` + `overrides/hero.py` in `tools/recogniser-v2/`, but the older `tools/recogniser/` (the v1 fingerprint catalogue) is NOT in the retirement scope. It's kept as the AI matcher / smoke-test fallback (per Task 0.3 agent's findings today), but its lifecycle is ambiguous in every spec I read.

3. **5 dead DB tables** in `sgs-framework.db` — flow doc lines 862-868: `sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, `animations` (in sgs-framework, not uimax). Retirement candidates. Tracked but not actioned.

## Notable findings outside the 9 requirements

1. **Closure gate redefinition (Spec 16 §closure_gate_definition_v0_3) is a major design decision** that the next-session-prompt + state.md both reference but neither explains in plain English: "Closure unit is the SECTION, NOT the page." Worth surfacing.

2. **The next-session-prompt for today's session (Phase 0-6) was internally optimised but not grounded in Spec 16's roadmap.** Its "Phase 3 lift gaps" (P-PARENT-QUALIFIED-TAG-LIFT + P-TAG-SELECTOR-LIFT + P-CORE-STYLE-MAP-DB-MIGRATION) are real CSS-lift improvements but are not listed as Spec 16 Phase 2-6 work. The session was running a parallel agenda. This isn't wrong — Spec 16 didn't anticipate every lift-gap — but it's worth reconciling so future plans don't drift further.

3. **Header behaviour wp-option routing — Bean asked about this earlier in this session** (`body.sgs-header-behaviour-*` → `sgs_header_rules`). It's listed as a recogniser target in cloning-pipeline-flow.md (line 962-968) but **no wired destination**. The pattern primitive exists (`wp_integration.route_native_feature()`) — adding a `wp-option` channel is straightforward but not on any plan.

## Recommended actions (ordered by impact)

1. **Reconcile "Phase N" namespaces.** Pick canonical naming. My recommendation: keep Spec 16 §4 Phases 1-6 as the converter-rollout track. Spec 16 frontmatter "Phase 7/8/9" → relabel as "Spec 16 Walkdown Track Step N" or similar. Next-session-prompt's "Phase 0-6" → relabel as "Session 2026-05-21 Track" or similar. State.md fix: replace "Spec 16 phase 7" with explicit description ("orchestrator section-by-section walkdown, pre-Phase-6 work"). ~20 min editorial pass.

2. **Surface Bean's R3 header/footer/hero exception clause to the spec.** Either tighten Spec 16 R1 OR document that the current "always sgs/container at top-level" is correct because header/footer-pattern matching (Spec 17) and `sgs/hero` block-root harvest cover the cases Bean cares about. ~10 min decision + spec update. **Until this is resolved, the converter will emit `sgs/container` around `<header>`/`<footer>` mockup sections — visible in any clone output for inspection.**

3. **Plan the Stage 2 pattern-level matching gap.** Flow doc acknowledges it; nothing else does. Without this, Mama's social-proof, gift-section, featured-product sections will never close — they fall through to Stage 9b autonomy chain instead of matching a composite pattern. ~2-4 hour build (pattern-fingerprint lookup against `block_compositions` + `patterns` tables before block-level fall-through).

4. **Close the Stage 9 / Stage 9b internal contradiction in the flow doc.** ~10 min sweep through `cloning-pipeline-flow.md` to align lines 705 and 912-913.

5. **Flip `--converter-v2` default to ON** OR add a `--legacy-extract` opt-in flag for the old path. Today's default-OFF + binding-rule-REQUIRED is a foot-gun. ~15 min code change + handoff/next-session-prompt update.

## Confidence + caveats

- I read `state.md`, `handoff.md`, `cloning-pipeline-flow.md`, `specs/16-...md`, `~/.claude/skills/sgs-clone/SKILL.md` in full. I did **not** read `architecture.md` (2030 lines), `decisions.md` (1121 lines), `mistakes.md` (673 lines), `tooling-map.md` (520 lines), `skills-commands-map.md` (459 lines), `specs/15-...md` (918 lines), or the orchestrator script (1277 lines) in full. The 5 parallel auditors are reading deeper. My findings may miss things they catch.
- I did NOT verify orchestrator-code claims against the actual orchestrator file beyond function-name grep. The 5 parallel auditors are doing that.
- Bean's R4 (the "div directly under the class section with the same name") was hard to parse — I read it as "redundant inner div with the section name = the section root, don't emit a duplicate block". If Bean meant something else, my R4 verdict is wrong.

I'd be most surprised if a panel auditor catches a 6th major inconsistency I missed in `decisions.md` or `architecture.md`.
