# Header Gold Standard Research
**Date:** 2026-05-20 | **Author:** Research Agent | **Scope:** SGS gap analysis vs Kadence / Spectra / GenerateBlocks / Astra / Blocksy

---

## 1. Header Behaviour Matrix

| Behaviour | Kadence Pro | Astra Pro | Blocksy Pro | GenerateBlocks Pro | Spectra Pro |
|---|---|---|---|---|---|
| **Transparent overlay** (over hero → opaque on scroll) | ✅ Advanced Header builder — Customiser + Site Editor block | ✅ Header Builder (Customiser) | ✅ Header Builder (Customiser) | ✅ Site Header block — sticky + transparent flags | ❌ No built-in; requires Astra for paired build |
| **Sticky pin-to-top** | ✅ Customiser → Header → Sticky Header | ✅ Header Builder — sticky toggle | ✅ Blocksy Companion required | ✅ Site Header block sticky flag | ❌ No standalone sticky builder |
| **Shrink-on-scroll** | ✅ "Main row shrinking" option in sticky settings | ✅ Via Header Builder row height settings | ✅ Per-row "shrink" toggle inside sticky options | ⚠️ CSS class workaround only (no native toggle) | ❌ |
| **Hide-on-scroll-down + show-on-scroll-up** | ✅ "Scroll-up header reveal" — sticky settings | ❌ Not native | ✅ "Auto hide" sticky option | ❌ | ❌ |
| **Per-device header layout** | ✅ Separate desktop / tablet / mobile rows in header builder | ✅ Header Builder — separate mobile header builder | ✅ Separate mobile header rows | ✅ Device-specific containers (device visibility + separate mobile blocks) | ❌ |
| **Announcement bar above header** | ✅ Top row in header builder | ✅ "Above Header" (Astra Pro — full-width slim bar) | ✅ Top bar row in header builder | ⚠️ Build manually with device-visibility block; no native "bar" component | ❌ |
| **Mega menu** | ✅ Via Kadence Advanced Nav (Pro) | ✅ Nav Menu module (Pro) + Spectra templates | ✅ Built-in (Blocksy Companion) | ⚠️ Pattern-based only; no dedicated mega-menu builder | ❌ |
| **Below-header search bar** | ✅ Search row / element in header builder | ✅ Header Builder search widget | ✅ Search element in header rows | ⚠️ Block pattern only | ❌ |

### Settings UX notes

- **Kadence** — split across Customiser (legacy theme header) and Site Editor (Advanced Header block). Some features duplicated; causes user confusion.
- **Astra** — Customiser only (Header Builder). Clean drag-drop row grid. Pro features gated cleanly.
- **Blocksy** — Customiser only. Sticky/transparent require Blocksy Companion plugin (free companion, not a paywall).
- **GenerateBlocks** — Site Editor (block-based). Sticky + device visibility live in block inspector. No Customiser dependency. Most "block-native" of the five.
- **Spectra** — No standalone header system. Relies on Astra's Header Builder when paired. On its own it's a content-blocks library, not a theme-level header system.

---

## 2. Implementation Patterns (Top 2: Transparent + Sticky)

### Transparent overlay header

**The pattern in 2026:** Stack the header absolutely over the hero using `position: absolute; top: 0; width: 100%` on the header element, with `z-index` above the hero. On scroll past a sentinel element (typically a 1px div at the bottom of the hero), swap to `position: fixed` and apply an opaque background. The sentinel element is the modern clean approach.

**CSS-only approach:** `position: sticky; top: 0` on the header element gives you free pin-to-top with no JS. But it cannot start transparent-over-hero because sticky doesn't allow absolute stacking over the next sibling. You'd need a CSS `backdrop-filter` + `scroll-driven animation` hack (Chrome-only as of 2025; Firefox still lacks Scroll-Driven Animations). Not viable for production yet.

**Recommended JS approach:**
1. Place a `<div id="sgs-header-sentinel">` as the last child of the hero section.
2. Use `IntersectionObserver` on the sentinel — fires once when sentinel leaves the viewport (user has scrolled past the hero). Toggle a class on `<header>` to switch from transparent to opaque.
3. `IntersectionObserver` is significantly more performant than a `scroll` event listener — it fires only on visibility change, not on every pixel scrolled. No `requestAnimationFrame` throttling needed.
4. CSS transitions on `background-color` + `box-shadow` give the smooth fade in.

