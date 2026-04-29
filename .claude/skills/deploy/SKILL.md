---
name: deploy
description: Use when deploying sgs-blocks plugin, sgs-theme, or both to palestine-lives.org. Invoke as /deploy plugin, /deploy theme, or /deploy both. Handles build, tar, SCP, SSH extract, LiteSpeed cache clear, and OPcache reset.
---

# SGS Deploy

## Overview

Full deployment pipeline for the SGS WordPress framework. Covers build → tar → SCP → SSH extract → cache clear → OPcache reset. Run from the project root (`small-giants-wp/`).

## Arguments

| Argument | What deploys |
|---|---|
| `plugin` | sgs-blocks plugin only (always runs `npm run build` first) |
| `theme` | sgs-theme only |
| `both` | sgs-theme + sgs-blocks (most common after a full session) |

## Deploy: Plugin Only

```bash
cd plugins/sgs-blocks && npm run build && cd ../..
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv plugins/sgs-blocks $WP/plugins/ && rm -rf plugins sgs-deploy.tar'
rm sgs-deploy.tar
```

## Deploy: Theme Only

```bash
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' theme/sgs-theme
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && rm -rf theme sgs-deploy.tar'
rm sgs-deploy.tar
```

## Deploy: Both

```bash
cd plugins/sgs-blocks && npm run build && cd ../..
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'
rm sgs-deploy.tar
```

## Always Run After Any Deploy

```bash
# Clear LiteSpeed page cache
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# Reset PHP OPcache via HTTP (CLI pool is separate — CLI reset does nothing for web requests)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

## Critical Gotchas

| Mistake | What breaks | Fix |
|---|---|---|
| Using `scp -r` | Creates nested dirs (`sgs-blocks/sgs-blocks/`) | Always use tar method |
| SSH with double quotes | `$WP` expands locally (to empty), silently breaks deploy | Always single quotes around SSH command |
| Moving before deleting | `mv` fails "Directory not empty" | `rm -rf` old dir BEFORE `mv` new one |
| Skipping `npm run build` | Deploys stale JS/CSS, changes look missing | Always build first for plugin deploys |
| CSS changes without version bump | Hostinger caches CSS aggressively | Bump version in `style.css` |
| `wp litespeed-purge all` | Broken on this host | Use `rm -rf litespeed/cache/*` instead |

## Single-File Quick Patch

For patching one PHP or CSS file without a full deploy:

```bash
scp -P 65002 -i ~/.ssh/id_ed25519 path/to/file u945238940@141.136.39.73:domains/palestine-lives.org/public_html/wp-content/path/to/file
```

Still run the cache/OPcache reset after.
