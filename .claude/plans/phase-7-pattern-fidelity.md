---
doc_type: phase-plan
parent_spec: .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md
project: small-giants-wp
title: Phase 7 — Pattern Fidelity (Pixel-Parity Gate Closure)
session_date: 2026-05-13
status: APPROVED — ready to execute next session
plan_label: PLAN: opus
recommended_model: opus
---

# Phase 7 — Pattern Fidelity

**USP:** Phase 6 Step 0 made the pipeline produce patterns end-to-end. Phase 7 makes the patterns produced ACTUALLY MATCH THE MOCKUP at the pixel level. Until this gate closes, every clone is a faithful structural copy but a styling mismatch. Closing it means the SGS Framework can clone any draft to a pixel-faithful WP site - the load-bearing capability that justifies the framework's existence vs Kadence / Spectra / GenerateBlocks.

**Plan label:** [PLAN: opus]
**Docscore:** B+ (estimated; refine after Stage 7 of phase-planner)
**Aggregate cost estimate:** ~$0.45 (1x Sonnet for composer rewrite, 1x Cerebras for theme template, 3x Sonnet for multi-rater QC, rest inline)

## Phase success criteria (done when)

- [ ] `compose_atomic_pattern()` emits `wp:core/group` wrappers preserving BEM child class hierarchy from source DOM
- [ ] New theme template `templates/clone-page.html` registered + selectable for cloned pages
- [ ] Pipeline wires `template` attribute on WP REST POST so cloned pages skip the global header/footer chrome
- [ ] `sgs/hero` extracted attrs cover every mockup-equivalent slot (or gap explicitly named in deliverable)
- [ ] Live E2E pixel diff ≤ 1% at 375 / 768 / 1440 viewports against Mama's homepage mockup
- [ ] Autonomy gate decides `auto-proceed` on the closing run
- [ ] +REGISTER fires, writes the final pattern set with PASS-quality artefacts
- [ ] Phase 5 marked CLOSED in state.md + decisions.md
- [ ] Commit `feat(spec-15-p7): pattern fidelity — pixel-parity gate met` on origin/main

## Entry context (read before starting)

- `.claude/state.md` — current phase status, blockers
- `.claude/decisions.md` (2026-05-13 Phase 6 Step 0 + Phase 5g entries — the architectural arc this session sits on top of)
- `.claude/plans/spec-15-master-execution-plan.md` (Phase 7 enters as the post-Phase-6 follow-up)
- `.claude/cloning-pipeline-flow.md` — the canonical 9-stage diagram
- `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` §6 (Stage 7 COMPOSE — InnerBlocks pattern), §8.1 (SGS-BEM regex), Hard Rule 3 / 4
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:compose_atomic_pattern` — the target of the BEM-hierarchy rewrite
- `plugins/sgs-blocks/scripts/orchestrator/register_patterns.py` — read to confirm pattern PHP output shape so the rewrite preserves +REGISTER input contract
- `theme/sgs-theme/patterns/about-image-left.php` — reference for canonical pattern PHP shape (uses `wp:columns` + `wp:column` for grid layouts)
- `theme/sgs-theme/templates/page.html` — current page template (read so the new `clone-page.html` knows what to omit)
- `sites/mamas-munches/mockups/homepage/index.html` — source mockup, walk it to identify BEM child classes the composer must preserve
- Live E2E from prior session: `pipeline-state/sgs-clone/mamas-munches-homepage-2026-05-13-105351/deliverable.md` — current parity baseline (64.9% / 43.7% / 36.5%)

## References

- Spec 15 Hard Rule 3 (patterns over single blocks): SKILL.md:66-70
- Spec 15 Hard Rule 4 (auto-derive slot list from block.json): SKILL.md:72-76
- Existing pattern `theme/sgs-theme/patterns/about-image-left.php` — reference shape for `wp:columns` + `wp:column` composition
- WP block-theme template part registration: standard `templates/<slug>.html` discovery
- WP REST API `template` attribute on page creation: standard `wp/v2/pages` payload key
- Prior decisions `decisions.md` 2026-05-13 Phase 6 Step 0 — pipeline integration architecture this builds on

## Tooling Index

| Type | Name | Used in |
|------|------|---------|
| skill | `/sgs-clone` | Step 4, 9 (full pipeline runs) |
| skill | `/sgs-wp-engine` | Step 5 (theme template work) |
| skill | `/wp-block-themes` | Step 5 (template registration) |
| skill | `/wp-block-development` | Step 8 (hero shape audit if block.json needs extending) |
| skill | `/visual-qa` | Optional 9-layer audit in Step 9 |
| skill | `/qc-inline` | After every step (mandatory) |
| skill | `/delegate` | Step 2, 5 (subagent model selection) |
| skill | `/subagent-prompt` | Step 2, 5 (cold prompts pre-written below) |
| skill | `/dispatching-parallel-agents` | Step 10 (multi-rater panel) |
| skill | `/handoff` | Step 12 (session close) |
| cli | git | Step 11 (commit + push) |
| cli | ssh (alias `hd`) | Step 5 deploy, Step 7 OPcache reset |
| cli | playwright via node | Step 9 visual-qa capture |
| mcp | playwright | Step 7 chrome verification |
| external | sandybrown WP REST API | Step 6 page POST, Step 9 update |

---

## Steps

```
Step 1 — Cold-start checks + verify Phase 6 Step 0 baseline
  Model:       inline
  Action:      Run drift-validator + register_patterns pytest + hero baseline + confidence-matrix sanity test to confirm prior phase state is intact.
  Files:       (read-only)
  Inputs:      .claude/state.md
  Outcome:     All 4 gates green; ready to mutate.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        5 min
  Tooling:     bash, pytest
  On-Fail:     If any gate fails, STOP. Surface to Bean. Do not mutate until baseline restored.
  Cold-Entry:  `.claude/state.md`, `.claude/plans/phase-7-pattern-fidelity.md`, `.claude/decisions.md` top entry
  Test:
    Happy:       `python plugins/sgs-blocks/scripts/drift-validator/validate.py` -> 0 violations
    Edge:        `python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py -q` -> 22 passed
    Fail:        `python tools/recogniser-v2/extract.py --mockup sites/mamas-munches/mockups/homepage/index.html --section .sgs-hero --block sgs/hero --verify-against tests/golden/hero-extraction-baseline.json` non-zero exit -> STOP
    Integration: `git status --short` confirms no uncommitted drift from prior session

