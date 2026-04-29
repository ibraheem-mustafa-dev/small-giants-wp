# Agent Roster Audit — 2026-04-30

## Summary
- Total agents found: 14
- Kill candidates: 2
- Merge candidates: 3 pairs (SEO cluster reorganisation)
- Park candidates: 0 (seo-performance promoted to kill — see notes)
- Keep (no action): 9

---

## Kill candidates

| Agent | Reason | Confidence |
|---|---|---|
| `gemini-analyser` | Severely constrained scope (no MCP access, analysis-only). Not in CLAUDE.md Quick Reference — clearest abandonment signal. Claude with full tools handles all stated use cases better. Zero architectural need to maintain separately. | HIGH |
| `seo-performance` | Subsumed by `seo-technical` (Core Web Vitals source inspection) + `performance-auditor` (Next.js). Overlaps both without doing either uniquely. Not in CLAUDE.md Quick Reference. | MEDIUM |

---

## Merge candidates

| Agent | Merge into | Rationale | Confidence |
|---|---|---|---|
| `seo-visual` | `design-reviewer` | Identical screenshot protocol (375/768/1440px Playwright captures). `design-reviewer` is broader but already mandates visual analysis at all breakpoints. `seo-visual` is the same methodology at narrower scope (SEO-only above-the-fold). Tools overlap completely. | HIGH |
| `seo-content` | `seo-auditor` | Content quality (E-E-A-T, readability, keyword depth) is already a section in `seo-auditor`. `seo-content` is a narrower post-publish QA variant of the same checks. Merge as an enhanced Content section in seo-auditor. | MEDIUM |
| `seo-schema` + `seo-sitemap` | New `seo-technical-structures` agent (or fold into `seo-technical` as validation extensions) | Two orthogonal but equally narrow tools (sitemap = URL manifest, schema = page markup). Orthogonal means merging them together makes sense as "structural SEO" — combined they form a coherent role; separate they're both too narrow to justify individual agent overhead. | MEDIUM |

---

## Keep (no action needed)

research-pipeline, project-manager, test-and-explain, site-reviewer, search-conversations, wp-sgs-developer, design-reviewer, seo-auditor, seo-technical, ehr-security-reviewer, muslim-ai-builder, performance-auditor

---

## SEO cluster detail

Current 7 agents → target 4 after triage:

| Current | Action | Result |
|---|---|---|
| `seo-auditor` | Keep (enhanced) | Absorbs seo-content's E-E-A-T section |
| `seo-technical` | Keep (enhanced) | May absorb seo-schema + seo-sitemap as extensions |
| `seo-content` | Merge → seo-auditor | Content section |
| `seo-schema` | Merge → seo-technical or new seo-technical-structures | Structural SEO |
| `seo-sitemap` | Merge → seo-technical or new seo-technical-structures | Structural SEO |
| `seo-visual` | Merge → design-reviewer | Visual QA unified |
| `seo-performance` | Kill | Overlaps seo-technical + performance-auditor |

**Simplest implementation:** fold seo-schema + seo-sitemap into seo-technical as optional validation passes (triggered by `--schema` / `--sitemap` flags or classification keywords). Avoids creating a new agent.

---

## Abandonment signals

Two agents appear in `.claude/agents/` but NOT in CLAUDE.md Quick Reference:
- `gemini-analyser` — not referenced anywhere
- `seo-performance` — not referenced anywhere

All 16 agents in CLAUDE.md Quick Reference are confirmed active and match agent definitions.

---

## Notes

Roster is healthy overall. The only structural problem is the SEO cluster — 7 agents is 3-4 too many for the surface they cover. Outside SEO, scope boundaries are clear and complementary (research, project management, WordPress, design, security, Muslim AI — each occupies a distinct domain with no redundancy).

**Quick wins (low-effort, no functionality loss):**
1. Delete `gemini-analyser` — zero cost
2. Delete `seo-performance` — zero cost
3. Merge `seo-visual` → `design-reviewer` — update design-reviewer trigger description to absorb `seo-visual` keywords

**Medium effort:**
4. Enhance `seo-auditor` to absorb `seo-content` methodology
5. Fold `seo-schema` + `seo-sitemap` validation into `seo-technical` as optional passes

**Target state:** 9–10 active agents (from 14), zero redundancy.
