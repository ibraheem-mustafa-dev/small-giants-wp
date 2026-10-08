---
title: CR6 — migrate the padding and margin shorthand that zero-fills unset sides
project: small-giants-wp
created: 2026-10-07
status: phase 1 shipped; phase 2 P2-a P2-b P2-c P2-d P2-f P2-g P2-h P2-i P2-j done; P2-e (Eye Care content) classified 2026-10-08, no tree edit needed, 18 rows residual
authors: Bean, Claude (small-giants-wp-cd)
governs: register CR6 (.claude/plans/2026-10-02-eye-care-fix-register.md), Spec 47 §5 Residual (CR6)
---

# CR6 — padding and margin longhand migration, strategic plan

**Goal:** a client who sets one side of a padding or margin box changes that side only; the other sides
keep what a wider tier or the block's own stylesheet gives them — on the live page AND in the editor.
**Business context:** the widest-blast-radius bug in the Eye Care register ("a control destroying three
values the operator never touched"); every client site using ~40 blocks inherits it.
**Total estimate:** ~3.3 h (200 min, the effort table below) in one sitting, with a hard stop after GATE 2.
**Critical path:** U1 → U2 → U3 → U4 → GATE 2 → U5 → U6 → GATE 3 → U7 → U8.
**Risk level:** Medium — one shared helper across 57 files; the old function stays byte-identical, every
block migrates through one detector, and four independent reviews (risk, effort, two cold readers) have
been folded in below.

## Decisions this plan rests on

| # | Decision | Source |
|---|---|---|
| D-1 | A NEW sibling function; the old `helpers-box.php::sgs_box_object_shorthand` stays byte-identical for the border widths and every site this plan does not migrate | `.claude/plans/2026-10-05-eye-care-functionality-backlog.md` §CR6 (validated design) |
| D-2 | A mobile tier that sets one side **inherits** the tablet tier's other sides | Bean, 2026-10-07 |
| D-3 | THE-MIGRATION-METHOD hand-back #9 and Step 3 are met by D-1 + D-2 recorded here ("if the shape is already settled and recorded, say so and move on") | `.claude/THE-MIGRATION-METHOD.md` |
| D-4 | **Border WIDTH is out of CR6: zero-fill is the correct meaning there.** Sites write `border-style` for all four sides and widths per side; a longhand would leave an unset side at the browser's `medium` (~3px), painting phantom borders — the G5 "no width = no border" rule, pinned by `plugins/sgs-blocks/tests/php/run-border-default-style-standalone.php` (`'.c{border-style:solid;border-width:2px 0 0 0;}'`). Padding and margin have no such companion, so an unset side there SHOULD fall to the stylesheet | risk review, verified; decided on evidence |
| D-5 | The editor preview moves with the front end in the same commit (it previews only set sides), because migrating the front end alone makes the two disagree where they agree today | risk review row 4 |

## Facts (measured 2026-10-07; each with the command)

| Fact | Command / symbol |
|---|---|
| The defect is the four ternaries in `helpers-box.php::sgs_box_object_shorthand`'s return (unset side → `'0'`) | read the function |
| The cascade D-2 relies on holds in all 30 boilerplate files: desktop, then `@media(max-width:1023px)`, then `@media(max-width:767px)`, same selector, no reordering | `rg -n 'max-width:\s*1023px'`; `rg -n 'sort\(\|array_unique\|array_reverse'` |
| **Desktop:** 29 of 30 boilerplate files emit desktop padding/margin through `wp_style_engine_get_styles()` (longhands, set sides only) — unaffected. **But desktop DOES zero-fill at:** `label` (`helpers-box.php::sgs_label_box_css_rule`), `option-picker::$pill_padding_val`, `hero` (`$img_pad_base`, `$media_pad_base`, `$content_pad_base`), `card-grid::$card_pad_base`, `theme-toggle::$sgs_padding_desktop_val`, `language-switch::$panel_padding_desktop_val`, `choice-flow::$padding_base_val`, `product-card::$sgs_card_padding_shorthand`, `helpers-button-style.php::sgs_button_element_style_css` (17 callers). **These change at 1440 too** (e.g. a label with padding `{top:8px}` goes from `8px 0 0 0` to `8px 12px 4px 12px` under `.is-style-pill-fill`) | `grep -n "base_spacing\|wp_style_engine_get_styles" <file>` per block |
| Helper mentions: 182 in PHP across **57** files; 157 plain assignments plus **5 ternary assignments** (e.g. `includes/nav-drawer-chrome-css.php`) | `rg -n 'sgs_box_object_shorthand' --glob '*.php' --glob '!build/**'` |
| Boilerplate: 112 assignments of `$padding_tab_val` / `$padding_mob_val` / `$margin_tab_val` / `$margin_mob_val` in **30** files; their ONLY uses are 112 `null !==` guards and 112 declarations — 104 `$x_decls[] = "padding:{$v}"`, 8 inside a whole rule string `"{$sel}{margin:{$v};}}"` (`cart`, `buybox`, `label`, `filter-search`) | `rg -o '(padding\|margin):\{\$(padding\|margin)_(tab\|mob)_val\}'` |
| No consumer of the helper appends `!important` | risk review scan of all 57 files |
| **`var()` holdouts** (one custom property holding a whole shorthand, so a longhand cannot replace it in place; the fix is one property per side or corner, as the media atoms now do): the open list and order are in the Phase 2 row P2-b; the four border-width ones stay zero-filled (D-4) | read each emission line; `python plugins/sgs-blocks/scripts/migrate-box-longhands.py --survey` lists the refused var() sites |
| **Zero-fill copies outside the helper**: `google-reviews/render.php::$gr_box_rule` (`$vals[] = $val ?? '0'`) and `helpers-border-style.php::sgs_border_box_decls` | read both |
| Two sites use a helper value twice and must stay on the shorthand: `helpers-button-style.php`'s `$border_width_shorthand` (also feeds `sgs_border_gradient_css()`) and `label::$base_padding_shorthand` (a presence test in `$box_present`) | read both |
| Editor: `spacing-preview.js::tierBoxShorthand` merges per side by default (= D-2); `wholeBox = true` reproduces the zero-fill. **13 flag sites, 7 blocks, in 5 kinds of file**: `edit.js` (8), `buybox/canvas-mock.js`, `choice-flow/preview-style.js`, `hero/canvas-preview.js` (3) | `grep -rnE "tierBoxShorthand\([^;]*,\s*true\s*\)" src/blocks` |
| `spacing-preview.js::boxShorthand` prints `0` for a side unset at every tier (D-5 removes this for migrated blocks) | read the function |
| `sgs_box_object_shorthand` has no test; `tests/php/run-notice-banner-icon-badge-standalone.php` loads `helpers-box.php` ALONE (so the new helper may not require another file) | `rg -n "helpers-box" tests/php/run-notice-banner*` |
| Route workaround: `scripts/computed-route/lib/resolve.mjs::seedSides`, sole caller the `boxed` closure in `resolve()`, covering `box_family` rows, `tier_shape='box_only'` and border-width via `splitProperty`; three dependent tests in `tests/resolve.test.mjs` | read `resolve()` |
| `seedSides` writes explicit `'0px'` sides (`wider[s] ?? '0px'`); 162 committed tier boxes already hold a zero side across 11 Eye Care trees | risk review |
| Gates: `plugins/sgs-blocks/scripts/gates.json` holds 154 records of 7 fields; **no record has `mode` or `openBacklog`** (those fields belong to `inspector-scan/rules.json`, a different runner). A `gates.json` ratchet lives inside its script as a sibling baseline (`scripts/check-enum-control-shape.py` + `check-enum-control-shape-baseline.json`: fail on a new violation, fail on a baseline entry no longer reproduced) | `python -c "import json;…"` on `gates.json` |
| `build-deploy.py` refuses dirty in-scope files (`build-deploy.py::deployed_dirty_files`) and builds from HEAD | read the function |
| PHPUnit is self-contained: `plugins/sgs-blocks/vendor/bin/phpunit`, template `tests/php/ContainerWrapperCssLengthTest.php` | `ls vendor/bin/phpunit` |

## Dependency graph

```
U1 helper + test ─► U2 detector ─► U3 gate (baseline ratchet) ─► U4 pilot: whatsapp-cta + editor
                                                                       │ GATE 2 (live, both surfaces)
                                                                       ▼
                                            U5 batch: boilerplate + triples + editor preview
                                                                       ▼
                                            U6 bespoke padding/margin sites (main thread)
                                                                       │ GATE 3 (seedSides: narrow)
                                                                       ▼
                                            U7 seedSides narrowed + resolve tests
                                                                       ▼
                                            U8 both surfaces at 375/768/1440 + Eye Care re-measure
```
Parallel: inside U5, a shape-identical remainder the codemod refuses goes to Haiku subagents via
`/delegate` while the main thread starts U6.

## Work units

### U1 — the new helper and its test (critical path) — 10 min
**Files:** `plugins/sgs-blocks/includes/helpers-box.php`; new `plugins/sgs-blocks/tests/php/BoxLonghandTest.php`.
- [x] `sgs_box_object_longhand_list( $box, string $family ): array` — `$box` is the same
  `['top'=>…,'right'=>…,'bottom'=>…,'left'=>…]` the old function reads; one `"<family>-<side>:<value>"`
  per set side, in a **hard-coded** `top, right, bottom, left` order (no dependency on
  `helpers-responsive.php`, which the standalone notice-banner test does not load). Families: `padding`,
  `margin` only (D-4). Values through `sgs_css_length_value()`, exactly as the old function; a side
  counts as set when that returns non-`''` (so an explicit `'0'` IS set). Untyped `$box` with an
  `is_array()` guard; unknown family → `[]`.
- [x] `sgs_box_object_longhands( $box, string $family ): ?string` — the list joined with `;`, **`null` when
  empty** (every consumer guards with `if ( null !== $x )`; `''` would print `.x{}`).
- [x] `BoxLonghandTest`: one side, all four, none → `null`, explicit `'0'` kept, unsafe value rejected,
  unknown family → `[]`/`null`; plus **a byte-identity table pinning `sgs_box_object_shorthand`** today.
- [x] **VERIFY:** `cd plugins/sgs-blocks && vendor/bin/phpunit --filter BoxLonghandTest` green; plant
  the `'0'` fill in the new function → red; restore from a backup copy → green;
  `php tests/php/run-notice-banner-icon-badge-standalone.php` still passes.
- [x] Commit alone (inert: nothing calls it yet).

### U2 — the detector (critical path) — 70 min
**Files:** new `plugins/sgs-blocks/scripts/migrate-box-longhands.py`; new
`reports/migrations/box-longhands-census.json` (repo root; create the folder if absent).
The skeleton `scripts/migrate-length-sanitiser.py` is line-based; this needs a **file-level, two-pass
transform**. Keep the skeleton's gates and constants (`EXCLUDE`, `BARE_OK`, `WIDTH_OK`, the broad
enumeration, `check_corpus_width`), and write new: pass 1 collects each variable assigned from
`sgs_box_object_shorthand( <expr> )` and all its uses; pass 2 rewrites.
- [x] **Allowed uses** (anything else → `unrecognised`, untouched): (a) `null !== $v` / `$v !== null`
  directly in an `if` whose body holds a declaration use; (b) `"<family>:{$v}"` in an interpolated
  string, including inside a whole rule `"{$sel}{margin:{$v};}}"`; (c) `'<family>:' . $v` where
  `<family>:` ends a single-quoted segment. Rewrite: the assignment →
  `sgs_box_object_longhands( <expr>, '<family>' )`; (b) → `"{$v}"`; (c) → `$v` with the quote spliced;
  (a) unchanged. The family is read from the declaration, and every declaration of one variable must
  name the same family.
