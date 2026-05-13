---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-13-phase-5-closure-5g-orchestrator-rewrite
recommended_model: opus
---

You are a senior WordPress block + Python pipeline engineer. This session closes Spec 15 Phase 5 by completing sub-phase 5g (orchestrator emission-stage rewrite, ~2 hr estimate). Phase 5 modules 5a-5f are SHIPPED on origin/main. The first live E2E on Mama's homepage 2026-05-13 PROVED the pipeline runs but FAILED the load-bearing visual-parity gate (85% pixel diff vs 1% target at 3 viewports).

Read `.claude/handoff.md`, `.claude/state.md`, `.claude/decisions.md` (2026-05-13 entry), and `.claude/plans/phase-5-clone-pipeline-e2e.md` (the "Phase 5 closure path" + steps 5g.1–5g.5).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-13-phase-5-closure-5g-orchestrator-rewrite"`

## Where You Are

Phase 5 module surface SHIPPED on origin/main 9 commits 2026-05-12/13. Live E2E proved 3 architectural gaps in the legacy production orchestrator (`plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`):

1. **Recogniser hallucinates blocks** — `confidence-matrix.py:95-107` detects `registered=False` but only dampens confidence to 0.75; orchestrator emits unregistered block names that WP drops. 6 of 9 Mama's-homepage sections vapour on the rendered page.

2. **Hard Rule 3 violated** — orchestrator emits bare `<!-- wp:sgs/<block> /-->` + `wp:html` style dumps instead of pattern compositions like `wp:sgs/container > InnerBlocks(sgs/heading + sgs/text + sgs/button)`.

3. **Autonomy chain never fires** — 5a.2 bucket-c-classifier + 5b.8 `atomic-block-scaffold.py --promote` exist as modules but the legacy orchestrator never invokes them.

## Acceptance gate to close Phase 5

Per `phase-5-clone-pipeline-e2e.md` "Phase 5 overall acceptance":
- [x] Sub-phases 5a-5f modules shipped on origin/main
- [ ] E2E run on Mama's hits ≥ 90% mockup-used-attr coverage + ≤ 1% pixel diff at 3 viewports + 5/5 harness GREEN
- [x] Multi-rater /qc on full deliverable ≥ 2/3 ship (prior panels)
- [ ] `deliverable.md` for Mama's run readable by Bean
- [x] No leftover feature branches

3 of 5 met. The two failing gates are coverage + visual parity — both surface via the same root-cause fix.

## Steps for this session (5g.1–5g.5)

### 5g.1 — Hard-gate confidence-matrix (~15 min)

