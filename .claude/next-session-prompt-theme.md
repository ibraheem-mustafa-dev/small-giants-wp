---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-03-theme-blocks-functionality
generated: 2026-06-02
primary_goal: "SGS-THEME THREAD (separate from the cloning pipeline). Fix + build the theme's blocks, editor UX, and functionality. Surfaced 2026-06-02: broken/barebones editor UX on icon + icon-list (no visual picker), missing product/photo pickers (product-card, team-member), notice-banner needs richer variant defaults + controls, mega-menu's variants don't exist, cta-section variants are weak, and a variant-classification cleanup (delete product-card gift, reclassify heading/text/label/quote variantStyle as block-styles not variants). Each item below states the GAP + the ACCEPTANCE the solution must meet."
---

# Next Session — SGS THEME thread (blocks, editor UX, functionality)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread — NOT the cloning pipeline (that's `.claude/next-session-prompt-theme.md`'s sibling `.claude/next-session-prompt.md`). Read the MANDATORY READING LIST below FULLY. Every block claim here was observed live in the WP block editor 2026-06-02 — but VERIFY each against the actual block.json/edit.js/render.php before building (STOP: don't assert block capability from a partial dump — read block.json + edit.js + render.php + `/wp-blocks` first). The variant-classification context lives in `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md` — read it.

