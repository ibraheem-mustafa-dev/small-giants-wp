---
doc_type: research-report
subject: Pattern Overrides + Block Bindings vs DB-backed _lift_inner_blocks (Phase 3 decision)
date: 2026-05-21
author: Claude (research agent)
sources_verified: 4 primary WP sources + Gutenberg GitHub PR #73889
verdict: DB-backed (keep Phase 3 plan)
---

# Pattern Overrides Research — 2026-05-21

Decision 24 pre-research for Phase 3 of the 2026-05-21 architecture staging doc.

---

## 1. TL;DR Recommendation

**Use DB-backed lookup. Keep the Phase 3 plan.**

Pattern Overrides is a powerful mechanism for operator-facing content customisation inside synced patterns — it is not a converter architecture tool. The two features solve different problems at different layers. Pattern Overrides answers "how can an operator edit a synced pattern's content per-instance without breaking sync?" cv2's `_lift_inner_blocks` answers "how does the converter know, at parse time, which child elements from a mockup become which inner-block types?" These are orthogonal concerns. Pattern Overrides does not eliminate the need for the converter to know the parent→child block shape at emit time. The DB-backed path (blocks.parent_block + slot_synonyms.standalone_block) is the correct replacement for `INNER_BLOCK_PATTERNS`. Pattern Overrides is, however, worth adopting as a complementary operator-UX layer on top of the emitted blocks — not instead of them.

---

## 2. What Pattern Overrides Actually Is

Pattern Overrides is a WordPress feature (stable since 6.6, extended to custom blocks in 7.0) that lets operators edit specific attributes of blocks inside a **synced pattern** on a per-instance basis, without breaking the shared sync of the rest of the pattern.

Plain-English example: you have a synced "Hero Banner" pattern used on 20 pages. The pattern defines the layout, colours, and structure. With Pattern Overrides, each page can override just the button label and URL ("Book Now" → "Apply Now") while every other property stays locked to the pattern definition.

**The mechanism:**

1. Each overridable block inside a pattern is given a `metadata.name` (a unique identifier within the pattern) and its target attributes are bound to `core/pattern-overrides` source in `metadata.bindings`.

2. When the pattern is inserted into a post, WP emits a `wp:block` reference tag with a `content` object carrying the per-instance override values:

```html
<!-- wp:block {"ref":123,"content":{"hero-cta-primary":{"label":"Book Now","url":"/book"}}} /-->
```

3. At render time, WordPress resolves the override values from the `content` attribute and passes them to the block's render callback, replacing the pattern defaults.

**The filter (WP 7.0 new):**

Before WP 7.0, Pattern Overrides only worked on a hardcoded set of core blocks (`core/paragraph`, `core/image`, `core/button`, `core/heading`). In WP 7.0, the `block_bindings_supported_attributes` filter removes that restriction, letting custom blocks opt in:

```php
add_filter(
    'block_bindings_supported_attributes_sgs/button',
    function ( $supported_attributes ) {
        $supported_attributes[] = 'label';
        $supported_attributes[] = 'url';
        return $supported_attributes;
    }
);
```

**`role: content` requirement:**

For a block to be editable (not hidden) inside a `contentOnly` pattern, its content-bearing attributes must declare `"role": "content"` in block.json. This was already covered in Decision 23 of the architecture staging doc.

**Sources:**
- https://make.wordpress.org/core/2026/03/16/pattern-overrides-in-wp-7-0-support-for-custom-blocks/
- https://developer.wordpress.org/block-editor/reference-guides/block-api/block-bindings/
- https://make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/ §4.3
- https://github.com/WordPress/gutenberg/pull/73889

---

## 3. How It Would Work for the Hero CTA Case — and Why It Doesn't Replace cv2

### What the current cv2 emits (correct output)

```html
<!-- wp:sgs/hero {"heading":"Welcome","subheading":"We help you grow"} -->
  <!-- wp:sgs/multi-button -->
    <!-- wp:sgs/button {"label":"Book a Call","url":"/contact","inheritStyle":"primary"} /-->
    <!-- wp:sgs/button {"label":"See Our Work","url":"/portfolio","inheritStyle":"secondary"} /-->
  <!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/hero -->
```

This is **direct attribute emission**: the converter reads the mockup, extracts label + url + modifier class from each `.sgs-button` element, and writes them as block attributes. No runtime source resolution needed. The block renders directly from its serialised attributes.

### What Pattern Overrides would require instead

To use Pattern Overrides, you would need to:

1. **Pre-author a synced pattern** (stored as a `wp_block` CPT post) that defines the hero CTA structure with named overridable slots:

```html
<!-- Pattern definition (wp_block post ID = 123) -->
<!-- wp:sgs/hero {} -->
  <!-- wp:sgs/multi-button -->
    <!-- wp:sgs/button {
      "metadata": {
        "name": "hero-cta-primary",
        "bindings": {
          "label": {"source": "core/pattern-overrides"},
          "url":   {"source": "core/pattern-overrides"}
        }
      },
      "label": "Default Primary CTA",
      "url": ""
    } /-->
    <!-- wp:sgs/button {
      "metadata": {
        "name": "hero-cta-secondary",
        "bindings": {
          "label": {"source": "core/pattern-overrides"},
          "url":   {"source": "core/pattern-overrides"}
        }
      },
      "label": "Default Secondary CTA",
      "url": ""
    } /-->
  <!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/hero -->
```

