---
recommended_model: opus
session_date: 2026-05-08
---

# Session Handoff — 2026-05-07/08

## Completed This Session
1. **Schema migrations applied** — sgs-db `patterns` table extended (8 new columns + UNIQUE INDEX on fingerprint); uimax migrated with `patterns` / `naming_conventions` / `animations` / `mood_boards` / 5 stack tables / classification cols on 10 existing tables / `is_emoji` flag / `equivalent_implementations` JSON cols. Both DBs live.
2. **3 pipeline scripts shipped** — `pattern-fingerprint.py` (513 lines), `pattern-classify.py` (624 lines), `pattern-register.py` (867 lines). Plus `/sgs-db` extended with 4 cloning subcommands.
3. **uimax catalogues populated** — 16 naming conventions (BEM/SGS/WP/Tailwind/Bootstrap/MUI/Spectra/Astra/Kadence/shadcn/Lovable/v0/Bolt/OOCSS/SUIT/ACSS), 63 animations (7 gap candidates), 12 emoji libraries flagged with Rosetta Stone equivalents.
4. **Bucket 1 effects shipped to all applicable blocks** — form-focus-ring, ripple-on-click (all sgs/* via hover-effects extension), svg-path-draw-on-scroll. Webpack clean.
5. **Image controls block extension built (P-6)** — `image-controls.js` + `image-controls.php` + 7 blocks opted-in via `supports.sgs.imageControls: true`.
6. **Reduced-motion CSS audit (P-8)** — 8 redundant rules removed across 4 files. 1 kept (header-modes scroll-driven shrink).
7. **block-name-search-blindspot grep wrapper (P-14)** — `scripts/sgs-block-grep.py` triple-term search (literal + parenthetical-stripped + slug-form). Tested clean.
8. **Diagnose-blub-db-locks rule embedded (P-16)** — HARD GATE in `/autopilot/references/correction-capture.md` + Persistence-failure banner in `/handoff` Pre-Handoff Gates.
9. **Rosetta Stone discipline embedded** — 4 surfaces (project CLAUDE.md, sgs-wp-engine SKILL.md Hard Rule 7, ui-ux-pro-max SKILL.md Stage 5 HARD GATE, animation-harvest deprecation stub).
10. **Audit + design review** — 4-model peer review (Sonnet/Flash/Pro all ship-with-fixes; 11 fixes). Rule-stage coverage audit (97 rules, 28 genuine gaps, Top-12 ranked). Parking restructured 461→245 lines; 6 new entries P-11-P-16. Specs pruned (~75% line reduction).

## Current State
- **Branch:** `main` at `456d5e8` (this session's commits pending push)
- **Tests:** no automated test suite (visual-qa pipeline + multi-frame capture is the equivalent)
- **Build:** webpack `npm run build` passes clean
- **Uncommitted changes:** ~44 files staged (full session)
- **Live test sites:** palestine-lives.org sandybrown post 29 (hero PoC intact); post 30 reserved for next session's Mama's smoke

## Known Issues / Blockers
None blocking. 28 genuine gaps from rule-stage audit are documented + ranked; Top-5 are addressed in next-session plan.

## Next Priorities (in order)
1. **Execute parking P-11 — /sgs-clone build session.** 10 milestones in one focused session via subagent orchestration. Specialised prompt at `.claude/next-session-prompt-cloning-skill-build.md`. Includes Mama's homepage smoke as Milestone 9.
2. **Parking P-9 — Bucket 2 + timeline rework.** After P-11. Specialised prompt at `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md`. Strategic dogfood opportunity for /sgs-clone.
3. **Top-5 gap closures from audit** — folded into P-11 Milestones 4-6.

## Files Modified
| File | What changed |
|------|---|
| `.claude/state.md` | Phase advanced to cloning-skill-build |
| `.claude/handoff.md` + `.claude/parking.md` | Comprehensive session handoff + parking restructured 461→245 lines |
| `.claude/next-session-prompt-{cloning-skill-build,bucket-2-blocks-and-timeline}.md` | NEW — 10-milestone P-11 prompt + P-9 prompt |
| `.claude/reports/{fingerprint-design-review-{brief,synthesis},rule-stage-coverage-audit,animation-gap-audit}-2026-05-0X.md` | NEW — 4 audit/review docs |
| `.claude/specs/{cloning-skill-salvage-matrix,pattern-dedup-classify-mechanics}-2026-05-05.md` | Pruned + Rosetta Stone addendum |
| `scripts/migrations/{sgs-db,uimax}-cloning-2026-05-07.sql` | NEW — schema migrations |
| `scripts/sgs-block-grep.py` | NEW — block-name search wrapper (P-14) |
| `plugins/sgs-blocks/scripts/pattern-{fingerprint,classify,register}.py` | NEW — 3 pipeline scripts |
| `plugins/sgs-blocks/src/blocks/extensions/{image-controls.js,index.js,hover-effects.js}` | Image controls extension + ripple click |
| `plugins/sgs-blocks/includes/{image-controls,hover-effects,class-sgs-blocks}.php` | Render filters + enqueue |
| `plugins/sgs-blocks/src/blocks/{form,decorative-image,card-grid,gallery,hero,info-box,team-member,testimonial}/*` | Bucket 1 attrs + image-controls opt-in |
| `plugins/sgs-blocks/assets/{js/animation-observer.js,js/ripple.js,css/extensions.css}` | Path-draw observer + ripple JS + extensions CSS |
| `plugins/sgs-blocks/src/blocks/reading-progress/style.css` + `theme/sgs-theme/assets/css/{dark-mode,header-modes,reading-progress}.css` | Reduced-motion redundancy removed (P-8) |
| `CLAUDE.md` | Image controls discipline + Rosetta Stone discipline rules |
| `~/.claude/skills/{sgs-wp-engine,ui-ux-pro-max,animation-harvest,autopilot}/...` | Hard Rule 7 + Stage 5 INGEST HARD GATE + deprecation stub + correction-capture HARD GATE |
| `~/.claude/commands/handoff.md` | Persistence-failure banner at top of Pre-Handoff Gates |
| `~/.claude/skills/sgs-wp-engine/scripts/{sgs-db.py,populate-db.py}` | 4 cloning subcommands + defensive `_comment_*` skip |

## Notes for Next Session
- Bean's "passport" framing — uimax is the **cross-platform translation layer**. Every uimax write must carry SGS-block equivalent or flag the gap.
- 4-layer fingerprint scales DOWN for atomic blocks (Layers 1+2 only) and UP for composite blocks (all 4). sgs/hero is the exception (composite); most blocks are atomic.
- Per-section convention voting (drops single-convention assumption) is a Top-3 gap — real sites mix BEM + Tailwind + Bootstrap on different sections.
- Computed-style passport is the Top-1 gap — Locofy/Stackbit-style spatial signature inspector for hashed-class fallback (CSS Modules, MUI, SvelteKit).
- For P-11 dispatching: Cerebras free-tier rate-limits on concurrent calls — sequence Cerebras work, parallelise across DIFFERENT model branches for Sonnet × N.

## Next Session Prompt

~~~
recommended_model: opus

You are a senior cloning-pipeline architect specialising in deterministic HTML→WordPress block translation, multi-platform design tokenisation, and parallel-subagent orchestration. The next session executes parking entry P-11 — the comprehensive `/sgs-clone` build via 10-milestone subagent orchestration.

## Where You Are

Plan: `.claude/next-session-prompt-cloning-skill-build.md` (10 milestones, ~6-7 hr wall-time)
Current phase: cloning-skill-build (P-11)
Progress: 0/10 milestones — foundation locked from 2026-05-07/08 session
Next task: Milestone 1 — Schema sync extensions

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then `.claude/next-session-prompt-cloning-skill-build.md` for the milestone-by-milestone plan with subagent dispatch specs.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Architectural decisions during Top-5 gap closures (Milestone 6) |
| `/gap-analysis` | Grade `/sgs-clone` skill body before delivery (Milestone 7 — folded into /lifecycle Stage 3) |
| `/lifecycle` | Milestone 7 — build /sgs-clone + 5 sibling commands (Mode A) |
| `/research` | Auto-routes if any gap surfaces unexpected complexity |
| `/strategic-plan` | Already done; invoke only if scope drift mid-session |
| `/sgs-wp-engine` | Throughout — central authority for SGS WordPress |
| `/qc-inline` | After every milestone return — Bean's standing rule |
| `/dispatching-parallel-agents` | Milestones 1-6 |
| `/subagent-prompt` + `/delegate` | Each subagent dispatch needs a tight cold prompt + model pick |
| `/visual-qa` | Milestones 8-9 — full 9-layer QA pipeline |

## MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| Playwright MCP | Milestones 8-9 — Mama's hero + full homepage smoke runs |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>` | Query SGS DB — fingerprint subcommands shipped 2026-05-07 |
| `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<query>"` | Query uimax DB |
| `node tools/multi-frame-qa/capture.js` | First-paint capture (Milestones 8-9) |
| `node scripts/mockup-parity-validator.js` | Computed-style diff with Q1-Q4 + Section R measurement |
| `node scripts/screenshot-diff-helper.js` | **Mandatory before reducing classifier severity (Hard Rule 10)** |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Throughout — all SGS WordPress build work |
| `design-reviewer` | Milestones 8-9 — visual quality of Mama's clone vs mockup |
| `research-pipeline` | If a milestone surfaces an unexpected question |

---

## Task 1: Milestones 1-3 — Foundation (~3 hrs parallel-subagent)

Schema sync extensions + Layer 1+2 fingerprint catalogue + 8 base role templates + Layer 3+4 + 5 missing roles. Heavy parallel Cerebras + Sonnet × 3-5 dispatch per milestone. /qc-inline after each return.

## Task 2: Milestones 4-6 — Critical fixes + Top-5 gap closures (~4 hrs parallel)

5 critical fixes from peer review + 4 important fixes + Top-5 gap closures (computed-style passport, pairing index, per-section convention voting, recognition_log + operator UI, 5 missing roles).

## Task 3: Milestones 7-10 — Skill build + smoke + handoff (~3 hrs)

Build `/sgs-clone` + 5 sibling commands via `/lifecycle` Mode A (≥B grade). Mama's hero smoke. Full Mama's homepage smoke deployed to sandybrown post 30. Final `/handoff`.

## Guardrails

- Use Opus for orchestration; Sonnet/Cerebras subagents for mechanical work
- Cerebras free tier rate-limits on concurrent calls — sequence Cerebras, parallelise across model branches
- Hard Rule 6 — patterns are per CLASS, not per CLONE
- Hard Rule 7 — every uimax write carries cross-platform equivalents or flags the gap (Rosetta Stone, blub.db row 213)
- Hard Rule 10 — never reduce classifier severity without screenshot-diff evidence
- blub.db row 211 — no licensing language in cloning context
- Pre-commit STOP GATE catches block-src commits without passing visual-diff
- wp_global_styles reset+reapply mandatory after any variation change

Success criteria: Mama's homepage cloned to sandybrown post 30 with ≥85% pattern fidelity; `/sgs-clone` skill at ≥B grade; recognition_log capturing leftovers; uimax sync gap closed.
~~~
