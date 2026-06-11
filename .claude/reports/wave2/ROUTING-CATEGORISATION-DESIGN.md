---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Converter routing + grid-awareness design — the DB categorisation layer"
created: 2026-06-10
status: APPROVED IN PRINCIPLE (Bean, 2026-06-10). Routing foundation for the Method-2 converter rebuild. Now carries the per-element, per-breakpoint responsive-CSS routing (§Responsive CSS routing) + the corrected block model (preset + child-typography + container-mirror) the step-C CSS pass forced. Worked example for every section of both drafts: `STEP-C-LAYOUT-MAPPING-2026-06-10.md`. Ratify into Spec 22 once the block-side fixes (theme thread) land.
supersedes: the fragile heuristics it names (fold_eligible child-count, the flat html_tag_to_core_block fallback, class-name-exact matching)
---

# Converter routing + grid-awareness design

## Why this exists

The converter fails on real drafts because it routes by fragile shortcuts: it counts a wrapper's children to decide whether to dissolve it, it falls back to a flat HTML-tag map, and it matches draft classes by exact name. Each shortcut breaks when a block is quirky or a draft names things slightly differently.

The framework already carries a deliberate categorisation layer that makes routing robust. The converter under-uses it. This document maps that layer table by table, states which routing step each column drives, and explains why each is the right signal. Two principles run through it:

- **Principle A — route by meaning, from the DB.** Resolve every draft element to a *slot* + *role*, then route by those, never by a raw class name or a child count.
- **Principle B — read the grid from the CSS.** A wrapper's own `display:grid` / `grid-template-columns` / `grid-template-areas` (plus the `@media` variants on the same selector) state its structure exactly. Trust that, not a sibling count.

---

## The categorisation layer — table by table

### `slots` (103 rows) — the element vocabulary

The backbone. Every element a draft can contain maps to one slot.

| Column | Drives | What it does | Why it is the right choice |
|---|---|---|---|
| `slot_name` | identity | The canonical name for an element kind (`heading`, `button`, `media`, `label`, `price`, `option-picker`, `rating`, `icon`…). | One stable name per kind; everything else keys off it. |
| **`aliases`** | **element identification (step 1)** | A list of every naming variant that resolves to the slot — e.g. `heading`: `card-title`, `headline`, `aggregate-text`; `option-picker`: `pill-group`, `pills`, `variant`; `price`: `amount`, `cost`, `ribbon`. | **This is the robustness layer.** A draft element resolves by matching its class suffix or tag against the alias list, so non-uniform draft naming still lands on the right slot. |
| `standalone_block` | child-block emit (step 2b) | The block to emit when the element stands alone (`heading → sgs/heading`, `media → sgs/media`). 36 element slots map to a block; 4 section slots (`hero`, `cta`, `cta-section`, `core/group → sgs/container`). | Gives a deterministic child block without a per-tag table. Replaces the flat `html_tag_to_core_block` fallback. |
| `standalone_block_default_attrs` | child-block emit | Default attrs to seed on that standalone block. | Keeps the emit complete without converter-side literals. |
| `scope` | layering | `element` vs `section`. | Separates section-root resolution from interior-element resolution. |

### `block_attributes` (2,773 rows) — the per-block attr map

Tells the converter, for one block, which typed attr owns each slot, property, and element.

| Column | Drives | What it does | Why it is the right choice |
|---|---|---|---|
| `canonical_slot` | typed-attr routing (step 2a) | Links an attr to a slot — e.g. product-card `productName.canonical_slot = heading`. | Lets the converter ask "does this parent expose a typed attr for this slot?" — the built-in-element route. |
| `role` | content/scalar fork | The attr's semantic role (see `roles`). | Decides emit-content vs lift-scalar, read with `attr_type`. |
| **`derived_selector`** | direct element→attr bridge | The element selector an attr maps to — `productName → .sgs-product-card__heading`, `image → .sgs-product-card__media`. | A direct draft-element-to-attr link when the selector matches; the `slots` aliases cover the cases where it drifts (e.g. draft `__title` vs `derived_selector __heading`). |
| `attr_type` | content/scalar/array fork | `string` / `array` / etc. | With `role`, completes the child-vs-scalar-vs-array decision (FR-22-2.1). |
| `output_signature`, `signature_confidence` | rendered-output match | A fingerprint of the attr's painted output (sparsely populated today). | Reserved for matching by rendered effect when name and selector both fail. |
| `is_responsive` | breakpoint routing | Whether the attr has `+Tablet`/`+Mobile` companions. | Routes the `@media` variants to the right tier. |

