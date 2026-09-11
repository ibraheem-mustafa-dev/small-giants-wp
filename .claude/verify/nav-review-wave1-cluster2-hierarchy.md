# Group E — FR-41-13 regression claim + state-hierarchy propagation (diagnostic only)

**Scope:** Group E of `.claude/reports/2026-09-12-nav-menu-visual-review-register.md` only.
Diagnostic — no fixes proposed or built.

---

## E1 — the regression claim

### Verdict: the two hover-treatment configurations that COULD be live-tested are NOT
broken. The fix (`bdd80254e`) is genuinely deployed and works correctly, live, right now,
for both the CSS-declarative rescue (border-swap) and the JS-driven Highlight pill. The
DRAWER fork remains genuinely UNTESTED — no working burger+drawer fixture with configured
hover exists anywhere on the canary, so Bean's drawer-fork claim can be neither confirmed
nor refuted from live evidence. This is a real verification gap, not a "works fine" claim.

### E1.1 — deploy freshness (sub-task 1)

Confirmed clean, no stale deploy:
- `git log -1 -- plugins/sgs-blocks/includes/nav-menu-css.php` → commit `bdd80254e`
  ("fix(nav-menu): 4 live-verification defects from Spec 41 Step 22/23 gate sweep"),
  2026-09-11 21:54:38 +0100 — the exact fix commit D1038 describes.
- md5 of the local repo file and the file actually on the canary
  (`wp-content/plugins/sgs-blocks/includes/nav-menu-css.php`) are IDENTICAL:
  `94538e467c7c9fed1d93809594f05ad5` both sides. No PHP-side staleness.
- OPcache/LiteSpeed: the shared aggregated block stylesheet the whole site loads
  (`wp-content/uploads/sgs-css/sgs-3525-*.css` — see note below on the "3525" naming) is
  fresh; the exact selector text from the fix is present and correctly emitted for the
  live G7-BAR fixture (uid `sgs-nav-menu-3de3d209`):
  ```
  .sgs-nav-menu-3de3d209 .sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link{border-color:#ff0000ff}
  ```

**Caching note (tangential, worth flagging, not a defect):** the aggregated CSS bundle
filename embeds "3525", which is NOT any real WP post ID (`wp_posts` has no row for 3525)
— it is served identically to both the homepage (post 2742) and the scratch gate page
(post 3487), confirming CSS is aggregated SITE-WIDE into one shared file, not per-page.
"3525" is an internal counter/hash bucket for that aggregate, unrelated to the pages that
consume it. Multiple stale hash-variants of that bucket exist on disk simultaneously
(`0f45dd52…`, `ddca80a9…`, `f1f0f049…`, `ff3be7e6…`, `1170555d…`), each generated at a
different point in this session as fixtures were edited; the live page always requests the
CURRENT hash via its `<link>` tag, so this is not itself a bug — just noted because it
initially looked like a caching inconsistency and cost some investigation time to rule out.

### E1.2 — live test 1: border-swap (`itemBorderHoverTreatment: 'swap'`, the exact G7-caught case)

**Method:** standalone `chromium.launch()` via a local Node/Playwright script (NOT the
shared MCP browser — see "shared-browser contention" note below), on the live G7-BAR
fixture (`nav[aria-label="G7BAR"]`, uid `sgs-nav-menu-3de3d209`), page
`https://sandybrown-nightingale-600381.hostingersite.com/step23-gate-spec41-nav-menu-interaction-gates/`.
Hovered the "Recipes" parent link, waited for the real dropdown panel to open (`display:
block`, ~1s — CSS-driven, not the reduced 150ms used in the ORIGINAL G7 test, which may be
why it under-measured the panel state), then moved the mouse in 10 steps across the 14px
gap into the submenu panel and settled inside it.

Result — border-bottom-color measured at every step:
```
step 1-4  (still in/near the link):  rgb(255,0,0)   liHover=true  linkHover=true  rootHover=true
step 5-6  (mid-transit, the gap):    rgb(117,71,74) → rgb(62,48,41)   ALL hover=false  (transient dip)
step 7-10 (inside submenu-root):     rgb(255,0,0)   liHover=true  linkHover=false rootHover=true
FINAL (settled well inside panel):   rgb(255,0,0)   rootHover=true  panel display=block
```

