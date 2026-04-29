---
doc_type: triage-table
created: 2026-04-29
updated: 2026-04-30
status: SIGNED-OFF-2026-04-30
sources:
  - .claude/reports/2026-04-30-skill-audit.md
  - .claude/reports/2026-04-30-agent-audit.md
  - .claude/plans/strategy/2026-04-21-non-essential-pipelines-deferred.md
---

# Tooling Triage — Phase 1.5 (P1.5b)

**HARD GATE:** Bean must sign off on this table before P1.5d (kills/merges) begins.

**Scope:** SGS skill library (`~/.claude/skills/`) + agent roster (`~/.claude/agents/`) + deferred pipelines.

**Decision codes:** KILL = delete now · MERGE = collapse into named target · PARK = archive, resurrect on trigger · KEEP = no action · DEFER = already on strategic hold, confirm and document.

---

## Section 1 — Skills

| Skill | Decision | Target / notes | Confidence | Estimated effort |
|---|---|---|---|---|
| **nano-banana-pro** | KILL | Fork of nano-banana with obsolete Gemini CLI extensions. No user-invocable trigger, never referenced, untouched since creation. Delete entirely. | HIGH | 2 min |
| **mcp-cli** | PARK | Educational reference — unique documentation value for MCP server setup patterns. Write key technique to CLAUDE.md first, then archive. Two reviewers flagged KILL as too permanent. | MEDIUM | 10 min |
| **sgs-email-branding** | MERGE → `email-html-builder` | Token-reference layer that runs only after email-html-builder completes per both SKILL.md files. A post-build step, not a standalone skill. Merge as a "apply SGS branding" stage inside email-html-builder. | HIGH | 20 min |
| **sgs-extraction** | KEEP standalone — fix 4 factual errors only | Feeds 3 downstream consumers: build-website, design-ref, animation-harvest. Merging into one consumer silently breaks the other two. Fix errors (~30 min), keep as shared utility. All three cross-tier reviewers agreed on this. | HIGH | 30 min (errors only) |
| **cloudflare-vps-webhook** | PARK | Hyper-specific to single VPS + Cloudflare Access config. Solved, stable, one-time problem. Archive to `~/.claude/skills/archive/`. Resurrect if second VPS comes in scope. | HIGH | 5 min |
| **animation-harvest** | KEEP | Active (2026-04-29). Core to design-to-ship flow. Fans out to sgs-discover, interactive-design, sgs-wp-engine. | — | — |
| **automation-recommender** | KEEP | Active (2026-04-29). 8-stage codebase audit, no duplicate. | — | — |
| **build-website** | KEEP | Flagship pipeline (URL → SGS WP site). Active, no overlap. | — | — |
| **email-html-builder** | KEEP (enhanced) | Receives sgs-email-branding merge. | — | — |
| **nano-banana** | KEEP | Current image-generation dispatcher. Only one in roster. | — | — |
| **playwright** | KEEP | Dual-surface browser automation. No duplicate. ⚠️ Not visible to autopilot router — add to domain table (see Section 3). | — | — |
| **sgs-discover** | KEEP | Gallery search + curation. Feeds build-website + animation-harvest. Active. ⚠️ Not visible to autopilot router. | — | — |
| **verify-loop** | KEEP | Per-step verification enforcer. Shipped Phase 1c. No duplicate. | — | — |
| **vps-deploy** | KEEP | Infrastructure deployment. Active, scoped, stable. | — | — |
| **sgs-wp-engine** | KEEP — add override note | Framework central authority (57 blocks, SQLite DB). **Overrides `wp-block-development` / `wp-plugin-development` for all SGS-prefixed work** — this must be documented explicitly. Was missing from original triage (flagged by Gemini Flash). ⚠️ Likely not visible to autopilot router — verify and add to domain table. | — | — |

**Skill net:** 13 → 9 (2 kills, 2 merges, 1 park). sgs-extraction stays standalone (errors fixed). sgs-wp-engine explicitly KEEP with override note.

---

## Section 2 — Agents

