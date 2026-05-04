---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-04
recommended_model: sonnet
session_tag: small-giants-wp-2026-05-04-hero-poc-and-qc-failure
---

# Session Handoff — 2026-05-04 (hero PoC + QC failure + methodology update)

## Completed this session

**Infrastructure (real wins):**
1. Hero block Phase 1 attribute completeness — 106 new attrs covering image controls, padding, native typography selectors, layout grid, vertical alignment, content max-width. Implementer + spec review + quality review pattern. WPCS clean. 162 attrs total on `sgs/hero` now.
2. Recogniser-v2 update — replaced deprecated CTA emission with `sgs/multi-button + sgs/button` InnerBlocks composition. Added extractors for ~80 new attributes. Universal-handled classifier drops mockup-structural CSS that doesn't map to SGS classes (zero scoped wp:html on Mama's hero now). Coverage: 42/162 attrs extracted (up from 17).
3. SGS framework DB refresh via `/sgs-update` — 64 blocks / 1207 attributes / 35 patterns. Per-block reference markdown regenerated.
4. Button block style.css + editor.css created (was missing entirely from src/ — block had been rendering with zero base styles).
5. Mama's variation overrides for button presets (with `!important` to beat the link-colour rule).

**4 commits pushed to main**: `b377c4e` (hero Phase 1), `d2c7a20` (recogniser v2), `b871111` (theme + DB refresh), `5a3bb1a` (Gemini audit + report), plus `9dc95ac` (measured QC report).

## Honest failure

Hero PoC declared "Task 3 done" without running the proper QC. When pushed, three audits ran:

1. **Measured QC** (my own, `reports/hero-poc-qc-2026-05-04.md`) — caught 13 deltas at 1440 + 6 at 375. Verdict: NOT pixel-faithful.
2. **Gemini Pro Vision audit** (`reports/gemini-vision-audit-2026-05-04/audit.md`) — verdict 65% / Grade D. Caught 2 layout defects my measured QC missed (desktop buttons stacked vertically; mobile text centre-aligned).
3. **Bean's live observation** — caught the showstopper that NEITHER audit flagged: hero image invisible during the first ~1s of every page load, every visit, every viewport. Root cause: `animation: sgs-hero-enter ... both; animation-delay: 360ms` on `.sgs-hero__split-image` in `style.css` lines 144-170. `animation-fill-mode: both` + non-zero delay locks the element at `from { opacity: 0 }` during the delay window. Both QCs sampled screenshots after the animation completed and reported the image fine.

Net visual fidelity: ~50%. Net structural correctness: ~70%. NOT a pixel-faithful clone. The PoC validated the architecture (recogniser → block markup → render works end-to-end) but the visual gate didn't close.

**Total catalogued defects: 23.**

## Methodology gap captured

Three new diagnostic rules + 5 visual-qa pipeline gaps captured in `.claude/specs/common-wp-styling-errors.md` Sections M (M1-M4) + N (N1-N5):

- **M1**: Element invisible during 0-960ms of page load even though `getComputedStyle().opacity = 1`. Animation-fill-mode:both + delay locks at `from` state during delay.
- **M2**: Single-frame post-load screenshot QC misses time-bound defects.
- **M3**: DOM measurement says visible + screenshot says invisible = paint-state defect; the disagreement is the diagnostic.
- **M4**: `sgs-wp-engine` Phase 3 STOP GATE bypassed — needs to be enforced by git hook, not honour system.
- **N1-N5**: visual-qa pipeline has the same blind spot — no multi-frame capture, no animation-property diff, reduced-motion test inverts the question, L7c only fires under animation-harvest dispatch, no L8 CSS pattern grep.

## Current state

- Branch: `main`, all this session's commits pushed
- Live deploy: sandybrown post 29 has the hero PoC. Hero image is invisible at first paint due to M1.
- Tests: 0 added/run beyond the audit reports
- Build: green, WPCS 0 errors

## Known issues / blockers

23 distinct defects spanning:
- 7 Major (button text colours, mobile text alignment, desktop button stacking, content padding mobile bug, headline 46→52 px miss, image first-paint invisibility — the worst)
- 9 Important (line-heights, margins, font-weights, sub margin-bottom, label line-height)
- 5 Minor (sub-pixel fits, framework leaks)
- 3 recogniser blind spots (R1 inline styles, R2 1280+ tier, R3 cascade resolution)
- 5 framework gaps (F1-F5: missing margin attrs, breakpoint tier, render.php inline-vs-media, max-width leak)
- 4 Mama's variation gaps (V1-V4: button preset text colours, h1 line-height, body weight cascade)
- 1 process gap (P1 = Phase 3 STOP GATE bypass)

