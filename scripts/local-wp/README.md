# Local WordPress mirrors (WSL Ubuntu)

Four local copies of the Hostinger test sites (database and `wp-content`; Eye Care and Sandybrown cloned on 2026-10-05, Indus on 2026-10-11, Mama's on 2026-10-26; WordPress 7.1.x). They let browser-based measurement scripts on Windows run without Hostinger's firewall.

| Site | URL | Docroot (WSL) | Database |
|---|---|---|---|
| Eye Care (copies `eye-care-clone-test`) | http://localhost:8081 | `/var/www/local-eye-care` | `wp_eyecare` |
| Sandybrown | http://localhost:8082 | `/var/www/local-sandybrown` | `wp_sandybrown` |
| Indus | http://localhost:8083 | `/var/www/local-indus` | `wp_indus` |
| Mama's Munches (a copy of the live shop, deploy target `mamas-test`, refreshed from it and never pushed; WooCommerce copied from it, FluentSMTP left out so the mail block holds) | http://localhost:8084 | `/var/www/local-mamas` | `wp_mamas` |

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

Use `local-eye-care`, `local-sandybrown`, `local-indus` or `local-mamas` instead of `all` for one site. It runs `rsync --delete` on `plugins/sgs-blocks/` (excluding `node_modules` and, at the plugin root only, `src`, `tests`, `.phpunit.cache`; `vendor/*/src` is copied), any other `plugins/sgs-*` folder already present on the site, and `theme/sgs-theme/`, replaces the theme's `theme.json` with the one a deploy ships to the test site the mirror copies (`mirror_theme_json.py`: the client snapshot named by that target's `client` in `deploy_common.py`, so default paint measured on the mirror carries that snapshot's paint key), then runs `wp cache flush`. A tree on a Windows drive is packed with Windows' own `tar.exe` (fast on the Windows side), the one archive crosses into WSL and unpacks under `/tmp`, and `rsync` copies from there (`sync-build.sh::copy_tree`): reading the plugin's ~7,000 files one at a time through WSL's file bridge took 25 to 60 minutes when several syncs ran at once, and the packed copy takes under a minute. `tar.exe` skips only `node_modules` (its excludes match anywhere in a path, so `src` would also drop `vendor/*/*/src`); `rsync` applies the top-level excludes. Without `tar.exe` it falls back to `rsync` over the bridge. From Git Bash, prefix the `wsl` command with `MSYS_NO_PATHCONV=1` or the `/mnt/c/...` path is rewritten. Build first (`npm run build` in `plugins/sgs-blocks`); the script refuses a `plugins/sgs-blocks/build` with fewer built blocks than `src`, and a gated build can be copied in from `~/.cache/sgs-deploy/<key>/build` instead of rebuilding.

**A worktree's build, and the build copy trap.** `sync-build.sh` copies from the repo that holds the script, so running a worktree's own copy (`wsl -d Ubuntu -u root -- bash /mnt/e/<worktree>/scripts/local-wp/sync-build.sh local-mamas`) syncs that worktree's `plugins/sgs-blocks/build` and theme, which is how a batch is tried on a mirror before its full gate. To sync a gated commit from the main checkout, first refresh its `plugins/sgs-blocks/build` from the deploy cache (`~/.cache/sgs-deploy/<key>/build`, the key whose `gate-pass.json` names the commit AND has a `build` folder): a first attempt on 2026-11-17 copied nothing, and the mirror kept the old `block.json` files while taking the new PHP.

## Scratch copies of a mirror

`scripts/local-wp/scratch-mirror.sh create <mirror> local-mediatest-<name> <port>` copies a mirror's database (as `wp_mediatest_<name>`), files and uploads to `/var/www/local-mediatest-<name>`, rewrites its URLs to `http://localhost:<port>` (8090 to 8199) and serves it from its own Apache site; `drop local-mediatest-<name>` removes the site, database, files and backups; `list` shows each copy, its port and source. A copy records its source in `.scratch-source`, and `sync-build.sh local-mediatest-<name>` syncs a build to it with the source mirror's `theme.json`. Logins are the source mirror's. Use a copy for work the four mirrors must not see (they serve other sessions on `main`'s code), such as migrating saved content for a branch build. Run it from PowerShell, or from Git Bash with `MSYS_NO_PATHCONV=1`.

