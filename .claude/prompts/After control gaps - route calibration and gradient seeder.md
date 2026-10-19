Invoke /autopilot before doing anything else.

CONTEXT (plain English)

SGS clones Claude Design drafts into WordPress through the "computed route" (scripts/computed-route/, Spec 48). "Calibration" builds each SGS block on a local copy of a client's test site and records what each setting paints, and each block's default paint, in scripts/computed-route/cache/. Each file carries readKey, the key of the property list it was read with, so a changed list re-measures on every site. The control-gaps build (plan .claude/plans/2026-10-19-control-gaps-build.md) has changed most blocks' code, so every block must be calibrated again. Two things must land first, because calibration and Fill both read the framework DB's css_property column: (1) The gradient seeder fix: about 296 *Gradient rows hold a non-CSS manifest key as css_property and 82 are NULL, so Fill cannot write a draft's gradient background into blocks such as sgs/container.backgroundColourGradient. (2) Bean approved (2026-10-19) a property_equivalents framework-DB table for three "same look, different setting" cases.

STATE AFTER THE CONTROL-GAPS BUILD (filled in by the control-gaps session, 2026-10-19)
- Deployed: sandybrown runs 96106abc1 (all 12 control gaps; build-deploy.py exit 0, all 97 block.json match live). indus-test, eye-care-test and mamas-test do NOT have the build. Deploying it to indus-test needs Bean's go (the Indus session does not own that push), and it carries sites/indus-foods/theme-snapshot.json's new settings.custom.scrollbar (thumb primary-dark, thumbOnDark #e7d768), highlight and inlinePhoto keys, pushed separately with push-theme-snapshot.py --client indus-foods --target indus-test.
- DB reseeded at: 09b02c958 (its output committed as 9d928c16d), from a detached HEAD worktree. The commits after it change no attribute (manifest absentIn notes and gate scripts only).
- Not touched by this build: no *Gradient css_property and nothing in plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py; task 2 below is unchanged.
- Attributes ADDED (none renamed or removed, so calibration's loss guard should flag none): container pinBelowHeader, pinGap; buybox stickyBar, stickyBarBackground, stickyBarText, stickyBarBorderColour; label endShapeLeft, endShapeRight, endDepth, borderWidth, borderStyle, borderColour, borderColourGradient (label's six bespoke typography controls were removed, not their attributes); form-field-tiles tile description plus tileLabel* and tileDescription* typography and colours; choice-flow-question optionDescription* and optionDescriptionColour; decorative-image widthUnit (opacity default 85 to 100); {prefix}LinkUnderlineColour, LinkUnderlineColourHover, LinkUnderlineOffset on 11 link prefixes in 10 blocks (LinkUnderline gains the value hover); {prefix}TextStrokeWidth, TextStrokeColour, TextStrokeColourHover on 136 typography prefixes in 45 blocks (408 rows; 86 TextStrokeColour rows have css_property NULL because no manifest element claims their prefix, the same pre-existing gap as their TextWrap siblings).
- New blocks or InnerBlocks: sgs/decorative-image (title "Floating layer") now holds inner blocks and its image is optional; it needs a calibration fixture with inner content (a no-image layer holding a label renders a div.sgs-decorative-image--layer). Its rotation row now reads css_property transform.
- New default paint calibration will see: theme scrollbars.css (scrollbar-color on :root and :where(*)), greyscale font smoothing on html, the tiles and choice-flow description defaults in :where(), choice-flow-question intro size and the option button's ground and alignment moved into :where().
- Rich text: every SGS RichText now takes allowedFormats from src/utils/rich-text-formats.js and prints through sgs_rich_text_kses (no style attribute survives); two new formats, sgs/highlight and sgs/inline-photo, save class-only markup. scripts/computed-route/lint.mjs refuses a tree whose content or text holds style=. The route's writer and detector for every added attribute and both formats are recorded in the coverage plan ("Sequencing with Indus").
- Gates changed: inspector-scan rule 24 now walks every file under src/ (raw palette, picker, gradient or input type=color fails); rule 31 openBacklog is 4 (TypographyControls' Outline colour row; resolver fix parked in the control-gaps plan). New fast gates: check-snapshot-scrollbar-tokens, check-snapshot-inline-format-tokens, survey-rich-text-formats, survey-link-underline-family, survey-typography-opt-in-props (each with a self-test). The route test baseline is 1,551.
- Open from the build: the full live check (control-gaps plan Step 9: per-gap test pages at 375/768/1440, the editor canvas, Windows Chrome scrollbar arrows, cropped screenshot pairs for Bean) and the /qc-council on the build's commits run in their own next session, not this one. BorderElementParityTest fails 20 card-grid and brand-strip cases on main since 7c9fe9fa9 (not this build's).

READ FIRST
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-12-clone-coverage-foundation.md: "Order (with the Indus build)", item 2 (d1 to d4, and the calibration run after the control-gaps build)
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-19-fr48-8-declared-values.md: Progress, step 5 and Open
- C:\Users\Bean\Projects\small-giants-wp\.claude\specs\48-CLONING-SYSTEM.md: grep to "### FR-48-8 " and "### FR-48-85" (never read the file whole)

TASKS, IN ORDER
1. Pre-flight (5 min): git pull --ff-only, then ListAgents and SendMessage peers. Confirm the control-gaps build is deployed to indus-test (wp plugin list or a live probe of one new rule, e.g. theme scrollbars.css). If it isn't, ask Bean for the go, then python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test and push the Indus snapshot; never calibrate against an indus-test without it.
2. The d1 gradient seeder fix (~45 min, inline; /sgs-wp-engine, /systematic-debugging).
   - In plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py, where an attrMap manifest_css_key becomes css_property, map each of the eight manifest keys to the property its render paints.
   - Read each key's render in includes/helpers-tokens.php. The 2026-08-27 migration in plugins/sgs-blocks/scripts/migrations/ proved the first three.
   - A NULL gradient sibling takes its base colour attribute's element and background-image.
   - Extend plugins/sgs-blocks/scripts/check-colour-attr-css-property.py to the gradient rows, refusing a css_property that CSS does not have. Give it a MUST FAIL self-test.
   - Commit, ask peers, then reseed from a clean HEAD: git worktree add --detach /c/tmp/sgswt-<timestamp> HEAD (no pipe), confirm git -C <wt> log -1, copy (never link) the five ajv packages into <wt>/scripts/computed-route/node_modules (worktree memory), run python plugins/sgs-blocks/scripts/sgs-update-v2.py there, copy the regenerated tracked files back and commit them whole. npm run build does not reseed.
   - Done when: SELECT css_property, count(*) FROM block_attributes WHERE attr_name LIKE '%Gradient%' GROUP BY 1 shows only real CSS properties, and the gate exits 0.
3. The property_equivalents table (~45 min, inline).
   - Add the table and its JSON seed via plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py.
   - Rows: align-self becomes the parent's alignItems and justify-self the parent's justifyItems, each only when every child of that parent asks the same; height becomes min-height, only when the render then matches.
   - The resolver reads the table only after the direct, discovered and ancestor matches fail (scripts/computed-route/lib/resolve.mjs). fill-resolve.mjs is at 400 lines, so put the new code in a new module.
   - Add MUST FAIL tests: a sibling asking another alignment is never written. Mutation-check each rule.
4. Full Indus recalibration (~45 min of machine time; run it in the background).
   - Back up scripts/computed-route/cache.
   - Run bash scripts/local-wp/refresh-from-remote.sh local-indus indus-test, then the sync-build.sh line in .claude/dev-setup.md.
   - Run node calibrate.mjs --site local-indus --client indus-foods --blocks <every block in cache/indus-test/>.
   - For a refused slot map, check that each named loss is absent from the DB for that block before passing --allow-loss.
   - Done when: every cache/indus-test/*.paint.json and its slot map carry the current readKey. List any audit "setting" verdict still unmatched in the FR-48-8 plan's step 5.
5. If time remains: d2 (a calibration marker for nav-drawer scrimBlur and scrimOpacity, and the resolver writing blur(2px) as the length), then Order item 3 (FR-48-84, site and surfaces).
6. Close: /qc-council (three Sonnet raters, one per angle; verify every finding), then /handoff. Delete this prompt file in the handoff commit.

GUARDRAILS
- In scripts/computed-route, node capabilities.mjs --gate, node lint.mjs and node --test tests/*.test.mjs all pass (1,551 or more). fill-entrance is timing-sensitive under load, so re-run it alone before calling it a failure.
- Run python scripts/check-no-client-names.py --check. Regenerate the gaps report only with node scripts/computed-route/capabilities.mjs --gaps > .claude/reports/2026-10-17-clone-coverage-gaps.md.
- Every new rule gets a MUST FAIL test and a mutation check: C:\Users\Bean\AppData\Local\Temp\claude\scratch\mutate.mjs <route dir> <mutations.json> <test file>. Write the mutation JSON with the Write tool, never a heredoc, because of the backslashes.
- Reseed only from a clean HEAD worktree (sgs-update-v2.py; npm run build does not reseed). Message peers before any reseed, build or calibration run.
- Shared worktree: use explicit pathspecs. If a file holds another session's edit, stage only your lines, commit with git commit -m, then check git show HEAD -- <file>.
