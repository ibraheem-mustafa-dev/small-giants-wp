---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-20-media-sideload-heading-lift-then-close-brand
recommended_model: sonnet
generated: 2026-05-19
plan_revision: v6 (post Path B ship)
---

You are a senior SGS Framework architect closing Phase 9 brand walkdown. The 2026-05-19 session shipped Path B (sgs/media + sgs/text dynamic blocks, converter swap). Brand pixel diff dropped 3-8pp across viewports but is at 10.6%-28.8%, not the ≤1% goal. Two remaining contributors are bigger than the rest combined; close them first.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-20-media-sideload-heading-lift-then-close-brand"`

## ALWAYS-LOAD invocations

1. `/autopilot`
2. Read `.claude/handoff.md` — 2026-05-19 Path B summary
3. Read `.claude/state.md` — current state + blockers
4. Read `.claude/parking.md` — 7+ entries from this walkdown
5. Read `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` top 5 rules including the new `feedback_qc_panel_must_assert_file_existence` (when artefact is a file, QC must `ls`/`wc -l`/`head -1` it end-to-end)

## Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | If Path A vs sgs/heading-wrapper-drop decision needs framing |
| `/gap-analysis` | Grade any new converter changes |
| `/lifecycle` | If skill/agent edits needed |
| `/research` | Probably none — most work is mechanical |
| `/strategic-plan` | Plan hero walkdown once brand closes |
| `/systematic-debugging` | Per-section log analysis on hero |
| `/qc` | Multi-rater panel before EVERY commit touching converter (binding rule) — INCLUDE file-existence assertion per new rule |
| `/qc-inline` | Self-check during implementation |
| `/sgs-wp-engine` | All SGS framework work |
| `/sgs-update` | MANDATORY — refresh sgs-framework.db with sgs/media + sgs/text registrations |
| `/wp-block-development` | If sgs/heading needs a `noWrapper` variant |

## MCP & Tools

| Tool | What for |
|---|---|
| `mcp-wordpress` REST | Update sandybrown post 65 with new converter output |
| Playwright | Re-screenshot brand at 3 viewports |
| `python scripts/pixel-diff.py --selector .sgs-brand --expected-rules ... --extracted-attrs ...` | Per-section split-metric diff |

## Agents to Delegate To

| Agent | When |
|---|---|
| Sonnet via `/delegate` | Implementation of media-sideload non-dry-run + URL replacement (~30 min, mechanical) |
| Sonnet adversarial | Cerebras replacement in /qc panel |
| `wp-sgs-developer` | If atomic_heading Path A wiring needs WordPress-specific judgement |

---

## Task 1 — Media sideload non-dry-run (~30 min, BIGGEST IMPACT)

**Why this first:** the live rendered post 65 has `<img src="http://../../research/photography/wp-media-library/Halimahs.jpeg">` — broken URL. Image area is white-empty. Almost certainly the biggest single contributor to the 28-29% pixel diff on desktop + mobile. Until this is fixed, no amount of styling can close pixel diff.

**What:** the orchestrator's stage-4i media-sideload runs in `--dry-run` mode by default. Need to either:
- (a) Run media-sideload for real (upload to sandybrown WP Media Library, replace URLs in extract.json), OR
- (b) Add a URL-rewrite step that maps mockup-relative paths to deployed asset URLs (Hostinger media library or theme assets/)

Check `plugins/sgs-blocks/scripts/orchestrator/media_sideload.py` (or wherever stage 4i lives) — find the dry-run gate and document what the live mode does. If it uploads to WP Media Library, run it. If it doesn't yet, add it.

After: re-run converter, re-update post 65, re-measure pixel diff. Expect 1440 and 375 to drop by 10-20pp.

## Task 2 — `/sgs-update` to refresh DB with sgs/media + sgs/text (~5 min)

Local `wp-blocks validate` currently reports "Unknown block: sgs/text" because sgs-framework.db hasn't been refreshed. Run `/sgs-update` to re-scan and update. Then re-run shakeout — validation should pass cleanly.

## Task 3 — Path A for atomic_heading (~20 min)

The headline `.sgs-brand__headline` is still emitted as core/heading with style.* JSON (invisible). Adding inline `style="..."` to the saved `<h2>` opening tag is the safest fix — no DOM structural change.

In `convert.py` atomic_heading branch:
1. After getting `style_dict` from `_lift_core_block_style`, build a CSS string: `font-size:28px;color:var(--wp--preset--color--text);margin-bottom:20px;...`
2. Inject as inline style on the `<h2>` opening tag
3. Keep the JSON attrs so the editor still sees them

Verify on sandybrown brand section after re-deploy.

## Task 4 — Parent-qualified tag-selector smarter guard (~45 min, P-PARENT-QUALIFIED-TAG-LIFT)

The current SGS-class guard in `_lift_core_block_style` rejects ALL tag-only selectors to prevent blast radius. This blocks legitimate parent-qualified lifts like `.sgs-brand__body p { font-size:17px }`.

Modify `_collect_css_decls_for_element` to ALSO return the matched selectors. In `_lift_core_block_style`, allow declarations through if the matched selector contains an `.sgs-` class anywhere in its chain.

## Task 5 — Re-measure brand at 3 viewports + branch

Expected after Tasks 1+3+4: ≤5% on at least one viewport. Multi-rater /qc panel before commit (binding rule #2). Run /sgs-update for DB refresh.

## Task 6 — Hero walkdown opens (~60-90 min if time)

Same loop as brand. Single-section command:

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage \
  --section "section.sgs-hero" \
  --converter-v2 --no-scaffold-new-blocks \
  --skip-register --skip-autonomy-gate \
  --mode draft --debug-trace
```

Hero already uses sgs/hero (slot-aware path) so the Path B work doesn't directly apply. Hero needs its own debugging via the trace + expected-rules baseline + pixel-diff loop.

## Guardrails

- **Read pipeline-state evidence FIRST** (rule 254) — leftover-buckets, trace, expected-rules before conjecturing
- **Multi-rater /qc BEFORE every commit** (rule 255) — Sonnet + Haiku + Gemini Flash + Sonnet-adversarial (Cerebras still skip)
- **Per-section cropped pixel diff** (rule 256) — `--selector .sgs-{section}` only
- **QC raters MUST assert file artefacts exist** (rule 2026-05-19) — when artefact is .jsonl/.json/.png/.html, include `ls`/`wc -l`/`head -1` step
- **DB-first lookups** (rule 260) — check db-tables-map.md before hardcoded dicts. `_CORE_BLOCK_STYLE_MAP` is parked for migration (P-CORE-STYLE-MAP-DB-MIGRATION)
- **Never `return ob_get_clean()` / `return sprintf()` in render.php.** Never `source: html` on dynamic attrs.
- **Default time estimates LOW** per `~/.claude/rules/time-estimates.md`
- **Handoff walks docs-registry** at session end