A copy can also be made from another scratch copy (`create local-mediatest-<a> local-mediatest-<b> <port>`); it keeps the original mirror as its source. `target local-mediatest-<name> <deploy target>` marks a copy that holds a test site's own database (refreshed with `refresh-from-remote.sh`): `sync-build.sh` then gives it the theme.json deployed to that target (`mirror_theme_json.py --target`) instead of its source mirror's. The before-and-after render check (`scripts/render-check/`) makes and drops its own pair of copies this way.

## Refresh the database and uploads from the test site

The database is not kept in step with the test sites by itself. Before measuring on a mirror, refresh it (from Git Bash, which holds the SSH key):

```
bash scripts/local-wp/refresh-from-remote.sh local-eye-care eye-care-clone-test
```

It reads both URLs from `.claude/secrets/<name>.env` (`WP_URL_<KEY>`), backs up the local database to `/var/www/<local-site>-before-refresh.sql` in WSL, dumps the test site's database with `mysqldump` (Hostinger's `wp db export` writes nothing) and its `wp-content/uploads`, imports both, rewrites the test site's URL to the mirror's (plain and JSON-escaped), flushes the cache, and fails unless `siteurl` is the mirror's. The mail block, `WP_ENVIRONMENT_TYPE` and cron settings live in files and `wp-config.php`, which it never touches. The refresh copies the test site's users too, so then set the mirror's login back to the password its secrets file holds with `node scripts/local-wp/reset-login.mjs local-eye-care` (it reads the value as every route script does, `lib/wp-run-session.mjs::readEnv`, and sets it with `wp_set_password` over stdin; a hand-run `wp user update --user_pass` keeps the quotes of a quoted value and leaves a login every script then fails), and sync the build (above): the mirror runs the repo's build, not the test site's.

## Measuring on a mirror

`scripts/computed-route/solve.mjs --site local-eye-care` builds and walks a surface on the mirror instead of the test site (`solve.mjs::siteOverride`; the walker's live URLs move with `SGS_LIVE_ORIGIN`). The mirror is a database copy, so the surface's post ids and templates are its own. Calibration targets the mirrors as `local-eye-care` / `local-sandybrown` / `local-indus` / `local-mamas`.

## Back up a site's database before editing it

`bash scripts/local-wp/backup-remote-db.sh <target> [label]` dumps a deploy target's database to `~/backups/db/<host>-<timestamp>[-label].sql.gz` on its own server (any site in the roster, a live one included, because it only reads) and fails unless the file is whole: not empty, a valid gzip, ending in mysqldump's completion line. It prints the restore command and keeps the newest 12 per host. Run it before any script edits a live site's content or settings: a deploy can roll code back, never a database change, and Hostinger's `wp db export` writes nothing. The file holds customer details and payment settings, so it stays on the server.

## Push the mirror to the test site

The reverse of the refresh: the clone is built on the mirror, then its database and uploads are copied onto the test site so the posts, menus and media keep the same ids (from Git Bash, which holds the SSH key):

```
bash scripts/local-wp/push-to-remote.sh local-eye-care eye-care-clone-test --dry-run
bash scripts/local-wp/push-to-remote.sh local-eye-care eye-care-clone-test
```

The target must be a site of kind `test` in `plugins/sgs-blocks/scripts/deploy_common.py::TARGETS`, the one deploy roster (`indus-test`, `eye-care-clone-test`); the canary (`sandybrown`, kind `canary`), a client's live site (`mamas-test`, kind `live`) and the hand-built reference site `eye-care-test` (kind `reference`, read-only by Bean's ruling) are refused, as is any name not in the roster. `scripts/local-wp/push_target.py` reads the roster and prints the target's host, server docroot and the shared SSH endpoint, so the script keeps no second list (`python scripts/local-wp/push_target.py --list` shows the accepted targets, `--self-test` proves the refusals); the script also refuses when the secrets file's URL host is not the roster's host. `SECRETS_DIR` overrides the secrets folder (a git worktree has no `.claude/secrets/`). The script refuses if the mirror's `siteurl` is not the URL its secrets file holds or if the two table prefixes differ. It backs up the test site's database on the server to `~/backups/push-to-remote/<host>-<timestamp>.sql` (outside `public_html`, and the path is printed), saves the test site's logins on the server, dumps the mirror with `wp db export`, copies the mirror's `wp-content/uploads` in (below), imports the dump with `mysql` using the credentials `wp config get` reads on the server, then runs `wp search-replace` (`--all-tables-with-prefix --skip-columns=guid`) for the mirror URL and its other scheme in plain, JSON-escaped and scheme-relative form, and puts the test site's logins back (below). It then flushes the object cache, the LiteSpeed cache (when that plugin is active), the rewrite rules and OPcache, and exits 1 unless `siteurl` and `home` on the server equal the test site's URL exactly; any failure after the import starts prints the command that restores the backup.