**GPU compositing:** Animating `background-color` triggers a repaint but NOT a layout reflow (no geometry change). Safe. Avoid `height` changes during the transition — that triggers layout. Use `padding` changes with `will-change: padding` if shrinking, or better: `transform: scaleY()` (GPU-composited, no reflow).

**WCAG 2.2 AA — Focus Not Obscured (2.4.11):** A fixed/sticky header MUST NOT completely obscure a focused element. This is a hard failure (F110). The fix is `scroll-margin-top` set to at least the header height on all focusable targets, OR using `scroll-padding-top` on the `:root`. Kadence gets complaints about this when users add custom sticky headers and miss the `scroll-margin-top` wiring. **Reduced motion:** any scroll-triggered colour/opacity transition must be wrapped in `@media (prefers-reduced-motion: no-preference)` — i.e. the animation should only fire if the user hasn't requested reduced motion.

### Sticky pin-to-top header

**CSS-only is the winner here.** `position: sticky; top: 0` on the `<header>` element requires zero JS, has no scroll listener, and causes zero layout reflow. It is natively GPU-accelerated by every modern browser.

**When you also need shrink-on-scroll:** `position: sticky` alone can't shrink. Options:
1. `IntersectionObserver` on a sentinel div (same pattern as transparent) — fires when user scrolls past it, adds a CSS class that reduces `padding` via transition. Clean, performant.
2. CSS Scroll-Driven Animations (`animation-timeline: scroll()`) — can drive padding/font-size/height off scroll position. Chrome 115+ only; no Firefox. Not production-safe without polyfill.

**Hide-on-scroll-down + show-on-scroll-up:** Requires JS — you need to compare the current `scrollY` to the previous `scrollY` value on each scroll event. The canonical pattern uses a throttled scroll listener (16ms / `requestAnimationFrame`) to track direction, then adds/removes a class. `IntersectionObserver` alone cannot detect scroll direction.

---

## 3. Pitfalls + Complaints

**Complaint 1 — WCAG F110: focused links hidden behind sticky header**
The most technically serious gap. Affects Kadence, Astra, and any theme with `position: fixed` or `position: sticky` headers where the page doesn't set `scroll-margin-top` / `scroll-padding-top`. When a keyboard user tabs to a link, the browser auto-scrolls it into the viewport — but the sticky header sits on top and covers it. This is a formal WCAG 2.4.11 failure. Kadence advanced headers commonly fail this because the sticky header height is dynamic (shrinks) so a single `scroll-padding-top` value doesn't stay accurate. Users report links disappearing behind the header when tabbing.

**Complaint 2 — CLS from the "placeholder spacer" approach**
Kadence and Astra both inject a hidden placeholder `<div>` with the same height as the sticky header to prevent the page "jumping" when the header goes fixed. When the header image hasn't loaded (slow connection) or the height resolves late, this spacer height is wrong and causes a CLS spike. Astra users hit a known CLS bug from the site-title image shifting on load. The fix (lazy-load the spacer height from a ResizeObserver rather than computing it once on load) is not implemented natively by either theme.

**Complaint 3 — Z-index collisions with page content**
Sticky/fixed headers need a `z-index` higher than hero sections, popups, sliders, and sticky sidebars. Astra had a documented regression in v3.9.2 where the header z-index conflicted with the footer builder. Kadence users frequently ask about z-index when using third-party sliders (Swiper, Slider Revolution) where the slider's `z-index: 9999` beats the header. The underlying problem is that Kadence and Astra don't expose a first-class "header z-index" setting — users have to hunt for it or use custom CSS.

---

## 4. Recommendation for SGS — Phase A Priority List

SGS already has: a conditional rules engine (`Sgs_Header_Rules`) that picks a PHP pattern at render time, four real header pattern variants, and a device-visibility extension (`sgsHideOnMobile/Tablet/Desktop`). That's a solid base. The stubs (`framework-header-transparent.php`, `framework-header-sticky.php`, `framework-header-shrink.php`) exist and route via the rules engine — they just need real implementations.

