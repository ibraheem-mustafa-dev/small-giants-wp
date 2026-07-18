---
doc_type: spec
spec_id: 34
spec_version: 1.0.0
title: Adaptive-nav disclosure drawer — header-visible rebuild + sgs/nav-menu block + drawer-as-container
project: small-giants-wp
status: active
authors: [Bean (design), Claude (spec)]
session_date: 2026-07-15
last_verified: 2026-07-15
status_history:
  - { date: 2026-07-15, status: active, note: "Bean approved the design and same-session build in-conversation (evening session, D340). Supersedes the modal showModal() drawer model shipped D337/D338." }
references:
  - .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md (§S9 — FR-S9-4/5/6/7; this spec AMENDS FR-S9-5's modality criterion)
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no-inline contract binds every FR here)
  - reports/visual-diff/adaptive-nav-2026-07-15.md (the measured defects this rebuild closes)
  - workspace/memory/research/2026-07-15-drawer-logo-offcanvas.md (0/6 builders ship a drawer logo; text anchor evidence)
  - .claude/plans/2026-07-15-spec34-build-plan.md (the phase plan executing this spec)
absorbs: []
absorbed_by: null
lock_reason: null
---

# Spec 34 — Adaptive-nav disclosure drawer (header-visible rebuild)

## 0. One-liner

Rebuild `sgs/adaptive-nav`'s off-canvas drawer as a **header-visible disclosure panel**:
the header top row stays live while the menu is open (burger toggles to an X in place),
the drawer fills the viewport *below* the header, the dim tint never covers the header,
and the drawer's content becomes a blank-slate InnerBlocks container whose default
children are **[empty container → menu element → empty container]** — with the menu as a
new, fully styleable `sgs/nav-menu` block carrying its own WP-menu picker.

## 1. Why (problem, in Bean's words, and the evidence)

1. *"The animation… finishes with its right edge on the left side or middle of the screen…
   sometimes it goes all the way to the end"* — the modal drawer's geometry depends on
   late-arriving external CSS (mechanism PROVEN by A/B: stylesheet disabled → right edge
   554/768; restored → 768) and on top-layer UA defaults (`position` computed `absolute`
   with **zero** matching author rules at paint time). The scrollbar component is FIXED
   (`ab5c7ca7`); the structural component is fixed **by construction** here: geometry
   becomes explicit and header-relative, with a hard fallback in the block's own CSS.
