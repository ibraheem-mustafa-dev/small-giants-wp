# Gap Analysis — seo-technical agent

**Date:** 2026-04-30
**Target:** `~/.claude/agents/seo-technical.md`
**Type:** agent
**Phase:** Phase 2a structural debt pass (P1.5d → P2.2a queued)
**Run by:** /lifecycle → Mode A full pass

## Verdict

**Grade: C (3.08/5)** against confirmed 9-criterion rubric at `~/.claude/agents/.rubrics/seo-technical.md`
**Skillscore: 86%** — passed ≥85% threshold (was 52% pre-fix; +34 points)
**Recommendation:** Structural debt cleared. Content-level gaps queued for Phase 2a /skill-optimiser pass.

## Strongest / weakest

- **Strongest:** Accuracy 4.5/5 (weight 2.0) — INP correct, FID flagged, robots.txt content check enforced, hreflang reciprocal noted
- **Weakest:** Business impact clarity 1.5/5, Effort and ownership 1.5/5 — agent is developer-facing only

## Persona divergence

Bean 3.05, SGS Client 3.10. Delta 0.05 — no divergence flag.

## 6-Lens System Effect

| Lens | Verdict | Reasoning |
|------|---------|-----------|
| 1 End-result | PASS | Delivers a structured technical SEO report; outcome traceable |
| 2 OC↔CC | N/A | Client-deliverable agent, one-directional output |
| 3 blub.db | N/A | Audit reports are client artefacts |
| 4 Automation | N/A | On-demand agent, no maintenance story |
| 5 ADHD | PASS | One report per invocation, no extra checkpoints |
| 6 Values alignment | PASS | Confirmed rubric scoring 3.08/5; gaps prioritised |

No veto. No grade cap.

## Gap register (all 12 gaps, graded by opportunity value)

### A-grade (highest value — fix unlocks credibility, revenue, or actionability)

1. **Score defensibility — no derivation formula** (criterion 6, 2.0/5). 0–100 score has no documented per-category weighting. Clients challenge the headline number first; without a formula, audits lose credibility.
2. **Business impact clarity — no business-cost translation** (criterion 8, 1.5/5). Agent has nothing translating technical findings into traffic/ranking/trust impact. Audits read as developer artefacts, not client deliverables — directly affects revenue.
3. **Evidence quality — no URL/observed/expected enforcement** (criterion 7, 2.5/5). Output Format mentions "specific recommendations" but doesn't require URL citation per issue. Verifiable fixes need it.

### B-grade (medium-high value)

4. **Effort and ownership — no hours/cost/who-fixes-it** (criterion 9, 1.5/5). Client cannot budget without rough hours and ownership tag.
5. **JS-rendered DOM diff missing from 8 categories** (criterion 1, partial). In Common Mistakes only — needs to be a top-level category for CSR sites.
6. **No internal-linking / orphan-page check** (criterion 1, partial). Bread-and-butter technical SEO silently absent.
9. **File/line not enforced per issue** (criterion 2). Same fix as gap 3.
12. **Common Mistakes table missing 3 anti-patterns from rubric Never Do**: no-URL-citation, single-lang hreflang, viewport-only mobile-friendly.

### C-grade (low-medium value)

7. **No log file analysis path**. Useful for advanced audits but most clients lack log access.
8. **performance-auditor not named in When NOT to Use**. Minor delegation gap for CWV field data.
10. **No mid-analysis URL-unreachable recovery**. Pre-start HARD GATE exists; mid-run 403 has no path.

### D-grade (cosmetic)

11. **Description has 3+ "and" clauses**. Skillscore-flagged scope creep; cosmetic.

## Opportunities (Step 5 — what this could become)

