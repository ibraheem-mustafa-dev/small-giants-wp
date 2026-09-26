---
doc_type: plan
spec_id: 04
covers: [Spec 04 Notification Architecture, FR-30-15, FR-43-4, sgs-client-notes notifications]
status: ready to build
created: 2026-09-26
---

# Plan: every SGS email goes through WordPress mail over the site's own SMTP

## Why

Bean chose (2026-09-26) one email route for everything a client site sends, instead of the N8N-only rule. Today:

| Sender | Route | Works? |
|---|---|---|
| WooCommerce sales emails | `wp_mail()` over PHP `mail()`, no SMTP | Unproven; Hostinger caps PHP `mail()` at 10 a minute and 100 a day and recommends SMTP |
| SGS forms, choice-flow email result (FR-43-4) | N8N via `Form_Processor::send_webhook` | No: no N8N branch handles them |
| Saved-item alerts, back in stock (FR-30-15) | N8N via `Sgs_Webhook::send`, workflow `AJzRBARFn8AqQlkg` | Yes (proven 2026-09-26) |
| Client notes (created, resolved) | its own N8N URLs (`sgs_client_notes_n8n_webhook_url`) | No workflow exists; the `sgs_client_notes_notification_email` option is saved but never used |
| Booking | not built | — |

Every client needs working SMTP for WooCommerce anyway, so every SGS email rides that same connection. N8N stays an optional extra: `Sgs_Webhook::send` keeps firing events when a site sets a URL, for automations (CRM rows, Slack), never for the email itself.

## Research (2026-09-26, sources in the commit that adds this plan)

- **SMTP per site: FluentSMTP (free, v2.3.0 released 2026-08-05).** Free tier has SMTP, Google Workspace and Microsoft 365 OAuth (Microsoft ends basic-auth SMTP for existing tenants in December 2026), email logs, a fallback connection and failure alerts. With the SMTP connection's `key_store` set to `wp_config`, it reads `FLUENTMAIL_SMTP_USERNAME` and `FLUENTMAIL_SMTP_PASSWORD` constants (source: `app/Services/Mailer/Providers/Smtp/Handler.php::setSettings`), so passwords never sit in the database. WP Mail SMTP: logs and Microsoft 365 are paid. Post SMTP: critical unauthenticated account-takeover CVE-2025-11833. Building our own: we would own OAuth refresh, logs and failover.
- **Shop emails: `WC_Email` subclasses** registered on `woocommerce_email_classes`, with classic PHP templates (HTML and plain), so they appear in WooCommerce > Settings > Emails beside the sales emails, where the client switches them on or off and edits subject and heading. Skip WooCommerce's block email editor for now (issue woocommerce/woocommerce#68972: product blocks render empty when sent from cron). WooCommerce 11.x has no core back-in-stock or price-drop email, so there is no overlap.
- **Other emails:** WordPress core has no HTML email template. When WooCommerce is active, reuse its email header, footer and `style_inline()` so every email looks alike; otherwise one inline-CSS SGS template. PECR: confirmations and owner notifications are service messages while they carry no promotional copy.
- **Deliverability:** SPF, DKIM and DMARC (`p=none` to start) on every client domain at onboarding; Hostinger adds SPF and DKIM on its own nameservers, DMARC is one manual TXT record, and a domain may hold only one SPF record.

## Decisions (Bean, 2026-09-26)

- **D1 SMTP tool:** FluentSMTP on every client site, set up by script.
- **D2 N8N email workflow ("SGS site events", `AJzRBARFn8AqQlkg`):** kept as a switched-off backup. When phase 3 sends the shop alerts through WordPress, deactivate the workflow (`POST /api/v1/workflows/AJzRBARFn8AqQlkg/deactivate`) so no email goes out twice; keep `plugins/sgs-blocks/scripts/n8n/` and describe the workflow in `.claude/dev-setup.md` §N8N as an inactive backup. `Sgs_Webhook::send` still fires events to any URL a site sets, for automations.
- **D3 sandybrown sender:** From `admin@smallgiantsstudio.co.uk`, which is an alias of the `ibraheem@smallgiantsstudio.co.uk` mailbox (Hostinger `mail_listAliasesV1`). Aliases cannot sign in: the SMTP login is `ibraheem@smallgiantsstudio.co.uk` with `SMTP_PASS_SGS` from `.claude/secrets/ai-agent-credentials-and-info/email.env` (proven by an SMTP login on 2026-09-26; the same file's `SMTP_USER_SGS=admin@…` is refused with 535). Hostinger lets a mailbox send as its own aliases; phase 1 proves that with a real send. This puts Bean's main mailbox password in the canary's wp-config; a client site uses its own mailbox.

## Contract

`SGS\Blocks\Mail\Sgs_Mailer::send( string $to, string $subject, string $heading, string $html_body, string $text_body, array $args = [] ): bool` wraps `wp_mail()`: HTML with a plain-text alternative (`phpmailer_init` sets `AltBody` for that one send), `Reply-To` from `$args['reply_to']` (`sanitize_email`, never a raw header string), wraps the body in the shared template, returns `wp_mail()`'s result. Every subject and address passes `sanitize_email` / strips CR and LF (header injection). One file per class, 300-line cap.

Template: `Sgs_Mail_Template::wrap( $heading, $html )` uses WooCommerce's `emails/email-header.php`, `email-footer.php` and `WC_Email::style_inline()` when WooCommerce is active, else `includes/mail/templates/email.php` (inline CSS; site name and logo from Site Info, colours from the theme's `text`, `surface` and `primary` presets, falling back to neutral values).

