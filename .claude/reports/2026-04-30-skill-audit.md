# Skill Roster Audit — 2026-04-30

## Summary
- Total skills found: 13
- Kill candidates: 2
- Merge candidates: 2 (with merge target named)
- Park candidates: 1
- Keep (no action): 8

---

## Kill candidates

| Skill | Reason | Confidence |
|---|---|---|
| **nano-banana-pro** | Deprecated duplicate of nano-banana. Fork that references obsolete Gemini CLI extensions. No user-invocable trigger registered, never referenced by other skills, no updates since creation date (2026-02-14). | HIGH |
| **mcp-cli** | Exploratory reference skill documenting the `mcp` CLI tool. No user-facing triggers, never referenced by other skills, no pipeline integration. Teaches a technique that Claude Code's built-in MCP integration handles natively. | MEDIUM |

---

## Merge candidates

| Skill | Merge into | Rationale | Confidence |
|---|---|---|---|
| **sgs-email-branding** | `email-html-builder` | sgs-email-branding is a token-reference layer invoked ONLY after email-html-builder completes (per both SKILL.md files). A post-build step, not an independent workflow. Merging into email-html-builder as a "apply SGS branding" stage eliminates a separate dispatch call. | HIGH |
| **sgs-extraction** | `build-website` Stage 0.5 (or verify design-ref already covers it) | sgs-extraction is a pure data-capture layer (HTML, design tokens, DOM structure) feeding downstream skills (build-website, design-ref, animation-harvest). Positioned as "Stage 0 before build-website" but exists standalone. Options: (1) inline into build-website Stage 1, (2) enforce invocation via build-website gate, (3) verify design-ref deduplication. | MEDIUM |

---

## Park candidates

| Skill | Reason | Confidence |
|---|---|---|
| **cloudflare-vps-webhook** | Hyper-specific to Bean's single VPS + Cloudflare Access setup. Solves a one-time configuration problem (webhook bypass for Second Brain dashboard). Proven + stable; no need to re-invoke unless a second VPS enters scope. Resurrect when needed. | HIGH |

---

## Keep (no action needed)

animation-harvest, automation-recommender, build-website, email-html-builder, nano-banana, playwright, sgs-discover, verify-loop, vps-deploy

---

## Cross-skill reference map (active use signals)

- **animation-harvest** → `/sgs-discover`, `interactive-design`, `sgs-wp-engine`, `visual-qa`
- **build-website** → `/sgs-discover`, `/design-ref`, `/sgs-wp-engine`, `/visual-qa`, `/deploy-check`
- **vps-deploy** → `/cloudflare-toolkit` (Stage 4 handoff)
- **verify-loop** → `/qc-inline`, `playwright`, `a11y-audit`
- **sgs-email-branding** → always invoked after `email-html-builder`

## Lifecycle observations

- **Active dev (2026-04-29):** animation-harvest, automation-recommender, build-website, sgs-discover, verify-loop
- **Stable/untouched (2026-02-14):** nano-banana-pro, playwright, cloudflare-vps-webhook
- **Recently merged (2026-04-29):** verify-loop absorbed test-driven-development + verification-before-completion (both remain on disk per §12.5 — marked archived)

## Notes

Roster is healthy and intentional. Kills are clear-cut (fork with no triggers, educational-only reference). The SEO surface lives in agents (not skills) — see agent audit for that cluster analysis.
