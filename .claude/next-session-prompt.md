recommended_model: sonnet
session_tag: small-giants-wp-2026-05-05-hero-fidelity-fixes-and-qc-methodology

Invoke `/autopilot` before doing anything else.

You are continuing the SGS WordPress hero clone fidelity work. Previous session shipped infrastructure (button architecture, hero Phase 1 attribute completeness, recogniser-v2 update, info-box rebuild, feature-grid container) but the hero clone PoC failed pixel-faithfulness — 23 catalogued defects, the most critical of which is an entrance-animation paint bug that makes the hero image invisible during the first ~1s of every page load.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-05-hero-fidelity-fixes-and-qc-methodology"`

## Read first (in this order)

1. `.claude/handoff.md` — last session summary
2. `reports/hero-poc-qc-2026-05-04.md` — measured QC (13 deltas)
3. `reports/gemini-vision-audit-2026-05-04/audit.md` — Gemini Pro Vision audit (verdict: 65%, Grade D)
4. `.claude/specs/common-wp-styling-errors.md` Section M (paint defects M1-M4) + Section N (visual-qa blind spots N1-N5)
5. `.claude/mistakes.md` top entry — single-frame post-load screenshots miss first-paint defects

## Where you are

- Hero PoC test page: sandybrown post 29 — `https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29`
- Mockup: `sites/mamas-munches/mockups/homepage/index.html` lines 245-313
- Hero block: `plugins/sgs-blocks/src/blocks/hero/` — 162 attributes, ~106 from Phase 1 last session
- Recogniser-v2: `tools/recogniser-v2/extract.py` — emits 42/162 attrs deterministically + InnerBlocks composition
- 23 defects catalogued. The single most critical: entrance animation hides hero image for 0-960ms.

## Tasks (in order)

### Task 1 — Multi-frame QC capture script (~45min)

Build `tools/multi-frame-qa/capture.js` (Node + Playwright). Inputs: target URL, output dir, viewports (375 + 1440 default). Behaviour:

1. Navigate to URL
2. **Without** `waitUntil: load` — capture frames at 0ms, 200ms, 500ms, 1000ms, 3000ms after navigation start
3. At each frame: take a viewport screenshot of the hero element AND a JS snapshot via `page.evaluate` of every visible-attribute (`opacity`, `display`, `visibility`, `transform`, `getBoundingClientRect()`) on every direct DOM child of `section.sgs-hero`
4. Output: 5 PNGs per viewport + 5 JSON snapshots per viewport + a diff summary listing every element whose `opacity * computed-visible-area` shifts across frames

Run it on the sandybrown hero PoC. Then run on the mockup served via `python -m http.server 8765` from `sites/mamas-munches/mockups/homepage/`.

Diff the two against each other. Any element on SGS that's invisible at frame N but visible on the mockup at the same frame N is a first-paint defect.

### Task 2 — Find any further first-paint defects beyond the known image-animation bug (~30min)

Inspect the multi-frame capture output. Look for:
- Any other element with delayed visibility (subtitle, eyebrow, headings, buttons, images)
- Any layout shift between frames (CLS — element jumping position)
- Any width/height that changes mid-animation
- Any element stuck in a transition that never completes

Document each finding with frame number it appears at + screenshot evidence + DOM measurement at that frame.

### Task 3 — Deterministic methodology updates (~1.5h)

For each of the 23 catalogued defects + any new ones from Task 2, decide a deterministic prevention path. Default to script-level checks where possible. Agent-level (LLM judgement) only as last resort. The decision tree per defect:

a. Can a static analysis check (grep / AST / schema) catch this pattern at commit time? Build a `scripts/css-pattern-audit.js` or similar.
b. Can a Playwright/Node script catch it deterministically? Build it into multi-frame-qa or a sibling script.
c. Can a hook enforce the STOP GATE so it can't be bypassed? Build the hook.
d. Only if all three are no — flag for agent-level review with a specific prompt template.

