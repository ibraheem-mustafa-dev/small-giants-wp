---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-23-parking-finishers
generated: 2026-05-22
parent_session: small-giants-wp-2026-05-22-architecture-programme-close-out
primary_goal: "Close every STILL-OPEN parking entry except P-BATCH-GA-14-SKILLS. Skills are LAST polish — they describe tools/scripts the other entries fix. Run /batch-gap-analysis only after every other parking entry ships."
---

# Next session — parking finishers (skills LAST)

Invoke `/autopilot` before anything else.

## State recap (plain English)

The architecture programme is CLOSED. All 11 phases shipped + every spec-doc gap closed + every council-flagged false closure caught. 31 commits across the close-out session.

What's left: **~18 STILL-OPEN parking entries.** Bean's directive: complete every one EXCEPT `P-BATCH-GA-14-SKILLS`. Skills get graded AFTER every fix lands, because skills describe tools/scripts; running `/batch-gap-analysis` against current skill content before the underlying tools improve grades against stale content.

The 18 entries break down by effort:

- **Quick wins (~10-15 min each, 3 entries):** P-5A-CLIENT-VARIATION-CSS-PATH, P-WPCS-FUNCTIONS-PHP-DEBT, P-FR1-VARIATION-BUF-CONSISTENCY
- **Medium (~30-45 min each, ~6 entries):** P-G4-MEASUREMENT-DECONTAMINATION, P-PHASE-5B-INERT-CUSTOMISER-OUTPUT Option A, P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY, P-CLONING-PIPELINE-FLOW-DOC-DRIFT, P-QC-COUNCIL-FIXTURE-SMOKE-TEST, P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF
- **Big-ticket (multi-hour, ~5 entries):** P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP, P-G5-PER-BLOCK-DOM-SHAPE-FIXES, P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER, P-UNIVERSAL-EXTRACTION-RC-FIXES, P-11-M9 (multi-section orchestrator + live deploy)
- **Verification-only (~30 min each, ~3 entries):** P-G1-HERO-INNERBLOCKS, P-G3-STAGE-3-VISUAL-SLOT-MAPPING, P-G2-PAGE-ID-SCOPE-STRIP — Phase 3 infrastructure shipped; live-page-144 Playwright verification step is what actually closes them
- **Documentation (small, 1 entry):** P-SKILL-MD-LICENSING-HARD-RULE-CLEAN

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — design decisions during multi-hour entries |
| `/gap-analysis` | ALWAYS — grade outputs before declaring done |
| `/lifecycle` | ALWAYS — any skill/pipeline edits route through here |
| `/research` | ALWAYS — auto-routes for the multi-hour entries |
| `/strategic-plan` | ALWAYS — sequence the entries before dispatching |
| `/qc-council` | Before any commit that closes 2+ parking entries simultaneously |
| `/qc-inline` | Per-entry quick verifications |
| `/sgs-clone` | When verifying G1-G5 with a fresh pipeline run |
| `/sgs-update` | If any Mode B re-fetch is required |
| `/capture-lesson` | New lessons surfacing during pipeline work |
| `/dispatching-parallel-agents` | Group the 3 quick wins into one parallel dispatch |

## MCP Servers & Tools

| Tool | What for |
|------|----------|
| Playwright MCP | Live-page-144 verification for G1 + G3 + G2; admin-bar decontamination for G4 |
| WP-CLI over SSH | Mode B re-fetches; live verifications on sandybrown |
| `~/.claude/hooks/wp-blocks.py` | Schema enumeration before any "missing X" diagnostic |
| `gh` CLI | Mode B Source 1 + 3 (gutenberg + wp-cli handbook) need authenticated GitHub access |
| `phpcbf --standard=WordPress` | P-WPCS-FUNCTIONS-PHP-DEBT one-shot fix |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | The big-ticket cloning-pipeline entries (P-WAVE-2-RESHAPE, P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER, P-11-M9) |
| `research-pipeline` | If P-WAVE-2-RESHAPE needs upfront research on the DB-wiring architecture |

## Research Approach

Most entries are well-specified in parking.md — no upfront research needed. The exceptions: P-WAVE-2-RESHAPE may benefit from a `/research-check --tier extended` call before designing the wiring change; P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER will need a brief review of how WP stores `wp_template_part` post type vs page content before designing the handler.

---

## Task 1 — Quick wins parallel dispatch (3 entries, ~30 min)

**What:** Dispatch one Sonnet subagent to handle P-5A-CLIENT-VARIATION-CSS-PATH (orchestrator helper path redirect), P-WPCS-FUNCTIONS-PHP-DEBT (`phpcbf --standard=WordPress theme/sgs-theme/functions.php`), and P-FR1-VARIATION-BUF-CONSISTENCY (one-line append after FR1 fast-path in `convert.py:3670-3689`).

**Why:** All three are mechanical, low-risk, well-specified. Knocking out three parking entries in one commit clears the easy-win column fast.

**Estimated time:** ~30 min wall-clock.

**Orchestration:**
- Execution: delegated, single subagent
- Model: sonnet via /delegate
- Dispatch: single subagent with all 3 entries in its brief
- Acceptance: 3 commit SHAs cited; parking.md entries moved to Resolved with each SHA

## Task 2 — Mode B verification gates (4 entries, ~45 min)

**What:** Live-verify Phase 5b is genuinely shipped: (a) P-ARCH-WP70-VIEW-TRANSITIONS-VERIFY — Playwright check that view transitions fire when navigating Customiser panels; (b) P-PHASE-5B-INERT-CUSTOMISER-OUTPUT Option A — wire renderer to emit `:root { --sgs-header-bg: ...; --sgs-footer-bg: ...; }` + consume via theme.json; (c) P-QC-COUNCIL-FIXTURE-SMOKE-TEST — run `example-council.json` through `/qc-council`; (d) P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF — cross-check dispatch graph nodes.

