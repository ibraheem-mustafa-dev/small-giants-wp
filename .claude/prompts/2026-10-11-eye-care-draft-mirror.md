Invoke /autopilot before doing anything else.

TRACK: Claude Design handover standard, Task B5: mirror the live Eye Care site into its draft (plan `.claude/plans/2026-10-10-claude-design-handover-standard.md` B5; spec `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md` FR-48A-11).

CONTEXT Eye Care (sites/eye-care-ward-end/) is a nearly finished live WooCommerce site built in SGS. Its Claude Design draft is the answer key our cloning pipeline is measured against, so it must show what the live site deliberately does. Claude Design cannot open the live site and compare, so Bean decided (2026-10-11) that we edit the draft ourselves, then Bean uploads it back into the Claude Design project. The fresh export sits in `sites/eye-care-ward-end/handoff/` (copied unchanged from `.claude/design_handoff_ward_end_eye_care/` and repackaged with `MANIFEST.json` on 2026-10-11). Its one handoff-check failure is expected: Bean removed "WP Build Gap Map.dc.html" (a planning report), and `animations.json` still lists it; task 4 regenerates the inventory. The live site's URL and credentials are in `.claude/secrets/` (`eye-care-test.env`); the old hosted draft is `https://mintcream-lyrebird-224487.hostingersite.com/`.

READ FIRST
- The plan's B5 paragraph (the full list of alterations, with the commits that made them in the old drafts).
- Spec 48A (all of it) and `.claude/claude-design-handoff/handoff-schema/METHOD.md`.
- `sites/eye-care-ward-end/handoff/READING-DC-FILES.md` (how this draft's code is laid out).
- `sites/eye-care-ward-end/build/qa/divergences.json` (90 Bean-decided differences) and `.claude/plans/2026-10-02-eye-care-fix-register.md` (grep it; it is long).

TASKS
1. Build one checklist of every alteration: the plan's B5 list, plus every divergence entry and fix-register decision that describes the live site deliberately differing from the draft. One row per alteration: what live does, where in the draft (element `data-dc-tpl` and code location), source (commit, D-id or register item). Show Bean the list grouped by page before editing; Bean rules on anything ambiguous.
2. Apply each alteration to the draft in `handoff/` (template and logic class), taking the brand logos from `sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2/assets/brands/` and the wordmark from `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/assets/eye-care-wordmark.png` into `handoff/assets/`. Keep the runtime traps in `.claude/claude-design-handoff/CLAUDE.md` in mind.
3. Verify each alteration in a browser: the draft (served by `scripts/computed-route/lib/draft.mjs::serveDraft`) beside the live page at 375, 768 and 1440; batch the screenshots (one pass, not per edit).
4. Regenerate `animations.json` and `surfaces.json` by METHOD.md, rewrite `MANIFEST.json` with `scripts/computed-route/lib/handoff.mjs::buildManifest` (project "Ward End Eye Care", entry draft "Eye Care Birmingham.dc.html"), and make `node scripts/computed-route/handoff-check.mjs sites/eye-care-ward-end/handoff` pass.
5. Retire the divergence entries the draft now matches (`scripts/computed-route/ledger.mjs`), repoint `plugins/sgs-blocks/scripts/tests/test_sync_business_info.py` off the old v1 draft folder, then delete the three old draft folders and the loose `support.js` in `sites/eye-care-ward-end/`, and `.claude/design_handoff_ward_end_eye_care/`.
6. Tell Bean exactly which files to upload into the Claude Design project (edited drafts, new assets).

GUARDRAILS
- Only Eye Care's draft is edited; never the Indus or Mama's exports.
- Commit straight to main with explicit pathspecs; never stash; never touch `sites/mamas-munches/theme-snapshot.json`.
- `node --test "scripts/computed-route/tests/*.test.mjs"`: only the 3 known skeleton-lint failures ("carries style value brandName").
