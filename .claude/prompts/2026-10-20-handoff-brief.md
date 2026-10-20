# Handoff brief, 2026-10-20: Indus lane, clone coverage wave 3 (site and surfaces) plus media upload

Single-use: the cloud handoff session deletes this file in its commit.

## Tasks and intended outcomes

The session ran the pasted Indus-lane prompt: coverage plan Order item 3 (`.claude/plans/2026-10-12-clone-coverage-foundation.md`), Spec 48 FR-48-84 (site and surfaces, the part the two drafts use) and the media-upload part of FR-48-82 (FR-48-58), plus FR-48-59's open item. Outcome sought: the site-and-surfaces rows in the Indus and Mama's-redesign intake reviews are 0 (measured 2026-10-20: Indus 7, Mama's 5), `capabilities.mjs --gate` exits 0, intake's Site Info handover covers every key it proposes, and the draft's images reach the site's media library through one map file. That unblocks Indus build plan step 18 (`.claude/plans/2026-10-11-spec48-indus-build.md`; FR-48-55 site-build script, FR-48-58, FR-48-59).

Step list and per-step status: `.claude/plans/2026-10-20-site-surfaces-wave.md` (all eight steps marked done, with the extractor-font step 2b inside step 2).

## This session's commits (all on main, pushed)

- `19a2235f7`: head reader (`scripts/computed-route/lib/intake-head.mjs`), head and font checks (`lib/head-check.mjs`, CLI `head-check.mjs`), title → site title and tagline (`lib/intake-siteinfo.mjs::titleCandidates`), `handoverFor`/`handoverTargets` hand over every proposed key (hours as `opening_hours.<mon..sun>`, site_title as WordPress `blogname`, tagline as Site Info `tagline` plus `blogdescription`), `provision-site-info-from-draft.py` writes the two WordPress options (owner `wp-option`), media uploader (`lib/media-upload.mjs`, CLI `media-upload.mjs`), 8 coverage entries gap → covered in `scripts/computed-route/data/clone-coverage.json`, `helmet-font` registry reader.
- `d7e34b719`: the extractor (`plugins/sgs-blocks/scripts/theme-extractor/used_fonts.py`) adds families from the export's `tokens/typography.css` (Bean's idea); its `@import` reader no longer cuts a Google Fonts address at the `;` between weights; font check reads the tokens file; Indus snapshot gains a self-hosted Geist Mono (`theme/sgs-theme/assets/fonts/geist-mono/`).
- `77712861e`: SVG allowlist (`plugins/sgs-blocks/includes/helpers-svg-kses.php`) keeps `pathLength` (lowercase key: wp_kses looks attributes up lowercased) and `color-interpolation-filters`; `tests/php/SvgKsesCaseTest.php`; uploader shares one attachment between byte-identical files; `sites/indus-foods/build/media-map.json`.
- `4120ef22a`: a client name removed from a docstring example (deploy gate `check-no-client-names`); FR-48-58 Status.
- `f42f4f117`: docs and media map after the indus-test run.
- `63f1948cc`: QC council fixes (only helmet elements are the draft head; an SVG `<title>`, page microdata, a draft description and an unreadable font host are each raised as `missing:head:*` rows; failed uploads keep a partial map; `paintedAsset` exact-URL first; safe filename header).
- `8734994e1`: a token font counts only where the draft's code paints with it (`used_fonts.py::code_names_family`, Spec 48 §11); an export asset uploads only when it matches the export's `MANIFEST.json` (`media-upload.mjs::manifestSums`); a mapped attachment is re-uploaded only when two liveness reads both find it gone.
- Peer session's `71ab21990` regenerated `plugins/sgs-blocks/src/utils/svg-allowlist.generated.js` (the editor twin of the PHP allowlist), which `77712861e` had left stale.

## Findings (including no-file-change ones)

