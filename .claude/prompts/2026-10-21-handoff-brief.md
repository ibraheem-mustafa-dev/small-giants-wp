# Handoff brief, session 2026-10-21 (Indus step 20 header, states wave, permissions)

Written for the cloud `/handoff cloud` session. Reader has no access to the conversation. Repo: small-giants-wp, branch `main`.

## Tasks and intended outcomes

1. **Queue and DB tag** (done). Wait for the calibration session, confirm `sgs/product-search.resultHoverBackgroundColourHover` reads `css_state` `current` after its reseed: confirmed.
2. **Indus step 20, the header slice** (Spec 48 Appendix B step 20; `.claude/plans/2026-10-11-spec48-indus-build.md` step 20; FR-48-81's last done-when clause: the header's resting and state looks pair with the draft at 375, 768 and 1440 with Bean's eye). Outcome: **code shipped, outcome not yet hit.** The header is structurally Bean's approved one and built on indus-test post 201, but the live pairs still differ (list below). FR-48-81 stays "in build".
3. **nav-bar-menu hover calibration regression** (states-wave plan Remaining item 2): closed by the other session `small-giants-wp-ca` in `b41ea420d` (a caret-off nav link that is also its panel's trigger opens the keyboard's way, so calibration never navigates away). Verified here: `scripts/computed-route/cache/nav-bar-menu.json` `untestedStates` is 0 and all 14 lost settings are present; `cache/nav-bar-menu.refused.json` is gone.
4. **account calibration on a WooCommerce site** (states-wave Remaining item 2): **not achieved.** `node scripts/computed-route/calibrate.mjs --site local-eye-care --client eye-care-ward-end --blocks sgs/account --recalibrate` was refused: the new map loses `chipBackgroundColour`, `chipTextColour`, `discovered:sgsAnimation`, `discovered:sgsAnimationStart`; 41 settings read dead (chip*, progressStep*, guestLine*) against 3 on the old 2026-10-05 map from local-sandybrown. WooCommerce 11.1.2 is active on the local-eye-care mirror, so "no WooCommerce" is not the cause; cause unproven (the dead parts are the logged-in dashboard's chip and progress track and the logged-out guest line). The old map is kept; `cache/account.refused.json` holds the candidate. The run also warned the calibration page (post 668) was not emptied ("the server holds empty content for post 668 (the save was lost)").
5. **Permissions clean-up** (Bean asked mid-session). Project `.claude/settings.json` `permissions.allow` cut from 247 one-off command strings to 4 `Read(//c/...)` path rules; a `deny` list of 12 added (`git stash *`, `git add -A*`, `git add .`, `git push *--force*`, `git push -f *`, `git commit *--no-verify*`, `gh pr create*`, `*--allow-dirty*`, `*--skip-verify*`, `rg *--pre*`, `sed *--in-place*`, `sed -i*`). `.claude/settings.local.json` cut to 7 rules (gitignored). Bean said leave `~/.claude/settings.json` alone. Committed with this brief.
6. **Bean's idea, for the next session** (not started): brainstorm mechanical extraction tooling per handoff file (template through the runtime's `encodeCase`, logic through intake's syntax tree, `READING-DC-FILES.md`/`METHOD.md` as the reading guide, `animations.json`/`surfaces.json` as cross-checks) so the skeleton relies less on the agent over time. Spec 48 §3.4 already names this the code-reader lane (FR-48-7, not built; §6 open question 5).

## This session's commits (all on main, all pushed)

Manifest generator (new; Spec 48 §2 said the file was generated but nothing wrote it): `8802dd22b`, `f0aa6c8c4`, `2fd45d73c`, `91067c88e` (docs), `a64247a20`, `3c72dbe3e` (docs). Indus header first run: `7e08c67a9`. QC council wave 1: `ceaffdb50`, `be62f06af`, `7cd17be8c`, `2b5b51e66`, `630ded9fa`, `60e585700`; header rebuilt on the right skeleton `53dc54360`. Wave 2: `9df4e8518`, `9e1883275`, `0e075939a` (DB overrides), `9398fad31` (nav child slots and collapse point), `6b68330a9` (reseed outputs), `27dba4540` (header wave 2 artefacts). Not this session's (other sessions, same day): `325c711da`, `e191fad0c`, `6dc909124`, `f733fac90`, `5e4fafd50`, `0adc35262`, `d443060dc`, `bbc13ee94`, `22cb341d2`.

## Findings (verified; several changed no file)

- Spec 48 §2 claimed `build/surfaces.json` "is generated from the page map ... and the site-build script writes each target's ID into it"; nothing did. Now `scripts/computed-route/manifest.mjs` / `lib/manifest-build.mjs` write it (states from the handoff record, cross-checked against intake, whose inventory holds no header, menu or footer records; `intakeSurface` links each entry to its intake skeleton; `tree` is `trees/<postType>/<slug>.json`, where `lib/site-build-map.mjs` reads stage 3 trees). Spec 48 §2 and FR-48-55 updated in `91067c88e`/`3c72dbe3e`.
- A served draft (`lib/draft.mjs::serveDraft`) names its root host `Root`; intake's harness names it after the entry component, so keys differ (`Root/39#0` vs `Indus Foods Website v2/39#0`); `scripts/parity/lib/collect.mjs::resolveFinder` matches the root by name. `lib/key-space.mjs` now maps decision and motion keys.
- Fill needs `--allow-external` for a Claude Design draft (React and Babel load from unpkg); without it every target read missing and Fill exited 0. Now a named error (`lib/fill-read.mjs::emptyReadError`), thrown when a request was aborted on an empty width or every width is empty.
- Root cause of the first header run's 308 open rows: `skeleton.mjs propose` passed no surface kind, name, built post or motion, so the `navigation` rule could not fire (19 nodes of buttons and containers instead of Bean's 5). Fixed (`be62f06af`); client-decision attributes were also always dropped (`630ded9fa`).
- `sgs/responsive-logo.logoId` (and Tablet/Mobile), `sgs/nav-bar-menu.featuredItemIds`, `sgs/nav-drawer-menu.featuredItemIds`, `sgs/nav-drawer.closeStyle`, `sgs/diagram-dimension.endX/endY` carried a `css_property` their code does not mean (Spec 48 §5.4 Res 7, open since 2026-10-11). Fixed by overrides in `plugins/sgs-blocks/scripts/attr-classification-overrides.json`; reseeded from a clean worktree at `0e075939a`: `block_attributes` changed exactly those 8 rows (9217 before and after). Res 7 is closed.
- The walker pairs blocks only: a block that draws its children (`sgs/nav-bar-menu`) is never compared item by item, so fewer Solve rows can mean unmeasured; the cropped pairs carry that check.
- Spec 48 Appendix B step 20 includes parts the spec marks not built: binding grouping (FR-48-41), the 1200/1260 breakpoint rule (FR-48-50), gates G0 to G7 (FR-48-64), the R–L verdict half (FR-48-36). Step 20 cannot fully close on today's code.
- `lib/skeleton-rerun.mjs` (intake's offline re-run) does not pass the new handoff states, thresholds and calibration inputs, so intake-generated proposals carry no child slots or `collapsePoint` (only `skeleton.mjs propose` does).

## Header state on indus-test (post 201, the active header)

Tree `sites/indus-foods/build/trees/sgs_header/header.json`: `sgs/site-header` > `sgs/site-header-row` > `sgs/responsive-logo` (`logoId` 81), `sgs/nav-bar-menu` (`ref` 5 = header menu, `collapsePoint` 1024, item slots), `sgs/button` (CTA). Skeleton decisions in `sites/indus-foods/build/skeleton/decisions.json` `surfaces['sticky-header']` (`Root/43#0` logoId 81, `Root/45#0` ref 5). Last Solve: `sites/indus-foods/build/qa/solve/header/2026-10-21-0615/solve-report.md`: open rows 135 to 131, hardcode 12, missing 27, unresolved 44, wrong writes 1 of 4 settings; States 5 pairs, 2 match, 1 differs, 8 unreadable. Cropped pairs (local scratch, not in git) showed at 1440, 768, 375:
1. logo renders about 170px high (draft `height: clamp(54px, 4.4vw, 66px)`; Fill: "sgs/responsive-logo has no setting for height"; the block has a calibrated `maxHeight`): needs a `height` to `max-height` row for a fixed-ratio element in the `property_equivalents` table (`plugins/sgs-blocks/scripts/data/property-equivalents.json`, read by `scripts/computed-route/lib/fill-equivalents.mjs`).
2. header row: nav wraps to two lines and the CTA is clipped; Fill: `sgs/site-header-row` "display flex cannot be held", "row-gap conflict: gap already holds column-gap (one setting, two gaps)", no content width or centring.
3. current item: Home's blue and gold underline missing; the current slot is read but `itemColourCurrent` / the indicator are not written.
4. CTA shows at 375 (draft hides it below 768): FR-48-50 not built.
5. menu label "Contact Us" (page title) against the draft's "Contact" (site-build menu labels).
6. not sticky, no scroll shadow, 57/87px height difference: FR-48-80 (behaviour recognisers) not built; settings exist (`sgs/site-header.headerSticky`, `scrolledOffset`, `shadowScrolled`).
7. the menu binding is a hand decision: no universal carrier from site-build's menu ids into a stage 3 tree yet.

## State

Branch `main`, HEAD `27dba4540` before this brief's commit; `node scripts/computed-route/lint.mjs` passes, `capabilities.mjs --gate` exits 0, `check-no-client-names.py --check` passes. Route tests run this session: 125/125 on the touched files. No code deploy this session; indus-test post 201 holds the wave 2 header tree; the framework DB is reseeded at `0e075939a`. Not committed: nothing of this session's beyond this brief, `.claude/settings.json` and `.claude/plans/2026-10-21-header-slice-council.md`, which are committed with it.

## Docs the cloud session must reconcile (Steps 2 to 7)

- `.claude/plans/2026-10-21-header-slice-council.md`: add a Status section (waves 1 and 2 done with the commits above; the remaining list above as the next wave, items 1 to 7); `skeleton-rerun.mjs` gap.
- `.claude/plans/2026-10-21-surfaces-manifest-generator.md`: every task done; archive to `.claude/plans/archive/` and repoint links.
- `.claude/plans/2026-10-20-states-wave.md` Status "Remaining": item 1 (live pairing) still open with the state above; item 2: nav-bar-menu done (`b41ea420d`), account not done (finding 4 above), cart `panelSlide*` unchanged.
- `.claude/plans/2026-10-11-spec48-indus-build.md` step 20: progress (header structurally right, wave 1 and 2, remaining list); keep the three sub-slices.
- `.claude/plans/2026-10-21-indus-delivery.md` (another session's plan): U0 names `sites/indus-foods/build/header.tree.json`, which moved to `sites/indus-foods/build/trees/sgs_header/header.json`; U0's condition ("the header session's wave 1 committed and its header re-run on the corrected skeleton") is met. Edit only those facts; the rest is that session's.
- `.claude/specs/48-CLONING-SYSTEM.md`: FR-48-81 Status (header structurally right, pairing open, the list); §5.4 Res 7 closed (the 8 rows, reseed `0e075939a`); FR-48-6 Status: child slots and `collapsePoint` for blocks that draw their children (`lib/skeleton-child-slots.mjs`), client-decision attributes applied; §3.4 skeleton writer: `skeleton.mjs` proposes from intake's context through the manifest's `intakeSurface`.
- `.claude/plans/2026-10-12-clone-coverage-foundation.md` Order item 4: still open (FR-48-81 not built).
- `.claude/LEDGER.md` Front M (states wave and Indus header): replace with current status; stay at or under 24,576 bytes (replace text, never add net bytes).
- `scripts/computed-route/README.md`: confirm rows for `manifest.mjs`, `lib/manifest-build.mjs`, `lib/key-space.mjs`, `lib/skeleton-child-slots.mjs`, `skeleton.mjs` exports match the code (lint passes, so likely only wording).
- Memory (local only; the landing step can add it): lesson "the walker pairs blocks only, so a block that draws its children is never compared item by item; fewer Solve rows can mean unmeasured; cropped pairs carry the check".

## Next session's first item

Bean's brainstorm (task 6) via `/brainstorming` in exploration mode, before more header waves.
