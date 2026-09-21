# Adversarial review of the master family list (before W3B-5 sign-off)

**Reviewed:** `FAMILIES-MASTER.md` + `families-master.json` (50 masters, 17 units, 14 decisions, 33 verifications), the three source lists `families-A/B/C.json`, and the plan sections Wave 3B / Wave 3C in `.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`.
**Method:** every claim below was re-read against either the raw capture cell (`<reference>.json` → `rows[surface,tier].cells[column]`) or the tree (`block.json`, `render.php`, `style.css`, `includes/*.php`, `src/shared/nav-interactivity/*.js`). Commands are given inline; paths are relative to the repo root. Read-only: nothing in the tree or in the reviewed files was changed.

**Fact-check tally.** `needed_by` claims checked against raw cells: **15, of which 14 match and 1 mismatches** (finding 4). `sgs_coverage` statuses checked against `block.json` + code: **14, of which 9 hold, 3 are wrong in status or covering mechanism (findings 1, 3, 7) and 2 carry a wrong number under a VERIFIED badge (finding 21)**.

---

## Findings, ranked by severity

### CRITICAL (each blocks signing on its own)

**1. M-27 "Close-control model: covered" is wrong, and the owner's W3C-2 target is not expressible.**
Nine of thirteen references replace the burger in place with the header still visible and **no close control inside the drawer** (`families-B.json::F-B-19.values_seen[0]`: away@375, rabbit@375, buck, dogstudio, fantasy, lamalama, lusion, studionamma; plus wearecollins). The master maps this to `closeStyle='burger-morph'` + `anchor='header'` + `modality='non-modal'`. But the drawer's own × button is emitted unconditionally: `plugins/sgs-blocks/src/blocks/nav-drawer/render.php` — comment at the closeStyle block reads *"The × button itself remains fixed, undeletable chrome in EVERY style (FR-36-6)"*, and `$close_html = sprintf('<button type="button" class="sgs-nav-drawer__close" data-sgs-nav-close…` is built with no guard. `burger-morph` styles **that in-drawer button** as a 2-bar glyph; it does not remove it (same comment: *"It does NOT animate the header burger"*; the bar's own X morph is `nav-bar-menu/style.css::.sgs-nav-bar-menu__burger[aria-expanded="true"]`). So a clone of any of those nine renders a second close control the reference never had. M-26's own note admits it ("InnerBlocks plus the undeletable close button") while M-27 still reads covered. Command: `grep -n "undeletable\|data-sgs-nav-close" plugins/sgs-blocks/src/blocks/nav-drawer/render.php`.
*Effect:* the plan's W3C-2 ("the drawer omits a separate top close row where they omit it") has no family that builds it, and the list says nothing is missing. *Fix:* set M-27 to **conflict** (an always-on chrome element vs 9 measured absences), add a build item "drawer close-control presence per closeStyle / per tier" (in U-11 or U-9), and add an owner decision (finding 13) because FR-36-6 was an accessibility choice.

**2. The `independent` flag is wrong on 11 of the 14 units marked `yes`; only U-12, U-15 and U-17 have disjoint files.**
The doc defines `independent` as "the unit's files are disjoint from every other unit's". Computed from `families-master.json::units[].files` (script: pairwise set intersection, plus directory containment), the pairs where **both** sides are flagged `yes` and still share a file are:
- U-1 × U-2 and U-1 × U-8: `mega-panel/render.php`, `mega-panel/block.json`
- U-1 × U-6, U-1 × U-7, U-1 × U-9, U-1 × U-10, U-6 × U-7, U-6 × U-9, U-6 × U-10, U-7 × U-9, U-7 × U-10, U-9 × U-10: `includes/nav-menu-markup.php` (seven "parallel-safe" units edit one 500-line builder)
- U-2 × U-3, U-2 × U-11, U-3 × U-11: `nav-drawer/render.php` + `nav-drawer/block.json`; U-2 × U-9, U-3 × U-9: `nav-drawer/block.json`; U-2 × U-10, U-3 × U-10, U-10 × U-11: `nav-drawer/render.php`; U-2 × U-9: also `store.js`
- U-3 × U-4, U-3 × U-6, U-3 × U-7, U-4 × U-7, U-6 × U-7: `nav-drawer-menu/block.json`
- U-4 × U-6, U-4 × U-9, U-4 × U-11, U-6 × U-9, U-6 × U-11, U-9 × U-11: `nav-bar-menu/block.json`
- U-4 × U-6, U-4 × U-7, U-4 × U-8, U-6 × U-8, U-7 × U-8: `includes/nav-menu-submenu-css.php`
- U-1 × U-16: `site-header/block.json`
*Effect:* the Wave 3C lane rule ("families with disjoint files in parallel") would dispatch colliding agents on the first day; the project's own memory records that two parallel agents on one file is a data-loss pattern. *Fix:* recompute the flag from the file lists (the JSON already holds them); group into lanes by file ownership — a nav-menu-markup lane (U-1, U-6, U-7, U-9, U-10 serial), a nav-drawer lane (U-2, U-3, U-11, U-5 serial), a site-header lane (U-1 header half, U-13, U-14, U-16 serial), and the three genuinely disjoint units.

**3. M-08 is inflated from one reference to five, and the "13 of 13" support on U-14 is borrowed from a family that is mostly covered.**
M-08 claims five references. Its sources: F-B-24 (buck only — its own note: *"One reference out of 13 needs it"*), F-A-19 (six unrelated pinned things), the resn shell-less residual, and studionamma's bottom strip. But the bottom strip is **already covered**: `sgs/notice-banner::stickyPosition` has enum `["top","bottom"]` and `notice-banner/style.css::.sgs-notice-banner--sticky-bottom{bottom:0}` under `.sgs-notice-banner--announcement{position:fixed}` (command: `grep -n -A2 "sticky-bottom" plugins/sgs-blocks/src/blocks/notice-banner/style.css`). M-06 routes that same residual to M-08 as a gap. lamalama's "card pinned top-right" and lusion's "scroll indicator" are decorative pinned elements, not header controls. The one genuine "trigger outlives its header" case is buck. U-14 then reports "up to 13 of 13" because it also lists M-39, whose 13 references are covered except two values. *Effect:* a 1-reference structural change to the header wrapper (design-gated, `high`) is ranked as if 13 references needed it. *Fix:* M-08 needed_by = buck (+ resn under DEC-01); M-06 → covered for studionamma via `stickyPosition:'bottom'`; report unit support as the union of the **uncovered** values, not `max(family.needed_by)` (see finding 10).

### HIGH

**4. Fact-check mismatch, M-14: "All four references with a real scrim CHANGE it per tier" is false.**
`lamalama.json` drawer ground: 375 → `scrim: "#000000 @0.4, backdrop-filter blur(16px)"`; 1440 → identical string. lusion changes (opaque `#0016ec` at 375/768, right-half gradient at 1440); away changes (`@0` at 375, `@0.5` at 768); butcherbox was measured at **375 only** (`families-C.json::F-C-06.needed_by` → tiers `[375]`), so it cannot show a per-tier change. Two of four, not four of four. The sentence is copied from `F-C-06.sgs_coverage.gap`. *Fix:* "two of the four" — the per-tier requirement still stands on away and lusion.

