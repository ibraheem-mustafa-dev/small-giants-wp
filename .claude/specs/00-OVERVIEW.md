# Small Giants Studio — WordPress Framework

## What This Is

A custom WordPress development framework built and maintained by Claude Code for Small Giants Studio. It replaces the Astra Pro + Spectra Pro + commercial plugin stack with purpose-built components that Claude can develop, deploy, debug, and iterate on autonomously across all client sites.

**This is not a generic WordPress framework.** It is built specifically for how Small Giants Studio operates: Claude as sole developer, N8N for automation, SFTP deployment to Hostinger, and a non-coder business owner who needs sites that perform well, look distinctive, and don't require manual plugin wrangling.

---

## Why We're Building This

### Problems with the current stack

1. **Spectra Pro is clunky and limiting** — settings buried in panels, bloated markup/CSS output, blocks that don't render as designed, responsive breakpoints that don't work properly on tablet/mobile, and generic-looking designs that make every site look like a template.
2. **Astra Pro causes PageSpeed issues** that can't be fixed without editing the theme itself. CSS/JS bloat from unused features loads on every page.
3. **Per-site licensing costs** — Astra Business Toolkit is a single-site licence that needs swapping between projects. Amelia, Fluent Forms, and other premium plugins multiply costs per client site.
4. **Plugin integration friction** — commercial plugins don't integrate well with each other, with APIs, or with Claude's development workflow. ACF Pro requires manual setup steps. Spectra fights against custom designs rather than enabling them.
5. **No autonomy for Claude** — the current stack requires human facilitation for licence activation, manual admin UI configuration, and fighting plugin limitations rather than building features.

### What the custom framework solves

- **Full control** — Claude built it, Claude knows every line, Claude can fix anything at the source.
- **Zero licensing costs** — deploy on unlimited sites with no per-site fees.
- **Performance by default** — clean markup, scoped CSS, no bloat from unused features.
- **Distinctive design** — non-modular, attention-grabbing features and effects that make sites stand out.
- **Autonomous workflow** — Claude can build, test, deploy, and iterate on client sites without human facilitation for plugin setup or configuration.
- **Cross-site improvements** — fixing a bug or adding a feature in the framework updates all sites.

---

## The Framework Components

| # | Component | Replaces | Type |
|---|---|---|---|
| 1 | **SGS Theme** | Astra Pro | WordPress block theme |
| 2 | **SGS Blocks** | Spectra Pro | WordPress plugin (custom Gutenberg blocks) |
| 3 | **SGS Booking** | WP Amelia Premium | WordPress plugin (appointment/event booking) |
| 4 | **SGS Forms** | Fluent Forms Pro / SureForms | Built into SGS Blocks (form block system) |
| 5 | **SGS Client Notes** | Atarim / ProjectHuddle | WordPress plugin (visual annotation system) |
| 6 | **SGS Pop-ups** | OptinMonster / Popup Maker | WordPress plugin (conversion pop-ups) |
| 7 | **SGS Chatbot** | Tidio / LiveChat / Crisp | WordPress plugin (live chat + AI assistant) |

### Kept as-is (not replaced)

| Tool | Why |
|---|---|
| **ACF Pro** (10 lifetime licences) | Still useful for non-block custom fields on custom post types. Usage decreases naturally as SGS Blocks handles more. Programmatic setup via `acf_add_local_field_group()`. |
| **Rank Math Free** | Unlimited sites, excellent schema builder, content analysis. No reason to rebuild. |
| **SureForms** | Bridge for existing sites while SGS Forms is built. Phase out over time. |

---

## Design Philosophy

### Per-site customisation via design tokens

The framework uses CSS custom properties (design tokens) defined in `theme.json` and overridden per site. Every component reads from these tokens — never hardcoded colours, fonts, or spacing.

```
Site A (Indus Foods):  --primary: #1A3A5C; --accent: #D4A843; --font-heading: 'DM Serif Display'
Site B (Dream Wedding): --primary: #2D1B4E; --accent: #C9A96E; --font-heading: 'Playfair Display'
Site C (Workwear Now):  --primary: #1B3D2F; --accent: #E87121; --font-heading: 'Montserrat'
```

