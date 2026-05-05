recommended_model: opus
session_tag: small-giants-wp-2026-05-05-framework-qc-hardening

You are a senior WordPress framework engineer specialising in QC infrastructure, prevention scripts, and structural enforcement of measurement methodology — closing every gap captured in the past 3 days of hero perfect-clone work.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-05-framework-qc-hardening"`

Read CONVERSATION-HANDOFF.md and `.claude/handoff.md` for full context, then work through these priorities.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural calls — H-3 video schema, H-7 full-bleed pattern, H-5 screenshot-diff helper API |
| `/gap-analysis` | Grade `/visual-qa` skill after embedding Section Q binding rule (H-5c) |
| `/lifecycle` | MANDATORY for any skill/agent edit — H-5c, and inspector reorg if framework-pattern emerges |
| `/research` | Auto-routes — `/research-check` for viewport-width-without-scrollbar techniques (H-7) |
| `/strategic-plan` | Plan implementation order across H-1 through H-10 before writing code |
| `/sgs-wp-engine` | All SGS WP work |
| `/subagent-driven-development` | Tasks with multiple file paths — H-1+H-2, H-3, H-9 |
| `/dispatching-parallel-agents` | H-5a + H-5b + H-7 — independent file paths |
| `/visual-qa` | After H-5 lands, use the upgraded skill with binding screenshot-evidence rule |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp__plugin_playwright_playwright__*` | Browser automation; canvas pixel sampling for measurement-vs-eye disputes (NOT measurement-of-record) |
| `node tools/multi-frame-qa/capture.js` | First-paint defect detection at 0/200/500/1000/3000ms |
| `node scripts/mockup-parity-validator.js` | Computed-style diff (now with backgroundImage + filter + mixBlendMode in WATCHED) |
| `node scripts/colour-parity-audit.js` | Automated mockup vs variation colour diff |
| `node scripts/css-pattern-audit.js` | M1 first-paint defect prevention |
| `node scripts/render-mobile-override-audit.js` | F4 inline-vs-mobile-override prevention |
| `node scripts/font-source-audit.js` | O2 external CDN font src prevention |
| `node scripts/global-styles-reset.js` | Variation deploy automation |
| `python tools/recogniser-v2/extract.py` | Re-extract on mockup changes |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All SGS WP work — H-1, H-2, H-3, H-7, H-8, H-9 |
| `feature-dev:code-architect` | H-3 video-everywhere schema design (cross-cutting feature) |
| `general-purpose` | H-5 screenshot-diff helper script + H-6 replaceBlock helper |

## Tooling reference (WordPress)

See `~/.claude/rules/wp-project-tooling.md` for the full SGS WordPress tooling tables. All apply.

## Where You Are

Plan: `.claude/parking.md` — 10 H-entries (H-1 through H-10) form the Opus-session backlog.
Current phase: `framework-qc-hardening`
Progress: 0/10 H-entries complete; ~6 hours estimated total work.
Next task: **Task 1 — H-5 classifier human-eye gate** (most critical; blocks reliable QC across all future client clones).

---

## Task 1 — H-5: Classifier human-eye gate (~55 min) CRITICAL

Build `scripts/screenshot-diff-helper.js` (mockup vs SGS image comparison + pixel-diff heatmap, uses `pixelmatch` npm package or `sharp` + manual diff). Add `requires_screenshot_review: true` flag to parity validator for any Q1-Q4 / R1-R4 pattern delta. Bake Section Q binding rule into `/visual-qa` skill via /lifecycle. Use `/dispatching-parallel-agents` — sub-tasks touch independent files.

## Task 2 — H-7: Negative-margin full-bleed pattern replacement (~45 min)

Replace `margin: 0 -24px` with viewport-aware solution. Two candidates: `width: 100vw + margin-left: calc(50% - 50vw)` (causes 15px scrollbar overflow on Windows), OR JS-set `--viewport-width: ${document.documentElement.clientWidth}px` updated on resize (excludes scrollbar). Test Mac + Windows + mobile + multi-template-padding scenarios.

## Task 3 — H-1 + H-2: Hero block inspector reorganisation (~75 min)

Reorganise `plugins/sgs-blocks/src/blocks/hero/edit.js` panels by element (Container / Eyebrow / Headline / Subheadline / Image / Badges / Buttons) instead of by CSS-rule (current "Margin Bottom" panel etc.). Address `imagePadding` vs `mediaPadding` redundancy with renamed labels + help text. Pattern propagates framework-wide — document the convention.

## Task 4 — H-9: Audit framework gradient shorthand patterns (~30-60 min)

Grep all `plugins/sgs-blocks/src/blocks/*/style.css` for `background: linear-gradient` or `background: url(`. For each match: ensure `:not(.has-background)` exclusion + switch `background:` shorthand to `background-image:` (specific, doesn't reset other props). Extends Section R fix beyond hero.

## Task 5 — H-3 + H-4 + H-6 + H-8 + H-10 (remaining gaps)

Per `.claude/parking.md`. H-3 (video-everywhere-image foundation) is the largest single piece — build `MediaPicker` component + `sgs_render_media` helper + hero block as proof, defer remaining 11 blocks. H-4 (brand pink validation via Python PIL sampling) needs Bean decision after sampling — 5 min decision call. H-6 (`scripts/wp-update-block-attrs.js` replaceBlock helper). H-8 (hero `ctaGap*` block attribute). H-10 (cascade Section R into prevention scripts).

## Guardrails

- Run `node scripts/css-pattern-audit.js` and `node scripts/font-source-audit.js` before any commit.
- Pre-commit STOP GATE blocks block-src commits without passing `reports/visual-diff/<block>-<date>.md`.
- Use `node scripts/global-styles-reset.js` after every variation JSON change.
- Don't dismiss any parity-validator delta as "structural noise" without screenshot evidence (Section Q binding rule + blub.db pattern_key 207).
- For block-attr changes on existing posts: use `wp.blocks.createBlock + replaceBlock` (never `updateBlockAttributes` — silently rejected on blocks with save.js validation errors).
- SSH to sandybrown: `u945238940@141.136.39.73:65002`, `~/.ssh/id_ed25519`. WP admin: `Claude` / `MigrationSweep2026!`.
