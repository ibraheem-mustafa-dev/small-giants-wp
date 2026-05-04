recommended_model: sonnet
session_tag: small-giants-wp-2026-05-04-hero-poc-and-qc-failure

You are a senior SGS WordPress developer specialising in visual-fidelity QC harness design and deterministic CSS-pattern detection. Previous session shipped real infrastructure but the hero clone PoC failed pixel-faithfulness — and worse, both automated QC layers (measured + Gemini Pro Vision) gave it a clean bill of health. The user caught the showstopper bug live in his own browser. Your job: upgrade the QC harness so this class of bug can never ship again, then fix the 23 catalogued defects, then prove the clone is pixel-faithful with three independent audits.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-04-hero-poc-and-qc-failure"`

Read CONVERSATION-HANDOFF.md and `.claude/handoff.md` for full context, plus:
- `reports/hero-poc-qc-2026-05-04.md` (measured QC, 13 deltas)
- `reports/gemini-vision-audit-2026-05-04/audit.md` (Grade D, 65%)
- `.claude/specs/common-wp-styling-errors.md` Sections M + N (paint defects + visual-qa pipeline gaps)

## Where You Are

Plan: hero-clone fidelity fixes + QC methodology upgrade
Current phase: hero-clone-fidelity-fixes
Progress: PoC structurally complete, visually FAIL (~50% fidelity, Grade D)
Next task: Build `tools/multi-frame-qa/capture.js` — multi-frame screenshot harness

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | Multi-frame capture algorithm + prevention-script architecture |
| `/gap-analysis` | Grade the new QC harness before shipping |
| `/lifecycle` | Any visual-qa skill update |
| `/research` | If multi-frame approach needs Playwright API research |
| `/strategic-plan` | Plan QC harness + prevention scripts before coding |
| `/sgs-wp-engine` | All SGS WordPress block work |
| `/visual-qa` + `/gemini-vision-audit` | Post-fix re-run |
| `/subagent-driven-development` | Implementer + spec + quality review per fix |
| `/handoff` | End of session |

## MCP & Tools

| Tool | Use |
|------|-----|
| `mcp__plugin_playwright_playwright__*` | Multi-frame capture + DOM measurement |
| `gemini --model gemini-3.1-pro-preview` | Post-fix vision audit |
| `python tools/recogniser-v2/extract.py` | Re-run after R1/R2 fixes |
| `phpcs --standard=WordPress` | Per fix |

## Agents

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All SGS WordPress block fixes |
| `design-reviewer` | Post-fix mockup-to-live diff |
| `feature-dev:code-reviewer` | Spec + quality review per fix |

## Tasks (in order)

1. **Build `tools/multi-frame-qa/capture.js`** — Node + Playwright. Capture frames at 0/200/500/1000/3000ms after navigation start, NO `waitUntil:'load'`. Element-target screenshot of `section.sgs-hero` + JS DOM snapshot (opacity/display/visibility/transform/getBoundingClientRect on every direct child) at each frame. Output: 5 PNGs + 5 JSONs per viewport + diff summary. Run at 1440 + 375.

2. **Run multi-frame QC** against sandybrown post 29 + Mama's mockup (served via `python -m http.server 8765`). Document any first-paint defects.

3. **Build ≥3 prevention scripts** (script-level first, agent only as last resort):
   - M1: `scripts/css-pattern-audit.js` grep `animation-fill-mode: both` + non-zero delay → PreCommit fails
   - N4: visual-qa L7c auto-include when block has `animation:` rules
   - R1: recogniser extracts inline `style=""` via Playwright `getComputedStyle()`
   - R2: recogniser handles `@media (min-width: 1280px)` tier
   - F4: render.php scan for inline-style without `!important` on mobile @media override
   - P1: Git pre-commit hook enforcing Phase 3 STOP GATE

4. **Apply 23 catalogued fixes** via subagent-driven flow. Priority: V1/V2 (button text colours) → M1 (remove broken animation) → F4 (mobile override) → V3 (h1 line-height) → F5 (max-width leak) → F1/F2 (margin attrs) → R1/R2 (recogniser).

5. **Re-run all three audits.** Pass = 0 Major, ≤2 Important, ≥95% fidelity, first-paint capture clean.

6. **Handoff** — write next-session prompt (likely trust-bar section if hero passes).

## Guardrails

- Do NOT skip Task 1. The harness upgrade is the whole point.
- Do NOT mark Task 5 complete without all three audits agreeing PASS.
- Default to deterministic script-level prevention.
- Test entrance-animation fix first — highest-impact visible defect.
- Branch: framework → main; client-only → feat branch.
- WP-CLI: never `wp eval`; never modify post_content directly.