### `roles` (21 rows) — the content-vs-styling fork

| Column | Drives | What it does | Why it is the right choice |
|---|---|---|---|
| `classification` | step 2 fork | Splits roles into **content-bearing** (`content`, `identity`, `image-object`, `link-href`, `text-content`) and **styling-behaviour** (the other 16: `layout`, `color`, `typography`, `scalar-media`, `select-from-enum`, …). | The single test for "is this element content (route it) or a style (lift a scalar)?" Already gates `equivalent_block_for`. |

### `property_suffixes` (123 rows) — the box-CSS router

| Column | Drives | What it does | Why it is the right choice |
|---|---|---|---|
| `css_property` | box-CSS routing (step 3) | Maps a CSS property to the attr suffix that carries it — `background-color → Background`, `border-radius → BorderRadius`, `gap → BlockGap`. | Name-free CSS routing (D194): a property finds its attr by what it *is*, never by a wrapper class name. |
| `role` | layer/validity | The role the property belongs to. | Confirms the destination layer and rejects mis-maps. |
| `kind_override` | type coercion | Forces a value type where the suffix is ambiguous. | Stops a string enum landing in a numeric attr. |

### `modifier_suffixes` (19 rows) — modifier categorisation

| Column | Drives | What it does | Why it is the right choice |
|---|---|---|---|
| `kind` | modifier routing | Categorises a draft modifier: `Active → state`, `Mobile/Tablet/Desktop → breakpoint`, `Primary/Secondary/Tertiary → variant`, `Top/Bottom/Left/Right → side`, `TL/TR/BL/BR → corner`, `Unit → unit`. | A `--mobile` or `--active` or `--primary` is categorised deterministically, so the converter knows whether it picks a breakpoint tier, a state, or a variant. |

### `block_composition` (190 rows) — the structural categorisation

| Column | Drives | What it does | Why it is the right choice |
|---|---|---|---|
| `composition_role` | structural class | `content-block` (171) / `leaf` (16) / `section-root` (2) / `wrapper-shell` (1). | States what kind of node a block is. |
| **`has_inner_blocks`** | element-vs-child gate (step 2) | `1` (18 blocks) = takes InnerBlocks children; `0` (172 blocks) = renders from its own attrs (built-in-element / atomic / array). | The secondary gate on "typed attr vs child block": `0` plus a matching typed attr → route to the attr; `1` → emit a child. |
| `wraps_block` | container-mirror roster | `sgs/container` for every composite that mirrors the container. | Defines the container-wrapping roster the wrapper logic reads. |
| `container_kind` | wrapper capability scope | `section` / `layout` / `content`. | Scopes which wrapper layers a composite exposes. Should be declared in `block.json` (uniform-schema fix), not derived by heuristic. |
| `accepts_allowed_blocks` | nesting validity | Blocks that may nest inside (10 populated). | Validates emitted nesting; future interior-resolution discriminator. |

### `block_selectors` (72 rows) — element → CSS selector

Maps a block's WP-block-selectors elements to selectors (`sgs/hero typography.* → .sgs-hero__headline`). A secondary bridge for typography routing.

### `blocks` (193 rows) — block metadata

`variant_attr` names the variant-selector attr per block; `tier` and `parent_block` feed resolution. `parent_block` (18 pairs) gives forced-parentage for child-token resolution.

### `variant_slots` (8 rows) — variant discrimination

Each variant's discriminating slots, so the converter can detect a block's variant from what the draft contains.

---

## The routing logic — step by step

For each interior draft element, in order:

1. **Identify the slot.** Match the element's BEM class suffix — or, if unclassed, its tag — against `slots.aliases`. Output: one `slot_name`. (`__title` or `<h3>` → `heading`; `__pill-group` → `option-picker`; `__price` → `price`.)

2. **Decide typed-attr vs child-block.**
   - Does the **parent composite** expose a `block_attributes` row where `canonical_slot` = this slot? If yes → route the element's content to that **typed attr** (`<h3>` inside product-card → `productName`).
   - If no — or the parent is an InnerBlocks composite (`has_inner_blocks = 1`) with no matching typed attr → emit the slot's `standalone_block` as a **child block** (`heading → sgs/heading`).
   - `roles.classification = content-bearing` confirms the element is content, not a style.

