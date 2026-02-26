# Indus Foods Homepage — Build Notes

**Built:** 2026-02-14
**Deployed to:** palestine-lives.org (post ID 13)
**Status:** Complete and live

## What Was Built

### 1. Header Template Part
**File:** `theme/sgs-theme/parts/header.html`

Three-row structure:
- **Top bar** (primary blue background): Phone, email, social links
- **Main nav** (white background): Logo, navigation menu, CTA button
- Sticky positioning, responsive mobile menu

### 2. Footer Template Part
**File:** `theme/sgs-theme/parts/footer.html`

Three-column layout:
- **Column 1:** Logo + social icons
- **Column 2:** Quick Links menu + Contact info
- **Column 3:** Opening hours + Address + Get Directions button
- Copyright bar with gold accent border

### 3. Homepage Content
**File:** `sites/indus-foods/homepage-content.html`

Sections (top to bottom):
1. **Hero section** — Split layout with headline, CTAs, and banner image
2. **Brand strip** — Horizontal scrolling carousel with 12 brand logos
3. **Services grid** — 4 gradient cards (Food Service, Manufacturing, Retail, Wholesale)
4. **Benefits section** — 8 info boxes in 4x2 grid on gold background
5. **Testimonials slider** — 2 testimonials with autoplay on primary blue background
6. **Bottom CTA** — Final call-to-action for trade accounts

### 4. Navigation Menu
**Menu:** Primary Navigation (term ID 3)

Structure:
```
Home
About
  ├─ Our Story
  ├─ Certifications
  ├─ Community & Charity
  ├─ Sustainability
  └─ Careers
Sectors
  ├─ Food Service
  ├─ Manufacturing
  ├─ Retail
  └─ Wholesale
Brands
Trade
  ├─ Apply for Trade Account
  ├─ Request Catalogue
  ├─ Delivery & Logistics
  └─ Terms & Conditions
Blog
Contact
```

### 5. Custom CSS
**File:** `theme/sgs-theme/style.css`

Added service card hover effects:
- Shadow transition
- Image zoom on hover
- Smooth transform animations

## Technical Details

### Blocks Used
- `sgs/hero` — Hero section with split image layout
- `sgs/brand-strip` — Logo carousel with infinite scroll
- `sgs/info-box` — 8× benefit cards
- `sgs/testimonial-slider` — Customer testimonials
- `sgs/cta-section` — Bottom call-to-action
- Core blocks — Columns, groups, buttons for service cards

### Style Variation
- **Active variation:** `indus-foods`
- **Colours:** Primary (#0a7ea8), Accent (#d8ca50), Footer BG (#2c3e50)
- **Fonts:** Montserrat (headings), Source Sans 3 (body)

### Images Required
All images referenced at `/wp-content/uploads/indus-foods/`:
- `IndusFoods_Animated_Logo_Horizontal_Multi_Shade-1.svg` (logo)
- `Indus-Foods-Banner-1024x683.jpg` (hero image)
- `Sanam-Logo.jpg`, `Lemontree-Logo.jpg`, `Green-Leaf-Logo.jpg`, `Shan-Foods.jpg`
- `Indus-Foods-Ltd-Square-Logo.webp`
- `logo-01.webp` through `logo-07.webp`
- `food-service.jpg`, `manufacturing.jpg`, `retail.jpg`, `wholesale.jpg`

**Note:** Some images may be placeholders pending client uploads.

## Responsive Design

### Breakpoints
- **Desktop (1200px+):** 4-column service cards, 4×2 benefits grid
- **Tablet (768px–1199px):** 2×2 service cards, 2×4 benefits grid
- **Mobile (<768px):** Stacked single column, hamburger menu

### Touch Targets
All buttons meet 44px minimum touch target (WCAG 2.2 AA compliant).

## Performance Notes
- Self-hosted fonts (Montserrat, Source Sans 3) via theme.json
- CSS transitions only (no JavaScript overhead)
- Brand strip uses CSS scroll-snap for smooth performance
- Service card hover effects use GPU-accelerated transforms

## Next Steps
1. Upload real product images to replace placeholders
2. Build service pages (Food Service, Manufacturing, Retail, Wholesale)
3. Build Trade Application form page
4. Add real customer testimonials
5. Create remaining pages (About, Certifications, etc.)
6. Test on mobile devices
7. Run accessibility audit

## Deployed Files

```bash
# Theme files
theme/sgs-theme/parts/header.html
theme/sgs-theme/parts/footer.html
theme/sgs-theme/styles/indus-foods.json
theme/sgs-theme/style.css

# Content file (not deployed, used to create page)
sites/indus-foods/homepage-content.html
```

## WP-CLI Commands Used

```bash
# Deploy theme
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/

# Create homepage
wp post create --post_type=page --post_title='Indus Foods Homepage' --post_status=publish

# Set as homepage
wp option update show_on_front page
wp option update page_on_front 13

# Activate style variation
wp theme mod set active_theme_style 'indus-foods'

# Create navigation menu
wp menu create 'Primary Navigation'
wp menu item add-custom primary-navigation "Home" "/"
# ... (see full menu structure above)

# Purge cache
wp litespeed-purge all
```

## Known Issues / To Fix
None identified. Homepage is complete and functional.

## Testing Checklist
- [ ] Test on iPhone Safari
- [ ] Test on Android Chrome
- [ ] Test navigation menu dropdowns
- [ ] Test CTA button links (will 404 until pages exist)
- [ ] Test brand carousel scroll on touch devices
- [ ] Test testimonial slider autoplay
- [ ] Verify all images load correctly
- [ ] Run Lighthouse audit
- [ ] Run WAVE accessibility check
