---
recommended_model: sonnet
session_tag: small-giants-wp-2026-05-04-hero-poc-and-qc-failure
---

# Session Handoff — 2026-05-04

## Completed This Session
1. Hero block Phase 1 attribute completeness — 106 new attrs (image controls, padding, native typography selectors, layout grid, vertical alignment). 162 total attrs on `sgs/hero`. Implementer + spec review + quality review pattern.
2. Recogniser-v2 update (`tools/recogniser-v2/extract.py`) — InnerBlocks composition emission, ~80 new extractors, universal-handled CSS classifier. Coverage 42/162 attrs on Mama's hero (up from 17). Zero scoped wp:html.
3. Button block style.css + editor.css created (was missing entirely from src/).
4. Mama's variation buttonPresets `!important` overrides.
5. SGS framework DB refresh + per-block reference markdown regenerated (64 blocks / 1207 attrs).
6. Three audit reports captured: measured QC, Gemini Pro Vision audit, Bean's live observation. All three converged: hero PoC NOT pixel-faithful.
7. 23 distinct defects catalogued + new methodology gaps captured as styling-errors M1-M4 + N1-N5.

## Current State
- **Branch:** `main` at `be0daa5`
- **Tests:** no test suite
- **Build:** webpack passes; WPCS 0 errors
- **Uncommitted changes:** none from this session
- **Live deploy:** sandybrown post 29 — hero image invisible during first ~1s of every page load (entrance animation paint bug)

## Known Issues / Blockers
- 23 catalogued visual-fidelity defects. Full inventory: `reports/hero-poc-qc-2026-05-04.md` and `reports/gemini-vision-audit-2026-05-04/audit.md`.
- The `/visual-qa` skill itself has the same blind spot (no first-paint capture) — would have signed off the broken hero. Captured in `common-wp-styling-errors.md` Section N.
- Phase 3 STOP GATE bypassed this session — needs git-hook enforcement.

## Next Priorities (in order)
1. Build `tools/multi-frame-qa/capture.js` — multi-frame screenshot capture (0/200/500/1000/3000ms) at 1440 + 375. Highest-leverage action.
2. Run multi-frame QC. Find any first-paint defects beyond the known image-animation bug.
3. Build deterministic prevention scripts per defect class (CSS pattern audit, render.php inline-vs-media checker, git pre-commit STOP GATE). Script-level first; agent only as last resort.
4. Apply the 23 catalogued fixes via subagent-driven-development.
5. Re-run all three audits. Pass criterion: 0 Major, ≤2 Important, ≥95% visual fidelity, first-paint capture clean.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/src/blocks/hero/{block.json,render.php,edit.js,style.css,deprecated.js}` | Phase 1 attribute completeness wired end-to-end |
| `plugins/sgs-blocks/src/blocks/button/{style.css,editor.css,index.js}` | Created missing CSS + imports |
| `tools/recogniser-v2/extract.py` | InnerBlocks emission + ~80 new extractors + universal-handled classifier |
| `theme/sgs-theme/styles/mamas-munches.json` | buttonPresets `!important` overrides |
| `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` | Regenerated from refreshed DB |
| `.claude/specs/common-wp-styling-errors.md` | Section M (M1-M4 paint defects) + Section N (N1-N5 visual-qa pipeline gaps) |
| `.claude/state.md`, `.claude/mistakes.md`, `.claude/handoff.md`, `.claude/next-session-prompt.md` | Session-end docs |
| `reports/hero-poc-qc-2026-05-04.md` | Measured QC (13 deltas) |
| `reports/gemini-vision-audit-2026-05-04/{audit.md,screenshots/}` | Gemini Pro Vision audit (Grade D, 65%) |

## Notes for Next Session
- Hero entrance animation (`animation-fill-mode: both` + `animation-delay: 360ms`) on `.sgs-hero__split-image` in `style.css` lines 144-170 hides the image during the broken window. Highest-impact visible defect.
- Mama's variation buttonPresets text colours wrong — primary should be charcoal not `#ffffff`. WCAG 2.5:1 contrast failure.
- WP admin: Claude / `MigrationSweep2026!` (still temporary).
- Recogniser command with sandybrown image IDs: `python tools/recogniser-v2/extract.py --mockup sites/mamas-munches/mockups/homepage/index.html --section "section.hero" --block sgs/hero --media-map sites/mamas-munches/research/sandybrown-media-map.json`

## Next Session Prompt

