# Local WordPress mirrors (WSL Ubuntu)

Four local copies of the Hostinger test sites (database and `wp-content`; Eye Care and Sandybrown cloned on 2026-10-05, Indus on 2026-10-11, Mama's on 2026-10-26; WordPress 7.1.x). They let browser-based measurement scripts on Windows run without Hostinger's firewall.

| Site | URL | Docroot (WSL) | Database |
|---|---|---|---|
| Eye Care (copies `eye-care-clone-test`) | http://localhost:8081 | `/var/www/local-eye-care` | `wp_eyecare` |
| Sandybrown | http://localhost:8082 | `/var/www/local-sandybrown` | `wp_sandybrown` |
| Indus | http://localhost:8083 | `/var/www/local-indus` | `wp_indus` |
| Mama's Munches (copies `mamas-test`; WooCommerce copied from it, FluentSMTP left out so the mail block holds) | http://localhost:8084 | `/var/www/local-mamas` | `wp_mamas` |

Windows can read the files at `\\wsl.localhost\Ubuntu\var\www\local-<site>\wp-content\...` (Node also accepts `//wsl.localhost/Ubuntu/...`). Logins are the same as the live sites; the values are in `.claude/secrets/local-eye-care.env`, `.claude/secrets/local-sandybrown.env`, `.claude/secrets/local-indus.env` and `.claude/secrets/local-mamas.env` (gitignored).

Calibration (Spec 48) targets them as `local-eye-care`, `local-sandybrown`, `local-indus` and `local-mamas` in `scripts/computed-route/calibration-targets.json`. Their `pluginDir` is read directly, so the deploy check needs no SSH. For the same build and snapshot they measure the same as the Hostinger sites (google-reviews: 228 settings and 5 dead on both, 2026-10-05).

Each docroot has WordPress's standard `.htaccess` rewrite rules. The clone copied only `wp-content`; without the rules `/wp-json/` answers 404 and editor saves fail with "not a valid JSON response".

Run the `wsl` commands below from PowerShell: Git Bash rewrites `/mnt/c/...` into a Windows path.

## Safety

- `wp-content/mu-plugins/local-block-mail.php` blocks all outgoing email (`pre_wp_mail` returns false).
- `wp-content/mu-plugins/sgs-calibration-context.php` (source `scripts/local-wp/mu-plugins/`, installed by `sync-build.sh`): renders an `sgs/mega-panel` whose metadata name is `sgs-cal-mega-drawer` in the drawer context, so calibration measures the panel's drawer settings (`calibration-fixtures.json` mega-panel variants). Mirror-only; never deployed.
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

Use `local-eye-care`, `local-sandybrown`, `local-indus` or `local-mamas` instead of `all` for one site. It runs `rsync --delete` on `plugins/sgs-blocks/` (excluding `node_modules` and, at the plugin root only, `src`, `tests`, `.phpunit.cache`; `vendor/*/src` is copied), any other `plugins/sgs-*` folder already present on the site, and `theme/sgs-theme/`, replaces the theme's `theme.json` with the one a deploy ships to the test site the mirror copies (`mirror_theme_json.py`: the client snapshot named by that target's `client` in `deploy_common.py`, so default paint measured on the mirror carries that snapshot's paint key), then runs `wp cache flush`. From Git Bash, prefix the `wsl` command with `MSYS_NO_PATHCONV=1` or the `/mnt/c/...` path is rewritten. Build first (`npm run build` in `plugins/sgs-blocks`).

## Refresh the database and uploads from the test site

The database is not kept in step with the test sites by itself. Before measuring on a mirror, refresh it (from Git Bash, which holds the SSH key):

```
bash scripts/local-wp/refresh-from-remote.sh local-eye-care eye-care-clone-test
```

It reads both URLs from `.claude/secrets/<name>.env` (`WP_URL_<KEY>`), backs up the local database to `/var/www/<local-site>-before-refresh.sql` in WSL, dumps the test site's database with `mysqldump` (Hostinger's `wp db export` writes nothing) and its `wp-content/uploads`, imports both, rewrites the test site's URL to the mirror's (plain and JSON-escaped), flushes the cache, and fails unless `siteurl` is the mirror's. The mail block, `WP_ENVIRONMENT_TYPE` and cron settings live in files and `wp-config.php`, which it never touches. The refresh copies the test site's users too, so then set the mirror's login back to the password its secrets file holds with `node scripts/local-wp/reset-login.mjs local-eye-care` (it reads the value as every route script does, `lib/wp-run-session.mjs::readEnv`, and sets it with `wp_set_password` over stdin; a hand-run `wp user update --user_pass` keeps the quotes of a quoted value and leaves a login every script then fails), and sync the build (above): the mirror runs the repo's build, not the test site's.

## Measuring on a mirror

