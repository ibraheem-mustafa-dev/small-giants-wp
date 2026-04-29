---
doc_type: ai-instruction-manual
target_audience: claude-code-sessions
target_tool: wordpress-studio
last_updated: 2026-04-29
---

# WP Studio — AI Operating Manual

Studio is Automattic's free Electron-based local WordPress tool, powered by WordPress Playground (PHP WASM). It ships with a CLI (`studio`) and an MCP server (`studio mcp`) that exposes 24 tools to Claude (counted from `apps/cli/ai/tools.ts`: 6 site management + 4 import/export/sync + 2 WP-CLI/validation + 4 preview + 3 audit/screenshot + 2 annotation + 2 preview-iframe + 1 taxonomist). Bean's deploy path is git → Hostinger pull → live; Studio is a sandbox/preview tool, NOT a deploy target. WP.com sync features are unused (no WP.com hosting).

## When to use Studio (decision tree)

- **Visual / functional QA on a snapshot of the live site** → Studio. Pull a fresh copy, mutate freely, share Preview URL with Bean for review.
- **Throwaway block experiment, < 5 min, no media needed** → WP Playground (`/wp-playground` skill). Studio is overkill.
- **Heavy DB work / WooCommerce / large media library** → Local by Flywheel (already installed). Studio uses PHP WASM — slower for big DBs.
- **Pre-deploy gut-check of palestine-lives.org changes** → Studio with a fresh import of the live site, then run `validate_blocks` + `need_for_speed` + `rank_me_up` MCP tools.
- **Sharing a work-in-progress with Bean for sign-off** → Studio Preview Site (wp.build URL, free, 7-day expiry).
- **Cloning live site for offline iteration** → Studio import (`.zip` / `.tar.gz` / `.sql` / `.wpress`).

## Studio CLI reference

CLI binary: `studio` (or `wp-studio` / `npx wp-studio@latest`). Source: `apps/cli/commands/` in `Automattic/studio`.

Requires Node.js 22+ (24+ recommended). On Windows, run from PowerShell or Git Bash. Enable the CLI toggle in Studio Desktop → Settings → "Studio CLI" if installed via the desktop app.

Sites live at `~/Studio/<site-slug>/` (Windows: `C:/Users/Bean/Studio/`). Config at `~/.studio/cli.json`, `~/.studio/app.json`, `~/.studio/shared.json`.

### Auth

| Command | What it does | Notes |
|---|---|---|
| `studio auth login` | OAuth flow with WordPress.com. Required for preview sites + sync. | Token valid 2 weeks. (Bean does not need this unless using preview sites.) |
| `studio auth logout` | Clear stored credentials. | |
| `studio auth status` | Show authenticated account. | |

### Sites

| Command | What it does | Common flags |
|---|---|---|
| `studio site create` | Create + register + start a new local site. | `--name`, `--path`, `--php <8.0..8.4>`, `--wp <version|latest>`, `--domain <name>.local`, `--https` (requires `--domain`), `--blueprint <path-or-url>`, `--admin-username`, `--admin-password`, `--admin-email`, `--no-start`, `--skip-browser` |
| `studio site list` | List all registered sites with status. | `--json` for machine-readable output |
| `studio site status --path <path>` | Show running state, URL, port, PHP/WP versions, admin password. | `--json` |
| `studio site start --path <path>` | Start a stopped site. | |
| `studio site stop --path <path>` | Stop a running site. | |
| `studio site delete --path <path>` | Unregister a site. | `--files` moves the directory to system trash |
| `studio site set --path <path>` | Mutate one or more settings. | `--name`, `--domain`, `--https`, `--php`, `--wp`, `--xdebug`, `--admin-username`, `--admin-password`, `--admin-email`, `--debug-log`, `--debug-display` |

### WP-CLI

| Command | What it does |
|---|---|
| `studio wp <wp-cli-command> --path <site-path>` | Run any WP-CLI command in a Studio site. Site must be running. Examples: `studio wp plugin list`, `studio wp option get home`, `studio wp core update-db`. |

WP-CLI runs against PHP WASM — most commands work, but anything spawning subprocesses or hitting host filesystem outside the site root will fail. Use ASCII hyphens, not typographic dashes.

### Import / export