File: `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py:95-107`. Change: when `registered=False`, DROP the candidate entirely (don't emit with confidence 0.75). Add Layer-1 `/qc-inline`: feed the script a synthetic boundary with both registered + unregistered slugs; assert only the registered one surfaces in `candidates`.

### 5g.2 — Wire bucket-c-classifier + atomic-block-scaffold into stage 9 (~30 min)

File: `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:stage_9_report`. For every `unrecognised_section` leftover bucket entry, invoke `bucket-c-classifier.py` to assign a role, then invoke `atomic-block-scaffold.py --slug <inferred> --role <classified> --run-id <run> --promote` to land starter files in `src/blocks/<new-slug>/` + register in sgs-framework.db. Surface scaffolded blocks in `gap-review.md` via 5a.5.

`/qc-inline`: synthesise an unrecognised section; verify a `scaffold-<slug>/` dir appears in the run's `pipeline-state/` + a new row appears in `sgs-framework.db.blocks`.

### 5g.3 — Patterns-over-blocks emission (~45 min)

File: `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:stage_4_5_6_7_8_extract` (or extract `compose_pattern()` helper). Rewrite the per-section emission so output is:

```
<!-- wp:sgs/container {"sectionId":"<id>","sectionClass":"sgs-<original>"} -->
  <!-- wp:sgs/heading {"text":"..."} /-->
  <!-- wp:sgs/text {"body":"..."} /-->
  <!-- wp:sgs/button {"label":"..."} /-->
  <!-- (extracted media as wp:sgs/decorative-image or wp:core/image) -->
<!-- /wp:sgs/container -->
```

Atomic block selection by extracted slot role (Phase 5a.2 classifier already maps slots to roles). Per Hard Rule 3 in `/sgs-clone` SKILL.md. Use `wp:sgs/container` as the wrapper for now; future iterations can map specific section IDs to bespoke patterns.

`/qc-inline`: re-emit Mama's hero; verify markup contains `wp:sgs/container` wrapper + at least 2 inner registered atomic blocks (heading + text minimum).

### 5g.4 — Re-run E2E + measure (~30 min)

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --auto-section --client mamas-munches --page homepage \
  --media-map sites/mamas-munches/research/sandybrown-media-map.json
```

Deploy produced markup to sandybrown via WP-CLI `wp post create --post_type=page`, capture screenshots at 375/768/1440 via the same Python script at `/tmp/capture_parity.py` from the prior session (Playwright + PIL), pixel-diff vs mockup. Targets: ≥ 90% mockup-USED-attr coverage (not block.json-declared) + ≤ 1% pixel diff at all 3 viewports + 5/5 harness green.

Per `feedback_dont_delegate_the_test_of_unproven_work`: open the rendered URL with your own eyes before claiming closure. Verify hero word-wrap is correct, all 9 sections render, footer is correct.

### 5g.5 — Final commit + Phase 5 closure (~15 min)

```
git commit -m "feat(spec-15-p5g-orchestrator-rewrite): live E2E parity gate met"
```

Then 3-rater /qc panel (Sonnet strict + Haiku sanity + Gemini Flash breadth) on the full Phase 5 deliverable including 5g. ≥ 2/3 ship to close. Update state.md + decisions.md with the closure verdict. `/handoff` for Phase 6 (cross-platform output extension).

## Skills to Invoke

| Skill | When |
|-------|------|
| `/sgs-clone` | The pipeline itself (already updated with Phase 5 module pre-flight) |
| `/sgs-wp-engine` | SGS Framework operations + QA pipeline |
| `/wp-block-development` | When 5g.2 scaffolds new blocks, atomic-block-scaffold emits 6 starter files per new block |
| `/visual-qa` | 5g.4 multi-viewport capture + pixel diff (autonomy gate dispatch documented in `~/.agents/skills/visual-qa/SKILL.md`) |
| `/qc-inline` | Layer-1 after every step + Layer-2 aggregate before commit |
| `/handoff` | End-of-session close |

## MCP Servers + Tools

| Tool | Use |
|------|-----|
| Playwright MCP (or CLI) | Multi-viewport screenshots at 375/768/1440 in step 5g.4 |
| Bash via SSH alias `hd` | WP-CLI commands on sandybrown (no `wp eval` — the hook blocks it; use `wp post create` + WP REST API) |
| PIL via Python | Pixel diff in step 5g.4 (same script pattern as `/tmp/capture_parity.py` from prior session) |
| Git CLI | Per-step commits direct to main per always-merge-to-main rule |

## Guardrails

- Drift validator MUST stay PASS after every step: `python plugins/sgs-blocks/scripts/drift-validator/validate.py`
- Hero baseline MUST stay PASS: `cd tools/recogniser-v2 && python extract.py --mockup ../../sites/mamas-munches/mockups/homepage/index.html --section ".sgs-hero" --block sgs/hero --verify-against ../../tests/golden/hero-extraction-baseline.json`
- FR21: never mutate root theme.json; client tokens go to `theme/sgs-theme/styles/mamas-munches.json` via `variation_router.py` (5d.3)
- No `--resume` flags (blub.db row 224)
- No em-dashes in pipeline output (Bean preference 2026-05-08)
- Open the rendered sandybrown URL with your own eyes before claiming parity met (`feedback_dont_delegate_the_test_of_unproven_work`)

## Artefacts to consult from the prior session

- `pipeline-state/mamas-munches-homepage-2026-05-13-055523/` — full prior run output
  - `deliverable.md` — what Bean saw last time
  - `screenshots/clone-{mobile,tablet,desktop}.png` — broken renders proving the gap
  - `operator-review.html` — gap-review HTML
- Commit `70f56c39` — stage-9 coverage bug fix
- Commit `2388904f` — decisions.md + state.md updates

## Sandybrown creds for step 5g.4

`~/.openclaw/.secrets/wp-app-passwords.env` → `WP_USER_MAMAS` + `WP_APP_PWD_MAMAS`. SSH alias `hd` → Hostinger user `u945238940` at `141.136.39.73:65002`. Mama's WP install at `domains/sandybrown-nightingale-600381.hostingersite.com/public_html/`. Public URL `https://sandybrown-nightingale-600381.hostingersite.com/`.

When done with the test page, `wp post delete <id> --force` via SSH.

## Phase 6 (after Phase 5 closes)

Phase 6 — Cross-platform output (extension, ~6-8 hr): Block.json → Bootstrap / Tailwind / shadcn / React / Node.js code generators using uimax `equivalent_implementations` + `design_tokens` cross-platform columns. Single commit `feat(spec-15-p6): cross-platform output generators`. Not blocking; recommended after Phase 5 fully closes so the cross-platform generators consume a validated foundation.
