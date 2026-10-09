# Computed route (Spec 47)

Measures a rendered design draft and writes block settings through the framework database, one surface at a time.
**Solve** takes an existing layout tree, compares it with the draft through the parity walker, turns each difference
into a setting write, rebuilds and repeats (at most three rounds). **Fill** (not built yet) fills a skeleton tree from
the measured draft. Governing spec: `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`.

**Never touches:** `plugins/sgs-blocks/scripts/` (nothing is imported from it), the framework DB's contents (opened read-only, never written), the canary's homepage, posts page or motion-QA fixtures, and
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
| `lint.mjs` | The route's gate: README index, plugins/sgs-blocks/scripts import ban, no core `style` or `native_wp` writes in a `--tree`, no style values in a `--skeleton`, every printed post owned by a surface in a `--surfaces` manifest, every divergence-ledger entry beside that manifest citing register items its register holds (`--register`, else the `register` of `qa/ledger.config.json` beside the ledger; B4), client names. |
| `calibrate.mjs` | Calibration command: refuses on a deploy mismatch, builds each block's markers on the calibration page (a marker with `base` beside a baseline instance carrying those attributes, in every chunk), reads them at 375/768/1440 (hover under a real mouse and focus by keyboard on the styled element, its panel opened when hidden; a shrunk marker with its ancestor class; scrolled markers with the window scrolled, against a scrolled default), writes `cache/<block>.json` (one library-wide cache: a block measured on another site is skipped unless `--recalibrate`), empties the page. |
| `solve.mjs` | Solve command: refs, then up to three build, walk and write rounds, a final build and walk, classification and the solve report. Each `surfaces.json` entry must carry `states` (walker state → setting state; unmapped states are reported, never written) and may carry `walkStates` (passed to the walker as `--states`) and `provides` (the linked blocks and template parts whose post it is, `"<block>:<value>"`). A linked placeholder is never written. |
| `fill.mjs` | Fill command (FR-47-4): a skeleton tree plus a draft (a hosted url or a local folder) to a tree resolved root-down in one pass, before anything is built. Needs `--client`, `--surface`, `--skeleton`, `--live-url` and one of `--draft-url` / `--draft-dir`; `--serve <folder>` serves a draft until Ctrl-C. Reads `surfaces.json`, the snapshot and the ledger; writes only into `--out`: `filled.tree.json`, `fill-report.md`/`.json`, `unmapped.json`, `handover.json`, `breakpoints.json` and the generated walker config. |
| `sweep.mjs` | Sweep command: `--surfaces <surfaces.json> [--date YYYY-MM-DD] [--out <file>]`; reads each surface's newest `solve-report.json` and writes `<build>/qa/sweep/<date>/sweep.json`: one row per distinct open issue across the site `{ surface, ref, pair, path, block, property, widths, state, kind, class, reason, values, report }` (`pair` names a block-less hand-pair row; `values` holds each distinct draft and live pair, at most 6), totals per surface and class, and the surfaces with no report. |
| `register-sweep.mjs` | Register sweep command (A4): `bundle --register <md> --sweep <json> --pairs <qa/pairs dir> --out <folder>` writes one input file per A4 group (items, the sweep rows and measured refs of their surfaces, the status rules; agent brief `sites/eye-care-ward-end/build/qa/sweep/2026-10-05/a4/agent-brief.md`) and exits 1 on an item in no group; `merge … --verdicts <json> … --out <file>` checks the agents' verdicts and writes a copy of the register with a Sweep column (never in place). |
| `triage.mjs` | Triage command (B1): `--client <slug> --surface <s> [--report <solve-report.json>] [--out <file>]`; reads the surface's newest (or given) Solve report and its final walk (highest `round-N/report.json`), every surface tree, the DB read-only, calibration, the extension roster, block sources and every PHP file under the plugin's `includes/`; writes `<build>/qa/triage/<surface>.json` (a candidate class W, F, T or U with evidence per distinct issue) and prints counts by class. |
| `pairs.mjs` | Block pairing command: pairs every block of a surface with its draft element through the walker's word matcher, re-checks each kept finder at 375 and 768, and writes `<surface>.full.mjs` (the hand config plus one pair per block) and `qa/pairs/<surface>.json` (kept pairs and every left-out block with its reason). A panel surface pairs with its walker state open on both sides (`--state <name> --width <w> [--recheck <widths>|none]`), recorded in the report. A surface's `walkerFull` in `surfaces.json` makes Solve walk it. |
| `calibration-targets.json` | The calibration page per site (`envFile`, `envKey`, `postId`) and `image`, a media object on that site written into background-image markers and overlay preconditions. |
| `calibration-fixtures.json` | Minimum content, inner blocks, parent chain, optional variants, optional `preconditions` (`{ <setting>: { <attr>: <value> } }`: attributes a setting paints only under, put on that setting's instance) and optional `before` blocks (placed ahead of the instance, for a block that reads the page, such as a table of contents) per calibrated block. |
| `ledger.mjs` | Divergence ledger command: `accept <report.json> <row id>` adds an entry dated today; `stale <report.json>` exits 1 while any entry is stale. |
| `lib/db.mjs` | Read-only `block_attributes` queries. |
| `lib/normalise.mjs` | Value parsing and token snapping from `theme-snapshot.json`, with the snap log. |
| `lib/resolve.mjs` | The one property-to-setting engine. |
| `lib/tree.mjs` | Trees: read, write, refs, setting writes, live-site safety. |
| `lib/cache.mjs` | The library-wide calibration cache: which site measured a block, and the cross-site guard. |
| `lib/calibrate.mjs` | Calibration library: calibration trees, slot detection, default paint; re-exports the calibration modules below. |
| `lib/calibrate-props.mjs` | What calibration reads: the read and pseudo-layer properties and how a css_property maps onto them. |
| `lib/calibrate-markers.mjs` | Marker values per setting shape (Spec 47 §3.2 marker table). |
| `lib/calibrate-instances.mjs` | Which instances a block's calibration page holds: markers, their preconditions (variant, gating toggle, border partners, overlay image, layout mode) and state targets. |
| `lib/calibrate-read.mjs` | The in-page reader and the per-width read under each state trigger. |
| `lib/calibrate-chunk.mjs` | How calibration builds a block's page in pieces: the child process's heap, the fixture's own chunk size, and halving a chunk whose build timed out. |
| `lib/calibration-lock.mjs` | One calibration per calibration page: a per-site lock in the machine's temp folder that `calibrate.mjs` takes before building. |
| `lib/calibrate-container.mjs` | What a block's source says before any browser opens: whether its tiers follow its container's width (an `@container` rule in the built CSS, or a render passing `container_queries`/`container` true), and whether its render returns early on this site. |
| `lib/calibrate-content.mjs` | The content side of calibration: which elements a setting makes appear or disappear, whose text it prints and which it makes a link — the settings that paint no CSS property, queried by framework-database `role` because `attrsFor` never returns them. |
| `lib/deploy-hash.mjs` | The deploy key: md5 of a block's front-end build files, locally and on the site. |
| `lib/draft.mjs` | Serves a local draft folder on 127.0.0.1 at an ephemeral port: directory index, an explicit index file, content types, Range, no path escape, clean close. |
| `lib/fill-skeleton.mjs` | The skeleton contract: `draftRef` and `draftSlots` are walker finders, slot finders resolve inside their node's element; node indices, targets, problems, and the clean tree. |
| `lib/fill-read.mjs` | Reads the draft in Chromium through the walker's `collectPair` and `resolveFinder` at 375, 768, 1440 and the fluid widths, plus the 16px sweep; blocks or mirrors requests beyond the draft's origin. |
| `lib/fill-prop.mjs` | One property of one element: which tiers differ from what the node shows, the slots a setting could paint, `clamp()` where a setting accepts one; every write is the resolver's. |
| `lib/fill-resolve.mjs` | Root-down resolution of a whole skeleton: inherited baselines, spacing ownership, presence, words, links, the divergence ledger, UNMAPPED and handover. |
| `lib/fill-spacing.mjs` | Spacing ownership per tier from rendered border-box gaps (equal within 0.5px). |
| `lib/fill-values.mjs` | Fluid fit and `clamp()`, the 16px breakpoint sweep against the SGS boundaries, and the sweep log. |
| `lib/fill-presence.mjs` | Visibility and variant settings from calibration `presence`, words from `text`, links from `link`. |
| `lib/fill-handover.mjs` | The handover entry shape Fill declares, validated against the five shared owners and four kinds. |
| `lib/fill-page.mjs` | The page baseline for inherited properties from the theme snapshot (root typography and colour, heading and element styles, CSS initial values), which calibration deliberately does not record. |
| `lib/fill-entrance.mjs` | Samples a draft's entrances (delay, duration, first-frame pose) and writes them through the resolver. |
| `lib/fill-config.mjs` | Generates the walker config: one pair per node with a `draftRef`, `refPrefix: 'cr-ref-'` and the ledger path, via `pairs.mjs::configText`. |
| `lib/fill-report.mjs` | `fill-report.md` and `fill-report.json`: UNMAPPED, handover, writes, spacing, fluid, breakpoints, entrances, ledger, snaps. |
| `lib/solve-rows.mjs` | Solve's reading of a walker report: open rows, writable groups, draft values per width, the state-conflict refusal, content rows (text, presence, link) and their resolution, the handover list, classification. |
| `lib/solve-report.mjs` | Writes `solve-report.md` and `solve-report.json` (the whole-page line, content and handover counts, the handover list, the issue and cause views, and a Hardcode table with the widths that differ and the winning rule). |
| `lib/solve-groups.mjs` | The report's two readings of the surviving style and hover rows: issues (one element, property and state, every width with its own draft and live values, and the widths that match) and causes (issues sharing a class, a property and the winning rule or the same values, every element listed with its widths). No row is merged away. |
| `lib/winning-rule.mjs` | For Hardcode rows: the rule that wins on the live page and the rule carrying the draft value, read through Chrome DevTools' matched rules (read-only, headed unless `--headless`, rest state only). |
| `lib/references.mjs` | Reference blocks found from each block's render.php (linked placeholders, frames around another post's blocks, core template parts) and the surfaces lint that every printed post has a surface. |
| `lib/entrance.mjs` | Entrance start: a block the draft shows at rest while live holds its entrance waiting for a scroll gets `sgsAnimationStart: 'load'` (Spec 38). |
| `lib/fill-diagram.mjs` | A rendered draft's dimension diagram measured into `sgs/diagram-dimension` settings (line ends, guide reach and overshoot, tick length, label anchor), from the SVG geometry API and the label's box, never the source text (R-47-4). |
| `lib/pairs.mjs` | Block pairing: words per block, their draft twins (repeated words planned apart), the partner choice (element, padded wrapper or text run), the keep-or-leave-out judgement (PAIRING_LIMITS) and the generated config's text. |
| `lib/pairs-page.mjs` | Block pairing's in-page collectors: tagged words, live block boxes and text runs, draft chains (repeated words placed nearest the sure ones), form controls by identity, hand pair elements, and the draft opened through its navigation. |
| `lib/issue-classes.mjs` | The one definition of a distinct open issue: the visual row kinds, the Solve classes and their order, the unmapped-state class and the issue key. Imported by both `lib/sweep.mjs` and `lib/triage.mjs`, so a surface's triage count equals its sweep count by construction rather than by two copies agreeing. |
| `lib/sweep.mjs` | Sweep library: the newest report per surface, issue rows per report (`wholePage`'s definition) and the site aggregate with shared rows counted once. |
| `lib/register-sweep.mjs` | Register sweep library: register tables as items, the eight A4 groups, section to surface mapping, verdict checking against the sweep and the pairings, the Sweep column writer and the per-group bundle. |
| `lib/triage.mjs` | Triage library: issues by `wholePage`'s key (the Solve classes, then the unmapped-state rows of `other`, in the sweep's order so the counts agree), the mechanical checks (fitting attributes including NULL css_property rows and discovered enums, roster extensions, enclosing calibration, consequence, transient, used value), the read-only resolver pass and the verdict order. |
| `lib/triage-source.mjs` | Triage's source pass (string search): a block's `render.php` mentions, its `style.css` rules for the element, and the PHP helpers its `render.php` reaches two hops deep (`sgs_*` functions, classes, required `includes/` files) that read the row's setting or emit the property, cited as `file::symbol`. |
| `lib/guard.mjs` | The regression guard: reverts a write calibration names, else tries one suspect at a time and lets the next walk decide. |
| `lib/ledger.mjs` | Ledger library: rules, matching, stale entries, accept migration, entries from report rows. |
| `tests/db.test.mjs` | R-47-2: read-only database. |
| `tests/normalise.test.mjs` | R-47-7: tokens before literals. |
| `tests/resolve.test.mjs` | FR-47-1: storage shapes and gaps; border-radius written as corners, never sides. |
| `tests/tree.test.mjs` | R-47-11 and tree writes. |
| `tests/calibrate.test.mjs` | FR-47-2: setting states calibrate only through a known trigger; the deploy key ignores webpack module numbering but not code; a run never replaces another site's cache file without `--recalibrate`; a border-style marker carries its companion width and maps against a width baseline (CR11). |
| `tests/calibrate-classes.test.mjs` | FR-47-2: each dead or markerless class of the 2026-10-04 audit gets its marker, precondition or read (extension rows from the DB, gradients, keywords, media objects, transforms, wider lengths, non-length tiers, colour by role, box shapes, two weights, unit shapes, the silent drop, preconditions, layout modes, state targets, container-query tiers). |
| `tests/calibrate-read.test.mjs` | FR-47-2 reader, in a local headless Chromium: elements past the 81st, `::after` and `::placeholder` layers, and an `aria-controls` panel outside the instance are read. |
| `tests/ledger.test.mjs` | FR-47-5: validation, stale entries, migration, accept; the independent check matches entries on `node` and leaves a drifted value entry open (A5). |
| `tests/references.test.mjs` | Reference blocks: the detector, the linked-placeholder rule in Solve, the surfaces lint. |
| `tests/lint.test.mjs` | R-47-1 and R-47-10 through the lint; B4: a ledger entry citing an item the register lacks, or none, fails; a house-rule entry needs none; a ledger with entries and no register fails; without `--register` the register comes from `qa/ledger.config.json`, and a named register that does not exist fails. |
| `tests/solve-held.test.mjs` | A setting already holding the draft value is held, not written (a value another group wrote earlier in the same round is a write, not a hold, with a negative control), and its row is a Hardcode that names what the tree holds and the widths that differ; the winning-rule ranking, with negative controls. |
| `tests/solve-groups.test.mjs` | The issue and cause views: every width with its own values, no row lost, elements joined by cause and each kept with its widths. |
| `tests/solve.test.mjs` | R-47-9: the guard reverts only the write calibration names, or proves a suspect by the next walk and restores an innocent one; walker state mapping (an unmapped state is never written); `--rounds 0` never calls the write round (A1) |
| `tests/pairs.test.mjs` | Block pairing: a partner is kept only when it holds the block's words and none from outside it, at a similar size, with its padding where the block's is; hand pairs measuring a paired block's draft element move to the block root; a panel state that is missing or opens one side only is refused; a landmark exclusion holding the surface is lifted. |
| `tests/entrance.test.mjs` | Entrance start: a hidden-live, shown-draft entrance gets `sgsAnimationStart: 'load'`; no entrance, a part, a hover, a half opacity or a hidden draft gets nothing. |
| `tests/confirm-canvas.test.mjs` | Grouping the canvas-settable claims into families of (cited block, cited setting, row property): a family spanning two surfaces stays one family, a different setting on the same block and property is its own family, a row not decided by `canvas-settable` is not a claim, and a resolver-hop citation (no `where` key) stays distinguishable from a canvas-roster one; a family is keyed on the CSS property the row stands for; candidates mode yields every block `canvasSettable` could cite (negative control: the unmeasured lookup cites only the first) and nothing for a non-canvas surface. |
| `tests/register-alias.test.mjs` | A register row whose Fix cell is NOTHING BUT a pointer at another row (`See 17`, `Same as 59`, `Same as N2B`) is that row's alias and feeds `covers`, so it stops being counted as independent work; a Fix cell that merely MENTIONS another row inside prose is real work and must not alias; and an explicit `Covers` column still wins, read comma-separated with a `;` or `(` cutting trailing prose. |
| `tests/calibrate-chunk.test.mjs` | FR-47-2: the build child gets the bigger heap and the long editor limit (CR4: no editor wait in `wp-build-page.js` keeps a hardcoded 60 s), a fixture names its own chunk size, and a timed-out chunk is halved with every default kept. |
| `tests/wp-build-page-template.test.mjs` | CR25: `wp-build-page.js::buildTemplate` (driven through a fake page and window, no site) retries a transient server error (the host's 500 "Error establishing a database connection" under a burst) and succeeds (MUST FAIL: red with retries off), gives up after three retries with the error's fields instead of Playwright's "Object", names the step that failed, and fails a 4xx at once. |
| `tests/calibrate-container.test.mjs` | FR-47-2: a block that emits `@container` rules at render time is not read as a one-width hardcode; a comment naming the flag, a false flag or a variable does not count. |
| `tests/calibrate-fixtures.test.mjs` | FR-47-2: each planned fixture variant, parent chain and `<p>` text variant traces to the render source that needs it. |
| `tests/calibrate-partners.test.mjs` | FR-47-2: the background-image, hover shadow-shape and hover border-gradient partners a marker needs to paint; a marker no read equals is reached wherever its element changed. |
| `tests/calibrate-reason.test.mjs` | FR-47-2: a block whose render returns early on this site is named, not waited out; no committed snapshot enables the dark palette `theme-toggle` needs. |
| `tests/calibrate-overridden.test.mjs` | FR-47-2 (L7.1 gap typing): an inherited setting records the descendant whose own rule overrides it, topmost of each blocked subtree only; a descendant already at the marker value, a pseudo layer and a non-inherited property record nothing. |
| `tests/calibrate-presence.test.mjs` | FR-47-2 (L7.2): a boolean that shows and hides elements records both; an element rendered but not displayed counts as absent; a boolean that only recolours yields no presence entry. |
| `tests/calibrate-text.test.mjs` | FR-47-2 (L7.3): the deepest element carrying the marker string is the text path, not its wrapper; both `content` and `text-content` roles get a marker; a setting holding a list or an object takes none. |
| `tests/calibrate-link.test.mjs` | FR-47-2 (L7.4): a URL setting landing on a nested `<a href>` records that path and attribute; a target setting records `target`, not `href`; every link needle survives percent-encoding whole. |
| `tests/calibrate-content-rows.test.mjs` | FR-47-2: the role query reads both halves of each role pair and only SGS-owned rows (R-47-10); content instances carry their own preconditions, so a variant-gated setting is not credited with everything its variant renders. |
| `tests/independent-check.test.mjs` | PA-4: screen-reader-only and off-page text is not counted as painted by a site's `qa/independent-check.mjs`. |
| `tests/walker-reads.test.mjs` | A-1 at unit level: motion timings and `::before`/`::after` layers are rows Solve can write on calibration's layer path; a declared width passes Solve's used-value gate; a text run's spacing is a `row-gap` row. |
| `tests/sweep.test.mjs` | The sweep (A3): a surface's issue total equals `wholePage`'s distinct count, unmapped walker states included (class `unmapped-state`); a row two surfaces walking one config share counts once (`alsoIn`), while block-less rows of the same pair name from two configs stay two; a surface with no report is unmeasured; another surface's block is not counted. |
| `tests/register-sweep.test.mjs` | The register sweep (A4): parsing and grouping; a still-open verdict must cite one exact sweep row (or an open walk diff) and quote its values with an element sentence; hover is no reason for not walker-measurable; a clean verdict without its element sentence, on a ref with an open row, or on a ref no pairing measured, is rejected; a site-wide item is clean only when every covered item is clean and measured; a missing or doubled verdict is rejected; the merge leaves every original cell byte-identical and a second merge rewrites the Sweep column rather than adding one. |
| `tests/triage.test.mjs` | B1: an extension's width setting is never F (MUST FAIL); a box row following its parent's style row by the same amount is W, a consequence (MUST FAIL); a box row from an unmapped walker state is W, unmapped-state, not U (MUST FAIL); an unmapped-state row never reaches the resolver and never steals a key a Solve class holds; no fit plus resolver no-setting is F with its stylesheet rule; a calibrated setting not reaching the element never decides; discovered enums, transient, used value, T and hardcode. |
| `tests/check-lane-collisions.mjs` | Not a test but a gate, run by the main thread around each wave of a parallel-lane plan: it holds the wave to lane to owned-file map and exits 1 on a double-owned path, an unowned newly-dirty file, or a lane editing outside its set. `--self-test` is its own negative control, planting a double-ownership and asserting it goes red; `--snapshot` records the pre-wave dirty set so a tree already dirty is not blamed on the wave. |
| `tests/triage-manifest.test.mjs` | FR-47-8: `triage.mjs::runTriage` carries the surface manifest's `canvas` flag into the triage context (MUST FAIL) — a canvas surface's row that a block already in the tree can hold is W / canvas-settable, and the same row with no flag is F / no-setting; built on a throwaway client folder, so the headline F count is protected by an assertion and not only by a hand re-run. |
| `tests/triage-source.test.mjs` | B1 source pass: a gap a class under `includes/` emits is cited by `file::symbol` with the setting it reads (MUST FAIL); calls traced two hops through functions, classes and required files; a word in prose is not a citation. |
| `tests/walker-devtools.test.mjs` | A-1 in headless Chromium on local HTML: the walker settles on finished animations, forces `:hover` on every pair, reads declared sizes from the matched rules and a text run's row spacing. |
| `tests/walker-l2.test.mjs` | Session C lane L2 (walker core, GAP-CHECKLIST sections 20 to 26): the tag-mismatch guard, the unmatched-ref drop, the 1920 default, focus and active reads on every interactive element, link coverage, line counts during a state transition, and region entrances; headless Chromium on local HTML. |
| `tests/walker-diagram-reads.test.mjs` | GAP-CHECKLIST section 27: a drawn line's stroke weight and dash are icon rows, a positioned element's `left`/`top` are rows (in-flow elements read none), and Solve writes an offset only from the draft's declared value; headless Chromium on local HTML. |
| `tests/fill-diagram.test.mjs` | R-47-4 for diagrams: the Eye Care draft's front-view lines, guides (uneven reaches in one path included), ticks and a positioned label are measured to the unit in headless Chromium; a selector matching nothing is an error, never a zero. |
| `tests/walker-refs.test.mjs` | FR-47-6 items 6 and 7 at unit level (element paths, row stamping, divergence matching); flow position rows and the identity transform (GAP-CHECKLIST section 17). |
| `tests/wp-session.test.mjs` | `scripts/lib/wp-session.js` in headless Chromium: a child attached to the shared browser and the owner both survive a page dialog; a confirm is dismissed and a beforeunload left, as Playwright's default does (MUST FAIL: the two auto-dismissals raced and one crashed with "No dialog is showing"; dismissing a beforeunload aborted the editor navigation). |
| `tests/draft-serve.test.mjs` | FR-47-4 draft server: no path escape or symlink escape (MUST FAIL), ephemeral port, directory index, content types, Range, and close frees the port. |
| `tests/fill-skeleton.test.mjs` | FR-47-4: the finder vocabulary, slot scoping, node numbering, skeleton problems and the clean tree. |
| `tests/fill-read.test.mjs` | FR-47-4: a local draft read in headless Chromium — widths, the carrier rule, scoping, the declared width, fluid samples and the sweep. |
| `tests/fill-mirror.test.mjs` | FR-47-4: a script on another origin is blocked, answered from a `--mirror`, and the flag parses. |
| `tests/fill-prop.test.mjs` | FR-47-4: tier carry, canonical values, not-painted leftovers, and that every write is the resolver's. |
| `tests/fill-spacing.test.mjs` | FR-47-4 step 3: one unequal gap hands every gap to the children and writes the parent gap as 0 (MUST FAIL); equal, single, zero, both axes, tolerance, hidden and out-of-flow children. |
| `tests/fill-values.test.mjs` | FR-47-4: a stepped value is never fluid and a step at 800px is logged against 768 (MUST FAIL); clamp shapes and the sweep log. |
| `tests/fill-presence.test.mjs` | FR-47-4: a draft showing the badge flips its visibility setting on and a draft without it leaves the default (MUST FAIL); variant, words and links, against fixture calibration keys. |
| `tests/fill-page.test.mjs` | FR-47-4: the theme baseline for the inherited properties calibration does not record. |
| `tests/fill-entrance.test.mjs` | FR-47-4: entrance timing and distance, a loop is not an entrance (MUST FAIL), and the resolver writes. |
| `tests/fill-handover.test.mjs` | FR-47-4/§3.3: the five owners, four kinds, and an entry with no evidence is refused. |
| `tests/fill-config.test.mjs` | FR-47-4 step 4: a pair for every node with a `draftRef` and none without (MUST FAIL); the generated config passes the walker's own lint. |
| `tests/fill-resolve.test.mjs` | FR-47-4: whole-tree resolution with fixture reads and calibration over the real database. |
| `tests/fill-surface.test.mjs` | FR-47-4 step 5: `fillSurface` end to end over a local folder and a temp repo; an invalid skeleton is refused and only `--out` is written (MUST FAIL). |

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
- `variantInfo(db, block)` → `{ variantAttr, variantSlots }` from `blocks.variant_attr` and `variant_slots`: the settings that render only under one variant value.
- Rows carry `role` (`roles.classification`), which decides a colour marker for a setting painted under a non-colour property.
- `PSEUDO_NAMESPACES`: the namespaces whose stored `css_property` is a pseudo-property (`anim`, `fx`); the leaf after the colon names no CSS property of its own.
- `cssPropertiesOf(stored)` → the CSS properties one stored `css_property` matches: itself when plain; for `anim:`/`fx:` the leaf map's property (`duration` → `animation-duration`, `easing`/`ease` → `animation-timing-function`, `preset` → `animation-name`) and `[]` for any other leaf, deliberately unmatchable; and its exact stored string for a real property carrying a modifier (`grid-template-columns:count`, which must never match `grid-template-columns`). The one definition `candidates` and `lib/triage.mjs::settingFits` both read, so the two cannot drift.
- `listedProperties(stored)` → every CSS property a comma list of stored values matches.
- `modifierOf(stored)` → the property a modifier row modifies (`grid-template-columns:count` → `grid-template-columns`), or null: a modifier is a fitting setting for that property but never a resolver candidate for it.
- `isPseudoProperty(stored)` → whether the stored value is namespaced under `PSEUDO_NAMESPACES`, so it holds a keyword slug rather than a measured CSS value.

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
- `tracksSetting(raw)` → `{ value }` or `{ error }`: measured px grid tracks as fr proportions to the smallest track, floored at 0 (`"496.562px 451.438px"` → `"minmax(0, 1.1fr) minmax(0, 1fr)"`; equal tracks → `"repeat(N, minmax(0, 1fr))"`).

### `lib/resolve.mjs` (reads block.json files)

- `timeToMs(value)` → a CSS time as whole milliseconds (`0.25s` → `250`, `1s` → `1000`), else null. `formatValue` uses it so the route never hands a duration setting a decimal or a unit suffix: `sgs_transition_vars` would refuse it and silently apply the default, and before that helper was fixed it stripped it to a tenth of the value asked for.
- `BLOCKS_DIR`: the block sources folder.
- `GAPS`: gap reasons (`no-setting`, `ambiguous`, `shape`, `uncalibrated`).
- `blockSchema(slug)` → the block's `block.json` attributes.
- `splitProperty(prop)` → `{ short, side }` (a walker longhand as the database shorthand and box side).
- `tiersOf(perWidth, prop)` → `{ tiers }` (375 mobile, 768 tablet, 1440 and 1920 desktop) or `{ error }`.
- `resolveDiscovered(input, calibration)` → a write for a setting calibration found (an enum value whose effects match the draft; ties broken by the element's other properties), a gap, or null. Slots compare under the same `LOOSE()` rule, taking `anyIndex` from the input, and a row's `state` must equal the state discovery recorded.
- `CORNERS`, `radiusCorners(raw)` → a border-radius box's corner keys (`helpers-box.php::sgs_border_radius_tiers` reads only these), and the computed shorthand as corners (null when elliptical); border-radius writes are corner objects, per device when the default is a tier object.
- Box seeding: a border width (an unset width must be 0) written into an empty box brings its other sides at the calibrated default paint; a padding or margin box prints only its set sides, so one side is written alone.
- `resolve(input, ctx)` → `{ writes: [{ attr, value, merge }] }` or `{ gap, detail }`.
- `LOOSE(path)` → a path with its `:nth-of-type` steps dropped: the rule every cross-tree path comparison uses.
- `blockContext(slug)` → `{ provides: { "<context key>": "<attribute>" }, uses: [ "<context key>" ] }` from the block's `block.json`: the channel by which a child receives an ancestor's attribute at render (32 provide keys over 5 blocks, 34 uses over 8; `sgs/accordion` holds 25).
- `reachedDescendants(attr, ancestor, measuredSlots)` → the measured descendants one ancestor setting's paint reaches. The match is loose, but the count is of the paths **as measured**, so two repetitions sharing a loose path stay two descendants and a parent attribute is not written over both.
- `resolveViaAncestor(input, ctx)` → FR-47-8 / R-47-12's canvas hop, invoked only after the caller's `owners` retry has exhausted, so the order is direct match → calibration `reaches` tie → the caller's hop → this one, and deleting the one call restores the previous behaviour exactly. Candidates are taken in the row's own state, so a resting setting is never cited for an open or hover row. Returns `{ writes, on, via, cite }` where a prover holds (the ancestor's calibration covers the element, or a `providesContext`/`usesContext` pair carries the attribute) **and** its paint reaches exactly one measured descendant (R-47-5); `{ gap: 'canvas-settable', detail, cite }` on a canvas otherwise; `{ cite }` off a canvas, leaving the row's class untouched, because an ordinary page's blocks are the route's own output and a missing setting there is a real gap; and null when nothing in the chain declares the property in that state.
- `resolve` returns `{ gap: 'shape' }` for a pseudo-namespaced setting whose measured value is not one of its declared keywords (`includes/animation-timing-clamp.php` clamps to instant, fast, medium, slow, extra-slow): writing a measured duration would be coerced back to the default on render.

### `lib/tree.mjs`
- `REF_PREFIX`: `cr-ref-`.
- `FORBIDDEN_POSTS`: canary 2742 and 2741 and the motion-QA fixtures.
- `readTree(file)`, `writeTree(file, tree)`.
- `walk(tree, fn)`: depth-first, `fn(node, index, parent)`.
- `refOf(node)` → the node's ref class or null.
- `addRefs(tree, surface)` → count added (`cr-ref-<surface>-<n>`; n continues past the surface's highest ref, so a node added to a numbered tree never reuses a number; on an unnumbered tree it is the depth-first index).
- `stripRefs(tree)`: removes every ref class (a final build).
- `nodeByRef(tree, ref)` → the node.
- `setAttr(node, write)` → `{ before, after }` (deep merges keep other tiers and sides).
- `refAncestors(tree)` → each ref with its ancestors' refs (nearest last).
- `writableTargets(manifests)` → `{ posts, templates }` from calibration-targets.json and surfaces.json.
- `assertWritable(target, manifests)`: throws on a forbidden or unlisted target (R-47-11).
- `assertQuiet(sshArgs?)`: throws while a deploy or reseed runs (host process list, local process list).

### `lib/ledger.mjs`
- `RULES`: rule names with their meaning.
- `validate(entries)`: throws on missing keys, unknown rules, bad dates, duplicate ids, a `register` that is not a non-empty list of ids.
- `load(file)` → validated entries (empty when the file is absent); `save(file, entries)`.
- `match(entries, row)` → the entry covering a row, or null.
- `measurements(report)` → every traced measured property of a walker report.
- `stale(entries, { refs, rows })` → `[{ id, why }]`.
- `migrateAccepts(accepts, { scope, firstId, decided })` → `{ migrated, unmigrated }`.
- `entryFromRow(report, rowId, { reason, scope, entries, source })` → a new entry.
- `holdsValue(expected, live, pxTol?)` → whether live still shows a value entry's decided value (numbers within `pxTol`, else equal text ignoring spaces).
- `judgeIndependent(entries, diff, { state })` → `{ accepted }`, `{ drift: id }` or null for one difference of a site's `qa/independent-check.mjs`: its keys map to the ledger properties that cover them and entries match on `node`, as walker rows do.

### `lib/cache.mjs`
- `cachedSite(file)` → the site a block's cache file was measured on, or null.
- `skipReason(file, site, recalibrate?)` → why a run on `site` must leave the file alone (measured on another site, no `--recalibrate`), or null.

### `lib/calibrate-props.mjs` (imports `scripts/parity/lib/collect.mjs` and `ref-trace.mjs`)
- `WIDTHS`: 375, 768, 1440. `MARKER_HEX`, `MARKER_RGB`: the colour marker. `MARKER_GRADIENT`: the gradient marker. `CAL_PREFIX`: `cr-ref-cal-`.
- `READ_PROPS`: the properties read per element: the walker's plus `CAL_EXTRA_PROPS` (height, stroke, fill, grid rows, writing-mode and others a setting can paint before the walker compares them). `INHERITED`: never recorded as default paint.
- `PSEUDO_PROPS` (the walker's list) read on painting `::before`/`::after` layers; `TEXT_PSEUDO_PROPS` on `::placeholder` and `::first-letter`.
- `longhands(cssProperty)` → the read properties a setting covers; a gradient text or border, a shadow colour and `flex`/`inset` map onto the properties the browser computes them under.
- `MARKER_REST_GRADIENT`: the resting gradient a hover border-gradient marker needs before it paints (`helpers-tokens.php::sgs_border_gradient_css` returns nothing for an empty resting paint).

### `lib/calibrate-markers.mjs`
- `markersFor(row, schema, snapshot, current, ctx)` → `[{ label, attrs, expect, form?, base?, box? }]` (§3.2 table): colours by property or DB `role`, gradients, media objects (`ctx.image`), keywords for free-text settings (`KEYWORDS`), enums, booleans, boxes and corners (per device, `flat_sibling`), per-device lengths and non-length values (counts, keywords), two font weights in the setting's type, opacity, the transform family, letter-spacing, lengths, counts. A unit companion is written in its own shape.
- `defOf(row, schema)` → the setting's schema: block.json's, else the DB row's type, enum and default (extension settings). `types(def)`.
- `companionWidth(styleAttr, schema)` → `{ attr, attrs }`: the width a border-style marker needs (`<x>Style` → `<x>Width`, 3px in the attribute's own shape), or null.
- `borderPartners(attr, prop, schema)` → the style (and width) a border colour or width needs to paint.
- `SHADOW_SHAPE`, `shadowPartners(attr, prop, schema)` → the shadow shape a hover shadow-colour marker needs before it composes anything (`helpers-shadow-layers.php::sgs_shadow_layers` returns nothing for an empty shape).
- `MARKER_DURATION_MS` (`437`): the transition-duration marker, a whole number of milliseconds in the setting's own type, never a CSS time — `helpers-tokens.php::sgs_transition_vars` refuses anything that is not a non-negative integer.
- `MARKER_EASING` (`linear`): the transition-easing marker, drawn from that helper's whitelist and never `ease-in-out`, which is both its fallback and several blocks' default, so a marker equal to it would read dead for the wrong reason. `ease-out` stands in when a block's own default is `linear`.

### `lib/calibrate-instances.mjs`
- `STATE_TRIGGERS`: how each setting state is reached (`hover` real mouse, `focus` keyboard-visible focus, `scrolled` window scroll, `shrunk` its ancestor class from `STATE_CLASSES`, `open` and `current` rendered by the fixture). `triggerFor(state)` → the trigger, `null` for rest, undefined when the state has none (reported, never calibrated).
- `stateTarget(block, row)` → the BEM selector of the element a hover or focus marker acts on, or null for the root.
- `preconditionsFor(row, schema, current, ctx)` → attributes the setting's element needs: its variant (`ctx.variantAttr`, `ctx.variantSlots` from `lib/db.mjs::variantInfo`), the show/enable toggle gating it, its border partners, a background image under an overlay.
- `layoutModes(schema, current)` → the block's flex/grid mode settings and their other values; a layout property's markers are also tried under each.
- `planInstances(block, { rows, enumRows, schema, snapshot, fixture, ctx })` → `{ instances, noMarker }`: defaults per variant, marked instances with `baseKey` (a baseline carrying the same preconditions), `trigger`, `target`, `stateClass`, and enum discovery instances.

### `lib/calibrate-read.mjs` (imports `ref-trace.mjs`; Playwright pages)
- Keys: an element's `elementPath` from the instance root; a layer is its element's key plus `::before`, `::after`, `::placeholder` or `::first-letter`; a panel the instance controls through `aria-controls` outside it (a cart dialog moved to `<body>`) is `@controls > <path>` (`@controls:2` for a second).
- `readInstancesInPage([count, prefix, props, pathSrc, pseudoProps, textPseudoProps, only?])`: in-page; every element, layer and controlled panel of each instance (or only instance `only`).
- `markTargetInPage([prefix, n, selector])`: in-page; marks the state target and its closed panel toggle.
- `openToggle(page)`: clicks the marked panel toggle; one hidden at the read width is clicked in the page (`el.click()`), so its handler runs.
- `readAll(page, url, instances)` → per width reads, plus `scrolled`, `scrollMissed`, `hoverMissed` (state instances whose element stays hidden at every width with its panel opened; an element that shows at one width only, such as the detached burger chip, is read there). `SCROLL_Y`: the scroll for scrolled markers (read twice when the header misses the first jump).

### `lib/calibrate.mjs`

Re-exports `MARKER_DURATION_MS` and `MARKER_EASING` from `lib/calibrate-markers.mjs`, and compares a transition row's TIMING through `timingSet`, imported from `scripts/parity/lib/compare.mjs` rather than redeclared, so the walker's notion of a timing value and calibration's cannot drift.
- `buildTree(block, fixture, instances)` → the calibration tree.
- `slotFor(row, marker, defReads, markReads, { containerQuery })` → `{ slot, slots, property, transform, reachedAt, oneWidth, containerTier?, effects }` or `{ dead }`; with `containerQuery` (the block's CSS has an `@container` rule) a tier reached at fewer page widths is `containerTier`, not `oneWidth`.
- `discoverEffects(defReads, markReads)` → what one enum value changes: `{ prop: { slots, value } }`.
- `defaultPaint(defReads)` → per element and width, non-inherited properties.
- `overridingChildren(props, marker, defReads, slot, reaches)` → the descendants of an inherited setting's slot whose own rule overrides its value, topmost of each blocked subtree only.
- `mergeSetting(prev, s, { state, form, variant })` → one setting's cache entry, folding a fresh reading into the entry its earlier markers built; array fields are the union across markers.

### `lib/calibrate-content.mjs` (Playwright pages)
- `MARKER_TEXT`, `MARKER_NUMBER` → the marker a text setting prints: letters and digits only, so every WordPress escape leaves it byte-identical and no word-trim can split it.
- `MARKER_SLUG`, `MARKER_URL`, `MARKER_PHONE` → the link markers; the needle is unreserved characters only, so composing it into a query string leaves it whole, and the URL sits on the RFC 2606 reserved `.invalid` domain.
- `LINK_ATTRS` → the DOM attributes a link setting can write, in the order a reading prefers them.
- `PRESENCE_ROLES`, `TEXT_ROLES`, `LINK_ROLES` → the framework-database roles each content read covers, both halves of each pair (Bean, 2026-10-05).
- `contentRowsFor(db, block)` → one block's content settings by role, SGS-owned only: `{ presence, text, link }`.
- `contentMarkerFor(row, kind, schema)` → the marker for one content setting (`{ label, attrs, needle }`), or null when its shape can hold none.
- `variantPresenceValues(schema, variant, current)` → the values of a block's variant setting that get their own presence reading.
- `planContentInstances(block, { contentRows, variant, schema, fixture, ctx })` → `{ instances, noMarker }`: one instance per content setting plus the baseline instances their preconditions need.
- `needlesOf(instances)` → every needle the page must be searched for, once each.
- `readContentInPage(args)` → in-page: per element, whether it is present and which needles its text and link attributes carry.
- `readContentAll(page, url, instances, needles)` → the content read of every instance at each width, `{ width: [ reads ] }`.
- `presenceFrom(defRead, markRead)` → `{ shows, hides }`: the elements a flip makes appear and disappear, from existence and display only, so a recolour yields nothing.
- `textFrom(needle, markRead)` → `{ path, reachedAt }` for the deepest element carrying the marker, or null.
- `linkFrom(needle, markRead)` → `{ path, attr }` for the element carrying the marker in its most preferred link attribute, or null.
- `collectContent(instances)` → the cache file's `text`, `presence` and `link` keys, each omitted when the block has nothing of that kind.

### `lib/calibration-lock.mjs`
- `acquireCalibrationLock(site, { blocks, dir, pid, isAlive, now })` → `{ file, release }`, or throws R-47-11 naming the run that holds the site's lock (pid, blocks, start). The file is created atomically (`wx`); a lock whose owner process is gone is taken over; a lock file still being written counts as held for 60 s. `release` removes it only while this process owns it.
- `calibrationLockPath(site, dir)`, `processAlive(pid)`.
- Why: two calibrations on one site build onto its one calibration page with the same `cr-ref-cal-<n>` classes, so each reads the other's blocks (2026-10-07, a mega-group run measured a nav-bar-menu root). Tests: `tests/calibration-lock.test.mjs`.

### `lib/calibrate-chunk.mjs`
- `NODE_HEAP_FLAG`, `MIN_CHUNK`: the heap flag the build child is spawned with, and the smallest chunk halving will go to.
- `RUN_HEAP_BYTES`, `needsBiggerHeap(limit)`: `calibrate.mjs` restarts itself with `NODE_HEAP_FLAG` when its own heap limit is below 7 GB; the run holds every chunk's reads until the block's file is written, and `sgs/nav-bar-menu` exhausted the default 4 GB after 46 minutes (CR4).
- `EDITOR_TIMEOUT_MS`, `CHILD_TIMEOUT_MS`: the limit each load of a calibration page gets: `--editor-timeout` for `wp-build-page.js`'s page load, editor boot and save, the login (`scripts/lib/wp-session.js::ensureLoggedIn`'s timeout argument), and the front-end reads in `lib/calibrate-read.mjs` and `lib/calibrate-content.mjs` (240 s; `wp-build-page.js` defaults to 60 s), and the whole child's limit (three times that: login, load, save and the read-back reload). CR4: a 744-block `sgs/nav-bar-menu` page took 150 s to return its edit screen on the local mirror.
- `buildSpawnArgs(script, args)` → the child's argv with the heap flag, so a large block's build is not killed for memory.
- `chunkSizeFor(block, fixture, env)` → the fixture's own `chunk`, else `SGS_CAL_CHUNK`, else `CHUNK` (150).
- `halveChunk(size)` → the next size down, floored at `MIN_CHUNK`.
- `planChunks(instances, size)` → the instance groups one page each holds, every chunk carrying each variant's default.
- `splitOnTimeout(chunk, size)` → the two chunks a timed-out build is retried as.

### `lib/calibrate-container.mjs` (reads `render.php`)
- `stripPhpComments(src)` → the source without its comments, so a comment naming a flag cannot be read as setting it.
- `hasRuntimeContainerQueries(renderSource)` → whether the render passes `container_queries` or `container` as true to the shared wrapper: the `@container` CSS is emitted at render time, so the built stylesheet carries none.
- `isContainerQueryBlock(builtCss, renderSource)` → either source of truth, so a tier reached at fewer page widths is reported as `containerTier` rather than a one-width hardcode.
- `renderedNothingReason(block, snapshot)` → why a block's render returns early on this site (its gating global custom setting is absent), so the run names it instead of waiting out a selector that will never appear.

### `lib/deploy-hash.mjs` (ssh)
- `REMOTE_PLUGIN`: the plugin folder on the host per site. `md5(s)`.
- `EDITOR_ONLY`: the editor bundles left out of the key (the same commit built in another folder gives a different `index.js`).
- `BUNDLE_TEXT`, `normaliseBundle(rel, text)`: view bundles and asset files with webpack's folder-dependent module numbers and the asset version blanked (the same commit built in two folders numbers its modules differently).
- `TEXT_FILE`, `lfText(buf)`: local text files read with LF endings (the deploy builds from a clean LF checkout; a working copy may carry CRLF).
- `localBlockHash(dir)`, `remoteBlockHash(site, short)`: md5 of a block's front-end build files (bundles normalised), same listing both sides.

### `calibrate.mjs` (runs `wp-build-page.js`, ssh, Playwright)
- `CHUNK`: the most instances one calibration page holds (150, or `SGS_CAL_CHUNK` for a run); a larger block is built and read in chunks, each carrying every variant's default instance.
- Re-exports `lib/deploy-hash.mjs`'s key functions.

### `lib/solve-rows.mjs`
- `WRITABLE_KINDS`: style, hover, box. `groupKey(row, state)`: ref, path, property, setting state.
- `cssProp(key)` → the CSS property a walker row's key stands for: `icon-width`/`icon-height` (rows on the svg's own path) are its `width`/`height`; `painted-ground` is `background-color`.
- `settingState(row, stateMap)` → the row's setting state from the surface's walker-state map (`null` rest, `'hover'`, `'scrolled'`, …), or undefined when the walker state is unmapped or the row is a hover outside rest.
- `openRows(report)` → every unaccepted row with its walker state, width and pair.
- `plainLength(v)` → whether a declared value is a plain length or percentage a setting can hold.
- `usedValueTarget(prop, { perWidth, declared, held })` → `{ perWidth }` with the draft's declared value at every width no ledger entry holds (`held` from `draftValues`), or a `used-value` gap.
- `draftValues(report, pair, prop, hover, walkerStates?, pseudo?)` → `{ perWidth, fontPx, declared, held }` from the draft snapshots, read only from runs in `walkerStates` when given, and on the `::before`/`::after` layer when `pseudo` is given (a group's `pseudo` comes from its rows).
- `writableGroups(report, stateMap)` → `{ groups, box, unmapped, unmappedState, other }`; each group carries its setting `state` and `walkerStates`; a row with no draft value goes to `other` (nothing to write).
- `rowDistance(row)` → px distance from the draft (0 or 1 for non-lengths).
- `regressedRows(prev, report)` → open style or box rows that are new or further from the draft than last round (keyed per walker state).
- `classify(report, { writes, gaps, held?, elements, stateMap })` → `{ hardcode, missing, unresolved, derived, other }`; `held` (from `writeRound` or `heldGroups`) makes a row whose setting already holds the draft value a Hardcode, unless one side was never read: that row is unresolved `unmeasured-side`.
- `intendedCount(report)` → accepted rows.
- `knownPaths(cal)` → every element path a calibration knows (its elements, each setting's slots and reaches, and the discovered slots); the write path and triage read the same set, so a row whose only evidence is a discovered slot is never gapped `unmapped-element` by one and resolved by the other.
- `stateDisagreement(report, group, stateMap)` → `{ width, values, detail }` when the walker states mapped to the group's setting state read different draft values at one width, else null; it compares every mapped state, not only those with an open row, because a baseline state usually has none.
- `TEXT_READ_CAP`: the walker's text read cap (400 characters), beyond which a text row's words cannot be trusted whole.
- `HANDOVER_OWNERS`: `site-info`, `product-data`, `content-page`, `behaviour`, `woocommerce-text`.
- `contentTypeOf(row)` → `text`, `presence` or `link` for a content row, else null.
- `pairTrace(report, row)` → the live element's trace for the row's pair in its own run, or null.
- `contentTarget(report, row)` → `{ ref, path }` of a content row, from its own fields or, since the walker stamps neither on a content row, its pair's live trace.
- `contentKey(target, row)` → one key per content group: ref, path, kind, key.
- `resolveContent(group, { calibration, report })` → `{ writes }` or `{ gap, detail }` for a content group, through calibration's `text`, `presence` and `link` entries (gaps: `no-setting`, `ambiguous`, `unreached`, `shape`, `no-target`).
- `handoverOf(classes)` → `[ { owner, row, widths, reason } ]`, one entry per distinct handover issue, plus every `drive` row as `behaviour`.

### `lib/solve-report.mjs`
- `wholePage(before, after, classes, prefix?)` → distinct style, hover and box issues before and after: `{ before, after, closed, new, labelledGap, unexplained }` (a labelled gap counts as handled only once proven). With `prefix` (writeSolveReport passes `cr-ref-<surface>-`), only the surface's own blocks' rows and rows with no block count: a surface sharing its walker is not judged on its neighbour's blocks.
- `writeSolveReport(outDir, result)`: also writes `issues` and `causes` to the JSON and the `## Issues` and `## Causes` views to the markdown, above the per-width tables.

### `lib/solve-groups.mjs`
- `issueGroups(report, classes)` → one issue per class, element, property and state: `{ class, ref, path, key, state, rows: [ { width, draft, live } ], fails, matches, reasons, held, winningRule }`.
- `causeGroups(issues)` → `[ { class, key, label, issues } ]`, largest first; `valueText(issue)`; `groupsMarkdown(issues, causes)`.

### `lib/winning-rule.mjs`
- `propertyFamily(prop)` → the property names that can set it (logical longhands and shorthands). `explainCascade(matched, prop, draft, sources)` → `{ winner, carrier }` from a CDP matched-rules result. `readWinningRules(rows, { liveUrl })` → a Map of row to `{ text }` or `{ note }`.

### `lib/references.mjs` (reads `plugins/sgs-blocks/src/blocks/*/render.php`)
- `BLOCKS_SRC`: the block sources folder. `CORE_PLACEHOLDERS`: core blocks that print another post or part, with the attribute naming it.
- `referenceKind(src)` → `{ kind: 'linked', flag, key }` (a `<x>IsLinked` flag: own settings unused when on), `{ kind: 'frame', key }` (a `<x>Ref` post printed with `do_blocks`), or null.
- `detectReferences(dir?)` → every SGS reference block.
- `referenceOf(node, refs)` → the reference a tree node holds, or null (a linked block only with its flag on).
- `lintSurfaces(surfaces, buildDir, refs?)` → problems: a tree prints a post that no surface targets (frames) or `provides` (linked blocks, template parts).

### `lib/fill-diagram.mjs`

- `diagramGeometry(spec)` (in-page, passed to `page.evaluate`) → `{ startX, startY, endX, endY, extReach, extReachEnd, extOvershoot, tickLength, labelX, labelY }` in % of the drawing (reach, overshoot and tick in % of its width), or `{ error }` when a selector matches nothing. `spec` is `{ svg, line, guides?, ticks?, label?, labelAlign? }`; guides and ticks may each be one path holding both ends, split by nearness to the line's start and end. A positive reach reaches towards -n, as `plugins/sgs-blocks/src/utils/diagram-geometry.js` draws it. Imports nothing.

### `lib/entrance.mjs`

- `entranceStart(group, node, perWidth, rects?)` → `{ writes }` (`sgsAnimationStart: 'load'`) when the block has an entrance, the group is a rest opacity, translate or transform on the block's own element, every draft value is the shown value, every live value the hidden one, AND the element starts inside the first viewport at `scrollY 0`; else null. `solve.mjs::writeRound` and `lib/triage.mjs::resolveIssue` both try it before the resolver, and both MUST pass `rects` — it defaults to `group.rects`, which nothing assigns, so a three-argument call makes the write dead for every group including the first-screen one it exists for (`tests/entrance.test.mjs` asserts both call sites still pass it). Live is routinely hidden because the walker read an armed, paused entrance pose, which is no reason to start a below-fold block on load.
- `groupRects(report, group)` → `{ [width]: { y, h } }`: the live element's rect at `scrollY 0` for each width the group was measured at, read from the walker report's `runs[].pairs[].live.box`. Empty when no run holds a live box.
- `FIRST_VIEWPORT_HEIGHT`: the viewport height `entranceStart` judges "first screen" against when a rect carries no `vh`.

### `lib/pairs-page.mjs`

- `collectTagged(page, side, cfg, lifted?)` → the page's words with their tagged elements, as the walker's automatic check collects them (less the `lifted` landmark exclusions).
- `liveBlocks(page, prefix)` → `{ refs, boxes, parents }`: the refs around each live word (innermost first), each block's border box, content box and text run, and each block's parent block on this surface.
- `draftChains(page, want, wordEls, match)` → per block, the chain from the smallest draft element holding its chosen words up to `<body>`, the first carrying `own` (the words are its own text) and `run` (its text run's extent).
- `formControls(page, prefix, side, idents?)` → live: each block's first visible control identity (name, else id, placeholder, label, a select's first option); draft (with `idents`): per block, the chain from the visible control with that identity through every ancestor holding no other control. Hidden controls (a honeypot) never count.
- `groupBoxes(page, groups)` → per block, the union box of the draft elements at its children's partner paths.
- `handElements(page, finders, side, prefix)` → per hand pair, its draft path or its live block ref and whether it is that block's root.
- `handScopes(page, finders, side, …)` → per hand pair, the indices of the tagged words INSIDE its element on this side, which is what `lib/pair-scope.mjs::judgePairScope` needs to tell a mispair from a size difference.
- `openDraft(browser, cfg, width, state?)` → the draft page opened through the hand config's navigation with every scroll reveal fired, then the walker state's draft action run (a panel surface).
- `openLive(browser, cfg, width, state?)` → the live page loaded past the host check and opened through the hand config's live navigation (`live.open`), then the walker state's live action run.
- `liftedExclusions(page, prefix)` → the automatic check's landmark exclusions whose live element holds one of this surface's blocks (lifted for its pairing).
- `liveReach(page, cfg)` → `{ requires, requiresFound, notice }`: whether the surface's `live.requires` element is present and the text of any order notice, for `lib/pairs.mjs::assertReachable`.
- `mediaPartners(page, side, cfg, prefix)` → the media elements per block (live) or per draft ancestor chain (draft), for `chooseMediaPartner`.

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
- `liftExclusions(exclude, holdsSurface)` → the selector exclusions that hold the surface (a header, footer or drawer surface pairs its own words).
- `pairingState(cfg, name)` → the hand config's walker state that opens a panel surface on both sides (`pairs.mjs --state`), null without a name; throws when the state is missing or lacks a draft or live action.
- `rootFor(cfg, side, state?)` → the root the pairing collectors walk on one side: the hand config's `pairRoot[<state>][side]` for a panel that leaves the landmark it opens from (the live phone drawer, which `store.js::reparentToBody` appends to `<body>`), else `auto.root`.
## `confirm-canvas.mjs`

Live confirmation of the `canvas-settable` claims, read-only: it writes no tree, setting, page or stylesheet.

```
node scripts/computed-route/confirm-canvas.mjs [--candidates --client <slug>] <triage dir | families.json> <out.json> [base url] [only indices]
```

After a sweep, run it in candidates mode and write the result to `sites/<client>/build/qa/canvas-confirm.json`:
it measures every family `canvasSettable` could ever cite, so a refuted citation's fallback is already measured and
never fails open (Eye Care 2026-10-07: 1,795 families, 13,715 claims, 0 skipped stylesheets, one pass).

A claim classes a row W because another block declares a setting whose `css_property` covers the row's property
and the reachability gate judged its emission to reach the row's element. Confirming that needs a
value-independent test, because computed styles and CDP matched-styles cannot separate "the cited setting loses"
from "the cited setting is unset". So this enumerates every rule in every loaded stylesheet that declares the
property and whose selector matches the row element, and asks whether any of them is the cited block's. The walk
recurses into `@media` blocks without checking whether they apply, so the test is generous to the claim and a
refutation is conservative. Verdicts: `CONFIRMED`, `VAR-CHANNEL` (a matching rule reads a custom property the
framework sets on the cited block), `REFUTED` (rules govern the row but none is the cited block's), `NO-RULE`
(nothing declares the property for this element at all) and `ABSENT` (the row is not in the DOM on that page).

- `familiesFrom(triageDir)` → the claims grouped into families of (cited block, cited setting, row property),
  read from the triage reports so there is no separate hand step to go stale. A family is the unit the claim is
  made in: 168 rows collapse to 63 families, and surface is the wrong axis because a family spans surfaces.
  A resolver-hop citation has no `where` key and a canvas-roster citation has `ancestor` or `sibling`; the two
  are the same claim reached from two directions and are reported apart. `property` is the CSS property the row
  stands for (`lib/solve-rows.mjs::cssProp`: `painted-ground` is `background-color`), the key
  `measuredReachFrom` is looked up with and the property the stylesheet walk reads.
- `candidatesFrom({ client, triageDir, manifest, contextFor? })` → every family `canvasSettable` would consider for any
  issue of any `canvas: true` surface, found by calling it with a `ctx.measuredReach` that records each
  (block, setting, property, cited ref) and answers false, unioned with `familiesFrom`. Asking about every issue,
  not only today's canvas-settable rows, keeps the set independent of the confirm file it replaces.
  `contextFor(surface, recorder)` defaults to `triage.mjs::surfaceContext`.

Findings: `.claude/reports/2026-10-06-session-c2/CANVAS-SETTABLE-CONFIRMATION.md`.

- `collectContext({side, width, state?, root?, message})` → the message `pairs.mjs::runPairing` throws when a pairing collector fails: a failure raised inside the page carries no side, width or state, so a missing pair root read as a bare `page.evaluate` error four frames from its cause. A pair-root failure also names the root and that a state opener which did not fire leaves it absent; any other failure keeps its own text and only gains the side, width and state.
- `RECHECK_WIDTHS`: the widths a kept finder is re-checked at besides the pairing width (375, 768, 1920).
- `joinFinders(perWidth)` → one CSS selector list from a block's distinct per-width draft paths, in width order.
- `mergeWidthFinders(perWidth, resolvesAt, widths?)` → `{ ok, draft, drafts, why }`: one joined finder for a block whose draft partner differs per width, kept only when the joined selector resolves at every width to that width's own element, so it can never measure another element.
- `assertReachable({ url, blocks, words?, requires?, requiresFound?, notice? })`: throws on an empty live URL, no blocks, a missing `live.requires` element, or a failed or cancelled order notice, so an unreachable page fails loudly instead of writing an empty report.
- `chooseMediaPartner(live, draft, limits?)` → `{ partner, verdict }` for a block with no painted words but a media element: the draft media at the same place among its paired ancestor's media, left out when the two sides' counts differ.
- `pairingStates(cfg, names)` → the hand config's walker states for a multi-state pairing run (`pairs.mjs --state a,b,c`), `rest` meaning the page at rest.

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
- `USED_VALUES`: computed properties that are used sizes (`width`), written only as the draft declares them (a plain length or percentage at every width, from the walker's `declared` read), otherwise a `used-value` gap naming what the draft declares.
- `calibrationFor(block)` → the block's calibration file (through `withInnerRootAliases`) or null.
- `withInnerRootAliases(cal, block)` → the calibration with every slot, reach and element path also answering to its form without a leading `.sgs-<slug>` step, when the cache holds that inner root as an element (a block calibrated with its optional wrapper on, measured on a page with it off); otherwise `cal` unchanged.
- `blockRenderSource(name)` → a block's `render.php` source, or null.
- `outsideOwner(node, { refs, source })` → who owns the content of a block whose words, elements or links come from outside the layout tree (`content-page`, `site-info`, `woocommerce-text`, `product-data`), read from the block's own source, or null. Evidence about the block, never a verdict on a row.
- `writeRound(report, tree, { db, snapshot, round, log, blocked, stateMap, calFor?, canvas?, ancestorHop?, ownerOf? })` → `{ writes, gaps, held }` (`held[groupKey]` lists a setting that already holds the draft value; `heldGroups(report, tree, opts)` reads it on a copy with its own snap log); only rows from mapped walker states are written. It hops to an enclosing ancestor last, writes content rows through calibration's `text`, `presence` and `link` entries, and reports `state-conflict` and `handover` gaps.
- `solveLoop({ maxRounds, build, walk, guard, write, save, blocked?, log? })` → `{ report, writes, gaps, rounds, lastWrote }`: the build, walk and write rounds with every step passed in; `maxRounds` 0 is measure-only (one build, one walk, never a write).
- `revertRegressions(prev, report, tree, lastWrites, blocked, calFor?, trials?)` → the writes the guard undid this round (`lib/guard.mjs::guardRound`).
- `wrongWrites(writes, reportAfter, stateMap)` → writes a later round reverted or that moved their rows further from the draft.

### `fill.mjs` (runs Chromium, serves a local folder)
- `calibrationLoader(dir)` → the block-to-calibration function: `solve.mjs::calibrationFor` when `dir` is null, else reads `<dir>/<block>.json`.
- `parseMirrors(argv)` → `{ url: absolute file }` from repeated `--mirror <url> <file>`; throws on a lone url.
- `fillSurface(options)` → the report object (and writes `--out`): lints the skeleton, serves or opens the draft, reads it, resolves root-down, samples entrances and the sweep, and writes every output.

### `lib/draft.mjs`
- `contentType(file)` → the Content-Type for a file name.
- `resolveRequest(root, urlPath, index)` → `{ file }`, `{ redirect }` or `{ status }`; never a path outside `root`.
- `serveDraft(folder, { index, host })` → `{ url, port, close }` on 127.0.0.1 at an ephemeral port.

### `lib/fill-skeleton.mjs`
- `SCOPE_ATTR`: the attribute a node's draft element carries while its slots resolve. `scopeSelector(index)` → the selector for it.
- `finderProblem(f)` → why a value is not a walker finder, or null. `finderKind(f)` → `selector`, `text`, `textRun`, `group` or `js`, else null.
- `scopeFinder(f, scope)` → the finder rewritten to resolve inside the scoped element.
- `skeletonNodes(tree)` → depth-first nodes with parent, children and targets.
- `skeletonProblems(tree)` → readable problems in a skeleton's draft keys.
- `cleanTree(tree)` → a copy without `draftRef`, `draftSlots` and `handover`.

### `lib/fill-read.mjs` (Playwright by path; imports `scripts/parity/lib/*`)
- `READ_WIDTHS`: 375, 768, 1440. `DECLARED`: properties whose computed value is a used size. `PRESENT`: the render-presence sweep series. `PROPS`: the properties Fill resolves.
- `loadChromium()` → Playwright, imported from `plugins/sgs-blocks/node_modules`.
- `requestAllowed(url, origin, external)` → whether the draft may load a url.
- `routeDraft(ctx, { origin, external, mirror })` → routes a context's requests (mirror, allow, abort).
- `jobsFor(nodes)` → the collection jobs, roots before slots.
- `readDraft(options)` → `{ origin, widths, declared, sweep }`.

### `lib/fill-prop.mjs`
- `TIER_WIDTHS`: 1440, 768, 375. `INHERITED`: calibration's inherited list, re-exported rather than copied. `CARRIED`: properties read from a text or layout carrier.
- `knownPaths(cal)` → every path a calibration knows for a block.
- `canon(prop, v)` → the value as painted, for comparison. `notPainted(prop, styles)` → whether the property paints nothing here.
- `defaultPaint(cal, slot, width, prop)` → the calibrated default paint, or undefined.
- `tiersDiffering(prop, draft, baseline)` → `{ width: value }` for the tiers that differ, carrying wider values down.
- `resolveProperty(ctx)` → `{ status: 'equal' | 'written' | 'gap', … }`, always through `lib/resolve.mjs::resolve`.

### `lib/fill-resolve.mjs`
- `valueText(draft)` → a readable value for a per-width map.
- `fillTree(options)` → `{ writes, unmapped, notes, handover, spacing, fluid, held, snaps }`, filling the tree in place.

### `lib/fill-spacing.mjs`
- `EQUAL_PX`: 0.5, the tolerance at which two rendered gaps are equal.
- `spacingOwnership(rects, { unmeasured })` → `{ owner, count, decisions }`: the parent owns the gap only when every sibling gap is equal.
- `decisionFor(ownership, prop)` → the decision for `row-gap` or `column-gap`, or null.

### `lib/fill-values.mjs`
- `FLUID_WIDTHS`, `SWEEP_WIDTHS`, `SGS_BOUNDARIES`, `LENGTH_PROPS`, `FLUID_TOL`: the sample widths, the 16px sweep range, the SGS breakpoints, the properties swept and the 0.5px linearity tolerance.
- `fitFluid(samples)` → a line fit with its `clamp()` text, or null when the value steps.
- `acceptsClamp(calibration, attr)` → whether the setting's `forms` lists `clamp`.
- `applyClamp(writes, clamp, side)` → the writes with the per-tier values replaced by one clamp.
- `nearestBoundary(width)` → `{ boundary, offset }`.
- `breakpointSteps(prop, series)` → each step with its nearest SGS boundary.
- `sweepSteps(sweep, labelOf)` → every step of a sweep, labelled and ordered.

### `lib/fill-presence.mjs`
- `plainText(s)` → text without markup, whitespace collapsed.
- `presenceDecisions(input)` → `{ writes, unmapped, notes }` for visibility and variant settings, from calibration's `presence`.
- `textDecisions(input)` → the same for words, from calibration's `text`.
- `normaliseHref(href, origin)` → the href as WordPress holds it, or null. `linkDecisions(input)` → the same for links, from calibration's `link`.

### `lib/fill-handover.mjs`
- `HANDOVER_OWNERS`: re-exported from `lib/issue-classes.mjs`, the one definition Solve and Fill share. `HANDOVER_KINDS`: `text`, `presence`, `link`, `behaviour`.
- `handoverEntry(entry)` → a validated entry; throws on an unknown owner or kind, because a handover nobody owns is the failure the list exists to prevent.
- `handoverProblems(list, label)` → problems in a skeleton's declared handover list.
- `handoverCounts(entries)` → the count per owner, every owner present.

### `lib/fill-page.mjs`
- `INITIAL`: the CSS initial values of the inherited properties a theme rarely sets.
- `lineHeightPx(lh, fontPx)` → px for a ratio or a px value.
- `pageBaseline(raw, tag)` → `{ value(prop, width, ownFontPx), own(prop) }`, the inherited baseline from the theme snapshot.

### `lib/fill-entrance.mjs` (Playwright)
- `STEP_MS`, `JITTER_MS`: 50 and 40, the probe's polling step and tolerance.
- `sampleEntrances(options)` → the raw probe results by job id.
- `translationOf(pose)` → `{ x, y }` in px. `shapeEntrance(raw)` → `{ delayMs, durationMs, distancePx, … }` or null.
- `entranceValues(e)` → `[ prop, value ]` pairs for the resolver. `entranceWrites(options)` → `{ writes, unmapped }`.

### `lib/fill-config.mjs`
- `walkerPairs(nodes, tree)` → `{ ref, draft }` per node carrying a `draftRef`.
- `baseConfigText(options)` → the base config file's text.
- `walkerConfigs(options)` → `{ baseFile, baseText, fullFile, fullText }`.

### `lib/fill-report.mjs`
- `unmappedList(unmapped)` → property, value, node and reason (plus block and element) — the framework work for the surface, known before the first build.
- `fillReport(r)` → `{ markdown, json }`.

### `lib/pair-scope.mjs`

- `judgePairScope({ draftIn, liveIn, matches, dTexts, lTexts })` → `{ ok, checked, split, why }`: twin containment. A hand pair is a mispair when a matched word inside one element has its twin OUTSIDE the other, meaning the two finders landed on different parts of the page. A size difference alone never counts, so a link wider on one side passes. A word repeating on its own side is skipped, because the matcher may have chosen another occurrence. `pairs.mjs` computes the verdict once into `qa/pairs/<surface>.json` as `handScope` and `scripts/parity/lib/lint.mjs::lintConfig` enforces it, so a mispair is refused before any browser opens. **A surface with no `handScope` has not been judged, which is not the same as passing.** The obvious box-ratio gate was ruled out on evidence: it flags 40 pairs of which at least 12 are legitimate.
- `MIN_CHECKED` → the smallest evidence base a twin-containment verdict is allowed to rest on (3 matched, unrepeated words). Below it `judgePairScope` returns `{ ok: true, judged: false }` rather than a verdict, because one or two words cannot distinguish a mispair from a word the matcher placed elsewhere. The floor is on the evidence base, not on the share that splits: the real `about-step` mispair splits only 1 of 9, so a share threshold would have let it through.

### `lib/issue-classes.mjs`
- `HANDOVER_OWNERS`: who edits content living outside the layout tree (`site-info`, `product-data`, `content-page`, `behaviour`, `woocommerce-text`). Defined here because Solve discovers a handover from a measured row while Fill carries one its skeleton declared, and a list kept in both would drift.
- `VISUAL`: the row kinds counted as a distinct open issue: the painting kinds (`style`, `hover`, `box`) plus `CONTENT_KINDS`. Any other kind is reported, never counted.
- `CONTENT_KINDS`: the row kinds carrying page content (`text`, `presence`).
- `LINK_COVERAGE_PREFIXES`: the key prefixes that make a kind-`auto` row a link-coverage issue (`link-missing`, `link-extra`).
- `normalisePath(path)` → the path with positional selectors (`:nth-of-type(n)`, `:nth-child(n)`) removed.
- `normalisedIssueKey(row)` → `issueKey` over that normalised path. Sweep-over-sweep deltas compare on THIS, never the raw key: a cosmetic walker change that adds a `:nth-of-type(1)` re-keys rows wholesale with no verdict change (18 of `sgs/brand-strip`'s 51 rows did exactly that between two sweeps), which Gate TAIL would read as a wave of closes and opens. `issueKey` itself is deliberately unchanged, because re-keying it would re-key every existing ledger entry.
- `CONTENT`: the class for a content row no Solve class holds (`content`), walked after `UNMAPPED`, which never takes one.
- `isContentRow(x)` → whether a row is page content (text, presence, or link coverage).
- `isIssue(x)` → whether a row is a distinct open issue at all: the one test every reader applies.
- `SOLVE_CLASSES`: Solve's classes for a surviving row, in the order both readers walk them (`hardcode`, `missing`, `unresolved`, `derived`); the first class to hold a key keeps it.
- `UNMAPPED`: the class for a visual row from a walker state the surface maps to no setting state (`unmapped-state`), walked last.
- `issueKey(x)` → `solve-report.mjs::wholePage`'s key: one element and property whatever the width or state (`pair` stands in for a row with no ref).

### `pairs.mjs`
- `runPairing(opts)` → one pairing pass: collects both sides, chooses each block's partner, and returns the kept pairs and the left-out blocks with their reasons.
- `recheckWidths(kept, opts)` → re-reads each kept finder at `RECHECK_WIDTHS`, re-pairing at a width where it fails and keeping a joined finder only when `mergeWidthFinders` allows it.

### `lib/sweep.mjs`
- `latestReport(solveDir, surface)` → the newest `solve-report.json` of a surface (the last timestamp folder holding one), or null.
- `issueRows(report, surface, reportPath)` → `{ rows: [{ key, row }], otherRows }`: one row per distinct style, hover or box issue of the hardcode, missing, unresolved and derived classes, then of Solve's `other` rows from unmapped walker states (class `unmapped-state`, unless a Solve class holds the key) (`wholePage`'s key and own-block filter); `otherRows` counts the non-visual rows.
- `reportStatus(solveDir, surface, sweepStart?)` → `{ file, stale }`: `file` as `latestReport`, and `stale` either null or `{ reason, report, newestRun }` — `incomplete-run` when the surface's newest run folder holds no `solve-report.json` (a Solve that failed part-way, so `file` is an OLDER run's report served as current), or `predates-sweep` when the report predates `sweepStart`. Observed live: `header` failed with a walker `TimeoutError` and its earlier measurement would have been reported as current. `sweepStart` is the epoch ms the SOLVE batch began, never the aggregation's own clock — Solve always writes before the sweep reads, so defaulting it to now would mark every surface stale; omitted, only `incomplete-run` is checked.
- `walkerCaveats(source)` → one caveat per state `findings` entry (`reveal-unfired`) and per `unsettled`: a statement about the instrument, never an issue row, and it changes no count.
- `readWalkerCaveats(reportPath)` → the caveats of a run, read from the `draft-cache-*.json` files beside its report, which is the only place the walker persists `states`.
- `sweepDelta(prev, next)` → the closed and opened rows between two sweeps, counted per `normalisedIssueKey` so siblings differing only by position stay separate findings.
- `aggregate(entries, unmeasured?, date?)` → `{ date, surfaces, unmeasured, total, byClass, rows, stale, caveated }` from `[{ surface, reportPath, report, config?, stale?, caveats? }]` in manifest order. Each surface counts its own rows; on the site a row with a ref, or a block-less row of the same hand config, counts once under the first surface, later ones in its `alsoIn`.

### `sweep.mjs`
- `sweep(surfacesFile, date, out?)` → `{ result, file }`: reads each surface's newest report and writes the sweep file.

### `lib/register-sweep.mjs`
- `STATUSES`, `STATUS_RULES`: the five A4 statuses and their decided rules (the plan's, plus partly measured).
- `GROUPS`, `SITE_WIDE`, `SECTION_SURFACES`: the eight A4 groups by register section, the site-wide section's name, and the sweep surfaces each section is measured by (an empty list: none).
- `registerItems(markdown)` → `[{ ids, section, cells, covers, line, header }]`: every register table row whose first cell holds ids.
- `item.aliasOf` → the id a row's Fix cell points at when the WHOLE cell is nothing but the pointer (`See 17`, `Same as N2B`), else null. Such a row is an alias of another, not independent work, and its `covers` is set to that id so the roll-up stops double-counting it — only the site-wide tables have a `Covers` column, so three rows carried their pointer solely in the Fix cell and were modelled nowhere. An explicit `Covers` entry always wins. The match is deliberately narrow: a Fix cell that merely mentions another row inside prose is its own work.
- `itemKey(item)` → the item's ids joined with ", ".
- `groupItems(items)` → `{ groups: [{ name, items }], ungrouped }`.
- `itemSurfaces(item, items)` → the sweep surfaces an item is measured by (`null`: a section no surface covers); a site-wide item's are those of the items it covers.
- `verdictsFor(item, items, verdicts)` → the verdicts that answer one item.
- `measuredRefs(pairing)` → the refs one surface's pairing report measured (generated pairs and hand-covered blocks).
- `checkStatuses(items, verdicts, sweep, measured?, walks?)` → problems: one valid status per item; a still-open claim cites one exact row (report, ref or pair, path, property) and quotes one of its `values`, or an open diff of a walk report in `walks` (`evidence.walk`, `pair`, `property`, `draft`, `live`), with `evidence.element` tying the item to that element; not walker-measurable never rests on hover alone (a reason naming a behaviour, focus, content or motion kind may mention it); a clean claim with `evidence.path` is judged on that element of the block only; a clean claim cites a report the sweep holds and a ref no row touches (and, with `measured`, one its surfaces measured); a site-wide clean needs every covered item clean and measured.
- `addSweepColumn(markdown, items, verdicts)` → register text with a Sweep column, or that column rewritten when the table already has one (a re-run never stacks a second); every other cell unchanged.
- `bundleGroup(group, items, sweep, measured?)` → one agent's input: items, surfaces (with measured refs), rows and the status rules.

### `register-sweep.mjs`
- `measuredFrom(pairsDir, sweep)` → `{ surface: [refs] }` from the pairing reports present.
- `bundle(registerFile, sweepFile, pairsDir, outDir)` → `{ files, ungrouped }`.
- `merge(registerFile, sweepFile, pairsDir, verdictFiles, out)` → `{ problems, items }`; writes `out` only with no problems.

### `lib/triage.mjs`
- `TRIAGE_CLASSES`: W, F, T, U (a box row nothing explains), L (a row that follows a difference the divergence ledger accepts, citing the entry).
- `issuesOf(report, surface)` → `[{ key, solveClass, rows }]`: distinct hardcode, missing, unresolved and derived issues, then the unmapped-state rows of `other` (a visual row from a walker state the surface maps to no setting state) under `solveClass` `unmapped-state`, in the sweep's class order so a key a Solve class already holds stays under it (`lib/sweep.mjs::issueRows`).
- `emissionOf(cite, props, ctx)` → the classes and pseudo-elements a cited control actually emits to, or null when that cannot be read. Either `ctx.emissionFor(block, setting, property)`, or the PHP index `ctx.helpers`: every `sgs_*` function emitting the property whose file names the setting contributes the `.sgs-*` classes and `::` pseudos in its string literals; a function emitting to the root is skipped.
- `reachesElement(cite, issue, ctx)` → whether that emission can match the row's element. `canvasSettable` and `resolveIssue`'s ancestor hop both credit a control only when it does. An UNKNOWN emission keeps the old credit, because refusing unknowns would turn every such claim into a false F. This is what stopped all 20 `sgs/container::bgHoverZoom*` claims being classed `W/canvas-settable` on form inputs, tab buttons and filter inputs that `container-bg-hover-zoom.php` can never paint.
- `reachabilityVerified(cite, issue, ctx)` → whether `reachesElement` actually TESTED this citation or fell through its fail-open branch, stamped onto the citation evidence as `reachabilityVerified`. The fail-open above is deliberate (refusing unknowns would manufacture false F rows) but it means an untested claim and a tested one are indistinguishable in the evidence, and R-47-12 requires the citation be tested before the row is called resolved. **Measured 2026-10-06: `emissionOf` returned null for 17 of 17 citations that a live read then refuted** — so for those rows the gate asserted reachability rather than testing it, which is why every one read `W`. The real repair is to supply `ctx.emissionFor`, which is read here but set by no caller; until then this flag is what separates evidence from assertion. Findings: `.claude/reports/2026-10-06-session-c2/CANVAS-SETTABLE-CONFIRMATION.md`.
- `measuredReachFrom(results)` → the `ctx.measuredReach( block, setting, property )` lookup built from `confirm-canvas.mjs`'s results: `false` for a REFUTED or NO-RULE family read with no skipped stylesheet, otherwise `undefined` (CONFIRMED and VAR-CHANNEL are not proof; ABSENT and NO-URL were never read). `reachesElement` consults it before the source gate, so a measured refutation is final and an unmeasured citation still falls to the fail-open. `triage.mjs::runTriage` reads it from `sites/<client>/build/qa/canvas-confirm.json` when that file exists.
- `nameFits(prop, attr)` → whether a setting's name fits a property (size families, hover effects, background, shorthand words; never a longer property's name).
- `settingFits(name, setting, prop, values)` → css_property or name fit; visibility toggles only for `none`, unit companions never.
- `rosterApplies(ext, block, supports)` → whether a roster extension reaches a block.
- `delta(row)` → live minus draft in px, or null.
- `anchorOf(walk, row)` → the ref a `y-from-`/`y-after-`/`x-`/`right-` row is placed against, or null.
- `explainRow(row, open, { ancestorsOf, walk })` → the open row it follows, or null. A row measuring this row's own element from an enclosing block (its owner frame: one element is read by every pair it carries text or layout for) is never its parent; a row that IS such a reading follows the element's own row with the same values (`match: 'same-element'`).
- `ledgerParent(issue, ctx)` → `{ check: 'ledger-consequence', entry, parent, match, widths }` for an issue with no open parent whose every row follows a ledger decision: a ledger-accepted row (`ctx.ledgerRows`, stamped `decided.id` by the walker) explaining it by the same amount or as the same element, or a position row placed after a node an entry accepts in full (property `*`); else null. A walker accept (an equivalence rule) or a bare layout row never attributes a row.
- `mispairOf(issue, walk)` → `{ check: 'mispaired', widths, sizes }` when, at every width the issue was read, its pair's draft and live boxes differ more than twice in width or height (the walker compared two different elements), else null; `triageIssue` labels such an issue W `mispaired` before any setting lookup.
- `transientOf(rows)` → transient evidence (a motion property at an entrance start value) or null.
- `usedValueOf(issue, walk)` → used-value evidence (a width or height with no declared plain length) or null.
- `resolveIssue(issue, ctx)` → the resolver read-only as `writeRound` builds it: `{ gap, detail }` or `{ writes, on, holds }`.
- `holdsValue(current, value, merge)` → whether an attribute already holds a write.
- `fittingSettings(issue, ctx)` → attribute, discovered, extension and enclosing evidence (`reaches: false` where calibration shows a setting not reaching the element).
- `triageIssue(issue, ctx)` → `{ key, class, decidedBy, evidence, source? }`. Before any setting lookup: `no-live-element` (live empty at every width), `unmeasured-side` (a side the walker never read at any width, as Solve's classify), `mispaired`, `same-element` (an enclosing block's reading of an open element row), then `L`/`ledger-consequence`. A fitting attribute calibration never measured decides W as `uncalibrated-fit` (its reach is unknown: a calibration gap), never `attribute`.
- `canvasSettable(issue, ctx)` → FR-47-8 (c): the citation for the nearest block already in the canvas that declares the row's property **in the row's state** — enclosing blocks first, then `ctx.canvasBlocks()` — or null. A declaration is a `css_property` match or a modifier of it, never a name that merely reads like the property. A classification only: the route cannot decide which sibling should own the value, so it refuses F and hands the row on with its citation.
- `issueContext(report, walk, ctx)` → the per-issue ctx `triageIssue` and `canvasSettable` read (the walk, its open rows, its ledger-accepted rows (`ledgerRows`) and writable groups, Solve's gaps and writes); `triage` and `confirm-canvas.mjs::candidatesFrom` both build it here.
- `triage(report, walk, surface, ctx)` → `{ verdicts, counts }`.

### `lib/triage-source.mjs`
- `phpSymbols(text, file)` → `{ functions, classes }` one PHP file defines (an `sgs_*` function's body; a class's whole file).
- `helperIndex(files)` → `{ functions, classes, files }` over many files (the first definition wins).
- `callsIn(text)` → `{ functions, classes, requires }` a PHP text calls, uses or requires.
- `helperSources(entries, index, depth?)` → `[{ file, symbol, text }]` the helpers PHP texts reach, nearest first (depth 2 by default).
- `sourcePass(issue, names, ctx)` → `{ render, rules, helpers }`: setting names `render.php` mentions, `style.css` rules declaring the property for the element, and the helpers it reaches that read a setting (quoted key) or emit the property.

### `triage.mjs`
- `phpFiles(dir)` → every PHP file under a folder as `{ file, text }` (plugin-relative paths).
- `finalWalk(reportFile)` → the highest `round-N/report.json` beside a Solve report, or null.
- `treeIndex(buildDir, manifest)` → `{ nodes, ancestors }` for every ref in every surface tree.
- `surfaceContext({ client, surface, report?, measuredReach? })` → `{ buildDir, reportFile, walkFile, report, walkReport, ctx, close }`: one surface's Solve report, final walk and triage ctx; `measuredReach` replaces the canvas-confirm.json lookup.
- `runTriage({ client, surface, report?, out? })` → `{ verdicts, counts, file }`.
- `surfaceBlocks(buildDir, entry)` → every block in one surface's own tree as `[ { ref, name } ]`: the sibling roster R-47-12 (c) checks for a block that can hold the row.

### `lint.mjs`
- `routeFiles(root)` → every route file, relative.
- `exportsOf(src)` → exported names.
- `lintFolder(root)` → problems (README index, scripts imports).
- `lintTree(tree, db, label?)` → problems (core style, native_wp).
- `lintSkeleton(tree, db, label?)` → problems (style values).
- `registerIds(markdown)` → the item ids a fix register holds (table first cells, comma-split, and ids leading a bullet).
- `HOUSE_RULES`: ledger rules that are house rules (`touch-target`, `accessibility`): their entries cite no register item.
- `lintLedger(entries, ids, label?)` → problems: an entry (not a house rule) whose `register` ids are missing or not in `ids`.
- `lintSurfaceLedger(surfacesFile, registerFile?, repo?)` → `lintLedger` on `<build>/qa/divergences.json` against `registerFile`, else the register `qa/ledger.config.json` names (from the repo root); a ledger with entries and no register, or a missing register file, is a problem.