- [x] Refuse and name: the two double-use sites (`helpers-button-style.php::$border_width_shorthand`,
  `label::$base_padding_shorthand`), every `border-width:` use (D-4), and the 8 `var()` holdouts
  (`EXCLUDE`, each with a written reason; assert each path exists). `BARE_OK` the
  `function_exists( 'sgs_box_object_shorthand' )` guards with per-file counts. Report
  `google-reviews::$gr_box_rule` and `helpers-border-style.php::sgs_border_box_decls` as zero-fill
  copies outside the helper.
- [x] CLI (method contract): `--survey`, `--survey --json` (writes the census), `--fix` (unified diff via
  `difflib`), `--fix --apply` (atomic `.tmp` + `os.replace`), `--check`, `--self-test`, and
  **`--only <block-slug>[,…]`** to scope `--fix`. Root anchored on `.claude/THE-MIGRATION-METHOD.md`;
  prune `.claude/worktrees/`, `node_modules/`, `build/`, `vendor/`, `scripts/**/fixtures/`.
- [x] Editor arm (report only, no JS rewrite): for each migrated block, list every padding/margin
  preview call (`tierBoxShorthand(`, `boxShorthand(`, `spacingPreview(`) in ANY `src/blocks/<slug>/*.js`,
  flagging `wholeBox = true`; `crosscheck()` fails while a migrated block still previews padding/margin
  through a `0`-filling call.
