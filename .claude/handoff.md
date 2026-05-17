---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-18-wp-alignment-width-system
session_date: 2026-05-18
recommended_model: sonnet
last_verified: 2026-05-18
update_triggers:
  - "/handoff run"
companion_docs:
  - .claude/state.md
  - .claude/next-session-prompt.md
  - .claude/parking.md
  - .claude/decisions.md
  - .claude/plan.md
---

# Session Handoff — 2026-05-18 (WP alignment width system shipped)

## Headline

**3 commits to `main`** (`c7f42003` Task 0, `86172812` Tasks 2-3, plus this handoff commit). The architectural pull-back surfaced at last session's close landed in full: cv2 pipeline now targets WP PAGES not POSTS (closing a 14.3-point pixel-diff source on brand at 1440), and sgs/container has a complete per-viewport widthMode system that composes with WP-native `alignfull`/`alignwide`. Editor InspectorControls shipped so operators can use it. Converter detects mockup widths and lifts them into per-client style variations idempotently. Universal-benefit principle held throughout — zero client literals in framework code.

## Completed This Session

1. **Task 0 — pages-not-posts pipeline target (`c7f42003`).** Created WP page 131 (`/cv2-output-mamas-munches/`) + page 132 baseline on sandybrown via REST. Rewrote `reports/brand-walkdown-2026-05-19/upload_and_patch.py` with `argparse` — `--target page|post`, `--target-id N`, defaults `--target page --target-id 131`. Documented in root `CLAUDE.md`. **Brand pixel-diff at 1440: 58.0% (post 65, `is-layout-constrained`) → 43.7% (page 131, `is-layout-flow`)** — 14.3-point drop from this single change. P-USE-PAGES-NOT-POSTS closed.

2. **Tasks 2-3 — widthMode infrastructure (`86172812`).** Three-branch parallel dispatch via `/dispatching-parallel-agents` (Branches A + B), then Branch C for editor UI:
   - **Branch A** (`plugins/sgs-blocks/src/blocks/container/`): new attrs `widthMode` (enum default/wide/full/custom) + per-viewport overrides + customWidth/Unit. render.php emits WP-native `alignwide`/`alignfull` with scoped `<style>` for per-viewport (mobile ≤599px, tablet ≤1023px, desktop ≥1024px). Legacy `maxWidth` attr + `width-*` classes preserved.
   - **Branch B** (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`): `_detect_client_layout_widths`, `_write_client_layout_widths`, `_load_theme_widths`, `_match_theme_width` (±5% tolerance). `_lift_root_supports_to_style` emits semantic widthMode when lifted width matches theme widths; arbitrary literals fall back to legacy inline-style. CLI `--client-slug=<slug>`. Style variation JSON lift is idempotent.
   - **Branch C** (`edit.js`): InspectorControls — base ToggleGroup, per-viewport ResponsiveControl, conditional custom inputs. Editor preview mirrors render.php.

3. **Two inline QC passes.** `/qc-inline` #1 (Branches A+B) caught a real correctness bug — `_SGS_BEM_BLOCK_ROOT_RE` originally `^\.sgs-[a-z][a-z0-9-]*$` matched `.sgs-X--Y` modifier shapes because `-` is in the char class. Fixed to `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*$` — 12-case unit assertion + functional re-smoke confirms. Pass #2 (Branch C editor UI) scored 96/100, all 10 scenarios green.

4. **Deploy + smoke verification.** sgs-blocks built (webpack 5.105.2, 6.3s clean), tar-deployed to sandybrown, OPcache reset via HTTP. End-to-end smoke on convert.py with `--client-slug=mamas-munches` confirmed style-variation lift fires (a smoke artefact was reverted afterwards — real values come from a full orchestrator re-run). Brand pixel-diff at 3 viewports post-deploy: 1440=43.73%, 768=47.60%, 375=56.32% — identical to pre-deploy (block markup didn't change; render.php changes are additive and gated on the new attrs). **Zero regression confirmed.**

5. **Visual-diff report.** `reports/visual-diff/container-2026-05-17.md` documents the change, backwards-compat measurement, and universal-benefit verdict. PASS, `first_paint_capture_passed: true`.

## Honest open boundary

Tasks 2-3 ship the **framework infrastructure** to emit semantic widthMode + auto-lift per-client style widths. The **pixel-diff improvement** from this work won't show on page 131 until a full orchestrator pipeline re-run produces NEW block markup carrying `widthMode` attrs. Today's measurements show no regression but no further drop either — expected, because the markup on page 131 still dates from yesterday's pre-widthMode converter output. Next session's orchestrator re-run will produce the actual proof point.

Bigger honest finding from the work: the 66.8% intra-hero and 43.7% intra-brand diffs are now mostly intra-section (content layout, typography, image positioning), not parent-context — Task 0 closed the parent-context gap. Tasks 2-3 buy *framework correctness + per-client extensibility* across the 8 existing style variations and any future client.

## Next Session — START HERE

Read **`.claude/next-session-prompt.md`** + **`.claude/parking.md`** → priority entries.

The next concrete piece of work: re-run the full orchestrator pipeline (not just `convert.py`) against the Mama's mockup with `--client-slug=mamas-munches`, push the new converter output to page 131, and measure brand pixel-diff again — that's the data point that quantifies Tasks 2-3 ROI. After that, the residual pixel-diff is intra-section and should be addressed by per-block CSS/converter coverage work, not by more alignment-system changes.

## Lessons captured

1. **BEM regex char-class `[a-z0-9-]` matches `--` consecutively.** Captured in mistakes.md. To filter modifier/element shapes from block-root regexes, prefer `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*$` (segmented kebab with explicit single-hyphen between segments) over the naïve `[a-z0-9-]*` form.

2. **WP template context can dominate pixel-diff results.** `single.html` (`.entry-content { max-width: 800px }`) vs `page.html` (`is-layout-flow`, no cap) was a 14.3-point swing on brand-cropped diff at 1440 — bigger than any block-side fix had ever delivered. Lesson: when pixel-diff is stubbornly high, audit the **rendering surface's template chain** before chasing more converter / block fixes. Already captured at last session's close as the P-WP-ALIGNMENT-WIDTH-SYSTEM finding; this session proved it out.

3. **Verify the test artefact channel before claiming "the deploy is live".** Build → SCP → tar-extract → mv → OPcache reset is a five-step chain. Each step has a measurable signal (build exit code, ls on remote, grep for new attrs in deployed block.json, curl /op-reset-tmp.php). Used all four signals this session — no skipping. Pairs with `verify-rendered-output-not-internal-metrics` binding rule.

4. **Smoke test → revert test artefact.** Running the converter against a synthetic CSS to verify end-to-end correctness wrote real-looking values into `theme/sgs-theme/styles/mamas-munches.json`. Test artefacts must be reverted before commit — real values come from the actual production pipeline. Captured.