**Why:** Closes the verification debt Phase 5b accumulated. Without these, Phase 5b's "shipped" status has gaps the next /qc-council will surface.

**Estimated time:** ~45 min.

**Orchestration:**
- Execution: inline OR sonnet subagent
- /qc gate after: /qc-inline per entry as it closes
- Acceptance: live verification evidence (screenshot OR Playwright snapshot OR REST query output) attached to each closure

## Task 3 — G-series live verification (3 entries, ~90 min)

**What:** Play-page-144 end-to-end verification for G1 (hero CTAs render), G2 (variation CSS scope-strip works), G3 (visual slots resolve). Phase 3 shipped the infrastructure; this task runs the Playwright + REST + console check that actually closes them.

**Why:** Bean's recurring point — infrastructure shipped is not the same as outcome achieved. Without this verification, G1+G2+G3 stay open + the pixel-diff target stays unreachable.

**Estimated time:** ~90 min (Playwright setup + per-section verification + per-section pixel-diff via `--selector .sgs-{section}` per blub.db row 256).

**Orchestration:**
- Execution: wp-sgs-developer agent
- Dispatch pattern: sequential per section (don't fan out across sections — pixel-diff measurement contamination risk per P-G4)
- Acceptance: per-section pixel-diff ≤ 1% across 375 / 768 / 1440 viewports

## Task 4 — Big-ticket entries (sequential, multi-session candidate)

**What:** P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP, P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER, P-11-M9, P-G5-PER-BLOCK-DOM-SHAPE-FIXES, P-UNIVERSAL-EXTRACTION-RC-FIXES.

**Why:** Each is a multi-hour architectural change. Cannot be parallel-dispatched (shared state risks). Sequential, with /qc-council between each before commit.

**Estimated time:** Each entry ~2-4 hours. Realistically this is a 2-3 session arc on its own — be prepared to handoff mid-way.

**Orchestration:**
- Execution: wp-sgs-developer per entry
- /qc gate after each: /qc-council (3 raters, full protocol) before commit
- Acceptance per entry: measurable pixel-diff or test-suite improvement; council validates the implementation matches the fix-shape

## Task 5 — Documentation drift (~30 min)

**What:** P-CLONING-PIPELINE-FLOW-DOC-DRIFT (2 inaccuracies + 2 undocumented 2026-05-21 changes in the pipeline flow doc), P-SKILL-MD-LICENSING-HARD-RULE-CLEAN (renumber Rules 2-14 after Rule 1 retirement in `/sgs-clone` SKILL.md).

**Why:** Documentation drift breeds wrong assumptions in future sessions.

**Estimated time:** ~30 min.

**Orchestration:**
- Execution: inline
- /qc gate: /qc-inline

## Task 6 — Final polish: P-BATCH-GA-14-SKILLS

**What:** Run `/batch-gap-analysis` on the 14 WP/SGS skills (full `/gap-analysis` per target, sequential, in main conversation per blub.db row 176).

**Why:** Skills describe tools / scripts / pipelines. Now that Tasks 1-5 have shipped, the skills will be grading against current code — not stale assumptions.

**Estimated time:** ~3 hours dedicated session.

**Orchestration:**
- Execution: inline (blub.db row 176 hard gate forbids subagent dispatch)
- Acceptance: 14 per-target JSON evaluations + 1 review report + waiting-queue (S-grade confirms + opportunity selections)

## Dependency graph

```
Task 1 (3 quick wins, parallel)
  ↓
Task 2 (4 verification gates, inline)
  ↓
Task 3 (G-series live verification, sequential)
  ↓
Task 4 (big-ticket sequential — likely needs own session)
  ↓
Task 5 (doc drift)
  ↓ commit + handoff
Task 6 (P-BATCH-GA-14-SKILLS — final polish, dedicated session)
```

## Methodology guardrails (do not skip)

- **blub.db row 176** — `/gap-analysis` (and `/batch-gap-analysis`) runs in main conversation, full protocol per target, no subagent dispatch substitution.
- **blub.db row 255** — Multi-model `/qc` panel before every commit touching converter / pipeline / SGS block logic.
- **blub.db row 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`, never full-page.
- **blub.db row 283** — Verify WP API surface via `curl developer.wordpress.org/reference/functions/<name>/` before dismissing intelephense warnings or writing code that calls them.
- **Skills are LAST polish.** Do not run `/batch-gap-analysis` before Tasks 1-5 ship. Skills depend on the tools they describe.
- **Live verification beats audit.** Three audit claims this session were wrong (Icons block slug, heading variations, dimensions presets). When grading WP 7.0 behaviour, SSH to sandybrown + check.

## Reference docs

- `.claude/handoff.md` — 2026-05-22 session summary
- `.claude/parking.md` — live state, ~18 STILL OPEN
- `.claude/state.md` — programme CLOSED status
- `.claude/plans/2026-05-21-architecture-staging.md` — 31-decision plan, post-amendment
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` — FR7 closure-gate per-section + FR-NEW for cv2-eligible dynamic invariant
- `reports/2026-05-22-parking-sweep-classification.md` — first-pass classifier
- `reports/2026-05-22-parking-sweep-tail-classification.md` — second-pass council
- `reports/phase-7-skills-audit-2026-05-22.md` + `-extended-` — Phase 7 audit baseline (input to Task 6 GA when it runs)
