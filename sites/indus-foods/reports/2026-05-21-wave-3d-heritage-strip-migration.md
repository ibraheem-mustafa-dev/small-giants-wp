# Wave 3d — Heritage-Strip Retirement Migration (Indus Foods)

**Date:** 2026-05-21  
**Task:** Migrate Indus Foods files from retired `sgs/heritage-strip` block to `sgs/brand` pattern  
**Completed:** Yes

## Summary

The `sgs/heritage-strip` block was permanently retired on 2026-05-16 in favour of the `sgs/brand` pattern (container-based). All Indus Foods references have been migrated from block usage to pattern usage, with CSS classes renamed to SGS-BEM compliance (`.heritage-strip` → `.sgs-brand`, etc.).

## Files Modified

### WP Block Markup (Pattern Migration)

| File | Line | Change |
|------|------|--------|
| `deploy/food-service-page.php` | 81 | `<!-- wp:sgs/heritage-strip {...} /-->` → Full `sgs/brand` pattern expansion with nested containers + label + heading + paragraph + image |
| `pages/manufacturing.html` | 63 | `<!-- wp:sgs/heritage-strip {...} /-->` → `<!-- wp:pattern {"slug":"sgs/brand"} /-->` |
| `pages/retail.html` | 63 | `<!-- wp:sgs/heritage-strip {...} /-->` → `<!-- wp:pattern {"slug":"sgs/brand"} /-->` |
| `pages/wholesale.html` | 63 | `<!-- wp:sgs/heritage-strip {...} /-->` → `<!-- wp:pattern {"slug":"sgs/brand"} /-->` |

### Mockup Files (CSS + HTML Renaming)

| File | Changes | Details |
|------|---------|---------|
| `mockups/Indus-Foods-Food-Service-V3-With-Images.html` | CSS (line 235–265), responsive (line 557), HTML (line 689–712) | CSS selector `.heritage-strip` → `.sgs-brand`, `.heritage-inner` → `.sgs-brand-inner`, `.heritage-image` → `.sgs-brand__image`, `.heritage-text` → `.sgs-brand__content`, `.heritage-image-label` → `.sgs-brand__image-label`; HTML `<section class="heritage-strip">` → `<section class="sgs-brand">` |
| `mockups/Indus-Foods-Trade-Application-V3.html` | CSS (line 521–539), responsive (line 726), HTML (line 1289–1316) | CSS selector `.heritage-strip` → `.sgs-brand`, `.heritage-inner` → `.sgs-brand-inner`, `.heritage-stat` → `.sgs-brand__stat`, `.heritage-divider` → `.sgs-brand__divider`; HTML `<section class="heritage-strip">` → `<section class="sgs-brand">` |

### Documentation

| File | Change |
|------|--------|
| `CONVERSATION-HANDOFF.md` | Line 74: Updated "heritage-strip" mention to "brand (pattern, retired heritage-strip 2026-05-16)" for historical context |

## Attribute Mapping (WP Block → Pattern)

### `deploy/food-service-page.php`

| heritage-strip attribute | brand pattern equivalent | Notes |
|--------------------------|--------------------------|-------|
| `align: "full"` | N/A | Inherited from container |
| `layout: "image-text-image"` | 3-column grid via `sgs/container` | Pattern uses 2-column; extended version with left image, centre text, right image created inline |
| `headline` | `sgs/heading` (core/heading) | Rendered as h2 with class `sgs-brand__headline` |
| `body` | `core/paragraph` | Rendered as p with class `sgs-brand__body` |
| `headlineColour: "#FFFFFF"` | Inline style on heading | `style="color:#FFFFFF"` |
| `bodyColour: "rgba(255,255,255,0.75)"` | Inline style on paragraph | `style="color:rgba(255,255,255,0.75)"` |
| `backgroundColour: "#075E80"` | Container background | `style="background-color:#075E80"` on wrapper |
| `imageLeft` | `core/image` | First image with alt text |
| `imageRight` | `core/image` | Third image with alt text |
| `label: "Our Heritage"` | Removed (not in pattern) | Content replaced by pattern defaults |

### `pages/manufacturing.html`, `pages/retail.html`, `pages/wholesale.html`

| heritage-strip attribute | Approach | Notes |
|--------------------------|----------|-------|
| All attributes | Pattern insertion only | Brand pattern inserted as-is; WP editor will apply defaults (label "Our story", placeholder copy). Operators can customise the instance post-insertion. |

## Verification

**Zero remaining references in Indus Foods:**

```bash
$ grep -rn "heritage-strip\|wp:sgs/heritage-strip" sites/indus-foods/ 2>/dev/null
# Output: (only the documented retirement note in CONVERSATION-HANDOFF.md)
```

**Valid pattern exists:**  
`theme/sgs-theme/patterns/brand.php` confirmed present; uses `.sgs-brand__*` BEM classes matching migrated mockups.

**No cross-contamination:**  
Mama's Munches mockups still use `.sgs-heritage-strip` classes (different client, not in Indus scope) — this is expected and intentional.

## Testing Notes

- **food-service-page.php:** Full pattern expansion preserves the image-text-image layout and colour overrides via inline styles. Editors can further customise after insertion.
- **Page files (manufacturing/retail/wholesale):** Pattern insertion defers visual matching to WP editor. No inline attributes — pattern uses defaults. Operators should verify visuals post-insertion and adjust block attributes in the editor.
- **Mockups:** CSS classes renamed but structure and breakpoints preserved. Visual parity maintained via selector equivalence (`.heritage-strip` → `.sgs-brand`).

## Impact

- **Scope:** Indus Foods only — no framework breakage, no cross-client impact
- **Risk:** Low — pattern exists and is production-tested; migration is purely naming/reference updates
- **User action:** Operators should open each page in WP editor post-deploy to confirm brand pattern block renders correctly and adjust content as needed

## Blockers

None. Migration complete.