Specific known items to address:
- **M1 (entrance animation paint bug)** — script: grep style.css for `animation-fill-mode: both` + non-zero `animation-delay`. Hook: PreCommit hook fails on match unless overridden.
- **N4 (L7c animation-qa not in standard pipeline)** — script: detect `animation:` rules in any block's style.css OR `*Animation*` attributes in block.json, force-include L7c in standard `--mode full` runs.
- **R1 (recogniser misses inline styles)** — script: extend extractor to merge `getComputedStyle()` via Playwright when a mockup HTML element has both CSS rule + inline style. Treat inline style as override.
- **R2 (recogniser misses 1280+ tier)** — script: add a `largeDesktop` breakpoint tier to recogniser AND block.json schema (per-breakpoint attrs at large-desktop level).
- **F4 (render.php inline style beats @media mobile override)** — applies to content padding the same way it applied to splitColumnRatio. Script: scan render.php for any `style[]=` emission that has a corresponding `@media (max-width:...)` mobile override and ensure the mobile rule has `!important` OR the desktop is moved into a `@media (min-width:768px)` scoped CSS rule.
- **P1 / M4 (Phase 3 STOP GATE bypass)** — git hook on `.git/hooks/pre-commit`: if any file under `plugins/sgs-blocks/src/blocks/<name>/` is staged, require `reports/visual-diff/<name>-<ISO-date>.md` exists and contains `verdict: PASS` AND `first_paint_capture_passed: true`.

Implement at least 3 of these (the most critical) before time runs out. Document the rest with TODO files in `tools/qc-prevention/<defect-id>.md` so a future session can pick them up.

### Task 4 — Apply the catalogued fixes (~2h)

Now that the prevention scripts exist, fix the 23 catalogued defects. Use the subagent-driven-development pattern: implementer + spec review + quality review per task.

Priority order (by impact-per-effort):
1. Mama's variation buttonPresets text colours (V1, V2, V3) — 1 JSON edit, fixes C1+C2+M6 contrast failures
2. Remove the broken hero entrance animation (M1) — 1 CSS rule edit, fixes the most critical paint bug
3. Render.php content-padding mobile override (F4 / M1, M2) — add `!important` to mobile @media rules
4. Mama's variation `elements.h1.lineHeight: 1.15` (V3) — 1 JSON value
5. `.sgs-hero__content max-width: 780px` leak (F5) — find and remove from style.css
6. Add `subHeadlineMarginBottom*` + `headlineMarginBottom*` block attributes (F1, F2)
7. Recogniser inline-style + 1280+ tier extraction (R1, R2) — biggest recogniser fix
8. Multi-button desktop direction not winning — investigate root cause, fix

After each fix, run multi-frame-qa to verify the defect is gone.

### Task 5 — Re-run QC (~30min)

After Tasks 3 + 4: re-run measured QC + Gemini Pro Vision audit + multi-frame-qa.

Pass criterion: 0 Major defects, ≤ 2 Important, visual-fidelity ≥ 95%, first-paint capture verifies hero image is visible at every frame from 0ms onwards.

Only mark Task 5 complete when all three audits agree on PASS.

### Task 6 — Handoff (~15min)

Run `/handoff`. Write next-session prompt for the actual hero perfect-clone (image content match, full visual fidelity at all 3 breakpoints) OR the next mockup section (trust-bar) depending on where you land.

## Skills to invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout — all SGS WP work |
| `/subagent-driven-development` | Task 4 — implementer + spec + quality review per fix |
| `/test-driven-development` | Within each subagent task — visual diff is the test |
| `/visual-qa` | Task 5 standard QC pass — but call out the M1/N4 known blind spots in the report |
| `/gemini-vision-audit` | Task 5 vision pass |
| `/handoff` | End |

## MCP servers + CLI

| Tool | Use |
|------|-----|
| `mcp__plugin_playwright_playwright__*` | Multi-frame screenshot capture (Task 1) |
| `gemini --model gemini-3.1-pro-preview` | Vision audit (Task 5) |
| `phpcs --standard=WordPress` | Per fix |
| `python tools/recogniser-v2/extract.py` | Re-run after fixing R1/R2 |

## Constraints

- Do NOT skip the multi-frame capture step. The whole point of the next session is to upgrade the QC harness so first-paint defects can never ship again.
- Do NOT mark Task 5 complete without all three audits agreeing PASS.
- Do NOT default to LLM judgement for defect prevention when a script-level check is possible. Bean's directive: deterministic-via-script first, agent only as last resort.
- Branch discipline: framework changes go to `main`. If touching only Mama's variation, can branch as `fix/mamas-hero-fidelity` and merge after audit.

## Success criteria for the session

1. `tools/multi-frame-qa/capture.js` exists and runs deterministically
2. ≥3 defect-prevention scripts exist (CSS pattern audit, render.php inline-vs-media check, git pre-commit STOP GATE)
3. The 8 highest-priority catalogued defects fixed
4. Three independent audits (measured / vision / multi-frame) all agree PASS at 1440 + 375
5. Methodology updates committed to `tools/qc-prevention/` with one TODO per remaining unfixed prevention script
6. Handoff written for the next session
