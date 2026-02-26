# SGS WordPress Framework — Claude Code Instructions

## What This Is

A custom WordPress development framework for Small Giants Studio. Contains a block theme, custom Gutenberg blocks plugin (with forms), a booking plugin, and a client notes plugin. Built and maintained entirely by Claude Code.

## Repository Structure

```
small-giants-wp/
├── theme/sgs-theme/          # WordPress block theme (has its own CLAUDE.md)
├── plugins/
│   ├── sgs-blocks/           # Custom Gutenberg blocks + forms (has its own CLAUDE.md)
│   ├── sgs-booking/          # Appointment & event booking (has its own CLAUDE.md)
│   └── sgs-client-notes/     # Visual annotation system (has its own CLAUDE.md)
├── sites/                    # Client-specific content (one folder per client)
│   └── indus-foods/          # Indus Foods — mockups, content, research (has its own CLAUDE.md)
├── specs/                    # Specification documents (00-09)
├── docs/plans/               # Planning documents and audits
│   └── 2026-02-21-master-feature-audit.md  # Truth document: 354-feature graded roadmap
├── ARCHITECTURE.md           # Architecture overview, block inventory, data flow
└── CLAUDE.md                 # This file — framework-wide instructions
```

Each sub-project has its own CLAUDE.md with component-specific instructions. Read the relevant one when working on that component.

### Client Sites (`sites/`)

Each client gets a folder under `sites/` containing mockups, content briefs, research docs, and a site-specific CLAUDE.md. Style variation JSON files stay in `theme/sgs-theme/styles/` (where WordPress reads them), but everything else lives here.

Future clients (Dream Wedding, Workwear Now, etc.) get their own folder when onboarded.

## Naming Convention

- Theme: `sgs-theme`
- Plugins: `sgs-blocks`, `sgs-booking`, `sgs-client-notes`
- PHP namespace: `SGS\Theme`, `SGS\Blocks`, `SGS\Booking`, `SGS\ClientNotes`
- Text domain: `sgs-theme`, `sgs-blocks`, `sgs-booking`, `sgs-client-notes`
- CSS prefix: `.sgs-`
- Block namespace: `sgs/block-name`
- Hook prefix: `sgs_`

## Design Tokens

All components read from `theme.json` design tokens. Defaults are SGS branding (clients override via style variations):

```
--primary: #0F7E80 (teal)        --accent: #F87A1F (orange)
--primary-dark: #0A5B5D          --accent-light: #FEE8D4
--success: #2E7D4F (green)       --whatsapp: #25D366
--surface: #FFFFFF               --surface-alt: #F5F7F7
--text: #1E1E1E                  --text-muted: #555555
--text-inverse: #C0D5D6          --border-subtle: #0D5557
```

Fonts: Inter variable (body + headings, 48KB) — self-hosted WOFF2, no CDN. DM Serif Display + DM Sans available for client style variations.

## Agent Delegation

**MANDATORY:** Delegate all heavy WordPress build work to the `wp-developer` agent — page builds, template creation, block configuration, theme customisation, plugin development. This rule applies across all WP projects and non-WP projects with WP integrations.

## Git

**Remote:** `github.com/ibraheem-mustafa-dev/small-giants-wp` (private). See global CLAUDE.md for workflow rules.

## Development

- **Build:** `npm run build` (from `plugins/sgs-blocks/`) — uses @wordpress/scripts with `--experimental-modules`
- **Deploy:** SCP to Hostinger (`ssh hd`)
- **Dev site:** palestine-lives.org (WP 6.9.1)
- **Test site:** lightsalmon-tarsier-683012.hostingersite.com (DO NOT modify — client-facing)
- **No Node.js on server** — build locally, deploy compiled `build/` output

## Spec Documents

Full specifications in `specs/` directory:
- `00-OVERVIEW.md` — Framework overview, philosophy, architecture
- `01-SGS-THEME.md` — Block theme spec (theme.json v3, templates, performance)
- `02-SGS-BLOCKS.md` — All block specifications (20 content/layout blocks + 12 form blocks + extensions)
- `03-SGS-BOOKING.md` — Booking system spec (phases 1-4)
- `04-SGS-FORMS.md` — Form system spec (built into sgs-blocks)
- `05-SGS-CLIENT-NOTES.md` — Visual annotation system spec
- `06-BUILD-ORDER.md` — Dependencies, phasing, testing strategy
- `07-SGS-POPUPS.md` — Conversion pop-ups plugin spec
- `08-SGS-CHATBOT.md` — Live chat + AI chatbot plugin spec
- `09-GOLD-STANDARD-AUDIT.md` — Per-block competitor comparison and gap analysis

