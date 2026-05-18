# Phase 2A — Step-by-step execution plan

**Parent plan:** [phase-2-header-behaviours-and-responsive-logo.md](phase-2-header-behaviours-and-responsive-logo.md)
**Generated:** 2026-05-20 via inline phase-planner (research + decisions locked)
**Estimated wall clock:** ~2 hours parallel, ~4 hours sequential
**Dispatch shape:** 2 parallel Sonnet subagents (Branch A + Branch B), then 4 sequential main-thread steps

---

## Branch A (Sonnet subagent) — Header behaviours layer

**Scope:** F1 + F2 + F4 (header-height publisher, behaviour CSS+JS modules, wrapper-class injector). Tightly coupled, single subagent.

**Files to be created:**
- `plugins/sgs-blocks/src/header-behaviours/view.js`
- `plugins/sgs-blocks/assets/css/header-behaviours.css`
- `plugins/sgs-blocks/includes/class-sgs-header-behaviours.php`
- `plugins/sgs-blocks/tests/php/HeaderBehavioursTest.php`

**Files to be edited:**
- `plugins/sgs-blocks/sgs-blocks.php` — require + register the new class
- `plugins/sgs-blocks/includes/class-sgs-header-rules.php` — extend the resolver to read behaviour from the matched rule and pass it through

### Step A1. Header-height publisher (F1) — ~15 min

`view.js` exports a small IIFE that:
- Selects `header.wp-block-template-part` on DOMContentLoaded
- Creates a `ResizeObserver` watching the header
- On each callback: sets `--sgs-header-height` on `document.documentElement` to the observed height (rounded to integer)
- Also sets `--sgs-header-height` on `body` for downstream block CSS

`header-behaviours.css` ships:
```css
:root { scroll-padding-top: var(--sgs-header-height, 0px); }
@supports not (scroll-padding-top: 1px) { /* IE fallback comment only */ }
```

Acceptance: when sticky behaviour is active, anchor link clicks land BELOW the header (WCAG 2.4.11). Verify by adding an anchor link + clicking + checking the focus rectangle is fully visible.

### Step A2. Behaviour CSS modules (F2) — ~20 min

Three CSS modules in `header-behaviours.css`, each scoped to a wrapper class:

```css
.sgs-header--transparent { position: absolute; top: 0; left: 0; right: 0; background: transparent; }
.sgs-header--transparent.is-scrolled { background: var(--wp--preset--color--surface); }

.sgs-header--sticky { position: sticky; top: 0; z-index: 100; }

.sgs-header--hide-on-scroll-down { transition: transform 200ms ease; will-change: transform; }
.sgs-header--hide-on-scroll-down.is-scrolling-down { transform: translateY(-100%); }
```

Plus `@media (prefers-reduced-motion: reduce) { .sgs-header--hide-on-scroll-down { transition: none; } }`.

### Step A3. Behaviour JS (F2) — ~10 min

