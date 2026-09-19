---
doc_type: spec
spec_id: 19
spec_version: 0.3
project: small-giants-wp
title: SGS WP-CLI Command Reference — `wp sgs` Namespace
status: active
authors: Bean + Claude
implements: Spec 37 FR-37-30
implementation_file: plugins/sgs-blocks/includes/class-sgs-cli-commands.php
references:
  - .claude/specs/37-HEADER-FOOTER-BUILDER.md (parent spec)
  - plugins/sgs-blocks/includes/class-sgs-cli-commands.php
  - plugins/sgs-blocks/includes/class-sgs-header-footer-cli-commands.php
  - plugins/sgs-blocks/includes/class-sgs-colour-audit-cli-commands.php
  - plugins/sgs-blocks/includes/class-sgs-active-layout.php
  - plugins/sgs-blocks/includes/class-sgs-site-info.php
  - plugins/sgs-blocks/includes/class-sgs-template-part-seeder.php
  - plugins/sgs-blocks/includes/class-sgs-template-part-resetter.php
  - plugins/sgs-blocks/includes/class-sgs-header-rules.php
  - plugins/sgs-blocks/includes/class-sgs-footer-rules.php
  - plugins/sgs-blocks/includes/class-sgs-migrations.php
  - plugins/sgs-blocks/includes/class-sgs-safety-guard.php
cross_references:
  - wp-wpcli-and-ops skill (SKILL.md) — documents this command surface
  - .claude/specs/37-HEADER-FOOTER-BUILDER.md FR-37-30
---

# Spec 19 — `wp sgs` Command Reference

## 1. Overview

The `wp sgs` namespace is the developer and pipeline command surface for SGS sites
(Spec 37 FR-37-30). Every command is a thin delegation to the same PHP helper classes the
admin handlers use — no business logic lives in the command classes themselves.

Three command groups:

| Group | Class | Commands |
|---|---|---|
| Site Info, template parts, rules, migrations | `Sgs_Cli_Commands` | `site-info`, `seed-template-parts`, `reset-template-parts`, `header-rules`, `footer-rules`, `seeding-arm`, `migrations` |
| Header / footer / drawer lifecycle | `Sgs_Header_Footer_Cli_Commands` | `header`, `footer`, `drawer` — each with `set-active`, `clear-active`, `list`, `seed-starter` |
| Colour-token audit | `Sgs_Colour_Audit_Cli_Commands` | `audit-colour-tokens` |

**Audience:** developers and Claude Code automation. Clients never interact with WP-CLI.

## 2. Registration

Commands are registered in `sgs-blocks.php` inside a `WP_CLI` conditional, so they cost
nothing on the frontend:

```php
if ( defined( 'WP_CLI' ) && WP_CLI ) {
    \WP_CLI::add_command( 'sgs', Sgs_Cli_Commands::class );
    \WP_CLI::add_command( 'sgs header', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_HEADER ) );
    \WP_CLI::add_command( 'sgs footer', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_FOOTER ) );
    \WP_CLI::add_command( 'sgs drawer', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_DRAWER ) );
    \WP_CLI::add_command( 'sgs audit-colour-tokens', Sgs_Colour_Audit_Cli_Commands::class );
}
```

## 3. Capability gate

Every write command internally calls `current_user_can( 'edit_theme_options' )`. Without
`--user=<id>`, WP-CLI runs as an anonymous context and write commands will error.

`Sgs_Site_Info::set_internal()` bypasses the gate for trusted contexts (migrations, cron,
CLI commands themselves) — the gate is at the `site-info set` command level, not inside
the helper.

Read-only commands (`site-info get`, `header-rules list`, `footer-rules list`,
`migrations status`, `header|footer|drawer list`, `audit-colour-tokens`) carry no
capability requirement.

## 4. Command reference

---

### 4.1 `wp sgs site-info get <key>`

