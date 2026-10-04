# Computed route (Spec 47)

Measures a rendered design draft and writes block settings through the framework database, one surface at a time.
**Solve** takes an existing layout tree, compares it with the draft through the parity walker, turns each difference
into a setting write, rebuilds and repeats (at most three rounds). **Fill** (not built yet) fills a skeleton tree from
the measured draft. Governing spec: `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`.

**Never touches:** `plugins/sgs-blocks/scripts/` (the Spec 31 converter: its `db_lookup.py` migrates the shared DB on
import), the framework DB's contents (opened read-only), the canary's homepage, posts page or motion-QA fixtures, and
any site's active header, footer, drawer or snapshot pointer (R-47-1, R-47-2, R-47-11). `lint.mjs` enforces the index
below and the import ban.

**External imports, read-only:** `node:sqlite`; `plugins/sgs-blocks/src/blocks/*/block.json` (attribute schemas);
`scripts/parity/lib/*.mjs`; `scripts/wp-build-page.js` and `scripts/parity/draft-live-walk.mjs`, run as commands.

**Tests:** `node --test "scripts/computed-route/tests/*.test.mjs"` (Node 24 runs a glob, not a bare folder). Each
file names the rule it proves and has one case marked MUST FAIL.

## Files

| File | Job |
|---|---|
| `README.md` | This index. |
| `lint.mjs` | The route's gate: README index, converter-import ban, no core `style` or `native_wp` writes in a `--tree`, no style values in a `--skeleton`, every printed post owned by a surface in a `--surfaces` manifest, client names. |
| `calibrate.mjs` | Calibration command: refuses on a deploy mismatch, builds each block's markers on the calibration page (a marker with `base` beside a baseline instance carrying those attributes, in every chunk), reads them at 375/768/1440 (hover under a real mouse; scrolled markers with the window scrolled, against a scrolled default), writes `cache/<block>.json` (one library-wide cache: a block measured on another site is skipped unless `--recalibrate`), empties the page. |
| `solve.mjs` | Solve command: refs, then up to three build, walk and write rounds, a final build and walk, classification and the solve report. Each `surfaces.json` entry must carry `states` (walker state → setting state; unmapped states are reported, never written) and may carry `walkStates` (passed to the walker as `--states`) and `provides` (the linked blocks and template parts whose post it is, `"<block>:<value>"`). A linked placeholder is never written. |
| `pairs.mjs` | Block pairing command: pairs every block of a surface with its draft element through the walker's word matcher, re-checks each kept finder at 375 and 768, and writes `<surface>.full.mjs` (the hand config plus one pair per block) and `qa/pairs/<surface>.json` (kept pairs and every left-out block with its reason). A surface's `walkerFull` in `surfaces.json` makes Solve walk it. |
| `calibration-targets.json` | The calibration page per site (`envFile`, `envKey`, `postId`). |
| `calibration-fixtures.json` | Minimum content, inner blocks, parent chain, optional variants and optional `before` blocks (placed ahead of the instance, for a block that reads the page, such as a table of contents) per calibrated block. |
| `ledger.mjs` | Divergence ledger command: `accept <report.json> <row id>` adds an entry dated today; `stale <report.json>` exits 1 while any entry is stale. |
| `lib/db.mjs` | Read-only `block_attributes` queries. |
| `lib/normalise.mjs` | Value parsing and token snapping from `theme-snapshot.json`, with the snap log. |
| `lib/resolve.mjs` | The one property-to-setting engine. |
| `lib/tree.mjs` | Trees: read, write, refs, setting writes, live-site safety. |
| `lib/cache.mjs` | The library-wide calibration cache: which site measured a block, and the cross-site guard. |
| `lib/calibrate.mjs` | Calibration library: markers per setting shape, calibration trees, in-page reads, slot detection, default paint. |
| `lib/solve-rows.mjs` | Solve's reading of a walker report: open rows, writable groups, draft values per width, classification. |
| `lib/solve-report.mjs` | Writes `solve-report.md` and `solve-report.json`. |
| `lib/references.mjs` | Reference blocks found from each block's render.php (linked placeholders, frames around another post's blocks, core template parts) and the surfaces lint that every printed post has a surface. |
| `lib/entrance.mjs` | Entrance start: a block the draft shows at rest while live holds its entrance waiting for a scroll gets `sgsAnimationStart: 'load'` (Spec 38). |
| `lib/pairs.mjs` | Block pairing: words per block, their draft twins (repeated words planned apart), the partner choice (element, padded wrapper or text run), the keep-or-leave-out judgement (PAIRING_LIMITS) and the generated config's text. |
| `lib/pairs-page.mjs` | Block pairing's in-page collectors: tagged words, live block boxes and text runs, draft chains (repeated words placed nearest the sure ones), form controls by identity, hand pair elements, and the draft opened through its navigation. |
| `lib/guard.mjs` | The regression guard: reverts a write calibration names, else tries one suspect at a time and lets the next walk decide. |
| `lib/ledger.mjs` | Ledger library: rules, matching, stale entries, accept migration, entries from report rows. |
| `tests/db.test.mjs` | R-47-2: read-only database. |
| `tests/normalise.test.mjs` | R-47-7: tokens before literals. |
| `tests/resolve.test.mjs` | FR-47-1: storage shapes and gaps; border-radius written as corners, never sides. |
| `tests/tree.test.mjs` | R-47-11 and tree writes. |
| `tests/calibrate.test.mjs` | FR-47-2: setting states calibrate only through a known trigger; the deploy key ignores webpack module numbering but not code; a run never replaces another site's cache file without `--recalibrate`; a border-style marker carries its companion width and maps against a width baseline (CR11). |
| `tests/ledger.test.mjs` | FR-47-5: validation, stale entries, migration, accept. |
| `tests/references.test.mjs` | Reference blocks: the detector, the linked-placeholder rule in Solve, the surfaces lint. |
| `tests/lint.test.mjs` | R-47-1 and R-47-10 through the lint. |
| `tests/solve.test.mjs` | R-47-9: the guard reverts only the write calibration names, or proves a suspect by the next walk and restores an innocent one; walker state mapping (an unmapped state is never written). |
| `tests/pairs.test.mjs` | Block pairing: a partner is kept only when it holds the block's words and none from outside it, at a similar size, with its padding where the block's is; hand pairs measuring a paired block's draft element move to the block root. |
| `tests/entrance.test.mjs` | Entrance start: a hidden-live, shown-draft entrance gets `sgsAnimationStart: 'load'`; no entrance, a part, a hover, a half opacity or a hidden draft gets nothing. |
| `tests/walker-refs.test.mjs` | FR-47-6 items 6 and 7 at unit level (element paths, row stamping, divergence matching); flow position rows and the identity transform (GAP-CHECKLIST section 17). |