The import replaces the whole database, so the test site takes the mirror's users, options and active plugins; code is deployed separately (`build-deploy.py`).

If the build check refuses because the mirror's build is newer, deploy first. If the deploy's old-shape audit then refuses content the mirror has already fixed, see `.claude/dev-setup.md`, "A deploy and a push that block each other".

**Build check and site check.** Before the database is read, the script runs `node scripts/computed-route/build-compare.mjs --local <local-site> --target <remote-target>`, which compares the front-end files of every block in the mirror's `sgs-blocks` build with the test site's (one ssh listing) and refuses on any difference, printing `python plugins/sgs-blocks/scripts/build-deploy.py --target <remote-target>`; `--dry-run` shows the comparison. As its last step the script prints `node scripts/computed-route/site-check.mjs <client> --site <remote-target>`; with `--client <slug>` it runs that check itself against the test site (page views and one test submission per form).

**Logins.** The mirror's passwords and application passwords come from local secrets (`reset-login.mjs`), and the test site faces the internet, so none of them may survive the copy. Before the import each test-site user's password hash and application passwords are saved to `~/backups/push-to-remote/<host>-logins.json` on the server (mode 600, never fetched to this PC). After it, each user the test site had gets them back when both the login and the email match (so no password moves between two people who share a login name); each user only the mirror has, or whose email differs, gets a random password nobody knows (the plain value is never kept) and no application passwords; and every user's login sessions are cleared (`WP_Session_Tokens::destroy_all_for_all_users()`, then a count of `session_tokens` rows that must be 0). The run prints the logins restored and the mirror-only logins locked, never a hash or a password.

**Uploads.** This is the one sanctioned mirror-to-test-site copy of files (root `CLAUDE.md`, Build and deploy): test sites only, the database backed up first, additive. The mirror's `wp-content/uploads` is packed with `tar czf` in WSL, sent to a new `~/backups/push-to-remote/uploads-XXXXXX` folder on the server (outside `public_html`), and checked there before anything touches the site: the size matches what was sent, every entry lies under `uploads/`, none contains `..` and none is a link, and the unpacked file count equals the mirror's. Only then is it copied into `wp-content/uploads` with `cp -R` (a file of the same path is replaced by the mirror's, which the imported database describes; nothing is deleted), and the temporary folder is removed whether the copy succeeded or not.

`--dry-run` does every read and check (URLs, prefixes, the dump size, the occurrences of each search-replace pair in the dump, post counts by type on both sides, the mirror's upload count), has the server syntax-check the uploads copy script (`bash -n`) and confirm it has `tar`, `mktemp`, `find`, `cp` and the uploads folder, and prints each remaining step, but writes nothing on the server.

## Patching block settings on a mirror

`python scripts/local-wp/patch-block-attrs.py --site local-<client> --post <id> --patch <file.json> [--dry-run]` changes one post's block settings by `className` token (a clone's `cr-ref-<surface>-<n>`): set, unset, replace, remove or append blocks (format at the top of `patch-block-attrs.php`). Every operation must match exactly one block (or say `"all": true`) or nothing is written; the post is backed up to `/var/www/<site>-backups/` first; it writes as an administrator (`--user`, default 1), because without `unfiltered_html` the save filter strips every `sgsCustomCss` in the post; writes to one post wait on a lock, so parallel workers can patch the same post. A `set` of an attribute the matched block type does not declare is refused whole, in a dry run too (the block would store it and never read it). Known gap: a `set` on a block with a real `save()` (WooCommerce and core blocks) changes the attribute but leaves the saved inner markup stale, so the page keeps rendering the old markup until the block is re-saved in the editor; for those blocks, change the markup too or re-save in the editor (a guard in the tool is owed, recorded in `.claude/plans/2026-11-16-mamas-fix-and-surface-cloning.md`); `python scripts/local-wp/test-patch-block-attrs.py --site local-indus --post 149 --match cr-ref-form-enquiry-5` proves the refusal. A `set` of `sgsCustomCss` replaces the whole string: read the current string, edit it, write the full result, and count the post's Custom CSS attributes and total length before and after (a patch once overwrote a hero star's loop animation this way). The tool also re-serialises an empty object `{}` as `[]` inside `sgsMotion`; no fault has followed. Mirrors only (`local-*`); the result reaches a test site by `push-to-remote.sh`.
