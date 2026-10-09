---
doc_type: spec
spec_id: 0A
spec_version: 1.1
parent_spec: 0
project: small-giants-wp
title: SGS Naming Conventions
status: active
last_verified: 2026-10-09
---

# SGS Naming Conventions

Single source of truth for every identifier used across the SGS WordPress Framework. All contributors (human and AI) MUST follow these rules. `scripts/lint-naming-conventions.py` checks rules 1 to 7 (see the end of this document).

---

## 1. Pattern slugs

**Rule:** Framework-generic patterns use `sgs/<role>`. Client-specific patterns use `sgs/<client-slug>-<role>`. The namespace separator is a forward slash; the internal separator is a hyphen. No underscores. All lowercase. The `sgs-theme/` namespace is deprecated — do not use it for new patterns.

**Format:**
- Framework: `sgs/<role>` — e.g. `sgs/footer-columns`, `sgs/framework-header-minimal`
- Client (illustrative): `sgs/<client-slug>-<role>` — e.g. `sgs/mamas-munches-header`, `sgs/indus-foods-footer`

**Examples:**
- `sgs/framework-header-default` — framework default header pattern
- `sgs/footer-columns` — framework columns footer pattern
- `sgs/mamas-munches-footer` — client footer (illustrative)

**Anti-pattern:** `sgs-theme/header-mamas-munches` — wrong namespace (`sgs-theme/`), wrong order (role before client slug). Both violations.

---

## 2. Block slugs

**Rule:** All blocks use the `sgs/` namespace followed by the block name in kebab-case. No underscores, no camelCase, no uppercase letters. The name must describe the block's primary function.

**Format:** `sgs/<block-name>`

**Examples:**
- `sgs/hero` — hero banner block
- `sgs/card-grid` — card grid layout block
- `sgs/countdown-timer` — countdown timer block

**Anti-pattern:** `sgs/CardGrid`, `sgs/card_grid`, `SGS/card-grid` — wrong case, wrong separator, wrong namespace capitalisation.

### 2.1 Header/footer/nav container blocks