| Command | What it does |
|---|---|
| `studio import <backup-file> --path <site-path>` | Import a backup. Supports `.zip`, `.tar.gz`, `.sql`, `.wpress`. Server stops during import, restarts after. |
| `studio export --path <site-path> [output-file]` | Full-site export. Defaults to timestamped `.zip` in cwd. |
| `studio export --path <site-path> --mode db [output.sql]` | Database-only `.sql` export. |

### Sync (WP.com / Pressable only — Bean does not use)

| Command | What it does |
|---|---|
| `studio pull --path <site-path>` | Pull from WP.com/Pressable into local. Selective: `--options sqls,uploads,plugins,themes,contents` or `all`. |
| `studio push --path <site-path>` | Push local to WP.com/Pressable. Same `--options`. 5 GB cap. |

Hostinger is NOT a Sync target. Use `studio export` + manual upload, or stick with the existing git-based deploy.

### Preview sites (wp.build)

| Command | What it does |
|---|---|
| `studio preview create --path <site-path>` | Publish site to a wp.build temporary URL. Requires `studio auth login`. Takes minutes. Honours `.deployignore` (gitignore syntax). |
| `studio preview list` | Show all preview sites for the authenticated account. |
| `studio preview update <host>` | Push current local state to existing preview, resets 7-day expiry. |
| `studio preview delete <host>` | Permanently delete a preview. |

Limits: 10 previews per WP.com account, 7-day expiry from last update, only `wp-content` is uploaded. Default exclusions: `.git`, `node_modules`, `.DS_Store`, `Thumbs.db`, cache dirs, `debug.log`. Add a `.deployignore` at site root for custom excludes.

### MCP & AI

| Command | What it does |
|---|---|
| `studio mcp` | Start the Studio MCP stdio server. Run by Claude Code, not by hand. |
| `studio mcp --help` | Print platform-specific install instructions and config JSON for Claude Code, Claude Desktop, Codex, Cursor, Windsurf, VS Code. |
| `studio code` | Launch Studio Code interactive AI agent (early access). Optional. |
| `studio code sessions list \| resume \| delete` | Manage Studio Code sessions. |

## MCP tool reference (`studio mcp` — local server)

Bean's existing config snippet `{"mcpServers": {"wpcom-mcp": {"url": "https://public-api.wordpress.com/wpcom/v2/mcp/v1"}}}` points at the **remote WP.com MCP** (auth-gated, single tool: `wpcom_request`). It is NOT the Studio local MCP. Both can be configured side by side.

Add the Studio local MCP via:

```bash
claude mcp add --scope user wordpress-studio -- studio mcp
```

Or add to `.mcp.json` / global Claude config:

```json
{
  "mcpServers": {
    "wordpress-studio": { "command": "studio", "args": ["mcp"] }
  }
}
```

Source: `apps/cli/ai/tools.ts` in `Automattic/studio` (verified 2026-04-29).

### Site management

| Tool | Inputs | Output | Use for |
|---|---|---|---|
| `site_create` | `name: string` | JSON `{name, path, url, adminUrl, username, password, phpVersion}` | Spin up a fresh site for an experiment. Defaults: latest WP, default PHP, no HTTPS. |
| `site_list` | (none) | JSON array | Discover registered sites before any other action. |
| `site_info` | `nameOrPath: string` | JSON status, URL, PHP, admin creds | Get URL + admin password before WP-CLI / browser actions. |
| `site_start` | `nameOrPath: string` | text confirmation | Required before `wp_cli`, `validate_blocks`, `need_for_speed`, `rank_me_up`. |
| `site_stop` | `nameOrPath: string` | text confirmation | Free up port / RAM. |
| `site_delete` | `nameOrPath: string`, `deleteFiles?: boolean` (default true) | text confirmation | Tear down. `deleteFiles: false` keeps the directory. |

### Import / export / sync

| Tool | Inputs | Output | Use for |
|---|---|---|---|
| `site_import` | `nameOrPath`, `importFile` (absolute path) | text | Import `.zip`/`.tar.gz`/`.sql`/`.wpress` into existing site. |
| `site_export` | `nameOrPath`, `exportFile?`, `mode?: 'full'\|'db'` (default `full`) | text | Backup. Defaults to timestamped file in cwd. |
| `site_pull` | `nameOrPath`, `remoteSite` (URL or numeric ID), `options?: comma-list` | text | WP.com pull. Not for Hostinger. |
| `site_push` | `nameOrPath`, `remoteSite`, `options?` | text | WP.com push. Not for Hostinger. |

### WP-CLI + validation