## Master Feature Audit

The truth document for feature scope, priorities, and competitive position is:
**`docs/plans/2026-02-21-master-feature-audit.md`** — 354 features graded by impact, difficulty, and priority (P0-P4).

Current framework maturity: **23% verified (68/294)** — targeting 72% after Phase 2-3, 90% after S-tier phase. Last updated: 2026-02-26.

**Phase 2 blocks — ALL DONE (2026-02-26):**
- ✓ Post Grid / Query Loop — grid/list/masonry/carousel + AJAX pagination
- ✓ Image Gallery + Lightbox — grid/masonry/carousel + Interactivity API lightbox
- ✓ Tabs — horizontal/vertical, InnerBlocks, ARIA
- ✓ Countdown Timer — date-based + evergreen; flip/simple variants
- ✓ Star Rating — SVG stars; Schema.org/Rating
- ✓ Team Member — photo/name/role/bio/socials; Schema.org/Person

**Phase 3 priorities (P1 extensions + P2 blocks, next to build):**
1. Hover scale transform, hover shadow elevation, hover image zoom (inner) — apply to all blocks
2. Transition duration/easing control — CSS transition shorthand per block
3. Block link (wrap entire block in link)
4. Block style variations (register_block_style) — multiple presets per block
5. Icon Block — single icon with link, Lucide library
6. Timeline — vertical/horizontal, scroll reveal (278 Kadence votes — their #1 request)
7. Pricing Table — 2-4 tiers, monthly/yearly toggle

## Architecture Rules

### SGS is a standalone framework, not a client project

SGS Theme and SGS Blocks must work correctly on **any** WordPress installation for **any** client. They compete directly with Kadence, Spectra, and GenerateBlocks. Every design decision must pass this test: "Will this make sense for a restaurant, a wedding planner, and a law firm — not just Indus Foods?"

- Never hard-code Indus Foods colours, copy, imagery, or structure into the base theme or blocks plugin
- Client-specific work lives in `sites/indus-foods/` and `theme/sgs-theme/styles/indus-foods.json` only
- The base theme's `style.css` and the blocks plugin's CSS must contain zero client-specific rules

### Client experience is primary

No block feature is complete until it has full block editor UI controls. Clients are tech-illiterate — they use the block editor exclusively, never code or WP-CLI. Every customisable property (colour, spacing, text, layout) must be exposed as an inspector control in the editor. If a setting requires touching code, it is not done.

### WP-CLI is a developer tool only

WP-CLI is used by the developer (Claude Code) during setup, debugging, and deployment. It is **never** something clients interact with. Do not design features that require WP-CLI for normal operation. Document WP-CLI commands in CLAUDE.md files, not in user-facing documentation.

### Style variation architecture

Style variation-specific CSS (decorative images, client-specific hover effects, custom gradients, etc.) must **never** go in the base `style.css`. The correct pattern:

1. Images used by a style variation go in `theme/sgs-theme/assets/` — version-controlled with the theme, never in `uploads/`
2. Variation-specific CSS goes in `functions.php` via `wp_add_inline_style()`, gated on the active variation:

```php
$active_style = get_theme_mod( 'active_theme_style', 'default' );
if ( 'indus-foods' === $active_style ) {
    wp_add_inline_style( 'sgs-theme-style', $indus_foods_css );
}
```

3. Never load variation CSS unconditionally — it must be gated so other style variations are unaffected

### Block customisation standard (MANDATORY)

Every block MUST provide per-element customisation matching Kadence/Spectra depth:

1. Native WordPress `supports` for wrapper-level controls (colour, typography, spacing, border)
2. Custom attributes + controls for each inner text element (colour, font size)
3. Custom attributes + controls for interactive elements like CTAs (text colour, background colour)
4. CSS fallback colours use `:not([style*="color"])` so custom values always win
5. Use Block Selectors API in `block.json` to target native typography to primary text element

### Hover controls spec

Blocks with interactive hover states MUST expose these controls in the editor inspector:
- **Scale transform** — `transform: scale()` on hover (GPU-composited, safe)
- **Shadow elevation** — box-shadow transition on hover
- **Image zoom (inner)** — `overflow:hidden` + scale on `<img>` on hover
- **Transition duration** — CSS transition-duration control (default 300ms)
- **Transition easing** — CSS transition-timing-function (ease, ease-in-out, etc.)

Colour-only hover shifts (bg/text/border) are already done in Phase 1.3 for 4 blocks. The above controls are P1 for Phase 2.

### No hard-coded environment paths

Never use absolute server paths or hard-coded `/wp-content/...` URLs in CSS, PHP, or JS. Always use WordPress functions that resolve correctly on any install:

- PHP: `get_theme_file_uri()`, `get_stylesheet_directory_uri()`, `wp_upload_dir()`
- JS/CSS: use CSS custom properties set by PHP via `wp_add_inline_style()` or `wp_localize_script()`
- Never: `/wp-content/themes/sgs-theme/assets/image.png` (breaks on any non-standard install)

## Non-Negotiables

- WCAG 2.2 AA accessible, mobile-first responsive (44px minimum touch targets)
- No jQuery — vanilla JS only for frontend
- All REST endpoints: nonces, capability checks, input sanitisation, prepared statements
- Progressive enhancement — blocks must render meaningful content without JS
- Performance budget: < 100KB CSS, < 50KB JS per page, green Core Web Vitals
- UK English in all code, comments, and user-facing text
- **Cross-project sync** — any API or feature change affecting the booking WP plugin must also update `specs/03-SGS-BOOKING.md` and `plugins/sgs-booking/CLAUDE.md`

## Deploy Commands

```bash
# Build blocks plugin
cd plugins/sgs-blocks && npm run build

# Deploy via tar (RELIABLE — scp -r creates nested dirs on Hostinger)
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 "WP=domains/palestine-lives.org/public_html/wp-content && rm -rf \$WP/themes/sgs-theme \$WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme \$WP/themes/ && mv plugins/sgs-blocks \$WP/plugins/ && rm -rf theme plugins sgs-deploy.tar"
rm sgs-deploy.tar

# Deploy single files (for quick patches)
scp -P 65002 -i ~/.ssh/id_ed25519 path/to/file u945238940@141.136.39.73:domains/palestine-lives.org/public_html/wp-content/path/to/file

# Clear LiteSpeed page cache
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge all"
# Also clear the CSS/JS optimiser cache (separate from page cache — must do both after CSS deploys)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/css/*.css"
# Purge a single URL (must pass full URL with https://)
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge url https://palestine-lives.org/page-slug/"

# Reset PHP OPcache after deploying PHP files (CLI reset is a SEPARATE pool — must use HTTP)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

## Gotchas

- **SCP `-r` creates nested directories** — `scp -r theme/sgs-theme remote:path/sgs-theme` creates `sgs-theme/sgs-theme/`. Always use the tar method above, or SCP to the parent directory (`scp -r theme/sgs-theme remote:path/themes/`).
- **Hostinger caches CSS aggressively** — bump the version in `style.css` after CSS changes to bust the cache. The theme version is used as the query string for all enqueued styles.
- **`--webpack-copy-php` flag** — the build script copies `render.php` to `build/` automatically. Dynamic blocks won't render without this.
- **`--experimental-modules` flag** — required in build/start scripts for `viewScriptModule` in block.json. Check if stabilised in your @wordpress/scripts version.
- **Deprecations required** — when changing a static block's `save.js` output, you MUST add a deprecation to avoid "This block contains unexpected content" errors on existing posts.
- **SSH remote variable expansion** — use single quotes for the outer string when running `ssh hd '...'` so `$WP` expands on the server. Double quotes expand locally (to empty), silently breaking the deploy.
- **Tar deploy: delete before move** — `mv plugins/sgs-blocks $WP/plugins/` fails with "Directory not empty" if the target exists. Always `rm -rf $WP/plugins/sgs-blocks` first in the same SSH command, then `mv`.
- **WP-CLI inline PHP escaping** — `wp eval '...'` breaks on shell special chars (`!--`, `$b[0]`, heredocs, etc.). Reliable fallback: write to `/tmp/script.php` with `cat << 'PHPEOF'`, `scp` to server, then `wp eval-file ~/script.php`, then `rm`.
- **`parse_blocks()` is shallow** — only returns top-level blocks. Finding nested blocks (inside Columns, Groups, etc.) requires a recursive function that walks `$b['innerBlocks']` at every level.
- **Theme spec drift** — `specs/01-SGS-THEME.md` still shows DM Serif Display + DM Sans as default fonts. The actual `theme.json` uses Inter variable. The CLAUDE.md files are correct; the spec needs updating.

## External Services

- **N8N** (72.62.212.169) — all notifications via webhooks, not wp_mail()
- **Stripe** — payment processing for booking and forms
- **Google Calendar** — 2-way sync for booking (Phase 5)
- **ACF Pro** — kept for non-block custom fields, usage decreasing over time
- **Rank Math Free** — SEO, no reason to rebuild
