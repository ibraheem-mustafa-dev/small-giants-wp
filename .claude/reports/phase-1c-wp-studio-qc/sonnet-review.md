# Sonnet Cross-Tier QC Review — WP Studio Manual + Phase 1.5 Shift 2

**Reviewer:** Sonnet (subagent, cross-tier vs Opus parent)
**Date:** 2026-04-29
**Targets:** `.claude/specs/2026-04-29-wp-studio-ai-manual.md` + `.claude/plans/master-plan.md` §Phase 1.5 Shift 2
**Saved by:** Opus parent (subagent had no Write permission)

## 1. Verdict

**SHIP-WITH-FIXES** — content is largely accurate and executable, but two factual claims in the manual cookbook are likely wrong (Hostinger CLI ai1wm export; SQLite to MySQL "automatic" path) and master-plan §1.5 oversells "community state-of-the-art alignment".

## 2. Per-document scores

| Doc | factual_accuracy | completeness | claude_executability | risk_coverage | Evidence |
|---|---|---|---|---|---|
| AI Operating Manual | 4 | 4 | 4 | 3 | Tool list/flags align with `apps/cli/ai/tools.ts`; cookbook §1 has incorrect WP-CLI assumption (`wp ai1wm export` is not a real command); SQLite gotcha #1 correct but no `defineWpConfigConsts` example shown despite §Phase 1.5 calling it MUST. |
| Master plan §Phase 1.5 Shift 2 | 4 | 4 | 4 | 3 | Strategic framing solid; "compounds on every later phase" defensible; "community state-of-the-art alignment" conflates WP.com Studio with Telex (block prototyping) and Angie (no clear WP product). |

## 3. Gap register

- **[GAP-1] S** | `wp ai1wm export` is not a real WP-CLI command — All-in-One WP Migration's CLI extension is paid (Unlimited extension) and most Hostinger shared installs cannot run it. Cookbook §1 (manual L257-260) and §4 (L311-313) will fail on first execution. | manual.md L257-265, L311-317 | Replace with: install plugin via WP admin, trigger export from UI, scp `.wpress` from `wp-content/ai1wm-backups/`.
- **[GAP-2] S** | Manual claim "Plain `.sql`: ... Studio re-routes through SQLite integration plugin automatically" (L267) is misleading. The SQLite integration plugin intercepts wpdb at runtime; it does not transparently translate MySQL-flavoured dumps. | manual.md L267 | Document conversion path or remove the `.sql` fast-path claim.
- **[GAP-3] S** | The SQLite/MySQL trap is master-plan's "critical gotcha" but the manual never shows the actual blueprint step. | manual.md L332, plan.md L119 | Add Blueprint example: `{ "step": "defineWpConfigConsts", "consts": { "DB_ENGINE": "mysql" }, "method": "rewrite-wp-config" }` AND verify Studio's PHP-WASM runtime supports MySQL backend. If WASM-only, the master-plan claim is unimplementable.
- **[GAP-4] A** | 22-tool count is wrong: tables sum to 24 (6+4+2+4+3+2+2+1). | manual.md L10, L351 | Recount or split desktop-only vs CLI counts.
- **[GAP-5] A** | Gotcha priority order is wrong. #9 dash-encoding ranks above #12 preview-limit/7-day expiry — the latter blocks the entire Indus 2-week review use-case the master plan cites. | manual.md L330-344 | Move preview-limit/expiry to ~#3-4.
- **[GAP-6] A** | `--porcelain` example in gotcha #9 (L340) is a git flag, not WP-CLI. | manual.md L340 | Use `--allow-root` or `--skip-plugins`.
- **[GAP-7] A** | "Community state-of-the-art alignment" (plan L112) cites WP.com Studio + Telex + Angie. WP.com Studio IS Studio (circular). Telex is block prototyping. Angie is ambiguous. | plan.md L112 | Cite actual converging tools or remove.
- **[GAP-8] B** | Cookbook §3 `/verify-loop <url>` forward-references unbuilt P1.5e capability. | manual.md L298 | Mark "post-P1.5e".
- **[GAP-9] B** | Preview ships only `wp-content` — contradicts plan's "byte-identical to production" claim. | plan.md L106, manual L336 | Soften plan to "rendered-DOM identical for wp-content scope".
- **[GAP-10] B** | No mention of Studio MCP latency vs `/verify-loop` step budget. `validate_blocks` "slow on first call" could blow budgets. | manual.md, plan.md | Add SLA note.
- **[GAP-11] C** | Blueprint example mixes `siteOptions` block with `setSiteOptions` step — unclear which path is canonical. | manual.md L233-247 | Pick one or comment.
- **[GAP-12] C** | `--https --domain` cert provenance unstated (self-signed? mkcert?). | manual.md L41 | Note cert source.

## 4. Cross-document consistency

- Plan §1.5 says blueprint MUST force `DB_ENGINE=mysql`; manual neither shows the step nor confirms PHP-WASM supports MySQL. Contradiction. (GAP-3)
- Plan: "byte-identical to production"; manual gotcha #5: only `wp-content` ships. (GAP-9)
- Tool count: plan says 22+1; manual tables sum to 24. (GAP-4)

## 5. Missing entirely

- Recovery path when sandbox diverges from prod beyond "48+ hours" heuristic.
- Studio CLI version-pin guidance (only WP version pinning discussed).
- Indus Foods playbook entry — plan cites 2-week to 7-day cycle but no concrete steps.
- Failure path when `preview create` hits 10-preview cap mid-deploy.
- State of Bean's annotations when Studio CLI restarts.

## 6. Self-grade blind spots (Opus enthusiasm flags)

- "Compounds on every later phase" (plan L110) — true for P5 client builds, weak for P2 rubric authoring. Overclaim.
- "Community state-of-the-art alignment" — see GAP-7. Post-hoc justification.
- "Two-tier gate" framing (plan L111) — `/verify-loop` was not designed for Preview URLs; it's being retrofitted. Acknowledge integration risk.
- "Survives laptop close" (plan L113) — 10-preview cap + WP.com OAuth dep are material; surfaced only in gotchas, not strategic framing.
- Manual L351 "exhaustive as of 2026-04-29" — strong claim for a fast-moving repo. Soften to "verified against trunk@<sha>".