**Capability:** none (read-only)
**Delegates to:** `Sgs_Site_Info::get()`

Reads a single value from the central Site Info store (`wp_options['sgs_site_info']`).

```bash
# Read the business phone number
wp sgs site-info get phone
# Output: +44 121 000 0000

# Read a missing key — returns empty string, exit 0
wp sgs site-info get nonexistent_key
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `Usage: wp sgs site-info get <key>` | Missing positional argument | Add the key name |

---

### 4.2 `wp sgs site-info set <key> <value> --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Site_Info::set_internal()`

Writes a single value. Reserved or invalid key names are rejected with a warning.

```bash
wp sgs site-info set phone "+44 121 000 0000" --user=1
# Output: Success: 'phone' updated.

wp sgs site-info set email "hello@example.com" --user=1
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `edit_theme_options capability required` | No `--user` passed or user lacks the cap | Pass `--user=1` (admin) |
| `Failed to set 'X' — key may be reserved or invalid` | Key rejected by `set_internal()` | Check allowed keys in `Sgs_Site_Info` |

---

### 4.3 `wp sgs site-info update <json-file> --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Site_Info::set_internal()` per key

Bulk-merges a JSON object from a file into the Site Info store. Unknown keys are skipped
with a warning; existing keys are overwritten.

```bash
# Create a data file
cat > /tmp/site-data.json << 'EOF'
{
  "phone": "+44 121 000 0000",
  "email": "hello@example.com",
  "address": "123 High Street, Birmingham"
}
EOF

wp sgs site-info update /tmp/site-data.json --user=1
# Output: Success: 3 value(s) updated.
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `File not readable: /tmp/x.json` | Path doesn't exist or wrong permissions | Check the file path |
| `File does not contain a valid JSON object` | Malformed JSON | Run `python -m json.tool /tmp/x.json` to validate |

---

### 4.4 `wp sgs site-info reset --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Site_Info::reset()`

Empties the entire Site Info store. Irreversible — no confirmation prompt.

```bash
wp sgs site-info reset --user=1
# Output: Success: Site Info store cleared.
```

---

### 4.5 `wp sgs seed-template-parts [--variation=<slug>] [--force] --user=<id>`

**Capability:** `edit_theme_options` + seeding guard must be armed (see §4.11)
**Delegates to:** `Sgs_Template_Part_Seeder::resolve_pattern_slugs()` + `get_pattern_content()`

Resolves the header and footer pattern slugs for a variation and reports each pattern it
finds. The slugs come from the variation manifest's `settings.custom.sgs.headerPattern` /
`footerPattern` keys; a missing key falls back to the seeder's default header and footer
patterns (`sgs/framework-header-default`, `sgs/framework-footer-default`). When
`--variation` is omitted the command resolves the currently active variation from the
site's `wp_global_styles` post. A pattern that is not registered is skipped with a warning.

The command does not write a `wp_template_part` post. To create a header or footer layout
from a pattern, use `wp sgs header|footer|drawer seed-starter` (§4.14).

```bash
# Seed from the currently active variation
wp sgs seed-template-parts --user=1

# Seed from a specific variation
wp sgs seed-template-parts --variation=mamas-munches --user=1
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `Seeding is not armed` | Safety guard not triggered | Run `wp sgs seeding-arm --user=1` first |
| `No active style variation found. Activate a variation first, or pass --variation=<slug>.` | No `--variation` passed and none resolves from `wp_global_styles` | Pass `--variation=<slug>` |
| `Pattern 'sgs/...' not registered — skipping header` | Pattern is not registered for this variation | Run `/sgs-update` to regenerate patterns, or register the pattern |

---

### 4.6 `wp sgs reset-template-parts [--header] [--footer] --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Template_Part_Resetter::reset()`

Resets header and/or footer template parts. Mirrors the *SGS Admin → Reset Header/Footer*
page (Spec 37 FR-37-25). When neither flag is given, both are reset.