- Re-judged offline against the new coverage map: Indus's 7 wave rows → 0; Mama's redesign's rows → 0 (all 5 are among the 8 covered IDs); `head-check.mjs` finds no unhandled head item in either draft. No full intake run was needed, so Bean's levelled Indus review (`f0c33426e`) is untouched.
- The Claude Design handoff design (`.claude/claude-design-handoff/`) was read in full at Bean's request: consuming `tokens/typography.css` and uploading `handoff/assets/` plus `sites/<client>/assets/` images both follow it. The draft's `assets/food/` cut-out photos do not exist yet: the draft uses 6 Unsplash stock photos (`useStock` true, `foodPhotos`); per the handoff rules the conforming fix is Bean adding cut-outs in the Claude Design project and re-running `.claude/claude-design-handoff/PROMPT.txt`. Bean's 8 `sites/indus-foods/assets/decorative-foods/optimised/*.png` are uploaded to indus-test but nothing references them yet.
- SVG upload sanitiser (`plugins/sgs-blocks/includes/svg-upload.php`) also strips `animateTransform` (the client's own older logo files in `sites/indus-foods/assets/` lose a rotation), C2PA metadata, Inkscape editor data and mesh gradients (no browser paints them). Every uploaded SVG stays marked `sanitised` in the map for that reason.
- The deploy's `prebuild` regenerates the SVG allowlist twin before gates and build, so the parity gate never catches a stale committed twin; recorded as auto-memory `php-source-with-a-generated-js-twin.md`.
- `ResponsiveLogoTest.php` has 19 pre-existing errors (an unstubbed `wp_json_encode`), with or without this session's change.
- The control-gaps plan's Indus snapshot push command was wrong (`--target indus-test`); corrected to the SSH host plus `--target-domain` form `.claude/dev-setup.md` documents.
- A dry run once read three live attachments as gone; two reruns read all twenty live; cause not reproduced (files, map hashes, REST lookups all checked out); guarded by the two-read rule in `8734994e1`.

## State

- Branch `main`, HEAD `8734994e1` (pushed; `origin/main` equal at that time).
- Tests: route suite 1582 of 1583 at `19a2235f7` (the one failure, `tests/tree.test.mjs`'s unreachable-host case, passes alone and imports nothing changed); after later commits: `intake-head` 8, `media-upload` 11, `intake-siteinfo` 14, `clone-coverage` pass; `scripts/tests/test_provision_site_info_from_draft.py` 59; theme-extractor 299; `SvgKsesCaseTest` 3 of 3 with a real wp_kses (`SGS_WP_INCLUDES_DIR` pointing at `C:/Users/Bean/Projects/helpingdoctors.org/public_html/wp-includes`); `node scripts/computed-route/lint.mjs` passes; `capabilities.mjs --gate` exits 0.
- Deployed: indus-test runs `77712861e` (build-deploy, all gates green) plus the Indus snapshot push (Geist Mono face declared, its file serves 200, 23,128 bytes). Later commits change only scripts (computed-route, extractor) and docs, plus the peer's regenerated editor twin, whose content indus-test's built editor bundles already carry (measured: 33 × `pathlength`, 33 × `color-interpolation-filters` in `build/blocks/accordion/index.js` and `before-after/index.js`). mamas-test and sandybrown run `073801bc1` (a peer's deploy).
- indus-test media library: 20 Indus images on 17 attachments (66 to 75, 77, 81, 83, 85, 87, 88, 89; the about-hero drawings are 87 to 89; full map in `sites/indus-foods/build/media-map.json`); a rerun uploads nothing.
- Uncommitted files of this session: none. (`.claude/reports/serverside-render-disabled-audit.*` and others in `git status` belong to other sessions.)

## Open work this session identified (for the docs sweep to place)

- Indus build plan step 18 can start: FR-48-55 site-build script (`scripts/computed-route/site-build.mjs`, not built), with FR-48-58 (built and run) and FR-48-59 (built and run 2026-10-19; title and tagline keys now handed over but not yet applied on indus-test: the next `provision-site-info-from-draft.py --intake` run needs Indus's title rows, and Indus's draft has no `<title>`, so Bean gives `--set` values if wanted).
- Nothing writes a draft `<meta name=description>` to a page excerpt (raised as `missing:head:meta:description`; neither draft has one). Owner: coverage plan Phase 4, site and surfaces.
- `animateTransform` is not on the SVG allowlist (the client's own older logos). Owner: content, media and icons (FR-48-82) if a draft ever needs it.
- The 105 site-and-surfaces capabilities neither draft uses stay with coverage plan Phase 4 (already written in the wave plan's "Not in this plan").
- Optional: a commit-hook check that runs `node plugins/sgs-blocks/scripts/generate-svg-allowlist.js --check` when `helpers-svg-kses.php` is staged (Bean has not asked for it).
