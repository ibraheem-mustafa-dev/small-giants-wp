# i18: why keep Grid on sgs/trust-bar

Read-only. Nothing saved to any site, repo or DB (the browser run aborts any REST write; none was attempted). Scratch: `E:\sgs-tmp\general-cloning\investigate\i18-grid\` (`r.mjs` render script, `r.json` measurements, `shots\<width>-<config>.png`, contact sheets `sheet-375.png`, `sheet-768.png`, `sheet-1440.png`, saved-post dumps in `posts\`).

## Recommendation first

Keep Grid. Mama's home trust bar needs it (equal columns, items centred in each), and the block's own default layout is Grid, so every bar saved without a `layout` value is a Grid bar. Flex stays for what Grid cannot do (one row that never wraps, hide-extras, space-between, centred orphan rows). Do not drop Grid from the render path. If the picker is trimmed, hide Grid only on bars that do not already use it, as already proposed for Default and Stack.

## 1. What Grid does that Flex cannot (PROVEN: real block markup from the block renderer, canary, 5 badges of 12 to 26 characters, `r.json`)

Same five badges, same gap (16px 24px), Flex against Grid:

| Width | Flex (wrap) | Grid with a set template (5 / 3 / 2 columns) |
|---|---|---|
| 1440 | One row. Badge widths 135 to 243px, so centres are unevenly spaced (centre-justified: 317, 491, 717, 948, 1125). | One row, five equal 269px columns. With Justify items centred, centres sit 293px apart (134, 427, 720, 1013, 1306). |
| 768 | Rows of 3 and 2. Row 2 does not line up with row 1: left edges 0, 164, 349 above and 0, 194 below (start-justified); 88, 252, 437 above and 219, 414 below (centred). | Rows of 3 and 2 in the same three 240px columns: left edges 0, 264, 528 above and 0, 264 below. |
| 375 | Rows of 2, 1, 2. The count per row depends on label length, not a setting. | Rows of 2, 2, 1 in two 176px columns, identical lefts on every row (the 2 by 2 shape). |

So Grid gives four concrete things:

1. Equal-width columns. Flex badges are content-sized (135 to 243px wide). The block has no per-badge width or flex-grow control, so Flex cannot make them equal.
2. Columns that line up across wrapped rows. Each Flex row distributes its own leftovers, so row 2 drifts from row 1 at 768 and 375.
3. A column count chosen per device (5, 3 and 2 above; the block default is 4, 4, 2). Under Flex the count is whatever fits.
4. Unequal items sharing column centres (Justify items centred). Under Flex, centre or space-between spaces the gaps, not the centres.

What Flex does that Grid cannot: Grid leaves the orphan left-aligned (default Grid at 1440: 4 badges, 1 alone at the left of row 2), where Flex-centre centres it. Only Flex supports Justify content (space-between), a clean no-wrap row, Hide extras without surprises, and the text-only separator (`style.css` hides the separator under `.sgs-container--grid`). Grid also costs extra CSS for the marquee hold state (`style.css`, the `.sgs-container--grid[data-sgs-marquee-hold]` lane rule).

Mechanism (PROVEN in code): `block.json` `layout` defaults to `grid` with `gridTemplateColumns` 4 / 4 / `1fr 1fr`; `render.php` leaves display, columns and gap to `SGS_Container_Wrapper` (the same grid path as card-grid and feature-grid), so the trust bar carries almost no Grid code of its own.

## 2. Drafts and saved instances

### Drafts (PROVEN, read from `sites/*/handoff/`)

| Client | Strip | Layout in the draft |
|---|---|---|
| Mama's Munches `Home.dc.html` (`trust()`) | Four icon-circle badges under the hero | Desktop (width state `d`): Grid, `repeat(4, minmax(0, 1fr))`, `align-items:center`, each badge centred in its column. Tablet and phone: an `inline-flex` marquee. |
| Mama's `SiteFooter.dc.html` | Tagline words | A marquee (`inline-flex`), always. Flex. |
| Eye Care `Eye Care Birmingham.dc.html` (`sgs-trust-ticker`) | Claims strip above the header | Flex, `justify-content:space-between`, `flex-wrap:nowrap`, as many claims as fit (the draft drops the rest); phone: `max-content` marquee. Flex only. |
| Indus Foods `Indus Foods Website v2.dc.html` | Hero chips (`trustChips`: BRC, Halal, Today's Group) | `display:flex; flex-wrap:wrap; gap:8px`, pill chips with a dot. No icon-plus-text strip elsewhere; "Why choose us" is a card grid and the logo marquee is `sgs/brand-strip`. |
| SGS or MIC drafts | None found under `sites/*/handoff/` (only the three clients above have one). | n/a |

So one draft strip needs Grid (Mama's home), one needs Flex (Eye Care), one is a Flex wrap of chips (Indus).

### What the clone and the builds hold (PROVEN unless marked)

- Eye Care `sites/eye-care-ward-end/build/header.tree.json`: `layout: flex`, `justifyContent` centre, `overflowMode: drop`, marquee for mobile. Flex.
- Mama's `build/trees/footer.json`: `layout: flex`, `flexWrap: nowrap`, marquee `always`. Flex. Mama's header (post 178 on the mirror): flex, marquee `overflow`.
- Mama's home trust bar: `build/skeleton/home.skeleton.json` carries only a title; the bar is recorded in `build/qa/fix-catalogue.md` (Home 6/8/9, Home 36, RM-2) as a hand-built surface, set by hand to `gridTemplateColumns` desktop `repeat(4, minmax(max-content, 1fr))`, `justifyItems` centre, tablet and phone `none`, marquee `overflow`. Item boxes then matched the draft's at 1440 (the catalogue records icon x of 160, 454, 749 and 1040). RM-2 adds a reduced-motion Grid rule (`repeat(2, minmax(0, 1fr))`) on top.
- Clone proposals (`blockchoice/run2/detect-after2`): Mama's home proposes `sgs/trust-bar` by rule `marqueeCodeItems`; Indus home does not propose a trust bar for the chips (UNPROVEN why). Hunt report H2 says the clone leaves trust-bar `layout` unplaced, so what Fill would write for Mama's Grid is UNPROVEN.

### Saved bars on the local mirrors (PROVEN by read-only SQL on `wp_mamas`, `wp_sandybrown`; `wp_eyecare` and `wp_indus` hold none)

| Site, post | Bars | Layout |
|---|---|---|
| Mama's 154 (home) | 1 | unset, so Grid by default, with the template above |
| Mama's 176 footer, 178 header | 1 each | flex |
| Canary 2742, 3405, 3448 | 1 each | explicit `grid`, `repeat(4, 1fr)` with `1fr 1fr` on mobile (the block default) |
| Canary 2242 | 2 | explicit `grid` |
| Canary 5305 (motion-QA fixture), 5957, 2588 | 6, 5, 1 | unset, so Grid by default |
| Eye Care 199 (2026-10-26 backup, `eye-care-test`) | 1 | flex, `icon-bare` |

So 17 canary bars and 1 Mama's bar render as Grid, and 3 render as Flex. Canary 5305 is a protected motion fixture. The Mama's mirror is a copy of the live shop, so post 154's Grid is very likely live too (UNPROVEN: I did not read the live shop).

Caveat: the local mirrors' plugin builds are older than `main` (their renderer rejects an object `justifyContent`), so I ran the renders on the canary, which accepts it. The canary is also not exactly `main`; the two layouts share the wrapper path.

## 3. Recommendation: keep Grid

- Keep `grid` in the Layout type control and keep the block default `grid`. Removing it or changing the default re-renders 18 saved bars here without any setting change, and FP-14 forbids a server fallback, so removal would need a batch sweep for no gain.
- Evidence that needs it: Mama's home bar (draft is a grid with equal centred columns; set by hand with `justifyItems` centre). Flex gets the shape wrong whenever labels differ in width (section 1, uneven centres).
- If Bean still wants Grid out of the picker: show it only when the saved bar is already Grid (the same rule as Default and Stack). Saved Grid bars keep rendering because the Grid path is `SGS_Container_Wrapper`'s, shared with card-grid, so the render does not change.
- Keep for Grid: Columns (per device) and Justify items. Gap and Align items serve both layouts. Justify content has no job under Grid (columns fill the width), as i12 found.
- Downsides to tell Bean: five badges in the default 4-column grid leave an orphan at the left of row 2; Grid bars draw no text-only separator; Hide extras on Grid hides the fifth badge even when it fits. These argue for guidance, not for removing Grid.

## Calls I made

- Used the canary (not the older local mirrors) for the renders, and injected the block renderer's markup into the canary homepage as a fixed overlay for the screenshots (nothing saved).
- Treated "unset layout" as Grid, because `block.json` defaults it to `grid`.
- Counted only `sites/*/handoff/` drafts; no SGS or MIC draft exists there.
- Did not read the live Mama's shop; relied on the mirror's refresh note.
