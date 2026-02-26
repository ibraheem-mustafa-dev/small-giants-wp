# SGS Client Notes — Claude Code Instructions

## What This Is

A visual annotation and feedback system. Clients pin comments directly on their website pages. Replaces Atarim and ProjectHuddle with a self-hosted, zero-cost solution.

Full spec: `specs/05-SGS-CLIENT-NOTES.md`

## Plugin Structure

```
sgs-client-notes/
├── sgs-client-notes.php          # Plugin bootstrap
├── uninstall.php                 # Clean removal
├── includes/
│   ├── class-sgs-client-notes.php    # Main plugin class
│   ├── class-installer.php           # Database tables
│   ├── class-roles.php               # sgs_client role + capabilities
│   ├── api/                          # REST endpoints (notes, replies)
│   ├── admin/                        # Notes management + dashboard widget
│   └── frontend/                     # Asset loader + screenshot processing
├── assets/
│   ├── js/                           # annotation-mode, comment-panel, pin-renderer, screenshot
│   ├── css/                          # Frontend overlay/pin styles + admin styles
│   └── vendor/html2canvas.min.js     # Screenshot capture (~40KB, loaded on-demand only)
└── templates/email/                  # N8N notification templates
```

## Database Tables

- `sgs_client_notes` — notes with CSS selector, XPath, offset coordinates, viewport width, priority, status, screenshot
- `sgs_client_note_replies` — threaded replies

## DOM Anchoring Strategy

The biggest technical challenge. Pins must survive page content changes.

1. **Primary:** CSS selector (ID > nth-child path > data attributes)
2. **Fallback:** XPath + content matching (first 255 chars of element text)
3. **Last resort:** "Detached notes" panel at bottom of page

Positions stored as percentage offsets (not pixels). Viewport width recorded for responsive context.

## User Roles

- `sgs_client` — custom role with `read`, `sgs_create_notes`, `sgs_view_own_notes`. Cannot access wp-admin (except profile).
- `administrator` gets `sgs_manage_notes` + `sgs_manage_client_users` on activation.

## Key Rules

- Assets loaded ONLY for logged-in users with note capabilities — zero impact on public visitors
- html2canvas loaded on-demand only when screenshot capture triggered
- All REST endpoints require authentication (nonce + logged-in user)
- Clients see only their own notes; admins see all
- File uploads (screenshots) restricted to JPEG/PNG, max 5MB
- Rate limiting: max 20 notes per hour per user
- All input sanitised, all output escaped
- Notifications via N8N webhooks (not wp_mail)

## Build & Deploy

No npm build step — this plugin is pure PHP + vanilla JS.

```bash
# Deploy plugin files (run from repo root)
scp -r plugins/sgs-client-notes/sgs-client-notes.php plugins/sgs-client-notes/uninstall.php plugins/sgs-client-notes/includes plugins/sgs-client-notes/assets plugins/sgs-client-notes/templates hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-client-notes/

# Clear LiteSpeed cache (wp litespeed-purge is broken on this host)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# Reset PHP OPcache after deploying PHP files (CLI reset is a SEPARATE pool — must use HTTP)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

## Build Phase

This is **Phase 3** — independent of SGS Blocks. Can be built in parallel with Phase 2 (Forms Advanced) once the theme exists. See `specs/06-BUILD-ORDER.md`.
