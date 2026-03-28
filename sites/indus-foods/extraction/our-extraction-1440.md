# Our Site Extraction — 1440px Desktop
**URL:** https://palestine-lives.org
**Date:** 2026-03-19
**Stack:** SGS Block Theme (WordPress)

---

## DESIGN TOKENS (CSS Custom Properties)

| Token | Value |
|-------|-------|
| `--primary` | #0A7EA8 |
| `--primary-dark` | #076A8E |
| `--accent` | #D8CA50 |
| `--accent-light` | #E7D768 |
| `--surface` | #FFFFFF |
| `--surface-alt` | #F2F5F7 |
| `--text` | #1E1E1E |
| `--text-muted` | #424242 |
| `--text-inverse` | #FFFFFF |
| `--footer-bg` | #2C3E50 |
| `--font-heading` | Montserrat, system-ui, sans-serif |
| `--font-body` | Source Sans 3, system-ui, sans-serif |
| `--content-size` | 1200px |
| `--wide-size` | 1400px |

---

## TOP BAR

- Height: 68px
- Background: #0A7EA8 (primary)
- Padding: 8px 18px
- Font: Source Sans 3, 18px

### Phone/Email Pills
- Background: rgba(255,255,255,0.15) (semi-transparent)
- Text colour: #FFFFFF
- Font-size: 15.75px
- Font-weight: 600
- Padding: 4px 12px
- Border-radius: 9999px (full pill)
- Height: 34px
- Gap: 6px

### Social Icons
- Size: 52x52px
- Background: transparent
- Colour: #FFFFFF
- Border-radius: 9999px

---

## MAIN NAV BAR

- Height: 93px
- Background: #FFFFFF (via parent wrapper)
- Position: sticky, top: 0, z-index: 100
- Padding: 12.06px 18px
- Total header height (top bar + nav): 179px

### Logo
- Width: 300px
- Height: 68px

### Nav Links
- Font: Source Sans 3, 19.8px, weight 600
- Line-height: 32.67px
- Nav container gap: 18px

### Active Link (Home)
- Colour: #FFFFFF
- Background: #0A7EA8
- Padding: 4px 16px
- Border-radius: 4px

### Inactive Links
- Colour: #0A7EA8
- Background: transparent
- Padding: 4px 8px
- Border-radius: 4px

### Mega Menu Triggers (Sectors, Brands)
- Colour: #0A7EA8
- Font-size: 19.8px
- Font-weight: 600
- Background: transparent
- Padding: 0px 18px
- Height: 44px

---

## HERO SECTION

