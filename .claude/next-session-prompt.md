---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-19-orchestrator-rerun
recommended_model: sonnet
generated: 2026-05-18
plan_revision: v8 (post P-WP-ALIGNMENT-WIDTH-SYSTEM ship)
---

You are continuing the SGS Framework Phase 9 brand walkdown. The architectural alignment-width work shipped 2026-05-18 in two commits: `c7f42003` (Task 0 pages-not-posts) + `86172812` (Tasks 2-3 widthMode infrastructure). Your job this session: **prove out the widthMode emission with a real orchestrator pipeline re-run, push to page 131, measure pixel-diff, then pivot to intra-section closure.**

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-19-orchestrator-rerun"`

## THE STATE (one-paragraph)

Page 131 (`/cv2-output-mamas-munches/`) is the new canary — `page.html` template + `is-layout-flow` main, no 800px cap. Block markup on page 131 currently dates from 2026-05-17's converter output (pre-widthMode). The new converter knows how to emit `widthMode: "wide"`/`"full"`/`"default"` when section CSS matches theme widths within ±5%; the new render.php translates those into WP-native `alignfull`/`alignwide` with per-viewport overrides via scoped `<style>` blocks. Editor InspectorControls let operators pick widthMode + per-viewport + customWidth/Unit. Visual-diff report at `reports/visual-diff/container-2026-05-17.md` documents zero regression. Brand pixel-diff at 1440 is 43.7% (down from yesterday's 58.0%) — but the further drop from widthMode emission can only be measured after a full orchestrator re-run produces new block markup carrying the new attrs.

## ALWAYS-LOAD invocations (in this order)

1. `/autopilot`
2. `.claude/state.md` — 2026-05-18 snapshot
3. `.claude/handoff.md` — 2026-05-18 session close summary
4. `.claude/parking.md` → search for any newly-opened entries
5. `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` — top binding rules
6. `reports/visual-diff/container-2026-05-17.md` — Tasks 2-3 acceptance evidence

## Reading list

1. **`plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`** + **`plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py`** — find how the orchestrator invokes convert.py and whether `--client-slug` is already wired through, or if it needs an integration step (it likely needs one — Branch B only wired the convert.py CLI, not the orchestrator wrapper)
2. **`sites/mamas-munches/mockups/homepage/index.html`** + the previous run-dir at `pipeline-state/mamas-munches-homepage-2026-05-17-071529/` — reference for inputs and expected outputs
3. **`theme/sgs-theme/styles/mamas-munches.json`** — confirm currently has NO `settings.layout` block (smoke artefact was reverted before commit); the real orchestrator run will populate it
4. **`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`** lines 1573-1779 (helper block) and 3137-3199 (main + CLI) — the new entry points

## Skills to invoke

