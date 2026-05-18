# Phase 2A — Step-by-step execution plan

**Parent plan:** [phase-2-header-behaviours-and-responsive-logo.md](phase-2-header-behaviours-and-responsive-logo.md)
**Generated:** 2026-05-20 via inline phase-planner (research + decisions locked)
**Expanded 2026-05-20:** scope grew to include the original Phase 2 P1 list (Icon, Timeline, Pricing polish, universal-extension UI rollout, attribute audit) per Bean's directive — all in one parallel-dispatch round.
**Estimated wall clock:** ~2.5 hours parallel (7 subagents), ~10 hours sequential
**Dispatch shape:** 7 parallel Sonnet subagents (Branches A–G), then 4 sequential main-thread steps + integration

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

---

## Branch C (Sonnet subagent) — sgs/icon block

**Scope:** New single-icon block. Uses existing `lucide-icons.php` map (1917 icons) already shipped for `sgs/icon-list`. File-disjoint.

**Files to create:**
- `plugins/sgs-blocks/src/blocks/icon/block.json`
- `plugins/sgs-blocks/src/blocks/icon/edit.js`
- `plugins/sgs-blocks/src/blocks/icon/save.js` (returns null)
- `plugins/sgs-blocks/src/blocks/icon/render.php`
- `plugins/sgs-blocks/src/blocks/icon/index.js`
- `plugins/sgs-blocks/src/blocks/icon/style.scss`
- `plugins/sgs-blocks/tests/php/IconTest.php`

### Attributes (block.json)
- `iconName` (string, default 'star') — picker bound to lucide-icons.php map
- `iconSize` (number, default 32) — px
- `iconColour` (string, default 'primary') — token slug
- `linkUrl` (string, optional)
- `linkTarget` (enum: '_self' | '_blank' — default '_self')
- `linkRel` (string, default '' — auto 'noopener noreferrer' when target=_blank)
- `ariaLabel` (string) — required when no surrounding text context

### Universal SGS extensions (mandatory — see Branch B inheritance section)
- `supports.sgs.imageControls: false` (icon is SVG, not raster — no object-position controls needed)
- device-visibility / hover effects / animation attributes / custom CSS / conditional visibility — all auto via render_block

### SGS-BEM naming
- Root: `.sgs-icon`
- Link wrapper (when linkUrl): `.sgs-icon__link`
- SVG: `.sgs-icon__svg`
- Modifier (size): `.sgs-icon--size-{small|medium|large|custom}`

### Acceptance
- Picker shows all 1917 lucide icons searchable
- Renders inline SVG via lucide-icons.php helper (same path sgs/icon-list uses — DRY)
- WCAG: when no link, role=img + aria-label required; when link present, link gets aria-label, svg gets aria-hidden=true
- Estimated time: 60 min

---

## Branch D (Sonnet subagent) — sgs/timeline block

**Scope:** New date-based timeline block. Different from existing `sgs/process-steps` which is numbered/positional. File-disjoint.

**Files to create:**
- `plugins/sgs-blocks/src/blocks/timeline/block.json`
- `plugins/sgs-blocks/src/blocks/timeline/edit.js`
- `plugins/sgs-blocks/src/blocks/timeline/save.js` (returns null)
- `plugins/sgs-blocks/src/blocks/timeline/render.php`
- `plugins/sgs-blocks/src/blocks/timeline/index.js`
- `plugins/sgs-blocks/src/blocks/timeline/style.scss`
- `plugins/sgs-blocks/src/blocks/timeline/view.js` (IntersectionObserver scroll-reveal)
- `plugins/sgs-blocks/tests/php/TimelineTest.php`

### Attributes
- `orientation` (enum: 'vertical' | 'horizontal' — default 'vertical')
- `alignment` (enum: 'left' | 'centre' | 'alternating' — default 'alternating', vertical only)
- `entries` (array) — each entry: `date` (string), `title` (string), `description` (richtext), `icon` (lucide name, optional), `image` (media id, optional)
- `connectorStyle` (enum: 'line' | 'dashed' | 'dotted' — default 'line')
- `connectorColour` (string, default 'border-subtle')
- `dateColour` (string, default 'accent-text')
- `revealOnScroll` (boolean, default true)
- `revealStagger` (number, default 100) — ms between siblings