## State recap (plain English)
The SGS framework is a custom WordPress block library (theme + blocks plugin). Phase 1 blocks are built. This thread collects the editor-UX + functionality + variant-cleanup work Bean surfaced while reviewing blocks on 2026-06-02. It is INDEPENDENT of the cloning-pipeline thread — these can be worked in parallel. Branch `feat/fr22-4-1-universal-wrapper` (shared; do client/theme work on it or branch `feat/theme-blocks-*` if scope grows). Build+deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --allow-dirty`. Canary admin: open the page editor on sandybrown (WP admin user `Claude`).

## Tasks — each is GAP → ACCEPTANCE

### Task 1 — Icon block: real visual icon/emoji picker (HIGH — UX blocker)
- **Gap:** `sgs/icon` has NO visual picker. It forces a dropdown of 4 icon SOURCES, then asks the user to TYPE the icon name. Nobody has 1 of 1,900+ Lucide names memorised. `sgs/icon-list` is worse — a tiny hardcoded dropdown.
- **Available data:** the framework has Lucide (1,963 icons, `includes/lucide-icons.php`) + 3 other libraries + MERGED emoji libraries. They're all there, just not browsable.
- **Acceptance:** a searchable, browsable visual grid picker (search box + scrollable icon grid + library/emoji tabs) usable inside the block inspector, for BOTH `sgs/icon` and `sgs/icon-list` (and anywhere icons are picked). User browses/searches in the moment; never types a name. WCAG 2.2 AA, 44px targets. Reuse one shared `IconPicker` component.

### Task 2 — Product-card: product picker + data feed (HIGH)
- **Gap:** `sgs/product-card` has NO control to pick WHICH product the card shows, and no mechanism feeding the chosen product's data (title/price/image/link) through the card's child elements/blocks.
- **Acceptance:** an inspector control to select a product (from WooCommerce or the site's product source), whose data populates the card's inner elements automatically (the "bound" data path — aligns with Spec 24 §FR-24-1/2 query-driven cards). Per-variant defaults: `featured` → defaults to best-selling product; `trial` → defaults to cheapest/trial-tagged. Picking is optional (pick-any-product also allowed). See decisions D129 + Spec 24.

### Task 3 — Team-member: photo picker + verify the 3 block-variations are real (MED)
- **Gap:** `sgs/team-member` has NO way to pick a team-member PHOTO. It shows 3 inserter variations (`registerBlockVariation`: Standard Team Card / Compact (photo+name) / Detailed (with bio+socials)) whose NAMES imply different content models — but Bean doubts they're functionally implemented (they may be inserter labels only).
- **Acceptance:** (a) a media-picker control for the photo; (b) verify each of the 3 variations actually renders a DISTINCT content model (Compact = photo+name only; Detailed = +bio+socials) — if they're label-only, either implement the render differences or remove the non-functional variations. (These ARE true variants per the routing criterion — Compact vs Detailed change the content model.)

### Task 4 — Notice-banner: richer per-type defaults + missing controls (MED)
- **Gap:** `sgs/notice-banner` variants (info/warning/success/error) currently ONLY change a colour — "not worthy of being called variants" (Bean). Also: the icon choices are limited (should expose all icon libraries + merged emoji, per Task 1's picker); and there's no border-radius (corner rounding) control.
- **Acceptance:** each type (info/warning/success/error) ships an IDEAL default bundle — a coherent colour + a fitting icon (auto-picked per type) + any supporting CSS — so picking the type gives a complete look the user can then customise. Add a corner-radius control. Wire in the Task-1 icon picker for icon choice.

### Task 5 — Mega-menu: build the ~7 variants (MED)
- **Gap:** Bean knows there should be ~7 very different mega-menu variants; the DB has `variations` = 0 for `sgs/mega-menu`, so they aren't built/registered.
- **Acceptance:** define + build the ~7 mega-menu variants (each a genuinely different layout/capability — confirm the list with Bean first). Register them properly so they appear + function. These ARE true variants (structural).

### Task 6 — CTA-section: upgrade weak variants to rich template-patterns (MED)
- **Gap:** `sgs/cta-section` has 3 variations (Banner/Centred/Split) but they're "weak, alignment-focused" (Bean). They should be like the hero's variants — essentially templates/presets that show off full functionality.
- **Acceptance:** turn the cta-section variants into rich block-pattern templates that demonstrate the full option set — e.g. one with stats + social-proof examples inserted as filler — so a user picks a variant and gets a complete, impressive starting point fast (like a pattern, not just an alignment toggle).

### Task 7 — Variant-classification cleanup (LOW-MED — hygiene, do alongside)
- **Gap:** the framework conflates true variants with style presets. Per the routing criterion (see scratch register): (a) `product-card` `gift` variant should be DELETED (Bean: identical to standard, agreed); (b) `heading.variantStyle` (default/hero/section/card), `text.variantStyle`, `label.variantStyle`, `quote.variantStyle` are cosmetic style presets, NOT variants — they should be reframed as block-styles (`is-style-*`) or just theme-default-driven sizing (Bean: heading "hero" is redundant — a `<h1>` with the theme default IS "hero"). `mobile-nav.variant` (slide-left/right) is an animation SETTING, not a variant. `divider.variant` is an asset choice (like an icon), not a variant.
- **Acceptance:** delete `product-card` gift (+ its render.php/edit.js/deprecated handling). Decide with Bean whether to convert the cosmetic `variantStyle` dropdowns to block-styles or remove them. Do NOT touch the genuinely-content-distinct variants (hero, product-card trial/featured, business-info type, etc.).

### Task 8 — Block-editor errors regression-check + duplicate animation (verify shipped fixes hold)
- **Gap:** 2026-06-02 fixed (committed): heading nested error (hoverScale null-default), trustpilot-reviews + business-info "Invalid parameter(s): attributes" (array-items / `type`→`displayType` rename), and the duplicate Animation panel (animation.js dual-bundle guard). The container "unexpected/invalid content" + media "cannot be previewed" errors were content-vs-block mismatches; a fresh clone (run 113800) refreshed the page content.
- **Acceptance:** open the editor on canary 144 — confirm: zero "Invalid parameter(s)" on trustpilot/business-info, zero nested-heading error, exactly ONE Animation panel per block, and that the refreshed page content shows no container/media block errors. If container/media errors persist, root-cause (likely the converter's static `<div class="wp-block-sgs-container">` placeholder vs the container's `save()` = `<InnerBlocks.Content/>` mismatch — a CLONING-thread converter issue, hand it there).

### Task 9 — Remaining FR-22-6 hybrid-block migrations (the Phase 2 roster)
- **Gap:** Phase 2 (Spec 22 §FR-22-6) migrates 61 hybrid SGS blocks from scalar-attr render to InnerBlocks `echo $content`. hero / cta-section / trust-bar / info-box / testimonial-slider done. The rest of the 61-block roster (per `.claude/reports/2026-05-27-hybrid-block-roster.md`) remain.
- **Acceptance:** migrate each remaining hybrid block per FR-22-6.1 (render echoes `$content`; edit.js InnerBlocks template; deprecated.js v(N+1) + `isEligible`); NEVER a server-side legacy scalar fallback (R-22-14). Batch via `/subagent-driven-development`. Each migration: build + editor-verify no "unexpected content" + the cloning converter emits InnerBlocks for it.

## MANDATORY READING LIST (read FULLY first)
1. This file.
2. `.claude/handoff-theme.md` (2026-06-02).
3. `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md` — variant classification + the full issue register (Tasks 1-9 originate here).
4. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` — block customisation standard, deprecation procedure, gotchas (source:html ban, InnerBlocks.Content save, deprecations-required).
5. `.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — product-card/trust-bar dual-mode + query-driven cards (Task 2).
6. `.claude/decisions.md` newest — D129 (product-card/picker design), D134-D136.
7. `.claude/reports/2026-06-01-product-card-option-picker-design.md` — product-card + sgs/option-picker design (Task 2; needs Bean's 6 decisions).
8. `.claude/reports/2026-05-27-hybrid-block-roster.md` — the 61-block FR-22-6 migration roster (Task 9).
9. `plugins/sgs-blocks/includes/lucide-icons.php` + the icon-library/emoji assets (Task 1).
10. The relevant block dirs `plugins/sgs-blocks/src/blocks/<block>/{block.json,edit.js,render.php}` — READ before asserting capability.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design the icon-picker component + the per-block solutions before building |
| `/gap-analysis` | Grade each block fix against its acceptance criteria |
| `/lifecycle` | Before any skill/agent change |
| `/research` | Gold-standard for the icon-picker UX + WooCommerce product binding (auto-routes tier) |
| `/strategic-plan` | Order the 9 tasks |
| `/sgs-wp-engine` | SGS block dev — block.json, attributes, render, editor controls |
| `/wp-block-development` | Gutenberg block internals (InspectorControls, InnerBlocks, deprecations) |
| `/visual-qa` or `/design-review` | Verify the editor UX + WCAG 2.2 AA |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | Open the WP block editor on canary 144, verify each block's controls + errors |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Block schema before asserting capability |
| `/sgs-db` (read) | Block roster, variations, capabilities |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | ALL heavy block dev (pickers, migrations, controls) |
| `design-reviewer` | Editor UX + WCAG review of the new pickers |

## Guardrails
- **Read block.json + edit.js + render.php + `/wp-blocks` before asserting any block's capability** — don't infer from a partial dump.
- **Deprecations required** — any change to a static block's save() or an attribute schema needs a `deprecated.js` entry (see plugins/sgs-blocks/CLAUDE.md procedure) or existing posts show "unexpected content".
- **Never `source:html` on a dynamic block**; dynamic blocks with InnerBlocks need `save: () => <InnerBlocks.Content/>`.
- **No client-specific values in base theme/blocks** — client work lives in `sites/<client>/` only.
- **Build + editor-verify after every block change** — `build-deploy.py --blocks-only` + reload editor.
- **WCAG 2.2 AA + 44px touch targets + mobile-first** on all new UI.
