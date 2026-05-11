---
doc_type: next-session-prompt
project: small-giants-wp
last_updated: 2026-05-11
recommended_model_next: opus
---

# Next Session Prompt -- small-giants-wp

You are picking up from the 2026-05-11 session that shipped Phase 7 + the `sgs/trustpilot-reviews` block + an orchestrator multi-section run on Mama's mockup. The orchestrator plumbing is complete; the critical-path blocker for Phase 8 ship is `tools/recogniser-v2/extract.py` working for sgs/hero only.

Invoke `/autopilot` before doing anything else.

Read `.claude/handoff.md` + `.claude/state.md` + `.claude/plan.md` + `.claude/parking.md` first to understand the full picture.

## Where you are

- The pipeline runs end-to-end across all 9 Mama's sections (orchestrator multi-section verified)
- The `sgs/trustpilot-reviews` block is shipped + live on sandybrown at `/trustpilot-smoke-test-2/`
- Two systemic SGS bugs were caught + fixed today (image-controls.php namespace fatal; block style.css enqueue gap across all 48 blocks)
- Phase 7 + trustpilot block commits: `7ac627cf` + `c6bd4980`
- Three tracks open in priority order below

## The blocker reframe

Earlier today I documented `extract.py` generalisation as "Phase 9 backlog". Bean caught the misframing: **a Phase 8 live deploy is meaningless if 8 of 9 Mama sections render empty.** extract.py generalisation IS the remaining Phase 8 work. Until it lands, the orchestrator produces structurally valid block markup with no inner content.

## Three tracks in order

### Track 1 (5 min) -- Commit the orchestrator multi-section patches

Two uncommitted patches sit in:
- `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` -- `auto_detect_sections` walks into `<main>` (was finding 3 of 9 sections, now finds all 9)
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` -- stage 4-8 loops per-boundary in `--auto-section` mode (was hard-fataling on `args.section=None`)

Both tested. Commit + push to main as `feat(orchestrator): multi-section walker`. **Do not include sgs-blocks.php in this commit** -- the parallel Trustpilot Sync session owns that file's current changes.

### Track 2 (4-6 hours focused) -- extract.py generalisation

The critical-path Phase 8 work. Documented in `parking.md` P-EXTRACT-GENERALISE. Extend `tools/recogniser-v2/extract.py` in-place so it works for any SGS block, not just sgs/hero.

**Suggested approach:**

1. **Architecture peer review FIRST** (30 min). Per the 2026-05-08 pattern that caught 11 fixes before the first real clone: dispatch 3 parallel reviewers (Sonnet practical, Gemini Flash gap-scan, Cerebras qwen ecosystem) against a one-page design brief for the generalised extractor. Synthesise findings. Build the delta.

2. **Build the convention-driven extractor.** Per-attribute-type strategies:
   - `string` / `RichText`: extract `textContent` of `.sgs-<block>__<element>` selector
   - `image` / media: extract `src` + alt + width/height from `<img>` inside the selector
   - `colour`: read computed `color` / `backgroundColor` of the selector
   - `spacing` / numeric CSS: read computed style + parse to int
   - `link` / URL: read `href` from `<a>` inside the selector
   - `icon`: read SVG content or icon name from data attributes
   - Fallback: keep existing hero hardcoded extractors as a per-block override

3. **Wire role-templates catalogue.** For each block in `plugins/sgs-blocks/src/blocks/*/block.json`, derive default selector-strategy + value-extractor per attribute. Hand-override per block when the convention doesn't fit.

4. **Smoke test on Mama's mockup.** Run the orchestrator with `--auto-section` AND Playwright on. Expect ~30-50 attrs per section, not 0.

5. **Visual diff report** at `reports/visual-diff/extract-generalisation-2026-05-11.md` -- compare output before + after on 3 sample sections (hero, trust-bar, ingredients-section).

### Track 3 (20-30 min, blocked on Track 1) -- Consolidate to `tools/recogniser-v3/`

Documented in `parking.md` P-RECOG-V3. Move orchestrator + 4 dispatcher scripts + extract.py into a single `tools/recogniser-v3/` directory with underscore-style names. Update path references in spec 12, skill bodies, state.md. Then a cleanup commit deletes `tools/recogniser/` (v1) and `tools/recogniser-v2/`.

### Track 4 -- Trustpilot Sync infrastructure (SHIPPED 2026-05-11, commit `06df2807`)

Complete. 4 classes at `plugins/sgs-blocks/includes/trustpilot/`, admin JS at `plugins/sgs-blocks/assets/admin/trustpilot-sync.js`, settings page at WP Admin > Settings > SGS Trustpilot Sync. Weekly WP-cron, Sync-now button, JSON-LD parser, AES-256-CBC token encryption, Browserless `?token=` auth. End-to-end proven on sandybrown: smoke-test-2 page now `dataSource: synced` rendering live Mama's reviews. Visual diff at `reports/visual-diff/trustpilot-sync-2026-05-11.md`. Setup procedure documented inline on the settings page for any future SGS site.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | FIRST -- session routing + ADHD support |
| `/sgs-wp-engine` | All SGS framework work |
| `/research-buddies` or `/research-council` | Track 2 step 1 -- 4-model architecture peer review |
| `/sgs-clone` | The pipeline target |
| `/qc-inline` | After each chunk lands |
| `/handoff` | Session close |

## MCP / tools

| Tool | Use for |
|---|---|
| Playwright MCP | extract.py uses Playwright for cascade-resolved CSS values; tests against Mama's mockup |
| SSH `u945238940@141.136.39.73:65002` | Deploy + verify on sandybrown |
| `~/.agents/skills/shared-references/` | Optimisation toolkit / certainty calc references |

## Don't

- Don't include `plugins/sgs-blocks/sgs-blocks.php` in Track 1's commit IF Track 1 is run after the orchestrator patches that have not yet committed — that file is currently up to date on main with the Trustpilot Sync changes (commit `06df2807`)
- Don't trust plan files or state.md claims without grepping the named scripts in git (lesson: 2026-05-11 Phase 8 plan referenced 7 fictional files; 2026-05-10 Phase 7 plan did the same with 4)
- Don't delegate eyes-on proof of unproven systems to subagents (lesson 221)
- Don't reorganise files mid-deploy. Commit working state first (Track 1), then reorganise (Track 3)
- Don't build extract.py generalisation without a peer review first (lesson from 2026-05-08 fingerprint design review: caught 11 fixes before first clone)

## Done-when (for the entire Phase 8 arc)

- [ ] Track 1 committed
- [ ] Track 2 extract.py generalised; all 9 Mama sections produce non-empty attributes; visual diff report PASS
- [ ] Phase 8 plan's remaining steps run: global-styles-reset, tar+scp deploy, OPcache reset, `wp post update`, multi-frame capture, mockup-parity-validator + screenshot-diff
- [ ] Bean opens https://sandybrown-nightingale-600381.hostingersite.com/ at 375 / 768 / 1440 and confirms PASS (lesson 221, no agent fallback)
- [ ] P-11-M9 marked RESOLVED in parking.md; state.md advances past convention-rollout phase
