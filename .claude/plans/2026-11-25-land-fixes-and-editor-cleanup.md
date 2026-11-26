---
doc_type: plan
status: active
created: 2026-11-25
---

# Clone fixes before 28 November, with the block editor clean-up alongside, in parallel tracks

**Goal and why:** Bean must clone SGS and MIC from Claude Design drafts by 2026-11-28 with no hand fixes. The deadline lane (Tasks 1 to 10 and 14 to 16) holds what the clones need. The editor lane (Tasks 11 to 13) is the block editor clean-up Bean approved on 2026-11-25; it builds alongside but merges only after the deadline proof. Done for the deadline means: tonight's branch work and the clone root fixes are on `main`; an offline reclone of Mama's, Eye Care and Indus improves on every named surface with nothing worse; a timed fresh-site rehearsal passes; SGS and MIC have sites to clone onto; Bean's eye check passes.

**Evidence:** every proposal comes from a read-only investigation dated 2026-11-25, kept in `.claude/reports/2026-11-25-clone-investigations/` (cited as `iN`; their scratch scripts stay in `E:\sgs-tmp\general-cloning\investigate\`), reviewed by three independent reviewers with every finding verified (2026-11-25). Fix groups RF1 to RF10 and the Restore map come from `.claude/plans/2026-11-24-clone-root-fixes.md`; this plan governs where they differ. Worker briefs: `.claude/plans/2026-11-25-land-fixes-tracks/` (`_common.md` plus one per track, and the second-session prompt).

**How it runs:**
- Up to 8 workers per session (Claude Code's limit); the editor lane can run in a second session with its own 8 (Bean, 2026-11-25). Launch order, deadline first: A1, A2, A3, A4, B, C, D, F, L. As slots free: G1, then R1, R2, G2 and S when their branches have merged, then the editor lane W1 to W4. Agent-tool subagents (worker API credits are exhausted).
- Heavy runs (sweeps, browsers, render-check, plugin builds, multi-block record checks) go through `scripts/computed-route/tools/heavy-slot.mjs run`: a first-come-first-served queue kept in the main checkout's `.claude/queue.md` (both sessions and every worker; nobody edits it by hand), two slots, and a third only after a ten-minute wait from the top of the queue when CPU is under 70% busy over a five-second average and 8 GB of memory and 10 GB on C: are free (Bean, 2026-11-25). One heavy job never takes two slots (Bean): a sweep runs inside `run` without `--slot-dir`. A look build runs 2 workers (`SGS_LOOK_JOBS`). A build only to look at or render-check is `npx wp-scripts build --experimental-modules --webpack-copy-php` (two minutes); `npm run build` runs every gate (26 minutes) and is for proving the gates. The full suite runs only in the main session, alone.
- Workers commit on `fix/<label>` in `E:\sgs-tmp\wt-<label>`; temp, the record cache and scratch are on E:. Each branch is proven by its own targeted tests and mutations (no slot) and, only where its evidence is a Fill output on a surface the batch sweep does not fill, one sweep of that surface on the branch alone, compared with the shared main baseline (never a base run of its own); a surface the batch sweep fills is proven there, never by a per-branch sweep. The main session code-reviews each branch, and every first review found 4 to 10 real faults per branch and every second review of the fix commits found 2 to 5 more, so both reviews run before merging. Branches are then merged and proven in batches (Bean, 2026-11-26: per-branch whole suites and base sweeps filled the heavy queue): the reviewed branches merge onto `fix/land-batch-<n>` from `main`; one whole non-browser route suite and one sweep of every surface of all three clients run on it, compared with the shared baseline sweep of the `main` it was cut from; a regression is traced to its branch by the files it touches; then the batch fast-forwards `main`, and its sweep becomes the next baseline. Anything that writes to Mama's live shop (its saved-content migrations) keeps its own scratch-mirror proof.
- After each merge group the main session reseeds the shared DB, regenerates the setting records (`check.py --changed --write`), applies the README text workers report, and runs the merged branches' tests.
- Merge order for the three conflicts: rf9 keeps both sides of `tools/run-tests.mjs`; rf5 before rf6 (`fill-prop.mjs`, `fill-resolve-element.mjs`); rf3 before rf7 (`skeleton-classify.mjs`).
- Deploys (Bean, 2026-11-25): Mama's live shop is brought up to date with `main` once now (backup, render-scope from its deployed commit, render-check on the states that lists, basket/checkout/account checks before and after), then paused until this plan is complete. `eye-care-test` is a test site and deploys with the others.

**Out of scope:** the text-only trust bar style (Bean: not restored); the chrome style choices' repair and "More options" (Task 30); stored conditions and "show when" (Task 29).

**Risks:** C: has about 12 GB free; temp, the record cache and scratch are all on E: now. Tracks B, C and D each edit a different part of `lib/setting-record.mjs`, and C and D different functions of `site_look.py`.

## Where it stands (2026-11-26, afternoon)

`main` carries the merged branches below; each was code-reviewed twice, its review faults fixed and its tests and mutations proven. The next batch, `fix/land-batch-1` (worktree `E:\sgs-tmp\wt-land-batch-1`; holds cart-trigger, f-mega and l-layout so far, setting-record tests 22/22, no new stale mutation entries), is proven against the baseline sweep of `main` at `ea46d5b3b` (`E:\sgs-tmp\general-cloning\baseline-ea46d5b3b`, queued; its worktree `wt-baseline-ea46d5b3b` was moved to `main` `747193830` before it started). The earlier baseline `E:\sgs-tmp\general-cloning\baseline-main` (at `58b2b773c`) is superseded by it.

**Merged on `main`:** rf10, rf5, rf3, rf2, rf4, rf9, rf1, rf6, rf8, `fix/pagemap-draft-routes` (`161c5a8b9`: a page's parent follows the draft's own routes; Indus's 16 menu-parented pages are top-level, and on `indus-test` they move to top-level addresses with no redirect at the next site build), B (`fix/b-runstop`, so `properties` plus `lib/css-families.mjs::paintedProps` is the one multi-property mechanism and L rebases onto it), G1 (`dfa7e821b`), `fix/main-regressions` (the guard `tests/intake-committed-current.test.mjs` fails when a committed intake record is out of date), `fix/form-pairing-test`, `fix/nav-look` (the site-look Reader keeps 8 pages least-recently-used, so the `sgs/nav-bar-menu` look builds in about 0.64 GB; `prepareLooks` retries only a failure that looks like running out of room), the fill-diagram fix (`d270e7a49`: the in-page measurer takes `PX_TOL` as an argument), the shared site-look store (`747193830`: looks are reused across checkouts from `E:/sgs-tmp/look-store` by a content key that now also covers the cascade reader, the bridge and its imports, the framework DB with its WAL, and the php, node and sass versions), and the second-review fixes of rf2, rf3, rf4, rf5 and rf6. The shared framework DB was reseeded for rf5 (`block_attributes.owns_css`). The full suite on `main` (browser tests included, `E:\sgs-tmp\tmp-fullsuite\suite.log`) had 7 failures; each failing file passes on `main` at `d270e7a49`, so the only known failure left is the timing-sensitive font-wait test (`MUST FAIL (b): the font wait reads a late font loaded`).

**Deploys are blocked on every target** until `fix/verdicts-refresh` lands: the full-tier gate `setting-record-changed-proof` fails because 17 blocks' browser verdicts (`plugins/sgs-blocks/scripts/setting-record/browser/verdicts/*.json` `scriptHash`) are stale on `main` too. Nothing was deployed on 2026-11-26; Mama's live shop still runs the build at `ed5effd01` (`wt-mamas-deployed`).

| Branch / job | Worktree under `E:\sgs-tmp` | State |
|---|---|---|
| `fix/review2-rf1910` | `wt-review2-rf1910` | second-review fixes of rf1, rf9 and rf10 built; three mutation runs running (logs `E:/sgs-tmp/general-cloning/build/review2-rf1910/b2-*.log`); then batch 1 |
| `fix/f-mega` | `wt-f-mega` | done: two reviews and their fixes; batch 1; Bean eyeballs Eye Care's brands cards |
| `fix/cart-trigger` (A4) | `wt-cart-trigger` | done: two reviews and their fixes, plus a temporary read-only deploy guard (`deploy_cart_trigger_guard.py`) that refuses a deploy while saved content still holds the old trigger keys (options and postmeta included, JSON-escaped and serialised forms); batch 1. Live order: backup, copy the sweep to the server, dry run, apply, deploy |
| `fix/c-parts` | `wt-c-parts` | review fixes done and rebased; its variant-floor survey (`c-parts-survey`) queued; then batch 1 |
| `fix/l-layout` | `wt-l-layout` | done (tip `6a09a2a87`): first and second review fixes, the hero's `contentWidth` taken from the capped wrapper; proof is the batch sweep (indus-foods/home); Bean eyeballs the Indus hero |
| `fix/d-readings` | `wt-d-readings` | second-review fixes and look-read speed cuts done; the account merge proven on a scratch mirror (written, read back, idempotent, 0 old names left); look-build timing running (`d-readings-looktime`); merges before the deadline clones only if it adds under 15 minutes per site |
| `fix/rf7-shop-forms` | `wt-rf7-shop-forms` | rebased; first-review faults fixed (head `85cff1029`: wizard form widths, prefill per loop copy and per form, the form-element "beside" rule, proposal-level tests; 945/945 related tests); next: second review of the fix commits, then batch |
| `fix/s-shop` | `wt-s-shop` | Track S (Task 15) building on top of rf7 |
| `fix/g2-trustbar` | `wt-g2-trustbar` | built (head `215dd5cdc`); first review found 1 serious and 5 smaller faults, its worker is fixing them; render check `g2-render-check` queued. The ticker default (`00eac2c01`, settled by Bean 2026-11-24) never reached a server, but every real bar already stores its ticker layer (eye-care-test's one, in header part 199; Mama's three, 154, 176 and 178), so its sweep (`scripts/migrate-trust-bar-ticker.php`) changes only canary test bars (2242, 2588, 2742, 5305; 5305 skipped if it is a motion-QA negative control). It must leave probe pages alone: eye-care-test page 46 is a published test page, "[probe] trust-bar controls", not a site page. The trust-bar setting record is regenerated at merge, after `fix/verdicts-refresh` |
| `fix/e1-restores` | `wt-e1-restores` | restore track R1 built (link-only lists, slider visible-card count `lib/fill-visible-count.mjs` <!-- dangling-ok: on its branch -->, `dcLogic` reach calls); code review found 2 confirmed faults in the card count (stacked fade cards all counted; a card wider than the track drops that width) and 5 plausible; its worker is fixing them; proof is the batch sweep |
| `fix/e2-restores` | `wt-e2-restores` | built (9 commits on `aa99e5d76`; Indus now recognises the open-status dot pulse A-02 and the drawer accordion scroll J-31); first review found 5 confirmed faults (five callers lose the timeline and dot-pulse settings without the fact record's template; the injected-SVG writer turns on a text-shadow setting on the drawer, header, footer and media; a press-triggered hide is swallowed as a reveal; two stale mutation finds; a second writer of the pinned timeline's orientation) and 4 plausible ones; its worker is fixing them, and the logo's inline SVG gets one owner (the apply stage when the client has `logo-svgparts.json`). Then a second review of the fix commits, then batch 2 |
| `fix/look-fast` | `wt-look-fast` | Task 31 parts 1 and 2 building; byte-identity proof queued |
| `fix/verdicts-refresh` | `wt-verdicts` | browser re-measure of the 17 blocks' verdicts running (priority, outside the queue with 3 tabs); unblocks every deploy |
| `fix/ci-route-tests` | `wt-ci` | GitHub Actions route suite (the repo is public, so runners are free), iterating; failures so far: the DB-build step killed with exit 143 (likely its own `concurrency: cancel-in-progress` while it pushed often) and a SyntaxError in `scripts/computed-route/tools/ci-summary.mjs`; not merged <!-- dangling-ok: files that exist only on their branch --> |
| Mama's live-shop update | frozen target `wt-mamas-target` at `9c35674e9` | render-check passed; DB backup `/home/u945238940/backups/db/mamasmunches.com-20261126-111022-pre-deploy-20261126.sql.gz` and basket, checkout and account records (`E:\sgs-tmp\tmp-mamas-update\shop-before`) taken. Two deploy attempts stopped before upload, so the shop is untouched: the first because the frozen copy had no `scripts/computed-route/node_modules` (now copied in), the second on the stale verdicts above. After `fix/verdicts-refresh` lands: cherry-pick its verdict and record files onto the frozen copy (the 17 blocks' `src/blocks/<b>` and `src/shared` do not differ between `9c35674e9` and `main`), rerun `build-deploy.py --target mamas-test`, run `NODE_PATH=scripts/computed-route/node_modules node sites/mamas-munches-redesign/build/content/shop-check.cjs https://mamasmunches.com E:/sgs-tmp/tmp-mamas-update/shop-after`, compare with `shop-before`, then pause Mama's deploys until this plan is done |

**Decisions this session:**
- A parent-page change to an already built, published page is reported and never applied on a site-build rerun; new pages and rows take the page map's parent (main session, rf8 second review).
- A cloned page's parent, and so its web address, follows the draft's own page routes, never its menu (Bean, 2026-11-26): a page row nests under the page row whose own route is the nearest ancestor path of its route, and a flat-routed draft keeps every page top-level. This replaces RF8's section parenting (a menu item linking to its first child) and the older menu-item parenting; Indus's 16 parented pages become top-level (branch `fix/pagemap-draft-routes`, Spec 48 FR-48-30). The rf8 safeguard stands: a parent change to a built, published page is reported, never applied, unless the site build nested it itself.
- Featured nav items stay unwritten until a reader of featured items exists; the variant gate stays (rf1).
- Before each site's next deploy, run render-scope and render-check for G1 (Task 10).
- Merge note (editor lane, 2026-11-26): Stage E2 item 3 (W5) moves 8 blocks (card-grid, feature-grid, post-grid, pricing-table, tabs, testimonial-slider, product-card margin, form-step padding) from `style.spacing` to block-owned `padding`/`margin` and changes any route writer in `scripts/computed-route/lib` that writes `style.spacing` for them; it lands after the deadline tag, so the clone writers it touches are re-proven in that batch.
- Follow-up, not blocking: `setting-record/diff.py::compiled_scss` caches compiled Sass by file name and its own source only, so editing a partial can reuse stale CSS in a look (now spread by the look store); fix it together with a setting-record regeneration, since `stamp.py` hashes that module.
- Follow-up, not blocking: `plugins/sgs-blocks/scripts/deploy_ship.py`'s isolation step silently skips a `node_modules` link source that is missing (a deploy from a worktree without `scripts/computed-route/node_modules` then fails later with an unclear error, as Mama's first update attempt did on 2026-11-26); fix it to fall back to the main checkout's folder through the git common dir, or to stop with a clear message.
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

Depends on: none. Status: 9 of the 11 groups are merged (rf1 to rf6, rf8, rf9, rf10) with every second-review fix but rf1, rf9 and rf10's (`fix/review2-rf1910`, mutation runs running, then batch 1); rf7 is rebased onto `main` and its worker is fixing what its code review found (1 confirmed fault, 3 plausible); A4 (`fix/cart-trigger`) passed both reviews and joins batch 1.

### Task 3: Track C, every block part findable
Brief `c-parts.md` (`i15`, `i5`).

Done when: 0 `paint pairing` lines on Mama's and Eye Care's drawers, and Mama's trust-strip icon colour is written.

Depends on: none. Status: built and proven (Mama's drawer 8 to 0, Eye Care 2 to 0); review fixes done and rebased; its variant-floor survey is queued, then batch 1.

### Task 4: Track D, choice readings, underlines, the account merge
Brief `d-readings.md` (`i10`, `i7`).

Done when: Mama's 7 underline ties and Eye Care's 2 trust-bar ties resolve.

Depends on: none. Status: both reviews' fixes and the look-read speed cuts done; the account merge proven on a scratch mirror; the look-build timing decides whether it merges before the deadline clones (see "Where it stands").

### Task 5: Track G1, render fixes on every site
Brief `g1-render.md` (`i9`, `i13`): card grid logos, product card placeholder, brand strip `sizes`. "Even visual size" and "Trim empty edges" moved to Task 11 (W4).

Depends on: none. Status: merged (`dfa7e821b`: the card grid's frame owns padding, height and ratio, the product card's no-photo box takes the photo's Height or Ratio, the brand strip sizes from Logo max width); visual proof `E:\sgs-tmp\general-cloning\build\g1-render\VISUAL-CHECK.md`. Render-scope and render-check before each site's next deploy are in Task 10.

### Task 6: Track G2, the trust bar's clone-relevant fixes
Brief `g2-trustbar.md` (`i12`, `i3`): one stored marquee value, Fill writing the draft's marquee condition, icon fill colours reaching path fills (also `sgs/icon`, `sgs/button`, `sgs/cart`). The editor features moved to Task 11 (W4).

Depends on: rf1, rf5, rf6 merged (all three are). Status: building (`fix/g2-trustbar`, started 2026-11-26), including the trust bar's `edit.js` change for the stored marquee value (the editor lane rebases onto it) and a ticker migration of saved content (run in Task 10).

### Task 7: Track B, a look the clone cannot place never stops the run
Brief `b-runstop.md` (`i2`).

Depends on: none (the account shadows wait for Task 4). Status: merged (`fix/b-runstop`).

### Task 8: Restore tracks R1 and R2 (briefs `e1-restores.md`, `e2-restores.md`; not the editor lane's Stages E1 and E2)
Briefs `e1-restores.md`, `e2-restores.md` (`i6`). Commits already ported on the branches are skipped.

Depends on: R1 needs rf4 and rf10 merged (both are); R2 needs rf4 and rf6 (both are). Status: R1 built and in code review (`fix/e1-restores`; its proof is the batch sweep); R2 building (`fix/e2-restores`).

### Task 9: Track F, the mega menu
Brief `f-mega.md` (`i4`; Bean approved both rules, 2026-11-25).

Depends on: none. Status: done (two reviews and their fixes); joins batch 1; Bean eyeballs Eye Care's brands cards.

### Task 14: Track L, the layout items
Brief `l-layout.md`: the Indus hero unwrap and grid tracks, Mama's header order, the logo `maxHeight`, social icon sizes, and `sgs/media` ratio and height. These are the five items of the never-started `layout` branch.

Depends on: none. Status: done (`fix/l-layout` at `6a09a2a87`, two reviews and their fixes); its proof is the batch sweep (indus-foods/home); Bean eyeballs the Indus hero.

### Task 15: Track S, the shop pieces MIC needs
Brief `s-shop.md`: `part-look.mjs` as a run stage, a template card's `variantStyle` and related cards, the buy-box layout write (FR-48-60).

Depends on: rf7 and rf8 merged (rf8 is; rf7 is fixing its review faults). Status: building on top of rf7 (`fix/s-shop`).

### Task 16: SGS and MIC sites (main session, with Bean)
Why: no draft, deploy target, route target, secrets file or local mirror exists for SGS or MIC. The LEDGER names their hosting entries (`lightgreen-whale-237337`, `palegreen-goose-450620`); nothing is created on the hosting account until Bean says so.

Changes: Bean starts the two drafts once the pipeline is ready (Bean, 2026-11-25). Once they are in `sites/<client>/handoff/`, add each site to `deploy_common.py` `TARGETS`, `scripts/computed-route/calibration-targets.json` and `.claude/secrets/`; create its local mirror; run `provision-site-mail.py`.

Done when: `site-run.mjs` can target each site.

Depends on: the drafts. Status: waiting on the drafts.

### Task 10: Combined proof, rehearsal, deploys (main session)
Changes:
- Tag the deadline lane's head `deadline-proof-2026-11-27` (the editor lane merges only after it).
- Run the full suite alone, one sweep against `baseline-main`, render-scope, then render-check on the states the tracks named.
- Run render-scope from each test site's deployed commit to the tag.
- Run the saved-content migrations each site needs, in this order, each after a DB backup: the cart trigger (A4: backup, copy the sweep to the server, dry run, apply, then deploy; its temporary guard `deploy_cart_trigger_guard.py` refuses a deploy while old trigger keys remain), the account merge (D), the ticker and marquee bars (G2).
- Refresh `eye-care-test`'s read-only mirror before its render check: its content changed on 2026-11-26 (posts 199 and 11, the trust bar's `pauseOnTouch:true` became `touchPause:"hold"`, the editor lane's change at Bean's request; backup `/home/u945238940/backups/db/darkcyan-grouse-898606.hostingersite.com-20261126-125857-before-touch-hold.sql.gz`).
- Deploy `sandybrown`, `indus-test` and `eye-care-clone-test` (`build-deploy.py --target a,b,c`).
- Before eye-care-test's next deploy, cover its own pages: `local-eye-care` is a copy of eye-care-clone-test, not of eye-care-test, so no other mirror holds its pages (its home's `sgs/google-reviews` slider, and the card-grid, product-card, brand-strip and media changes G1 made). Its read-only scratch mirror is `local-mediatest-eyecaretest` (port 8130, registered in the gitignored `calibration-targets.local.json`); if it is gone, rebuild it through `heavy-slot.mjs run`: `scratch-mirror.sh create local-eye-care local-mediatest-eyecaretest 8130`, then `refresh-from-remote.sh local-mediatest-eyecaretest eye-care-test` (reads the site only), then `scratch-mirror.sh target local-mediatest-eyecaretest eye-care-test`. Include it in render-scope `--mirrors` and run render-check from it.
- Before each site's next deploy, run render-scope and render-check for G1 (merged `dfa7e821b`: card-grid, product-card, brand-strip and the shared media emitters reach every site; Mama's shop templates and Eye Care's mega menus hold them).
- In Eye Care's home reclone, check that the hero's three labels stay in the hero and are not made an `sgs/trust-bar` (Bean saw that on 2026-11-26; the committed `sites/eye-care-ward-end/build/skeleton/home.skeleton.json` is from 2026-11-02 and the batch sweeps do not clone Eye Care's home, so it is unconfirmed). If it happens, the rule that placed the bar (`data/skeleton-decisions.json::rules.trustBar` or `headerStripBar`) needs a negative control for a hero's label run.
- Before Mama's and Indus's next deploys, press the footer credit link (`.sgs-business-attribution`) on touch: the editor lane's `b05551a0e` gives it press feedback (`:active`); resting, hover and focus are unchanged. Mama's 2026-11-26 update deploys the frozen `9c35674e9`, which does not carry it.
- Reclone Mama's, Eye Care and Indus offline in parallel, one per mirror, then `site-run.mjs --only` on the named surfaces.
- Run a timed fresh-site rehearsal: one foundation and one page on a stripped scratch copy, to show how long SGS and MIC take.

Done when: every named surface improves and none gets worse, the rehearsal passes within the time left, and Bean's eye check passes. Then clone SGS and MIC.

Depends on: 2 to 9, 14 to 16. Status: started with Mama's live-shop update (blocked with every deploy on the stale verdicts) and the batch baseline sweep (see "Where it stands"); the rest waits on Tasks 2 to 9 and 14 to 16.

## Editor lane (builds now, merges after Task 10's tag)

### Task 11: Stage E1, shared components and packages
Briefs:
- `w1-editor-shared.md`: markers, inner section, Background sections, reset component. Bean approved the inner section's look as built (2026-11-26, screenshots `E:\sgs-tmp\general-cloning\build\w1-shared\shots\`), so Stages E2 and E3 may adopt it.
- `w2-editor-packages.md`: separators package, shape dividers.
- `w3-editor-switcher.md`: element switcher, border and shadow upgrades, carousels.
- `w4-trustbar-editor.md`: the trim list (one owner), the trust bar's lean layout and editor fixes, brand strip "Even visual size", "Trim empty edges".

Status: in progress in the second session; branches `fix/w1-shared`, `fix/w2-packages`, `fix/w3-switcher` and `fix/w4-trustbar` exist and none is merged (the second session records each one's state).

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

Status: not started.

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

Status: not started.

### Task 29: Deferred: stored conditions and "show when"
The setting record stores each setting's conditions in the DB (it computes them in `instances.py::preconditions` and discards them, `i17`). One shared rule hides controls with nothing to affect. The hand-built-panel and dead-control detectors (`i17`) and the panel census become gates, with an allowlist for the 10 intentionally different panels.

### Task 31: Site look built only from what differs per client
Why: a full site look build takes 21 to 53 minutes per client and is the main cost of every proof and new clone; most of it is the same for every client (measurement 2026-11-26, `.claude/reports/2026-11-26-site-look-cost.md`). Read first: that report, Spec 48 §3.2, `plugins/sgs-blocks/scripts/site-look/site_look.py`. Changes, in order: (1) build the value-forms and content facts once per framework, not per client (57% of renders, 1% of the output, identical across the three clients; spot-check a client with custom CSS), about 45% off a client build; (2) replace the all-block prepare calls (`lib/skeleton-context.mjs::prepareProposalLooks`, `lib/route-sweep.mjs::prepareSweepLooks`) with a build of the chosen and rule-named helper blocks only (a client uses 46 to 53 of 104 blocks, a surface 5 to 18); (3) trial building state and discover looks once with placeholder tokens and substituting each client's token values (98.4% of colour differences are the client's own palette colours; lengths scaled from the base font size need their own rule). Touches: site_look.py, the prepare calls, the look key. Done when: a cold build of one client takes under 8 minutes on a quiet machine with identical Fill output on the baseline surfaces. Depends on: the shared look store (merged `747193830`). Status: parts (1) and (2) building now on `fix/look-fast` (Bean, 2026-11-26: each batch and the final proof rebuild all three clients' looks, 6 to 10 slot-hours before SGS and MIC, so the two safe parts pay for themselves before the deadline); (1) merges only if every assembled look is byte-identical to today's for all three clients; part (3) stays after the deadline.

### Task 30: Later
Repair the chrome style choices (elevated, boxed, borderless and similar on 9 blocks) so each writes real settings, as card grid's do.

Note only: "More options" (a collapsed section at the foot of a giant panel for rarely used controls) is more effort than it is worth for now (Bean, 2026-11-25).
