# Brief for a helper working one section of Bean's issue register

This is the standing brief for a subagent that diagnoses one section of `issue-register.md` (beside this file) and applies its simple fixes. The main session adds the section's name, its posts and its particular notes. Plan: `.claude/plans/2026-11-16-mamas-fix-and-surface-cloning.md`.

## The job

Mama's Munches has a hand-finished WordPress build (the local mirror `local-mamas`, http://localhost:8084, a copy of the hosted test site) that differs from its design draft (`sites/mamas-munches-redesign/handoff/`). The owner, Bean, listed the differences. For each item of your section: reproduce it, prove its cause, then either fix it (if it is a simple fix, defined below) or propose a fix. The main session checks your evidence before anything reaches Bean or the hosted site, so an unproven guess is worse than "not found": say what you measured, what you read in source, and what you infer.

Where Bean writes "both are wrong" or asks for something the draft does not have, his description is the target, not the draft.

## Simple fix or proposal

Bean's rule (2026-11-17): simple fixes are made as you go; everything else is proposed.

**Fix it yourself** when all of these hold: the cause is proved by measurement or by the saved settings; the fix is an existing block setting, a menu item, or page content on the mirror; and the target is clear (the draft's value, or what Bean wrote). Also yours to do without asking:

- Every mention of subscriptions ("Subscribe & save", the subscription FAQ question, subscription cards and menu items) is removed: Bean deferred subscriptions and wants nothing about them shown. Where removing one leaves a hole in a layout (a card in a row of three), propose the replacement instead of inventing content.
- The page's missing entrance animations, from `entrance-survey.md` (beside this file): each listed block gets the recipe given there, and you measure that it plays once on scroll into view and that the element is fully visible under reduced motion.
- A one-off look that no setting can hold may use the block's own Custom CSS channel (`sgsCustomCss`, with `sgsCustomCssId` and a plain-English `sgsCustomCssNote`; `&selector` is the block's own doubled scope class, see `plugins/sgs-blocks/includes/class-custom-css-scoper.php`), but only after a framework DB query shows no attribute drives that property on that element. List every use in your report.

**Propose, do not do,** when the fix needs plugin or theme code, a new block setting, a rebuilt section, new wording or content Bean has not given, a choice between reasonable options, or anything Bean phrased as a question. For each proposal give the options with their trade-offs and your recommendation.

## Where things are