3. **Route the CSS — per declaration, per breakpoint.** For each declaration (base **and** every `@media`), map `css_property` through `property_suffixes` to the attr suffix, resolve the per-block attr by layer (OUTER / CONTENT / GRID), and place the value at the breakpoint's responsive tier. Typography goes to the *child* block, not the parent; bundled visuals go to a *preset* attr. Exclude `display` / `grid-template-*` from cross-node lifting. Full mechanism + worked examples: **§Responsive CSS routing** below + `STEP-C-LAYOUT-MAPPING-2026-06-10.md`.

4. **Categorise modifiers.** Map each `--modifier` through `modifier_suffixes.kind` — `breakpoint` selects an attr tier, `state` a state style, `variant` the `variant_attr` value.

5. **Flag, never drop.** Any property or element with no destination → an `attribute_gap_candidate`, never silent loss.

The same logic runs at every nesting depth. No per-block branches, no child counting.

---

## Responsive CSS routing — per element, per breakpoint

Routing is not one value per property — it is **one value per property per breakpoint.** Each element carries a base rule plus `@media` overrides; every declaration routes to a destination attr at the matching **responsive tier.**

**Breakpoint → tier.** The draft's `@media` min-width thresholds map to the block's responsive attr tiers:

| Draft rule | Tier | Attr form |
|---|---|---|
| base (no media) | Mobile / unsuffixed base | `paddingTop` (or `paddingTopMobile`) |
| `@media (min-width: 768px)` | Tablet | `+Tablet` → `paddingTopTablet` |
| `@media (min-width: 1024px / 1280px)` | Desktop | `+Desktop` |

Non-standard thresholds (`@600`, `@640`) snap to the nearest tier and are **flagged with the fidelity delta** — e.g. a `@600` 4-col rule firing at 768 on the clone leaves 2 columns from 600–767px: a visual-QA note, never a silent drift. `modifier_suffixes.kind = breakpoint` is the authority for which suffix a tier carries; `block_attributes.is_responsive = 1` confirms the attr has the tier companions.

**Per declaration, the route is:** `css_property` → `property_suffixes.suffix` → the owning block's attr carrying that suffix, at the breakpoint's tier, in the element's layer. Worked example — the hero's `__content` padding across all three breakpoints:

```
.sgs-hero__content  padding:28px 20px 40px   (base)  → contentPaddingTop/Right/Bottom/Left  (Mobile)
                    padding:56px 48px         (@768)  → contentPadding*                       (Tablet)
                    padding:72px 64px         (@1280) → contentPadding*                       (Desktop)
```

**Where each kind of CSS lands — the four destinations:**