**5. U-13 names a file that does not exist; the header scroll runtime lives elsewhere.**
`plugins/sgs-blocks/src/blocks/site-header/view.js` is absent (`ls plugins/sgs-blocks/src/blocks/site-header/` → block.json, components, edit.js, editor.css, float-preview.js, index.js, render.php, save.js, style.css). The hide/shrink/transparent runtime is `plugins/sgs-blocks/src/header-behaviours/view.js`, enqueued by `includes/class-sgs-header-behaviours.php::enqueue_assets` (`$js_src = SGS_BLOCKS_PATH . 'src/header-behaviours/view.js'`). *Effect:* the direction-keyed restyle (M-03) and section-adaptive ink (M-04) would be built into a new file beside a runtime that already owns scroll observation, and U-13's collision analysis is computed on the wrong file. *Fix:* replace the path; note that any unit touching `headerSticky/HideOnScroll/Transparent` semantics also touches this shared IIFE.

**6. M-31 merge rests on "both are an enum" — but the MEGA panel has no entry-animation attribute at all.**
`sgs/nav-bar-menu::submenuAnimation` reaches only the dropdown fork: `includes/nav-menu-markup.php` line ~282 appends `sgs-nav-bar-menu__submenu-wrap--{animation}` on `__submenu-wrap`; the mega context (lines 136–146) carries `isOpen/megaId/intentDelay/closeGrace` and nothing for motion; `mega-panel/block.json` attributes matching `anim|motion|stagger` → `['staggerOnOpen']` only. So the halcyon/indus 340 ms panel entry (DEC-10 says it is a real requirement) has no attribute on the surface that renders it. *Fix:* M-31 covered_by must say "dropdown fork only; mega fork: none"; U-5's file list must include `includes/nav-menu-markup.php` (mega context) — it currently does not.

