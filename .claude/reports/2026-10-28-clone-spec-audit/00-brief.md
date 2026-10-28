# Cloning-tool spec audit: shared brief for every rater (read fully)

Repo: `C:/Users/Bean/Projects/small-giants-wp`. READ-ONLY: edit no file, write to no site, commit nothing, never type any `git stash` command. Never read a file over 1,000 lines whole: `grep -n` to the section, then read that range (Spec 48 is 1,854 lines).

## The end-goal (Bean, verbatim intent)

SGS is a WordPress block framework whose cloning tool turns a client's Claude Design draft into a real, working SGS site, for any client (a restaurant, a wedding planner and a law firm alike). A draft is a Claude Design handoff folder (HTML/JSX `.dc.html` files, `store.js`-style logic, `tokens/*.css`, and parseable records such as `handoff/surfaces.json`, `MANIFEST.json`, `animations.json`), never WordPress or WooCommerce markup: that the draft has no SGS/WooCommerce blocks is the whole point. Cloning is NOT copying markup: the tool must RECOGNISE the structure of each part of every draft surface and PLACE the correct working SGS / WordPress / WooCommerce block or CPT in its place, carrying over the draft element's CONTENT and its CSS/LOOK, on the RIGHT CONTAINER: a blank-canvas page, a CPT (header, footer, drawer, mega menu, modal, form, choice flow; posts as content), a site-own theme template copy (which replaces the theme's default design), or a WooCommerce piece inserted where the draft's equivalent region sits. Bean is a non-coder business owner who QCs only; he is tired of patchwork fixes for gaps that "should never have existed": the purpose of this audit is one complete, proven list of where the tooling does not do what its specs say, so the next fix pass is planned once against the spec instead of guessed at by sessions ignorant of it.

Context: three clients are cloned today (Indus Foods: a trade food distributor, no shop; Mama's Munches: a bakery shop; Eye Care Birmingham: an optician shop with a lens configurator). Their real artefacts are in `sites/<client>/handoff/` (the draft) and `sites/<client>/build/` (page-map.json, surfaces.json, skeleton/, trees/, qa/ reports); clients: `indus-foods`, `mamas-munches-redesign`, `eye-care-ward-end`. Local mirrors (read-only for you): local-indus http://localhost:8083, local-mamas http://localhost:8084, local-eye-care http://localhost:8081 (use `curl -6`; WSL read-only `wp` via `wsl -d Ubuntu -u root -- bash -lc 'cd /var/www/<site> && wp ... --allow-root'`).

## Sources a finding may cite as PROOF THE FEATURE IS PLANNED (one is required, quoted)
- `.claude/specs/48-CLONING-SYSTEM.md` (the cloning system), `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md` (the handoff folder).
- `.claude/claude-design-handoff/`: `CLAUDE.md`, `PROMPT.txt`, `handoff-schema/METHOD.md`, `handoff-schema/READING-DC-FILES.example.md`, `handoff-schema/README.template.md`, `handoff-schema/surfaces.schema.json`, `manifest.schema.json`, `animations.schema.json`.
- The surface type's own spec: 01 theme (`01-SGS-THEME.md`), 02 blocks (`02-SGS-BLOCKS.md`), 04 forms, 27 WooCommerce (`27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`), 36 navigation, 37 header/footer builder (also modal), 42 form CPT, 43 choice flow; `.claude/rules/framework-principles.md` (FP-n); project `CLAUDE.md`.

A wish, a "best practice" or your own idea is NOT a finding. If no source plans it, drop it.

## Where the tooling lives (cite file::function for every finding)

`scripts/computed-route/` (README.md lists every file and export: grep it; intake.mjs + lib/intake-*.mjs = draft reading, census, page map, skeletons; manifest.mjs + lib/manifest-build.mjs = surfaces.json; site-build.mjs + lib/site-build-*.mjs = posts, menus, options, catalogue, template copies; lib/skeleton-*.mjs = recognising draft parts into blocks; fill.mjs + lib/fill-*.mjs = writing content and look into block settings; lib/content-coverage.mjs; site-run.mjs = the per-surface driver; content-sync.mjs), `scripts/wp-build-page.js` (builds a tree through the editor), `scripts/parity/` (the walker that compares draft and live), `scripts/local-wp/` (mirrors, push-to-remote). Block capabilities: the framework DB, READ-ONLY (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT ..."` or `sqlite3` with `file:...?mode=ro`), `python ~/.claude/hooks/wp-blocks.py` (the /wp-blocks search), and block source `plugins/sgs-blocks/src/blocks/<block>/{block.json,render.php,style.css}`. Never claim a block lacks a capability without checking these.

## Three layers to audit for EVERY surface type in your remit

1. BLOCK/PIECE + CONTAINER: is the draft part recognised and the correct working block/CPT/template/WooCommerce piece placed, on the container the spec names?

2. CONTENT: is the draft's text, list items, links, media, labels, options carried into the block's settings (not left at defaults, not a static copy where a binding/working source is specified)?

3. CSS/LOOK: is the draft element's look (colours, type, spacing, sizes, borders, shadows, states, motion, responsive values) carried into the block's settings per the value matrix (Spec 48 §10, FR-48-36..50), not left at framework defaults?

## A finding counts ONLY with all of this
- ID (your prefix + number), surface type, layer (1/2/3).
- SPEC: file + section/FR id + a short verbatim quote proving the behaviour is required.
- CODE: the file::function where it should happen, and PROOF it does not: the exact grep/command and its output line, or the real artefact showing it (a tree/skeleton node, a live page's HTML, a site-check result line) with path. "I could not find it" is not proof: show where you looked and what is there instead.
- Severity: FATAL (the clone does not work or sits on the wrong container: cannot buy, submit, open, navigate), MAJOR (visible fidelity loss or content left at a default/placeholder), MINOR.
- A concrete fix: the shared mechanism to change (file::function), never a per-client patch; say which other surface types the same fix covers.

Already known and being tracked (confirm with your own evidence and extend if you find more, but do not re-report as new without new evidence): the single-product template is a static copy of the draft's sample product with no `sgs/buybox` and no product bindings (FR-48-60; Spec 27 parts split unbuilt); no mechanism links a draft button to the modal/choice flow it opens (Eye Care "Add my prescription", "Which size am I?"); modal and choice-flow surfaces are walked against `/` (`site-run.mjs::liveAddress`); Phase 3 loop 2 list in `.claude/plans/2026-10-23-cloning-tool-completion.md` (grep "### Phase 3 loop 2").

## Return exactly (plain text, no grades, no in-character one-liners)

(1) STRENGTHS: brief, where the tooling does match the spec (keeps you honest).

(2) MUST-FIX: findings, worst first, each in the format above.

(3) SHOULD-FIX: same format.

(4) MISSING: whole capabilities the specs plan that have no code at all (same evidence rules).

(5) A list of every spec section you read and every code file you inspected, so a verifier can retrace you.