- **Draft:** serve it with a copy of `E:\sgs-tmp\mamas-register\drawer\serve.mjs` (it uses the repo's `serveDraft`; read it first) on the port the main session gives you; stop it when you finish. Do not use `draft-viewer.mjs` (it opens a visible browser). This local server may not load the draft's web fonts: never report a font-family or text-width difference without checking the draft's source.
- **Mirror:** WordPress in WSL at `/var/www/local-mamas`, files owned by `www-data`. Run WP-CLI through a script file: write a bash script in your scratch folder and run `MSYS_NO_PATHCONV=1 wsl -d Ubuntu -u root -- bash /mnt/e/sgs-tmp/mamas-register/<section>/<script>.sh`, with `sudo -u www-data wp ...` inside (inline quoting through Git Bash loses `$` and backslashes).
- **Writing block settings:** blocks with a `cr-ref-…` class take `python scripts/local-wp/patch-block-attrs.py --site local-mamas --post <id> --patch <file.json> [--dry-run]` (format at the top of `scripts/local-wp/patch-block-attrs.php`; it backs the post up, refuses an attribute the block does not declare, and writes as an administrator so Custom CSS survives). Blocks without one: copy `E:\sgs-tmp\mamas-register\drawer\fix.php`, which parses the post's blocks, matches by type and attributes, dry-runs with match counts, then writes with `wp_update_post`. Always dry run first.
- **Block facts:** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, css_property, css_element FROM block_attributes WHERE ..."`; block source in `plugins/sgs-blocks/src/blocks/<block>/` (`block.json`, `render.php`, `style.css`, `view.js`); tokens in `sites/mamas-munches-redesign/theme-snapshot.json`; motion in `plugins/sgs-blocks/includes/motion/` and Spec 38 / 38A under `.claude/specs/`.
- **Browser measurement:** Playwright is in the repo; copy the import line and setup from `E:\sgs-tmp\mamas-register\drawer\p1.mjs`. `E:\sgs-tmp\mamas-register\drawer\cards4.mjs` lists every stylesheet rule that matches an element and sets a property, with its stylesheet: the quickest way to see which rule wins.
- **Your scratch folder:** `E:\sgs-tmp\mamas-register\<section>\` for scripts, measurements and screenshots; never the repo or the system temp folder.

## Method, per item

1. Reproduce beside the draft at 1440, 768 and 375, and at any width or state the item names (hover, open, selected, mid-animation). Save a "before" screenshot pair. If it does not reproduce, say so with the values you measured; check a WooCommerce page as well as a plain one before concluding.
2. Find where the site's value comes from and name it exactly: `post <id>, block <name>, attribute <attr> = <value>`, or `path/file.css` with the selector (cite code by symbol or selector, never by line number).
3. Name the layer: site setting, block bug (wrong for any site), missing setting (prove it with the DB query), new behaviour (Bean asks for more than the draft), or draft shares it.
4. If a setting "works on another page", put the two blocks' saved attributes side by side and report only what differs.
5. Fix or propose, by the rule above. After a fix: `wp cache flush`, measure again at the same widths and states, and save an "after" pair. An item is fixed only when the measured values match the target.

## What this site has taught so far

- Of the first 40 items, all but two were settings that had never been set. Before calling anything a block bug or a missing setting, list the block's existing settings that touch the same thing: a proposed code change was dropped because the block already had a setting for the effect (`itemTextShiftHover`).
- A value saved in a shape the block does not read is ignored without warning: a corner radius saved as top/right/bottom/left where the block reads topLeft/topRight/bottomRight/bottomLeft.
- A motion easing token that is not a real token is dropped without warning (`Sgs_Motion_Field_Types::tokens()`); use a real token or a raw `cubic-bezier(...)` string, and check the computed result.
- On pages whose `<body>` has the class `woocommerce` (Shop, Product, Basket, Account), WooCommerce's rule `.woocommerce img { height: auto; max-width: 100% }` beats the size rule of an unwrapped SGS picture. A framework fix was tried and reverted; the sanctioned fix is Custom CSS `&selector { height: …; }` on that picture.
- A hero's `contentWidth` does nothing while its left and right padding are set; a container with a maximum width and no side padding touches the screen edges between that width and the tablet breakpoint.
- An accordion's open colour, open shadow, icon rotation and category labels are separate settings (`itemBackgroundOpen`, `itemShadowOpen`, `itemShadowOpenColour`, `iconRotation`, and each item's `category` with `showCategoryEyebrow`).
- A hover that is set on every device when the draft only has it on desktop takes per-device values in the motion state (`devices.tablet`, `devices.mobile`).
- Bean sees the site signed in as an administrator, on pages you may not have tested. When an item does not reproduce, test other page types and widths before reporting it.

## Hard limits

- Back up before your first write: as root, `wp --allow-root db export /var/www/local-mamas-before-<section>-fixes-<date>.sql`; confirm it is not empty. Keep a copy of each post's content before you change it.
- Write only to the posts, menus and options of your own section on the `local-mamas` database, and to your scratch folder. Other helpers work on other posts of this mirror at the same time: do not touch a post the main session did not give you, and expect the cache to be flushed under you.
- No plugin or theme file, no file in the repo, no commit, no deploy, no push, nothing on a hosted site, nothing on Eye Care or Indus (their local mirrors may be read). Do not print secret values from `.claude/secrets/`.
- Never stack a second fix on a first that did not work: undo the first, then report.

## What to leave behind

In your scratch folder:

- `findings.md`: one table row per item, in the format of `register-findings.md` (ID | draft → site | cause | proof | layer | fix made or proposed | status: `fixed on local-mamas <date>`, `proposed`, `not reproduced`, `accepted`).
- `catalogue-rows.md`: one row per change you made, in the table format of `fix-catalogue.md` (read its header and its rows dated 2026-11-17), Commit column `settings on the mirror, no code`. One line per row.
- `before/` and `after/` screenshot pairs named `<item>-<width>-draft.png` and `<item>-<width>-site.png`, and the before and after copies of each post you changed.

## What to return

At most 70 lines, verdict first: how many items fixed and proved, how many proposed, how many not reproduced. Then: a table of the fixes (item, setting written, target → site after); the proposals, each with options and your recommendation; every Custom CSS use; anything you noticed that is not on Bean's list, one line each; the backup's path and size; the reversible calls you made.
