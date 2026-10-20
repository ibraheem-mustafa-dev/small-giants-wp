Invoke /autopilot before doing anything else.

CONTEXT (plain English)

SGS clones Claude Design drafts into WordPress through the "computed route" (scripts/computed-route/, Spec 48). The Indus Foods build follows .claude/plans/2026-10-11-spec48-indus-build.md. Steps 1 to 17 and 19 are done. This session builds step 18, the site build: one script that creates every page, post, header, footer, drawer, form and mega-menu panel the confirmed page map lists on indus-test, wires the menus and the front page, and does nothing on a second run. Without it no surface has a post to fill, so steps 20 onwards cannot start. FR-48-58 (media upload: 20 images in sites/indus-foods/build/media-map.json) and FR-48-59 (Site Info) already hold. Nothing blocks this step.

STATE (2026-10-20)
- sites/indus-foods/build/page-map.json is confirmed by Bean: 40 rows (23 page, 6 post, 4 sgs_form, 4 sgs_mega_menu, 1 each sgs_header, sgs_drawer, sgs_footer). Every row has "id": null. Each row carries route, slug, title, parent, template, menus (menu, position, parentItem), postType, collection and flags.
- No stage 3 trees exist yet (that is step 21), so every row gets FR-48-55's one-block placeholder tree.
- indus-test runs 4120ef22a. Check with ssh hd "cat ~/.sgs-deploy-marker-indus-test.json". Its only content pages are Spec 48's private calibration page (15) and motion-proof page 60; never touch either.
- scripts/wp-build-page.js already supports --create (it prints the new ID), --post-id and --template. wp sgs header|footer|drawer set-active exists (plugins/sgs-blocks/includes/class-sgs-header-footer-cli-commands.php).
- Another session may be running the route calibration, the gradient seeder fix and the property_equivalents table (prompt ".claude/prompts/After control gaps - route calibration and gradient seeder.md"). It refreshes local-indus from indus-test and may deploy indus-test. Your files do not overlap with its files. Your live writes to indus-test do overlap, so use the serial queue below.

READ FIRST
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-11-spec48-indus-build.md: Phase 4, steps 16 to 19
- C:\Users\Bean\Projects\small-giants-wp\.claude\specs\48-CLONING-SYSTEM.md: grep to "### FR-48-55 " (the script's seven parts and its done-when), "### FR-48-30" (the page map) and "### FR-48-17" (the open item about a run overwriting the confirmed page map). Never read the file whole.
- C:\Users\Bean\Projects\small-giants-wp\sites\indus-foods\CLAUDE.md (the client brief)
- C:\Users\Bean\Projects\small-giants-wp\scripts\computed-route\media-upload.mjs: the nearest precedent (an idempotent live writer with a dry run and --apply, a map file, secrets from .claude/secrets/indus-test.env). Match its shape and conventions.

SKILLS (invoke at the point of use)
- /autopilot first.
- /sgs-wp-engine before touching WordPress: post types, the active-layout pointers, mega-menu panels.
- /wp-wpcli-and-ops when writing the WP-CLI calls (menus, rewrite, options, post update).
- /systematic-debugging if a live call fails or a rerun creates a duplicate.
- /qc-council at the close (three Sonnet raters: idempotence, live safety, spec conformance), then /handoff.

TOOLS

| Tool | Use for |
|---|---|
| ssh hd (alias in .claude/dev-setup.md) | WP-CLI on indus-test, always with --user=Claude |
| node scripts/wp-build-page.js | every post create and update (it builds through the editor and refuses invalid trees) |
| Playwright MCP | check that each menu item and mega-menu panel renders on the live site at 375, 768 and 1440 |
| ListAgents and SendMessage | the serial queue: name the operation before every live write, say when it lands |
| node --test | the script's unit tests (mock the ssh and wp-build-page calls) |

TASKS, IN ORDER
1. Pre-flight (5 min). Run git pull --ff-only, then ListAgents. Read the page map and list which wp-build-page.js flags and WP-CLI commands each row needs. Check that the theme registers the menu locations the rows name (wp menu location list over SSH; this is a read, so no queue is needed).
2. Build scripts/computed-route/site-build.mjs (~45 min, inline), following FR-48-55 parts 1 to 7 (6 does not apply: Indus has no shop).
   - A dry run is the default and prints the plan plus a before-and-after table of every option it would change. --apply writes.
   - Create in dependency order: parents before children, and mega-menu panels before the menu items that point at them.
   - Write each new ID back into its page-map row. Only the id field changes; every one of Bean's confirmed fields stays byte-identical. Afterwards node scripts/computed-route/check-approved.mjs indus-foods must still exit 0.
   - On a rerun, a row with an id is updated by that ID and never created twice. A stored ID that no longer exists stops the run and names the row.
   - Menu items are matched on rerun by (menu, object id), so a second run adds none.
   - Set active pointers through wp sgs <kind> set-active only, never a raw option write.
   - Stay under 400 lines; split helpers into lib/site-build-*.mjs.
   - Add a row to scripts/computed-route/README.md.
3. Tests (~20 min). Add MUST FAIL tests in scripts/computed-route/tests/site-build.test.mjs:
   - a second run plans zero creates and zero changes
   - a missing stored ID stops the run
   - a child row before its parent is reordered
   - a mega-menu item points at its panel's post ID
   - the page map keeps every field but id

   Mutation-check each rule with C:\Users\Bean\AppData\Local\Temp\claude\scratch\mutate.mjs <route dir> <mutations.json> <test file>. Write the mutation JSON with the Write tool.
4. Live run (~15 min). Message peers first. Take a backup over SSH (wp db export into the site's private backup folder, never the web root), then run the dry run, then --apply, then --apply again. The second run must print zero creates and zero changes.
5. Verify the done-when on the live site:
   - every page-map row exists exactly once (wp post list per post type)
   - every menu item resolves to its row
   - each mega-menu item renders its panel (Playwright, open the menu at 1440, and check the drawer at 375)
   - the front page and posts page are set
   - permalinks are /%postname%/
6. Update docs: tick step 18 in the Indus plan with its evidence (the commands and their results). Set Spec 48 FR-48-55's Status, update the "Where it stands" line and update LEDGER Front H.
7. Close: /qc-council, then /handoff. Delete this prompt file in the handoff commit.

GUARDRAILS
- Serial queue: deploys, DB reseeds, npm run build, local-indus refreshes, calibration runs and live-site writes run one at a time across sessions. Before each, ListAgents then SendMessage to every peer naming the operation; after it lands, say so. If a peer is mid-reseed, wait for its "reseed done".
- Never hand-roll tar, scp or rm -rf on the server. Never delete or overwrite indus-test pages 15 or 60.
- In scripts/computed-route, node lint.mjs, node capabilities.mjs --gate and node --test tests/*.test.mjs all pass. fill-entrance is timing-sensitive under load, so re-run it alone before calling it a failure. Also run python scripts/check-no-client-names.py --check.
- Shared worktree: use explicit pathspecs only, never stash, and commit straight to main. If a shared doc (LEDGER, Spec 48, the Indus plan) holds another session's uncommitted edit, stage only your lines, then check git show HEAD -- <file>.