| Tool | Inputs | Output | Use for |
|---|---|---|---|
| `wp_cli` | `nameOrPath`, `command` (without `wp` prefix) | stdout/stderr + exit code | Anything WP-CLI does. Site must be running. ASCII hyphens only. |
| `validate_blocks` | `nameOrPath`, `filePath?` OR `content?` | per-block validation report | Catch deprecation drift in static blocks BEFORE deploying — the SGS framework's #1 silent-failure mode. Site must be running (uses real browser). |

### Preview sites

| Tool | Inputs | Output | Use for |
|---|---|---|---|
| `preview_create` | `nameOrPath` | text + URL | Generate a wp.build URL to share with Bean. Takes minutes. Auth required. |
| `preview_list` | `nameOrPath` | JSON | List previews tied to a site. |
| `preview_update` | `nameOrPath`, `host`, `overwrite?: boolean` | text | Push fresh changes to an existing preview. |
| `preview_delete` | `nameOrPath`, `host` | text | Remove a preview. |

### Audits + screenshots

| Tool | Inputs | Output | Use for |
|---|---|---|---|
| `take_screenshot` | `url`, `viewport?: 'desktop'\|'mobile'` (default desktop, 1040x1248 / 390x844) | PNG image | Visual diff after a change. Auto-scrolls to trigger lazy images, hides admin bar. |
| `need_for_speed` | `nameOrPath`, `path?` (default `/`) | JSON: TTFB, FCP, LCP, CLS, page weight, DOM size, request counts, asset breakdown | Performance audit. Cheaper alternative to a full Lighthouse run. |
| `rank_me_up` | `nameOrPath`, `path?` | JSON: title/meta, OG/Twitter, headings, alt-text coverage, link counts, JSON-LD, robots/sitemap | On-page SEO audit. |

### Annotation feedback loop (Studio desktop only)

| Tool | Inputs | Output | Use for |
|---|---|---|---|
| `open_annotation_browser` | `url` | text | Opens headed browser. Bean clicks elements + types feedback. |
| `wait_for_annotations` | `timeoutMinutes?` (1-120, default 30) | JSON of annotations | Blocks until Bean clicks "Done". |

### Preview iframe steering (Studio desktop only — silently no-op in plain CLI)

| Tool | Inputs | Use for |
|---|---|---|
| `preview_navigate` | `path` (site-relative, e.g. `/about/`) | After editing a page, jump the in-app preview to it. |
| `preview_reload` | (none) | Refresh the in-app preview after a CSS / template change. |

### Taxonomist

| Tool | Inputs | Use for |
|---|---|---|
| `install_taxonomy_scripts` | `nameOrPath` | Copies Taxonomist PHP scripts into `tmp/taxonomist/`. Niche — skip unless explicitly working on taxonomies. |

## MCP tool reference (`wpcom-mcp` — remote WP.com server)

URL: `https://public-api.wordpress.com/wpcom/v2/mcp/v1`. Requires WP.com OAuth bearer token (returns `401` without one). Bean has no WP.com hosting — only useful if connecting to WP.com or Pressable.

| Tool | Inputs | Use for |
|---|---|---|
| `wpcom_request` | `method: 'GET'\|'POST'\|'PUT'\|'DELETE'`, `path`, `query?`, `body?`, `apiNamespace?` (default `wp/v2`) | Generic tool that hits any WP.com REST endpoint scoped to a site ID. Path is relative to `/sites/{siteId}/`. Prefix with `!` for absolute (e.g. `!/me`). Set `apiNamespace: ""` for v1.1, `wpcom/v2` for WP.com v2. |

## Blueprint format

Studio uses WordPress Playground's Blueprint v1 schema. Pass via `studio site create --blueprint <path-or-url>`. Schema: `https://playground.wordpress.net/blueprint-schema.json`.

### Top-level fields

| Field | Purpose | Studio support |
|---|---|---|
| `$schema` | Schema URL | Optional |
| `preferredVersions` | `{ php: "8.3", wp: "6.7" }` | Honoured |
| `siteOptions` | Site title, username, password, etc. | Honoured |
| `features` | `{ networking: true }` for outbound HTTP | Honoured |
| `steps` | Array of step objects | Honoured (unsupported steps silently skipped) |
| `landingPage`, `login`, `extraLibraries` | Playground-specific | **Ignored by Studio** |

### Step types (supported)

