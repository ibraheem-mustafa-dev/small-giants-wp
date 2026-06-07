---
doc_type: reference
spec_id: 29
spec_version: "1.0"
project: small-giants-wp
title: Container-Equivalent Blocks — How the Built-In Container Works Across Composites
status: current
created: 2026-06-07
authors: Claude Code / Bean
cross_refs:
  - .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md §FR-22-21
  - .claude/plans/2026-06-02-container-wrapper-standardisation.md
  - plugins/sgs-blocks/includes/class-sgs-container-wrapper.php
  - plugins/sgs-blocks/src/blocks/container/components/ContainerWrapperControls.js
---

# Container-Equivalent Blocks — Reference

> **What this doc answers:** "How does the built-in container work across all of these composite blocks, and what are the different purposes and uses for the container-equivalent blocks?"

---

## 1. The Built-In Container Model

`sgs/container` is the canonical wrapper block. It owns the full surface of SGS wrapper capabilities: background (image / video / parallax / ken-burns / SVG / overlay), shape dividers, width/content-width capping, grid/flex layout, gap (responsive), min-height, grid-item defaults, and shadow.

Every SGS composite or layout block that has a built-in outer wrapper **mirrors `sgs/container`** via the shared PHP helper `includes/class-sgs-container-wrapper.php`. There is no per-block reimplementation. The same helper, the same attribute names, the same CSS output.

**What "mirror" means:**
- The composite block's `block.json` carries the same `gap`, `widthMode`, `contentWidth`, `columns`, `backgroundImage`, etc. attributes as `sgs/container` (scoped to the block's KIND — see §2).
- Its `edit.js` renders `<ContainerWrapperControls kind="…" />` from `src/blocks/container/components/ContainerWrapperControls.js` — so the editor panel is literally the same component.
- Its `render.php` calls `SGS_Container_Wrapper::render( $attributes, $block, $inner_html, $kind )` — so the PHP output path is the same function.

**What "mirror" does NOT mean:**
- It is NOT a div-by-div copy of the draft DOM. The wrapper is driven entirely by block attributes — the cloning converter reads the draft's CSS and maps it onto these attributes.
- It is NOT a per-block reimplementation. Adding a new wrapper capability to `sgs/container` and running `/sgs-update` propagates it to all roster blocks automatically via Stage 11.
- It does NOT fix clone fidelity by itself. The block-side mirror is COMPLETE (D167 2026-06-04). Clone fidelity also requires the converter to route to composite blocks (Method-2, pending) rather than always emitting `sgs/container`.

**Auto-propagation:** When `sgs/container` gains a new attr, `/sgs-update` Stage 11 (`sync-container-wrapping-blocks.py --apply`) diffs the KIND-scoped attr set and writes any missing attrs into roster block.json files. Currently report-only pending Bean sign-off; `--apply` writer is wired.

**Gap consolidation (2026-06-07, commit 668e26ad):** The `gap` attribute is now a raw CSS length string (e.g. `"24px"`, `"1.5rem"`) rendered via `sgs_container_gap_value()`. The `blockGap` WP-native support was removed (it was inert). Composite/wrapper blocks no longer carry their own gap control — all use the shared `ContainerWrapperControls` Gap control.

---

## 2. The Three KINDs

Every roster block declares `supports.sgs.containerKind` in its `block.json`. This single value gates:
- Which editor panels `ContainerWrapperControls` renders.
- Which PHP render layers `SGS_Container_Wrapper::render()` emits.

### `section`
**Purpose:** Full-bleed outer page section wrapper. Background runs edge-to-edge. The outer box itself does NOT cap content width — the `contentWidth` attribute adds an inner `sgs-container__inner` wrapper that centres and caps the readable content inside the full-bleed shell.

**When to use:** A block that represents an entire page section — hero, CTA strip, trust-bar row. The block appears at the top level of a page template and its background should span the full viewport width.

**Controls exposed:**
- Layout panel: layout type (stack/flex/grid), columns (responsive), gap (responsive).
- Width panel: widthMode, customWidth, contentWidth, per-viewport overrides.
- Min-height selector.
- Grid-item defaults panel (when layout = grid).
- Background panel: image (responsive), video, animation (ken-burns/parallax), overlay, SVG.
- Shadow panel.
- Shape dividers panel (top and bottom).

### `layout`
**Purpose:** Inner layout wrapper — grid or flex arrangement of child blocks. Has width/contentWidth capping but no background/overlay/SVG/shape layers. Used for blocks that arrange multiple items (cards, gallery images, buttons) in a grid or flex row.

**When to use:** A block whose primary job is arranging its children in a responsive grid or flex layout. The block lives inside a section (which already provides the background), not at the page root.

