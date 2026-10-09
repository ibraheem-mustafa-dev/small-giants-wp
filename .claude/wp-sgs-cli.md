# `wp sgs` CLI reference

The `wp sgs` namespace is the developer and automation command surface for SGS sites. It runs on the server over SSH
(`ssh hd`). Clients never use WP-CLI. Every command delegates to the same PHP helper classes the admin screens use; the
command classes hold no business logic. Verified against the source on 2026-10-09.

## Registration

All groups register only when `WP_CLI` is defined, so they cost nothing on a frontend request.

| Group | Registered in | Class | Commands |
|---|---|---|---|
| `sgs` | `plugins/sgs-blocks/sgs-blocks.php` | `Sgs_Cli_Commands` (`plugins/sgs-blocks/includes/class-sgs-cli-commands.php`) | `site-info`, `seed-template-parts`, `reset-template-parts`, `header-rules`, `footer-rules`, `migrations`, `seeding-arm` |
| `sgs header`, `sgs footer`, `sgs drawer` | `plugins/sgs-blocks/sgs-blocks.php` | `Sgs_Header_Footer_Cli_Commands` (`plugins/sgs-blocks/includes/class-sgs-header-footer-cli-commands.php`; the `seed-starter` body is `Sgs_Starter_Cli_Seeder` in `plugins/sgs-blocks/includes/class-sgs-starter-cli-seeder.php`) | `set-active`, `clear-active`, `list`, `seed-starter` |
| `sgs audit-colour-tokens` | `plugins/sgs-blocks/sgs-blocks.php` | `Sgs_Colour_Audit_Cli_Commands` (`plugins/sgs-blocks/includes/class-sgs-colour-audit-cli-commands.php`) | the command itself |
| `sgs media` | `plugins/sgs-blocks/sgs-blocks.php` | `Sgs_Media_Cli_Commands` (`plugins/sgs-blocks/includes/class-sgs-media-cli-commands.php`) | `measure-tone` |
| `sgs addon-prices` | `plugins/sgs-blocks/includes/addon-price-list/load.php` | `Addon_Price_List_CLI` (`plugins/sgs-blocks/includes/addon-price-list/class-addon-price-list-cli.php`) | `seed` |
| `sgs google-fonts` | `plugins/sgs-blocks/includes/class-font-collection.php` | `Google_Fonts_Cli` (`plugins/sgs-blocks/includes/class-google-fonts-cli.php`) | `sync`, `status` |

List the live registrations with `git grep -n "WP_CLI::add_command" -- plugins theme`.

## Capability gate

Every write command in the `Sgs_Cli_Commands` and `Sgs_Header_Footer_Cli_Commands` classes calls
`current_user_can( 'edit_theme_options' )`. WP-CLI runs anonymous unless you pass `--user=<id>`, so those commands error
without it (`--user=1` for the admin). Read-only commands need no capability: `site-info get`, `header-rules list`,
`footer-rules list`, `migrations status`, `header|footer|drawer list`, `audit-colour-tokens`. `media measure-tone`,
`addon-prices seed` and `google-fonts sync|status` carry no capability check of their own; run them only over SSH.
`Sgs_Site_Info::set_internal()` bypasses the gate for trusted internal callers (migrations, cron); the gate for
`site-info set` sits in the command.

## Command reference

### `wp sgs site-info`

The Site Info store is the `sgs_site_info` option (`plugins/sgs-blocks/includes/class-sgs-site-info.php`).

| Command | Capability | Behaviour |
|---|---|---|
| `site-info get <key>` | none | Prints the value; a missing key prints an empty string and exits 0. |
| `site-info set <key> <value> --user=<id>` | `edit_theme_options` | Writes one value; a reserved or invalid key is rejected with a warning. |
| `site-info update <json-file> --user=<id>` | `edit_theme_options` | Merges a JSON object from a file; unknown keys are skipped with a warning, existing keys overwritten. Errors: `File not readable`, `File does not contain a valid JSON object`. |
| `site-info reset --user=<id>` | `edit_theme_options` | Empties the store. Irreversible, no prompt. |

### `wp sgs seed-template-parts [--variation=<slug>] [--force] --user=<id>`

Needs `edit_theme_options` and an armed seeding guard (`seeding-arm`). Resolves the header and footer pattern slugs for a
client snapshot (`Sgs_Template_Part_Seeder::resolve_pattern_slugs()`; the manifest's `settings.custom.sgs.headerPattern`
and `footerPattern`, falling back to `sgs/framework-header-default` and `sgs/framework-footer-default`) and reports each
pattern it finds. With no `--variation` it resolves the active one from `wp_global_styles`. It writes no template-part
post: to create a header or footer layout from a pattern use `wp sgs header|footer|drawer seed-starter`. Errors:
`Seeding is not armed`, `No active client snapshot found`, `Pattern '...' not registered`.

