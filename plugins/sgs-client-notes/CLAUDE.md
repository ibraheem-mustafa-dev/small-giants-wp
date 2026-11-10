# SGS Client Notes — Claude Code Instructions

## What This Is

A visual annotation and feedback system. Clients pin comments directly on their website pages. Replaces Atarim and ProjectHuddle with a self-hosted, zero-cost solution.

Full spec: `.claude/specs/05-SGS-CLIENT-NOTES.md` (plugin structure, tables, DOM anchoring strategy, roles and capabilities).

Tables: `sgs_client_notes` and `sgs_client_note_replies`. Pins anchor by CSS selector, then XPath plus text match, then a "Detached notes" panel; positions are stored as percentage offsets, with the viewport width recorded. Role `sgs_client` cannot reach wp-admin (except profile); `administrator` and `editor` get the note caps on activation.

## Key Rules

- Assets load ONLY for logged-in users with note capabilities: zero impact on public visitors.
- html2canvas loads on demand only when screenshot capture triggers.
- All REST endpoints require authentication (nonce + logged-in user).
- Clients see only their own notes; admins see all.
- File uploads (screenshots) are restricted to JPEG/PNG, max 5MB.
- Rate limiting: max 20 notes per hour per user.
- All input sanitised, all output escaped.
- Notification email: `class-notes-mailer.php::Notes_Mailer::notify()` sends to `sgs_client_notes_notification_email` on note created/resolved (via `Sgs_Mailer` when sgs-blocks is active, else plain `wp_mail()`); it sends nothing when that option is empty or invalid. `class-rest-notes.php::send_webhook` is an optional N8N automation event alongside it.

## Build & Deploy

No build step (pure PHP + vanilla JS). `build-deploy.py` does not cover this plugin; deploy with `python plugins/sgs-blocks/scripts/deploy-client-notes-quick.py --target <target>` (no dirty gate, no `.bak` rollback, no post-deploy verify; see its docstring).