**7. M-45 "one typography emitter serves the bar, the drawer and the footer" is false, and the footer half is owned by no unit.**
The three surfaces use three emitters: `includes/nav-menu-submenu-css.php` (bar), `nav-drawer-menu` (drawer), and `sgs/business-info::fontSize` (object) + `::fontSizeUnit` (string, default `px`) on a separate block. U-4's files are `nav-bar-menu/block.json`, `nav-drawer-menu/block.json`, `nav-menu-submenu-css.php` — `business-info` is absent, and footers hold many blocks besides business-info. *Fix:* either drop "footer" from M-45/U-4 and record footer type scaling under M-12, or add the footer emitter(s) to U-4.

**8. M-13 merges six sources into "one ground vocabulary", but the covering attributes diverge by NAME and TYPE across the four blocks — and that divergence is exactly what the composite-mirror rule calls a bug, and no unit fixes it.**
From `block.json`: fill = `site-header::backgroundColour` / `mega-panel::panelBg` / `nav-drawer::drawerBg`; blur = `site-header::backdropBlur` (string length) / `mega-panel::bgBlur` (**boolean**) / `nav-drawer::surfaceBlur` (string); radius = `mega-panel::borderRadius` (**string**, default `20px`) vs `site-header::borderRadius` and `nav-drawer::borderRadius` (tier objects `{desktop:{}}`); shadow = `site-header::shadow` exists, `mega-panel` has **no** shadow attribute (hardcoded). U-1 only de-hardcodes literals; nothing aligns the vocabulary. The merge test in the doc ("ONE block attribute or mechanism would express both sides") therefore fails for M-13. *Fix:* keep the family but list the per-block divergence table as its gap, and give U-1 (or a new unit) the alignment task with the tier-object shape as the target.

**9. Missing family: a header band that does not intercept the page (pointer pass-through / zero-height shell).**
dogstudio measured `headerPointerEvents: "none on the band, auto on logo and burger"` at all three tiers (`dogstudio.json` header-shell archetype); lamalama's `<header>` measures 0 px high with a fixed child pill (`lamalama.json` header-shell 375 archetype raw `headerElementRect.height: 0`); studionamma's shell is "text only, no painted box". This is also the mechanism that makes resn clonable **as a header** under DEC-01(b) — a landmark `<header>` whose band is inert with pinned live children — which the M-02 note treats as impossible ("sgs/site-header always renders a <header>"). No `pointer-events` attribute exists on site-header (`block.json` attribute scan). *Fix:* add a family (band pass-through, per tier) needed by dogstudio, lamalama, studionamma, resn; it shrinks M-08 further.

**10. The unit "support" column is `max(family.needed_by)` and misleads the order.**
U-9 "up to 13 of 13" — three of its six families are conflicts that ship no code. U-1 "up to 13 of 13" from M-13, whose actual uncovered values name five references. U-14 (finding 3). *Fix:* support = references with at least one **uncovered** value in the unit's families; re-sort.

**11. Two family pairs are split across units that edit the same object.**
M-44 (U-1) and M-43 (U-9) both land in the mega interactivity context array in `includes/nav-menu-markup.php` (lines 136–146: `intentDelay`, `closeGrace`; the open-mode enum goes beside them). M-21 is in U-1 and U-6 (acknowledged in the doc, but both units then edit `nav-menu-markup.php`). *Fix:* move M-44 to U-9, or make U-9's context work the second commit of U-1.