`cache/` (gitignored) holds calibration files: one per block for the whole library, each recording the `site` that measured it.

## Functions

### `lib/db.mjs` (imports `node:sqlite`)
- `DB_PATH`: the framework database file.
- `openDb(file?)` → a read-only `DatabaseSync`.
- `attrsFor(db, block)` → the block's `sgs` rows that paint a CSS property.
- `candidates(db, block, prop, state?)` → rows painting `prop` (shorthand or comma-list member) in `state`.
- `enumSettings(db, block)` → enum settings with no css_property (calibration discovers what each value paints).
- `siblings(db, block, attr)` → the `flat_sibling` rows sharing `attr`'s base name.
- `attrRow(db, block, attr)` → one row whatever its source, or null.

### `lib/normalise.mjs`
- `COLOUR_DE`, `LENGTH_TOL`: snap tolerances (ΔE 2, 0.5px).
- `round(n)` → 3 decimals.
- `parseLength(v)` → `{ n, unit }` or null.
- `toPx(v, fontPx?)` → px (em against the font size, rem against 16px) or null.
- `pxTo(px, unit, fontPx?)` → the length in `unit`.
- `parseColour(v)` → `{ r, g, b, a }` from hex or rgb(a).
- `toHex(c)` → `#RRGGBB` or `#RRGGBBAA`.
- `deltaE(a, b)` → CIE76 distance.
- `loadSnapshot(file)` → `{ palette, spacing, fontSizes }` with px values.
- `snapColour(value, snapshot, { log, where, prefer })` → `{ form: 'slug'|'hex', value, distance, kind }`, logged.
- `snapLength(px, tokens, { log, where })` → `{ slug, distance, kind }` or null, logged.
- `ratioSetting(raw, def)` → `{ value }` or `{ error }`: a measured `aspect-ratio` in the setting's form (the enum value painting the same ratio, `"w / h"` for a free string, `auto` as the empty setting; `auto w / h` cannot be held).

