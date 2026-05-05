---
recommended_model: opus
session_tag: small-giants-wp-2026-05-05-framework-qc-hardening
session_date: 2026-05-05
---

# Session Handoff — 2026-05-05

## Completed This Session

1. **Closed the 3-day hero perfect-clone sequence** end-to-end on sandybrown post 29 — every measurable mockup property matches live (typography, padding, margins, animation, font-loading, button colours, line-heights). 11 commits across the sequence; this session shipped 5 (`6459d75` → `491e4f4`).
2. **Found and fixed the framework gradient bug masking user-set backgroundColor** — `plugins/sgs-blocks/src/blocks/hero/style.css` line 25's `:not([style*="background-color"])` exclusion didn't catch WP's `.has-*-background-color` class-based colour. Result: gradient `#C56A7A → #E68A95` painted over the correct `#F5C2C8`. Visible 18.5% colour error, masked by `getComputedStyle().backgroundColor` returning the underlying value. Fix added `:not(.has-background)` + switched `background:` shorthand to `background-image:`.
3. **Captured the lesson durably** to all 3 persistence layers (workspace, CC auto-memory + MEMORY.md, blub.db row 207) under pattern_key `extend-measurement-set-when-human-eye-disputes`. Sibling rule of `verify-rendered-output-not-internal-metrics` (id 194).
4. **Extended `scripts/mockup-parity-validator.js` WATCHED set** — added `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`, `filter`, `mixBlendMode`, `backdropFilter`. Catches the R1-R4 patterns going forward.
5. **Built `scripts/colour-parity-audit.js`** (NEW) — automates Bean's "extract draft colours and diff against variation JSON" question. Verdict on Mama's: PASS, 10 colours matched, 0 deltas.
6. **Captured Sections Q + R to common-wp-styling-errors.md** — 9 measurement-trap and classifier-trap patterns. Section Q binding rule: no screenshot evidence = severity stays at validator level. Section R: 4 measurement traps (R1 backgroundImage, R2 parent filters, R3 pseudo-elements, R4 WP class-based bg).
7. **Visual-QA skill upgraded via /lifecycle** — B (4.18 / 92%) → A (~4.36 / 96%); ecosystem refs (G3), Quick mode worked example (H1), extracted run-checklist.md (H2), backlog.md (G8).
8. **3 visible mid-session bugs fixed live** — mobile button gap (10px), desktop full-bleed instance-level fix (`.page-id-29` zeroing of `.entry-content` padding), buttons inline at desktop.
9. **10 hardening gaps captured in parking.md as H-1 through H-10** — each self-contained spec for the Opus session.
10. **Bean's eye caught visible defects the validator's classifier dismissed** — incident driving the entire Sections Q + R + new pattern_key 207 lesson capture.

## Current State

- **Branch:** `main` at `491e4f4`
- **Tests:** no test suite (WP framework); `phpcs --standard=WordPress` 0 errors; `npm run build` clean
- **Build:** webpack compiled successfully; 0 critical via `css-pattern-audit.js` across 170 CSS files
- **Uncommitted changes:** stale-from-prior-sessions noise only (lucide-icons.php auto-timestamp, .gitignore, gemini-vision-audit reports); nothing this session
- **Live deploy:** sandybrown post 29 — gradient gone, all measurable properties match mockup

## Known Issues / Blockers

- **15px Windows scrollbar gap on hero right edge** (H-7 in parking — needs framework full-bleed pattern replacement using JS-set viewport-width, OR accept-and-document)
- **Bean perceives pink shade as "wrong" in some lighting** even with mockup-CSS-perfect parity (H-4 brand-source PNG sampling deferred)

## Next Priorities (in order)

1. **H-5 (CRITICAL) — classifier human-eye gate** — `scripts/screenshot-diff-helper.js` + `requires_screenshot_review` flag in parity validator + bake Section Q rule into `/visual-qa` via /lifecycle. The single biggest QC reliability gap.
2. **H-9 — audit framework gradient shorthand patterns** across all SGS blocks (extends Section R fix beyond hero).
3. **H-7 — replace negative-margin full-bleed pattern** with viewport-aware solution (Mac + Windows + mobile tested).
4. **H-1 + H-2 — hero block inspector reorganisation** by element (Container, Eyebrow, Headline, Subheadline, Image, Badges, Buttons) + image/media padding clarity. Pattern propagates to all blocks.
5. **H-3 + H-4 + H-6 + H-8 + H-10** — remaining hardening gaps per parking.md.

## Files Modified

