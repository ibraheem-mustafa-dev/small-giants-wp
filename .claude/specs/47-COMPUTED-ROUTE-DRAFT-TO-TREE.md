---
doc_type: spec
spec_id: 47
spec_version: "0.2"
title: "Computed Route: rendered draft to block tree, measured not copied"
project: small-giants-wp
created: 2026-10-03
last_verified: 2026-10-03
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
| **R-47-9 Bounded loop** | Solve runs at most three build-and-walk rounds. A setting written in round N is rewritten later only if the match improves at every width. A write needs the row's element to be the element calibration ties to that setting. |
| **R-47-10 Gates** | Every tree passes `scripts/wp-build-page.js --dry-run` before a real build. The resolver writes only settings with `block_attributes.source = 'sgs'`; never a core `style` attribute or a `native_wp` setting, because those serialise as inline `style="…"` (Spec 32). `lint.mjs` enforces this on every tree the route writes, and fails a Fill skeleton that carries any attribute whose `css_property` is not null. Route code passes `python scripts/check-no-client-names.py --check`. Ref classes use the `cr-ref-` prefix, never `sgs-`. |
| **R-47-11 Live-site safety** | The route writes only to the posts listed in `calibration-targets.json` and to the surface targets in the site's `surfaces.json` (§2). `lib/tree.mjs` refuses any write to the canary's homepage (2742) or posts page (2741), to a motion-QA fixture (2103, 2109, 2113, 2603, 2740, 3037), or to a target in neither list. It never deletes posts and never changes an active header, footer, drawer or snapshot pointer. Before a build it checks that no deploy or reseed is running on that site. |

## 2. Inputs and outputs

- **Input:** one surface (a page, the header, the footer, a drawer, a modal) of a draft that renders in a browser,
  that site's `theme-snapshot.json` (Spec 33), and the framework database.
- **Surface manifest:** `sites/<client>/build/surfaces.json`, one entry per surface:
  `{ "<surface>": { "tree": "footer.tree.json", "envFile": ".claude/secrets/<site>.env", "envKey": "<KEY>", "target": { "postId": 182 } | { "templatePart": "<slug>" }, "walker": "qa/parity/footer.mjs", "draftUrl": "<url>" } }`.
  Solve and Fill take `--client <slug> --surface <name>` and read only this.
- **Output:** the surface's tree in `sites/<client>/build/`, built through `scripts/wp-build-page.js`, a report, and
  for Fill a generated walker config.
- **Not in scope:** content beyond what the draft shows (products, pages, Site Info), functional behaviour, asset
  upload (existing asset steps handle it), block swaps (Solve writes settings only; a wrong block type is reported).

## 3. Requirements

### 3.1 Resolver: `lib/resolve.mjs` (FR-47-1)

Input: block slug, slot element (as calibration names it), CSS property, optional state, and the measured value at
each width. Output: one attribute write in the block's storage shape, or a gap with a reason.

- **Lookup.** Candidates come from `block_attributes` where `source = 'sgs'`, matched by `block_slug`,
  `css_property` and `css_state`. States are `hover`, `open`, `scrolled`, `current` and `shrunk`; NULL means rest.
  Focus has no setting, so a focus row is always a gap. Only candidates that calibration ties to the same slot
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

Calibration has two outputs with different scopes:
- **Slot map:** which rendered element and property each setting paints, and how its value transforms. It does not
  depend on the site. It is measured once on the canary and cached per block, keyed by the md5 of the block's deployed
  `build/blocks/<block>/` directory read over SSH, so the key matches what the server runs.
- **Default paint:** each element's computed style with no settings. It depends on the site. It is measured on the
  site the surface is built on, keyed by the slot-map key plus the md5 of that site's `theme-snapshot.json`.

