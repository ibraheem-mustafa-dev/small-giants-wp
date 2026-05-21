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
  - plugins/sgs-blocks/includes/class-sgs-variation-picker.php  # DELETED (Decision 18, 2026-05-21)
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

> **Note (2026-05-21):** Template parts are **brand-agnostic** — they are NOT coupled to the WP style-variation system (which is deleted per Decision 18). The `--variation=<slug>` flag here refers to a registered PATTERN SLUG (e.g. `sgs/framework-header-minimal`), not a WP style variation JSON. The auto-trigger via `save_post_wp_global_styles` is removed (FR-S2-1 retired). Use this command or the admin "Reset Header/Footer" button to seed explicitly. First-install seeding happens automatically via the plugin activation hook.

**Capability:** `edit_theme_options` + seeding guard must be armed (see §4.11)
**Delegates to:** `Sgs_Template_Part_Seeder::resolve_pattern_slugs()` + `get_pattern_content()`

Seeds the header and footer template parts from the named (or currently active) framework
pattern. The seeder resolves `sgs/framework-header-*` and `sgs/framework-footer-*` pattern
slugs and writes the pattern content into the corresponding `wp_template_parts` post.

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
| `No variation slug supplied and no default pattern found` | No `--variation=<slug>` passed and no default pattern registered | Pass `--variation=<slug>` where slug is a registered pattern slug (e.g. `sgs/framework-header-minimal`) |
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
template-part seeder to fire on the next explicit `wp sgs seed-template-parts` call. The
guard normally requires an upgrade cooldown period before seeding is permitted.

> **Note (2026-05-21):** The auto-trigger on style-variation save (FR-S2-1) is REMOVED by
> Decision 18. This command now arms the guard for EXPLICIT CLI seeding only. The output
> message below is updated accordingly.

```bash
wp sgs seeding-arm --user=1
# Output: Success: Seeding guard armed. Run wp sgs seed-template-parts to seed template parts.
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

### 4.14 `wp sgs theme-mod restore` (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.6)

`wp sgs theme-mod restore` and `Sgs_Variation_Picker` are DELETED by Decision 18. The WP style-variation system is removed; there is no legacy `active_theme_style` theme_mod to restore. Per-site branding is managed via `push-theme-snapshot.py` (see §7 below).

---

## 5. Quick-reference cheatsheet

```bash
# Site Info
wp sgs site-info get <key>
wp sgs site-info set <key> <value> --user=1
wp sgs site-info update /tmp/data.json --user=1
wp sgs site-info reset --user=1

# Template parts (brand-agnostic — NOT variation-coupled; see §4.5 note)
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

# wp sgs theme-mod restore — RETIRED 2026-05-21 (Decision 18, variation system deleted)
# Use push-theme-snapshot.py for per-site branding — see §7 below
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

---

## 2026-05-20 — Out-of-scope but operator-relevant: stage_attribute_promotion.py CLI

This spec owns the `wp sgs *` PHP CLI surface (12 commands via WP-CLI). A separate operator-driven Python CLI shipped in the orchestrator scope this session:

**`plugins/sgs-blocks/scripts/orchestrator/stage_attribute_promotion.py`** (commit `37c92950`):
- `python stage_attribute_promotion.py list --top N` — ranked candidates from `attribute_gap_candidates` (uimax + sgs-framework DBs)
- `python stage_attribute_promotion.py promote --id <row_id>` — mutate block.json + render.php (manual confirm gate)
- `python stage_attribute_promotion.py status` — promoted vs pending counts

NOT a `wp sgs` subcommand because (a) it mutates source files outside WP runtime, (b) it requires manual operator confirmation gate, (c) it operates on dev-machine artefacts not server state. If future maintenance wants a `wp sgs promote-attribute` wrapper around it, that would belong in this spec.

**Sgs_Variation_REST** (commit `8ceb8787`): REST surface at `sgs/v1/active-variation` (POST + GET; `manage_options` gated) — **RETIRED 2026-05-21 (Decision 18)**. The variation system is deleted. This endpoint is no longer needed; Stage 10 of `/sgs-clone` now calls `push-theme-snapshot.py` instead.

---

## 7. Adjacent CLI scripts (non-wp-sgs)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.6 — Decision 14′.

These Python scripts are developer/pipeline tools that operate on dev-machine or server artefacts outside WP runtime. They are NOT `wp sgs` subcommands.

### `push-theme-snapshot.py` (Phase 5a — Decision 14′)

Deploys a local per-client `theme-snapshot.json` to a specific site's `wp-content/themes/sgs-theme/theme.json`.

```bash
python plugins/sgs-blocks/scripts/push-theme-snapshot.py \
  --client mamas-munches \
  --target u945238940@141.136.39.73

# Force-overwrite without interactive prompt
python plugins/sgs-blocks/scripts/push-theme-snapshot.py \
  --client indus-foods \
  --target u945238940@141.136.39.73 \
  --yes
```

**Behaviour:**
1. Fetch server's current `wp-content/themes/sgs-theme/theme.json` via SSH
2. Diff local `sites/<client>/theme-snapshot.json` against server file
3. Display diff; require `--yes` or interactive y/N
4. Overwrite server `theme.json` with local snapshot

**Safety:** operator Site Editor edits write to `wp_global_styles` (a separate post type), not `theme.json` directly. File-level conflicts are rare; the pre-push diff surfaces them before any overwrite.

**Auto-invoked by:** `/sgs-clone` Stage 10 when `--client` flag is set (Decision 16′).

**Snapshot format:** full `theme.json` copy (not a diff). Located at `sites/<client>/theme-snapshot.json`.

### `sgs-clone-orchestrator.py` (existing)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.6.

The primary pipeline orchestrator for the SGS clone workflow. Runs all pipeline stages
(extraction, recognition, conversion, deploy). Accepts `--converter-v2` flag to route
through the Spec 16 cv2 converter.

```bash
# Standard full run
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --source https://example.com \
  --client mamas-munches \
  --converter-v2

# Without Playwright (faster, skips responsive extraction)
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --source sites/mamas-munches/mockup.html \
  --client mamas-munches \
  --converter-v2 \
  --no-playwright
```

**Key flags:**
- `--converter-v2` — REQUIRED to route through cv2 (Spec 16). Without it, legacy extract path runs silently.
- `--client <slug>` — auto-derived from mockup path when omitted; required for Stage 10 push.
- `--no-playwright` — skips Stage 4 Playwright responsive extraction. Use only for quick iteration; not for fidelity measurement.

**Stage 10** (auto-invoked when `--client` is set): calls `push-theme-snapshot.py` to deploy the client's `theme-snapshot.json` to the target site.

**IMPORTANT — `--converter-v2` required for cv2:** without this flag, `_cv2_eligible=False` for every boundary and the legacy extract path runs, silently bypassing widthMode emission and style-variation lift. This is a known footgun — captured at `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_converter_v2_flag_required_for_cv2.md`.

---

### `sgs-db.py` (existing)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.6.

Query tool for the SGS Framework knowledge base (`sgs-framework.db`). 619+ block attributes,
25 design tokens, 36 patterns queryable from the command line.

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats          # Framework health
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/hero  # Block details
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py match "pricing" # Find best block
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py context indus-foods # Load client context
```

**Note:** after Phase 1 (DB merge) lands, this tool queries the merged sgs-framework.db which
also contains WP core blocks, hooks, and CLI docs (Decision 1). All WP + SGS knowledge in
one DB, one query tool.

---

### `stage_attribute_promotion.py`

(See above — 2026-05-20 section.)