Full inventory: `reports/hero-poc-qc-2026-05-04.md` + `reports/gemini-vision-audit-2026-05-04/audit.md` + `.claude/mistakes.md` top entry.

## Next priorities (in order)

1. **Multi-frame screenshot QC harness** (`tools/multi-frame-qa/capture.js`) — capture frames at 0/200/500/1000/3000ms to find ALL first-paint defects, not just the hero one Bean already caught. Could surface more time-bound bugs in other elements.
2. **Deterministic prevention scripts** — for each catalogued defect class, build a script-level check (CSS pattern grep, schema diff, hook). Agent-level only as last resort.
3. **Apply the 23 catalogued fixes** via subagent-driven-development.
4. **Re-run all three audits** until pixel-faithful (≥ 95%).
5. **Hero perfect-clone is NOT done** until all three audits agree. Treat it as the first phase, not a checkbox.

## Key patterns / lessons captured

- **Dynamic blocks with InnerBlocks** must `save: () => <InnerBlocks.Content />` (B4 — established this session)
- **Two-stage subagent review** (spec compliance then code quality) catches more than one stage. Spec caught L6, quality caught 6 issues including a security gap.
- **Block presets via theme.json `settings.custom.<name>`** auto-emits CSS custom properties — pattern for any site-wide configurable block defaults
- **NEW**: Animation rules in `style.css` are hardcoding violations. Every entrance animation should be a per-instance attribute, opt-in with sensible-fast default. (M1 lesson)
- **NEW**: First-paint capture is mandatory. Single late screenshot misses entire defect classes. (M2/M3 lesson)
- **NEW**: STOP GATEs need enforcement, not honour. Git hook required. (M4 / P1 lesson)

## Available tooling (snapshot)

| Skill | Purpose |
|-------|---------|
| `/sgs-wp-engine` | All SGS WP work |
| `/wp-block-development`, `/wp-block-themes`, `/wp-rest-api` | Per-domain |
| `/visual-qa` | 8-layer pipeline (with M1/N4 blind spots — see common-wp-styling-errors.md) |
| `/gemini-vision-audit` | Independent vision audit (with M2/N4 blind spots) |
| `/subagent-driven-development` | Implementer + 2-stage review per task |
| `/handoff` | End of session |

| MCP / CLI | Purpose |
|-----------|---------|
| `mcp__plugin_playwright_playwright__*` | Browser automation |
| `gemini --model gemini-3.1-pro-preview` | Vision audit dispatch |
| `python tools/recogniser-v2/extract.py` | Recogniser run |
| `phpcs --standard=WordPress` | WPCS validation |

## Notes for the next session

- Sandybrown URL: https://sandybrown-nightingale-600381.hostingersite.com/
- Test page: post 29 (`Hero Clone PoC`)
- Mockup: serve via `python -m http.server 8765` from `sites/mamas-munches/mockups/homepage/`
- Mockup images IDs on sandybrown: 21 (mobile aesthetic-pic), 25 (desktop IMG_20260419)
- Image media-map: `sites/mamas-munches/research/sandybrown-media-map.json`
- WP admin: Claude / `MigrationSweep2026!` (still temporary — should be reset)
- Recogniser command: `python tools/recogniser-v2/extract.py --mockup sites/mamas-munches/mockups/homepage/index.html --section "section.hero" --block sgs/hero --media-map sites/mamas-munches/research/sandybrown-media-map.json`
- Visual diff screenshots from this session: `qc-mockup-1440-hero.png`, `qc-sgs-1440-hero.png`, `hero-poc-FINAL2-1440.png`, `hero-poc-FINAL4-375.png`, `hero-image-state-fullpage.png`, `reports/gemini-vision-audit-2026-05-04/screenshots/*` (4 files)

## Session reflection — for the prompt-writer

This session is a textbook case of "structural success ≠ visual success." The architecture works perfectly. The QC pipeline doesn't catch the bugs that matter. The next session must invest in QC harness upgrades BEFORE touching any more block code. Building more without fixing the audit blind spot guarantees more defects ship the same way.

The single highest-leverage action of next session: build `tools/multi-frame-qa/capture.js`. Everything else flows from being able to see the bugs.
