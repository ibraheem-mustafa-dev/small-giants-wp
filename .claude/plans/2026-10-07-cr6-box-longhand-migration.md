---
title: CR6 — migrate the padding and margin shorthand that zero-fills unset sides
project: small-giants-wp
created: 2026-10-07
status: draft
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
| D-1 | A NEW sibling function; the old `helpers-box.php::sgs_box_object_shorthand` stays byte-identical for the `var()` holdouts and every site this plan does not migrate | `.claude/plans/2026-10-05-eye-care-functionality-backlog.md` §CR6 (validated design) |
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
| **8 `var()` holdouts** (a longhand cannot work): `--sgs-mb-btn-border-width-default`, `--sgs-mb-btn-radius-default`, `--sgs-trust-badge-circle-border-width`, `--sgs-nm-submenu-border-width`, `--sgs-media-padding*`, `--sgs-media-border-width`, `--sgs-gi-*` (via `helpers-container.php::sgs_serialise_box_sides`), and `accordion-item/render.php::$sgs_ai_box_tiers` → `--sgs-accordion-header-pad` / `--sgs-accordion-content-pad` | read each emission line |
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
- [ ] `sgs_box_object_longhand_list( $box, string $family ): array` — `$box` is the same
  `['top'=>…,'right'=>…,'bottom'=>…,'left'=>…]` the old function reads; one `"<family>-<side>:<value>"`
  per set side, in a **hard-coded** `top, right, bottom, left` order (no dependency on
  `helpers-responsive.php`, which the standalone notice-banner test does not load). Families: `padding`,
  `margin` only (D-4). Values through `sgs_css_length_value()`, exactly as the old function; a side
  counts as set when that returns non-`''` (so an explicit `'0'` IS set). Untyped `$box` with an
  `is_array()` guard; unknown family → `[]`.
- [ ] `sgs_box_object_longhands( $box, string $family ): ?string` — the list joined with `;`, **`null` when
  empty** (every consumer guards with `if ( null !== $x )`; `''` would print `.x{}`).
- [ ] `BoxLonghandTest`: one side, all four, none → `null`, explicit `'0'` kept, unsafe value rejected,
  unknown family → `[]`/`null`; plus **a byte-identity table pinning `sgs_box_object_shorthand`** today.
- [ ] **VERIFY:** `cd plugins/sgs-blocks && vendor/bin/phpunit --filter BoxLonghandTest` green; plant
  the `'0'` fill in the new function → red; restore from a backup copy → green;
  `php tests/php/run-notice-banner-icon-badge-standalone.php` still passes.
- [ ] Commit alone (inert: nothing calls it yet).

### U2 — the detector (critical path) — 70 min
**Files:** new `plugins/sgs-blocks/scripts/migrate-box-longhands.py`; new
`reports/migrations/box-longhands-census.json` (repo root; create the folder if absent).
The skeleton `scripts/migrate-length-sanitiser.py` is line-based; this needs a **file-level, two-pass
transform**. Keep the skeleton's gates and constants (`EXCLUDE`, `BARE_OK`, `WIDTH_OK`, the broad
enumeration, `check_corpus_width`), and write new: pass 1 collects each variable assigned from
`sgs_box_object_shorthand( <expr> )` and all its uses; pass 2 rewrites.
- [ ] **Allowed uses** (anything else → `unrecognised`, untouched): (a) `null !== $v` / `$v !== null`
  directly in an `if` whose body holds a declaration use; (b) `"<family>:{$v}"` in an interpolated
  string, including inside a whole rule `"{$sel}{margin:{$v};}}"`; (c) `'<family>:' . $v` where
  `<family>:` ends a single-quoted segment. Rewrite: the assignment →
  `sgs_box_object_longhands( <expr>, '<family>' )`; (b) → `"{$v}"`; (c) → `$v` with the quote spliced;
  (a) unchanged. The family is read from the declaration, and every declaration of one variable must
  name the same family.
- [ ] Refuse and name: the two double-use sites (`helpers-button-style.php::$border_width_shorthand`,
  `label::$base_padding_shorthand`), every `border-width:` use (D-4), and the 8 `var()` holdouts
  (`EXCLUDE`, each with a written reason; assert each path exists). `BARE_OK` the
  `function_exists( 'sgs_box_object_shorthand' )` guards with per-file counts. Report
  `google-reviews::$gr_box_rule` and `helpers-border-style.php::sgs_border_box_decls` as zero-fill
  copies outside the helper.
- [ ] CLI (method contract): `--survey`, `--survey --json` (writes the census), `--fix` (unified diff via
  `difflib`), `--fix --apply` (atomic `.tmp` + `os.replace`), `--check`, `--self-test`, and
  **`--only <block-slug>[,…]`** to scope `--fix`. Root anchored on `.claude/THE-MIGRATION-METHOD.md`;
  prune `.claude/worktrees/`, `node_modules/`, `build/`, `vendor/`, `scripts/**/fixtures/`.