```bash
# Reset both
wp sgs reset-template-parts --user=1

# Reset header only
wp sgs reset-template-parts --header --user=1

# Reset footer only
wp sgs reset-template-parts --footer --user=1
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `Reset failed` | No active variation or DB write error | Check `WP_DEBUG` log for underlying PHP error |

---

### 4.7 `wp sgs header-rules list`

**Capability:** none (read-only)
**Delegates to:** `Sgs_Header_Rules::list_rules()`

Lists all conditional header rules as a pretty-printed JSON array.

```bash
wp sgs header-rules list
# Output: [{"id":"rule_immutable_default","pattern_slug":"sgs/framework-header-default",...}]
```

---

### 4.8 `wp sgs header-rules add <json> --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Header_Rules::add_rule()`

Adds a conditional header rule. The JSON argument must contain `pattern_slug`. Optional
fields: `priority` (int, clamped to 1–9998, default 10) and `conditions` (array of
condition objects; a `url_match` condition value is validated by the ReDoS guard). The rule
is stored with exactly `id`, `priority`, `pattern_slug` and `conditions`; any other key in
the JSON — including `behaviour` — is not stored.

```bash
wp sgs header-rules add '{"pattern_slug":"sgs/framework-header-centred","priority":5}' --user=1
# Output: Success: Rule added with ID: rule_abc12345
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `Argument must be a valid JSON object` | Malformed JSON or wrong quote style | Use single quotes around JSON on the CLI |
| WP_Error message from `add_rule()` | Missing pattern slug, non-object condition, or a `url_match` that fails the ReDoS guard | Fix the payload; list existing rules with `wp sgs header-rules list` |

---

### 4.9 `wp sgs header-rules remove <rule-id> --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Header_Rules::remove_rule()`

Removes a rule by its ID. The immutable default rule cannot be removed.

```bash
wp sgs header-rules remove rule_abc12345 --user=1
# Output: Success: Rule 'rule_abc12345' removed.
```

---

### 4.10 `wp sgs footer-rules list | add | remove`

**Capability / delegation:** same as §4.7–4.9 but targeting `Sgs_Footer_Rules`.

```bash
wp sgs footer-rules list
wp sgs footer-rules add '{"pattern_slug":"sgs/framework-footer-compact","priority":5}' --user=1
wp sgs footer-rules remove rule_xyz99999 --user=1
```

---

### 4.11 `wp sgs seeding-arm --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Safety_Guard::arm( 0 )`

Arms the seeding safety guard immediately (zero-second delay), which lets
`wp sgs seed-template-parts` run. The guard otherwise requires an upgrade cooldown to
elapse before seeding is permitted.

```bash
wp sgs seeding-arm --user=1
# Output: Success: Seeding guard armed. The seeder will fire on the next style-variation save.
```

Run this before `wp sgs seed-template-parts` when the cooldown has not yet elapsed.

---

### 4.12 `wp sgs migrations status`

**Capability:** none (read-only)
**Delegates to:** `Sgs_Migrations::list_completed()` + `list_pending()`

Prints the installed framework version plus completed and pending migrations. Migration
slugs are the file names under `plugins/sgs-blocks/includes/migrations/`.

```bash
wp sgs migrations status
# Output:
# Installed version : <version>
#
# Completed (<n>):
#   [x] <migration-slug>
#
# Pending (0):
# Success: All migrations up to date.
```

---

### 4.13 `wp sgs migrations run [--target=<version>] --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Migrations::run()`

Runs all pending migrations, or up to a specified target migration slug when `--target` is
passed. Migrations are idempotent — a migration that has already run is skipped.

