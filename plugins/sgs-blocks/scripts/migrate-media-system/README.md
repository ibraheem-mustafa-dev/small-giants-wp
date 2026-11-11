# migrate-media-system

The Spec 49 §13 migration tool: it finds old media attributes in saved block markup, rewrites them to the new system's attributes, and checks that none remain. The mapping lives in `mapping-frozen.json` and is never regenerated after adoption (`rows --regenerate` refuses once a block declares `kinds` on a media slot).

Run everything with `python plugins/sgs-blocks/scripts/migrate-media-system/cli.py <command>` (its docstring lists every flag).

## Targets

- Repo files: theme patterns, templates and parts, `sites/*/build/` trees, block fixtures, calibration fixtures. `fix --apply` rewrites them in place.
- Saved content on a local mirror (`/var/www/local-<name>` in WSL Ubuntu): every store that holds block markup, read by `export-content.php`:
  - every row of the posts table, whatever its post type or status (pages, posts, the SGS post types, `wp_template`, `wp_template_part`, `wp_block`, `wp_navigation`, revisions);
  - post meta values holding plain markup (the canary's `_sgs_qa_*_backup` rows); a serialised or JSON-encoded value holding `wp:sgs/` markup is `unsupported`;
  - options holding markup (`widget_block`, one record per widget); transients are skipped;
  - an option or post meta value that holds `wp:sgs/` markup in a shape the tool cannot rewrite (serialised without a `content` slot, or JSON-encoded) is listed as `unsupported`; `fix` and `check` refuse it on every input (a mirror or a `--content` file), naming it, until it is resolved by hand.
- An export file (`--content FILE`): the JSON list `corpus.export_command` prints.

## Saved-content commands

```
cli.py survey --mirror NAME [--out FILE --json]     read-only: old attributes per block and store
cli.py fix    --mirror NAME --dry-run               prints the diff of every row it would rewrite
cli.py fix    --mirror NAME --apply                 backup, rewrite, read-back; prints the backup path and the restore command
cli.py check  --mirror NAME --active on             exit 1 while any old attribute remains
cli.py restore --mirror NAME --backup FILE          imports a backup `fix` made
cli.py self-test --mirror [--keep]                  the proof on a scratch mirror (below)
```

`fix --apply` order: `wp db export` to `/var/www/local-<name>-backups/<name>-<timestamp>.sql` (the first step; an empty or failed backup stops the run), then `wp eval-file apply-content.php` with the rewritten rows, then a fresh export that must match every written row. `apply-content.php` updates with `$wpdb` directly and clears the post, post meta and options caches; `wp_update_post` is not used because kses and revisions would change the markup. It refuses to write anything when a touched table is not InnoDB (a MyISAM table cannot roll back). Inside the transaction it re-reads every row with `SELECT ... FOR UPDATE` and rolls back with no write if any row changed since the export (each record carries the MD5 of the value it was read from); the writes follow in the same transaction.

With `--mirror` or `--content`, `check` and `fix` read only those targets; add `--target KIND` to include repo files as well.

While Stage B adopts wave by wave (some block that `scripts/data/media-adoption.json` lists has not declared `kinds`), `fix` and `check --active auto` rewrite and enforce only the adopted blocks (`mapping.migration_scope`), so a wave's migration never hands an unadopted block attributes its `render.php` cannot read; `--all-blocks` lifts the limit. Once every listed block has adopted, the scope is every block. `check --active on` (the deploy guard's form) is never scoped. A JSON file with a rewritten block keeps the indent of its first indented line; a file with no rewritten block is left byte for byte.

Image sizes (FR-49-16): the renderer refuses an image Source with neither an attachment id nor a width and height, so `sizes.py` gives every image Source the migration writes (or finds) one of them. `export-content.php` ends its list with one `attachments` record (upload-relative path, sized copies included, to id, width, height, mime); `corpus.py` splits it off and registers it for the site, and an image whose URL is one of the site's uploads gets that attachment id whatever host the saved URL names. Any other image gets its width and height read from the file: the mirror's uploads folder first, then an HTTP read of the first bytes (PNG, GIF, JPEG, WebP, SVG; a `data:` URI is read in place), cached per site and URL. An image whose file is definitively not there (HTTP 404 or 410, a host that does not resolve or whose certificate a browser refuses on every attempt, a relative path with no file in the mirror's document root) was a broken image on the old page: the Source keeps its url with no size, a `reported` event says so (only when the block is being converted now, so `check` stays clean afterwards), and the renderer prints nothing. An image whose size cannot be read for any other reason (timeout, reset, 5xx, another 4xx) refuses its whole block: the old attributes stay as saved and the event names the URL. Repo targets have no site, so they use the HTTP read; a URL on a dead host stays refused until someone fixes it by hand.

`sgs/media` width pins (§13): the old block drew the media in a `<figure>` (any caption, link, overlay, per-device file or non-image kind) 100% of the container wide and a bare `<img>` at its file's own width; it ignored a saved Height on a video and on an SVG. The new default is the file's own size and a Height or Ratio alone is 100% wide, so `transform.py::pin_media_sizing` writes only the difference: Width 100% for a figure with no sizing and for a video or SVG in height mode (whose Height is deleted, because the old block never drew it), Width auto for a bare image in height mode, and Width equal to the file's width for a bare image with a Ratio. An embed needs no pin. A Width the block already stored is never replaced.

`corpus.export_command(wp_path)` returns one read-only shell command (the PHP travels inside it, base64) that prints the export JSON on a WordPress host over SSH or in WSL. Package C's deploy step calls it.

Declared-target guard (`blocks.py::guard_declared`): WordPress silently drops an attribute a block's `block.json` does not declare, so after a block's transform, any attribute it would write that the live `block.json` on disk (plus the universal `sgs*` extension attributes) does not declare makes the block `refused` whole: nothing is written, and the event names the attribute and the old one it came from. It applies to the blocks `fix` rewrites (`mapping.migration_scope`), reads the declarations once per run, and serves repo files, `--content` files and mirrors alike. Values that painted nothing on the old front end are deleted first (`blocks.py::migrate_inert_settings`): `attachment` and `repeat` on `sgs/media` and `sgs/decorative-image` (background properties on an `<img>` or video), and a `sgs/decorative-image` overlay with no colour or gradient set. A decorative-image overlay that did paint is refused by the guard, because that layer has no Overlay (§10.4); a person decides.

`fix` leaves a refused block as saved and `check --active on` then reports it, so list the refusals before a release with `survey --mirror NAME` (status `refused`) as well as the dry run.

## Self-test

`cli.py self-test` runs the fixtures, negative controls and idempotence proofs, and (when PHP is on the PATH) `export-content.php` and `apply-content.php` against a fake `$wpdb` (`export_selftest.py`, `apply_selftest.py`) (no WSL needed; the gate form is `cli.py check --self-test`). `cli.py self-test --mirror` additionally builds `/var/www/local-mediatest` from `local-sandybrown` (files without uploads, database as `wp_mediatest`), then proves: dry run writes nothing, `fix --apply` rewrites and `check --active on` is clean, a second fix does nothing, `restore` returns every table checksum (under the mirror's own table prefix, read with `wp db prefix`) and every row to the original bytes, a deliberately broken mapping makes `check` fail, `restore` refuses a file outside the backups folder, and the source mirror is unchanged. It deletes the scratch mirror, its database and its backups afterwards.

The four real mirrors (`sandybrown`, `indus`, `mamas`, `eye-care`) belong to other sessions: survey them, never fix them, until the Stage B release step.

The committed survey outputs of the real mirrors are in `plugins/sgs-blocks/reports/media-migration-survey/`.
