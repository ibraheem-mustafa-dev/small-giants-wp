---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-23-batch-gap-analysis-plus-parking
generated: 2026-05-22
parent_session: small-giants-wp-2026-05-22-architecture-programme-close-out
primary_goal: "Run /batch-gap-analysis on 14 WP/SGS skills for quality baseline (~3 hours, single focused session, blub.db row 176 hard gate forbids shortcuts), then resolve the remaining DECISION-NEEDED parking item, then walk STILL-OPEN parking items by importance."
---

# Next session — batch gap-analysis + parking finishers

Invoke `/autopilot` before doing anything else.

## State recap (plain English)

The architecture programme is **CLOSED**. All 11 phases shipped in the previous session — 18 commits on main. Sandybrown is live on WP 7.0 with `Sgs_Ai_Connector` deployed. Mode B (`/sgs-update --refresh-upstream`) verified end-to-end on all 10 sources with the working PAT.

What's left: **a quality baseline grade across the 14 WP/SGS skills** we revised, plus **the still-open parking items** that didn't auto-resolve.

The `/batch-gap-analysis` skill mandates: FULL `/gap-analysis` protocol per target, sequential, in main conversation. **NO subagent dispatch**, NO `sgs-skillscore.py` substitution (blub.db row 176 hard gate, captured after the SSB Phase 6 violation). Realistic time: ~3 hours for 14 targets.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — design decisions during GA opportunity selection |
| `/gap-analysis` | ALWAYS INCLUDE — invoked PER TARGET by batch-gap-analysis (full protocol) |
| `/lifecycle` | ALWAYS INCLUDE — for any skill edits that GA surfaces as opportunities |
| `/research` | ALWAYS INCLUDE — gap-analysis triggers research rounds when validator flags thin findings |
| `/strategic-plan` | ALWAYS INCLUDE — for sequencing parking item resolutions |
| `/batch-gap-analysis` | THE main skill — orchestrates the 14-target pass |
| `/qc-inline` | After GA report, for small artefact validations |
| `/capture-lesson` | When GA surfaces patterns worth turning into rules |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `search.py` | Iterative research rounds when GA validator flags thin coverage |
| `curl /api/knowledge` | Every GA target POSTs to dashboard for blub.db persistence |
| `python ~/.agents/skills/gap-analysis/scripts/validator.py` | Per-target validator (refuses incomplete evaluations) |
| `python ~/.claude/hooks/wp-blocks.py` | Schema queries during GA reviewing of SGS-specific skills |
| WP-CLI over SSH | Live verification when GA flags an unverified code example |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If GA surfaces an SGS block / theme / plugin code fix worth doing inline |
| `research-pipeline` | If a GA opportunity proposes a competitive analysis or cutting-edge feature |

## Research Approach

GA's per-target protocol triggers research automatically via validator signals. No upfront research needed — just dispatch the batch and let validator-driven research rounds fire per target. If a target's evaluation gets stuck below threshold after 3 iterations, surface to Bean rather than continuing to spin.

---

## Task 1 — Batch gap-analysis on 14 skills (THE MAIN WORK)

**What:** Run `/gap-analysis` full protocol against the 14 WP/SGS skills revised in the previous session (original 10 + sgs-wp-engine + wordpress-router + sgs-extraction + sgs-clone). Per-target validation, S-grade candidate screening, opportunity detection. Single batch report at `reports/2026-05-23-batch-gap-analysis-wp-skills.md`.

**Why:** Quality baseline post-WP-7.0-revisions. Identifies (a) which skills are now A-tier vs B-tier, (b) S-grade candidates worth promoting, (c) opportunities for further improvement. Without this, we have no measurable signal on whether the WP 7.0 revisions actually moved the quality bar.

**Estimated time:** ~3 hours sequential, ~12-15 min per target.

**Orchestration:**
- Execution: **inline (main thread)** — `/batch-gap-analysis` skill's blub.db row 176 hard gate forbids subagent dispatch and forbids `sgs-skillscore.py` substitution. Full protocol per target.
- Dispatch pattern: sequential (skill explicitly caps Cerebras parallelism at 2; this skill stays sequential per its own design)
- Per-target: `/gap-analysis` invokes research rounds (min 2 external + 4 internal on round 1), criterion scoring, 5-lens check, opportunity detection, S-grade screen, validator pass. Iterate up to 3 times per target on validator failures.
- /qc gate after: built into the skill's own validator (`scripts/validator.py` per target + batch).

**Acceptance:**
- 14 per-target JSON evaluation files in `reports/batch-gap-analysis-wp-2026-05-23/`
- 1 review report at `reports/2026-05-23-batch-gap-analysis-wp-skills.md`
- Waiting-queue surfaced: S-grade confirms + opportunity selections + circuit-breaker targets
- Every target POSTed to `/api/knowledge` (category=gap-analysis)

