# SGS Button Architecture

**Status:** ✅ SHIPPED 2026-05-04 to sandybrown. Spec'd 2026-05-03. All sections implemented end-to-end. Built blocks: `sgs/button` (87 attrs) + `sgs/multi-button` (container). Built admin: Settings → SGS Button Presets. theme.json mirror landed. Composite block refactors (sgs/hero, sgs/cta-section, sgs/product-card) replaced hand-coded CTAs with InnerBlocks composition + deprecation paths. **Critical correctness fix discovered during deployment:** dynamic blocks with InnerBlocks slots MUST `save: () => <InnerBlocks.Content />` — see B4 in `common-wp-styling-errors.md`. Original spec retained below for reference. Live URL: https://sandybrown-nightingale-600381.hostingersite.com/

> **Session B 2026-05-22 update — Phase 5b button-presets CSS bridge DELETED (commit `60220b13`, Decision 24).** Coverage audit at `.claude/reports/phase-5b-button-property-coverage.md` confirmed WP 6.9+ natively generates 100% of consumed `--wp--custom--button-presets--*` properties from `theme.json.settings.custom.buttonPresets`. The PHP bridge in `class-button-presets-admin.php` was redundant — file deleted. No data migration needed (`wp_options[sgs_button_presets]` did not exist on sandybrown). Operator edits move to **Site Editor → Styles → Buttons** (native theme.json path). The `is-style-primary/secondary/outline` className mechanism stays; only the value source changes from PHP-emitted CSS vars to WP-native theme.json generation. `sgs/button` block + `sgs/multi-button` container behaviour unchanged for operators.
>
> **2026-05-22 update — core/button double-default fix.** `theme/sgs-theme/functions.php` was registering `sgs-accent` block style on `core/button` with `'is_default' => true`. WP core had already set `fill` as default. The conflict produced two `is_default: true` entries in the block-types REST response — operator-confusing and undefined-behaviour for the editor's style picker. Removed the `is_default` flag from `sgs-accent`; `fill` is now the single default. SGS Accent / Ghost / SGS Primary / SGS Secondary remain as chooseable variants. Verified via REST query against sandybrown.
>
> **2026-05-22 update — Phase 1.5 architecture programme.** Block variations + block styles + default-style-via-className for 12 composite blocks added via PHP sibling files at `plugins/sgs-blocks/includes/variations/sgs-<block>-variations.php`. Canonical PHP shape uses `add_filter('get_block_type_variations', ...)` (WP 6.5+) for variations + `register_block_style()` for styles. **sgs/button NOT included in Phase 1.5** — it already had variations via the preset system. If Phase 1.5b retrofit is undertaken, sgs/button gets explicit defaults aligned with the existing primary/secondary/outline preset names.
**Implements:** sgs/button (canonical button block) + sgs/multi-button (container) + button presets settings page + theme.json mirror + refactor of existing CTA-rendering blocks to InnerBlocks composition.
**Replaces:** all uses of `core/button` inside SGS blocks. Hand-coded CTA rendering inside `sgs/hero`, `sgs/cta-section`, `sgs/product-card`, `sgs/feature-grid`.
**Builds on:** competitor research (Spectra, Kadence, GenerateBlocks, Stackable, core/button) — see Section 8 below.

---

## 1. Purpose

Provide a single canonical button block (`sgs/button`) and a flexible container (`sgs/multi-button`) that together replace every CTA implementation in the SGS framework. The pair gives:

- **Full attribute surface** matching or exceeding Spectra/Kadence (87 attributes — see Section 8).
- **Preset binding** so the site owner sets primary/secondary button styling once and every button across the site syncs (filled coral pink + outlined coral on Mama's; client-specific values per style variation).
- **WordPress-native composition** — composite blocks accept buttons via InnerBlocks rather than rendering CTAs internally. One source of truth for button rendering everywhere.

## 2. Why we're not extending `core/button`

The competitor research confirms every serious page-builder ships its own button block (Spectra `uagb/buttons-child`, Kadence `kadence/singlebtn`, Stackable `stackable/button`, GenerateBlocks). Reasons:

| Limit of core/button | Resolved by sgs/button |
|---------------------|----------------------|
| No per-breakpoint typography or padding | `fontSize[Tablet/Mobile]`, `padding[Top/Right/Bottom/Left][Tablet/Mobile]` |
| No hover-state attributes (only base colours) | `colourTextHover`, `colourBackgroundHover`, `colourBorderHover`, `boxShadowHover`, `iconColourHover` |
| No icon support (only text) | `icon` (Lucide name) + `iconPosition` (`before` / `after` / `only`) + `iconGap` + `iconSize[Tablet/Mobile]` |
| No preset binding to site-level defaults | `inheritStyle` (`primary` / `secondary` / `outline` / `custom`) |
| No `download` / `tagName` / `isSubmit` | All exposed |
| Limited transition / shadow controls | `transitionDuration`, `transitionEasing`, `hoverScale`, structured `boxShadow` object |

Extending core/button would require maintaining a Gutenberg fork or fragile filter overrides. Building our own is the path Spectra/Kadence/Stackable all chose.

## 3. The two-block pair

### `sgs/button` (atomic)

Single button. Dynamic block (`render.php` + `save: () => null`). Full attribute surface in Section 8.

### `sgs/multi-button` (container)

Container block. Holds 0..N `sgs/button` instances via InnerBlocks (restricted to children of type `sgs/button` only).

Provides:
- **Layout direction** (`row`, `column`) per breakpoint
- **Gap** (px) per breakpoint
- **Alignment** (`flex-start`, `center`, `flex-end`, `space-between`)
- **Wrap** (`nowrap`, `wrap`) per breakpoint
- **Default template** auto-includes 2 sample buttons when first inserted

Mirrors how `core/buttons` wraps `core/button` instances, but with per-breakpoint controls the core pair lacks.

### Composition pattern in composite blocks

Every block that renders CTAs (`sgs/hero`, `sgs/cta-section`, `sgs/product-card`, `sgs/feature-grid` etc.) exposes an `<InnerBlocks>` slot whose default template is `sgs/multi-button` containing 2 `sgs/button` instances. The user can:

- Delete one button → 1-CTA block
- Delete both buttons → 0-CTA block (text + image only)
- Add a third → 3-CTA block
- Change preset bindings independently per button

No "Match Style" extension — the dropdown lives once on `sgs/button` itself, and every instance everywhere inherits it free.

## 4. Preset binding system

### `inheritStyle` attribute

On every `sgs/button` instance:

```
inheritStyle: 'primary' | 'secondary' | 'outline' | 'custom'
```

When `inheritStyle !== 'custom'`, `render.php` outputs only the variant class (`is-style-primary` etc.) and does **not** emit inline CSS for colour/border. The theme.json variation file drives styling. When `inheritStyle === 'custom'`, all custom attribute values apply.

This is the same pattern Kadence uses (`inheritStyles`) — renamed from our earlier draft `stylePreset` for naming-convention parity.

### Three editing paths — REVISED by Decision 22 (2026-05-21)

> Per `.claude/plans/2026-05-21-architecture-staging.md` §6.3 — Decision 22.

| Path | Audience | UX | Status |
|------|----------|-----|--------|
| **Settings → SGS Button Presets admin page** (was primary) | Site owners | Admin form, ~30 seconds to set up | **DELETED by Decision 22** — see below |
| **Site Editor → Styles → Buttons** (new primary) | Site owners + power users | Native WP UI, live preview, full pseudo-element support in WP 7.0 | **New canonical path** |
| **`sites/<client>/theme-snapshot.json`** | Developers shipping a new client | Code-first, version-controlled, per-site push CLI | **Replaces** `theme/sgs-theme/styles/<client>.json` (retired by Decision 18/19) |

### Decision 22 — Move button presets to native theme.json (WP 7.0)

WP 7.0 (released 2026-05-14) adds native pseudo-element support for `core/button` at theme.json level, making the entire `wp_options.sgs_button_presets` + CSS custom property bridge redundant.

**What changes:**
- DELETE `class-button-presets-admin.php` (settings admin page)
- DELETE `wp_options.sgs_button_presets` (the option key itself, after migration)
- Move button values into `theme.json.styles.elements.button` including WP 7.0 pseudo-element states: `:hover`, `:focus`, `:focus-visible`, `:active`
- Operator edits via Site Editor → Styles → Buttons (native)

**What stays:** The `is-style-primary`, `is-style-secondary`, `is-style-outline` className mechanism is PRESERVED. `render.php` still outputs only the variant class when `inheritStyle !== 'custom'`. What changes is the VALUE SOURCE for those classes — from `wp_options` custom properties to native theme.json CSS generation.

**Critical implementation gate (Phase 5b verification required):**

WP 7.0's native CSS generation from `theme.json.styles.elements.button` produces `--wp--` custom properties equivalent to the bridge. The bridge currently emits:
- `--wp--custom--button-presets--primary--background`
- `--wp--custom--button-presets--primary--text`
- `--wp--custom--button-presets--primary--border`
- `borderWidth`, `borderRadius`, `padding`, `fontSize`, `fontWeight`, `minHeight`
- `:hover` states for background, text, border

**Before deleting the manual bridge**, the Phase 5b implementer MUST verify WP 7.0's generation covers every property listed above, including `minHeight` and per-corner `borderRadius`. If any property is NOT covered by WP 7.0's native generation, keep a SLIM PHP shim that emits ONLY the missing properties from `theme.json` directly. Do not keep the full bridge; only the gap properties.

The original bridge CSS:

```css
.is-style-primary {
  background: var(--wp--custom--button-presets--primary--background);
  color: var(--wp--custom--button-presets--primary--text);
  /* ...etc... */
}
```

**Is replaced by theme.json native:**

```jsonc
{
  "styles": {
    "elements": {
      "button": {
        "color": { "background": "var(--wp--preset--color--primary)", "text": "..." },
        ":hover": { "color": { "background": "var(--wp--preset--color--text)" } },
        ":focus": { "outline": "2px solid var(--wp--preset--color--primary)" }
      }
    }
  }
}
```

### Preset shape

Each preset (primary, secondary) carries the full set of per-state attributes:

```jsonc
{
  "primary": {
    "background": "var(--wp--preset--color--primary)",
    "text": "var(--wp--preset--color--text)",
    "border": "var(--wp--preset--color--primary)",
    "borderWidth": 2,
    "borderRadius": 10,
    "padding": [14, 24, 14, 24],
    "fontSize": 15,
    "fontWeight": 600,
    "minHeight": 48,
    ":hover": {
      "background": "var(--wp--preset--color--text)",
      "text": "var(--wp--preset--color--text-inverse)",
      "border": "var(--wp--preset--color--text)"
    }
  },
  "secondary": { /* outline variant */ }
}
```

For Mama's: primary = coral-pink-filled-with-charcoal-text mockup `.btn-primary`, secondary = transparent-with-pink-border-and-charcoal-text mockup `.btn-secondary`. Hover for both = invert (charcoal bg + cream text).

## 5. Refactor strategy for existing CTA-rendering blocks

### Affected blocks
- `sgs/hero` — currently has `ctaPrimary*` and `ctaSecondary*` attributes (text/url/style/colour/...). Total 16 CTA attributes.
- `sgs/cta-section` — similar internal CTA rendering.
- `sgs/product-card` — 1 CTA per card (`ctaText`, `ctaUrl`).
- `sgs/feature-grid` — when built, will have per-card CTAs.

### Migration shape

For each affected block:

1. **Add InnerBlocks slot** with default template `[['sgs/multi-button', {}, [['sgs/button', { inheritStyle: 'primary', label: '...' }], ['sgs/button', { inheritStyle: 'secondary', label: '...' }]]]]`.
2. **Mark old CTA attributes deprecated** in block.json — keep them in the schema so existing posts don't lose data on save.
3. **Add `deprecated.js` v1** with `save: () => null` and a `migrate()` function that:
   - Reads the deprecated `ctaPrimary*` attributes
   - Constructs equivalent `sgs/button` block instances inside an `sgs/multi-button` parent
   - Returns `[newAttributes, [newInnerBlocks]]`
4. **Update render.php** to render from InnerBlocks output when present, falling back to deprecated attrs only if InnerBlocks is empty (transition period only — eventually remove).

### Why the deprecation path matters

Without `deprecated.js`, existing post_content with old CTA attributes will trigger "block contains unexpected content" errors on every editor open. The deprecation path silently migrates old content to the new structure on first edit, preserving every post.

## 6. Build phases

| Phase | Component | Time | Dependencies | Status |
|-------|-----------|------|--------------|--------|
| P1.A | Build `sgs/button` block (block.json + edit.js + render.php + style.css) | 2–3h | None — independent | SHIPPED 2026-05-04 |
| P1.B | Build `sgs/multi-button` block (container restricted to sgs/button children) | 2–3h | None — independent | SHIPPED 2026-05-04 |
| P1.C | Build button-presets settings page (`class-button-presets-admin.php`) | 1–1.5h | None — independent | SHIPPED 2026-05-04 — **PENDING DELETION by Decision 22 in Phase 5b** |
| P2 | theme.json mirror — emit CSS custom properties from preset values | 30min | Needs P1.C complete | SHIPPED 2026-05-04 — **SUPERSEDED by native WP 7.0 theme.json in Phase 5b** |
| P3 | Refactor sgs/hero, sgs/cta-section, sgs/product-card to InnerBlocks composition + deprecation paths | 3–4h | Needs P1.A + P1.B complete | SHIPPED 2026-05-04 |
| P4 | Build + deploy + visual diff vs mockup | 1h | Needs P1+P2+P3 complete | SHIPPED 2026-05-04 |
| P5 (new) | Decision 22 — Move values to theme.json native; delete admin page + wp_options bridge; verify WP 7.0 coverage gate | ~45min | Phase 5b of architecture-staging.md | PENDING |
| **Total** | | **~10–13h shipped + ~45min pending** | | |

## 7. Parking items related to button architecture

- **P-2 (mistakes)** — Don't mix preset-driven rendering with custom attribute rendering. When `inheritStyle !== 'custom'`, `render.php` must NOT emit inline styles for colour/border — it relies entirely on the theme.json-mirrored CSS variables. Mixing leads to the famous "I changed the preset but this button didn't update" bug.
- **P-6 (parking)** — Image controls extension needed for icon-bearing buttons that may want object-position on the icon SVG.
- **P-7 (parking)** — Audit for sgs/icon vs sgs/icon-block duplicate; the SGS Icon used inside `sgs/button` should be the canonical one.
- **P-9 (parking)** — Recogniser v2 generalisation depends on this button architecture landing first; the recogniser will emit `<!-- wp:sgs/multi-button --><!-- wp:sgs/button --><!-- /wp:sgs/button --><!-- /wp:sgs/multi-button -->` markup for any CTA pattern detected in the mockup.

## 8. Competitor research + final attribute spec

The remainder of this document is the verbatim competitor-research output written by a Sonnet subagent on 2026-05-02. Sources are primary-source GitHub (block.json / attributes.js) for Spectra, Kadence, Stackable, core/button. GenerateBlocks consulted via official docs only.

The matrix categorises every attribute we considered, marks which competitors expose it, identifies 10 gaps in our draft plan, flags 2 over-engineering items, and produces the final 87-attribute `block.json` skeleton.

---

---

## 1. Comparison Matrix

Sources:
- **Spectra** — `brainstormforce/wp-spectra` → `src/blocks/buttons-child/attributes.js` (commit HEAD)
- **Kadence** — `stellarwp/kadence-blocks` → `src/blocks/singlebtn/block.json` (commit HEAD)
- **GenerateBlocks free** — `tomusborne/generateblocks` (repo not public on GitHub); used official docs at `docs.generateblocks.com`
- **GenerateBlocks Pro** — docs only; no public source
- **Stackable** — `gambitph/Stackable` → `src/block/button/schema.js` + `src/block-components/{button,link,icon,transform,effects-animations}/attributes.js`
- **core/button** — `WordPress/gutenberg` → `packages/block-library/src/button/block.json`

Legend: ✅ = full implementation | ⚠️ = partial / limited | ❌ = absent

### Category: Content

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Label text | ✅ html type | ✅ | ✅ | ✅ | ✅ | ✅ rich-text | ✅ |
| URL | ✅ `link` | ✅ `link` | ✅ | ✅ | ✅ | ✅ `url` | ✅ |
| Link target (`_blank` etc.) | ✅ `target` | ✅ `target` | ✅ | ✅ | ✅ | ✅ `linkTarget` | ✅ |
| `rel` (nofollow) | ✅ `noFollow` bool | ✅ `noFollow`, `sponsored`, `download` bools | ✅ | ✅ | ✅ | ✅ `rel` string | ✅ rel string |
| `download` attribute | ❌ | ✅ `download` bool | ✅ | ✅ | ❌ | ❌ | ❌ |
| `sponsored` rel | ❌ | ✅ `sponsored` bool | ❌ | ❌ | ❌ | ❌ | ❌ |
| `title` / tooltip | ❌ | ✅ `tooltip` + `tooltipPlacement` | ❌ | ❌ | ❌ | ✅ `title` | ❌ |
| tagName (`a` vs `button`) | ❌ | ✅ `buttonRole` bool | ✅ explicit | ✅ | ❌ | ✅ `tagName` enum | ❌ |
| `isSubmit` (form submit) | ❌ | ✅ `isSubmit` | ❌ | ❌ | ❌ | ✅ `type` | ❌ |
| `hideLink` (visual only) | ❌ | ✅ `hideLink` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `aria-label` override | ❌ | ✅ `label` string | ✅ | ✅ | ❌ | ❌ | ✅ |
| Anchor / HTML ID | ✅ via supports | ✅ `anchor` | ✅ | ✅ | ✅ `anchorId` | ✅ via supports | ✅ |

### Category: Style Preset / Variations

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Named preset binding | ✅ `buttonType` (`primary`) | ✅ `inheritStyles` (`fill`/`outline`/`theme-base`/`theme-secondary`) | ❌ | ❌ | ⚠️ via theme.json | ✅ Fill / Outline styles | ✅ `stylePreset` |
| Inherit from theme toggle | ✅ `inheritFromTheme` | ✅ implied by `inheritStyles` | ❌ | ❌ | ✅ theme.json | ❌ | ✅ (when stylePreset ≠ off) |
| Size preset | ❌ | ✅ `sizePreset` (`standard`, etc.) | ❌ | ❌ | ❌ | ❌ | ❌ |

### Category: Layout

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Width: fit / auto | ✅ | ✅ `widthType: auto` | ✅ | ✅ | ✅ | ⚠️ via supports | ✅ `width: fit` |
| Width: full | ✅ | ✅ `widthType: full` | ✅ | ✅ | ✅ `fullWidth` | ✅ via dimensions support | ✅ `width: full` |
| Width: custom px/% | ✅ (inline padding drives this) | ✅ `width` array [d/t/m] + `widthUnit` | ✅ | ✅ | ✅ `width` stkResponsive | ✅ % via dimensions support | ✅ `customWidth` |
| Min-height | ❌ | ❌ | ✅ | ✅ | ✅ `minHeight` stkResponsive | ❌ | ❌ |
| Text alignment within button | ❌ | ❌ | ❌ | ❌ | ✅ `contentAlign` stkResponsive | ✅ typography.textAlign | ❌ |
| Stack-on-mobile (parent) | ✅ `stack` on parent | ✅ via parent orientation | ❌ | ❌ | ❌ | ❌ | n/a (parent concern) |

### Category: Typography

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Font family | ✅ `fontFamily` + Google Fonts | ✅ `typography.family` + Google | ✅ | ✅ | ✅ | ✅ `__experimentalFontFamily` | ✅ theme preset |
| Font size + unit | ✅ `size`/`sizeType` [d/t/m] | ✅ `typography.size[d,t,m]` + `sizeType` | ✅ | ✅ | ✅ stkResponsive | ✅ `fontSize` | ✅ |
| Font weight | ✅ `fontWeight` | ✅ `typography.weight` | ✅ | ✅ | ✅ | ✅ `__experimentalFontWeight` | ✅ |
| Font style (italic) | ✅ `fontStyle` | ✅ `typography.style` | ✅ | ✅ | ✅ | ✅ `__experimentalFontStyle` | ❌ |
| Text transform | ✅ `transform` | ✅ `typography.textTransform` | ✅ | ✅ | ✅ | ✅ `__experimentalTextTransform` | ✅ |
| Text decoration | ✅ `decoration` | ✅ `textUnderline` | ✅ | ✅ | ✅ | ✅ `__experimentalTextDecoration` | ❌ |
| Letter spacing [d/t/m] | ✅ `letterSpacing` [d/t/m] + unit | ✅ `typography.letterSpacing[d,t,m]` | ✅ | ✅ | ✅ | ✅ `__experimentalLetterSpacing` | ✅ base only |
| Line height [d/t/m] | ✅ `lineHeight` [d/t/m] + unit | ✅ `typography.lineHeight[d,t,m]` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Text gradient | ❌ | ✅ `textGradient` + `textBackgroundType` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Per-breakpoint font size | ✅ [d/t/m] | ✅ [d/t/m] | ✅ | ✅ | ✅ stkResponsive | ❌ | ❌ |

### Category: Colour

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Text colour (base) | ✅ `color` | ✅ `color` | ✅ | ✅ | ✅ (via Typography) | ✅ `textColor` | ✅ |
| Text colour (hover) | ✅ `hColor` | ✅ `colorHover` | ✅ | ✅ | ✅ stkHover | ❌ | ✅ |
| Background colour (base) | ✅ `background` | ✅ `background` | ✅ | ✅ | ✅ `backgroundColor` | ✅ `backgroundColor` | ✅ |
| Background colour (hover) | ✅ `hBackground` | ✅ `backgroundHover` | ✅ | ✅ | ✅ stkHover | ❌ | ✅ |
| Background gradient (base) | ✅ `gradientValue`/`gradientColor1/2` | ✅ `gradient` + `backgroundType` | ✅ | ✅ | ✅ `backgroundColorType` | ✅ `gradient` | ❌ |
| Background gradient (hover) | ✅ `hovergradientValue` etc. | ✅ `gradientHover` + `backgroundHoverType` | ✅ | ✅ | ✅ stkHover | ❌ | ❌ |
| Transparent-header colour variant | ❌ | ✅ `colorTransparent`, `backgroundTransparent` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sticky-header colour variant | ❌ | ✅ `colorSticky`, `backgroundSticky` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Text colour (active/focus) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (planned but unique) |
| Background (active/focus) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (planned but unique) |

### Category: Border

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Border style (solid/dashed/dotted) | ✅ `borderStyle` | ✅ per-side via `borderStyle[top/right/bottom/left][2]` | ✅ | ✅ | ✅ via addBorderAttributes | ✅ `__experimentalBorder` | ✅ |
| Border width (uniform) | ✅ `borderWidth` | ✅ per-side array | ✅ | ✅ | ✅ | ✅ | ✅ |
| Border width (per-side) | ⚠️ uniform only | ✅ per-side [d/t/m] + hover | ✅ | ✅ | ✅ | ❌ | ✅ |
| Border colour (base) | ✅ `borderColor` | ✅ per-side colour in array | ✅ | ✅ | ✅ | ✅ | ✅ |
| Border colour (hover) | ✅ `borderHColor` | ✅ `borderHoverStyle` | ✅ | ✅ | ✅ | ❌ | ✅ |
| Border radius (uniform) | ✅ `borderRadius` | ✅ `borderRadius[4]` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Border radius (per-corner) | ❌ (via ...borderAttributes spread — per-corner available) | ✅ `borderRadius[4]` per-corner [d/t/m] | ✅ | ✅ | ✅ | ✅ | ✅ |
| Border radius on hover | ❌ | ✅ `borderHoverRadius[4]` [d/t/m] | ❌ | ✅ | ❌ | ❌ | ❌ |
| Border per-breakpoint | ⚠️ | ✅ `tabletBorderStyle` / `mobileBorderStyle` | ✅ | ✅ | ⚠️ | ❌ | ❌ |

### Category: Spacing

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Padding per-side [d/t/m] | ✅ `top/right/bottom/leftPadding` [d/t/m] | ✅ `padding`/`tabletPadding`/`mobilePadding` arrays | ✅ | ✅ | ✅ `padding` stkResponsive | ⚠️ h/v only | ✅ |
| Padding unit (px/em/rem/%) | ✅ `paddingUnit` [d/t/m] | ✅ `paddingUnit` | ✅ (px/em/%) | ✅ | ✅ | px only | ✅ (px/em/rem) |
| Margin per-side [d/t/m] | ✅ `top/right/bottom/leftMargin` [d/t/m] | ✅ `margin`/`tabletMargin`/`mobileMargin` arrays | ✅ | ✅ | ✅ `marginBottom` | ❌ | ❌ |
| Margin unit | ✅ `marginType` | ✅ `marginUnit` | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gap (icon-to-text) | ✅ `iconSpace` [d/t/m] | ✅ `gap` array [d/t/m] | ✅ | ✅ | ✅ `iconGap` | ❌ | ✅ `iconGap` |

### Category: Effects

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Box shadow (base) — h/v/blur/spread/colour/inset | ✅ full 6-param | ✅ full 6-param object + opacity | ❌ | ✅ | ✅ via addBorderAttributes | ✅ `shadow` support | ✅ preset or custom |
| Box shadow (hover) | ✅ full 6-param | ✅ full 6-param `shadowHover` | ❌ | ✅ | ✅ stkHover | ❌ | ✅ |
| Hover scale transform | ❌ | ❌ | ❌ | ✅ via Transform | ✅ `transform` stkHover/stkResponsive | ❌ | ✅ `hoverScale` |
| Transition duration | ❌ | ❌ | ❌ | ✅ | ✅ `transitionDuration` | ❌ | ✅ |
| Transition easing function | ❌ | ❌ | ❌ | ✅ | ✅ `transitionFunction` | ❌ | ✅ |
| Transform origin | ❌ | ❌ | ❌ | ✅ | ✅ `transformOrigin` | ❌ | ❌ |
| CSS filter (blur/brightness etc.) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Scroll animation / entrance | ❌ | ✅ `ktanimate` support (premium) | ❌ | ✅ | ✅ `effectEntrance` | ❌ | ❌ |
| Opacity | ❌ | ❌ | ❌ | ✅ | ✅ `iconOpacity` | ❌ | ❌ |

### Category: Icon

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Icon (SVG name/code) | ✅ `icon` (FA/Spectra lib) | ✅ `icon` (Kadence lib) | ✅ SVG HTML | ✅ SVG HTML | ✅ `icon` SVG | ❌ | ✅ `icon` Lucide name |
| Icon position (before/after) | ✅ `iconPosition` | ✅ `iconSide` | ✅ | ✅ | ✅ `iconPosition` | ❌ | ✅ |
| Icon-only mode (removeText) | ✅ `removeText` bool | ✅ `onlyIcon[d,t,m]` array | ❌ | ❌ | ❌ | ❌ | ✅ `iconPosition: only` |
| Text-only (hide icon on breakpoint) | ❌ | ✅ `onlyText[d,t]` array | ❌ | ❌ | ❌ | ❌ | ❌ |
| Icon size [d/t/m] | ✅ `iconSize` [d/t/m] | ✅ `iconSize[d,t,m]` array | ✅ | ✅ | ✅ | ❌ | ✅ |
| Icon colour (base) | ✅ `iconColor` | ✅ `iconColor` | ✅ | ✅ | ✅ `iconColor1` | ❌ | ✅ |
| Icon colour (hover) | ✅ `iconHColor` | ✅ `iconColorHover` | ✅ | ✅ | ✅ stkHover | ❌ | ✅ |
| Icon gap from text | ✅ `iconSpace` [d/t/m] | ✅ `iconPadding[4]` [d/t/m] | ✅ | ✅ | ✅ `iconGap` | ❌ | ✅ `iconGap` |
| Icon rotation | ❌ | ❌ | ❌ | ❌ | ✅ `iconRotation` stkHover | ❌ | ❌ |
| Icon hover animation (`iconReveal`) | ❌ | ✅ `iconReveal` bool | ❌ | ❌ | ❌ | ❌ | ❌ |
| Icon title (for `<title>` SVG a11y) | ❌ | ✅ `iconTitle` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Shape/background behind icon | ❌ | ❌ | ❌ | ❌ | ✅ `shapeColor1`, `shapeBorderRadius`, `shapePadding` | ❌ | ❌ |

### Category: Accessibility

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| `aria-label` override | ❌ | ✅ `label` | ✅ custom attrs | ✅ | ❌ | ❌ | ✅ |
| Custom `data-*` / `aria-*` attributes | ❌ | ❌ | ✅ | ✅ | ✅ `CustomAttributes` | ❌ | ❌ |
| Focus ring colour | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (unique) |
| `role` override | ❌ | ✅ `buttonRole` (forces `role="button"`) | ✅ | ✅ | ❌ | ❌ | ❌ |

### Category: Advanced

| Attribute | Spectra | Kadence | GB Free | GB Pro | Stackable | core | sgs/button (planned) |
|---|---|---|---|---|---|---|---|
| Custom CSS class | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HTML anchor / ID | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Conditional visibility (device) | ❌ | ✅ (premium) | ✅ (hide on d/t/m) | ✅ | ✅ `displayCondition` | ❌ | ❌ |
| Block defaults save/restore | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Copy/paste styles (UAGCopyPaste) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dynamic data | ❌ | ✅ `ktdynamic` | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 2. Gaps in Our Planned List

Attributes that 2+ competitors have which are absent from our draft plan.

| Gap | Competitors with it | Recommended action |
|---|---|---|
| **Line height** — `lineHeight` with unit, [d/t/m] | Spectra ✅, Kadence ✅, GB ✅, Stackable ✅ | **Add** — `lineHeight` (number, px/em/rem unit, per-breakpoint). Omitting it makes typography feel incomplete compared to Kadence/Spectra. |
| **Font style (italic)** — `fontStyle: normal/italic/oblique` | Spectra ✅, Kadence ✅, GB ✅, Stackable ✅, core ✅ | **Add** — simple string attribute, trivial CSS. 5 of 6 competitors have it. |
| **Text decoration** — underline/overline/none | Spectra ✅, Kadence ✅, GB ✅, Stackable ✅, core ✅ | **Add** — `textDecoration` string. Low effort, high parity. |
| **Letter spacing per-breakpoint** — currently we plan base only | Spectra ✅ [d/t/m], Kadence ✅ [d/t/m], GB ✅ | **Add** — `letterSpacingTablet`, `letterSpacingMobile` with shared unit. |
| **Per-breakpoint font size** — currently we plan base only | Spectra ✅ [d/t/m], Kadence ✅ [d/t/m], GB ✅, Stackable ✅ | **Add** — `fontSizeTablet`, `fontSizeMobile`. Consistent with all other SGS blocks that already follow this pattern. |
| **Margin per-side [d/t/m]** — we plan padding but not margin | Spectra ✅ [d/t/m], Kadence ✅ [d/t/m], GB ✅, Stackable ✅ | **Add** — `marginTop/Right/Bottom/Left` [d/t/m] + unit. Without it we can't space buttons inside composite blocks without wrapper hacks. |
| **Box shadow base + hover (full 6-param)** — we plan "preset or custom" but the data model is unclear | Spectra ✅, Kadence ✅ (object with opacity), GB Pro ✅, Stackable ✅, core ✅ | **Clarify** — spec should define `boxShadow` as a structured object (`{ color, hOffset, vOffset, blur, spread, inset }`) not a free string. Add separate `boxShadowHover` object. |
| **`download` attribute** | Kadence ✅, GB ✅ | **Add** — `download: boolean`. Single attribute. Needed for downloadable file CTAs which any B2B client (e.g. product spec PDFs) will need. |
| **`tagName` (a vs button element)** | Kadence ✅, GB ✅, core ✅ | **Add** — `tagName: 'a' | 'button'`. Required for form submit buttons (`sgs/cta-section` with inline form). Without it, every submit button must use core/button. |
| **Icon title** (SVG `<title>` for screen readers) | Kadence ✅ `iconTitle` | **Add** — `iconTitle: string`. Low effort. When `iconPosition: 'only'`, the SVG `<title>` is the only accessible name without an aria-label. This is distinct from our `ariaLabel`. |

---

## 3. Over-Engineering Check

Attributes we're planning that no competitor has (or that are unique to our spec).

| Attribute | Our plan | Verdict |
|---|---|---|
| **`stylePreset: 'off' | 'primary' | 'secondary'`** | Bind to theme.json variation colours | **Keep** — Kadence's `inheritStyles` does the same thing. Spectra's `inheritFromTheme` does the same thing. This is a pattern, not over-engineering. Rename to `inheritStyle` to match Kadence's naming convention for clarity. |
| **`focusRingColour`** | Custom focus ring colour | **Keep but defer** — No competitor exposes this. However it's an accessibility differentiator. It's one CSS property (`outline-color`). Add it to the spec but mark it as P2 so it doesn't block the initial build. |
| **`hoverEasing` (transition easing)** | CSS `transition-timing-function` | **Keep** — GB Pro and Stackable both have it. Not over-engineering. |
| **`transitionDuration`** | CSS transition duration | **Keep** — GB Pro and Stackable both have it. |
| **`hoverScale`** | CSS scale transform on hover | **Keep** — GB Pro and Stackable have it. Required by the SGS Phase 3 hover-controls spec already in CLAUDE.md. |
| **`focusRingColour` as a separate attribute** | Distinct from text/bg hover | **Rethink** — store as part of a `colours.focus` sub-object rather than a flat attribute. Keeps the colour model consistent. |
| **Active state colours (`colourActive`)** | Background/text on `:active` | **Keep at P2** — none of the competitors have explicit `:active` state controls. It is genuinely different. It's a small add and useful for form-submit feedback. Mark P2. |

---

## 4. Final sgs/button Spec — block.json `attributes` Skeleton

```jsonc
{
  // --- Content ---
  "label": { "type": "string", "default": "Click Here" },
  "url": { "type": "string", "default": "" },
  "linkTarget": { "type": "string", "default": "_self" },        // _self | _blank | _parent | _top
  "rel": { "type": "string", "default": "" },                    // nofollow, sponsored, noopener etc. as space-sep string
  "download": { "type": "boolean", "default": false },
  "tagName": { "type": "string", "default": "a" },               // "a" | "button"
  "isSubmit": { "type": "boolean", "default": false },           // only active when tagName === "button"

  // --- Style Preset ---
  // When inheritStyle !== 'custom', colour/border/radius attrs are ignored — theme preset drives them
  "inheritStyle": { "type": "string", "default": "primary" },    // "primary" | "secondary" | "outline" | "custom"

  // --- Layout ---
  "widthType": { "type": "string", "default": "fit" },           // "fit" | "full" | "custom"
  "customWidth": { "type": "number", "default": null },
  "customWidthUnit": { "type": "string", "default": "px" },      // "px" | "%"
  "minHeight": { "type": "number", "default": null },            // px — for enforced touch target height
  "minHeightUnit": { "type": "string", "default": "px" },

  // --- Padding (per-side, per-breakpoint) ---
  "paddingTop": { "type": "number", "default": null },
  "paddingRight": { "type": "number", "default": null },
  "paddingBottom": { "type": "number", "default": null },
  "paddingLeft": { "type": "number", "default": null },
  "paddingTopTablet": { "type": "number", "default": null },
  "paddingRightTablet": { "type": "number", "default": null },
  "paddingBottomTablet": { "type": "number", "default": null },
  "paddingLeftTablet": { "type": "number", "default": null },
  "paddingTopMobile": { "type": "number", "default": null },
  "paddingRightMobile": { "type": "number", "default": null },
  "paddingBottomMobile": { "type": "number", "default": null },
  "paddingLeftMobile": { "type": "number", "default": null },
  "paddingUnit": { "type": "string", "default": "px" },          // shared unit for all padding breakpoints

  // --- Margin (per-side, per-breakpoint) ---
  "marginTop": { "type": "number", "default": null },
  "marginRight": { "type": "number", "default": null },
  "marginBottom": { "type": "number", "default": null },
  "marginLeft": { "type": "number", "default": null },
  "marginTopTablet": { "type": "number", "default": null },
  "marginRightTablet": { "type": "number", "default": null },
  "marginBottomTablet": { "type": "number", "default": null },
  "marginLeftTablet": { "type": "number", "default": null },
  "marginTopMobile": { "type": "number", "default": null },
  "marginRightMobile": { "type": "number", "default": null },
  "marginBottomMobile": { "type": "number", "default": null },
  "marginLeftMobile": { "type": "number", "default": null },
  "marginUnit": { "type": "string", "default": "px" },

  // --- Typography (base + per-breakpoint) ---
  "fontFamily": { "type": "string", "default": "" },             // theme.json preset slug or empty (inherit)
  "fontWeight": { "type": "string", "default": "" },             // "400" | "500" | "600" | "700" | ""
  "fontStyle": { "type": "string", "default": "normal" },        // "normal" | "italic" | "oblique"
  "textTransform": { "type": "string", "default": "" },          // "none" | "uppercase" | "lowercase" | "capitalize"
  "textDecoration": { "type": "string", "default": "" },         // "none" | "underline" | "overline" | "line-through"
  "fontSize": { "type": "number", "default": null },
  "fontSizeTablet": { "type": "number", "default": null },
  "fontSizeMobile": { "type": "number", "default": null },
  "fontSizeUnit": { "type": "string", "default": "px" },         // "px" | "em" | "rem"
  "lineHeight": { "type": "number", "default": null },
  "lineHeightTablet": { "type": "number", "default": null },
  "lineHeightMobile": { "type": "number", "default": null },
  "lineHeightUnit": { "type": "string", "default": "em" },
  "letterSpacing": { "type": "number", "default": null },
  "letterSpacingTablet": { "type": "number", "default": null },
  "letterSpacingMobile": { "type": "number", "default": null },
  "letterSpacingUnit": { "type": "string", "default": "px" },

  // --- Colours (base + hover; active/focus are P2) ---
  "colourText": { "type": "string", "default": "" },             // palette slug or hex
  "colourTextHover": { "type": "string", "default": "" },
  "colourBackground": { "type": "string", "default": "" },
  "colourBackgroundHover": { "type": "string", "default": "" },
  "colourBorder": { "type": "string", "default": "" },
  "colourBorderHover": { "type": "string", "default": "" },
  // P2 — active state colours (no competitor has, but useful for form submit feedback)
  // "colourTextActive": { "type": "string", "default": "" },
  // "colourBackgroundActive": { "type": "string", "default": "" },

  // --- Border ---
  // Style: per-side stored as a uniform string — individual override is editor-only concern
  "borderStyle": { "type": "string", "default": "solid" },       // "solid" | "dashed" | "dotted" | "none"
  "borderWidthTop": { "type": "number", "default": null },
  "borderWidthRight": { "type": "number", "default": null },
  "borderWidthBottom": { "type": "number", "default": null },
  "borderWidthLeft": { "type": "number", "default": null },
  "borderWidthUnit": { "type": "string", "default": "px" },
  // Radius: 4 corners, px
  "borderRadiusTL": { "type": "number", "default": null },        // top-left
  "borderRadiusTR": { "type": "number", "default": null },        // top-right
  "borderRadiusBR": { "type": "number", "default": null },        // bottom-right
  "borderRadiusBL": { "type": "number", "default": null },        // bottom-left
  "borderRadiusTabletTL": { "type": "number", "default": null },
  "borderRadiusTabletTR": { "type": "number", "default": null },
  "borderRadiusTabletBR": { "type": "number", "default": null },
  "borderRadiusTabletBL": { "type": "number", "default": null },
  "borderRadiusMobileTL": { "type": "number", "default": null },
  "borderRadiusMobileTR": { "type": "number", "default": null },
  "borderRadiusMobileBR": { "type": "number", "default": null },
  "borderRadiusMobileBL": { "type": "number", "default": null },
  "borderRadiusUnit": { "type": "string", "default": "px" },

  // --- Box Shadow (base + hover) ---
  // Stored as structured objects — NOT free CSS strings — so the editor can render a UI
  "boxShadow": {
    "type": "object",
    "default": { "colour": "", "hOffset": 0, "vOffset": 0, "blur": 0, "spread": 0, "inset": false }
  },
  "boxShadowHover": {
    "type": "object",
    "default": { "colour": "", "hOffset": 0, "vOffset": 0, "blur": 0, "spread": 0, "inset": false }
  },

  // --- Effects ---
  "hoverScale": { "type": "number", "default": 1.0 },            // 1.0 = no scale; 1.05 typical
  "transitionDuration": { "type": "number", "default": 300 },    // ms
  "transitionEasing": { "type": "string", "default": "ease" },   // ease | ease-in | ease-out | ease-in-out | linear

  // --- Icon ---
  "icon": { "type": "string", "default": "" },                   // Lucide icon name, e.g. "arrow-right"
  "iconPosition": { "type": "string", "default": "after" },      // "before" | "after" | "only"
  "iconSize": { "type": "number", "default": null },             // px
  "iconSizeTablet": { "type": "number", "default": null },
  "iconSizeMobile": { "type": "number", "default": null },
  "iconGap": { "type": "number", "default": 8 },                 // px gap between icon and label text
  "iconColour": { "type": "string", "default": "" },             // inherits colourText when empty
  "iconColourHover": { "type": "string", "default": "" },
  "iconTitle": { "type": "string", "default": "" },              // SVG <title> for a11y when iconPosition === "only"

  // --- Accessibility ---
  "ariaLabel": { "type": "string", "default": "" },              // overrides accessible name when iconPosition === "only"
  // P2 — focus ring colour (no competitor has; accessibility differentiator)
  // "focusRingColour": { "type": "string", "default": "" },

  // --- Advanced ---
  "anchor": { "type": "string", "default": "" },                 // HTML id attribute
  "className": { "type": "string", "default": "" }               // additional CSS class(es)
}
```

**Attribute count: 87 attributes** (excluding the 3 commented-out P2 items).

---

## 5. Notes for the Implementer

### API choices

**Use `__experimentalBorder` support for border controls, not custom attributes.** Core now uses it — it serialises to `style.border.*` in block attributes and hooks into the standard sidebar panel. This avoids re-implementing what WordPress ships. However, the `__experimentalBorder.perSide` control was only added in GB 6.4 (WP 6.4). Check with `wp.blocks.getBlockSupport('core/button', '__experimentalBorder')` in the console. If on WP 6.3 or earlier, fall back to custom attributes.

Decision: **use custom attributes** (as above) because SGS blocks ship with per-breakpoint border radius which the native `__experimentalBorder` API does not yet support per-breakpoint. Custom attributes give us full control and are what Kadence uses.

**Typography support block selectors.** Set `typography.fontSize` etc. in `supports` for native WP sizing controls, then also add custom `fontSizeTablet`/`fontSizeMobile` attributes for breakpoint overrides. The native supports handle the Desktop value; custom attrs handle tablet/mobile. This is the pattern Spectra follows.

### Icon library

We're using Lucide (imported SVG at render time). Implement a `<LucideIcon name={icon} />` React component in `edit.js` that imports from `lucide-react`, and a PHP `sgs_render_lucide_icon( $name )` helper in `render.php` that reads from a precompiled SVG sprite. Do **not** bundle the full Lucide library on the frontend — inline only the icons actually used on the page (same approach as the SGS icon block spec).

### Box shadow data model

Store as a PHP-serialisable object, not a CSS string. Spectra stores raw CSS strings (`gradientValue` etc.) which makes hover-state management messy. Kadence stores structured objects (`{ color, opacity, blur, spread, hOffset, vOffset, inset }`). Follow the Kadence model. The render.php builds the CSS string from the object.

### `inheritStyle` vs stylePreset rename

Renamed from `stylePreset` to `inheritStyle` to match Kadence's `inheritStyles` naming convention (more descriptive of what it actually does — inheriting a pre-defined style set, not applying a visual preset). When `inheritStyle !== 'custom'`, the render.php outputs only the variant class (`is-style-primary` etc.) and does not emit inline CSS for colour/border. The theme.json variation file drives those styles. This is the correct separation: content attr vs design token.

### `tagName` + `isSubmit` interaction

When `tagName === 'button'` and `isSubmit === true`, render as `<button type="submit">`. When `tagName === 'button'` and `isSubmit === false`, render as `<button type="button">`. When `tagName === 'a'`, `isSubmit` is ignored and `url` drives the href.

### Kadence `transparent-header` and `sticky-header` colour variants

Kadence exposes separate colour sets for when the button sits inside a transparent header (e.g. hero overlay) and sticky header contexts (`colorTransparent`, `backgroundSticky` etc.). We are **not** adding these — SGS handles header transparency via CSS class injection on the header element, not per-block attribute proliferation. If a button in a transparent header needs different colours, it gets a style variation or manual CSS class.

### `iconTitle` vs `ariaLabel`

These serve different purposes. `iconTitle` adds a `<title>` inside the SVG (discovered by screen readers that navigate SVG content). `ariaLabel` adds `aria-label` on the `<a>` element itself. When `iconPosition === 'only'`: set `aria-label` from `ariaLabel` (or fall back to `label` text), and optionally set `<title>` from `iconTitle` for SVG-aware AT. Both are needed for full WCAG 2.2 AA compliance on icon-only buttons.

### Gaps deliberately skipped

- **Gradient backgrounds** — Skipped for V1. Spectra and Kadence have it (both base + hover variants with 10+ attrs each). It adds significant complexity to the editor UI and is rarely used in SGS-style designs. Add in V2 when a client site needs it.
- **Conditional visibility (hide on device)** — Defer. It's a global utility feature that belongs on a shared `sgs/visibility` control added to all blocks, not on button alone.
- **Block defaults save/restore** — Kadence-specific UX pattern. Not required for V1.
- **Scroll entrance animation** — Kadence/Stackable have it as a premium feature. Out of scope for button V1.
- **`sizePreset`** — Kadence has `sizePreset: standard/medium/large/xl`. We handle this via the `inheritStyle` + theme.json typography scales. Adding explicit size presets duplicates that system.
- **Margin per-breakpoint** — Added to spec (Section 4) after gap analysis confirmed all major competitors have it. Previously missing from the draft plan.