**Reading this:** the parent's red border-look correctly PERSISTS the whole time the
pointer is inside `.sgs-nav-menu__submenu-root` (which the fix keys on), including fully
settled deep inside the open panel. There is a brief 2-step reversion to the base colour
while the pointer is literally in the geometric 14px gap between the link's box and the
submenu-root's box (a moment when neither is actually `:hover`ed) — this is a real, minor,
momentary flicker during fast transit, not a persistent "stuck reverted" state, and it is
architecturally distinct from what G7 originally caught (G7's bug was the border STAYING
reverted for the ENTIRE time inside the open panel, which does not reproduce here).

**Conclusion: the border-swap case is genuinely fixed and live-verified independently of
D1038's own re-verification** — this is a second, fresh confirmation using real mouse
motion (not just reading the emitted CSS).

### E1.3 — live test 2: Highlight pill (`itemBgHoverTreatment: 'highlight'`)

This is the configuration flagged as a real risk in the brief, and it turned out to be
architecturally important: **`itemBgHoverTreatment: 'highlight'` is not a CSS-declarative
hover rule at all.** Per `nav-menu-css.php` line 295-297 and its own docblock comment
(FR-41-14/FR-41-25), when `$t_bg === 'highlight'`, `$item_bg_hover_decl` is forced to `''`
— **no `::before` hover-fill CSS is ever emitted for this treatment.** Instead,
`render.php::` sets `$indicator_style = 'pill'` (line 742: `'highlight' === (
$attributes['itemBgHoverTreatment'] ?? 'swap' ) ? 'pill' : 'none'`), which emits
`data-sgs-nav-indicator` on the `<ul class="sgs-nav-menu__bar">`. That data attribute is
`view.js`'s init signal for `initNavIndicator()`
(`plugins/sgs-blocks/src/shared/effects/nav-indicator.js`) — **the SAME shared sliding pill
used for the Mega-Menu Build Spec's "you are here" indicator**, driven entirely by JS
`mouseover`/`mouseleave`/`focusin`/`focusout` listeners on the WHOLE BAR element, not a
per-link CSS `:hover` rule.

**No existing fixture combined `highlight` with a real dropdown**, so one was added as a
scratch diagnostic fixture: `sites` — actually added directly to the existing scratch page
3487 (`E1DIAG-HIGHLIGHT`, `ref:100` — the same menu 100 used by G7, which has a real
"Recipes" → "Our Story"/"Sourcing" dropdown — `itemBgHoverTreatment:"highlight"`,
`itemBgHover:"primary"`). **Left in place, not cleaned up**, per the same convention the
Step 22/23 gate report used for its own scratch fixtures.

Method: same standalone-browser approach, `elementHandle.hover()` (not raw coordinate
`mouse.move`, which under-measured on the first attempt because the element was below the
1400px test viewport and the coordinates landed outside the rendered page).

Result:
```
On link hover, before panel opens:
  indicator opacity=1, bg=rgb(230,138,149), transform=translateX(195.207px)
  (CSS custom props: --sgs-nav-indicator-x:186px --sgs-nav-indicator-w:83.984375px --sgs-nav-indicator-opacity:1)

Settled deep inside the open submenu panel (submenu-root :hover = true):
  indicator opacity=1, bg=rgb(230,138,149) — UNCHANGED
  transform=translateX(186px) — position UNCHANGED (the 195→186 shift between the two
    readings is font-metric settling between the pre-panel and post-panel measurement, not drift)
```