`scripts/computed-route/solve.mjs --site local-eye-care` builds and walks a surface on the mirror instead of the test site (`solve.mjs::siteOverride`; the walker's live URLs move with `SGS_LIVE_ORIGIN`). The mirror is a database copy, so the surface's post ids and templates are its own. Calibration targets the mirrors as `local-eye-care` / `local-sandybrown` / `local-indus` / `local-mamas`.

## Push the mirror to the test site

The reverse of the refresh: the clone is built on the mirror, then its database and uploads are copied onto the test site so the posts, menus and media keep the same ids (from Git Bash, which holds the SSH key):

```
bash scripts/local-wp/push-to-remote.sh local-eye-care eye-care-clone-test --dry-run
bash scripts/local-wp/push-to-remote.sh local-eye-care eye-care-clone-test
```

The target must be a site of kind `test` in `plugins/sgs-blocks/scripts/deploy_common.py::TARGETS`, the one deploy roster (`indus-test`, `eye-care-clone-test`, `mamas-test`); the canary (`sandybrown`, kind `canary`) and the hand-built reference site `eye-care-test` (kind `reference`, read-only by Bean's ruling) are refused, as is any name not in the roster. `scripts/local-wp/push_target.py` reads the roster and prints the target's host, server docroot and the shared SSH endpoint, so the script keeps no second list (`python scripts/local-wp/push_target.py --list` shows the accepted targets, `--self-test` proves the refusals); the script also refuses when the secrets file's URL host is not the roster's host. `SECRETS_DIR` overrides the secrets folder (a git worktree has no `.claude/secrets/`). The script refuses if the mirror's `siteurl` is not the URL its secrets file holds or if the two table prefixes differ. It backs up the test site's database on the server to `~/backups/push-to-remote/<host>-<timestamp>.sql` (outside `public_html`, and the path is printed), saves the test site's logins on the server, dumps the mirror with `wp db export`, copies the mirror's `wp-content/uploads` in (below), imports the dump with `mysql` using the credentials `wp config get` reads on the server, then runs `wp search-replace` (`--all-tables-with-prefix --skip-columns=guid`) for the mirror URL and its other scheme in plain, JSON-escaped and scheme-relative form, and puts the test site's logins back (below). It then flushes the object cache, the LiteSpeed cache (when that plugin is active), the rewrite rules and OPcache, and exits 1 unless `siteurl` and `home` on the server equal the test site's URL exactly; any failure after the import starts prints the command that restores the backup.

The import replaces the whole database, so the test site takes the mirror's users, options and active plugins; code is deployed separately (`build-deploy.py`).

**Build check and site check.** Before the database is read, the script runs `node scripts/computed-route/build-compare.mjs --local <local-site> --target <remote-target>`, which compares the front-end files of every block in the mirror's `sgs-blocks` build with the test site's (one ssh listing) and refuses on any difference, printing `python plugins/sgs-blocks/scripts/build-deploy.py --target <remote-target>`; `--dry-run` shows the comparison. As its last step the script prints `node scripts/computed-route/site-check.mjs <client> --site <remote-target>`; with `--client <slug>` it runs that check itself against the test site (page views and one test submission per form).

**Logins.** The mirror's passwords and application passwords come from local secrets (`reset-login.mjs`), and the test site faces the internet, so none of them may survive the copy. Before the import each test-site user's password hash and application passwords are saved to `~/backups/push-to-remote/<host>-logins.json` on the server (mode 600, never fetched to this PC). After it, each user the test site had gets them back when both the login and the email match (so no password moves between two people who share a login name); each user only the mirror has, or whose email differs, gets a random password nobody knows (the plain value is never kept) and no application passwords; and every user's login sessions are cleared (`WP_Session_Tokens::destroy_all_for_all_users()`, then a count of `session_tokens` rows that must be 0). The run prints the logins restored and the mirror-only logins locked, never a hash or a password.

**Uploads.** This is the one sanctioned mirror-to-test-site copy of files (root `CLAUDE.md`, Build and deploy): test sites only, the database backed up first, additive. The mirror's `wp-content/uploads` is packed with `tar czf` in WSL, sent to a new `~/backups/push-to-remote/uploads-XXXXXX` folder on the server (outside `public_html`), and checked there before anything touches the site: the size matches what was sent, every entry lies under `uploads/`, none contains `..` and none is a link, and the unpacked file count equals the mirror's. Only then is it copied into `wp-content/uploads` with `cp -R` (a file of the same path is replaced by the mirror's, which the imported database describes; nothing is deleted), and the temporary folder is removed whether the copy succeeded or not.

`--dry-run` does every read and check (URLs, prefixes, the dump size, the occurrences of each search-replace pair in the dump, post counts by type on both sides, the mirror's upload count), has the server syntax-check the uploads copy script (`bash -n`) and confirm it has `tar`, `mktemp`, `find`, `cp` and the uploads folder, and prints each remaining step, but writes nothing on the server.