Same blocks, same theme, completely different look.

### Progressive enhancement

Every block renders meaningful content without JavaScript. Interactive features (animations, sliders, accordions) enhance the base experience. Sites work on 2G connections and screen readers.

### Mobile-first responsive

All blocks designed mobile-first with three explicit breakpoints:
- Mobile: < 768px (single column, stacked, 44px minimum touch targets)
- Tablet: 768px–1024px (2-column where appropriate)
- Desktop: > 1024px (full layout)

No "it works on desktop but breaks on mobile" — mobile is the starting point.

### Performance budget

- **< 100KB CSS** total page load (vs ~300KB+ with Astra + Spectra)
- **< 50KB JS** for non-interactive pages (vs ~200KB+ with Spectra)
- **Core Web Vitals green** on every page (LCP < 2.5s, CLS < 0.1, INP < 200ms)
- **No render-blocking resources** — critical CSS inlined, everything else deferred

---

## Integration Architecture

```
┌─────────────────────────────────────────────────┐
│                  Client Site                      │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ SGS Theme │  │ SGS Blocks│  │ SGS Booking  │ │
│  │ (tokens,  │  │ (UI       │  │ (calendar,   │ │
│  │ templates,│  │ components│  │ scheduling,  │ │
│  │ global    │  │ + forms)  │  │ payments)    │ │
│  │ styles)   │  │           │  │              │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│        │              │               │          │
│        └──────────┬───┘               │          │
│                   │                   │          │
│           theme.json tokens      REST API        │
│                                       │          │
│  ┌──────────────┐  ┌─────────────────┘          │
│  │ SGS Client   │  │                             │
│  │ Notes        │  │  External Services:          │
│  │ (annotations)│  │  - Google Calendar API        │
│  └──────────────┘  │  - Stripe (payments)          │
│                    │  - N8N (notifications,         │
│  ┌──────────────┐  │    automation)                 │
│  │ Rank Math    │  │  - SMTP (email)               │
│  │ Free (SEO)   │  │                               │
│  └──────────────┘  └───────────────────────────────┘
│                                                    │
│  Optional:                                         │
│  ┌──────────────┐                                  │
│  │ ACF Pro      │ (for non-block custom fields)    │
│  └──────────────┘                                  │
└────────────────────────────────────────────────────┘
```

---

## Deployment Model

- **Source code:** Git repository (GitHub, one repo per component or monorepo — TBD)
- **Deployment:** SFTP to Hostinger via Claude Code
- **Local testing:** WordPress Playground or Local by Flywheel
- **Live testing:** Hostinger test site (lightsalmon-tarsier-683012.hostingersite.com)
- **Automation:** N8N workflows on VPS (72.62.212.169) for notifications, webhooks, scheduled tasks
- **Updates:** Claude deploys updates to all client sites via SFTP. Theme/plugin updates are code changes, not WordPress auto-updates.

---

## Naming Convention

All framework components use the `sgs-` prefix (Small Giants Studio):

- Theme: `sgs-theme`
- Blocks plugin: `sgs-blocks`
- Booking plugin: `sgs-booking`
- Client notes plugin: `sgs-client-notes`
- PHP namespace: `SGS\Theme`, `SGS\Blocks`, `SGS\Booking`, `SGS\ClientNotes`
- Text domain: `sgs-theme`, `sgs-blocks`, `sgs-booking`, `sgs-client-notes`
- CSS prefix: `.sgs-`
- Block namespace: `sgs/block-name`
- Hook prefix: `sgs_`

---

## Detailed Specs

Each component has its own spec document:

1. [SGS Theme](./01-SGS-THEME.md) — Custom block theme
2. [SGS Blocks](./02-SGS-BLOCKS.md) — Custom block library plugin
3. [SGS Booking](./03-SGS-BOOKING.md) — Appointment and event booking system
4. [SGS Forms](./04-SGS-FORMS.md) — Form system (integrated into SGS Blocks)
5. [SGS Client Notes](./05-SGS-CLIENT-NOTES.md) — Visual annotation and feedback system
6. [Build Order](./06-BUILD-ORDER.md) — Dependencies, sequence, and phasing
