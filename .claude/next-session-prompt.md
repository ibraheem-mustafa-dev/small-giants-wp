recommended_model: sonnet
session_tag: small-giants-wp-2026-05-02-header-footer-universal-audit

You are a senior WordPress block-theme architect specialising in the SGS Framework, FSE template parts, and multi-tenant block-theme design. Your goal this session is to make the SGS framework's `header.html` and `footer.html` truly universal — driven entirely by style variations, WP global settings, and the block editor — and remove the per-client `.html` files that were created in error.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-02-header-footer-universal-audit"`

## Where You Are

Phase: `header-footer-universal-audit`
Last shipped: block validation root-cause fix (commit `c1c95ad`) — sandybrown homepage renders end-to-end with zero validation errors
Architectural lesson captured: `feedback_header-footer-universal-not-per-client.md` (blub.db row 204)
Next task: audit `header.html` for Indus-specific content and rewrite as universal

Read in this order before doing anything:
1. `MEMORY.md` (auto memory) — `feedback_header-footer-universal-not-per-client.md` is the captured rule for this whole session
2. `.claude/handoff.md` — last session's summary; your "Next Priorities" are the audit task list
3. `.claude/state.md` — current phase is `header-footer-universal-audit`
4. `theme/sgs-theme/parts/header.html` and `theme/sgs-theme/parts/footer.html` — the files you are auditing
5. `theme/sgs-theme/parts/header-mamas-munches.html` + `footer-mamas-munches.html` — the wrong-model files you will delete
6. `theme/sgs-theme/CLAUDE.md` and project root `CLAUDE.md`

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — design trade-offs (top bar = setting toggle or pattern?) |
| `/gap-analysis` | ALWAYS INCLUDE — grade universal parts against 3 persona clients before delivery |
| `/lifecycle` | ALWAYS INCLUDE — required if any skill/agent/pipeline change comes up |
| `/research` | ALWAYS INCLUDE — auto-routes to the right tier |
| `/strategic-plan` | ALWAYS INCLUDE — order audit + cleanup steps before editing |
| `/sgs-wp-engine` | All SGS Framework work; sgs-db.py introspection |
| `/wp-block-themes` | theme.json templateParts, FSE patterns, style variations |
| `/wp-block-development` | If header/footer logic needs new block attributes |
| `/playwright` | Visual capture of sandybrown after universal parts ship |
| `/library-docs` | Verify FSE template-part + pattern best practice |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Capture sandybrown after universal parts ship; visual diff |
| `sgs-db.py` CLI | Query patterns/tokens used by header/footer |
| WP-CLI via SSH | sandybrown root: `ssh -p 65002 -i ~/.ssh/id_ed25519 u945238940@141.136.39.73`. Revert the per-client server overrides once universal parts are clean |
| GitHub MCP | Update PR #10 |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All header/footer audit edits, theme.json updates, pattern registration |
| `design-reviewer` | Visual review across the three persona clients (food/healthcare/construction) |
| `feature-dev:code-reviewer` | Review audit diff before merging |
| `test-and-explain` | Plain-English session run-through for Bean at the end |

## Research Approach

Use `/research-check` for quick lookups on FSE template-part best practice (Twenty Twenty-Five and modern block themes' header/footer patterns). Don't deep-research — this is well-documented WP territory.

---

## Task 1: Audit `theme/sgs-theme/parts/header.html` for universality

Read `header.html` end to end. List every element. Classify each as:
- **Universal** (skip-link, site-logo, navigation, mobile-nav, container groups) — keep
- **Indus-specific content** (LinkedIn/Facebook/Google/Instagram URLs, "Apply For Trade Account" CTA, sgs-top-bar-mobile-cta) — extract or remove
- **Optional component** (top bar, mega-menu integration) — convert to either a setting toggle (Settings → SGS Header) or a saved pattern

Rewrite `header.html` to contain only the universal layer. Move Indus-specific arrangement to `theme/sgs-theme/patterns/header-with-trade-bar.php` as an INSERT-and-edit pattern. Use `/brainstorming` for the trade-off (toggle vs pattern). Default to pattern unless the toggle gives meaningful per-page benefit.

## Task 2: Audit `theme/sgs-theme/parts/footer.html` for universality

Same approach. Universal layer = site-logo, sgs/business-info, copyright, generic columns container with placeholder nav. Indus-shaped column headings ("Certifications/Trade/Brands") and "Get Directions" CTA framing move out. Clients fill columns via Site Editor — no copy hard-coded.

## Task 3: Delete the per-client files + theme.json registrations

Delete `theme/sgs-theme/parts/header-mamas-munches.html` and `theme/sgs-theme/parts/footer-mamas-munches.html`. Remove matching `templateParts` entries from `theme/sgs-theme/theme.json`. Revert sandybrown's server-side overrides (its `theme.json` has `header-mamas-munches`/`footer-mamas-munches` registered + `front-page.html` references those slugs) so it consumes the universal parts.

## Task 4: Verify on sandybrown + grade against three persona clients

Playwright capture sandybrown front page after universal parts ship. Confirm hero, content, footer still render with no validation errors.

Run `/gap-analysis` against three persona-specific style variations (food brand, healthcare, construction) using stub variation JSONs. Score the universal `header.html` and `footer.html` on whether they look correct, professional, and brand-appropriate for each persona with zero HTML edits. Target: 4/5 anchor per persona.

## Task 5: Update PR #10 + run `/handoff`

Commit audit work to `feat/recogniser-v1`. Update PR #10 description with universal-parts model. Run `/handoff` at session end.

## Guardrails

- Universal `header.html` + `footer.html` MUST work for any client with zero HTML changes. Anything client-specific is style variation, WP global setting, saved pattern, or editor rearrangement.
- Patterns are insert-and-edit conveniences. NEVER required for a client to launch.
- All edits to `feat/recogniser-v1`, never `main`.
- Theme-only audit — no plugin rebuild needed.
- Tar deploy method per project `CLAUDE.md`. HTTP-method OPcache reset after PHP changes.
- Do NOT regress sandybrown — Mamas Munches homepage must still render cleanly with universal parts.
- Do NOT add business-specific text, social URLs, or contact info to the universal parts. All such content flows from `sgs/business-info` reading Settings → Business Details.

## Acceptance for this session

- `header.html` + `footer.html` carry zero Indus-specific content
- `header-mamas-munches.html` + `footer-mamas-munches.html` deleted from repo + theme.json
- Sandybrown front page renders cleanly with universal parts (no per-client files)
- `/gap-analysis` scores ≥ 4/5 on each of three persona variations
- 1+ saved pattern registered in `theme/sgs-theme/patterns/` for the optional "trade bar" header arrangement
- PR #10 updated
- Session handoff written via `/handoff`