Step 2 — Extend compose_atomic_pattern() to preserve BEM child class hierarchy
  Model:       sonnet
  Action:      Modify plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:compose_atomic_pattern to walk the source section DOM and emit wp:core/group {"className":"sgs-X__Y"} wrappers around groups of descendants that share a BEM child class. Inner atomic blocks (core/heading, core/paragraph, sgs/button, sgs/decorative-image) are nested inside these wp:core/group wrappers so the lifted CSS targeting .sgs-X__grid / .sgs-X__card binds correctly at render.
  Files:       plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py
  Inputs:      sites/mamas-munches/mockups/homepage/index.html (source DOM walk), theme/sgs-theme/styles/mamas-munches.css (verify which BEM children have rules - those are the load-bearing ones)
  Outcome:     compose_atomic_pattern emits the composition with at least one wp:core/group wrapper per detected BEM child class in the source section.
  Exec:        SEQUENTIAL
  Deps:        Step 1 green
  Marker:      (none)
  Time:        90 min (extended for source DOM walk + iterative refinement)
  Tooling:     Edit, bash (pytest)
  On-Fail:     If the rewrite breaks register_patterns pytest (22/22), revert + escalate inline.
  Prompt:      [Pre-written below in Step 2 Cold Prompt]
  Test:
    Happy:       Run extract on featured-product section; assert produced markup contains `<!-- wp:core/group {"className":"sgs-featured-product__grid"`
    Edge:        Section with NO BEM children (header with logo only) - composer falls back to current flat behaviour, no spurious wp:core/group wrappers
    Fail:        Malformed mockup with circular DOM reference (synthetic test) - composer caps recursion depth, returns None without crashing
    Integration: `python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py -q` still 22/22 passed; add new test: test_compose_atomic_pattern_preserves_bem_children

QA Gate — Composer test suite + drift validator
  Model:       inline
  Exec:        SEQUENTIAL
  Deps:        Step 2 complete
  Check:       `python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py -q && python plugins/sgs-blocks/scripts/drift-validator/validate.py`
  Pass:        Both commands exit 0; pytest reports 23+ passed (22 prior + new BEM test); drift validator 0 violations
  Fail:        Revert Step 2; re-dispatch with the failure detail in the prompt
  Marker:      QA

