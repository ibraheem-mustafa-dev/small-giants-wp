# Site look: what differs per client, where the time goes, what a draft uses

Data: newest complete sets in `E:/sgs-tmp/wt-baseline/scripts/computed-route/site-look/<client>/` (11-26, 100 blocks common to all three clients; scripts and plan output in `E:/sgs-tmp/look-measure/`). Nothing built; no tracked files touched.

## 1. Client independence (100 common blocks, Eye Care vs Indus vs Mama's)

| Field | Share of entries identical across the 3 clients | What differs |
|---|---|---|
| `pathClasses`, `pathAttrs`, `presence`, `text`, `link`, `noMarker` | 100% (1843, 342, 113, 117, 10 entries; all blocks) | nothing: they come from markup, not tokens |
| `settingFacts[*].forms` | 100% (83 of 83 blocks) | nothing |
| `settingFacts[*].look` (state looks) | 75% of entries; shape identical in 83 of 83 blocks | values only (404 entries) |
| `discovered` | 86% of entries (540 of 629); identical shape in 79 of 100 blocks | values; in 21 blocks a property is listed for one client only, because an option value changes paint under that client's tokens and not under another's |
| `elements` (default paint) | 94.3% of (selector, width, property) cells (686,542 of 728,130); only 11% of (selector, width) entries and 0 of 100 blocks identical, because each entry holds ~140 properties | 41.6k cells |
| `paintStates` | 1 of 6 entries; shape identical in 4 of 5 blocks | values |

The same 1,957 selectors exist for every client: no client CSS added or removed an element. No `variants`, `reaches` or top-level `forms` key exists in these files (forms live inside `settingFacts`).

Of the 41.6k differing paint cells: 88% colour (86% of all are the text colour repeated in border, outline, text-decoration and text-stroke colours); 98.4% of colour differences are exactly a colour in that client's own snapshot palette. 9% are lengths (font size, padding, gap, radius, durations); 3% type (font-family, weight, letter-spacing). Not one of the 51 differing properties is a layout property (display, position, flex, grid). A single value-to-value map per property explains 93 to 96% of the differing cells between any two clients (a lower bound: the rest are collisions where two tokens coincide in one client). So paint differences are token resolution, not structure.

Cost by field (bytes of the look): elements 77%, discovered 12%, settingFacts 7%, paintStates 2%, rest 2%.

## 2. Where a build's time goes

- Per block: one PHP render per marked job, cached by block code and attributes (the key excludes the snapshot, so renders are shared across clients), then per job a cascade page (parse, rule match, settle) read at 375/768/1440 for every element and about 139 properties. Pages are per client (site CSS differs). The `Reader` keeps 8 pages.
- Jobs per client from `site-look-bridge.mjs plan`, 102 blocks: **19,423** marked renders (avg 190 a block, median 77): forms 11,168 (57%), discover 3,649 (19%), states 3,309 (17%), content 1,297 (7%). Default instances add only a few a block.
- Wall time (from file times, 2 workers): Eye Care 1,784 s, Mama's 1,247 s (warm render cache); under load 3,167 s (reclone log). No per-block timings are logged. My per-block figure is calibrated, not measured: cost = renders x selectors, scaled to Eye Care's 1,784 s. Cross-check: the README says nav-bar-menu takes ~600 s warm and alone; the model gives 289, so heavy blocks may be 2x higher.
- Slowest 10 (one-worker seconds): choice-flow 489, form 390, buybox 326, nav-bar-menu 289, cart 235, trust-bar 206, nav-drawer-menu 185, google-reviews 180, timeline 162, product-card 143. These 10 are 73% of the build. File-time gaps agree on choice-flow, nav-drawer, mega-panel, timeline.
- By cost, forms are 63%, states 19%, discover 13%, content 5%; the forms loop produces 1% of the bytes.

## 3. What a draft uses

Blocks in the proposed trees (baseline-main sweep): Eye Care 19 surfaces, union 51 blocks, per surface median 6, max 21; Indus 32 surfaces, union 46, median 11, max 17; Mama's 15 surfaces, union 53, median 10, max 17. Union over the three clients 79; used by all three 24.

`prepareProposalLooks` (skeleton.mjs, skeleton-rerun.mjs, intake-skeletons.mjs) and `prepareSweepLooks` build **all 104** `sgs/*` blocks for the client, for any surface; the stated reason is that propose reads looks before the tree is known and `siteLook` alone builds one block at a time. Only `assertPaints` (Fill, apply) builds just the tree's blocks. From the call sites, propose reads looks only for chosen and rule-named helper blocks, never for rejected candidates, and the baseline-main log shows proposes finishing for blocks that had no look. So the all-block build is a convenience, not a need (not exhaustively proven).

## 4. Estimated build time (model above, 2 workers, wall)

| Option | One client | Three clients | Assumptions |
|---|---|---|---|
| Today | 1,784 s (30 min) | 5,350 s | Eye Care measured; 1,247 s with a warm render cache |
| (a) forms + content once per framework | 570 s (9.5 min) | 1,214 + 3 x 570 = 2,924 s (-45%) | forms and content are client-independent (true for these 3; a client's custom CSS could break it, so spot-check) |
| (b) only blocks the client's draft uses | 784 to 1,343 s (-25% to -56%) | ~3,400 s | used blocks include the heavy ones (nav-bar-menu, container, cart, product-card) |
| (a)+(b) | 280 to 421 s (5 to 7 min) | 1,214 + 1,100 = ~2,300 s | discover + states for used blocks only |
| (a)+(b) per surface, lazy | median 18 to 59 s a surface, max 75 to 138 s | | builds once a block, cached for later surfaces |
| (c) as (a), plus discover/states once with sentinel tokens and substituted | seconds a client | ~1,800 s once | colours and font families substitute exactly; lengths scaled from base size need a rule; unproven |

## Ranked cost drivers
1. The forms loop: 57% of renders, 63% of cost, 1% of output, identical across clients.
2. Eager all-block build: 104 blocks built where a client uses 46 to 53, and 5 to 18 are needed per surface.
3. A handful of large blocks (top 10 = 73%), each read at ~19 to 187 selectors per page.

## Redesign options (recommended order)
1. Build forms and content once per framework (-45% for three clients, -68% each further client). Lowest risk.
2. Build only the chosen and helper blocks, lazily, replacing the all-block prepare calls. Largest per-draft saving once combined with 1.
3. Make the paint-only part (discover, states) a token substitution (option c). Largest gain, needs a length rule and a proof.

Calls made: used the 11-26 wt-baseline set as the newest complete one; counted blocks from `*.nodes.json` in baseline-main (no committed skeletons exist for Indus or Mama's); per-block seconds are modelled, not logged.