~~~
You are a senior SGS WordPress developer specialising in visual-fidelity QC harness design and deterministic CSS-pattern detection. Previous session shipped real infrastructure but the hero clone PoC failed pixel-faithfulness. Both automated QC layers (measured + Gemini Pro Vision) gave it a clean bill of health; Bean caught the showstopper bug live in his own browser. Your job: upgrade the QC harness so this class of bug can never ship again, then fix the 23 catalogued defects, then prove the clone is pixel-faithful with three independent audits.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-04-hero-poc-and-qc-failure"

Read CONVERSATION-HANDOFF.md, .claude/handoff.md, reports/hero-poc-qc-2026-05-04.md, reports/gemini-vision-audit-2026-05-04/audit.md, and `.claude/specs/common-wp-styling-errors.md` Sections M + N.

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | Designing the multi-frame capture algorithm + prevention-script architecture |
| `/gap-analysis` | Grade the new QC harness against M1-M4 + N1-N5 catalogue before shipping |
| `/lifecycle` | Any skill or pipeline edit (visual-qa updates flow through this) |
| `/research` | If multi-frame approach needs Playwright API research |
| `/strategic-plan` | Plan the build order for QC harness + prevention scripts before coding |
| `/sgs-wp-engine` | All SGS WordPress block work |
| `/visual-qa` | Re-run after fixes |
| `/gemini-vision-audit` | Independent vision pass after fixes |
| `/subagent-driven-development` | Implementer + spec + quality review per fix |
| `/handoff` | End of session |

## MCP Servers & Tools

| Tool | What for |
|------|----------|
| `mcp__plugin_playwright_playwright__*` | Multi-frame screenshot + DOM measurement at each frame |
| `gemini --model gemini-3.1-pro-preview` | Vision audit dispatch (post-fix) |
| `python tools/recogniser-v2/extract.py` | Re-run after R1/R2 fixes |
| `phpcs --standard=WordPress` | Per fix |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All SGS WordPress block fixes |
| `design-reviewer` | After fixes — automated mockup-to-live diff |
| `feature-dev:code-reviewer` | Spec compliance + quality review per fix |

## WordPress tooling reference

| Skill | Use |
|-------|-----|
| `/sgs-wp-engine` | All SGS block dev, theme, client work |
| `/wp-block-development` | Per-block specifics |
| `/wp-block-themes` | theme.json + style variations |

## Tasks

1. **`tools/multi-frame-qa/capture.js`** — Node + Playwright. Capture at 0/200/500/1000/3000ms after navigation, NO `waitUntil:'load'`. Element-target screenshot of `section.sgs-hero` + JS DOM snapshot at each frame. Output: 5 PNGs + 5 JSON per viewport + diff summary. Run at 1440 + 375.
2. **Run multi-frame QC** against sandybrown post 29 + Mama's mockup. Document any first-paint defects beyond the known image bug.
3. **Build prevention scripts** (≥3 minimum):
   - M1: `scripts/css-pattern-audit.js` — grep `animation-fill-mode: both` + non-zero delay; PreCommit hook fails on match
   - N4: visual-qa L7c auto-include when block style.css has `animation:` rules
   - R1: recogniser extracts inline `style=""` via `getComputedStyle()`
   - R2: recogniser handles `@media (min-width: 1280px)` tier
   - F4: render.php scan for inline-style without `!important` on mobile @media override
   - P1: Git pre-commit hook enforcing Phase 3 STOP GATE
4. **Apply the 23 catalogued fixes** via subagent-driven flow. Priority: V1/V2 (button text colours) → M1 (remove broken animation) → F4 (mobile override) → V3 (h1 line-height) → F5 (max-width leak) → F1/F2 (margin attrs) → R1/R2 (recogniser).
5. **Re-run all three audits.** Pass = 0 Major, ≤2 Important, ≥95% fidelity, first-paint clean across all frames.
6. **Handoff** — write next-session prompt for trust-bar (next mockup section) if hero passes, else remaining hero items.

## Guardrails

- Do NOT skip multi-frame capture (Task 1) — the harness upgrade is the whole point of next session.
- Do NOT mark Task 5 complete without all three audits agreeing PASS.
- Deterministic script-level prevention first; agent-level last resort.
- Branch: framework → main; client-only → feat branch.
- WP-CLI: never `wp eval` (hook blocks); never modify post_content directly.
- Test the entrance-animation fix first — highest-impact visible defect.
~~~
