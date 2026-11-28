---
doc_type: plan
status: active
created: 2026-11-25
---

# Clone fixes before 28 November, with the block editor clean-up alongside, in parallel tracks

**Goal and why:** Bean wanted to clone SGS and MIC from Claude Design drafts by 2026-11-28 with no hand fixes. That date passed (it was the day of the MIC networking gala): the drafts could not be cloned in time, so they go up as placeholder sites first (Task 34, Bean 2026-11-28) and cloning resumes after the faults in Task 35 are fixed. The deadline lane (Tasks 1 to 10 and 14 to 16) landed what the clones need; the editor lane (Tasks 11 to 13) is the block editor clean-up Bean approved on 2026-11-25, merged with it. Done for cloning means: an offline reclone of Mama's, Eye Care and Indus improves on every named surface with nothing worse; a timed fresh-site rehearsal passes (it did, 2026-11-28); SGS and MIC have sites to clone onto (they do); the clone faults in Task 35 are fixed; Bean's eye check passes.

**Evidence:** every proposal comes from a read-only investigation dated 2026-11-25, kept in `.claude/reports/2026-11-25-clone-investigations/` (cited as `iN`; their scratch scripts stay in `E:\sgs-tmp\general-cloning\investigate\`), reviewed by three independent reviewers with every finding verified (2026-11-25). Fix groups RF1 to RF10 and the Restore map come from `.claude/plans/2026-11-24-clone-root-fixes.md`; this plan governs where they differ. Worker briefs: `.claude/plans/2026-11-25-land-fixes-tracks/` (`_common.md` plus one per track, and the second-session prompt).

**How it runs:**
- Up to 8 workers per session (Claude Code's limit); the editor lane can run in a second session with its own 8 (Bean, 2026-11-25). Launch order, deadline first: A1, A2, A3, A4, B, C, D, F, L. As slots free: G1, then R1, R2, G2 and S when their branches have merged, then the editor lane W1 to W4. Agent-tool subagents (worker API credits are exhausted).
- Heavy runs (sweeps, browsers, render-check, plugin builds, multi-block record checks) go through `scripts/computed-route/tools/heavy-slot.mjs run`: a first-come-first-served queue kept in the main checkout's `.claude/queue.md` (both sessions and every worker; nobody edits it by hand), two slots, and a third only after a ten-minute wait from the top of the queue when CPU is under 70% busy over a five-second average and 8 GB of memory and 10 GB on C: are free (Bean, 2026-11-25). One heavy job never takes two slots (Bean): a sweep runs inside `run` without `--slot-dir`. A look build runs 2 workers (`SGS_LOOK_JOBS`). A build only to look at or render-check is `npx wp-scripts build --experimental-modules --webpack-copy-php` (two minutes); `npm run build` runs every gate (26 minutes) and is for proving the gates. The full suite runs only in the main session, alone.
- Workers commit on `fix/<label>` in `E:\sgs-tmp\wt-<label>`; temp, the record cache and scratch are on E:. Each branch is proven by its own targeted tests and mutations (no slot) and, only where its evidence is a Fill output on a surface the batch sweep does not fill, one sweep of that surface on the branch alone, compared with the shared main baseline (never a base run of its own); a surface the batch sweep fills is proven there, never by a per-branch sweep. The main session code-reviews each branch, and every first review found 4 to 10 real faults per branch and every second review of the fix commits found 2 to 5 more, so both reviews run before merging. Branches are then merged and proven in batches (Bean, 2026-11-26: per-branch whole suites and base sweeps filled the heavy queue): the reviewed branches merge onto `fix/land-batch-<n>` from `main`; one whole non-browser route suite and one sweep of every surface of all three clients run on it, compared with the shared baseline sweep of the `main` it was cut from; a regression is traced to its branch by the files it touches; then the batch fast-forwards `main`, and its sweep becomes the next baseline. Anything that writes to Mama's live shop (its saved-content migrations) keeps its own scratch-mirror proof.
- After each merge group the main session reseeds the shared DB, regenerates the setting records (`check.py --changed --write`), applies the README text workers report, and runs the merged branches' tests.
- Merge order for the three conflicts: rf9 keeps both sides of `tools/run-tests.mjs`; rf5 before rf6 (`fill-prop.mjs`, `fill-resolve-element.mjs`); rf3 before rf7 (`skeleton-classify.mjs`).
- Test pages (Bean, 2026-11-26): probe and test pages (such as eye-care-test's published page 46, "[probe] trust-bar controls") stay on every site until that site reaches its show state, then all are removed together; nothing removes them before then. The canary's motion-QA fixture pages are not test pages in this sense and are never removed.
- Deploys (Bean, 2026-11-25): Mama's live shop was brought up to date with `main` once, on 2026-11-27 (`86d78be19`), and is paused until this plan is complete; its next deploy repeats the ritual (backup, render-scope from its deployed commit, render-check on the states that lists, basket/checkout/account checks before and after). `eye-care-test` is a test site and deploys with the others.

**Out of scope:** the text-only trust bar style (Bean: not restored); the chrome style choices' repair and "More options" (Task 30); stored conditions and "show when" (Task 29).

**Risks:** C: has about 12 GB free; temp, the record cache and scratch are all on E: now. Tracks B, C and D each edit a different part of `lib/setting-record.mjs`, and C and D different functions of `site_look.py`.

## Where it stands (2026-11-28)

**Landed.** Release batch `fix/land-batch-1` (head `194e815ea`, tag `deadline-proof-2026-11-27`) is merged into `main` with every branch under it, the editor lane (Tasks 11 to 13 and 32) and the clone-fidelity fixes of 2026-11-28 (`a72456d93` to `13b727842`: product ids from the draft catalogue, menu items taking the draft link's words, the gallery's grid and swipe row, the icon list's link underline, product tiles' card rules, shop chips and sort select). `fix/bleed-taps` is not merged by name: it joined the batch squashed as `8a3d99f2d`. Task 33's branches (`fix/php-suite-green`, `fix/php-suite-into-batch`) are not on `main`. Pipeline faults fixed on `main` on 2026-11-28: the foundation's sync step reran only when a built block changed (`f1c43fb40`, `lib/foundation-ports.mjs::syncDigest`), a draft or page load that timed out is made once more (`a7aaffbc9`, `scripts/parity/lib/helpers.mjs::loadOnce`), and five Fill timeouts in parallel runs came from the draft being served by the process that runs `skeleton.mjs::proposeSurface` synchronously (`fac26bd11`, `lib/draft.mjs::serveDraftApart`).

**Deployed** (server markers read 2026-11-28, `ssh hd "cat ~/.sgs-deploy-marker-<target>.json"`): `sandybrown` and `indus-test` run `86d78be19` (2026-11-27 22:15 UTC) and `mamas-test`, the live shop, runs it too (22:26). `eye-care-test` and `eye-care-clone-test` still run `cf6ca94e5` (2026-11-22). `sgs-test` and `mic-test` have no marker: never deployed. `main` is ahead of `86d78be19`; two of its commits change plugin code the sites lack (`82117aca2`: the chip padding control offers the theme spacing sizes; `13b727842`: the shop chips' look), the rest are route, test and doc changes.

**Whole-site run on Mama's (2026-11-28):** the fast whole-site path ran clean on Mama's draft on a scratch copy (`local-mediatest-rc-mm`, port 8131; worktree `E:/sgs-tmp/wt-rehearsal` at `fac26bd11`; both kept for the next cloning session): 23 surfaces, 0 failed, about 72 minutes for the page run. Path: `build-foundation.mjs <client> --site <copy> --through skeletons` with `SGS_LOOK_JOBS=4`; the intake finalise and apply-picks when rows await picks; then `site-run.mjs <client> --site <copy> --stages inventory,propose,fill,build,apply` (default `--jobs 3`). Status file `E:/sgs-tmp/wt-rehearsal/sites/mamas-munches-redesign/build/qa/site-run/2026-11-28T12-03-29/status.json`; side-by-sides (draft against clone, 1440) `E:\sgs-tmp\tmp-batch1\r3-sheet-shop.png`, `r3-sheet-gifts.png`, `r3-sheet-home.png`.

**Carried from the merged branches (each names the task it serves):**
- Task 3: the variant-floor survey of `fix/c-parts` (`c-parts-survey`) was queued; confirm it ran.
- Task 8 (R2, `fix/e2-restores`): an animation whose width condition intake cannot decide still applies at every width (the record schema is the Claude Design handoff contract and refuses a new field, so it needs a schema field or an intake notice row); the stagger is read from a variable named `delay` and an unnamed easing is kept as raw text. Bean marks the new motion review rows: Indus J-05, J-12 and J-13 (rows changed, now unmarked) and Indus A-02, A-12, J-06, J-07, J-08, J-10, J-31, J-45 glare, Eye Care J-15, TR-001, TR-005, TR-006; unmarked rows do not block a clone.
- Task 15 (`fix/s-shop`): `part-look-compare` fails one test only when run outside `run-tests.mjs` (it needs `SGS_NO_SITE`).
- Task 10: the eye checks and pre-deploy checks listed there.

**Decisions this session:**
- Review rounds are proportionate (Bean, 2026-11-26): a build carries its own proof and the main session checks it; an extra review only where a miss is costly and hidden (here: touch hover).
- Calibration was retired mainly for its time (Bean): the site look must win on measured speed. After the deadline: store the per-block source scan (`CK.load_plan`, about 40 s a block, client-independent) in the framework DB at reseed like the setting record, and key each look on its own block's inputs only.
- A parent-page change to an already built, published page is reported and never applied on a site-build rerun; new pages and rows take the page map's parent (main session, rf8 second review).
- A cloned page's parent, and so its web address, follows the draft's own page routes, never its menu (Bean, 2026-11-26): a page row nests under the page row whose own route is the nearest ancestor path of its route, and a flat-routed draft keeps every page top-level. This replaces RF8's section parenting (a menu item linking to its first child) and the older menu-item parenting; Indus's 16 parented pages become top-level (branch `fix/pagemap-draft-routes`, Spec 48 FR-48-30). The rf8 safeguard stands: a parent change to a built, published page is reported, never applied, unless the site build nested it itself.
- The shadow rule stays as set on 2026-11-08 (Bean, 2026-11-26): shadows are never clipped (`plugins/sgs-blocks/scripts/check-shadow-clip.py`), and a sideways scroller uses the reserved `--sgs-shadow-bleed`; the Follow-button fix (`fix/bleed-taps`) only stops the band taking taps.
- Featured nav items stay unwritten until a reader of featured items exists; the variant gate stays (rf1).
- Before each site's next deploy, run render-scope and render-check for G1 (Task 10).
- Follow-up, not blocking: `setting-record/diff.py::compiled_scss` caches compiled Sass by file name and its own source only, so editing a partial can reuse stale CSS in a look (now spread by the look store); fix it together with a setting-record regeneration, since `stamp.py` hashes that module.
- Follow-up, not blocking: `plugins/sgs-blocks/scripts/deploy_ship.py`'s isolation step silently skips a `node_modules` link source that is missing (a deploy from a worktree without `scripts/computed-route/node_modules` then fails later with an unclear error, as Mama's first update attempt did on 2026-11-26); fix it to fall back to the main checkout's folder through the git common dir, or to stop with a clear message.
- Follow-up after the deadline (agreed with the editor lane, 2026-11-26): the setting-record gate (`setting-record-changed-proof`, `changed.py::stale_verdicts`) makes every verdict of a block stale when any of its built CSS changes, so a change to hover rules alone (the editor lane's `fix/x-touch-hover` adds a pressed variant to every hover rule) forces a re-measure of looks that cannot move. Stamp each verdict by the CSS it can reach instead: a resting-state verdict by the stylesheet with state rules (`:hover`, `:active`, `:focus-visible`, the pressed class) stripped, a state verdict by the full stylesheet. Until then, a state-only change restamps resting verdicts and re-measures state verdicts.
- Follow-up, not blocking: `plugins/sgs-blocks/scripts/db-consistency/tests/test_f6_consistency.py` fails 4 `TestCheck5VariantReseed` tests on main (`no such column: slot_value`); pre-existing. And `sgs/card-grid`'s allowedBlocks list lives in `components/ProductTemplateCanvas.js` (a constant), which the scrape cannot read, so the DB says it accepts any block; reading it would make card-grid a `rowBlocks` block in the route, a behaviour change to decide after the deadline.
- Follow-up, not blocking: the route's missing-look line (`lib/paint-gate.mjs::missingPaintLine`, printed under `--allow-missing-paint`) drops the builder's reason that `assertPaints` already has (`calFor( b ).paintMissing`), so a sweep cannot say why a look failed; pass it through and update `tests/paint-allow.test.mjs`. The sweep's comparison (`lib/route-sweep.mjs`) matches fault lines by text, so a fault whose candidate list is reworded reads as one gone and one new; matching by kind and node would stop those false failures.
- Follow-up, not blocking: `main` fails 88 PHPUnit tests (Task 33).
- Follow-up, not blocking: 82 old `content-setting:` gap rows in `scripts/computed-route/data/clone-coverage.json` name settings the DB no longer holds as content; `content-coverage.mjs` (run by hand only) flags them.

## Deadline lane

### Task 1: A safe machine (main session)
Done (2026-11-25): `904c517dc` (heavy-run slots, temp guard on route tools), `4c4451ba6` (a gate that failed on the git-ignored Stackable copy), `~/.claude` `78ce309` (API workers' temp on E:), C: clear-out (5.2 GB), plugin `npm ci` and build passing.

Left: a `tests/lib/tmp.mjs::scratchDir` helper and a detector that moves the 85 route tests (and the plugin's Python checks) that leave temp folders behind onto it. This runs after the branches merge, because it rewrites test files the tracks edit. <!-- dangling-ok: files a worker creates or that exist only on its branch -->

Status: the safe machine is done (slots with a shared queue, one slot per job, the temp guard, 2-worker look builds); the `scratchDir` helper and its detector are still left.

### Task 2: Land tonight's branches (main session; tracks A1 to A4)
Why: the built parts are proven, but four branches change behaviour nobody asked for, six branches carry stale markers, and rf5's Custom CSS log check would fail every real run (`i1`, review).

Changes: A1 (rf1, rf6), A2 (rf2, rf3, rf4, rf5, rf8), A3 (rf7, rf9, rf10), A4 (cart-trigger), per their briefs; then merge in the order above.

Done when: all 11 branches are merged, the full suite passes, `check-mutation-lists.mjs` shows 0 new, and A4's render-check shows Mama's header unchanged.

Depends on: none. Status: done. All 11 groups and the second-review fixes are on `main` (rf7, A4 and `fix/review2-rf1910` through batch 1).

### Task 3: Track C, every block part findable
Brief `c-parts.md` (`i15`, `i5`).

Done when: 0 `paint pairing` lines on Mama's and Eye Care's drawers, and Mama's trust-strip icon colour is written.

Depends on: none. Status: done, on `main` through batch 1 (Mama's drawer 8 to 0, Eye Care 2 to 0). Left: its variant-floor survey (`c-parts-survey`) was queued; confirm it ran.

### Task 4: Track D, choice readings, underlines, the account merge
Brief `d-readings.md` (`i10`, `i7`).

Done when: Mama's 7 underline ties and Eye Care's 2 trust-bar ties resolve.

Depends on: none. Status: done, on `main` through batch 1 (both reviews' fixes, the look-read speed cuts and the narrower render cache key `948f5b97d`); the account merge was proven on a scratch mirror and its saved-content sweep belongs to Task 10.

### Task 5: Track G1, render fixes on every site
Brief `g1-render.md` (`i9`, `i13`): card grid logos, product card placeholder, brand strip `sizes`. "Even visual size" and "Trim empty edges" moved to Task 11 (W4).

Depends on: none. Status: merged (`dfa7e821b`: the card grid's frame owns padding, height and ratio, the product card's no-photo box takes the photo's Height or Ratio, the brand strip sizes from Logo max width); visual proof `E:\sgs-tmp\general-cloning\build\g1-render\VISUAL-CHECK.md`. Render-scope and render-check before each site's next deploy are in Task 10.

### Task 6: Track G2, the trust bar's clone-relevant fixes
Brief `g2-trustbar.md` (`i12`, `i3`): one stored marquee value, Fill writing the draft's marquee condition, icon fill colours reaching path fills (also `sgs/icon`, `sgs/button`, `sgs/cart`). The editor features moved to Task 11 (W4).

Depends on: rf1, rf5, rf6 merged (all three are). Status: done, on `main` through batch 1 (`fix/g2-trustbar`), including the trust bar's `edit.js` change for the stored marquee value; the ticker migration of saved content is a sweep in Task 10.

### Task 7: Track B, a look the clone cannot place never stops the run
Brief `b-runstop.md` (`i2`).

Depends on: none (the account shadows wait for Task 4). Status: merged (`fix/b-runstop`).

### Task 8: Restore tracks R1 and R2 (briefs `e1-restores.md`, `e2-restores.md`; not the editor lane's Stages E1 and E2)
Briefs `e1-restores.md`, `e2-restores.md` (`i6`). Commits already ported on the branches are skipped.

Depends on: R1 needs rf4 and rf10 merged (both are); R2 needs rf4 and rf6 (both are). Status: R1 (`fix/e1-restores`) and R2 (`fix/e2-restores`) are done and on `main` through batch 1; R2's open items are under "Carried from the merged branches".

### Task 9: Track F, the mega menu
Brief `f-mega.md` (`i4`; Bean approved both rules, 2026-11-25).

Depends on: none. Status: done, on `main` through batch 1; Bean eyeballs Eye Care's brands cards (Task 10).

### Task 14: Track L, the layout items
Brief `l-layout.md`: the Indus hero unwrap and grid tracks, Mama's header order, the logo `maxHeight`, social icon sizes, and `sgs/media` ratio and height. These are the five items of the never-started `layout` branch.

Depends on: none. Status: done, on `main` through batch 1 (`fix/l-layout`); the batch sweep (indus-foods/home) proved it, and Bean eyeballs the Indus hero (Task 10).

### Task 15: Track S, the shop pieces MIC needs
Brief `s-shop.md`: `part-look.mjs` as a run stage, a template card's `variantStyle` and related cards, the buy-box layout write (FR-48-60).

Depends on: rf7 and rf8 merged (both are). Status: done, on `main` through batch 1 (`fix/s-shop`, including the basket drawer's and the signed-in account's looks written by Fill); its sweep of Eye Care shop, product and my-account and Mama's my-account held the baseline's fault counts.

### Task 16: SGS and MIC sites (main session, with Bean)
Why: a clone can only target a site that exists, and SGS and MIC had none. Bean approved setting both up on 2026-11-27.

Changes: once a draft is in `sites/<client>/handoff/`, add the site to `deploy_common.py` `TARGETS`, `scripts/computed-route/calibration-targets.json` and `.claude/secrets/`, create its local mirror and run `provision-site-mail.py` (all done for both sites, below).

Done when: `site-run.mjs` can target each site (met).

Status (2026-11-28): the sites are set up. `sgs-test` (`lightgreen-whale-237337`) and `mic-test` (`palegreen-goose-450620`) run WordPress 7.1.5 with admin `Claude`, an application password and FluentSMTP over the studio mailbox with the test redirect on; both are in `TARGETS` (kind `test`) and `calibration-targets.json`, with mirrors `local-sgs` (8085) and `local-mic` (8086) refreshed from them, and `site-run.mjs::prepareSite` resolves all four. The drafts never arrived and no clone ran. Bean's decision (2026-11-28): it was too late to clone before the MIC gala, so the drafts go up as placeholder sites (Task 34) and cloning follows Task 35. Left, for the clone: the drafts into `sites/<client>/handoff/`, then the first `build-deploy.py --target sgs-test,mic-test` and a `sync-build.sh` of each mirror; MIC's own mailbox when it exists.

### Task 10: Combined proof, rehearsal, deploys (main session)
Done (2026-11-27 to 2026-11-28): the tag `deadline-proof-2026-11-27`; render-scope and render-check from each site's deployed code to the batch on `local-mamas` (33 states differ), `local-indus` (8) and `local-mediatest-eyecaretest` (eye-care-test's own pages), runs `E:/sgs-tmp/render-check/runs/20261127-104834-local-mamas`, `-121649-local-indus` and `-142523-local-mediatest-eyecaretest`, every difference explained; the deploy of `86d78be19` to `sandybrown`, `indus-test` and `mamas-test`; the timed whole-site run on Mama's (see "Where it stands"). The cart-trigger sweep must have run on the three deployed sites, since its deploy guard (`deploy_cart_trigger_guard.py`) refuses a deploy while old trigger keys remain; whether the account merge, ticker and spacing sweeps were applied on them is not recorded here, so run each sweep's dry run on the three sites and apply where it finds rows.

What the render checks showed, for the Eye Care deploys still to come: G1's product card fix gives a card with no photo ("Photo to come") the photo cards' picture shape, so Eye Care's home and shop grids are 87px a row shorter at 320 and the product page's related grid 29px taller at 1440; G1's media padding fix removes a 14px padding that shrank the brand strip's Gucci and Prada logos to near-invisible; the trust bar band's inert `grid-template-columns` and the trust bar icon's `--custom` class change nothing visible; the cart trigger sweep on eye-care-test needs `apply accept-conflicts` (its header `sgs_header` 199 has a 999px pill radius and an unset icon radius, so the merged 999px changes nothing visible). Four states are unreached on both sides, not by the batch: product search, checkout and signed-in checkout at 910 and 955 (the order summary collapsed), and order received (the seeded order's item text). Mama's two visible fixes are live (sign-in and register buttons `#F9CF6E` with a `#3A2A22` border; Add to basket 64px tall).

Left:
- Deploy `eye-care-clone-test` (`build-deploy.py --target eye-care-clone-test`) and, when its own finishing stream is ready, `eye-care-test` (never from a clone): each after a DB backup, with the saved-content sweeps in this order (cart trigger, account merge, ticker and marquee bars, a dry run of `plugins/sgs-blocks/scripts/sweep-builtin-button-attrs.php` and of `plugins/sgs-blocks/scripts/sweep-spacing-attrs.php`, applied where the dry run finds rows), and after Task 33 merges so the Instagram icon change is checked on `sgs_footer` 182 and `sgs_drawer` 203. Refresh `eye-care-test`'s read-only mirror first if its content changed (its scratch mirror is `local-mediatest-eyecaretest`, port 8130, registered in the gitignored `calibration-targets.local.json`; if it is gone: `scratch-mirror.sh create local-eye-care local-mediatest-eyecaretest 8130`, then `refresh-from-remote.sh local-mediatest-eyecaretest eye-care-test`, then `scratch-mirror.sh target local-mediatest-eyecaretest eye-care-test`, each through `heavy-slot.mjs run`).
- Before any site's next deploy, render-scope from its deployed commit to the build it will run (`mamas-test`, `sandybrown` and `indus-test` now run `86d78be19`).
- Before Eye Care's deploys: check its account menu (`fix/nav-link-sweep` reaches every account menu and any page-number nav); look at a post-grid carousel, a trustpilot carousel and a wishlist strip on a site that has one (`fix/bleed-size`; no mirror page holds them); run the read-only query for saved `sgs/text` presets (`post_content REGEXP 'wp:sgs/text [^>]*is-style-(quote|caption|lead)'`, retired with `sgs-text-variations.php`) to confirm none exist.
- Bean's eye checks: Eye Care's brands cards (Task 9) and the Indus hero (Task 14).
- Press the Follow along button above Mama's footer gallery at 375px on touch, including a real iPhone (Safari: the hand-off cannot be proven in an emulator), and on every site's scrolling rows check the desktop scrollbar drag, the wheel over the gaps, a touch swipe starting in a gap and keyboard focus (`fix/bleed-taps`); and press the footer credit link (`.sgs-business-attribution`) on touch on Mama's and Indus. Not recorded as done after the 2026-11-27 deploy.
- In Eye Care's home reclone, check that the hero's three labels stay in the hero and are not made an `sgs/trust-bar` (Bean saw that on 2026-11-26; the committed `sites/eye-care-ward-end/build/skeleton/home.skeleton.json` is from 2026-11-02, so it is unconfirmed). If it happens, the rule that placed the bar (`data/skeleton-decisions.json::rules.trustBar` or `headerStripBar`) needs a negative control for a hero's label run.
- Reclone Eye Care and Indus offline (Mama's ran on 2026-11-28), one per mirror, then `site-run.mjs --only` on the named surfaces.
- For each shop client (Mama's, Eye Care, then MIC), run part-look's live `--verify --strict` on a scratch copy; it is a standalone command, not a run stage, and a shop is not done until it passes.

Done when: every named surface improves and none gets worse, and Bean's eye check passes. Then clone SGS and MIC, after Tasks 34 and 35.

Depends on: Tasks 34 and 35 for the SGS and MIC clones. Status: the proof, the three deploys and the timed run are done; the Eye Care deploys and the checks above are open.

## Editor lane (merged into `main` with release batch 1)

### Task 11: Stage E1, shared components and packages
Briefs:
- `w1-editor-shared.md`: markers, inner section, Background sections, reset component. Bean approved the inner section's look as built (2026-11-26, screenshots `E:\sgs-tmp\general-cloning\build\w1-shared\shots\`), so Stages E2 and E3 may adopt it.
- `w2-editor-packages.md`: separators package, shape dividers.
- `w3-editor-switcher.md`: element switcher, border and shadow upgrades, carousels.
- `w4-trustbar-editor.md`: the trim list (one owner), the trust bar's lean layout and editor fixes, brand strip "Even visual size", "Trim empty edges".

Status: done and merged into `main` through `fix/w-stage2` and batch 1 (2026-11-27). Render-check on Mama's showed only the trust bar band's inert `grid-template-columns` dropping, with identical pixels.

### Task 12: Stage E2, codemods across blocks (1 worker, after Task 11)
Brief: `w5-editor-codemods.md` (base `fix/w-stage1`, Stage E1 combined; Pass 1 writes every list and stops for Bean).
- Only each tab's first panel opens (19).
- The 30 reset-only `ToolsPanel`s and the 61 media menus get the small reset; standard menus stay (20).
- Every block moves onto the shared spacing panel, including the 8 Dimensions blocks (12).
- Kit colours join the main Colour panel, shown only when the feature is on (13), on blocks with 12 or fewer base colours; a colour-count detector lists the blocks over 12 and checks Stage E3's per-part rule, so nothing moves twice.
- The 30 `MediaElementPanel` mounts inside a parent group (26 block files, W1's report) render in their place on first select.
- Label-less `ResponsiveOverride` mounts get their labels.
- `sgsFocusRests` and the button's `focusStyle` stay as they are (Bean, 2026-11-25): retiring them would change focus behaviour on all three clients, Mama's live shop included, for more work than it saves.
- The "Keyboard focus" switch moves out of its own panel on 85 blocks into a block-wide row at the top of the shared Hover panel; the 4 blocks with hover colours but no Hover panel show it in Colour, and the 3 with no hover value hide it (Bean, 2026-11-25). Only the control moves: the attribute, its behaviour and saved content are unchanged, so no site renders differently.

Status: done and merged into `main` through `fix/w-stage2` and batch 1 (2026-11-27); every detector's check exits 0, the editor census over every block is clean, and render-check on Mama's (36 states) renders the same.

### Task 13: Stage E3, per-block owners (up to 4 workers, after Task 12)
Briefs: `w-e3-shared.md` (rules every owner follows; base `fix/w-stage2`, Stages E1 and E2 combined), `w6-editor-commerce.md` (shop and choice-flow blocks, product card), `w7-editor-nav.md` (menus, header, footer, responsive logo), `w8-editor-content.md` (cards, reviews, media, gallery), `w9-editor-text.md` (text, structure and form blocks, the shared target switchers, retired styles, the three document corrections). Every block folder has one owner; each owner's Pass 1 writes its lists and stops for Bean.

Each owner applies, for its blocks:
- The register's moves (`i24`) and the placement rule.
- Dissolving repeated panels, including gallery Layout into Spacing and Border.
- Look controls and renames (`i20`, `i23`; Google reviews' "Style" panel; choice flow picture size as a default plus override).
- More-than-12-colour part panels: on a block with more than 12 base colours, each part's colours sit in that part's panel and the main Colour panel keeps only whole-block colours (Bean, 2026-11-25; triggered by the count, checked by Stage E2's detector).
- Adopting the switcher, separators, dividers and layout preview.
- Retiring the heading, quote and text styles, and correcting Spec 32's native-supports rule, Spec 35A Part G and `plugins/sgs-blocks/CLAUDE.md` rule 1.

Named owners:
- **Product card:** a Settings "Buttons" panel (None, One or Two); one "Button style" panel with a switcher; Frame card removed; margin into Spacing; one shared shadow.
- **Nav drawer menu and nav bar menu:** dissolve "List layout"; rename to "Mega menu"; "Accordion open and close" moves to the Settings tab.
- **Responsive logo:** one "Logo" panel with "Use a different logo on dark backgrounds".

Done when (Tasks 11 to 13): the browser panel census (`i8`) shows 0 single-control panels outside the register's kept cases, 0 duplicate titles, 0 order changes after a tab switch, and only first panels open; render-check shows no front-end change except the listed fixes.

Status: done and merged into `main` through batch 1 (2026-11-27): `fix/w6-commerce` (shop and choice-flow blocks, product card), `fix/w7-nav` (menus, header, footer, responsive logo) and the `sgs/text` style retirement (`fix/w9-text-styles`); the editor lane closed 2026-11-27. W8 (content) and the rest of W9 (text, structure, forms) are Task 30. The shared codemod is `plugins/sgs-blocks/scripts/move-control.js` and the nav detector `plugins/sgs-blocks/scripts/check-nav-panels.py`. Before each hosted site's next deploy, the `sgs/text` query in Task 10 confirms no saved post holds a retired preset.

### Task 32: Touch hover, the press model (editor lane; merged)
Why (Bean, 2026-11-26): on a touch screen a touch shows the hover look at once, clears it when the finger lifts, slides off or scrolls, for every site by default. Research note: `C:\Users\Bean\.claude\memory\research\2026-11-26-touch-hover-standard.md`.

Built on `fix/x-touch-hover`: `plugins/sgs-blocks/assets/js/touch-input.js` sets `.sgs-pressed`; every `:hover` and `:active` rule gets a pressed twin through the `scripts/hover-guard/` transform, `includes/helpers-hover-state.php`, the motion and media emitters, theme CSS and hand-written CSS; the per-site setting stays as overrides ("Show on tap", "Off on touch screens"); Spec 38A FR-38A-17 states the model. `b05551a0e` gave the footer credit link (`.sgs-business-attribution .sgs-business-info__link`) press feedback first; the model supersedes it.

Done when: the render-check on Mama's shows no desktop difference (met: 8 states, only timing flakes), and `/code-review` has run (done).

Follow-up: `changed.py` selects all 104 blocks for a hover change, so a state-only change restamps resting verdicts and re-measures the 82 hover and press browser verdicts in 18 blocks until verdicts are stamped by the CSS they can reach (see the decision above).

Status (2026-11-27): merged into `main` through release batch `fix/land-batch-1`, with the `/code-review` fixes (`ed98a577e`: a touch half dedupes only against an identical rule; a `(hover:hover)` query keeps its other conditions; `scripts/hover-guard/sources.js` recurses `assets/`; second-finger and pen tests). Tests: jest 50/50 and `TouchHoverContractTest` 43/43.

### Task 33: Make the PHP suite pass
Why (2026-11-27): main fails 88 of its 5,322 PHP tests, 82 failures and 6 errors in 16 classes (list and first messages: `.claude/reports/2026-11-27-php-suite-main-failures.md`). While they stay red the suite cannot warn about an accidental change: touch hover broke 16 pin tests, and they surfaced only when the release batch's failures were compared with main's test by test. Biggest groups: `BorderElementParityTest` 54 (a border fact such as "heading: desktop radius not printed"), `FoldScanTest` 8, `ChoiceControlsTokenTest` 4, `IconBrandGlyphTest` 4, and `MotionPauseRenderTest` and `PostGridCardSettingsTest` 3 each (render.php cannot load `SGS\Blocks\Motion\Sgs_Motion_Targets` in the test bootstrap).

Done when: `vendor/bin/phpunit` (run from `plugins/sgs-blocks`) passes on main, each failure fixed at its cause (code, test or bootstrap), never by deleting the test; then the suite joins a gate tier so a red test blocks a build.

Status (2026-11-28): all 88 fixed on `fix/php-suite-green` (worktree `E:/sgs-tmp/wt-php-suite-green`, head `5e24cfc9b`, off main `f6bd1d929`), and NOT on `main`: `git merge-base --is-ancestor 5e24cfc9b main` fails. `fix/php-suite-into-batch` (head `a3bc88e88`) is a trial merge of it onto the batch and is not on `main` either; it adds two commits `fix/php-suite-green` lacks, `1973bcfa2` (re-pins the 26 render pins the merge left from before the touch-hover pressed twins, FR-38A-17) and `a3bc88e88` (`TouchHoverContractTest` fails with the child's own error when its PHP process dies), so merge `fix/php-suite-into-batch`, not `fix/php-suite-green` alone, and rerun `BorderElementParityTest` (take the newer border-element goldens). 84 of the 88 were the test bootstrap, stale test data after intended changes (each cited by commit) and isolation from other tests' file-scope stubs, with no rendered output changed. The last 4 (`IconBrandGlyphTest`) were a real regression from `700160a26`: a brand-source Instagram in brand-glyph mode lost its gradient when its glyph became a filled mark. By Bean's ruling (2026-11-27) the gradient now paints the filled glyph (`includes/helpers-svg-gradient.php::sgs_icon_gradient_css` gains a `fill-glyph` source; `src/blocks/icon/render.php` and `src/blocks/icon/glyph.js` follow). This changes live output on Eye Care's hand-built site only: the footer (`sgs_footer` 182) and mobile drawer (`sgs_drawer` 203) Instagram icons on the eye-care-test copy, built from `sites/eye-care-ward-end/build/footer.tree.json` and `mobile-menu.tree.json` (flat #E4405F becomes the brand gradient); no other mirror's published content changes. Icon and social-icon classes pass (351 tests); the full suite runs again at merge, then joins a gate tier; check eye-care-test's footer and drawer before its next deploy.

### Task 34: Placeholder sites for SGS and MIC (Bean, 2026-11-28)
Why: it was too late to clone SGS and MIC before the MIC gala on 2026-11-28, so the Claude Design drafts go up as placeholder sites now and cloning follows (Tasks 10 and 35). The SGS placeholder must still work as a site: a working Cal.com booking, working contact forms and the Evertreen viewer (Evertreen's tree-planting forest widget; the current Vercel site's embed is documented in `sites/small-giants-studio-v2/`). The printed QR codes `smallgiantsstudio.co.uk/hello` and `/mic` must keep forwarding (302; LEDGER Summary).

Done when: the SGS placeholder takes a test Cal.com booking, a contact form submission arrives in the studio mailbox, and the Evertreen viewer renders; the MIC placeholder is live; `/hello` and `/mic` still forward. Where each placeholder is hosted is decided by the session that builds it.

Depends on: none. Status: not started.

### Task 35: Clone faults seen on Mama's clone, fixed before SGS and MIC (2026-11-28)
Why: the whole-site run on Mama's draft (see "Where it stands") came out clean, but the side-by-sides show faults that will hit SGS and MIC too. Fix each at its cause in the route, with a test that fails first (negative control), then reclone Mama's on the scratch copy (`local-mediatest-rc-mm`) and compare with the draft.
- Product card button: every card shows "Pick flavours"; the draft gives each product its own button words and style ("Build your box", "Add to basket", "Choose amount"; outlined or filled).
- Card tilt and frame are lost.
- Shop filter chip order differs from the draft, and the Subscribe chip is missing.
- Gifts page step-number circles lose their yellow fill.
- Home "Build your Zookie" section is broken.
- Trust strip shows no icons.
- Shop "Find a gift" banner is too tall.
- Hover underline thickness and offset are not written.
- `scripts/computed-route/tests/fill-part-look-modes.mutations.json` entries 1 and 2 are stale.
- The gallery fix (`d41d19aac`) changed the brand-strip set pairing; unconfirmed whether worse: check on the reclone.
- Not explained and not recurring: the plugin build once took 70 minutes; one shop Fill exited 2 with no message in a 2-job run. Note: the Trustpilot badge on the scratch copy is the mirror's plugin, not the clone.

Done when: each fault is gone on a Mama's reclone with Bean's eye check (FP-13), and the two stale mutation entries are fixed.

Depends on: Task 36's review first, for the code these touch. Status: not started.

### Task 36: Code review of 2026-11-28's pipeline fixes, before the next deploy
Why: `f1c43fb40`, `a7aaffbc9`, `fac26bd11` and the dl-* branches (`a72456d93`, `2c895cedd`, `dad970e6c`, `d41d19aac`, `e1bf0426e`, `07c58416c`, `0daa091ef`, `ca44870f6`, `13b727842`, `82117aca2`, `04c59c53e`, `368f415c3`) were proven by their own tests but not code-reviewed, and every earlier first review of a branch found 4 to 10 real faults.

Done when: `/code-review` (medium) has run on those commits and each confirmed fault is fixed. The next deploy carries `13b727842` and `82117aca2`, the two plugin commits `main` has beyond `86d78be19`.

Depends on: none. Status: not started.

### Task 29: Deferred: stored conditions and "show when"
The setting record stores each setting's conditions in the DB (it computes them in `instances.py::preconditions` and discards them, `i17`). One shared rule hides controls with nothing to affect. The hand-built-panel and dead-control detectors (`i17`) and the panel census become gates, with an allowlist for the 10 intentionally different panels.

### Task 31: Site look built only from what differs per client
Why: a full site look build takes 21 to 53 minutes per client and is the main cost of every proof and new clone; most of it is the same for every client (measurement 2026-11-26, `.claude/reports/2026-11-26-site-look-cost.md`). Read first: that report, Spec 48 §3.2, `plugins/sgs-blocks/scripts/site-look/site_look.py`. Changes, in order: (1) build the value-forms and content facts once per framework, not per client (57% of renders, 1% of the output, identical across the three clients; spot-check a client with custom CSS), about 45% off a client build; (2) replace the all-block prepare calls (`lib/skeleton-context.mjs::prepareProposalLooks`, `lib/route-sweep.mjs::prepareSweepLooks`) with a build of the chosen and rule-named helper blocks only (a client uses 46 to 53 of 104 blocks, a surface 5 to 18); (3) trial building state and discover looks once with placeholder tokens and substituting each client's token values (98.4% of colour differences are the client's own palette colours; lengths scaled from the base font size need their own rule). Touches: site_look.py, the prepare calls, the look key. Done when: a cold build of one client takes under 8 minutes on a quiet machine with identical Fill output on the baseline surfaces. Depends on: the shared look store (merged `747193830`). Status: parts (1) and (2) are on `main` through batch 1 (`fix/look-fast`; proof run 2: 312 of 312 looks byte-identical across the three clients, measured saving small: one block 61 s the current way, 56 s warm, 76 s cold); part (3) stays after the deadline.

### Task 30: Later
Deferred from W6 and W7 (Bean, 2026-11-26): the product card's buttons as one job (the "Buttons" count setting `ctaButtons` with its sweep and route writer, together with the one "Button style" panel and its Button 1 / Button 2 switcher); the choice-flow picture size change (a stored-value sweep on Eye Care); and per-part colour panels for every block over 12 colours, done once across all of them, including the button kit's separate "Colour" panels (`src/components/KitColourPanel.js`), which stay as they are until then (Bean, 2026-11-26 evening); in the same pass, the two menus' hover colour choices (Text, Background, Border, Link text and Link background on hover, `src/shared/nav-menu-panels/ColourRowExtras.js` in each Colour row's `after` slot, with their long help lines) leave the Colour panel's default view: Bean's direction is the Hover panel beside the colour-change duration, or folded away by default if they stay in Colour (Bean, 2026-11-26 evening) (account, buybox, cart, product card, choice flow, both menus and the rest of `check-colour-count.py`'s list). Also deferred from W6 and W7 (Bean, 2026-11-26 evening): the "Size in row" panel (`src/blocks/extensions/child-sizing.js::ChildSizingPanel`, one control on nearly every block) folded into each block's own layout panel by one change in the shared file (`i14-moves/moves.md` has the per-block targets); the product card onto the shared Spacing and Shadow panels in one saved-card rewrite (Bean, 2026-11-26 evening): its padding (`cardPadding`, `cardPaddingTier`) into the shared Spacing panel, which reads only `padding` and `margin`; its shadow into one shared `ShadowControl` panel with the Normal / Hover switch, which needs real resting-shadow attributes in place of the stylesheet's built-in resting shadow and the `showShadow` switch, and the hover shadow (`cardShadowHover` and its colour) on the shared keys. One sweep covers both on every saved card (11 on Mama's live shop: backup, render-check and live basket check first); until then "Shadow on hover" sits under "Resting shadow" in "Card padding & shadow" as a stopgap; buybox "Show each variation" (`pickerVariationSwatch`) moved from Settings "Colour tiles" to Styles "Picker styling"; the one-control Settings "Shadow" panels on mega-aside, social-icons and whatsapp-cta moved to Styles, and site-header's one-control Styles "Layout". W6 keeps the register moves, the Frame card removal (saved use 0 on every client site; 3 posts on the sandybrown canary) and the product card's canvas preview; W7 keeps everything except its menus' colour panels. <!-- dangling-ok: i14-moves is a scratch investigation under E:/sgs-tmp/general-cloning/investigate -->

Before W8 and W9 reuse the Stage E3 tools (from the W6 review, 2026-11-26): `plugins/sgs-blocks/scripts/move-control.js::scopeCheck` accepts any name the target component already binds as the same attribute, so a target with its own differently derived local of that name would silently read the wrong value (no instance in W6's 17 moves); add a self-test case and refuse it. `check-editor-census-e3.py::has_label` matches labels by substring, so a short label such as "Style" or "Layout" passes a move check wherever it lands; match exactly after normalising. The buybox "Add to cart button" panel now shows three lift controls together (the kit's Hover lift length, the kit's shadow-lift switch and the block's own Lift on hover); find which drive the front end and remove the rest. `check-nav-panels` runs source rules only in the gate (the census rules need `--census`); add a census gate when the editor census runs in the build.

Stage E3's W8 and W9 owners (Bean, 2026-11-26): their briefs stand as written (`w8-editor-content.md`; `w9-editor-text.md` minus the `sgs/text` style retirement, done in Task 13), and run after W6 and W7 have merged.

Repair the chrome style choices (elevated, boxed, borderless and similar on 9 blocks) so each writes real settings, as card grid's do.

Note only: "More options" (a collapsed section at the foot of a giant panel for rarely used controls) is more effort than it is worth for now (Bean, 2026-11-25).
