---
doc_type: spec
spec_id: 18
spec_version: 1.0
project: small-giants-wp
title: SGS Floating UI — Customiser-Based Back-to-Top + Reading Progress
status: shipped
last_verified: 2026-10-09
authors: Bean + Claude
references:
  - plugins/sgs-blocks/includes/class-sgs-floating-ui-customiser.php
  - plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php
  - plugins/sgs-blocks/assets/floating-ui/floating-ui.js
  - plugins/sgs-blocks/assets/floating-ui/floating-ui.css
  - plugins/sgs-blocks/assets/floating-ui/customise-preview.js
  - plugins/sgs-blocks/tests/php/FloatingUiCustomiserTest.php
---

# Spec 18 — SGS Floating UI

> **Customiser paint targets.** Paint targets are `header.wp-block-template-part` / `footer.wp-block-template-part` (NOT `.wp-site-header` / `.wp-site-footer` — SGS theme template parts do not emit those classes); CSS custom properties belong on `:root` so they cascade regardless of which wrapper exists. View Transitions wiring checks `function_exists('wp_enqueue_view_transitions_admin_css')` and does nothing where the native function is absent.

## 1. Overview

Provides a Customiser-based floating UI layer (back-to-top button and reading-progress
bar). Both elements render via `wp_footer` — they are site-wide, not per-page, so they
belong in the Customiser rather than the block editor.

### 1.1 Scope claim — persistent bottom bars belong HERE, not in the footer

Nothing below is built yet; this records WHERE the work belongs so it is not routed into the
header/footer builder.

**Persistent bottom CTA / cart / sale bars are Spec 18 territory, not `sgs/site-footer-row`.**
Spec 37 §7 and FR-37-40 point here.

Why:
1. **State, not scroll.** These bars are driven by what a footer row cannot reach — basket
   contents, whether a sale is live, session state. This spec's own founding rationale already
   says it: *"site-wide, not per-page, so they belong in the Customiser rather than the block
   editor."*