Before calibrating, `calibrate.mjs` compares the deployed `build/blocks/<block>/` md5 with the local build and refuses
to run on a mismatch. Inherited properties are not recorded as default paint (R-47-5 uses the parent's live value).
The cache is `scripts/computed-route/cache/`, gitignored in the commit that creates the folder.

**Steps:**
1. Render one default instance and record every rendered element's computed style.
2. Render one marked instance per (setting, marker) and record which element's computed style changes, and to what.
   - A setting that changes nothing is reported as dead: a framework defect.
   - A setting whose marker reaches its element at fewer than all three tier widths is reported as a one-width
     hardcode.
3. Write one file per block: elements by their selector path from the block root (BEM classes joined by ` > `, with
   `:nth-of-type(n)` only where siblings share a class), the default paint per element, and each setting's slot,
   property, accepted value forms and transform.

**Markers by setting shape:**

| Shape | Marker |
|---|---|
| Colour | A hex the site's palette lacks (`#13579b`), and separately one palette slug, so both render paths are proven |
| Length, single value | 37px |
| Box object | top 11px, right 13px, bottom 17px, left 19px |
| `tier_object` | desktop 37, tablet 23, mobile 7 (in the setting's unit), read at 1440, 768 and 375 |
| `flat_sibling` | the same three values in `attr`, `attrTablet`, `attrMobile` |
| Enum | every value in turn |
| Boolean | the opposite of the default |
| Number (unitless line height, weight, opacity) | 1.37; 700 or 300, whichever differs from the default; 0.37 |
| Has a `css_state` | the marker is set and the element is put in that state before reading (hover: a real mouse; open, scrolled, current, shrunk: the block's own trigger) |

A setting whose marker fails `wp-build-page.js` validation is reported as `marker-rejected` with the builder's message.

**Where and how it renders:**
- Each site has one calibration page, created once with `wp-build-page.js --create page --title "CR calibration"
  --slug cr-calibration --status private`. Its post ID goes in `scripts/computed-route/calibration-targets.json`
  (`{ "<site>": { "envFile", "envKey", "postId" } }`; eye-care-test: 668). Later runs replace that page with
  `--post-id`. Private, it is never public, indexed or linked; calibration reads it in a logged-in browser.
- One build holds a whole block: one default instance plus one instance per (setting, marker), each wrapped in an
  `sgs/container` with class `cr-cal-<block>-<setting>`.
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
2. Walk: `node scripts/parity/draft-live-walk.mjs <walker> --headless --widths 375,768,1440,1920 --no-review --out
   <run dir>/round-<N>`.
3. Write. Consider each row in `report.json` whose kind is `style`, `hover` or `box`, which is not accepted and not
   matched in `divergences.json`:
   - The row's `ref` names the node; its `path` matches a calibration element exactly, giving the slot.
   - The resolver gives the setting; the draft's value is written at the row's width.
   - A row with no `ref`, or a `path` calibration does not know, is Unresolved (`unmapped-element`).
   - Rows of other kinds are reported, never written.
   - Box rows (`w`, `h`) name no CSS property, so no setting can hold them: they are never written, listed as derived,
     and close when the spacing that moves them closes. A scored item closes only when its box rows close too.
4. Stop when no row changes or after round 3 (R-47-9).

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
4. Give every node a `cr-ref-<surface>-<n>` class. Generate the walker config from the refs, with `refPrefix:
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
"property": "<css property>", "widths": [375, 768, 1440, 1920], "expected": { "value": "<css value>" } | { "rule":
"<rule name>" }, "reason": "...", "decided": "YYYY-MM-DD <source>" }`

- **A value expectation:** the walker compares live with it instead of the draft. Fill writes it through the resolver
  instead of the draft's value.
- **A rule expectation:** the walker accepts the row. Fill writes nothing for that property and lists it in the
  report. Rule names are listed in `lib/ledger.mjs::RULES` with a one-line meaning each; an unknown rule name fails
  the run.
- **Stale entries:** an entry whose live value now equals the draft, or whose node no longer exists, is stale, and the
  run fails until it is removed.
- **Migration:** a walker config's `accept` entries with only `pair`, `key`, `kind`, `state` and `width` migrate one
  to one. Entries using `when` or `notPainted` (functions) stay in the config and are listed as unmigrated.
- **Accepting a row:** `node scripts/computed-route/ledger.mjs accept <report.json> <row id> --reason "..."` writes
  the entry with today's date; `report.md` prints each open row's id for this.

**Done when:** `node --test scripts/computed-route/tests/ledger.test.mjs` passes, including a stale entry that must
fail the run.

### 3.6 Walker upgrades: `scripts/parity/` (FR-47-6)

These belong to the walker, which stays a standalone tool with no route import. Each is proven with a planted fault
before it counts (GAP-CHECKLIST §11).
1. **Pseudo-element paint:** overlays and tints drawn as `::before` and `::after`, sampled as painted brightness at
   fixed points.
2. **1920** in every standard run.
3. **States:** hover, focus and active on every interactive element of a compared region, not only configured pairs.
4. **Link coverage:** the same text sits inside a link on both sides.
5. **Line counts** sampled during state transitions (header shrink and grow, drawer open).
6. **Divergence ledger:** a config may name one (`divergences: '<path>'`), and matching rows are accepted.
7. **Ref tracing:** when a config sets `refPrefix`, every style row carries:
   - `ref`: the measured live element's nearest ancestor-or-self class with that prefix;
   - `path`: its selector path from that element, as in §3.2.

   Without `refPrefix`, rows are unchanged.

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
| `lib/draft.mjs` | Serves a local draft folder on 127.0.0.1 at an ephemeral port, shut down at exit |
| `solve.mjs`, `fill.mjs` | The two commands |
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
   7 (FR-47-6), with tests.
2. **Footer proof.** Solve (FR-47-3) on Eye Care's footer, with calibration (FR-47-2) of the blocks it uses.
   - **Baseline:** `sites/eye-care-ward-end/build/footer.tree.json` at commit `b7c09adc1`, built to `sgs_footer` 182 on
     eye-care-test and walked with `footer.mjs --headless --widths 375,768,1440,1920`. That `report.json` is the
     "before".
   - **Scored items** (setting values on blocks that already exist):
     - register items 25, 26, 28 and 38;
     - the spacing, size and tracking parts of 27 and 29: the top margins, the tagline margin, the social-row margin,
       the brand column gap, 11.5px, 0.2em, weight 400, line height 1.5, the 4px bottom margin and the 10px column gap.

     An item is closed when the rows for its elements read no open difference at all four widths. The block swaps in
     27, 29 and 30 are outside the proof and must appear as Unresolved or Missing setting.
   - **Success:** all three of these hold.
     - At least 90% of scored items close.
     - Every surviving row's class matches the register's type for its item: tree should have closed, framework
       repair is Hardcode, framework new is Missing setting.
     - No row closed before is open after, and no open row moves further from the draft.
   - **Kill:** under 60% close, over 10% of writes are wrong, or round 3 still writes.
3. **Solve on every built Eye Care surface.** It shrinks the current fix register. Add the functional flows
   (FR-47-7), the remaining walker items (FR-47-6 items 1 to 5) and the full calibration cache.
4. **Fill on an unbuilt surface,** compared with a hand-checked answer.
5. **A second draft** from a different designer, to test generality.
6. **Handover to Spec 31.** Spec 31 decides, under its own plan, whether `sc_var_responsive_bridge.py` is still needed
   once script-rendered drafts route here. This route never edits it.

## 6. Open questions

| Question | Who | When |
|---|---|---|
| Does `wp-build-page.js` support building into a dedicated `sgs_header`, `sgs_footer` or `sgs_drawer` calibration post with `--post-id` as it does for pages? | Answered 2026-10-03: yes. `--post-id` opens `post.php?post=<id>&action=edit` for any post type (footer 182 is rebuilt that way). The footer's blocks need no dedicated post: `sgs/site-footer` has no `parent` lock, so it and its rows calibrate on the calibration page. | Closed |
| Which noindex mechanism does each site already have for the calibration page? | Answered 2026-10-03: none per page (the plugin noindexes only WooCommerce utility pages). The calibration page is built private instead (§3.2). | Closed |
