---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-13-phase-5-modules-shipped-acceptance-not-met
session_date: 2026-05-13
recommended_model: opus
---

# Session Handoff — 2026-05-13 (Phase 5 modules SHIPPED; live E2E proved acceptance NOT MET)

## TL;DR

Phase 5 of Spec 15 was driven module-by-module through this session: sub-phases 5a (gap detection), 5b (staged scaffolding), 5c (lingua-franca), 5d (WP integration), 5e (autonomy + visual QA), 5f (acceptance harness). All six sub-phases SHIPPED on origin/main across 8 feature commits + 1 fix commit + 1 docs commit. Layer-1 per-step `/qc-inline` PASS throughout. Layer-2 sub-phase aggregates GREEN. Layer-3 3-rater panels (Sonnet strict + Haiku fast sanity + Gemini Flash breadth) all converged on COMMIT NOW: yes with concrete fixes applied inline pre-commit.

Then — at your push — I ran the actual live E2E on Mama's homepage. Pipeline runs all 9 stages cleanly, emits 22 606 chars of "valid" SGS block markup, 5/5 acceptance harness GREEN. Deployed to sandybrown post 58, screenshotted at 3 viewports, pixel-diffed vs the mockup. **85% pixel diff at all three viewports vs the 1% acceptance gate.** Opened the URL with my own eyes: hero renders (with broken word-wrap + missing split image), footer renders, the other 6 sections are absent. Root cause: the recogniser confidently routes 6 of 9 sections to blocks that don't exist (`sgs/header`, `sgs/featured-product`, `sgs/ingredients-section`, `sgs/gift-section`, `sgs/social-proof`, `sgs/footer`). The orchestrator violates Hard Rule 3 (patterns over single blocks) — emits bare self-closing block refs instead of pattern compositions wrapped in `wp:sgs/container` with InnerBlocks containing registered atomic blocks. And the autonomy chain Phase 5 built (5a.2 bucket-c-classifier → 5b.8 atomic-block-scaffold `--promote`) never fires in the legacy production orchestrator.

**Phase 5 status: modules SHIPPED, acceptance NOT MET.** 3 of 5 acceptance gates green. The closure path is sub-phase 5g — orchestrator emission-stage rewrite (~2 hr, steps 5g.1–5g.5 defined in `phase-5-clone-pipeline-e2e.md`). Live E2E surfaced the bugs the unit-test surface alone could never have caught; per the original panel's warning ("module surface complete ≠ live pipeline works"), this was the expected outcome of finally running the real test.

## What shipped this session

| Commit | Sub-phase | Description |
|--------|-----------|-------------|
| `73a33b1c` | Pre-flight | DB hygiene (97 form-instance scope-excluded + 10 NULL backfills + 0-byte stub deleted), hero baseline re-captured |
| `a0e1d145` | 5a Gap detection | leftover-bucket-router 4-level routing + bucket-c-classifier + functionality-gap-detector + attribute-gap-writer + gap-review-report. 5 modules + 5 tests in `recogniser/`. |
| `f8398efd` | 5b Staged scaffolding | staged_output + validate-stage-artifact + 7 stage schemas + mutex + media-sideload + attribute-staged-apply + functionality-bulk-apply + atomic-block-scaffold. 8 modules + 8 tests in `orchestrator/`. |
| `4061114a` | 5c Lingua-franca | lingua_franca + stage1_boundary_hook. 5 convention rules + canonical SGS-BEM fast path. |
| `14ba9782` | 5d WP integration | token_resolver + variation_router + supports_writer + modifier_extractors + wp_integration. 6 modules + 6 tests. |
| `8f2e9ff1` | 5e Autonomy + visual QA | preflight_chain + staged_merge (keystone) + autonomy_gate + orchestrator_main + visual_qa_config.json. 4 modules + 4 tests. |
| `c4f0c3e5` | 5f Acceptance harness | critical-fix-verification 5-check harness + state.md updates. |
| `93b6226f` | 5f fix | Whitelist canonical non-stage outputs (deliverable.md / merge-log.md / etc.) from orphan classifier. |
| `70f56c39` | 5f bug fix | Stage 9 coverage roll-up: bare-slot vs `block.attr` key mismatch (found by live E2E). |
| `2388904f` | Docs | decisions.md + state.md record honest Phase 5 status post live E2E. |

Plus skill + command updates (user-level registries, no project commit): `/sgs-clone`, `/sgs-update`, `/visual-qa` + 9 sgs/uimax SKILL.md + sgs-db command updated for Phase 5 module references + Spec 13 → Spec 15 §8.1 collapse. Live project docs (`architecture.md`, `goals.md`, `cloning-pipeline-flow.md`, root `CLAUDE.md`) updated to point at Spec 15 instead of absorbed Specs 12/13/14.

