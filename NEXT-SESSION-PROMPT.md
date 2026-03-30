Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context. Three tracks: mega menu InnerBlocks, mobile nav v2, Indus Foods pages.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/internal-debate` | Debate InnerBlocks vs template part architecture for mega menu panels |
| `/gap-analysis` | Grade mega menu after InnerBlocks conversion |
| `/skill-agent-pipeline` | If any skill/agent changes needed |
| `/research` | Auto-route any questions during implementation |
| `/strategic-plan` | Plan the InnerBlocks conversion order |
| `/sgs-wp-engine` | Load framework context before any SGS work (MANDATORY) |
| `/wp-block-development` | Block pattern registration, InnerBlocks API |
| `/wp-block-themes` | Template parts, patterns, style variations |
| `/interactive-design` | Animation implementation from Awwwards research |
| `/frontend-design` | Visual quality of pattern layouts |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Screenshot verification at 1440/768/375 after each change |
| Context7 | WordPress block pattern API docs, InnerBlocks API |
| wp-blockmarkup | Validate block markup in patterns |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy PHP pattern registration, template part refactoring |
| `design-reviewer` | After InnerBlocks conversion — compare all 7 panels at 3 breakpoints |
| `test-and-explain` | After all changes — verify patterns work in Site Editor |

---

## Task 1: Read Awwwards Research + Extract Animations
Read `c:/tmp/awwwards-mega-menu-research.md`. Extract top 3-4 CSS animations (panel open, hover, stagger). Implement in mega-menu block CSS. Use `/interactive-design` for the animation work.

## Task 2: Convert Mega Menu to InnerBlocks + Block Patterns
Convert 7 template parts from static HTML to InnerBlocks containers. Register 7 block patterns in PHP. Patterns are insertable quickstarts — fully editable after insertion. Use `/wp-block-development` for InnerBlocks API. Delegate to `wp-sgs-developer`.

## Task 3: Mobile Nav v2 (if time)
Switch to `feat/mobile-nav-block`. Continue from spec at `docs/superpowers/specs/2026-03-27-mobile-nav-v2-composition.md`. Use `/strategic-plan` to plan the implementation order.

## Guardrails
- `npm run build` must pass before any deploy
- Screenshot at 375/768/1440 after mega menu changes
- All colours use design tokens, never hardcoded hex
- Patterns must work with default SGS theme AND Indus Foods variation
- Branch: mega menu on `main`, mobile-nav on `feat/mobile-nav-block`
- MANDATORY: Run `/sgs-update` after ALL code changes
