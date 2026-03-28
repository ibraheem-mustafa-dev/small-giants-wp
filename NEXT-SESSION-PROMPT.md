Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context. Three tasks: testimonial-slider upgrade, CTA border controls, then theme-level animation system.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/internal-debate` | Debate testimonial split layout approach (InnerBlocks vs attributes) |
| `/gap-analysis` | Grade the testimonial block after changes |
| `/skill-agent-pipeline` | If any skill/agent changes needed |
| `/research` | Auto-route any questions during implementation |
| `/strategic-plan` | Plan the animation system architecture before building |
| `/sgs-wp-engine` | Load framework context, check block patterns |
| `/wp-block-development` | Block.json attributes, edit.js controls, render.php |
| `/interactive-design` | Theme-level animation system (block style variations) |
| `/frontend-design` | Visual quality of animation effects |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Screenshot verification at 1440/768/375 after block changes |
| Context7 | WordPress block API docs for MediaUpload, register_block_style |
| wp-blockmarkup | Validate block.json schema after attribute additions |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Heavy block dev (testimonial-slider, CTA section attrs) |
| `design-reviewer` | After testimonial split layout — verify at 3 breakpoints |
| `test-and-explain` | After all changes — verify in plain English |

---

## Task 1: Testimonial Slider — sideImage + layout attributes
Read `plugins/sgs-blocks/src/blocks/testimonial-slider/`. Add `sideImage` (MediaUpload, attachment ID) and `layout` ("full"|"split") attributes. In split mode, the testimonial card shows a large image on one side (60%) and the quote/stars/attribution on the other (40%). Follow the hero block's split-image pattern. Update block.json, edit.js (MediaUpload + layout toggle), render.php (conditional split rendering), style.css (split layout CSS). Build and deploy.

## Task 2: CTA Section — per-button border controls
Read `plugins/sgs-blocks/src/blocks/cta-section/`. Add `buttonBorderColour` (DesignTokenPicker), `buttonBorderWidth` (number, px), `buttonBorderRadius` (number, px) attributes. Wire them in edit.js inspector + render.php inline styles. Build and deploy.

## Task 3: Theme-Level Animation System
Read `c:/tmp/awwwards-mega-menu-research.md` for the 8 extracted patterns. Build a theme-level animation system using `register_block_style()` so clients can pick animations from the block editor sidebar. Create `theme/sgs-theme/assets/css/sgs-animations.css` with curtain reveal, glass panel, stagger children, clip-path variants. Register styles for Group, Columns, Cover blocks. Add a small JS file with IntersectionObserver to trigger animations on scroll. This makes animations a framework feature, not mega-menu-specific.

## Guardrails
- `npm run build` must pass before any deploy
- Screenshot at 375/768/1440 after testimonial split layout
- All animation classes must respect `prefers-reduced-motion`
- Branch: `main` for all work (these are framework features)
- The tar deploy MUST use `--exclude='plugins/sgs-blocks/src'` not `--exclude='src'`
