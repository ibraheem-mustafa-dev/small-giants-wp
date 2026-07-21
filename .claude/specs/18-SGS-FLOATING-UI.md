---
doc_type: spec
spec_id: 18
spec_version: 0.1
project: small-giants-wp
title: SGS Floating UI — Customiser-Based Back-to-Top + Reading Progress
status: shipped
status_history:
  - 2026-05-19: ACCEPTED — implementation pending
  - 2026-05-24: normalised to canonical enum (accepted → active)
  - 2026-05-22: SHIPPED — deployed via Phase 5b (commit `60220b13` + paint-fix `0ef032fe`)
shipped: true
session_date: 2026-05-19
authors: Bean + Claude (Sonnet 4.6)
references:
  - plugins/sgs-blocks/includes/class-sgs-floating-ui-customiser.php (shipped Phase 5b, commit 60220b13)
  - plugins/sgs-blocks/includes/class-sgs-floating-ui-renderer.php (shipped Phase 5b, commit 60220b13)
  - plugins/sgs-blocks/assets/floating-ui/floating-ui.js (shipped Phase 5b, commit 60220b13)
  - plugins/sgs-blocks/assets/floating-ui/floating-ui.css (shipped Phase 5b, commit 60220b13)
  - tests/php/FloatingUiCustomiserTest.php (shipped Phase 5b, commit 60220b13)
  - .claude/memory/project_floating_ui_architecture.md (existing parking note)
---

# Spec 18 — SGS Floating UI

> **⛔ RETRACTED 2026-07-16 (adversarial-council) — sister-spec sweep of Spec 17's (now Spec 37) identical retraction.** `Sgs_Header_Customiser` and `Sgs_Footer_Customiser` NEVER SHIPPED — `grep -rl "class Sgs_Header_Customiser"` over `plugins/` + `theme/` returns nothing; Spec 17 §Customiser Migration (now Spec 36, since the surviving `Sgs_Site_Info_Customiser` is Site-Info territory) already retracted the identical claim (commit `87dd869d`, "retire plugin-side Customiser path") and this sister spec was never swept. Only `Sgs_Site_Info_Customiser` and `Sgs_Floating_UI_Customiser` are real — verified 2026-07-16 by grep + the `lint-spec-drift.py` PHP-CLASS gate. The struck names below are retained for audit only; the rest of the note (paint targets, View Transitions wiring) is unaffected and stands.
>
> **Session B 2026-05-22 update — Customiser pattern from §8b replicated by 3 sibling sections.** Phase 5b (commit `60220b13` + paint-fix `0ef032fe`) shipped ~~`Sgs_Header_Customiser` + `Sgs_Footer_Customiser`~~ (RETRACTED — never existed) + `Sgs_Site_Info_Customiser` as direct structural clones of `Sgs_Floating_UI_Customiser`. The pattern documented in §8b is now the canonical SGS Customiser shape (confirmed by 3 successful replications). Notable empirical learning: paint targets must be `header.wp-block-template-part` / `footer.wp-block-template-part` (NOT `.wp-site-header` / `.wp-site-footer` — those classes are not emitted by SGS theme template parts); CSS custom properties belong on `:root` so they're cascade-available regardless of which wrapper exists. View Transitions wiring (Decision 27 in the staging doc) shipped in the same commit — uses `function_exists('wp_enqueue_view_transitions_admin_css')` check + inline `@view-transition{navigation:auto;}` fallback. Post WP 7.0 upgrade (also Session B), the native function exists; fallback is dead code on sandybrown but kept for any client site still on WP 6.x.

## 1. Overview

Provides a Customiser-based floating UI layer that replaces the retired `sgs/back-to-top`
and `sgs/reading-progress` Gutenberg blocks. Both elements render via `wp_footer` — they
are site-wide, not per-page, so they belong in the Customiser rather than the block editor.

**Lesson captured here:** retiring blocks before their replacement exists breaks operator
workflows. The `sgs/back-to-top` and `sgs/reading-progress` blocks were removed in Spec 17
(now Spec 37) Wave 1 when the Customiser system was only parked. This spec is the replacement. Future
retirement of any block MUST have a shipping replacement in the same PR or the retirement
is blocked.

## 2. Admin surface

Accessible at: *Appearance → Customise → SGS Floating UI*

Registered as a Customiser section with `type => 'option'` (not theme_mod) so the data
survives theme switches and style-variation swaps.

### 2.1 Controls