```bash
# Run all pending
wp sgs migrations run --user=1

# Run up to a specific migration
wp sgs migrations run --target=<migration-slug> --user=1
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| RuntimeException message from `run()` | A migration raised an exception | Check `WP_DEBUG` log; fix the migration or roll back manually |

---

### 4.14 `wp sgs header|footer|drawer <set-active | clear-active | list | seed-starter>`

**Class:** `Sgs_Header_Footer_Cli_Commands` — one class, registered three times, each
instance bound to an area token (`header`, `footer`, `drawer`). The three command trees
behave identically; only the post type and active-pointer option differ.

| Area | Post type | Active-pointer option |
|---|---|---|
| `header` | `sgs_header` | `sgs_active_header_cpt_id` |
| `footer` | `sgs_footer` | `sgs_active_footer_cpt_id` |
| `drawer` | `sgs_drawer` | `sgs_active_drawer_cpt_id` |

Each active pointer is a single global site option: exactly one header, one footer and one
drawer is active per WordPress site. Pointer reads and writes always go through
`Sgs_Active_Layout`; the command class never touches the options directly.

**`set-active <post-id>`** — capability `edit_theme_options`. Makes the post the active
layout for the area. `Sgs_Active_Layout::set_active()` rejects a non-existent post, a post
of the wrong post type, and an unpublished post.

**`clear-active`** — capability `edit_theme_options`. Clears the pointer so the immutable
framework default serves. The previously active post is left untouched and can be
re-activated.

**`list [--format=<table|csv|json|yaml|count>]`** — read-only. Lists every layout post of
the area's type (any status) with columns `ID`, `Title`, `Status`, `Active`. The `Active`
column reads the raw stored pointer, so a layout that has since been trashed is still
marked active — the operator sees why it stopped rendering.

**`seed-starter <pattern-slug>`** — capability `edit_theme_options`. Creates a new
**draft** post of the area's type from a registered block pattern. It does not activate
the post: publish it, then run `set-active`. The pattern must already be registered in the
CLI context (theme patterns carrying `Post Types: sgs_header|sgs_footer|sgs_drawer`
register automatically).

```bash
wp sgs header list
wp sgs header seed-starter sgs/framework-header-centred --user=1
wp sgs header set-active 42 --user=1
wp sgs header clear-active --user=1

wp sgs footer list --format=json
wp sgs footer seed-starter sgs/framework-footer-compact --user=1
wp sgs footer set-active 51 --user=1

wp sgs drawer list
wp sgs drawer seed-starter sgs/framework-drawer-default --user=1
wp sgs drawer set-active 60 --user=1
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `edit_theme_options capability required` | No `--user` passed | Pass `--user=1` |
| `Usage: wp sgs <area> set-active <post-id>` | Missing or non-numeric post ID | Pass the numeric post ID from `list` |
| `Pattern '<slug>' is not registered in this CLI context` | Wrong slug, or the theme is not active | Check the slug against the theme's `patterns/` headers |
| Error from `set_active()` | Post missing, wrong post type, or not published | Publish the post, or pick a post of the right type |

---

### 4.15 `wp sgs audit-colour-tokens [--post_type=<types>]`

**Capability:** none (read-only diagnostic)
**Class:** `Sgs_Colour_Audit_Cli_Commands`

Finds orphaned colour-token slugs: a colour-typed block attribute whose stored value is a
design-token slug that is no longer in the site's live palette (for example after a Site
Editor palette entry is renamed or deleted). `sgs_colour_value()` falls back to
`currentColor` so an orphaned slug never renders invisible, but nothing else surfaces the
drift — this command is the discovery half. Run it on demand, for example straight after a
palette edit; it is never a render-time gate.

The command reads the live palette from `wp_get_global_settings( [ 'color', 'palette' ] )`
across every origin, parses each post's block content recursively, and checks every
colour attribute listed in the class's `COLOUR_ATTRIBUTES_BY_BLOCK` map. That map is a
generated snapshot of the `block_attributes` table (`css_property LIKE '%color%'`); the
class docblock carries the regeneration query.

`--post_type` takes a comma-separated list and defaults to `post,page`. Posts in `publish`,
`draft`, `pending`, `future` and `private` status are scanned.

