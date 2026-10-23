# Second client header walk: Eye Care, walker before and after Phase 0

Config: `sites/eye-care-ward-end/build/qa/parity/header.full.mjs` (identical at both commits), live `https://darkcyan-grouse-898606.hostingersite.com/` (read only), 4 widths x 7 states = 28 runs. Before = walker at `62c6ed2e8` (detached worktree on B:), after = walker at `8d031622f` (this branch). Both ran `--headless --no-review`; raw outputs stay in `.claude/scratch/` and are not committed. `rows.json` holds every row with group, pair, property, state, widths, draft value, live value, verdict, scope, owner, register id and confidence.

## 0. How the walk had to be run

1. The config names `https://mintcream-lyrebird-224487.hostingersite.com/` as the draft. That host is now a WordPress test site (the hosted draft was replaced on 2026-10-23), so the unmodified command crashed in both walkers with the same line: `page.evaluate: TypeError: Cannot read properties of null (reading previousElementSibling)` (the config trust-ticker draft finder, `document.querySelector("header")`, finds no header on a WordPress page). Not a walker defect.
2. Fix used for both walks: serve `sites/eye-care-ward-end/handoff/` (entry `Eye Care Birmingham.dc.html`) with `scripts/computed-route/lib/draft.mjs::serveDraft` and run a throwaway wrapper config (`export default { ...base, draft: { url } }`, deleted after the run) against each worktree. Nothing in `sites/` changed. The config hard-coded `DRAFT` constant is now stale: filed to S in section 4.
3. Both walkers import Playwright from `plugins/sgs-blocks/node_modules`, which a fresh worktree lacks (`npm ci` in `scripts/computed-route` installs it elsewhere). Real copies of `playwright` and `playwright-core` (1.58.2) were placed in each worktree `plugins/sgs-blocks/node_modules` (gitignored, no links).
4. The config header says its states run at set widths (mega panels at 1440, drawer at 375 and 768, scrolled at 1440). `header.full.mjs` walks every state at every width, so some rows come from states that are a no-op or inherit the previous state. Those rows are `scope: out` and kept apart from the in-scope counts (section 2.4).

## 1. Counts

| | before (62c6ed2e8) | after (8d031622f) |
|---|---|---|
| open rows, all 28 runs | 3120 | 3520 |
| accepted rows | 67 | 58 |
| open rows in the documented state x width runs | 2676 | 2999 |
| open rows outside them (no-op or carried-over states) | 444 | 521 |
| live console errors / unreviewed shots (review skipped) | 0 / 0 | 0 / 0 |

Row identity is width, state, pair, ref, element path, part, kind and key: 2899 rows are in both walks (36 with a changed draft or live value), 221 are gone after, 621 are new. By kind, before to after: link 91 to 5, part 0 to 256, effect 0 to 41, style 996 to 1114, box 159 to 205, hover 32 to 38, focus 50 to 58, active 5 to 11, auto 1635 to 1631, the rest unchanged.

### Groups (pair, property family, state)

| verdict | groups, all runs | groups, in-scope runs | rows, in scope |
|---|---|---|---|
| gone | 24 | 27 | 164 |
| surviving | 677 | 633 | 2512 |
| new | 288 | 229 | 487 |

A group is surviving when any of its rows is in both walks, new when all its open rows are new, gone when every row is gone.

## 2. Walker artefacts found on this client

Attribution of gone rows and every owner below is by row pattern (property, direction of the values, pair), not by mutating the walker; a candidate says so. I did not re-walk Indus, so "not seen on Indus" rests on the plan statement that its rows were proven, not on a check of mine.

### 2.1 N3: parts paired by accessible name split one link in three (after-walk only, 129 rows, 58 groups)

The new parts pass pairs interactive parts by name. Where the two sides name the same link differently, one link yields `X present / missing`, `Y missing / present` and `(unnamed a) missing / present`. Example, `header-logo-group` at 768, closed: the draft names it `eye care birmingham`; live names it `go to eye care birmingham (sgs test) hom` (live aria-label "Go to Eye Care Birmingham (SGS test) home"). The cause here is label text (a test-site suffix, site content), so Indus may not have it; the walker still turns a label difference into presence rows instead of pairing the one link and reporting the label as a text row. Owner W (pair parts by position or draft identity when names differ), with the label itself S. Sample: header-logo-group (part:eye care birmingham presence, closed @768): draft present / live missing