| Control ID | Type | Default | Description |
|---|---|---|---|
| `sgs_floating_ui[back_to_top][enabled]` | Checkbox | `true` | Show/hide the back-to-top button |
| `sgs_floating_ui[back_to_top][bg_colour]` | Colour picker | `var(--wp--preset--color--primary)` | Button background colour |
| `sgs_floating_ui[back_to_top][icon_colour]` | Colour picker | `#ffffff` | Arrow icon fill colour |
| `sgs_floating_ui[back_to_top][position]` | Radio (left / right) | `right` | Horizontal position |
| `sgs_floating_ui[reading_progress][enabled]` | Checkbox | `false` | Show/hide the reading progress bar |
| `sgs_floating_ui[reading_progress][colour]` | Colour picker | `var(--wp--preset--color--accent)` | Bar fill colour |
| `sgs_floating_ui[reading_progress][height]` | Range (2–8 px) | `4` | Bar height in pixels |

### 2.2 Data layer

All seven values live in a single `wp_options['sgs_floating_ui']` serialised array.
`Sgs_Floating_Ui_Customiser::sanitise()` runs on save — it strips unexpected keys, casts
integers, and runs `sanitize_hex_color()` on colour values.

## 3. Frontend rendering

### 3.1 Hook

`Sgs_Floating_UI_Renderer` attaches to `wp_footer` (priority 20). When both elements are
disabled, the hook outputs nothing and skips enqueueing assets entirely.

### 3.2 Markup emitted

```html
<!-- back-to-top (when enabled) -->
<button class="sgs-floating-ui__btt"
        aria-label="Back to top"
        style="--sgs-btt-bg: #0F7E80; --sgs-btt-icon: #ffffff;"
        hidden>
  <svg aria-hidden="true" focusable="false"><!-- chevron up --></svg>
</button>

<!-- reading progress (when enabled) -->
<div class="sgs-floating-ui__progress"
     role="progressbar"
     aria-label="Reading progress"
     aria-valuenow="0"
     aria-valuemin="0"
     aria-valuemax="100"
     style="--sgs-progress-colour: #F87A1F; --sgs-progress-height: 4px;"
     hidden>
</div>
```

CSS custom properties are set by PHP via the `style` attribute so colours chosen in the
Customiser apply without recompiling CSS.

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

The back-to-top button click handler scrolls smoothly to top — `window.scrollTo({ top: 0, behavior: 'smooth' })` (web-platform identifier; UK-spelling exemption applies).

### 3.4 CSS

All layout rules live in `assets/floating-ui/floating-ui.css`. CSS custom properties
(`--sgs-btt-bg`, `--sgs-btt-icon`, `--sgs-progress-colour`, `--sgs-progress-height`) are
set inline by the renderer so the stylesheet itself contains no colour or height literals.

## 4. Accessibility

| Requirement | Implementation |
|---|---|
| 44 px touch target | `.sgs-floating-ui__btt` is 48 × 48 px |
| Screen reader label | `aria-label="Back to top"` on the `<button>` |
| Progress bar semantics | `role="progressbar"` + `aria-valuenow` updated on scroll |
| Visible focus ring | `outline: 2px solid currentColor; outline-offset: 2px;` |
| Hidden when off-screen | `hidden` attribute toggled via JS (respects display:none) |
| Reduced motion | JS respects `prefers-reduced-motion` — skips smooth scroll when enabled |

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
| `tests/php/FloatingUiCustomiserTest.php` | 12 PHPUnit tests (see §7) |

## 7. PHPUnit test coverage (12 tests)

| # | Test | Asserts |
|---|---|---|
| 1 | `test_customiser_section_registered` | Section ID `sgs_floating_ui` exists after `customize_register` hook fires |
| 2 | `test_all_seven_settings_registered` | All 7 setting IDs present in `$wp_customize->settings` |
| 3 | `test_sanitise_strips_unknown_keys` | Extra keys in the option array are removed after sanitise |
| 4 | `test_sanitise_casts_height_to_int` | `height: "6.7"` becomes `6` |
| 5 | `test_sanitise_clamps_height_range` | `height: 1` → `2`; `height: 9` → `8` |
| 6 | `test_sanitise_rejects_invalid_colour` | Garbage colour value falls back to default |
| 7 | `test_capability_gate_blocks_subscriber` | Setting `update_callback` refuses `edit_posts` role |
| 8 | `test_renderer_skips_footer_when_both_disabled` | `wp_footer` output is empty when both flags false |
| 9 | `test_renderer_emits_btt_when_enabled` | Output contains `.sgs-floating-ui__btt` when `back_to_top.enabled=true` |
| 10 | `test_renderer_emits_progress_when_enabled` | Output contains `role="progressbar"` when `reading_progress.enabled=true` |
| 11 | `test_renderer_emits_css_custom_properties` | Inline style attribute contains `--sgs-btt-bg` and `--sgs-btt-icon` |
| 12 | `test_renderer_skips_asset_enqueue_when_both_disabled` | No scripts/styles enqueued when both disabled |

