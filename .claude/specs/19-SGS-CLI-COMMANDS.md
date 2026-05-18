---
doc_type: spec
spec_id: 19
spec_version: 0.1
project: small-giants-wp
title: SGS WP-CLI Command Reference — `wp sgs` Namespace
status: SHIPPED — all 12 commands live as of Spec 17 Wave 3
shipped: true
session_date: 2026-05-19
authors: Bean + Claude (Sonnet 4.6)
shipped_in: Spec 17 FR-S5-3
implementation_file: plugins/sgs-blocks/includes/class-sgs-cli-commands.php
references:
  - .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md (parent spec)
  - plugins/sgs-blocks/includes/class-sgs-cli-commands.php (canonical implementation — 622 lines)
  - plugins/sgs-blocks/includes/class-sgs-site-info.php
  - plugins/sgs-blocks/includes/class-sgs-template-part-seeder.php
  - plugins/sgs-blocks/includes/class-sgs-template-part-resetter.php
  - plugins/sgs-blocks/includes/class-sgs-header-rules.php
  - plugins/sgs-blocks/includes/class-sgs-footer-rules.php
  - plugins/sgs-blocks/includes/class-sgs-migrations.php
  - plugins/sgs-blocks/includes/class-sgs-safety-guard.php
  - plugins/sgs-blocks/includes/class-sgs-variation-picker.php
cross_references:
  - wp-wpcli-and-ops skill (SKILL.md) — documents this command surface
  - .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S5-3
---

# Spec 19 — `wp sgs` Command Reference

## 1. Overview

The `wp sgs` namespace ships 12 WP-CLI sub-commands as part of Spec 17 FR-S5-3. Every
command is a thin delegation to the same PHP helper classes used by the admin handlers —
no business logic lives in `class-sgs-cli-commands.php` itself.

**Audience:** developers and Claude Code automation. Clients never interact with WP-CLI.

## 2. Registration

Commands are registered in `sgs-blocks.php` inside a `WP_CLI` conditional:

```php
if ( defined( 'WP_CLI' ) && WP_CLI ) {
    require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cli-commands.php';
    \WP_CLI::add_command( 'sgs', Sgs_Cli_Commands::class );
}
```

## 3. Capability gate

Every write command internally calls `current_user_can( 'edit_theme_options' )`. Without
`--user=<id>`, WP-CLI runs as an anonymous context and write commands will error.

`Sgs_Site_Info::set_internal()` bypasses the gate for trusted contexts (migrations, cron,
CLI commands themselves) — the gate is at the `site-info set` command level, not inside
the helper.

Read-only commands (`site-info get`, `header-rules list`, `footer-rules list`,
`migrations status`) carry no capability requirement.

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

Seeds the header and footer template parts from the named (or currently active) style
variation's registered framework patterns. The seeder resolves `sgs/framework-header-*`
and `sgs/framework-footer-*` pattern slugs for the variation, then writes the pattern
content into the corresponding `wp_template_parts` post.

```bash
# Seed from the currently active variation
wp sgs seed-template-parts --user=1

# Seed from a specific variation
wp sgs seed-template-parts --variation=mamas-munches --user=1

# Force-overwrite even if already seeded
wp sgs seed-template-parts --variation=mamas-munches --force --user=1
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `Seeding is not armed` | Safety guard not triggered | Run `wp sgs seeding-arm --user=1` first |
| `No active style variation found` | No variation active in the editor | Activate a variation in Site Editor → Styles, or pass `--variation=<slug>` |
| `Pattern 'sgs/...' not registered — skipping header` | Pattern not registered for this variation | Run `/sgs-update` to regenerate patterns, or register manually |

---

### 4.6 `wp sgs reset-template-parts [--header] [--footer] --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Template_Part_Resetter::reset()`

Resets header and/or footer template parts from the active style variation. Mirrors the
*SGS Admin → Reset Header/Footer* page (FR-S2-3). When neither flag is given, both are
reset.

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

Adds a conditional header rule. The JSON argument must contain at least `pattern_slug`.
Optional fields: `priority` (int, default 10), `condition` (object with `page_type` etc).

```bash
wp sgs header-rules add '{"pattern_slug":"sgs/framework-header-transparent","priority":5}' --user=1
# Output: Success: Rule added with ID: rule_abc12345
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `Argument must be a valid JSON object` | Malformed JSON or wrong quote style | Use single quotes around JSON on the CLI |
| WP_Error message from `add_rule()` | Duplicate rule, unregistered pattern slug | Check pattern slug with `wp sgs header-rules list` |

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
**Delegates to:** `Sgs_Safety_Guard::arm()`

