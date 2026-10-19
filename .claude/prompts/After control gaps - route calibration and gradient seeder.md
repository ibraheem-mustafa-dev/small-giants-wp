Invoke /autopilot before doing anything else.

CONTEXT (plain English)

SGS clones Claude Design drafts into WordPress through the "computed route" (scripts/computed-route/, Spec 48). "Calibration" builds each SGS block on a local copy of a client's test site and records what each setting paints, and each block's default paint, in scripts/computed-route/cache/. Each file carries readKey, the key of the property list it was read with, so a changed list re-measures on every site. The control-gaps build (plan .claude/plans/2026-10-19-control-gaps-build.md) has changed most blocks' code, so every block must be calibrated again. Two things must land first, because calibration and Fill both read the framework DB's css_property column: (1) The gradient seeder fix: about 296 *Gradient rows hold a non-CSS manifest key as css_property and 82 are NULL, so Fill cannot write a draft's gradient background into blocks such as sgs/container.backgroundColourGradient. (2) Bean approved (2026-10-19) a property_equivalents framework-DB table for three "same look, different setting" cases.

STATE AFTER THE CONTROL-GAPS BUILD (the control-gaps session fills this in when it finishes)
- Deployed: <which sites run which commit; whether indus-test has the control-gaps build>
- DB reseeded at: <commit>
- Anything this route work must know (changed attributes, blocks, gates, open items): <…>

READ FIRST
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-12-clone-coverage-foundation.md: "Order (with the Indus build)", item 2 (d1 to d4, and the calibration run after the control-gaps build)
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-19-fr48-8-declared-values.md: Progress, step 5 and Open
- C:\Users\Bean\Projects\small-giants-wp\.claude\specs\48-CLONING-SYSTEM.md: grep to "### FR-48-8 " and "### FR-48-85" (never read the file whole)

TASKS, IN ORDER
1. Pre-flight (5 min): git pull --ff-only, then ListAgents and SendMessage peers. Confirm the control-gaps build is deployed to indus-test; if it isn't, stop and say so.
2. The d1 gradient seeder fix (~45 min, inline; /sgs-wp-engine, /systematic-debugging).
   - In plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py, where an attrMap manifest_css_key becomes css_property, map each of the eight manifest keys to the property its render paints.
   - Read each key's render in includes/helpers-tokens.php. The 2026-08-27 migration in plugins/sgs-blocks/scripts/migrations/ proved the first three.
   - A NULL gradient sibling takes its base colour attribute's element and background-image.
   - Extend plugins/sgs-blocks/scripts/check-colour-attr-css-property.py to the gradient rows, refusing a css_property that CSS does not have. Give it a MUST FAIL self-test.
   - Commit, ask peers, then reseed from a clean HEAD (cd plugins/sgs-blocks; npm run build, in PowerShell).
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
- In scripts/computed-route, node capabilities.mjs --gate, node lint.mjs and node --test tests/*.test.mjs all pass (1,541 or more). fill-entrance is timing-sensitive under load, so re-run it alone before calling it a failure.
- Run python scripts/check-no-client-names.py --check. Regenerate the gaps report only with node scripts/computed-route/capabilities.mjs --gaps > .claude/reports/2026-10-17-clone-coverage-gaps.md.
- Every new rule gets a MUST FAIL test and a mutation check: C:\Users\Bean\AppData\Local\Temp\claude\scratch\mutate.mjs <route dir> <mutations.json> <test file>. Write the mutation JSON with the Write tool, never a heredoc, because of the backslashes.
- Reseed only from a clean HEAD. Message peers before any npm run build or calibration run.
- Shared worktree: use explicit pathspecs. If a file holds another session's edit, stage only your lines, commit with git commit -m, then check git show HEAD -- <file>.
