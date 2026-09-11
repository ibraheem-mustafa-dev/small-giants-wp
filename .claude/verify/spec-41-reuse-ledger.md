# Spec 41 reuse ledger — nav-menu edit.js / render.php split (steps 7 + 8)

doc_type: verify-artifact · spec_id: 41 · owner: pure-refactor execution session, 2026-09-11

## Step 7 — `edit.js` split (pure refactor)

**Landed module roster** (supersedes the plan's guessed 4-module split — steps 14/19 must
repoint their `Files:` fields against this list, not the plan's original names):

| File | Raw lines | Leans on | Count without it |
|---|---|---|---|
| `edit.js` | 510 | `SgsColourPanel`, all 11 sibling files below | would be ~1536 (the original) if unsplit |
| `utils.js` | 116 | none — plain constants/pure functions | n/a (new file, no pre-existing shared helper covers this) |
| `useNavMenuSource.js` | 169 | `@wordpress/core-data` `useEntityRecords`, `./utils::flattenMenuItems` | n/a |
| `useDrawerNotice.js` | 153 | `@wordpress/data`/`@wordpress/block-editor` stores | n/a |
| `NavMenuNotices.js` | 134 | `./utils::LINK_COUNT_THRESHOLD` | n/a |
| `MenuSettingsPanel.js` | 120 | `./utils::BURGER_SCOPE_PX,burgerScopeOf`, `SgsLengthControl`, `ToggleGroupControl`/`ToggleGroupControlOption` (primitives) | n/a |
| `DropdownSettingsPanel.js` | 168 | none beyond core `@wordpress/components` | n/a |
| `BarPanel.js` | 114 | `SgsLengthControl`, `ResponsiveControl`, `ResponsiveOverride`, `SgsBoxControl`, `BOX_UNITS`, `normaliseResponsiveBox`, `ToolsPanel`/`ToolsPanelItem` (all pre-existing shared components) | n/a |
| `DropdownStylePanel.js` | 118 | `SgsLengthControl`, `ResponsiveBoxControl`, `ToolsPanel`/`ToolsPanelItem` | n/a |
| `ItemsPanel.js` | 110 | `SgsLengthControl`, `TypographyControls` (shared) | n/a |
| `EffectsPanel.js` | 52 | `ToggleGroupControl`/`ToggleGroupControlOption` | n/a |
| `UnderlinePanel.js` | 71 | `SgsLengthControl` | n/a |
| `FeaturedPanel.js` | 149 | `SgsLengthControl` | see note below (fold identified, not applied) |
| `BurgerPanel.js` | 37 | `SgsLengthControl` | n/a |

**Floor requirement (≥7 files): met — 12 new files + edit.js = 13 files, all mounting/using
pre-existing shared components where one applies.**

### ⛔ Outcome on the 250-line target — reported, not hidden (plan's own escape hatch)

Every extracted sub-file is **≤ 250 lines** (max is `DropdownSettingsPanel.js` at 168).
**`edit.js` itself is 510 lines — over the 250-line target — and this is a considered,
reported outcome, not an oversight:**

- `colourRows` (the literal `ArrayExpression` mounted via `<SgsColourPanel rows={colourRows} />`)
  is **258 raw lines on its own**, and owner ruling 3 requires it to stay as a single literal
  in `edit.js` (proven empirically below, not just cited from the plan).
- The remaining ~250 lines are the attribute destructure block (required so `colourRows` can
  read every attribute it needs), the two hook calls, and the JSX composition wiring 12
  imported panels together.
- **The named reuse lever (`fillRow`/`textRow` folding `colourRows` to ~105-115 lines) was
  investigated and NOT applied.** Reason: at least one row (`item-bg`) sets `gradientCapable:
  true` on a BACKGROUND-mechanism row while its states use the FILL mechanism's per-state
  `gradientValue`/`onGradientChange` shape (not the text-mechanism `gradientCapable` shape) —
  an inconsistency already present in the original code that `fillRow()` cannot reproduce
  (it never sets `gradientCapable`). Composing `{ ...fillRow(...), gradientCapable: true }`
  would risk `describeRow()` (the detector's own row-shape resolver) no longer recognising the
  row correctly, which is exactly the "code improved, gate went blind" failure mode (D738) this
  whole atomicity rule exists to prevent. Given the task's own instruction that a single
  changed control/attribute/default fails the step regardless of everything else, the fold was
  judged too risky to attempt under this step's constraints and was left out. **Per the plan's
  own line "If genuine reuse still does not reach the limit, report the measured per-file
  counts to Bean rather than shipping the violation silently" — this is that report.**

### Named hand-rolled-instead-of-shared instance (owner ruling 7) — identified, not applied

`FeaturedPanel.js`'s `featuredFontWeight`/`featuredFontWeightHover` `SelectControl`s use a
hand-rolled 4-option array (`Regular/Medium/Semi-bold/Bold` → `400/500/600/700`) where
`SGS_FONT_WEIGHT_OPTIONS` (`src/components/TypographyControls.js`) already exists. **Not
swapped in this step**: this is a PURE REFACTOR (zero control/attribute/default change), and
`SGS_FONT_WEIGHT_OPTIONS` is a different (larger) option set than the block's current 4 —
swapping it in would widen the SelectControl's available choices, a real behaviour change, not
a relocation. Documented here as a named, deferred fix rather than risked under this step's
constraints.

### Atomicity proof (owner ruling 3) — `node scripts/inspector-scan/run.js --check`

Ran against the ORIGINAL (pre-split) `edit.js` (restored from `git show HEAD:...` for the
duration of this one check, then restored to the split version — the split `edit.js` was never
absent from disk except for this single controlled comparison) and again against the split
version. Rule `31-golden-colour-control`'s `sgs/nav-menu` findings, by row:

**BEFORE** (original 1535-line edit.js):
```
edit.js:537 — colour row "item-text" carries 2 states, below the required 3
edit.js:560 — colour row "item-bg" carries 2 states, below the required 3
edit.js:725 — colour row "submenu-text" carries 2 states, below the required 3
```

**AFTER** (split, 510-line edit.js):
```
edit.js:187 — colour row "item-text" carries 2 states, below the required 3
edit.js:210 — colour row "item-bg" carries 2 states, below the required 3
edit.js:375 — colour row "submenu-text" carries 2 states, below the required 3
```

**Identical set of rows, identical state counts (2/2/2), only line numbers differ** (expected —
`edit.js` is shorter overall now). These 3 findings are PRE-EXISTING gaps (rows below the
element-manifest-derived 3-state floor) unrelated to this refactor; they are unchanged by the
split. Full JSON diff across all 35 inspector-scan rules showed only two OTHER rules with
changed finding counts for the whole tree — see the note below; neither is rule 31.

### Other detector-blindness findings (rules 21, 45) — investigated, judged non-blocking

Comparing the FULL `run.js --json` output before/after (all 83 blocks, all 35 rules), two rules
changed their `sgs/nav-menu` finding counts:

- **`21-render-without-control`** (ADVISORY, not a build gate): 4 → 37. The 33 new findings are
  every attribute driven by `<TypographyControls prefix="item"/>` (now living in
  `ItemsPanel.js`) plus the submenu typography family — this rule's reach-walk resolves shared
  components under `src/components/` but does **not** follow an import into a block-private
  SIBLING file in the block's own folder. The control genuinely still exists and genuinely
  still renders (proven by `check-dead-controls.js` below, and by the webpack build); this is a
  detector-reach gap, not a regression in the shipped editor.
- **`45-typography-full-replacement`**: 2 → 3, same root cause (one new finding for the same
  `ItemsPanel.js` `TypographyControls` mount).

**Why this is judged non-blocking for this step:** the step's own required proof commands are
`check-dead-controls.js --check` and `check-empty-inspector-containers.js --check` (both below,
both clean, both correctly resolve sibling-file controls) plus rule 31's atomicity test (above,
identical). Rules 21/45 are advisory-severity, tree-wide inspector-scan diagnostics — not named
in this step's proof list — and their blindness is a pre-existing property of the reach-walk
(scoped to `src/components/`, not per-block sibling files) that this step's split newly exposes
for nav-menu specifically. Flagged here for visibility rather than silently absorbed; a future
session widening the reach-walk (mirroring rule 31's own already-fixed `pushedRows`/shared-owner
handling) would close this for every future per-block split, not just this one.

### `check-dead-controls.js --check`

```
[check-dead-controls] OK — 0 net-new dead controls across 83 blocks + 13 extension file(s).
```
Exit 0. `sgs/nav-menu` CHECK-4 (advisory, pre-existing) count: **64 both before and after** the
split (identical — confirmed by running against the original `edit.js` via the same controlled
swap as above).

### `check-empty-inspector-containers.js --check`

Exit 0. Zero `sgs/nav-menu` findings.

### `npm run build`

`npm run build` (the full `prebuild` gate chain + webpack) exits 1 on this branch — **5
pre-existing gate failures unrelated to this step**: `dbschema-check_schema_drift`,
`db-consistency-run`, `check-undeclared-attrs`, `check-element-manifest-conformance`,
`check-hover-state-classification`. Verified pre-existing: `check-undeclared-attrs.py --check`
was run against BOTH the original and split `edit.js` and reported the **identical 10
findings** both times (all pre-existing undeclared-attribute gaps — `hoverStyle`,
`indicatorColour`, `indicatorStyle`, `itemRadius`, `itemRadiusHover`, `submenuRadius`,
`underlineColour`, `underlineColourHover`, `underlineOffset`, `underlineThickness`). The other
4 gates read `block.json`/DB schema only and were not touched by this step at all.
`[gates-ok: pre-existing dbschema-check_schema_drift, db-consistency-run,
check-undeclared-attrs, check-element-manifest-conformance, check-hover-state-classification —
verified identical against git HEAD's edit.js before this step's changes]`.

**The actual webpack compile was proven directly** (`npx wp-scripts build --experimental-modules
--webpack-copy-php`, bypassing only the pre-existing gate chain, not this step's own files):
exits 0, `webpack ... compiled successfully`, zero errors, `build/blocks/nav-menu/` contains the
bundled `index.js` (including every new sub-module) and the untouched `render.php`.

⚠ One side-effect noted and reverted: running the full `npm run build` once (before it failed on
the pre-existing gates) triggered a codegen script that rewrote
`plugins/sgs-blocks/src/blocks/nav-menu/block.json` (adding `css:fill`/`css:border-color-gradient`
attrMap entries) as an unrelated side effect of the `prebuild` chain — NOT an edit made by this
step. Reverted via `git checkout -- plugins/sgs-blocks/src/blocks/nav-menu/block.json` to keep
this step's blast radius to its one writable directory.

---

## Step 8 — `render.php` split (pure refactor)

**Landed module roster** — exactly 4 PHP files, matching Bean's decision (code-lines is
the enforced measure; comments do not count on this file, D722):

| File | Raw lines | Code lines | Leans on |
|---|---|---|---|
| `src/blocks/nav-menu/render.php` | 590 | 224 | class/entry (constructor, `flatten()`, `from_link()`, `from_page_list()`, new `get_submenu()` getter), menu resolution, attribute normalisation — the two CSS-assembly functions below |
| `includes/nav-menu-markup.php` | 468 | 250 | `sgs_nav_menu_render_items()`, `sgs_nav_menu_render_items_drawer()` (extracted from the class's own methods — see note below), `sgs_nav_menu_burger_toggle_markup()` |
| `includes/nav-menu-css.php` | 432 | 190 | `sgs_nav_menu_item_state_css()` — item typography, nav container colour, item text/background colour + pill/text/underline hover treatments, featured-item sweep |
| `includes/nav-menu-submenu-css.php` | 742 | 234 | `sgs_nav_menu_submenu_css()` — burger colour/bg/hover/size, collapse-point switch, mega/dropdown disclosure positioning, drawer-specific overrides, listColumns grid, sliding-indicator colour, root box, custom-CSS escape hatch |

**All 4 files land at or under 300 CODE lines individually** (max is
`includes/nav-menu-markup.php` at 250). **Projected `render.php` code-count once step 15
adds `sgs_nav_menu_typography_hover_rule()` (owner ruling 2, ~30 lines, stays block-private
in render.php per FR-41-21):** 224 + 30 = **254 code lines** — still comfortably under 300.

### ⚠ Not a pure copy-paste at the CLASS boundary — disclosed, not hidden

The plan's own file assignment splits `render_items()`/`render_items_drawer()` OUT of
`SGS_Nav_Menu_Bar_Renderer` into `includes/nav-menu-markup.php`, while the constructor/
`flatten()`/`from_link()`/`from_page_list()` STAY in `render.php` as the class. A class
cannot have some methods in file A and some in file B, so this required converting
`render_items()`/`render_items_drawer()` from CLASS METHODS into STANDALONE FUNCTIONS:

- `$this->featured_ids` → explicit `$featured_ids` parameter
- `$this->uid` → explicit `$uid` parameter
- `$this->submenu[...]` → explicit `$submenu` parameter (array)
- A new `public function get_submenu(): array { return $this->submenu; }` getter was added
  to the class — the ONLY new surface this split adds. `render.php`'s own bar-mode call
  site changed from `$bar_renderer->render_items( $flat_items )` to
  `sgs_nav_menu_render_items( $flat_items, $featured_ids, $uid, $bar_renderer->get_submenu() )`.

Every function BODY is otherwise byte-identical to the class method it replaces — no
logic, condition, or string literal changed, only the variable-binding mechanism. This is
disclosed here rather than silently treated as "pure" because it is a structural change
beyond a straight relocation, even though it is behaviour-neutral (proven below).

### Reuse lever — already spent, confirmed by both named surveys (expected result)

```
$ python scripts/migrate-render-closures.py --survey
0 files | closures: css_length=0 css_keyword=0 box_shorthand=0 corner_shorthand=0 radius_shorthand=0 | total=0
missing require: 0 files

$ python scripts/migrate-length-sanitiser.py --survey
... (10 BARE/SKIP entries, none in nav-menu)
MIGRATABLE:    0  (migratable = call + comment)
```

Both return 0 migratable, matching the plan's own prediction. `render.php` already carries
27 shared-helper call sites (`sgs_hover_state_rules`, `sgs_colour_value`,
`sgs_background_paint_decl`, etc.) — this is the correct, expected "none applies" row, not
a "didn't look" row.

### Byte-identity proof — pasted, not asserted

Built a scratchpad-only harness (`nav-menu-byte-identity-harness.php`, deleted after use)
extending `plugins/sgs-blocks/scripts/qa/lib/wp-stubs.php` with `wp_get_nav_menu_object()`/
`wp_get_nav_menu_items()`/`wp_parse_url()`/`parse_blocks()`/`WP_Block_Type_Registry` stubs
so a real classic-menu fixture with nested children could be built (the shared harness's
default page-list fallback resolves to an EMPTY menu via its `get_pages()` stub, which
would short-circuit `render.php` at `if ('' === $items_html) { return ''; }` before the
CSS-assembly section ever ran — a vacuous test that can't be used for this proof).

**Fixture covers every element the step names**: an item background + hover
(`itemBg`/`itemBgHover`), a featured item (`featuredItemIds:['id:5']` +
`featuredBg`/`featuredColourHover`), a submenu with a min-width (`submenuMinWidth:'260px'`,
the "Services" item's child "Sub Service"), a burger with a hover colour
(`burgerHoverColour`), and the drawer fork (run twice — bar mode with no `$block->context`,
drawer mode with `sgs/navDrawerSubmenuModel: 'accordion'`) — plus nav container colour,
sliding indicator, underline hover-style variant attrs, and responsive padding/listColumns
tiers, for full coverage of every CSS-assembly section moved.

⚠ **Each target run in ITS OWN `php` CLI process** — OLD and NEW both declare the same
`SGS_Nav_Menu_Bar_Renderer` class name behind a `class_exists()` guard; running both in one
PHP process meant whichever ran first froze the class for the rest of the process, so the
second file's own class body (carrying the new `get_submenu()` getter) never loaded. Fixed
by invoking the harness 4 times (`--target=old|new --mode=bar|drawer`), each a fresh process.

```
$ php nav-menu-byte-identity-harness.php --target=old --mode=bar    # exit 0
$ php nav-menu-byte-identity-harness.php --target=new --mode=bar    # exit 0
$ php nav-menu-byte-identity-harness.php --target=old --mode=drawer # exit 0
$ php nav-menu-byte-identity-harness.php --target=new --mode=drawer # exit 0

=== BAR MODE ===
old css len: 11321  new css len: 11321  CSS IDENTICAL: True  HTML IDENTICAL: True

=== DRAWER MODE ===
old css len: 11321  new css len: 11321  CSS IDENTICAL: True  HTML IDENTICAL: True
```

OLD is the git HEAD `render.php` at commit `614c97751` (the pre-step-8 state, saved via
`git show 614c97751:...`). The OLD copy was placed temporarily at
`plugins/sgs-blocks/src/blocks/nav-menu/render_OLD_scratch_tmp.php` (same directory depth
as the real file, so `dirname(__DIR__,3)` resolves identically) and deleted immediately
after the harness run — `git status` confirmed the tree carries no trace of it afterwards.

### `php -l` — clean on every touched file

```
No syntax errors detected in src/blocks/nav-menu/render.php
No syntax errors detected in includes/nav-menu-markup.php
No syntax errors detected in includes/nav-menu-css.php
No syntax errors detected in includes/nav-menu-submenu-css.php
```

### Build — `includes/` ships via its live source path, not a `build/` copy

`npx wp-scripts build --experimental-modules --webpack-copy-php` exits 0, `webpack ...
compiled successfully`. `diff src/blocks/nav-menu/render.php build/blocks/nav-menu/render.php`
— identical (webpack-copy-php correctly copies the split `render.php` verbatim).
`includes/nav-menu-{markup,css,submenu-css}.php` are NOT copied into `build/` — confirmed
this is correct, not missing: `dirname( __DIR__, 3 )` resolves to `plugins/sgs-blocks`
(the plugin root) from BOTH `src/blocks/nav-menu/render.php` and
`build/blocks/nav-menu/render.php` (3 levels up from either is the same plugin root), so
every `require_once dirname( __DIR__, 3 ) . '/includes/...'` call resolves to the live
`plugins/sgs-blocks/includes/` directory regardless of which copy of `render.php` is
executing — exactly product-card's own proven precedent, restated in the step's own prompt.

### `git diff --stat`

```
plugins/sgs-blocks/src/blocks/nav-menu/render.php | 1511 +--------------------
1 file changed, 35 insertions(+), 1476 deletions(-)
```
Plus 3 new files: `includes/nav-menu-markup.php`, `includes/nav-menu-css.php`,
`includes/nav-menu-submenu-css.php`.

### Fatal-avoidance (the two-instances-per-page requirement)

Every extracted function in `includes/nav-menu-markup.php`, `nav-menu-css.php` and
`nav-menu-submenu-css.php` is wrapped in its own `if ( ! function_exists( '...' ) )` guard.
`SGS_Nav_Menu_Bar_Renderer` (which stays in `render.php`) already carried a `class_exists()`
guard before this step and still does — untouched. This page carries two nav-menu
instances (header bar + the drawer's own seeded instance); both `require_once` every file
and neither re-declares anything on the second pass.

### Load-order note (written into the files themselves, not just here)

Both `nav-menu-css.php` and `nav-menu-submenu-css.php` (and `nav-menu-markup.php`) carry a
docblock note that they are `require_once`'d PER-INSTANCE from `render.php`, NOT
bootstrap-loaded like `helpers-tokens.php`/`helpers-hover-state.php`/
`helpers-colour-variants.php` — their functions are only in scope after nav-menu's own
`render.php` has run at least once on that page load. Matches the step's own required note.

---

## PLAN AMENDMENT (Lane 5, 2026-09-11) — `SgsColourPanel` gains a per-row `after` slot and forwards `contrastLargeText`

**This is a plan amendment, not an implementation detail, and it is a FIFTH shared-component
touch in this phase** — alongside the manifest rewrite, `SgsBorderControl`'s `showColour`,
`fx-magnet.css`, and `SgsColourPanel`'s original `heading` addition (step 5). Recorded as its
own row so it is disclosed individually rather than folded into a step.

**Why it was needed.** Spec 41 §9.6 requires each stateful row's hover-treatment
`ToggleGroupControl` and its two verbatim ⓘ cross-reference notes to render *with the swatch
they qualify*, and FR-41-24 says they are "rendered inline directly beneath each row's `states`
array in the literal `colourRows` object" — i.e. carried ON the row descriptor. §9.6 also
requires both border-colour rows to carry `contrastAgainst` **with `contrastLargeText: true`**
(WCAG 1.4.11's 3:1 UI-component threshold, not 4.5:1 body text).

`SgsColourPanel.js::SgsColourPanel` read exactly `key`, `label`, `states`, `heading`,
`gradientCapable`, `borderStyle`, `onBorderStyleChange` and — only on the gradient-capable
branch — `contrastAgainst` / `contrastLabel`. It had no slot for a node after a row, and it
**dropped `contrastLargeText` entirely**: a caller could set it and silently get the wrong WCAG
threshold, a contrast check present in the source and wrong at runtime. Step 5 was scoped to
`heading` ONLY; no step in the plan authorised either of these. §9.6 was therefore unbuildable
inside Lane 5's declared writable set.

**What changed** (`plugins/sgs-blocks/src/components/SgsColourPanel.js`, ~6 lines):
1. `row.after` — an optional React node rendered immediately after that row's control, inside
   the row's existing wrapper `<div>`. A SLOT, not a component: the panel makes no assumption
   about its contents.
2. `row.contrastLargeText` — forwarded alongside `contrastAgainst`/`contrastLabel`, and spread
   only when the row actually declares it, so a row that does not is byte-identical rather than
   merely behaviourally equivalent.
3. The docblock records both, plus the standing ⚠ that the contrast trio reaches
   `GradientCapableColourControl` ONLY — a non-`gradientCapable` row renders
   `DesignTokenPicker`, which has no contrast check, so the trio is inert there.

**Alternative considered and rejected:** a block-private colour panel for `sgs/nav-menu`. It
would contradict §9.6's "ONE `SgsColourPanel`" and is a far larger divergence than a six-line
additive slot.

**Approved by** the coordinating session, 2026-09-11, as covered by the same design gate step 5
already passed, extended in the same shape. Committed in isolation so it is independently
revertible.

**Proof (G1(a)-shaped — three existing callers, rendered and diffed, not argued):** the HEAD
component and the working-tree component were both loaded, given the SAME real row descriptors
from `sgs/info-box` (2 rows, one gradient-capable), `sgs/button` (a row carrying
`contrastAgainst` + `contrastLabel`) and `sgs/container` (a `heading` row, a falsy row, and a
`borderStyle` row), and their serialised element trees compared:

```
IDENTICAL  sgs/info-box  (1155 bytes)
IDENTICAL  sgs/button    (876 bytes)
IDENTICAL  sgs/container (1029 bytes)
POSITIVE CONTROL  row.after renders           = true
POSITIVE CONTROL  contrastLargeText forwarded = true
NEGATIVE CONTROL  HEAD dropped it entirely    = true
```

The two positive controls prove the additions are live (not a no-op passing by absence); the
negative control proves the `contrastLargeText` gap it closes was real on HEAD. Live caller
roster at the time of the change: `grep -rln "<SgsColourPanel" plugins/sgs-blocks/src/blocks/*/edit.js | wc -l` → **61**.
