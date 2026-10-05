---
doc_type: spec
spec_id: 47
spec_version: "0.12"
title: "Computed Route: rendered draft to block tree, measured not copied"
project: small-giants-wp
created: 2026-10-03
last_verified: 2026-10-05
status: draft
references:
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md
  - .claude/plans/2026-10-02-eye-care-fix-register.md
  - scripts/parity/GAP-CHECKLIST.md
absorbs: null
absorbed_by: null
---

# Spec 47: Computed Route

## 0. Plain English

**Problem.** The Eye Care fix register (`.claude/plans/2026-10-02-eye-care-fix-register.md`) has 146 fix lines with a
type after the first full comparison against the draft. 107 of them include a layout-file change for a setting that
already exists; 49 need a framework repair and 34 a new setting (one line can carry two types). Count: the Python
one-liner in this spec's commit message, which parses the register tables' Type column.
- The layout files were typed by agents copying selected numbers from the draft. Nothing measured the draft first.
- The commonest miss is a value the draft never states. A plain heading in the draft has no margin and normal weight
  (browser defaults), while an SGS heading defaults to an 8px bottom margin and bold.
- The draft is a script-rendered prototype: over 95% of its styling is inline, and some values are computed per screen
  width at run time, so only the rendered page holds the true values.

**Effect.** Every surface needed a long corrections round, mostly for basic padding, size and colour misses. Bean's
review time went on those instead of on the intentional design choices.

**Solution.** Measure the rendered draft and write every setting that differs, through the framework database's map
from CSS property to block setting. It works one surface at a time, in two directions that share one engine:
- **Solve (backward, built first):** take an existing layout, compare it with the draft, turn every difference into a
  setting change, rebuild, and repeat, at most three rounds. What survives sorts itself into hardcode, missing
  setting, intended divergence or unresolved.
- **Fill (forward):** AI writes only the skeleton (which blocks, nesting, content, and which draft element each block
  copies). The tool fills every style setting from the measured draft, and lists the properties no setting can
  express before anything is built.

The corrections phase then holds only intended divergences and genuine framework gaps.

**Routing.** A draft that renders by script goes to this route whatever classes it carries. A static draft that
carries SGS class names goes to Spec 31's converter. A static classless draft comes here. The two routes share the
framework database, the parity walker and the page builder, and no code. Spec 31 §0 carries the same rule.

## 1. Binding rules

| Rule | Statement |
|---|---|
| **R-47-1 Isolation** | All route code lives in `scripts/computed-route/`. Its `README.md` lists every file and every exported function with a one-line purpose, inputs, outputs and external imports; `lint.mjs` fails on a file or export missing from it. The route never edits, imports or copies Spec 31 code (`plugins/sgs-blocks/scripts/`): most converter modules import `converter/db/db_lookup.py`, which runs schema migrations on import, so even a read would write to the shared database. Changes to Spec 31's own files are made under Spec 31's plans, never from this route. |
| **R-47-2 Read-only database** | The framework database (`~/.claude/skills/sgs-wp-engine/sgs-framework.db`) is opened read-only with Node's built-in `node:sqlite` (`file:<path>?mode=ro`, which refuses writes on Node 24). The route never seeds, migrates or writes it. |
| **R-47-3 One engine** | Solve and Fill write settings only through `lib/resolve.mjs`. There is no second property-to-setting mapping in the route. |
| **R-47-4 Measured, not copied** | Every written value comes from a computed style read in a real browser. Draft source text is never parsed for values. |
| **R-47-5 Write only what differs** | A setting is written only where the draft's value differs from what the node already shows: its calibrated default paint (§3.2) for non-inherited properties, or its parent's measured live value for inherited ones (colour, font family, size, weight, line height, letter spacing, text transform). Inherited values are never repeated on descendants. |
| **R-47-6 Calibration is the slot truth** | Which rendered element a setting paints, and each block's default paint, come from calibration (§3.2). The database's `css_element` and `derived_selector` seed calibration; they never replace it. |
| **R-47-7 Tokens before literals** | Values snap to the site's tokens, read from `sites/<client>/theme-snapshot.json`, in a fixed order: exact token, then nearest within tolerance (colour ΔE ≤ 2, lengths ±0.5px), then a literal flagged in the report. Every snap is logged with its distance. |
| **R-47-8 Divergences are data** | Intentional differences live in the site's `divergences.json` (§3.5), read by Fill, Solve and the walker. |
| **R-47-9 Bounded loop** | Solve runs at most three write rounds. After each round, a row that got worse (`lib/solve-rows.mjs::regressedRows`) is pinned on its own node, top-down (`lib/guard.mjs::guardRound`): a setting whose calibration explains the row (the property itself, a calibrated side effect, or a discovered layout effect) is reverted at once; otherwise one suspect setting is undone at a time (layout-mode settings first, then layout properties, then the latest) and the next walk decides, restoring an innocent one. A row on a node with no write of its own takes as suspects the writes inside that node and inside the pair a distance row is measured from (`guard.mjs::anchorRef`). Reverted settings are blocked and classified Hardcode, and only they count as wrong writes. A guard round is not a write round. A setting written in round N is rewritten later only if the match improves at every width. A write needs the row's element to be one calibration ties to that setting. |
| **R-47-10 Gates** | Every tree passes `scripts/wp-build-page.js --dry-run` before a real build. The resolver writes only settings with `block_attributes.source = 'sgs'`; never a core `style` attribute or a `native_wp` setting, because those serialise as inline `style="…"` (Spec 32). `lint.mjs` enforces this on every tree the route writes, and fails a Fill skeleton that carries any attribute whose `css_property` is not null. Route code passes `python scripts/check-no-client-names.py --check`. Ref classes use the `cr-ref-` prefix, never `sgs-`. |
| **R-47-11 Live-site safety** | The route writes only to the posts listed in `calibration-targets.json` and to the surface targets in the site's `surfaces.json` (§2). `lib/tree.mjs` refuses any write to the canary's homepage (2742) or posts page (2741), to a motion-QA fixture (2103, 2109, 2113, 2603, 2740, 3037), or to a target in neither list. It never deletes posts and never changes an active header, footer, drawer or snapshot pointer. Before a build it checks that no deploy or reseed is running on that site. |