1. **ai-crawler-management (A-grade opportunity, non-obvious, showpiece medium-high)** — Add a 9th analysis category for AI crawler access (GPTBot, ClaudeBot, Anthropic, Perplexity). Cloudflare Q1 2026: 30.6% of web traffic is bots. Most SEO tools haven't shipped this — competitive differentiator. Bean can demo as "we audit your AI crawler exposure."
2. **score-methodology (B-grade opportunity, obvious, showpiece low)** — Per-category weight formula (suggested: Crawlability 25%, Indexability 20%, CWV 20%, Security 15%, Mobile 10%, Structured Data 5%, URL Structure 5%).
3. **playwright-csr-fallback (B-grade opportunity, non-obvious, showpiece medium)** — Conditional Playwright MCP path for CSR sites. design-reviewer already uses this infrastructure.

## S-Grade

**Not awarded.** No criteria hit across functional or impact categories. AI Crawler opportunity is the future S-grade candidate if implemented and demoed.

## Recommendations (priority-ordered next actions)

1. **A — score-methodology**: Define a per-category weight table in Output Format. Document the formula so the score is reproducible across runs.
2. **A — business-impact-translation**: Add to Output Format requirement: "Each issue must translate technical finding into business cost in plain English (traffic, ranking, trust)."
3. **A — evidence-quality**: Add to Output Format: "Each issue must cite the offending URL or file path, observed value, and expected value."
4. **B — ai-crawler-management**: Add a 9th analysis category covering GPTBot/ClaudeBot/Anthropic/Perplexity robots.txt entries.
5. **B — effort-ownership**: Add to Output Format: "Each fix tagged with rough developer hours, ownership (client/dev/host/agency), and timing (this-week/this-month/backlog)."
6. **B — completeness-internal-linking**: Add internal-linking and orphan-page check to the 8 categories (becomes 9 or 10).
7. **B — completeness-csr-fallback**: Add Playwright conditional path when CSR detected.
8. **B — common-mistakes-anti-patterns**: Add 3 missing anti-patterns to the Common Mistakes table.
9. **C — performance-auditor-routing**: Add `performance-auditor` to When NOT to Use for CWV field data.
10. **C — error-recovery**: Add mid-run URL-unreachable recovery path.

**Estimated effort to close A+B gaps:** 30–45 min in a focused /skill-optimiser pass — already scheduled in master plan §P2.2a.

## Phase 2a queue note

This agent is a structural-debt entry on the Phase 2a target list (`design-reviewer 53%, seo-technical 52%, seo-auditor 59%, email-html-builder 63%, sgs-extraction 85%`). The structural pass in this session cleared skillscore to 86%. The deeper rubric grade (C 3.08) defines the optimiser-pass scope. Both are now ready for the Phase 2 batch.

## Research trace

- **External (Brave search):**
  - "technical SEO agent evaluation criteria 2025" → 2026 audits emphasise AI crawler readiness, INP, hreflang reciprocity, JS rendering
  - "technical SEO audit AI crawler robots.txt hreflang best practices 2026" → Cloudflare Q1 2026 30.6% bot traffic; most SEO tools haven't shipped AI crawler management
- **Internal:**
  - correction-ledger grep — HARD GATE tags mandatory (recurring); prose checkpoints get skipped under context pressure
  - library neighbour `seo-auditor.md` — thinner agent (33 lines), no process steps; seo-technical is the depth leader
  - evaluation-history check — no prior seo-technical evaluations
- **Reviewer panel (3 personas, dispatched via Agent tool):**
  - SEO Practitioner: confirmed coverage gaps + weight rebalance + Evidence quality criterion
  - Skill-Evaluation Framework: flagged 6/12 anchors as process-flavoured violating spec §2.3; missing frontmatter fields
  - SGS Client: critical business-impact translation gap + plain-English priority + cost/effort visibility

**Baseline:** A strong technical SEO agent in 2026 covers 8+ categories, uses INP not FID, validates hreflang reciprocally, detects CSR vs SSR, includes AI crawler management, and translates technical findings into business cost for client deliverables. The 0–100 score must derive from a documented formula. Routing to adjacent agents (seo-schema, performance-auditor, seo-geo) must be explicit and named.

## Topics

`technical-seo`, `score-defensibility`, `business-impact-translation`, `evidence-quality`, `ai-crawler-management`, `csr-rendering`, `effort-ownership`, `agent-rubric`, `phase-2a-queue`
