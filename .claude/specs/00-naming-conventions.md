---
doc_type: spec
spec_version: 0
project: small-giants-wp
title: SGS Naming Conventions
date: 2026-05-19
status: active
---

# SGS Naming Conventions

Single source of truth for every identifier used across the SGS WordPress Framework. All contributors (human and AI) MUST follow these rules. The CI linter at `scripts/lint-naming-conventions.py` enforces them automatically.

---

## 1. Pattern slugs

**Rule:** Framework-generic patterns use `sgs/<role>`. Client-specific patterns use `sgs/<client-slug>-<role>`. The namespace separator is a forward slash; the internal separator is a hyphen. No underscores. All lowercase. The `sgs-theme/` namespace is deprecated — do not use it for new patterns.

**Format:**
- Framework: `sgs/<role>` — e.g. `sgs/header-minimal`, `sgs/footer-columns`
- Client: `sgs/<client-slug>-<role>` — e.g. `sgs/mamas-munches-header`, `sgs/indus-foods-footer`

**Examples:**
- `sgs/framework-header-default` — framework default header pattern
- `sgs/mamas-munches-footer` — Mama's Munches client footer
- `sgs/indus-foods-header` — Indus Foods client header

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

The BEM element segment is the **canonical signal** for block recognition in the converter walker. The HTML tag is rendering-shape only — it does NOT determine which block the converter emits.

Recognition path (deterministic, tier-driven post-D107):

**SECTION-ROOT path (tier='class-section' blocks):**
1. Walker reads the block segment from `sgs-<block>` on a section-root candidate
2. Voter (`per-section-convention-voter.py:295-305`) queries `blocks.tier` — if `tier='class-section'`, emit the literal block slug with confidence 1.0 (reason: `class-section-block-equivalent`)
3. If `sgs-` prefix is present but no `class-section` row exists, voter emits `gap-candidate-class-section` instead of literal-slug-match — surfaces unregistered section blocks as gap candidates, never silently routed
4. Current class-section roster: `sgs/hero`, `sgs/cta-section`, `sgs/trust-bar` (sourced from `supports.sgs.is_section_root: true` in each block.json; populated into `blocks.tier` column by `/sgs-update`)

**ELEMENT path (BEM element inside a section):**
1. Walker reads the BEM element from the class (`sgs-X__<element>`)
2. Looks up the canonical slot via `slots` table (count is DB-authoritative — query `SELECT COUNT(1) FROM slots`; replaces retired `slot_synonyms` post-D111 2026-05-30) — e.g. `__quote` → `quote` canonical; `__body` → `text` canonical; `__card` → `card` canonical
3. Resolves canonical → standalone block via `slots.standalone_block` (e.g. `quote` → `sgs/quote`; `card` → `sgs/info-box`; `label` → `sgs/label`)
4. Emits the resolved standalone block