Header/footer remain WordPress template parts (Spec 37) — a monolithic block that subsumes the template-part/Site-Info/rules system is still forbidden. **Specialised container blocks used *inside* the template parts are permitted**, exactly like `sgs/card-grid`/`sgs/feature-grid`: `sgs/site-header`, `sgs/site-footer`, `sgs/site-header-row`, `sgs/site-footer-row`, and the nav blocks **`sgs/nav-bar-menu`** (bar + burger) + **`sgs/nav-drawer-menu`** (the drawer's accordion/drill-down list) + **`sgs/nav-drawer`** (off-canvas `<dialog>` drawer). Bare `header`/`footer`/`nav` block slugs remain forbidden. Block FRs are owned by Spec 37 and **Spec 36** (the canonical nav home).

---

## 3. BEM CSS classes

**Rule:** All SGS CSS classes use the prefix `sgs-` followed by BEM notation: `sgs-<block>__<element>--<modifier>`. All lowercase, hyphens only (no underscores anywhere in BEM). The block segment must match an SGS block slug name (without the `sgs/` prefix). Modifiers are optional; elements are optional.

**Format:** `.sgs-<block>`, `.sgs-<block>__<element>`, `.sgs-<block>__<element>--<modifier>`

**Examples:**
- `.sgs-hero` — block root
- `.sgs-hero__headline` — headline element inside hero
- `.sgs-card-grid__item--featured` — featured modifier on a card grid item

**Anti-pattern:** `.sgs_hero__headline`, `.SGS-hero--Card`, `.sgs-hero__Headline` — underscores are forbidden; mixed case is forbidden.

### 3.1 BEM element → block recognition (canonical signal)

The block segment of `sgs-<block>` must match a registered block slug. The element segment should use a canonical slot alias from the framework DB (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT slot_name, aliases, standalone_block FROM slots"`), never a per-block invented class. The HTML tag is rendering shape only; the BEM element names the role (`<div class="sgs-X__quote">` and `<blockquote class="sgs-X__quote">` are the same `quote` role; `__body` is generic `text`). Section-root blocks are the blocks with `blocks.tier='class-section'` (query the DB, never a list cached here): `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT slug FROM blocks WHERE tier='class-section'"`. The draft standard checker is `plugins/sgs-blocks/scripts/lints/bem-lint.py`; Spec 47 pairs drafts with built pages.

**Counter-example: a shared root makes a whole family indistinguishable.** The `sgs/form-field-*` blocks all emit `.sgs-form-field__` as their BEM root, and `sgs/form-field` itself is not a registered block, so no `.sgs-form-field__*` element identifies which `form-field-*` block it belongs to. A registered block's BEM root must be unique to that block (D107). This is why `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` each have their own root (`.sgs-nav-bar-menu__*` / `.sgs-nav-drawer-menu__*`).

#### 3.1.1 Label / badge recognition → `sgs/label` (convention)

Every **short standalone label or cosmetic badge** text element uses the `label` canonical, which resolves to `sgs/label` (the atomic eyebrow / kicker / badge text block, style variants `plain` / `pill-fill` / `pill-wrap`). This is the canonical home for pre-heading labels and pill badges: not `sgs/text` (body copy) and not a per-block scalar attr. A draft that emits a badge as a literal `sgs/label` is faithful; inventing a per-block badge class is not (R-22-9).

The recognised aliases are the `aliases` of the `slots` row `label` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT aliases FROM slots WHERE slot_name='label'"`), seeded from `plugins/sgs-blocks/scripts/data/slots.json` by `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`. To add a new badge term, add its alias to that file and reseed; never hard-code a per-block badge class.

### 3.2 Section-root flag (`supports.sgs.is_section_root`)

`supports.sgs.is_section_root: true` in a block's `block.json` marks a block whose `sgs-<block>` class identifies a whole page section rather than an element within one (D107). `/sgs-update` reads the flag and writes `blocks.tier='class-section'`. The current roster is the DB query in §3.1. Adding a section-root block: set the flag in the block's `block.json`, then run `/sgs-update`. D108 (`block_composition`) holds sibling-routing data; D118 and D152 define the wrapper/container model (`block_composition.container_kind` section | layout | content; a composite with a built-in wrapper offers the `sgs/container` panels it needs, opt-in per block; `supports.sgs.containerKind` is the operator override), specified in Spec 02 (Composite wrapper rule).

### 3.3 Content-width cap → `--content-width` on the inner wrapper (D194)

**Rule:** Bean-authored SGS-BEM drafts express the inner content cap as a `--content-width` custom property on the section's direct-descendant inner wrapper (`__inner` / `__card-inner`): `max-width: var(--content-width); --content-width: <value>; margin: 0 auto;` (for example `.sgs-hero__inner { max-width: var(--content-width); --content-width: 1040px; margin: 0 auto; }`). The block's `contentWidth` attribute carries that value (D194).

**Why the custom property:** it separates the inner content cap from a section's own `max-width`. A section's own width (for example `.sgs-brand { max-width: 1000px; }`) is the outer layer (`customWidth` / `widthMode`); the inner cap is the content-width layer (`contentWidth`). Bare `max-width` is ambiguous between the two; the named property removes the ambiguity.

**External drafts** that do not use `--content-width`: `max-width` plus `margin:auto` (or `margin-inline:auto`) on a direct-descendant wrapper is the fallback signal for the content-width layer. The class names `__inner` / `__card-inner` are never the signal (D85 removed those slot aliases).

### 3.4 State styling → the `--active` selected-state modifier (D299)

**Rule:** An element's **selected / active** state uses the BEM **`--active` modifier** (`.sgs-<block>__<el>--active`) plus `aria-pressed="true"` on the interactive control (D299). The resting (unselected) state carries the bare element class with no state modifier (and `aria-pressed="false"`). Transient states use the standard pseudo-classes (`:hover`, `:focus-visible`). Example (a pack-size pill): `.sgs-product-card__pill { … }` (resting) and `.sgs-product-card__pill--active { … }` (selected) with `<button aria-pressed="true">`.

**Why:** resting, `--active` and `:hover` rules map to a block's resting attrs, selected-state attrs (`pillSelectedBgColour`, `pillSelectedBorderColour`, …) and `hover*` companions, so a multi-state pill or toggle design is expressed in full, not just its resting appearance. The same grammar applies to every state-bearing block, not only pickers (R-31-9).

### 3.5 Hover-state block attributes → `{base}Hover` SUFFIX (D309)

**Rule:** A block attribute representing a `:hover` companion to a base attr uses the **`{base}Hover` suffix** (for example `backgroundColourHover`, `boxShadowHover`, `scaleHover`), appended to the base attr name. **Never a `hover` prefix** (`hoverBackgroundColour`, `hoverBoxShadow`, `hoverScale` are the anti-pattern) (D309).

**Why:** a state is a modifier appended to the base attr (the same grammar family as `--active` in §3.4), so a hover companion is derived from the base name by string match with no per-block branching.

**Examples:**
- `backgroundColour` (base) → `backgroundColourHover` (hover companion)
- `boxShadow` (base) → `boxShadowHover` (hover companion)
- `scale` (base) → `scaleHover` (hover companion)

**Anti-pattern:** `hoverBackgroundColour`, `hover_background_colour`, `bgColourOnHover` — prefix form, wrong separator, non-standard wording.

---

## 4. PHP function prefixes

**Rule:** Every standalone PHP function defined by the SGS framework (outside a class) MUST be prefixed with `sgs_`. This applies to template tags, helper functions, and hook callbacks defined at global scope.

**Format:** `sgs_<descriptive_name>()`

**Examples:**
- `sgs_typography_css_rule()` — build a typography CSS rule (`plugins/sgs-blocks/includes/helpers-typography.php`)
- `sgs_svg_upload_sanitise()` — sanitise an uploaded SVG (`plugins/sgs-blocks/includes/svg-upload.php`)

**Anti-pattern:** `get_site_info()`, `renderIcon()`, `smallgiants_render_icon()` — missing prefix, wrong case, wrong prefix.

---

## 5. Filter and action hook prefixes

**Rule:** Every custom WordPress filter and action hook defined by SGS MUST use the prefix `sgs_`. Third-party hooks (WordPress core, WooCommerce, ACF) are referenced as-is — do not rename them.

**Format:** `sgs_<hook_name>`

**Examples:**
- `sgs_show_browse_styles` — filter: show the Browse styles UI (`theme/sgs-theme/functions.php`)
- `sgs_addon_cart_label` — filter on the add-on cart line label

**Anti-pattern:** `small_giants_site_info_save`, `sgs-block-render`, `SGS_pattern_resolved` — wrong prefix, hyphens in hook names, wrong case.

---

## 6. `wp_options` keys

**Rule:** All `wp_options` keys owned by the SGS framework MUST start with `sgs_`. Keys are lowercase with underscores as separators. No hyphens in option keys.

**Format:** `sgs_<descriptive_key>`

**Examples:**
- `sgs_site_info` — global Site Info store
- `sgs_framework_version` — installed framework version string
- `sgs_header_rules` — array of conditional header rules

**Anti-pattern:** `sgs-site-info`, `SGS_SITE_INFO`, `smallgiants_framework_version` — hyphens, uppercase, wrong prefix.

---

## 7. Post-meta keys

**Rule:** Private post-meta (not intended for REST exposure or direct user editing) uses a leading underscore: `_sgs_<key>`. Public post-meta (operator-editable, REST-exposed where appropriate) uses no leading underscore: `sgs_<key>`. All lowercase with underscores.

**Format:**
- Private: `_sgs_<key>`
- Public: `sgs_<key>`

**Examples:**
- `_sgs_base_price_pence` — private; a product's single-item reference price in pence
- `_sgs_unit_divisor` — private; a product's unit divisor

**Anti-pattern:** `sgs_base_price_pence` (missing underscore for private meta), `_SGS_base_price_pence` (uppercase, wrong prefix form).

---

## Linter

`scripts/lint-naming-conventions.py` checks rules 1 to 7 over `theme/sgs-theme/**` and `plugins/sgs-blocks/**` (options `--path`, `--skip-rule N`; allow-list of WordPress core hooks in `scripts/wp-core-hooks-allowlist.json`; tests in `plugins/sgs-blocks/scripts/tests/test_naming_lint.py`). Run it before committing:

```bash
python scripts/lint-naming-conventions.py
```

It prints every violation and exits 1 if any are found. It is not part of `plugins/sgs-blocks/scripts/run-gates.py` and no CI runs it; third-party hooks the allow-list does not yet list (WooCommerce hooks in particular) are reported as violations.