### 2.2 N11: root pair reads text on one side only (after-walk only, 117 in-scope rows, 63 groups; 117 across all runs)

`gen-header-1` (draft `Root/14#0`, live `.cr-ref-header-1`, `text: false`) now reports nine text properties with a draft value and live `undefined`: gen-header-1 (style:font-family, mega-shop @375): draft "Playfair Display", serif / live null. The same rows were not in the before-walk for this pair. The header root has plenty of live text, so `undefined` means the live read was told the text belongs to an inner pair while the draft read still found the wordmark text. Candidate regression from the readOpts text-ownership change (`230daa592`); not proven, it needs a probe of `collect.mjs::collectPair` on both sides for that ref. Owner W. To reproduce: run the wrapper config above with the after walker, `--widths 375 --states mega-shop`, and read `gen-header-1` in `report.md`.

### 2.3 N10: border colour compared where the border has no width (43 open rows)

On `gen-header-1` the draft border-bottom is `0px` (colour `rgb(20, 20, 20)`, the inherited text colour) and live is `1px` `rgb(230, 225, 218)`. The width row is the real difference; the colour row duplicates something that does not paint on the draft (GAP-CHECKLIST section 8). Sample: gen-header-1 (style:border-bottom-color, mega-shop @1440): draft rgb(20, 20, 20) / live rgb(230, 225, 218). Owner W (skip a border colour whose width is 0 on that side).

### 2.4 N12: states that find nothing or inherit the previous state (both walks; 521 after-walk open rows outside the documented runs)

The walker runs states in sequence on one page and does not close what the previous state opened. Evidence: `pair-375-scrolled.png` (after run) shows the open navigation drawer on both sides in the `scrolled` state, so that shot measures the drawer. Measured effect: `y-in-main` for `header-bar` is draft 294 against live -69 at 375 (draft scrolled 400px, the live page locked by the open modal dialog) and 294 against -85 at 768, while at 1440 and 1920, where the drawer never opens, it is 294 against 299. The same 29 `y-in-main` rows are in both walks, so this is not new. Owner W (refuse or auto-close; lint a state x width that finds nothing). The config comment already says `scrolled` is desktop only. Rows at the wrong width: drawer-open at 1440 and 1920 (81 each), scrolled at 375 (75) and 768 (72), each mega state at 375 (25) and 768 (28).

### 2.5 Not artefacts, but easy to misread

1. `header-logo-group` text rows with live `undefined` (72 rows, in both walks): the draft wordmark is text and live paints an image, so nine text properties repeat one fact (N8, owner S, brand text is the logo block).
2. N9, the focus ring, is 1057 in-scope rows from one fact (draft: browser default 1px `auto` outline in `rgb(156, 139, 120)`; live: 2px solid ring plus halo), multiplied across five properties, the first 60 interactive elements and every state. W11 (census by mechanism) is the cure; per-row counts overstate it about a hundred times.

## 3. Gone after (221 rows, 102 groups): artefacts the walker fixed

| removed by | rows | groups | what the rows were | proof level |
|---|---|---|---|---|
| W6 | 86 | 5 | link ids compared before (a draft root id against a live id) are not compared now; links are read with the lifted exclusions; e.g. (links) (link:id "eye care birmingham", closed @375): draft dc-root / live sgs-shr-fea3cb1b | inferred |
| W4 | 65 | 61 | a nested block text read by an outer pair is no longer compared against the outer pair; e.g. header-bar (style:font-family, closed @375): draft "Playfair Display", serif / live Outfit, system-ui, sans-serif | inferred |
| W1 | 55 | 27 | paint read from the calibrated inner part, not the block root; e.g. header-bag (style:border-top-width, closed @375): draft 1px / live 0px | inferred |
| unattributed | 7 | 4 | gone after; no W1 to W10 mechanism proven from the row alone; e.g. (entrance) (entrance:entrance "0", closed @768): draft 0-140ms / live 0-441ms | none |
| W2 | 4 | 2 | transform spelling composed before comparing; e.g. drawer-link-sunglasses (style:translate, drawer-open @375): draft none / live 0px | inferred |
| W3 | 4 | 3 | timings compared by property name; e.g. brands-trigger (style:transition-timing-function, mega-brands @1440): draft ease / live cubic-bezier(0.25, 0.1, 0.25, 1), cubic- | inferred |