### Priority 1 — Transparent overlay header (highest operator impact)

**Why first:** It is the #1 differentiating visual feature used on hero-led landing pages. Every competitor has it. Indus Foods homepage needs it. The current stub already routes through the rules engine — so the conditional logic is wired; the pattern just needs real markup + behaviour.

**What SGS already has:** The transparent stub pattern, the rules engine to activate it on `is_front_page` or URL regex, and the hero block to place the sentinel element against.

**New code needed:** ~30 lines of JS (IntersectionObserver on `.sgs-hero` sentinel), CSS transitions on `[data-sgs-header-state="transparent"]` → `[data-sgs-header-state="opaque"]`, and a `scroll-padding-top` CSS custom property published by the header PHP so all pages inherit the correct offset. WCAG 2.4.11 fix comes for free if you publish the CSS var.

### Priority 2 — Sticky pin-to-top (easy win, broad operator utility)

**Why second:** `position: sticky; top: 0` is CSS-only — no JS, zero maintenance burden, zero CLS risk. The sticky stub pattern needs to add one CSS class to the `<header>` and the wrapper. SGS avoids the spacer-div CLS problem that Kadence and Astra both have because `position: sticky` doesn't need a spacer.

**What SGS already has:** The sticky stub pattern + conditional rules engine to activate it.

**New code needed:** One CSS rule + a height CSS custom property (needed so `scroll-padding-top` on `:root` stays accurate). Roughly 10 lines of PHP + 5 lines of CSS.

### Priority 3 — Hide-on-scroll-down / show-on-scroll-up

**Why third:** This is Kadence's unique differentiator (no Astra equivalent). Solves mobile UX — the header disappears on scroll down so it doesn't eat screen real estate, reappears on scroll up so the menu is always one gesture away. High perceived quality with minimal code.

**What SGS already has:** The `sgsHideOnMobile` extension — could be composed to expose the header only on scroll-up on mobile specifically.

**New code needed:** ~20 lines of JS (throttled scroll direction detector on `requestAnimationFrame`), two CSS classes (`sgs-header--hidden`, `sgs-header--visible`), and a Customiser/Inspector toggle to enable it. Can be gated to mobile only (the most common request) or all devices.

### Priority 4 — Announcement bar above header

**Why fourth:** Astra Pro's "Above Header" and Kadence's "Top Row" are heavily used for promotional banners, cookie consent alternatives, and sale announcements. It's a separate template part (`parts/announcement-bar.html`) that renders above `<header>` when a Customiser option is non-empty. No new block type needed — it's a `core/group` with a paragraph and optional close button.

**What SGS already has:** Template part seeder (Spec 17 wave 1 shipped a template-part system). A new `announcement-bar.html` part + a Customiser text field + `dismiss` logic (localStorage to hide after close) is the full scope.

**New code needed:** One template part file, ~15 lines of PHP for the Customiser control + render hook, ~20 lines of JS for dismiss/localStorage. Composites cleanly with the existing Spec 17 architecture.

### Priority 5 — Shrink-on-scroll (deferred — lower impact than above 4)

**Why deferred:** Shrink-on-scroll is the least requested of the five behaviours and introduces the most CSS complexity (animated padding, logo size changes, potential CLS from height changes). Implement sticky first and add shrink as a toggle on top of it once sticky is stable.

**New code needed:** `IntersectionObserver` sentinel (reuses Priority 1 sentinel infrastructure), CSS transitions on `padding` for the header row, a `will-change: padding` declaration to keep it GPU-composited. ~25 lines additional.

---

### Implementation note: avoid the Kadence/Astra spacer-div CLS trap

SGS should use `position: sticky; top: 0` for sticky (no spacer needed) and `position: absolute; top: 0` shifting to `position: fixed` for transparent-overlay (sentinel-driven). Publish the live header height as `--sgs-header-height` via a `ResizeObserver` in JS and set `scroll-padding-top: var(--sgs-header-height)` on `:root`. This solves the WCAG 2.4.11 focus-obscured issue that Kadence and Astra both get wrong, and sidesteps the CLS spacer-height-mismatch bug. A clean competitive advantage from the start.