| Agent | Decision | Target / notes | Confidence | Estimated effort |
|---|---|---|---|---|
| **gemini-analyser** | KILL | Severely constrained (no MCP access, analysis-only). Not in CLAUDE.md Quick Reference. Claude with full tools does everything it describes better. | HIGH | 5 min |
| **seo-performance** | KILL | Overlaps `seo-technical` (Core Web Vitals source inspection) + `performance-auditor` (Next.js focus). Not in CLAUDE.md Quick Reference. No unique surface. | MEDIUM | 5 min |
| **seo-visual** | MERGE → `design-reviewer` | Identical screenshot protocol (375/768/1440px Playwright). design-reviewer is broader but already mandates visual analysis at all breakpoints. Merge: add `seo-visual` trigger keywords to design-reviewer's when-to-use description. | HIGH | 15 min |
| **seo-content** | MERGE → `seo-auditor` (enhanced Content section) | Content quality (E-E-A-T, readability, keyword depth) is already in seo-auditor as a section. seo-content is a narrower post-publish variant of the same checks. Merge: expand seo-auditor's Content section with seo-content's methodology. | MEDIUM | 30 min |
| **seo-schema** | MERGE → `seo-technical` (as `--schema` pass) | Narrow validation tool — fold into seo-technical as an optional schema validation pass triggered by classification keywords. | MEDIUM | 15 min |
| **seo-sitemap** | PARK | Bean gets sitemaps from SEO plugins (Rank Math etc.) — dedicated agent has near-zero use. Non-invocable (hidden behind router). Archive rather than spend time merging. | HIGH | 5 min |
| **research-pipeline** | KEEP | Full research-to-decision orchestration. Active in CLAUDE.md. | — | — |
| **project-manager** | KEEP | Portfolio PM with live git verification. Active. | — | — |
| **test-and-explain** | KEEP | Testing specialist. Active. | — | — |
| **site-reviewer** | KEEP | 9-layer website audit. Active. | — | — |
| **search-conversations** | KEEP | Historical conversation search. Active. | — | — |
| **wp-sgs-developer** | KEEP | WordPress framework specialist. Active. | — | — |
| **design-reviewer** | KEEP (enhanced) | Receives seo-visual merge. | — | — |
| **seo-auditor** | KEEP (enhanced) | Receives seo-content merge. | — | — |
| **seo-technical** | KEEP (enhanced) | Receives seo-schema + seo-sitemap as optional passes. | — | — |
| **ehr-security-reviewer** | KEEP | HIPAA/GDPR compliance. Active. | — | — |
| **muslim-ai-builder** | KEEP | Islamic MCP + product. Active. | — | — |
| **performance-auditor** | KEEP | Next.js perf, Lighthouse, Core Web Vitals. Active. | — | — |

**Agent net:** 14 → 9 (2 kills, 3 merges complete). SEO cluster: 7 → 4 (auditor, technical enhanced, visual absorbed into design-reviewer).

---

## Section 3 — Quick fixes (not kills/merges, but blocking P1.5e or causing silent routing failures)

| Item | What | Effort |
|---|---|---|
| **Autopilot domain-table patch** | 4 skills invisible to autopilot router: `playwright`, `animation-harvest`, `sgs-discover`, `sgs-extraction`. Add keywords to autopilot SKILL.md domain-classification table. ~1 hr edit. | 60 min |
| **sgs-extraction 4 factual-error fixes** | Flagged in deferred-pipelines doc (2026-04-21). Must fix before sgs-extraction → build-website merge proceeds. | 30 min |

---

## Section 4 — Deferred pipelines (confirm park status)

| Pipeline | Status | Resume trigger |
|---|---|---|
| **P8 — Content creation** | DEFERRED | After first 2-3 SGS client sites ship and content-creation is a recurring bottleneck |
| **P10 — Scroll-animation-originator** | DEFERRED | After first SGS client where premium scroll-animation is pitched as upsell; requires fal.ai account |
| **P11 — Email campaign** | DEFERRED | When SGS adds email-campaign as a service offering |
| **P13 — App delivery** | DEFERRED | After first 3-5 SGS site clients ship revenue; different stack, not blocking core |

These are confirmed on strategic hold. No action in P1.5d.

---

## Execution order (P1.5d — after Bean sign-off)

**Step 0 — First (blocks everything else):**
0. Autopilot domain-table patch (add playwright, animation-harvest, sgs-discover, sgs-extraction, sgs-wp-engine to domain-classification table) — router must see these before any merge validation

**Parallel-safe (no shared files):**
1. Kill `gemini-analyser` + `seo-performance` agents
2. Kill `nano-banana-pro` skill
3. Park `mcp-cli` skill (write CLAUDE.md note for mcp technique first, then archive)
4. Park `cloudflare-vps-webhook` + `seo-sitemap` agent (move to archive dirs)

**Sequential (shared-file risk — one at a time):**
5. Merge `seo-visual` → `design-reviewer` (add seo-visual trigger keywords to when-to-use)
6. Merge `sgs-email-branding` → `email-html-builder`
7. Merge `seo-content` → `seo-auditor` (expand Content section)
8. Fold `seo-schema` → `seo-technical` (as schema validation pass)
9. Fix sgs-extraction 4 factual errors (keep standalone — do NOT merge)
10. Assess `seo-geo`, `seo-hreflang`, `gemini-vision-audit` — quick read of each SKILL.md, decide keep/merge/park in-session

**Run dispatch-graph-validator after each merge/kill:**
```bash
python ~/.agents/skills/shared-references/dispatch-graph-validator.py
```

---

## Sign-off checklist (P1.5c)

Bean to confirm each decision before P1.5d fires:

- [ ] Kill `nano-banana-pro` — yes / no
- [ ] Kill `mcp-cli` — yes / no / convert to CLAUDE.md note
- [ ] Kill `gemini-analyser` — yes / no
- [ ] Kill `seo-performance` — yes / no
- [ ] Merge `sgs-email-branding` → `email-html-builder` — yes / no
- [ ] Merge `sgs-extraction` → `build-website` (fix errors first) — yes / no / keep standalone
- [ ] Park `cloudflare-vps-webhook` — yes / no
- [ ] Merge `seo-visual` → `design-reviewer` — yes / no
- [ ] Merge `seo-content` → `seo-auditor` — yes / no
- [ ] Fold `seo-schema` + `seo-sitemap` → `seo-technical` — yes / no / create new seo-technical-structures agent instead
- [ ] Autopilot domain-table patch (4 skills) — include in P1.5d? yes / no
- [ ] Confirm deferred pipelines P8/P10/P11/P13 remain on hold — yes / no
