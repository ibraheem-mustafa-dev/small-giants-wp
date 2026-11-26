---
doc_type: plan
status: active
created: 2026-11-25
---

# Clone fixes before 28 November, with the block editor clean-up alongside, in parallel tracks

**Goal and why:** Bean must clone SGS and MIC from Claude Design drafts by 2026-11-28 with no hand fixes. The deadline lane (Tasks 1 to 10 and 14 to 16) holds what the clones need. The editor lane (Tasks 11 to 13) is the block editor clean-up Bean approved on 2026-11-25; it builds alongside but merges only after the deadline proof. Done for the deadline means: tonight's branch work and the clone root fixes are on `main`; an offline reclone of Mama's, Eye Care and Indus improves on every named surface with nothing worse; a timed fresh-site rehearsal passes; SGS and MIC have sites to clone onto; Bean's eye check passes.

**Evidence:** every proposal comes from a read-only investigation dated 2026-11-25, kept in `.claude/reports/2026-11-25-clone-investigations/` (cited as `iN`; their scratch scripts stay in `E:\sgs-tmp\general-cloning\investigate\`), reviewed by three independent reviewers with every finding verified (2026-11-25). Fix groups RF1 to RF10 and the Restore map come from `.claude/plans/2026-11-24-clone-root-fixes.md`; this plan governs where they differ. Worker briefs: `.claude/plans/2026-11-25-land-fixes-tracks/` (`_common.md` plus one per track, and the second-session prompt).

**How it runs:**
- Up to 8 workers per session (Claude Code's limit); the editor lane can run in a second session with its own 8 (Bean, 2026-11-25). Launch order, deadline first: A1, A2, A3, A4, B, C, D, F, L. As slots free: G1, then E1, E2, G2 and S when their branches have merged, then the editor lane W1 to W4. Agent-tool subagents (worker API credits are exhausted).
- Heavy runs (sweeps, browsers, render-check, plugin builds, multi-block record checks) go through `scripts/computed-route/tools/heavy-slot.mjs run`: a first-come-first-served queue kept in the main checkout's `.claude/queue.md` (both sessions and every worker; nobody edits it by hand), two slots, and a third only after a ten-minute wait from the top of the queue when CPU is under 70% busy and 12 GB of memory and 10 GB on C: are free (Bean, 2026-11-25). One heavy job never takes two slots (Bean): a sweep runs inside `run` without `--slot-dir`. A look build runs 2 workers (`SGS_LOOK_JOBS`). A build only to look at or render-check is `npx wp-scripts build --experimental-modules --webpack-copy-php` (two minutes); `npm run build` runs every gate (26 minutes) and is for proving the gates. The full suite runs only in the main session, alone.
- Workers commit on `fix/<label>` in `E:\sgs-tmp\wt-<label>`; temp, the record cache and scratch are on E:. The main session reviews each branch (`/code-review`, its tests, `check-mutation-lists.mjs` showing 0 new), then merges only after the whole non-browser route suite passes on the branch with failures no different from main's. Every first review found 4 to 10 real faults per branch and every second review of the fix commits found 2 to 5 more, so a second review of the fix commits runs before or right after each merge. No new pre-commit gate is added (Bean, 2026-11-25); the existing hook (gitleaks, generated-file sync) stays.
- After each merge group the main session reseeds the shared DB, regenerates the setting records (`check.py --changed --write`), applies the README text workers report, and runs the merged branches' tests.
- Merge order for the three conflicts: rf9 keeps both sides of `tools/run-tests.mjs`; rf5 before rf6 (`fill-prop.mjs`, `fill-resolve-element.mjs`); rf3 before rf7 (`skeleton-classify.mjs`).
- Deploys (Bean, 2026-11-25): Mama's live shop is brought up to date with `main` once now (backup, render-scope from its deployed commit, render-check on the states that lists, basket/checkout/account checks before and after), then paused until this plan is complete. `eye-care-test` is a test site and deploys with the others.

**Out of scope:** the text-only trust bar style (Bean: not restored); the chrome style choices' repair and "More options" (Task 30); stored conditions and "show when" (Task 29).

**Risks:** C: has about 12 GB free; temp, the record cache and scratch are all on E: now. Tracks B, C and D each edit a different part of `lib/setting-record.mjs`, and C and D different functions of `site_look.py`.

## Where it stands (2026-11-26)

`main` carries the merged branches below; each was code-reviewed, its review faults fixed and its tests and mutations proven. The baseline sweep of `main` (at `58b2b773c`) is `E:\sgs-tmp\general-cloning\baseline-main`, and every track compares against it: 10 of 15 Fills usable; the headers and Indus home failed for want of the nav-bar-menu look (fixed on `main` by `fix/nav-look`), and Eye Care's mega-menu-help and mega-menu-brands need `--allow-external`.

**Merged on `main`:** rf10, rf5, rf3, rf2, rf4, rf9, rf1, rf6, rf8, B (`fix/b-runstop`, so `properties` plus `lib/css-families.mjs::paintedProps` is the one multi-property mechanism and L rebases onto it), G1 (`dfa7e821b`), `fix/main-regressions` (the guard `tests/intake-committed-current.test.mjs` fails when a committed intake record is out of date), `fix/form-pairing-test`, `fix/nav-look` (the site-look Reader keeps 8 pages least-recently-used, so the `sgs/nav-bar-menu` look builds in about 0.64 GB; `prepareLooks` retries only a failure that looks like running out of room), the fill-diagram fix (`d270e7a49`: the in-page measurer takes `PX_TOL` as an argument), and the second-review fixes of rf2, rf3, rf4, rf5 and rf6. The shared framework DB was reseeded for rf5 (`block_attributes.owns_css`). The full suite on `main` (browser tests included, `E:\sgs-tmp	mp-fullsuite\suite.log`) had 7 failures; each failing file passes on `main` at `d270e7a49`, so the only known failure left is the timing-sensitive font-wait test (`MUST FAIL (b): the font wait reads a late font loaded`).

| Branch / job | Worktree under `E:\sgs-tmp` | State |
|---|---|---|
| `fix/pagemap-draft-routes` | `wt-pagemap-routes` | built (Indus's page map regenerated: 16 rows become top-level; Mama's and Eye Care unchanged, their drafts' routes are flat); merges after its code review |
| `fix/rf7-shop-forms` | `wt-rf7-shop-forms` | ready since Track A3 (6 stale markers re-aimed, `u9-planted-draft` assertion added, 68/68 changed tests); next: rebase onto `main` (147 commits behind), code review, whole non-browser suite, merge (S, Task 15, waits on it) |
| `fix/f-mega` | `wt-f-mega` | fixing the 40 kept-unnamed tile paints and adding a `subtitle` role for the mega-menu card subtitle; then the Fill proof with `--records E:/sgs-tmp/general-cloning/records-fmega`, review, merge |
| `fix/d-readings` | `wt-d-readings` | fixing 6 review faults (the account migration must not change tablet height on live sites, sweep owner check, `mapTiers` raw keyword, sweep pseudo layers, account record regenerate, `stateChoice` conflict); report `E:/sgs-tmp/general-cloning/build/d-readings/REPORT.md` |
| `fix/c-parts` | `wt-c-parts` | done and proven (Mama's drawer pairing lines 8 to 0, Eye Care 2 to 0); not yet code reviewed; report `E:/sgs-tmp/general-cloning/build/c-parts/REPORT.md` |
| `fix/l-layout` | `wt-l-layout` | fixing 6 first-review faults (`pictureRoom`, `withSizing` own and parent facts, retrack width-only cells, columns write, host-band check) on B's `properties` mechanism; then second review, whole suite, merge, regenerate setting records, render-scope, render-check the Indus hero unwrap |
| `fix/cart-trigger` (A4) | `wt-cart-trigger` | full build with gates passed; the render-check of Mama's header has not run; not code reviewed since the gate fixes |
| Second reviews | | rf9 walker fixes, rf1 menu-hover fixes and rf10 coverage fixes are under review (read-only) |
| Mama's live-shop update | frozen target `wt-mamas-target` at `9c35674e9` | render-check passed (one hover-timing difference on the order-received badge; cart code unchanged); DB backup `mamasmunches.com-20261126-111022-pre-deploy-20261126.sql.gz` and basket, checkout and account records (`E:\sgs-tmp	mp-mamas-update\shop-before`) taken; `build-deploy.py --target mamas-test` queued as `mamas-deploy` (Bean's go, 2026-11-26); then the same checks into `shop-after`, then Mama's deploys pause until this plan is done |

**Decisions this session:**
- A parent-page change to an already built, published page is reported and never applied on a site-build rerun; new pages and rows take the page map's parent (main session, rf8 second review).
- A cloned page's parent, and so its web address, follows the draft's own page routes, never its menu (Bean, 2026-11-26): a page row nests under the page row whose own route is the nearest ancestor path of its route, and a flat-routed draft keeps every page top-level. This replaces RF8's section parenting (a menu item linking to its first child) and the older menu-item parenting; Indus's 16 parented pages become top-level (branch `fix/pagemap-draft-routes`, Spec 48 FR-48-30). The rf8 safeguard stands: a parent change to a built, published page is reported, never applied, unless the site build nested it itself.
- Featured nav items stay unwritten until a reader of featured items exists; the variant gate stays (rf1).
- Before each site's next deploy, run render-scope and render-check for G1 (Task 10).
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

Depends on: none. Status: 8 of the 11 branches are merged (rf1, rf2, rf3, rf4, rf5, rf6, rf9, rf10); the rf6 second-review fixes are merged; the rf3 and rf4 second-review fixes are in flight, and rf7, rf8 and A4 are not merged (see "Where it stands").

### Task 3: Track C, every block part findable
Brief `c-parts.md` (`i15`, `i5`).

Done when: 0 `paint pairing` lines on Mama's and Eye Care's drawers, and Mama's trust-strip icon colour is written.

Depends on: none. Status: built and proven (Mama's drawer 8 to 0, Eye Care 2 to 0); code review pending.

### Task 4: Track D, choice readings, underlines, the account merge
Brief `d-readings.md` (`i10`, `i7`).

Done when: Mama's 7 underline ties and Eye Care's 2 trust-bar ties resolve.

Depends on: none. Status: built; its worker is fixing 6 faults from the first review.

### Task 5: Track G1, render fixes on every site
Brief `g1-render.md` (`i9`, `i13`): card grid logos, product card placeholder, brand strip `sizes`. "Even visual size" and "Trim empty edges" moved to Task 11 (W4).

Depends on: none. Status: merged (`dfa7e821b`: the card grid's frame owns padding, height and ratio, the product card's no-photo box takes the photo's Height or Ratio, the brand strip sizes from Logo max width); visual proof `E:\sgs-tmp\general-cloning\build\g1-render\VISUAL-CHECK.md`. Render-scope and render-check before each site's next deploy are in Task 10.

### Task 6: Track G2, the trust bar's clone-relevant fixes
Brief `g2-trustbar.md` (`i12`, `i3`): one stored marquee value, Fill writing the draft's marquee condition, icon fill colours reaching path fills (also `sgs/icon`, `sgs/button`, `sgs/cart`). The editor features moved to Task 11 (W4).

Depends on: rf1, rf5, rf6 merged (all three are). Status: not started.

### Task 7: Track B, a look the clone cannot place never stops the run
Brief `b-runstop.md` (`i2`).

Depends on: none (the account shadows wait for Task 4). Status: built; review fixes done, Indus form sweeps queued.

### Task 8: Tracks E1 and E2, restores
Briefs `e1-restores.md`, `e2-restores.md` (`i6`). Commits already ported on the branches are skipped.

Depends on: E1 needs rf4 and rf10 merged (both are); E2 needs rf4 and rf6 (both are). Status: not started.

### Task 9: Track F, the mega menu
Brief `f-mega.md` (`i4`; Bean approved both rules, 2026-11-25).

Depends on: none. Status: built; review fixes done, the Fill proof of `mega-menu-brands` is running.

### Task 14: Track L, the layout items
Brief `l-layout.md`: the Indus hero unwrap and grid tracks, Mama's header order, the logo `maxHeight`, social icon sizes, and `sgs/media` ratio and height. These are the five items of the never-started `layout` branch.

Depends on: none. Status: items 1 to 3 and 5 proven; item 4 (social icons) is being fixed; code review pending.

### Task 15: Track S, the shop pieces MIC needs
Brief `s-shop.md`: `part-look.mjs` as a run stage, a template card's `variantStyle` and related cards, the buy-box layout write (FR-48-60).

Depends on: rf7 and rf8 merged. Status: not started.

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
- Run the saved-content migrations each test site needs (cart trigger, account merge, marquee bars), in order with backups.
- Deploy `sandybrown`, `indus-test` and `eye-care-clone-test` (`build-deploy.py --target a,b,c`).
- Before eye-care-test's next deploy, cover its own pages: `local-eye-care` is a copy of eye-care-clone-test, not of eye-care-test, so no other mirror holds its pages (its home's `sgs/google-reviews` slider, and the card-grid, product-card, brand-strip and media changes G1 made). Its read-only scratch mirror is `local-mediatest-eyecaretest` (port 8130, registered in the gitignored `calibration-targets.local.json`); if it is gone, rebuild it through `heavy-slot.mjs run`: `scratch-mirror.sh create local-eye-care local-mediatest-eyecaretest 8130`, then `refresh-from-remote.sh local-mediatest-eyecaretest eye-care-test` (reads the site only), then `scratch-mirror.sh target local-mediatest-eyecaretest eye-care-test`. Include it in render-scope `--mirrors` and run render-check from it.
- Before each site's next deploy, run render-scope and render-check for G1 (merged `dfa7e821b`: card-grid, product-card, brand-strip and the shared media emitters reach every site; Mama's shop templates and Eye Care's mega menus hold them).
- Reclone Mama's, Eye Care and Indus offline in parallel, one per mirror, then `site-run.mjs --only` on the named surfaces.
- Run a timed fresh-site rehearsal: one foundation and one page on a stripped scratch copy, to show how long SGS and MIC take.

Done when: every named surface improves and none gets worse, the rehearsal passes within the time left, and Bean's eye check passes. Then clone SGS and MIC.

Depends on: 2 to 9, 14 to 16. Status: started with Mama's live-shop update and the baseline sweep (see "Where it stands"); the rest waits on Tasks 2 to 9 and 14 to 16.

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

### Task 30: Later
Repair the chrome style choices (elevated, boxed, borderless and similar on 9 blocks) so each writes real settings, as card grid's do.

Note only: "More options" (a collapsed section at the foot of a giant panel for rarely used controls) is more effort than it is worth for now (Bean, 2026-11-25).