### `lib/resolve.mjs` (reads block.json files)
- `BLOCKS_DIR`: the block sources folder.
- `GAPS`: gap reasons (`no-setting`, `ambiguous`, `shape`, `uncalibrated`).
- `blockSchema(slug)` → the block's `block.json` attributes.
- `splitProperty(prop)` → `{ short, side }` (a walker longhand as the database shorthand and box side).
- `tiersOf(perWidth, prop)` → `{ tiers }` (375 mobile, 768 tablet, 1440 and 1920 desktop) or `{ error }`.
- `resolveDiscovered(input, calibration)` → a write for a setting calibration found (an enum value whose effects match the draft; ties broken by the element's other properties), a gap, or null.
- `CORNERS`, `radiusCorners(raw)` → a border-radius box's corner keys (`helpers-box.php::sgs_border_radius_tiers` reads only these), and the computed shorthand as corners (null when elliptical); border-radius writes are corner objects, per device when the default is a tier object.
- `WIDER_TIERS`: the tiers an empty tier falls back to, nearest first; box seeding takes an empty tier's other sides from the node's nearest wider tier before the default paint.
- `resolve(input, ctx)` → `{ writes: [{ attr, value, merge }] }` or `{ gap, detail }`.

### `lib/tree.mjs`
- `REF_PREFIX`: `cr-ref-`.
- `FORBIDDEN_POSTS`: canary 2742 and 2741 and the motion-QA fixtures.
- `readTree(file)`, `writeTree(file, tree)`.
- `walk(tree, fn)`: depth-first, `fn(node, index, parent)`.
- `refOf(node)` → the node's ref class or null.
- `addRefs(tree, surface)` → count added (`cr-ref-<surface>-<n>`, n = depth-first index).
- `stripRefs(tree)`: removes every ref class (a final build).
- `nodeByRef(tree, ref)` → the node.
- `setAttr(node, write)` → `{ before, after }` (deep merges keep other tiers and sides).
- `refAncestors(tree)` → each ref with its ancestors' refs (nearest last).
- `writableTargets(manifests)` → `{ posts, templates }` from calibration-targets.json and surfaces.json.
- `assertWritable(target, manifests)`: throws on a forbidden or unlisted target (R-47-11).
- `assertQuiet(sshArgs?)`: throws while a deploy or reseed runs (host process list, local process list).

### `lib/ledger.mjs`
- `RULES`: rule names with their meaning.
- `validate(entries)`: throws on missing keys, unknown rules, bad dates, duplicate ids.
- `load(file)` → validated entries (empty when the file is absent); `save(file, entries)`.
- `match(entries, row)` → the entry covering a row, or null.
- `measurements(report)` → every traced measured property of a walker report.
- `stale(entries, { refs, rows })` → `[{ id, why }]`.
- `migrateAccepts(accepts, { scope, firstId, decided })` → `{ migrated, unmigrated }`.
- `entryFromRow(report, rowId, { reason, scope, entries, source })` → a new entry.

### `lib/cache.mjs`
- `cachedSite(file)` → the site a block's cache file was measured on, or null.
- `skipReason(file, site, recalibrate?)` → why a run on `site` must leave the file alone (measured on another site, no `--recalibrate`), or null.

### `lib/calibrate.mjs` (imports `scripts/parity/lib/collect.mjs` and `ref-trace.mjs`)
- `WIDTHS`: 375, 768, 1440. `MARKER_HEX`, `MARKER_RGB`: the colour marker. `CAL_PREFIX`: `cr-ref-cal-`.
- `READ_PROPS`: the properties read per element. `INHERITED`: never recorded as default paint.
- `STATE_TRIGGERS`, `SCROLL_Y`: how each setting state is reached (`hover` real mouse, `scrolled` window scroll, `open` and `current` rendered by the fixture). `triggerFor(state)` → the trigger, `null` for rest, undefined when the state has none (reported, never calibrated).
- `longhands(cssProperty)` → the walker longhands a setting covers.
- `markersFor(row, schema, snapshot, current)` → `[{ label, attrs, expect, form?, base? }]` (§3.2 table); a border-style marker carries its companion width and `base` (the baseline attributes it is read against).
- `companionWidth(styleAttr, schema)` → `{ attr, attrs }`: the width a border-style marker needs (`<x>Style` → `<x>Width`, 3px in the attribute's own shape), or null.
- `buildTree(block, fixture, instances)` → the calibration tree.
- `readInstancesInPage([count, prefix, props, pathSrc])`: in-page; every element of each instance by path.
- `elementPath`: re-exported from `scripts/parity/lib/ref-trace.mjs`.
- `slotFor(row, marker, defReads, markReads)` → `{ slot, slots, property, transform, reachedAt, oneWidth, effects }` or `{ dead }`.
- `discoverEffects(defReads, markReads)` → what one enum value changes: `{ prop: { slots, value } }`.
- `defaultPaint(defReads)` → per element and width, non-inherited properties.

### `calibrate.mjs` (runs `wp-build-page.js`, ssh, Playwright)
- `REMOTE_PLUGIN`: the plugin folder on the host per site.
- `CHUNK`: the most instances one calibration page holds (150); a larger block is built and read in chunks, each carrying every variant's default instance.
- `EDITOR_ONLY`: the editor bundles left out of the key (the same commit built in another folder gives a different `index.js`).
- `BUNDLE_TEXT`, `normaliseBundle(rel, text)`: view bundles and asset files with webpack's folder-dependent module numbers and the asset version blanked (the same commit built in two folders numbers its modules differently).
- `TEXT_FILE`, `lfText(buf)`: local text files read with LF endings (the deploy builds from a clean LF checkout; a working copy may carry CRLF).
- `localBlockHash(dir)`, `remoteBlockHash(site, short)`: md5 of a block's front-end build files (bundles normalised), same listing both sides.

### `lib/solve-rows.mjs`
- `WRITABLE_KINDS`: style, hover, box. `groupKey(row, state)`: ref, path, property, setting state.
- `cssProp(key)` → the CSS property a walker row's key stands for: `icon-width`/`icon-height` (rows on the svg's own path) are its `width`/`height`; `painted-ground` is `background-color`.
- `settingState(row, stateMap)` → the row's setting state from the surface's walker-state map (`null` rest, `'hover'`, `'scrolled'`, …), or undefined when the walker state is unmapped or the row is a hover outside rest.
- `openRows(report)` → every unaccepted row with its walker state, width and pair.
- `draftValues(report, pair, prop, hover, walkerStates?)` → `{ perWidth, fontPx }` from the draft snapshots, read only from runs in `walkerStates` when given.
- `writableGroups(report, stateMap)` → `{ groups, box, unmapped, unmappedState, other }`; each group carries its setting `state` and `walkerStates`.
- `rowDistance(row)` → px distance from the draft (0 or 1 for non-lengths).
- `regressedRows(prev, report)` → open style or box rows that are new or further from the draft than last round (keyed per walker state).
- `classify(report, { writes, gaps, elements, stateMap })` → `{ hardcode, missing, unresolved, derived, other }`.
- `intendedCount(report)` → accepted rows.

### `lib/solve-report.mjs`
- `wholePage(before, after, classes, prefix?)` → distinct style, hover and box issues before and after: `{ before, after, closed, new, labelledGap, unexplained }` (a labelled gap counts as handled only once proven). With `prefix` (writeSolveReport passes `cr-ref-<surface>-`), only the surface's own blocks' rows and rows with no block count: a surface sharing its walker is not judged on its neighbour's blocks.
- `writeSolveReport(outDir, result)`.

### `lib/references.mjs` (reads `plugins/sgs-blocks/src/blocks/*/render.php`)
- `BLOCKS_SRC`: the block sources folder. `CORE_PLACEHOLDERS`: core blocks that print another post or part, with the attribute naming it.
- `referenceKind(src)` → `{ kind: 'linked', flag, key }` (a `<x>IsLinked` flag: own settings unused when on), `{ kind: 'frame', key }` (a `<x>Ref` post printed with `do_blocks`), or null.
- `detectReferences(dir?)` → every SGS reference block.
- `referenceOf(node, refs)` → the reference a tree node holds, or null (a linked block only with its flag on).
- `lintSurfaces(surfaces, buildDir, refs?)` → problems: a tree prints a post that no surface targets (frames) or `provides` (linked blocks, template parts).

### `lib/entrance.mjs`

- `entranceStart(group, node, perWidth)` → `{ writes }` (`sgsAnimationStart: 'load'`) when the block has an entrance, the group is a rest opacity, translate or transform on the block's own element, every draft value is the shown value and every live value the hidden one; else null. `solve.mjs::writeRound` tries it before the resolver.

### `lib/pairs-page.mjs`

- `collectTagged(page, side, cfg)` → the page's words with their tagged elements, as the walker's automatic check collects them.
- `liveBlocks(page, prefix)` → `{ refs, boxes, parents }`: the refs around each live word (innermost first), each block's border box, content box and text run, and each block's parent block on this surface.
- `draftChains(page, want, wordEls, match)` → per block, the chain from the smallest draft element holding its chosen words up to `<body>`, the first carrying `own` (the words are its own text) and `run` (its text run's extent).
- `formControls(page, prefix, side, idents?)` → live: each block's first visible control identity (name, else id, placeholder, label, a select's first option); draft (with `idents`): per block, the chain from the visible control with that identity through every ancestor holding no other control. Hidden controls (a honeypot) never count.
- `groupBoxes(page, groups)` → per block, the union box of the draft elements at its children's partner paths.
- `handElements(page, finders, side, prefix)` → per hand pair, its draft path or its live block ref and whether it is that block's root.
- `openDraft(browser, cfg, width)` → the draft page opened through the hand config's navigation with every scroll reveal fired.

### `lib/pairs.mjs`
- `PAIRING_LIMITS`: a pairing is left out under 80% of the block's words matched, with a word from outside the block, with a box outside half to double the block's, or when it holds no padding where the block does and their content boxes match within `boxTolerance` (2px) (the padding sits on a draft ancestor).
- `paddedPartner(chain, liveBox, limits?)` → the partner from the draft chain (smallest element holding the twins, then its ancestors, nearest first): the first element, or, when its padding sits elsewhere, the nearest ancestor wrapping it with padding of its own.
- `wordsByBlock(liveRefs)` → Map ref → live word indices (every word inside the block, nested blocks included).
- `twinsByBlock(matches, blocks)` → Map ref → `{ live, draft }` (the block's words and their draft twins).
- `judgePairing(block, partner, liveRefsOfDraft, limits?)` → `{ ok, why }`.
- `twinPlan(draftIdx, words)` → `{ sure, repeated }`: element indices of the block's words whose text occurs once on the draft, and, per repeated text, every candidate element (draftChains places it nearest the sure words).
- `commonPath(paths)` → the deepest element path the given draft paths share, or null (a block of repeated words only, with no parent partner, anchors on its child blocks' partners' common ancestor).
- `wordMatch(texts)` → a regex source (flags `iu`) matching a text node holding any of the block's words as whole words; a text run takes only those nodes.
- `choosePartner(chain, block, liveRefsOfDraft, limits?)` → `{ partner, verdict }`: the element partner when it passes; else, when the draft element has the block's text but not its box, or shares its element with another block's words while the block's words are its own text, a text-run partner (`textRun: { direct }`) judged on both sides' text extents.
- `chooseControlPartner(chain, liveBox, limits?)` → `{ partner, verdict }` for a form-control block (no painted words): of the draft control's chain (the control, then each ancestor holding no other control), the element nearest the block's box within the size limits.
- `chooseGroupPartner(childPaths, groupBox, liveBox, limits?)` → `{ partner, verdict }` for a block whose draft element holds other blocks' words but whose children are paired: the group of its children's draft partners (`group: { paths }`), compared by union box only (the walker's `{ group }` finder, `paint.mjs::groupBox`).
- `reconcileHandPairs(hand, kept)` → `{ retarget, duplicate }`: a hand pair measuring a kept block's draft element on an element inside that block moves to the block root (`retarget`), and the generated pair it then duplicates is dropped (`duplicate`).
- `configText(handFile, surface, pairs, retarget?)` → the generated walker config's source (hand pairs named in `retarget` measure the given live finder).

### `lib/guard.mjs`
- `explains(w, r, cal)` → true when calibration ties write `w` to regressed row `r` (its own property, a calibrated side effect, or a discovered layout effect).
- `anchorRef(report, r)` → the ref of the pair a distance row (`y-from-<pair>`, `x-from-`, `right-from-`) is measured from, from the walk's live trace, or null. When the row's own node holds no write, the guard's suspects are the writes inside that node and inside the anchor pair.
- `settingsOf(writes)` → the writes grouped by node and attribute (writes to one attribute chain, so they are undone together).
- `suspectOrder(settings, calFor)` → layout-mode settings first, then settings writing a layout property, then the latest.
- `guardRound(base, report, tree, lastWrites, blocked, calFor, trials)` → the writes whose state changed (reverted, under trial, restored); settles last round's trials against the new walk first.
- `closeTrials(trials, blocked)` → settings still under trial when the run ends, reported as unconfirmed reverts.

### `solve.mjs` (runs `wp-build-page.js` and the walker)
- `WIDTH_GROUPS`: one walker per width, run in parallel (each with its own draft cache).
- `mergeReports(parts)` → one report from the per-width walks (runs in width order, errors by width).
- `WALK_FLAGS`: headless unless `SGS_HEADED=1` (Hostinger's edge 403s headless browsers after bursts of traffic; `pairs.mjs`, `calibrate.mjs` and `scripts/wp-build-page.js` honour the same switch, scrollbars hidden); every round's walk is lean (`--lean`: only the styles, boxes, hover end states and structure Solve reads) and reuses the run's draft reads (`--draft-cache <run dir>/draft-cache.json`).
- `USED_VALUES`: computed properties that are used sizes (`width`), reported and never written.
- `calibrationFor(block)` → the block's calibration file or null.
- `writeRound(report, tree, { db, snapshot, round, log, blocked, stateMap, calFor? })` → `{ writes, gaps }`; only rows from mapped walker states are written.
- `revertRegressions(prev, report, tree, lastWrites, blocked, calFor?, trials?)` → the writes the guard undid this round (`lib/guard.mjs::guardRound`).
- `wrongWrites(writes, reportAfter, stateMap)` → writes a later round reverted or that moved their rows further from the draft.

### `lint.mjs`
- `routeFiles(root)` → every route file, relative.
- `exportsOf(src)` → exported names.
- `lintFolder(root)` → problems (README index, converter imports).
- `lintTree(tree, db, label?)` → problems (core style, native_wp).
- `lintSkeleton(tree, db, label?)` → problems (style values).
