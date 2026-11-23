# Brief for a helper working one section of Bean's issue register

This is the standing brief for a subagent that diagnoses one section of `issue-register.md` or `issue-register-round-2.md` (beside this file; IDs carry on across the two, so one ID names one row in `register-findings.md` and `fix-catalogue.md`) and applies its simple fixes. The main session adds the section's name, its posts and its particular notes. Plan: `.claude/plans/archive/2026-11-16-mamas-fix-and-surface-cloning.md`.

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
- A width saved as fixed pixels for tablet or phone that equals the draft's box at exactly 768 or 375 is a leftover of the clone, not a design: the draft's box is fluid. Measure layout items at 600, 900 and 1023 as well as 375, 768 and 1440 (Sign-in 1 showed only between those widths, and a helper that tested 375 and 768 reported it not reproduced).
- A block that is not rendered by PHP (WooCommerce's and core's blocks: `woocommerce/product-filters`, `core/*`) keeps its markup in the post, built by its `save()` from its settings. Changing a setting on such a block with the patch tool leaves that markup stale: the public page still looks right and the block editor reports "Block validation failed". Setting `overlayMode` to `off` on `woocommerce/product-filters` needed the class `is-filter-drawer-disabled` added to its saved wrapper. After any setting change on a non-`sgs/` block, open the post in the block editor and read the console; change the saved markup to what `save()` expects in the same write.
- A `set` of `sgsCustomCss` with `scripts/local-wp/patch-block-attrs.py` replaces the whole string. Read the current string, edit it, write the full result, and count the block's Custom CSS attributes and total length before and after. The tool also re-serialises an empty object `{}` as `[]` inside `sgsMotion`.
- Step every width, not three. A fix that holds at 375, 768 and 1440 can break at 600, 900, 1023, 1024, 1200 and 1366, and at a fractional width such as 1023.4px (a zoomed browser or scaled display), where an integer `max-width: N` and its `min-width: N+1` twin match neither. Run the sweep at 20px steps plus 767, 768, 1023 and 1024, signed out and signed in.
- When a code fix arrives for something a Custom CSS rule works around, remove the rule in the same pass (the Gifts and Shop button pin after `e864e867d`), and check the computed result again.
- A code change that wraps existing markup breaks direct-child selectors: `.sgs-account__auth-panel > h2` stopped hiding WooCommerce's "Login" and "Register" headings when the forms moved into a wrapper. Only a screenshot noticed. Look at the page after any deploy that wraps markup.
- The draft itself can hold the fault: the 16px sideways scroll at 320 (the footer's one-word heading) and the star's drift are in the draft too. Bean's description wins over the draft; say that the draft shares the fault and fix the site.
- Bean sees the site signed in as an administrator, on pages you may not have tested. When an item does not reproduce, test other page types and widths before reporting it.
- Before you write a setting, read its declared type in the block's `block.json` (`plugins/sgs-blocks/src/blocks/<block>/block.json`): `textAlign` and `alignItems` are objects keyed by device (`{"desktop":"center"}`), a container's `justifyContent` is a plain string, and a media block's `alignment` is an object. Five wrongly shaped alignment settings on the basket page were ignored without warning and then stopped two deploys. When you have finished, run the two checks the deploy runs and fix what they report on your posts: `bash /mnt/e/sgs-tmp/mamas-register/round2/audit-mirror.sh local-mamas` in WSL, then `python plugins/sgs-blocks/scripts/audit-post-content-blocks.py E:/sgs-tmp/mamas-register/round2/audit-local-mamas --check --baseline plugins/sgs-blocks/scripts/oldshape-audit-baseline.json`, and `python plugins/sgs-blocks/scripts/migrate-media-system/cli.py check --mirror mamas --active on`.
- Every upper bound in a Custom CSS media or container query ends in `.98px` (`max-width: 767.98px`, `1023.98px`, `919.98px` beside a `min-width: 920px`), never a whole pixel: a zoomed or scaled screen reports a fractional width that a whole-pixel bound misses.
- The WooCommerce Cart and Checkout blocks empty their markup while they load and redraw it, so test anything inside them the way a returning visitor arrives: visit two other pages first in the same browser context, then the page under test. A fresh context per test hid a dead button twice.
- The site's standard arrow is an icon, not the `→` character: the Home hero's first button and the nav drawer's rows show it. A button-shaped control uses that icon through the block's icon settings.
- Bean is sent one image per surface, the draft on the left and the site on the right, at 375, 768 and 1440: make it with `python E:\sgs-tmp\mamas-register\round2\pairs.py` (read its header for the arguments) and leave the images in your scratch folder, not only the separate `-draft` and `-site` files.
- The media tool `plugins/sgs-blocks/scripts/migrate-media-system/cli.py` knows the mirror as `mamas`, not `local-mamas` (`cli.py check --mirror mamas --active on`). A setting saved in the wrong shape stops the next deploy at the old-shape audit and then at the media guard (which also reads revisions); report any such write so the main session can run `cli.py fix`.

- A full-page screenshot taken after scrolling back to the top can show blank image tiles (the footer's Instagram strip): the images are lazy and decode asynchronously, and the capture runs before they are redrawn. They are loaded for a visitor. Before a full-page screenshot scroll the page top to bottom, return to the top with `scrollTo( { top: 0, behavior: 'instant' } )` and wait until `scrollY === 0` plus a second (the site scrolls smoothly, and a capture taken mid-scroll shows the sticky header half-way down the hero), then decode the loaded images only: `[ ...document.images ].filter( ( i ) => i.complete && i.naturalWidth > 0 ).map( ( i ) => i.decode().catch( () => {} ) )` inside a `Promise.all` (calling `decode()` on a lazy image that has not loaded never settles), and never report a blank tile as a defect without a viewport screenshot taken at that part of the page.
- When Bean reports a visible difference that your measurement does not show, measure the screenshots he looked at, pixel by pixel, before saying it does not reproduce (Account 8: the pairs he reviewed had 50, 14 and 11px above the hero label against the draft's 66, 50 and 34px; the page had changed since).
- Every tick box is the browser's own box at 22px in the accent colour with a 10px gap to its label, from one shared stylesheet (`theme/sgs-theme/assets/css/choice-controls.css`, custom properties `--sgs-checkbox-size`, `--sgs-checkbox-gap`, `--sgs-checkbox-accent`). Never restyle a tick box in a page's Custom CSS.
- Light grey text is banned site-wide (Bean, twice). List the computed text colours of any surface you touch; WooCommerce also greys text with `opacity` (its notice links are 70%), which a colour check alone misses.

- The footer carries the gap above it (its first strip's top padding, 112 / 80 / 64px) and that strip has no fill of its own, so a card's offset shadow at the bottom of a page shows over it. Never give that strip a background, and never add bottom padding to a page's last band to clear a shadow.
- The Saved items page (post 105) is a draft on purpose: no visitor can save a product on this site (Bean, 2026-11-18). Do not publish it or link to it.
- A change you ask for in plugin code may not alter another client's site: say so in any code brief (a new option value or an off-by-default setting, never a redefined value or default).

## Hard limits

- Back up before your first write: as root, `wp --allow-root db export /var/www/local-mamas-before-<section>-fixes-<date>.sql`; confirm it is not empty. Keep a copy of each post's content before you change it.
- Write only to the posts, menus and options of your own section on the `local-mamas` database, and to your scratch folder. Other helpers work on other posts of this mirror at the same time: do not touch a post the main session did not give you, and expect the cache to be flushed under you.
- No plugin or theme file, no file in the repo, no commit, no deploy, no push, nothing on a hosted site, nothing on Eye Care or Indus (their local mirrors may be read). Do not print secret values from `.claude/secrets/`.
- Never stack a second fix on a first that did not work: undo the first, then report.

## What to leave behind

In your scratch folder (both files are required: two helpers once finished without them, and the main session then had to rebuild the rows from the posts):

- `findings.md`: one table row per item, in the format of `register-findings.md` (ID | draft → site | cause | proof | layer | fix made or proposed | status: `fixed on local-mamas <date>`, `proposed`, `not reproduced`, `accepted`).
- `catalogue-rows.md`: one row per change you made, in the table format of `fix-catalogue.md` (read its header and its rows dated 2026-11-17), Commit column `settings on the mirror, no code`. One line per row.
- `before/` and `after/` screenshot pairs named `<item>-<width>-draft.png` and `<item>-<width>-site.png`, and the before and after copies of each post you changed.

## What to return

At most 70 lines, verdict first: how many items fixed and proved, how many proposed, how many not reproduced. Then: a table of the fixes (item, setting written, target → site after); the proposals, each with options and your recommendation; every Custom CSS use; anything you noticed that is not on Bean's list, one line each; the backup's path and size; the reversible calls you made.
