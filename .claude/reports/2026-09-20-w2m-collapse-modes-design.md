---
doc_type: design
project: small-giants-wp
date: 2026-09-20
status: DRAFT for design-gate
plan_row: W2-m
specs: 36-SGS-NAVIGATION-SYSTEM (FR-36-8, FR-36-24), 18-SGS-FLOATING-UI
---

# W2-m — Collapse modes (b) priority+More and (c) bottom-tab-bar: design gate

**Nothing here is built.** `sgs/nav-bar-menu` has no attribute and no code for either mode — the
only mention anywhere in the plugin is a comment in
`plugins/sgs-blocks/src/blocks/site-header/style.css`. Spec 36 FR-36-8 marks both **NOT BUILT
(planned)** and instructs that the bottom-bar overlap with Spec 18 is resolved *before* (c) is
built. That resolution is §2 of this document.

---

## 1. Plain English first

Today, when the browser gets narrower than the "collapse point" the client chooses, the row of menu
links disappears and a burger icon appears; tapping it opens the drawer. That is mode (a), and it
works.

Two more modes were promised:

- **(b) "priority + More".** Instead of everything vanishing at once, the links that no longer fit
  fold one at a time into a **"More ▾"** button at the end of the row. You keep as many real links
  visible as the space allows.
- **(c) "bottom tab bar".** On a phone, the main 3–5 destinations move to a fixed strip along the
  **bottom** of the screen, in thumb reach, each as an icon with a label — the pattern every phone
  app uses.

There is a collision waiting in (c). A bottom tab bar is a bar pinned to the bottom of the screen.
So is a sticky "Add to basket" bar. So is a cookie notice. So is the back-to-top button the
framework already ships. If each one decides its own position independently, they stack on top of
each other, and the usual industry fix is a trail of hand-written `!important` offsets. **Spec 18
already wrote down the correct answer** (one shared container everything mounts into) and parked it.
This document decides who owns that container before either feature is built.

---

## 2. The overlap resolution (decide this first)

### 2.1 What each spec currently claims

| Source | Claim |
|---|---|
| `.claude/specs/18-SGS-FLOATING-UI.md` §1.1 | *"Persistent bottom CTA / cart / sale bars are Spec 18 territory."* Plus the binding instruction: **"Build the shared bottom stacking container BEFORE adding a second bottom-anchored element."** Names the technique (one `position:fixed; bottom:0; display:flex; flex-direction:column-reverse` wrapper), names `env(safe-area-inset-bottom)` as load-bearing, names WCAG 2.4.11 technique F110 and the missing bottom-edge `scroll-padding` guard. Status **DEFERRED**. |
| `.claude/parking.md::P-FLOATING-UI-BOTTOM-BARS` | Same constraints, `Status: DEFERRED`, *"needs its own design gate before any build"*. |
| `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` FR-36-8(c) | *"Resolve the overlap with the floating-UI bottom bars (`P-FLOATING-UI-BOTTOM-BARS`, Spec 18) before building (c)."* Repeated as a risk row later in the same spec. |

### 2.2 What is already in the tree

`plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php` renders, on `wp_footer`
priority 20:

```html
<div class="sgs-floating-ui" aria-hidden="true">
  <style> .sgs-floating-ui { --btt-bg: …; --btt-pos: …; } </style>
  …reading-progress…
  …back-to-top button…
</div>
```

So **a container already exists** — but two things about it matter:

1. ⚠ **It carries `aria-hidden="true"` on the wrapper.** A bottom tab bar is site navigation and
   must be in the accessibility tree. **Mounting nav into this element as it stands would hide the
   site's primary navigation from every screen reader.** This is not a theoretical objection; it is
   one attribute on a live file.
2. It is a **decoration** layer (progress bar, back-to-top), not a **stacking dock**. It has no
   ordering model, no height publisher, no safe-area handling, and nothing sets
   `scroll-padding-bottom`.

### 2.3 Recommended ownership and seam

> **Spec 18 owns the DOCK. Spec 36 owns the NAV CONTENT. The seam is a registration call, not a
> shared stylesheet.**

Concretely:

- **Spec 18 builds `Sgs_Bottom_Dock`** — a new renderer emitting one
  `<div class="sgs-bottom-dock">` on `wp_footer`, **without** `aria-hidden`, holding slots in a
  declared order (`column-reverse` flex so the DOM order reads bottom-up). It owns:
  - `env(safe-area-inset-bottom)` padding;
  - publishing `--sgs-bottom-dock-height` from a `ResizeObserver` — **the exact mirror of
    `--sgs-header-height`**, and with the same honesty lesson applied from day one: publish the
    measured **top edge distance**, gated on the dock actually being pinned and non-empty, with an
    explicit `0px` when it is not (`plugins/sgs-blocks/src/header-behaviours/view.js::publishHeight`
    is the reference implementation to copy, including the explicit-zero rule);
  - `html { scroll-padding-bottom: var(--sgs-bottom-dock-height, 0px) }` — the bottom-edge
    WCAG 2.4.11 guard Spec 18 §1.1 names as currently missing;
  - migrating the existing back-to-top and reading-progress into it (reading-progress is a top-edge
    element and stays where it is; only the back-to-top moves).
- **Spec 36 (`sgs/nav-bar-menu`) renders the tab-bar markup and registers it into the dock.** It
  never prints `position:fixed` itself and never sets a `z-index`.
