# Computed route (Spec 48)

Measures a rendered design draft and writes block settings through the framework database, one surface at a time.
**Solve** takes an existing layout tree, compares it with the draft through the parity walker, turns each difference
into a setting write, rebuilds and repeats (at most three rounds). **Fill** fills a skeleton tree from
the measured draft. Governing spec: `.claude/specs/48-CLONING-SYSTEM.md`.

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
| `package.json` | The route's own third-party packages at exact versions (FR-48-75): `playwright`, `ajv`, `ajv-formats`, `saxes`, `@babel/parser`. Route code imports them from `scripts/computed-route/node_modules` only (`npm ci` here installs them). |
| `package-lock.json` | The lock file for `package.json`. |
| `lint.mjs` | The route's gate: README index, plugins/sgs-blocks/scripts import ban, `plugins/sgs-blocks/node_modules` ban (FR-48-75), no core `style` or `native_wp` writes in a `--tree`, no style values in a `--skeleton`, every printed post owned by a surface in a `--surfaces` manifest, every divergence-ledger entry beside that manifest citing register items its register holds (`--register`, else the `register` of `qa/ledger.config.json` beside the ledger; B4), client names. |
| `calibrate.mjs` | Calibration command: refuses on a deploy mismatch, resolves each fixture's site references from the target's `refs` and checks each referenced object exists on the site (a block with an unsupplied or missing reference is reported and not built), builds each block's markers on the calibration page (a marker with `base` beside a baseline instance carrying those attributes, in every chunk), reads them at 375/768/1440 (hover under a real mouse and focus by keyboard on the styled element, its panel opened when hidden; a shrunk marker with its ancestor class; scrolled markers with the window scrolled, against a scrolled default), writes two files, each only when due (`cache/<block>.json`, the site-independent slot map: kept when its key is current or another site measured it, unless `--recalibrate`; `cache/<site>/<block>.paint.json`, that site's default paint: kept only when its own file carries the current `paintKey`), empties the page. |
| `solve.mjs` | Solve command: refs, then up to three build, walk and write rounds, a final build and walk, classification and the solve report. Each `surfaces.json` entry must carry `states` (walker state → setting state; unmapped states are reported, never written) and may carry `walkStates` (passed to the walker as `--states`) and `provides` (the linked blocks and template parts whose post it is, `"<block>:<value>"`). A linked placeholder is never written. |
| `fill.mjs` | Fill command (FR-47-4): a skeleton tree plus a draft (a hosted url or a local folder) to a tree resolved root-down in one pass, before anything is built. Needs `--client`, `--surface`, `--skeleton`, `--live-url` and one of `--draft-url` / `--draft-dir`; `--serve <folder>` serves a draft until Ctrl-C. Reads `surfaces.json`, the snapshot and the ledger; writes only into `--out`: `filled.tree.json`, `fill-report.md`/`.json`, `unmapped.json`, `handover.json`, `breakpoints.json` and the generated walker config, plus `<build>/<surface>.origin.json` (cr-ref to `tpl` key and fingerprint) when the skeleton names its draft elements by `tpl` finder. |
| `sweep.mjs` | Sweep command: `--surfaces <surfaces.json> [--date YYYY-MM-DD] [--out <file>]`; reads each surface's newest `solve-report.json` and writes `<build>/qa/sweep/<date>/sweep.json`: one row per distinct open issue across the site `{ surface, ref, pair, path, block, property, widths, state, kind, class, reason, values, report }` (`pair` names a block-less hand-pair row; `values` holds each distinct draft and live pair, at most 6), totals per surface and class, and the surfaces with no report. |
| `register-sweep.mjs` | Register sweep command (A4): `bundle --register <md> --sweep <json> --pairs <qa/pairs dir> --out <folder>` writes one input file per A4 group (items, the sweep rows and measured refs of their surfaces, the status rules; agent brief `sites/eye-care-ward-end/build/qa/sweep/2026-10-05/a4/agent-brief.md`) and exits 1 on an item in no group; `merge … --verdicts <json> … --out <file>` checks the agents' verdicts and writes a copy of the register with a Sweep column (never in place). |
| `triage.mjs` | Triage command (B1): `--client <slug> --surface <s> [--report <solve-report.json>] [--out <file>]`; reads the surface's newest (or given) Solve report and its final walk (highest `round-N/report.json`), every surface tree, the DB read-only, calibration, the extension roster, block sources and every PHP file under the plugin's `includes/`; writes `<build>/qa/triage/<surface>.json` (a candidate class W, F, T or U with evidence per distinct issue) and prints counts by class. |
| `pairs.mjs` | Block pairing command: pairs every block of a surface with its draft element through the walker's word matcher, re-checks each kept finder at 375 and 768, and writes `<surface>.full.mjs` (the hand config plus one pair per block) and `qa/pairs/<surface>.json` (kept pairs and every left-out block with its reason). A panel surface pairs with its walker state open on both sides (`--state <name> --width <w> [--recheck <widths>|none]`), recorded in the report. A surface's `walkerFull` in `surfaces.json` makes Solve walk it. With `<surface>.origin.json` (`origin.mjs`), each block in it is paired by exact draft identity (a `tpl` finder) and the word pairing is cross-checked against it (`identityPass`): a replaced generated pair is recorded in `replaced`, a hand pair that disagrees in `mispaired`. |
| `origin.mjs` | Origin command (route-accuracy R4): `--client <slug> --surface <s> [--skeleton f] [--tree f]`; aligns the skeleton writer's skeleton with the surface's committed tree by block names, level by level, and writes `<build>/<surface>.origin.json` (cr-ref to tpl key and fingerprint); prints every block left without an identity and why. |
| `trial.mjs` | Try-before-write replay (route-accuracy R6): `--client <slug> --surface <s> --run <solve run dir> [--round 1] [--site <calibration target>] [--widths 375,768,1440] [--out <dir>]`; tries each write of one round of a stored Solve run through `lib/trial-run.mjs::openTrial` (the step Solve itself runs before each rebuild) and writes `trial.json`, `trial.md` and `writes-kept.json` (every write but the rejected ones, in solve-report form, for `answer-sheet.mjs --solve`). Changes nothing on any site. |
| `skeleton.mjs` | Skeleton writer command (Spec 48 §3.4): `inventory|propose|review|finalise|decide --client <slug> --surface <s>` into `sites/<client>/build/skeleton/`. `inventory --root <selector>` reads the hosted draft (`surfaces.json[surface].draftUrl`) at 1440, 375 and 768 and writes `<s>.inventory.json` and `shots/`; `propose [--site-name <text>]` writes `<s>.skeleton.json` (a Fill skeleton whose every draft link is a `tpl` finder) and `<s>.proposal.json` (per element: candidates, evidence, confidence, low = below 0.7); `review` writes `<s>.review.html`; `finalise` writes `<s>.finalise-request.json` for the low rows and `finalise --apply <picks.json>` merges the picks and re-proposes; `decide --key <k> (--block <slug> [--attrs <json>] | --remove)` and `decide --site-name <text>` record into `decisions.json`. Never calls a model, builds a page or writes outside that folder. |
| `check-refs.mjs` | Draft-link check: `--client <slug> --surface <s> [--skeleton <file>] [--draft-url <url>]`; opens the draft, resolves every `draftRef` and `draftSlots` finder (a Site Info row's generated icons included) through the walker's `resolveFinder`, counts what the raw selector would match, prints resolved / unique / missing per node, and exits 1 on any target that is missing, ambiguous or outside its node. |
| `handoff-check.mjs` | Spec 48A handoff folder check: `<handoff folder> [--known <file>] [--schemas <dir>] [--json]` runs FR-48A-2 to FR-48A-8 and FR-48A-10 (exit 0 pass, warnings allowed; 1 a failure naming the file and rule; 2 usage). `--probe-runtime` renders `data/runtime-probe.dc.html` with the folder's `support.js` and prints the module difference from the nearest other known build; `--add-runtime [--source "<text>"]` records the build only when the probe passes. |
| `intake.mjs` | Stage 1 command (FR-48-17): `<client> [--record] [--widths 375,768,1440] [--surfaces a,b] [--repo <path>]` runs intake on `sites/<client>/handoff/` (manifest re-check, replay file, census, routing, breakpoints, page map, tokens and palette, Site Info, flags, draft defects, skeletons, missing features, notices) and writes `sites/<client>/build/intake/intake.json` and `review.md` (carrying marks over from the previous intake, kept as `intake.prev.json`) and `sites/<client>/build/page-map.json`, each validated first; `--apply-review <client>` reads Bean's marks back, refusing any unmarked or off-list row, and writes the confirmed page map. Every browser stage runs in a secret-free worker. Exit 0 pass, 1 failure named, 2 usage. |
| `stage0.mjs` | Stage 0 command (FR-48-3, FR-48-16): `--client <slug> --site <mirror target> [--plan] [--recalibrate]`; runs the handoff check, derives the fixed block set (layout and content blocks plus the blocks the surface kinds call for), recalibrates each stale or missing slot map with `calibrate.mjs --slot-map-only` (no default paint), and writes `sites/<client>/build/intake/calibration-baseline.json` only when every block's slot map is current and the baseline validates. A block whose fixture names a reference the target does not supply or the site does not hold is `needs-refs` and blocks the run. `--plan` prints the set and what would run and touches nothing (it reads the site to check the references). Exit 0 only on a full pass. |
| `handoff-repackage.mjs` | Brings an export made before `MANIFEST.json` existed to the Spec 48A format (FR-48A-1): `<handoff folder> --project "<name>" --entry <draft> [--entry ...] --generated YYYY-MM-DD [--dry-run]`. Proves every file still matches its old `MANIFEST.md` size and SHA-256 and stops on any mismatch before writing; then removes `MANIFEST.md` and `handoff-schema/trace/`, copies missing master schema files, writes `MANIFEST.json` and runs the handoff check (exit 0 pass, 1 refused or check failure, 2 usage). |
| `trace-check.mjs` | `<handoff folder> [entry .dc.html] [--shift=7]` (FR-48A-7 cross-check): loads a single-file draft's entry page at 1440, scrolls it, records every Web Animations call, CSS animation start and CSS transition run with its `data-dc-tpl`, and matches each to an `animations.json` record; `--shift=7` is the negative control (a sound run drops to 0 matches). |
| `data/skeleton-decisions.json` | The skeleton writer's standing, client-free decisions: the column-label block, the list rule (minimum links, stacked), brief-only line patterns, Site Info text patterns (copyright, hours, address, attribution), the maps-link and logo-image patterns, and element decisions. Every block named is checked against the framework database on load. |
| `data/calibration-baseline.schema.json` | Appendix C: the JSON Schema (draft 2020-12) of `calibration-baseline.json`, validated with the route's pinned Ajv. |
| `data/reading.schema.json`, `data/construct-registry.schema.json` | Appendix C: the JSON Schemas (draft 2020-12) of a reading record (FR-48-28) and of `data/construct-registry.json` (FR-48-24); `tests/intake-schemas.test.mjs` fails when either differs from the spec. |
| `lib/intake-spec-sync.mjs` | Spec 48 Appendix C against `data/*.schema.json`: parses each labelled JSON block, the intake-record key table and the construct-kind list from the spec, and reports every disagreement with a schema file. |
| `lib/intake-sandbox.mjs` | FR-48-23 / FR-48A-10: runs a verified export in a fresh Chromium context behind a refusing trap proxy (no bypass, loopback included): the draft server's exact origin is fetched by Node and fulfilled, fonts, stock images and the three pinned runtime scripts come from the export's replay HAR, every other request (another host or another loopback port) is aborted and listed with its draft ID, and every WebSocket is closed and listed. Re-checks `MANIFEST.json` (`schema_version` "1.0", every size and hash) first. |
| `lib/intake-record.mjs` | FR-48-23: records the replay HAR without letting draft code reach the network: a closed-network discovery pass lists the recordable URLs, then Node fetches exactly those (browser User-Agent, SRI checked for the pinned scripts, `url()` references in recorded CSS followed) into `sites/<client>/build/intake/replay/<manifest hash>.har`. |
| `lib/intake-harness.mjs`, `lib/intake-harness-page.mjs` | FR-48-28 determinism harness: Playwright's paused clock at one instant (wrapped timers see the fake clock), a seeded `Math.random`, both storages cleared and seeded from the draft's own defaults, every font face `loaded` before a read; rest mode settles timeouts up to 10 s of virtual time, caps intervals at 3 ticks and frame loops at 60 frames, runs one scroll pass with 100ms at each step and holds infinite animations at phase 0; sample mode reads an animation at set times by seeking it or advancing the clock. A timer still pending at the settle limit, or an uncaught draft error, fails the run naming it. `harness-page` is the in-page init script. |
| `lib/intake-reading.mjs` | FR-48-28 / Appendix C: one reading record per stamped element (draft ID, path, computed values for the walker's properties, inline declared values, border box, harness settings), sorted and written as deterministic JSON lines, validated against `data/reading.schema.json`; `readSurface` is one whole harness run. |
| `tests/fixtures/intake-harness/Home.dc.html`, `tests/fixtures/intake-harness/MANIFEST.json`, `tests/fixtures/intake-harness/support.js` | The harness fixture export: a clock value, a random value, a stored key read at boot, a 2000ms timeout, an interval counter, a frame-loop writer, a reveal below the fold, a late font, infinite CSS and Web Animations loops and a 600ms linear fade. Not route code. |
| `lib/intake-process.mjs` | FR-48-23: the secret-free worker process: an allowlisted environment (no `NODE_OPTIONS`, no SSH agent, WordPress credential, password, token, secret or key name) and a worker guard that refuses to start with one. |
| `lib/intake-prose.mjs` | FR-48-23 / FR-48-17: lists command-like text in an export's `README.md`, `READING-DC-FILES.md` and inventory notes as review rows (mark `noted`); reads only, never runs anything. |
| `lib/intake-census.mjs`, `lib/intake-census-template.mjs`, `lib/intake-census-logic.mjs` | FR-48-24 construct census, static pass: every reachable draft cut at the runtime's own boundaries; template constructs from the runtime's stamped template (`__dcAnnotatedTemplate`, or the component loaded on its own in the sandbox when no render mounts it); logic constructs from the pinned `@babel/parser` tree, never a regex; an unrecognised `sc-*` attribute or class member is an `unknown` row that fails the census. Joins rows to the registry, runs the readers (a throw is a gap row and a failure, an empty result a failure), and keeps METHOD.md §4's regex counts as a cross-check whose disagreements are gap rows. |
| `lib/intake-census-runtime.mjs`, `lib/intake-census-trace.mjs`, `lib/intake-census-map.mjs` | FR-48-24 construct census, runtime pass: each visit rendered in the sandbox under the determinism harness at 375, 768 and 1440 (hash routes reached by setting `location.hash` and settling again). V8 precise coverage traces getters, handlers, `renderVals()` keys and code-written motion (the runtime evaluates the logic unchanged, so coverage offsets map onto the static tree); page wrappers record timers, observers and Web Animations calls with their script and position; template constructs are reached when a live element carries their stamp. A construct the trace cannot decide is `unreached: null` with a `traceGap`, never a silent verdict. |
| `lib/intake-registry.mjs` | FR-48-24: loads `data/construct-registry.json` against its schema and imports each entry's reader. |
| `lib/intake-ast.mjs` | Shared intake draft reader: the runtime's template/logic cut, a start-tag and attribute scanner for template attribute values, the pinned `@babel/parser` tree with parent links and draft-file line numbers, scope lookup, call sites, and static string evaluation (concatenation, template literals, ternaries, object lookups, parameters through their call sites). |
| `lib/intake-routing.mjs` | FR-48-26: the three routing adapters (`hash` with a `pages` getter, `state-page` with `go()`, `files` one per page) and the precedence rule (a `pages` getter, a `hashchange` listener and a `go()` that only writes `location.hash` is a hash draft, its `go()` arguments read as links; any other double match or no match fails loudly). Every link resolves to a route, is external or an in-page control, or is a gap row. Also reads an embedded `data-sgs-manifest` block. |
| `lib/intake-breakpoints.mjs` | FR-48-27: per draft, the width basis (`window` or the root element's measured width) and every threshold with its operator (a reversed comparison normalised); a width read whose basis cannot be determined, a `matchMedia` query or a threshold through an unresolved variable is a gap row. |
| `lib/intake-siteinfo.mjs`, `lib/intake-siteinfo-shape.mjs` | FR-48-32: the Site Info proposal. Candidates from links (`tel:`, `mailto:`, social and `wa.me`), the logic's data objects and hours getters, labelled template text and the print of `plugins/sgs-blocks/scripts/sync-business-info.py --draft` (run as a command, never with `--push`); each shape-checked in JS (UK phone, `is_email`, a known social host, per-day hours, UK postcode) and refused with a reason when it holds `{{ }}`, a placeholder host or `#`. Conflicting values stay separate rows. The confirmed set becomes a `provision-site-info-from-draft.py` handover file, dry-run only (never `--apply`). |
| `lib/intake-flags.mjs` | FR-48-33: placeholder (lorem, filler, `example.com`, `{{ }}` fallbacks, empty `image-slot`s, `#/` socials, the README's own placeholder lines), stock (images on a stock host) and prototype-only (storage standing in for server state, a timed fake submit, a `Math.random` reference, a thank-you with no request) flags, each a review row with its draft ID. |
| `lib/intake-run.mjs`, `lib/intake-run-worker.mjs`, `lib/intake-run-stages.mjs`, `lib/intake-run-defects.mjs`, `lib/intake-run-collapse.mjs` | `intake.mjs`'s library: the parent re-checks the manifest and the replay file, validates and writes, and runs no draft code; the worker (started through `runIsolated`, secret check first) runs the browser stages in FR-48-17's order and streams their timings; draft defects run in two passes (three visits, then the remaining candidates over every route) and become one review row per defect group; repeated skeleton rows (copies of one template element, within and across surfaces), flags and missing features collapse into one row each with every original kept inside. |
| `tests/fixtures/intake-command/export/Home.dc.html`, `tests/fixtures/intake-command/export/MANIFEST.json`, `tests/fixtures/intake-command/export/README.md`, `tests/fixtures/intake-command/export/support.js`, `tests/fixtures/intake-command/export/surfaces.json`, `tests/fixtures/intake-command/export/tokens/colors.css` | The command fixture export: a page, a drawer that opens only through its state, a placeholder, a token file and a README holding a planted command line. Not route code. |
| `lib/intake-skeletons.mjs` | §3.4 steps 1 and 2 at intake: each surface's root from `surfaces.json` (an allowed hint) checked against the census (a record with no id, an id or component the census lacks, or a census header, footer, form or dialog with no record is a gap row); each surface's inventory read inside the sandbox and harness at 375, 768 and 1440 through `readInventory`'s `page` option, then `proposeSkeleton` with the framework DB (read-only); a page surface reads its route's `<main>`. A surface whose read or proposal throws is a gap row. |
| `tests/fixtures/intake-skeletons/Home.dc.html`, `tests/fixtures/intake-skeletons/MANIFEST.json`, `tests/fixtures/intake-skeletons/support.js`, `tests/fixtures/intake-skeletons/surfaces.json` | The skeleton fixture export: a header, a footer, a page and a surfaces inventory with a root the census does not hold. Not route code. |
| `lib/intake-defects.mjs`, `lib/intake-defects-binding.mjs`, `lib/intake-defects-keys.mjs`, `lib/intake-defects-force.mjs`, `lib/intake-defects-static.mjs` | FR-48-34's closed draft-defect list. Test 1: a `style-*` rule whose compiled declaration still holds `{{ }}` or was dropped at read time (the pinned runtime compiles the attribute text raw, so every bound `style-*` value is a defect). Test 2: a census construct `unreached` at 375, 768 and 1440 even when forced (hover and focus through the DevTools protocol, the state keys its condition reads set through the runtime's own `setState`, every handler's event and every code-wired listener fired, the scroll pass, both reduced-motion preferences). Not defects: a breakpoint, `reached-when-forced`, `render-wins`, `prop-variant` (FR-48-29), `dead-code` (a provable constant guard or an unbound `renderVals` key) and `prototype-only` (inside flagged placeholder or prototype code); a construct forcing cannot reach is a gap row. Defects are grouped by the class member or script that holds them. Coverage offsets come from `lib/intake-census-map.mjs`. |
| `lib/intake-missing.mjs` | FR-48-34's missing-features list: unresolved skeleton rows, and pointer or hover behaviours whose code reads pointer position or writes motion with no matching block capability or `sgs-fx` effect; each marked with the main flow it sits in (buy, contact, apply) or none. |
| `lib/intake-state.mjs` | Shared draft-state helper: sets a mounted component's state through its React fiber and the runtime's `logic.setState`, snapshots and restores it, fires a template event as the DOM event React hears (default action prevented), and records and fires code-wired listeners. |
| `tests/fixtures/intake-defects/Home.dc.html`, `tests/fixtures/intake-defects/Card.dc.html`, `tests/fixtures/intake-defects/image-slot.js`, `tests/fixtures/intake-defects/MANIFEST.json`, `tests/fixtures/intake-defects/support.js` | The draft-defect fixture: a dropped and a literal bound hover rule, a branch open at 1024 and up only, a branch reached when its state key is forced, an impossible branch, a hover-only rule, a prop-gated branch with and without a parent mounting the prop, constant-guarded and unbound dead code, a placeholder custom element and a reduced-motion branch. Not route code. |
| `lib/intake-review.mjs` | FR-48-17: Bean's one batched review. Renders `review.md` from an intake record (one section per row type with an "Accept all" line and a Mark cell per row; carried-over changed rows first), reads it back, validates every mark against Appendix C's values per row type, applies accept-all and the flag default, and lists every row still without a mark as a blocker; carries a mark across a re-export when the row's draft ID and content hash are unchanged. |
| `lib/intake-ast-eval.mjs` | Deeper static evaluation beside `lib/intake-ast.mjs`: follows a value to its data through loop variables, spreads, getters, `this.x =` assignments, `Object.assign` and local calls, and judges simple filter conditions, so a link built as `'#/' + s.key` inside a loop resolves to each item's key. `evalStr` is unchanged. |
| `lib/intake-pagemap.mjs`, `lib/intake-pagemap-surfaces.mjs` | FR-48-30: the page-map proposal. One row per route (slug, title, parent, template, menus with positions and parent items, post type, `static` or `live` collection, `id` null) and one per CPT surface found in the code (header, footer, drawer, mega menu panels, modals, forms, choice flows), cross-checked against `surfaces.json` kinds (a surface on one side only is a gap row); an embedded `data-sgs-manifest` is the proposal when present. Every draft link maps to a row, an external link, an in-page control or a gap row. |
| `data/page-map.schema.json`, `data/intake.schema.json` | Appendix C: the page map (an array of the Appendix C row) and the intake record (every Appendix C key required, `schemaVersion` "1", the review row types; its inline page-map row is kept equal to `page-map.schema.json` by a test). |
| `tests/fixtures/intake-pagemap/hash/Site.dc.html`, `tests/fixtures/intake-pagemap/hash/Enquiry.dc.html`, `tests/fixtures/intake-pagemap/hash/surfaces.json`, `tests/fixtures/intake-pagemap/manifest/Shop.dc.html` | The page-map fixtures: a hash export with menus, a mega panel, a drawer, an imported form and a surfaces inventory; a draft with an embedded `data-sgs-manifest`. Not route code. |
| `tests/fixtures/intake-siteinfo/export/Site.dc.html`, `tests/fixtures/intake-siteinfo/export/README.md`, `tests/fixtures/intake-siteinfo/stub-provision.py` | The Site Info and flags fixture: a phone, email, address, hours getter and socials, a planted placeholder address and malformed phone, a `{{ }}` value, lorem copy, a stock image, a stored basket and a timed fake submit; a stub of the provisioning script that prints its table and exits 9 on `--apply`. Not route code. |
| `tests/fixtures/intake-routing/bp-unreadable/Panel.dc.html`, `tests/fixtures/intake-routing/files/About.dc.html`, `tests/fixtures/intake-routing/files/Card.dc.html`, `tests/fixtures/intake-routing/files/Home.dc.html`, `tests/fixtures/intake-routing/files/MANIFEST.json`, `tests/fixtures/intake-routing/hash/Site.dc.html`, `tests/fixtures/intake-routing/hybrid/Site.dc.html`, `tests/fixtures/intake-routing/hybrid-sets-page/Site.dc.html`, `tests/fixtures/intake-routing/none/Page.dc.html`, `tests/fixtures/intake-routing/state-page/Shop.dc.html` | The routing and breakpoint fixtures: one export per adapter kind, the Indus-style hybrid, a hybrid whose `go()` also sets `state.page`, a draft with no router, and an unreadable width basis. Not route code. |
| `data/construct-registry.json` | FR-48-24 / Appendix C: the 19 construct kinds, each with its reader or the reason it has none yet (the requirement and Appendix B step that builds it). |
| `tests/fixtures/intake-census/export/Home.dc.html`, `tests/fixtures/intake-census/export/Child.dc.html`, `tests/fixtures/intake-census/export/Panel.dc.html`, `tests/fixtures/intake-census/export/helper.js`, `tests/fixtures/intake-census/export/support.js`, `tests/fixtures/intake-census/export/MANIFEST.json`, `tests/fixtures/intake-census/lib/fixture-readers.mjs` | The census fixture export: every construct kind, a mounted and an unmounted import, a helmet script and a handler no render calls; and the fixture readers (`readAny`, `readThrows`, `readEmpty`) for the reader controls. Not route code. |
| `tests/fixtures/intake-census/runtime-export/Home.dc.html`, `tests/fixtures/intake-census/runtime-export/MANIFEST.json`, `tests/fixtures/intake-census/runtime-export/support.js` | The runtime-census fixture export: a called and an uncalled handler, an `sc-if` branch that opens at one width only, and a timer the static pass cannot see. Not route code. |
| `lib/tokens.mjs` | FR-48-31: parses an export's `tokens/*.css` into declared custom properties with no render (comments, strings, nested parentheses, `@import`, nested `@media`/`@supports`, element rules, CSS nesting), resolves each `var()` chain with fallbacks (a cycle or missing reference is a problem with a null value, R-48-3), types each value and normalises colours to `#RRGGBB[AA]`. |
| `lib/intake-palette.mjs` | FR-48-31 / FR-33-2 / R-47-7: the palette role proposal. Colour tokens matched to the draft's colours by exact value (alpha-aware), deduped at CIEDE2000 ΔE ≤ 1, given a slug from named name rules and usage rules (`custom-<name>` when nothing is confident, FR-33-2); unused tokens get no role; colours outside the tokens stay one-off hex; slugs read from `theme/sgs-theme/theme.json` at run time. |
| `tests/fixtures/intake-palette/export/tokens/colors.css`, `tests/fixtures/intake-palette/export/tokens/spacing.css`, `tests/fixtures/intake-palette/usage.json` | The palette fixture: a planted unused token, a `var()` cycle, a missing reference, a nested fallback, a near-identical pair, a dark-mode override, an element-rule token, and a usage list with a one-off and a translucent hex. Not route code. |
| `tests/fixtures/intake-sandbox/Home.dc.html`, `tests/fixtures/intake-sandbox/MANIFEST.json`, `tests/fixtures/intake-sandbox/README.md`, `tests/fixtures/intake-sandbox/support.js` | The sandbox fixture export: a draft loading a Google Font, a stock image, a map embed on an unlisted host and (with `?loopback=<port>`) a fetch and a WebSocket to another loopback port; a runtime copy; a README holding the planted "run `rm -rf build`" line; its manifest. Not route code. |
| `data/known-runtimes.json` | FR-48A-5: every accepted `support.js` build by SHA-256 (`{ runtimes: [ { sha256, added, source, probe, path } ] }`), `path` naming its local copy. `c60c49083997…` came from the Indus Foods export, `8fe7df74405f…` from the Eye Care and Mama's Munches exports (all 2026-10-11, probe pass). |
| `data/runtime-probe.dc.html` | FR-48A-5: the fixture draft the runtime probe renders: nesting, `sc-if` both ways, `sc-for`, camelCase attributes (`viewBox`, `tabIndex`, `onClick`), a helmet `<style>`, `style-hover`, a table and a select, so the encoder's renames are numbered. No external scripts. |
| `data/runtime-probe.expected.json` | FR-48A-5: the fixture's recorded numbering from both known builds (identical): `live`, the rendered page's `[tag, data-dc-tpl]` list in document order, and `annotated`, the same from `__dcAnnotatedTemplate`. |
| `data/runtimes/c60c49083997.support.js`, `data/runtimes/8fe7df74405f.support.js` | Byte copies of the known builds (`data/runtimes/<first 12 hex>.support.js`), so the probe can print the module difference of a new build; `--add-runtime` adds one per new build. Not route code. |
| `prompts/skeleton-finaliser.md` | The brief for the finaliser subagent that settles a skeleton's low-confidence rows from `<s>.finalise-request.json`; the session runs it, the scripts never call a model. |
| `calibration-targets.json` | The calibration page per site (`envFile`, `envKey`, `postId`), `image` (a media object on that site written into background-image markers and overlay preconditions) and `refs` (the site's object for each fixture token, see `lib/calibration-refs.mjs` below; a mirror inherits its `mirrorOf` test site's refs and may override any). |
| `fixture-refs.mjs` | The fixture-reference detector: `--survey [--json]` lists every reference-shaped value and its category, `--fix [--apply] [--home <target>]` turns literal ids into tokens by the home target's refs (default `eye-care-test`), `--check` exits 1 while a bare reference remains (lint.mjs runs the same check), `--self-test` runs its own cases. |
| `provision-calibration-refs.mjs` | `--site <test site> [--image <file>] [--logo <file>] [--dry-run]`: creates on a test site, over SSH as user Claude, what the fixture tokens need (the "CR calibration" menu with a submenu, a mega-panel item and the menu-item role fourth; a calibration mega panel and `sgs_drawer`; image and logo attachments from the given repo files, else an existing image role is kept and the logo reuses it; a product when WooCommerce is active) and writes the IDs as that target's `refs`. Finds by name or slug before creating, so a rerun creates nothing. Refuses a mirror (provision its test site, then refresh the mirror). `--dry-run` reads and prints the plan only. |
| `calibration-fixtures.json` | Minimum content, inner blocks, parent chain, optional variants, optional `preconditions` (`{ <setting>: { <attr>: <value> } }`: attributes a setting paints only under, put on that setting's instance) and optional `before` blocks (placed ahead of the instance, for a block that reads the page, such as a table of contents) per calibrated block. |
| `ledger.mjs` | Divergence ledger command: `accept <report.json> <row id>` adds an entry dated today; `stale <report.json>` exits 1 while any entry is stale. |
| `answer-sheet.mjs` | Answer-sheet scorer (route-accuracy R1): `--client <slug> --surface <s>[,<s>...] [--report f] [--triage f] [--solve f] [--sheet f] [--baseline f] [--write-baseline] [--detail]`; scores the frozen hand-labelled rows of `<build>/qa/answer-sheet.json` against each surface's walk, triage and Solve report (by default the files its baseline entry was written from, else its triage and the walk and Solve report that names; `none` leaves one out), prints the pass counts per label (false alarms per pattern) with the outcomes behind them, exits 1 when a row that passed in `<build>/qa/answer-sheet-baseline.json` fails now, and exits 2 when a file it names is missing (walks under `qa/solve/` are not in git). |
| `lib/db.mjs` | Read-only `block_attributes` queries. |
| `lib/normalise.mjs` | Value parsing and token snapping from `theme-snapshot.json`, with the snap log. |
| `lib/resolve.mjs` | The one property-to-setting engine. |
| `lib/tree.mjs` | Trees: read, write, refs, setting writes, live-site safety. |
| `lib/cache.mjs` | The calibration cache's two outputs: the library-wide slot map and each site's own default paint; reading, writing, the split of one into the other and the per-output skip rules. |
| `split-cache.mjs` | One-off, idempotent migration: moves each pre-split `cache/<block>.json`'s default paint into `cache/<site>/<block>.paint.json` and rewrites the slot map without it, then moves mirror folders' paint into their test site's folder; `--dry-run` prints what it would do. |
| `lib/calibrate.mjs` | Calibration library: calibration trees, slot detection, default paint; re-exports the calibration modules below. |
| `lib/calibrate-props.mjs` | What calibration reads: the read and pseudo-layer properties and how a css_property maps onto them. |
| `lib/calibrate-markers.mjs` | Marker values per setting shape (Spec 48 §3.2 marker table). |
| `lib/calibrate-instances.mjs` | Which instances a block's calibration page holds: markers, their preconditions (variant, gating toggle, border partners, overlay image, layout mode) and state targets. |
| `lib/calibrate-read.mjs` | The in-page reader and the per-width read under each state trigger. |
| `lib/calibrate-chunk.mjs` | How calibration builds a block's page in pieces: the child process's heap, the fixture's own chunk size, and halving a chunk whose build timed out. |
| `lib/calibration-lock.mjs` | One calibration per calibration page: a per-site lock in the machine's temp folder that `calibrate.mjs` takes before building. |
| `lib/stage0.mjs` | Stage 0 library: the fixed block set, per-block slot-map state against the deployed hash, the baseline and its validation, the orchestrator `runStage0` with injected effects. |
| `lib/calibrate-container.mjs` | What a block's source says before any browser opens: whether its tiers follow its container's width (an `@container` rule in the built CSS, or a render passing `container_queries`/`container` true), and whether its render returns early on this site. |
| `lib/calibrate-content.mjs` | The content side of calibration: which elements a setting makes appear or disappear, whose text it prints and which it makes a link — the settings that paint no CSS property, queried by framework-database `role` because `attrsFor` never returns them. |
| `lib/deploy-hash.mjs` | The deploy key: md5 of a block's front-end build files, locally and on the site. |
| `lib/calibration-refs.mjs` | Site references in calibration fixtures: the token vocabulary, resolving a fixture from a target's refs, the existence check on the site (`wp eval-file -` in a WSL mirror or over SSH) and the gate that leaves a block with an unsupplied or missing reference uncalibrated. |
| `lib/fixture-refs.mjs` | The fixture-reference detector's survey, transform and check. |
| `lib/provision-refs.mjs` | What `provision-calibration-refs.mjs` creates, its plan from a site's state, and the read and apply PHP. |
| `lib/draft.mjs` | Serves a local draft folder on 127.0.0.1 at an ephemeral port: directory index, an explicit index file, content types, Range, no path escape, clean close. |
| `lib/handoff.mjs` | Spec 48A's check: the required list, the folder walk (symlinks fail), draft and script reachability, Ajv 8 for the master schemas, the manifest builder, and `checkHandoff`, which returns every failure and warning naming the file and rule. |
| `lib/svg-screen.mjs` | FR-48A-10's SVG safety screen: parses each SVG as namespace-aware XML (saxes from the route's own pinned install) and refuses malformed XML, a DOCTYPE, elements outside the SVG namespace (editor and provenance metadata excepted), script and foreignObject by local name whatever the prefix, on* attributes, animations that rewrite a link, `href`/`src`/`data`/`action` and CSS `url()` targets other than `#…` or a raster `data:image`, `javascript:` and CSS `@import`. |
| `lib/runtime-probe.mjs` | FR-48A-5's probe (Playwright by path): renders the fixture with a build through `serveDraft`, reads both numberings, compares them with the record, splits builds into their `// src/<name>.ts` modules and records a passing build. |
| `lib/fill-skeleton.mjs` | The skeleton contract: `draftRef` and `draftSlots` are walker finders, slot finders resolve inside their node's element; node indices, targets, problems, and the clean tree. |
| `lib/skeleton-inventory.mjs` | Skeleton step 1: every `data-dc-tpl` element of a draft surface in a real browser at 1440, 375 and 768 (key, parent, tag, words, attributes, the draft's own code, loop membership, boxes, visibility, screenshots), through the page bridges `__dcAnnotatedTemplate` and `__dcRootName`. |
| `lib/skeleton-model.mjs` | Skeleton step 2, reading an inventory: the element tree, parts of another element, words, placeholders, stacked runs, the fingerprint. Pure functions. |
| `lib/skeleton-facts.mjs` | The data the skeleton writer reasons from: the framework database (read-only), the brand registry, the client's Site Info placeholder map, `data/skeleton-decisions.json` and the list block's `block.json` items; and the check that the decisions data is sound. |
| `lib/skeleton-classify.mjs` | Skeleton step 2a: which block each element becomes, as scored candidates with their evidence (the four generator rules: footer and header wrappers and rows, link runs as one list, typed brand names and logo images as the logo block, brief-only lines as remove); client decisions and finaliser picks override the scoring. |
| `lib/skeleton-propose.mjs` | Skeleton step 2b: the inventory to a Fill skeleton and the proposal rows (units of siblings that are one block, content settings, `tpl` draft links, fingerprints, handover). |
| `lib/skeleton-review.mjs` | Skeleton step 3: the review table (key, tag, words, code, screenshot, proposed block, confidence, decision). |
| `lib/skeleton-finalise.mjs` | Client decisions and finaliser picks on disk (with the element signature that makes a stale decision visible), the finalise request for the low rows and the validated merge of the picks. |
| `lib/fill-read.mjs` | Reads the draft in Chromium through the walker's `collectPair` and `resolveFinder` at 375, 768, 1440 and the fluid widths, plus the 16px sweep; blocks or mirrors requests beyond the draft's origin. |
| `lib/fill-prop.mjs` | One property of one element: which tiers differ from what the node shows, the slots a setting could paint, `clamp()` where a setting accepts one; every write is the resolver's. |
| `lib/fill-resolve.mjs` | Root-down resolution of a whole skeleton: inherited baselines, spacing ownership, presence, words, links, the divergence ledger, UNMAPPED and handover. |
| `lib/fill-spacing.mjs` | Spacing ownership per tier from rendered border-box gaps (equal within 0.5px). |
| `lib/fill-values.mjs` | Fluid fit and `clamp()`, the 16px breakpoint sweep against the SGS boundaries, and the sweep log. |
| `lib/fill-presence.mjs` | Visibility and variant settings from calibration `presence`, words from `text`, links from `link`. |
| `lib/fill-fixture.mjs` | A calibration fixture's styling preconditions as Fill sees them: a property a precondition paints in the calibrated rest (the social-icons fixture's 1px border and background switch) is compared with its unstyled value, and a written setting carries the switch the fixture turned on for it. |
| `lib/fill-row-lift.mjs` | Fill's Site Info row lift: the generated icons' shared look (link box as the row's shape element, svg as its glyph element) written once on the `sgs/social-icons` row when every copy agrees. |
| `lib/fill-unread.mjs` | What Fill leaves unjudged on a measured node: style settings whose calibrated element no finder read, presence settings with no reading or no read element, text and link settings with no reading, and layout or mode enums calibration reads no presence for; never a setting the skeleton sets or Fill wrote. |
| `lib/brand-registry.mjs` | Reads the one brand and contact registry (`plugins/sgs-blocks/includes/data/brand-registry.json`) and derives which addresses belong to which brand (scheme for phone and email, domain for socials); no platform table of its own. |
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
| `lib/identity.mjs` | Exact draft identity for pairing: structural alignment of a skeleton with a committed tree (never word pairs), the agree-or-mispaired judgement of the word matcher's element against the identity element, and the in-page relation reader. |
| `lib/trial.mjs` | Try before write, the judgement: style uids and their mapping, rule differences, the render self-check, blocks that can never be trialled (usesContext, per-request classes), a write applied to attributes, and the verdict (toward the draft, no pair further away). |
| `lib/trial-page.mjs` | Try before write, the page side: the admin session and the block renderer, the live rules of a uid, CSS parsed by the page's engine, a trial applied and undone exactly, and pair measurement and scope. |
| `lib/trial-run.mjs` | Try before write, one round: logs in to the surface's site once, then per round re-reads the post's saved attributes, reloads the live page and tries each candidate write (render twice, self-check, CSS difference applied, pairs measured at every width, undone). Shared by `solve.mjs` (between a write round and the rebuild) and the replay `trial.mjs`. |
| `lib/issue-classes.mjs` | The one definition of a distinct open issue: the visual row kinds, the Solve classes and their order, the unmapped-state class and the issue key. Imported by both `lib/sweep.mjs` and `lib/triage.mjs`, so a surface's triage count equals its sweep count by construction rather than by two copies agreeing. |
| `lib/sweep.mjs` | Sweep library: the newest report per surface, issue rows per report (`wholePage`'s definition) and the site aggregate with shared rows counted once. |
| `lib/register-sweep.mjs` | Register sweep library: register tables as items, the eight A4 groups, section to surface mapping, verdict checking against the sweep and the pairings, the Sweep column writer and the per-group bundle. |
| `lib/triage.mjs` | Triage library: issues by `wholePage`'s key (the Solve classes, then the unmapped-state rows of `other`, in the sweep's order so the counts agree), the mechanical checks (fitting attributes including NULL css_property rows and discovered enums, roster extensions, enclosing calibration, consequence, transient, used value), the read-only resolver pass and the verdict order. |
| `lib/triage-source.mjs` | Triage's source pass (string search): a block's `render.php` mentions, its `style.css` rules for the element, and the PHP helpers its `render.php` reaches two hops deep (`sgs_*` functions, classes, required `includes/` files) that read the row's setting or emit the property, cited as `file::symbol`. |
| `lib/guard.mjs` | The regression guard: reverts a write calibration names, else tries one suspect at a time and lets the next walk decide. |
| `lib/ledger.mjs` | Ledger library: rules, matching, stale entries, accept migration, entries from report rows. |
| `lib/answer-sheet.mjs` | Answer-sheet library: row match keys (no pair name), walk and triage outcomes, wrong-write groups, per-surface scores and the baseline ratchet. |
| `tests/db.test.mjs` | R-47-2: read-only database. |
| `tests/normalise.test.mjs` | R-47-7: tokens before literals. |
| `tests/resolve.test.mjs` | FR-47-1: storage shapes and gaps; border-radius written as corners, never sides. |
| `tests/tree.test.mjs` | R-47-11 and tree writes. |
| `tests/cache.test.mjs` | FR-48-2 / §3.2: a run on one site leaves another site's default paint byte-identical, a slot map from another site is kept without `--recalibrate`, a stale `paintKey` is reported, a reader never returns another site's paint (MUST FAIL), and the split migration is idempotent. |
| `tests/stage0.test.mjs` | FR-48-3 / FR-48-16: the baseline validates and a planted invalid one is refused, a block whose deploy hash differs from its cache after the run is not calibrated (MUST FAIL), stage 0 writes no default paint (MUST FAIL), a failed handoff check stops it (MUST FAIL), `--plan` touches nothing, a block whose fixture reference the target does not supply or the site does not hold is `needs-refs` and no run starts (MUST FAIL, two cases). |
| `tests/calibration-refs.test.mjs` | §3.2 portable fixtures: tokens resolve in every shape and a mirror inherits its test site's refs; an unsupplied token leaves the block unbuilt and reported (MUST FAIL); a reference the site reports missing, or a site that cannot be asked, blocks the block (MUST FAIL); Eye Care's refs give back the literal ids the fixtures carried; the fixtures pass the detector's check and its self-test. |
| `tests/provision-refs.test.mjs` | Appendix A step 13: the provisioning plan from fake site states (empty, provisioned, partial), idempotence, unsupplied roles, the refs written from the site's reply, the argument rules. |
| `tests/calibrate.test.mjs` | FR-47-2: setting states calibrate only through a known trigger; the deploy key ignores webpack module numbering but not code; a run never replaces another site's cache file without `--recalibrate`; a border-style marker carries its companion width and maps against a width baseline (CR11). |
| `tests/calibrate-classes.test.mjs` | FR-47-2: each dead or markerless class of the 2026-10-04 audit gets its marker, precondition or read (extension rows from the DB, gradients, keywords, media objects, transforms, wider lengths, non-length tiers, colour by role, box shapes, two weights, unit shapes, the silent drop, preconditions, layout modes, state targets, container-query tiers). |
| `tests/calibrate-read.test.mjs` | FR-47-2 reader, in a local headless Chromium: elements past the 81st, `::after` and `::placeholder` layers, and an `aria-controls` panel outside the instance are read. |
| `tests/ledger.test.mjs` | FR-47-5: validation, stale entries, migration, accept; the independent check matches entries on `node` and leaves a drifted value entry open (A5). |
| `tests/answer-sheet.test.mjs` | Route-accuracy R1: the frozen 100 rows; matching ignores the pair name; artefact labels drop a false alarm and `consequence` never drops a real problem; wrong-write groups; a real problem kept in the baseline and missing now is a regression (MUST FAIL) and an unchanged walk is not. |
| `tests/walker-mispaired.test.mjs` | Route-accuracy R4: a block in `qa/pairs/<surface>.json::mispaired` keeps its rows, each flagged (MUST FAIL); `writableGroups` never groups a flagged row and does group it unflagged (MUST FAIL TO WRITE); triage labels it W / mispaired from the identity check without the resolver. |
| `tests/walker-neutralise.test.mjs` | Route-accuracy R5, GAP-CHECKLIST 8: the paint check in headless Chromium: a 48px gap against 16px between three children is not inert (MUST FAIL, the `ba31e5157` rule accepted it); a one-child link's gap is, under a transition too, and the element is restored exactly; text-align moves short text in a wide box and nothing in a box it fills; only differing tested properties are candidates. |
| `tests/walker-decoration.test.mjs` | An underline row is stamped with the path of the element painting the underline (`decoPath`, MUST FAIL: the footer link's underline read as the block root's); colour keeps the text path, padding the element path; no decorated element keeps the element path. |
| `tests/identity.test.mjs` | Route-accuracy R4: the committed footer aligns with its skeleton by structure and a different block or a non-tpl finder is listed, never guessed; a word element of another box disagrees with the identity element (MUST FAIL, the 2026-10-09 header root against the draft's inner row); the same element or a same-box wrapper agrees. |
| `tests/trial.test.mjs` | Route-accuracy R6: the home cards' 291 -> 247px write is rejected (MUST FAIL), the reverse kept; a write helping one pair and hurting another is rejected; uid mapping, rule diff and the self-check; usesContext and per-request blocks are never trialled; the replay tries each setting's last write in the round. |
| `tests/references.test.mjs` | Reference blocks: the detector, the linked-placeholder rule in Solve, the surfaces lint. |
| `tests/lint.test.mjs` | R-47-1 and R-47-10 through the lint; B4: a ledger entry citing an item the register lacks, or none, fails; a house-rule entry needs none; a ledger with entries and no register fails; without `--register` the register comes from `qa/ledger.config.json`, and a named register that does not exist fails. |
| `tests/solve-held.test.mjs` | A setting already holding the draft value is held, not written (a value another group wrote earlier in the same round is a write, not a hold, with a negative control), and its row is a Hardcode that names what the tree holds and the widths that differ; the winning-rule ranking, with negative controls. |
| `tests/solve-groups.test.mjs` | The issue and cause views: every width with its own values, no row lost, elements joined by cause and each kept with its widths. |
| `tests/solve.test.mjs` | R-47-9: the guard reverts only the write calibration names, or proves a suspect by the next walk and restores an innocent one; walker state mapping (an unmapped state is never written); `--rounds 0` never calls the write round (A1); try before write (R6 step 3): a rejected card padding goes back to its round-start value and blocks every group that wrote it (MUST FAIL), every other verdict leaves the tree alone, and an async write step is counted |
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
| `tests/calibrate-forms.test.mjs` | Spec 48 FR-48-2: a per-device font size gets `clamp` and `vw` probes in its desktop tier and a flat length string takes them whole, each expecting the formula at 375, 768 and 1440; a grid template gets a `repeat(3, 1fr)` probe and a `grid-template-columns:count` setting is read and gets a `count` marker; a reading on the formula records `clamp` within 0.5px, while a stripped `clamp()` (default kept, a fallback value, or one width only) records none and never makes the setting dead; a count records `count` where every changed width matches. |
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
| `tests/walker-inert-layout.test.mjs` | The walker's one shared paints-nothing acceptance (`scripts/parity/lib/compare.mjs::INERT_LAYOUT`): a tested layout row is accepted only when the live walk proved it inert for that pair, state and width; a matching box alone accepts nothing (MUST FAIL, `ba31e5157`); a property outside the list never is; a config accept decides first; DETECTOR: no client walker config repeats the shared rule. |
| `tests/walker-sr-only.test.mjs` | Visually hidden text (a clipped screen-reader link name, the Eye Care footer icons' shape) is not a text carrier, not in a root inventory or a media name, and not in a pair's text unless the pair paints no words (MUST FAIL on each; negative controls: the same name shown, and a 1px box with visible overflow). |
| `tests/walker-box-held.test.mjs` | `compare.mjs::acceptHeld`: padding, margin, border widths and flex-grow are accepted when the pair and every pair inside it keep their box and text position (MUST FAIL, the lens outer-versus-inner padding); never when text moves in a same-size box, a pair inside moves, or the pair itself moves; transition timing is never box-held. |
| `tests/site-switch.test.mjs` | `--site`: `retargetLive` moves every live URL of a config to a mirror's origin and nothing else (MUST FAIL); `solve.mjs::siteOverride` builds with the mirror's credentials, skips the remote host check and hands the walker its origin (MUST FAIL); no site changes nothing; an unknown site is refused. |
| `tests/wp-session.test.mjs` | `scripts/lib/wp-session.js` in headless Chromium: a child attached to the shared browser and the owner both survive a page dialog; a confirm is dismissed and a beforeunload left, as Playwright's default does (MUST FAIL: the two auto-dismissals raced and one crashed with "No dialog is showing"; dismissing a beforeunload aborted the editor navigation). |
| `tests/draft-serve.test.mjs` | FR-47-4 draft server: no path escape or symlink escape (MUST FAIL), ephemeral port, directory index, content types, Range, and close frees the port. |
| `tests/handoff-check.test.mjs` | Spec 48A on synthetic folders: a missing required file, an extra file, an unreachable draft, the manifest both ways, a wrong hash, a wrong `runtime_sha256`, an unknown runtime, a stale inventory and an unsafe SVG each fail (MUST FAIL); one file per page linked by href and a `dc-import` name with a space pass; a block-mapping README heading and a differing schema copy are warnings. |
| `tests/handoff-repackage.test.mjs` | An unchanged old-format export repackages and passes the handoff check; a dry run writes nothing; a draft changed after export, a changed `support.js`, a `MANIFEST.md` with no hash table, a missing `MANIFEST.md` and a current-format export are refused with the folder untouched (MUST FAIL). |
| `tests/intake-schemas.test.mjs` | Appendix C: the calibration-baseline, reading and construct-registry schema files equal the spec's blocks, and the page-map and intake schemas once they exist; the spec lists 19 construct kinds; a changed schema type, a key added to the spec's Reading block, a registry entry holding both a reader and a gap, a drifted page map and a missing intake key each fail (MUST FAIL). |
| `tests/intake-sandbox.test.mjs` | FR-48-23 in headless Chromium on the fixture export (MUST FAIL each): a replay run makes no request outside the allowlist, a fetch to another loopback port and a WebSocket are blocked and listed; a second run replays fonts, images and pinned scripts from the HAR with no proxy attempt and its font `loaded`; the map embed is aborted and listed with its draft ID; a worker started by `runIsolated` holds no secret variable and the guard throws on one; a `schema_version` other than "1.0" and one changed byte stop the re-check. |
| `tests/intake-harness.test.mjs` | FR-48-28 on the fixture export in headless Chromium: two runs give byte-identical JSON lines in rest and in sample mode; switching off any one item (clock, random, storage, timeouts, intervals, frame loops, scroll pass, font wait, animation hold) makes the fixture differ or never settle (MUST FAIL, each also proven by removing the real mechanism); the 600ms fade reads 0, 0.5 and 1; every record validates and one without `harness` is refused. |
| `tests/intake-prose.test.mjs` | FR-48-23: the planted "run `rm -rf build`" README line is listed and not executed (MUST FAIL); notes in the inventories are located by JSON path; ordinary prose and code spans naming functions are not listed. |
| `tests/intake-census.test.mjs` | FR-48-24's four controls on the fixture export, each MUST FAIL with its guard removed: a deleted registry entry names the unread kind; an invented `sc-zzz` attribute and a computed-key getter are named unknown constructs; a throwing reader leaves a gap row and fails; an empty reader fails. The unchanged fixture with a full reader registry passes, and so does the committed all-gap registry. |
| `tests/intake-census-runtime.test.mjs` | FR-48-24 control 5 and the runtime pass, each MUST FAIL with its mechanism removed: a handler no render calls is listed and `unreached` at every width; without the static pass it is not listed at all; a called handler is `both`; an `sc-if` open at one width only is reached; a timer only the runtime sees becomes a `runtime` row. |
| `tests/intake-routing.test.mjs` | FR-48-26: each adapter accepts its own fixture and refuses the other two kinds'; the hybrid resolves to `hash`; a `go()` that also sets `state.page` fails loudly; no router fails loudly; an unresolved link is a gap row (MUST FAIL each with its rule removed); the real exports resolve to `hash` (Indus, 23 routes), `files` (Mama's, 11) and `state-page` (Eye Care, 11). |
| `tests/intake-breakpoints.test.mjs` | FR-48-27: the window basis, the root basis (ResizeObserver `contentRect` on the root ref), a reversed comparison, and an unreadable basis and a non-static threshold as gap rows (MUST FAIL each); Indus's 768, 1024, 1200 and 1260 on the window basis. |
| `tests/intake-siteinfo.test.mjs` | FR-48-32: Indus proposes its phone, email and WhatsApp link and refuses its `#/` socials; a planted placeholder address and a malformed phone are refused with reasons; each shape rule, the conflict rows, the handover key filter and the no-`--apply` guard MUST FAIL when removed; the confirmed set reaches the (stubbed) dry-run table. |
| `tests/intake-flags.test.mjs` | FR-48-33: each placeholder, stock and prototype-only rule MUST FAIL when removed; a form label "Your name", animation jitter from `Math.random` and a submit that calls `fetch` are not flagged. |
| `tests/intake-skeletons.test.mjs` | §3.4 at intake, each MUST FAIL with its mechanism removed: the inventory runs inside the sandbox (the harness clock shows in the read, no proxy attempt, no unlisted host); a root the census does not hold is a gap row; a throwing proposal is a gap row and the surface keeps its entry; a page surface reads its route's `<main>`. |
| `tests/intake-command.test.mjs` | FR-48-17 end to end on a fixture client in a temporary repo: a full run writes a schema-valid `intake.json`, `review.md` and `page-map.json`; `--apply-review` with an unmarked non-flag row fails naming it and writes nothing (MUST FAIL), with marks it dates them and applies `drop` and `edit:`, and an off-list mark is refused; a re-run after a text change carries unchanged marks and lists the changed row first; manifest version "2.0" stops before any browser starts; a missing replay file asks for `--record`; the planted README command is a notice and is not run; a state-driven drawer opens for its inventory (MUST FAIL without the opener); collapsing and defect groups. |
| `tests/intake-defects.test.mjs` | FR-48-34, each MUST FAIL with its mechanism removed: dropped and literal bound hover rules are defects; a branch open at some widths is a breakpoint; forced hover, forced state keys, fired events and reduced motion each turn a would-be defect into `reached-when-forced`; an impossible branch is a defect; prop-gated code is `prop-variant` unless a parent mounts the prop; constant-guarded and unbound code is `dead-code`; code inside a flagged placeholder element is `prototype-only`; a construct forcing cannot reach is a gap row; defects group by class member. |
| `tests/intake-missing.test.mjs` | FR-48-34: an unresolved skeleton row becomes a missing feature; a form submit is on the contact flow; removed and absorbed rows, click handlers and hover without motion are not listed; a behaviour a block capability or `sgs-fx` effect holds is held, not missing; registry gaps are instrument debt (MUST FAIL each). |
| `tests/intake-state.test.mjs` | The state helper on the defect fixture: setting state on an unmounted component returns 0, firing on nothing rendered returns false, and listeners are recorded only with the init script (MUST FAIL each); snapshot and restore put every changed key back. |
| `tests/intake-review.test.mjs` | FR-48-17, each MUST FAIL with its mechanism removed: render and parse round-trip; accept-all sets the first value and a row's own mark overrides it; an unmarked flag is `accept-flagged`; an unmarked non-flag row is listed and fails; an off-list mark and an unknown row are refused, naming them; carry-over keeps a mark on an unchanged hash and returns a changed row unmarked and first; `markedOn` dates; two renders are byte-identical; the record with notices and changed rows validates and one without `notices` is refused. |
| `tests/intake-pagemap.test.mjs` | FR-48-30: every route and CPT surface has one row (a dropped or doubled route MUST FAIL); every link resolves to a row or a gap row (an unresolvable link and a missing gap row MUST FAIL); a bad slug, a missing `id`, a duplicate slug and a dangling parent are refused; a surface on only one side of the `surfaces.json` cross-check is a gap row; Indus resolves every link (23 pages, 6 posts, header, footer, drawer, 4 mega panels, 4 forms); Eye Care's rows come from its embedded manifest; an intake record without `review` or with an unknown review row type is refused. |
| `tests/tokens.test.mjs` | FR-48-31: Indus's three token files give 34/27/13 tokens, all resolved; `--text-heading` resolves to `#2C3E50`, `--text-link` to the brand blue; string and comment handling, cycle and missing reference as problems, fallbacks and resolution each MUST FAIL with their code removed. |
| `tests/intake-palette.test.mjs` | FR-48-31: every used token gets a role, the planted unused token is unused and unproposed, a colour outside the tokens stays a one-off, a ΔE merge is recorded, alpha never merges, a missing slug gets a stand-in with `wantedSlug` (MUST FAIL each); one test per name and usage rule; CIEDE2000 against Sharma's test pairs. |
| `tests/fill-skeleton.test.mjs` | FR-47-4: the finder vocabulary, slot scoping, node numbering, skeleton problems and the clean tree. |
| `tests/skeleton-propose.test.mjs` | Spec 48 §3.4: the four generator rules over the committed footer inventory plus a fixture slice for the typed wordmark and the coming-soon line; no style value in a skeleton; client decisions and stale signatures; the 13 uncertain rows scored against the committed footer tree (at least 12 must match: MUST FAIL). |
| `tests/walker-tpl-finder.test.mjs` | R-47-4: a bare `[data-dc-tpl]` selector picks the wrong copy or nested element and the `tpl` finder picks the right one (MUST FAIL); `tplKeyOf` and the finder are inverses. |
| `tests/check-refs.test.mjs` | `check-refs` verdicts: missing, ambiguous and outside targets are refused (MUST FAIL); `skeletonTargets` lists generated icons. |
| `tests/fill-read.test.mjs` | FR-47-4: a local draft read in headless Chromium — widths, the carrier rule, scoping, the declared width, fluid samples and the sweep. |
| `tests/fill-mirror.test.mjs` | FR-47-4: a script on another origin is blocked, answered from a `--mirror`, and the flag parses. |
| `tests/fill-prop.test.mjs` | FR-47-4: tier carry, canonical values, not-painted leftovers, and that every write is the resolver's. |
| `tests/fill-spacing.test.mjs` | FR-47-4 step 3: one unequal gap hands every gap to the children and writes the parent gap as 0 (MUST FAIL); equal, single, zero, both axes, tolerance, hidden and out-of-flow children. |
| `tests/fill-values.test.mjs` | FR-47-4: a stepped value is never fluid and a step at 800px is logged against 768 (MUST FAIL); clamp shapes and the sweep log. |
| `tests/fill-presence.test.mjs` | FR-47-4: a draft showing the badge flips its visibility setting on and a draft without it leaves the default (MUST FAIL); variant, words and links, against fixture calibration keys. |
| `tests/fill-page.test.mjs` | FR-47-4: the theme baseline for the inherited properties calibration does not record. |
| `tests/fill-entrance.test.mjs` | FR-47-4: entrance timing and distance, a loop is not an entrance (MUST FAIL), and the resolver writes. |
| `tests/fill-site-info.test.mjs` | A link setting bound to Site Info keeps the draft address as its fallback and yields one `site-info` handover entry (MUST FAIL without it); an unbound node, a bound node with no draft link and a non-Site-Info binding yield none. |
| `tests/fill-site-rows.test.mjs` | A `sgs/social-icons` skeleton node with `siteInfoRow` expands to the Site Info-bound icons the committed Eye Care footer and drawer trees hold; the Fill-only keys are stripped; an unknown slug is a skeleton problem. |
| `tests/fill-handover.test.mjs` | FR-47-4/§3.3: the five owners, four kinds, and an entry with no evidence is refused. |
| `tests/fill-config.test.mjs` | FR-47-4 step 4: a pair for every node with a `draftRef` and none without (MUST FAIL); the generated config passes the walker's own lint. |
| `tests/fill-resolve.test.mjs` | FR-47-4: whole-tree resolution with fixture reads and calibration over the real database. |
| `tests/fill-unread.test.mjs` | FR-47-4 step 5: the 2026-10-09 footer's five dropped `sgs/business-info` settings (`addressLink`, `hoursLayout`, `showIcon`, `hoursRowJustify`, `labelColour`) are each listed with a reason on a draftRef-only node (MUST FAIL); a setting the skeleton sets, a slot it names or a setting Fill wrote is never listed; content settings come from the database roles. |
| `tests/fill-row-lift.test.mjs` | The Site Info row lift: the footer's social links write the row's `childIcon*` once when every copy agrees, the generated icons carry none of those values, and the 40px link box never becomes an 18px glyph's `iconSize`. |
| `tests/fill-fixture-preconditions.test.mjs` | The footer social row keeps the 1px solid border and the background switch the social-icons fixture paints in calibration (MUST FAIL); a draft with no border writes no border settings; the fixture's preconditions are its styling settings only, and a words-and-level fixture has none. |
| `tests/calibrate-size-box.test.mjs` | A per-device `{ width, height }` size setting gets a marker of that shape and Fill writes it in that shape; a setting's slots drop an element that changed in a variant without carrying the marker value (`sgs/icon`'s hugging root). |
| `tests/fill-surface.test.mjs` | FR-47-4 step 5: `fillSurface` end to end over a local folder and a temp repo; an invalid skeleton is refused and only `--out` is written (MUST FAIL). |

`cache/` (gitignored) holds the calibration: one slot map per block for the whole library (`cache/<block>.json`, recording the `site` that measured it) and one default paint per site and block (`cache/<site>/<block>.paint.json`).

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

- `snapFontFamily(value, snapshot, { log, where, prefer })` → the font-family preset slug whose first family matches a measured font stack (`prefer`, the slug the node already holds, first), or null (the stack is written as measured).
### `lib/resolve.mjs` (reads block.json files)

- `timeToMs(value)` → a CSS time as whole milliseconds (`0.25s` → `250`, `1s` → `1000`), else null. `formatValue` uses it so the route never hands a duration setting a decimal or a unit suffix: `sgs_transition_vars` would refuse it and silently apply the default, and before that helper was fixed it stripped it to a tenth of the value asked for.
- `BLOCKS_DIR`: the block sources folder.
- `GAPS`: gap reasons (`no-setting`, `ambiguous`, `shape`, `uncalibrated`).
- `blockSchema(slug)` → the block's `block.json` attributes.
- `splitProperty(prop)` → `{ short, side }` (a walker longhand as the database shorthand and box side).
- `tiersOf(perWidth, prop)` → `{ tiers, confirm }` (375 mobile, 768 tablet, 1440 desktop; Spec 48 FR-48-74). 1920 is never a source: `confirm` is `{ at1440, at1920 }` when the 1920 reading differs from 1440, else null.
- `fluidForm(declared)` → the calibration form a declared value takes (`clamp`, `min`, `max`, `vw`) or null.
- `resolveDiscovered(input, calibration)` → a write for a setting calibration found (an enum value whose effects match the draft; ties broken by the element's other properties), a gap, or null. Slots compare under the same `LOOSE()` rule, taking `anyIndex` from the input, and a row's `state` must equal the state discovery recorded.
- `CORNERS`, `radiusCorners(raw)` → a border-radius box's corner keys (`helpers-box.php::sgs_border_radius_tiers` reads only these), and the computed shorthand as corners (null when elliptical); border-radius writes are corner objects, per device when the default is a tier object.
- Box seeding: a border width (an unset width must be 0) written into an empty box brings its other sides at the calibrated default paint; a padding or margin box prints only its set sides, so one side is written alone.
- `resolve(input, ctx)` → `{ writes: [{ attr, value, merge }], fluid?, instrumentDebt? }` or `{ gap, detail }`. `input.declared` (optional) is the value the draft's code declares for the property, a string or `{ width: value }` read at 1440; no caller passes it yet. A declared fluid value whose form the setting's calibration `forms` lists is written whole into the desktop tier (`fluid: { declared, form, accepted: true }`); an unlisted form is written per tier from 375, 768 and 1440 (`accepted: false`) with an `instrumentDebt`. A 1440/1920 difference never gives a `shape` gap: with no declared fluid form, desktop is the 1440 value and the result carries `instrumentDebt: { class: 'I-calibration', property, at1440, at1920, detail }` (R-48-4). `solve.mjs::writeRound` copies `instrumentDebt` onto each write record the result produced, so it reaches `solve-report.json`.
- `LOOSE(path)` → a path with its `:nth-of-type` steps dropped: the rule every cross-tree path comparison uses.
- `blockContext(slug)` → `{ provides: { "<context key>": "<attribute>" }, uses: [ "<context key>" ] }` from the block's `block.json`: the channel by which a child receives an ancestor's attribute at render (32 provide keys over 5 blocks, 34 uses over 8; `sgs/accordion` holds 25).
- `reachedDescendants(attr, ancestor, measuredSlots)` → the measured descendants one ancestor setting's paint reaches. The match is loose, but the count is of the paths **as measured**, so two repetitions sharing a loose path stay two descendants and a parent attribute is not written over both.
- `resolveViaAncestor(input, ctx)` → FR-47-8 / R-47-12's canvas hop, invoked only after the caller's `owners` retry has exhausted, so the order is direct match → calibration `reaches` tie → the caller's hop → this one, and deleting the one call restores the previous behaviour exactly. Candidates are taken in the row's own state, so a resting setting is never cited for an open or hover row. Returns `{ writes, on, via, cite }` where a prover holds (the ancestor's calibration covers the element, or a `providesContext`/`usesContext` pair carries the attribute) **and** its paint reaches exactly one measured descendant (R-47-5); `{ gap: 'canvas-settable', detail, cite }` on a canvas otherwise; `{ cite }` off a canvas, leaving the row's class untouched, because an ordinary page's blocks are the route's own output and a missing setting there is a real gap; and null when nothing in the chain declares the property in that state.
- `isSizeBox(def)` → true for a per-device `{ width, height }` size setting's schema entry (its block.json description reads `{desktop:{width,height},…}`; `icon/render.php` reads `shapeSize[tier]['width']` and ignores a plain length), so its marker and write take that shape.
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

### `lib/answer-sheet.mjs`
- `ARTEFACT_LABELS`: triage `decidedBy` labels meaning a measuring artefact (`mispaired`, `unmeasured-side`, `same-element`, `ledger-consequence`); `consequence` is not one, because real problems carry it.
- `matchKey(row)` → `state|width|element|path|kind|property`, the element being the ref, else `pair:<pair>` for a block-less row.
- `reportRows(report)` → every diff of a walk report with its run's state and width and its pair name.
- `writtenGroups(solve)` → the setting groups a Solve run wrote, kept (`writes`) or reverted (`wrong`).
- `outcomeOf(sheetRow, { report, triage, solve })` → `open`, `accepted`, `absent` (its block measured there), `unmeasured` (not measured there: scores nothing for a false alarm, fails a real problem) or `artefact` (flagged mispaired by the walker, or a triage artefact label) for a false alarm or real problem; `written` or `avoided` for a wrong write; `not-scored` without the input.
- `passes(label, outcome)` → a false alarm passes when not open, a real problem when open, a wrong write when avoided; null when not scored.
- `scoreSurface(sheet, surface, run)` → `{ surface, rows, tally }`: per-row outcomes and per-label counts with their outcomes.
- `baselineOf(score)` → `{ pass }`, the ids that pass.
- `regressions(score, baseline)` → rows that passed in the baseline and fail now.

### `answer-sheet.mjs`
- (no exports) CLI only.

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
- `PAINT_FIELDS`: the calibration fields that are default paint (`elements`); every other field is slot map.
- `slotMapFile(dir, block)`, `paintFile(dir, site, block)` → the two file paths; `paintFile` throws on a missing or path-like site name.
- `cachedSite(file)` → the site a slot map was measured on, or null. `readSlotMap(dir, block)` → the slot map or null. `readPaint(dir, site, block)` → that site's paint or null (a file naming another site is null).
- `splitCalibration(file)` → `{ slotMap, paint }` from one combined calibration object. `writeSlotMap(dir, block, slotMap)`, `writePaint(dir, site, block, paint)`.
- `paintSite(site)` → the site whose paint folder `site` uses: the test site a mirror copies (`mirrorOf` in `calibration-targets.json`), else the site itself.
- `loadCalibration(dir, block, site)` → the slot map with the site's paint merged in as `elements`, or null without a slot map; a site with no paint gets `elements: {}` and `paintMissing`, never another site's paint.
- `slotMapSkip(dir, block, site, slotKey, recalibrate?)` → why the slot map must be left alone (another site measured it, or its key is current), or null.
- `dueOutputs(slotWhy, paintWhy, slotMapOnly?)` → `{ slotMap, paint }`: which outputs a run writes; `slotMapOnly` (`calibrate.mjs --slot-map-only`, stage 0) never makes the paint due.
- `paintSkip(dir, block, site, paintKey, recalibrate?)` → why the site's paint is kept (its own file carries the current key), or null. `paintStale(dir, block, site, paintKey)` → true when the site's paint exists with a different key.
- `slotMapLosses(prev, next, allowed?)` → the sorted settings (and `discovered:<attr>` keys) the existing slot map reaches that a new one drops, minus `allowed`; none without an existing map. `lossDestination(name, next)` → where a lost setting went in the new map: `dead`, `oneWidth`, `noMarker`, `rejected`, `untestedStates` or `absent`.
- `slotMapWriteDecision(prev, next, allowed?)` → `{ write, lost: [ { setting, wentTo } ] }`: a slot map is shared by every client, so `calibrate.mjs` refuses one that drops a reached setting unless `--allow-loss` names it. `parseAllowLoss(list)` → `{ 'sgs/a': [ names ] }` from `sgs/a:setting,…` (split on the first colon). `refusedFile(dir, block)` → `cache/<block>.refused.json`, where a refused candidate is kept with `refusedBecause.lost`.

### `split-cache.mjs`
- `splitCache(dir, { dryRun, log })` → `{ split, unchanged, problems }`: splits every combined cache file in `dir`; a file already split is left alone.
- `placeMirrorPaint(dir, { dryRun, log })` → `{ moved, dropped }`: moves paint files out of a mirror's folder into its test site's, keeping the newer `measured`.

### `lib/calibrate-props.mjs` (imports `scripts/parity/lib/collect.mjs` and `ref-trace.mjs`)
- `WIDTHS`: 375, 768, 1440. `MARKER_HEX`, `MARKER_RGB`: the colour marker. `MARKER_GRADIENT`: the gradient marker. `CAL_PREFIX`: `cr-ref-cal-`.
- `READ_PROPS`: the properties read per element: the walker's plus `CAL_EXTRA_PROPS` (height, stroke, fill, grid rows, writing-mode and others a setting can paint before the walker compares them). `INHERITED`: never recorded as default paint.
- `PSEUDO_PROPS` (the walker's list); `CAL_EXTRA_PSEUDO_PROPS` (`background-size`, `background-attachment`, `background-position`: the container wrapper's `.uid::before` media layer paints them and the walker does not compare them); `CAL_PSEUDO_PROPS` (both), read on painting `::before`/`::after` layers; `TEXT_PSEUDO_PROPS` on `::placeholder` and `::first-letter`.
- `longhands(cssProperty)` → the read properties a setting covers; a gradient text or border, a shadow colour and `flex`/`inset` map onto the properties the browser computes them under; a modifier row (`grid-template-columns:count`) is read under the property it modifies (`lib/db.mjs::modifierOf`).
- `MARKER_REST_GRADIENT`: the resting gradient a hover border-gradient marker needs before it paints (`helpers-tokens.php::sgs_border_gradient_css` returns nothing for an empty resting paint).

### `lib/calibrate-markers.mjs`
- `markersFor(row, schema, snapshot, current, ctx)` → `[{ label, attrs, expect, form?, base?, box? }]` (§3.2 table): colours by property or DB `role`, gradients, media objects (`ctx.image`), keywords for free-text settings (`KEYWORDS`), enums, booleans, boxes and corners (per device, `flat_sibling`), per-device lengths and non-length values (counts, keywords), two font weights in the setting's type, opacity, the transform family, letter-spacing, lengths, counts. A unit companion is written in its own shape. A per-device grid count (a `grid-template-columns` or `grid-template-columns:count` setting) carries `form: 'count'` and `tracks` (the count per width). A setting with a plain marker also gets its `formMarkers`.
- `formMarkers(row, schema)` → the value-form probes (Spec 48 FR-48-2), each `{ label, form, probe: true, attrs, expect | tracks, tolerance? }`: `clamp` and `vw` for a length the route may write fluid (`fill-values.mjs::LENGTH_PROPS`) whose value can be a string, in a tier object's desktop tier only (the shape `fill-values.mjs::applyClamp` writes) or a flat string whole, expecting the formula's px at each width within `FLUID_TOL`; `repeat` for a per-device `grid-template-columns` setting, the template in every tier, expecting three tracks. A number, a box and a `flat_sibling` tablet or mobile attribute get no fluid probe.
- `FLUID_MARKERS`: `clamp` = `clamp(13px, 9px + 3vw, 71px)` (20.25px, 32.04px, 52.2px at 375, 768, 1440) and `vw` = `4vw` (15px, 30.72px, 57.6px), each `{ value, at(width) }`; a minimum size floored at 44px takes `clamp(113px, 109px + 3vw, 171px)` and `12vw`. `MARKER_REPEAT` (`repeat(3, 1fr)`), `MARKER_REPEAT_TRACKS` (3).
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
- `instanceCtx(variant, image, fixture)` → the one planning context for a block's style and content instances: variant data, the site's media object and the fixture's `preconditions` (`settingPreconditions`).

### `lib/calibrate-read.mjs` (imports `ref-trace.mjs`; Playwright pages)
- Keys: an element's `elementPath` from the instance root; a layer is its element's key plus `::before`, `::after`, `::placeholder` or `::first-letter`; a panel the instance controls through `aria-controls` outside it (a cart dialog moved to `<body>`) is `@controls > <path>` (`@controls:2` for a second).
- `readInstancesInPage([count, prefix, props, pathSrc, pseudoProps, textPseudoProps, only?])`: in-page; every element, layer and controlled panel of each instance (or only instance `only`).
- `markTargetInPage([prefix, n, selector])`: in-page; marks the state target and its closed panel toggle.
- `openToggle(page)`: clicks the marked panel toggle; one hidden at the read width is clicked in the page (`el.click()`), so its handler runs.
- `readAll(page, url, instances)` → per width reads, plus `scrolled`, `scrollMissed`, `hoverMissed` (state instances whose element stays hidden at every width with its panel opened; an element that shows at one width only, such as the detached burger chip, is read there). `SCROLL_Y`: the scroll for scrolled markers (read twice when the header misses the first jump).

### `lib/calibrate.mjs`

Re-exports `MARKER_DURATION_MS` and `MARKER_EASING` from `lib/calibrate-markers.mjs`, and compares a transition row's TIMING through `timingSet`, imported from `scripts/parity/lib/compare.mjs` rather than redeclared, so the walker's notion of a timing value and calibration's cannot drift.
- `buildTree(block, fixture, instances)` → the calibration tree.
- `slotFor(row, marker, defReads, markReads, { containerQuery })` → `{ slot, slots, property, transform, reachedAt, oneWidth, containerTier?, formAccepted?, effects }` or `{ dead }`; a marker with `tracks` hits on the computed track count, one with `tolerance` within that many px of `expect`; with `containerQuery` (the block's CSS has an `@container` rule) a tier reached at fewer page widths is `containerTier`, not `oneWidth`.
- `discoverEffects(defReads, markReads)` → what one enum value changes: `{ prop: { slots, value } }`.
- `defaultPaint(defReads)` → per element and width, non-inherited properties.
- `overridingChildren(props, marker, defReads, slot, reaches)` → the descendants of an inherited setting's slot whose own rule overrides its value, topmost of each blocked subtree only.
- `mergeSetting(prev, s, { state, form, variant })` → one setting's cache entry, folding a fresh reading into the entry its earlier markers built; array fields are the union across markers.
- `foldReading(acc, inst, s)` → folds one marker's `slotFor` reading into `{ settings, dead, oneWidth }` (`calibrate.mjs`). A form with an acceptance rule is recorded only when the reading proves it (`formAccepted`); a probe that does not take leaves its setting untouched (never dead, never `oneWidth`), and one that takes on a setting a plain marker located adds only its form.
- `FORM_ACCEPT` → each value form's acceptance rule: `clamp`, `vw`, `repeat` on one element at all three widths; `count` on one element at every width whose track list it changed. `slotFor` returns `formAccepted` for a marker whose form has a rule; `hex` and `slug` keep their recording on any reading.
- `trackCount(value)` → the number of tracks in a computed `grid-template-columns` px track list, or null (`none`, or a template echoed by an element that is not a grid).

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
- `SSH`: the ssh arguments for the shared host.

### `lib/calibration-refs.mjs` (wsl or ssh for the existence check)
Site references (Spec 48 §3.2). A fixture names each WordPress object it needs by a token; each calibration target maps
the token to its own object in `calibration-targets.json` `refs`:

| Token | The site object (`ROLES`) | Written as |
|---|---|---|
| `{{menu}}` | a `nav_menu` term | a number, e.g. `"ref": "{{menu}}"` |
| `{{menuItem}}` | a top-level `nav_menu_item` of the menu role, with no children (checked to be in that menu) | inside the attribute's own string or key: `"id:{{menuItem}}"` |
| `{{drawer}}` | an `sgs_drawer` post | a number |
| `{{image}}`, `{{image.url}}` | an image attachment and its URL (the ref is `{ "id", "url" }`) | a number, and the URL string |
| `{{logo}}` | an image attachment used as a logo | a number |
| `{{product}}`, `{{product:text}}` | a published WooCommerce product | a number, or the id as text where the attribute stores strings |

A whole-string token becomes the id as a number (`:text` keeps it a string); a token inside a longer string or an
object key becomes the id's text. An attachment id beside the URL its render falls back to (`url` beside `id`,
`<stem>Url` beside `<stem>Id`) is `url-backed` and stays literal: the element renders on any site.
- `ROLES`, `TOKEN`: the vocabulary and the token pattern.
- `refsFor(targets, site)` → the target's refs over its `mirrorOf` test site's.
- `tokensIn(value)` → every token in strings and keys (`role` or `role.url`); `fixtureRoles(fixture)` → the roles.
- `resolveFixture(fixture, refs)` → `{ fixture, missing }`; `fixture` is null while any token is unsupplied.
- `existencePhp(checks)` → read-only PHP reporting per role true or why not; `checkRefsExist(refs, roles, runPhp)` → `{ role: true | reason }` (a site that cannot be asked gives a reason for every role).
- `refsProblem(fixture, refs, exists, site)` → why the block cannot be calibrated on the target, or ''.
- `refGate(blocks, fixtures, refs, exists, site)` → `{ ready: { block: resolved fixture }, blocked: [ { block, error } ] }`.
- `hostedRoot(site, repo)` → the WordPress root relative to the SSH home, from `build-deploy.py` TARGETS (read as text).
- `wpCommand(target, site, repo)` → `(args, input) => output` running `wp` in a WSL mirror or over SSH as user Claude; `wpEvalRunner(target, site, repo)` → the `runPhp` for `checkRefsExist` (`wp eval-file -`, PHP on stdin).

### `lib/fixture-refs.mjs`
- `REF_KEY`, `ITEM_STRING`: the keys and strings that name a site object. `NOT_REFS`: reference-like keys that do not (with why).
- `WIDE_KEY`, `WIDE_OK`: the corpus control's wide enumeration and the keys it catches that hold no reference.
- `survey(fixtures)` → `[ { block, path, key, value, category, reason } ]`, category `token`, `url-backed`, `not-a-reference` or `bare`; `tally(found)`; `unexplainedWide(fixtures, found?)`.
- `transform(fixtures, homeRefs)` → `{ fixtures, changes, unrecognised }`: each bare id (and a url-backed home image with its URL) to its role's token, keeping its value shape.
- `checkFixtureRefs(fixtures)` → problems: a bare reference, a token outside the vocabulary, an unexplained wide hit.

### `fixture-refs.mjs`
- `selfTest()` → the failed cases (positive, definition, edge, negative control, idempotence, round trip, corpus control). `main(argv)` → the exit code.

### `lib/provision-refs.mjs`
- `MENU_NAME`, `MENU_ITEMS`, `MENU_ITEM_ROLE_KEY`: the calibration menu (six top-level items, a two-item submenu, a mega-panel item, the menu-item role a plain `#` link fourth whose Description "SOON" is the menu blocks' badge copy; an existing item's description is set when it differs). `POSTS`: the mega panel and drawer posts. `MEDIA`: each media role's attachment title. `PRODUCT_TITLE`.
- `statePhp()` → read-only PHP describing what the site holds.
- `planProvision(state, { refs, kept, files })` → `{ actions, refs, unsupplied, known }`; a role is `'new'`, `'same-as-image'` or its id.
- `applyPhp({ known, media, product })` → PHP that finds or creates every object and prints the ids. `refsFromResult(plan, result)` → the refs to write.

### `provision-calibration-refs.mjs` (ssh)
- `parseArgs(argv)` → `{ site, dryRun, files }` or `{ error }`. `describePlan(site, state, plan)` → the printed lines.

### `calibrate.mjs` (runs `wp-build-page.js`, ssh, Playwright)
- `--allow-loss sgs/a:setting,…`: accepts each named loss; any other drop refuses the block's slot map (`lib/cache.mjs::slotMapWriteDecision`), keeps the candidate in `cache/<block>.refused.json` and fails the block (exit 1).
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
- `writableGroups(report, stateMap)` → `{ groups, box, unmapped, unmappedState, other }`; each group carries its setting `state` and `walkerStates`; a row with no draft value goes to `other` (nothing to write), and so does a row the walker flagged `mispaired` (its block's two pairings disagree, so it compares two different elements).
- `rowDistance(row)` → px distance from the draft (0 or 1 for non-lengths).
- `regressedRows(prev, report)` → open style or box rows that are new or further from the draft than last round (keyed per walker state).
- `heldReason(held, r)` → the text saying what the tree already holds for a row's group (`held[groupKey]`, recorded by `writeRound` when a setting already holds the draft value).
- `widthPattern(report, r)` → `{ fails, matches }`: the widths, in the row's walker state, where the group differs and where it matches; a difference that follows the width points at how one width is written.
- `classify(report, { writes, gaps, held?, elements, stateMap })` → `{ hardcode, missing, unresolved, derived, other }`; `held` (from `writeRound` or `heldGroups`) makes a row whose setting already holds the draft value a Hardcode, unless one side was never read: that row is unresolved `unmeasured-side`.
- `intendedCount(report)` → accepted rows.
- `knownPaths(cal)` → every element path a calibration knows (its elements, each setting's slots and reaches, and the discovered slots); the write path and triage read the same set, so a row whose only evidence is a discovered slot is never gapped `unmapped-element` by one and resolved by the other.
- `stateDisagreement(report, group, stateMap)` → `{ width, values, detail }` when the walker states mapped to the group's setting state read different draft values at one width, else null; it compares every mapped state, not only those with an open row, because a baseline state usually has none.
- `effectiveState(report, g, stateMap)` → the setting state a group resolves in: a walker state mapped to a setting state (`open`, `scrolled`) keeps it only for what that state changes; when every draft value the group reads matches the rest walker states' value at that width, or the element is never read at rest, the group resolves at rest (`null`). `writableGroups` re-keys such a group and merges it into the element's rest group; `lib/triage.mjs::resolveIssue` resolves in the same state.
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
- `describeCascade(ex, prop)` → the plain-text line for an `explainCascade` result: the winning rule and the losing rule carrying the draft's value, or that no matched rule sets the property. `rowSelector(row)` → the element's selector from a row's ref and path.

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

### `lib/identity.mjs`
- `alignByName(a, b)` → `[ [ i, j ] ]`, the longest common subsequence of two block-name lists.
- `originFromSkeleton(skeleton, tree)` → `{ origin, unaligned }`: cr-ref to `{ tpl, fingerprint }` for every tree node aligned with a skeleton node naming a tpl finder; every other node with why.
- `identityAgrees({ relation, idBox, wordBox }, tol?)` → true for the same element, or a wrapper either way with the identity element's box within `tol` px (2).
- `mispairWhy(r)` → the text of a disagreement: both elements' tags and boxes and their relation.
- `relateInPage([ resolveSrc, items ])` → in-page, per `{ ref, tpl, word, inner? }`: the relation (`same`, `word-contains`, `id-contains`, `apart`), both boxes and tags, `unresolved` when the tpl finder finds nothing, and per inner hand pair `{ name, resolved, inside }` (its draft element is the identity element or inside it). Self-contained.
- `fingerprintAgrees(fingerprint, idTag)` → false when the identity element's tag is not the skeleton fingerprint's (no fingerprint: true).
- `unalignedRefs(refs, origin)` → the live block refs with no origin entry, sorted.
- `innerVerdicts({ handInner, origin, rel })` → `{ mispaired, uncheckedHand }`: a hand pair inside a block whose draft element lies outside the block's identity element mispairs the block; one on a block with no origin entry, or whose draft finds nothing, is unchecked, never agreeing.
- `identityStates(runs, kept)` → `[ { state, scope, kept, add } ]`: each pairing state with its own kept pairs (same objects), adding blocks in the first state only.

### `origin.mjs`
- (no exports) CLI only.

### `lib/trial.mjs` (reads block sources)
- `UID_RE`, `uidsIn(classes)`: a block's style uid classes. `mapUids(text, from, to)` → text with each `from` uid rewritten to the `to` uid of the same prefix.
- `ruleDiff(before, after)` → `{ added, removed }` rule texts. `selfCheck({ liveUids, renderUids, liveRules, renderRules })` → `{ ok, why }`.
- `untriable(block, blocksDir)` → why a block can never be trialled (usesContext; `wp_unique_id`/`microtime` in render.php), else null.
- `withWrite(attributes, write)` → the attributes with one write applied. `pairDistance(live, draft, blockX)` → width, height and in-block offset distance.
- `judgeTrial({ before, after, draft, blockX }, tol?)` → `{ verdict, keep, delta, worse }`: `keep` when the summed distance falls and no pair moves more than `tol` px away, `reject` when one does or the sum rises, `no-box-change` when no box moved (the rebuild judges it).
- `savedBlock(raw, ref)` → `{ name, attributes }` of the block whose className carries `ref` in a post's raw content (balanced-brace scan): the attributes the uid hashes.
- `candidatesOf(writes, round)` → the last write of each setting on each block in the round (its `after` holds the setting's whole value).
- `applyVerdicts({ tree, start, writes, gaps, blocked, results })` → `{ writes, gaps, rejected }`: each `reject` puts its setting back to its value in `start` (the tree before the round's first write; removed where start lacks it), drops its writes and blocks every group that wrote it as `trial-reject`; every other verdict leaves the write to the rebuild and the guard. Mutates tree, gaps and blocked.

### `lib/trial-run.mjs` (Playwright; reads secrets and block sources)
- `draftBoxes(runDir, widths)` → `{ [width]: { [pair]: { box } } }` from a Solve run's `draft-cache-<width>.json`, first state.
- `isPhoneWidth(walkerCfg, w)`, `viewportOf(w)`: the walker's device profile (a full-mode config runs a width below 500px as an iPhone 13) and viewport (812px high below 500, 900 above).
- `openTrial({ envFile, envKey, walkerCfg, target, log? })` → `{ round(cands, draft, widths) → [ { ref, block, attr, group, ms, verdict, delta?, sumTol?, worse?, why?, restored?, pairs? } ], close() }`. `target` is the surface's build target: a post by id, or the active theme's template or template part by slug. Logs in once; each round re-reads the saved content (A = its saved attributes, which hold the last build, so the round's own writes are undone by construction) and reloads the live page once per device profile it needs. `pairs` holds each pair's distance to the draft before and after and its three boxes.

### `lib/trial-page.mjs` (Playwright pages)
- `readEnv(file)`, `adminSession(ctx, env, key)` → `{ base, api, close }`; `renderBlock(session, block, attributes)` → `{ status, html }`; `styleOf(html)`, `rootClassOf(html)`.
- In-page: `rulesInPage(token)`, `parseInPage(text)`, `applyTrialInPage([ css, remove ])`, `undoTrialInPage()`, `measureInPage([ resolveSrc, finders, blockSel ])`, `scopeInPage([ resolveSrc, finders, blockSel ])`. `cssOf(rule)` → CSS text with its at-rules.

### `trial.mjs`
- (no exports) CLI only.

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
- `ownSizeRow(r)` → whether a row is a node's own height or width box row (no path), which sums everything inside the node and so cannot judge one write.
- `landed(s, report)` → true when every row a setting was written from (matched by the write's group key) is closed in the report: the direct verdict on that setting.
- `settingsOf(writes)` → the writes grouped by node and attribute (writes to one attribute chain, so they are undone together).
- `suspectOrder(settings, calFor)` → layout-mode settings first, then settings writing a layout property, then the latest.
- `guardRound(base, report, tree, lastWrites, blocked, calFor, trials)` → the writes whose state changed (reverted, under trial, restored); settles last round's trials against the new walk first.
- `closeTrials(trials, blocked)` → settings still under trial when the run ends, reported as unconfirmed reverts.

### `solve.mjs` (runs `wp-build-page.js` and the walker)
- `WIDTH_GROUPS`: one walker per width, run in parallel (each with its own draft cache).
- `mergeReports(parts)` → one report from the per-width walks (runs in width order, errors by width).
- `WALK_FLAGS`: headless unless `SGS_HEADED=1` (Hostinger's edge 403s headless browsers after bursts of traffic; `pairs.mjs`, `calibrate.mjs` and `scripts/wp-build-page.js` honour the same switch, scrollbars hidden); every round's walk is lean (`--lean`: only the styles, boxes, hover end states and structure Solve reads) and reuses the run's draft reads (`--draft-cache <run dir>/draft-cache.json`).
- `USED_VALUES`: computed properties that are used sizes (`width`), written only as the draft declares them (a plain length or percentage at every width, from the walker's `declared` read), otherwise a `used-value` gap naming what the draft declares.
- `calibrationFor(block, site, dir?)` → the block's slot map with `site`'s default paint (through `withInnerRootAliases`) or null; `calibrationForSite(site, dir?)` → the `calFor(block)` function for one site.
- `withInnerRootAliases(cal, block)` → the calibration with every slot, reach and element path also answering to its form without a leading `.sgs-<slug>` step, when the cache holds that inner root as an element (a block calibrated with its optional wrapper on, measured on a page with it off); otherwise `cal` unchanged.
- `blockRenderSource(name)` → a block's `render.php` source, or null.
- `outsideOwner(node, { refs, source })` → who owns the content of a block whose words, elements or links come from outside the layout tree (`content-page`, `site-info`, `woocommerce-text`, `product-data`), read from the block's own source, or null. Evidence about the block, never a verdict on a row.
- `writeRound(report, tree, { db, snapshot, round, log, blocked, stateMap, calFor?, canvas?, ancestorHop?, ownerOf? })` → `{ writes, gaps, held }` (`held[groupKey]` lists a setting that already holds the draft value; `heldGroups(report, tree, opts)` reads it on a copy with its own snap log); only rows from mapped walker states are written. It hops to an enclosing ancestor last, writes content rows through calibration's `text`, `presence` and `link` entries, and reports `state-conflict` and `handover` gaps.
- `solveLoop({ maxRounds, build, walk, guard, write, save, blocked?, log? })` → `{ report, writes, gaps, rounds, lastWrote }`: the build, walk and write rounds with every step passed in; `maxRounds` 0 is measure-only (one build, one walk, never a write).
- `revertRegressions(prev, report, tree, lastWrites, blocked, calFor?, trials?)` → the writes the guard undid this round (`lib/guard.mjs::guardRound`).
- `wrongWrites(writes, reportAfter, stateMap)` → writes a later round reverted or that moved their rows further from the draft.
- `unpaintedBorder(report, g)` → a `not-painted` gap for a border colour row on a side the draft gives no border at any measured width (its value is the text colour carried by currentColor, so a written colour would paint nothing), else null.
- `settingRatio(wrong, writes)` → Spec 48 §3.3's ratio: wrong settings (one attribute on one node) over every setting written.
- `siteOverride(s, site, targets, readUrl)` → `{ surface, sshArgs, liveOrigin }` for `--site <calibration target>`: the surface built with that target's credentials (a mirror is a database copy, so the post ids and templates are the surface's own), `sshArgs` null for a local mirror (no remote host check), and the target's origin, which `walk` passes to the walker as `SGS_LIVE_ORIGIN` (`scripts/parity/lib/helpers.mjs::retargetLive` moves every live URL of the config to it). No site returns the surface unchanged.
- `envUrl(file, key)` → `WP_URL_<key>` from a secrets env file, or null.

### `fill.mjs` (runs Chromium, serves a local folder)
- `calibrationLoader(site, dir?)` → the block-to-calibration function for `site`: `solve.mjs::calibrationFor` over the route's cache, or over the cache folder `dir`.
- `parseMirrors(argv)` → `{ url: absolute file }` from repeated `--mirror <url> <file>`; throws on a lone url.
- `fillSurface(options)` → the report object (and writes `--out`): lints the skeleton, serves or opens the draft, reads it, resolves root-down, samples entrances and the sweep, and writes every output.

### `lib/draft.mjs`
- `contentType(file)` → the Content-Type for a file name.
- `resolveRequest(root, urlPath, index)` → `{ file }`, `{ redirect }` or `{ status }`; never a path outside `root`.
- `serveDraft(folder, { index, host })` → `{ url, port, close }` on 127.0.0.1 at an ephemeral port.

### `lib/fill-skeleton.mjs`
- `SCOPE_ATTR`: the attribute a node's draft element carries while its slots resolve. `scopeSelector(index)` → the selector for it.
- `finderProblem(f)` → why a value is not a walker finder, or null. `finderKind(f)` → `selector`, `text`, `textRun`, `group`, `js` or `tpl`, else null.
- `parseTplKey(key)` → `{ chain, tpl, copy }` for a `tpl` finder's `<import chain>/<n>#<copy>`, else null; `tplKey(parts)` is its inverse. The chain is `Root` then `<template>@<host stamp>#<host copy>` per nested import, so the same number in two imports, or in two copies of one import, never collides.
- `originMap(nodes, refs)` → `{ [cr-ref]: { tpl, fingerprint, slots? } }` for every node whose `draftRef` is a `tpl` finder; `fill.mjs` writes it to `<build>/<surface>.origin.json`.
- `scopeFinder(f, scope)` → the finder rewritten to resolve inside the scoped element.
- `skeletonNodes(tree)` → depth-first nodes with parent, children and targets.
- `skeletonProblems(tree)` → readable problems in a skeleton's draft keys.
- `cleanTree(tree)` → a copy without `draftRef`, `draftSlots`, `draftFingerprint`, `handover`, `siteInfoRow`, `childAttributes` and `childRefs`.
- `ROW_KEYS` → the Fill-only keys of a `sgs/social-icons` Site Info row. `siteInfoRow` is a list of registry brand slugs (absent: every registry brand in order); `childAttributes` is merged into every generated `sgs/icon`; `childRefs` maps a slug to the selector of the draft element it copies, resolved inside the row's own `draftRef`.
- `expandSiteInfoRows(tree)` → a copy where each such node holds `sgs/icon` innerBlocks (`iconSource: "brand"`, `brandName`, and `metadata.bindings.linkUrl` to Site Info's registry key); `fill.mjs` runs it after `skeletonProblems` and the lint.
- `hasRow(node)` → true for a `sgs/social-icons` node carrying any `ROW_KEYS` key.
- `ROW_GLYPH_SLOT`: a generated icon's glyph element path (`.sgs-icon__shape > .sgs-icon__svg`), read against the row's glyph element (`lib/fill-row-lift.mjs`).

### `lib/fill-fixture.mjs`
- `toggleStem(name, def)` → the stem an off-by-default boolean switch gates (`showBadge` → `badge`, `childIconShowBackground` → `childIconBackground`), or null.
- `fixturePreconditions(block, fixtures, schema, db)` → `{ attr: value }`: the fixture's attributes (with its first variant) that differ from the block's default and style it (a css_property, or a switch gating one).
- `taintedProps(block, preconds, schema, db, cal)` → `Map(LOOSE(slot) → Set(prop))`: the properties each calibrated slot shows only because of a precondition; a border width brings its style.
- `unstyledBaseline(st, block, cal, schema, slot, prop)` → the unstyled value (`0px` width, `none` style, transparent background, `none` image or shadow) Fill compares with for a tainted property, else undefined.
- `gateFor(st, block, cal, schema, attr, attributes)` → the fixture-precondition switch a written setting needs and the node does not hold, or null.

### `lib/fill-row-lift.mjs`
- `rowElementPaths(db, block, cal)` → the row's element path for each element name (`shape`, `glyph`): the calibrated slot of a setting the DB places there.
- `liftRow(st, rowRec, ref, cal, { fillElement, snapsOf })` → lifts the generated icons' shared look onto the row node: each icon's draft link is read as the row's shape element and its svg as the row's glyph element, and `childIcon*` is written on the row only when every copy agrees; a disagreement is reported UNMAPPED, never averaged.

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

### `lib/fill-unread.mjs`
- `STRUCTURE_ROLES`: database roles of an enum with no CSS property that changes what a block renders (`layout`, `select-from-enum`).
- `structureRowsFor(db, block)` → the block's SGS-owned enums with no `css_property` in a `STRUCTURE_ROLES` role.
- `unreadOf({ db, block, cal, attributes, slots, written })` → `[ { kind, slot, settings, reason } ]`: kinds `element`, `presence`, `text`, `link`, `structure`. `fillTree` adds `node` and `block` and returns them as `unread`; `fill-report.md` lists them under Not read.

### `lib/fill-presence.mjs`
- `plainText(s)` → text without markup, whitespace collapsed.
- `presenceDecisions(input)` → `{ writes, unmapped, notes }` for visibility and variant settings, from calibration's `presence`.
- `textDecisions(input)` → the same for words, from calibration's `text`.
- `normaliseHref(href, origin)` → the href as WordPress holds it, or null. `linkDecisions(input)` → the same for links, from calibration's `link`; a setting bound to Site Info (`metadata.bindings.<attr>.args.key`) is still written and also returns a `handover` row, which `fill-resolve.mjs::fillContent` records as a `site-info` / `link` handover entry. A block whose `link` names one distinct path (the nested anchor `sgs/icon` calibrates as `.sgs-icon__link`) also takes the address at the draft's root slot when no slot names that path: the draft's own anchor, or the sole anchor inside the copied element, is that block's one link; a block with two link paths takes no root guess.

### `lib/brand-registry.mjs`

- `REGISTRY_FILE` → the registry's path. `brandRegistry(file?)` → its brands in file order. `brandBySlug(slug, brands?)` → one brand or null.
- `brandDomains(brand)` → the domain names a social brand's addresses live on (its slug and the name inside its `socials.<name>` Site Info key).
- `brandOwnsAddress(brand, address)` → whether the address is that brand's own: `tel:` for phone, `mailto:` for email, a host `<domain>.<tld>` (or a subdomain of it) for a social; a brand with no Site Info key, address, short links (`wa.me`) and country second-level domains are not claimed.

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
- `identityPass({ browser, cfg, width, state, origin, kept, left, retarget?, covered?, handByRef?, handInner?, add? })` → `{ counts, mispaired, replaced, uncheckedHand, tagMismatch }`: each origin block paired by its tpl finder and the word matcher's element (generated, or a hand pair on the block root) checked against it on the draft; a hand pair inside a block (`handInner`, from `runPairing`) must measure a draft element inside the block's identity element; an identity element whose tag is not the skeleton fingerprint's is not trusted; `add` false checks without adding blocks. The CLI runs it once per pairing state (`lib/identity.mjs::identityStates`) and reports `unaligned` live blocks with no origin entry; mutates `kept` and `left`.

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

### `lib/skeleton-inventory.mjs` (Playwright by path; imports `scripts/parity/lib/collect.mjs`)
- `INVENTORY_WIDTHS`: 1440, 375, 768.
- `readInventory({ url, root, shotsDir, log, page, settle })` → `{ generated, source, root, keyFormat, checks, elements }`; with `page` (a prepared, navigated page) and `settle(page, width)` it reads that page at each width without launching a browser or navigating (intake runs it inside the sandbox and harness), and without them it behaves as before; an element is `{ key, parentKey, depth, tag, template, tpl, attrs, words, allText, membership, srcTag, srcOwnText, snippet, box, visible, display, flexDirection, layoutChanged375, screenshots }`.

### `lib/skeleton-model.mjs`
- `inventoryModel(inventory)` → `{ els, byKey, kids, isPart, blockKids, words, textWithBreaks, placeholders, box, stacked, isTextLink, isIconLink, childIndex, fingerprint, root, tplFinder }`.

### `lib/skeleton-facts.mjs` (reads the framework database read-only, `brand-registry.json`, `block.json`)
- `REPO`, `DECISIONS_FILE`: the repository root and `data/skeleton-decisions.json`.
- `rxList(spec)` → the regular expressions of a `{ patterns, flags }` spec; `specHit(spec, text)` → the spec when any pattern matches, else null.
- `loadFacts({ db, client, repo?, siteName?, decisionsFile? })` → the facts object (tag map, composition, capabilities, attributes, row and logo blocks, the list block and its item properties, display types, the placeholder map, the brand registry, and `replacedBy`: each core block's SGS replacement from `blocks.replaces`).
- `decisionsProblems(facts)` → readable problems in the decisions data (an unknown block, a core block with its replacement, a pattern that does not compile, no list block).

### `lib/skeleton-classify.mjs`
- `W`: the evidence weights. `finish(candidates)` → ranked candidates with shares and `confidence = min(1, top) * top / (top + second)`.
- `overrideFor(element, { clientDecisions, picks, facts, surface, words })` → the decision that settles an element (a client decision kept only while its signature holds, a finaliser pick, a standing element decision), `{ stale }` for a decision that no longer fits, else null.
- `sgsOnly(result, replacedBy)` → the result with every core candidate rewritten to its SGS replacement (the rewrite as evidence) or dropped into `rejectedCore` when none exists; SGS bans core blocks.
- `makeClassifier({ m, facts, overrides })` → `{ classify(element, parentBlock, ctx), brandFor, siteInfoKinds, isColumnLabel, briefOnly }`; `classify` passes every result through `sgsOnly`.

### `lib/skeleton-propose.mjs`
- `proposeSkeleton({ inventory, facts, surface, clientDecisions?, picks?, calKeys?, db? })` → `{ skeleton, proposal, problems }`; the skeleton passes `skeletonProblems` and `lintSkeleton`.

### `lib/skeleton-review.mjs`
- `decisionCell(key, surface, clientDecisions, picks)` → the recorded decision for a key, or null. `reviewHtml({ inventory, proposal, surface, clientDecisions, picks })` → the review page.

### `lib/skeleton-finalise.mjs`
- `skeletonDir(repo, client)`; `signatureOf(element)` → `tag|words`.
- `readDecisions(file)`, `recordDecision({ file, surface, element, choice, reason? })`, `recordSiteName({ file, siteName })`, `readPicks(file)`.
- `finaliseRequest({ inventory, proposal, surface, promptFile })` → the low-confidence rows with their elements and evidence; `applyPicks({ picks, request, knownBlock, file })` → the merged picks, refusing a key outside the request or an unknown block.

### `skeleton.mjs` (Playwright by path)
- `skeletonPaths({ client, surface, repo? })` → the run's files and draft url. `proposeSurface({ client, surface, repo?, siteName?, db? })` → propose from the files on disk and write the skeleton and proposal. `main(argv)` → the command line.

### `check-refs.mjs` (Playwright by path)
- `refStatus(entries)` → each entry with `status` (`ok`, `missing`, `ambiguous`, `outside`) and a reason. `skeletonTargets(skeleton)` → every `draftRef` and `draftSlots` target, Site Info row icons included. `checkRefs({ skeleton, draftUrl })` → `{ targets, summary }`.

### `lib/handoff.mjs` (Ajv 8 from `plugins/sgs-blocks/node_modules/ajv-formats`)
- `REPO`, `MASTER_SCHEMAS`, `KNOWN_RUNTIMES`: the repository root, `.claude/claude-design-handoff/handoff-schema/` and `data/known-runtimes.json`.
- `REQUIRED_FILES`: FR-48A-2's list (a root `.dc.html` is checked separately). `MAX_BYTES`: 20 MB (FR-48A-10).
- `sha256(buf)` → hex digest. `readJson(file)` → `{ data }` or `{ error }`. `readKnown(file?)` → `{ runtimes }` (empty when the file is missing).
- `walkFolder(root)` → `{ files, problems }`: every file relative with `/`, sorted; a symlink is a problem and is not followed.
- `resolveRef(value, fromDraft?)` → a folder-relative path (query and fragment removed, URL-decoded, leading `./` removed), or null for a templated value, an absolute URL, a bare fragment or a path leaving the folder.
- `draftRefs(text, fromDraft?)` → `{ drafts, scripts }` one draft names: `dc-import` names as `X.dc.html`, `href`/`src` values ending in `.dc.html`, `<script src>` and `x-import from=` values.
- `reachable(root, entries, files)` → `{ drafts, scripts }` reachable from the entry drafts (scripts: `.js` files on disk).
- `loadAjv()` → an Ajv 2020 instance (`strict: false`, `allErrors: true`, with ajv-formats), from the route's own pinned install.
- `schemaProblems(ajv, schemaFile, data)` → readable problems, at most 20 and a remainder line.
- `buildManifest(root, { project, entryDrafts, generated? })` → a MANIFEST.json object for the files now in `root`.
- `blockMappingHeadings(markdown)` → level 1 to 3 headings naming SGS or block mapping.
- `checkHandoff(root, { known?, schemas?, ajv? })` → `{ errors, warnings, sha }`, each line `FR-48A-<n> <file>: <reason>`.

### `lib/svg-screen.mjs` (saxes from the route's own pinned install)
- `saxesParser()` → the saxes `SaxesParser` class, from the route's own pinned install.
- `svgProblem(text)` → why an SVG is unsafe to run, or null.

### `lib/runtime-probe.mjs` (Playwright by path, serves through `lib/draft.mjs`)
- `PROBE_FIXTURE`, `PROBE_EXPECTED`, `RUNTIMES_DIR`: `data/runtime-probe.dc.html`, `data/runtime-probe.expected.json`, `data/runtimes/`. `runtimeCopyName(sha)` → `<first 12 hex>.support.js`.
- `probeRuntime(supportFile, { fixture?, timeout? })` → `{ rootName, live, annotated }`; copies the fixture and build into a temp folder and removes it after.
- `compareProbe(result, expected)` → one line per differing list (first differing index, both lengths); empty on a pass.
- `splitModules(src)` → `Map(module → text)` on the `// src/<name>.ts` markers. `moduleDiff(a, b)` → `[{ module, status, from, to }]`.
- `nearestKnown(src, known, { exclude? })` → `{ runtime, diff }` for the known build with a local copy that differs least, or null.
- `addRuntime(supportFile, knownFile, { source, added? })` → the entry, after copying the build into `data/runtimes/` and appending it with `probe: "pass"` (an already listed build is returned unchanged).

### `handoff-check.mjs`
- `parseArgs(argv)` → `{ folder, known, schemas, source, json, probe, add }` or `{ error }`. `main(argv, log?)` → the exit code.

### `intake.mjs`
- Runs `lib/intake-run.mjs` with the process arguments; no exports.

### `lib/intake-run.mjs`
- `REPO`, `INTAKE_SCHEMA`, `USAGE`; `parseArgs(argv)` → the options or `{ error }`; `pathsFor(repo, client)` → every input and output path.
- `buildRecord(...)` → the intake record from the stage results; `sectionCounts(record)`; `recordProblems(record, ajv)` (intake schema and page-map checks).
- `runIntake(options)` → the exit code and summary of a run; `confirmedPageMap(intake)` → the page map with `drop` and `edit:` marks applied; `applyIntakeReview(options)` → the exit code of `--apply-review`.

### `lib/intake-run-worker.mjs`
- No exports: the worker module `runIsolated` starts, which checks it holds no secret and runs the browser stages.

### `lib/intake-run-stages.mjs`
- `routeVisits(routing, entry)` → a visit per route; `STAGES`: the browser stages in FR-48-17's order, each `{ name, run(ctx) }`.

### `lib/intake-run-defects.mjs`
- `twoPassDefects(ctx)` → the draft-defect result from a three-visit pass and a pass over every route for its remaining candidates; `defectReviewRows(result)` → one review row per defect group.

### `lib/intake-run-collapse.mjs`
- `templateOf(row, census)`, `collapseSkeletonRows(rows, census)`, `collapseSkeletons(skeletons, census)`, `collapseFlags(rows)`, `collapseMissing(rows)`: one row per repeated construct, every original key kept inside.
- `paletteUsage(records)` → the palette's colour usage from rest-mode readings; `slimCensus(census)` → the census rows the record keeps.

### `stage0.mjs`
- `parseArgs(argv)` → `{ client, site, plan, recalibrate, allowLoss }` or `{ error }` (`--allow-loss` is passed to `calibrate.mjs`). Runs `lib/stage0.mjs::runStage0` with the real handoff check, framework DB, deploy hashes and `calibrate.mjs`.

### `lib/stage0.mjs`
- `BASELINE_SCHEMA`: path of `data/calibration-baseline.schema.json`. `FIXED_BLOCKS`: the layout and content blocks every surface uses (the spec's fixed rule).
- `surfaceKinds(surfaces)` → the sorted distinct `kind` values of a `surfaces.json`.
- `blocksForKinds(kinds, rows)` → `{ byKind, unmapped }`: `block_composition` holds no kind column, so a kind maps to the `sgs/` blocks whose slug is the kind or ends in `-<kind>`; a kind with none is `unmapped`, never guessed. `blockSetFor(kinds, rows)` → `{ blocks, byKind, unmapped }` with `FIXED_BLOCKS` first.
- `blockState({ cacheDir, block, hashes, fixtures, refsWhy })` → `{ block, state, deployHash, cachedKey, why }`; `state` is `current`, `stale`, `missing`, `undeployed`, `no-fixture`, `needs-refs` (the fixture names a reference the target does not supply or the site does not hold; `refsWhy` says which) or `no-build`.
- `paintSnapshot(cacheDir)` → every `.paint.json` with size and mtime; `paintChanges(before, after)` → the paint files added or changed.
- `buildBaseline({ client, site, takenOn, playwright, cacheDir, blocks, hashes })` → the Appendix C object; `baselineProblems(baseline, ajv?)` → readable problems (empty when valid and a browser is named).
- `calibrateArgs({ site, client, blocks, recalibrate, allowLoss? })` → the `calibrate.mjs` argument list, always with `--slot-map-only`, plus `--allow-loss` when `allowLoss` is non-empty. `installedPlaywright()` → the installed Playwright version.
- `runStage0(o, deps)` → `{ code, lines, baseline }`; `o` is `{ repo, client, site, cacheDir, plan, recalibrate }`, `deps` the injected effects (`refs` and `refsExist(roles)` among them).

### `lib/intake-sandbox.mjs`
- `PINNED_SCRIPTS` (the three unpkg runtime scripts with their SRI hashes), `FONT_HOSTS`, `STOCK_HOSTS`, `DROP_HEADERS` (response headers never replayed). `hostOf(url)` → the hostname or null.
- `classifyUrl(url, { origin, stockHosts })` → `origin`, `inline`, `pinned`, `recordable` or `unlisted`. `replayFilter(stockHosts)` → the RegExp of URLs the HAR serves. `replayPath(client, manifestHash)` → the replay file path.
- `recheckManifest(folder)` → `{ manifestHash, schemaVersion, files }`; throws naming a version other than "1.0", a size or hash mismatch, a missing or unlisted file, or a wrong `runtime_sha256`.
- `runtimePins(supportSrc)` → `{ url: sri }` from `support.js`; throws unless they are `PINNED_SCRIPTS`. `startTrapProxy()` → `{ server, attempts, close }`, a local proxy that refuses and logs every connection.
- `openSandbox({ folder, index, harPath, mode, widths, stockHosts, pinnedBodies, headless, timeout })` → `{ browser, context, origin, manifest, newPage, visit, requests, blocked, proxyAttempts, close }`; `mode` is `replay` (HAR only) or `discover`; `blocked` rows are `{ url, host, reason: unlisted-host|replay-miss|websocket, draftId }`.

### `lib/intake-record.mjs`
- `fetchPinned({ integrity })` → `{ url: Buffer }`, the pinned scripts fetched in Node and SRI-checked. `assertIntegrity(url, body, sri)` throws on a mismatch.
- `discoverRequests({ folder, index, widths, visits, stockHosts, harPath })` → `{ urls, blocked, userAgent, manifestHash }`, pass 1 with the network closed.
- `recordReplay({ urls, harPath, userAgent, stockHosts, integrity })` → `{ harPath, added, entries, bytes }`; refuses a URL that is not recordable. `recordExport({ folder, index, harPath, widths, visits, stockHosts, rounds })` → `{ harPath, urls, blocked, rounds }`, discovery and recording repeated until no new URL appears.

### `lib/intake-process.mjs`
- `ENV_ALLOW`: the variables an intake worker receives. `secretNames(env)` → the names that may hold or reach a secret (`PWD` and `OLDPWD` excepted). `cleanEnv(env)` → the allowlisted copy.
- `assertSecretFree(env?)` throws listing every secret name present. `runIsolated(modulePath, args, { cwd, timeout })` → `{ code, stdout, stderr }` from a worker run with `cleanEnv(process.env)`; a non-zero exit throws.

### `lib/intake-prose.mjs`
- `PROSE_FILES`, `NOTE_FILES`, `COMMAND_VERBS`: what is scanned and the command verbs. `commandReason(line, { inShellFence, inFence })` → why a line is command-like, or null.
- `markdownRows(file, markdown)` and `noteRows(file, data)` → rows for one file. `commandLikeLines({ folder })` → `[{ rowId: 'prose:<file>:<line|json path>', file, line, text, why }]`.

### `lib/tokens.mjs`
- `parseTokenCss(text, file)` → `[{ name, value, file, selector, media, line }]`. `resolveTokens(tokens)` → `{ tokens, problems }`, each token with `resolved`, `chain`, `type`, `fallback` and `hex`; a cycle, missing reference or empty result is a problem with `resolved: null`.
- `readTokens(folder)` → `{ tokens, problems, files }` for `tokens/*.css` (a missing folder is a problem). `colourHex(value)` → `#RRGGBB[AA]` or null. `tokenType(name, resolved)` → `colour`, `gradient`, `length`, `font-family`, `font-size`, `shadow`, `easing`, `number`, `other` or `unresolved`.

### `lib/intake-palette.mjs`
- `proposePalette({ tokens, usage, slugs, problems })` → `{ rows: [{ rowId: 'palette:<token>', token, hex, resolved, chain, used, uses, role, confidence, why, wantedSlug?, sharedWith }], unused, oneOff, merges, sectionText, tokens, vocabulary, problems }`; `usage` is `[{ hex, property, draftId, count, tag? }]`.
- `loadPaletteSlugs(path?)` → `[{ slug, name }]` from theme.json (`THEME_JSON` is the default path). `DEDUPE_DE` (1) and `NEAR_DE` (2).
- Colour maths: `hexToLab(hex)`, `ciede2000(labA, labB)`, `hexDistance(a, b)` (Infinity across different alphas), `dedupeColours(tokens)`.
- Usage: `summariseUsage(usage, hexes)`, `ruleFromUsage(summary, hex)`, `sectionTextFor(groundHexes, usage)`, `brandFamilies(colours, groupOf)`.
- Name rules, run in order through `NAME_RULES`: `ruleLinkHover`, `ruleLink`, `ruleHeading`, `ruleReserved`, `ruleOnGround`, `ruleSection`, `ruleFooter`, `ruleBorder` (a saturated colour is never the divider), `ruleStatus`, `ruleWhatsapp`, `ruleTextMuted`, `ruleTextInverse`, `ruleText`, `ruleSurface`, `ruleBrand`.

### `lib/intake-census.mjs`
- `rowId(row)` → `<kind>@<draftId>[/<discriminator>]`, one identity for static and runtime sightings; `assignIds(rows)` sets `row.id`, numbering repeats `~2`, `~3`.
- `mergeSightings(rows, sightings)`: a runtime sighting of a static row makes it `both`, any other becomes a `runtime` row. `markUnreached(rows, { kinds })`: a static-only row of a traced kind is `unreached: true`.
- `applyRuntime(rows, runtime)`: merges the runtime sightings, marks `unreached`, and leaves a row the trace cannot decide as `unreached: null` with its `traceGap`. `runCensus` takes `runtime: { visits, widths, harPath, harness }`.
- `regexCounts(text)` → METHOD.md §4's counts; `crossCheck(sources, rows)` → `{ table, gaps }`, a gap row per disagreeing category.
- `staticCensus({ folder, entry, harPath, sandbox?, timeout? })` → `{ rows, gaps, sources, counts }`. `runCensus({ folder, entry, registry?, root?, readers?, harPath?, sandbox?, census?, timeout? })` → `{ rows, gaps, problems, pass, sources, counts }`. Re-exports `draftSources`.
- A row is `{ id, kind, draftId, component, detail, source, unreached }` plus `reader` or `gap`; `draftId` is `<component>:<data-dc-tpl>` for a template construct and `<component or script file>:js:<line>:<column>` for code.

### `lib/intake-census-runtime.mjs`
- `TRACED_KINDS`: the kinds the runtime pass decides. `groupVisits(visits, entry)` → page groups from `file`, `file#hash` or `{ file, hash }`.
- `runtimeCensus({ folder, entry, harPath, visits, widths, census, timeout, harness })` → `{ sightings, perVisit, gaps, traceGaps, runtimeOnly, kinds, wallMs }`.

### `lib/intake-census-trace.mjs`
- `traceInit()`: the in-page call wrappers and motion listeners; `collect(arg)` → one visit's evidence.

### `lib/intake-census-map.mjs`
- `buildModel(sources)`, `positionOf(model, offset)`, `codeTarget(row, model, rowsByComp)`, `callAt(model, offset)`, `countAt(coverage, component, offset)`: map a script hash and offset (coverage or a wrapper's call site) back to the static row; `CALL_KINDS`, `isCode(draftId)`, `splitId(draftId)`.

### `lib/intake-census-template.mjs`
- `KNOWN_SC_TAGS`: the runtime's `sc-*` tags. `cutDraft(text)` → `{ template, logic, logicLine, logicColumn }`. `holes(s)` → the expressions in a string's `{{ }}` holes.
- `draftSources({ folder, entry, harPath?, sandbox?, timeout? })` → every reachable draft with its cut, its stamped template, how it was read (`entry`, `bridge`, `standalone`) and its helmet scripts; an import's component name is paired from `__dcTemplateSource` and checked against the rendered hosts (the runtime strips it from the annotated text).
- `templateRows(source, { handlerOf })` → the template rows of one draft.

### `lib/intake-census-logic.mjs`
- `parseLogic(text, { startLine, startColumn, sourceType })` → the Babel tree; `walkAst(node, visit)`; `cssDecls(css)` (split as the runtime's `cssToObj` does); `motionKind(prop)` → `transition`, `keyframes` or null.
- `classMembers(cls)` → each member classified or `unknown`; `logicRows(source)` → `{ rows, gaps, model }`; `callSiteRows(ast, ctx)` → timers, observers, `.animate(` calls, listeners and motion written from code; `scriptRows({ component, text })` → the same for a helmet script file.

### `lib/intake-registry.mjs`
- `REGISTRY_FILE`, `REGISTRY_SCHEMA`; `loadRegistry(file?)` throws listing every schema problem; `readerFor(entry, { root })` → the reader function, throwing on a missing module or function.

### `lib/intake-ast.mjs`
- `loadDraft(folder, file)` → `{ file, text, cut, tags, idx, error }` (a cut or parse failure is `error`, never a throw); `splitDraft(text)` → the template and `data-dc-script` logic.
- `scanTags(text, from, to)`, `attrOf(tag, name)`, `decodeEntities(s)`, `lineMap(text)`: template start tags and attribute values.
- `parseLogic(code, logicLine)` → `{ ast, code, parent, all, line(node) }`; `subtree(idx, node)`, `classMethod(idx, name)`, `enclosingFn(idx, node)`, `snippet(idx, node, max)`.
- `resolveName(idx, id)` (nearest scope, destructuring and parameters), `fnBinding(idx, fn)`, `callsOf(idx, binding)`.
- `evalStr(idx, node, depth, env)` → `{ values, partial, unresolved }`; `readBinding(value)`, `bindingKey(expr)` for `{{ }}` attribute bindings; `keyName`, `propName`, `isFn`, `isThisMember`.

### `lib/intake-routing.mjs`
- `loadExport(folder)` → `{ entries, pages, mounted, drafts }` (entries from `entry_drafts`, drafts reachable by FR-48A-3).
- `ADAPTERS`: `hash`, `state-page`, `files`, each `{ name, matches(exp) → { match, evidence }, read(exp) → { routes, links, gaps } }`. `pickAdapter(exp)` applies the precedence rule and throws naming the adapters and evidence on none or a double match.
- `readRouting({ folder })` → `{ adapter, routes, links, gaps }`; links carry `route`, `external` or `control`. `embeddedManifest(draftText, draftId)` → `{ manifest, gaps }`.

### `lib/intake-breakpoints.mjs`
- `draftBreakpoints(draft)` and `readBreakpoints({ folder })` → per draft `{ draft, basis, evidence, thresholds: [{ value, operator, variable, basis, expression, location }], gaps }`.

### `lib/intake-harness.mjs`
- `HARNESS_DEFAULTS` (clock `2026-01-05T10:00:00Z`, seed, `stepMs` 16, `timeoutMaxMs` 10000, `intervalTicks` 3, `rafFrames` 60, `scrollStepMs` 100, `settleMaxMs` 30000). `DISABLE_ITEMS`: the items only the negative controls may switch off.
- `harnessOptions(opts)` → the checked options; `harnessSettings(opts)` → the `harness` object stored in each record and in `intake.json`.
- `bootStorageKeys(logicSource)` → `[{ store, key, expr, resolved }]`, keys the logic both reads and writes (from the tree).
- `preparePage(page, opts)` installs the paused clock and the in-page harness before navigation (refuses a context prepared twice); `gotoDraft(page, origin, file, { hash, timeout })` opens the draft and throws on a draft error; `draftErrors(page)` → `{ page, console }`.
- `ensureFonts(page, opts)` throws naming any face not `loaded`; `settleRest(page, opts)` → a summary of the rest-mode settle.
- `sampleTimes(duration)` → `[0, d/2, d]`; `targetAnimations(page, target)`; `sampleAt(page, { target, times, kind, read })` → the samples.
- `openHarness({ folder, index, harPath, file, hash, width, height, timeout, ... })` → `{ sb, page, options, settings, close }`, one fresh sandbox per run.

### `lib/intake-harness-page.mjs`
- `harnessInit(cfg)`: the in-page init script (seeded random, storage, timeout tracking, interval and frame-loop caps, animation registry, frame wait, hold, seek and font helpers).

### `lib/intake-reading.mjs`
- `READING_SCHEMA`; `READING_PROPS` (the walker's `DEFAULT_PROPS` without the synthetic `icon-*` entries).
- `readRecords(page, { surface, mode, width, state, t, rootSelector, props, harness })` → the records (refused without `harness`); `sortRecords(records)`; `toJsonl(records)`; `readingProblems(records, ajv)`.
- `readSurface({ folder, index, harPath, file, hash, width, mode, surface, state, sample, ... })` → `{ records, jsonl, settings, summary, url }`.

### `lib/intake-siteinfo.mjs`
- `SYNC_SCRIPT`, `PROVISION_SCRIPT`: the two plugin scripts, run as commands only. `linkCandidate(href, where)` → a candidate from one link.
- `runSyncPrint({ draft, python })` (throws if `--push` is ever in its arguments) and `parseSyncPrint(text)` → the print's key/value pairs.
- `proposeSiteInfo({ folder, routing?, census?, syncPrint?, python? })` → `{ rows: [{ rowId: 'siteinfo:<key>[#n]', key, value, normalised, sources, valid, reason }], refused, gaps }`.
- `provisionKeys`: the keys the provisioning script fills (the brand registry's Site Info keys plus phone, email, address). `handoverFor(confirmedRows)` → `{ entries, notApplied }`, honouring `drop` and `edit:<value>` marks.
- `provisionDryRun({ site, handoverFile, script?, python?, timeout? })` → `{ table, lines, code, stderr, gaps }`, never with `--apply`; `parseProvisionTable(text)` → its table rows.

### `lib/intake-siteinfo-shape.mjs`
- `refusal(raw)` → why a value is refused (`{{ }}`, placeholder host, `#`) or null. `validate(key, raw)` → `{ valid, normalised, reason }` through `phoneShape`, `emailShape`, `socialShape`, `addressShape`, `hoursShape`.
- `DAYS`, `POSTCODE`, `parseHoursText(text)`, `socialBrands`, `socialKey(url)`, `brandByLabel(label)`.
- `locator(census)` → a function giving `<component>:<data-dc-tpl>` (or a file location) for a template or code position; `textRuns(draft)` → the template's text runs.

### `lib/intake-flags.mjs`
- `proposeFlags({ folder, census?, siteInfo?, stockHosts? })` → `{ rows: [{ rowId: 'flag:<kind>:<draftId>[:n]', kind, draftId, text|url, why, source, location }], gaps }`.
- `placeholderWhy(text)`, `isStockUrl(url, hosts)`, `readmePlaceholderLines(text)`.

### `lib/intake-skeletons.mjs`
- `SURFACE_KINDS`: the kinds that get their own skeleton (header, footer, drawer, menu, form, modal, global, page); other records are `parts` of a surface.
- `surfaceRoots({ folder, census, records? })` → `{ surfaces: [{ name, kind, component, rootTpl, route, selector }], parts, gaps }`.
- `proposeSkeletons({ folder, harPath, surfaces, client, db?, facts?, entry?, routing?, site?, shotsDir?, widths, repo?, harness?, log? })` → `{ skeletons, gaps, runs }`; per surface `{ surface, inventory, rows: [{ rowId: 'skeleton:<surface>:<key>', key, tag, words, block, confidence, low, reason, candidates, action }], problems }`; `runs` records each sandbox's requests, blocked hosts and proxy attempts.
- `openers(surface, census)` and `describeOpener(opener)`: how a surface that does not render at rest is opened (its `surfaces.json` state keys through `setDraftState`, else the handler its `opened_by` names through `fireTrigger`); `proposeSkeletons` takes `census` and `openStates`, and each entry records `opened` and any `readAt` width.
- `unresolvedRows(skeletons)` → the kept rows with action `unresolved` or no candidate.

### `lib/intake-defects.mjs`
- `WIDTHS`, `STATE_KINDS`, `motionModifier(row)`; re-exports test 1 from `lib/intake-defects-binding.mjs`.
- `unreachedDefects({ folder, entry, harPath, census, visits, widths, flags?, only?, force })` → test 2's verdicts; `only` limits it to a set of census row IDs; `force` exists only for the negative controls.
- `proposeDraftDefects({ folder, entry, harPath, census, visits, widths, harness, flags? })` → `{ rows: [{ rowId: 'defect:<draftId>[:n]', draftId, censusId, component, test, kind, evidence, widths }], groups: [{ groupId: 'defect-group:<component>:<member>', component, member, rowIds, kinds, evidence }], notDefects, gaps }`.

### `lib/intake-defects-binding.mjs`
- `boundStyleRows(census)`, `classifyCompiled({ value, rule })` → `unresolved`, `dropped`, `resolved` or `no-rule`; `readPageBindings(page)`, `bindingVerdicts(...)`, `unresolvedBindingDefects({ pages, census })`.

### `lib/intake-defects-keys.mjs`
- `logicModel(source)`, `conditionKeys(...)` (the state keys a condition reads, with the literal values the code writes or compares), `patchesOf(...)`, `memberAt(...)`, `propsGating(...)` (whether a construct's gate reads `this.props.*`), `defectGroups(rows)`.

### `lib/intake-defects-force.mjs`
- `FORCEABLE`, `PSEUDO_ELEMENTS`; `openForcedPage(...)`: one harness page per width with the forcing tools installed.

### `lib/intake-defects-static.mjs`
- `deadCodeWhy(...)` → why a construct is provably dead, or null; `definedTag(...)` → the custom element a script defines; `prototypeOnlyWhy(...)` → why a construct sits in flagged placeholder or prototype code, or null.

### `lib/intake-missing.mjs`
- `INSTRUMENT_DEBT`, `BEHAVIOURS`; `mainFlowOf(...)`, `draftIdOfKey(key)`, `skeletonMissing(...)`, `bodyEvidence(...)`, `behaviourOf(...)`, `heldBy(...)`, `censusMissing(...)`.
- `proposeMissingFeatures({ skeletonRows, census, facts, registry? })` → `{ rows: [{ rowId: 'missing:<…>', draftId, construct, line, mainFlow, why }], held }`.

### `lib/intake-state.mjs`
- `setDraftState(page, { component, keys })` → instances set (0 = not mounted); `snapshotDraftState(page)`, `restoreDraftState(page)` → counts.
- `fireTrigger(page, { selector } | { component, draftId }, event)` → false when nothing is rendered; `listenerInit` (an init script), `fireListeners(page, types)`, `LISTENER_TRIGGERS`.

### `lib/intake-review.mjs`
- `ROW_TYPES`, `SECTION_TITLES`; `MARKS` (Appendix C's mark values per row type; the first is what "Accept all" sets) and `markShapes`; `markProblem(rowType, mark)` → why a mark is refused, or null.
- `HASH_FIELDS`, `VOLATILE`, `sha`, `contentHash(rowType, row, draftId)`: the content hash of exactly what a row shows.
- `reviewRows(intake)` → `[{ rowId, rowType, draftId, contentHash, shows, proposed, note, acceptAll }]`; page-map rows are `page:<postType>:<slug>`, notices `notice:prose:<file>:<line>` and `notice:host:<host>`.
- `renderReview(intake, { changed? })` → the `review.md` text (changed rows from `intake.review` when no list is passed); `parseReview(markdown)` → `{ sections, rowMarks, rowSection, problems }`.
- `applyReview(intake, markdown, { today })` → `{ intake, problems, missing }`; `isoDay(date)`. `carryOver(previousIntake, intake)` → `{ review, changed }`.

### `lib/intake-ast-eval.mjs`
- `ref(node, env)` → `{ node, env }`, a node paired with its loop environment; `returnsOf(idx, fn)` → a function's returned nodes, `propRefs(idx, node, key)` → where a property's value comes from.
- `resolveRefs(idx, node)` and `elementsOf(idx, node)` → the data a value or a loop iterates over; `staticTruth(idx, node, env)` → true, false or unknown for a simple filter condition.
- `evalDeep(idx, node, env?)` → `evalStr`'s result with loop variables followed; `loopEnvs(idx, node)` → one environment per loop item; `oneString(result)` → the single string or null.

### `lib/intake-pagemap.mjs`
- `PAGE_MAP_SCHEMA`; `classifyRoute(text, { prices })` → `{ postType, template, collection }` for a route's content.
- `proposePageMap({ folder, routing?, census?, surfacesHint? })` → `{ rows, linkMap: [{ from, href, kind: row|external|control|gap, slug?, error? }], gaps }` (`surfacesHint` defaults to the export's `surfaces.json`; `null` skips the cross-check).
- `pageMapProblems(rows, ajv?)` → schema problems, duplicate slugs and parents naming no row.

### `lib/intake-pagemap-surfaces.mjs`
- `codeSurfaces(exp, routeOf)` → the CPT surfaces found in the code with their menus; `crossCheck(code, hint)` → rows on one side only, as gap rows. `KIND_POST_TYPE`: surface kind to post type.
- `elementTree`, `innerText`, `descendants`, `ancestors`, `kebab`, `stem`: template tree and naming helpers.

### `lib/intake-spec-sync.mjs`
- `SPEC_FILE`, `DATA_DIR`: the spec and the route's `data/` folder. `LABELS`: each Appendix C label with its schema file and shape (`body`, or `items` for the page-map array).
- `specBlock(specText, label)` → the parsed JSON block after `**<label>:**`; throws naming the label when there is none.
- `constructKinds(specText)` → the construct kinds Appendix C lists for the registry.
- `syncProblems(specText, label, schema)` → each disagreement between the spec block and the schema file (wrapper keys ignored), prefixed with the label.
- `intakeProblems(specText, schema)` → each intake-record key missing from the schema's `required` or `properties`, and each extra required key.

### `handoff-repackage.mjs`
- `parseArgs(argv)` → `{ folder, project, entries, generated, dryRun }` or `{ error }`. `main(argv, log?)` → the exit code.
- `readOldManifest(text)` → `{ rows: [{ path, bytes, sha256 }], runtime }` from an old `MANIFEST.md`.
- `proveUnchanged(root)` → `{ problems, notes }`: a problem is a file changed since export or a folder that cannot be proven unchanged.
- `repackage(root, { project, entries, generated, dryRun?, schemas? })` → `{ problems, notes, actions }`; writes nothing when `problems` is non-empty or `dryRun` is set.

### `lint.mjs`
- `routeFiles(root)` → every route file, relative.
- `exportsOf(src)` → exported names.
- `lintFolder(root)` → problems (README index, scripts imports, a file naming the plugin's `node_modules`).
- `lintTree(tree, db, label?)` → problems (core style, native_wp).
- `lintSkeleton(tree, db, label?)` → problems (style values; and a brand `sgs/icon` that types its own brand's address in `linkUrl` with no `metadata.bindings.linkUrl`).
- `registerIds(markdown)` → the item ids a fix register holds (table first cells, comma-split, and ids leading a bullet).
- `HOUSE_RULES`: ledger rules that are house rules (`touch-target`, `accessibility`): their entries cite no register item.
- `lintLedger(entries, ids, label?)` → problems: an entry (not a house rule) whose `register` ids are missing or not in `ids`.
- `lintSurfaceLedger(surfacesFile, registerFile?, repo?)` → `lintLedger` on `<build>/qa/divergences.json` against `registerFile`, else the register `qa/ledger.config.json` names (from the repo root); a ledger with entries and no register, or a missing register file, is a problem.
