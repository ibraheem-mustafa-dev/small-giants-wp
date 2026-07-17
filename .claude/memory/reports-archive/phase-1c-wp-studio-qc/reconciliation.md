# WP Studio Plan — Cross-Tier QC Reconciliation

**Date:** 2026-04-29
**Scope:** `.claude/specs/2026-04-29-wp-studio-ai-manual.md` + `.claude/plans/master-plan.md` §Phase 1.5 Shift 2
**Reviewers dispatched:** Cerebras (qwen-3-235b), Gemini Flash (2.5), Sonnet (subagent, cross-tier vs Opus parent)

## Reviewer outcomes

| Reviewer | Status | Verdict | Saved to |
|---|---|---|---|
| Cerebras | UNAVAILABLE — upstream queue saturated, 4× retries failed | n/a | `cerebras-review.md` (failure log) |
| Gemini Flash | ✓ delivered | SHIP-WITH-FIXES (1×A + 1×B + 2×C = 4 gaps) | `gemini-flash-review.md` |
| Sonnet (subagent) | ✓ delivered | SHIP-WITH-FIXES (3×S + 4×A + 3×B + 2×C = 12 gaps) | `sonnet-review.md` |

**Aggregate verdict: SHIP-WITH-FIXES.** Sonnet's deeper read found 3 S-grade and 4 A-grade issues. Gemini Flash caught a subset of the same issues (notably the 22 vs 24 tool count). Both flag the same MySQL/SQLite drift contradiction.

## Consolidated gap register (de-duplicated, severity-sorted)

| Rank | Gap | Severity | Source | Quick fix |
|---|-----|:-------:|:------:|-----------|
| 1 | `wp ai1wm export` is fake — All-in-One CLI is a paid extension; cookbook §1 + §4 will fail on first execution | **S** | Sonnet GAP-1 | Replace with WP admin export → scp `.wpress` from `wp-content/ai1wm-backups/` |
| 2 | `.sql` "Studio re-routes through SQLite integration plugin automatically" claim is misleading — SQLite plugin intercepts wpdb at runtime, doesn't translate MySQL dumps | **S** | Sonnet GAP-2 | Remove the auto-translate claim; document the manual conversion path or use `.wpress` |
| 3 | Master plan says blueprint MUST force `DB_ENGINE=mysql` but Studio's PHP-WASM runtime may not support MySQL backend at all → claim could be unimplementable | **S** | Sonnet GAP-3 + Gemini GAP-2 | **VERIFY** by attempting the blueprint step in a real Studio site BEFORE Phase 1.5 P1.5e starts. If unsupported, soften plan §1.5 Shift 2 wording to "best-effort SQL parity" |
| 4 | Tool count is wrong — manual claims 22 Studio MCP tools, tables sum to 24 (6+4+2+4+3+2+2+1) | **A** | Sonnet GAP-4 + Gemini GAP-1 | Recount; correct intro line + closing "exhaustive" claim |
| 5 | Gotcha priority order wrong — preview-limit/7-day expiry (#12) blocks the Indus 2-week review use-case the master plan cites; should be ~#3-4 | **A** | Sonnet GAP-5 | Re-rank gotchas by frequency × user-impact |
| 6 | `--porcelain` example in gotcha #9 is a git flag, not WP-CLI | **A** | Sonnet GAP-6 | Use `--allow-root` or `--skip-plugins` as the WP-CLI example |
| 7 | "Community state-of-the-art alignment" cites WP.com Studio (circular — IS Studio) + Telex (block prototyping, different scope) + Angie (ambiguous) | **A** | Sonnet GAP-7 | Drop the "alignment" claim or cite actually-converging tools |
| 8 | Cookbook §3 forward-references `/verify-loop --url` flag that won't exist until P1.5e completes | B | Sonnet GAP-8 | Mark "post-P1.5e" inline |
| 9 | Plan claims "byte-identical to production" but manual gotcha #5 says only `wp-content` ships → not byte-identical | B | Sonnet GAP-9 + Gemini cross-doc | Soften plan to "rendered-DOM identical for wp-content scope" |
| 10 | No SLA / latency note for Studio MCP tools — `validate_blocks` "slow on first call" could blow `/verify-loop` step budget | B | Sonnet GAP-10 | Add SLA section to manual |
| 11 | `enableMultisite` blueprint step — unclear if "silently skipped" or "produces error" (manual contradicts itself) | C | Gemini GAP-3 | Test + document |
| 12 | Blueprint example mixes top-level `siteOptions` with `setSiteOptions` step — canonical path unclear | C | Sonnet GAP-11 | Pick one |
| 13 | `--https --domain` cert provenance unstated (self-signed? mkcert?) | C | Sonnet GAP-12 | Note cert source |
| 14 | No explicit blueprint guidance for shipping `sgs-blocks` + `sgs-theme` with the sandbox | C | Gemini GAP-4 | Add `installPlugin` example with `{resource:"url", url:"..."}` shape, OR clarify `wp_cli` post-creation is the intended path |

## Self-grade blind spots flagged by Sonnet (Opus parent enthusiasm)

These are framing issues, not factual errors:

- "Compounds on every later phase" — true for P5 client builds; weak for P2 rubric authoring. **Mild overclaim.**
- "Community state-of-the-art alignment" — post-hoc justification with circular citations. **See GAP-7.**
- "Two-tier gate" framing — `/verify-loop` was not designed for Preview URLs; it's being retrofitted. **Acknowledge integration risk.**
- "Survives laptop close" — 10-preview cap + WP.com OAuth dep are material; surfaced only in gotchas, not in strategic framing.
- Manual "exhaustive as of 2026-04-29" — strong claim for a fast-moving repo. Soften to "verified against trunk@<sha>".

## Recommended action — first work of Phase 1.5

**P1.5 priority 0 (before P1.5a):** patch the 3 S-grade + 4 A-grade gaps in the WP Studio manual + master plan. Estimated time: 60-75 min.

The S-grade gaps are blocking — without those fixes, the first time anyone tries to import a Hostinger site into Studio per the cookbook, they'll hit `wp ai1wm export: command not found` and the whole Phase 1.5 Shift 2 narrative collapses. GAP-3 (DB_ENGINE=mysql in PHP-WASM) is the deepest — needs a real-world verification step before the master plan can stand on the claim.

**Recommended order:**

1. (15 min) Verify GAP-3 by running `defineWpConfigConsts` blueprint with `DB_ENGINE=mysql` against a real Studio site. If unsupported → soften plan immediately. If supported → add the example to the manual.
2. (15 min) Patch GAP-1 (replace fake `wp ai1wm export` with WP-admin-then-scp path).
3. (10 min) Patch GAP-2 (remove `.sql` auto-route claim).
4. (5 min) Fix GAP-4 (tool count 22 → 24).
5. (10 min) Re-rank gotchas (GAP-5).
6. (5 min) Fix GAP-6 (`--porcelain` → `--allow-root`).
7. (15 min) Drop or replace GAP-7 (community-alignment claim).

Then proceed to P1.5a (skill-auditor + agent-auditor).