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

Use `local-eye-care` or `local-sandybrown` instead of `all` for one site. It runs `rsync --delete` on `plugins/sgs-blocks/` (excluding `node_modules` and, at the plugin root only, `src`, `tests`, `.phpunit.cache`; `vendor/*/src` is copied), any other `plugins/sgs-*` folder already present on the site, and `theme/sgs-theme/`, then runs `wp cache flush`. Build first (`npm run build` in `plugins/sgs-blocks`).

## Refresh the database and uploads from the test site

The database is not kept in step with the test sites by itself. Before measuring on a mirror, refresh it (from Git Bash, which holds the SSH key):

```
bash scripts/local-wp/refresh-from-remote.sh local-eye-care eye-care-test
```

It reads both URLs from `.claude/secrets/<name>.env` (`WP_URL_<KEY>`), backs up the local database to `/var/www/<local-site>-before-refresh.sql` in WSL, dumps the test site's database with `mysqldump` (Hostinger's `wp db export` writes nothing) and its `wp-content/uploads`, imports both, rewrites the test site's URL to the mirror's (plain and JSON-escaped), flushes the cache, and fails unless `siteurl` is the mirror's. The mail block, `WP_ENVIRONMENT_TYPE` and cron settings live in files and `wp-config.php`, which it never touches. Then sync the build (above): the mirror runs the repo's build, not the test site's.

## Measuring on a mirror

`scripts/computed-route/solve.mjs --site local-eye-care` builds and walks a surface on the mirror instead of the test site (`solve.mjs::siteOverride`; the walker's live URLs move with `SGS_LIVE_ORIGIN`). The mirror is a database copy, so the surface's post ids and templates are its own. Calibration targets the mirrors as `local-eye-care` / `local-sandybrown`.
