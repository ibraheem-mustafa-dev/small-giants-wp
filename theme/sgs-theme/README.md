# SGS Theme

A lightweight, performance-first WordPress block theme by Small Giants Studio.

The theme provides your site's overall look and feel: colours, fonts, spacing, header, and footer. All content lives inside blocks — the theme just sets the stage.

---

## Contents

- [What the theme does](#what-the-theme-does)
- [Requirements](#requirements)
- [Activating the theme](#activating-the-theme)
- [Design tokens and colour system](#design-tokens-and-colour-system)
- [Typography](#typography)
- [Layout system](#layout-system)
- [Template parts](#template-parts)
- [Style variations](#style-variations)
- [Dark mode](#dark-mode)
- [Sticky header behaviour](#sticky-header-behaviour)
- [Mobile navigation](#mobile-navigation)
- [Customising via Site Editor](#customising-via-site-editor)

---

## What the theme does

- Defines all colours, fonts, spacing, and shadows as design tokens in `theme.json` so blocks can reference them consistently.
- Provides page templates (homepage, standard page, blog archive, search results, 404).
- Provides header and footer template parts with multiple layout options.
- Supports style variations so the same theme can serve different clients with entirely different visual identities.
- Handles performance: font preloading, deferred non-critical CSS, critical above-fold styles.
- Includes a dark mode toggle that respects the user's system preference and saves their choice.
- Handles the mobile navigation drawer and sticky/shrink header behaviour.

The theme does **not** include any content blocks. Those come from the SGS Blocks plugin.

---

## Requirements

- WordPress 6.7 or higher
- PHP 8.0 or higher
- The SGS Blocks plugin (for content blocks)

---

## Activating the theme

1. In the WordPress admin, go to **Appearance > Themes**.
2. Click **Add New Theme**, then **Upload Theme**.
3. Upload the `sgs-theme.zip` file and click **Install Now**.
4. Click **Activate**.

The theme will be live immediately. No page refresh is needed.

---

## Design tokens and colour system

All colours are defined in `theme.json` and available everywhere in the block editor. You will see them in the colour picker under **Theme colours**.

| Name | Hex | Use |
|------|-----|-----|
| Primary | `#0F7E80` | Main brand colour (teal). Used for headings, links, and key UI elements. |
| Primary Dark | `#0A5B5D` | Darker teal for hover states and the footer background. |
| Accent | `#F87A1F` | Orange highlight. Used for buttons, separators, and call-to-action emphasis. |
| Accent Light | `#FEE8D4` | Pale orange for soft backgrounds on accent-adjacent elements. |
| Success | `#2E7D4F` | Green for success messages and trust indicators. |
| WhatsApp | `#25D366` | Reserved for the WhatsApp CTA block. |
| Surface | `#FFFFFF` | Default page background (white). |
| Surface Alt | `#F5F7F7` | Very light grey for alternating section backgrounds. |
| Text | `#1E1E1E` | Main body text colour (near-black). |
| Text Muted | `#555555` | Secondary body text, captions, and metadata. |
| Text Inverse | `#C0D5D6` | Light text for use on dark/primary backgrounds. |
| Border Subtle | `#0D5557` | Dark teal border used inside the header and footer. |
| Footer Background | `#0A5B5D` | Dark teal footer background. |

**How to use colours in blocks:** Select a block, open the block settings panel on the right, and look for the **Colour** section. Click any colour swatch to apply it. The theme colours appear at the top of the palette — always use these rather than custom hex values, so your site stays on-brand.

**Shadows** are also available as presets: Small, Medium, Large, and Glow (an orange highlight shadow for accent elements).

---

## Typography

The theme uses three font families, all self-hosted (no Google Fonts CDN calls):

| Font | Slug | Use |
|------|------|-----|
| Inter (variable) | `body` | Body text — all paragraph and UI text. A clean, highly legible sans-serif. |
| Inter (variable) | `heading` | Headings H1-H6 by default. |
| DM Serif Display | `display` | Decorative serif font for large editorial headings. Apply manually in the editor when a page needs a more expressive headline. |
| DM Sans | `dm-sans` | Available as an alternative sans-serif if needed. |

**Font sizes** scale fluidly between mobile (375px) and desktop (1200px):

| Name | Desktop size | Mobile size |
|------|-------------|------------|
| XSmall | 0.75rem | 0.75rem |
| Small | 0.875rem | 0.8125rem |
| Medium | 1rem | 1rem |
| Large | 1.25rem | 1.0625rem |
| XL | 1.5rem | 1.25rem |
| XXL | 2.25rem | 1.625rem |
| Hero | 3.125rem | 2rem |

The **Hero** size is designed for large homepage headlines. You do not need to do anything special to get fluid scaling — it happens automatically.

**Heading styles by default:**
- H1 uses Hero size
- H2 uses XXL
- H3 uses XL
- H4 uses Large
- H5 uses Medium, bold
- H6 uses Small, bold, uppercase, with letter spacing

---

## Layout system

All content is constrained to one of two widths:

- **Content width:** 1200px — standard width for paragraph text, columns, and most blocks.
- **Wide width:** 1400px — wider width available to blocks that use the "Wide" alignment option.

Blocks can also use **Full width** alignment, which stretches edge-to-edge with no constraint.

To set alignment, select a block in the editor and click the alignment toolbar button (the icon with arrows pointing outward). Not all blocks support all alignment options.

**Spacing** is also controlled by tokens. When setting padding or margin in the editor, you will see named sizes (XXS, XS, S, M, L, XL, XXL, XXXL) rather than raw pixel values. Use these to stay consistent with the site's spacing rhythm.

---

## Template parts

Template parts are reusable sections that appear on every page. You edit them once and they update site-wide.

### Headers

Five header layouts are available:

| Name | Description |
|------|-------------|
| Header | Standard header with top bar, logo, and navigation. |
| Header (Minimal) | Logo and navigation only, no top bar. |
| Header (Sticky) | Stays fixed at the top of the screen as the user scrolls. |
| Header (Transparent Overlay) | Sits over the hero section on the first load, becoming solid on scroll. |
| Header (Shrink on Scroll) | Reduces in height as the user scrolls down for a compact appearance. |

To switch header layout, go to **Appearance > Editor > Template Parts**, select the header variant you want to edit, and use it in your page templates.

### Footers

| Name | Description |
|------|-------------|
| Footer | Full footer with columns, logo, navigation links, and copyright. |
| Footer (Minimal) | Single-row footer with copyright text only. |

### Sidebar

A `sidebar.html` template part is available for blog and archive pages.

### Mega menu panels

Six pre-built mega menu panels are included for common navigation categories: Brands, Services, Products, About, Resources, and Contact. Each is fully editable in the Site Editor.

---

## Style variations

Style variations let the same SGS Theme serve different clients with completely different visual identities.

The **Indus Foods** variation is included. When active, it overrides the colour palette, typography (Montserrat headings + Source Sans 3 body text), and adds decorative ingredient image effects.

**To switch style variation:**

1. Go to **Appearance > Editor**.
2. Click the **Styles** icon (the circle/brush icon in the top-right toolbar).
3. A panel will appear listing available style variations. Click one to preview it.
4. Click **Save** to apply it site-wide.

---

## Dark mode

The theme includes a built-in dark mode that:

- Detects the user's system preference automatically (light or dark).
- Allows the user to override with a toggle button.
- Saves the user's preference so it persists on return visits.
- Uses an inline script to prevent a flash of the wrong theme on page load.

To add the dark mode toggle to your header or footer, edit the relevant template part in the Site Editor and place the toggle where you want it to appear.

Dark mode colours are defined in `assets/css/dark-mode.css` and apply automatically when the `data-theme="dark"` attribute is set on the `<html>` element.

---

## Sticky header behaviour

The sticky header adds a `.is-scrolled` class to the `<header>` element once the user has scrolled down 50px. This triggers a shadow and a slight size reduction, giving a polished scroll effect.

This behaviour is handled by `assets/js/sticky-header.js` and applies automatically when the **Header (Sticky)** or **Header (Shrink on Scroll)** template parts are in use. No configuration is required.

---

## Mobile navigation

On screens below 1024px wide, the desktop navigation is hidden and replaced with a hamburger menu button. Tapping the button opens a full-screen drawer with the same navigation links.

Behaviour:
- The drawer slides in from the right.
- Tapping outside the drawer or pressing Escape closes it.
- Focus is trapped inside the drawer when it is open (keyboard accessibility).
- The page behind is locked so it does not scroll while the drawer is open.

This is handled by `assets/js/mobile-nav-drawer.js` and `assets/css/mobile-nav-drawer.css`. No configuration is needed.

---

## Customising via Site Editor

The Site Editor (Appearance > Editor) is where you make global changes to your site's structure and appearance.

**Editing the header:**

1. Go to **Appearance > Editor**.
2. Click **Template Parts** in the left panel.
3. Click the header template part you want to edit.
4. Make your changes (logo, navigation links, colours, layout).
5. Click **Save**.

**Editing the footer:**

Same process as the header — click **Template Parts**, then the footer.

**Editing page templates:**

1. Go to **Appearance > Editor**.
2. Click **Templates** in the left panel.
3. Click the template you want to change (e.g. **Front Page**, **Page**, **Single**).
4. Edit the template structure.
5. Click **Save**.

**Changing global styles:**

1. Go to **Appearance > Editor**.
2. Click the **Styles** icon (circle icon, top-right).
3. Click **Edit Styles** to open the global styles panel.
4. Change colours, typography, spacing for headings, body text, buttons, and links.
5. Click **Save**.

> **Tip:** Changes in the Site Editor affect every page on the site. If you only want to change one page, edit that page directly rather than the template.
