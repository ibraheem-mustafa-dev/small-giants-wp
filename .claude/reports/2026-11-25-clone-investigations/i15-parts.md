# i15-parts: do the record's own renders hold the parts the site look lacks?

## Findings first

1. The "677 of 1,092 parts missing" figure does not reproduce today. Counting the same way on Mama's look (a record part is "missing" when no look element carries its class), today gives 310 of 1,060 usable (block, part) pairs missing (29%), carrying 4,220 of 21,881 usable placements. Counting every row, including rows the route will not act on, gives 641 of 1,398 pairs missing (46%). The unit the route feels is `unplaced`: of 6,923 Mama's settings, 1,455 (21%) have no element in the default look. PROVEN (`a_count.py`, `d_unplaced.mjs` in `i15-parts/`, run against the Nov-24 look folder). Why i5 got 62% is UNPROVEN (different counting or a different look folder).
2. Much of what counts as missing is not a block part. Of 77 missing parts in the 11 blocks in the table below, 48 are shared extension classes (`sgs-info-toggle`, `sgs-child-sizing`, `sgs-bg-media`, `sgs-roll*`, `sgs-scrim`...). Block-own parts missing: 29. PROVEN (`b_key2.json`, `b_key3.json`).
3. The record's per-setting renders draw some of the missing block-own parts, but only 12 of 29 (41%). 17 appear in no render at all. PROVEN.
4. The drawer's trailing icon is in none of the 1,088 cached nav-drawer-menu instance renders, so reading those renders would not have fixed the drawer. The cause is a fixture defect, not a look defect: 726 of the 1,088 instances (variants 1 and 2) render an empty string, because the fixture's menu `ref` is the stand-in `9101`, a post the fixture's harness never supplies (only post 7 exists), and the trailing-icon map is keyed `id:{{menuItem}}`, a placeholder inside a key that is never substituted. PROVEN (finding 5 and `f_trail.py`).
5. With a corrected fixture the part appears, with its position. One offline render with `ref` 7 and `itemTrailingIcons` keyed by the real identifiers (`id:21`, `label:Sale`; `render.php::from_link` builds `id:<id>` or `label:<label>`) prints `.item > .link > .trailing-icon` as the last child of the link, after `.ornament`, `.link-text` and `.media`, and before the badge on the Sale row. PROVEN.
6. Accordion rows and badges are already in Mama's default look today (20 `accordion-row` paths, 4 `accordion-summary`, 2 `badge`). For the drawer only the trailing icon is the missing part that matters (plus `subtoggle`, `submenu-root`, `mega-body`, `ornament-glyph`, `drill-back-btn`, which no render draws). i5's badge and Contact-link problem is the plain-versus-accordion duplicate at one level, not an absent part. PROVEN (look path query).
7. The look build already cascade-reads hundreds of non-default pages and throws their structure away. `build_block` renders and reads the route's marker jobs (955 renders for nav-drawer-menu) only to fold `discovered`, `presence`, `text`, `link`. Those pages hold paths the default look lacks (nav-drawer-menu 10, trust-bar 20, business-info 20, social-icons 10) at no extra render or cascade cost, but they cover few of the missing parts and none of the trailing icon. PROVEN (`e_seen.py`).
8. Verdict on Bean's three: none alone. Recommended: a small look change that records the structure of every non-default page the build already reads (plus a structure-only scan of the record's cached instances for parts still unseen), plus repairing fixtures that render empty. Section 4.

## 1. Re-count for Mama's (Nov-24 look; DB reseeded 2026-11-24 14:47)

Blocks come from the proof's drawer and footer skeletons (`sites/mamas-munches-redesign/build/skeleton/drawer-menu.skeleton.json`, `footer.skeleton.json`). Parts are distinct `setting_placements.part` per block (all rows). "Own" excludes shared extension classes (a prefix list in my script, so approximate). Unplaced = settings whose rule picks no element of the default look (`lib/setting-record.mjs::loadRecord(...).unplaced`, run with `SGS_NO_SITE=1` against the look folder).