## 8. Council N1 compliance note

Spec 37 Council Norm N1 (originally Spec 17) governs writes to `wp_global_styles`. This spec does not write to
`wp_global_styles` — it uses `wp_options` for its own key (`sgs_floating_ui`). The spirit
of N1 (no operator-supplied post_id routing, no trust escalation) is honoured: the
Customiser sanitiser runs under standard WordPress capability checks, and the renderer
reads a static option with no user-supplied routing.

## 8b. Canonical Customiser pattern reference (2026-05-21)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.5.

**Spec 18 is the canonical "how to register an SGS Customiser section" reference.** Two other specs now follow this pattern:

| Spec | Section | What it adopts from Spec 18 |
|---|---|---|
| Spec 36 §Customiser migration (formerly Spec 17) | ~~`Sgs_Header_Customiser`, `Sgs_Footer_Customiser`~~ (RETRACTED 2026-07-16 — never existed) + `Sgs_Site_Info_Customiser` | `postMessage` transport, `wp_options` backing, capability gate, sanitiser pattern |
| Spec 11 Decision 22 (Phase 5b) | Button presets in Site Editor → Styles → Buttons | WP 7.0 native theme.json rather than Customiser section; but the `postMessage` transport model for live preview is the same reference point |

**Key patterns from this spec that MUST be followed:**
1. Data lives in a single `wp_options` serialised array (NOT `theme_mod` — survives theme switches)
2. `$setting->transport = 'postMessage'` for all visual properties with a corresponding JS partial
3. Sanitiser runs on save: strips unexpected keys, casts types, validates colour values
4. Capability gate: `current_user_can('edit_theme_options')` on all write paths
5. When both/all elements are disabled, the hook outputs nothing and skips asset enqueue entirely

**WP 7.0 View Transitions (Decision 27):** Future Customiser sections should call `wp_enqueue_view_transitions_admin_css()` for smooth panel navigation. Spec 17's (now Spec 36, for the surviving Site Info Customiser) Phase 5b migration is the first SGS use of this WP 7.0 feature.

---

## 9. Future enhancements (parked)

| Enhancement | Complexity | Note |
|---|---|---|
| Scroll-trigger threshold control | Low | Currently hard-coded at 300 px; expose as a range in the Customiser |
| Smooth-scroll easing picker | Low | CSS `scroll-behavior` doesn't support custom easing; JS-based smooth scroll with easing param |
| Custom icon picker for the BTT button | Medium | Replace the hard-coded chevron SVG with a Lucide icon selector |
| Per-page disable via post meta | Medium | `_sgs_disable_floating_ui` post meta checkbox in the block editor sidebar |


---

## Phase 2A Cleanup (2026-05-20 — commits af5755b2 / 2be7c648)

### Legacy theme-side floating UI retired

Before Phase 2A, the theme (sgs-theme) carried a PARALLEL floating-UI system: 16 Customiser controls (sgs_back_to_top_* + sgs_reading_progress_* prefixes) registered alongside Spec 18 seven canonical controls (sgs_floating_ui_* prefix). Operators saw 23 controls in Appearance to Customise to SGS Floating UI — confusing UX where some controls were duplicate-purpose and others were dead.

Branch J deleted the theme-side parallel system entirely (985 lines):
- theme/sgs-theme/inc/floating-ui-customiser.php — registered the 16 orphan controls
- theme/sgs-theme/inc/floating-ui-output.php — read the theme_mods + enqueued 4 theme assets
- theme/sgs-theme/assets/css/back-to-top.css
- theme/sgs-theme/assets/css/reading-progress.css
- theme/sgs-theme/assets/js/back-to-top.js
- theme/sgs-theme/assets/js/reading-progress.js
- theme/sgs-theme/assets/js/customiser-preview.js

theme/sgs-theme/functions.php updated to drop the two require_once lines.

### Final state

All floating UI now lives ENTIRELY in the plugin (sgs-blocks):
- 7 canonical controls registered by Sgs_Floating_UI_Customiser
- All frontend output handled by Sgs_Floating_UI_Renderer

Customiser to SGS Floating UI section verified live (2026-05-20) shows exactly 7 controls with the sgs_floating_ui_* prefix.