### Universal extensions
- `supports.sgs.imageControls: true` (entries may have images)
- All standard universals

### SGS-BEM
- Root: `.sgs-timeline`
- Modifier (orientation): `.sgs-timeline--vertical` / `--horizontal`
- Modifier (alignment): `.sgs-timeline--align-left` / `--align-centre` / `--align-alternating`
- Entry: `.sgs-timeline__entry`
- Entry date: `.sgs-timeline__date`
- Entry connector node: `.sgs-timeline__node`
- Entry content: `.sgs-timeline__content`
- Connector line: `.sgs-timeline__connector`
- State (revealed): `.sgs-timeline__entry.is-revealed`

### Acceptance
- Vertical + horizontal both work at 375/768/1440 (horizontal scrolls on mobile)
- Scroll-reveal honours `prefers-reduced-motion`
- WCAG: each entry is a `<li>` inside `<ol>` semantically; date is a `<time datetime="...">` element
- Estimated time: 75 min

---

## Branch E (Sonnet subagent) — sgs/pricing-table polish + L14 audit

**Scope:** Existing `sgs/pricing-table` block. Audit + close gaps. File-disjoint (only touches pricing-table files).

**Files to read first:**
- `plugins/sgs-blocks/src/blocks/pricing-table/block.json`
- `plugins/sgs-blocks/src/blocks/pricing-table/edit.js`
- `plugins/sgs-blocks/src/blocks/pricing-table/render.php`
- `plugins/sgs-blocks/src/blocks/pricing-table/style.scss`
- Master feature audit `docs/plans/2026-02-21-master-feature-audit.md` — find the "L14" tag and resolve what's expected vs current state

### Audit checklist
- Confirm 2/3/4 column layouts work at 375/768/1440
- Confirm Monthly/Yearly toggle JS works (already has billingToggle attr)
- Confirm "highlighted plan" visual emphasis (border + badge)
- Confirm universal extensions all wired (device-visibility, hover, animation, custom-css)
- Confirm SGS-BEM naming throughout — if any selectors are non-conformant, fix them
- Compare against Kadence Pro Pricing Table for feature parity gaps

### Likely fixes (based on initial inspection of attributes)
- billingToggle currently boolean → may need to be enum to support "no toggle / monthly only / yearly only / both" patterns
- Add per-plan icon attribute (lucide picker — for the new sgs/icon-like UX)
- Add per-plan ribbon attribute (small badge like "Best value")
- Add per-feature included/excluded marker (check vs cross)

### Acceptance
- All universal extensions wired
- All SGS-BEM selectors conformant
- New attrs added with backward-compatible defaults
- Tests updated
- Estimated time: 60 min

---

## Branch F (Sonnet subagent) — universal-extension EDITOR UI rollout

**Scope:** The universal extensions (`hover-effects.php`, `device-visibility.php`, `animation-attributes.php`, `custom-css.php`, `conditional-visibility.php`) ALL ship server-side filters that read `sgs*` attributes. But the EDITOR UI controls that let operators SET those attributes may not be wired into every block's inspector. This branch audits + adds the inspector controls.

**Files to investigate + edit (Branch F prompt MUST list):**
- `plugins/sgs-blocks/src/extensions/` (if exists — shared inspector control components)
- For each of the 71 SGS blocks in `plugins/sgs-blocks/src/blocks/*/edit.js` — check whether the universal-extension inspector panels are imported and rendered

**Investigation outputs:**
- A CSV / table at `reports/2026-05-20-universal-extension-coverage.csv` — one row per block, columns: block_slug, has_device_visibility_ui, has_hover_effects_ui, has_animation_ui, has_custom_css_ui, has_conditional_visibility_ui
- A retrofit script that adds the missing UI panels to each block's edit.js (using a shared `<UniversalExtensions block={attributes}>` component)

### Universal extension UI components to ship (if not already shared)
- `<DeviceVisibilityPanel>` — 3 checkboxes (hide on mobile/tablet/desktop)
- `<HoverEffectsPanel>` — hover scale / shadow / image-zoom + transition duration + easing
- `<AnimationPanel>` — entrance animation + stagger + duration
- `<CustomCssPanel>` — code textarea + scoped to block
- `<ConditionalVisibilityPanel>` — login state + date range + role conditions

