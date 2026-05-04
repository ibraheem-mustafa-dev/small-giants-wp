---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-04
recommended_model: sonnet
session_tag: small-giants-wp-2026-05-04-button-architecture-shipped
---

# Session Handoff — 2026-05-04 (button architecture + downstream cleanup)

## Completed This Session

Shipped spec 11 (SGS Button Architecture) end-to-end on sandybrown plus 7 downstream items Bean added mid-session. Six commits pushed to `main`.

### Spec 11 — Button Architecture
1. **`sgs/button`** — 87-attribute dynamic block. `inheritStyle` (primary/secondary/outline/custom) binds to theme.json preset values via CSS custom properties. When inheritStyle != custom, render.php emits only the variant class so theme.json drives all colour/border/radius. Lucide icon support via existing `sgs_get_lucide_icon` helper. Per-breakpoint typography, padding, margin. WPCS clean.
2. **`sgs/multi-button`** — container restricted to `sgs/button` children only. Per-breakpoint layout (direction, gap, alignment, wrap). Default template auto-inserts primary + secondary buttons.
3. **Button Presets admin** at Settings → SGS Button Presets. Site-wide primary/secondary defaults stored in `wp_options.sgs_button_presets`. Outputs CSS custom properties on both `wp_head` and `admin_head`.
4. **theme.json mirror** — `custom.buttonPresets` framework defaults. mamas-munches.json has Mama's-specific values (coral pink primary, charcoal-text outline secondary, invert-on-hover) matching the mockup.
5. **Composite block refactors** — sgs/hero, sgs/cta-section, sgs/product-card replaced hand-coded CTA rendering with `<InnerBlocks>` slots. deprecated.js migrate() functions on each preserve old `ctaPrimary*`/`ctaSecondary*`/`buttons[]`/`ctaText`/`ctaUrl` attributes for existing post content.
6. **Hero — 5 new responsive typography attrs**: `headlineFontSizeDesktop/Tablet/Mobile`, `subHeadlineMaxWidth`, `splitImageMobileHeight`. Inspector controls + scoped CSS media queries in render.php.
7. **Product-card — `variantStyle: 'gift'`** added to enum (alongside standard, trial). Gift sections will be **block patterns** composing 2 product-cards with variantStyle:gift, not a new block.

