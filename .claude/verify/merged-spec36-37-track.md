---
doc_type: verify
project: small-giants-wp
plan: plans/2026-07-29-merged-spec36-37-track-strategic-plan.md
---

# Verification criteria — merged Spec 36+37 track

Consumed by `/live-project-status` for phase-completion verification. A wave is DONE only when
every criterion below has machine evidence or a recorded Bean sign-off — never on assertion.

The nav blocks are `sgs/nav-bar-menu` (bar), `sgs/nav-drawer-menu` (drawer link list) and
`sgs/nav-drawer` (drawer panel), under `plugins/sgs-blocks/src/blocks/<slug>/`.
Live reports: `reports/visual-diff/nav-bar-menu-*.md`, `nav-drawer-*.md`, `nav-drawer-menu-*.md`, `mega-panel-*.md`, `site-header-*.md`.

## Wave 1 — Fixture & verification
- STATUS: CLOSED — all six units live-verified: the Gate 3 composed-nav fixture (page 1842, mega
  panel 1745 populated; opens on hover, tap and keyboard), mega motion, mini-cart (flyout + drawer
  modes, Store-API add/qty/remove, empty state), search (4 display modes), the social /
  business-info / notices controls, and the mega starters picker.
- Residuals:
  1. axe on the OPEN mega panel reports 6 primary-colour contrast violations on the Mama's palette,
     accepted by owner ruling. Guarded harness (`axe-run.mjs`), run NOT VACUOUS.
  2. Bean's eye (R-31-13) on the mega motion is not yet recorded.
  3. The cart/search screenshot set is not captured (numeric probes only).

## Wave 2 — Capability
- STATUS: partial. DONE a, b, c, d, e, f (live/eye verification owed), g, h, j, k, l, n, p, q, r, s, t, u ·
  i (labels for the three unmeasured refs follow W3B-3) · CLOSED with no framework feature: o.