| Skill | When |
|-------|------|
| `/strategic-plan` | If the orchestrator wiring for --client-slug needs more than one mechanical step |
| `/systematic-debugging` | If the orchestrator re-run produces unexpected output |
| `/qc-inline` | Self-check before any orchestrator-wrapper edit lands |
| `/qc` | Multi-rater panel BEFORE committing any converter/orchestrator/SGS block change (binding rule #2) |
| `/sgs-wp-engine` | All SGS framework work |
| `/sgs-update` | Refresh sgs-framework.db after orchestrator outputs are validated |

## MCP & tools

| Tool | What for |
|------|---------|
| `mcp-wordpress` REST | Push new converter output to page 131; verify mtime advances |
| `playwright` | Multi-viewport screenshot of page 131 post-update |
| `python scripts/pixel-diff.py --selector .sgs-{section}` | Per-section cropped diff at 3 viewports (binding rule #3) |
| `python plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py --help` | Confirm Branch B's CLI surface |

## Task 1 — orchestrator wiring (~30 min)

Branch B wired `--client-slug=<slug>` into `convert.py`'s `main()`. The full orchestrator (`orchestrator_main.py` / `sgs-clone-orchestrator.py`) likely calls convert.py via subprocess — confirm whether the `--client-slug` flag needs threading through that wrapper, and add it if so. If the wrapper already accepts a `--client` flag, ensure it forwards as `--client-slug`.

Quick check before editing:
```bash
grep -nE "subprocess|convert\.py|client_slug|--client" plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py
```

## Task 2 — full orchestrator re-run (~15 min)

Run the orchestrator against the Mama's mockup with `--client-slug=mamas-munches`. The new run-dir should:
- Populate `theme/sgs-theme/styles/mamas-munches.json:settings.layout` from detected mockup widths
- Emit `widthMode: "wide"`/`"full"`/`"default"` on container instances whose CSS matched theme widths within ±5%
- Keep emitting inline `style.dimensions.maxWidth` for arbitrary literals (legacy fallback path preserved)

Verify by `grep`ing the new `extract.json` for `widthMode` hits + reading the modified style variation.

## Task 3 — push + remeasure (~10 min)

```bash
python reports/brand-walkdown-2026-05-19/upload_and_patch.py <new-run-dir>
# Defaults to --target page --target-id 131 — no flags needed
```

Then re-measure brand-cropped diff at 3 viewports:
```bash
for vp in 1440x900 768x1024 375x812; do
  python scripts/pixel-diff.py \
    --mockup file:///C:/Users/Bean/Projects/small-giants-wp/sites/mamas-munches/mockups/homepage/index.html \
    --sgs https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/ \
    --viewport $vp \
    --selector ".sgs-brand" \
    --out reports/brand-walkdown-2026-05-19/page131-orchestrator-rerun-brand-${vp%x*}
done
```

Expected: brand at 1440 stays roughly at 43.7% (brand's authored 1000px doesn't match theme widths — falls back to inline-style, no behaviour change) OR drops further if there are other intra-brand changes the new converter picked up. Honest answer: small expected change.

The more interesting measurement is **per-section diffs across the page** — hero (66.8% baseline), cta, trust, etc. Tasks 2-3 buy bigger ROI on sections whose mockup CSS matched theme widths exactly.

## Task 4 — pivot to intra-section closure (~remaining session)

With P-WP-ALIGNMENT-WIDTH-SYSTEM closed, the remaining pixel-diff is intra-section. Open parking entries for the largest residual diff sections after Task 3's measurement. Candidates:
- **Hero (66.8% at 1440)** — likely image positioning / `object-fit` / `object-position` parity. The mockup's hero image is positioned differently than the SGS render.
- **Brand (43.7% at 1440)** — text layout, font-weight/size, image positioning within the section
- Per-viewport responsive parity at 375 / 768 (mockup-mobile differs from SGS-mobile due to CSS responsive overrides)

Each section gets its own parking entry with: section selector, current diff %, candidate root cause, proposed fix shape, estimated time.

## Task 5 — commit + handoff (~15 min)

Walk `.claude/docs-registry.yaml` per binding rule. Update state.md, handoff.md, parking.md, mistakes.md, next-session-prompt.md. NO Co-Authored-By footer on commits.

## Guardrails

- **Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing** about converter quality or pixel-diff causes (binding rule #1)
- **Multi-rater /qc panel BEFORE every commit** touching converter/pipeline/block logic (binding rule #2)
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}` (binding rule #3)
- **NO smoke artefacts in commits** — if you run convert.py with a synthetic CSS for verification, revert the resulting style-variation write before `git add`
- **Hero-clone-poc URL** = https://sandybrown-nightingale-600381.hostingersite.com/hero-clone-poc/ — the canonical existence proof for working alignment
- **Page 131** = https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/ — the canary

## Definition of done (HONEST budget)

Must close in-session:
- ✓ Orchestrator wiring confirmed (or extended) for `--client-slug=mamas-munches`
- ✓ Full pipeline re-run produces new extract.json with widthMode hits + populated mamas-munches.json layout
- ✓ Page 131 carries the new markup; brand-cropped diff re-measured at 3 viewports
- ✓ Per-section diffs measured across the homepage (hero / brand / cta / trust / others)
- ✓ At least 2 new parking entries opened for the largest residual intra-section diffs
- ✓ Handoff walks the docs-registry

Acceptable explicit defers:
- Per-section fixes themselves (they're the parking entries — fix them in subsequent sessions)
- Indus Foods second-client validation (separate session)

Unacceptable:
- Skipping the orchestrator re-run (it's the proof point for Tasks 2-3)
- Committing without /qc panel if converter/pipeline/block logic changes
- Smoke artefacts in commits
