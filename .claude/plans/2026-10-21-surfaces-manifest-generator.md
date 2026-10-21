# Surfaces manifest generator (`build/surfaces.json`)

## Why

Spec 48 §2 says `sites/<client>/build/surfaces.json` is generated from the confirmed page map, with the site-build script writing each target's ID into it. No code writes it: `site-build.mjs` (FR-48-55) writes IDs into `page-map.json` rows only, and Eye Care's manifest was hand-written in the 2026-10-03 Spec 47 foundations commit. Indus therefore has no manifest, so Fill, Solve, `skeleton.mjs` and `state-map.mjs` cannot run on it. Found while starting Indus step 20 (the header slice); Bean chose to build the generator (2026-10-21) and chose the handoff records, checked against intake, as the source of each surface's walker states, because intake's re-derived inventory has no header, menu or footer records.

## What it does

`node scripts/computed-route/manifest.mjs <client> --site <secrets name> [--apply]` reads `build/page-map.json` (confirmed, with IDs), `handoff/surfaces.json`, `build/intake/intake.json` and `calibration-targets.json`, and writes one entry per page-map row that has an ID. Without `--apply` it prints the entries and every row it could not settle, and writes nothing. Every field is derived, never typed; the rules are in Task 1.

## Dispatch plan

1 implementer (Task 1), 1 risk-scaled task reviewer, 1 final reviewer: 3 dispatches. Task 2 (docs) is done inline by the main session.

## Global constraints

- Work on `main`. Commit with an explicit pathspec naming every file; never `git add -A`, a glob, or `git stash`. Do not push; the controller pushes after review. Run `git branch --show-current` in the same command as the commit.
- Do not touch `sites/*/build/surfaces.json`, any `cache/` file, the framework DB or any live site. The generator is read-only except for the `--apply` write of one `surfaces.json`, and the tests write only to a temp directory.
- JavaScript files stay under 400 lines. Match the surrounding code: tabs, spaces inside parentheses, UK English in comments, comments describe current behaviour only.
- No client or reference-site name in code or file names outside `sites/<client>/` and `reference/` (`python scripts/check-no-client-names.py --check` must stay green). Test fixtures use neutral names.
- No hard-coded lookup dicts for framework facts: state words come from `lib/state-vocab.mjs` or the framework DB `states` table (read-only), as `lib/state-map.mjs` and `state-map.mjs` do.
- Every new rule has a MUST FAIL test and a mutation check: `node C:\Users\Bean\AppData\Local\Temp\claude\scratch\mutate.mjs <route dir> <mutations.json> <test file>`; read the script header for the mutations file format. These tests need no browser.
- Markdown is never hard-wrapped.
- Python edits on Windows: use the Write tool for any multi-line or escape-heavy script, not a heredoc.

### Task 1: The manifest builder, its command and its tests

Files: `scripts/computed-route/lib/manifest-build.mjs` (pure builder), `scripts/computed-route/manifest.mjs` (command), `scripts/computed-route/tests/manifest-build.test.mjs`, fixtures under `scripts/computed-route/tests/fixtures/manifest/`.

Command: `node scripts/computed-route/manifest.mjs <client> --site <secrets name e.g. indus-test> [--apply] [--repo <root>]`. Without `--apply` it prints the entries it would write plus the unresolved list and writes nothing. With `--apply` it writes `sites/<client>/build/surfaces.json`. Exit 0 done, 1 when any row is unresolved (entries are still written with `--apply`), 2 usage.

Inputs, all read-only: `sites/<client>/build/page-map.json` (array of rows: `slug`, `title`, `postType`, `id`, optional `route`); `sites/<client>/handoff/surfaces.json` (`records[]` with `id`, `kind`, `name`, `states[]` each `{ name, state_keys }`); `sites/<client>/handoff/MANIFEST.json` (for the entry file name; read its real key names first); `sites/<client>/build/intake/intake.json` (optional; `inventory.surfaces.records` for the cross-check); `scripts/computed-route/calibration-targets.json[site]` (`envFile`, `envKey`); the state vocabulary rows (`lib/state-vocab.mjs::stateRows()` or `lib/db.mjs::statesVocabulary`, read-only); an existing `sites/<client>/build/surfaces.json` if present.

