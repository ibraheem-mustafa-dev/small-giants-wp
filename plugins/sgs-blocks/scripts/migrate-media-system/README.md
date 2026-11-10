# migrate-media-system

The Spec 49 §13 migration tool: it finds old media attributes in saved block markup, rewrites them to the new system's attributes, and checks that none remain. The mapping lives in `mapping-frozen.json` and is never regenerated after adoption (`rows --regenerate` refuses once a block declares `kinds` on a media slot).

Run everything with `python plugins/sgs-blocks/scripts/migrate-media-system/cli.py <command>` (its docstring lists every flag).

## Targets

- Repo files: theme patterns, templates and parts, `sites/*/build/` trees, block fixtures, calibration fixtures. `fix --apply` rewrites them in place.
- Saved content on a local mirror (`/var/www/local-<name>` in WSL Ubuntu): every store that holds block markup, read by `export-content.php`:
  - every row of the posts table, whatever its post type or status (pages, posts, the SGS post types, `wp_template`, `wp_template_part`, `wp_block`, `wp_navigation`, revisions);
  - post meta values holding markup (the canary's `_sgs_qa_*_backup` rows);
  - options holding markup (`widget_block`, one record per widget); transients are skipped;
  - an option that holds `wp:sgs/` markup in a shape the tool cannot rewrite is listed as `unsupported`, and `fix` and `check` refuse it until it is resolved by hand.
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

`fix --apply` order: `wp db export` to `/var/www/local-<name>-backups/<name>-<timestamp>.sql` (the first step; an empty or failed backup stops the run), then `wp eval-file apply-content.php` with the rewritten rows, then a fresh export that must match every written row. `apply-content.php` updates with `$wpdb` directly and clears the post, post meta and options caches; `wp_update_post` is not used because kses and revisions would change the markup. It refuses to write anything if any row changed between the export and the write (each record carries the MD5 of the value it was read from) and writes in one transaction.

With `--mirror` or `--content`, `check` and `fix` read only those targets; add `--target KIND` to include repo files as well.

`corpus.export_command(wp_path)` returns one read-only shell command (the PHP travels inside it, base64) that prints the export JSON on a WordPress host over SSH or in WSL. Package C's deploy step calls it.

## Self-test

`cli.py self-test` runs the fixtures, negative controls and idempotence proofs (no WSL needed; the gate form is `cli.py check --self-test`). `cli.py self-test --mirror` additionally builds `/var/www/local-mediatest` from `local-sandybrown` (files without uploads, database as `wp_mediatest`), then proves: dry run writes nothing, `fix --apply` rewrites and `check --active on` is clean, a second fix does nothing, `restore` returns every table checksum and every row to the original bytes, a deliberately broken mapping makes `check` fail, `restore` refuses a file outside the backups folder, and the source mirror is unchanged. It deletes the scratch mirror, its database and its backups afterwards.

The four real mirrors (`sandybrown`, `indus`, `mamas`, `eye-care`) belong to other sessions: survey them, never fix them, until the Stage B release step.

The committed survey outputs of the real mirrors are in `plugins/sgs-blocks/reports/media-migration-survey/`.
