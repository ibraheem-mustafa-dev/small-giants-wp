# Local WordPress mirrors (WSL Ubuntu)

Two local copies of the Hostinger test sites, cloned on 2026-10-05 (database and `wp-content`, WordPress 7.1.2). They let browser-based measurement scripts on Windows run without Hostinger's firewall.

| Site | URL | Docroot (WSL) | Database |
|---|---|---|---|
| Eye Care | http://localhost:8081 | `/var/www/local-eye-care` | `wp_eyecare` |
| Sandybrown | http://localhost:8082 | `/var/www/local-sandybrown` | `wp_sandybrown` |

Windows can read the files at `\\wsl.localhost\Ubuntu\var\www\local-<site>\wp-content\...` (Node also accepts `//wsl.localhost/Ubuntu/...`).
Logins are the same as the live sites; the values are in `.claude/secrets/local-eye-care.env` and `.claude/secrets/local-sandybrown.env` (gitignored).

Calibration (Spec 47) targets them as `local-eye-care` and `local-sandybrown` in `scripts/computed-route/calibration-targets.json`. Their `pluginDir` is read directly, so the deploy check needs no SSH. For the same build and snapshot they measure the same as the Hostinger sites (google-reviews: 228 settings and 5 dead on both, 2026-10-05).

Each docroot has WordPress's standard `.htaccess` rewrite rules. The clone copied only `wp-content`; without the rules `/wp-json/` answers 404 and editor saves fail with "not a valid JSON response".

Run the `wsl` commands below from PowerShell: Git Bash rewrites `/mnt/c/...` into a Windows path.

## Safety

- `wp-content/mu-plugins/local-block-mail.php` blocks all outgoing email (`pre_wp_mail` returns false).
- `WP_ENVIRONMENT_TYPE` is `local` and WP-Cron is disabled.
- LiteSpeed Cache is deactivated on Sandybrown; the Hostinger must-use plugins are moved to `wp-content/mu-plugins-disabled/`.

## Start after a reboot

```
wsl -d Ubuntu -u root -- bash -lc 'service mariadb start; service apache2 start'
```

## Sync the current repo build into the sites

```
wsl -d Ubuntu -u root -- bash /mnt/c/Users/Bean/Projects/small-giants-wp/scripts/local-wp/sync-build.sh all
```

Use `local-eye-care` or `local-sandybrown` instead of `all` for one site. It runs `rsync --delete` on `plugins/sgs-blocks/` (excluding `node_modules`, `src`, `tests`, `.phpunit.cache`), any other `plugins/sgs-*` folder already present on the site, and `theme/sgs-theme/`, then runs `wp cache flush`. Build first (`npm run build` in `plugins/sgs-blocks`).

## Re-cloning

These are one-off mirrors; the database is not kept in step with the live sites.