**Controls exposed:**
- Layout panel: layout type, columns (responsive), gap (responsive).
- Width panel: widthMode, customWidth, contentWidth, per-viewport overrides.

### `content`
**Purpose:** Content-level composite with its own visual chrome (card frame, product box, etc.) that needs a width cap and inner padding, but not a grid engine or background layer.

**When to use:** A block that is a self-contained content unit with its own visual design. It may appear inside a grid (a card-grid cell, a pricing column) and needs to control its own inner width and spacing, but the outer grid/layout is managed by its parent.

**Controls exposed:**
- Width panel: widthMode, customWidth, contentWidth.
- Spacing panel: inner padding.

---

## 3. Excluded Blocks

Two blocks in the codebase wrap `sgs/container` structurally but are **excluded from mirroring** (`supports.sgs.containerMirror: false` in `block.json`):

| Block | Reason for exclusion |
|---|---|
| `sgs/modal` | Outer shell is a `<dialog>` element (WP Interactivity API focus-trap); it is not a layout container and must not emit background/grid/gap layers. |
| `sgs/mobile-nav` | Outer shell is an off-canvas Popover overlay; the container mapping does not apply to fixed-position overlays. |

---

## 4. The Container-Equivalent Roster

The full roster is DB-authoritative. To query it live:

```bash
python plugins/sgs-blocks/scripts/sgs-db.py query \
  "SELECT block_slug, container_kind FROM block_composition WHERE container_kind IS NOT NULL ORDER BY container_kind, block_slug"
```

Or via `/sgs-db`. Do NOT hardcode the count here — query the DB. The counts below reflect D167 (2026-06-04): 4 section / 14 layout / 11 content.

### KIND: `section` (4 blocks)

Full-bleed outer wrappers — background + spacing + width + layout.

| Block | Purpose |
|---|---|
| `sgs/hero` | Page hero section — headline, sub-headline, CTAs, background image/video/SVG. Appears at the top of a page. |
| `sgs/cta-section` | Call-to-action section — headline, supporting text, button group. Full-width coloured or image-backed strip. |
| `sgs/trust-bar` | Horizontal trust/badge row — curated icon-badge items or certification logos. Appears as a full-width section strip. |
| `sgs/content-collection` | WP_Query-driven product/content grid at the section level — owns its own query, renders child `sgs/product-card` via InnerBlocks. |

### KIND: `layout` (14 blocks)

Inner layout wrappers — grid/flex arrangement + width + gap; no background layer.

| Block | Purpose |
|---|---|
| `sgs/card-grid` | Responsive image+content tile grid (overlay or card variants). |
| `sgs/gallery` | Media gallery grid — responsive columns, lightbox-ready. |
| `sgs/post-grid` | Blog post grid — query-driven, filterable. |
| `sgs/accordion` | Expandable FAQ/content panels — vertical stack of `sgs/accordion-item` children. |
| `sgs/tabs` | Tabbed content panels — horizontal tab bar + `sgs/tab` children. |
| `sgs/form` | Multi-step form container — wraps `sgs/form-step` and `sgs/form-field-*` children. |
| `sgs/multi-button` | Button group container — wraps `sgs/button` children in a flex/grid row. Gap is via `ContainerWrapperControls`. |
| `sgs/testimonial-slider` | Carousel of testimonial cards — scroll-snap + Interactivity API. |
| `sgs/google-reviews` | Grid/carousel of Google Business Profile review cards. |
| `sgs/trustpilot-reviews` | Grid/carousel of Trustpilot review cards. |
| `sgs/mega-menu` | Block-based mega menu dropdown panel — wraps any blocks as the nav panel. |
| `sgs/pricing-table` | Pricing plan comparison grid. |
| `sgs/brand-strip` | Horizontal logo carousel/strip. |
| `sgs/timeline` | Date-based timeline — vertical or horizontal, scroll-reveal. |

### KIND: `content` (11 blocks)

Content-level composites — width/contentWidth + inner padding; no grid/bg engine.

| Block | Purpose |
|---|---|
| `sgs/info-box` | Feature/benefit card — icon, heading, description, optional link. |
| `sgs/testimonial` | Single testimonial card — quote, name, role, avatar, star rating. |
| `sgs/product-card` | Dual-mode product card — Typed (InnerBlocks) or Bound (live WooCommerce/CPT). Includes variable-product configurator. |
| `sgs/counter` | Animated number counter with optional animation (counts up on scroll). |
| `sgs/notice-banner` | Inline informational banner — info/success/warning/accent variants. |
| `sgs/icon-list` | Checkmark/icon list — per-item icon with text. |
| `sgs/process-steps` | Horizontal step timeline — numbered or icon-based steps. |
| `sgs/announcement-bar` | Fixed top-of-page announcement strip — countdown, rotation, scheduling. |
| `sgs/whatsapp-cta` | WhatsApp integration — floating button and/or inline CTA. |
| `sgs/decorative-image` | Absolute-positioned decorative floating image — no layout impact. |
| `sgs/media` | Responsive media block — image or video with optional caption and poster. |