- Block class: sgs-hero sgs-hero--split sgs-hero--align-left
- Height: 578px
- Background: linear-gradient(135deg, #E7D768 0%, #D8CA50 100%)
- Padding: 40.5px 18px
- Gap: 27px
- Margin-top: 18px

### H1
- Font: Montserrat, 56.25px, weight 700
- Line-height: 61.875px (1.1x)
- Colour: #2C3E50
- Margin: 0 0 12.06px

### Subtitle
- Font: Source Sans 3, 22.5px, weight 400
- Line-height: 33.75px (1.5x)
- Colour: #2C3E50
- Margin: 0 0 18px

### Hero Content Column
- Max-width: 680px

### CTA Buttons

| Property | Primary ("Apply For A Trade Account") | Secondary ("Request Our Catalogue") |
|----------|--------------------------------------|-------------------------------------|
| Background | #2C3E50 (dark slate) | #0A7EA8 (teal) |
| Text colour | #FFFFFF | #FFFFFF |
| Font-size | 16.875px | 16.875px |
| Font-weight | 600 | 600 |
| Padding | 15.75px 36px | 15.75px 36px |
| Border-radius | 8px | 8px |
| Border | none | 2px solid #FFFFFF |
| Width | 332px | 336px |
| Height | 76px | 80px |

### Hero Image
- Width: 663px
- Height: 497px
- Border-radius: 16px
- Object-fit: cover

---

## SECTION: Our Brands

- Background: #0A7EA8
- Height: 274px
- Padding: 27px 18px

### H2
- Colour: #1E1E1E (BUG — should be white/gold on teal)
- Font: Montserrat, 40.5px, weight 700
- Text-align: centre

### Separator
- Border colour: #D8CA50

### Brand Logos
- Count: 8
- Size: 100x100px (vs 154x154px on reference)
- Display: block (not flex/carousel)

---

## SECTION: Our UK Wide Food Services (Cards)

- Background: #FFFFFF
- Height: 746px
- Padding: 40.5px 18px

### H2
- Font: Montserrat, 27px, weight 700 (vs 40px on reference)
- Colour: #1E1E1E
- Text-align: centre

### Cards Layout
- Display: flex
- Gap: 18px
- 4 cards

### Service Cards

| Property | Value |
|----------|-------|
| Width | 287px |
| Height | 575-615px (varies) |
| Border-radius | 12px (vs 20px reference) |
| Box-shadow | none (vs heavy shadow reference) |
| Padding | 22.5px 42.75px 18px |

### Card Gradients
1. Food Service: linear-gradient(135deg, #D8CA50 0%, #E7D768 100%)
2. Manufacturing: linear-gradient(45deg, #E7D768 0%, #2EADE2 100%)
3. Retail: linear-gradient(135deg, #2EADE2 0%, #0A7EA8 100%)
4. Wholesale: linear-gradient(45deg, #0A7EA8 0%, #D8CA50 100%)

### Card H3
- Font: Montserrat, 27px, weight 700 (vs 28.8px reference)
- Colour: #2C3E50

### Card CTA Links (outline button)
- Colour: #0A7EA8
- Background: transparent
- Border: 2px solid #0A7EA8
- Border-radius: 8px
- Font-size: 18px, weight 700

### Card Images
- Width: 201px, Height: 126px
- Border-radius: 12px 12px 0 0

---

## SECTION: Why Choose Indus Foods?

- Background: #D8CA50
- Height: 673px
- Padding: 40.5px 18px

### H2
- Font: Montserrat, 40.5px, weight 700
- Colour: #2C3E50
- Text-align: centre

### Feature Grid
- 2 rows x 4 columns
- Display: flex
- Gap: 18px

### Feature Icons
- SVG: 24x24px viewBox
- Wrapper: 52x52px
- Colour: #2C3E50 (vs #0A7EA8 teal on reference)

### Feature H3
- Font: Montserrat, 22.5px, weight 700 (vs 28.8px reference)
- Colour: #1E1E1E

### Feature Body
- Font-size: 18px
- Colour: #1E1E1E

---

## SECTION: Our Partners Love Us! (Testimonials)

- Background: #0A7EA8
- Height: 399px
- Padding: 40.5px 18px

### H2
- Colour: #1E1E1E (BUG — should be white/gold on teal)
- Font: Montserrat, 40.5px, weight 700

### Testimonial Card
- Background: #FFFFFF
- Padding: 18px
- Border-radius: 8px
- Box-shadow: rgba(0,0,0,0.1) 0 4px 12px
- Width: 1200px, Height: 168px

### Quote Text
- Font: Source Sans 3, 18px, weight 400
- Colour: #1E1E1E
- Style: italic (vs normal on reference)

### Stars
- Colour: #D8CA50

### Navigation Arrows
- 44x44px, bg #FFFFFF, border 1px solid #2EADE2, radius 50%

---

## SECTION: CTA Banner ("What Are You Waiting For?")

- Background: #D8CA50
- Height: 257px
- Padding: 40.5px 18px

### Heading
- Font: Montserrat, 40.5px, weight 700 (vs 28.8px reference)
- Colour: #2C3E50

### CTA Buttons
- Button 1: bg #2C3E50, text #FFFFFF, padding 16px 32px, radius 10px
- Button 2: bg #0A7EA8, text #FFFFFF, padding 16px 32px, radius 10px
- No borders, no box-shadow (vs 3px borders + shadow on reference)

---

## FOOTER

- Background: #2C3E50
- Height: 649px
- Padding: 40.5px 18px 0
- 3 columns, gap 36px 27px

### Footer Headings
- Font: Montserrat, 18px, weight 700, uppercase, letter-spacing 0.9px
- Colour: #FFFFFF (vs #E7D768 gold on reference)

### Footer Body Text
- Colour: #FFFFFF
- Font: Source Sans 3, 15.75px

### Footer Social Icons
- Size: 52x52px
- Colour: #D8CA50 (gold)

### Google Map
- Width: 366px, Height: 200px

### Get Directions Button
- Background: #D8CA50
- Text: #1E1E1E
- Padding: 16px 32px
- Border-radius: 8px

### Copyright Bar
- Colour: #FFFFFF
- Font-size: 15.75px
- Border-top: 1px solid #D8CA50

---

## NOTABLE ISSUES

1. "Our Brands" H2 colour: #1E1E1E (dark) on teal bg — should be #E7D768 (gold)
2. "Our Partners Love Us" H2: same bug — dark on teal
3. Brand logos: 100x100px (too small vs 154x154px reference), not in carousel
4. Footer logo: 1x1px (lazy-load not triggered)
5. Service card heights vary (575-615px)
6. Hero CTA buttons oversized (76-80px tall)