**Acceptance:**
- Every block has the universal-extension inspector panels available (those that don't apply — e.g. parallax on header — explicitly skipped with a comment)
- One shared component module to keep DRY
- Tests confirm the attrs round-trip
- Estimated time: 90 min

---

## Branch G (Sonnet subagent) — sgs-db block attribute audit + retrofit

**Scope:** For each of the 71 SGS blocks, query `sgs-framework.db` for the attributes it CURRENTLY has, and the universal-extension capability flags it OPTED INTO (e.g. `supports.sgs.imageControls`). Identify blocks that have images (e.g. `<img>` in render.php) but don't declare `imageControls: true`. Retrofit. File-disjoint with Branch F because this touches block.json + render.php, not edit.js.

**Files to read:**
- `plugins/sgs-blocks/src/blocks/*/block.json` (71 files)
- `plugins/sgs-blocks/src/blocks/*/render.php` (60 dynamic blocks)
- `sgs-framework.db` via `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block <slug>`

**Investigation outputs:**
- `reports/2026-05-20-block-attribute-audit.csv` — one row per block, columns: block_slug, has_image_in_render, declares_imageControls, has_link_anywhere, declares_blockLink_supports, ... (and any other universal-extension supports flags)
- Retrofit commits to add missing `supports.sgs.imageControls: true` etc

**Cross-reference with Branch B / D / E** — they declare imageControls themselves; Branch G must not double-write.

**Acceptance:**
- Every block with an `<img>` in render output declares imageControls (per CLAUDE.md image-controls discipline)
- Audit CSV committed
- Tests confirm new attrs round-trip
- Estimated time: 75 min

---

## Sequential main-thread steps (after all 7 branches merge)

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

## Dispatch shape summary (expanded — 7 branches)

```
T+0:    Branch A subagent — header behaviours layer (~80 min)
T+0:    Branch B subagent — sgs/responsive-logo (~90 min)
T+0:    Branch C subagent — sgs/icon (~60 min)
T+0:    Branch D subagent — sgs/timeline (~75 min)
T+0:    Branch E subagent — pricing-table polish (~60 min)
T+0:    Branch F subagent — universal-extension UI rollout (~90 min)
T+0:    Branch G subagent — sgs-db attribute audit + retrofit (~75 min)
        (all parallel, all on separate git worktrees off main)

T+90:   All branches reach max return time.
T+90:   Multi-rater /qc panel × 7 (parallel, ~10 min each, run in waves of 4)
T+120:  All /qc panels done. Merge each into main sequentially (~5 min/branch = 35 min)
T+155:  Conflict resolution if any (most branches file-disjoint; F + G touch
        block.json files, careful coordination needed)
T+170:  Main thread M1–M5 (CPT meta, admin UI, WP-CLI param, dev pattern
        updates, Customiser default — ~95 min)
T+265:  npm run build + tar deploy to sandybrown + OPcache reset (~15 min)
T+280:  Playwright multi-viewport screenshots for every new + changed block
        + WCAG focus visible + CLS=0 verification (~20 min)
T+300:  /qc-inline integration self-check on main-thread M-step diff (~5 min)
T+305:  Commit + push (per the project CLAUDE.md branch discipline:
        feature touching 3+ files → create branch + PR, but Bean's
        always-merge-to-main rule trumps when the branch is fully QC'd —
        squash-merge feature/phase-2a-massive → main)
```

**Total:** ~5 hours wall clock with parallel. ~12 hours sequential. Saves 7 hours via parallel dispatch.

### Coordination notes (critical)

- **Branches F + G both touch block.json files.** F edits the `attributes` arrays of edit.js for inspector UI; G edits the `supports.sgs` declarations of block.json. They DON'T overlap on the same JSON keys, but the files do overlap. Subagent prompts MUST be explicit about this — F writes to edit.js, G writes to block.json — and the merge sequence does F first then G (G's smaller diff resolves easily on top of F).
- **Branches B + C + D + E all use the same `npm run build` postbuild script.** They MUST NOT race on `plugins/sgs-blocks/build/`. The build runs ONCE in main thread after all 7 branches merge, NOT inside each subagent. Subagent prompts MUST forbid running `npm run build`.
- **Each subagent works in a separate git worktree.** Use `/using-git-worktrees` skill pattern.
- **NO git stash / git reset / git checkout -- / git clean / git restore** in any subagent prompt (blub.db row from 2026-05-18).

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