2. **cv2 would emit a reference** instead of the blocks directly:

```html
<!-- wp:block {
  "ref": 123,
  "content": {
    "hero-cta-primary": {"label": "Book a Call", "url": "/contact"},
    "hero-cta-secondary": {"label": "See Our Work", "url": "/portfolio"}
  }
} /-->
```

3. **At render time**, WordPress looks up the synced pattern (post ID 123), resolves the `content` overrides into the bound attributes, and renders the buttons with the override values.

### Why this does NOT replace the converter logic

The converter still has to:

- Detect that the mockup section contains button child elements
- Know that hero emits a `sgs/multi-button` wrapper with `sgs/button` children
- Extract label, url, and modifier class from each `.sgs-button` element
- Know which named slots to write the extracted values into (`hero-cta-primary`, `hero-cta-secondary`)

The DB-backed lookup (blocks.parent_block + slot_synonyms.standalone_block) is required to answer all four of those questions. Pattern Overrides only changes the **output format** — instead of emitting the blocks inline with their attributes, the converter emits a `wp:block` reference with the values in `content`. The detection and extraction logic is identical in both cases.

Moreover, the Pattern Overrides path introduces a **hard dependency on a pre-authored synced pattern existing in the database** (a specific `wp_block` post ID). If that pattern doesn't exist on the target site, `wp:block {"ref": 123}` renders nothing. The current direct-attribute emit works on any clean WordPress install.

---

## 4. Cost Comparison

| Dimension | Pattern Overrides path | DB-backed path (Phase 3 plan) |
|---|---|---|
| **Implementation hours** | ~4–6 hrs (pattern authoring + PHP filter for every composite block + cv2 emit changes + pattern ID management per target site) | ~1 hr (seed parent_block + standalone_block in DB, rewrite _lift_inner_blocks) |
| **LOC added/changed** | ~150–200 LOC in convert.py, ~50 LOC PHP filter registration, 1 synced pattern per composite block type | ~60–80 LOC in convert.py (retire INNER_BLOCK_PATTERNS dict, add DB lookup), 0 PHP changes |
| **Files affected** | convert.py, a new PHP file for filter registration, block.json updates (role:content on label/url), pattern PHP files or DB seeding script | convert.py only (primary), DB seeding script (Phase 0 already planned) |
| **Operator UX impact** | Better for operators editing recurring patterns (per-instance override UI in editor). Worse for one-off pages (must unlock synced pattern to change CTA count). | No UX change — existing InnerBlocks editing experience. Operators add/remove/reorder buttons via the editor directly. |
| **Runtime overhead** | Adds a DB lookup per rendered pattern instance (`wp_posts` JOIN for pattern post), plus binding resolution in PHP | Zero runtime overhead — all data is in serialised block attributes |
| **Site portability** | Low — `wp:block {"ref": 123}` is site-specific. A pattern export to a fresh site requires the pattern to exist at the same ID. | High — inline block markup is self-contained, works on any install |
| **WP version floor** | Requires WP 7.0+ for custom blocks (pre-7.0 only core blocks supported) | No WP version dependency |

---

## 5. Trade-offs Table

| Dimension | Pattern Overrides | DB-backed _lift_inner_blocks |
|---|---|---|
| **Solves converter detection problem?** | No — converter still must detect and extract; only changes emit format | Yes — DB provides the parent/child mapping the converter needs |
| **Operator editing UX** | Better for synced-pattern workflows (per-instance override without touching block structure) | Standard InnerBlocks editing — fine for one-off page layouts |
| **Site portability** | Poor — ref IDs are site-specific; export/import brittle without pattern slug resolution | Excellent — inline attributes travel with content |
| **Maintenance surface** | Patterns are a second source of truth for block shape (alongside block.json). Changes to sgs/button shape require updating patterns. | Block shape lives in block.json + DB only. One source of truth. |
| **Runtime performance** | Slightly worse — per-render pattern post lookup + binding resolution | No overhead — WP's normal block rendering from serialised attrs |
| **WP 7.0 dependency** | Hard dependency for custom blocks (sgs/button not in pre-7.0 supported list) | None |
| **Handles N-button variance?** | No — synced pattern defines a fixed count of named buttons. If mockup has 3 buttons and pattern has 2, third button is lost. | Yes — loop walks all `.sgs-button` children regardless of count |
| **Handles modifier class variants?** | UNCONFIRMED: unclear whether `inheritStyle` (a non-content structural attr) can be overridden. Likely requires it to be in the supported attributes filter, but Pattern Overrides is primarily designed for content (text/URL), not style variation choices. | Yes — modifier_to_attr already handles `--primary` → `inheritStyle=primary` |
| **Suitable as replacement for INNER_BLOCK_PATTERNS?** | No | Yes |
| **Suitable as complementary operator UX layer?** | Yes — adding `role:content` + filter registration for label/url enables the per-instance override UI for operators in synced patterns (useful for recurring section templates) | N/A |

