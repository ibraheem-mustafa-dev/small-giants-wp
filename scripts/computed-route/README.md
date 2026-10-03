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
| `lint.mjs` | The route's gate: README index, converter-import ban, no core `style` or `native_wp` writes in a `--tree`, no style values in a `--skeleton`, client names. |
| `calibrate.mjs` | Calibration command: refuses on a deploy mismatch, builds each block's markers on the calibration page, reads them at 375/768/1440 (hover under a real mouse), writes `cache/<block>.json`, empties the page. |
| `solve.mjs` | Solve command: refs, then up to three build, walk and write rounds, a final build and walk, classification and the solve report. Each `surfaces.json` entry must carry `states` (walker state → setting state; unmapped states are reported, never written) and may carry `walkStates` (passed to the walker as `--states`). |
| `calibration-targets.json` | The calibration page per site (`envFile`, `envKey`, `postId`). |
| `calibration-fixtures.json` | Minimum content, inner blocks, parent chain and optional variants per calibrated block. |
| `ledger.mjs` | Divergence ledger command: `accept <report.json> <row id>` adds an entry dated today; `stale <report.json>` exits 1 while any entry is stale. |
| `lib/db.mjs` | Read-only `block_attributes` queries. |
| `lib/normalise.mjs` | Value parsing and token snapping from `theme-snapshot.json`, with the snap log. |
| `lib/resolve.mjs` | The one property-to-setting engine. |
| `lib/tree.mjs` | Trees: read, write, refs, setting writes, live-site safety. |
| `lib/calibrate.mjs` | Calibration library: markers per setting shape, calibration trees, in-page reads, slot detection, default paint. |
| `lib/solve-rows.mjs` | Solve's reading of a walker report: open rows, writable groups, draft values per width, classification. |
| `lib/solve-report.mjs` | Writes `solve-report.md` and `solve-report.json`. |
| `lib/ledger.mjs` | Ledger library: rules, matching, stale entries, accept migration, entries from report rows. |
| `tests/db.test.mjs` | R-47-2: read-only database. |
| `tests/normalise.test.mjs` | R-47-7: tokens before literals. |
| `tests/resolve.test.mjs` | FR-47-1: storage shapes and gaps. |
| `tests/tree.test.mjs` | R-47-11 and tree writes. |
| `tests/ledger.test.mjs` | FR-47-5: validation, stale entries, migration, accept. |
| `tests/lint.test.mjs` | R-47-1 and R-47-10 through the lint. |
| `tests/solve.test.mjs` | R-47-9: the regression guard pins only the write whose side effects explain the regression; walker state mapping (an unmapped state is never written). |
| `tests/walker-refs.test.mjs` | FR-47-6 items 6 and 7 at unit level (element paths, row stamping, divergence matching). |

`cache/` (gitignored) holds calibration files.

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

### `lib/resolve.mjs` (reads block.json files)
- `BLOCKS_DIR`: the block sources folder.
- `GAPS`: gap reasons (`no-setting`, `ambiguous`, `shape`, `uncalibrated`).
- `blockSchema(slug)` → the block's `block.json` attributes.
- `splitProperty(prop)` → `{ short, side }` (a walker longhand as the database shorthand and box side).
- `tiersOf(perWidth, prop)` → `{ tiers }` (375 mobile, 768 tablet, 1440 and 1920 desktop) or `{ error }`.
- `resolveDiscovered(input, calibration)` → a write for a setting calibration found (an enum value whose effects match the draft; ties broken by the element's other properties), a gap, or null.
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

### `lib/calibrate.mjs` (imports `scripts/parity/lib/collect.mjs` and `ref-trace.mjs`)
- `WIDTHS`: 375, 768, 1440. `MARKER_HEX`, `MARKER_RGB`: the colour marker. `CAL_PREFIX`: `cr-ref-cal-`.
- `READ_PROPS`: the properties read per element. `INHERITED`: never recorded as default paint.
- `longhands(cssProperty)` → the walker longhands a setting covers.
- `markersFor(row, schema, snapshot, current)` → `[{ label, attrs, expect, form? }]` (§3.2 table).
- `buildTree(block, fixture, instances)` → the calibration tree.
- `readInstancesInPage([count, prefix, props, pathSrc])`: in-page; every element of each instance by path.
- `elementPath`: re-exported from `scripts/parity/lib/ref-trace.mjs`.
- `slotFor(row, marker, defReads, markReads)` → `{ slot, slots, property, transform, reachedAt, oneWidth, effects }` or `{ dead }`.
- `discoverEffects(defReads, markReads)` → what one enum value changes: `{ prop: { slots, value } }`.
- `defaultPaint(defReads)` → per element and width, non-inherited properties.

### `calibrate.mjs` (runs `wp-build-page.js`, ssh, Playwright)
- `REMOTE_PLUGIN`: the plugin folder on the host per site.
- `EDITOR_ONLY`: the editor bundles left out of the key (the same commit built in another folder gives a different `index.js`).
- `localBlockHash(dir)`, `remoteBlockHash(site, short)`: md5 of a block's front-end build files, same listing both sides.

### `lib/solve-rows.mjs`
- `WRITABLE_KINDS`: style, hover, box. `groupKey(row, state)`: ref, path, property, setting state.
- `settingState(row, stateMap)` → the row's setting state from the surface's walker-state map (`null` rest, `'hover'`, `'scrolled'`, …), or undefined when the walker state is unmapped or the row is a hover outside rest.
- `openRows(report)` → every unaccepted row with its walker state, width and pair.
- `draftValues(report, pair, prop, hover, walkerStates?)` → `{ perWidth, fontPx }` from the draft snapshots, read only from runs in `walkerStates` when given.
- `writableGroups(report, stateMap)` → `{ groups, box, unmapped, unmappedState, other }`; each group carries its setting `state` and `walkerStates`.
- `rowDistance(row)` → px distance from the draft (0 or 1 for non-lengths).
- `regressedRows(prev, report)` → open style or box rows that are new or further from the draft than last round (keyed per walker state).
- `classify(report, { writes, gaps, elements, stateMap })` → `{ hardcode, missing, unresolved, derived, other }`.
- `intendedCount(report)` → accepted rows.

### `lib/solve-report.mjs`
- `writeSolveReport(outDir, result)`.

### `solve.mjs` (runs `wp-build-page.js` and the walker)
- `USED_VALUES`: computed properties that are used sizes (`width`), reported and never written.
- `calibrationFor(block)` → the block's calibration file or null.
- `writeRound(report, tree, { db, snapshot, round, log, blocked, stateMap, calFor? })` → `{ writes, gaps }`; only rows from mapped walker states are written.
- `revertRegressions(prev, report, tree, lastWrites, blocked, calFor?)` → the reverted writes (the regression guard, pinned through calibrated side effects).
- `wrongWrites(writes, reportAfter, stateMap)` → writes a later round reverted or that moved their rows further from the draft.

### `lint.mjs`
- `routeFiles(root)` → every route file, relative.
- `exportsOf(src)` → exported names.
- `lintFolder(root)` → problems (README index, converter imports).
- `lintTree(tree, db, label?)` → problems (core style, native_wp).
- `lintSkeleton(tree, db, label?)` → problems (style values).