2. *"Keep the top row of the sgs header on top and just toggle the burger… the modal
   effect… doesn't apply to top header row"* — the current `showModal()` freezes and
   tints the entire page INCLUDING the header, so the burger cannot stay interactive and
   the brand vanishes while the menu is open (the Sceptic's orientation-loss finding).
   Bean's model is the GOV.UK disclosure pattern + Spectra's "Dropdown" header type — it
   dissolves the drawer-logo debate entirely (the real header logo stays visible).
3. *"Our offscreen drawer stays a blank slate container… 3 children/elements that can be
   reordered, 2 of them empty containers… menu element that has full styling… pick which
   menu"* — replaces the hardcoded in-render menu + widget-substitute question with native
   InnerBlocks + `sgs/container` rows.

## 2. Authoritative design decisions (Bean, 2026-07-15 — do not re-litigate)

| # | Decision | Source |
|---|---|---|
| D1 | Header top row stays visible AND interactive while the drawer is open | Bean message, approved design |
| D2 | Burger ↔ X toggle in place; the header toggle IS the close control | Bean |
| D3 | Drawer fills viewport minus header height; tint starts BELOW the header | Bean |
| D4 | Header row stays PINNED while drawer content scrolls (close must stay reachable; recommended by Claude, unchallenged by Bean) | This session |
| D5 | Drawer default children: [empty `sgs/container` → `sgs/nav-menu` → empty `sgs/container`], reorderable, addable, deletable | Bean ("might be easiest if it has 3 children…") |
| D6 | `sgs/nav-menu` = a real block: full styling + a picker for which WP menu it renders; **default inherits the parent nav's menu** (one-source rule, FR-S9-4) with the picker as the deliberate override | Bean + FR-S9-4 |
| D7 | Rows are PURE structural containers, empty by default ("the widgets are literally just used as containers so blocks can't float around") | Bean |
| D8 | Drawer settings mirror the Spectra list: Background, Close Icon Colour, Content Alignment, Inner Element Spacing, Popup Padding — with per-device values | Bean screenshots + message |
| D9 | Changes MUST be reflected in the header/footer builder | Bean |
| D10 | No drawer logo by default; capability decisions from D340 stand | Research + Bean's conditional |

## 3. FR-S9-5 amendment (Bean-approved, binding on Spec 17)

FR-S9-5's criterion *"background content outside the drawer cannot be focused, clicked, or
reached by AT while open"* becomes:

> Background content outside the drawer is frozen (inert/aria-hidden + visually dimmed)
> while open, **EXCEPT the header row carrying the nav toggle**, which remains fully
> interactive — it hosts the close control. The focus cycle while open = header toggle +
> drawer contents. `showModal()` is therefore no longer the conferring mechanism;
> modality-minus-header is provided explicitly (FR-34-1).

Everything else in FR-S9-5 (ESC, scrim-click-to-close, scroll lock, 44px targets,
translatable labels, no `aria-modal`, elementFromPoint regression sweep) carries forward
unchanged. **Focus containment carries forward in PRINCIPLE but its boundary is
REDEFINED by FR-34-1** (qc-council): the contained set is {live header row + drawer},
containment is emergent from the selective freeze rather than a hand-rolled trap, and
FR-S9-5's literal "Tab from the last focusable cycles to the first" bullet is amended in
Spec 17 with a pointer here. FR-S9-5 also states the same background-frozen requirement
in TWO bullets — both now carry the header-exception pointer (a session reading either
literally must land on this spec).

## 4. Functional requirements

### FR-34-1 — Disclosure presentation: explicit geometry, selective freeze

**Behaviour.** The drawer stops using `showModal()`/top-layer. It stays a `<dialog>`
element opened with `.show()` (KJC-1; role `dialog` WITHOUT `aria-modal` — a non-modal
dialog is the honest AT announcement for "panel that does not freeze the header";
`aria-modal` is NEVER set, statically or dynamically), with:

- **Re-parent at open (qc-council MUST-FIX, triangulated ×3):** on first open, view.js
  moves the drawer AND the scrim to be direct children of `<body>` (they stay there for
  the page's lifetime; idempotent). This is the proven D323 pattern, now load-bearing for
  CSS too: without top-layer promotion, (a) the container wrapper's own
  `.sgs-container > *:not(.sgs-container__overlay) { position: relative }` rule at
  (0,2,0) would beat the drawer's (0,1,0) `position: fixed` — the exact clash the block's
  current style.css comment documents as masked by `showModal()` — and (b) ANY
  transformed/filtered/`contain`ed ancestor (e.g. a scroll-animation class on a header
  row) would silently convert `fixed` into ancestor-relative positioning. Re-parenting to
  `<body>` removes every such ancestor by construction. Regression test: computed
  `position` of the OPEN drawer === `fixed` at all three widths.
- **Geometry (explicit, never UA-derived):** `position: fixed;
  top: min(var(--sgs-header-height, 0px), 50dvh); left: 0; right: 0; bottom: 0` — full
  width, viewport minus header. The existing `--sgs-header-height` ResizeObserver
  publisher (FR-S9-9, shipped; verified to publish for EVERY header, not only sticky) is
  the single height source; the `0px` fallback degrades to full-screen, never mis-sized;
  the `min(…, 50dvh)` cap guarantees the drawer keeps at least half the viewport when a
  wrapped multi-row header balloons at high zoom (WCAG 1.4.10/1.4.4 — the drawer content
  region can never collapse to zero). These live in the block's `style.css` base rule
  (structural, not per-instance — Spec 32 compliant) and hold at (0,1,0) BECAUSE of the
  re-parent above.
- **Scrim:** a REAL element rendered by render.php as the dialog's sibling (and
  re-parented with it) — NOT `::backdrop`, which ceases to exist without `showModal()`,
  and NOT the current `e.target === dialog` click-detection idiom, which silently stops
  working with `.show()` (qc-council MUST-FIX). Fixed at
  `inset: min(var(--sgs-header-height, 0px), 50dvh) 0 0 0`, `rgba(0,0,0,.6)`, its own
  click listener = close. Never covers the header.
- **Stacking (explicit, not DOM-order-incidental):** scrim `z-index: 99990`, drawer
  `z-index: 99991` — above all page content, deliberately BELOW `#wpadminbar` (99999).
- **Selective freeze:** on open, `inert` + `aria-hidden="true"` are applied to each
  direct child of `<body>` EXCEPT: (1) the child containing the nav toggle (the header
  chain — found via `child.contains(toggle)`), (2) the drawer, (3) the scrim, and
  (4) `#wpadminbar` (explicitly EXCLUDED — freezing the admin toolbar for logged-in
  editors serves nobody; it sits above the header and outside the page's content flow).
  When `.wp-site-blocks` exists, the same walk is applied one level deeper inside it (its
  children: header part stays live, main/footer freeze). The touched set is tracked and
  restored exactly on close. The D323 self-inert lesson binds: never inert an ancestor of
  the drawer — satisfied by construction post-re-parent. `inert`+`aria-hidden` paired is
  deliberate belt-and-braces (older-Safari inert gaps). Browser floor: inert is native in
  Chrome 102+/Safari 16.4+/Firefox 112+; below that, `aria-hidden` still applies and the
  scrim still intercepts pointer input across the frozen area — accepted degradation.
  Known consequence, accepted: `aria-live` regions inside frozen content (e.g. cart
  toasts) do not announce while the drawer is open.
- **Focus:** containment is EMERGENT from the freeze, not a hand-rolled trap (qc-council
  MUST-FIX — the live region is the whole header row, incl. cart/logo, so a hardcoded
  toggle-wrap would fight natural Tab order): with everything else inert, the browser's
  own Tab order already cycles through {live header elements + drawer contents} only. No
  wrap-target code. On open, focus moves to the first FOCUSABLE element inside the drawer
  (query `a[href], button, [tabindex]:not([tabindex="-1"])…` — skip non-interactive
  first children); if none exists, focus the drawer itself via `tabindex="-1"`. ESC —
  bound at `document` level, guarded on this instance being open (focus may legitimately
  sit on a live header element) — closes and EXPLICITLY calls `toggle.focus()` (Safari
  does not focus buttons on click; never rely on native click-focus). Scrim-click and
  toggle-re-click close paths do the same explicit focus return.
- **Scroll lock:** existing `lockScroll()`/`unlockScroll()` INCLUDING the D340 scrollbar
  pin, unchanged.
- **Animation:** slide-down from under the header (`transform: translateY(-100%)` →
  `0` within an `overflow` clip, 250ms entry / 200ms exit, existing curves),
  `prefers-reduced-motion` → no transform transition. Direction is a DEFAULT pending
  Bean's eye at QC (flagged, not silently decided).
- **No-JS:** the toggle is a no-op link/summary fallback exactly as today (progressive
  enhancement clause of FR-S9-5 unchanged).
- **Semantics note for implementers:** this drawer is a deliberate dialog/disclosure
  HYBRID — `aria-expanded` disclosure semantics on the toggle + a non-modal dialog panel
  + freeze-based containment. It is NOT the mega-panel's pure-disclosure pattern (no
  freeze, no ESC-mandate) documented at the top of view.js — do not "simplify" one into
  the other in either direction.

**Model:** Opus (a11y-critical shared mechanism; the freeze/focus logic is the risk).
**Test strategy.** (1) Unit-ish: none — this is DOM behaviour. (2) Live Playwright 375 +
768 + 1440: open → header row `elementFromPoint` returns the toggle (not BODY/scrim);
every drawer link returns itself (FR-S9-5 sweep, baseline 10/10 Mama's); everything below
the header unreachable (probe a hero link → returns scrim/inert). (3) Geometry: drawer
`getBoundingClientRect().top` === header bottom ±1px at all three widths; frame sweep
during open shows width/anchor CONSTANT (the D340 bounce test, re-run). (4) axe-core on
the open state = 0 violations; ESC + focus-return + Tab-wrap asserted.
**Done when:** all of (2)–(4) pass live on the canary with full cache clear, and the
`position`/geometry of the open drawer is identical with the block's external CSS
force-disabled then restored (the late-CSS A/B — proves the class is dead).

### FR-34-2 — Burger ↔ X toggle; drawer head row removed

**Behaviour.** The header burger toggles `aria-expanded` and swaps its icon burger↔X in
place — both icons server-rendered inside the button, each carrying
`aria-hidden="true" focusable="false"` explicitly (`sgs_get_lucide_icon()` emits bare
SVG with neither — qc-council grep-verified; match the `buildChevron()` idiom), swapped
via `display: none` keyed on `[aria-expanded]` (pinned to `display`, NOT opacity — a
faded icon would stay in the accessibility tree). The accessible name stays
`menuButtonLabel` ("Menu") in BOTH states — APG-correct for an icon-only disclosure
toggle; state is conveyed by `aria-expanded` alone. It remains the ONLY close affordance chrome; the drawer's internal head row
(logo + close button) is **REMOVED entirely**, along with its now-purposeless attrs:
`showLogo`, `drawerHeadBg`, `logoMaxWidth`, `closeButtonSize`, `drawerSide`,
`drawerWidth` (geometry is now fixed full-width-under-header; shipped D339/D340, zero
stored content depends on them — pre-production, no deprecations needed, and their
REMOVAL is not a reshape so the Spec 17 shape freeze is not violated). `drawerBg` and
`drawerLabel`/`menuButtonLabel` remain. The 44px target and translatable labels carry
forward. `aria-controls` wiring unchanged (uid-based, D339c).

**Model:** Sonnet (mechanical once FR-34-1's contract exists).
**Test strategy.** (1) Static: grep — removed attrs absent from block.json/edit.js/
render.php/style.css (no orphaned controls — the dead-controls gate must stay green).
(2) Live: click → `aria-expanded` flips + X visible + burger hidden; click again → closes;
toggle bounding box ≥44×44 in both states. (3) Editor: inspector no longer shows the
removed controls; Drawer panel shows the FR-34-5 surface. (4) axe on the toggle in both
states.
**Done when:** live toggle cycle works at 375; removed-attr grep is clean; gates green.

### FR-34-3 — Drawer content = InnerBlocks container, template [container, menu, container]

**Behaviour.** The drawer body renders ONE InnerBlocks zone (replacing both the hardcoded
menu markup and the current separate drop-zone), `template: [ ['sgs/container', {}],
['sgs/nav-menu', {}], ['sgs/container', {}] ]`, `templateLock: false` — reorder, delete,
add freely (STOP-NO-ALLOWLIST: no allowlist). Empty `sgs/container` children emit zero
frontend output (existing wrapper behaviour — verify, don't assume). Existing drawer
content authored on live pages (the D331 business-info drop-zone items) must survive:
InnerBlocks content is stored in the template part / nav markup, and the zone REPLACES
the old zone in place — verify the Mama's + framework-header-default drawer children
still render.

**Model:** Sonnet.
**Test strategy.** (1) Editor: fresh insert shows 3 children; reorder menu above container
→ saves → frontend order matches. (2) Live: default drawer shows menu only (empty
containers render nothing — assert no empty wrapper divs in the drawer DOM). (3) Existing
content: the canary's current drawer children (email business-info, socials) still render
after deploy. (4) The no-inline audit stays 0/77.
**Done when:** (1)–(3) verified live on the canary.

### FR-34-4 — `sgs/nav-menu`: the menu as a first-class styleable block

**Behaviour.** New block `sgs/nav-menu` (5-file pattern, auto-registered from
`build/blocks`). Renders the accordion menu the drawer renders today — the walk lives in
**`includes/class-sgs-adaptive-nav-renderer.php`** (`render_drawer_menu` →
`render_drawer_items`/`_link`/`_submenu`/`_mega_menu`/`_page_list`, L328–L640), NOT in
render.php, which only calls it (qc-council file-pointer fix). The extraction is a
**deliberate COPY re-rooted to `sgs-nav-menu__*` BEM classes** — the renderer's private
methods hardcode `sgs-adaptive-nav__drawer-*` class names, so reuse-by-call would emit
the wrong classes; and after FR-34-3 stops calling them, those drawer methods become
dead code and are DELETED in the same integration step (single owner, no duplicate
accordion listeners — `setupDrawerAccordions()` leaves adaptive-nav's view.js when
nav-menu's own view.js takes over). `SGS_Nav_Menu_Source` (menu RESOLUTION) is reused
by call — it is a stable shared static library. All links server-rendered `<a href>`,
ARIA disclosure accordions, `aria-current="page"`, 44px rows, mega-menu items rendered
as accordion panels exactly as today. **Uid discipline (qc-council):** the block's uid
uses the same md5(attributes)+anchor derivation as adaptive-nav — its uid feeds
per-panel `aria-controls` ids, and two default-attribute instances on one page (drawer +
footer column, the spec's own example) would otherwise collide; test with two default
instances on one page.

- **Menu source:** attr `ref` (number, default null). `null` = inherit the parent
  `sgs/adaptive-nav`'s resolved menu via **block context** (`sgs/adaptive-nav` declares
  `providesContext: { "sgs/navRef": "ref" }`; `sgs/nav-menu` `usesContext`) — the
  FR-S9-4 one-source rule holds by default. Setting `ref` in the picker (same
  `useEntityRecords('postType','wp_navigation')` UI as adaptive-nav's) is the deliberate
  independent-tree escape hatch. Fallback chain when both are null: page-list, matching
  the nav's `menuFallback` semantics.
- **Styling:** link colour + hover (DesignTokenPicker, `linked`), typography via the
  shared `TypographyControls` + `sgs_typography_css_rule` (R-22-13 — the shared component,
  never bespoke), item padding + divider toggle/colour (`showDividers`/`dividerColour` —
  the two §S9 roster capabilities that belong HERE, not on the nav), accordion caret
  colour inherits `currentColor`. All emitted via the block's scoped `<style>` (Spec 32).
- **Foreground default:** inherits the drawer's computed colour (`color: inherit`) — the
  D339 WCAG resolver on `drawerBg` keeps contrast holding with zero configuration.
- Usable OUTSIDE the drawer too (a footer menu column, e.g.) — parent-agnostic; context
  simply absent → `ref`/fallback used. `parent` NOT restricted in block.json.

**Model:** Opus (new block, extraction from a live a11y surface, context plumbing).
**Test strategy.** (1) Conformance: drawer menu DOM before vs after extraction —
byte-comparable structure (same classes/ARIA; uid prefixes may differ). (2) Live: default
inherits the nav's menu (same links as the desktop bar); set a different menu in the
picker → drawer renders it while the bar keeps the original (escape hatch proven).
(3) a11y: accordion keyboard traversal + `aria-expanded` + axe 0 on the open drawer.
(4) Standalone: insert `sgs/nav-menu` in a footer column on a draft page → renders +
picker works with no adaptive-nav ancestor. (5) Gates: dead-controls/F3/control-ux green;
`/sgs-update` registers the block (FR-S9-11 discipline — spot-check its DB rows).
**Done when:** (1)–(4) live-verified; DB rows exist and are queryable via `/sgs-db`.

### FR-34-5 — Drawer settings surface (the Spectra list, per-device)

> **Status: NOT-BUILT (research-verified 2026-07-18, Track-2 P1 spec-truth audit).** Only `drawerBg`
> (Background) exists in the live block; the other four controls (`toggleOpenColour`, `drawerAlign`,
> `drawerGap`, `drawerPadding`) are specced-but-unbuilt. This is the ONE genuine gap the P1 audit found
> across Spec 17 §S9 + Spec 34 — every other checkable FR verified accurate against live code. FR-34-5
> folds into the Track-2 header/footer full-clean-rebuild
> (`.claude/plans/2026-07-18-P1-architecture-decision-header-footer-nav.md`); it may be redesigned there
> rather than built as specced below.

**Behaviour.** On `sgs/adaptive-nav`, a "Drawer" inspector panel with:

| Setting | Attr | Shape | Default | Notes |
|---|---|---|---|---|
| Background | `drawerBg` (existing) | string slug | `primary` | fg computed (D339) — unchanged |
| Close icon colour | `toggleOpenColour` | string slug | `""` = computed from header context | X colour when open; burger colour untouched (owned by header styling) |
| Content alignment | `drawerAlign` | string enum `left`/`center`/`right` (CSS keywords — the US spelling is the syntax, exempt per the UK-English rule) | `left` | maps to align-items on the drawer body; children may override |
| Inner element spacing | `drawerGap` | object `{desktop,tablet,mobile}` | `{desktop:"20px"}` | gap between child rows; NEW attr → tier object allowed (sibling rule, Spec 17 freeze respected) |
| Popup padding | `drawerPadding` | object `{desktop:{top,right,bottom,left},…}` | `{}` | replaces the hardcoded `padding: var(--wp--preset--spacing--40)`; emitted via `sgs_emit_responsive_css` |

Per-device editing via the existing shared `ResponsiveControl` device switcher (reuse —
do NOT build a new switcher; FR-S9-6's full editor spec remains its own future work).
All emission through the shared responsive helpers into the scoped `<style>`; zero inline.

**Model:** Sonnet.
**Test strategy.** (1) Editor: each control present, per-device switch works, values
persist. (2) Live: set distinct desktop/mobile gap + padding → computed styles match per
tier (measure at 1440 + 375); each of the three alignment values computes on the body.
(3) Shape check vs block.json (the D328 class) for every new attr. (4) Gates green
(dead-controls especially — every attr must be consumed).
**Done when:** live per-tier measurements match the set values on the canary.

### FR-34-6 — Header/footer builder reflection

**Behaviour.** The Site-Editor building experience stays coherent with the new model:

- **⛔ INSERT `<!-- wp:sgs/nav-menu /-->` as the FIRST child of `sgs/adaptive-nav` in
  BOTH `parts/header.html` (L13–16) and `framework-header-default.php` (qc-council
  MUST-FIX, fact-checked):** both files already carry drawer children (business-info +
  social-icons), and WP's InnerBlocks `template` only seeds EMPTY blocks — without this
  edit the flagship header (and the Mama's canary, same part) ships a drawer with
  contact links but **zero navigation**, invisible to every test that only checks the
  existing children. The two files stay byte-identical apart from their headers (§S1);
  FR-S4-5 linter stays green and runs in this step's own self-test.
- `sgs/site-header`'s template + the `sgs_header` CPT template (FR-S9-11) still open with
  a working nav; the drawer's InnerBlocks zone is editable from within the Site Editor
  (template part → adaptive-nav → drawer children visible and editable in the canvas or
  via the list view).
- The editor preview (`edit.js`) renders a recognisable drawer placeholder with the
  template children (a live-preview iframe is NOT required — parity with how the block
  previews today, improved only if free).
- `/sgs-update` reseeds: `blocks` roster (+`sgs/nav-menu`), `block_attributes` (removed +
  added attrs), `block_composition`/`composition_role` for the new block. Spot-verify
  rows (FR-S9-11: never assume the seeder ran clean).
- Spec 17 §S9 FR-S9-4/5 BUILT notes get a one-line pointer to this spec (no restating).

**Model:** Sonnet.
**Test strategy.** (1) Site Editor: open the header template part → select adaptive-nav →
drawer children listed + editable; insert a block into a drawer container; save;
frontend shows it. (2) `wp_navigation`-driven links unchanged in the bar. (3) Linter +
pattern-registration regression (Replace picker still lists the header pattern).
(4) `/sgs-db` spot-checks. **Done when:** an operator can restyle + reorder the drawer
from the Site Editor alone and the change lands on the frontend (verified once, live).

### FR-34-7 — Live QC gate (closes the build; no FR closes without it)

The per-block DONE checklist + STOP-67 apply. Specifically, in one live pass on the
canary after the final deploy: 375/768/1440 sweeps; open-state axe = 0; the FR-S9-5
elementFromPoint sweep ≥ baseline (10/10); ESC/focus/Tab-wrap; scroll-lock + scrollbar-pin
frame sweep (anchor constant); tint-excludes-header screenshot pair for Bean (R-31-13 —
his eye closes the LOOK, numbers close the mechanics); no-inline audit 0/77; both
STOP-67 reports (`adaptive-nav`, `nav-menu`) with `verdict: PASS` +
`first_paint_capture_passed: true` BEFORE the commit (the gate anomaly D339d means the
hook may not save you). **Done when:** every row above has a measured value in the
report, and Bean has the screenshot pair.

**Tools for each clause (don't hand-roll these):**

| Clause | Tool |
|---|---|
| 375/768/1440 sweeps + the STOP-67 report shape (`reports/visual-diff/`, `verdict: PASS`) | `/visual-qa` |
| open-state axe = 0 | `/a11y-audit` (run it with the drawer OPEN — a closed-drawer pass proves nothing) |
| `elementFromPoint` sweep · ESC/focus/Tab-wrap · scroll-lock frame sweep | Playwright MCP (or chrome-devtools MCP if Playwright reports "browser already in use") |
| Deploy to the canary before measuring | `build-deploy.py --target sandybrown` — never a hand-rolled tar/scp (D336) |
| Any live CSS/geometry measurement | Hostinger MCP `hosting_clearWebsiteCacheV1` **first**, plus `wp litespeed-purge all` (LiteSpeed IS active on sandybrown) — the CDN edge otherwise serves the stale `?ver` and you measure the old file |
| The scrollbar-pin / bounce clause | **Desktop viewport with a classic scrollbar.** Device emulation cannot reproduce the scrollbar-vanish bounce — measure it on a real desktop width or the check is vacuous |
| Bean's screenshot pair (R-31-13) | Cropped pair, tint-excludes-header. His eye closes the LOOK; numbers close the mechanics. Neither closes alone |

## 5. Out of scope (the NOT list)

- Spectra's Header-Type VARIANTS (Flyout / Full-Screen alternatives) — Bean specced ONE
  model; a `variant` enum is future sibling-attr work.
- Bottom-sheet / overlay variants from the old §S9 roster; `drawerMaxWidth`,
  `closeButtonStyle`, `accentColour` (obsolete or deferred with the variants).
- FR-S9-6's full per-breakpoint editor switcher spec (we REUSE `ResponsiveControl`).
- The framework/per-site header split (next-session Step 1), Goal 4/1 replication.
- `P-MODAL-SCROLLBAR-GUTTER`, `P-UIMAX-DRAWER-LOGO-AUTODERIVE` (parked; the latter is
  near-moot under this design — note on the parking entry at close, do not delete it
  unilaterally).
- Mega-menu desktop behaviour (unchanged; only its drawer/accordion rendering moves with
  the menu extraction).

## 6. Open questions (Bean, non-blocking — defaults chosen, flag at QC)

1. **Slide direction:** slide-down-from-header (dropdown idiom) is the default built;
   Bean has not explicitly chosen a direction for the new geometry. His eye at FR-34-7
   decides; a direction change is a 2-line CSS tweak.
2. **Drawer scrim opacity** stays 0.6 — same as today.
3. **Forward note (qc-council):** `drawerGap`/`drawerPadding` ship with a bespoke
   `{desktop,tablet,mobile}` object shape ahead of FR-S9-6's canonical shared model.
   Permitted (new attrs), but when FR-S9-6 ships, these two attrs will have live stored
   values and CANNOT be reshaped (Spec 17 freeze) — FR-S9-6's model must therefore be
   shape-compatible with this emitter's existing contract (`helpers-responsive.php`), or
   these attrs stay on the legacy emitter permanently. Recorded so FR-S9-6's designer
   inherits the constraint knowingly.

**Removed-attr safety (measured, not asserted — qc-council A#4):** `wp db query` on BOTH
live sites (sandybrown + palestine-lives), all publish/draft post_content, for the six
removed attr names: **zero rows**. KJC-5's "zero stored instances" is verified.

## 7. Constraints that bind every FR

Spec 32 no-inline (values-only inline custom properties allowed) · Spec 17 §S9 shape
freeze (new attrs may be objects; existing attrs never reshape) · no deprecations/version
bumps (D270/D293; attr REMOVAL on a pre-production block is sanctioned, reshape is not) ·
composite-mirror (the nav keeps delegating outer rendering to `SGS_Container_Wrapper`) ·
UK English · WCAG 2.2 AA · 44px targets · crawlable server-rendered links (no AJAX,
D334) · every editor control must render (dead-controls gate) · PowerShell for node/npm ·
canary-first deploys · full cache clear before every live measurement.
