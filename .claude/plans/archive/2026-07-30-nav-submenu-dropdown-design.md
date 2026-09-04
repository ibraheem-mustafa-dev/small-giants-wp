---
doc_type: design
title: "Plain dropdowns + drawer submenus — control surface and build design"
project: small-giants-wp
date: 2026-07-30
spec: 36-SGS-NAVIGATION-SYSTEM (FR-36-4, FR-36-6, FR-36-10) + 37 §1.2 boundary
status: design — for Bean's sign-off before build
---

# Plain dropdowns + drawer submenus

## Why this exists

**Problem.** A classic menu item with children renders as a bare link and its children vanish.
`nav-menu/render.php:103-109` deliberately flattens `core/navigation-submenu` to the parent's own
link ("no children this phase"). Only the MEGA disclosure exists. Spec 36 §6a records this as a
declared, dated gap (STOP-29, deferred-not-dropped) — it is not a hidden bug.

**Effect.** Clients cannot build an ordinary dropdown menu. The drawer's `submenuModel` control
(accordion / drill-down) is **live in the inspector and does nothing** — its only consumer is a
root class (`nav-drawer/render.php:417`). That is an operator-visible dead control.

**Outcome.** Plain dropdowns on desktop + real accordion/drill-down submenus in the drawer, with a
control surface that beats the competition, and defaults that look right untouched.

## The three facts that shape the build

1. **The behaviour already exists and is markup-agnostic.** `shared/nav-interactivity/mega-disclosure.js`
   (`store('sgs/mega')`) keys off three hooks — a root with `data-wp-interactive="sgs/mega"` +
   context, a trigger with `[data-sgs-mega-trigger]` + `aria-expanded`, a panel with
   `[data-sgs-mega-panel]`. Its own docblock (`:34-42`) states it is "decoupled from BEM". **A plain
   dropdown emitting those three hooks inherits hover-intent, tap, full keyboard, ESC + focus
   return, single-open, close-grace and the WCAG 1.4.13 behaviours for free. No new JS engine.**
2. **The data is already there.** `class-sgs-nav-menu-source.php:258-289` recurses and preserves
   children as `innerBlocks` precisely so this phase can use them — its docblock says discarding
   them "would be a silent data loss of exactly the D338 class". The walker simply never reads
   `$block['innerBlocks']`.
3. **Nav opts OUT of the universal hover extension.** `nav-menu/block.json:20` declares
   `hideExtensions: ["hover", ...]` per FR-36-14 (Bean-locked, D401). So hover effects (scale etc.)
   must be **block-native** here — we cannot lean on `extensions/hover-effects.js`.

## Binding constraints (from spec + prior rulings — do not re-litigate)

- **Disclosure, never `role="menu"`** (FR-36-10). `<button aria-expanded>`, `aria-controls` SHOULD,
  **omit `aria-haspopup`**, Tab passes through, no focus trap, ESC closes + returns focus.
  Independently confirmed as correct by research (W3C APG disclosure-navigation pattern; the
  menubar pattern switches screen readers into application mode and is wrong for site nav).
- **Left-aligned under its own item — NOT centred.** Bean's ruling (`decisions.md:821`); the mega's
  `left:50%` centring must NOT be copied.
- **Panel is not its own landmark** (FR-36-26) — stays inside the parent `<nav>`.
- **Server-rendered, crawlable, no lazy-load** (FR-36-17) — every dropdown link in the initial HTML.
- **Caret on expandable items only** (FR-36-4).
- Every new attribute needs an inspector control **and** a render consumer, or `check-dead-controls.js`
  fails the build (baseline is zero-tolerance).
- New styling attrs need a `supports.sgs.elements` entry, or the Spec 35 manifest gate flags them.

## Control surface

Grouped as the editor will show them. **Bean's explicit asks are marked ★.**

### Panel (the dropdown surface)
| Control | Attr | Default | Note |
|---|---|---|---|
| ★ Background | `submenuBg` | `surface` | token picker |
| ★ Text colour | `submenuColour` | `text` | inherited by items unless overridden |
| ★ Border colour / width / style | `submenuBorderColour` / `Width` / `Style` | `#00000026` / `1px` / `solid` | matches core WP's own default |
| Corner radius | `submenuRadius` | `8px` | |
| Shadow | `submenuShadow` | soft `0 4px 12px rgba(0,0,0,.1)` | token-backed |
| Padding | `submenuPadding` | `8px` (responsive box) | |
| Min width | `submenuMinWidth` | `200px` | |
| Offset from bar | `submenuOffset` | `4px` | research: a named differentiator |
| Animation | `submenuAnimation` | `fade-slide` | + `submenuDuration` `180ms`; reduced-motion gated |

