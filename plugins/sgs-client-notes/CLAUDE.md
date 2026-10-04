# SGS Client Notes — Claude Code Instructions

## What This Is

A visual annotation and feedback system. Clients pin comments directly on their website pages. Replaces Atarim and ProjectHuddle with a self-hosted, zero-cost solution.

Full spec: `.claude/specs/05-SGS-CLIENT-NOTES.md`

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
- `administrator` and `editor` get the note caps on activation; `administrator` also gets `sgs_manage_client_users`.

## Key Rules

- Assets loaded ONLY for logged-in users with note capabilities — zero impact on public visitors
- html2canvas loaded on-demand only when screenshot capture triggered
- All REST endpoints require authentication (nonce + logged-in user)
- Clients see only their own notes; admins see all
- File uploads (screenshots) restricted to JPEG/PNG, max 5MB
- Rate limiting: max 20 notes per hour per user
- All input sanitised, all output escaped
- Notifications: `class-notes-mailer.php::Notes_Mailer::notify()` emails `sgs_client_notes_notification_email` on note created/resolved (via `Sgs_Mailer` when sgs-blocks is active, else plain `wp_mail()`); sends nothing when that option is empty or invalid. `class-rest-notes.php::send_webhook` stays as an optional N8N automation event alongside it (no workflow exists for it yet)

## Build & Deploy

No npm build step — this plugin is pure PHP + vanilla JS. `build-deploy.py` does not cover this plugin (it only covers `sgs-blocks`/theme); deploy with `python plugins/sgs-blocks/scripts/deploy-client-notes-quick.py --target <target>` — a minimal standalone script (see its own docstring for what it does and does not do: no dirty-gate, no `.bak` rollback rotation, no post-deploy verify). A properly engineered third root inside `build-deploy.py` itself, matching its rollback/dirty-gate/self-test standard, is still open (Bean's call, 2026-09-27 — that script's safety architecture is real design work, not a quick patch, and the file is shared live infrastructure).