One entry per page-map row that has an `id` (a row with a null or missing `id` is skipped and listed). Rules, all binding:

1. Key. A `page` row keeps its slug. `sgs_header` and `sgs_footer` rows keep theirs. Every other post type is prefixed: `sgs_mega_menu` `mega-`, `sgs_drawer` `drawer-`, `sgs_modal` `modal-`, `sgs_form` `form-`, `sgs_choice_flow` `flow-`. A slug already starting with its prefix is not prefixed twice. Two rows producing one key is a hard error naming both rows.
2. Fixed fields. `tree` is `<key>.tree.json`. `envFile`, `envKey` and `site` come from the site's calibration target. `target` is `{ "postId": <id> }`. `canvas` is `true` for every post type except `page`. `walker` is `qa/parity/<key>.mjs` and `walkerFull` is `qa/parity/<key>.full.mjs`. `draftDir` is `sites/<client>/handoff` and `draftIndex` is the entry file named by `MANIFEST.json`. `provides` is `["core/template-part:header"]` or `["core/template-part:footer"]` for those two post types, `["sgs/form:<row slug>"]` for `sgs_form`, and absent otherwise.
3. Record match (handoff record for a row). Kind by post type: `sgs_header` `header`, `sgs_footer` `footer`, `sgs_drawer` `drawer`, `sgs_mega_menu` `menu`, `sgs_modal` `modal`, `sgs_form` `form`, `page` `page`. A `page` row matches the record whose `page_key` equals the row's `route`. For other kinds: exactly one record of that kind matches; if several, the one whose `name`, lowercased and trimmed, equals the row `title` lowercased and trimmed; if there is still not exactly one match the row is unresolved. Never pick by position or first-found.
4. States. A matched record gives `states`: for each of its states, the walker-state key is the state name lowercased with every run of non-alphanumeric characters replaced by one `-`, trimmed of leading and trailing `-`, with a trailing parenthesised qualifier dropped before slugging (`scrolled (> 8px)` gives `scrolled`). The setting state is `lib/state-map.mjs::vocabStateFor( state, vocab )` when it returns a word; otherwise the first vocabulary state word that is one of the state name's words; otherwise `null`. Two states giving the same key keep the first. An unresolved row or a record with no states gets `{ "resting": null }` and is listed as `states-unresolved`. Do not write `draftRecords` (the handoff and intake id spaces differ; omitting it makes the state map use every record).
5. Cross-check. Where `intake.json` has an `inventory.surfaces.records` record of the same kind whose name matches the row, and its set of state names differs from the handoff record's, list a `states-disagree` row naming both sets. The cross-check never changes what is written.
6. Existing entry. If `surfaces.json` already has the key, every field it has is kept as is; the generator only adds missing fields, and the run prints the fields it added.

Proof (run once before reporting): `node --test scripts/computed-route/tests/manifest-build.test.mjs` passes, each MUST FAIL case goes red under its mutation (report the mutation run), `node scripts/computed-route/lint.mjs` exits 0, and `node scripts/computed-route/manifest.mjs indus-foods --site indus-test` (no `--apply`) prints entries for the header, the four mega menus, the drawer and the footer with no unresolved header, mega or drawer row (paste the table into the report).

MUST FAIL cases: a mega menu `about` and a page `about` produce distinct keys (red if the prefix is dropped); two same-kind records matching one row by name are unresolved, not picked; a CPT row is a canvas and a page is not; a row with a null id is skipped; an existing entry's hand-set field survives a rerun; a duplicate key is an error; `scrolled (> 8px)` maps to key `scrolled` and setting state `scrolled`; a state with no vocabulary word maps to `null`.

Report contract: write the full report to the path in the dispatch; return only status, commit hash, a one-line test summary and concerns.

### Task 2: Documentation (inline, main session)

`scripts/computed-route/README.md` rows for `manifest.mjs` and `lib/manifest-build.mjs`; Spec 48 §2 "Surface manifest" and FR-48-55 name the generator as the manifest's writer and say site-build writes IDs into page-map rows only; Indus plan step 20 names the generator as its first action.
