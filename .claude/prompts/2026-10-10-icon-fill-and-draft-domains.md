Invoke /autopilot before doing anything else.

CONTEXT
Two separate jobs for this session. Another session is working on Spec 47's route-accuracy tools at the same time
(scripts/computed-route/skeleton*, answer-sheet*, check-refs, scripts/parity/lib/collect.mjs, pairs.mjs). Stay out of
those files; message that session (ListAgents/SendMessage) before any calibration, Solve run, rebuild, reseed or deploy.

JOB 1: Fill's two icon gaps (Spec 47 Fill, scripts/computed-route/)
The 2026-10-09 skeleton-writer test (.claude/reports/2026-10-09-skeleton-writer-test/REPORT.md §3 and
evidence/fill-report.md, the UNMAPPED rows for each sgs/icon and the iconSize writes) found:
 a. Fill puts the footer social icons' background, border and transition on each generated sgs/icon child instead of
    the row's shared settings (sgs/social-icons childIconBackground, childIconBorderColour/Width/Style,
    childIconTransitionDuration, childIconShapeSize, childIconSize; block.json supports.sgs.elements shape/glyph,
    prefix childIcon). Proven cause, part 1: scripts/computed-route/cache/social-icons.json was calibrated 2026-10-05,
    before the childIcon* rename (675df46e3), so it has no childIcon* settings at all.
 b. Fill writes the icon's 40px box width into sgs/icon iconSize (the glyph is 18px). cache/icon.json ties iconSize to
    the root slot '' while the DB says iconSize is css_element glyph and shapeSize is shape. Cause NOT proven yet.
Steps:
 1. Read .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md §3.4 and lib/fill-skeleton.mjs::expandSiteInfoRows,
    lib/fill-resolve.mjs, lib/fill-read.mjs::PROPS.
 2. (b) Prove why calibration binds iconSize to the root (lib/calibrate.mjs::slotFor on sgs/icon; print the cache
    entry) before changing anything (rules/prove-the-cause-before-fix.md).
 3. Message peers, then recalibrate sgs/social-icons (and sgs/icon if step 2 says so) alone on the local mirror
    (--site local-eye-care; refresh it first with scripts/local-wp/refresh-from-remote.sh local-eye-care eye-care-test).
 4. (a) Fill measures the generated children's draft elements against the row's shape/glyph elements and writes the
    childIcon* settings once on the row, only when every copy agrees; a disagreement is reported, never averaged.
 5. Each fix: a MUST FAIL test first on the real footer social-row shape (tests/fill-*.test.mjs), a negative control,
    then the fix. node --test scripts/computed-route/tests/*.test.mjs stays green.
 Done: Fill on the footer skeleton writes childIcon* on the social row and iconSize 18px, with no UNMAPPED icon rows
 left for settings that exist.

JOB 2: two new Hostinger test domains for the Indus and Mama's Munches drafts
Eye Care's Claude Design draft is hosted read-only at https://mintcream-lyrebird-224487.hostingersite.com (the walker
and Fill read it by URL; surfaces.json draftUrl). Do the same for:
 - Indus Foods: sites/indus-foods/ (entry "Indus Foods Website v2.dc.html"; confirm the entry with Bean if v1/v2 is
   unclear; Mega Menu, EnquiryForm, TradeApplication, _feature and support.js, image-slot.js, indus-logo.js travel with it).
 - Mama's Munches: sites/mamas-munches/ (multi-page: Home.dc.html plus Shop, Product, Basket, Checkout, Confirmation,
   Contact, Help, Gifts, the Home-* variants, SiteHeader/SiteFooter/ProductCard; support.js, store.js travel with it).
Steps:
 1. Use the hostinger MCP (ToolSearch "hostinger", then search for the website-create operation) to create two new
    websites on Bean's hosting plan with Hostinger's free temporary *.hostingersite.com domains. Website creation is
    asynchronous: poll the setups list until each reads completed; never re-send the create.
 2. Upload each draft folder unchanged (static files, no WordPress) so the entry page is the site root; check every
    other page opens by its file name. Never touch the existing sites (sandybrown, indus-test, eye-care-test,
    mintcream-lyrebird, the read-only reference site).
 3. Verify in a browser at 1440/768/375: the draft renders, window.__dcAnnotatedTemplate exists, and elements carry
    data-dc-tpl.
 4. Record the URLs: sites/indus-foods/CLAUDE.md and sites/mamas-munches/CLAUDE.md ("Draft, hosted"), .claude/dev-setup.md
    beside the test-site table, and one auto-memory reference file like eye-care-site-urls.md (plus its MEMORY.md line).
 5. Note in .claude/plans/2026-10-04-spec47-full-coverage.md that Spec 47 stage 5 (a second draft) is unblocked.
 Leave sites/mamas-munches/theme-snapshot.json alone (an uncommitted change awaits Bean).

Commit each job straight to main with explicit pathspecs (branch checked in the same command) and push; /handoff at
the end.