```bash
wp sgs audit-colour-tokens
wp sgs audit-colour-tokens --post_type=page
# Output: table of post_id, title, edit_url, block_slug, attr_name, slug
```

Zero orphans prints `Success: No orphaned colour-token slugs found.`; otherwise it prints
the table and a warning with the count.

---

## 5. Quick-reference cheatsheet

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

# Header / footer / drawer lifecycle (CPT-backed layouts)
wp sgs header|footer|drawer list [--format=json]
wp sgs header|footer|drawer seed-starter <pattern-slug> --user=1
wp sgs header|footer|drawer set-active <post-id> --user=1
wp sgs header|footer|drawer clear-active --user=1

# Conditional rules
wp sgs header-rules list
wp sgs header-rules add '<json>' --user=1
wp sgs header-rules remove <rule-id> --user=1
wp sgs footer-rules list
wp sgs footer-rules add '<json>' --user=1
wp sgs footer-rules remove <rule-id> --user=1

# Migrations
wp sgs migrations status
wp sgs migrations run [--target=<slug>] --user=1

# Diagnostics
wp sgs audit-colour-tokens [--post_type=<types>]
```

Per-site branding is deployed with `push-theme-snapshot.py` (§7), not with `wp sgs`.

## 6. Cross-references

- **Spec 37 FR-37-30** — the functional requirement that mandates this command surface
- **`plugins/sgs-blocks/includes/class-sgs-cli-commands.php`**, **`class-sgs-header-footer-cli-commands.php`**, **`class-sgs-colour-audit-cli-commands.php`** — the implementations
- **`wp-wpcli-and-ops` skill (SKILL.md)** — documents this surface; invoke it for any WP-CLI work in this project
- **Spec 37** (FR-37-20 conditional rules, FR-37-25 reset, FR-37-7/FR-37-8 seeding) — the `seed-template-parts`, `reset-template-parts`, `header-rules` and `footer-rules` commands mirror the admin UI described there

## 7. Adjacent CLI scripts (non-wp-sgs)

These Python scripts are developer and pipeline tools that operate on dev-machine or
server artefacts outside the WordPress runtime. They are NOT `wp sgs` subcommands.

### `push-theme-snapshot.py`

Deploys a local per-client `sites/<client>/theme-snapshot.json` (a full `theme.json`) to
one site: over SSH it overwrites `wp-content/themes/sgs-theme/theme.json`, and it writes
the snapshot's `styles` and `settings` to that site's live `wp_global_styles` post through
the WP REST API. Both layers are written because the Site Editor user layer would
otherwise override the on-disk file for every property it already defines.

```bash
# Diff only — prints the diff and exits, pushes nothing
python plugins/sgs-blocks/scripts/push-theme-snapshot.py \
  --client mamas-munches \
  --target u945238940@141.136.39.73 \
  --target-domain sandybrown-nightingale-600381.hostingersite.com \
  --no-push

# Push, skipping the interactive confirmation
python plugins/sgs-blocks/scripts/push-theme-snapshot.py \
  --client mamas-munches \
  --target u945238940@141.136.39.73 \
  --target-domain sandybrown-nightingale-600381.hostingersite.com \
  --yes

# Restore a backup taken by an earlier push
python plugins/sgs-blocks/scripts/push-theme-snapshot.py \
  --client mamas-munches \
  --target u945238940@141.136.39.73 \
  --rollback <backup-file>
