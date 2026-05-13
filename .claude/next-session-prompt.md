---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-14-spec-15-phase-5h-styling-parity
recommended_model: opus
---

You are a senior WordPress block + Python pipeline engineer + design-fidelity engineer. This session opens **Spec 15 Phase 5h** — the styling parity gap that 5g.1-5g.3 (shipped commit `e8478a33` on origin/main) exposed but did not close. Phase 5 remains OPEN at 5h until the hard pass criterion is met:

> **Hard pass criterion (Bean confirmed 2026-05-13):** ≤ 1% pixel diff at 375 / 768 / 1440 viewports vs the mockup. No partial closure. No "structural is enough" softening.

Read `.claude/handoff.md`, `.claude/state.md`, `.claude/decisions.md` (2026-05-13 Spec 15 Phase 5g entry — the "Phase 5h" subsection), and `.claude/plans/phase-5-clone-pipeline-e2e.md`.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-14-spec-15-phase-5h-styling-parity"`

## Where you are

Phase 5g (commit `e8478a33`) closed the load-bearing **structural** defect:
- `confidence-matrix.py` now hard-gates unregistered slugs (drops to `core/group`).
- `sgs-clone-orchestrator.py` has a stage 9b autonomy chain that scaffolds + promotes new blocks via FR21.
- The deferred-fallback branch in stage 4 now emits a `wp:sgs/container` atomic-pattern composition (core/heading + core/paragraph + sgs/button + sgs/decorative-image) instead of skipping.

Live E2E `mamas-munches-homepage-2026-05-13-074854`: all 9 sections render with content (vs prior 3 of 9). 5/5 acceptance harness GREEN. 6 blocks scaffolded + promoted (header / featured-product / ingredients-section / gift-section / social-proof / footer). Bean's-own-eyes verification confirmed via sandybrown deploy.

**What 5g did NOT fix:** styling fidelity. The composer emits default `sgs/container` layouts. The mockup uses bespoke column grids, decorative backgrounds, custom typography sizing. Pixel diff at 3 viewports remains significantly above 1%.

## What 5h must close

### 5h.1 — Composer CSS-mapping extension (~2-3 hr; load-bearing)

File: `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:compose_atomic_pattern()`.

Extend the composer to extract bespoke layout intent from the source mockup CSS and map onto `sgs/container` attributes:
- Column structure (1 / 2 / 3 / 4 columns) → `container.layout = "columns"` + `columns = N`
- Gap → `container.gap`
- Padding → `container.paddingTop/Right/Bottom/Left`
- Background colour → `container.backgroundColor` (must resolve to a palette token via `_client_variation_path()` overlay)
- Decorative backgrounds (pseudo-elements ::before / ::after) → either map to `sgs/decorative-image` siblings OR promote to a new `sgs-<slug>` block with the bespoke decoration baked in

Inputs: mockup HTML + parsed CSS. The composer currently calls `bs4` only for HTML walk; you'll need to add a CSS parser (`tinycss2` or `cssutils`) and resolve computed styles per section.

Layer-1 `/qc-inline`: feed Mama's featured-product section (`section.sgs-featured-product` in mockup) and verify the emitted container carries `columns=3` (zookies / single-product / trial-pack split), `backgroundColor` token matching mockup's surface-pink, and at least one inner `sgs/decorative-image` for the cookie photography.

### 5h.2 — Coverage-metric redesign (~30-45 min)

File: `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:stage_9_report` (the `coverage_by_boundary` block).

Split the denominator into TWO metrics:
- **block_slot_coverage** — slots declared in the matched block's `block.json` that were filled from extract (current behaviour, only meaningful when matched block ≠ core/group)
- **atomic_composition_coverage** — atomic-content elements (heading / paragraph / button / image) the composer emitted from the section DOM, vs total atomic elements present in source

Aggregate scoring uses both metrics with explicit labels. The composite "coverage" line in the operator-review HTML must show both numbers separately so the gate is readable.

Layer-1 `/qc-inline`: re-run pipeline on Mama's; verify deferred-composed sections (b1, b4, b6, b7, b8, b9) now report meaningful `atomic_composition_coverage` ratios instead of `0/0`.

### 5h.3 — Scaffold polish + inserter gating (~30 min)

For each of the 6 scaffold-grade blocks (`0.1.0-scaffold`) at `plugins/sgs-blocks/src/blocks/{header,featured-product,ingredients-section,gift-section,social-proof,footer}/`:

Either:
- Set `"supports": {"inserter": false}` in `block.json` while version remains `0.1.0-scaffold` — they stay registered (so previously-scaffolded references resolve) but don't pollute the inserter.
- OR add `_scaffold` suffix to the title (`"Header (scaffold)"`) so operators can see they're stubs.

`atomic-block-scaffold.py:_block_json_payload` already emits the `0.1.0-scaffold` version; extend it to add `"supports": {"inserter": false}` by default when role=text-content. Layer-1 `/qc-inline`: scaffold a synthetic block, verify `inserter: false` lands in block.json.