- [x] **The 5 ternary assignments** (`$v = $cond ? sgs_box_object_shorthand( … ) : …`, e.g.
  `includes/nav-drawer-chrome-css.php`) are refused and named, with a fixture; they go to U6 by hand.
- [x] Census JSON schema: `{ generated, totals: {migratable, refused, excluded, bareOk, unrecognised},
  sites: [ { file, line, block, attr, variable, family, tier: "desktop|tablet|mobile|n/a", category, reason } ],`
  where `attr` is the `block_attributes.attr_name` the variable is built from (read from the
  `$attributes['…']` the box object comes from), so GATE 3 can read (block, attr) pairs;
  editorFlags: [ { file, line, block } ], zeroFillCopies: [ … ] }`.
- [x] Fixtures before the transform: positive (each of a/b/c), definition (old function survives),
  edge (a double-use variable → refused), border-width declaration → refused, a statement spanning
  several lines (hero's concatenated rules), negative control
  (byte-identical), idempotence, and a corpus control reconciling against a dumb wide
  `sgs_box_object_shorthand(` grep (`WIDTH_OK` names each wide-only hit) — run on `--check` too.
- [ ] Declared population, BEFORE the first run: migratable ≈ 112 boilerplate assignments + the
  desktop/local triples listed in Facts; refused/excluded = the 8 holdouts, the 2 double-use sites, every
  border-width site.
- [x] **VERIFY:** `python scripts/migrate-box-longhands.py --self-test` exit 0; `--survey` reconciles
  with the declared population; census written. Commit (inert).

### GATE 1 — detector proven (auto-gate)
**Pass:** `--self-test` 0; survey reconciles per file with the declared population; negative control
byte-identical. **Fail:** an unexplained difference → fix the recogniser; never band the count.

### U3 — the gate, ratcheted by a baseline — 10 min
**Files:** `plugins/sgs-blocks/scripts/gates.json`, `plugins/sgs-blocks/package.json`, new
`plugins/sgs-blocks/scripts/migrate-box-longhands-baseline.json`.
- [x] Copy `check-enum-control-shape.py`'s ratchet: the baseline lists today's migratable sites;
  `--check` fails on a NEW zero-fill padding/margin site outside it AND on a baseline entry no longer
  reproduced (so the baseline must shrink as blocks migrate). Green from the day it is registered.
- [x] Record in `gates.json` with the 7 fields that exist (`id`, `cmd`, `tier: "fast"`, `added_D`,
  `added_commit: null`, `budget_ms: null`, `order` = max + 1 from `npm run gate:list`); alias
  `check:box-longhands` in `package.json` (tab-indented file).
- [x] `.claude/THE-MIGRATION-METHOD.md` Step 8: its `mode`/`openBacklog` text is correct (it is scoped to
  `inspector-scan/rules.json`); add the missing line that a `gates.json` gate keeps its ceiling in the
  script's own sibling baseline. **Done 2026-10-07.**
- [x] **VERIFY:** `npm run gate:list` lists it; `--check` exit 0; planting a new
  `sgs_box_object_shorthand` padding site in a scratch copy → exit 1. Commit.

### U4 — the pilot, live on both surfaces (critical path) — 25 min
**Files:** `src/blocks/whatsapp-cta/render.php` (+ its editor preview if it passes `wholeBox`).
- [x] `python scripts/migrate-box-longhands.py --fix --apply --only whatsapp-cta`; read the diff; update
  the baseline.
- [x] The editor sibling lands HERE, not in U5: U4's VERIFY compares the editor with the front end, and
  case B (desktop unset, tablet top only) previews `40px 0 0 0` through today's `spacingPreview()`. Add
  `src/utils/spacing-preview.js::tierBoxLonghands` and its test (U5's editor step describes both), and
  switch `whatsapp-cta`'s preview to it. `migrate-box-longhands.py --check`'s editor arm then passes for it.
- [x] **Commit** (the deploy builds from HEAD and refuses dirty files).
- [x] Peers: message them; `ps -ef | grep -E "[s]gs-update|[b]uild-deploy"` must be empty. Build in
  PowerShell (`cd plugins/sgs-blocks; npm run build`), then
  `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`.
- [x] Fixture: a JSON tree in `.claude/scratch` built with `scripts/wp-build-page.js` onto the sandybrown
  calibration post (`scripts/computed-route/calibration-targets.json` → `sandybrown.postId`), three
  `sgs/whatsapp-cta` instances:
  (A) desktop sides 24px, tablet `{top:'40px'}`; (B) desktop unset, tablet `{top:'40px'}`;
  (C) tablet `{left:'30px'}`, mobile `{top:'50px'}`.
- [x] Read with one script, `plugins/sgs-blocks/scripts/qa/check-box-longhands-live.mjs` (Playwright `chromium`, `channel: 'chrome'`):
  for each instance and each width 1440 / 768 / 375, `getComputedStyle(el)` padding-top/right/bottom/left
  on the front end, and the same on the editor canvas (`/wp-admin/post.php?post=<id>&action=edit`, the
  canvas iframe, `Edit` preview width set to Desktop / Tablet / Mobile). It prints one row per
  (instance, surface, width) and exits 1 on any mismatch with the expectations below.
- [x] **VERIFY** (`node plugins/sgs-blocks/scripts/qa/check-box-longhands-live.mjs` exit 0), values top/right/bottom/left:
  A at 768 = `40px 24px 24px 24px` (was `40px 0px 0px 0px`; desktop bottom 24px inherited);
  B at 768 = `40px 24px 12px 24px` (stylesheet `.sgs-whatsapp-cta--inline.sgs-whatsapp-cta__btn{padding:12px 24px}`);
  C at 375 = `50px 24px 12px 30px` (D-2: mobile keeps tablet's left 30px). All three at 1440 unchanged
  from before. Editor rows equal front-end rows. Empty the calibration post in the same command.

### GATE 2 — the shape holds live (auto-gate; D-3 settles the shape) — **HARD STOP before the batch**
**PASSED 2026-10-07** (sandybrown, deploy of `53172f1d5`): `node plugins/sgs-blocks/scripts/qa/check-box-longhands-live.mjs` 18/18 rows, front end and editor, at 1440/768/375. The same read before the deploy failed 6 rows (e.g. case A at 768 `40 0 0 0`; case C at 375 `50 0 0 0`, the mobile tier wiping the tablet's left), so the check is proven able to fail.
**Pass:** every VERIFY value above, front end and editor. **Fail:** any side 0 or editor/front-end
disagreement → stop; the helper, the cascade or the preview is wrong.

### Progress (2026-10-07)

**U1–U7 DONE**, committed as `1130757e1` (U1), `746fd5f2e` (U2), `5c3763ab3` (U3), `53172f1d5` + `83f3a5ae5` (U4,
GATE 2 passed live 18/18) and `7851261e5` (U5–U7 in one commit, per the commit rule). What the run changed from the
text below, all recorded here because a later session would otherwise rediscover it:

- **The batch is 143 sites in 39 files** (the census, reconciled per file); `--fix` refuses to change a file without a
  migratable site, after the first run leaked a whole-file tidy-up into 4 unrelated files (undone, fixed, rerun).
- **The editor half was 52 previews, not 13 flag sites**: 36 by three Haiku subagents (every diff read), 16 by hand.
  The editor arm missed camelCase names (`contentPadding`) until fixed; cart's panel and form's wrapper previews
  were wrong before CR6 (their emitters are per-side), so P2-d closes for them. A subagent dropped an import hero
  still used; a used-but-not-imported scan across all 30 changed JS files caught it (the JS linter is broken repo-wide).
- **GATE 3 result: narrow, then empty of padding.** After phase 1 `zeroFillPairs` held 11 pairs (4 padding, 7 border
  widths); after P2-b it holds the 8 border widths only (see the P2-b GATE 3 bullet below). `sgs/container::padding`
  had been over-seeded (its wrapper always printed per side) and no longer is.
- **U8 DONE 2026-10-07:** sandybrown deploy of `7851261e5` (141 fast + 6 full gates, 95/95 payload), then `check-box-longhands-blocks-live.mjs` 30/30 rows, front end and editor, at 1440/768/375. Before the deploy it `node plugins/sgs-blocks/scripts/qa/check-box-longhands-blocks-live.mjs`
  read 40 0 0 0 at 768 and 375 for all five blocks (text, heading, button, label, info-box). The Eye Care
  re-measure rides on the next measure-only sweep (Task 1). **CR6 phase 1 is complete; phase 2 is below.**
- **GATE 3 after P2-b DONE 2026-10-08 (`23ab75119`):** `zeroFillPairs` holds the 8 border widths only; accordion header and content padding, `sgs/container::gridItemPadding` and `sgs/label::padding` left it. `resolve.mjs::seedSides` seeds only a border width (read from the border longhand names the calibration records: `border-top-width`, which the earlier `border-width-top` key never matched), takes nothing from a wider tier, and no longer reads the census. Four route tests go red when the unconditional seeding returns.

### U5 — the batch, PHP and editor together — 40 min
**Files:** the 30 boilerplate `render.php`; the local triples (`hero`, `card-grid`, `theme-toggle`,
`language-switch`, `choice-flow`, `option-picker`, `product-search`, `store-selector` — `product-card` and
`label` are U6's); the 13 editor flag sites; `src/utils/spacing-preview.js`; new
`tests/js/spacing-preview-longhands.test.js`; `scripts/codemods/box-desktop-to-tier.js` (each migrated
block leaves its `WHOLE_BOX` list, since its tier no longer resolves as a whole box).
- [x] `git status --porcelain -- <census paths>` empty (peers edit these files); `git rev-parse HEAD`
  recorded; `--fix` (read every diff); `--fix --apply`; `git diff --stat` file count = the census.
- [x] Refused but shape-identical → Haiku via `/delegate`, one cold prompt per file group naming the
  exact coupled transform; the main thread reads every diff.
- [x] Editor (D-5), mirroring D-1 so no existing JS caller changes: `src/utils/spacing-preview.js` gains a
  sibling `tierBoxLonghands( tiers, tier, family )` returning a style object of the **set sides only**
  (`{ paddingTop: … }`); `tierBoxShorthand` and `boxShorthand` stay byte-identical for their 55 + 15
  existing callers. Only the migrated blocks' preview sites (U2's editor arm lists them) switch to the
  sibling; the 13 `wholeBox` sites drop the flag by moving to it, by hand, with a diff read (hero's PHP
  and its three preview calls together or not at all). `tests/js/spacing-preview-longhands.test.js` pins
  the sibling: one side → one key; none → `{}`; per-side merge across tiers (D-2); negative control —
  planting a `'0'` fill turns it red. Run (PowerShell): `npx wp-scripts test-unit-js tests/js/spacing-preview-longhands.test.js`.
- [x] **Regenerate `scripts/migrate-box-longhands-baseline.json`** after `--apply` (the ratchet fails on
  an entry no longer reproduced, so a stale baseline turns the gate red on success).
- [x] **VERIFY:** `python scripts/migrate-box-longhands.py --check` exit 0 with only U6's sites left in
  the baseline; `crosscheck()` shows no editor flag on a migrated block; the JS test above green;
  `npm run build` (PowerShell) green.

### U6 — the bespoke padding/margin sites (main thread) — 25 min
**Files:** e.g. `includes/helpers-box.php::sgs_label_box_css_rule`, `includes/helpers-button-style.php`
(padding only — its border width stays, D-4), `src/blocks/form/render.php`, `src/blocks/tabs/render.php`,
`src/blocks/product-card/render.php`, `includes/nav-menu-submenu-link-css.php` (tier loop).
- [x] Each site by hand, including the 5 ternary assignments; the two double-use sites stay on the
  shorthand with a one-line reason. Regenerate the baseline afterwards.
- [x] **VERIFY:** `--check` exit 0 with the baseline empty of migratable entries; a whole-codebase
  re-grep for the old shape on migrated sites returns nothing (method Step 9b).

### GATE 3 — how far can `seedSides` go? (decided by data; expected: NARROW)
`seedSides` must not outlive the PHP, but it must keep seeding any block the route writes that still
zero-fills. Read-only:
```
SELECT block_slug, attr_name, css_property FROM block_attributes
WHERE (box_family IS NOT NULL OR tier_shape = 'box_only')
  AND css_property IN ('padding','margin','border-width') AND source = 'sgs'
```
intersected with the census's still-zero-filling blocks (every border-width site, D-4, after P2-b).
`seedSides` seeds only a border width; padding and margin boxes are written one side alone.
**Pass:** the query's pairs that are still zero-filling equal the census's refused + excluded sites
(by `block` + `attr`) exactly.
**Fail:** a pair the route writes that is in neither list → stop; the census missed a zero-fill site.

### U7 — `seedSides` narrowed — 20 min
**Files:** `scripts/computed-route/lib/resolve.mjs`, `scripts/computed-route/tests/resolve.test.mjs`,
`scripts/computed-route/README.md` if it names the closure.
- [x] `seedSides` seeds only for GATE 3's pairs; everything else writes only the measured side.
- [x] Rewrite, not delete, the three tests: a migrated padding box writes **only** the measured side; a
  box that holds sides merges; an empty phone tier on a migrated block is **not** seeded; plus one test
  that a still-zero-filling pair (e.g. `container.gridItemPadding`) IS still seeded.
- [ ] Negative control: restoring the unconditional `seedSides` turns the migrated-block tests red.
- [x] **VERIFY:** `node --test "scripts/computed-route/tests/*.test.mjs"` green;
  `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json` exit 0.

### Commit rule (replaces the brief's single-commit rule, which the deploy makes impossible)
U1, U2, U3 commit separately (inert). U4 commits before its deploy (the helper is unchanged, so this is
safe). **U5, U6 and U7 land in ONE commit** — the PHP batch, the editor preview and the narrowed
`seedSides` together — and only after this **pre-commit gate** exits 0 on every command:
`php -l` on every changed PHP file; `vendor/bin/phpunit` (whole suite);
`vendor/bin/phpstan analyse -c phpstan.neon`; `npx wp-scripts test-unit-js`;
`node scripts/audit-inline-styling.js --check`; `python scripts/migrate-box-longhands.py --check`;
`npm run build` (PowerShell); the route's three gates. Commit locally; **push only after U8's live
reads pass**. Between U4 and that commit, **no one runs `solve.mjs` on Eye Care** (the
unnarrowed `seedSides` would write explicit `0px` sides onto whatsapp-cta); peers are told at U4.

### U8 — both surfaces, then the client — 40 min
- [x] Deploy sandybrown (message peers; `ps -ef | grep -E "[s]gs-update|[b]uild-deploy"` empty; deploys
  are serialised, never concurrent).
- [ ] Extend `plugins/sgs-blocks/scripts/qa/check-box-longhands-live.mjs` with one instance each of: a boilerplate block, `label`
  (pill fill), `option-picker` pill, `hero` content/media padding, `card-grid`, `product-card`, one
  `helpers-button-style` caller — each with its expected values written into the script BEFORE it runs.
  `node plugins/sgs-blocks/scripts/qa/check-box-longhands-live.mjs` exit 0 at 375, 768 and 1440, front end and editor; the fixture post
  emptied in the same command.
- [x] Push.
- [x] Eye Care: after the next eye-care-test deploy (peers' schedule; message them), `solve.mjs --rounds 0` per surface; then
  `git status --porcelain -- 'sites/eye-care-ward-end/build/*.tree.json'` must be empty. Expectation is
  modest: the 162 committed tier boxes that already hold an explicit zero keep rendering it; those are
  a content clean-up, listed for Bean, not a framework fault.
- [x] Docs to current truth in the same pass: register CR6 row (`.claude/plans/2026-10-02-eye-care-fix-register.md`),
  Spec 47 §5 Residual's CR6 entry, the backlog's §CR6, and `.claude/LEDGER.md`; phase-2 items stay named
  here.

## Phase 2

| Item | Why later |
|---|---|
| P2-a Corner radius: a corner longhand sibling (`border-top-left-radius` family) for `sgs_corner_object_shorthand`, `helpers-container.php::sgs_serialise_box_corners`, `media/atoms/box-shape.php` corners | **DONE 2026-10-07, verified live.** `helpers-box.php::sgs_corner_object_longhands` (`55333a6b2`); every corner site migrated through the detector's corner row (`6709be346`, pilot `93f8508eb`, batch `1b4b3f6ad`: 49 sites in 25 files, plus form's base radius, `helpers-button-style.php`'s base radius and `google-reviews::$gr_box_rule` corners by hand). Editor: `border-preview.js::sgsBorderPreview` previews radius through `radius-preview.js::borderRadiusLonghands` for every caller, so the canvas matches the page on every block that wires the shared panel's radius (`git grep -l onRadiusChange -- plugins/sgs-blocks/src/blocks`); `wholeTier` and `borderRadiusPreview` are gone. The wiring fingerprint learned property-name-map builders and thin wrappers (`wf_channel.py::emits_css`, test `test_emits_css_map_and_wrapper.py`). Gate `migrate-box-longhands.py --check` baseline 0. Live on sandybrown: `check-box-longhands-live.mjs` 30/30 (radius cases D/E read `20 0 0 0` / `0 0 4 0` before) and `check-box-corners-blocks-live.mjs` 42/42 (24 rows red before) |
| P2-b The `var()` holdouts → per-side or per-corner custom properties | **DONE 2026-10-08** (`613d5722b`, `30638adef`, GATE 3 `23ab75119`). Every holdout prints one custom property per set side or corner per tier through `helpers-box.php::sgs_box_object_property_list` / `::sgs_corner_object_property_list` (JS twins `tierBoxProperties`, `borderRadiusProperties`), and the stylesheet reads each through its own `var()`: accordion header and content padding (`--sgs-accordion-{header,content}-pad-{side}`, bases `*-pad-base-{x,y,top,bottom}`), multi-button child radius (`--sgs-mb-btn-radius-{corner}`, read by `button/style.css`), nav submenu radius (`--sgs-nm-submenu-radius-{corner}`, chain ends at the 8px token) and the container grid-item padding and radius (`--sgs-gi-padding-{side}`, `--sgs-gi-radius-{corner}` through `helpers-responsive.php::sgs_responsive_atoms_from_spec`'s new `corners` option; the nested-grid reset covers all eight). `sgs/label` tests presence with `sgs_box_object_longhand_list`. The four border widths stay zero-filled (D-4). The wiring fingerprint learned a helper that joins a caller-supplied name into a declaration and a dash-ended custom-property prefix (`wf_channel.py::emits_css`, `wf_tokens.py::CP_NAME_RE`). Live on sandybrown: `scripts/qa/check-box-var-holdouts-live.mjs` read 13 front-end rows red before the deploy (e.g. accordion at 768 `30 0 0 0`) and 15/15 green after, at 1440/768/375; the editor rows pass for accordion and grid-item. The nav submenu has no live row (its fixture needs a menu); `tests/php/VarHoldoutPropertiesTest.php` pins its output. The editor canvas never painted the group radius because `button/editor.css` hardcoded `border-radius: 10px`; that line is gone. |
| P2-c `media/atoms/media-padding.php` + JS twin `media-padding.js::sidesToShorthand` | **DONE 2026-10-07 (`1b4b3f6ad`), verified live.** Media padding and the box-shape corners are one custom property per side or corner per tier, emitted only when set, read through per-side tier chains (`assets/css/media-atoms/{media-padding,box-shape}.css`); PHP and JS twins pass `scripts/tests/test-media-atom-parity.mjs` with one-side and one-corner cases. Padding values now pass the box-shape length sanitiser (they reached the style block raw before). Live: the media rows of `check-box-corners-blocks-live.mjs` |
| P2-d `google-reviews::$gr_box_rule` and `helpers-border-style.php::sgs_border_box_decls` (padding only) | **DONE 2026-10-07 (`ef653e2c3`)**: `$gr_box_rule` prints padding as the sides each tier itself sets (root, header row, card, rail and the three buttons); border width and corners stay on the shorthand (D-4, P2-a). `sgs_border_box_decls` holds no padding (border style and width only), so nothing to migrate there. `tests/php/GoogleReviewsPaddingLonghandTest.php` 6/6 with a planted-zero-fill control |
| P2-e The Eye Care tier boxes holding an explicit zero side | Done 2026-10-08, no tree edit: 161 boxes with a zero beside a non-zero side (the plan's 162 was one more) across 11 trees, each measured against the draft at its width. 143 KEEP (the draft paints 0 on that side). 5 are mispaired and not comparable (`header-2` pairs the whole draft header bar, `help-0` pairs `main`; their zeros are Solve's compensation for padding carried by a neighbour, so clearing them would add stylesheet padding). 13 could not be measured: contact heading margin and whatsapp-cta (same shape as the measured KEEP rows), home `cr-ref-home-3` and brand-strip, cart empty panel (not in the live DOM), card-grid `imagePadding`, nav-drawer `drawerPadding`. A cleared box needs a draft element that carries the padding; none was found. The 18 stay as they are until a surface walk covers them |
| P2-g One shared border function from the helpers that already exist (Bean, 2026-10-07) | **DONE 2026-10-08.** Step 0 (`6b686d6c6`): no block reads WordPress's native `style.border`. **The function:** `includes/helpers-border-style.php::sgs_border_element_decls( $attributes, $prefix, $selector, $options )` returns `base`/`tablet`/`mobile`/`hover` declaration lists and standalone `rules`, composed only from `sgs_border_box_decls`, `sgs_border_gradient_css`, `sgs_border_radius_tiers`, `sgs_corner_object_longhands` and the style engine. Rules: width and style print only with a width, a set width with no style paints solid (G5); an explicit `none` prints `{border-style:none;border-width:0}` and no colour, ring or hover; a flat colour is `border-color` with or without a width; a gradient paints the masked ring at the top width (else `ring_width`, default 1px) and carries the hover paint; a hover gradient over a flat resting border is a hover-only ring; radius at three tiers (`radius` names a non-prefixed radius attribute, or false). Options: a LITERAL `colour` map, `colour_default`, `ring_width`, `radius`. **Callers:** 61 files (every client border in `src/blocks` plus `includes/notice-banner-icon-badge.php`): quote cluster (`5799564c2`, `ad8307d10`), 51 more elements (`f4ebc7097`), the last eight (`69515de0f`). Each migration was proved by `tests/php/BorderElementParityTest.php` (declaration set per selector against goldens recorded at HEAD before the edit; 589 cases over 65 targets) and `test_desktop_radius_precedes_the_tier_radius` (counter, brand-strip, countdown-timer and table-of-contents printed the desktop radius after the tier rules; theme-toggle never printed its tiers; all fixed). Every parity difference is a named shared rule, listed in the three commit messages. hero[splitMedia]'s radius stays in the box-shape media atom's per-tier storage (`radius => false`). **Routing:** the analyser cannot derive the helper's attributes (widths through a loop, colours through a variable map), so each caller's block.json element manifest maps every attribute it reads; `scripts/migrate-border-element.py --check` fails when one is unmapped, when a caller reads an attribute outside the call, or when the prefix or options are not literals (registered `border-element-check` + `border-element-selftest`). Reseeds `5dd427e98`, `14a9c4baa`; db-consistency F6 reads 0. **Gates taught the call:** check-dead-controls, classify-end-shape + colour-codemod/survey.js, migrate-border-shape-b. **Security:** `helpers-box.php::sgs_border_radius_tiers` runs a uniform string radius through `sgs_css_length_value` (a `;}` breakout is no radius). **Live (sandybrown, deploy 14a9c4baa):** quote, counter, heading, card-grid, trust-bar, business-info, text, container, brand-strip, hero, the notice-banner icon badge and the social-icons wrapper read widths 2/4/2/4px, solid, the primary colour, and radius 12/12/4/4 at 1440, 6/12/4/4 at 768 and 2/3/4/4 at 375 (headless Chrome, getComputedStyle on post 4750, restored empty); a gradient quote reads a transparent border with a linear-gradient ::before; an explicit-none heading reads style none, width 0. theme-toggle renders nothing without a dark palette; mega-aside needs a mega-panel parent. **QC council (2026-10-08, five raters):** a last-wins cascade diff old vs new over 24,998 rows found 0 unexpected winners; the full PHPUnit suite found what the border tests could not and is green (2,834): google-reviews' tier-object card width printed nothing (the function now prints a tiered width per tier), product-card's numeric tag radius was dropped (the radius reader takes a number), form's field never printed the none override, the hover-only ring lacked its :focus-within twin, notice-banner's badge printed 50% over any variant (default now unset) (`cb5dc196a`). google-reviews' per-device boxes were marked box_only, so the builder refused tiered values: `scripts/orchestrator/object_attr_shape.py` reads a normalising closure and a tier-declared width (`edff4cd95`, `967bb7136`, reseeded; read live 2/4/1px). Sandybrown runs `967bb7136`. **Bespoke by design (not hand-built glue):** `sgs/button` (own emitter), button-shaped elements on `sgs_button_element_style_css`, option-picker, mega-panel, card-grid's card, brand-strip's item and tile, multi-button's child-button defaults and form's field colour (custom properties read by stylesheets), buybox's gallery thumbnails (Current state), the nav menu CSS files, admin and variation files (literal CSS). Census: `scripts/migrate-border-element.py --survey --json` |
| P2-f `behavioural-analyser/extract-signatures.py` learns `sgs_box_object_longhands( $obj, '<property>' )`'s property argument | **DONE 2026-10-07 (`41b0a2e6f`, classifications `eb6169bb9`)**: `helper_maps.py::derive_family_composers` reads the helpers whose declaration names come from a parameter; a call routes its value argument to its literal property; result elements and a held selector variable give each box its element; a family route that would share an unelemented slot is refused (`sgs/icon` `padding`). The 5 overrides are deleted; Stage 1 reproduces their rows exactly and db-consistency F6 reads 0 |
| P2-h The inherited value shows in a narrower tier's empty box (Bean, 2026-10-08) | **DONE 2026-10-08** (`613d5722b`, `30638adef`). `utils/inherited-box.js::inheritedBoxValue` finds the nearest wider tier that sets a side or corner; `SgsBoxControl` shows it as placeholder text and the slider rests at it without writing; `ResponsiveBoxControl` passes it for its own tiers and `ResponsiveOverride` provides it through `InheritedBoxContext`, so every direct mount inside an override gets it. `ResponsiveBorderRadiusControl` now renders `SgsBoxControl` with corner labels. `tests/js/inherited-box.test.js` carries a planted negative control. Live on sandybrown: a text block's radius corner set only at Desktop reads `placeholder="6px"` on the Tablet and Mobile tabs and the attribute is unchanged. |
| P2-i The framework DB marked `sgs/accordion` `headerPadding` and `contentPadding` `is_responsive = 0` although the block stores and renders per-device tiers | **DONE 2026-10-08** (`9d8da3067`, `1ec2a3273`, reseed `ced5c34ae`). The cause: `sgs/accordion` hands both attributes to `sgs/accordion-item` through `providesContext`, and only the item's `render.php` unpacks them per tier, so the per-block scan never saw the evidence. `object_attr_shape.py::context_tier_keys_from_php` reads a context key that reaches `sgs_responsive_normalise_object` (directly or through a closure) and `sgs-update-v2.py::_context_tier_attrs_by_provider` maps it back through `providesContext` to the provider's attribute; of the providers it flips exactly those two (`tier_object`, `is_responsive 1`). The same reseed gave `sgs/multi-button` `childBtnBorderRadius` `border-radius` and `tier_object`. The reseed exposed a second blind spot: blocks that build their border through `sgs_border_element_decls` hide the radius tiers inside the helper, so `heading`, `counter`, `quote`, `timeline`, `process-steps` and `icon-list` `borderRadius` had flipped to `box_only`; `_border_element_radius_attrs` reads the helper's contract (`{prefix}BorderRadius`, a literal `radius` option, or `false`) and the reseed restored all six. `wp-build-page.js` accepts the tiered accordion padding and still refuses a tier on a flat attribute (`sgs/container::borderWidth`); the live fixture's `fixtureNote` key is gone. Tests: `scripts/orchestrator/tests/test_context_tier_keys.py`, `test_border_element_radius.py`, each with a planted negative control. |
| P2-j Owed after the P2-b `/qc` (2026-10-08) | **DONE 2026-10-08** (`0b22745ec` code; `9e6f73bc4`, `bb0a550fd`, `9d8da3067` follow-ups), read live on sandybrown at 1440/768/375 with `scripts/qa/check-box-var-holdouts-live.mjs` (46/46, front end and editor canvas). (1) A button radius stored as `"8px"` shows one linked 8 (four equal corners) and an edit saves a corner object; a fresh container's grid-item Border radius, typed as 8 on all corners, saves and its cell computes 8px on the page. (2) `capture-tier-fixture.py` maps `gridItemPadding` to `--sgs-gi-padding-top`. (3) An inherited spacing preset reads `Default (M)` (the preset's name) in `SgsBoxControl.js::presetRow`, through `utils/inherited-box.js::inheritedValueLabel`. The live read found two more defects, both fixed: the build's minifier folds the four `padding-{side}` longhands into one shorthand, which paints nothing when any side's custom property is unset, so a box that set only its top lost it (the grid-item sides now fall back to 0 in `container/style.css`; `tests/js/per-side-var-fallback.test.js` fails on any block stylesheet that reads four bare per-side custom properties); and the editor canvas previewed a bare-number side or corner as no value while the page paints it, so `utils/bare-length.js` mirrors `sgs_css_length_value` (px, or the spacing preset when the theme registers that slug). |

## Risk register
| Risk | Unit | L | I | Mitigation |
|---|---|---|---|---|
| A misread consumer emits `padding:padding-top:…` | U2/U5 | M | H | Three allowed use shapes only; everything else refused; GATE 2 live proof |
| Phantom 3px borders from width longhands | — | — | H | D-4: border width is out of CR6 |
| Desktop changes go unverified | U5/U6 | H | M | U8 reads 1440 for every desktop-tier site named in Facts |
| Editor and front end disagree | U5 | H | M | D-5: preview moves in the same commit; editor read in U4 and U8 |
| `seedSides` removed while a written block still zero-fills | U7 | H | H | GATE 3 narrows by query; a test keeps `gridItemPadding` seeded |
| Solve writes `0px` sides mid-migration | U4–U7 | M | M | No Eye Care `solve.mjs` between U4 and the batch commit; peers told |
| New helper fatals a standalone test | U1 | M | H | Hard-coded side order; standalone test in VERIFY |
| Explicit `'0'` dropped | U1 | M | M | Test row |
| Peers edit the same `render.php` mid-batch | U5 | M | M | `git status --porcelain` on census paths before `--apply`; explicit pathspecs |
| The 5 ternary assignments slip through the coupled transform | U2/U6 | M | M | Refused with a fixture; done by hand in U6 |
| A stale baseline turns the ratchet red after a successful batch | U5/U6 | H if missed | M | Baseline regenerated after every `--apply` (U5, U6) |
| A Haiku subagent mis-edits a shared file | U5 | M | H | Cold prompt names the exact transform; the main thread reads every diff; the pre-commit gate |
| Concurrent deploys on sandybrown | U4/U8 | M | M | Message peers; process check; one deploy at a time |
| A calibration fixture left live | U4/U8 | M | L | Emptied in the same command as the read (auto-memory: restore fixtures in the same command) |
| The Eye Care re-measure waits on a peer's eye-care-test deploy | U8 | H | L | Scheduled with peers; the framework commit does not wait on it |

## Effort summary
| Unit | Executor | Estimate | Cumulative |
|---|---|---|---|
| U1 | main | 10 min | 10 |
| U2 | main | 50 min | 60 |
| U3 | main | 10 min | 70 |
| U4 | main | 20 min | 90 |
| — | **GATE 2: hard stop, take a break** | | |
| U5 | main + Haiku | 40 min | 130 |
| U6 | main | 20 min | 150 |
| U7 | main | 15 min | 165 |
| U8 | main | 35 min | 200 |

The smallest plausible figures, reconciled across the effort review (optimistic end) and the independent
review (which judged U5 and U8 at least 2x short at 30 / 25 min). U2 carries the real downside: a
recogniser that misses a local triple.

**First action (< 5 min, no dependencies):** back up `includes/helpers-box.php` to the scratchpad and
write `BoxLonghandTest.php`'s byte-identity table for the OLD function — it passes today, and every
later step relies on it.
