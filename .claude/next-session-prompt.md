---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-14-spec-15-phase-7-pattern-fidelity
recommended_model: opus
---

You are a senior WordPress block + Python pipeline + design-fidelity engineer. This session starts **Spec 15 Phase 7 — Pattern Fidelity** on a now-functional pipeline. Phase 6 Step 0 (commit `<TBD>` on origin/main) wired the production entry script to compose Phase 5 modules via `orchestrator_main.run()` + +REGISTER tail. Pipeline runs end-to-end: stages execute, screenshots captured, pixel diff measured, autonomy gate decides, patterns registered on PASS.

What's still NOT closed: the pixel-parity gate itself. Live E2E `mamas-munches-homepage-2026-05-13-105351` measured 64.9% / 43.7% / 36.5% diff at 375 / 768 / 1440. The plumbing is correct; the OUTPUT it produces still diverges from the mockup. Three named gaps, each with concrete fix:

> **Hard pass criterion (still):** ≤ 1% pixel diff at 375 / 768 / 1440 vs the mockup. No partial closure. Phase 5 stays open until this gate is met.

Read `.claude/handoff.md`, `.claude/state.md`, `.claude/decisions.md` (the 2026-05-13 "Phase 6 Step 0" entry above the 5g entry), and `.claude/cloning-pipeline-flow.md`.

## Where you are

