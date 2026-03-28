Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context. Two tracks: (1) mega menu architecture upgrade (InnerBlocks + patterns + animations), (2) mobile-nav attribute spec continuation.

Read the Awwwards research output FIRST — it contains animation CSS/HTML to extract.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/internal-debate` | Debate InnerBlocks vs template part architecture for mega menu panels |
| `/gap-analysis` | Re-grade after InnerBlocks conversion |
| `/skill-lifecycle` | If any skill/agent changes needed |
| `/research` | Auto-route any questions during implementation |
| `/strategic-plan` | Plan the InnerBlocks conversion order |
| `/sgs-wp-engine` | Load framework context, check block patterns |
| `/wp-block-development` | Block pattern registration, InnerBlocks |
| `/wp-block-themes` | Template parts, patterns, style variations |
| `/interactive-design` | Animation implementation from Awwwards research |
| `/frontend-design` | Visual quality of pattern layouts |
| `/critique` | Evaluate each pattern before finalising |

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
| `design-reviewer` | After InnerBlocks conversion — compare all 7 at 3 breakpoints |
| `test-and-explain` | After all changes — verify patterns work in Site Editor |

## Research Approach
1. Read Awwwards research output for animation patterns
2. Extract the best 3-4 CSS animations (panel open, hover, stagger)
3. Use /internal-debate to decide: should animations be in mega-menu-panels.css or in the mega-menu block's view.js?

---

## Task 1: Read Awwwards Research + Extract Animations
Read the research output file. Identify the top 3-4 animation patterns. Extract the CSS/HTML. Decide where they belong in the SGS architecture (CSS file vs JS). Implement the animations in mega-menu-panels.css or the mega-menu block.

## Task 2: Convert Mega Menu to InnerBlocks Container + Block Patterns
Convert the 7 template parts from static HTML to InnerBlocks containers. Register 7 block patterns in PHP (one per panel type). Patterns are insertable quickstarts — fully editable after insertion. Add image/icon placeholder slots to Products, About, Resources patterns.

## Task 3: QA + Re-Grade
Deploy, screenshot at 1440/768/375. Run /gap-analysis targeting B+ (3.5+/5). Fix any issues. Run /design-review for final visual check.

## Task 4: Mobile Nav Attribute Spec (if time)
Switch to feat/mobile-nav-block. Continue implementation from where session 8 left off. Read the spec at docs/superpowers/specs/2026-03-25-mobile-nav-attributes.md.

## Guardrails
- `npm run build` must pass with zero errors before any deploy
- Screenshot at 375, 768, and 1440 after EVERY change
- All colours use design tokens, never hardcoded hex
- Patterns must work with default SGS theme AND Indus Foods variation
- Branch: mega menu work on `main`, mobile-nav on `feat/mobile-nav-block`