---

## 6. Migration Impact

### If we kept Pattern Overrides (NOT recommended)

The changes required in convert.py would be:

- `INNER_BLOCK_PATTERNS` would stay in some form but emit `wp:block {"ref": N, "content": {...}}` instead of inline markup
- `_lift_inner_blocks` would need a parallel path: detect and extract as now, but write extracted values into `content` dict keyed by slot name
- A pattern ID resolver would be needed (`resolve_pattern_id(slug, target_site)`) — cv2 would need to know the `wp_block` post ID for each composite pattern on each target site
- A pattern author/seeder script would be needed to create the synced patterns on first deploy to each site
- `wrapper_block` + `wrapper_block_attrs` logic would need to be ported into the `content` key structure

None of this eliminates the INNER_BLOCK_PATTERNS dict — it changes its shape while adding new complexity.

### DB-backed path (recommended)

Changes to convert.py:
- Delete `INNER_BLOCK_PATTERNS` dict (lines 1311–1363)
- Rewrite `_lift_inner_blocks(node, pattern)` signature to `_lift_inner_blocks(node, parent_slug)` — new function queries `blocks.parent_block` + `slot_synonyms.standalone_block` to build the pattern dict at runtime
- Three callsites (lines 3784–3912) that look up `INNER_BLOCK_PATTERNS` get updated to call the new signature

The hero entry from commit `ad706d0d` (lines 1344–1362) is retired and replaced by DB rows:
- `blocks.parent_block` row: `sgs/button` → `sgs/multi-button`
- `slot_synonyms.standalone_block` row: `button` → `sgs/button`

The `wrapper_block` concept maps cleanly to `parent_block`: if a slot's standalone block has a `parent_block`, the adjacent-grouping logic wraps them. No data lost; structure unchanged.

Phase 3 staging doc section to update: §3 Decision 12 remains valid as written. Decision 24 research finding: "Pattern Overrides is orthogonal; DB-backed path is correct. Adopt Pattern Overrides as a future operator-UX layer (role:content + filter registration) separate from Phase 3."

---

## 7. Open Questions (Couldn't Confirm from Public Docs)

1. **UNCONFIRMED: Can `inheritStyle` be overridden via Pattern Overrides?** The `inheritStyle` attribute on sgs/button is not a content attribute (it's a structural style-variant selector). The `block_bindings_supported_attributes` filter can technically add any attribute to the supported list, but it's unclear whether the Pattern Overrides editor UI would surface non-string non-URL attributes meaningfully. If it can, then Pattern Overrides could theoretically handle the modifier-to-attr mapping. The documentation only shows text/URL examples.

2. **UNCONFIRMED: Does Pattern Overrides work for N-variable child counts?** The synced pattern approach requires a fixed named slot count (`hero-cta-primary`, `hero-cta-secondary`). What happens when a mockup has 3 CTAs and the pattern only defines 2 named slots? The documentation does not address variable-count InnerBlocks in the Pattern Overrides context. This is a significant constraint for a converter that must handle arbitrary mockup structures.

3. **UNCONFIRMED: Is `wp:block {"ref": N}` resolvable from a pattern slug (stable identifier) rather than a post ID (site-specific)?** If WP supports `wp:block {"slug": "sgs/hero-cta-template"}` lookup, portability concerns are reduced. The current documented format uses numeric `ref`. GitHub PR #73889 doesn't mention slug-based references.

4. **UNCONFIRMED: Performance overhead of binding resolution at scale.** The documentation confirms that dynamic blocks pass bound values to `render_callback()` and static blocks use the HTML API for replacement. Unclear whether this adds meaningful overhead per block per page render for high-traffic sites, or whether WP caches the resolved pattern post.

5. **CONFIRMED GAP: `core/pattern-overrides` with multi-attribute objects.** The docs confirm binding can be registered for any attribute added to the supported list. However, all examples show scalar values (string label, string url). The sgs/button `boxShadow` attribute is an object. Whether the binding storage in `content` supports nested object values is not documented.

---

## Summary

Pattern Overrides in WP 7.0 is the right answer to the question "how can operators customise a synced pattern per-instance?" It is not the right answer to "how does cv2 know what inner-block shape to emit when it sees a composite block in a mockup?" The two questions are at different layers of the stack. The DB-backed approach (Decision 12 + Decision 24's research finding) is the correct path for Phase 3. Pattern Overrides is worth implementing as a complementary feature for operator UX — specifically, adding `"role": "content"` to sgs/button's `label` and `url` attributes (already required by Decision 23) and registering those attributes via the `block_bindings_supported_attributes` filter — but this is additive to Phase 3, not a replacement for it, and it belongs in Phase 6 (WP 7.0 audits) rather than Phase 3.
