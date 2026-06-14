---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-14
---

# Session Handoff — 2026-06-14 (D227 — Tasks 1+2 of full-fidelity plan: doc-align + defect register)

## Completed This Session
1. **Task 1 — doc-read + align (D227, commit `7b112d3a`).** Resolved the 2 critical Bean-decision findings from the D226 audit: (a) content-width — live `theme.json` had drifted to `contentSize:780px`; restored to documented `1200px/1400px` (Bean chose widen-global); (b) button-presets — FALSE ALARM, WP generates the vars natively from `theme.json` (confirmed populated), admin file deliberately deleted D24.
2. **Count-drift sweep across 8 docs** (background agent): `block_composition` 189→197, container roster →31, `slots`-element →99, `block_attributes` →2,935, `property_suffixes`→124, +`sgs/trust-bar` in class-section rosters.
3. **Remaining doc-alignment (agent 2, all HIGH claims code-grep-verified):** Spec 02 info-box/testimonial-slider/cta-section/process-steps attr corrections; Spec 22 FR-22-9/19/5.1; Spec 29 Method-2 callout; Spec 20 9c-before-4k; docs-registry WRAPPER-CSS entry added.
4. **Verify-first corrected the audit register itself:** the audit's Spec-21 artefact "not emitted" claims were over-stated — `stage-7/4i/4j.json` ARE emitted (by `sgs-clone-orchestrator.py`, not `converter_v2/`).
5. **Task 2 — clone-vs-draft defect register (commit `33feb5ab`).** 4 parallel agents diffed the live clone vs draft section-by-section → `.claude/reports/2026-06-14-clone-vs-draft-defect-register.md` (~44 real defects), replacing the 55-issue ledger.
6. **Synthesised 5 systemic converter families** (fix once, fix many): B malformed `unitless` line-heights · C mobile heading tier dropped · D max-width dropped · E image styling dropped · F grid breakpoint mismatch. Plus 5 block-match decisions + 7 header/footer template-part gaps.
7. **Live-probed page 8 @1440+@502 (R-22-11):** CONFIRMED C/D/E/IN-E/ingredients-2-col/disclaimer; CORRECTED 2 false positives (label-as-pill computes transparent; testimonial author font matches) — killed before a wasted build wave.
8. **Next-session-prompt rewritten** for Task 3 (fix-by-family) with all structural defences carried forward + extended (commit `90860192`).

## Current State
- **Branch:** `main` at `90860192` (+ next-session-prompt heading fix, committed at handoff close)
- **Tests:** no suite run — changes are docs + one theme.json config value
- **Build:** n/a (converter unchanged; no `npm run build` needed)
- **Uncommitted changes:** 6 pre-existing files NOT from this session (phase4 reports, `current-clone-page-source.html` [read-only input], `theme-snapshot.json`, an untracked gap-analysis report) — deliberately left
- **Deploy status:** theme.json width fix committed but NOT yet deployed to page 8 (Task 3 step 0)

## Known Issues / Blockers
- The `contentSize 1200/1400` fix is committed-but-not-live-verified — page 8 still renders 780px until Task 3 step 0 deploys it.
- decisions.md carries 6 pre-existing US spellings (lines 84/114/117) + 1 TBD in historical entries (not this session's D227) — noted, not rewritten (archived content).

## Next Priorities (in order)
1. **Task 3 step 0** — deploy width fix + re-clone page 8 for a fresh live baseline (smallest first action).
2. **Task 3 step 1** — resolve the 5 block-match decisions (DEC-1..5) with Bean.
3. **Task 3 step 2** — fix the systemic families universally, biggest lever first (D → F → C → E → B), design-gated, live-verify per row.
4. **Task 3b** — header/footer content gap (theme/data layer, not converter).
5. **Task 4** — block.json selector auto-seed (design-gate, independent).

## Files Modified
| File path | What changed |
|-----------|--------------|
| theme/sgs-theme/theme.json | contentSize 780→1200, wideSize 1200→1400 |
| CLAUDE.md (root) | DB-first counts: slots 103/99, block_attributes 2,935, container roster 31 |
| .claude/decisions.md | +D227 |
| .claude/specs/{00,02,20,21,22,29,WRAPPER-CSS-ROUTING-DESIGN-GATE}.md | count + attr + artefact alignment |
| .claude/cloning-pipeline-flow.md, -stages.md | count alignment |
| .claude/docs-registry.yaml | WRAPPER-CSS entry added |
| .claude/reports/2026-06-14-clone-vs-draft-defect-register.md | NEW — Task 2 deliverable |
| .claude/next-session-prompt.md | rewritten for Task 3 |

## Notes for Next Session
- The defect register's family view is the lever: ~32 of ~44 defects are converter-side and collapse into 5 families. Fix the family, not the instance (R-22-9).
- Live-probe BEFORE believing any static-diff "defect" — an inline CSS-var declaration is not the rendered value (blub 355, instance of 207).
- Fam D (max-width / class-section Method-2 gap) is the biggest lever and likely needs its own `/brainstorming` design session.
- Header/footer gaps (HF-1..7) are theme template-part + SGS Site Info data, NOT converter bugs — different fix layer.

## Next Session Prompt

The full orchestration plan is already written to `.claude/next-session-prompt.md` (Task 3 fix-by-family, with per-step orchestration, the 5 block-match decisions, dependency graph, methodology guardrails, pre-flight ritual, Skills/MCP/Agents tables). The SessionStart hook auto-loads it. Key bindings below.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Fam-D Method-2 routing shape + Task 4 schema design |
| `/gap-analysis` | grade any unit/register vs acceptance before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | WP/theme.json/block.json patterns (grid auto-fill, flex stretch) |
| `/strategic-plan` | if Fam-D fix needs a formal phased plan |
| `/adversarial-council` | MANDATORY on every shared-mechanism/converter change (Rule 7) |
| `/qc-council` | MANDATORY before every converter/SGS-block/seeding commit (blub 255) |
| `/subagent-driven-development` · `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | per-family build / re-clone / reseed / schema ground truth |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright (chrome-devtools fallback on "Browser already in use") | live page-8 computed-style probes; canary `?page_id=8` on `WP_URL_SANDYBROWN`, creds `.claude/secrets/sandybrown.env` |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | roster / attrs / derived_selector / container_kind (DB-authoritative) |

## Agents to Delegate To

| Agent | When |
|-------|------|
| general-purpose (sonnet) | per-family build — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku / gemini-flash) | 2nd cross-family rater on /qc-council |
| `wp-sgs-developer` | heavier block.json/render.php work (product-card, media attrs, composites) |
| `design-reviewer` | visible-surface review at 375/768/1440 + Task 5 product-page redesign |

## Research Approach
Not required for Task 3 step 0-1. For step 2: use `/research-check` + `/library-docs` on specific WP patterns where unsure (CSS grid explicit-columns vs auto-fill for the ingredients 4-up; flex-column stretch for full-width CTA). Not a research-heavy session.

## Guardrails
Verify on the REAL page 8 (R-22-11) — emit-green ≠ live; live-probe before believing a static-diff defect. Fix by family (R-22-9). /adversarial-council before shared-mechanism changes + /qc-council per converter commit. Run BOTH conformance suites (Gate A `scripts/tests/test_converter_conformance.py` + `converter_v2/tests/`). Commit path-scoped (`-m` before `--`). Subagents implement; never `git checkout/restore/stash/reset/clean` the shared tree. D-ceiling D227.