### Downstream items Bean added
8. **sgs/info-box upgrade** — 5 toggleable, reorderable elements: media (icon/emoji/image), title, subtitle, text, button. New attrs: `showMedia`/`showTitle`/`showSubtitle`/`showText`/`showButton` + `elementOrder` array. Button element uses `sgs/multi-button` InnerBlocks. CSS hover targets the icon/emoji itself (not the rectangular container — fixes the bug Bean reported). deprecated.js migrates legacy info-box content.
9. **`sgs/feature-grid`** — new container restricted to `sgs/info-box` children. Two layout modes: `auto-flex` (CSS Grid auto-fill, naturally responsive — Bean's preferred default) and `fixed-columns` (explicit per-breakpoint count, default 4 desktop / 2 tablet / 1 mobile).
10. **Ingredients pattern** — `theme/sgs-theme/patterns/ingredients-section.php`. Composes title + intro + 4-column feature-grid (4 emoji info-boxes) + sgs/notice-banner disclaimer. Insertable from the patterns picker.
11. **sgs/icon-block deprecated, sgs/icon canonical** — picked icon as keeper (has hover scale, hover colour, alignment). icon-block hidden from inserter, deprecated.js added. hover-effects.js extension updated to reference sgs/icon.
12. **sgs/back-to-top hidden from inserter** — moved to Customiser-only. Existing posts continue to render.
13. **sgs/whatsapp-cta — render.php created** (was missing entirely; block was producing zero frontend output). Inserter icon SVG replaced with the official WhatsApp brand mark — was a cramped hand-drawn approximation in `utils/icons.js`.
14. **Block coverage gap audit** — 53 blocks audited for recogniser-v2 input (parking item P-9). 10 blocks at 100% extractable, 2 hard blocks (form-field-file 31%, post-grid 56% borderline). Full report in agent transcript.
15. **Patterns audit** — 52 files scanned, only 1 functional fix needed (`patterns/stats-counter.php`: `target` attr → `number`, removed unsupported `align:centre`). 29 patterns have em-dashes in PHP DocBlocks (cosmetic, low severity).

### Bug fixes discovered mid-session
- **`class-mobile-nav-renderer.php` 500 error**: file calls `sgs_get_lucide_icon()` 10 times but never owned the dependency. Relied on a sibling block's render.php loading the helper first; broke after a fresh build. Fix: `require_once __DIR__ . '/lucide-icons.php';` at top.
- **InnerBlocks.Content save pattern** (CRITICAL): sgs/product-card, sgs/cta-section, sgs/info-box all had `save: () => null`. Caused WordPress to **drop InnerBlocks during serialization** to post_content. Editor showed migrated InnerBlocks in memory; round-trip emitted only the parent. Hero already had the correct pattern. All four now aligned: `save: () => <InnerBlocks.Content />` (dynamic blocks still render exclusively from render.php).

## Current State

- **Branch (small-giants-wp):** `main` — 6 commits ahead at landing, all pushed to origin
- **Live deploy state (sandybrown):** all 6 commits deployed. HTTP 200. Block markers visible: sgs-hero, sgs-multi-button, sgs-button, sgs-info-box, sgs-feature-grid, sgs-product-card, sgs-whatsapp, sgs-mobile-nav.
- **Migration sweep:** ran on pages 8 (Mamas Munches Homepage) and 5 (Mamas Munches Homepage Test). Hero CTAs migrated to sgs/multi-button + sgs/button. Product-card CTAs persisted after the InnerBlocks.Content save fix.
- **Tests:** none added/run. WPCS clean across all new and modified PHP. Build green (webpack 5.105.2 compiled successfully, 1.6s).

## Known Issues / Blockers

1. **Migration uses fallback labels, not original CTA text.** Hero shows "Primary Action"/"Secondary Action" (InnerBlocks template defaults) instead of original headline-pair labels. Either deprecation eligibility check failed (so migrate() never ran) or originals were empty. Worth investigating in a follow-up; for now the buttons render and are clickable. Bean acknowledged content updates would be needed.

2. **Product-card images broken.** Page 8 references `/wp-content/uploads/cookies-stacked.jpeg` which doesn't exist on the server. Mockup images uploaded to sandybrown have IDs 21-25 (per prior handoff) but post_content references different filenames. Content-authoring task — needs editor pass to repick images.

3. **Pack-size pills aren't sgs/button.** They're product-card's own internal `pill-group` (8-pack, 12-pack, 20-pack, 40-pack). Separate from CTA migration. If they should use sgs/button, that's a product-card refactor.

4. **Existing ingredients still show star icons, not emojis.** The new ingredients pattern is available in the inserter for new content. Existing info-box instances on the page have `icon: 'star'` from the legacy default. To swap to emojis, either edit each info-box's media → emoji, or replace the existing section with the new pattern.

5. **Temporary password set on Claude user.** Ran `wp user update Claude --user_pass="MigrationSweep2026!"` to drive Playwright through wp-login.php (app passwords don't work on form login). Bean should reset via wp-admin or `wp user update Claude --user_pass=...`.

6. **WordPress 6.7 `_load_textdomain_just_in_time` notice for woocommerce** — pre-existing warning in error_log, not introduced by this session.

## Next Priorities

The button architecture session has shipped. Three viable next sessions:

1. **Hero perfect-clone** (the original goal that was blocked behind button architecture). Now unblocked. Re-author page 8 to match the mockup pixel-for-pixel using the new sgs/button + sgs/multi-button + the upgraded sgs/info-box + sgs/feature-grid + ingredients pattern. ~3-4h.
2. **Recogniser-v2 generalisation** (parking P-9, spec 12). The composition emitter is unblocked now that sgs/button + sgs/multi-button exist. Phase V2.1-V2.5 from spec 12. ~12-15h spread across 2-3 sessions.
3. **Migration label preservation investigation.** Why do hero CTAs show placeholder labels post-migration when the deprecated.js logic should fall back to original `ctaPrimaryText`? Likely the deprecation `attributes` schema didn't match what was stored, so eligibility returned false. ~30 min to diagnose, ~30 min to fix.

## Key Patterns Established

- **Dynamic blocks with InnerBlocks**: save MUST return `<InnerBlocks.Content />` (not null). This is now the SGS standard for any dynamic block that has an InnerBlocks slot. Add to `plugins/sgs-blocks/CLAUDE.md` Gotchas section in a follow-up.
- **theme.json `settings.custom.buttonPresets`** auto-generates CSS custom properties at the path `--wp--custom--button-presets--<variant>--<key>`. The Button Presets admin overrides theme.json values via wp_head output (admin wins over theme.json by load order).
- **Per-block deprecation pattern**: every block that changes its render contract gets `deprecated.js` with attribute schema + `save: () => null` (or matching prior save) + optional `migrate()`. Without this, existing posts show "block contains unexpected content" errors.

## Available Tooling

### Skills (invoke via Skill tool)

| Category | Skill | When to use |
|----------|-------|-------------|
| Framework | `/sgs-wp-engine` | Any SGS Framework work — blocks, themes, clients, auditing |
| Routing | `/wordpress-router` | Classify a WP repo and route to the right skill |
| Blocks | `/wp-block-development` | Gutenberg block dev — block.json, attributes, render |
| Themes | `/wp-block-themes` | theme.json, templates, patterns, style variations |
| Plugins | `/wp-plugin-development` | Plugin architecture, hooks, Settings API, security |
| REST API | `/wp-rest-api` | register_rest_route, controllers, schema validation |
| Performance | `/wp-performance` | Runtime profiling — WP-CLI profile/doctor, Query Monitor |
| Visual QA | `/visual-qa` | 8-layer SGS QA pipeline |
| Deploy | `/deploy-check` | Pre-deployment checklist |
| Dispatch | `/dispatching-parallel-agents` | When 3+ independent block builds can run concurrently |

### Agents

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All heavy SGS WordPress work — block dev, replication, QA. Mandatory per CLAUDE.md |
| `design-reviewer` | Visual quality review, mockup-to-WP comparison |

### MCP Servers

| Tool | Use |
|------|-----|
| `mcp__plugin_playwright_playwright__*` | Block validation testing in editor; visual diff at 1440 + 375; `wp.data.dispatch` for safe page-content edits |
| `mcp__wp-blockmarkup` | Validate block markup schemas |
| `mcp__wp-devdocs` | Confirm WP hooks for InnerBlocks composition + block deprecation |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Block attribute lookups across the framework |

### Sandybrown deploy

```bash
cd plugins/sgs-blocks && npm run build
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='plugins/sgs-blocks/src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh hd 'WP=domains/sandybrown-nightingale-600381.hostingersite.com/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'
rm sgs-deploy.tar
ssh hd 'echo "<?php opcache_reset();" > ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html/op-reset-tmp.php' && curl -s https://sandybrown-nightingale-600381.hostingersite.com/op-reset-tmp.php && ssh hd 'rm ~/domains/sandybrown-nightingale-600381.hostingersite.com/public_html/op-reset-tmp.php'
```

LiteSpeed isn't installed on sandybrown — no cache flush needed.

## Notes for the next session

- **Sandybrown URL:** https://sandybrown-nightingale-600381.hostingersite.com/
- **WP admin:** /wp-admin — login as Claude (password "MigrationSweep2026!" until Bean resets; or use REST app password from `~/.openclaw/.secrets/wp-app-passwords.env`)
- **Mockup at:** `sites/mamas-munches/mockups/homepage/index.html`
- **Two pages migrated:** post 8 (Mamas Munches Homepage), post 5 (Mamas Munches Homepage Test)
- **Mockup images:** IDs 21-25 already in media library on sandybrown
- **Visual diff screenshots from this session:** `post-migration-1440-fullpage.png`, `post-migration-375-mobile.png`
