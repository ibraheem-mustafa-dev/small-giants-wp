---
paths:
  - "plugins/sgs-blocks/includes/trustpilot/**"
  - "plugins/sgs-blocks/includes/class-font-collection.php"
  - "plugins/sgs-blocks/src/blocks/google-reviews/**"
  - "plugins/sgs-blocks/src/blocks/trustpilot-reviews/**"
---

# Backend integrations

| Integration | Settings page | Option key (read by) | Auto-sync |
|---|---|---|---|
| Google Reviews | Settings > SGS Google Reviews | `sgs_google_reviews_settings` (sgs/google-reviews block) | Cache TTL (1-168h transient) |
| Trustpilot Sync | Settings > SGS Trustpilot Sync | `sgs_trustpilot_data` (sgs/trustpilot-reviews block, `dataSource: synced`) | WP-cron `sgs_trustpilot_sync_event` weekly/daily |
| Font Library Collection | Site Editor > Styles > Typography > Manage fonts | n/a — `wp_register_font_collection( 'sgs-google-fonts' )` on init | Manifest fetched on modal open only |

**Font Library Collection.** `includes/class-font-collection.php`
(`SGS\Blocks\Font_Collection`) — see its own docblock for the registration and zero-frontend-cost
mechanism. Critical constraint: do NOT add fonts from the collection to `theme.json`
`settings.typography.fontFamilies` to make them "available" — WordPress enqueues every entry in
`fontFamilies` on every page (WP Core issue #39332). The collection is the available-fonts
catalogue; theme.json is the active-fonts list. Re-build the manifest:
`python plugins/sgs-blocks/scripts/build-font-collection.py` (idempotent; `--self-test` validates).

**Trustpilot Sync.** `includes/trustpilot/` — see `class-trustpilot-sync.php`'s own docblock for
the one-option/one-writer/one-reader shape. The Browserless `/content` REST endpoint uses
`?token=<key>` auth (NOT `Authorization: Bearer` — that returns HTTP 500 on this endpoint). Key is
encrypted AES-256-CBC at rest, keyed off `wp_salt('auth')`. JSON-LD parser harvests standalone
`Review` entities from `@graph` (Trustpilot's reference pattern — `LocalBusiness.review[]` holds
`@id` pointers, not inline entities). Activity log (last 5 attempts) + `last_sync_status` badge on
the settings page is the operator failure surface — no Telegram/n8n side channel.