### Separator ★
| Control | Attr | Default |
|---|---|---|
| Show | `submenuSeparator` | `false` |
| Colour | `submenuSeparatorColour` | `rgba(0,0,0,.08)` |
| Thickness | `submenuSeparatorWidth` | `1px` |
| Inset | `submenuSeparatorInset` | `0` |

### Items — three states ★ (normal / hover / current-page)
Reuses the house `StateToggleControl` idiom (`nav-menu/edit.js:866-968`). Server side follows the
existing three-selector list at `render.php:528-533` (`:hover`, `:focus-visible`,
`[aria-current="page"]`) — **but current-page becomes its own state**, because research found
"stops at hover, no current-page or focus" is where every competitor falls short.

`submenuItemColour` / `Bg` / `Radius`, each with `Hover` and `Current` variants, plus
`submenuItemPadding` (default `10px 16px` — keeps the 44px touch target) and the typography family.

### Hover effect ★
`submenuHoverEffect` — `none | scale | slide | underline | fill`, default `fill`.
`submenuHoverScale` (default `1.02`) applies when `scale` is chosen. **Block-native** (see fact 3),
transform/opacity only, reduced-motion gated.

### Caret
`submenuCaret` (show, default `true`), `submenuCaretColour`, `submenuCaretRotate` (default `true`).

### Timing — closes spec gap D4
`submenuIntentDelay` (default `300`, range 100–500) and `submenuCloseGrace` (default `500` per
FR-36-4). Both are currently **hardcoded** at `render.php:247,258` (300 / 170) with no attribute and
no DB row — FR-36-4 promises an attribute range that does not exist. Exposing them closes that.

### Drawer submenus ★
| Control | Attr | Default | Note |
|---|---|---|---|
| ★ Indent per level | `drawerSubmenuIndent` | `16px` | on `sgs/nav-drawer` |
| Model | `submenuModel` | `accordion` | **already exists and is DEAD — make it live** |
| Separator | inherits panel separator attrs | | |
| Colours | inherit from the drawer's own nav-menu instance | | the drawer hosts an independent `sgs/nav-menu`, so its inspector already applies |

## Build order

1. **Walker** — `flatten()` gains a `children` member; `render_items()` gains a third branch
   (children + not mega → disclosure). Mirror the editor's flatten so `featuredItemIds` identifiers
   stay in parity (`edit.js` mirrors `render.php:83-87`).
2. **Markup** — emit the three `store('sgs/mega')` hooks so behaviour comes free. Child links carry
   `data-sgs-nav-path` or `markCurrentPage()` (`view.js:61`) silently misses them — active-trail is
   an FR-36-4 requirement.
3. **block.json** — new `submenu` + `caret` elements in `supports.sgs.elements`; the attrs above.
4. **Scoped CSS** — extend the existing `$uid`-scoped emitter (`render.php:451-881`). ⚠ Use
   `array_map` for pseudo-element selector lists — `'a,b,c' . '::after'` attaches only to `c`
   (recorded at `render.php:587-602`, shipped broken through every green gate once already).
5. **Drawer** — accordion behaviour + indent; `<details name>` no-JS fallback per FR-36-6.
6. **Verify** — real editor + live DOM + keyboard + axe on an OPEN panel (`checkRestContrast()`,
   not axe's contrast, which cannot see inside a top-layer `::backdrop`).

## Deliberate non-goals (named, not dropped — STOP-29)

- **Priority+ "More" overflow** and **bottom-tab-bar** collapse modes (FR-36-8) — separate front.
- **True safe-triangle geometry** — the existing 170ms close-grace bridge ships; spec already
  records the deferral. Research notes almost no competitor ships real safe-triangle, so the bridge
  is competitive; upgrading it is its own task.
- **Mega starters** (FR-37-7/8) — unrelated.
- `drawerRef` re-typing to a post reference — spec maps it to W2-b.
