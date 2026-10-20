---
doc_type: spec
spec_id: 48
spec_version: "0.2.0"
title: "Cloning system: Claude Design handoff to a working SGS site"
project: small-giants-wp
created: 2026-10-11
last_verified: 2026-10-12
status: active
supersedes: .claude/specs/archive/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md (spec_version 0.18.0)
references:
  - .claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/rules/framework-principles.md
  - .claude/reports/2026-10-11-spec48-gap-council/DESIGN.md
---

# Spec 48: Cloning system

## 0. Plain English

**Problem.** A client design arrives from Claude Design as a working prototype, and it has to become a real SGS WordPress site: pages, header, footer, drawer, menus, forms and shop surfaces, each built from SGS blocks with settings the client can edit.
- On Eye Care, the layout files were typed by agents copying selected numbers from the draft. Nothing measured the draft first, so the fix register filled with lines that were a layout-file change for a setting that already existed.
- The commonest miss is a value the draft never states. A plain heading in the draft has no margin and normal weight (browser defaults), while an SGS heading defaults to an 8px bottom margin and bold.
- The tool built to fix that (Spec 47's computed route) measured the rendered draft and paired draft and live elements by matching their words. Most of Eye Care's cloning time then went on that comparison: word pairing mispaired elements, about half the open rows it reported were measuring artefacts, and states, motion and breakpoints the render never showed were invisible to it.

**Effect.** Every surface needed a long corrections round, mostly for basic padding, size and colour misses, and then a second round to sort real differences from the comparison's own false alarms. Bean's review time went on those instead of on the intentional design choices, and the framework gaps list filled with labels that did not hold up (105 of 217 "missing feature" labels survived checking).

**Solution.** Read the draft's code first, and use the render to confirm.
- **The draft's code is the primary source.** A Claude Design handoff (Spec 48A) is a folder of known files: each draft is a template plus a logic class, with token files, an animation inventory and a state inventory. Read through the draft's own runtime, the code states most of the design's intent: every state and how to reach it, motion parameters, grid forms, shared values, content arrays and breakpoint thresholds.
- **Code to code, render confirms.** The draft's declared value at each width and state is compared with the value the written SGS setting will emit (calibration knows which setting paints which property on which element). The render at 375, 768 and 1440 is the acceptance test for every written value, and the primary source only for what the code never states (browser defaults, inheritance). Draft and live elements pair by the draft's own element IDs, never by matching words.
- **One engine, two directions.** Fill writes a fresh site from a skeleton (which blocks, nesting, content, and which draft element each block copies) and fills every style setting through the one resolver. Solve checks a built surface against the draft and repairs what differs, at most three rounds, trying every write before it keeps it. What survives is either an intended difference or a proven gap.
- **Stages.** A client goes through set stages (§8): re-export and calibrate, intake with one batched review by Bean, site build, trees, check, and a gap list proven by evidence gates before it reaches the framework backlog.
- **Indus first.** Indus proves pages, forms and form steps, the drawer and mega menus; Mama's Munches is the first shop proof.

The corrections phase then holds only intended differences and genuine framework gaps.

**Routing.** Every client draft clones through this route, and every client draft is a Claude Design handoff that passes `scripts/computed-route/handoff-check.mjs` (Spec 48A). The route reads the framework database, the parity walker and the page builder, and shares no code with `plugins/sgs-blocks/scripts/`. The binding cloning principles are in `.claude/rules/framework-principles.md`.

## 1. Binding rules

| Rule | Statement |
|---|---|
| **R-47-1 Isolation** | All route code lives in `scripts/computed-route/`. Its `README.md` lists every file and every exported function with a one-line purpose, inputs, outputs and external imports; `lint.mjs` fails on a file or export missing from it. The route never edits, imports or copies code from `plugins/sgs-blocks/scripts/`, and opens the framework DB read-only; `lint.mjs` enforces the import ban. |
| **R-47-2 Read-only database** | The framework database (`~/.claude/skills/sgs-wp-engine/sgs-framework.db`) is opened read-only with Node's built-in `node:sqlite` (`file:<path>?mode=ro`, which refuses writes on Node 24). The route never seeds, migrates or writes it. |
| **R-47-3 One engine** | Solve and Fill write settings only through `lib/resolve.mjs`. There is no second property-to-setting mapping in the route. |
| **R-47-4 Code first, render confirms** | Values and intent come from the draft's code, read through the runtime (never by regex over `.dc.html`); every written value must agree with the rendered draft at 375/768/1440 before it is kept; on disagreement the render wins and is reported, except a draft defect (§9), where the code intent is built and listed for Bean. A draft defect is a closed list with an operational test (FR-48-34): the declared value holds an unresolved `{{ }}` binding, or a code-declared state, motion or behaviour is unreached at every tested width (375/768/1440) even under a forced state. A disagreement that fails both tests is `render-wins`: the rendered value is written and the row is reported (FR-48-36). Identity (which draft element a block copies) comes from the runtime's `data-dc-tpl` stamps, its import hosts and `sc-for` loop membership, read through the page bridge `window.__dcAnnotatedTemplate`. |
| **R-47-5 Write only what differs** | A setting is written only where the draft's value differs from what the node already shows: its calibrated default paint (§3.2) for non-inherited properties (a border, background or shadow property that a styling setting in the block's calibration fixture paints is compared with its unstyled value instead, and a written setting carries the switch the fixture turned on for it: `lib/fill-fixture.mjs`), or its parent's live value for inherited ones (colour, font family, size, weight, line height, letter spacing, text transform). Inherited values are never repeated on descendants. |
| **R-47-6 Calibration is the slot truth** | Which rendered element a setting paints, and each block's default paint, come from calibration (§3.2). The database's `css_element` and `derived_selector` seed calibration; they never replace it. |
| **R-47-7 Tokens before literals** | The palette comes from the declared `tokens/*.css` matched to the draft's hex by value (no draft loads its token files); Bean confirms the proposed token-to-slug roles once at intake (§11). Values snap to the site's tokens, read from `sites/<client>/theme-snapshot.json`, in a fixed order: exact token, then nearest within tolerance (colour ΔE ≤ 2, lengths ±0.5px), then a literal flagged in the report. One-off colours outside the tokens stay hex, never a new palette token. A font stack takes the font-family preset whose first family matches (the slug the node already holds wins a tie, then theme order; `lib/normalise.mjs::snapFontFamily`), else it is written as declared. Every snap is logged with its distance. |
| **R-47-8 Divergences are data** | Intentional differences live in the site's `divergences.json` (§3.5), read by Fill, Solve and the walker. |
| **R-47-9 Bounded loop** | Solve runs at most three write rounds. A wrong write is any write a later read shows moving away from the draft. Before each rebuild, every setting the round wrote is tried in the open live page (try before write, `lib/trial-run.mjs::openTrial`, `lib/trial.mjs::judgeTrial`): the block is rendered from the attributes saved on the post (the last build, so the round's own writes are undone) and with the write, and the CSS difference is applied on the live uid at every width in the walker's device profile. A setting that moves any pair more than 1px further from the draft, or the summed distance above `max(1, 0.5 * sqrt(n))` px over n pair-widths, goes back to its round-start value and is blocked as `trial-reject` (`lib/trial.mjs::applyVerdicts`); it never reaches the tree, so it is not a write. A trial that cannot restore the live page stops the run. The guard below judges only the writes the trial cannot: a block whose render mints a class per request or reads its parent's values, a self-check miss, a write that changes markup, and a write that moves no box (a colour). After each round, a row that got worse (`lib/solve-rows.mjs::regressedRows`) is pinned on its own node, top-down (`lib/guard.mjs::guardRound`): a setting whose calibration explains the row (the property itself, a calibrated side effect, or a discovered layout effect) is reverted at once; otherwise one suspect setting is undone at a time (layout-mode settings first, then layout properties, then the latest) and the next walk decides, restoring an innocent one. A row on a node with no write of its own takes as suspects the writes inside that node and inside the pair a distance row is measured from (`guard.mjs::anchorRef`). A node's own height or width row sums everything inside it, so a setting on or inside that node whose own rows closed (its property now reads the draft's value, measured on both sides) is never a suspect for it (`guard.mjs::ownSizeRow`, `guard.mjs::landed`). A trial still open when the walk cap is reached is judged on one more walk (`solve.mjs::solveLoop`'s settle step), so no revert ends unconfirmed; a setting that walk restores is walked once more. A setting's own rows are matched by its writes' group, so a write placed on an owner node is judged on the child row it was written for. Reverted settings are blocked and classified Hardcode and count as wrong writes. A guard round is not a write round. A setting written in round N is rewritten later only if the match improves at every width. A write needs the row's element to be one calibration ties to that setting. |
| **R-47-10 Gates** | Every tree passes `scripts/wp-build-page.js --dry-run` before a real build. The resolver writes only settings with `block_attributes.source = 'sgs'`; never a core `style` attribute or a `native_wp` setting, because those serialise as inline `style="…"` (Spec 32). `lint.mjs` enforces this on every tree the route writes, and fails a Fill skeleton that carries any attribute whose `css_property` is not null. Route code passes `python scripts/check-no-client-names.py --check`. Ref classes use the `cr-ref-` prefix, never `sgs-`. |
| **R-47-11 Live-site safety** | The route writes only to the posts listed in `calibration-targets.json` and to the targets the client's confirmed page map names (§9, §12), so the route may create those targets. `lib/tree.mjs` refuses any write to the canary's homepage (2742) or posts page (2741), to a motion-QA fixture (2103, 2109, 2113, 2603, 2740, 3037), or to a target in neither list. It never deletes posts. It never changes an active header, footer, drawer or snapshot pointer, except inside the site-build script under R-48-2. Before a build it checks that no deploy or reseed is running on that site, and a calibration takes a per-site lock (`lib/calibration-lock.mjs`) so a second calibration never builds onto the same calibration page. |
| **R-47-12 Canvas awareness** | A surface composed by the author from arbitrary blocks inside its own post (a mega menu, a modal, a drawer, a choice flow, and any other surface the manifest marks `canvas: true`) may not have a row classed **Missing setting** on the evidence of the attributed block alone. The route checks, in order: the attributed block; every ancestor block in the same canvas tree, including the canvas root; every block already present in that canvas tree that declares the property, ancestor or not; and the block context channel (`providesContext` / `usesContext`) for that property. If any of them can hold the value the row is a route gap, reason `canvas-settable`, citing the block and attribute that can hold it. The route never decides which sibling *should* hold a value: a `canvas-settable` row is handed to a human with its citation (§3.8). |
| **R-48-1 No bypass for code-derived writes** | A value read from the draft's code goes through the same mechanisms as a measured one: the resolver (R-47-3), try before write and the guard (R-47-9), the paint check (`scripts/parity/lib/neutralise.mjs`, §3.6 item 19) and identity pairing (§3.6 item 19). No code reader, intake step or skeleton writes a setting any other way. |
| **R-48-2 The pointer exception** | Only the site-build script may set the active header, footer and drawer pointers, the front page, the posts page, permalinks and WooCommerce page options, and only on a client's own test or production site that has no live pointer set (`wp sgs header|footer|drawer list` shows none active) and is not the canary. Everywhere else, R-47-11 forbids pointer changes. |
| **R-48-3 No silent intake** | No intake step swallows an error. A reader that throws, a getter that needs real DOM, or an adapter that cannot recognise the routing becomes a named gap row in `intake.json`, with the construct, the draft ID and the error text. It is never an empty value and never a skipped construct. |
| **R-48-4 Instrument debt is never a gap** | A setting with no calibration, or whose calibration records no accepted value form, is still written. Its check falls to the render, and an open row on it is instrument debt (`I-*`, §14), never a framework gap. An emission check made by string search of PHP (G5) never opens or closes a gap on its own. |
| **R-48-5 Client code only on Bean's decision** | A client-only artefact is made only when Bean decides it for a named behaviour. It is one type of artefact: an enqueued JavaScript or CSS file with its own deploy and the same gates as framework code, never PHP. |

## 2. Inputs and outputs

- **Input:** a Spec 48A handoff folder at `sites/<client>/handoff/` that passes `node scripts/computed-route/handoff-check.mjs sites/<client>/handoff`, that site's `theme-snapshot.json` (Spec 32 §14, Part C), and the framework database. The handoff is the only accepted input: a draft that is not a Claude Design handoff, or one that fails the check, is not cloned. The draft is served only through `lib/draft.mjs::serveDraft` (Spec 48A FR-48A-10). `README.md` and the other exported prose are a human guide; no route module reads them as input (Spec 48A FR-48A-8).
- **Scope:** a fully working site with every surface the draft shows and the prerequisites each needs: pages and CPT posts, header, footer, drawer, mega menus, modals, forms and form steps, menus, templates and template parts, Site Info, media, and the shop surfaces (§13). Product data comes later (§16); a feature the draft shows and the framework lacks goes on the one-line missing-features list (§9), and stage 1 builds only what stops a main flow (buy, contact, apply).
- **Surface manifest:** `sites/<client>/build/surfaces.json`, one entry per surface: `{ "<surface>": { "tree": "footer.tree.json", "envFile": ".claude/secrets/<site>.env", "envKey": "<KEY>", "target": { "postId": 182 } | { "templatePart": "<slug>" } | { "template": "<slug>" }, "walker": "qa/parity/footer.mjs", "draftUrl": "<url>" } }`. Solve and Fill take `--client <slug> --surface <name>` and read only this. An entry also names its walker states' setting states (`states`), optionally the states to walk (`walkStates`), whether the surface is an author-composed canvas (`canvas: true`, §3.8), and the linked blocks and template parts whose post it is (`provides`, `"<block>:<value>"`, e.g. `"sgs/form:contact"`, `"core/template-part:header"`). The file is generated from the page map Bean confirms at intake (§9, Spec 48A FR-48A-9), and the site-build script (§12) writes each target's ID into it; `canvas` is derived from the surface's post type, and `states` from the draft's state inventory (§3.7). Our `build/surfaces.json` and Claude Design's `handoff/surfaces.json` are different files (Spec 48A FR-48A-1).
- **Reference blocks.** Some blocks print another post (`lib/references.mjs`, found from each block's render.php): a linked placeholder (`formIsLinked`, `flowIsLinked`) ignores its own settings and renders the referenced post's block; a frame (`modalRef`, `drawerRef` printed with `do_blocks`) keeps its own frame settings around another post's blocks. Theme templates (shop, product) are SGS-built trees. They include the header and footer through one `core/template-part` line each (slug `header`/`footer`), which loads the theme part (`parts/header.html`), whose SGS pattern renders the active `sgs_header` / `sgs_footer` post: the header and footer are SGS blocks in their own CPT posts, and the include line carries no setting. The product template also prints the product's own description (`core/post-content`), and WooCommerce blocks hold no SGS setting. Every post a surface prints this way has its own surface (`lint.mjs --surfaces` fails otherwise; the header and footer surfaces `provide` their template part), and Solve never writes to a linked placeholder.
- **Output:** the surface's tree in `sites/<client>/build/`, built through `scripts/wp-build-page.js`, a report, and a generated walker config (Fill writes one; Solve walks one made by `pairs.mjs` when the surface sets `walkerFull`). Site-level output (pages and CPT posts created, menus, pointers, Site Info, media) is §12's.
- **Content.** The draft's words, and which elements are present, are written through block settings (§3.2, §3.3). Words come from the code for every route, step and slide, not only the screen the walker reaches. Whatever no block setting can hold is handed over with its owner (§3.3 Handover). A wrong block type is reported and fixed in the skeleton before Fill (§3.4), never swapped by Solve.

## 3. Requirements

### 3.1 Resolver: `lib/resolve.mjs` (FR-47-1)

Input: block slug, slot element (as calibration names it), CSS property, optional state, and the value at each width (declared from the draft's code, or rendered where the code states none). Output: one attribute write in the block's storage shape, or a gap with a reason.

- **Discovered settings.** An enum setting with no `css_property` (a layout mode) is calibrated value by value, and the properties each value changes are recorded (`calibration.discovered`). When no database row paints a property, the resolver writes the value whose recorded effect matches the draft at every width; a tie goes to the value matching more of that element's other draft properties, and a remaining tie is `ambiguous`.
- **Lookup.** Candidates come from `block_attributes` where `source = 'sgs'`, matched by `block_slug`, `css_property` and `css_state`. States are `hover`, `open`, `scrolled`, `current` and `shrunk`; NULL means rest. A setting for focus exists only where the database holds a `css_state` of focus; a focus row with no such setting is a gap. Only candidates that calibration ties to the same slot element are kept.
- **Storage shape:**
  - `tier_object`: `{desktop, tablet, mobile}`.
  - `flat_sibling`: the rows sharing a base name, picked by `css_tier` (`backgroundImage`, `backgroundImageTablet`, `backgroundImageMobile`).
  - `box_only` and any `box_family`: a box object `{top, right, bottom, left}`, inside the tier object when `tier_shape = tier_object`. A mobile tier that sets one side of a padding or margin box keeps the tablet tier's other sides (Bean); `lib/resolve.mjs::seedSides` seeds unset sides only for a border width, and padding and margin boxes are written one side alone.
  - NULL `tier_shape`: one value, written only when the draft value is equal at every width; otherwise a `shape` gap.
- **Units.** A unit companion is the attribute named `<attr>Unit` on the same block, when `block.json` has it; the database does not link them. Its value is the draft value's unit. A unitless line height is written as the number with `<attr>Unit` set to the unitless option in that attribute's enum; where the enum has none, it is converted to the companion's unit and logged.
- **Tokens.** Values go through `lib/normalise.mjs` (R-47-7). Which form a setting accepts (palette slug, hex, preset slug or literal) comes from calibration's colour marker step.
- **Content.** Text, presence and link rows resolve through the same module: a `content` or `text-content` setting whose calibrated `text` path is the element, a presence or variant setting whose calibrated `presence` shows or hides it, a link setting whose calibrated `link` is it (§3.2). Status of the move: content resolution still lives in `lib/solve-rows.mjs::resolveContent` and moves into `lib/resolve.mjs` (R-47-3).
- **Gap reasons:** `no-setting` (nothing paints this property on this slot), `ambiguous` (two settings remain after slot filtering), `shape` (the value cannot be held, for example a `clamp()` in a setting calibration showed does not accept one).

**Done when:** `node --test scripts/computed-route/tests/resolve.test.mjs` passes. Its cases include a heading `line-height` written as a tier object with its unit companion, a container `padding` written as a box inside a tier object, a `flat_sibling` background image, and an unknown property. The unknown property must return `no-setting` and fail if written.

Status: built (`lib/resolve.mjs::resolve`, `tests/resolve.test.mjs`); content resolution not yet moved (`lib/solve-rows.mjs::resolveContent`).

### FR-48-1 -- Declared forms

The resolver accepts a value in the form the draft's code declares, not only its rendered result, where calibration records that the setting accepts that form (§3.2 FR-48-2): a fluid `clamp()` or `vw` size, a grid template such as `repeat(3, 1fr)` (written as the column count where the setting is `columns`, and as the template where the setting takes one), and a layout mode from the declared `display` (`grid`, `flex` with its direction), which narrows the `layout` choice the hide-on-device settings otherwise make ambiguous. Where calibration does not record the form, the value is written per tier from the declared values at 375, 768 and 1440 and the row is instrument debt (R-48-4). Track sizes the code does not state are taken from the render. The written form is then checked against the render (R-47-4). Done when: `resolve.test.mjs` gains a `repeat(3, 1fr)` container row written as three columns, a declared `display: flex` two-child row written as a flex row, a `clamp()` font size written whole on a setting whose calibration lists `clamp` and per tier on one that does not; and the per-tier case fails if the form check is removed.

Status: not built (`lib/resolve.mjs` takes rendered values only). Calibration now records the forms it needs (FR-48-2); `container.columns` is cached with `property` `grid-template-columns` while `lib/resolve.mjs::candidates` matches the DB's `grid-template-columns:count`, so the resolver cannot reach it yet.

### FR-48-74 -- The desktop tier is read at 1440; 1920 confirms

The resolver takes the desktop tier's value from 1440 alone. The 1920 reading is a confirmation, never a source: when the value at 1920 differs from the value at 1440, the difference is a fluid value (the declared form goes through FR-48-1 and row 8, §10) or, where the code declares no fluid form, an `I-calibration` row naming the property and both values (R-48-4). A 1440/1920 difference never produces a `shape` gap. A `shape` gap stays for a value a setting genuinely cannot hold (a keyword the setting does not take, one value for every width where the draft has several across 375, 768 and 1440). Done when: `resolve.test.mjs` gains a font size of 48px at 1440 and 52px at 1920 written as desktop 48px with no gap, a declared `clamp()` with the same readings routed to the fluid path, and both cases fail with the 1920 merge restored.

Status: built (2026-10-11). `lib/resolve.mjs::TIER_OF` maps 375, 768 and 1440 only; `lib/resolve.mjs::tiersOf` returns the 1920 reading as `confirm`; `lib/resolve.mjs::resolve` writes desktop from 1440 and attaches `instrumentDebt` (`I-calibration`, both values), or takes the fluid path for a declared fluid form (`input.declared`, which no caller passes yet); `solve.mjs::writeRound` carries the note onto each write record (`tests/resolve.test.mjs`, two MUST FAIL cases red with the 1920 merge restored).

### 3.2 Block calibration: `lib/calibrate.mjs` and `calibrate.mjs` (FR-47-2)

The modules that implement it (`lib/calibrate-props.mjs`, `lib/calibrate-markers.mjs`, `lib/calibrate-instances.mjs`, `lib/calibrate-read.mjs`, `lib/calibrate-content.mjs`, `lib/calibrate-chunk.mjs`, `lib/calibrate-container.mjs`, `lib/cache.mjs`, `lib/deploy-hash.mjs`) are indexed in `scripts/computed-route/README.md`.

Calibration has two outputs with different scopes:
- **Slot map:** which rendered element and property each setting paints, how its value transforms, and which value forms it accepts. It does not depend on the site. It is measured once on the canary and cached per block, keyed by the md5 of the block's deployed `build/blocks/<block>/` directory read over SSH, so the key matches what the server runs.
- **Default paint:** each element's computed style with no settings. It carries the measuring site's tokens, and is keyed by the slot-map key plus the md5 of that site's `theme-snapshot.json`.

Before calibrating, `calibrate.mjs` compares the deployed `build/blocks/<block>/` md5 with the local build and refuses to run on a mismatch. The md5 covers the files that decide what a page paints (`block.json`, `render.php`, the front-end stylesheets and view scripts) and leaves out the editor bundles (`index.js`, `index.css`, their rtl copy, `index.asset.php`): the same commit built in another folder gives a different `index.js` (proven 2026-10-03: commit 4ba8be0f1 deployed from the deploy's temporary worktree and built locally gave different editor bundles and identical front-end files), so a whole-folder key could never match. View bundles and asset files are hashed after blanking webpack's module numbers and the asset version (`lib/deploy-hash.mjs::normaliseBundle`, which renumbers parameterised webpack modules as well as bare ones): the same commit numbers its modules by build folder (proven 2026-10-03: trust-bar's `view.js` differed only in module 2310 against 6469), while any code change still changes the key. Local text files are read with LF endings (`lib/deploy-hash.mjs::lfText`): the deploy builds from a clean LF checkout, while a working copy may carry CRLF (proven 2026-10-03: language-switch's and wishlist-link's `render.php` differed by exactly their line counts). Inherited properties are not recorded as default paint (R-47-5 uses the parent's live value). The cache is `scripts/computed-route/cache/`, gitignored, and its two outputs are stored apart:
- **Slot map:** one library-wide file per block, `cache/<block>.json`, whichever site measured it (Bean, 2026-10-03), so every client starts with a slot map. It records the measuring `site` for provenance only; a run on another site replaces it only with `--recalibrate`.
- **Default paint:** one file per site and block, `cache/<site>/<block>.paint.json`, carrying its `paintKey`. A run on one site never reads or overwrites another site's default paint, so calibrating Indus leaves Eye Care's untouched. A default paint whose `paintKey` no longer matches (the site's snapshot changed) is stale and is re-measured on that site; FR-48-18's exit step does this after the client's snapshot push. A local mirror counts as the test site it copies (`mirrorOf` in `calibration-targets.json`; same build, database and snapshot, so the same `paintKey`): its paint is written to and read from that test site's folder (`lib/cache.mjs::paintSite`).

**Steps:**
1. Render one default instance and record every rendered element's computed style, with no element cap, and the `::before`, `::after`, `::placeholder` and `::first-letter` layers (keyed `<path>::before` and so on, the key the walker's pseudo rows use). A panel an element controls through `aria-controls` is read as `@controls > <path>`.
2. Render one marked instance per (setting, marker) and record which element's computed style changes, and to what. An instance carries the preconditions its setting needs (`lib/calibrate-instances.mjs::preconditionsFor`): its variant (`blocks.variant_attr` and `variant_slots`), the show or enable toggle that gates it, the partner border setting, an overlay image (`calibration-targets.json` holds an image per site) and the layout mode (grid or flex) that makes it paint.
   - A setting that changes nothing is reported as dead. A dead setting is instrument debt until a marker or precondition fault is ruled out (R-48-4, §14); only then is it a framework defect.
   - A setting whose marker reaches its element at fewer than all three tier widths is reported as a one-width hardcode.
3. Write one file per block: elements by their selector path from the block root (BEM classes joined by ` > `, with `:nth-of-type(n)` only where siblings share a class), the default paint per element, and each setting's slot, property, accepted value forms and transform.

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

**Presence and content settings.** A setting the framework database marks `role` `boolean-visibility` or `presence-boolean`, and each value of a variant setting (`blocks.variant_attr`), is also read for presence: the elements that appear or disappear when it flips, recorded as `presence: { shows: [paths], hides: [paths] }` (a style change alone is not presence). A setting whose `role` is `content` **or `text-content`** is rendered with a marker string and records the element whose text it prints (`text: <path>`), and a link or URL setting the element it makes a link (`link: <path>`). Calibration reads both roles (Bean, 2026-10-05): most of a site's words live in `text-content` (`sgs/product-card::noReviewsText`, `::brandName`, `sgs/buybox::stockInStockLabel`, `sgs/whatsapp-cta::cardTitle`), so reading `content` alone would leave them unreachable. Built in `lib/calibrate-content.mjs`: the reads are planned by framework-database `role` and read in a second in-page pass, because `lib/db.mjs::attrsFor` carries `AND css_property IS NOT NULL` and so returns no content setting at all. The route calibrates SGS-owned blocks only (R-47-10). Presence is decided from element existence and display alone, so a style change cannot register as presence. A text setting of type `array` or `object` takes no marker, because it holds many values at once and no single marker string can locate one element: it is listed in `noMarker`. Counts come from the framework database, never from this spec. Whether the content reads return text on a real client block set is verified on the first clone (§5 residual).

An enum with no CSS property in the `layout` or `select-from-enum` role (business-info `hoursLayout` rows/condensed is the first one Fill needed) gets no presence read today, so Fill lists it under Not read and the skeleton sets it. Planning a presence instance per enum value, as `variantPresenceValues` does for a block's variant setting, is the fix; it is a shared calibration change, so Bean signs it off first (§6).

A setting that paints a parent while a rule on a child overrides it is recorded with the overriding child (`lib/calibrate.mjs::overridingChildren`, `settings[<attr>].overriddenBy`); affected rows are re-typed after a calibration run and a Solve run. `overriddenBy` counts only when the named child renders a box, because it can name a non-rendering element.

**Where and how it renders:**
- Each site has one calibration page, created once with `wp-build-page.js --create page --title "CR calibration" --slug cr-calibration --status private`. Its post ID goes in `scripts/computed-route/calibration-targets.json` (`{ "<site>": { "envFile", "envKey", "postId" } }`; eye-care-test: 668, sandybrown: 4750, indus-test: 15). Later runs replace that page with `--post-id`. Private, it is never public, indexed or linked; calibration reads it in a logged-in browser. Every client with a test site has an entry before its stage 0, created by Appendix A step 13 (Indus's `indus-test` and `local-indus` exist).
- The local WSL mirrors of the test sites (`local-eye-care`, `local-sandybrown`, `local-indus`; `scripts/local-wp/README.md`) are targets too, with the same post IDs and a `pluginDir` the deploy check hashes directly instead of over SSH. They measure the same as the hosted sites for the same build and snapshot (google-reviews, accordion and accordion-item identical, 2026-10-05) and are where whole-library recalibration runs: Hostinger's edge challenges bursts of automated logins. Solve runs on a mirror too (`solve.mjs --site <target>`, `solve.mjs::siteOverride`); `scripts/local-wp/refresh-from-remote.sh` first brings the mirror's database and uploads up to the test site's.
- One run opens one browser and logs in once (`scripts/lib/wp-session.js`): every `wp-build-page.js` step opens a tab in it through `SGS_CDP_URL`. With `SGS_CDP_URL` already set, the run attaches to that browser instead.
- One build holds a block: one default instance per variant plus one instance per (setting, marker), each wrapped in an `sgs/container` with class `cr-cal-<block>-<setting>`. A block with more than `CHUNK` (150, or `SGS_CAL_CHUNK` for a run) instances is built and read in several pages, each carrying every variant's default instance (google-reviews has about 400; a 400-instance save failed with an invalid JSON response). One block's failure is that block's error; the run continues. A full-library run exhausts Node's 4 GB heap; `SGS_CAL_CHUNK` is the workaround and the cause is unproven (§5 residual).
- Each block has a fixture in `scripts/computed-route/calibration-fixtures.json`: the minimum content and parent chain it needs (text for a heading, a parent `sgs/site-footer` for `site-footer-row`). A block with no fixture is reported, not guessed. A fixture names each site object it needs by a token, never a literal id: `{{menu}}`, `{{menuItem}}` (inside the attribute's own form, `"id:{{menuItem}}"`), `{{drawer}}`, `{{image}}` with `{{image.url}}`, `{{logo}}` and `{{product}}` (`{{product:text}}` where the attribute stores ids as text); the vocabulary is `lib/calibration-refs.mjs::ROLES`. Each calibration target maps the tokens to its own objects in `calibration-targets.json` `refs`, and a mirror inherits its test site's. Before building, `calibrate.mjs` resolves each fixture from the target's refs and checks that every referenced object exists on the site with the right kind (one read-only `wp eval-file`; a menu item must be in the menu). A block whose token the target does not supply, or whose object is missing, is reported and not built, so a site without the object never replaces the library-wide slot map with an empty render; stage 0 reports it as `needs-refs` and does not run. An attachment id beside the URL its render falls back to (`url` beside `id`, `<name>Url` beside `<name>Id`) stays literal, because the element renders on any site. `lint.mjs` fails on a literal reference with no fallback (`lib/fixture-refs.mjs`; `fixture-refs.mjs --survey` lists every reference and its category).
- Blocks that render only inside a header, footer, drawer or mega-menu post are calibrated inside a dedicated `sgs_header`, `sgs_footer` or `sgs_drawer` post, recorded in the same file. The site's active pointers never change.
- At the end of a run the calibration page is replaced with an empty tree.

**Failure handling:** a failed build or an aborted run leaves only the calibration posts touched; the next run replaces them. A deploy mismatch stops the run before any write.

**Done when:** calibrating `sgs/heading` on eye-care-test produces a file in which `lineHeight` maps to the heading element at all three widths and `margin` maps as a box, the calibration page is empty afterwards, and a planted mismatch fails the run before any write. The planted mismatch is a local `build/blocks/heading/style-index.css` differing from the deployed one.

Status: partly built (`calibrate.mjs`, `lib/calibrate*.mjs`, `lib/deploy-hash.mjs`, `lib/calibration-lock.mjs`; 94 block caches in `scripts/computed-route/cache/`). The two outputs are stored apart (2026-10-11: `lib/cache.mjs`, readers take the site through `solve.mjs::calibrationFor`, `tests/cache.test.mjs`; existing caches split by `split-cache.mjs`). `overriddenBy`'s rendered-box guard not built; `layout` and `select-from-enum` presence reads not built.

### FR-48-2 -- Accepted value forms

Each setting's calibration records the value forms it accepts beyond a plain literal, by rendering a marker in each form and reading whether the element takes it: a palette slug and a hex (colour, built), a `clamp()` and a `vw` length (fluid sizes), and a `repeat(n, …)` template or a column count (grids). The list is the setting's `forms` field in the cache. A setting is "built" for a fluid or grid form only once its `forms` list names that form; until then the resolver writes per tier (FR-48-1) and the row is instrument debt (R-48-4). Done when: recalibrating `sgs/heading` and `sgs/container` records `clamp` on a font-size setting that accepts it and `repeat` on the container's grid template setting, and a planted setting that strips `clamp()` records no `clamp`.

Status: built (2026-10-11). `lib/calibrate-markers.mjs` adds `clamp` (`clamp(13px, 9px + 3vw, 71px)`), `vw` (`4vw`), `repeat` (`repeat(3, 1fr)`) and `count` probes; a form is recorded only when one element carries the expected value at 375, 768 and 1440 (0.5px tolerance for lengths), and a probe that misses never makes a setting dead (`tests/calibrate-forms.test.mjs`, MUST FAIL: a planted stripped `clamp()`). Recalibrated on `local-indus`: heading `fontSize` records `clamp` and `vw`, container `gridTemplateColumns` records `repeat`. The live planted-strip block is not built (the case is proven on synthetic readings). Colour `hex` and `slug` keep the earlier, looser reach rule.

### FR-48-3 -- Stage-0 calibration of the client's block set

Stage 0 runs before intake, so it cannot use anything intake produces (the page map or the skeleton proposals). Its block set is fixed in advance: the blocks that the surface kinds in the export's `handoff/surfaces.json` call for (a `header` kind calls for the header blocks, a `form` kind for the form blocks, and so on, from the framework DB's `block_composition`), plus the layout and content blocks every surface uses (container, heading, text, button, media, icon-list). For Indus the set is the named list: container, card-grid, form, nav-drawer-menu, hero, trust-bar, nav-bar-menu and mega-panel, plus the layout and content blocks. Stage 0 recalibrates the **slot map** of each block in the set whose cache is stale (its deploy hash differs from the deployed build) or carries a fault on a setting the set needs, on an existing mirror of the client's test site (for Indus, `local-indus`). It records the calibration-debt baseline: per block, the counts of `dead`, `noMarker`, `oneWidth` and `untestedStates`, with the deploy hash (Appendix C, `calibration-baseline.json`). The baseline is the instrument-debt starting point for §14; a later run reports the change from it. For Indus this also means fixing `container.gridTemplateColumns` (in `cache/container.json` `dead`) and the two resolver ties that stop `container.layout`'s discovered values. A layout mode has no `css_property` by design: calibration discovers what each value changes (`lib/db.mjs::enumSettings`, `discovered.layout` in `cache/container.json`). On the root the three hide-on-device toggles tie with it on `display`, and on a flex row draft `flex` ties with `stack` because a default `row` direction records no change.

Default paint is not measured in stage 0, because stage 2 replaces the site's snapshot and stage 2's framework edits change what blocks paint. It is measured as stage 2's exit step (FR-48-18), after the snapshot push. A block that stage 1's skeleton proposal adds outside the fixed set is calibrated in that same exit step. Done when: a stage-0 run on Indus writes the baseline file, refuses to report a block whose deploy hash differs from its cache as calibrated, writes no default-paint file, and `container.gridTemplateColumns` is no longer `dead`.

Status: done for Indus (2026-10-12). The command is built (`stage0.mjs`, `lib/stage0.mjs`, `data/calibration-baseline.schema.json`, `calibrate.mjs --slot-map-only`, `tests/stage0.test.mjs`); a run on `local-indus` at `3e1bdd9e9` has all 17 blocks current and wrote `sites/indus-foods/build/intake/calibration-baseline.json`, whose per-block counts and deploy hashes match `scripts/computed-route/cache/*.json` (17 of 17; totals 324 dead, 37 noMarker, 18 oneWidth, 40 untestedStates), and no default-paint file changed. The block set maps each surface kind to the `sgs/` blocks whose slug is the kind or ends in `-<kind>`, because `block_composition` has no surface-kind column; for Indus that gives 17 blocks (the six layout and content blocks, plus accordion, choice-flow-result, form, form-step, mega-panel, nav-bar-menu, nav-drawer, nav-drawer-menu, site-footer, site-header and wishlist-panel, the last a false match on `-panel`). Card-grid, hero and trust-bar come from `page` surfaces, which no block is named for, so they are calibrated by the stage 2 exit rule above. Fixtures are portable (2026-10-11: tokens resolved per calibration target, `lib/calibration-refs.mjs`; `provision-calibration-refs.mjs` created the `indus-test` calibration menu 3, item 26, drawer 20 and logo 29; the `menuItem` item carries the Description "SOON", the menu blocks' badge copy). A slot map is shared by every client, so `calibrate.mjs` refuses one that drops a setting the existing map reaches unless `--allow-loss <block>:<setting>` names it, and keeps the refused candidate in `cache/<block>.refused.json` (`lib/cache.mjs::slotMapWriteDecision`). Each refusal on Indus had a proven cause, fixed at its source: the badge item (content); site-header `backgroundSize`/`backgroundAttachment` paint on the container wrapper's `::before` media layer, now read (`lib/calibrate-props.mjs::CAL_PSEUDO_PROPS`); `chromeSlotFontStyle` and 15 other helper-painted typography rows had lost their `css_property` (`attr-classification-overrides.json`, reseeded at `3e1bdd9e9`); and `itemTextDecorationHover` was beaten inside page content by `extensions.css`'s link-underline rule, which now skips any `sgs-` link (`3aa1ed054`). Fixture preconditions reach `videoTime*` (a literal `.invalid` direct-file video), `anchorOffset` (anchor `trigger`) and `chromeRatingColour` (`chromeRating`). One named loss was accepted: nav-drawer `discovered:chromeSlotTextTransform` (now an ordinary setting on the same slot). Settings: nav-bar-menu 90 to 116, nav-drawer 48 to 57, nav-drawer-menu 70 to 81, site-header 28 to 33, media 38 to 49. Calibration debt left open: `chromeRatingColour` reads dead because the Indus test site has no Site Info rating (a fake one would show on the client's build). `container.gridTemplateColumns` is no longer dead (2026-10-11: the marker wrote a number, which `SGS_Container_Wrapper` ignores as a template; the `repeat` probe writes a string, FR-48-2), and every `:count` setting is now calibrated (it was dropped for having no readable property). The two `container.layout` ties are fixed (`lib/resolve.mjs::resolve` drops a yes/no setting whose unreached widths keep a default paint the draft differs from; `lib/resolve.mjs::resolveDiscovered` compares a value with no recorded change against the default paint), so root and inner flex-row, column and grid drafts resolve to `flex`, `stack` and `grid` (`tests/resolve.test.mjs`). The baseline before that work, read from `scripts/computed-route/cache/*.json` (94 block files, excluding `*.tree.json`): 578 dead, 110 noMarker, 24 oneWidth, 47 untestedStates. The Indus mirror `local-indus` and the `indus-test` and `local-indus` calibration targets exist (page 15).

### 3.3 Solve: `solve.mjs` (FR-47-3)

Input: a surface from `surfaces.json`. After a code-first Fill (§3.4), Solve is the check-and-repair loop: it compares the built surface with the draft and repairs what differs. It is also the repair tool for a site already built from an earlier draft (Eye Care, Spec 48A FR-48A-11).

**Step 0.** Add a `cr-ref-<surface>-<n>` class to every node that lacks one (`lib/tree.mjs`). `<n>` continues past the surface's highest number (on an unnumbered tree, the node's depth-first index), so a node added later never reuses a number; it is appended to any existing `className`. Then rebuild once. Step 0 is not one of the rounds.

**Each round:**
1. Build: `node scripts/wp-build-page.js --env-file <envFile> --env-key <envKey> --tree <tree> --post-id <id>` (or `--template-part`).
2. Walk: one `node scripts/parity/draft-live-walk.mjs <walker> --headless --no-review --lean --widths <w> --draft-cache <run dir>/draft-cache-<w>.json --out <run dir>/round-<N>/w<w>` per width (375, 768, 1440, 1920), all four at once, merged into `round-<N>/report.json` (`solve.mjs::mergeReports`). `--lean` reads only what Solve uses (styles, boxes, hover end states, structure); `--draft-cache` reads the draft once per run. `<walker>` is the surface's `walkerFull` (every block paired, `pairs.mjs`) when it has one, else its hand config. With `SGS_HEADED=1` the walks run headed (`solve.mjs::WALK_FLAGS` drops `--headless`): Hostinger's edge answers headless browsers with a 403 browser check after bursts of traffic (`.claude/dev-setup.md`); when it shows a captcha even to headed logins, run against the local WSL mirrors (§3.2).
3. Write. Consider each row in `report.json` whose kind is `style`, `hover` or `box`, which is not accepted and not matched in `divergences.json`:
   - The row's `ref` names the node; its `path` matches a calibration element exactly, giving the slot.
   - The resolver gives the setting; the draft's value is written at the row's width. Where the draft's code declares the value (§3.4), the declared form is written (FR-48-1) and the render confirms it (R-47-4).
   - A row with no `ref`, or a `path` calibration does not know, is Unresolved (`unmapped-element`).
   - A row on a linked placeholder is never written (gap `linked`): it belongs to the referenced post's surface.
   - A `presence` row (an element on one side only) resolves through a setting whose calibrated `presence` shows or hides that element, or a variant value that does; a `text` row through a `content` setting whose calibrated `text` path is that element; a link-coverage row (§3.6 item 4) through a setting whose calibrated `link` is that element. One resolver (R-47-3). The walker stamps no `ref`, `path` or `block` on a content row (`scripts/parity/lib/ref-trace.mjs::stampRefs` covers style, hover, box, tag, active and lines only), so the node comes from the pair's live trace (`lib/solve-rows.mjs::contentTarget`). A presence row for an element missing from the live page, and a `link-missing` row, are unwritable until FR-48-12 lands.
   - Rows of other kinds are reported, never written.
   - A row a divergence-ledger entry covers targets the entry's decided value, not the draft's, at that width and at every width the entry covers (`lib/solve-rows.mjs::draftValues` reads the row's `decided`, §3.5).
   - `width` rows are written only as the draft declares the width (a plain length or percentage at every width no ledger entry holds, read from the draft's declared values, §3.6 item 11); otherwise they are reported as a `used-value` gap: a computed width is the box's used size, and writing it would freeze a fluid layout (`solve.mjs::USED_VALUES`, `lib/solve-rows.mjs::usedValueTarget`).
   - A row on a `::before` or `::after` layer (`pseudo`) resolves on its element's path plus the layer, the key calibration gives the layer.
   - Box rows (`w`, `h`) name no CSS property, so no setting can hold them: they are never written, listed as derived, and close when the spacing that moves them closes. A scored item closes only when its box rows close too.
4. Stop when no row changes or after round 3 (R-47-9). `--rounds 0` is measure-only: one build and one walk, never a write (`solve.mjs::solveLoop`, test `tests/solve.test.mjs`).

**Classification of surviving rows:**
- **Hardcode:** the setting holds the draft value, or its logged snap, and the paint still differs beyond the walker's tolerance and the snap's distance; or the setting reaches the draft value only by moving the layout away from the draft (a guard revert, `breaks-layout`, or a trial reject before writing, `trial-reject`). Framework repair, once §14's gates prove it. It holds whether Solve wrote the value this run or the tree already held it (`solve.mjs::writeRound` records the held groups; a measure-only run reads them against a copy of the tree). A group is held only if the tree held the value before the round's first write: a value another group wrote earlier in the same round (two rows resolving to one setting) is a write, never a hold (test `tests/solve-held.test.mjs`). A row whose draft or live value the walker never read (a draft inline span's box styles, a live element with no text) is not a paint: it is Unresolved with the reason `unmeasured-side`, never Hardcode, and a row with no draft value forms no writable group (`lib/solve-rows.mjs::classify`, `::writableGroups`; same test file). The row says what the tree holds, the widths that differ and the widths that match, and, for a rest-state row, the rule that wins on the live page beside the rule that carries the draft value (`lib/winning-rule.mjs`, Chrome DevTools' matched rules; `--no-rules` skips the browser read).
- **Missing setting:** the resolver returned `no-setting`. Framework new control, once §14's gates prove it.
- **Issue and cause views:** the report also lists each surviving style or hover row's issue (one element, property and state, with every width it differs at and that width's own draft and live values, and the widths where it matches) and each cause (issues sharing a class, a property and the winning rule or the same values, every element listed with its widths). No row is merged away: the per-width tables stay (`lib/solve-groups.mjs`, test `tests/solve-groups.test.mjs`).
- **Intended:** matched in `divergences.json`.
- **Unresolved:** anything else, with its reason.
- **Handover:** a text, presence or link row that no block setting could hold because the content lives outside the tree (a Site Info value, product data, WooCommerce or core text, a page the draft links to but never shows), and behaviour the walker cannot drive (FR-47-7). Each is listed in `solve-report.json` `handover` with its evidence row and owner, so a follow-up agent can act on it. A row a block could reasonably hold, but has no setting for, is Missing setting (framework), not handover. Built in `lib/solve-rows.mjs::handoverOf`. There are **five** owners, defined once in `lib/issue-classes.mjs::HANDOVER_OWNERS` and shared with Fill: `site-info`, `product-data`, `content-page`, `behaviour` and `woocommerce-text`, the fifth because WooCommerce's own strings are edited somewhere else entirely from a content page. Solve discovers a handover from a measured walker row (`{ owner, row, widths, reason }`); Fill carries one its skeleton declared before any measurement exists (`{ owner, kind, node, block, slot, evidence, reason }`). Both satisfy this section's requirement of an owner and an evidence row.

**Output:** the updated tree, `solve-report.md` (counts per class, every write with its before and after values, every token snap) and `solve-report.json`. Solve's labels are candidates; whether a gap is real is decided by §14's gates, never by Solve's own label.

**Failure handling:**
- A wrong write is a write that a later round reverts, or after which its row reads further from the draft (R-47-9). A setting the trial rejects before the rebuild never reaches the tree, so it is not a write; `solve-report.md` lists every trial verdict under "Tried before writing". Wrong writes are listed. The wrong-write ratio counts settings (one attribute on one node, however many chained writes set it): wrong settings over settings written (`solve.mjs::settingRatio`).
- A build failure stops the run with the tree from the last successful round. A failure in round 1 leaves no walk: Solve reports the failed round and exits 1 (`solve.mjs::solveLoop`'s `buildFailed`).

**Report metrics (diagnostic only, FP-4).** Each run reports the share of scored items handled (closed, or left open and correctly named as a gap), whether any row closed before is open after or moved further from the draft, and the wrong-write ratio. The footer proof's lines (§5: at least 90% handled, no regression, at most 10% wrong writes; kill under 60%, over 10% wrong, or a third round that still writes) are the reference values. A number never closes a surface alone.

**Done when:** the footer proof (§5 stage 2) meets its success line.

Status: built (`solve.mjs`, `lib/solve-rows.mjs`, `lib/solve-report.mjs`, `lib/solve-groups.mjs`, `lib/winning-rule.mjs`, `lib/guard.mjs`, `lib/trial*.mjs`); the footer proof passed (§5).

### FR-48-4 -- Margin writes are tried

Try before write (R-47-9) also catches a margin write that moves boxes: the trial applies the write's margin change on the live element and compares every pair's box position, not only the pair's own properties, so a margin that pushes a sibling or the following section off the draft is rejected before the rebuild. Done when: a trial test plants a margin write that moves the next sibling 20px off the draft while the written element's own margin matches, and the trial rejects it; the shop surface that showed it (WW-SH-01) is re-run and no margin write the rebuild shows moving boxes passes the trial.

Status: not built (the open defect WW-SH-01 in `.claude/LEDGER.md`).

### FR-48-5 -- Guard memory and an honest wrong-write count

1. The guard keeps a node's tried suspects after a trial is exhausted, so a later round never tries the same suspects again (`lib/guard.mjs::guardRound` deletes the trial record, with its `tried` set, when no untried suspect is left).
2. A run that stops early (a crash, a host failure, a time-out) writes a crash report naming every setting written since the last judged walk, and marks those writes unjudged; the next run re-measures them before it writes anything else.
3. The wrong-write ratio counts every setting a later read shows moving away from the draft, not only those the guard reverted. Done when: a guard test with an exhausted trial shows the same suspect is not tried again in the next round; a Solve test killed mid-round leaves a crash report listing the round's writes; and a run in which a write moves a row away without a guard revert counts it as wrong. Each test fails with its fix removed. Status: not built.

### 3.4 Fill: `fill.mjs` (FR-47-4)

Input: a skeleton tree. Each node carries `draftRef`, a finder for the draft element it copies, and optional `draftSlots` (`{ slot: finder }`) for inner elements, plus content. A style value in it fails the lint (R-47-10).

**The skeleton.** Two lanes write it, and both write structure, identity and content references only:
- **Agent lane (now).** An agent writes the skeleton from the draft's code (template, logic, `surfaces.json` kinds) through the skeleton writer (`skeleton.mjs`), choosing blocks, nesting and content references; every value goes through Fill and the resolver. The lint fails a skeleton carrying any attribute whose `css_property` is not null (R-47-10).
- **Code-reader lane (alongside).** A narrow code reader writes the same parts of a skeleton mechanically for the constructs it knows (FR-48-7), and takes over a construct once its tree matches the agent's on every Indus surface. It is optional for Indus and expected from the second client.

The skeleton writer produces the agent lane's proposal from the draft's own elements:
1. **Inventory:** every element of the surface's draft root, keyed `<importPath>/<n>#<copy>` (the `data-dc-tpl` number restarts per template, so a key names the chain of import hosts, the number and the copy index), with its boxes at 375, 768 and 1440 and a screenshot. The inventory is re-derived from the code at intake by `handoff-schema/METHOD.md` (Spec 48A FR-48A-7) and joined to the rendered boxes; the stamps are re-derived for each export, never carried from an earlier one.
2. **Propose:** a block per element from the framework DB (`html_tag_to_core_block`, `block_composition`, `block_capabilities`, `block_attributes`) and saved decisions, each with a confidence. The code gives hints: an `sc-for` loop (a repeated item), a recorded motion (a loop animation), a surface kind from `surfaces.json` (drawer, modal, mega menu, form step) and the logic's typed lists. The rules of FR-48-6 apply.
3. **Finalise:** an AI finaliser decides only the low-confidence choices (brief: `prompts/skeleton-finaliser.md`).
4. **Review:** a table (key, code, screenshot, proposed block, confidence) for Bean to confirm in intake's one batched review (§9); confirmed choices are saved (`data/skeleton-decisions.json`) so the next client needs fewer.

Block-choice faults are fixed in the skeleton before Fill runs; Solve never swaps a block (§2).

Each node's `draftRef` is a `tpl` finder (`{ tpl: "<importPath>/<n>#<copy>" }`, resolved by `scripts/parity/lib/collect.mjs::resolveFinder`). `check-refs.mjs` resolves every finder of a skeleton on the draft and fails on a miss or an ambiguous match. Fill keeps each node's draft identity beside the tree (`<surface>.origin.json`, `cr-ref` to `tpl` key and fingerprint) so the walker pairs by identity (§3.6 item 19).

**Steps:**
1. **Read.** For every referenced element, the declared value at 375, 768 and 1440 comes from the draft's code first: the template's declared styles, `renderVals()` and `{{ }}` bindings evaluated per width, `style-hover` and `style-focus` for states, read through the runtime (R-47-4). The rendered computed style supplies what the code does not state (browser defaults, inheritance) and confirms every declared value (FR-48-8). A throw while reading is a gap row (R-48-3).
2. Resolve root-down: each node and slot, every property that differs (R-47-5).
3. Spacing ownership, decided per tier from rendered gaps, not the draft's CSS. A gap is the distance between consecutive children's border boxes along the parent's main axis; equal means within 0.5px.
   - A parent's gap is written only when every sibling gap is equal.
   - Otherwise the parent gap is 0 and each child gets its own margin.
4. Give every node a `cr-ref-<surface>-<n>` class. Generate the walker config from the refs (Solve's existing trees use the same kind of generated config: `pairs.mjs`), with `refPrefix: 'cr-ref-'` and the ledger path, so every mapped node is compared on every property.
5. Output the filled tree, `fill-report.md`, the UNMAPPED list (property, value, node, reason: the framework work for this surface, known before the first build) and the handover list (§3.3). `fill-report.md` also lists under Not read every setting on a measured node that no read reached, no decision judged, or whose written value the render has not confirmed (`lib/fill-unread.mjs::unreadOf`): a calibrated element no finder read, a presence, text or link setting with no calibration reading, or a layout or mode enum calibration reads no presence for. A setting the skeleton sets or Fill wrote and the render confirmed is never listed, and nothing is dropped silently.

**Partner settings.** A setting that paints only with a partner set (a border colour needs a border width and style; an overlay colour needs the overlay on) is written with that partner, taken from the block's calibration fixture (`lib/fill-fixture.mjs`, R-47-5). A border colour left UNMAPPED although `container.borderColour` is calibrated at all three widths (`cache/container.json`) is a route fault in this step, not a framework gap.

Presence and content: the skeleton carries the draft's words in each block's `content` settings, read from the code for every route, step and slide (including copy held in the logic's arrays), and Fill sets each block's visibility and variant settings from calibration's `presence` so the built block shows the elements its draft element shows and no others.

Site Info rows: a row of generated brand icons shares one look, held by the row's `childIcon*` settings (`lib/fill-row-lift.mjs::liftRow`). Each generated icon's draft link is read as the row's `shape` element and the glyph inside it (`lib/fill-skeleton.mjs::ROW_GLYPH_SLOT`, finder `svg`) as the row's `glyph` element; the row's element paths come from the DB's `css_element` and the row's calibration (`rowElementPaths`). A setting is written on the row once, only when every icon gives the same value; a disagreement is an UNMAPPED `disagree:` row, never averaged. The icons keep their brand, link and content settings only.

**Values that need care:**
- **Fluid sizes:** a `clamp()` or `vw` value is read as declared (FR-48-1). It is written whole only where calibration records that the setting accepts it (FR-48-2); otherwise per-tier values from 375, 768 and 1440 are written. The render at 375, 768, 1024, 1440 and 1920 checks the result: linear within 0.5px means fluid.
- **Breakpoints:** thresholds come from the draft's logic (`renderVals()` ternaries, media rules), checked by flipping at the threshold ±1px. Each threshold is snapped to a tier, written to the block's own breakpoint setting, or written as listed custom CSS by the breakpoint rule (§10 row 9). The 16px sweep from 320 to 1920 is a check, not the source.
- **Entrances and motion:** duration, delay, easing, distance and keyframes come from the recorded motion (the draft's `animate()` calls and CSS animation and transition events, `animations.json` re-derived at intake, cross-checked by `trace-check.mjs`), with pose sampling kept as confirmation. They are written to the `sgs-fx` settings that calibration ties to `transform` and `opacity` on that block.

**Done when:** Fill on one unbuilt surface produces a tree that builds, and a walk of it shows only rows listed in its UNMAPPED list or in `divergences.json`.

Status: partly built. Fill from rendered values is built (`fill.mjs`, sixteen `lib/fill-*.mjs` modules, proved against a built Eye Care surface with its tree withheld, §5 stage 4); the skeleton writer is built (`skeleton.mjs`, `lib/skeleton-*.mjs`, `check-refs.mjs`, `origin.mjs`); reading values from the draft's code is not built (FR-48-8).

### FR-48-6 -- Skeleton rules

The skeleton writer applies these rules before any value is filled; each is a rule in `lib/skeleton-propose.mjs` or `lib/skeleton-classify.mjs` with a test that fails without it.
1. **Marquee.** A repeated-item strip whose recorded motion is an infinite translate loop (the loop record in `animations.json` plus `document.getAnimations()` on the rendered strip) becomes `sgs/trust-bar` carrying a `marquee` layer in its Effects value, never `sgs/text`.
2. **Pill call to action.** An `<a>` whose children are its label and an arrow icon becomes one button or link block holding both, never a container holding only the arrow.
3. **Navigation.** Header navigation links become the navigation block the surface kind calls for (menu or mega-menu trigger), never buttons.
4. **Link lists.** A link list's identity is the `sc-for` loop's parent element, never its first link.
5. **No dropped elements.** A trust bar, a rating badge and a cart trigger in the draft each get a node.
6. **Site name.** A typed brand name is the logo block reading Site Info, never a value taken from saved decisions. Done when: the Mama's footer and Indus header skeletons come out with a trust bar, a single pill CTA, navigation links, a link list keyed on its parent and nodes for the badge and cart, and each rule's test fails with the rule removed. Status (2026-10-13): rules 1 to 4 are built as standing rules (below): 1 is `marquee` (logos make `sgs/brand-strip` with scrolling, labels a scrolling `sgs/trust-bar`; read from the motion inventory's loop record, never a name), 2 is `pillButton`, 3 is `navigation`, 4 is `listWrapper` (the loop's parent wrapper is the list). Rule 5 holds for the trust bar (`trustBar`); a rating badge and a cart trigger are not yet checked. Rule 6 is the existing typed-brand handling, unchanged. The Indus header's rows match Bean's approved outcomes; the Mama's footer has not been re-run (its open faults are in `.claude/plans/archive/2026-10-04-spec47-full-coverage.md` R2).

Rules from Bean's review of 2026-10-13 (framework-wide; each a verdict in `lib/skeleton-rules.mjs` switched on by its entry, with its patterns, blocks and reason, in `data/skeleton-decisions.json` `rules`; precedence: a client decision, then these rules, then a finaliser pick or a standing element decision, then the scoring; each settled row names its rule):
- No core block that has an SGS replacement unless `rules.coreExceptions` names it with a reason (`lib/skeleton-classify.mjs::sgsOnly`, from `blocks.replaces`); `core/list` and `core/list-item` are replaced by `sgs/icon-list` (`plugins/sgs-blocks/scripts/data/block-replacements.json`, migrator `migrate-core-blocks/pairings/list_pairing.py`).
- A lone link is `sgs/button`; a lone tel:, mailto: or maps link is a button whose link source reads Site Info (`siteInfoLink`); a link or button holding one label and an icon is one button, its glyph the button's icon (`pillButton`); a link holding two or more pieces of text or a heading is a container whose whole box is the link (`wholeCardLink`), its first plain text the card's heading (`cardTitle`). The bold, larger first text of any card, a link or not, that is not a bare number is `sgs/heading` (`cardHeading`, Bean 2026-10-19).
- Media: an image is `sgs/media`, as is an image placeholder element such as `<image-slot>` (`mediaElement`); an empty floating ring is `sgs/decorative-image` (`decorativeShape`); links each holding one image are `sgs/gallery` (`logoGrid`); a `<brand-logo>` element is the logo block (`logoElement`) and the link around it goes (`homeLink`).
- A glyph alone, from any library, an emoji alone or a glyph the draft injects from a script value, is `sgs/icon` (`solitaryIcon`); an emoji in running text stays text.
- Element map: headings keep their level; kickers, eyebrows and pills are `sgs/label` (`label`), except the first text of a column directly in a header or footer row, which is `sgs/heading` (`columnHeading`); `<details>` is `sgs/accordion-item` and `<hr>` `sgs/separator` (the database's tag map, `atomic-tag-map.json`); an embedded map is `sgs/business-info`'s map display (`mapEmbed`).
- Wrappers a block provides go: a centring width wrapper inside a header, footer, row or section block (`widthWrapper`; a centred grid directly under a section root is its row), a bare wrapper of one list (`listWrapper`; a grid of links each with a marker dot is a list), a wrapper whose only declared styles align or space its content (`alignWrapper`; anything that paints, positions or lays out stays), the frame that only clips and fades a marquee track (`marqueeFrame`; its mask is the marquee effect's `edgeFade` parameter). A block that draws its children absorbs them as rows (a leaf, a block with an array item schema, or `rules.drawsChildren`: business-info, nav-bar-menu, nav-drawer-menu).
- Business details are `sgs/business-info`: a typed phone number or email address (`siteInfoPatterns`), a live open or closed line (`openStatus`), an hours row (`hoursRows`).
- Recognised structures: a top bar above the header is `sgs/site-header-row`, a menu panel `sgs/mega-panel`, a drawer `sgs/nav-drawer` (`surfaceRoot`); header navigation is `sgs/nav-bar-menu` and drawer navigation `sgs/nav-drawer-menu` (`navigation`); a page's first section holding its h1 is `sgs/hero`, split when it holds an image, its wrappers removed and its image its own media (`hero`, `heroInner`); a page's own section that is a row of short labels side by side, at least one naming a trust-bar capability the database records (accreditation, certification, halal), is `sgs/trust-bar` (`trustBar`; a section block, `container_kind` section, so the same badges inside a section are `sgs/label` blocks in a row, Bean 2026-10-13; hours rows, numbered steps and plain tags are never a trust bar); inside a hero a row of items side by side stays a row; a strip whose own animation loops a translate for ever is a marquee (`marquee`). Timeline, card grid and info box are not yet recognised (their rows come to Bean as scored proposals).
- A surface the client already built as a post follows that post: `sites/<client>/build/skeleton/built-surfaces.json` names it, and every row of the surface is settled by it (`clientBuiltSurface`).
- Decoration: an empty glow, gradient or fill layer folds into the background (`decorationLayer`); a typed divider is the row's separators setting (`typedDivider`); the Floating UI reading progress bar is a site setting (`readingProgress`); a placeholder photography credit is a brief-only line.
- Links: a back-to-top control has the link source `top` (`backToTop`).
- Forms (Bean, 2026-10-19): an `<input>`, `<select>`, `<sc-raw-select>` or `<textarea>` is the `sgs/form-field-*` block for its rendered type (a required checkbox with no other checkbox in its group, read from the rendered attribute or the template's own `required="{{ true }}"`, is `sgs/form-field-consent`; a type with no field of its own, or one the render left bound, is `sgs/form-field-text`; submit, reset and image inputs are not fields); its label, required marker and hint are removed and their words become the block's `label`, `required` and `helpText`, a character count is drawn by the block, and a `<label>` wrapped round it is unwrapped (`formControl`). Text beside a hidden input, and a heading, are never field text.
- Markers (Bean, 2026-10-19): an empty dot (at most 12px square) or short bar (at most 3px tall, 40px wide) in the flow, which is no control (no button, link, label, role or click handler) and has text beside it, is the marker of the block holding the text, a label's dot, a list item's marker or a row's separator, and is removed; stacked rows of a marker and one piece of text are one list (`dotMarker`, `skeleton-rules.mjs::isMarker`, read by `skeleton-propose.mjs`'s list units).
- The review groups skeleton rows by cause (FR-48-17, `lib/intake-review.mjs::byCause`).

Refusals (QC councils of 2026-10-13 and 2026-10-19, each with a test; the second measured the three new rules on the bakery client's saved inventories: `dotMarker` had removed a review carousel's pagination buttons): a link with no words or two logos is never a pill (a home link around logos is unwrapped); a toggle or slider arrow is never a pill; a control the visitor operates (a button, a click handler, a pressed or expanded state) and a bare number are never a label, heading or card title; a card link ending in a short call to action is a plain card whose action is the button holding the link (`cardAction`, Bean's ruling); a second open-status line within the same block joins the first display; a child carrying its own client decision that a block absorbs is flagged `stale`, never dropped; a surface the run failed to read keeps its failed entry (never refilled from an older saved inventory); a failed end-of-run refresh adds a `skeleton-refresh` gap row.

Status: built 2026-10-13 (`lib/skeleton-rules.mjs`, `lib/skeleton-rerun.mjs`, `intake.mjs --rerun-skeletons`, `tests/skeleton-rules.test.mjs`: each rule MUST FAIL with its decisions entry removed, plus the refusals above). `node scripts/computed-route/check-approved.mjs <client> [--no-built]` measures the rules against the client's approved outcomes (block, action family and Bean's link rulings). `formControl`, `cardHeading` and `dotMarker` added 2026-10-19 from Bean's review. Measured offline on the 43 Indus surfaces with no finaliser picks: the 93 rows of Bean's review batches 1 to 5 that compare directly all match his approved outcome and the 75 rows of his built header, drawer and mega menus are settled by those posts (his outcomes: `sites/indus-foods/build/intake/approved-decisions.json`); with the built posts off the rules alone match 133 (`check-approved.mjs indus-foods`, exit 0 with the built posts). Open: without a built post, a mega panel's inner groups are proposed as `sgs/card-grid` (the first block the panel accepts), which draws its children, where Bean's posts use `sgs/mega-group` and `sgs/mega-aside` (24 of the 157 rows `--no-built` compares). `sgs/icon-list` has no grid layout setting (row-first columns, as the Indus footer's two-column link list) and no `start`, `reversed` or letter and roman numbering (Wave-parity-1 in `feature-parity-exceptions.json`).

### FR-48-7 -- Code reader for skeletons

A narrow reader, run inside the sandboxed draft (Spec 48A FR-48A-10), writes skeleton parts mechanically for: layout forms (declared `display`, `repeat()`), shared `{{ }}` bindings (one shared setting per binding, §10 row 5), copy held in the logic's arrays (count-checked against the rendered items), page-map links (from the routing adapters, §9) and motion records (`animations.json`). It writes structure, identity and content only (R-47-10). It takes over a construct from the agent lane once its tree matches the agent's on every Indus surface for that construct; until then its tree is a cross-check reported beside the agent's. Done when: on every Indus surface the reader's tree and the agent's tree are diffed per construct, the diff is in the fill report, and a construct marked "taken over" has a zero diff on every surface.

Status: not built.

### FR-48-8 -- Declared values with a confirm record

Fill reads each element's declared value per width and state from the code (step 1) and keeps, for every value it writes, a confirm record: the declared value, the rendered value at 375, 768 and 1440, the tolerance used and the verdict. The record's fields and the tolerances per property type are FR-48-36 (§10); every read runs under the determinism harness (FR-48-28, §9). A prop variant's design is its default-prop render. A value whose code and render disagree is not written from the code: the render wins and the row is reported, except a draft defect (R-47-4, §9). Done when: `fill.mjs` on an Indus surface writes a confirm record for every written value; a planted code value that differs from its render beyond tolerance is reported and the rendered value written; a planted draft defect (a state rule whose value never paints) is built from the code and listed for Bean; each case fails with its check removed.

Status: partly built (2026-10-19, plan `.claude/plans/2026-10-19-fr48-8-declared-values.md`). Fill reads every longhand the draft's code declares on each target at 375, 768 and 1440 from Chrome's matched styles (`scripts/parity/lib/devtools.mjs::declaredValues` with every name; shorthands are read through their longhands and a CSS-wide keyword states the default), judges the ones beyond its own list too (`scripts/computed-route/lib/fill-declared.mjs`; on the Indus home page and header 59 such properties, among them `position`, `height`, `overflow`, `z-index`, `text-wrap`, per-corner radii and `cursor`), takes a used-value property (height, offsets, grid tracks) only from a plain declared value, and keeps a confirm record per written value and width (`lib/fill-confirm.mjs`, FR-48-36). `scripts/computed-route/tests/fill-declared.test.mjs` proves end to end that a code value its render overrides is written as rendered and reported `render-wins`, and that properties beyond the list are named from their declared values (14 of 14 mutations red). A council (2026-10-19) fixed: used-value properties already on Fill's list (`top`, `left`) were written from laid-out pixels and now take the declared value, with another declared form (a track list, `calc()`) named; a property the code declares at one width is now read at every read width (`lib/fill-declared.mjs::missingExtras`); `!important` inside cascade layers picked the wrong winner (`scripts/parity/lib/devtools.mjs::cascadeWinner`); a shorthand written with `var()` was judged as itself; every written value now has a record, a pseudo layer's from its layer and an unfound element's as `open`. Not built: the Indus surface proof of the done-when (with Indus step 20), writing the declared value where D–R agrees (the rendered value, equal within tolerance, is written today), and a draft defect built from the code (a state rule, written by the states wave, FR-48-81). A declared property no block setting holds is matched by what it does, not its name: `.claude/reports/2026-10-19-css-equivalence-audit.md` (86 properties; after Bean's five-test re-check, 12 real control gaps, each an FR marked not built in its owning spec and designed in `.claude/plans/2026-10-19-control-gaps-build.md`). Calibration reads every property the audit found a block default, the theme or a setting under another name paints (`scripts/computed-route/lib/calibrate-props.mjs::CAL_EXTRA_PROPS`, `scripts/computed-route/tests/calibrate-props.test.mjs`, 2026-10-19), so a draft value equal to that default is judged equal once a site is recalibrated; each calibration file carries the read list's key (`calibrate-props.mjs::READ_KEY`), so a changed list re-measures on every site (`scripts/computed-route/tests/cache.test.mjs`). Six Indus blocks recalibrated on `local-indus` turned 616 no-setting judgements of a draft value equal to their default into 616 equal ones (2026-10-19). Not built: the full recalibration of each client test site (after the control-gaps build and the gradient seeder fix, coverage plan Order item 2, d1), and the `property_equivalents` framework-DB table Bean approved (2026-10-19) for the three settings under another name that paint a different element or property (a child's `align-self` and `justify-self` as the parent's Align items and Justify items, a declared `height` as the min-height setting; plan step 5).

### 3.5 Divergence ledger (FR-47-5)

`sites/<client>/build/qa/divergences.json` is an array of entries:

`{ "id": "D-<n>", "scope": "<surface>|site", "node": "cr-ref-<surface>-<n>|<block slug>|*", "state": "<state>|*", "property": "<css property>", "pseudo": "::before|::after" (optional), "widths": [375, 768, 1440, 1920], "expected": { "value": "<css value>" } | { "rule": "<rule name>" }, "reason": "...", "register": ["<register item id>", ...], "decided": "YYYY-MM-DD <source>" }`

An entry matches a row on node, state, property, width and layer: an element's entry never covers its `::before` or `::after` rows, a layer's entry (`pseudo`) only those.

- **A value expectation:** the walker compares live with it instead of the draft: a drifted row's draft side is the plain decided value and every covered row carries `decided: { id, value }` (`scripts/parity/lib/divergences.mjs::judgeDivergence`; a rule entry's `decided.value` is what live shows). Solve and Fill write the decided value, never the draft's (§3.3).
- **A rule expectation:** the walker accepts the row. Fill writes nothing for that property and lists it in the report. Rule names are listed in `lib/ledger.mjs::RULES` with a one-line meaning each; an unknown rule name fails the run.
- **Stale entries:** an entry whose live value now equals the draft, or whose node no longer exists, is stale, and the run fails until it is removed.
- **Migration:** a walker config's `accept` entries with only `pair`, `key`, `kind`, `state` and `width` migrate one to one. Entries using `when` or `notPainted` (functions) stay in the config and are listed as unmigrated.
- **Accepting a row:** `node scripts/computed-route/ledger.mjs accept <report.json> <row id> --reason "..."` writes the entry with today's date; `report.md` prints each open row's id for this.
- **Register decisions:** every entry cites the fix-register items it implements (`register`); `lint.mjs --surfaces <surfaces.json>` checks the ledger against the register its `qa/ledger.config.json` names (`{ "register": "<path from the repo root>" }`, kept in the client's folder; `--register <file>` overrides) and fails an entry citing no item or an item the register lacks, a ledger with entries and no register, and a named register that does not exist. House-rule entries (`touch-target`, `accessibility`) cite none.
- **Independent check:** a site's `qa/independent-check.mjs` judges its differences through `lib/ledger.mjs::judgeIndependent` (matched on `node`); a value entry live has drifted from stays open, named by its id.
- **What belongs here.** A difference Bean decides that the draft can show is made in the draft instead (Spec 48A FR-48A-11 for a near-finished site), so the ledger holds the differences the draft cannot show and the house rules.

**Done when:** `node --test scripts/computed-route/tests/ledger.test.mjs` and `lint.test.mjs` pass, including a stale entry that must fail the run, an entry citing an item the register lacks, and a drifted value entry that stays open.

Status: built (`ledger.mjs`, `lib/ledger.mjs`, `scripts/parity/lib/divergences.mjs`).

### FR-48-9 -- Path-scoped entries

An entry may name one element path inside its node (`"path": "<selector path from the node>"`, as calibration and the walker's `path` give it), so one of several same-property rows on a node can be accepted alone. An entry without `path` keeps covering every row on the node. `lib/ledger.mjs::match`, the lint and the walker's matcher read the new field; existing entries need no change. Done when: `ledger.test.mjs` accepts one of two same-property rows on a node by path and leaves the other open, and an entry with a path that matches no element is stale.

Status: not built (`lib/ledger.mjs::match` matches on node, state, pseudo, property and width only).

### 3.6 Walker: `scripts/parity/` (FR-47-6)

The walker compares the built surface with the draft and is the closing comparison (FP-11). It stays a standalone tool with no route import. Each item is proven with a planted fault before it counts (`scripts/parity/GAP-CHECKLIST.md` §11); GAP-CHECKLIST is the proof log, and the requirements live here. Pairing is by draft identity first (item 19); word pairing is the cross-check.
1. **Pseudo-element paint:** each painting `::before` and `::after` layer's computed paint (`collect.mjs::PSEUDO_PROPS`), compared layer by layer; a layer on one side only is one `content` row (built, GAP-CHECKLIST §19).
2. **1920** in every standard run (built, GAP-CHECKLIST §22: `draft-live-walk.mjs`'s width default, with `benchmark/score.mjs`'s own fallback aligned; `solve.mjs` passes all four widths).
3. **States:** hover, focus and active on every interactive element of a compared region, not only configured pairs. Hover is built: ref-traced walks force `:hover` on every pair and its ancestors through the DevTools protocol (`devtools.mjs::forcedHover`), and a hover row is a difference in what hovering changes. **Focus and active on every interactive element: built** (GAP-CHECKLIST §23): `devtools.mjs::forcedPseudo` generalises `forcedHover` and reads `:active` through the same protocol, `collect.mjs::ACTIVE_PROPS` names what it reads, `state-passes.mjs::activePass` covers configured pairs as `kind: 'active'`, and `auto-compare.mjs::compareInteractive` reads focus and active on every matched control of the automatic check, capped at 60 per state. Phones still skip focus and hover.
4. **Link coverage:** the same text sits inside a link on both sides. A text that is a link only in the draft may be a function limitation (the block has no link setting for that element: Missing setting), not a content fix. **Built** (GAP-CHECKLIST §24): `auto-collect.mjs` marks each word inside an `a[href]`, and `auto-compare.mjs::compareLinkCoverage` emits `kind: 'auto'` rows keyed `link-missing` or `link-extra`. The rows claim only that one side links the text; which of the two it is belongs to triage.
5. **Line counts** sampled during state transitions (header shrink and grow, drawer open). **Built** (GAP-CHECKLIST §25): `paint.mjs::lineRows` counts line boxes, `state-passes.mjs::sampleLines` runs from `onAction` at 30, 120, 250 and 450ms plus the settled value, and `compare.mjs::compareLines` emits `lines@<t>ms` and `lines`. Samples follow a click, tap or hover action, not a scroll, so a purely scroll-driven header shrink is not sampled.
6. **Divergence ledger:** a config may name one (`divergences: '<path>'`), and matching rows are accepted (built).
7. **Ref tracing:** when a config sets `refPrefix`, every style row carries (built):
   - `ref`: the measured live element's nearest ancestor-or-self class with that prefix;
   - `path`: its selector path from that element, as in §3.2.

   Without `refPrefix`, rows are unchanged.
8. **Flow position** (ref-traced walks): unanchored pairs in draft reading order are measured top to top from the pair before them, the first from the top of `<main>` (`compare-state.mjs::flowOffsets`); the identity transform matrix equals `none` (`compare.mjs::sameValue`). Built, GAP-CHECKLIST section 17.
9. **Solve modes:** `--lean` (only what a settings writer reads) and `--draft-cache` (the draft read once per run); `auto-collect.mjs` can tag each word with its element (`tagEls`) for block pairing (built).
10. **Settled reads:** a state is read once its finite animations finish (`devtools.mjs::settleAnimations`: a 900ms floor for what starts late without an animation, then `document.getAnimations()`, a 6s cap) (built). On a draft read under the determinism harness (FR-48-28) the floor and cap are virtual time: the harness advances its clock in fixed steps until the state settles, so a timer-driven or `requestAnimationFrame`-driven change still completes; the walker's wall-clock settle is not used there (not built).
11. **Declared values:** the declared value of every property the walker reads, beside the computed one, taken from the matched CSS rules (`devtools.mjs::declaredValues`) and from the runtime's compiled pseudo-rule sheet (the `style-hover` and `style-focus` rules), read through the runtime. It is the main input for the intent check that picks a fluid or track setting (FR-48-1), for `width` and `left`/`top` rows (§3.3), and for the declared-nothing case that feeds the paint check (item 19). Status: partly built: `devtools.mjs::declaredValues` reads the eight `DECLARED_PROPS` from matched rules; all properties and the pseudo-rule sheet are not built.
12. **Motion timings:** transition and animation duration, delay and easing as ordinary rows, compared as their sets of distinct values and skipped where nothing runs (built).
13. **Text-run rows:** a text run's rows are compared by the space between their line boxes (a `row-gap` row) (built).
14. **Diagram reads (built, GAP-CHECKLIST §27):**
    - A drawn line's `icon-stroke-width` and `icon-stroke-dasharray` are read from the same painted shape as `icon-stroke`.
    - `left`/`top` are read on absolutely or fixed positioned elements only. They are declared values (`DECLARED_PROPS`) that Solve writes only as declared (`solve.mjs::USED_VALUES`).
    - A rendered draft's dimension diagram is measured into `sgs/diagram-dimension` settings by `lib/fill-diagram.mjs::diagramGeometry`. Its line geometry has no `css_property`, so a Fill skeleton may carry it (R-47-10).
15. **Eager load before the resting read (not built).** Before the resting read, lazy images and deferred media are forced to load and decode (`img[loading]` set to `eager`, `decode()` awaited, then network idle and a settle delay), so a below-fold element is measured at its real size and never as absent or zero-size. It runs as a check on every walk. Done when a draft whose below-fold image paints only after scroll reports that image present at its real dimensions.
16. **Property-capture test (not built).** A walker test asserts that every `css_property` in the framework database's `property_suffixes`, except `width` and `height`, is captured by the walker's reads, so a property the database routes to a setting is never silently unread. Done when the test fails on a planted property the walker does not read.
17. **Breakpoint check and loaded fonts (not built).** Breakpoints come from the draft's logic (§3.4); a `sweep` run option reads the twelve widths from 360 to 1920 as a check, so a wrap that appears only between the three standard widths, or a threshold the logic does not state, is reported. The run records `document.fonts` status and origin, so a font that fell back to a system face is reported. Done when a planted wrap at 900px and a planted missing font file each produce a row.
18. **Motion libraries and WebGL (not built).** The motion technique is known from the handoff's reachable scripts (Spec 48A FR-48A-3) and the recorded calls (`trace-check.mjs`), so a draft that loads a JavaScript motion library (for example GSAP or Lenis) is named from the code. A WebGL `canvas` is detected by probing each `canvas` element's rendering context. Each produces a named report line, so the clone does not silently lack that effect. The route does not guess animation presets from CSS shape: it reads the recorded motion and measures timings (item 12). Done when a draft that loads a motion library and one with a WebGL canvas each produce a named report line. Recognising what the draft's own code does and mapping it to SGS block settings and Spec 38 effects is FR-48-77.
19. **Identity pairing, mispaired rows and the paint check (built 2026-10-10; GAP-CHECKLIST §8 and §28).** Identity is the primary pairing.
    - `pairs.mjs::identityPass` pairs each block in a surface's origin (`<surface>.origin.json`, from the skeleton writer or `origin.mjs`) by its `tpl` finder and cross-checks the word pairs against it.
    - A block whose hand pair disagrees is listed `mispaired`; every row of its pair is flagged and kept, and Solve never writes through it (`lib/solve-rows.mjs::writableGroups`, `classify`).
    - A hand pair measuring an element inside a block must measure a draft element inside that block's identity element (`lib/identity.mjs::innerVerdicts`); one on a block with no origin entry is listed `uncheckedHand`, never agreeing. An identity element whose tag is not the skeleton fingerprint's is not trusted (`tagMismatch`). Identity runs in every pairing state, adding blocks in the first only (`identityStates`), and live blocks with no origin entry are listed `unaligned` in `qa/pairs/<surface>.json`.
    - `scripts/parity/lib/neutralise.mjs` sets the draft value of each differing layout property (display, gaps, alignment, text-align) on the live element in the open page and records `inert`, `breaks-box` or `moves`. `compare.mjs::isAccepted` accepts `inert`, and `breaks-box` while the pair's box matches and every pair measured inside it is settled (`compare.mjs::holdEquivalent`); a matching box alone accepts nothing. Rows derived from the draft's code pass through the same check (R-48-1).
    - Underline rows carry the decorated element's path (`decoPath`, `paint.mjs::decoratedElement`).

Items 10 to 13 and the built parts of 1 and 3 are proven in headless Chromium on local pages (`tests/walker-devtools.test.mjs`) and on About (measure-only on the local mirror: no false rows after the animation-timing rule; 1 real open issue).

**Done when:** each built item has a GAP-CHECKLIST section with its planted fault turning red and each not-built item (15 to 18) meets its own done line. `node scripts/parity/benchmark.mjs --noise` still catches 5 of 5 with no new noise rows.

Status: partly built: items 1 to 10, 12 to 14 and 19 built; item 11 partly built; items 15 to 18 not built (no eager load, `property_suffixes` test, font record or WebGL probe in `scripts/parity/lib/`).

### FR-48-10 -- Identity pairing fixes

1. A link list pairs on its `sc-for` loop's parent element, not on its first link.
2. An identity pair is never refused by a word-based width check; word pairing only cross-checks identity pairs and never removes one.
3. Identity stamps are re-derived for each export at intake; an origin file from an earlier export is refused when its draft hash differs from the current `MANIFEST.json`. Done when: re-pairing the Eye Care footer and header keeps the link-list identity on the list and the header's root pair, and a stale origin file is refused; each case fails with its fix removed. Status: not built (the footer and header re-pairing defects recorded in `.claude/LEDGER.md`).

### FR-48-11 -- Content and link rows are writable

`scripts/parity/lib/ref-trace.mjs::stampRefs` stamps `ref` and `path` on content rows (text, presence, link coverage) as it does on style rows, and `scripts/parity/lib/auto-collect.mjs` stores each linked word's `href`, with page-map links resolved from the routing adapters (§9). A presence row for an element missing from the live page then resolves through the pair's configured `ref`, and a `link-missing` row through the link setting with the draft's href. Done when: a Solve test writes a presence setting for an element present only in the draft and a link setting for a `link-missing` row, and both fail with the stamping removed.

Status: not built (`stampRefs` covers style, hover, box, tag, active and lines only; `auto-collect.mjs` records `lk: true` for a linked word, not its href).

### FR-48-12 -- Walker gates and blank draft sides

1. `node scripts/parity/draft-live-walk.mjs <walkerFull> --lint` runs over every surface's generated config as a route gate before Solve or Fill walks it, and a lint problem stops the run.
2. A row whose draft side is blank is classified by the draft's `sc-if` branches: a branch the walk did not reach is an unwalked state (§3.7); an element no branch renders is absent. Neither is written.
3. An element whose declared value is nothing for a property (declared-nothing) goes to the paint check (item 19) before any write. Done when: a surface with a planted lint fault stops before the walk; a planted unwalked `sc-if` branch is reported as an unwalked state, not a gap; each fails with its rule removed. Status: not built (`--lint` exists on `draft-live-walk.mjs` but no route command runs it as a gate).

### 3.7 Functional flows and states (FR-47-7)

Behaviour the walker cannot see is tested by scripted flows in `scripts/parity/flows/`, one script per flow, reported separately from parity rows. The flow list comes from the draft's logic and `surfaces.json`: form steps and submission, the basket, filters, and any other handler that changes a main flow (buy, contact, apply). Eye Care's existing flows are `bag-two-products.mjs`, `bag-second-unit.mjs`, `filter-apply-clear.mjs`, `lens-skip-to-bag.mjs` and `toast-added-to-bag.mjs`, run together by `run-all.mjs`; Eye Care's own flow work lives in its plan.

Every row measured in a state no setting state maps to is reported in that surface's UNMAPPED list with the state named, never classed as a gap.

**Done when:** each flow passes on its client's test site after its fix, and fails against the bug it was written for (for Eye Care, the register's N11 and N25).

Status: built for Eye Care (`scripts/parity/flows/*.mjs`); flows from a draft's logic not built.

### FR-48-13 -- State map generated from the draft

Each surface's state map (which walker state maps to which setting state, and how to reach it) is generated from the draft's state inventory: `surfaces.json` re-derived at intake (Spec 48A FR-48A-7) and every `sc-if` in the template. Every `sc-if` is mapped to a reachable state or listed as a gap row naming the condition; a click path to reach the state is optional, and a state with none is reached by setting the logic's state directly. The generated map is diffed against `scripts/parity/flows/state-map-reasons.json`, and a walker-state group carrying a conflict the map cannot express is refused by a guard in `lib/solve-rows.mjs`. Done when: generating the map for an Indus surface reaches every `sc-if` or lists it; a planted `sc-if` with no state is listed; a group named in `state-map-reasons.json` is refused by Solve; each fails with its rule removed.

Status: not built (state maps are hand-written per surface).

### 3.8 Canvas awareness: `lib/resolve.mjs` and `lib/triage.mjs` (FR-47-8)

A mega menu, a modal, a drawer and a choice flow are empty canvases held in their own post and composed by the author from whatever blocks suit. On such a surface, "the block this element belongs to declares no setting for this property" says nothing about whether the value can be set: the author is expected to reach for a block that can hold it. A route that asks the attributed block and nothing else reports a framework gap where the framework works as designed.

- **The manifest marks a canvas.** `surfaces.json` carries `canvas: true` per surface (§2), derived from the surface's post type, so a new canvas kind needs no code change. Every CPT surface and every theme page template is a canvas, header and footer included (Bean, 2026-10-05); ordinary pages are not.
- **The resolver** (`lib/resolve.mjs::resolveViaAncestor`) hops to an ancestor block in the same canvas tree, and to a setting arriving by block context (`providesContext` / `usesContext`), **ordered strictly after** a direct match and a calibration `reaches` tie, so a row that resolves today keeps resolving. The hop may **explain** a row; it **writes** a parent attribute only where that attribute's paint reaches exactly one measured descendant, or under FR-48-14. Otherwise the write belongs on the child (R-47-5). Solve (`solve.mjs::writeRound`) and triage (`lib/triage.mjs`, the hop `ctx.ancestorHop`) both call it.
- **Triage** (`lib/triage.mjs`) refuses **F** when any block already in the canvas declares the property, and cites the block and attribute. This is a classification, not a write path: the route cannot decide which sibling should own the value.
- **A `canvas-settable` row closes nothing by itself.** It is a claim with a citation, and the citation is tested on the live site before the row is called resolved: `confirm-canvas.mjs` enumerates every stylesheet rule that could govern the property on the row's element, and its committed result (`sites/<client>/build/qa/canvas-confirm.json`) feeds `lib/triage.mjs::measuredReachFrom` -> `ctx.measuredReach`, which decides a citation before the source gate's deliberate fail-open. A refuted citation makes `canvasSettable` cite the NEXT block on the page that declares the property, so after a sweep `confirm-canvas.mjs --candidates` measures every family `canvasSettable` could cite for any issue of any canvas surface (`confirm-canvas.mjs::candidatesFrom`), in one pass.

**Done when:** a draft padding row on an `sgs/mega-group` inside a mega-menu canvas whose `sgs/mega-panel` ancestor declares a padding box family classes `canvas-settable` citing that ancestor's attribute, and the same row classes a framework gap with the rule disabled (the negative control).

Status: built (`lib/resolve.mjs::resolveViaAncestor`, `lib/triage.mjs`, `confirm-canvas.mjs`).

### FR-48-14 -- Parent writes over one loop body

The ancestor hop may also write a parent attribute whose paint reaches several measured descendants when every reached descendant is a copy of one `sc-for` loop body and the property is static in that body (the draft's code gives the same value in every copy). Loop membership comes from the runtime's identity (R-47-4), never from matching words. Any reached descendant outside the loop, or a value that varies across copies, keeps the write on the child. Done when: the mega-panel tiles on a mega-menu surface (one loop) get one parent write, and a planted tile outside the loop, or a tile with a different value, keeps the writes on the children; each fails with the loop check removed.

Status: not built (`lib/resolve.mjs::reachedDescendants` permits a write only when exactly one descendant is reached).

### FR-48-15 -- `canvasSettable` needs an emission check

`solve.mjs::writeRound` sets `canvasSettable` from the hop's citation only when the cited attribute is shown to emit CSS on the cited element: by its calibration (`slots` or `reaches`) or by `confirm-canvas.mjs`'s measured reach. A citation with neither is reported as unconfirmed, not `canvas-settable`. Emission found by searching PHP source text is never enough on its own (§14 gate G5). Storing each attribute's emission selector in the framework database is the seeder's half (§16). Done when: a planted citation of an attribute that emits nothing on the element is reported unconfirmed, and fails as `canvas-settable` with the check removed.

Status: not built.

### 3.9 Social and contact rows (FR-47-9)

A draft's row of social or contact icons (Instagram, Google reviews, WhatsApp, phone, email, map) must reach the built page as Site Info-bound icons, never as addresses typed into the tree. Site Info is the site's stored business details (`Sgs_Site_Info`, option `sgs_site_info`): the client changes one setting and every icon follows. Ordinary icons, buttons and links are not touched: a Site Info icon is one the skeleton author makes on purpose (an `sgs/icon` with `iconSource: "brand"`, or a row below). Fill never infers one from an address, because a share button, a blog's Instagram photo and a Maps link look alike (FP-9 forbids a per-block carve-out; a wrong guess is silent).

- **The icon keeps both addresses (Bean, 2026-10-09).** On a Site Info-bound `sgs/icon` the draft's address stays in `linkUrl` as the fallback. The page shows the Site Info link when it makes one, else the fallback, and hides the icon only when neither gives a link; `linkSource: "custom"` makes the typed link win even when Site Info holds another (`plugins/sgs-blocks/src/blocks/icon/render.php`, `includes/helpers-icon.php::sgs_icon_resolve_bound_link`). The icon's root carries `data-sgs-site-info-key` so the walker can tell the address came from Site Info.
- **Fill reports the address for Site Info.** `lib/fill-presence.mjs::linkDecisions` keeps writing the draft address to a setting bound to Site Info (`metadata.bindings.<attr>`, source `sgs/site-info`) and returns a `handover` row; `lib/fill-resolve.mjs::fillContent` turns it into a `site-info` handover entry carrying the Site Info key and the draft address. An unbound node gets its link and no entry.
- **One skeleton node builds the row.** A skeleton `sgs/social-icons` node may carry the Fill-only keys `siteInfoRow` (brand slugs from `plugins/sgs-blocks/includes/data/brand-registry.json`, in that order; absent = every registry brand), `childAttributes` (merged into each generated child) and `childRefs` (`{slug: selector}`, so a child can read its draft address). `lib/fill-skeleton.mjs::expandSiteInfoRows` expands it into `sgs/icon` children with `iconSource: "brand"`, `brandName`, and the binding whose key is the registry's `siteInfoKey`; `cleanTree` strips the keys, `skeletonProblems` rejects an unknown or duplicate slug. The platform-to-key map is the registry, read by `lib/brand-registry.mjs`; the route holds no table of its own (FP-1).
- **The lint rejects the leak.** `lint.mjs::lintSkeleton` fails an `sgs/icon` with `iconSource: "brand"` that types its own brand's address and has no Site Info binding. It checks brand icons only. A brand owns `tel:` (phone), `mailto:` (email) and a whole host of the form `<slug or key name>.<tld>` or a subdomain of it, so `instagram.com.evil.example` is not Instagram. `wa.me`, `youtu.be`, `g.page` and country second-level domains are not derivable from the registry and are not recognised (§7).
- **Filling Site Info from the draft.** `plugins/sgs-blocks/scripts/provision-site-info-from-draft.py` reads a surface's `handover.json` and fills only EMPTY Site Info keys (never overwrites), skips placeholders (`example.com`, `yourpage`, a bare network host, non-web schemes) and conflicting addresses, shows a dry-run table first, and with `--apply` backs up the whole option (md5), writes through `Sgs_Site_Info::set()` and reads back. Its first real run is a dry run in stage 2 (§12), with the table shown to Bean before any `--apply`.
- **The walker understands it.** `scripts/parity/lib/links.mjs::compareLinks` reports a draft link whose live counterpart carries `data-sgs-site-info-key` and a different address as a pre-accepted `handover` note, not an `href` mismatch; a draft link with no live link of that text is still `missing`.

**Done when:** `node --test "scripts/computed-route/tests/fill-site-info.test.mjs" "scripts/computed-route/tests/fill-site-rows.test.mjs" "scripts/computed-route/tests/lint.test.mjs" "scripts/parity/tests/links.test.mjs"` and `python -m pytest scripts/tests/test_provision_site_info_from_draft.py` pass. The cases that must fail are an unbound node getting a handover entry, a brand icon typing its own address with no binding passing the lint, `instagram.com.evil.example` counting as Instagram, a filled Site Info key being overwritten, and a placeholder address being written. The expanded footer and drawer rows match `sites/eye-care-ward-end/build/footer.tree.json` and `mobile-menu.tree.json` child for child.

Status: built (`lib/fill-skeleton.mjs::expandSiteInfoRows`, `lib/brand-registry.mjs`, `lint.mjs::lintSkeleton`, `provision-site-info-from-draft.py`); the provisioning script has run only against test data.

Intake proposes the business details the draft's code states as Site Info values, validated by shape, for Bean's batched review (FR-48-32, §9); the confirmed set is applied by `provision-site-info-from-draft.py` (FR-48-59).

## 4. Files

All in `scripts/computed-route/`. The README lists every file and every exported function (R-47-1); the lint fails on a file or export missing from it. The table names each file's job and the section that governs it; the README is the full function index.

| File | Job | Governed by |
|---|---|---|
| `README.md` | Purpose, file index, function index, imports, what the route never touches | R-47-1 |
| `lint.mjs` | README index, no style values in skeletons, no `style` or `native_wp` writes, no imports from `plugins/sgs-blocks/scripts/`, `--surfaces` checks, the brand-address leak | R-47-1, R-47-10, §3.9 |
| `handoff-check.mjs`, `lib/handoff.mjs` | Checks a handoff folder: required and allowed files, reachability, manifest, runtime, schemas, README headings | Spec 48A FR-48A-2 to -8 |
| `lib/svg-screen.mjs` | Namespace-aware screen of every SVG under `assets/` (`svgProblem`) | Spec 48A FR-48A-10 |
| `lib/runtime-probe.mjs`, `data/known-runtimes.json`, `data/runtime-probe.dc.html`, `data/runtime-probe.expected.json`, `data/runtimes/` | Known `support.js` builds and the probe that admits a new one | Spec 48A FR-48A-5 |
| `trace-check.mjs` | Cross-checks `animations.json` against the motion recorded on a running draft (`--shift=7` negative control) | Spec 48A FR-48A-7 |
| `lib/draft.mjs` | Serves a local draft folder on 127.0.0.1 at an ephemeral port, shut down at exit (`serveDraft`) | §2, Spec 48A FR-48A-10 |
| `lib/db.mjs` | Read-only `block_attributes` queries | R-47-2 |
| `lib/brand-registry.mjs` | Reads `plugins/sgs-blocks/includes/data/brand-registry.json` for the social-row expansion and the lint | §3.9 |
| `calibrate.mjs`, `lib/calibrate.mjs`, `lib/calibrate-props.mjs`, `lib/calibrate-markers.mjs`, `lib/calibrate-instances.mjs`, `lib/calibrate-read.mjs`, `lib/calibrate-content.mjs`, `lib/calibrate-chunk.mjs`, `lib/calibrate-container.mjs` | Calibration command and library | §3.2 |
| `lib/cache.mjs`, `lib/deploy-hash.mjs`, `lib/calibration-lock.mjs` | Cache keys and skip rules, the deploy hash, the per-site lock | §3.2, R-47-11 |
| `calibration-targets.json`, `calibration-fixtures.json`, `cache/` | Calibration posts per site; fixture content per block; the cache (gitignored) | §3.2 |
| `lib/resolve.mjs` | The one property-to-setting engine, with the canvas hop | §3.1, §3.8 |
| `lib/normalise.mjs` | Value normalisation and token snapping from `theme-snapshot.json`, with the snap log | R-47-7 |
| `lib/tree.mjs` | Read, write and merge trees; ref classes (`stripRefs` for a final build); per-tier values; R-47-11 target checks | R-47-11 |
| `lib/references.mjs` | Blocks that print another post (linked placeholders, frames) | §2 |
| `ledger.mjs`, `lib/ledger.mjs` | Ledger command (`accept`, `stale`) and library (`RULES`, match, stale, `judgeIndependent`) | §3.5 |
| `skeleton.mjs`, `lib/skeleton-inventory.mjs`, `lib/skeleton-model.mjs`, `lib/skeleton-facts.mjs`, `lib/skeleton-classify.mjs`, `lib/skeleton-propose.mjs`, `lib/skeleton-review.mjs`, `lib/skeleton-finalise.mjs`, `data/skeleton-decisions.json`, `prompts/skeleton-finaliser.md` | Skeleton writer: inventory, proposal, finaliser brief, review, saved decisions | §3.4 |
| `check-refs.mjs` | Resolves every finder of a skeleton on the draft; fails on a miss or an ambiguous match | §3.4 |
| `fill.mjs`, `lib/fill-config.mjs`, `lib/fill-diagram.mjs`, `lib/fill-entrance.mjs`, `lib/fill-motion.mjs`, `lib/motion-layers.mjs`, `lib/motion-tokens.mjs`, `lib/motion-db.mjs`, `lib/fill-fixture.mjs`, `lib/fill-handover.mjs`, `lib/fill-page.mjs`, `lib/fill-presence.mjs`, `lib/fill-prop.mjs`, `lib/fill-read.mjs`, `lib/fill-report.mjs`, `lib/fill-resolve.mjs`, `lib/fill-row-lift.mjs`, `lib/fill-skeleton.mjs`, `lib/fill-spacing.mjs`, `lib/fill-unread.mjs`, `lib/fill-values.mjs`, `lib/entrance.mjs` | Fill command and its sixteen modules, plus the entrance sampler reader | §3.4, §3.9 |
| `solve.mjs`, `lib/solve-rows.mjs`, `lib/solve-report.mjs`, `lib/solve-groups.mjs`, `lib/winning-rule.mjs`, `lib/guard.mjs` | Solve command; its reading of a walker report (open rows, writable groups, draft values, regressions, classification, content targets, handover), report, issue and cause views, each Hardcode row's winning rule, and the guard | §3.3 |
| `trial.mjs`, `lib/trial.mjs`, `lib/trial-page.mjs`, `lib/trial-run.mjs` | Try before write and its replay command | R-47-9, §3.3 |
| `lib/issue-classes.mjs` | Shared class and handover-owner names (`HANDOVER_OWNERS`) | §3.3 |
| `pairs.mjs`, `lib/pairs.mjs`, `lib/pairs-page.mjs`, `lib/pair-scope.mjs`, `origin.mjs`, `lib/identity.mjs` | Generated walker configs, identity pairing, origin files | §3.6 item 19 |
| `confirm-canvas.mjs` | Measures whether a `canvas-settable` citation's rules reach the element | §3.8 |
| `sweep.mjs`, `lib/sweep.mjs` | Every surface's newest Solve report as one row per distinct open issue | §14 |
| `triage.mjs`, `lib/triage.mjs`, `lib/triage-source.mjs` | A candidate class (W, F, T, U, L) with evidence per open issue, including the `includes/` helpers a block's render reaches | §3.8, §14 |
| `answer-sheet.mjs`, `lib/answer-sheet.mjs` | Scores the route against a frozen hand-labelled answer sheet, with a baseline ratchet | §15 |
| `register-sweep.mjs`, `lib/register-sweep.mjs` | Eye Care's fix-register bundling for the sweep's status agents (a client tool, indexed; no requirement here) | none |
| `handoff-repackage.mjs` | Brings an export made before `MANIFEST.json` to the Spec 48A format after proving every file against its old `MANIFEST.md` hash | Spec 48A FR-48A-1 |
| `stage0.mjs`, `lib/stage0.mjs`, `data/calibration-baseline.schema.json` | Stage 0: the handoff check, the fixed block set, slot-map-only recalibration of stale blocks, `calibration-baseline.json` | FR-48-3, FR-48-16 |
| `split-cache.mjs` | One-off, idempotent split of pre-§3.2 cache files into slot map and per-site default paint, and mirror paint moved to its test site's folder | §3.2 |
| `lib/calibration-refs.mjs`, `fixture-refs.mjs`, `lib/fixture-refs.mjs` | Fixture tokens resolved per calibration target, the existence guard, and the detector proving no bare site ID remains in a fixture (run by `lint.mjs`) | §3.2 |
| `provision-calibration-refs.mjs`, `lib/provision-refs.mjs` | Creates a test site's calibration menu, panel, drawer and media and writes their IDs to its `refs` | §3.2, Appendix A step 13 |
| `tests/` | `node --test "scripts/computed-route/tests/*.test.mjs"` (Node 24 runs a glob, not a bare folder); each file names the rule it proves and has one case that must fail. `tests/check-lane-collisions.mjs` is a parallel-lane process gate, not route behaviour | all |
| `intake.mjs`, `lib/intake-run.mjs`, `lib/intake-run-worker.mjs`, `lib/intake-run-stages.mjs`, `lib/intake-run-defects.mjs`, `lib/intake-run-collapse.mjs`, `lib/intake-run-finalise.mjs`, `lib/intake-review.mjs` | The intake command and Bean's review: every stage in FR-48-17's order in a secret-free worker, `intake.json`, `review.md`, `page-map.json`, `--finalise`, `--apply-picks`, `--render`, `--apply-review` | §8 FR-48-17, FR-48-35, §3.4 steps 3 and 4 |
| `lib/intake-sandbox.mjs`, `lib/intake-record.mjs`, `lib/intake-process.mjs`, `lib/intake-prose.mjs` | Running a draft safely: the trap-proxy sandbox, the replay file, the secret-free worker, command-like prose | FR-48-23 |
| `lib/intake-harness.mjs`, `lib/intake-harness-page.mjs`, `lib/intake-reading.mjs`, `data/reading.schema.json` | The determinism harness and reading records | FR-48-28 |
| `lib/intake-census.mjs`, `lib/intake-census-template.mjs`, `lib/intake-census-logic.mjs`, `lib/intake-census-runtime.mjs`, `lib/intake-census-trace.mjs`, `lib/intake-census-map.mjs`, `lib/intake-registry.mjs`, `data/construct-registry.json`, `data/construct-registry.schema.json` | The construct census (static and runtime passes) and its registry | FR-48-24 |
| `lib/intake-ast.mjs`, `lib/intake-ast-eval.mjs`, `lib/intake-routing.mjs`, `lib/intake-breakpoints.mjs`, `lib/intake-pagemap.mjs`, `lib/intake-pagemap-surfaces.mjs`, `data/page-map.schema.json`, `data/intake.schema.json`, `lib/intake-spec-sync.mjs` | Draft code reading, routing adapters, width basis, the page map, and the Appendix C schemas with the test that keeps them equal to the spec | FR-48-26, FR-48-27, FR-48-30, FR-48-35, Appendix C |
| `lib/tokens.mjs`, `lib/intake-palette.mjs` | Declared tokens with no render, and the palette role proposal | FR-48-31 |
| `lib/intake-siteinfo.mjs`, `lib/intake-siteinfo-shape.mjs`, `lib/intake-flags.mjs` | The Site Info proposal and the placeholder, stock and prototype-only flags | FR-48-32, FR-48-33 |
| `lib/intake-defects.mjs`, `lib/intake-defects-binding.mjs`, `lib/intake-defects-keys.mjs`, `lib/intake-defects-force.mjs`, `lib/intake-defects-static.mjs`, `lib/intake-missing.mjs`, `lib/intake-state.mjs`, `lib/intake-skeletons.mjs` | Draft defects, missing features, the shared draft-state helper, and the skeleton inventory and proposal per surface | FR-48-34, §3.4 steps 1 and 2 |
| `capabilities.mjs`, `lib/capabilities.mjs`, `data/capabilities.json` | The capability inventory: every framework capability (framework DB read-only, code) and everything a draft can hold (pinned web-platform packages); `--write`, `--check`, `--seed`, `--gaps`, `--gate` | §10 |
| `lib/clone-coverage.mjs`, `data/clone-coverage.json`, `data/clone-coverage.schema.json` | The clone coverage map and its gate: per capability its recognise, write and check references, Bean's exclusion, or a gap naming its wave | §10, FR-48-78 to FR-48-85 |
| `lib/intake-usage.mjs` | The usage read: every capability a draft uses, from its files, checked against what the running page shows | FR-48-34 |
| `tools/presentational-hints.mjs`, `data/presentational-hints.json` | The presentational attributes and the CSS each becomes, derived from the WHATWG Rendering section | FR-48-34, FR-48-79 |
| `package.json`, `package-lock.json` | The route's own pinned dependencies (`npm ci` in `scripts/computed-route`; `node_modules` is gitignored, so a fresh worktree runs it first) | FR-48-75 |
| Code readers (not built) | Declared values for every property, recorded motion, logic as data, the skeleton code reader | §3.4 FR-48-7, FR-48-8, §9 |
| Site-build script (not built) | Pages, CPT posts, menus, pointers and options from the confirmed page map | §12, R-48-2 |

Every built path above was listed with `ls scripts/computed-route scripts/computed-route/lib scripts/computed-route/data scripts/computed-route/prompts` on 2026-10-12.

External imports, read-only:
- `scripts/parity/lib/*.mjs` (finders, computed-style reading, `neutralise.mjs`, `divergences.mjs`, `links.mjs`);
- `scripts/wp-build-page.js` and `scripts/parity/draft-live-walk.mjs`, run as commands;
- third-party packages from the route's own `package.json` only (FR-48-75).

Nothing from `plugins/sgs-blocks/scripts/`. The Site Info provisioning script (`plugins/sgs-blocks/scripts/provision-site-info-from-draft.py`) and `provision-site-mail.py` are run as commands by the stages that use them, never imported.

Ref classes stay on built blocks: they carry no style and no client name. A site's final build may strip them with `lib/tree.mjs::stripRefs`, after which that surface's generated walker config no longer works.

### FR-48-75 -- The route's own pinned dependencies

`scripts/computed-route/package.json` and its lock file pin, at exact versions, every third-party package the route loads: Playwright (and the browser build it installs), Ajv 8 with `ajv-formats`, `saxes` and the JavaScript parser the census uses (FR-48-24). Route code imports them from `scripts/computed-route/node_modules` only. `lint.mjs` fails any route file that names `plugins/sgs-blocks/node_modules`, so a plugin dependency upgrade can never change what the route measures. Each calibration cache file and each intake record stores the Playwright and browser versions that produced it, and G0 (FR-48-64) treats a version change as stale. Done when: `npm ci` in `scripts/computed-route` installs the pinned set; a planted import from `plugins/sgs-blocks/node_modules` fails `lint.mjs`; a cache file whose recorded browser version differs from the installed one fails G0.

Status: built except G0's version check (2026-10-11). `scripts/computed-route/package.json` pins `playwright` 1.58.2, `ajv` 8.20.0, `ajv-formats` 2.1.1, `saxes` 6.0.0 and `@babel/parser` 7.29.9; route files import them by bare specifier; `lint.mjs::lintFolder` refuses any route file naming the plugin's `node_modules` (`tests/lint.test.mjs`, one MUST FAIL case); `calibrate.mjs` writes `playwrightVersion` and `browserVersion` into each cache file. G0 (FR-48-64) comparing them with the installed versions is not built.

## 5. Build order, proofs and residual

### 5.1 Built on Eye Care

1. **Foundations (built).** The resolver, normaliser, read-only database and ledger (FR-47-1, FR-47-5), plus walker items 6 and 7 (FR-47-6), with tests; the lint fails on a planted unlisted export. `benchmark.mjs --noise` scores 5 of 5 cases; its noise rows are phase artefacts, so a noise count is never compared across runs without pinning the phase.
2. **Footer proof (passed).** Solve (FR-47-3) on Eye Care's footer, with calibration (FR-47-2) of the blocks it uses.
   - **Baseline:** `sites/eye-care-ward-end/build/footer.tree.json` at commit `b7c09adc1`, built to `sgs_footer` 182 on eye-care-test and walked with `footer.mjs --headless --widths 375,768,1440,1920`. That `report.json` is the "before".
   - **Scored items** (setting values on blocks that already exist):
     - register items 25, 26, 28 and 38;
     - the spacing, size and tracking parts of 27 and 29: the top margins, the tagline margin, the social-row margin, the brand column gap, 11.5px, 0.2em, weight 400, line height 1.5, the 4px bottom margin and the 10px column gap.

     An item is closed when the rows for its elements read no open difference at all four widths. The block swaps in 27, 29 and 30 are outside the proof and must appear as Unresolved or Missing setting.
   - **Success** (Bean, 2026-10-03: Solve's job is to close what existing settings can close and to name what they cannot; a correctly named gap is a success, not a miss). All three hold:
     - At least 90% of scored items are handled: closed, or left open and correctly identified as a framework gap (classified Hardcode or Missing setting). Calling a fixable item a gap is a failure. Whether a gap is real is judged outside the tool, by the register or by proof (calibration, code), never by Solve's own label.
     - No row closed before is open after, and no open row moves further from the draft.
     - At most 10% of writes are wrong.

     Whether a gap gets the right type (Hardcode for a repair, Missing setting for a new control) is reported as a further measure, not a condition.
   - **Kill:** under 60% handled, over 10% of writes are wrong, or the third write round still writes. A round that only reverts regressions (R-47-9) is not a write round.
3. **Solve on every built Eye Care surface (built and in use).** All 17 surfaces have walker configs, score items, state maps and a pairing config; per-surface state is in `sites/eye-care-ward-end/build/qa/triage/*.json` and `.claude/plans/archive/2026-10-04-spec47-full-coverage.md`.
4. **Fill (proved on a built surface).** Fill is proved against a built surface with its committed tree withheld as the hand-checked answer. The demonstration on a genuinely unbuilt surface is the Indus clone.
5. **Route accuracy (built 2026-10-10).** The answer sheet, the element-ID skeleton writer, exact identity pairing, the paint check and try before write (route-accuracy phases R1 to R6, `.claude/plans/archive/2026-10-04-spec47-full-coverage.md`).

### 5.2 Next: the 48A exports

The second-draft proof is the clones of the Spec 48A exports, run through the client stages of §8: **Indus first** (pages, forms and form steps, the drawer and mega menus), **then Mama's Munches** (the first shop proof). Their test sites are `indus-test` and `mamas-test`. The first acceptance evidence comes from an export Spec 48A's B5 mirror has not touched (Indus or Mama's), so the route is never judged only on a draft edited to match its own output.

### 5.3 Bean rulings that govern this section

- A correctly named gap is a success, not a miss (Success above, 2026-10-03).
- Contact's subtext keeps its 22px margin (Bean, 2026-10-05), so the 375px name-field drop stays open (register CR15/N45b).
- A mobile tier that sets one side of a padding or margin box keeps the tablet tier's other sides (Bean); the shared builder `sgs_box_object_shorthand` stays byte-identical for border width and the `var()` holdouts (Spec 32 §6.1(a1)). The route's half: `lib/resolve.mjs::seedSides` seeds unset sides only for a border width; padding and margin boxes are written one side alone.
- Calibration reads presence, text and link for both the `content` and `text-content` roles (Bean, 2026-10-05, §3.2).
- Every CPT and every theme page template is a canvas (Bean, 2026-10-05, §3.8).
- The dark-mode toggle (CR12) is parked pending Bean: Eye Care cannot enable it as it stands, because the deriver refuses a palette whose lifted primary fails 4.5:1 against the inverse text. The ways forward are design calls recorded on the register row.
- Session D works the whole fix register, not Solve's score alone, in Solve-lane and Fix-lane rows (Bean, 2026-10-08; the plan).
- Accuracy by construction from stage 1, code to code with the render confirming, draft defects built from the code intent and listed, Indus first then Mama's (Bean, 2026-10-11; `.claude/reports/2026-10-11-spec48-gap-council/DESIGN.md` decisions 1, 2, 3 and 6).

### 5.4 Residual

Every open item from the gap-analysis council (`.claude/reports/2026-10-11-spec48-gap-council/REPORT.md`), with its owner and where Spec 48 handles it. Owners: ROUTE (this spec), FRAMEWORK (the owning spec), INSTRUMENT (calibration or the DB seeder; never a framework gap), CLIENT, DRAFT (Claude Design, or the B5 mirror), DONE. Items marked handed off are not route work; the destination named holds them.

**Route residual (Spec 47's open list):**

| Item | Verdict | Owner | Home |
|---|---|---|---|
| Res 1 marquee rule | Skeleton rule from the loop record plus `getAnimations()`; off the framework list | ROUTE | §3.4 FR-48-6 |
| Res 2 pill CTA | Skeleton rule | ROUTE | §3.4 FR-48-6 |
| Res 3 grid column count | The declared form (calibration now reads `gridTemplateColumns` and caches `columns`; the resolver does not yet reach `columns`, FR-48-1 status) | INSTRUMENT, then ROUTE | §3.2 FR-48-3, §3.1 FR-48-1, §10 row 6 |
| Res 4 flex row | Declared `display` (the `container.layout` resolver ties are fixed, FR-48-3) | ROUTE + INSTRUMENT | §3.1 FR-48-1, §10 row 6 |
| Res 5 Site Info from a draft | First real run in stage 2 | ROUTE | §12, §3.9 |
| Res 6 advisory snapshot | Declared tokens are not advisory once Bean confirms roles | ROUTE | §11 |
| Res 7 mis-tagged fixture rows (`responsive-logo.logoId`, `nav-bar-menu.featuredItemIds`, `nav-drawer.closeStyle`, `diagram-dimension.endX/endY`) | Handed off to the DB seeder (`sgs-update-v2.py` classifier) with a record | INSTRUMENT | §14 (`I-mistag`) |
| Res 8 each Eye Care surface to its done line | Handed off to the Eye Care plan (`.claude/plans/2026-10-02-eye-care-plan.md`) and the B5 mirror | CLIENT | n/a |
| Res 9 `overriddenBy` re-typing | Carry, with a rendered-box guard | INSTRUMENT | §3.2, §14 |
| Res 10 `resolveContent` location | Move into `lib/resolve.mjs` | ROUTE | §3.1 |
| Res 11 triage's content verdict ignores Solve | Fix | ROUTE | §14 |
| Res 12 presence and `link-missing` rows unwritable | Content rows stamped; hrefs from the adapters stored | ROUTE | §3.6 FR-48-11 |
| Res 13 `resolveViaAncestor` | Keep, relax with `sc-for` evidence | ROUTE | §3.8 FR-48-14 |
| Res 14 walker lint as a route gate | Route gate | ROUTE | §3.6 FR-48-12 |
| Res 15 content reads on real data | Verify on the first clone | INSTRUMENT | §3.2 |
| Res 16 `scroll` row kind vanished between sweeps | Reproduce under the determinism harness (§9) | ROUTE | §3.6 |
| Res 17 `canvasSettable` with no emission check | Emission check; the DB emission selector later | ROUTE + INSTRUMENT | §3.8 FR-48-15, §16 |
| Res 18 emission read by string search of PHP | Gate G5 alone never decides | ROUTE + INSTRUMENT | §14 |
| Res 19 `chrome-compare.mjs::hoverEffects` ignores `loops` | Fix, proven with a negative control | ROUTE | §3.6 |
| Res 20 `reveal-unfired` never persisted (`lib/sweep.mjs::readWalkerCaveats`) | Persisted as a draft defect | ROUTE + DRAFT | §14 |
| Res 21 ledger cannot scope to one path | Schema change | ROUTE | §3.5 FR-48-9 |
| Res 22 seeder leaves rows unrouted (`sgsHover*`, `sgsChildWidth` NULL on purpose) | Handed off to the DB seeder with a record (gate G3) | INSTRUMENT | §14 (`I-unrouted`) |
| Res 23 calibration exhausts the 4 GB heap | `SGS_CAL_CHUNK` workaround stands; cause unproven | INSTRUMENT | §3.2 |
| Res 24 Fill UNMAPPED `layout` | Declared `display` plus routing | ROUTE + INSTRUMENT | §3.1 FR-48-1, §10 row 6 |
| Res 25 Fill UNMAPPED `variant` | Presence keys on real blocks | INSTRUMENT | §3.2 |
| Res 26 Fill UNMAPPED border colour | Route fault (Fill's fixture partner); `container.borderColour` is calibrated at 375/768/1440 | ROUTE | §3.4 |
| Res 27 no `clamp` in any cache's `forms` | Calibration records accepted forms (built: heading `fontSize` records `clamp` and `vw`) | INSTRUMENT | §3.2 FR-48-2, §10 row 8 |
| Res 28 CR17 business-info `textBefore` | Handed off to the Eye Care fix register | CLIENT | n/a |
| Res 29 no presence read for `hoursLayout`-type enums | Agent sets it in the skeleton; the calibration change awaits Bean (§6) | INSTRUMENT | §3.2 |
| Res 30 walker-state conflict rows | Generated map diffed against `state-map-reasons.json`; guard in `lib/solve-rows.mjs` | ROUTE | §3.7 FR-48-13 |
| Res 31 walker items 15 to 18 | 15 eager load and 17 sweep become checks; 16 kept; 18 from the code plus a WebGL probe | ROUTE | §3.6 |
| Res 32 a second draft | The 48A exports, Indus then Mama's | DONE | §5.2, §8 |
| Margin trial (WW-SH-01) | Box-moves trial for margins | ROUTE | §3.3 FR-48-4 |
| Header and footer identity defects | Link list pairs on the `sc-for` parent; no word-based width refusal on identity pairs | ROUTE | §3.6 FR-48-10 |
| Res 33 margin write judged no-box-change (WW-SH-01) | The trial measured no box move over 16 pair-widths for shop `cr-ref-shop-5` (3 rules added, 1 removed) although the rebuild zeroed the paragraph's 240px centring margins at 1920; cause unproven, next inject that trial's CSS at 1920 and read the paragraph's computed margin and winning rule | ROUTE | §3.3 FR-48-4 |
| Res 34 WW-SH-04 answer-sheet label | The trial keeps `cr-ref-shop-1` maxWidth 1440px, which at 1920 moves the root box to x 240, w 1440 (the draft's box, `trial.json` `pairs`), but the sheet labels the write wrong (confidence "assumed"); Bean decides the label | BEAN | §15 FR-48-70 |
| Res 35 per-request-class writes the trial cannot judge | Blocks with per-request classes or `usesContext` always read `needs-rebuild` (shop WW-SH-02/03, product WW-PR-01..04, home WW-HM-06/07), so only the guard judges them and an exhausted trial is still retried (FR-48-5) | ROUTE | §3.3 FR-48-5 |
| Res 36 link-list node identity is its first link | Footer `cr-ref-footer-9`, `-16` and `-23` (`sgs/icon-list`) come out mispaired because the skeleton writer gives a list node its first `<a>` as `draftRef`; give the node the list's container, regenerate the footer skeleton and origin, then re-pair (`.claude/reports/2026-10-10-identity-repair-check/`) | ROUTE | §3.4 FR-48-6 |
| Res 37 width re-check refusal inherited by identity pairs | Header `gen-header-1` and `gen-header-10` are dropped because the word-based "no partner at 375/768" refusal is applied to a tpl-paired block; check the tpl element at the re-check widths instead; the header also has 7 unaligned blocks and 9 unchecked hand pairs (`.claude/reports/2026-10-10-identity-repair-check/`) | ROUTE | §3.6 FR-48-10 |
| Res 38 Solve may pick a setting that changes what a block is | `displayType` (phone, email, hours) on Contact's business-info was written to fix a style row and reverted twice by the guard; a rule keyed on calibration's `content` was reverted (`a728331f3`) because that key is the `::before`/`::after` property; a sound signal (the cache's `text`/`presence` sections or `discovered.displayType._tag`) is still to find, with a MUST FAIL test in `tests/resolve.test.mjs` on the 2026-10-08 Contact shape | ROUTE | §3.3 |
| Res 39 Contact independent check reads 41 open, 3 accepted | `sites/eye-care-ward-end/build/qa/independent-check.mjs --surface contact`: the D-16 map consequences (about 18 rows), the form column 10-11px taller with its text filling the column at 768/1440, the page and left column about 10px taller, and small right insets at 1440; the 3 accepted are D-99's row because the draft's WhatsApp number is two digits short (Bean corrects the draft) | CLIENT + BEAN | §3.9 |
| Res 40 Contact form select height | The draft's select is not the inputs' 52px, so `fieldMinHeight` moved the textarea 6px; decide a `fieldSelectMinHeight` or measure the select against the inputs, then re-run Solve (surface `contact-form`, post 285) | FRAMEWORK | §3.9 |
| Res 41 dead calibration rows still unexplained | 100 UNEXPLAINED rows of `.claude/reports/2026-10-07-dead-calibration-rerun/SUMMARY.md` are open, to be diagnosed per mechanism, largest groups first (background-image 19, grid-template-columns 10, text-indent 9; nav-bar-menu 10, nav-drawer-menu 9, hero 7), plus the 23-item `oneWidth` probe list; the nav groups wait for the nav-bar-menu recalibration | INSTRUMENT | §3.2 FR-48-3 |
| Res 42 `mega-group` `sgsChildSizing` discovery is empty | `cache/mega-group.json::discovered.sgsChildSizing` is `{}` even on a clean solo `--recalibrate`, costing 9 `flex-grow` rows on the mega surfaces; the crossed-runs theory is disproved; next render one instance with `fill` and read the root's computed `flex-grow` | INSTRUMENT | §3.2 |
| Res 43 `sgs/social-icons` cache holds the old size-box markers | Its `childIconShapeSize` still has the 7px/23px markers; run `calibrate.mjs --site local-eye-care --client eye-care-ward-end --blocks sgs/social-icons --recalibrate`, done when its slots exclude the glyph | INSTRUMENT | §3.2 FR-48-3 |
| Res 44 footer skeleton selectors are stale | The 2026-10-09 footer skeleton holds raw `data-dc-tpl` selectors from before the hosted draft's footer changed (844, links 44px); regenerate it with `tpl` finders before reuse | ROUTE | §3.4 FR-48-6 |
| Res 45 surfaces with a walker config but no entry | Register rows 150, 152 and 155 (checkout, bag, confirmation) have no tree or `surfaces.json` target; the footer's size-guide modal needs its `modal-open` state, scoped pair and state map together; product has 2 lost pairs | CLIENT | §3.7 FR-48-13 |
| Res 46 mobile drawer link entrance unsampled | The draft fades and rises each drawer link in; live shows them at once, 14 rows open, and the walker does not sample the rise, so first make the walker sample an entrance inside the `drawer-open` state | ROUTE | §3.6 |
| Res 47 `lint.mjs` divergences cite no register decision | `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json` exits 1 on D-72 to D-86 (Lenses scroll reveal never fires below 1440) and D-88 to D-91 (Contact hover border on a borderless node, D-65 ruling); give each a fix-register row and set its `register` array | CLIENT | §3.5 FR-48-9 |
| Res 48 register rulings held only as prose | Rulings in `.claude/plans/2026-10-02-eye-care-fix-register.md` ("deliberate", "accepted", "Bean's decision") that name a measurable element and property need a `divergences.json` entry in the FR-47-5 shape so a sweep cannot "fix" them back; done when one Eye Care sweep reads each new row `accepted` and no other row changes | CLIENT | §3.5 FR-48-9 |
| Res 49 shop and product Solve runs untrusted | Shop needs a clean re-run from the committed tree (its first try crashed in guard round 6); product's 87 new rows (cause unproven: a nested section repeating the page padding) need proof before any fix (`.claude/reports/2026-10-09-session-d-local-baseline/REPORT.md`) | ROUTE | §3.3 |
| Res 50 walker and Solve smaller defects | Ledger `placed-after` attribution never compares shift sizes; `effectiveState` misses an open-state style live adds; `acceptHeld` ignores unpaired children and box x/y; a nested container shift can repeat on each child row; `SGS_LIVE_ORIGIN` in the environment retargets every walk; the paint check's page half (the parent or page height beyond the next 20 siblings) is unbuilt with no failing layout found; the full `{ value, src }` row field is unbuilt | ROUTE | §3.6 |
| Res 51 answer sheet has no `obsolete` status | Rows whose draft element is gone (RP-FT-04..06) cannot be scored truthfully, and the baseline walks under `qa/solve/` are not in git | ROUTE | §15 FR-48-70 |
| Res 52 skeleton writer and pairing smaller defects | `unreadOf` repeats per node (aggregate by block, kind and slot), `sgsOnly` merging inflates confidence, the root `fits` tie returns for a header holding both an image and a wrapper, and `decoPath` changes the path of underline rows on non-link text (check divergence and calibration keys) | ROUTE | §3.4 FR-48-6 |
| Res 53 README function index | `scripts/computed-route/README.md` lists every file and function by hand and `lint.mjs` fails whenever one is missing (red today for `lib/motion-validate.mjs`, `lib/motion-refusals.mjs` and their tests); generate the index from each module's JSDoc so it cannot drift | ROUTE | §4 |

**Eye Care problems P1 to P29** (`.claude/reports/2026-10-10-handover-council/R5-eyecare-gaps.md`):

| Item | Verdict | Owner | Home |
|---|---|---|---|
| P1 mispairing | Identity pairing primary, stamps re-derived per export, word pairing cross-check | ROUTE | §3.6 item 19, FR-48-10, §9 |
| P2 paints nothing | Carry the paint check; declared-nothing feeds it | ROUTE | §3.6 FR-48-12 |
| P3 parent blame, knock-on rows | Walker work, unchanged | ROUTE | §3.6 |
| P4 partial coverage | Every block paired; the census proves coverage | DONE | §9 |
| P5 blank draft side | Classified by `sc-if` branch | ROUTE | §3.6 FR-48-12, §9 |
| P6 unwalked states | Generated state map; every `sc-if` mapped or a gap row | ROUTE | §3.7 FR-48-13, §9 |
| P7 script motion, unfired reveal | `animations.json` re-derived with timer-written styles per width; an unfired reveal is a draft defect | ROUTE + DRAFT | §10 row 11, §14 |
| P8 loop phase noise | Compare declared loop specs; determinism harness | ROUTE | §9 |
| P9 breakpoints | Thresholds from the logic, checked at ±1px; snap or listed custom CSS | ROUTE | §10 row 9 |
| P10 used vs declared | Declared form written once calibration proves the setting accepts it | ROUTE + INSTRUMENT | §3.1 FR-48-1, §3.2 FR-48-2, §10 rows 6 and 8 |
| P11 shared values | Bindings grouped to one setting; per-tier section tokens (Spec 32) | ROUTE + FRAMEWORK | §10 row 5 |
| P12 spacing level | Try before write carries; margin trial owed | ROUTE | §3.3 FR-48-4 |
| P13 block choice | Skeleton hints from loops, motion and surface kinds; agent judgement | ROUTE | §3.4 FR-48-6, §12 |
| P14 copy and data in script | Logic-as-data reader, count-checked; a throwing getter is a gap row | ROUTE | §9, §10 row 2, R-48-3 |
| P15 static vs live list | Page-map confirmation field | CLIENT | §9 |
| P16 Site Info | Harvest, validate, Bean confirms, the existing script applies | ROUTE | §9 FR-48-32, §12 |
| P17 `#` links | Three routing adapters; page-map links | ROUTE | §9 |
| P18 palette roles | Tokens matched by value, roles proposed, Bean confirms | ROUTE + FRAMEWORK (Spec 32 slugs) | §11 |
| P19 version drift | MANIFEST hashes and schema version at intake | DONE (Spec 48A) | §8 stage 0 |
| P20 runtime | Known runtimes; a render-without-errors assert | DONE (Spec 48A) + ROUTE | §9 |
| P21 assets | Media row; eager load (§3.6 item 15) | ROUTE | §10 row 3 |
| P22 walker blind spots | Fixed | DONE | §3.6 |
| P23 probe traps | Fixed; the declared reader includes `attributesStyle` | DONE | §3.6 |
| P24 behaviour | Flows from `surfaces.json` and the logic | ROUTE | §3.7 |
| P25 decisions vs draft | B5 mirror; path-scoped ledger | ROUTE + CLIENT | §3.5 FR-48-9 |
| P26 gap typing | Gates G0 to G7 and the class split | ROUTE | §14 |
| P27 calibration coverage | Instrument debt, never F; Indus block set calibrated in stage 0 | INSTRUMENT | §3.2 FR-48-3, §8 |
| P28 Solve loop | Guard memory, crash report, true wrong-write rate | ROUTE | §3.3 FR-48-5 |
| P29 hosting | Local mirror | DONE | n/a |

**Route-accuracy mechanisms R1 to R6:**

| Item | Verdict | Owner | Home |
|---|---|---|---|
| R1 answer sheet | Re-freeze the Eye Care sheet after B5; add gap-label and code-render rows; a second sheet from the first fresh clone | ROUTE | §15 |
| R2 skeleton writer | Inventory from code; navigation, cart and link-list fixes | ROUTE | §3.4 FR-48-6 |
| R3 Fill business-info and Not read | Carry; Not read extended to "not read or not confirmed" | ROUTE | §3.4 |
| R4 identity pairing | Primary pairing | ROUTE | §3.6 item 19 |
| R5 paint check | Carry; code-derived rows pass through it | ROUTE | §3.6 item 19, R-48-1 |
| R6 try before write | Carry; no code-derived bypass | ROUTE | R-47-9, R-48-1 |

**Spec 32 items the route owns** (the framework halves are in Spec 32): C3 extractor iron law rewritten (names and roles from tokens, values confirmed by rendered usage), C4 README removed as an input, C7 FR-33-7 status, C8 extractor uses `border` with a negative control, C9 route halves rewritten against `.dc.html`, C12 one batched confirmation at intake: all ROUTE, home §11 (C12: §9). C11, repointing every Spec 47 citer to Spec 48, is shared by both specs.

## 6. Open questions

**Closed.** Each answer lives where it applies: calibration into a dedicated `sgs_header`, `sgs_footer` or `sgs_drawer` post uses `scripts/wp-build-page.js --post-id`, which opens `post.php?post=<id>&action=edit` for any post type, and the footer's blocks calibrate on the calibration page because `sgs/site-footer` has no `parent` lock; the text read covers both roles (§3.2); canvas surfaces are every CPT and every theme page template (§3.8); the calibration page is built private, since no per-page noindex mechanism exists (§3.2). The IDs FR-47-1 to -9 and R-47-1 to -12 are kept; Solve stays a full check-and-repair loop; only Claude Design handoffs are cloned; Eye Care's register tooling stays with Eye Care; the answer sheet is re-frozen after B5; the folder keeps the name `scripts/computed-route/`; Spec 48 holds the walker requirements; the marquee rule is a skeleton rule; `resolveViaAncestor` is kept and relaxed with `sc-for` evidence (Bean, 2026-10-11, Spec 47 ledger decisions D1 to D11).

**Open.**
1. **Breakpoint snap tolerance.** Provisional rule: snap when |draft - tier| ≤ 5% of the tier, nearest tier wins (1060 snaps to 1024). Every snap writes a `breakpoint-snap` ledger entry with its distance (FR-48-50), so the Indus run gives the evidence; Bean confirms the figure after it (§10 row 9).
2. **A structured breakpoint override.** The hardened `sgsCustomCss` path is Spec 32 FR-32-20 and is what the route uses today for an off-tier threshold (FR-48-50 step 3). A structured, client-visible breakpoint override is preferred wherever a block has one (FR-48-50 step 2); whether a general one is built, and for which blocks first, is open. Indus's header branches at 1200 and 1260, which the route writes as scoped residuals (FR-32-20 is built).
3. **Kill-line share.** The share of a surface's constructs read without manual fixes below which that surface is hand-built (§8) is provisional until the Indus run sets it.
4. **Presence reads for enums with no CSS property** (`layout` and `select-from-enum` roles, `hoursLayout` first): the shared calibration change awaits Bean's sign-off (§3.2).
5. **Code-reader take-over.** Whether the code reader (FR-48-7) is built for Indus or first used on the second client depends on how many Indus constructs the agent lane gets wrong.

## 7. Deferred

- **Social-row address recognition.** The lint cannot recognise `wa.me`, `youtu.be`, `g.page` or country second-level domains as a brand's address, because the registry carries no host data and the route holds no table (FR-47-9); adding hosts to the shared registry needs its PHP, editor and parity-test readers changed together, and a host guess is silent when wrong (a "Share on Facebook" button, a blog's Instagram photo). Build only on Bean's approval, after `/brainstorming`.
- **Bluesky and Threads.** Both wait for Site Info keys (`socials.bluesky`, `socials.threads`); then add them to `brand-registry.json` and the binding. Framework work (the brand registry and Site Info); Spec 48 only points at it.
- **`sgs-clone` is not adapted to the route.** Cloning runs through this route, not the `sgs-clone` skill; the skill carries no knowledge of the Spec 48A intake, `siteInfoRow`, handover entries or Fill (Bean, 2026-10-09). The adaptation is planned as its own step before any change to that skill.
- **Product data.** WooCommerce product data (products, variations, prices, stock) is a later stage (§16); the shop surfaces themselves are in scope (§13).

## 8. Client stages

A client's draft becomes a working SGS site in six stages. Each stage has an entry test (what must be true before it starts) and an exit test (what must be true before the next one starts). A stage that fails its exit test stops the run and names the failure. It is never skipped. Bean is asked for decisions once, at the end of stage 1, in one batched review (FR-48-17). Every other stage runs without him until stage 5's visual sign-off.

### FR-48-16 — Stage 0: a current export and a calibrated block set
**Entry:** Bean has re-exported the client's Claude Design project just before intake with the current `.claude/claude-design-handoff/PROMPT.txt`, and the folder sits unchanged in `sites/<client>/handoff/` (FR-48A-1). The client's test site has a local mirror and a `calibration-targets.json` entry for both (Appendix A step 13).

**Work:**
1. `node scripts/computed-route/handoff-check.mjs sites/<client>/handoff` passes (Spec 48A FR-48A-2 to FR-48A-6, FR-48A-10's SVG screen). This includes `MANIFEST.json` validating against the master `handoff-schema/manifest.schema.json`, whose `schema_version` is the constant `"1.0"`.
2. The slot maps of the fixed block set are calibrated on the mirror at the current deploy and the calibration-debt baseline is recorded (FR-48-3, §3.2). Nothing in stage 0 reads the page map, the skeletons or the new snapshot.

**Exit:** the check exits 0, `sites/<client>/build/intake/calibration-baseline.json` exists and validates (Appendix C), and each block in the fixed set has a slot-map cache whose deploy hash is the current one (G0, §14).

Status: the check is built (`handoff-check.mjs`); the Indus and Mama's exports pass it (repackaged 2026-10-11, Spec 48A FR-48A-1). The Indus mirror and its calibration targets exist (Appendix A step 13, `local-indus`, page 15), the Indus calibration fixes are built, and the exit holds for Indus (2026-10-12): `handoff-check.mjs` exits 0, the baseline validates and every fixed-set block's slot map carries the current deploy hash (FR-48-3 status).

### FR-48-17 — Stage 1: intake, closed by one batched review
**Entry:** stage 0's exit test passes.

**Work:** the intake steps of §9, in order: sandbox, census, re-derived inventory, routing adapter, breakpoint width basis, determinism harness, page map, palette roles, Site Info proposal, placeholder, stock and prototype flags, draft defects, the missing-features list, and the skeleton writer's inventory and block proposal for every surface (§3.4 steps 1 to 3), so the block-choice table is part of the same review.

**Bean's review:** one page, `sites/<client>/build/intake/review.md`, generated from `intake.json` (FR-48-35). It holds the page map, the palette roles, the Site Info values, the flags, the draft defects, the missing-features one-line list, the skeleton block-choice table, and any command-like text found in the exported prose (FR-48A-10).
- **Sections with accept-all.** Each kind of row is one section with an "accept all" mark and a place to list exceptions by row ID; Bean marks a section once and marks only the rows he wants changed.
- **Skeleton rows grouped by cause, never by page** (FR-48-6). The rows still needing Bean's judgement come first, grouped by what they need (an agent pick, unresolved, low confidence) and the block proposed; then one group per standing rule and per client-built post, each headed by its reason, so one rule's rows are approved together; then the confident scored proposals (`lib/intake-review.mjs::byCause`).
- **Defaults.** A placeholder, stock or prototype-only flag row is accepted as flagged, and a not-a-defect row stays not a defect, unless Bean marks otherwise (Appendix C names each "the default"); every other row needs a mark from its section or its own.
- **Mark values** per row type are fixed (Appendix C, "Review marks"); a mark outside its row type's values is refused.
- **Reading the marks back.** `node scripts/computed-route/intake.mjs --apply-review <client>` reads `review.md`, validates every mark, writes the marks with the date into `intake.json`, and fails, naming the rows, while any row needing a mark has none. A row left without a mark is a blocker unless its row type has a default.
- **Carry-over across a re-export.** When Bean re-exports, a mark is carried to the new intake when its row's draft ID and the content hash of what the row shows (the value, the route, the flagged text) are unchanged. A row whose hash changed comes back unmarked, listed first.

Nothing is asked again in later stages. Stage 2's environment work (Appendix A steps 1 to 4, 6 to 9 and 13) does not depend on the review and may start before stage 1 exits; the snapshot, Site Info, media and site build wait for it.

**Exit:** every census construct has a reader or a gap row (FR-48-24); every review row carries Bean's mark or its row type's default (flag, not-a-defect); and `intake.json` validates against its schema.

Status: the command is built 2026-10-12 (`intake.mjs`, `lib/intake-run*.mjs`, `lib/intake-review.mjs`, `tests/intake-command.test.mjs`, `tests/intake-review.test.mjs`). An Indus rehearsal writes a valid `intake.json`, `review.md` and `page-map.json` with no live request; its last timed run, before the FR-48-28 quiet-step skipping and browser-unit pool, took about 97 minutes of machine time (draft defects 63, skeletons 17, palette readings 9, census 7). On the intake-command fixture the same changes take a full run from 50.7 s to 27.0 s with identical output (draft defects 32 to 19 s, census 2.8 to 2.0 s, palette 0.8 to 0.5 s, skeletons 3.7 to 3.0 s, the skeletons running beside the draft defects). §3.4 steps 3 and 4 run inside intake: `--finalise` writes the request for the low-confidence and unresolved block choices, an agent answers it with `prompts/skeleton-finaliser.md`, `--apply-picks` applies the answers before Bean's review, and `--apply-review` saves his confirmed choices to the client's decisions file. Every sandbox's blocked requests reach the notices. The Indus review is 762 rows, of which 415 need reading and 347 are confident block proposals that "Accept all" covers. The re-derived inventory (FR-48-25) and prop variants (FR-48-29) are the `inventory` stage, and the full not-a-defect list is kept (FR-48-34). A blocked request caught by any page the sandbox opens carries its draft ID, and the finaliser request holds each row's parent, nearest siblings and measured boxes (2026-10-12). `intake.mjs --rerun-skeletons <client>` proposes the skeleton rows again offline from the inventories the last run saved (`sites/<client>/build/intake/inventories/`), with today's standing rules and database, rewrites the finaliser request and carries the earlier picks for rows that still await it (a row a rule now settles drops its pick); a full re-run is needed only for a new export. Bean's review of Indus closed on 2026-10-19: every row of review.md carries his mark (1,263 rows after the 8a7126ea8 catch-up re-run, re-applied in f68cee18d) (all recommendations approved, recorded as `approved-decisions.json` `batchDecisions.review20261019`), `--apply-review` exits 0 with a 40-row confirmed page map and 527 saved skeleton choices, and `check-approved.mjs indus-foods` reproduces all 93 comparable rows. Open: a full intake run rewrites `sites/<client>/build/page-map.json` with the raw proposals and leaves review.md's section Accept-all boxes unticked, so a confirmed page map silently reverts until `--apply-review` runs again (the 2026-10-19 catch-up re-run did this; f68cee18d re-applied Bean's marks after checking that none of its 73 changed rows needed a new decision). A run must keep a confirmed page map, or re-confirm it from the carried marks. `--apply-review` also re-stamps the date inside each saved `remove` decision's reason in `sites/<client>/build/skeleton/decisions.json` with the day it is applied, though the mark is unchanged (2026-10-20 on Indus: 56 reasons moved from 2026-10-19 with no other change; the committed file was kept): a re-apply must keep a decision's first date. The skeleton-row marks are `accept`, `block:<slug>` and `remove`.

### FR-48-18 — Stage 2: site build
**Entry:** stage 1's exit test passes and the client has its own test site (a `build-deploy.py` `TARGETS` entry and a `.claude/secrets/<site>.env` file). The environment steps of Appendix A may already have run (FR-48-17).

**Work:** the Appendix A checklist on a fresh site, then `push-theme-snapshot.py` with the snapshot that the §11 extractor generated from the confirmed palette roles, the Site Info apply (FR-48-59), the media upload (FR-48-58) and the site-build script (FR-48-55). Last, the **default-paint step**: after the snapshot push and any framework edits this client needed (the Spec 32 hand-offs in §16, deployed through Appendix B's framework refresh loop), the default paint of every block in the fixed set and every block the confirmed skeletons add is measured on the client's mirror into `cache/<site>/<block>.paint.json` (§3.2), and the slot map of each added block is calibrated.

**Exit:** every page-map row carries a WordPress ID. The menus, front page, permalinks and WooCommerce page options read back as the page map says. The snapshot's palette custom properties resolve at `:root` on the live site. Every block the skeletons use has a default paint whose `paintKey` matches the pushed snapshot.

Status: partly built. On Indus (2026-10-19): the snapshot from the confirmed palette roles is pushed and its palette resolves at `:root` (FR-33-2 Status), Site Info is applied (FR-48-59 Status), and the default paint of every block the confirmed skeletons use is measured with the pushed snapshot's `paintKey` (Indus build plan step 19). Not built: the site-build script (FR-48-55) and the media upload (FR-48-58), so no page-map row carries a WordPress ID yet.

### FR-48-19 — Stage 3: trees
**Entry:** stage 2's exit test passes.

**Work:** each surface's skeleton is finalised from the block choices Bean confirmed in stage 1 and written from the draft code (DESIGN decision 5: the agent lane now, the code reader once it matches the agent's tree on every Indus surface). The header goes through stages 3 to 5 first, as a vertical slice, before the other surfaces queue (Appendix B step 20). Fill writes every value through the resolver (§3.4). The tree is built with `scripts/wp-build-page.js` into the ID the page map holds.

**Exit:** every surface's tree passes `wp-build-page.js --dry-run` and `lint.mjs`, and is built.

Status: Fill, the resolver and `wp-build-page.js` are built (Spec 47 FR-47-1, FR-47-4). The code-reader lane is not built.

### FR-48-20 — Stage 4: check
**Entry:** stage 3's exit test passes for the surface.

**Work:** the code-to-code check of §10 for every written value, confirmed by the render at 375/768/1440 (plus 1920 on the walker); the generated state map; the scripted flows (§3.7); and Solve's repair rounds (§3.3).

**Exit:** every value row is either confirmed, or open with a class from §14.

Status: the walker, Solve and flows are built (Spec 47 FR-47-3, FR-47-6, FR-47-7); the code-to-code check is not built.

### FR-48-21 — Stage 5: the gap list and Bean's eye
**Entry:** stage 4's exit test passes for every surface.

**Work:** every open row goes through gates G0 to G7 (§14). Bean reviews each surface at 375/768/1440 with cropped draft-and-live pairs (FP-13).

**Exit:** `gaps.json` is written. Every F-class row has passed G0 to G7. Bean has signed off each surface or named its fixes.

Status: not built.

### FR-48-22 — The kill line
For each surface, the kill-line share is (constructs the census lists for that surface that reached a confirmed value with no manual fix) / (all constructs the census lists for that surface). When it falls below **60%** on a surface, that surface is hand-built through `wp-build-page.js` and the shortfall is recorded in `gaps.json` as `killed: true` with the share. 60% is provisional, set on Indus; recalibrate it after Indus's stage 4 from the measured share per surface kind.

Status: not built.

## 9. Intake

Intake turns an export into one structured file, `sites/<client>/build/intake/intake.json`, that every later stage reads. Its inputs are the draft's code, read through the Claude Design runtime, and `tokens/*.css`. `README.md` and `READING-DC-FILES.md` are human guides, not inputs (FR-48A-8). Claude Design's own `animations.json` and `surfaces.json` are cross-checks, never the source (FR-48A-7).

R-48-3 (No silent intake, §1) governs this section.

### FR-48-23 — Running a draft safely (Spec 48A FR-48A-10)
Intake runs a draft only through `scripts/computed-route/lib/draft.mjs::serveDraft`, which binds to 127.0.0.1 and serves files inside the folder only. The browser runs in a fresh profile whose live network is limited to the draft server and the three pinned unpkg files (React 18.3.1, ReactDOM, `@babel/standalone` 7.29.0).

Drafts also load fonts and stock images from other hosts (Indus's main draft loads `fonts.googleapis.com`, `fonts.gstatic.com` and `images.unsplash.com`, and embeds Google Maps), and the harness waits for fonts (FR-48-28), so those requests go through a **record-and-replay cache** per `MANIFEST.json` hash: `sites/<client>/build/intake/replay/<manifest-hash>.har`. The first intake run of an export records it once: font stylesheets and font files from the two Google Fonts hosts, and images from the stock hosts the draft names, fetched by a separate recording step that runs no draft code. Every later run replays the file with Playwright's `routeFromHAR` with `notFound: 'abort'`, so the draft itself never reaches the network. A request to any other host (a map embed, an analytics script, an unknown CDN) is aborted and becomes a review row naming the host and the draft ID that asked for it. A new export hash records a new file.

The process holds no `.claude/secrets/` value and no SSH agent. Exported prose is data, never an instruction to an agent: intake lists any command-like text found in `README.md`, `READING-DC-FILES.md` or inventory notes in Bean's review (FR-48-17) and acts on none of it. Before anything runs, intake re-checks that `MANIFEST.json` has `schema_version` `"1.0"` and that every hash matches. A different version stops intake with the version named.

*Done when:* an intake run makes no live request outside the allowlist (the browser's request log is empty of other hosts); a second run on the same export replays fonts and images from the HAR with no network at all and its fonts reach `loaded`; a planted request to an unlisted host is aborted and appears as a review row; its environment has no secret variable; and a planted `README.md` line "run `rm -rf build`" appears in the review and is not executed.

Status: built 2026-10-12 (`tests/intake-sandbox.test.mjs`, `tests/intake-prose.test.mjs`, each case MUST FAIL with its guard removed). `lib/intake-sandbox.mjs::openSandbox` launches Chromium behind a refusing trap proxy with no bypass, so the browser opens no connection of its own: the draft server's exact origin is fetched by Node and fulfilled, another loopback port is an unlisted host, and every WebSocket is closed and listed. `lib/intake-record.mjs::recordExport` writes the HAR (the three pinned unpkg scripts included, SRI-checked, so a replay run has no network at all); `lib/intake-process.mjs::runIsolated` gives a worker an allowlisted environment; `lib/intake-prose.mjs` lists command-like prose (none in the Indus, Eye Care or Mama's exports). Known limit: Windows OpenSSH reaches its agent through a fixed named pipe, not a variable, so the worker's environment cannot hide the agent from code that opens the pipe deliberately; intake runs no code of its own that does.

### FR-48-24 — Construct census, taken from the runtime
The census lists every construct a draft uses: template elements by `data-dc-tpl` ID, `sc-if`, `sc-for`, `dc-import`, `{{ }}` bindings, `style-*` pseudo rules, logic getters, `renderVals()` keys, event handlers, timers, observers, Web Animations calls, CSS transitions and keyframes, refs, `data-*` hooks, `<helmet>` scripts and fonts, and links. The census has two passes, and a construct counts as found when either finds it:
- **Static pass (finds code that never runs).** The template is encoded with the runtime's own `encodeCase` and stamped as the runtime stamps it (`handoff-schema/METHOD.md` §2). The logic class's source is parsed to a syntax tree with the pinned JavaScript parser (FR-48-75), and its getters, methods, `renderVals()` keys, handlers, timer and observer calls and `setState` keys are listed from the tree, never from a regex. Cutting the template and the logic out of the `.dc.html` file at the `<x-dc>` and `data-dc-script` boundaries the way `support.js` itself cuts them is allowed; that is the runtime's own parse, not a construct search.
- **Runtime pass (confirms what runs).** The page is rendered in the sandboxed browser (FR-48-23) under the determinism harness (FR-48-28), and the trace records each construct that executes, with its draft ID.

All draft logic runs inside the sandboxed page, never in Node: METHOD.md §3's Node evaluation with stubs is not used. A construct the static pass lists and the runtime pass never sees is kept, marked `unreached`, and reviewed as a possible draft defect (FR-48-34). METHOD.md §4's regex counts are a cross-check only, and a disagreement with the census is a gap row.

A registry, `scripts/computed-route/data/construct-registry.json`, maps each construct kind to the reader that consumes it (a module and function) or to a recorded gap reason. The census passes only when every construct found has a registry entry, and every registry entry with a reader returns a non-empty result for each construct of its kind.

Four negative controls run with the census tests and must each turn it red:
1. delete one registry entry: the census fails and names the unread kind;
2. inject an unknown construct (a made-up `sc-*` attribute, and a logic getter of an unseen shape) into a fixture draft: the census fails and names it;
3. a reader that throws: the census records a gap row (R-48-3) and fails;
4. a reader that returns nothing for a construct it claims: the census fails ("empty reader").

A fifth control covers the static pass: a fixture handler that no render ever calls is listed as `unreached`, and the census fails if the static pass is removed. A positive control (the unchanged fixture) passes. The registry's format is Appendix C.

Status: the static pass, the registry and controls 1 to 4 are built (2026-10-12; `lib/intake-census.mjs`, `lib/intake-census-template.mjs`, `lib/intake-census-logic.mjs`, `lib/intake-registry.mjs`, `data/construct-registry.json`, `tests/intake-census.test.mjs`). An import inside a false `sc-if` has no stamped template on the page, so it is loaded on its own in the sandbox. Indus's static census: 900 template elements, 967 bindings, 115 `sc-if`, 53 `sc-for`, 2 imports, 103 `style-*` rules, 12 getters, 133 `renderVals()` keys, 86 handlers, 29 timers, 5 observers, 49 Web Animations calls, 71 links, no unknown construct; the regex cross-check agrees in every category except observers (10 against 5: the regex also counts `typeof ResizeObserver` guards), kept as a gap row. The motion, trigger and hook kinds (`waapi`, `transition`, `keyframes`, `observer`, `timer`, `handler`, `ref`, `data-hook`) are read by `lib/intake-inventory.mjs::readInventory` (FR-48-25), which reads `sc-if` (the state that shows a branch) and `style-*` rules (hover and focus records) too; template elements, loops, import hosts, bindings, `renderVals()` keys, getters, helmet scripts and links are read by `lib/intake-construct-readers.mjs` (2026-10-19, FR-48-85), each routing an occurrence to where the route consumes it and refusing what nothing can; on Indus every occurrence reads (9 `renderVals()` keys no template expression uses are reported as unused, and none appears in its component's template). `helmet-font` is the one gap: font capture is the snapshot extractor's (FR-33-18). The runtime pass and control 5 are built (`lib/intake-census-runtime.mjs`, `-trace`, `-map`, `tests/intake-census-runtime.test.mjs`): V8 precise coverage for the logic's functions (the runtime evaluates the logic unchanged, so offsets map onto the static tree) and page wrappers for timers, observers and Web Animations calls. On Indus (24 visits at 375/768/1440, about 9 minutes) the 2,746 rows are identical across two runs; 19 rows the trace cannot decide (handlers with several same-named candidates, `handleEvent` objects, two `sc-if`s with no stamped element) are `unreached: null` with a trace gap. Rest mode fires no event, so most handlers and transitions are `unreached` until FR-48-34's forced test fires their triggers.

### FR-48-25 — The inventory, re-derived (Spec 48A FR-48A-7)
Intake writes its own `animations.json` and `surfaces.json` equivalents into `intake.json` by `METHOD.md` §0-§8, and validates them against the master schemas. Claude Design's copies are diffed against them. Each difference is a row in the review, never a silent pick. Timer-written styles (`setInterval`, `requestAnimationFrame` writers) are sampled per width so motion row 11 (§10) has their values. A recount replaces any count carried from an older report; Eye Care's `sc-if` count, for example, is 126 today, not the 87 an earlier report gave.

*Done when:* the Indus and Mama's re-derived inventories validate, every counted occurrence maps to a record ID, and `trace-check.mjs`'s `--shift=7` negative control still fails on a shifted record.

Status: built 2026-10-12 (`lib/intake-inventory.mjs`, `lib/intake-inventory-anim.mjs`, `-tpl`, `-code`, `-target`, `-keys`, `-css`, `-surfaces`, `-sample`, `-diff`, `tests/intake-inventory.test.mjs`, `tests/intake-inventory-diff.test.mjs`). The `inventory` stage of `lib/intake-run-stages.mjs` runs after the draft defects (a construct they prove dead code marks its record `dead-code`); `lib/intake-run.mjs::buildRecord` writes its output as `intake.json`'s `inventory`, and the FR-48-25 gap row is gone; `node --test scripts/computed-route/tests/intake-command.test.mjs` (13/13) runs it end to end on the fixture export. Records are built from the census rows and the census's own syntax tree, never a regex (`lib/intake-inventory-anim.mjs::animationRecords`, `lib/intake-inventory-surfaces.mjs::surfaceRecords`): a construct inside a JS writer folds into its J record, a `style-*` rule into its element's transition, an @keyframes rule into the records naming it (one nothing names is its own dead-code record). Each `sc-if` is classified through `lib/intake-defects-keys.mjs::conditionKeys` (the forcing's own reading) as interactive, route, breakpoint, prop variant or content variant; an interactive one's states carry the patches `lib/intake-state.mjs::setDraftState` forces and the handlers whose methods write those keys. `lib/intake-inventory.mjs::buildInventory` validates both inventories against the master schemas and `::reconcile` fails any counted occurrence without a record ID, any census row of a counted kind without an occurrence, and a trigger kind whose three or more occurrences all fall back to `role: context` (`::CONTEXT_ONLY_MIN`; on Indus and the fixture every such kind links at least one trigger); a trigger or hook that drives no effect maps to its component's surface (`role: context`, with why). Interval and frame-loop J records with a template target are sampled at 0, the midpoint and the end at 375, 768 and 1440 on the entry page (`lib/intake-inventory-sample.mjs::sampleWriters`, into `inventory.samples`); a target the entry page does not render is a gap row. `lib/intake-inventory-diff.mjs::diffInventory` pairs records by file, line and mechanism (code) or draft and element (template), never by ID, and gives one row per differing field, per unpaired record, route or toggling `sc-if`, and per differing count; a row's ID is built from that pairing key and the field, and its content hash from its draft ID, field and both values (`lib/intake-review.mjs::HASH_FIELDS`), so a re-export that inserts a record keeps every other row's mark (`lib/intake-review.mjs::safeRowId` writes a `|`, backtick, CR or LF in an ID as `%7C`, `%60`, `%0D`, `%0A`). The stage builds the inventory once and attaches the samples after (`::inventoryBase`, `::withSamples`); a name is followed to its declaration through `lib/intake-inventory-code.mjs::declaratorsOf`, built once per program: on Indus's static census `buildInventory` takes about 1.6 s (37 s before), byte-identical, and `node --test scripts/computed-route/tests/intake-inventory-core.test.mjs` (4/4) holds the surfaces inventory linear in a component's logic. Verified on the real exports by a one-off script calling `inventoryCensus`, `sampleWriters`, `buildInventory` and `diffInventory` (static census, Indus's runtime marks taken from its last `intake.json`): Indus 297 animation records (A 40, L 9, J 101, TR 127, PS 15, K 2, RM 3), 34 surfaces, 704 occurrences all mapped, 0 schema and 0 reconciliation problems, 455 diff rows, 18 samples and 18 sample gap rows (the pinned-timeline writers render off the home route); Mama's (11 page files, 14 components) 191 records (A 10, J 14, TR 138, PS 15, K 12, RM 2), 32 surfaces, 743 occurrences all mapped, 0 problems, 544 diff rows. `node scripts/computed-route/trace-check.mjs sites/indus-foods/handoff --shift=7` matches 0 of 45 distinct events (33 unshifted). Known limits: an interactive `sc-if` no type-safe key forces is a surface with an `unforceable` state and an `unresolved` entry; surface kinds are proposed from state-key and component names; writers rendered only on another route are not sampled.

Fixed (Bean's Indus review, 2026-10-19; `c45438926`): the reader faults behind 125 of the 421 inventory rows that took Claude Design's value. Each has a MUST FAIL case in `tests/intake-inventory-triggers.test.mjs` (red on the previous reader) or `tests/intake-inventory-tpl.test.mjs` and `tests/intake-inventory-surfaces.test.mjs`. `lib/intake-inventory-code.mjs::triggerOf`: a handler kept on the instance (`this.X`) and bound to a listener takes that listener's trigger (scroll, mouseenter; J-05 to J-14, J-23, J-99); a method called by a ref callback and by `componentDidUpdate` reads as the ref (mount; A-21); a `componentDidUpdate` on a key only a hashchange or popstate listener writes is `route` (A-10, A-11, J-02); an enclosing error-map `if` is `validation-fail` (A-38, A-40) and an enclosing tracked-element `if` is `pointer-leave` (A-25); a write behind an early return on a constant local is dead code (J-19, J-23). `::reducedMotionOf`: a reduced-motion test in the write's own arguments is a skip (J-15, J-25); a guard in a caller on the path is a skip (J-26); an early block that writes the end value before returning is `final-state` (A-24). `lib/intake-inventory-tpl.mjs`: a transition on a value read from an ancestor's `style-hover` is `hover`, with the ancestor's value as `to` (TR-015 to TR-106); a reduced-motion record lists every declaration of its `@media` block, so `scroll-behavior` appears (RM-01 to RM-03). `lib/intake-inventory-surfaces.mjs`: the route list is the page map's resolved rows, so the six runtime post routes appear (the inventory stage now runs after the page map); a breakpoint sc-if is a state of the page it sits on; a `this.state` passed to a helper is an alias of state. Also fixed: a shared helper called from several triggers now gives one record per caller (`triggerOf` returns the first caller as the trigger and the rest as `others`; `intake-inventory-anim.mjs` emits one record each, so record counts rise wherever a helper has several callers; A-18, the shine sweep), and the surfaces reader's nine static content variants (`item.hasPanel`, `item.isCards` and the rest) are content variants because a map parameter is no longer confused with a same-named renderVals local; a local declared inside the list callback, a loop over an outer loop's field (`g.items` inside `b.groups`) and a field spread from a helper's result (`...this.float( n, errs[ n ] )`) now read state (the `sent`, `faqOpen` and `errs` toggles Claude Design lists). Each has a MUST FAIL case in `tests/intake-inventory-triggers.test.mjs` or `tests/intake-inventory-surfaces.test.mjs`. Also fixed after the first Indus re-run showed the shapes the first fixes missed (`9266e65bc`): a class method in a standalone script (`indus-logo.js` `IndusLogo.play`) takes the trigger of the caller whose argument can reach the write (`this.play( true )` from the kept mouseenter handler is hover, `this.play( false )` from the IntersectionObserver is scroll-into-view); `behavior: this.rm ? 'auto' : 'smooth'` is final-state; an early return under reduced motion whose block writes styles inside a callback is final-state; an unguarded JS style write the CSS transitions, under the draft's `*{transition-duration:.01ms !important}` rule, is final-state and takes the transition's duration and easing (per template element when it is known); a write behind a constant early return, or in a loop over a list only such code fills, is dead code and keeps its natural trigger; callers of a shared helper are one record per kind of trigger (a trigger's other callers are named in its detail); a page-map row with no route is no surface route. Verified on Indus (final re-run, 2026-10-19): of the 125 inventory rows marked `theirs`, 106 are gone and 19 remain. Fourteen of those 19 are Claude Design's values the reader cannot derive and keep Bean's `theirs` mark: two J-06 and J-19 timing pairs on elements the template cannot name (durations and easings), the `to` values written as prose (`select.value`, `window.scrollY`, the pointer position), the `playbackRate` from and to (four rows), and the home, about and our-story state lists (testimonial slides and the pages that hold the pinned timeline come from page data and a slide counter, not from sc-if conditions). Four lost the mark because their content changed and are left to `ours`: the three TR-070 and TR-106 rows now agree with Claude Design but for its stray `)`, and the J-12 duration now agrees but for its prose `200 (transform) / 300 (box-shadow)`. The toggling count's `theirs` mark was restored on the same fact, so 15 rows hold the mark. 111 rows are new, about 95 of them the extra per-trigger J records of `image-slot.js`'s `_applyView` (ours by default). The defect pass found the cause of an order-dependent verdict (FR-48-34 below): a plain link row in the mobile drawer left a 420ms close timer that re-closed the drawer after the state was put back, so the accordion row's code was never reached and read as a draft defect. Claude Design's TR-070 values carry a stray `)`: trim it wherever a `theirs` value is adopted.

### FR-48-26 — Three routing adapters
Claude Design drafts route in one of three ways. Intake has one adapter per way, picks the adapter from the code, and fails loudly when none or more than one matches:
1. **Hash routes with a `pages` getter.** Routes are the getter's keys; links are `#<key>` hrefs.
2. **`state.page` with `go()`.** Routes are the values `go()` is called with; links are the handlers that call it.
3. **One file per page.** Routes are the reachable `.dc.html` files (FR-48A-3); links are `href` values ending in `.dc.html`. Mama's uses this (`surfaces.json` routes such as `Home.dc.html#gifts`).

Each adapter outputs the route list and, for every link-like element, the route it reaches, so a `#` href becomes a page-map link (FR-48-30). A link whose target no adapter resolves is a gap row.

**Precedence.** A draft can match two adapters. When a draft has a `pages` getter and a `hashchange` listener, and its `go()` does nothing but write `location.hash`, it is a hash-route draft (adapter 1): `go()` is a link helper, not a second router, and its arguments are read as `#<key>` links. Indus's main draft is this hybrid (`get pages`, a `hashchange` listener, and `go(href)` writing `window.location.hash`). Any other double match stays a loud failure.

*Done when:* each adapter passes on a fixture of its kind, and each refuses the other two kinds' fixtures; a hybrid fixture copying Indus's pattern resolves to adapter 1, and a fixture whose `go()` also sets `state.page` fails loudly.

Status: built 2026-10-12 (`lib/intake-routing.mjs`, `lib/intake-ast.mjs`, `tests/intake-routing.test.mjs`). A `go()` counts as a router only when it sets `state.page` or writes `location.hash` (Mama's `SignIn` has a `go(mode)` view switcher). Indus resolves to adapter 1 with its 23 routes and 136 links (3 gap rows: two sector links built as `'#/' + s.key` and the `#/post-*` article links, which the `pages` getter does not hold); Mama's to adapter 3 (11 pages, no gap); Eye Care to adapter 2 (11 routes, 5 gap rows: a dynamic `go()` argument and bare `#` anchors).

### FR-48-27 — Two breakpoint width bases
A draft's breakpoint logic reads one width basis: the window (`innerWidth`; Indus and Mama's) or the root element's measured width (Eye Care). Intake records the basis per draft from the code that sets `state.w`, and every threshold (`w < 1024`, `w >= 1260`) is recorded with its basis and comparison operator. Indus's main draft branches at 768, 1024, 1200 and 1260 (`Indus Foods Website v2.dc.html`). The check (row 9, §10) tests each threshold at ±1px on that basis. A draft whose basis cannot be read is a gap row.

Status: built 2026-10-12 (`lib/intake-breakpoints.mjs`, `tests/intake-breakpoints.test.mjs`). Indus and Mama's read the window, Eye Care its root's measured width (ResizeObserver `contentRect`); a `matchMedia` query is a gap row.

### FR-48-28 — The determinism harness
Every render intake or the check takes runs with:
- a **virtual clock**: Playwright's `page.clock.install` at one fixed instant per run, which fakes `Date`, `performance.now`, `setTimeout`, `setInterval` and `requestAnimationFrame`. Time moves only when the harness calls `page.clock.runFor` in fixed 16ms steps, so every run sees the same sequence of ticks;
- a seeded `Math.random`;
- `localStorage` and `sessionStorage` seeded from the draft's own defaults (an empty store unless the draft's code reads a key it also writes at boot);
- fonts loaded from the replay cache (FR-48-23): `document.fonts.ready` resolved and every `<helmet>` face in `loaded` status before any read.

It reads in one of two modes:
- **Rest mode** (values, layout, states). A pending timeout fires when the clock passes it, up to 10 s of virtual time. A `setInterval` runs a fixed number of ticks (3) and then stays paused. A `requestAnimationFrame` loop runs a fixed number of frames (60, one virtual second) and then stays paused. One scroll pass runs from the top to the end of the page and back, in steps of one viewport height with the clock advanced 100ms at each step, so every `IntersectionObserver` reveal fires once. Infinite CSS and Web Animations are held at phase 0 (`getAnimations()` paused at `currentTime = 0`). Then the page is read.
- **Sample mode** (motion, row 11). The same set-up, then each animation under test is sampled at fixed times: Web and CSS animations by setting `currentTime` on the paused animation; timer and frame writers by advancing the clock to that time. The sample times are 0, the midpoint and the end of the recorded duration (FR-48-47).

**The reading record.** One read gives one JSON record per element and width (Appendix C, "Reading"): the surface, mode, width, state and sample time; the element's draft ID (`tpl` key) and selector path; its computed values for the properties the walker reads (`scripts/parity/lib/collect.mjs`); its declared values where the code states them; its border box; and the harness settings it was read under. Records are written sorted by draft ID, then path, then property.

Two runs of one surface at one width and mode give byte-identical records.

*Done when:* the byte-identical double run holds on every Indus surface in both modes; removing any one item above makes a fixture with a clock, a random number, a stored key, a timer, an interval, a frame loop, an observer reveal or a late font differ between runs or never settle; and sample mode reads a 600ms fade at 0, 300 and 600ms with the expected opacities.

Status: built 2026-10-12 (`lib/intake-harness.mjs`, `lib/intake-harness-page.mjs`, `lib/intake-reading.mjs`, `tests/intake-harness.test.mjs`; each item MUST FAIL when removed). The clock is installed by `page.clock.pauseAt` alone (an `install` followed by `pauseAt` leaks real milliseconds into `performance.now()`), and one real rendering frame follows every 16ms step so observers see each step. Finite CSS and Web Animations run on the document timeline, which the clock does not move, so rest mode finishes them before reading. Each settle waits out intervals to 3 ticks, so Indus's 6500ms testimonial interval makes a rest read take about 20 s of virtual time. Quiet steps are skipped (`lib/intake-harness.mjs::quietSkip`, `lib/intake-harness-page.mjs::harnessInit` `H.quietMs`): while no frame callback or idle callback is scheduled, no CSS or Web Animation runs and no timer is due, nothing on the page can change, so the clock jumps the whole 16ms steps before the next due timer in one `runFor` with no frame wait and then steps on as before; every timer still fires on the same 16ms grid at the same virtual time, the settle ends on the same step and the 30 s ceiling throws at the same step, so readings are byte-identical with skipping off (`INTAKE_SKIP_QUIET=0`, the reference run). An infinite animation keeps every step stepped (no looser tier). On the quiet-step fixture the 6500ms-interval settle falls from 21.5 s to 2.0 s of wall time with byte-identical readings (`tests/intake-harness-quiet.test.mjs`). Independent harness runs go side by side in one browser-unit pool (`lib/intake-pool.mjs`, `INTAKE_POOL` slots, default 4, one semaphore for every caller): the palette's route reads, the census's width-and-page units, the skeleton page runs, and the intake stages whose context does not depend on each other (`lib/intake-run-stages.mjs::STAGE_NEEDS`). Each unit keeps its own sandbox, context and clock, no width, tick, frame, forcing step or `stepMs` is dropped, and results are folded in the canonical order a one-at-a-time run produces (route, width then page, width, page, `STAGES` order), never in completion order; `INTAKE_POOL=1 INTAKE_SKIP_QUIET=0` is the reference run. On the intake-command fixture a full `intake.mjs` run takes 50.7 s on the code before these changes and 27.0 s now, with `intake.json` and `review.md` identical (`tools/compare-intake.mjs`, which leaves out only `takenOn` and a carried mark's `carriedFrom`). On Indus (2026-10-12, both runs on 2116f196a and one replay file) the default run and the `INTAKE_POOL=1 INTAKE_SKIP_QUIET=0` reference give byte-identical census, inventory, routing, breakpoints, page map, palette, Site Info, flags, notices and skeletons. Test 2's widths (`INTAKE_PARALLEL_WIDTHS=1`) and each page group's visits in slices (`INTAKE_PARALLEL_VISITS=<n>`) can run side by side (`lib/intake-defects.mjs::unreachedDefects`, off by default, each unit on its own copy of the work list merged in one-at-a-time order). The earlier difference on Indus (six mega-menu constructs: template elements 125 to 134, the timer at js:1276 and the animation at js:1278, reached at 768 only side by side) was the two-step chain's leaked drawer timer (FR-48-34), not the parallelism: with that fixed, side-by-side widths give `draftDefects`, `notDefects`, census and inventory identical to the one-at-a-time run (2026-10-19) with pass B 2.2 times faster while both shared the machine. Until 2026-10-20 `INTAKE_PARALLEL_VISITS` never reached the defect pass: the intake worker runs with `lib/intake-process.mjs::ENV_ALLOW`, which did not list it, so every run that set it ran the visits one at a time (`tests/intake-sandbox.test.mjs` now refuses an `INTAKE_*` variable the code reads that the list drops). Measured with the switch reaching the worker (Indus, 2026-10-20, widths side by side in both runs): `INTAKE_PARALLEL_VISITS=3` took pass A 621 s against 401 s one at a time, and pass B had not finished after about 105 minutes against 41 (stopped), so side-by-side visits stay off by default; a pass whose copies disagree runs everything again one at a time, and its log line now says so (`lib/intake-run-defects.mjs`). The replay fetch retries a socket `ENOBUFS` (`lib/intake-sandbox.mjs::fetchOrigin`); more than 4 browsers at once hit Windows ENOBUFS socket errors when other sessions were busy. On Indus, home and `#/about` at 375, 768 and 1440 in rest mode and the hero heading's 900ms entrance in sample mode are byte-identical across two runs.

### FR-48-29 — Prop variants
A component draft mounted through `dc-import` with `data-props` can render several variants. The design is the render with the default props, as the parent draft mounts it. Other variants are recorded as states only when a parent draft mounts them with other props. An enum prop no parent uses is listed, not built.

Status: built 2026-10-12 (`lib/intake-props.mjs::propVariants`, `lib/intake-defects-keys.mjs::mountedProps`, `tests/intake-inventory.test.mjs`). The props come from the `data-props` of the component's `<script data-dc-script>` (`lib/intake-props.mjs::declaredProps`); a mount's value is its literal attribute, or the option strings its bound `renderVals` key yields on the parent's syntax tree (a value it cannot read is a gap row). A non-default value a parent mounts is a state of the component's surface (`props.<name>` in its `state_keys`); an enum prop no parent passes is listed as `unused`, and an option no parent mounts in `unusedOptions`; neither is built. Mama's: `SiteHeader.current` gives 7 variant states, `ProductCard.size` one (`sm`); Indus's imports declare no props. Verified by `node --test scripts/computed-route/tests/intake-inventory.test.mjs` (with no parent passing `size`, no state and `size` unused: MUST FAIL).

### FR-48-30 — The page map (Spec 48A FR-48A-9)
Intake proposes `sites/<client>/build/page-map.json` from the adapter's routes (FR-48-26), or from the draft's embedded `<script type="application/json" data-sgs-manifest>` block when present (Eye Care). One row per route holds: `slug`, `title`, `parent`, `template` (a theme page template or a WooCommerce template), `menus` (each menu it sits in, with position and parent item), `postType` (a page; a blog post as `post`; a catalogue page as the WooCommerce shop or a product category archive, never a static page copying products; a single-product page as `product`, the design of WooCommerce's `single-product` template that every product uses), `collection` (`static`: the draft's items are content written into the page; `live`: the items come from WordPress posts or products), and `id` (empty until the site-build script writes it). Every CPT surface (header, footer, drawer, mega menu, modal, form, choice flow) gets its own row with its post type. Bean confirms the map once (FR-48-17). The row format is Appendix C, "Page map".

*Done when:* every route and every CPT surface in the census has one row, every link in the draft resolves to a row or a gap row, and the file validates against its schema.

Status: built 2026-10-12 (`lib/intake-pagemap.mjs`, `lib/intake-pagemap-surfaces.mjs`, `lib/intake-ast-eval.mjs`, `data/page-map.schema.json`, `tests/intake-pagemap.test.mjs`). Indus: 23 pages, 6 posts (the `#/post-*` articles), a header, footer, drawer, 4 mega menu panels and 4 forms; every link resolves (the routing reader's 3 gap rows close once loop variables are followed). Eye Care's rows come from its embedded manifest. A single-product route is a `product` row with template `single-product` (Bean, 2026-10-12: a shop needs its own product kind, never the shop page's).

### FR-48-31 — Palette role proposal
Intake builds the token-to-slug role proposal (§11, FR-33-2), which Bean confirms in the review. The tokens come from a route module, `scripts/computed-route/lib/tokens.mjs`, that parses `tokens/*.css` into declared tokens (name, value, `var()` chain resolved) with no render, and matches each to the draft's hex by where the census found that value in use. Intake never runs the extractor: R-47-1 forbids the route importing `plugins/sgs-blocks/scripts/`, the extractor reads the README rather than the token files today (FR-33-15), and it measures a rendered draft, which intake does not need for a role proposal. The extractor reads the token files and the confirmed role map later, in stage 2 (§11). Every colour outside the declared tokens stays a one-off hex.

*Done when:* `lib/tokens.mjs` lists every custom property in Indus's `tokens/*.css` with its resolved value, the proposal names a role for each used token, and a planted unused token is listed as unused, not proposed.

Status: built 2026-10-12 (`lib/tokens.mjs`, `lib/intake-palette.mjs`, `tests/tokens.test.mjs`, `tests/intake-palette.test.mjs`). Indus's three token files give 34, 27 and 13 tokens; slugs are read from `theme/sgs-theme/theme.json` at run time, so FR-32-14's five new slugs are proposed; a token with no confident role is `custom-<name>` (FR-33-2). Usage comes from rest-mode readings at 1440 per route.

### FR-48-32 — Site Info proposal with format validation
Intake harvests business details from the code: `tel:` and `mailto:` links, social links, the logic's data objects, and labelled text. Each value is validated by shape: a UK phone number of 10 to 11 digits after removing spaces (or `+44`); an email `is_email()` would accept; a social link with an http or https scheme on a known host (`brand-registry.json`); an hours range that expands to per-day keys; a postcode matching the UK pattern. A value holding `{{ }}`, a placeholder host (example.com) or `#` is refused with its reason. The proposal is a review row per key. `plugins/sgs-blocks/scripts/sync-business-info.py`, run as a command without `--push` (print only), is one proposal source beside the intake harvest; its output feeds the same review rows and it never writes to a site (FR-33-14). After Bean's mark, `plugins/sgs-blocks/scripts/provision-site-info-from-draft.py` applies it (FR-48-59); it is the one Site Info writer for a cloned site.

*Done when:* intake on Indus proposes its phone, email and social links, lists a planted placeholder address and a malformed phone number, and the confirmed set reaches Site Info through the provisioning script's dry-run table.

Status: built at intake 2026-10-12 (`lib/intake-siteinfo.mjs`, `lib/intake-siteinfo-shape.mjs`, `tests/intake-siteinfo.test.mjs`). Indus proposes its phone, email, WhatsApp link, two address candidates (the footer text and the contact data object) and per-day hours, and refuses its four `#/` social links; a dry run of `provision-site-info-from-draft.py --site indus-test` with the phone and email shows both as WRITE. `wa.me` is read as WhatsApp through a one-entry alias, because the brand registry does not list it. `sync-business-info.py` still has a `--push` write path; intake never passes it.

### FR-48-33 — Placeholder, stock and prototype-only flags
Intake flags three kinds of construct so that none is built as if it were final:
- **placeholder**: copy or data the draft marks as filler (lorem ipsum, "Your name", example.com, a `{{ }}` fallback string) or that the README's own placeholder tier names;
- **stock**: an image from a stock or preview source (FR-48A-9: credits are not recorded and real images arrive with the client's content);
- **prototype-only**: behaviour that only makes the prototype work (a fake basket in `localStorage`, a simulated submit, a `setTimeout` standing in for a server reply). WordPress supplies the real behaviour.

Each flag is a review row. Placeholder copy is written with the flag kept in `page-map.json`. Stock images upload as previews (FR-48-58).

Status: built 2026-10-12 (`lib/intake-flags.mjs`, `tests/intake-flags.test.mjs`). Indus: 36 placeholder rows (19 empty image slots, 12 `#/` social links, 4 README lines and one more), 3 stock image builders, 5 prototype-only rows (the trade application's stored draft and `Math.random` reference, the enquiry form's timed submit, the inline forms' thank-you).

### FR-48-34 — Draft defects and the missing-features list
- **Draft defects** are a closed list (DESIGN decision 3) with an operational test. A row is a draft defect only when one of these holds:
  1. the declared value holds an unresolved `{{ }}` binding at read time (Indus's mega-menu `style-hover`); or
  2. a code-declared state, motion or behaviour is unreached at every tested width (375, 768 and 1440) under the harness (FR-48-28), even with the state forced (hover and focus forced through the DevTools protocol, the state keys set that the code's own condition reads, the scroll pass run). Eye Care's reveal below 1440 is this case.

  The code's intent is built and the defect is listed for Bean and for Claude Design. Every other code-render disagreement is `render-wins`: the rendered value is written and the row is reported (§10, FR-48-36). A state reached at some tested widths and not others is not a defect: it is a breakpoint (row 9).
- **Missing features** are one line each: a construct the census found that no SGS block or feature holds. Bean marks each one "map to an existing block", "record as a deliberate difference", "build" or, for a seen-but-unsupported row (a capability the clone coverage map does not cover, `lib/intake-missing.mjs::coverageMissing`), "tracked gap" in its Phase 4 wave, which "accept all" sets. Stage 1 builds only what stops a main flow (buy, contact, apply).

Outcomes that are not defects (decided 2026-10-12 while building): a construct gated on a component prop no parent mounts is a prop variant (FR-48-29); a construct behind a constant guard the code itself fixes, reached only through a `renderVals()` key no template binds, or inside an `sc-if` whose loop-item value is false for every item of the draft's own constant data (with code reached only through elements inside one), is dead code (the code's intent is "off"); a construct inside code whose rendered elements are all flagged placeholder or prototype-only is prototype-only (FR-48-33). Defects are listed grouped by the class member or script that holds them, so the review marks a function, not each call site.

Seen-but-unsupported rows (built 2026-10-18): `lib/intake-usage.mjs` reads every capability a draft uses from its files, with the running page as the check, and `lib/intake-missing.mjs::coverageMissing` raises one row per capability the clone coverage map does not cover (§10), carrying its wave; a CSS property group is judged by the properties the draft used, so it raises no row when Fill reads them all (`scripts/computed-route/lib/fill-read.mjs::PROPS`, a shorthand only when every longhand is) and otherwise names the unread properties; review.md's Accept all marks it `gap:<wave>`, or `difference` when Bean excluded it (`node --test scripts/computed-route/tests/intake-usage.test.mjs scripts/computed-route/tests/intake-coverage-rows.test.mjs scripts/computed-route/tests/intake-review.test.mjs`).

Status: built 2026-10-12 (`lib/intake-defects*.mjs`, `lib/intake-missing.mjs`, `lib/intake-state.mjs`, their tests). On Indus, test 1 finds all seven bound `style-hover` rules, not only the mega menu's: the pinned runtime compiles a `style-*` attribute's text raw, so a `{{ }}` there never resolves and the browser drops the bound declaration. Test 2 over every route at 375/768/1440 forces hover and focus, state keys, every handler's event and code-wired listener, drag and press gestures with pointer coordinates inside the target's box (`lib/intake-defects-gesture.mjs`), two-step states to depth 2 (an opener from the pending rows' own state patches or a template handler on each of a loop's first four copies, then each handler on what it rendered, state put back after every attempt; `lib/intake-defects-chain.mjs`), a guard on a field only dead code writes, or nothing writes, is dead code (`lib/intake-defects-deadfield.mjs`), and so is a construct inside an `sc-if` whose loop-item field is false for every item of the draft's own constant data, or code reached only through a plain selector whose every matched element sits inside one (`lib/intake-defects-datagate.mjs::dataGatedWhy`: writes after creation followed by `lib/intake-ast-eval.mjs::trackWrites`, nesting from the census's stamped `parent` links; refused on state, props, an item where the field is true or unreadable). Before the data gate, Indus test 2 left 2 defects (from 218 at rest only, 15 before gestures and chaining): the footer opening-hours card's transition, which has no hover rule unlike its sibling cards, and `setupReveal`'s scale-in, whose `[data-draw-y]` element sits only in `<sc-if value="{{ b.isTimeline }}">` while no block of any page has type `timeline`. Measured 2026-10-12 with `dataGatedWhy` over the 305 test-2 candidates of Indus's static census (runtime marks from the 10:46 intake): 7 become data-gated dead code, the scale-in and 6 template rows inside `b.isTimeline` and `b.isQuotes` that were gap rows, so the next Indus run is expected to leave 1 defect; `b.isArticle` is refused, because the blog posts' pages are added by `this._pages['post-' + p.img] = …` and hold `article` blocks. Mama's (a text-only estimate; it has no replay file): 12 loop-item `sc-if`s, none provable. Each dead-code entry carries `deadKind` (`lib/intake-defects-static.mjs::DEAD_KINDS`: `unwired`, `constant-guard`, `data-gated`). Test 2 on Indus took about 75 minutes with a second run beside it, an upper bound. The not-a-defect list is kept whole in `intake.json`'s `notDefects` (built 2026-10-12, Bean: a misspelled wiring must be visible). `review.md` lists the dead-code entries whose `deadKind` is `unwired` (a handler, ref callback, timer or observer reached only under a `renderVals` key no template binding names, or a guard field nothing live writes; `lib/intake-defects-static.mjs::isUnwiredEntry`, which reads the note's wording only for a record without `deadKind`) as the `not-a-defect` section, default mark `not-a-defect` (a blank row takes it), alternative `defect`; a dead field with any write behind a constant guard is `constant-guard`. Constant-guard and data-gated dead code, prop variants, prototype-only and the other reasons are one header line counting each (`lib/intake-review.mjs::notDefectLine`). A `defect` mark on a not-a-defect row is read by stage 2's site build, which builds that construct's intent as a draft defect (not yet built; owner FR-48-18); nothing in stage 1 consumes it. Verified by `node --test scripts/computed-route/tests/intake-review.test.mjs` (16/16): a planted handler whose template binding is misspelled (`onTogle` for `onToggle`) appears in that section, the correctly spelled binding gives no entry, a dead field written behind a constant guard is counted, not listed, and a blank not-a-defect row is not missing, each failing with its rule removed; and by `node --test scripts/computed-route/tests/intake-defects-datagate.test.mjs` (7/7): the fixture's data-gated `sc-if`, the rows inside it and the `[data-draw-y]` reveal are dead code (the reveal a defect with the rule off), with negative controls for an item with the type, an `sc-if` true only on a page the run never opens, an `sc-if` on click-set state, and a write after creation that can give an item the type. The two-step chain lets the timers an attempt started finish before it puts the state back (`lib/intake-harness.mjs::drainTimeouts`, called through the forced page's `drain` by `lib/intake-defects-chain.mjs`): on Indus a plain link row in the mobile drawer started a 420ms close timer that the 400ms nudge did not wait out, restoring the state re-opened the drawer and the timer then closed it, so the accordion rows after it never rendered and `animateAcc` (the timer at js:1276, the animation at js:1278 and the transition at tpl 125) read as draft defects; with `acc` set to a row that has a panel they run (measured at 375: the 560ms timer once and seven animations). An attempt that changed no state also drains its timers, and when they change the state it is put back too (2026-10-20, `22f8e6872`: without that, a delayed close shut the drawer before the next attempt and the same three constructs read as defects again; on the Indus draft with those three rows alone, the code without the put-back flags the timer and animation, the fixed code none). `tests/intake-defects-chain.test.mjs` has a MUST FAIL case for each path. Open (QC council 2026-10-20, read from the code, not yet seen on a draft): after that drain the attempt is not classified again, so a state a timer opens (a menu or modal opened from a `setTimeout`) is put back without being forced as an opener (no hover forcing, no second-level handlers on what it rendered), and a timer that moves the URL after the drain leaves the URL moved for the next attempt; the shape is to re-read the URL and the state after the drain and send the attempt to the route branch or the opener flow, proved by a planted fixture for each and an Indus run with draftDefects unchanged.

### FR-48-35 — The intake record
`intake.json` holds the census, the re-derived inventory, the routing adapter and routes, the width basis and thresholds, the page map, the palette proposal, the Site Info proposal, the flags, draft defects, missing features, gap rows, and Bean's marks with the date. It carries the `MANIFEST.json` hashes it was taken from, so a later export makes it stale (G0, §14). It is validated against `scripts/computed-route/data/intake.schema.json`, whose top-level keys are Appendix C, "Intake record". The schema files for every record in Appendix C live in `scripts/computed-route/data/` and are checked by the route's tests.

Status: built 2026-10-12: `intake.mjs` writes `intake.json`, validated against `data/intake.schema.json` before it is written, and `tests/intake-schemas.test.mjs` holds every Appendix C schema file equal to the spec.

## 10. Value matrix

Every kind of value a draft holds has one way in, one way out, one check and one definition of a gap. "Read" is where the value comes from in the draft. "Write" is where it goes in SGS. "Check" is how the written value is proved. "Gap" is when the row reaches the gap list (§14).

**Both directions.** The matrix runs from the draft in: the kinds of value a draft holds. Coverage also runs from the framework out. Every capability the SGS framework offers (block settings by role and kind, effects, motion presets, `supports.sgs` keys, extensions, templates, parts, patterns, post types, plugins, theme-snapshot keys) and everything a draft can hold (HTML elements and attributes, input types, SVG elements, embed hosts, CSS at-rules, media features, property groups, selectors, functions and units, ARIA roles and attributes, construct kinds) is listed in `scripts/computed-route/data/capabilities.json`, generated by `capabilities.mjs --write` from the framework DB (read-only), the code and pinned web-platform data packages, never by hand. `data/clone-coverage.json` records for each capability how the route recognises, writes and checks it (`construct:<kind>` or a repo path with `#symbol`), Bean's signed exclusion, or a gap naming the Phase 4 wave of the clone coverage plan (`.claude/plans/2026-10-12-clone-coverage-foundation.md`) that closes it. `node scripts/computed-route/capabilities.mjs --gate` fails on a capability with no entry, an entry for an unknown capability, a reference that does not resolve, an unsigned exclusion or a gap with no wave, so a capability the route cannot clone is a failing test, never a memory. `--gaps` prints the current gap list by wave; counts live only in that output. FR-48-78 to FR-48-85 (§10.1) are the waves; intake raises a seen-but-unsupported row for every capability a draft uses that the map does not cover (FR-48-34).

The check is code to code, with the render confirming: the draft's declared value at each width and state is compared with the value the written SGS setting will emit, using calibration's record of which setting paints which property on which element (§3.2). The render at 375/768/1440 (plus 1920 on the walker) is the acceptance test, and the primary source only for values the draft never states. Elements pair by draft ID, never by matching words (§3.6). When code and render disagree, the render wins and the row is reported, except for a draft defect (FR-48-34).

**How "emitted" is computed.** For Indus, the emitted value is the live paired element's measured value: the walker's read of the built surface at the same width and state (§3.6), paired by draft ID. It is measured, not predicted. A predictive emitter, which computes the CSS a written setting will emit before the build, is its own later requirement (FR-48-76).

| # | Kind | Read (draft) | Write (SGS) | Check | Gap when |
|---|---|---|---|---|---|
| 1 | Structure | template elements, `sc-for`, `dc-import`, `surfaces.json` kinds | block choice, template parts, CPT posts | each draft ID pairs to one block | no block can hold it |
| 2 | Content | template text, logic data, route adapters, `tel:`/`mailto:` | block text, page-map links, Site Info | one-to-one; placeholders flagged | nowhere to live |
| 3 | Media and assets | `assets/`, image slots, stock previews | media library IDs | identity of the painted image | no slot |
| 4 | Colour | literals per width and state | token slug on exact match, else hex | declared vs emitted | no setting reaches it |
| 5 | Type, spacing, size, border, shadow | literals, `renderVals()`, `{{ }}` bindings | presets/tokens, else literal per tier; one shared setting per binding | declared vs emitted | as 4 |
| 6 | Layout | declared form (`repeat()`, `display`) | container layout settings | form plus rendered box | the setting can't take the form |
| 7 | Unstated values | one render per width | only where different from the calibrated default | render vs default | as 4 |
| 8 | Fluid values | declared `clamp()`/`vw` | fluid form where calibration proves it, else per tier | resolved per width | no setting accepts it |
| 9 | Breakpoints | logic thresholds | tier snap, block breakpoint, or listed custom CSS | flip at threshold ±1px | off-tier with no setting |
| 10 | States | `style-hover`/`-focus`, `sc-if`, `surfaces.json` | state settings, CPT surfaces | every state reached | no state setting |
| 11 | Motion | `animations.json` re-derived at intake, timer-written styles | per-element `sgsMotion` (FR-48-47, FR-48-78) | parameters plus sampled pose | a value no motion field holds is reported by name; its capability is a gap in the coverage map (`capabilities.mjs --gaps`, wave "motion model additions") |
| 12 | Behaviour | handlers, timers, observers, `surfaces.json` | the SGS setting a recogniser maps by framework-DB query (§10.1) | scripted flow | the capability is a gap in the coverage map (`capabilities.mjs --gaps`, wave "behaviour recognisers"), listed for Bean as a seen-but-unsupported row |
| 13 | Site level | `tokens/*.css`, `<helmet>` fonts, routes | snapshot, Site Info, menus, pages, templates | confirmed page map; reachability | n/a |

### FR-48-36 — The confirm record
Every written value carries a confirm record in the surface report: draft ID, block and attribute, property, width, state, declared value, emitted value, rendered draft value, rendered live value, verdict (`confirmed` | `render-wins` | `draft-defect` | `open`) and the tolerance used. The tolerances, by property type: colour ΔE ≤ 2 (CIEDE2000, alpha ±0.02); length ±0.5px declared and ±1px rendered; font family by first loaded family; font weight exact; line height ±0.5px; transform matrix entries ±0.01; time ±10ms. These are provisional, calibrate on Indus (R-47-7 keeps the snap tolerances).

The verdict comes from three comparisons, each within tolerance ("agree") or not: declared against rendered draft (D–R), emitted against rendered live (E–L, which for Indus is one reading, so it always agrees, until FR-48-76), and rendered draft against rendered live (R–L). With no declared value (row 7), D–R is skipped and R–L alone decides.

| D–R | R–L | FR-48-34 test | Verdict | What is written |
|---|---|---|---|---|
| agree | agree | n/a | `confirmed` | the declared value |
| agree | disagree | n/a | `open` | unchanged; the row goes to Solve, then §14 |
| disagree | agree | fails | `render-wins` | the rendered draft value (already live); reported |
| disagree | disagree | fails | `open` (`render-wins` pending) | the rendered draft value is the target; Solve, then §14 |
| disagree | any | passes | `draft-defect` | the declared value; listed (FR-48-69) |

With a predictive emitter (FR-48-76), an E–L disagreement is its own verdict, `open` with reason `emitter`, owned by the route (W-route), because the setting emits something other than what the live page shows.

Status: the record and its D–R half are built (2026-10-19, `scripts/computed-route/lib/fill-confirm.mjs`, in `fill-report.json` as `confirm`): every tolerance above, except that colour uses the route's existing CIE76 ΔE (`lib/normalise.mjs::deltaE`) rather than CIEDE2000; a declared value the browser resolves itself (`var()`, `calc()`, `clamp()`, a percentage or viewport unit, a CSS-wide keyword, `currentcolor`, a keyword the render states as a plain length such as `thin`) counts as agreeing, its render being its value, so a percentage is never flagged; a value the browser serialises in another shape (a shadow, a radius expanded to four corners) and a named colour other than `transparent` cannot be compared and stay `open`. The ±1px rendered tolerance belongs to R–L. The rendered-live value and R–L are not built: the check fills them once it reads the built page.

### FR-48-76 — A predictive emitter
A module computes, from a written setting and the block's calibration (§3.2), the value the setting will emit on its calibrated element, before any build. The check then compares declared against predicted emitted (code to code) and confirms against the live read; a disagreement between predicted and live is an `emitter` row (FR-48-36). Not needed for Indus, where the emitted value is the live read; it is wanted when a pre-build check would save a build round.

*Done when:* for every confirmed row on one Indus surface, the predicted value equals the live read within tolerance, and a planted calibration with a wrong transform produces `emitter` rows.

Status: not built.

### FR-48-37 — Row 1, structure
**Read:** template elements by `data-dc-tpl`, `sc-for` loops, `dc-import` mounts and `surfaces.json` kinds (page, header, footer, drawer, menu, panel, form, form-step, modal, accordion, result, backdrop, global; the kinds in the Indus and Mama's exports). **Write:** the block choice in the skeleton; template parts; one CPT post per CPT surface (FR-48-30). **Check:** every draft ID that paints pairs to exactly one block (`cr-ref-<surface>-<id>`), or is covered by a recorded parent. **Gap:** no SGS block or composition can hold the element (F-block, §14).

Status: pairing is built (Spec 47 §3.6, identity pairing). The skeleton block choice from census hints is not built.

### FR-48-38 — Row 2, content
**Read:** template text, logic data (getters, arrays, `renderVals()` content), the routing adapter's links, `tel:` and `mailto:` links. **Write:** block text and item arrays; page-map links; Site Info (FR-48-32). **Check:** every text node pairs one to one with a block field, with a count check per array (a getter yielding n items gives n block items). Placeholders keep their flag. **Gap:** the content has nowhere to live in any block or store.

Status: text and presence rows are built (Spec 47 §3.6, `lib/issue-classes.mjs::CONTENT_KINDS`). Logic-as-data reading and the count check are not built.

### FR-48-39 — Row 3, media and assets
**Read:** files under `assets/`, image slots, stock previews. **Write:** media library attachment IDs from the upload map (FR-48-58). **Check:** the painted image's identity (the attachment's source file hash equals the asset's hash). The rendered box is covered by row 5. **Gap:** a painted image with no block image slot.

Status: not built.

### FR-48-40 — Row 4, colour
**Read:** literal colours per width and state from inline `style`, `style-*` rules and `renderVals()`. **Write:** the palette slug when the hex equals a confirmed token's value exactly; otherwise the hex (R-47-7). **Check:** declared against emitted, then the render confirms. **Gap:** no SGS setting reaches the painted element's property (F-setting, after G0-G7).

Status: the snap and write are built (`lib/normalise.mjs`, `lib/resolve.mjs`). Declared-against-emitted is not built.

### FR-48-41 — Row 5, type, spacing, size, border, shadow
**Read:** literals, `renderVals()` values per width, and `{{ }}` bindings. **Write:** a preset or token on an exact match, else a literal per tier. Elements sharing one binding share one setting: a binding used by several sections becomes one token or preset, never n copies. **Check:** declared against emitted. **Gap:** as row 4.

Status: per-element literal writing is built (Fill). Binding grouping is not built. The per-tier section padding and gutter tokens it needs are a Spec 32 hand-off (§16).

### FR-48-42 — Row 6, layout
**Read:** the declared form (`display`, `grid-template-columns: repeat(...)`, `flex-direction`, `flex-wrap`).

**Write:** the container's layout settings in the declared form. **Check:** the form itself, plus the rendered box of each child. **Gap:** the setting cannot take the form. A calibration fault is never this gap: `gridTemplateColumns` dead and `layout` unrouted are instrument debt (I-calibration, I-unrouted) until fixed in stage 0.

Status: not built for declared forms; the measured route writes used values today.

### FR-48-43 — Row 7, unstated values
**Read:** one render per width, for properties the draft never states (browser defaults, inheritance). **Write:** only where the value differs from the block's calibrated default paint (R-47-5). **Check:** render against default.

**Gap:** as row 4.

Status: built (Spec 47 R-47-5, §3.2).

### FR-48-44 — Row 8, fluid values
**Read:** declared `clamp()`, `min()`, `max()` and `vw` values. **Write:** the fluid form, only where calibration records that the setting accepts it; otherwise the resolved value per tier. **Check:** the resolved value at each width. **Gap:** no setting accepts a fluid value and per-tier values miss the draft beyond tolerance between tiers.

Status: not built. None of the 94 calibration caches records an accepted value form (`grep -l clamp scripts/computed-route/cache/*.json` returns no file), so every fluid value is written per tier today and the row is instrument debt (FR-48-49).

### FR-48-45 — Row 9, breakpoints
**Read:** logic thresholds with their width basis (FR-48-27). **Write:** by FR-48-50. **Check:** the live layout flips at the **written** width: between written − 1px and written + 1px, and not at any other width in the sweep. For a threshold written as-is (a block breakpoint setting or custom CSS) the written width is the draft's threshold. For a snapped threshold it is the tier, and the gap between the draft's threshold and the tier is the accepted `breakpoint-snap` ledger entry, not a failure. **Gap:** an off-tier threshold with no block setting and no listed custom CSS.

Status: not built.

### FR-48-46 — Row 10, states
**Read:** `style-hover` and `style-focus` rules, every `sc-if` with its classification (`METHOD.md` §7), and `surfaces.json` states. **Write:** state settings (hover, focus, active, open); CPT surfaces for drawers, modals and mega menus. **Check:** every state is reached, by the generated state map (FR-48-13) that mirrors `surfaces.json` and is diffed against the surface's `state-map-reasons.json`, with an optional click path. **Gap:** no state setting holds it.

Status: walker states are built (Spec 47 §3.7). The generated state map is not built.

### FR-48-47 — Row 11, motion
**Read:** the re-derived animation inventory (FR-48-25) and timer-written styles. **Write:** per-element `sgsMotion` values (Spec 38A §6.2, §14, FR-38A-33) into all three motion panels: each element's entrance with its own per-device delay into `entrance`, its hover transitions into `hover`, and its looping animations into `effect`, each value a token reference where it equals the client's token; FR-48-77 adds the script-driven effects. **Check:** the parameters (keyframes, duration, easing, delay, iterations, trigger) are compared code to code, then the pose is sampled in the harness's sample mode (FR-48-28) at 0, the midpoint and the end of the recorded duration, on the virtual clock. **Gap:** a value no motion field holds is reported by name, and its capability is a gap in the coverage map's wave "motion model additions" (Spec 38A FR-38A-57), owner Spec 38. A reveal unreached at every tested width under a forced state is a draft defect (FR-48-34), not a gap.

Status: the parameter comparison is built (2026-10-19): Fill writes each node's `sgsMotion` through `scripts/computed-route/lib/fill-motion.mjs::motionWrites` (FR-48-78), and each entrance is compared with what `lib/fill-entrance.mjs::sampleMotion` samples at 375, 768 and 1440 (`lib/motion-check.mjs::entranceCheck`; the probe sweeps down the page so scroll entrances play): duration and delay, the first frame's pose (the code's from transform as a whole matrix in its own order, `lib/css-matrix.mjs`, else travel, scale, rotation and opacity one by one) and the easing the render runs; an endless animation the code states in full is compared with the animation measured on the element at every width it was found (`lib/motion-loops.mjs::loopCheck`). The pose is also sampled (2026-10-19): the probe pauses every finite animation the element ran and seeks it to 0, half and all of its own run (FR-48-28's sample mode for Web and CSS animations, which seeks rather than moves the clock), and `lib/motion-sample.mjs::sampledPoseDifferences` compares opacity and the composed transform with the pose the code states there (its keyframes, its easing over the run for a Web Animation or per keyframe stretch for a CSS animation, its direction); `scripts/computed-route/tests/motion-sample.test.mjs` proves it in Chromium, with a misread curve, travel or animation kind turning it red. On the Indus header and home page every one of the 17 written entrances agrees at 0, half and all of its run at 375, 768 and 1440, each compared on at least one channel (a width where no channel can be compared is reported, never counted as agreement); the tolerances are rounding sized (opacity 0.01, a matrix entry 0.005, a move 0.5px). A council (2026-10-19) found a reverse run with an asymmetric easing written with the wrong curve: `scripts/computed-route/lib/motion-layers.mjs::asPlayed` now mirrors the easing (E'(x) = 1 - E(1 - x), `::mirrorEasing`), and the writer names a curve with no mirror. Not read yet: a keyframe's own easing (a CSS stop's `animation-timing-function` or a Web Animations keyframe `easing`), which intake drops (`lib/intake-inventory-target.mjs`); no Indus or Mama's keyframe sets one, and the sampled check reports such an entrance as differing. The virtual clock is not needed here: the writer writes only Web and CSS animations as entrances, and script-written motion waits for FR-48-77's recognisers (behaviour recognisers wave).

### FR-48-48 — Rows 12 and 13, behaviour and site level
**Behaviour.** **Read:** handlers and `surfaces.json` flows. **Write:** the SGS setting a recogniser maps by framework-DB query (§10.1, FR-48-80). **Check:** a scripted flow per main path (§3.7). **Gap:** a seen-but-unsupported row on the missing-features list (FR-48-34), never a silent drop.

**Site level.** **Read:** `tokens/*.css`, `<helmet>` fonts and routes. **Write:** the snapshot (§11), Site Info, menus, pages and templates (§12). **Check:** the confirmed page map and the reachability of every route on the live site. Site-level rows never reach the gap list; a failure is a stage 2 exit failure.

Status: flows are built (Spec 47 FR-47-7); the site-level check is not built.

### FR-48-49 — Uncalibrated settings
R-48-4 (Instrument debt is never a gap, §1) governs this section.

Status: not built (today an uncalibrated row is triaged W, `lib/triage.mjs`).

### FR-48-50 — The breakpoint rule
For a draft threshold `t` on its width basis, and the SGS tiers `T ∈ {768, 1024}` (Spec 35 D2):
1. **Snap** when `min over T of |t − T| ≤ 0.05 × T` (5% of the tier). The nearest tier wins: 1060 snaps to 1024 (|1060 − 1024| = 36 ≤ 51.2). Every snap writes a divergence-ledger entry automatically (§3.5): rule `breakpoint-snap`, the node, the draft threshold, the tier and the distance in px, and `decided` naming this rule. It is a house-rule entry, so it cites no register item. Spec 32 FR-32-13 allows this snap (Bean's decision); the residual rule there covers only a threshold outside the tolerance. **Why 5% (provisional):** it lets a draft threshold that sits a few dozen pixels from a tier (1060 against 1024, 36px) use the tier the client already edits, while every Indus threshold that is not already a tier (1200 and 1260, 17% and 23% above 1024) stays off-tier and keeps its exact width. The `breakpoint-snap` entries from the Indus run move it: a snapped threshold whose layout between the draft threshold and the tier differs visibly from the draft (an open row in that width band, or Bean's eye) lowers it; no such row across the snaps leaves it or raises it.
2. Otherwise use the block's own breakpoint setting when one exists (for example a header's burger breakpoint). A structured setting is preferred to custom CSS wherever one exists.
3. Otherwise write the block's custom CSS (`sgsCustomCss`) with a scoped media query, under Spec 32 FR-32-13's precedence rules and FR-32-20's hardening, and list it in the surface report. Route-written CSS carries the label FR-32-20 defines, so the client can see which rules the route wrote.

**Prerequisite (met 2026-10-12).** Spec 32 FR-32-20 is built: `plugins/sgs-blocks/includes/custom-css.php::render_custom_css` parses every rule through `includes/class-custom-css-scoper.php::Custom_Css_Scoper` and confines it to the instance (rules inside `@media` included; what cannot be confined is refused), takes the scope class from the instance key `sgsCustomCssId`, lifts core blocks' CSS to the head too, scopes the editor canvas through the same rules, and shows the route's label (`sgsCustomCssNote`) in the inspector. Indus's header branches at 1200 and 1260 (`Indus Foods Website v2.dc.html`), which no tier snaps to, so the route writes them through this channel.

*Done when:* a 1060 threshold writes the 1024 tier and one `breakpoint-snap` ledger entry with distance 36, and the flip check passes at 1023/1025; a 1200 threshold writes a bounded, scoped, labelled rule that flips at 1199/1201 and leaves 375 and 1440 unchanged; and an unscoped test rule is refused.

Status: not built. The `breakpoint-snap` rule is not in `lib/ledger.mjs::RULES` nor in `lint.mjs::HOUSE_RULES`, and the route does not yet write `sgsCustomCssNote` with a rule.

### 10.1 Recognisers and the coverage waves

One recogniser framework serves every wave that needs one: a mechanism signature, read from the re-derived inventory (FR-48-25), the census (FR-48-24) and the styles sampled in the harness's sample mode (FR-48-28), identifies a behaviour or effect and its options by what the code does, never by names in the draft, and maps it to an SGS setting by framework-DB query (FP-1: each behaviour and content setting's meaning, trigger and parameters, coverage plan Phase 3), or raises a gap that names the mechanism. Intake proposes one review row per recognised effect or behaviour and Bean confirms the mapping once; Fill writes it. Each wave below closes one group of coverage-map gaps; the clone coverage plan's Phase 4 orders them by the Indus gap list, and each wave's own list is the lines of `capabilities.mjs --gaps` that name it.

### FR-48-77 — Effect recognition: draft motion to SGS effects

A draft's interactive and scroll effects are usually written in its own plain JavaScript, while SGS expresses the same effects as block settings and Spec 38 effects, some of them GSAP (Tier G). FR-48-47 covers entrances, hover transitions and looping animations the inventory records, so without this step a clone silently drops every script-driven effect. This is the first recogniser of the family above.

**Read:** the re-derived inventory (FR-48-25) with its listeners and their targets, the census, and the styles that scroll and pointer handlers write per width in the harness's sample mode (FR-48-28). **Recognise** each effect by its mechanism, never by names in the draft: a section held in place over a scroll range while a scroll handler writes a translate on a wider track is a pinned horizontal scroll; a pointer handler writing custom properties that a `clip-path` or `mask` on a layer inside its target consumes is a pointer-tracked reveal; a pointer handler translating its target toward the pointer is a magnet; one writing `rotateX`/`rotateY` from the pointer is a tilt; an endless translate on a duplicated track is a marquee; a property written in proportion to scroll progress is a scrub. **Map** each recognised effect to the SGS setting that expresses it, chosen from the framework DB (the `fx_effects` rows and each block's declared effect support, for example `sgs/timeline`'s horizontal orientation with its `pinned-horizontal` scroll effect, which runs the `horizontal-panel` effect), never from a hand-written list, with its parameters (distance, duration, easing, radius) from the recorded values. **Write:** intake proposes one review row per recognised effect (a new Appendix C row type, `effect`) and Bean confirms the effect-to-setting choice once; Fill writes the confirmed effect as per-element `sgsMotion` values (Spec 38A §6.2, §14, FR-38A-33) on the block the skeleton chose, into whichever of the three motion panels owns it (`hover` for a magnet, tilt or sheen, `entrance` for a reveal, `effect` for a pinned track, cursor reveal, parallax or marquee) with its recorded parameters; the cursor reveal maps to the `cursor-field` `image-reveal` type (Spec 38A FR-38A-34). **Gap:** an effect that no `fx_effects` row or block setting expresses is a gap owned by Spec 38 that names its mechanism. A draft that loads a motion library itself (GSAP, Lenis) is named per §3.6 item 18, and its calls are recorded through a sandbox-pinned copy of that library before recognition.

*Done when:* on Indus, the Heritage section's pinned horizontal track is recognised and mapped to `sgs/timeline` horizontal with the `pinned-horizontal` scroll effect; the brand pages' ingredient-card cursor reveal (`[data-peek]`: a circular `clip-path` image layer that follows the pointer), the `[data-mag]` magnet, the `[data-tilt]` tilt and the logo marquee are each recognised and either mapped or raised as a named Spec 38 gap; a planted effect with no SGS equivalent produces a gap row naming its mechanism; and each case fails with the recogniser removed.

Status: not built (Bean, 2026-10-12: before Appendix B step 21; sequenced by the clone coverage plan's Phase 4). Needs FR-48-25, which is built. The cursor reveal's circular image layer is the `cursor-field` `image-reveal` field type (Spec 38A FR-38A-34, not built).

### FR-48-78 — Motion writer (coverage wave 4.0)
**Read:** the re-derived animation inventory and timer-written styles (FR-48-47), the effects FR-48-77 recognises, and a draft's `marquee`. **Write:** per-element `sgsMotion` values through `scripts/computed-route/lib/motion-validate.mjs` (Spec 38A FR-38A-33, its phase M7), reading motion fields from the framework DB as Spec 38A decision 3 settles it, each value a token reference where it equals the client's token. **Check:** FR-48-47's parameter comparison and sampled pose. Existing requirements that own part of it: FR-48-25, FR-48-28, FR-48-47, FR-48-77.

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "motion writer (4.0)" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34) and its live page pairs with the draft at 375, 768 and 1440 for that capability; and with the writer removed the same draft raises the row again.

Status: built (2026-10-19, clone coverage step 4.0, `.claude/plans/2026-10-12-clone-coverage-foundation.md`). The done-when holds: `node scripts/computed-route/capabilities.mjs --gaps` lists nothing in the wave "motion writer (4.0)" and `--gate` exits 0; `scripts/computed-route/tests/motion-planted-draft.test.mjs` plants a draft whose `<marquee>` (scrollamount 3, every 60ms, right: 50px/s) and SVG `<animate>` (opacity 1 to 0.4 and back over 2s) raise no seen-but-unsupported row through the real usage read and coverage map, raise each again with the writer's entry removed, and are written as validated layers; and on indus-test page 60 (`/motion-writer-proof/`, built from `sites/indus-foods/build/motion-proof.tree.json`), `sites/indus-foods/build/qa/probe-motion-proof.mjs` passes 27 of 27 at 375, 768 and 1440: the Indus draft's hero delays 80/190/300/410ms over 900ms, the scroll reveal at 850ms, grid items at 800ms with an 80ms step, the Indus entrance curve, the Indus marquee at 45px/s left (44.6 to 45.6 measured), and the planted pulse dipping to 0.40 every 1990 to 2022ms. A three-rater council (2026-10-19) reviewed the step; its findings are fixed (`17a84b42b`): only an endless animation is an effect (one the draft's own code starts only when the render shows it running untouched; a counted repeat or a visitor-started loop is reported), a move written after a flat turn or resize is rewritten exactly into the model's order and one no exact rewrite holds is reported, and the render check compares pose and easing as above. What it writes: entrances (multi-keyframe ones as `values.keyframes`, CSS `@keyframes` stops read by intake, clip-path insets as the clip channel), hovers (ring and accent-line shadows, perspective, resting tilts), and endless animations as `effects` layers (`lib/motion-loops.mjs`: marquee px/s, ambient float, SVG pulse, Ken Burns; `<marquee>` and SVG `<animate>`/`<animateTransform>`), every effect through `lib/motion-effects.mjs::writeEffect`, which FR-48-77's recognisers will call. A reverse run is written forwards with its keyframes mirrored and its easing mirrored (E'(x) = 1 - E(1 - x), `lib/motion-layers.mjs::asPlayed`; a session council found it written with the unmirrored curve, fixed 2026-10-19); a curve with no mirror is named. A loop no effect draws, or a value the motion model has no field for, is reported by name: skew, a slanted rotate3d, a true 3D matrix and `steps()` wait for Spec 38A FR-38A-57 (after the three test sites are cloned, Bean 2026-10-19). The pose sampled at 0, the midpoint and the end is compared too (FR-48-47, `lib/motion-sample.mjs`). Built 2026-10-18 (half A): `entrance.base` and `hover.state` per element (`scripts/computed-route/lib/fill-motion.mjs::motionWrites`, layers in `lib/motion-layers.mjs`, fields, targets and presets read from the framework DB by `lib/motion-db.mjs`, token references by `lib/motion-tokens.mjs`, every document through `lib/motion-validate.mjs`). Values come from the inventory's code; an entrance the draft's code picks at run time is matched to the render by its from-pose, a per-item delay the code computes is snapped to the code's own offset and step, and a record the render refutes at every width is not written. On the Indus home page and header (intake's proposals standing in for the skeleton) it writes 17 entrances, 9 hover moves, the brand strip's marquee and the run-time float. Bean ruled (2026-10-18, "Writer for all") that this writer writes every panel and effect, and that recognising an effect a draft builds in its own script is the behaviour recognisers wave (FR-48-77), so those coverage entries move to that wave with their write and check references set.

### FR-48-79 — Modes and values with no CSS property
**Read:** layout and variant modes, enum and boolean modes, fluid values (`clamp()`, `min()`, `max()`, `calc()`, viewport units), breakpoints (CSS `@media` thresholds as well as the logic's width comparisons, which are all `lib/intake-breakpoints.mjs` reads today), conditional styling (screen-kind media features, scrollbar parts) and presentational attributes whose CSS Fill does not read (`data/presentational-hints.json`). **Write:** the block setting whose meaning the framework DB records, by query; a threshold by FR-48-50. **Check:** the setting's rendered effect at each width. Existing requirements that own part of it: FR-48-42, FR-48-44, FR-48-45, FR-48-49, FR-48-50.

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "modes and values with no CSS property" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34) and its live page pairs with the draft at 375, 768 and 1440 for that capability; and with the writer removed the same draft raises the row again.

Status: not built. Needs coverage plan Phase 3 (setting meanings in the DB).

### FR-48-80 — Behaviour recognisers
**Read:** handlers, timers, observers, refs and data hooks with their targets. **Recognise** each behaviour by its mechanism (a timer advancing an index over an `sc-for` is a carousel with its autoplay interval, loop and dots; a handler toggling one panel of several is tabs or an accordion with its open state; a number written toward a target is a counter; a time difference written each second is a countdown; a class set past a scroll offset is a sticky header), and native `dialog`, `details` and popover. **Write:** the block and its behaviour settings, chosen by framework-DB query. **Check:** a scripted flow (§3.7) reaches the same states with the same timings. Existing requirements that own part of it: FR-48-34, FR-48-48, FR-48-77.

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "behaviour recognisers" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34) and its live page pairs with the draft at 375, 768 and 1440 for that capability; and with the recogniser removed the same draft raises the row again.

Status: not built. Needs coverage plan Phase 3.

### FR-48-81 — States
**Read:** every pseudo-class the draft styles (`:hover`, `:focus`, `:focus-visible`, `:active`, `:checked`, `:open`, `:popover-open` and the rest), `style-*` rules, and ARIA states (`aria-expanded`, `aria-pressed`, `aria-current`, `aria-checked`, `aria-hidden`). **Write:** the state settings (hover, focus, active, open, checked) and CPT surfaces for drawers, modals and mega menus. **Check:** the generated state map reaches every state (FR-48-13, FR-48-46). Existing requirements that own part of it: FR-48-13, FR-48-46, FR-48-34 (the forced-state test).

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "states" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34) and its live page pairs with the draft at 375, 768 and 1440 for that capability; and with the writer removed the same draft raises the row again.

Status: not built.

### FR-48-82 — Content, media and icons
**Read:** content values, images, `<picture>`, video and audio, third-party embeds (an oEmbed host or another host, such as a map), SVG drawings, icons, and the ARIA semantics content carries (`aria-label`, `role="img"`). **Write:** block text and item arrays, media library IDs from the upload map, core or SGS embed blocks, icon settings, and the accessible names. **Check:** FR-48-38's one-to-one text pairing and FR-48-39's image identity. Existing requirements that own part of it: FR-48-11, FR-48-38, FR-48-39, FR-48-58.

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "content, media and icons" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34) and its live page pairs with the draft at 375, 768 and 1440 for that capability; and with the writer removed the same draft raises the row again.

Status: not built.

### FR-48-83 — Shop, forms and data
**Read:** form controls, their attributes and input types (required, placeholder, autocomplete, file `accept`, select options), validation, consent and spam protection, product and collection data, and the shop surfaces. **Write:** `sgs_form` posts and their fields, product and collection data, and the shop blocks. **Check:** a scripted submit, add-to-basket and filter flow. Existing requirements that own part of it: FR-48-57, FR-48-60, FR-48-61, FR-48-62, FR-48-63.

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "shop, forms and data" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34) and its live page pairs with the draft at 375, 768 and 1440 for that capability; and with the writer removed the same draft raises the row again.

Status: not built.

### FR-48-84 — Site and surfaces
**Read:** helmet fonts and site tokens, routes, dark mode (`prefers-color-scheme`), SEO meta (`<title>`, `<meta>`), search, cookie consent, popups and floating calls to action, booking, newsletter signup, and the 404, search and blog templates. **Write:** the snapshot, Site Info, pages, templates, menus and the site's surfaces (§12). **Check:** the confirmed page map and the reachability of every route (FR-48-48). Existing requirements that own part of it: FR-48-30, FR-48-48, FR-48-55, FR-48-56, FR-48-57, FR-48-58, FR-48-59.

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "site and surfaces" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34) and its live page pairs with the draft at 375, 768 and 1440 for that capability; and with the writer removed the same draft raises the row again.

Status: in progress (2026-10-20, plan `.claude/plans/2026-10-20-site-surfaces-wave.md`). The draft head is covered: `<link>`, `<meta>`, `<title>`, their attributes and `construct:helmet-font` are recognised by `scripts/computed-route/lib/intake-head.mjs::readHead` (every head item it does not clone is its own `missing:head:<what>` row, wave site and surfaces), the fonts are written by the snapshot's self-hosted faces and checked by `lib/head-check.mjs::fontCheck`, charset and viewport are WordPress's, a description is the page excerpt, and the title gives the site title and tagline (`lib/intake-siteinfo.mjs::titleCandidates`), each checked on the live head by `headCheck` (`head-check.mjs <client> [--url]`; `tests/intake-head.test.mjs`). The font check reads the design system's `tokens/typography.css` when the export has one (`lib/head-check.mjs::tokenFonts`), else the head's font loads. It found Geist Mono missing from the pushed Indus snapshot: the extractor added a family only when the measured render painted it, and Geist Mono paints only in the mega menu, drawer and timeline numbers. The extractor now adds every family `tokens/typography.css` declares (`plugins/sgs-blocks/scripts/theme-extractor/used_fonts.py::add_token_families`), and its `@import` reader no longer cuts a Google Fonts address at the `;` between weights (`import_urls`); the Indus snapshot carries the self-hosted Geist Mono family and `head-check.mjs indus-foods` passes. The snapshot push and the theme deploy that serves the font file wait for Bean's go. Not built: the wave's capabilities neither draft uses (templates, parts, post types, snapshot keys, view transitions, dark mode, forced colours, page transitions, scroll smoother; coverage plan Phase 4).

### FR-48-85 — Draft reading
**Read** what the route does not read yet: construct kinds with no reader in the registry (FR-48-24), container queries and `scroll-state()` (their conditions are dropped by `scripts/computed-route/lib/intake-inventory-css.mjs::cssBlocks`), selectors, the CSS property groups and functions `scripts/computed-route/lib/fill-read.mjs::PROPS` does not read in full, custom elements the draft defines, and shadow DOM plumbing (`part`, `slot`). **Write:** nothing of its own: a reader hands its values to the wave that writes them. **Check:** the census or Fill reads the value, and the usage read's runtime check (FR-48-34) shows nothing the file read missed. Existing requirements that own part of it: FR-48-7, FR-48-24, FR-48-25.

*Done when:* `node scripts/computed-route/capabilities.mjs --gaps` lists no capability in the wave "draft reading" (each is covered, with recognise, write and check references that resolve, or excluded by Bean) and `--gate` exits 0; a planted draft using one of the wave's capabilities raises no seen-but-unsupported row (FR-48-34), the census or Fill reads its value and the usage read's runtime check names nothing the file read missed; and with the reader removed the same draft raises the row again.

Status: in progress (2026-10-19; Bean's order: what the Indus and Mama's drafts use first, 66 of the 352 entries, then the rest by reader; the 89 vendor-prefixed CSS properties are read, not excluded). Built: the construct readers (`scripts/computed-route/lib/intake-construct-readers.mjs`, `tests/intake-construct-readers.test.mjs`; 14 of 14 mutations red), so every construct kind but `helmet-font` has a registry reader; `construct:sc-if` and `construct:style-hover` are read and wait for their writer in the states wave. Fill reads every property the code declares (FR-48-8, 2026-10-19), matched by what it does against SGS (`.claude/reports/2026-10-19-css-equivalence-audit.md`). Custom elements are covered (the skeleton's logo and media rules, `scripts/computed-route/lib/skeleton-rules.mjs`); Bean excluded the document plumbing and the internals of a draft's own components (57 entries, 2026-10-19: WordPress supplies its own document, and a component clones as a whole); `<style>` and `<script>` are covered by the CSS and head-script readers; the document title, `<meta>` and font `<link>`s moved to site and surfaces (FR-48-84: nothing reads the title, which the Mama's redesign sets as its site name and tagline). The CSS functions and the `fr` unit the two drafts use are written by the writer that owns each (gradients by the resolver, grid tracks as per-tier proportions, `blur()`, `grayscale()` and `inset()` by the motion writer, `scripts/computed-route/tests/css-functions.test.mjs`), and 19 pseudo-class entries (the tree-structural ones plus `:is`, `:not`, `:where`, `:has`, `:heading`, `:dir`, `:lang`, `:scope` and `:root`) are covered because Fill reads each mapped element's computed style; the planted draft `scripts/computed-route/tests/css-planted-draft.test.mjs` raises no seen-but-unsupported row for them and raises each again with its coverage removed (2026-10-19). Not built: the framework DB's gradient rows that name no real CSS property (coverage plan Order item 2, d1), nav-drawer's scrim blur and opacity calibration (d2), a rounded `inset()` clip (d3), the CSS-group coverage entries (they close after the calibration run that follows the control-gaps build and the resolver-mapping residue), and the functions, units, at-rules and selectors the two drafts do not use (coverage plan Phase 4, draft reading).

## 11. Tokens and the extractor

The extractor (`plugins/sgs-blocks/scripts/theme-extractor/`) turns a draft into `sites/<client>/theme-snapshot.json` (the format is Spec 32 Part C). It runs once per client, before any tree is built, and the route snaps values to the snapshot it produces (R-47-7). The requirement IDs FR-33-n keep their numbers from the retired Spec 33, because about 26 code files cite them. FR-33-11's push mechanics and FR-33-20 (the dark palette) stay in Spec 32 §14.

**The palette rule (replaces the old "computed value always wins" rule).** The palette comes from the draft's declared tokens, `tokens/colors.css`, `tokens/typography.css` and `tokens/spacing.css`, matched to the draft's hex by value. No draft loads its token files (0 references in the three exports), so a token counts only where the draft's code uses its exact value. The render confirms each value: a token whose value nothing renders is gap-logged, not emitted. Roles (which slug a token fills) are proposed from the token's name and where its hex is used, and Bean confirms them once at intake (FR-48-31). The proposal comes from the route's own token reader (`scripts/computed-route/lib/tokens.mjs`) with no render; the extractor runs later, in stage 2, and reads the token files together with Bean's confirmed role map. Every colour outside the tokens stays a one-off hex on the block that uses it. A fluid font size follows Spec 32 §14.2's zoom-safe rule (core `fluid: {min, max}` from the draft's bounds, never a verbatim pure-`vw` `clamp()`); a `clamp()` on another length is kept verbatim. `rem` resolves against the draft's computed root font size.

**Asking Bean (replaces Spec 32 §3's last row).** The pipeline extracts token values from the draft; it never hand-authors them and never asks Bean for a value. It asks Bean once, at intake, to confirm the proposed roles, the page map and the Site Info (C12). A snapshot written by hand for a client that is not cloned is outside this section.

**Out of scope:** the header and footer component tokens (reserved, FR-33-13); a new theming or deploy channel; any per-client branch (FP-9).

### 11.1 The process

1. **Measure** (`measure.js` in a headless browser): computed styles on rendered nodes, the font census (`font-usage.js`) and the layout census (`layout-census.js`). `--facts <file>` replays a cached measurement.
2. **Read the declared design:** `tokens/*.css` (not built); `:root` tokens with `var()` chains and fallbacks (`token_map.py`); a Claude Design draft's script variant sets and inline styles (`variant_sets.py`, `usage_census.py`, `usage_js.py`).
3. **Classify and dedupe:** roles (`roles.py`), ΔE dedupe (`colour.py`), palette (`palette.py`, `site_palette.py`, `palette_refs.py`), typography (`typography.py`, `heading_weight.py`, `font_weights.py`, `used_fonts.py`), layout (`used_layout.py`, `declared_layout.py`), buttons and presets (`presets.py`).
4. **Derive (Pass B, advisory)** (`derive.py`), only for what neither the tokens nor the draft declares.
5. **Reconcile** declared against rendered (`declared_reconcile.py`): disagreements are logged.
6. **Validate and write** (`schema_validate.py`, `extract.py`): the snapshot and `theme-extract-trace.json`.
7. **Deploy** with `plugins/sgs-blocks/scripts/push-theme-snapshot.py` (Spec 32 §14.4): `--dry-run` diff, then `--yes`.
8. **Business data**: FR-33-14 and FR-48-59.

```
python plugins/sgs-blocks/scripts/theme-extractor/extract.py --client <slug> --draft <draft.html> [--facts f.json] [--out p] [--trace p] [--merge-onto existing.json] [--replace-source]
python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host> --target-domain <host> --no-push
cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests
```

### 11.2 Requirements

### FR-32-7 — Component presets from the draft
The extractor reads each component variant the draft declares (base and hover, every declared property) into `settings.custom.{component}Presets` (Spec 32 FR-32-9 naming) without hand-authoring. A Claude Design draft carries no SGS class, so a variant is recognised from the draft's code: a variant-set prop (`variant_sets.py`), or a group of elements sharing one style binding and role. Button presets are measured from rendered buttons by `presets.py` (FR-33-4).

*Done when:* every button variant the Indus draft renders (base and `style-hover`) is reproduced in `buttonPresets`, and a hover that changes colour and lift is captured whole.

Status: button presets are built (`presets.py`). Other components' presets from a `.dc.html` draft are not built.

### FR-48-51 — The route sets the preset (route half of Spec 32 FR-32-8)
When a draft element matches a confirmed preset (all of its declared base and hover values equal one `{component}Presets` variant within FR-48-36's tolerances), the route writes that variant (for example `sgs/button` `variant: secondary`) and no per-instance values. A draft element with no variant match stays its natural element: a plain draft link stays a link and is never forced into a preset button. Written against `.dc.html` drafts, not SGS-BEM classes (C9).

*Done when:* a cloned Indus primary button carries only its variant class (plus the WordPress block class), and a plain footer link does not become a button.

Status: not built.

### FR-48-52 — Box values as one object (route half of Spec 32 FR-32-10)
The route reads a draft's per-side and per-corner declarations (shorthand or four longhands, from inline `style` or `renderVals()`) into the named-object shape `{top, right, bottom, left}` on the owning attribute (Spec 32 §6.1(a)), never four flat attributes. A box family is recognised from the DB `box_family` column, never from a name pattern.

*Done when:* a draft box with four distinct sides round-trips to four distinct, correct computed values live.

Status: built for measured drafts (the route's cross-declaration accumulator in `lib/resolve.mjs`, Spec 47 §3.1); reading a declared `renderVals()` box is not built.

### FR-33-1 — Provenance-tiered extraction; declared tokens matched by value
Every emitted token carries a `_source` (`declared`, `derived` or `rendered`). A declared token comes from `tokens/*.css` (or a `:root` rule for a draft with a `<style>` block) and is emitted when the draft's code uses its exact value. Its value is confirmed by the render: where the rendered value on the element using it differs beyond ΔE ≤ 1 (or a length delta), the render decides, and the divergence goes to the reconciliation log and Bean's review. A declared token that no element uses is gap-logged, not emitted.

*Done when:* every emitted token has a `_source`. A fixture whose `colors.css` declares `--brand:#0A7EA8`, used by the CTA, emits that value as `declared`. A declared but unused token is in the gap log, not the palette.

Status: provenance, reconciliation and dead-token logging are built for `<style>` `:root` tokens. Reading `tokens/*.css` is not built (`git grep -n -E "tokens/|colors\.css" -- plugins/sgs-blocks/scripts/theme-extractor` gives no line).

### FR-33-2 — Roles proposed, Bean confirms; ΔE dedupe
A declared token's role is proposed from two signals: its name (through the vocabulary tables in `palette_vocab.py`) and where its hex is used (property and selector role, counted by `usage_census.py`). The table below ranks usage evidence when names disagree or are absent. The proposal goes into Bean's intake review, and his confirmed role map is what the snapshot uses. The slug vocabulary is Spec 32 §12.2's framework slugs, with `border` as the border slug.

| Usage signal | Candidate role |
|---|---|
| `background`/`background-color` on the base (`body`, `html`, `:root`, the page wrapper) | `surface` |
| `background` on a content element (a card, panel or section) | `surface-alt`, low confidence (0.70, below the 0.85 identity floor) so it never renames a client's own named token |
| `color` on body text, low L* | `text` / `text-muted` |
| high-chroma value as a button, CTA or link background | `primary` / `accent` |
| `border-color` or thin-border use | `border` |
| a status element (success, error) | `success` / `error` |
| no confident match | raw hex `custom-<name>`; never force a slug |

Colours dedupe at ΔE ≤ 1 (CIEDE2000, sRGB to Lab), with alpha as its own axis. On a merge, `declared` beats `derived`, first source order wins among equals, and the loser is logged as an alias. **`surface-alt` guard:** when nothing claims `surface-alt`, `palette.py::_synthesise_surface_alt` derives it from the resolved `surface`, tinted 6% toward black (light surface) or white (dark surface), tagged `_source: "derived"`. So a dark surface `#222831` gets `#2f353d`, and a light surface `#fbf3dc` gets `#ece4cf`, and a re-extracted snapshot cannot recreate a `surface`/`surface-alt` collision. The regression test `test_client_colour_keeps_raw_token_slug_not_custom` holds this.

**`border` guard (not built):** a saturated `border` proposal is re-derived as a low-chroma neutral near the site's `surface`, so no client gets a brand accent as its divider; Bean sees both values in the review.

*Done when:* role-named, literal-named and unnamed token sets each give the right proposal; `#2E7D4F` is proposed as `success` whether it is named `--success` or `--green`; the snapshot uses Bean's confirmed map; a token used as both border and heading is proposed by the higher-priority use or falls to `custom` with the ambiguity logged; and a negative control that proposes `border-subtle` fails.

Status: role-by-usage, ΔE dedupe and the `surface-alt` guard are built. Bean's confirm step is built (2026-10-19): `extract.py --intake <intake.json>` applies his palette-role marks through `theme-extractor/confirmed_palette.py` (`accept` takes the proposed role, `role:<slug>` that slug, `role:<slug>,<slug>` the token's colour on each slug (`confirmed_palette.py::_mark_slugs`; intake's review validator `scripts/computed-route/lib/intake-review.mjs` accepts the list form, every part a slug and none empty, `tests/intake-review.test.mjs`; Indus's `--text-heading` row carries `role:heading,accent-text,section-text`, and `extract.py --intake` on that intake gives all 28 palette slugs equal to `sites/indus-foods/theme-snapshot.json`, 2026-10-20), `one-off` no entry; a slug proposed from one of the draft's tokens that no confirmed row names is dropped, and any other client slug is kept and logged; an unknown mark, a token with no intake row, a slug that is neither a framework slug nor `custom-<name>`, a bad hex or one slug claimed with two hexes is refused, exit 7), inside `build_snapshot` and again after `--merge-onto`, whose merge now keeps every `settings.custom` key the extractor does not produce (it had dropped the motion and focus tokens); `tests/test_confirmed_palette.py` (17, its MUST FAIL case is the extractor's own proposal). Indus's snapshot was extracted with it, pushed to `indus-test` and its 19 confirmed slugs read back at `:root` at 375, 768 and 1440. Name-based proposal from `tokens/*.css` (intake proposes it, FR-48-31) and the `border` guard are not built. A framework slug the draft leaves unset follows the client's own related colour, never the framework file's hex (built 2026-10-20, `theme-extractor/role_defaults.py::apply_role_defaults`, table `palette_vocab.py::ROLE_DEFAULT_TABLE`): `heading`, `section-text` and `accent-text` take the client's `text`, `primary-text` its `text-inverse`, `link` and `link-hover` its `primary` and `primary-dark`, `section` its `surface-alt`; a draft token or a confirmed intake mark wins, a slug following a guessed (advisory) colour is advisory too, a table slug a token palette lacks is added, and each change is traced with its WCAG ratio on the slug's ground (`cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_role_defaults.py -q`, 7 passed, its MUST FAIL case keeps the framework #92400E). Open: re-extracting the Eye Care draft without its intake gives the framework orange accent (#F59E0B, accent-light #FEF3C7) and 26 slugs instead of its 36. Proven cause (2026-10-20, `build_snapshot` called on the draft with empty facts): the `.dc.html` has no `:root` block (the draft's palette lives in `handoff/tokens/colors.css`, which no extractor module reads) and the README states its colours as prose bullets, not a table, so `extract.py::_declared_design` returns None and `palette.py::build_palette` finds 0 tokens; the framework baseline palette then survives and only the intake marks bring the Eye Care colours in. Reading `tokens/colors.css` alongside the draft CSS gives 33 root tokens, but the palette then carries the draft's own names (`acc`, `acc-ink`, `acc-soft`) and still no `accent` slug, because mapping `acc` to `accent` is the role step Bean confirms. Fix proposal: read the Spec 48A folder's `tokens/*.css` `:root` blocks as Pass A input, and propose `acc` / `acc-ink` / `acc-soft` as `accent` / `accent-text` / `accent-light` through `usage_roles.py` for the intake to confirm; not built. The slugs mean what the Eye Care draft's tokens mean (Spec 32 §12.2): `accent-text` is the accent hue's own text colour on light grounds and on `accent-light` (`--acc-ink`: kickers, link hover, chips), and no slug owns text on an `accent` fill (a badge there inherits its text colour until the client's setup sets it). A draft colour named for a status slot (`error`, `info`, their `-light` tints, `success-light`) fills it and with none the framework value stays (Bean, 2026-10-20): the token pass claims by name from the framework roster (`palette.py::BASELINE_SLUGS`, read from `theme/sgs-theme/theme.json`), README rows match `error`/`danger` and `info` (`palette_vocab.py::ROLE_TABLE`), and intake marks any framework slug (`cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_status_slugs.py -q`, 3 passed). The vocabulary still uses `border-subtle` (`palette.py::_NAME_ALIASES`, `palette.py::BASELINE_SLUGS`, `roles.py`'s border row). All 9 snapshots carry `border`; where the rename happens has not been traced.

### FR-33-3 — Base typography from computed nodes
The theme base (`styles.typography`, `styles.color`) is the computed font family, size, line height, colour and background on a representative rendered `<p>` in the main content flow. `rem` resolves against the draft's computed root font size. Families: `body` from the base rule; `heading` from `h1`, then `h2`, then `h3`; `display` from an explicit `--font-display` token or the heading family, else omitted. The full fallback stack is emitted and the primary family must load. A value the draft never declared is never synthesised. A `tokens/typography.css` family that matches the rendered family by name confirms it.

*Done when:* a clone renders body text at the draft base size and heading line height; an `html{font-size:62.5%}` fixture resolves `rem` correctly; the heading font loads.

Status: built.

### FR-33-4 — Complete declared value-type coverage
Every declared value type goes to its slot (Spec 32 §14.2): the palette (FR-33-2); typography families, sizes, weights, line heights and letter spacing; spacing to `settings.spacing.spacingSizes`; radius to `settings.custom.borderRadius`; shadow to `settings.shadow.presets`; buttons to `settings.custom.buttonPresets.{primary,secondary,outline}`, plus an optional `buttonPresets.default` entry for the site-wide button hover (`hover-transform`, for example `matrix(1, 0, 0, 1, 0, -3)`, and `hover-transition`, for example `0.25s`). `contentSize` and `wideSize` come from the rendered layout (FR-33-19). A fluid font size becomes core `fluid: {min, max}` under Spec 32 §14.2's zoom-safe rule; `clamp()`, `calc()` and `min()` on other lengths are emitted verbatim. Button presets are an open property bag: the difference between rest and hover declarations, kept whole, with `!important` stripped. A lift that every regular button shares is written once as `buttonPresets.default.hover-transform` (Spec 32 FR-32-19; no new key), and a variant keeps its own `hover-transform` only where it lifts differently. When Spec 32 adds the shadow role names (FR-32-18, §16), the extractor fills them from the draft.

*Done when:* spacing tokens, a content size, a button radius and both hover shapes (colour invert, transform lift) each land in the right slot with no `!important`; a draft whose buttons all lift 3px gives `buttonPresets.default.hover-transform` and no per-variant copy; a pure-`vw` `clamp()` font size becomes a fluid preset that passes the 200% zoom check, and a `clamp()` gap is emitted verbatim.

Status: partly built. Per-variant `hover-transform` is built (`presets.py::_hover_diff`); folding a shared lift into `buttonPresets.default` is not built, and shadow role names are not built (Spec 32).

### FR-33-5 — Pass B is provisional and advisory; nothing usable gives the baseline plus a skip
For values neither the tokens nor the draft declares, Pass B derives them by usage clustering and a computed-value read, tagged `_source: derived` with a confidence score, palette entries marked `advisory`. It never pushes them to the live `wp_global_styles` without confirmation (`push-theme-snapshot.py::apply_advisory_policy`; `--include-advisory` deploys them). Promotion uses a relative share within a role bucket. A draft where nothing usable is recovered emits the framework baseline unchanged plus a loud logged skip. A parser failure halts with a clear error. Pass B counts only resting selectors (`roles.py::_SEL_NON_RESTING`). An advisory entry for a base slug carries `_baseline_color`, so a push restores the base hex rather than deleting it.

*Done when:* a token-less synthetic draft's derived palette is `advisory` and does not deploy without confirmation; a draft with nothing usable emits the baseline and a logged skip; Pass B never inverts a palette.

Status: built.

### FR-33-6 — Dark-theme and preview-shell safety
The theme background is the computed background of the widest block-level ancestor holding the main content flow, not `<body>` blindly. A dark `<body>` is never discarded for being dark: a preview shell is identified only by a positive structural signal (a `.viewport-switcher`, `.device-frame` or a known review-harness class or marker). An ambiguous signal gap-logs the background for confirmation.

*Done when:* a dark review-harness shell is ignored through the positive signal; a dark-theme draft with no harness keeps its dark background.

Status: built.

### FR-33-7 — Provenance trace, golden fixtures and schema validation
The extractor writes `theme-extract-trace.json`: one row per emitted token (`_source`, source selector and property, the reason for its role, the ΔE snap target and distance, confidence). "Correct" means a diff against a checked-in golden, `plugins/sgs-blocks/scripts/theme-extractor/expected/<draft>.snapshot.json`. The snapshot is validated against the `theme.json` v3 schema (`schema_validate.py`) before handoff.

*Done when:* every corpus draft produces a trace and is diffed against its golden; a malformed emit is caught before deploy.

Status: built. `python -m pytest tests/test_extractor.py -q` from `plugins/sgs-blocks/scripts/theme-extractor` gives 28 passed (2026-10-11). The whole suite (`python -m pytest tests -q`) gives 1 failed, 265 passed: the failure is `tests/test_font_face_weights.py::test_bakery_fraunces_face_equals_the_committed_snapshot` (Fraunces `300 900` against Young Serif `400`). It probably compares against `sites/mamas-munches/theme-snapshot.json`; this is not verified. No golden exists yet for a Claude Design export from `handoff/`.

### FR-33-8 — Determinism and idempotence
Re-running on an unchanged draft gives a byte-identical snapshot. Clustering, promotion and dedupe use a total order: frequency within a role, descending; then first byte offset, ascending; then canonical hex, ascending.

*Done when:* `tests/test_extractor.py::test_determinism_byte_identical` passes.

Status: built.

### FR-33-9 — Conservation: a slot or the gap log, never a silent drop
Every declared token and global declaration is extracted to a slot or logged as a gap candidate. ΔE merges log the loser as an alias. Role-bearing colours go to the palette. A once-used decorative value (a shadow `rgba` used once) goes to the trace, not the colour picker. A token-file colour the file itself marks as a deliberate one-off (Mama's `colors.css` header comment lists `#D9981C` and others) stays a one-off hex and is noted in the trace.

*Done when:* every token-file declaration and every `:root` and base declaration appears in the snapshot or the gap log; a once-used `rgba` is in the trace, not the palette.

Status: built for `:root` and base declarations; token files are not read (FR-33-1).

### FR-33-10 — Reuse by composition
The extractor owns `plugins/sgs-blocks/scripts/theme-extractor/token_map.py::build_draft_root_token_map` (hex, non-hex and `var()`-chain resolution, fallbacks). The token-file reader composes it; it does not widen a live helper.

*Done when:* the older map's output is byte-identical for the golden draft and the extractor consumes the composed map.

Status: built.

### FR-48-53 — No snapshot-only palette push (from Spec 32 FR-33-11)
A regenerated palette is never pushed on its own to a client whose pages are not re-cloned in the same change, because the cloned blocks snapped to the old palette. The push mechanics (backup, rollback, drift warning, advisory restore) are Spec 32 FR-33-11.

Status: a process rule; not enforced by a script.

### FR-33-12 — Freshness keys and bootstrap order
The extractor runs and validates for the current export before any tree is built for that client (stage 2 before stage 3). The snapshot records what proves it is fresh:
- `_sgsExtractor.draft_css_sha256` hashes the draft's `<style>` blocks;
- `_sgsExtractor.draft_source_sha256` (`plugins/sgs-blocks/scripts/shared_utils.py::draft_source_sha256`) hashes the style blocks, every inline and hover style value and the script, with line endings normalised. It must not hash the README (C4: the README is not a design input). For a Spec 48A export it is replaced by the `MANIFEST.json` hashes of the drafts and `tokens/*.css`;
- `_sgsExtractor.source_draft` records the file the extractor ran on. `shared_utils.py::is_part_draft` and `extract.py`'s `--replace-source` refusal keep a part draft from overwriting a snapshot recorded from another draft.

*Done when:* a run with a stale or absent snapshot (its recorded hashes differ from the current `MANIFEST.json`) fails closed with a clear message, and a run after a fresh extraction proceeds.

Status: partly built. The keys and the `--replace-source` refusal are built. `draft_source_sha256` still takes the README text (`shared_utils.py::draft_source_sha256`'s `readme_text` argument). The MANIFEST-hash key and the route's freshness gate are not built (`scripts/computed-route/lib/normalise.mjs` loads the snapshot unchecked).

### FR-33-13 — Namespace reservation and the token-map service
- **Acyclic.** The extractor owns the declared `settings.*` tokens. Nothing downstream writes back into the snapshot's palette: the route reads the snapshot and snaps to it (R-47-7).
- **Header and footer namespace reserved.** The extractor writes global tokens and generic presets only. Header and footer component tokens belong to those blocks, in the reserved, empty `settings.custom.header` and `.footer` namespace (`extract.py` reserves it; the format row is Spec 32 §14.3). Their header-specific settings are scoped CSS and block attributes (Spec 37 FR-37-15 and FR-37-16).
- `build_draft_root_token_map()` (FR-33-10) is a callable service; nothing else re-parses `:root`.

*Done when:* the snapshot reserves the namespace and the token map is a callable service.

Status: built.

### FR-33-14 — Business-data auto-fill companion
The site's business data (the `Sgs_Site_Info` store: email, phone, socials, copyright, address, hours) is filled from the draft so a cloned header and footer show real details with no re-entry.
- **Tier 1 (high confidence):** email (`mailto:`), phone (`tel:`), socials (an `<a href>` to a known social host; `#` skipped), copyright (the `©` line), and any address or hours the draft declares in its data object or beside an explicit label. A Claude Design draft adds two sources: the script's data object, matched through a vocabulary table, and labelled page text. Values are validated by shape. For a cloned site, tier 1 is a **proposal source**: `sync-business-info.py` runs print-only and its values join intake's Site Info proposal (FR-48-32). It is never a second writer.
- **Tier 2 (lower confidence):** free-text guesses go to Bean's intake review (FR-48-32) the same way.

**One writer.** `plugins/sgs-blocks/scripts/provision-site-info-from-draft.py` is the one Site Info writer for a cloned site (FR-48-59), after Bean's marks.

**Write channel (the writer's).** `POST /wp-json/sgs/v1/site-info` (`plugins/sgs-blocks/includes/class-sgs-site-info-rest.php`, `edit_theme_options`), allowlisted to `Sgs_Site_Info::known_keys()` and sanitised per key through `Sgs_Site_Info::set()`, fill-if-empty by default. The pipeline never sends `overwrite`. Phone is stored in display form; `Sgs_Site_Info_Binding::prefix_url_for_key` builds the `tel:` link.

**Placeholder map.** `--map-out` writes `sites/<client>/site-info-placeholder-map.json`, mapping each binding that resolves to a saved setting. Replacing those bindings in a cloned page is not built.

**Depends on:** Spec 32 FR-33-11 (push moment and credentials), Spec 37 FR-37-10 and FR-37-11.

*Done when:* a draft's email and copyright land in the store, `#` socials are skipped, an existing value is skipped, and a link with no Site Info key is reported unmapped.

Status: partly built. Tier 1 harvesting is built (`plugins/sgs-blocks/scripts/sync-business-info.py` over the `business_info/` package; print-only without `--push`), but `sync-business-info.py --push` still writes to a site directly, so the one-writer rule is not enforced. Tier 2, the intake review route and binding replacement are not built.

### FR-33-15 — Declared design outside `<style>` (Claude Design drafts)
A Claude Design draft declares its design in `tokens/*.css` (the palette, read by FR-33-1), its script (variant sets chosen by a `data-props` enum; a runtime data object) and inline `style` and `style-hover` attributes. The README is not read (C4).
- Variant sets (`variant_sets.py`): an enum prop in `data-props` plus a script object keyed by its options. The rendered custom property says which option is active; when no render confirms it, the entries are advisory.
- Usage (`usage_census.py`, `usage_js.py`): colours counted in inline styles, hover styles, style blocks and JS values that reach a style attribute through a binding. Content data (product swatches, reviewer colours) is not counted.
- `surface` and `text` are checked against the rendered body (`declared_reconcile.py`); `primary` and `primary-text` come from the measured primary button (`presets.py`, `measure.js`).
- Vocabulary (role words, variant key names) lives in data tables (`palette_vocab.py`, `variant_sets.py`).

*Done when:* every palette custom property on a live page equals the snapshot at 1440 and 375; no element paints the framework's old colours; snapshots of drafts that declare their design in `<style>` are byte-identical to before.

Status: built with the README as the palette source (`declared_sources.py::read_readme_tokens`, called from `extract.py::_declared_design`). Replacing the README with `tokens/*.css` is not built.

### FR-33-16 — Site palette overlay
The palette is the base SGS palette (base order), overridden in place by the confirmed, validated token colours (a base slug the draft leaves unset follows the client's own related colour, FR-33-2's role defaults), plus a role-named addition only where no base slug fits (`text-label`). It is never replaced or emptied, and it is generated once per site from the whole draft, never per page. Not palette: placeholder-tier colours (faint, placeholder, disabled), third-party widget colours, and colours that drift between elements; they stay hex on the blocks that use them. Alternative accent sets go under `settings.custom.accentSets`; the active set fills `accent`, `accent-text` and `accent-light`. `primary-dark` is derived from the final `primary`. Global defaults only: corner radius, `contentSize` and `wideSize`, the measured heading weight, and button presets from measured buttons (including buttons carrying only runtime-generated classes, `GENERATED_CLASS_RE` in `measure-node.js`).

*Done when:* the snapshot has every base slug plus `text-label` only, no placeholder or drifting grey, and nothing per element.

Status: built.

### FR-33-17 — Variable-font faces
A self-hosted variable font declares a weight range and uses the latin subset (`font_weights.py`). The weight probe tries `100..900`, then the range the draft's font link requests, then `400..900`, then `300..700`; the family is static only if all are refused. The font link is parsed as a URL, so multi-word names match.

*Done when:* a variable font loads with its real weight range and the heading renders at the draft's weight.

Status: built.

### FR-33-18 — Every loaded-and-rendered font family is captured
`measure.js` runs a font census (`plugins/sgs-blocks/scripts/theme-extractor/font-usage.js::FONT_USAGE_SRC`). `used_fonts.py::add_rendered_families` adds one `settings.typography.fontFamilies[]` entry per family that is both **loaded** (a Google Fonts link or `@import` on `fonts.googleapis.com`, or a draft `@font-face`) and **rendered** (the first loaded name in a census row's stack, with no generic family before it). Each entry carries `slug`, `name`, `fontFamily`, `fontWeights` and `fontStyles` (only those rendered), `google: true|false` and `_source: "rendered"`. The role slots are never changed. A family that renders but has no file behind it is logged as a gap. The runtime self-hosting of `google: true` entries is Spec 32 §14.2.

*Done when:* the census and `document.fonts` agree with the snapshot's entries and weights; a family loaded but never rendered, one rendered but never loaded, and one listed after a generic are not added. Tests: `tests/test_used_fonts.py`.

Status: built.

### FR-33-19 — Content width and wide width come from the rendered layout
`measure.js` runs a layout census (`plugins/sgs-blocks/scripts/theme-extractor/layout-census.js::LAYOUT_CENSUS_SRC`) at 1440 and 1920. `used_layout.py::derive` decides at the widest viewport:
1. a text's cap is the nearest element on its chain that paints no text itself, is binding (its box equals its max-width) and has a content box of at least 600px (`FLOOR_PX`);
2. a band is constrained only when every text in it has a cap; header, footer and nav bands do not vote;
3. `contentSize` is the most common band width (a tie goes to the narrower); `wideSize` is the most common wider width that at least two bands use, else unchanged and raised to `contentSize` if narrower;
4. with no constrained band, nothing is written and the trace says so.

The rendered value beats a declared `.container` width (FR-33-4). How `SGS_Container_Wrapper` applies the values is Spec 32 §14.2. `python used_layout.py --facts <facts.json> --snapshot <snapshot> --write` updates only `settings.layout`. A multi-screen draft is measured on the screen that renders on load; intake's routing adapter (FR-48-26) lets the census measure every route.

*Done when:* `contentSize` equals the draft's content box at 1440 and 1920 for its constrained bands. Tests: `tests/test_used_layout.py`, with a mutation run proving each rule.

Status: built for the load screen. Measuring every route is not built.

### FR-48-54 — The client palette audit
Each extraction prints, for the client snapshot it writes: (a) the `border` slot's value and chroma (a saturated hue there breaks its role, Spec 32 §12.2); (b) the framework slugs the palette lacks, against the 21 in `theme/sgs-theme/theme.json` (the completeness rule itself stays in Spec 32); (c) duplicate slugs; (d) the `surface`/`surface-alt` RGB distance. Client palettes may carry more slugs than the framework roster; a longer palette is not drift. Before any client colour changes, the client's `sites/<client>/CLAUDE.md` is checked for a documented brand reason, and a value change to a live client palette needs Bean's go-ahead. A colour-role change is verified by computed style on the rendered element, never by a diff of the source.

Status: the checks exist as one-line commands in Spec 32 §12.5 and are not wired into `extract.py`. Today `sites/mamas-munches/theme-snapshot.json` lacks `accent-light` and `border-light` (ledger C6).

### 11.3 Known limits
- The primary button's hover text is the framework's `#ffffff`, not the draft's off-white: the hover diff omits keys equal to the rest state and the merge keeps the framework value.
- The token-file vocabulary is data but finite. A role no table names is proposed from usage (advisory) or logged, and Bean's confirmation settles it.

## 12. Site build

R-48-2 (The pointer exception, §1) governs this section.

### FR-48-55 — The site-build script
One script, `scripts/computed-route/site-build.mjs`, builds the site's skeleton from the confirmed `page-map.json` (FR-48-30):
1. **Posts.** Each row without an `id` is created with `node scripts/wp-build-page.js --create <postType> --title
   <title> --slug <slug> --tree <tree>`. Its tree is the stage 3 tree when one exists, else a one-block placeholder
   tree. `--create` reaches `post-new.php?post_type=<type>` for any post type (the documented list is page, `sgs_header`, `sgs_footer`, `sgs_drawer`, `sgs_modal`, `sgs_mega_menu`, `sgs_form`, `sgs_choice_flow`, `wp_block`). The script reads the ID `wp-build-page.js` prints and writes it into the row. A `product` row creates no post: its tree builds WooCommerce's `single-product` template (`wp-build-page.js --template single-product`), the products themselves come from WooCommerce (`collection: live`), and its `id` stays empty.
2. **Parent and page template.** `wp-build-page.js` sets only title, slug and status, so the script sets the rest by WP-CLI: `wp post update <id> --post_parent=<parentId> --page_template=<template> --user=Claude`.
3. **Menus.** `wp menu create "<name>"`, `wp menu item add-post <menu> <id> [--parent-id=<itemId>] [--position=<n>]`, and `wp menu location assign <menu> <location>` where the theme registers locations (check). A mega menu is attached by adding its `sgs_mega_menu` post as the menu item (`wp menu item add-post <menu> <panelId>`), because `Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item` resolves a panel from an item whose `object` is the mega-menu post type.
4. **Front and posts page.** `wp option update show_on_front page`, `wp option update page_on_front <id>`, `wp option update page_for_posts <id>`.
5. **Permalinks.** `wp rewrite structure '/%postname%/' --hard`, then `wp rewrite flush`.
6. **WooCommerce pages** (shop clients only). `wp option update woocommerce_shop_page_id <id>`, and the same for `woocommerce_cart_page_id`, `woocommerce_checkout_page_id` and `woocommerce_myaccount_page_id`.
7. **Active pointers** (R-48-2 only). `wp sgs header set-active <id> --user=Claude`, and the same for `footer` and `drawer`. These go through `Sgs_Active_Layout::set_active`, never a raw `wp option update`.

On a rerun, every row with an `id` is updated by that ID (`wp-build-page.js --post-id <id>`, `wp post update`), never created twice. A stored ID that no longer exists stops the run and names it. The script prints a before-and-after table of every option it changes.

*Done when:* a run on a fresh Indus site creates every page-map row once, a second run creates nothing and changes nothing, every menu item resolves to its row, and each mega-menu item renders its panel.

Status: not built. `wp-build-page.js --create` and `wp sgs header|footer|drawer set-active` are built.

### FR-48-56 — Theme page templates
A page-map row with a WooCommerce or theme template (`archive-product`, `single-product`, `cart`, `checkout`, `page-no-title`) is built as the site's own copy of that template with `wp-build-page.js --template <slug>` (or `--template-part <slug>`, for example `sgs-pdp-buybox`), so the framework file in `theme/sgs-theme/templates/` stays unchanged. The header and footer reach a template through one `core/template-part` line each (Spec 47 §2).

*Done when:* the client's shop and product templates render from its own saved copies, and the theme files are byte unchanged.

Status: built (`wp-build-page.js --template`, `--template-part`); not yet driven by the page map.

### FR-48-57 — Forms
Every draft form becomes a saved `sgs_form` post (Spec 42), created by the site-build script with `--create sgs_form`, and embedded by reference. This closes Spec 42's FR-42-10 for cloned forms, because the target is now created. A form step becomes an `sgs/form-step`. For each form, intake records and Bean confirms:
- **submission path:** stored submission plus email through `wp_mail()` over the client's SMTP (Spec 04's notification architecture; Appendix A step 6);
- **recipient:** `notifyEmail`, else the Site Info email, else `admin_email` (`Sgs_Mailer::owner_recipient`);
- **validation copy:** the draft's error messages. Today `sgs/form`'s `view.js` shows the browser's `validationMessage` or "This field is required.", and no field block has a setting for its own message, so a draft that writes its own validation copy is a missing-features row (F-setting candidate, owner Spec 04);
- **success state:** `successMessage` or `successRedirect`, from the draft's result surface (`surfaces.json` kind `result`).

*Done when:* each Indus form (the enquiry and trade application drafts and their steps) submits on the test site, the owner email is addressed to the confirmed recipient (on a test site it is redirected to Bean, and the site's FluentSMTP email log shows the original recipient), and the success state matches the draft.

Status: `sgs_form`, `notifyEmail`, `successMessage` and `successRedirect` are built. Route creation and per-field validation copy are not built.

### FR-48-58 — Media upload to an ID map
Every image under `handoff/assets/`, plus the client's own real images under `sites/<client>/assets/`, is uploaded once through the WordPress REST media endpoint with the site's application password (`scripts/computed-route/media-upload.mjs <client> --site <site> --apply`; no file is copied to the server by hand). The script writes `sites/<client>/build/media-map.json`, per site: asset path, sha256, attachment ID and URL, the sha256 of the file WordPress kept (`storedSha256`), and `stock: true|false`. A rerun skips any file whose sha256 is already in the map with a live attachment that still serves `storedSha256`. An SVG the upload sanitiser changed (`plugins/sgs-blocks/includes/svg-upload.php`) is marked `sanitised` and listed for Bean's review. The identity check follows a painted image URL (or a size WordPress made of it) to its map entry (`lib/media-upload.mjs::paintedAsset`). Stock previews upload with `stock: true` and are listed in Bean's review for replacement.

*Done when:* every painted asset has one attachment ID, a rerun uploads nothing, and the row 3 identity check (§10) passes.

Status: built (2026-10-20): `scripts/computed-route/lib/media-upload.mjs`, `media-upload.mjs`, `tests/media-upload.test.mjs` (5 pass against an in-memory WordPress; 4 of 4 mutations red: the liveness check, the stored-file hash, the sanitised mark, the dry run). Not yet run on indus-test (needs Bean's go). Stock previews (remote URLs) are not uploaded yet: they have no local file until a flag row is resolved.

### FR-48-59 — Site Info's first real run
`plugins/sgs-blocks/scripts/provision-site-info-from-draft.py --site <target> --handover <file>` is the one Site Info writer for a cloned site; `sync-business-info.py` only proposes (FR-33-14). It runs first as a dry run on the confirmed Site Info proposal, which merges the intake harvest and `sync-business-info.py`'s print-only output (FR-48-32). Its table is shown to Bean, then it runs with `--apply`. `--apply` backs the option up to `.claude/backups/<date>/<site>/sgs_site_info.json`, writes through `Sgs_Site_Info::set()`, never overwrites a non-empty key, and fails loudly on a read-back mismatch.

*Done when:* the Indus test site's Site Info holds the confirmed values and the header and footer render them.

Status: built and run on Indus 2026-10-19. `--intake <intake.json>` reads the confirmed proposal (`plugins/sgs-blocks/scripts/site_info_intake.py`: `accept` takes the row's value, `edit:<value>` replaces it, `drop`, an unmarked row or an unknown mark is refused and listed; intake's `hours.<day>` maps to `opening_hours.<mon..sun>`), `--set key=value` adds a fact Bean gives outside the draft (`maps_url`), and `copyright`, `opening_hours.*` and `maps_url` are accepted keys (`scripts/tests/test_provision_site_info_from_draft.py`, 42 pass; the refusal tests fail against a copy that treats unmarked or dropped rows as accepted). On `indus-test` the dry run proposed 14 writes and 0 skips, and `--apply` wrote and read back all 14 (backup `.claude/backups/2026-10-19/indus-test/sgs_site_info.json`); the live header and footer render the phone, email, address and Google Business Profile link. Intake's own handover (`lib/intake-siteinfo.mjs::handoverFor`, 2026-10-20) hands over every key intake proposes: the contact and social keys, `hours.<day>` as `opening_hours.<mon..sun>`, the site title as WordPress's `blogname` and the tagline as Site Info's `tagline` plus `blogdescription` (`handoverTargets`). The script writes those two WordPress options (owner `wp-option`) when Bean's confirmed value differs from the current one, with a backup to `wp_options.json`, comparing against the HTML-unescaped stored value (59 pass in `scripts/tests/test_provision_site_info_from_draft.py`).

## 13. Shop surfaces

Shop UI in Claude Design drafts is heavily bespoke (Bean: "its super awkward to code a block to enable all of that"). Each shop surface is taken in a fixed order: existing parts first, then custom CSS for visual leftovers, then a framework build or a gap-list decision for behaviour that is unique. The framework builds are Spec 27's work and are listed here only as hand-offs (§16).

R-48-5 (Client code only on Bean's decision, §1) governs this section.

### FR-48-60 — The buy box
1. **Parts.** The product page's buy box is laid out in the `sgs-pdp-buybox` template part (`theme/sgs-theme/parts/sgs-pdp-buybox.html`) with SGS containers around the draft's order of parts. Today that part holds the breadcrumbs, title, rating, one `sgs/buybox` and an `sgs/icon-list`. `sgs/buybox` is one server-rendered block (274 attributes, `src/blocks/buybox/render.php` with no inner-block mount). The draft's part order is reachable only once the split into parts exists (Spec 27 hand-off, §16).
2. **Custom CSS.** A visual leftover no part setting holds goes in the part's `sgsCustomCss`, scoped and labelled as route-written under Spec 32 FR-32-20, and listed in the surface report. A pattern seen on two clients becomes a setting (Spec 27).
3. **Behaviour.** A behaviour no part has goes to the missing-features list; Bean decides between a framework build and R-48-5.

**Mama's fallback.** If the Spec 27 parts split is not ready when Mama's reaches stage 3, Mama's buy box ships on the `sgs/buybox` composite with its existing settings plus listed custom CSS (step 2) for the order and visual leftovers the composite cannot reach, and each such rule is a row the split later replaces. Mama's shop proofs also need the minimum fixture products (§16).

Status: steps 2 and 3 work today; Spec 32 FR-32-20 scopes every rule and shows the label the route writes. Step 1 waits for the Spec 27 parts split. The fixture products do not exist.

### FR-48-61 — The shop filter
The shop filter is composed from WooCommerce's filter blocks inside SGS containers, as the framework's `archive-product.html` already does (`woocommerce/product-filters` with `product-filter-taxonomy`, `-checkbox-list`, `-price`, `-price-slider`, `-active`, `-removable-chips` and `-clear-button`, inside `sgs/container`). The draft's filter is matched part by part. Visual leftovers go to custom CSS. A filter behaviour WooCommerce's blocks lack (for example a bespoke pop-up) is a missing-features row.

Status: built in the framework template; matching a draft's filter is not built.

### FR-48-62 — The basket drawer
The basket drawer is `sgs/cart`'s panel, configured through its settings (175 attributes; Eye Care's header tree sets 135 of them on its cart and gives it no inner blocks). The draft's drawer values are written to those settings. Drawer content beyond the settings (a gift note, an upsell) needs an extras slot, a Spec 27 hand-off (§16). Until it exists, that content is a missing-features row.

Status: the settings are built; the extras slot is not built.

### FR-48-63 — The toast
The add-to-basket toast is `SGS\Blocks\Sgs_Toast` (`plugins/sgs-blocks/includes/class-sgs-toast.php`). It is one page-level region printed in `wp_footer` when a block requests it, not a block and not part of the cart. Its stylesheet (`assets/toast/toast.css`) reads the site's tokens (`--wp--preset--color--*`, spacing and radius presets). The toast is site chrome, styled only by the site tokens the client edits in Global Styles (palette, spacing and radius presets), by Bean's decision (2026-10-11): it has no block controls of its own, and this is the recorded exception to "every customisable property has a block-editor inspector control" (Bean: "no real need to have it editable"). The draft's toast is matched only through the site tokens, and any remaining difference is recorded as a deliberate difference.

Status: built.

## 14. Gap proof and reports

A row reaches the framework gap list only after it passes every gate. A row that fails a gate takes that gate's failure class and goes to its owner instead.

### FR-48-64 — Gates G0 to G7

| Gate | Input | Pass condition | Failure class |
|---|---|---|---|
| G0 Freshness | DB refresh time, the block's last commit, the calibration cache's deploy hash and browser version, `MANIFEST.json` hashes and `schema_version`, `intake.json` hashes | the DB was refreshed after the block's last change; the cache's deploy hash is the current deploy and its browser version the installed one (FR-48-75); the intake hashes equal the MANIFEST | I-stale |
| G1 Pair and paint | the row's draft ID pair, the paint check (§3.6) | an identity pair (not a word match); the element is not inert; it paints the property; the draft side is in a listed state | W-walker |
| G2 Intent | declared value, rendered draft value, the divergence ledger (§3.5) | the declared value agrees with the render, and the row is not ledgered | draft-defect (FR-48-34's test passes), render-wins (code and render disagree and FR-48-34's test fails), CLIENT (ledgered) |
| G3 DB query | `block_attributes` rows for the block, its ancestors and its extensions | no stored row fits the property; a NULL `css_property` row that fits is `I-unrouted`; a row with a wrong role is `I-mistag` | I-unrouted, I-mistag |
| G4 Calibration | the block's cache: `dead`, `noMarker`, `untestedStates`, `rejected`, `overriddenBy` | the setting that would hold it is calibrated live; an `overriddenBy` verdict is kept only when the rendered box agrees | I-calibration |
| G5 Emission and reach | the setting's emitted CSS, measured | the measured emission does not reach the element (never decided by string search alone, R-48-4; never fail-open) | W-route |
| G6 Live probe | a trial on the live page | Missing setting: a trial shows no setting changes it. Hardcode: a named winning rule. Missing block: a roster grep finds no block. Behaviour: a failing flow plus an attribute grep finds no setting | W-route |
| G7 Re-check | the row on the publish date | still open after a fresh walk on the day `gaps.json` is published | (row dropped as closed) |

Status: not built as a gate chain. Parts exist: identity pairing and the paint check (Spec 47 §3.6), the trial (`lib/trial-run.mjs::openTrial`), calibration lists in each cache, and the deploy hash (`lib/deploy-hash.mjs`).

### FR-48-65 — Classes, and how today's triage classes map to them
| Class | Meaning | Owner |
|---|---|---|
| F-setting | no setting reaches a property the block paints | owning framework spec |
| F-hardcode | a setting holds the draft value and a named framework rule still wins | owning framework spec |
| F-block | no block or composition can hold the element | Spec 02 |
| F-vocabulary | the token or preset vocabulary lacks the value kind (a slug, shadow role, fluid size) | Spec 32 |
| F-behaviour | an SGS feature lacks the behaviour (a seen-but-unsupported row, FR-48-34) | owning feature spec |
| W-walker | a measuring artefact (mispair, unmeasured side, consequence of another row) | Spec 48 §3.6 |
| W-route | a setting exists that the route did not find, calibrate or write | Spec 48 |
| I-stale | the DB or a cache is older than the code | `sgs-update-v2.py`, calibration |
| I-unrouted | a fitting setting has a NULL `css_property` | `sgs-update-v2.py` |
| I-mistag | a setting carries the wrong role | `sgs-update-v2.py` |
| I-calibration | dead, noMarker, untested or absent calibration | calibration (§3.2) |
| draft-defect | FR-48-34's closed list | Claude Design, or B5 for Eye Care |
| render-wins | the draft's code and render disagree, FR-48-34's test fails, and the rendered value is the target (FR-48-36); reported, never a gap | the surface report; Claude Design when the code is the error |
| CLIENT | a recorded deliberate difference or a client decision | the client's ledger |

Today's triage (`scripts/computed-route/lib/triage.mjs::TRIAGE_CLASSES` = W, F, T, U, L) maps as follows:
- **W** splits into W-walker (reasons `mispaired`, `same-element`, `unmeasured-side`, `no-live-element`, `consequence`, `unmapped-state`, `content`) and W-route (`resolver-*`, `resolver-blocked`, `canvas-settable`);
- **F** with reason `no-setting` becomes F-setting, and F with `hardcode` becomes F-hardcode, each only after G0-G7. Until then it is a candidate;
- **T** (the resolver would write a value the tree lacks) is W-route: the route's own debt;
- **U** (`box-unexplained`) is W-walker until a box-geometry check per paired element explains it;
- **L** (`ledger-consequence`) is CLIENT.

The I-classes, draft-defect and render-wins are new: today an uncalibrated row lands in W or F.

Status: not built.

### FR-48-66 — `gaps.json`
Per client, `sites/<client>/build/qa/gaps.json` holds one row per open item: `id`, `class`, `owner`, `surface`, `draftId`, `block`, `attribute` (or null), `property`, `widths`, `state`, `declared`, `renderedDraft`, `renderedLive`, `gates` (each of G0-G7 with pass, fail or not-reached and its evidence: a command and its output line, or a file and key), `firstSeen`, `publishedOn`, `killed` (FR-48-22) and `framework` (true for F-classes). A row without evidence for every gate it passed is refused when the file is written.

Status: not built.

### FR-48-67 — The instrument-debt list
Every I-class row is also written to `sites/<client>/build/qa/instrument-debt.json`, grouped by owner (the seeder or calibration), with the block, the attribute and the gate evidence. Known items today: `sgs/choice-flow`'s `skipAddsToBag` NULL `css_property` (an enum setting calibration discovered, such as `container.layout`, is routed through discovery and is never I-unrouted), and the four stale Indus slot maps named in FR-48-3's status.

Status: not built.

### FR-48-68 — The cross-client framework backlog
Every F-class row from every client's `gaps.json` is merged into one file, `.claude/reports/framework-backlog.json` (not built). Rows are keyed by block, attribute and property, so the same gap seen on two clients is one row listing both. `node scripts/computed-route/backlog-recheck.mjs` (not built) re-runs G3 to G6 for every row after each framework change, and moves a row that now passes to `closed` with the commit that closed it.

Status: not built.

### FR-48-69 — The draft-defects list
Each client's draft defects (FR-48-34) are kept in `sites/<client>/build/qa/draft-defects.json`: draft ID, construct, what the code declares, what the render does, and the owner (Claude Design for a fresh client; B5 for Eye Care). Each is sent to Claude Design with the next export request. The code's intent is built meanwhile.

Status: not built.

## 15. Route accuracy

### FR-48-70 — The answer sheet, re-frozen
The answer sheet (R1: `scripts/computed-route/answer-sheet.mjs`, `lib/answer-sheet.mjs`, `sites/eye-care-ward-end/build/qa/answer-sheet.json`, 100 hand-labelled rows, with a baseline ratchet in `answer-sheet-baseline.json`) scores every route change before and after. Its rows were labelled against the old Eye Care draft, so they are re-frozen on the B5 draft before any score is trusted, and a second sheet is frozen from Indus's first clone. New rows on either sheet are labelled the FR-48-71 way: by an independent agent from the gate evidence, with Bean confirming disagreements only. The first acceptance evidence comes from an export B5 did not touch (Indus).

Status: the scorer and Eye Care sheet are built; the re-freeze and the Indus sheet are not built.

### FR-48-71 — Gap-label rows
Each sheet gains gap-label rows, taken as a fixed random sample: per client, 10 rows drawn from the rows the route classes F in `gaps.json`, with a seed recorded beside the sheet so the draw can be repeated (all F rows when there are fewer than 10). Each sampled row is labelled by an independent agent that did not run the route, from the row's gate evidence alone (FR-48-66: each gate's command and output line, or file and key): F-setting, F-hardcode, F-block, F-vocabulary, F-behaviour, or not a gap (W, I or CLIENT), with a one-line reason. Bean is not asked to label. He sees only the rows where the agent's label and the route's class disagree, and confirms one of the two. The scorer reports precision for the F-classes on the sample: (sampled rows the route classes F that end labelled F) / (sampled rows).

Status: not built.

### FR-48-72 — Code-render disagreement rows
Each sheet gains rows where the draft's code and render disagree, labelled with the right outcome (`render-wins`, or a draft defect by FR-48-34's test) by the independent agent of FR-48-71. The scorer fails a row the route resolves the other way.

Status: not built.

### FR-48-73 — F precision, reported
F precision on the sample (FR-48-71) is a reported metric, printed with every published `gaps.json` and kept per client so it can be compared across clients. It is not a publish blocker: a `gaps.json` reaches the framework backlog once its rows pass G0 to G7 (FR-48-64). The target is 90%; a client below it gets its disagreeing rows' gate evidence reviewed for the gate that let them through, and that gate's fix is recorded in the plan. Today 105 of 217 "missing feature" labels held on Eye Care (48%; Session D re-check). The 90% target is provisional, calibrate on Indus.

Status: not built (no current measurement on the new classes).

## 16. Staged items and framework hand-offs

Items Spec 48 needs but does not own. "Blocks" says which client cannot finish without the item.

| Item | Owning spec or owner | Blocks | Status |
|---|---|---|---|
| `sgsCustomCss` hardened: every rule scoped, the scope class taken from the instance, core blocks' CSS lifted to the head too, editor preview equal to the front end, route-written CSS labelled; a structured breakpoint override preferred where a block has one | Spec 32 FR-32-20 (FR-32-13 keeps the precedence rules and allows the snap) | Indus | built 2026-10-12, except the structured breakpoint override |
| Per-tier section padding and gutter tokens | Spec 32 FR-32-15 (§14.2) | Indus | built 2026-10-12 |
| Palette slugs: heading text, link and link hover, section ground with its text colour (no gradients) | Spec 32 FR-32-14 (§12.2, §14.2) | Indus (in the Indus snapshot only) | built 2026-10-12 |
| Fluid heading presets (`fluid: {min, max}` per client; per-device values when a preset misses by more than R-47-7's length tolerance at 375/768/1440); built only after calibration records accepted value forms | Spec 32 FR-32-16 (§14.2) | Indus (Indus snapshot only) | not built |
| Button lift written as `buttonPresets.default.hover-transform` (no new key; `button/style.css` already reads variant, then `default`); the extractor folds a shared lift into `default` (FR-33-4) | Spec 32 FR-32-19 (§14.3), Spec 48 §11 | Indus (Indus snapshot only) | partly built (the key is read; the extractor writes per variant only) |
| Shadow role names (card, card-hover, button, panel, header, drawer, modal); migration surveying saved slugs including `raised`, `subtle`, `raisedish`, `hard-sm`; old slugs kept as aliases; dry run per client; FR-26-D3 waits for the O10 shadow-picker check | Spec 32 FR-32-18 (§14.2), §13.4 (FR-26-D3) | neither | not built |
| One font-size vocabulary across snapshots (`sites/mamas-munches` excluded by name, its slugs kept as aliases) | Spec 32 FR-32-17 (§14.2) | neither | not built |
| Indus calibration: four stale slot maps (nav-bar-menu, site-header, media, nav-drawer) whose calibration content `local-indus` lacks | calibration (§3.2) | Indus | partly built (FR-48-3 status) |
| Calibration records accepted value forms (`clamp()`, `vw`, `repeat()`, column count) | calibration (§3.2, FR-48-2) | Indus (fluid presets, grids) | built |
| Indus local mirror `local-indus` and calibration targets `indus-test` and `local-indus` | Spec 48 Appendix A step 13 | Indus | built |
| Default paint stored per site (`cache/<site>/<block>.paint.json`) | calibration (§3.2, FR-48-3) | Indus (protects Eye Care's caches) | built |
| The route's own pinned `package.json` | Spec 48 FR-48-75 | neither | built (G0's version check not built) |
| `overriddenBy` with a rendered-box guard | calibration (§3.2) | neither | not built |
| `choice-flow.skipAddsToBag` `css_property` (NULL today) | `sgs-update-v2.py` | neither | not built |
| Extractor `border` vocabulary (`border-subtle` to `border`) | Spec 48 §11 (`palette.py`, `roles.py`) | Indus | not built |
| Site-build script | Spec 48 §12 | Indus | not built |
| Form submission path: recipient, validation copy, success state | Spec 42, Spec 04 | Indus | partly built (validation copy setting not built) |
| Buy-box parts split (parts share one product state, laid out in `sgs-pdp-buybox`; `sgs/buybox` stays as a composite rendering the parts, no deprecation path; before-and-after render comparison on an existing product page) | Spec 27 | Mama's | not built |
| Basket drawer extras slot (gift note, upsell) | Spec 27 | Mama's | not built |
| Minimum fixture products for the shop proofs (a simple and a variable product with price, stock and image, so the buy box, filter, basket drawer and toast render) | Spec 27 | Mama's | not built |
| Shop surfaces matched part by part (buy box, filter, drawer) | Spec 48 §13 | Mama's | not built |
| Motion presets the drafts need (no combined move-plus-blur or move-plus-scale entrance, no rounded `clip-path` reveal). The values are written by the route's `lib/fill-motion.mjs`. What exists is the entrance rows of `motion_presets` (`SELECT slug FROM motion_presets WHERE panel = 'entrance'`), which include `entrance-blur-in`, `entrance-reveal-up` and `entrance-scale-in`; query them before adding one | Spec 38A | neither | not built |
| Validation copy setting per form field | Spec 04 | Indus, if its drafts write their own messages | not built |
| Binding grouping (one shared setting per `{{ }}` binding) | Spec 48 §10 | Indus | not built |

## Appendix A. Fresh-site checklist

Run in order on a new client site, by an agent. Commands run over SSH as `ssh hd "cd <site root> && wp ..."`, with `--user=Claude` on every write. A step marked (check) is not verified against the current host and is checked before the first run. A script replaces this checklist after the third client uses it (DESIGN decision 11).

1. **WordPress install.** Create the site and install WordPress in hPanel or through the Hostinger API (`wordpress_installations_install`; poll `wordpress_installations_list`) (check). Create the admin user `Claude` and an application password; write `WP_URL_<KEY>`, `WP_USER_<KEY>`, `WP_PWD_<KEY>` and `WP_APP_PWD_<KEY>` to `.claude/secrets/<site>.env`.
2. **Deploy target.** Add one entry to `TARGETS` in `plugins/sgs-blocks/scripts/build-deploy.py` (`host`, `wp_content`, `explicit_opt_in_required: True`, `client: "<client>"`), then `python plugins/sgs-blocks/scripts/build-deploy.py --target <key>` deploys the theme and plugins.
3. **Theme and plugins.** `wp theme activate sgs-theme`; `wp plugin activate sgs-blocks`; `wp plugin install woocommerce --activate` for a shop client.
4. **WooCommerce** (shop clients only):
   - currency: `wp option update woocommerce_currency GBP`;
   - store country: `wp option update woocommerce_default_country GB` (check the client's region);
   - pages: `wp wc tool run install_pages --user=Claude` (check), then the page options in FR-48-55 step 6;
   - shipping: one UK zone with the client's rates, via `wp wc shipping_zone create --name="UK" --user=Claude` and `wp wc shipping_zone_method create <zone> --method_id=flat_rate --user=Claude` (check);
   - tax: `wp option update woocommerce_calc_taxes yes` and `woocommerce_prices_include_tax yes` for UK VAT-inclusive pricing (check with the client);
   - test payments: `wp option update woocommerce_cod_settings '{"enabled":"yes"}' --format=json` or the payment plugin's test mode (check).
5. **Snapshot.** `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <client> --target <key> --target-domain <host> --dry-run`, then `--yes`.
6. **Site email.** `python plugins/sgs-blocks/scripts/provision-site-mail.py --target <key> --smtp-user <mailbox> --secret-key <KEY> --from-email <address> --from-name "<name>" --alert-email <address> --test-to <address>`, then `--check` exits 0. On a test site holding a real client's details, add `--redirect-all-to <address>`.
7. **Noindex.** `wp option update blog_public 0` until launch (Spec `go-live-checklist.md` covers launch).
8. **Permalinks.** `wp rewrite structure '/%postname%/' --hard` and `wp rewrite flush`.
9. **Site icon.** `wp media import <icon.png> --porcelain`, then `wp option update site_icon <id>`.
10. **Site Info.** FR-48-59's dry run, then `--apply`.
11. **Site build.** FR-48-55.
12. **Cache clear.** `wp litespeed-purge all` where LiteSpeed is active (`wp plugin list --status=active | grep -i litespeed`), `wp cache flush`, and the Hostinger CDN purge; `build-deploy.py` also resets OPcache over HTTPS after each deploy.
13. **Local mirror and calibration targets** (needed before stage 0; it does not wait for stage 1). Create `/var/www/local-<client>` in WSL on the next free port with its own database, the mail block mu-plugin and `WP_ENVIRONMENT_TYPE`, as the existing mirrors are set up (`scripts/local-wp/README.md`); add the site to `scripts/local-wp/sync-build.sh` and to the README's table; write `.claude/secrets/local-<client>.env`. Fill it with `bash scripts/local-wp/refresh-from-remote.sh local-<client> <test-site>`, then `sync-build.sh local-<client>`. Create the calibration page on the test site with `wp-build-page.js --create page --title "CR calibration" --slug cr-calibration --status private` (the refresh carries it to the mirror with the same ID), and add both sites to `scripts/computed-route/calibration-targets.json` with that `postId`, an overlay image from the site's media, and the mirror's `pluginDir`. Then create the objects the fixture tokens name (§3.2) on the test site: `node scripts/computed-route/provision-calibration-refs.mjs --site <test-site> --dry-run`, then without `--dry-run` (`--image <file>` and `--logo <file>` import images from the repo; without them an existing `image` ref is kept and the logo reuses it). It finds or creates the "CR calibration" menu (a submenu, a mega-panel item and the menu-item role), the calibration mega panel and drawer, the media, and a product when WooCommerce is active, and writes their IDs as the test site's `refs`; refresh the mirror again so it holds them (it inherits the refs). A role the site cannot supply (a product without WooCommerce) is reported, and the blocks that need it are not calibrated there. For Indus: `indus-test` and `local-indus`.

Steps 1 to 4, 6 to 9 and 13 are environment work that may run before stage 1 exits (FR-48-17). On a test site, step 6 sends through the studio's own mailbox (the sandybrown login and key in `.claude/dev-setup.md` §Site email) with `--redirect-all-to` Bean, so cloning never needs the client's mailbox or domain (Bean, 2026-10-12). A client mailbox is set up only where the studio runs that client's email at go-live.

## Appendix B. Indus critical path

Ordered and executable: each step names what it produces, and a step starts only when the steps it names are done. Estimates are the low, likely figure: about 5 minutes for a mechanical agent task and about 15 minutes for a design task, summed per step; "machine" is unattended run time.

**The framework refresh loop.** Written once and named in the steps that need it. After any framework edit (theme, blocks or DB-seeded facts):
1. reseed: `python plugins/sgs-blocks/scripts/sgs-update-v2.py` from a clean `HEAD`, serialised with any other session's deploy or reseed, then `python plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py` (a normal reseed leaves `sgs/hero.splitMediaType` as select-from-enum, which fails the deploy's value-identity gate) and regenerate `attr-role-map.json` after it. The reseed comes first because the deploy's wiring-fingerprint gate fails an attribute the DB does not yet hold (`.claude/dev-setup.md`, "Adding a block attribute?");
2. deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test` (it builds, gates, deploys, verifies and purges caches);
3. mirror refresh: `bash scripts/local-wp/refresh-from-remote.sh local-indus indus-test`, then `scripts/local-wp/sync-build.sh local-indus`;
4. recalibrate the blocks the edit touched: `node scripts/computed-route/calibrate.mjs --site local-indus --client indus-foods --blocks <blocks> --recalibrate` (the slot map, and the default paint once stage 2's snapshot is pushed), then re-record the calibration-debt baseline. A recalibration that would drop a setting the existing slot map reaches is refused (FR-48-3); accept a loss only with `--allow-loss <block>:<setting>` and a proven reason.

One pass is about 10 minutes of agent time and 20 minutes of machine time.

**Total: about 20 h of agent work, about 1.5 h of machine runs, and about 2 h of Bean's time.**

*Set-up (Bean and stage 0)*
1. **Current export** (done 2026-10-11). `sites/indus-foods/handoff/` passes `handoff-check.mjs` after `handoff-repackage.mjs` (Spec 48A FR-48A-1); a design change from here means a fresh export.
2. **Test-site email** (done 2026-10-12). Appendix A step 6 on `indus-test` through the studio mailbox with `--redirect-all-to` Bean; nothing is needed from the client.
3. **Route dependencies** (done 2026-10-11). The route's `package.json` with pinned Playwright, Ajv 8, `ajv-formats`, `saxes` and `@babel/parser`; every import repointed; the lint ban (FR-48-75).
4. **Indus mirror and targets** (done 2026-10-11). Appendix A step 13 for Indus: `local-indus`, its secrets file, the calibration page, and the `indus-test` and `local-indus` entries in `calibration-targets.json`. Check first what `indus-test` already has (Appendix A steps 1 to 3).
5. **Per-site default paint** (done 2026-10-11). `cache/<site>/<block>.paint.json` beside the site-independent slot map, and `lib/cache.mjs` reading and writing both (FR-48-3, §3.2). Needs 3.
6. **Accepted value forms** (done 2026-10-11). Calibration records `clamp`, `vw`, `repeat` and a column count per setting (FR-48-2). Needs 3.
7. **Indus calibration fixes and the desktop tier** (done 2026-10-11). The `container.gridTemplateColumns` marker, the two resolver ties on `container.layout`'s discovered values (FR-48-3), and the resolver reading desktop at 1440 with 1920 as a confirmation (FR-48-74). Needs 3.
8. **Stage 0 command and run** (done 2026-10-12). The handoff check plus the slot-map calibration of the fixed block set on `local-indus`, writing `calibration-baseline.json` (FR-48-3, FR-48-16). Needs 1, 4 to 7.

*Spec 32 framework halves (beside steps 9 to 11)*

9. **Palette slugs** (done 2026-10-12). Spec 32 FR-32-14: the slugs, their consumers and the completeness gate.
10. **Per-tier section padding and gutter tokens** (done 2026-10-12). Spec 32 FR-32-15.
11. **`sgsCustomCss` hardening** (done 2026-10-12). Spec 32 FR-32-20.
12. **Framework refresh loop**, once for 9 to 11 (done 2026-10-12).

*Stage 1: intake*

13. **Intake 4a, run safely and see everything** (agent, 2 h 45 min). The sandbox with the record-and-replay cache (FR-48-23), the determinism harness in both modes (FR-48-28), the manifest re-check, and the census with its static and runtime passes, `construct-registry.json` and its five controls (FR-48-24), with the Appendix C schemas for the reading record, the registry and the baseline. Needs 3.
14. **Intake 4b, propose** (agent, 2 h 30 min). The three routing adapters with the precedence rule (FR-48-26), the width basis (FR-48-27), the page map (FR-48-30), `lib/tokens.mjs` and the palette proposal (FR-48-31), the Site Info proposal with `sync-business-info.py` as a source (FR-48-32), the flags, draft defects and missing features (FR-48-33, FR-48-34), the skeleton inventory and proposal (§3.4), `review.md` with its sections and `intake.mjs --apply-review` (FR-48-17), and the intake and page-map schemas (Appendix C). Needs 13. 14b. **Re-derived inventory and prop variants** (agent, 45 min). FR-48-25 and FR-48-29, the two FR-48-17 work items no other step builds; until then the census registry records the motion kinds as gaps citing FR-48-25. Needs 13.
15. **Intake run and Bean's review** (machine 20 min, Bean 30 min). Needs 8, 9 (the palette proposal reads FR-32-14's slugs from the theme), 14 and 14b.

*Stage 2: site build (steps 16 and the environment parts of Appendix A may start after step 4)*

16. **Appendix A on `indus-test`** (agent, 30 min): the steps not already done. Steps 7 and 9 done 2026-10-12; 5, 10 and 12 done 2026-10-19; 11 is step 18.
17. **Snapshot** (agent, 1 h; done for Indus 2026-10-19). The extractor reads `tokens/*.css` with the confirmed roles and the `border` vocabulary; the Indus snapshot carries the new palette slugs, fluid presets, per-tier padding tokens and `buttonPresets.default.hover-transform`; dry run, then push. Needs 12 and 15.
18. **Site build** (agent 1 h 30 min, Bean 5 min). The site-build script (FR-48-55), media upload (FR-48-58), and Site Info's first real run (FR-48-59, done in step 16 for Indus). Needs 15 and 16.
19. **Default-paint step** (machine 20 min; done for Indus 2026-10-19): stage 2's exit (FR-48-18), as the framework refresh loop's step 4 after the push. Needs 17.

*Stages 3 to 5 for the header first (the vertical slice)*

20. **Header through stage 5** (agent 2 h, Bean 15 min). Skeleton from the confirmed block choices, Fill with declared values and confirm records (FR-48-8), binding grouping (FR-48-41), build, the check with its verdict table (FR-48-36), the 1200 and 1260 thresholds through the breakpoint rule with any snap's ledger entry (FR-48-50), gates G0 to G7 on its rows, and Bean's eye at 375/768/1440. The other surfaces queue until this passes; what it finds is fixed once, before them. Needs 11, 19.

20b. **Effect recognition** (agent 1 h; absorbed into the clone coverage plan's Phase 4, §10.1). FR-48-77's done-when on Indus: the Heritage horizontal track, the ingredient-card cursor reveal, the magnet, the tilt and the logo marquee each mapped to an SGS setting or raised as a named Spec 38 gap. Needs 14b; before 21.

*Stages 3 to 5 for the rest*

21. **Trees** (agent 1 h 30 min, mostly machine). Footer, drawer, mega menus, the page records and the forms.
22. **Forms** (agent, 30 min). Submission path, recipient, success state, validation copy rows; the owner email is addressed to the confirmed recipient (FR-48-57). Needs 2.
23. **Check** (agent, 45 min). Code to code with the render confirming, flows, Solve rounds, every surface.
24. **Answer-sheet sample** (agent 15 min, Bean 10 min). The seeded 10-row F sample labelled by an independent agent from the gate evidence; Bean confirms the disagreements only (FR-48-71, FR-48-73).
25. **Gap list and sign-off** (agent 30 min, Bean 45 min). `gaps.json` with G0 to G7, and Bean's eye at 375/768/1440 on every remaining surface.

## Appendix C. Record formats

The JSON Schema (draft 2020-12) files for these records live in `scripts/computed-route/data/` and are validated with the route's pinned Ajv (FR-48-75). This appendix fixes their shape; the schema files are generated from it and a test fails when the two disagree. Status: built 2026-10-12: every schema file exists and `tests/intake-schemas.test.mjs` fails when one differs from this appendix.

**Calibration baseline:** `sites/<client>/build/intake/calibration-baseline.json` (FR-48-3).

```json
{ "type": "object", "required": ["client", "site", "takenOn", "playwright", "browser", "blockSet", "blocks"],
  "properties": {
    "client": { "type": "string" }, "site": { "type": "string" },
    "takenOn": { "type": "string", "format": "date-time" },
    "playwright": { "type": "string" }, "browser": { "type": "string" },
    "blockSet": { "type": "array", "items": { "type": "string", "pattern": "^sgs/" } },
    "blocks": { "type": "object", "additionalProperties": {
      "type": "object", "required": ["deployHash", "dead", "noMarker", "oneWidth", "untestedStates"],
      "properties": {
        "deployHash": { "type": "string" },
        "dead": { "type": "integer" }, "noMarker": { "type": "integer" },
        "oneWidth": { "type": "integer" }, "untestedStates": { "type": "integer" } } } } } }
```

**Intake record:** `sites/<client>/build/intake/intake.json` (FR-48-35). Top-level keys, all required:

| Key | Holds |
|---|---|
| `schemaVersion` | `"1"` |
| `client`, `takenOn` | the client slug; the run's date and time |
| `manifest` | `MANIFEST.json`'s `schema_version` and its hash per file |
| `tools` | Playwright, browser and runtime (`support.js`) versions |
| `harness` | the clock instant, the random seed, the step sizes and counts of FR-48-28 |
| `census` | one row per construct: `kind`, `draftId`, `source` (`static`, `runtime` or both), `reader` or `gap`, `unreached` |
| `inventory` | the re-derived `animations` and `surfaces` (the master schemas' shape), the diff rows against Claude Design's copies (`rowId`, built from the pairing key, never a record ID; `draftId`, `field`, `ours`, `theirs`, `why`), each counted occurrence's record IDs (`occurrences`), the prop variants (`propVariants`) and the timer- and frame-written samples (`samples`) |
| `routing` | the adapter chosen, the routes, and each link's route |
| `breakpoints` | the width basis and every threshold with its operator |
| `pageMap` | the proposed rows (same shape as `page-map.json`) |
| `palette` | declared tokens from `lib/tokens.mjs` and the proposed role per token |
| `siteInfo` | the proposed key, value, source and validation result per key |
| `flags`, `draftDefects`, `missingFeatures` | one row each, with `rowId` and `draftId` |
| `notDefects` | every unreached construct ruled not a draft defect (FR-48-34): `draftId`, `censusId`, `why` (`render-wins`, `reached-when-forced`, `breakpoint`, `dead-code`, `prototype-only`, `prop-variant`), for dead code `deadKind` (`unwired`, `constant-guard`, `data-gated`), and `note`; the review lists the unwired dead-code entries and counts the rest per reason and kind |
| `skeletons` | per surface, the inventory summary and the proposed block per key with its confidence and `rule` (the standing rule or client-built post that settled it, FR-48-6; null when the scoring proposed it), plus `into` for a row absorbed into another block's row and `builtPost` for a row a client-built post settles |
| `notices` | `prose`: command-like text in the exported prose (FR-48-23); `blockedHosts`: each request the sandbox aborted, with its host, reason and draft ID |
| `gaps` | R-48-3 gap rows: construct, draft ID, error text |
| `review` | per row: `rowId`, `rowType`, `contentHash`, `mark`, `markedOn`, `carriedFrom` (a previous intake's date or null), and `changed` (true when the row's content hash differs from the carried intake's) |

**Construct registry:** `scripts/computed-route/data/construct-registry.json` (FR-48-24).

```json
{ "type": "object", "additionalProperties": {
    "oneOf": [
      { "type": "object", "required": ["module", "fn"], "additionalProperties": false,
        "properties": { "module": { "type": "string", "pattern": "^lib/.+\\.mjs$" }, "fn": { "type": "string" } } },
      { "type": "object", "required": ["gap"], "additionalProperties": false,
        "properties": { "gap": { "type": "string", "minLength": 1 } } } ] } }
```

Each key is a construct kind (`sc-if`, `sc-for`, `dc-import`, `binding`, `style-hover`, `getter`, `renderVals-key`, `handler`, `timer`, `observer`, `waapi`, `transition`, `keyframes`, `ref`, `data-hook`, `helmet-script`, `helmet-font`, `link`, `template-element`).

**Page map row:** each item of `sites/<client>/build/page-map.json` (FR-48-30).

```json
{ "type": "object", "required": ["slug", "title", "postType", "collection", "id"], "additionalProperties": false,
  "properties": {
    "route": { "type": "string" }, "slug": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "title": { "type": "string" }, "parent": { "type": ["string", "null"] },
    "template": { "type": ["string", "null"] },
    "menus": { "type": "array", "items": { "type": "object", "required": ["menu", "position"],
      "properties": { "menu": { "type": "string" }, "position": { "type": "integer" },
        "parentItem": { "type": ["string", "null"] } } } },
    "postType": { "enum": ["page", "post", "product", "product_cat", "shop", "sgs_header", "sgs_footer", "sgs_drawer",
      "sgs_modal", "sgs_mega_menu", "sgs_form", "sgs_choice_flow", "wp_block"] },
    "collection": { "enum": ["static", "live"] },
    "flags": { "type": "array", "items": { "enum": ["placeholder", "stock", "prototype-only"] } },
    "id": { "type": ["integer", "null"] } } }
```

**Reading:** one record per element, width, state and sample time (FR-48-28), written as JSON lines sorted by `draftId`, then `path`, then property.

```json
{ "type": "object", "required": ["surface", "mode", "width", "state", "t", "draftId", "path", "computed", "box", "harness"],
  "properties": {
    "surface": { "type": "string" }, "mode": { "enum": ["rest", "sample"] },
    "width": { "type": "integer" }, "state": { "type": "string" }, "t": { "type": "number" },
    "draftId": { "type": "string" }, "path": { "type": "string" },
    "computed": { "type": "object", "additionalProperties": { "type": "string" } },
    "declared": { "type": "object", "additionalProperties": { "type": "string" } },
    "box": { "type": "object", "required": ["x", "y", "w", "h"] },
    "harness": { "type": "object", "required": ["clock", "seed", "stepMs"] } } }
```

**Review marks**, per row type (FR-48-17). A section's "accept all" sets the first value on every row in it.

| Row type | Mark values |
|---|---|
| Page map | `accept`, `edit:<field>=<value>`, `drop` |
| Palette role | `accept`, `role:<slug>[,<slug>...]` (one draft colour can fill several slugs), `one-off` (stays hex) |
| Site Info key | `accept`, `edit:<value>`, `drop` |
| Flag (placeholder, stock, prototype-only) | `accept-flagged` (the default), `not-flagged` |
| Draft defect | `accept` (build the code's intent), `render-wins` |
| Not a defect (unwired dead code) | `not-a-defect` (the default), `defect` (build it as a draft defect) |
| Missing feature | `map:<block>`, `difference` (record as deliberate), `build`, `gap:<wave>` (a tracked gap in the clone coverage map's Phase 4 wave); "accept all" sets `map:<block>` on a row proposing a block, `gap:<wave>` on a seen-but-unsupported row (`difference` when its capability is excluded), and nothing on any other row |
| Skeleton block choice | `accept`, `block:<slug>`, `remove` (the element is absorbed into its parent block and gets none of its own) |
| Inventory diff | `ours`, `theirs` |
| Unknown host request or command-like prose | `noted` |