```

**Flags:** `--client` and `--target` (required); `--target-domain` (default the
sandybrown canary); `--port` (default 65002); `--yes`; `--no-push` / `--dry-run`;
`--app-user` / `--app-password` (REST credentials when no secrets file matches the
domain); `--no-backup` / `--force-no-backup`; `--include-advisory`; `--rollback
<backup-file>`.

**Behaviour:**
1. Fetch the server's current `theme.json` and the live `wp_global_styles` layer.
2. Diff the local snapshot against them; operator overrides (keys present live but absent
   locally) are surfaced in the diff.
3. Back up the live payload under `sites/<client>/theme-snapshot-backups/` before any
   overwrite.
4. Overwrite the server `theme.json` and write the user layer, then flush the cache.

**Safety:** a target whose domain is in the script's `SAFE_TARGETS` list is forced to
`--no-push` unless `--yes` is passed. The snapshot is the theme layer wholesale: a preset
missing from a snapshot is absent for that client, and the framework `theme.json` does not
fill it in.

**Auto-invoked by:** `/sgs-clone` Stage 10 as a diff only; a real push needs the
orchestrator's `--push-theme-snapshot` flag.

### `sgs-clone-orchestrator.py`

The pipeline orchestrator for the SGS clone workflow. It runs every pipeline stage
(extraction, recognition, conversion, deploy, register). The converter is the modular
`converter/` engine; there is no converter-selection flag.

```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/<draft>.html \
  --client mamas-munches \
  --page <page-slug>

# Without Playwright (faster, skips responsive extraction)
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/<draft>.html \
  --client mamas-munches \
  --page <page-slug> \
  --no-playwright
```

**Key flags:**
- `--mockup <path>` and `--page <slug>` — required.
- `--client <slug>` — auto-derived from the mockup path (the nearest `sites/<client>/`
  ancestor) when omitted; required for Stage 10.
- `--deploy-target page:<id>` — after the pipeline completes, uploads referenced images
  and patches that page with the new block markup.
- `--push-theme-snapshot` — makes Stage 10 push the client snapshot instead of only
  diffing it.
- `--no-playwright` — skips the Playwright responsive extraction. For quick iteration
  only; not for fidelity measurement.
- `--mode {strict,draft,legacy}` — strict (default) halts on Stage 0 violations, draft
  warns, legacy bypasses.

**Stage 10** runs when the client slug is known: it diffs the client's
`theme-snapshot.json` against the target site through `push-theme-snapshot.py`.

---

### `sgs-db.py`

Query tool for the SGS Framework knowledge base (`sgs-framework.db`): blocks, block
attributes, design tokens, patterns, hooks and WP-CLI docs. Counts are DB-authoritative —
run `stats` for them.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats            # Framework health
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/hero   # Block details
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py match "pricing"  # Find best block
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py context indus-foods  # Load client context
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "<query>"    # Raw SQL
```

---

### `build-deploy.py`

The deploy script at `plugins/sgs-blocks/scripts/build-deploy.py`, and the only supported
way to ship the theme and plugin to a site. The `/wp-sgs-deploy` skill carries the full
Check → Build → Execute → Cache → Verify ceremony around it (see `.claude/dev-setup.md`).

**Targets** (`TARGETS` in the script):

| Target | Site | Notes |
|---|---|---|
| `sandybrown` (default) | `sandybrown-nightingale-600381.hostingersite.com` | The canary |
| `indus-test` | `lavender-dinosaur-183533.hostingersite.com` | Indus Foods test site; `explicit_opt_in_required` — deploys only when named with `--target indus-test` |

```bash
# Default: build + deploy plugin + theme to sandybrown
python plugins/sgs-blocks/scripts/build-deploy.py

# Deploy to the Indus test site
python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test

# Skip npm build (use existing build/)
python plugins/sgs-blocks/scripts/build-deploy.py --skip-build

# Theme only / blocks only
python plugins/sgs-blocks/scripts/build-deploy.py --theme-only
python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only

# Dry-run (print commands, do nothing)
python plugins/sgs-blocks/scripts/build-deploy.py --dry-run

# Verify a specific page instead of the target homepage (verify is ON by default)
python plugins/sgs-blocks/scripts/build-deploy.py --verify-url https://sandybrown-nightingale-600381.hostingersite.com/
```