**The 14 targets** (paths — all symlinked between ~/.claude/skills/ and ~/.agents/skills/):
1. wp-block-development
2. wp-block-themes
3. wp-interactivity-api
4. wp-plugin-development
5. wp-rest-api
6. wp-wpcli-and-ops
7. wp-performance
8. wp-abilities-api
9. wp-site-extraction
10. wp-project-triage
11. sgs-wp-engine
12. wordpress-router
13. sgs-extraction
14. sgs-clone

Excluded: `sgs-discover` (WP-7.0-agnostic by design per audit §4). Slash commands at `~/.claude/commands/*.md` excluded (different shape — grade separately if Bean wants).

## Task 2 — Resolve P-5A-CLIENT-VARIATION-CSS-PATH

**What:** Orchestrator helper currently returns a deleted path (the pre-Phase-5a `theme/sgs-theme/styles/<client>.css` location). Redirect to the new per-client path: `sites/<client>/theme-overrides.css` (if Bean confirms this is the intended new location).

**Why:** Stage 0.7 of the cloning pipeline calls this helper. Without the redirect, the next clone run will reference a path that doesn't exist.

**Estimated time:** ~15 min (find the helper, swap the path, verify Stage 0.7 still resolves).

**Orchestration:**
- Execution: inline. Small enough not to need a subagent.
- Acceptance: grep `theme/sgs-theme/styles/*.css` in orchestrator scripts returns 0 matches; the new `sites/<client>/theme-overrides.css` path is used; Stage 0.7 dry-run passes.

## Task 3 — Walk STILL-OPEN parking items by importance

**What:** Walk the 16 STILL-OPEN parking entries in `.claude/parking.md`. Top 3 by importance (per the parking sweep classifier):
1. **P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP** — the architectural change that unlocks G1+G3+G5 (dominant pixel-diff gap). NOT a small task.
2. **P-G4-MEASUREMENT-DECONTAMINATION** — `pixel-diff.py` admin bar + sgs-header contamination (+10-20pp systematic inflation).
3. **P-FR1-VARIATION-BUF-CONSISTENCY** — 1-line fix in `convert.py:3670-3689`.

**Why:** P-FR1 is a quick win; P-G4 unblocks honest measurement; P-WAVE-2 is the big-ticket pixel-diff unlock.

**Estimated time:** P-FR1 ~10 min; P-G4 ~30-45 min; P-WAVE-2 likely a full session of its own.

**Orchestration:**
- Execution: P-FR1 inline. P-G4 inline or single sonnet subagent. P-WAVE-2 needs a strategic plan first (use `/strategic-plan`).
- Acceptance: P-FR1 — variation_buf gets the fast-path append, idempotency proven. P-G4 — pixel-diff with addInitScript on a known section shows expected inflation reduction.

## Dependency graph

```
Task 1 (batch GA, ~3 hours, inline)
  ↓ (independent — Task 2 doesn't depend on GA)
Task 2 (P-5A redirect, ~15 min)
  ↓
Task 3.1 P-FR1 fix (~10 min)
  ↓ /qc-inline gate
Task 3.2 P-G4 decontamination (~30-45 min)
  ↓
Task 3.3 P-WAVE-2 (likely a future session — needs strategic-plan first)
```

## Methodology guardrails (do not skip)

- **blub.db row 176** — `/gap-analysis` runs in main conversation, full protocol per target. NEVER substitute `sgs-skillscore.py` or `docscore.py`. Triage allowed as optional pre-step, never as replacement.
- **blub.db row 255** — Multi-model `/qc` panel before every commit touching converter / pipeline / SGS block logic.
- **blub.db row 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`, never full-page.
- **blub.db row 283** — Verify WP API surface via `curl developer.wordpress.org/reference/functions/<name>/` before dismissing intelephense warnings or writing code that calls them.
- **Skills are symlinked** between `~/.claude/skills/<name>/` and `~/.agents/skills/<name>/` (hard-linked inodes). Edit one, both update. Confirmed across 12 dispatches this session.
- **PAT is rotated + working.** `GITHUB_PERSONAL_ACCESS_TOKEN` in `~/.openclaw/.env` ends `Gf0TcI9k` (classic format). Rate limit 4995/5000 with `public_repo` scope. Mode B `--refresh-upstream` works on all 10 sources.
- **Sandybrown REST credentials** at `.claude/secrets/sandybrown.env`. SSH `u945238940@141.136.39.73 -p 65002`. WP 7.0 live.

## Reference docs

- `.claude/handoff.md` — full session summary (2026-05-22)
- `reports/phase-7-skills-audit-2026-05-22.md` — original 10-skill audit (input to GA)
- `reports/phase-7-skills-audit-extended-2026-05-22.md` — extended 14-target audit
- `reports/2026-05-22-parking-sweep-classification.md` — 47-entry parking classification
- `.claude/parking.md` — live parking state (16 actually-open)
- `.claude/state.md` — programme CLOSED status