- [ ] Editor arm (report only, no JS rewrite): for each migrated block, list every padding/margin
  preview call (`tierBoxShorthand(`, `boxShorthand(`, `spacingPreview(`) in ANY `src/blocks/<slug>/*.js`,
  flagging `wholeBox = true`; `crosscheck()` fails while a migrated block still previews padding/margin
  through a `0`-filling call.
- [ ] **The 5 ternary assignments** (`$v = $cond ? sgs_box_object_shorthand( … ) : …`, e.g.
  `includes/nav-drawer-chrome-css.php`) are refused and named, with a fixture; they go to U6 by hand.
- [ ] Census JSON schema: `{ generated, totals: {migratable, refused, excluded, bareOk, unrecognised},
  sites: [ { file, line, block, attr, variable, family, tier: "desktop|tablet|mobile|n/a", category, reason } ],`
  where `attr` is the `block_attributes.attr_name` the variable is built from (read from the
  `$attributes['…']` the box object comes from), so GATE 3 can read (block, attr) pairs;
  editorFlags: [ { file, line, block } ], zeroFillCopies: [ … ] }`.
- [ ] Fixtures before the transform: positive (each of a/b/c), definition (old function survives),
  edge (a double-use variable → refused), border-width declaration → refused, a statement spanning
  several lines (hero's concatenated rules), negative control
  (byte-identical), idempotence, and a corpus control reconciling against a dumb wide
  `sgs_box_object_shorthand(` grep (`WIDTH_OK` names each wide-only hit) — run on `--check` too.
- [ ] Declared population, BEFORE the first run: migratable ≈ 112 boilerplate assignments + the
  desktop/local triples listed in Facts; refused/excluded = the 8 holdouts, the 2 double-use sites, every
  border-width site.
- [ ] **VERIFY:** `python scripts/migrate-box-longhands.py --self-test` exit 0; `--survey` reconciles
  with the declared population; census written. Commit (inert).

### GATE 1 — detector proven (auto-gate)
**Pass:** `--self-test` 0; survey reconciles per file with the declared population; negative control
byte-identical. **Fail:** an unexplained difference → fix the recogniser; never band the count.

### U3 — the gate, ratcheted by a baseline — 10 min
**Files:** `plugins/sgs-blocks/scripts/gates.json`, `plugins/sgs-blocks/package.json`, new
`plugins/sgs-blocks/scripts/migrate-box-longhands-baseline.json`.
- [ ] Copy `check-enum-control-shape.py`'s ratchet: the baseline lists today's migratable sites;
  `--check` fails on a NEW zero-fill padding/margin site outside it AND on a baseline entry no longer
  reproduced (so the baseline must shrink as blocks migrate). Green from the day it is registered.
- [ ] Record in `gates.json` with the 7 fields that exist (`id`, `cmd`, `tier: "fast"`, `added_D`,
  `added_commit: null`, `budget_ms: null`, `order` = max + 1 from `npm run gate:list`); alias
  `check:box-longhands` in `package.json` (tab-indented file).
- [ ] `.claude/THE-MIGRATION-METHOD.md` Step 8: its `mode`/`openBacklog` text is correct (it is scoped to
  `inspector-scan/rules.json`); add the missing line that a `gates.json` gate keeps its ceiling in the
  script's own sibling baseline. **Done 2026-10-07.**
- [ ] **VERIFY:** `npm run gate:list` lists it; `--check` exit 0; planting a new
  `sgs_box_object_shorthand` padding site in a scratch copy → exit 1. Commit.

### U4 — the pilot, live on both surfaces (critical path) — 25 min
**Files:** `src/blocks/whatsapp-cta/render.php` (+ its editor preview if it passes `wholeBox`).
- [ ] `python scripts/migrate-box-longhands.py --fix --apply --only whatsapp-cta`; read the diff; update
  the baseline.
- [ ] The editor sibling lands HERE, not in U5: U4's VERIFY compares the editor with the front end, and
  case B (desktop unset, tablet top only) previews `40px 0 0 0` through today's `spacingPreview()`. Add
  `src/utils/spacing-preview.js::tierBoxLonghands` and its test (U5's editor step describes both), and
  switch `whatsapp-cta`'s preview to it. `migrate-box-longhands.py --check`'s editor arm then passes for it.
- [ ] **Commit** (the deploy builds from HEAD and refuses dirty files).
- [ ] Peers: message them; `ps -ef | grep -E "[s]gs-update|[b]uild-deploy"` must be empty. Build in
  PowerShell (`cd plugins/sgs-blocks; npm run build`), then
  `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`.
- [ ] Fixture: a JSON tree in `.claude/scratch` built with `scripts/wp-build-page.js` onto the sandybrown
  calibration post (`scripts/computed-route/calibration-targets.json` → `sandybrown.postId`), three
  `sgs/whatsapp-cta` instances:
  (A) desktop sides 24px, tablet `{top:'40px'}`; (B) desktop unset, tablet `{top:'40px'}`;
  (C) tablet `{left:'30px'}`, mobile `{top:'50px'}`.
- [ ] Read with one script, `.claude/scratch/cr6-read.mjs` (Playwright `chromium`, `channel: 'chrome'`):
  for each instance and each width 1440 / 768 / 375, `getComputedStyle(el)` padding-top/right/bottom/left
  on the front end, and the same on the editor canvas (`/wp-admin/post.php?post=<id>&action=edit`, the
  canvas iframe, `Edit` preview width set to Desktop / Tablet / Mobile). It prints one row per
  (instance, surface, width) and exits 1 on any mismatch with the expectations below.
- [ ] **VERIFY** (`node .claude/scratch/cr6-read.mjs` exit 0), values top/right/bottom/left:
  A at 768 = `40px 24px 24px 24px` (was `40px 0px 0px 0px`; desktop bottom 24px inherited);
  B at 768 = `40px 24px 12px 24px` (stylesheet `.sgs-whatsapp-cta--inline.sgs-whatsapp-cta__btn{padding:12px 24px}`);
  C at 375 = `50px 24px 12px 30px` (D-2: mobile keeps tablet's left 30px). All three at 1440 unchanged
  from before. Editor rows equal front-end rows. Empty the calibration post in the same command.

### GATE 2 — the shape holds live (auto-gate; D-3 settles the shape) — **HARD STOP before the batch**
**Pass:** every VERIFY value above, front end and editor. **Fail:** any side 0 or editor/front-end
disagreement → stop; the helper, the cascade or the preview is wrong.

### U5 — the batch, PHP and editor together — 40 min
**Files:** the 30 boilerplate `render.php`; the local triples (`hero`, `card-grid`, `theme-toggle`,
`language-switch`, `choice-flow`, `option-picker`, `product-search`, `store-selector` — `product-card` and
`label` are U6's); the 13 editor flag sites; `src/utils/spacing-preview.js`; new
`tests/js/spacing-preview-longhands.test.js`; `scripts/codemods/box-desktop-to-tier.js` (each migrated
block leaves its `WHOLE_BOX` list, since its tier no longer resolves as a whole box).
- [ ] `git status --porcelain -- <census paths>` empty (peers edit these files); `git rev-parse HEAD`
  recorded; `--fix` (read every diff); `--fix --apply`; `git diff --stat` file count = the census.
- [ ] Refused but shape-identical → Haiku via `/delegate`, one cold prompt per file group naming the
  exact coupled transform; the main thread reads every diff.
- [ ] Editor (D-5), mirroring D-1 so no existing JS caller changes: `src/utils/spacing-preview.js` gains a
  sibling `tierBoxLonghands( tiers, tier, family )` returning a style object of the **set sides only**
  (`{ paddingTop: … }`); `tierBoxShorthand` and `boxShorthand` stay byte-identical for their 55 + 15
  existing callers. Only the migrated blocks' preview sites (U2's editor arm lists them) switch to the
  sibling; the 13 `wholeBox` sites drop the flag by moving to it, by hand, with a diff read (hero's PHP
  and its three preview calls together or not at all). `tests/js/spacing-preview-longhands.test.js` pins
  the sibling: one side → one key; none → `{}`; per-side merge across tiers (D-2); negative control —
  planting a `'0'` fill turns it red. Run (PowerShell): `npx wp-scripts test-unit-js tests/js/spacing-preview-longhands.test.js`.
- [ ] **Regenerate `scripts/migrate-box-longhands-baseline.json`** after `--apply` (the ratchet fails on
  an entry no longer reproduced, so a stale baseline turns the gate red on success).
- [ ] **VERIFY:** `python scripts/migrate-box-longhands.py --check` exit 0 with only U6's sites left in
  the baseline; `crosscheck()` shows no editor flag on a migrated block; the JS test above green;
  `npm run build` (PowerShell) green.

### U6 — the bespoke padding/margin sites (main thread) — 25 min
**Files:** e.g. `includes/helpers-box.php::sgs_label_box_css_rule`, `includes/helpers-button-style.php`
(padding only — its border width stays, D-4), `src/blocks/form/render.php`, `src/blocks/tabs/render.php`,
`src/blocks/product-card/render.php`, `includes/nav-menu-submenu-link-css.php` (tier loop).
- [ ] Each site by hand, including the 5 ternary assignments; the two double-use sites stay on the
  shorthand with a one-line reason. Regenerate the baseline afterwards.
- [ ] **VERIFY:** `--check` exit 0 with the baseline empty of migratable entries; a whole-codebase
  re-grep for the old shape on migrated sites returns nothing (method Step 9b).

### GATE 3 — how far can `seedSides` go? (decided by data; expected: NARROW)
`seedSides` must not outlive the PHP, but it must keep seeding any block the route writes that still
zero-fills. Read-only:
```
SELECT block_slug, attr_name, css_property FROM block_attributes
WHERE (box_family IS NOT NULL OR tier_shape = 'box_only')
  AND css_property IN ('padding','margin','border-width') AND source = 'sgs'
```
intersected with the census's still-zero-filling blocks: the 8 holdouts, every border-width site (D-4),
`google-reviews`, and `sgs_border_box_decls`'s callers. `container.gridItemPadding` (`--sgs-gi-padding`)
and border width will be in it, so **the expected outcome is narrow, not delete**: `seedSides` seeds
only for the (block, attribute) pairs in that intersection, read from the committed census JSON, and is
deleted outright when it empties (phase 2 completes it).
**Pass:** the query's pairs that are still zero-filling equal the census's refused + excluded sites
(by `block` + `attr`) exactly; U7 hard-codes nothing, it reads that list from the census.
**Fail:** a pair the route writes that is in neither list → stop; the census missed a zero-fill site.

### U7 — `seedSides` narrowed — 20 min
**Files:** `scripts/computed-route/lib/resolve.mjs`, `scripts/computed-route/tests/resolve.test.mjs`,
`scripts/computed-route/README.md` if it names the closure.
- [ ] `seedSides` seeds only for GATE 3's pairs; everything else writes only the measured side.
- [ ] Rewrite, not delete, the three tests: a migrated padding box writes **only** the measured side; a
  box that holds sides merges; an empty phone tier on a migrated block is **not** seeded; plus one test
  that a still-zero-filling pair (e.g. `container.gridItemPadding`) IS still seeded.
- [ ] Negative control: restoring the unconditional `seedSides` turns the migrated-block tests red.
- [ ] **VERIFY:** `node --test "scripts/computed-route/tests/*.test.mjs"` green;
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
- [ ] Deploy sandybrown (message peers; `ps -ef | grep -E "[s]gs-update|[b]uild-deploy"` empty; deploys
  are serialised, never concurrent).
- [ ] Extend `.claude/scratch/cr6-read.mjs` with one instance each of: a boilerplate block, `label`
  (pill fill), `option-picker` pill, `hero` content/media padding, `card-grid`, `product-card`, one
  `helpers-button-style` caller — each with its expected values written into the script BEFORE it runs.
  `node .claude/scratch/cr6-read.mjs` exit 0 at 375, 768 and 1440, front end and editor; the fixture post
  emptied in the same command.
- [ ] Push.
- [ ] Eye Care: after the next eye-care-test deploy (peers' schedule; message them), `solve.mjs --rounds 0` per surface; then
  `git status --porcelain -- 'sites/eye-care-ward-end/build/*.tree.json'` must be empty. Expectation is
  modest: the 162 committed tier boxes that already hold an explicit zero keep rendering it; those are
  a content clean-up, listed for Bean, not a framework fault.
- [ ] Docs to current truth in the same pass: register CR6 row (`.claude/plans/2026-10-02-eye-care-fix-register.md`),
  Spec 47 §5 Residual's CR6 entry, the backlog's §CR6, and `.claude/LEDGER.md`; phase-2 items stay named
  here.

## Phase 2 (named; recorded, not built here)

| Item | Why later |
|---|---|
| P2-a Corner radius: a corner longhand sibling (`border-top-left-radius` family) for `sgs_corner_object_shorthand`, `helpers-container.php::sgs_serialise_box_corners`, `media/atoms/box-shape.php` corners | A radius corner has no style companion, so (unlike width) an unset corner SHOULD keep the stylesheet default; 53 assignments |
| P2-b The 8 `var()` holdouts → per-side custom properties | New custom properties and stylesheet consumers per block; deletes the rest of `seedSides` |
| P2-c `media/atoms/media-padding.php` + JS twin `media-padding.js::sidesToShorthand` | Byte-parity-gated (`scripts/tests/test-media-atom-parity.mjs`); `validate` reads the shorthand's truthiness |
| P2-d `google-reviews::$gr_box_rule` and `helpers-border-style.php::sgs_border_box_decls` (padding only) | Zero-fill copies outside the helper |
| P2-e The 162 committed Eye Care tier boxes holding an explicit zero side | Content, not framework: each is checked against the draft and cleared or kept |

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