---

## 5. Shared Gap Control

Before 2026-06-07, several composite blocks (trust-bar, card-grid, feature-grid, gallery, multi-button, post-grid) had their own per-block gap control backed by spacing-preset slugs. This created divergence: fixing `sgs/container`'s gap behaviour did not fix the composites.

**Consolidation (commit 668e26ad, 2026-06-07):**
- All gap controls removed from individual composite blocks.
- `sgs/container`'s `gap` attribute switched from spacing-preset slug to raw CSS length string (e.g. `"24px"`, `"1.5rem"`).
- `sgs_container_gap_value()` renders the raw value directly.
- `ContainerWrapperControls` exposes a `SpacingControl freeInput` for the gap at desktop/tablet/mobile breakpoints.
- `blockGap` WP-native support removed from `sgs/container` (it was inert — the WP block gap mechanism and SGS's manual gap CSS were in conflict).

All roster blocks with `section` or `layout` KIND inherit this gap control automatically via `ContainerWrapperControls`.

---

## 6. The Shared PHP Helper

`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` — `SGS_Container_Wrapper::render()`.

**Signature:**
```php
SGS_Container_Wrapper::render(
    array  $attributes,   // VERBATIM from render.php — do NOT merge defaults or reorder keys
    $block,               // WP_Block instance
    string $inner_html,   // Already-built interior HTML (InnerBlocks content)
    string $kind,         // 'section' | 'layout' | 'content'
    array  $opts          // Optional: tag, block_class, extra_classes, extra_styles, extra_attrs, extra_attr_html, no_overlay, wrap_inner
): string
```

**Caller pattern (in a composite's `render.php`):**
```php
require_once plugin_dir_path( __FILE__ ) . '../../../includes/class-sgs-container-wrapper.php';

echo SGS_Container_Wrapper::render(
    $attributes,
    $block,
    $content,          // WP-rendered InnerBlocks
    'section',         // or 'layout' or 'content'
    [
        'block_class' => 'sgs-hero',    // composite's own root CSS class
    ]
);
```

**Important constraints:**
- Pass `$attributes` VERBATIM. The responsive CSS uid is `md5( wp_json_encode( $attributes ) . anchor )` — any `array_merge` or key mutation changes the uid and breaks scoped `<style>` selector targeting.
- `get_block_wrapper_attributes()` must be called synchronously within the render pass — the helper handles this internally.
- The helper `require_once`s its own dependencies (`render-helpers.php`, `shape-dividers.php`) so a composite that requires only the helper file does not need to require those separately.

---

## 7. The Shared Editor Component

`plugins/sgs-blocks/src/blocks/container/components/ContainerWrapperControls.js`

**Usage in a composite's `edit.js`:**
```js
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

// Inside the Edit function return:
<>
    <ContainerWrapperControls
        attributes={ attributes }
        setAttributes={ setAttributes }
        kind="section"   // match block_composition.container_kind
    />
    {/* block's own markup */}
</>
```

The `KIND_PANELS` map in the component file defines exactly which sub-panels render per kind:
- `section`: Container/Wrapper (layout + width + min-height), Grid-item defaults, Background, Shadow, Shape Dividers.
- `layout`: Container/Wrapper (layout + width) only.
- `content`: Container/Wrapper (width only) + Spacing (inner padding).

---

## 8. Cross-References

| Topic | Where |
|---|---|
| Canonical wrapper-conversion procedure (6-step) | Spec 22 §FR-22-21 |
| 29-block roster + KIND assignments (live, DB-authoritative) | `python sgs-db.py query "SELECT block_slug, container_kind FROM block_composition WHERE container_kind IS NOT NULL"` |
| Standardisation programme (WS-1 through WS-5) | `.claude/plans/2026-06-02-container-wrapper-standardisation.md` |
| Composite-mirror migration recipe (4-step per block) | Spec 22 §FR-22-21.1 |
| Auto-propagation via `/sgs-update` Stage 11 | Spec 22 §FR-22-21.2 |
| Gap consolidation decision | D167 + commit `668e26ad` (2026-06-07) |
| Excluded blocks (modal, mobile-nav) | `block_composition WHERE containerMirror = false` + `.claude/decisions.md` D167 |
| Shared PHP helper full source | `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` |
| Shared editor component full source | `plugins/sgs-blocks/src/blocks/container/components/ContainerWrapperControls.js` |