**Args:** `--target {sandybrown,indus-test,eye-care-test}`, `--skip-build`, `--theme-only`,
`--blocks-only`, `--dry-run`, `--allow-dirty`, `--payload <path-prefix>` (repeatable),
`--skip-verify`, `--verify-url <URL>`, `--skip-purge`, `--skip-gate-full`,
`--skip-oldshape-audit`, `--skip-motion-qa`, `--audit-scoped-page <page_id>`,
`--takeover`, `--no-isolate`, `--self-test`.

**Guards:**
- **Dirty-deploy guard.** Refuses when a file that BOTH ships in the tarball AND executes
  in WordPress (`.php/.js/.css/.html/.json` under `theme/sgs-theme/` or
  `plugins/sgs-blocks/`, minus `src/`, `_retired/`, `styles/`, `scripts/`, `tests/`,
  lockfiles and the generated `lucide-icons.php`) is uncommitted — unless `--allow-dirty`,
  or unless every such file falls under a `--payload` prefix. Read the paths it lists
  before reaching for `--allow-dirty`.
- **Post-deploy smoke test.** Runs by default (opt out: `--skip-verify`). A cache-busted
  GET of the target that fails the run on a 4xx/5xx or a WordPress fatal in the body.
- **One-generation rollback.** The previous copy is rotated to `<dir>.bak` rather than
  deleted, so a bad deploy is one `mv` from recovery.
- **Build check.** Refuses if `plugins/sgs-blocks/build/` is missing and `--skip-build` is
  set.
- **Cache purge.** After deploy it purges both cache layers — OPcache through an HTTPS
  probe and the LiteSpeed page cache through wp-cli (opt out: `--skip-purge`).

**Pipeline:** `npm run build` → tar archive → scp → ssh extract + rotate-to-`.bak` + move →
local cleanup, then the cache purge and the post-deploy smoke test.

---

### `sync-container-wrapping-blocks.py`

Container-inheritance audit and KIND-classification script at
`plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py`.

- **Wraps-children detection** — a structural signal (the block wraps child blocks) read
  from `block_composition.has_inner_blocks` + `accepts_allowed_blocks`.
- **3-KIND model** — classifies each block as `section` (full-bleed outer), `layout`
  (inner content-width wrapper) or `content` (composite with its own chrome).
- **KIND→attr-scope diff** — emits a per-block diff showing which attrs are in scope for
  each KIND and which are missing versus `sgs/container`.

With `--apply` it writes `block_composition.wraps_block` and `container_kind` to the
canonical `sgs-framework.db`; without it, it is a dry run. It never edits `block.json`
unless `--write-block-json` is combined with `--apply`. Per-block diff Markdown goes to
`pipeline-state/container-inheritance-sync/<date>/<block>.diff.md`. See Spec 31 §13
FR-31-21 for the wrapper-conversion procedure.

```bash
python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py                 # report only
python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py --apply         # write the DB
python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py --target-block sgs/hero
```

**Args:** `--apply`, `--write-block-json`, `--target-block <slug>`, `--db <path>`.

---

### `behavioural-analyser/assign-canonical.py`

Batch backfill of `canonical_slot`, `role` and `derived_selector` on `block_attributes`,
at `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py`. It reads the
`slots`, `property_suffixes` and `modifier_suffixes` tables and writes to `block_attributes`
rows. Tier A (suffix decomposition and slot resolution) runs by default; Tier B (BEM-element
backfill) runs as a dry run that writes a diff JSON under `pipeline-state/_snapshots/`.

```bash
# Tier A, then a Tier B dry run
python plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py

# Apply the most recent Tier B diff
python plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py --apply

# Skip a tier
python plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py --skip-tier-a
python plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py --skip-tier-b
```

**Args:** `--skip-tier-a`, `--skip-tier-b`, `--apply`, `--diff-file <path>`,
`--role-detection`, `--apply-roles`, `--role-diff-file <path>`, `--recapture-baseline`.