Step 3 — Live E2E delta measurement (composer-only delta)
  Model:       inline
  Action:      Re-deploy test page to sandybrown with the newly composed markup; capture screenshots at 3 viewports; pixel-diff vs mockup. Record the delta from the post-Step-2 baseline to gauge how much of the gap the composer fix closed.
  Files:       pipeline-state/<run-id>/
  Inputs:      Recent pipeline run output, sandybrown WP REST credentials
  Outcome:     New deliverable.md showing per-viewport diff post-composer-fix. Realistic expectation: diff drops to ~25-40% at 1440 (composer + lifted CSS now bind via __grid wrappers). Hero + WP chrome still inflate the diff at this point.
  Exec:        SEQUENTIAL
  Deps:        QA gate post-Step-2 green
  Marker:      (none)
  Time:        20 min
  Tooling:     bash (sgs-clone-orchestrator), WP REST API, Playwright
  On-Fail:     If diff INCREASES post-Step-2, revert Step 2; the composer change broke layout instead of fixing it.
  Test:
    Happy:       deliverable.md shows max_diff_ratio < 0.50
    Edge:        deliverable.md shows max_diff_ratio between 0.40 and 0.65 - composer closed some gap, hero + chrome still pending
    Fail:        deliverable.md shows max_diff_ratio > 0.65 - composer change hurt rather than helped
    Integration: Visually open the rendered URL with own eyes (feedback_dont_delegate_the_test_of_unproven_work) at desktop viewport; confirm featured-product section now lays out in columns