**12. Decisions: three are engineering calls dressed as owner decisions, and three owner decisions are missing.**
Engineering, not owner: **DEC-06** (z-index default — the doc itself says the attribute is not in question; choosing 100 vs unset is a code default with a canary regression test), **DEC-08** (a two-line `accordionExclusive` boolean — the only owner question is the default), **DEC-12** (re-run `/sgs-update` — hygiene, no option is a product choice). Missing: (a) **drawer close chrome** — keep FR-36-6's undeletable × or make it per-closeStyle/per-tier (finding 1; it is an accessibility-vs-fidelity call like DEC-02); (b) **Wave 3C scope floor** — six families are needed by ≤2 references (M-10, M-24, M-25, M-28, M-29 at 1–2; M-07 at 3); the list never asks whether they are in scope this wave; (c) **which of U-12's eight furniture blocks to build now** — U-12 is `high`, disjoint and the widest gap, but "eight new blocks" is a scope call the owner must size, not a unit to sign whole.

### MEDIUM

**13. M-40's covering note misreads `showBurger`.** The note says "showBurger is the always-burger case (8 of 13)". In `nav-bar-menu/render.php` §3 `showBurger` is the split-menu gate ("the right-hand half of a split menu suppresses its own burger"), and `includes/nav-menu-submenu-css.php` hides `__toggle-wrap` at `min-width: collapsePoint`. Always-burger is reached by `collapsePoint` above every width — and buck at 1440 shows **bar items AND a burger** (`buck.json` bar@1440 zone_model: "Work, About, search icon, hamburger"), which needs two `nav-bar-menu` instances (one items-only with `showBurger:false`, one burger-only). Covered, but by a different route than written; record the route.

**14. The per-link media slot is double-housed and the footer roll is missed.** studionamma's hover thumbnail is a gap in **both** M-15 ("which is M-22") and M-22 (gap c); count it once. M-25 (two-copy label roll) names bar, drawer and trigger; `studionamma.json` footer item_states at all tiers: "roll label markup present: each link has two copies of its text" — the footer surface is missing from M-25.

**15. M-03 "fully covered per tier" overstates.** `headerTransparent` is a tier object, but `backgroundColourScrolled` and `textColourScrolled` are plain strings (`site-header/block.json`). A different scrolled colour per tier is unreachable; dogstudio's 375-only solid `#0d0e12` is reachable only because the other tiers stay transparent.

**16. Under-merges (five).** (a) **M-28 is a value of M-20** — `asideFormat='preview'` is one enum value of the same rail (`mega-aside/render.php::$allowed_formats`), not a family. (b) **M-48 is a property of M-17** — its covered_by *is* `anchor`. (c) **M-27 + M-37 + M-38** are one control's model, placement and motion; splitting them puts nav-drawer edits into U-5, U-9 and U-11. (d) **M-43 + M-44** are one interactivity context (finding 11). (e) **M-49 vs M-40** — the resize policy is the collapse point's behaviour; DEC-09's rule keys on `collapsePoint`. Merging these takes 50 → 45 with no loss.

**17. Over-merges beyond 8 and 13: M-18 and M-22.** M-18 folds F-C-15 (status **covered**: the drawer body is open InnerBlocks) into a `partial` roster of eight new blocks — "one build" is eight builds; the family should be the roster gap only. M-22 merges a boolean caret (`submenuCaret`), an icon tile on mega-panel, seven `sublinkMarker*` attrs on sub-items, a CSS counter, and a hover-reactive media element — four render sites, no shared attribute.

**18. Missing-family check on the five owner behaviours.** (a) pill header holding logo/nav/actions with panels following the pill: pill = M-02 covered; "panel follows the pill" is built (`mega-disclosure.js::repositionPanel`, `panel-bounds.js` header comment: "on a pill header it is the pill") but **no family records it** — M-16's covered_by omits it, so W3C-1 cannot cite a row. Add as a covered value of M-16. (b) burger replaced in place, header visible, no drawer top row: **not expressible** (finding 1). (c) panel-owning item gets the sibling hover treatment: W3A-3 closed as a fixture artefact; M-21 carries only the halcyon/indus `highlight` gating note; no family or negative-control citation (page 3763) — add the citation to M-21 so it is not rebuilt. (d) logo not stealing the row's free space: fixed in W3A-4 (`grep -c "margin-inline-end" plugins/sgs-blocks/src/blocks/responsive-logo/render.php` → 0); no family needed, but M-05's note should cite W3A-4. (e) resn shell-less: absorbed by M-08 — but see finding 9 for the mechanism that actually makes it clonable.