| Step | Required fields | Notes |
|---|---|---|
| `installPlugin` | `pluginData` (resource), `options.activate?` | Resource = `{resource:"wordpress.org/plugins", slug:"..."}` or `{resource:"url", url:"..."}` |
| `installTheme` | `themeData`, `options.activate?`, `options.importStarterContent?` | Same resource shapes |
| `activatePlugin` | `pluginPath` or `pluginName` | Plugin must be pre-installed |
| `activateTheme` | `themeFolderName` | |
| `runPHP` | `code` (string) | Must `require_once 'wp-load.php'` to access WP fns |
| `runPHPWithOptions` | `options.code`, `options.body?` | Extended PHP execution |
| `runSql` | `sql` (resource: literal/URL/file) | Multiline + comments OK |
| `setSiteOptions` | `options` (key-value object) | Calls `update_option()` per key |
| `defineWpConfigConsts` | `consts`, `method: 'rewrite-wp-config'\|'define-before-run'` | Mergeable across calls |
| `login` | `username?` (default `admin`), `password?` | Auto-login constant |
| `mkdir` | `path` | |
| `writeFile` | `path`, `data` | |
| `writeFiles` | `writeToPath`, `filesTree` | Nested file tree |
| `mv` / `cp` / `rm` | paths | |
| `importWxr` | `file` (resource), `importer?` | WordPress XML import |
| `importThemeStarterContent` | `themeSlug` | |
| `updateUserMeta` | `userId`, `meta` | |
| `setSiteLanguage` | `language` (e.g. `en_GB`) | Auto-downloads translations |

### Step types (Studio-unsupported, silently skipped)

`defineSiteUrl`, `enableMultisite` (multisite needs `--domain` flag too — error, not skip).

### Minimal SGS sandbox blueprint example

```json
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "preferredVersions": { "php": "8.3", "wp": "latest" },
  "features": { "networking": true },
  "siteOptions": {
    "blogname": "SGS Sandbox",
    "blogdescription": "Local Studio test site"
  },
  "steps": [
    { "step": "setSiteLanguage", "language": "en_GB" },
    { "step": "login", "username": "admin", "password": "password" },
    { "step": "setSiteOptions", "options": { "permalink_structure": "/%postname%/" } }
  ]
}
```

For SGS work, deploy `sgs-blocks` + `sgs-theme` post-creation via `wp_cli` or copy into `wp-content/` directly — easier than authoring blueprint resources for unpublished plugins.

## Standard workflows (cookbook)

### 1. Import an existing Hostinger site into Studio

Studio uses SQLite (PHP WASM cannot run native MySQL). Hostinger ships MySQL dumps. The All-in-One WP Migration `.wpress` format handles the conversion automatically — use that path.

**Important:** `wp ai1wm export` is **NOT** a real WP-CLI command on free Hostinger plans. The All-in-One WP Migration CLI is a paid extension (Unlimited extension). Free path: install the plugin via WP admin, trigger export from the UI, then `scp` the resulting `.wpress` from `wp-content/ai1wm-backups/`.

```bash
# 1. Install plugin (one-time):
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp plugin install all-in-one-wp-migration --activate"

# 2. Trigger export via WP admin UI:
#    Open https://palestine-lives.org/wp-admin/ → All-in-One WP Migration → Export → Export to: File → wait for completion → file lands in wp-content/ai1wm-backups/

# 3. Pull the .wpress file:
scp -P 65002 "u945238940@141.136.39.73:~/domains/palestine-lives.org/public_html/wp-content/ai1wm-backups/palestine-lives-*.wpress" ./palestine-lives.wpress

# 4. Import into Studio:
studio site create --name "palestine-lives" --no-start
studio import ./palestine-lives.wpress --path ~/Studio/palestine-lives
studio site start --path ~/Studio/palestine-lives
```

Plain `.sql` imports: Studio's SQLite integration plugin intercepts `wpdb` at runtime — it does NOT transparently translate MySQL-flavoured SQL dumps. If you must use a `.sql` file, expect failures on MySQL-specific syntax (collation literals, `GROUP_CONCAT`, REGEXP, fulltext). Prefer `.wpress` for production-equivalent imports.

Verify: `studio wp option get home --path ~/Studio/palestine-lives` should print the local Studio URL.

### 2. Spin up a Preview Site URL

```bash
studio auth login                                     # one-time per fortnight
studio preview create --path ~/Studio/palestine-lives # returns the wp.build URL
```