| File path | What changed |
|---|---|
| `plugins/sgs-blocks/src/blocks/hero/style.css` | Added `:not(.has-background)` to gradient exclusion + `background:` → `background-image:` |
| `scripts/mockup-parity-validator.js` | Extended WATCHED with backgroundImage / filter / mixBlendMode + 7 family members |
| `scripts/colour-parity-audit.js` | NEW — automates mockup `:root` vars vs variation palette diff |
| `.claude/specs/common-wp-styling-errors.md` | Sections Q (4 classifier traps) + R (4 measurement traps) |
| `.claude/mistakes.md` | Top 2 entries: gradient masks bg + classifier-trap |
| `.claude/parking.md` | H-1 through H-10 |
| `.claude/state.md` | phase=framework-qc-hardening, recommended_model_next=opus |
| `.claude/handoff.md` + `.claude/next-session-prompt.md` | Long-form versions of this handoff |
| `~/.openclaw/workspace/memory/learning/2026-05-05-extend-measurement-set-when-human-eye-disputes.md` | NEW lesson |
| `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_extend_measurement_set_when_human_eye_disputes.md` + MEMORY.md | NEW CC auto-memory + index |
| blub.db row 207 | NEW correction `extend-measurement-set-when-human-eye-disputes` |

## Notes for Next Session

- **The wp_global_styles reset+reapply is mandatory after any variation file change.** Use `node scripts/global-styles-reset.js --site sandybrown-nightingale-600381.hostingersite.com --theme sgs-theme --variation mamas-munches`.
- **Use `wp.blocks.createBlock + replaceBlock` for post attribute updates**, NOT `updateBlockAttributes` (silently rejected on blocks with save.js validation errors). H-6 packages this.
- **Pre-commit STOP GATE works** — accepts commits when `reports/visual-diff/<block>-<date>.md` has `verdict: PASS` AND `first_paint_capture_passed: true`.
- **SSH to sandybrown** is the same as palestine-lives: `u945238940@141.136.39.73:65002`, `~/.ssh/id_ed25519`, domain `domains/sandybrown-nightingale-600381.hostingersite.com/public_html/`. WP admin: `Claude` / `MigrationSweep2026!`.
- **The binding rule for Opus session** (blub.db 207): when measurements say match but Bean says wrong, extend until pixel-level evidence agrees.

## Next Session Prompt

~~~
You are a senior WordPress framework engineer specialising in QC infrastructure, prevention scripts, and structural enforcement of measurement methodology — closing every gap captured in the past 3 days of hero perfect-clone work.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-05-framework-qc-hardening"`

Read CONVERSATION-HANDOFF.md and `.claude/handoff.md` for full context, then work through these priorities:

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
Build `scripts/screenshot-diff-helper.js` (mockup vs SGS image comparison + pixel-diff heatmap), add `requires_screenshot_review: true` flag to parity validator for any Q1-Q4 / R1-R4 pattern delta, bake Section Q binding rule into `/visual-qa` skill via /lifecycle. Use `/dispatching-parallel-agents` — sub-tasks touch independent files.

## Task 2 — H-7: Negative-margin full-bleed pattern replacement (~45 min)
Replace `margin: 0 -24px` with viewport-aware solution (`width: 100vw + calc(50% - 50vw)` OR JS-set `--viewport-width` to handle Windows scrollbar). Test Mac + Windows + mobile + multi-template-padding scenarios.

## Task 3 — H-1 + H-2: Hero block inspector reorganisation (~75 min)
Reorganise edit.js panels by element (Container / Eyebrow / Headline / Subheadline / Image / Badges / Buttons) instead of by CSS-rule. Address `imagePadding` vs `mediaPadding` redundancy with renamed labels + help text. Pattern propagates framework-wide.

## Task 4 — H-9: Audit framework gradient shorthand patterns (~30-60 min)
Grep all `plugins/sgs-blocks/src/blocks/*/style.css` for `background: linear-gradient` or `background: url(`. For each: ensure `:not(.has-background)` exclusion + switch `background:` shorthand to `background-image:`. Extends Section R fix beyond hero.

## Task 5 — H-8 + H-3 + H-4 + H-6 + H-10
Remaining gaps per `.claude/parking.md`. H-3 (video-everywhere) is the largest — build foundation + hero proof, defer 11 blocks. H-4 (brand pink) needs Bean decision (5 min). Others mechanical (~45-90 min total).

## Guardrails

- Run `node scripts/css-pattern-audit.js` and `node scripts/font-source-audit.js` before any commit.
- Pre-commit STOP GATE blocks block-src commits without passing `reports/visual-diff/<block>-<date>.md`.
- Use `node scripts/global-styles-reset.js` after every variation JSON change.
- Don't dismiss any parity-validator delta as "structural noise" without screenshot evidence (Section Q binding rule).
- For block-attr changes on existing posts: use `wp.blocks.createBlock + replaceBlock` (never `updateBlockAttributes`).
~~~