Single IIFE in `view.js` (combined with A1's ResizeObserver):
- Reads behaviour class from `header.wp-block-template-part`
- For `.sgs-header--transparent`: scroll listener (throttled with `requestAnimationFrame`), toggles `.is-scrolled` when scrollY > 50px
- For `.sgs-header--hide-on-scroll-down`: scroll-direction detection, toggles `.is-scrolling-down` when scrollY increasing past 100px, removes when decreasing

Use a single `passive: true` scroll listener for all behaviours (perf).

### Step A4. Wrapper-class injector PHP (F4) — ~20 min

`class-sgs-header-behaviours.php` registers:
- `add_filter('sgs_header_rule_resolved', [..., 'inject_behaviour_class'], 10, 2)` — NEW filter point in Sgs_Header_Rules (added in same step)
- Reads `$rule['behaviour']` if set; falls back to `_sgs_header_behaviour` post meta if rule references a CPT post; falls back to `'none'`
- Wraps the rendered pattern HTML by injecting the class into the outermost `<header>` (use `wp_html_split` or simple regex on the leading `<header [^>]*>` tag — guarded for the case where the pattern returned no `<header>` wrapper)
- Enqueues the view.js + header-behaviours.css on `wp_enqueue_scripts` (frontend only)

In `Sgs_Header_Rules::evaluate()`: after `render_pattern( $slug )` returns content, run it through `apply_filters( 'sgs_header_rule_resolved', $content, $rule )` before returning.

### Step A5. Tests (F1+F2+F4) — ~15 min

`HeaderBehavioursTest.php`:
- Asserts the filter fires
- Asserts wrapper class is correctly injected for each behaviour
- Asserts the asset enqueue fires on frontend only

### Branch A safety clause (subagent prompt)

NO `git stash`, NO `git reset`, NO `git checkout --`, NO `git clean`. Work in fresh worktree off main. Final step: report diff stats + run PHPUnit + return.

### Branch A QC gate

`/qc` multi-rater (Sonnet + Haiku + Gemini Flash + Cerebras) on the diff. Single-rater is insufficient per blub.db row 255.

---

## Branch B (Sonnet subagent) — sgs/responsive-logo block

**Scope:** F5 only. File-disjoint from Branch A.

### Universal SGS extensions the new block MUST inherit

Every new SGS block automatically picks up these universal extensions via existing `render_block` filters — but the block.json must enable them where applicable. Branch B prompt MUST include this checklist:

| Extension | block.json declaration | Apply to sgs/responsive-logo? |
|-----------|------------------------|-------------------------------|
| Device visibility (sgsHideOnMobile/Tablet/Desktop) | Automatic via `render_block` filter | YES — operator may want to hide the whole logo on a specific breakpoint |
| Universal hover effects (scale + shadow + image-zoom) | `supports.sgs.imageControls: true` + universal hover filter | YES — `imageControls` for object-position + max-width + height; hover effects optional but useful |
| Animation attributes (scroll reveal) | Automatic via `render_block` filter | YES — logo entrance animation on page load |
| Custom CSS per block (sgsCustomCss) | Automatic via `render_block` filter | YES |
| Conditional visibility (login-gated, date-range) | Automatic via `render_block` filter | YES — e.g. show a "Holiday" logo during a date range |
| Parallax scroll | Automatic via `render_block` filter | NO — not appropriate for a header logo (parking note in block.json comment) |
| Heading anchors | n/a | NO — logo is not a heading |

Branch B subagent MUST verify each universal-extension-tagged attribute appears in the rendered output by running the relevant attribute through render and asserting the expected classes/styles are present.

### Naming convention — SGS-prefixed BEM (cloning pipeline mandate)

Per `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` §8.1 + blub.db row 236, every selector + state class must follow `.sgs-<block>__<element>--<modifier>` (state classes use `is-` prefix). For sgs/responsive-logo:

| Element / state | Class | Purpose |
|-----------------|-------|---------|
| Root | `.sgs-responsive-logo` | Block wrapper (matches block slug) |
| Picture container | `.sgs-responsive-logo__picture` | `<picture>` element |
| Desktop image | `.sgs-responsive-logo__image--desktop` | Inside `<img>` or `<source>` |
| Tablet image | `.sgs-responsive-logo__image--tablet` | Inside `<source media="...">` |
| Mobile image | `.sgs-responsive-logo__image--mobile` | Inside `<source media="...">` |
| SVG container | `.sgs-responsive-logo__svg` | When animation source is inline SVG |
| Home link | `.sgs-responsive-logo__link` | Wrapping `<a>` |
| Animation modifier | `.sgs-responsive-logo--animate-draw` / `--animate-hover` / `--animate-scroll` | One per animationStyle |
| State: animation playing | `.sgs-responsive-logo.is-animating` | JS toggles during Vivus run |
| State: animation done | `.sgs-responsive-logo.is-animated` | JS toggles when complete (for hover-redraw reset) |

For the header behaviour wrapper (Branch A scope, repeated here for cloning-pipeline consistency):

| Element / state | Class |
|-----------------|-------|
| Header wrapper root | `header.sgs-header` (added by behaviour injector even when behaviour is `none` — gives the recogniser a stable hook) |
| Behaviour modifier | `.sgs-header--transparent` / `--sticky` / `--shrink` / `--hide-on-scroll-down` |
| State: scrolled (transparent → opaque) | `.sgs-header.is-scrolled` |
| State: scroll-direction down | `.sgs-header.is-scrolling-down` |

This naming lets `/sgs-clone`'s recogniser match `.sgs-responsive-logo` and `.sgs-header--<behaviour>` directly when a draft mockup carries those selectors. The lingua-franca-conversion step in `/uimax-*` skills then writes these as the primary SGS-block-attribute mapping in `equivalent_implementations` when scraping external sites.



**Files to be created:**
- `plugins/sgs-blocks/src/blocks/responsive-logo/block.json`
- `plugins/sgs-blocks/src/blocks/responsive-logo/edit.js`
- `plugins/sgs-blocks/src/blocks/responsive-logo/save.js` (returns null — dynamic block)
- `plugins/sgs-blocks/src/blocks/responsive-logo/render.php`
- `plugins/sgs-blocks/src/blocks/responsive-logo/index.js`
- `plugins/sgs-blocks/src/blocks/responsive-logo/style.scss`
- `plugins/sgs-blocks/src/blocks/responsive-logo/view.js` (Vivus Instant SVG animation kickoff — only enqueued when block has SVG animation attribute set)
- `plugins/sgs-blocks/tests/php/ResponsiveLogoTest.php`

### Step B1. block.json — ~10 min

Attributes:
- `desktopLogoId` (number) — media library ID for horizontal logo
- `tabletLogoId` (number, optional) — square logo
- `mobileLogoId` (number, optional) — vertical / mark logo
- `svgAnimationSource` (string, optional) — inline SVG markup OR media library ID of a .svg
- `animationStyle` (enum: 'none' | 'draw-on-load' | 'hover-redraw' | 'scroll-trigger') — defaults to 'none'
- `width` (number, default 240)
- `linkToHome` (boolean, default true)
- `alt` (string)

`supports`: `align`, `spacing.margin`, `spacing.padding`. Block category: `sgs-content`.

### Step B2. edit.js — ~25 min

InspectorControls panels:
- "Logos by device" — three MediaUpload buttons (desktop / tablet / mobile). Tablet + mobile show "Same as desktop" when empty.
- "SVG animation" — toggle + style picker + inline-SVG textarea OR media upload for .svg file
- "Sizing + behaviour" — width slider, link-to-home toggle, alt text

Live preview: shows desktop logo by default; "Preview as tablet/mobile" pill switcher in the editor that mocks `<picture>` source matching.

### Step B3. render.php (`<picture>` element) — ~20 min

Server-side output:
```php
<picture class="sgs-responsive-logo">
  <source media="(max-width: 600px)" srcset="<?php echo esc_url( $mobile_url ?: $desktop_url ); ?>">
  <source media="(max-width: 1024px)" srcset="<?php echo esc_url( $tablet_url ?: $desktop_url ); ?>">
  <img src="<?php echo esc_url( $desktop_url ); ?>" alt="<?php echo esc_attr( $alt ); ?>" width="<?php echo absint( $width ); ?>" loading="eager">
</picture>
```

If SVG animation is set, render `<picture>` INSIDE the inline SVG (with the SVG containing the animated paths + a `<foreignObject>` fallback for the picture? — or, simpler: SVG-mode renders inline SVG ONLY, no `<picture>` fallback). Branch A's CSS scopes animations to `.sgs-responsive-logo[data-animation]`.

If `linkToHome`, wrap in `<a href="<?php echo esc_url( home_url('/') ); ?>" rel="home">`.

### Step B4. view.js (SVG animation) — ~25 min

Vivus Instant integration:
- Lazy-load Vivus only when `data-animation` attribute is present on `.sgs-responsive-logo`
- Initialize on DOMContentLoaded for `draw-on-load`
- Initialize on `:hover` for `hover-redraw`
- Initialize on IntersectionObserver firing for `scroll-trigger`
- Honour `prefers-reduced-motion`: short-circuit to "drawn" state immediately

### Step B5. Style + tests — ~10 min

style.scss: `.sgs-responsive-logo img { display: block; max-width: 100%; height: auto; }`. Plus `:not([style*="width"]) { width: var(--logo-width, 240px); }`.

ResponsiveLogoTest.php: render with each combination of attrs, assert output matches snapshot.

### Branch B safety clause (subagent prompt)

NO `git stash`, NO `git reset`, NO destructive git verbs. Work in fresh worktree off main. Final step: `npm run build` + PHPUnit + return diff stats.

### Branch B QC gate

`/qc` multi-rater on the new block. Critical: SVG rendering safety (escape user-supplied SVG to prevent XSS — use `wp_kses_post` with extended SVG schema OR force operators to upload .svg via media library instead of pasting inline).

---

## Sequential main-thread steps (after Branch A + B merge)

### Step M1. Add `_sgs_header_behaviour` post meta to sgs_header CPT (F3) — ~10 min

In `class-sgs-block-cpts.php`:
```php
register_post_meta( self::HEADER_CPT, '_sgs_header_behaviour', array(
    'type'              => 'string',
    'single'            => true,
    'show_in_rest'      => array( 'schema' => array(
        'enum' => array( 'none', 'transparent', 'sticky', 'shrink', 'hide-on-scroll-down' ),
    )),
    'auth_callback'     => fn() => current_user_can('edit_theme_options'),
    'sanitize_callback' => 'sanitize_key',
));
```

### Step M2. Block-editor admin UI for the behaviour meta (F3) — ~20 min

`addFilter('blocks.registerBlockType')` for `core/post-content` — when rendering inside the sgs_header CPT editor, add a SidebarPanel with a SelectControl bound to the `_sgs_header_behaviour` meta.

### Step M3. WP-CLI parameter (F3) — ~15 min

Extend `wp sgs header_rules add` to accept `--behaviour=<slug>`. Stored in the rule definition. Updates `Sgs_Header_Rules::add_rule()`.

### Step M4. Update dev-shipped patterns (F6 + D1 + D2) — ~30 min

- `framework-header-default.php` — swap `core/site-logo` → `sgs/responsive-logo` with default attrs
- `framework-header-transparent.php` — wrap in `<!-- wp:group ... className="sgs-header--transparent" ... -->` (no longer delegates 100% to default)
- `framework-header-sticky.php` — wrap with `sgs-header--sticky` class
- `framework-header-shrink.php` — leave as stub (deferred per scope OUT), but add a comment noting Phase 2B
- `header-centred.php`, `header-minimal.php`, `header-full.php` — swap `core/site-logo` → `sgs/responsive-logo`

### Step M5. Customiser global default (F7) — ~20 min

In `class-sgs-floating-ui-customiser.php` (or new sibling file for header settings), add a section `sgs_header_defaults` with one control: `sgs_default_header_behaviour`. Stored as theme mod. Fallback when no rule matches.

### Step M6. Deploy + verification (M-step) — ~15 min

1. `npm run build` from `plugins/sgs-blocks/`
2. tar deploy to sandybrown + OPcache reset
3. Run migrations (if any new added — for Phase 2A there are no schema changes)
4. Playwright multi-viewport screenshots (375 / 768 / 1440) of:
   - Default header (no behaviour)
   - Default header + transparent rule on `is_front_page`
   - Default header + sticky rule on `is_singular`
   - Default header + hide-on-scroll-down rule
5. WCAG check: click anchor link → confirm focus visible below sticky header
6. CLS check: Lighthouse run on homepage, confirm CLS = 0

### Step M7. `/qc-inline` self-check on M1–M5 diff — ~5 min

Smaller surface, full multi-rater not required.

### Step M8. Commit + push — ~5 min

```
feat(phase-2a): header behaviours layer + sgs/responsive-logo block

- F1: --sgs-header-height ResizeObserver publisher + scroll-padding-top fix
  (closes WCAG 2.4.11 gap; CLS-safe — no spacer div)
- F2: behaviour CSS + JS modules: transparent overlay, sticky pin,
  hide-on-scroll-down (with prefers-reduced-motion honour)
- F3: _sgs_header_behaviour meta on sgs_header CPT + block-editor admin
  UI + `wp sgs header_rules add --behaviour=...` CLI
- F4: Sgs_Header_Behaviours filter injects wrapper class on the
  template-part <header> element regardless of pattern origin
  (dev-shipped or sgs_header CPT)
- F5: sgs/responsive-logo block — 3 logo slots + optional SVG animation
  (Vivus Instant CSS-only, ~15KB) + <picture> element output. Per-device
  swap nobody else (Kadence/Spectra/GB/Astra/Blocksy) has fully solved.
- F6: dev-shipped patterns swap core/site-logo → sgs/responsive-logo;
  transparent/sticky stubs become real starter packs with baked classes
- F7: Customiser global default behaviour fallback

Two competitive moats no WP competitor currently has:
  - WCAG-2.4.11-safe sticky (header-height publisher + scroll-padding-top)
  - H/Square/Mark aspect-ratio logo picker via <picture> element
```

---

## Dispatch shape summary

```
T+0:    Branch A subagent dispatched (F1+F2+F4, ~80 min cold)
T+0:    Branch B subagent dispatched (F5, ~90 min cold)
        (parallel)
T+90:   Both return. Main thread merges both into local worktree.
T+90:   Multi-rater /qc panel on Branch A diff (~10 min)
T+100:  Multi-rater /qc panel on Branch B diff (~10 min)
T+110:  Main thread: M1 → M5 sequentially (~95 min)
T+205:  Deploy + Playwright + WCAG + CLS verification (~15 min)
T+220:  /qc-inline self-check (~5 min)
T+225:  Commit + push
```

Total: ~3.75 hours wall clock with parallel dispatch. ~6 hours fully sequential.

---

## Risks + mitigations

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| `ResizeObserver` not supported in old browsers | LOW (98% global support 2026) | Fallback: header-height defaults to 0; scroll-padding-top becomes a no-op |
| Behaviour wrapper class injection breaks an existing pattern that doesn't have a `<header>` tag | MED | Guard with strpos check; return content unchanged when no `<header>` found; log to debug.log |
| SVG animation XSS via inline SVG textarea | HIGH if unguarded | Force operators to upload .svg via media library (server-side sanitised) instead of pasting inline. Document the choice. |
| `sgs/responsive-logo` migration on existing sites — broken layouts where operators committed core/site-logo positions | LOW (no migration ran per D2) | Only NEW dev-shipped patterns use the new block. Existing operator headers keep core/site-logo until edited. |
| Branch A + B both touch sgs-blocks.php (registering classes) | MED | Subagent prompts MUST split: Branch A registers behaviours, Branch B registers block, they edit different lines. Main thread reconciles if conflicts. |

---

## Acceptance — Phase 2A done when

- [ ] Branch A returned + /qc passed + merged
- [ ] Branch B returned + /qc passed + merged
- [ ] M1–M5 main-thread steps complete
- [ ] Deploy to sandybrown clean (zero new fatals, zero new notices)
- [ ] Playwright 375/768/1440 screenshots captured for each behaviour
- [ ] WCAG focus-visible verified
- [ ] CLS = 0 on Lighthouse
- [ ] Commit + push to main (PR optional given main-flow policy)
- [ ] palestine-lives.org deploy follows
- [ ] Bean reviews the live behaviour on sandybrown homepage