### `wp sgs reset-template-parts [--header] [--footer] --user=<id>`

`edit_theme_options`. Resets the header and/or footer template parts through `Sgs_Template_Part_Resetter::reset()`;
neither flag resets both. Error: `Reset failed` (check the PHP error log).

### `wp sgs header-rules` and `wp sgs footer-rules`: `list | add <json> | remove <rule-id>`

Conditional header and footer rules (`Sgs_Header_Rules`, `Sgs_Footer_Rules`). `list` is read-only and prints JSON. `add`
and `remove` need `edit_theme_options`. `add` takes a JSON object with at least `pattern_slug` (and optionally
`priority`); `remove` takes a rule id such as `rule_abc12345`. The immutable default rule cannot be removed.

```bash
wp sgs header-rules add '{"pattern_slug":"sgs/framework-header-default","priority":5}' --user=1
wp sgs footer-rules remove rule_xyz99999 --user=1
```

### `wp sgs seeding-arm --user=<id>`

`edit_theme_options`. Arms the seeding safety guard immediately (`Sgs_Safety_Guard::arm( 0 )`), which lets
`seed-template-parts` run without waiting for the upgrade cooldown.

### `wp sgs migrations status` and `migrations run [--target=<slug>] --user=<id>`

`status` is read-only: installed version, completed and pending migrations (the file names under
`plugins/sgs-blocks/includes/migrations/`). `run` needs `edit_theme_options`, runs all pending migrations or up to the
`--target` slug, and skips any already run. A migration exception surfaces as the command error.

### `wp sgs header|footer|drawer <set-active | clear-active | list | seed-starter>`

One class registered three times, each instance bound to an area:

| Area | Post type | Active-pointer option |
|---|---|---|
| `header` | `sgs_header` | `sgs_active_header_cpt_id` |
| `footer` | `sgs_footer` | `sgs_active_footer_cpt_id` |
| `drawer` | `sgs_drawer` | `sgs_active_drawer_cpt_id` |

Each pointer is one global site option: exactly one header, one footer and one drawer is active per site. Reads and
writes go through `Sgs_Active_Layout` (`plugins/sgs-blocks/includes/class-sgs-active-layout.php`), never the options
directly.

- `set-active <post-id>`: `edit_theme_options`. `Sgs_Active_Layout::set_active()` rejects a missing post, a post of the
  wrong type and an unpublished post.
- `clear-active`: `edit_theme_options`. Clears the pointer so the framework default serves; the old post is untouched and
  can be re-activated.
- `list [--format=<table|csv|json|yaml|count>]`: read-only. Every layout post of the area's type in any status, with
  columns `ID`, `Title`, `Status`, `Active`. `Active` reads the raw stored pointer, so a trashed layout still shows as
  active, which shows why it stopped rendering.
- `seed-starter <pattern-slug>`: `edit_theme_options`. Creates a **draft** post of the area's type from a registered
  block pattern and does not activate it (publish, then `set-active`). The pattern must be registered in the CLI context;
  theme patterns carrying `Post Types: sgs_header|sgs_footer|sgs_drawer` register automatically.
- `seed-starter --all`: `edit_theme_options`, no slug (the two are mutually exclusive). Creates every framework look of
  the area that has no post yet, as **published** posts that are not made active, and prints `Created N ... skipped M`.
  Each post carries the private meta `_sgs_starter_slug`; a look is skipped when any post of the type, trash included,
  already carries its slug, so re-running never duplicates a look or overwrites an edited copy. The blank
  `sgs/<area>-scratch` starter and the area's default pattern are never seeded as looks. Only areas in
  `Sgs_Starter_Library_Seeder::LIBRARY_AREAS` (`plugins/sgs-blocks/includes/class-sgs-starter-library-seeder.php`) have a
  library, and `--all` on another area errors. The same seeding runs on plugin activation and from a versioned migration.

Errors: `Usage: wp sgs <area> set-active <post-id>`, `Pattern '<slug>' is not registered in this CLI context` (wrong slug
or the theme is not active), and the `set_active()` error text.

### `wp sgs audit-colour-tokens [--post_type=<types>]`