## Architectural truths the live E2E exposed

### Truth 1 — Recogniser hallucinates blocks (the load-bearing finding)

`plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py:95-107`:

```python
registered = candidate_slug in registered_blocks
confidence = voter_confidence
if not registered:
    confidence = min(confidence, 0.75)   # ← only mildly dampens
candidates.append({
    "block_name": candidate_slug,         # ← emitted regardless
    "confidence": confidence,
    "registered": registered,
})
```

The script knows when a block doesn't exist (`registered=False`) but only nudges the confidence down to 0.75. The orchestrator faithfully emits `<!-- wp:sgs/featured-product /-->` for every match. WordPress silently drops every block-comment that references an unregistered block name. On Mama's homepage: 6 of 9 sections become vapour.

Closure fix: hard-gate. When `registered=False`, drop the candidate; route to `unrecognised_section` bucket; downstream stage-9 invokes bucket-c-classifier (Phase 5a.2) + atomic-block-scaffold (Phase 5b.8) — both of which exist as modules and were never wired into the legacy orchestrator.

### Truth 2 — Hard Rule 3 violated (patterns over single blocks)

Spec 12 / Spec 15 Hard Rule 3: *"mockup classes and sections map to PATTERNS (composite containers — header, footer, mega menu, sgs/hero), not single blocks. Pattern holds 1+ blocks."*

What the orchestrator actually emits per section:

```
<!-- wp:sgs/<fake-block> { attrs } /-->     ← self-closing, no inner blocks
<!-- wp:html -->
<style>
  #sgs-<fake-block>-1 .sgs-<class> { ... }   ← unscoped CSS dump
</style>
<!-- /wp:html -->
```

There is no `wp:sgs/container` wrapper, no InnerBlocks slot, no atomic-block composition. Had the orchestrator emitted `wp:sgs/container > InnerBlocks(sgs/heading + sgs/text + sgs/button + image)`, even unregistered "section block" names would carry visible content because the inner atomic blocks ARE registered. The pattern composition is the protection against the failure mode you saw; the orchestrator skips it entirely.

Closure fix: rewrite the orchestrator stage 4-8 emission step to compose pattern wrappers with InnerBlocks holding registered atomic blocks selected by extracted-slot role (Phase 5a.2 classifier already maps roles).

### Truth 3 — Autonomy chain never fires in production

The whole point of Phase 5e (autonomy gate) was: when /sgs-clone surfaces an unregistered candidate, the bucket-c-classifier (5a.2) classifies its role, atomic-block-scaffold (5b.8) drops starter files into `src/blocks/<new-slug>/` and registers a row in `sgs-framework.db.blocks`, the operator-review HTML surfaces the gap for human polishing, and `/sgs-update` runs post-PASS to refresh the catalogue.

Live run evidence: 0 `scaffold-*` dirs under `pipeline-state/<run>/`. `unrecognised_section` bucket count: 0 (everything routed confidently, even fake names). The legacy orchestrator at `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` doesn't import or call 5a.2 OR 5b.8. The entire autonomy-and-scaffold chain Phase 5 built is unused.

Closure fix: wire bucket-c-classifier + atomic-block-scaffold into the orchestrator's stage 9 after leftover-bucket-router runs.

## Files + artefacts

### Phase 5 modules (all on origin/main)

- `plugins/sgs-blocks/scripts/recogniser/` — 5a + base recogniser scripts (10 files)
- `plugins/sgs-blocks/scripts/orchestrator/` — 5b/5c/5d/5e/5f modules (22 files)
- `plugins/sgs-blocks/scripts/orchestrator/schemas/stage-{1,2,3,4,6,7,9}.json` — per-stage validation schemas
- `tools/recogniser-v2/visual_qa_config.json` — 1% pass / 0.5% surface / 3 viewports

### Live E2E artefacts (preserved at `pipeline-state/mamas-munches-homepage-2026-05-13-055523/`)

- `stage-1.json` through `stage-9.json` — full per-stage outputs
- `full-page-markup.html` — 22 606 chars produced markup
- `operator-review.html` — gap-review surface
- `deliverable.md` — honest write-up of the run
- `screenshots/clone-{mobile,tablet,desktop}.png` — rendered sandybrown clone
- `screenshots/mockup-{mobile,tablet,desktop}.png` — mockup baseline
- `screenshots/parity-report.json` — pixel-diff JSON (max diff 0.8564)

### Skills + project docs touched