Step 4 — Create clone-page.html theme template
  Model:       cerebras
  Action:      Create new file theme/sgs-theme/templates/clone-page.html that renders post_content inside a minimal wp:group wrapper with no header / footer template parts. Register in theme.json templates list. The template is selected via WP REST `template` attribute when the pipeline creates a clone page.
  Files:       theme/sgs-theme/templates/clone-page.html (NEW), theme/sgs-theme/theme.json (MODIFY)
  Inputs:      theme/sgs-theme/templates/page.html (read first - canonical template body shape)
  Outcome:     New template registered; WP discovers it on theme refresh; selectable via Site Editor + WP REST.
  Exec:        SEQUENTIAL
  Deps:        Step 3 complete (don't pile changes during measurement)
  Marker:      (none)
  Time:        20 min
  Tooling:     Edit, Write
  On-Fail:     If theme.json validation fails, restore from git; do not deploy a broken theme.
  Prompt:      [Pre-written below in Step 4 Cold Prompt]
  Test:
    Happy:       File at theme/sgs-theme/templates/clone-page.html exists; contains `<!-- wp:post-content` and NO `<!-- wp:template-part {"slug":"header"`
    Edge:        Empty post_content - template still renders a valid page (no PHP fatal)
    Fail:        Theme activate fails - revert theme.json change
    Integration: `python plugins/sgs-blocks/scripts/sgs-update-uimax-sync.py` (or `/sgs-update` Stage 1 inventory) recognises the new template

Step 5 — Wire pipeline to set template attr on WP REST POST
  Model:       inline
  Action:      Modify plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py to set `template: 'clone-page'` in the WP REST POST payload that creates the clone page. (Currently the pipeline doesn't deploy the page itself - I've been creating pages manually with curl. Add a --deploy-to-sandybrown flag that pushes the page via REST with the new template attribute.)
  Files:       plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py
  Inputs:      Step 4 deliverable, ~/.openclaw/.secrets/wp-app-passwords.env
  Outcome:     Orchestrator can deploy clone page to sandybrown with template=clone-page; logs the new URL.
  Exec:        SEQUENTIAL
  Deps:        Step 4 complete
  Marker:      (none)
  Time:        30 min
  Tooling:     Edit, bash
  On-Fail:     If WP REST returns 401, regenerate app password via SSH (see prior decisions.md note). If 404 on template, confirm Step 4's template was deployed to sandybrown.
  Test:
    Happy:       `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup ... --deploy-to-sandybrown` returns 201 + the page URL
    Edge:        Re-running with the same slug - REST returns 200 with the existing page updated (idempotent)
    Fail:        Network failure mid-deploy - orchestrator surfaces the WP REST error; no partial state on sandybrown
    Integration: GET the page on sandybrown; verify `<body>` class lists `wp-page-template-clone-page` (or similar) confirming the template was applied

QA Gate — Clone page renders with no WP global chrome
  Model:       inline
  Exec:        SEQUENTIAL
  Deps:        Steps 4 + 5 complete
  Check:       Open the deployed page in Playwright at 1440 viewport; assert no `<header class="wp-block-template-part">` and no `<footer class="wp-block-template-part">` in the rendered DOM
  Pass:        Both elements absent; page top is the clone content, not the WP site header
  Fail:        WP chrome still present - check theme deploy ran + clear LiteSpeed cache + verify template attr landed in the post
  Marker:      QA

Step 6 — Re-deploy + measure parity post-template-fix
  Model:       inline
  Action:      Deploy theme update to sandybrown (tar + scp + OPcache reset), recreate test page with `template: clone-page`, capture + diff at 3 viewports. Expectation: diff drops further to ~15-25% at 1440 (WP chrome gone, sections styled, but hero composite still divergent).
  Files:       pipeline-state/<run-id>/
  Inputs:      Step 5 deliverable, sandybrown SSH access
  Outcome:     deliverable.md with reduced max_diff_ratio + updated screenshots
  Exec:        SEQUENTIAL
  Deps:        QA Gate after Step 5
  Marker:      (none)
  Time:        20 min
  Tooling:     bash, ssh, sgs-clone-orchestrator
  On-Fail:     If max_diff_ratio doesn't drop vs Step 3, the template attr isn't being applied. Re-verify via the QA gate output.
  Test:
    Happy:       deliverable.md max_diff_ratio < 0.30 (chrome gone + sections styled = step-change improvement)
    Edge:        Some viewport remains > 0.50 - identify which one; surface as a finding for Step 8 (hero) or Step 9 polish
    Fail:        max_diff_ratio unchanged from Step 3 - template wasn't applied; check sandybrown post template attr via WP REST GET
    Integration: Eyes-on review at desktop AND mobile viewports; confirm sections lay out per mockup AND WP chrome absent

Step 7 — Hero composite shape audit
  Model:       inline
  Action:      Run `python tools/recogniser-v2/extract.py --mockup sites/mamas-munches/mockups/homepage/index.html --section .sgs-hero --block sgs/hero --media-map sites/mamas-munches/research/sandybrown-media-map.json` and inspect the extracted attributes JSON. Cross-reference with what the mockup's hero ACTUALLY contains (CTA arrangement, label-above-headline order, split-column ratios, image proportions). Identify gaps: extracted-but-rendered-differently OR missing-from-extraction.
  Files:       (read-only audit) - if gaps found, MAY modify tools/recogniser-v2/data/role-templates.json OR a single extract strategy file
  Inputs:      sites/mamas-munches/mockups/homepage/index.html, plugins/sgs-blocks/src/blocks/hero/block.json, plugins/sgs-blocks/src/blocks/hero/render.php
  Outcome:     A short audit doc at `.claude/reports/phase-7-hero-audit.md` listing per-slot: extracted-value, mockup-value, match-status. Action items: (a) extraction-fix, (b) render-fix, (c) accept-as-known-gap.
  Exec:        SEQUENTIAL
  Deps:        Step 6 complete
  Marker:      (none)
  Time:        45 min
  Tooling:     bash, Read, Write
  On-Fail:     If the audit doesn't isolate a clear finding, park as P-S15-P7-HERO and proceed; hero may be a separate phase.
  Test:
    Happy:       Audit identifies <= 5 gaps with concrete fix proposals
    Edge:        Audit finds zero gaps - hero is already extracting everything; the diff is purely in the block's render.php (separate concern)
    Fail:        Audit reveals systemic extraction issue across all composite blocks - park; out of scope for Phase 7
    Integration: Run hero --verify-against tests/golden/hero-extraction-baseline.json post-any-fix; must still PASS

Step 8 — Apply hero fixes (only if audit identifies <= 3 quick-fix gaps)
  Model:       inline
  Action:      Apply the fixes from Step 7's audit. If gap is extraction-side, modify role-templates / extract strategy. If gap is render-side, modify hero/render.php with a deprecation match. If audit found > 3 gaps OR systemic issue, SKIP this step and park the work.
  Files:       (varies based on Step 7 audit) - likely tools/recogniser-v2/data/role-templates.json or plugins/sgs-blocks/src/blocks/hero/render.php
  Inputs:      .claude/reports/phase-7-hero-audit.md
  Outcome:     Hero rendering closer to mockup shape; hero --verify-against still PASS.
  Exec:        SEQUENTIAL
  Deps:        Step 7 audit
  Marker:      (none)
  Time:        45 min (if applied) OR 0 min (if skipped)
  Tooling:     Edit
  On-Fail:     If hero baseline test fails post-fix, revert the change. Hero golden baseline is sacred.
  Test:
    Happy:       Hero baseline PASS + visual diff at hero region (manual crop) reduces
    Edge:        Single attr fixed; baseline updated to incorporate the new behaviour
    Fail:        Hero baseline regresses - REVERT; record gap in parking instead
    Integration: Re-deploy + re-measure; per-viewport diff includes the hero improvement

Step 9 — Closing live E2E + parity gate measurement
  Model:       inline
  Action:      Full live E2E run with --clone-url + --deploy-to-sandybrown. Visual-qa captures at 3 viewports. Inspect deliverable.md.
  Files:       pipeline-state/sgs-clone/<run-id>/
  Inputs:      All prior steps complete
  Outcome:     deliverable.md emitted by autonomy gate. Hard pass criterion: max_diff_ratio <= 0.01 at ALL 3 viewports.
  Exec:        SEQUENTIAL
  Deps:        Steps 1-8 complete
  Marker:      (none)
  Time:        30 min
  Tooling:     bash, sgs-clone-orchestrator
  On-Fail:     If <= 0.01 not met at any viewport, iterate Steps 2 / 6 / 8 based on which symptom dominates. Phase does not close until the gate passes. NO partial closure (Bean's hard rule 2026-05-13).
  Test:
    Happy:       All 3 viewports report diff_ratio <= 0.01; autonomy decision = auto-proceed; +REGISTER fires
    Edge:        2 of 3 viewports pass; isolate the failing viewport; mobile is usually the hardest (smallest column gutters)
    Fail:        0 of 3 viewports pass - revisit the audit; the dominant cause is NOT what Steps 2/6/8 addressed
    Integration: Open the rendered page with own eyes at all 3 viewports; visually confirm parity (not just per-pixel)

Step 10 — Multi-rater QC panel
  Model:       sonnet + haiku + gemini-flash (parallel via /dispatching-parallel-agents)
  Action:      Dispatch 3 cold raters in parallel: Sonnet strict critic, Haiku sanity, Gemini Flash breadth. Each reads the new composer + clone-page template + the closing deliverable.md + a sample of 2 newly registered patterns. Gate: >= 2 of 3 pass/ship.
  Files:       (read-only review)
  Inputs:      Step 9 closing deliverable, .claude/reports/phase-7-hero-audit.md, updated pattern PHP files in theme/sgs-theme/patterns/
  Outcome:     Panel verdicts collected; if Sonnet flags real issues, apply fixes inline + re-run panel (per QC discipline).
  Exec:        PARALLEL with Step 11 prep (gathering files for commit)
  Deps:        Step 9 PASS
  Marker:      (none)
  Time:        25 min
  Tooling:     Agent tool (model=sonnet, model=haiku), bash gemini CLI
  On-Fail:     If 2+ raters return partial/fail, apply fixes inline before commit. Per qc-before-commit discipline (decisions.md 2026-05-12).
  Test:
    Happy:       3 ship verdicts
    Edge:        Sonnet returns fix-then-ship with concrete fixes - apply inline, re-run panel
    Fail:        2+ raters return hold - escalate to Bean; do not commit
    Integration: Panel output JSON saved to pipeline-state/phase-7-qc-panel-<date>.json

Step 11 — Commit + push + Phase 5 closure
  Model:       inline
  Action:      Stage all phase 7 changes (composer, theme template, hero audit + fixes, deliverable proof, decisions / state updates). Single commit feat(spec-15-p7): pattern fidelity - pixel-parity gate met. Push to origin/main. Update .claude/state.md current_subphase to phase-5-CLOSED + phase 7 SHIPPED.
  Files:       Phase 7 changes + .claude/state.md + .claude/decisions.md
  Inputs:      Step 10 ship verdict
  Outcome:     Commit on origin/main. Phase 5 officially closed.
  Exec:        SEQUENTIAL
  Deps:        Step 10 ship
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     git, Edit
  On-Fail:     If pre-commit hook blocks (visual-diff gate for any modified block.json), confirm whether the block edit was scoped to hero render or a scaffold; address per the hook's reported reason.
  Test:
    Happy:       git log shows new commit; git push reports success
    Edge:        Pre-commit hook fires on a touched src/blocks file - resolve per hook output (likely a hero deprecation needs adding)
    Fail:        Push rejected - rebase against origin/main, re-test, re-push
    Integration: GitHub PR view confirms the commit lands; CI (if any) green

Step 12 — /handoff for next phase
  Model:       inline
  Action:      Generate session handoff via /handoff. Update .claude/handoff.md + .claude/next-session-prompt.md to point at Phase 6 (cross-platform output) - the deferred spec-15 phase.
  Files:       .claude/handoff.md, .claude/next-session-prompt.md
  Inputs:      Step 11 commit hash
  Outcome:     Handoff doc ready; next session can cold-start on Phase 6.
  Exec:        SEQUENTIAL
  Deps:        Step 11 complete
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /handoff skill
  On-Fail:     /handoff failures are rare; surface inline if so.
  Test:
    Happy:       handoff.md + next-session-prompt.md both updated; session_tag set for Phase 6
    Edge:        next-session-prompt.md already exists from prior session - regenerate with phase 6 scope
    Fail:        /handoff skill crashes - generate the doc inline as a fallback
    Integration: Open the new next-session-prompt.md and verify it reads cleanly cold
```

---

## Step 2 Cold Prompt (pre-written for Sonnet dispatch)

```
You are a cold subagent. Task: extend compose_atomic_pattern() in
plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py to preserve BEM
child class hierarchy from the source DOM.

Read first (in order):
1. c:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py - the current compose_atomic_pattern() implementation (find the function, ~lines 250-350)
2. c:/Users/Bean/Projects/small-giants-wp/sites/mamas-munches/mockups/homepage/index.html - the inline `<style>` block + the source DOM. Note which BEM child classes have CSS rules: `.sgs-featured-product__grid`, `.sgs-featured-product__card`, `.sgs-ingredients-section__list`, `.sgs-gift-section__cards`, `.sgs-social-proof__testimonial`, `.sgs-footer__column`.
3. c:/Users/Bean/Projects/small-giants-wp/theme/sgs-theme/styles/mamas-munches.css - confirm which BEM children carry layout-bearing rules (grid-template-columns, display: grid/flex)
4. c:/Users/Bean/Projects/small-giants-wp/theme/sgs-theme/patterns/about-image-left.php - reference for canonical pattern PHP composition shape using wp:columns + wp:column (note: we'll use wp:core/group not wp:columns because the mockup uses CSS Grid not WP columns)
5. c:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py - the existing pytest suite (must stay 22/22 green; you'll add 1+ new tests)

Goal: when compose_atomic_pattern walks a source section's DOM, group descendants by their nearest BEM-child ancestor (`.sgs-<block>__<element>`). Emit a `wp:core/group {"className":"sgs-<block>__<element>"}` wrapper around each group of children that share a BEM-child class. Atomic blocks (core/heading, core/paragraph, sgs/button, sgs/decorative-image) nest INSIDE these wrappers.

Output requirements:
- File: plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py - modify compose_atomic_pattern() in place
- The function signature does not change: compose_atomic_pattern(mockup_path, selector, section_id, class_signature) -> str | None
- New behaviour: when walking descendants, detect BEM-child class membership via regex `^sgs-[a-z][a-z0-9-]*__[a-z][a-z0-9-]*(--[a-z][a-z0-9-]*)?$` on each element's class list. Group consecutive same-BEM-child descendants. Each group becomes a wp:core/group wrapper with className set to the BEM child class. Atomic emission happens INSIDE the wrapper.
- Edge case: an element with NO BEM-child class belongs to the outer container (no wp:core/group wrapper). The current flat behaviour is preserved for these.
- Edge case: nested BEM (e.g. `.sgs-X__grid` contains `.sgs-X__card` items) - the outer wp:core/group wraps the inner wp:core/group wrappers; depth preserved.
- Edge case: BEM modifier (`--state`) on a child - className includes the modifier. The class list might be `["sgs-X__grid", "sgs-X__grid--3-col"]` - className should be `"sgs-X__grid sgs-X__grid--3-col"`.

Add a NEW pytest at the bottom of plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py:
- def test_compose_atomic_pattern_preserves_bem_children(tmp_path)
- Build a synthetic HTML mockup with a section containing 2 BEM-child wrappers (`.sgs-X__grid` containing 3 `.sgs-X__card` items)
- Call compose_atomic_pattern with that mockup + section selector + class_signature
- Assert produced markup contains `wp:core/group {"className":"sgs-X__grid"`
- Assert it contains 3x `wp:core/group {"className":"sgs-X__card"` nested inside the grid wrapper
- Assert atomic blocks (core/heading, core/paragraph) are nested inside the __card wrappers, not the section root

After implementing, run:
  cd c:/Users/Bean/Projects/small-giants-wp && python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py -v --tb=short

Target: 23 passed (22 prior + 1 new). If any prior test breaks, the BEM-hierarchy logic has a regression - debug + fix inline.

Then run a smoke test by extracting Mama's featured-product section:
  python -c "import importlib.util as i, sys; s=i.spec_from_file_location('o','plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py'); m=i.module_from_spec(s); sys.modules['o']=m; s.loader.exec_module(m); from pathlib import Path; print(m.compose_atomic_pattern(Path('sites/mamas-munches/mockups/homepage/index.html'), 'section.sgs-featured-product', 'sgs-featured-product', ['sgs-featured-product']))"

Verify the produced markup contains `<!-- wp:core/group {"className":"sgs-featured-product__grid"`. If yes, the step is done.

Project conventions:
- UK English in comments + strings
- NO em-dashes (use hyphens or periods) - Hard Rule 9
- NO emojis
- Type hints on every function
- Python 3.13, sqlite3 stdlib, no extra deps
- No mocking; real assertions

When done, return the modified file path, the pytest summary line (expect 23 passed), and the smoke-test stdout showing the BEM-wrapper markup. If you hit any blocker, surface it; do NOT silently work around the spec.
```

## Step 4 Cold Prompt (pre-written for Cerebras dispatch)

```
You are a cold Cerebras subagent. Task: create a new WP block-theme template at theme/sgs-theme/templates/clone-page.html that renders post_content with NO header / footer template parts.

Read: c:/Users/Bean/Projects/small-giants-wp/theme/sgs-theme/templates/page.html - the existing page template. Study its structure. The new template is identical EXCEPT the `<!-- wp:template-part {"slug":"header"` and footer counterparts are removed.

Write to: c:/Users/Bean/Projects/small-giants-wp/theme/sgs-theme/templates/clone-page.html

The template must contain ONLY:
- A single `<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} -->` wrapper
- Inside it: `<!-- wp:post-content /-->` (renders the page's block content)
- Close the group

No header. No footer. No site nav. No top bar. Bare post_content rendered inside a main element with constrained layout (so post-content-internal blocks like wp:sgs/container still get their proper max-width).

Also update theme.json if needed:
- Read: c:/Users/Bean/Projects/small-giants-wp/theme/sgs-theme/theme.json
- WP discovers templates by file name in templates/. theme.json customTemplates may or may not need an entry - check the existing convention.
- If theme.json has `customTemplates`, add an entry: `{"name": "clone-page", "title": "Clone Page (no chrome)", "postTypes": ["page"]}`. If `customTemplates` is absent or templates are auto-discovered via file paths, leave theme.json untouched.

Validation:
- Run `python plugins/sgs-blocks/scripts/sgs-update-uimax-sync.py --self-test` if it exists, OR `cat theme/sgs-theme/templates/clone-page.html` and `cat theme/sgs-theme/theme.json | head -30` and visually confirm the new template body is valid block HTML.

Hard limits: stay under 12 tool rounds. Single template file + at most one theme.json edit.

Return: the new file path, the body of the template, and (if modified) the theme.json diff. Confirm no other files were touched.

NO em-dashes. NO emojis. UK English.
```

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** What block type wraps BEM child groupings in the composer?
  - **Options:** [A] `wp:core/group` with className matching the BEM child class / [B] `wp:columns` + `wp:column` like the existing about-image-left.php pattern / [C] new SGS-specific `wp:sgs/bem-wrapper` block
  - **Recommendation:** [A] wp:core/group with className
  - **Why:** wp:core/group is already registered; passes className through to rendered `<div class>`; the mockup CSS uses CSS Grid (display: grid) which is more flexible than wp:columns' flex-based layout; no new block to scaffold + promote
  - **Cost of wrong choice:** If we picked [B], wp:columns enforces flex layout which would override the mockup's CSS Grid rules; if [C], we add scaffold-bloat for no semantic benefit
  - **Who decides:** architect (already chose [A])

- **Decision:** Should the clone-page.html template have ANY chrome (e.g. a minimal site logo) or be fully bare?
  - **Options:** [A] Fully bare - just `<main>` + post_content / [B] Minimal - just the SGS site logo top-left, nothing else / [C] Adaptive - operator chooses per-deploy via a post meta flag
  - **Recommendation:** [A] Fully bare
  - **Why:** Phase 7's gate is pixel parity vs mockup. Mockup HAS its own header section (registered as the sgs/header pattern). Any chrome in the template duplicates content + inflates diff. Real client pages can switch to the standard page.html template post-launch.
  - **Cost of wrong choice:** [B] adds duplicate logo (mockup has its own); [C] adds operator complexity for a 1-time configuration
  - **Who decides:** architect (already chose [A])

- **Decision:** What's the threshold for accepting hero shape gaps as "park for next phase" vs "fix in Step 8"?
  - **Options:** [A] Fix up to 3 gaps inline, park anything beyond / [B] Fix every gap regardless of count / [C] Park hero entirely; accept current diff
  - **Recommendation:** [A] Fix up to 3 inline
  - **Why:** Hero is composite-single-block (Hard Rule 6 exception); its render.php IS the pattern. Three quick fixes can usually be done in 45 min without destabilising the baseline. Beyond 3, the audit revealed systemic issue better handled separately.
  - **Cost of wrong choice:** [B] could blow out Phase 7 time budget; [C] leaves hero as the residual symptom
  - **Who decides:** architect (already chose [A], with hard-stop fallback to park if baseline regresses)

### Pre-emptive decisions (planner-surfaced; no parallel hidden-decisions dispatch in this short plan)

- **Decision:** What if the BEM-hierarchy fix breaks existing register_patterns idempotency tests?
  - **Recommendation:** Tests must stay 22/22 green. If they break, the new BEM logic produces markup the existing PHP-file-exists guard or block_markup-equality compare doesn't tolerate. Most likely fix: the new logic produces a longer markup string, so a test asserting exact-string equality fails. Update the test to match the new markup OR ensure the new logic produces a superset of the old markup, not a different markup.
  - **Why:** the existing 22 tests are the regression contract for everything Phase 6 Step 0 shipped. They lock the invariants.

- **Decision:** What if the live E2E in Step 9 reaches max_diff ~2-3% (close but not ≤1%)?
  - **Recommendation:** Halt at Step 9 PASS-or-FAIL. If 1.5-3%, write a "next 1%" mini-plan inline + iterate Steps 2/6/8. If >3%, the audit was incomplete; re-do Step 7.
  - **Why:** Bean's hard rule (2026-05-13): no partial closure. The ≤1% gate is the only gate that closes Phase 5.

- **Decision:** If a single viewport (likely mobile) is the hold-out, do we fix it or accept?
  - **Recommendation:** Fix it. The hard rule says ≤1% at ALL 3 viewports. Mobile gutters are tight but mockup mobile CSS is in the lifted file - issues there usually trace to a `--Mobile` suffix attribute the composer didn't pick up.
  - **Why:** mobile-first responsive design is in Bean's global rules (`~/.claude/rules/visual-standards.md`); accepting mobile diff would violate framework discipline.

- **Decision:** Should hero render.php be modified, or is the hero gap purely extraction-side?
  - **Recommendation:** Audit-driven (Step 7). Most likely: 50/50 split. Some gaps are missing attrs the extractor didn't pick up; others are render-side (block.json supports it but render.php arranges it differently). Address each per its actual root cause.
  - **Why:** the hero is the canonical SGS composite block; its render.php is well-trodden. Render-side changes need a deprecation match (Spec 15 Stage 8 SERIALISE gate) so existing posts don't regress.

---

## Aggregate cost estimate

| Step | Model | Est tokens | Est cost |
|---|---|---|---|
| 1 | inline | 0 | $0 (main thread) |
| 2 | sonnet | 30k | $0.09 |
| 3 | inline | 0 | $0 |
| 4 | cerebras | 8k | $0 (free tier) |
| 5 | inline | 0 | $0 |
| 6 | inline | 0 | $0 |
| 7 | inline | 0 | $0 |
| 8 | inline | 0 | $0 |
| 9 | inline | 0 | $0 |
| 10 | sonnet + haiku + gemini-flash | 60k total | $0.18 (sonnet) + $0 (haiku/flash) |
| 11 | inline | 0 | $0 |
| 12 | inline | 0 | $0 |
| **Total** | | ~98k | **~$0.27** |

Mostly inline work + 2 subagent dispatches. Conservative bound: <$0.50 even with re-runs.

## Phase entry preconditions

- Phase 6 Step 0 SHIPPED at commit d0d30579 on origin/main ✅
- 22/22 register_patterns pytest green ✅
- Drift validator 0 violations ✅
- Hero --verify-against baseline PASS (last verified post-Phase-5g) ✅
- Live E2E demonstrated with --clone-url; baseline diffs 64.9% / 43.7% / 36.5% ✅
- 5 patterns auto-registered in canonical sgs-db + uimax + theme/sgs-theme/patterns/ ✅

## Phase exit conditions

- ≤1% pixel diff at 375 / 768 / 1440 in a live E2E run ✅ (required)
- Autonomy decision = auto-proceed on the closing run ✅ (consequential)
- +REGISTER fires + updates the patterns with PASS-quality artefacts ✅ (consequential)
- Phase 5 marked CLOSED ✅ (required)
- Phase 6 (cross-platform output) next-session-prompt ready ✅ (required)
