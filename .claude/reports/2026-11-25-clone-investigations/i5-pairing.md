# i5-pairing: how Fill finds a block's parts in the draft, and whether a structure check or the framework DB would pair them

## Findings first

1. Fill is slot-first, not draft-first. It never searches "this painted draft element, which setting holds its look?" across a block's parts. It reads the draft element a finder names at a part path, and it matches settings to that read by the part path. The finder is supplied by the skeleton stage, which is where the draft-first work happens, and only for painted draft elements a block has absorbed. PROVEN.
2. "No finder names this part" is a part-first audit, so it overstates the loss. It lists every setting of every block part that no finder reached, whether or not the draft draws that part. In Mama's drawer it lists 442 unread rows (1,069 settings); the draft-first count of painted draft elements nobody reads is 6. PROVEN.
3. The pairing step you remember as "never built" is built. A structure tier is in `pairAbsorbed` (commits `7b3c69735`, `1780bf84f`, `334e16b52`) and was in the proof commit `fd06bc065`. The w2-s5 report predates it. It still left Mama's drawer at 8 problems and the lens flow at 10 because it works on a part tree that is incomplete, merges variants, and has lost its words and boxes. PROVEN (offline reproduction below).
4. Neither the structure check nor the framework DB resolves the named cases alone. The framework DB is the weaker structure source: it names parts but gives almost no nesting. What resolves most cases is fixing the part tree (the "site look") and adding two cheap filters, not a new matcher. Counts in the case table.
5. RF1 as planned and as built so far does not change any of this. PROVEN from the branch diff.

## A. From draft element to setting today

**Where the join happens.** A skeleton node carries `draftRef` (the draft element the block copies) and `draftSlots` (`{ "<part path inside the block>": finder }`), see `lib/fill-skeleton.mjs` header. A finder is the walker's way to locate one draft element: a selector, a text match, or a `tpl` key such as `Root>SiteHeader@7#0/77#0`. Fill reads each finder-named element at each width, and `lib/resolve.mjs::resolve` (`tiedBy`) offers a setting only when the setting's recorded part path equals the target's slot. The slot string is the only join between a draft element and a setting. If the skeleton gives an element no slot, Fill never reads it.