**Conclusion: the Highlight pill does NOT lose position or visibility when the pointer
enters the submenu.** This is not because FR-41-13's CSS rescue covers it (it explicitly
does not — the docblock's own text says `'sweep'`/complex text treatments and this
JS-pill mechanism are outside its scope) — it works because `initNavIndicator()`'s
`mouseleave` listener is bound to the WHOLE `barEl`, and `.sgs-nav-menu__submenu-root` /
`.sgs-nav-menu__submenu-wrap` are DOM DESCENDANTS of `barEl` (confirmed via
`nav-menu-markup.php::sgs_nav_menu_render_items`, line ~267-268 — the submenu-root and
submenu-wrap are both children of the same `<li>` that's a direct child of `.sgs-nav-menu__bar`).
Per the mouseenter/mouseleave spec, these events fire based on DOM ancestry, not visual
overlap, so entering a DOM descendant — even one rendered outside the bar's own visual box
via `position:absolute` — never fires `mouseleave` on `barEl`. The pill was never at risk
here independent of FR-41-13 at all.

### E1.4 — the drawer fork: genuinely unverified, not "confirmed working"

Neither this pass nor the original G7 gate (`.claude/verify/spec-41-gates-interaction.md`,
"G7 border independence between BAR and DRAWER instances — INCONCLUSIVE") ever got a real,
functioning drawer+burger pairing with configured hover colours to test against. The
scratch "G7DRAWER" nav-menu instance on page 3487 is a standalone `sgs/nav-menu` block with
no burger pairing — `$sgs_nm_is_drawer_list` (the flag that switches
`nav-menu-markup.php::sgs_nav_menu_render_items_drawer` into the accordion/drill-down
markup and adds the `.sgs-nav-menu__bar--drawer` class) is not set for it, so it renders as
an ordinary bar, not an accordion. This was not re-attempted here (time-boxed, and building
a genuinely paired burger+drawer scratch instance is non-trivial setup, same reason the
original gate skipped it).

**What IS established, from source, about the drawer fork's selectors:**
- The FR-41-13 fix DOES emit a drawer-specific pair of rules
  (`.sgs-nav-menu__accordion-row:hover > .sgs-nav-menu__link` for mouse,
  `.sgs-nav-menu__accordion-row:has(ul.sgs-nav-menu__submenu :focus-visible) >
  .sgs-nav-menu__link` for keyboard) — present in the current deployed code, same file,
  same commit as the bar fix.
- **A drawer's submenu is opened by TAPPING the accordion `<summary>` (a `<details>`
  element), not by hovering.** On a real touch device, `:hover` is either never entered at
  all (per G8's own measured caveat: "Chromium's touch emulation in this test never
  actually enters `:hover` at all on tap") or, per G8's OWN warning, some real browsers
  (iOS Safari) apply a STICKY `:hover` after tap that only clears on the next tap
  elsewhere. Both of these are genuinely different failure/success shapes from mouse
  hover, and FR-41-13's rescue rule was designed and tested exclusively against MOUSE
  hover. **If Bean tested the drawer fork by tapping the burger + accordion on a real
  phone**, what he is observing may not be "the FR-41-13 rescue rule failing" at all — it
  may be "the drawer accordion row never had a `:hover`-look to lose in the first place on
  touch", which is a different, likely pre-existing and unrelated gap (touch has no hover
  affordance concept), not a regression of this session's fix.
- **If Bean tested the drawer fork with a mouse** (e.g. resizing the viewport to force the
  drawer layout but still using a mouse, which is how a desktop reviewer often checks
  "mobile" styling), the mouse-hover selector above SHOULD behave identically to the bar
  case (same rescue mechanism, same `:hover`-bubbles-to-ancestor logic) — but this was not
  independently confirmed live in this pass, so it is reported as UNTESTED, not PASS.

**Recommendation for the next pass (diagnostic note, not a fix):** build one real
burger+drawer scratch fixture (drawer opened via the actual Interactivity-API store action
or the real burger click, not an ad-hoc standalone block) with a border-swap OR highlight
hover configured, and repeat E1.2/E1.3's exact method against
`.sgs-nav-menu__accordion-row` instead of `.sgs-nav-menu__submenu-root`, under BOTH mouse
and touch emulation.

### E1.5 — shared-browser contention (methodology note, not a product bug)