W1 evidence: the bag pill border (`border-top-style` solid, radius 999px) was read on the block root (live `none`, `0px`) and the header root border-bottom read draft 0px against live 1px; both are gone once paint is read from the inner part. W4 evidence: the cart pill label text rows (`Playfair Display` 18px against `Outfit` 12.5px) were reported on `header-bar` and `gen-header-1` as well as on the pair that owns them. The 86 link rows were `id` comparisons of the draft runtime root id (`dc-root`) against a live generated id (`sgs-shr-...`); links fell from 91 to 5 rows, but I did not trace which Phase 0 commit removed the id comparison, so W6 is the nearest register row, not a proof. W5, W7/W8, W9 and W10 removed no groups here: W9 and W10 added the part and effect rows in section 4.

## 4. Surviving and new: filed with owners (in-scope rows only)

Confidence is `pattern` throughout: the row matches the register row property and value signature; I did not trace each to code. R1 to R12 and W7/W8 are the plan ids; `new:N1` to `new:N11` are findings the register does not name.

| register | owner | rows | groups | surviving | new | what the rows are | example |
|---|---|---|---|---|---|---|---|
| new:N9 | R | 1057 | 78 | 1047 | 10 | Focus ring: draft 1px auto outline, live 2px solid plus a halo box-shadow; one fact multiplied across the first 60 interactive elements, five properties and every state. | drawer-close (style:outline-style, drawer-open @375): draft none / live solid |
| new:N2 | R | 281 | 91 | 265 | 16 | Both sides set a value and they differ: focus text colour cream against black, ink 20/20/20 against 0/0/0, ground alpha 0.9 against 1, line-height. | trust-ticker (style:font-size, closed @375): draft 12.5px / live 13.925px |
| new:N7 | R | 242 | 40 | 242 | 0 | Painted position and vertical flow offsets that follow the box rows. | header-bag (box:text-inset-x, closed @375): draft 35 / live 15 |
| new:N1 | R | 217 | 87 | 165 | 52 | A block default painted where the draft sets none (the non-hover R1 mechanism): focus underline, ground, backdrop blur 16px, background-image, border-bottom 1px. | header-bag (text:text, closed @375): draft 0 / live BAG 0 |
| R6 | R | 209 | 113 | 167 | 42 | Size keywords and logo and group sizing: logo max-width none against 100%, logo group 164px against 181px at 375, grid columns, bag width 44 against 87. | header-bar (style:grid-template-columns, closed @375): draft 68.7188px 164.281px 94px / live 38px 180.5px 92.5px |
| R5 | R | 197 | 99 | 197 | 0 | Padding judged default or held: trust ticker 11px against 0, header bar 16px against 0, menu button -8px margin. | trust-ticker (style:padding-top, closed @375): draft 11px / live 0px |
| R1 | R | 148 | 62 | 32 | 116 | Default hover not cancelled: live nav items add an animated cover, a 58x1 gradient underline layer and hover colours the draft lacks; drawer links lift -3px; bag circle. | menu-button (active:color, drawer-open @375): draft rgb(0, 0, 0) / live rgb(20, 20, 20) |
| R8 | R | 126 | 65 | 122 | 4 | Transitions as one duration: header bar padding list against background-colour list; logo 0.35s against 0s. | header-bar (motion:transition, closed @375): draft padding 0.35s cubic-bezier(0.2, 0.7, 0.2 / live background-color 0.35s cubic-bezier(0.2, |
| new:N8 | S | 108 | 32 | 108 | 0 | Draft wordmark is text; live paints an image (text-missing and text-extra, plus nine text properties read as undefined per width and state). | header-logo-group (style:font-family, closed @375): draft "Playfair Display", serif / live null |
| new:N3 | W | 91 | 49 | 0 | 91 | Walker artefact (section 2.1): one link becomes presence rows on both sides because its accessible name differs. | header-logo-group (part:eye care birmingham presence, closed @768): draft present / live missing |
| R7 | R | 63 | 30 | 42 | 21 | Declared value dropped: letter-spacing 1px and 0.5px against normal, border-bottom 1px against 0, shop panel max-width 1440px against none, logo aspect-ratio. | trust-ticker (style:letter-spacing, closed @375): draft 0.5px / live normal |
| new:N11 | W | 63 | 27 | 0 | 63 | Candidate walker artefact (section 2.2): root pair reads wordmark text on the draft and nothing on live. | gen-header-1 (style:font-family, drawer-open @375): draft "Playfair Display", serif / live null |
| new:N4 | R | 43 | 21 | 0 | 43 | An interactive part present on one side only (sign in at 768, help and the nav items at 1440). | header-bar (part:sign in presence, closed @768): draft present / live missing |
| R12 | R | 40 | 20 | 40 | 0 | Drawer entrance: panel opacity keyframes 0.3s and the link stagger (A-37, A-12/14/39). | drawer-panel (motion:keyframes, drawer-open @375): draft 0%{opacity:0}100%{opacity:1} / live none / none / none / none / none / 0%{-- |
| new:N10 | W | 39 | 22 | 10 | 29 | Walker artefact (section 2.3): border colour of a border with 0px width on one side. | gen-header-1 (style:border-bottom-color, mega-shop @1440): draft rgb(20, 20, 20) / live rgb(230, 225, 218) |
| W7/W8 | R | 36 | 16 | 36 | 0 | Pairing: gen-header-10 pairs a draft inline span with a live block div. | header-wordmark (presence:element, closed @375): draft missing / live present |
| R4 | R | 21 | 11 | 21 | 0 | Gap per tier: trust ticker gap 0 against 32px. | trust-ticker (style:column-gap, closed @375): draft 0px / live 32px |
| new:N6 | S | 14 | 2 | 14 | 0 | Trust ticker icon count 1 against 5. | trust-ticker (inventory:media "free uk delivery over £75, or ", closed @375): draft svg/1 / live svg/5 |
| new:N5 | S | 4 | 3 | 4 | 0 | Link target or label content (WhatsApp number, aria-labels): site content. | (links) (link:aria-label "eye care birmingham", closed @375): draft Eye Care Birmingham home / live Go to Eye Care Birmingham (SGS test) hom |

Register rows seen or not seen on Eye Care: R1 gains 116 new rows from the parts and effects passes (nav item hover cover and gradient underline layer on `brands`, `lenses`, `sunglasses`: draft `none`, live `animated cover`; `header-bag` `bag 0 hover` draft `none`, live `animated circle`). R9 (draft sheen and ripple missing on live) did not appear: this header has no CTA pair, so R9 and the W10 CTA case are untested on Eye Care. R2 (doubled lift) did not appear: the only transform rows are drawer links, draft `none` against live `matrix(1, 0, 0, 1, 0, -3)` on hover (R1). F1 (44px floor) is not confirmed: `header-bag` is 44 against 87 wide at 375, the live bag is wider, the opposite direction.

### Summary by owner (in-scope open rows 2999)

| owner | rows | groups | registers |
|---|---|---|---|
| R | 2680 | 727 | new:N2, R7, R5, R4, R6, R8, W7/W8, new:N1, new:N7, R1, R12, new:N9, new:N4 |
| W | 193 | 98 | new:N10, new:N11, new:N3 |
| S | 126 | 37 | new:N6, new:N8, new:N5 |
| F | 0 | 0 | none matched the F1 signature |

Track R owns the bulk (Fill writes, resolver, pairing in `lib/pairs.mjs`). Track W owns the artefacts N3, N10, N11 and N12 and W11. Track S owns the content rows (N5, N6), the wordmark (N8) and the stale `DRAFT` constant in `header.mjs`, which points at the replaced hosted draft; the config should take the handoff folder served by `serveDraft`, as `gate-chain.mjs` does.

## 5. Out-of-scope rows

521 open after-walk rows come from a state at a width where it is a no-op or inherits the previous state (section 2.4). They are in `rows.json` with `scope: out`, duplicate the `closed` rows or measure the open drawer, and are not counted in section 4.