**Where the message is raised.** `lib/fill-unread.mjs::unreadOf`, which loops over `cal.settings` (the block's settings) and emits "no draftSlots finder names X, so the draft element these settings paint was never read" for every setting whose slot no finder reached. It cannot know whether the draft has such an element.

**Where draft-first already exists.** `lib/skeleton-paint-conservation.mjs` lists every painted draft element no node reads (`host-unread`). `lib/skeleton-propose.mjs` (the host loop after `conservationRows`) then calls `absorbedSlots` (slot walk) and `lib/skeleton-part-pairing.mjs::pairAbsorbed`, which picks the part each such element is. So draft-first is limited to painted elements a host block absorbed. Every other part is reached only when a rule names it (`lib/skeleton-part-slots.mjs::partSlots`, `rules.<rule>.part`) or the slot walk lands on it.

**Why the named parts had no finder.** Four distinct causes, not one.

| Part | What the proof shows | Cause | Status |
|---|---|---|---|
| Mama's drawer submenu, sublink, sublink marker, caret (about 45 of 91 unread nav-drawer-menu settings, plus 17 caret) | Draft elements 73 to 87 are plain links, each with a trailing 32px "arrow" disc or a pill badge. No accordion, no submenu. | The draft draws no such part. Draft-first agrees: nothing to find. | PROVEN |
| Mama's drawer arrow discs (75, 77, 81, 85, 87) and their caret-box sizes | Each disc "fits" only `caret > svg` and `caret > svg > path`, both inside an accordion summary the draft does not have. | The block's trailing-icon part is not in the default render the "look" is built from, so no part exists to pair with. The part switch `caretBoxOnTrailingIcon` (`data/part-switches.json`) needs that part. | PROVEN |
| Mama's badges (79, 83) and Contact link (86) | Candidates are the same part twice: `.item > .link` and `.item > .accordion-row > .link` (and ornament / link-text under each). | The default render draws two item variants (plain, accordion) at one repetition level, and nothing says the draft has no accordion rows. | PROVEN |
| Social icon sizes (`childIconSize`, `childIconShape`, `childIconShapeSize`, `childIconShowLabel`) | Unread at `.sgs-icon:nth-of-type(1) > .sgs-icon__link` in all five proof Fill reports I opened (Mama's footer; Eye Care footer and drawer; Indus footer and drawer). Mama's footer writes `childIconBorder*` and `childIconBoxShadow` through the row lift but no size. | Unread is proven. Why the row lift (`lib/fill-row-lift.mjs`) writes no size is not: its report shows only a `used-size` settled row for width. | UNPROVEN: read the row lift's read of the icon link at a size setting's slot, with the draft's 32px (or whatever) link |
| Indus mega-panel drawer look | Not examined; I had no record for it. | n/a | UNPROVEN |

**What a draft-first version would do with the same parts.** For each painted draft element, find the part it is drawn as, then read it there. That is exactly what `pairAbsorbed` does for absorbed elements, so a "finder per block part" is not the design flaw; the missing step is that the part list it pairs against is wrong. Draft-first fixes none of the four causes by itself: it would still need a trailing-icon part to pair the disc with, and a way to tell the plain item from the accordion item. It does remove the noise: of Mama's 442 unread rows, most are parts with no draft element, which a draft-first report would never list.

**Does RF1 change this?** No. Plan RF1 states the method (draft-first, "element pairing within a part") but the branch `fix/rf1-match` (`E:\sgs-tmp\wt-rf1-match`, 4 commits on `b5b0dd81f`) did four other things: a variant gate for `featured*` settings (`lib/setting-variant.mjs`, `lib/resolve.mjs`), a cover-layer match so a `::before` hover pill counts as the element's hover (`lib/resolve-layer.mjs`), the restored current-page reader (`lib/fill-current-attr.mjs`, `lib/fill-state-parts.mjs`), and a scrim writer (`lib/fill-scrim.mjs`). It touches neither `skeleton-part-pairing.mjs` nor the look data. The plan's separate item "port measured boxes into the site look" (S12) is the one that bears on this and is not built.

## B. Would the structure check work, and would the DB fit instead?

**The structure check exists and was in the proof.** `pairAbsorbed` decides in rounds: an element pairs inside its enclosing element's part; a wrapper takes the part holding most of its already-placed contents (the tightest of equals); a wrapper of wordless marks takes the part whose shown children are as many marks; a wrapper no part fits is recorded as `flat`, not a problem. `git merge-base --is-ancestor 7b3c69735 fd06bc065` and the same for `1780bf84f` and `334e16b52` are true. The shop track's "structure tier" in `w2-s5/REPORT.md` was built after that report.

**Why it did not hold in the proof.** I reproduced the proof's results offline with the proof worktree's code and a scratch repo (inputs copied from the proof; nothing in any repo was written): Mama's drawer-menu 8 problems and 6 unpaired elements (same as the proof file), Eye Care lens flow 10 and 10 (same), Eye Care drawer 3 (proof file: 2). The commit messages' "8 to 3 to 1 to 0" were measured against the retired measured calibration. Today's record (`lib/setting-record.mjs::readRecord`) returns `elements` from the site look but no `parts`. `calPartsFor` then passes `parts: {}`. I called `partModel` on Mama's nav-drawer-menu look: 27 part groups, 0 with words, 0 with a box, 0 marked hidden. So the words tier (`byWords`) and the place tier (`byPlace`) cannot fire, and `hidden` ignores `display: none`.

**Four defects in the part tree, each proven:**

1. Parts missing. The look is one default render. On Mama's look directory, 677 of 1,092 placed block parts (62%) appear in no element path of their block's look, carrying 2,391 of 6,054 placed settings. For nav-drawer-menu, 16 parts and 48 settings. This is an approximate count (a part counts as absent when its class is in no path). Trailing-icon is one.
2. Variants merged. Plain and accordion items sit at one `:nth-of-type(n)` level.
3. Words and boxes lost (above).
4. Hidden parts not recognised. In the lens-flow look, `.body > .inner > .header` is `display: none` at 375, 768 and 1440, and `.inner > .summary-note` is `none` at 1440 only.

**The framework DB as a structure source.** I queried the DB read-only.

| Table | What it holds | Fit |
|---|---|---|
| `block_part_order` | 512 rows, 71 blocks, part class names in DOM order. Columns `tag`, `parent_part`, `built_by` are NULL in every row. | No nesting at all. 1,063 of 1,398 distinct (block, part) pairs in `setting_placements` (76%) are not in it. nav-drawer-menu has 16 parts and lacks trailing-icon. |
| `motion_targets` | 516 rows; nav-drawer-menu 15 targets including `trailing-icon`; choice-flow 7; form 15. | Names parts the look lacks, no nesting. |
| `block_attributes.css_element` | One part name per setting. `iconColour` is `icon-badge` whatever the badge style. | Cannot tell variants apart. |
| `setting_placements.selector` | The real selector that painted each placement. For `itemTrailingIconPosition`: `.item--drawer:not(.item--has-submenu) > .link:has(> .trailing-icon)`. | The only place that says the trailing icon is a child of a plain item's link. But only 144 of 1,180 placed parts (12%) appear with an ancestor in any selector; 115 carry `:has()`; 160 carry a modifier class. |
| `block_identity_facts` | Facts such as `renders-tag`, `context`, `open-state`. | No structure. |

So the DB cannot replace the structure check. It can add what the default render lacks: part names (`motion_targets`, `setting_placements.part`) and, for the minority of parts with an ancestor selector, where they sit.

**Two filters I tested on the proof's candidate lists** (nothing written; computed from `site-look/*.json` and the proof proposals):

- Drop parts whose `display` is none at every width (including ancestors). Safe, because a part that never draws cannot be what the draft draws. Lens flow: of 9 ambiguity problems, 5 lose at least one candidate; 1291, 1303 and 1308 lose their only candidate (honest "no part draws it", which leaves them unpaired instead of "ambiguous"); none becomes unique.
- Match the draft element's visible widths to the part's. Rejected: 0 of the 9 ambiguity problems got exactly one match with an exact width profile (the block's responsive behaviour is not the draft's), so it would wrongly exclude true parts.
- Variant filter (proposed, not run; reasoning from the candidate text): when no element of a loop in the draft is a summary row (`isSummaryRow`), parts under `accordion*` cannot hold its elements.

## Case table: which approach resolves which case

"Structure" is the built tier. "Data" means building the look from the union of the setting record's fixtures, which adds missing parts. "Filter" is hidden-part pruning plus the variant filter.

| Case | Size (proof) | Structure (built) | Framework DB tables | Fix the part tree and filter | Resolved by neither |
|---|---|---|---|---|---|
| Mama's drawer, pairing problems | 8 | 0 | 0 (no trailing-icon in `block_part_order`) | 3 by the variant filter (86; 79 and 83 narrow to ornament or link-text, and the existing words rule then picks the ornament: not run). 5 by adding the trailing-icon part (75, 77, 81, 85, 87), then the existing switch applies. | 0 if both |
| Eye Care drawer | 2 (3 offline) | 0 | 0 | Likely 2 of 2 by the variant filter (same pair: `.link` or `.accordion-row > .link`). UNPROVEN: needs a check that no EC drawer item is a summary row. | 0 if confirmed |
| Eye Care lens flow, ambiguous | 9 problems, 10 unpaired elements, 18 painted elements host-unread | 0 more than now | 0 | 3 reclassified as "no part" by hidden-part pruning; 0 made unique | 6 problems: wrappers `.inner` vs `.summary` (1317, 1430), the note drawn twice (1429, 1439, one copy hidden at 1440 only), the whole-flow wrapper (1434, 23 candidates). The brief's "6 ambiguous, 7 unpainted" does not match my counts. |
| Indus trade-form step indicator | 13 painted elements host-unread under rule `formSteps` | 0 | 0 | UNPROVEN | The proposal rows give none of the 13 a record or a problem line, and the form node has no `draftSlots`, so pairing placed nothing. The form's look does have 13 progress parts and the DB has 62 progress settings, so the parts exist; why nothing pairs is not proven. What would settle it: log what `pairAbsorbed` returns for host `Root>TradeApplication@466#0/6#0`. |
| Mama's trust-strip icon colour | `iconColour` UNMAPPED on header, footer, home and checkout template (`unpaired-part`) | 0 | 0 | 0 | All. The draft icon is bare (a glyph in the label); the block's default style is `icon-circle`, and `iconColour` is placed on `icon-badge` whichever style (`badgeStyle`: icon-circle, icon-bare). On the checkout template the same block wrote `iconColour` at `.icon > svg`. The part set depends on a setting (`badgeStyle`) the route must choose first, from the draft. |

Totals on the five cases (8 + 2 + 9 + 13 + 1 = 33 items): the built structure check resolves 0 more than it already did, the DB tables alone resolve 0, the part-tree fix plus the two filters should resolve 10 (Mama's 8, Eye Care drawer 2; by reasoning from the candidate text, not run) and reclassify 3 lens-flow elements as "no part", and 20 need something neither approach contains (6 lens-flow, 13 Indus step pieces, 1 trust-strip variant choice).

## Pattern shape and how many other places match

- Conditional part missing from the default render: a (block, part) in `setting_placements` whose class is in no look element path. 677 of 1,092 on Mama's, concentrated in `sgs/account` (396 settings), `sgs/product-card` (162), `sgs/cart` (146), `sgs/buybox` (110). A script can list them with one join of `setting_placements.part` to the look files.
- Variant duplicated at one level: a look path pair that differ only by an inserted wrapper (`.item > .link` and `.item > .accordion-row > .link`). Detect by stripping the wrapper steps and comparing. nav-drawer-menu and nav-bar-menu are the known ones; I did not count the rest.
- Part hidden at every width: any look element whose `display` is `none` at all three widths. Lens flow has several.
- A setting whose `css_element` is one name for two variants (`iconColour` on `icon-badge`): any block with `badgeStyle`-like enum and shared setting names; trust-bar confirmed, others uncounted.

## Calls I made

- Treated the proof worktrees `wt-clone-mm`, `wt-clone-ec` and `wt-clone-in` (commit `fd06bc065` and `c8b4a3f78`) as read-only sources for the proof's Fill reports, proposals, inventories and site looks.
- Reproduced pairing offline by importing the proof worktree's `proposeSurface` against a scratch repo at `E:\sgs-tmp\general-cloning\investigate\i5-pairing\repo` (inputs copied from the proof; `plugins/sgs-blocks/src` is a read-only junction to the main checkout). Outputs in `...\i5-pairing\out`. One surface at a time, with `SGS_NO_SITE=1`. No repository file, DB or site was written.
- Used the proof worktree's Eye Care flow and drawer inventories, not `records-1124`'s, because the `records-1124` flow inventory is older (2026-10-27 against 2026-11-19) and gave 25 problems instead of the proof's 10.
- Judged the variant filter and the "bare icon" explanation from the candidate text and settings tables, not by running them; both are marked as such.
- Did not run the Indus step indicator or social-icon size causes to ground; both are marked UNPROVEN with what would settle them.