- `~/.claude/skills/sgs-clone/SKILL.md` — Pre-flight + Tool Bindings rebuilt with all 20 Phase 5 modules; `--resume` removed; cross-refs Spec 12/14 → Spec 15
- `~/.claude/commands/sgs-update.md` — Phase 5 module surface section added; FR21 mutation discipline note
- `~/.agents/skills/visual-qa/SKILL.md` — Phase 5e autonomy-gate dispatch section added
- 9 sgs/uimax SKILL.md files — Spec 13 → Spec 15 §8.1 (heading + canonical reference + bare refs)
- 5 live project docs (`architecture.md`, `goals.md`, `cloning-pipeline-flow.md`, root `CLAUDE.md`, `state.md`) — same Spec 12/13/14 → 15 collapse
- `.claude/plans/phase-5-clone-pipeline-e2e.md` — "Phase 5 overall acceptance" section updated with live-E2E scoreboard + sub-phase 5g closure path
- `.claude/plans/spec-15-master-execution-plan.md` — Phase 5 heading marked "MODULES SHIPPED; ACCEPTANCE NOT MET"
- `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` — frontmatter + §11.5 success-criteria checklist updated with live-E2E scoreboard

## Guardrails preserved end-to-end

- Drift validator 0/1343 PASS preserved across every commit
- Hero baseline `--verify-against tests/golden/hero-extraction-baseline.json` PASS preserved
- `feedback_dont_delegate_the_test_of_unproven_work` honoured — opened the rendered sandybrown URL with my own eyes before claiming closure (and refused to claim closure once visible)
- `feedback_qc_before_commit` honoured — 3-rater panels fired before every sub-phase commit; concrete concerns applied inline pre-commit

## Bean's two sharp follow-up questions (validated)

You asked at the end:
1. *"Isn't it supposed to make the blocks as it goes along and make new blocks before it marks itself as finished?"* — **Yes, per Phase 5b.8 + 5a.2.** Verified: the autonomy chain was NEVER WIRED into production. 0 `scaffold-*` dirs in the live run. The modules exist; the legacy orchestrator never composes with them.
2. *"Did it at least recognise the classes and make patterns wrapped in containers out of them?"* — **No.** Verified: every section emitted as a bare `<!-- wp:sgs/<block> /-->` with a `wp:html<style>` dump. No `wp:sgs/container` wrappers. No InnerBlocks composition. No atomic-block content. Hard Rule 3 documented but not implemented in the production emission path.

Both questions converge on the same architectural truth: the legacy production orchestrator is a v1 that contradicts the spec's Hard Rule 3 + ignores the registered-block existence check + skips the autonomy chain. That's the sub-phase 5g rewrite scope.

## Phase 5 closure path (sub-phase 5g, ~2 hr)

Defined in `.claude/plans/phase-5-clone-pipeline-e2e.md` steps 5g.1–5g.5:

1. **5g.1 (~15 min)** — Hard-gate `confidence-matrix.py` on `registered=True`. Layer-1 `/qc-inline`: synthetic boundary with registered + unregistered slugs; assert only registered surfaces.
2. **5g.2 (~30 min)** — Wire `bucket-c-classifier.py` + `atomic-block-scaffold.py --promote` into `sgs-clone-orchestrator.py:stage_9_report`. Layer-1 `/qc-inline`: synthesise unrecognised section; verify `scaffold-<slug>/` dir + sgs-framework.db `blocks` row.
3. **5g.3 (~45 min)** — Pattern-composition emission in `stage_4_5_6_7_8_extract`. Wrap every section in `wp:sgs/container` with InnerBlocks of registered atomic blocks (heading + text + button + image). Layer-1 `/qc-inline`: re-emit Mama's hero; verify markup contains the container + ≥ 2 inner atomic blocks.
4. **5g.4 (~30 min)** — Re-run live E2E. Deploy to sandybrown via `wp post create` (no `wp eval`; hook-blocked). Playwright screenshot at 375/768/1440. Pixel diff vs mockup. Targets: ≥ 90% mockup-USED-attr coverage + ≤ 1% pixel diff + 5/5 harness GREEN. Open URL with own eyes per `feedback_dont_delegate_the_test_of_unproven_work`.
5. **5g.5 (~15 min)** — Commit `feat(spec-15-p5g-orchestrator-rewrite): live E2E parity gate met` + 3-rater Layer-3 panel + `/handoff` for Phase 6.

After 5g closes: Phase 6 — Cross-platform output (~6-8 hr) — Bootstrap/Tailwind/shadcn/React/Node.js code generators using uimax `equivalent_implementations` + `design_tokens` cross-platform columns. Single commit `feat(spec-15-p6): cross-platform output generators`. Not blocking; extension phase.

## Next Session Prompt

See `.claude/next-session-prompt.md`. Starts with the resume command + Stage 5g step list + creds locations + the "open the URL with your own eyes" reminder.