- **The registration mechanism already has a precedent in this repo.** `sgs/nav-drawer` is a
  sibling `<dialog>` with no template-part slot; it renders on `wp_footer` priority 5 through
  `Sgs_Drawer_Render`, with `note_burger()` / `mark_served()` as the registry and a one-per-request
  landmark guard (`.claude/decisions.md::D419`, which also proves the `wp_footer` ordering is safe
  against the CSS registry's page buffer). **Copy that shape.** A block calls
  `Sgs_Bottom_Dock::register( $slot_key, $html, $priority )` during its own render; the dock prints
  what it was handed.

**Slot classes, per Spec 18's own ruling that a cart bar and a promo bar are different classes:**

| Slot | Class | Rules |
|---|---|---|
| `nav` | navigation | Persistent, never dismissible, always in the a11y tree, `<nav>` with its own `aria-label`. At most **one**. |
| `transaction` | one transactional action (add to basket, book now) | Persistent, not dismissible, at most **one**. |
| `promo` | promotional | **Must be dismissible and small.** Spec 18 §1.1 already flags that the circulating "15–25% of screen" figure is inferred, not a Google citation — so whatever threshold we adopt is our design rule and must be written as ours. |
| `utility` | back-to-top, chat | Floats above the bars, does not consume dock width. |

### 2.4 Alternatives considered and rejected

- **Spec 36 owns the container.** Rejected: the dock must exist for a cart bar on a site with no
  bottom tab bar at all. Ownership would sit in the wrong spec the moment the second element
  arrives — which is precisely the failure Spec 18 §1.1 was written to prevent.
- **Reuse `.sgs-floating-ui` as-is.** Rejected on the `aria-hidden` finding in §2.2.
- **No container; the tab bar sets its own `position:fixed`.** Rejected: this is the documented
  industry failure mode, and it is already written down as such in the parking entry.

---

## 3. Mode (b) — priority + "More"

### 3.1 A structural correction before the design

Spec 36 FR-36-8 presents three "collapse modes" as one operator choice. **They are not the same
axis.**

- (a) burger→drawer and (c) bottom-tab-bar both answer: *what happens **below** the collapse point?*
- (b) priority+More answers: *what happens **above** the collapse point when the links don't fit?*

Modelling all three as one enum makes "priority+More" mutually exclusive with "burger below the
collapse point", which is wrong — a site wants both, and (b) is what stops the row hitting the
collapse point in the first place. **Recommendation: two attributes, not one three-valued enum.**
See §5.

### 3.2 A data-model correction

FR-36-8 says overflow uses *"a per-item priority attribute"*. `sgs/nav-bar-menu` does not own its
items: it holds `ref`, a WordPress menu ID (`plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`,
`$ref = absint( $attributes['ref'] )`), and items come from that menu. **There is no per-item block
attribute surface to hang a priority on.**

Two honest routes:

| Route | Shape | Verdict |
|---|---|---|
| **Order-based** | Items overflow right-to-left in menu order. Zero new data. | **Recommended for the first slice.** It is what the client already controls — they reorder the menu and the priority changes. |
| **Per-item meta** | `_sgs_nav_priority` post meta on each `nav_menu_item`, edited in the Menus screen. | Optional later slice. Note the client-experience rule: clients live in the block editor, and the classic Menus screen is a developer surface. If this is built, the control belongs in the block's own inspector as a **pin list**, keyed by item identifier — exactly the pattern `featuredItemIds` already uses (and `render.php` already carries the comment explaining why it is keyed by identifier, never by index). |

### 3.3 Measuring without layout shift

The defect to avoid is the row painting wide, then visibly snapping narrower.

1. **Server renders every item, plus the More button already in the DOM with `hidden`.** No JS
   insertion, so no reflow from new nodes.
2. **Base CSS wraps** (`flex-wrap: wrap`). This is the no-JS state and it is correct: every link is
   present and visible. Nothing is hidden by CSS alone.
3. **JS adds `.is-priority-ready` to the nav on its first measurement pass**, which switches the row
   to `flex-wrap: nowrap; overflow: hidden`. Because a `ResizeObserver` callback runs *before*
   paint, the row never paints in the wrapped state on a fast load.
4. **Each item's intrinsic width is measured ONCE**, while everything is visible, and cached
   (`offsetWidth` + resolved `margin-inline`). Subsequent passes are arithmetic against the cached
   widths, not repeated layout reads — one `getBoundingClientRect()` on the container per pass.
5. **Overflow decision:** walk from the last eligible item backwards, subtracting cached widths
   until `sum + moreButtonWidth <= containerWidth`. The More button's own width is included in the
   budget from the start, so the last item does not flip in and out.
6. **Items MOVE** into the More panel's `<ul>` — they are not duplicated. Duplication would produce
   two elements with the same accessible name, two `aria-current="page"` matches, and two copies of
   any `id`.
7. **Hysteresis:** re-show an item only when the available width exceeds its width by a small
   margin (recommend 8px), so a 1px resize wobble cannot oscillate.

**Refusals worth stating:** no `IntersectionObserver` (it answers "is it visible", not "does it
fit"); no `ResizeObserver` on every item (one observer on the container is sufficient and cheaper);
no CSS-only `:has()` trick (it cannot count widths).

### 3.4 Accessibility of the More disclosure

**Reuse the existing disclosure machinery; do not invent a second one.** The bar already has a
submenu/mega disclosure with `aria-expanded` / `aria-controls`, hover-intent, a safe triangle,
ESC-to-close and the shared `store('sgs/nav')` open-state
(`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js`). "More" is one more
disclosure of exactly that kind.

- More is a `<button aria-expanded aria-controls>`, never a link.
- Its accessible name must not be the bare word "More" alone in isolation — use
  `aria-label="More menu items"` (or the nav's own label), so a screen-reader user listing buttons
  on the page can tell it apart from any other "More".
- An item carrying `aria-current="page"` that has been moved into the overflow must be announced:
  the More button gets a visible marker and `aria-description`/appended visually-hidden text saying
  the current page is inside. Otherwise the current-page indicator silently disappears.
- Focus order follows the DOM, and the DOM matches the visual order because items are *moved*.
- ESC closes and returns focus to the More button — already the shipped behaviour for the other
  disclosures.
- Reduced motion: no open/close animation beyond what the existing disclosures already honour.

### 3.5 No-JS

Per FR-36-8: *"with no JS all items simply show/wrap."* §3.3 step 2 delivers exactly that, because
the `nowrap`/`overflow:hidden` only arrives with a JS-set class. **This is load-bearing** — the
opposite order (CSS hides, JS un-hides) would hide real links from no-JS visitors and from any
crawler that does not execute the script, which would break the spec's own "every link is real and
visible to Google and AI search" claim.

### 3.6 Mega items and split layout

- **Mega-trigger items are priority-locked and never overflow.** A mega panel's geometry is anchored
  to the bar; inside a narrow More dropdown that anchoring is meaningless. Locking them is one line
  in the eligibility filter.
- **Featured items (`featuredItemIds`) are priority-locked** for the same reason they were made
  featured.
- **Split layout** (`splitAfterItemId` / `splitSide`) renders two groups with something between
  them. Measurement must run **per group**, against that group's own available width, and each group
  gets its own More button — one shared More would pull items across the split and break the
  authored arrangement. `showBurger` is already per-half, so the precedent for per-half behaviour
  exists.
- **If fewer than two items would remain visible**, abandon overflow for that group and fall through
  to the collapse point instead. A row showing one link and a More button is worse than a burger.

---

## 4. Mode (c) — bottom tab bar

### 4.1 When it is the collapse mode

Below `collapsePoint`, instead of the burger-only row, the bar renders a fixed strip in the dock.
The header row itself still shows the logo and any utility items — the tab bar replaces the
*navigation*, not the header.

### 4.2 Item count, icons and labels

| Rule | Value | Why |
|---|---|---|
| Item count | **3 minimum, 5 maximum** | Below 3 a tab bar is not a tab bar; above 5 the targets fall under 44px on a 320px viewport. FR-36-8 already names 3–5. |
| Labels | **Required, not optional** | Icon-only bottom bars are the single most common a11y failure of this pattern. A `bottomTabShowLabels` toggle is offered but defaults **on**, and switching it off must still leave an accessible name on every tab. |
| Icons | Required | From the existing Lucide set (`includes/lucide-icons.php`). No new icon infrastructure. |
| Target size | 44px minimum in both axes | Already the framework floor. |
| Item source | A block-level `bottomTabItems` list of `{ itemId, icon }`, picking from the same WP menu | Same identity-keyed approach as `featuredItemIds`; avoids inventing per-item menu meta (§3.2). |

### 4.3 Active state

Derived from `aria-current="page"`, which `sgs/nav-bar-menu` already emits and already styles a
three-state family against (`itemColourCurrent` / `itemBgCurrent` / `itemFontWeightCurrent`). **Do
not invent a second current-page mechanism.** The tab bar reuses the same resolution and the same
colour rows.

### 4.4 The "More" tab and the drawer

**Yes — the burger survives, as the last tab.** When the menu has more items than tab slots, the
final slot becomes a "More" tab that opens the **existing drawer**, through the existing
`drawerRef` → `Sgs_Drawer_Render::drawer_ref_for()` path and the existing
`store('sgs/nav')` open-state sync. Controlled by `bottomTabMoreTab` (default **on**).

This is the cheapest correct answer: the drawer, its focus trap, its ESC handling, its
one-per-request landmark guard and its seven starter looks all already exist and are live-verified.
Re-implementing an overflow surface for the tab bar would duplicate all of it.

### 4.5 Hide-on-scroll interplay

The header's hide-on-scroll is a header behaviour and does not reach the dock. **Ruling: the bottom
tab bar does NOT hide on scroll.** It is primary navigation, and Spec 18 §1.1 already draws the
line between navigation chrome (persistent) and promotional chrome (dismissible). A `promo` slot
element may hide on scroll; the `nav` slot may not.

If a client asks for a hiding tab bar later, that is a separate decision, and it must carry a
`scroll-padding-bottom` story — a dock whose height changes while the guard reads a stale value is
the bottom-edge version of the same defect W2-p is fixing at the top edge.

### 4.6 Safe area, keyboard and focus order

- Dock padding is `max( <authored padding>, env( safe-area-inset-bottom ) )`. `dvh` does **not**
  solve this — Spec 18 §1.1 explicitly flags conflating the two as a common error.
- **Focus order:** the dock renders on `wp_footer`, so in DOM order the tab bar is the **last**
  thing on the page. That is correct and matches how native apps behave with an external keyboard,
  and it means the skip link and the page content are reached first. Do **not** reorder it with
  `tabindex` — positive `tabindex` values are their own a11y defect.
- The tab bar is a `<nav>` with its own `aria-label` (e.g. "Primary, bottom"), distinct from the
  header nav's label, so a screen-reader landmark list does not show two identically-named
  navigations.
- Visible focus ring must not be clipped by the dock's own overflow.
- `scroll-padding-bottom` from `--sgs-bottom-dock-height` covers WCAG 2.4.11 (technique F110) for
  keyboard focus landing behind the bar.

---

## 5. Attributes, tier shape, and how `collapsePoint` interplays

### 5.1 The attribute set

On `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`:

| Attribute | Type | Default | Governs |
|---|---|---|---|
| `overflowMode` | string enum `wrap` \| `priority-more` | `wrap` | **Above** the collapse point |
| `collapseMode` | string enum `drawer` \| `bottom-tab` | `drawer` | **Below** the collapse point |
| `bottomTabItems` | array of `{ itemId, icon }` | `[]` | Which menu items become tabs, and their icons |
| `bottomTabShowLabels` | boolean | `true` | Labels under icons |
| `bottomTabMoreTab` | boolean | `true` | Last slot opens the existing drawer |
| `priorityLockedItemIds` | array of item identifiers | `[]` | Items that never overflow (mega + featured are locked automatically; this is the manual addition) |

### 5.2 Tier objects — the ruling

**Neither `overflowMode` nor `collapseMode` is a tier object, and that is deliberate.**

FR-36-8 is explicit that `collapsePoint` is a **visual breakpoint** chosen by the operator,
*distinct* from the 768/1024 device-tier style system. These two modes are defined relative to
`collapsePoint`, so keying them to device tiers would create a second, disagreeing breakpoint model
— the exact conflation `~/.claude/rules` and the project CLAUDE.md's "device-tier vs visual
breakpoints" section warn against.

Per-device **values** still use tier objects where they are genuinely per-device (tab icon size,
label font size), through the shared `ResponsiveControl`. Per the built lint gate
(`plugins/sgs-blocks/scripts/lint-responsive-controls.py`), no new bespoke per-device control may be
invented, and no per-control device switcher may be added (inspector-scan rule 25).

### 5.3 Interplay table

| `overflowMode` | `collapseMode` | Above collapse point | Below collapse point |
|---|---|---|---|
| `wrap` | `drawer` | Row wraps (today's behaviour) | Burger → drawer (today's behaviour) |
| `priority-more` | `drawer` | Items fold into More | Burger → drawer |
| `wrap` | `bottom-tab` | Row wraps | Bottom tab bar (+ More tab → drawer) |
| `priority-more` | `bottom-tab` | Items fold into More | Bottom tab bar |

All four combinations are coherent. The current defaults reproduce today's behaviour exactly, so
this whole feature is additive and off by default.

### 5.4 Inspector controls

In the existing **`MenuSettingsPanel.js`**, beside the built "Burger Menu" panel — the same panel
that already presents `collapsePoint` as Always / Tablet / Mobile / Custom with **no bare px in the
UI**. Keep that device-neutral language discipline: *"When the menu doesn't fit"* and *"Below the
collapse size"*, never *"on a phone"*.

| Control | Type | Default |
|---|---|---|
| "When the menu doesn't fit" | ToggleGroup: *Wrap onto a second line* / *Fold extras into a "More" menu* | Wrap |
| "Below the collapse size" | ToggleGroup: *Burger and panel* / *Bottom tab bar* | Burger and panel |
| "Tab bar items" | Item picker from the current menu, max 5, with a per-item icon picker | empty |
| "Show labels under icons" | Toggle | on |
| "Last tab opens the menu panel" | Toggle | on |
| "Always show these items" | Item multi-select (the pin list) | empty |

Editor notices (informational, never gates — FR-36-12's established pattern):
- fewer than 3 tab items picked while `collapseMode: bottom-tab`;
- more than 5 picked;
- a picked item that no longer exists in the menu (the same dangling-reference shape FR-36-9a
  already handles for `drawerRef`).

---

## 6. Ranked decision menu

### Recommendation — Option A: dock first, then (b), then (c)

Spec 18 builds `Sgs_Bottom_Dock`; Spec 36 builds priority+More (which needs no dock at all and can
run in parallel); then the tab bar mounts into the dock.

**Why this one.** It is the sequence both specs already ask for, it puts the container in the spec
that owns it before a second element needs it, and it front-loads the only piece with cross-feature
blast radius. priority+More is fully independent, so it delivers visible value while the dock is
being built. The `Sgs_Drawer_Render` precedent means the registration seam is a known, proven shape
rather than a new invention.

**Cost of being wrong.** Low. The dock is additive; nothing currently mounts into it except a
back-to-top button that already works.

### Option B: (b) only; defer (c) entirely

Build priority+More; leave the bottom tab bar parked with the dock.

**For:** no dock work at all; smallest scope; closes the more commonly-wanted half.
**Against:** leaves FR-36-8 two-thirds done and the Spec 18 overlap still open.
**Pick this if** the near-term client builds have no bottom-bar requirement — it is a defensible
scope cut, not a compromise.

### Option C: tab bar without the dock, `position:fixed` in the nav block

**For:** fastest path to a visible tab bar.
**Against:** ships the exact defect Spec 18 §1.1 was written to prevent, and the second
bottom-anchored element (a cart bar) then has to be built twice. **Do not choose this.** Listed so
the option space is visible.

### Option D: dock first, both modes deferred

Build only `Sgs_Bottom_Dock` + the bottom `scroll-padding` guard, ship nothing user-visible.

**For:** closes a real WCAG 2.4.11 gap that exists today independently of either mode.
**Against:** no visible outcome.
**Pick this if** Bean wants the a11y guard landed on its own and the nav modes sequenced later.

---

## 7. Exact files a build would touch

### Slice 1 — the dock (Spec 18)

| File | Change |
|---|---|
| `plugins/sgs-blocks/includes/class-sgs-bottom-dock.php` | **New.** Renderer + `register()` registry + slot ordering + one-per-request guard. Modelled on `class-sgs-drawer-render.php`. |
| `plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php` | Move the back-to-top into the dock's `utility` slot; **remove `aria-hidden="true"` from any wrapper that will hold navigation**. |
| `plugins/sgs-blocks/assets/floating-ui/floating-ui.css` | Dock layout, `column-reverse`, safe-area padding. |
| `plugins/sgs-blocks/assets/floating-ui/floating-ui.js` | `ResizeObserver` publishing `--sgs-bottom-dock-height`, gated + explicit-zero, mirroring `header-behaviours/view.js::publishHeight`. |
| `theme/sgs-theme/assets/css/utilities.css` | `html { scroll-padding-bottom: var(--sgs-bottom-dock-height, 0px) }` + the admin-bar-aware sibling, mirroring the existing top-edge rules. |
| `plugins/sgs-blocks/sgs-blocks.php` | Wire the new class. |
| `.claude/specs/18-SGS-FLOATING-UI.md` | Promote §1.1 from a scope claim to FRs; record the ownership ruling. |
| `.claude/parking.md` | `P-FLOATING-UI-BOTTOM-BARS` → resolved; move to `memory/parking-archive.md` verbatim with the date (the archive-on-resolve rule). |

### Slice 2 — priority + More (independent; can run in parallel)

| File | Change |
|---|---|
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json` | `overflowMode`, `priorityLockedItemIds`. |
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` | Emit the More button (hidden) + the overflow `<ul>`; mark locked items. |
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` | `.is-priority-ready` nowrap/overflow rules. |
| `plugins/sgs-blocks/src/shared/nav-interactivity/` (new module beside `mega-disclosure.js`) | Measurement + move logic; reuses the existing disclosure for open/close. |
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/MenuSettingsPanel.js` | The "When the menu doesn't fit" control + the pin list. |

### Slice 3 — bottom tab bar

| File | Change |
|---|---|
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json` | `collapseMode`, `bottomTabItems`, `bottomTabShowLabels`, `bottomTabMoreTab`. |
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` | Build the tab markup; `Sgs_Bottom_Dock::register( 'nav', … )`; suppress the burger row when the tab bar is active. |
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` | Tab layout, active state reusing the existing current-page colour rows. |
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/MenuSettingsPanel.js` | Tab controls + the three notices. |
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/useDrawerNotice.js` | Extend the dangling-reference notice to a missing tab item. |
| `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` | FR-36-8 rewritten as two axes (§3.1); the risk row closed. |
| `.claude/decisions.md`, `.claude/LEDGER.md` | Record; move W2-m. |

---

## 8. Test plan

### 8.1 priority + More

| # | Check | Pass condition |
|---|---|---|
| P1 | Width sweep 1440 → 769 in 10px steps | At every width: no wrap, no horizontal scroll, More visible only when at least one item is hidden |
| P2 | No layout shift | Chrome DevTools trace across load: CLS contribution from the nav is 0 |
| P3 | No oscillation | Hold at the exact threshold width ±2px for 3 seconds; item count must not change more than once |
| P4 | Moved current-page item | With `aria-current` in the overflow, the More button carries the marker and the announcement |
| P5 | No-JS | Load with JS disabled: every link present, visible and in the DOM; nothing `hidden` |
| P6 | Mega never overflows | A menu whose mega item would be last still shows the mega trigger in the bar |
| P7 | Split layout | Each half overflows independently; no item crosses the split |
| P8 | axe + keyboard | Zero new violations; Tab reaches every link exactly once; ESC closes More and restores focus |

### 8.2 Bottom tab bar + dock

| # | Check | Pass condition |
|---|---|---|
| P9 | Dock height published | `--sgs-bottom-dock-height` equals the dock's measured height; `0px` when the dock is empty |
| P10 | Bottom focus guard | Tab to the last link on a long page — it lands **above** the dock, not behind it |
| P11 | Safe area | iPhone-notch emulation: tab labels clear the home indicator |
| P12 | Two elements stack | Register a dummy `transaction` bar as well; both visible, correctly ordered, neither overlapping, dock height covers both |
| P13 | Targets | Every tab ≥ 44×44px at a 320px viewport with 5 tabs |
| P14 | Landmarks | Exactly two `<nav>` landmarks with **different** accessible names |
| P15 | More tab → drawer | Opens the existing drawer, focus trap engages, ESC returns focus to the tab |
| P16 | Above the collapse point | Tab bar absent entirely; header nav unchanged |

### 8.3 Negative controls

| # | Control | What it proves |
|---|---|---|
| N1 | Disable the `.is-priority-ready` class and re-run P1 | The row must wrap. Proves the sweep measures the real mechanism. |
| N2 | Force `overflowMode: wrap` and re-run P1 | More must never appear. Proves the mode gate discriminates. |
| N3 | Remove `scroll-padding-bottom` and re-run P10 | The last link must land behind the dock. Proves P10 can fail. |
| N4 | Set the dock's height publisher to a hardcoded `0px` and re-run P10 | Must fail. Proves the publisher is load-bearing and not decorative. |
| N5 | Put `aria-hidden="true"` back on the dock and re-run P14 | The nav landmark must disappear from the a11y tree. Proves §2.2's finding is real and the fix is load-bearing. |
| N6 | Remove the More button from the width budget and re-run P3 | Must oscillate. Proves the hysteresis and budget logic are doing work. |
| N7 | Empty dock on a page with no bottom elements | `--sgs-bottom-dock-height` reads `0px` **and** no empty fixed element is painted. Proves the dock costs nothing when unused. |

### 8.4 Closing gate

Per R-31-13, script output alone does not close this. Bean's eye on the canary at 390 / 768 / 1440,
with a non-default collapse point in the sweep (FR-36-8 §8 requires it), and with the drawer opened
from the More tab.

---

## 9. Sizing

Estimates are smallest-plausible, per `~/.claude/rules/time-estimates.md`.

| Slice | Work | Estimate |
|---|---|---|
| 0 | Spec + parking reconciliation, ownership ruling written down | 30 min |
| 1 | `Sgs_Bottom_Dock` + height publisher + bottom `scroll-padding` + back-to-top migration | 1.5 h |
| 2 | priority + More (render, measure, disclosure reuse, control) | 2 h |
| 3 | Bottom tab bar (markup, dock registration, active state, More tab) | 1.5 h |
| 4 | Inspector controls + the three notices + editor canvas parity | 1 h |
| | **Total** | **~6.5 h** |

> ⚠ **This contradicts the plan.** `.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`
> quotes W2-m at **2h (4h)**. That figure cannot include the dock, which both specs make a hard
> precondition for mode (c). Either the plan row is re-quoted, or Option B (mode (b) only, ~2.5 h)
> is chosen, which *does* fit the original quote.

**Shippable order:** Slice 0 → Slice 2 (visible value, zero dependencies) → Slice 1 → Slice 3 →
Slice 4. Slices 1 and 2 touch disjoint files and can run in parallel.