Recipient default for site-owner mail: the form's own recipient setting, else the Site Info email, else `admin_email`.

## Phases

| # | Phase | Files | Done when | Status |
|---|---|---|---|---|
| 1 | Per-site SMTP provisioning | `plugins/sgs-blocks/scripts/provision-site-mail.py` (installs FluentSMTP by WP-CLI, `wp config set` for the two constants, writes the `fluentmail-settings` option: SMTP host `smtp.hostinger.com` port 465, sender and name from Site Info, logs on, failure alert to the Site Info email; `--check` reports the state; sends a test to a named address); go-live checklist row; `.claude/dev-setup.md` section | On sandybrown the test email and a real WooCommerce order email arrive at Bean's address and appear in FluentSMTP's log; `--check` exits 1 on a site with no SMTP | open |
| 2 | Mailer and template | `includes/mail/class-sgs-mailer.php`, `class-sgs-mail-template.php`, `templates/email.php`, loader line, `tests/php/run-mailer-standalone.php` | Tests prove HTML plus text parts, reply-to, header-injection refusal (negative control), WooCommerce and non-WooCommerce template paths | open |
| 3 | Shop alerts as WooCommerce emails | `includes/wishlist/emails/class-email-saved-items-alert.php`, `class-email-back-in-stock.php`, `templates/emails/*.php` (HTML and plain), `Wishlist_Alerts_Scan::dispatch_alert` and `Stock_Notify_Dispatch::dispatch` call them (baselines still move only after a successful send; back in stock sends one email per subscriber), `Sgs_Webhook::send` stays as the optional event; `scripts/qa/fr30-15-alerts-live-proof.php` captures mail via `pre_wp_mail` instead of HTTP | Both emails listed in WooCommerce > Settings > Emails with working on/off; live proof green; a real alert of each type reaches Bean's inbox from sandybrown | open |
| 4 | Form and choice-flow emails | `src/blocks/form/block.json` (`notifyEmail`, `confirmationEmail` bool, `confirmationSubject`, `confirmationMessage`), form inspector panel, `Form_Processor` sends the owner notification (all fields, reply-to the submitter) and, when on, the confirmation to the submitted email field; FR-43-4 goes through the same path | A real sandybrown form sends both emails; blank `notifyEmail` falls back to Site Info; a newline in a submitted email is refused (negative control) | open |
| 5 | Client notes | `plugins/sgs-client-notes/includes/api/class-rest-notes.php::send_webhook` also mails `sgs_client_notes_notification_email` (via `Sgs_Mailer` when sgs-blocks is active, else plain `wp_mail`) | Creating and resolving a note on sandybrown emails the notification address | open |
| 6 | Rules and docs | project `CLAUDE.md` Non-negotiables line, `plugins/sgs-client-notes/CLAUDE.md`, `.claude/architecture.md`, Specs 04, 30 (FR-30-15), 43 (FR-43-4), 03 (booking notifications), `.claude/specs/go-live-checklist.md` IF-5, `.claude/dev-setup.md` §N8N (per D2) | No live doc says "never `wp_mail()`" or routes email through N8N; `lint-spec-drift.py` and the handoff preflight pass | open |

Order: 1 and 2 in parallel; 3, 4 and 5 after 2 (independent of each other); 6 last. Main thread holds the contract; phases 3 to 5 can go to one Sonnet subagent each once 2 has landed.

## Verification

Per code phase: fast gates (`python plugins/sgs-blocks/scripts/run-gates.py --tier fast`), the phase's standalone tests with a negative control, `build-deploy.py --target sandybrown --blocks-only`, then a real send checked in FluentSMTP's log and Bean's inbox. Emails are only ever sent to `sgs-qa-customer` or an address Bean names.