Refresh later (resets 7-day clock):

```bash
studio preview list
studio preview update <host> --path ~/Studio/palestine-lives
```

`.deployignore` example:

```
node_modules/
plugins/sgs-blocks/src/
*.log
```

### 3. Run /verify-loop against a Preview URL

> **Forward reference — post-P1.5e capability.** The `/verify-loop --target-url` flag is built in master plan §Phase 1.5 P1.5e. Until P1.5e ships, run the Studio MCP tools directly (steps below the bash block).

```
studio preview create --path ~/Studio/palestine-lives
# Capture the wp.build URL printed to stdout
/verify-loop --target-url <url>
```

Or use Studio MCP tools directly:

1. `take_screenshot {url, viewport: "mobile"}`
2. `take_screenshot {url, viewport: "desktop"}`
3. `need_for_speed {nameOrPath: "palestine-lives"}`
4. `rank_me_up {nameOrPath: "palestine-lives"}`
5. `validate_blocks {nameOrPath: "palestine-lives", filePath: "<path>"}`

### 4. Refresh sandbox from live

Same constraint as §1: trigger the export via WP admin UI, then pull the file. `wp ai1wm export` is paid CLI.

```bash
# 1. WP admin → All-in-One WP Migration → Export → Export to: File (manual, browser)
# 2. Pull the freshly-named .wpress:
scp -P 65002 "u945238940@141.136.39.73:~/domains/palestine-lives.org/public_html/wp-content/ai1wm-backups/palestine-lives-*.wpress" ./refresh.wpress
studio site stop --path ~/Studio/palestine-lives
studio import ./refresh.wpress --path ~/Studio/palestine-lives
studio site start --path ~/Studio/palestine-lives
```

Do this whenever you have not synced in 48+ hours, or before a QA run depending on current content.

### 5. Detect Studio version drift

```bash
studio wp core version --path ~/Studio/palestine-lives
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp core version"
```

If Studio's WP is older: `studio site set --path ~/Studio/palestine-lives --wp latest`. If Studio CLI itself stale: `npm install -g wp-studio@latest`, or update the desktop app via in-app updater.

## Gotchas (priority-ordered by frequency × user-impact)

Re-ranked 2026-04-30 — preview cap + expiry promoted because they directly block the Indus Foods 2-week review use-case cited in master plan §Phase 1.5 Shift 2.

1. **SQLite, not MySQL.** Studio runs PHP WASM with the SQLite integration plugin. MySQL-only SQL fails or behaves differently (collation, `GROUP_CONCAT`, REGEXP, fulltext indexes). Test DB-heavy features in Local by Flywheel instead. **The blueprint cannot force MySQL** — PHP-WASM cannot host a native MySQL server.
2. **Preview limit 10/account, 7-day expiry from last update.** `preview update` resets the clock; `preview list` before each review cycle to confirm capacity. Hits Indus 2-week review cycle the hardest.
3. **Preview sites only ship `wp-content`.** No core, no root files, no custom `wp-config.php` constants. Anything that depends on `wp-config.php` (LiteSpeed, OPcache hints, custom DB constants) won't be reflected in preview.
4. **`studio wp` only works if site is started.** Always call `site_start` (or `studio site start`) first.
5. **`validate_blocks` needs a running site + browser.** Slow on first call (browser warm-up — first run can take 30-60s; subsequent calls within the same session ~5-10s). Budget for it in `/verify-loop`.
6. **CLI requires Node.js 22+.** Best on 24+. WASM crypto errors? Check `node --version`.
7. **`.deployignore` applies to previews + push only.** Always-excluded set (`.git`, `node_modules`, etc.) is independent.
8. **HTTPS requires `--domain`.** No certs for default `localhost:port`. Studio uses self-signed certs auto-generated per site (no mkcert / system trust store integration); browsers will show the standard self-signed warning on first visit.
9. **Multisite blueprints require `--domain`.** Multisite cannot use custom ports. `enableMultisite` blueprint step errors (does NOT silently skip) without `--domain`.
10. **WP-CLI typographic dashes break.** Must be ASCII hyphens (e.g. `--allow-root`, `--skip-plugins`), not en-dash. Watch for editors / messaging apps that auto-substitute.
11. **CLI build required after self-clone.** `npm run cli:build` before `node apps/cli/dist/cli/main.mjs <command>`.
12. **Studio's WP version drifts.** Run `studio wp core version`; bump with `studio site set --wp latest`.
13. **Sites at `~/Studio/`, config at `~/.studio/`.** On Windows: `C:/Users/Bean/Studio/` and `C:/Users/Bean/.studio/`. NOT under `AppData`. Old builds migrate automatically.

