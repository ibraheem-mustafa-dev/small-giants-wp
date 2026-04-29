---
date: 2026-05-01
result: PASS
studio_version: 1.8.0
blueprint: ~/.claude/skills/sgs-wp-engine/references/studio-blueprints/sgs-default.json
site_path: $TEMP/studio-sgs-smoke
port: 8881
---

# P1.5e Smoke Test — PASS

End-to-end verification of the sandbox-preview gate on a fresh Studio site booted from `sgs-default.json`.

## Results

| Check | Command | Result | Evidence |
|---|---|---|---|
| Site boots and serves HTTP | `curl -o /dev/null -w "%{http_code}" http://localhost:8881/` | PASS | `302` (login redirect — correct for fresh WP with no public content) |
| Placeholder replacement | `studio wp option get blogname` | PASS | `SGS Sandbox — smoke-test` (`__CLIENT_SLUG__` → `smoke-test`) |
| Permalink structure | `studio wp option get permalink_structure` | PASS | `/%postname%/` |
| `defineWpConfigConsts` (GAP-3) | `grep WP_DEBUG wp-config.php` | PASS | `define( 'WP_DEBUG', false )` · `WP_DEBUG_LOG false` · `WP_DEBUG_DISPLAY false` — all three consts written by blueprint step |

## GAP-3 Status

`defineWpConfigConsts` with `method: rewrite-wp-config` **works correctly** on Studio 1.8.0 PHP-WASM. The three WP_DEBUG constants are present in `wp-config.php` after blueprint execution. GAP-3 is **RESOLVED**.

## Gotcha captured

Studio `site create` requires `--path` when default `~/Studio/` directory does not exist. Without `--path`, the CLI errors: "The selected directory is not empty nor an existing WordPress site." Add explicit `--path` to `studio-preview-up.ps1` — already handled by deriving `$SitePath = Join-Path $HOME Studio $SiteName`.

**Correction:** The PS1 script does NOT pass `--path` to `studio site create` — it relies on the default `~/Studio/<name>` path. That default fails when `~/Studio/` doesn't exist yet. The PS1 script needs `--path $SitePath` added to the `site create` call.

## Cleanup

```bash
studio site delete --path "$TEMP/studio-sgs-smoke"
```