**Quote example (illustrates BEM-canonical-only routing):**
- `<div class="sgs-X__quote">` → `quote` canonical → `sgs/quote` ✓
- `<blockquote class="sgs-X__quote">` → `quote` canonical → `sgs/quote` ✓ (tag doesn't matter)
- `<div class="sgs-X__body">` → `text` canonical → `sgs/text` (intentional — `body` is generic text-content)
- `<blockquote class="sgs-X__body">` → `text` canonical → `sgs/text` (tag doesn't change recognition)

**Canonical vocabulary** lives in `sgs-framework.db.slots` (post-D99 replacement for retired `slot_synonyms`) and is documented in [Spec 22 §3 FR-22-1 + FR-22-2](31-UNIVERSAL-CLONING-PIPELINE.md#fr-22-1--bem-is-the-only-recognition-signal). To author a draft that routes to a specific block, name the BEM element with one of that canonical's aliases.

#### 3.1.1 Label / badge recognition → `sgs/label` (convention)

Every **short standalone label or cosmetic badge** text element routes to the `label` canonical → `sgs/label` (the "Atomic eyebrow / kicker / badge text block; reusable for card-tag badges", style variants `plain` / `pill-fill` / `pill-wrap`). This is the canonical home for pre-heading labels and pill badges — NOT `sgs/text` (which is body copy) and NOT a per-block scalar attr. A draft that emits a badge as a literal `sgs/label` is faithful; a converter workaround that invents a per-block badge class is not (R-22-9).

`label`-canonical aliases (recognised BEM elements) include: `eyebrow`, `kicker`, `tag`, `pill`, `badge-label`, `badge-text`, `trialTag`, `featuredTag`, `inner-label`, `slot-label`, `node-icon`, and the cosmetic-badge family `discount-label`, `discount-badge`, `value-badge`, `savings-label`, `sale-badge`, `ribbon-label` (added 2026-06-04 alongside the FR-27-B3 product-card "Best value" badge). Source of truth: `slots` row `label` (seeded by `scripts/uimax-tools/seed-slot-synonyms.py`). To route a new badge term, add its alias there + re-run the seed — never hard-code a per-block badge class.

> **Known gap (cloning thread, deferred):** a separate `badge` slot exists with `standalone_block = NULL` and alias `pill` (which also lives on `label`). Wiring the bare `badge` slot → `sgs/label` and resolving the `pill` overlap is a routing change that needs the cloning thread's per-row `/sgs-clone --debug-trace` measurement gate (R-22-4) + a multi-DB audit — not done inline in the theme thread. Tracked in `parking.md`.

### 3.2 Section-root flag (`supports.sgs.is_section_root`)

To declare a new section-root block (a block whose `sgs-<block>` class identifies a whole page section, not an element within one), set `"is_section_root": true` under `supports.sgs` in the block's `block.json`. `/sgs-update` reads this flag and writes `blocks.tier='class-section'`. The voter then routes section recognition to the literal slug at confidence 1.0.

Current roster: `sgs/hero`, `sgs/cta-section`, `sgs/trust-bar`. Adding a new section-root block requires:
1. `block.json` declares `supports.sgs.is_section_root: true`
2. Run `/sgs-update` to populate `blocks.tier`
3. Walker recognition flows automatically — no code branches needed

Cross-references: D107 (voter rewrite, tier-driven recognition), D108 (block_composition table — sibling routing data), D118 + **Spec 22 §FR-22-4.1** (Universal wrapper/container resolution — the single rule governing how every sgs-classed wrapper below a section root is resolved: direct-descendant fold, grid/flex absorption, block-match exception, non-direct-descendant own-container), D152 + **Spec 22 §FR-22-21** (`block_composition.container_kind` 3-KIND model section|layout|content; composite-mirror rule — every composite wrapper block mirrors `sgs/container`, BLOCK-SIDE COMPLETE across the 29-block roster D167; `supports.sgs.containerKind` operator-override + `supports.sgs.containerMirror:false` exclusion — modal + mobile-nav are excluded).

### 3.3 Content-width cap → `contentWidth` attribute (the inner-wrapper mapping, D194)

**Rule (SUPERSEDES the earlier "max-width stays, NO custom property, NO rename" wording):** Bean-authored SGS-BEM drafts express the inner content-cap as a `--content-width` **custom property** on the section's **direct-descendant inner wrapper** (`__inner` / `__card-inner`): `max-width: var(--content-width); --content-width: <value>; margin: 0 auto;` — e.g. `.sgs-hero__inner { max-width: var(--content-width); --content-width: 1040px; margin: 0 auto; }`. This is the **deterministic CONTENT-WIDTH-layer signal** the converter maps to the block's `contentWidth` attribute (Spec 22 §FR-22-21, step 3).

**Why the custom property:** it disambiguates the inner content cap from a section's OWN `max-width`. A section's own width (e.g. `.sgs-brand { max-width: 1000px; }`) is an OUTER-layer signal → maps to the OUTER `customWidth` / `widthMode`. The inner cap's `--content-width` is the CONTENT-WIDTH layer → maps to `contentWidth`. An adversarial council (2026-06-09) confirmed bare `max-width` alone is ambiguous between these two layers; the named property removes the ambiguity for Bean-authored drafts.

**Fallback for scraped / external drafts** (which won't use `--content-width`): the `max-width` + `margin:auto` (or `margin-inline:auto`) heuristic on a direct-descendant wrapper remains the universal fallback signal for the CONTENT-WIDTH layer.

**Routing stays name-free.** The converter reads EITHER the `--content-width` declaration OR the `max-width` + `margin:auto` signature on a slug-None direct-descendant wrapper (FR-22-4.1) — NEVER the `__inner`/`__card-inner` class name (precedent: D85 removed those slot aliases for causing wrong collapse). This is a documented CSS-signature mapping, not a class-name match.

### 3.4 State styling → the `--active` selected-state signal + `:hover` (the state-modifier mapping, D299)

**Rule:** Bean-authored SGS-BEM drafts express an element's **selected / active** state with the BEM **`--active` modifier** on that element (`.sgs-<block>__<el>--active`) **plus `aria-pressed="true"`** on the interactive control; the **resting (unselected)** state carries the bare element class with no state modifier (and `aria-pressed="false"`). Transient states use the standard CSS pseudo-classes (`:hover`, `:focus-visible`). Example (a pack-size pill): `.sgs-product-card__pill { … }` (resting) and `.sgs-product-card__pill--active { … }` (selected) with `<button aria-pressed="true">`.

**Why:** these are the deterministic **state signals** the converter's universal styling lift (Spec 31 §3.B B2) keys each state's `derived_selector` on — the resting rule → the block's resting colour/box attrs (`pillBgColour`, `hoverBackgroundColour`'s base sibling, …), the `--active` rule → the block's **selected-state** attrs (`pillSelectedBgColour`/`pillSelectedBorderColour`/…), and a `:hover` rule → the block's `hover*` attrs. So a draft's full multi-state pill/toggle design clones faithfully, not just its resting appearance. (Enabled 2026-07-10 by D299 removing the stale converter exclusion that dropped state styling; the same convention drives every state-bearing block, not just pickers — R-31-9.)

**Routing stays name-free.** The lift matches by the attr's `derived_selector` (a documented per-attr DB mapping, e.g. resting `.sgs-<block>__pill` / selected `.sgs-<block>__pill--active`), never by hardcoding a class-name literal — the `--active`/`:hover` grammar is the STATE signal, exactly as `--content-width` (§3.3) is the width-layer signal.

---

## 4. PHP function prefixes

**Rule:** Every standalone PHP function defined by the SGS framework (outside a class) MUST be prefixed with `sgs_`. This applies to template tags, helper functions, and hook callbacks defined at global scope.

**Format:** `sgs_<descriptive_name>()`

**Examples:**
- `sgs_site_info_get( $key )` — retrieve a Site Info value
- `sgs_render_icon( $name )` — render a Lucide icon
- `sgs_get_active_variation()` — read the active style variation slug

**Anti-pattern:** `get_site_info()`, `renderIcon()`, `smallgiants_get_variation()` — missing prefix, wrong case, wrong prefix.

---

## 5. Filter and action hook prefixes

**Rule:** Every custom WordPress filter and action hook defined by SGS MUST use the prefix `sgs_`. Third-party hooks (WordPress core, WooCommerce, ACF) are referenced as-is — do not rename them.

**Format:** `sgs_<hook_name>`

**Examples:**
- `sgs_site_info_before_save` — fires before Site Info is written to `wp_options`
- `sgs_pattern_slug_resolved` — fires after a deprecated slug is resolved via the shim
- `sgs_block_render_output` — filter on block render output

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
- `_sgs_cloned_from_pattern_slug` — private; marks a template part as pipeline-seeded
- `_sgs_last_seeded_variation` — private; slug of the variation that last seeded this template part
- `sgs_header_mode` — public; per-page header behaviour override

**Anti-pattern:** `sgs_cloned_from_pattern_slug` (missing underscore for private meta), `_SGS_header_mode` (uppercase, public intent but wrong prefix form).

---

## CI enforcement

The linter at `scripts/lint-naming-conventions.py` scans `theme/sgs-theme/**` and `plugins/sgs-blocks/**` for violations of rules 1–7. Run it locally before committing:

```bash
python scripts/lint-naming-conventions.py
```

The linter exits non-zero on first violation. Fix all reported violations before opening a PR.