2. **Purpose changes the rules.** Authorities treat persistent bottom chrome as legitimate for
   navigation or ONE transactional action, but promotional bars must be small and dismissible
   (Google's intrusive-interstitial guidance). Material has no persistent promotional bottom
   component at all. **A cart bar and a sale bar are therefore different classes**, not one feature
   with different text.

**Build the shared bottom stacking container BEFORE adding a second bottom-anchored element.**
This spec already ships ONE (back-to-top). Cookie banners, chat widgets, back-to-top buttons and
CTA bars all default to the same corner, and there is no cross-vendor convention — every vendor's
own docs prescribe hand-written `!important` offsets. The technique is a single
`position:fixed; bottom:0; display:flex; flex-direction:column-reverse` wrapper that every element
mounts into, not per-component z-index.

**Implementation notes carried from the research:** `position:fixed` +
`env(safe-area-inset-bottom)` is the load-bearing pair; `dvh` solves content-height drift, NOT bar
occlusion (conflating them is a common error); anchor positioning is too new to be load-bearing;
`popover`'s light-dismiss fights persistence; `interestfor` is not ready. **WCAG 2.4.11** names
sticky footers as the failure mode (technique F110) — the mitigation is `scroll-padding` sized to
the bar, and this framework currently has the TOP-edge equivalent but no bottom one.

No official Google percentage exists for "small fraction of the screen"; any threshold adopted here is our design rule, not a citation.

**Status:** deferred; needs a design gate before any build. The open item is tracked in `.claude/LEDGER.md`.

## 2. Admin surface

Accessible at: *Appearance → Customise → SGS Floating UI*

Registered as a Customiser section with `type => 'option'` (not theme_mod) so the data
survives theme switches.

### 2.1 Controls

| Option (control ID) | Type | Default | Description |
|---|---|---|---|
| `sgs_floating_ui_back_to_top_enabled` | Checkbox | `false` | Show/hide the back-to-top button |
| `sgs_floating_ui_back_to_top_bg_colour` | Colour picker | `#0F7E80` | Button background colour |
| `sgs_floating_ui_back_to_top_icon_colour` | Colour picker | `#FFFFFF` | Arrow icon fill colour |
| `sgs_floating_ui_back_to_top_position` | Radio (left / right) | `right` | Horizontal position |
| `sgs_floating_ui_reading_progress_enabled` | Checkbox | `false` | Show/hide the reading progress bar |
| `sgs_floating_ui_reading_progress_colour` | Colour picker | `#0F7E80` | Bar fill colour |
| `sgs_floating_ui_reading_progress_height` | Range (2-8 px) | `4` | Bar height in pixels |

### 2.2 Data layer

Each value is its own `wp_options` row, written by a Customiser setting of `type => 'option'` (the seven option names in §2.1). Sanitisers: `Sgs_Floating_UI_Customiser::sanitise_checkbox`, `sanitise_colour`, `sanitise_position` and `sanitise_height` (height clamped to 2-8). Every setting requires `edit_theme_options`.

## 3. Frontend rendering

### 3.1 Hook

`Sgs_Floating_UI_Renderer` attaches to `wp_footer` at the default priority. When both elements are
disabled, the hook outputs nothing and skips enqueueing assets entirely.

### 3.2 Markup emitted

```html
<div class="sgs-floating-ui" aria-hidden="true">
  <style>.sgs-floating-ui { --btt-bg: #0F7E80; --btt-icon: #FFFFFF; --btt-pos: right; --rp-colour: #0F7E80; --rp-height: 4px; }</style>

  <!-- reading progress (when enabled) -->
  <div class="sgs-floating-ui__reading-progress" role="progressbar"
       aria-label="Reading progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>

  <!-- back-to-top (when enabled) -->
  <button class="sgs-floating-ui__back-to-top sgs-floating-ui__back-to-top--right"
          type="button" aria-label="Back to top" aria-hidden="true" hidden>
    <svg aria-hidden="true" focusable="false"><!-- arrow up --></svg>
  </button>
</div>
```

The Customiser colours reach the stylesheet through the custom properties in the wrapper's `<style>` rule, so colours chosen in the Customiser apply without recompiling CSS.

### 3.3 JavaScript (vanilla, no jQuery)

Single passive scroll listener with `requestAnimationFrame` throttle:

```js
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      // update btt visibility + aria-hidden
      // update progress bar aria-valuenow + width
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });
```

The back-to-top button click handler scrolls to the top with `window.scrollTo({ top: 0, behavior })` (web-platform identifier; UK-spelling exemption applies). `behavior` is `'smooth'` unless `matchMedia('(prefers-reduced-motion: reduce)')` matches, when it is `'auto'` (instant).

### 3.4 CSS

All layout rules live in `plugins/sgs-blocks/assets/floating-ui/floating-ui.css`. It reads the custom properties `--btt-bg`, `--btt-icon`, `--btt-pos`, `--rp-colour` and `--rp-height`, so the stylesheet carries no per-site colour or height values.

## 4. Accessibility

| Requirement | Implementation |
|---|---|
| 44 px touch target | `.sgs-floating-ui__back-to-top` is 44 × 44 px |
| Screen reader label | `aria-label="Back to top"` on the `<button>` |
| Progress bar semantics | `role="progressbar"` + `aria-valuenow` updated on scroll |
| Visible focus ring | `outline: 3px solid var(--btt-bg); outline-offset: 3px;` |
| Hidden when off-screen | `hidden` attribute toggled via JS (respects display:none) |
| Reduced motion | `floating-ui.css` disables the transitions under `prefers-reduced-motion: reduce`; `floating-ui.js` scrolls instantly (`behavior: 'auto'`) under the same preference |

The SVG chevron carries `aria-hidden="true"` and `focusable="false"` to avoid duplicate
announcement.

## 5. Customiser live preview

Both elements use `postMessage` transport so the Customiser preview iframe updates without
a full reload. The registered `Sgs_Floating_UI_Customiser` settings call
`$setting->transport = 'postMessage'` and a matching JS partial re-applies the CSS
variables inline.

## 6. Files

| File | Role |
|---|---|
| `plugins/sgs-blocks/includes/class-sgs-floating-ui-customiser.php` | Registers Customiser section, settings, controls, sanitisers, postMessage partials |
| `plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php` | Hooks into `wp_footer`, enqueues assets, emits markup |
| `plugins/sgs-blocks/assets/floating-ui/floating-ui.js` | Scroll listener, visibility toggling, smooth scroll |
| `plugins/sgs-blocks/assets/floating-ui/floating-ui.css` | Layout, z-index, transition, focus ring |
| `plugins/sgs-blocks/assets/floating-ui/customise-preview.js` | Customiser live preview: re-applies the custom properties on the wrapper |
| `plugins/sgs-blocks/tests/php/FloatingUiCustomiserTest.php` | PHPUnit coverage for the Customiser sanitisers, capability gate and renderer (the test file is the source of truth) |

## 8. Council N1 compliance note

Spec 37 Council Norm N1 governs writes to `wp_global_styles`. This spec does not write to
`wp_global_styles` — it uses `wp_options` for its own `sgs_floating_ui_*` keys. The spirit
of N1 (no operator-supplied post_id routing, no trust escalation) is honoured: the
Customiser sanitiser runs under standard WordPress capability checks, and the renderer
reads a static option with no user-supplied routing.

## 8b. Canonical Customiser pattern reference

**Spec 18 is the canonical "how to register an SGS Customiser section" reference.** Two other specs follow this pattern:

| Spec | Section | What it adopts from Spec 18 |
|---|---|---|
| Spec 36 §Customiser migration | `Sgs_Site_Info_Customiser` | capability gate, sanitiser pattern, `wp_options` backing (Site Info uses a full refresh, not `postMessage`) |
| Spec 11 Decision 22 (Phase 5b) | Button presets in Site Editor → Styles → Buttons | WP 7.0 native theme.json rather than Customiser section; but the `postMessage` transport model for live preview is the same reference point |

**Key patterns from this spec that MUST be followed:**
1. Data lives in `wp_options` (`type => 'option'`, NOT `theme_mod`) so it survives theme switches
2. `$setting->transport = 'postMessage'` for all visual properties with a corresponding JS partial
3. A sanitiser per setting runs on save: casts types, validates colour values
4. Capability gate: `current_user_can('edit_theme_options')` on all write paths
5. When both/all elements are disabled, the hook outputs nothing and skips asset enqueue entirely

**WP 7.0 View Transitions (Decision 27):** Customiser sections call `wp_enqueue_view_transitions_admin_css()` for smooth panel navigation when the function exists (`plugins/sgs-blocks/sgs-blocks.php`).

---

## 9. Future enhancements (parked)

| Enhancement | Complexity | Note |
|---|---|---|
| Scroll-trigger threshold control | Low | Currently hard-coded at 200 px in `plugins/sgs-blocks/assets/floating-ui/floating-ui.js`; expose as a range in the Customiser |
| Smooth-scroll easing picker | Low | CSS `scroll-behavior` doesn't support custom easing; JS-based smooth scroll with easing param |
| Custom icon picker for the BTT button | Medium | Replace the hard-coded chevron SVG with a Lucide icon selector |
| Per-page disable via post meta | Medium | `_sgs_disable_floating_ui` post meta checkbox in the block editor sidebar |