1. **Wrapper / box CSS** (padding, margin, max-width, background, border, radius, min-height, gap) → the **container-mirror attrs** on the owning block, by layer (OUTER = the block's own box · CONTENT = `content*` · GRID = `gridTemplateColumns`/`gap`/`gridItem*`), name-free via `property_suffixes` (D194). Every `wraps_block='sgs/container'` block should expose these **by default through the mirror — border, background and radius included.** Where the mirror does not yet expose a property a draft uses (e.g. a card border), that is a **block-completeness fix at the container-mirror** (expose it universally, KIND-scoped, auto-propagated by `/sgs-update`) — *not* a converter gap, and *never* a per-variant hardcode.
2. **Typography** (font-size, weight, colour, line-height, letter-spacing) → the **child SGS block** that renders the text. Composites render their text via child `sgs/heading` / `sgs/text` / `sgs/label` (D192: parent owns structure, child owns typography), so typography routes to the child's own responsive attrs — **not** to per-element typography attrs on the parent. An explicit value is emitted only where it differs from the theme default (FR-22-5.1).
3. **Bundled visual treatments** (card frame, pill appearance) → a **preset attr** where the block uses one: `cardStyle` (info-box), `style` (testimonial), `variant` (notice-banner), `pillStyle` + `pillSize` (option-picker). The preset value selects a render.php bundle; the converter picks the preset whose bundle matches the draft and flags a **preset-miss** (a block-completeness candidate) when none does.
4. **Grid / layout engine CSS** (`display:grid`, `grid-template-columns`, `grid-template-areas`, `min-height`) → the grid attrs per breakpoint (see Grid awareness). `display` / `grid-template-*` are never lifted cross-node as inline (R-22-6).

**The correction this pass forced (2026-06-10).** The first draft of this doc treated *missing per-property attrs* on built-in-element blocks (info-box, testimonial, notice-banner, product-card, option-picker) as a converter gap. Live editor review proved otherwise: those blocks use the **preset + child-block-typography + container-mirror** model above. So the converter routes to the *preset / mirror / child*; any genuine inability to reproduce a draft look is a **block-side fix in the block thread** (expose the property on the container-mirror, or add a preset value), never a converter widening or a hardcoded variant. Two block-side principles fall out, both being handled by the block thread: (a) the container-mirror must share border / background / radius / padding with every block that bakes it in, by default; (b) styling is never hardcoded per-variant — every variant sets its own border/background through the mirror.

---

## Grid awareness — the structural layer (Principle B)

A wrapper's own CSS states its structure. Read it directly:

1. **Is it a grid?** The selector carries `display:grid`. If so, its direct descendants are grid items — clone them in order; do not count them to decide folding.
2. **What are the columns, and what are they?** `grid-template-areas` names them. The hero declares `"media" "content"` (stacked, mobile) and `"content media"` (two-column, desktop). The names match the BEM suffixes `__media` / `__content`, so each descendant maps to its area, and the area name gives its role (`media` → the media slot; `content` → the content slot).
3. **How many, and how big, per breakpoint?** The `@media` rules on the *same selector* give `grid-template-columns` and `min-height` per viewport (hero: one column → two equal columns + `min-height:520px` at desktop). This feeds `gridTemplateColumns`/`+Tablet`/`+Mobile` and `minHeight*`.
4. **Inner wrappers.** Where a section places the grid on a single-child inner wrapper (`.sgs-trust-bar__inner { grid-template-columns: repeat(4,1fr) }`), that wrapper auto-folds and carries the grid CSS up. The same rule covers the hero (grid on the section root) and the products section (grid on `.sgs-products`).

This replaces the `fold_eligible = len(children) == 1` proxy. The grid CSS, not a sibling count, decides what is a grid item.

---

## What this fixes

- **The unclassed `<h3>` → `core/heading` fallback.** Step 1 resolves `<h3>` to the `heading` slot through `slots`; step 2 routes it to the parent's `heading`-slot attr (`productName`) or emits `sgs/heading` (the slot's `standalone_block`) — never `core/heading`.
- **The hero double-nesting (the `fold_eligible` miscount).** Grid awareness reads `display:grid` + `grid-template-areas` on `.sgs-hero` and treats `__content` and `__media` as grid items. `__content` dissolves; `__media` lifts to the media slot. The sibling count never enters the decision.
- **The dropped content padding (H-B).** Once `__content` dissolves, its box CSS routes through `property_suffixes` to `contentPadding*` (the cross-node router already built in Commit 2), instead of stranding on the outer section.
- **Non-uniform draft naming.** `slots.aliases` absorbs naming variance, so a draft need not match block class names exactly.

## One approved extension

Aliases live globally in `slots`. A per-block alias layer would let a composite pin its own element tokens directly (e.g. product-card `__title → productName`) and close the `derived_selector __heading` vs draft `__title` drift. The data model supports adding it as a small per-block alias table or column; route a per-block match ahead of the global alias, traced either way.

---

## Verification — step C (DONE 2026-06-10)

Both drafts (homepage 7 sections + product page 5 sections, header/footer excluded) were stripped to layout hierarchies and mapped layer-by-layer, with every CSS declaration across every breakpoint routed to its destination attr + tier. Full worked mapping: `STEP-C-LAYOUT-MAPPING-2026-06-10.md`. Gap register: `STEP-C-STRESS-TEST-2026-06-10.md`.

**Verdict:** the core routing holds — no rearchitecture. Open work splits into three additive buckets:
- **⚙ Converter rules (G1–G9):** positional-grid-fallback · tag→SGS-slot · typed-attr-beats-`has_inner_blocks` · fold-multi-child-before-content · array-item route · ambiguous-alias tie-break · section-root Step 0 · compound-suffix+modifier · missing `property_suffixes`.
- **➕ DB data:** the homepage + product-page alias gaps, 4 design tokens, modifier-suffixes (`featured`/`trial`/`ghost`/`coming-soon`), `Order`/`Overflow` suffixes, set product-card `variant_attr`.
- **🧱 Block-side (theme thread):** the container-mirror must expose border/background/radius/padding universally; testimonial + notice-banner reworked to the info-box composite shape; product-card editor cleanups (crash, legacy warning, dead controls, hardcoded border); option-picker label controls. Per `STEP-C-BLOCK-FIXES-PROMPT` (sent to the theme thread).
