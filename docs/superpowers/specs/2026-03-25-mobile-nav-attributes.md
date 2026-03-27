# sgs/mobile-nav — Batch 3 Full Attribute Spec

## Design Principle

**Full control available, simplicity by default.** Every element is customisable, but with zero attributes set the drawer looks great using design tokens. Template presets give beginners a one-click starting point. InnerBlocks let advanced users add custom content. Tiered inspector panels: structural toggles visible, colours/typography collapsed, animation in its own panel.

## Architecture

**Hybrid block: server-rendered zones + InnerBlocks.**

The `SGS_Mobile_Nav_Renderer` auto-populates fixed zones (header, CTA, nav menu, socials) from the header template part and Business Details settings. A **custom content zone** powered by InnerBlocks lets clients drop any SGS block into the drawer (promo banners, opening hours, custom CTAs, etc.).

**Template presets** batch-set 15-20 attributes at once via a selector at the top of the inspector. Clients pick a template to get started fast, then tweak individual attributes or add inner blocks. Templates are also registered as **block patterns** so they appear in the inserter.

### Zone Layout (top to bottom)

1. **Header** — logo + close button
2. **Account tray** — optional, B2B logged-in greeting
3. **Search** — optional search bar
4. **CTA zone** — primary CTA, secondary CTA, contact shortcuts, WhatsApp
5. **Navigation** — accordion menu from header nav (server-rendered)
6. **Custom content** — InnerBlocks zone (client adds whatever they want)
7. **Social & Trust** — social icons + trust tagline

### InnerBlocks Implementation

- `save.js` returns `<InnerBlocks.Content />`
- `render.php` receives `$content` and renders it in the custom content zone (between nav and socials)
- `edit.js` shows an `InnerBlocks` area within the editor placeholder with `allowedBlocks` restricted to SGS content blocks (no forms, no layout blocks that break the drawer)
- Template selector only sets attributes — never touches inner blocks content
- **Deprecation:** Current `save` returns `null`. New `save` returns `<InnerBlocks.Content />`. Existing blocks have empty innerHTML, so no deprecation needed — both produce identical serialised output when no inner blocks are present.

---

## Template Presets

Stored as a JS object in `edit.js`. Each preset is a named set of attribute overrides.

| Template | Key Attributes | Use Case |
|----------|---------------|----------|
| **Default** | overlay, dark bg, accent CTA, socials on, no logo, no tagline | Generic starting point |
| **E-commerce** | slide-right, search on, account tray on, WhatsApp on, icon-text contacts | Online shops, product catalogues |
| **Restaurant** | bottom-sheet, logo on, WhatsApp on, tagline "Book a Table", ghost secondary CTA | Hospitality, food service |
| **B2B Trade** | overlay, primary CTA "Apply for Account", secondary CTA "Call Us", contact icon-text, account tray on | Wholesale, trade suppliers |
| **Minimal** | slide-left, no CTA, no socials, no tagline, plain close button, reduced stagger | Portfolio, agency, creative |
| **Brand Forward** | overlay, logo on large (180px), centre-aligned, filled CTA, gradient bg enabled | Brand-heavy sites |

Also registered as **block patterns** via PHP (`register_block_pattern`) so each appears in the inserter as "Mobile Nav — E-commerce", "Mobile Nav — Restaurant", etc.

### Template Selector UI