Read-only discovery of orphaned colour-token slugs: a colour attribute whose stored slug is no longer in the live palette
(for example after a Site Editor palette entry is renamed or deleted). `sgs_colour_value()` falls back to `currentColor`
so an orphan never renders invisible, but nothing else surfaces the drift; run this after a palette edit. It reads
the live palette from `wp_get_global_settings( [ 'color', 'palette' ] )`, parses each post's blocks recursively and checks
the attributes in `Sgs_Colour_Audit_Cli_Commands::COLOUR_ATTRIBUTES_BY_BLOCK` (a generated snapshot of the
`block_attributes` table; the class docblock holds the regeneration query). `--post_type` is a comma-separated list
(default `post,page`); statuses scanned are `publish`, `draft`, `pending`, `future`, `private`. Output is a table of
`post_id`, `title`, `edit_url`, `block_slug`, `attr_name`, `slug`, or `Success: No orphaned colour-token slugs found.`

### `wp sgs media measure-tone [--force]`

Backfills `_sgs_top_tone` (`dark` or `light`) on image attachments: the mean luminance of the top 20% of each image,
measured on a small downscaled copy by `plugins/sgs-blocks/includes/media-top-tone.php` (new uploads get the same measure
from its `wp_generate_attachment_metadata` filter). `sgs_surface_tone()` reads it so a photo section tells a see-through
header and the shadow logic whether it reads light or dark. Without `--force`, attachments that already carry the meta
are skipped. An unreadable file or a server with no image library counts as failed. It changes the tone class, and so
the shadows, of existing photo sections, so run it on a client site only when asked.

### `wp sgs addon-prices seed <file.json>`

Replaces the site-wide add-on price list from a JSON file, through the same normaliser the settings page uses
(`sgs_addon_price_list_normalise()`), so a seed file cannot bypass the admin form's sanitisation. Two shapes: a bare list
of groups `[ { "key", "label", "options": [ { "key", "label", "short", "price" } ] } ]` (an option's `short` falls back
to its `label`), or an object `{ "groups": [...], "summary": { "leadWithAddons", "leadWithoutAddons", "attributeLabels",
"sizeBand" } }` that also seeds the cart line summary wording. Errors: `File not readable`, `Invalid JSON`.

### `wp sgs google-fonts sync | status`

`sync` downloads every `google: true` font family in the active `theme.json` that has no local face, now instead of
waiting for cron; it errors if the `sgs_google_fonts_self_host` filter has turned self-hosting off, and reports each
family or its failure. `status` lists installed and failed self-hosted families.

## Cheatsheet

```bash
# Site Info
wp sgs site-info get <key>
wp sgs site-info set <key> <value> --user=1
wp sgs site-info update /tmp/data.json --user=1
wp sgs site-info reset --user=1

# Template parts
wp sgs seeding-arm --user=1
wp sgs seed-template-parts [--variation=<slug>] [--force] --user=1
wp sgs reset-template-parts [--header] [--footer] --user=1

# Header / footer / drawer lifecycle
wp sgs header|footer|drawer list [--format=json]
wp sgs header|footer|drawer seed-starter <pattern-slug> --user=1
wp sgs drawer seed-starter --all --user=1
wp sgs header|footer|drawer set-active <post-id> --user=1
wp sgs header|footer|drawer clear-active --user=1

# Conditional rules
wp sgs header-rules list | add '<json>' --user=1 | remove <rule-id> --user=1
wp sgs footer-rules list | add '<json>' --user=1 | remove <rule-id> --user=1

# Migrations
wp sgs migrations status
wp sgs migrations run [--target=<slug>] --user=1

# Diagnostics and data
wp sgs audit-colour-tokens [--post_type=<types>]
wp sgs media measure-tone [--force]
wp sgs addon-prices seed <file.json>
wp sgs google-fonts sync
wp sgs google-fonts status
```

## Related

- Per-client branding is deployed with `plugins/sgs-blocks/scripts/push-theme-snapshot.py` (Spec 32 §13.2), not with `wp sgs`.
- Framework facts are read with `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` (`/sgs-db`).
- Build and deploy are `.claude/dev-setup.md` and `plugins/sgs-blocks/scripts/build-deploy.py`.
- Functional requirements for these commands: Spec 37 FR-37-30 (header, footer and drawer lifecycle), FR-37-7 and
  FR-37-8 (seeding), FR-37-20 (conditional rules), FR-37-25 (reset); Spec 43 FR-43-17 (add-on price seed).
- The `wp-wpcli-and-ops` skill documents WP-CLI work in this project.
