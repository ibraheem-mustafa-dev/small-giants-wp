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
├── specs/                    # Specification documents (00-06)
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

All components read from `theme.json` design tokens. Default values (Indus Foods):

```
--primary: #1A3A5C (navy)       --accent: #D4A843 (gold)
--primary-dark: #0F2640          --accent-light: #F5E6C4
--success: #2E7D4F (green)       --whatsapp: #25D366
--surface: #FFFFFF               --surface-alt: #F8F7F4
--text: #1E1E1E                  --text-muted: #555555
```

Fonts: DM Serif Display (headings) + DM Sans (body) — self-hosted WOFF2, no CDN.

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
- `02-SGS-BLOCKS.md` — All block specifications (22 blocks + form blocks)
- `03-SGS-BOOKING.md` — Booking system spec (phases 1-4)
- `04-SGS-FORMS.md` — Form system spec (built into sgs-blocks)
- `05-SGS-CLIENT-NOTES.md` — Visual annotation system spec
- `06-BUILD-ORDER.md` — Dependencies, phasing, testing strategy

## Non-Negotiables

- WCAG 2.2 AA accessible, mobile-first responsive (44px minimum touch targets)
- No jQuery — vanilla JS only for frontend
- All REST endpoints: nonces, capability checks, input sanitisation, prepared statements
- Progressive enhancement — blocks must render meaningful content without JS
- Performance budget: < 100KB CSS, < 50KB JS per page, green Core Web Vitals
- UK English in all code, comments, and user-facing text

## External Services

- **N8N** (72.62.212.169) — all notifications via webhooks, not wp_mail()
- **Stripe** — payment processing for booking and forms
- **Google Calendar** — 2-way sync for booking (Phase 5)
- **ACF Pro** — kept for non-block custom fields, usage decreasing over time
- **Rank Math Free** — SEO, no reason to rebuild