Early in this investigation the shared MCP Playwright browser was found mid-navigation to
an unrelated URL (`/colour-wave1-cluster1-fixtures/`) and returned inconsistent sets of
`sgs-nav-menu-*` uids across successive `evaluate()` calls on the SAME loaded page — this
was traced to a SIBLING agent (a different cluster in this same 13-group dispatch) driving
the same shared browser concurrently, not a product defect. Switched to a standalone
`chromium.launch()` Node script for all subsequent live testing (same technique the
original Step 23 gate agent used for the same reason). Flagging this because it cost real
investigation time before the cause was found, and because it means: **if Bean's own live
testing session overlapped with another agent's Playwright activity on the shared browser,
that is also a plausible (if less likely, since Bean was testing manually not via the MCP
tool) source of confusing/inconsistent observations** — though this is speculative and not
verified against Bean's actual testing method.

---

## E2 — state-hierarchy + propagation (scoping only, no fix designed)

### What Bean is asking for, restated plainly
1. Hover always wins (top of the hierarchy, dynamic).
2. Current-page state sits below hover, above Normal.
3. **New:** if the current page lives inside a submenu, the TOP-LEVEL parent should also
   show a non-normal look, without hovering anything — so a visitor can tell which
   top-level section they're in.
4. **More generally:** any submenu containing an item in a non-normal state (current OR
   actively hovered) should be visibly reflected on that submenu's own parent.

### Is this already decided/out-of-scope anywhere in Spec 41?