## SLA / latency notes

For `/verify-loop` step budgeting (master plan §Phase 1.5 P1.5e):

| Action | Cold (first call) | Warm | Notes |
|---|---|---|---|
| `studio site start` | 5-15s | 1-3s | Cold = first start of the day; warm = subsequent same-session |
| `validate_blocks` | 30-60s | 5-10s | Browser warm-up is the cold cost |
| `take_screenshot` | 8-15s | 3-5s | Includes auto-scroll for lazy images |
| `need_for_speed` | 10-20s | 8-15s | Page weight / asset audit |
| `rank_me_up` | 5-10s | 3-7s | DOM-only analysis |
| `preview create` | 60-180s | n/a | Initial publish — minutes, not seconds. Allow 3-min budget. |
| `preview update` | 30-90s | n/a | Diff push; faster than create. |

Step budgets in `/verify-loop` should assume **warm** values for steady-state runs but treat the first run of a session as cold. If `/verify-loop --target-url` has a 60s per-step budget, `preview create` is OUT — chain it manually before invoking `/verify-loop`.

## Anti-patterns (Claude-specific)

- **Don't use Studio Sync for Hostinger work.** Sync only targets WP.com/Pressable. Use `studio export` + git/SCP deploy.
- **Don't treat Studio as a deploy target.** Studio is a sandbox. Live deploys go via git → Hostinger pull. Preview Sites are share-only.
- **Don't run `validate_blocks` on a stopped site.** Needs running browser pointing at live Studio URL with right block versions installed.
- **Don't fabricate MCP tools.** The 24 Studio tools above are verified against `apps/cli/ai/tools.ts` at trunk as of 2026-04-29. `wpcom-mcp` exposes one tool: `wpcom_request`. Studio is a fast-moving repo — re-verify against the trunk SHA before relying on the count for any new automation.
- **Don't call WP-CLI commands that subprocess to native binaries.** `wp media regenerate` works (pure PHP). Anything spawning `mysql`, `git`, `curl` via shell will fail in PHP WASM.

## Sources

- Studio repo: https://github.com/Automattic/studio
- Studio CLI README: https://github.com/Automattic/studio/blob/trunk/apps/cli/README.md
- Studio AGENTS.md: https://github.com/Automattic/studio/blob/trunk/AGENTS.md
- MCP tool definitions (verified): https://github.com/Automattic/studio/blob/trunk/apps/cli/ai/tools.ts
- WP.com remote MCP tools: https://github.com/Automattic/studio/blob/trunk/apps/cli/ai/wpcom-tools.ts
- MCP command source: https://github.com/Automattic/studio/blob/trunk/apps/cli/commands/mcp.ts
- Site create source: https://github.com/Automattic/studio/blob/trunk/apps/cli/commands/site/create.ts
- Site set source: https://github.com/Automattic/studio/blob/trunk/apps/cli/commands/site/set.ts
- Studio docs hub: https://developer.wordpress.com/docs/developer-tools/studio/
- Studio CLI docs: https://developer.wordpress.com/docs/developer-tools/studio/cli/
- Preview Sites docs: https://developer.wordpress.com/docs/developer-tools/studio/preview-sites/
- Sync docs: https://developer.wordpress.com/docs/developer-tools/studio/sync/
- MCP on Studio docs: https://developer.wordpress.com/docs/developer-tools/studio/mcp-on-studio/
- Agent Skills docs: https://developer.wordpress.com/docs/developer-tools/studio/agent-skills-wordpress-studio/
- Blueprints intro: https://developer.wordpress.com/docs/developer-tools/studio/blueprints/
- Blueprint format: https://wordpress.github.io/wordpress-playground/blueprints/
- Blueprint step library: https://wordpress.github.io/wordpress-playground/blueprints/steps/
- Blueprint schema: https://playground.wordpress.net/blueprint-schema.json
- Blueprint custom guide: https://developer.wordpress.com/docs/guides/how-to-create-custom-blueprints/
- WP.com remote MCP endpoint: https://public-api.wordpress.com/wpcom/v2/mcp/v1 (auth-gated, returns 401 unauthenticated)