- Card grid at the **top** of the inspector (before Panel 1)
- Each card shows: template name, small preview icon, 1-line description
- Selecting a template batch-sets attributes with a confirmation: "This will override your current settings. Inner blocks content won't be affected."
- A "Custom" option is always available (doesn't change any attributes)

---

## Panel Structure (edit.js)

| # | Panel | Initially Open | Contents |
|---|-------|---------------|----------|
| — | **Template Selector** | Always visible | Card grid above all panels |
| 1 | **Layout** | Yes | variant, breakpoint, drawerWidth, drawerMaxWidth, drawerPosition |
| 2 | **Header** | Yes | showLogo, logoMaxWidth, closeButtonSize, closeButtonStyle |
| 3 | **Call to Action** | No | showCta, ctaText, ctaUrl, ctaIcon, ctaStyle, showSecondaryCta, secondaryCtaText, secondaryCtaUrl, secondaryCtaIcon, secondaryCtaStyle, contactDisplayMode, showWhatsApp |
| 4 | **Navigation** | No | linkFontSize, linkFontSizeMobile, linkFontWeight, sublinkFontSize, sublinkFontSizeMobile, showDividers, submenuIndent |
| 5 | **Social & Trust** | No | showSocials, socialStyle, socialIconSize, showTagline, taglineText |
| 6 | **Colours** | No | 17 colour attributes |
| 7 | **Animation** | No | staggerDelay, animationDuration, animationEasing, exitDuration, backdropOpacity |
| 8 | **Advanced** | No | enableSwipe, showSearch, showAccountTray, desktopHamburger |

---

## Attribute Table

### Existing (15 — keep, some defaults adjusted)

| Attribute | Type | Default | Notes |
|-----------|------|---------|-------|
| variant | string (enum) | "overlay" | overlay, slide-left, slide-right, bottom-sheet |
| accentColour | string | "primary" | Design token slug. Moved to Colours panel. |
| dividerColour | string | "surface-alt" | Design token slug. Moved to Colours panel. |
| showCta | boolean | true | |
| ctaText | string | "" | Falls back to "Apply Now" |
| ctaUrl | string | "" | Falls back to "/apply-for-trade-account/" |
| showContactIcons | boolean | true | **Rename to showContactShortcuts** |
| showSocials | boolean | true | |
| socialStyle | string (enum) | "coloured" | coloured, plain, outline |
| showSearch | boolean | false | |
| showAccountTray | boolean | false | |
| enableSwipe | boolean | true | |
| desktopHamburger | boolean | false | |
| staggerDelay | number | 25 | ms. Moved to Animation panel. |
| breakpoint | number | 1024 | px |

### New — Layout Panel (3 new)

| Attribute | Type | Default | CSS Property | Notes |
|-----------|------|---------|-------------|-------|
| drawerWidth | number | 85 | --sgs-mn-width | % of viewport for slide variants. Clamped 60-100. Ignored by overlay/bottom-sheet. |
| drawerMaxWidth | number | 400 | --sgs-mn-max-width | px max for slide variants |
| drawerPosition | string (enum) | "top" | — | Content alignment in overlay: "top", "centre", "space-between" |

### New — Header Panel (4 new)

| Attribute | Type | Default | CSS Property | Notes |
|-----------|------|---------|-------------|-------|
| showLogo | boolean | true | — | `get_custom_logo()`. Falls back to site name text. |
| logoMaxWidth | number | 120 | --sgs-mn-logo-width | px. Logo scales down, never up. |
| closeButtonSize | number | 48 | --sgs-mn-close-size | px. Min 44 (WCAG). |
| closeButtonStyle | string (enum) | "circle" | — | "circle", "square" (8px radius), "plain" (no bg) |

### New — CTA Panel (9 new)

| Attribute | Type | Default | CSS Property | Notes |
|-----------|------|---------|-------------|-------|
| ctaIcon | string | "arrow-right" | — | Lucide icon slug for primary CTA |
| ctaStyle | string (enum) | "filled" | — | "filled", "outline", "ghost" |
| showSecondaryCta | boolean | false | — | Second button below primary |
| secondaryCtaText | string | "" | — | Falls back to "Call Us" |
| secondaryCtaUrl | string | "" | — | Falls back to tel: from Business Details |
| secondaryCtaIcon | string | "phone" | — | Lucide icon slug for secondary CTA |
| secondaryCtaStyle | string (enum) | "outline" | — | "filled", "outline", "ghost" |
| contactDisplayMode | string (enum) | "icon-only" | — | "icon-only", "icon-text" (shows number/email), "hidden" |
| showWhatsApp | boolean | false | — | WhatsApp icon in CTA zone. From sgs_social_whatsapp option. |

### New — Navigation Panel (7 new)

| Attribute | Type | Default | CSS Property | Notes |
|-----------|------|---------|-------------|-------|
| linkFontSize | string | "medium" | --sgs-mn-link-size | Design token slug |
| linkFontSizeMobile | string | "" | --sgs-mn-link-size-mobile | Per-device override. Empty = same as desktop. |
| linkFontWeight | string (enum) | "600" | --sgs-mn-link-weight | "400", "500", "600", "700" |
| sublinkFontSize | string | "small" | --sgs-mn-sublink-size | Design token slug |
| sublinkFontSizeMobile | string | "" | --sgs-mn-sublink-size-mobile | Per-device override. Empty = same as desktop. |
| showDividers | boolean | true | — | Toggle border-bottom between links |
| submenuIndent | number | 24 | --sgs-mn-indent | px left padding for submenus. 0-48. |

### New — Social & Trust Panel (3 new)

| Attribute | Type | Default | CSS Property | Notes |
|-----------|------|---------|-------------|-------|
| socialIconSize | number | 44 | --sgs-mn-social-size | px. Min 44 (WCAG). |
| showTagline | boolean | false | — | Trust tagline below socials |
| taglineText | string | "" | — | Falls back to site tagline (`get_bloginfo('description')`) |

### New — Colours Panel (17 new)

All colours use design token slugs. CSS property set on `.sgs-mobile-nav` root. Empty string = CSS file defaults win.

| Attribute | Type | Default | CSS Property | Notes |
|-----------|------|---------|-------------|-------|
| drawerBg | string | "" | --sgs-mn-bg | Override native supports.color.background |
| drawerText | string | "" | --sgs-mn-text | Override native supports.color.text |
| drawerGradient | string | "" | --sgs-mn-gradient | CSS gradient string. Empty = solid colour. |
| closeButtonBg | string | "" | --sgs-mn-close-bg | Empty = rgba(255,255,255,0.15) |
| closeButtonColour | string | "" | --sgs-mn-close-colour | Empty = inherit |
| ctaBg | string | "" | --sgs-mn-cta-bg | Empty = accent |
| ctaTextColour | string | "" | --sgs-mn-cta-text-colour | Empty = text token |
| ctaBorderColour | string | "" | --sgs-mn-cta-border | For outline CTA style |
| secondaryCtaBg | string | "" | --sgs-mn-cta2-bg | |
| secondaryCtaTextColour | string | "" | --sgs-mn-cta2-text | |
| linkColour | string | "" | --sgs-mn-link-colour | Empty = inherit |
| linkHoverColour | string | "" | --sgs-mn-link-hover | Empty = accent |
| linkActiveColour | string | "" | --sgs-mn-link-active | Empty = accent (current page) |
| sublinkColour | string | "" | --sgs-mn-sublink-colour | Empty = rgba(255,255,255,0.85) |
| sublinkHoverColour | string | "" | --sgs-mn-sublink-hover | Empty = accent |
| backdropColour | string | "" | --sgs-mn-backdrop | Empty = rgba(0,0,0,0.6) |
| focusColour | string | "" | --sgs-mn-focus | Empty = accent |

### New — Animation Panel (4 new)

| Attribute | Type | Default | CSS Property | Notes |
|-----------|------|---------|-------------|-------|
| animationDuration | number | 400 | --sgs-mn-duration | ms entry animation. 0 = instant. |
| animationEasing | string (enum) | "spring" | — | "spring" (linear()), "ease", "ease-in-out", "linear" |
| exitDuration | number | 280 | --sgs-mn-exit-duration | ms. Separate from entry. |
| backdropOpacity | number | 60 | --sgs-mn-backdrop-opacity | %. 0-100. |

---

## Total Attribute Count

- **Existing:** 15
- **New:** 47
- **Renamed:** 1 (showContactIcons → showContactShortcuts)
- **Total:** 62

Plus InnerBlocks support (not an attribute — architectural change).

Kadence comparison: ~170 across 3 blocks. Our 62 in 1 block + InnerBlocks covers the same functional surface plus template presets, animation controls, WhatsApp, trust tagline, and gradient backgrounds that Kadence doesn't have.

---

## CSS Custom Property Map

All set as inline styles on `.sgs-mobile-nav` root, only when non-default:

```css
.sgs-mobile-nav {
  /* Layout */
  --sgs-mn-width: 85%;
  --sgs-mn-max-width: 400px;

  /* Header */
  --sgs-mn-logo-width: 120px;
  --sgs-mn-close-size: 48px;

  /* Navigation */
  --sgs-mn-link-size: var(--wp--preset--font-size--medium);
  --sgs-mn-link-size-mobile: var(--wp--preset--font-size--medium);
  --sgs-mn-link-weight: 600;
  --sgs-mn-sublink-size: var(--wp--preset--font-size--small);
  --sgs-mn-sublink-size-mobile: var(--wp--preset--font-size--small);
  --sgs-mn-indent: 24px;

  /* Colours */
  --sgs-mn-accent: var(--wp--preset--color--primary);
  --sgs-mn-divider: var(--wp--preset--color--surface-alt);
  --sgs-mn-bg: var(--wp--preset--color--primary-dark);
  --sgs-mn-text: var(--wp--preset--color--surface);
  --sgs-mn-gradient: none;
  --sgs-mn-close-bg: rgba(255, 255, 255, 0.15);
  --sgs-mn-close-colour: inherit;
  --sgs-mn-cta-bg: var(--wp--preset--color--accent);
  --sgs-mn-cta-text-colour: var(--wp--preset--color--text);
  --sgs-mn-cta-border: transparent;
  --sgs-mn-cta2-bg: transparent;
  --sgs-mn-cta2-text: var(--wp--preset--color--surface);
  --sgs-mn-link-colour: inherit;
  --sgs-mn-link-hover: var(--wp--preset--color--accent);
  --sgs-mn-link-active: var(--wp--preset--color--accent);
  --sgs-mn-sublink-colour: rgba(255, 255, 255, 0.85);
  --sgs-mn-sublink-hover: var(--wp--preset--color--accent);
  --sgs-mn-backdrop: rgba(0, 0, 0, 0.6);
  --sgs-mn-focus: var(--wp--preset--color--accent);

  /* Social */
  --sgs-mn-social-size: 44px;

  /* Animation */
  --sgs-mn-duration: 400ms;
  --sgs-mn-exit-duration: 280ms;
  --sgs-mn-stagger: 25ms;
  --sgs-mn-backdrop-opacity: 0.6;
}
```

---

## Rendering Rules

1. **Logo:** `get_custom_logo()` wrapped in `<div class="sgs-mobile-nav__logo">`, max-width from attribute. Falls back to site name as `<span>` if no logo set.
2. **Close button styles:** "circle" = border-radius: 50%, "square" = border-radius: 8px, "plain" = no background, transparent.
3. **CTA styles:** "filled" = solid bg + text, "outline" = transparent bg + border + text, "ghost" = transparent bg + text only.
4. **CTA icons:** Lucide icon slug resolved via `sgs_get_lucide_icon()`. Default: arrow-right (primary), phone (secondary).
5. **Secondary CTA:** Rendered below primary in CTA zone. Same HTML structure, `--cta2-` CSS vars.
6. **Contact icon-text mode:** Phone shows as "0121 327 1497" next to icon, email shows as "info@..." — both `<a>` with full href.
7. **WhatsApp shortcut:** Green circle icon button linking to `https://wa.me/{number}` from `sgs_social_whatsapp` option.
8. **Trust tagline:** `<p class="sgs-mobile-nav__tagline">` below socials. Falls back to site tagline.
9. **Gradient background:** If `drawerGradient` is set, applied as `background-image` on the drawer root, layered over `drawerBg`.
10. **InnerBlocks content:** `$content` from render.php placed in `<div class="sgs-mobile-nav__custom-content">` between nav menu and socials.
11. **Colours only render as inline CSS vars when non-empty.** Empty string = CSS file defaults win.
12. **Font sizes use design token slugs** resolved via `sgs_font_size_value()` to `var(--wp--preset--font-size--{slug})`.
13. **Per-device font sizes:** Mobile overrides applied inside `@media (max-width: 767px)` in a `<style>` tag output by render.php. Only emitted when the mobile override attribute is non-empty.

---

## Implementation Order

1. **block.json** — Add all 47 new attributes. Add `"parent": []` to allow unrestricted placement.
2. **save.js** — Change from `() => null` to return `<InnerBlocks.Content />`.
3. **edit.js** — Add template selector card grid. Restructure into 8 panels + InnerBlocks zone. Import `DesignTokenPicker` for colours. Add Lucide icon picker for CTA icons.
4. **render.php** — Build full CSS custom property string. Output `$content` in custom content zone. Add mobile font-size `<style>` tag.
5. **class-mobile-nav-renderer.php** — Add `render_header()` (logo + close button), `render_secondary_cta()`, `render_whatsapp()`, `render_tagline()`. Update `render_cta_zone()` for styles, contact modes, icons.
6. **style.css** — Add CSS for: logo, secondary CTA, CTA styles (outline/ghost), close button styles (square/plain), tagline, WhatsApp, gradient, custom content zone, all new custom properties, per-device font media queries.
7. **view.js** — Update animation to read `--sgs-mn-duration`, `--sgs-mn-exit-duration`, and easing from CSS custom properties instead of hardcoded values.
8. **patterns/** — Register 6 block patterns (one per template preset).

---

## Differentiators vs Kadence

| Feature | Kadence | SGS |
|---------|---------|-----|
| Animation controls | Not exposed | Duration, easing (incl. spring), stagger, exit timing |
| Spring physics | No | Yes — custom linear() easing |
| Template presets | No | 6 presets with one-click apply |
| InnerBlocks custom content | No | Yes — drop any block into the drawer |
| Block patterns | No | 6 ready-to-use patterns in inserter |
| Backdrop opacity control | No | Yes |
| Gradient background | No | Yes |
| Logo in drawer | Yes | Yes |
| CTA icon picker | No | Yes — any Lucide icon |
| WhatsApp shortcut | No | Yes — auto-populates from settings |
| Trust tagline | No | Yes |
| Contact with visible text | Icon only | Icon-only or icon+text mode |
| CTA style variants | 1 style | 3 styles (filled/outline/ghost) |
| Secondary CTA | No | Yes |
| Per-device font sizes | Yes (full) | Yes (mobile override) |
| Server-rendered from header nav | No (separate blocks) | Yes — zero duplication |