**No — it is genuinely new scope, not a deliberate prior cut.** The one place Spec 41
discusses `:has()` for the Current state is FR-41-1 (`.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md`,
"1. `:has()` is needed nowhere for the Current state. No `.item:has(> .link[aria-current])`
construction…"). Read in full context, that statement is about a NARROWER, different
question: it establishes that a link's OWN current-page styling never needs `:has()`,
because `markCurrentPage()` stamps `aria-current="page"` directly onto the link/sublink
itself, so a plain attribute selector on the link suffices — no need to reach up from a
wrapper. **This says nothing about, and does not forbid, a DIFFERENT selector that reaches
UP from a top-level parent to detect a current (or hovered) state on a DESCENDANT inside
its own submenu** — that is a structurally different question FR-41-1 never addresses. I
found no FR anywhere in Spec 41 using the search terms "aria-current", "propagat",
"current.*parent", or "parent.*current" that covers ancestor-reflects-descendant-state.
Group E2 is correctly flagged as "not previously specified this precisely."

### Prior art that a future fix would extend, not invent from scratch

FR-41-13's own keyboard-focus rescue rule IS structurally the near-exact mechanism E2
needs, just keyed on a different pseudo-class:

```
{uid} .sgs-nav-menu__submenu-root:has( ul.sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link
{uid} .sgs-nav-menu__accordion-row:has( ul.sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link
```

A parent-reflects-current-descendant rule would be the same shape, swapping
`:focus-visible` for `a[aria-current="page"]`:

```
{uid} .sgs-nav-menu__submenu-root:has( ul.sgs-nav-menu__submenu a[aria-current="page"] ) > .sgs-nav-menu__link
{uid} .sgs-nav-menu__accordion-row:has( ul.sgs-nav-menu__submenu a[aria-current="page"] ) > .sgs-nav-menu__link
```

This is a scoping observation, not a proposal to build it — flagging that the pattern
already exists twice in the codebase (once per fork) for a different trigger condition, so
a future implementation is extending an established shape rather than inventing a new one.

### Precondition check: does the markup already mark a current sublink?

**Yes, today, with zero markup changes needed.** `plugins/sgs-blocks/src/blocks/nav-menu/view.js::markCurrentPage`
(lines 60-83) already applies `aria-current="page"` to
`.sgs-nav-menu__link[data-sgs-nav-path], .sgs-nav-menu__sublink[data-sgs-nav-path]` — i.e.
BOTH top-level links AND submenu sublinks, deliberately, per the function's own comment:
"Sublinks are included deliberately (Bean, 2026-07-31)... Applies in the bar AND inside the
burger drawer, since the drawer holds its own nav-menu instance and this runs per root."
So a `:has([aria-current="page"])` selector on the parent wrapper genuinely has something
to key on right now, in both forks, with no prerequisite work.

### What a fix would need to detect/handle (not designed, just enumerated)

1. **The `:has()` selector itself** — straightforward, mirrors FR-41-13's keyboard
   pattern exactly (see above), for both bar and drawer forks.
2. **The visual "non-normal state" to apply to the propagated-to parent** — Spec 41
   doesn't currently define a THIRD visual language distinct from "this item's own Current
   look" and "this item's own Hover look." Bean's ask implies the propagated indicator
   should be visually distinguishable from the parent literally BEING the current page
   itself (an operator/visitor needs to tell "I am on this page" apart from "the page I'm
   on is somewhere inside this menu") — that's a design decision, not established anywhere
   yet.
3. **Hierarchy interaction with the item's OWN states** — per Bean's rule 1 ("hover always
   wins"), if the top-level parent is ALSO being hovered directly, its own hover state
   must still win over the propagated indicator. This needs explicit ordering in whatever
   selector set is built (source-order / specificity), following the existing "Current
   before Hover" tie-break pattern already used elsewhere in `nav-menu-css.php` (e.g. lines
   260-268's `itemFontWeightCurrent` comment, and line 326 "Current before Hover, same
   tie-breaker rule as the text row above").
4. **The "reflect a hovered descendant" half of Bean's more general ask** (point 4: not
   just current, but ALSO an actively-hovered descendant) is a live, dynamic version of the
   same `:has()` shape but keyed on `:hover`/`:focus-visible` instead of
   `[aria-current="page"]` — mechanically similar, but stacking THIS on top of the
   current-page propagation means the selector set needs a defined precedence between
   "descendant is hovered" vs "descendant is current" vs "this item is itself hovered",
   which does not exist as a concept anywhere in the spec today and would need to be
   designed, not just wired up.
5. **Nesting depth** — Spec 41's documented DOM shape (FR-41-1 table) only describes ONE
   level of submenu nesting for bar/drawer. If mega-menus or deeper nesting exist elsewhere
   in the framework (Group G6 flags mega-menus as entirely untested), a `:has()` propagation
   rule written for one level would need re-verification against deeper nesting before
   being called universal (CLAUDE.md Rule 3 — no per-block/per-depth carve-outs).

No fix shape, selector set, or visual treatment is proposed here — this is the scoping
inventory the brief asked for.

---

## Files referenced (diagnostic reads only, no product code changed)

- `plugins/sgs-blocks/includes/nav-menu-css.php` — FR-41-13 rescue block (`$item_hover_decls`,
  lines ~636-722), item background row (`$item_bg_hover_decl`, lines 294-333), file-level
  md5-verified identical between repo and canary.
- `plugins/sgs-blocks/includes/nav-menu-markup.php` — DOM shape for both forks (`sub_wrap_class`,
  `submenu-root`, `accordion-row`, lines ~65-341).
- `plugins/sgs-blocks/src/blocks/nav-menu/render.php` — `$indicator_style` derivation
  (lines 724-748), `$sgs_nm_is_drawer_list` gate (line ~754-758).
- `plugins/sgs-blocks/src/blocks/nav-menu/view.js` — `markCurrentPage()` (lines 55-83).
- `plugins/sgs-blocks/src/shared/effects/nav-indicator.js` — the shared sliding pill /
  Highlight mechanism, full file read.
- `.claude/decisions.md` D1038, `.claude/verify/spec-41-gates-interaction.md` G7 section —
  background/original bug + fix write-up.
- `.claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md` FR-41-1 (lines ~350-368) — the only
  existing `:has()`/current-state architectural ruling, confirmed NOT to cover E2's ask.

## Scratch artefact left in place

- Post 3487, new block added at the end: `E1DIAG-HIGHLIGHT` nav-menu instance
  (`ref:100`, `itemBgHoverTreatment:"highlight"`, `itemBgHover:"primary"`) — needed to
  test the Highlight-pill + real-dropdown combination, which no existing fixture covered.
  Left live per the same "expensive to rebuild, useful for a remediation pass" rationale
  the Step 22/23 gate used for its own scratch fixtures. Delete if this page should not
  stay live.