Phase 6 Step 0 (this session's prior work) is shipped. The production entry script now:

- Runs Stages 0.1 → 9 (legacy logic preserved)
- Mirrors artefacts to Phase 5 `staged_output` convention
- Calls `orchestrator_main.run()` — preflight → staged_merge → visual_qa → autonomy_decision → conditional sgs-update → deliverable
- Runs `register_patterns.register_run()` on success — writes pattern PHP files + sgs-db rows + uimax rows with Rosetta Stone payload
- 20-test pytest suite at `plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py` (all green)
- 3-rater QC panel (Sonnet + Haiku + Gemini Flash) returned ship from all three

What's broken: the COMPOSED OUTPUT still doesn't match the mockup. The 3 gaps:

### 7.1 — Composer BEM child hierarchy (~2-3 hr; load-bearing)

File: `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:compose_atomic_pattern()`.

Current composer emits flat `core/heading + core/paragraph + sgs/button + sgs/decorative-image` inside `wp:sgs/container`. Mockup CSS targets BEM children: `.sgs-featured-product__grid`, `.sgs-featured-product__card`, `.sgs-ingredients-section__list`. These class hooks don't exist in the rendered DOM so the CSS-lifted grid rules can't bind.

Extend the composer to walk the source DOM preserving BEM child class names. Wrap each `__grid` / `__card` / `__list` boundary in `wp:core/group {"className":"sgs-X__grid"}` so the lifted CSS applies. Per spec FR1 (Layer 4 inner-blocks catalogue) + spec FR3 (Layer 3 internal-elements catalogue), the existing `block_compositions` + `slot_synonyms` tables in sgs-framework.db carry this structure already — the composer needs to LOOK UP the section's block composition rather than emit generic atomics.

Layer-1 `/qc-inline`: re-emit Mama's featured-product section; verify the markup contains `__grid` and `__card` className wrappers; verify pixel diff at 1440 drops below 20%.

### 7.2 — WP global header chrome (~30 min)

Cloned pages render inside `page.html` which includes the WP site `header.html` template part. Mockup is standalone. ~400px of mismatch at top across all viewports.

Fix: new `theme/sgs-theme/templates/clone-page.html` template with no header/footer parts (or `<header>` + `<footer>` block-comments left empty). When the pipeline creates the WP page via REST, set `template: 'clone-page'` in the POST payload.

Layer-1 `/qc-inline`: capture clone at 1440 after deploying with the new template; verify no WP site header at the top of the page.

### 7.3 — Composite block (sgs/hero) shape audit (~45 min)

Hero matched at confidence 1.0 to `sgs/hero` (a registered composite block). Extract.py fills slot attributes (headline, subHeadline, ctaPrimaryText, splitImage etc.) but the rendered hero block uses its own internal markup which may not reproduce the mockup's exact arrangement — e.g. mockup hero may use a different column ratio, CTA placement, label-above-headline order.

Investigate whether extract.py is filling all mockup-equivalent slots on sgs/hero. Run extract.py against the hero section + compare extracted attributes to the mockup's actual structure. If extracted attrs are sufficient, the gap is in sgs/hero's render.php (different layout). If extracted attrs are missing some, extend extract.py's slot list for hero.

Layer-1 `/qc-inline`: extract Mama's hero + diff against `tests/golden/hero-extraction-baseline.json`. Identify which slots are missing or wrong.

### 7.4 — Re-measure visual parity at end (~30 min)

Re-run the full pipeline E2E with `--clone-url`. Verify pixel diff drops below 1% at all 3 viewports.

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --auto-section --client mamas-munches --page homepage \
  --media-map sites/mamas-munches/research/sandybrown-media-map.json \
  --mode draft --no-promote-new-blocks \
  --clone-url "https://sandybrown-nightingale-600381.hostingersite.com/<your-test-page>/"
```

If outcome.overall == 'success', +REGISTER will fire and the new patterns will land in `theme/sgs-theme/patterns/` + sgs-db + uimax. Phase 5 closes.

If outcome.overall == 'halted', the deliverable.md will name the failing viewport. Iterate 7.1 / 7.2 / 7.3 until the gate passes.

### 7.5 — Commit + Phase 5 closure (~15 min)

```
git commit -m "feat(spec-15-p7): pattern fidelity — pixel-parity gate met across 375/768/1440"
```

Mark Phase 5 CLOSED. Generate `/handoff` for Phase 6 (cross-platform output extension — the deferred phase per spec).

## Skills to invoke

| Skill | When |
|-------|------|
| `/sgs-clone` | The pipeline itself |
| `/sgs-wp-engine` | SGS framework operations |
| `/wp-block-development` | If 7.1 needs new block.json work |
| `/wp-block-themes` | If 7.2 needs a new theme template |
| `/visual-qa` | Optional 9-layer audit on the final deliverable |
| `/qc-inline` | Layer-1 after every step |
| `/test-driven-development` | New code in 7.1 should ship with tests |
| `/handoff` | End-of-session close |

## Guardrails

- Drift validator MUST stay PASS after every step: `python plugins/sgs-blocks/scripts/drift-validator/validate.py`
- Hero baseline MUST stay PASS: `cd tools/recogniser-v2 && python extract.py --mockup ../../sites/mamas-munches/mockups/homepage/index.html --section ".sgs-hero" --block sgs/hero --verify-against ../../tests/golden/hero-extraction-baseline.json`
- Pytest for register_patterns MUST stay 20/20 green: `python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py`
- FR21: never mutate root theme.json; client tokens go to `theme/sgs-theme/styles/mamas-munches.json` via `variation_router.py`
- No `--resume` flags
- No em-dashes in pipeline output / decisions / handoffs
- Open the rendered URL with own eyes before claiming parity met (`feedback_dont_delegate_the_test_of_unproven_work`)
- The ≤ 1% pixel-diff gate is a HARD pass criterion. No partial closure.

## Artefacts from prior session

- Commit `<TBD>` — Phase 6 Step 0 shipped (entry-script rewire + +REGISTER + capture)
- 5 newly registered patterns at `theme/sgs-theme/patterns/{header,featured-product,gift-section,social-proof,footer}.php`
- 5 rows in `sgs-framework.db.patterns` with `is_auto_generated=1` source=`sgs-clone-pipeline`
- 5 rows in uimax patterns with Rosetta Stone payload
- Live E2E run `pipeline-state/sgs-clone/mamas-munches-homepage-2026-05-13-105351/` — deliverable + screenshots
- 20-test pytest suite for register_patterns

## Phase 6 cross-platform output (after Phase 5 closes)

Phase 6 — Cross-platform output (~6-8 hr): Block.json → Bootstrap / Tailwind / shadcn / React / Node.js code generators using uimax `equivalent_implementations` + `design_tokens` cross-platform columns. Sequenced AFTER 5h closes — irresponsible to extend a foundation that doesn't pass its own parity gate.