## 2. Inputs and outputs

- **Input:** one surface (a page, the header, the footer, a drawer, a modal) of a draft that renders in a browser,
  that site's `theme-snapshot.json` (Spec 33), and the framework database.
- **Surface manifest:** `sites/<client>/build/surfaces.json`, one entry per surface:
  `{ "<surface>": { "tree": "footer.tree.json", "envFile": ".claude/secrets/<site>.env", "envKey": "<KEY>", "target": { "postId": 182 } | { "templatePart": "<slug>" }, "walker": "qa/parity/footer.mjs", "draftUrl": "<url>" } }`.
  Solve and Fill take `--client <slug> --surface <name>` and read only this. An entry also names its walker states'
  setting states (`states`), optionally the states to walk (`walkStates`), and the linked blocks and template parts
  whose post it is (`provides`, `"<block>:<value>"`, e.g. `"sgs/form:contact"`, `"core/template-part:header"`).
- **Reference blocks.** Some blocks print another post (`lib/references.mjs`, found from each block's render.php):
  a linked placeholder (`formIsLinked`, `flowIsLinked`) ignores its own settings and renders the referenced post's
  block; a frame (`modalRef`, `drawerRef` printed with `do_blocks`) keeps its own frame settings around another post's
  blocks. Theme templates (shop, product) are SGS-built trees. They include the header and footer through one
  `core/template-part` line each (slug `header`/`footer`), which loads the theme part (`parts/header.html`), whose
  SGS pattern renders the active `sgs_header` / `sgs_footer` post: the header and footer are SGS blocks in their own
  CPT posts, and the include line carries no setting. The product template also prints the product's own
  description (`core/post-content`), and WooCommerce blocks hold no SGS setting. Every post a surface prints this way
  has its own surface (`lint.mjs --surfaces` fails otherwise; the header and footer surfaces `provide` their template
  part), and Solve never writes to a linked placeholder.
- **Output:** the surface's tree in `sites/<client>/build/`, built through `scripts/wp-build-page.js`, a report, and
  a generated walker config (Fill writes one; Solve walks one made by `pairs.mjs` when the surface sets `walkerFull`).
- **Not in scope:** content beyond what the draft shows (products, pages, Site Info), functional behaviour, asset
  upload (existing asset steps handle it), block swaps (Solve writes settings only; a wrong block type is reported).

## 3. Requirements

### 3.1 Resolver: `lib/resolve.mjs` (FR-47-1)

Input: block slug, slot element (as calibration names it), CSS property, optional state, and the measured value at
each width. Output: one attribute write in the block's storage shape, or a gap with a reason.

- **Discovered settings.** An enum setting with no `css_property` (a layout mode) is calibrated value by value, and the
  properties each value changes are recorded (`calibration.discovered`). When no database row paints a property, the
  resolver writes the value whose recorded effect matches the draft at every width; a tie goes to the value matching
  more of that element's other draft properties, and a remaining tie is `ambiguous`.
- **Lookup.** Candidates come from `block_attributes` where `source = 'sgs'`, matched by `block_slug`,
  `css_property` and `css_state`. States are `hover`, `open`, `scrolled`, `current` and `shrunk`; NULL means rest.
  A setting for focus exists only where the database holds a `css_state` of focus; a focus row with no such setting is a gap. Only candidates that calibration ties to the same slot
  element are kept.
- **Storage shape:**
  - `tier_object`: `{desktop, tablet, mobile}`.
  - `flat_sibling`: the rows sharing a base name, picked by `css_tier` (`backgroundImage`, `backgroundImageTablet`,
    `backgroundImageMobile`).
  - `box_only` and any `box_family`: a box object `{top, right, bottom, left}`, inside the tier object when
    `tier_shape = tier_object`.
  - NULL `tier_shape`: one value, written only when the draft value is equal at every width; otherwise a `shape` gap.
- **Units.** A unit companion is the attribute named `<attr>Unit` on the same block, when `block.json` has it; the
  database does not link them. Its value is the measured value's unit. A unitless line height is written as the number
  with `<attr>Unit` set to the unitless option in that attribute's enum; where the enum has none, it is converted to
  the companion's unit and logged.
- **Tokens.** Values go through `lib/normalise.mjs` (R-47-7). Which form a setting accepts (palette slug, hex, preset
  slug or literal) comes from calibration's colour marker step.
- **Gap reasons:** `no-setting` (nothing paints this property on this slot), `ambiguous` (two settings remain after slot
  filtering), `shape` (the value cannot be held, for example a `clamp()` in a setting calibration showed does not
  accept one).

**Done when:** `node --test scripts/computed-route/tests/resolve.test.mjs` passes. Its cases include a heading
`line-height` written as a tier object with its unit companion, a container `padding` written as a box inside a tier
object, a `flat_sibling` background image, and an unknown property. The unknown property must return `no-setting` and
fail if written.

### 3.2 Block calibration: `lib/calibrate.mjs` and `calibrate.mjs` (FR-47-2)

The modules that implement it (`lib/calibrate-props.mjs`, `lib/calibrate-markers.mjs`, `lib/calibrate-instances.mjs`, `lib/calibrate-read.mjs`, `lib/deploy-hash.mjs`) are indexed in `scripts/computed-route/README.md`.

Calibration has two outputs with different scopes:
- **Slot map:** which rendered element and property each setting paints, and how its value transforms. It does not
  depend on the site. It is measured once on the canary and cached per block, keyed by the md5 of the block's deployed
  `build/blocks/<block>/` directory read over SSH, so the key matches what the server runs.
- **Default paint:** each element's computed style with no settings. It carries the measuring site's tokens, and is
  keyed by the slot-map key plus the md5 of that site's `theme-snapshot.json`.

Before calibrating, `calibrate.mjs` compares the deployed `build/blocks/<block>/` md5 with the local build and refuses
to run on a mismatch. The md5 covers the files that decide what a page paints (`block.json`, `render.php`, the
front-end stylesheets and view scripts) and leaves out the editor bundles (`index.js`, `index.css`, their rtl copy,
`index.asset.php`): the same commit built in another folder gives a different `index.js` (proven 2026-10-03: commit
4ba8be0f1 deployed from the deploy's temporary worktree and built locally gave different editor bundles and identical
front-end files), so a whole-folder key could never match. View bundles and asset files are hashed after blanking
webpack's module numbers and the asset version (`lib/deploy-hash.mjs::normaliseBundle`, which renumbers parameterised webpack modules as well as bare ones): the same commit numbers its modules by
build folder (proven 2026-10-03: trust-bar's `view.js` differed only in module 2310 against 6469), while any code change
still changes the key. Local text files are read with LF endings (`lib/deploy-hash.mjs::lfText`): the deploy builds from a
clean LF checkout, while a working copy may carry CRLF (proven 2026-10-03: language-switch's and wishlist-link's
`render.php` differed by exactly their line counts). Inherited properties are not recorded as default paint (R-47-5 uses the parent's live value).
The cache is `scripts/computed-route/cache/`, gitignored: one library-wide file per block, whichever site measured
it (Bean, 2026-10-03), so every client starts calibrated. Each file records its `site` and `paintKey`. A run on
another site skips a block that already has a file unless it passes `--recalibrate` (`lib/cache.mjs::skipReason`).
The default paint therefore carries the measuring site's tokens; a Solve run that shows a default-paint mismatch on
another site is fixed by recalibrating that block there (a lead, not yet seen).

**Steps:**
1. Render one default instance and record every rendered element's computed style, with no element cap, and the
   `::before`, `::after`, `::placeholder` and `::first-letter` layers (keyed `<path>::before` and so on, the key the
   walker's pseudo rows use). A panel an element controls through `aria-controls` is read as `@controls > <path>`.
2. Render one marked instance per (setting, marker) and record which element's computed style changes, and to what.
   An instance carries the preconditions its setting needs (`lib/calibrate-instances.mjs::preconditionsFor`): its
   variant (`blocks.variant_attr` and `variant_slots`), the show or enable toggle that gates it, the partner border
   setting, an overlay image (`calibration-targets.json` holds an image per site) and the layout mode (grid or flex) that
   makes it paint.
   - A setting that changes nothing is reported as dead: a framework defect.
   - A setting whose marker reaches its element at fewer than all three tier widths is reported as a one-width
     hardcode.
3. Write one file per block: elements by their selector path from the block root (BEM classes joined by ` > `, with
   `:nth-of-type(n)` only where siblings share a class), the default paint per element, and each setting's slot,
   property, accepted value forms and transform.

**Markers by setting shape:**

| Shape | Marker |
|---|---|
| Colour | A hex the site's palette lacks (`#13579b`), and separately one palette slug, so both render paths are proven; a setting whose database `role` is colour gets this marker even when `block.json` has no colour type |
| Length, single value | 37px; a wider set of lengths (rem, em, percentages, viewport units) gets a length marker too |
| Box object | top 11px, right 13px, bottom 17px, left 19px |
| `tier_object` | desktop 37, tablet 23, mobile 7 (in the setting's unit), read at 1440, 768 and 375 |
| `flat_sibling` | the same three values in `attr`, `attrTablet`, `attrMobile`; a corner setting reads each corner |
| Enum | every value in turn; keyword and enum values come from the database row when `block.json` has none (extension settings) |
| Gradient, keyword string, media object, transform | a gradient, one keyword from the row, a media object with an image, a transform string; read through `longhands()` so colour and border-colour gradients and shadow colour map |
| Boolean | the opposite of the default |
| Number (unitless line height, weight, opacity) | 1.37; 700 or 300, whichever differs from the default; 0.37; a block with two weight settings gets a distinct weight each |
| Per-device non-length or unit-object value | the three tier values in the setting's own shape (a unit object keeps its unit); a container-query tier is reported as `containerTier`, never as a one-width hardcode |
| Has a `css_state` | the marker is set and the element is put in that state before reading (`lib/calibrate-instances.mjs::STATE_TRIGGERS`): hover under a real mouse and focus by keyboard, both on the styled BEM element with a closed panel opened first; shrunk by adding its ancestor class; a scroll retry when the first scroll does not apply the class; scrolled by scrolling the window, compared with the variant's default read scrolled; open and current rendered by the fixture (an accordion item saved open, the first tab, the last breadcrumb). A state with no trigger, a hidden element that cannot be hovered, or a header that never takes its scrolled class is listed in `untestedStates`, never calibrated as rest |

A setting whose marker fails `wp-build-page.js` validation is reported as `marker-rejected` with the builder's message.

**Where and how it renders:**
- Each site has one calibration page, created once with `wp-build-page.js --create page --title "CR calibration"
  --slug cr-calibration --status private`. Its post ID goes in `scripts/computed-route/calibration-targets.json`
  (`{ "<site>": { "envFile", "envKey", "postId" } }`; eye-care-test: 668, sandybrown: 4750). Later runs replace that page with
  `--post-id`. Private, it is never public, indexed or linked; calibration reads it in a logged-in browser.
- The local WSL mirrors of both test sites (`local-eye-care`, `local-sandybrown`; `scripts/local-wp/README.md`) are
  targets too, with the same post IDs and a `pluginDir` the deploy check hashes directly instead of over SSH. They
  measure the same as the hosted sites for the same build and snapshot (google-reviews, accordion and accordion-item
  identical, 2026-10-05) and are where whole-library recalibration runs: Hostinger's edge challenges bursts of
  automated logins.
- One run opens one browser and logs in once (`scripts/lib/wp-session.js`): every `wp-build-page.js` step opens a tab
  in it through `SGS_CDP_URL`. With `SGS_CDP_URL` already set, the run attaches to that browser instead.
- One build holds a block: one default instance per variant plus one instance per (setting, marker), each wrapped in an
  `sgs/container` with class `cr-cal-<block>-<setting>`. A block with more than `CHUNK` (150, or `SGS_CAL_CHUNK` for a run) instances is built and read
  in several pages, each carrying every variant's default instance (google-reviews has about 400; a 400-instance save
  failed with an invalid JSON response). One block's failure is that block's error; the run continues.
- Each block has a fixture in `scripts/computed-route/calibration-fixtures.json`: the minimum content and parent chain
  it needs (text for a heading, a parent `sgs/site-footer` for `site-footer-row`). A block with no fixture is
  reported, not guessed.
- Blocks that render only inside a header, footer, drawer or mega-menu post are calibrated inside a dedicated
  `sgs_header`, `sgs_footer` or `sgs_drawer` post, recorded in the same file. The site's active pointers never change.
- At the end of a run the calibration page is replaced with an empty tree.

**Failure handling:** a failed build or an aborted run leaves only the calibration posts touched; the next run
replaces them. A deploy mismatch stops the run before any write.

**Done when:** calibrating `sgs/heading` on eye-care-test produces a file in which `lineHeight` maps to the heading
element at all three widths and `margin` maps as a box, the calibration page is empty afterwards, and a planted
mismatch fails the run before any write. The planted mismatch is a local `build/blocks/heading/style-index.css` differing
from the deployed one.

### 3.3 Solve: `solve.mjs` (FR-47-3), built first

Input: a surface from `surfaces.json`.

**Step 0.** Add a `cr-ref-<surface>-<n>` class to every node that lacks one (`lib/tree.mjs`). `<n>` is the node's
depth-first index; it is appended to any existing `className`. Then rebuild once. Step 0 is not one of the rounds.

**Each round:**
1. Build: `node scripts/wp-build-page.js --env-file <envFile> --env-key <envKey> --tree <tree> --post-id <id>` (or
   `--template-part`).
2. Walk: one `node scripts/parity/draft-live-walk.mjs <walker> --headless --no-review --lean --widths <w> --draft-cache
   <run dir>/draft-cache-<w>.json --out <run dir>/round-<N>/w<w>` per width (375, 768, 1440, 1920), all four at once,
   merged into `round-<N>/report.json` (`solve.mjs::mergeReports`). `--lean` reads only what Solve uses (styles, boxes,
   hover end states, structure); `--draft-cache` reads the draft once per run. `<walker>` is the surface's `walkerFull`
   (every block paired, `pairs.mjs`) when it has one, else its hand config. Measured on About, 2026-10-04: lean 45s and
   cached 21s against 123s full; four widths at once 49s against 126s, with no host bot check (eye-care-test's IP
   allowlist on). With `SGS_HEADED=1` the walks run headed (`solve.mjs::WALK_FLAGS` drops `--headless`): Hostinger's edge answers
   headless browsers with a 403 browser check after bursts of traffic (`.claude/dev-setup.md`); when it shows a captcha even
   to headed logins, run against the local WSL mirrors (§3.2).
3. Write. Consider each row in `report.json` whose kind is `style`, `hover` or `box`, which is not accepted and not
   matched in `divergences.json`:
   - The row's `ref` names the node; its `path` matches a calibration element exactly, giving the slot.
   - The resolver gives the setting; the draft's value is written at the row's width.
   - A row with no `ref`, or a `path` calibration does not know, is Unresolved (`unmapped-element`).
   - A row on a linked placeholder is never written (gap `linked`): it belongs to the referenced post's surface.
   - Rows of other kinds are reported, never written.
   - A row a divergence-ledger entry covers targets the entry's decided value, not the draft's, at that width and at
     every width the entry covers (`lib/solve-rows.mjs::draftValues` reads the row's `decided`, §3.5).
   - `width` rows are written only as the draft declares the width (a plain length or percentage at every width no
     ledger entry holds, read from the draft's matched CSS rules by the walker, §3.6 item 11); otherwise they are
     reported as a `used-value` gap: a computed width is the box's used size, and writing it would freeze a fluid
     layout (`solve.mjs::USED_VALUES`, `lib/solve-rows.mjs::usedValueTarget`).
   - A row on a `::before` or `::after` layer (`pseudo`) resolves on its element's path plus the layer, the key
     calibration gives the layer.
   - Box rows (`w`, `h`) name no CSS property, so no setting can hold them: they are never written, listed as derived,
     and close when the spacing that moves them closes. A scored item closes only when its box rows close too.
4. Stop when no row changes or after round 3 (R-47-9). `--rounds 0` is measure-only: one build and one walk, never a
   write (`solve.mjs::solveLoop`, test `tests/solve.test.mjs`).

**Classification of surviving rows:**
- **Hardcode:** the setting holds the draft value, or its logged snap, and the paint still differs beyond the walker's
  tolerance and the snap's distance. Framework repair.
- **Missing setting:** the resolver returned `no-setting`. Framework new control.
- **Intended:** matched in `divergences.json`.
- **Unresolved:** anything else, with its reason.

**Output:** the updated tree, `solve-report.md` (counts per class, every write with its before and after values,
every token snap) and `solve-report.json`.

**Failure handling:**
- A wrong write is a write that a later round reverts, or after which its row reads further from the draft. Wrong
  writes are listed.
- A build failure stops the run with the tree from the last successful round.

**Done when:** the footer proof (§5 stage 2) meets its success line.

### 3.4 Fill: `fill.mjs` (FR-47-4)

Input: a skeleton tree. Each node carries `draftRef`, a walker-style finder for the draft element it copies, and
optional `draftSlots` (`{ slot: finder }`) for inner elements, plus content. AI writes the skeleton; a style value in
it fails the lint (R-47-10).

**Steps:**
1. Render the draft (a hosted URL, or a local folder served by `lib/draft.mjs`) and read every referenced element's
   computed styles at 375, 768 and 1440.
2. Resolve root-down: each node and slot, every property that differs (R-47-5).
3. Spacing ownership, decided per tier from rendered gaps, not the draft's CSS. A gap is the distance between
   consecutive children's border boxes along the parent's main axis; equal means within 0.5px.
   - A parent's gap is written only when every sibling gap is equal.
   - Otherwise the parent gap is 0 and each child gets its own margin.
4. Give every node a `cr-ref-<surface>-<n>` class. Generate the walker config from the refs (Solve's existing trees use
   the same kind of generated config: `pairs.mjs`, §5 stage 3), with `refPrefix:
   'cr-ref-'` and the ledger path, so every mapped node is compared on every property.
5. Output the filled tree, `fill-report.md`, and the UNMAPPED list (property, value, node, reason): the framework work
   for this surface, known before the first build.

**Values that need care:**
- **Fluid sizes:** sampled at 375, 768, 1024, 1440 and 1920. Linear within 0.5px means fluid. A fluid value is written
  only where calibration showed the setting accepts a `clamp()` string; otherwise per-tier values from 375, 768 and
  1440 are written.
- **Breakpoints:** each mapped element's values are swept every 16px from 320 to 1920. Each width where a value steps is
  logged with the nearest SGS boundary (768, 1024), for `divergences.json`.
- **Entrances:** duration and delay come from the walker's entrance sampler, and distance from the transform at the
  first sampled frame. They are written to the `sgs-fx` settings that calibration ties to `transform` and `opacity` on
  that block.

**Done when:** Fill on one unbuilt surface produces a tree that builds, and a walk of it shows only rows listed in its
UNMAPPED list or in `divergences.json`.

### 3.5 Divergence ledger (FR-47-5)

`sites/<client>/build/qa/divergences.json` is an array of entries:

`{ "id": "D-<n>", "scope": "<surface>|site", "node": "cr-ref-<surface>-<n>|<block slug>|*", "state": "<state>|*",
"property": "<css property>", "pseudo": "::before|::after" (optional), "widths": [375, 768, 1440, 1920], "expected":
{ "value": "<css value>" } | { "rule": "<rule name>" }, "reason": "...", "register": ["<register item id>", ...],
"decided": "YYYY-MM-DD <source>" }`

An entry matches a row on node, state, property, width and layer: an element's entry never covers its `::before` or
`::after` rows, a layer's entry (`pseudo`) only those.

- **A value expectation:** the walker compares live with it instead of the draft: a drifted row's draft side is the
  plain decided value and every covered row carries `decided: { id, value }` (`parity/lib/divergences.mjs::judgeDivergence`;
  a rule entry's `decided.value` is what live shows). Solve and Fill write the decided value, never the draft's (§3.3).
- **A rule expectation:** the walker accepts the row. Fill writes nothing for that property and lists it in the
  report. Rule names are listed in `lib/ledger.mjs::RULES` with a one-line meaning each; an unknown rule name fails
  the run.
- **Stale entries:** an entry whose live value now equals the draft, or whose node no longer exists, is stale, and the
  run fails until it is removed.
- **Migration:** a walker config's `accept` entries with only `pair`, `key`, `kind`, `state` and `width` migrate one
  to one. Entries using `when` or `notPainted` (functions) stay in the config and are listed as unmigrated.
- **Accepting a row:** `node scripts/computed-route/ledger.mjs accept <report.json> <row id> --reason "..."` writes
  the entry with today's date; `report.md` prints each open row's id for this.

- **Register decisions:** every entry cites the fix-register items it implements (`register`); `lint.mjs --surfaces
  <surfaces.json>` checks the ledger against the register its `qa/ledger.config.json` names (`{ "register": "<path from
  the repo root>" }`, kept in the client's folder; `--register <file>` overrides) and fails an entry citing no item or
  an item the register lacks, a ledger with entries and no register, and a named register that does not exist. House-rule entries (`touch-target`, `accessibility`) cite none.
- **Independent check:** a site's `qa/independent-check.mjs` judges its differences through
  `lib/ledger.mjs::judgeIndependent` (matched on `node`); a value entry live has drifted from stays open, named by its id.

**Done when:** `node --test scripts/computed-route/tests/ledger.test.mjs` and `lint.test.mjs` pass, including a stale
entry that must fail the run, an entry citing an item the register lacks, and a drifted value entry that stays open.

### 3.6 Walker upgrades: `scripts/parity/` (FR-47-6)

These belong to the walker, which stays a standalone tool with no route import. Each is proven with a planted fault
before it counts (GAP-CHECKLIST §11).
1. **Pseudo-element paint:** each painting `::before` and `::after` layer's computed paint (`collect.mjs::PSEUDO_PROPS`),
   compared layer by layer; a layer on one side only is one `content` row (built 2026-10-05, GAP-CHECKLIST §19).
2. **1920** in every standard run.
3. **States:** hover, focus and active on every interactive element of a compared region, not only configured pairs.
   Hover is built (2026-10-05): ref-traced walks force `:hover` on every pair and its ancestors through the DevTools
   protocol (`devtools.mjs::forcedHover`), and a hover row is a difference in what hovering changes. Focus and active
   on every element are not built.
4. **Link coverage:** the same text sits inside a link on both sides.
5. **Line counts** sampled during state transitions (header shrink and grow, drawer open).
6. **Divergence ledger:** a config may name one (`divergences: '<path>'`), and matching rows are accepted.
7. **Ref tracing:** when a config sets `refPrefix`, every style row carries:
   - `ref`: the measured live element's nearest ancestor-or-self class with that prefix;
   - `path`: its selector path from that element, as in §3.2.

   Without `refPrefix`, rows are unchanged.
8. **Flow position** (ref-traced walks): unanchored pairs in draft reading order are measured top to top from the pair
   before them, the first from the top of `<main>` (`compare-state.mjs::flowOffsets`); the identity transform matrix
   equals `none` (`compare.mjs::sameValue`). GAP-CHECKLIST section 17.
9. **Solve modes:** `--lean` (only what a settings writer reads) and `--draft-cache` (the draft read once per run);
   `auto-collect.mjs` can tag each word with its element (`tagEls`) for block pairing.
10. **Settled reads:** a state is read once its finite animations finish (`devtools.mjs::settleAnimations`: a 900ms
    floor for what starts late without an animation, then `document.getAnimations()`, a 6s cap).
11. **Declared values:** the matched CSS rules' declared sizes (`devtools.mjs::declaredValues`, `DECLARED_PROPS`) beside
    the computed ones, so a draft's declared width can be written (§3.3).
12. **Motion timings:** transition and animation duration, delay and easing as ordinary rows, compared as their sets of
    distinct values and skipped where nothing runs.
13. **Text-run rows:** a text run's rows are compared by the space between their line boxes (a `row-gap` row).
Items 10 to 13 and the built parts of 1 and 3: GAP-CHECKLIST §19, proven in headless Chromium on local pages
(`tests/walker-devtools.test.mjs`) and on About (measure-only on the local mirror, 2026-10-05: no false rows after the
animation-timing rule; 1 real open issue).

**Done when:** each item has a GAP-CHECKLIST section with its planted fault turning red. `node
scripts/parity/benchmark.mjs --noise` still catches 5 of 5 with no new noise rows.

### 3.7 Functional flows (FR-47-7)

The shopping behaviour comparisons cannot see is tested in `scripts/parity/flows/`, one script per flow, reported
separately from parity rows:
- two different products in the bag;
- a second unit of the same product;
- apply then clear a filter;
- the lens pop-up's skip-to-bag.

**Done when:** each flow passes on eye-care-test after its register fix, and fails against the bug it was written for
(the register's N11 and N25).

## 4. Files

All in `scripts/computed-route/`. The README lists every exported function (R-47-1).

| File | Job |
|---|---|
| `README.md` | Purpose, file index, function index, imports, what the route never touches |
| `lint.mjs` | README index, no style values in skeletons, no `style` or `native_wp` writes, no imports from `plugins/sgs-blocks/scripts/` |
| `lib/db.mjs` | Read-only `block_attributes` queries |
| `lib/calibrate.mjs`, `calibrate.mjs` | Calibration library and command |
| `lib/resolve.mjs` | The one property-to-setting engine |
| `lib/normalise.mjs` | Value normalisation and token snapping from `theme-snapshot.json`, with the snap log |
| `lib/tree.mjs` | Read, write and merge trees; ref classes (`stripRefs` for a final build); per-tier values; R-47-11 target checks |
| `lib/ledger.mjs`, `ledger.mjs` | Ledger library (`RULES`, match, stale) and command (`accept`, `stale`) |
| `lib/draft.mjs` | Serves a local draft folder on 127.0.0.1 at an ephemeral port, shut down at exit (not built; Fill needs it) |
| `solve.mjs`, `fill.mjs` | The two commands (`fill.mjs` not built) |
| `lib/solve-rows.mjs`, `lib/solve-report.mjs` | Solve's reading of a walker report (open rows, writable groups, draft values, regressions, classification) and its report |
| `sweep.mjs`, `lib/sweep.mjs` | Every surface's newest Solve report as one row per distinct open issue (`qa/sweep/<date>/sweep.json`) |
| `triage.mjs`, `lib/triage.mjs`, `lib/triage-source.mjs` | A candidate class (W, F, T, U) with evidence per open issue, including the `includes/` helpers a block's render reaches |
| `register-sweep.mjs`, `lib/register-sweep.mjs` | The fix register bundled for the sweep's status agents, and their verdicts checked before a Sweep column is written |
| `calibration-targets.json`, `calibration-fixtures.json` | Calibration posts per site; fixture content per block |
| `cache/` | Calibration cache (gitignored) |
| `tests/` | `node --test "scripts/computed-route/tests/*.test.mjs"` (Node 24 runs a glob, not a bare folder); each file names the rule it proves and has one case that must fail |

External imports, read-only:
- `scripts/parity/lib/*.mjs` (finders, computed-style reading);
- `scripts/wp-build-page.js` and `scripts/parity/draft-live-walk.mjs`, run as commands;
- Playwright from `plugins/sgs-blocks/node_modules/playwright`, loaded the way `draft-live-walk.mjs` loads it.

Nothing from `plugins/sgs-blocks/scripts/`.

Ref classes stay on built blocks: they carry no style and no client name. A site's final build may strip them with
`lib/tree.mjs::stripRefs`, after which that surface's generated walker config no longer works.

## 5. Build order and the footer proof

1. **Foundations.** The resolver, normaliser, read-only database and ledger (FR-47-1, FR-47-5), plus walker items 6 and
   7 (FR-47-6), with tests. **Done 2026-10-03:** 38 tests pass, the lint fails on a planted unlisted export, both walker
   items turned red on planted faults (GAP-CHECKLIST §16), and the benchmark scores 5 of 5 with 0 noise rows.
2. **Footer proof.** Solve (FR-47-3) on Eye Care's footer, with calibration (FR-47-2) of the blocks it uses. **Passed
   2026-10-03 (run 3 below).**
   - **Baseline:** `sites/eye-care-ward-end/build/footer.tree.json` at commit `b7c09adc1`, built to `sgs_footer` 182 on
     eye-care-test and walked with `footer.mjs --headless --widths 375,768,1440,1920`. That `report.json` is the
     "before".
   - **Scored items** (setting values on blocks that already exist):
     - register items 25, 26, 28 and 38;
     - the spacing, size and tracking parts of 27 and 29: the top margins, the tagline margin, the social-row margin,
       the brand column gap, 11.5px, 0.2em, weight 400, line height 1.5, the 4px bottom margin and the 10px column gap.

     An item is closed when the rows for its elements read no open difference at all four widths. The block swaps in
     27, 29 and 30 are outside the proof and must appear as Unresolved or Missing setting.
   - **Success** (Bean, 2026-10-03: Solve's job is to close what existing settings can close and to name what they
     cannot; a correctly named gap is a success, not a miss). All three hold:
     - At least 90% of scored items are handled: closed, or left open and correctly identified as a framework gap
       (classified Hardcode or Missing setting). Calling a fixable item a gap is a failure. Whether a gap is real is
       judged outside the tool, by the register or by proof (calibration, code), never by Solve's own label.
     - No row closed before is open after, and no open row moves further from the draft.
     - At most 10% of writes are wrong.
     Whether a gap gets the right type (Hardcode for a repair, Missing setting for a new control) is reported as a
     further measure, not a condition.
   - **Kill:** under 60% handled, over 10% of writes are wrong, or the third write round still writes. A round that
     only reverts regressions (R-47-9) is not a write round.
   - **Result, run 3 (2026-10-03): success on the handled line, with one 4px knock-on recorded.**
     - After run 2 (below): the success line became Bean's (a correctly identified gap is a success), a revert-only
       round stopped counting as a write round (R-47-9), calibration discovers what enum settings with no
       `css_property` paint (§3.1), and `flex-direction` and `flex-wrap` are measured under `refPrefix`.
     - 14 of 15 scored items handled (93%): 13 closed, including 29's 10px column gap (written as the container's
       `layout: stack`, found by discovery, plus its `gap`); 38 identified as a framework gap. 25 stays open on the
       footer height alone (all its padding rows closed), which follows from 30 and 34.
     - 47 writes, 2 wrong (4%): the two `maxWidth` collapses (register N46), reverted by the guard in a revert-only
       round. Write round 3 wrote nothing: converged.
     - 0 new rows; style and box rows open 990 before, 642 after. One open row moved further from the draft: the
       copyright line's width at 768, 4px narrower (512px draft; 348px to 344px), a knock-on of the bottom row's
       correct 24px side padding on a line already 164px off. The guard saw it and found no write on that element
       to revert. Strictly, criterion 2 misses by that one element at one width.
     - Gap typing (reported, not a condition): 38 came out Missing setting where the evidence says Hardcode (the
       day label's weight is hardcoded), so typing still needs work: calibration knows the setting paints the root,
       not that a rule on the child overrides it.
   - **Result, run 2 (2026-10-03): short of success, on the "round 3 still writes" kill clause only.**
     - Run: 7 blocks calibrated on eye-care-test, then Solve with the full-CSS walker config (5 layout pairs added to
       `footer.mjs`). The baseline tree (b7c09adc1) plus ref classes was round 1.
     - 12 of 15 scored items closed (80%). Style and box rows open: 970 before, 687 after. 0 new rows.
     - 38 writes, 2 wrong (5%): `maxWidth: 1440px` on both footer rows collapsed them to a 0px content width (auto
       margins cancel the row's stretch; the header rows had the same fault, fixed in acc2a3b6d). The regression
       guard (R-47-9, `solve.mjs::revertRegressions`) reverted exactly those two in round 2, pinned through the
       setting's calibrated side effects (`|margin-left`, `|margin-right`, `|width`). They are classified Hardcode
       (breaks-layout): a framework repair for `sgs/site-footer-row`.
     - Round 3 wrote 2 settings (the tagline's side margins to 0, exposed once the revert landed): the kill clause.
       The revert round used round 2.
     - Survivors against the register: 25's padding rows all closed; its footer height (4px off at desktop, 16px at
       375) follows from 29, 30 and 34. 29's 10px column gap needs the container's flex layout: a setting with no
       `css_property` in the database, so Solve cannot find it yet, and it is wrongly classified Missing setting.
       38's weight is hardcoded on `.sgs-business-hours__day` (600), which the block's weight setting does not
       reach (calibration: it paints the root only). That is a framework repair, not the register's "tree".
     - Calibration also flagged `sgs/site-footer-row` per-device `gap` and `contentWidth` reaching 375 and 1440
       but not 768 (a one-width hardcode candidate), and dead settings per block (some are fixture artefacts, such
       as a border style with no border width). Each is proved before it is fixed.
3. **Solve on every built Eye Care surface.** It shrinks the current fix register. In progress (2026-10-04).
   - **Built and in use:** walker state mapping (each `surfaces.json` entry maps walker states to setting states; rows
     from an unmapped state are reported, never written), 17 surfaces with walker configs and score items
     (`sites/eye-care-ward-end/build/qa/solve-score.mjs`, `qa/score-items/<surface>.json`), reference blocks
     (`lib/references.mjs`; a linked placeholder is never written; `lint.mjs --surfaces` passes), the pinpointing guard
     (`lib/guard.mjs`, R-47-9), box seeding from the node's nearest wider tier (`resolve.mjs::WIDER_TIERS`), and the
     divergence ledger (`sites/eye-care-ward-end/build/qa/divergences.json`; every entry cites its register items).
     Contact's subtext keeps its 22px margin (Bean, 2026-10-05), so the 375px name-field drop stays open (register
     CR15/N45b).
   - **Calibration:** every SGS block but `theme-toggle` (CR12) has one library-wide cache file
     (`scripts/computed-route/cache/<block>.json`, gitignored; its `site` names where it was measured: eye-care-test page
     668, or sandybrown page 4750, which runs the `mamas-munches` snapshot). A border-style marker carries its companion
     width (CR11); a minimum size marks above the 44px floor; an inherited setting records every element its value
     reaches (`reaches`) and every element its tag (`_tag`); a per-device enum setting with no CSS property (an extension
     setting such as `sgsChildSizing`) is discovered through its desktop tier. Calibration reads its three widths in
     parallel (`calibrate.mjs::readAll`). Fixtures come from `scripts/computed-route/calibration-fixtures.json`, else each
     block's first use in the trees or its block.json `example`, styling at defaults.
   - **Results under the new guard** (scored items from the register; the whole-page line, distinct style, hover and
     box issues from `solve-report.mjs::wholePage`, appears from the next runs):
     - About: at 100% with full coverage (F2 below).
     - Lenses (hand config): 6 of 6 handled; 0 regressions; 314 to 80. With full coverage (28 of 29 blocks, 2026-10-04)
       its first Solve closed 25 of 57 distinct issues but regressed 3 rows, so its tree was restored (plan Progress).
     - Contact: 134 to 19 distinct issues (2026-10-04), 0 labelled gaps; the contact form 94 to 46 (plan Progress).
     - Help (old guard) and the footer: as recorded in the register. Home was stopped at walk 5 on 2026-10-04 and rebuilt
       from its committed tree; it re-runs with full coverage.
     - An independent Playwright check (its own finders, 375/768/1440) confirmed Lenses 9 of 9.
   - **Council, 2026-10-04 (qc-council, three raters).** Solve's coverage was the gap between §0's promise and its
     results: §3.3 walked a hand-written config naming only some elements, the walker never compared where an element
     sits, and success was scored on register items, not the page. Fixes, each with a measured baseline:
     - F1 flow position rows (CR19) and F4 identity transform (CR20): done, 4606ba598.
     - F2 every block paired through matched words (`pairs.mjs`, `lib/pairs.mjs`, `lib/pairs-page.mjs`; plan
       `.claude/plans/2026-10-04-spec47-full-coverage.md`): built, with a padded block paired to its padded draft
       wrapper, repeated words placed by nearness, text-run, form-control and group pairs (walker finders
       `{ textRun }`, `{ group }` in `scripts/parity/lib/paint.mjs`). The guard tries a regressed row's ancestors' writes,
       nearest first (CR21). **About is at 100%** (2026-10-04): 50 distinct issues to 0 on a fresh rebuild, 0 wrong writes,
       12 ledger entries citing register 104 / S1 / S4, confirmed by an independent check
       (`sites/eye-care-ward-end/build/qa/independent-check.mjs`, 0 differences at 375/768/1440) and a planted-fault
       negative control. Contact pairs 31 of 32 blocks (the map is register items 132 and 141) and its form 6 of 6; its distinct
       issues went from 134 to 19 on 2026-10-04 (open causes in the plan's Progress).
     - F3 calibration paths: measured, mostly not needed (Help's link rows are a block swap, register 120/121; Contact's
       form rows belong to the contact-form surface); one fixture gap (CR17).
     - F5 whole-page score in the solve report: built.
     - Speed: lean walks, the draft cache and four widths at once (step 2 above).
   - **Residual:**
     - First (plan `plans/2026-10-04-eye-care-sweep-audit-fix.md`): Session 0 (2026-10-05) repaired what the route data
       audit (`.claude/reports/2026-10-04-route-data-audit/README.md`) proved and recalibrated every block. Session A
       (2026-10-05) measured every surface from `1ea514ae8` without writing: 2,373 distinct open issues across 17
       surfaces (`sites/eye-care-ward-end/build/qa/sweep/2026-10-05/sweep.json`; per surface in the plan
       `2026-10-04-spec47-full-coverage.md` Progress), and every fix-register item carries a sweep status (71 still
       open, 63 not walker-measurable, 32 closed earlier, 22 partly measured, 13 clean on the walker; each still-open
       verdict cites one exact element row and its values). Next: Session B
       sorts what stays open into its classes and plans the fixes; Session C makes the framework fixes.
     - Then (Session D) each surface to 100%, in the order the sweep ranks, Contact and its form first. Every surface has
       its full config (2026-10-05; panel surfaces pair with their walker state open). Done per surface: on a fresh
       rebuild of the committed tree, 0 unexplained and 0 labelled gaps in the whole-page line, 0 new rows, wrong writes
       at most 10%, the independent check agreeing, the register marked. The open causes per surface are in the plan's
       Progress (Contact: the hours list's row gap and the address width; the form: the select's height; Lenses: three
       regressions to diagnose). Known measuring gaps (2026-10-05): the collector reads no words inside the open live
       phone drawer; shop's and product's draft finders change words between widths; the independent check counts
       off-screen screen-reader text as painted (Contact).
     - Built on 2026-10-04 (the plan's Universal tool log lists each): enclosing-block settings, extension settings in
       the framework DB (`source='sgs-ext'`), calibration `reaches` and `_tag`, the per-round `conflict` rule, grid
       tracks as proportions (CR16), aspect ratio (CR10, live proof on the first image-heavy surface).
     - Calibration: every block was re-calibrated on 2026-10-05 (94 cache files, on the local WSL mirrors). CR17's
       business-info `textBefore` element remains.
     - Gap typing (a setting that paints a parent while a rule on a child overrides it comes out Missing setting): the
       hours day weight closed through a dedicated label setting; calibration still records nothing for an overriding
       child.
     - The functional flows (FR-47-7) and the walker's items 2, 4, 5 and focus and active states (FR-47-6): not started;
       items 1 and 3's hover, plus items 10 to 13, are built and proven (2026-10-05: About measure-only on the local mirror,
       1 open issue, real: S1's button timing; register S1). Contact and its form walk
       only their rest state until FR-47-7 maps the form-flow states.
4. **Fill on an unbuilt surface,** compared with a hand-checked answer.
5. **A second draft** from a different designer, to test generality.
6. **Handover to Spec 31.** Spec 31 decides, under its own plan, whether `sc_var_responsive_bridge.py` is still needed
   once script-rendered drafts route here. This route never edits it.

## 6. Open questions

| Question | Who | When |
|---|---|---|
| Does `wp-build-page.js` support building into a dedicated `sgs_header`, `sgs_footer` or `sgs_drawer` calibration post with `--post-id` as it does for pages? | Answered 2026-10-03: yes. `--post-id` opens `post.php?post=<id>&action=edit` for any post type (footer 182 is rebuilt that way). The footer's blocks need no dedicated post: `sgs/site-footer` has no `parent` lock, so it and its rows calibrate on the calibration page. | Closed |
| Which noindex mechanism does each site already have for the calibration page? | Answered 2026-10-03: none per page (the plugin noindexes only WooCommerce utility pages). The calibration page is built private instead (§3.2). | Closed |