Flips the FR-S7-3 seeding safety guard to armed (with a 0-second cooldown), allowing the
template-part seeder to fire on the next style-variation save. The guard normally requires
an upgrade cooldown period before seeding is permitted.

```bash
wp sgs seeding-arm --user=1
# Output: Success: Seeding guard armed. The seeder will fire on the next style-variation save.
```

Run this before `wp sgs seed-template-parts` when the cooldown has not yet elapsed.

---

### 4.12 `wp sgs migrations status`

**Capability:** none (read-only)
**Delegates to:** `Sgs_Migrations::list_completed()` + `list_pending()`

Prints a summary of the installed framework version plus completed and pending migrations.

```bash
wp sgs migrations status
# Output:
# Installed version : 1.1.0
#
# Completed (2):
#   [x] 0001-site-info-schema
#   [x] 0002-floating-ui-defaults
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
wp sgs migrations run --target=0003-some-migration --user=1
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| RuntimeException message from `run()` | A migration raised an exception | Check `WP_DEBUG` log; fix the migration or roll back manually |

---

### 4.14 `wp sgs theme-mod restore --user=<id>`

**Capability:** `edit_theme_options`
**Delegates to:** `Sgs_Variation_Picker::restore_legacy_theme_mod()` (via inline logic in the command)

Restores the legacy `active_theme_style` theme_mod from the backup written by
`Sgs_Variation_Picker::maybe_migrate_legacy_theme_mod()` in `wp_options['sgs_legacy_theme_mods_backup']`.
Use this to roll back after a failed style-variation migration.

```bash
wp sgs theme-mod restore --user=1
# Output: Success: Legacy active_theme_style theme_mod restored: mamas-munches
```

**Common errors:**

| Error | Cause | Fix |
|---|---|---|
| `No usable backup found` | Migration never ran or backup is empty | Check `get_option('sgs_legacy_theme_mods_backup')` directly in WP-CLI: `wp eval 'var_dump(get_option("sgs_legacy_theme_mods_backup"));'` |

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

# Emergency rollback
wp sgs theme-mod restore --user=1
```

## 6. Cross-references

- **Spec 17 FR-S5-3** — the functional requirement that mandated this command surface
- **`plugins/sgs-blocks/includes/class-sgs-cli-commands.php`** — canonical implementation (622 lines)
- **`wp-wpcli-and-ops` skill (SKILL.md)** — the `/wp-wpcli-and-ops` skill documents this surface and should be invoked for any WP-CLI work in this project
- **Spec 17 §S2 + §S3** — the `seed-template-parts`, `reset-template-parts`, `header-rules`, and `footer-rules` commands mirror the admin UI described there

---

## 2026-05-20 — Behaviour parameter NOT YET wired on wp sgs header_rules add

Phase 2A added a `behaviour` key on header rules (read by `Sgs_Header_Behaviours::add_body_classes`) but the CLI command `wp sgs header_rules add <json>` currently strips unknown keys via its sanitiser. Until the CLI is extended, behaviours are set via:

```bash
wp --user=1 sgs header_rules add '{"pattern_slug":"sgs/framework-header-default","priority":5,"conditions":[]}'
wp --user=1 eval '$rules = get_option("sgs_header_rules", []); foreach($rules as $i => $r){if(($r["id"]??"")==="rule_XXX"){$rules[$i]["behaviour"]="sticky";}} update_option("sgs_header_rules", $rules);'
```

**Next session work:** extend `Sgs_Header_Rules::add_rule()` to accept + sanitise `behaviour` from the input JSON. Add `--behaviour=<slug>` examples to the CLI help. Estimated 20 min.