**19. Random-scan extras with no family (studionamma, dogstudio).** A secondary block that changes **form** per tier, not just visibility (studionamma's dark-mode toggle: text label `#modeSwitch` at 768/1440 → a different 26×26 icon element `#modeSwitch2` at 375) — M-19 covers migration/visibility only. Header pointer pass-through (finding 9). Site-wide custom cursor (studionamma) — out of nav scope; say so in `unclustered` so it is not re-raised.

**20. U-14 bundles M-02 and M-06, both mostly covered, with M-08.** After findings 3 and 9, U-14's content is buck's detaching trigger + lamalama's surface-as-trigger (DEC-14) + the band pass-through. Re-scope and re-size it.

### LOW

**21. Numbers under a VERIFIED badge that are wrong.** M-23: "item*Current (6 attrs)" on each block — `nav-bar-menu` has 7 (`itemColourCurrent, itemBgCurrent, itemBgCurrentGradient, itemFontWeightCurrent, itemBorderColourCurrent, submenuColourCurrent, submenuLinkBgCurrent`), `nav-drawer-menu` has 9. M-21: "item*Hover (14 hover rows)" — `nav-drawer-menu` has 11 `item*Hover` of 28 `*Hover`. M-44: "measure 173-188 ms" — `halcyon.json` trigger_close trials `[183.2, 180.1, 180.6, 183.3, 174.5, 187]`, single run 188.8: floor is 174.5. Harmless, but the badge is the point of the log.

**22. Verification log order and coverage.** V-33 precedes V-32; M-27 (finding 1) and M-40 (finding 13) are "covered" families with no verification row that reads the emit path — V-08 and V-07 read `block.json` allow-lists only, which is how finding 1 slipped through.

**23. Status count in the header is fine; the "every merge passes the brief's test" sentence is not.** `meta.status_counts` = 13/24/8/5 matches the table. The sentence in "What I changed" is contradicted by findings 6, 7, 8, 17.

---

## Verdict: **sign after these fixes** (not as-is; not a rework — the capture, the value clusters and 14 of 15 needed_by claims held)

Exact fixes, in order:
1. M-27 → **conflict**; add build item "drawer close-control presence" and owner decision DEC-15 (FR-36-6 vs nine references). *(finding 1)*
2. Recompute `independent` from `units[].files`; publish the lane grouping in finding 2. *(2)*
3. M-06 → covered for the bottom strip via `notice-banner::stickyPosition:'bottom'`; M-08 needed_by → buck (+ resn); recompute unit support as uncovered-value union; re-sort. *(3, 10, 20)*
4. M-14 note: "two of the four". *(4)*
5. U-13 files: `src/header-behaviours/view.js` + `includes/class-sgs-header-behaviours.php`, not `site-header/view.js`. *(5)*
6. M-31 covered_by: dropdown fork only, mega fork none; add `includes/nav-menu-markup.php` to U-5. *(6)*
7. M-45/U-4: drop the footer or add `business-info` (and any other footer type emitter) to U-4. *(7)*
8. M-13: add the per-block attribute-name/type divergence table as the recorded gap and assign the alignment to a unit. *(8)*
9. Add family "header band pass-through / zero-height shell" (dogstudio, lamalama, studionamma, resn). *(9)*
10. Move M-44 into U-9 (or make U-9 the second commit of U-1). *(11)*
11. Decisions: demote DEC-06, DEC-08, DEC-12 to engineering notes; add DEC-15 (close chrome), DEC-16 (≤2-reference scope floor), DEC-17 (which U-12 blocks now). *(12)*
12. Merge M-28→M-20, M-48→M-17, M-37+M-38→M-27, M-43+M-44, M-49→M-40; split F-C-15 back out of M-18 as covered; add "panel follows the pill" as a covered value of M-16 with the `repositionPanel` citation; add the W3A-3/W3A-4 citations to M-21/M-05. *(13–18)*
13. Correct the three VERIFIED numbers and reorder V-32/V-33. *(21, 22)*