- DP7 harness self-tests pass FIRST (W2-i precedes Wave-4 evidence). Built: shared
  `nav-qa/lib/openness-guard.mjs` (exit 3 = VACUOUS), full-element contrast walk, `--self-test` in
  all six sweep, capture and audit scripts, and `nav-qa/check-fixture-fidelity.py` (fails on count/label mismatch,
  right-site keyed). Proof: `node plugins/sgs-blocks/scripts/nav-qa/sweep-drawer-variants.mjs --self-test`
  (47/47), `shoot-drawer-pairs.mjs --self-test` (16/16), `elementfrompoint-sweep.mjs --self-test` (3/3),
  `python plugins/sgs-blocks/scripts/nav-qa/check-fixture-fidelity.py --self-test` (14/14) and `--check`
  (exit 0). Open: `labels-butcherbox.json` and `labels-rabbit.json` (8 label files exist, in
  `.claude/reports/2026-07-28-drawer-code-extraction/`; Away's is there), taken with step 0c's headed captures.
- CPT parity (Gate 2): computed-parity JSON — default `sgs_drawer` post render vs the default drawer,
  **drawer OPEN** (a closed-vs-closed comparison is vacuous), property-identical, negative control
  run. Passed 2026-09-20 on the mechanism (`.claude/reports/2026-09-20-w2-gate2-rerun.md`), fidelity left to Bean's eye.
- No stored string `drawerRef` on any live site: `wp db query "SELECT COUNT(*) FROM wp_posts WHERE post_content LIKE '%\"drawerRef\":\"%'"` returns 0 on every site.
- Spec 36 + Spec 37 state the drawer-CPT model identically, same commit (Spec 37 §1.2). Met.
- `drawerRef` picker: dangling-post notice fires on deleted AND draft target (2 screenshots).
  Create-inline (create a new `sgs_drawer` post from the picker) live-verified in the editor
  (`reports/visual-diff/nav-bar-menu-2026-09-20.md`).
- 7 drawer starter patterns appear in the drawer surfacing mechanism; `variantPreset` +
  `registerBlockVariation` calls = 0 in src (`git grep -n variantPreset -- plugins/sgs-blocks/src`).
  Met: seven `featured` drawer patterns exist and are seeded as posts.
- Header patterns render with no embedded drawer (met); seeded default drawer opens from the burger.
- DP4: all six trigger attrs (`triggerMode`, `triggerLabel`, `triggerIcon`, `triggerMagnetEnabled`,
  `triggerMagnetRadius`, `triggerMagnetStrength`) drive visible change; open-state morph syncs via
  `store('sgs/nav')` (closed/open screenshot pair).
- FR-37-42: picker writes `1fr auto 1fr` and it renders centred-logo (computed grid evidence).
- Drawer icon-list contrast ≥ 4.5:1 on BOTH dark variants, measured by the DP7 full-element sweep.
- Drawer `centred-statement` links visually centred at 3 tiers.
- DP7 harness: `--self-test`-style negative controls PASS (closed panel → VACUOUS; label
  mismatch → FAIL) before any Wave-4 capture is trusted.
- After every edit.js / shared-component change: real editor opened post-deploy, noted per unit.
- W2-u: the mega + drawer same-page integration probe (focus traps, ESC interplay, non-modal
  branch) re-run live on the CPT-rendered drawer. Met (`.claude/reports/2026-09-20-w2u-cpt-drawer-integration.md`).
- W2-l: a Site Info logo renders when the block has none and falls through to the Customiser logo when
  cleared, with an invalid attachment and a non-image attachment as controls
  (`reports/visual-diff/responsive-logo-2026-09-20.md`). Met.
- W2-n: with `shadowScrolled` set the header's computed `box-shadow` changes after scrolling and eases
  back, reduced motion removes the transition, an unmodified header never changes
  (`reports/visual-diff/site-header-2026-09-20.md`). Met.

## Wave 3 — Polish
- STATUS: partial.
- **FR-37-44 + FR-37-45 — VERIFIED**, evidence `reports/visual-diff/site-header-2026-08-19.md`
  (17 assertions, verdict PASS, live canary). Load-bearing ones: the contrast scrim paints at
  desktop AND cancels at 375px (`content: none`) — the per-device capability a `<body>` class could
  never express; the client-set scrolled background and text colour both land with `!important`
  intact; `headerTransparentDirection` genuinely inverts the pair; `force-solid` suppresses
  transparency (`position: relative`, never lifted out of flow). Regression control: the homepage
  header still paints the `surface` token with sticky, the `--sgs-header-height` publisher and the
  nav unaffected, 0 console errors. Caveats stated in the report: one computed-style reading is
  unreliable (`getComputedStyle` returns a LIVE declaration, read after the test mutated the
  element), and the scrolled state was forced by adding the class, not by scrolling.
- FR-37-27: SETTLED — ≤3 controls is a default, not a ceiling; nothing is hidden or reordered.
  `SgsColourPanel` is not counted (the standardised colour panel; its picker is a popover). Live
  figures come from `node plugins/sgs-blocks/scripts/check-simple-surface-cap.js` (advisory,
  warn-only) — quote its output, never a cached number.
- Simplicity finding 3 settled; finding 2 (canvas-click selection): before/after inspector
  screenshots — open.
- FR-37-6: every live site renders header + footer from its CPTs (view-source evidence): sandybrown
  canary + Indus test site. Both serve `sgs/site-header` + `sgs/site-footer` markup; CPT sourcing
  per site not yet evidenced.
- FR-37-26: Bean's screen-recorded blind-tester session exists; verdict recorded. Not done.
- FR-37-18 inspector conformance: partial; the conformance script's gap counts are raw upper
  bounds.

## Wave 3A — Independent fixes
- STATUS: done (W3A-1 to W3A-5 below, each met or closed with no change).
- Every fix is first reproduced inside a real `sgs/site-header` (the loose-block QA pages prove
  nothing about a header). A defect that does not reproduce there is closed with no change.
- W3A-1: a real pointer path from a parent item to its dropdown and to its mega panel keeps the panel
  open at 1440px; negative control: a deliberately widened gap closes it.
- W3A-2: a default dropdown computes `list-style-type: none`, no link `text-decoration`, no
  `padding-left` on the list, and a non-transparent `background-color` with a border or shadow; its
  items centre on the parent item.
- W3A-3: computed hover style of a bar item that owns a panel equals that of a sibling that does not,
  with the cause proven before the fix.
- W3A-4: hover colour met: the hovered nav item's computed text colour equals its resting colour and the
  hover pill is `rgb(245, 194, 200)` (the draft's `--surface-pink`), read with `getComputedStyle` on
  `header .sgs-nav-bar-menu__link` and its `::before` while hovered. Centring met: the gaps left and
  right of the nav (logo to nav, nav to cart) are 225 and 224px on the live homepage, and no SGS surface's
  logo moved (`reports/visual-diff/responsive-logo-2026-09-20.md`, addendum).
- W3A-5: met. The nav QA fixtures render inside `sgs/site-header` (`document.querySelector('.entry-content header.sgs-site-header .sgs-nav-bar-menu')`
  is non-null on pages 3723, 3733, 3734 and 3735), and the drawer fixtures show submenus and a mega item
  (`python plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py --list`).
- W3A-1: closed with no change (the plain dropdown works on a real header; the pill mega's gap is part of W3C-1).
- W3A-3: closed, not reproduced inside a real header (page 3763); the content-link rule in
  `plugins/sgs-blocks/assets/css/extensions.css` is the proven cause of the loose-fixture behaviour.
- W3A-2: closed, not reproduced inside a real header (Shop dropdown on page 3734: no list markers, no
  underline, no indent, a background and border).

## Wave 3B — Reference deconstruction
- STATUS: done; Bean signed the family list on 2026-09-21.
- W3B-1: the 14 columns are signed off (completeness review against the measured data, adversarial
  review of the table design).
- W3B-2, W3B-3, W3B-3a: all 13 roster references captured at 375, 768 and 1440px (the two Claude Design
  drafts by rendering each locally with its own runtime files, one row set per variant); every static cell is
  taken from the rendered DOM by computed style, every behaviour cell by event-driven capture or
  marked `source-only`; every surface cell is present, absent or not-applicable; `labels-<site>.json`
  exists for eight third-party references (ButcherBox and rabbit.tech are owed with step 0c). Captured headed, or spot-checked headed with the
  differences recorded (`.claude/reports/reference-requirements/HEADED-SPOTCHECK.md`).
- W3B-4: every table row belongs to one capability family, and every family states the block
  attribute that covers it or "none".
- W3B-5: Bean has signed the family list.
- W3B-4 evidence: `reports/reference-requirements/FAMILIES-MASTER.md` (46 families, 11 covered, 21 partial, 8 gap, 6 conflict), `families-master.json`, and the independent review `FAMILIES-REVIEW.md` (23 findings, applied); 33 coverage checks re-run against the code.

## Wave 3C — Header and nav architecture harmonised
- STATUS: under way (`plans/2026-09-21-wave-3c-implementation-plan.md`). U-1, U-2, all of lane A (U-9+U-11, U-5,
  U-3+U-8, U-6+U-7, U-4, U-10+U-14, with its batched QA pass), all of lane C (U-12, U-15, U-17) and U-13 are closed.
  Open: U-16 (step 0d measured 2026-09-26; design gate next) and Gate 3C below.
- Lane C evidence (live on sandybrown 2026-09-26, headed Chrome; fixture pages 4070 `/qa-furniture/`, 4072 `/qa-notice/`,
  4074 `/qa-wishlist/`, 4087 `/qa-lottie/`): six clocks in their zones with correct offsets and no `aria-live`; language links
  with `lang`/`hreflang`; the store disclosure closes on Escape and returns focus; the up button 54x54 at 1440 and 45x45 at
  375 and back-to-top lands focus on `main`; the theme toggle flips the palette and syncs both styles; hearts update the
  header count across bundles and merge nothing twice; Save for later moves a WooCommerce basket row into the wishlist;
  the rotating banner changes bar colour per message, pauses (holds for 6 s, `aria-live` polite) and steps by arrow; the
  sound toggle plays, pauses and mutes other media; both Lottie surfaces animate, the player (46,496 bytes gzip) loads only
  after its trigger and never under reduced motion; hostile Lottie uploads are refused. axe: 0 on `/qa-notice/`; the
  colour-contrast and link-name findings on the other two were fixed in f39e66310. Existing backgrounds byte-identical
  before and after the wrapper change (23 of 23 elements).
- D (0f8b97287): a Transparent tier falling back to a narrower non-Transparent tier keeps the header's own resting
  fill via `sgs_merge_tri_state_declarations()`'s per-behaviour `fallback` map. Live on a navy header: transparent
  at 1440, `rgb(26,26,46)` at 375.

**U-13 exit criteria (closed):**
- M-04 covered (Spec 37 FR-37-50): the header's ink, optional fill, menu links and logo follow the section behind it,
  only where the header is see-through. Live on sandybrown `/qa-section-ink/` (fixture `section-ink`, probe
  `scripts/nav-qa/u13-ink-probe.mjs`): `#140700` over light and `#f8f8f7` over dark at 18.64:1 over light, dark, photo
  (toned by `_sgs_top_tone`) and plain-group (browser fallback) sections at 375, 768 and 1440, menu links equal to the
  ink; negative control `section-ink-off`: no tone class, no change.
- M-03 covered (FR-37-51): `scrolledTrigger` direction and `scrolledOffset`. Live (fixture `direction-fade`, probe
  `scripts/nav-qa/m03-direction-probe.mjs`): fantasy's black 0.5 fill paints at rest (header top edge darker, pixel sum
  361 against 765), is gone past 100px going down, holds through a 5px upward nudge and returns on 15px up at y=465
  over about 300ms, at all three widths.
- axe scoped to the header over the dark and light sections: 0 at 1440; at 375 one finding present with the feature
  on and off alike (the test header's top-row phone button, `#fffaf5` on `#e68a95`, 2.4:1), not U-13's.
- Editor: every new control set through the real inspector (sidebar tabs, colour popover, number fields) and unchanged
  after save and reload; no invalid blocks; no "Error loading block" (fixed on the way: the header and drawer starter
  templates seeded a flat menu `gap`, 31c2ed4c5).

**U-1 exit criteria (closed):**
- Mega close-grace reads `submenuCloseGrace` (the bug where the mega context passed a literal 170
  instead of the attribute is fixed); `submenuIntentDelay` and `submenuOpenOn` (hover or click) give an
  operator-set intent delay and open mode on both the dropdown and the mega panel. Live-verified.
- `sgs/site-header` carries a per-tier `zIndex` object (ENG-01); drawer stacking derives from it.
  Live-verified. buck's `auto` z-index is an accepted divergence (Bean).
- Force-solid (`contrastSafe` = `force-solid`) paints the header's own resting background (its colour, or
  the theme surface token when it has none) instead of suppressing transparency with no paint. Live-verified.
- The surface-ground trio (`surfaceBlur`, `surfaceSaturate`, `surfaceOpacity`) is aligned across
  `site-header`, `mega-panel`, `nav-drawer`, `container`, `cta-section`, `hero`, `multi-button`,
  `physics-canvas`, `site-footer` and `trust-bar`, one `Surface` panel
  (`container/components/BackgroundPanel.js`) and one editor preview (`src/utils/surface-preview.js`).
  `mega-panel` and `nav-drawer` each gain a `shadow`/`shadowColour` writer. The faded ground (fantasy) is the
  header's own gradient fill (`backgroundColourGradient`, resolved by `sgs_background_paint_value()` and, once
  scrolled, `sgs_css_gradient_value()`); there is no header-wide mask, so dropdowns and mega panels below the
  header stay visible. Live-verified:
  `reports/visual-diff/container-2026-09-23.md`, `nav-drawer-2026-09-23.md`, `nav-bar-menu-2026-09-23.md`,
  `container-2026-09-21.md`, `mega-panel-2026-09-21.md`, and the fantasy gradient fill on sandybrown
  (`/qa-scrim/`, fixture `scripts/nav-qa/qa-u1-owed-fixture.php`, probe `scripts/nav-qa/u1-owed-probe.mjs`:
  top pixel 129, bottom 254 over white, no mask on the header, dropdown still clickable). The mega-panel
  `borderRadius` stays a single value (Bean).
- Item hover paint: `itemOpacity`/`itemOpacityHover` and `submenuOpacity`/`submenuOpacityHover` on
  `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`; `itemPaddingShiftHover`; mega-panel `panelCardLift`.
  Live-verified on the same `qa-hdr-*` fixture and probe: fantasy's submenu link opacity 0.6 at rest to 1
  hovered; indus-foods' 6px card lift with a negative control (an empty lift does not move the card; fixed in
  ae50c7626, mega-panel `style.css`'s fallback was -3px).
- Family coverage in `families-master.json`: M-43, M-21, M-09 and M-13 covered.
- Shipped alongside U-1, not itself a U-1 family: the universal shadow-tone check (design
  `.claude/reports/2026-09-23-shadow-tone-design.md`, Bean-approved GO WITH FIXES) — a surface is judged
  dark when white text would be chosen for it (`helpers-colour-wcag.php::sgs_wcag_white_wins_for_luminance`),
  `helpers-surface-tone.php::sgs_surface_tone` judges overlay/image/gradient/colour layers, the wrapper,
  nav-drawer and mega-panel mark `sgs-on-dark`/`sgs-on-light`, and `helpers-shadow-dark.php` gives a dark
  surface a black shadow at 2.2x plus a 1px light ring, gated by `scripts/check-shadow-sources.py`. Owed:
  Bean's eye on the dark-surface screenshot and the ring strength.
- Theme gradient presets now resolve in the editor canvas preview and tone check (0ec253b35): every caller of
  `backgroundPreview()`/`wrapperToneClass()`/`surfaceToneClass()` passes `useSettings('color.gradients')` via
  `flattenPresetSetting()`. (The sandybrown deploy of everything since theme 1.5.91 happened on 2026-09-24
  with U-2.)

**U-2 exit criteria (closed, D1148):**
- M-14 covered: every exit cell reachable per tier through `scrimColour`, `scrimColourGradient`, `scrimOpacity`,
  `scrimBlur` on `sgs/nav-drawer` and `sgs/nav-bar-menu` (shared helper `includes/helpers-scrim.php`, also adopted by
  modal, cart, gallery and product-search). Measured live on sandybrown within tolerance (exact values): halcyon's
  panel scrim (`#0a0a0c`, 0.28, blur 2px), lamalama's drawer scrim (black, 0.4, blur 16px) and away's phone cell (0)
  (`reports/visual-diff/scrim-2026-09-24.md`). Residue: butcherbox's dropdown strength never captured as a number;
  lamalama's click-through accepted as a divergence; the fade timing waits on U-5.
- Forced-colours checked live: with a dropdown's scrim open under forced colours, the scrim hides by design
  (`includes/helpers-scrim.php` has an explicit forced-colors `display:none`), the open dropdown keeps a 1px
  solid border and its links take the system link colour. The axe run with a surface open was done in lane A's
  batched pass (`reports/visual-diff/nav-drawer-2026-09-25.md`).
- Owed: Bean's eye on the three scrim screenshots.

**U-9 + U-11 exit criteria (closed as one pair, D1150):**
- M-36, M-34, M-35, M-40, M-47, M-27, M-10 covered. Measured live on sandybrown with a negative control each
  (`reports/visual-diff/nav-drawer-2026-09-24.md`): the × absent in a non-modal `trigger` drawer and present in a modal
  one; focus into the menu, never onto the hidden ×; halcyon's same-slot × at (4, -0.28) against (4, -0.5); dogstudio's
  x-rotate morph at 0.6s quart-out; close-on-scroll at 24px (7px stays open, 37px closes, a programmatic scroll does not);
  the resize rule (720 stays open, 1100 closes, focus on a live header control); `accordionExclusive` drops the
  `<details name>`; the item magnet at 0.16 (12.76px against 12.8).
- Residue: two-bar burger (owed, lane A, after U-6 + U-7); icon swaps and indus-foods' 38px × recorded as divergences; hotkey and history-back
  outside the wave. Owed: axe with the drawer open, the editor round-trip of the new controls, Bean's eye on the two
  screenshots.

**U-5 exit criteria (closed; commit 01e4b5a5f, Escape fix 35d98e413):**
- M-31 and M-32 covered. Measured live on sandybrown (`reports/visual-diff/nav-drawer-2026-09-24.md` section U-5):
  away's drawer slide from the start edge, 300ms each way, no fade, the dialog closing 295ms after the close began;
  the drafts' panel fade-lift (340ms, -8px, 0.99, drafts curve) with 460ms items at 0 and 28ms; the drawer's 55ms
  item stagger with the logo arriving with the last item; the panel exit holding the panel pointer-free for 196ms, then
  hidden. Escape now closes a panel opened by hover (reproduced before the fix, passing after).
- Residue: dogstudio's durations are upper bounds; lusion's rotate and scrim delay and fantasy's second item direction
  are recorded divergences. Owed in the batched pass: reduced-motion emulation, axe with the drawer open, the editor
  round-trip of the Motion and Panel motion controls, Bean's eye on the shapes.

**U-3 + U-8 exit criteria (closed; commits 9f3fc5071, 51d4be574, dd2db8a1f):**
- M-17, M-46, M-16 and M-20 covered. Measured live on sandybrown (`reports/visual-diff/nav-drawer-2026-09-25.md`):
  away's 390px side drawer (left 0, top 0, full height, modal); lusion's header-content panel (edges equal the header
  row's content box); lusion's corner panel 13.08 below the burger against 12.8; lusion's pitch 43.99 (gap 0 on 44px
  rows); a mega panel and a dropdown centred on the page (0.01, 0.99) and 9.99 below the header with a 10px offset; the
  hover bridge covering the whole gap; away's two tiles side by side in `sgs/mega-links-with-tiles`.
- Residue: away's drawer callouts (a mega panel inside the drawer accordion) were delivered by U-6 + U-7. Owed in the batched pass: axe
  with the side and container drawers open, the editor round-trip of the four new controls, Bean's eye on the three
  starter patterns once they have imagery.

**U-6 + U-7 exit criteria (closed; commits 3aae1950c, 777ee5dd4):**
- M-30, M-24, M-25, M-22 and M-15 covered. Measured live on sandybrown (`reports/visual-diff/nav-drawer-2026-09-25.md`
  section "U-6 + U-7"): halcyon's row separator (existing bottom `itemBorderWidth`, rgba(22,20,10,0.1)); wearecollins'
  sibling dim (rgb(76,76,76), 0.7s on its curve); lusion's label roll and the trigger's MENU to CLOSE with the
  accessible name following the visible word; dogstudio's index at desktop only; a 45 degree expander turn;
  studionamma's 160 x 112 hover thumbnail from the linked page's featured image; a mega panel inside the drawer
  accordion at mobile with no floating shell.
- Residue: studionamma's up-scale origin, wearecollins' hovered-item return time, resn's canvas dissolve (DEC-01),
  buck's per-link glyphs (Wave 4). Delivered since: wearecollins' two-bar burger (`burgerBarCount`) and the bar's
  link padding setting (`itemPadding`). Owed, lane A: none (away's 375 tile scroller is the container's "Scroll sideways" setting; the menu video source is closed by GIF, Bean). Batched: axe with the drawer open, keyboard dim, reduced motion, the
  editor round-trip.

**U-10 + U-14 (header-row structure), done 2026-09-25** (design `.claude/reports/2026-09-25-u10-u14-design.md`;
commit 0fbe085f1 plus DB/gate fixes through 5781740e7).
- M-19, M-52, M-39 and M-08 covered. Measured live on sandybrown (`reports/visual-diff/nav-drawer-2026-09-25.md`
  section "U-10 + U-14") at 1440 (`innerWidth` 1309): `sgsCollapseVisibility` hide/only swap at the 1600 collapse
  point; `headerPassThrough` fixed under the admin bar, an empty band point hits page content (negative control:
  the header), the logo hits its link; `triggerSurface`'s overlay equals the row (1200 x 67.47) with the magnet on,
  and a click on the row's middle opens the drawer; buck's chip hidden at scrollY 300, fixed 68.6 x 68.6 at 360,
  both openers' `aria-expanded` agree.
- Residue: none per family. Batched: axe with the drawer opened from the chip, keyboard order past the chip, the
  four new controls' editor round-trip, the logged-out admin-bar-free offset.

**U-4 (type scaling), closed, cut by Bean** (`.claude/reports/2026-09-25-u4-type-scaling-design.md`, commit 61ae4cf99):
`vw` and `vh` font-size units in the shared typography control; a menu item at 1.5vw read 19.64px at 1309px and
24.55px at 1636px. Formula sizes stay in each agency clone's custom CSS (M-45).

**Lane A batched QA pass, done** (`reports/visual-diff/nav-drawer-2026-09-25.md` section "Lane A batched QA pass";
fixes d954c83f8, 6962dd0e6). It clears the "batched" items listed under U-5, U-9 + U-11, U-3 + U-8, U-6 + U-7 and
U-10 + U-14: axe 0 on the drawer from the burger (1440, 375), from the chip, in the side and header-content placements
and on the keyboard-opened dropdown; keyboard order past the chip; reduced motion (0 moving animations with the drawer
open); every new control's editor round-trip. Still owed from those units: Bean's eye on the screenshots and shapes, and
the three starter patterns once they have imagery.

Gate 3C passes when (the one definition; the same words are in the implementation plan §7 and the
strategic plan's Gate 3C entry):

1. Every family in the signed list is covered: its exit cells reachable and at least one reproduced
   live. Twelve families (M-01, M-02, M-05, M-06, M-12, M-23, M-26, M-29, M-41, M-42, M-50, M-51) are
   already covered, are in no unit, and close the gate as covered. No family closes the gate as parked.
2. Each unit row cites its live report with `verdict: PASS`.
3. `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 and
   `python plugins/sgs-blocks/scripts/no-inline/check-no-inline.py` passes against a reachable canary.
4. Two composed real headers match their reference rows: the pill on fixture page 3734 (lamalama) and
   the capped-width header on page 3733 against the reference Bean names, with equal left and right
   gaps at 1440px, a mega panel whose width equals the header's and a dropdown centred on its parent
   item. Bean's eye is co-authoritative (R-31-13).
5. Spec 36, Spec 37, this verify doc and LEDGER state the model.

## Wave 4 — Proof gate (clones)
- STATUS: not started
- All 13 roster references measured in the requirements table (W3B-3 owes the Away, ButcherBox and
  rabbit.tech captures; 8 of 11 third-party references have drawer data only today; the two Claude Design drafts are captured in W3B-3a); the header and nav architecture (Wave 3C) is complete; clone
  roster = 13 (12 if the W3B-3 teardown finds a resn effect that no Spec 38 tier can express) —
  Gate 5 counts the roster.
- Substitution policy (fonts/imagery) signed by Bean BEFORE the first clone (W4-a2).
- studionamma: DP5 per-property homes table reviewed; DP7-clean evidence pack (computed-parity +
  open-state captures + labels fidelity PASS); **Bean's eye acceptance recorded** BEFORE any other
  clone starts.
- Each subsequent clone: same evidence pack + Bean's eye; capability gaps filed as wave-1–3
  defects, zero trimmed references; effects use the built Spec 38 tiers, a mismatch is a defect
  against that FR, and an effect no tier can express is a Bean trim decision (the termination
  rule), never a silent loop-back.
- Presets extracted per accepted clone; contrast pass on all 8 client palettes; starter set
  narrowed to `scratch` + 3 search variants.

## Wave 5 — Clone walker
- STATUS: not started
- FR-37-22 walker clones a reference header/footer end-to-end through the pipeline (run artefacts).
- The roster clones green as regression fixtures.
- FR-37-23: live FRs + never-overflow on every live site + no inline styling + Bean's eye = track
  CLOSED.