### 5h.4 — Live E2E + visual parity measurement (~45 min)

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --auto-section --client mamas-munches --page homepage \
  --media-map sites/mamas-munches/research/sandybrown-media-map.json
```

Deploy markup to sandybrown via WP REST API (use a fresh app password — the one in `~/.openclaw/.secrets/wp-app-passwords.env` is stale; create a new one via SSH: `ssh -p 65002 u945238940@141.136.39.73 "cd domains/sandybrown-nightingale-600381.hostingersite.com/public_html && wp user application-password create 1 'Claude-MCP-spec15-p5h' --porcelain"`).

Screenshot at 375 / 768 / 1440 via Playwright. Pixel-diff vs the mockup using PIL `Image.open(...).getpixel((x, y))` or `pixelmatch` from `~/.agents/skills/visual-qa/scripts/screenshot-diff-helper.js`.

**HARD GATE: ≤ 1% pixel diff at ALL 3 viewports.** No softening. Per Bean's directive.

Open the rendered URL with your own eyes (`feedback_dont_delegate_the_test_of_unproven_work`). Verify every section: hero proportions, featured-product column layout, ingredients grid, gift-section split, social-proof testimonial cards, footer columns.

### 5h.5 — Final commit + Phase 5 closure (~15 min)

```
git commit -m "feat(spec-15-p5h): styling parity ≤1% pixel-diff gate met across 375/768/1440"
```

If the gate is met: update `.claude/state.md` to `current_subphase: phase-5-CLOSED`. Generate `/handoff` for Phase 6 (cross-platform output extension).

If the gate is NOT met: iterate. Phase 5 does not close. Do not soft-close.

## Skills to invoke

| Skill | When |
|-------|------|
| `/sgs-clone` | The pipeline itself |
| `/sgs-wp-engine` | SGS framework operations |
| `/wp-block-development` | If scaffold polish requires real block.json edits |
| `/visual-qa` | 5h.4 multi-viewport capture + pixel diff |
| `/qc-inline` | Layer-1 after every step |
| `/library-docs tinycss2` or `/library-docs cssutils` | CSS parser choice for 5h.1 |
| `/handoff` | End-of-session close |

## MCP + Tools

| Tool | Use |
|------|-----|
| Playwright MCP (or fresh-Chromium CLI per Section P1) | Multi-viewport screenshots in 5h.4 — fresh Chromium is canonical |
| PIL via Python | Pixel diff |
| `scripts/screenshot-diff-helper.js` | Alternative + visual diff heatmap |
| SSH alias `hd` | WP-CLI on sandybrown |
| Git CLI | Per-step commits direct to main |

## Guardrails

- Drift validator MUST stay PASS after every step: `python plugins/sgs-blocks/scripts/drift-validator/validate.py`
- Hero baseline MUST stay PASS: `cd tools/recogniser-v2 && python extract.py --mockup ../../sites/mamas-munches/mockups/homepage/index.html --section ".sgs-hero" --block sgs/hero --verify-against ../../tests/golden/hero-extraction-baseline.json`
- FR21: scaffold-grade blocks (`0.1.0-scaffold`) skip the visual-diff pre-commit gate; polished blocks (version >= 1.0) require the standard passing report.
- FR21: never mutate root theme.json; client tokens go to `theme/sgs-theme/styles/mamas-munches.json` via `variation_router.py` (5d.3).
- No `--resume` flags (blub.db row 224).
- No em-dashes in pipeline output / decisions / handoffs (Bean preference 2026-05-08). Em-dashes in extracted user-facing copy from the mockup are fine.
- Open the rendered sandybrown URL with your own eyes before claiming parity met (`feedback_dont_delegate_the_test_of_unproven_work`).
- The ≤ 1% pixel-diff gate is a HARD pass criterion. No partial closure. No alternative metric substitution.

## Artefacts from prior session

- Commit `e8478a33` — Phase 5g shipped (orchestrator rewrite + 6 scaffold promotions).
- `pipeline-state/mamas-munches-homepage-2026-05-13-074854/` — 5g.4 run output.
  - `full-page-markup.html` — 13.5k chars of produced markup.
  - `screenshots/{mobile,tablet,desktop}.png` — what 5g.4 looked like.
  - `stage-9.json` — coverage roll-up, autonomy chain output, harness 5/5 GREEN.
- 6 new scaffold blocks at `plugins/sgs-blocks/src/blocks/{header,featured-product,ingredients-section,gift-section,social-proof,footer}/`.

## Phase 6 (after 5h closes)

Phase 6 — Cross-platform output (~6-8 hr): Block.json → Bootstrap / Tailwind / shadcn / React / Node.js code generators using uimax `equivalent_implementations` + `design_tokens` cross-platform columns. Sequenced AFTER 5h closes — irresponsible to extend a foundation that doesn't pass its own parity gate.