| Block | Parts the record places | Drawn by look | Missing | Missing, block-own | Own, in some instance | Settings unplaced |
|---|---|---|---|---|---|---|
| nav-drawer-menu | 38 | 22 | 16 | 9 | 1 | 25 of 191 |
| nav-drawer | 24 | 17 | 7 | 2 | 0 | 14 of 104 |
| trust-bar | 23 | 8 | 15 | 6 | 2 | 29 of 112 |
| site-footer | 8 | 3 | 5 | 0 | 0 | 10 of 40 |
| site-footer-row | 4 | 3 | 1 | 0 | 0 | 3 of 35 |
| business-info | 19 | 14 | 5 | 3 | 1 | 9 of 63 |
| social-icons | 11 | 6 | 5 | 3 | 2 | 16 of 49 |
| icon-list | 20 | 10 | 10 | 2 | 2 | 13 of 109 |
| button / label / icon | 9 / 7 / 12 | 6 / 3 / 6 | 3 / 4 / 6 | 0 / 0 / 4 | 0 / 0 / 4 | not run |

Whole Mama's look (104 blocks): 757 of 1,398 pairs drawn; 6,923 settings, 1,455 unplaced. The look folder is the Nov-24 build (`E:\sgs-tmp\wt-sweep`; its renderer hash equals the cache's for these blocks). Since then main changed trust-bar, scrim and ticker code only, so trust-bar's look is slightly stale.

Own parts in no render: nav-drawer-menu `trailing-icon`, `subtoggle`, `submenu-root`, `mega-body`, `ornament-glyph`, `drill-back-btn`; nav-drawer `chrome-rating`; trust-bar `badge-img`, `lane`, `title a`, `badge-label a`; business-info `business-email`, `hours-row`; social-icons `icon__inner`. DB causes on the drawer's rows: `part-not-rendered` (15), `script-built-part` (57), `rule-needs-absent-markup` (71).

## 2. Do the record's renders draw the missing parts?

Where cached: `render.py::Renderer` writes `<cache root>/<code hash>/<md5 of slug, attrs, content, inner, runner args>.json` (root `SGS_SETTING_RECORD_CACHE`, else `~/.cache/sgs-setting-record`). Two facts that matter:

- The key is a hash of the code, so the check's renders and the look's renders sit in different folders. For nav-drawer-menu the look's 955 renders are in `00d4f0c26ee2aa68`; the check's 1,058 unique instances are in `12aada9a55a7eb55` and `bd15b78b9ec96b2b` (11-23, 11-24 00:15). All 726 keys the look folder lacks were found there. Main's current hash for it has no folder at all. PROVEN.
- The look reads the plain fixture (`plain=True`, no `checkAttributes`), so its default keys differ from the check's. Reusing the check's renders means using the check's plan, with `checkAttributes` (a shown label, a background image) in play.

Results (read-only reader, `b_inst.py`, 0 cache misses): 12 of 29 block-own missing parts appear in at least one instance render. Example with position: nav-drawer-menu `magnet-target` is a child of `.item > .link` beside ornament, link-text and media (instance `itemMagnetEnabled-bool-v0`). For the three you named:

- Trailing icon: 0 of 1,088 instances (findings 4 and 5).
- Accordion rows: not missing; already in the default look.
- Badges: not missing; already in the default look.

Instances that render an empty string (cached `html` length 0): nav-drawer-menu 742 of 1,088 (variants 1 and 2 entirely, plus 16 of variant 0), social-icons 199 of 272, business-info 449 of 972, trust-bar 44 of 1,158, nav-drawer none. An empty render is placed nowhere, so some `unproved` DB rows are fixtures, not blocks. PROVEN for the counts; UNPROVEN that each empty set is a fixture defect (I proved the cause for nav-drawer-menu only).

## 3. What it takes for the look to carry every part with its position

The rule in the way: `site_look.py::collect` skips a path already read (`if key in els`), and `build_block` reads only default instances (`isDefault`) in variant order, so nothing from other pages enters `elements`.

Recommended change in `site_look.py::build_block`, about 60 to 90 lines, one new output key, builder-hash bump, no change to existing keys:

1. Wrap `Reader.style` so each page already read records every path not in `elements` as `{path: {tag, classes, parent, siblings, firstJob, setting}}` under a new key `conditionalParts`. Marginal cost nil: the page is read anyway.
2. For parts still unseen, a structure-only scan of the record's cached instances (`check.py::load_plan`, non-plain) using `element_path` on the parsed HTML. Read-only when warm: my reader did 12 blocks in about 90 s including a one-off 18 s index of the cache, so a few seconds a block. Styles (`_position`, width, box) need one `read_page` of the first instance drawing each new path; a page costs about 0.15 s (the warm nav-drawer-menu look rebuild took 2 min 36 s on a loaded machine, and reproduced the existing `elements` exactly).
3. Surface it through `lib/setting-record.mjs::readRecord` as `conditionalElements`, apart from `elements`, and let `lib/skeleton-context.mjs::calPartsFor` hand it to `lib/skeleton-part-pairing.mjs::partModel` only as candidates after the default parts fail. This keeps "a path keeps the first variant's reading" for the default look and cannot change what an existing pairing resolves.

Cold cost: any plugin code change moves the hash, so the check's instances re-render. Cached `secs` average 2.4 s a render; nav-drawer-menu has 1,058 unique instances; with 12 workers that is about 3.5 minutes for that block and hours across 104 blocks. That is a calculation, not a timed cold run. Warm cost is read-only.

Prerequisite whichever design wins: repair fixtures that render empty (nav-drawer-menu: `ref` 7 or a harness post for `9101`, and map keys that are real identifiers). Without it the trailing icon exists in no render. business-info and social-icons likely have the same class of defect (UNPROVEN).

## 4. Bean's alternatives

(a) A local WordPress site with a page per block. Worst. The record already runs every setting through the real `render.php` offline, which is that page without WordPress or a browser. It would meet the same content gap (the trailing icon needs a menu whose identifiers match), it brings back a browser measurement the route retired, and it is one more thing to keep current. It respects "no per-site runs" but adds cost and no information.

(b) The record's list of placed parts. Necessary, not sufficient. It gives names only: i5 found `block_part_order` has no nesting and only about 12% of parts carry an ancestor in a recorded selector. Pairing matches by position, words and box, which a name does not give. Keep it as a gate: every placed part is either drawn somewhere or listed as unreachable (today 17 of the 29 own missing parts).

(c) Run the site look on local copies of the three client sites. Rejected. It breaks the principle (per-site runs), yields only parts those sites' content already uses (a fourth client brings new ones), and would not have found the trailing icon unless a client menu used one. It also needs three mirrors current.

Best: extend the existing look as in section 3, fix the empty fixtures, and use (b) as the completeness gate.

## Not proven

- Why i5 counted 62%.
- That business-info, social-icons and trust-bar empty renders are fixture defects.
- That a conditional-parts candidate list improves pairing rather than adds ambiguity: i5's variant filter would still be needed, and the plain `.link` versus `.accordion-row > .link` duplicate stays.
- Whole-library instance coverage: a run over all 104 blocks took about 40 s a block, so I stopped it; the 12-block sample is what is reported.
- The cold-cost figure (calculated from cached `secs`).

## Calls I made

- Used the Nov-24 look folder and code in `E:\sgs-tmp\wt-sweep` (its renderer hash matches the cache) rather than main's, because main's hash has no cache folder for these blocks and a cold build is thousands of renders.
- Counted "usable" parts as `unproved IS NULL`, as `loadRecord` does, and reported all-rows figures beside it.
- Treated shared extension classes as non-block parts by a prefix list, so "own" counts are approximate.
- Wrote nothing to the repo, DB or any site. The one PHP render and one look rebuild wrote only under `i15-parts\rcache` and `i15-parts\lookout`; the cache counts used a reader that turns off cache writes and directory creation.
- Stopped a full-library run that was taking too long (the process was killed after one `pkill` attempt failed on Windows).

Scripts and results: `E:\sgs-tmp\general-cloning\investigate\i15-parts\` (`a_count.py`, `b_inst.py`, `d_unplaced.mjs`, `e_seen.py`, `f_trail.py`, `b_key2.json`, `b_key3.json`, `e_seen.json`).
